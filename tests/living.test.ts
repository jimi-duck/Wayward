import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { livingOf } from '../src/sim/living';

// Every stop on the road gets something of its own to meet (docs/SITES.md), not only the ones without a set piece.

describe('living sites on the road', () => {
  const j = newJourney(11, false, 'road');
  const stops = j.chart.systems.filter((s) => s.kind !== 'home' && s.kind !== 'gate').sort((a, b) => a.col - b.col);
  const defs = stops.map((s) => { j.at = s.id; return sortieDef(j); });

  it('gives almost every stop at least one site, set piece or not', () => {
    const has = defs.map((d) => Object.values(livingOf(d)).some(Boolean));
    expect(has.filter(Boolean).length / has.length).toBeGreaterThanOrEqual(0.9);
    expect(defs.some((d) => d.situation && livingOf(d).den)).toBe(true);
  });

  it('is varied: not one kind of site everywhere', () => {
    const kinds = new Set<string>();
    for (const d of defs) for (const [k, v] of Object.entries(livingOf(d))) if (v) kinds.add(k);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
  });

  it('builds what it says', () => {
    const d = defs.find((x) => livingOf(x).den && livingOf(x).barge)!;
    j.at = j.chart.systems.find((s) => s.id === d.system)!.id;
    const w = new World(5, { mode: 'breakout', sortie: d, carry: j.carry });
    expect(w.barge && w.den).toBeTruthy();
  });
});
