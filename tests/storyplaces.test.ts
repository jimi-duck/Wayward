import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { STORY_PLACES } from '../src/content/script/places';
import { SCRIPT } from '../src/content/script';
import { livePlace, placeAt, stepPlace, PICK_R, HOLD_SLOW, type StoryPlaceDef } from '../src/sim/places';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { guideTarget } from '../src/sim/guide';
import { goalOf } from '../src/sim/goal';
import { World } from '../src/sim/world';
import { t } from '../src/i18n';

// Story places (sim/places.ts, owner 2026-11-21): each beat happens somewhere she can see, and she does something there.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
const hold = (over: Partial<StoryPlaceDef> = {}): StoryPlaceDef => ({ id: 'p', stop: 's', name: 'A skiff', look: 'skiff', along: 0.5, off: -100, act: { hold: 4 }, r: 10, done: 'p_done', verb: 'Hold', ...over });

describe('a story place, as data', () => {
  it('stands along the course, off to the side, and every one names a stop and a row that waits on it', () => {
    const at = placeAt(hold(), { lane: { kind: 'lane', name: 'Jump Gate', x: 1000, z: 0, r: 30 } });
    expect(at.x).toBeCloseTo(500);
    expect(Math.abs(at.z)).toBeCloseTo(100);
    const ids = new Set(STORY_PLACES.map((p) => p.id));
    expect(ids.size).toBe(STORY_PLACES.length);
    for (const p of STORY_PLACES) {
      // a row of its own stop plays when it is done, and a pickup is shown only after the line that points to it
      expect(SCRIPT.some((r) => r.on.on === 'place' && r.on.place === p.id && r.stop === p.stop), p.id).toBe(true);
      if (p.after) expect(SCRIPT.some((r) => r.id === p.after), p.id).toBe(true);
      expect(t(p.name), p.id).not.toBe('');
    }
  });

  it('shows one at a time: the first not done, once its flag and its line have come, and never one the beat came round', () => {
    const a = hold({ id: 'a', done: 'a_done' }), b = hold({ id: 'b', done: 'b_done', show: 'a_done', after: 'line' });
    const c = hold({ id: 'c', done: 'c_done', skip: ['other'] });
    expect(livePlace([a, b], 's', new Set())?.id).toBe('a');
    expect(livePlace([a, b], 's', new Set(['a_done']), () => false)).toBeNull();
    expect(livePlace([a, b], 's', new Set(['a_done']), () => true)?.id).toBe('b');
    expect(livePlace([c], 's', new Set(['other']))).toBeNull();
    expect(livePlace([a], 'elsewhere', new Set())).toBeNull();
  });

  it('a hold counts only inside the ring, slow and free, and slips back slowly outside it; a pickup comes aboard on contact', () => {
    const p = hold(), at = { x: 0, z: 0 };
    let h = 0;
    for (let i = 0; i < 60; i++) h = stepPlace(p, at, { x: 2, z: 0, vx: 0, vz: 0 }, h, STEP, true).hold;
    expect(h).toBeCloseTo(1, 1);
    expect(stepPlace(p, at, { x: 2, z: 0, vx: HOLD_SLOW * 2, vz: 0 }, h, 1, true).hold).toBeCloseTo(h - 0.5);
    expect(stepPlace(p, at, { x: 2, z: 0, vx: 0, vz: 0 }, h, 1, false).hold).toBeCloseTo(h - 0.5);
    expect(stepPlace(p, at, { x: 30, z: 0, vx: 0, vz: 0 }, h, 1, true).hold).toBeCloseTo(h - 0.5);
    expect(stepPlace(p, at, { x: 0, z: 0, vx: 0, vz: 0 }, 3.99, 0.02, true).done).toBe(true);
    const pick = hold({ act: { pickup: true } });
    expect(stepPlace(pick, at, { x: PICK_R + 1, z: 0, vx: 0, vz: 0 }, 0, STEP, true).done).toBe(false);
    expect(stepPlace(pick, at, { x: PICK_R - 1, z: 0, vx: 20, vz: 0 }, 0, STEP, true).done).toBe(true);
  });
});

/** A road journey standing at Halden's Reach, the archive read. */
function halden(): Journey {
  const j = newJourney(5, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= 3).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke');
  return j;
}

describe('Halden’s Reach, in its places', () => {
  it('Ilse’s skiff is the course and the goal; the gate waits on it and names it; held alongside, her card comes, then the canister', () => {
    const j = halden();
    const w = new World(7, { mode: 'breakout', sortie: { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
    expect(w.bk!.def.script).toBe('halden');
    const sp = w.storyPlace!;
    expect(sp.def.id).toBe('hr_skiff');
    expect(guideTarget(w)).toMatchObject({ kind: 'story', name: 'Ilse’s skiff' });
    expect(goalOf(w).goal).toBe('Hold alongside Ilse’s skiff');
    expect(w.seenPlaces().some((p) => p.kind === 'story')).toBe(true);
    // waiting short of the gate: it is shut, and says for what, for as long as it takes
    const b = w.bk!;
    const run = (secs: number, f: () => void = () => {}) => { for (let i = 0; i < Math.round(secs / STEP); i++) { w.ship.invuln = 1; f(); w.step(STEP, NO); w.events.length = 0; if (w.comms) w.answer(w.comms.def.choices[0]!.id); } };
    run(200, () => { w.ship.x = b.lane.x - 200; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0; });
    expect(w.gateWhy).toBe('{who} first');
    expect(w.gateWho).toBe('Ilse’s skiff');
    expect(w.flags.has('frag_order')).toBe(false);
    // alongside: the ring fills, and her card opens
    const cards: string[] = [];
    let held = 0;
    for (let i = 0; i < Math.round(30 / STEP) && !w.comms; i++) {
      w.ship.invuln = 1; w.ship.x = sp.x + 4; w.ship.z = sp.z; w.ship.vx = w.ship.vz = 0;
      w.step(STEP, NO);
      held = Math.max(held, w.storyPlace?.held ?? 1);
      w.events.length = 0;
    }
    expect(held).toBeGreaterThan(0.5);
    expect(w.flags.has('ilse_met')).toBe(true);
    if (w.comms) { cards.push(w.comms.def.id); w.answer(w.comms.def.choices[0]!.id); }
    expect(cards).toEqual(['story_order']);
    // the canister comes after her line about it, and comes aboard when she flies over it
    let canister = false, aboard = false;
    for (let i = 0; i < Math.round(60 / STEP) && !aboard; i++) {
      w.ship.invuln = 1;
      const p = w.storyPlace;
      if (p?.def.id === 'hr_paper') { canister = true; w.ship.x = p.x; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0; }
      w.step(STEP, NO);
      for (const e of w.events) if (e.type === 'placeDone' && e.pickup) aboard = true;
      w.events.length = 0;
      if (w.comms) w.answer(w.comms.def.choices[0]!.id);
    }
    expect(canister).toBe(true);
    expect(aboard).toBe(true);
    expect(w.flags.has('order_aboard')).toBe(true);
    // and the gate lets her go once the paper's line has played
    run(60, () => { w.ship.x = b.lane.x - 200; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0; });
    expect(w.gateWhy).not.toBe('{who} first');
  });
});
