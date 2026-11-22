import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';

// Copperline: Brook in a Custody transport. "Run it down" is a chase: the transport comes in ahead and makes for the Jump Gate
// with two escorts; crippled and taken in tow, Brook is free; through the gate, or sunk, he is taken.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/** A road journey standing at Copperline (the Reach's fifth stop), Brook met at Tallyhouse. */
function copperline(): Journey {
  const j = newJourney(5, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= 6).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'brook_met', 'frag_ledger', 'frag_order');
  return j;
}

/** The world at Copperline with a quiet sky but its scene, run until Brook's card is answered with `choice`. */
function answered(choice: string): World {
  const j = copperline();
  const def = sortieDef(j);
  expect(def.situation).toBe('brook_transport');
  const w = new World(11, { mode: 'breakout', sortie: { ...def, pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, blockade: false, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
  for (let i = 0; i < 120 / STEP; i++) {
    w.step(STEP, NO);
    w.ship.invuln = 99;
    const open = w.comms ?? w.call;
    if (open?.def.id === 'story_brook_road') { w.answer(choice); return w; }
    if (open) w.answer(open.def.choices[0]!.id);
  }
  throw new Error('Brook never called');
}

describe('Brook’s transport at Copperline', () => {
  it('runs for the Jump Gate with two escorts once she goes after it', () => {
    const w = answered('rescue');
    w.step(STEP, NO);
    expect(w.stage?.taken).toBe(true);
    const tg = w.stage!.run!.target!;
    expect(w.aliens).toContain(tg);
    expect(w.aliens.filter((a) => a.job && a !== tg)).toHaveLength(2);
    const gate = w.bk!.lane;
    const d0 = Math.hypot(tg.x - gate.x, tg.z - gate.z);
    for (let i = 0; i < 10 / STEP; i++) { w.step(STEP, NO); w.ship.invuln = 99; }
    expect(Math.hypot(tg.x - gate.x, tg.z - gate.z)).toBeLessThan(d0);
  });

  it('frees Brook when the transport is crippled and taken in tow', () => {
    const w = answered('rescue');
    w.step(STEP, NO);
    const tg = w.stage!.run!.target!;
    tg.hp = tg.maxHp * 0.2;
    for (let i = 0; i < 20 / STEP && !w.flags.has('brook_free'); i++) {
      w.ship.x = tg.x + 10; w.ship.z = tg.z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 99;
      w.step(STEP, NO);
    }
    expect(w.flags.has('brook_free')).toBe(true);
    expect(w.flags.has('brook_taken')).toBe(false);
  });

  it('loses him when the transport is sunk, or makes the gate', () => {
    const sunk = answered('rescue');
    sunk.step(STEP, NO);
    const hull = sunk.stage!.run!.target!;
    hull.hp = 0;
    sunk.aliens.splice(sunk.aliens.indexOf(hull), 1);
    for (let i = 0; i < 2 / STEP; i++) sunk.step(STEP, NO);
    expect(sunk.flags.has('brook_taken')).toBe(true);
    expect(sunk.flags.has('brook_free')).toBe(false);

    const gone = answered('rescue');
    gone.step(STEP, NO);
    const tg = gone.stage!.run!.target!;
    tg.x = gone.bk!.lane.x + 10; tg.z = gone.bk!.lane.z;
    for (let i = 0; i < 2 / STEP; i++) gone.step(STEP, NO);
    expect(gone.flags.has('brook_taken')).toBe(true);
  });

  it('takes him without a chase when she leaves him', () => {
    const w = answered('leave');
    for (let i = 0; i < 2 / STEP; i++) w.step(STEP, NO);
    expect(w.flags.has('brook_taken')).toBe(true);
    expect(w.stage?.run).toBeNull();
  });
});
