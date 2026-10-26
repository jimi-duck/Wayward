import type { Row } from '../../sim/script';

// ── The Reach: chapter script ──────────────────────────────────────────────
// One row per beat, stop by stop, word for word from "The Reach: Chapter
// Script" (docs/ROAD.md). The text is English; the world runs it through t().
// This file has Northfold only; the other stops follow in their own pull
// requests.

const SAM = 'Sam Okoro';

export const REACH: Row[] = [
  // ── Stop 1 · Northfold (landfall) ──
  { id: 'nf_notice', stop: 'northfold', on: { on: 'arrive' }, do: { notice: { tone: 'teal', headline: 'Northfold', reason: 'Kellern space, quiet crossing' } } },
  { id: 'nf_objective', stop: 'northfold', on: { on: 'arrive' }, do: { objective: { main: 'Next: Halden’s Reach · find the Warden’s record', quiet: 'The Narrows · 7 jumps' } } },
  { id: 'nf_sam_1', stop: 'northfold', on: { on: 'free' }, do: { radio: { from: SAM, caller: 'miners', text: '“Every lane out of here is watched but one. Whoever left you that message picked a quiet one.”' } } },
  { id: 'nf_sam_2', stop: 'northfold', on: { on: 'after', row: 'nf_sam_1' }, do: { radio: { from: SAM, caller: 'miners', text: '“My signal won’t reach past the Narrows. Make the most of me while you can.”' } } },
  { id: 'nf_gate', stop: 'northfold', on: { on: 'leave' }, do: { objective: { main: 'Jump to Halden’s Reach' } } },
];
