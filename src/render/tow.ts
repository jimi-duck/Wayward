import { AdditiveBlending, CircleGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3, type Material, type Scene } from 'three';
import type { World } from '../sim/world';
import { materials, stripes, windowMaterial, windowRow } from './breakout';
import type { Effects } from './fx';
import { Kit, metal, seeded } from './kit';

// ── Lane Control's tugs ───────────────────────────────────────────────────
// The two Kellern recovery tugs of the first system past Cerro (sim/tow.ts): stubby, heavy work hulls in the company's grey, a cab
// with lit windows, a hazard band across the bow, two drive pods slung either side, and a winch on the stern for the line. The lead
// tows her on a dull gold line (caution, brand v1.1), which brightens as she pulls against it and snaps at Sam's code.
// Local space: +x is the bow (the sim's heading 0), y up, the ship's plane at y = 0.

const DRIVE = new Color(0.55, 1.05, 1.7);
const LINE = new Color(1.35, 0.95, 0.32);
const BEACON = new Color(3.2, 1.6, 0.35);

let tugMats: Record<string, Material> | null = null;
function mats(): Record<string, Material> {
  if (tugMats) return tugMats;
  const m = materials();
  tugMats = {
    ...m,
    // Kellern grey, the colour of the hull she flew in on before the paint
    kellern: metal({ tint: 0x8a8f96, roughness: 0.64, metalness: 0.45, worn: 0.35 }),
    win: windowMaterial(),
  };
  return tugMats;
}

/** One tug, built once and cloned: about twice her length, all work and no line. */
function buildTug(): Group {
  const k = new Kit(), rnd = seeded(41);
  // the hull: a deep block with a chamfered bow and a lower keel
  k.box('kellern', [3.6, 1.1, 1.9], [0, 0, 0]);
  k.wedge('kellern', [[1.78, -0.95], [2.5, -0.55], [2.5, 0.55], [1.78, 0.95]], 1.1, [0, 0, 0]);
  k.box('dark', [3.4, 0.35, 1.5], [-0.1, -0.68, 0]);
  // the pusher plate across the bow, hazard-banded
  k.box('dark', [0.22, 0.9, 1.5], [2.58, -0.05, 0]);
  for (let i = 0; i < 6; i++) k.box(i % 2 ? 'dark' : 'paint', [0.04, 0.84, 0.22], [2.7, -0.05, -0.6 + i * 0.24]);
  stripes(k, 1.55, 0.56, 0, 'z', 1.8, 0.32, 8);
  // the cab, set back, with its window band facing forward and down the flanks
  k.box('slate', [1.4, 0.7, 1.3], [0.35, 0.9, 0]);
  k.box('dark', [1.5, 0.08, 1.4], [0.35, 1.28, 0]);
  windowRow(k, rnd, [1.06, 0.95, -0.5], [1.06, 0.95, 0.5], 5, [0.04, 0.16, 0.14], [0, 0, 0], 0.1);
  windowRow(k, rnd, [-0.15, 0.95, 0.66], [0.85, 0.95, 0.66], 4, [0.14, 0.14, 0.04], [0, 0, 0], 0.3);
  windowRow(k, rnd, [-0.15, 0.95, -0.66], [0.85, 0.95, -0.66], 4, [0.14, 0.14, 0.04], [0, 0, 0], 0.3);
  // mast and aerials on the cab roof
  k.cyl('dark', 0.035, 0.05, 0.9, [0.1, 1.75, 0.35]);
  k.cyl('dark', 0.025, 0.03, 0.6, [0.5, 1.6, -0.4]);
  // the drive pods, slung either side on pylons, their bells astern
  for (const sd of [-1, 1]) {
    k.box('dark', [1.2, 0.28, 0.5], [-0.5, -0.1, sd * 1.15]);
    k.cyl('kellern', 0.52, 0.52, 2.8, [-0.5, -0.1, sd * 1.6], 'x', 16);
    k.ring('dark', 0.53, 0.05, [0.6, -0.1, sd * 1.6], 'x', 16);
    k.ring('dark', 0.53, 0.05, [-1.2, -0.1, sd * 1.6], 'x', 16);
    k.cyl('dark', 0.38, 0.5, 0.45, [-2.1, -0.1, sd * 1.6], 'x', 14, true);
    k.cyl('paint', 0.18, 0.18, 0.3, [0.95, -0.1, sd * 1.6], 'x', 10);
  }
  // the stern: the winch drum and its hook frame, where the line pays out
  k.cyl('dark', 0.32, 0.32, 1.1, [-1.95, 0.25, 0], 'z', 14);
  k.box('paint', [0.26, 0.5, 0.26], [-2.15, 0.25, 0]);
  k.box('dark', [0.5, 0.12, 0.9], [-1.95, 0.65, 0]);
  k.greebles('dark', rnd, -1.6, 1.2, -0.75, 0.75, 0.56, 12, 0.12);
  // running lamps, port and starboard, and the stern light
  k.box('lamp', [0.08, 0.08, 0.08], [1.9, 0.3, -0.92]);
  k.box('lamp', [0.08, 0.08, 0.08], [1.9, 0.3, 0.92]);
  k.box('lamp', [0.08, 0.08, 0.08], [-1.85, 0.55, 0]);
  const g = k.build(mats(), 0.5);
  return g;
}

const glow = (c: Color, opacity: number): MeshBasicMaterial => new MeshBasicMaterial({ color: c.clone(), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
const UP = new Vector3(0, 1, 0), A = new Vector3(), B = new Vector3(), Q = new Quaternion();

interface TugView { root: Group; bells: Mesh[]; beacon: Mesh }

export class TowView {
  private readonly root = new Group();
  private readonly tugs: TugView[] = [];
  private readonly line: Mesh;
  private readonly lineCore: Mesh;
  private readonly lineMat = glow(LINE, 0.6);
  private readonly coreMat = glow(LINE, 0.9);
  private time = 0;
  private built = false;

  constructor(private readonly scene: Scene) {
    this.root.visible = false;
    // the line: a soft outer glow round a bright core, both unit cylinders stretched between the winch and her bow each frame
    this.line = new Mesh(new CylinderGeometry(0.11, 0.11, 1, 8, 1, true), this.lineMat);
    this.lineCore = new Mesh(new CylinderGeometry(0.035, 0.035, 1, 6, 1, true), this.coreMat);
    for (const m of [this.line, this.lineCore]) { m.frustumCulled = false; m.visible = false; this.root.add(m); }
    scene.add(this.root);
  }

  private build(): void {
    this.built = true;
    const proto = buildTug();
    const bellGeo = new CircleGeometry(0.4, 16);
    for (let i = 0; i < 2; i++) {
      const root = i ? proto.clone() : proto;
      const bells: Mesh[] = [];
      for (const sd of [-1, 1]) {
        const b = new Mesh(bellGeo, glow(DRIVE, 0.5));
        b.position.set(-2.34, -0.1, sd * 1.6);
        b.rotation.y = -Math.PI / 2;
        root.add(b);
        bells.push(b);
      }
      const beacon = new Mesh(new CylinderGeometry(0.07, 0.07, 0.1, 8), glow(BEACON, 1));
      beacon.position.set(0.1, 2.24, 0.35);
      root.add(beacon);
      this.tugs.push({ root, bells, beacon });
      this.root.add(root);
    }
  }

  /** The line has snapped (sim/tow.ts letGo): sparks where it held, and a flash down its length. */
  snap(x: number, z: number, fx: Effects): void {
    fx.flash(x, 0.3, z, 2.2, [3.2, 2.1, 0.7], 0.12);
    fx.burst(x, 0.3, z, 18, [3, 2, 0.6], 9, 0.18, 0.5);
    fx.light(x, 0.4, z, [1, 0.7, 0.3], 80, 0.3);
  }

  update(world: World, dt: number): void {
    const tow = world.bk?.def.first ? world.tow : null;
    if (!tow || !tow.tugs.length) { this.root.visible = false; return; }
    if (!this.built) this.build();
    this.root.visible = true;
    this.time += dt;
    const blink = (Math.sin(this.time * 4.2) > 0.55 ? 1 : 0.15);
    for (let i = 0; i < this.tugs.length; i++) {
      const v = this.tugs[i]!, g = tow.tugs.find((t) => t.slot === i);
      v.root.visible = !!g;
      if (!g) continue;
      v.root.position.set(g.x, 0, g.z);
      v.root.rotation.y = g.heading;
      const burn = Math.min(1, Math.hypot(g.vx, g.vz) / 14);
      for (const b of v.bells) (b.material as MeshBasicMaterial).opacity = 0.1 + 0.28 * burn;
      (v.beacon.material as MeshBasicMaterial).opacity = blink;
    }
    // the line: from the lead's winch to her bow, while she is on it
    const lead = tow.tugs.find((t) => t.slot === 0);
    const on = tow.phase === 'tow' && !!lead;
    this.line.visible = this.lineCore.visible = on;
    if (!on || !lead) return;
    const s = world.ship, hx = Math.cos(s.heading), hz = -Math.sin(s.heading), lx = Math.cos(lead.heading), lz = -Math.sin(lead.heading);
    A.set(lead.x - lx * 2.2, 0.25, lead.z - lz * 2.2);
    B.set(s.x + hx * 1.2, 0.15, s.z + hz * 1.2);
    const len = A.distanceTo(B);
    if (len < 1e-3) return;
    Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
    for (const m of [this.line, this.lineCore]) {
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.copy(Q);
      m.scale.set(1, len, 1);
    }
    // it brightens and shivers as she pulls against it
    const k = tow.strain;
    this.lineMat.opacity = 0.22 + 0.3 * k + 0.05 * Math.sin(this.time * 9);
    this.coreMat.opacity = 0.55 + 0.3 * k * (0.6 + 0.4 * Math.sin(this.time * 31));
    this.line.scale.x = this.line.scale.z = 1 + 0.4 * k;
  }

  dispose(): void { this.scene.remove(this.root); }
}
