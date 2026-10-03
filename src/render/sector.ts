import { Scene } from 'three';
import type { HullId } from '../content/hulls';
import { lerp } from '../core/math';
import type { CameraMode } from '../sim/controls';
import { newShip, topSpeed } from '../sim/ship';
import type { World } from '../sim/world';
import { CameraRig } from './camera';
import { Environment } from './environment';
import { Scenery } from './scenery';
import { ShipView } from './ships';

// The scene root: reads the simulation, never writes it. Every frame it
// builds the ship's interpolated state between the last two steps, then
// hands that to the ship view, the camera and the environment.

export class Sector {
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  private readonly env = new Environment(this.scene);
  private readonly scenery = new Scenery(this.scene);
  private readonly ship: ShipView;
  private readonly lerped = newShip();
  private snapped = false;
  reduceMotion = false;

  constructor(hull: HullId) {
    this.ship = new ShipView(hull);
    this.scene.add(this.ship.root);
  }

  get camera() {
    return this.rig.camera;
  }

  setHull(id: HullId): void {
    this.ship.setHull(id);
  }

  setMode(mode: CameraMode): void {
    this.rig.mode = mode;
  }

  resize(width: number, height: number, dpr: number): void {
    this.rig.resize(width / Math.max(1, height));
    this.env.setPixelRatio(dpr);
  }

  /** Place everything for this frame, `alpha` of the way from the last step to this one. */
  sync(world: World, alpha: number, dt: number): void {
    const a = world.prev, b = world.ship, s = this.lerped;
    Object.assign(s, b);
    s.x = lerp(a.x, b.x, alpha);
    s.z = lerp(a.z, b.z, alpha);
    s.vx = lerp(a.vx, b.vx, alpha);
    s.vz = lerp(a.vz, b.vz, alpha);
    s.heading = lerp(a.heading, b.heading, alpha);
    s.yawRate = lerp(a.yawRate, b.yawRate, alpha);

    const subject = {
      x: s.x, z: s.z, vx: s.vx, vz: s.vz, heading: s.heading, yawRate: s.yawRate,
      speedFrac: Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(world.hull)),
    };
    if (!this.snapped) { this.rig.snap(subject); this.snapped = true; }
    this.rig.update(subject, dt);
    this.ship.update(s, dt, this.reduceMotion);
    this.scenery.update(dt, this.rig.target.x, this.rig.target.z);
    this.env.update(this.rig.camera, this.rig.target.x, this.rig.target.z, s.vx, s.vz);
  }
}
