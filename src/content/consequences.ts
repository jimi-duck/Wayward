import type { Holder } from './systems';

// ── what a choice goes on costing ─────────────────────────────────────────
// A story answer sets a flag, and the flag used to do nothing until the
// ending. Each row here gives one of those flags a mid-run effect, with a
// price, so a choice reads as a trade the whole way: what it brings and what
// it costs show as chips on the choice (sim/gains.ts), then the effect shows
// in the log where it bites (sim/consequences.ts). None locks anything: a
// cost is dearer, not shut.

export interface Consequence {
  flag: string;
  /** The chips on the choice that sets it: what it brings, then what it costs (a minus sign marks the cost). */
  chips: string[];
  /** What a port charges for plates, by who holds it (1 is the usual price). */
  plates?: Partial<Record<Holder, number>>;
  /** Where one of these is present: the heat starts this much lower; everywhere else the pursuit from ahead is this much heavier. */
  near?: { here: string; heat: number; elsewhere: number };
  /** The share of the pursuit from ahead, everywhere or by who holds the system. */
  ahead?: number;
  aheadAt?: Partial<Record<Holder, number>>;
  /** Days Calloway is held up at every jump. */
  delay?: number;
  /** What the log says when it bites on arrival, and where. */
  lines: Array<{ holder?: Holder; here?: string; text: string }>;
}

export const CONSEQUENCES: Consequence[] = [
  {
    flag: 'pact_holdfast', chips: ['Free plates at Holdfasts', '−Guild prices'], plates: { holdfast: 0, guild: 1.25 },
    lines: [
      { holder: 'holdfast', text: 'Kessel Hold patches your plates for free' },
      { holder: 'guild', text: 'The Guild marks plates up · you stood with the Holdfasts' },
    ],
  },
  {
    flag: 'pact_drift', chips: ['Calm near the Drift', '−Gutter hunters'], near: { here: 'drift', heat: -0.1, elsewhere: 0.1 },
    lines: [{ here: 'drift', text: 'The Long Walk keeps watch · the Custody holds off' }],
  },
  { flag: 'broker', chips: ['−Gutter hunters'], ahead: 0.15, lines: [] },
  { flag: 'lane_keys', chips: ['Calloway delayed', '−Voice hunters'], delay: 1, aheadAt: { voice: 0.15, thren: 0.15 }, lines: [] },
];
