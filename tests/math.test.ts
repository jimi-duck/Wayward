import { describe, expect, it } from 'vitest';
import { angleDelta, TAU } from '../src/core/math';

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
