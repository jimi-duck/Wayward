import type { World } from './world';
import type { Alien } from './enemies';
import type { Bulwark } from './field';
import { laneBack, relayKey, relayOf } from './breakout';
import { painted, SAM_RELAY } from './postjump';
import { ADA } from '../content/story';
import { CORE_FIRST, CORE_SHIPS } from '../content/script/core';
import { topSpeed } from './ship';
import { Traffic } from './traffic';
import { wardenRelays } from './evidence';
import { GATES, REACH_RELAYS } from '../content/road';
import { t as tr } from '../i18n';
import {
  ADRIFT_A, ADRIFT_B, ADRIFT_LOOP, ADRIFT_OUT, ADRIFT_TELL, BURIED_HP, BURIED_R, chorusRate, GIVEN_FLAG, GIVEN_R, GUARD_HOLD, GUARD_WAKE, GUARDS,
  HUNGRY_FEED, HUNTED_RATE, JAM_CYCLE, JAM_QUIET, JAM_STRIKE, LANE_LINES, LOUD_FILL, LOUD_KNOT, LOUD_MAX, LOUD_QUIET_RATE, LOUD_STILL,
  SPLIT_MASTS, STARVED, stepUplink, uplinkWave, UPLINK_R,
} from './uplink';
import {
  ALLIES, COVER, COVER_DMG, COVER_EVERY, COVER_R, HUNT_PULL, HUNT_SIT, PULSE_CROWD, PULSE_PUSH, PULSE_R, PULSE_SNARE, THRESHOLD_COVER, WAVE_CROWD, waveTier,
  type CoverRow,
} from '../content/waves';

// ── the Warden relay she wakes ────────────────────────────────────────────
// A road gate's relay (sim/uplink.ts, content/road.ts LEG_RELAYS and REACH_RELAYS): inside its ring the charge runs,
// each stage is told, the first two send a wave, and its twist (buried, adrift, jammed, hungry, loud, chorus, guarded,
// given, refused, split) changes how. One of these lives on the World for each sortie, made new with it (World.begin);
// the World's getters of the same names read it. Moved out of sim/world.ts as it was (2026-11-27): the simulation
// fingerprint (npm run pilot:fingerprint) is the same before and after.

export class RelayWake {
  constructor(private readonly w: World) {}

  /** A road gate's relay that she wakes herself (sim/uplink.ts): every relay but the Narrows', until it is awake. */
  get wakeRelay(): { x: number; z: number } | null {
    const b = this.w.bk;
    if (!b || b.def.script === 'narrows' || this.w.uplink >= 1 || this.w.flags.has(relayKey(b.def)) || (b.def.first && !painted(this.w.flags))) return null;
    // a refused relay she agreed to leave dark (content/road.ts LEG_RELAYS)
    if (b.def.twist === 'refused' && this.w.flags.has(`relay_dark_${b.def.script}`)) return null;
    return relayOf(b);
  }

  /** She is in the relay's ring and the charge is running. */
  get uplinking(): boolean {
    const rl = this.wakeRelay;
    // (a given relay: the locals wake it, and she only has to hold near it)
    return !!rl && this.w.phase === 'play' && !this.w.floor.hush && Math.hypot(this.w.ship.x - rl.x, this.w.ship.z - rl.z) < (this.given ? GIVEN_R : UPLINK_R);
  }

  /** A given relay (content/road.ts LEG_RELAYS) whose locals stand with her: they wake it while she holds near. */
  get given(): boolean {
    return this.w.bk?.def.twist === 'given' && this.w.flags.has(GIVEN_FLAG);
  }

  /** The uplink: inside the relay's ring the charge runs; each stage is told, and the first two send a wave. */
  step(dt: number): void {
    const rl = this.wakeRelay, b = this.w.bk;
    // a woken relay opens the lane: the trade comes through the gate again (a reload of the system finds it open, without the voice)
    if (b && !this.laneOpened && b.def.script !== 'narrows' && relayOf(b) && this.w.flags.has(relayKey(b.def))) this.openLane(this.w.uplink >= 1);
    if (!rl || !b || this.w.phase !== 'play') return;
    this.stepTwist(rl, dt);
    this.stepHunters(rl, dt);
    this.stepPulse(rl);
    this.stepCover(rl, dt);
    // a rock or a guard on the mast holds the charge; a tether hunter drags it
    const blk = this.uplinkBlock;
    // (a loud relay charges at half rate while she drifts quiet, World.quiet)
    // (a chorus relay charges faster for every relay she woke on the way, World.chorus)
    const r = stepUplink(this.w.uplink, this.uplinking, (!blk ? 1 : blk === 'Drive the hunter off the relay' ? HUNTED_RATE : 0) * (this.quiet ? LOUD_QUIET_RATE : 1) * this.chorus, dt);
    if (b.def.twist === 'loud' && r.charge > this.w.uplink && !this.quiet) this.stepNoise(dt);
    // a hungry relay's core drinks the jump fluid as it charges (content/road.ts LEG_RELAYS)
    if (b.def.twist === 'hungry' && r.charge > this.w.uplink) this.w.cyrite = Math.max(0, this.w.cyrite - (r.charge - this.w.uplink) * HUNGRY_FEED);
    this.w.uplink = r.charge;
    if (!r.stage) return;
    // woken, the relay overrides the lock: what Custody sent for it breaks off (a hunter would otherwise circle the gate's field for ever)
    if (r.stage === 3) for (const a of this.w.aliens) if (this.waveHulls.has(a.id)) { a.fleeing = true; a.mode = 'leave'; }
    const gate = b.def.first ? -1 : Math.max(0, GATES.findIndex((g) => g.script === b.def.script) - 1);
    const reach = !!(b.def.script && REACH_RELAYS[b.def.script]);
    // (nothing human lives in the Hollows: at a loud relay the Thren its noise draws are the whole fight, World.stepNoise)
    // (and at the Threshold, Calloway's own guns are the fight: content/script/threshold.ts)
    const loud = b.def.twist === 'loud', last = b.def.twist === 'threshold';
    const wave = loud || last ? [] : uplinkWave(r.stage, waveTier(!!b.def.first, reach, gate));
    // (topped up to WAVE_CROWD hostile hulls on her, hunters first: a hot system sends fewer)
    let room = Math.max(0, WAVE_CROWD - this.w.aliens.filter((a) => !a.ward && !a.fleeing && this.w.committed(a)).length);
    const sized = [...wave].sort((p, q) => Number(!!q.hunter) - Number(!!p.hunter)).map((w) => { const n = Math.min(w.n, room); room -= n; return { ...w, n }; }).filter((w) => w.n > 0);
    const hunted = sized.some((w) => w.hunter);
    // the first system has no stop script: the woken relay is told here, and Sam follows it
    if (r.stage === 3 && b.def.first) {
      this.w.flags.add(relayKey(b.def));
      // (its own notice says the gate is open: the gate's "open · fly through" would say it twice)
      this.w.holdNoted = 'open';
      this.w.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Warden key accepted', reason: 'Jump Gate open', main: true });
      // (queued before the hauler's line: Sam's word follows the key)
      this.w.radioLines('sam_relay', tr('Sam Okoro'), 'miners', [tr(SAM_RELAY)], 5);
    }
    // the moment she connects, ADA-1 hears an old report: the 94% (the Wall has it at once), then the ships the uplink drew
    // (owner's copy and order, 28 November 2026)
    if (r.stage === 1 && b.def.first) {
      this.w.flags.add('clue_reserves');
      this.w.radioLines('core_first', tr(ADA), 'core', [tr(CORE_FIRST), tr(CORE_SHIPS)], 1);
    }
    // (elsewhere the last stage is told by the stop's own row: "Warden key accepted", content/script/arrivals.ts)
    // a split relay: this mast is awake, the next is marked (the core wakes on the third)
    const split = b.def.twist === 'split';
    if (split) {
      b.split = r.stage;
      if (r.stage < 3) { const m = SPLIT_MASTS[r.stage]!; b.drift = this.backFrom(m.back, m.across); }
    }
    if (r.stage < 3 && split) this.w.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Mast awake', reason: hunted ? 'a tether hunter is coming' : 'fly to the next mast' });
    else if (r.stage < 3) this.w.events.push(r.stage === 1
      ? { type: 'storyNotice', tone: 'amber', headline: 'Relay waking', reason: loud ? 'its song carries' : last ? 'the last lane stirs' : 'Custody traced the uplink', main: true }
      : { type: 'storyNotice', tone: 'amber', headline: 'Relay dish turning', reason: hunted ? 'a tether hunter is coming' : reach || loud || last ? 'the core is warming' : 'more Custody inbound' });
    const rows = (h: boolean) => sized.filter((w) => !!w.hunter === h).map((w) => ({ variant: w.variant, n: w.n, from: 'ahead' as const }));
    if (rows(false).length) for (const id of this.w.applyOutcome({ text: '', spawn: rows(false) }, 0, [])) this.waveHulls.add(id);
    if (hunted) for (const id of this.w.applyOutcome({ text: '', spawn: rows(true) }, 0, [])) { this.hunters.add(id); this.waveHulls.add(id); }
    // the locals she helped come out at the first wave (content/waves.ts COVER)
    if (r.stage === 1 && !this.cover) {
      // (at the Threshold, everyone who came: their guns fire the faster for each)
      this.allies = last ? ALLIES.filter((f) => this.w.flags.has(f)).length : 1;
      const c = last ? (this.allies ? THRESHOLD_COVER : undefined) : COVER.find((x) => x.stop === b.def.script && this.w.flags.has(x.flag));
      if (c) { this.cover = c; this.w.radioLines(`cover_${c.stop}`, tr(c.from), c.caller, [tr(c.line)], 2); }
    }
  }

  /** Tether hunters (content/waves.ts): hulls that make for the mast and hold the charge while they sit by it. */
  private hunters = new Set<number>();
  /** Every hull a relay's waves sent, so they break off once it is awake. */
  private waveHulls = new Set<number>();
  /** Whether this wake's damping pulse has gone, and the locals flying cover (null: none), and their next shot. */
  private pulsed = false;
  private cover: CoverRow | null = null;
  private coverT = 0;
  /** How many guns fly the cover (the allies who came, at the Threshold; 1 elsewhere). */
  private allies = 1;

  /** Hostile hulls near the mast that hold the charge: a guard on a guarded relay, or a tether hunter. */
  private onMast(rl: { x: number; z: number }): Alien[] {
    const guarded = this.w.bk?.def.twist === 'guarded';
    return this.w.aliens.filter((a) => !a.ward && !a.fleeing && (guarded || this.hunters.has(a.id)) && Math.hypot(a.x - rl.x, a.z - rl.z) < GUARD_HOLD);
  }

  /** A hunter closes on the mast on top of its own flying, and settles there. */
  private stepHunters(rl: { x: number; z: number }, dt: number): void {
    if (!this.hunters.size) return;
    for (const id of this.hunters) {
      const al = this.w.aliens.find((a) => a.id === id);
      if (!al) { this.hunters.delete(id); continue; }
      if (al.fleeing || al.snare > 0) continue;
      const dx = rl.x - al.x, dz = rl.z - al.z, d = Math.hypot(dx, dz);
      if (d <= HUNT_SIT) continue;
      const v = Math.min(d - HUNT_SIT, HUNT_PULL * dt);
      al.x += (dx / d) * v; al.z += (dz / d) * v;
    }
  }

  /**
   * The relay's damping pulse: once a wake, once its lamps are lit, it throws the hulls crowding its ring outward and snares them a
   * moment. It goes by itself when a guard or a hunter sits on the mast, or when the ring is crowded while she holds the key.
   */
  private stepPulse(rl: { x: number; z: number }): void {
    if (this.pulsed || this.w.uplink < 1 / 3 - 1e-9) return;
    const near = this.w.aliens.filter((a) => !a.ward && !a.fleeing && this.w.committed(a) && Math.hypot(a.x - rl.x, a.z - rl.z) < PULSE_R);
    if (!this.onMast(rl).length && !(this.uplinking && near.length >= PULSE_CROWD)) return;
    this.pulsed = true;
    for (const a of near) {
      const dx = a.x - rl.x, dz = a.z - rl.z, d = Math.hypot(dx, dz) || 1;
      a.vx = (dx / d) * PULSE_PUSH; a.vz = (dz / d) * PULSE_PUSH;
      // (thrown past the mast's hold, so the charge runs again while they come back)
      const out = Math.max(d, GUARD_HOLD + 20);
      a.x = rl.x + (dx / d) * out; a.z = rl.z + (dz / d) * out;
      a.snare = Math.max(a.snare, PULSE_SNARE);
    }
    this.w.events.push({ type: 'relayPulse', x: rl.x, z: rl.z, r: PULSE_R });
    this.w.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Relay pulse', reason: 'the ring is clear for now' });
  }

  /** The locals' guns: a shot at the nearest hostile hull near the mast every few seconds, for the rest of the wake. */
  private stepCover(rl: { x: number; z: number }, dt: number): void {
    if (!this.cover || (this.coverT -= dt) > 0) return;
    this.coverT = COVER_EVERY / Math.max(1, this.allies);
    let best: Alien | null = null, bd = COVER_R;
    for (const a of this.w.aliens) {
      if (a.ward || a.fleeing || !this.w.committed(a)) continue;
      const d = Math.hypot(a.x - rl.x, a.z - rl.z);
      if (d < bd) { bd = d; best = a; }
    }
    if (!best) return;
    this.w.events.push({ type: 'flak', x: best.x, y: best.y, z: best.z });
    this.w.hurtAlien(best, COVER_DMG, 'hazard', best.x, best.y, best.z);
  }

  /** A buried relay's rock, while it sits on the mast (sim/uplink.ts); whether a guarded relay's picket has been sent. */
  private burial: Bulwark | null = null;
  private buried = false;
  private guardsSent = false;
  private adriftTold = false;
  private jamTold = false;
  private hungryTold = false;
  private twistTold = false;
  /** A loud relay's noise (0 to 1, a knot comes when it fills) and the knots it has drawn this wake. */
  private noise = 0;
  private knots = 0;
  private jamT = 0;

  /** She is at a loud relay, in its ring and drifting slow enough that the charge runs quiet (content/road.ts LEG_RELAYS). */
  get quiet(): boolean {
    return this.w.bk?.def.twist === 'loud' && this.uplinking && Math.hypot(this.w.ship.vx, this.w.ship.vz) < topSpeed(this.w.hull) * LOUD_STILL;
  }

  /** A chorus relay's rate (content/road.ts LEG_RELAYS): every relay she woke answers it (1 anywhere else). */
  get chorus(): number {
    return this.w.bk?.def.twist === 'chorus' ? chorusRate(wardenRelays(this.w.flags)) : 1;
  }

  /** What the HUD says while the charge runs (English, for t()): a loud relay tells her whether she is being heard; a chorus that the others answer. */
  get uplinkLine(): string {
    if (this.w.bk?.def.twist === 'chorus' && this.chorus > 1) return 'Waking it · your relays answer';
    if (this.w.bk?.def.twist !== 'loud') return 'Waking the relay';
    return this.quiet ? 'Waking it quietly' : 'Waking it loud · the Thren hear';
  }

  /** Loud charging fills the noise; when it fills, a Thren knot comes for the mast (a few a wake), and it breaks off when the relay wakes. */
  private stepNoise(dt: number): void {
    if (this.knots >= LOUD_MAX || (this.noise += dt / LOUD_FILL) < 1) return;
    this.noise = 0; this.knots++;
    for (const id of this.w.applyOutcome({ text: '', spawn: [{ variant: 'mote', n: LOUD_KNOT, from: 'around' }] }, 0, [])) this.waveHulls.add(id);
    this.w.events.push({ type: 'storyNotice', tone: 'red', headline: 'Thren knot', reason: 'drawn by the relay’s noise', main: true });
  }

  /** A jammed relay's static is bursting now (content/road.ts LEG_RELAYS): on a fixed cycle from the arrival. */
  get jammed(): boolean {
    return this.w.bk?.def.twist === 'jammed' && this.w.runTime % JAM_CYCLE >= JAM_QUIET;
  }

  /** An offset from where the relay stands, back toward where she came in and across (sim/breakout.ts laneBack). */
  private backFrom(back: number, across: number): { x: number; z: number } { return laneBack(this.w.bk!.lane, back, across); }

  /** A relay's twist (content/road.ts REACH_RELAYS): the rock on a buried mast, held where it sits; the picket on a guarded one, when she comes near. */
  private stepTwist(rl: { x: number; z: number }, dt: number): void {
    const tw = this.w.bk?.def.twist;
    if (tw === 'buried') {
      if (!this.buried) { this.buried = true; this.burial = this.w.field.bury(rl.x, rl.z, BURIED_R, BURIED_HP); }
      // (the rock is pinned: the field never wraps it round the ship, sim/field.ts)
      if (this.burial && !this.w.field.bulwarks.includes(this.burial)) {
        this.burial = null;
        this.w.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Relay clear', reason: 'hold in its ring', main: true });
      }
    }
    if (tw === 'adrift') {
      // the mast tumbles on a slow loop out from where it stood: she keeps in its ring as it goes (it steadies once awake)
      const a = (this.w.runTime / ADRIFT_LOOP) * Math.PI * 2;
      this.w.bk!.drift = this.backFrom(ADRIFT_OUT + ADRIFT_A * Math.sin(a), ADRIFT_B * Math.sin(2 * a));
      if (!this.adriftTold && Math.hypot(this.w.ship.x - rl.x, this.w.ship.z - rl.z) < ADRIFT_TELL) {
        this.adriftTold = true;
        this.w.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Relay adrift', reason: 'keep in its ring as it tumbles', main: true });
      }
    }
    if (tw === 'jammed' && this.jammed) {
      // a burst of static: lightning on the mast while it lasts (the charge waits it out, World.uplinkBlock)
      if ((this.jamT -= dt) <= 0) {
        this.jamT = JAM_STRIKE;
        // a crackle down the mast, top to foot, jagged
        const pts: number[] = [];
        for (let k = 0; k <= 6; k++) pts.push(rl.x + this.w.rng.range(-2.5, 2.5), 40 - k * 7, rl.z + this.w.rng.range(-2.5, 2.5));
        this.w.events.push({ type: 'arc', points: pts });
      }
      if (!this.jamTold && Math.hypot(this.w.ship.x - rl.x, this.w.ship.z - rl.z) < ADRIFT_TELL) {
        this.jamTold = true;
        this.w.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Relay jammed', reason: 'wake it between the bursts', main: true });
      }
    }
    if (tw === 'hungry' && !this.hungryTold && Math.hypot(this.w.ship.x - rl.x, this.w.ship.z - rl.z) < UPLINK_R) {
      this.hungryTold = true;
      this.w.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Relay hungry', reason: 'its core drinks your jump fluid', main: true });
    }
    if (tw === 'chorus' && !this.twistTold && this.chorus > 1 && Math.hypot(this.w.ship.x - rl.x, this.w.ship.z - rl.z) < UPLINK_R) {
      this.twistTold = true;
      this.w.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Relays answering', reason: 'every one you woke', main: true });
    }
    if (tw === 'loud' && !this.twistTold && Math.hypot(this.w.ship.x - rl.x, this.w.ship.z - rl.z) < UPLINK_R) {
      this.twistTold = true;
      this.w.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Relay loud', reason: 'drift slow to wake it quietly', main: true });
    }
    if (tw === 'guarded' && !this.guardsSent && Math.hypot(this.w.ship.x - rl.x, this.w.ship.z - rl.z) < GUARD_WAKE) {
      this.guardsSent = true;
      for (let i = 0; i < GUARDS; i++) {
        const a = (i / GUARDS) * Math.PI * 2;
        this.w.spawnHostile('picket', { x: rl.x + Math.cos(a) * 30, y: 0, z: rl.z + Math.sin(a) * 30 }, null, true);
      }
      this.w.events.push({ type: 'storyNotice', tone: 'red', headline: 'Relay guarded', reason: 'drive them off the mast', main: true });
    }
  }

  /** Why the uplink cannot run at a relay with a twist ('' when it can): the HUD's objective says what to do (English, for t()). */
  get uplinkBlock(): string {
    const rl = this.wakeRelay;
    if (!rl) return '';
    if (this.burial) return 'Mine the relay clear';
    if (this.jammed) return 'Wait for the static to pass';
    if (this.w.bk?.def.twist === 'refused' && !this.w.flags.has(`relay_ok_${this.w.bk.def.script}`)) return 'Hear the locals out first';
    if (this.w.bk?.def.twist === 'hungry' && this.w.cyrite <= 0.05) return STARVED;
    const sit = this.onMast(rl);
    if (sit.length) return this.w.bk?.def.twist === 'guarded' && !sit.some((a) => this.hunters.has(a.id)) ? 'Drive the guards off the relay' : 'Drive the hunter off the relay';
    return '';
  }

  /** The lane is open on this sortie (World.openLane). */
  laneOpened = false;

  /** A woken relay's lane: hulls come through the gate (sim/traffic.ts), and one of them says so on the radio a little after the key, if the radio has room. */
  private openLane(voice: boolean): void {
    this.laneOpened = true;
    if (!this.w.traffic) this.w.traffic = new Traffic(this.w, { n: 0, patrols: false, routes: [], busy: false });
    this.w.traffic.openLane(this.w);
    if (!voice) return;
    const line = LANE_LINES[(GATES.findIndex((g) => g.script === this.w.bk?.def.script) + 1) % LANE_LINES.length]!;
    this.w.radioLines('lane_open', tr('Hauler captain'), 'frontier', [tr(line)], 15);
  }
}
