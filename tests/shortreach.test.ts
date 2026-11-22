import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrate } from '../src/meta/save';
import { sysById } from '../src/sim/chart';
import { roadRegion } from '../src/sim/road';
import { VERSION, type Journey } from '../src/sim/journey';

// v25: the Reach went from seven stops to five (Hollis and Vesta cut, Marlow renamed Tallyhouse, Branford Miners' Gap). A road
// save made inside the old Reach comes back on the new one, where it stood or at the stop before a cut one.

/** The road fixture (saved in the Marches, v24), put back to standing at the old Reach's stop of this name. */
function oldAt(name: string): Journey {
  const j = JSON.parse(readFileSync(new URL('./fixtures/road-kessel.json', import.meta.url), 'utf8')) as Journey;
  const k = j.trail.findIndex((id) => sysById(j.chart, id).name === name);
  j.trail = j.trail.slice(0, k + 1);
  j.at = j.trail[k]!;
  j.chart.visited = [...j.trail];
  j.hunt.idx = Math.min(j.hunt.idx, k);
  return j;
}

describe('a save from the seven-stop Reach', () => {
  it.each([
    ['Hollis', 'Halden’s Reach'],
    ['Marlow', 'Tallyhouse'],
    ['Vesta', 'Tallyhouse'],
    ['Branford', 'Miners’ Gap'],
    ['Copperline', 'Copperline'],
  ])('at %s comes back at %s, on the five-stop Reach', (from, to) => {
    const j = migrate(oldAt(from))!;
    expect(j.version).toBe(VERSION);
    expect(roadRegion(j.chart, 0)).toBe(true);
    expect(sysById(j.chart, j.at).name).toBe(to);
    expect(j.trail[j.trail.length - 1]).toBe(j.at);
    expect(new Set(j.trail).size).toBe(j.trail.length);
    expect(j.chart.visited).toContain(j.at);
    expect(j.hunt.idx).toBeLessThan(j.trail.length);
  });

  it('leaves a save past the Narrows as it was', () => {
    const raw = JSON.parse(readFileSync(new URL('./fixtures/road-kessel.json', import.meta.url), 'utf8')) as Journey;
    const at = sysById(raw.chart, raw.at).name;
    const j = migrate(raw)!;
    expect(sysById(j.chart, j.at).name).toBe(at);
    expect(roadRegion(j.chart, 1)).toBe(true);
  });
});
