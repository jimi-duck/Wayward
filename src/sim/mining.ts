import { angleDelta } from '../core/math';
import type { Rock, RockKind } from './field';
import type { ShipState } from './ship';

// ── the cutter ────────────────────────────────────────────────────────────
// The hauler's mining laser, on its own trigger (3 or C). Hold it on a rock
// in front of the bow: the rock heats, and once it is warm the cut goes in.
// Let go and it cools. Keep the heat under the line and the rock comes apart
// clean, everything in it falling out for the tractor; let it run over and
// the rock fractures, scattering scraps (a volatile rock goes off). So the
// cutter is pulsed, not held: in, ease off at the red, in again.
//
// Heat and the cut belong to the rock, so a half-cut rock stays half cut,
// cooling, while you deal with something else.

/** Reach from the bow, and the half-angle of the cone it looks along. */
export const CUT_RANGE = 15;
export const CUT_CONE = 0.4;
/** Heat a second while cutting, and cooling a second while not. */
export const HEAT_UP = 0.42;
export const COOL = 0.5;
/** Below this the cut does not go in; above 1 the rock fractures. */
export const WARM = 0.25;
/** Seconds of warm cutting a rock of each size takes (large, medium, small). */
export const CUT_WORK = [5.5, 3.2, 1.4] as const;

const KIND: Record<RockKind, { heat: number; work: number }> = {
  basalt: { heat: 1, work: 1 },
  iron: { heat: 0.8, work: 1.5 },
  rich: { heat: 1.05, work: 1.1 },
  volatile: { heat: 1.35, work: 0.8 },
};

export interface Cutter {
  /** The rock under the beam, or null. */
  target: number | null;
  /** Seconds the beam has run this run. */
  time: number;
}

export const newCutter = (): Cutter => ({ target: null, time: 0 });

/** The rock the beam would take: the nearest in the cone ahead, keeping the current one while it is still there. */
export function cutTarget(s: ShipState, rocks: Rock[], current: number | null): Rock | null {
  let best: Rock | null = null, bestD = Infinity;
  for (const r of rocks) {
    const dx = r.x - s.x, dz = r.z - s.z, d = Math.hypot(dx, dz) - r.r;
    if (d > CUT_RANGE) continue;
    const off = Math.abs(angleDelta(s.heading, Math.atan2(-dz, dx)));
    if (off > CUT_CONE + Math.atan2(r.r, Math.max(1, d + r.r))) continue;
    const k = r.id === current ? d - 6 : d;
    if (k < bestD) { bestD = k; best = r; }
  }
  return best;
}

export type CutResult = 'none' | 'cutting' | 'clean' | 'fracture';

/** Run the beam on a rock for one step. */
export function cutRock(r: Rock, dt: number): CutResult {
  const K = KIND[r.kind];
  r.heat = (r.heat ?? 0) + HEAT_UP * K.heat * dt;
  if (r.heat > 1) return 'fracture';
  if (r.heat >= WARM) {
    r.cut = (r.cut ?? 0) + dt / (CUT_WORK[r.size] * K.work);
    if (r.cut >= 1) return 'clean';
  }
  return 'cutting';
}

/** Every rock not under the beam cools. */
export function coolRocks(rocks: Rock[], except: number | null, dt: number): void {
  for (const r of rocks) if (r.heat && r.id !== except) r.heat = Math.max(0, r.heat - COOL * dt);
}
