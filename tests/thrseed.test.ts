import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { STEP } from '../src/core/loop';
import { SEED_STUDY_T, SEED_HP } from '../src/sim/thrseed';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(thren = 0.6): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, safe: false, situation: undefined, kind: 'mining' as const, thren };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}
const park = (w: World, dist: number, s: number, speed = 0) => {
  const d = w.thrSeed!;
  for (let i = 0; i < Math.round(s / STEP); i++) { w.ship.x = d.x - dist; w.ship.z = d.z; w.ship.vx = speed; w.ship.vz = 0; w.ship.invuln = 1; w.step(STEP, input()); }
};
type Hurt = { hurtSeed: (d: unknown, n: number, x: number, y: number, z: number) => void };

describe('the Thren seed', () => {
  it('grows only in a Thren sky', () => {
    expect(level(0).thrSeed).toBeNull();
    expect(level(0.6).thrSeed).toBeTruthy();
  });

  it('grows while ignored', () => {
    const w = level();
    const g = w.thrSeed!.growth;
    park(w, 400, 30);
    expect(w.thrSeed!.growth).toBeGreaterThan(g);
  });

  it('goes quiet and is studied once if you stay still beside it', () => {
    const w = level();
    const g = w.thrSeed!.growth;
    park(w, 20, SEED_STUDY_T + 2);
    expect(w.thrSeed!.state).toBe('studied');
    expect(w.thrSeed!.growth).toBeLessThanOrEqual(g + 0.02);
    expect(w.pickups.length).toBeGreaterThan(0);
  });

  it('answers weapons fire with motes, and drops loot when burned', () => {
    const w = level();
    const d = w.thrSeed!;
    park(w, 60, 1, 6);
    (w as unknown as Hurt).hurtSeed(d, 5, d.x, 0, d.z);
    expect(d.sent.size).toBeGreaterThan(0);
    (w as unknown as Hurt).hurtSeed(d, SEED_HP, d.x, 0, d.z);
    expect(d.state).toBe('dead');
    expect(w.pickups.length).toBeGreaterThan(0);
  });
});
