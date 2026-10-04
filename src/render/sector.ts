import { Scene, Vector3, type Object3D, type WebGLRenderer } from 'three';
import { COSMETICS } from '../content/unlocks';
import { lerp } from '../core/math';
import type { GameEvent } from '../sim/events';
import { newShip, topSpeed } from '../sim/ship';
import type { World } from '../sim/world';
import { ArsenalView } from './arsenal';
import { BreakoutView } from './breakout';
import { CameraRig } from './camera';
import { Environment } from './environment';
import { Effects, type RGB } from './fx';
import { HazardView } from './hazards';
import { PickupView } from './pickups';
import { Post } from './post';
import type { QualityTier } from './quality';
import { RockView } from './rocks';
import { EnemyView, NEON, wreck } from './enemies';
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
const VIOLET: RGB = [2.2, 0.9, 3.6];
const AMBER: RGB = [3.8, 2.2, 0.5];
const SHIELD: RGB = [0.8, 1.6, 3.6];
const GRAZE: RGB = [1.6, 2.6, 3.8];
const BOLT: RGB = [2.6, 3.2, 4.6];

const rgb = (faction: string): RGB => {
  const c = NEON[faction as keyof typeof NEON];
  return c ? [c.r, c.g, c.b] : FIRE;
};

const ROCK_TINT: Record<string, RGB> = { basalt: LAVA, iron: [1.6, 0.5, 0.2], rich: VIOLET, volatile: [4.2, 2.4, 1], rare: [4, 3, 1.2] };
const BLAST_TINT: Record<string, RGB> = {
  torpedo: FIRE, bomblet: FIRE, mine: AMBER, volatile: [4.2, 2.6, 1.2], elite: [3.6, 1.2, 0.3], reactive: SHIELD, strike: FIRE,
};

export class Sector {
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  private readonly env: Environment;
  private readonly rocks: RockView;
  private readonly fx: Effects;
  private readonly weapons: WeaponView;
  private readonly ship: ShipView;
  private readonly enemies: EnemyView;
  private readonly pickups: PickupView;
  private readonly arsenal: ArsenalView;
  private readonly hazards: HazardView;
  private readonly breakout: BreakoutView;
  private post: Post | null = null;
  private readonly lerped = newShip();
  private readonly v = new Vector3();
  private snapped = false;
  private time = 0;
  private nebula = 0;
  private flash = 0;
  reduceMotion = false;

  constructor(private readonly renderer: WebGLRenderer, private tier: QualityTier) {
    const glow = glowTexture();
    this.env = new Environment(this.scene, renderer);
    this.rocks = new RockView(this.scene, glow);
    this.fx = new Effects(this.scene, glow);
    this.weapons = new WeaponView(this.scene, glow);
    this.ship = new ShipView(glow);
    this.enemies = new EnemyView(this.scene, glow);
    this.pickups = new PickupView(this.scene, glow);
    this.arsenal = new ArsenalView(this.scene);
    this.hazards = new HazardView(this.scene, glow, wreck);
    this.breakout = new BreakoutView(this.scene, glow);
    this.scene.add(this.ship.root);
  }

  get camera() {
    return this.rig.camera;
  }

  /** Engine colours: a cosmetic id from content/unlocks.ts. */
  setCosmetic(id: string): void {
    const c = COSMETICS[id] ?? COSMETICS['engine-stock']!;
    this.ship.setEngine(c.core, c.bell);
  }

  /** A new quality tier: rebuild the post chain to match. */
  setTier(tier: QualityTier): void {
    this.tier = tier;
    this.post?.composer?.dispose();
    this.post = new Post(this.renderer, this.scene, this.rig.camera, tier);
    this.fx.setLights(tier.name !== 'low');
  }

  resize(width: number, height: number, dpr: number, offsetY: number): void {
    this.rig.resize(width, height, offsetY);
    this.env.setPixelRatio(dpr);
    this.fx.setViewportHeight(height * dpr);
    if (!this.post) this.setTier(this.tier);
    this.post!.setSize(width, height);
  }

  /**
   * Compile every shader the run will need, now, while the start card is
   * up. Pooled effects sit hidden until their first explosion, and three only
   * compiles what is visible, so without this the first rock broken, the
   * first hit and each new kind of hull would each stall a frame on a phone
   * while its program compiles.
   */
  warm(): void {
    const hidden: Object3D[] = [];
    this.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    const gallery = this.enemies.gallery();
    gallery.add(wreck());
    this.scene.add(gallery);
    try {
      this.renderer.compile(this.scene, this.rig.camera);
    } finally {
      gallery.removeFromParent();
      for (const o of hidden) o.visible = false;
    }
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
          this.fx.explode(e.x, -0.2, e.z, 2.2 * big, ROCK_TINT[e.kind] ?? LAVA, 'rock');
          if (e.kind === 'rich' || e.kind === 'rare') this.fx.burst(e.x, 0.3, e.z, 30, ROCK_TINT[e.kind]!, 10, 0.4, 0.8);
          this.rig.shake(0.12 + 0.2 * big);
          hold = Math.max(hold, 0.02 + 0.02 * big);
          break;
        }
        case 'blast': {
          const tint = BLAST_TINT[e.kind] ?? FIRE;
          const small = e.kind === 'bomblet';
          this.fx.explode(e.x, e.y, e.z, e.radius * (small ? 0.3 : 0.45), tint, 'metal');
          this.fx.ring(e.x, e.y, e.z, e.radius * 1.1, tint, 0.5);
          this.rig.shake(small ? 0.1 : e.kind === 'volatile' ? 0.5 : 0.35);
          hold = Math.max(hold, small ? 0 : 0.03);
          break;
        }
        case 'shipHit':
          this.ship.flareShield();
          this.fx.flash(e.x, 0.3, e.z, 4, ALERT, 0.2);
          this.fx.burst(e.x, 0.3, e.z, 34, FIRE, 14, 0.35, 0.6);
          this.fx.light(e.x, 0.5, e.z, [1, 0.35, 0.2], 140, 0.3);
          this.rig.shake(0.65);
          hold = Math.max(hold, 0.06);
          break;
        case 'shieldHit':
          this.ship.flareShield(true);
          this.fx.flash(e.x, 0.3, e.z, 4, SHIELD, 0.2);
          this.fx.burst(e.x, 0.3, e.z, 26, SHIELD, 12, 0.3, 0.5);
          this.rig.shake(0.35);
          hold = Math.max(hold, 0.04);
          break;
        case 'damageControl':
          this.fx.ring(e.x, 0.2, e.z, 10, AMBER, 0.6);
          this.fx.flash(e.x, 0.3, e.z, 6, AMBER, 0.3);
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
          this.fx.explode(e.x, e.y, e.z, e.r * (e.elite ? 1.4 : 1), rgb(e.faction), 'metal');
          this.rig.shake(0.22 + e.r * 0.06);
          hold = Math.max(hold, e.elite ? 0.07 : 0.05);
          break;
        case 'plasmaDown':
          this.fx.flash(e.x, e.y, e.z, 3, [0.5, 3, 1.4], 0.2);
          this.fx.burst(e.x, e.y, e.z, 18, [0.5, 3, 1.4], 10, 0.3, 0.5);
          break;
        case 'pickup':
          this.fx.flash(e.x, 0.3, e.z, 4, [3, 2.4, 1.2], 0.3);
          this.fx.burst(e.x, 0.3, e.z, 20, [3, 2.4, 1.2], 8, 0.3, 0.6);
          break;
        case 'crystal':
          this.fx.flash(e.x, 0.3, e.z, 0.9 + e.value * 0.2, VIOLET, 0.12);
          this.fx.burst(e.x, 0.3, e.z, 3 + e.value, VIOLET, 5, 0.18, 0.3);
          break;
        case 'power':
          this.fx.flash(e.x, 0.3, e.z, 6, AMBER, 0.35);
          this.fx.ring(e.x, 0.3, e.z, 7, AMBER, 0.5);
          this.fx.burst(e.x, 0.3, e.z, 30, AMBER, 9, 0.3, 0.7);
          break;
        case 'levelUp': {
          const s = this.lerped;
          this.fx.ring(s.x, 0.2, s.z, 9, VIOLET, 0.55);
          this.fx.flash(s.x, 0.4, s.z, 5, VIOLET, 0.3);
          this.fx.burst(s.x, 0.4, s.z, 40, VIOLET, 9, 0.3, 0.8);
          break;
        }
        case 'graze':
          this.fx.burst(e.x, e.y, e.z, 5, GRAZE, 7, 0.2, 0.25);
          break;
        case 'overchargeReady': {
          const s = this.lerped;
          this.fx.ring(s.x, 0.2, s.z, 4, AMBER, 0.4);
          break;
        }
        case 'overcharge':
          this.fx.flash(e.x, 0.4, e.z, e.radius * 0.8, [4, 3, 1.4], 0.35);
          this.fx.ring(e.x, 0.2, e.z, e.radius, AMBER, 0.6);
          this.fx.ring(e.x, 0.5, e.z, e.radius * 0.7, [4, 3, 2], 0.45);
          this.fx.burst(e.x, 0.4, e.z, 80, AMBER, 26, 0.4, 0.8);
          this.fx.light(e.x, 1, e.z, [1, 0.7, 0.3], 900, 0.5);
          this.rig.shake(0.7);
          hold = Math.max(hold, 0.09);
          break;
        case 'mineLaid':
          this.fx.flash(e.x, 0.2, e.z, 0.8, AMBER, 0.08);
          break;
        case 'arc':
          this.arsenal.arc(e.points);
          for (let i = 3; i + 2 < e.points.length; i += 6) this.fx.flash(e.points[i]!, e.points[i + 1]!, e.points[i + 2]!, 1.4, BOLT, 0.1);
          break;
        case 'strike':
          if (e.kind === 'lightning') {
            this.arsenal.arc([e.x, 30, e.z, e.x, 0, e.z, e.x, 18, e.z, e.x + 3, 0, e.z - 2]);
            this.fx.flash(e.x, 0.5, e.z, e.r * 2.5, BOLT, 0.25);
            this.fx.ring(e.x, 0.1, e.z, e.r * 1.2, BOLT, 0.35);
            this.fx.light(e.x, 3, e.z, [0.6, 0.8, 1], 500, 0.25);
            this.flash = 1;
            this.rig.shake(0.3);
          } else if (e.kind === 'blast') {
            this.fx.explode(e.x, 0.2, e.z, e.r * 0.45, FIRE, 'rock');
            this.rig.shake(0.25);
          } else this.fx.ring(e.x, 0.1, e.z, e.r, [1.8, 0.8, 2.8], 0.4);
          break;
        case 'bossHit':
          this.fx.flash(e.x, e.y, e.z, 1.6, FIRE, 0.07);
          this.fx.burst(e.x, e.y, e.z, 8, FIRE, 12, 0.3, 0.4);
          this.fx.rubble('metal', e.x, e.y, e.z, 1, 0.2, 7);
          break;
        case 'bossPhase':
          this.fx.explode(e.x + 2, e.y + 1, e.z - 1, 3, rgb(e.faction), 'metal');
          this.fx.ring(e.x, e.y, e.z, 20, rgb(e.faction), 0.6);
          this.rig.shake(0.6);
          hold = Math.max(hold, 0.08);
          break;
        case 'bossCharge':
          this.rig.shake(0.25);
          break;
        case 'bossFlank':
          this.fx.flash(e.x, 1, e.z, 9, [0.5, 3.4, 1.2], 0.3);
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
        case 'rockCut': {
          const big = [1, 0.62, 0.38][e.size]!;
          this.fx.flash(e.x, 0.3, e.z, 3 * big + 1, AMBER, 0.25);
          this.fx.ring(e.x, 0.1, e.z, 6 * big + 2, e.krail ? VIOLET : AMBER, 0.45);
          this.fx.rubble('rock', e.x, 0, e.z, big, 0.3, 14);
          this.fx.burst(e.x, 0.3, e.z, 24, e.krail ? VIOLET : AMBER, 6, 0.3, 0.6);
          this.rig.shake(0.08);
          break;
        }
        case 'fracture':
          this.fx.flash(e.x, 0.3, e.z, 5, [4.2, 0.8, 0.3], 0.2);
          this.rig.shake(0.25);
          break;
        case 'ore':
          this.fx.burst(e.x, 0.3, e.z, 2 + e.value, DUST, 4, 0.16, 0.25);
          break;
        case 'parts':
          this.fx.burst(e.x, 0.3, e.z, 2 + e.value, SHIELD, 4, 0.16, 0.25);
          break;
        case 'patched': {
          const s = this.lerped;
          this.fx.burst(s.x, 0.4, s.z, 26, SHIELD, 6, 0.25, 0.5);
          break;
        }
        case 'docked': {
          const s = this.lerped;
          this.fx.ring(s.x, 0, s.z, 9, [0.4, 2.4, 3.2], 0.6);
          break;
        }
        case 'jumped':
          this.fx.flash(e.x, 0.5, e.z, 30, [4, 3, 1.4], 0.8);
          this.fx.ring(e.x, 0.2, e.z, 40, AMBER, 1.2);
          this.fx.light(e.x, 1, e.z, [1, 0.7, 0.3], 4000, 1.4);
          this.rig.shake(0.8);
          hold = Math.max(hold, 0.1);
          break;
        case 'breach':
          this.fx.explode(e.x, 0.2, e.z, 4, ALERT, 'metal');
          this.fx.explode(e.x + 1, 0.4, e.z - 1, 2.5, FIRE, 'metal');
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
    this.ship.root.visible = world.alive && !(world.bk && world.bk.jumpT >= 0 && world.bk.jumpT < 1.3);
    // the shield stands at the rim as it fills, and fully once a charge is up
    this.ship.status.charged = world.powers.shield > 0 ? 1 : Math.min(1, world.shields);
    this.ship.status.phased = world.phaseT > 0;
    this.ship.status.cloaked = world.cloakT > 0;
    this.ship.status.overload = world.overload > 0 || world.powers.rapid > 0;
    this.ship.update(s, dt, this.reduceMotion);
    this.rocks.update(world.field.rocks, world.field.bulwarks, alpha, dt, this.rig.target.x, this.rig.target.z);
    this.weapons.update(world.bolts, world.torps, alpha, this.fx, dt, this.time);
    this.enemies.eye.copy(this.rig.camera.position);
    this.enemies.update(world.aliens, world.command.boss, world.shots, world.webs, alpha, dt);
    this.pickups.update(world.pickups, alpha, dt);
    this.arsenal.update(world.sys, dt);
    this.hazards.update(world.tele, world.strikes, world.encounter, dt);
    this.breakout.update(world, s, this.fx, dt);
    if (dt > 0) this.ambient(world, s.heading);
    this.fx.update(dt);
    this.env.update(this.rig.camera, this.rig.target.x, this.rig.target.z, s.vx, s.vz);
    // the weather: a nebula thickens the fog; an ion storm flickers
    const e = world.encounter;
    const fog = e && !e.done && e.id === 'nebula' ? Math.min(1, e.t / 3, (e.dur - e.t) / 3) : 0;
    this.nebula += (fog - this.nebula) * Math.min(1, dt * 2);
    const storm = e && !e.done && e.id === 'ion_storm';
    if (storm && dt > 0 && Math.random() < dt * 0.7) this.flash = Math.max(this.flash, 0.4 + Math.random() * 0.4);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.env.weather(this.nebula, this.reduceMotion ? 0 : this.flash);

    if (!this.post?.render(dt)) this.renderer.render(this.scene, this.rig.camera);
  }

  /** Particles that come from state rather than events: exhaust, burning hulls, the anomaly's pull. */
  private ambient(world: World, heading: number): void {
    const s = this.lerped;
    // exhaust: embers off the nozzles while the engines burn
    const ex = this.ship.exhaust();
    if (world.alive && ex.heat > 0.2) {
      for (const [x, y, z] of ex.points) {
        if (Math.random() < ex.heat * 0.7) {
          this.fx.mote(x, y, z, -Math.cos(heading) * 7 + (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.5, Math.sin(heading) * 7 + (Math.random() - 0.5) * 2.5,
            Math.random() < 0.6 ? [3.4, 0.4, 0.9] : [3.6, 1.6, 0.5], 0.2, 0.32);
        }
      }
    }
    // hulls burning from the plasma trail
    for (const al of world.aliens) {
      if (al.burn > 0 && Math.random() < 0.5) this.fx.mote(al.x, al.y, al.z, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, [3.6, 1.4, 0.4], 0.35, 0.4);
    }
    // the anomaly drinks the light in
    const e = world.encounter;
    if (e && !e.done && e.id === 'anomaly') {
      for (let i = 0; i < 3; i++) {
        const ang = Math.random() * Math.PI * 2, r = 8 + Math.random() * 22;
        const x = e.x + Math.cos(ang) * r, z = e.z + Math.sin(ang) * r;
        this.fx.mote(x, 0.3 + Math.random() * 2, z, (e.x - x) * 0.9 - Math.sin(ang) * 6, 0, (e.z - z) * 0.9 + Math.cos(ang) * 6, [1.6, 0.7, 3], 0.3, 0.9);
      }
    }
    // the phase cloak sheds violet
    if (world.phaseT > 0 && Math.random() < 0.6) this.fx.mote(s.x, 0.3, s.z, (Math.random() - 0.5) * 4, Math.random() * 2, (Math.random() - 0.5) * 4, [2.2, 0.8, 3.6], 0.3, 0.4);
  }

  /** The interpolated ship, for the HUD. */
  get shipNow() {
    return this.lerped;
  }
}
