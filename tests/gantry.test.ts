import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { STEP } from '../src/core/loop';
import { GANTRY_MEND_T, GANTRY_USES } from '../src/sim/gantry';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(kind: 'transit' | 'mining' = 'transit'): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, safe: false, situation: undefined, kind, thren: 0 };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}
const hold = (w: World, s: number) => {
  const g = w.gantry!;
  for (let i = 0; i < Math.round(s / STEP); i++) { w.ship.x = g.x + 3; w.ship.z = g.z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 1; w.step(STEP, input()); }
};

describe('the repair gantry', () => {
  it('stands only in a transit system', () => {
    expect(level('transit').gantry).toBeTruthy();
    expect(level('mining').gantry).toBeNull();
  });

  it('mends a plate after a hold, and wears out', () => {
    const w = level();
    w.bk!.heat = 0;
    w.plates = 1;
    hold(w, GANTRY_MEND_T + 1);
    expect(w.plates).toBe(2);
    expect(w.gantry!.uses).toBe(GANTRY_USES - 1);
    for (let i = 0; i < GANTRY_USES; i++) { w.plates = 1; hold(w, GANTRY_MEND_T + 1); }
    expect(w.gantry!.uses).toBe(0);
    expect(w.gantry!.state).toBe('spent');
  });

  it('refuses a flagged hull', () => {
    const w = level();
    w.bk!.heat = 0.9;
    w.plates = 1;
    hold(w, GANTRY_MEND_T + 2);
    expect(w.plates).toBe(1);
    expect(w.gantry!.state).toBe('refuses');
  });

  it('shuts in a fight', () => {
    const w = level();
    w.bk!.heat = 0;
    w.plates = 1;
    const g = w.gantry!;
    w.spawnHostile('scout', { x: g.x + 80, y: 0, z: g.z });
    hold(w, 2);
    expect(['shut']).toContain(g.state);
    expect(w.plates).toBe(1);
  });
});
