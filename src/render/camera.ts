import { MathUtils, PerspectiveCamera } from 'three';
import { clamp, smoothDamp, smoothDampAngle } from '../core/math';
import type { CameraMode } from '../sim/controls';

// ── the camera rig ────────────────────────────────────────────────────────
// Two styles, compared in M1 by flying them.
//
//  tactical · Fixed orientation: north is always up the screen. The camera
//             sits above and behind, steeply enough to read a dense field,
//             and leads the ship in the direction it is travelling so there
//             is more room ahead than behind. Pulls back a little at speed.
//  chase    · The camera swings round behind the ship, lagging a beat so a
//             turn is felt, looks ahead of the nose, and widens its field of
//             view with speed. More cinematic, less to see behind you.
//
// Distance is solved per frame so a minimum patch of the play plane is always
// in view, whatever the aspect: a portrait phone pulls back rather than
// seeing a sliver.

interface Style {
  /** Angle below the horizon, radians. */
  pitch: number;
  /** Minimum visible width and height of the plane at the target, units. */
  minW: number;
  minH: number;
  /** Seconds of velocity to lead by, and the cap on the lead in units. */
  lead: number;
  leadMax: number;
  /** Units ahead of the nose to look at. */
  lookAhead: number;
  /** Seconds to settle on the target. */
  follow: number;
  /** Seconds for the yaw to swing behind the ship (chase only). */
  yawFollow: number;
  /** Extra vertical FOV at top speed, degrees. */
  fovKick: number;
  /** Extra distance at top speed, as a fraction. */
  pullBack: number;
}

const STYLES: Record<CameraMode, Style> = {
  tactical: { pitch: MathUtils.degToRad(58), minW: 68, minH: 42, lead: 0.45, leadMax: 14, lookAhead: 0, follow: 0.22, yawFollow: 0, fovKick: 0, pullBack: 0.12 },
  chase:    { pitch: MathUtils.degToRad(30), minW: 44, minH: 26, lead: 0, leadMax: 0, lookAhead: 10, follow: 0.12, yawFollow: 0.32, fovKick: 7, pullBack: 0 },
};
const BASE_VFOV = 48;

/** What the rig needs to know about the ship this frame. */
export interface CameraSubject {
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  yawRate: number;
  /** Speed as a fraction of the hull's top speed. */
  speedFrac: number;
}

/** Zoom levels: how much of the plane is in view, as a multiple of the style's minimum. */
export const ZOOMS = [1, 0.65, 0.42] as const;

export class CameraRig {
  readonly camera = new PerspectiveCamera(BASE_VFOV, 1, 0.5, 4000);
  mode: CameraMode = 'tactical';
  /** Index into ZOOMS. */
  zoom = 0;
  private zoomNow = 1;
  private readonly vzoom = { v: 0 };
  /** The point on the plane the camera looks at, after smoothing. */
  readonly target = { x: 0, z: 0 };

  private yaw = 0;
  private readonly vx = { v: 0 };
  private readonly vz = { v: 0 };
  private readonly vyaw = { v: 0 };
  private roll = 0;
  private aspect = 1;

  resize(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Jump straight to the subject with no easing (first frame, a respawn). */
  snap(s: CameraSubject): void {
    const [gx, gz] = this.goal(s);
    this.target.x = gx;
    this.target.z = gz;
    this.vx.v = this.vz.v = this.vyaw.v = 0;
    this.zoomNow = ZOOMS[this.zoom] ?? 1;
    this.yaw = this.mode === 'chase' ? s.heading - Math.PI / 2 : 0;
  }

  update(s: CameraSubject, dt: number): void {
    const st = STYLES[this.mode];
    const [gx, gz] = this.goal(s);
    this.target.x = smoothDamp(this.target.x, gx, this.vx, st.follow, dt);
    this.target.z = smoothDamp(this.target.z, gz, this.vz, st.follow, dt);

    // Behind the ship is the heading turned half round; as a yaw about +Y
    // from the +Z "behind" of the tactical camera, that is heading - PI/2.
    const wantYaw = this.mode === 'chase' ? s.heading - Math.PI / 2 : 0;
    this.yaw = smoothDampAngle(this.yaw, wantYaw, this.vyaw, this.mode === 'chase' ? st.yawFollow : 0.35, dt);

    const vfov = BASE_VFOV + st.fovKick * s.speedFrac;
    if (Math.abs(this.camera.fov - vfov) > 0.01) {
      this.camera.fov = vfov;
      this.camera.updateProjectionMatrix();
    }
    const halfH = Math.tan(MathUtils.degToRad(vfov) / 2);
    this.zoomNow = smoothDamp(this.zoomNow, ZOOMS[this.zoom] ?? 1, this.vzoom, 0.3, dt);
    const fit = Math.max(st.minH / (2 * halfH), st.minW / (2 * halfH * this.aspect)) * this.zoomNow;
    const dist = fit * (1 + st.pullBack * s.speedFrac);

    const back = Math.cos(st.pitch) * dist, up = Math.sin(st.pitch) * dist;
    this.camera.position.set(this.target.x + Math.sin(this.yaw) * back, up, this.target.z + Math.cos(this.yaw) * back);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target.x, 0, this.target.z);

    // The chase camera leans a few degrees into a hard turn.
    const wantRoll = this.mode === 'chase' ? clamp(-s.yawRate * 0.035, -0.07, 0.07) : 0;
    this.roll += (wantRoll - this.roll) * Math.min(1, 6 * dt);
    if (this.roll) this.camera.rotateZ(this.roll);
  }

  private goal(s: CameraSubject): [number, number] {
    const st = STYLES[this.mode];
    let lx = s.vx * st.lead, lz = s.vz * st.lead;
    const len = Math.hypot(lx, lz);
    if (len > st.leadMax && len > 0) { lx *= st.leadMax / len; lz *= st.leadMax / len; }
    return [
      s.x + lx + Math.cos(s.heading) * st.lookAhead,
      s.z + lz - Math.sin(s.heading) * st.lookAhead,
    ];
  }
}
