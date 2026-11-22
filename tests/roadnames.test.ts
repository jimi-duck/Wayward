import { describe, expect, it } from 'vitest';
import { migrate } from '../src/meta/save';
import { newJourney, type Journey } from '../src/sim/journey';
import { roadRegion } from '../src/sim/road';
import { regionOf } from '../src/sim/chart';
import { ROAD } from '../src/content/road';

// The chart and the story name the same places on every run (owner 2026-11-22): every system on the road has a fixed name,
// the audit dock's system included, whatever the seed.

const names = (seed: number) => newJourney(seed, false, 'road').chart.systems.map((s) => `${s.col}:${s.name}`);

describe('the road’s names', () => {
  it('are the same on every seed, the first system past Cerro included', () => {
    const first = names(1);
    for (const seed of [2, 7, 42, 1234]) expect(names(seed)).toEqual(first);
    const j = newJourney(3, false, 'road');
    const reach = j.chart.systems.filter((s) => regionOf(s) === 0 && s.kind !== 'home' && s.kind !== 'gate').sort((a, b) => a.col - b.col);
    expect(reach.map((s) => s.name)).toEqual(ROAD.map((r) => r.name));
    expect(reach[0]!.name).toBe('Ringhold');
  });

  it('a v25 road save with a dealt first name loads with Ringhold, still on the road', () => {
    const j = JSON.parse(JSON.stringify(newJourney(9, false, 'road'))) as Journey;
    const first = j.chart.systems.filter((s) => regionOf(s) === 0 && s.kind !== 'home').sort((a, b) => a.col - b.col)[0]!;
    first.name = 'Marwick';
    j.version = 25;
    const back = migrate(j)!;
    expect(back.chart.systems.find((s) => s.id === first.id)!.name).toBe('Ringhold');
    expect(roadRegion(back.chart, 0)).toBe(true);
  });
});

describe('the six-stop Marches (v27)', () => {
  /** A road journey whose chart still has Low Harrow after the Long Walk, standing at `name`. */
  function oldMarches(name: string): Journey {
    const j = JSON.parse(JSON.stringify(newJourney(9, false, 'road'))) as Journey;
    const c = j.chart, walk = c.systems.find((s) => s.name === 'The Long Walk')!;
    for (const s of c.systems) if (s.col > walk.col) s.col += 1;
    c.systems.push({ ...walk, id: 'old_harrow', name: 'Low Harrow', col: walk.col + 1, quiet: true });
    const line = c.systems.filter((s) => s.kind !== 'home').sort((a, b) => a.col - b.col);
    const k = line.findIndex((s) => s.name === name);
    j.trail = [c.home, ...line.slice(0, k + 1).map((s) => s.id)];
    j.at = j.trail[j.trail.length - 1]!;
    j.version = 26;
    return j;
  }

  it('a save at Low Harrow comes back at the Long Walk, on the road', () => {
    const j = migrate(oldMarches('Low Harrow'))!;
    expect(roadRegion(j.chart, 1)).toBe(true);
    expect(j.chart.systems.find((s) => s.id === j.at)!.name).toBe('The Long Walk');
    expect(j.chart.systems.some((s) => s.name === 'Low Harrow')).toBe(false);
  });

  it('a save at Kessel Hold stays at Kessel Hold', () => {
    const j = migrate(oldMarches('Kessel Hold'))!;
    expect(j.chart.systems.find((s) => s.id === j.at)!.name).toBe('Kessel Hold');
    expect(roadRegion(j.chart, 1)).toBe(true);
  });
});
