import type { Faction } from '../sim/enemies';

// ── one look for the whole game ──────────────────────────────────────────
// The paint, trim and glow of every faction's hulls in one table, and the
// emissive ceilings the rest of the renderer keeps under (docs/ART-PASS.md).
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
  // Custody: navy enamel on gunmetal, white and orange warning decals
  custody: { base: 0x232830, paint: 0x1f3a5f, patch: 0xb9b6ac, under: 0x1a1e25, trim: 0xd8672a, worn: 0.45 },
  // Gutter: oxidised iron, rust plate, scuffed industrial yellow, hazard stripes
  gutter: { base: 0x3a3532, paint: 0xa84b1b, patch: 0xc9941f, under: 0x2a2522, trim: 0xd99b26, worn: 1 },
  // Office: carbon composite and cold slate, a cold-white diagnostic line, nothing else
  office: { base: 0x141416, paint: 0x2b2d33, patch: 0x363840, under: 0x0e0e10, trim: 0xe6eaf0, worn: 0.2 },
  // Voice: blackened iron with tarnished brass, a furnace-orange seam
  voice: { base: 0x1c1917, paint: 0x8c6d3b, patch: 0x5a4627, under: 0x120f0e, trim: 0xc4501a, worn: 0.8 },
  // Thren: obsidian under violet and pearl teal, magenta in the veins
  thren: { base: 0x17111f, paint: 0x3b185f, patch: 0x0e8388, under: 0x100b18, trim: 0xe024c3, worn: 0.3 },
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

