import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh,
  MeshBasicMaterial, PointLight, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, type Material, type Object3D,
  type Texture,
} from 'three';
import { clamp, lerp } from '../core/math';
import type { ShipState } from '../sim/ship';
import { ROLL_TIME } from '../sim/tuning';
import { Kit, metal, seeded, type V3 } from './kit';
import { glowTexture } from './textures';

// ── the player's ship ─────────────────────────────────────────────────────
// The Defiant: a broad gunship on two great engine pods. Heavy, industrial,
// weathered: armoured blocks, stepped superstructure, a command tower, gun
// turrets, pipes and vents, and engines the size of the ship's own beam,
// burning red-hot. Somewhere between a gothic warship, a spice-hauler and a
// rebel gunboat; not traced from any one design.
//
// The model faces +X with +Y up, so its starboard side is +Z.

/** Engines: white-hot at the core, red-pink in the bell. */
const CORE = new Color(4.2, 2.2, 2.6);
const BELL = new Color(3.4, 0.45, 0.9);
const HALO = new Color(2.2, 0.25, 0.55);

let mats: Record<string, Material> | null = null;
function materials(): Record<string, Material> {
  if (mats) return mats;
  mats = {
    hull: metal({ tint: 0xd8cebe, roughness: 0.55, metalness: 0.3 }),
    dark: metal({ tint: 0x6e6964, roughness: 0.5, metalness: 0.6, scale: 1.4 }),
    trim: metal({ tint: 0x7a2a22, roughness: 0.65, metalness: 0.35, scale: 1.2 }),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.2, 1.2), toneMapped: false }),
  };
  return mats;
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

/** One engine pod along X: drum, armour bands, nose cone, flared bell. Returns its nozzle. */
function pod(k: Kit, rnd: () => number, x: number, y: number, z: number, r: number, len: number): Nozzle {
  const back = x - len / 2;
  k.cyl('hull', r, r, len, [x, y, z], 'x', 18);
  for (let i = 0; i < 4; i++) k.cyl('dark', r * 1.06, r * 1.06, len * 0.06, [back + len * (0.15 + i * 0.22), y, z], 'x', 18);
  k.cyl('hull', r * 0.45, r, len * 0.24, [x + len / 2 + len * 0.12, y, z], 'x', 18);
  k.cyl('dark', r * 0.18, r * 0.45, len * 0.08, [x + len / 2 + len * 0.28, y, z], 'x', 12);
  k.cyl('dark', r * 0.98, r * 1.1, len * 0.2, [back - len * 0.1, y, z], 'x', 22, true);
  k.ring('dark', r * 1.06, r * 0.1, [back - len * 0.2, y, z], 'x', 28);
  k.greebles('dark', rnd, back + 0.1, x + len / 2 - 0.1, z - r * 0.45, z + r * 0.45, y + r * 0.92, Math.round(len * 6), r * 0.32);
  for (let i = 0; i < 4; i++) k.box('dark', [len * 0.1, r * 0.12, r * 0.08], [back + len * (0.3 + i * 0.13), y, z + Math.sign(z || 1) * r * 1.02]);
  return { p: [back - len * 0.18, y, z], r: r * 0.92 };
}

/** A gun turret: a housing and twin barrels. */
function turret(k: Kit, x: number, y: number, z: number, s = 1): void {
  k.box('dark', [0.3 * s, 0.14 * s, 0.3 * s], [x, y + 0.07 * s, z]);
  k.cyl('dark', 0.1 * s, 0.13 * s, 0.08 * s, [x, y + 0.17 * s, z], 'y', 10);
  for (const o of [-0.05, 0.05]) k.cyl('dark', 0.025 * s, 0.03 * s, 0.55 * s, [x + 0.3 * s, y + 0.17 * s, z + o * s], 'x', 6);
}

/** Lit windows: a row of small warm lights. */
function windows(k: Kit, x0: number, x1: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++) k.box('lamp', [0.045, 0.028, 0.012], [x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z]);
}

function buildEscort(): BuiltHull {
  const k = new Kit(), rnd = seeded(5);
  // the main hull: a broad armoured wedge
  k.wedge('hull', [[1.95, 0], [1.5, 0.42], [0.9, 0.62], [-1.2, 0.62], [-1.45, 0.45], [-1.45, -0.45], [-1.2, -0.62], [0.9, -0.62], [1.5, -0.42]], 0.5);
  k.wedge('dark', [[1.7, 0], [1.3, 0.36], [0.7, 0.5], [-1.3, 0.5], [-1.3, -0.5], [0.7, -0.5], [1.3, -0.36]], 0.12, [0, -0.3, 0]);
  // stepped superstructure and the command tower
  k.box('hull', [2.0, 0.22, 0.86], [-0.2, 0.36, 0]);
  k.box('dark', [1.6, 0.06, 0.92], [-0.2, 0.49, 0]);
  k.box('hull', [1.15, 0.24, 0.58], [-0.4, 0.62, 0]);
  k.box('hull', [0.44, 0.34, 0.42], [-0.55, 0.9, 0]);
  k.box('dark', [0.52, 0.05, 0.5], [-0.55, 1.09, 0]);
  k.box('dark', [0.08, 0.06, 0.3], [-0.3, 0.96, 0]);
  k.cyl('dark', 0.018, 0.018, 0.55, [-0.65, 1.36, 0.1], 'y', 6);
  k.cyl('dark', 0.014, 0.014, 0.38, [-0.45, 1.28, -0.12], 'y', 6);
  windows(k, -0.72, -0.38, 0.95, 0.215, 5);
  windows(k, -0.72, -0.38, 0.95, -0.215, 5);
  windows(k, -0.9, 0.1, 0.62, 0.295, 9);
  windows(k, -0.9, 0.1, 0.62, -0.295, 9);
  // the prow: a keel and a red-painted spine
  k.box('dark', [0.9, 0.18, 0.5], [1.25, -0.28, 0]);
  k.wedge('trim', [[1.92, 0], [1.6, 0.13], [0.95, 0.13], [0.95, -0.13], [1.6, -0.13]], 0.05, [0, 0.27, 0]);
  k.greebles('dark', rnd, -1.2, 0.85, -0.4, 0.4, 0.47, 34, 0.11);
  k.greebles('hull', rnd, 0.25, 1.35, -0.32, 0.32, 0.25, 14, 0.12);
  turret(k, 0.55, 0.47, 0.25);
  turret(k, 0.55, 0.47, -0.25);
  // sponsons out to the engine pods, and the pods themselves
  const nozzles: Nozzle[] = [];
  for (const s of [-1, 1]) {
    k.box('hull', [1.3, 0.38, 0.62], [-0.55, 0.02, s * 0.84]);
    k.box('dark', [1.1, 0.1, 0.66], [-0.5, 0.25, s * 0.84]);
    k.box('trim', [0.5, 0.02, 0.4], [-0.25, 0.31, s * 0.84]);
    nozzles.push(pod(k, rnd, -0.5, 0.06, s * 1.4, 0.5, 1.9));
  }
  // the stern: an engine block between the pods
  k.box('dark', [0.32, 0.42, 0.92], [-1.55, 0.06, 0]);
  for (let i = 0; i < 5; i++) k.box('dark', [0.06, 0.32, 0.04], [-1.73, 0.06, -0.3 + i * 0.15]);
  return { root: k.build(materials()), nozzles, wings: [[-0.3, 0.1, -2.0], [-0.3, 0.1, 2.0]], shield: [2.4, 1.2, 2.3] };
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
const TRAIL_HEAD = new Color(2.6, 0.4, 0.8);
const TRAIL_TAIL = new Color(0.6, 0.06, 0.12);

class Trail {
  readonly mesh: Mesh;
  width = 0.3;
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
      const r = (TRAIL_HEAD.r + (TRAIL_TAIL.r - TRAIL_HEAD.r) * t) * a;
      const gg = (TRAIL_HEAD.g + (TRAIL_TAIL.g - TRAIL_HEAD.g) * t) * a;
      const bb = (TRAIL_HEAD.b + (TRAIL_TAIL.b - TRAIL_HEAD.b) * t) * a;
      C.set([r, gg, bb, r, gg, bb], i * 6);
    }
    this.pos.needsUpdate = true;
    this.col.needsUpdate = true;
  }
}

// ── the shield ────────────────────────────────────────────────────────────
// Unseen until it takes a hit: then a hex lattice flares, hot amber at the
// rim. It also shimmers through the grace after a hit.
function shieldMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHit: { value: 0 }, uGrace: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color(2.6, 0.9, 0.35) } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHit; uniform float uGrace; uniform float uTime; uniform vec3 uColor;
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
        float a = (fres * 0.9 + hex * 0.5) * max(uHit, pulse);
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
  private readonly discMat = new MeshBasicMaterial({ color: BELL.clone(), side: DoubleSide, toneMapped: false });
  private readonly coreMat = new MeshBasicMaterial({ color: CORE.clone(), side: DoubleSide, toneMapped: false });
  /** The engines light the ship's own stern and whatever is behind it. */
  private readonly glowLight = new PointLight(0xff4a5a, 0, 7, 2);
  private readonly rimMat = new MeshBasicMaterial({ color: BELL.clone(), toneMapped: false });
  private bank = 0;
  private pitch = 0;
  private heat = 0;
  private hit = 0;
  private trailClock = 0;
  private time = 0;

  constructor(glow: Texture = glowTexture()) {
    this.model = buildEscort();
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
        halo: new Sprite(new SpriteMaterial({ map: glow, color: HALO, blending: AdditiveBlending, depthWrite: false })),
        trail: new Trail(),
      };
      e.plume.frustumCulled = false;
      this.rollG.add(e.disc, e.core, e.rim, e.plume, e.halo);
      this.root.add(e.trail.mesh);
      this.engines.push(e);
    }
    for (const c of [new Color(3, 0.25, 0.25), new Color(0.25, 3, 0.6)]) {
      const s = new Sprite(new SpriteMaterial({ map: glow, color: c, blending: AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.3);
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
      e.core.scale.setScalar(r * 0.36);
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

  /** Flare the shield: a hit landed. */
  flareShield(): void {
    this.hit = 1;
  }

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

    const h = this.heat, flick = 1 + Math.sin(this.time * 47) * 0.05;
    this.discMat.color.copy(BELL).multiplyScalar(0.12 + 0.22 * h);
    this.rimMat.color.copy(BELL).multiplyScalar((0.55 + 0.6 * h) * flick);
    this.coreMat.color.copy(CORE).multiplyScalar((0.35 + 0.75 * h) * flick);
    this.plumeMat.uniforms.uHeat!.value = h;
    this.plumeMat.uniforms.uTime!.value = this.time;
    for (const e of this.engines) {
      const r = e.nozzle.r;
      e.plume.scale.set(r * (1.2 + 3.2 * h) * flick, r * 0.95, r * 0.95);
      e.halo.scale.setScalar(r * (1.7 + 1.1 * h) * flick);
    }
    this.glowLight.intensity = (1 + 4 * h) * flick;
    const blink = Math.sin(this.time * Math.PI * 2) > 0.6;
    for (const l of this.lights) l.visible = blink;

    this.hit = Math.max(0, this.hit - dt * 2.2);
    const grace = s.invuln > 0 && s.rollT < 0 ? Math.min(1, s.invuln) : 0;
    this.shieldMat.uniforms.uHit!.value = this.hit;
    this.shieldMat.uniforms.uGrace!.value = grace;
    this.shieldMat.uniforms.uTime!.value = this.time;
    this.shield.visible = this.hit > 0 || grace > 0;

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
