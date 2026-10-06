import { RATINGS, STOCK_DRAW, WEB, type Budget } from '../content/web';
import type { Stats } from './stats';

// ── the ship's budgets, felt ──────────────────────────────────────────────
// What a build draws of power and heat and adds of mass, against what the
// ship is rated for (content/web.ts). Power is a ceiling the bay enforces;
// mass and heat can be run over, and cost the ship while they are:
//
//   mass over the frame's rating · the drive pushes a heavier ship: less
//                                  thrust (so a lower top speed) and a slower helm
//   heat over the sinks' rating  · the guns run hot: the laser bank refills
//                                  slower, torpedoes reload slower, mines and
//                                  the hull arc come round slower
//
// Each penalty grows with how far over, as a share of the rating, down to a
// floor, so an overloaded ship is worse, never useless. The arcade feels
// them; the Story mode will once the bay reaches it (PLAN.md, R, step 4).

export const OVERLOAD = {
  /** Per share of the mass rating run over: thrust and turning lost, and the least either can fall to. */
  thrust: 0.7, turn: 0.55, massFloor: 0.6,
  /** Per share of the heat rating run over: recharge and reload rate lost, and the least it can fall to. */
  cooling: 0.9, heatFloor: 0.5,
} as const;

/** What a build draws and what it is rated for. */
export function budgets(levels: Record<string, number>): { use: Budget; cap: Budget } {
  const use: Budget = { ...STOCK_DRAW }, cap: Budget = { ...RATINGS };
  for (const node of WEB) {
    const lv = levels[node.id] ?? 0;
    if (!lv) continue;
    use.power += (node.draw.power ?? 0) * lv; use.mass += (node.draw.mass ?? 0) * lv; use.heat += (node.draw.heat ?? 0) * lv;
    if (node.gives) { cap.power += (node.gives.power ?? 0) * lv; cap.mass += (node.gives.mass ?? 0) * lv; cap.heat += (node.gives.heat ?? 0) * lv; }
  }
  return { use, cap };
}

/** How far over a rating, as a share of it (0 when within). */
export const overBy = (use: number, cap: number) => Math.max(0, use - cap) / Math.max(1, cap);

/** The multipliers a build's overload puts on handling and on the guns' cycle (1 when within its ratings). */
export function overload(levels: Record<string, number>): { handling: { thrust: number; turn: number }; cooling: number } {
  const { use, cap } = budgets(levels);
  const m = overBy(use.mass, cap.mass), h = overBy(use.heat, cap.heat);
  return {
    handling: { thrust: Math.max(OVERLOAD.massFloor, 1 - OVERLOAD.thrust * m), turn: Math.max(OVERLOAD.massFloor, 1 - OVERLOAD.turn * m) },
    cooling: Math.max(OVERLOAD.heatFloor, 1 - OVERLOAD.cooling * h),
  };
}

/** Make the stat block feel the budgets. Mutates and returns it. Applied after the caps: it only ever slows things. */
export function feelBudgets(s: Stats, levels: Record<string, number>): Stats {
  const o = overload(levels);
  s.thrust *= o.handling.thrust;
  s.turn *= o.handling.turn;
  s.bankRefill *= o.cooling;
  s.torpReload /= o.cooling;
  s.mineInterval /= o.cooling;
  s.arcInterval /= o.cooling;
  return s;
}
