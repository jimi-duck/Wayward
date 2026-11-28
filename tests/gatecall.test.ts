import { atPlace, atRelay } from './paint';
import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { t } from '../src/i18n';

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
// (the later legs are laid down when she gets there; the audit dock's system plays the opening, not a stop's gate)
const NAMES = LEGS.flat().filter((r) => r.script !== 'audit').map((r) => r.name).filter((n): n is string => !!n && CHART.has(n));

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
      // a relay to wake (sim/uplink.ts): she sits in its ring until it is awake
      if (w.gateWhy === 'wake the relay' || w.gateWhy === 'reach the relay mast') atRelay(w);
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

  it('never holds her for a call, a reset or the radio: only a relay or a place keeps a gate shut (owner, 28 November 2026)', () => {
    for (const name of ['Stillwater', 'Kessel Hold']) {
      const j = at(name);
      const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity };
      const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
      for (let i = 0; i < Math.round(120 / STEP) && w.phase !== 'over'; i++) {
        w.ship.invuln = 99;
        w.step(STEP, NO_INPUT);
        w.events.length = 0;
        if (w.comms) w.answer(w.comms.def.choices[0]!.id);
        expect(w.gateWhy).not.toMatch(/call|hostiles|hold still|resetting|radio/);
      }
    }
  }, 60000);
});
