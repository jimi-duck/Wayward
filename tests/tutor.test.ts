import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { newJourney } from '../src/sim/journey';
import { SAFE_R } from '../src/sim/breakout';
import { goalOf } from '../src/sim/goal';
import { metres } from '../src/sim/world';
import { cargoOf, lessonOf, needsTorpedoFit, stepOf, LESSON_NODE } from '../src/sim/tutor';
import { FINAL_LOAD, FIRST_LOAD, HOLD_AT_START, NET, upgradePrice } from '../src/sim/contract';
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

  it('goes rock, the work bay settlement, a second rock, then raiders who take the load, and leaves the tank holding the jump', () => {
    const w = story();
    w.field.step = () => {};
    // before docking the cargo is on board, not delivered
    expect(cargoOf(w)).toMatchObject({ onboard: HOLD_AT_START, delivered: 0 });
    const rock = w.field.rocks.find((r) => r.id === w.tutor!.rockId)!;
    w.field.rocks = [rock];
    w.dropCrystals(w.ship.x, w.ship.z, 5, 0);
    w.field.rocks = [];
    w.fuel = w.jumpCost - 2; // stand in for the pickup
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(stepOf(w)).toBe('bay');
    expect(cargoOf(w)).toMatchObject({ onboard: FIRST_LOAD, delivered: 0 });
    // the depot is a short hop away, and the bay stays shut in flight
    const les = lessonOf(w)!;
    expect(les.mark && Math.hypot(les.mark.x - w.ship.x, les.mark.z - w.ship.z)).toBeLessThan(250);
    expect(w.bayClosed()).toBe('away');
    expect(w.aliens.some((a) => a.id === w.tutor!.alienId)).toBe(false);
    // no panel on the approach: the settlement is the dock itself
    const p = w.bk!.port!;
    w.ship.x = p.x; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 400 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.phase).toBe('comms');
    expect(w.comms?.def.id).toBe('story_bay');
    expect(w.docked).toBe(true);
    // the work bay has counted the load: 800 of 1,000 delivered, nothing left in the hold, the credit in the purse
    expect(cargoOf(w)).toMatchObject({ onboard: 0, delivered: FIRST_LOAD });
    expect(w.cyrite).toBe(NET);
    expect(w.comms?.ledger?.find((r) => r.k === 'Available credit')?.cr).toBe(NET);
    expect(w.answer('install')).toBe(true);
    // the rack was paid once, from the credit, and the ship is away again with no second panel
    expect(w.levels[LESSON_NODE]).toBe(1);
    expect(w.stats.torpedoes).toBe(true);
    expect(w.cyrite).toBe(NET - upgradePrice());
    expect(w.result().carry.flags).not.toContain('lease_financed');
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(w.phase).toBe('play');
    expect(w.docked).toBe(false);
    // back out for the last of the contract, clear of the depot's damping field
    expect(stepOf(w)).toBe('haul');
    expect(cargoOf(w)).toMatchObject({ onboard: 0, delivered: FIRST_LOAD });
    const rock2 = w.field.rocks.find((r) => r.id === w.tutor!.rockId)!;
    expect(Math.hypot(rock2.x - p.x, rock2.z - p.z)).toBeGreaterThan(SAFE_R);
    w.field.rocks = [rock2];
    w.dropCrystals(w.ship.x, w.ship.z, 5, 0);
    w.field.rocks = [];
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(cargoOf(w)).toMatchObject({ onboard: FINAL_LOAD, delivered: FIRST_LOAD });
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    // the lesson is the torpedo
    expect(stepOf(w)).toBe('shoot');
    expect(lessonOf(w)!.hint).toBe('torpedo');
    w.ship.x = p.x + SAFE_R + 6;
    for (let i = 0; i < 30; i++) w.step(STEP, input());
    expect(w.aliens.some((a) => a.id === w.tutor!.alienId)).toBe(true);
    const al = w.aliens.find((a) => a.id === w.tutor!.alienId)!;
    expect(Math.hypot(al.x - p.x, al.z - p.z)).toBeGreaterThan(SAFE_R);
    // two raiders, and a win takes both; they say what they want over the radio, in flight
    expect(w.tutor!.pirates).toHaveLength(2);
    expect(w.tutor!.said).toContain('demand');
    w.aliens = [];
    w.kills++;
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(w.tutor!.done).toBe(false);
    expect(cargoOf(w)!.onboard).toBe(FINAL_LOAD);
    expect(w.aliens.filter((a) => w.tutor!.pirates.includes(a.id))).toHaveLength(1);
    w.aliens = [];
    w.kills++;
    w.events.length = 0;
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(w.tutor!.done).toBe(true);
    // the load is torn away where the player can see it, and the contract keeps the 800
    expect(w.tutor!.lost).toBe(true);
    expect(cargoOf(w)).toMatchObject({ onboard: 0, delivered: FIRST_LOAD });
    expect(w.events.some((e) => e.type === 'cargoLost' && e.n === FINAL_LOAD)).toBe(true);
    // what the second rock gave is lost with the hold: the credit is what the settlement left
    expect(w.cyrite).toBeLessThanOrEqual(NET - upgradePrice());
    expect(w.bk!.chase).not.toBeNull();
    expect(w.fuel).toBeGreaterThanOrEqual(w.jumpCost);
    expect(lessonOf(w)).toBeNull();
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
    const { endSortie, plot, options, sortieDef } = await import('../src/sim/journey');
    const { dueBeat } = await import('../src/sim/story');
    const j = newJourney(7);
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.train();
    w.skipTraining();
    // a skipped training still leaves the contract at 800 counted, the hold empty and the rack fitted
    expect(cargoOf(w)).toMatchObject({ onboard: 0, delivered: FIRST_LOAD });
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
    plot(j, options(j)[0]!.to.id);
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
});
