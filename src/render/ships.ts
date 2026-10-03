import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Group, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, Shape, SphereGeometry, Sprite,
  SpriteMaterial, Vector2, type Object3D, type Texture,
} from 'three';
import { HULL_ORDER, type HullId } from '../content/hulls';
import { clamp, lerp } from '../core/math';
import type { ShipState } from '../sim/ship';
import { ROLL_TIME } from '../sim/tuning';
import { armour, bake, neonLine } from './neon';
import { glowTexture } from './textures';

// ── the player's ships ────────────────────────────────────────────────────
// Stand-in models, detailed enough for the chase camera: panelled plating
// with lit windows and a red stripe, cyan nacelle strips, glowing impulse
// ports at the stern (the part the camera looks at), port and starboard
// running lights, and a hex shield that flares on a hit. Three silhouettes:
// the escort a broad wedge with its nacelles built in, the cruiser a long cut
// saucer on pylons, the scout a small saucer with nacelles slung low.
// Generic Starfleet-era forms, none traced from a canon design.
//
// Every model faces +X with +Y up, so its starboard side is +Z.

const SIGNAL = new Color('#00F0FF');
const COMMAND = new Color('#FF9F43');
// cyberpunk: magenta-hot impulse ports, cyan edges and nacelles
const PORT_CORE = new Color(3.6, 1.1, 3.9);
const PORT_HALO = new Color(2.0, 0.35, 2.6);
const EDGE = new Color(0.5, 2.8, 3.4);

let materials: { plate: MeshStandardMaterial; plateDark: MeshStandardMaterial; dish: MeshStandardMaterial; glow: Texture } | null = null;
function mats() {
  if (materials) return materials;
  materials = {
    // dark matte armour: the neon edges do the drawing
    plate: armour(0xc4ccd8),
    plateDark: armour(0x7d8592),
    dish: new MeshStandardMaterial({ color: 0x1a0f05, emissive: COMMAND, emissiveIntensity: 2.2 }),
    glow: glowTexture(),
  };
  return materials;
}

function nacelleGlow(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x041318, emissive: SIGNAL, emissiveIntensity: 1.4 });
}

/** Mark a mesh as light, so the edge bake leaves it out. */
function lit<T extends Mesh>(m: T): T {
  m.userData.glow = true;
  return m;
}

/** Angular fins: a dorsal blade and a pair of swept vanes at the stern. */
function fins(root: Group, x: number, span: number, height: number): void {
  const { plateDark } = mats();
  const dorsal = new Mesh(slab([[0.1, 0], [-0.5, 0.03], [-0.7, 0.03], [-0.45, 0]], 0.04, 0.01), plateDark);
  dorsal.rotation.x = Math.PI / 2;
  dorsal.position.set(x + 0.2, height, 0);
  dorsal.scale.set(1, 1, 3.2);
  root.add(dorsal);
  for (const s of [-1, 1]) {
    const vane = new Mesh(slab([[0, 0], [-0.5, s * span], [-0.75, s * span], [-0.4, 0]], 0.04, 0.01), plateDark);
    vane.position.set(x, 0, 0);
    vane.rotation.x = s * 0.35;
    root.add(vane);
  }
}

/** Trace the hull's hard edges in neon and add them to it. */
function edged(b: BuiltHull): BuiltHull {
  const { edges } = bake(b.root, 26);
  b.root.add(new LineSegments(edges, neonLine(EDGE)));
  return b;
}

/** A prism from a top-view outline (x forward, y to port), bevelled at the edges. */
function slab(points: Array<[number, number]>, height: number, bevel = 0.04): BufferGeometry {
  const g = new ExtrudeGeometry(new Shape(points.map(([x, y]) => new Vector2(x, y))),
    { depth: height, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2, 0);
  return g;
}

export interface BuiltHull {
  root: Group;
  glow: MeshStandardMaterial;
  /** Stern ends of the nacelles, model space: where trails and impulse ports sit. */
  tips: Array<[number, number, number]>;
  /** Wingtips, for running lights: port then starboard. */
  wings: Array<[number, number, number]>;
  /** Shield ellipsoid radii (x, y, z). */
  shield: [number, number, number];
}

function nacelle(len: number, r: number, glow: MeshStandardMaterial): Group {
  const { plate, plateDark } = mats();
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(r, r * 1.1, len, 8), plate);
  body.rotation.z = Math.PI / 2;
  const strip = lit(new Mesh(new BoxGeometry(len * 0.8, r * 0.45, r * 2.2), glow));
  strip.position.y = r * 0.4;
  const cap = new Mesh(new CylinderGeometry(r * 0.75, r, len * 0.12, 8), plateDark);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = -len / 2 - len * 0.05;
  g.add(body, strip, cap);
  return g;
}

function buildEscort(): BuiltHull {
  const { plate, plateDark, dish } = mats();
  const glow = nacelleGlow();
  const root = new Group();
  const hull = new Mesh(slab([[1.35, 0], [0.3, 0.5], [-0.7, 0.86], [-1.08, 0.66], [-1.08, -0.66], [-0.7, -0.86], [0.3, -0.5]], 0.3), plate);
  const deck = new Mesh(slab([[0.8, 0], [0.05, 0.3], [-0.75, 0.38], [-0.75, -0.38], [0.05, -0.3]], 0.12, 0.02), plateDark);
  deck.position.y = 0.21;
  const bridge = new Mesh(new CylinderGeometry(0.16, 0.22, 0.1, 8), plate);
  bridge.position.set(0.15, 0.31, 0);
  root.add(hull, deck, bridge);
  for (const side of [-1, 1]) {
    const n = nacelle(1.0, 0.15, glow);
    n.position.set(-0.55, 0.1, side * 0.9);
    root.add(n);
  }
  const d = lit(new Mesh(new BoxGeometry(0.06, 0.08, 0.24), dish));
  d.position.set(1.0, -0.12, 0);
  root.add(d);
  fins(root, -0.55, 0.55, 0.32);
  return edged({ root, glow, tips: [[-1.12, 0.1, -0.9], [-1.12, 0.1, 0.9]], wings: [[-0.75, 0.05, -1.08], [-0.75, 0.05, 1.08]], shield: [1.65, 0.75, 1.45] });
}

function buildCruiser(): BuiltHull {
  const { plate, plateDark, dish } = mats();
  const glow = nacelleGlow();
  const root = new Group();
  const saucer = new Mesh(new CylinderGeometry(1, 1.04, 0.16, 8), plate);
  saucer.scale.set(1.18, 1, 0.95);
  saucer.rotation.y = Math.PI / 8;
  saucer.position.set(0.75, 0.18, 0);
  const bridge = new Mesh(new CylinderGeometry(0.22, 0.3, 0.12, 8), plateDark);
  bridge.position.set(0.75, 0.32, 0);
  const neck = new Mesh(slab([[0.2, 0.12], [-0.3, 0.12], [-0.3, -0.12], [0.2, -0.12]], 0.3, 0.02), plateDark);
  const body = new Mesh(slab([[0.1, 0.24], [-1.2, 0.2], [-1.35, 0], [-1.2, -0.2], [0.1, -0.24]], 0.34), plate);
  body.position.y = -0.12;
  root.add(saucer, bridge, neck, body);
  for (const side of [-1, 1]) {
    const n = nacelle(1.7, 0.14, glow);
    n.position.set(-1.0, 0.32, side * 0.75);
    const pylon = new Mesh(new BoxGeometry(0.34, 0.06, 0.6), plateDark);
    pylon.position.set(-0.75, 0.12, side * 0.42);
    pylon.rotation.x = side * 0.5;
    root.add(n, pylon);
  }
  const d = lit(new Mesh(new CylinderGeometry(0.12, 0.12, 0.04, 8), dish));
  d.rotation.z = Math.PI / 2;
  d.position.set(0.12, -0.12, 0);
  root.add(d);
  fins(root, -0.9, 0.5, 0.1);
  return edged({ root, glow, tips: [[-1.95, 0.32, -0.75], [-1.95, 0.32, 0.75]], wings: [[0.55, 0.2, -1.0], [0.55, 0.2, 1.0]], shield: [2.1, 0.8, 1.35] });
}

function buildScout(): BuiltHull {
  const { plate, plateDark, dish } = mats();
  const glow = nacelleGlow();
  const root = new Group();
  const saucer = new Mesh(new CylinderGeometry(0.72, 0.76, 0.16, 8), plate);
  saucer.rotation.y = Math.PI / 8;
  saucer.position.set(0.35, 0.08, 0);
  const bridge = new Mesh(new CylinderGeometry(0.16, 0.22, 0.1, 8), plateDark);
  bridge.position.set(0.35, 0.2, 0);
  const body = new Mesh(slab([[0.1, 0.22], [-0.7, 0.18], [-0.85, 0], [-0.7, -0.18], [0.1, -0.22]], 0.26), plateDark);
  body.position.set(0, -0.08, 0);
  root.add(saucer, bridge, body);
  for (const side of [-1, 1]) {
    const n = nacelle(0.9, 0.12, glow);
    n.position.set(-0.55, -0.16, side * 0.6);
    const pylon = new Mesh(new BoxGeometry(0.26, 0.05, 0.42), plateDark);
    pylon.position.set(-0.4, -0.1, side * 0.36);
    root.add(n, pylon);
  }
  const d = lit(new Mesh(new BoxGeometry(0.05, 0.07, 0.18), dish));
  d.position.set(1.1, 0.02, 0);
  root.add(d);
  fins(root, -0.5, 0.42, 0.18);
  return edged({ root, glow, tips: [[-1.05, -0.16, -0.6], [-1.05, -0.16, 0.6]], wings: [[0.35, 0.08, -0.78], [0.35, 0.08, 0.78]], shield: [1.4, 0.65, 1.05] });
}

const BUILDERS: Record<HullId, () => BuiltHull> = { escort: buildEscort, cruiser: buildCruiser, scout: buildScout };

/** A fresh copy of a hull's model, for the schematic. */
export function buildHull(id: HullId): BuiltHull {
  return BUILDERS[id]();
}

// ── engine trails ─────────────────────────────────────────────────────────
const TRAIL_N = 30;
const TRAIL_EVERY = 1 / 60;
const TRAIL_W = 0.2;
const TRAIL_HEAD = new Color(3.0, 0.5, 2.8);
const TRAIL_TAIL = new Color(0.2, 1.6, 2.6);

class Trail {
  readonly mesh: Mesh;
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
    for (let i = 0; i < TRAIL_N; i++) {
      const j = Math.min(i + 1, TRAIL_N - 1), k = Math.max(i - 1, 0);
      let dx = p[k * 3]! - p[j * 3]!, dz = p[k * 3 + 2]! - p[j * 3 + 2]!;
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const t = i / (TRAIL_N - 1), w = TRAIL_W * (1 - t) * 0.5;
      const ox = -dz * w, oz = dx * w;
      P.set([p[i * 3]! + ox, p[i * 3 + 1]!, p[i * 3 + 2]! + oz, p[i * 3]! - ox, p[i * 3 + 1]!, p[i * 3 + 2]! - oz], i * 6);
      const a = this.heat[i]! * (1 - t) * (1 - t * 0.6);
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
function shieldMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHit: { value: 0 }, uGrace: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color(0.3, 1.8, 2.4) } },
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
        float pulse = uGrace * (0.16 + 0.1 * sin(uTime * 18.0));
        float a = (fres * 0.9 + hex * 0.55) * max(uHit, pulse);
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

// ── the view ──────────────────────────────────────────────────────────────
export class ShipView {
  readonly root = new Group();
  private readonly yawG = new Group();
  private readonly pitchG = new Group();
  private readonly rollG = new Group();
  private readonly models = new Map<HullId, BuiltHull>();
  private current: BuiltHull;
  private readonly trails = [new Trail(), new Trail()];
  private readonly ports: Mesh[] = [];
  private readonly halos: Sprite[] = [];
  private readonly lights: Sprite[] = [];
  private readonly shield: Mesh;
  private readonly shieldMat = shieldMaterial();
  private bank = 0;
  private pitch = 0;
  private heat = 0;
  private hit = 0;
  private trailClock = 0;
  private time = 0;

  constructor(hull: HullId) {
    const { glow } = mats();
    for (const id of HULL_ORDER) {
      const b = BUILDERS[id]();
      b.root.visible = false;
      this.models.set(id, b);
      this.rollG.add(b.root);
    }
    // impulse ports and their halos, moved to the current hull's sterns
    const portGeo = new CircleGeometry(0.13, 16).rotateY(-Math.PI / 2);
    for (let i = 0; i < 2; i++) {
      const port = new Mesh(portGeo, new MeshBasicMaterial({ color: PORT_CORE.clone(), side: DoubleSide, toneMapped: false }));
      const halo = new Sprite(new SpriteMaterial({ map: glow, color: PORT_HALO, blending: AdditiveBlending, depthWrite: false }));
      this.ports.push(port);
      this.halos.push(halo);
      this.rollG.add(port, halo);
    }
    for (const c of [new Color(3, 0.25, 0.25), new Color(0.25, 3, 0.6)]) {
      const s = new Sprite(new SpriteMaterial({ map: glow, color: c, blending: AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.32);
      this.lights.push(s);
      this.rollG.add(s);
    }
    this.shield = new Mesh(new SphereGeometry(1, 40, 20), this.shieldMat);
    this.rollG.add(this.shield);
    this.current = this.models.get(hull)!;
    this.setHull(hull);
    this.pitchG.add(this.rollG);
    this.yawG.add(this.pitchG);
    this.root.add(this.yawG, ...this.trails.map((t) => t.mesh));
  }

  setHull(id: HullId): void {
    this.current.root.visible = false;
    this.current = this.models.get(id)!;
    this.current.root.visible = true;
    this.current.tips.forEach((t, i) => {
      this.ports[i]!.position.set(t[0] - 0.02, t[1], t[2]);
      this.halos[i]!.position.set(t[0] - 0.12, t[1], t[2]);
    });
    this.current.wings.forEach((w, i) => this.lights[i]!.position.set(...w));
    this.shield.scale.set(...this.current.shield);
  }

  /** World positions of the nozzles and how hard they are burning, for exhaust sparks. */
  exhaust(): { points: Array<[number, number, number]>; heat: number } {
    return { points: this.current.tips.map((t) => [...tipWorld(this.current.root, t)] as [number, number, number]), heat: this.heat };
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
    const wantPitch = -0.09 * s.thrust;
    const k = Math.min(1, 8 * dt);
    this.bank = lerp(this.bank, wantBank, k);
    this.pitch = lerp(this.pitch, wantPitch, k);
    this.heat = lerp(this.heat, s.thrust, Math.min(1, 10 * dt));

    let roll = 0;
    if (s.rollT >= 0 && !reduceMotion) {
      const t = clamp(s.rollT / ROLL_TIME, 0, 1);
      roll = s.rollDir * Math.PI * 2 * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    }
    this.pitchG.rotation.z = this.pitch;
    this.rollG.rotation.x = this.bank + roll;
    this.current.glow.emissiveIntensity = 1.3 + 2.6 * this.heat;
    for (const h of this.halos) h.scale.setScalar(0.55 + 0.9 * this.heat + Math.sin(this.time * 31) * 0.04);
    for (const p of this.ports) (p.material as MeshBasicMaterial).color.copy(PORT_CORE).multiplyScalar(0.55 + 0.6 * this.heat);
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
    this.current.tips.forEach((tip, i) => {
      const v = tipWorld(this.current.root, tip);
      const trail = this.trails[i]!;
      if (lay) trail.push(v[0], v[1], v[2], 0.2 + 0.8 * this.heat);
      trail.draw(v[0], v[1], v[2]);
    });
  }
}

const tmp: [number, number, number] = [0, 0, 0];
function tipWorld(o: Object3D, l: [number, number, number]): [number, number, number] {
  const e = o.matrixWorld.elements;
  tmp[0] = e[0]! * l[0] + e[4]! * l[1] + e[8]! * l[2] + e[12]!;
  tmp[1] = e[1]! * l[0] + e[5]! * l[1] + e[9]! * l[2] + e[13]!;
  tmp[2] = e[2]! * l[0] + e[6]! * l[1] + e[10]! * l[2] + e[14]!;
  return tmp;
}
