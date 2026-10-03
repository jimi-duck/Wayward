import { describe, expect, it } from 'vitest';
import { HULLS, type Hull } from '../src/content/hulls';
import { STEP } from '../src/core/loop';
import { flightControls, type FlightControls } from '../src/sim/controls';
import { newShip, stepShip, topSpeed, turnPerStep, type ShipState } from '../src/sim/ship';
import { PX, ROLL_COOLDOWN } from '../src/sim/tuning';
import type { InputFrame } from '../src/input/types';

const idle: FlightControls = { turn: 0, thrust: 0, heading: null, roll: false, rollDir: 0 };
const ctl = (c: Partial<FlightControls>): FlightControls => ({ ...idle, ...c });
const input = (f: Partial<InputFrame>): InputFrame =>
  ({ turn: 0, thrust: 0, aim: null, roll: false, overcharge: false, device: 'keyboard', ...f });

function fly(s: ShipState, hull: Hull, c: FlightControls, seconds: number): ShipState {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepShip(s, c, hull, STEP);
  return s;
}
const speed = (s: ShipState) => Math.hypot(s.vx, s.vz);
const pxPerSecond = (unitsPerSecond: number) => unitsPerSecond / PX;

describe('flight model, ported from the original', () => {
  it('reaches the original top speeds: about 450, 316 and 384 px/s', () => {
    const want = { escort: 450, cruiser: 316, scout: 384 };
    for (const hull of Object.values(HULLS)) {
      const s = fly(newShip(), hull, ctl({ thrust: 1 }), 10);
      expect(pxPerSecond(speed(s))).toBeCloseTo(want[hull.id], -1);
      expect(speed(s)).toBeCloseTo(topSpeed(hull), 3);
    }
  });

  it('flies straight up the screen from rest', () => {
    const s = fly(newShip(), HULLS.escort, ctl({ thrust: 1 }), 1);
    expect(s.z).toBeLessThan(-10);
    expect(Math.abs(s.x)).toBeLessThan(1e-6);
  });

  it('coasts to a stop on its own drag', () => {
    const s = fly(newShip(), HULLS.scout, ctl({ thrust: 1 }), 3);
    fly(s, HULLS.scout, idle, 4);
    expect(speed(s)).toBeLessThan(0.01);
  });

  it('turns at the original rate once the helm has eased in', () => {
    for (const hull of Object.values(HULLS)) {
      const s = fly(newShip(), hull, ctl({ turn: 1 }), 1);
      expect(s.yawRate).toBeCloseTo(-turnPerStep(hull) / STEP, 4);
    }
    // the Nova turns tightest, the Sovereign slowest
    expect(turnPerStep(HULLS.scout)).toBeGreaterThan(turnPerStep(HULLS.escort));
    expect(turnPerStep(HULLS.escort)).toBeGreaterThan(turnPerStep(HULLS.cruiser));
  });

  it('eases the helm in, so a one-step tap only nudges the nose', () => {
    const s = newShip();
    stepShip(s, ctl({ turn: 1 }), HULLS.escort, STEP);
    const tapped = Math.PI / 2 - s.heading;
    expect(tapped).toBeGreaterThan(0);
    expect(tapped).toBeLessThan(turnPerStep(HULLS.escort) * 0.3);
  });

  it('turns right with a right key: the heading falls', () => {
    const s = fly(newShip(), HULLS.escort, ctl({ turn: 1 }), 0.25);
    expect(s.heading).toBeLessThan(Math.PI / 2);
  });

  it('carves turns on the Defiant: grip cuts the sideways slide under thrust', () => {
    const slide = (grip: number) => {
      const hull = { ...HULLS.escort, grip };
      const s = fly(newShip(), hull, ctl({ thrust: 1 }), 4);
      fly(s, hull, ctl({ thrust: 1, turn: 1 }), 0.4); // a hard turn at top speed
      const hx = Math.cos(s.heading), hz = -Math.sin(s.heading);
      return Math.abs(s.vz * hx - s.vx * hz);
    };
    expect(slide(0.05)).toBeLessThan(slide(0) * 0.8);
  });
});

describe('the barrel roll', () => {
  it('kicks the ship sideways in the direction asked', () => {
    const right = fly(newShip(), HULLS.escort, ctl({}), 0);
    stepShip(right, ctl({ roll: true, rollDir: 1 }), HULLS.escort, STEP);
    fly(right, HULLS.escort, idle, 1);
    expect(right.x).toBeGreaterThan(3); // facing up the screen, right is +X

    const left = newShip();
    stepShip(left, ctl({ roll: true, rollDir: -1 }), HULLS.escort, STEP);
    fly(left, HULLS.escort, idle, 1);
    expect(left.x).toBeLessThan(-3);
  });

  it('grants a short invulnerability window', () => {
    const s = newShip();
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULLS.escort, STEP);
    expect(s.invuln).toBeGreaterThan(0.3);
  });

  it('cannot be chained faster than the cooldown', () => {
    const s = newShip();
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULLS.escort, STEP);
    const vx = s.vx;
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULLS.escort, STEP);
    expect(s.vx).toBeLessThan(vx); // only drag acted, no second kick
    fly(s, HULLS.escort, idle, ROLL_COOLDOWN);
    const before = s.vx;
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULLS.escort, STEP);
    expect(s.vx).toBeGreaterThan(before + 5);
  });

  it('alternates direction when nothing says which way', () => {
    const s = newShip();
    stepShip(s, ctl({ roll: true }), HULLS.escort, STEP);
    const first = s.rollDir;
    fly(s, HULLS.escort, idle, ROLL_COOLDOWN + STEP);
    stepShip(s, ctl({ roll: true }), HULLS.escort, STEP);
    expect(s.rollDir).toBe(-first);
  });
});

describe('controls', () => {
  const up = Math.PI / 2;

  it('reads a tactical stick as a heading, and throttles with the push', () => {
    const c = flightControls(input({ aim: { angle: 0, mag: 1 } }), 'tactical', up);
    expect(c.heading).toBe(0);
    expect(c.thrust).toBe(1);
    expect(c.rollDir).toBe(1); // the target is to the right
  });

  it('reads a chase stick like a car: across steers, forward throttles', () => {
    const right = flightControls(input({ aim: { angle: 0, mag: 1 } }), 'chase', up);
    expect(right.heading).toBeNull();
    expect(right.turn).toBe(1);
    expect(right.thrust).toBe(0);
    const ahead = flightControls(input({ aim: { angle: up, mag: 1 } }), 'chase', up);
    expect(ahead.thrust).toBe(1);
    expect(Math.abs(ahead.turn)).toBeLessThan(1e-9);
  });

  it('ignores a stick resting inside the dead zone', () => {
    const c = flightControls(input({ aim: { angle: 0, mag: 0.1 } }), 'tactical', up);
    expect(c.heading).toBeNull();
    expect(c.thrust).toBe(0);
  });

  it('passes keys through unchanged in both camera styles', () => {
    for (const mode of ['tactical', 'chase'] as const) {
      const c = flightControls(input({ turn: -1, thrust: 1 }), mode, up);
      expect(c.turn).toBe(-1);
      expect(c.thrust).toBe(1);
      expect(c.rollDir).toBe(-1);
    }
  });
});
