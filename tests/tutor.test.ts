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
    // Tam and the company's cut come first, on the approach
    for (let i = 0; i < 60 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.comms?.def.id).toBe('story_bay');
    expect(w.comms?.ledger?.[0]).toMatchObject({ k: 'Gross yield' });
    w.answer('sign');
    expect(w.result().carry.flags).toContain('lease_financed');
    for (let i = 0; i < 400 && w.phase === 'play'; i++) w.step(STEP, input());
    expect(w.phase).toBe('dock');
    expect(w.openBay()).toBe(true);
    expect(w.install(LESSON_NODE)).toBeNull();
    w.closeBay();
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    // the lesson is the torpedo, but under the depot's field nothing comes
    expect(stepOf(w)).toBe('shoot');
    expect(w.stats.torpedoes).toBe(true);
    expect(lessonOf(w)!.hint).toBe('torpedo');
    expect(w.safe).toBe('port');
    expect(w.aliens.some((a) => a.id === w.tutor!.alienId)).toBe(false);
    // out past the ring, the ship appears
    w.ship.x = p.x + SAFE_R + 6;
    for (let i = 0; i < 30; i++) w.step(STEP, input());
    expect(w.aliens.some((a) => a.id === w.tutor!.alienId)).toBe(true);
    // it is outside the depot's safe ring, so it can be shot
    const al = w.aliens.find((a) => a.id === w.tutor!.alienId)!;
    expect(Math.hypot(al.x - p.x, al.z - p.z)).toBeGreaterThan(SAFE_R);
    // two raiders, and a win takes both
    expect(w.tutor!.pirates).toHaveLength(2);
    w.aliens = [];
    w.kills++;
    for (let i = 0; i < 120; i++) w.step(STEP, input());
    expect(w.tutor!.done).toBe(false);
    expect(w.aliens.filter((a) => w.tutor!.pirates.includes(a.id))).toHaveLength(1);
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
    w.aliens = [];
    for (let i = 0; i < 400 && w.phase === 'play'; i++) w.step(STEP, input());
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
  it('keeps the Cyrite it mined for the settlement beyond the gate', () => {
    const w = story();
    w.run.cyrite = 7;
    expect(w.carry().contract).toEqual({ got: 7 });
  });
});

describe('the whole opening', () => {
  it('runs from the mine through the gate to the breach: the Cyrite mined is what the settlement counts', async () => {
    const { endSortie, plot, options, sortieDef } = await import('../src/sim/journey');
    const { dueBeat } = await import('../src/sim/story');
    const j = newJourney(7);
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.train();
    w.skipTraining();
    w.run.cyrite = 6;
    // the gate: no checkpoint in the way, and the drive spools with the jump fluid aboard
    const b = w.bk!;
    expect(b.blockade).toBe('none');
    w.ship.x = b.lane.x; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 60 * 12 && w.phase === 'play'; i++) { w.ship.invuln = 1; w.step(STEP, input()); }
    expect(w.phase).toBe('over');
    const res = w.result();
    expect(res.ended).toBe('jumped');
    expect(res.carry.contract).toEqual({ got: 6 });
    endSortie(j, res);
    // the first sortie beyond opens the chain, with the real shortfall in its ledger
    expect(dueBeat(j)).toBe('story_breach');
    plot(j, options(j)[0]!.to.id);
    expect(j.carry.contract).toEqual({ got: 6 });
  });
});
