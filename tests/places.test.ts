import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { PLACES, PLACE_CHITS, PLACE_CYRITE, type PlaceId, type Reward } from '../src/content/phenomena';
import { TANK_MAX, type SortieResult } from '../src/sim/breakout';
import { layPlaces, makeChart, openShortcut, placeAt, routeBetween, sysById } from '../src/sim/chart';
import { endSortie, newJourney, options, plot, sortieDef, VERSION, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { PLACE_AT, World } from '../src/sim/world';
import { migrate } from '../src/meta/save';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard' });
/** Fly on for `seconds`, letting any call time out. */
const run = (w: World, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (w.phase === 'comms') w.answer(0, true);
    w.step(STEP, input());
  }
};

function result(j: Journey, o: Partial<SortieResult> = {}, c: Partial<Journey['carry']> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = (o.ended ?? 'jumped') === 'jumped';
  return { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3, ...c }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o };
}

/** A journey out of Cerro, in the first system, with a place there of the given kind and reward. */
function atPlace(reward: Reward, id: PlaceId = 'convoy'): Journey {
  const j = newJourney(7);
  endSortie(j, result(j, {}, { cyrite: 20, food: 12, parts: 6 }));
  j.chart.places[j.at] = { id, reward, seen: true, done: false };
  return j;
}

describe('places on the chart', () => {
  it('are dealt the same for a seed, never in Cerro or the Threshold, and only where they fit', () => {
    for (let seed = 1; seed < 60; seed++) {
      const c = makeChart(seed);
      expect(Object.entries(layPlaces(c, seed)).map(([id, p]) => [id, p.id, p.reward])).toEqual(Object.entries(c.places).map(([id, p]) => [id, p.id, p.reward]));
      expect(c.places[c.home]).toBeUndefined();
      expect(c.places[c.edge]).toBeUndefined();
      for (const [id, p] of Object.entries(c.places)) {
        const s = sysById(c, id), d = PLACES[p.id];
        expect(d.kinds).toContain(s.kind);
        expect(s.region ?? 0).toBeGreaterThanOrEqual(d.regions[0]);
        expect(s.region ?? 0).toBeLessThanOrEqual(d.regions[1]);
        expect(p.done).toBe(false);
      }
    }
  });

  it('leave some systems empty, and pay in more than Cyrite across a region', () => {
    let empty = 0, total = 0;
    const rewards = new Set<string>();
    for (let seed = 1; seed < 60; seed++) {
      const c = makeChart(seed);
      const mid = c.systems.filter((s) => s.kind !== 'home' && s.kind !== 'edge');
      total += mid.length;
      empty += mid.filter((s) => !c.places[s.id]).length;
      for (const p of Object.values(c.places)) rewards.add(p.reward);
    }
    expect(empty / total).toBeGreaterThan(0.15);
    expect(empty / total).toBeLessThan(0.6);
    expect([...rewards].sort()).toEqual(['cover', 'cyrite', 'danger', 'favour', 'info', 'parts', 'shortcut']);
  });

  it('show far ones from the start, and the rest once within sight', () => {
    const c = makeChart(3);
    for (const p of Object.values(c.places)) if (PLACES[p.id].far) expect(p.seen).toBe(true);
    const j = newJourney(3);
    endSortie(j, result(j));
    const p = j.chart.places[j.at];
    if (p) expect(p.seen).toBe(true);
  });

  it('are named in the lane list', () => {
    const j = atPlace('cyrite');
    for (const o of options(j)) expect(o.place).toEqual(placeAt(j.chart, o.to.id));
  });
});

describe('a place in a sortie', () => {
  it('plays its event a little after arrival, under its own name', () => {
    const j = atPlace('cyrite');
    const def = sortieDef(j);
    expect(def.place?.name).toBe(PLACES[j.chart.places[j.at]!.id].name);
    const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
    run(w, PLACE_AT - 2);
    expect(w.encounter).toBeNull();
    run(w, 4);
    expect(w.encounter?.place).toBe(def.place!.name);
    expect(w.encounter?.id).toBe(def.place!.plays);
  });

  it('pays when dealt with, once', () => {
    const j = atPlace('cyrite');
    plot(j, options(j)[0]!.to.id);
    const here = j.at, cyrite = 10;
    const out = endSortie(j, result(j, { place: true }, { cyrite }));
    expect(j.chart.places[here]!.done).toBe(true);
    expect(out.lines.some((l) => l.includes(`+${PLACE_CYRITE} Cyrite`))).toBe(true);
    expect(j.carry.cyrite).toBeLessThanOrEqual(TANK_MAX);
  });

  it('does not pay when lost, and is still there', () => {
    const j = atPlace('cyrite');
    plot(j, options(j)[0]!.to.id);
    const here = j.at;
    endSortie(j, result(j, { place: false }));
    expect(j.chart.places[here]!.done).toBe(false);
  });

  it('can open a lane from where you go next', () => {
    const j = atPlace('shortcut', 'gravity_well');
    const dest = options(j)[0]!.to.id;
    plot(j, dest);
    const before = j.chart.routes.length;
    endSortie(j, result(j, { place: true }));
    expect(j.chart.routes.length).toBe(before + 1);
    const r = j.chart.routes[j.chart.routes.length - 1]!;
    expect(r.a).toBe(dest);
    expect(routeBetween(j.chart, dest, r.b)).toBe(r);
    expect(options(j).some((o) => o.to.id === r.b)).toBe(true);
  });

  it('can leave a favour owed', () => {
    const j = atPlace('favour', 'distress');
    plot(j, options(j)[0]!.to.id);
    const chits = j.carry.chits;
    endSortie(j, result(j, { place: true }));
    expect(j.carry.chits).toBe(chits + PLACE_CHITS);
  });
});

describe('shortcuts', () => {
  it('reach further on, and never back to Cerro', () => {
    for (let seed = 1; seed < 30; seed++) {
      const c = makeChart(seed);
      for (const s of c.systems.filter((x) => x.col >= 1 && x.col <= 3)) {
        const to = openShortcut(c, s.id);
        if (!to) continue;
        expect(to.col).toBeGreaterThan(s.col);
        expect(to.kind).not.toBe('home');
      }
    }
  });
});

describe('the save', () => {
  it('gives a version 3 journey the places its seed would have dealt', () => {
    const j = newJourney(9);
    endSortie(j, result(j));
    const raw = JSON.parse(JSON.stringify(j)) as Record<string, unknown> & { chart: Record<string, unknown> };
    raw.version = 3;
    delete raw.chart.places;
    const m = migrate(raw);
    expect(m?.version).toBe(VERSION);
    expect(Object.keys(m!.chart.places)).toEqual(Object.keys(j.chart.places));
    expect(m!.chart.places[m!.at]?.seen ?? true).toBe(true);
  });
});
