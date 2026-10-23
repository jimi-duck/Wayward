import { MathUtils, PerspectiveCamera } from 'three';
import { clamp, smoothDamp, smoothDampAngle } from '../core/math';

// ── the chase camera ──────────────────────────────────────────────────────
// Low behind the ship and a little above it, as in the reference frame: the
// hull fills the lower middle of the picture, the horizon sits high, and the
// sky ahead (where enemies come in from) takes most of the screen.
//
// Two angles define the framing. ELEV is how far above the ship the camera
// sits, seen from the ship; PITCH is how far the view looks down. The ship
// lands ELEV - PITCH below the centre of the picture, and the horizon PITCH
// above it. Distance is solved per frame so a minimum width and height of
// the scene at the ship are in view whatever the aspect, then scaled by the
// zoom step.
//
// The rig swings round a beat behind the ship's heading so a turn is felt,
// widens its field of view with speed, leans into hard turns, shakes on
// impacts, and recoils a touch on every shot.

const ELEV = MathUtils.degToRad(19);
const PITCH = MathUtils.degToRad(13);
const VIEW_W = 7.0;
const VIEW_H = 3.9;
const LOOK_AHEAD = 0.6;
const FOLLOW = 0.08;
const YAW_FOLLOW = 0.26;
const BASE_VFOV = 52;
const FOV_KICK = 6;
/** In the jump: the lens opens this many degrees, and the camera drops to this angle (the ship stays where it is in the picture). */
const WARP_FOV = 38;
const WARP_ELEV = MathUtils.degToRad(9);
const WARP_PULL = 0.18;
/** The rename reveal (render/reveal.ts): the rig swings this far round the ship, a little lower and further off, so the flank shows. */
const REVEAL_ARC = MathUtils.degToRad(24);
const REVEAL_ELEV = MathUtils.degToRad(13);
const REVEAL_PULL = 0.1;

/**
 * A phone on its side is a small, short window: there the camera stands a
 * little further off, so a hull coming in is on screen a beat sooner and the
 * thumbs in the bottom corners never cover the ship.
 */
const COMPACT_H = 500;
const COMPACT_PULL = 1.12;

/** Zoom steps, as multiples of the closest framing. The first is the reference's. */
export const ZOOMS = [1, 1.45, 2.1] as const;

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
  readonly camera = new PerspectiveCamera(BASE_VFOV, 1, 0.2, 4000);
  /** Index into ZOOMS. */
  zoom = 0;
  /** The point on the plane the camera follows, after smoothing. */
  readonly target = { x: 0, z: 0 };

  private yaw = 0;
  private readonly vx = { v: 0 };
  private readonly vz = { v: 0 };
  private readonly vyaw = { v: 0 };
  private readonly vzoom = { v: 0 };
  private zoomNow: number = ZOOMS[0];
  private roll = 0;
  private trauma = 0;
  private recoil = 0;
  private t = 0;
  private aspect = 1;
  private w = 1;
  private h = 1;
  private offsetY = 0;
  private pull = 1;
  /** 0 in flight, 1 with the refit bay open: the camera comes in on the ship. */
  bay = 0;
  /** The jump (render/warp.ts): `lens` 0 to 1 widens the view and drops the camera low behind the ship; `lock` 0 to 1 holds it rigidly on the ship, whatever the speed. */
  warp = { lens: 0, lock: 0 };
  /** 0 to 1: how far into the rename reveal's camera arc (render/reveal.ts). The ship and its physics never move for it. */
  reveal = 0;

  /** `offsetY` lifts the centre of the picture by that many CSS pixels. */
  resize(width: number, height: number, offsetY: number): void {
    this.w = width;
    this.h = height;
    this.aspect = width / Math.max(1, height);
    this.offsetY = offsetY;
    this.pull = height > 0 && height < COMPACT_H ? COMPACT_PULL : 1;
    this.camera.aspect = this.aspect;
    this.applyOffset();
  }

  /** Shake: 0 to 1, squared on its way to an offset (the original's trauma). */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** A steady rumble at least this strong (0 to 1), for as long as it is asked for each frame. */
  hum(level: number): void {
    this.trauma = Math.max(this.trauma, level);
  }

  /** A shove backward along the view, for the weight of a shot. */
  kick(amount: number): void {
    this.recoil = Math.min(0.6, this.recoil + amount);
  }

  snap(s: CameraSubject): void {
    const [gx, gz] = this.goal(s);
    this.target.x = gx;
    this.target.z = gz;
    this.vx.v = this.vz.v = this.vyaw.v = 0;
    this.yaw = s.heading;
    this.zoomNow = ZOOMS[this.zoom] ?? 1;
  }

  update(s: CameraSubject, dt: number, reduceMotion: boolean): void {
    this.t += dt;
    const [gx, gz] = this.goal(s);
    this.target.x = smoothDamp(this.target.x, gx, this.vx, FOLLOW, dt);
    this.target.z = smoothDamp(this.target.z, gz, this.vz, FOLLOW, dt);
    this.yaw = smoothDampAngle(this.yaw, s.heading, this.vyaw, YAW_FOLLOW, dt);
    // a ship at a thousand a second would leave a camera that eases after it far behind: in the jump the rig holds on
    const { lens, lock } = this.warp;
    if (lock > 0) {
      this.target.x += (gx - this.target.x) * lock;
      this.target.z += (gz - this.target.z) * lock;
      this.yaw += Math.atan2(Math.sin(s.heading - this.yaw), Math.cos(s.heading - this.yaw)) * lock;
    }
    this.zoomNow = smoothDamp(this.zoomNow, ZOOMS[this.zoom] ?? 1, this.vzoom, 0.3, dt);
    this.recoil = Math.max(0, this.recoil - this.recoil * 9 * dt - 0.2 * dt);

    const vfov = BASE_VFOV + FOV_KICK * s.speedFrac + (reduceMotion ? 0 : WARP_FOV * lens);
    if (Math.abs(this.camera.fov - vfov) > 0.01) {
      this.camera.fov = vfov;
      this.applyOffset();
    }
    const tanV = Math.tan(MathUtils.degToRad(vfov) / 2);
    const dist = (Math.max(VIEW_H / (2 * tanV), VIEW_W / (2 * tanV * this.aspect)) + (reduceMotion ? 0 : this.recoil)) * this.zoomNow * this.pull * (1 - 0.12 * this.bay) * (1 + (reduceMotion ? 0 : WARP_PULL * lens)) * (1 + REVEAL_PULL * this.reveal);

    // forward along the yaw, and the camera behind and above
    const yaw = this.yaw + REVEAL_ARC * this.reveal;
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
    // the ship keeps its place in the picture (ELEV - PITCH below the middle) while the camera comes down to the plane
    const elev = ELEV + (WARP_ELEV - ELEV) * lens + (REVEAL_ELEV - ELEV) * this.reveal, pitch = PITCH + (elev - ELEV);
    const back = Math.cos(elev) * dist, up = Math.sin(elev) * dist;
    let px = this.target.x - fx * back, py = up, pz = this.target.z - fz * back;
    this.trauma = Math.max(0, this.trauma - 1.8 * dt);
    if (this.trauma > 0 && !reduceMotion) {
      const k = this.trauma * this.trauma * 0.35 * this.zoomNow;
      px += Math.sin(this.t * 53.1) * k;
      py += Math.sin(this.t * 47.7 + 1.3) * k * 0.6;
      pz += Math.sin(this.t * 61.3 + 2.1) * k;
    }
    this.camera.position.set(px, py, pz);
    this.camera.up.set(0, 1, 0);
    // look down by PITCH along the yaw
    this.camera.lookAt(px + fx * Math.cos(pitch), py - Math.sin(pitch), pz + fz * Math.cos(pitch));

    const wantRoll = clamp(-s.yawRate * 0.03, -0.06, 0.06);
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
