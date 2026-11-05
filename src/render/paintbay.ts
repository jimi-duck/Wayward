import { BoxGeometry, BufferGeometry, CapsuleGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, SphereGeometry, Vector3, type PerspectiveCamera, type Scene } from 'three';
import { BAY, bayAt, bayFrame, bayTimes } from '../sim/paintbay';
import { paintDue } from '../sim/postjump';
import type { World } from '../sim/world';
import { materials } from './breakout';
import type { Effects } from './fx';
import { Kit } from './kit';

// ── the paint shed ────────────────────────────────────────────────────────
// A garage beside the depot (sim/paintbay.ts): two end doors with roller shutters, a lit roof, a slit of work light down each flank, a
// side door, and the painter. It is built once, when the paint is due, and stands there after (the depot's own workshop). Every move
// comes from `bayFrame`, the same numbers the ship is flown by, so the shutters, the lamps and the camera cannot drift from her.
// The floor is at y = FLOOR, the ship's plane at 0.

const FLOOR = -1.3, ROOF = 3.9;
const WORK = new Color(3.4, 1.9, 0.5);
const DOOR_H = ROOF - FLOOR - 0.9;

const box = (w: number, h: number, d: number, m: MeshBasicMaterial | MeshStandardMaterial): Mesh => new Mesh(new BoxGeometry(w, h, d), m);

/** The painter: a worker in faded work overalls, hi-vis stripes, a hard hat, a half-mask and gloves; one arm lifts for the wave. Faces +x. */
function painterBody(): { root: Group; arm: Group; legs: [Group, Group] } {
  const cloth = new MeshStandardMaterial({ color: 0x5b5e52, roughness: 0.92 });
  const dark = new MeshStandardMaterial({ color: 0x2a2b2b, roughness: 0.85 });
  const vis = new MeshStandardMaterial({ color: 0xb59a2a, roughness: 0.7, emissive: new Color(0.05, 0.04, 0.01) });
  const hat = new MeshStandardMaterial({ color: 0xc9c6b8, roughness: 0.5, metalness: 0.1 });
  const skin = new MeshStandardMaterial({ color: 0x8a6a56, roughness: 0.8 });
  const glass = new MeshStandardMaterial({ color: 0x10181c, roughness: 0.15, metalness: 0.8 });
  const root = new Group();
  const part = (g: BufferGeometry, m: MeshStandardMaterial, x: number, y: number, z: number, parent: Group = root): Mesh => {
    const o = new Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o;
  };
  // legs hang from the hip, so they can swing
  const leg = (z: number): Group => {
    const g = new Group(); g.position.set(0, 0.46, z); root.add(g);
    part(new CapsuleGeometry(0.075, 0.3, 4, 8), cloth, 0, -0.2, 0, g);
    part(new BoxGeometry(0.22, 0.1, 0.12), dark, 0.04, -0.43, 0, g);
    return g;
  };
  const l1 = leg(0.09), l2 = leg(-0.09);
  const torso = part(new CapsuleGeometry(0.15, 0.22, 4, 10), cloth, 0, 0.74, 0); torso.scale.z = 1.2;
  part(new CylinderGeometry(0.162, 0.162, 0.05, 12), vis, 0, 0.7, 0).scale.z = 1.2;
  part(new CylinderGeometry(0.162, 0.162, 0.05, 12), vis, 0, 0.82, 0).scale.z = 1.2;
  part(new BoxGeometry(0.12, 0.1, 0.1), dark, 0.13, 0.5, 0.14); // a tool pouch
  part(new SphereGeometry(0.075, 8, 6), skin, 0, 1.02, 0).scale.set(0.7, 0.7, 0.7);
  part(new CapsuleGeometry(0.1, 0.04, 4, 10), skin, 0.01, 1.12, 0);
  const cap = part(new SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0.01, 1.16, 0); cap.scale.set(1.1, 0.9, 1.05);
  part(new BoxGeometry(0.1, 0.02, 0.2), hat, 0.1, 1.15, 0);
  part(new BoxGeometry(0.05, 0.08, 0.15), glass, 0.1, 1.1, 0); // the mask
  // the resting arm, and the waving one from the shoulder
  const rest = new Group(); rest.position.set(0, 0.88, -0.22); root.add(rest); rest.rotation.z = 0.08;
  part(new CapsuleGeometry(0.058, 0.3, 4, 8), cloth, 0, -0.2, 0, rest);
  part(new SphereGeometry(0.06, 8, 6), dark, 0, -0.42, 0, rest);
  const arm = new Group(); arm.position.set(0, 0.88, 0.22);
  part(new CapsuleGeometry(0.058, 0.3, 4, 8), cloth, 0, -0.2, 0, arm);
  part(new SphereGeometry(0.06, 8, 6), dark, 0, -0.42, 0, arm);
  root.add(arm);
  root.scale.setScalar(1.45);
  return { root, arm, legs: [l1, l2] };
}

export class PaintBayView {
  private readonly root = new Group();
  private built = false;
  private near!: Mesh;
  private far!: Mesh;
  private glow: MeshBasicMaterial[] = [];
  private gap!: Mesh;
  private painter!: ReturnType<typeof painterBody>;
  private vents: Vector3[] = [];
  private time = 0;
  private lamp!: PointLight;
  private mist = 0;

  constructor(private readonly scene: Scene) {
    this.root.visible = false;
    scene.add(this.root);
  }

  private build(): void {
    this.built = true;
    const L = BAY.halfLen, W = BAY.halfWid, D = BAY.door;
    const k = new Kit();
    // the slab, the roof, the two flanks with a window of work light each, and the end walls round the doors
    k.box('floor', [L * 2 + 2, 0.4, W * 2 + 2], [0, FLOOR - 0.2, 0]);
    k.box('hull', [L * 2 + 1, 0.5, W * 2 + 1], [0, ROOF + 0.25, 0]);
    for (const s of [-1, 1]) {
      k.box('hull', [L * 2, ROOF - FLOOR, 0.4], [0, (ROOF + FLOOR) / 2, s * W]);
      k.box('amber', [L * 1.4, 0.16, 0.06], [0, 1.2, s * (W + 0.22)]);
      for (let i = -4; i <= 4; i++) k.box('lamp', [0.5, 0.14, 0.05], [i * 1.5, 2.5, s * (W + 0.22)]);
      // plating seams and a hazard band along the foot of each flank
      for (let i = -3; i <= 3; i++) k.box('dark', [0.08, ROOF - FLOOR, 0.44], [i * 2, (ROOF + FLOOR) / 2, s * W]);
      k.box('paint', [L * 2, 0.22, 0.46], [0, FLOOR + 0.25, s * W]);
    }
    for (const s of [-1, 1]) {
      const x = s * L;
      for (const z of [-1, 1]) k.box('hull', [0.4, ROOF - FLOOR, W - D], [x, (ROOF + FLOOR) / 2, z * (D + (W - D) / 2)]);
      k.box('hull', [0.4, ROOF - FLOOR - DOOR_H, D * 2], [x, ROOF - (ROOF - FLOOR - DOOR_H) / 2, 0]);
      // hazard stripes on the door posts, and a lamp over each door
      for (const z of [-1, 1]) k.box('paint', [0.46, DOOR_H, 0.28], [x, FLOOR + DOOR_H / 2, z * (D + 0.14)]);
      k.box('lamp', [0.2, 0.2, 0.9], [x + s * 0.3, ROOF - 0.6, 0]);
    }
    // a gantry, rails, and the nozzles' housing, seen only through the doors
    k.box('dark', [L * 1.8, 0.2, 0.3], [0, ROOF - 0.3, -2]);
    k.box('dark', [L * 1.8, 0.2, 0.3], [0, ROOF - 0.3, 2]);
    // roof vents: where the mist leaves
    for (const x of [-4, 0, 4]) { k.cyl('dark', 0.45, 0.55, 0.7, [x, ROOF + 0.85, 0], 'y', 8); this.vents.push(new Vector3(x, ROOF + 1.3, 0)); }
    // the side door, in the near flank
    k.box('lamp', [1.0, 0.1, 0.06], [1, 1.9, W + 0.22]);
    k.box('dark', [1.3, 2.4, 0.5], [1, FLOOR + 1.2, W + 0.1]);
    // an apron outside the side door: a deck on two struts, with a rail, so he has ground to stand on
    k.box('floor', [7, 0.25, 7], [1, FLOOR - 0.12, W + 3.9]);
    k.box('paint', [7, 0.06, 0.2], [1, FLOOR + 0.03, W + 7.3]);
    for (const x of [-2.4, 4.4]) { k.box('dark', [0.12, 0.9, 0.12], [x, FLOOR + 0.45, W + 7.3]); }
    k.box('dark', [6.9, 0.1, 0.1], [1, FLOOR + 0.9, W + 7.3]);
    // our own steel and concrete: the fleet's shared 'hull' and 'dark' read black beside the depot's lights, and the floor read white
    const steel = new MeshStandardMaterial({ color: 0x8a949e, roughness: 0.7, metalness: 0.2, emissive: new Color(0.07, 0.085, 0.1) });
    const shade = new MeshStandardMaterial({ color: 0x474d55, roughness: 0.65, metalness: 0.25, emissive: new Color(0.03, 0.035, 0.042) });
    const concrete = new MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.95, metalness: 0, emissive: new Color(0.008, 0.008, 0.008) });
    const shed = k.build({ ...materials(), hull: steel, dark: shade, floor: concrete }, 0.3);
    this.root.add(shed);

    const shutter = (): Mesh => box(0.3, DOOR_H, D * 2 + 0.2, shade);
    this.near = shutter(); this.far = shutter();
    this.near.position.x = -L; this.far.position.x = L;
    this.root.add(this.near, this.far);
    // a line of work light under each shutter, flickering while the paint goes on
    this.gap = new Mesh(new BoxGeometry(0.12, 0.1, D * 2), new MeshBasicMaterial({ color: WORK.clone(), toneMapped: false, fog: false }));
    this.glow = [this.gap.material as MeshBasicMaterial];
    this.gap.position.set(-L - 0.2, FLOOR + 0.1, 0);
    this.root.add(this.gap);

    // the shed's own light: it comes up with the work, so the ship and the floor are lit from inside
    this.lamp = new PointLight(0xffd9a0, 0, 16, 1.6);
    this.lamp.position.set(0, ROOF - 0.9, 0);
    this.root.add(this.lamp);

    this.painter = painterBody();
    this.painter.root.visible = false;
    this.root.add(this.painter.root);
  }

  /** Whether the shed shows at all: the paint is due or on its way, or the scene is running. */
  private wanted(world: World): boolean {
    return !!world.bk?.port && !!world.bk.def.first && (paintDue(world.flags) || !!world.bay || world.flags.has('hull_repainted'));
  }

  update(world: World, dt: number, fx: Effects): void {
    if (!this.wanted(world)) { this.root.visible = false; return; }
    if (!this.built) this.build();
    const c = bayAt(world.bk!.port!);
    this.root.position.set(c.x, 0, c.z);
    this.root.visible = true;
    this.time += dt;
    const b = world.bay, f = b ? bayFrame(b) : null;
    const tm = b ? bayTimes(b) : null;
    // shutters: the near one is up until she is in, then down for good; the far one stays down until the paint is on (after the scene: up)
    const near = f ? f.near : b === null && world.flags.has('hull_repainted') ? 1 : 0;
    const far = f ? f.far : b === null && world.flags.has('hull_repainted') ? 0 : 1;
    // a roller shutter: shut is the full height, and it rolls up into the lintel (its top stays put)
    for (const [m, shut] of [[this.near, near], [this.far, far]] as const) {
      m.visible = shut > 0.01;
      m.scale.y = Math.max(0.001, shut);
      m.position.y = FLOOR + DOOR_H - (DOOR_H * shut) / 2;
    }
    // the work light strobes while the paint goes on
    const working = !!f?.working;
    const flick = working ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 19) * Math.sin(this.time * 7.3)) : 0.12;
    for (const m of this.glow) m.color.copy(WORK).multiplyScalar(flick);
    this.gap.visible = near > 0.5 && far > 0.5 && working;
    // the mist off the roof vents, and the odd spark at the far door as the shutter lifts
    if (working && dt > 0 && (this.mist -= dt) <= 0) {
      this.mist = 0.09;
      const v = this.vents[Math.floor(Math.random() * this.vents.length)]!;
      fx.burst(c.x + v.x, v.y, c.z + v.z, 4, [0.75, 0.7, 0.6], 1.8, 1.4, 1.8);
    }
    if (f && tm && b && b.e > tm.paint && b.e < tm.paint + 1 && dt > 0 && Math.random() < dt * 14) fx.burst(c.x + BAY.halfLen, FLOOR + 0.3, c.z, 2, [1.6, 1.1, 0.4], 3, 0.25, 0.4);
    // the painter: out of the side door, standing off the flank, a wave when she is out, and back in
    this.lamp.intensity = f ? (f.near > 0.5 || f.far < 0.5 ? 14 : 4) : 0;
    const p = this.painter;
    if (f && f.painter > 0.01) {
      p.root.visible = true;
      const u = f.painter;
      p.root.position.set(1, FLOOR, BAY.halfWid + 0.6 + u * 3.4);
      p.root.rotation.y = Math.PI / 2;
      p.arm.rotation.z = f.wave > 0 ? -2.3 + Math.sin(this.time * 9) * 0.35 * f.wave : -0.1;
      const walk = u < 0.98 ? Math.sin(this.time * 9) * 0.35 : 0;
      p.legs[0].rotation.z = walk; p.legs[1].rotation.z = -walk;
    } else p.root.visible = false;
  }

  /**
   * The cut scene's cameras: the shed from the near side as she comes in and while the work goes on, then the far door as the
   * shutter lifts. Returns whether the camera was taken over (then the chase camera is not used for this frame).
   */
  cine(world: World, camera: PerspectiveCamera): boolean {
    const b = world.bay;
    if (!b) return false;
    const f = bayFrame(b), tm = bayTimes(b);
    if (f.shot === 0) return false;
    const c = b.c, s = world.ship;
    if (f.shot === 1) {
      const u = Math.min(1, Math.max(0, (b.e - (tm.mouth - 0.2)) / (tm.paint - tm.mouth)));
      camera.position.set(c.x - 19 + u * 5, 5.6 - u * 1.2, c.z + 19 - u * 3.5);
      const track = Math.min(1, Math.max(0, (b.e - tm.mouth) / BAY_LOOK));
      camera.lookAt(s.x + (c.x + 1 - s.x) * track, 0.6, s.z + (c.z + 2 - s.z) * track);
    } else {
      const u = Math.min(1, Math.max(0, (b.e - tm.paint) / (tm.release - tm.paint + 0.4)));
      camera.position.set(c.x + 21 + u * 3, 2.6, c.z + 9 - u * 2);
      camera.lookAt(c.x + 9 + u * 7, 0.4, c.z - 0.5);
    }
    camera.updateMatrixWorld();
    return true;
  }
}

/** Seconds over which the first camera's eye moves from the ship to the shed as she comes in. */
const BAY_LOOK = 1.6;
