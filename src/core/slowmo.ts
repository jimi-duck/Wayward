// ── slow motion ─────────────────────────────────────────────────────────────
// A big kill (an elite, a capital, a boss) drops the simulation clock for a
// moment, so the blast can be seen. The clock eases down fast, holds, and
// eases back; a cooldown keeps a busy fight from living in slow motion.
// Pure and headless: the loop reads `scale` as its timeScale.

const EASE_IN = 0.06;
const EASE_OUT = 0.35;
/** Seconds of real time after a slow-down before the next one may start. */
const COOLDOWN = 4;
/** Never slower than this, however it is asked. */
const FLOOR = 0.25;

export class SlowMo {
  /** The factor to use as the loop's timeScale (1 is real time). */
  scale = 1;
  private t = 0;
  private len = 0;
  private depth = 1;
  private cool = 0;

  /** Ask for a slow-down to `scale` for `secs` of real time. Ignored while one runs or cools. */
  request(scale: number, secs: number): boolean {
    if (this.cool > 0 || this.t < this.len) return false;
    this.depth = Math.max(FLOOR, Math.min(1, scale));
    this.len = secs + EASE_IN + EASE_OUT;
    this.t = 0;
    this.cool = this.len + COOLDOWN;
    return true;
  }

  /** Advance by `dt` real seconds; returns the new scale. */
  step(dt: number): number {
    this.cool = Math.max(0, this.cool - dt);
    if (this.t >= this.len) return (this.scale = 1);
    this.t += dt;
    const out = this.len - EASE_OUT;
    const k = this.t < EASE_IN ? this.t / EASE_IN : this.t > out ? Math.max(0, 1 - (this.t - out) / EASE_OUT) : 1;
    return (this.scale = 1 - (1 - this.depth) * k);
  }

  /** Drop it at once (a pause, a death, reduced motion). */
  clear(): void {
    this.t = this.len = 0;
    this.scale = 1;
  }
}
