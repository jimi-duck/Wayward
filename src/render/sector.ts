import { Scene, Vector3, type WebGLRenderer } from 'three';
import type { HullId } from '../content/hulls';
import { lerp } from '../core/math';
import type { GameEvent } from '../sim/events';
import { newShip, topSpeed } from '../sim/ship';
import type { World } from '../sim/world';
import { CameraRig } from './camera';
import { Environment } from './environment';
import { Effects } from './fx';
import { Post } from './post';
import type { QualityTier } from './quality';
import { RockView } from './rocks';
import { EnemyView, NEON } from './enemies';
import { ShipView } from './ships';
import { glowTexture, rockTexture } from './textures';
import { WeaponView } from './weapons';

// The scene root: reads the simulation and its events, never writes them.

const SIG: [number, number, number] = [0.5, 2.6, 3.2];
const VIO: [number, number, number] = [2.2, 0.9, 3.2];
const MAG: [number, number, number] = [3.2, 0.6, 2.4];
const HOT: [number, number, number] = [3.4, 3.2, 3.0];
const ALERT: [number, number, number] = [3.4, 0.4, 1.0];

export class Sector {
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  private readonly env = new Environment(this.scene);
  private readonly rocks = new RockView(this.scene);
  private readonly fx: Effects;
  private readonly weapons: WeaponView;
  private readonly ship: ShipView;
  private readonly enemies: EnemyView;
  private post: Post;
  private readonly lerped = newShip();
  private readonly v = new Vector3();
  private snapped = false;
  private time = 0;
  reduceMotion = false;

  constructor(hull: HullId, private readonly renderer: WebGLRenderer, tier: QualityTier) {
    const glow = glowTexture();
    this.fx = new Effects(this.scene, glow, rockTexture(11));
    this.weapons = new WeaponView(this.scene, glow);
    this.ship = new ShipView(hull);
    this.enemies = new EnemyView(this.scene, glow);
    this.scene.add(this.ship.root);
    this.post = new Post(renderer, this.scene, this.rig.camera, tier);
  }

  get camera() {
    return this.rig.camera;
  }

  /** A new quality tier: rebuild the post chain to match. */
  setTier(tier: QualityTier): void {
    this.post.composer?.dispose();
    this.post = new Post(this.renderer, this.scene, this.rig.camera, tier);
  }

  setHull(id: HullId): void {
    this.ship.setHull(id);
  }

  resize(width: number, height: number, dpr: number, offsetY: number): void {
    this.rig.resize(width, height, offsetY);
    this.env.setPixelRatio(dpr);
    this.fx.setViewportHeight(height * dpr);
    this.post.setSize(width, height);
  }

  /** Where a world point lands on screen, in CSS pixels; null when behind the camera. */
  project(x: number, y: number, z: number): { x: number; y: number } | null {
    const c = this.renderer.domElement;
    this.v.set(x, y, z).project(this.rig.camera);
    if (this.v.z > 1) return null;
    return { x: (this.v.x + 1) / 2 * c.clientWidth, y: (1 - this.v.y) / 2 * c.clientHeight };
  }

  /** Turn simulation events into light and motion. */
  react(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'bolt':
          this.fx.flash(e.x, 0.05, e.z, 0.9, SIG, 0.08);
          break;
        case 'torpedo':
          this.fx.flash(e.x, 0.1, e.z, 2.2, SIG, 0.14);
          this.rig.shake(0.05);
          break;
        case 'rockHit':
          this.fx.flash(e.x, 0.1, e.z, 1.3, VIO, 0.1);
          this.fx.burst(e.x, e.z, 8, VIO, 9, 0.28, 0.4);
          break;
        case 'rockDestroyed': {
          const big = [1, 0.62, 0.38][e.size]!;
          this.fx.flash(e.x, 0.2, e.z, 6 * big, HOT, 0.2);
          this.fx.ring(e.x, e.z, 7 * big, VIO, 0.5);
          this.fx.burst(e.x, e.z, Math.round(40 * big), MAG, 16 * big + 6, 0.42, 0.8);
          this.fx.burst(e.x, e.z, Math.round(22 * big), VIO, 10, 0.3, 1.1);
          this.fx.rubble(e.x, e.z, 0, 0, Math.round(12 * big) + 2, 0.55 * big + 0.15, 9 * big + 3);
          this.rig.shake(0.12 + 0.22 * big);
          break;
        }
        case 'blast':
          // sized for the close chase camera: bright at the core, not a whiteout
          this.fx.flash(e.x, 0.3, e.z, e.radius * 1.2, HOT, 0.22);
          this.fx.flash(e.x, 0.3, e.z, e.radius * 1.9, [0.25, 1.3, 1.6], 0.4);
          this.fx.ring(e.x, e.z, e.radius, SIG, 0.45);
          this.fx.burst(e.x, e.z, 50, SIG, 24, 0.45, 0.7);
          this.rig.shake(0.38);
          break;
        case 'shipHit':
          this.ship.flareShield();
          this.fx.flash(e.x, 0.2, e.z, 4, ALERT, 0.2);
          this.fx.burst(e.x, e.z, 30, ALERT, 14, 0.35, 0.6);
          this.rig.shake(0.6);
          break;
        case 'alienHit':
          this.fx.flash(e.x, 0.2, e.z, 1.4, HOT, 0.08);
          this.fx.burst(e.x, e.z, 6, HOT, 8, 0.25, 0.3);
          break;
        case 'alienDestroyed': {
          const c = NEON[e.faction as keyof typeof NEON];
          const col: [number, number, number] = [c.r, c.g, c.b];
          this.fx.flash(e.x, 0.3, e.z, 6, HOT, 0.2);
          this.fx.flash(e.x, 0.3, e.z, 9, col, 0.35);
          this.fx.ring(e.x, e.z, 6, col, 0.45);
          this.fx.burst(e.x, e.z, 40, col, 18, 0.4, 0.8);
          this.fx.rubble(e.x, e.z, 0, 0, 8, 0.35, 10);
          this.rig.shake(0.25);
          break;
        }
        case 'plasmaDown':
          this.fx.flash(e.x, 0.2, e.z, 3, [0.5, 3, 1.4], 0.2);
          this.fx.burst(e.x, e.z, 16, [0.5, 3, 1.4], 10, 0.3, 0.5);
          break;
        case 'pickup':
          this.fx.flash(e.x, 0.3, e.z, 4, SIG, 0.3);
          this.fx.burst(e.x, e.z, 20, SIG, 8, 0.3, 0.6);
          break;
        case 'bossHit':
          this.fx.flash(e.x, 0.4, e.z, 1.8, HOT, 0.08);
          this.fx.burst(e.x, e.z, 5, HOT, 10, 0.3, 0.3);
          break;
        case 'bossCharge':
          this.rig.shake(0.2);
          break;
        case 'bossDestroyed': {
          const c = NEON[e.faction as keyof typeof NEON];
          const col: [number, number, number] = [c.r, c.g, c.b];
          this.fx.flash(e.x, 0.5, e.z, 20, HOT, 0.5);
          this.fx.flash(e.x, 0.5, e.z, 30, col, 0.8);
          this.fx.ring(e.x, e.z, 22, col, 0.9);
          this.fx.ring(e.x, e.z, 12, HOT, 0.6);
          this.fx.burst(e.x, e.z, 160, col, 34, 0.6, 1.4);
          this.fx.burst(e.x, e.z, 80, HOT, 24, 0.4, 1);
          this.fx.rubble(e.x, e.z, 0, 0, 40, 0.8, 18);
          this.rig.shake(1);
          break;
        }
        case 'breach':
          this.fx.flash(e.x, 0.3, e.z, 14, HOT, 0.45);
          this.fx.ring(e.x, e.z, 14, ALERT, 0.8);
          this.fx.burst(e.x, e.z, 120, ALERT, 30, 0.55, 1.2);
          this.fx.burst(e.x, e.z, 80, SIG, 22, 0.4, 1.4);
          this.rig.shake(1);
          break;
      }
    }
  }

  /** Place everything for this frame and draw it. `alpha` is how far past the previous step we are. */
  frame(world: World, alpha: number, dt: number): void {
    this.time += dt;
    const a = world.prev, b = world.ship, s = this.lerped;
    Object.assign(s, b);
    s.x = lerp(a.x, b.x, alpha);
    s.z = lerp(a.z, b.z, alpha);
    s.vx = lerp(a.vx, b.vx, alpha);
    s.vz = lerp(a.vz, b.vz, alpha);
    s.heading = lerp(a.heading, b.heading, alpha);
    s.yawRate = lerp(a.yawRate, b.yawRate, alpha);

    const subject = { x: s.x, z: s.z, heading: s.heading, yawRate: s.yawRate, speedFrac: Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(world.hull)) };
    if (!this.snapped) { this.rig.snap(subject); this.snapped = true; }
    this.rig.update(subject, dt, this.reduceMotion);
    this.ship.update(s, dt, this.reduceMotion);
    this.rocks.update(world.field.rocks, alpha);
    this.weapons.update(world.bolts, world.torps, alpha, this.fx, dt, this.time);
    this.enemies.update(world.aliens, world.command.boss, world.shots, world.webs, world.pickups, alpha, dt);
    // exhaust: sparks off the nozzles while the impulse engines burn
    const ex = this.ship.exhaust();
    if (dt > 0 && ex.heat > 0.2) {
      for (const [x, y, z] of ex.points) {
        if (Math.random() < ex.heat * 0.8) {
          this.fx.mote(x, y, z, -Math.cos(s.heading) * 6 + (Math.random() - 0.5) * 3, Math.sin(s.heading) * 6 + (Math.random() - 0.5) * 3,
            Math.random() < 0.5 ? [3, 0.5, 2.8] : [0.4, 2, 3], 0.22, 0.35);
        }
      }
    }
    this.fx.update(dt);
    this.env.update(this.rig.camera, this.rig.target.x, this.rig.target.z, s.vx, s.vz);

    if (!this.post.render(dt)) this.renderer.render(this.scene, this.rig.camera);
  }

  /** The interpolated ship, for the HUD. */
  get shipNow() {
    return this.lerped;
  }
}
