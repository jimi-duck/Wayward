import { afterEach, describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { REGIONS } from '../src/content/regions';
import type { InputFrame } from '../src/input/types';
import { layQuiet, lanesFrom, makeChart, netted, sysById } from '../src/sim/chart';
import { endSortie, here, newJourney, plot, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';

// A quiet system is a breather: nothing hunts you, no card calls, the heat fades (docs/SCALE-UP.md, step 2).

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' };

/** A journey out of Cerro and in the first system, with a lane plotted on. */
function inFirstSystem(seed = 7): Journey {
  const j = newJourney(seed);
  const run = newRun(1);
  run.escaped = true;
  endSortie(j, {
    ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 30, supplies: 12, plates: 3 }, run,
    calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {},
  });
  plot(j, lanesFrom(j.chart, j.at)[0]!.to.id);
  return j;
}

/** Fly a sortie with the ship idle: whether any hostile came, whether a card or hail stopped the world, and the heat at the end. */
function fly(j: Journey, seconds: number) {
  const w = new World(j.seed * 31 + 1, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
  let hostiles = 0, stopped = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.step(STEP, idle);
    hostiles = Math.max(hostiles, w.aliens.filter((a) => !a.ward).length);
    if (w.phase === 'comms') { stopped++; for (const c of w.comms!.choices) if (w.answer(c.id)) break; } else if (w.phase === 'hail') { stopped++; w.answerHail(false); }
  }
  return { hostiles, stopped, heat: w.commsCtx().heat };
}

describe('a quiet system', () => {
  const was = REGIONS.map((r) => r.quiet);
  afterEach(() => REGIONS.forEach((r, i) => { r.quiet = was[i]; }));

  it('has no pursuit, no card and a heat that fades', () => {
    const j = inFirstSystem();
    const loud = fly(j, 240);
    expect(loud.hostiles).toBeGreaterThan(0);
    expect(loud.stopped).toBeGreaterThan(0);
    here(j).quiet = true;
    expect(sortieDef(j).quiet).toBe(true);
    const calm = fly(j, 240);
    expect(calm.hostiles).toBe(0);
    expect(calm.stopped).toBe(0);
    expect(calm.heat).toBeLessThan(sortieDef(j).heat);
  });

  it('is not quiet once the Net has reached it', () => {
    const j = inFirstSystem();
    const s = here(j);
    s.quiet = true;
    j.chart.net[s.id] = 1;
    expect(netted(j.chart, s.id)).toBe(true);
    expect(sortieDef(j).quiet).toBe(false);
  });

  it('is dealt from a region quiet row, to mining and transit only, without moving the chart', () => {
    const plain = makeChart(3);
    expect(plain.systems.some((s) => s.quiet)).toBe(false);
    REGIONS.forEach((r) => { r.quiet = 1; });
    const c = makeChart(3);
    for (const s of c.systems) expect(!!s.quiet).toBe(s.kind === 'mining' || s.kind === 'transit');
    expect(c.systems.some((s) => s.quiet)).toBe(true);
    // the same systems and lanes as without
    expect(c.systems.map((s) => [s.id, s.name, s.kind, s.y])).toEqual(plain.systems.map((s) => [s.id, s.name, s.kind, s.y]));
    expect(c.routes).toEqual(plain.routes);
    // dealt again is the same
    const again = makeChart(3);
    layQuiet(again, 3);
    expect(again.systems.map((s) => !!s.quiet)).toEqual(c.systems.map((s) => !!s.quiet));
    void sysById;
  });
});
