import { HULLS, type Hull, type HullId } from '../content/hulls';
import type { InputFrame } from '../input/types';
import { Command } from './bosses';
import { flightControls } from './controls';
import {
  ALIEN_FIRST, ALIEN_TYPES, BEAM_LEN, BEAM_W, BORG_ADAPT, alienFire, alienInterval, alienMax, beamLive, moveAlien,
  moveShots, newId, pickKind, rayDist, spawnAlien, stepBeam, stepWebs, type Alien, type Pickup, type Shot, type Web,
} from './enemies';
import type { GameEvent } from './events';
import { Field, type Rock } from './field';
import { Rng } from './rng';
import { newShip, stepShip, type ShipState } from './ship';
import {
  BOLT_DAMAGE, BREACH_GRACE, HIT_GRACE, PX, ROCK_POINTS, SHIP_R, TORP_BLAST, TORP_DAMAGE, TORP_FUSE,
} from './tuning';
import { acquire, fireWeapons, moveBolts, moveTorpedoes, newArms, type Arms, type Bolt, type Targets, type Torpedo } from './weapons';

// The simulation's root. It never touches Three.js, so it can run headless.
// Conventions: play is on the XZ plane, heading 0 faces +X and PI/2 faces -Z
// ("up" on screen), headings are never wrapped.

const MAGNET_R = 165 * PX;
const PICKUP_R = SHIP_R + 1.3;
const PICKUP_LIFE = 9;
/** Of the original's per-hull heart chance, how much drops a hull repair here. */
const HEART_SHARE = 0.35;
const BOSS_PLATES = 2;

export class World {
  readonly rng: Rng;
  ship: ShipState = newShip();
  /** The ship one step ago, for interpolation. */
  prev: ShipState = newShip();
  hull: Hull = HULLS.escort;
  plates: number = HULLS.escort.plates;
  arms: Arms = newArms();
  field: Field;
  bolts: Bolt[] = [];
  torps: Torpedo[] = [];
  aliens: Alien[] = [];
  shots: Shot[] = [];
  webs: Web[] = [];
  pickups: Pickup[] = [];
  readonly command = new Command();
  /** The target a torpedo launched now would lock, for the HUD. */
  lock: number | null = null;
  score = 0;
  best = 0;
  /** Seconds of simulated time, and seconds into the current run. */
  time = 0;
  runTime = 0;
  /** Rocks and hulls broken this run. */
  kills = 0;
  nextAlien = ALIEN_FIRST;
  private events: GameEvent[] = [];

  constructor(seed = 47) {
    this.rng = new Rng(seed);
    this.field = new Field(this.rng);
    this.field.seed(0, 0);
  }

  setHull(id: HullId): void {
    this.hull = HULLS[id];
    this.plates = this.hull.plates;
  }

  /** Everything that happened since the last call. */
  drain(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** What the seeker can see this step. */
  targets(): Targets {
    return { ships: this.aliens, boss: this.command.targetable(), rocks: this.field.rocks };
  }

  step(dt: number, input: InputFrame): void {
    Object.assign(this.prev, this.ship);
    const c = flightControls(input);
    const s = this.ship, t = this.runTime;
    stepShip(s, c, this.hull, dt);
    const targets = this.targets();
    fireWeapons(this.arms, s, c, targets, this.bolts, this.torps, this.events, dt);
    this.field.step(dt, s.x, s.z);
    this.spawn(t);
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const al = this.aliens[i]!;
      moveAlien(al, s, dt, this.webs, this.events);
      alienFire(al, s, t, this.shots, this.rng, this.events);
      stepBeam(al, s, dt);
      // gone off the far side of the field
      if (al.age > 3 && Math.hypot(al.x - s.x, al.z - s.z) > 100) this.aliens.splice(i, 1);
    }
    this.command.step(t, dt, s, this.aliens, this.shots, this.webs, this.rng, this.events);
    moveShots(this.shots, s, dt);
    stepWebs(this.webs, dt);
    moveBolts(this.bolts, dt);
    for (const tp of moveTorpedoes(this.torps, targets, dt)) this.blast(tp.x, tp.z);
    this.stepPickups(dt);
    this.collide();
    const lock = acquire(this.targets(), s.x, s.z, s.heading);
    this.lock = lock ? lock.id : null;
    this.time += dt;
    this.runTime += dt;
  }

  /** The original's pacing: a hull every few seconds, under a ceiling that rises with the clock. */
  private spawn(t: number): void {
    if (t < this.nextAlien) return;
    // a capital-ship fight thins the traffic, as in the original
    const cap = this.command.boss ? Math.ceil(alienMax(t) / 2) : alienMax(t);
    if (this.aliens.length < cap) {
      const kind = pickKind(t, this.aliens, this.rng);
      if (kind) this.aliens.push(spawnAlien(kind, this.ship, t, this.rng));
    }
    this.nextAlien = t + alienInterval(t) * this.rng.range(0.8, 1.2);
  }

  private stepPickups(dt: number): void {
    const s = this.ship;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]!;
      p.life -= dt;
      const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz) || 1;
      if (d < MAGNET_R) { p.vx += (dx / d) * 60 * dt; p.vz += (dz / d) * 60 * dt; }
      p.vx *= Math.pow(0.92, dt * 60); p.vz *= Math.pow(0.92, dt * 60);
      p.x += p.vx * dt; p.z += p.vz * dt;
      if (d < PICKUP_R) {
        this.pickups.splice(i, 1);
        this.plates = Math.min(this.hull.plates, this.plates + 1);
        this.events.push({ type: 'pickup', x: p.x, z: p.z, plates: this.plates });
      } else if (p.life <= 0) this.pickups.splice(i, 1);
    }
  }

  private collide(): void {
    const rocks = this.field.rocks, s = this.ship;

    // phaser bolts: plasma torpedoes first (they can be shot down), then hulls, the boss, rock
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]!;
      const hit = (x: number, z: number, r: number) => (b.x - x) ** 2 + (b.z - z) ** 2 < (r + 0.25) ** 2;
      let spent = false;
      for (let k = this.shots.length - 1; k >= 0 && !spent; k--) {
        const sh = this.shots[k]!;
        if (sh.hp > 0 && hit(sh.x, sh.z, sh.r)) {
          spent = true;
          if (--sh.hp <= 0) { this.shots.splice(k, 1); this.events.push({ type: 'plasmaDown', x: sh.x, z: sh.z }); }
        }
      }
      for (const al of this.aliens) if (!spent && hit(al.x, al.z, al.r)) { spent = true; this.hurtAlien(al, BOLT_DAMAGE); }
      const boss = this.command.targetable();
      if (!spent && boss && hit(boss.x, boss.z, boss.r * 0.85)) { spent = true; this.hurtBoss(BOLT_DAMAGE, b.x, b.z); }
      for (const r of rocks) if (!spent && hit(r.x, r.z, r.r)) { spent = true; this.damage(r, BOLT_DAMAGE, b.x, b.z); }
      if (spent) this.bolts.splice(i, 1);
    }

    // torpedoes: a proximity fuse on anything in the way
    for (let i = this.torps.length - 1; i >= 0; i--) {
      const tp = this.torps[i]!;
      const near = (x: number, z: number, r: number) => (tp.x - x) ** 2 + (tp.z - z) ** 2 < (r + TORP_FUSE) ** 2;
      const boss = this.command.targetable();
      if (this.aliens.some((a) => near(a.x, a.z, a.r)) || (boss && near(boss.x, boss.z, boss.r)) || rocks.some((r) => near(r.x, r.z, r.r))) {
        this.torps.splice(i, 1);
        this.blast(tp.x, tp.z);
      }
    }

    if (s.invuln > 0) return;
    // enemy fire
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i]!;
      if ((sh.x - s.x) ** 2 + (sh.z - s.z) ** 2 < (sh.r + SHIP_R) ** 2) {
        this.shots.splice(i, 1);
        return this.hitShip('fire');
      }
    }
    // beams: drones and the cube
    const beams = [...this.aliens, ...(this.command.boss?.beams ?? [])];
    for (const bm of beams) {
      if (beamLive(bm) && rayDist(s.x, s.z, bm.x, bm.z, bm.beamAng, BEAM_LEN) < BEAM_W + SHIP_R) return this.hitShip('beam');
    }
    // webs
    for (const w of this.webs) if (w.r > 1 && Math.hypot(s.x - w.x, s.z - w.z) < w.r * 0.92) return this.hitShip('web');
    // ramming: hulls and the boss
    for (const al of this.aliens) {
      if (Math.hypot(s.x - al.x, s.z - al.z) < al.r + SHIP_R) { this.hurtAlien(al, 3); return this.hitShip('ram', al.x, al.z); }
    }
    const boss = this.command.boss;
    if (boss && !boss.leaving && boss.cloak < 0.5 && Math.hypot(s.x - boss.x, s.z - boss.z) < boss.r * 0.85 + SHIP_R) {
      return this.hitShip('ram', boss.x, boss.z);
    }
    // rock
    for (const r of rocks) {
      if (Math.hypot(s.x - r.x, s.z - r.z) < r.r * 0.88 + SHIP_R) {
        r.vx -= (s.x - r.x) * 0.5; r.vz -= (s.z - r.z) * 0.5;
        return this.hitShip('rock', r.x, r.z);
      }
    }
  }

  private hitShip(source: string, fromX?: number, fromZ?: number): void {
    const s = this.ship;
    if (fromX !== undefined && fromZ !== undefined) {
      // knock the two apart, so the hit reads as a collision and not a pass
      const dx = s.x - fromX, dz = s.z - fromZ, d = Math.hypot(dx, dz) || 1;
      s.vx += (dx / d) * 12; s.vz += (dz / d) * 12;
    }
    this.plates--;
    s.invuln = HIT_GRACE;
    this.events.push({ type: 'shipHit', x: s.x, z: s.z, plates: this.plates, source });
    if (this.plates <= 0) this.breach();
  }

  private hurtAlien(al: Alien, dmg: number): void {
    if (al.kind === 'drone' && al.soaked >= BORG_ADAPT) dmg *= 0.5;
    al.soaked += dmg;
    al.hp -= dmg;
    al.hitT = 0.1;
    this.events.push({ type: 'alienHit', x: al.x, z: al.z, id: al.id });
    if (al.hp > 0) return;
    const T = ALIEN_TYPES[al.kind];
    this.aliens.splice(this.aliens.indexOf(al), 1);
    this.score += T.bonus;
    this.kills++;
    this.events.push({ type: 'alienDestroyed', x: al.x, z: al.z, kind: al.kind, faction: T.faction, points: T.bonus });
    if (this.rng.next() < T.heart * HEART_SHARE) {
      this.pickups.push({ id: newId(), x: al.x, z: al.z, vx: 0, vz: 0, life: PICKUP_LIFE });
    }
  }

  private hurtBoss(dmg: number, x: number, z: number): void {
    const b = this.command.boss;
    if (!b) return;
    this.events.push({ type: 'bossHit', x, z });
    if (!this.command.hurt(dmg)) return;
    const points = this.command.killed(this.runTime);
    this.score += points;
    this.kills++;
    this.plates = Math.min(this.hull.plates, this.plates + BOSS_PLATES);
    this.events.push({ type: 'bossDestroyed', x: b.x, z: b.z, name: b.name, faction: b.faction, points });
    // the wing breaks off when its flagship goes
    for (const al of this.aliens) if (al.escort) { al.fleeing = true; al.vx = (al.x - b.x) * 2; al.vz = (al.z - b.z) * 2; }
  }

  private damage(r: Rock, amount: number, x: number, z: number): void {
    r.hp -= amount;
    r.hitT = 0.12;
    this.events.push({ type: 'rockHit', x, z, id: r.id });
    if (r.hp <= 0) this.destroy(r);
  }

  private destroy(r: Rock): void {
    if (!this.field.rocks.includes(r)) return;
    const points = ROCK_POINTS[r.size];
    this.score += points;
    this.kills++;
    this.field.split(r);
    this.events.push({ type: 'rockDestroyed', x: r.x, z: r.z, size: r.size, points });
  }

  private blast(x: number, z: number): void {
    this.events.push({ type: 'blast', x, z, radius: TORP_BLAST });
    const inside = (ox: number, oz: number, r: number) => (ox - x) ** 2 + (oz - z) ** 2 < (TORP_BLAST + r) ** 2;
    for (const r of [...this.field.rocks]) if (inside(r.x, r.z, r.r)) this.damage(r, TORP_DAMAGE, r.x, r.z);
    for (const al of [...this.aliens]) if (inside(al.x, al.z, al.r)) this.hurtAlien(al, TORP_DAMAGE);
    const boss = this.command.targetable();
    if (boss && inside(boss.x, boss.z, boss.r)) this.hurtBoss(TORP_DAMAGE, boss.x, boss.z);
  }

  /** The last plate went. Report the run, then start a new one where the ship is. */
  private breach(): void {
    const s = this.ship;
    this.best = Math.max(this.best, this.score);
    this.events.push({ type: 'breach', x: s.x, z: s.z, score: this.score });
    this.field.rocks = this.field.rocks.filter((r) => Math.hypot(r.x - s.x, r.z - s.z) >= 14);
    this.aliens = [];
    this.shots = [];
    this.webs = [];
    this.pickups = [];
    this.command.reset();
    this.nextAlien = ALIEN_FIRST;
    this.score = 0;
    this.kills = 0;
    this.runTime = 0;
    this.plates = this.hull.plates;
    this.arms = newArms();
    s.invuln = BREACH_GRACE;
  }
}
