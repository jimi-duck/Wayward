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
        expect(k.x + k.ox).toBeCloseTo(parent.x, 6);
        expect(k.z + k.oz).toBeCloseTo(parent.z, 6);
      }
    }
  });
});
