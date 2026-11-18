import { MathUtils, PerspectiveCamera } from 'three';
import { clamp, smoothDamp, smoothDampAngle } from '../core/math';

// ── the chase camera ──────────────────────────────────────────────────────
// The player picks the view in Settings (`view`). Chase, the default, is
// behind the ship and well above it: the hull in the lower middle of the
// picture, with room ahead (where enemies come in from) to see them early.
// Cinematic is closer and lower with a wide lens, looking down the spine;
// Low sits about level with the drives and looks a little up; Cockpit rides
// on the bridge and looks over the prow.
//
// Two angles define each chase view. ELEV is how far above the ship the
// camera sits, seen from the ship; PITCH is how far the view looks down
// (below zero: up). The ship lands ELEV - PITCH below the centre of the
// picture, and the horizon PITCH above it. Distance is solved per frame so a
// minimum width and height of the scene at the ship are in view whatever the
// aspect, then scaled by the zoom step. Story camera moments (a jump, the
// reveal, an arrival, photo mode, the refit bay) always use the chase rig, so
// the cockpit eases out to it for them and back after.
//
// The rig swings round a beat behind the ship's heading so a turn is felt,
// widens its field of view with speed (and a few degrees more for a moment on
// a throttle snap or a jink), hums faintly at a hard burn, leans into hard
// turns, shakes on impacts, and recoils a touch on every shot. With reduced
// motion: no punch, no hum, no shake.

/** The views a player can pick in Settings. */
export const CAMERA_VIEWS = ['chase', 'cinematic', 'low', 'cockpit'] as const;
export type CameraView = (typeof CAMERA_VIEWS)[number];
/** A chase view: elevation and pitch (degrees), the lens (degrees, and its stretch at top speed), the scene's width and height at the ship. */
interface Frame { elev: number; pitch: number; fov: number; kick: number; w: number; h: number }
const FRAMES: Record<Exclude<CameraView, 'cockpit'>, Frame> = {
  chase: { elev: 20, pitch: 13.5, fov: 52, kick: 6, w: 11, h: 6.2 },
  cinematic: { elev: 17, pitch: 7, fov: 72, kick: 7, w: 10.6, h: 6 },
  low: { elev: 11, pitch: -3, fov: 72, kick: 7, w: 10.4, h: 5.85 },
};
/**
 * The cockpit: a flight sim's eye at the prow (world units ahead of and above the ship's centre), level with the plane and
 * looking a hair down; the hull is hidden there (`inCockpit`), and the view banks into a turn.
 */
const COCKPIT = { ahead: 1.15, up: 0.32, pitch: MathUtils.degToRad(2), fov: 72, kick: 7, bank: 0.11, maxBank: 0.32 };
const LOOK_AHEAD = 0.6;
const FOLLOW = 0.08;
const YAW_FOLLOW = 0.26;
/** A burst of speed (a throttle snap, a jink): the lens opens this many degrees at once, then eases back. */
const PUNCH_FOV = 4;
/** A drive at full burn shakes the rig by this much (world units at the closest zoom): a hum felt more than seen. */
const VIBE = 0.014;
/** In the jump: the lens opens this many degrees, and the camera drops to this angle (the ship stays where it is in the picture). */
const WARP_FOV = 38;
const WARP_ELEV = MathUtils.degToRad(9);
const WARP_PULL = 0.18;
/** The rename reveal (render/reveal.ts): the rig swings this far round the ship, lower and further off, so the whole flank shows. */
const REVEAL_ARC = MathUtils.degToRad(105);
const REVEAL_ELEV = MathUtils.degToRad(9);
const REVEAL_PULL = 0.35;
/** A jump arrival (render/sector.ts): the shot opens wide, high and round to the side, then swings in behind the ship. */
const ARRIVE_ARC = MathUtils.degToRad(120);
const ARRIVE_ELEV = MathUtils.degToRad(30);
const ARRIVE_PULL = 1.1;
/** Photo mode: further off and lower. */
const PHOTO_PULL = 0.45;
const PHOTO_ELEV = MathUtils.degToRad(12);

/**
 * A phone on its side is a small, short window: there the camera stands a
 * little further off, so a hull coming in is on screen a beat sooner and the
 * thumbs in the bottom corners never cover the ship.
 */
const COMPACT_H = 500;
const COMPACT_PULL = 1.12;

/** Zoom steps, as multiples of the closest framing (no effect in the cockpit). */
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
  readonly camera = new PerspectiveCamera(FRAMES.chase.fov, 1, 0.12, 4000);
  /** The view picked in Settings. */
  view: CameraView = 'chase';
  /** 0 to 1: how far in the cockpit the camera is (eases on a change of view, and out for a story moment). */
  private seat = 0;
  /** Fully in the cockpit: the ship's own model is hidden (render/sector.ts), so the eye sees only space. */
  get inCockpit(): boolean { return this.seat > 0.97; }
  /** The view last framed: a change of view cuts at once (only a story moment eases the cockpit out and back). */
  private seen: CameraView = 'chase';
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
  private punchWant = 0;
  private punchNow = 0;
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
  /** 1 to 0: what is left of a jump arrival's opening sweep. The ship flies as normal under it. */
  arrive = 0;
  /** Radians the shot has drifted round the ship (a paused world, photo mode: render/sector.ts). */
  drift = 0;
  /** 0 to 1: photo mode's framing, a little further off and lower, so more of the sky shows. */
  photo = 0;

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

  /** A burst of speed, 0 to 1: the lens opens with it and eases back as it passes (none with reduced motion). */
  punch(amount: number): void {
    this.punchWant = Math.max(this.punchWant, Math.min(1, amount));
  }

  /** How hard the drives are working, 0 to 1, set each frame: past two thirds a fine vibration comes through the rig. */
  engine = 0;

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
    this.seat = this.view === 'cockpit' ? 1 : 0;
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

    // the punch comes in fast and goes out slow, so the eye reads a shove rather than a zoom
    this.punchWant = Math.max(0, this.punchWant - 1.6 * dt);
    this.punchNow += (this.punchWant - this.punchNow) * Math.min(1, (this.punchWant > this.punchNow ? 14 : 2.6) * dt);
    // the cockpit gives way to the chase rig for a jump, the reveal, an arrival, photo mode and the bay
    const moment = Math.max(lens, this.reveal, this.arrive, this.photo, this.bay);
    const seatWant = this.view === 'cockpit' ? 1 - moment : 0;
    if (this.view !== this.seen) { this.seen = this.view; this.seat = seatWant; }
    this.seat += (seatWant - this.seat) * Math.min(1, (seatWant < this.seat && moment > 0 ? 12 : 4) * dt);
    if (Math.abs(this.seat - seatWant) < 0.001) this.seat = seatWant;
    const F = FRAMES[this.view === 'cockpit' ? 'chase' : this.view], seat = this.seat;
    const baseFov = F.fov + (COCKPIT.fov - F.fov) * seat, kick = F.kick + (COCKPIT.kick - F.kick) * seat;
    const vfov = baseFov + kick * s.speedFrac + (reduceMotion ? 0 : WARP_FOV * lens + PUNCH_FOV * this.punchNow);
    if (Math.abs(this.camera.fov - vfov) > 0.01) {
      this.camera.fov = vfov;
      this.applyOffset();
    }
    const tanV = Math.tan(MathUtils.degToRad(vfov) / 2);
    const dist = (Math.max(F.h / (2 * tanV), F.w / (2 * tanV * this.aspect)) + (reduceMotion ? 0 : this.recoil)) * this.zoomNow * this.pull * (1 - 0.12 * this.bay) * (1 + (reduceMotion ? 0 : WARP_PULL * lens)) * (1 + REVEAL_PULL * this.reveal) * (1 + ARRIVE_PULL * this.arrive) * (1 + PHOTO_PULL * this.photo);

    // forward along the yaw, and the camera behind and above
    const yaw = this.yaw + REVEAL_ARC * this.reveal + ARRIVE_ARC * this.arrive + this.drift;
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
    // the ship keeps its place in the picture (ELEV - PITCH below the middle) while the camera moves for a jump, a reveal or a photo
    const E = MathUtils.degToRad(F.elev), P = MathUtils.degToRad(F.pitch);
    const elev = E + (WARP_ELEV - E) * lens + (REVEAL_ELEV - E) * this.reveal + (ARRIVE_ELEV - E) * this.arrive + (PHOTO_ELEV - E) * this.photo, pitch = P + (elev - E);
    const back = Math.cos(elev) * dist, up = Math.sin(elev) * dist;
    let px = this.target.x - fx * back, py = up, pz = this.target.z - fz * back;
    this.trauma = Math.max(0, this.trauma - 1.8 * dt);
    if (this.trauma > 0 && !reduceMotion) {
      const k = this.trauma * this.trauma * 0.35 * this.zoomNow;
      px += Math.sin(this.t * 53.1) * k;
      py += Math.sin(this.t * 47.7 + 1.3) * k * 0.6;
      pz += Math.sin(this.t * 61.3 + 2.1) * k;
    }
    const vibe = reduceMotion ? 0 : clamp((this.engine - 0.65) / 0.35, 0, 1) * VIBE * this.zoomNow;
    if (vibe > 0) {
      px += Math.sin(this.t * 91.7) * vibe;
      py += Math.sin(this.t * 77.3 + 0.7) * vibe * 0.7;
      pz += Math.sin(this.t * 83.9 + 1.9) * vibe;
    }
    // look down by PITCH along the yaw
    let lx = px + fx * Math.cos(pitch), ly = py - Math.sin(pitch), lz = pz + fz * Math.cos(pitch);
    if (seat > 0) {
      // the cockpit: on the ship herself (no follow lag, or she would slide under the eye), facing her heading
      const hx = Math.cos(s.heading), hz = -Math.sin(s.heading), cp = COCKPIT.pitch;
      const cx = s.x + hx * COCKPIT.ahead, cy = COCKPIT.up + (py - up), cz = s.z + hz * COCKPIT.ahead;
      px += (cx - px) * seat; py += (cy - py) * seat; pz += (cz - pz) * seat;
      lx += (px + hx * Math.cos(cp) - lx) * seat; ly += (py - Math.sin(cp) - ly) * seat; lz += (pz + hz * Math.cos(cp) - lz) * seat;
    }
    this.camera.position.set(px, py, pz);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(lx, ly, lz);

    // the chase rig leans a touch into a turn; the cockpit banks with the ship, as a flight sim does
    const chaseRoll = clamp(-s.yawRate * 0.03, -0.06, 0.06), seatRoll = clamp(-s.yawRate * COCKPIT.bank, -COCKPIT.maxBank, COCKPIT.maxBank);
    const wantRoll = chaseRoll + (seatRoll - chaseRoll) * this.seat;
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
