import { describe, expect, it } from 'vitest';
import { JUNO_LOG } from '../src/content/log';
import { GATES, LEGS } from '../src/content/road';
import { DE } from '../src/i18n/de';
import { newJourney, sortieDef } from '../src/sim/journey';

// Juno's log: one line of hers for every stop and gate of the road, on the arrival's title card, with a German twin.

describe('Juno’s log', () => {
  const scripts = [...LEGS.flat().map((r) => r.script).filter((s) => s !== 'audit'), ...GATES.map((g) => g.script)];

  it('has a line for every stop and gate past the audit dock, and none for a place that is not on the road', () => {
    for (const s of scripts) expect(JUNO_LOG[s], s).toBeTruthy();
    for (const k of Object.keys(JUNO_LOG)) expect(scripts, k).toContain(k);
  });

  it('keeps each line short, and gives each a German twin', () => {
    for (const line of Object.values(JUNO_LOG)) {
      expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(13);
      expect(DE[line], line).toBeTruthy();
    }
  });

  it('reaches the sortie on the road, and nowhere else', () => {
    const j = newJourney(5, false, 'road');
    const nf = j.chart.systems.find((s) => s.name === 'Northfold')!;
    j.trail = [j.chart.home, nf.id]; j.at = nf.id; j.status = 'sortie';
    expect(sortieDef(j).log).toBe(JUNO_LOG.northfold);
    const off = newJourney(5, false, 'eight');
    expect(sortieDef(off).log ?? null).toBeNull();
  });
});
