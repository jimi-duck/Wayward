import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { newJourney } from '../src/sim/journey';
import { SAFE_R } from '../src/sim/breakout';
import { goalOf } from '../src/sim/goal';
import { metres } from '../src/sim/world';
import { lessonOf, needsTorpedoFit, stepOf, LESSON_NODE } from '../src/sim/tutor';
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

  it('goes rock, a short flight to the work bay, then a ship shot with the new torpedoes, and leaves the tank holding the jump', () => {
    const w = story();
    w.field.step = () => {};
    const rock = w.field.rocks.find((r) => r.id === w.tutor!.rockId)!;
    w.field.rocks = [rock];
    w.dropCrystals(w.ship.x, w.ship.z, 5, 0);
    w.field.rocks = [];
    w.fuel = w.jumpCost - 2; // stand in for the pickup
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(stepOf(w)).toBe('bay');
    // the depot is a short hop away, and the bay stays shut in flight
    const les = lessonOf(w)!;
    expect(les.mark && Math.hypot(les.mark.x - w.ship.x, les.mark.z - w.ship.z)).toBeLessThan(250);
    expect(w.bayClosed()).toBe('away');
    expect(w.aliens.some((a) => a.id === w.tutor!.alienId)).toBe(false);
    // docked, it offers the one card and takes the torpedo bay
    const p = w.bk!.port!;
    w.ship.x = p.x; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 400 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.phase).toBe('dock');
    expect(w.openBay()).toBe(true);
    expect(w.install(LESSON_NODE)).toBeNull();
    w.closeBay();
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    // only now does the ship appear, and the lesson is the torpedo
    expect(stepOf(w)).toBe('shoot');
    expect(w.stats.torpedoes).toBe(true);
    expect(lessonOf(w)!.hint).toBe('torpedo');
    expect(w.aliens.some((a) => a.id === w.tutor!.alienId)).toBe(true);
    // it is outside the depot's safe ring, so it can be shot
    const al = w.aliens.find((a) => a.id === w.tutor!.alienId)!;
    expect(Math.hypot(al.x - p.x, al.z - p.z)).toBeGreaterThan(SAFE_R);
    w.aliens = [];
    w.kills++;
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(w.tutor!.done).toBe(true);
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
