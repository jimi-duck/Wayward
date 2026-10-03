import { describe, expect, it } from 'vitest';
import { angleDelta, smoothDamp, smoothDampAngle, TAU } from '../src/core/math';

describe('angleDelta', () => {
  it('takes the short way round', () => {
    expect(angleDelta(0, 0.5)).toBeCloseTo(0.5);
    expect(angleDelta(0.5, 0)).toBeCloseTo(-0.5);
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(angleDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2);
  });

  it('works for headings that have wound up many turns', () => {
    expect(angleDelta(10 * TAU + 0.3, 0.1)).toBeCloseTo(-0.2);
    expect(angleDelta(-7 * TAU, 0.25)).toBeCloseTo(0.25);
  });
});

describe('smoothDamp', () => {
  it('settles on the target without overshooting, at any frame rate', () => {
    for (const hz of [30, 60, 144]) {
      const s = { v: 0 };
      let x = 0, peak = 0;
      for (let i = 0; i < hz * 2; i++) { x = smoothDamp(x, 10, s, 0.25, 1 / hz); peak = Math.max(peak, x); }
      expect(x).toBeCloseTo(10, 2);
      expect(peak).toBeLessThanOrEqual(10 + 1e-6);
    }
  });

  it('takes angles the short way round', () => {
    const s = { v: 0 };
    let a = Math.PI - 0.1;
    for (let i = 0; i < 120; i++) a = smoothDampAngle(a, -Math.PI + 0.1, s, 0.2, 1 / 60);
    expect(angleDelta(a, -Math.PI + 0.1)).toBeCloseTo(0, 3);
    expect(a).toBeGreaterThan(3); // went forward through PI, not back through zero
  });
});
