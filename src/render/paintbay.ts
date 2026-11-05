import { AdditiveBlending, BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, type PerspectiveCamera, type Scene } from 'three';
import { BAY, bayAt, bayFrame, bayTimes } from '../sim/paintbay';
import { paintDue } from '../sim/postjump';
import type { World } from '../sim/world';
import { materials } from './breakout';
import type { Effects } from './fx';
import { Kit } from './kit';

// ── Ned's yard ────────────────────────────────────────────────────────────
// A work pad of its own, off the lane between the company's dock and the Jump Gate (sim/paintbay.ts; owner, 5 November 2026: a separate
// site, not the depot; no building, no people). It is built from the depot's own parts, so it reads as the same world: a long deck on
// legs with hazard edges and guide lights, three arches in a row (scan, spray, mark), a gate at each end with a light curtain, and a
// beacon mast that shows from afar while the hull is waiting for it. Every move comes from `bayFrame`, the same numbers the ship is
// flown by. It is built once, when the hull is due, and stays after. The deck is at y = FLOOR, the ship's plane at 0.

const FLOOR = -1.3;
const ARCH_H = 4.6;
const WORK = new Color(3.4, 1.9, 0.5);
const SCAN = new Color(0.5, 2.2, 2.6);
const MARK = new Color(2.6, 2.7, 2.8);
const TEAL = 0x66e8ff, AMBER = 0xffc070, WHITE = 0xf2f6ff;

const ease = (u: number): number => { const t = Math.min(1, Math.max(0, u)); return t * t * (3 - 2 * t); };
const glowMat = (c: Color, opacity = 1): MeshBasicMaterial => new MeshBasicMaterial({ color: c.clone(), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });

export class PaintBayView {
  private readonly root = new Group();
  private built = false;
  private time = 0;
  private lamp!: PointLight;
  private mist = 0;
  /** The moving parts. */
  private sheet!: Mesh;
  private head!: Mesh;
  private headBeam!: MeshBasicMaterial;
  private laser!: Mesh;
  private curtains: Mesh[] = [];
  private strips: [MeshBasicMaterial, MeshBasicMaterial, MeshBasicMaterial] = [glowMat(SCAN, 0.35), glowMat(WORK, 0.35), glowMat(MARK, 0.35)];
  private beacon!: MeshBasicMaterial;

  constructor(private readonly scene: Scene) {
    this.root.visible = false;
    scene.add(this.root);
  }

  private build(): void {
    this.built = true;
    const L = BAY.halfLen, W = BAY.halfWid, S = BAY.stn;
    const k = new Kit();
    // the deck, on legs, with a hazard edge down each long side
    k.box('floor', [L * 2 + 4, 0.4, W * 2 + 2], [0, FLOOR - 0.2, 0]);
    for (const s of [-1, 1]) {
      k.box('paint', [L * 2 + 4, 0.08, 0.5], [0, FLOOR + 0.04, s * (W + 0.25)]);
      k.box('dark', [L * 2 + 4, 0.5, 0.3], [0, FLOOR - 0.25, s * (W + 1.1)]);
    }
    for (const x of [-L, 0, L]) for (const z of [-1, 1]) {
      k.box('dark', [0.45, 7, 0.45], [x, FLOOR - 3.9, z * (W + 0.5)]);
      k.box('dark', [0.3, 0.3, W * 2 + 1.4], [x, FLOOR - 7.2, 0]);
    }
    k.box('dark', [L * 2, 0.3, 0.3], [0, FLOOR - 7.2, W + 0.5]);
    k.box('dark', [L * 2, 0.3, 0.3], [0, FLOOR - 7.2, -(W + 0.5)]);
    // guide lights down the line she flies in on: on the deck, and on low posts in the approach
    for (let i = -L + 1; i <= L - 1; i += 1.6) k.box('lamp', [0.5, 0.05, 0.14], [i, FLOOR + 0.06, 0]);
    for (let x = -L - 6; x >= -L - 36; x -= 6) {
      k.box('dark', [0.14, 1.6, 0.14], [x, FLOOR + 0.8, W + 0.8]);
      k.box('amber', [0.3, 0.14, 0.3], [x, FLOOR + 1.65, W + 0.8]);
      k.box('dark', [0.14, 1.6, 0.14], [x, FLOOR + 0.8, -(W + 0.8)]);
      k.box('amber', [0.3, 0.14, 0.3], [x, FLOOR + 1.65, -(W + 0.8)]);
    }
    // the three arches: heavy posts, a deep beam, a bar of its own light along the beam (teal, amber, white)
    for (const x of [-S, 0, S]) {
      for (const z of [-W + 0.2, W - 0.2]) {
        k.box('hull', [0.6, ARCH_H, 0.6], [x, FLOOR + ARCH_H / 2, z]);
        k.box('paint', [0.66, 0.5, 0.66], [x, FLOOR + 0.5, z]);
      }
      k.box('hull', [0.9, 0.8, W * 2 + 0.6], [x, FLOOR + ARCH_H, 0]);
      for (let i = -3; i <= 3; i++) k.box('dark', [0.96, 0.84, 0.1], [x, FLOOR + ARCH_H, i * 1.2]);
    }
    // a gate at each end, slimmer, with a lamp over it
    for (const x of [-L, L]) {
      for (const z of [-1, 1]) k.box('hull', [0.4, 3.2, 0.4], [x, FLOOR + 1.6, z * (W - 0.2)]);
      k.box('hull', [0.5, 0.5, W * 2], [x, FLOOR + 3.4, 0]);
      k.box('lamp', [0.18, 0.12, 2.4], [x + Math.sign(x) * 0.34, FLOOR + 3.4, 0]);
    }
    // the beacon mast, beyond the far gate: it shows from afar
    k.box('dark', [0.3, 11, 0.3], [L + 3, FLOOR + 5.5, -(W + 0.5)]);
    k.box('hull', [1.3, 0.35, 1.3], [L + 3, FLOOR + 11, -(W + 0.5)]);
    // our own steel and concrete: the fleet's shared 'hull' and 'dark' read black beside the depot's lights, and the deck read white
    const steel = new MeshStandardMaterial({ color: 0x8a949e, roughness: 0.7, metalness: 0.2, emissive: new Color(0.07, 0.085, 0.1) });
    const shade = new MeshStandardMaterial({ color: 0x474d55, roughness: 0.65, metalness: 0.25, emissive: new Color(0.03, 0.035, 0.042) });
    const concrete = new MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.95, metalness: 0, emissive: new Color(0.008, 0.008, 0.008) });
    this.root.add(k.build({ ...materials(), hull: steel, dark: shade, floor: concrete }, 0.3));

    const bar = (x: number, m: MeshBasicMaterial): void => {
      const o = new Mesh(new BoxGeometry(0.1, 0.14, W * 2 - 0.8), m);
      o.position.set(x, FLOOR + ARCH_H - 0.5, 0);
      this.root.add(o);
    };
    [-S, 0, S].forEach((x, i) => bar(x, this.strips[i]!));
    this.beacon = glowMat(new Color(0.5, 2.2, 2.6), 1);
    const lampTop = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), this.beacon);
    lampTop.position.set(L + 3, FLOOR + 11.5, -(W + 0.5));
    this.root.add(lampTop);

    // scan: a teal sheet of light that travels down the hull under the first arch
    this.sheet = new Mesh(new BoxGeometry(0.05, 3.2, W * 2 - 0.8), glowMat(SCAN, 0.45));
    this.sheet.visible = false;
    this.root.add(this.sheet);
    // spray: a head under the second arch that sweeps the hull, with a work light beneath it
    this.head = new Mesh(new BoxGeometry(0.5, 0.3, W * 2 - 0.6), shade);
    this.head.position.set(0, FLOOR + ARCH_H - 0.9, 0);
    this.headBeam = glowMat(WORK, 1);
    const beam = new Mesh(new BoxGeometry(0.18, 0.08, W * 2 - 0.8), this.headBeam);
    beam.position.y = -0.2;
    this.head.add(beam);
    this.head.visible = false;
    this.root.add(this.head);
    // mark: a white line that travels down the hull under the third arch, writing
    this.laser = new Mesh(new BoxGeometry(0.1, 0.1, W * 1.4), glowMat(MARK, 0.95));
    this.laser.visible = false;
    this.root.add(this.laser);

    // a light curtain across each gate: shut while she is inside, so the pad reads as closed off
    for (const x of [-L, L]) {
      const m = new Mesh(new BoxGeometry(0.05, 3.0, W * 2 - 0.6), glowMat(new Color(1.2, 0.7, 0.2), 0));
      m.position.set(x, FLOOR + 1.5, 0);
      m.visible = false;
      this.curtains.push(m);
      this.root.add(m);
    }

    // the yard's own light: it comes up with the work and takes the colour of the arch she is under
    this.lamp = new PointLight(0xffd9a0, 0, 20, 1.6);
    this.lamp.position.set(0, FLOOR + 5.5, 0);
    this.root.add(this.lamp);
  }

  /** Whether the yard shows at all: the hull is due, the scene is running, or it has been done (the yard stays). */
  private wanted(world: World): boolean {
    return !!world.bk?.yard && !!world.bk.def.first && (paintDue(world.flags) || !!world.bay || world.flags.has('hull_repainted'));
  }

  update(world: World, dt: number, fx: Effects): void {
    if (!this.wanted(world)) { this.root.visible = false; return; }
    if (!this.built) this.build();
    const c = bayAt(world.bk!.yard!);
    this.root.position.set(c.x, 0, c.z);
    this.root.visible = true;
    this.time += dt;
    const b = world.bay, f = b ? bayFrame(b) : null;
    const tm = b ? bayTimes(b) : null;
    const S = BAY.stn;
    const working = !!f?.working;
    const flick = working ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 19) * Math.sin(this.time * 7.3)) : 0.12;
    // the beacon pulses slowly while the hull waits for the yard, and is steady after
    const waiting = paintDue(world.flags) && !b;
    this.beacon.opacity = waiting ? 0.55 + 0.45 * Math.sin(this.time * 2.4) : 0.5;
    // the light curtains: the near one comes down as she is in, the far one lifts when the work is done; both gone after the scene
    const curtain = [f ? f.near : 0, f ? f.far : 0];
    this.curtains.forEach((m, i) => {
      m.visible = curtain[i]! > 0.02;
      (m.material as MeshBasicMaterial).opacity = curtain[i]! * (working ? 0.1 + 0.1 * flick : 0.06);
    });
    // each arch's own bar of light is up while she is under it
    const stage = f ? f.stage : 0;
    this.strips.forEach((m, i) => { m.opacity = stage === i + 1 ? 0.55 + 0.4 * flick : f && working ? 0.18 : 0.1; });
    // scan: the sheet goes down the hull and back
    this.sheet.visible = stage === 1;
    if (stage === 1 && f) this.sheet.position.set(-S + Math.sin(f.prog * Math.PI * 2) * 5, FLOOR + 1.6, 0);
    // spray: the head sweeps the hull to and fro
    this.head.visible = stage === 2;
    if (stage === 2 && f) this.head.position.x = Math.sin(f.prog * Math.PI * 3) * 4.2;
    this.headBeam.color.copy(WORK).multiplyScalar(0.6 + 0.8 * flick);
    // mark: the white line writes along the hull, bow to stern
    this.laser.visible = stage === 3;
    if (stage === 3 && f) this.laser.position.set(S - 5 + f.prog * 10, 0.2, 0);
    // the yard's light follows the work, in the arch's colour
    if (f) {
      this.lamp.position.x = stage === 1 ? -S : stage === 2 ? 0 : stage === 3 ? S : this.lamp.position.x;
      this.lamp.color.setHex(stage === 1 ? TEAL : stage === 3 ? WHITE : AMBER);
      this.lamp.intensity = stage ? 16 : 5;
    } else this.lamp.intensity = 0;
    // sparks and vapour: the spray throws vapour, the mark throws sparks, and the far curtain's lift throws a few
    if (dt > 0 && f && this.mist-- <= 0) {
      this.mist = 4;
      if (stage === 2) fx.burst(c.x + this.head.position.x, FLOOR + 1.2, c.z + (Math.random() - 0.5) * 5, 3, [0.8, 0.72, 0.55], 1.6, 1.2, 1.4);
      if (stage === 3) fx.burst(c.x + this.laser.position.x, 0.2, c.z + (Math.random() - 0.5) * 4, 3, [2.4, 2.4, 2.6], 3, 0.2, 0.4);
    }
    if (f && tm && b && b.e > tm.paint && b.e < tm.paint + 1 && dt > 0 && Math.random() < dt * 14) fx.burst(c.x + BAY.halfLen, FLOOR + 0.3, c.z, 2, [1.6, 1.1, 0.4], 3, 0.25, 0.4);
  }

  /**
   * The cut scene's cameras: the pad from the near side, tracking her from arch to arch and closing in as the work goes on, then
   * the far gate as the curtain lifts. Returns whether the camera was taken over (then the chase camera is not used for this frame).
   */
  cine(world: World, camera: PerspectiveCamera): boolean {
    const b = world.bay;
    if (!b) return false;
    const f = bayFrame(b), tm = bayTimes(b);
    if (f.shot === 0) return false;
    const c = b.c, s = world.ship, S = BAY.stn;
    if (f.shot === 1) {
      // closing in over the work
      const u = Math.min(1, Math.max(0, (b.e - tm.inside) / (tm.paint - tm.inside)));
      // off to the side and ahead of the arch she is under, so its posts never stand between the camera and her
      const tracked = { x: s.x - 9 + u * 3, y: 7.2 - u * 1.6, z: c.z + 22 - u * 6 };
      const k = ease((b.e - (tm.mouth - 0.2)) / (tm.inside - tm.mouth + 0.2));
      const from = { x: c.x - S - 26, y: 6.6, z: c.z + 24 };
      camera.position.set(from.x + (tracked.x - from.x) * k, from.y + (tracked.y - from.y) * k, from.z + (tracked.z - from.z) * k);
      camera.lookAt(s.x, 0.6, s.z);
    } else {
      const u = Math.min(1, Math.max(0, (b.e - tm.paint) / (tm.release - tm.paint + 0.4)));
      camera.position.set(c.x + S + 22 + u * 3, 2.6, c.z + 9 - u * 2);
      camera.lookAt(c.x + S + 9 + u * 7, 0.4, c.z - 0.5);
    }
    camera.updateMatrixWorld();
    return true;
  }
}
