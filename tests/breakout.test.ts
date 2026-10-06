import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import {
  HEAT_START, JUMP_COST, LANE_DIST, PATCH_COST, PATCH_QUIET, PATCH_TIME, PRICE, PURSUIT_FIRST, SPOOL, START_CYRITE, pickPursuer, rockYield,
} from '../src/sim/breakout';
import type { Rock } from '../src/sim/field';
import { CUT_WORK, cutRock, WARM } from '../src/sim/mining';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';

const input = (f: Partial<InputFrame> = {}): InputFrame =>
  ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard', ...f });

function run(w: World, seconds: number, f: Partial<InputFrame> = {}) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input(f));
}

/** A Breakout with an empty sky: no rock, no bulwarks, no pursuit unless asked. */
function quiet(seed = 3): World {
  const w = new World(seed, { mode: 'breakout' });
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = (dt: number) => { for (const r of w.field.rocks) { r.x += r.vx * dt; r.z += r.vz * dt; } };
  w.bk!.nextPursuit = Infinity;
  w.cardNext = Infinity;
  w.portCalled = true;
  return w;
}

/** Answer every comms card by turning it down (or with the first choice there is), and fly on. */
function runDeclining(w: World, seconds: number) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (w.phase === 'comms') w.answer(w.comms!.choices.find((c) => c.tone === 'refuse' && c.ok)?.id ?? w.comms!.choices.findIndex((c) => c.ok));
    w.step(STEP, input());
  }
}

/** One still rock straight ahead of the bow. */
function rockAhead(w: World, ahead: number, kind: Rock['kind'] = 'basalt', size: 0 | 1 | 2 = 0): Rock {
  const r = w.field.spawn(size, w.ship.x, w.ship.z - ahead, 0, 0, kind);
  r.age = 10;
  return r;
}

describe('the cutter', () => {
  it('goes in only once the rock is warm, and comes out clean under the line', () => {
    const w = quiet();
    const r = rockAhead(w, 9);
    let res = 'none';
    let t = 0;
    while (t < 2 && res === 'cutting' || t === 0) { res = cutRock(r, STEP); t += STEP; if ((r.heat ?? 0) < WARM) expect(r.cut ?? 0).toBe(0); }
    expect(r.cut ?? 0).toBeGreaterThan(0);
  });

  it('fractures a rock held past the line', () => {
    const w = quiet();
    const r = rockAhead(w, 9, 'basalt', 0);
    let res = 'cutting';
    for (let i = 0; i < 10 / STEP && res === 'cutting'; i++) res = cutRock(r, STEP);
    // a large rock needs more warm cutting than one long hold allows
    expect(CUT_WORK[0]).toBeGreaterThan(2);
    expect(res).toBe('fracture');
  });

  it('cuts a small rock clean in one hold, and the ore falls out for the tractor', () => {
    const w = quiet();
    rockAhead(w, 8, 'basalt', 2);
    let cut = false;
    for (let i = 0; i < 6 / STEP && !cut; i++) { w.step(STEP, input({ cut: true })); cut = w.drain().some((e) => e.type === 'rockCut'); }
    expect(cut).toBe(true);
    expect(w.field.rocks.length).toBe(0);
    run(w, 2);
    expect(w.ore).toBe(rockYield('basalt', 2, true).ore);
    expect(w.run.cut).toBe(1);
  });

  it('pulsed, cuts a large rock clean', () => {
    const w = quiet();
    const r = rockAhead(w, 12, 'rich', 0);
    let done = false;
    for (let i = 0; i < 40 / STEP && !done; i++) {
      // ease off at the red, back in once it has cooled a little
      const hot = (r.heat ?? 0) > 0.9;
      w.step(STEP, input({ cut: !hot && (r.heat ?? 0) < 0.92 }));
      if (hot) run(w, 0.6);
      done = w.drain().some((e) => e.type === 'rockCut') || !w.field.rocks.includes(r);
    }
    expect(w.run.cut).toBe(1);
    expect(w.run.fractured).toBe(0);
    run(w, 2);
    expect(w.cyrite).toBe(START_CYRITE + rockYield("rich", 0, true).cyrite);
  });

  it('holds the lasers while it runs', () => {
    const w = quiet();
    rockAhead(w, 9);
    w.step(STEP, input({ fire: true, cut: true }));
    expect(w.drain().some((e) => e.type === 'bolt')).toBe(false);
  });
});

describe('the Breakout', () => {
  it('lays the lane mouth out ahead, a minute flat out, with the port off the line about halfway', () => {
    const w = new World(1, { mode: 'breakout' });
    const b = w.bk!;
    expect(Math.hypot(b.lane.x, b.lane.z)).toBeCloseTo(LANE_DIST, 0);
    // the ship starts facing up the screen (-Z): the lane is that way
    expect(b.lane.z).toBeLessThan(0);
    expect(Math.hypot(b.port!.x, b.port!.z)).toBeLessThan(LANE_DIST * 0.6);
    expect(w.cyrite).toBe(START_CYRITE);
    expect(b.heat).toBe(HEAT_START);
  });

  it('starts quiet, then the pursuit comes from behind, Custody first', () => {
    const w = new World(4, { mode: 'breakout' });
    runDeclining(w, PURSUIT_FIRST - 1);
    expect(w.aliens.length).toBe(0);
    runDeclining(w, 3);
    expect(w.aliens.length).toBeGreaterThan(0);
    const b = w.bk!;
    const fwd = [b.lane.x - w.ship.x, b.lane.z - w.ship.z];
    const al = w.aliens[0]!;
    // behind (or, for a Gutter crew, ahead): never from the side alone
    const dot = (al.x - w.ship.x) * fwd[0]! + (al.z - w.ship.z) * fwd[1]!;
    expect(Math.abs(dot)).toBeGreaterThan(0);
    if (al.faction === 'custody') expect(dot).toBeLessThan(0);
  });

  it('pursues with Custody pickets when cool and heavier hulls when hot', () => {
    const rng = new Rng(9);
    const cool = new Set(Array.from({ length: 200 }, () => pickPursuer(0.1, rng).variant));
    const hot = new Set(Array.from({ length: 200 }, () => pickPursuer(0.9, rng).variant));
    expect(cool.has('interdictor')).toBe(false);
    expect(hot.has('interdictor')).toBe(true);
    expect(hot.has('scout')).toBe(false);
  });

  it('heats up over time, and with every kill', () => {
    const w = quiet();
    run(w, 10);
    expect(w.bk!.heat).toBeGreaterThan(HEAT_START);
  });

  it('docks when slow inside the port, sells the hold, sells Cyrite and plates, and casts off', () => {
    const w = quiet();
    const b = w.bk!;
    w.ship.x = b.port!.x; w.ship.z = b.port!.z; w.ship.vx = w.ship.vz = 0;
    w.ore = 30;
    w.plates = 1;
    run(w, 1.5);
    expect(w.phase).toBe('dock');
    expect(w.sellOre()).toBe(30 * PRICE.ore);
    expect(w.ore).toBe(0);
    const k = w.cyrite;
    expect(w.buy("cyrite")).toBe(true);
    expect(w.cyrite).toBe(k + 1);
    expect(w.buy('plate')).toBe(true);
    expect(w.plates).toBe(2);
    w.chits = PRICE.refit;
    expect(w.buy('refit')).toBe(true);
    expect(w.phase).toBe('refit');
    w.choose(0);
    expect(w.phase).toBe('dock');
    w.undock();
    expect(w.phase).toBe('play');
  });

  it('patches a plate from parts once the ship is left alone', () => {
    const w = quiet();
    w.plates = 1;
    w.parts = PATCH_COST;
    run(w, PATCH_QUIET + PATCH_TIME + 0.5);
    expect(w.plates).toBe(2);
    expect(w.parts).toBe(0);
  });

  it('will not jump without the Cyrite, and jumps once the drive has spooled', () => {
    const w = quiet();
    const b = w.bk!;
    b.blockade = 'done';
    w.ship.x = b.lane.x; w.ship.z = b.lane.z;
    w.cyrite = JUMP_COST - 1;
    run(w, SPOOL + 1);
    expect(w.phase).toBe('play');
    expect(w.drain().some((e) => e.type === 'needCyrite')).toBe(true);
    w.cyrite = JUMP_COST + 3;
    run(w, SPOOL + 2.5);
    expect(w.phase).toBe('over');
    expect(w.run.escaped).toBe(true);
    expect(w.run.cyriteLeft).toBe(3);
    expect(w.run.cause).toBe('escaped');
  });

  it('calls the checkpoint near the lane mouth, and running it brings her after you', () => {
    const w = quiet();
    const b = w.bk!;
    w.ship.x = b.lane.x; w.ship.z = b.lane.z + 300;
    run(w, 1);
    expect(w.phase).toBe('comms');
    expect(w.comms?.def.id).toBe('checkpoint');
    expect(w.answer('run')).toBe(true);
    expect(b.blockade).toBe('done');
    expect(b.heat).toBe(1);
    run(w, 4);
    expect(w.command.state).toBe('fight');
    expect(b.spoolNeed).toBeGreaterThan(SPOOL * 2);
  });

  it('fights the blockade from the checkpoint without a second hail', () => {
    const w = quiet();
    const b = w.bk!;
    w.ship.x = b.lane.x; w.ship.z = b.lane.z + 300;
    run(w, 1);
    w.answer('fight');
    expect(b.blockade).toBe('called');
    run(w, 4);
    expect(w.phase).toBe('play');
    expect(w.command.state).toBe('fight');
    expect(w.command.boss?.faction).toBe('custody');
  });

  it('leaves the arcade as it was', () => {
    const w = new World(1);
    expect(w.bk).toBeNull();
    expect(w.mode).toBe('arcade');
  });
});
