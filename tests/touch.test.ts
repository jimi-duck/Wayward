import { describe, expect, it } from 'vitest';
import { driveStick, FLICK, flickedDown, STICK_DEAD } from '../src/input/touch';

describe('the touch stick', () => {
  it('does nothing inside the dead zone', () => {
    expect(driveStick(STICK_DEAD * 0.9, 0)).toEqual({ turn: 0, thrust: 0 });
  });

  it('steers across and opens the throttle with any push', () => {
    const right = driveStick(1, 0);
    expect(right.turn).toBe(1);
    expect(right.thrust).toBe(1);
    const left = driveStick(-1, 0);
    expect(left.turn).toBe(-1);
    const ahead = driveStick(0, 1);
    expect(ahead.turn).toBe(0);
    expect(ahead.thrust).toBe(1);
  });

  it('trims gently near the centre and comes round hard at the rim', () => {
    const small = driveStick(0.3, 0).turn;
    const half = driveStick(0.5, 0).turn;
    expect(small).toBeGreaterThan(0);
    expect(small).toBeLessThan(0.3);
    expect(half).toBeGreaterThan(small);
    expect(driveStick(0.8, 0).turn).toBeCloseTo(1, 1);
  });

  it('coasts when pulled back, still steering', () => {
    const back = driveStick(0.5, -0.8);
    expect(back.thrust).toBe(0);
    expect(back.turn).toBeGreaterThan(0);
  });

  it('is never more than full helm or full throttle', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const d = driveStick(Math.cos(a) * 1.5, Math.sin(a) * 1.5);
      expect(Math.abs(d.turn)).toBeLessThanOrEqual(1);
      expect(d.thrust).toBeGreaterThanOrEqual(0);
      expect(d.thrust).toBeLessThanOrEqual(1);
    }
  });
});

describe('the second finger', () => {
  it('breaks on a clear downward flick, not on a tap or a sideways drag', () => {
    expect(flickedDown(2, FLICK + 4)).toBe(true);
    expect(flickedDown(0, 8)).toBe(false);
    expect(flickedDown(60, FLICK + 4)).toBe(false);
    expect(flickedDown(0, -60)).toBe(false);
  });
});
