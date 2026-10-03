import type { Rng } from './rng';
import { BULWARK_COUNT, BULWARK_R, FIELD_BAND, FIELD_TARGET, ROCK_HP, ROCK_R } from './tuning';

// ── the field ─────────────────────────────────────────────────────────────
// Rock is the game's ground truth: the thing you thread, the thing you break,
// and (from M5) where the dilithium comes from. Three sizes; a large rock
// splits into two medium and a medium into two small, as in the original's
// shardOf. The field tiles in a band around the ship and is topped back up as
// it is cleared, so on-screen density is what is governed.

export type RockSize = 0 | 1 | 2;

export interface Rock {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  size: RockSize;
  r: number;
  hp: number;
  /** Which of the rock shapes to draw. */
  variant: number;
  /** Tumble: an axis and a rate, for the renderer. */
  ax: number;
  ay: number;
  az: number;
  spin: number;
  /** Seconds since it appeared (for a fade-in) and since it was last hit (a flash). */
  age: number;
  hitT: number;
}

/**
 * A massive asteroid: nothing breaks it. It stops fire from both sides, it
 * hurts to fly into, and the heavier enemy hulls use it as cover. Bulwarks
 * drift slowly and tumble slower still; rock that drifts into one glances off.
 */
export interface Bulwark {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  r: number;
  variant: number;
  ax: number;
  ay: number;
  az: number;
  spin: number;
  age: number;
}

export const ROCK_VARIANTS = 4;
export const BULWARK_VARIANTS = 3;
/** How much of the field target a rock of each size counts for. */
const WEIGHT = [1, 0.45, 0.2] as const;

export class Field {
  rocks: Rock[] = [];
  bulwarks: Bulwark[] = [];
  private nextId = 1;

  constructor(private readonly rng: Rng) {}

  /** Fill the band around (cx, cz), keeping the first moments clear around the ship. */
  seed(cx: number, cz: number): void {
    let tries = 0;
    while (this.bulwarks.length < BULWARK_COUNT && tries++ < 400) {
      const x = cx + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      const z = cz + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      this.addBulwark(x, z, 34, cx, cz).age = 10;
    }
    while (this.weight() < FIELD_TARGET) {
      const x = cx + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      const z = cz + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      if (Math.hypot(x - cx, z - cz) < 18 || this.insideBulwark(x, z, ROCK_R[0])) continue;
      const big = this.rng.next() < 0.7;
      const r = this.spawn(big ? 0 : 1, x, z);
      r.age = 10;
    }
  }

  spawn(size: RockSize, x: number, z: number, vx?: number, vz?: number): Rock {
    const a = this.rng.range(0, Math.PI * 2), sp = this.rng.range(1.5, 6) * (1 + size * 0.35);
    const ax = this.rng.range(-1, 1), ay = this.rng.range(-1, 1), az = this.rng.range(-1, 1);
    const n = Math.hypot(ax, ay, az) || 1;
    const rock: Rock = {
      id: this.nextId++, x, z,
      vx: vx ?? Math.cos(a) * sp, vz: vz ?? Math.sin(a) * sp,
      size, r: ROCK_R[size] * this.rng.range(0.88, 1.12), hp: ROCK_HP[size],
      variant: this.rng.int(ROCK_VARIANTS), ax: ax / n, ay: ay / n, az: az / n,
      spin: this.rng.range(-0.9, 0.9) * (1 + size * 0.6), age: 0, hitT: 0,
    };
    this.rocks.push(rock);
    return rock;
  }

  /** Remove a broken rock and put its pieces in its place. */
  split(rock: Rock): Rock[] {
    this.rocks.splice(this.rocks.indexOf(rock), 1);
    if (rock.size >= 2) return [];
    const size = (rock.size + 1) as RockSize;
    const a = this.rng.range(0, Math.PI * 2), kick = this.rng.range(3.5, 7);
    const out: Rock[] = [];
    for (const side of [-1, 1]) {
      const px = Math.cos(a) * side, pz = Math.sin(a) * side;
      const child = this.spawn(size, rock.x + px * rock.r * 0.5, rock.z + pz * rock.r * 0.5,
        rock.vx * 0.6 + px * kick, rock.vz * 0.6 + pz * kick);
      child.age = 10;
      out.push(child);
    }
    return out;
  }

  /** A bulwark at (x, z) if it fits: clear of the ship's spot by `clear` and of every other bulwark. */
  private addBulwark(x: number, z: number, clear: number, cx = 0, cz = 0): Bulwark {
    const r = this.rng.range(BULWARK_R[0], BULWARK_R[1]);
    const ax = this.rng.range(-1, 1), ay = this.rng.range(-1, 1), az = this.rng.range(-1, 1);
    const n = Math.hypot(ax, ay, az) || 1;
    const a = this.rng.range(0, Math.PI * 2), sp = this.rng.range(0.3, 1.1);
    const b: Bulwark = {
      id: this.nextId++, x, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, r,
      variant: this.rng.int(BULWARK_VARIANTS), ax: ax / n, ay: ay / n, az: az / n, spin: this.rng.range(-0.08, 0.08), age: 0,
    };
    const ok = Math.hypot(x - cx, z - cz) > clear + r && this.bulwarks.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r + 14);
    if (ok) this.bulwarks.push(b);
    return b;
  }

  /** True if a circle at (x, z) overlaps a bulwark. */
  insideBulwark(x: number, z: number, r: number): boolean {
    return this.bulwarks.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + r);
  }

  step(dt: number, cx: number, cz: number): void {
    const half = FIELD_BAND / 2;
    for (const b of this.bulwarks) {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.age += dt;
      if (b.x - cx > half) b.x -= FIELD_BAND; else if (b.x - cx < -half) b.x += FIELD_BAND;
      if (b.z - cz > half) b.z -= FIELD_BAND; else if (b.z - cz < -half) b.z += FIELD_BAND;
    }
    for (const r of this.rocks) {
      r.x += r.vx * dt;
      r.z += r.vz * dt;
      r.age += dt;
      if (r.hitT > 0) r.hitT = Math.max(0, r.hitT - dt);
      if (r.x - cx > half) r.x -= FIELD_BAND; else if (r.x - cx < -half) r.x += FIELD_BAND;
      if (r.z - cz > half) r.z -= FIELD_BAND; else if (r.z - cz < -half) r.z += FIELD_BAND;
      // rock glances off a bulwark
      for (const b of this.bulwarks) {
        const dx = r.x - b.x, dz = r.z - b.z, d = Math.hypot(dx, dz) || 1, min = b.r * 0.92 + r.r;
        if (d >= min) continue;
        const nx = dx / d, nz = dz / d;
        r.x = b.x + nx * min; r.z = b.z + nz * min;
        const vn = (r.vx - b.vx) * nx + (r.vz - b.vz) * nz;
        if (vn < 0) { r.vx -= 1.6 * vn * nx; r.vz -= 1.6 * vn * nz; }
      }
    }
    // Top up out in the fog, never in front of the player.
    if (this.weight() < FIELD_TARGET) {
      const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(95, 115);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!this.insideBulwark(x, z, ROCK_R[0])) this.spawn(0, x, z);
    }
  }

  find(id: number | null): Rock | undefined {
    return id === null ? undefined : this.rocks.find((r) => r.id === id);
  }

  private weight(): number {
    let w = 0;
    for (const r of this.rocks) w += WEIGHT[r.size];
    return w;
  }
}
