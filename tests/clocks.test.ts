import { describe, expect, it } from 'vitest';
import { type SortieResult } from '../src/sim/breakout';
import { gateOf, lanesFrom } from '../src/sim/chart';
import { crossGate, GATE_LEAD, newHunt } from '../src/sim/hunt';
import { endSortie, newJourney, plot, sortieDef, WAITING, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';

// The long journey's clocks: Calloway meets you once a region, starts each region close behind, and a wreck
// with her there is a capture only with the region's chance (docs/SCALE-UP.md, step 4).

function result(j: Journey, o: Partial<SortieResult> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = (o.ended ?? 'jumped') === 'jumped';
  return { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3, cyrite: 40, food: 30, parts: 10 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o };
}

/** A long journey out of Cerro, in the first system with a lane plotted. */
function inFirstSystem(seed = 7): Journey {
  const j = newJourney(seed, false, 'eight');
  endSortie(j, result(j));
  plotAny(j);
  return j;
}

/** Plots the first lane out of here that goes onward. */
function plotAny(j: Journey): void {
  expect(lanesFrom(j.chart, j.at).some((l) => plot(j, l.to.id))).toBe(true);
}

describe('Calloway on the long chart', () => {
  it('meets you once a region, then holds back until the next', () => {
    const j = inFirstSystem();
    j.hunt.idx = j.trail.length - 1;
    expect(sortieDef(j).calloway).toBe(WAITING);
    endSortie(j, result(j, { calloway: true }));
    expect(j.hunt.met).toEqual([0]);
    j.hunt.idx = j.trail.length - 1;
    plotAny(j);
    expect(sortieDef(j).calloway).toBe(Infinity);
  });

  it('is no more than a couple of jumps behind when you leave a gate', () => {
    const h = newHunt();
    const trail = Array.from({ length: 30 }, (_, i) => `s${i}`);
    crossGate(h, trail);
    expect(trail.length - 1 - h.idx).toBe(GATE_LEAD);
    // already closer: she is not pushed back
    h.idx = 28;
    crossGate(h, trail);
    expect(h.idx).toBe(28);
  });

  it('closes up on leaving a gate on the long chart', () => {
    const j = inFirstSystem();
    const gate = gateOf(j.chart, 0);
    j.trail = [j.chart.home, ...j.chart.systems.slice(1, 21).map((x) => x.id), gate.id];
    j.at = gate.id;
    j.status = 'chart';
    plot(j, lanesFrom(j.chart, gate.id).find((l) => l.to.col > gate.col)!.to.id);
    expect(j.hunt.idx).toBeLessThan(5);
    endSortie(j, result(j));
    expect(j.trail.length - 1 - j.hunt.idx).toBeLessThanOrEqual(GATE_LEAD + 1);
  });

  it('captures on a wreck with her there only with the region’s chance, the same way each time', { timeout: 30_000 }, () => {
    const ends = new Map<string, number>();
    for (let seed = 1; seed <= 24; seed++) {
      const j = inFirstSystem(seed);
      const copy = structuredClone(j);
      const kind = endSortie(j, result(j, { ended: 'destroyed', calloway: true })).kind;
      ends.set(kind, (ends.get(kind) ?? 0) + 1);
      expect(endSortie(copy, result(copy, { ended: 'destroyed', calloway: true })).kind).toBe(kind);
    }
    // the Reach's risk is a quarter: some are taken and most are not
    expect(ends.get('captured') ?? 0).toBeGreaterThan(1);
    expect(ends.get('adrift') ?? 0).toBeGreaterThan(10);
  });
});
