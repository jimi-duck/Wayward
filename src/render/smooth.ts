import { BufferAttribute, BufferGeometry, ExtrudeGeometry, Shape, Vector3 } from 'three';

// ── softened forms ────────────────────────────────────────────────────────
// Shapes for the hero ship beside the kit's boxes and drums: blocks with
// rounded corners, and crisp plates that follow a faceted body as it tapers.
// Each returns a geometry in model space (nose +X, up +Y, starboard +Z) with a
// `uv` (unused, for merging) and the kit's `wear` attribute (x: how much of an
// edge it is), so the worn metal shader chips the paint off the rims first.

/** A block `len` (X) by `h` (Y) by `wid` (Z) with its four long corners rounded to `r` and every edge softened by `bevel`. */
export function roundBlock(len: number, h: number, wid: number, r: number, bevel = 0.012): BufferGeometry {
  const u = len / 2 - bevel, v = h / 2 - bevel, c = Math.min(r, u * 0.95, v * 0.95), s = new Shape();
  s.moveTo(-u + c, -v); s.lineTo(u - c, -v); s.quadraticCurveTo(u, -v, u, -v + c); s.lineTo(u, v - c); s.quadraticCurveTo(u, v, u - c, v);
  s.lineTo(-u + c, v); s.quadraticCurveTo(-u, v, -u, v - c); s.lineTo(-u, -v + c); s.quadraticCurveTo(-u, -v, -u + c, -v);
  const depth = Math.max(0.001, wid - 2 * bevel);
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  return softEdges(g);
}

/** A slab facing along X (its face `wid` by `h`), corners rounded to `r`, edges rounded by `bevel`. */
export function roundSlab(len: number, wid: number, h: number, r: number, bevel = 0.04): BufferGeometry {
  const g = roundBlock(wid, h, len, r, bevel);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Mark the faces of a rounded geometry that are not square to an axis as edges, so paint wears from its rounding. */
function softEdges(g: BufferGeometry): BufferGeometry {
  const p = g.attributes.position!, n = p.count, wear = new Float32Array(n * 2), a = new Vector3(), b = new Vector3(), c = new Vector3();
  for (let i = 0; i + 2 < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const f = b.sub(a).cross(c.sub(a)).normalize(), e = Math.max(Math.abs(f.x), Math.abs(f.y), Math.abs(f.z)) < 0.97 ? 1 : 0;
    for (let j = 0; j < 3; j++) wear[(i + j) * 2] = e;
  }
  g.setAttribute('wear', new BufferAttribute(wear, 2));
  return g;
}

// ── faceted bodies ────────────────────────────────────────────────────────
// The kit's loft (Kit.loft) is an eight-sided body with flat faces between
// its stations. These find points on those faces and press crisp plates onto
// them, so armour follows a body that tapers without stepping.

/** A loft station as Kit.loft takes it: [x, half width, top, bottom, chamfer]. */
export type Facet = [number, number, number, number, number?];

/** The eight corners of a loft's section at a station (the same as Kit.loft's own), each [y, z], from the top's starboard corner round. */
function corners(st: Facet): Array<[number, number]> {
  const [, w, top, bot, ch = 0.5] = st, dz = w * (0.35 + 0.6 * (1 - ch)), dy = (top + bot) * 0.3 * (0.4 + ch);
  return [[top, dz], [top - dy, w], [-bot + dy * 0.8, w], [-bot, dz], [-bot, -dz], [-bot + dy * 0.8, -w], [top - dy, -w], [top, -dz]];
}
/** The section at x, straight between stations as the loft is. */
function sectionAt(st: Facet[], x: number): Array<[number, number]> {
  let k = 0;
  while (k < st.length - 2 && x > st[k + 1]![0]) k++;
  const a = st[k]!, b = st[k + 1]!, t = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
  const ca = corners(a), cb = corners(b);
  return ca.map(([y, z], i) => [y + (cb[i]![0] - y) * t, z + (cb[i]![1] - z) * t]);
}

/**
 * Face `face` of a loft (0 the upper starboard chamfer, 1 the starboard flank, 2 the lower starboard chamfer, 3 the belly, 4 to 6 the
 * port side up, 7 the top) at x, `u` across it (0 to 1, from its first corner): the point `lift` off it and the face's outward normal.
 */
export function facePoint(st: Facet[], face: number, x: number, u: number, lift = 0): { p: [number, number, number]; n: [number, number, number] } {
  const c = sectionAt(st, x), a = c[face]!, b = c[(face + 1) % 8]!;
  let ny = b[1] - a[1], nz = -(b[0] - a[0]);
  const l = Math.hypot(ny, nz) || 1;
  ny /= l; nz /= l;
  // the corners run round from the top toward starboard, so this normal points out; a face can slope along X too (the taper)
  const y = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
  return { p: [x, y + ny * lift, z + nz * lift], n: [0, ny, nz] };
}

/**
 * A plate on a face of a loft: from x0 to x1, from u0 to u1 across the face, `lift` off it and `thick` deep, its top inset by `bevel`
 * all round, so its rim is a crisp chamfer that catches the light. Follows a tapering face; flat-shaded.
 */
export function facetPlate(st: Facet[], face: number, x0: number, x1: number, u0: number, u1: number, lift: number, thick: number, bevel = 0.012): BufferGeometry {
  const at = (x: number, u: number, l: number): Vector3 => { const { p } = facePoint(st, face, x, u, l); return new Vector3(...p); };
  const w0 = facePoint(st, face, x0, 0).p, w1 = facePoint(st, face, x0, 1).p, width = Math.hypot(w1[1] - w0[1], w1[2] - w0[2]) || 1;
  const du = Math.min(bevel / width, (u1 - u0) * 0.3), dx = Math.min(bevel, (x1 - x0) * 0.3);
  const lo = [at(x0, u0, lift), at(x1, u0, lift), at(x1, u1, lift), at(x0, u1, lift)];
  const hi = [at(x0 + dx, u0 + du, lift + thick), at(x1 - dx, u0 + du, lift + thick), at(x1 - dx, u1 - du, lift + thick), at(x0 + dx, u1 - du, lift + thick)];
  const pos: number[] = [], wear: number[] = [];
  const centre = lo.reduce((s, v) => s.add(v), new Vector3()).multiplyScalar(0.25), out = new Vector3(...facePoint(st, face, (x0 + x1) / 2, (u0 + u1) / 2).n);
  const tri = (a: Vector3, b: Vector3, c: Vector3, e: number, want: Vector3): void => {
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    const [p, q] = n.dot(want) < 0 ? [c, b] : [b, c];
    pos.push(a.x, a.y, a.z, p.x, p.y, p.z, q.x, q.y, q.z);
    wear.push(e, 0, e, 0, e, 0);
  };
  tri(hi[0]!, hi[1]!, hi[2]!, 0, out);
  tri(hi[0]!, hi[2]!, hi[3]!, 0, out);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, mid = lo[i]!.clone().add(lo[j]!).multiplyScalar(0.5), side = mid.sub(centre).normalize().add(out.clone().multiplyScalar(0.3));
    tri(lo[i]!, lo[j]!, hi[j]!, 1, side);
    tri(lo[i]!, hi[j]!, hi[i]!, 1, side);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setAttribute('wear', new BufferAttribute(new Float32Array(wear), 2));
  g.computeVertexNormals();
  return g;
}
