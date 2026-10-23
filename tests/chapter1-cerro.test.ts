import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef, endSortie, autoCourse } from '../src/sim/journey';
import { dueBeat } from '../src/sim/story';
import { World } from '../src/sim/world';
import { cargoOf, lessonOf, stepOf, LESSON_NODE } from '../src/sim/tutor';
import { HOLD_AT_START } from '../src/sim/contract';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';

// Chapter one, the Cerro opening on many seeds (docs/QA-CHAPTER-1.md): the same beats every time, flown with real
// input where the player's hands are on the ship (the laser), and the sim's own answers where they are on a card.

const input = (o: Partial<InputFrame> = {}): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard', ...o });
const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const opening = (seed: number): World => {
  const j = newJourney(seed);
  const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
  w.train();
  return w;
};
const run = (w: World, seconds: number, stop: () => boolean = () => false, o: Partial<InputFrame> = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP) && !stop(); i++) { w.ship.invuln = 1; w.step(STEP, input(o)); }
};
const face = (w: World, p: { x: number; z: number }) => { w.ship.heading = Math.atan2(-(p.z - w.ship.z), p.x - w.ship.x); };
const rockOf = (w: World) => w.field.rocks.find((r) => r.id === w.tutor!.rockId);

describe('chapter one: Cerro, on every seed', () => {
  it.each(SEEDS)('seed %i: the laser takes the lesson rock, the drops come aboard, and the lesson moves on', (seed) => {
    const w = opening(seed);
    expect(stepOf(w)).toBe('mine');
    const rock = rockOf(w)!;
    expect(rock).toBeDefined();
    // the real trigger, the nose on the rock, a little thrust to be inside the laser's reach
    for (let i = 0; i < 60 * 30 && rockOf(w); i++) {
      face(w, rockOf(w)!);
      const d = Math.hypot(rockOf(w)!.x - w.ship.x, rockOf(w)!.z - w.ship.z);
      w.ship.invuln = 1;
      w.step(STEP, input({ fire: true, thrust: d > 22 ? 1 : 0 }));
    }
    expect(rockOf(w), 'the rock is mined or broken in 30 s').toBeUndefined();
    // the drops: fly through whatever fell out
    for (let i = 0; i < 60 * 20 && stepOf(w) === 'mine'; i++) {
      const pk = w.pickups[0];
      if (pk) face(w, pk);
      w.ship.invuln = 1;
      w.step(STEP, input({ thrust: pk ? 1 : 0 }));
    }
    expect(stepOf(w), 'the lesson moves to the work bay').toBe('bay');
    expect(w.fuel + w.cyrite).toBeGreaterThan(0);
  });

  it.each(SEEDS)('seed %i: the work bay takes the ship, finances the launcher and sends it back out', (seed) => {
    const w = opening(seed);
    w.tutor!.i = 1; w.tutor!.begun = false;
    w.field.step = () => {};
    run(w, 2);
    expect(stepOf(w)).toBe('bay');
    const p = w.bk!.port!;
    // fly in at the dock's ring from 120 off, the way a pilot does
    w.ship.x = p.x - 120; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 60 * 40 && w.phase === 'play'; i++) { face(w, p); w.ship.invuln = 1; const d = Math.hypot(p.x - w.ship.x, p.z - w.ship.z); const v = Math.hypot(w.ship.vx, w.ship.vz); w.step(STEP, input({ thrust: d > 40 || (d > p.r - 4 && v < 6) ? 1 : 0, brk: d < 40 && v > 8 })); }
    const dbg = `d=${Math.hypot(p.x - w.ship.x, p.z - w.ship.z).toFixed(1)} r=${p.r} v=${Math.hypot(w.ship.vx, w.ship.vz).toFixed(1)} held=${w.dockHeld} castOff=${w.bk!.castOff} dockT=${w.bk!.dockT.toFixed(2)}`;
    expect(w.phase, `docked and the account is up (${dbg})`).toBe('comms');
    expect(w.comms?.def.id).toBe('story_bay');
    expect(w.answer('install')).toBe(true);
    run(w, 3);
    expect(w.levels[LESSON_NODE]).toBe(1);
    expect(w.phase).toBe('play');
    expect(stepOf(w)).toBe('haul');
  });

  it.each(SEEDS)('seed %i: the raiders stop the world, refusing takes the hold, and the way to the gate is open', (seed) => {
    const w = opening(seed);
    w.field.step = () => {};
    w.setLevels({ ...w.levels, [LESSON_NODE]: 1 });
    w.tutor!.i = 3; w.tutor!.begun = false;
    w.tutor!.onboard = HOLD_AT_START + 200;
    run(w, 40, () => w.phase !== 'play');
    expect(w.comms?.def.id).toBe('story_raiders');
    expect(w.answer('refuse')).toBe(true);
    run(w, 6, () => !!w.tutor!.lost);
    expect(w.tutor!.lost).toBe(true);
    expect(cargoOf(w)!.onboard).toBe(0);
    // the raiders fall; the lesson ends and the chase and the warning start
    const pirates = [...w.tutor!.pirates];
    w.aliens = w.aliens.filter((a) => !pirates.includes(a.id));
    w.kills += 2;
    run(w, 4);
    expect(w.tutor!.done).toBe(true);
    expect(w.bk!.chase).not.toBeNull();
    expect(w.fuel).toBeGreaterThanOrEqual(w.jumpCost);
    expect(lessonOf(w)).toBeNull();
    // and the gate is where the HUD says, a short run on: flying there jumps
    const l = w.bk!.lane;
    expect(Math.hypot(l.x - w.ship.x, l.z - w.ship.z)).toBeLessThan(2500);
    w.ship.x = l.x; w.ship.z = l.z; w.ship.vx = w.ship.vz = 0;
    run(w, 25, () => w.phase === 'over');
    expect(w.phase).toBe('over');
    expect(w.result().ended).toBe('jumped');
  });

  it.each(SEEDS)('seed %i: dying before the gate is a wreck without an escape, so the app starts the opening again', (seed) => {
    const w = opening(seed);
    w.skipTraining();
    const hit = (w as unknown as { hitShip(k: string, x: number, z: number): void }).hitShip.bind(w);
    for (let i = 0; i < 60 * 60 && w.phase !== 'over'; i++) {
      if (w.alive && i % 30 === 0) { w.ship.invuln = 0; hit('blast', w.ship.x + 1, w.ship.z); }
      if (w.phase === 'comms') { w.answer(0); continue; }
      w.step(STEP, input());
    }
    expect(w.phase).toBe('over');
    expect(w.run.escaped).toBe(false);
    expect(w.sortie.home).toBe(true);
    // the same opening again from the same journey: it is the start, not a continuation
    const j = newJourney(seed);
    const again = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    again.train();
    expect(again.phase).toBe('play');
    expect(stepOf(again)).toBe('mine');
    expect(cargoOf(again)).toMatchObject({ onboard: HOLD_AT_START, delivered: 0 });
  });
});

describe('chapter one: from the gate through the story chain', () => {
  it.each(SEEDS)('seed %i: the cards come in order, the lock lifts, the code and the rename are banked, and a reload keeps them', (seed) => {
    const j = newJourney(seed);
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.train(); w.skipTraining();
    const l = w.bk!.lane;
    w.fuel = w.tankCap;
    w.ship.x = l.x; w.ship.z = l.z; w.ship.vx = w.ship.vz = 0;
    run(w, 25, () => w.phase === 'over');
    expect(w.phase).toBe('over');
    endSortie(j, w.result());
    expect(dueBeat(j)).toBe('story_breach');
    expect(autoCourse(j)).toBe(true);
    const next = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    next.skipTraining();
    const seen: string[] = [];
    for (let i = 0; i < 60 * 90; i++) {
      if (next.phase === 'comms') { seen.push(next.comms!.def.id); next.answer(0); continue; }
      next.ship.invuln = 1; next.step(STEP, input());
    }
    const at = (id: string) => seen.indexOf(id);
    expect(at('story_breach')).toBeGreaterThanOrEqual(0);
    expect(at('story_sam')).toBeGreaterThan(at('story_breach'));
    expect(at('story_wake'), `the archive wakes after Sam: ${seen.join(',')}`).toBeGreaterThan(at('story_sam'));
    expect(next.flags.has('archive_woke')).toBe(true);
    // each once
    expect(new Set(seen).size).toBe(seen.length);
    expect(next.flags.has('ship_stolen')).toBe(true);
    // the banked answers are what a reload sees
    const back = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: { ...j.carry, flags: [...next.flags] } });
    back.skipTraining();
    expect(back.flags.has('ship_stolen')).toBe(true);
  });
});

describe('chapter one: the way out of the first system', () => {
  it.each(SEEDS.slice(0, 6))('seed %i: the tank arrives dry, mining the worked-out field fills it, and the Jump Gate takes the ship', (seed) => {
    const j = newJourney(seed);
    const w0 = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w0.train(); w0.skipTraining();
    const l0 = w0.bk!.lane; w0.ship.x = l0.x; w0.ship.z = l0.z; w0.ship.vx = w0.ship.vz = 0;
    run(w0, 25, () => w0.phase === 'over');
    endSortie(j, w0.result());
    autoCourse(j);
    j.carry.flags.push('archive_woke', 'ship_stolen');
    const w = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    w.skipTraining();
    expect(w.fuel).toBeLessThan(w.jumpCost);
    // a pilot who only mines: the nearest rock, the laser, the drops, until the tank holds the jump
    let t = 0;
    for (; t < 60 * 420 && w.fuel < w.jumpCost && w.phase !== 'over'; t++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      const pk = w.pickups[0];
      const rock = w.field.rocks.filter((r) => Math.hypot(r.x - w.ship.x, r.z - w.ship.z) < 900).sort((a, b) => Math.hypot(a.x - w.ship.x, a.z - w.ship.z) - Math.hypot(b.x - w.ship.x, b.z - w.ship.z))[0];
      const goal = pk && Math.hypot(pk.x - w.ship.x, pk.z - w.ship.z) < 120 ? pk : rock;
      if (!goal) break;
      face(w, goal);
      const d = Math.hypot(goal.x - w.ship.x, goal.z - w.ship.z);
      w.ship.invuln = 1;
      w.step(STEP, input({ fire: goal === rock && d < 40, thrust: d > (goal === rock ? 22 : 0) ? 1 : 0 }));
    }
    expect(w.fuel, `tank after ${(t / 60).toFixed(0)} s`).toBeGreaterThanOrEqual(w.jumpCost);
    expect(t / 60, 'it takes minutes, not a quarter of an hour').toBeLessThan(300);
    // and out
    const l = w.bk!.lane;
    w.ship.x = l.x; w.ship.z = l.z; w.ship.vx = w.ship.vz = 0;
    run(w, 25, () => w.phase === 'over');
    expect(w.result().ended).toBe('jumped');
  });
});
