import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { dueBeat } from '../src/sim/story';
import { regionOf } from '../src/sim/chart';
import { World } from '../src/sim/world';

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
    for (let i = 0; i < 120 / STEP; i++) {
      w.step(STEP, NO);
      for (const e of w.events) if (e.type === 'comms') cards.push(e.id);
      w.events.length = 0;
      const open = w.comms ?? w.call;
      if (open) w.answer(open.def.id === 'story_warden' ? 'hear' : open.def.choices[0]!.id);
    }
    expect(cards.indexOf('story_warden')).toBe(0);
    expect(cards.slice(0, 3)).toEqual(['story_warden', 'story_order', 'story_handwriting']);
  });

  it('no Reach beat comes back as a missed one past the Narrows', () => {
    const j = at(9);
    const far = j.chart.systems.find((s) => regionOf(s) === 1 && s.kind !== 'gate');
    expect(far).toBeDefined();
    j.at = far!.id;
    j.trail.push(far!.id);
    j.carry.flags.push('brook_met');
    expect(dueBeat(j)).not.toBe('story_brook_arrest');
    expect(dueBeat(j)).not.toBe('story_warden');
  });

  it('the Narrows makes no offer', () => {
    expect(sortieDef(at(9)).nemesis.offer).toBeNull();
  });

  it('the Narrows gate holds until the scene has played, then lets her go', () => {
    const j = at(9);
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
