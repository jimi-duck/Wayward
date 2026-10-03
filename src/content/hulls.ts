// The ship, ported from SHIPS and HULL_MODS in the original game. These are
// the only ship numbers in the flight model, so it can be retuned here.
//
// thrust, rot and drag are the original's own multipliers and per-frame
// values (one frame = one 60Hz step). Measured with the original's scripted
// pilot, they give a top speed of about 450 px/s. The original's other two
// hulls (the Sovereign and the Nova) were dropped in the gritty pass: the
// game has one ship.

export interface Hull {
  name: string;
  role: string;
  /** Multiplier on the base thrust. */
  thrust: number;
  /** Multiplier on the base turn rate. */
  rot: number;
  /** Velocity kept per 60Hz step. Lower stops sooner. */
  drag: number;
  /** Fraction of sideways slide bled off per step under thrust. */
  grip: number;
  /** Hull plates at the start of a run. */
  plates: number;
  /** Barrel-roll overrides, from the build (tuning.ts has the defaults). */
  rollCooldown?: number;
  rollKick?: number;
  rollIframes?: number;
  /** Drift drive: off the throttle the hull keeps its speed and turns faster. */
  drift?: boolean;
}

export const HULL: Hull = { name: 'Kestrel class', role: 'Survey tender', thrust: 1.965, rot: 1.10, drag: 0.961, grip: 0.05, plates: 3 };
