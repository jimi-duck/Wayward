import {
  AdditiveBlending, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry, Sprite, SpriteMaterial,
  type Material, type Scene, type Texture,
} from 'three';
import { clamp } from '../core/math';
import { JUMP_COST } from '../sim/breakout';
import type { World } from '../sim/world';
import type { Effects, RGB } from './fx';
import { Kit, metal, seeded } from './kit';

// ── the Breakout's places, and the cutter ────────────────────────────────
// The lane mouth: an old Accord gate, a ring of dead pylons round a slow
// amber swirl, lighting up as the drive spools. The port: Frontier Supply, a
// squat fuel depot on a rock-anchored spine, its docking ring drawn on the
// plane in cyan. The cutter: an amber beam from the bow to the rock under
// it, going white and then red as the rock heats, sparks where it bites.

const AMBER = new Color(3.6, 2, 0.45);
const CYAN = new Color(0.4, 2.4, 3.2);
const SPARK: RGB = [3.8, 2.4, 0.8];
const HOT: RGB = [4, 1.2, 0.4];

let mats: Record<string, Material> | null = null;
function materials(): Record<string, Material> {
  if (mats) return mats;
  mats = {
    hull: metal({ tint: 0x7d8288, roughness: 0.7, metalness: 0.4 }),
    paint: metal({ tint: 0xf2b21f, roughness: 0.62, metalness: 0.06 }),
    dark: metal({ tint: 0x3e3c3a, roughness: 0.55, metalness: 0.6, scale: 1.4 }),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.4, 1.5), toneMapped: false }),
    amber: new MeshBasicMaterial({ color: AMBER, toneMapped: false }),
    cyan: new MeshBasicMaterial({ color: CYAN, toneMapped: false }),
  };
  return mats;
}

/** The gate: twelve pylons on a broken ring, the throat between them. Kit units are world units here. */
function buildLane(): Group {
  const k = new Kit(), rnd = seeded(7731);
  const R = 18;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const tall = 5 + rnd() * 4;
    k.box('dark', [2.2, tall, 2.2], [x, tall / 2 - 1, z], [0, -a, 0]);
    k.box('paint', [2.4, 0.6, 2.4], [x, tall - 1.2, z], [0, -a, 0]);
    k.box('amber', [0.3, tall * 0.7, 0.3], [x * 0.94, tall / 2 - 0.5, z * 0.94], [0, -a, 0]);
    k.box('lamp', [0.5, 0.5, 0.5], [x, tall - 0.5, z]);
    // the broken ring between the pylons: some spans still standing
    if (rnd() < 0.7) {
      const b = a + Math.PI / 12, len = 2 * R * Math.sin(Math.PI / 12) * 0.9;
      k.box('hull', [1, 0.8, len], [Math.cos(b) * R, 0.5, Math.sin(b) * R], [0, -b, 0]);
    }
  }
  k.greebles('dark', rnd, -R - 4, R + 4, -R - 4, -R + 2, -0.6, 10, 1.2);
  return k.build(materials());
}

/** The depot: a hub on a spine, tanks, a crane, a beacon tower, lit windows. */
function buildPort(): Group {
  const k = new Kit(), rnd = seeded(9);
  k.cyl('hull', 4.5, 5.5, 3, [0, 0, 0], 'y', 24);
  k.cyl('dark', 5.6, 5.6, 0.4, [0, -1.2, 0], 'y', 24);
  k.cyl('paint', 3, 3.6, 1.6, [0, 2.2, 0], 'y', 16);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.box('lamp', [0.3, 0.2, 0.3], [Math.cos(a) * 4.6, 0.6, Math.sin(a) * 4.6]); }
  // fuel tanks round the hub, hazard yellow
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    k.cyl('paint', 1.6, 1.6, 4, [Math.cos(a) * 8.5, 0.3, Math.sin(a) * 8.5], 'y', 14);
    k.cyl('dark', 1.7, 1.7, 0.3, [Math.cos(a) * 8.5, 2.3, Math.sin(a) * 8.5], 'y', 14);
    k.box('dark', [4, 0.5, 0.6], [Math.cos(a) * 6.5, 0, Math.sin(a) * 6.5], [0, -a, 0]);
  }
  // the beacon tower: the red light you steer for
  k.box('dark', [0.8, 12, 0.8], [-3, 6, -3]);
  k.box('amber', [0.25, 10, 0.25], [-3.45, 6, -3]);
  k.box('lamp', [1.2, 1.2, 1.2], [-3, 12.6, -3]);
  // a crane over the berth
  k.box('dark', [0.6, 7, 0.6], [4, 3.5, 4]);
  k.box('paint', [9, 0.6, 0.8], [0.5, 7, 4], [0, 0.3, 0]);
  k.greebles('hull', rnd, -4, 4, -4, 4, 1.6, 12, 0.8);
  return k.build(materials());
}

function flatRing(r: number, w: number, color: Color, opacity: number): Mesh {
  const m = new Mesh(new RingGeometry(r - w, r, 64), new MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export class BreakoutView {
  private readonly lane = new Group();
  private readonly port = new Group();
  private readonly throat: Mesh;
  private readonly laneRing: Mesh;
  private readonly portRing: Mesh;
  private readonly beam: Mesh;
  private readonly bite: Sprite;
  private time = 0;

  constructor(scene: Scene, glow: Texture) {
    this.lane.add(buildLane());
    this.throat = new Mesh(new RingGeometry(3, 15.5, 48, 1), new MeshBasicMaterial({ color: AMBER, toneMapped: false, transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }));
    this.throat.rotation.x = -Math.PI / 2;
    this.laneRing = flatRing(16, 0.35, AMBER, 0.7);
    this.lane.add(this.throat, this.laneRing);
    // the depot stands off to one side of its berth; the cyan ring is where you dock
    const depot = buildPort();
    depot.position.set(17, 0, -6);
    this.port.add(depot);
    this.portRing = flatRing(9, 0.25, CYAN, 0.6);
    this.portRing.position.y = 1.4;
    this.port.add(this.portRing);
    this.lane.visible = this.port.visible = false;
    scene.add(this.lane, this.port);

    this.beam = new Mesh(new CylinderGeometry(0.07, 0.11, 1, 6, 1, true).rotateZ(Math.PI / 2).translate(0.5, 0, 0),
      new MeshBasicMaterial({ color: AMBER, toneMapped: false, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
    this.beam.visible = false;
    this.bite = new Sprite(new SpriteMaterial({ map: glow, color: AMBER, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.bite.visible = false;
    scene.add(this.beam, this.bite);
  }

  update(world: World, ship: { x: number; z: number; heading: number }, fx: Effects, dt: number): void {
    this.time += dt;
    const b = world.bk;
    this.lane.visible = this.port.visible = !!b;
    if (!b) { this.beam.visible = this.bite.visible = false; return; }
    this.lane.position.set(b.lane.x, -1.5, b.lane.z);
    this.port.position.set(b.port.x, -2, b.port.z);
    // the throat brightens as the tank fills and blazes while the drive spools
    const ready = world.krail >= JUMP_COST ? 1 : 0.35;
    const spool = b.spool / 5;
    this.throat.rotation.z += dt * (0.2 + spool * 3);
    (this.throat.material as MeshBasicMaterial).opacity = 0.015 + 0.025 * ready + 0.18 * spool + (b.jumpT >= 0 ? 0.4 : 0);
    (this.laneRing.material as MeshBasicMaterial).opacity = 0.35 + 0.35 * ready + 0.2 * Math.sin(this.time * 3) * ready;
    (this.portRing.material as MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(this.time * 2.4) + b.dockT;

    // the cutter's beam: bow to rock
    const r = world.field.find(world.cutting);
    if (!r || !world.alive) { this.beam.visible = this.bite.visible = false; return; }
    const bx = ship.x + Math.cos(ship.heading) * 1.4, bz = ship.z - Math.sin(ship.heading) * 1.4;
    const dx = r.x - bx, dz = r.z - bz, d = Math.hypot(dx, dz) || 1;
    const reach = Math.max(0.5, d - r.r * 0.7);
    const hx = bx + (dx / d) * reach, hz = bz + (dz / d) * reach;
    this.beam.visible = this.bite.visible = true;
    this.beam.position.set(bx, 0.15, bz);
    this.beam.rotation.set(0, Math.atan2(-dz, dx), 0);
    this.beam.scale.set(reach, 1 + Math.sin(this.time * 40) * 0.25, 1 + Math.sin(this.time * 40) * 0.25);
    const heat = clamp(r.heat ?? 0, 0, 1);
    // amber, through white-hot, to red near the line
    const c = heat < 0.75 ? AMBER.clone().lerp(new Color(4, 3.4, 2.6), heat / 0.75) : new Color(4, 3.4, 2.6).lerp(new Color(4.2, 0.6, 0.3), (heat - 0.75) / 0.25);
    (this.beam.material as MeshBasicMaterial).color.copy(c);
    (this.bite.material as SpriteMaterial).color.copy(c);
    this.bite.position.set(hx, 0.2, hz);
    this.bite.scale.setScalar(1.2 + heat * 2.2 + Math.sin(this.time * 30) * 0.2);
    if (dt > 0 && Math.random() < 0.6) fx.burst(hx, 0.2, hz, 2, heat > 0.8 ? HOT : SPARK, 6, 0.15, 0.3);
  }
}
