import { Scene, Vector3, type WebGLRenderer } from 'three';
import { lerp } from '../core/math';
import type { GameEvent } from '../sim/events';
import { newShip, topSpeed } from '../sim/ship';
import type { World } from '../sim/world';
import { CameraRig } from './camera';
import { Environment } from './environment';
import { Effects, type RGB } from './fx';
import { Post } from './post';
import type { QualityTier } from './quality';
import { RockView } from './rocks';
import { EnemyView, NEON } from './enemies';
import { ShipView } from './ships';
import { glowTexture } from './textures';
import { WeaponView } from './weapons';

// The scene root: reads the simulation and its events, never writes them.

const OURS: RGB = [3.4, 0.5, 0.8];
const HOT: RGB = [4, 3.4, 2.8];
const FIRE: RGB = [3.4, 1.4, 0.35];
const LAVA: RGB = [3.4, 0.7, 0.12];
const ALERT: RGB = [3.6, 0.5, 0.4];
const DUST: RGB = [1.1, 0.95, 0.85];

const rgb = (faction: string): RGB => {
  const c = NEON[faction as keyof typeof NEON];
  return c ? [c.r, c.g, c.b] : FIRE;
};

export class Sector {
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  private readonly env: Environment;
  private readonly rocks = new RockView(this.scene);
  private readonly fx: Effects;
  private readonly weapons: WeaponView;
  private readonly ship: ShipView;
  private readonly enemies: EnemyView;
  private post: Post | null = null;
  private readonly lerped = newShip();
  private readonly v = new Vector3();
  private snapped = false;
  private time = 0;
  reduceMotion = false;

  constructor(private readonly renderer: WebGLRenderer, private tier: QualityTier) {
    const glow = glowTexture();
    this.env = new Environment(this.scene, renderer);
    this.fx = new Effects(this.scene, glow);
    this.weapons = new WeaponView(this.scene, glow);
    this.ship = new ShipView(glow);
    this.enemies = new EnemyView(this.scene, glow);
    this.scene.add(this.ship.root);
  }

  get camera() {
    return this.rig.camera;
  }

  /** A new quality tier: rebuild the post chain to match. */
  setTier(tier: QualityTier): void {
    this.tier = tier;
    this.post?.composer?.dispose();
    this.post = new Post(this.renderer, this.scene, this.rig.camera, tier);
  }

  resize(width: number, height: number, dpr: number, offsetY: number): void {
    this.rig.resize(width, height, offsetY);
    this.env.setPixelRatio(dpr);
    this.fx.setViewportHeight(height * dpr);
    if (!this.post) this.setTier(this.tier);
    this.post!.setSize(width, height);
  }

  /** Where a world point lands on screen, in CSS pixels; null when behind the camera. */
  project(x: number, y: number, z: number): { x: number; y: number } | null {
    const c = this.renderer.domElement;
    this.v.set(x, y, z).project(this.rig.camera);
    if (this.v.z > 1) return null;
    return { x: (this.v.x + 1) / 2 * c.clientWidth, y: (1 - this.v.y) / 2 * c.clientHeight };
  }

  /**
   * Turn simulation events into light and motion. Returns how long the
   * simulation should hold still (a hit-stop), in seconds: kills land harder
   * for a beat of stillness.
   */
  react(events: GameEvent[]): number {
    let hold = 0;
    for (const e of events) {
      switch (e.type) {
        case 'bolt':
          this.fx.flash(e.x, 0.15, e.z, 1.6, OURS, 0.08);
          this.rig.kick(0.05);
          break;
        case 'torpedo':
          this.fx.flash(e.x, 0.15, e.z, 3, FIRE, 0.16);
          this.fx.light(e.x, 0.3, e.z, [1, 0.5, 0.3], 60, 0.2);
          this.rig.kick(0.22);
          this.rig.shake(0.08);
          break;
        case 'rockHit':
          this.fx.flash(e.x, e.y, e.z, 1.6, LAVA, 0.1);
          this.fx.burst(e.x, e.y, e.z, 10, FIRE, 9, 0.28, 0.45);
          this.fx.rubble('rock', e.x, e.y, e.z, 1, 0.14, 5);
          break;
        case 'bulwarkHit':
          this.fx.flash(e.x, e.y, e.z, 1.3, HOT, 0.08);
          this.fx.burst(e.x, e.y, e.z, 7, DUST, 6, 0.22, 0.35);
          break;
        case 'rockDestroyed': {
          const big = [1, 0.62, 0.38][e.size]!;
          this.fx.explode(e.x, -0.2, e.z, 2.2 * big, LAVA, 'rock');
          this.rig.shake(0.12 + 0.2 * big);
          hold = Math.max(hold, 0.02 + 0.02 * big);
          break;
        }
        case 'blast':
          this.fx.explode(e.x, e.y, e.z, e.radius * 0.45, FIRE, 'metal');
          this.fx.ring(e.x, e.y, e.z, e.radius * 1.1, [3, 1.6, 0.6], 0.5);
          this.rig.shake(0.4);
          hold = Math.max(hold, 0.03);
          break;
        case 'shipHit':
          this.ship.flareShield();
          this.fx.flash(e.x, 0.3, e.z, 4, ALERT, 0.2);
          this.fx.burst(e.x, 0.3, e.z, 34, FIRE, 14, 0.35, 0.6);
          this.fx.light(e.x, 0.5, e.z, [1, 0.35, 0.2], 140, 0.3);
          this.rig.shake(0.65);
          hold = Math.max(hold, 0.06);
          break;
        case 'enemyFire':
          this.fx.flash(e.x, e.y, e.z, 1.4, rgb(e.faction), 0.08);
          break;
        case 'alienHit':
          this.fx.flash(e.x, e.y, e.z, 1.1, FIRE, 0.07);
          this.fx.burst(e.x, e.y, e.z, 10, FIRE, 10, 0.26, 0.4);
          this.fx.rubble('metal', e.x, e.y, e.z, 1, 0.12, 6);
          break;
        case 'alienDestroyed':
          this.fx.explode(e.x, e.y, e.z, e.r, rgb(e.faction), 'metal');
          this.rig.shake(0.22 + e.r * 0.06);
          hold = Math.max(hold, 0.05);
          break;
        case 'plasmaDown':
          this.fx.flash(e.x, e.y, e.z, 3, [0.5, 3, 1.4], 0.2);
          this.fx.burst(e.x, e.y, e.z, 18, [0.5, 3, 1.4], 10, 0.3, 0.5);
          break;
        case 'pickup':
          this.fx.flash(e.x, 0.3, e.z, 4, [3, 2.4, 1.2], 0.3);
          this.fx.burst(e.x, 0.3, e.z, 20, [3, 2.4, 1.2], 8, 0.3, 0.6);
          break;
        case 'bossHit':
          this.fx.flash(e.x, e.y, e.z, 1.6, FIRE, 0.07);
          this.fx.burst(e.x, e.y, e.z, 8, FIRE, 12, 0.3, 0.4);
          this.fx.rubble('metal', e.x, e.y, e.z, 1, 0.2, 7);
          break;
        case 'bossCharge':
          this.rig.shake(0.25);
          break;
        case 'bossDestroyed': {
          const col = rgb(e.faction);
          this.fx.explode(e.x, e.y, e.z, 6, col, 'metal');
          this.fx.explode(e.x + 3, e.y + 1, e.z - 2, 3.5, FIRE, 'metal');
          this.fx.explode(e.x - 3, e.y - 1, e.z + 2, 3.5, FIRE, 'metal');
          this.fx.ring(e.x, e.y, e.z, 34, col, 1);
          this.fx.light(e.x, e.y, e.z, [1, 0.6, 0.3], 3000, 1.2);
          this.rig.shake(1);
          hold = Math.max(hold, 0.11);
          break;
        }
        case 'breach':
          this.fx.explode(e.x, 0.2, e.z, 4, ALERT, 'metal');
          this.fx.ring(e.x, 0, e.z, 16, ALERT, 0.8);
          this.rig.shake(1);
          hold = Math.max(hold, 0.11);
          break;
      }
    }
    return hold;
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
    this.rocks.update(world.field.rocks, world.field.bulwarks, alpha, dt, this.rig.target.x, this.rig.target.z);
    this.weapons.update(world.bolts, world.torps, alpha, this.fx, dt, this.time);
    this.enemies.eye.copy(this.rig.camera.position);
    this.enemies.update(world.aliens, world.command.boss, world.shots, world.webs, world.pickups, alpha, dt);
    // exhaust: embers off the nozzles while the engines burn
    const ex = this.ship.exhaust();
    if (dt > 0 && ex.heat > 0.2) {
      for (const [x, y, z] of ex.points) {
        if (Math.random() < ex.heat * 0.7) {
          this.fx.mote(x, y, z, -Math.cos(s.heading) * 7 + (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.5, Math.sin(s.heading) * 7 + (Math.random() - 0.5) * 2.5,
            Math.random() < 0.6 ? [3.4, 0.4, 0.9] : [3.6, 1.6, 0.5], 0.2, 0.32);
        }
      }
    }
    this.fx.update(dt);
    this.env.update(this.rig.camera, this.rig.target.x, this.rig.target.z, s.vx, s.vz);

    if (!this.post?.render(dt)) this.renderer.render(this.scene, this.rig.camera);
  }

  /** The interpolated ship, for the HUD. */
  get shipNow() {
    return this.lerped;
  }
}
