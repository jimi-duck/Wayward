import { BoxGeometry, CylinderGeometry, Color, Group, Matrix4, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, Vector3, type Material } from 'three';
import { Kit, metal } from './kit';

// ── monuments and far convoys ─────────────────────────────────────────────
// Things that sit in the sky or stand alone in a field, drawn once from the
// kit (merged per material, baked occlusion) and cloned where they are placed.
// Their lights are their own unfogged materials, so a relic's cold seams and a
// convoy's windows keep their colour at range while the stone around them
// goes into the haze.

const UP = new Vector3(0, 1, 0), ALT = new Vector3(1, 0, 0);

/** A square bar from a to b, in the kit. */
export function bar(k: Kit, key: string, a: Vector3, b: Vector3, t: number): void {
  const d = new Vector3().subVectors(b, a), len = d.length();
  if (len < 1e-4) return;
  const m = new Matrix4().lookAt(new Vector3(), d.clone().normalize(), Math.abs(d.y / len) > 0.98 ? ALT : UP);
  m.setPosition(a.clone().add(b).multiplyScalar(0.5));
  k.addMatrix(key, new BoxGeometry(t, t, len), m);
}

const lit = (c: Color): MeshBasicMaterial => new MeshBasicMaterial({ color: c, toneMapped: false, fog: false });

// ── the relic ────────────────────────────────────────────────────────────

const RB = [9.5, 6.4, 8.2, 5.2, 6.4];

/** The height of the relic's last section, where its shard hangs above. */
export const RELIC_TOP = 5 * 17 + 4 * 1.2 + 6;

let relic: Group | null = null;
/**
 * The relic: a tower of twisted, tapering sections of dark cut stone on a stepped plinth. Each section has bevelled
 * caps, grooves down its faces, and cold light running in a narrow channel and along the joints. Built once.
 */
export function relicModel(): Group {
  if (!relic) {
    const k = new Kit();
    const mats: Record<string, Material> = {
      stone: metal({ tint: 0x8794a4, roughness: 0.5, metalness: 0.2, scale: 0.28, worn: 0.4 }),
      dark: metal({ tint: 0x262d36, roughness: 0.6, metalness: 0.3, scale: 0.4 }),
      seam: lit(new Color(0.32, 0.74, 1.05)),
    };
    // a stepped plinth
    for (let i = 0; i < 3; i++) k.add('stone', new CylinderGeometry(15 - i * 2.4, 16 - i * 2.4, 1.8, 6, 1), [0, 0.9 + i * 1.8, 0], [0, i * 0.2, 0]);
    k.add('seam', new CylinderGeometry(11.4, 11.4, 0.18, 6, 1), [0, 5.5, 0], [0, 0.4, 0]);
    let y0 = 5.4;
    for (let i = 0; i < 5; i++) {
      const rb = RB[i]!, rt = rb * (i % 2 ? 1.3 : 0.62), h = 17, turn = i * 0.42;
      k.add('stone', new CylinderGeometry(rt, rb, h, 6, 1), [0, y0 + h / 2, 0], [0, turn, 0]);
      // bevelled caps: a slightly wider short ring top and bottom
      k.add('dark', new CylinderGeometry(rb * 1.04, rb * 1.07, 0.7, 6, 1), [0, y0 + 0.35, 0], [0, turn, 0]);
      k.add('dark', new CylinderGeometry(rt * 1.07, rt * 1.04, 0.7, 6, 1), [0, y0 + h - 0.35, 0], [0, turn, 0]);
      for (let f = 0; f < 6; f++) {
        const a = turn + (f / 6) * Math.PI * 2, rr = (rb + rt) / 2 * 0.87 + 0.05, cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, yaw = Math.PI / 2 - a;
        // two grooves down every face, and a short cut band across it
        for (const o of [-0.22, 0.22]) {
          const gx = Math.cos(a + o * 0.5) * rr, gz = Math.sin(a + o * 0.5) * rr;
          k.add('dark', new BoxGeometry(0.28, h * 0.82, 0.16), [gx, y0 + h / 2, gz], [0, yaw, 0]);
        }
        k.add('dark', new BoxGeometry(rb * 0.4, 0.5, 0.16), [cx, y0 + h * (0.28 + 0.1 * ((i + f) % 4)), cz], [0, yaw, 0]);
        // the light in the stone: a narrow channel on three of the faces, with dashes beside it
        if (f % 2 === 0) {
          k.add('seam', new BoxGeometry(0.16, h * (0.55 + 0.1 * ((i + f) % 3)), 0.07), [cx, y0 + h / 2, cz], [0, yaw, 0]);
          for (let n = 0; n < 4; n++) k.add('seam', new BoxGeometry(0.7, 0.1, 0.07), [cx, y0 + h * (0.22 + n * 0.17), cz], [0, yaw, 0]);
        }
      }
      y0 += h;
      if (i < 4) {
        const nb = RB[i + 1]! * 0.92;
        k.add('seam', new CylinderGeometry(rt * 0.94, nb, 1.2, 6, 1), [0, y0 + 0.6, 0], [0, (i + 0.5) * 0.42, 0]);
        k.add('dark', new CylinderGeometry(rt * 1.03, nb * 1.05, 0.28, 6, 1), [0, y0 + 1.34, 0], [0, (i + 0.5) * 0.42, 0]);
        y0 += 1.2;
      }
    }
    // a crown: three cut prisms round the top, leaning in
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3, r = RB[4]! * 0.65;
      k.add('stone', new OctahedronGeometry(1, 0), [Math.cos(a) * r, y0 + 2.4, Math.sin(a) * r], [0.3 * Math.cos(a), a, 0.3 * Math.sin(a)], [1.1, 3.4, 1.1]);
    }
    k.bakeOcclusion(0.9);
    relic = k.build(mats);
  }
  return relic.clone();
}

// ── the convoy ───────────────────────────────────────────────────────────

let hauler: Group | null = null;
/** One convoy hauler of unit length, nose +X: a spine, a bridge, cargo pods, running lights and a lit window row. */
export function haulerModel(): Group {
  if (!hauler) {
    const k = new Kit();
    const mats: Record<string, Material> = {
      hull: metal({ tint: 0xa0a6ad, roughness: 0.55, metalness: 0.4, scale: 6 }),
      dark: metal({ tint: 0x2c2f33, roughness: 0.6, metalness: 0.4, scale: 8 }),
      lit: lit(new Color(1.7, 1.15, 0.6)),
      eng: lit(new Color(0.6, 1.1, 1.5)),
    };
    // seen from a long way off, in the sky layer: the hull takes the light but not the fog
    for (const m of [mats.hull!, mats.dark!]) (m as MeshStandardMaterial).fog = false;
    k.box('dark', [1.0, 0.07, 0.07], [0, 0, 0]);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const x = -0.3 + i * 0.2;
      k.box('hull', [0.17, 0.15, 0.15], [x, 0, s * 0.11]);
      k.box('dark', [0.02, 0.16, 0.16], [x + 0.095, 0, s * 0.11]);
    }
    k.box('hull', [0.2, 0.12, 0.1], [0.43, 0.02, 0]);
    k.box('dark', [0.1, 0.07, 0.08], [0.52, 0.09, 0]);
    k.box('lit', [0.1, 0.012, 0.075], [0.52, 0.13, 0]);
    for (let i = 0; i < 5; i++) k.box('lit', [0.02, 0.014, 0.016], [0.36 + i * 0.025, 0.07, 0.052]);
    for (const s of [-1, 1]) k.box('eng', [0.03, 0.05, 0.05], [-0.52, 0, s * 0.05]);
    k.box('dark', [0.08, 0.13, 0.17], [-0.46, 0, 0]);
    k.bakeOcclusion(0.03);
    hauler = k.build(mats);
  }
  return hauler.clone();
}

// ── the slipway ──────────────────────────────────────────────────────────

let slip: Group | null = null;
/**
 * The slipway: four lattice gantry towers on rails with cross-bracing, decks and working lamps, a travelling crane
 * across the top, and an unfinished hull on the stocks: keel, ribs, stringers, the stern third already plated. In world
 * units, the stocks along x. Built once.
 */
export function slipwayModel(): Group {
  if (!slip) {
    const k = new Kit();
    const mats: Record<string, Material> = {
      steel: metal({ tint: 0x8a939d, roughness: 0.55, metalness: 0.45, scale: 0.45, worn: 0.35 }),
      dark: metal({ tint: 0x30353b, roughness: 0.6, metalness: 0.4, scale: 0.6 }),
      hull: metal({ tint: 0x8d8478, roughness: 0.6, metalness: 0.35, scale: 0.3, worn: 0.3 }),
      lamp: lit(new Color(2.4, 1.7, 0.9)),
    };
    const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
    // rails and sleepers
    for (const z of [-22, 22]) {
      k.box('dark', [84, 0.8, 1.4], [0, -2.4, z]);
      for (let i = 0; i < 22; i++) k.box('dark', [0.8, 0.5, 6], [-40 + i * 3.8, -2.9, z]);
    }
    // the towers: four legs, rings every 7 units, a cross-brace in every bay on every face, decks, a lamp mast
    for (const sx of [-26, 26]) for (const sz of [-22, 22]) {
      const c: Array<[number, number]> = [[-3, -3], [3, -3], [3, 3], [-3, 3]];
      const at = (cx: number, cz: number, h: number) => V(sx + cx * (1 - h * 0.4), -2 + h * 48, sz + cz * (1 - h * 0.4));
      for (const [cx, cz] of c) bar(k, 'steel', at(cx, cz, 0), at(cx, cz, 1), 0.9);
      for (let j = 0; j < 6; j++) {
        const h0 = j / 6, h1 = (j + 1) / 6;
        for (let q = 0; q < 4; q++) {
          const [ax, az] = c[q]!, [bx, bz] = c[(q + 1) % 4]!;
          bar(k, 'steel', at(ax, az, h1), at(bx, bz, h1), 0.5);
          bar(k, 'steel', at(ax, az, h0), at(bx, bz, h1), 0.32);
          bar(k, 'steel', at(bx, bz, h0), at(ax, az, h1), 0.32);
        }
      }
      for (const h of [0.42, 0.8]) {
        const y = -2 + h * 48, e = 5.2 * (1 - h * 0.4);
        k.box('dark', [e * 2, 0.5, e * 2], [sx, y, sz]);
        for (const [cx, cz] of c) k.box('steel', [0.25, 1.8, 0.25], [sx + cx * 1.55 * (1 - h * 0.4), y + 1, sz + cz * 1.55 * (1 - h * 0.4)]);
      }
      k.box('dark', [5, 1.2, 5], [sx, 46.6, sz]);
      bar(k, 'steel', V(sx, 47, sz), V(sx, 54, sz), 0.4);
      k.box('lamp', [1.3, 0.8, 1.3], [sx, 54.4, sz]);
      k.box('lamp', [1.0, 0.7, 1.0], [sx, 28, sz + Math.sign(sz) * -2.6]);
      k.box('dark', [9, 1.6, 9], [sx, -1.2, sz]);
    }
    // the bridge: twin chords with zigzag, and a crane on it
    for (const z of [-1.6, 1.6]) { bar(k, 'steel', V(-26, 47, z), V(26, 47, z), 1.0); bar(k, 'steel', V(-26, 51, z), V(26, 51, z), 0.7); }
    for (let j = 0; j < 20; j++) {
      const x0 = -26 + j * 2.6, x1 = x0 + 2.6, up = j % 2;
      bar(k, 'steel', V(x0, up ? 51 : 47, 0), V(x1, up ? 47 : 51, 0), 0.4);
      bar(k, 'steel', V(x0, 47, -1.6), V(x0, 51, -1.6), 0.3);
      bar(k, 'steel', V(x0, 47, 1.6), V(x0, 51, 1.6), 0.3);
    }
    for (const sx of [-26, 26]) bar(k, 'steel', V(sx, 47, -22), V(sx, 47, 22), 1.6);
    k.box('dark', [8, 2.2, 6], [8, 45, 0]);
    k.box('lamp', [0.8, 0.5, 0.8], [8, 43.7, 0]);
    bar(k, 'dark', V(7.2, 43.6, 0), V(7.2, 19, 0), 0.14);
    bar(k, 'dark', V(8.8, 43.6, 0), V(8.8, 19, 0), 0.14);
    k.box('dark', [2.4, 1.4, 2.4], [8, 18.2, 0]);
    k.box('hull', [9, 0.3, 4.5], [8, 16.6, 0]);
    for (const dx of [-3.6, 3.6]) bar(k, 'dark', V(8 + dx, 17.5, -1.8), V(8, 18.2, 0), 0.1);
    // the hull on the stocks: keel, ribs, stringers
    const base = 4, prof: Array<[number, number]> = [[0, 0.4], [3.6, 1.6], [6.4, 5], [7.4, 9.5], [7.2, 12.5]];
    for (let x = -34; x <= 30; x += 3.4) {
      k.box('dark', [2.2, 2.6, 3.6], [x, 1.4, 0]);
      k.box('dark', [1.0, 2.6, 1.0], [x, 0.4, -5]);
      k.box('dark', [1.0, 2.6, 1.0], [x, 0.4, 5]);
    }
    k.box('hull', [66, 1.6, 2.2], [-2, base + 0.8, 0]);
    k.box('dark', [66, 0.4, 3.0], [-2, base + 0.1, 0]);
    const ribs: number[] = [];
    for (let x = -32; x <= 26; x += 3.6) ribs.push(x);
    ribs.forEach((x, i) => {
      // the stern third is plated; the rest is frame
      const taper = i < 4 ? 0.6 + i * 0.1 : i > ribs.length - 6 ? 1 - (i - (ribs.length - 6)) * 0.15 : 1;
      for (const sd of [-1, 1]) for (let p = 0; p < prof.length - 1; p++) {
        const a = prof[p]!, b = prof[p + 1]!;
        bar(k, 'hull', V(x, base + a[1] * taper + 0.8, sd * a[0] * taper), V(x, base + b[1] * taper + 0.8, sd * b[0] * taper), 0.38);
      }
      bar(k, 'hull', V(x, base + 12.5 * taper + 0.8, -7.2 * taper), V(x, base + 12.5 * taper + 0.8, 7.2 * taper), 0.3);
    });
    for (const sd of [-1, 1]) for (let p = 1; p < prof.length; p++) {
      const a = prof[p]!;
      bar(k, 'hull', V(-32, base + a[1] * 0.6 + 0.8, sd * a[0] * 0.6), V(26, base + a[1] + 0.8, sd * a[0]), 0.28);
    }
    // plating on the first four bays at the stern end
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) for (let p = 0; p < prof.length - 1; p++) {
      const a = prof[p]!, b = prof[p + 1]!, x = ribs[i]! + 1.8, t = 0.6 + i * 0.1;
      const dz = (b[0] - a[0]) * t, dy = (b[1] - a[1]) * t, len = Math.hypot(dy, dz);
      k.add('hull', new BoxGeometry(3.4, 0.22, len), [x, base + ((a[1] + b[1]) / 2) * t + 0.8, sd * ((a[0] + b[0]) / 2) * t], [-Math.atan2(dy, dz * sd) * 1, 0, 0]);
    }
    // work lamps on poles beside the stocks, and a couple of plates stacked ready
    for (let i = 0; i < 6; i++) {
      const x = -28 + i * 11, z = i % 2 ? 11 : -11;
      bar(k, 'dark', V(x, -2, z), V(x, 9, z), 0.3);
      k.box('dark', [1.3, 0.2, 0.9], [x, 9.2, z]);
      k.box('lamp', [1.1, 0.3, 0.7], [x, 9.0, z - Math.sign(z) * 0.2]);
    }
    for (let i = 0; i < 3; i++) k.box('hull', [6, 0.35, 3.4], [-14, -1.2 + i * 0.4, 15]);
    k.bakeOcclusion(1.0);
    slip = k.build(mats);
  }
  return slip.clone();
}

// ── the lantern buoy ─────────────────────────────────────────────────────

let buoy: Group | null = null;
/** One navigation lantern, about three units tall: a ballast block, a cage, a lit lens, solar wings and a mast. */
export function buoyModel(): Group {
  if (!buoy) {
    const k = new Kit();
    const mats: Record<string, Material> = {
      hull: metal({ tint: 0x9aa4ae, roughness: 0.5, metalness: 0.45, scale: 1.2, worn: 0.3 }),
      dark: metal({ tint: 0x2a3036, roughness: 0.6, metalness: 0.4, scale: 1.6 }),
      lens: lit(new Color(0.5, 1.5, 1.7)),
    };
    k.cyl('dark', 0.5, 0.65, 0.7, [0, -1.5, 0], 'y', 8);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) bar(k, 'hull', new Vector3(sx * 0.55, -1.1, sz * 0.55), new Vector3(sx * 0.42, 1.2, sz * 0.42), 0.12);
    for (const y of [-1.1, 0.05, 1.2]) k.ring('hull', 0.78, 0.07, [0, y, 0], 'y', 12);
    k.cyl('lens', 0.42, 0.42, 1.4, [0, 0.05, 0], 'y', 10);
    k.cyl('dark', 0.5, 0.5, 0.18, [0, 1.35, 0], 'y', 10);
    bar(k, 'hull', new Vector3(0, 1.4, 0), new Vector3(0, 2.9, 0), 0.07);
    k.box('lens', [0.16, 0.16, 0.16], [0, 3.0, 0]);
    for (const s of [-1, 1]) {
      bar(k, 'hull', new Vector3(s * 0.7, -0.4, 0), new Vector3(s * 1.3, -0.4, 0), 0.08);
      k.box('dark', [1.5, 0.05, 0.9], [s * 2.0, -0.4, 0]);
      k.box('hull', [1.4, 0.02, 0.82], [s * 2.0, -0.37, 0]);
    }
    k.cyl('hull', 0.012, 0.012, 3, [0, -3.4, 0], 'y', 4);
    k.box('dark', [0.3, 0.3, 0.3], [0, -5, 0]);
    k.bakeOcclusion(0.12);
    buoy = k.build(mats);
  }
  return buoy.clone();
}
