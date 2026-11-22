import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { HEARING_IN, HEARING_LAUNCH, SHADOW } from '../src/sim/cordon';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';

// Gilt Market, the Free Ports' set piece: the hearing's witness goes in aboard the Office's Chartered launch, through
// Custody's scan cordon. In the launch's shadow a sweep reads the launch, not her; alone in a sweep, she is seen.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
const GO = { ...NO, thrust: 1 };

function gilt(flags: string[]): Journey {
  const j = newJourney(5, false, 'road');
  const at = j.chart.systems.find((s) => s.name === 'Gilt Market')!;
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= at.col && j.chart.systems.filter((x) => x.col === s.col).length === 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = at.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'ship_stolen', 'on_road', ...flags);
  return j;
}

function world(flags: string[] = [HEARING_LAUNCH]): World {
  const j = gilt(flags);
  const def = sortieDef(j);
  const w = new World(13, { mode: 'breakout', sortie: { ...def, situation: null, thren: 0, calloway: Infinity, place: null }, carry: j.carry });
  w.step(STEP, NO);
  return w;
}

describe('the Registry launch at Gilt Market', () => {
  it('waits for the hearing: no cordon until the witness is aboard', () => {
    expect(world([]).cordon).toBeNull();
    const w = world();
    expect(w.bk!.def.script).toBe('f_gilt');
    expect(w.cordon?.launch).toBeTruthy();
    expect(w.cordon!.hulls).toHaveLength(3);
    expect(w.bk!.nextPursuit).toBeGreaterThan(1e8);
  });

  it('hides her in the launch’s shadow, even burning through a sweep', () => {
    const w = world(), c = w.cordon!, s = w.ship;
    for (let i = 0; i < 6 / STEP; i++) {
      const h = c.hulls[1]!, l = c.launch!;
      // the launch inside a sweep, and her beside it, drive lit
      l.x = h.x - 10; l.z = h.z; s.x = l.x - SHADOW / 2; s.z = l.z; s.vx = s.vz = 0; s.invuln = 99;
      w.step(STEP, GO);
    }
    expect(c.inside).toBe(true);
    expect(c.shaded).toBe(true);
    expect(c.state).toBe('cold');
    expect(c.exposure).toBe(0);
  });

  it('sees her alone in a sweep; the launch still goes in', () => {
    const w = world(), c = w.cordon!, s = w.ship;
    for (let i = 0; i < 8 / STEP && c.state === 'cold'; i++) {
      const h = c.hulls[1]!;
      s.x = h.x - 15; s.z = h.z; s.vx = s.vz = 0; s.invuln = 99;
      c.launch!.x = h.x + 300; c.launch!.z = h.z;
      w.step(STEP, GO);
    }
    expect(c.state).toBe('made');
    expect(w.flags.has('hearing_made')).toBe(true);
    w.step(STEP, NO);
    expect(w.flags.has(HEARING_IN)).toBe(true);
    expect(w.bk!.nextPursuit).toBeLessThan(w.runTime + 5);
  });

  it('is through when she follows the launch past the line', () => {
    const w = world(), c = w.cordon!, s = w.ship;
    for (let i = 0; i < 240 / STEP && c.state === 'cold'; i++) {
      const l = c.launch!;
      // tucked in behind the launch as it walks
      s.x = l.x - 12 * Math.sign(c.past(l.x + 1, l.z) - c.past(l.x, l.z) || 1); s.z = l.z; s.vx = s.vz = 0; s.invuln = 99;
      // a call on the way (the hearing's own lines, the gate's) is answered and the walk goes on
      const open = w.comms ?? w.call;
      if (open) w.answer(open.def.choices[0]!.id);
      w.step(STEP, NO);
    }
    expect(c.state).toBe('through');
    expect(w.flags.has('hearing_cold')).toBe(true);
    w.step(STEP, NO);
    expect(w.flags.has(HEARING_IN)).toBe(true);
  });
});
