// The three hulls, ported from SHIPS and HULL_MODS in the original game.
// These are the only per-hull numbers in the flight model: nothing else
// branches on which ship you picked, so a hull can be retuned here.
//
// thrust, rot and drag are the original's own multipliers and per-frame
// values (one frame = one 60Hz step). Measured with the original's scripted
// pilot, they give top speeds of about 450, 316 and 384 px/s.

export type HullId = 'escort' | 'cruiser' | 'scout';

export interface Hull {
  id: HullId;
  name: string;
  role: string;
  /** Multiplier on the base thrust. */
  thrust: number;
  /** Multiplier on the base turn rate. */
  rot: number;
  /** Velocity kept per 60Hz step. Lower stops sooner. */
  drag: number;
  /** Fraction of sideways slide bled off per step under thrust. Only the Defiant has it. */
  grip: number;
  /** Hull plates at the start of a run. */
  plates: number;
}

export const HULLS: Record<HullId, Hull> = {
  escort:  { id: 'escort',  name: 'Defiant class',   role: 'Escort',  thrust: 1.965, rot: 1.10, drag: 0.961, grip: 0.05, plates: 3 },
  cruiser: { id: 'cruiser', name: 'Sovereign class', role: 'Cruiser', thrust: 0.80,  rot: 0.84, drag: 0.977, grip: 0,    plates: 4 },
  scout:   { id: 'scout',   name: 'Nova class',      role: 'Scout',   thrust: 1.633, rot: 1.34, drag: 0.962, grip: 0,    plates: 2 },
};

export const HULL_ORDER: readonly HullId[] = ['escort', 'cruiser', 'scout'];
