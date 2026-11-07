import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { STEP } from '../src/core/loop';
import { solidsOf, SOLID_R } from '../src/sim/solids';
import { SHIP_R } from '../src/sim/tuning';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(kind: 'transit' | 'mining' = 'transit'): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, safe: false, situation: undefined, kind, thren: 0 };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}

describe('solid places', () => {
  it('lists the built things of a system', () => {
    const w = level('mining');
    const k = solidsOf(w);
    expect(k.length).toBeGreaterThanOrEqual(2);
    expect(k.some((s) => s.r === SOLID_R.barge)).toBe(true);
    expect(k.some((s) => s.r === SOLID_R.den)).toBe(true);
  });

  it('keeps the market deck open inside its trading ring', () => {
    const j = newJourney(7);
    const def = { ...sortieDef(j), home: false, first: false, safe: false, situation: undefined, kind: 'port' as const, holder: 'guild' as const, thren: 0 };
    const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
    w.skipTraining();
    const m = w.market!;
    expect(m).toBeTruthy();
    // a point on the deck between the stalls and the trading ring is open
    const x = m.x + 11, z = m.z;
    expect(solidsOf(w).every((k) => Math.hypot(k.x - x, k.z - z) >= k.r + SHIP_R)).toBe(true);
  });

  it('turns the ship away from a gantry pylon, with no damage and a shield flash', () => {
    const w = level('transit');
    const g = w.gantry!;
    const pylon = solidsOf(w).find((k) => Math.hypot(k.x - (g.x + 7.5), k.z - (g.z + 3.5)) < 0.01)!;
    expect(pylon).toBeTruthy();
    const plates = w.plates, shields = w.shields;
    let flashed = false;
    // fly straight at the pylon from 30 units out at speed
    w.ship.x = pylon.x + 30; w.ship.z = pylon.z; w.ship.heading = Math.PI; w.ship.vx = -20; w.ship.vz = 0;
    for (let i = 0; i < 120; i++) {
      w.step(STEP, { ...input(), thrust: 1 });
      for (const e of w.drain()) if (e.type === 'shieldHit' && e.source === 'solid') flashed = true;
      expect(Math.hypot(w.ship.x - pylon.x, w.ship.z - pylon.z)).toBeGreaterThanOrEqual(pylon.r + SHIP_R - 0.01);
    }
    expect(w.plates).toBe(plates);
    expect(w.shields).toBe(shields);
    expect(w.alive).toBe(true);
    expect(flashed).toBe(true);
  });

  it('keeps every ring open: the gantry pad, the market deck, the depot berth', () => {
    const w = level('transit');
    const open = (x: number, z: number) => solidsOf(w).every((k) => Math.hypot(k.x - x, k.z - z) >= k.r + SHIP_R);
    const g = w.gantry!;
    expect(open(g.x, g.z)).toBe(true);
    const b = w.bk!;
    if (b.port) expect(open(b.port.x, b.port.z)).toBe(true);
    // a gantry's pad: hold still on it and it mends
    w.plates = Math.max(0, w.stats.maxPlates - 1);
    const before = w.plates;
    for (let i = 0; i < 60 * 8; i++) { w.ship.x = g.x; w.ship.z = g.z; w.ship.vx = w.ship.vz = 0; w.step(STEP, input()); w.drain(); }
    if (g.state !== 'refuses' && g.state !== 'shut') expect(w.plates).toBeGreaterThan(before);
  });

  it('is not solid at the jump gate: you fly through the ring', () => {
    const w = level('transit');
    expect(solidsOf(w).every((s) => Math.hypot(s.x - w.bk!.lane.x, s.z - w.bk!.lane.z) > 20)).toBe(true);
  });
});

describe('the audit dock', () => {
  it('leaves the way under its arch open and stands its legs and office solid', () => {
    const j = newJourney(7);
    const def = { ...sortieDef(j), home: false, first: true, audit: 'Kellern Audit Dock', safe: false, situation: undefined, kind: 'transit' as const, thren: 0 };
    const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
    w.skipTraining();
    const a = w.bk!.audit!;
    const k = solidsOf(w);
    expect(k.every((s) => Math.hypot(s.x - a.x, s.z - a.z) >= s.r + SHIP_R)).toBe(true);
    expect(k.filter((s) => Math.hypot(s.x - a.x, s.z - a.z) < 25).length).toBeGreaterThanOrEqual(6);
  });
});

describe("Ned's yard", () => {
  it('lets the ship into the ring and onto the pad, and keeps only the rock behind solid', () => {
    const j = newJourney(7);
    const def = { ...sortieDef(j), home: false, first: true, safe: false, situation: undefined, kind: 'transit' as const, thren: 0 };
    const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
    w.skipTraining();
    const y = w.bk!.yard!;
    const k = solidsOf(w);
    // nothing solid on the pad or inside its ring's front half
    expect(k.every((s) => Math.hypot(s.x - y.x, s.z - y.z) - s.r > 8)).toBe(true);
    // but the rock is there, behind
    expect(k.filter((s) => Math.hypot(s.x - y.x, s.z - y.z) < 45).length).toBeGreaterThanOrEqual(3);
  });
});
