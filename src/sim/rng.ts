/**
 * A small seeded generator (mulberry32). The simulation draws every random
 * number from one of these, so a run with the same seed and the same inputs
 * plays out the same, which is what the scripted pilot needs.
 */
export class Rng {
  private s: number;

  constructor(seed = 47) {
    this.s = seed >>> 0;
  }

  /** 0 (inclusive) to 1 (exclusive). */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}
