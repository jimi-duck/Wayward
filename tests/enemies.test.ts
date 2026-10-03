import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { BOSS_FIRST, bossGap } from '../src/sim/bosses';
import { ALIEN_FIRST, ALIEN_TYPES, alienMax } from '../src/sim/enemies';
import { World } from '../src/sim/world';

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard' };

/** A world where nothing can hurt the ship, so the clock can run long. */
function immortal(seed = 3): World {
  const w = new World(seed);
  w.field.rocks = [];
  w.field.step = () => {};
  return w;
}
function run(w: World, seconds: number) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) { w.ship.invuln = 1; w.step(STEP, idle); }
}

describe('enemy pacing (the original curves)', () => {
  it('sends the first hull at four seconds, and only scouts at first', () => {
    const w = immortal();
    run(w, ALIEN_FIRST - 0.1);
    expect(w.aliens.length).toBe(0);
    run(w, 0.3);
    expect(w.aliens.length).toBe(1);
    expect(w.aliens[0]!.kind).toBe('scout');
  });

  it('never exceeds the ceiling, and unlocks hulls on the clock', () => {
    const w = immortal();
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) {
      run(w, 1);
      if (!w.command.boss) expect(w.aliens.filter((a) => !a.escort).length).toBeLessThanOrEqual(alienMax(w.runTime));
      for (const a of w.aliens) {
        seen.add(a.kind);
        if (!a.escort) expect(ALIEN_TYPES[a.kind].at).toBeLessThanOrEqual(w.runTime);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});

describe('capital ships', () => {
  it('warn, then arrive on the original clock with an escort wing', () => {
    const w = immortal(7);
    run(w, BOSS_FIRST - 3);
    expect(w.command.boss).toBeNull();
    run(w, 3.2);
    const ev = w.drain().map((e) => e.type);
    expect(ev).toContain('bossWarn');
    expect(ev).toContain('bossArrive');
    expect(w.command.boss).not.toBeNull();
    expect(['klingon', 'cardassian']).toContain(w.command.boss!.faction); // unlocked by 110s; never a Romulan first
    expect(w.aliens.some((a) => a.escort)).toBe(true);
  });

  it('pays the bounty and two plates when broken, then schedules the next', () => {
    const w = immortal(7);
    run(w, BOSS_FIRST + 0.5);
    const b = w.command.boss!;
    w.plates = 1;
    b.hp = 1;
    w.bolts.push({ x: b.x, z: b.z, vx: 0, vz: 0, life: 1 });
    w.step(STEP, idle);
    expect(w.command.boss).toBeNull();
    expect(w.plates).toBe(Math.min(w.hull.plates, 3));
    expect(w.drain().some((e) => e.type === 'bossDestroyed')).toBe(true);
    expect(w.command.next).toBeCloseTo(w.runTime + bossGap(1), 0);
  });

  it('leave when the fuse runs out', () => {
    const w = immortal(7);
    run(w, BOSS_FIRST + 60);
    expect(w.drain().some((e) => e.type === 'bossLeft')).toBe(true);
  });
});

describe('enemy fire', () => {
  it('costs a hull plate when it lands', () => {
    const w = immortal();
    w.shots.push({ id: 1, x: w.ship.x, z: w.ship.z, vx: 0, vz: 0, life: 1, r: 0.35, faction: 'klingon', hp: 0, seek: 0, split: 0 });
    w.step(STEP, idle);
    expect(w.plates).toBe(w.hull.plates - 1);
  });

  it('plasma can be shot down', () => {
    const w = immortal();
    w.shots.push({ id: 1, x: 0, z: -12, vx: 0, vz: 0, life: 8, r: 0.8, faction: 'romulan', hp: 1, seek: 0, split: 0 });
    for (let i = 0; i < 40; i++) w.step(STEP, { ...idle, fire: true });
    expect(w.drain().some((e) => e.type === 'plasmaDown')).toBe(true);
  });
});
