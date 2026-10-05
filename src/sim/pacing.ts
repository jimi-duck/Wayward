import type { Pressure } from './director';
import type { Role } from './enemies';
import type { Rng } from './rng';
import type { ShipState } from './ship';

// ── encounters (the arcade) ───────────────────────────────────────────────
// The arcade's hostiles come in encounters, not a steady stream:
//
//   quiet · nothing new arrives for `Pressure.lull` seconds (stretched by
//           Stats.lull). Room to mine, patch up (sim/repair.ts) and look
//           round. A capital ship's fight counts as an encounter: a quiet
//           spell follows it too.
//   wave  · a group of `waveSize` hulls, arriving one (or a pair, or a
//           squad) at a time, `Pressure.enemyInterval` apart. Once every
//           one of them is destroyed, gone or shaken off (out past the cull
//           ring), the quiet comes back. A wave that drags on past
//           PACING.maxLength breaks off.
//
// No hull arrives in front of the ship: each comes in from a bearing clear
// of the nose, far out, and how it closes is its approach (APPROACHES),
// picked by role and by how far into the run it is. Early on everything
// looks you over first; later more of them come straight in, round the
// flank, or onto your course. The approaches are rows here and modes in
// sim/enemies.ts, so a new one is a row and a case.

export type Approach = 'direct' | 'flank' | 'intercept' | 'circle' | 'investigate' | 'patrol';

export const PACING = {
  /** Hulls a wave adds per refit taken: a stronger ship meets bigger groups. */
  sizePerRefit: 0.1,
  /** Seconds after its last arrival a wave may last before the survivors break off. */
  maxLength: 45,
  /** Radians either side of the nose no hull arrives in. */
  noseClear: 0.75,
  /** Patrols and watchers notice the ship this close (units), times Stats.notice. */
  notice: 48,
  /** A watcher holds this far off (units: beyond enemy gun range) while it looks you over... */
  standoff: 88,
  /** ...for this many seconds, then commits. */
  watch: [4, 8] as const,
  /** Of watchers that were never shot at, the share that move on instead of attacking. */
  moveOn: 0.3,
  /** A patrol flies its beat this long unnoticed, then leaves. */
  patrolTime: 40,
  /** How far apart a patrol's waypoints are, units. */
  patrolLeg: 55,
} as const;

export interface ApproachDef {
  /** Seconds into a run before it is used. */
  at: number;
  /** Weight by role. */
  weight: Partial<Record<Role, number>>;
  /** Bearings it arrives from, radians off the nose either side: [from, to]. */
  bearing: readonly [number, number];
  /** Its weight by LATE seconds, as a share of the opening's (eased in between): the lookers thin out as a run goes on. */
  late?: number;
}

/** When the approaches' `late` weights are reached. */
export const LATE = 600;

export const APPROACHES: Record<Approach, ApproachDef> = {
  // looks you over first: the opening's way in, and a cruiser's habit
  patrol:      { at: 0,   weight: { interceptor: 0.6, cruiser: 1 },   bearing: [PACING.noseClear, 1.4], late: 0.4 },
  investigate: { at: 0,   weight: { interceptor: 0.5, cruiser: 1.2 }, bearing: [1, Math.PI], late: 0.5 },
  // commits: from the beam or the quarter, onto your course, round you, or straight in
  flank:       { at: 60,  weight: { interceptor: 1.2, cruiser: 1 },   bearing: [1.2, 2.1] },
  direct:      { at: 75,  weight: { interceptor: 1, cruiser: 0.7, special: 1 }, bearing: [PACING.noseClear, Math.PI] },
  circle:      { at: 90,  weight: { interceptor: 0.8 },                bearing: [PACING.noseClear, Math.PI] },
  intercept:   { at: 120, weight: { interceptor: 0.9 },                bearing: [PACING.noseClear, 1.3] },
};
export const APPROACH_ORDER = Object.keys(APPROACHES) as Approach[];

/** How a hull of this role closes on the ship, `t` seconds into a run. Specials (the web layer) always come straight in. */
export function pickApproach(role: Role, t: number, rng: Rng): Approach {
  let total = 0;
  const pool: Array<[Approach, number]> = [];
  for (const a of APPROACH_ORDER) {
    const d = APPROACHES[a], k = Math.min(1, t / LATE);
    const w = (d.weight[role] ?? 0) * (1 + ((d.late ?? 1) - 1) * k);
    if (d.at > t || w <= 0) continue;
    pool.push([a, w]);
    total += w;
  }
  if (!pool.length) return 'direct';
  let roll = rng.next() * total;
  for (const [a, w] of pool) { roll -= w; if (roll <= 0) return a; }
  return pool[pool.length - 1]![0];
}

/** Hulls the next wave brings: the director's group size, more for every refit, never above the ceiling. */
export const waveSize = (p: Pressure, refit: number) => Math.max(1, Math.min(p.enemyCap, Math.round(p.groupSize + refit * PACING.sizePerRefit)));

/** Where a hull arrives: its bearing off the nose (signed: + is to port), and the point, `d` units out. */
export function arrival(ship: ShipState, approach: Approach, rng: Rng, d: number): { x: number; z: number; off: number } {
  const [from, to] = APPROACHES[approach].bearing;
  const off = rng.range(from, to) * (rng.next() < 0.5 ? 1 : -1);
  const a = ship.heading + off;
  return { x: ship.x + Math.cos(a) * d, z: ship.z - Math.sin(a) * d, off };
}

/** A patrol's first waypoint: across the space ahead of the ship, toward the far side, so it crosses your view rather than your path. */
export function patrolStart(ship: ShipState, off: number): { x: number; z: number } {
  const fx = Math.cos(ship.heading), fz = -Math.sin(ship.heading);
  const rx = Math.sin(ship.heading), rz = Math.cos(ship.heading); // starboard
  // it came in to port (off > 0): make for the starboard side ahead, and the other way round
  const side = off > 0 ? 1 : -1;
  return { x: ship.x + fx * 70 + rx * side * 45, z: ship.z + fz * 70 + rz * side * 45 };
}

/** The arcade's encounter state. */
export interface Pace {
  state: 'quiet' | 'wave';
  /** quiet: when it ends. */
  until: number;
  /** wave: hulls still to arrive, when the next does, when the last did, and who came. */
  left: number;
  next: number;
  last: number;
  ids: Set<number>;
  /** Waves sent this run. */
  n: number;
}

export const newPace = (first: number): Pace => ({ state: 'quiet', until: first, left: 0, next: 0, last: 0, ids: new Set(), n: 0 });
