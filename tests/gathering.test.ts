import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { GATHERING } from '../src/content/script/threshold';
import { SCRIPT } from '../src/content/script';
import { newJourney, sortieDef } from '../src/sim/journey';
import { stopAt } from '../src/sim/road';
import { World } from '../src/sim/world';

// The Threshold (living-world plan): everyone she helped comes, as hulls, and lines the lane to the gate.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

function wane(flags: string[]): World {
  const j = newJourney(5, false, 'road');
  const all = j.chart.systems.filter((s) => s.kind !== 'home').sort((a, b) => a.col - b.col);
  const k = all.findIndex((s) => stopAt(j.chart, s)?.script === 'l_wane');
  const line = all.slice(0, k + 1);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'ship_stolen', 'on_road', ...flags);
  return new World(17, { mode: 'breakout', sortie: { ...sortieDef(j), situation: null, calloway: Infinity, place: null }, carry: j.carry });
}

function play(w: World, secs: number): void {
  for (let i = 0; i < secs / STEP; i++) {
    w.ship.invuln = 99; w.ship.vx = w.ship.vz = 0;
    const open = w.comms ?? w.call;
    if (open) w.answer(open.def.choices[0]!.id);
    w.step(STEP, NO);
  }
}

describe('the gathering at the Threshold', () => {
  it('brings each ally on their own line, and every line is in the script', () => {
    const ids = new Set(SCRIPT.map((r) => r.id));
    for (const c of GATHERING) expect(ids.has(c.row)).toBe(true);
  });

  it('brings the ones she built, and lines them up short of the gate, either side of the lane', () => {
    const w = wane(['saints_helped', 'drift_walked']);
    expect(w.gathering).not.toBeNull();
    play(w, 150);
    const g = w.gathering!;
    expect(g.rows.sort()).toEqual(['th_saints', 'th_walk_drift']);
    expect(g.hulls).toHaveLength(6);
    for (const a of g.hulls) expect(a.civil).toBe(true);
    // given time they are in their places: well short of the gate, off the lane
    play(w, 45);
    const lane = w.bk!.lane;
    for (const a of g.hulls) {
      const d = Math.hypot(a.x - lane.x, a.z - lane.z);
      expect(d).toBeGreaterThan(420);
      expect(d).toBeLessThan(700);
    }
  });

  it('brings nobody she did not help', () => {
    const w = wane([]);
    play(w, 90);
    expect(w.gathering!.hulls).toHaveLength(0);
  });
});
