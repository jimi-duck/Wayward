import { MODIFIERS } from '../content/unlocks';
import type { Hull } from '../content/hulls';
import type { InputFrame } from '../input/types';
import {
  arcTargets, burnAt, chainMines, CHAIN_CLOUD, GRAVITY_PULL, laySystems, mineRing, newSystems, plasmaRing, stepBurns, stepMines,
  type Mine, type Reachable, type Systems,
} from './arsenal';
import { Command, type Strike, type Telegraph } from './bosses';
import { computeStats, identity, makeOffer, type Levels, type Offer } from './build';
import { flightControls, type FlightControls } from './controls';
import { EVENT_FIRST, eventGap, NO_MODS, pressure, type Mods, type Pressure } from './director';
import { pickEncounter, startEncounter, stepEncounter, wellPull, type Encounter, type EncounterHost, type EncounterId } from './encounters';
import {
  ALIEN_FIRST, ALIEN_TYPES, BEAM_LEN, BEAM_W, BORG_ADAPT, CULL, ELITE_BLAST_DAMAGE, ELITES, FACTION_TRAITS, SQUADS, VARIANTS,
  WEB_R, alienBonus, alienFire, alienLabel, beamLive, cloaked, leave, moveAlien, moveShots, pickElite, pickVariant, rayDist,
  spawnAlien, stepBeam, stepWebs, type Alien, type Arena, type EliteId, type Faction, type Shot, type Web,
} from './enemies';
import type { BlastKind, GameEvent, PowerKind } from './events';
import { Field, ROCK_KINDS, VOLATILE_BLAST, VOLATILE_DAMAGE, type Rock } from './field';
import { Ids, useIds } from './ids';
import { dropCrystals, dropItem, POWERS, POWER_TIME, stepPickups, type Pickup, type PickupKind } from './pickups';
import { Rng } from './rng';
import { newRun, TIMELINE, type RunStats, type ScoreSource, type Weapon } from './run';
import { drifting, newShip, stepShip, topSpeed, type ShipState } from './ship';
import { flightHull, type Stats } from './stats';
import {
  BREACH_GRACE, CELEBRATE, CHAIN_WINDOW, DYING, GRAZE, OC_GAIN, OC_MAX, OVERCHARGE_POINTS, PX, RARE_FIRST, REPAIR_CHANCE,
  REPAIR_CHANCE_ELITE, REPAIR_GAP, ROCK_POINTS, SCORE_PER_CRYSTAL, SCORE_PER_SECOND, SHIELD_GRACE, SHIP_R, TORP_FUSE, chainMult, xpFor,
} from './tuning';
import {
  acquire, fireWeapons, launchTorpedo, moveBolts, moveTorpedoes, newArms, type Arms, type Bolt, type FireMods, type Targets, type Torpedo,
} from './weapons';

// The simulation's root. It never touches Three.js, so it can run headless.
// Conventions: the ship flies on the XZ plane (y = 0), heading 0 faces +X and
// PI/2 faces -Z ("up" on screen), headings are never wrapped. Enemies, their
// fire and the player's fire move in 3D; rock and bulwarks sit on the plane.
//
// A run is a loop: fly, fight, collect dilithium, fill the rail, refit, face
// harder sky, meet capital ships, and in the end lose the hull. The world
// pauses itself at the two decisions a run asks for, a refit (`phase`
// 'refit': three cards in `offer`) and a hail ('hail': engage or evade), and
// at the end ('over': the record in `run`). The app answers with choose(),
// answerHail() and restart(); the scripted pilot calls the same three.

export type Phase = 'play' | 'refit' | 'hail' | 'over';

export interface WorldOptions {
  /** Upgrade, event and modifier ids opened by long-term progression. */
  unlocked?: Iterable<string>;
  /** Challenge modifiers switched on for this run. */
  modifiers?: string[];
}

const IDLE: FlightControls = { turn: 0, thrust: 0, roll: false, rollDir: 0, fire: false, torpedo: false };
const BOSS_PLATES = 1;

export class World implements EncounterHost {
  readonly rng: Rng;
  readonly ids = new Ids();
  readonly seed: number;
  ship: ShipState = newShip();
  /** The ship one step ago, for interpolation. */
  prev: ShipState = newShip();
  /** What the player has made of the ship, and the numbers that follow from it. */
  levels: Levels = {};
  stats: Stats;
  hull: Hull;
  plates: number;
  /** Shield charges up, and seconds until the next recharges. */
  shields = 0;
  shieldT = 0;
  arms: Arms;
  field: Field;
  bolts: Bolt[] = [];
  torps: Torpedo[] = [];
  aliens: Alien[] = [];
  shots: Shot[] = [];
  webs: Web[] = [];
  pickups: Pickup[] = [];
  sys: Systems = newSystems();
  tele: Telegraph[] = [];
  strikes: Strike[] = [];
  readonly command = new Command();
  encounter: Encounter | null = null;
  /** The target a torpedo launched now would lock, for the HUD. */
  lock: number | null = null;
  score = 0;
  best = 0;
  /** Seconds of simulated time, and seconds into the current run. */
  time = 0;
  runTime = 0;
  /** Rocks and hulls broken this run. */
  kills = 0;
  nextAlien = ALIEN_FIRST;

  // the refit rail
  phase: Phase = 'play';
  xp = 0;
  refit = 0;
  xpNext = xpFor(0);
  offer: Offer | null = null;
  /** Refits earned and not yet taken; battle salvage owed. */
  pendingRefits = 0;
  pendingSalvage = 0;
  /** Seconds of slow motion left before the refit panel opens. */
  celebrate = 0;

  // the warp core, the chain, power-ups
  oc = 0;
  /** Seconds of weapons overload left (after a release), and of phase cloak. */
  overload = 0;
  phaseT = 0;
  chain = 0;
  chainT = 0;
  powers: Record<PowerKind, number> = { shield: 0, rapid: 0, magnet: 0, overdrive: 0, charge: 0 };

  alive = true;
  run: RunStats;
  readonly unlocked: Set<string>;
  readonly modifiers: string[];
  private mods: Mods = NO_MODS;
  private scoreMult = 1;
  private dmgMult = 1;
  private noRepairs = false;
  private presented = new Set<string>();
  private dying = 0;
  private dcUsed = false;
  private sinceHit = 0;
  private repairCd = 0;
  private nextRare = RARE_FIRST;
  private theatre: Faction = 'klingon';
  private theatreT = 70;
  private nextEvent = EVENT_FIRST;
  private eventN = 0;
  private lastEvent: EncounterId | null = null;
  private timeScore = 0;
  private nextSample = 0;
  private wasRolling = false;
  readonly events: GameEvent[] = [];

  constructor(seed = 47, opts: WorldOptions = {}) {
    useIds(this.ids);
    this.seed = seed;
    this.rng = new Rng(seed);
    this.unlocked = new Set(opts.unlocked ?? []);
    this.modifiers = (opts.modifiers ?? []).filter((m) => MODIFIERS[m]);
    this.applyModifiers();
    this.stats = this.buildStats();
    this.hull = flightHull(this.stats);
    this.plates = this.stats.maxPlates;
    this.arms = newArms(this.stats);
    this.field = new Field(this.rng);
    this.field.seed(0, 0);
    this.run = newRun(seed, this.modifiers);
  }

  /** Everything that happened since the last call. */
  drain(): GameEvent[] {
    return this.events.splice(0);
  }

  /** What the seeker can see this step. A capital ship still dropping in is not yet in reach; a cloaked hull never is. */
  targets(): Targets {
    const boss = this.command.targetable();
    return { ships: this.aliens.filter((a) => !cloaked(a)), boss: boss && !boss.arriving ? boss : null, rocks: this.field.rocks };
  }

  /** The current difficulty. */
  get pressure(): Pressure {
    return pressure(this.runTime, this.mods);
  }

  /** Seconds of the run's chain window left, 0 to 1, for the HUD. */
  get chainLeft(): number {
    return this.chain > 0 ? this.chainT / CHAIN_WINDOW : 0;
  }

  get chainMult(): number {
    return chainMult(this.chain);
  }

  /** Sensors are down (the nebula): shorter radar and locks. */
  get sensorsDown(): boolean {
    return this.encounter?.id === 'nebula' && !this.encounter.done;
  }

  // ── the step ──────────────────────────────────────────────────────────

  step(dt: number, input: InputFrame): void {
    useIds(this.ids);
    if (this.phase !== 'play') return;
    Object.assign(this.prev, this.ship);
    const s = this.ship, t = this.runTime, st = this.stats;
    const p = pressure(t, this.mods);
    const c = this.alive ? flightControls(input) : IDLE;

    stepShip(s, c, this.hull, dt);
    const rolling = s.rollT >= 0;
    if (rolling && !this.wasRolling && st.rollBurst) plasmaRing(this.sys, s, st);
    this.wasRolling = rolling;
    this.tick(dt);

    // our weapons and systems
    const targets = this.targets();
    const fm: FireMods = { overload: this.overload > 0 || this.powers.rapid > 0, damage: this.dmgMult * (this.powers.overdrive > 0 ? 1.5 : 1), drifting: drifting(s, this.hull) };
    const fireStats = this.sensorsDown ? { ...st, torpSeek: st.torpSeek * 0.6 } : st;
    if (this.alive) {
      fireWeapons(this.arms, s, c, targets, fireStats, fm, this.bolts, this.torps, this.events, dt);
      const laid = laySystems(this.sys, s, st, dt, fm.overload);
      if (laid) this.events.push({ type: 'mineLaid', x: laid.x, z: laid.z });
    }

    // the sector
    this.field.step(dt, s.x, s.z, p);
    if (t >= this.nextRare) {
      this.field.spawnRare(s.x, s.z, s.heading);
      this.nextRare = t + this.rng.range(70, 110);
    }
    this.spawn(t, p);
    this.stepAliens(dt, t, p);
    const before = this.command.state;
    this.command.step(t, dt, s, this.aliens, this.shots, this.webs, this.tele, this.strikes, this.rng, this.events);
    if (before !== 'fight' && this.command.state === 'fight') {
      // engaged: the regular traffic clears out for the capital ship and her wing
      for (const al of this.aliens) if (!al.escort && !al.extra) leave(al);
    }
    this.stepEncounter(dt, t);
    moveShots(this.shots, s, dt);
    stepWebs(this.webs, dt);
    moveBolts(this.bolts, dt, targets);
    for (const tp of moveTorpedoes(this.torps, targets, dt)) this.torpBlast(tp);
    this.stepSystems(dt, fm.overload);
    this.stepStrikes(dt);
    for (let i = this.tele.length - 1; i >= 0; i--) if ((this.tele[i]!.t -= dt) <= 0) this.tele.splice(i, 1);
    this.stepPickups(dt);
    this.collide();
    if (this.alive) {
      this.graze(dt);
      if (input.overcharge) this.release();
    }
    const lock = acquire(this.targets(), s.x, s.z, s.heading, fireStats.torpCone, fireStats.torpSeek);
    this.lock = lock ? lock.id : null;

    this.time += dt;
    if (this.alive) {
      this.runTime += dt;
      this.timeScore += SCORE_PER_SECOND * dt;
      if (this.timeScore >= 1) { const n = Math.floor(this.timeScore); this.timeScore -= n; this.addScore(n, 'time'); }
      if (this.runTime >= this.nextSample) {
        this.run.timeline.push({ t: Math.round(this.runTime), score: this.score, plates: this.plates, refit: this.refit });
        this.nextSample += TIMELINE;
      }
    } else if ((this.dying -= dt) <= 0) this.finish();

    // the decisions: a full rail (after a beat of slow motion), and a hail
    if (this.alive && this.celebrate > 0 && (this.celebrate -= dt) <= 0) this.openRefit();
    else if (this.alive && this.command.hailing && this.phase === 'play') this.phase = 'hail';
  }

  /** Clocks: power-ups, overload, the chain, shields, regeneration. */
  private tick(dt: number): void {
    const st = this.stats;
    for (const k of POWERS) if (this.powers[k] > 0) this.powers[k] = Math.max(0, this.powers[k] - dt);
    if (this.overload > 0) this.overload = Math.max(0, this.overload - dt);
    if (this.phaseT > 0) this.phaseT = Math.max(0, this.phaseT - dt);
    if (this.repairCd > 0) this.repairCd -= dt;
    if (this.chain > 0 && (this.chainT -= dt) <= 0) this.chain = 0;
    this.sinceHit += dt;
    if (this.shields < st.shieldMax && this.alive) {
      if ((this.shieldT -= dt) <= 0) {
        this.shields++;
        this.shieldT = st.shieldRecharge;
        this.events.push({ type: 'shieldUp', charges: this.shields });
      }
    }
    if (st.regen > 0 && this.alive && this.plates < st.maxPlates && this.sinceHit >= st.regen) {
      this.plates++;
      this.sinceHit = 0;
      this.run.platesGained++;
      this.events.push({ type: 'regen', plates: this.plates });
    }
  }

  // ── decisions ─────────────────────────────────────────────────────────

  private openRefit(): void {
    const kind = this.pendingSalvage > 0 ? 'salvage' : undefined;
    this.offer = makeOffer({ levels: this.levels, unlocked: this.unlocked, presented: this.presented, refit: this.refit, kind }, this.rng);
    if (!this.offer.cards.length) { this.offer = null; this.pendingRefits = 0; this.pendingSalvage = 0; return; }
    this.phase = 'refit';
  }

  /** Take card `i` from the current offer. */
  choose(i: number): void {
    useIds(this.ids);
    const card = this.offer?.cards[i];
    if (this.phase !== 'refit' || !card) return;
    if (this.offer!.kind === 'salvage') this.pendingSalvage--;
    else this.pendingRefits--;
    this.levels = { ...this.levels, [card.id]: (this.levels[card.id] ?? 0) + 1 };
    this.refreshStats();
    this.offer = null;
    this.phase = 'play';
    if (this.pendingRefits > 0 || this.pendingSalvage > 0) this.openRefit();
  }

  /** The hail: engage (true) or evade (false). Evade is refused when it is not on offer. */
  answerHail(engage: boolean): void {
    useIds(this.ids);
    if (this.phase !== 'hail') return;
    if (engage) this.command.engage(this.runTime);
    else if (this.command.evade(this.runTime, this.events)) this.run.capitalsEvaded++;
    else this.command.engage(this.runTime);
    this.phase = 'play';
  }

  /** Fit a build outright (tests, the scripted pilot, debugging). */
  setLevels(levels: Levels): void {
    this.levels = { ...levels };
    this.refreshStats();
  }

  private buildStats(): Stats {
    const s = computeStats(this.levels);
    const m = this.modifiers.map((id) => MODIFIERS[id]!);
    for (const d of m) if (d.plates) s.maxPlates = Math.max(1, s.maxPlates + d.plates);
    return s;
  }

  private refreshStats(): void {
    const old = this.stats;
    this.stats = this.buildStats();
    this.hull = flightHull(this.stats);
    // a new plate or shield comes fitted whole; a new torpedo bay comes loaded
    if (this.stats.maxPlates > old.maxPlates) this.plates += this.stats.maxPlates - old.maxPlates;
    this.plates = Math.min(this.plates, this.stats.maxPlates);
    if (this.stats.shieldMax > old.shieldMax) this.shields += this.stats.shieldMax - old.shieldMax;
    if (this.stats.torpedoes && !old.torpedoes) this.arms.rack = this.stats.torpRack;
    if (this.stats.torpRack > old.torpRack && old.torpedoes) this.arms.rack += this.stats.torpRack - old.torpRack;
    if (this.stats.bankMax > old.bankMax) this.arms.bank += this.stats.bankMax - old.bankMax;
  }

  private applyModifiers(): void {
    let traffic = 1, toughness = 1, damage = 1, score = 1, noRepairs = false;
    for (const id of this.modifiers) {
      const d = MODIFIERS[id]!;
      traffic *= d.traffic ?? 1; toughness *= d.toughness ?? 1; damage *= d.damage ?? 1; score *= d.score;
      noRepairs ||= !!d.noRepairs;
    }
    this.mods = { traffic, toughness };
    this.dmgMult = damage;
    this.scoreMult = score;
    this.noRepairs = noRepairs;
  }

  // ── the sector: spawning, hulls, events ───────────────────────────────

  /** The director's pacing: a hull (or a squad) every few seconds, under a ceiling, except while a capital ship is engaged. */
  private spawn(t: number, p: Pressure): void {
    if ((this.theatreT -= 1 / 60) <= 0) this.rotateTheatre(t);
    const cs = this.command.state;
    if (cs === 'fight' || cs === 'inbound' || cs === 'hailing') return;
    if (t < this.nextAlien) return;
    const regular = this.aliens.filter((a) => !a.escort && !a.extra).length;
    if (regular < p.enemyCap) {
      const squads = SQUADS.filter((q) => q.at <= t && regular + q.members.length <= p.enemyCap);
      if (squads.length && this.rng.next() < p.squadChance) this.spawnSquad(squads[this.rng.int(squads.length)]!, p);
      else {
        const v = pickVariant(t, this.aliens, this.rng, this.theatre, p.theatre);
        if (v) {
          const lead = this.spawnHostile(v.id, undefined, this.rollElite(v.kind, v.faction, p));
          // interceptors past the opening come in pairs: a wingman in echelon
          const T = ALIEN_TYPES[v.kind];
          if (T.role === 'interceptor' && t > 30 && regular + 1 < p.enemyCap && this.rng.next() < 0.6) {
            const wing = this.spawnHostile(v.id, { x: lead.x + Math.sin(lead.face) * 5, y: lead.y + 1.5, z: lead.z + Math.cos(lead.face) * 5 });
            wing.slide = lead.slide;
            wing.modeT = lead.modeT + 0.6;
          }
        }
      }
    }
    const busy = this.encounter?.id === 'distress' && !this.encounter.done ? 0.7 : 1;
    this.nextAlien = t + p.enemyInterval * this.rng.range(0.8, 1.2) * busy;
  }

  private rollElite(kind: Alien['kind'], faction: Faction, p: Pressure): EliteId | null {
    return this.rng.next() < p.eliteChance ? pickElite(kind, faction, this.rng) : null;
  }

  private rotateTheatre(t: number): void {
    const open = [...new Set(Object.values(VARIANTS).filter((v) => v.at <= t && v.weight > 0).map((v) => v.faction))];
    const pool = open.filter((f) => f !== this.theatre);
    if (pool.length) this.theatre = pool[this.rng.int(pool.length)]!;
    this.theatreT = 70;
  }

  private spawnSquad(q: (typeof SQUADS)[number], p: Pressure): void {
    const first = this.spawnHostile(q.members[0]!, undefined, this.rollElite(VARIANTS[q.members[0]!]!.kind, VARIANTS[q.members[0]!]!.faction, p));
    for (let i = 1; i < q.members.length; i++) {
      const a = (i / q.members.length) * Math.PI * 2;
      const m = this.spawnHostile(q.members[i]!, { x: first.x + Math.cos(a) * 8, y: first.y + this.rng.range(-2, 3), z: first.z + Math.sin(a) * 8 });
      m.modeT = first.modeT + i * 0.4;
    }
    this.events.push({ type: 'squad', label: q.label });
  }

  /** A hostile of a variant, from the spawn ring or at a given point, as regular traffic. */
  spawnHostile(variant: string, at?: { x: number; y: number; z: number }, elite: EliteId | null = null, extra = false): Alien {
    const v = VARIANTS[variant] ?? VARIANTS.scout!;
    const al = spawnAlien(v.kind, this.ship, this.runTime, this.rng, at, { variant: v.id, elite, hp: pressure(this.runTime, this.mods).enemyHp });
    al.escort = false;
    al.extra = extra;
    if (al.canCloak && at) al.cloak = 1;
    this.aliens.push(al);
    return al;
  }

  private stepAliens(dt: number, t: number, p: Pressure): void {
    const s = this.ship;
    const arena: Arena = { bulwarks: this.field.bulwarks, rocks: this.field.rocks, aliens: this.aliens, bolts: this.bolts };
    const well = this.encounter?.id === 'anomaly' && !this.encounter.done ? this.encounter : null;
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const al = this.aliens[i]!;
      moveAlien(al, s, dt, arena, this.webs, this.rng, this.events);
      if (this.alive) alienFire(al, s, t, this.shots, this.field.bulwarks, this.rng, this.events, p);
      stepBeam(al, s, dt);
      if (well) {
        const [ax, az] = wellPull(well, al.x, al.z, 10);
        al.vx += ax * dt; al.vz += az * dt;
        if (Math.hypot(al.x - well.x, al.z - well.z) < well.r + al.r) this.hurtAlien(al, 20 * dt, 'hazard', al.x, al.y, al.z, true);
      }
      if (al.burn > 0 && this.aliens.includes(al)) {
        al.burn = Math.max(0, al.burn - dt);
        this.hurtAlien(al, al.burnDps * dt, 'plasma', al.x, al.y, al.z, true);
      }
      if (!this.aliens.includes(al)) continue;
      // gone: off the far side of the sky, or away after leaving
      const d = Math.hypot(al.x - s.x, al.z - s.z);
      if (d > CULL || (al.fleeing && al.age > 3 && d > 160)) this.aliens.splice(this.aliens.indexOf(al), 1);
    }
  }

  private stepEncounter(dt: number, t: number): void {
    const e = this.encounter;
    if (e) {
      if (stepEncounter(e, this, dt)) {
        this.run.events++;
        if (e.success) this.run.eventsWon++;
        this.encounter = null;
        this.nextEvent = t + eventGap(this.eventN);
      }
      return;
    }
    // only in open sky: no capital ship about, and not just before one
    if (t < this.nextEvent || this.command.state !== 'idle' || this.command.next - t < 20) return;
    const id = pickEncounter(t, this.lastEvent, this.unlocked, this.rng);
    if (!id) { this.nextEvent = t + 20; return; }
    this.encounter = startEncounter(id, this);
    this.lastEvent = id;
    this.eventN++;
  }

  // ── our systems ───────────────────────────────────────────────────────

  private reachableHulls(): Array<Reachable & { al: Alien | null }> {
    const out: Array<Reachable & { al: Alien | null }> = this.aliens.filter((a) => !cloaked(a)).map((a) => ({ id: a.id, x: a.x, y: a.y, z: a.z, r: a.r, al: a }));
    const b = this.command.targetable();
    if (b && !b.arriving) out.push({ id: b.id, x: b.x, y: b.y, z: b.z, r: b.r * 0.85, al: null });
    return out;
  }

  private reachableRocks(): Array<Reachable & { rock: Rock }> {
    return this.field.rocks.map((r) => ({ id: r.id, x: r.x, y: 0, z: r.z, r: r.r, rock: r }));
  }

  private stepSystems(dt: number, overload: boolean): void {
    const st = this.stats, sys = this.sys;
    // mines
    if (sys.mines.length) {
      const hulls = this.reachableHulls(), rocks = this.reachableRocks();
      for (const m of sys.mines) {
        if (m.fuse > 0 && st.mineGravity) this.gravity(m, dt);
      }
      for (const m of stepMines(sys, st, hulls, rocks, dt)) this.mineBlast(m);
    }
    // plasma and clouds
    stepBurns(sys, dt);
    if (sys.burns.length) {
      for (const al of [...this.aliens]) {
        if (Math.abs(al.y) > 3 || !this.aliens.includes(al)) continue;
        const dps = burnAt(sys, al.x, al.z, al.r);
        if (dps <= 0) continue;
        this.hurtAlien(al, dps * this.dmgMult * dt, 'plasma', al.x, al.y, al.z, true);
        if (st.plasmaBurn > 0) { al.burn = 3; al.burnDps = st.plasmaBurn * this.dmgMult; }
      }
      for (const r of [...this.field.rocks]) {
        const dps = burnAt(sys, r.x, r.z, r.r);
        if (dps > 0) this.damageRock(r, dps * this.dmgMult * dt, 'plasma', r.x, 0, r.z, true);
      }
      const b = this.command.targetable();
      if (b && !b.arriving && Math.abs(b.y) < 4) {
        const dps = burnAt(sys, b.x, b.z, b.r * 0.85);
        if (dps > 0) this.hurtBoss(dps * this.dmgMult * dt, 'plasma', b.x, b.y, b.z, true);
      }
    }
    // the hull arc
    if (st.arc && this.alive) {
      sys.arcT -= dt * (overload ? 2 : 1);
      if (sys.arcT <= 0) {
        const hits = arcTargets(this.ship, st, this.reachableHulls(), this.reachableRocks(), overload);
        if (hits.length) {
          const pts: number[] = [];
          for (const h of hits) {
            pts.push(h.from[0], h.from[1], h.from[2], h.target.x, h.target.y, h.target.z);
            this.hurtReachable(h.target, h.dmg * this.dmgMult, 'arc');
          }
          this.events.push({ type: 'arc', points: pts });
          sys.arcT = st.arcInterval;
        } else sys.arcT = 0.1;
      }
    }
  }

  /** Damage whatever a Reachable stands for: a hull, the boss or a rock. */
  private hurtReachable(t: Reachable & { al?: Alien | null; rock?: Rock }, dmg: number, src: Weapon): void {
    if (t.rock) { if (this.field.rocks.includes(t.rock)) this.damageRock(t.rock, dmg, src, t.x, t.y, t.z); }
    else if (t.al) { if (this.aliens.includes(t.al)) this.hurtAlien(t.al, dmg, src, t.x, t.y, t.z); }
    else this.hurtBoss(dmg, src, t.x, t.y, t.z);
  }

  /** A graviton mine about to go: drag hulls and rock in. */
  private gravity(m: Mine, dt: number): void {
    const r = this.stats.mineBlast * 2.5;
    const pull = (o: { x: number; z: number; vx: number; vz: number }) => {
      const dx = m.x - o.x, dz = m.z - o.z, d = Math.hypot(dx, dz) || 1;
      if (d < r) { o.vx += (dx / d) * GRAVITY_PULL * 3 * dt; o.vz += (dz / d) * GRAVITY_PULL * 3 * dt; }
    };
    for (const al of this.aliens) pull(al);
    for (const rk of this.field.rocks) pull(rk);
  }

  private mineBlast(m: Mine): void {
    const st = this.stats;
    this.blast(m.x, 0.3, m.z, st.mineBlast, st.mineDamage * m.boost * this.dmgMult, 'mine', 'mine');
    if (st.mineChain) {
      chainMines(this.sys, m.x, m.z, st.mineBlast * 1.6);
      this.sys.burns.push({ x: m.x, z: m.z, r: st.mineBlast * 0.6, life: CHAIN_CLOUD, max: CHAIN_CLOUD, dps: 4 * (st.mineDamage / 7), trail: false });
    }
  }

  private torpBlast(tp: Torpedo): void {
    const st = this.stats;
    this.blast(tp.x, tp.y, tp.z, tp.blast, tp.dmg, 'torpedo', tp.small ? 'bomblet' : 'torpedo', st.torpVsShips);
    if (tp.small) return;
    for (let i = 0; i < st.torpCluster; i++) {
      const a = (i / st.torpCluster) * Math.PI * 2 + this.rng.range(-0.3, 0.3);
      const b = launchTorpedo(this.torps, st, tp.x, tp.z, a, 14, null, tp.dmg * 0.35, true);
      b.y = tp.y; b.life = 0.45; b.max = 20; b.blast = tp.blast * 0.45; b.cone = 0;
    }
    if (st.torpPlasma) this.sys.burns.push({ x: tp.x, z: tp.z, r: tp.blast * 0.6, life: 2.5, max: 2.5, dps: st.plasmaDps, trail: false });
    if (st.torpArc > 0) {
      const near = this.reachableHulls()
        .filter((h) => Math.hypot(h.x - tp.x, h.y - tp.y, h.z - tp.z) < 16)
        .sort((a, b) => Math.hypot(a.x - tp.x, a.z - tp.z) - Math.hypot(b.x - tp.x, b.z - tp.z))
        .slice(0, st.torpArc);
      if (near.length) {
        const pts: number[] = [];
        for (const h of near) { pts.push(tp.x, tp.y, tp.z, h.x, h.y, h.z); this.hurtReachable(h, st.arcDamage * 1.2 * this.dmgMult, 'arc'); }
        this.events.push({ type: 'arc', points: pts });
      }
    }
  }

  /** Lightning, shells and webs landing where their circles were drawn. */
  private stepStrikes(dt: number): void {
    const s = this.ship;
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const k = this.strikes[i]!;
      if ((k.t -= dt) > 0) continue;
      this.strikes.splice(i, 1);
      this.events.push({ type: 'strike', x: k.x, z: k.z, r: k.r, kind: k.kind });
      if (k.kind === 'web') {
        this.webs.push({ id: k.id, x: k.x, z: k.z, life: 12 * 0.7, r: 0, max: k.r });
        continue;
      }
      const d = Math.hypot(s.x - k.x, s.z - k.z);
      if (this.alive && d < k.r + SHIP_R) {
        if (s.invuln <= 0 && this.phaseT <= 0) this.hitShip(k.kind === 'lightning' ? 'lightning' : 'artillery', k.x, k.z);
      } else if (this.alive && d < k.r + SHIP_R + GRAZE.strike) this.addCharge(OC_GAIN.strike, s.x, 0.3, s.z);
      if (k.kind === 'lightning') {
        for (const al of [...this.aliens]) if (Math.abs(al.y) < 4 && Math.hypot(al.x - k.x, al.z - k.z) < k.r + al.r) this.hurtAlien(al, 6, 'hazard', al.x, al.y, al.z);
        for (const r of [...this.field.rocks]) if (Math.hypot(r.x - k.x, r.z - k.z) < k.r + r.r) this.damageRock(r, 3, 'hazard', r.x, 0, r.z);
      }
    }
  }

  private stepPickups(dt: number): void {
    const s = this.ship, well = this.encounter?.id === 'anomaly' && !this.encounter.done ? this.encounter : null;
    if (well) {
      for (const pk of this.pickups) { const [ax, az] = wellPull(well, pk.x, pk.z, 6); pk.vx += ax * dt; pk.vz += az * dt; }
      for (const r of this.field.rocks) { const [ax, az] = wellPull(well, r.x, r.z, 4); r.vx += ax * dt; r.vz += az * dt; }
      for (const sh of this.shots) { const [ax, az] = wellPull(well, sh.x, sh.z, 8); sh.vx += ax * dt; sh.vz += az * dt; }
      if (this.alive) {
        const [ax, az] = wellPull(well, s.x, s.z, 7);
        s.vx += ax * dt; s.vz += az * dt;
        if (Math.hypot(s.x - well.x, s.z - well.z) < well.r + SHIP_R && s.invuln <= 0 && this.phaseT <= 0) this.hitShip('anomaly', well.x, well.z);
      }
      for (const r of [...this.field.rocks]) if (Math.hypot(r.x - well.x, r.z - well.z) < well.r + r.r * 0.5) this.damageRock(r, 30 * dt, 'hazard', r.x, 0, r.z, true);
    }
    if (!this.alive) return;
    for (const pk of stepPickups(this.pickups, s, this.stats.tractor, this.powers.magnet > 0, dt)) this.collect(pk);
  }

  private collect(pk: Pickup): void {
    switch (pk.kind) {
      case 'crystal': {
        this.run.dilithium += pk.value;
        this.addScore(pk.value * SCORE_PER_CRYSTAL, 'dilithium');
        this.events.push({ type: 'crystal', x: pk.x, z: pk.z, value: pk.value });
        this.gainXp(pk.value * this.stats.xpMult);
        break;
      }
      case 'repair':
        if (this.repair(1)) this.events.push({ type: 'pickup', x: pk.x, z: pk.z, plates: this.plates });
        else this.addScore(500, 'events');
        break;
      default: {
        const kind = pk.kind as PowerKind;
        this.run.powerups++;
        if (kind === 'charge') this.addCharge(OC_MAX, pk.x, 0.3, pk.z, true);
        else this.powers[kind] = POWER_TIME[kind];
        this.events.push({ type: 'power', x: pk.x, z: pk.z, kind });
      }
    }
  }

  /** Mend `n` plates, up to the hull's maximum. False if there was nothing to mend. */
  repair(n: number): boolean {
    const before = this.plates;
    this.plates = Math.min(this.stats.maxPlates, this.plates + n);
    this.run.platesGained += this.plates - before;
    return this.plates > before;
  }

  dropCrystals(x: number, z: number, total: number, spread = 6, vx = 0, vz = 0): void {
    this.run.dropped += Math.round(total);
    dropCrystals(this.pickups, x, z, total, this.rng, spread, vx, vz);
  }

  dropItem(kind: PickupKind, x: number, z: number): void {
    dropItem(this.pickups, kind, x, z, this.rng);
  }

  randomPower(): PickupKind {
    return POWERS[this.rng.int(POWERS.length)]!;
  }

  addScore(points: number, src: ScoreSource = 'events'): void {
    const p = Math.round(points * this.scoreMult);
    this.score += p;
    this.run.scoreBy[src] += p;
  }

  private gainXp(v: number): void {
    this.xp += v;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.refit++;
      this.run.refit = this.refit;
      this.xpNext = xpFor(this.refit);
      this.pendingRefits++;
      this.events.push({ type: 'levelUp', refit: this.refit });
      if (this.celebrate <= 0) this.celebrate = CELEBRATE;
    }
  }

  // ── the warp core ─────────────────────────────────────────────────────

  private addCharge(amount: number, x: number, y: number, z: number, raw = false): void {
    const before = this.oc;
    let gain = amount;
    if (!raw) {
      gain *= this.stats.ocGain;
      const e = this.encounter;
      if (e && !e.done) gain *= e.id === 'ion_storm' ? 2 : e.id === 'nebula' ? 1.5 : 1;
      this.run.grazes++;
      this.events.push({ type: 'graze', x, y, z, amount: gain });
    }
    this.oc = Math.min(OC_MAX, this.oc + gain);
    if (before < OC_MAX && this.oc >= OC_MAX) this.events.push({ type: 'overchargeReady' });
  }

  /**
   * Near misses: fire that passes close without hitting, rock skimmed at
   * speed, hulls passed close aboard, beams and webs brushed. Each thing
   * counts once (rock and hulls again after a pause).
   */
  private graze(dt: number): void {
    const s = this.ship, st = this.stats, rolling = s.rollT >= 0;
    const k = st.evasion && rolling ? 2 : 1;
    let any = false;
    for (const sh of this.shots) {
      if (sh.grazed) continue;
      const d = Math.hypot(sh.x - s.x, sh.y, sh.z - s.z), touch = sh.r + SHIP_R;
      if (d > touch && d < touch + GRAZE.shot) { sh.grazed = true; this.addCharge(OC_GAIN.shot * k, sh.x, sh.y, sh.z); any = true; }
    }
    const speed = Math.hypot(s.vx, s.vz);
    for (const r of this.field.rocks) {
      if (r.grazeT > 0) continue;
      const rel = Math.hypot(s.vx - r.vx, s.vz - r.vz);
      if (rel < 6) continue;
      const d = Math.hypot(r.x - s.x, r.z - s.z) - r.r * 0.88 - SHIP_R;
      if (d > 0 && d < GRAZE.rock) { r.grazeT = 1.2; this.addCharge(OC_GAIN.rock * k, (r.x + s.x) / 2, 0.2, (r.z + s.z) / 2); any = true; }
    }
    for (const al of this.aliens) {
      if (al.grazeT > 0) continue;
      const d = Math.hypot(al.x - s.x, al.y, al.z - s.z) - al.r - SHIP_R;
      if (d > 0 && d < GRAZE.hull && speed > 4) { al.grazeT = 2; this.addCharge(OC_GAIN.hull * k, al.x, al.y, al.z); any = true; }
    }
    const beams = [...this.aliens.filter((a) => Math.abs(a.y) < 3), ...(this.command.boss?.beams ?? [])];
    for (const bm of beams) {
      if (!beamLive(bm)) continue;
      const d = rayDist(s.x, s.z, bm.x, bm.z, bm.beamAng, BEAM_LEN) - BEAM_W - SHIP_R;
      if (d > 0 && d < GRAZE.beam) { this.oc = Math.min(OC_MAX, this.oc + OC_GAIN.beam * st.ocGain * k * dt); any = true; }
    }
    for (const w of this.webs) {
      const d = Math.hypot(s.x - w.x, s.z - w.z) - w.r * 0.92;
      if (w.r > 1 && d > 0 && d < GRAZE.web) { this.oc = Math.min(OC_MAX, this.oc + OC_GAIN.web * st.ocGain * dt); }
    }
    if (any && st.evasion && rolling) s.rollCooldown = 0;
  }

  /** Release the overcharge: a nova that breaks hulls and clears fire, then the guns run hot. */
  private release(): void {
    if (this.oc < OC_MAX) return;
    const s = this.ship, st = this.stats;
    const R = st.ocRadius, dmg = st.ocDamage * (1 + 0.06 * this.refit) * this.dmgMult;
    let hits = 0;
    for (const al of [...this.aliens]) {
      if (Math.hypot(al.x - s.x, al.y * 0.6, al.z - s.z) < R + al.r) { hits++; this.hurtAlien(al, dmg, 'overcharge', al.x, al.y, al.z); }
    }
    const b = this.command.targetable();
    if (b && !b.arriving && Math.hypot(b.x - s.x, b.z - s.z) < R + b.r) { hits++; this.hurtBoss(dmg * 0.6, 'overcharge', b.x, b.y, b.z); }
    for (const r of [...this.field.rocks]) if (Math.hypot(r.x - s.x, r.z - s.z) < R + r.r) this.damageRock(r, dmg, 'overcharge', r.x, 0, r.z);
    this.shots = this.shots.filter((sh) => Math.hypot(sh.x - s.x, sh.z - s.z) > R * 1.4);
    this.webs = this.webs.filter((w) => Math.hypot(w.x - s.x, w.z - s.z) > R);
    this.overload = st.ocOverload;
    s.invuln = Math.max(s.invuln, 0.5);
    if (st.ocPhase > 0) this.phaseT = st.ocPhase;
    if (st.ocRefill) {
      if (st.torpedoes) this.arms.rack = st.torpRack;
      if (st.mines) mineRing(this.sys, s, st);
    }
    this.oc = 0;
    this.run.overcharges++;
    this.addScore(OVERCHARGE_POINTS + hits * 50, 'overcharge');
    this.events.push({ type: 'overcharge', x: s.x, z: s.z, radius: R, hits });
  }

  // ── collisions ────────────────────────────────────────────────────────

  private collide(): void {
    const rocks = this.field.rocks, bulwarks = this.field.bulwarks, s = this.ship, st = this.stats;
    const inBulwark = (x: number, y: number, z: number, r: number) =>
      bulwarks.find((b) => (x - b.x) ** 2 + y * y + (z - b.z) ** 2 < (b.r * 0.9 + r) ** 2);

    // phaser lances: plasma torpedoes first (they can be shot down), then our own mines (the
    // detonator), hulls, the boss, rock, bulwarks. A piercing lance carries on through.
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]!;
      const hit = (x: number, y: number, z: number, r: number) => (b.x - x) ** 2 + (b.y - y) ** 2 + (b.z - z) ** 2 < (r + 0.3) ** 2;
      let spent = false;
      const land = (id: number) => {
        b.hit.push(id);
        if (b.pierce > 0) b.pierce--;
        else spent = true;
      };
      for (let k = this.shots.length - 1; k >= 0 && !spent; k--) {
        const sh = this.shots[k]!;
        if (sh.hp > 0 && hit(sh.x, sh.y, sh.z, sh.r)) {
          spent = true;
          if (--sh.hp <= 0) { this.shots.splice(k, 1); this.events.push({ type: 'plasmaDown', x: sh.x, y: sh.y, z: sh.z }); }
        }
      }
      if (st.mineDetonate) {
        for (let k = this.sys.mines.length - 1; k >= 0 && !spent; k--) {
          const m = this.sys.mines[k]!;
          if (m.arm <= 0 && hit(m.x, 0.3, m.z, 0.7)) { spent = true; this.sys.mines.splice(k, 1); m.boost = 1.5; this.mineBlast(m); }
        }
      }
      for (const al of [...this.aliens]) {
        if (spent) break;
        if (cloaked(al) || b.hit.includes(al.id) || !hit(al.x, al.y, al.z, al.r)) continue;
        land(al.id);
        if (st.painter) al.mark = 4;
        this.hurtAlien(al, b.dmg, 'phaser', b.x, b.y, b.z);
      }
      const boss = this.command.targetable();
      if (!spent && boss && !b.hit.includes(boss.id) && hit(boss.x, boss.y, boss.z, boss.r * 0.85)) { land(boss.id); this.hurtBoss(b.dmg, 'phaser', b.x, b.y, b.z); }
      for (const r of [...rocks]) {
        if (spent) break;
        if (b.hit.includes(r.id) || !hit(r.x, 0, r.z, r.r)) continue;
        land(r.id);
        this.damageRock(r, b.dmg, 'phaser', b.x, b.y, b.z);
      }
      if (!spent && inBulwark(b.x, b.y, b.z, 0.2)) { spent = true; this.events.push({ type: 'bulwarkHit', x: b.x, y: b.y, z: b.z }); }
      if (spent) this.bolts.splice(i, 1);
    }

    // torpedoes: a proximity fuse on anything in the way
    for (let i = this.torps.length - 1; i >= 0; i--) {
      const tp = this.torps[i]!;
      const near = (x: number, y: number, z: number, r: number) => (tp.x - x) ** 2 + (tp.y - y) ** 2 + (tp.z - z) ** 2 < (r + TORP_FUSE) ** 2;
      const boss = this.command.targetable();
      if (this.aliens.some((a) => !cloaked(a) && near(a.x, a.y, a.z, a.r)) || (boss && !boss.arriving && near(boss.x, boss.y, boss.z, boss.r))
        || rocks.some((r) => near(r.x, 0, r.z, r.r)) || inBulwark(tp.x, tp.y, tp.z, TORP_FUSE)) {
        this.torps.splice(i, 1);
        this.torpBlast(tp);
      }
    }

    // enemy fire stops on a bulwark
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i]!;
      if (inBulwark(sh.x, sh.y, sh.z, sh.r)) { this.shots.splice(i, 1); this.events.push({ type: 'bulwarkHit', x: sh.x, y: sh.y, z: sh.z }); }
    }

    if (!this.alive) return;
    // the ship against a bulwark: it is solid, whatever the grace
    for (const b of bulwarks) {
      const dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz) || 1, min = b.r * 0.88 + SHIP_R;
      if (d >= min) continue;
      const nx = dx / d, nz = dz / d;
      s.x = b.x + nx * min; s.z = b.z + nz * min;
      const vn = s.vx * nx + s.vz * nz;
      if (vn < 0) { s.vx -= 1.5 * vn * nx; s.vz -= 1.5 * vn * nz; }
      if (s.invuln <= 0 && this.phaseT <= 0) return this.hitShip('bulwark');
    }

    const speedFrac = Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(this.hull));
    const ramDmg = st.ramDamage * (st.ramjet ? 0.5 + speedFrac : 0.5 + 0.5 * speedFrac) * this.dmgMult;
    // the phase cloak: nothing touches the ship, and it rams through what it meets
    if (this.phaseT > 0) {
      for (const al of [...this.aliens]) {
        if (al.calm < 0.4 || Math.hypot(s.x - al.x, al.y, s.z - al.z) >= al.r + SHIP_R) continue;
        this.hurtAlien(al, ramDmg * 1.5, 'ram', al.x, al.y, al.z);
      }
      for (const r of [...rocks]) if (Math.hypot(s.x - r.x, s.z - r.z) < r.r * 0.88 + SHIP_R) this.damageRock(r, ramDmg * 1.5, 'ram', r.x, 0, r.z);
      return;
    }

    const rolling = s.rollT >= 0;
    const vulnerable = s.invuln <= 0;
    // ramjet: a roll is a ram that cannot hurt you
    if (!vulnerable && !(st.ramjet && rolling)) return;
    if (vulnerable) {
      // enemy fire
      for (let i = this.shots.length - 1; i >= 0; i--) {
        const sh = this.shots[i]!;
        if ((sh.x - s.x) ** 2 + sh.y ** 2 + (sh.z - s.z) ** 2 < (sh.r + SHIP_R) ** 2) {
          this.shots.splice(i, 1);
          return this.hitShip(sh.hp > 0 ? 'fire:plasma' : sh.from ? `fire:${sh.from}` : 'fire');
        }
      }
      // beams: drones low enough to cut across the plane, and the cube
      const beams = [...this.aliens.filter((a) => Math.abs(a.y) < 3), ...(this.command.boss?.beams ?? [])];
      for (const bm of beams) {
        if (beamLive(bm) && rayDist(s.x, s.z, bm.x, bm.z, bm.beamAng, BEAM_LEN) < BEAM_W + SHIP_R) return this.hitShip('beam');
      }
      // webs
      for (const w of this.webs) if (w.r > 1 && Math.hypot(s.x - w.x, s.z - w.z) < w.r * 0.92) return this.hitShip('web');
    }
    // ramming: hulls and the boss
    for (const al of [...this.aliens]) {
      if (Math.hypot(s.x - al.x, al.y, s.z - al.z) >= al.r + SHIP_R) continue;
      if (al.calm < 0.3 && !vulnerable) continue;
      const killed = this.hurtAlien(al, ramDmg, 'ram', al.x, al.y, al.z);
      if (!vulnerable) continue;
      if (killed && st.ramSafe) { s.invuln = Math.max(s.invuln, 0.25); continue; }
      return this.hitShip(`ram:${al.variant}`, al.x, al.z);
    }
    const boss = this.command.boss;
    if (vulnerable && boss && !boss.leaving && boss.cloak < 0.5 && Math.hypot(s.x - boss.x, boss.y, s.z - boss.z) < boss.r * 0.85 + SHIP_R) {
      this.hurtBoss(ramDmg, 'ram', boss.x, boss.y, boss.z);
      // one ram, not a grind: the charge ends and the two rebound apart
      const dx = boss.x - s.x, dz = boss.z - s.z, d = Math.hypot(dx, dz) || 1;
      boss.chargeT = 0;
      boss.vx = (dx / d) * 14; boss.vz = (dz / d) * 14;
      s.vx -= (dx / d) * 10; s.vz -= (dz / d) * 10;
      return this.hitShip('ram:capital', boss.x, boss.z);
    }
    // rock
    for (const r of [...rocks]) {
      if (Math.hypot(s.x - r.x, s.z - r.z) >= r.r * 0.88 + SHIP_R) continue;
      // a prow breaks small and medium rock; a big rock still wins
      if (st.ramSafe && r.size > 0 && (vulnerable || r.hitT <= 0)) {
        const broke = this.damageRock(r, ramDmg, 'ram', r.x, 0, r.z);
        if (broke) { s.invuln = Math.max(s.invuln, 0.2); continue; }
      }
      if (!vulnerable) continue;
      r.vx -= (s.x - r.x) * 0.5; r.vz -= (s.z - r.z) * 0.5;
      return this.hitShip('rock', r.x, r.z);
    }
  }

  // ── damage ────────────────────────────────────────────────────────────

  private hitShip(source: string, fromX?: number, fromZ?: number): void {
    const s = this.ship, st = this.stats;
    if (!this.alive || this.phaseT > 0) return;
    if (fromX !== undefined && fromZ !== undefined) {
      // knock the two apart, so the hit reads as a collision and not a pass
      const dx = s.x - fromX, dz = s.z - fromZ, d = Math.hypot(dx, dz) || 1;
      s.vx += (dx / d) * 12; s.vz += (dz / d) * 12;
    }
    this.run.damageBy[source] = (this.run.damageBy[source] ?? 0) + 1;
    this.sinceHit = 0;
    // an emergency shield (power-up) first, then the deflectors, then the hull
    if (this.powers.shield > 0 || this.shields > 0) {
      if (this.powers.shield > 0) this.powers.shield = 0;
      else {
        if (this.shields === st.shieldMax) this.shieldT = st.shieldRecharge;
        this.shields--;
      }
      s.invuln = SHIELD_GRACE;
      this.run.shieldsAbsorbed++;
      this.events.push({ type: 'shieldHit', x: s.x, z: s.z, left: this.shields, source });
      if (st.reactive) this.reactive();
      if (st.arcShield) this.arcNova();
      return;
    }
    this.plates--;
    this.run.platesLost++;
    s.invuln = st.grace;
    this.events.push({ type: 'shipHit', x: s.x, z: s.z, plates: this.plates, source });
    if (st.reactive) this.reactive();
    if (this.plates <= 0) {
      if (st.damageControl > 0 && !this.dcUsed) {
        this.dcUsed = true;
        this.plates = 1;
        s.invuln = 2;
        this.events.push({ type: 'damageControl', x: s.x, z: s.z });
        return;
      }
      this.run.cause = source;
      this.breach();
    }
  }

  /** Reactive armour: clear the fire around the ship and knock back what is close. */
  private reactive(): void {
    const s = this.ship;
    this.shots = this.shots.filter((sh) => Math.hypot(sh.x - s.x, sh.z - s.z) > 16);
    this.blast(s.x, 0.3, s.z, 12, 6 * this.dmgMult, 'hazard', 'reactive', 1, false);
  }

  /** The capacitor shield: a shield breaking discharges into every hull near. */
  private arcNova(): void {
    const s = this.ship, pts: number[] = [];
    for (const h of this.reachableHulls()) {
      if (Math.hypot(h.x - s.x, h.y, h.z - s.z) > 14) continue;
      pts.push(s.x, 0.4, s.z, h.x, h.y, h.z);
      this.hurtReachable(h, this.stats.arcDamage * 3 * this.dmgMult, 'arc');
    }
    if (pts.length) this.events.push({ type: 'arc', points: pts });
  }

  /** Returns true if the hull was destroyed. `quiet` skips the hit flash (damage over time). */
  private hurtAlien(al: Alien, dmg: number, src: Weapon, x: number, y: number, z: number, quiet = false): boolean {
    if (!this.aliens.includes(al)) return false;
    // the Borg adapt: past a share of their hull soaked (the original's 6 of 16), half damage
    if (FACTION_TRAITS[al.faction].adapt && al.soaked >= al.maxHp * (BORG_ADAPT / 16)) dmg *= 0.5;
    if (src === 'torpedo' && al.mark > 0) dmg *= this.stats.markBonus;
    al.soaked += dmg;
    al.hp -= dmg;
    al.calm = 0;
    if (al.canCloak) al.cloak = Math.min(al.cloak, 0.3);
    if (!quiet || al.hitT <= 0) {
      al.hitT = 0.1;
      this.events.push({ type: 'alienHit', x, y, z, id: al.id });
    }
    if (al.hp > 0) return false;
    this.killAlien(al, src);
    return true;
  }

  private killAlien(al: Alien, src: Weapon): void {
    this.aliens.splice(this.aliens.indexOf(al), 1);
    const mult = this.chainKill();
    const points = Math.round(alienBonus(al) * mult);
    this.addScore(points, 'kills');
    this.kills++;
    this.run.kills++;
    this.run.killsBy[src]++;
    this.run.killsByKind[al.variant] = (this.run.killsByKind[al.variant] ?? 0) + 1;
    if (al.elite) this.run.elites++;
    this.events.push({
      type: 'alienDestroyed', x: al.x, y: al.y, z: al.z, kind: al.kind, faction: al.faction, points, r: al.r,
      elite: !!al.elite, label: alienLabel(al),
    });
    this.dropCrystals(al.x, al.z, al.xp, 5, al.vx, al.vz);
    const chance = al.elite ? REPAIR_CHANCE_ELITE : REPAIR_CHANCE;
    if (!this.noRepairs && this.repairCd <= 0 && this.plates < this.stats.maxPlates && this.rng.next() < chance) {
      this.dropItem('repair', al.x, al.z);
      this.repairCd = REPAIR_GAP;
    }
    const E = al.elite ? ELITES[al.elite] : null;
    if (E?.blast) this.blast(al.x, al.y, al.z, E.blast, ELITE_BLAST_DAMAGE, 'hazard', 'elite', 1, true);
    if (FACTION_TRAITS[al.faction].web || E?.web) {
      this.webs.push({ id: al.id, x: al.x, z: al.z, life: 6, r: 0, max: WEB_R * (E?.web ? 0.8 : 0.45) });
    }
  }

  private chainKill(): number {
    this.chain++;
    this.chainT = CHAIN_WINDOW;
    if (this.chain > this.run.bestChain) this.run.bestChain = this.chain;
    if (this.chain % 10 === 0) this.events.push({ type: 'chain', count: this.chain, mult: chainMult(this.chain) });
    return chainMult(this.chain);
  }

  private hurtBoss(dmg: number, src: Weapon, x: number, y: number, z: number, quiet = false): void {
    const b = this.command.boss;
    if (!b || b.arriving) return;
    if (!quiet || b.hitT <= 0) this.events.push({ type: 'bossHit', x, y, z });
    if (!this.command.hurt(dmg, this.aliens, this.ship, this.runTime, this.rng, this.events)) return;
    const bounty = this.command.killed(this.runTime);
    this.addScore(bounty, 'capitals');
    this.kills++;
    this.run.capitals++;
    this.run.capitalFactions.push(b.faction);
    this.run.killsBy[src]++;
    this.chainKill();
    this.events.push({ type: 'bossDestroyed', x: b.x, y: b.y, z: b.z, name: b.name, faction: b.faction, points: bounty });
    // the salvage: dilithium, a hull repair, a power-up and a free refit
    this.dropCrystals(b.x, b.z, 26 + 8 * b.n, 12);
    if (!this.noRepairs) for (let i = 0; i < BOSS_PLATES; i++) this.dropItem('repair', b.x, b.z);
    this.dropItem(this.randomPower(), b.x, b.z);
    this.pendingSalvage++;
    if (this.celebrate <= 0) this.celebrate = CELEBRATE * 2;
    // the wing breaks off when its flagship goes
    for (const al of this.aliens) if (al.escort) { al.fleeing = true; al.mode = 'leave'; al.vx = (al.x - b.x) * 2; al.vz = (al.z - b.z) * 2; }
  }

  /** Returns true if the rock broke. */
  private damageRock(r: Rock, amount: number, src: Weapon, x: number, y: number, z: number, quiet = false): boolean {
    if (!this.field.rocks.includes(r)) return false;
    r.hp -= amount;
    if (!quiet || r.hitT <= 0) {
      r.hitT = 0.12;
      this.events.push({ type: 'rockHit', x, y, z, id: r.id });
    }
    if (r.hp <= 0) { this.destroyRock(r, src); return true; }
    return false;
  }

  private destroyRock(r: Rock, src: Weapon): void {
    if (!this.field.rocks.includes(r)) return;
    const K = ROCK_KINDS[r.kind];
    if (this.chain > 0) this.chainT = CHAIN_WINDOW;
    const points = Math.round(ROCK_POINTS[r.size] * K.points * chainMult(this.chain));
    this.addScore(points, 'rocks');
    this.kills++;
    this.run.rocks++;
    this.field.split(r, pressure(this.runTime, this.mods).rockHp);
    this.events.push({ type: 'rockDestroyed', x: r.x, z: r.z, size: r.size, points, kind: r.kind });
    if (this.rng.next() < K.crystal[r.size]!) this.dropCrystals(r.x, r.z, K.crystals[r.size]!, 4, r.vx, r.vz);
    if (r.kind === 'rare') this.dropItem(this.randomPower(), r.x, r.z);
    if (r.kind === 'volatile') this.blast(r.x, 0, r.z, VOLATILE_BLAST, VOLATILE_DAMAGE, src === 'hazard' ? 'hazard' : src, 'volatile', 1, true);
  }

  /**
   * A blast: damage to every hull, the boss and rock inside it. `vsShips`
   * multiplies the damage to hulls; `hurtsShip` lets it catch the player too.
   */
  private blast(x: number, y: number, z: number, radius: number, dmg: number, src: Weapon, kind: BlastKind, vsShips = 1, hurtsShip = false): void {
    this.events.push({ type: 'blast', x, y, z, radius, kind });
    const inside = (ox: number, oy: number, oz: number, r: number) => (ox - x) ** 2 + (oy - y) ** 2 + (oz - z) ** 2 < (radius + r) ** 2;
    for (const r of [...this.field.rocks]) if (inside(r.x, 0, r.z, r.r)) this.damageRock(r, dmg, src, r.x, 0, r.z);
    for (const al of [...this.aliens]) if (inside(al.x, al.y, al.z, al.r)) this.hurtAlien(al, dmg * vsShips, src, al.x, al.y, al.z);
    const boss = this.command.targetable();
    if (boss && !boss.arriving && inside(boss.x, boss.y, boss.z, boss.r)) this.hurtBoss(dmg * vsShips, src, boss.x, boss.y, boss.z);
    const s = this.ship;
    if (hurtsShip && this.alive && s.invuln <= 0 && inside(s.x, 0, s.z, SHIP_R)) this.hitShip(kind === 'volatile' ? 'volatile' : 'blast', x, z);
  }

  // ── the end ───────────────────────────────────────────────────────────

  /** The last plate went: the wreck drifts a moment, then the run report. */
  private breach(): void {
    const s = this.ship;
    this.alive = false;
    this.dying = DYING;
    this.celebrate = 0;
    this.pendingRefits = 0;
    this.pendingSalvage = 0;
    this.best = Math.max(this.best, this.score);
    this.events.push({ type: 'breach', x: s.x, z: s.z, score: this.score });
  }

  private finish(): void {
    const r = this.run;
    r.time = Math.round(this.runTime * 10) / 10;
    r.score = this.score;
    r.refit = this.refit;
    r.build = { ...this.levels };
    r.identity = identity(this.levels).title;
    r.capitalsEscaped = Math.max(0, this.command.count - this.command.kills - (this.command.boss ? 1 : 0));
    r.timeline.push({ t: Math.round(this.runTime), score: this.score, plates: 0, refit: this.refit });
    this.phase = 'over';
  }

  /** A new run where the ship is: same sector, fresh ship. */
  restart(opts: WorldOptions = {}): void {
    useIds(this.ids);
    const s = this.ship;
    if (opts.unlocked) for (const u of opts.unlocked) this.unlocked.add(u);
    if (opts.modifiers) { this.modifiers.length = 0; this.modifiers.push(...opts.modifiers.filter((m) => MODIFIERS[m])); }
    this.applyModifiers();
    this.field.rocks = this.field.rocks.filter((r) => Math.hypot(r.x - s.x, r.z - s.z) >= 18);
    this.field.richBoost = 0;
    this.field.density = 1;
    this.aliens = []; this.shots = []; this.webs = []; this.pickups = []; this.bolts = []; this.torps = [];
    this.tele = []; this.strikes = []; this.sys = newSystems();
    this.command.reset();
    this.encounter = null;
    this.nextAlien = ALIEN_FIRST;
    this.score = 0; this.kills = 0; this.runTime = 0;
    this.levels = {};
    this.stats = this.buildStats();
    this.hull = flightHull(this.stats);
    this.plates = this.stats.maxPlates;
    this.shields = 0; this.shieldT = 0;
    this.arms = newArms(this.stats);
    this.xp = 0; this.refit = 0; this.xpNext = xpFor(0); this.offer = null; this.pendingRefits = 0; this.pendingSalvage = 0; this.celebrate = 0;
    this.oc = 0; this.overload = 0; this.phaseT = 0; this.chain = 0; this.chainT = 0;
    for (const k of POWERS) this.powers[k] = 0;
    this.presented.clear();
    this.dcUsed = false; this.sinceHit = 0; this.repairCd = 0; this.nextRare = RARE_FIRST;
    this.theatre = 'klingon'; this.theatreT = 70; this.nextEvent = EVENT_FIRST; this.eventN = 0; this.lastEvent = null;
    this.timeScore = 0; this.nextSample = 0;
    this.alive = true; this.dying = 0;
    s.vx = s.vz = 0;
    s.invuln = BREACH_GRACE;
    this.run = newRun(this.seed, this.modifiers);
    this.phase = 'play';
  }
}

/** Distance in metres, for copy. */
export const metres = (u: number) => Math.round(u / PX);
