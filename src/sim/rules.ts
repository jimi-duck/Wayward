import type { Levels } from './build';

// ── rules of the ground ───────────────────────────────────────────────────
// Small functions the world and the missions share about what the sky does to
// the hunt. The regions' numbers are data (content/profiles.ts Rules); the
// reasons are in docs/ENVIRONMENT.md.

/**
 * How fast the hunt's clock runs where the ship is. Cover (a shroud, rubble) slows it: the pursuit comes later and
 * the heat climbs slower, at the price of the ship's own sensors. In clear space it runs at the region's `watch`
 * rate (the Breaker Yards are watched; elsewhere 1).
 */
export const coverRate = (conceal: number, watch = 1): number => (conceal < 0.999 ? conceal : watch);

/**
 * How well the ship passes for something else: 1 is as seen, down to a quarter with a spoofer, a ghost echo and
 * baffles fitted. Patrols read the hold slower (sneak), and a claim crew takes longer to notice (sim/world.ts).
 */
export function stealthOf(L: Levels): number {
  return Math.max(0.25, 1 - 0.28 * (L.md_spoofer ?? 0) - 0.2 * (L.md_ghost ?? 0) - 0.12 * (L.md_baffles ?? 0));
}

/**
 * What a Signals fit does about the sky, once it is sampled: a long-range array wins back some of the sight and
 * lock that dust and shrouds take, and a jammer filters part of a static field's navigation interference. Without
 * either, the sky is as it is, so the same system is flown differently with a Signals fit.
 */
export const ARRAY_BACK = 0.4;
export const JAMMER_CUT = 0.35;
export function easeSky(L: Levels, a: { sight: number; lock: number; jam: number }): void {
  if (L.md_array) { a.sight += (1 - a.sight) * ARRAY_BACK; a.lock += (1 - a.lock) * ARRAY_BACK; }
  if (L.md_jammer) a.jam *= 1 - JAMMER_CUT;
}

/** How patient claimed ground is with a ship: friends of the claimant are let linger, enemies are not (standing -2..2). */
export const claimPatience = (standing: number): number => 1 + 0.25 * Math.max(-2, Math.min(2, standing));
