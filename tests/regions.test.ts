import { describe, expect, it } from 'vitest';
import { REGIONS_LONG } from '../src/content/regions';
import { migrate } from '../src/meta/save';
import { colsOf, gateOf, jumps, lanesFrom, makeChart, regionCount, regionOf, tierOf } from '../src/sim/chart';
import { act } from '../src/sim/story';
import { endSortie, newJourney } from '../src/sim/journey';
import { newRun } from '../src/sim/run';

// The long journey's chart: eight regions, about 85 stops.

describe('the eight-region chart', () => {
  const c = makeChart(11, 'eight');

  it('is laid out the same for the same seed, and says which regions it has', () => {
    expect(makeChart(11, 'eight')).toEqual(c);
    expect(c.regionSet).toBe('eight');
    expect(makeChart(11).regionSet).toBeUndefined();
    expect(regionCount(c)).toBe(8);
  });

  it('runs from Cerro to the Threshold in about 85 columns, one gate to a region', () => {
    expect(colsOf(c)).toBe(85);
    expect(jumps(c, c.home, c.edge)).toBeGreaterThanOrEqual(84);
    expect(REGIONS_LONG.map((_, i) => gateOf(c, i).name)).toEqual(
      ['The Narrows', 'The Rift', 'The Scrapgate', 'The Slow Door', 'The Breaker', 'The Tollgate', 'The Seam', 'The Threshold']);
    expect(c.systems.length).toBeGreaterThan(180);
  });

  it('gives every system a way in and a way on, and a name of its own', () => {
    for (const s of c.systems) {
      if (s.id !== c.home) expect(c.routes.some((r) => r.a === s.id || r.b === s.id)).toBe(true);
      if (s.id !== c.edge) expect(lanesFrom(c, s.id).some((l) => l.to.col > s.col)).toBe(true);
    }
    const names = c.systems.map((s) => s.name).filter((n) => !REGIONS_LONG.some((r) => r.gate === n) && n !== 'Cerro');
    expect(new Set(names).size).toBe(names.length);
  });

  it('plays the old region tiers: the Hollows and the Last Lanes are the Choice', () => {
    expect(REGIONS_LONG.map((r) => r.tier)).toEqual([0, 1, 1, 1, 1, 1, 2, 2]);
    const hollows = c.systems.find((s) => regionOf(s) === 6)!;
    expect(tierOf(c, regionOf(hollows))).toBe(2);
  });

  it('has breathers, and a journey on it plays, saves and loads', () => {
    expect(c.systems.filter((s) => s.quiet).length).toBeGreaterThan(20);
    const j = newJourney(7, false, 'eight');
    const run = newRun(1);
    run.escaped = true;
    endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 20 }, run, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
    expect(j.status).toBe('chart');
    expect(act(j).n).toBe(2);
    const back = migrate(JSON.parse(JSON.stringify(j)));
    expect(back?.chart.regionSet).toBe('eight');
    expect(back?.chart.systems.length).toBe(j.chart.systems.length);
  });
});
