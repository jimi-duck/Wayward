import {
  AdditiveBlending, BackSide, CylinderGeometry, DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Sprite, SpriteMaterial, ShaderMaterial, Vector3, Color,
  type Scene, type Texture,
} from 'three';
import { clamp } from '../core/math';
import { JUMP_T } from '../sim/breakout';

// ── the jump: through the ring, into the lane ─────────────────────────────
// The drive charges on the way in; when the ship reaches the ring it does not
// vanish, it goes through. The path is plain arithmetic on the seconds since
// the drive let go (`pose`), so the ship, the camera, the ring and the screen
// flash all read one clock and a still frame of any moment can be drawn.
//
//   0.0 – 0.5   the nose swings to the ring's axis and the ship settles to its middle
//   ~0.4        she crosses the ring: it blazes, a ripple runs out of it
//   0.5 – 2.2   the speed builds: stars stretch to lines, the camera widens and drops low,
//               a pale teal tube closes round the path with a light at its far end
//   2.2 – 2.9   the hull draws long and thin into the light, the screen goes to pale teal
//
// Everything past the ship is light on top of the sector (additive, no depth
// writes) and cheap: one instanced draw of thin ribbons, one open tube, one sprite.

const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Seconds the speed takes to build, and the top speed (units a second). */
const RAMP = 2.4;
const TOP = 1500;

/** Where the jump started, in the gate's frame: the way out through the ring (a unit vector) and the ship's offset from the ring's centre. */
export interface Launch {
  gx: number; gz: number;
  /** The exit direction through the ring. */
  dx: number; dz: number;
  /** Metres along the exit direction at the start (negative: still on the near side) and sideways. */
  a0: number; l0: number;
  heading0: number; headingOut: number;
  /** Speed along the exit direction at the start. */
  v0: number;
  /** Seconds in at which the ship crosses the ring's plane. */
  cross: number;
}

/** The heading (the sim's, radians: forward is cos h, -sin h) that points along (dx, dz). */
const headingOf = (dx: number, dz: number) => Math.atan2(-dz, dx);

/**
 * Latch the jump: `axis` is the ring's normal on the side the ship came in
 * (render/breakout.ts), so the way out is the other side, unless the ship is
 * already pointing out of this one.
 */
export function launchFrom(gate: { x: number; z: number }, axis: number, ship: { x: number; z: number; vx: number; vz: number; heading: number }): Launch {
  let dx = -Math.cos(axis), dz = Math.sin(axis);
  const fx = Math.cos(ship.heading), fz = -Math.sin(ship.heading);
  if (fx * dx + fz * dz < 0) { dx = -dx; dz = -dz; }
  const rx = ship.x - gate.x, rz = ship.z - gate.z;
  const l: Launch = {
    gx: gate.x, gz: gate.z, dx, dz,
    a0: rx * dx + rz * dz, l0: rx * -dz + rz * dx,
    heading0: ship.heading, headingOut: headingOf(dx, dz),
    v0: Math.max(28, ship.vx * dx + ship.vz * dz),
    cross: 0,
  };
  // the crossing time, from the path itself
  let lo = 0, hi = JUMP_T;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (along(l, mid) < 0) lo = mid; else hi = mid; }
  l.cross = (lo + hi) / 2;
  return l;
}

/** Metres along the exit direction (from the ring's plane) `t` seconds into the jump. */
function along(l: Launch, t: number): number {
  const u = Math.min(1, t / RAMP);
  // the speed is a smooth ramp, so the distance is its integral: u³ - u⁴/2
  return l.a0 + l.v0 * t * 0.8 + TOP * RAMP * (u * u * u - u * u * u * u / 2) + (t > RAMP ? TOP * (t - RAMP) : 0);
}

/** How fast the ship is going, 0 to 1 of the top speed. */
export const rush = (t: number) => smooth(0.25, RAMP, t);

export interface WarpPose { x: number; z: number; heading: number; rush: number }

export function pose(l: Launch, t: number): WarpPose {
  const a = along(l, t), side = l.l0 * (1 - smooth(0, Math.max(0.3, l.cross), t));
  let dh = l.headingOut - l.heading0;
  dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  return {
    x: l.gx + l.dx * a + -l.dz * side,
    z: l.gz + l.dz * a + l.dx * side,
    heading: l.heading0 + dh * smooth(0, 0.5, t),
    rush: rush(t),
  };
}

/** The pale teal screen at the end: 0 until the last moments, 1 at the end of the jump. */
export const whiteout = (t: number) => smooth(2.3, 2.85, t);

/** How far the hull is drawn out along its length at `t`: 1 for none. */
export const stretch = (t: number) => 1 + 2.2 * smooth(1.9, 2.75, t);

/** The camera: how much wider the lens is, and how far the framing drops (0 to 1), at `t`. */
export const lens = (t: number) => smooth(0.3, 1.9, t);

/** How bright the ring is at `t` (1 at the crossing, easing off after), on top of its own state. */
export function flare(l: Launch | null, t: number): number {
  if (!l || t < 0) return 0;
  return smooth(0, Math.max(0.12, l.cross - 0.1), t) * (1 - smooth(l.cross + 0.2, l.cross + 1.6, t));
}

// ── the light ─────────────────────────────────────────────────────────────

const STREAK_VERT = /* glsl */ `
  attribute vec2 aCorner;   // x: 0 tail to 1 head; y: -1 to 1 across
  attribute vec4 aSeed;     // angle, radius, phase, length (all 0 to 1)
  uniform vec3 uCam;
  uniform vec3 uDir;
  uniform vec3 uU;
  uniform vec3 uV;
  uniform float uRush;
  uniform float uSpan;
  uniform float uBehind;
  varying vec2 vUv;
  varying float vFade;
  varying vec3 vCol;
  void main() {
    float ang = aSeed.x * 6.2831853;
    float rad = mix(3.5, 70.0, aSeed.y * aSeed.y);
    vec3 lat = (cos(ang) * uU + sin(ang) * uV) * rad;
    float along = mod(aSeed.z * uSpan - dot(uCam, uDir), uSpan) - uBehind;
    vec3 head = uCam + uDir * along + lat;
    float len = (5.0 + 85.0 * aSeed.w) * (0.1 + 1.9 * uRush);
    vec3 tail = head - uDir * len;
    vec3 p = mix(tail, head, aCorner.x);
    vec3 view = p - uCam;
    float dist = length(view);
    vec3 side = normalize(cross(uDir, view));
    float w = max(0.05, dist * 0.0032);
    p += side * aCorner.y * w;
    float x = (along + uBehind) / uSpan;
    vFade = smoothstep(0.0, 0.1, x) * (1.0 - smoothstep(0.82, 1.0, x)) * smoothstep(2.0, 14.0, dist);
    vUv = vec2(aCorner.x, aCorner.y);
    vCol = mix(vec3(0.45, 1.15, 1.45), vec3(2.0, 2.3, 2.5), aSeed.y);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const STREAK_FRAG = /* glsl */ `
  uniform float uRush;
  varying vec2 vUv;
  varying float vFade;
  varying vec3 vCol;
  void main() {
    float a = pow(vUv.x, 1.6) * pow(1.0 - abs(vUv.y), 1.5);
    gl_FragColor = vec4(vCol * a * vFade * uRush * 1.35, 1.0);
  }
`;

const TUBE_VERT = /* glsl */ `
  uniform vec3 uCam;
  uniform vec3 uDir;
  varying float vAng;
  varying float vAlong;
  varying float vFar;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vec3 r = w.xyz - uCam;
    vAlong = dot(w.xyz, uDir);
    vFar = clamp(dot(r, uDir) / 700.0, 0.0, 1.0);
    vAng = atan(dot(r, normalize(cross(uDir, vec3(0.0, 1.0, 0.0)))), r.y);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const TUBE_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform float uDetail;
  varying float vAng;
  varying float vAlong;
  varying float vFar;
  void main() {
    float bands = 0.5 + 0.5 * sin(vAng * 9.0 + sin(vAlong * 0.013 + uTime) * 2.0);
    float rings = 0.5 + 0.5 * sin(vAlong * 0.035);
    float t = mix(0.6, bands * (0.45 + 0.55 * rings), uDetail);
    vec3 deep = vec3(0.02, 0.09, 0.2);
    vec3 teal = vec3(0.12, 0.85, 1.05);
    vec3 col = mix(deep, teal, t) * (0.12 + 0.55 * vFar);
    col += vec3(1.6, 2.0, 2.15) * pow(vFar, 5.0);
    gl_FragColor = vec4(col * uOpacity, 1.0);
  }
`;

export class WarpView {
  private readonly streaks: Mesh;
  private readonly tube: Mesh;
  private readonly core: Sprite;
  private readonly sMat: ShaderMaterial;
  private readonly tMat: ShaderMaterial;
  private readonly dir = new Vector3();
  private readonly u = new Vector3(0, 1, 0);
  private readonly v = new Vector3();
  private time = 0;

  constructor(scene: Scene, glow: Texture, count: number) {
    const g = new InstancedBufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(12), 3));
    g.setAttribute('aCorner', new Float32BufferAttribute([0, -1, 0, 1, 1, 1, 1, -1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const seed = new Float32Array(count * 4);
    // a fixed spread, so the same jump looks the same: a golden-ratio walk, not random
    for (let i = 0; i < count; i++) {
      seed[i * 4] = (i * 0.61803398875) % 1;
      seed[i * 4 + 1] = ((i * 0.7548776662) + 0.3) % 1;
      seed[i * 4 + 2] = ((i * 0.5698402909) + 0.1) % 1;
      seed[i * 4 + 3] = ((i * 0.8191725134) + 0.6) % 1;
    }
    g.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
    g.instanceCount = count;
    this.sMat = new ShaderMaterial({
      vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG,
      uniforms: {
        uCam: { value: new Vector3() }, uDir: { value: this.dir }, uU: { value: this.u }, uV: { value: this.v },
        uRush: { value: 0 }, uSpan: { value: 760 }, uBehind: { value: 40 },
      },
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false,
    });
    this.streaks = new Mesh(g, this.sMat);
    this.streaks.frustumCulled = false;
    this.streaks.visible = false;
    this.streaks.renderOrder = 4;

    this.tMat = new ShaderMaterial({
      vertexShader: TUBE_VERT, fragmentShader: TUBE_FRAG,
      uniforms: { uCam: { value: new Vector3() }, uDir: { value: this.dir }, uOpacity: { value: 0 }, uTime: { value: 0 }, uDetail: { value: 1 } },
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: BackSide, toneMapped: false, fog: false,
    });
    // a tube along +Y by default, 700 long; turned onto the exit direction each frame
    const geo = new CylinderGeometry(34, 34, 700, 40, 1, true);
    geo.translate(0, 350 - 30, 0);
    this.tube = new Mesh(geo, this.tMat);
    this.tube.frustumCulled = false;
    this.tube.visible = false;
    this.tube.renderOrder = 3;

    this.core = new Sprite(new SpriteMaterial({ map: glow, color: new Color(0.7, 1.8, 2.1), blending: AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false, fog: false }));
    this.core.visible = false;
    this.core.renderOrder = 5;
    scene.add(this.streaks, this.tube, this.core);
  }

  /** Fewer ribbons and a plain tube on the cheapest tier. */
  setDetail(plain: boolean): void {
    this.tMat.uniforms.uDetail!.value = plain ? 0 : 1;
  }

  /** Draw the light for `t` seconds into the jump (negative: nothing). */
  update(t: number, camera: { position: Vector3 }, dx: number, dz: number, dt: number, still: boolean): void {
    const on = t >= 0.25;
    this.streaks.visible = this.tube.visible = this.core.visible = on;
    if (!on) return;
    this.time += dt;
    this.dir.set(dx, 0, dz);
    this.v.crossVectors(this.dir, this.u).normalize();
    const r = rush(t), cam = camera.position;
    // less to look at with reduced motion: the tube and the light, ribbons held short
    const calm = still ? 0.35 : 1;
    this.sMat.uniforms.uRush!.value = r * calm;
    (this.sMat.uniforms.uCam!.value as Vector3).copy(cam);
    this.tMat.uniforms.uCam!.value.copy(cam);
    this.tMat.uniforms.uTime!.value = still ? 0 : this.time * 1.6;
    this.tMat.uniforms.uOpacity!.value = smooth(0.7, 1.6, t) * (0.9 - 0.25 * smooth(2.3, 2.8, t));
    // the tube lies along the exit direction, starting just behind the camera
    this.tube.position.copy(cam);
    this.tube.quaternion.setFromUnitVectors(this.u, this.dir);
    // the light at the far end swells as the speed builds
    this.core.position.set(cam.x + dx * 560, cam.y, cam.z + dz * 560);
    this.core.scale.setScalar(70 + 520 * Math.pow(r, 1.4));
    (this.core.material as SpriteMaterial).opacity = smooth(0.5, 1.6, t) * 0.9;
  }

  dispose(): void {
    this.streaks.geometry.dispose();
    this.sMat.dispose();
    this.tube.geometry.dispose();
    this.tMat.dispose();
    (this.core.material as SpriteMaterial).dispose();
  }
}
