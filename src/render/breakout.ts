import {
  AdditiveBlending, BoxGeometry, Color, CylinderGeometry, DoubleSide, Matrix4, Quaternion, Vector3, Group, Mesh, MeshBasicMaterial, RingGeometry, Sprite, SpriteMaterial, ExtrudeGeometry, Shape,
  type Material, type Scene, type Texture,
} from 'three';
import { clamp } from '../core/math';
import type { World } from '../sim/world';
import { SAFE_R } from '../sim/breakout';
import type { Effects, RGB } from './fx';
import { Kit, metal, seeded, type V3 } from './kit';

// ── the Breakout's places, and the cutter ────────────────────────────────
// The lane mouth: an old Accord gate, a ring of dead pylons round a slow
// amber swirl, lighting up as the drive spools. The port: Frontier Supply, a
// squat fuel depot on a rock-anchored spine, its docking ring drawn on the
// plane in cyan.

const AMBER = new Color(3.6, 2, 0.45);
const CYAN = new Color(0.4, 2.4, 3.2);
/** The gate's light strips at full: teal, held low so they read as lit panels, not a glow. */
const STRIP = new Color(0.3, 1.25, 1.4);

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
    slate: metal({ tint: 0x868b92, roughness: 0.74, metalness: 0.5, scale: 0.7, bump: 0.006, worn: 0.4 }),
    strip: new MeshBasicMaterial({ color: STRIP.clone(), toneMapped: false }),
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

/** A sector of a ring, as a block: radii r0..r1, heights y0..y1, angles a0..a1 (x = cos, z = sin). */
function arc(k: Kit, key: string, r0: number, r1: number, y0: number, y1: number, a0: number, a1: number, bevel = 0.05): void {
  const sh = new Shape(), pt = (r: number, a: number): [number, number] => [Math.cos(a) * r, -Math.sin(a) * r];
  sh.moveTo(...pt(r1, a0));
  sh.absarc(0, 0, r1, -a0, -a1, true);
  sh.lineTo(...pt(r0, a1));
  sh.absarc(0, 0, r0, -a1, -a0, false);
  sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: y1 - y0 - bevel * 2, curveSegments: Math.max(2, Math.ceil((a1 - a0) * 14)), bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  k.add(key, g);
}

const TAU = Math.PI * 2;
const polar = (r: number, a: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];

/** A gothic spire group on the ring's rim, pointing outward in the ring's plane: a stepped tower, a tapering mast, two needles, amber tip lamps. */
function spire(k: Kit, rnd: () => number, a: number, r0: number, h: number): void {
  const rot: V3 = [0, -a, 0], ca = Math.cos(a), sa = Math.sin(a);
  const pr = (t: number, o = 0, y = 0): V3 => [ca * (r0 + t) - sa * o, y, sa * (r0 + t) + ca * o];
  k.box('slate', [h * 0.42, 3, 3.4], pr(h * 0.21), rot);
  k.box('slate', [h * 0.3, 2.2, 2.6], pr(h * 0.57), rot);
  k.box('lamp', [0.5, 0.05, 1.2], pr(h * 0.25, 0, 1.52), rot);
  k.box('lamp', [0.5, 0.05, 1.2], pr(h * 0.25, 0, -1.52), rot);
  strut(k, 'slate', pr(h * 0.45), pr(h * 0.95), 0.6, 6);
  strut(k, 'slate', pr(h * 0.95), pr(h * 1.35), 0.32, 6);
  strut(k, 'dark', pr(h * 1.35), pr(h * 1.7), 0.07, 4);
  k.box('amber', [0.2, 0.2, 0.2], pr(h * 1.72));
  for (const d of [-1, 1]) {
    const nh = h * (0.7 + rnd() * 0.2);
    strut(k, 'slate', pr(0.2, d * 1.4, 0), pr(nh, d * 1.4, 0), 0.34, 6);
    strut(k, 'dark', pr(nh, d * 1.15, 0), pr(nh + 1.4, d * 1.15, 0), 0.07, 4);
    k.box('amber', [0.14, 0.14, 0.14], pr(nh + 1.45, d * 1.15, 0));
  }
}

/** The gate: a dark armoured ring of riveted plate lying in the flight plane, teal light strips along its inner edge, spires on top, buttressed on heavy bases. Units are metres. */
function buildLane(): Group {
  const k = new Kit(), rnd = seeded(7731);
  const IN = 17.2, OUT = 22.4, TOP = 1.7, BOT = -2.1, N = 32, STEP = TAU / N;
  // the body: thirty-two plates round, with the seams showing, raised panels, an inner lip that carries the lights
  for (let i = 0; i < N; i++) {
    const a0 = i * STEP + 0.006, a1 = (i + 1) * STEP - 0.006, am = (a0 + a1) / 2;
    arc(k, 'slate', IN, OUT, BOT, TOP, a0, a1, 0.08);
    arc(k, 'dark', IN - 0.75, IN + 0.1, -1.2, 0.5, a0, a1, 0.04);
    // two raised panels on the face, one on the outer wall, one on the underside
    for (const h of [0, 1]) {
      const p0 = a0 + 0.012 + h * (STEP * 0.5), p1 = p0 + STEP * (0.38 + rnd() * 0.08);
      arc(k, rnd() < 0.3 ? 'dark' : 'slate', IN + 0.7 + rnd() * 0.4, OUT - 0.5 - rnd() * 0.5, TOP, TOP + 0.14 + rnd() * 0.16, p0, p1, 0.03);
    }
    arc(k, 'slate', OUT, OUT + 0.22, -1.6 + rnd() * 0.3, 1.3, a0 + 0.015, a1 - 0.015, 0.03);
    arc(k, 'dark', IN + 0.6, OUT - 0.6, BOT - 0.2, BOT, a0 + 0.02, a1 - 0.02, 0.02);
    // a grille or a vent, a few small housings
    const [gx, gz] = polar(OUT - 1.4 - rnd() * 1.5, am + (rnd() - 0.5) * 0.04);
    k.box('dark', [1.2 + rnd(), 0.18, 0.9 + rnd() * 0.7], [gx, TOP + 0.09, gz], [0, -am, 0]);
    if (rnd() < 0.6) {
      const [hx, hz] = polar(IN + 1.2 + rnd() * 2, am + (rnd() - 0.5) * 0.05);
      k.box('dark', [0.6 + rnd() * 0.8, 0.35 + rnd() * 0.4, 0.5 + rnd() * 0.5], [hx, TOP + 0.3, hz], [0, -am, 0]);
    }
  }
  // the light strips: broken lengths of teal along the inner wall and the lip, never a full circle
  let a = rnd() * STEP;
  while (a < TAU - 0.3) {
    const len = STEP * (0.5 + rnd() * 1.1);
    arc(k, 'strip', IN - 0.78, IN - 0.7, -0.75, -0.3, a, a + len, 0);
    arc(k, 'strip', IN - 0.4, IN - 0.05, 0.505, 0.54, a, a + len, 0);
    a += len + STEP * (0.18 + rnd() * 0.35);
  }
  // clamps: eight heavy junction blocks over the seams, with a warm window each
  for (let i = 0; i < 8; i++) {
    const ac = i * (TAU / 8), [x, z] = polar((IN + OUT) / 2, ac), rot: V3 = [0, -ac, 0];
    arc(k, 'dark', IN - 0.5, OUT + 0.7, BOT - 0.5, TOP + 0.7, ac - 0.055, ac + 0.055, 0.12);
    const [lx, lz] = polar(OUT + 0.72, ac);
    k.box('lamp', [0.05, 0.3, 0.9], [lx, 0.6, lz], rot);
    const [wx, wz] = polar(IN - 0.6, ac);
    k.box('lamp', [0.05, 0.22, 0.7], [wx, -0.4, wz], rot);
    k.box('slate', [2.4, 0.5, 3.4], [x, TOP + 0.95, z], rot);
  }
  // spires on top and at the sides, leaning out a little
  for (const [sa, sh] of [[0.2, 6.5], [Math.PI / 2 - 0.3, 5], [Math.PI / 2 + 0.55, 7.5], [Math.PI - 0.1, 5], [4.1, 5.5], [Math.PI * 1.5 - 0.5, 8], [Math.PI * 1.5 + 0.35, 5], [5.7, 6]] as const) spire(k, rnd, sa, OUT - 0.5, sh * 1.3);
  // a few old cables hanging off the rim
  for (let i = 0; i < 5; i++) {
    const c = rnd() * TAU, [x, z] = polar(OUT + 0.2, c), [x2, z2] = polar(OUT + 2.2 + rnd() * 2, c + 0.2);
    cable(k, [x, 0, z], [x2, 0.5, z2], 1.5, 0.06, 5);
  }
  return k.build(materials());
}

/** Where the ring's centre stands above the flight plane, and its outer radius. */
const GATE_Y = 9, GATE_OUT = 22.4;

/** The heavy pylons the ring stands on, in the world frame (x along the gate's axis): a footing under the rim, a leg and a tower block each side. */
function buildBases(): Group {
  const k = new Kit(), rnd = seeded(5521), Y0 = GATE_Y - GATE_OUT - 1.2;
  k.box('dark', [18, 1.4, 15], [0, Y0 - 0.2, 0]);
  k.box('slate', [13, 1.5, 11], [0, Y0 + 1.2, 0]);
  k.box('dark', [9, 1.4, 8], [0, Y0 + 2.6, 0]);
  for (const s of [-1, 1]) {
    const zc = s * (GATE_OUT + 6);
    k.box('dark', [16, 1.4, 13], [0, Y0 - 0.2, zc]);
    k.box('slate', [12, 1.6, 10], [0, Y0 + 1.3, zc]);
    k.box('slate', [8, 6, 6.4], [0, Y0 + 5, zc]);
    k.box('dark', [9, 0.6, 7.2], [0, Y0 + 8.3, zc]);
    k.box('lamp', [1.6, 0.3, 0.05], [0, Y0 + 5.5, zc - s * 3.23]);
    k.box('lamp', [1.6, 0.3, 0.05], [0, Y0 + 5.5, zc + s * 3.23]);
    // legs and pipes rise from the tower to the ring's flank
    for (const o of [-3.2, 3.2]) {
      strut(k, 'slate', [o, Y0 + 8, zc], [o * 0.55, GATE_Y - 7, s * 21], 1.2, 7);
      strut(k, 'dark', [o * 1.5, Y0 + 7, zc + s * 1.8], [o * 0.8, GATE_Y - 9, s * 21.8], 0.38, 5);
      cable(k, [o * 0.6, Y0 + 8.4, zc - s * 1.6], [o * 0.4, GATE_Y - 5, s * (GATE_OUT + 0.3)], 1.4, 0.08);
    }
    for (let j = 0; j < 5; j++) k.box('dark', [1.0, 1.4, 0.1], [-3 + j * 1.5, Y0 + 2.2, zc - s * 3.25]);
    k.greebles('dark', rnd, -5, 5, zc - 4, zc + 4, Y0 + 0.8, 7, 0.9);
  }
  k.greebles('dark', rnd, -6, 6, -5, 5, Y0 + 3.3, 8, 0.8);
  for (let i = 0; i < 6; i++) k.box('lamp', [0.25, 0.12, 0.25], [-4 + i * 1.6, Y0 + 3.4, 4.1]);
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
  /** The ring and its bases, turned to face the way you arrive. */
  private readonly gate = new Group();
  private faced: unknown = null;
  private readonly port = new Group();
  private readonly throat: Mesh;
  private readonly laneRing: Mesh;
  private readonly portRing: Mesh;
  private readonly laneField: Mesh;
  private readonly portField: Mesh;
  private time = 0;

  constructor(scene: Scene, glow: Texture) {
    const ring = buildLane();
    ring.rotation.z = -Math.PI / 2;
    ring.position.y = GATE_Y;
    this.gate.add(ring, buildBases());
    this.lane.add(this.gate);
    this.throat = new Mesh(new RingGeometry(3, 16.4, 48, 1), new MeshBasicMaterial({ color: new Color(0.1, 0.5, 0.62), toneMapped: false, transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }));
    this.throat.geometry.rotateY(Math.PI / 2);
    this.throat.position.y = GATE_Y;
    this.laneRing = flatRing(16, 0.3, CYAN, 0.5);
    this.laneField = flatRing(SAFE_R, 0.3, CYAN, 0.1);
    this.laneRing.position.y = 0.2;
    this.gate.add(this.throat);
    this.lane.add(this.laneRing, this.laneField);
    // the depot stands off to one side of its berth; the cyan ring is where you dock
    const depot = buildPort();
    depot.position.set(17, 0, -6);
    this.port.add(depot);
    this.portRing = flatRing(9, 0.25, CYAN, 0.6);
    this.portRing.position.y = 1.4;
    this.portField = flatRing(SAFE_R, 0.3, CYAN, 0.1);
    this.portField.position.y = -0.4;
    this.port.add(this.portRing, this.portField);
    this.lane.visible = this.port.visible = false;
    scene.add(this.lane, this.port);

  }

  update(world: World, ship: { x: number; z: number; heading: number }, fx: Effects, dt: number): void {
    this.time += dt;
    const b = world.bk ?? world.review?.bk ?? null;
    this.lane.visible = !!b;
    this.port.visible = !!b?.port;
    if (!b) return;
    this.lane.position.set(b.lane.x, -1.5, b.lane.z);
    // the ring faces the way you come in: it follows your bearing from afar and holds still once you are near (the review world always follows)
    if (this.faced !== b || world.review || Math.hypot(ship.x - b.lane.x, ship.z - b.lane.z) > 150) { this.faced = b; this.gate.rotation.y = Math.atan2(-(ship.z - b.lane.z), ship.x - b.lane.x); }
    if (b.port) this.port.position.set(b.port.x, -2, b.port.z);
    // the throat brightens as the tank fills and blazes while the drive spools
    const ready = world.fuel >= b.jumpCost ? 1 : 0.35;
    const spool = b.spool / 5;
    this.throat.rotation.x += dt * (0.2 + spool * 3);
    (this.throat.material as MeshBasicMaterial).opacity = 0.015 + 0.025 * ready + 0.18 * spool + (b.jumpT >= 0 ? 0.4 : 0);
    (this.laneRing.material as MeshBasicMaterial).opacity = 0.25 + 0.25 * ready + 0.12 * Math.sin(this.time * 3) * ready;
    // the light strips: dim while the tank is short, full when ready, brighter as the drive spools
    (materials().strip as MeshBasicMaterial).color.copy(STRIP).multiplyScalar(0.4 + 0.45 * ready + 0.4 * spool + (b.jumpT >= 0 ? 0.5 : 0));
    // the damping field's edge: a thin teal line, a little brighter while you are inside it
    const inside = world.safe ? 0.08 : 0;
    (this.laneField.material as MeshBasicMaterial).opacity = 0.09 + inside + 0.02 * Math.sin(this.time * 1.2);
    (this.portField.material as MeshBasicMaterial).opacity = 0.09 + inside + 0.02 * Math.sin(this.time * 1.2 + 1);
    (this.portRing.material as MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(this.time * 2.4) + b.dockT;
  }
}
