import { atPlace } from './paint';
import { describe, expect, it } from 'vitest';
import { relayOf } from '../src/sim/breakout';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { dueBeat } from '../src/sim/story';
import { regionOf } from '../src/sim/chart';
import { World } from '../src/sim/world';
import { FLOOR } from '../src/sim/floor';

// Findings from the logged pilot flights through the Reach: the hub beat before any job, the Narrows scene never skipped,
// no Calloway offer at the Narrows, no Reach beat coming back later.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

function at(col: number, seed = 5): Journey {
  const j = newJourney(seed, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= col).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'brook_free');
  j.carry.cyrite = 60;
  return j;
}

const quiet = (j: Journey) => ({ ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity });

describe('the Reach, from the pilot flights', () => {
  it('Halden: Ilse comes before the job, and her order and name follow her card', () => {
    const j = at(3);
    const w = new World(7, { mode: 'breakout', sortie: quiet(j), carry: j.carry });
    const cards: string[] = [];
    for (let i = 0; i < 180 / STEP; i++) {
      atPlace(w);
      w.ship.invuln = 1;
      w.step(STEP, NO);
      for (const e of w.events) if (e.type === 'comms') cards.push(e.id);
      w.events.length = 0;
      const open = w.comms ?? w.call;
      if (open) w.answer(open.def.id === 'story_warden' ? 'hear' : open.def.choices[0]!.id);
    }
    // Ilse sends the order itself, her account beside it: no choice to make (the owner, 31 October 2026)
    // one card a stop: Ilse names Ada on the radio after the order (owner, 23 November 2026)
    expect(cards.slice(0, 2)).toEqual(['story_order']);
  });

  it('no Reach beat comes back as a missed one past the Narrows', () => {
    const j = at(7);
    const far = j.chart.systems.find((s) => regionOf(s) === 1 && s.kind !== 'gate');
    expect(far).toBeDefined();
    j.at = far!.id;
    j.trail.push(far!.id);
    j.carry.flags.push('brook_met');
    expect(dueBeat(j)).not.toBe('story_brook_arrest');
    expect(dueBeat(j)).not.toBe('story_warden');
  });

  it('the Narrows makes no offer', () => {
    expect(sortieDef(at(7)).nemesis.offer).toBeNull();
  });

  it('the Narrows gate holds until the scene has played, then lets her go', () => {
    const j = at(7);
    j.carry.fuel = 40;
    const w = new World(5, { mode: 'breakout', sortie: { ...quiet(j), blockade: false }, carry: j.carry });
    let jumpedAt = -1;
    for (let i = 0; i < 200 / STEP; i++) {
      if (i === 5) { w.ship.x = w.bk!.lane.x; w.ship.z = w.bk!.lane.z; }
      w.ship.invuln = 99;
      w.step(STEP, NO);
      w.events.length = 0;
      if (w.comms) w.answer(w.comms.def.choices[0]!.id);
      if (jumpedAt < 0 && w.bk!.jumpT >= 0) jumpedAt = w.runTime;
    }
    expect(w.flags.has('calloway_asked')).toBe(true);
    expect(jumpedAt).toBeGreaterThan(0);
  });
});

describe('arriving in a system on the road', () => {
  it('says the scan first, and pins a job only once its call has rung', () => {
    const k = at(5);
    const def = sortieDef(k);
    const v = new World(7, { mode: 'breakout', sortie: { ...def, pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, place: null, thren: 0, calloway: Infinity }, carry: k.carry });
    const order: string[] = [];
    for (let i = 0; i < 90 / STEP; i++) {
      v.step(STEP, NO);
      for (const e of v.events) {
        if (e.type === 'storyNotice' && e.headline === 'Scanning for transmissions') order.push('scan');
        if ((e.type === 'comms' || e.type === 'call') && e.id === v.stage?.def.card) order.push('call');
      }
      v.events.length = 0;
      if (v.stage?.onScope && !order.includes('pin')) order.push('pin');
      if (v.encounter?.id === 'scene' && !order.includes('marker')) order.push('marker');
      const open = v.comms ?? v.call;
      if (open && open.def.id !== v.stage?.def.card) v.answer(open.def.choices[0]!.id);
      else if (open) v.answer(open.def.choices[0]!.id);
    }
    expect(v.stage?.def.id).toBe('pirate_toll');
    expect(order.slice(0, 2)).toEqual(['scan', 'call']);
    expect(order.indexOf('marker')).toBeGreaterThan(order.indexOf('call'));
  });
});

describe('a road gate after the Warden key', () => {
  it('says the gate is open once it opens, never a resetting notice after it', () => {
    const j = at(14);
    j.carry.fuel = 40;
    const w = new World(5, { mode: 'breakout', sortie: { ...quiet(j), blockade: false }, carry: j.carry });
    const notices: string[] = [];
    for (let i = 0; i < 240 / STEP; i++) {
      // she wakes the relay herself (sim/uplink.ts): in its ring until it is awake, then at the gate
      const rl = relayOf(w.bk!);
      if (rl && w.uplink < 1) { w.ship.x = rl.x; w.ship.z = rl.z; w.ship.vx = w.ship.vz = 0; } else if (w.uplink >= 1 && i % 60 === 0) { w.ship.x = w.bk!.lane.x; w.ship.z = w.bk!.lane.z + 60; }
      w.ship.invuln = 99;
      w.step(STEP, NO);
      for (const e of w.events) if (e.type === 'storyNotice') notices.push(e.headline);
      w.events.length = 0;
      const open = w.comms ?? w.call;
      if (open) w.answer(open.def.choices[0]!.id);
      if (w.bk!.jumpT >= 0) break;
    }
    expect(notices).toContain('Warden key accepted');
    const open = notices.indexOf('Jump Gate open');
    expect(open).toBeGreaterThan(notices.indexOf('Warden key accepted'));
    // "resetting" is told only if it is still true: once the gate is open, the waiting notice is replaced by the news
    const reset = notices.indexOf('Jump Gate resetting');
    if (reset >= 0) expect(reset).toBeLessThan(open);
  });

  it('says nothing but the scan, and opens nothing, while the arrival sweep plays', () => {
    const k = at(4);
    const v = new World(7, { mode: 'breakout', sortie: quiet(k), carry: k.carry });
    const said: Array<{ t: number; what: string }> = [];
    for (let i = 0; i < 30 / STEP; i++) {
      v.step(STEP, NO);
      for (const e of v.events) {
        if (e.type === 'storyNotice' || e.type === 'ping' || e.type === 'comms' || e.type === 'call') said.push({ t: v.runTime, what: e.type === 'storyNotice' ? e.headline : e.type });
      }
      v.events.length = 0;
      if (v.comms ?? v.call) { if (v.runTime < FLOOR.arrival) said.push({ t: v.runTime, what: 'card open' }); const o = (v.comms ?? v.call)!; v.answer(o.def.choices[0]!.id); }
    }
    const early = said.filter((x) => x.t < FLOOR.arrival);
    expect(early.map((x) => x.what)).toEqual(['Scanning for transmissions']);
    expect(said.some((x) => x.t >= FLOOR.arrival)).toBe(true);
  });
});

describe('waking a relay (the uplink, plan "Reopen the spaceways")', () => {
  it('charges in three stages only inside its ring, pauses outside, and sends a wave at each of the first two', () => {
    const j = at(14);
    j.carry.fuel = 40;
    const w = new World(5, { mode: 'breakout', sortie: { ...quiet(j), blockade: false }, carry: j.carry });
    const rl = relayOf(w.bk!)!;
    const notices: string[] = [];
    const step = (secs: number, x: number, z: number) => {
      for (let i = 0; i < Math.round(secs / STEP); i++) {
        w.ship.invuln = 99; w.ship.x = x; w.ship.z = z; w.ship.vx = w.ship.vz = 0;
        w.step(STEP, NO);
        for (const e of w.events) if (e.type === 'storyNotice') notices.push(e.headline);
        w.events.length = 0;
        const open = w.comms ?? w.call;
        if (open) w.answer(open.def.choices[0]!.id);
      }
    };
    // near the gate, outside the ring: nothing charges, and the gate waits on the relay
    step(20, w.bk!.lane.x, w.bk!.lane.z + 60);
    expect(w.uplink).toBe(0);
    expect(w.gateWhy).toBe('wake the relay');
    // in the ring for a while: the first stage, and Custody comes
    const before = w.aliens.length;
    step(15, rl.x, rl.z);
    expect(w.uplink).toBeGreaterThan(1 / 3);
    expect(notices).toContain('Relay waking');
    expect(w.aliens.length).toBeGreaterThan(before);
    // out of it: the charge holds where it was
    const held = w.uplink;
    step(5, rl.x + 200, rl.z);
    expect(w.uplink).toBeCloseTo(held, 5);
    // back in until it is awake: the second stage, then the key
    step(30, rl.x, rl.z);
    expect(notices).toContain('Relay dish turning');
    expect(w.uplink).toBe(1);
    step(15, rl.x, rl.z);
    expect(w.flags.has('relay_' + w.bk!.def.script)).toBe(true);
    expect(notices.indexOf('Warden key accepted')).toBeGreaterThan(notices.indexOf('Relay dish turning'));
  });
});
