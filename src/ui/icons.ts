import type { Branch } from '../content/upgrades';
import { branchLevels, type Levels } from '../sim/build';

// ── icons ─────────────────────────────────────────────────────────────────
// The HUD's line icons for the ship's systems (the sprite in index.html),
// shared by the HUD and the refit bay.

/** The HUD's icon for each branch. */
export const ICON: Record<Branch, string> = {
  laser: 'i-laser', torpedo: 'i-torp', mine: 'i-mine', plasma: 'i-plasma', close: 'i-arc', mobility: 'i-engine',
  defence: 'i-shield', utility: 'i-rock', overcharge: 'i-core', synergy: 'i-link', salvage: 'i-capital',
};
/** Lasers and the reactor come fitted from the yard, so they count from level 1, as on the HUD. */
const STOCK = new Set<Branch>(['laser', 'overcharge']);

export function systemLevel(levels: Levels, b: Branch): number {
  return branchLevels(levels, b) + (STOCK.has(b) ? 1 : 0);
}

export function icon(id: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}
