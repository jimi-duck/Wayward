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
