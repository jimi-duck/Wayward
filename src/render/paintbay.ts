import { AdditiveBlending, BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, type PerspectiveCamera, type Scene } from 'three';
import { BAY, bayAt, bayFrame, bayTimes } from '../sim/paintbay';
import { paintDue } from '../sim/postjump';
import type { World } from '../sim/world';
import { materials } from './breakout';
import type { Effects } from './fx';
import { Kit } from './kit';

// ── the paint bay ─────────────────────────────────────────────────────────
// An open work pad marked out beside the Frontier Supply Depot (sim/paintbay.ts), part of the depot's own kit: a deck with hazard
// edges and guide lights, a pylon at each corner, a gate arch at each end, a gantry overhead with a spray head that sweeps the hull,
// and a light curtain across each gate that shuts while the work goes on. No building, no people: owner, 5 November 2026. It is built
// once, when the paint is due, and stays after. Every move comes from `bayFrame`, the same numbers the ship is flown by.
// The deck is at y = FLOOR, the ship's plane at 0.

const FLOOR = -1.3;
const WORK = new Color(3.4, 1.9, 0.5);

export class PaintBayView {
  private readonly root = new Group();
  private built = false;
    private glow: MeshBasicMaterial[] = [];
  private gap!: Mesh;
  private head!: Mesh;
  private curtains: Mesh[] = [];
  private time = 0;
  private lamp!: PointLight;
  private mist = 0;

  constructor(private readonly scene: Scene) {
    this.root.visible = false;
    scene.add(this.root);
  }

  private build(): void {
    this.built = true;
    const L = BAY.halfLen, W = BAY.halfWid;
    const k = new Kit();
    // the deck, with a hazard edge down each long side and a row of guide lights along the line she flies in on
    k.box('floor', [L * 2 + 4, 0.4, W * 2 + 2], [0, FLOOR - 0.2, 0]);
    for (const s of [-1, 1]) {
      k.box('paint', [L * 2 + 4, 0.08, 0.5], [0, FLOOR + 0.04, s * (W + 0.25)]);
      k.box('dark', [L * 2 + 4, 0.5, 0.3], [0, FLOOR - 0.25, s * (W + 1.1)]);
    }
    for (let i = -6; i <= 6; i++) k.box('lamp', [0.5, 0.05, 0.14], [i * 1.2, FLOOR + 0.06, 0]);
    // a pylon at each corner, a gate arch at each end, and the gantry overhead on rails
    for (const x of [-L, L]) for (const z of [-W, W]) {
      k.box('hull', [0.5, 3.4, 0.5], [x, FLOOR + 1.7, z]);
      k.box('paint', [0.56, 0.5, 0.56], [x, FLOOR + 0.5, z]);
      k.box('lamp', [0.22, 0.22, 0.22], [x, FLOOR + 3.5, z]);
    }
    for (const x of [-L, L]) {
      k.box('hull', [0.4, 0.5, W * 2 + 0.6], [x, FLOOR + 3.1, 0]);
      k.box('lamp', [0.18, 0.12, 2.4], [x + Math.sign(x) * 0.3, FLOOR + 3.1, 0]);
    }
    for (const z of [-W, W]) {
      k.box('hull', [L * 2, 0.4, 0.4], [0, FLOOR + 3.4, z]);
      for (let i = -3; i <= 3; i++) k.box('dark', [0.1, 0.5, 0.42], [i * 2, FLOOR + 3.4, z]);
    }
    // a service line from the pad to the depot: a low spine with a light on a post every few units, and a cable between them
    for (let x = L + 6; x < 44; x += 6) {
      k.box('dark', [0.2, 1.1, 0.2], [x, FLOOR + 0.55, BAY.halfWid + 1.6]);
      k.box('amber', [0.3, 0.12, 0.3], [x, FLOOR + 1.15, BAY.halfWid + 1.6]);
    }
    k.box('dark', [44 - L, 0.12, 0.12], [(44 + L) / 2, FLOOR + 0.5, BAY.halfWid + 1.6]);
    // our own steel and concrete: the fleet's shared 'hull' and 'dark' read black beside the depot's lights, and the deck read white
    const steel = new MeshStandardMaterial({ color: 0x8a949e, roughness: 0.7, metalness: 0.2, emissive: new Color(0.07, 0.085, 0.1) });
    const shade = new MeshStandardMaterial({ color: 0x474d55, roughness: 0.65, metalness: 0.25, emissive: new Color(0.03, 0.035, 0.042) });
    const concrete = new MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.95, metalness: 0, emissive: new Color(0.008, 0.008, 0.008) });
    this.root.add(k.build({ ...materials(), hull: steel, dark: shade, floor: concrete }, 0.3));

    // the spray head: a bar across the pad under the gantry, with a work light beneath it, that sweeps the hull while the paint goes on
    this.head = new Mesh(new BoxGeometry(0.5, 0.3, W * 2 - 0.4), shade);
    this.head.position.set(0, FLOOR + 3.4, 0);
    const beam = new Mesh(new BoxGeometry(0.16, 0.08, W * 2 - 0.8), new MeshBasicMaterial({ color: WORK.clone(), toneMapped: false, fog: false }));
    beam.position.y = -0.2;
    this.head.add(beam);
    this.glow = [beam.material as MeshBasicMaterial];
    this.head.visible = false;
    this.root.add(this.head);

    // a light curtain across each gate: shut while she is inside, so the pad reads as closed off
    for (const x of [-L, L]) {
      const m = new Mesh(new BoxGeometry(0.05, 3.0, W * 2 - 0.6), new MeshBasicMaterial({ color: new Color(1.2, 0.7, 0.2), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
      m.position.set(x, FLOOR + 1.5, 0);
      m.visible = false;
      this.curtains.push(m);
      this.root.add(m);
    }

    // the pad's own light: it comes up with the work, so the ship and the deck are lit from above
    this.lamp = new PointLight(0xffd9a0, 0, 20, 1.6);
    this.lamp.position.set(0, FLOOR + 5, 0);
    this.root.add(this.lamp);
  }

  /** Whether the pad shows at all: the paint is due or on its way, or the scene is running. */
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
    const working = !!f?.working;
    // the light curtains: the near one comes down as she is in, the far one lifts when the paint is on; both gone after the scene
    const curtain = [f ? f.near : 0, f ? f.far : 0];
    const flick = working ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 19) * Math.sin(this.time * 7.3)) : 0.12;
    this.curtains.forEach((m, i) => {
      m.visible = curtain[i]! > 0.02;
      (m.material as MeshBasicMaterial).opacity = curtain[i]! * (working ? 0.1 + 0.1 * flick : 0.06);
    });
    // the spray head sweeps the length of the hull and back while the work goes on
    this.head.visible = working;
    if (working && tm && b) {
      const u = (b.e - tm.inside) / (tm.paint - tm.inside);
      this.head.position.x = Math.sin(u * Math.PI * 3) * (BAY.halfLen - 2.5);
    }
    for (const m of this.glow) m.color.copy(WORK).multiplyScalar(flick);
    // a little vapour off the hull under the head, and the odd spark at the far gate as the curtain lifts
    if (working && dt > 0 && (this.mist -= dt) <= 0) {
      this.mist = 0.09;
      fx.burst(c.x + this.head.position.x, FLOOR + 1.2, c.z + (Math.random() - 0.5) * 5, 3, [0.8, 0.72, 0.55], 1.6, 1.2, 1.4);
    }
    if (f && tm && b && b.e > tm.paint && b.e < tm.paint + 1 && dt > 0 && Math.random() < dt * 14) fx.burst(c.x + BAY.halfLen, FLOOR + 0.3, c.z, 2, [1.6, 1.1, 0.4], 3, 0.25, 0.4);
    this.lamp.intensity = f ? (f.near > 0.5 || f.far < 0.5 ? 14 : 4) : 0;
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
      camera.position.set(c.x - 15 + u * 4, 5.2 - u * 1.2, c.z + 15 - u * 3);
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
