import type { Pressure } from './director';
import { newId } from './ids';
import type { Rng } from './rng';
import { BULWARK_COUNT, BULWARK_R, FIELD_BAND, FIELD_TARGET, ROCK_HP, ROCK_R } from './tuning';

// ── the field ─────────────────────────────────────────────────────────────
// Rock is the game's ground truth: the thing you thread, the thing you break,
// and where the krail comes from. Three sizes; a large rock splits into
// two medium and a medium into two small, as in the original's shardOf. The
// field tiles in a band around the ship and is topped back up as it is
// cleared, so on-screen density is what is governed.
//
// Rock comes in kinds, and the director decides the mix as the run goes on:
//   basalt   · the common rock. Sometimes carries a crystal.
//   iron     · from about 2:30: dark and dense, three times the hull, splits
//              into more iron. Better odds of a crystal.
//   rich     · violet-veined and rare all run: a shower of krail.
//   volatile · from about 4:30: glows white-hot and goes off when broken,
//              hurting anything close, you included.
//   rare     · one every minute or two, gold, never split: a power-up inside.
// and in formations: single rocks, clusters drifting together, and a big rock
// shepherding its own debris.

export type RockSize = 0 | 1 | 2;
export type RockKind = 'basalt' | 'iron' | 'rich' | 'volatile' | 'rare';

export interface RockKindDef {
  /** Hull multiplier. */
  hp: number;
  /** Chance of krail, by size (large, medium, small), and how much when it does. */
  crystal: readonly [number, number, number];
  crystals: readonly [number, number, number];
  /** Breaks into smaller rock of this kind, or none. */
  splitsInto: RockKind | null;
  /** Points multiplier. */
  points: number;
}

export const ROCK_KINDS: Record<RockKind, RockKindDef> = {
  basalt:   { hp: 1,   crystal: [0.75, 0.5, 0.35], crystals: [3, 2, 1], splitsInto: 'basalt', points: 1 },
  iron:     { hp: 3,   crystal: [0.85, 0.65, 0.5], crystals: [4, 2, 1], splitsInto: 'iron',   points: 2 },
  rich:     { hp: 1.6, crystal: [1, 1, 1],         crystals: [9, 6, 4], splitsInto: 'basalt', points: 2 },
  volatile: { hp: 1,   crystal: [0.6, 0.6, 0.6],   crystals: [3, 2, 1], splitsInto: null,     points: 2 },
  rare:     { hp: 4,   crystal: [1, 1, 1],         crystals: [5, 5, 5], splitsInto: null,     points: 5 },
};

/** A volatile rock's blast: radius and damage to hulls and rock. */
export const VOLATILE_BLAST = 6.5;
export const VOLATILE_DAMAGE = 6;

export interface Rock {
  id: number;
  kind: RockKind;
  x: number;
  z: number;
  vx: number;
  vz: number;
  size: RockSize;
  r: number;
  hp: number;
  maxHp: number;
  /** Seconds before this rock can count as a near miss again. */
  grazeT: number;
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

/** What the field reads from the director each step. */
export type FieldParams = Pick<Pressure, 'fieldTarget' | 'rockSpeed' | 'rockHp' | 'cluster' | 'shepherd' | 'iron' | 'volatile' | 'rich'>;

export const CALM: FieldParams = { fieldTarget: FIELD_TARGET * 0.4, rockSpeed: 0.75, rockHp: 1, cluster: 0, shepherd: 0, iron: 0, volatile: 0, rich: 0 };

export class Field {
  rocks: Rock[] = [];
  bulwarks: Bulwark[] = [];
  /** Extra chance of rich rock in new top-ups (the mineral-rich event). */
  richBoost = 0;
  /** Extra field density, as a multiplier (events). */
  density = 1;

  constructor(private readonly rng: Rng) {}

  /** Fill the band around (cx, cz), keeping the first moments clear around the ship. */
  seed(cx: number, cz: number, target = CALM.fieldTarget): void {
    let tries = 0;
    while (this.bulwarks.length < BULWARK_COUNT && tries++ < 400) {
      const x = cx + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      const z = cz + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      this.addBulwark(x, z, 34, cx, cz).age = 10;
    }
    while (this.weight() < target) {
      const x = cx + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      const z = cz + this.rng.range(-FIELD_BAND / 2, FIELD_BAND / 2);
      if (Math.hypot(x - cx, z - cz) < 18 || this.insideBulwark(x, z, ROCK_R[0])) continue;
      const big = this.rng.next() < 0.7;
      const r = this.spawn(big ? 0 : 1, x, z, undefined, undefined, 'basalt', 1, CALM.rockSpeed);
      r.age = 10;
    }
  }

  spawn(size: RockSize, x: number, z: number, vx?: number, vz?: number, kind: RockKind = 'basalt', hpScale = 1, speed = 1): Rock {
    const a = this.rng.range(0, Math.PI * 2), sp = this.rng.range(1.5, 6) * (1 + size * 0.35) * speed;
    const ax = this.rng.range(-1, 1), ay = this.rng.range(-1, 1), az = this.rng.range(-1, 1);
    const n = Math.hypot(ax, ay, az) || 1;
    const hp = Math.max(1, Math.round(ROCK_HP[size] * ROCK_KINDS[kind].hp * hpScale));
    const rock: Rock = {
      id: newId(), kind, x, z,
      vx: vx ?? Math.cos(a) * sp, vz: vz ?? Math.sin(a) * sp,
      size, r: ROCK_R[size] * this.rng.range(0.88, 1.12) * (kind === 'iron' ? 0.92 : 1), hp, maxHp: hp, grazeT: 0,
      variant: this.rng.int(ROCK_VARIANTS), ax: ax / n, ay: ay / n, az: az / n,
      spin: this.rng.range(-0.9, 0.9) * (1 + size * 0.6), age: 0, hitT: 0,
    };
    this.rocks.push(rock);
    return rock;
  }

  /** Remove a broken rock and put its pieces in its place. Iron splits into three. */
  split(rock: Rock, hpScale = 1): Rock[] {
    const i = this.rocks.indexOf(rock);
    if (i >= 0) this.rocks.splice(i, 1);
    const into = ROCK_KINDS[rock.kind].splitsInto;
    if (rock.size >= 2 || !into) return [];
    const size = (rock.size + 1) as RockSize;
    const a = this.rng.range(0, Math.PI * 2), kick = this.rng.range(3.5, 7);
    const pieces = rock.kind === 'iron' ? 3 : 2;
    const out: Rock[] = [];
    for (let k = 0; k < pieces; k++) {
      const pa = a + (k / pieces) * Math.PI * 2, px = Math.cos(pa), pz = Math.sin(pa);
      const child = this.spawn(size, rock.x + px * rock.r * 0.5, rock.z + pz * rock.r * 0.5,
        rock.vx * 0.6 + px * kick, rock.vz * 0.6 + pz * kick, into, hpScale);
      child.age = 10;
      out.push(child);
    }
    return out;
  }

  /** A rare rock, out in the fog: gold, tough, a power-up inside. */
  spawnRare(cx: number, cz: number, heading: number): Rock | null {
    for (let tries = 0; tries < 8; tries++) {
      const a = heading + this.rng.range(-0.8, 0.8), d = this.rng.range(70, 95);
      const x = cx + Math.cos(a) * d, z = cz - Math.sin(a) * d;
      if (this.insideBulwark(x, z, ROCK_R[1] + 2)) continue;
      const r = this.spawn(1, x, z, undefined, undefined, 'rare');
      r.vx *= 0.4; r.vz *= 0.4;
      return r;
    }
    return null;
  }

  /** New rock out in the fog, in the formation and kind the director's mix asks for. */
  private topUp(cx: number, cz: number, p: FieldParams): void {
    const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(95, 115);
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (this.insideBulwark(x, z, ROCK_R[0] + 4)) return;
    const kind = (): RockKind => {
      const r = this.rng.next();
      if (r < p.rich + this.richBoost) return 'rich';
      if (r < p.rich + this.richBoost + p.volatile) return 'volatile';
      if (r < p.rich + this.richBoost + p.volatile + p.iron) return 'iron';
      return 'basalt';
    };
    const roll = this.rng.next();
    const hp = p.rockHp, sp = p.rockSpeed;
    if (roll < p.cluster) {
      // a cluster: four to six pieces drifting as one
      const head = this.rng.range(0, Math.PI * 2), v = this.rng.range(2, 5) * sp, k = kind();
      const n = 4 + this.rng.int(3);
      for (let i = 0; i < n; i++) {
        const size = (this.rng.next() < 0.45 ? 1 : 2) as RockSize;
        const r = this.spawn(size, x + this.rng.range(-5, 5), z + this.rng.range(-5, 5),
          Math.cos(head) * v + this.rng.range(-0.6, 0.6), Math.sin(head) * v + this.rng.range(-0.6, 0.6), k === 'rich' ? 'basalt' : k, hp);
        r.age = 0;
      }
    } else if (roll < p.cluster + p.shepherd) {
      // a shepherd: a big rock in its own cloud of debris
      const big = this.spawn(0, x, z, undefined, undefined, kind() === 'iron' ? 'iron' : 'basalt', hp * 1.4, sp * 0.6);
      big.r *= 1.35;
      const n = 5 + this.rng.int(3);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2 + this.rng.range(-0.3, 0.3), dist = big.r + this.rng.range(2.5, 5);
        this.spawn(2, x + Math.cos(t) * dist, z + Math.sin(t) * dist,
          big.vx - Math.sin(t) * 1.2, big.vz + Math.cos(t) * 1.2, this.rng.next() < 0.3 ? 'iron' : 'basalt', hp);
      }
    } else {
      this.spawn(0, x, z, undefined, undefined, kind(), hp, sp);
    }
  }

  /** A bulwark at (x, z) if it fits: clear of the ship's spot by `clear` and of every other bulwark. */
  private addBulwark(x: number, z: number, clear: number, cx = 0, cz = 0): Bulwark {
    const r = this.rng.range(BULWARK_R[0], BULWARK_R[1]);
    const ax = this.rng.range(-1, 1), ay = this.rng.range(-1, 1), az = this.rng.range(-1, 1);
    const n = Math.hypot(ax, ay, az) || 1;
    const a = this.rng.range(0, Math.PI * 2), sp = this.rng.range(0.3, 1.1);
    const b: Bulwark = {
      id: newId(), x, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, r,
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

  step(dt: number, cx: number, cz: number, p: FieldParams = CALM): void {
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
      if (r.grazeT > 0) r.grazeT = Math.max(0, r.grazeT - dt);
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
    if (this.weight() < p.fieldTarget * this.density) this.topUp(cx, cz, p);
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
