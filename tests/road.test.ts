import { describe, expect, it } from 'vitest';
import { REGIONS_LONG, REGIONS_ROAD } from '../src/content/regions';
import { ROAD } from '../src/content/road';
import { migrate } from '../src/meta/save';
import { gateOf, lanesFrom, makeChart, regionOf, type Chart } from '../src/sim/chart';
import { hunchOf, RELAY_BROADCAST } from '../src/sim/calloway';
import { newJourney, VERSION } from '../src/sim/journey';
import { dueBeat } from '../src/sim/story';

// The Warden's Road (`?road`): the Reach as one fixed line of stops (docs/ROAD.md).

const reach = (c: Chart) => c.systems.filter((s) => regionOf(s) === 0 && s.kind !== 'home').sort((a, b) => a.col - b.col);

describe('the Reach on the road', () => {
  const c = makeChart(11, 'road');

  it('is one lane per stop, in the order of the table, then the Narrows', () => {
    const line = reach(c);
    expect(line.map((s) => s.kind)).toEqual([...ROAD.map((r) => r.kind), 'gate']);
    expect(line.slice(1, -1).map((s) => s.name)).toEqual(ROAD.slice(1).map((r) => r.name));
    expect(gateOf(c, 0).name).toBe('The Narrows');
    for (const s of line.slice(0, -1)) {
      const on = lanesFrom(c, s.id).filter((l) => l.to.col > s.col);
      expect(on).toHaveLength(1);
      expect(on[0]!.to.col).toBe(s.col + 1);
    }
  });

  it('takes names, kinds, holders, ports and the breather from the rows', () => {
    const line = reach(c);
    ROAD.forEach((r, k) => {
      const s = line[k]!;
      expect(s.kind).toBe(r.kind);
      expect(s.holder).toBe(r.holder);
      expect(!!s.quiet).toBe(!!r.quiet);
      if (r.name) expect(s.name).toBe(r.name);
      if (r.port !== undefined) expect(s.port?.name ?? null).toBe(r.port);
    });
    expect(line.filter((s) => s.quiet).map((s) => s.name)).toEqual(['Vesta']);
  });

  it('keeps names unique and lays the same stops on every seed, with different skies', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const d = makeChart(seed, 'road');
      const names = d.systems.map((s) => s.name);
      expect(new Set(names).size).toBe(names.length);
      expect(reach(d).map((s) => s.name).slice(1, -1)).toEqual(ROAD.slice(1).map((r) => r.name));
    }
    expect(makeChart(11, 'road')).toEqual(c);
    expect(c.regionSet).toBe('road');
  });

  it('plays the other seven regions as the long journey does', () => {
    expect(REGIONS_ROAD.slice(1)).toEqual(REGIONS_LONG.slice(1));
    expect(REGIONS_ROAD[0]!.name).toBe(REGIONS_LONG[0]!.name);
    expect(REGIONS_ROAD[0]!.gate).toBe('The Narrows');
  });
});

describe('jobs on the road', () => {
  it('sits each pinned job on its stop and nowhere else, and deals nothing else in the Reach', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const j = newJourney(seed, false, 'road');
      const q = j.chart.situations!;
      const inReach = j.chart.systems.filter((s) => regionOf(s) === 0);
      for (const s of inReach) {
        const row = ROAD.find((r) => r.name === s.name);
        if (row?.job) expect(q[s.id]).toMatchObject({ id: row.job, arc: true });
        else expect(q[s.id]).toBeUndefined();
      }
      for (const row of ROAD) if (row.job) expect(Object.entries(q).filter(([, v]) => v.id === row.job && inReach.some((s) => q[s.id] === v))).toHaveLength(1);
    }
  });
});

describe('the hunch on the road', () => {
  const c = makeChart(11, 'road');
  const line = reach(c);
  const trail = [c.home, ...line.map((s) => s.id)];

  it('is never "straight" before the relay has broadcast, and always after', () => {
    for (let n = 2; n <= trail.length; n++) {
      expect(hunchOf(c, trail.slice(0, n)).straight).toBe(false);
      expect(hunchOf(c, trail.slice(0, n), [RELAY_BROADCAST]).straight).toBe(true);
    }
  });

  it('is still read from the trail on the long journey', () => {
    const e = makeChart(11, 'eight');
    const t = [e.home, ...e.systems.filter((s) => s.col >= 1 && s.col <= 9).sort((a, b) => a.col - b.col).filter((s, i, all) => all.findIndex((x) => x.col === s.col) === i).map((s) => s.id)];
    expect(hunchOf(e, t, [RELAY_BROADCAST])).toEqual(hunchOf(e, t));
  });
});

describe('saves', () => {
  it('is version 21, and an older journey loads on its own chart with an empty queue', () => {
    expect(VERSION).toBe(21);
    const j = newJourney(7, false, 'eight');
    const old = JSON.parse(JSON.stringify(j));
    old.version = 20;
    delete old.carry.pending;
    const back = migrate(old);
    expect(back?.version).toBe(21);
    expect(back?.chart.regionSet).toBe('eight');
    expect(back?.carry.pending).toEqual([]);
  });

  it('round-trips a road journey', () => {
    const j = newJourney(7, false, 'road');
    const back = migrate(JSON.parse(JSON.stringify(j)));
    expect(back?.chart.regionSet).toBe('road');
    expect(back?.chart.systems.length).toBe(j.chart.systems.length);
  });

  it('hands the Reach to the stops\' script: no region beat to the sortie', () => {
    const j = newJourney(7, false, 'road');
    j.trail.push(reach(j.chart)[1]!.id);
    j.at = reach(j.chart)[1]!.id;
    j.carry.flags.push('archive_woke');
    expect(dueBeat(j)).toBeNull();
  });
});
