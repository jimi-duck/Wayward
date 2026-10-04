import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from 'three';
import type { Kit, V3 } from './kit';

// ── industrial parts ──────────────────────────────────────────────────────
// Reusable pieces for building ships out of the kit, larger forms first:
// octagonal bodies, bevelled armour plates hung on their faces, vents,
// structural rings and frames, brackets, pipe runs, lamps. Everything is
// placed in the kit's model space (nose +X, up +Y, starboard +Z), and most
// of it on the faces of a body that runs along X.

const OCT = Math.cos(Math.PI / 8);
const TAN = Math.tan(Math.PI / 8);

/**
 * A box with every edge chamfered: `len` along X, `thick` along Y, `wid`
 * along Z. The chamfers catch the light, so a plate reads as manufactured
 * rather than cut.
 */
export function bevelGeo(len: number, thick: number, wid: number, bevel = 0.02): BufferGeometry {
  const b = Math.max(0.002, Math.min(bevel, len * 0.3, thick * 0.3, wid * 0.3));
  const x = len / 2 - b, y = thick / 2 - b;
  const s = new Shape();
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const depth = Math.max(0.001, wid - 2 * b);
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** A bevelled block, sized [x, y, z], at pos, turned by rot. */
export function block(k: Kit, key: string, size: V3, pos: V3, rot: V3 = [0, 0, 0], bevel = 0.025): void {
  k.add(key, bevelGeo(size[0], size[1], size[2], bevel), pos, rot);
}

/**
 * An octagonal prism along X, flat on top and on the flanks, `w` wide and `h`
 * high, faceted so the chamfers catch the light as plates do. `taper` scales
 * the +X end; `open` leaves the ends off.
 */
export function octGeo(len: number, w: number, h: number, taper = 1, open = false): BufferGeometry {
  const g = new CylinderGeometry(taper, 1, len, 8, 1, open).rotateY(Math.PI / 8).rotateZ(-Math.PI / 2);
  g.scale(1, h / (2 * OCT), w / (2 * OCT));
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

export function oct(k: Kit, key: string, x0: number, x1: number, w: number, h: number, y: number, z: number, taper = 1, open = false): void {
  k.add(key, octGeo(x1 - x0, w, h, taper, open), [(x0 + x1) / 2, y, z]);
}

/** A face of a body along X: its angle round X from the top toward starboard, its distance from the axis, its width. */
export interface Face { f: number; rad: number; wid: number; }

/**
 * The eight faces of an octagonal body `w` wide and `h` high, from the top
 * round to starboard and under to port: 0 top, 1 upper starboard chamfer,
 * 2 starboard, 3 lower starboard chamfer, 4 belly, 5, 6 port, 7.
 */
export function octFaces(w: number, h: number): Face[] {
  const a = h / 2, b = w / 2;
  // the chamfers of a stretched octagon lean toward the longer side
  const cf = Math.atan2(1 / b, 1 / a), crad = 1 / (Math.SQRT1_2 * Math.hypot(1 / a, 1 / b));
  const cw = (1 - TAN) * Math.hypot(a, b);
  return [
    { f: 0, rad: a, wid: 2 * TAN * b },
    { f: cf, rad: crad, wid: cw },
    { f: Math.PI / 2, rad: b, wid: 2 * TAN * a },
    { f: Math.PI - cf, rad: crad, wid: cw },
    { f: Math.PI, rad: a, wid: 2 * TAN * b },
    { f: Math.PI + cf, rad: crad, wid: cw },
    { f: -Math.PI / 2, rad: b, wid: 2 * TAN * a },
    { f: -cf, rad: crad, wid: cw },
  ];
}

/** The four faces of a box body `w` wide and `h` high: top, starboard, belly, port. */
export function boxFaces(w: number, h: number): Face[] {
  return [
    { f: 0, rad: h / 2, wid: w },
    { f: Math.PI / 2, rad: w / 2, wid: h },
    { f: Math.PI, rad: h / 2, wid: w },
    { f: -Math.PI / 2, rad: w / 2, wid: h },
  ];
}

/**
 * A panel lying on a face of a body whose axis is at (y0, z0): centred at `x`
 * along the body and `v` across the face, `lift` off it, `len` by `wid` and
 * `thick` deep.
 */
export function panel(k: Kit, key: string, face: Face, y0: number, z0: number, x: number, v: number,
  len: number, wid: number, thick: number, lift = 0, bevel = 0.02): void {
  const c = Math.cos(face.f), s = Math.sin(face.f), d = face.rad + lift + thick / 2;
  k.add(key, bevelGeo(len, thick, wid, bevel), [x, y0 + d * c - v * s, z0 + d * s + v * c], [face.f, 0, 0]);
}

/** A cooling vent set into a face: a dark recess, louvre slats across it. */
export function vent(k: Kit, face: Face, y0: number, z0: number, x: number, v: number, len: number, wid: number, lift = 0): void {
  panel(k, 'dark', face, y0, z0, x, v, len, wid, 0.02, lift, 0.006);
  const n = Math.max(2, Math.round(len / 0.05));
  for (let i = 0; i < n; i++) {
    const u = x - len / 2 + (i + 0.5) * (len / n);
    panel(k, 'pipe', face, y0, z0, u, v, (len / n) * 0.42, wid * 0.88, 0.022, lift + 0.012, 0.004);
  }
}

/** A service hatch: a framed panel a step proud of the plate under it, with a handle bar. */
export function hatch(k: Kit, key: string, face: Face, y0: number, z0: number, x: number, v: number, len: number, wid: number, lift = 0): void {
  panel(k, 'rubber', face, y0, z0, x, v, len, wid, 0.012, lift, 0.004);
  panel(k, key, face, y0, z0, x, v, len * 0.86, wid * 0.86, 0.02, lift + 0.006, 0.006);
  panel(k, 'pipe', face, y0, z0, x + len * 0.28, v, len * 0.08, wid * 0.4, 0.012, lift + 0.024, 0.003);
}

/** Armour bolts down both edges of a panel. */
export function bolts(k: Kit, face: Face, y0: number, z0: number, x: number, v: number, len: number, wid: number, lift: number): void {
  const n = Math.max(2, Math.round(len / 0.14));
  for (let i = 0; i < n; i++) {
    const u = x - len / 2 + (i + 0.5) * (len / n);
    for (const e of [-1, 1]) panel(k, 'hull', face, y0, z0, u, v + e * wid * 0.42, 0.018, 0.018, 0.012, lift, 0.004);
  }
}

/** A pipe run along X with clamps holding it down at intervals. */
export function pipeRun(k: Kit, x0: number, x1: number, y: number, z: number, r: number, clampEvery = 0.4): void {
  k.cyl('pipe', r, r, x1 - x0, [(x0 + x1) / 2, y, z], 'x', 8);
  for (let x = x0 + clampEvery / 2; x < x1; x += clampEvery) k.box('dark', [0.03, r * 2.6, r * 2.6], [x, y, z]);
}

/** A structural frame ring round an octagonal body: proud of it, with a lighter band on its crown. */
export function frameRing(k: Kit, x: number, len: number, w: number, h: number, y: number, z: number, grow = 1.08): void {
  oct(k, 'dark', x - len / 2, x + len / 2, w * grow, h * grow, y, z);
  oct(k, 'hull', x - len * 0.18, x + len * 0.18, w * (grow + 0.025), h * (grow + 0.025), y, z);
}

/**
 * An octagonal frame round the X axis, as a ring of eight bevelled bars:
 * `rOut` to the outer flats, `rIn` to the inner, `len` deep.
 */
export function octFrame(k: Kit, key: string, x: number, len: number, rOut: number, rIn: number, y: number, z: number): void {
  const t = rOut - rIn, side = 2 * TAN * rOut;
  for (let i = 0; i < 8; i++) {
    const f = (i / 8) * Math.PI * 2, c = Math.cos(f), s = Math.sin(f), d = rIn + t / 2;
    k.add(key, bevelGeo(len, t, side * 1.02, Math.min(0.03, t * 0.25)), [x, y + d * c, z + d * s], [f, 0, 0]);
  }
}

/** A bracket: a foot plate and a short arm, where one structure is fixed to another. */
export function bracket(k: Kit, key: string, pos: V3, size: V3, rot: V3 = [0, 0, 0]): void {
  block(k, key, size, pos, rot, 0.012);
  block(k, 'dark', [size[0] * 1.25, size[1] * 0.3, size[2] * 1.25], pos, rot, 0.008);
}

/** A small marker lamp on a dark socket. */
export function lamp(k: Kit, key: 'red' | 'lamp', pos: V3, size = 0.035): void {
  k.box('dark', [size * 1.6, size * 0.6, size * 1.6], [pos[0], pos[1] - size * 0.5, pos[2]]);
  k.box(key, [size, size, size], pos);
}
