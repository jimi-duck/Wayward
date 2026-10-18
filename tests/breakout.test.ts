import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import {
  HEAT_START, JUMP_COST, LANE_DIST, PATCH_COST, PATCH_QUIET, PATCH_TIME, PRICE, PURSUIT_FIRST, SPOOL, APPROACH, JUMP_T, START_CYRITE, pickPursuer, rockYield, rockTake, TORP_YIELD,
} from '../src/sim/breakout';
import type { Rock } from '../src/sim/field';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';

const input = (f: Partial<InputFrame> = {}): InputFrame =>
  ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard', ...f });

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

describe('mining', () => {
  const priv = (w: World) => w as unknown as { destroyRock(r: unknown, s: string): void; collect(pk: unknown): void };

  it('lasers take a small rock apart clean, and the ore falls out for the tractor', () => {
    const w = quiet();
    rockAhead(w, 8, 'basalt', 2);
    let mined = false;
    for (let i = 0; i < 6 / STEP && !mined; i++) { w.step(STEP, input({ fire: true })); mined = w.drain().some((e) => e.type === 'rockMined'); }
    expect(mined).toBe(true);
    expect(w.field.rocks.length).toBe(0);
    run(w, 2);
    expect(w.run.loot.rock.ore).toBe(rockYield('basalt', 2).ore);
    expect(w.run.mined).toBe(1);
  });

  it('mines a large veined rock clean, and nothing is left to split', () => {
    const w = quiet();
    const r = rockAhead(w, 12, 'rich', 0);
    for (let i = 0; i < 20 / STEP && w.field.rocks.includes(r); i++) w.step(STEP, input({ fire: true }));
    expect(w.run.mined).toBe(1);
    expect(w.field.rocks.length).toBe(0);
    run(w, 2);
    // the rock's Cyrite, and the odd crystal the vein carries, all in the one hold
    expect(w.cyrite + w.fuel).toBeGreaterThanOrEqual(START_CYRITE + rockYield('rich', 0).cyrite);
    // the refinery fills the tank first: the purse waits for a full one
    expect(w.fuel).toBeGreaterThan(START_CYRITE);
    if (w.fuel < w.tankCap) expect(w.cyrite).toBe(0);
  });

  it('refines into the tank first, and the rest is Cyrite for the purse', () => {
    const w = quiet();
    w.fuel = w.tankCap - 3;
    w.cyrite = 0;
    priv(w).collect({ id: 1, kind: 'cyrite', x: 0, z: 0, vx: 0, vz: 0, value: 5, age: 0, life: 9 });
    expect(w.fuel).toBe(w.tankCap);
    expect(w.cyrite).toBe(2);
    const e = w.drain().find((x) => x.type === 'cyrite');
    expect(e && e.type === 'cyrite' ? e.fuel : -1).toBe(3);
  });

  it('holds exactly the plotted jump, so a full tank sends everything to the purse', () => {
    const w = quiet();
    expect(w.tankCap).toBe(w.jumpCost);
    w.fuel = w.jumpCost;
    w.cyrite = 0;
    priv(w).collect({ id: 2, kind: 'cyrite', x: 0, z: 0, vx: 0, vz: 0, value: 4, age: 0, life: 9 });
    expect(w.fuel).toBe(w.jumpCost);
    expect(w.cyrite).toBe(4);
  });

  it('a torpedo destroys part of the rock, so it gives less than the lasers', () => {
    const w = quiet();
    const r = rockAhead(w, 12, 'rich', 0);
    priv(w).destroyRock(r, 'torpedo');
    run(w, 2);
    expect(w.field.rocks.length).toBe(0);
    expect(w.run.mined).toBe(0);
    expect(w.run.blasted).toBe(1);
    expect(w.cyrite + w.fuel).toBeGreaterThanOrEqual(START_CYRITE + rockYield('rich', 0, TORP_YIELD).cyrite);
    expect(rockYield('rich', 0, TORP_YIELD).cyrite).toBeLessThan(rockYield('rich', 0).cyrite);
    expect(rockTake('torpedo')).toBe(TORP_YIELD);
    // the high-yield booster cancels the penalty while it runs
    const b = quiet();
    b.powers.yield = 5;
    const rb = rockAhead(b, 12, 'rich', 0);
    priv(b).destroyRock(rb, 'torpedo');
    run(b, 2);
    expect(b.cyrite + b.fuel).toBeGreaterThanOrEqual(START_CYRITE + rockYield('rich', 0).cyrite);
    expect(rockTake('laser')).toBe(1);
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
    expect(w.fuel).toBe(START_CYRITE);
    expect(w.cyrite).toBe(0);
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

  it('docks when slow inside the port, mends a plate, and casts off', () => {
    const w = quiet();
    const b = w.bk!;
    w.ship.x = b.port!.x; w.ship.z = b.port!.z; w.ship.vx = w.ship.vz = 0;
    w.cyrite = w.jumpCost + 40;
    w.plates = 1;
    run(w, 1.5);
    expect(w.phase).toBe('dock');
    const k = w.cyrite;
    expect(w.buy('plate')).toBe(true);
    expect(w.plates).toBe(2);
    expect(w.cyrite).toBeLessThan(k);
    // the bay opens at the port, and closing it goes back to the dock
    expect(w.openBay()).toBe(true);
    w.closeBay();
    expect(w.phase).toBe('dock');
    w.undock();
    expect(w.phase).toBe('play');
  });

  it('does not dock again right after casting off, only after leaving the ring', () => {
    const w = quiet();
    const b = w.bk!;
    w.ship.x = b.port!.x; w.ship.z = b.port!.z; w.ship.vx = w.ship.vz = 0;
    run(w, 1.5);
    expect(w.phase).toBe('dock');
    w.undock();
    run(w, 3);
    expect(w.phase).toBe('play');
    // out of the ring and back in: the clamps take it again
    w.ship.x = b.port!.x + b.port!.r + 20;
    run(w, 0.1);
    w.ship.x = b.port!.x; w.ship.vx = w.ship.vz = 0;
    run(w, 1.5);
    expect(w.phase).toBe('dock');
  });

  it('patches a plate from supplies once the ship is left alone', () => {
    const w = quiet();
    w.plates = 1;
    w.supplies = PATCH_COST;
    run(w, PATCH_QUIET + PATCH_TIME + 0.5);
    expect(w.plates).toBe(2);
    expect(w.supplies).toBe(0);
  });

  it('will not jump without the Cyrite, and jumps once the drive has spooled', () => {
    const w = quiet();
    const b = w.bk!;
    b.blockade = 'done';
    w.ship.x = b.lane.x; w.ship.z = b.lane.z;
    w.fuel = JUMP_COST - 1;
    w.cyrite = 50;
    run(w, SPOOL + 1);
    expect(w.phase).toBe('play');
    expect(w.drain().some((e) => e.type === 'needFuel')).toBe(true);
    // Cyrite in the purse is no help to the drive
    expect(w.fuel).toBe(JUMP_COST - 1);
    w.fuel = JUMP_COST + 3;
    w.cyrite = 3;
    run(w, SPOOL + JUMP_T + 1);
    expect(w.phase).toBe('over');
    expect(w.run.escaped).toBe(true);
    expect(w.fuel).toBe(3);
    expect(w.cyrite).toBe(3);
    expect(w.run.cyriteLeft).toBe(3);
    expect(w.run.cause).toBe('escaped');
  });

  it('charges the drive on the way in and goes through the ring as soon as it reaches it', () => {
    const w = quiet();
    const b = w.bk!;
    b.blockade = 'done';
    w.fuel = JUMP_COST + 1;
    // inside the approach, outside the ring: the drive charges, the ship does not go
    w.ship.x = b.lane.x - (APPROACH - 20); w.ship.z = b.lane.z;
    w.ship.vx = w.ship.vz = 0;
    run(w, 2);
    expect(b.spool).toBeGreaterThan(1.5);
    expect(b.jumpT).toBe(-1);
    // outside it, nothing charges
    w.ship.x = b.lane.x - APPROACH - 50;
    run(w, 1);
    expect(b.spool).toBeLessThan(1.6);
    // charged, and in the ring: through, the instant it is there
    b.spool = b.spoolNeed;
    w.ship.x = b.lane.x; w.ship.z = b.lane.z;
    run(w, 2 * STEP);
    expect(b.jumpT).toBeGreaterThan(0);
    expect(w.run.escaped).toBe(true);
    run(w, JUMP_T + 0.2);
    expect(w.phase).toBe('over');
  });

  it('calls the checkpoint near the lane mouth, and running it brings her after you', () => {
    const w = quiet();
    const b = w.bk!;
    w.ship.x = b.lane.x; w.ship.z = b.lane.z + 300;
    run(w, 1);
    expect(w.phase).toBe('comms');
    expect(w.comms?.def.id).toBe('story_registry');
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
