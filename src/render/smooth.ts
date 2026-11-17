import { BufferAttribute, BufferGeometry, ExtrudeGeometry, LatheGeometry, Shape, Vector2, Vector3 } from 'three';

// ── smooth forms ──────────────────────────────────────────────────────────
// Curved bodies for the hero ship, to sit beside the kit's boxes and drums:
// a hull lofted through rounded sections and eased between them, plates
// pressed onto its curve with soft raised edges, turned plates for a drum,
// and blocks with rounded corners. Each returns a geometry in model space
// (nose +X, up +Y, starboard +Z) with smooth normals, a `uv` (unused, for
// merging) and the kit's `wear` attribute (x: how much of an edge it is), so
// the worn metal shader chips the paint off the raised rims first.

/** A cross-section of a body along X: [x, half width (z), half height (y), centre y, centre z, roundness]. Roundness 2 is an ellipse, 4 nearly a box with round corners. */
export type Station = [number, number, number, number, number, number];

/** The section's fields at `x`, eased between the stations (cubic Hermite with finite-difference slopes, so the line has no kinks). */
export function at(st: Station[], x: number): Station {
  const n = st.length;
  if (x <= st[0]![0]) return [...st[0]!] as Station;
  if (x >= st[n - 1]![0]) return [...st[n - 1]!] as Station;
  let k = 0;
  while (k < n - 2 && x > st[k + 1]![0]) k++;
  const a = st[k]!, b = st[k + 1]!, dx = b[0] - a[0], t = (x - a[0]) / dx;
  const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const slope = (i: number, j: number): number => {
    const p = st[Math.max(0, i - 1)]!, q = st[Math.min(n - 1, i + 1)]!;
    return ((q[j]! - p[j]!) / (q[0] - p[0])) * dx;
  };
  const out = [x] as number[];
  for (let j = 1; j < 6; j++) out.push(h00 * a[j]! + h10 * slope(k, j) + h01 * b[j]! + h11 * slope(k + 1, j));
  return out as Station;
}

/** The point at angle `th` round a section (0 the top, +PI/2 starboard), `grow` out from it: [y, z]. */
export function point(s: Station, th: number, grow = 0): [number, number] {
  const [, w, h, cy, cz, p] = s, c = Math.cos(th), sn = Math.sin(th), e = 2 / p;
  return [cy + (h + grow) * Math.sign(c) * Math.abs(c) ** e, cz + (w + grow) * Math.sign(sn) * Math.abs(sn) ** e];
}

/** The outward normal of a section at `th`, in its own plane: [ny, nz]. */
export function normal(s: Station, th: number): [number, number] {
  const [, w, h, , , p] = s, c = Math.cos(th), sn = Math.sin(th);
  // the gradient of |y/h|^p + |z/w|^p, written in the angle so it holds at the poles
  const ny = (Math.sign(c) * Math.abs(c) ** (2 - 2 / p)) / h, nz = (Math.sign(sn) * Math.abs(sn) ** (2 - 2 / p)) / w;
  const l = Math.hypot(ny, nz) || 1;
  return [ny / l, nz / l];
}

/** Indexed grid geometry from a grid of points and per-vertex edge values; faces turned so the first triangle faces `out`. */
function grid(pts: Vector3[][], edge: number[][], out: (p: Vector3) => Vector3): BufferGeometry {
  const rows = pts.length, cols = pts[0]!.length, pos: number[] = [], wear: number[] = [], idx: number[] = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const p = pts[i]![j]!; pos.push(p.x, p.y, p.z); wear.push(edge[i]![j]!, 0); }
  for (let i = 0; i + 1 < rows; i++) for (let j = 0; j + 1 < cols; j++) {
    const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  // which way the grid winds depends on the direction of its axes: test the middle triangle against the outward hint, flip all if wrong
  const m = (Math.floor((rows - 1) / 2) * (cols - 1) + Math.floor((cols - 1) / 2)) * 6;
  const A = new Vector3().fromArray(pos, idx[m]! * 3), B = new Vector3().fromArray(pos, idx[m + 1]! * 3), C = new Vector3().fromArray(pos, idx[m + 2]! * 3);
  const n = B.clone().sub(A).cross(C.clone().sub(A));
  if (n.dot(out(A.clone().add(B).add(C).divideScalar(3))) < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]!; idx[i + 1] = idx[i + 2]!; idx[i + 2] = t; }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setAttribute('wear', new BufferAttribute(new Float32Array(wear), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const away = (st: Station[]) => (p: Vector3): Vector3 => { const s = at(st, p.x); return new Vector3(0, p.y - s[3], p.z - s[4]); };

/** A whole body: the sections eased from first to last, `nx` rings along it and `nr` round each, closed at both ends. */
export function body(st: Station[], nx = 40, nr = 36): BufferGeometry {
  const x0 = st[0]![0], x1 = st[st.length - 1]![0], pts: Vector3[][] = [], edge: number[][] = [];
  for (let i = 0; i <= nx; i++) {
    // denser toward the ends, where the curve turns fastest
    const u = 0.5 - 0.5 * Math.cos((i / nx) * Math.PI), s = at(st, x0 + (x1 - x0) * u), row: Vector3[] = [];
    for (let j = 0; j <= nr; j++) { const [y, z] = point(s, (j / nr) * Math.PI * 2); row.push(new Vector3(s[0], y, z)); }
    pts.push(row);
    edge.push(row.map(() => 0));
  }
  // close each end on its own centre (an end cap with no gap)
  const cap = (s: Station): Vector3[] => Array.from({ length: nr + 1 }, () => new Vector3(s[0], s[3], s[4]));
  pts.unshift(cap(at(st, x0)));
  edge.unshift(edge[0]!);
  pts.push(cap(at(st, x1)));
  edge.push(edge[0]!);
  return grid(pts, edge, (p) => { const o = away(st)(p); return o.lengthSq() < 1e-8 ? new Vector3(p.x - (x0 + x1) / 2, 0, 0) : o; });
}

/**
 * A plate pressed onto a body: the patch between x0..x1 and angles th0..th1, standing `lift` off it, `thick` deep in the middle and
 * easing down to under half that over its last `rim` units, so its edges are soft and raised. The rim walls go down to the body.
 */
export function plate(st: Station[], x0: number, x1: number, th0: number, th1: number, lift: number, thick: number, rim = 0.035): BufferGeometry {
  const s0 = at(st, (x0 + x1) / 2), rad = (s0[1] + s0[2]) / 2;
  const nx = Math.max(3, Math.ceil((x1 - x0) / 0.06)), nt = Math.max(3, Math.ceil(((th1 - th0) * rad) / 0.05));
  const pts: Vector3[][] = [], edge: number[][] = [];
  const ease = (d: number): number => { const t = Math.min(1, Math.max(0, d / rim)); return t * t * (3 - 2 * t); };
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx, s = at(st, x), row: Vector3[] = [], er: number[] = [];
    for (let j = 0; j <= nt; j++) {
      const th = th0 + ((th1 - th0) * j) / nt, d = Math.min(x - x0, x1 - x, (th - th0) * rad, (th1 - th) * rad), f = ease(d);
      const [y, z] = point(s, th, lift + thick * (0.4 + 0.6 * f));
      row.push(new Vector3(x, y, z));
      er.push(1 - f);
    }
    pts.push(row);
    edge.push(er);
  }
  const top = grid(pts, edge, away(st));
  // the walls: each border run of the top dropped to the body, as a strip of two rows
  const walls: BufferGeometry[] = [];
  const foot = (p: Vector3, th: number): Vector3 => { const [y, z] = point(at(st, p.x), th, lift * 0.5); return new Vector3(p.x, y, z); };
  const ths = (j: number) => th0 + ((th1 - th0) * j) / nt;
  const centre = new Vector3(), mid = at(st, (x0 + x1) / 2), [my, mz] = point(mid, (th0 + th1) / 2, lift);
  centre.set((x0 + x1) / 2, my, mz);
  const strip = (run: Vector3[], th: (k: number) => number): void => {
    const lower = run.map((p, k) => foot(p, th(k)));
    walls.push(grid([run, lower], [run.map(() => 1), run.map(() => 1)], (p) => p.clone().sub(centre)));
  };
  strip(pts[0]!, ths);
  strip(pts[nx]!, ths);
  strip(pts.map((r) => r[0]!), () => th0);
  strip(pts.map((r) => r[nt]!), () => th1);
  return joined([top, ...walls]);
}

/** Merge indexed geometries with the same attributes into one non-indexed geometry (normals kept). */
function joined(list: BufferGeometry[]): BufferGeometry {
  const flat = list.map((g) => g.toNonIndexed());
  const out = new BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'wear']) {
    const size = flat[0]!.attributes[name]!.itemSize, total = flat.reduce((n, g) => n + g.attributes[name]!.count, 0), arr = new Float32Array(total * size);
    let o = 0;
    for (const g of flat) { arr.set(g.attributes[name]!.array as Float32Array, o); o += g.attributes[name]!.array.length; }
    out.setAttribute(name, new BufferAttribute(arr, size));
  }
  return out;
}

/**
 * A turned form round +X from a profile of [x, radius] points, in the order the outer surface runs toward the bow (a profile that
 * folds back, as a bell's lip does, then runs aft on the inside and shows its face to the axis). `edges` marks those points as rims.
 */
export function turned(profile: Array<[number, number]>, seg = 36, edges: number[] = []): BufferGeometry {
  const g = new LatheGeometry(profile.map(([x, r]) => new Vector2(r, x)), seg);
  // the lathe turns round +Y with its faces outward for a profile rising in Y; a quarter turn lays that along +X (winding kept)
  g.rotateZ(-Math.PI / 2);
  const n = g.attributes.position!.count, wear = new Float32Array(n * 2), pts = profile.length;
  // the lathe lays its vertices out sweep by sweep, each sweep the whole profile
  for (let i = 0; i < n; i++) wear[i * 2] = edges.includes(i % pts) ? 1 : 0;
  g.setAttribute('wear', new BufferAttribute(wear, 2));
  return g;
}

/** A pillowed band for a drum whose radius at x is `r(x)`: from x0 to x1, `lift` off it, `thick` deep, its two rims eased down. */
export function band(r: (x: number) => number, x0: number, x1: number, lift: number, thick: number, seg = 36, rim = 0.035): BufferGeometry {
  const n = Math.max(4, Math.ceil((x1 - x0) / 0.05)), prof: Array<[number, number]> = [[x0, r(x0) + lift * 0.3]], edges = [0];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, d = Math.min(x - x0, x1 - x), t = Math.min(1, d / rim), f = t * t * (3 - 2 * t);
    prof.push([x, r(x) + lift + thick * (0.4 + 0.6 * f)]);
    if (f < 0.6) edges.push(prof.length - 1);
  }
  prof.push([x1, r(x1) + lift * 0.3]);
  edges.push(prof.length - 1);
  return turned(prof, seg, edges);
}

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
