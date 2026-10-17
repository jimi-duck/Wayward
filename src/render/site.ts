import { Color, Group, type Mesh, type MeshBasicMaterial, type Scene } from 'three';
import type { Prop } from '../content/situations';
import type { World } from '../sim/world';
import { cable, flatRing, materials, stripes, strut, truss } from './breakout';
import { Kit, seeded, type V3 } from './kit';

// ── the sites ─────────────────────────────────────────────────────────────
// What stands where a situation is (content/situations.ts `prop`): a settlement
// of lit drums, a survey relay, a wreck with its ribs showing, a beacon, a
// checkpoint gantry, a cradle, a line of dark Thren crystal, a Voice foundry,
// a seam of veined rock, a single strange object. Built from the same
// structure helpers as the gate and the port, so they sit in the same world.
// One site at a time: the group is rebuilt only when the stage changes.

const AMBER = new Color(3.6, 2, 0.45);

/** Built once a stage, so the occlusion bake (the dark in every seam and under every plate) costs a stage change nothing felt. */
function fin(k: Kit): Group {
  return k.build(materials(), 0.4);
}

/** A row of small lit windows along a line: a lamp every `step`, some dark so the row reads as lived in. */
function windows(k: Kit, rnd: () => number, from: V3, to: V3, n: number, size = 0.28): void {
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.3) continue;
    const t = n > 1 ? i / (n - 1) : 0.5;
    k.box('lamp', [size * 1.4, size, size * 0.4], [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]);
  }
}

function settlement(): Group {
  const k = new Kit(), rnd = seeded(41);
  k.cyl('hull', 2.6, 3, 2.4, [0, 0, 0], 'y', 16);
  k.cyl('paint', 1.6, 2, 1.1, [0, 1.8, 0], 'y', 12);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, r = 7 + rnd() * 3;
    k.cyl('hull', 1.3, 1.5, 3 + rnd() * 2, [Math.cos(a) * r, 0, Math.sin(a) * r], 'z', 10);
    k.box('lamp', [0.7, 0.14, 0.05], [Math.cos(a) * r, 0.5, Math.sin(a) * r + 1.6]);
    strut(k, 'dark', [Math.cos(a) * 3, 0, Math.sin(a) * 3], [Math.cos(a) * (r - 1.3), 0, Math.sin(a) * (r - 1.3)], 0.2, 5);
    if (i % 2) cable(k, [Math.cos(a) * r, 1.5, Math.sin(a) * r], [Math.cos(a + 0.9) * (r + 1), 1.5, Math.sin(a + 0.9) * (r + 1)], 0.9, 0.06);
  }
  truss(k, [-4, 3.4, -4], [4, 3.4, 4], 0.8, 6, 2);
  strut(k, 'dark', [0, 2.3, 0], [1.4, 6.4, -1.2], 0.1, 4);
  k.box('lamp', [0.3, 0.3, 0.3], [1.4, 6.6, -1.2]);
  k.greebles('dark', rnd, -3, 3, -3, 3, 2.4, 8, 0.6);
  // each drum a lit deck of windows, a docking collar at its end, and a radiator fin
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, r = 7.8, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    windows(k, rnd, [cx - 1.4, 0.95, cz + 1.28], [cx + 1.4, 0.95, cz + 1.28], 5);
    windows(k, rnd, [cx - 1.4, -0.4, cz + 1.4], [cx + 1.4, -0.4, cz + 1.4], 5);
    k.ring('hull', 1.4, 0.16, [cx, 0, cz], 'z', 10);
    k.box('paint', [2.6, 0.12, 0.9], [cx, 1.65, cz]);
  }
  windows(k, rnd, [-1.8, 0.6, 3.04], [1.8, 0.6, 3.04], 6);
  for (const [x, z, h] of [[-3.4, 2.2, 3.8], [3, -2.8, 5.2], [0.4, 3.6, 4.4]] as const) { strut(k, 'dark', [x, 2.4, z], [x, 2.4 + h, z], 0.07, 4); k.box('lamp', [0.18, 0.18, 0.18], [x, 2.6 + h, z]); k.ring('dark', 0.7, 0.04, [x, 2.4 + h * 0.8, z], 'y', 10); }
  return fin(k);
}

function relay(): Group {
  const k = new Kit(), rnd = seeded(43);
  k.cyl('dark', 1.6, 2.2, 1.2, [0, -0.6, 0], 'y', 10);
  k.box('hull', [0.8, 12, 0.8], [0, 5.5, 0]);
  truss(k, [-3, 6, 0], [3, 6, 0], 0.7, 6, 2);
  k.cyl('paint', 3, 0.3, 0.7, [0, 12, 0], 'y', 16);
  strut(k, 'dark', [0, 11.6, 0], [0, 14.5, 0], 0.08, 4);
  k.box('lamp', [0.4, 0.4, 0.4], [0, 14.7, 0]);
  for (let i = 0; i < 3; i++) k.box('lamp', [0.25, 0.25, 0.25], [Math.cos(i * 2.1) * 1.4, 0.2, Math.sin(i * 2.1) * 1.4]);
  k.greebles('dark', rnd, -2, 2, -2, 2, 0, 6, 0.6);
  return fin(k);
}

function wreck(): Group {
  const k = new Kit(), rnd = seeded(47);
  // a ship broken in two: the fore half whole to the break, ribs and stringers standing out of the tear, the stern drifting off
  k.loft('hull', [[0, 2.7, 1.7, 1.5, 0.45], [3.5, 3, 1.9, 1.6, 0.4], [8, 2.5, 1.6, 1.3, 0.5], [12.5, 1.5, 1.1, 0.9, 0.6], [15.5, 0.5, 0.6, 0.5, 0.7]], [0, 0, 0]);
  k.box('paint', [4.6, 0.22, 3.6], [4.4, 1.98, 0], [0, 0, 0]);
  k.box('dark', [3, 1.5, 2.4], [6.4, 2.6, 0]);
  k.box('paint', [1.8, 0.8, 2.6], [6.4, 3.5, 0], [0, 0, 0]);
  strut(k, 'dark', [6.4, 3.9, 0], [6.4, 6.6, 0], 0.06, 4);
  windows(k, rnd, [5.4, 3.0, 1.21], [7.6, 3.0, 1.21], 4, 0.22);
  windows(k, rnd, [5.4, 3.0, -1.21], [7.6, 3.0, -1.21], 4, 0.22);
  for (const z of [-1, 1]) for (let i = 0; i < 5; i++) k.box('dark', [0.7, 0.06, 0.05], [2 + i * 2.2, 1.7, z * 2.88], [0, 0, 0]);
  // deck plating, a hatch, a cargo stack left on the plates
  for (let i = 0; i < 4; i++) k.box('paint', [1.8, 0.1, 2.6], [1.2 + i * 2.1, 1.84 - i * 0.04, 0], [0, 0, 0]);
  k.box('amber', [0.18, 1.2, 0.18], [3.6, 2.4, 1.6]);
  for (let i = 0; i < 3; i++) k.box(i % 2 ? 'paint' : 'slate', [1.4, 0.9, 1], [8.4 + (i % 2) * 0.1, 2.3 + (i > 1 ? 0.9 : 0), -1 + (i % 2) * 1.4]);
  // the tear: frames, bent, and the stringers running out of them
  for (let i = 0; i < 6; i++) {
    const h = 1.9 - i * 0.18, z = (i - 2.5) * 0.9;
    k.box('dark', [0.14, h * 1.5, 0.14], [-0.2, 0.1, z], [(rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.4]);
  }
  for (let i = 0; i < 4; i++) {
    const y = i % 2 ? 1.5 : -1.3, z = i < 2 ? 2.4 : -2.4;
    strut(k, 'hull', [0.2, y, z], [-2.4 - rnd() * 2.2, y + (rnd() - 0.5) * 1.6, z * 1.1], 0.09, 5);
  }
  k.box('paint', [3.2, 0.18, 2.4], [-1.8, 2.2, 1.2], [0.5, 0.4, 0.5]);
  k.box('hull', [2.4, 0.16, 1.8], [-1.2, -2.2, -1.1], [-0.4, 0.3, -0.5]);
  cable(k, [0, 1.2, 1.4], [-5, -1.5, 3.2], 1.2, 0.05);
  // the stern, adrift: a drum with its bell, tilted off the line
  const stern = new Kit();
  stern.cyl('hull', 1.9, 2.3, 5.5, [0, 0, 0], 'x', 12);
  stern.cyl('dark', 2.1, 1.3, 1.8, [-3.4, 0, 0], 'x', 12, true);
  stern.ring('paint', 2.3, 0.14, [-1.2, 0, 0], 'x', 14);
  stern.ring('paint', 2.3, 0.14, [1.6, 0, 0], 'x', 14);
  for (let i = 0; i < 5; i++) stern.box('dark', [0.14, 0.14, 4.8], [2.6, Math.sin((i / 5) * 6.28) * 1.8, Math.cos((i / 5) * 6.28) * 1.8], [(i / 5) * 6.28, 0, 0]);
  const tail = stern.build(materials());
  tail.position.set(-13, 1.6, -3.2);
  tail.rotation.set(0.3, 0.5, -0.2);
  const hull = fin(k);
  hull.add(tail);
  return hull;
}

function beacon(): Group {
  const k = new Kit();
  k.cyl('dark', 0.9, 1.2, 0.8, [0, -0.4, 0], 'y', 8);
  k.box('dark', [0.4, 7, 0.4], [0, 3.2, 0]);
  k.box('amber', [0.14, 5, 0.14], [0.3, 3, 0]);
  k.box('lamp', [0.8, 0.8, 0.8], [0, 7.2, 0]);
  return fin(k);
}

function checkpoint(): Group {
  const k = new Kit(), rnd = seeded(53);
  for (const s of [-1, 1]) {
    k.box('dark', [2.2, 1, 2.2], [s * 12, -0.8, 0]);
    k.box('hull', [1.2, 8, 1.2], [s * 12, 3.4, 0]);
    k.box('paint', [1.8, 0.6, 1.8], [s * 12, 6.6, 0]);
    k.box('lamp', [0.5, 0.5, 0.5], [s * 12, 7.6, 0]);
    stripes(k, s * 12, -0.28, 0, 'z', 3.2, 0.5, 6);
  }
  truss(k, [-12, 7.2, 0], [12, 7.2, 0], 1.0, 12, 3);
  k.box('amber', [22, 0.12, 0.12], [0, 6.3, 0.3]);
  cable(k, [-12, 5, 0], [12, 5, 0], 1.6, 0.06);
  k.box('dark', [4, 2.4, 3], [0, 0.4, 5]);
  k.box('lamp', [2.8, 0.18, 0.06], [0, 1.2, 6.55]);
  k.greebles('dark', rnd, -2, 2, 3.5, 6.5, 1.6, 6, 0.6);
  return fin(k);
}

function yard(): Group {
  const k = new Kit(), rnd = seeded(59);
  // a cradle: two gantries over a dark long hull on blocks, a crane across
  for (const z of [-5, 5]) {
    for (const x of [-9, 0, 9]) k.box('hull', [0.8, 7, 0.8], [x, 3, z]);
    truss(k, [-9, 6.6, z], [9, 6.6, z], 0.9, 9, 3);
  }
  k.loft('dark', [[-9, 2.2, 1.3, 1, 0.5], [-4, 2.7, 1.5, 1.2, 0.4], [4, 2.4, 1.4, 1.1, 0.45], [9, 1.2, 0.9, 0.7, 0.6]], [0, 1.2, 0]);
  for (const x of [-6.2, -2.4, 1.4, 5.2]) k.box('paint', [1.8, 0.1, 4.4], [x, 2.7, 0]);
  k.box('paint', [5, 0.5, 5.7], [-4, 3.3, 0]);
  windows(k, rnd, [-6, 1.5, 2.8], [6, 1.5, 2.8], 8);
  windows(k, rnd, [-6, 1.5, -2.8], [6, 1.5, -2.8], 8);
  for (const x of [-8, -3, 3, 8]) k.box('hull', [1, 1.2, 3.4], [x, -0.6, 0]);
  strut(k, 'paint', [-9, 8.4, 0], [9, 8.4, 0], 0.22, 5);
  strut(k, 'dark', [2, 8.4, 0], [2, 3.6, 0], 0.04, 3);
  k.box('dark', [1.2, 0.6, 1.2], [2, 3.4, 0]);
  k.box('lamp', [0.4, 0.4, 0.4], [0, 8.8, 0]);
  k.greebles('dark', rnd, -8, 8, -2, 2, 2.3, 8, 0.6);
  return fin(k);
}

function lane(): Group {
  const k = new Kit(), rnd = seeded(61);
  // a straight line of dark crystal spires, each with an amber edge: nobody drew it
  for (let i = -6; i <= 6; i++) {
    const h = 3 + rnd() * 2.5;
    k.shard('dark', [[0.01, 0], [0.9, 0.4], [0.5, h * 0.7], [0.02, h]], [i * 5, -0.4, 0]);
    k.box('amber', [0.1, h * 0.7, 0.1], [i * 5 + 0.45, h * 0.35 - 0.2, 0.2], [0, 0, 0.08]);
  }
  return fin(k);
}

function foundry(): Group {
  const k = new Kit(), rnd = seeded(67);
  k.box('dark', [16, 3.4, 8], [0, 0, 0]);
  k.box('hull', [12, 1.4, 6], [0, 2.4, 0]);
  for (const x of [-5, 0, 5]) { k.cyl('hull', 1.3, 1.5, 4.6, [x, 5, 0], 'y', 12); k.box('amber', [1.7, 0.18, 0.18], [x, 7, 0.3]); }
  k.box('amber', [14, 0.12, 0.12], [0, 1.2, 4.05]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    strut(k, 'dark', [Math.cos(a) * 6, 1, Math.sin(a) * 3], [Math.cos(a) * 12, 3.4, Math.sin(a) * 7], 0.2, 5);
    k.box('hull', [2.6, 0.5, 1], [Math.cos(a) * 12, 3.4, Math.sin(a) * 7], [0, -a, 0]);
  }
  k.greebles('dark', rnd, -7, 7, -3, 3, 3.1, 12, 0.6);
  windows(k, rnd, [-7, 0.6, 4.05], [7, 0.6, 4.05], 9, 0.34);
  windows(k, rnd, [-5, 2.5, 3.05], [5, 2.5, 3.05], 7, 0.3);
  return fin(k);
}

function seam(): Group {
  const k = new Kit(), rnd = seeded(71);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 1 + rnd() * 9, h = 1.5 + rnd() * 4;
    k.shard('dark', [[0.01, 0], [0.9 + rnd(), 0.3], [0.4, h * 0.7], [0.02, h]], [Math.cos(a) * r, -0.5, Math.sin(a) * r], [(rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4]);
    if (i % 3 === 0) k.box('amber', [0.1, h * 0.6, 0.1], [Math.cos(a) * r + 0.3, h * 0.3 - 0.4, Math.sin(a) * r], [0, 0, 0.1]);
  }
  return fin(k);
}

function object(): Group {
  const k = new Kit();
  k.shard('dark', [[0.01, -2.4], [1, -0.6], [1.2, 0.6], [0.01, 2.8]], [0, 0.4, 0], [0.2, 0, 0.3]);
  k.box('amber', [0.12, 3.2, 0.12], [0.8, 0.5, 0.2], [0.2, 0, 0.3]);
  return fin(k);
}

function hole(): Group {
  const k = new Kit(), rnd = seeded(73);
  // a dark core with a lit rim, the lane it bends drawn as thin broken rings
  k.cyl('dark', 7, 7, 0.6, [0, 0, 0], 'y', 28);
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2, r = 10.6 + rnd() * 0.8;
    k.box('amber', [1.5 + rnd() * 0.8, 0.1, 0.16], [Math.cos(a) * r, 0, Math.sin(a) * r], [0, -a + Math.PI / 2, 0]);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2, r = 17 + rnd() * 5;
    k.box('dark', [1.6 + rnd() * 2, 0.1, 0.16], [Math.cos(a) * r, 0.1, Math.sin(a) * r], [0, -a + Math.PI / 2, 0]);
  }
  return fin(k);
}

function rig(): Group {
  const k = new Kit(), rnd = seeded(79);
  // a drilling platform on four legs: a derrick, a flare stack, lit decks
  k.box('dark', [14, 1.2, 14], [0, 0, 0]);
  for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]] as const) { k.box('hull', [0.9, 7, 0.9], [x, -2.4, z]); k.box('lamp', [0.3, 0.3, 0.3], [x, 1.2, z]); }
  truss(k, [-6, 7, -6], [6, 7, 6], 0.9, 8, 2);
  k.box('hull', [1.4, 14, 1.4], [0, 7, 0]);
  strut(k, 'dark', [-3, 1, -3], [0, 13, 0], 0.18, 4);
  strut(k, 'dark', [3, 1, 3], [0, 13, 0], 0.18, 4);
  k.box('amber', [0.3, 4, 0.3], [5, 3.6, -5]);
  k.box('lamp', [0.7, 0.7, 0.7], [0, 14.4, 0]);
  k.box('paint', [4, 1.6, 3], [-3, 1.4, 3]);
  k.greebles('dark', rnd, -6, 6, -6, 6, 0.7, 10, 0.7);
  windows(k, rnd, [-6.5, -0.1, 7.05], [6.5, -0.1, 7.05], 9, 0.34);
  windows(k, rnd, [-3.5, 2.1, 4.55], [-2.5, 2.1, 4.55], 3, 0.3);
  return fin(k);
}

/** One prop's model, for the bench. */
export const BUILD: Record<Prop, () => Group> = { settlement, relay, wreck, beacon, checkpoint, yard, lane, foundry, seam, object, hole, rig };
const TEAL = new Color(0.5, 2.4, 2.6);

export class SiteView {
  private readonly root = new Group();
  private ring: Mesh;
  private key = '';
  private time = 0;
  private body: Group | null = null;
  private pinKey = '';
  private pinMeshes: Mesh[] = [];
  private readonly pinRoot = new Group();

  constructor(scene: Scene) {
    this.ring = flatRing(30, 0.3, AMBER, 0.5);
    this.ring.position.y = -0.8;
    this.root.add(this.ring);
    this.root.visible = false;
    scene.add(this.root);
    scene.add(this.pinRoot);
  }

  /** The mission's beacons, drops and survey rings: flat teal rings on the plane, the one to go to bright. */
  private pins(world: World, dt: number): void {
    const st = world.stage, list = st && st.taken && !st.result ? st.pins as Array<{ x: number; z: number; on: boolean; r?: number }> : [];
    const kind = st?.def.goal.kind;
    const rad = (p: { r?: number }): number => p.r ?? (kind === 'sneak' ? 28 : 26);
    const key = list.map((p) => rad(p)).join(',');
    if (key !== this.pinKey) {
      this.pinKey = key;
      for (const m of this.pinMeshes) { this.pinRoot.remove(m); m.geometry.dispose(); }
      this.pinMeshes = list.map((p) => { const m = flatRing(rad(p), Math.max(0.6, rad(p) * 0.014), TEAL, 0.5); m.position.y = -0.8; this.pinRoot.add(m); return m; });
    }
    this.time += list.length ? dt : 0;
    list.forEach((p, i) => {
      const m = this.pinMeshes[i]!;
      m.position.x = p.x; m.position.z = p.z;
      // beacons and drops show only the one to go to; survey rings all show
      m.visible = kind === 'survey' || p.on;
      (m.material as MeshBasicMaterial).opacity = kind === 'survey' ? 0.22 + 0.1 * Math.sin(this.time * 2 + i) : 0.45 + 0.2 * Math.sin(this.time * 4);
    });
  }

  update(world: World, dt: number): void {
    const st = world.stage;
    const prop = st?.def.prop;
    this.pins(world, dt);
    if (!st || !prop) { this.root.visible = false; this.key = ''; return; }
    this.time += dt;
    if (this.key !== `${world.sortie.system}:${st.def.id}`) {
      this.key = `${world.sortie.system}:${st.def.id}`;
      if (this.body) { this.root.remove(this.body); this.body = null; }
      this.body = BUILD[prop]();
      this.body.rotation.y = ((world.sortie.system.length * 0.7) % 3) - 1.5;
      // a disc seen edge-on is a line: the hole leans to show its face
      if (prop === 'hole') this.body.rotation.x = 0.55;
      this.root.add(this.body);
    }
    this.root.visible = true;
    this.root.position.set(st.x, -1.5, st.z);
    // the hold circle shows only while the goal is on
    const on = st.taken && !st.result && st.def.goal.kind !== 'follow' && !st.run;
    this.ring.visible = on;
    if (on) (this.ring.material as MeshBasicMaterial).opacity = 0.3 + 0.2 * Math.sin(this.time * 3) + st.held * 0.3;
    if (prop === 'object' && this.body) this.body.rotation.y += dt * 0.25;
    if (prop === 'hole' && this.body) this.body.rotation.y += dt * 0.12;
  }
}
