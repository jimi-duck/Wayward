import { beforeEach, describe, expect, it } from 'vitest';
import { ENDINGS } from '../src/content/endings';
import type { SortieResult } from '../src/sim/breakout';
import { jumps } from '../src/sim/chart';
import { choices, choose, epilogue, journeyRecord, pending } from '../src/sim/endings';
import { endSortie, newJourney, options, plot, type Journey } from '../src/sim/journey';
import { raise } from '../src/sim/notice';
import { newRun } from '../src/sim/run';
import { loadJourney, saveJourney } from '../src/meta/save';
import { loadProfile, recordJourney } from '../src/meta/profile';

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
});

function result(j: Journey, c: Partial<Journey['carry']> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = true;
  return { ended: 'jumped', time: 60, carry: { ...j.carry, plates: 3, food: 30, parts: 20, cyrite: 20, ...c }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} };
}

/** Fly the shortest way to the Threshold, with the carry changed by `c` on the way. */
function toThreshold(c: Partial<Journey['carry']> = {}, seed = 7): Journey {
  const j = newJourney(seed);
  endSortie(j, result(j, c));
  let guard = 0;
  while (j.status === 'chart' && guard++ < 20) {
    const o = options(j).sort((a, b) => jumps(j.chart, a.to.id, j.chart.edge) - jumps(j.chart, b.to.id, j.chart.edge))[0]!;
    plot(j, o.to.id);
    endSortie(j, result(j, c));
  }
  return j;
}

const open = (j: Journey) => choices(j).filter((c) => c.open).map((c) => c.def.id);

describe('the Threshold', () => {
  beforeEach(() => mem.clear());

  it('ends the journey through, with the file still to choose', () => {
    const j = toThreshold();
    expect(j.status).toBe('over');
    expect(j.end).toBe('through');
    expect(pending(j)).toBe(true);
  });

  it('opens only Vanish for a journey that built nothing', () => {
    expect(open(toThreshold())).toEqual(['vanish']);
  });

  it('opens each ending by what the journey built', () => {
    expect(open(toThreshold({ levels: { md_array: 1 } }))).toContain('broadcast');
    expect(open(toThreshold({ flags: ['freqs'], levels: { md_baffles: 1 } }))).toContain('broadcast');
    expect(open(toThreshold({ standing: { miners: 2, guild: 3 } }))).toContain('unite');
    expect(open(toThreshold({ standing: { miners: 2 } }))).not.toContain('unite');
    expect(open(toThreshold({ flags: ['gutter_friend'] }))).toContain('sell');
    expect(open(toThreshold({ flags: ['calloway_told'] }))).toContain('trade');
    expect(open(toThreshold({ levels: { md_hardpoints: 3 } }))).toContain('seal');
  });

  it('shuts Trade while the Office of Peace is hunting you', () => {
    const j = toThreshold({ flags: ['calloway_told'] });
    expect(open(j)).toContain('trade');
    raise(j.notice, 'office', 1000, j.carry.standing);
    expect(open(j)).not.toContain('trade');
  });

  it('chooses an open ending once, and reads its epilogue for this journey', () => {
    const j = toThreshold({ flags: ['pod'] });
    expect(choose(j, 'broadcast')).toBeNull();
    const lines = choose(j, 'vanish')!;
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.some((l) => l.includes('Ares Drive'))).toBe(true);
    expect(j.ending).toBe('vanish');
    expect(pending(j)).toBe(false);
    expect(choose(j, 'vanish')).toBeNull();
    expect(epilogue(toThreshold(), 'vanish').some((l) => l.includes('Ares Drive'))).toBe(false);
  });

  it('keeps the save until the file is chosen', () => {
    const j = toThreshold();
    saveJourney(j);
    const back = loadJourney()!;
    expect(pending(back)).toBe(true);
    choose(back, 'vanish');
    saveJourney(back);
    expect(loadJourney()).toBeNull();
  });

  it('has six endings, each with a way in and an epilogue', () => {
    expect(ENDINGS.map((e) => e.id)).toEqual(['broadcast', 'unite', 'sell', 'trade', 'seal', 'vanish']);
    for (const e of ENDINGS) {
      expect(e.ways.length).toBeGreaterThan(0);
      expect(e.epilogue.filter((l) => !l.if).length).toBeGreaterThan(1);
    }
  });
});

describe('the Archive', () => {
  beforeEach(() => mem.clear());

  it('keeps journeys, endings, files and people between sessions', () => {
    const j = toThreshold({ flags: ['passengers', 'calloway_told'] });
    choose(j, 'vanish');
    const p = loadProfile();
    expect(p.archive.journeys).toEqual([]);
    recordJourney(p, journeyRecord(j));
    recordJourney(p, journeyRecord(j));
    const q = loadProfile();
    expect(q.archive.journeys.length).toBe(2);
    expect(q.archive.journeys[0]).toMatchObject({ end: 'through', ending: 'vanish' });
    expect(q.archive.endings).toEqual(['vanish']);
    expect(q.archive.files.length).toBe(1);
    expect(q.archive.people).toContain('The Okafor family');
    expect(q.archive.people).toContain('Prefect Idris Calloway');
  });

  it('gives a profile from before the Archive an empty one', () => {
    mem.set('asteroid-blaster.profile.v1', JSON.stringify({ version: 1, earned: [] }));
    expect(loadProfile().archive).toEqual({ journeys: [], endings: [], files: [], people: [], records: [] });
  });
});
