import { RATINGS, STOCK, STOCK_DRAW, WEB, type Budget } from '../content/web';
import type { Stats } from './stats';

// ── the ship's loads, felt ────────────────────────────────────────────────
// Every module adds to three loads (content/web.ts), and the ship is rated
// for so much of each. The bay shows what each load does, not the load:
//
//   mass  · acceleration (and a little top speed and helm): a heavy ship is
//           slow off the mark and slow to turn
//   power · top speed (and a little cooldown): a ship drawing all its reactor
//           can give has less left for the drive
//   heat  · cooldown: the guns cycle slower, and torpedoes reload slower
//
// Every module nudges its load a little, in proportion to the rating, so a
// ship that has grown handles a little differently with each part and never
// all at once. Past the rating (the warning light) the cost climbs faster.
// Each effect has a floor, so an overloaded ship is worse, never useless.
// The nudge is measured from the stock ship, which flies as it always did.

export const FEEL = {
  /** Per share of the rating drawn above the stock ship's draw: the nudge every module adds. */
  soft: { accel: 0.14, turn: 0.07, speedMass: 0.04, speedPower: 0.09, coolHeat: 0.14, coolPower: 0.05 },
  /** Per share of the rating run over: what the warning light costs, on top. */
  over: { accel: 0.7, turn: 0.55, speedMass: 0.3, speedPower: 0.5, coolHeat: 0.9, coolPower: 0.3 },
  /** The least each can fall to. */
  floor: { accel: 0.55, turn: 0.6, speed: 0.6, cool: 0.5 },
} as const;

/**
 * The Story's weight on the drive: every point of mass over the rating costs this much more Cyrite
 * per jump, up to the cap. A heavy ship still flies, and still jumps; it just burns more.
 */
export const WEIGHT_FUEL = { perMass: 1, max: 6 } as const;

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

/** Cyrite a jump costs extra for the mass carried over the frame's rating (0 within it). */
export function weightFuel(levels: Record<string, number>): number {
  const { use, cap } = budgets(levels);
  return Math.min(WEIGHT_FUEL.max, Math.ceil(Math.max(0, use.mass - cap.mass) * WEIGHT_FUEL.perMass));
}

/** Which ratings the build runs over: the warning lights (for the HUD's quiet line, the chart and the bay). */
export function overRatings(levels: Record<string, number>): { mass: boolean; heat: boolean; power: boolean } {
  const { use, cap } = budgets(levels);
  return { mass: use.mass > cap.mass, heat: use.heat > cap.heat, power: use.power > cap.power };
}

/** What the ship leaves with draws: the nudge counts from here, so the stock ship flies as it always did. */
const STOCK_USE: Readonly<Budget> = budgets(STOCK).use;

/** A load as a share of its rating, counted from the stock ship's draw. */
const softOf = (use: number, cap: number, stock: number) => Math.max(0, use - stock) / Math.max(1, cap);

/**
 * What a build's loads do to the ship, as multipliers (1 is the stock ship): acceleration, top speed and turn
 * (lower is worse), and cooldown (higher is worse: the time the guns take to cycle).
 */
export function feel(levels: Record<string, number>): { accel: number; speed: number; turn: number; cooldown: number } {
  const { use, cap } = budgets(levels), { soft: k, over: o, floor: f } = FEEL;
  const sm = softOf(use.mass, cap.mass, STOCK_USE.mass), sp = softOf(use.power, cap.power, STOCK_USE.power), sh = softOf(use.heat, cap.heat, STOCK_USE.heat);
  const om = overBy(use.mass, cap.mass), op = overBy(use.power, cap.power), oh = overBy(use.heat, cap.heat);
  const cool = Math.max(f.cool, 1 - k.coolHeat * sh - k.coolPower * sp - o.coolHeat * oh - o.coolPower * op);
  return {
    accel: Math.max(f.accel, 1 - k.accel * sm - o.accel * om),
    speed: Math.max(f.speed, 1 - k.speedMass * sm - k.speedPower * sp - o.speedMass * om - o.speedPower * op),
    turn: Math.max(f.turn, 1 - k.turn * sm - o.turn * om),
    cooldown: 1 / cool,
  };
}

/** Make the stat block feel the loads. Mutates and returns it. Applied after the caps: it only ever slows things. */
export function feelBudgets(s: Stats, levels: Record<string, number>): Stats {
  const f = feel(levels);
  s.accel *= f.accel;
  s.speed *= f.speed;
  s.turn *= f.turn;
  s.bankRefill /= f.cooldown;
  s.torpReload *= f.cooldown;
  s.mineInterval *= f.cooldown;
  s.arcInterval *= f.cooldown;
  // every shot feels it a little, not only the bank
  s.laserCooldown *= 1 + (f.cooldown - 1) * 0.5;
  return s;
}
