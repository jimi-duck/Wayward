import { atPlace } from './paint';
import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { t } from '../src/i18n';
import { readFileSync } from 'node:fs';

// A shut Jump Gate always says why, and what to do: never a bare "a call is coming in".

const NO_INPUT = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/** A road journey standing at a named stop, the ship parked at the gate. */
function at(name: string, seed = 5) {
  const j = newJourney(seed, false, 'road');
  const s = j.chart.systems.find((x) => x.name === name)!;
  expect(s).toBeTruthy();
  const line = j.chart.systems.filter((x) => x.col >= 1 && x.col < s.col).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((x) => x.id), s.id];
  j.at = s.id;
  j.status = 'sortie';
  j.dest = null;
  return j;
}

import { LEGS } from '../src/content/road';
const CHART = new Set(newJourney(5, false, 'road').chart.systems.map((x) => x.name));
// (the later legs are laid down when she gets there)
const NAMES = LEGS.flat().map((r) => r.name).filter((n): n is string => !!n && CHART.has(n));

describe('a shut Jump Gate', () => {
  it.each(NAMES)('%s: names the caller and the blocker, then opens once the call is answered', (name) => {
    const j = at(name);
    const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity };
    const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
    const whys = new Set<string>();
    let opened = -1, shut = false;
    for (let i = 0; i < Math.round(300 / STEP); i++) {
      w.ship.invuln = 99;
      if (i === Math.round(40 / STEP)) { w.ship.x = w.bk!.lane.x - 300; w.ship.z = w.bk!.lane.z; }
      // a gate that names a story place: she goes there, as a player would (sim/places.ts)
      if (w.gateWhy === '{who} first') atPlace(w);
      w.step(STEP, NO_INPUT);
      w.events.length = 0;
      if (w.gateWhy) { whys.add(w.gateWhy); shut = true; }
      if (w.comms) { for (const c of w.comms.def.choices) { if (!w.comms) break; w.answer(c.id); } }
      if (shut && !w.gateWhy && opened < 0) { opened = w.runTime; break; }
    }
    for (const why of whys) expect(why).not.toBe('a call is coming in');
    // a gate that shut has opened again by the end, and everything it said was a reason she can act on
    if (shut) expect(opened).toBeGreaterThan(0);
    for (const why of whys) expect(t(why, { who: 'X' })).not.toMatch(/\{who\}/);
  }, 60000);

  it('says to clear the hostiles while one keeps the call from coming, counts down, and lets her go short of the ring', () => {
    const j = at('Kessel Hold');
    const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity };
    const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
    const seen = new Set<string>();
    let eta = 0, open = -1;
    for (let i = 0; i < Math.round(240 / STEP); i++) {
      w.ship.invuln = 99;
      // she waits 700 units short of the gate, as a player who stops to see what happens would
      if (i === Math.round(40 / STEP)) { w.ship.x = w.bk!.lane.x - 700; w.ship.z = w.bk!.lane.z; w.ship.vx = 0; w.ship.vz = 0; }
      // a hostile hangs about her the whole time
      if (i > Math.round(40 / STEP) && i % 60 === 0 && !w.aliens.some((a) => !a.fleeing && Math.hypot(a.x - w.ship.x, a.z - w.ship.z) < 120)) {
        (w as unknown as { applyOutcome(o: object, n: number, c: unknown[]): number[] }).applyOutcome({ text: '', spawn: [{ variant: 'picket', n: 1, from: 'ahead' }] }, 0, []);
        for (const a of w.aliens) { a.x = w.ship.x + 60; a.z = w.ship.z; a.hp = 1e6; }
      }
      w.step(STEP, NO_INPUT);
      w.events.length = 0;
      if (w.gateWhy) seen.add(w.gateWhy);
      if (w.gateWhy) eta = Math.max(eta, w.gateEta);
      if (w.comms) w.answer(w.comms.def.choices[0]!.id);
      if (i > Math.round(41 / STEP) && !w.gateWhy && open < 0) open = w.runTime;
    }
    expect([...seen].some((x) => x.startsWith('clear the hostiles'))).toBe(true);
    // the wait has an end the HUD shows, and it ends
    expect(eta).toBeGreaterThan(60);
    expect(open).toBeGreaterThan(40);
    expect(open).toBeLessThan(40 + 95);
  }, 60000);

  it('brings the call to her at the gate even with a job taken (a taken job used to keep it away for good)', () => {
    // a journey the pilot flew to Kessel Hold (tools/road.pilot.ts style), saved as it arrived
    const j = JSON.parse(readFileSync(new URL('./fixtures/road-kessel.json', import.meta.url), 'utf8'));
    const def = sortieDef(j);
    const w = new World(5000, { mode: 'breakout', sortie: def, carry: j.carry });
    const W = w as unknown as { call: { choices: unknown[] } | null; stage?: { taken: boolean } };
    let took = false, moot = -1, open = -1;
    for (let i = 0; i < Math.round(240 / STEP); i++) {
      w.ship.invuln = 99;
      if (i === Math.round(40 / STEP)) { w.ship.x = w.bk!.lane.x - 860; w.ship.z = w.bk!.lane.z; w.ship.vx = 0; w.ship.vz = 0; }
      // nothing hostile comes near her: the call has nothing to wait for but the job
      for (const a of w.aliens) if (Math.hypot(a.x - w.ship.x, a.z - w.ship.z) < 400) { a.x = w.ship.x + 3000; a.z = w.ship.z + 3000; }
      w.step(STEP, NO_INPUT);
      w.events.length = 0;
      if (W.call) { w.answer(0); }
      took = took || !!W.stage?.taken;
      if (w.comms) { if (w.comms.def.id === 'story_moot' && moot < 0) moot = w.runTime; w.answer(w.comms.def.choices[0]!.id); }
      if (i > Math.round(41 / STEP) && !w.gateWhy && open < 0) open = w.runTime;
    }
    expect(took).toBe(true);
    expect(moot).toBeGreaterThan(0);
    // the call came while the gate was still holding for it, not after the hold ran out
    expect(moot).toBeLessThan(40 + 90);
    expect(open).toBeGreaterThanOrEqual(moot);
  }, 60000);
});
