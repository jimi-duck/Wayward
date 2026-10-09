import {
  AdditiveBlending, BoxGeometry, Color, CylinderGeometry, DoubleSide, Matrix4, Quaternion, Vector3, Group, Mesh, MeshBasicMaterial, RingGeometry, Sprite, SpriteMaterial,
  type Material, type Scene, type Texture,
} from 'three';
import { clamp } from '../core/math';
import type { World } from '../sim/world';
import type { Effects, RGB } from './fx';
import { Kit, metal, seeded, type V3 } from './kit';

// ── the Breakout's places, and the cutter ────────────────────────────────
// The lane mouth: an old Accord gate, a ring of dead pylons round a slow
// amber swirl, lighting up as the drive spools. The port: Frontier Supply, a
// squat fuel depot on a rock-anchored spine, its docking ring drawn on the
// plane in cyan. The cutter: an amber beam from the bow to the rock under
// it, going white and then red as the rock heats, sparks where it bites.

const AMBER = new Color(3.6, 2, 0.45);
const CYAN = new Color(0.4, 2.4, 3.2);
const SPARK: RGB = [3.8, 2.4, 0.8];
const HOT: RGB = [4, 1.2, 0.4];

let mats: Record<string, Material> | null = null;
/** The materials the Breakout's structures share (also the situations' sites, render/site.ts). */
export function materials(): Record<string, Material> {
  if (mats) return mats;
  mats = {
    hull: metal({ tint: 0x7d8288, roughness: 0.7, metalness: 0.4 }),
    paint: metal({ tint: 0xf2b21f, roughness: 0.62, metalness: 0.06 }),
    dark: metal({ tint: 0x3e3c3a, roughness: 0.55, metalness: 0.6, scale: 1.4 }),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.4, 1.5), toneMapped: false }),
    amber: new MeshBasicMaterial({ color: AMBER, toneMapped: false }),
    cyan: new MeshBasicMaterial({ color: CYAN, toneMapped: false }),
  };
  return mats;
}


// ── structure helpers: the second and third levels of a megastructure ──────
const UP = new Vector3(0, 1, 0), tmpA = new Vector3(), tmpB = new Vector3(), tmpQ = new Quaternion(), tmpM = new Matrix4(), tmpS = new Vector3(1, 1, 1);

/** A round strut between two points: a girder chord, a brace, a cable. */
export function strut(k: Kit, key: string, a: V3, b: V3, r: number, seg = 5): void {
  tmpA.set(...a); tmpB.set(...b);
  const len = tmpA.distanceTo(tmpB);
  if (len < 1e-3) return;
  tmpQ.setFromUnitVectors(UP, tmpB.clone().sub(tmpA).normalize());
  tmpM.compose(tmpA.clone().add(tmpB).multiplyScalar(0.5), tmpQ, tmpS);
  k.addMatrix(key, new CylinderGeometry(r, r, len, seg), tmpM);
}

/** A hanging cable: a catenary in short struts, sagging by `sag` at the middle. */
export function cable(k: Kit, a: V3, b: V3, sag: number, r = 0.07, n = 7): void {
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n, here: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    strut(k, 'dark', prev, here, r, 4);
    prev = here;
  }
}

/** A lattice girder from a to b: two chords, zigzag braces, a node lamp every few bays. */
export function truss(k: Kit, a: V3, b: V3, depth: number, bays: number, lampEvery = 0): void {
  const up: V3 = [0, depth, 0];
  const at = (t: number, h: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + h, a[2] + (b[2] - a[2]) * t];
  strut(k, 'hull', at(0, 0), at(1, 0), 0.12, 4);
  strut(k, 'hull', at(0, up[1]), at(1, up[1]), 0.12, 4);
  for (let i = 0; i < bays; i++) {
    const t0 = i / bays, t1 = (i + 1) / bays;
    strut(k, 'dark', at(t0, i % 2 ? up[1] : 0), at(t1, i % 2 ? 0 : up[1]), 0.06, 4);
    if (lampEvery && i % lampEvery === 0) k.box('lamp', [0.18, 0.18, 0.18], at(t0, up[1] + 0.2));
  }
}

/** Hazard stripes across a plate: alternating paint and dark bars. */
export function stripes(k: Kit, x: number, y: number, z: number, along: 'x' | 'z', len: number, wid: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const o = -len / 2 + (i + 0.5) * (len / n);
    if (i % 2) continue;
    if (along === 'x') k.box('paint', [len / n * 0.9, 0.05, wid], [x + o, y, z], [0, 0.5, 0]);
    else k.box('paint', [wid, 0.05, len / n * 0.9], [x, y, z + o], [0, 0.5, 0]);
  }
}

/** The gate: twelve pylons on a ring of girders, service lamps, a control gantry. Kit units are world units here. */
function buildLane(): Group {
  const k = new Kit(), rnd = seeded(7731);
  const R = 18, N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const tall = 6 + rnd() * 4;
    const out = (d: number): [number, number] => [Math.cos(a) * (R + d), Math.sin(a) * (R + d)];
    // a footing, a tapering column, a collar and an emitter coil: the pylon stands on rock-hung struts
    k.box('dark', [4, 1.2, 4], [x, -1.4, z], [0, -a, 0]);
    k.cyl('dark', 1.0, 1.5, tall, [x, tall / 2 - 0.8, z], 'y', 8);
    k.box('paint', [2.8, 0.7, 2.8], [x, tall * 0.55, z], [0, -a, 0]);
    k.box('paint', [2.4, 0.5, 2.4], [x, tall - 1.2, z], [0, -a, 0]);
    for (let c = 0; c < 3; c++) k.cyl('hull', 1.25 - c * 0.08, 1.25 - c * 0.08, 0.28, [x, tall - 0.2 + c * 0.45, z], 'y', 12);
    k.box('amber', [0.28, tall * 0.55, 0.28], [out(1.35)[0], tall * 0.3, out(1.35)[1]], [0, -a, 0]);
    k.box('lamp', [0.5, 0.5, 0.5], [x, tall + 1.4, z]);
    // a ladder and a service platform on the outer face
    k.box('dark', [0.08, tall * 0.8, 0.5], [out(1.6)[0], tall * 0.35, out(1.6)[1]], [0, -a, 0]);
    k.box('hull', [1.6, 0.12, 1.6], [out(1.5)[0], tall * 0.4, out(1.5)[1]], [0, -a, 0]);
    // a girder span to the next pylon, two chords and braces, some spans torn
    const b = a + Math.PI / N, len = 2 * R * Math.sin(Math.PI / N) * 0.82;
    if (rnd() < 0.75) {
      const mx = Math.cos(b) * R, mz = Math.sin(b) * R;
      k.box('hull', [0.35, 0.35, len], [mx, 1.2, mz], [0, -b, 0]);
      k.box('hull', [0.35, 0.35, len], [mx, -0.1, mz], [0, -b, 0]);
      k.box('dark', [0.2, 1.6, 0.2], [mx, 0.55, mz], [0, -b, 0]);
      for (let j = -2; j <= 2; j++) {
        const o = j * len * 0.19;
        k.box('dark', [0.14, 1.5, 0.14], [mx - Math.sin(b) * o, 0.55, mz + Math.cos(b) * o], [0.5 * (j % 2 || 1), -b, 0]);
        k.box('lamp', [0.22, 0.22, 0.22], [mx - Math.sin(b) * o, 1.55, mz + Math.cos(b) * o], [0, 0, 0]);
      }
    } else {
      // a stub and a hanging cable end where the span fell
      k.box('hull', [0.35, 0.35, len * 0.3], [Math.cos(b - 0.1) * R, 1.2, Math.sin(b - 0.1) * R], [0, -b, 0]);
      k.cyl('dark', 0.05, 0.05, 2.4, [Math.cos(b - 0.1) * R, 0, Math.sin(b - 0.1) * R], 'y', 5);
    }
  }
  // second level: a heavy outer ring truss hanging between pylon heads, sagging cable runs, a lamp string, and a keystone counterweight
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, r2 = R + 1.9;
    if (rnd() < 0.3) continue;
    truss(k, [Math.cos(a0) * r2, 4.3, Math.sin(a0) * r2], [Math.cos(a1) * r2, 4.3, Math.sin(a1) * r2], 1.1, 6, 2);
    cable(k, [Math.cos(a0) * R, 7.6, Math.sin(a0) * R], [Math.cos(a1) * R, 7.6, Math.sin(a1) * R], 1.8, 0.09);
    cable(k, [Math.cos(a0) * (R - 0.8), 6.8, Math.sin(a0) * (R - 0.8)], [Math.cos(a1) * (R - 0.8), 6.8, Math.sin(a1) * (R - 0.8)], 1.1, 0.05, 5);
  }
  for (let i = 0; i < N; i += 3) {
    const a = (i / N) * Math.PI * 2;
    // an emitter feed: a fat conduit from the footing across to a transformer tank, stencilled hazard bars on the footing
    strut(k, 'dark', [Math.cos(a) * (R - 1), -0.5, Math.sin(a) * (R - 1)], [Math.cos(a) * (R - 4.6), -0.9, Math.sin(a) * (R - 4.6)], 0.32, 6);
    k.cyl('paint', 0.9, 0.9, 2.1, [Math.cos(a) * (R - 5.2), -0.2, Math.sin(a) * (R - 5.2)], 'y', 10);
    k.cyl('hull', 0.95, 0.95, 0.18, [Math.cos(a) * (R - 5.2), 0.95, Math.sin(a) * (R - 5.2)], 'y', 10);
    stripes(k, Math.cos(a) * R, -0.76, Math.sin(a) * R, Math.abs(Math.cos(a)) > 0.7 ? 'z' : 'x', 3.6, 0.5, 8);
  }
  // a hanging keystone: the counterweight under the throat, on four cables, with a service cage
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]] as const) strut(k, 'dark', [dx * 6, 5.5, dz * 6], [dx, -3.3, dz], 0.07, 4);
  k.box('dark', [3.6, 1.1, 3.6], [0, -3.8, 0]);
  k.box('paint', [3.0, 0.3, 3.0], [0, -3.1, 0]);
  k.box('lamp', [0.8, 0.12, 0.12], [0, -4.4, 1.85]);
  // the control gantry beside the throat: a tower, a deck, a mast, hazard-yellow tanks
  const gx = -R - 9, gz = -R * 0.3;
  k.box('dark', [4, 9, 4], [gx, 3.5, gz]);
  k.box('paint', [5.6, 0.7, 5.6], [gx, 8.2, gz]);
  k.box('hull', [3.2, 2, 3.2], [gx, 9.5, gz]);
  k.box('lamp', [2.6, 0.18, 0.06], [gx + 1.65, 9.7, gz]);
  k.cyl('dark', 0.1, 0.1, 6, [gx, 13.5, gz], 'y', 5);
  k.box('lamp', [0.4, 0.4, 0.4], [gx, 16.7, gz]);
  for (let t = 0; t < 3; t++) k.cyl('paint', 1.5, 1.5, 4.5, [gx - 4 + t * 3.4, 0.6, gz + 5.5], 'z', 12);
  k.box('dark', [12, 0.3, 0.9], [gx + 3, 7.8, gz + 3], [0, 0.5, 0]);
  k.greebles('dark', rnd, -R - 12, -R - 6, -R * 0.3 - 3, -R * 0.3 + 3, 8.55, 10, 0.5);
  k.greebles('dark', rnd, -R - 4, R + 4, -R - 4, -R + 2, -0.6, 10, 1.2);
  return k.build(materials());
}

/** The depot: a hub with a habitat ring, docking arms, a tank farm, a mast. Fixed; the berth ring is drawn apart. */
function buildPort(): Group {
  const k = new Kit(), rnd = seeded(9);
  // the hub: a drum core, a ring of cabin blocks round it, lit windows between
  k.cyl('hull', 4.5, 5.5, 3, [0, 0, 0], 'y', 24);
  k.cyl('dark', 5.6, 5.6, 0.4, [0, -1.2, 0], 'y', 24);
  k.cyl('paint', 3, 3.6, 1.6, [0, 2.2, 0], 'y', 16);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box('hull', [2.6, 1.6, 2.2], [Math.cos(a) * 7, 0.2, Math.sin(a) * 7], [0, -a, 0]);
    k.box('lamp', [0.9, 0.18, 0.06], [Math.cos(a) * 8.35, 0.5, Math.sin(a) * 8.35], [0, -a, 0]);
    k.box('dark', [0.5, 0.5, 2.2], [Math.cos(a + 0.26) * 7, -0.2, Math.sin(a + 0.26) * 7], [0, -a - 0.26, 0]);
  }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.box('lamp', [0.3, 0.2, 0.3], [Math.cos(a) * 4.6, 1.5, Math.sin(a) * 4.6]); }
  // two docking arms reaching out to the berth, with mooring clamps and a crane
  for (const s of [-1, 1]) {
    k.box('dark', [14, 0.7, 0.9], [-8, -0.2, s * 2.6]);
    k.box('hull', [1.4, 0.9, 1.4], [-15, -0.2, s * 2.6]);
    k.box('paint', [0.5, 1.6, 0.5], [-14, 0.8, s * 2.6]);
    k.box('lamp', [0.3, 0.3, 0.3], [-14, 1.8, s * 2.6]);
    for (let j = 0; j < 4; j++) k.box('dark', [0.12, 1.3, 0.12], [-3 - j * 3, 0.5, s * 2.6]);
  }
  k.box('dark', [0.6, 7, 0.6], [4, 3.5, 4]);
  k.box('paint', [9, 0.6, 0.8], [0.5, 7, 4], [0, 0.3, 0]);
  k.box('dark', [0.1, 3, 0.1], [-3.6, 5.4, 4]);
  // the tank farm: hazard-yellow spheres-ish drums on a frame, with piping to the hub
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4, tx = Math.cos(a) * 12.5, tz = Math.sin(a) * 12.5;
    k.cyl('paint', 1.7, 1.7, 4.2, [tx, 0.3, tz], 'y', 14);
    k.cyl('dark', 1.8, 1.8, 0.3, [tx, 2.5, tz], 'y', 14);
    k.cyl('dark', 1.8, 1.8, 0.3, [tx, -1.9, tz], 'y', 14);
    k.cyl('dark', 0.2, 0.2, 7, [Math.cos(a) * 9, 0, Math.sin(a) * 9], 'x', 6);
    k.box('lamp', [0.25, 0.25, 0.25], [tx, 2.8, tz]);
  }
  // second level: a long truss spine under the arms, cranes with hanging hooks, cable runs hub to tanks, radiator fins and a dish
  truss(k, [-17, -0.9, -2.6], [-5, -0.9, -2.6], 1.0, 8, 3);
  truss(k, [-17, -0.9, 2.6], [-5, -0.9, 2.6], 1.0, 8, 3);
  for (let i = 0; i < 4; i++) { const x = -16 + i * 3.4; strut(k, 'hull', [x, -0.9, -2.6], [x, -0.9, 2.6], 0.08, 4); }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    cable(k, [Math.cos(a) * 6, 1.4, Math.sin(a) * 6], [Math.cos(a) * 12.3, 2.7, Math.sin(a) * 12.3], 1.2, 0.09);
    cable(k, [Math.cos(a + 0.12) * 6, 1.0, Math.sin(a + 0.12) * 6], [Math.cos(a + 0.12) * 12.3, 2.3, Math.sin(a + 0.12) * 12.3], 0.7, 0.05);
    stripes(k, Math.cos(a) * 12.5, -2.15, Math.sin(a) * 12.5, 'x', 4, 0.5, 8);
  }
  // the crane: boom, back-stay, two hanging hook lines and a cargo pod on them
  strut(k, 'paint', [4, 7, 4], [-6.5, 8.6, 4], 0.22, 5);
  strut(k, 'dark', [4, 7, 4], [8.5, 6.2, 4], 0.1, 4);
  strut(k, 'dark', [-5.8, 8.5, 3.7], [-5.8, 2.7, 3.7], 0.04, 3);
  strut(k, 'dark', [-5.8, 8.5, 4.3], [-5.8, 2.7, 4.3], 0.04, 3);
  k.box('paint', [1.6, 1.0, 1.1], [-5.8, 2.2, 4]);
  k.box('dark', [1.7, 0.1, 1.2], [-5.8, 2.7, 4]);
  // radiators: four fins off the hub, a comms dish on a boom
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78;
    k.box('hull', [0.1, 3.4, 5.2], [Math.cos(a) * 5.4, 3.7, Math.sin(a) * 5.4], [0, -a, 0]);
    for (let j = 0; j < 4; j++) k.box('dark', [0.14, 3.5, 0.08], [Math.cos(a) * 5.4, 3.7, Math.sin(a) * 5.4 + 0], [0, -a, 0]);
    strut(k, 'dark', [Math.cos(a) * 4.6, 2.4, Math.sin(a) * 4.6], [Math.cos(a) * 5.3, 4.8, Math.sin(a) * 5.3], 0.12, 4);
  }
  strut(k, 'dark', [0, 3, 0], [2.4, 7.4, -3.6], 0.14, 5);
  k.add('hull', new CylinderGeometry(1.7, 0.2, 0.55, 14, 1, true), [2.4, 7.9, -3.6], [0.3, 0, 0.5]);
  k.box('lamp', [0.18, 0.18, 0.18], [2.4, 7.6, -3.6]);
  // the beacon mast: the light you steer for
  k.box('dark', [0.8, 14, 0.8], [-3, 7, -3]);
  k.box('dark', [2.4, 0.3, 0.3], [-3, 10, -3]);
  k.box('amber', [0.25, 11, 0.25], [-3.45, 6.5, -3]);
  k.box('lamp', [1.2, 1.2, 1.2], [-3, 14.6, -3]);
  k.greebles('hull', rnd, -4, 4, -4, 4, 1.6, 14, 0.8);
  return k.build(materials());
}

export function flatRing(r: number, w: number, color: Color, opacity: number): Mesh {
  const m = new Mesh(new RingGeometry(r - w, r, 64), new MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export class BreakoutView {
  private readonly lane = new Group();
  private readonly port = new Group();
  private readonly throat: Mesh;
  private readonly laneRing: Mesh;
  private readonly portRing: Mesh;
  private readonly beam: Mesh;
  private readonly bite: Sprite;
  private time = 0;

  constructor(scene: Scene, glow: Texture) {
    this.lane.add(buildLane());
    this.throat = new Mesh(new RingGeometry(3, 15.5, 48, 1), new MeshBasicMaterial({ color: AMBER, toneMapped: false, transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }));
    this.throat.rotation.x = -Math.PI / 2;
    this.laneRing = flatRing(16, 0.35, AMBER, 0.7);
    this.lane.add(this.throat, this.laneRing);
    // the depot stands off to one side of its berth; the cyan ring is where you dock
    const depot = buildPort();
    depot.position.set(17, 0, -6);
    this.port.add(depot);
    this.portRing = flatRing(9, 0.25, CYAN, 0.6);
    this.portRing.position.y = 1.4;
    this.port.add(this.portRing);
    this.lane.visible = this.port.visible = false;
    scene.add(this.lane, this.port);

    this.beam = new Mesh(new CylinderGeometry(0.07, 0.11, 1, 6, 1, true).rotateZ(Math.PI / 2).translate(0.5, 0, 0),
      new MeshBasicMaterial({ color: AMBER, toneMapped: false, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
    this.beam.visible = false;
    this.bite = new Sprite(new SpriteMaterial({ map: glow, color: AMBER, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.bite.visible = false;
    scene.add(this.beam, this.bite);
  }

  update(world: World, ship: { x: number; z: number; heading: number }, fx: Effects, dt: number): void {
    this.time += dt;
    const b = world.bk ?? world.review?.bk ?? null;
    this.lane.visible = !!b;
    this.port.visible = !!b?.port;
    if (!b) { this.beam.visible = this.bite.visible = false; return; }
    this.lane.position.set(b.lane.x, -1.5, b.lane.z);
    if (b.port) this.port.position.set(b.port.x, -2, b.port.z);
    // the throat brightens as the tank fills and blazes while the drive spools
    const ready = world.cyrite >= b.jumpCost ? 1 : 0.35;
    const spool = b.spool / 5;
    this.throat.rotation.z += dt * (0.2 + spool * 3);
    (this.throat.material as MeshBasicMaterial).opacity = 0.015 + 0.025 * ready + 0.18 * spool + (b.jumpT >= 0 ? 0.4 : 0);
    (this.laneRing.material as MeshBasicMaterial).opacity = 0.35 + 0.35 * ready + 0.2 * Math.sin(this.time * 3) * ready;
    (this.portRing.material as MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(this.time * 2.4) + b.dockT;

    // the cutter's beam: bow to rock
    const r = world.field.find(world.cutting);
    if (!r || !world.alive) { this.beam.visible = this.bite.visible = false; return; }
    const bx = ship.x + Math.cos(ship.heading) * 1.4, bz = ship.z - Math.sin(ship.heading) * 1.4;
    const dx = r.x - bx, dz = r.z - bz, d = Math.hypot(dx, dz) || 1;
    const reach = Math.max(0.5, d - r.r * 0.7);
    const hx = bx + (dx / d) * reach, hz = bz + (dz / d) * reach;
    this.beam.visible = this.bite.visible = true;
    this.beam.position.set(bx, 0.15, bz);
    this.beam.rotation.set(0, Math.atan2(-dz, dx), 0);
    this.beam.scale.set(reach, 1 + Math.sin(this.time * 40) * 0.25, 1 + Math.sin(this.time * 40) * 0.25);
    const heat = clamp(r.heat ?? 0, 0, 1);
    // amber, through white-hot, to red near the line
    const c = heat < 0.75 ? AMBER.clone().lerp(new Color(4, 3.4, 2.6), heat / 0.75) : new Color(4, 3.4, 2.6).lerp(new Color(4.2, 0.6, 0.3), (heat - 0.75) / 0.25);
    (this.beam.material as MeshBasicMaterial).color.copy(c);
    (this.bite.material as SpriteMaterial).color.copy(c);
    this.bite.position.set(hx, 0.2, hz);
    this.bite.scale.setScalar(1.2 + heat * 2.2 + Math.sin(this.time * 30) * 0.2);
    if (dt > 0 && Math.random() < 0.6) fx.burst(hx, 0.2, hz, 2, heat > 0.8 ? HOT : SPARK, 6, 0.15, 0.3);
  }
}
