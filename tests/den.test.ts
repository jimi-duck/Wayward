import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { STEP } from '../src/core/loop';
import { DEN_HP, DEN_WAVES, DEN_WAKE_R } from '../src/sim/den';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(kind: 'transit' | 'mining' = 'mining'): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, safe: false, situation: undefined, kind, thren: 0 };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}
/** Park the ship near the den and run. */
const near = (w: World, dist: number, s: number) => {
  const d = w.den!;
  for (let i = 0; i < Math.round(s / STEP); i++) { w.ship.x = d.x - dist; w.ship.z = d.z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 1; w.step(STEP, input()); }
};
const ofDen = (w: World) => w.den!.sent.size;

describe('the raider den', () => {
  it('lies only in a mining system, and is dark', () => {
    expect(level('transit').den).toBeNull();
    const w = level();
    expect(w.den).toBeTruthy();
    expect(w.den!.state).toBe('dark');
  });

  it('stays quiet while you are far, and launches waves when you are near', () => {
    const w = level();
    near(w, DEN_WAKE_R + 100, 20);
    expect(ofDen(w)).toBe(0);
    near(w, 180, 4);
    expect(w.den!.state).toBe('awake');
    expect(w.den!.waves).toBeGreaterThanOrEqual(1);
    expect(ofDen(w)).toBeGreaterThan(0);
    near(w, 180, 120);
    expect(w.den!.waves).toBeLessThanOrEqual(DEN_WAVES);
  });

  it('sends a wing round the flank when shot, and runs to a second den when crushed', () => {
    const w = level();
    const d = w.den!;
    near(w, 120, 1);
    const first = { x: d.x, z: d.z };
    const before = ofDen(w);
    (w as unknown as { hurtDen: (d: unknown, n: number, x: number, y: number, z: number) => void }).hurtDen(d, 5, d.x, 0, d.z);
    expect(ofDen(w)).toBeGreaterThan(before);
    (w as unknown as { hurtDen: (d: unknown, n: number, x: number, y: number, z: number) => void }).hurtDen(d, DEN_HP * 0.7, d.x, 0, d.z);
    expect(d.state).toBe('moving');
    near(w, 400, 25);
    expect(d.state === 'dark' || d.state === 'seen' || d.state === 'awake').toBe(true);
    expect(Math.hypot(d.x - first.x, d.z - first.z)).toBeGreaterThan(50);
    expect(d.hp).toBeLessThan(DEN_HP);
  });

  it('spills loot and pays a bounty when destroyed', () => {
    const w = level();
    const d = w.den!;
    near(w, 120, 1);
    const score = w.score;
    const hurt = (w as unknown as { hurtDen: (d: unknown, n: number, x: number, y: number, z: number) => void }).hurtDen.bind(w);
    d.hp = 5;
    d.moved = true;
    hurt(d, 99, d.x, 0, d.z);
    expect(d.state).toBe('dead');
    expect(w.score).toBeGreaterThan(score);
    expect(w.pickups.length).toBeGreaterThan(0);
  });
});
