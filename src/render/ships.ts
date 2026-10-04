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
// The Wayward: a stolen Obedience-class ore hauler, registry OB-7731-A,
// after brand v1.1 and the hero render (branding/). Long and low, read as a
// freighter first: a central hull of layered plating on an octagonal
// spine, a wedge prow with the bridge recessed into it, two long engine
// pods carried on pylons either side, their big drives the only strong
// light on her. No central engine: the stern is a cargo face, "03" on its
// plates. Hazard amber over charcoal structure, worn through to the metal,
// the registry and her new name stencilled on. Ugly, patched, still running.
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
    hull: metal({ tint: 0x6f7276, roughness: 0.6, metalness: 0.45 }),
    paint: metal({ tint: 0xd98a1c, roughness: 0.6, metalness: 0.08, scale: 0.85, painted: true, emissive: new Color(0.02, 0.01, 0) }),
    dark: metal({ tint: 0x3d3c3b, roughness: 0.48, metalness: 0.65, scale: 1.5 }),
    pipe: metal({ tint: 0x2a2928, roughness: 0.4, metalness: 0.8, scale: 2 }),
    window: new MeshStandardMaterial({ color: 0x0b1416, roughness: 0.12, metalness: 0.9, emissive: new Color(0.02, 0.09, 0.11) }),
    red: new MeshBasicMaterial({ color: new Color(3.2, 0.35, 0.25), toneMapped: false }),
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

/** The drive's throat, looking in: a white-hot centre, glow falling off through stator rings. White, tinted by the engine colour. */
let vanes: Texture | null = null;
function vaneTexture(): Texture {
  if (vanes) return vanes;
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, 124);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.22, 'rgba(255,255,255,.9)');
  glow.addColorStop(0.55, 'rgba(255,255,255,.42)');
  glow.addColorStop(1, 'rgba(255,255,255,.12)');
  g.fillStyle = glow;
  g.beginPath(); g.arc(0, 0, 124, 0, Math.PI * 2); g.fill();
  // stator rings and a few struts, dark against the light
  g.strokeStyle = 'rgba(0,0,0,.55)';
  for (const [r, wd] of [[58, 5], [84, 4], [108, 6]] as const) { g.lineWidth = wd; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.beginPath(); g.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); g.lineTo(Math.cos(a) * 122, Math.sin(a) * 122); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5;
  g.beginPath(); g.arc(0, 0, 123, 0, Math.PI * 2); g.stroke();
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

// ── the hull ──────────────────────────────────────────────────────────────

const OCT = Math.cos(Math.PI / 8);

/**
 * An octagonal prism along X, flat on top and on the flanks, `w` wide and `h`
 * high, faceted (flat normals) so the chamfers catch the light as plates do.
 * `taper` scales the +X end.
 */
function octGeo(len: number, w: number, h: number, taper = 1): BufferGeometry {
  const g = new CylinderGeometry(taper, 1, len, 8, 1).rotateY(Math.PI / 8).rotateZ(-Math.PI / 2);
  g.scale(1, h / (2 * OCT), w / (2 * OCT));
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

function oct(k: Kit, key: string, x0: number, x1: number, w: number, h: number, y: number, z: number, taper = 1): void {
  k.add(key, octGeo(x1 - x0, w, h, taper), [(x0 + x1) / 2, y, z]);
}

/** A run of plating along X from x0 to x1: segments with dark seams between, mostly painted. */
function plated(k: Kit, rnd: () => number, x0: number, x1: number, n: number, w: number, h: number, y: number, z: number, bare = 0.25): void {
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step + 0.02, b = x0 + (i + 1) * step - 0.02;
    const grow = 1 + (rnd() - 0.5) * 0.06;
    const pick = rnd();
    oct(k, pick < bare * 0.55 ? 'dark' : pick < bare ? 'hull' : 'paint', a, b, w * grow, h * grow, y, z);
    // between segments: a recessed seam, or every so often a frame standing proud
    const frame = i % 2 === 1;
    oct(k, 'dark', b - 0.01, b + 0.05, w * (frame ? 1.05 : 0.95), h * (frame ? 1.05 : 0.95), y, z);
    // a hatch, vent or service plate set into the top
    if (rnd() < 0.4) {
      const iw = (b - a) * (0.3 + rnd() * 0.4), id = w * (0.2 + rnd() * 0.3);
      k.box(rnd() < 0.5 ? 'dark' : 'pipe', [iw, 0.03, id], [a + (b - a) * (0.25 + rnd() * 0.5), y + (h * grow) / 2, z + (rnd() - 0.5) * w * 0.3]);
    }
  }
}

/** The central hull: spine, layered deck plating, flank armour, the prow and the bridge. */
function hull(k: Kit, rnd: () => number): void {
  const y = 0.1;
  // the spine: charcoal structure the plating hangs on
  oct(k, 'dark', -2.0, 1.55, 1.0, 0.6, y, 0);
  oct(k, 'hull', -1.85, 1.3, 0.78, 0.3, y - 0.3, 0);
  // the deck: two layers of painted plate, the upper one narrower, stepped like the boards
  plated(k, rnd, -1.95, 1.45, 7, 0.92, 0.2, y + 0.3, 0, 0.35);
  plated(k, rnd, -1.7, 0.95, 5, 0.56, 0.18, y + 0.46, 0, 0.5);
  // on top of the spine: housings, a heat exchanger, a mast
  for (const [x, w] of [[-1.45, 0.34], [-0.85, 0.26], [-0.2, 0.3], [0.45, 0.22]] as const) {
    k.box(rnd() < 0.5 ? 'paint' : 'dark', [w, 0.1 + rnd() * 0.06, 0.3], [x, y + 0.6, (rnd() - 0.5) * 0.1]);
  }
  for (let i = 0; i < 6; i++) k.box('pipe', [0.03, 0.05, 0.42], [-1.15 + i * 0.07, y + 0.57, 0]);
  k.greebles('dark', rnd, -1.6, 0.8, -0.2, 0.2, y + 0.55, 14, 0.07);
  k.cyl('pipe', 0.012, 0.016, 0.42, [-0.55, y + 0.78, 0.12], 'y', 6);
  k.cyl('pipe', 0.01, 0.01, 0.3, [0.3, y + 0.72, -0.1], 'y', 6);
  // flank armour: painted plates, some hung slightly proud, with dark gaps
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = -1.75 + i * 0.52 + rnd() * 0.04, len = 0.4 + rnd() * 0.08;
      k.box(rnd() < 0.72 ? 'paint' : 'hull', [len, 0.26, 0.05], [x, y + 0.04, s * (0.5 + rnd() * 0.02)], [s * 0.08, 0, 0]);
      if (rnd() < 0.5) k.box('dark', [len * 0.5, 0.06, 0.03], [x, y - 0.14, s * 0.52]);
    }
    // conduit along the flank, under the armour
    k.cyl('pipe', 0.025, 0.025, 3.3, [-0.2, y - 0.17, s * 0.47], 'x', 6);
    k.cyl('pipe', 0.018, 0.018, 3.0, [-0.3, y - 0.22, s * 0.44], 'x', 6);
  }
  // the prow: a long wedge, painted plate over a dark chin
  oct(k, 'paint', 1.5, 2.25, 0.96, 0.56, y + 0.04, 0, 0.42);
  oct(k, 'dark', 1.5, 2.2, 0.8, 0.3, y - 0.18, 0, 0.5);
  k.wedge('paint', [[1.45, 0.42], [2.15, 0.16], [2.15, -0.16], [1.45, -0.42]], 0.12, [0, y + 0.32, 0]);
  oct(k, 'dark', 2.22, 2.42, 0.4, 0.22, y + 0.02, 0, 0.6);
  // the bridge: recessed into the prow, a band of dark glass under a brow
  k.box('dark', [0.34, 0.12, 0.66], [1.3, y + 0.45, 0]);
  k.box('window', [0.06, 0.07, 0.58], [1.49, y + 0.42, 0], [0, 0, -0.5]);
  for (const z of [-0.2, 0, 0.2]) k.box('dark', [0.07, 0.08, 0.02], [1.49, y + 0.42, z], [0, 0, -0.5]);
  k.box('paint', [0.3, 0.04, 0.7], [1.36, y + 0.52, 0]);
  // floodlights under the prow
  for (const z of [-0.18, 0.18]) k.box('lamp', [0.03, 0.03, 0.08], [2.1, y - 0.12, z]);
  // the stern: a cargo face, no drive: three plates, the big hull number on each
  k.box('dark', [0.14, 0.62, 1.04], [-2.04, y, 0]);
  k.box('dark', [0.16, 0.3, 0.32], [-2.1, y + 0.02, 0]);
  for (const z of [-0.34, 0.34]) k.box('paint', [0.06, 0.4, 0.3], [-2.13, y + 0.02, z]);
  k.box('paint', [0.04, 0.24, 0.26], [-2.19, y + 0.02, 0]);
  for (const z of [-0.34, 0, 0.34]) k.decal('decal', DECAL.n03, 0.2, 0.2, [z === 0 ? -2.216 : -2.165, y + 0.04, z], AFT, UP);
  k.box('paint', [0.06, 0.08, 0.98], [-2.08, y + 0.35, 0]);
  k.decal('decal', DECAL.hazard, 0.5, 0.06, [-2.112, y + 0.35, 0], AFT, UP);
  // the name on the prow's shoulders, the registry under the bridge
  k.decal('decal', DECAL.name, 0.62, 0.09, [1.82, y + 0.385, 0], UP, FWD);
  for (const s of [-1, 1]) k.decal('decal', DECAL.reg, 0.7, 0.09, [0.4, y + 0.04, s * 0.531], [0, 0, s], UP);
  k.decal('decal', DECAL.n17, 0.2, 0.2, [-0.95, y + 0.561, 0], UP, FWD);
  // red marker lamps along the spine and on the stern corners
  for (const [x, yy, z] of [[-2.1, y + 0.3, 0.5], [-2.1, y + 0.3, -0.5], [0.95, y + 0.58, 0.24], [-0.1, y + 0.66, 0], [-2.1, y - 0.28, 0]] as const) {
    k.box('red', [0.035, 0.035, 0.035], [x, yy, z]);
  }
}

/** An engine pod on its pylons: long, octagonal, plated, its drive astern. Returns the nozzle. */
function pod(k: Kit, rnd: () => number, z: number): Nozzle {
  const s = Math.sign(z), y = 0.02, w = 0.82, h = 0.78;
  // the barrel: plated segments, the nose cap tapered
  plated(k, rnd, -1.55, 0.7, 5, w, h, y, z, 0.45);
  oct(k, 'dark', 0.7, 1.05, w * 0.94, h * 0.94, y, z, 0.62);
  oct(k, 'hull', 1.05, 1.13, w * 0.56, h * 0.56, y, z, 0.8);
  // an armoured spine of plates along the top and the outboard flank
  for (let i = 0; i < 4; i++) {
    const x = -1.35 + i * 0.52;
    k.box(rnd() < 0.7 ? 'paint' : 'dark', [0.44, 0.06, 0.34], [x, y + h / 2 + 0.03, z]);
    k.box(rnd() < 0.6 ? 'paint' : 'hull', [0.44, 0.3, 0.05], [x + 0.04, y, z + s * (w / 2 + 0.02)]);
  }
  k.greebles('dark', rnd, -1.45, 0.5, z - 0.12, z + 0.12, y + h / 2 + 0.06, 8, 0.07);
  k.cyl('pipe', 0.022, 0.022, 2.1, [-0.45, y + h / 2 + 0.02, z - s * 0.24], 'x', 6);
  // the drive housing: heavier, dark, ribbed, the bell recessed in it
  oct(k, 'dark', -2.0, -1.55, w * 1.1, h * 1.12, y, z);
  for (const x of [-1.62, -1.78, -1.93]) oct(k, 'hull', x - 0.02, x + 0.02, w * 1.15, h * 1.17, y, z);
  const r = 0.35;
  k.cyl('dark', r * 0.92, r * 1.08, 0.24, [-2.0, y, z], 'x', 32, true);
  k.ring('hull', r * 1.06, 0.035, [-2.11, y, z], 'x', 36);
  k.ring('dark', r * 0.7, 0.02, [-2.03, y, z], 'x', 30);
  // hazard bands by the drive, the registry on the outboard side
  k.decal('decal', DECAL.hazard, 0.36, 0.08, [-1.42, y + 0.15, z + s * (w / 2 + 0.046)], [0, 0, s], UP);
  k.decal('decal', DECAL.n9f, 0.2, 0.2, [-0.55, y + h / 2 + 0.065, z], UP, FWD);
  // the pylons: two heavy struts and a pipe bundle to the hull
  const span = Math.abs(z) - w / 2 - 0.46;
  for (const x of [-1.1, 0.15]) {
    k.box('dark', [0.26, 0.12, span + 0.1], [x, y + 0.08, s * (0.46 + span / 2)]);
    k.box('hull', [0.18, 0.06, span + 0.1], [x, y + 0.17, s * (0.46 + span / 2)]);
  }
  k.cyl('pipe', 0.03, 0.03, span + 0.1, [-0.48, y - 0.05, s * (0.46 + span / 2)], 'z', 6);
  k.cyl('pipe', 0.03, 0.03, span + 0.1, [-0.4, y - 0.05, s * (0.46 + span / 2)], 'z', 6);
  // machinery on the pylons: tanks, a pump housing, the drive's feed
  k.box('dark', [0.5, 0.2, span * 0.6], [-0.48, y + 0.2, s * (0.48 + span * 0.45)]);
  k.cyl('hull', 0.09, 0.09, 0.5, [-0.48, y + 0.36, s * (0.5 + span * 0.3)], 'x', 10);
  k.cyl('paint', 0.07, 0.07, 0.34, [0.15, y + 0.3, s * (0.5 + span * 0.5)], 'x', 10);
  // a red lamp on the drive housing, top outboard
  k.box('red', [0.035, 0.035, 0.035], [-1.75, y + h / 2 + 0.06, z + s * 0.2]);
  return { p: [-2.12, y, z], r: r * 0.95 };
}

const STRETCH = 1.2;

function buildWayward(): BuiltHull {
  const k = new Kit(), rnd = seeded(7731);
  hull(k, rnd);
  const nozzles: Nozzle[] = [pod(k, rnd, -1.26), pod(k, rnd, 1.26)];
  // built compact, then drawn out: long and low, a freighter first
  const root = k.build(materials());
  for (const m of root.children) (m as Mesh).geometry.scale(STRETCH, 1, 1);
  for (const n of nozzles) n.p[0] *= STRETCH;
  return { root, nozzles, wings: [[1.1 * STRETCH, 0.12, -1.26], [1.1 * STRETCH, 0.12, 1.26]], shield: [2.75 * STRETCH, 1.0, 2.05] };
}

/** The model is built in kit units; this brings it to play scale (the hitbox is 0.9). */
const MODEL_SCALE = 0.66;

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
// Unseen until it takes a hit: then a hex lattice flares, red at the rim
// (red is damage). It shimmers teal through the grace after a hit. With
// shield charges up it stands faintly blue at the rim, and a hit it absorbs
// flares blue instead of red; phased, it shimmers violet.
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
  private readonly glowLight = new PointLight(0xbfeaff, 0, 7, 2);
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
    this.glowLight.intensity = (1.1 + 1.6 * h) * flick;
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
    // a hit that got through flares red (damage); a charge or the grace after a hit stands in teal (the ship's own state)
    const tint: [number, number, number] = st.phased ? [2.2, 0.8, 3.6] : st.cloaked ? [0.6, 2.4, 1.3]
      : this.hit > 0 && !this.absorbed ? [2.6, 0.55, 0.35] : this.absorbed || st.charged > 0 ? [0.7, 1.5, 3.4] : [0.45, 1.6, 1.8];
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
