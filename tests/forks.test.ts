import { describe, expect, it } from 'vitest';
import { gateOf, jumps, makeChart, regionOf } from '../src/sim/chart';
import { LANES_SHOWN, forks, gateProgress, goalOf, toGoal, trouble } from '../src/sim/forks';
import { RATION, endSortie, newJourney, options, type Journey } from '../src/sim/journey';
import { stance } from '../src/sim/lanes';
import { budgets, weightFuel } from '../src/sim/budgets';
import { WEB } from '../src/content/web';
import { stockLevels } from '../src/sim/bay';
import { survivalOf } from '../src/content/survival';
import { newRun } from '../src/sim/run';

// The next-jump list reads the journey's own numbers (sim/forks.ts): the lane's
// jump fluid with the weight surcharge, the supplies the crossing eats, and the
// jumps left to the gate counted on the graph.

function arrived(seed = 7, set: 'three' | 'eight' = 'three'): Journey {
  const j = newJourney(seed, false, set);
  const r = newRun(1);
  r.escaped = true;
  endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3, cyrite: 20, supplies: 12 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, });
  return j;
}

describe('the gate', () => {
  it('is counted in jumps on the graph, from every system to the gate of its region', () => {
    for (const set of ['three', 'eight'] as const) {
      const c = makeChart(5, set);
      for (const s of c.systems) {
        const gate = goalOf(c, s.id);
        expect(toGoal(c, s.id, s.id)).toBe(jumps(c, s.id, gate.id));
        expect(toGoal(c, s.id, s.id)).not.toBeNull();
        if (s.id === gate.id) expect(toGoal(c, s.id, s.id)).toBe(0);
      }
    }
  });

  it('turns to the next gate once a gate is passed, and to the Threshold in the last region', () => {
    const c = makeChart(5);
    const first = gateOf(c, 0), second = gateOf(c, 1);
    expect(goalOf(c, first.id).id).toBe(second.id);
    expect(goalOf(c, c.edge).id).toBe(c.edge);
    expect(regionOf(sysById(c, goalOf(c, c.home).id))).toBe(0);
  });

  it('is null where the graph has no way, never a made-up number', () => {
    const c = makeChart(5);
    const at = c.systems.find((s) => s.kind === 'mining')!;
    c.routes = c.routes.filter((r) => r.a !== at.id && r.b !== at.id);
    expect(toGoal(c, at.id, at.id)).toBeNull();
  });

  it('shows the progress through the region from its way in', () => {
    const j = arrived();
    const g = gateProgress(j);
    expect(g.gate.id).toBe(gateOf(j.chart, 0).id);
    expect(g.left).toBe(jumps(j.chart, j.at, g.gate.id));
    expect(g.total).toBe(jumps(j.chart, j.chart.home, g.gate.id));
    expect(g.left!).toBeLessThanOrEqual(g.total!);
  });
});

function sysById(c: ReturnType<typeof makeChart>, id: string) {
  return c.systems.find((s) => s.id === id)!;
}

describe('the next jump', () => {
  it('lists lanes the journey offers, with their own costs', () => {
    const j = arrived();
    const opts = options(j), fs = forks(j);
    for (const f of fs) expect(opts.some((o) => o.to.id === f.to.id)).toBe(true);
    for (const f of fs) {
      const o = opts.find((x) => x.to.id === f.to.id)!;
      expect(f.fuel).toBe(o.fuel);
      expect(f.supplies).toBe(o.supplies);
      expect(f.days).toBe(o.route.days);
      expect(f.supplies).toBe(o.route.days * RATION + survivalOf(j.survival).voyage.wear);
      expect(f.gateAfter).toBe(toGoal(j.chart, j.at, f.to.id));
    }
  });

  it('asks jump fluid with the weight surcharge, not the lane’s base', () => {
    const j = arrived();
    // a build run over the frame's mass rating
    const levels = stockLevels();
    for (const n of WEB) {
      if ((n.draw.mass ?? 0) <= 0) continue;
      levels[n.id] = 1;
      const { use, cap } = budgets(levels);
      if (use.mass > cap.mass + 1) break;
    }
    j.carry.levels = levels;
    const extra = weightFuel(levels);
    expect(extra).toBeGreaterThan(0);
    const o = options(j)[0]!;
    const f = forks(j).find((x) => x.to.id === o.to.id)!;
    expect(f.fuel).toBe(o.route.cyrite + extra);
    expect(f.fuel).toBeGreaterThan(o.route.cyrite);
  });

  it('shows a shortage of jump fluid and leaves the tank alone', () => {
    const j = arrived();
    j.carry.fuel = 3;
    const before = JSON.stringify(j.carry);
    for (const f of forks(j)) expect(f.short).toBe(Math.max(0, f.fuel - 3));
    expect(trouble(j).some((n) => /jump fluid/.test(n.text))).toBe(true);
    expect(JSON.stringify(j.carry)).toBe(before);
  });

  it('names an upside and a trade-off only from what is known, and never goes back to Cerro', () => {
    for (const seed of [3, 7, 11, 19]) {
      const j = arrived(seed);
      for (const f of forks(j)) {
        expect(f.to.kind).not.toBe('home');
        if (f.to.port) expect(f.up?.text).toMatch(/Port/);
        if (f.shadow) expect(f.down?.hot).toBe(true);
        if (f.to.kind === 'contested') expect(f.down?.hot).toBe(true);
      }
    }
  });

  it('is the same on every call for a seed', () => {
    expect(forks(arrived(13)).map((f) => [f.to.id, f.fuel, f.up?.text, f.down?.text])).toEqual(forks(arrived(13)).map((f) => [f.to.id, f.fuel, f.up?.text, f.down?.text]));
  });

  it('shows at most a few lanes, and keeps the way on and the calm way among them', () => {
    for (const set of ['three', 'eight'] as const) {
      for (const seed of [2, 5, 11, 19]) {
        const j = arrived(seed, set), c = j.chart;
        for (const s of c.systems) {
          if (s.kind === 'home' || s.kind === 'edge') continue;
          j.at = s.id;
          const opts = options(j), fs = forks(j);
          if (!opts.length) continue;
          expect(fs.length).toBeLessThanOrEqual(LANES_SHOWN);
          expect(fs.length).toBe(Math.min(opts.length, LANES_SHOWN));
          const best = Math.min(...opts.map((o) => toGoal(c, j.at, o.to.id) ?? 1e9));
          expect(Math.min(...fs.map((f) => f.gateAfter ?? 1e9))).toBe(best);
          const calm = (st: ReturnType<typeof stance>) => (st === 'quiet' ? 0 : st === 'watched' ? 1 : 2);
          expect(Math.min(...fs.map((f) => f.danger))).toBe(Math.min(...opts.map((o) => calm(stance(c, o)))));
          expect(fs.some((f) => f.detour === 0)).toBe(true);
        }
      }
    }
  }, 30000);
});
