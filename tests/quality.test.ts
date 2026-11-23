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
    feed(q, 1 / 40, 180);
    expect(q.tier.name).toBe('phone');
    feed(q, 1 / 40, 400);
    expect(q.tier.name).toBe('low');
    expect(feed(q, 1 / 40, 400)).toBe(0);
  });

  it('never steps back up above a tier that proved too slow', () => {
    const q = new QualityGovernor(HIGH);
    feed(q, 1 / 40, 200);
    feed(q, 1 / 60, 4000);
    expect(q.tier.name).toBe('medium');
    expect(q.wantsUp).toBe(false);
    expect(q.stepUp()).toBe(false);
    expect(q.ceiling).toBe(tierIndex('medium'));
  });

  it('asks for the tier above after half a minute with room, and moves only when told', () => {
    const q = new QualityGovernor(tierIndex('phone'));
    feed(q, 1 / 60, 2000);
    expect(q.tier.name).toBe('phone');
    expect(q.wantsUp).toBe(true);
    expect(q.stepUp()).toBe(true);
    expect(q.tier.name).toBe('medium');
    expect(q.wantsUp).toBe(false); // a new half minute on the new tier
    feed(q, 1 / 60, 2000);
    expect(q.stepUp()).toBe(true);
    expect(q.tier.name).toBe('high');
    expect(q.wantsUp).toBe(false); // nothing above
  });

  it('a tier tried and found slow becomes the ceiling', () => {
    const q = new QualityGovernor(tierIndex('phone'));
    feed(q, 1 / 60, 2000);
    q.stepUp();
    feed(q, 1 / 40, 200);
    expect(q.tier.name).toBe('phone');
    feed(q, 1 / 60, 4000);
    expect(q.wantsUp).toBe(false);
  });

  it('no room at a 30fps cap or with jitter, so no climb', () => {
    const capped = new QualityGovernor(tierIndex('phone'));
    feed(capped, 1 / 30, 4000);
    expect(capped.wantsUp).toBe(false);
    const jumpy = new QualityGovernor(tierIndex('phone'));
    let flip = false;
    feed(jumpy, () => ((flip = !flip) ? 0.012 : 0.02), 4000);
    expect(jumpy.wantsUp).toBe(false);
  });

  it('a pinned tier never climbs', () => {
    const q = new QualityGovernor(tierIndex('phone'), true);
    feed(q, 1 / 60, 4000);
    expect(q.wantsUp).toBe(false);
  });

  it('starts no higher than a kept ceiling', () => {
    const q = new QualityGovernor(HIGH, false, tierIndex('phone'));
    expect(q.tier.name).toBe('phone');
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

  it('pin(0) puts it on low and keeps it there whatever the load; pin(null) lets it judge again', () => {
    const q = new QualityGovernor(HIGH);
    q.pin(0);
    expect(q.tier.name).toBe('low');
    expect(feed(q, 1 / 20, 600)).toBe(0);
    q.pin(tierIndex('phone'));
    q.pin(null);
    expect(q.tier.name).toBe('phone');
    feed(q, 1 / 40, 180);
    expect(q.tier.name).toBe('low');
  });
});

describe('QualityGovernor on a phone (breathe)', () => {
  const PHONE = tierIndex('phone');

  it('draws smaller twice before it gives up a tier', () => {
    const q = new QualityGovernor(PHONE, false, undefined, true);
    feed(q, 1 / 40, 180);
    expect(q.tier.name).toBe('phone');
    expect(q.scale).toBe(0.85);
    feed(q, 1 / 40, 180);
    expect(q.scale).toBe(0.75);
    feed(q, 1 / 40, 180);
    expect(q.tier.name).toBe('low');
    expect(q.scale).toBe(1);
  });

  it('holds an even 30 once nothing is left to give, and stops judging', () => {
    const q = new QualityGovernor(0, false, undefined, true);
    feed(q, 1 / 40, 180 * 3);
    expect(q.thirty).toBe(true);
    expect(feed(q, 1 / 40, 600)).toBe(0);
  });

  it('gives the drawing size back first when there is room', () => {
    const q = new QualityGovernor(PHONE, false, PHONE, true);
    feed(q, 1 / 40, 180);
    expect(q.scale).toBe(0.85);
    feed(q, 1 / 60, 2100);
    expect(q.wantsUp).toBe(true);
    expect(q.stepUp()).toBe(true);
    expect(q.scale).toBe(1);
    expect(q.tier.name).toBe('phone');
  });

  it('a computer never breathes: it drops a tier as before', () => {
    const q = new QualityGovernor(PHONE);
    feed(q, 1 / 40, 180);
    expect(q.tier.name).toBe('low');
    expect(q.scale).toBe(1);
  });
});
