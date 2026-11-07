import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { stockLevels } from '../src/sim/bay';
import { computeStats } from '../src/sim/build';
import { spawnAlien } from '../src/sim/enemies';
import type { Rock } from '../src/sim/field';
import { World } from '../src/sim/world';

// The arms-and-reactor pass: what each new part does in the sim.

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' };
const fit = (w: World, extra: Record<string, number>) => {
  w.levels = { ...stockLevels(), ...extra };
  (w as unknown as { refreshStats(): void }).refreshStats();
};
function quiet(seed = 3): World {
  const w = new World(seed);
  w.field.rocks = []; w.field.bulwarks = []; w.field.step = () => {};
  w.pace.until = 1e9;
  return w;
}
const rock = (x: number, z: number, r = 1.9): Rock => ({
  id: 4000 + Math.round(x * 7 + z), kind: 'basalt', x, z, vx: 0, vz: 0, size: 1, r, hp: 40, maxHp: 40, variant: 0, ax: 0, ay: 1, az: 0, spin: 0, age: 10, hitT: 0,
} as Rock);
const step = (w: World, n: number, input: InputFrame = idle) => { for (let i = 0; i < n; i++) { w.ship.invuln = 1; w.step(STEP, input); } };

describe('the stat block', () => {
  it('starts with every new part off, and each part switches on its own', () => {
    const s = computeStats(stockLevels());
    expect([s.flux, s.rollFlush, s.surge, s.deflect, s.bowWave, s.flakEvery, s.laserChain]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(s.torpWell).toBe(false);
    expect(computeStats({ ...stockLevels(), rx_flux: 1 }).flux).toBeGreaterThan(0);
    expect(computeStats({ ...stockLevels(), rx_flush: 1 }).rollFlush).toBeGreaterThan(0);
    expect(computeStats({ ...stockLevels(), rx_surge: 1 }).surge).toBeGreaterThan(0);
    expect(computeStats({ ...stockLevels(), mo_deflector: 1 }).deflect).toBeGreaterThan(0);
    expect(computeStats({ ...stockLevels(), df_flak: 1 }).flakEvery).toBeGreaterThan(0);
    expect(computeStats({ ...stockLevels(), ph_chain: 1 }).laserChain).toBe(1);
    expect(computeStats({ ...stockLevels(), tp_well: 1 }).torpWell).toBe(true);
  });

  it('caps the stat steps, so no ladder runs away', () => {
    const s = computeStats({ ...stockLevels(), rx_flux: 40, mo_deflector: 1, mo_bow: 40, df_flak: 1, df_flak_rate: 40, ph_chain: 1, ph_chain_link: 40 });
    expect(s.flux).toBeLessThanOrEqual(1.2);
    expect(s.bowWave).toBeLessThanOrEqual(9);
    expect(s.flakEvery).toBeGreaterThanOrEqual(0.35);
    expect(s.laserChain).toBeLessThanOrEqual(3);
  });
});

describe('the reactor, wired in', () => {
  it('slipstream coupling refills the bank faster at speed than at rest', () => {
    const rate = (thrust: number) => {
      const w = quiet();
      fit(w, { rx_flux: 3 });
      w.arms.bank = 0;
      if (thrust) { w.ship.vx = 40; w.ship.heading = 0; }
      step(w, 30, { ...idle, thrust });
      return w.arms.bank;
    };
    expect(rate(1)).toBeGreaterThan(rate(0));
  });

  it('a barrel roll vents the coolant loops: bank back, a torpedo racked', () => {
    const w = quiet();
    fit(w, { rx_flush: 1 });
    w.arms.bank = 0; w.arms.rack = 0; w.arms.reload = 3;
    step(w, 3, { ...idle, roll: true });
    expect(w.arms.bank).toBeGreaterThan(w.stats.bankMax * 0.4);
    expect(w.arms.rack).toBeGreaterThanOrEqual(1);
  });

  it('a roll without the flush leaves the rack alone', () => {
    const w = quiet();
    fit(w, {});
    w.arms.rack = 0; w.arms.reload = 3;
    step(w, 3, { ...idle, roll: true });
    expect(w.arms.rack).toBe(0);
  });

  it('the surge core stacks on kills, to its limit, and fades', () => {
    const w = quiet();
    fit(w, { rx_surge: 1 });
    for (let i = 0; i < 7; i++) {
      const al = spawnAlien('scout', w.ship, 0, w.rng, { x: 0, y: 0, z: -60 });
      w.aliens.push(al);
      (w as unknown as { killAlien(a: unknown, s: string): void }).killAlien(al, 'laser');
    }
    expect(w.surgeN).toBe(5);
    step(w, 60 * 7);
    expect(w.surgeN).toBe(0);
  });
});

describe('wake deflectors', () => {
  it('shove rock aside from a ship that flies at it, and leave it alone without them', () => {
    const run = (deflect: boolean) => {
      const w = quiet();
      fit(w, deflect ? { mo_deflector: 1 } : {});
      w.ship.heading = Math.PI / 2; // nose toward -z
      const r = rock(0.5, -9);
      w.field.rocks = [r];
      w.ship.vz = -30;
      step(w, 20);
      return Math.hypot(r.vx, r.vz - 0) + Math.abs(r.x);
    };
    expect(run(true)).toBeGreaterThan(run(false) + 1);
  });

  it('the bow wave cracks rock shoved aside at speed', () => {
    const w = quiet();
    fit(w, { mo_deflector: 1, mo_bow: 2 });
    w.ship.heading = Math.PI / 2;
    const r = rock(0.3, -9, 1.05);
    r.hp = 0.5; r.maxHp = 0.5;
    w.field.rocks = [r];
    w.ship.vz = -39;
    for (let i = 0; i < 90 && w.field.rocks.includes(r); i++) { w.ship.vz = -39; w.ship.invuln = 1; w.step(STEP, idle); }
    expect(w.field.rocks.includes(r)).toBe(false);
  });
});

describe('point defence', () => {
  it('shoots down the nearest enemy bolt in reach, one at a time', () => {
    const w = quiet();
    fit(w, { df_flak: 1 });
    const shot = (x: number) => ({ id: 900 + x, x, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 5, r: 0.4, faction: 'gutter', hp: 0, seek: 0, split: 0 }) as never;
    w.shots.push(shot(6), shot(9));
    step(w, 2);
    expect(w.shots.length).toBe(1);
    step(w, 60 * 3);
    expect(w.shots.length).toBe(0);
  });

  it('does nothing without the turret', () => {
    const w = quiet();
    fit(w, {});
    w.shots.push({ id: 901, x: 6, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 5, r: 0.4, faction: 'gutter', hp: 0, seek: 0, split: 0 } as never);
    step(w, 1);
    expect(w.shots.length).toBe(1);
  });
});

describe('chain lances', () => {
  it('jump from the first hull they hit to the next one in reach', () => {
    const w = quiet();
    fit(w, { ph_chain: 1 });
    const a = spawnAlien('lancer', w.ship, 0, w.rng, { x: 0, y: 0, z: -30 });
    const b = spawnAlien('lancer', w.ship, 0, w.rng, { x: 14, y: 0, z: -30 });
    for (const al of [a, b]) { al.hp = 999; al.maxHp = 999; al.mode = 'leave'; w.aliens.push(al); }
    w.bolts.push({ x: 0, y: 0, z: -30, vx: 0, vy: 0, vz: -10, life: 1, dmg: 1, pierce: 0, hit: [], homing: 0, chain: 1 });
    (w as unknown as { collide(): void }).collide();
    expect(w.bolts.length).toBeGreaterThanOrEqual(1);
    const jump = w.bolts.find((x) => x.hit.length > 0 && x.vx > 0);
    expect(jump).toBeTruthy();
  });
});

describe('singularity warheads', () => {
  it('leave a well that drags a hull toward the blast', () => {
    const w = quiet();
    fit(w, { tp_well: 1 });
    const al = spawnAlien('lancer', w.ship, 0, w.rng, { x: 9, y: 0, z: -40 });
    al.mode = 'leave'; al.vx = 0; al.vz = 0; al.hp = 999; al.maxHp = 999;
    w.aliens.push(al);
    (w as unknown as { torpBlast(tp: unknown): void }).torpBlast({ id: 1, x: 0, y: 0, z: -40, vx: 0, vy: 0, vz: 0, speed: 0, life: 1, target: null, dmg: 0, blast: 4, turn: 0, max: 0, accel: 0, cone: 0, seek: 0, small: true });
    (w as unknown as { torpBlast(tp: unknown): void }).torpBlast({ id: 2, x: 0, y: 0, z: -40, vx: 0, vy: 0, vz: 0, speed: 0, life: 1, target: null, dmg: 0, blast: 4, turn: 0, max: 0, accel: 0, cone: 0, seek: 0, small: false });
    const x0 = al.x;
    step(w, 20);
    expect(al.vx).toBeLessThan(0);
    expect(al.x).toBeLessThan(x0 + 0.01);
  });
});
