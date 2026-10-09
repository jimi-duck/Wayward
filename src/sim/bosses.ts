import { angleDelta, clamp } from '../core/math';
import { BOSS_FIRST, EVADE_GAP, bossGap, bossHp, pressure } from './director';
import { BEAM_FIRE, BEAM_WIND, newId, spawnAlien, stepBeam, type Alien, type AlienKind, type Faction, type Shot, type Web } from './enemies';
import type { GameEvent } from './events';
import type { Rng } from './rng';
import type { ShipState } from './ship';

// ── capital ships ─────────────────────────────────────────────────────────
// The original's BOSS_TYPES: each faction sends its own flagship, unlocked on
// the run clock, never the same faction twice running. The first contact is
// always the Gutter or the Custody: the foundry and the Thren come later,
// when a build has had time to answer them. A contact is
// announced (a contact warning), then hails: the player chooses to engage or to
// evade (see Command.engage / evade). Office ships never hail; they decloak and
// the fight starts. A Voice foundry cannot be outrun, and nobody can evade twice
// running.
//
// An engaged capital ship drops in from far out and high above, descends to
// hold station near you, and fights in three phases (at two thirds and one
// third of its hull): each phase adds its faction's signature attack, calls
// in reinforcements and runs the cycle faster. Every attack winds up first
// behind a telegraph (a line where a charge or volley will go, a ring where
// a nova will burst, circles where shells or webs will land), so a fight is
// read, not guessed. Each faction moves its own way: Gutter crews sway and
// charge, Custody cutters hold long range and wheel, Office ships vanish and
// reappear on your flank, the foundry grinds closer, the Thren circle.
//
// It leaves when its fuse runs out (the fuse burns only on station). A kill
// pays the bounty; the world adds the salvage.

export const BOSS_WARN = 2.6;
/** Seconds after the warning that the hail opens. */
const HAIL_AFTER = 1.1;
/** Seconds from "engage" to the drop. */
const ENGAGE_DROP = 1.2;
const BOSS_R = 6;
/** A sighted capital ship's detection range by faction: the Voice's foundry sees furthest. */
export const DETECT_R: Record<Faction, number> = { gutter: 85, custody: 100, office: 90, voice: 115, thren: 95 };
/** Seconds inside the range for it to notice you, seconds outside for it to lose the thread. */
const DETECT_TIME = 3.2, DETECT_FADE = 2.4;
/** Inside half the range it notices twice as fast. */
const DETECT_CLOSE = 0.5;
/** How long a sighted ship loiters before it jumps, and how long the jump takes. */
const STAY = 48, JUMP_TIME = 2.6;
/** Where a sighted ship appears, from the ship's bow (clear of every detection range). */
const SIGHT_AT = 190, SIGHT_ARC = 0.6, SIGHT_Y = 28;
/** A ship that has noticed you and is being run from burns its fuse at this rate while you are beyond 3.5 times its station: it hunts longer. */
export const CHASE_BURN = 0.6, CHASE_FAR = 3.5;
/** After an unbroken evasion the next one is sharper-eyed: range and speed of noticing. */
export const WARY_R = 1.15, WARY_T = 0.8;
/** What staying clear pays when it jumps out: a share of its bounty in score, and a little Krail. */
export const JUMP_SCORE = 0.25, JUMP_KRAIL = 8;
/** Where a capital ship drops in: ahead of the ship, far out and high. */
const ARRIVE_AT = 150, ARRIVE_Y = 28;
export const bossBounty = (n: number, f: Faction) => Math.round((1800 + n * 700) * FACTIONS[f].bounty / 10) * 10;
export { BOSS_FIRST, bossGap };
/** The hull of a faction's first capital ship in a run, against the usual. */
export const INTRO_HP = 0.7;

export type Attack =
  | 'ring' | 'volley' | 'charge' | 'spiral' | 'cloak' | 'salvo' | 'beams' | 'tractor' | 'cage' | 'shards'
  | 'strafe' | 'artillery' | 'flank' | 'launch' | 'webline';

interface FactionDef {
  at: number; hull: AlienKind; names: string[]; hp: number; fuse: number; bounty: number;
  /** The attack cycle in each of the three phases. */
  cycles: [Attack[], Attack[], Attack[]];
  /** Where it holds, how far from you. */
  station: number;
  wing: AlienKind; wingN: number; wingHp: number;
}

export const FACTIONS: Record<Faction, FactionDef> = {
  gutter: {
    at: 0, hull: 'raptor', names: ['Ironmaw', 'Red Tithe', 'Butcher’s Due', 'Last Mercy'], hp: 1.2, fuse: 60, bounty: 1,
    cycles: [['volley', 'ring', 'charge'], ['volley', 'strafe', 'charge', 'ring'], ['strafe', 'charge', 'volley', 'charge', 'ring']],
    station: 36, wing: 'scout', wingN: 3, wingHp: 0.85,
  },
  custody: {
    at: 90, hull: 'lancer', names: ['CCV Diligence', 'CCV Vigilance', 'CCV Patience', 'CCV Temperance'], hp: 0.8, fuse: 62, bounty: 1,
    cycles: [['spiral', 'volley', 'ring'], ['spiral', 'artillery', 'volley', 'ring'], ['artillery', 'spiral', 'artillery', 'ring']],
    station: 46, wing: 'lancer', wingN: 3, wingHp: 0.85,
  },
  office: {
    at: 120, hull: 'warbird', names: ['Quiet Hand', 'Kind Regard', 'Gentle Inquiry', 'Silent Witness'], hp: 0.85, fuse: 62, bounty: 1.1,
    cycles: [['cloak', 'salvo', 'volley'], ['flank', 'salvo', 'volley'], ['flank', 'salvo', 'ring', 'flank', 'salvo']],
    station: 38, wing: 'warbird', wingN: 2, wingHp: 0.85,
  },
  voice: {
    at: 400, hull: 'drone', names: ['Foundry Seven', 'Mother Lathe', 'Foundry Thirty', 'The Hesse Choir'], hp: 1.15, fuse: 72, bounty: 1.3,
    cycles: [['beams', 'tractor', 'ring'], ['beams', 'launch', 'tractor', 'ring'], ['beams', 'tractor', 'launch', 'beams', 'ring']],
    station: 34, wing: 'drone', wingN: 4, wingHp: 0.3,
  },
  thren: {
    at: 340, hull: 'weaver', names: ['Thren Lattice', 'Thren Bloom', 'Thren Hollow', 'Thren Knot'], hp: 1, fuse: 62, bounty: 1.1,
    cycles: [['cage', 'shards', 'ring'], ['webline', 'shards', 'cage', 'ring'], ['cage', 'webline', 'shards', 'ring']],
    station: 32, wing: 'weaver', wingN: 3, wingHp: 1,
  },
};
const ORDER: Faction[] = ['gutter', 'custody', 'office', 'voice', 'thren'];

/** How long each attack winds up behind its telegraph, seconds. */
const WINDUP: Partial<Record<Attack, number>> = {
  ring: 0.9, volley: 0.6, charge: 1.0, spiral: 0.7, salvo: 0.8, cage: 1.1, shards: 0.5, strafe: 0.8, artillery: 1.3,
  flank: 0.5, launch: 0.8, webline: 1.1, cloak: 0.3, beams: 0.1, tractor: 0.1,
};

/** A warning drawn on the plane: where an attack is about to go. Visual only. */
export interface Telegraph {
  id: number;
  kind: 'line' | 'ring';
  x: number; z: number;
  /** line: angle and length; ring: radius. */
  ang: number; len: number; r: number;
  /** Seconds left, and the total it started with. */
  t: number; total: number;
  faction: Faction;
}

/** A delayed area hazard: shells, lightning or a web, landing where its circle was drawn. */
export interface Strike {
  id: number;
  kind: 'blast' | 'web' | 'lightning';
  x: number; z: number; r: number;
  t: number; total: number;
  faction: Faction | null;
}

export interface Boss {
  id: number; faction: Faction; name: string; n: number;
  x: number; y: number; z: number; vx: number; vy: number; vz: number; face: number;
  /** Still coming in: no attacks, and the fuse does not burn. */
  arriving: boolean;
  hp: number; maxHp: number; r: number;
  /** 0, 1 or 2: past two thirds, past one third. */
  phase: number;
  attack: Attack; attackT: number; cycleI: number; shotT: number; spin: number;
  /** Seconds of wind-up left before the current attack opens (its telegraph is up). */
  windT: number;
  /** Where a charge or a volley was aimed when it was telegraphed. */
  aimLock: number;
  fuse: number; leaving: boolean; cloak: number; hitT: number; soaked: number;
  /** two beams for the Voice; the charge vector for the Gutter */
  beams: Array<{ x: number; z: number; beamT: number; beamAng: number }>;
  chargeT: number;
  /** Seconds on station, and the station angle around the ship for the circling factions. */
  fightT: number; orbit: number;
  /** Seconds since it began its drop. */
  arriveT: number;
  /** Sighted but not yet aware of you (Arcade): it drifts, holds fire and jumps out when `stay` runs out. */
  unaware: boolean;
  /** 0 to 1: how close it is to noticing you. Builds inside its detection range, fades outside. */
  aware: number;
  /** Seconds before an unaware ship jumps away. */
  stay: number;
  /** Seconds into the jump out. */
  jumpT: number;
  /** How far out an unaware ship sees you. */
  sense: number;
}

export interface Contact {
  faction: Faction;
  name: string;
  n: number;
  bounty: number;
  /** Office ships never hail (and never sit sighted: they decloak). */
  hails: boolean;
  canEvade: boolean;
  /** Seconds until the next contact if this one is evaded. */
  evadeGap: number;
}

export type CommandState = 'idle' | 'warning' | 'hailing' | 'sighted' | 'inbound' | 'fight';

export class Command {
  boss: Boss | null = null;
  next = BOSS_FIRST;
  count = 0;
  kills = 0;
  evades = 0;
  state: CommandState = 'idle';
  pending: Contact | null = null;
  evadedLast = false;
  /** Contacts come by themselves on the run clock. Off in the Breakout, where the one capital ship is summoned. */
  auto = true;
  private forced: Faction | null = null;
  /** Hull multiplier for the next summoned contact (the Breakout's blockade is no introduction). */
  private forcedHp = 1;
  private forcedHails = true;
  private forcedName: string | null = null;
  /** Extra hulls in the summoned contact's wing (a named captain who learned to bring more). */
  private forcedWing = 0;
  private wingExtra = 0;
  private hpScale = 1;
  private last: Faction | null = null;
  private seen: Partial<Record<Faction, number>> = {};

  reset(): void {
    this.boss = null; this.next = BOSS_FIRST; this.count = 0; this.kills = 0; this.evades = 0;
    this.last = null; this.state = 'idle'; this.seen = {}; this.pending = null; this.evadedLast = false; this.forced = null;
    if (!this.auto) this.next = Infinity;
  }

  /** Call a contact of this faction now (the Breakout's blockade). It can always be evaded. `hails` false: the decision was made on a comms card, and she simply comes. */
  summon(t: number, faction: Faction, hp = 1, hails = true, name: string | null = null, wing = 0): void {
    if (this.state !== 'idle') return;
    this.forced = faction;
    this.forcedWing = wing;
    this.forcedName = name;
    this.forcedHp = hp;
    this.forcedHails = hails;
    this.next = t + BOSS_WARN;
  }

  /** True while the hail is open and waiting for the player. */
  get hailing(): boolean {
    return this.state === 'hailing';
  }

  /** The player chose to fight: the ship drops in shortly. */
  engage(t: number): void {
    if (this.state !== 'hailing') return;
    this.state = 'inbound';
    this.next = t + ENGAGE_DROP;
  }

  /** The player chose to break away: no fight, and the next contact comes sooner. */
  evade(t: number, events: GameEvent[]): boolean {
    const c = this.pending;
    if (this.state !== 'hailing' || !c || !c.canEvade) return false;
    events.push({ type: 'bossEvaded', name: c.name, faction: c.faction });
    this.pending = null;
    this.state = 'idle';
    this.evadedLast = true;
    this.evades++;
    this.next = this.auto ? t + c.evadeGap : Infinity;
    return true;
  }

  /** Warnings, hails, arrivals, the fight itself, and departures. */
  step(t: number, dt: number, s: ShipState, aliens: Alien[], shots: Shot[], webs: Web[], tele: Telegraph[], strikes: Strike[], rng: Rng, events: GameEvent[]): void {
    switch (this.state) {
      case 'idle':
        if (t >= this.next - BOSS_WARN) {
          this.pending = this.pick(t, rng);
          if (this.auto && this.pending.hails) { this.sight(t, s, rng, events); return; }
          this.state = 'warning';
          events.push({ type: 'bossWarn', name: this.pending.name, faction: this.pending.faction, hails: this.pending.hails });
        }
        return;
      case 'warning':
        if (this.pending!.hails && t >= this.next - BOSS_WARN + HAIL_AFTER) {
          this.state = 'hailing';
          events.push({ type: 'hail', name: this.pending!.name, faction: this.pending!.faction });
        } else if (!this.pending!.hails && t >= this.next) this.arrive(t, s, aliens, rng, events);
        return;
      case 'hailing':
        return;
      case 'sighted':
        if (this.boss) this.watch(this.boss, t, dt, s, aliens, rng, events);
        return;
      case 'inbound':
        if (t >= this.next) this.arrive(t, s, aliens, rng, events);
        return;
      case 'fight':
        if (this.boss) this.fight(this.boss, t, dt, s, aliens, shots, webs, tele, strikes, rng, events);
        return;
    }
  }

  /** The boss took damage. Returns true if it broke up. */
  hurt(dmg: number, aliens: Alien[], s: ShipState, t: number, rng: Rng, events: GameEvent[]): boolean {
    const b = this.boss;
    if (b && b.unaware && b.jumpT === 0) { this.notice(b, t, s, aliens, rng, events); return false; }
    if (!b || b.leaving || b.cloak > 0.5 || b.arriving || b.unaware) return false;
    // the foundry adapts, as its drones do: once it has soaked enough, half damage
    if (b.faction === 'voice' && b.soaked >= 30) dmg *= 0.5;
    b.soaked += dmg;
    b.hp -= dmg;
    b.hitT = 0.1;
    const phase = b.hp <= b.maxHp / 3 ? 2 : b.hp <= (b.maxHp * 2) / 3 ? 1 : 0;
    if (phase > b.phase && b.hp > 0) {
      b.phase = phase;
      b.cycleI = -1;
      b.attackT = 0.6;
      b.windT = 0;
      events.push({ type: 'bossPhase', name: b.name, faction: b.faction, phase, x: b.x, y: b.y, z: b.z });
      // reinforcements: the wing again, smaller
      const def = FACTIONS[b.faction];
      const n = Math.max(1, Math.round(def.wingN / 2));
      for (let i = 0; i < n; i++) {
        const a = rng.range(0, Math.PI * 2);
        const e = spawnAlien(def.wing, s, t, rng, { x: b.x + Math.cos(a) * 10, y: b.y + 3, z: b.z + Math.sin(a) * 10 });
        e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * def.wingHp));
        aliens.push(e);
      }
    }
    return b.hp <= 0;
  }

  /** Kill bookkeeping; the world pays the bounty and the salvage. */
  killed(t: number): number {
    const b = this.boss!;
    const bounty = bossBounty(b.n, b.faction);
    this.kills++;
    this.end(t);
    return bounty;
  }

  targetable(): Boss | null {
    const b = this.boss;
    return b && !b.leaving && b.cloak < 0.5 ? b : null;
  }

  private pick(t: number, rng: Rng): Contact {
    if (this.forced) {
      const f = this.forced, def = FACTIONS[f];
      this.forced = null;
      this.hpScale = this.forcedHp;
      this.forcedHp = 1;
      this.wingExtra = this.forcedWing;
      this.forcedWing = 0;
      const name = this.forcedName ?? def.names[(this.seen[f] ?? 0) % def.names.length]!;
      this.forcedName = null;
      return { faction: f, name, n: this.count, bounty: bossBounty(this.count, f), hails: this.forcedHails, canEvade: true, evadeGap: 0 };
    }
    // the first contact of a run is never the Office ambush (the original's rule)
    let pool = ORDER.filter((f) => FACTIONS[f].at <= t && f !== this.last && !(this.count === 0 && f === 'office'));
    if (!pool.length) pool = ['gutter'];
    const f = pool[rng.int(pool.length)]!;
    const k = this.seen[f] ?? 0;
    const def = FACTIONS[f];
    const base = def.names[k % def.names.length]!, mk = Math.floor(k / def.names.length);
    return {
      faction: f, name: mk ? `${base} MK${mk + 1}` : base, n: this.count, bounty: bossBounty(this.count, f),
      hails: f !== 'office', canEvade: f !== 'voice' && !this.evadedLast, evadeGap: Math.round(bossGap(this.count) * EVADE_GAP),
    };
  }

  private build(faction: Faction, name: string, hp: number, x: number, y: number, z: number, face: number, arriving: boolean): Boss {
    const def = FACTIONS[faction];
    return {
      id: newId(), faction, name, n: this.count, x, y, z, vx: 0, vy: 0, vz: 0, face, arriving,
      hp, maxHp: hp, r: BOSS_R, phase: 0, attack: def.cycles[0][0]!, attackT: 4, cycleI: 0, shotT: 0, spin: 0, windT: 0, aimLock: 0,
      fuse: def.fuse, leaving: false, cloak: 0, hitT: 0, soaked: 0, beams: [], chargeT: 0, fightT: 0, orbit: 0, arriveT: 0,
      unaware: false, aware: 0, stay: 0, jumpT: 0, sense: 0,
    };
  }

  /** The escort wing comes in with her, together. */
  private callWing(b: Boss, s: ShipState, t: number, aliens: Alien[], rng: Rng): void {
    const def = FACTIONS[b.faction];
    const wingN = def.wingN + this.wingExtra;
    this.wingExtra = 0;
    for (let i = 0; i < wingN; i++) {
      const a = (i / wingN) * Math.PI * 2;
      const e = spawnAlien(def.wing, s, t, rng, { x: b.x + Math.cos(a) * 12, y: b.y - 4, z: b.z + Math.sin(a) * 12 });
      e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * def.wingHp));
      aliens.push(e);
    }
  }

  private hullPoints(faction: Faction, t: number): number {
    // a faction's first capital ship of a run is an introduction: its patterns are new, so it is lighter
    const intro = (this.seen[faction] ?? 0) === 0 ? INTRO_HP : 1;
    const hp = Math.round(bossHp(this.count, t) * FACTIONS[faction].hp * this.hpScale * intro);
    this.hpScale = 1;
    return hp;
  }

  private arrive(t: number, s: ShipState, aliens: Alien[], rng: Rng, events: GameEvent[]): void {
    const { faction, name } = this.pending!;
    // far out in front of the ship and high, so the chase camera sees it come in
    const x = s.x + Math.cos(s.heading) * ARRIVE_AT, z = s.z - Math.sin(s.heading) * ARRIVE_AT, y = ARRIVE_Y;
    this.boss = this.build(faction, name, this.hullPoints(faction, t), x, y, z, s.heading + Math.PI, true);
    this.seen[faction] = (this.seen[faction] ?? 0) + 1;
    this.last = faction;
    this.count++;
    this.pending = null;
    this.state = 'fight';
    this.callWing(this.boss, s, t, aliens, rng);
    events.push({ type: 'bossArrive', name, faction, x, z });
  }

  /** Arcade: a capital ship appears ahead, out of range and unaware. Keep clear of it until it jumps. */
  private sight(t: number, s: ShipState, rng: Rng, events: GameEvent[]): void {
    const { faction, name } = this.pending!;
    const a = s.heading + rng.range(-SIGHT_ARC, SIGHT_ARC);
    const x = s.x + Math.cos(a) * SIGHT_AT, z = s.z - Math.sin(a) * SIGHT_AT;
    const b = this.build(faction, name, this.hullPoints(faction, t), x, SIGHT_Y, z, rng.range(0, Math.PI * 2), false);
    b.unaware = true;
    b.stay = STAY;
    b.sense = this.detectRange(b);
    // it idles across the sector, slowly, never straight at you
    const heading = Math.atan2(-(s.z - z), s.x - x) + (rng.next() < 0.5 ? 1 : -1) * rng.range(0.9, 1.6);
    b.vx = Math.cos(heading) * 2.5; b.vz = -Math.sin(heading) * 2.5;
    b.face = Math.atan2(-b.vz, b.vx);
    this.boss = b;
    this.seen[faction] = (this.seen[faction] ?? 0) + 1;
    this.last = faction;
    this.count++;
    this.state = 'sighted';
    events.push({ type: 'bossSighted', name, faction, x, z, r: this.detectRange(b) });
  }

  /** How far out it sees you. An evasion in a row makes the next ship warier. */
  detectRange(b: Boss): number {
    return DETECT_R[b.faction] * (this.evadedLast ? WARY_R : 1);
  }

  /** The player goes in at a sighted ship (the scripted pilot's way of choosing the fight). */
  provoke(t: number, s: ShipState, aliens: Alien[], rng: Rng, events: GameEvent[]): void {
    const b = this.boss;
    if (this.state === 'sighted' && b && b.unaware && b.jumpT === 0) this.notice(b, t, s, aliens, rng, events);
  }

  /** Sighted: it drifts, you are measured, and it jumps out when its time is up. */
  private watch(b: Boss, t: number, dt: number, s: ShipState, aliens: Alien[], rng: Rng, events: GameEvent[]): void {
    if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
    if (b.jumpT > 0) {
      // the jump: it turns its bow out, winds up and is gone
      b.jumpT += dt;
      b.vx *= 1 + 1.4 * dt; b.vz *= 1 + 1.4 * dt;
      b.vy = 6 * (b.jumpT / JUMP_TIME);
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.jumpT >= JUMP_TIME) {
        events.push({ type: 'bossJumped', name: b.name, faction: b.faction, bounty: bossBounty(b.n, b.faction) });
        this.pending = null;
        this.boss = null;
        this.state = 'idle';
        this.evadedLast = true;
        this.evades++;
        this.next = t + Math.round(bossGap(this.count) * EVADE_GAP);
      }
      return;
    }
    b.x += b.vx * dt; b.z += b.vz * dt;
    b.y += (SIGHT_Y - b.y) * Math.min(1, dt);
    const d = Math.hypot(s.x - b.x, s.z - b.z), r = b.sense;
    if (d < r) {
      const rate = (d < r * DETECT_CLOSE ? 2 : 1) / (DETECT_TIME * (this.evadedLast ? WARY_T : 1));
      b.aware = Math.min(1, b.aware + rate * dt);
    } else b.aware = Math.max(0, b.aware - dt / DETECT_FADE);
    if (b.aware >= 1) { this.notice(b, t, s, aliens, rng, events); return; }
    if ((b.stay -= dt) <= 0) b.jumpT = 0.001;
  }

  /** It has seen you (or been shot): down onto station, with her wing, and she hunts whoever runs from her for longer. */
  private notice(b: Boss, t: number, s: ShipState, aliens: Alien[], rng: Rng, events: GameEvent[]): void {
    b.unaware = false;
    b.arriving = true;
    b.arriveT = 0;
    b.aware = 1;
    this.pending = null;
    this.state = 'fight';
    this.callWing(b, s, t, aliens, rng);
    events.push({ type: 'bossArrive', name: b.name, faction: b.faction, x: b.x, z: b.z });
  }

  private end(t: number): void {
    this.boss = null;
    this.state = 'idle';
    this.evadedLast = false;
    this.next = this.auto ? t + bossGap(this.count) : Infinity;
  }

  /** Where it wants to be: its faction's way of holding station around the ship. */
  private station(b: Boss, s: ShipState, dt: number): [number, number] {
    const def = FACTIONS[b.faction];
    const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), rx = Math.sin(s.heading), rz = Math.cos(s.heading);
    switch (b.faction) {
      case 'gutter': {
        // ahead, swaying across your bow
        const sway = Math.sin(b.fightT * 0.55) * 16;
        return [s.x + fx * def.station + rx * sway, s.z + fz * def.station + rz * sway];
      }
      case 'custody': {
        // long range, wheeling slowly round you
        const a = s.heading + Math.sin(b.fightT * 0.22) * 0.9;
        return [s.x + Math.cos(a) * def.station, s.z - Math.sin(a) * def.station];
      }
      case 'voice': {
        // grinds in: the station closes as the fight goes on, and it comes at you, not ahead of you
        const dx = b.x - s.x, dz = b.z - s.z, d = Math.hypot(dx, dz) || 1, near = Math.max(18, def.station - b.fightT * 0.35);
        return [s.x + (dx / d) * near, s.z + (dz / d) * near];
      }
      case 'thren': {
        // circles you
        b.orbit += dt * (b.phase === 2 ? 0.5 : 0.34);
        const a = s.heading + b.orbit;
        return [s.x + Math.cos(a) * def.station, s.z - Math.sin(a) * def.station];
      }
      default:
        return [s.x + fx * def.station, s.z + fz * def.station];
    }
  }

  private fight(b: Boss, t: number, dt: number, s: ShipState, aliens: Alien[], shots: Shot[], webs: Web[], tele: Telegraph[], strikes: Strike[], rng: Rng, events: GameEvent[]): void {
    if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
    const dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz) || 1;
    const aim = Math.atan2(-dz, dx);
    const [hx, hz] = this.station(b, s, dt);

    if (b.arriving) {
      // descend onto station: a long, heavy approach, done on a clock so a ship running from it cannot keep it out of the fight
      b.arriveT += dt;
      const gx = hx - b.x, gz = hz - b.z, g = Math.hypot(gx, gz) || 1;
      const sp = Math.min(26 + b.arriveT * 4, g * 0.8 + 6);
      b.vx += ((gx / g) * sp - b.vx) * Math.min(1, 1.5 * dt);
      b.vz += ((gz / g) * sp - b.vz) * Math.min(1, 1.5 * dt);
      b.vy = -b.y * 0.9;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.face += clamp(angleDelta(b.face, aim), -0.8 * dt, 0.8 * dt);
      if (b.y < 2 && (g < 12 || b.arriveT > 7)) { b.arriving = false; b.attackT = 2; }
      return;
    }

    b.fightT += dt;
    b.fuse -= dt * (d > FACTIONS[b.faction].station * CHASE_FAR ? CHASE_BURN : 1);
    if (b.fuse <= 0 && !b.leaving) {
      b.leaving = true;
      b.beams = [];
      events.push({ type: 'bossLeft', name: b.name });
    }
    if (b.leaving) {
      b.vx += (-dx / d) * 30 * dt; b.vz += (-dz / d) * 30 * dt;
      b.vy = Math.min(14, b.vy + 8 * dt);
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (d > 160) this.end(t);
      return;
    }

    // hold station, sliding to keep it
    b.y += -b.y * Math.min(1, 2 * dt);
    if ((b.attack === 'charge' || b.attack === 'strafe') && b.chargeT > 0) {
      b.chargeT -= dt;
    } else {
      const gx = hx - b.x, gz = hz - b.z;
      b.vx += gx * 1.6 * dt; b.vz += gz * 1.6 * dt;
      // when the station swings across (you turned), go round you, not through you: only a charge rams
      const clear = 18;
      if (d < clear) {
        const push = (1 - d / clear) * 90 * dt;
        b.vx -= (dx / d) * push; b.vz -= (dz / d) * push;
      }
      const k = Math.pow(0.93, dt * 60);
      b.vx *= k; b.vz *= k;
    }
    b.x += b.vx * dt; b.z += b.vz * dt;
    if (b.attack === 'strafe' && b.chargeT > 0) b.face += clamp(angleDelta(b.face, Math.atan2(-b.vz, b.vx) + Math.PI / 2), -2 * dt, 2 * dt);
    else b.face += clamp(angleDelta(b.face, aim), -1.5 * dt, 1.5 * dt);
    if (b.cloak > 0 && b.windT <= 0) b.cloak = Math.max(0, b.cloak - dt * 0.7);

    // the attack cycle: each phase its own list, and quicker as it goes
    const rage = b.phase;
    // the first capital ships of a run shoot slower fire
    const sp = pressure(t).shotSpeed * (b.n === 0 ? 0.8 : b.n === 1 ? 0.9 : 1);
    const fire = (a: number, speed = sp, extra: Partial<Shot> = {}) => shots.push({
      id: newId(), x: b.x, y: b.y, z: b.z, vx: Math.cos(a) * speed, vy: 0, vz: -Math.sin(a) * speed, life: 3.6, r: 0.55,
      faction: b.faction, hp: 0, seek: 0, split: 0, from: `capital:${b.attack}`, ...extra,
    });

    if (b.windT > 0) {
      b.windT -= dt;
      if (b.windT <= 0) this.open(b, s, aim, d, t, aliens, shots, webs, strikes, rng, events);
      return;
    }
    b.attackT -= dt;
    if (b.attackT <= 0) {
      const cycle = FACTIONS[b.faction].cycles[b.phase]!;
      b.cycleI = (b.cycleI + 1) % cycle.length;
      b.attack = cycle[b.cycleI]!;
      b.attackT = [3.4, 3, 2.5][rage]! + (b.n === 0 ? 0.6 : 0);
      b.shotT = 0;
      b.beams = [];
      if (b.attack === 'volley') b.spin = 0;
      b.windT = (WINDUP[b.attack] ?? 0.6) * (rage === 2 ? 0.8 : 1);
      b.aimLock = aim;
      this.telegraph(b, s, aim, d, tele, strikes, rng);
      return;
    }
    b.shotT -= dt;
    switch (b.attack) {
      case 'volley':
        // down the lines it telegraphed: step off them and it misses. Only the last phase tracks, slowly.
        if (rage === 2) b.aimLock += clamp(angleDelta(b.aimLock, aim), -0.3 * dt, 0.3 * dt);
        if (b.shotT <= 0 && b.spin < 6) { b.shotT = [0.36, 0.3, 0.26][rage]!; b.spin++; for (const o of [-0.18, 0, 0.18]) fire(b.aimLock + o); }
        break;
      case 'spiral':
        if (b.shotT <= 0) {
          b.shotT = [0.13, 0.11, 0.095][rage]!; b.spin += 0.5;
          fire(b.spin, sp * 0.75); fire(b.spin + Math.PI, sp * 0.75);
          if (rage === 2) fire(b.spin + Math.PI / 2, sp * 0.75);
        }
        break;
      case 'shards':
        if (b.shotT <= 0) { b.shotT = [0.7, 0.6, 0.48][rage]!; fire(aim, sp * 0.8, { split: 0.6, r: 0.5 }); }
        break;
      case 'strafe':
        // a broadside pass across your bow
        if (b.chargeT > 0 && b.shotT <= 0) { b.shotT = 0.16; fire(aim + rng.range(-0.08, 0.08), sp * 1.05); }
        break;
      case 'beams':
      case 'tractor':
        for (const bm of b.beams) {
          bm.x = b.x; bm.z = b.z;
          // aims while it winds up, sweeps slowly once it cuts
          stepBeam(bm, s, dt, 0.85 + rage * 0.12);
        }
        if (b.attack === 'tractor' && d < 56) {
          // the tractor lock: thrust away from the foundry to break it
          s.vx += (-dx / d) * 16 * dt;
          s.vz += (-dz / d) * 16 * dt;
        }
        break;
    }
  }

  /** Put up the warning for the attack about to open. */
  private telegraph(b: Boss, s: ShipState, aim: number, d: number, tele: Telegraph[], strikes: Strike[], rng: Rng): void {
    const t = b.windT;
    const line = (ang: number, len: number) => tele.push({ id: newId(), kind: 'line', x: b.x, z: b.z, ang, len, r: 0, t, total: t, faction: b.faction });
    const ring = (r: number) => tele.push({ id: newId(), kind: 'ring', x: b.x, z: b.z, ang: 0, len: 0, r, t, total: t, faction: b.faction });
    switch (b.attack) {
      case 'charge': line(aim, d + 16); break;
      case 'volley': for (const o of [-0.18, 0, 0.18]) line(aim + o, 60); break;
      case 'salvo': for (const o of [-0.5, 0, 0.5]) line(aim + o, 40); break;
      case 'ring': ring(24); break;
      case 'spiral': ring(10); break;
      case 'strafe': {
        // a pass across your bow, side to side
        const side = rng.next() < 0.5 ? 1 : -1, a = aim + (Math.PI / 2) * side;
        b.aimLock = a;
        line(a, 50);
        break;
      }
      case 'artillery': {
        // shells on where you are and where you are going
        const n = 4 + b.phase;
        for (let i = 0; i < n; i++) {
          const lead = i === 0 ? 0 : rng.range(0.5, 1.6);
          const x = s.x + s.vx * lead + (i ? rng.range(-9, 9) : 0), z = s.z + s.vz * lead + (i ? rng.range(-9, 9) : 0);
          strikes.push({ id: newId(), kind: 'blast', x, z, r: 4.2, t: t + 0.25, total: t + 0.25, faction: b.faction });
        }
        break;
      }
      case 'cage': {
        const n = 4 + b.phase, rr = b.phase === 2 ? 11 : 13;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
          strikes.push({ id: newId(), kind: 'web', x: s.x + Math.cos(a) * rr, z: s.z + Math.sin(a) * rr, r: 8.6 * 0.7, t, total: t, faction: b.faction });
        }
        break;
      }
      case 'webline': {
        // a wall of web across your path
        const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), rx = Math.sin(s.heading), rz = Math.cos(s.heading);
        const ahead = 18 + Math.hypot(s.vx, s.vz) * 0.6, gap = rng.int(5) - 2;
        for (let i = -3; i <= 3; i++) {
          if (i === gap) continue;
          strikes.push({ id: newId(), kind: 'web', x: s.x + fx * ahead + rx * i * 6, z: s.z + fz * ahead + rz * i * 6, r: 4, t, total: t, faction: b.faction });
        }
        break;
      }
      case 'flank': case 'cloak': b.cloak = 1; break;
      case 'launch': ring(9); break;
    }
  }

  /** The moment an attack begins, once its telegraph has run out. */
  private open(b: Boss, s: ShipState, aim: number, d: number, t: number, aliens: Alien[], shots: Shot[], _webs: Web[], _strikes: Strike[], rng: Rng, events: GameEvent[]): void {
    const sp = pressure(t).shotSpeed;
    const fire = (a: number, speed = sp, extra: Partial<Shot> = {}) => shots.push({
      id: newId(), x: b.x, y: b.y, z: b.z, vx: Math.cos(a) * speed, vy: 0, vz: -Math.sin(a) * speed, life: 3.6, r: 0.55,
      faction: b.faction, hp: 0, seek: 0, split: 0, from: `capital:${b.attack}`, ...extra,
    });
    switch (b.attack) {
      case 'ring': {
        const n = 20 + b.phase * 4;
        for (let i = 0; i < n; i++) fire(aim + (i / n) * Math.PI * 2, sp * 0.7);
        if (b.phase === 2) for (let i = 0; i < n; i++) fire(aim + ((i + 0.5) / n) * Math.PI * 2, sp * 0.5);
        break;
      }
      case 'charge':
        // a ramming run along the telegraphed line
        b.chargeT = 0.9;
        b.vx = Math.cos(b.aimLock) * 44;
        b.vz = -Math.sin(b.aimLock) * 44;
        events.push({ type: 'bossCharge', x: b.x, z: b.z });
        break;
      case 'strafe':
        b.chargeT = 1.3;
        b.vx = Math.cos(b.aimLock) * 30;
        b.vz = -Math.sin(b.aimLock) * 30;
        break;
      case 'cloak':
        b.cloak = 1;
        break;
      case 'flank': {
        // gone, and back on your quarter
        const side = rng.next() < 0.5 ? 1 : -1, a = s.heading + Math.PI * 0.75 * side, r = 30;
        b.x = s.x + Math.cos(a) * r; b.z = s.z - Math.sin(a) * r; b.vx = b.vz = 0;
        b.face = Math.atan2(-(s.z - b.z), s.x - b.x);
        b.cloak = 0.9;
        events.push({ type: 'bossFlank', x: b.x, z: b.z });
        break;
      }
      case 'salvo':
        for (const o of [-0.5, 0, 0.5]) fire(aim + o, 2.2 * 6, { life: 8, r: 0.8, hp: 3, seek: 1.05 });
        if (b.phase === 2) for (const o of [-1, 1]) fire(aim + o, 2.2 * 6, { life: 8, r: 0.8, hp: 3, seek: 1.05 });
        break;
      case 'beams': {
        const n = b.phase === 2 ? 4 : 2;
        for (let i = 0; i < n; i++) b.beams.push({ x: b.x, z: b.z, beamT: BEAM_WIND + BEAM_FIRE, beamAng: aim + (i - (n - 1) / 2) * 0.7 });
        break;
      }
      case 'tractor':
        b.beams.push({ x: b.x, z: b.z, beamT: BEAM_WIND + BEAM_FIRE, beamAng: aim });
        if (d < 56) events.push({ type: 'tractor' });
        break;
      case 'launch': {
        // the foundry opens and sends drones out
        for (let i = 0; i < 2; i++) {
          const a = aim + (i ? 1 : -1) * 0.8;
          const e = spawnAlien('drone', s, t, rng, { x: b.x + Math.cos(a) * 7, y: 1, z: b.z - Math.sin(a) * 7 });
          e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * 0.45));
          aliens.push(e);
        }
        break;
      }
      case 'cage': case 'webline': case 'artillery':
        // the strikes were laid with the telegraph and land on their own clock
        if (b.attack !== 'artillery') events.push({ type: 'webSet', x: s.x, z: s.z });
        break;
    }
  }
}
