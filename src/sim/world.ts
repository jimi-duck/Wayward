import { HULL, type Hull } from '../content/hulls';
import type { InputFrame } from '../input/types';
import { Command } from './bosses';
import { flightControls } from './controls';
import {
  ALIEN_FIRST, ALIEN_TYPES, BEAM_LEN, BEAM_W, BORG_ADAPT, CULL, alienFire, alienInterval, alienMax, beamLive, moveAlien,
  moveShots, newId, pickKind, rayDist, spawnAlien, stepBeam, stepWebs, type Alien, type Arena, type Pickup, type Shot,
  type Web,
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
// Conventions: the ship flies on the XZ plane (y = 0), heading 0 faces +X and
// PI/2 faces -Z ("up" on screen), headings are never wrapped. Enemies, their
// fire and the player's fire move in 3D; rock and bulwarks sit on the plane.

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
  readonly hull: Hull = HULL;
  plates: number = HULL.plates;
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

  /** Everything that happened since the last call. */
  drain(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** What the seeker can see this step. A capital ship still dropping in is not yet in reach. */
  targets(): Targets {
    const boss = this.command.targetable();
    return { ships: this.aliens, boss: boss && !boss.arriving ? boss : null, rocks: this.field.rocks };
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
    const arena: Arena = { bulwarks: this.field.bulwarks, rocks: this.field.rocks, aliens: this.aliens, bolts: this.bolts };
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const al = this.aliens[i]!;
      moveAlien(al, s, dt, arena, this.webs, this.rng, this.events);
      alienFire(al, s, t, this.shots, this.field.bulwarks, this.rng, this.events);
      stepBeam(al, s, dt);
      // gone: off the far side of the sky, or away after leaving
      const d = Math.hypot(al.x - s.x, al.z - s.z);
      if (d > CULL || (al.fleeing && al.age > 3 && d > 160)) this.aliens.splice(i, 1);
    }
    this.command.step(t, dt, s, this.aliens, this.shots, this.webs, this.rng, this.events);
    moveShots(this.shots, s, dt);
    stepWebs(this.webs, dt);
    moveBolts(this.bolts, dt);
    for (const tp of moveTorpedoes(this.torps, targets, dt)) this.blast(tp.x, tp.y, tp.z);
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
      if (kind) {
        const lead = spawnAlien(kind, this.ship, t, this.rng);
        this.aliens.push(lead);
        // interceptors past the opening come in pairs: a wingman in echelon
        const T = ALIEN_TYPES[kind];
        if (T.role === 'interceptor' && t > 30 && this.aliens.length < cap && this.rng.next() < 0.6) {
          const wing = spawnAlien(kind, this.ship, t, this.rng, { x: lead.x + Math.sin(lead.face) * 5, y: lead.y + 1.5, z: lead.z + Math.cos(lead.face) * 5 });
          wing.escort = false;
          wing.slide = lead.slide;
          wing.modeT = lead.modeT + 0.6;
          this.aliens.push(wing);
        }
      }
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
    const rocks = this.field.rocks, bulwarks = this.field.bulwarks, s = this.ship;
    const inBulwark = (x: number, y: number, z: number, r: number) =>
      bulwarks.find((b) => (x - b.x) ** 2 + y * y + (z - b.z) ** 2 < (b.r * 0.9 + r) ** 2);

    // phaser lances: plasma torpedoes first (they can be shot down), then hulls, the boss, rock, bulwarks
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]!;
      const hit = (x: number, y: number, z: number, r: number) => (b.x - x) ** 2 + (b.y - y) ** 2 + (b.z - z) ** 2 < (r + 0.3) ** 2;
      let spent = false;
      for (let k = this.shots.length - 1; k >= 0 && !spent; k--) {
        const sh = this.shots[k]!;
        if (sh.hp > 0 && hit(sh.x, sh.y, sh.z, sh.r)) {
          spent = true;
          if (--sh.hp <= 0) { this.shots.splice(k, 1); this.events.push({ type: 'plasmaDown', x: sh.x, y: sh.y, z: sh.z }); }
        }
      }
      for (const al of this.aliens) if (!spent && hit(al.x, al.y, al.z, al.r)) { spent = true; this.hurtAlien(al, BOLT_DAMAGE, b.x, b.y, b.z); }
      const boss = this.command.targetable();
      if (!spent && boss && hit(boss.x, boss.y, boss.z, boss.r * 0.85)) { spent = true; this.hurtBoss(BOLT_DAMAGE, b.x, b.y, b.z); }
      for (const r of rocks) if (!spent && hit(r.x, 0, r.z, r.r)) { spent = true; this.damage(r, BOLT_DAMAGE, b.x, b.y, b.z); }
      if (!spent && inBulwark(b.x, b.y, b.z, 0.2)) { spent = true; this.events.push({ type: 'bulwarkHit', x: b.x, y: b.y, z: b.z }); }
      if (spent) this.bolts.splice(i, 1);
    }

    // torpedoes: a proximity fuse on anything in the way
    for (let i = this.torps.length - 1; i >= 0; i--) {
      const tp = this.torps[i]!;
      const near = (x: number, y: number, z: number, r: number) => (tp.x - x) ** 2 + (tp.y - y) ** 2 + (tp.z - z) ** 2 < (r + TORP_FUSE) ** 2;
      const boss = this.command.targetable();
      if (this.aliens.some((a) => near(a.x, a.y, a.z, a.r)) || (boss && near(boss.x, boss.y, boss.z, boss.r))
        || rocks.some((r) => near(r.x, 0, r.z, r.r)) || inBulwark(tp.x, tp.y, tp.z, TORP_FUSE)) {
        this.torps.splice(i, 1);
        this.blast(tp.x, tp.y, tp.z);
      }
    }

    // enemy fire stops on a bulwark
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i]!;
      if (inBulwark(sh.x, sh.y, sh.z, sh.r)) { this.shots.splice(i, 1); this.events.push({ type: 'bulwarkHit', x: sh.x, y: sh.y, z: sh.z }); }
    }

    // the ship against a bulwark: it is solid, whatever the grace
    for (const b of bulwarks) {
      const dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz) || 1, min = b.r * 0.88 + SHIP_R;
      if (d >= min) continue;
      const nx = dx / d, nz = dz / d;
      s.x = b.x + nx * min; s.z = b.z + nz * min;
      const vn = s.vx * nx + s.vz * nz;
      if (vn < 0) { s.vx -= 1.5 * vn * nx; s.vz -= 1.5 * vn * nz; }
      if (s.invuln <= 0) return this.hitShip('bulwark');
    }

    if (s.invuln > 0) return;
    // enemy fire
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i]!;
      if ((sh.x - s.x) ** 2 + sh.y ** 2 + (sh.z - s.z) ** 2 < (sh.r + SHIP_R) ** 2) {
        this.shots.splice(i, 1);
        return this.hitShip('fire');
      }
    }
    // beams: drones low enough to cut across the plane, and the cube
    const beams = [...this.aliens.filter((a) => Math.abs(a.y) < 3), ...(this.command.boss?.beams ?? [])];
    for (const bm of beams) {
      if (beamLive(bm) && rayDist(s.x, s.z, bm.x, bm.z, bm.beamAng, BEAM_LEN) < BEAM_W + SHIP_R) return this.hitShip('beam');
    }
    // webs
    for (const w of this.webs) if (w.r > 1 && Math.hypot(s.x - w.x, s.z - w.z) < w.r * 0.92) return this.hitShip('web');
    // ramming: hulls and the boss
    for (const al of this.aliens) {
      if (Math.hypot(s.x - al.x, al.y, s.z - al.z) < al.r + SHIP_R) { this.hurtAlien(al, 3, al.x, al.y, al.z); return this.hitShip('ram', al.x, al.z); }
    }
    const boss = this.command.boss;
    if (boss && !boss.leaving && boss.cloak < 0.5 && Math.hypot(s.x - boss.x, boss.y, s.z - boss.z) < boss.r * 0.85 + SHIP_R) {
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

  private hurtAlien(al: Alien, dmg: number, x: number, y: number, z: number): void {
    if (al.kind === 'drone' && al.soaked >= BORG_ADAPT) dmg *= 0.5;
    al.soaked += dmg;
    al.hp -= dmg;
    al.hitT = 0.1;
    this.events.push({ type: 'alienHit', x, y, z, id: al.id });
    if (al.hp > 0) return;
    const T = ALIEN_TYPES[al.kind];
    this.aliens.splice(this.aliens.indexOf(al), 1);
    this.score += T.bonus;
    this.kills++;
    this.events.push({ type: 'alienDestroyed', x: al.x, y: al.y, z: al.z, kind: al.kind, faction: T.faction, points: T.bonus, r: al.r });
    if (this.rng.next() < T.heart * HEART_SHARE) {
      this.pickups.push({ id: newId(), x: al.x, z: al.z, vx: 0, vz: 0, life: PICKUP_LIFE });
    }
  }

  private hurtBoss(dmg: number, x: number, y: number, z: number): void {
    const b = this.command.boss;
    if (!b || b.arriving) return;
    this.events.push({ type: 'bossHit', x, y, z });
    if (!this.command.hurt(dmg)) return;
    const points = this.command.killed(this.runTime);
    this.score += points;
    this.kills++;
    this.plates = Math.min(this.hull.plates, this.plates + BOSS_PLATES);
    this.events.push({ type: 'bossDestroyed', x: b.x, y: b.y, z: b.z, name: b.name, faction: b.faction, points });
    // the wing breaks off when its flagship goes
    for (const al of this.aliens) if (al.escort) { al.fleeing = true; al.vx = (al.x - b.x) * 2; al.vz = (al.z - b.z) * 2; }
  }

  private damage(r: Rock, amount: number, x: number, y: number, z: number): void {
    r.hp -= amount;
    r.hitT = 0.12;
    this.events.push({ type: 'rockHit', x, y, z, id: r.id });
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

  private blast(x: number, y: number, z: number): void {
    this.events.push({ type: 'blast', x, y, z, radius: TORP_BLAST });
    const inside = (ox: number, oy: number, oz: number, r: number) => (ox - x) ** 2 + (oy - y) ** 2 + (oz - z) ** 2 < (TORP_BLAST + r) ** 2;
    for (const r of [...this.field.rocks]) if (inside(r.x, 0, r.z, r.r)) this.damage(r, TORP_DAMAGE, r.x, 0, r.z);
    for (const al of [...this.aliens]) if (inside(al.x, al.y, al.z, al.r)) this.hurtAlien(al, TORP_DAMAGE, al.x, al.y, al.z);
    const boss = this.command.targetable();
    if (boss && inside(boss.x, boss.y, boss.z, boss.r)) this.hurtBoss(TORP_DAMAGE, boss.x, boss.y, boss.z);
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
