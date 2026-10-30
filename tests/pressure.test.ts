import { describe, expect, it } from 'vitest';
import { DEBOUNCE, PressureWatch, REARM, wantedPips, type PressureView } from '../src/sim/pressure';

const view = (o: Partial<PressureView> = {}): PressureView => ({ t: 0, heat: 0, cap: 1, elite: false, inbound: false, hunch: [], was: [], behind: Infinity, ...o });

/** Run a view through a tracker at 1 s steps from `t0` and collect every event. */
function run(p: PressureWatch, from: Partial<PressureView>, secs: number, t0 = 0) {
  const out = [];
  for (let i = 0; i < secs; i++) out.push(...p.step(view({ ...from, t: t0 + i })));
  return out;
}

describe('Wanted warnings', () => {
  it('match the HUD\'s four pips', () => {
    expect([0, 0.1, 0.25, 0.26, 0.5, 0.51, 0.75, 0.76, 1].map(wantedPips)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('fire once on climbing into a new pip, naming what to do, and not on arriving hot', () => {
    const p = new PressureWatch();
    expect(run(p, { heat: 0.4 }, 5)).toEqual([]);
    const up = run(p, { heat: 0.6, inbound: true }, 5, 5);
    expect(up).toEqual([{ type: 'wanted', level: 3, inbound: true, act: 'leave' }]);
    expect(run(p, { heat: 0.6 }, 60, 10)).toEqual([]);
    expect(run(p, { heat: 0.8 }, 3, 70)).toEqual([{ type: 'wanted', level: 4, inbound: false, act: 'leave' }]);
  });

  it('says "go quiet" at the second pip and "leave" from the third', () => {
    const p = new PressureWatch();
    p.step(view({ heat: 0.1 }));
    expect(p.step(view({ heat: 0.3, t: 1 }))).toEqual([{ type: 'wanted', level: 2, inbound: false, act: 'quiet' }]);
  });

  it('does not repeat when heat hovers on the edge, and not inside the debounce even after re-arming', () => {
    const p = new PressureWatch();
    p.step(view({ heat: 0.1 }));
    expect(p.step(view({ heat: 0.51, t: 1 }))).toHaveLength(1);
    expect(p.step(view({ heat: 0.5, t: 2 }))).toEqual([]);
    expect(p.step(view({ heat: 0.51, t: 3 }))).toEqual([]);
    // it has to fall properly under the edge to arm again, and then wait out the debounce
    p.step(view({ heat: 0.5 - REARM - 0.01, t: 4 }));
    expect(p.step(view({ heat: 0.51, t: 5 }))).toEqual([]);
    p.step(view({ heat: 0.5 - REARM - 0.01, t: 6 }));
    expect(p.step(view({ heat: 0.51, t: 1 + DEBOUNCE + 1 }))).toHaveLength(1);
  });

  it('announces a bigger pursuit and the first elite once each', () => {
    const p = new PressureWatch();
    p.step(view());
    expect(p.step(view({ cap: 2, t: 1 }))).toEqual([{ type: 'pursuitUp', cap: 2, act: 'leave' }]);
    expect(p.step(view({ cap: 2, t: 2 }))).toEqual([]);
    expect(p.step(view({ cap: 2, elite: true, t: 3 }))).toEqual([{ type: 'eliteSeen', act: 'leave' }]);
    expect(p.step(view({ cap: 2, elite: true, t: 4 }))).toEqual([]);
  });
});

describe("Calloway's warnings", () => {
  it('say what she has read on arriving, once, and not the same read again', () => {
    const p = new PressureWatch();
    const first = p.step(view({ hunch: ['mining'], was: [] }));
    expect(first).toEqual([{ type: 'callowayReads', kind: 'mining', straight: false }]);
    expect(run(p, { hunch: ['mining'], was: [] }, 100, 1)).toEqual([]);
    // a read she already had is not news
    expect(new PressureWatch().step(view({ hunch: ['mining'], was: ['mining'] }))).toEqual([]);
  });

  it('notice flying straight, and a lost trail', () => {
    expect(new PressureWatch().step(view({ hunch: ['straight'], was: [] }))).toEqual([{ type: 'callowayReads', kind: null, straight: true }]);
    expect(new PressureWatch().step(view({ hunch: [], was: ['port'] }))).toEqual([{ type: 'callowayLost' }]);
  });

  it('warn once when she is a jump behind and reads the route, and not when she has no read', () => {
    const p = new PressureWatch();
    const e = p.step(view({ hunch: ['port'], was: ['port'], behind: 1 }));
    expect(e).toEqual([{ type: 'callowayClose', kind: 'port', straight: false }]);
    expect(p.step(view({ hunch: ['port'], was: ['port'], behind: 0, t: 1 }))).toEqual([]);
    expect(new PressureWatch().step(view({ hunch: [], was: [], behind: 1 }))).toEqual([]);
  });

  it('depend on the route and not on local heat: the same heat on different routes gives different events', () => {
    const hot = { heat: 0.6 };
    const a = new PressureWatch(), b = new PressureWatch();
    const seenA = [...a.step(view({ ...hot, hunch: ['mining'], was: [] })), ...a.step(view({ ...hot, hunch: ['mining'], was: [], t: 1 }))];
    const seenB = [...b.step(view({ ...hot, hunch: [], was: ['port'] })), ...b.step(view({ ...hot, hunch: [], was: ['port'], t: 1 }))];
    const calloway = (es: ReturnType<PressureWatch['step']>) => es.filter((e) => e.type.startsWith('calloway'));
    expect(calloway(seenA)).toEqual([{ type: 'callowayReads', kind: 'mining', straight: false }]);
    expect(calloway(seenB)).toEqual([{ type: 'callowayLost' }]);
    // and hotter or cooler ground changes none of hers
    const cool = new PressureWatch().step(view({ heat: 0, hunch: ['mining'], was: [] }));
    expect(calloway(cool)).toEqual(calloway(seenA));
  });
});

describe('in the world', () => {
  it('puts the warnings on World.events for the pilot too, once per crossing', async () => {
    const { World } = await import('../src/sim/world');
    const { STEP } = await import('../src/core/loop');
    const w = new World(3, { mode: 'breakout' });
    w.field.rocks = [];
    w.field.bulwarks = [];
    w.bk!.nextPursuit = Infinity;
    w.cardNext = Infinity;
    const seen: string[] = [];
    const frame = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' as const };
    for (let i = 0; i < 60; i++) { w.step(STEP, frame); w.events.length = 0; }
    w.bk!.heat = 0.6;
    for (let i = 0; i < 120; i++) { w.step(STEP, frame); for (const e of w.events) if (e.type === 'wanted') seen.push(`${e.type}${e.level}`); w.events.length = 0; }
    expect(seen).toEqual(['wanted3']);
  });
});

describe('where she expects you', () => {
  it('matches the kind you keep stopping in, and the step straight at the Threshold, and nothing without a read', async () => {
    const { newJourney } = await import('../src/sim/journey');
    const { expects } = await import('../src/sim/calloway');
    const { jumps, sysById } = await import('../src/sim/chart');
    const j = newJourney(7, false, 'three', 'normal' as never);
    const c = j.chart, from = j.at;
    const routes = c.routes.filter((r) => r.a === from || r.b === from).map((r) => (r.a === from ? r.b : r.a));
    expect(routes.length).toBeGreaterThan(0);
    for (const to of routes) {
      expect(expects(c, from, to, undefined)).toBe(false);
      expect(expects(c, from, to, { kind: null, straight: false })).toBe(false);
      expect(expects(c, from, to, { kind: sysById(c, to).kind, straight: false })).toBe(true);
      expect(expects(c, from, to, { kind: null, straight: true })).toBe(jumps(c, from, c.edge) - jumps(c, to, c.edge) === 1);
    }
  });
});
