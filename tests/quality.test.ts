import { describe, expect, it } from 'vitest';
import { QualityGovernor, tierIndex } from '../src/render/quality';

const HIGH = tierIndex('high');

function feed(q: QualityGovernor, dt: number | (() => number), n: number): number {
  let drops = 0;
  for (let i = 0; i < n; i++) if (q.sample(typeof dt === 'number' ? dt : dt())) drops++;
  return drops;
}

describe('QualityGovernor', () => {
  it('holds the tier at a healthy 60fps', () => {
    const q = new QualityGovernor(HIGH);
    expect(feed(q, 1 / 60, 2000)).toBe(0);
    expect(q.tier.name).toBe('high');
  });

  it('drops one tier at a time under sustained load, then stops at low', () => {
    const q = new QualityGovernor(HIGH);
    feed(q, 1 / 40, 179);
    expect(q.tier.name).toBe('high'); // no verdict before three seconds
    feed(q, 1 / 40, 1);
    expect(q.tier.name).toBe('medium');
    feed(q, 1 / 40, 400);
    expect(q.tier.name).toBe('low');
    expect(feed(q, 1 / 40, 400)).toBe(0);
  });

  it('never steps back up when the load goes away', () => {
    const q = new QualityGovernor(HIGH);
    feed(q, 1 / 40, 200);
    feed(q, 1 / 120, 2000);
    expect(q.tier.name).toBe('medium');
  });

  it('treats a steady 30fps as a display cap, not as overload', () => {
    const q = new QualityGovernor(HIGH);
    feed(q, 1 / 30, 1000);
    expect(q.tier.name).toBe('high');
  });

  it('still drops on a jittery 30fps', () => {
    const q = new QualityGovernor(HIGH);
    let flip = false;
    feed(q, () => ((flip = !flip) ? 0.022 : 0.045), 400);
    expect(q.tier.name).not.toBe('high');
  });

  it('ignores stalls and nonsense intervals', () => {
    const q = new QualityGovernor(HIGH);
    feed(q, 0.5, 1000);
    feed(q, 0, 1000);
    feed(q, Number.NaN, 1000);
    expect(q.tier.name).toBe('high');
  });

  it('still measures a phone that only manages 15fps', () => {
    const q = new QualityGovernor(HIGH);
    feed(q, 1 / 15, 400);
    expect(q.tier.name).not.toBe('high');
  });

  it('never moves a pinned tier', () => {
    const q = new QualityGovernor(HIGH, true);
    feed(q, 1 / 25, 2000);
    expect(q.tier.name).toBe('high');
    expect(q.average).toBeCloseTo(1 / 25);
  });
});
