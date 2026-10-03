import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry,
  Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Shape, Vector2, type Object3D,
} from 'three';
import { HULL_ORDER, type HullId } from '../content/hulls';
import { clamp, lerp } from '../core/math';
import type { ShipState } from '../sim/ship';
import { ROLL_TIME } from '../sim/tuning';

// ── the player's ships ────────────────────────────────────────────────────
// Stand-in models in the brand's art direction: matte graphite plating cut at
// 45°, cyan nacelle light (the brightest thing on the ship), one amber
// deflector. Three silhouettes that differ at a glance: the escort is a
// wedge, the cruiser a long cut saucer on pylons, the scout a small saucer
// with nacelles slung low. Generic Starfleet-era forms; real models come later.
//
// Every model faces +X with +Y up, so its starboard side is +Z.

const SIGNAL = new Color('#00F0FF');
const COMMAND = new Color('#FF9F43');

const plate = new MeshStandardMaterial({ color: 0x9aa9b9, roughness: 0.5, metalness: 0.08, flatShading: true });
const plateDark = new MeshStandardMaterial({ color: 0x4a5869, roughness: 0.65, metalness: 0.08, flatShading: true });
const dish = new MeshStandardMaterial({ color: 0x1a0f05, emissive: COMMAND, emissiveIntensity: 1.6 });

function nacelleGlow(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x041318, emissive: SIGNAL, emissiveIntensity: 1.2 });
}

/** A prism from a top-view outline (x forward, y to port), cut at the edges. */
function slab(points: Array<[number, number]>, height: number, bevel = 0.04): BufferGeometry {
  const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)));
  const g = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
  g.rotateX(-Math.PI / 2); // outline onto XZ, extrusion up +Y
  g.translate(0, -height / 2, 0);
  return g;
}

interface Built { root: Group; glow: MeshStandardMaterial; nacelleTips: Array<[number, number, number]>; }

function nacelle(len: number, r: number, glow: MeshStandardMaterial): Group {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(r, r, len, 8), plate);
  body.rotation.z = Math.PI / 2;
  const strip = new Mesh(new BoxGeometry(len * 0.82, r * 0.5, r * 2.15), glow);
  strip.position.y = r * 0.35;
  g.add(body, strip);
  return g;
}

function buildEscort(): Built {
  const glow = nacelleGlow();
  const root = new Group();
  const hull = new Mesh(slab([[1.35, 0], [0.25, 0.5], [-0.75, 0.82], [-1.05, 0.62], [-1.05, -0.62], [-0.75, -0.82], [0.25, -0.5]], 0.3), plate);
  const deck = new Mesh(slab([[0.75, 0], [0.05, 0.28], [-0.7, 0.36], [-0.7, -0.36], [0.05, -0.28]], 0.12, 0.02), plateDark);
  deck.position.y = 0.2;
  root.add(hull, deck);
  for (const side of [-1, 1]) {
    const n = nacelle(1.0, 0.14, glow);
    n.position.set(-0.55, 0.1, side * 0.9);
    root.add(n);
  }
  const d = new Mesh(new BoxGeometry(0.06, 0.08, 0.22), dish);
  d.position.set(1.0, -0.12, 0);
  root.add(d);
  return { root, glow, nacelleTips: [[-1.08, 0.1, -0.9], [-1.08, 0.1, 0.9]] };
}

function buildCruiser(): Built {
  const glow = nacelleGlow();
  const root = new Group();
  const saucer = new Mesh(new CylinderGeometry(1, 1.04, 0.16, 8), plate);
  saucer.scale.set(1.18, 1, 0.95);
  saucer.rotation.y = Math.PI / 8;
  saucer.position.set(0.75, 0.18, 0);
  const bridge = new Mesh(new CylinderGeometry(0.22, 0.3, 0.12, 8), plateDark);
  bridge.position.set(0.75, 0.32, 0);
  const neck = new Mesh(slab([[0.2, 0.12], [-0.3, 0.12], [-0.3, -0.12], [0.2, -0.12]], 0.3, 0.02), plateDark);
  neck.position.set(0, 0.02, 0);
  const body = new Mesh(slab([[0.1, 0.24], [-1.2, 0.2], [-1.35, 0], [-1.2, -0.2], [0.1, -0.24]], 0.34), plate);
  body.position.y = -0.12;
  root.add(saucer, bridge, neck, body);
  for (const side of [-1, 1]) {
    const n = nacelle(1.7, 0.13, glow);
    n.position.set(-1.0, 0.32, side * 0.75);
    const pylon = new Mesh(new BoxGeometry(0.34, 0.06, 0.6), plateDark);
    pylon.position.set(-0.75, 0.12, side * 0.42);
    pylon.rotation.x = side * 0.5;
    root.add(n, pylon);
  }
  const d = new Mesh(new CylinderGeometry(0.11, 0.11, 0.04, 8), dish);
  d.rotation.z = Math.PI / 2;
  d.position.set(0.12, -0.12, 0);
  root.add(d);
  return { root, glow, nacelleTips: [[-1.85, 0.32, -0.75], [-1.85, 0.32, 0.75]] };
}

function buildScout(): Built {
  const glow = nacelleGlow();
  const root = new Group();
  const saucer = new Mesh(new CylinderGeometry(0.72, 0.76, 0.16, 8), plate);
  saucer.rotation.y = Math.PI / 8;
  saucer.position.set(0.35, 0.08, 0);
  const body = new Mesh(slab([[0.1, 0.22], [-0.7, 0.18], [-0.85, 0], [-0.7, -0.18], [0.1, -0.22]], 0.26), plateDark);
  body.position.set(0, -0.08, 0);
  root.add(saucer, body);
  for (const side of [-1, 1]) {
    const n = nacelle(0.9, 0.11, glow);
    n.position.set(-0.55, -0.16, side * 0.6);
    const pylon = new Mesh(new BoxGeometry(0.26, 0.05, 0.42), plateDark);
    pylon.position.set(-0.4, -0.1, side * 0.36);
    root.add(n, pylon);
  }
  const d = new Mesh(new BoxGeometry(0.05, 0.07, 0.18), dish);
  d.position.set(1.1, 0.02, 0);
  root.add(d);
  return { root, glow, nacelleTips: [[-1.0, -0.16, -0.6], [-1.0, -0.16, 0.6]] };
}

const BUILDERS: Record<HullId, () => Built> = { escort: buildEscort, cruiser: buildCruiser, scout: buildScout };

// ── engine trails ─────────────────────────────────────────────────────────
// A ribbon per nacelle, sampled on a fixed clock so its length in time does
// not change with the frame rate, and lit by how hard the engines were
// burning when each sample was laid.
const TRAIL_N = 30;
const TRAIL_EVERY = 1 / 60;
const TRAIL_W = 0.2;

class Trail {
  readonly mesh: Mesh;
  private readonly pts = new Float32Array(TRAIL_N * 3);
  private readonly heat = new Float32Array(TRAIL_N);
  private readonly pos: BufferAttribute;
  private readonly col: BufferAttribute;
  private primed = false;

  constructor() {
    const g = new BufferGeometry();
    this.pos = new BufferAttribute(new Float32Array(TRAIL_N * 2 * 3), 3);
    this.col = new BufferAttribute(new Float32Array(TRAIL_N * 2 * 3), 3);
    g.setAttribute('position', this.pos);
    g.setAttribute('color', this.col);
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mesh = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    this.mesh.frustumCulled = false;
  }

  /** Lay a new sample at the head. */
  push(x: number, y: number, z: number, heat: number): void {
    if (!this.primed) { for (let i = 0; i < TRAIL_N; i++) this.pts.set([x, y, z], i * 3); this.primed = true; }
    this.pts.copyWithin(3, 0, (TRAIL_N - 1) * 3);
    this.heat.copyWithin(1, 0, TRAIL_N - 1);
    this.pts[0] = x; this.pts[1] = y; this.pts[2] = z; this.heat[0] = heat;
  }

  /** Move the head to the live nacelle position and rebuild the ribbon. */
  draw(x: number, y: number, z: number, intensity: number): void {
    this.pts[0] = x; this.pts[1] = y; this.pts[2] = z;
    const p = this.pts, P = this.pos.array as Float32Array, C = this.col.array as Float32Array;
    for (let i = 0; i < TRAIL_N; i++) {
      const j = Math.min(i + 1, TRAIL_N - 1), k = Math.max(i - 1, 0);
      let dx = p[k * 3]! - p[j * 3]!, dz = p[k * 3 + 2]! - p[j * 3 + 2]!;
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const t = i / (TRAIL_N - 1), w = TRAIL_W * (1 - t) * 0.5;
      const ox = -dz * w, oz = dx * w;
      P.set([p[i * 3]! + ox, p[i * 3 + 1]!, p[i * 3 + 2]! + oz, p[i * 3]! - ox, p[i * 3 + 1]!, p[i * 3 + 2]! - oz], i * 6);
      const a = this.heat[i]! * (1 - t) * (1 - t) * intensity;
      C.set([SIGNAL.r * a, SIGNAL.g * a, SIGNAL.b * a, SIGNAL.r * a, SIGNAL.g * a, SIGNAL.b * a], i * 6);
    }
    this.pos.needsUpdate = true;
    this.col.needsUpdate = true;
  }
}

// ── the view ──────────────────────────────────────────────────────────────
export class ShipView {
  /** Add this to the scene once. */
  readonly root = new Group();
  private readonly yawG = new Group();
  private readonly pitchG = new Group();
  private readonly rollG = new Group();
  private readonly models = new Map<HullId, Built>();
  private current: Built;
  private readonly trails = [new Trail(), new Trail()];
  private bank = 0;
  private pitch = 0;
  private heat = 0;
  private trailClock = 0;

  constructor(hull: HullId) {
    for (const id of HULL_ORDER) {
      const b = BUILDERS[id]();
      b.root.visible = false;
      this.models.set(id, b);
      this.rollG.add(b.root);
    }
    this.current = this.models.get(hull)!;
    this.current.root.visible = true;
    this.pitchG.add(this.rollG);
    this.yawG.add(this.pitchG);
    this.root.add(this.yawG, ...this.trails.map((t) => t.mesh));
  }

  setHull(id: HullId): void {
    this.current.root.visible = false;
    this.current = this.models.get(id)!;
    this.current.root.visible = true;
  }

  /** `s` is the interpolated ship; `dt` real seconds since the last frame. */
  update(s: ShipState, dt: number, reduceMotion: boolean): void {
    this.yawG.position.set(s.x, 0, s.z);
    this.yawG.rotation.y = s.heading;

    // Bank into the turn (right wing down for a right turn, which lowers the
    // heading) and dip the nose under thrust. Both eased, so they read as
    // weight rather than as a snap.
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
    this.current.glow.emissiveIntensity = 1.1 + 2.4 * this.heat;

    // trails: world positions of the nacelle tips
    this.root.updateMatrixWorld(true);
    this.trailClock += dt;
    const lay = this.trailClock >= TRAIL_EVERY;
    if (lay) this.trailClock %= TRAIL_EVERY;
    this.current.nacelleTips.forEach((tip, i) => {
      const v = tipWorld(this.current.root, tip);
      const trail = this.trails[i]!;
      if (lay) trail.push(v[0], v[1], v[2], 0.25 + 0.75 * this.heat);
      trail.draw(v[0], v[1], v[2], 0.9);
    });
  }
}

const tmp = { x: 0, y: 0, z: 0 };
function tipWorld(o: Object3D, local: [number, number, number]): [number, number, number] {
  const e = o.matrixWorld.elements;
  tmp.x = e[0]! * local[0] + e[4]! * local[1] + e[8]! * local[2] + e[12]!;
  tmp.y = e[1]! * local[0] + e[5]! * local[1] + e[9]! * local[2] + e[13]!;
  tmp.z = e[2]! * local[0] + e[6]! * local[1] + e[10]! * local[2] + e[14]!;
  return [tmp.x, tmp.y, tmp.z];
}
