import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { STEP } from '../src/core/loop';
import { BARGE_PULL_R } from '../src/sim/barge';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(kind: 'mining' | 'transit'): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, situation: undefined, kind, thren: 0 };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}
const run = (w: World, s: number) => { for (let i = 0; i < Math.round(s / STEP); i++) { w.ship.invuln = 1; w.step(STEP, input()); } };
const rock = (id: number, x: number, z: number) => ({ id, kind: 'basalt' as const, size: 1 as const, r: 3, hp: 3, maxHp: 3, variant: 0, ax: 0, ay: 1, az: 0, spin: 0, age: 5, hitT: 0, ox: 0, oz: 0, rot: 0, x, z, vx: 0, vz: 0 });

describe('the refinery barge', () => {
  it('works only a mining system', () => {
    expect(level('mining').barge).toBeTruthy();
    expect(level('transit').barge).toBeNull();
  });

  it('hauls a rock in, grinds it and leaves loot where it was', () => {
    const w = level('mining');
    const b = w.barge!;
    w.ship.x = b.x - 20; w.ship.z = b.z;
    w.field.rocks.length = 0;
    w.field.rocks.push(rock(8001, b.x + BARGE_PULL_R - 45, b.z));
    run(w, 40);
    expect(w.field.rocks.some((r) => r.id === 8001)).toBe(false);
    expect(b.ground).toBeGreaterThan(0);
  });

  it('runs from a fight and stops hauling', () => {
    const w = level('mining');
    const b = w.barge!;
    w.field.rocks.length = 0;
    w.ship.x = b.x - 20; w.ship.z = b.z;
    const x0 = b.x;
    const a = w.spawnHostile('scout', { x: b.x - 120, y: 0, z: b.z }, null, true);
        for (let i = 0; i < 120; i++) { a.x = b.x - 120; a.z = b.z; w.ship.invuln = 1; w.step(STEP, input()); }
    expect(b.mood).toBe('fleeing');
    expect(b.x).toBeGreaterThan(x0);
  });
});
