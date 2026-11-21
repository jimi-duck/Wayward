// ── each region its own look (space plan step 6) ──────────────────────────
// The regions used to differ mostly by colour. Each now leans the near and middle layers its own way, so the space
// round the ship says where you are before any label does. One row per palette (render/sky.ts PALETTES); the far
// works (farworks.ts LEAN) and the sky's events (phenomena.ts PHENOM) lean by the same index.

export interface Signature {
  /** Ice glitter round the ship: how much (0 none, 1 the usual), and how warm (0 clean ice, 1 metal flakes). */
  glitter: number;
  flakes: number;
  /** Rubble streams: how many against the usual, and whether they all run one way, long and quick (pulled toward something). */
  streams: number;
  pull: boolean;
  /** Middle-distance banks: how thick against the usual, the share that are dark dust or smoke, and glow from within. */
  banks: number;
  dark: number;
  inner: number;
  /** Lane markers: blink in step (ordered space) or a chase; teal and amber in turn (port lamps); their colour. */
  laneStep: boolean;
  laneAlt: boolean;
  lane: [number, number, number];
}

const WARM: [number, number, number] = [1.0, 0.86, 0.62];
const BASE: Signature = { glitter: 1, flakes: 0, streams: 1, pull: false, banks: 1, dark: 0.33, inner: 0, laneStep: false, laneAlt: false, lane: WARM };

const SIGNATURES: Signature[] = [
  // the Reach: order. Clean ice that glitters, few loose streams, cool lane lights blinking in step
  { ...BASE, glitter: 1.6, streams: 0.7, laneStep: true, lane: [0.78, 0.95, 1.05] },
  // the Marches: farmed rock and raids. Smoke banks, warm convoy lights chasing down their lanes
  { ...BASE, glitter: 0.8, flakes: 0.2, dark: 0.5 },
  // the Hollows: nothing human. Gas that glows faintly from within, little ice, no lights at all (phenomena has no traffic here)
  { ...BASE, glitter: 0.4, streams: 0.7, dark: 0.2, inner: 0.35 },
  // arcade extras
  BASE,
  BASE,
  // the Salvage Belt: wreck fields. Metal flakes glinting in the dust, more rubble
  { ...BASE, glitter: 1.4, flakes: 1, streams: 1.35 },
  // the Drift Deep: dark and sparse. Thin cold dust, few streams, the little ice there is
  { ...BASE, glitter: 0.5, streams: 0.5, banks: 0.6 },
  // the Breaker Yards: cutting smoke and loose plate glinting
  { ...BASE, glitter: 1.1, flakes: 0.8, dark: 0.55 },
  // the Free Ports: the busiest lanes, port lamps teal and amber in turn
  { ...BASE, glitter: 0.8, flakes: 0.3, banks: 1.1, laneAlt: true },
  // the Last Lanes: torn space. Rubble pulled in long streams one way, toward the Threshold; gas lit faintly from inside
  { ...BASE, glitter: 0.6, streams: 1.4, pull: true, banks: 0.8, dark: 0.4, inner: 0.15 },
];

/** The signature for a sky's palette (the arcade's and unknown ones get the plain look). */
export function signatureOf(palette: number | undefined): Signature {
  return SIGNATURES[palette ?? -1] ?? BASE;
}
