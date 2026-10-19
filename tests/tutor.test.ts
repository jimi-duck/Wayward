import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { newJourney } from '../src/sim/journey';
import { SAFE_R } from '../src/sim/breakout';
import { goalOf } from '../src/sim/goal';
import { metres } from '../src/sim/world';
import { cargoOf, lessonOf, needsTorpedoFit, stepOf, LESSON_NODE } from '../src/sim/tutor';
import { CREDIT_START, FIRST_LOAD, HOLD_AT_START } from '../src/sim/contract';
import type { InputFrame } from '../src/input/types';

const input = (o: Partial<InputFrame> = {}): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard', ...o });
const STEP = 1 / 60;

function story() {
  const j = newJourney(3);
  const w = new World(5, { mode: 'breakout', carry: j.carry });
  w.train();
  return w;
}

describe('the first minutes', () => {
  it('puts the lane entrance 10 km off, and says so on the pause card', () => {
    const w = story();
    const d = Math.hypot(w.bk!.lane.x - w.ship.x, w.bk!.lane.z - w.ship.z);
    expect(metres(d)).toBe(10000);
    expect(needsTorpedoFit(w)).toBe(false);
    expect(goalOf(w).goal).toBe('Laser the Cyrite rock');
  });

  it('starts on one rock close ahead, the torpedo bay not yet fitted, and the tank short of the jump by the rock', () => {
    const w = story();
    expect(stepOf(w)).toBe('mine');
    expect(w.levels[LESSON_NODE]).toBeUndefined();
    expect(w.stats.torpedoes).toBe(false);
    const les = lessonOf(w)!;
    expect(les.mark && Math.hypot(les.mark.x - w.ship.x, les.mark.z - w.ship.z)).toBeLessThan(100);
    expect(w.fuel + 12).toBeGreaterThanOrEqual(w.jumpCost);
    // the upgrade comes from the purse, not the tank
    expect(w.cyrite).toBe(0);
    expect(w.bk!.nextPursuit).toBeGreaterThan(w.runTime + 20);
  });

  it('goes rock, the work bay account, a second rock, then raiders who stop the world and take the hold, and leaves the tank holding the jump', () => {
    const w = story();
    w.field.step = () => {};
    // the shift is picked up in flight: 800 of the 1,000 are in the hold, nothing delivered
    expect(cargoOf(w)).toMatchObject({ onboard: HOLD_AT_START, delivered: 0 });
    expect(w.civic).toBeGreaterThan(0);
    const rock = w.field.rocks.find((r) => r.id === w.tutor!.rockId)!;
    w.field.rocks = [rock];
    w.dropCrystals(w.ship.x, w.ship.z, 5, 0);
    w.field.rocks = [];
    w.fuel = w.jumpCost - 2; // stand in for the pickup
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(stepOf(w)).toBe('bay');
    expect(cargoOf(w)).toMatchObject({ onboard: FIRST_LOAD, delivered: 0 });
    expect(lessonOf(w)!.line).toBe('Dock at the Work Bay');
    // the depot is a short hop away, and the bay stays shut in flight
    const les = lessonOf(w)!;
    expect(les.mark && Math.hypot(les.mark.x - w.ship.x, les.mark.z - w.ship.z)).toBeLessThan(250);
    expect(w.bayClosed()).toBe('away');
    expect(w.aliens.some((a) => a.id === w.tutor!.alienId)).toBe(false);
    // no panel on the approach: the account is the dock itself
    const p = w.bk!.port!;
    w.ship.x = p.x; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 400 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.phase).toBe('comms');
    expect(w.comms?.def.id).toBe('story_bay');
    expect(w.docked).toBe(true);
    // the bay takes no cargo: the hold stays full, the credit is low, the launcher is on offer
    expect(cargoOf(w)).toMatchObject({ onboard: FIRST_LOAD, delivered: 0 });
    expect(w.cyrite).toBe(CREDIT_START);
    expect(w.comms?.ledger?.find((r) => r.k === 'Available credit')?.cr).toBe(CREDIT_START);
    expect(w.comms?.def.reply?.from).toMatch(/^Sam Okoro/);
    expect(w.answer('install')).toBe(true);
    // the launcher is financed, not paid for: the purse is untouched, and the ship is away again with no second panel
    expect(w.levels[LESSON_NODE]).toBe(1);
    expect(w.stats.torpedoes).toBe(true);
    expect(w.cyrite).toBe(CREDIT_START);
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(w.phase).toBe('play');
    expect(w.docked).toBe(false);
    // back out for the last of the contract, clear of the depot's damping field
    expect(stepOf(w)).toBe('haul');
    expect(cargoOf(w)).toMatchObject({ onboard: FIRST_LOAD, delivered: 0 });
    const rock2 = w.field.rocks.find((r) => r.id === w.tutor!.rockId)!;
    expect(Math.hypot(rock2.x - p.x, rock2.z - p.z)).toBeGreaterThan(SAFE_R);
    w.field.rocks = [rock2];
    w.dropCrystals(w.ship.x, w.ship.z, 5, 0);
    w.field.rocks = [];
    for (let i = 0; i < 240; i++) w.step(STEP, input());
    // the hold still holds the 800: the lesson rocks add nothing to it
    expect(cargoOf(w)).toMatchObject({ onboard: FIRST_LOAD, delivered: 0 });
    // the lesson is the launcher
    expect(stepOf(w)).toBe('shoot');
    expect(lessonOf(w)!.hint).toBe('torpedo');
    w.ship.x = p.x + SAFE_R + 6;
    // two ships close in, white and unknown; the world stops when they are in range
    for (let i = 0; i < 900 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.phase).toBe('comms');
    expect(w.comms?.def.id).toBe('story_raiders');
    expect(w.tutor!.pirates).toHaveLength(2);
    const raiders = w.aliens.filter((a) => w.tutor!.pirates.includes(a.id));
    expect(raiders).toHaveLength(2);
    for (const a of raiders) { expect(a.ward?.tag).toBe('UNKNOWN'); expect(Math.hypot(a.x - w.ship.x, a.z - w.ship.z)).toBeLessThan(80); }
    expect(lessonOf(w)!.mark?.name).toBe('Unknown');
    // the transmission waits: no time passes while it is open
    const t0 = w.runTime;
    for (let i = 0; i < 60; i++) w.step(STEP, input());
    expect(w.runTime).toBe(t0);
    expect(w.answer('refuse')).toBe(true);
    // refused: they turn hostile (no longer wards), and the fight begins
    expect(raiders.every((a) => !a.ward)).toBe(true);
    for (let i = 0; i < 10; i++) w.step(STEP, input());
    expect(lessonOf(w)!.mark?.name).toBe('Raider');
    // refusing draws a missile at once, homing on the ship
    expect(w.tutor!.missile).toBeGreaterThan(0);
    expect(w.shots.some((s) => s.from === 'tutor-missile')).toBe(true);
    expect(w.tutor!.lost).toBe(false);
    // it always hits, a moment later (scripted, no kill needed): the pod goes and the hit rings on the hull
    w.events.length = 0;
    for (let i = 0; i < 240 && !w.tutor!.lost; i++) { w.ship.vx = 30; w.step(STEP, input()); }
    expect(w.kills).toBe(0);
    expect(w.shots.some((s) => s.from === 'tutor-missile')).toBe(false);
    expect(w.tutor!.lost).toBe(true);
    expect(cargoOf(w)!.onboard).toBe(0);
    expect(w.events.some((e) => e.type === 'cargoLost' && e.n === FIRST_LOAD)).toBe(true);
    expect(w.events.some((e) => e.type === 'shieldHit')).toBe(true);
    w.aliens = [];
    w.kills++;
    expect(w.tutor!.done).toBe(false);
    w.kills++;
    w.events.length = 0;
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(w.tutor!.done).toBe(true);
    // the warning and the gate distance, then the chase
    expect(w.events.some((e) => e.type === 'inbound')).toBe(true);
    expect(w.tutor!.said).toContain('reinforce');
    // nothing was delivered: the launcher is financed, the credit is what it was
    expect(cargoOf(w)).toMatchObject({ onboard: 0, delivered: 0 });
    expect(w.cyrite).toBeLessThanOrEqual(CREDIT_START);
    expect(w.bk!.chase).not.toBeNull();
    expect(w.fuel).toBeGreaterThanOrEqual(w.jumpCost);
    expect(lessonOf(w)).toBeNull();
  });

  it('ends in the raiders’ hands when their offer is taken, and asks for the opening to start again', () => {
    const w = story();
    w.field.step = () => {};
    w.tutor!.i = 3;
    w.tutor!.begun = false;
    w.levels[LESSON_NODE] = 1;
    w.setLevels({ ...w.levels });
    for (let i = 0; i < 900 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.comms?.def.id).toBe('story_raiders');
    expect(w.answer('pay')).toBe(true);
    expect(w.redo).toBe(false);
    for (let i = 0; i < 120 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.comms?.def.id).toBe('story_seized');
    expect(w.comms?.ledger?.find((r) => r.k === 'Pilot')?.v).toBe('Forced labour');
    expect(w.answer('again')).toBe(true);
    expect(w.redo).toBe(true);
    expect(w.events.some((e) => e.type === 'redo')).toBe(true);
    // a restarted world clears it
    w.restart({ mode: 'breakout' });
    expect(w.redo).toBe(false);
  });

  it('keeps the Story bay shut in flight before and after, and fits the torpedo bay on a skip', () => {
    const w = story();
    expect(w.bayClosed()).toBe('away');
    w.skipTraining();
    expect(w.tutor!.done && w.tutor!.skipped).toBe(true);
    expect(w.levels[LESSON_NODE]).toBe(1);
    expect(w.fuel).toBeGreaterThanOrEqual(w.jumpCost);
  });
});

describe('the chase', () => {
  it('starts when the training ends: the lane is set a run ahead, and Custody comes in growing waves from behind', () => {
    const w = story();
    w.skipTraining();
    expect(w.bk!.chase).not.toBeNull();
    const d = Math.hypot(w.bk!.lane.x - w.ship.x, w.bk!.lane.z - w.ship.z);
    expect(Math.round(d)).toBe(1900);
    const seen = new Set<number>();
    for (let i = 0; i < 60 * 40 && w.alive; i++) {
      w.step(STEP, input());
      if (w.phase === 'comms') w.answer('cut');
      seen.add(w.bk!.chase!.wave);
    }
    expect(w.bk!.chase!.wave).toBeGreaterThanOrEqual(3);
    expect(seen.size).toBeGreaterThan(2);
  });
  it('does not start in the Arcade', () => {
    const w = new World(3);
    expect((w as unknown as { bk: unknown }).bk).toBeNull();
  });
});

describe('pop-up gist', () => {
  it('is short on every story card that sets one', async () => {
    const { STORY_CARDS } = await import('../src/content/story');
    for (const c of STORY_CARDS) if (c.gist) expect(c.gist.split(/\s+/).length, c.id).toBeLessThanOrEqual(10);
  });

  it('refuses the clamps while a fight is on, says so once in a while, and takes the ship when it is over', () => {
    const w = story();
    const p = w.bk!.port!;
    w.ship.x = p.x; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    w.spawnHostile('scout', { x: p.x + 30, y: 0, z: p.z });
    w.aliens.forEach((a) => { a.mode = 'attack' as never; });
    let denied = 0;
    for (let i = 0; i < 300; i++) { w.step(STEP, input()); denied += w.events.filter((e) => e.type === 'dockDenied').length; w.events.length = 0; }
    expect(w.phase).toBe('play');
    expect(w.dockHeld).toBe(true);
    expect(denied).toBeGreaterThan(0);
    expect(denied).toBeLessThan(3);
    expect(w.engaged()).toBeGreaterThan(0);
    w.aliens = [];
    let cleared = 0;
    for (let i = 0; i < 400 && w.phase === 'play'; i++) { w.step(STEP, input()); cleared += w.events.filter((e) => e.type === 'dockCleared').length; w.events.length = 0; }
    expect(cleared).toBe(1);
    expect(w.phase).toBe('dock');
  });
});

describe('the first minutes stay quiet', () => {
  it('has no story card in Cerro: the chain waits beyond the gate', async () => {
    const { sortieDef } = await import('../src/sim/journey');
    const j = newJourney(7);
    expect(sortieDef(j).story).toBeNull();
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.train();
    w.cardNext = Infinity;
    w.field.rocks = [];
    w.skipTraining();
    for (let i = 0; i < 60 * 70 && w.phase === 'play'; i++) { w.ship.invuln = 1; w.step(STEP, input()); }
    expect(w.comms?.def.id ?? '').not.toMatch(/^story_(breach|yard|recovery|wake)$/);
  });
});

describe('the whole opening', () => {
  it('runs from the mine through the gate to the breach: the same figures at every step, no contract state saved', async () => {
    const { autoCourse, endSortie, options, sortieDef } = await import('../src/sim/journey');
    const { dueBeat } = await import('../src/sim/story');
    const j = newJourney(7);
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.train();
    w.skipTraining();
    // a skipped training still leaves the hold empty (the raiders took it), nothing delivered, and the launcher fitted
    expect(cargoOf(w)).toMatchObject({ onboard: 0, delivered: 0 });
    expect(w.levels[LESSON_NODE]).toBe(1);
    // the gate: no checkpoint in the way, and the drive spools with the jump fluid aboard
    const b = w.bk!;
    expect(b.blockade).toBe('none');
    w.ship.x = b.lane.x; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 60 * 12 && w.phase === 'play'; i++) { w.ship.invuln = 1; w.step(STEP, input()); }
    expect(w.phase).toBe('over');
    const res = w.result();
    expect(res.ended).toBe('jumped');
    expect(res.carry).not.toHaveProperty('contract');
    endSortie(j, res);
    // the first sortie beyond opens the chain
    expect(dueBeat(j)).toBe('story_breach');
    // the first jump has no chart: the one lane is plotted at once, and a later jump is not
    expect(autoCourse(j)).toBe(true);
    expect(j.status).toBe('sortie');
    expect(j.dest).toBe(options(j)[0]!.to.id);
    expect(autoCourse(j)).toBe(false);
    expect(j.carry).not.toHaveProperty('contract');
  });
  it('is the same thing in a save made before the rework: a journey with the old field carries on, unused', async () => {
    const { VERSION } = await import('../src/sim/journey');
    const { migrate } = await import('../src/meta/save');
    const { readFileSync } = await import('node:fs');
    const old = JSON.parse(readFileSync('tests/fixtures/journey-v19.json', 'utf8'));
    old.carry.contract = { got: 6 };
    const j = migrate(structuredClone(old))!;
    expect(j.version).toBe(VERSION);
    const w = new World(5, { mode: 'breakout', carry: j.carry });
    expect(w.carry().flags).toEqual(expect.arrayContaining(['archive_woke']));
    expect(w.carry()).not.toHaveProperty('contract');
  });

  it('raises the depot shield in a fight: the ship cannot cross, fire is absorbed, and it never comes up with the ship inside', () => {
    const w = story();
    const p = w.bk!.port!;
    // outside, fighting: the edge holds
    w.ship.x = p.x + SAFE_R + 30; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    w.spawnHostile('scout', { x: p.x + SAFE_R + 60, y: 0, z: p.z });
    w.aliens.forEach((a) => { a.mode = 'attack' as never; });
    w.step(STEP, input());
    expect(w.shield).toBe(true);
    for (let i = 0; i < 240; i++) { w.ship.vx = -40; w.step(STEP, input({ thrust: 1 })); w.aliens.forEach((a) => { a.fleeing = false; }); }
    expect(Math.hypot(w.ship.x - p.x, w.ship.z - p.z)).toBeGreaterThanOrEqual(SAFE_R);
    expect(w.safe).toBe(null);
    // the fight over, the shield drops and the ship can go in
    w.aliens = []; w.shots = [];
    for (let i = 0; i < 400; i++) w.step(STEP, input());
    expect(w.shield).toBe(false);
    // inside when a fight starts: no shield, and the ship stays safe
    w.ship.x = p.x; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    w.step(STEP, input());
    w.spawnHostile('scout', { x: p.x + SAFE_R + 20, y: 0, z: p.z });
    w.aliens.forEach((a) => { a.mode = 'attack' as never; });
    for (let i = 0; i < 30; i++) w.step(STEP, input());
    expect(w.shield).toBe(false);
    expect(w.safe).toBe('port');
  });
});
