import type { SortieDef } from './breakout';

// ── which living sites a system gets ──────────────────────────────────────
// Every stop on the road should look and play differently, so the built things
// follow what the stop is, not whether it has a set piece: a mining stop has its
// barge and a den, a transit or contested stop its gantry (a den where the Gutter
// holds), a Dust Traders port its market, any other port a gantry, a Thren sky its
// seed. Not the opening, the first system past Cerro (hand-laid), or a gate (its
// own set piece). Plain data; the world builds what this says (docs/SITES.md).

export interface Living { barge: boolean; den: boolean; gantry: boolean; market: boolean; seed: boolean }

/** The hunt of Thren at which a seed grows. */
export const SEED_THREN = 0.07;
/** The Thren of a sky so thick that nothing else is built in it. */
export const THREN_SKY = 0.3;

export function livingOf(d: SortieDef): Living {
  const none: Living = { barge: false, den: false, gantry: false, market: false, seed: false };
  if (d.home || d.first || d.kind === 'gate') return none;
  const thick = (d.thren ?? 0) > THREN_SKY;
  const out: Living = { ...none };
  out.seed = (d.thren ?? 0) >= SEED_THREN;
  if (thick) return out;
  if (d.kind === 'mining') { out.barge = true; out.den = true; }
  else if (d.kind === 'contested') { if (d.holder === 'gutter') out.den = true; else out.gantry = !d.safe; }
  else if (d.kind === 'transit') out.gantry = !d.safe;
  if (d.port !== undefined) { if (d.holder === 'guild') out.market = true; else if (!out.gantry && !out.barge && !out.den && !d.safe) out.gantry = true; }
  // the Dust Traders' raft also trades off a mining stop they hold
  if (d.holder === 'guild' && d.kind === 'mining') out.market = true;
  return out;
}
