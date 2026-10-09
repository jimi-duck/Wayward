import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CAPTAINS, PERSONALITIES } from '../src/content/captains';
import { NOTICE } from '../src/content/factions';
import { HOME, type SortieDef } from '../src/sim/breakout';
import { CAPTAIN_BY_ID, captainCard, form, meet, newMemory, turnsAway, RUN_LEARN, type CaptainMemory } from '../src/sim/captains';
import { QUIET } from '../src/sim/notice';
import { Rng } from '../src/sim/rng';
import { cy } from '../src/sim/purse';
import { World } from '../src/sim/world';
import { faceSvg } from '../src/ui/face';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) { w.ship.invuln = 1; w.step(STEP, input()); } };
const bolt = (x: number, y: number, z: number) => ({ x, y, z, vx: 0, vy: 0, vz: 0, life: 1, dmg: 1.4, pierce: 0, hit: [], homing: 0 });

/** A memory with these meetings behind it. */
const mem = (id: string, m: Partial<CaptainMemory> = {}): CaptainMemory => ({ ...newMemory(id), ...m });

/** A quiet sortie (no rock, no pursuit, no chance cards) with this captain finding you `at` seconds in. */
function withCaptain(id: string, m: Partial<CaptainMemory> = {}, at = 3, seed = 5): World {
  const def = CAPTAIN_BY_ID[id]!, memory = mem(id, m);
  const sortie: SortieDef = { ...HOME, home: false, notice: { ...QUIET, captain: { id, faction: def.faction, name: def.name, ship: form(def, memory).ship, at, memory } } };
  const w = new World(seed, { mode: 'breakout', sortie });
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  w.bk!.nextPursuit = Infinity;
  w.cardNext = Infinity;
  return w;
}

describe('named captains: who they are', () => {
  it('are each a name, a face, a ship, a personality and every line their memory needs', () => {
    expect(new Set(CAPTAINS.map((c) => c.id)).size).toBe(CAPTAINS.length);
    for (const c of CAPTAINS) {
      expect(PERSONALITIES[c.personality], c.id).toBeDefined();
      // on a faction's file, flying that faction's ship
      expect(NOTICE[c.faction].captains, c.id).toContain(c.id);
      for (const k of ['won', 'scarred', 'escaped', 'evaded', 'bargained', 'left'] as const) expect(c.lines.back[k], `${c.id} ${k}`).toBeTruthy();
      expect(c.lines.hail && c.lines.ambush && c.lines.leave).toBeTruthy();
      if (PERSONALITIES[c.personality].fee !== null) expect(c.lines.bargain).toContain('{fee}');
    }
  });

  it('draw a face, with a line for every scar', () => {
    const f = CAPTAINS[0]!.face;
    const clean = faceSvg(f, '#f00', 0), scarred = faceSvg(f, '#f00', 2);
    expect(clean.startsWith('<svg')).toBe(true);
    expect((scarred.match(/#ff5a4e/g) ?? []).length).toBe(2);
    expect(clean).not.toContain('#ff5a4e');
  });
});

describe('named captains: how they come', () => {
  it('announce or ambush by personality, and bargain only if they deal', () => {
    const kade = captainCard(CAPTAIN_BY_ID.kade!, mem('kade'), 5, 5);
    expect(kade.slow).toBeUndefined();
    expect(kade.choices.map((c) => c.id)).toEqual(['fight', 'run', 'pay', 'stare']);
    expect(kade.text).toContain(CAPTAIN_BY_ID.kade!.lines.hail);
    const vex = captainCard(CAPTAIN_BY_ID.vex!, mem('vex'), 5, 5);
    expect(vex.slow?.default).toBe('fight');
    expect(vex.choices.map((c) => c.id)).toEqual(['fight', 'run']);
    const sorensen = captainCard(CAPTAIN_BY_ID.sorensen!, mem('sorensen'), 50, 5);
    expect(sorensen.choices.some((c) => c.id === 'pay' || c.id === 'stare')).toBe(false);
  });

  it('may turn away from a ship that outguns them, if they have little nerve', () => {
    const def = CAPTAIN_BY_ID.ashgrove!, rng = new Rng(3);
    let left = 0;
    for (let i = 0; i < 200; i++) if (turnsAway(def, mem('ashgrove'), 20, 5, rng)) left++;
    expect(left).toBeGreaterThan(40);
    for (let i = 0; i < 50; i++) expect(turnsAway(def, mem('ashgrove'), 3, 5, rng)).toBe(false);
    // a zealot never does
    for (let i = 0; i < 50; i++) expect(turnsAway(CAPTAIN_BY_ID.sorensen!, mem('sorensen'), 50, 5, rng)).toBe(false);
  });

  it('come back changed by what happened last time', () => {
    const kade = CAPTAIN_BY_ID.kade!;
    const fresh = form(kade, mem('kade'));
    // you broke their ship and they lived: a grudge
    const scarred = form(kade, mem('kade', { met: 1, scarred: 1, last: 'scarred' }));
    expect(scarred.approach).toBe('ambush');
    expect(scarred.fee).toBeNull();
    expect(scarred.hp).toBeGreaterThan(fresh.hp);
    expect(scarred.wing).toBeGreaterThan(fresh.wing);
    expect(scarred.ship).toBe('Ironmaw MK2');
    // you paid: the price goes up
    expect(form(kade, mem('kade', { met: 1, bargained: 1 })).fee!).toBeGreaterThan(fresh.fee!);
    // you ran: it works less
    expect(form(kade, mem('kade', { met: 2, evaded: 2 })).run).toBeCloseTo(fresh.run - 2 * RUN_LEARN);
    // they wrecked you, or turned away once: they will not be stared down
    expect(form(kade, mem('kade', { met: 1, won: 1 })).nerve).toBe(Infinity);
    expect(form(kade, mem('kade', { met: 1, left: 1 })).nerve).toBe(Infinity);
    // and they say so
    const back = captainCard(kade, mem('kade', { met: 1, bargained: 1, last: 'bargained' }), 5, 5);
    expect(back.text).toContain(kade.lines.back.bargained);
    expect(back.title).toBe('Brannoch Kade again');
  });
});

describe('named captains: memory', () => {
  it('remembers each meeting, and a beaten ship is a scar or a death', () => {
    const m = mem('kade');
    expect(meet(m, 'bargained', 3, new Rng(1))).toBe('bargained');
    expect(m).toMatchObject({ met: 1, bargained: 1, last: 'bargained', lastDay: 3, dead: false });
    const outcomes = new Set<string>();
    for (let s = 1; s < 40; s++) outcomes.add(meet(mem('sorensen'), 'beaten', 1, new Rng(s)));
    expect(outcomes).toEqual(new Set(['scarred', 'killed']));
  });
});

describe('named captains in a sortie', () => {
  it('open a channel with their face, and a fight is the capital ship under their name', () => {
    const w = withCaptain('kade');
    run(w, 3.2);
    expect(w.phase).toBe('comms');
    expect(w.comms!.def.id).toBe('captain:kade');
    expect(w.comms!.def.face).toEqual(CAPTAIN_BY_ID.kade!.face);
    expect(w.answer('fight')).toBe(true);
    run(w, 4);
    expect(w.command.state).toBe('fight');
    const b = w.command.boss!;
    expect(b.name).toBe('Ironmaw');
    expect(b.faction).toBe('gutter');
    // break the ship
    for (let i = 0; i < 40 && b.arriving; i++) run(w, 0.5);
    b.hp = 0.5;
    w.bolts.push(bolt(b.x, b.y, b.z));
    w.step(STEP, input());
    expect(w.command.boss).toBeNull();
    expect(w.result().captain).toEqual({ id: 'kade', report: 'beaten' });
  });

  it('take a payment and stand off, and the bargain is remembered', () => {
    const w = withCaptain('kade');
    w.chits = 200;
    run(w, 3.2);
    const fee = w.comms!.fee;
    expect(fee).toBe(cy(PERSONALITIES.broker.fee!));
    w.answer('pay');
    expect(w.chits).toBe(200 - fee);
    run(w, 4);
    expect(w.command.state).toBe('idle');
    expect(w.result().captain).toEqual({ id: 'kade', report: 'bargained' });
  });

  it('ambush: the world slows, and doing nothing means a fight', () => {
    const w = withCaptain('vex');
    run(w, 3.2);
    expect(w.comms!.def.id).toBe('captain:vex');
    expect(w.comms!.slow).toBeGreaterThan(0);
    run(w, 40);
    expect(w.phase).not.toBe('comms');
    expect(['warning', 'fight']).toContain(w.command.state);
  });

  it('a fight that runs its fuse out is an escape; one still on when the sortie ends short of the lane is theirs', () => {
    const w = withCaptain('sorensen');
    run(w, 3.2);
    w.answer('fight');
    run(w, 4);
    const b = w.command.boss!;
    b.fuse = 0.1;
    b.arriving = false;
    for (let i = 0; i < 60 && w.command.boss; i++) run(w, 0.5);
    expect(w.command.boss).toBeNull();
    expect(w.result().captain).toEqual({ id: 'sorensen', report: 'escaped' });
    const lost = withCaptain('sorensen');
    run(lost, 3.2);
    lost.answer('fight');
    run(lost, 2);
    expect(lost.result().captain).toEqual({ id: 'sorensen', report: 'won' });
  });

  it('are not met, and not remembered, if the sortie ends before they find you', () => {
    const w = withCaptain('kade', {}, 500);
    run(w, 2);
    expect(w.result().captain).toBeNull();
  });
});
