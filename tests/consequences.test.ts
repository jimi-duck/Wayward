import { describe, expect, it } from 'vitest';
import { CONSEQUENCES } from '../src/content/consequences';
import { STORY_CARDS } from '../src/content/story';
import { BASE_PRICES } from '../src/content/systems';
import type { SortieResult } from '../src/sim/breakout';
import { arrival, chipsOf, delay, KEYS_NOTED, shift } from '../src/sim/consequences';
import { endSortie, here, newJourney, options, plot, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';

// A story flag goes on doing something, at a price (content/consequences.ts).

function result(j: Journey): SortieResult {
  const r = newRun(1);
  r.escaped = true;
  return {
    ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 40, food: 20, parts: 8, plates: 3 }, run: r,
    calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {},
  };
}

/** A journey in its first system out of Cerro, a lane plotted, with `flags` held. */
function sailing(flags: string[]): Journey {
  const j = newJourney(7);
  endSortie(j, result(j));
  j.carry.flags.push(...flags);
  plot(j, options(j)[0]!.to.id);
  return j;
}

describe('consequences', () => {
  it('belong to flags a story answer sets, each with chips that show a cost', () => {
    const set = new Set(STORY_CARDS.flatMap((c) => c.choices.flatMap((ch) => [ch.win.flag ?? [], ch.lose?.flag ?? []].flat())));
    for (const c of CONSEQUENCES) {
      expect(set.has(c.flag), c.flag).toBe(true);
      expect(c.chips.some((x) => x.startsWith('−')), `${c.flag} has a price`).toBe(true);
      expect(chipsOf(c.flag)).toEqual(c.chips);
    }
  });

  it('give nothing without the flag', () => {
    expect(shift([], { holder: 'holdfast', here: ['drift'], port: true })).toEqual({ plates: 1, heat: 0, ahead: 0 });
    expect(arrival([], { holder: 'holdfast', here: ['drift'], port: true })).toEqual([]);
    expect(delay([])).toBe(0);
  });

  it('make plates free at a Holdfast port and dearer at a Guild port for the Holdfast pact', () => {
    const j = sailing(['pact_holdfast']);
    const s = here(j);
    s.port = { name: 'Test dock', prices: { ...BASE_PRICES } };
    s.holder = 'holdfast';
    expect(sortieDef(j).port!.prices.plate).toBe(0);
    s.holder = 'guild';
    expect(sortieDef(j).port!.prices.plate).toBe(Math.round(BASE_PRICES.plate * 1.25));
    s.holder = 'kellern';
    expect(sortieDef(j).port!.prices.plate).toBe(BASE_PRICES.plate);
    expect(s.port.prices.plate).toBe(BASE_PRICES.plate);
  });

  it('calm the heat near a Drift fleet and send the Gutter harder everywhere else, for the Drift pact', () => {
    const was = sailing([]), pact = sailing(['pact_drift']);
    const base = sortieDef(was), elsewhere = sortieDef(pact);
    expect(elsewhere.gutter).toBeCloseTo(Math.min(0.8, base.gutter + 0.1));
    expect(shift(['pact_drift'], { holder: 'none', here: ['drift'], port: false })).toEqual({ plates: 1, heat: -0.1, ahead: 0 });
  });

  it('send the Gutter harder for the broker, and the Voice’s hunters for the keys', () => {
    expect(shift(['broker'], { holder: 'none', here: [], port: false }).ahead).toBeCloseTo(0.15);
    expect(shift(['lane_keys'], { holder: 'voice', here: [], port: false }).ahead).toBeCloseTo(0.15);
    expect(shift(['lane_keys'], { holder: 'none', here: [], port: false }).ahead).toBe(0);
  });

  it('hold Calloway up at every jump with the keys, and say so once', () => {
    const j = sailing(['lane_keys']);
    const was = j.hunt.delay;
    const out = endSortie(j, result(j));
    expect(j.hunt.delay).toBeGreaterThanOrEqual(was + 1);
    expect(out.lines.some((l) => l.includes('A lane closes behind you'))).toBe(true);
    expect(j.carry.flags).toContain(KEYS_NOTED);
    plot(j, options(j)[0]!.to.id);
    expect(endSortie(j, result(j)).lines.some((l) => l.includes('A lane closes behind you'))).toBe(false);
  });

  it('say in the log where the Holdfast pact bites', () => {
    expect(arrival(['pact_holdfast'], { holder: 'holdfast', here: [], port: true })).toEqual(['Kessel Hold patches your plates for free']);
    expect(arrival(['pact_holdfast'], { holder: 'holdfast', here: [], port: false })).toEqual([]);
  });
});
