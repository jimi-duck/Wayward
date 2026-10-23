import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { EMPTY_STORES, LOW_SUPPLIES } from '../src/sim/breakout';
import { WEB } from '../src/content/web';
import { budgets, weightFuel } from '../src/sim/budgets';
import { newJourney, options, plot, sortieDef } from '../src/sim/journey';
import { stockLevels } from '../src/sim/bay';

/** A build run over the mass rating (the bay does not stop the weight). */
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

describe('the gate and the depot keep their own', () => {
  const idle = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

  it('hurts nothing inside the ring, and the alert is clear', () => {
    const { w } = story();
    w.bk!.nextPursuit = Infinity; w.cardNext = Infinity;
    const lane = w.bk!.lane;
    w.ship.x = lane.x + 10; w.ship.z = lane.z;
    expect(w.safe).toBe('lane');
    const plates = w.plates;
    (w as unknown as { hitShip(s: string, x: number, z: number): void }).hitShip('test', lane.x, lane.z);
    expect(w.plates).toBe(plates);
    expect(w.alert()).toBe('clear');
    w.ship.x = lane.x + 100;
    expect(w.safe).toBeNull();
  });

  it('holds our guns cold inside the ring too, and fires again outside', () => {
    const { w } = story();
    w.bk!.nextPursuit = Infinity; w.cardNext = Infinity;
    const lane = w.bk!.lane, trigger = { ...idle, fire: true, torpedo: true };
    w.ship.x = lane.x + 30; w.ship.z = lane.z;
    w.step(1 / 60, idle);
    if (w.phase === 'comms') w.answer(0);
    w.events.length = 0;
    w.step(1 / 60, trigger);
    expect(w.bolts.length).toBe(0);
    expect(w.torps.length).toBe(0);
    expect(w.events.some((e) => e.type === 'gunsCold')).toBe(true);
    w.ship.x = lane.x + 100;
    w.ship.z = lane.z + 300;
    expect(w.safe).toBeNull();
    w.step(1 / 60, trigger);
    expect(w.bolts.length).toBeGreaterThan(0);
  });

  it('keeps hostile hulls outside it, circling', () => {
    const { w } = story();
    w.bk!.nextPursuit = Infinity; w.cardNext = Infinity;
    const port = w.bk!.port!;
    w.field.rocks = [];
    w.ship.x = port.x; w.ship.z = port.z;
    const a = w.spawnHostile('scout', { x: port.x + 70, y: 0, z: port.z });
    for (let i = 0; i < 600; i++) {
      w.ship.x = port.x; w.ship.z = port.z; w.ship.vx = 0; w.ship.vz = 0;
      w.step(1 / 60, idle);
      if (w.phase !== 'play') w.phase = 'play';
    }
    const d = Math.hypot(a.x - port.x, a.z - port.z);
    expect(d).toBeGreaterThan(40);
    expect(w.plates).toBe(w.stats.maxPlates);
  });
});
