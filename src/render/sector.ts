import { Scene, Vector3, type Group, type InstancedMesh, type Object3D, type WebGLRenderer } from 'three';
import { COSMETICS } from '../content/unlocks';
import { clamp, lerp } from '../core/math';
import { JUMP_T } from '../sim/breakout';
import type { GameEvent } from '../sim/events';
import { setLiveryBlend, setLiverySweep, SWEEP_SPAN } from './wayward';
import { RenameReveal } from './reveal';
import { inFight } from '../sim/guide';
import { newShip, topSpeed, type ShipState } from '../sim/ship';
import type { World } from '../sim/world';
import { ArsenalView } from './arsenal';
import { BreakoutView } from './breakout';
import { SiteView } from './site';
import { CameraRig } from './camera';
import { DebrisField } from './debris';
import { Environment } from './environment';
import { Effects, type RGB } from './fx';
import { HazardView } from './hazards';
import { prepareSpace, SpaceView } from './space';
import { krailRGB, PickupView } from './pickups';
import { Post } from './post';
import type { QualityTier } from './quality';
import { RockView } from './rocks';
import { RockFx } from './rockfx';
import { EnemyView, NEON, wreck } from './enemies';
import { ShipView } from './ships';
import { hashSeed, industrial, skyFor, type Sky } from './sky';
import { cloudTexture, glowTexture } from './textures';
import { Streaks } from './streaks';
import { flare, launchFrom, lens, pose, stretch, whiteout, WarpView, type Launch } from './warp';
import { WeaponView } from './weapons';

// The scene root: reads the simulation and its events, never writes them.

/** Our lances are red (the player's guns); enemy fire keeps its faction colours, none of them this red. */
const OURS: RGB = [4, 0.35, 0.3];
const LANCE_SPARK: RGB = [4.2, 1.1, 0.7];
const HOT: RGB = [4, 3.4, 2.8];
const FIRE: RGB = [3.4, 1.4, 0.35];
const LAVA: RGB = [3.4, 0.7, 0.12];
const ALERT: RGB = [3.6, 0.5, 0.4];
const DUST: RGB = [1.1, 0.95, 0.85];
const VIOLET: RGB = [2.2, 0.9, 3.6];
const AMBER: RGB = [3.8, 2.2, 0.5];
const SHIELD: RGB = [0.8, 1.6, 3.6];
const BOLT: RGB = [2.6, 3.2, 4.6];

const rgb = (faction: string): RGB => {
  const c = NEON[faction as keyof typeof NEON];
  return c ? [c.r, c.g, c.b] : FIRE;
};

const BLAST_TINT: Record<string, RGB> = {
  torpedo: FIRE, bomblet: FIRE, mine: AMBER, volatile: [4.2, 2.6, 1.2], elite: [3.6, 1.2, 0.3], reactive: SHIELD, strike: FIRE,
};

/** How far the bay's ease must have run before it covers the view completely. */
const COVERED = 0.985;

export class Sector {
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  private readonly env: Environment;
  private readonly rocks: RockView;
  private readonly rockfx: RockFx;
  private readonly fx: Effects;
  private readonly debris: DebrisField;
  private readonly streaks: Streaks;
  private readonly weapons: WeaponView;
  private readonly ship: ShipView;
  private readonly enemies: EnemyView;
  private readonly pickups: PickupView;
  private readonly arsenal: ArsenalView;
  private readonly hazards: HazardView;
  private readonly space: SpaceView;
  private readonly mood = { fog: 0, dim: 0, tint: [0, 0, 0] as [number, number, number] };
  private readonly breakout: BreakoutView;
  private readonly site: SiteView;
  private readonly warp: WarpView;
  /** The jump's path, latched when the drive lets go, and the run it belongs to. */
  private launch: Launch | null = null;
  private launchRun: unknown = null;
  private seenRun: unknown = null;
  /** Seconds into the jump on the last frame, to catch the moment the ship crosses the ring. */
  private warpWas = -1;
  /** Seconds into the jump (negative: not jumping). */
  private warpT = -1;
  private post: Post | null = null;
  private readonly lerped = newShip();
  private readonly v = new Vector3();
  private snapped = false;
  private time = 0;
  private nebula = 0;
  private flash = 0;
  /** Seconds to the next self-repair spark. */
  private weld = 0;
  /** The run or system the sky was painted for. */
  private skyFor: unknown = null;
  /** The warm-up's throwaway hulls, kept to draw once behind the title. */
  private warmSet: Group | null = null;
  /** The review world pins a sky of its own; the run's is left alone while it holds. */
  private pinned = false;
  reduceMotion = false;
  private readonly reveal = new RenameReveal();
  private seenWorld: World | null = null;
  /** An opaque panel (the refit bay) is over the whole view. */
  covered = false;
  /** An opaque panel (the port) fills the view: nothing behind it needs drawing. */
  blind = false;

  constructor(private readonly renderer: WebGLRenderer, private tier: QualityTier) {
    const glow = glowTexture();
    this.env = new Environment(this.scene, renderer);
    this.rocks = new RockView(this.scene);
    this.debris = new DebrisField(this.scene);
    this.fx = new Effects(this.scene, glow);
    this.rockfx = new RockFx(this.fx, this.rocks);
    this.streaks = new Streaks(this.scene);
    this.weapons = new WeaponView(this.streaks);
    this.ship = new ShipView(glow);
    this.enemies = new EnemyView(this.scene, glow, this.streaks);
    this.pickups = new PickupView(this.scene, glow);
    this.arsenal = new ArsenalView(this.scene);
    this.hazards = new HazardView(this.scene, glow, wreck);
    this.breakout = new BreakoutView(this.scene, glow);
    this.site = new SiteView(this.scene);
    this.space = new SpaceView(this.scene, glow);
    this.warp = new WarpView(this.scene, glow, tier.name === 'low' ? 56 : tier.name === 'medium' ? 110 : 170);
    this.scene.add(this.ship.root);
  }

  get camera() {
    return this.rig.camera;
  }

  /** Paint this sky and keep it (the review world's switch). */
  setBackdrop(sky: Sky): void {
    this.pinned = true;
    this.env.setSky(sky);
  }

  /** The next frame puts the camera straight behind the ship, with no swoop: after a jump across the gallery. */
  snapCamera(): void {
    this.snapped = false;
  }

  /** How far the screen has gone to pale teal at the end of a jump (0 to 1). The page puts a veil over the canvas for it. */
  get warpVeil(): number {
    return this.warpT < 0 ? 0 : whiteout(this.warpT);
  }

  /** The ship is going through the ring: the HUD steps back. */
  get jumping(): boolean {
    return this.warpT >= 0;
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
    this.env.setShadow(tier.shadow);
    this.warp.setDetail(tier.name === 'low');
    this.debris.setCount(tier.debris);
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
  warm(): Promise<unknown> {
    cloudTexture(); // painted now, on the title, not on the first dust cloud in a run
    prepareSpace(); // and the places' own textures and shapes, not the first sight of one
    const hidden: Object3D[] = [];
    this.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    const gallery = this.warmSet = this.enemies.gallery();
    gallery.add(wreck());
    this.scene.add(gallery);
    const { renderer, post } = this, was = renderer.getRenderTarget();
    let compiling: Promise<unknown>;
    try {
      // On Medium and High the scene is drawn into the post chain's linear buffer, which
      // is a different program for every material than drawing to the canvas; compile
      // for the buffer the frames will really use. compileAsync starts every link now,
      // so the objects can go back to hidden before it finishes.
      renderer.setRenderTarget(post?.composer?.inputBuffer ?? null);
      compiling = renderer.compileAsync(this.scene, this.rig.camera);
    } finally {
      renderer.setRenderTarget(was);
      gallery.removeFromParent();
      for (const o of hidden) o.visible = false;
    }
    return compiling;
  }

  /**
   * One frame through the post chain, which compiles its passes (bloom, SMAA)
   * and uploads the textures, instead of leaving them to the first frame after
   * Start. Behind the title only: the canvas is blanked again.
   */
  warmFrame(): void {
    // Draw everything once, hidden pools and the gallery included (and casting, so the sun's depth
    // programs link too): compiling is not enough, a buffer or texture is uploaded by the first draw.
    const hidden: Object3D[] = [], empty: InstancedMesh[] = [], gallery = this.warmSet;
    this.scene.traverse((o) => {
      if (!o.visible) { hidden.push(o); o.visible = true; }
      // a pool with no instances yet is skipped, depth pass and all, so give each one for this frame
      const im = o as InstancedMesh;
      if (im.isInstancedMesh && im.count === 0) { empty.push(im); im.count = 1; }
    });
    if (gallery) { gallery.traverse((o) => { o.castShadow = true; }); this.scene.add(gallery); }
    // the sun sits at the origin until the first frame places it, and a shadow camera with no direction culls everything
    this.env.update(this.rig.camera, 0, 0, 0, 0, 0);
    try {
      if (!this.post?.render(0)) this.renderer.render(this.scene, this.rig.camera);
    } finally {
      gallery?.removeFromParent();
      for (const o of hidden) o.visible = false;
      for (const im of empty) im.count = 0;
    }
    this.renderer.clear();
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
        case 'break':
          this.fx.ring(e.x, 0.2, e.z, 5, OURS, 0.4);
          this.rig.shake(0.18);
          break;
        case 'torpedo':
          this.fx.flash(e.x, 0.15, e.z, 3, FIRE, 0.16);
          this.fx.light(e.x, 0.3, e.z, [1, 0.5, 0.3], 60, 0.2);
          this.rig.kick(0.22);
          this.rig.shake(0.08);
          break;
        case 'rockHit':
        case 'rockDestroyed':
        case 'rockMined': {
          const i = this.rockfx.react(e);
          if (i) { if (i.shake) this.rig.shake(i.shake); hold = Math.max(hold, i.hold); }
          break;
        }
        case 'bulwarkHit':
          this.fx.flash(e.x, e.y, e.z, 1.3, HOT, 0.08);
          this.fx.burst(e.x, e.y, e.z, 7, DUST, 6, 0.22, 0.35);
          break;
        case 'bulwarkBroken':
          this.fx.explode(e.x, -0.2, e.z, e.r * 0.5, LAVA, 'rock');
          this.fx.flash(e.x, 0, e.z, e.r * 0.9, HOT, 0.2);
          this.fx.burst(e.x, 0.3, e.z, 40, FIRE, 14, 0.5, 1);
          this.rig.shake(0.6);
          hold = Math.max(hold, 0.08);
          break;
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
          this.ship.flareShield(false, e.fx, e.fz);
          this.fx.flash(e.x, 0.3, e.z, 4, ALERT, 0.2);
          this.fx.burst(e.x, 0.3, e.z, 34, FIRE, 14, 0.35, 0.6);
          this.fx.light(e.x, 0.5, e.z, [1, 0.35, 0.2], 140, 0.3);
          this.rig.shake(0.65);
          hold = Math.max(hold, 0.06);
          break;
        case 'shieldHit':
          this.ship.flareShield(true, e.fx, e.fz);
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
          this.fx.burst(e.x, e.y, e.z, 6, LANCE_SPARK, 16, 0.14, 0.25);
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
        case 'cyrite': {
          const c = e.type === 'crystal' ? krailRGB(e.value) : VIOLET;
          this.fx.flash(e.x, 0.3, e.z, 0.9 + e.value * 0.2, c, 0.12);
          this.fx.burst(e.x, 0.3, e.z, 3 + e.value, c, 5, 0.18, 0.3);
          break;
        }
        case 'power':
          this.fx.flash(e.x, 0.3, e.z, 6, AMBER, 0.35);
          this.fx.ring(e.x, 0.3, e.z, 7, AMBER, 0.5);
          this.fx.burst(e.x, 0.3, e.z, 30, AMBER, 9, 0.3, 0.7);
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
          this.fx.burst(e.x, e.y, e.z, 5, LANCE_SPARK, 16, 0.14, 0.25);
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
        case 'ore':
          this.fx.burst(e.x, 0.3, e.z, 2 + e.value, DUST, 4, 0.16, 0.25);
          break;
        case 'parts':
          this.fx.burst(e.x, 0.3, e.z, 2 + e.value, SHIELD, 4, 0.16, 0.25);
          break;
        case 'mended':
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
          // the drive lets go at the ring; the ship's fly-through (frame) does the rest
          this.fx.ring(e.x, 0.2, e.z, 30, [0.4, 2.4, 3.2], 1);
          this.rig.shake(0.25);
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
  /** What the screen over the ship is about: a bay tab, 'brief' for the pause card, or none. Lights the ship (ShipView.light). */
  console: string | null = null;
  private bayK = 0;

  /** Where a zone's lights are on the screen, as fractions of it (0,0 top left), for the bay's lines to the ship. */
  zoneScreen(zone: string): Array<[number, number]> {
    return this.ship.zonePoints(zone).map((v) => { v.project(this.rig.camera); return [(v.x + 1) / 2, (1 - v.y) / 2] as [number, number]; });
  }

  flashZone(zone: string): void {
    this.ship.flashZone(zone);
  }

  frame(world: World, alpha: number, dt: number, uiDt = dt): void {
    this.time += dt;
    const inBay = this.console !== null && this.console !== 'brief';
    this.bayK += ((inBay ? 1 : 0) - this.bayK) * Math.min(1, 4 * uiDt);
    this.rig.bay = this.bayK * this.bayK * (3 - 2 * this.bayK);
    this.ship.light(this.console, uiDt);
    this.paintSky(world);
    const a = world.prev, b = world.ship, s = this.lerped;
    Object.assign(s, b);
    s.x = lerp(a.x, b.x, alpha);
    s.z = lerp(a.z, b.z, alpha);
    s.vx = lerp(a.vx, b.vx, alpha);
    s.vz = lerp(a.vz, b.vz, alpha);
    s.heading = lerp(a.heading, b.heading, alpha);
    s.yawRate = lerp(a.yawRate, b.yawRate, alpha);

    // a new run (or the next system): the camera is where the ship is, with no swoop from the last one's gate
    if (this.seenRun !== world.run) { this.seenRun = world.run; this.snapped = false; }
    if (this.seenWorld !== world) { this.seenWorld = world; this.reveal.reset(); }
    const wt = this.jumpClock(world, s);
    const subject = { x: s.x, z: s.z, heading: s.heading, yawRate: s.yawRate, speedFrac: Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(world.hull)) };
    if (!this.snapped) { this.rig.snap(subject); this.snapped = true; }
    this.rig.warp.lens = wt >= 0 ? lens(wt) : 0;
    this.rig.warp.lock = wt >= 0 ? Math.min(1, wt / 0.35) : 0;
    if (wt >= 0 && !this.reduceMotion && wt < 2.4) this.rig.hum(0.28 * Math.min(1, wt / 0.6));
    this.rig.update(subject, dt, this.reduceMotion);
    this.ship.root.visible = world.alive && (wt < 0 || whiteout(wt) < 0.97);
    this.ship.stretch(wt >= 0 && !this.reduceMotion ? stretch(wt) : 1);
    // the shield stands at the rim as it fills, and fully once a charge is up
    this.ship.status.charged = world.powers.shield > 0 ? 1 : Math.min(1, world.shields);
    this.ship.status.cloaked = world.cloakT > 0;
    this.ship.status.rapid = world.powers.rapid > 0;
    this.ship.setDamage(world.plates, world.stats.maxPlates);
    // the paint follows the flag; the rename's one sweep and camera arc only decide how it is shown (render/reveal.ts)
    const stolen = world.flags.has('ship_stolen');
    const rv = this.reveal.update({
      stolen, time: world.runTime, paused: world.phase !== 'play' || this.console !== null,
      calm: !inFight(world), reduced: this.reduceMotion,
    }, uiDt);
    setLiverySweep(rv.sweep === null ? null : -rv.sweep * SWEEP_SPAN);
    if (rv.sweep === null) setLiveryBlend(rv.livery);
    this.rig.reveal = rv.arc;
    this.ship.update(s, dt, this.reduceMotion);
    this.rocks.update(world.field.rocks, world.field.bulwarks, alpha, dt, this.rig.target.x, this.rig.target.z);
    this.streaks.begin();
    this.weapons.update(world.bolts, world.torps, alpha, this.fx, dt, this.time);
    this.enemies.eye.copy(this.rig.camera.position);
    this.enemies.update(world.aliens, world.review ? world.review.bosses : world.command.boss ? [world.command.boss] : [], world.shots, world.webs, alpha, dt);
    this.streaks.end();
    this.pickups.update(world.pickups, alpha, dt, this.fx);
    this.arsenal.update(world.sys, dt, this.rig.camera.position);
    this.hazards.update(world.tele, world.strikes, world.encounter, dt, world.command.boss);
    const go = wt >= 0 && this.launch ? this.launch : null;
    this.breakout.update(world, s, this.fx, dt, go ? { t: wt, cross: go.cross, flare: flare(go, wt) } : null);
    this.warp.update(wt, this.rig.camera, go?.dx ?? 0, go?.dz ?? 0, dt, this.reduceMotion);
    this.site.update(world, dt);
    if (dt > 0) this.ambient(world, s.heading);
    // self-repair: the odd welding spark off the plating while it works
    if (dt > 0 && !world.bk && world.alive && world.mend.state === 'repairing' && (this.weld -= dt) <= 0) {
      this.weld = 0.18 + Math.random() * 0.22;
      const a = Math.random() * Math.PI * 2;
      this.fx.burst(s.x + Math.cos(a) * 0.9, 0.5, s.z - Math.sin(a) * 0.9, 3, SHIELD, 3, 0.12, 0.35);
    }
    this.fx.update(dt);
    this.env.update(this.rig.camera, this.rig.target.x, this.rig.target.z, s.vx, s.vz, dt);
    this.debris.update(this.rig.target.x, this.rig.target.z, dt);
    // the weather: a nebula thickens the fog; an ion storm flickers
    const e = world.encounter;
    // (a nebula or storm that rides a feature in the sky is weather of the feature: its murk and light come from the place the ship is in)
    const fog = e && !e.done && !e.dormant && !e.anchored && e.id === 'nebula' ? Math.min(1, e.t / 3, (e.dur - e.t) / 3) : 0;
    this.nebula += (fog - this.nebula) * Math.min(1, dt * 2);
    const storm = e && !e.done && !e.dormant && e.id === 'ion_storm' && (!e.anchored || Math.hypot(world.ship.x - e.x, world.ship.z - e.z) < e.r * 0.8);
    if (storm && dt > 0 && Math.random() < dt * 0.7) this.flash = Math.max(this.flash, 0.4 + Math.random() * 0.4);
    this.flash = Math.max(0, this.flash - dt * 5);
    // the place the ship is in: its murk and its light ease in over a couple of seconds
    const there = world.space ? world.space.sample(world.ship.x, world.ship.z) : null, m = this.mood, k = Math.min(1, dt * 1.2);
    m.fog += ((there?.fog ?? 0) - m.fog) * k; m.dim += ((there?.dim ?? 0) - m.dim) * k;
    for (let i = 0; i < 3; i++) m.tint[i] = m.tint[i]! + ((there?.tint[i] ?? 0) - m.tint[i]!) * k;
    this.space.update(world.space, this.rig.target.x, this.rig.target.z, dt, this.reduceMotion);
    this.env.weather(this.nebula, this.reduceMotion ? 0 : this.flash, m);

    // the refit bay is opaque and covers the whole view once the ship has settled under it: nothing to draw, and phones animate its cards more smoothly without a full frame behind them
    if (this.blind || (this.covered && this.bayK > COVERED)) return;
    if (!this.post?.render(dt)) this.renderer.render(this.scene, this.rig.camera);
  }

  /** Make the sky of a run before it begins, behind the title; the first frame of the run then finds it done. */
  stageSky(world: World): void { this.paintSky(world); }

  /**
   * The Breakout's sky belongs to the system (the same one each visit, in its
   * region's colours); the arcade's is new every run.
   */
  private paintSky(world: World): void {
    if (this.pinned) return;
    const breakout = world.mode === 'breakout';
    const key = breakout ? `${world.sortie.system}:${world.sortie.region ?? 0}${world.sortie.first ? ':first' : ''}` : world.run;
    if (key === this.skyFor) return;
    this.skyFor = key;
    const sky = breakout ? skyFor(hashSeed(world.sortie.system), world.sortie.sky ?? world.sortie.region ?? 0) : skyFor(Math.floor(Math.random() * 1e9), null);
    this.env.setSky(breakout && world.sortie.first ? industrial(sky, world.ship.heading) : sky);
  }

  /**
   * Seconds into the jump, or -1. From the moment the drive lets go the sim
   * ship is no longer the one on screen: the ship is drawn on the jump's own
   * path (render/warp.ts), through the ring and away down its axis.
   */
  private jumpClock(world: World, s: ShipState): number {
    const bk = world.bk;
    const wt = !world.review && bk && (bk.jumpT >= 0 || world.run.escaped) ? clamp(JUMP_T - bk.jumpT, 0, JUMP_T) : -1;
    const was = this.warpWas;
    this.warpT = this.warpWas = wt;
    if (wt < 0 || !bk) { this.launch = null; return -1; }
    if (!this.launch || this.launchRun !== world.run) {
      this.launch = launchFrom(bk.lane, this.breakout.axis, s);
      this.launchRun = world.run;
    }
    const l = this.launch, p = pose(l, wt);
    s.x = p.x; s.z = p.z; s.heading = p.heading;
    s.vx = l.dx * 1500 * p.rush; s.vz = l.dz * 1500 * p.rush;
    s.thrust = 1 - 0.5 * p.rush; s.yawRate = 0; s.invuln = 0; s.rollT = -1; s.breakT = -1;
    // across the ring: it blazes and a ripple runs out of it
    if (was >= 0 && was < l.cross && wt >= l.cross) {
      this.fx.flash(l.gx, 7, l.gz, 34, [0.9, 2.6, 3.2], 0.5);
      this.fx.light(l.gx, 7, l.gz, [0.4, 0.9, 1], 3000, 0.8);
      this.rig.shake(0.3);
    }
    return wt;
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
    // a wounded hull smokes where it was hit, and at one plate left throws the odd spark
    if (world.alive && !this.reduceMotion) {
      const w = this.ship.wound();
      for (const [x, y, z] of w.points) {
        if (Math.random() < (w.hard ? 0.55 : 0.12)) this.fx.dust(x, y + 0.1, z, w.hard ? 0.6 : 0.4, [0.1, 0.1, 0.11], 1, 0.7, 1.1, w.hard ? 0.3 : 0.2);
        if (w.hard && Math.random() < 0.06) this.fx.mote(x, y + 0.1, z, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, [3.4, 1.4, 0.4], 0.12, 0.35);
      }
    }
    // hulls burning from the plasma trail
    for (const al of world.aliens) {
      if (al.burn > 0 && Math.random() < 0.5) this.fx.mote(al.x, al.y, al.z, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, [3.6, 1.4, 0.4], 0.35, 0.4);
    }
    // the anomaly drinks the light in
    const e = world.encounter;
    if (e && !e.done && !e.dormant && !e.anchored && e.id === 'anomaly') {
      for (let i = 0; i < 3; i++) {
        const ang = Math.random() * Math.PI * 2, r = 8 + Math.random() * 22;
        const x = e.x + Math.cos(ang) * r, z = e.z + Math.sin(ang) * r;
        this.fx.mote(x, 0.3 + Math.random() * 2, z, (e.x - x) * 0.9 - Math.sin(ang) * 6, 0, (e.z - z) * 0.9 + Math.cos(ang) * 6, [1.6, 0.7, 3], 0.3, 0.9);
      }
    }
  }

  /** The interpolated ship, for the HUD. */
  get shipNow() {
    return this.lerped;
  }
}
