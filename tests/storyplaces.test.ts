import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { STORY_PLACES } from '../src/content/script/places';
import { SCRIPT } from '../src/content/script';
import { livePlace, meets, placeAt, stepPlace, PICK_R, HOLD_SLOW, ON_LINE, TRAIL_R, type StoryPlaceDef } from '../src/sim/places';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { guideTarget } from '../src/sim/guide';
import { goalOf } from '../src/sim/goal';
import { World } from '../src/sim/world';
import { t } from '../src/i18n';
import { LEGS } from '../src/content/road';
import { Script } from '../src/sim/script';

// Story places (sim/places.ts, owner 2026-11-21): each beat happens somewhere she can see, and she does something there.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
const hold = (over: Partial<StoryPlaceDef> = {}): StoryPlaceDef => ({ id: 'p', stop: 's', name: 'A skiff', look: 'skiff', along: 60, off: -100, act: { hold: 4 }, r: 10, done: 'p_done', verb: 'Hold', ...over });

describe('a story place, as data', () => {
  it('stands on her line to the gate, close enough that flying at the gate passes through it, and every one names a stop and a row that waits on it', () => {
    // owner, 23 November 2026: "far away, out of the direction of the game": a fixed place is between her and the gate
    const gate = { kind: 'lane', name: 'Jump Gate', x: 600, z: 0, r: 30 } as const;
    const at = placeAt(hold({ look: 'wreck', act: { pass: true }, r: 20 }), { lane: gate });
    expect(at.x).toBeGreaterThanOrEqual(ON_LINE[0]);
    expect(at.x).toBeLessThanOrEqual(ON_LINE[1]);
    expect(Math.abs(at.z)).toBeLessThan(20);
    // never past half the way to a short lane's gate
    expect(placeAt(hold(), { lane: { ...gate, x: 200 } }).x).toBeCloseTo(100);
    for (const p of STORY_PLACES) {
      const a = placeAt(p, { lane: gate });
      expect(a.x, p.id).toBeGreaterThan(0);
      expect(Math.abs(a.z), p.id).toBeLessThan(p.trail ? TRAIL_R : Math.max(8, p.r * 0.5) + 0.01);
    }
    const ids = new Set(STORY_PLACES.map((p) => p.id));
    expect(ids.size).toBe(STORY_PLACES.length);
    for (const p of STORY_PLACES) {
      // a row of its own stop plays when it is done, and a pickup is shown only after the line that points to it
      expect(SCRIPT.some((r) => r.on.on === 'place' && r.on.place === p.id && r.stop === p.stop), p.id).toBe(true);
      if (p.after) expect(SCRIPT.some((r) => r.id === p.after), p.id).toBe(true);
      expect(t(p.name), p.id).not.toBe('');
    }
  });

  it('every one stands at a stop on the road, and a meeting there waits on it, not on a clock', () => {
    const stops = new Set(LEGS.flat().map((s) => s.script));
    for (const p of STORY_PLACES) expect(stops.has(p.stop) || ['halden', 'marlow', 'vesta'].includes(p.stop), p.id).toBe(true);
    for (const id of ['walk_saffi', 'bk_kessler', 'bn_kesh', 'bt_tarik', 'df_ossie', 'dn_agent', 'yn_anand', 'fm_mirren', 'hc_two', 'lg_oren', 'ld_oren', 'ls_oren'])
      expect(SCRIPT.find((r) => r.id === id)?.on.on, id).toBe('place');
  });

  it('is not shown again once its beat has played (a reload at the stop)', () => {
    const p = STORY_PLACES.find((x) => x.id === 'bk_aster')!;
    expect(livePlace(STORY_PLACES, 'b_kessler', new Set(), () => true, (id) => new Script(SCRIPT, 'b_kessler', new Set()).placeSpent(id))?.id).toBe(p.id);
    const sc = new Script(SCRIPT, 'b_kessler', new Set(['bk_kessler']));
    expect(sc.placeSpent('bk_aster')).toBe(true);
    expect(livePlace(STORY_PLACES, 'b_kessler', new Set(), () => true, (id) => sc.placeSpent(id))).toBeNull();
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

  it('a hull alongside counts at any speed inside the ring, and slips back slowly outside it; a pickup comes aboard on contact', () => {
    const p = hold(), at = { x: 0, z: 0 };
    expect(meets(p)).toBe(true);
    let h = 0;
    for (let i = 0; i < 60; i++) h = stepPlace(p, at, { x: 2, z: 0, vx: HOLD_SLOW * 4, vz: 0 }, h, STEP, true).hold;
    expect(h).toBeCloseTo(1, 1);
    expect(stepPlace(p, at, { x: 2, z: 0, vx: 0, vz: 0 }, h, 1, false).hold).toBeCloseTo(h - 0.5);
    expect(stepPlace(p, at, { x: 30, z: 0, vx: 0, vz: 0 }, h, 1, true).hold).toBeCloseTo(h - 0.5);
    expect(stepPlace(p, at, { x: 0, z: 0, vx: 0, vz: 0 }, 3.99, 0.02, true).done).toBe(true);
    const pick = hold({ act: { pickup: true } });
    expect(stepPlace(pick, at, { x: PICK_R + 1, z: 0, vx: 0, vz: 0 }, 0, STEP, true).done).toBe(false);
    expect(stepPlace(pick, at, { x: PICK_R - 1, z: 0, vx: 20, vz: 0 }, 0, STEP, true).done).toBe(true);
    // a work order on a trail comes aboard as she flies near it
    expect(stepPlace(hold({ act: { pickup: true }, trail: true }), at, { x: TRAIL_R - 1, z: 0, vx: 20, vz: 0 }, 0, STEP, true).done).toBe(true);
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
    expect(goalOf(w).goal).toBe('Ilse’s skiff is coming alongside');
    expect(w.seenPlaces().some((p) => p.kind === 'story')).toBe(true);
    // short of the gate before the skiff reaches her: it is shut, and says for what
    const b = w.bk!;
    const run = (secs: number, f: () => void = () => {}) => { for (let i = 0; i < Math.round(secs / STEP); i++) { w.ship.invuln = 1; f(); w.step(STEP, NO); w.events.length = 0; if (w.comms) w.answer(w.comms.def.choices[0]!.id); } };
    run(2, () => { w.ship.x = b.lane.x - 200; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0; });
    expect(w.gateWhy).toBe('{who} first');
    expect(w.gateWho).toBe('Ilse’s skiff');
    expect(w.flags.has('frag_order')).toBe(false);
    // she flies on, and the skiff comes to her: it pulls alongside, the ring fills, and her card opens
    const cards: string[] = [];
    let held = 0;
    for (let i = 0; i < Math.round(40 / STEP) && !w.comms; i++) {
      w.ship.invuln = 1; w.ship.x = 0; w.ship.z = -i * STEP * 8; w.ship.vx = 0; w.ship.vz = -8; w.ship.heading = Math.PI / 2;
      w.step(STEP, NO);
      held = Math.max(held, w.storyPlace?.held ?? 1);
      w.events.length = 0;
    }
    expect(held).toBeGreaterThan(0.5);
    expect(w.flags.has('ilse_met')).toBe(true);
    if (w.comms) { cards.push(w.comms.def.id); w.answer(w.comms.def.choices[0]!.id); }
    expect(cards).toEqual(['story_order']);
    // the canister comes across after her line about it, on its own, and comes aboard
    let canister = false, aboard = false;
    for (let i = 0; i < Math.round(60 / STEP) && !aboard; i++) {
      w.ship.invuln = 1; w.ship.vx = w.ship.vz = 0;
      if (w.storyPlace?.def.id === 'hr_paper') canister = true;
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

describe('the road past the Narrows, in its places', () => {
  // each meeting: a hull comes alongside her wherever she is; a wreck or a light waits until she flies by
  for (const [stop, card, flags] of [['b_kessler', 'story_salvor', []], ['d_ferry', 'story_ferry', []], ['b_kiln', 'story_kesh', ['broker']], ['l_gap', 'story_oren_who', []]] as const) {
    it(`${stop}: ${card} comes once the meeting is made`, () => {
      const j = halden();
      j.carry.flags.push(...flags);
      const w = new World(7, { mode: 'breakout', sortie: { ...sortieDef(j), script: stop, pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
      const sp = w.storyPlace!;
      expect(sp.def.stop).toBe(stop);
      const seen: string[] = [];
      const step = (secs: number, at: { x: number; z: number }) => {
        for (let i = 0; i < Math.round(secs / STEP); i++) {
          w.ship.invuln = 1; w.ship.x = at.x; w.ship.z = at.z; w.ship.vx = w.ship.vz = 0;
          w.step(STEP, NO); w.events.length = 0;
          if (w.comms) { const c = w.comms.def.choices; seen.push(w.comms.def.id); w.answer(c[c.length - 1]!.id); }
        }
      };
      if (meets(sp.def)) {
        // a hull comes to her: she need not move
        step(40, { x: 0, z: 0 });
        expect(seen).toContain(card);
      } else {
        step(40, { x: 0, z: 0 });
        expect(seen).not.toContain(card);
        step(30, { x: sp.x + 3, z: sp.z });
        expect(seen).toContain(card);
      }
      expect(w.storyPlace?.def.id).not.toBe(sp.def.id);
    });
  }
});
