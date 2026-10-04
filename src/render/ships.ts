import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PointLight, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, TorusGeometry,
  type Material, type Object3D, type Texture,
} from 'three';
import { clamp, lerp } from '../core/math';
import type { ShipState } from '../sim/ship';
import { ROLL_TIME } from '../sim/tuning';
import { Kit, metal, seeded, type V3 } from './kit';
import { glowTexture } from './textures';

// ── the player's ship ─────────────────────────────────────────────────────
// The Wayward: a stolen Obedience-class ore hauler, registry OB-7731-A. A
// blunt cutting head up front, its jaws round the cutting laser and a low
// bridge set back on top; behind it a chunky engine block in faded
// hazard yellow, its stern one great drive ring, ore containers racked
// along its spine; and two drive pods out on swept pylons, their coils
// glowing along the inboard side. Numbers are stencilled on the plating
// (03, 9F, 17), the registry on the cheeks and her new name, painted over
// the old one, on the head. Ugly, worn, barely worth stealing.
//
// The model faces +X with +Y up, so its starboard side is +Z.

/** Engines: white-hot at the core, drive cyan in the bell. */
const CORE = new Color(2.6, 3.9, 4.4);
const BELL = new Color(0.3, 2.1, 3.4);
const HALO = new Color(0.2, 1.4, 2.2);

let mats: Record<string, Material> | null = null;
function materials(): Record<string, Material> {
  if (mats) return mats;
  mats = {
    hull: metal({ tint: 0x8d9094, roughness: 0.62, metalness: 0.35 }),
    paint: metal({ tint: 0xf2b21f, roughness: 0.62, metalness: 0.06, scale: 1.1, emissive: new Color(0.04, 0.024, 0) }),
    dark: metal({ tint: 0x5e5a56, roughness: 0.5, metalness: 0.6, scale: 1.4 }),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.4, 1.5), toneMapped: false }),
    glow: new MeshBasicMaterial({ color: new Color(0.6, 2.6, 3.4), toneMapped: false }),
    coil: new MeshBasicMaterial({ color: new Color(0.12, 0.85, 1.3), toneMapped: false }),
    laser: new MeshBasicMaterial({ color: new Color(1.5, 0.5, 0.14), toneMapped: false }),
    decal: new MeshStandardMaterial({
      map: decalTexture(), transparent: true, alphaTest: 0.35, roughness: 0.8, metalness: 0.1,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }),
  };
  return mats;
}

// ── the stencils ──────────────────────────────────────────────────────────
// One small atlas, painted at startup: hull numbers, a hazard band and the
// registry, in dark paint worn through in places.
type Cell = [number, number, number, number];
const AW = 1024, AH = 512;
const cell = (x0: number, y0: number, x1: number, y1: number): Cell => [x0 / AW, 1 - y1 / AH, x1 / AW, 1 - y0 / AH];
const DECAL = {
  n03: cell(0, 0, 256, 256), n9f: cell(256, 0, 512, 256), n17: cell(512, 0, 768, 256), hazard: cell(768, 0, 1024, 256),
  reg: cell(0, 256, 1024, 384), name: cell(0, 384, 1024, 512),
};

let decals: Texture | null = null;
function decalTexture(): Texture {
  if (decals) return decals;
  const c = document.createElement('canvas');
  c.width = AW; c.height = AH;
  const g = c.getContext('2d')!;
  const rnd = seeded(1903);
  const ink = 'rgba(30,27,24,.94)';
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 190px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  [['03', 128], ['9F', 384], ['17', 640]].forEach(([t, x]) => g.fillText(String(t), Number(x), 136));
  // the hazard band: diagonal stripes in a frame
  g.save();
  g.beginPath(); g.rect(776, 72, 240, 112); g.clip();
  for (let k = -120; k < 260; k += 44) {
    g.beginPath(); g.moveTo(776 + k, 184); g.lineTo(776 + k + 22, 184); g.lineTo(776 + k + 22 + 112, 72); g.lineTo(776 + k + 112, 72); g.fill();
  }
  g.restore();
  g.lineWidth = 8; g.strokeStyle = ink; g.strokeRect(780, 76, 232, 104);
  g.font = '800 92px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  g.fillText('OB-7731-A', 512, 322);
  g.font = '700 70px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  g.fillText('WAYWARD', 512, 450);
  // wear: chips and scratches through the paint
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${0.4 + rnd() * 0.6})`;
    g.beginPath(); g.arc(rnd() * AW, rnd() * AH, 1 + rnd() * 5, 0, Math.PI * 2); g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = rnd() * AW, y = rnd() * AH, a = rnd() * Math.PI, l = 10 + rnd() * 50;
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  decals = t;
  return t;
}

/** The drive ring's vanes: white on black, tinted by the engine colour. */
let vanes: Texture | null = null;
function vaneTexture(): Texture {
  if (vanes) return vanes;
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  const n = 18;
  for (let i = 0; i < n; i++) {
    g.save();
    g.rotate((i / n) * Math.PI * 2);
    const grad = g.createLinearGradient(0, 30, 0, 124);
    grad.addColorStop(0, 'rgba(255,255,255,.95)');
    grad.addColorStop(1, 'rgba(255,255,255,.35)');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(-5, 30); g.quadraticCurveTo(14, 78, 4, 124); g.lineTo(16, 124); g.quadraticCurveTo(24, 76, 5, 30); g.fill();
    g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 6;
  g.beginPath(); g.arc(0, 0, 122, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.fill();
  vanes = new CanvasTexture(c);
  vanes.colorSpace = SRGBColorSpace;
  return vanes;
}

export interface Nozzle { p: V3; r: number; }

export interface BuiltHull {
  root: Group;
  /** Engine nozzles, model space: where the plumes, trails and halos sit. */
  nozzles: Nozzle[];
  /** Wingtips, for running lights: port then starboard. */
  wings: V3[];
  /** Shield ellipsoid radii (x, y, z). */
  shield: V3;
}

const UP: V3 = [0, 1, 0], FWD: V3 = [1, 0, 0], AFT: V3 = [-1, 0, 0];

/** A ring of small parts round the Y axis at (cx, y): lights, windows. */
function ringOf(k: Kit, key: string, cx: number, y: number, r: number, n: number, size: V3, skip = 0): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (skip && Math.abs(Math.cos(a) + 1) < skip) continue; // leave a gap aft, where the neck meets
    k.box(key, size, [cx + Math.cos(a) * r, y, Math.sin(a) * r], [0, -a, 0]);
  }
}

/** The bow: a blunt cutting head with the bridge on top, the cutting jaws ahead and the registry on the cheeks. */
function bow(k: Kit, rnd: () => number, cx: number, cy: number): void {
  // the head: a broad armoured block, chamfered toward the jaws
  k.box('hull', [1.1, 0.34, 1.5], [cx, cy, 0]);
  k.wedge('hull', [[cx + 0.55, 0.75], [cx + 1.05, 0.42], [cx + 1.05, -0.42], [cx + 0.55, -0.75]], 0.3, [0, cy - 0.15, 0]);
  k.box('dark', [1.12, 0.05, 1.52], [cx, cy - 0.15, 0]);
  // the cutting jaws: two prongs either side of the laser emitter
  for (const s of [-1, 1]) {
    k.box('dark', [0.55, 0.12, 0.12], [cx + 1.25, cy - 0.04, s * 0.3]);
    k.box('paint', [0.18, 0.13, 0.13], [cx + 1.5, cy - 0.04, s * 0.3]);
  }
  k.cyl('dark', 0.08, 0.11, 0.3, [cx + 1.15, cy - 0.04, 0], 'x', 16);
  k.ring('laser', 0.1, 0.02, [cx + 1.3, cy - 0.04, 0], 'x', 20);
  // floodlights along the leading edge
  for (let i = -3; i <= 3; i++) k.box('lamp', [0.02, 0.03, 0.06], [cx + 1.06, cy + 0.04, i * 0.12]);
  // the bridge: a low block set back, a strip of windows, an antenna mast
  k.box('hull', [0.46, 0.18, 0.62], [cx - 0.2, cy + 0.26, 0]);
  k.box('glow', [0.02, 0.04, 0.5], [cx + 0.035, cy + 0.29, 0]);
  k.box('dark', [0.3, 0.06, 0.4], [cx - 0.25, cy + 0.38, 0]);
  k.cyl('dark', 0.012, 0.012, 0.3, [cx - 0.32, cy + 0.55, 0.12], 'y', 6);
  ringOf(k, 'lamp', cx - 0.2, cy + 0.2, 0.36, 12, [0.03, 0.014, 0.012]);
  // plating seams and machinery on the head
  for (const z of [-0.5, 0.5]) k.box('dark', [1.0, 0.02, 0.03], [cx, cy + 0.175, z]);
  k.greebles('hull', rnd, cx - 0.5, cx + 0.4, -0.65, -0.35, cy + 0.17, 6, 0.08);
  k.greebles('hull', rnd, cx - 0.5, cx + 0.4, 0.35, 0.65, cy + 0.17, 6, 0.08);
  // the registry and the name, port and starboard
  for (const z of [-0.752, 0.752]) k.decal('decal', DECAL.reg, 0.8, 0.1, [cx + 0.05, cy + 0.02, z], [0, 0, Math.sign(z)], FWD);
  k.decal('decal', DECAL.name, 0.56, 0.07, [cx + 0.3, cy + 0.172, 0], UP, FWD);
}

/** The cargo spine's ore containers, racked along the top of the hull. */
function containers(k: Kit, rnd: () => number): void {
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const key = rnd() < 0.35 ? 'paint' : 'hull';
      k.box(key, [0.36, 0.22, 0.34], [-1.15 + i * 0.4, 0.62, s * 0.2]);
      k.box('dark', [0.37, 0.03, 0.35], [-1.15 + i * 0.4, 0.74, s * 0.2]);
    }
  }
}

/** One drive pod along X at (y, z): a painted after body, ribbed grey forward, coils inboard. Returns its nozzle. */
function drivePod(k: Kit, y: number, z: number, number: Cell): Nozzle {
  const side = Math.sign(z);
  k.cyl('paint', 0.25, 0.25, 0.62, [-1.3, y, z], 'x', 24);
  k.cyl('dark', 0.275, 0.275, 0.07, [-1.6, y, z], 'x', 24);
  k.cyl('dark', 0.262, 0.262, 0.05, [-0.99, y, z], 'x', 24);
  k.cyl('hull', 0.232, 0.232, 1.2, [-0.38, y, z], 'x', 24);
  for (let i = 0; i < 6; i++) k.cyl('dark', 0.242, 0.242, 0.028, [-0.9 + i * 0.2, y, z], 'x', 24);
  k.cyl('paint', 0.12, 0.232, 0.3, [0.37, y, z], 'x', 20);
  k.cyl('dark', 0.03, 0.12, 0.08, [0.56, y, z], 'x', 12);
  // the coils: a glowing strip down the inboard flank, and a fainter one under
  k.box('coil', [1.08, 0.075, 0.02], [-0.38, y, z - side * 0.232]);
  k.box('coil', [1.08, 0.02, 0.06], [-0.38, y - 0.232, z]);
  // a spine along the top, housings, and the hull number on the after body
  k.box('paint', [1.0, 0.05, 0.09], [-0.85, y + 0.265, z]);
  k.box('dark', [0.22, 0.08, 0.12], [-0.2, y + 0.25, z]);
  k.box('dark', [0.5, 0.05, 0.05], [-1.25, y, z + side * 0.25]);
  k.decal('decal', number, 0.26, 0.26, [-1.26, y + 0.252, z], UP, FWD);
  k.decal('decal', DECAL.hazard, 0.2, 0.1, [-1.62, y + 0.12, z], AFT, UP);
  return { p: [-1.66, y, z], r: 0.215 };
}

/** The engineering hull: armoured blocks in hazard yellow, the drive ring astern. Returns its nozzle. */
function engineering(k: Kit, rnd: () => number): Nozzle {
  // the core block, its upper deck, and the armoured pods either side
  k.box('paint', [1.72, 0.6, 0.92], [-0.62, 0.02, 0]);
  k.box('hull', [1.25, 0.13, 0.72], [-0.78, 0.38, 0]);
  k.box('dark', [1.0, 0.05, 0.76], [-0.78, 0.46, 0]);
  for (const s of [-1, 1]) {
    const pod: Array<[number, number]> = [[-1.48, 0.42], [-0.3, 0.42], [-0.05, 0.5], [-0.05, 0.74], [-0.3, 0.78], [-1.48, 0.78]];
    k.wedge('paint', pod.map(([x, zz]) => [x, zz * s]), 0.5, [0, -0.04, 0]);
    k.box('hull', [0.7, 0.05, 0.28], [-0.95, 0.235, s * 0.6]);
    // rear grilles on the pods
    for (let i = 0; i < 5; i++) k.box('dark', [0.04, 0.05, 0.28], [-1.49, -0.2 + i * 0.085, s * 0.6]);
    // pipes along the flanks
    k.cyl('dark', 0.028, 0.028, 1.5, [-0.7, 0.28, s * 0.47], 'x', 8);
    k.cyl('dark', 0.022, 0.022, 1.2, [-0.75, -0.12, s * 0.79], 'x', 8);
  }
  // the bow, tapering under the cutting head
  k.wedge('paint', [[0.2, 0.46], [0.82, 0.24], [0.82, -0.24], [0.2, -0.46]], 0.42, [0, 0.0, 0]);
  k.box('dark', [0.5, 0.06, 0.5], [0.4, 0.23, 0]);
  // the keel
  k.box('dark', [1.5, 0.1, 0.52], [-0.6, -0.32, 0]);
  // machinery on the upper deck
  k.greebles('hull', rnd, -1.3, -0.25, -0.3, 0.3, 0.485, 14, 0.1);
  k.greebles('dark', rnd, -1.2, -0.4, -0.25, 0.25, 0.485, 6, 0.08);
  // the stern: a frame round the drive ring
  k.box('dark', [0.08, 0.6, 0.86], [-1.5, 0.02, 0]);
  k.cyl('dark', 0.33, 0.33, 0.16, [-1.56, -0.02, 0], 'x', 32, true);
  k.ring('hull', 0.33, 0.045, [-1.64, -0.02, 0], 'x', 36);
  k.decal('decal', DECAL.hazard, 0.34, 0.12, [-1.545, 0.25, 0], AFT, UP);
  // the hull numbers, as on the reference: 03 to port, 9F to starboard, 17 on the bow
  k.decal('decal', DECAL.n03, 0.3, 0.3, [-0.7, 0.212, -0.6], UP, FWD);
  k.decal('decal', DECAL.n9f, 0.3, 0.3, [-0.7, 0.212, 0.6], UP, FWD);
  k.decal('decal', DECAL.n17, 0.22, 0.22, [0.5, 0.215, 0], UP, FWD);
  return { p: [-1.66, -0.02, 0], r: 0.27 };
}

function buildWayward(): BuiltHull {
  const k = new Kit(), rnd = seeded(1903);
  const main = engineering(k, rnd);
  // the neck: the cutting head sits on the bow of the engine block
  k.wedge('dark', [[-0.35, 0.26], [0.75, 0.2], [0.75, -0.2], [-0.35, -0.26]], 0.12, [0, 0.25, 0]);
  bow(k, rnd, 0.72, 0.2);
  containers(k, rnd);
  // the pylons: a flat strut and a pipe each side, swept a little aft
  const nozzles: Nozzle[] = [main];
  for (const s of [-1, 1]) {
    k.box('dark', [0.34, 0.055, 1.12], [-0.72, 0.13, s * 1.2], [0, s * 0.12, 0]);
    k.box('hull', [0.2, 0.04, 1.08], [-1.15, 0.17, s * 1.2], [0, s * 0.08, 0]);
    k.cyl('dark', 0.03, 0.03, 1.1, [-0.5, 0.06, s * 1.2], 'z', 8);
    nozzles.push(drivePod(k, 0.17, s * 1.78, s < 0 ? DECAL.n03 : DECAL.n9f));
  }
  return { root: k.build(materials()), nozzles, wings: [[0.9, 0.2, -0.76], [0.9, 0.2, 0.76]], shield: [2.45, 1.05, 2.4] };
}

/** The model is built in kit units; this brings it to play scale (the hitbox is 0.9). */
const MODEL_SCALE = 0.72;

// ── engine plumes ─────────────────────────────────────────────────────────
// A cone of light out of each nozzle: dense and white-pink at the throat,
// thinning to red, longer and brighter on the throttle, flickering.
function plumeMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 }, uCore: { value: CORE }, uBell: { value: BELL } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; uniform float uTime; uniform vec3 uCore; uniform vec3 uBell;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float along = vUv.y; // 0 at the nozzle, 1 at the tip
        float edge = pow(clamp(abs(dot(vN, vV)), 0.0, 1.0), 1.6);
        float flick = 0.85 + 0.15 * sin(uTime * 63.0 + along * 20.0) * sin(uTime * 41.0);
        float a = pow(1.0 - along, 1.7) * edge * flick * (0.35 + 0.65 * uHeat);
        vec3 c = mix(uCore, uBell, smoothstep(0.0, 0.45, along));
        gl_FragColor = vec4(c * a, a);
      }`,
  });
}

// ── engine trails ─────────────────────────────────────────────────────────
const TRAIL_N = 18;
/** World units of trail at most: the close camera sits only a few units behind the ship. */
const TRAIL_LEN = 1.4;
const TRAIL_EVERY = 1 / 60;
const TRAIL_HEAD = new Color(0.4, 1.8, 2.6);
const TRAIL_TAIL = new Color(0.05, 0.3, 0.6);

class Trail {
  readonly mesh: Mesh;
  width = 0.3;
  readonly head = TRAIL_HEAD.clone();
  readonly tail = TRAIL_TAIL.clone();
  private readonly pts = new Float32Array(TRAIL_N * 3);
  private readonly heat = new Float32Array(TRAIL_N);
  private readonly pos: BufferAttribute;
  private readonly col: BufferAttribute;
  private primed = false;

  constructor() {
    const g = new BufferGeometry();
    this.pos = new BufferAttribute(new Float32Array(TRAIL_N * 6), 3);
    this.col = new BufferAttribute(new Float32Array(TRAIL_N * 6), 3);
    g.setAttribute('position', this.pos);
    g.setAttribute('color', this.col);
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mesh = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    this.mesh.frustumCulled = false;
  }

  push(x: number, y: number, z: number, heat: number): void {
    if (!this.primed) { for (let i = 0; i < TRAIL_N; i++) this.pts.set([x, y, z], i * 3); this.primed = true; }
    this.pts.copyWithin(3, 0, (TRAIL_N - 1) * 3);
    this.heat.copyWithin(1, 0, TRAIL_N - 1);
    this.pts[0] = x; this.pts[1] = y; this.pts[2] = z; this.heat[0] = heat;
  }

  draw(x: number, y: number, z: number): void {
    this.pts[0] = x; this.pts[1] = y; this.pts[2] = z;
    const p = this.pts, P = this.pos.array as Float32Array, C = this.col.array as Float32Array;
    let run = 0;
    for (let i = 0; i < TRAIL_N; i++) {
      if (i > 0) run += Math.hypot(p[i * 3]! - p[i * 3 - 3]!, p[i * 3 + 1]! - p[i * 3 - 2]!, p[i * 3 + 2]! - p[i * 3 - 1]!);
      const fade = Math.max(0, 1 - run / TRAIL_LEN);
      const j = Math.min(i + 1, TRAIL_N - 1), k = Math.max(i - 1, 0);
      let dx = p[k * 3]! - p[j * 3]!, dz = p[k * 3 + 2]! - p[j * 3 + 2]!;
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const t = i / (TRAIL_N - 1), w = this.width * (1 - t * 0.7) * 0.5;
      const ox = -dz * w, oz = dx * w;
      P.set([p[i * 3]! + ox, p[i * 3 + 1]!, p[i * 3 + 2]! + oz, p[i * 3]! - ox, p[i * 3 + 1]!, p[i * 3 + 2]! - oz], i * 6);
      const a = this.heat[i]! * fade * fade * (1 - t) * 0.3;
      const H = this.head, T = this.tail;
      const r = (H.r + (T.r - H.r) * t) * a;
      const gg = (H.g + (T.g - H.g) * t) * a;
      const bb = (H.b + (T.b - H.b) * t) * a;
      C.set([r, gg, bb, r, gg, bb], i * 6);
    }
    this.pos.needsUpdate = true;
    this.col.needsUpdate = true;
  }
}

// ── the shield ────────────────────────────────────────────────────────────
// Unseen until it takes a hit: then a hex lattice flares, hot amber at the
// rim. It also shimmers through the grace after a hit. With shield
// charges up it stands faintly blue at the rim, and a hit it absorbs flares
// blue instead of amber; phased, it shimmers violet.
function shieldMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHit: { value: 0 }, uGrace: { value: 0 }, uTime: { value: 0 }, uCharge: { value: 0 }, uColor: { value: new Color(2.6, 0.9, 0.35) } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHit; uniform float uGrace; uniform float uTime; uniform float uCharge; uniform vec3 uColor;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float hexEdge(vec2 p) {
        vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
        vec2 g = dot(a, a) < dot(b, b) ? a : b;
        g = abs(g);
        float d = max(dot(g, normalize(r)), g.x);
        return smoothstep(0.42, 0.5, d);
      }
      void main() {
        // clamped: rounding can push the dot past 1, and pow of a negative is NaN,
        // which bloom would smear across the whole frame
        float fres = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5);
        vec2 uv = vec2(atan(vP.z, vP.x) * 3.0, vP.y * 9.0);
        float hex = hexEdge(uv * 1.6 + vec2(0.0, uTime * 0.6));
        float pulse = uGrace * (0.12 + 0.08 * sin(uTime * 18.0));
        // a charged shield stands faintly at the rim, so the player can see it is up
        float standing = uCharge * (0.045 + 0.02 * sin(uTime * 2.4)) * (fres * 1.6 + hex * 0.3);
        float a = (fres * 0.9 + hex * 0.5) * max(uHit, pulse) + standing;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

// ── the view ──────────────────────────────────────────────────────────────
interface Engine { nozzle: Nozzle; disc: Mesh; core: Mesh; rim: Mesh; plume: Mesh; halo: Sprite; trail: Trail; }

export class ShipView {
  readonly root = new Group();
  private readonly yawG = new Group();
  private readonly pitchG = new Group();
  private readonly rollG = new Group();
  private readonly model: BuiltHull;
  private readonly engines: Engine[] = [];
  private readonly lights: Sprite[] = [];
  private readonly shield: Mesh;
  private readonly shieldMat = shieldMaterial();
  private readonly plumeMat = plumeMaterial();
  private readonly discMat = new MeshBasicMaterial({ color: BELL.clone(), map: vaneTexture(), side: DoubleSide, toneMapped: false });
  private readonly coreMat = new MeshBasicMaterial({ color: CORE.clone(), side: DoubleSide, toneMapped: false });
  /** The engines light the ship's own stern and whatever is behind it. */
  private readonly glowLight = new PointLight(0x4ad8ff, 0, 7, 2);
  private readonly rimMat = new MeshBasicMaterial({ color: BELL.clone(), toneMapped: false });
  /** The engines' colours: stock red, or a cosmetic. */
  private readonly core = CORE.clone();
  private readonly bell = BELL.clone();
  private readonly halo = HALO.clone();
  private absorbed = false;
  private bank = 0;
  private pitch = 0;
  private heat = 0;
  private hit = 0;
  private trailClock = 0;
  private time = 0;

  constructor(glow: Texture = glowTexture()) {
    this.model = buildWayward();
    this.model.root.scale.setScalar(MODEL_SCALE);
    this.rollG.add(this.model.root);
    const disc = new CircleGeometry(1, 24).rotateY(-Math.PI / 2);
    const rimGeo = new TorusGeometry(1, 0.09, 6, 32).rotateY(Math.PI / 2);
    const plumeGeo = new CylinderGeometry(0.15, 1, 1, 20, 1, true).translate(0, 0.5, 0).rotateZ(Math.PI / 2);
    for (const n of this.model.nozzles) {
      const e: Engine = {
        nozzle: { p: [n.p[0] * MODEL_SCALE, n.p[1] * MODEL_SCALE, n.p[2] * MODEL_SCALE], r: n.r * MODEL_SCALE },
        disc: new Mesh(disc, this.discMat),
        core: new Mesh(disc, this.coreMat),
        rim: new Mesh(rimGeo, this.rimMat),
        plume: new Mesh(plumeGeo, this.plumeMat),
        halo: new Sprite(new SpriteMaterial({ map: glow, color: this.halo, blending: AdditiveBlending, depthWrite: false })),
        trail: new Trail(),
      };
      e.plume.frustumCulled = false;
      this.rollG.add(e.disc, e.core, e.rim, e.plume, e.halo);
      this.root.add(e.trail.mesh);
      this.engines.push(e);
    }
    for (const c of [new Color(3, 0.25, 0.25), new Color(0.25, 3, 0.6)]) {
      const s = new Sprite(new SpriteMaterial({ map: glow, color: c, blending: AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.17);
      this.lights.push(s);
      this.rollG.add(s);
    }
    this.shield = new Mesh(new SphereGeometry(1, 40, 20), this.shieldMat);
    this.rollG.add(this.shield, this.glowLight);
    this.place();
    this.pitchG.add(this.rollG);
    this.yawG.add(this.pitchG);
    this.root.add(this.yawG);
  }

  /** Put the engines, running lights and shield on the model. */
  private place(): void {
    const S = MODEL_SCALE;
    for (const e of this.engines) {
      const [x, y, z] = e.nozzle.p, r = e.nozzle.r;
      e.disc.position.set(x + 0.04, y, z);
      e.disc.scale.setScalar(r);
      e.core.position.set(x + 0.02, y, z);
      e.core.scale.setScalar(r * 0.2);
      e.rim.position.set(x + 0.01, y, z);
      e.rim.scale.setScalar(r * 0.93);
      e.plume.position.set(x, y, z);
      e.halo.position.set(x - r * 0.4, y, z);
      e.trail.width = r * 0.3;
    }
    this.glowLight.position.set(Math.min(...this.model.nozzles.map((n) => n.p[0])) * S - 1.4, 0.2, 0);
    this.model.wings.forEach((w, i) => this.lights[i]!.position.set(w[0] * S, w[1] * S, w[2] * S));
    this.shield.scale.set(...(this.model.shield.map((v) => v * S) as V3));
  }

  /** World positions of the nozzles and how hard they are burning, for exhaust sparks. */
  exhaust(): { points: Array<[number, number, number]>; heat: number } {
    return { points: this.engines.map((e) => [...tipWorld(this.rollG, e.nozzle.p)] as [number, number, number]), heat: this.heat };
  }

  /** Flare the shield: a hit landed. `absorbed` when a shield charge took it. */
  flareShield(absorbed = false): void {
    this.hit = 1;
    this.absorbed = absorbed;
  }

  /** Engine colours, HDR: the bright core and the bell around it. */
  setEngine(core: [number, number, number], bell: [number, number, number]): void {
    this.core.setRGB(...core);
    this.bell.setRGB(...bell);
    this.halo.setRGB(bell[0] * 0.65, bell[1] * 0.65, bell[2] * 0.65);
    this.plumeMat.uniforms.uCore!.value = this.core;
    this.plumeMat.uniforms.uBell!.value = this.bell;
    for (const e of this.engines) {
      e.trail.head.setRGB(bell[0] * 0.78, bell[1] * 0.9, bell[2] * 0.9);
      e.trail.tail.setRGB(bell[0] * 0.18, bell[1] * 0.14, bell[2] * 0.14);
    }
  }

  /** The visible state the build adds: shield charges up, phased, weapons overloaded. */
  status = { charged: 0, phased: false, overload: false, cloaked: false };

  update(s: ShipState, dt: number, reduceMotion: boolean): void {
    this.time += dt;
    this.yawG.position.set(s.x, 0, s.z);
    this.yawG.rotation.y = s.heading;

    const wantBank = clamp(-s.yawRate * 0.16, -0.6, 0.6);
    const wantPitch = -0.07 * s.thrust;
    const k = Math.min(1, 6 * dt);
    this.bank = lerp(this.bank, wantBank, k);
    this.pitch = lerp(this.pitch, wantPitch, k);
    this.heat = lerp(this.heat, s.thrust, Math.min(1, 8 * dt));

    let roll = 0;
    if (s.rollT >= 0 && !reduceMotion) {
      const t = clamp(s.rollT / ROLL_TIME, 0, 1);
      roll = s.rollDir * Math.PI * 2 * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    }
    this.pitchG.rotation.z = this.pitch;
    this.rollG.rotation.x = this.bank + roll;
    // a slow heave, so a ship at rest still reads as afloat
    this.pitchG.position.y = Math.sin(this.time * 1.3) * 0.03;

    const h = this.heat, flick = 1 + Math.sin(this.time * 47) * 0.05, hot = this.status.overload ? 1.6 : 1;
    this.discMat.color.copy(this.bell).multiplyScalar((0.3 + 0.35 * h) * hot);
    this.rimMat.color.copy(this.bell).multiplyScalar((0.55 + 0.6 * h) * flick * hot);
    this.coreMat.color.copy(this.core).multiplyScalar((0.22 + 0.5 * h) * flick * hot);
    this.plumeMat.uniforms.uHeat!.value = h;
    this.plumeMat.uniforms.uTime!.value = this.time;
    for (const e of this.engines) {
      const r = e.nozzle.r;
      e.plume.scale.set(r * (1.2 + 3.2 * h) * flick, r * 0.95, r * 0.95);
      e.halo.scale.setScalar(r * (1.7 + 1.1 * h) * flick);
    }
    this.glowLight.intensity = (3.2 + 4 * h) * flick;
    const blink = Math.sin(this.time * Math.PI * 2) > 0.6;
    for (const l of this.lights) l.visible = blink;

    this.hit = Math.max(0, this.hit - dt * 2.2);
    const st = this.status;
    const grace = st.phased || st.cloaked ? 1 : s.invuln > 0 && s.rollT < 0 ? Math.min(1, s.invuln) : 0;
    const u = this.shieldMat.uniforms;
    u.uHit!.value = this.hit;
    u.uGrace!.value = grace;
    u.uTime!.value = this.time;
    u.uCharge!.value = st.charged;
    const tint: [number, number, number] = st.phased ? [2.2, 0.8, 3.6] : st.cloaked ? [0.6, 2.4, 1.3] : this.absorbed || (st.charged > 0 && this.hit <= 0) ? [0.7, 1.5, 3.4] : [2.6, 0.9, 0.35];
    (u.uColor!.value as Color).setRGB(...tint);
    this.shield.visible = this.hit > 0 || grace > 0 || st.charged > 0;

    this.root.updateMatrixWorld(true);
    this.trailClock += dt;
    const lay = this.trailClock >= TRAIL_EVERY;
    if (lay) this.trailClock %= TRAIL_EVERY;
    for (const e of this.engines) {
      const v = tipWorld(this.rollG, e.nozzle.p);
      if (lay) e.trail.push(v[0], v[1], v[2], 0.15 + 0.85 * h);
      e.trail.draw(v[0], v[1], v[2]);
    }
  }
}

const tmp: [number, number, number] = [0, 0, 0];
function tipWorld(o: Object3D, l: readonly number[]): [number, number, number] {
  const e = o.matrixWorld.elements;
  tmp[0] = e[0]! * l[0]! + e[4]! * l[1]! + e[8]! * l[2]! + e[12]!;
  tmp[1] = e[1]! * l[0]! + e[5]! * l[1]! + e[9]! * l[2]! + e[13]!;
  tmp[2] = e[2]! * l[0]! + e[6]! * l[1]! + e[10]! * l[2]! + e[14]!;
  return tmp;
}
