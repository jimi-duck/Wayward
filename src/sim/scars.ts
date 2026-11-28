import { GATES, LEGS } from '../content/road';
import type { Breakout } from './breakout';

// ── the Severance, where she can see it ───────────────────────────────────
// The world tells its own history without a card (plan "A living world",
// owner 2026-11-21). On the road, every system past Cerro shows:
//
//   the dead gate · a second Jump Gate, dark, with a breaker hulk clamped round
//                   it, the way every outer lane was shut on Severance night
//   the work lane · at a Kellern-held system, Bonded haulers queued by the live
//                   gate, waiting for clearance that rarely comes
//   a billboard   · the Continuance's slogan for the leg, by the live gate; past
//                   the Narrows, someone has written over it
//
// Plain data from the stop and the course; nothing here is saved. The render
// (render/scars.ts) draws them below the flight plane or above it, so none is
// in her way.

export interface Scars {
  /** The dead gate: where it stands, and its turn. */
  dead: { x: number; z: number; yaw: number } | null;
  /** The Bonded queue by the live gate: its first hull, the way the line runs, and how many wait. */
  queue: { x: number; z: number; yaw: number; n: number } | null;
  /** The billboard by the live gate: where, and what it says (English, for t()); `over` is what someone wrote across it. */
  board: { x: number; z: number; line: string; over: string | null; fx: number; fz: number } | null;
}

/** Which leg of the road a stop is on (0 = the Reach); its gate counts with the leg it closes. -1 off the road. */
export function legOf(script: string | undefined): number {
  if (!script) return -1;
  const i = LEGS.findIndex((leg) => leg.some((s) => s.script === script));
  if (i >= 0) return i;
  const g = GATES.findIndex((x) => x.script === script);
  return g;
}

/** The Continuance's line for each leg, as its billboards show it. */
export const SLOGANS: readonly string[] = [
  'The Severance keeps you safe',
  'Continuity is care',
  'Salvage is Continuance property',
  'Thren activity is rare and contained',
  'Every Bonded hand is proud to serve',
  'Only Chartered testimony is heard',
  'Signal degraded · turn back',
  'Merit Grants remain open',
];

/** What the Scatter writes across them, once she has woken the first relay. */
export const OVERS: readonly string[] = [
  'We kept the names',
  'Twenty-three ships',
  'Ask what they burned',
  'They follow the Cyrite',
  'We built the lock',
  'Forty in the room',
  'Nobody came back',
  'Nobody came back',
];

/** The story's leftover marks for a system: from the stop, its holder and the course (start at 0, 0; the live gate at `lane`). */
export function scarsOf(b: Pick<Breakout, 'lane' | 'port'> & { def: { script?: string; holder?: string } }, flags: ReadonlySet<string>): Scars {
  const leg = legOf(b.def.script);
  if (leg < 0) return { dead: null, queue: null, board: null };
  const { x: lx, z: lz } = b.lane;
  const d = Math.hypot(lx, lz) || 1, fx = lx / d, fz = lz / d, rx = -fz, rz = fx;
  const yaw = Math.atan2(-fz, fx);
  // the dead gate: a little off the line to port, past the story's places, under the plane where she flies over its edge
  const dead = { x: lx * 0.55 - rx * 230, z: lz * 0.55 - rz * 230, yaw: yaw + 0.6 };
  // the work lane: starboard of the live gate, running back toward her as she comes in
  const queue = b.def.holder === 'kellern' ? { x: lx - fx * 40 + rx * 70, z: lz - fz * 40 + rz * 70, yaw, n: 6 } : null;
  const line = SLOGANS[leg % SLOGANS.length]!;
  const over = leg >= 1 && flags.has('relay_broadcast') ? OVERS[leg % OVERS.length]! : null;
  const board = { x: lx + fx * 25 - rx * 70, z: lz + fz * 25 - rz * 70, line, over, fx, fz };
  return { dead, queue, board };
}
