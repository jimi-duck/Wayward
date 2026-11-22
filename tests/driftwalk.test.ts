import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';

// The Long Walk, the Marches' set piece: Ma Saffi's card hands over the manifests, then the Drift fleet walks to the Jump Gate
// under Kellern guns. The count is on the HUD, a hull lost stays lost, and the fleet waits for her when she falls behind.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/** A road journey standing at the Long Walk. */
function longWalk(): Journey {
  const j = newJourney(5, false, 'road');
  const walk = j.chart.systems.find((s) => s.name === 'The Long Walk')!;
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= walk.col && j.chart.systems.filter((x) => x.col === s.col).length === 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = walk.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'ship_stolen', 'frag_ledger', 'frag_order');
  return j;
}

/** The world at the Long Walk with a quiet sky, held beside Ma Saffi until her card is answered. */
function walking(): World {
  const j = longWalk();
  const def = sortieDef(j);
  expect(def.situation).toBe('drift_walk');
  const w = new World(11, { mode: 'breakout', sortie: { ...def, pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, blockade: false, thren: 0, calloway: Infinity }, carry: j.carry });
  for (let i = 0; i < 120 / STEP; i++) {
    const sp = w.storyPlace;
    if (sp) { w.ship.x = sp.x + 4; w.ship.z = sp.z; w.ship.vx = w.ship.vz = 0; }
    w.ship.invuln = 99;
    w.step(STEP, NO);
    const open = w.comms ?? w.call;
    if (open?.def.id === 'story_drift') { w.answer('swap'); w.step(STEP, NO); return w; }
    if (open) w.answer(open.def.choices[0]!.id);
  }
  throw new Error('Ma Saffi never called');
}

describe('the Long Walk', () => {
  it('has the fleet in sight before the card, and walks it once she takes the manifests', () => {
    const w = walking();
    expect(w.flags.has('frag_manifests')).toBe(true);
    expect(w.stage?.taken).toBe(true);
    const run = w.stage!.run!;
    expect(run.fleetN).toBe(5);
    expect(w.stage!.status).toBe('Hulls 5 of 5');
    const gate = w.bk!.lane, mid = () => run.fleet.reduce((a, h) => a + Math.hypot(h.x - gate.x, h.z - gate.z), 0) / run.fleet.length;
    const d0 = mid();
    // she keeps up with the fleet: it walks on
    for (let i = 0; i < 10 / STEP; i++) { const h = run.fleet[0]!; w.ship.x = h.x - 30; w.ship.z = h.z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 99; w.step(STEP, NO); }
    expect(mid()).toBeLessThan(d0 - 25);
  });

  it('waits for her when she falls behind', () => {
    const w = walking();
    const run = w.stage!.run!;
    const h = run.fleet[0]!;
    w.ship.x = h.x - 600; w.ship.z = h.z;
    for (let i = 0; i < 2 / STEP; i++) { w.ship.vx = w.ship.vz = 0; w.ship.invuln = 99; w.step(STEP, NO); }
    const gate = w.bk!.lane, mid = () => run.fleet.reduce((a, f) => a + Math.hypot(f.x - gate.x, f.z - gate.z), 0) / run.fleet.length;
    const d0 = mid();
    for (let i = 0; i < 10 / STEP; i++) { w.ship.vx = w.ship.vz = 0; w.ship.invuln = 99; w.step(STEP, NO); }
    // a walking fleet covers about 35 units in that time (above); a waiting one only coasts to a stop
    expect(d0 - mid()).toBeLessThan(15);
  });

  it('counts a hull lost, and still makes the lane with the rest', () => {
    const w = walking();
    const run = w.stage!.run!;
    const lost = run.fleet[0]!;
    lost.hp = 0;
    w.wreck(lost);
    for (let i = 0; i < 90 / STEP && !w.stage!.result; i++) {
      const h = run.fleet[0];
      if (h) { w.ship.x = h.x - 30; w.ship.z = h.z; w.ship.vx = w.ship.vz = 0; }
      w.ship.invuln = 99;
      w.step(STEP, NO);
      if (w.comms ?? w.call) w.answer((w.comms ?? w.call)!.def.choices[0]!.id);
    }
    expect(w.stage!.result).toBe('won');
    expect(w.flags.has('drift_walked')).toBe(true);
    expect(w.flags.has('drift_walk_cost')).toBe(true);
    expect(w.flags.has('drift_walk_whole')).toBe(false);
  });

  it('scatters the Drift when every hull is lost', () => {
    const w = walking();
    for (const h of [...w.stage!.run!.fleet]) { h.hp = 0; w.wreck(h); }
    for (let i = 0; i < 2 / STEP; i++) { w.ship.invuln = 99; w.step(STEP, NO); }
    expect(w.stage!.result).toBe('lost');
    expect(w.flags.has('drift_scattered')).toBe(true);
  });
});
