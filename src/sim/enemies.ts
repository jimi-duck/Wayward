import { t } from '../i18n';
import { angleDelta, clamp } from '../core/math';
import { pressure, type Pressure } from './director';
import type { GameEvent } from './events';
import { newId } from './ids';
import type { Bulwark, Rock } from './field';
import type { Rng } from './rng';
import type { ShipState } from './ship';
import { HZ, PX } from './tuning';
import { PACING, type Approach } from './pacing';

// ── the enemy roster ──────────────────────────────────────────────────────
// The original's seven hulls and five factions, rebuilt for a 3D sky. The
// player still steers on the plane; enemies do not. They arrive far out and
// high, close to their engagement range, then fight by role:
//
//   interceptors · fast, light, evasive. They fly attack runs: swing out
//                  high to one side, dive on the plane at where you will be,
//                  fire as they pass, climb out and come round again. They
//                  jink (a barrel roll up or down and across) when a laser
//                  lance is about to hit them.
//     scout      · Gutter skiff. Strafing runs, a pot shot on each.
//     raptor     · Gutter ram-ship. Lines up on the plane, then commits to a run
//                  straight through you, guns blazing, and climbs away.
//     stalker    · Gutter hunter. Sits on your tail and leads its shots.
//   cruisers     · slow, heavy, armoured. They hold range and use the
//                  bulwarks as cover: tuck in behind one, slide out to fire
//                  a broadside, then back in. With no cover, they hold range
//                  and slide.
//     lancer     · Custody cutter. Fans of three, broadside on.
//     warbird    · Office. Long range; a plasma torpedo that follows you and
//                  that your lasers can shoot down.
//     drone      · Voice foundry. Grinds straight at you on the plane and cuts
//                  with a tracking beam; adapts (half damage) once it has
//                  soaked enough.
//   special
//     weaver     · Thren. Flies to a point, spins a web, leaves.
//     freighter  · a convoy hull for the sector events: crosses, never fires.
//
// Before any of that, in the arcade, a hull has an approach (sim/pacing.ts):
// how it closes. 'direct' flies straight to its fighting range; 'flank'
// comes round to your beam or quarter first; 'intercept' heads for where you
// will be; 'investigate' holds off beyond gun range and looks you over
// ('watch'), then commits or moves on; 'circle' orbits at that distance a
// while first; 'patrol' flies its own beat across the sector and only turns
// on you if you come close or shoot it. None of them fires before it
// commits.
//
// A hull is three things layered: its archetype (above: how it flies and
// fights), its faction (FACTION_TRAITS: what every hull of that faction
// does: Gutter crews press harder, Custody cutters reach further, Offices of Peace ships cloak,
// Voice hulls adapt, the Thren leave their webs behind), and, later in a run,
// an elite modifier (ELITES). VARIANTS pairs archetypes with factions for
// the spawner, so a new enemy is usually one row there, not new code.
//
// Everything is deterministic: every random draw comes from the world's rng.

export type Faction = 'gutter' | 'custody' | 'office' | 'voice' | 'thren';
export type AlienKind = 'scout' | 'raptor' | 'lancer' | 'warbird' | 'stalker' | 'drone' | 'weaver' | 'freighter';
export type Role = 'interceptor' | 'cruiser' | 'special';
type Tactic = 'dogfight' | 'ram' | 'hunt' | 'broadside' | 'snipe' | 'grind' | 'anchor' | 'cross';
type Fire = 'fan' | 'burst' | 'plasma' | 'lead' | 'beam' | 'none';
export type Mode =
  | 'approach' | 'setup' | 'run' | 'extend' | 'line' | 'hold' | 'cover' | 'peek' | 'seek' | 'spin' | 'leave' | 'cross'
  | 'patrol' | 'watch' | 'brawl' | 'drift';

/**
 * A hull that is not here to fight (sim/stage.ts): traffic, visitors, the unknown. It moves on a script
 * of its own and fires at nobody; what turns it on the ship is its temper, never a timer.
 *
 *   meek        never turns on you; runs if shot
 *   wary        turns on you only if shot
 *   territorial turns on you if you come inside its guard ring (after a warning), or shoot
 *   drawn       comes to the Cyrite you carry, close but never at you; turns only if shot
 *   hostile     an ordinary hostile: the ward ends and it commits
 */
export type Temper = 'meek' | 'wary' | 'territorial' | 'drawn' | 'hostile';
/** What it does while it is a ward: crosses the sector, circles the ship, sits where it is, trails the ship, leads the ship on. */
export type WardAct = 'pass' | 'orbit' | 'hold' | 'follow' | 'lead' | 'patrol';

export interface Ward {
  act: WardAct;
  temper: Temper;
  /** Where it holds, circles about or heads for (`hold`, `pass`): the scene's centre, or a point far off. */
  hx: number; hz: number;
  /** Its guard ring (territorial) and the standoff it keeps (orbit, follow). */
  ring: number;
  /** A warning has been given, and when (seconds into the sortie); the actor's name in the scene. */
  warned: number;
  tag: string;
}

const V = PX * HZ; // the original's px/frame → units/second

export interface AlienType {
  /** What the HUD calls it. */
  label: string;
  role: Role;
  tactic: Tactic;
  fire: Fire;
  r: number;
  hp: number;
  /** Cruise and attack-run speeds, units/s, and how hard it can change velocity, units/s². */
  speed: number;
  dash: number;
  accel: number;
  bonus: number;
  /** Krail it drops when destroyed. */
  xp: number;
  /** Cooldown multiplier and shots per volley. */
  cd: number;
  shots: number;
  faction: Faction;
  /** Seconds before it gives up and leaves; 0 for never. */
  ttl: number;
  /** Chance it jinks out of the way of a lance it sees coming. */
  evade: number;
  /** The distance it fights at. */
  range: number;
}

export const ALIEN_TYPES: Record<AlienKind, AlienType> = {
  scout:     { label: 'Interceptor',    role: 'interceptor', tactic: 'dogfight',  fire: 'fan',    r: 1.5, hp: 2,  speed: 24, dash: 40, accel: 40, bonus: 150, xp: 3,  cd: 1,    shots: 1, faction: 'gutter',    ttl: 0,  evade: 0.6,  range: 50 },
  raptor:    { label: 'Strike fighter', role: 'interceptor', tactic: 'ram',       fire: 'burst',  r: 1.7, hp: 4,  speed: 20, dash: 50, accel: 34, bonus: 300, xp: 4,  cd: 1,    shots: 2, faction: 'gutter',    ttl: 0,  evade: 0.35, range: 40 },
  lancer:    { label: 'Heavy cruiser',  role: 'cruiser',     tactic: 'broadside', fire: 'fan',    r: 2.8, hp: 9,  speed: 9,  dash: 14, accel: 8,  bonus: 420, xp: 7,  cd: 1.55, shots: 3, faction: 'custody', ttl: 50, evade: 0.15, range: 46 },
  warbird:   { label: 'Plasma cruiser', role: 'cruiser',     tactic: 'snipe',     fire: 'plasma', r: 2.8, hp: 9,  speed: 11, dash: 16, accel: 9,  bonus: 480, xp: 7,  cd: 2.3,  shots: 1, faction: 'office',    ttl: 34, evade: 0.2,  range: 56 },
  stalker:   { label: 'Hunter',         role: 'interceptor', tactic: 'hunt',      fire: 'lead',   r: 1.6, hp: 4,  speed: 22, dash: 36, accel: 42, bonus: 340, xp: 5,  cd: 1.3,  shots: 1, faction: 'gutter',    ttl: 26, evade: 0.45, range: 40 },
  drone:     { label: 'Grinder',    role: 'cruiser',     tactic: 'grind',     fire: 'beam',   r: 2.4, hp: 16, speed: 6,  dash: 9,  accel: 5,  bonus: 560, xp: 9,  cd: 1,    shots: 0, faction: 'voice',       ttl: 0,  evade: 0,    range: 44 },
  weaver:    { label: 'Web layer',      role: 'special',     tactic: 'anchor',    fire: 'none',   r: 1.5, hp: 3,  speed: 18, dash: 28, accel: 30, bonus: 380, xp: 5,  cd: 1,    shots: 0, faction: 'thren',    ttl: 0,  evade: 0.4,  range: 30 },
  freighter: { label: 'Freighter',      role: 'special',     tactic: 'cross',     fire: 'none',   r: 3.4, hp: 26, speed: 7,  dash: 9,  accel: 4,  bonus: 600, xp: 16, cd: 1,    shots: 0, faction: 'custody', ttl: 46, evade: 0,    range: 0 },
};
export const ALIEN_ORDER = Object.keys(ALIEN_TYPES) as AlienKind[];

// ── factions ──────────────────────────────────────────────────────────────

export interface FactionTraits {
  /** Multipliers on speed, fire cooldown and fighting range. */
  speed: number;
  fireCd: number;
  range: number;
  /** Hides while it repositions; decloaks to attack. */
  cloak: boolean;
  /** Takes half damage once it has soaked enough. */
  adapt: boolean;
  /** Leaves a small web where it dies. */
  web: boolean;
}

export const FACTION_TRAITS: Record<Faction, FactionTraits> = {
  gutter:    { speed: 1.08, fireCd: 0.9, range: 1,    cloak: false, adapt: false, web: false },
  custody: { speed: 1,    fireCd: 1,   range: 1.12, cloak: false, adapt: false, web: false },
  office:    { speed: 1,    fireCd: 1,   range: 1,    cloak: true,  adapt: false, web: false },
  voice:       { speed: 0.95, fireCd: 1,   range: 1,    cloak: false, adapt: true,  web: false },
  thren:    { speed: 1,    fireCd: 1,   range: 1,    cloak: false, adapt: false, web: true },
};

// ── variants: what the spawner can send ───────────────────────────────────

export interface Variant {
  id: string;
  kind: AlienKind;
  faction: Faction;
  label: string;
  /** Unlocked at this many seconds into a run. */
  at: number;
  weight: number;
  /** Most of this variant at once (escorts aside). */
  cap: number;
  /** Shots per volley, if not the archetype's. */
  shots?: number;
  /** Its fire splits in three after a beat (Thren shards). */
  split?: boolean;
}

export const VARIANTS: Record<string, Variant> = {
  scout:    { id: 'scout',    kind: 'scout',   faction: 'gutter',    label: 'Interceptor',    at: 0,   weight: 3, cap: 4 },
  raptor:   { id: 'raptor',   kind: 'raptor',  faction: 'gutter',    label: 'Strike fighter', at: 75,  weight: 2, cap: 2 },
  lancer:   { id: 'lancer',   kind: 'lancer',  faction: 'custody', label: 'Heavy cruiser',  at: 110,  weight: 2, cap: 2 },
  warbird:  { id: 'warbird',  kind: 'warbird', faction: 'office',    label: 'Plasma cruiser', at: 150, weight: 2, cap: 2 },
  stalker:  { id: 'stalker',  kind: 'stalker', faction: 'gutter',    label: 'Hunter',         at: 180, weight: 2, cap: 2 },
  drone:    { id: 'drone',    kind: 'drone',   faction: 'voice',       label: 'Grinder',    at: 250, weight: 2, cap: 2 },
  weaver:   { id: 'weaver',   kind: 'weaver',  faction: 'thren',    label: 'Web layer',      at: 290, weight: 2, cap: 1 },
  picket:   { id: 'picket',   kind: 'scout',   faction: 'custody', label: 'Patrol fighter', at: 200, weight: 2, cap: 3, shots: 2 },
  whisper: { id: 'whisper', kind: 'scout',   faction: 'office',    label: 'Ambush fighter', at: 270, weight: 2, cap: 3 },
  probe:    { id: 'probe',    kind: 'stalker', faction: 'voice',       label: 'Voice probe',     at: 330, weight: 1.5, cap: 2 },
  shard:    { id: 'shard',    kind: 'lancer',  faction: 'thren',    label: 'Shard cruiser',  at: 370, weight: 1.5, cap: 1, split: true },
  // Thren swarms on the chart (sim/scatter.ts): motes come in knots, drawn by the Cyrite aboard
  mote:     { id: 'mote',     kind: 'scout',   faction: 'thren',    label: 'Thren mote',     at: Infinity, weight: 0, cap: 8 },
  // the Breakout's pursuers: Custody hulls that come only after the stolen hauler
  enforcer: { id: 'enforcer', kind: 'raptor',  faction: 'custody',     label: 'Enforcer',       at: Infinity, weight: 0, cap: 2 },
  interdictor: { id: 'interdictor', kind: 'stalker', faction: 'custody', label: 'Interdictor', at: Infinity, weight: 0, cap: 2 },
  freighter: { id: 'freighter', kind: 'freighter', faction: 'custody', label: 'Freighter', at: Infinity, weight: 0, cap: 0 },
  // the first system past Cerro's working traffic (sim/traffic.ts): nobody's enemy until the ship makes them one
  hauler:   { id: 'hauler',   kind: 'freighter', faction: 'custody', label: 'Ore hauler',    at: Infinity, weight: 0, cap: 0 },
  barge:    { id: 'barge',    kind: 'freighter', faction: 'gutter',  label: 'Mining barge',  at: Infinity, weight: 0, cap: 0 },
  liner:    { id: 'liner',    kind: 'freighter', faction: 'office',  label: 'Freight liner', at: Infinity, weight: 0, cap: 0 },
};
export const VARIANT_ORDER = Object.keys(VARIANTS);

/** Squads: hulls that arrive together because together they are worse. Members are variant ids, leader first. */
export interface Squad { id: string; label: string; at: number; members: string[]; }
export const SQUADS: Squad[] = [
  { id: 'raid',    label: 'Raiding party',   at: 240, members: ['raptor', 'scout', 'scout'] },
  { id: 'battery', label: 'Gun line',        at: 290, members: ['lancer', 'picket', 'picket'] },
  { id: 'snare',   label: 'Web and hammer',  at: 340, members: ['weaver', 'raptor', 'raptor'] },
  { id: 'hunt',    label: 'Hunting pack',    at: 370, members: ['warbird', 'stalker', 'stalker'] },
  { id: 'ambush',  label: 'Ambush',          at: 400, members: ['whisper', 'whisper', 'warbird'] },
  { id: 'foundry',    label: 'Voice detachment', at: 460, members: ['drone', 'probe', 'probe'] },
];

// ── elites ────────────────────────────────────────────────────────────────
// Later in a run a familiar hull can turn up with a modifier, which changes
// how you have to deal with it more than how long it takes to kill.

export type EliteId = 'armoured' | 'swift' | 'volatile' | 'gunner' | 'cloaked' | 'regenerative' | 'spinner';

export interface EliteDef {
  label: string;
  hp?: number;
  speed?: number;
  fireCd?: number;
  shotSpeed?: number;
  extraShots?: number;
  cloak?: boolean;
  /** Hull points per second, as a share of its maximum, after two quiet seconds. */
  regen?: number;
  /** Explodes when destroyed: radius, damage (to everything, you included). */
  blast?: number;
  web?: boolean;
  /** Only on these archetypes, if given. */
  only?: AlienKind[];
}

export const ELITES: Record<EliteId, EliteDef> = {
  armoured:     { label: 'Armoured', hp: 2.3 },
  swift:        { label: 'Swift', speed: 1.35 },
  volatile:     { label: 'Volatile', blast: 7 },
  gunner:       { label: 'Gunner', fireCd: 0.65, shotSpeed: 1.15, extraShots: 1 },
  cloaked:      { label: 'Cloaked', cloak: true },
  regenerative: { label: 'Regenerative', regen: 0.08, hp: 1.3 },
  spinner:      { label: 'Web-spinner', web: true, only: ['weaver', 'lancer', 'drone', 'raptor'] },
};
export const ELITE_ORDER = Object.keys(ELITES) as EliteId[];
export const ELITE_BLAST_DAMAGE = 5;

export const ALIEN_FIRST = 40;
/** Kept for the HUD and tests: the regular ceiling at time t. */
export const alienMax = (t: number) => pressure(t).enemyCap;

/** Where new hulls appear: this far out, mostly ahead, where the chase camera can see them come in. */
export const SPAWN_NEAR = 120;
export const SPAWN_FAR = 150;
/** Hulls this far from the ship are gone. */
export const CULL = 210;
/** How far an enemy will shoot from. */
export const FIRE_RANGE = 70;

// Voice adaptation, plasma, beams and webs: the original's numbers.
export const BORG_ADAPT = 6;
const PLASMA_SPEED = 2.2 * V, PLASMA_TURN = 1.05, PLASMA_HP = 3;
export const BEAM_WIND = 1.05, BEAM_FIRE = 1.35, BEAM_LEN = 540 * PX, BEAM_W = 0.7;
/** Beams aim while they wind up, then sweep slowly once they cut: the wind-up is the tell, and a sidestep beats the cut. */
const BEAM_TRACK = 0.85, BEAM_SWEEP = 0.32;
export const WEB_R = 86 * PX, WEB_LIFE = 12, WEB_GROW = 0.55;
const WEB_SPIN = 1.5;
/** Seconds a jink's barrel roll takes. */
export const JINK_ROLL = 0.6;
/** Attack runs an interceptor flies before it breaks off and leaves the sky to the next wave. */
const RUNS = 4;
/**
 * Every hull fights on the ship's plane, give or take a hand's breadth of
 * hover, so what you see is where it is: it can be shot, it can be hidden
 * behind rock, and rock stands in its way as it does in yours. (It used to
 * cruise high and drop in, which hid it and let it clear every rock.)
 */
export const PLANE = { light: 1.1, cruiser: 0.6 } as const;
/** How fast a cloak comes and goes, per second. */
const CLOAK_RATE = 1.4;

export interface Alien {
  id: number; kind: AlienKind; variant: string; faction: Faction; elite: EliteId | null;
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  /** Heading (yaw), as the ship's. Bank is for the renderer: it leans into turns. */
  face: number; bank: number;
  /** Seconds into a jink's barrel roll, or -1, and which way it rolls. */
  roll: number; rollDir: 1 | -1;
  hp: number; maxHp: number; r: number; age: number; nextShot: number;
  mode: Mode; modeT: number; ttl: number; fleeing: boolean; slide: 1 | -1;
  /** A goal point: the weaver's anchor; the freighter's heading. */
  ax: number; az: number;
  /** The altitude it cruises in at. */
  cruiseY: number;
  /** Seconds before it can jink again. */
  jink: number;
  /** Attack runs flown; interceptors break off after RUNS of them. */
  runs: number;
  /** beam: seconds left (wind then fire) and its angle */
  beamT: number; beamAng: number;
  /** damage soaked (Voice adaptation) */
  soaked: number;
  hitT: number;
  /** part of a capital ship's escort wing */
  escort: boolean;
  /** sent by a sector event: outside the director's ceiling */
  extra: boolean;
  /** Multipliers set at spawn from faction and elite: speed, fire cooldown, range, shot speed. */
  spK: number; cdK: number; rgK: number; shotK: number;
  shots: number; split: boolean;
  /** 0 (seen) to 1 (cloaked). Above 0.5 it cannot be targeted or hit. */
  cloak: number; canCloak: boolean;
  /** Plasma afterburn: seconds left and damage per second. */
  burn: number; burnDps: number;
  /** Seconds left on a target painter's mark, and on a snare (Thren tech). */
  mark: number;
  snare: number;
  /** Seconds since it last took damage (regeneration waits for quiet). */
  calm: number;
  /** Seconds before it can be hurt by rock again. */
  bumpT: number;
  xp: number;
  /** How it closes on the ship before it fights (sim/pacing.ts). */
  approach: Approach;
  /** Not a fighter, for now (see Ward). */
  ward?: Ward;
  /** Part of a mission (sim/mission.ts): kept however far off it is. */
  job?: boolean;
}

export interface Shot {
  id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  life: number; r: number; faction: Faction;
  /** plasma: shootable, and steers after the ship */
  hp: number; seek: number;
  /** shards: seconds until it splits in three */
  split: number;
  /** Who fired it (a variant id, or 'capital'), for the damage report. */
  from?: string;
}

export interface Web { id: number; x: number; z: number; life: number; r: number; max?: number; age?: number; }

/** A laser lance, as far as an enemy watching it is concerned. */
export interface Incoming { x: number; y: number; z: number; vx: number; vy: number; vz: number; }

/** What an enemy can see around it. */
export interface Arena {
  bulwarks: readonly Bulwark[];
  rocks: readonly Rock[];
  aliens: readonly Alien[];
  bolts: readonly Incoming[];
  /** Multiplier on how far off a patrol or watcher notices the ship (Stats.notice). */
  notice?: number;
}

export { newId };

/** Is this hull hidden from targeting and fire? */
export const cloaked = (al: { cloak: number }) => al.cloak > 0.5;

/**
 * Choose the next variant to send: unlocked by the clock, under its cap, by
 * weight, favouring the current theatre's faction by `theatre`.
 */
export function pickVariant(t: number, aliens: readonly Alien[], rng: Rng, theatre: Faction | null = null, bias = 1): Variant | null {
  const pool: Variant[] = [];
  const w: number[] = [];
  let total = 0;
  for (const id of VARIANT_ORDER) {
    const v = VARIANTS[id]!;
    if (v.at > t || v.weight <= 0) continue;
    if (aliens.filter((a) => a.variant === id && !a.escort && !a.extra).length >= v.cap) continue;
    const wt = v.weight * (theatre && v.faction === theatre ? bias : 1);
    pool.push(v); w.push(wt); total += wt;
  }
  let roll = rng.next() * total;
  for (let i = 0; i < pool.length; i++) { roll -= w[i]!; if (roll <= 0) return pool[i]!; }
  return pool[pool.length - 1] ?? null;
}

/** The archetype-only picker, as before variants: kept for callers that want a kind. */
export function pickKind(t: number, aliens: readonly Alien[], rng: Rng): AlienKind | null {
  return pickVariant(t, aliens, rng)?.kind ?? null;
}

/** An elite modifier that suits this archetype. */
export function pickElite(kind: AlienKind, faction: Faction, rng: Rng): EliteId {
  const pool = ELITE_ORDER.filter((e) => {
    const d = ELITES[e];
    if (d.only && !d.only.includes(kind)) return false;
    if (e === 'cloaked' && FACTION_TRAITS[faction].cloak) return false;
    if (e === 'swift' && kind === 'drone') return false;
    return true;
  });
  return pool[rng.int(pool.length)]!;
}

export interface SpawnOptions {
  variant?: string;
  elite?: EliteId | null;
  /** Hull multiplier from the director. */
  hp?: number;
  /** How it closes (the arcade's encounters); straight in unless given. */
  approach?: Approach;
}

/**
 * A new hull, far out. Most come in ahead of the ship, a quarter from
 * anywhere. `at` places it instead (an escort, a wingman, a squad member).
 */
export function spawnAlien(kind: AlienKind, ship: ShipState, t: number, rng: Rng, at?: { x: number; y: number; z: number }, o: SpawnOptions = {}): Alien {
  const T = ALIEN_TYPES[kind];
  const v = (o.variant && VARIANTS[o.variant]) || VARIANTS[kind]!;
  const faction = v.kind === kind ? v.faction : T.faction;
  const F = FACTION_TRAITS[faction];
  const E = o.elite ? ELITES[o.elite] : null;
  const a = ship.heading + (rng.next() < 0.75 ? rng.range(-0.9, 0.9) : rng.range(0, Math.PI * 2));
  const d = rng.range(SPAWN_NEAR, SPAWN_FAR);
  const cruiseY = rng.range(-PLANE[T.role === 'cruiser' ? 'cruiser' : 'light'], PLANE[T.role === 'cruiser' ? 'cruiser' : 'light']);
  const x = at ? at.x : ship.x + Math.cos(a) * d;
  const z = at ? at.z : ship.z - Math.sin(a) * d;
  const y = at ? at.y : cruiseY;
  const hp = Math.max(1, Math.round(T.hp * (o.hp ?? pressure(t).enemyHp) * (E?.hp ?? 1)));
  const cdK = F.fireCd * (E?.fireCd ?? 1);
  const canCloak = F.cloak || !!E?.cloak;
  return {
    id: newId(), kind, variant: v.kind === kind ? v.id : kind, faction, elite: o.elite ?? null,
    x, y, z, vx: 0, vy: 0, vz: 0, face: Math.atan2(-(ship.z - z), ship.x - x), bank: 0, roll: -1, rollDir: 1,
    hp, maxHp: hp, r: T.r * (E ? 1.12 : 1), age: 0, nextShot: t + pressure(t).fireCd * T.cd * cdK * rng.range(0.6, 1.2),
    mode: T.tactic === 'cross' ? 'cross' : 'approach', modeT: 16, ttl: T.ttl, fleeing: false, slide: rng.next() < 0.5 ? 1 : -1,
    ax: 0, az: 0, cruiseY: at ? at.y : cruiseY, jink: 0, runs: 0, beamT: 0, beamAng: 0, soaked: 0, hitT: 0, escort: !!at, extra: false,
    spK: F.speed * (E?.speed ?? 1), cdK, rgK: F.range, shotK: E?.shotSpeed ?? 1,
    shots: (v.kind === kind ? v.shots : undefined) ?? T.shots + (E?.extraShots ?? 0), split: !!(v.kind === kind && v.split),
    cloak: canCloak && !at ? 1 : 0, canCloak, burn: 0, burnDps: 0, mark: 0, snare: 0, calm: 99, bumpT: 0,
    xp: Math.round(T.xp * (E ? 2 : 1)), approach: T.tactic === 'cross' ? 'direct' : o.approach ?? 'direct',
  };
}

/** Points a kill is worth: elites pay double. */
export const alienBonus = (al: Alien) => ALIEN_TYPES[al.kind].bonus * (al.elite ? 2 : 1);
/** What the HUD calls a hull. */
export const alienLabel = (al: Alien) => {
  const name = t(VARIANTS[al.variant]?.label ?? ALIEN_TYPES[al.kind].label);
  return al.elite ? t('{elite} {name}', { elite: t(ELITES[al.elite].label), name }) : name;
};

// ── steering ──────────────────────────────────────────────────────────────

/** Change velocity toward (wx, wy, wz), no faster than `accel` allows. */
function accelerate(al: Alien, wx: number, wy: number, wz: number, accel: number, dt: number): void {
  let ax = wx - al.vx, ay = wy - al.vy, az = wz - al.vz;
  const m = Math.hypot(ax, ay, az), lim = accel * dt;
  if (m > lim) { const k = lim / m; ax *= k; ay *= k; az *= k; }
  al.vx += ax; al.vy += ay; al.vz += az;
}

/**
 * Head for a point at `speed`, easing off in time to stop on it: inside
 * `arrive` units, or the hull's own braking distance if that is longer (a
 * heavy cruiser starts braking a long way out). An `arrive` near 0 flies
 * through at full speed.
 */
function steer(al: Alien, gx: number, gy: number, gz: number, speed: number, accel: number, dt: number, arrive = 6): void {
  const dx = gx - al.x, dy = gy - al.y, dz = gz - al.z, d = Math.hypot(dx, dy, dz) || 1;
  const brake = arrive < 1 ? arrive : Math.max(arrive, (speed * speed) / (2 * accel));
  const want = speed * Math.min(1, d / brake);
  accelerate(al, (dx / d) * want, (dy / d) * want, (dz / d) * want, accel, dt);
}

/** Keep clear of bulwarks, rock and each other. Bulwarks are solid: a hull is never inside one. */
function avoid(al: Alien, arena: Arena, dt: number): void {
  for (const b of arena.bulwarks) {
    const dx = al.x - b.x, dy = al.y, dz = al.z - b.z, d = Math.hypot(dx, dy, dz) || 1;
    const clear = b.r * 0.95 + al.r + 2.5;
    if (d > clear + 10) continue;
    const nx = dx / d, ny = dy / d, nz = dz / d;
    // cancel the part of the velocity that heads into it, more the closer it is,
    // so a hull slides round a bulwark and can still hold station beside one
    const vn = al.vx * nx + al.vy * ny + al.vz * nz;
    if (vn < 0) {
      const k = Math.min(1, ((clear + 10 - d) / 10) * 8 * dt);
      al.vx -= vn * nx * k; al.vy -= vn * ny * k; al.vz -= vn * nz * k;
    }
    if (d < clear) {
      al.x = b.x + nx * clear; al.y = ny * clear; al.z = b.z + nz * clear;
      const vn = al.vx * nx + al.vy * ny + al.vz * nz;
      if (vn < 0) { al.vx -= vn * nx; al.vy -= vn * ny; al.vz -= vn * nz; }
    }
  }
  dodgeRock(al, arena.rocks, dt);
  for (const o of arena.aliens) {
    if (o === al) continue;
    const dx = al.x - o.x, dy = al.y - o.y, dz = al.z - o.z, d = Math.hypot(dx, dy, dz) || 1, clear = al.r + o.r + 3;
    if (d > clear) continue;
    const push = ((clear - d) / clear) * 22 * dt;
    al.vx += (dx / d) * push; al.vy += (dy / d) * push; al.vz += (dz / d) * push;
  }
}

/**
 * Rock in the way: swerve round it, as hard as the hull can. Every hull sees
 * it at the same distance, but a nimble one has the thrust to clear it and a
 * bulky one does not, and none can slip a gap narrower than itself (the
 * world holds the hull to that, in `hullsVsRock`). The small Wayward
 * threads what a cruiser cannot.
 */
function dodgeRock(al: Alien, rocks: readonly Rock[], dt: number): void {
  const sp = Math.hypot(al.vx, al.vz);
  if (sp < 1) return;
  const hx = al.vx / sp, hz = al.vz / sp, reach = sp * 1.8 + 8;
  const T = ALIEN_TYPES[al.kind];
  for (const r of rocks) {
    const rx = r.x - al.x, rz = r.z - al.z;
    if (Math.abs(rx) > reach + 4 || Math.abs(rz) > reach + 4) continue;
    const ahead = rx * hx + rz * hz;
    if (ahead < -r.r || ahead > reach) continue;
    const side = rx * -hz + rz * hx, clear = r.r + al.r + 1;
    if (Math.abs(side) > clear) continue;
    const dir = side >= 0 ? -1 : 1, push = T.accel * 1.2 * (1 - Math.max(0, ahead) / reach) * dt;
    al.vx += -hz * dir * push; al.vz += hx * dir * push;
  }
}

/** A lance that will pass within the hull's radius in the next half second, if any. */
function threat(al: Alien, bolts: readonly Incoming[]): Incoming | null {
  for (const b of bolts) {
    const rx = al.x - b.x, ry = al.y - b.y, rz = al.z - b.z;
    const vv = b.vx * b.vx + b.vy * b.vy + b.vz * b.vz || 1;
    const t = (rx * b.vx + ry * b.vy + rz * b.vz) / vv;
    if (t < 0 || t > 0.5) continue;
    if (Math.hypot(rx - b.vx * t, ry - b.vy * t, rz - b.vz * t) < al.r + 1.4) return b;
  }
  return null;
}

/** See a lance coming and, by type, jink: a barrel roll up or down and across its path. */
function evade(al: Alien, T: AlienType, arena: Arena, rng: Rng, events: GameEvent[]): void {
  if (al.jink > 0 || T.evade <= 0 || al.mode === 'spin' || cloaked(al)) return;
  const b = threat(al, arena.bolts);
  if (!b) return;
  al.jink = 0.35;
  if (rng.next() >= T.evade) return;
  const side: 1 | -1 = rng.next() < 0.5 ? 1 : -1;
  const h = Math.hypot(b.vx, b.vz) || 1;
  const up = al.y < -0.5 ? 1 : al.y > 1.5 ? -1 : rng.next() < 0.5 ? 1 : -1;
  const k = T.role === 'cruiser' ? 0.4 : 1;
  // a jink is sideways across the lance, with a hop for the roll to read; it stays on the plane
  al.vx += (-b.vz / h) * side * 19 * k;
  al.vz += (b.vx / h) * side * 19 * k;
  al.vy += up * 3.5 * k;
  al.roll = 0;
  al.rollDir = side;
  al.jink = rng.range(1.4, 2.4) * (T.role === 'cruiser' ? 2 : 1);
  events.push({ type: 'evade', id: al.id });
}

/** The bulwark a cruiser would hide behind: near it, between it and the ship's reach. */
function coverFor(al: Alien, s: ShipState, bulwarks: readonly Bulwark[]): Bulwark | null {
  let best: Bulwark | null = null, bestD = Infinity;
  for (const b of bulwarks) {
    const da = Math.hypot(b.x - al.x, b.z - al.z), ds = Math.hypot(b.x - s.x, b.z - s.z);
    if (da > 75 || ds > 95 || ds < b.r + 12) continue;
    if (da < bestD) { bestD = da; best = b; }
  }
  return best;
}

/** True if a bulwark stands between a hull and the ship. */
export function blocked(x: number, y: number, z: number, s: ShipState, bulwarks: readonly Bulwark[]): boolean {
  const dx = s.x - x, dz = s.z - z, L = Math.hypot(dx, dz) || 1;
  for (const b of bulwarks) {
    if (y > b.r) continue;
    const t = clamp(((b.x - x) * dx + (b.z - z) * dz) / (L * L), 0, 1);
    if (Math.hypot(x + dx * t - b.x, z + dz * t - b.z) < b.r * 0.9) return true;
  }
  return false;
}

/** Done fighting: climb away at full speed. */
export function leave(al: Alien): void {
  al.mode = 'leave';
  al.fleeing = true;
}

/** Arrived in range: begin the type's way of fighting. */
function engage(al: Alien, T: AlienType, s: ShipState, rng: Rng): void {
  switch (T.tactic) {
    case 'dogfight': al.mode = 'setup'; al.modeT = 4; break;
    case 'ram': al.mode = 'line'; al.modeT = 1.5; break;
    case 'hunt': case 'grind': al.mode = 'run'; al.modeT = 0; break;
    case 'broadside': case 'snipe': al.mode = 'cover'; al.modeT = rng.range(1, 2.5); break;
    case 'anchor':
      al.mode = 'seek';
      al.ax = s.x + s.vx * 1.2 + rng.range(-9, 9);
      al.az = s.z + s.vz * 1.2 + rng.range(-9, 9);
      break;
    case 'cross': break;
  }
}

/** Done looking: close in and fight, straight in from here. */
function commit(al: Alien, events: GameEvent[]): void {
  al.mode = 'approach';
  al.approach = 'direct';
  al.modeT = 10;
  events.push({ type: 'noticed', id: al.id, x: al.x, y: al.y, z: al.z });
}

/** Somebody else's fight, noticed by the ship: a fighter turns on it, a hauler runs. */
export function provoke(al: Alien, events: GameEvent[]): void {
  if (al.ward) delete al.ward;
  if (ALIEN_TYPES[al.kind].tactic === 'cross') leave(al);
  else commit(al, events);
}

/** A patrol's next waypoint: on along its beat, turning a little. */
function nextLeg(al: Alien, rng: Rng): void {
  const h = Math.atan2(-(al.az - al.z), al.ax - al.x) + rng.range(-0.8, 0.8);
  al.ax = al.x + Math.cos(h) * PACING.patrolLeg;
  al.az = al.z - Math.sin(h) * PACING.patrolLeg;
}

/** Modes a cloaking hull stays hidden in: everything but the attack itself. */
const HIDDEN: ReadonlySet<Mode> = new Set(['approach', 'setup', 'extend', 'cover', 'leave', 'seek']);

/** Move one hull a step. */
export function moveAlien(al: Alien, s: ShipState, dt: number, arena: Arena, webs: Web[], rng: Rng, events: GameEvent[]): void {
  const T = ALIEN_TYPES[al.kind];
  const speed = T.speed * al.spK, dash = T.dash * al.spK, acc = T.accel * Math.sqrt(al.spK), range = T.range * al.rgK;
  al.age += dt;
  al.modeT -= dt;
  al.calm += dt;
  if (al.hitT > 0) al.hitT = Math.max(0, al.hitT - dt);
  if (al.jink > 0) al.jink = Math.max(0, al.jink - dt);
  if (al.mark > 0) al.mark = Math.max(0, al.mark - dt);
  if (al.bumpT > 0) al.bumpT = Math.max(0, al.bumpT - dt);
  if (al.roll >= 0 && (al.roll += dt) >= JINK_ROLL) al.roll = -1;
  if (T.ttl > 0 && !al.fleeing && !al.ward && (al.ttl -= dt) <= 0) leave(al);
  const regen = al.elite ? ELITES[al.elite].regen : 0;
  if (regen && al.calm > 2 && al.hp < al.maxHp) al.hp = Math.min(al.maxHp, al.hp + al.maxHp * regen * dt);
  if (al.canCloak) {
    // hidden while repositioning; the decloak a beat before an attack is its tell
    const want = HIDDEN.has(al.mode) && al.hitT <= 0 ? 1 : 0;
    al.cloak = clamp(al.cloak + Math.sign(want - al.cloak) * CLOAK_RATE * dt, 0, 1);
  }

  const dx = s.x - al.x, dz = s.z - al.z, d = Math.hypot(dx, dz) || 1;
  const ux = dx / d, uz = dz / d; // toward the ship
  const fx = Math.cos(s.heading), fz = -Math.sin(s.heading); // the ship's nose
  const rx = Math.sin(s.heading), rz = Math.cos(s.heading); // the ship's starboard
  const aim = Math.atan2(-dz, dx);
  /** Where the nose should point, if not along the velocity. */
  let faceTo: number | null = null;

  const seen = PACING.notice * (arena.notice ?? 1);

  switch (al.mode) {
    case 'approach': {
      // close to fighting range at cruise altitude: by default from the side it came in on
      let gx = s.x - ux * range, gz = s.z - uz * range;
      const ap = al.approach;
      if (ap === 'investigate' || ap === 'circle') {
        // to the edge of gun range, to look the ship over
        gx = s.x - ux * PACING.standoff; gz = s.z - uz * PACING.standoff;
        if (d < PACING.standoff + 12) { al.mode = 'watch'; al.modeT = rng.range(PACING.watch[0], PACING.watch[1]); break; }
      } else if (ap === 'flank') {
        // round to the beam or the quarter on the side it came in, then in
        gx = s.x + (rx * al.slide * 0.85 - fx * 0.35) * range; gz = s.z + (rz * al.slide * 0.85 - fz * 0.35) * range;
        if (Math.hypot(gx - al.x, gz - al.z) < 14) { engage(al, T, s, rng); break; }
      } else if (ap === 'intercept') {
        // onto your course: where you will be when it gets there
        const lead = clamp(d / (speed * 1.3), 0, 3);
        gx = s.x + s.vx * lead - ux * range; gz = s.z + s.vz * lead - uz * range;
      }
      steer(al, gx, al.cruiseY, gz, speed * 1.3, acc, dt, 12);
      if (al.modeT <= 0 || ((ap === 'direct' || ap === 'intercept') && d < range + 14)) engage(al, T, s, rng);
      break;
    }

    // the arcade's patrols: their own beat across the sector, until they see you
    case 'patrol':
      steer(al, al.ax, al.cruiseY, al.az, speed * 0.8, acc, dt, 6);
      if (Math.hypot(al.ax - al.x, al.az - al.z) < 8) nextLeg(al, rng);
      if (d < seen || al.calm < 1) commit(al, events);
      else if (al.modeT <= 0) leave(al);
      break;

    // looking you over from beyond gun range: holding off, or circling, then in (or away)
    case 'watch': {
      if (al.approach === 'circle') {
        const a = Math.atan2(-(al.z - s.z), al.x - s.x) + al.slide * 0.5, R = PACING.standoff * 0.85;
        steer(al, s.x + Math.cos(a) * R, al.cruiseY, s.z - Math.sin(a) * R, speed * 1.2, acc, dt, 2);
      } else {
        steer(al, s.x - ux * PACING.standoff - uz * al.slide * 8, al.cruiseY, s.z - uz * PACING.standoff + ux * al.slide * 8, speed, acc, dt, 8);
        faceTo = aim;
      }
      if (d < seen * 0.6 || al.calm < 1) commit(al, events);
      else if (al.modeT <= 0) {
        // never shot at: some decide you are not worth it
        if (al.approach === 'investigate' && al.calm > 90 && rng.next() < PACING.moveOn) leave(al);
        else commit(al, events);
      }
      break;
    }

    // someone else's fight (a skirmish, sim/encounters.ts): holding station on its own side, circling a little, until the ship comes close or hits anyone
    case 'brawl': {
      const a = al.age * 0.35 * al.slide;
      steer(al, al.ax + Math.cos(a) * 5, al.cruiseY, al.az + Math.sin(a) * 5, speed * 0.7, acc, dt, 3);
      if (d < seen * 0.5 || al.calm < 1) provoke(al, events);
      break;
    }

    case 'leave':
      steer(al, al.x - ux * 100, 4, al.z - uz * 100, dash, acc, dt);
      break;

    // a ward's script (sim/stage.ts sets the goal each step): on to the point, at its own pace, whatever the ship does
    case 'drift':
      steer(al, al.ax, al.cruiseY, al.az, speed * 0.9, acc, dt, 8);
      break;

    // the convoy: across the sector on its own heading, whatever you do
    case 'cross':
      accelerate(al, al.ax * speed, -al.y * 0.5, al.az * speed, acc, dt);
      break;

    // interceptors: swing out high, dive, pass, climb out
    case 'setup': {
      const gx = s.x + fx * 30 + rx * al.slide * 28, gz = s.z + fz * 30 + rz * al.slide * 28;
      steer(al, gx, 1.6, gz, speed * 1.3, acc, dt, 4);
      if (Math.hypot(gx - al.x, gz - al.z) < 9 || al.modeT <= 0) { al.mode = 'run'; al.modeT = 3.5; }
      break;
    }
    case 'run':
      if (T.tactic === 'dogfight') {
        // a strafing pass: aimed just past you and a little above, so it shoots on the way in and never rams
        const lead = clamp(d / dash, 0, 1.2);
        const px = -uz * al.slide * 4, pz = ux * al.slide * 4;
        steer(al, s.x + s.vx * lead + px, 2.8, s.z + s.vz * lead + pz, dash, acc * 1.6, dt, 0.1);
        const closing = al.vx * ux + al.vz * uz;
        if (d < 7 || al.modeT <= 0 || (d < 22 && closing < 0)) { al.mode = 'extend'; al.modeT = 1.6; }
      } else if (T.tactic === 'ram') {
        // committed: straight on, dropping to the plane
        const hx = Math.cos(al.face), hz = -Math.sin(al.face);
        accelerate(al, hx * dash, -al.y * 2, hz * dash, acc * 2, dt);
        if (al.modeT <= 0) { al.mode = 'extend'; al.modeT = 1.4; }
      } else if (T.tactic === 'hunt') {
        // on the ship's tail, a little high, guns on it
        const gx = s.x - fx * 13 + rx * al.slide * 4, gz = s.z - fz * 13 + rz * al.slide * 4;
        steer(al, gx, 2.5, gz, d > 25 ? dash : speed * 1.4, acc, dt, 8);
        if (d < 40) faceTo = aim;
      } else {
        // the foundry: straight at you, on the plane
        steer(al, s.x, 0, s.z, speed, acc, dt, 0.1);
        faceTo = aim;
      }
      break;
    case 'extend': {
      const sp = Math.hypot(al.vx, al.vz) || 1;
      steer(al, al.x + (al.vx / sp) * 30, 1.8, al.z + (al.vz / sp) * 30, dash, acc, dt);
      if (al.modeT <= 0) {
        if (++al.runs >= RUNS && !al.escort) leave(al);
        else if (T.tactic === 'ram') { al.mode = 'line'; al.modeT = 1.2 + (al.id % 5) * 0.16; }
        else { al.mode = 'setup'; al.modeT = 5; al.slide = al.slide === 1 ? -1 : 1; }
      }
      break;
    }
    case 'line':
      // the raptor lines up on the plane, nose on, then commits
      steer(al, s.x - ux * 34, 1, s.z - uz * 34, speed, acc, dt);
      faceTo = aim;
      if (al.modeT <= 0 && Math.abs(angleDelta(al.face, aim)) < 0.2) {
        al.mode = 'run'; al.modeT = 1.6;
        al.vx = Math.cos(al.face) * dash * 0.8; al.vz = -Math.sin(al.face) * dash * 0.8;
      }
      break;

    // cruisers: cover, peek, broadside
    case 'cover': {
      const b = coverFor(al, s, arena.bulwarks);
      if (!b) { al.mode = 'hold'; al.modeT = 3; break; }
      const bx = b.x - s.x, bz = b.z - s.z, bd = Math.hypot(bx, bz) || 1;
      const gx = b.x + (bx / bd) * (b.r + al.r + 3), gz = b.z + (bz / bd) * (b.r + al.r + 3);
      steer(al, gx, 0, gz, dash, acc, dt);
      faceTo = aim;
      const hurt = al.hp < al.maxHp * 0.35;
      if (al.modeT <= 0 && Math.hypot(gx - al.x, gz - al.z) < 6) {
        if (hurt && rng.next() < 0.5) al.modeT = 2;
        else { al.mode = 'peek'; al.modeT = T.tactic === 'snipe' ? 2.6 : 3.4; if (rng.next() < 0.4) al.slide = al.slide === 1 ? -1 : 1; }
      }
      break;
    }
    case 'peek': {
      const b = coverFor(al, s, arena.bulwarks);
      if (!b) { al.mode = 'hold'; al.modeT = 3; break; }
      const bx = b.x - s.x, bz = b.z - s.z, bd = Math.hypot(bx, bz) || 1;
      const nx = bx / bd, nz = bz / bd, out = b.r + al.r + 5;
      steer(al, b.x + nx * b.r * 0.5 - nz * al.slide * out, 0, b.z + nz * b.r * 0.5 + nx * al.slide * out, dash, acc, dt);
      // the lancer turns side-on for its broadside
      faceTo = T.tactic === 'broadside' ? aim + (Math.PI / 2) * al.slide : aim;
      if (al.modeT <= 0 || (al.hitT > 0 && al.hp < al.maxHp * 0.5)) { al.mode = 'cover'; al.modeT = rng.range(2.2, 4); }
      break;
    }
    case 'hold':
      // no cover in reach: hold range and slide
      steer(al, s.x - ux * range - uz * al.slide * 10, 1.5, s.z - uz * range + ux * al.slide * 10, speed, acc, dt);
      faceTo = T.tactic === 'broadside' ? aim + (Math.PI / 2) * al.slide : aim;
      if (al.modeT <= 0) {
        al.slide = al.slide === 1 ? -1 : 1;
        al.modeT = 3;
        if (coverFor(al, s, arena.bulwarks)) { al.mode = 'cover'; al.modeT = 1; }
      }
      break;

    // the weaver
    case 'seek': {
      const ax = al.ax - al.x, az = al.az - al.z, ad = Math.hypot(ax, az);
      steer(al, al.ax, 0, al.az, dash, acc, dt, 3);
      if (ad < 1.4 && Math.abs(al.y) < 1.2) { al.mode = 'spin'; al.modeT = WEB_SPIN; }
      break;
    }
    case 'spin':
      al.vx *= 0.8; al.vy *= 0.8; al.vz *= 0.8;
      if (al.modeT <= 0) {
        const big = al.elite === 'spinner' ? 1.5 : 1;
        webs.push({ id: newId(), x: al.x, z: al.z, life: WEB_LIFE, r: 0, max: WEB_R * big });
        events.push({ type: 'webSet', x: al.x, z: al.z });
        leave(al);
      }
      break;
  }

  if (al.mode !== 'cross') avoid(al, arena, dt);
  evade(al, T, arena, rng, events);

  const sp = Math.hypot(al.vx, al.vy, al.vz), cap = dash * 1.4;
  if (sp > cap) { al.vx *= cap / sp; al.vy *= cap / sp; al.vz *= cap / sp; }
  al.x += al.vx * dt;
  al.y += al.vy * dt;
  al.z += al.vz * dt;

  // the nose: along the velocity, or where the tactic wants it; heavy hulls turn slowly
  const hs = Math.hypot(al.vx, al.vz);
  const want = faceTo ?? (hs > 1.5 ? Math.atan2(-al.vz, al.vx) : al.face);
  const rate = T.role === 'cruiser' || al.kind === 'freighter' ? 1.1 : 4.5;
  const turn = clamp(angleDelta(al.face, want), -rate * dt, rate * dt);
  al.face += turn;
  al.bank += (clamp((-turn / dt) * 0.3, -0.9, 0.9) - al.bank) * Math.min(1, 5 * dt);
}

/** Fire when the type's way of fighting says so and the cooldown is up. */
export function alienFire(al: Alien, s: ShipState, t: number, shots: Shot[], bulwarks: readonly Bulwark[], rng: Rng, events: GameEvent[], p: Pressure = pressure(t)): void {
  const T = ALIEN_TYPES[al.kind];
  if (T.fire === 'none' || al.fleeing || al.mode === 'approach' || al.mode === 'patrol' || al.mode === 'watch' || al.mode === 'brawl' || al.mode === 'drift' || al.ward || t < al.nextShot) return;
  // a cloaked hull decloaks before it fires: the shimmer is the warning
  if (al.cloak > 0.25) { al.nextShot = t + 0.1; return; }
  const dx = s.x - al.x, dz = s.z - al.z, d = Math.hypot(dx, dz);
  if (d > FIRE_RANGE * al.rgK) { al.nextShot = t + 0.4; return; }
  const aim = Math.atan2(-dz, dx);
  const nose = Math.abs(angleDelta(al.face, aim));
  const ready = (() => {
    switch (T.tactic) {
      case 'dogfight': return al.mode === 'run' && nose < 0.5 && d < 45;
      case 'ram': return al.mode === 'run';
      case 'hunt': return nose < 0.9;
      case 'broadside': case 'snipe': return al.mode === 'peek' || al.mode === 'hold';
      case 'grind': return d < 38 && Math.abs(al.y) < 3;
      default: return false;
    }
  })();
  if (!ready) { al.nextShot = t + 0.12; return; }
  if (T.fire !== 'beam' && blocked(al.x, al.y, al.z, s, bulwarks)) { al.nextShot = t + 0.3; return; }
  al.nextShot = t + p.fireCd * T.cd * al.cdK * rng.range(0.85, 1.15);

  const sp = p.shotSpeed * al.shotK;
  const split = al.split ? 0.55 : 0;
  // fire from altitude comes down onto the plane where the ship is
  const drop = (speed: number) => clamp(-al.y / Math.max(0.3, d / speed), -speed * 0.8, speed * 0.8);
  const shot = (a: number, speed = sp, extra: Partial<Shot> = {}) => shots.push({
    id: newId(), x: al.x, y: al.y, z: al.z, vx: Math.cos(a) * speed, vy: drop(speed), vz: -Math.sin(a) * speed,
    life: 3.4, r: 0.45, faction: al.faction, hp: 0, seek: 0, split, from: al.variant, ...extra,
  });
  switch (T.fire) {
    case 'fan': {
      const a = aim + (rng.next() - 0.5) * 2 * p.spread;
      for (let i = 0; i < al.shots; i++) shot(a + (i - (al.shots - 1) / 2) * 0.2);
      break;
    }
    case 'lead': {
      const lead = d / sp;
      for (let i = 0; i < al.shots; i++) {
        shot(Math.atan2(-(s.z + s.vz * lead * 0.55 - al.z), s.x + s.vx * lead * 0.55 - al.x) + (rng.next() - 0.5) * 2 * p.spread + (i - (al.shots - 1) / 2) * 0.12);
      }
      break;
    }
    case 'burst':
      for (const side of [-1, 1]) {
        shots.push({
          id: newId(), x: al.x + Math.sin(al.face) * side * al.r * 0.5, y: al.y, z: al.z + Math.cos(al.face) * side * al.r * 0.5,
          vx: Math.cos(al.face) * sp * 1.15, vy: drop(sp * 1.15), vz: -Math.sin(al.face) * sp * 1.15, life: 2.8, r: 0.45,
          faction: al.faction, hp: 0, seek: 0, split, from: al.variant,
        });
      }
      break;
    case 'plasma':
      shot(aim, PLASMA_SPEED * al.shotK, { life: 8, r: 0.9, hp: PLASMA_HP, seek: PLASMA_TURN });
      events.push({ type: 'plasma', x: al.x, z: al.z });
      break;
    case 'beam':
      al.beamT = BEAM_WIND + BEAM_FIRE;
      al.beamAng = aim;
      al.nextShot = t + 5.4 * al.cdK;
      return;
  }
  events.push({ type: 'enemyFire', x: al.x, y: al.y, z: al.z, faction: al.faction });
}

/** Beams track toward the ship while winding up, and sweep after it slowly while they cut. */
export function stepBeam(al: { x: number; z: number; beamT: number; beamAng: number }, s: ShipState, dt: number, k = 1): void {
  if (al.beamT <= 0) return;
  al.beamT = Math.max(0, al.beamT - dt);
  const want = Math.atan2(-(s.z - al.z), s.x - al.x);
  const rate = (al.beamT > BEAM_FIRE ? BEAM_TRACK : BEAM_SWEEP) * k;
  al.beamAng += clamp(angleDelta(al.beamAng, want), -rate * dt, rate * dt);
}

/** True while a beam is live (past its wind-up). */
export const beamLive = (b: { beamT: number }) => b.beamT > 0 && b.beamT <= BEAM_FIRE;

/** Shortest distance from (px, pz) to a ray from (x, z) at angle a, length len. */
export function rayDist(px: number, pz: number, x: number, z: number, a: number, len: number): number {
  const dx = Math.cos(a), dz = -Math.sin(a);
  const t = clamp((px - x) * dx + (pz - z) * dz, 0, len);
  return Math.hypot(px - (x + dx * t), pz - (z + dz * t));
}

export function moveShots(shots: Shot[], s: ShipState, dt: number): void {
  for (let i = shots.length - 1; i >= 0; i--) {
    const b = shots[i]!;
    if (b.seek) {
      // plasma steers after the ship, and down onto its plane
      const sp = Math.hypot(b.vx, b.vz);
      let a = Math.atan2(-b.vz, b.vx);
      a += clamp(angleDelta(a, Math.atan2(-(s.z - b.z), s.x - b.x)), -b.seek * dt, b.seek * dt);
      b.vx = Math.cos(a) * sp; b.vz = -Math.sin(a) * sp;
      b.vy += clamp(-b.y * 2 - b.vy, -12 * dt, 12 * dt);
    }
    if (b.split > 0 && (b.split -= dt) <= 0) {
      // Thren shards break in three
      const sp = Math.hypot(b.vx, b.vz), a = Math.atan2(-b.vz, b.vx);
      for (const o of [-0.45, 0.45]) shots.push({ ...b, id: newId(), split: 0, vx: Math.cos(a + o) * sp, vz: -Math.sin(a + o) * sp });
      b.split = 0;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    if (b.life <= 0) shots.splice(i, 1);
  }
}

export function stepWebs(webs: Web[], dt: number): void {
  for (let i = webs.length - 1; i >= 0; i--) {
    const w = webs[i]!;
    w.life -= dt;
    w.age = (w.age ?? 0) + dt;
    w.r = (w.max ?? WEB_R) * Math.min(1, w.age / WEB_GROW, w.life / 0.4);
    if (w.life <= 0) webs.splice(i, 1);
  }
}
