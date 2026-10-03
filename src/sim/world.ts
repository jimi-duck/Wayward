import { HULLS, type Hull, type HullId } from '../content/hulls';
import type { InputFrame } from '../input/types';
import { flightControls } from './controls';
import type { GameEvent } from './events';
import { Field, type Rock } from './field';
import { Rng } from './rng';
import { newShip, stepShip, type ShipState } from './ship';
import {
  BOLT_DAMAGE, BREACH_GRACE, HIT_GRACE, ROCK_POINTS, SHIP_R, TORP_BLAST, TORP_DAMAGE, TORP_FUSE,
} from './tuning';
import { acquire, fireWeapons, moveBolts, moveTorpedoes, newArms, type Arms, type Bolt, type Torpedo } from './weapons';

// The simulation's root. It never touches Three.js, so it can run headless.
// Conventions: play is on the XZ plane, heading 0 faces +X and PI/2 faces -Z
// ("up" on screen), headings are never wrapped.

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
  /** The rock a torpedo launched now would lock, for the HUD. */
  lock: number | null = null;
  score = 0;
  best = 0;
  /** Seconds of simulated time, and seconds into the current run. */
  time = 0;
  runTime = 0;
  /** Rocks broken this run. */
  kills = 0;
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

  step(dt: number, input: InputFrame): void {
    Object.assign(this.prev, this.ship);
    const c = flightControls(input);
    const s = this.ship;
    stepShip(s, c, this.hull, dt);
    fireWeapons(this.arms, s, c, this.field, this.bolts, this.torps, this.events, dt);
    this.field.step(dt, s.x, s.z);
    moveBolts(this.bolts, dt);
    for (const t of moveTorpedoes(this.torps, this.field, dt)) this.blast(t.x, t.z);
    this.collide();
    const lock = acquire(this.field, s.x, s.z, s.heading);
    this.lock = lock ? lock.id : null;
    this.time += dt;
    this.runTime += dt;
  }

  private collide(): void {
    const rocks = this.field.rocks;

    // phaser bolts: the first rock a bolt touches takes the damage
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]!;
      for (const r of rocks) {
        const rr = r.r + 0.25;
        if ((b.x - r.x) ** 2 + (b.z - r.z) ** 2 < rr * rr) {
          this.bolts.splice(i, 1);
          this.damage(r, BOLT_DAMAGE, b.x, b.z);
          break;
        }
      }
    }

    // torpedoes: a proximity fuse on any rock in the way
    for (let i = this.torps.length - 1; i >= 0; i--) {
      const t = this.torps[i]!;
      for (const r of rocks) {
        const rr = r.r + TORP_FUSE;
        if ((t.x - r.x) ** 2 + (t.z - r.z) ** 2 < rr * rr) {
          this.torps.splice(i, 1);
          this.blast(t.x, t.z);
          break;
        }
      }
    }

    // the ship: rock is a hull plate, unless the ship is in a grace window
    const s = this.ship;
    if (s.invuln > 0) return;
    for (const r of rocks) {
      const dx = s.x - r.x, dz = s.z - r.z, d = Math.hypot(dx, dz), reach = r.r * 0.88 + SHIP_R;
      if (d >= reach) continue;
      const nx = d > 0 ? dx / d : 1, nz = d > 0 ? dz / d : 0;
      // knock the two apart, so the hit reads as a collision and not a pass
      s.vx += nx * 12; s.vz += nz * 12;
      r.vx -= nx * 3; r.vz -= nz * 3;
      this.plates--;
      s.invuln = HIT_GRACE;
      this.events.push({ type: 'shipHit', x: s.x, z: s.z, plates: this.plates });
      if (this.plates <= 0) this.breach();
      return;
    }
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
    for (const r of [...this.field.rocks]) {
      const reach = TORP_BLAST + r.r;
      if ((r.x - x) ** 2 + (r.z - z) ** 2 < reach * reach) this.damage(r, TORP_DAMAGE, r.x, r.z);
    }
  }

  /** The last plate went. Report the run, then start a new one where the ship is. */
  private breach(): void {
    const s = this.ship;
    this.best = Math.max(this.best, this.score);
    this.events.push({ type: 'breach', x: s.x, z: s.z, score: this.score });
    // clear a pocket so the new run does not open inside the rock that ended the last
    this.field.rocks = this.field.rocks.filter((r) => Math.hypot(r.x - s.x, r.z - s.z) >= 14);
    this.score = 0;
    this.kills = 0;
    this.runTime = 0;
    this.plates = this.hull.plates;
    this.arms = newArms();
    s.invuln = BREACH_GRACE;
  }
}
