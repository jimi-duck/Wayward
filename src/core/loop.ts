// ── the loop ───────────────────────────────────────────────────────────────
// The simulation advances in fixed steps of exactly 1/60s, and the renderer
// draws as often as the display asks, interpolating between the last two
// simulated states. The original scaled every motion by a per-frame step
// factor to get the same run on 60Hz and 120Hz screens; a fixed step gets the
// same result by construction, and it also makes a run reproducible, which is
// what lets the scripted pilot run headless.
//
// Two rules carried over from the original loop:
//
//  · A frame longer than MAX_FRAME is clamped, never simulated in full. A
//    stalled tab or a sleeping laptop is not time the field should have moved
//    through. At 0.05s that is three steps, the same cap the original had.
//  · A held frame (freeze) stops the simulation clock and keeps drawing, so
//    the weight it lends a kill is not paid for in score, cooldowns or
//    difficulty. The frame a dreadnought comes apart on is the one worth
//    looking at.

export const STEP = 1 / 60;
const MAX_FRAME = 0.05;
const MAX_STEPS = 4;
// The longest a single freeze may hold, from the original's HITSTOP_MAX.
const FREEZE_MAX = 0.11;
// Frame intervals are not exact multiples of STEP, so an accumulator that
// should hold exactly one step can come up a hair short and push the step to
// the next frame. The tolerance is far below anything a frame can measure.
const EPS = 1e-9;

export interface LoopHandlers {
  /** Advance the simulation by exactly `dt` (always STEP) seconds. */
  step(dt: number): void;
  /**
   * Draw. `alpha` (0 to 1) is how far the display is between the previous
   * and the current simulated state. `frameDt` is real seconds since the last
   * frame, after the clamp, for things that animate in real time.
   */
  render(alpha: number, frameDt: number): void;
  /** Raw, unclamped frame interval, for the quality governor. */
  measure?(rawDt: number): void;
}

export class FixedStepLoop {
  /** 1 is real time. Below 1 is slow motion. */
  timeScale = 1;
  /** While paused nothing is simulated, but frames are still drawn. */
  paused = false;

  private acc = 0;
  private hold = 0;
  private last = -1;
  private raf = 0;
  private readonly h: LoopHandlers;

  constructor(handlers: LoopHandlers) {
    this.h = handlers;
  }

  /** Hold the simulation still for `seconds` while drawing continues. */
  freeze(seconds: number): void {
    this.hold = Math.min(FREEZE_MAX, Math.max(this.hold, seconds));
  }

  /**
   * Run one display frame of `rawDt` seconds: simulate however many whole
   * steps it covers, then draw. Returns the number of steps taken. This is the
   * whole loop minus requestAnimationFrame, so tests and headless runs can
   * drive it directly.
   */
  advance(rawDt: number): number {
    let dt = rawDt > 0 ? rawDt : 0;
    if (dt > MAX_FRAME) dt = MAX_FRAME;

    let steps = 0;
    if (!this.paused) {
      let simDt = dt;
      if (this.hold > 0) {
        const held = Math.min(this.hold, simDt);
        this.hold -= held;
        simDt -= held;
      }
      this.acc += simDt * this.timeScale;
      while (this.acc >= STEP - EPS && steps < MAX_STEPS) {
        this.h.step(STEP);
        this.acc -= STEP;
        steps++;
      }
      if (this.acc < 0) this.acc = 0;
      // Never carry a backlog. If the cap was hit, the time is dropped rather
      // than repaid over the next frames, which would be a fast-forward.
      if (steps === MAX_STEPS && this.acc > STEP) this.acc = STEP;
    }
    this.h.render(this.acc / STEP, dt);
    return steps;
  }

  start(): void {
    if (this.raf) return;
    this.last = -1;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const raw = this.last < 0 ? 0 : (now - this.last) / 1000;
    this.last = now;
    this.h.measure?.(raw);
    this.advance(raw);
  };
}
