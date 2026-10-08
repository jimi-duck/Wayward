import { Color } from 'three';
import type { Faction } from '../sim/enemies';

// ── one look for the whole game ──────────────────────────────────────────
// The paint, trim and glow of every faction's hulls in one table, and the
// emissive ceilings the rest of the renderer keeps under (docs/VISUAL-OVERHAUL.md).
// A hull is a painted coat chipped to dark metal at the edges, the way the
// Wayward is; the faction is told by the coat, the trim line and the engines.

export interface HullLook {
  /** The main coat. */
  paint: number;
  /** The darker undercoat, panels and machinery. */
  under: number;
  /** The trim line and stripes. */
  trim: number;
  /** Hard use, 0 to 1 (wear.ts). */
  worn: number;
}

export const HULL_LOOK: Record<Faction, HullLook> = {
  gutter: { paint: 0x8a5a42, under: 0x4a3a34, trim: 0x9c3a22, worn: 1 },
  custody: { paint: 0xa89460, under: 0x5a5038, trim: 0x8c3a24, worn: 0.6 },
  office: { paint: 0x56725f, under: 0x34423c, trim: 0x7aa890, worn: 0.4 },
  voice: { paint: 0x3a403d, under: 0x1e2220, trim: 0x2f6a48, worn: 0.8 },
  thren: { paint: 0xa8885a, under: 0x5a4a34, trim: 0x8a52b0, worn: 0.3 },
};

/** Emissive ceilings (linear, before tone mapping). Nothing but a weapon or a drive goes above `core`. */
export const GLOW = {
  /** Trim and panel lights: seen, never bloomed. */
  trim: 0.5,
  /** Lamps and running lights. */
  lamp: 1.6,
  /** Drives, shots, a hot core. */
  core: 3.6,
};

export const tintOf = (n: number): Color => new Color(n);
