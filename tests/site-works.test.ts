import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { BASE_PRICES, type Holder } from '../src/content/systems';
import { STEP } from '../src/core/loop';
import { CRANE_KEEP, FLAK_R } from '../src/sim/site';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(holder: Holder): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), holder, port: { name: 'Test Dock', prices: { ...BASE_PRICES } } };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  w.ship.x = w.bk!.port!.x + 60; w.ship.z = w.bk!.port!.z;
  return w;
}
const run = (w: World, s: number) => { for (let i = 0; i < Math.round(s / STEP); i++) { w.ship.invuln = 1; w.step(STEP, input()); } };

describe("a holder's port at work", () => {
  it('a Holdfast shoots the rock drifting in, and leaves rock drifting away', () => {
    const w = level('holdfast');
    const p = w.bk!.port!;
    w.field.rocks.length = 0;
    const base = { kind: 'basalt' as const, size: 1 as const, r: 3, hp: 3, maxHp: 3, variant: 0, ax: 0, ay: 1, az: 0, spin: 0, age: 5, hitT: 0, ox: 0, oz: 0, rot: 0 };
    w.field.rocks.push({ ...base, id: 9001, x: p.x + FLAK_R - 10, z: p.z, vx: -4, vz: 0 }, { ...base, id: 9002, x: p.x - FLAK_R + 10, z: p.z + 5, vx: -4, vz: 0 });
    run(w, 3);
    expect(w.field.rocks.some((r) => r.id === 9001)).toBe(false);
    expect(w.field.rocks.some((r) => r.id === 9002)).toBe(true);
  });

  it('other holders keep their ports quiet', () => {
    const w = level('kellern');
    const p = w.bk!.port!;
    w.field.rocks.length = 0;
    w.field.rocks.push({ kind: 'basalt', size: 1, r: 3, hp: 3, maxHp: 3, variant: 0, ax: 0, ay: 1, az: 0, spin: 0, age: 5, hitT: 0, ox: 0, oz: 0, rot: 0, id: 9003, x: p.x + 100, z: p.z, vx: -1, vz: 0 });
    run(w, 3);
    expect(w.field.rocks.some((r) => r.id === 9003)).toBe(true);
  });

  it('a Gutter crane keeps loose salvage that was about to be lost and hauls it in', () => {
    const w = level('gutter');
    const p = w.bk!.port!;
    w.ship.x = p.x - 300;
    w.pickups.push({ id: 7001, kind: 'cyrite', x: p.x + 150, z: p.z, vx: 0, vz: 0, life: 2, value: 1, age: 1 });
    run(w, 4);
    const pk = w.pickups.find((q) => q.id === 7001);
    expect(pk).toBeTruthy();
    expect(pk!.life).toBeGreaterThan(CRANE_KEEP - 6);
    expect(Math.hypot(pk!.x - p.x, pk!.z - p.z)).toBeLessThan(150);
  });
});
