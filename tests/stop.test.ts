import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { SUPPLIES_MAX } from '../src/sim/breakout';
import { SUPPLIES_TARGET, planStop, stopIdle, type StopView } from '../src/sim/stop';
import { World } from '../src/sim/world';

// The port's sensible stop (sim/stop.ts): the tank up to the jump first, then
// what is most pressing as far as the purse reaches.

const prices = { cyrite: 1, plate: 6, supplies: 2 };
const view = (o: Partial<StopView> = {}): StopView => ({ prices, cyrite: 0, jumpCost: 20, fuel: 20, fluidPrice: 2, supplies: SUPPLIES_TARGET, plates: 3, maxPlates: 3, ...o });

describe('the sensible stop', () => {
  it('does nothing for a ship that has all it needs', () => {
    expect(stopIdle(planStop(view()))).toBe(true);
    expect(stopIdle(planStop(view({ cyrite: 0, supplies: 0, plates: 0 })))).toBe(true);
  });

  it('fills the tank to the jump first, as far as the purse reaches', () => {
    // 6 short at 2 a unit
    expect(planStop(view({ fuel: 14, cyrite: 12, supplies: 0 }))).toMatchObject({ fuel: 6, supplies: 0, cyrite: -12 });
    expect(planStop(view({ fuel: 14, cyrite: 5, supplies: 0 }))).toMatchObject({ fuel: 2, cyrite: -4 });
    // never past the jump
    expect(planStop(view({ fuel: 19, cyrite: 99, supplies: SUPPLIES_TARGET }))).toMatchObject({ fuel: 1, cyrite: -2 });
  });

  it('puts supplies next, then the hull, from what is left', () => {
    // 4 spare: two supplies
    expect(planStop(view({ cyrite: 4, supplies: 4, plates: 2 }))).toMatchObject({ fuel: 0, supplies: 2, plate: 0, cyrite: -4 });
    // 10 spare: two supplies to the target of 10 cost 4, so a plate (6) fits after
    expect(planStop(view({ cyrite: 10, supplies: 8, plates: 2 }))).toMatchObject({ supplies: 2, plate: 1, cyrite: -10 });
  });

  it('never spends more than the purse, nor fills past a limit', () => {
    for (const have of [0, 7, 33, 120, 900]) {
      const s = planStop(view({ cyrite: have, fuel: 0, supplies: 0, plates: 0 }));
      expect(-s.cyrite).toBeLessThanOrEqual(have);
      expect(s.fuel).toBeLessThanOrEqual(20);
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
    w.plates = 1; w.cyrite = 30; w.fuel = w.jumpCost - 4; w.supplies = 2;
    const plan = w.planStop();
    const did = w.sensibleStop();
    expect(did).toEqual(plan);
    expect(w.cyrite).toBe(30 + plan.cyrite);
    expect(w.fuel).toBe(w.jumpCost);
    expect(plan.fuel).toBeGreaterThan(0);
    expect(w.supplies).toBe(2 + plan.supplies);
    expect(w.plates).toBe(1 + plan.plate);
    // asked again, there is nothing left it can do
    expect(stopIdle(w.planStop())).toBe(true);
  });
});

describe('jump fluid at a port', () => {
  const dock = (): World => {
    const w = new World(3, { mode: 'breakout' });
    w.field.rocks = []; w.field.bulwarks = [];
    w.cardNext = Infinity; w.bk!.nextPursuit = Infinity; w.portCalled = true;
    w.ship.x = w.bk!.port!.x; w.ship.z = w.bk!.port!.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 90 && w.phase !== 'dock'; i++) w.step(STEP, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    return w;
  };

  it('sells a unit for the port’s price in Cyrite, up to what the tank holds', () => {
    const w = dock();
    const price = w.fluidPrice;
    expect(price).toBeGreaterThanOrEqual(1);
    w.fuel = 4; w.cyrite = price * 2 + 1;
    expect(w.buy('fuel')).toBe(true);
    expect(w.fuel).toBe(5);
    expect(w.cyrite).toBe(price + 1);
    w.cyrite = price - 1;
    expect(w.canBuy('fuel')).toBe(false);
    w.cyrite = 999; w.fuel = w.tankCap;
    expect(w.canBuy('fuel')).toBe(false);
  });

  it('is never touched by an upgrade: the bay spends the purse only', () => {
    const w = dock();
    w.fuel = 3; w.cyrite = 500;
    expect(w.openBay()).toBe(true);
    expect(w.install('ph_emitters')).toBeNull();
    expect(w.fuel).toBe(3);
    expect(w.cyrite).toBeLessThan(500);
    // and the other way: a jump short of fluid is not helped by a full purse
    w.closeBay();
    expect(w.fuel).toBeLessThan(w.jumpCost);
  });

  it('never sells in the Arcade', () => {
    const w = new World(3);
    expect(w.canBuy('fuel')).toBe(false);
  });
});
