import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import type { Rock } from '../src/sim/field';
import { BANK_MAX, BANK_REFILL, BANK_SHOT, DYING, ROCK_POINTS, SHOT_COOLDOWN, TORP_RELOAD, TORP_SPACING } from '../src/sim/tuning';
import { World } from '../src/sim/world';

const input = (f: Partial<InputFrame> = {}): InputFrame =>
  ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard', ...f });

function run(w: World, seconds: number, f: Partial<InputFrame> = {}) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input(f));
}

/** A world with nothing in it but one still rock, `ahead` units up the screen. */
function range(ahead: number, size: 0 | 1 | 2 = 0): { w: World; rock: Rock } {
  const w = new World(1);
  w.field.rocks = [];
  w.field.bulwarks = [];
  const rock = w.field.spawn(size, 0, -ahead, 0, 0);
  rock.age = 10;
  // keep the field from topping itself up during the test
  w.field.step = (dt: number) => {
    for (const r of w.field.rocks) { r.x += r.vx * dt; r.z += r.vz * dt; r.hitT = Math.max(0, r.hitT - dt); }
  };
  return { w, rock };
}

describe('lasers', () => {
  it('fire at the original rate while the trigger is held (every 15th step at 60Hz, as the original did)', () => {
    const w = new World(1);
    w.field.rocks = [];
    let shots = 0;
    for (let i = 0; i < 60; i++) { w.step(STEP, input({ fire: true })); shots += w.drain().filter((e) => e.type === 'bolt').length; }
    expect(shots).toBe(Math.ceil(60 / Math.ceil(SHOT_COOLDOWN / STEP - 1e-9)));
  });

  it('drain the bank on a held trigger, keep firing at the refill rate once it is low, and refill', () => {
    const w = new World(1);
    w.field.rocks = [];
    run(w, 20, { fire: true });
    expect(w.arms.bank).toBeLessThan(BANK_SHOT);
    expect(w.drain().some((e) => e.type === 'bankEmpty')).toBe(true);
    // a low bank still fires, steadily, as fast as it refills
    let shots = 0;
    for (let i = 0; i < 240; i++) { w.step(STEP, input({ fire: true })); shots += w.drain().filter((e) => e.type === 'bolt').length; }
    expect(shots).toBeGreaterThanOrEqual(Math.floor((4 * BANK_REFILL) / BANK_SHOT) - 1);
    run(w, 6);
    expect(w.arms.bank).toBe(BANK_MAX);
  });

  it('break a small rock with one bolt and score it', () => {
    const { w, rock } = range(12, 2);
    run(w, 0.6, { fire: true });
    expect(w.field.rocks.includes(rock)).toBe(false);
    expect(w.run.scoreBy.rocks).toBe(ROCK_POINTS[2]);
  });

  it('split a large rock into two medium ones', () => {
    const { w } = range(14, 0);
    run(w, 1.4, { fire: true });
    run(w, 0.1);
    const sizes = w.field.rocks.map((r) => r.size);
    expect(sizes.filter((s) => s === 1).length + sizes.filter((s) => s === 2).length).toBeGreaterThanOrEqual(2);
    expect(sizes).not.toContain(0);
  });
});

describe('torpedoes', () => {
  it('are a refit, not standard: the stock ship has no bay', () => {
    const w = new World(1);
    w.field.rocks = [];
    w.step(STEP, input({ torpedo: true }));
    expect(w.torps.length).toBe(0);
    expect(w.drain().some((e) => e.type === 'torpedo')).toBe(false);
  });

  it('lock the rock ahead, steer onto it and blast it', () => {
    const { w, rock } = range(30, 1);
    w.setLevels({ tp_bay: 1 });
    rock.x = 8; // off to one side: the torpedo has to turn
    w.step(STEP, input());
    expect(w.lock).toBe(rock.id);
    w.step(STEP, input({ torpedo: true }));
    run(w, 1.5);
    expect(w.field.rocks.includes(rock)).toBe(false);
    expect(w.drain().some((e) => e.type === 'blast')).toBe(true);
  });

  it('come from a rack, one per press, and reload on the original clock', () => {
    const w = new World(1);
    w.field.rocks = [];
    w.setLevels({ tp_bay: 1, tp_magazine: 1 });
    const rack = w.stats.torpRack;
    expect(rack).toBe(3);
    for (let i = 0; i < rack + 1; i++) { w.step(STEP, input({ torpedo: true })); run(w, TORP_SPACING + 0.05); }
    expect(w.arms.rack).toBe(0);
    expect(w.drain().some((e) => e.type === 'rackEmpty')).toBe(true);
    run(w, TORP_RELOAD * rack + 0.2);
    expect(w.arms.rack).toBe(rack);
  });
});

describe('the hull', () => {
  it('loses a plate to rock, then gets a moment of grace', () => {
    const { w } = range(0.5, 0);
    w.shields = 0;
    w.step(STEP, input());
    expect(w.plates).toBe(w.hull.plates - 1);
    const after = w.plates;
    run(w, 0.5);
    expect(w.plates).toBe(after);
  });

  it('breaches at zero plates, reports the run, and starts a new one on request', () => {
    const { w, rock } = range(0.5, 0);
    w.score = 500;
    w.shields = 0;
    for (let i = 0; i < w.hull.plates; i++) {
      w.ship.invuln = 0;
      rock.x = w.ship.x; rock.z = w.ship.z; rock.vx = rock.vz = 0;
      if (!w.field.rocks.includes(rock)) w.field.rocks.push(rock);
      w.step(STEP, input());
    }
    const breach = w.drain().find((e) => e.type === 'breach');
    expect(breach && breach.type === 'breach' && breach.score).toBe(500);
    expect(w.best).toBe(500);
    expect(w.alive).toBe(false);
    // the wreck drifts a moment, then the run report
    run(w, DYING + 0.1);
    expect(w.phase).toBe('over');
    expect(w.run.score).toBe(500);
    expect(w.run.cause).toBe('rock');
    expect(w.run.platesLost).toBe(3);
    w.restart();
    expect(w.phase).toBe('play');
    expect(w.score).toBe(0);
    expect(w.plates).toBe(w.hull.plates);
    expect(w.ship.invuln).toBeGreaterThan(2);
  });

  it('is immune while rolling', () => {
    const { w } = range(3, 0);
    w.step(STEP, input({ roll: true }));
    run(w, 0.2);
    expect(w.plates).toBe(w.hull.plates);
  });
});

describe('the field', () => {
  it('starts clear around the ship and keeps itself stocked', () => {
    const w = new World(5);
    expect(w.field.rocks.every((r) => Math.hypot(r.x, r.z) >= 18)).toBe(true);
    const n = w.field.rocks.length;
    w.field.rocks.splice(0, 6);
    run(w, 2);
    expect(w.field.rocks.length).toBeGreaterThanOrEqual(n - 2);
  });

  it('plays the same run twice from the same seed', () => {
    const a = new World(9), b = new World(9);
    const script = (w: World) => { run(w, 2, { thrust: 1, fire: true }); run(w, 1, { turn: 1, torpedo: true }); };
    script(a); script(b);
    expect(a.score).toBe(b.score);
    expect(a.field.rocks.map((r) => r.id)).toEqual(b.field.rocks.map((r) => r.id));
    expect(a.ship.x).toBe(b.ship.x);
  });
});
