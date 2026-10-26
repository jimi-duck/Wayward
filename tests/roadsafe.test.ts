import { describe, expect, it } from 'vitest';
import { endSortie, newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';

function at(col: number): Journey {
  const j = newJourney(5, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= col).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  return j;
}

describe('the road’s first systems', () => {
  it('have no raiders or chance fights, and a late pursuit', () => {
    for (const col of [1, 2]) {
      const d = sortieDef(at(col));
      expect(d.safe, `col ${col}`).toBe(true);
      expect(d.gutter).toBe(0);
      expect(d.pace!.first).toBeGreaterThanOrEqual(150);
    }
    expect(sortieDef(at(3)).safe).toBeFalsy();
  });

  it('a wreck leaves her in the same system, slightly off course', () => {
    const j = at(3);
    const s = j.at;
    const w = new World(1, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    const res = { ...w.result(), ended: 'destroyed' as const };
    const out = endSortie(j, res);
    expect(out.kind).toBe('adrift');
    expect(j.at).toBe(s);
    expect(j.status).toBe('sortie');
    expect(Math.abs(sortieDef(j).off ?? 0)).toBeGreaterThan(0.1);
  });
});
