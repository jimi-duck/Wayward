import { SUPPLIES_MAX, TANK_MAX } from './breakout';
import type { Prices } from '../content/systems';

// ── the sensible stop ─────────────────────────────────────────────────────
// What a port does for you when you ask for the default, the way Auto-refit
// does in the bay: spend what the chits reach, most pressing first: Cyrite
// for the jump, supplies for a couple of lanes, the hull whole, and Cyrite
// for a second jump. It is a plan first (so the port can show what it would
// do) and then runs through the ship's own buy, so the prices and the limits
// stay in one place.

/** Supplies worth holding: two long lanes and the drive's wear over. */
export const SUPPLIES_TARGET = 10;

/** What the plan reads of the ship and the port. */
export interface StopView { chits: number; prices: Prices; cyrite: number; jumpCost: number; supplies: number; plates: number; maxPlates: number; supplyMax?: number; /** What the Cyrite the jump needs costs, as a multiple of the price (a work bay charges more when you are stuck). */ rush?: number }

/** What the stop would do: how many of each bought, and what it costs in chits (a negative `chits`). */
export interface Stop { cyrite: number; supplies: number; plate: number; chits: number }

export function planStop(v: StopView): Stop {
  let chits = v.chits;
  const out: Stop = { cyrite: 0, supplies: 0, plate: 0, chits: 0 };
  const buy = (item: 'cyrite' | 'supplies' | 'plate', have: number, want: number, mult = 1) => {
    const price = Math.ceil(v.prices[item] * mult);
    const n = Math.max(0, Math.min(want - have, Math.floor(chits / price)));
    out[item] += n;
    chits -= n * price;
    out.chits -= n * price;
  };
  buy('cyrite', v.cyrite, Math.min(TANK_MAX, v.jumpCost), v.rush ?? 1);
  buy('supplies', v.supplies, Math.min(v.supplyMax ?? SUPPLIES_MAX, SUPPLIES_TARGET));
  buy('plate', v.plates, v.maxPlates);
  buy('cyrite', v.cyrite + out.cyrite, Math.min(TANK_MAX, v.jumpCost * 2));
  return out;
}

/** Is there anything to do? */
export const stopIdle = (s: Stop): boolean => !s.cyrite && !s.supplies && !s.plate;
