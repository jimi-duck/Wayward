import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { CYRITE_RUSH, CYRITE_SELL, EMPTY_STORES, LOW_SUPPLIES } from '../src/sim/breakout';
import { WEB } from '../src/content/web';
import { budgets, weightFuel } from '../src/sim/budgets';
import { newJourney, options, plot, sortieDef } from '../src/sim/journey';
import { stockLevels } from '../src/sim/bay';

/** A build run over the mass rating (the bay would not stop the weight, only the power). */
function heavy(): Record<string, number> {
  const levels = stockLevels();
  for (const n of WEB) {
    if ((n.draw.mass ?? 0) <= 0) continue;
    levels[n.id] = 1;
    const { use, cap } = budgets(levels);
    if (use.mass > cap.mass + 1) break;
  }
  return levels;
}

const story = (levels?: Record<string, number>) => {
  const j = newJourney(3);
  const w = new World(5, { mode: 'breakout', carry: { ...j.carry, supplies: 8, ...(levels ? { levels } : {}) } });
  return { j, w };
};

describe('a ship that is short or heavy', () => {
  it('flies slower and worse with the stores gone, and recovers when a crate is aboard', () => {
    const { w } = story();
    const fed = w.stats.thrust, gun = w.stats.bankRefill;
    w.supplies = 0;
    w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    expect(w.thin).toBe(true);
    expect(w.stats.thrust).toBeCloseTo(fed * EMPTY_STORES, 5);
    expect(w.stats.bankRefill).toBeCloseTo(gun * EMPTY_STORES, 5);
    expect(w.stats.thrust).toBeGreaterThan(0);
    w.supplies = 3;
    w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    expect(w.thin).toBe(false);
    expect(w.stats.thrust).toBeCloseTo(fed, 5);
  });

  it('warns about thin stores, and about nothing on a fed, light ship', () => {
    const { w } = story();
    expect(w.warnings).toEqual([]);
    w.supplies = LOW_SUPPLIES;
    expect(w.warnings).toEqual(['low']);
    w.supplies = 0;
    expect(w.warnings).toEqual(['empty']);
  });

  it('burns more Cyrite a jump for the weight, on the chart and in the sortie', () => {
    const levels = heavy();
    expect(weightFuel(stockLevels())).toBe(0);
    const extra = weightFuel(levels);
    expect(extra).toBeGreaterThan(0);
    const j = newJourney(3);
    j.carry.levels = levels;
    const o = options(j)[0]!;
    expect(o.fuel).toBe(o.route.cyrite + extra);
    plot(j, o.to.id);
    const w = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    expect(w.warnings).toContain('heavy');
    expect(w.jumpCost).toBe(sortieDef(j).jumpCost + extra);
  });

  it('does not jump on the lane\'s Cyrite alone when the weight asks for more', () => {
    const levels = heavy();
    const { w } = story(levels);
    expect(w.jumpCost).toBeGreaterThan(w.bk!.jumpCost);
  });
});

describe('the work bay and its Cyrite', () => {
  it('sells spare Cyrite for chits at a bay, never the tank the jump needs, and not at sea', () => {
    const { w } = story();
    w.cyrite = w.jumpCost + 5;
    const chits = w.chits;
    expect(w.sellCyrite()).toBe(0); // not docked
    w.phase = 'dock'; w.docked = true;
    expect(w.spareCyrite).toBe(5);
    expect(w.sellCyrite(2)).toBe(2 * CYRITE_SELL);
    expect(w.sellCyrite()).toBe(3 * CYRITE_SELL);
    expect(w.cyrite).toBe(w.jumpCost);
    expect(w.chits).toBe(chits + 5 * CYRITE_SELL);
    expect(w.sellCyrite()).toBe(0);
  });

  it('asks the rush price for Cyrite only while the tank is short of the jump', () => {
    const { w } = story();
    w.phase = 'dock'; w.docked = true;
    w.chits = 500;
    w.cyrite = 0;
    const p = w.prices.cyrite;
    expect(w.cyritePrice).toBe(Math.ceil(p * CYRITE_RUSH));
    const before = w.chits;
    expect(w.buy('cyrite')).toBe(true);
    expect(before - w.chits).toBe(Math.ceil(p * CYRITE_RUSH));
    w.cyrite = w.jumpCost;
    expect(w.cyritePrice).toBe(p);
  });
});
