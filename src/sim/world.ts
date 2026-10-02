import { angleDelta, clamp } from '../core/math';
import type { InputFrame } from '../input/types';

// ── M0 stand-in ────────────────────────────────────────────────────────────
// One ship that can only turn: enough to prove the whole path from a key or a
// thumb, through the fixed step, to an interpolated frame. M1 replaces this
// with the original's flight model.
//
// Conventions every later system keeps. The game is played on the XZ plane.
// Heading 0 faces +X and PI/2 faces -Z, which is "up" on screen with the
// camera behind the ship, so a stick's screen angle and a heading are the same
// number. Headings are never wrapped, so interpolating between two steps is a
// plain lerp; only differences go through angleDelta.

export interface ShipState {
  x: number;
  z: number;
  heading: number;
}

// About 205 degrees a second: the Defiant's helm in the original.
const TURN_RATE = 3.6;
// Below this a stick is resting, not steering (the original's 0.18).
const AIM_DEAD = 0.18;

export class World {
  readonly ship: ShipState = { x: 0, z: 0, heading: Math.PI / 2 };
  /** The ship as it was one step ago, for interpolation. */
  readonly prev: ShipState = { ...this.ship };

  step(dt: number, input: InputFrame): void {
    Object.assign(this.prev, this.ship);
    const max = TURN_RATE * dt;
    let turn = -input.turn * max;
    if (input.aim && input.aim.mag > AIM_DEAD) {
      turn = clamp(angleDelta(this.ship.heading, input.aim.angle), -max, max);
    }
    this.ship.heading += turn;
  }
}
