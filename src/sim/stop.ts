import { SUPPLIES_MAX } from './breakout';
import type { Prices } from '../content/systems';

// ── the sensible stop ─────────────────────────────────────────────────────
// What a port does for you when you ask for the default, the way Auto-refit
// does in the bay: the tank up to the jump first (the one thing the lane
// needs), then supplies for a couple of lanes, then the hull whole, all from
// the purse. It is a plan first (so the port can show what it would do) and
// then runs through the ship's own buy, so the prices and the limits stay in
// one place.

/** Supplies worth holding: two long lanes and the drive's wear over. */
export const SUPPLIES_TARGET = 10;

/** What the plan reads of the ship and the port. */
export interface StopView { cyrite: number; prices: Prices; jumpCost: number; fuel: number; fluidPrice: number; supplies: number; plates: number; maxPlates: number; supplyMax?: number }

/** What the stop would do: how many of each bought, and what it costs in Cyrite (a negative `cyrite`). */
export interface Stop { fuel: number; supplies: number; plate: number; cyrite: number }

export function planStop(v: StopView): Stop {
  let spare = Math.max(0, v.cyrite);
  const out: Stop = { fuel: 0, supplies: 0, plate: 0, cyrite: 0 };
  // the tank to the jump, as far as the purse goes
  const units = Math.max(0, Math.min(Math.ceil(v.jumpCost - v.fuel), Math.floor(spare / v.fluidPrice)));
  out.fuel = units;
  spare -= units * v.fluidPrice;
  out.cyrite -= units * v.fluidPrice;
  const buy = (item: 'supplies' | 'plate', have: number, want: number) => {
    const price = v.prices[item];
    const n = Math.max(0, Math.min(want - have, Math.floor(spare / price)));
    out[item] += n;
    spare -= n * price;
    out.cyrite -= n * price;
  };
  buy('supplies', v.supplies, Math.min(v.supplyMax ?? SUPPLIES_MAX, SUPPLIES_TARGET));
  buy('plate', v.plates, v.maxPlates);
  return out;
}

/** Is there anything to do? */
export const stopIdle = (s: Stop): boolean => !s.fuel && !s.supplies && !s.plate;
