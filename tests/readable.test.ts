import { atRelay } from './paint';
import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { guideTarget } from '../src/sim/guide';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { SCAN_LINE } from '../src/sim/floor';
import { World } from '../src/sim/world';

// Every stop readable (owner, 22 November 2026; plan "Make every stop readable"): a Reach stop is flown as a player would, at
// cruise toward whatever the HUD leads to, answering each card. Its place is near and there from the arrival, its card opens
// where she earned it (not at the gate after she flew off), and few lines come before it.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
/** Units a second the stand-in pilot flies at, after a short look round. */
const CRUISE = 25, START = 3;

function at(i: number): Journey {
  const j = newJourney(5, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= i + 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'ship_stolen', 'on_road', 'lock_lifted');
  // the first dead gate is named once a journey: past the first stop she has seen one
  if (i > 1) j.carry.flags.push('dead_gate_seen');
  if (i > 2) j.carry.flags.push('frag_order', 'clue_order_sig', 'ada_named', 'ilse_met');
  j.carry.cyrite = 60;
  j.carry.fuel = 40;
  return j;
}

function fly(i: number) {
  const j = at(i);
  const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity };
  const w = new World(j.seed * 31 + 7, { mode: 'breakout', sortie: def, carry: j.carry });
  const place = { at: -1, dist: -1, done: -1 };
  let card = -1, cardGate = Infinity;
  for (let k = 0; k < 150 / STEP && w.phase !== 'over'; k++) {
    if (w.comms) { if (card < 0) { card = w.runTime; cardGate = Math.hypot(w.bk!.lane.x - w.ship.x, w.bk!.lane.z - w.ship.z); } w.answer(w.comms.def.choices[0]!.id); continue; }
    if (w.call) { w.answer(0); continue; }
    const sp = w.storyPlace;
    if (sp && place.at < 0) { place.at = w.runTime; place.dist = Math.hypot(sp.x - w.ship.x, sp.z - w.ship.z); }
    if (place.at >= 0 && place.done < 0 && !sp) place.done = w.runTime;
    // a relay's twist is dealt with as a player would: the rock mined away, the picket driven off (tests/paint.ts)
    if (w.uplinkBlock) atRelay(w);
    const g = guideTarget(w);
    if (g && w.runTime > START) {
      const d = Math.hypot(g.x - w.ship.x, g.z - w.ship.z);
      if (d > g.r * 0.5) { const v = Math.min(CRUISE * STEP, d); w.ship.x += ((g.x - w.ship.x) / d) * v; w.ship.z += ((g.z - w.ship.z) / d) * v; }
    }
    w.ship.invuln = 99;
    w.step(STEP, NO);
    w.events.length = 0;
  }
  const log = w.floor.log;
  // the payoff: the stop's card, or at a relay stop the relay waking under her (spaceways plan, step 4)
  const firstCard = log.findIndex((l) => l.kind === 'moment' || (l.kind === 'signal' && l.id === 'Relay waking'));
  const before = (firstCard < 0 ? log : log.slice(0, firstCard)).filter((l) => (l.kind === 'voice' || l.kind === 'signal') && l.id !== SCAN_LINE);
  return { place, card, cardGate, before, lane: Math.hypot(w.bk!.lane.x, w.bk!.lane.z) };
}

describe('every Reach stop reads', () => {
  for (const [i, name] of [[2, 'Halden’s Reach'], [3, 'Tallyhouse']] as const) {
    it(`${name}: the place is there from the arrival, close and on her way, and its card opens there`, () => {
      const r = fly(i);
      expect(r.place.at).toBeLessThan(1);
      expect(r.place.dist).toBeLessThan(250);
      expect(r.card).toBeGreaterThan(0);
      // the card comes as she finishes at the place, not when she has flown on to the gate
      // (a hull comes alongside within the arrival's quiet, so its card may wait for that to end)
      expect(r.card - r.place.done).toBeLessThan(8);
      expect(r.cardGate).toBeGreaterThan(r.lane * 0.5);
    });
  }

  for (let i = 1; i <= 5; i++) {
    it(`stop ${i}: four lines or fewer before its payoff`, () => {
      expect(fly(i).before.length).toBeLessThanOrEqual(4);
    });
  }
});

// Every stop on the road (23 November 2026): a call that is only waiting its turn opens on its own as she comes to the gate; the gate
// says "holding" (then "open") round it only where a scene really keeps her there: a handshake, a reboot, the Slow Door, a moot, the end.
describe('a gate that waits on a call', () => {
  /** Stops whose gate holds her for a scene, by design (the Reach's relays since the spaceways plan's step 4). */
  const SCENES = new Set(['halden', 'marlow', 'branford', 'copperline', 'narrows', 'm_kessel', 'b_kessler', 'd_lantern', 'rift', 'slowdoor', 'breaker', 'f_gilt', 'seam', 'l_wane']);
  it('only says it is holding at a scene stop', () => {
    const told: string[] = [];
    const n = newJourney(5, false, 'road').chart.systems.length;
    for (let i = 2; i < n; i++) {
      const j = newJourney(5, false, 'road');
      const line = [...j.chart.systems].sort((a, b) => a.col - b.col);
      j.trail = line.slice(0, i + 1).map((s) => s.id); j.at = line[i]!.id; j.status = 'sortie'; j.dest = null;
      j.carry.flags.push('archive_woke', 'ship_stolen', 'on_road', 'lock_lifted', 'dead_gate_seen'); j.carry.cyrite = 60; j.carry.fuel = 60;
      const w = new World(j.seed * 31 + 7, { mode: 'breakout', sortie: { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
      for (let k = 0; k < 120 / STEP && w.phase !== 'over' && w.bk!.jumpT < 0; k++) {
        if (w.comms) { const c = w.comms; w.answer(c.def.choices[0]!.id); if (w.comms === c) break; continue; }
        if (w.call) { w.answer(0); continue; }
        const g = guideTarget(w);
        if (g && w.runTime > START) { const d = Math.hypot(g.x - w.ship.x, g.z - w.ship.z); if (d > g.r * 0.5) { const v = Math.min(CRUISE * STEP, d); w.ship.x += (g.x - w.ship.x) / d * v; w.ship.z += (g.z - w.ship.z) / d * v; } }
        w.ship.invuln = 99; w.step(STEP, NO); w.events.length = 0;
      }
      if (w.floor.log.some((l) => l.kind === 'signal' && l.id === 'Jump Gate holding')) told.push(w.bk!.def.script ?? '');
    }
    expect(told.filter((s) => !SCENES.has(s))).toEqual([]);
  }, 60000);
});
