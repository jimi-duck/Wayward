import { SUPPLIES_MAX } from './breakout';
import type { Prices } from '../content/systems';

// ── the sensible stop ─────────────────────────────────────────────────────
// What a port does for you when you ask for the default, the way Auto-refit
// does in the bay: spend what the Cyrite reaches beyond the jump, most
// pressing first: supplies for a couple of lanes, then the hull whole. It
// never spends the jump's own Cyrite. It is a plan first (so the port can
// show what it would do) and then runs through the ship's own buy, so the
// prices and the limits stay in one place.

/** Supplies worth holding: two long lanes and the drive's wear over. */
export const SUPPLIES_TARGET = 10;

/** What the plan reads of the ship and the port. */
export interface StopView { cyrite: number; prices: Prices; jumpCost: number; supplies: number; plates: number; maxPlates: number; supplyMax?: number }

/** What the stop would do: how many of each bought, and what it costs in Cyrite (a negative `cyrite`). */
export interface Stop { supplies: number; plate: number; cyrite: number }

export function planStop(v: StopView): Stop {
  let spare = Math.max(0, v.cyrite - v.jumpCost);
  const out: Stop = { supplies: 0, plate: 0, cyrite: 0 };
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
export const stopIdle = (s: Stop): boolean => !s.supplies && !s.plate;
