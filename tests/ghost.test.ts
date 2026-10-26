import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { GHOST_FAR, GHOST_NEAR } from '../src/sim/ghost';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';

// The ghost at Hollis: it holds, never closes, takes nothing, and waits for a quiet sky.

const NO_INPUT = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
const FLY = { ...NO_INPUT, thrust: 1 } as const;

/** A road journey standing at Hollis (stop 3), a quiet sky, the tank at `tank`. */
function hollis(tank: number) {
  const j = newJourney(5, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= 4).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke');
  const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, blockade: false, situation: null, place: null, thren: 0, calloway: Infinity };
  const w = new World(9, { mode: 'breakout', sortie: def, carry: j.carry });
  w.fuel = w.tankCap * tank;
  return w;
}

/** Steps for `secs`, answering any card that opens (a call pauses the world), and checks `each` after every step. */
function run(w: World, secs: number, input: Parameters<World['step']>[1] = NO_INPUT, each?: () => void): void {
  for (let i = 0; i < secs / STEP; i++) {
    w.step(STEP, input);
    w.ship.invuln = 99;
    if (w.comms) w.answer(w.comms.def.choices[0]!.id);
    each?.();
  }
}

const dist = (w: World) => Math.hypot(w.ghost!.x - w.ship.x, w.ghost!.z - w.ship.z);

describe('the ghost at Hollis', () => {
  it('waits for the tank to pass half', () => {
    const w = hollis(0.3);
    run(w, 60);
    expect(w.ghost).toBeNull();
    w.fuel = w.tankCap * 0.6;
    run(w, 20);
    expect(w.ghost).not.toBeNull();
    expect(w.flags.has('ghost_here')).toBe(true);
    expect(w.aliens.length).toBe(0);
  });

  it('never closes, however the ship flies at it, then comes nearer once at three quarters', () => {
    const w = hollis(0.6);
    run(w, 20);
    expect(dist(w)).toBeCloseTo(GHOST_FAR, 0);
    // fly straight at it
    const bearing = Math.atan2(-(w.ghost!.z - w.ship.z), w.ghost!.x - w.ship.x);
    w.ship.heading = bearing;
    run(w, 20, FLY, () => expect(dist(w)).toBeGreaterThanOrEqual(GHOST_FAR - 4));
    w.fuel = w.tankCap * 0.8;
    run(w, 40, FLY);
    expect(dist(w)).toBeCloseTo(GHOST_NEAR, 0);
    expect(w.flags.has('ghost_close')).toBe(true);
  });

  it('takes no damage: it is no hull, so no bolt has it to hit', () => {
    const w = hollis(0.6);
    run(w, 20);
    const bearing = Math.atan2(-(w.ghost!.z - w.ship.z), w.ghost!.x - w.ship.x);
    w.ship.heading = bearing;
    run(w, 20, { ...NO_INPUT, fire: true });
    expect(w.aliens.length).toBe(0);
    expect(w.ghost).not.toBeNull();
  });

  it('never comes while a hostile is near', () => {
    const w = hollis(0.6);
    w.spawnHostile('raptor', { x: w.ship.x + 40, y: 0, z: w.ship.z });
    run(w, 10);
    expect(w.ghost).toBeNull();
  });

  it('logs the Wall at once: a jump before Sam speaks still has it', () => {
    const w = hollis(0.6);
    run(w, 12);
    expect(w.flags.has('ghost_here')).toBe(true);
    expect(w.flags.has('clue_ghost')).toBe(true);
    // the carry has it for the next stop
    expect(w.carry().flags).toContain('clue_ghost');
  });
});
