import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { EMPTY_STORES, LOW_SUPPLIES, SAFE_R } from '../src/sim/breakout';
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
    const fed = w.stats.drive, gun = w.stats.bankRefill;
    w.supplies = 0;
    w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    expect(w.thin).toBe(true);
    expect(w.stats.drive).toBeCloseTo(fed * EMPTY_STORES, 5);
    expect(w.stats.bankRefill).toBeCloseTo(gun * EMPTY_STORES, 5);
    expect(w.stats.drive).toBeGreaterThan(0);
    w.supplies = 3;
    w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    expect(w.thin).toBe(false);
    expect(w.stats.drive).toBeCloseTo(fed, 5);
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
    // the lane's registry check, if it calls: submit to the scan (showing the registry needs a registration that has passed one)
    if (w.phase === 'comms') w.answer('scan');
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

  it('is a wall: fire from outside stops at the ring, and rock is kept out', () => {
    const { w } = story();
    w.bk!.nextPursuit = Infinity; w.cardNext = Infinity;
    const lane = w.bk!.lane;
    w.field.rocks = [];
    w.ship.x = lane.x + 200; w.ship.z = lane.z + 200;
    const bolt = { x: lane.x + SAFE_R + 2, y: 0, z: lane.z, vx: -60, vy: 0, vz: 0, life: 2, dmg: 1, pierce: 0, hit: [], homing: 0 };
    w.bolts.push(bolt);
    for (let i = 0; i < 30; i++) { w.step(1 / 60, idle); if (w.phase === 'comms') w.answer('scan'); }
    expect(w.bolts.includes(bolt)).toBe(false);
    // a rock drifting in is turned at the edge
    w.field.rocks = [{ id: 9001, kind: 'basalt', x: lane.x + SAFE_R + 12, z: lane.z, vx: -20, vz: 0, size: 'small', r: 3, hp: 99, maxHp: 99, variant: 0, ax: 0, az: 0, spin: 0, tilt: 0 } as never];
    for (let i = 0; i < 60; i++) { w.step(1 / 60, idle); if (w.phase === 'comms') w.answer('scan'); }
    const r = w.field.rocks.find((x) => x.id === 9001);
    if (r) expect(Math.hypot(r.x - lane.x, r.z - lane.z)).toBeGreaterThanOrEqual(SAFE_R);
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
