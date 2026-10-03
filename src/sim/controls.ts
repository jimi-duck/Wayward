import { angleDelta, clamp } from '../core/math';
import type { InputFrame } from '../input/types';
import { AIM_DEAD, THROTTLE_FROM, THROTTLE_SPAN } from './tuning';

/**
 * Two camera styles, and each reads a stick differently.
 *
 *  tactical · the camera never turns, so "up" on screen is always the same
 *             way in the world. A stick points where the ship should face,
 *             as the original's touch stick did, and pushing it further
 *             throttles up.
 *  chase    · the camera swings round behind the ship, so "up" is always
 *             the nose. A stick then works like a car's: across is the helm,
 *             forward is the throttle.
 *
 * Keys mean the same thing in both: left and right turn, up thrusts.
 */
export type CameraMode = 'tactical' | 'chase';

/** What the ship is asked to do in one step. */
export interface FlightControls {
  /** Rate steering, -1 (left) to 1 (right). */
  turn: number;
  /** Throttle, 0 to 1. */
  thrust: number;
  /** A heading to swing the nose toward (tactical stick), or null. */
  heading: number | null;
  /** Start a barrel roll this step. */
  roll: boolean;
  /** Which way to roll: -1 left, 1 right, 0 for the ship to decide. */
  rollDir: -1 | 0 | 1;
}

function stickThrottle(push: number): number {
  return clamp((push - THROTTLE_FROM) / THROTTLE_SPAN, 0, 1);
}

export function flightControls(input: InputFrame, mode: CameraMode, shipHeading: number): FlightControls {
  let turn = input.turn;
  let thrust = input.thrust;
  let heading: number | null = null;
  let lean = turn;

  const aim = input.aim;
  if (aim && aim.mag > AIM_DEAD) {
    if (mode === 'tactical') {
      // screen angles and headings share a convention (PI/2 is up on screen
      // and -Z in the world), and this camera never turns, so they are equal
      heading = aim.angle;
      thrust = Math.max(thrust, stickThrottle(aim.mag));
      lean = -Math.sign(angleDelta(shipHeading, aim.angle));
    } else {
      const across = Math.cos(aim.angle) * aim.mag;
      const forward = Math.sin(aim.angle) * aim.mag;
      turn = clamp(turn + across / 0.7, -1, 1);
      thrust = Math.max(thrust, stickThrottle(forward));
      lean = turn;
    }
  }

  const rollDir = Math.abs(lean) > 0.1 ? (lean > 0 ? 1 : -1) : 0;
  return { turn, thrust, heading, roll: input.roll, rollDir };
}
