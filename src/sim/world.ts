import { HULLS, type Hull, type HullId } from '../content/hulls';
import type { InputFrame } from '../input/types';
import { flightControls, type CameraMode } from './controls';
import { newShip, stepShip, type ShipState } from './ship';

// The simulation's root. M1 has one ship in an empty sector; the field,
// enemies and progression join it in M2 and M5. It never touches Three.js,
// so it can run headless for the scripted pilot.
//
// Conventions every system keeps: play is on the XZ plane, heading 0 faces +X
// and PI/2 faces -Z ("up" on screen), headings are never wrapped.

export class World {
  ship: ShipState = newShip();
  /** The ship one step ago, for interpolation. */
  prev: ShipState = newShip();
  hull: Hull = HULLS.escort;
  mode: CameraMode = 'tactical';
  /** Seconds of simulated time. */
  time = 0;

  setHull(id: HullId): void {
    this.hull = HULLS[id];
  }

  step(dt: number, input: InputFrame): void {
    Object.assign(this.prev, this.ship);
    stepShip(this.ship, flightControls(input, this.mode, this.ship.heading), this.hull, dt);
    this.time += dt;
  }
}
