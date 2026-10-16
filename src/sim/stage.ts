import { t } from '../i18n';
import { SITUATION_BY_ID, type ActorSpec, type SitResult, type SituationDef } from '../content/situations';
import { CARD_BY_ID, weightOf, type Outcome, type Tone } from './comms';
import { leave, provoke, type Alien } from './enemies';
import { bounty, Run, scaleOut, type Pt } from './mission';
import { stageAnchor } from './sites';
import type { Encounter } from './encounters';
import type { Rng } from './rng';
import type { World } from './world';

// ── the stage ─────────────────────────────────────────────────────────────
// One situation (content/situations.ts) played in the sortie. The world makes
// a Stage when the chart says the system has something going on, and steps it
// every frame. Four jobs:
//
//   the site    · a place off the straight line to the lane mouth, so it is on
//                 the way but not in the way, with the ships that belong to it
//   the call    · when the ship comes near, the situation's card is offered to
//                 the comms desk (eagerly: a scene is the point of the system,
//                 not a chance call), and the answer says what the player is on
//   the goal    · reach it, follow it, look at it: one line on the HUD, a hold
//                 or a time, and the ending pays or costs (an Outcome)
//   the temper  · ships here are wards (sim/enemies.ts Ward): none of them
//                 fires until its temper says why. A territorial one warns
//                 first, and gives a few seconds to back off.
//
// What came of it goes back to the journey as a SitResult (sim/situations.ts).

/** Seconds a territorial ward waits after its warning before it turns; longer while the player is on an errand it has been told about. */
const GRACE = 7;
const GRACE_ERRAND = 22;
/** How near the site the ship must be to hold (reach, watch), and how near to the lead ship to follow it. */
const SITE_R = 30;
const FOLLOW_R = 135;
/** Seconds the lead ship may be out of reach before the follow is lost. */
const LOST_AFTER = 14;
/** Wards this far behind or beside the ship, after the scene is over, are gone. */
const GONE = 520;

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** The goals a Run (sim/mission.ts) plays. */
const MISSION = new Set(['destroy', 'strike', 'defend', 'race', 'survey', 'sneak', 'recover']);

export interface StageResult { id: string; result: SitResult }

export class Stage {
  readonly def: SituationDef;
  /** The system's chart id and the situation the chart dealt (the live one may be its tightened variant). */
  readonly at: string;
  /** The site and the course it sits on. */
  x = 0; z = 0;
  private readonly sx: number; private readonly sz: number;
  private readonly lx: number; private readonly lz: number;
  private readonly len: number;
  actors: Alien[] = [];
  /** begun: the scene is on (past its time); offered: the call is with the desk; taken: the goal is on. */
  begun = false; offered = false; taken = false;
  result: SitResult | null = null;
  /** Seconds since the goal was taken, and seconds of hold or follow so far. */
  clock = 0; hold = 0; out = 0;
  private threatT = -1; private trapped = false; private sprang = false; private nearSaid = false; private provoked = false;
  /** The goal line on the HUD ('' when there is none). */
  line = '';
  /** A hail ring for the call: set from the def. */
  private marker: Encounter | null = null;
  private said = new Set<string>();
  /** The mission, once its goal is taken (sim/mission.ts). */
  run: Run | null = null;

  constructor(def: SituationDef, at: string, w: World) {
    this.def = def;
    this.at = at;
    const b = w.bk!;
    this.sx = w.ship.x; this.sz = w.ship.z;
    this.lx = b.lane.x; this.lz = b.lane.z;
    this.len = Math.hypot(this.lx - this.sx, this.lz - this.sz) || 1;
    // the port sits to one side of the line; the site takes the other (sim/sites.ts: the sky's feature is laid here too)
    const at0 = stageAnchor(at, { x: this.sx, z: this.sz }, { x: this.lx, z: this.lz }, b.port);
    this.x = at0.x; this.z = at0.z;
    // site actors are there from the start: you see them before you hear them
    for (const a of def.actors ?? []) if ((a.from ?? 'site') === 'site' && !a.foe) this.spawn(w, a);
  }

  // ── geometry ───────────────────────────────────────────────────────────
  private dir(): { ux: number; uz: number } { return { ux: (this.lx - this.sx) / this.len, uz: (this.lz - this.sz) / this.len }; }
  /** How far along the course to the lane mouth a point is, 0 to 1 (and past). */
  private progress(x: number, z: number): number {
    const { ux, uz } = this.dir();
    return ((x - this.sx) * ux + (z - this.sz) * uz) / this.len;
  }
  private dist(w: World): number { return Math.hypot(w.ship.x - this.x, w.ship.z - this.z); }

  // ── ships ──────────────────────────────────────────────────────────────
  private spawn(w: World, a: ActorSpec): void {
    const { ux, uz } = this.dir();
    const rng: Rng = w.rng;
    for (let i = 0; i < a.n; i++) {
      let x: number, z: number, hx: number, hz: number;
      const k = (i / Math.max(1, a.n)) * Math.PI * 2 + rng.range(0, 0.6);
      if (a.from === 'ahead') {
        // across the course 420 units out, heading for the far side
        const d = 420 + rng.range(-40, 60), side = hash(this.at) & 1 ? 1 : -1;
        x = w.ship.x + ux * d - uz * side * 200 + rng.range(-24, 24); z = w.ship.z + uz * d + ux * side * 200 + rng.range(-24, 24);
        hx = w.ship.x + ux * (d - 40) + uz * side * 520; hz = w.ship.z + uz * (d - 40) - ux * side * 520;
        if (a.act === 'lead') { hx = this.lx; hz = this.lz; x = w.ship.x + ux * 120 + rng.range(-12, 12); z = w.ship.z + uz * 120 + rng.range(-12, 12); }
      } else if (a.from === 'astern') {
        x = w.ship.x - ux * 190 + rng.range(-20, 20); z = w.ship.z - uz * 190 + rng.range(-20, 20); hx = x; hz = z;
      } else {
        const r = Math.min(30, (a.ring ?? 20) * 0.5) * (a.n > 1 ? 1 : 0.4);
        x = this.x + Math.cos(k) * r; z = this.z + Math.sin(k) * r; hx = x; hz = z;
      }
      const al = w.spawnHostile(a.variant, { x, y: w.rng.range(-1.5, 1.5), z }, null, true);
      al.canCloak = false; al.cloak = 0;
      al.mode = 'drift'; al.escort = false;
      al.ax = hx; al.az = hz;
      al.ward = { act: a.act, temper: a.temper, hx, hz, ring: a.ring ?? (a.act === 'orbit' ? 60 : a.act === 'follow' ? 120 : 40), warned: 0, tag: a.tag };
      al.spK *= a.pace ?? 1;
      if (a.hp) { al.hp *= a.hp; al.maxHp *= a.hp; }
      if (a.target) al.job = true;
      this.actors.push(al);
    }
  }

  private alive(w: World): Alien[] {
    this.actors = this.actors.filter((a) => w.aliens.includes(a));
    return this.actors;
  }

  /** Every ward of this scene stops being one: the guard, the visitors, whoever is here. */
  private turnAll(w: World, only: (a: Alien) => boolean = () => true): void {
    for (const a of this.alive(w)) if (a.ward && only(a)) provoke(a, w.events);
  }

  private leaveAll(w: World): void {
    for (const a of this.alive(w)) if (a.ward) { leave(a); delete a.ward; }
  }

  // ── events from the world ──────────────────────────────────────────────
  /** A scene hull was hit by the player. Meek ones run, the rest turn; the whole guard knows. */
  shot(w: World, al: Alien): void {
    if (!al.ward || this.result) return;
    if (this.run?.owns(al)) { this.run.shot(w, al); return; }
    this.provoked = true;
    for (const a of this.alive(w)) {
      if (!a.ward) continue;
      if (a.ward.temper === 'meek') { leave(a); delete a.ward; } else provoke(a, w.events);
    }
    if (this.taken) this.finish(w, 'lost');
  }

  /** The call was answered. */
  answered(w: World, cardId: string, choice: string, tone: Tone, won: boolean, out: Outcome): void {
    if (this.result || cardId !== this.def.card) return;
    const d = this.def;
    this.offered = true;
    if (tone === 'refuse') { this.leaveAll(w); return this.finish(w, 'declined'); }
    if (out.dismiss) this.leaveAll(w);
    if (tone === 'fight') this.turnAll(w);
    const goal = d.goal.kind !== 'call' && (d.accept ?? []).includes(choice);
    if (!goal) return this.finish(w, won ? 'won' : 'lost');
    this.take(w);
  }

  /** The call rang out unanswered. */
  lapsed(w: World, cardId: string): void {
    if (this.result || cardId !== this.def.card) return;
    this.finish(w, 'ignored');
  }

  // ── the step ───────────────────────────────────────────────────────────
  step(w: World, dt: number): void {
    const d = this.def, now = w.runTime;
    if (this.result && !this.actors.length) return;
    const near = this.dist(w);

    if (!this.result) {
      if (!this.begun && now >= d.at) this.begin(w);
      // the call
      if (this.begun && d.card && !this.offered && near <= d.hail && w.phase === 'play') {
        const card = CARD_BY_ID[d.card];
        if (card) { w.desk.offer(card, weightOf(card), now, false, true); this.offered = true; }
      }
      // a call the desk let go stale was never heard: ring it again
      if (this.offered && !this.taken && d.card && w.phase === 'play' && !w.desk.waiting(d.card) && w.call?.def.id !== d.card && w.comms?.def.id !== d.card) this.offered = false;
      if (this.begun && !this.nearSaid && near < 260) { this.nearSaid = true; this.said_('near', w); }
      // a scene with no call and no goal is over once it has played: it was there to be seen
      if (this.begun && !d.card && d.goal.kind === 'call' && this.progress(w.ship.x, w.ship.z) > 0.2 && near > 340 && this.progress(w.ship.x, w.ship.z) > this.progress(this.x, this.z) + 0.06) this.finish(w, 'won');
      if (this.taken) this.goal(w, dt);
      this.trap(w);
    }
    this.wards(w, dt);
    this.mark(w);
    // done and gone
    if (this.result) {
      const s = w.ship;
      for (const a of this.alive(w)) if (a.ward && Math.hypot(a.x - s.x, a.z - s.z) > GONE && near > GONE) w.aliens.splice(w.aliens.indexOf(a), 1);
    }
  }

  private begin(w: World): void {
    this.begun = true;
    for (const f of this.def.seen ?? []) w.flags.add(f);
    for (const a of this.def.actors ?? []) if ((a.from === 'ahead' || a.from === 'astern') && !a.foe) this.spawn(w, a);
    this.said_('start', w);
  }

  private said_(on: 'start' | 'near' | 'won' | 'lost', w: World): void {
    for (const [i, s] of (this.def.say ?? []).entries()) {
      if (s.on !== on) continue;
      const id = `say_${this.def.id}_${i}`;
      if (this.said.has(id)) continue;
      this.said.add(id);
      w.events.push({ type: 'ping', id, from: t(s.from), caller: 'unknown', text: t(s.text), moment: 'calm', system: w.sortie.name });
    }
  }

  private take(w: World): void {
    const g = this.def.goal;
    this.taken = true; this.clock = 0; this.hold = 0; this.out = 0;
    this.line = t(g.line);
    if (MISSION.has(g.kind)) {
      const { ux, uz } = this.dir();
      this.run = new Run(this.def, { x: this.x, z: this.z, ux, uz }, w, this.actors.filter((a) => (this.def.actors ?? []).some((sp) => sp.target && sp.tag === a.ward?.tag)));
    }
    if (this.def.threat) this.threatT = this.def.threat.after;
    this.trapped = !!this.def.trap;
    w.events.push({ type: 'sectorEvent', id: 'scene', name: t(this.def.name), text: this.line });
  }

  /** The leader of a follow: the first living ward that leads. */
  /** How much of the hold is done, 0 to 1. */
  get held(): number { return this.def.goal.hold > 0 ? Math.min(1, this.hold / this.def.goal.hold) : 0; }
  /** Seconds left before the goal is missed (0: no limit). */
  get left(): number { return this.def.goal.limit > 0 ? Math.max(0, this.def.goal.limit - this.clock) : 0; }
  /** The mission's second line on the HUD, its pins in the world, and how seen the ship is (sneak). */
  get status(): string { return this.run?.status ?? ''; }
  get pins(): Array<Pt & { r?: number }> { return this.run?.points ?? []; }
  get exposed(): number { return this.run?.exposed ?? 0; }
  /** Whether what the site asks for is aboard (the HUD's 'holding' against 'not enough'). */
  ready = true;

  private leader(w: World): Alien | null { return this.alive(w).find((a) => a.ward?.act === 'lead') ?? null; }

  private goal(w: World, dt: number): void {
    const d = this.def, g = d.goal, s = w.ship;
    this.clock += dt;
    if (this.threatT >= 0 && (this.threatT -= dt) < 0 && d.threat) {
      const { ux, uz } = this.dir();
      for (let i = 0; i < d.threat.n; i++) w.spawnHostile(d.threat.variant, { x: s.x + ux * 340 + (i - d.threat.n / 2) * 30, y: 0, z: s.z + uz * 340 + (i - d.threat.n / 2) * 30 }, null, true);
      w.events.push({ type: 'ping', id: `say_${d.id}_threat`, from: t('Scope'), caller: 'unknown', text: t('“Contacts ahead, closing fast.”'), moment: 'calm', system: w.sortie.name });
    }
    if (this.run) {
      const v = this.run.step(w, dt);
      this.ready = true;
      if (v) return this.finish(w, v);
    } else if (g.kind === 'follow') {
      const lead = this.leader(w);
      if (!lead) return this.finish(w, 'lost');
      const dl = Math.hypot(lead.x - s.x, lead.z - s.z);
      if (dl < FOLLOW_R) { this.hold += dt; this.out = 0; } else this.out += dt;
      if (this.out > LOST_AFTER) return this.finish(w, 'lost');
      if (this.hold >= g.hold) return this.finish(w, 'won');
    } else {
      const have = this.has(w);
      this.ready = have;
      const slow = g.kind !== 'watch' || w.stageSlow();
      if (this.dist(w) < SITE_R && have && slow && !this.provoked) this.hold += dt;
      else this.hold = Math.max(0, this.hold - dt * 0.5);
      if (this.hold >= g.hold) { this.pay(w); return this.finish(w, 'won'); }
    }
    if (g.limit > 0 && this.clock > g.limit) this.finish(w, 'lost');
  }

  /** What the site wants has been brought. */
  private has(w: World): boolean {
    const give = this.def.goal.give;
    return !give || ((give.supplies ?? 0) <= w.supplies && (give.chits ?? 0) <= w.chits && (give.cyrite ?? 0) <= w.cyrite);
  }
  private pay(w: World): void {
    const give = this.def.goal.give;
    if (!give) return;
    w.supplies -= give.supplies ?? 0; w.chits -= give.chits ?? 0; w.cyrite -= give.cyrite ?? 0;
  }

  /** Hostiles waiting on the line to the lane mouth, sprung as the ship passes. */
  private trap(w: World): void {
    const tr = this.def.trap;
    if (!tr || this.sprang) return;
    if (this.progress(w.ship.x, w.ship.z) < tr.at) return;
    this.sprang = true;
    const { ux, uz } = this.dir();
    for (let i = 0; i < tr.n; i++) {
      const k = (i - (tr.n - 1) / 2) * 34;
      w.spawnHostile(tr.variant, { x: w.ship.x + ux * 260 - uz * k, y: 0, z: w.ship.z + uz * 260 + ux * k }, null, true);
    }
  }

  // ── the wards ──────────────────────────────────────────────────────────
  private wards(w: World, dt: number): void {
    const s = w.ship, now = w.runTime;
    const { ux, uz } = this.dir();
    const lead = this.leader(w);
    for (const [i, a] of this.alive(w).entries()) {
      const W = a.ward;
      if (!W || this.run?.owns(a)) continue;
      a.mode = 'drift';
      const dx = s.x - a.x, dz = s.z - a.z, d = Math.hypot(dx, dz) || 1;
      const ph = i * 2.1;
      switch (W.act) {
        case 'hold':
          // a drawn hull comes to within its ring of a ship with Cyrite aboard, and no nearer
          if (W.temper === 'drawn' && w.fuel > 0 && d < 220) { a.ax = s.x - (dx / d) * W.ring; a.az = s.z - (dz / d) * W.ring; } else { a.ax = W.hx; a.az = W.hz; }
          break;
        case 'orbit': {
          const th = now * 0.25 + ph;
          a.ax = s.x + Math.cos(th) * W.ring; a.az = s.z + Math.sin(th) * W.ring;
          break;
        }
        case 'follow':
          a.ax = s.x - ux * W.ring + Math.cos(ph) * 14; a.az = s.z - uz * W.ring + Math.sin(ph) * 14;
          break;
        case 'lead': {
          // keeps on towards the lane, but waits when the ship falls behind; the rest of a convoy keep station on it
          if (a === lead) {
            const wait = !this.taken || d > FOLLOW_R * 0.9;
            const past = Math.hypot(this.lx - a.x, this.lz - a.z) < 60;
            a.ax = wait || past ? a.x : a.x + (this.lx - a.x) * 0.08 + Math.sin(a.age * 0.2) * 4;
            a.az = wait || past ? a.z : a.z + (this.lz - a.z) * 0.08;
          } else if (lead) { a.ax = lead.x - ux * (14 + i * 6) + Math.cos(ph) * 10; a.az = lead.z - uz * (14 + i * 6) + Math.sin(ph) * 10; }
          break;
        }
        case 'patrol': {
          // sweeps the site on a ring, slow and steady, each hull on its own phase
          const th = now * 0.22 * (i % 2 ? -1 : 1) + ph;
          const r = W.ring + (i % 3) * 22;
          a.ax = this.x + Math.cos(th) * r; a.az = this.z + Math.sin(th) * r;
          break;
        }
        case 'pass':
          a.ax = W.hx; a.az = W.hz;
          break;
      }
      // a finished scene: the ships go on their way
      if (this.result && !this.taken) { a.ax = a.x + (a.x - this.x) * 0.2 + ux * 40; a.az = a.z + (a.z - this.z) * 0.2 + uz * 40; }
      this.temper(w, a, W, d, now);
      void dt;
    }
  }

  private temper(w: World, a: Alien, W: NonNullable<Alien['ward']>, d: number, now: number): void {
    if (W.temper !== 'territorial' || this.result === 'declined') return;
    if (d >= W.ring) { W.warned = 0; return; }
    if (!W.warned) {
      W.warned = now;
      w.events.push({ type: 'ping', id: `warn_${a.id}`, from: t(W.tag), caller: 'custody', text: t('“Hold position. This is a controlled area. Turn away.”'), moment: 'calm', system: w.sortie.name });
      return;
    }
    // somebody who has paid the toll, or been let in, has longer
    const grace = this.taken || this.result === 'won' ? GRACE_ERRAND : GRACE;
    if (now - W.warned > grace) { this.provoked = true; provoke(a, w.events); this.turnAll(w, (x) => x.ward?.temper === 'territorial'); }
  }

  // ── the marker ─────────────────────────────────────────────────────────
  /** The scene's pin on the sector: while the goal is on, the HUD, compass, radar and edge pointers read it like any sector event. */
  private mark(w: World): void {
    // a job is pinned from the moment it is in the sky, so the player can fly to it; the call rings when they are near
    const live = (this.taken || (this.begun && this.def.goal.kind !== 'call')) && !this.result;
    if (!live) {
      if (this.marker && w.encounter === this.marker) w.encounter = null;
      this.marker = null;
      return;
    }
    if (!this.marker) {
      if (w.encounter) return;
      this.marker = { id: 'scene', t: 0, dur: 9999, x: this.x, z: this.z, r: SITE_R, progress: 0, done: false, success: false, timer: 0, ids: [], label: t(this.def.name) };
      w.encounter = this.marker;
    }
    if (w.encounter !== this.marker) { this.marker = null; return; }
    const m = this.marker;
    const g = this.def.goal;
    if (!this.taken) { m.x = this.x; m.z = this.z; m.r = SITE_R; m.progress = 0; } else if (this.run) { m.x = this.run.focus.x; m.z = this.run.focus.z; m.r = this.run.focus.r; m.progress = this.run.progress; }
    else {
      if (g.kind === 'follow') { const l = this.leader(w); if (l) { m.x = l.x; m.z = l.z; } m.r = FOLLOW_R; } else { m.x = this.x; m.z = this.z; m.r = SITE_R; }
      m.progress = g.hold > 0 ? Math.min(1, this.hold / g.hold) : 0;
    }
    m.t = this.clock;
  }

  /** A job in the sky that has not been taken on: on the scope, with its call still to ring. */
  get onScope(): boolean { return this.begun && !this.taken && !this.result && this.def.goal.kind !== 'call'; }

  // ── the end ────────────────────────────────────────────────────────────
  private finish(w: World, r: SitResult): void {
    if (this.result) return;
    this.result = r;
    const d = this.def;
    // a goal pays only when it was taken on: a card answered some other way has paid in the card
    const goalOut = (o: Outcome | undefined): Outcome | undefined => (d.goal.kind === 'call' || !this.taken ? undefined : o);
    const out: Outcome | undefined = r === 'won' ? goalOut(d.win) : r === 'lost' ? goalOut(d.lose) : r === 'ignored' ? d.ignore : undefined;
    if (out) w.applyOutcome(r === 'won' && this.run ? bounty(scaleOut(out, this.run.scale), w.pay) : out, 1, []);
    if (this.run && r === 'lost') for (const a of this.alive(w)) if (a.ward?.act === 'patrol') provoke(a, w.events);
    if (r === 'won' && !this.provoked) { for (const a of this.alive(w)) if (a.ward && a.ward.act !== 'lead') a.ward.act = 'pass'; }
    if (this.taken) this.said_(r === 'won' ? 'won' : 'lost', w);
    if (this.taken && out?.text) w.events.push({ type: 'sectorEventEnd', id: 'scene', name: t(d.name), text: t(out.text), success: r === 'won' });
    this.taken = false;
    this.line = '';
    this.mark(w);
    if (this.run) { for (const a of w.aliens) if (this.run.owns(a)) a.job = false; this.run = null; }
    // a lead ship that was followed goes on its way
    if (r !== 'lost') for (const a of this.alive(w)) if (a.ward?.act === 'lead') a.ward.act = 'pass';
  }

  /** The sortie is over: what came of the scene, or null if it was never met. */
  conclude(w: World): StageResult | null {
    if (!this.result && this.begun) {
      // a call nobody was near enough to hear is not a scene met
      if (this.def.card && !this.offered && !this.provoked) return null;
      this.finish(w, this.taken || this.provoked ? 'lost' : this.def.card ? 'ignored' : 'won');
    }
    return this.result ? { id: this.at, result: this.result } : null;
  }
}

/** The stage for a live situation of the chart, or null. */
export function makeStage(id: string, sit: string | null, w: World): Stage | null {
  const def = sit ? SITUATION_BY_ID[sit] : undefined;
  return def ? new Stage(def, id, w) : null;
}
