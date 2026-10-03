/** Which device the player last touched. The UI picks its prompts by this. */
export type Device = 'keyboard' | 'touch' | 'gamepad';

/**
 * One-shot actions. Roll and overcharge are queued for the next simulation
 * step. Pause is not: it is answered at once by the app, because a paused
 * loop never runs a step that could read it.
 */
export type Press = 'roll' | 'torpedo' | 'overcharge' | 'pause';

/**
 * An analogue stick, in screen space: angle 0 points right and PI/2 points
 * up; mag runs 0 to 1. The flight model decides what a stick means (a target
 * heading, a throttle), so nothing here applies the original's 0.18 steering
 * and 0.3 throttle thresholds.
 */
export interface Aim {
  angle: number;
  mag: number;
}

/** Everything the simulation reads from the player in one step. */
export interface InputFrame {
  /** Rate steering, -1 (left) to 1 (right): keys and d-pad. */
  turn: number;
  /** Throttle, 0 to 1: keys and trigger. */
  thrust: number;
  /** Touch stick or gamepad stick, or null when centred. */
  aim: Aim | null;
  /** Phaser trigger held (button 1). */
  fire: boolean;
  /** Torpedo pressed since the last step (button 2). */
  torpedo: boolean;
  roll: boolean;
  overcharge: boolean;
  device: Device;
}
