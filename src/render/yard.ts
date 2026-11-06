import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PointLight, SphereGeometry, type Material, type Scene } from 'three';
import { paintDue, RENAMED, YARD_ZAP } from '../sim/postjump';
import type { World } from '../sim/world';
import { cable, crate, flatRing, materials, strut, stripes, tank, truss, windowMaterial, windowRow } from './breakout';
import type { Effects } from './fx';
import { Kit, metal, seeded } from './kit';
import { lavaRock, rockGeometry } from './rocks';

// ── Ned's yard ────────────────────────────────────────────────────────────
// A station of its own, built into a big asteroid, off the lane between the company's dock and the Jump Gate (owner, 5 November 2026:
// "somewhere to dock like with the supply hub", "a station built into the rock", look target neds_yard_v3.png). The ship eases into its teal
// ring and holds still (sim/world.ts `stepYard`), the work is done at once, and the rename reveal plays. No fly-by, no building to enter.
//
// The rock is the game's own (render/rocks.ts: the veined basalt, cratered and cut, smooth-shaded, with its baked occlusion). On it sit a
// deck with a hazard edge and post lamps, three work arches round the pad (scan teal, spray amber, mark white), a miner's shack, an ore
// silo and conveyor, crates, fuel tanks, a truss gantry with cable runs, a portal cut into the rock face with a lit hangar behind it, and a
// lattice beacon mast with an orange lamp. Everything but the rock is the depot's own kit (render/kit.ts), with the same worn metal.
// It is built a piece a frame once the first system is entered (never all at once), and shows once the hull is due.
// Local space: the pad's centre at the origin, the deck's top at y = 0; the group sits at FLOOR so the ship's plane is 1.3 above it.

const FLOOR = -1.3;
const TEAL = 0x66e8ff, AMBER = 0xffc070, WHITE = 0xf2f6ff;
const SCAN = new Color(0.5, 2.2, 2.6);
const WORK = new Color(3.4, 1.9, 0.5);
const MARK = new Color(2.6, 2.7, 2.8);
const CYAN = new Color(0.4, 2.4, 3.2);

/** The sequence of lights after the work: scan, spray, mark (seconds she has held in the ring). */
const SEQ = { scan: [0, 1.3], spray: [1.1, 2.7], mark: [2.5, 3.6] } as const;

/** How many bolts at most, and the segments in each. */
const BOLTS = 6, SEGS = 9;
/** Where the bolts start: the lamps on the arch posts. */
const ANCHORS: ReadonlyArray<readonly [number, number, number]> = [[-9.5, 6.8, -6.6], [-9.5, 6.8, 6.6], [9.5, 6.8, -6.6], [9.5, 6.8, 6.6]];

const glowMat = (c: Color, opacity = 1): MeshBasicMaterial => new MeshBasicMaterial({ color: c.clone(), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
const within = (e: number, r: readonly [number, number]): number => (e < r[0] || e > r[1] ? 0 : Math.min(1, (e - r[0]) / 0.25, (r[1] - e) / 0.4));

let mats: Record<string, Material> | null = null;
/** The depot's materials, and the yard's own: concrete deck, rusted plate. */
function yardMats(): Record<string, Material> {
  return mats ??= {
    ...materials(),
    floor: metal({ tint: 0x6c6a66, roughness: 0.92, metalness: 0.1, scale: 0.7, bump: 0.01, worn: 0.6 }),
    rust: metal({ tint: 0x9a5f38, roughness: 0.9, metalness: 0.2, scale: 1.1, bump: 0.012, worn: 0.7 }),
    win: windowMaterial(),
  };
}

export class YardView {
  private readonly root = new Group();
  private stages: Array<() => void> = [];
  private staged = false;
  private done = false;
  private time = 0;
  private mist = 0;
  private ring!: ReturnType<typeof flatRing>;
  private pad!: ReturnType<typeof flatRing>;
  private beacon!: MeshBasicMaterial;
  private beaconLight!: PointLight;
  private lamp!: PointLight;
  private fill!: PointLight;
  private hangar!: PointLight;
  private readonly lightsG = new Group();
  private strips: [MeshBasicMaterial, MeshBasicMaterial, MeshBasicMaterial] = [glowMat(SCAN, 0.3), glowMat(WORK, 0.3), glowMat(MARK, 0.3)];
  private nozzles = glowMat(WORK, 0.2);
  private mists: Mesh[] = [];
  /** Lightning from the arches to the hull while she is held (owner 2026-11-06): jagged lines, new every 50 ms. */
  private readonly bolt = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  private boltT = 0;

  constructor(private readonly scene: Scene) {
    this.root.visible = false;
    this.root.position.y = FLOOR;
    this.bolt.geometry.setAttribute('position', new BufferAttribute(new Float32Array(BOLTS * SEGS * 6), 3));
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;
    this.root.add(this.bolt);
    scene.add(this.root);
    // The lights are not under `root`: the number of lights in the scene changing recompiles every lit material (a freeze of seconds on a
    // phone), so all four exist from the start of the page, at no intensity until the hull is due, and the scene's light count never moves.
    // A warm working light over the deck, and the arches' colour thrown on it during the work
    this.lamp = new PointLight(0xffd9a0, 0, 40, 1.4);
    this.lamp.position.set(0, 10, 9);
    // fill: the sun is as often behind the rock as in front, and the station must read from every side
    const fill = new PointLight(0xffe0b0, 0, 56, 1.4);
    fill.position.set(-4, 15, -6);
    const hangar = new PointLight(0x8fe8ff, 0, 26, 1.5);
    hangar.position.set(6.6, 4, -15);
    this.beaconLight = new PointLight(0xff9a40, 0, 34, 1.5);
    this.beaconLight.position.set(26.5, 17.4, -9);
    this.fill = fill; this.hangar = hangar;
    this.lightsG.add(this.lamp, fill, hangar, this.beaconLight);
    scene.add(this.lightsG);
  }

  // ── building, a piece a frame ──────────────────────────────────────────

  private plan(): void {
    this.staged = true;
    const rockMat = lavaRock(4, 0.3, 0.16, undefined, false);
    const lump = (seed: number, at: [number, number, number], sc: [number, number, number], craters: number, rough: number, cuts: number, ry = 0): (() => void) => () => {
      const m = new Mesh(rockGeometry(seed, 4, craters, rough, cuts), rockMat);
      m.position.set(...at);
      m.scale.set(...sc);
      m.rotation.y = ry;
      this.root.add(m);
    };
    this.stages = [
      // the asteroid: a body under the deck, a massif behind it, shoulders to each side, an overhang over the portal, boulders at the foot
      lump(3.1, [0, -11.5, -4], [21, 9, 17], 3, 0.3, 4),
      lump(7.7, [-4, 7, -31], [32, 22, 13], 6, 0.34, 7, 0.4),
      lump(5.3, [-31, -2, -18], [13, 11, 12], 3, 0.36, 5, 1.2),
      lump(9.9, [31, -6, -10], [11, 10, 12], 3, 0.36, 5, 2.2),
      lump(2.4, [7, 12.5, -27], [16, 8, 10], 4, 0.3, 4, 0.8),
      lump(6.6, [25, -2.5, -19], [6.5, 5, 5.5], 1, 0.4, 3, 0.3),
      lump(4.4, [-13, -5.5, 11], [9, 5, 6], 2, 0.4, 3, 0.9),
      lump(1.7, [15, -6, 10], [8, 5.5, 6], 2, 0.4, 3, 2.1),
      lump(8.8, [-20, -4, -3], [6.5, 5.5, 6], 1, 0.4, 3, 1.6),
      () => this.deck(),
      () => this.works(),
      () => this.gantry(),
      () => this.lights(),
    ];
  }

  /** The deck, the pad and the arches. */
  private deck(): void {
    const k = new Kit(), rnd = seeded(5);
    k.box('floor', [32, 0.7, 24], [0, -0.35, 0]);
    k.box('dark', [32.4, 0.5, 0.5], [0, -0.1, 12.1]);
    k.box('dark', [0.5, 0.5, 24.2], [-16.2, -0.1, 0]);
    k.box('dark', [0.5, 0.5, 24.2], [16.2, -0.1, 0]);
    // the pad: a dark disc ringed in yellow, chevrons on the apron, a hazard edge along the front
    k.cyl('dark', 8, 8, 0.08, [0, 0.04, 0], 'y', 40);
    k.ring('paint', 8, 0.1, [0, 0.1, 0], 'y', 40);
    k.ring('hull', 3, 0.06, [0, 0.1, 0], 'y', 28);
    stripes(k, 0, 0.05, 11.4, 'x', 30, 0.9, 20);
    stripes(k, -14.2, 0.05, 0, 'z', 20, 0.9, 14);
    stripes(k, 14.2, 0.05, 0, 'z', 20, 0.9, 14);
    for (let x = -12; x <= 12; x += 6) { k.box('hull', [0.25, 0.04, 22], [x, 0.04, 0]); }
    // post lamps along the front edge and the sides
    for (let x = -15; x <= 15; x += 3) { k.box('dark', [0.14, 1.0, 0.14], [x, 0.5, 11.6]); k.box('amber', [0.22, 0.26, 0.22], [x, 1.1, 11.6]); }
    for (const z of [-6, 0, 6]) for (const x of [-15.6, 15.6]) { k.box('dark', [0.14, 1.0, 0.14], [x, 0.5, z]); k.box('amber', [0.22, 0.26, 0.22], [x, 1.1, z]); }
    // the scan and mark arches: heavy posts on plinths, a deep beam with ribs, a service catwalk and a lamp at each end
    for (const x of [-9.5, 9.5]) {
      for (const z of [-6.6, 6.6]) {
        k.box('dark', [1.1, 0.5, 1.1], [x, 0.25, z]);
        k.box('hull', [0.7, 6.4, 0.7], [x, 3.4, z]);
        k.box('paint', [0.76, 0.5, 0.76], [x, 0.8, z]);
        k.box('dark', [0.1, 5.6, 0.1], [x + 0.42, 3.2, z]);
        k.box('lamp', [0.2, 0.2, 0.2], [x, 6.8, z]);
      }
      k.box('hull', [1.0, 0.9, 14.2], [x, 6.4, 0]);
      for (let i = -6; i <= 6; i++) k.box('dark', [1.06, 0.95, 0.1], [x, 6.4, i * 1.1]);
      k.box('dark', [1.4, 0.1, 14.6], [x, 7.0, 0]);
      for (let i = -3; i <= 3; i++) strut(k, 'dark', [x - 0.6, 7.0, i * 2], [x + 0.6, 6.4, i * 2 + 1], 0.04, 3);
      k.box('dark', [0.5, 0.4, 1.2], [x, 5.7, 3]);
      k.box('dark', [0.5, 0.4, 1.2], [x, 5.7, -3]);
    }
    // the spray masts: tall frames on each side of the pad, three nozzle bars on each pointing in
    for (const z of [-8.4, 8.4]) {
      const s = Math.sign(z);
      for (const dx of [-0.6, 0.6]) k.box('hull', [0.14, 8, 0.14], [dx, 4, z]);
      for (let h = 0.6; h < 7.6; h += 1.2) { k.box('dark', [1.3, 0.08, 0.08], [0, h, z]); }
      for (let i = 0; i < 4; i++) strut(k, 'dark', [-0.6, 0.6 + i * 1.9, z], [0.6, 2.5 + i * 1.9, z], 0.04, 3);
      for (const h of [1.2, 2.8, 4.4]) { k.box('hull', [0.5, 0.3, 1.8], [0, h, z - s * 0.9]); k.cyl('dark', 0.1, 0.14, 0.5, [0, h, z - s * 1.9], 'z', 8); }
      k.box('lamp', [0.3, 0.3, 0.3], [0, 8.2, z]);
    }
    k.greebles('hull', rnd, -14, -11, 5, 10, 0, 6, 0.8);
    k.greebles('dark', rnd, 11, 14, -10, -6, 0, 6, 0.8);
    this.root.add(k.build(yardMats(), 0.7));
    // the arches' own light: a bar under each beam (and the spray masts' nozzle glow)
    const bar = (x: number, m: MeshBasicMaterial): void => {
      const o = new Mesh(new BoxGeometry(0.1, 0.14, 12.4), m);
      o.position.set(x, 5.85, 0);
      this.root.add(o);
    };
    bar(-9.5, this.strips[0]); bar(9.5, this.strips[2]);
    const sb = new Mesh(new BoxGeometry(0.14, 0.14, 12), this.strips[1]);
    sb.position.set(0, 8.2, 0);
    this.root.add(sb);
    for (const z of [-8.4, 8.4]) for (const h of [1.2, 2.8, 4.4]) {
      const n = new Mesh(new SphereGeometry(0.16, 8, 6), this.nozzles);
      n.position.set(0, h, z - Math.sign(z) * 2.15);
      this.root.add(n);
      const mist = new Mesh(new CylinderGeometry(0.1, 1.0, 3.0, 12, 1, true), glowMat(new Color(1.8, 1.1, 0.25), 0));
      mist.rotation.x = Math.PI / 2;
      mist.position.set(0, h, z - Math.sign(z) * 3.7);
      this.mists.push(mist);
      this.root.add(mist);
    }
  }

  /** What the miners built on the rock: shack, silo, conveyor, crates, tanks, the portal into the mountain. */
  private works(): void {
    const k = new Kit(), rnd = seeded(11);
    // the back shelf, running into the rock, and the right-hand shelf on its lattice legs
    k.box('floor', [44, 0.7, 9], [-3, -0.35, -15.5]);
    k.box('dark', [44.4, 0.5, 0.4], [-3, -0.1, -11]);
    stripes(k, -3, 0.05, -11.4, 'x', 40, 0.7, 24);
    k.box('floor', [11, 0.7, 12], [21, -0.35, -3]);
    for (const [x, z] of [[16.5, 2], [25.5, 2], [16.5, -8], [25.5, -8]] as const) k.box('dark', [0.36, 6.6, 0.36], [x, -3.6, z]);
    for (const z of [2, -8]) k.box('dark', [9, 0.26, 0.26], [21, -5.2, z]);
    for (let i = 0; i < 4; i++) strut(k, 'dark', [16.5 + i * 3, -6.8, 2], [19.5 + i * 3, -0.7, 2], 0.08, 4);
    // the portal: a heavy frame cut into the face, a lit hangar behind it
    for (const x of [1.2, 12]) { k.box('hull', [1.5, 8.6, 2.8], [x, 4.3, -18]); k.box('paint', [1.56, 0.7, 2.86], [x, 1.2, -18]); k.box('dark', [1.56, 0.5, 2.86], [x, 0.25, -18]); }
    k.box('hull', [12.3, 1.7, 2.8], [6.6, 8.8, -18]);
    k.box('dark', [12.5, 0.3, 3.0], [6.6, 7.9, -18]);
    stripes(k, 6.6, 9.7, -16.6, 'x', 12, 0.5, 8);
    k.box('dark', [10.5, 7.2, 3.6], [6.6, 3.6, -20.6]);
    k.box('amber', [9.6, 0.14, 0.14], [6.6, 7.4, -19.2]);
    for (let i = 0; i < 5; i++) k.box('lamp', [0.5, 0.1, 0.5], [2.8 + i * 1.9, 7.3, -19.6]);
    k.box('hull', [10, 0.1, 2.2], [6.6, 0.06, -19]);
    for (let i = 0; i < 6; i++) k.box('dark', [0.14, 6.6, 0.14], [1.9 + i * 1.8, 3.6, -18.7]);
    for (const x of [-0.2, 13.4]) { k.box('dark', [0.14, 5, 0.14], [x, 2.5, -16.6]); k.box('lamp', [0.34, 0.2, 0.34], [x, 5.1, -16.6]); }
    k.box('dark', [4.4, 0.7, 1.4], [6.6, 10.4, -18]);
    k.box('amber', [3.6, 0.3, 0.1], [6.6, 10.4, -17.28]);
    // the shack: a low block against the rock with a parapet, windows, a door and steps, a vent, a dish
    k.box('hull', [9, 3.8, 5.4], [-9.5, 1.9, -15.6]);
    k.box('dark', [9.6, 0.34, 6], [-9.5, 3.97, -15.6]);
    k.box('paint', [9.2, 0.14, 0.5], [-9.5, 4.2, -12.7]);
    k.box('rust', [2.6, 3.1, 0.14], [-6.4, 1.6, -12.85]);
    k.box('dark', [1.5, 2.6, 0.18], [-12, 1.3, -12.86]);
    windowRow(k, rnd, [-13.2, 2.6, -12.86], [-7.4, 2.6, -12.86], 6, [0.8, 0.5, 0.08], [0, 0, 0], 0.18);
    for (let i = 0; i < 4; i++) k.box('dark', [1.8, 0.16, 0.7], [-8.4 + 0.1, 0.12 + i * 0.28, -12.4 + i * -0.12]);
    k.box('dark', [1.4, 0.7, 1.4], [-6.5, 4.5, -16.5]);
    k.cyl('hull', 0.35, 0.35, 1.2, [-12.2, 4.9, -15], 'y', 8);
    k.greebles('hull', rnd, -13, -6, -17.5, -14, 4.1, 7, 0.55);
    strut(k, 'dark', [-8, 4.1, -17], [-8, 8.2, -17], 0.07, 4);
    k.add('hull', new CylinderGeometry(1.1, 0.14, 0.4, 14, 1, true), [-8, 8.3, -17], [0.5, 0, 0.3]);
    k.box('lamp', [0.2, 0.2, 0.2], [-8, 8.5, -17]);
    // the silo: a legged drum with a cone, rust and paint bands, a ladder, and a conveyor over to the shack
    k.cyl('hull', 2.5, 2.5, 7, [-22, 5.3, -16], 'y', 20);
    k.cyl('dark', 0.4, 2.6, 2.2, [-22, 9.9, -16], 'y', 20);
    k.cyl('rust', 2.58, 2.58, 1.2, [-22, 2.8, -16], 'y', 20);
    k.cyl('paint', 2.58, 2.58, 0.8, [-22, 5.6, -16], 'y', 20);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]] as const) k.box('dark', [0.32, 2.2, 0.32], [-22 + dx, 1.1, -16 + dz]);
    for (let h = 1.5; h < 9; h += 0.55) k.box('dark', [0.7, 0.05, 0.05], [-19.55, h, -16]);
    k.box('dark', [0.06, 8, 0.06], [-19.9, 5, -16.3]); k.box('dark', [0.06, 8, 0.06], [-19.9, 5, -15.7]);
    k.box('dark', [8, 0.4, 1.2], [-17, 5.6, -13.4], [0, 0, 0.32]);
    for (let i = 0; i < 8; i++) k.cyl('hull', 0.14, 0.14, 1.2, [-20.2 + i * 0.95, 4.4 + i * 0.3, -13.4], 'z', 6);
    for (const x of [-20.5, -17, -13.6]) k.box('dark', [0.2, 5, 0.2], [x, 2.5, -13.4]);
    k.box('lamp', [0.24, 0.24, 0.24], [-22, 11.1, -16]);
    // crates and drums on the shelf and the deck's rear apron
    for (let i = 0; i < 8; i++) crate(k, ['paint', 'rust', 'hull'][i % 3]!, -2.8 + (i % 4) * 1.9, 0.5 + Math.floor(i / 4) * 1, -9 + (i % 2) * 0.3, (rnd() - 0.5) * 0.4, 1.6, 0.95, 1.05);
    for (let i = 0; i < 4; i++) crate(k, ['slate', 'paint'][i % 2]!, 14 + (i % 2) * 1.8, 0.5 + Math.floor(i / 2) * 1, -9.4, (rnd() - 0.5) * 0.4, 1.6, 0.95, 1.05);
    for (let i = 0; i < 5; i++) k.cyl('rust', 0.45, 0.45, 1.0, [-14.4 + (i % 3) * 1.0, 0.5 + Math.floor(i / 3) * 1.0, -9.5], 'y', 10);
    // the fuel tanks on the right-hand shelf: two spheres in cradles and two capsules, with manifold pipes
    tank(k, 19, 0, 1.9, 0.3);
    tank(k, 19, -6, 1.7, 1.1);
    for (const z of [-1, -5]) {
      k.cyl('paint', 1.1, 1.1, 5, [24.2, 1.5, z], 'x', 14);
      for (const e of [-1, 1]) k.add('paint', new SphereGeometry(1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-e * Math.PI / 2), [24.2 + e * 2.5, 1.5, z]);
      for (const e of [-1.4, 0, 1.4]) k.ring('dark', 1.12, 0.07, [24.2 + e, 1.5, z], 'x', 14);
      for (const e of [-1.6, 1.6]) k.box('dark', [0.4, 1.4, 2.0], [24.2 + e, 0.5, z]);
    }
    strut(k, 'dark', [19, 1.2, 0], [19, 1.2, -6], 0.2, 5);
    strut(k, 'dark', [19, 1.2, -3], [24, 1.2, -3], 0.16, 5);
    strut(k, 'dark', [14, 0.5, -3], [19, 1.2, -3], 0.14, 5);
    // the beacon mast: a tapered lattice on a platform, a short mast and a lamp (the lamp is lit apart)
    const mx = 26.5, mz = -9;
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]] as const) k.box('dark', [0.14, 15.5, 0.14], [mx + dx * 0.7, 7.5, mz + dz * 0.7], [dz * 0.04, 0, -dx * 0.04]);
    for (let h = 1.2; h < 14; h += 1.6) { for (const o of [-0.5, 0.5]) { k.box('dark', [1.4 - h * 0.04, 0.1, 0.1], [mx, h, mz + o]); k.box('dark', [0.1, 0.1, 1.4 - h * 0.04], [mx + o, h, mz]); } }
    k.box('hull', [1.7, 0.3, 1.7], [mx, 14.6, mz]);
    k.box('dark', [0.14, 2.2, 0.14], [mx, 15.8, mz]);
    for (const [dx, dz] of [[-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]] as const) k.box('hull', [0.12, 1.0, 0.12], [mx + dx, 15.2, mz + dz]);
    this.root.add(k.build(yardMats(), 0.6));
    this.beacon = glowMat(new Color(3.2, 1.3, 0.25), 1);
    const top = new Mesh(new SphereGeometry(0.6, 14, 10), this.beacon);
    top.position.set(mx, 17.4, mz);
    this.root.add(top);
  }

  /** Second level: a truss gantry along the back, cable runs, floodlight poles, a pipe run into the rock. */
  private gantry(): void {
    const k = new Kit(), rnd = seeded(23);
    truss(k, [-17, 7.4, -12.4], [14, 7.4, -12.4], 1.1, 12, 3);
    for (const x of [-17, -7, 3, 14]) k.box('dark', [0.4, 7.4, 0.4], [x, 3.7, -12.4]);
    cable(k, [-17, 7.2, -12.4], [-22, 11.1, -16], 1.0, 0.07);
    cable(k, [14, 7.2, -12.4], [26.5, 15.2, -9], 2.4, 0.07);
    cable(k, [-9.5, 4.1, -13.4], [-9.5, 4.1, -6.6], 0.7, 0.05);
    cable(k, [6.6, 10.4, -17], [14, 7.2, -12.4], 1.3, 0.06);
    for (const [x, z] of [[-12, 12.6], [0, 12.6], [12, 12.6], [-15.4, -11.6]] as const) {
      strut(k, 'dark', [x, 0, z], [x, 4.4, z], 0.07, 4);
      k.box('hull', [0.9, 0.3, 0.5], [x, 4.6, z - Math.sign(z) * 0.2]);
      k.box('lamp', [0.7, 0.14, 0.3], [x, 4.4, z - Math.sign(z) * 0.5]);
    }
    for (let i = 0; i < 6; i++) strut(k, 'dark', [-14 + i * 2.4, 0.6, -11.5], [-14 + i * 2.4 + 1, 7.2, -12.4], 0.05, 3);
    // a pipe run from the portal into the rock, and a ladder up the shoulder
    strut(k, 'dark', [14, 1.2, -19], [27, 1.0, -16], 0.28, 6);
    strut(k, 'dark', [14, 2.0, -19], [27, 2.0, -16], 0.18, 6);
    for (let h = 0.5; h < 8; h += 0.5) k.box('dark', [0.7, 0.05, 0.05], [-29.5, h, -11.4]);
    k.box('dark', [0.06, 8, 0.06], [-29.8, 4, -11.4]); k.box('dark', [0.06, 8, 0.06], [-29.2, 4, -11.4]);
    k.greebles('dark', rnd, -16, 14, -13.5, -12, 7.6, 10, 0.5);
    this.root.add(k.build(yardMats(), 0.6));
  }

  /** The rings and the lights of the work. */
  private lights(): void {
    this.ring = flatRing(20, 0.28, CYAN, 0.5);
    this.ring.position.y = 1.7;
    this.pad = flatRing(8, 0.16, CYAN, 0.4);
    this.pad.position.y = 0.2;
    this.root.add(this.ring, this.pad);
    this.done = true;
  }

  // ── each frame ─────────────────────────────────────────────────────────

  /** Whether the yard shows at all: the hull is due, or she has been (the yard stays). */
  private wanted(world: World): boolean {
    return !!world.bk?.yard && !!world.bk.def.first && (paintDue(world.flags) || world.flags.has(RENAMED));
  }

  update(world: World, dt: number, fx: Effects): void {
    const y = world.bk?.yard;
    // build a piece a frame once the first system is entered, so the hitch is never one big one (and never at Sam's code)
    if (y && world.bk!.def.first && !this.done) { if (!this.staged) this.plan(); this.stages.shift()?.(); }
    // always visible: a hidden light is not counted, and the count changing relinks every lit material (intensity 0 does the work)
    this.lightsG.visible = true;
    if (!this.done || !this.wanted(world) || !y) { this.root.visible = false; this.beaconLight && (this.beaconLight.intensity = 0); this.lamp && (this.lamp.intensity = 0); this.fill && (this.fill.intensity = 0); this.hangar && (this.hangar.intensity = 0); return; }
    this.root.position.set(y.x, FLOOR, y.z);
    // the open front faces the way she comes (the company's dock), and the rock stands behind
    const from = world.bk!.audit ?? { x: 0, z: 0 };
    this.root.rotation.y = Math.atan2(from.x - y.x, from.z - y.z);
    this.lightsG.position.copy(this.root.position);
    this.lightsG.rotation.y = this.root.rotation.y;
    this.fill.intensity = 160;
    this.hangar.intensity = 60;
    this.root.visible = true;
    this.time += dt;
    const waiting = paintDue(world.flags);
    const zap = world.yardPhase === 2, e = world.yardAt !== Infinity ? 99 : zap ? world.yardT : 0;
    // the beacon pulses slowly while the hull waits for the yard, and is steady after
    this.beacon.opacity = waiting ? 0.6 + 0.4 * Math.sin(this.time * 2.4) : 0.55;
    this.beaconLight.intensity = waiting ? 5 + 5 * Math.sin(this.time * 2.4) : 2;
    // the ring: it pulses, and fills as she holds in it
    const hold = world.yardPhase >= 2 ? 1 : world.yardPhase === 1 ? 0.4 : 0;
    (this.ring.material as MeshBasicMaterial).opacity = waiting ? 0.3 + 0.2 * Math.sin(this.time * 2.4) + 0.4 * hold : 0.12;
    (this.pad.material as MeshBasicMaterial).opacity = waiting ? 0.3 + 0.3 * hold : 0.1;
    // after the work, the three arches light in turn: scan teal, spray amber, mark white
    const s = [within(e, SEQ.scan), within(e, SEQ.spray), within(e, SEQ.mark)] as const;
    const flick = 0.55 + 0.45 * Math.abs(Math.sin(this.time * 19) * Math.sin(this.time * 7.3));
    this.strips.forEach((m, i) => { m.opacity = 0.12 + 0.8 * s[i]! * (i === 0 ? 1 : flick); });
    this.nozzles.opacity = 0.2 + 0.8 * s[1] * flick;
    this.mists.forEach((m) => { (m.material as MeshBasicMaterial).opacity = 0.2 * s[1] * flick; m.visible = false; });
    const k = s[0] > 0.02 ? 0 : s[1] > 0.02 ? 1 : s[2] > 0.02 ? 2 : -1;
    this.lamp.color.setHex(k === 0 ? TEAL : k === 2 ? WHITE : AMBER);
    this.lamp.intensity = k < 0 ? 90 : 200;
    // lightning from the arches to the hull while she is held: more bolts as it goes, sparks on the hull, the lamp flaring white
    this.bolt.visible = zap;
    if (zap) {
      const prog = Math.min(1, world.yardT / YARD_ZAP);
      this.boltT -= dt;
      if (this.boltT <= 0) {
        this.boltT = 0.05;
        const th = this.root.rotation.y, c = Math.cos(th), sn = Math.sin(th), dx = world.ship.x - y.x, dz = world.ship.z - y.z;
        const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
        const pos = (this.bolt.geometry.getAttribute('position') as BufferAttribute);
        const live = Math.min(BOLTS, 1 + Math.floor(prog * BOLTS * (0.6 + Math.random() * 0.6)));
        for (let b = 0; b < BOLTS; b++) {
          const a0 = ANCHORS[(b + Math.floor(Math.random() * 4)) % 4]!, tx = lx + (Math.random() - 0.5) * 3, ty = 0.4 + Math.random() * 1.6, tz = lz + (Math.random() - 0.5) * 3;
          let px = a0[0], py = a0[1], pz = a0[2];
          for (let i = 0; i < SEGS; i++) {
            const f = (i + 1) / SEGS, jit = 1.1 * Math.sin(Math.PI * f) * (i === SEGS - 1 ? 0 : 1);
            const nx = a0[0] + (tx - a0[0]) * f + (Math.random() - 0.5) * jit * 2, ny = a0[1] + (ty - a0[1]) * f + (Math.random() - 0.5) * jit * 1.4, nz = a0[2] + (tz - a0[2]) * f + (Math.random() - 0.5) * jit * 2;
            pos.setXYZ(b * SEGS * 2 + i * 2, px, py, pz);
            pos.setXYZ(b * SEGS * 2 + i * 2 + 1, nx, ny, nz);
            px = nx; py = ny; pz = nz;
          }
        }
        pos.needsUpdate = true;
        this.bolt.geometry.setDrawRange(0, live * SEGS * 2);
      }
      (this.bolt.material as LineBasicMaterial).opacity = 0.5 + 0.5 * flick;
      this.lamp.color.setHex(WHITE);
      this.lamp.intensity = 150 + 350 * prog * flick;
      if (dt > 0 && this.mist-- <= 0) { this.mist = 3; fx.burst(world.ship.x + (Math.random() - 0.5) * 3, 1.2, world.ship.z + (Math.random() - 0.5) * 3, 3, [1.2, 2.2, 2.8], 3, 0.2, 0.4); }
    }
  }
}
