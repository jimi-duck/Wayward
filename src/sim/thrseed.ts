import type { World } from './world';
import { t } from '../i18n';

// ── the Thren seed ────────────────────────────────────────────────────────
// A growth on a rock in a Thren sky: a dark knot with pale veins. Left alone it
// grows. Shoot it and it answers with a knot of motes (the Scatter's own),
// more of them the bigger it is. Burn it early, while it is small, and it is
// only a rock with a secret. Stay still and slow beside it and it goes quiet;
// hold that and you can study it once. Plain data (docs/SITES.md).

export const SEED_HP = 40;
/** Its hull radius (units), growth per second (0 to 1 takes 240 s), and how big its hull gets with growth. */
const SEED_R = 7;
const SEED_GROW = 1 / 240;
/** Studying: the ring (units), how slow you must be, the seconds it takes. */
const SEED_STUDY_R = 34;
const SEED_STUDY_SPEED = 8;
export const SEED_STUDY_T = 8;
/** Motes in an answer: a base and a share of growth; seconds between answers. */
const SEED_ANSWER = 1;
const SEED_ANSWER_GROW = 2;
const SEED_ANSWER_EVERY = 12;
/** A bloomed seed (growth 1) calls a knot when you come within this (units), every so many seconds. */
const SEED_BLOOM_R = 200;
const SEED_BLOOM_EVERY = 30;
/** Burned small (under this growth) it is clean; later it bursts. */
const SEED_CLEAN = 0.5;
export const SEED_CYRITE = 15;
export const SEED_PARTS = 6;

export type SeedState = 'growing' | 'quiet' | 'studied' | 'dead';

export class ThrenSeed {
  x: number; z: number;
  /** 0 (a knot) to 1 (bloomed). */
  growth = 0.15;
  hp = SEED_HP;
  hitT = 0;
  state: SeedState = 'growing';
  /** Seconds of study done. */
  study = 0;
  /** Motes it has sent (ids). */
  readonly sent = new Set<number>();
  private answerAt = 0;
  private bloomAt = SEED_BLOOM_EVERY;

  constructor(x: number, z: number) { this.x = x; this.z = z; }

  get r(): number { return SEED_R * (0.7 + 0.6 * this.growth); }

  /** A weapon lands on it. Returns true when it breaks. */
  hurt(w: World, dmg: number): boolean {
    if (this.state === 'dead') return false;
    this.hp -= dmg;
    this.hitT = 0.15;
    this.study = 0;
    this.answer(w);
    if (this.hp > 0) return false;
    this.state = 'dead';
    // late, it bursts
    if (this.growth >= SEED_CLEAN) this.knot(w, 2, 14);
    return true;
  }

  step(w: World, dt: number): void {
    if (this.state === 'dead') return;
    this.hitT = Math.max(0, this.hitT - dt);
    for (const id of [...this.sent]) if (!w.aliens.some((a) => a.id === id)) this.sent.delete(id);
    const s = w.ship, d = Math.hypot(s.x - this.x, s.z - this.z), speed = Math.hypot(s.vx, s.vz);
    const still = d < SEED_STUDY_R && speed < SEED_STUDY_SPEED && !w.inDanger();
    if (this.state === 'studied') return;
    if (still) {
      this.state = 'quiet';
      this.study += dt;
      if (this.study >= SEED_STUDY_T) { this.state = 'studied'; w.studySeed(this); }
      return;
    }
    this.study = Math.max(0, this.study - dt * 2);
    this.state = 'growing';
    // left alone it grows, and a bloomed one calls a knot when you come near
    this.growth = Math.min(1, this.growth + SEED_GROW * dt);
    if (this.growth >= 1 && d < SEED_BLOOM_R && w.alive) {
      this.bloomAt -= dt;
      if (this.bloomAt <= 0) { this.bloomAt = SEED_BLOOM_EVERY; this.knot(w, 2, 12); }
    }
  }

  /** Shot at: a knot of motes, more the bigger it is, no more than one answer in a while. */
  private answer(w: World): void {
    if (w.runTime < this.answerAt) return;
    this.answerAt = w.runTime + SEED_ANSWER_EVERY;
    this.knot(w, SEED_ANSWER + Math.round(this.growth * SEED_ANSWER_GROW), 10);
  }

  private knot(w: World, n: number, r: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const al = w.spawnHostile('mote', { x: this.x + Math.cos(a) * r, y: 0, z: this.z + Math.sin(a) * r });
      al.extra = true;
      this.sent.add(al.id);
    }
  }
}

/** Where a Thren sky's seed grows: off the course, past the middle. */
export function seedBerth(x0: number, z0: number, heading: number, lane: number, side: number): { x: number; z: number } {
  const fx = Math.cos(heading), fz = -Math.sin(heading), rx = Math.sin(heading), rz = Math.cos(heading);
  return { x: x0 + fx * lane * 0.5 + rx * side * 120, z: z0 + fz * lane * 0.5 + rz * side * 120 };
}

export const seedLine = () => t('“Growth stilled. It answers to nothing here. Logged.”');
