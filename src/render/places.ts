import { AdditiveBlending, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry, DoubleSide, type Material, type Scene } from 'three';
import type { World } from '../sim/world';
import type { PlaceLook } from '../sim/places';
import { materials, windowMaterial, windowRow } from './breakout';
import type { Effects } from './fx';
import { Kit, metal, seeded } from './kit';

// ── the story's places ────────────────────────────────────────────────────
// What she can see where a beat happens (sim/places.ts): a small hull to hold
// alongside, a broken one to read, a canister to take aboard, a buoy. Each
// stands in a teal ring on the plane (teal is information, brand v1.1) that
// fills as she holds; a pickup has a slow beacon instead and comes aboard with
// a flash. One place shows at a time; each look is built once, on first use.

const TEAL = new Color(0.25, 1.1, 1.25);
/** The rings' width (units), and their radius round each look. */
const RING_W = 0.14;
const SNUG: Record<PlaceLook, number> = { skiff: 5, wreck: 6, canister: 2.2, buoy: 3 };
const BEACON = new Color(0.4, 1.6, 1.8);

let placeMats: Record<string, Material> | null = null;
function mats(): Record<string, Material> {
  if (placeMats) return placeMats;
  placeMats = {
    ...materials(),
    pale: metal({ tint: 0xb9b6ad, roughness: 0.6, metalness: 0.35, worn: 0.45 }),
    burnt: metal({ tint: 0x4a4440, roughness: 0.8, metalness: 0.3, worn: 0.7 }),
    win: windowMaterial(),
  };
  return placeMats;
}

/** A small private hull: a rounded cabin, one drive, lit ports. About the ship's size. */
function skiff(): Group {
  const k = new Kit(), rnd = seeded(7);
  k.cyl('pale', 0.55, 0.55, 2.4, [0, 0, 0], 'x', 14);
  k.cyl('pale', 0.55, 0.2, 0.7, [1.55, 0, 0], 'x', 14);
  k.cyl('dark', 0.42, 0.5, 0.5, [-1.45, 0, 0], 'x', 12, true);
  k.box('slate', [0.9, 0.34, 0.6], [0.2, 0.55, 0]);
  windowRow(k, rnd, [-0.6, 0.12, 0.56], [0.9, 0.12, 0.56], 5, [0.14, 0.12, 0.04], [0, 0, 0], 0.2);
  windowRow(k, rnd, [-0.6, 0.12, -0.56], [0.9, 0.12, -0.56], 5, [0.14, 0.12, 0.04], [0, 0, 0], 0.2);
  k.box('dark', [0.06, 0.6, 0.06], [-0.6, 0.85, 0]);
  k.box('lamp', [0.07, 0.07, 0.07], [1.2, 0.3, 0.45]);
  return scaled(k.build(mats(), 0.5), 1.8);
}

/** A broken hull, cold: a keel, a split mid-section, ribs showing, a drive pod torn half away. */
function wreck(): Group {
  const k = new Kit(), rnd = seeded(19);
  k.box('burnt', [2.2, 0.8, 1.2], [0.9, 0, 0]);
  k.box('burnt', [1.4, 0.7, 1.1], [-1.6, -0.05, 0.15], [0, 0.18, 0.06]);
  for (let i = 0; i < 4; i++) k.box('dark', [0.07, 0.9, 1.3], [-0.55 + i * 0.22, 0, 0]);
  k.box('dark', [3.8, 0.18, 0.4], [0, -0.5, 0]);
  k.cyl('burnt', 0.4, 0.4, 1.4, [-1.4, -0.1, 0.95], 'x', 10);
  k.greebles('dark', rnd, -0.2, 1.8, -0.5, 0.5, 0.41, 10, 0.12);
  return scaled(k.build(mats(), 0.5), 2);
}

/** A sealed paper canister: a short drum with bands, small enough to come aboard. */
function canister(): Group {
  const k = new Kit();
  k.cyl('pale', 0.28, 0.28, 0.7, [0, 0, 0], 'x', 14);
  k.ring('dark', 0.29, 0.03, [0.22, 0, 0], 'x', 14);
  k.ring('dark', 0.29, 0.03, [-0.22, 0, 0], 'x', 14);
  k.cyl('dark', 0.12, 0.12, 0.08, [0.38, 0, 0], 'x', 10);
  return scaled(k.build(mats(), 0.4), 1.4);
}

/** A marker buoy: a mast on a float, a lamp at the top. */
function buoy(): Group {
  const k = new Kit();
  k.cyl('slate', 0.35, 0.45, 0.5, [0, -0.2, 0], 'y', 12);
  k.cyl('dark', 0.05, 0.05, 1.6, [0, 0.8, 0], 'y', 8);
  k.box('lamp', [0.12, 0.12, 0.12], [0, 1.65, 0]);
  return scaled(k.build(mats(), 0.4), 1.6);
}

/** A look at its size in the world: the skiff about her length, the wreck a little more, a canister she could fit in her hold. */
function scaled(g: Group, k: number): Group { g.scale.setScalar(k); return g; }

const BUILD: Record<PlaceLook, () => Group> = { skiff, wreck, canister, buoy };

export class PlaceView {
  private readonly root = new Group();
  private readonly looks = new Map<PlaceLook, Group>();
  private readonly ring: Mesh;
  private readonly fill: Mesh;
  private readonly beacon: Mesh;
  private time = 0;
  private shown = '';
  private ringR = 0;
  private fillAt = -1;

  constructor(private readonly scene: Scene) {
    this.root.visible = false;
    const flat = (opacity: number) => {
      const m = new Mesh(new RingGeometry(0.9, 1, 64), new MeshBasicMaterial({ color: TEAL.clone(), transparent: true, opacity, side: DoubleSide, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.35;
      return m;
    };
    // the ring and, inside it, the part of the hold already done (a thin arc that grows round)
    this.ring = flat(0.14);
    this.fill = flat(0.4);
    this.beacon = new Mesh(new CylinderGeometry(0.08, 0.08, 0.14, 8), new MeshBasicMaterial({ color: BEACON.clone(), transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    this.root.add(this.ring, this.fill, this.beacon);
    scene.add(this.root);
  }

  private look(l: PlaceLook): Group {
    let g = this.looks.get(l);
    if (!g) { g = BUILD[l](); this.looks.set(l, g); this.root.add(g); }
    return g;
  }

  update(world: World, dt: number): void {
    const sp = world.storyPlace;
    if (!sp) { this.root.visible = false; this.shown = ''; return; }
    this.time += dt;
    this.root.visible = true;
    this.root.position.set(sp.x, 0, sp.z);
    const g = this.look(sp.def.look);
    for (const [l, m] of this.looks) m.visible = l === sp.def.look;
    if (this.shown !== sp.def.id) {
      this.shown = sp.def.id;
      // each place sits at its own angle, so two of the same look never read as one
      g.rotation.y = (sp.def.id.length * 1.7) % (Math.PI * 2);
    }
    // a slow drift, so a dead hull still reads as adrift
    g.position.y = 0.15 * Math.sin(this.time * 0.6);
    g.rotation.z = 0.04 * Math.sin(this.time * 0.4);
    const pickup = 'pickup' in sp.def.act;
    // a hairline ring close round the thing itself (not the hold's full reach, which would cut under the camera): it says "here",
    // and fills as she holds; the HUD counts the seconds
    const r = SNUG[sp.def.look];
    if (this.ringR !== r) {
      this.ringR = r;
      this.ring.geometry.dispose();
      this.ring.geometry = new RingGeometry(r - RING_W, r, 96);
      this.fillAt = -1;
    }
    (this.ring.material as MeshBasicMaterial).opacity = 0.1 + 0.05 * Math.sin(this.time * 1.6);
    // the hold fills a second hairline just inside it: an arc that grows round as she holds
    const held = sp.held;
    this.fill.visible = !pickup && held > 0.01;
    if (this.fill.visible && Math.abs(this.fillAt - held) > 0.01) {
      this.fillAt = held;
      this.fill.geometry.dispose();
      this.fill.geometry = new RingGeometry(r - RING_W * 3, r - RING_W * 1.6, 96, 1, Math.PI / 2, held * Math.PI * 2);
    }
    this.beacon.visible = pickup || sp.def.look === 'skiff';
    this.beacon.position.set(0, pickup ? 1.1 : 2.0, 0);
    (this.beacon.material as MeshBasicMaterial).opacity = Math.sin(this.time * 3.1) > 0.4 ? 1 : 0.18;
  }

  /** A place is done: a pickup comes aboard with a small teal flash; a hold ends with a soft pulse. */
  done(x: number, z: number, pickup: boolean, fx: Effects): void {
    fx.flash(x, 0.4, z, pickup ? 1.4 : 2.4, [0.6, 2.2, 2.4], 0.14);
    if (pickup) fx.burst(x, 0.4, z, 10, [0.5, 1.8, 2], 5, 0.12, 0.35);
  }

  dispose(): void { this.scene.remove(this.root); }
}
