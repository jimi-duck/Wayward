import { AdditiveBlending, BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, SphereGeometry, Vector3, type PerspectiveCamera, type Scene } from 'three';
import { BAY, bayAt, bayFrame, bayTimes } from '../sim/paintbay';
import { paintDue } from '../sim/postjump';
import type { World } from '../sim/world';
import { materials } from './breakout';
import type { Effects } from './fx';
import { Kit, seeded } from './kit';

// ── Ned's yard ────────────────────────────────────────────────────────────
// A work pad of its own, off the lane between the company's dock and the Jump Gate (sim/paintbay.ts; owner, 5 November 2026: a separate
// site, not the depot; no building, no people; "part of a large asteroid rock", look target neds_yard_v3.png). A long deck set into an
// asteroid, with hazard edges and post lamps, three arches in a row (scan teal, spray amber, mark white), a gate at each end with a
// light curtain, a miner's shack, an ore silo and conveyor behind, fuel tanks to one side, and a lattice beacon mast with a pulsing
// orange lamp that shows from afar while the hull is waiting for it. All procedural, built from the depot's own materials. Every move comes from `bayFrame`, the same numbers the ship is
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
  private beaconLight!: PointLight;

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
    // post lamps along both edges of the deck
    for (let x = -L; x <= L; x += 3.25) for (const z of [-1, 1]) {
      k.box('dark', [0.14, 0.8, 0.14], [x, FLOOR + 0.4, z * (W + 0.55)]);
      k.box('amber', [0.2, 0.24, 0.2], [x, FLOOR + 0.92, z * (W + 0.55)]);
    }
    // the right-hand shelf: fuel tanks and the beacon mast, held on a lattice frame under the deck's end
    k.box('floor', [10, 0.4, 9], [L + 7, FLOOR - 0.2, 2.5]);
    for (const [x, z] of [[L + 3, -1.8], [L + 11, -1.8], [L + 3, 6.8], [L + 11, 6.8]] as const) k.box('dark', [0.3, 6, 0.3], [x, FLOOR - 3.2, z]);
    k.box('dark', [8.4, 0.25, 0.25], [L + 7, FLOOR - 4.6, -1.8]); k.box('dark', [8.4, 0.25, 0.25], [L + 7, FLOOR - 4.6, 6.8]);
    for (let i = 0; i < 4; i++) k.box('dark', [0.2, 6.4, 0.2], [L + 4.5 + i * 2.2, FLOOR - 2.3, 2.5], [0, 0, 0.5]);
    for (const z of [1.2, 3.8]) { k.cyl('hull', 0.9, 0.9, 4.6, [L + 7.6, FLOOR + 1.0, z], 'x', 14); k.box('rust', [0.4, 1.9, 1.9], [L + 6.4, FLOOR + 1.0, z]); k.box('rust', [0.4, 1.9, 1.9], [L + 8.8, FLOOR + 1.0, z]); }
    // the beacon mast: a tapered lattice with a platform, a short mast and a lamp on top
    const mx = L + 10.2, mz = 6.2;
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]] as const) k.box('dark', [0.14, 12.5, 0.14], [mx + dx * 0.7, FLOOR + 6.2, mz + dz * 0.7], [dz * 0.04, 0, -dx * 0.04]);
    for (let h = 1.2; h < 12; h += 2) { k.box('dark', [1.5 - h * 0.05, 0.1, 0.1], [mx, FLOOR + h, mz - 0.55]); k.box('dark', [1.5 - h * 0.05, 0.1, 0.1], [mx, FLOOR + h, mz + 0.55]); k.box('dark', [0.1, 0.1, 1.5 - h * 0.05], [mx - 0.55, FLOOR + h, mz]); k.box('dark', [0.1, 0.1, 1.5 - h * 0.05], [mx + 0.55, FLOOR + h, mz]); }
    k.box('hull', [1.5, 0.3, 1.5], [mx, FLOOR + 12.4, mz]);
    k.box('dark', [0.14, 1.6, 0.14], [mx, FLOOR + 13.4, mz]);
    for (const [dx, dz] of [[-0.45, 0], [0.45, 0], [0, -0.45], [0, 0.45]] as const) k.box('hull', [0.12, 0.9, 0.12], [mx + dx, FLOOR + 12.95, mz + dz]);
    // behind the deck: a shelf for a miner's shack, an ore silo, a conveyor and stacked crates
    k.box('floor', [34, 0.4, 9], [-8, FLOOR - 0.2, -10.5]);
    k.box('paint', [34, 0.07, 0.4], [-8, FLOOR + 0.04, -6.2]);
    k.box('hull', [8, 3, 4], [-6, FLOOR + 1.5, -11]); k.box('dark', [8.6, 0.3, 4.6], [-6, FLOOR + 3.15, -11]);
    k.box('rust', [2.6, 1.0, 0.1], [-4, FLOOR + 2.3, -8.95]); k.box('rust', [1.4, 1.6, 0.1], [-8.6, FLOOR + 1.0, -8.95]);
    for (const x of [-8.2, -4.2]) k.box('amber', [1.5, 0.95, 0.06], [x, FLOOR + 1.9, -8.97]);
    k.box('dark', [1.0, 2.0, 0.08], [-6, FLOOR + 1.0, -8.97]);
    k.box('dark', [0.9, 0.35, 0.9], [-9.5, FLOOR + 3.55, -12]);
    for (let i = 0; i < 4; i++) k.box('dark', [1.6, 0.14, 0.8], [-2.2 + i * 0.4 + 0.5, FLOOR + 0.2 + i * 0.3, -7.2 - 0.2]); // steps
    k.box('dark', [4.6, 0.08, 0.08], [-9.5, FLOOR + 3.9, -8.6]); k.box('dark', [4.6, 0.08, 0.08], [-9.5, FLOOR + 3.4, -8.6]);
    k.cyl('hull', 2.2, 2.2, 6.6, [-17, FLOOR + 3.3, -12.5], 'y', 18);
    k.cyl('dark', 0.3, 2.3, 1.8, [-17, FLOOR + 7.5, -12.5], 'y', 18);
    k.cyl('paint', 2.28, 2.28, 0.9, [-17, FLOOR + 4.6, -12.5], 'y', 18);
    k.cyl('rust', 2.26, 2.26, 1.1, [-17, FLOOR + 1.2, -12.5], 'y', 18);
    for (const [dx, dz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]] as const) k.box('dark', [0.25, 1.4, 0.25], [-17 + dx, FLOOR + 0.7, -12.5 + dz]);
    k.box('dark', [18, 0.45, 1.3], [-28, FLOOR + 3.4, -13.2], [0, 0, 0.32]);
    for (let i = 0; i < 9; i++) k.cyl('hull', 0.16, 0.16, 1.4, [-35 + i * 2.1, FLOOR + 0.9 + i * 0.66, -13.2], 'z', 6);
    for (let i = 0; i < 4; i++) k.box('dark', [0.2, 4 - i * 0.6, 0.2], [-33 + i * 4.5, FLOOR + (4 - i * 0.6) / 2, -13.2]);
    for (const [x, z, n] of [[-12, -7.4, 3], [-13.4, -7.6, 2], [-0.4, -7.5, 2]] as const) for (let i = 0; i < n; i++) k.box(i % 2 ? 'paint' : 'hull', [1.3, 1.0, 1.1], [x + (i % 2) * 0.1, FLOOR + 0.5 + i * 1.0, z]);
    for (const [x, z] of [[-9.7, -6.9], [-10.5, -7.3]] as const) k.box('hull', [0.7, 0.7, 0.7], [x, FLOOR + 0.35, z]);
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
    // our own steel and concrete: the fleet's shared 'hull' and 'dark' read black beside the depot's lights, and the deck read white
    const steel = new MeshStandardMaterial({ color: 0x8a949e, roughness: 0.7, metalness: 0.2, emissive: new Color(0.07, 0.085, 0.1) });
    const shade = new MeshStandardMaterial({ color: 0x474d55, roughness: 0.65, metalness: 0.25, emissive: new Color(0.03, 0.035, 0.042) });
    const concrete = new MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.95, metalness: 0, emissive: new Color(0.008, 0.008, 0.008) });
    const rust = new MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.95, metalness: 0.1, emissive: new Color(0.02, 0.01, 0.005) });
    this.root.add(k.build({ ...materials(), hull: steel, dark: shade, floor: concrete, rust }, 0.3));
    this.buildRock(L, W);

    const bar = (x: number, m: MeshBasicMaterial): void => {
      const o = new Mesh(new BoxGeometry(0.1, 0.14, W * 2 - 0.8), m);
      o.position.set(x, FLOOR + ARCH_H - 0.5, 0);
      this.root.add(o);
    };
    [-S, 0, S].forEach((x, i) => bar(x, this.strips[i]!));
    this.beacon = glowMat(new Color(3.2, 1.3, 0.25), 1);
    const lampTop = new Mesh(new SphereGeometry(0.55, 14, 10), this.beacon);
    lampTop.position.set(L + 10.2, FLOOR + 13.2 + 0.7, 6.2);
    this.root.add(lampTop);
    this.beaconLight = new PointLight(0xff9a40, 0, 30, 1.6);
    this.beaconLight.position.copy(lampTop.position);
    this.root.add(this.beaconLight);

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
    // three nozzles, each with a cone of amber mist
    for (const z of [-2.6, 0, 2.6]) {
      const nz = new Mesh(new CylinderGeometry(0.13, 0.24, 0.6, 10), shade); nz.position.set(0, -0.4, z); this.head.add(nz);
      const mist = new Mesh(new CylinderGeometry(0.12, 1.15, 3.3, 14, 1, true), glowMat(new Color(1.8, 1.1, 0.25), 0.2)); mist.position.set(0, -2.2, z); this.head.add(mist);
    }
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

  /**
   * The asteroid the yard is set in: a big squashed, lumpy low-poly rock under and behind the deck, a few boulders round it, all in
   * flat-shaded dark grey-brown. Built once, with its own seeded jitter so the shape is the same every time.
   */
  private buildRock(L: number, W: number): void {
    const rnd = seeded(8123);
    const mat = new MeshStandardMaterial({ color: 0x4d463f, roughness: 1, metalness: 0, flatShading: true, emissive: new Color(0.012, 0.01, 0.009) });
    const lump = (r: number, sx: number, sy: number, sz: number, at: [number, number, number], jit: number): void => {
      const g = new IcosahedronGeometry(r, 2);
      const pos = g.attributes.position!;
      const v = new Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // the same jitter for every vertex at one place, so the surface stays closed
        const h = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
        v.multiplyScalar(1 + ((h - Math.floor(h)) - 0.5) * jit + (rnd() - 0.5) * 0.0);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      const m = new Mesh(g, mat);
      m.scale.set(sx, sy, sz);
      m.position.set(at[0], at[1], at[2]);
      m.rotation.set(rnd() * 0.4, rnd() * 6.28, rnd() * 0.4);
      this.root.add(m);
    };
    // the body under the deck and its back shelf, and the mass at the back
    lump(1, 30, 8.5, 17, [-4, FLOOR - 8.5, -6], 0.28);
    lump(1, 16, 11, 11, [-24, FLOOR + 1, -16], 0.34);
    lump(1, 12, 15, 9, [4, FLOOR + 3, -23], 0.32);
    lump(1, 9, 6, 7, [-L - 6, FLOOR - 3, 7], 0.3);
    lump(1, 7, 5, 6, [L + 2, FLOOR - 7, -3], 0.3);
    lump(1, 5, 4, 5, [-34, FLOOR - 2, -6], 0.3);
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
    this.beacon.opacity = waiting ? 0.6 + 0.4 * Math.sin(this.time * 2.4) : 0.55;
    this.beaconLight.intensity = waiting ? 6 + 6 * Math.sin(this.time * 2.4) : 3;
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
