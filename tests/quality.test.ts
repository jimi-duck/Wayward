import { describe, expect, it } from 'vitest';
import { QualityGovernor, tierIndex } from '../src/render/quality';

const HIGH = tierIndex('high');
const MEDIUM = tierIndex('medium');
const PHONE = tierIndex('phone');

function feed(q: QualityGovernor, dt: number | (() => number), n: number): number {
  let moves = 0;
  for (let i = 0; i < n; i++) if (q.sample(typeof dt === 'number' ? dt : dt())) moves++;
  return moves;
}

/** Feed `dt` for about `s` seconds of frames. */
const secs = (q: QualityGovernor, dt: number, s: number) => feed(q, dt, Math.round(s / dt));

/**
 * A laptop GPU that is all fill: a frame costs `fixed` plus `fill` seconds for every million pixels drawn, on a window
 * of 1440 x 661 CSS pixels at a pixel ratio of 2 (the readout that started pass 18: High at 2878 x 1322, 19fps).
 */
function laptop(q: QualityGovernor, fixed: number, fill: number): number {
  const dpr = Math.min(2, q.tier.dprCap) * q.scale;
  return fixed + fill * (1440 * 661 * dpr * dpr) / 1e6;
}

describe('QualityGovernor', () => {
  it('holds the tier at a healthy 60fps', () => {
    const q = new QualityGovernor(HIGH);
    expect(feed(q, 1 / 60, 2000)).toBe(0);
    expect(q.tier.name).toBe('high');
  });

  it('drops one tier at a time under sustained load, then stops at low', () => {
    const q = new QualityGovernor(HIGH);
    secs(q, 1 / 40, 2.9);
    expect(q.tier.name).toBe('high'); // no verdict before three seconds
    secs(q, 1 / 40, 0.2);
    expect(q.tier.name).toBe('medium');
    secs(q, 1 / 40, 3.6);
    expect(q.tier.name).toBe('phone');
    secs(q, 1 / 40, 8);
    expect(q.tier.name).toBe('low');
    expect(secs(q, 1 / 40, 10)).toBe(0);
  });

  it('gives its verdict in three seconds however slow the frames, not after a count of them', () => {
    const q = new QualityGovernor(HIGH);
    secs(q, 1 / 19, 3.2);
    expect(q.tier.name).toBe('medium');
  });

  it('never steps back up above a tier that proved too slow', () => {
    const q = new QualityGovernor(HIGH);
    secs(q, 1 / 40, 3.2);
    secs(q, 1 / 60, 70);
    expect(q.tier.name).toBe('medium');
    expect(q.wantsUp).toBe(false);
    expect(q.stepUp()).toBe(false);
    expect(q.ceiling).toBe(MEDIUM);
  });

  it('asks for the tier above after half a minute with room, and moves only when told', () => {
    const q = new QualityGovernor(PHONE);
    feed(q, 1 / 60, 2200);
    expect(q.tier.name).toBe('phone');
    expect(q.wantsUp).toBe(true);
    expect(q.stepUp()).toBe(true);
    expect(q.tier.name).toBe('medium');
    expect(q.wantsUp).toBe(false); // a new half minute on the new tier
    feed(q, 1 / 60, 2200);
    expect(q.stepUp()).toBe(true);
    expect(q.tier.name).toBe('high');
    expect(q.wantsUp).toBe(false); // nothing above
  });

  it('a tier tried and found slow becomes the ceiling', () => {
    const q = new QualityGovernor(PHONE);
    feed(q, 1 / 60, 2200);
    q.stepUp();
    secs(q, 1 / 40, 4);
    expect(q.tier.name).toBe('phone');
    secs(q, 1 / 60, 70);
    expect(q.wantsUp).toBe(false);
  });

  it('no room at a 30fps cap or with jitter, so no climb', () => {
    const capped = new QualityGovernor(PHONE);
    feed(capped, 1 / 30, 4000);
    expect(capped.wantsUp).toBe(false);
    const jumpy = new QualityGovernor(PHONE);
    let flip = false;
    feed(jumpy, () => ((flip = !flip) ? 0.012 : 0.02), 4000);
    expect(jumpy.wantsUp).toBe(false);
  });

  it('a pinned tier never climbs', () => {
    const q = new QualityGovernor(PHONE, true);
    feed(q, 1 / 60, 4000);
    expect(q.wantsUp).toBe(false);
    expect(q.pinned).toBe(true);
  });

  it('starts no higher than a kept ceiling', () => {
    const q = new QualityGovernor(HIGH, false, PHONE);
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

  it('ignores a stall among good frames, and nonsense intervals', () => {
    const q = new QualityGovernor(HIGH);
    for (let i = 0; i < 100; i++) { feed(q, 0.5, 1); feed(q, 1 / 60, 30); }
    feed(q, 0, 1000);
    feed(q, Number.NaN, 1000);
    expect(q.tier.name).toBe('high');
  });

  it('a long run of very slow frames is a slow machine, not a stall', () => {
    const q = new QualityGovernor(HIGH);
    feed(q, 0.15, 60);
    expect(q.tier.name).toBe('medium');
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
    q.pin(PHONE);
    q.pin(null);
    expect(q.pinned).toBe(false);
    expect(q.tier.name).toBe('phone');
    secs(q, 1 / 40, 3.2);
    expect(q.tier.name).toBe('low');
  });
});

describe('QualityGovernor on a high-density laptop screen', () => {
  const retina = () => 2;

  it('draws smaller, keeping the tier, before it gives up the look', () => {
    const q = new QualityGovernor(HIGH, false, undefined, false, retina);
    secs(q, 1 / 40, 3.2);
    expect(q.tier.name).toBe('high');
    expect(q.scale).toBeLessThan(1);
  });

  it('goes straight to the size that fits when far behind, instead of a step at a time', () => {
    const q = new QualityGovernor(HIGH, false, undefined, false, retina);
    // 19fps at full size, nearly all of it fill: needs about a third of the pixels
    secs(q, 1 / 19, 3.2);
    expect(q.tier.name).toBe('high');
    expect(q.scale).toBeLessThanOrEqual(0.67);
  });

  it('never draws below one pixel per CSS pixel: past that it gives up a tier, at the same size', () => {
    const q = new QualityGovernor(HIGH, false, undefined, false, retina);
    for (let i = 0; i < 8 && q.tier.name === 'high'; i++) secs(q, 1 / 30 + 0.004, 4);
    expect(q.tier.name).toBe('medium');
    // Medium draws at most 1.5; it keeps about the one pixel per CSS pixel High had reached, not 1.5
    expect(1.5 * q.scale).toBeLessThan(1.1);
    expect(1.5 * q.scale).toBeGreaterThanOrEqual(0.99);
  });

  it('a screen of one pixel per CSS pixel has no smaller size to give: it drops a tier as before', () => {
    const q = new QualityGovernor(HIGH, false, undefined, false, () => 1);
    secs(q, 1 / 40, 3.2);
    expect(q.tier.name).toBe('medium');
    expect(q.scale).toBe(1);
  });

  it('settles a fill-bound laptop at 60fps on High within seconds, and keeps it', () => {
    const q = new QualityGovernor(HIGH, false, undefined, false, retina);
    // 6 ms of fixed work, the rest fill: 52 ms a frame at full size, the readout that started this
    const fill = (0.052 - 0.006) / (1440 * 661 * 4 / 1e6);
    let t = 0;
    while (t < 12) { const dt = laptop(q, 0.006, fill); q.sample(dt); t += dt; }
    expect(q.tier.name).toBe('high');
    expect(laptop(q, 0.006, fill)).toBeLessThan(0.021);
    // and holds there: no more moves in a minute
    let moves = 0;
    t = 0;
    while (t < 60) { const dt = laptop(q, 0.006, fill); if (q.sample(dt)) moves++; t += dt; }
    expect(moves).toBe(0);
  });

  it('climbs back a size at a quiet moment when there is room, and never retries a size that proved slow', () => {
    const q = new QualityGovernor(HIGH, false, undefined, false, retina);
    secs(q, 1 / 40, 3.2);
    const small = q.scale;
    secs(q, 1 / 60, 35);
    expect(q.wantsUp).toBe(true);
    expect(q.stepUp()).toBe(true);
    const big = q.scale;
    expect(big).toBeGreaterThan(small);
    // too slow at the bigger size: back down, and that size is off the table on this tier
    secs(q, 1 / 40, 4);
    expect(q.scale).toBeLessThanOrEqual(small);
    for (let i = 0; i < 4; i++) { secs(q, 1 / 60, 35); q.stepUp(); }
    expect(q.scale).toBeLessThan(big);
    expect(q.wantsUp).toBe(false);
  });
});

describe('QualityGovernor on a phone (breathe)', () => {
  it('draws smaller three times (back to about one pixel per CSS pixel) before it gives up a tier', () => {
    const q = new QualityGovernor(PHONE, false, undefined, true);
    secs(q, 1 / 40, 3.2);
    expect(q.tier.name).toBe('phone');
    expect(q.scale).toBe(0.85);
    secs(q, 1 / 40, 3.6);
    expect(q.scale).toBe(0.75);
    secs(q, 1 / 40, 3.6);
    expect(q.scale).toBe(0.67);
    secs(q, 1 / 40, 3.6);
    expect(q.tier.name).toBe('low');
    expect(q.scale).toBe(1);
  });

  it('holds an even 30 once nothing is left to give, and stops judging', () => {
    const q = new QualityGovernor(0, false, undefined, true);
    secs(q, 1 / 40, 3.6 * 4);
    expect(q.thirty).toBe(true);
    expect(feed(q, 1 / 40, 600)).toBe(0);
  });

  it('gives the drawing size back first when there is room', () => {
    const q = new QualityGovernor(PHONE, false, PHONE, true);
    secs(q, 1 / 40, 3.2);
    expect(q.scale).toBe(0.85);
    secs(q, 1 / 60, 35);
    expect(q.wantsUp).toBe(true);
    expect(q.stepUp()).toBe(true);
    expect(q.scale).toBe(1);
    expect(q.tier.name).toBe('phone');
  });
});
