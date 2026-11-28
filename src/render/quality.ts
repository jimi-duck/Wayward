// ── an honest frame budget ─────────────────────────────────────────────────
// Ported from budget() in the original. Rather than guess which devices can
// afford what, the run measures itself: a rolling average of the frame
// interval, sampled only on frames that were really drawn (a stalled tab is
// not a measurement), and if it settles below about 48fps for three seconds the
// game first draws smaller (a phone, or a computer with a high-density screen:
// SCALES, WIDE), then drops one tier.
//
// It steps back up, carefully: after half a minute of frames that keep up with
// the display (steady, with room to spare) it asks for the tier above, and the
// page makes the change only at a quiet moment (a pop-up or the pause card), so
// the picture never shifts in flight. A tier that then proves too slow becomes
// the ceiling for the rest of the visit, so the picture does not flicker
// between two tiers. What a visit keeps is only the start-up screen's verdict,
// and each launch tries one step better than it, so a bad moment never sticks
// (docs/PERF.md pass 31).
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
  /** Hardware multisampling on the direct canvas. Only Low draws straight to the canvas, so only Low uses it; the post chain's SMAA or FXAA smooths every other tier. */
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
// Phone sits between Low and Medium (docs/PERF.md pass 14): the look of Medium (bloom, grade, mood, shadows)
// without the sky's detail tile and with fewer chips. Phones start there and climb. It draws at up to 1.5 pixels per
// CSS pixel (pass 16): at 1 a 3x phone stretched every pixel three times, which read as blocky; a slow phone breathes
// back down to about 1 (SCALES) before it gives up the tier.
export const TIERS: readonly QualityTier[] = [
  { name: 'low', dprCap: 1, msaa: true, smaa: null, shadow: 0, debris: 160, skyDetail: false },
  { name: 'phone', dprCap: 1.5, msaa: false, smaa: 'low', shadow: 1024, debris: 320, skyDetail: false },
  { name: 'medium', dprCap: 1.5, msaa: false, smaa: 'low', shadow: 1024, debris: 480, skyDetail: true },
  { name: 'high', dprCap: 2, msaa: true, smaa: 'high', shadow: 4096, debris: 800, skyDetail: true },
];

const EMA = 0.05;
/** Seconds of measured frames before a verdict. In seconds, not frames: at 19fps a count of 180 frames took ten. */
const SETTLE = 3;
/** The verdict window while the start-up screen hides the picture (`quick`): a held, still scene gives steady frames sooner. */
const SETTLE_QUICK = 1;
// Longer frames are stalls (a tab switch, a notification), not measurements.
// Generous, so a phone that really runs at 15fps still gets measured.
const STALL = 0.1;
/** This many stalls in a row are not stalls: the machine is that slow, and each counts as a STALL-long frame. */
const RUN = 20;
const SLOW = 0.021; // ~48fps
const CAP_30 = 1 / 30;
/** Seconds this steady, with this much room, before the size or tier above is tried. */
const ROOM = SLOW * 0.85;
const CALM = 0.002;
const UP_AFTER = 30;
/** After the governor moves, the first frames pay for new buffers or shaders, not for the new size: skip them. */
const SETTLE_MOVE = 0.5;
/** The same behind the start-up screen: the frames there are a held scene, and nobody is waiting to fly. */
const SETTLE_MOVE_QUICK = 0.3;

export function tierIndex(name: string | null | undefined): number {
  return TIERS.findIndex((t) => t.name === name);
}

/**
 * The shape of the kept record: 4 since it holds only the start-up screen's verdict, with no ceiling. Records of 3 were
 * written after every move in play, so one heavy fight could keep a device low for a fortnight (docs/PERF.md pass 31).
 */
const KEPT = 4;

/** A tier this device settled on is kept a fortnight: long enough to start right, short enough that an update or a new browser is judged again. */
const KEEP_MS = 14 * 24 * 3600 * 1000;

/** Where the governor stands: a tier, the pixels per CSS pixel it draws, and whether it holds an even 30. */
export interface TierState { tier: number; dpr?: number; thirty?: boolean }

/** The tier and drawing size (pixels per CSS pixel) the start-up screen settled on last time, if recent. */
export function keptTier(key: string, now = Date.now()): TierState | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null') as { tier?: string; at?: number; dpr?: number; thirty?: boolean; v?: number } | null;
    const tier = tierIndex(v?.tier);
    if (!v || tier < 0 || typeof v.at !== 'number' || now - v.at > KEEP_MS) return null;
    // an older record (KEPT) may carry a low moment from play: judged again from the top, as a private window would be
    if (v.v !== KEPT) return null;
    const dpr = typeof v.dpr === 'number' && v.dpr > 0 && v.dpr <= 4 ? v.dpr : undefined;
    return { tier, ...(dpr ? { dpr } : {}), ...(v.thirty === true ? { thirty: true } : {}) };
  } catch { return null; }
}

/**
 * Keep the start-up screen's verdict (the tier, drawing size and whether it holds an even 30), so the next launch starts
 * there rather than spending its first seconds finding it again. Moves made in play are not kept: they last the visit.
 */
export function saveTier(key: string, tier: TierName, dpr?: number, thirty = false): void {
  try { localStorage.setItem(key, JSON.stringify({ tier, at: Date.now(), v: KEPT, ...(dpr ? { dpr: Math.round(dpr * 1000) / 1000 } : {}), ...(thirty ? { thirty } : {}) })); } catch { /* not kept */ }
}

/** The drawing scales a phone steps through before it gives up a tier (docs/PERF.md pass 15). */
export const SCALES = [1, 0.85, 0.75, 0.67] as const;
/**
 * A computer's drawing scales (docs/PERF.md pass 18). On a high-density screen High draws two pixels per CSS pixel,
 * four times the work of one; a laptop GPU short of time draws a little smaller first, down to one pixel per CSS
 * pixel at the least, keeping every effect, before it gives up a tier. A screen of one pixel per CSS pixel has no
 * steps: it drops a tier as before.
 */
export const WIDE = [1, 0.85, 0.75, 0.67, 0.5] as const;
/**
 * The least a computer draws on Low, in pixels per CSS pixel: three quarters. Half was tried (pass 23); once the rock
 * shader was cheap it bought Chrome on an M1 little, and the owner found the picture blurry (docs/PERF.md pass 27).
 */
const LOW_FLOOR = 0.74;
/**
 * How much faster a computer's frames must come once it draws smaller, or the size is put back: drawing a quarter of the
 * pixels bought Chrome on an M1 only 20 to 24 fps once its rock shader was cheap (docs/PERF.md pass 26), a blurred picture
 * for nothing. A smaller size that reaches an even 30 is kept whatever it bought.
 */
const PAYS = 1.3;

export class QualityGovernor {
  private index: number;
  /** Where in the drawing scales the size stands (SCALES on a phone, WIDE on a computer). */
  private step = 0;
  /** The smallest step the size may climb back to on this tier: a size tried and found slow is not tried again. */
  private top = 0;
  /** The size reached its step by climbing (so a verdict there means the climb failed). */
  private climbed = false;
  /** Judge on a shorter window: the start-up screen is up and the world is held, so nobody sees the steps (main.ts). */
  quick = false;
  /** Nothing left to give that pays (the lowest tier, or a lower one bought too little): hold an even 30 rather than judder. */
  thirty = false;
  /** The last step down in size, and the frame it was taken from, until the new size has been judged. */
  private tried: { from: number; avg: number; tier?: number; ceil?: number } | null = null;
  /** Drawing smaller bought too little on this tier: the size stays, and the next verdict moves the tier. */
  private flat = false;
  /** Where the governor stood before the start-up screen tried one step better, until that step has been judged. */
  private probe_: { index: number; step: number; thirty: boolean } | null = null;
  private avg = 0;
  private jitter = 0;
  private samples = 0;
  /** Seconds measured since the last move. */
  private measured = 0;
  /** Seconds still to skip. */
  private grace = 0;
  /** Seconds of steady frames with room. */
  private steady = 0;
  /** Stalls in a row. */
  private long = 0;
  private locked: boolean;
  /** The highest tier this device may try (a tier that proved too slow is never tried again). */
  private ceil: number;

  /**
   * `breathe`: a phone (its own scales, and an even 30 at the bottom). `screen`: the display's device pixel ratio,
   * which sets how far a computer's drawing size may step down.
   */
  constructor(start: number, locked = false, ceiling = TIERS.length - 1, private readonly breathe = false, private readonly screen: () => number = () => 1) {
    this.ceil = Math.max(0, Math.min(TIERS.length - 1, ceiling));
    this.index = Math.max(0, Math.min(this.ceil, start));
    this.locked = locked;
  }

  /** Pin a tier and stop the governor judging (battery saver), or `null` to let it judge again from where it is. */
  pin(index: number | null): void {
    if (index !== null) this.index = Math.max(0, Math.min(TIERS.length - 1, index));
    this.locked = index !== null;
    this.step = 0;
    this.top = 0;
    this.climbed = false;
    this.thirty = false;
    this.tried = null;
    this.probe_ = null;
    this.flat = false;
    this.restart();
  }

  /**
   * Stand where a launch starts: the last start-up verdict, or `fresh` (a computer's High, a phone's Phone) with nothing
   * kept. Moves made in the last run are dropped, and every tier may be tried again.
   */
  restore(state: TierState | null, fresh: number): void {
    if (this.locked) return;
    this.index = Math.max(0, Math.min(TIERS.length - 1, state ? state.tier : fresh));
    this.ceil = TIERS.length - 1;
    this.step = 0;
    this.top = 0;
    this.climbed = false;
    this.tried = null;
    this.probe_ = null;
    this.flat = false;
    this.thirty = state?.thirty === true;
    if (state?.dpr) this.startAt(state.dpr);
    this.restart();
  }

  /**
   * Behind the start-up screen, try one step better than where it stands: off the even 30, else the size above, else the
   * tier above (no higher than `limit`). The first verdict keeps it, or puts everything back as it was. So a verdict that
   * came from a bad moment heals by a step each launch. Returns true when it moved.
   */
  probe(limit: number): boolean {
    if (this.locked) return false;
    const was = { index: this.index, step: this.step, thirty: this.thirty };
    if (this.thirty) this.thirty = false;
    else if (this.step > 0) this.step--;
    else if (this.index < Math.min(limit, this.ceil)) {
      const dpr = this.dpr();
      this.index++;
      this.enter(dpr);
    } else return false;
    this.probe_ = was;
    this.tried = null;
    this.restart(this.quick ? SETTLE_MOVE_QUICK : SETTLE_MOVE);
    return true;
  }

  /** A step better is still being judged (the start-up screen ran out of time before its verdict). */
  get probing(): boolean {
    return this.probe_ !== null;
  }

  /** A verdict has been reached where it stands, with no step waiting to be judged: the start-up screen may lift. */
  get quiet(): boolean {
    return this.measured >= (this.quick ? SETTLE_QUICK : SETTLE) && !this.tried && !this.probe_;
  }

  /** Hold the governor still for a while (the readout's Test), keeping the size and the even 30 as they are. */
  freeze(on: boolean): void {
    this.locked = on;
    this.tried = null;
    this.restart();
  }

  get tier(): QualityTier {
    return TIERS[this.index]!;
  }

  /** True while a tier is pinned (?quality, the battery saver, the ?perf readout): the governor only watches. */
  get pinned(): boolean {
    return this.locked;
  }

  /** The share of the tier's drawing size in use: 1, or a step down on a device that is short of time. */
  get scale(): number {
    const list = this.scales();
    return list[Math.min(this.step, list.length - 1)]!;
  }

  get ceiling(): number {
    return this.ceil;
  }

  /** Smoothed frame interval in seconds, for the debug readout. */
  get average(): number {
    return this.avg;
  }

  /** Half a minute with room to spare: the drawing size back up, or the tier above, may be tried at the next quiet moment. */
  get wantsUp(): boolean {
    return !this.locked && (this.step > this.top || this.index < this.ceil) && this.steady >= UP_AFTER;
  }

  /** Try the size or tier above (the page calls this at a quiet moment). Returns true when it moved. */
  stepUp(): boolean {
    if (!this.wantsUp) return false;
    this.tried = null;
    if (this.step > this.top) {
      this.step--;
      this.climbed = true;
    } else {
      const dpr = this.dpr();
      this.index++;
      this.enter(dpr);
    }
    this.restart(this.quick ? SETTLE_MOVE_QUICK : SETTLE_MOVE);
    return true;
  }

  /** Pixels per CSS pixel drawn now (the tier's ratio on this screen, times the drawing size). */
  get drawn(): number {
    return this.dpr();
  }

  /**
   * Start at the drawing size this device settled on last time (`keptTier`), not at full size: without it, every
   * visit began with a few seconds of slow frames while the governor found the size again.
   */
  startAt(dpr: number): void {
    if (!(dpr > 0)) return;
    const list = this.scales(), base = Math.min(this.screen() || 1, this.tier.dprCap);
    const i = list.findIndex((s) => base * s <= dpr + 0.01);
    this.step = i < 0 ? list.length - 1 : i;
  }

  /** Skip the next `seconds` of frames: a new sky or a closed panel makes a few slow frames that are not the machine. */
  hold(seconds: number): void {
    this.grace = Math.max(this.grace, seconds);
  }

  /** Feed one raw frame interval. Returns true when the tier or the drawing size just moved. */
  sample(dt: number): boolean {
    if (!(dt > 0)) { this.steady = 0; return false; }
    if (dt > STALL) {
      // one long frame is a stall; a run of them is how fast this machine is
      this.steady = 0;
      if (++this.long < RUN) return false;
      dt = STALL;
    } else this.long = 0;
    if (this.grace > 0) { this.grace -= dt; return false; }
    // A move restarts the measurement: the new size or tier is a new machine.
    if (this.samples++ === 0) {
      this.avg = dt;
      this.jitter = 0;
    } else {
      this.avg += (dt - this.avg) * EMA;
      this.jitter += (Math.abs(dt - this.avg) - this.jitter) * EMA;
    }
    this.measured += dt;
    const settled = this.measured >= (this.quick ? SETTLE_QUICK : SETTLE);
    // room to spare: keeping up with the display, steadily (a 30fps cap is not room)
    if (settled && this.avg <= ROOM && this.jitter < CALM) this.steady += dt;
    else this.steady = 0;
    if (this.locked || !settled) return false;
    if (this.probe_) {
      const p = this.probe_;
      this.probe_ = null;
      // the step better misses: everything back where the last verdict stood, and judged from there as usual
      if (this.avg > SLOW && !this.cappedAt30()) {
        this.index = p.index;
        this.step = p.step;
        this.thirty = p.thirty;
        this.top = 0;
        this.climbed = false;
        this.flat = false;
        this.restart(this.quick ? SETTLE_MOVE_QUICK : SETTLE_MOVE);
        return true;
      }
    }
    if (this.tried) {
      const t = this.tried;
      this.tried = null;
      // the step down bought too little and still misses an even 30. A tier: take it back, and hold an even 30 there (Chrome
      // on an M1 drew High at full size about as fast as Low: docs/PERF.md pass 27). A size: put it back, and judge the tier
      if (t.avg / this.avg < PAYS && this.avg > CAP_30 * 1.05) {
        if (t.tier !== undefined) {
          this.index = t.tier;
          this.ceil = Math.max(this.ceil, t.ceil ?? t.tier);
          this.step = t.from;
          this.top = 0;
          this.thirty = true;
          this.restart(this.quick ? SETTLE_MOVE_QUICK : SETTLE_MOVE);
          return true;
        }
        this.step = t.from;
        this.flat = true;
        this.restart(this.quick ? SETTLE_MOVE_QUICK : SETTLE_MOVE);
        return true;
      }
    }
    if (this.thirty) return false;
    if (this.avg <= SLOW || this.cappedAt30()) return false;
    // first draw a little smaller, which is hard to see, before giving up the look of a tier
    const list = this.scales();
    if (this.step < list.length - 1 && !this.flat) {
      // a size reached by climbing and found slow is never climbed back to on this tier
      if (this.climbed) this.top = this.step + 1;
      this.climbed = false;
      let next = this.step + 1;
      // a computer goes straight to the size whose pixels would fit the frame if the frame were all pixels: the least
      // it can need, so it never overshoots, and a GPU that is far behind is not left juddering for a step at a time
      if (!this.breathe) {
        const need = ROOM / this.avg, now = list[this.step]!;
        while (next < list.length - 1 && (list[next]! / now) ** 2 > need) next++;
        this.tried = { from: this.step, avg: this.avg };
      }
      this.step = next;
      this.restart(this.quick ? SETTLE_MOVE_QUICK : SETTLE_MOVE);
      return true;
    }
    if (this.index === 0) {
      // nothing left to give: an even 30 reads smoother than a ragged 40, on a phone or a computer
      this.thirty = true;
      return true;
    }
    const dpr = this.dpr(), was = { from: this.step, avg: this.avg, tier: this.index, ceil: this.ceil };
    this.index--;
    // too slow here: never try this tier again on this device
    this.ceil = Math.min(this.ceil, this.index);
    this.enter(dpr);
    // a computer judges the lower tier as it judges a smaller size: it has to pay
    if (!this.breathe) this.tried = was;
    this.restart(this.quick ? SETTLE_MOVE_QUICK : SETTLE_MOVE);
    return true;
  }

  /** The drawing scales open to this tier on this device. */
  private scales(): readonly number[] {
    const base = Math.min(this.screen() || 1, this.tier.dprCap);
    // a phone never draws under one pixel per CSS pixel: Phone (1.5) steps down to 1, Low (1) has no smaller size and holds an
    // even 30 instead. Low at two thirds read as very blocky on an iPhone (docs/PERF.md pass 29)
    if (this.breathe) {
      const n = SCALES.filter((s) => base * s >= 0.99).length;
      return SCALES.slice(0, Math.max(1, n));
    }
    // a computer keeps at least one pixel per CSS pixel, except on Low, the last stop, where a slightly soft picture beats
    // a juddering one (docs/PERF.md passes 22 and 27)
    const floor = this.index === 0 ? LOW_FLOOR : 0.99;
    const n = WIDE.filter((s) => base * s >= floor).length;
    return WIDE.slice(0, Math.max(1, n));
  }

  /** Pixels per CSS pixel drawn now. */
  private dpr(): number {
    return Math.min(this.screen() || 1, this.tier.dprCap) * this.scale;
  }

  /**
   * A new tier starts its size where the old one stood: a phone from the top, a computer at the step nearest the
   * pixels it drew (a tier given up at one pixel per CSS pixel does not jump back to one and a half).
   */
  private enter(dpr: number): void {
    this.top = 0;
    this.climbed = false;
    this.tried = null;
    this.flat = false;
    if (this.breathe) { this.step = 0; return; }
    const list = this.scales(), base = Math.min(this.screen() || 1, this.tier.dprCap);
    const i = list.findIndex((s) => base * s <= dpr + 0.01);
    this.step = i < 0 ? list.length - 1 : i;
  }

  private restart(grace = 0): void {
    this.samples = 0;
    this.measured = 0;
    this.steady = 0;
    this.long = 0;
    this.grace = Math.max(this.grace, grace);
  }

  private cappedAt30(): boolean {
    return Math.abs(this.avg - CAP_30) < 0.003 && this.jitter < 0.003;
  }
}
