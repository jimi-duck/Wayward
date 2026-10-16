// ── an honest frame budget ─────────────────────────────────────────────────
// Ported from budget() in the original. Rather than guess which devices can
// afford what, the run measures itself: a rolling average of the frame
// interval, sampled only on frames that were really drawn (a stalled tab is
// not a measurement), and if it settles below about 48fps the game drops one
// tier. It never steps back up: a picture that flickers between two tiers as
// the field thins is worse than either tier.
//
// One case the original never met, because it only ran on desktop browsers:
// iOS Low Power Mode, and some Android battery savers, cap the display at
// 30fps. Steady 30fps intervals mean the frame already fits; stepping down
// would cost picture and buy nothing. An overloaded GPU does not produce
// steady intervals, it produces jitter, so steady-at-the-cap holds the tier.

export type TierName = 'low' | 'medium' | 'high';

export interface QualityTier {
  name: TierName;
  /** Ceiling on devicePixelRatio. The original capped at 1.5 everywhere. */
  dprCap: number;
  /** Hardware multisampling on the direct canvas (unused: no tier asks for it; SMAA below is what smooths edges). */
  msaa: boolean;
  /** Post-chain edge smoothing: a light SMAA on Medium, the full one on High, none on Low. */
  smaa: 'low' | 'high' | null;
  /** Size of the sun's shadow map around the ship (0: no shadows). */
  shadow: number;
  /** Small stone chips drawn between the big rocks (0 hides the layer). */
  debris: number;
}

// Bloom resolution, shadow map size and particle budgets join these as the
// effects that use them land (M3, M4).
export const TIERS: readonly QualityTier[] = [
  { name: 'low', dprCap: 1, msaa: false, smaa: null, shadow: 0, debris: 160 },
  { name: 'medium', dprCap: 1.25, msaa: false, smaa: 'low', shadow: 512, debris: 360 },
  { name: 'high', dprCap: 1.5, msaa: true, smaa: 'high', shadow: 1024, debris: 560 },
];

const EMA = 0.05;
const SETTLE = 180; // samples before a verdict: three seconds at 60fps
// Longer frames are stalls (a tab switch, a notification), not measurements.
// Generous, so a phone that really runs at 15fps still gets measured.
const STALL = 0.1;
const SLOW = 0.021; // ~48fps
const CAP_30 = 1 / 30;

export function tierIndex(name: string | null | undefined): number {
  return TIERS.findIndex((t) => t.name === name);
}

export class QualityGovernor {
  private index: number;
  private avg = 0;
  private jitter = 0;
  private samples = 0;
  private readonly locked: boolean;

  constructor(start: number, locked = false) {
    this.index = Math.max(0, Math.min(TIERS.length - 1, start));
    this.locked = locked;
  }

  get tier(): QualityTier {
    return TIERS[this.index]!;
  }

  /** Smoothed frame interval in seconds, for the debug readout. */
  get average(): number {
    return this.avg;
  }

  /** Feed one raw frame interval. Returns true when the tier just dropped. */
  sample(dt: number): boolean {
    if (!(dt > 0) || dt > STALL) return false;
    // A tier change restarts the measurement: the new tier is a new machine.
    if (this.samples++ === 0) {
      this.avg = dt;
      this.jitter = 0;
    } else {
      this.avg += (dt - this.avg) * EMA;
      this.jitter += (Math.abs(dt - this.avg) - this.jitter) * EMA;
    }
    if (this.locked || this.index === 0 || this.samples < SETTLE) return false;
    if (this.avg <= SLOW || this.cappedAt30()) return false;
    this.index--;
    this.samples = 0;
    return true;
  }

  private cappedAt30(): boolean {
    return Math.abs(this.avg - CAP_30) < 0.003 && this.jitter < 0.003;
  }
}
