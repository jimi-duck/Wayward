import { Color } from 'three';
import type { Faction } from '../sim/enemies';

// ── one look for the whole game ──────────────────────────────────────────
// The paint, trim and glow of every faction's hulls in one table, and the
// emissive ceilings the rest of the renderer keeps under (docs/VISUAL-OVERHAUL.md).
// A hull is a painted coat chipped to dark metal at the edges, the way the
// Wayward is; the faction is told by the coat, the trim line and the engines.

export interface HullLook {
  /** The bare structure: dark metal under the paint, seen in seams and where the paint is gone. */
  base: number;
  /** The main coat on armour plates. */
  paint: number;
  /** A replacement or older coat: a patched panel, a second colour. */
  patch: number;
  /** The darker undercoat of machinery. */
  under: number;
  /** The trim line, stripes and markings. */
  trim: number;
  /** Hard use, 0 to 1 (wear.ts). */
  worn: number;
}

// Each faction's hulls are dark structure with its coat on the armour: the
// colour sits on plates, so a silhouette shows its construction.
export const HULL_LOOK: Record<Faction, HullLook> = {
  gutter: { base: 0x2f2420, paint: 0x9a5430, patch: 0x8d8272, under: 0x3a2f2a, trim: 0x9c2c1e, worn: 1 },
  custody: { base: 0x292823, paint: 0xb59a54, patch: 0x7c7248, under: 0x35332c, trim: 0x8c3a24, worn: 0.6 },
  office: { base: 0x1d2724, paint: 0x587a69, patch: 0x9ab5a6, under: 0x28332f, trim: 0x2f7a5c, worn: 0.4 },
  voice: { base: 0x151918, paint: 0x2f3735, patch: 0x45544d, under: 0x1e2321, trim: 0x2d6a46, worn: 0.8 },
  thren: { base: 0x2b2231, paint: 0xa6895c, patch: 0x5e4f72, under: 0x30263a, trim: 0xd0902a, worn: 0.3 },
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
