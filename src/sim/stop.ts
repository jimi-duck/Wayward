import { FOOD_MAX, TANK_MAX } from './breakout';
import type { Prices } from '../content/systems';

// ── the sensible stop ─────────────────────────────────────────────────────
// What a port does for you when you ask for the default, the way Auto-refit
// does in the bay: sell the hold, then spend what the chits reach, most
// pressing first: Cyrite for the jump, food for a couple of lanes, the hull
// whole, and Cyrite for a second jump. It is a plan first (so the port can
// show what it would do) and then runs through the ship's own sell and buy,
// so the prices and the limits stay in one place.

/** Food worth holding: two long lanes and a day over. */
export const FOOD_TARGET = 6;

/** What the plan reads of the ship and the port. */
export interface StopView { ore: number; chits: number; prices: Prices; cyrite: number; jumpCost: number; food: number; plates: number; maxPlates: number }

/** What the stop would do: the hold sold, and how many of each bought. */
export interface Stop { sell: boolean; cyrite: number; food: number; plate: number; chits: number }

export function planStop(v: StopView): Stop {
  const got = v.ore * v.prices.ore;
  let chits = v.chits + got;
  const out: Stop = { sell: v.ore > 0, cyrite: 0, food: 0, plate: 0, chits: got };
  const buy = (item: 'cyrite' | 'food' | 'plate', have: number, want: number) => {
    const n = Math.max(0, Math.min(want - have, Math.floor(chits / v.prices[item])));
    out[item] += n;
    chits -= n * v.prices[item];
    out.chits -= n * v.prices[item];
  };
  buy('cyrite', v.cyrite, Math.min(TANK_MAX, v.jumpCost));
  buy('food', v.food, Math.min(FOOD_MAX, FOOD_TARGET));
  buy('plate', v.plates, v.maxPlates);
  buy('cyrite', v.cyrite + out.cyrite, Math.min(TANK_MAX, v.jumpCost * 2));
  return out;
}

/** Is there anything to do? */
export const stopIdle = (s: Stop): boolean => !s.sell && !s.cyrite && !s.food && !s.plate;
