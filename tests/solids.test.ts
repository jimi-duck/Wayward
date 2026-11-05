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

  it('turns the ship away from a gantry, with no damage and a shield flash', () => {
    const w = level('transit');
    const g = w.gantry!;
    const plates = w.plates, shields = w.shields;
    let flashed = false;
    // fly straight at its centre from 30 units out at speed
    w.ship.x = g.x - 30; w.ship.z = g.z; w.ship.heading = 0; w.ship.vx = 20; w.ship.vz = 0;
    for (let i = 0; i < 120; i++) {
      w.ship.x = Math.min(w.ship.x, g.x - 0.1);
      w.step(STEP, { ...input(), thrust: 1 });
      for (const e of w.drain()) if (e.type === 'shieldHit' && e.source === 'solid') flashed = true;
      expect(Math.hypot(w.ship.x - g.x, w.ship.z - g.z)).toBeGreaterThanOrEqual(SOLID_R.gantry + SHIP_R - 0.01);
    }
    expect(w.plates).toBe(plates);
    expect(w.shields).toBe(shields);
    expect(w.alive).toBe(true);
    expect(flashed).toBe(true);
  });

  it('is not solid at the jump gate: you fly through the ring', () => {
    const w = level('transit');
    expect(solidsOf(w).every((s) => Math.hypot(s.x - w.bk!.lane.x, s.z - w.bk!.lane.z) > 20)).toBe(true);
  });
});
