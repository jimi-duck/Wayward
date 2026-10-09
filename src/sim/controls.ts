import { clamp } from '../core/math';
import type { InputFrame } from '../input/types';
import { AIM_DEAD, THROTTLE_FROM, THROTTLE_SPAN } from './tuning';

// The camera rides behind the ship, so "up" is always the nose. Keys turn and
// thrust; a stick works like a car's: across is the helm, forward is the
// throttle. Two triggers: lasers (held) and torpedoes (one per press).

/** What the ship is asked to do in one step. */
export interface FlightControls {
  /** Rate steering, -1 (left) to 1 (right). */
  turn: number;
  /** Throttle, 0 to 1. */
  thrust: number;
  /** Start a barrel roll this step. */
  roll: boolean;
  /** Start a break and reverse this step. */
  brk: boolean;
  /** Which way to roll: -1 left, 1 right, 0 for the ship to decide. */
  rollDir: -1 | 0 | 1;
  /** Laser trigger held. */
  fire: boolean;
  /** Launch a torpedo this step. */
  torpedo: boolean;
}

function stickThrottle(push: number): number {
  return clamp((push - THROTTLE_FROM) / THROTTLE_SPAN, 0, 1);
}

export function flightControls(input: InputFrame): FlightControls {
  let turn = input.turn;
  let thrust = input.thrust;
  const aim = input.aim;
  if (aim && aim.mag > AIM_DEAD) {
    turn = clamp(turn + (Math.cos(aim.angle) * aim.mag) / 0.7, -1, 1);
    thrust = Math.max(thrust, stickThrottle(Math.sin(aim.angle) * aim.mag));
  }
  const rollDir = Math.abs(turn) > 0.1 ? (turn > 0 ? 1 : -1) : 0;
  return { turn, thrust, roll: input.roll, brk: input.brk, rollDir, fire: input.fire, torpedo: input.torpedo };
}
