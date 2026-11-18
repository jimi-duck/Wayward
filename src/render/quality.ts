// ── an honest frame budget ─────────────────────────────────────────────────
// Ported from budget() in the original. Rather than guess which devices can
// afford what, the run measures itself: a rolling average of the frame
// interval, sampled only on frames that were really drawn (a stalled tab is
// not a measurement), and if it settles below about 48fps the game drops one
// tier.
//
// It steps back up, carefully: after half a minute of frames that keep up with
// the display (steady, with room to spare) it asks for the tier above, and the
// page makes the change only at a quiet moment (a pop-up or the pause card), so
// the picture never shifts in flight. A tier that then proves too slow becomes
// the device's ceiling, kept with the tier itself, so it is never tried again
// and the picture does not flicker between two tiers.
//
// One case the original never met, because it only ran on desktop browsers:
// iOS Low Power Mode, and some Android battery savers, cap the display at
// 30fps. Steady 30fps intervals mean the frame already fits; stepping down
// would cost picture and buy nothing. An overloaded GPU does not produce
// steady intervals, it produces jitter, so steady-at-the-cap holds the tier.

type TierName = 'low' | 'phone' | 'medium' | 'high';

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
  /** The nebula's moving detail tile (two more texture reads on every sky pixel). */
  skyDetail: boolean;
}

// Bloom resolution, shadow map size and particle budgets join these as the
// effects that use them land (M3, M4).
// Phone sits between Low and Medium (docs/PERF.md pass 14): the look of Medium (bloom, grade, mood, shadows) at
// one pixel per CSS pixel, without the sky's detail tile and with fewer chips. Phones start there and climb.
export const TIERS: readonly QualityTier[] = [
  { name: 'low', dprCap: 1, msaa: false, smaa: null, shadow: 0, debris: 160, skyDetail: false },
  { name: 'phone', dprCap: 1, msaa: false, smaa: 'low', shadow: 512, debris: 320, skyDetail: false },
  { name: 'medium', dprCap: 1.5, msaa: false, smaa: 'low', shadow: 1024, debris: 480, skyDetail: true },
  { name: 'high', dprCap: 2, msaa: true, smaa: 'high', shadow: 4096, debris: 800, skyDetail: true },
];

const EMA = 0.05;
const SETTLE = 180; // samples before a verdict: three seconds at 60fps
// Longer frames are stalls (a tab switch, a notification), not measurements.
// Generous, so a phone that really runs at 15fps still gets measured.
const STALL = 0.1;
const SLOW = 0.021; // ~48fps
const CAP_30 = 1 / 30;
/** Frames this steady, with this much room, before the tier above is tried: half a minute at 60fps. */
const ROOM = SLOW * 0.85;
const CALM = 0.002;
const UP_AFTER = 1800;

export function tierIndex(name: string | null | undefined): number {
  return TIERS.findIndex((t) => t.name === name);
}

/** A tier this device settled on is kept a fortnight: long enough to start right, short enough that an update or a new browser is judged again. */
const KEEP_MS = 14 * 24 * 3600 * 1000;

/** The tier and ceiling this device settled on last time, if recent. */
export function keptTier(key: string, now = Date.now()): { tier: number; ceil: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null') as { tier?: string; ceil?: number; at?: number } | null;
    const tier = tierIndex(v?.tier);
    if (!v || tier < 0 || typeof v.ceil !== 'number' || typeof v.at !== 'number' || now - v.at > KEEP_MS) return null;
    return { tier, ceil: Math.max(tier, Math.min(TIERS.length - 1, v.ceil)) };
  } catch { return null; }
}

export function saveTier(key: string, tier: TierName, ceil: number): void {
  try { localStorage.setItem(key, JSON.stringify({ tier, ceil, at: Date.now() })); } catch { /* not kept */ }
}

export class QualityGovernor {
  private index: number;
  private avg = 0;
  private jitter = 0;
  private samples = 0;
  private grace = 0;
  private steady = 0;
  private locked: boolean;
  /** The highest tier this device may try (a tier that proved too slow is never tried again). */
  private ceil: number;

  constructor(start: number, locked = false, ceiling = TIERS.length - 1) {
    this.ceil = Math.max(0, Math.min(TIERS.length - 1, ceiling));
    this.index = Math.max(0, Math.min(this.ceil, start));
    this.locked = locked;
  }

  /** Pin a tier and stop the governor judging (battery saver), or `null` to let it judge again from where it is. */
  pin(index: number | null): void {
    if (index !== null) this.index = Math.max(0, Math.min(TIERS.length - 1, index));
    this.locked = index !== null;
    this.samples = 0;
    this.steady = 0;
  }

  get tier(): QualityTier {
    return TIERS[this.index]!;
  }

  get ceiling(): number {
    return this.ceil;
  }

  /** Smoothed frame interval in seconds, for the debug readout. */
  get average(): number {
    return this.avg;
  }

  /** Half a minute with room to spare: the tier above may be tried at the next quiet moment. */
  get wantsUp(): boolean {
    return !this.locked && this.index < this.ceil && this.steady >= UP_AFTER;
  }

  /** Try the tier above (the page calls this at a quiet moment). Returns true when it moved. */
  stepUp(): boolean {
    if (!this.wantsUp) return false;
    this.index++;
    this.samples = 0;
    this.steady = 0;
    return true;
  }

  /** Skip the next `frames` samples: a new sky or a closed panel makes a few slow frames that are not the machine. */
  hold(frames: number): void {
    this.grace = Math.max(this.grace, frames);
  }

  /** Feed one raw frame interval. Returns true when the tier just dropped. */
  sample(dt: number): boolean {
    if (!(dt > 0) || dt > STALL) { this.steady = 0; return false; }
    if (this.grace > 0) { this.grace--; return false; }
    // A tier change restarts the measurement: the new tier is a new machine.
    if (this.samples++ === 0) {
      this.avg = dt;
      this.jitter = 0;
    } else {
      this.avg += (dt - this.avg) * EMA;
      this.jitter += (Math.abs(dt - this.avg) - this.jitter) * EMA;
    }
    // room to spare: keeping up with the display, steadily (a 30fps cap is not room)
    if (this.samples >= SETTLE && this.avg <= ROOM && this.jitter < CALM) this.steady++;
    else this.steady = 0;
    if (this.locked || this.index === 0 || this.samples < SETTLE) return false;
    if (this.avg <= SLOW || this.cappedAt30()) return false;
    this.index--;
    // too slow here: never try this tier again on this device
    this.ceil = Math.min(this.ceil, this.index);
    this.samples = 0;
    this.steady = 0;
    return true;
  }

  private cappedAt30(): boolean {
    return Math.abs(this.avg - CAP_30) < 0.003 && this.jitter < 0.003;
  }
}
