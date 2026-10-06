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

/** The bay's angle on the ship: round to the quarter, and up, in radians. */
const BAY_YAW = MathUtils.degToRad(50);
/** And how far the camera stands back (a share of its distance). */
const BAY_PULL = 0.3;
/** In a tab the web takes the lower part of the screen: the ship rises further and stands smaller. */
const BAY_TAB_LIFT = 0.14;
const BAY_TAB_PULL = 0.25;
const BAY_ELEV = MathUtils.degToRad(14);
/** How far the bay lifts the ship, as a share of the screen height. */
const BAY_LIFT = 0.2;
/** A phone on its side has less room above the cards. */
const BAY_LIFT_SHORT = 0.3;

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
  /** Extra lift while the bay is open, in CSS pixels. */
  private lift = 0;
  private pull = 1;
  /** 0 in flight, 1 with the refit bay open: the camera comes in on the ship. */
  bay = 0;
  /** 0 in the Suggested view, 1 in a tab (on top of `bay`). */
  bayTab = 0;

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
    this.zoomNow = smoothDamp(this.zoomNow, ZOOMS[this.zoom] ?? 1, this.vzoom, 0.3, dt);
    this.recoil = Math.max(0, this.recoil - this.recoil * 9 * dt - 0.2 * dt);

    const vfov = BASE_VFOV + FOV_KICK * s.speedFrac;
    // the bay lifts the ship clear of the cards along the bottom
    const lift = Math.round(this.h * (this.bay * (this.h < 520 ? BAY_LIFT_SHORT : BAY_LIFT) + this.bayTab * BAY_TAB_LIFT));
    if (lift !== this.lift) { this.lift = lift; this.applyOffset(); }
    if (Math.abs(this.camera.fov - vfov) > 0.01) {
      this.camera.fov = vfov;
      this.applyOffset();
    }
    const tanV = Math.tan(MathUtils.degToRad(vfov) / 2);
    // the bay swings the camera round to the ship's quarter and up, so its parts spread out instead of lining up
    const yaw = this.yaw + this.bay * BAY_YAW, elev = ELEV + this.bay * BAY_ELEV, pitch = PITCH + this.bay * BAY_ELEV;
    const dist = (Math.max(VIEW_H / (2 * tanV), VIEW_W / (2 * tanV * this.aspect)) + (reduceMotion ? 0 : this.recoil)) * this.zoomNow * this.pull * (1 + BAY_PULL * this.bay + BAY_TAB_PULL * this.bayTab);

    // forward along the yaw, and the camera behind and above
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
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
    const y = this.offsetY + this.lift;
    if (y) this.camera.setViewOffset(this.w, this.h, 0, y, this.w, this.h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private goal(s: CameraSubject): [number, number] {
    return [s.x + Math.cos(s.heading) * LOOK_AHEAD, s.z - Math.sin(s.heading) * LOOK_AHEAD];
  }
}
