import { describe, expect, it } from 'vitest';
import { SlowMo } from '../src/core/slowmo';

describe('SlowMo', () => {
  it('eases down, holds, and returns to real time', () => {
    const s = new SlowMo();
    expect(s.request(0.3, 0.3)).toBe(true);
    let low = 1;
    for (let i = 0; i < 120; i++) low = Math.min(low, s.step(1 / 60));
    expect(low).toBeCloseTo(0.3, 5);
    expect(s.scale).toBe(1);
  });
  it('waits out a cooldown before the next', () => {
    const s = new SlowMo();
    s.request(0.3, 0.2);
    for (let i = 0; i < 60; i++) s.step(1 / 60);
    expect(s.request(0.3, 0.2)).toBe(false);
    for (let i = 0; i < 300; i++) s.step(1 / 60);
    expect(s.request(0.3, 0.2)).toBe(true);
  });
  it('never goes below the floor and clears at once', () => {
    const s = new SlowMo();
    s.request(0, 0.5);
    for (let i = 0; i < 20; i++) s.step(1 / 60);
    expect(s.scale).toBeGreaterThanOrEqual(0.25);
    s.clear();
    expect(s.scale).toBe(1);
  });
});
