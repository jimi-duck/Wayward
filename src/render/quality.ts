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
  /** Multisampling. Fixed at startup: WebGL cannot drop it without a new context. */
  msaa: boolean;
}

// Bloom resolution, shadow map size and particle budgets join these as the
// effects that use them land (M3, M4).
export const TIERS: readonly QualityTier[] = [
  { name: 'low', dprCap: 1, msaa: false },
  { name: 'medium', dprCap: 1.25, msaa: false },
  { name: 'high', dprCap: 1.5, msaa: true },
];

const EMA = 0.05;
const SETTLE = 180; // samples before a verdict: three seconds at 60fps
const STALL = 0.05; // longer frames are stalls, not measurements
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
