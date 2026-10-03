import { MathUtils, PerspectiveCamera } from 'three';
import { clamp, smoothDamp, smoothDampAngle } from '../core/math';

// ── the chase camera ──────────────────────────────────────────────────────
// Rides above and behind the ship, swinging round a beat behind its heading
// so a turn is felt, looking ahead of the nose, widening its field of view
// with speed and leaning a few degrees into hard turns.
//
// Distance is solved per frame so a minimum patch of the plane at the ship is
// in view whatever the aspect, then scaled by the zoom step. The projection
// is shifted (a view offset) so the ship sits in the middle of the part of
// the screen the console leaves open, not the middle of the window.

// Framed so the ship sits a little below the middle at about a sixth of the
// width, as on the reference console; zoom steps pull back for more field.
const PITCH = MathUtils.degToRad(22);
const MIN_W = 12;
const MIN_H = 7;
const LOOK_AHEAD = 1.5;
const FOLLOW = 0.1;
const YAW_FOLLOW = 0.3;
const BASE_VFOV = 50;
const FOV_KICK = 7;

/** Zoom steps, as multiples of the closest framing. */
export const ZOOMS = [1, 1.55, 2.3] as const;

/** What the rig needs to know about the ship this frame. */
export interface CameraSubject {
  x: number;
  z: number;
  heading: number;
  yawRate: number;
  /** Speed as a fraction of the hull's top speed. */
  speedFrac: number;
}

export class CameraRig {
  readonly camera = new PerspectiveCamera(BASE_VFOV, 1, 0.3, 4000);
  /** Index into ZOOMS. */
  zoom = 1;
  /** The point on the plane the camera looks at, after smoothing. */
  readonly target = { x: 0, z: 0 };

  private yaw = 0;
  private readonly vx = { v: 0 };
  private readonly vz = { v: 0 };
  private readonly vyaw = { v: 0 };
  private readonly vzoom = { v: 0 };
  private zoomNow: number = ZOOMS[1];
  private roll = 0;
  private trauma = 0;
  private t = 0;
  private aspect = 1;
  private w = 1;
  private h = 1;
  private offsetY = 0;

  /** `offsetY` lifts the centre of the picture by that many CSS pixels. */
  resize(width: number, height: number, offsetY: number): void {
    this.w = width;
    this.h = height;
    this.aspect = width / Math.max(1, height);
    this.offsetY = offsetY;
    this.camera.aspect = this.aspect;
    this.applyOffset();
  }

  /** Shake: 0 to 1, squared on its way to an offset (the original's trauma). */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  snap(s: CameraSubject): void {
    const [gx, gz] = this.goal(s);
    this.target.x = gx;
    this.target.z = gz;
    this.vx.v = this.vz.v = this.vyaw.v = 0;
    this.yaw = s.heading - Math.PI / 2;
    this.zoomNow = ZOOMS[this.zoom] ?? 1;
  }

  update(s: CameraSubject, dt: number, reduceMotion: boolean): void {
    this.t += dt;
    const [gx, gz] = this.goal(s);
    this.target.x = smoothDamp(this.target.x, gx, this.vx, FOLLOW, dt);
    this.target.z = smoothDamp(this.target.z, gz, this.vz, FOLLOW, dt);
    // behind the ship is the heading turned half round: a yaw of heading - PI/2
    this.yaw = smoothDampAngle(this.yaw, s.heading - Math.PI / 2, this.vyaw, YAW_FOLLOW, dt);
    this.zoomNow = smoothDamp(this.zoomNow, ZOOMS[this.zoom] ?? 1, this.vzoom, 0.3, dt);

    const vfov = BASE_VFOV + FOV_KICK * s.speedFrac;
    if (Math.abs(this.camera.fov - vfov) > 0.01) {
      this.camera.fov = vfov;
      this.applyOffset();
    }
    const halfH = Math.tan(MathUtils.degToRad(vfov) / 2);
    const dist = Math.max(MIN_H / (2 * halfH), MIN_W / (2 * halfH * this.aspect)) * this.zoomNow;

    const back = Math.cos(PITCH) * dist, up = Math.sin(PITCH) * dist;
    let px = this.target.x + Math.sin(this.yaw) * back, py = up, pz = this.target.z + Math.cos(this.yaw) * back;
    this.trauma = Math.max(0, this.trauma - 1.8 * dt);
    if (this.trauma > 0 && !reduceMotion) {
      const k = this.trauma * this.trauma * 0.55 * this.zoomNow;
      px += Math.sin(this.t * 53.1) * k;
      py += Math.sin(this.t * 47.7 + 1.3) * k * 0.6;
      pz += Math.sin(this.t * 61.3 + 2.1) * k;
    }
    this.camera.position.set(px, py, pz);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target.x, 0, this.target.z);

    const wantRoll = clamp(-s.yawRate * 0.035, -0.07, 0.07);
    this.roll += (wantRoll - this.roll) * Math.min(1, 6 * dt);
    if (this.roll) this.camera.rotateZ(this.roll);
  }

  private applyOffset(): void {
    if (this.offsetY) this.camera.setViewOffset(this.w, this.h, 0, this.offsetY, this.w, this.h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private goal(s: CameraSubject): [number, number] {
    return [s.x + Math.cos(s.heading) * LOOK_AHEAD, s.z - Math.sin(s.heading) * LOOK_AHEAD];
  }
}
