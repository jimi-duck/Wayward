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
