import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { SUPPLIES_MAX } from '../src/sim/breakout';
import { SUPPLIES_TARGET, planStop, stopIdle, type StopView } from '../src/sim/stop';
import { World } from '../src/sim/world';

// The port's sensible stop (sim/stop.ts): keep the jump's Cyrite, then buy
// what is most pressing as far as the rest reaches.

const prices = { cyrite: 1, plate: 6, supplies: 2 };
const view = (o: Partial<StopView> = {}): StopView => ({ prices, cyrite: 20, jumpCost: 20, supplies: SUPPLIES_TARGET, plates: 3, maxPlates: 3, ...o });

describe('the sensible stop', () => {
  it('does nothing for a ship that has all it needs, and never spends the jump', () => {
    expect(stopIdle(planStop(view()))).toBe(true);
    expect(stopIdle(planStop(view({ cyrite: 20, supplies: 0, plates: 0 })))).toBe(true);
  });

  it('puts supplies first, then the hull, from what is over the jump', () => {
    // 4 spare: two supplies
    expect(planStop(view({ cyrite: 24, supplies: 4, plates: 2 }))).toMatchObject({ supplies: 2, plate: 0, cyrite: -4 });
    // 20 spare: four supplies to the target of 10 would cost 12, so a plate (6) fits after
    expect(planStop(view({ cyrite: 40, supplies: 8, plates: 2 }))).toMatchObject({ supplies: 2, plate: 1, cyrite: -10 });
  });

  it('never spends more than it has over the jump, nor fills past a limit', () => {
    for (const have of [0, 7, 33, 120, 900]) {
      const s = planStop(view({ cyrite: 20 + have, supplies: 0, plates: 0 }));
      expect(-s.cyrite).toBeLessThanOrEqual(have);
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
    w.plates = 1; w.cyrite = w.jumpCost + 14; w.supplies = 2;
    const plan = w.planStop();
    const did = w.sensibleStop();
    expect(did).toEqual(plan);
    expect(w.cyrite).toBe(w.jumpCost + 14 + plan.cyrite);
    expect(w.supplies).toBe(2 + plan.supplies);
    expect(w.plates).toBe(1 + plan.plate);
    // asked again, there is nothing left it can do
    expect(stopIdle(w.planStop())).toBe(true);
  });
});
