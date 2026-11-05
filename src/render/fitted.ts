import { Kit, type V3 } from './kit';
import { block } from './parts';

// ── what is bolted on ─────────────────────────────────────────────────────
// The Wayward grows as she is fitted (content/upgrades.ts): a launcher rail
// for the torpedo bay, a lens pod for each laser emitter, a plate for each
// step of armour. Each upgrade level is one small part here, in the hull's
// own materials, so the new work looks bolted on in primer and clean metal,
// never painted over. Model space, +X toward the bow, +Z starboard.
//
// Only what is fitted is built, merged into a single group (a few draw
// calls however much she carries), and rebuilt when a fit lands.

type Part = (k: Kit) => void;
const sides = (f: (sd: number) => void) => { f(-1); f(1); };

const HY = 0.1;
const FLANK = 0.5;

/** A bolted rail along the flank: tube, muzzle ring, cradle. */
function tube(k: Kit, sd: number, x0: number, x1: number, y: number, r = 0.065): void {
  const len = x1 - x0, mid = (x0 + x1) / 2;
  k.cyl('pipe', r, r, len, [mid, y, sd * FLANK], 'x', 10);
  k.cyl('dark', r * 1.35, r * 1.35, 0.08, [x1 - 0.02, y, sd * FLANK], 'x', 10);
  k.cyl('rubber', r * 0.8, r * 0.8, 0.02, [x1 + 0.025, y, sd * FLANK], 'x', 10);
  for (const x of [x0 + 0.1, mid, x1 - 0.14]) block(k, 'dark', [0.07, r * 2.7, 0.1], [x, y - 0.015, sd * (FLANK - 0.05)], [0, 0, 0], 0.012);
}

/** A round on a rail: a spare warhead riding above the tube. */
function round(k: Kit, sd: number, x0: number, x1: number, y: number): void {
  k.cyl('hull', 0.04, 0.04, x1 - x0, [(x0 + x1) / 2, y, sd * (FLANK + 0.02)], 'x', 8);
  k.cyl('orange', 0.036, 0.04, 0.03, [x1 + 0.01, y, sd * (FLANK + 0.02)], 'x', 8);
}

/** A plate of primer bolted over the hull, with a bolt at each corner. */
function plate(k: Kit, size: V3, pos: V3, rot: V3 = [0, 0, 0]): void {
  block(k, 'primer', size, pos, rot, 0.02);
  const [sx, sy, sz] = size;
  const long = sx >= sz ? 0 : 2;
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const off: V3 = long === 0 ? [a * (sx / 2 - 0.035), b * (sy / 2 - 0.035), 0] : [0, b * (sy / 2 - 0.035), a * (sz / 2 - 0.035)];
    const sd = Math.sign(pos[2]) || 1;
    k.box('hull', [0.02, 0.02, 0.02], [pos[0] + off[0], pos[1] + off[1], pos[2] + off[2] + (long === 0 ? sd * (sz / 2 + 0.006) : 0)]);
  }
}

/** The upgrade table: id → one part per level (index 0 is level 1). */
export const FITTED: Record<string, Part[]> = {
  // torpedo bay: twin launch rails on the flanks; the magazine hangs spare rounds above them; the specs add to the rig
  tp_bay: [(k) => sides((sd) => tube(k, sd, 0.2, 1.45, HY - 0.1))],
  tp_magazine: [
    (k) => sides((sd) => round(k, sd, 0.4, 1.2, HY + 0.04)),
    (k) => sides((sd) => round(k, sd, 0.4, 1.2, HY - 0.2)),
    (k) => sides((sd) => { block(k, 'dark', [0.34, 0.2, 0.12], [-0.05, HY - 0.06, sd * (FLANK + 0.03)], [0, 0, 0], 0.025); k.cyl('hull', 0.075, 0.075, 0.3, [-0.05, HY - 0.06, sd * (FLANK + 0.1)], 'x', 10); }),
  ],
  tp_swarm: [(k) => sides((sd) => {
    block(k, 'dark', [0.46, 0.14, 0.24], [0.62, 0.58, sd * 0.3], [0, 0, 0], 0.02);
    for (const z of [-0.06, 0.06]) for (const dz of [0, 1]) k.cyl('rubber', 0.032, 0.032, 0.5, [0.64, 0.67 + dz * 0.0, sd * 0.3 + z], 'x', 8);
  })],
  tp_heavy: [(k) => {
    block(k, 'dark', [0.9, 0.08, 0.3], [1.1, -0.45, 0], [0, 0, 0], 0.02);
    k.cyl('pipe', 0.11, 0.11, 1.3, [1.2, -0.52, 0], 'x', 12);
    k.cyl('dark', 0.15, 0.15, 0.08, [1.85, -0.52, 0], 'x', 12);
    k.cyl('rubber', 0.1, 0.1, 0.02, [1.9, -0.52, 0], 'x', 12);
  }],
  // lasers: a lens pod on the prow flank for each emitter, then on the shoulders
  ph_emitters: [1.78, 1.5, 1.22].map((x, i) => (k: Kit) => sides((sd) => {
    block(k, 'dark', [0.2, 0.11, 0.1], [x, HY + 0.13, sd * (0.36 + i * 0.045)], [0, sd * -0.12, 0], 0.02);
    k.cyl('pipe', 0.028, 0.034, 0.12, [x + 0.14, HY + 0.13, sd * (0.36 + i * 0.045)], 'x', 8);
    k.cyl('blue', 0.02, 0.02, 0.012, [x + 0.205, HY + 0.13, sd * (0.36 + i * 0.045)], 'x', 8);
  })).concat([0.1, -0.2].map((x) => (k: Kit) => sides((sd) => {
    block(k, 'dark', [0.22, 0.1, 0.1], [x, HY + 0.4, sd * 0.2], [0, 0, 0], 0.02);
    k.cyl('pipe', 0.028, 0.034, 0.12, [x + 0.15, HY + 0.4, sd * 0.2], 'x', 8);
    k.cyl('blue', 0.02, 0.02, 0.012, [x + 0.215, HY + 0.4, sd * 0.2], 'x', 8);
  }))),
  ph_cone: [(k) => {
    k.cyl('pipe', 0.15, 0.06, 0.26, [3.12, HY + 0.02, 0], 'x', 12, true);
    k.cyl('dark', 0.16, 0.16, 0.03, [3.25, HY + 0.02, 0], 'x', 12);
  }],
  ph_lance: [(k) => sides((sd) => {
    k.cyl('pipe', 0.022, 0.022, 0.7, [3.25, HY + 0.02, sd * 0.1], 'x', 8);
    k.cyl('dark', 0.04, 0.04, 0.06, [3.58, HY + 0.02, sd * 0.1], 'x', 8);
  })],
  // armour: primer plates over the flanks and belly; bulkheads ribbed along the shoulders
  df_armour: [
    (k) => sides((sd) => plate(k, [0.7, 0.3, 0.05], [-1.0, HY, sd * 0.49])),
    (k) => sides((sd) => plate(k, [0.7, 0.26, 0.05], [-1.75, HY - 0.02, sd * 0.49])),
  ],
  df_bulkheads: [
    (k) => sides((sd) => { for (const x of [-0.15, 0.1, 0.35]) block(k, 'hull', [0.05, 0.5, 0.08], [x, HY + 0.02, sd * 0.5], [0, 0, 0], 0.012); }),
    (k) => { for (const x of [-1.7, -1.2, -0.7, -0.2]) block(k, 'primer', [0.4, 0.04, 0.5], [x, -0.52, 0], [0, 0, 0], 0.015); },
  ],
  df_fortress: [(k) => { block(k, 'primer', [1.0, 0.05, 0.4], [2.15, HY - 0.24, 0], [0, 0, 0.06], 0.02); block(k, 'dark', [0.5, 0.2, 0.06], [2.3, HY - 0.18, 0], [0, 0, 0.06], 0.02); }],
  df_shield: [(k) => sides((sd) => {
    k.cyl('dark', 0.09, 0.11, 0.1, [1.05, 0.5, sd * 0.3], 'y', 10);
    k.cyl('blue', 0.06, 0.06, 0.02, [1.05, 0.565, sd * 0.3], 'y', 10);
  })],
  // mines: a rack astern under the keel, and a mine in it per rack
  mn_layer: [(k) => { block(k, 'dark', [0.5, 0.1, 0.36], [-2.15, -0.5, 0], [0, 0, 0], 0.02); k.cyl('hull', 0.045, 0.045, 0.3, [-2.15, -0.43, 0], 'z', 8); }],
  mn_racks: [-1.9, -2.15, -2.4].map((x) => (k: Kit) => sides((sd) => {
    k.cyl('dark', 0.075, 0.075, 0.07, [x, -0.6, sd * 0.1], 'y', 10);
    k.cyl('orange', 0.03, 0.03, 0.075, [x, -0.6, sd * 0.1], 'y', 6);
  })),
  pl_vent: [(k) => { block(k, 'dark', [0.34, 0.1, 0.3], [-2.35, 0.56, 0], [0, 0, 0], 0.02); for (const z of [-0.09, 0, 0.09]) k.box('orange', [0.2, 0.012, 0.03], [-2.33, 0.62, z]); }],
  // arc and tractor
  cl_arc: [(k) => sides((sd) => { k.cyl('pipe', 0.012, 0.03, 0.5, [0.25, -0.04, sd * 1.12], 'x', 6); k.cyl('blue', 0.016, 0.016, 0.03, [0.52, -0.04, sd * 1.12], 'x', 6); })],
  ut_tractor: [
    (k) => { k.cyl('dark', 0.12, 0.16, 0.08, [1.7, -0.33, 0], 'y', 12); k.cyl('rubber', 0.1, 0.1, 0.01, [1.7, -0.375, 0], 'y', 12); },
    (k) => k.ring('hull', 0.2, 0.012, [1.7, -0.38, 0], 'y', 16),
    (k) => { k.ring('hull', 0.27, 0.012, [1.7, -0.38, 0], 'y', 20); k.cyl('blue', 0.03, 0.03, 0.012, [1.7, -0.385, 0], 'y', 8); },
  ],
  // thrusters: a manoeuvring block each at the bow, stern and shoulder
  mo_thrusters: [2.1, -2.2, 0.75].map((x) => (k: Kit) => sides((sd) => {
    block(k, 'dark', [0.16, 0.1, 0.07], [x, HY + 0.02, sd * (x > 2 ? 0.34 : 0.5)], [0, 0, 0], 0.015);
    k.cyl('rubber', 0.03, 0.04, 0.05, [x, HY + 0.02, sd * (x > 2 ? 0.4 : 0.56)], 'z', 8);
  })),
};

/** How many levels of each fitting show. */
export function shown(levels: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of Object.keys(FITTED)) {
    const n = Math.min(levels[id] ?? 0, FITTED[id]!.length);
    if (n > 0) out[id] = n;
  }
  return out;
}

/** A stable key for what is shown: the hull rebuilds only when this changes. */
export const fitKey = (s: Record<string, number>): string => Object.keys(s).sort().map((id) => `${id}${s[id]}`).join(',');

export function buildFits(s: Record<string, number>): Kit {
  const k = new Kit();
  for (const id of Object.keys(s)) for (let i = 0; i < s[id]!; i++) FITTED[id]![i]!(k);
  return k;
}
