import { describe, expect, it } from 'vitest';
import { CARD_BY_ID } from '../src/sim/comms';
import { GATES, LEGS } from '../src/content/road';
import { SCRIPT } from '../src/content/script';
import { courseView } from '../src/sim/course';
import { autoCourse, endSortie, newJourney, options, plot, here, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { scriptKey } from '../src/sim/road';
import type { Row } from '../src/sim/script';

// The story and the chart must name the same jump along the whole road: where a stop's objective, arrival line or the
// Course's "next stop" says she goes next, the chart's one lane out of that system leads there.

/** A road journey standing in system `i` of the chart, in column order, the trail behind it. */
function standing(seed: number, i: number): Journey {
  const j = newJourney(seed, false, 'road');
  const line = [...j.chart.systems].sort((a, b) => a.col - b.col);
  j.trail = line.slice(0, i + 1).map((s) => s.id);
  j.at = line[i]!.id;
  j.status = 'chart';
  j.dest = null;
  return j;
}

/** The system a line names as the jump: "Jump to X", "Next: X · why" (a leading "the" is dropped, as the chart writes it). */
const named = (main: string): string | undefined => {
  const m = /^(?:Jump to|Next:)\s+([^·]+?)\s*(?:·.*)?$/.exec(main);
  return m?.[1]?.replace(/^the /i, '');
};
const bare = (n: string) => n.replace(/^the /i, '');

const lines = (key: string): Array<{ id: string; main: string }> =>
  SCRIPT.filter((r: Row) => r.stop === key && 'objective' in r.do && !!r.do.objective.main && (r.do.objective.main.startsWith('Jump to') || r.do.objective.main.startsWith('Next:')))
    .map((r) => ({ id: r.id, main: (r.do as { objective: { main: string } }).objective.main }));

describe('story jumps follow the chart', () => {
  it('in the first system the goal after Sam\'s code names Northfold, and the gate says the same', () => {
    const j = newJourney(5, false, 'road');
    const r = newRun(1);
    r.escaped = true;
    endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
    autoCourse(j);
    j.carry.flags.push('archive_woke', 'ship_stolen');
    const w = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    w.skipTraining();
    expect(w.bk!.def.dest).toBe('Northfold');
    expect(w.storyGoal().main).toBe('Jump to Northfold');
  });

  it('the first jump out of the audit dock\'s system is Northfold, and the archive says so', () => {
    const j = standing(5, 1);
    expect(options(j).map((o) => o.to.name)).toEqual(['Northfold']);
    expect(courseView(j)!.next.name).toBe('Northfold');
    expect(lines('audit').map((l) => l.main)).toEqual(['Jump to Northfold']);
    const lead = CARD_BY_ID.story_wake!.choices[0]!.label;
    expect(lead).toBe('Let’s do it. How?');
  });

  const total = newJourney(5, false, 'road').chart.systems.length;

  it('lays the road out as Cerro, every leg\'s stops and each leg\'s gate (the last is the Threshold)', () => {
    expect(total).toBe(1 + LEGS.reduce((n, l) => n + l.length, 0) + GATES.length);
  });

  it('every system on the road has exactly one lane out, to the next system in the chart', () => {
    for (let i = 0; i < total - 1; i++) {
      const j = standing(5, i);
      const out = options(j);
      expect(out.map((o) => o.to.col), `lanes out of ${here(j).name}`).toEqual([here(j).col + 1]);
    }
  });

  it('every jump the story names is the system the chart sends her to', () => {
    for (const seed of [1, 5, 9]) {
      for (let i = 1; i < total - 1; i++) {
        const j = standing(seed, i);
        const key = scriptKey(j.chart, here(j));
        const next = options(j)[0]!.to.name;
        for (const l of key ? lines(key) : []) expect(bare(named(l.main) ?? next), `${l.id} at ${here(j).name}: "${l.main}"`).toBe(bare(next));
      }
    }
  });

  it('the Course names the same next stop as the chart, and plotting it flies that lane', () => {
    for (let i = 0; i < total - 1; i++) {
      const j = standing(5, i);
      const c = courseView(j);
      if (!c) continue; // off the road's own stops (the home system)
      const next = options(j)[0]!.to;
      expect(c.next.name, `Course at ${here(j).name}`).toBe(next.name);
      expect(c.to.id).toBe(next.id);
      expect(plot(j, next.id)).toBe(true);
      expect(j.dest).toBe(next.id);
    }
  });

  it('the Course goal is a stop on the road ahead, never behind or off it', () => {
    for (let i = 0; i < total - 1; i++) {
      const j = standing(5, i);
      const c = courseView(j);
      if (!c) continue;
      const ahead = c.road.filter((r) => r.state !== 'done').map((r) => r.name);
      expect(ahead, `goal ${c.aim.name} at ${here(j).name}`).toContain(c.aim.name);
      expect(c.aim.jumps).toBeGreaterThanOrEqual(1);
    }
  });
});
