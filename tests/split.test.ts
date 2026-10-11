import { rockPose } from '../src/render/rockmotion';
import { describe, expect, it } from 'vitest';
import { Field } from '../src/sim/field';
import { Rng } from '../src/sim/rng';

// What a breaking rock leaves behind: the sim's rules (counts, kinds, sizes), plus that the
// pieces start clear of one another, inherit the parent's drift and differ from each other.

describe('rock splitting', () => {
  it('follows the progression: large to medium to small to nothing, iron in three', () => {
    const f = new Field(new Rng(5));
    const big = f.spawn(0, 0, 0, 2, 1, 'basalt');
    const mid = f.split(big);
    expect(mid.map((r) => [r.size, r.kind])).toEqual([[1, 'basalt'], [1, 'basalt']]);
    const small = f.split(mid[0]!);
    expect(small.every((r) => r.size === 2)).toBe(true);
    expect(f.split(small[0]!)).toEqual([]);
    expect(f.split(f.spawn(0, 40, 0, 0, 0, 'iron'))).toHaveLength(3);
    expect(f.split(f.spawn(0, 80, 0, 0, 0, 'volatile'))).toEqual([]);
    expect(f.split(f.spawn(0, 120, 0, 0, 0, 'rich')).every((r) => r.kind === 'basalt')).toBe(true);
  });

  it('starts the pieces clear of one another, moving apart, with some of the parent drift', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const f = new Field(new Rng(seed));
      const parent = f.spawn(seed % 2 ? 0 : 1, 10, -4, 3, 2, seed % 5 ? 'basalt' : 'iron');
      const kids = f.split(parent);
      for (let i = 0; i < kids.length; i++) {
        for (let j = i + 1; j < kids.length; j++) {
          const a = kids[i]!, b = kids[j]!;
          expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual((a.r + b.r) * 0.98);
        }
      }
      const mean = kids.reduce((s, k) => s + k.vx, 0) / kids.length;
      expect(Math.abs(mean - parent.vx * 0.8)).toBeLessThan(5);
      const speeds = kids.map((k) => Math.hypot(k.vx - parent.vx * 0.8, k.vz - parent.vz * 0.8));
      expect(Math.max(...speeds) - Math.min(...speeds)).toBeGreaterThan(0);
    }
  });

  it('never makes a piece bigger than the rock it came from, and starts it at the parent\'s place', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const f = new Field(new Rng(seed));
      const parent = f.spawn(seed % 2 ? 0 : 1, 10, -4, 3, 2, seed % 5 ? 'basalt' : 'iron');
      for (const k of f.split(parent)) {
        expect(k.r).toBeLessThanOrEqual(parent.r * 0.7 + 1e-9);
        // drawn a little back toward the parent's place, never past it
        const d = Math.hypot(k.x - parent.x, k.z - parent.z), start = Math.hypot(k.x + k.ox - parent.x, k.z + k.oz - parent.z);
        expect(start).toBeCloseTo(d * 0.75, 6);
        // and from the first frame at its own size, below the parent's
        expect(rockPose(0, true).scale * k.r).toBeLessThan(parent.r);
      }
    }
  });

  it('a blow changes drift and spin for good, and a big rock moves less than a small one', () => {
    const f = new Field(new Rng(3));
    const big = f.spawn(0, 0, 0, 0, 0, 'basalt'), small = f.spawn(2, 40, 0, 0, 0, 'basalt');
    for (const r of [big, small]) { r.vx = 0; r.vz = 0; r.spin = 0; }
    f.impulse(big, 1, 0, 1.3, 0, 1.5);
    f.impulse(small, 1, 0, 1.3, 0, 0.5);
    expect(small.vx).toBeGreaterThan(big.vx * 5);
    expect(big.vx).toBeGreaterThan(0);
    expect(big.spin).not.toBe(0);
    let x = big.x;
    for (let i = 0; i < 120; i++) { f.step(1 / 60, 0, 0); expect(big.x).toBeGreaterThanOrEqual(x); x = big.x; }
    expect(big.vx).toBeGreaterThan(0);
  });

  it('draws a piece of a break at full size from the first frame, and never larger later', () => {
    for (let age = 0; age <= 1; age += 0.02) expect(rockPose(age, true).scale).toBe(1);
    expect(rockPose(0, false).scale).toBe(0);
    expect(rockPose(0.5, false).scale).toBe(1);
    let slide = rockPose(0, true).slide;
    for (let age = 0.02; age <= 0.4; age += 0.02) { const s = rockPose(age, true).slide; expect(s).toBeLessThanOrEqual(slide); slide = s; }
    expect(rockPose(0.3, true).slide).toBe(0);
  });
});
