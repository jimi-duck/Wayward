import { describe, expect, it } from 'vitest';
import { HULL, type Hull } from '../src/content/hulls';
import { STEP } from '../src/core/loop';
import { flightControls, type FlightControls } from '../src/sim/controls';
import { newShip, stepShip, topSpeed, turnPerStep, type ShipState } from '../src/sim/ship';
import { computeStats } from '../src/sim/build';
import { flightHull } from '../src/sim/stats';
import { PX, ROLL_COOLDOWN, ROLL_IFRAMES } from '../src/sim/tuning';
import type { InputFrame } from '../src/input/types';

const idle: FlightControls = { turn: 0, thrust: 0, roll: false, rollDir: 0, fire: false, torpedo: false, cut: false };
const ctl = (c: Partial<FlightControls>): FlightControls => ({ ...idle, ...c });
const input = (f: Partial<InputFrame>): InputFrame =>
  ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard', ...f });

function fly(s: ShipState, hull: Hull, c: FlightControls, seconds: number): ShipState {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepShip(s, c, hull, STEP);
  return s;
}
const speed = (s: ShipState) => Math.hypot(s.vx, s.vz);
const pxPerSecond = (unitsPerSecond: number) => unitsPerSecond / PX;

describe('flight model, ported from the original', () => {
  it('reaches the original top speed: about 450 px/s', () => {
    const s = fly(newShip(), HULL, ctl({ thrust: 1 }), 10);
    expect(pxPerSecond(speed(s))).toBeCloseTo(450, -1);
    expect(speed(s)).toBeCloseTo(topSpeed(HULL), 3);
  });

  it('flies straight up the screen from rest', () => {
    const s = fly(newShip(), HULL, ctl({ thrust: 1 }), 1);
    expect(s.z).toBeLessThan(-10);
    expect(Math.abs(s.x)).toBeLessThan(1e-6);
  });

  it('coasts to a stop on its own drag', () => {
    const s = fly(newShip(), HULL, ctl({ thrust: 1 }), 3);
    fly(s, HULL, idle, 6);
    expect(speed(s)).toBeLessThan(0.01);
  });

  it('turns at the original rate once the helm has eased in', () => {
    const s = fly(newShip(), HULL, ctl({ turn: 1 }), 1);
    expect(s.yawRate).toBeCloseTo(-turnPerStep(HULL) / STEP, 4);
  });

  it('eases the helm in, so a one-step tap only nudges the nose', () => {
    const s = newShip();
    stepShip(s, ctl({ turn: 1 }), HULL, STEP);
    const tapped = Math.PI / 2 - s.heading;
    expect(tapped).toBeGreaterThan(0);
    expect(tapped).toBeLessThan(turnPerStep(HULL) * 0.3);
  });

  it('turns right with a right key: the heading falls', () => {
    const s = fly(newShip(), HULL, ctl({ turn: 1 }), 0.25);
    expect(s.heading).toBeLessThan(Math.PI / 2);
  });

  it('carves turns on the Wayward: grip cuts the sideways slide under thrust', () => {
    const slide = (grip: number) => {
      const hull = { ...HULL, grip };
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
    const right = fly(newShip(), HULL, ctl({}), 0);
    stepShip(right, ctl({ roll: true, rollDir: 1 }), HULL, STEP);
    fly(right, HULL, idle, 1);
    expect(right.x).toBeGreaterThan(3); // facing up the screen, right is +X

    const left = newShip();
    stepShip(left, ctl({ roll: true, rollDir: -1 }), HULL, STEP);
    fly(left, HULL, idle, 1);
    expect(left.x).toBeLessThan(-3);
  });

  it('grants a short invulnerability window', () => {
    const s = newShip();
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULL, STEP);
    expect(s.invuln).toBeGreaterThan(0.3);
  });

  it('cannot be chained faster than the cooldown', () => {
    const s = newShip();
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULL, STEP);
    const vx = s.vx;
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULL, STEP);
    expect(s.vx).toBeLessThan(vx); // only drag acted, no second kick
    fly(s, HULL, idle, ROLL_COOLDOWN);
    const before = s.vx;
    stepShip(s, ctl({ roll: true, rollDir: 1 }), HULL, STEP);
    expect(s.vx).toBeGreaterThan(before + 5);
  });

  it('always leaves a gap, even rolled on the cooldown with every jet and the evasive pattern', () => {
    const hull = flightHull(computeStats({ mo_jets: 3, mo_evasion: 1, pl_wake: 1, tech_office: 1 }));
    expect(hull.rollIframes).toBeGreaterThanOrEqual(ROLL_IFRAMES);
    const s = newShip();
    let open = 0;
    for (let i = 0; i < Math.round(5 / STEP); i++) {
      stepShip(s, ctl({ roll: true }), hull, STEP);
      if (s.invuln === 0) open++;
    }
    expect(open * STEP).toBeGreaterThan(0.5);
  });

  it('alternates direction when nothing says which way', () => {
    const s = newShip();
    stepShip(s, ctl({ roll: true }), HULL, STEP);
    const first = s.rollDir;
    fly(s, HULL, idle, ROLL_COOLDOWN + STEP);
    stepShip(s, ctl({ roll: true }), HULL, STEP);
    expect(s.rollDir).toBe(-first);
  });
});

describe('controls', () => {
  const up = Math.PI / 2;

  it('reads a stick like a car: across steers, forward throttles', () => {
    const right = flightControls(input({ aim: { angle: 0, mag: 1 } }));
    expect(right.turn).toBe(1);
    expect(right.thrust).toBe(0);
    expect(right.rollDir).toBe(1);
    const ahead = flightControls(input({ aim: { angle: up, mag: 1 } }));
    expect(ahead.thrust).toBe(1);
    expect(Math.abs(ahead.turn)).toBeLessThan(1e-9);
  });

  it('ignores a stick resting inside the dead zone', () => {
    const c = flightControls(input({ aim: { angle: 0, mag: 0.1 } }));
    expect(c.turn).toBe(0);
    expect(c.thrust).toBe(0);
  });

  it('passes keys and both triggers through', () => {
    const c = flightControls(input({ turn: -1, thrust: 1, fire: true, torpedo: true }));
    expect(c.turn).toBe(-1);
    expect(c.thrust).toBe(1);
    expect(c.rollDir).toBe(-1);
    expect(c.fire).toBe(true);
    expect(c.torpedo).toBe(true);
  });
});
