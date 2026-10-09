import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { SUPPLIES_MAX, TANK_MAX } from '../src/sim/breakout';
import { SUPPLIES_TARGET, planStop, stopIdle, type StopView } from '../src/sim/stop';
import { World } from '../src/sim/world';

// The port's sensible stop (sim/stop.ts): sell the hold, then buy what is
// most pressing as far as the chits reach.

const prices = { cyrite: 5, plate: 30, supplies: 9 };
const view = (o: Partial<StopView> = {}): StopView => ({ chits: 0, prices, cyrite: 20, jumpCost: 20, supplies: SUPPLIES_TARGET, plates: 3, maxPlates: 3, ...o });

describe('the sensible stop', () => {
  it('does nothing for a ship that has all it needs and chits for none of the extras', () => {
    expect(stopIdle(planStop(view({ chits: 4 })))).toBe(true);
  });

  it('puts Cyrite for the jump first, then food, then the hull, then a second jump', () => {
    // 40 chits: 4 Cyrite to jump (20), then food at 9 twice (18)
    expect(planStop(view({ chits: 40, cyrite: 16, supplies: 4, plates: 2 }))).toMatchObject({ cyrite: 4, supplies: 2, plate: 0 });
    // 100 chits: jump (5 x 5 = 25), supplies 2 (18), a plate (30), and the rest on a second jump
    expect(planStop(view({ chits: 100, cyrite: 15, supplies: 8, plates: 2 }))).toMatchObject({ cyrite: 5 + 5, supplies: 2, plate: 1 });
  });

  it('never spends more than it has, nor fills past a limit', () => {
    for (const chits of [0, 7, 33, 120, 900]) {
      const s = planStop(view({ chits, cyrite: 2, supplies: 0, plates: 0 }));
      expect(chits + s.chits).toBeGreaterThanOrEqual(0);
      expect(2 + s.cyrite).toBeLessThanOrEqual(TANK_MAX);
      expect(s.supplies).toBeLessThanOrEqual(SUPPLIES_MAX);
      expect(s.plate).toBeLessThanOrEqual(3);
    }
  });

  it('runs through the ship’s own buying at a port', () => {
    const w = new World(3, { mode: 'breakout' });
    w.field.rocks = []; w.field.bulwarks = [];
    w.cardNext = Infinity; w.bk!.nextPursuit = Infinity; w.portCalled = true;
    w.ship.x = w.bk!.port!.x; w.ship.z = w.bk!.port!.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 90 && w.phase !== 'dock'; i++) w.step(STEP, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    expect(w.phase).toBe('dock');
    w.plates = 1; w.chits = 10; w.cyrite = 5; w.supplies = 2;
    const plan = w.planStop();
    const did = w.sensibleStop();
    expect(did).toEqual(plan);
    expect(w.cyrite).toBe(5 + plan.cyrite);
    expect(w.supplies).toBe(2 + plan.supplies);
    expect(w.plates).toBe(1 + plan.plate);
    expect(w.chits).toBe(10 + plan.chits);
    // asked again, there is nothing left it can do
    expect(stopIdle(w.planStop())).toBe(true);
  });
});
