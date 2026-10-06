import { describe, expect, it } from 'vitest';
import { lanesFrom, makeChart, regionOf, type Chart, type StarSystem } from '../src/sim/chart';
import { forked, stance } from '../src/sim/lanes';

// A lane reads as a style (sim/lanes.ts): quiet, watched or hostile.

const far = (c: Chart, to: StarSystem, o: { netted?: boolean; shadow?: boolean } = {}) => ({ to, netted: !!o.netted, shadow: !!o.shadow });
const first = (c: Chart, kind: StarSystem['kind']) => c.systems.find((s) => s.kind === kind)!;

describe('a lane’s style', () => {
  const c = makeChart(7);
  it('is quiet for rock and empty crossings, watched for ports and gates, hostile for contested space', () => {
    expect(stance(c, far(c, first(c, 'transit')))).toBe('quiet');
    expect(stance(c, far(c, first(c, 'mining')))).toBe('quiet');
    expect(stance(c, far(c, first(c, 'port')))).toBe('watched');
    expect(stance(c, far(c, first(c, 'gate')))).toBe('watched');
    expect(stance(c, far(c, first(c, 'contested')))).toBe('hostile');
  });

  it('turns hostile where the Net holds, Calloway was last seen, or a raid is on', () => {
    const quiet = first(c, 'transit');
    expect(stance(c, far(c, quiet, { netted: true }))).toBe('hostile');
    expect(stance(c, far(c, quiet, { shadow: true }))).toBe('hostile');
  });

  it('is quiet for a breather, unless the Net has it', () => {
    const port = { ...first(c, 'port'), quiet: true };
    expect(stance(c, far(c, port))).toBe('quiet');
    expect(stance(c, far(c, port, { netted: true }))).toBe('hostile');
  });

  it('makes a fork when lanes differ in style or length, and not when they match', () => {
    const t = first(c, 'transit'), p = first(c, 'port');
    expect(forked(c, [{ ...far(c, t), days: 1 }, { ...far(c, p), days: 1 }])).toBe(true);
    expect(forked(c, [{ ...far(c, t), days: 1 }, { ...far(c, t), days: 2 }])).toBe(true);
    expect(forked(c, [{ ...far(c, t), days: 1 }, { ...far(c, t), days: 1 }])).toBe(false);
    expect(forked(c, [{ ...far(c, t), days: 1 }])).toBe(false);
  });
});

describe('forks on the chart', () => {
  it('come at least twice in the Reach and the Marches, and once in the Hollows, on average', () => {
    const runs = 100, per = [0, 0, 0];
    for (let seed = 1; seed <= runs; seed++) {
      const c = makeChart(seed);
      for (const s of c.systems) {
        if (s.kind === 'home' || s.kind === 'edge') continue;
        const out = lanesFrom(c, s.id).filter(({ to }) => to.col > s.col && regionOf(to) >= regionOf(s) && (s.kind !== 'gate' || regionOf(to) > regionOf(s)));
        if (forked(c, out.map(({ to, route }) => ({ ...far(c, to), days: route.days })))) per[regionOf(s)]!++;
      }
    }
    const avg = per.map((n) => n / runs);
    expect(avg[0]!).toBeGreaterThanOrEqual(2);
    expect(avg[1]!).toBeGreaterThanOrEqual(2);
    expect(avg[2]!).toBeGreaterThanOrEqual(1);
  });
});
