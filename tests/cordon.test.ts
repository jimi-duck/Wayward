import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';

// Kiln, the Belt's set piece: Custody pickets strung across the lane, each sweeping a ring. Coasting through a sweep she stays
// unseen and nobody comes; the drive lit inside one, the cordon sees her, turns, and the chase begins.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
const GO = { ...NO, thrust: 1 };

function kiln(flags: string[] = []): Journey {
  const j = newJourney(5, false, 'road');
  const at = j.chart.systems.find((s) => s.name === 'Kiln')!;
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= at.col && j.chart.systems.filter((x) => x.col === s.col).length === 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = at.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'ship_stolen', ...flags);
  return j;
}

function world(flags: string[] = []): World {
  const j = kiln(flags);
  const def = sortieDef(j);
  return new World(11, { mode: 'breakout', sortie: { ...def, situation: null, thren: 0, calloway: Infinity, place: null }, carry: j.carry });
}

describe('the cordon at Kiln', () => {
  it('strings pickets across the lane, and holds the chase back', () => {
    const w = world();
    expect(w.cordon).not.toBeNull();
    expect(w.cordon!.hulls).toHaveLength(4);
    expect(w.bk!.nextPursuit).toBeGreaterThan(1e8);
    // all four are on the line, across the course
    for (const h of w.cordon!.hulls) expect(Math.abs(w.cordon!.past(h.x, h.z))).toBeLessThan(5);
  });

  it('sees her with the drive lit inside a sweep, and the chase begins', () => {
    const w = world();
    for (let i = 0; i < 1 / STEP; i++) w.step(STEP, NO);
    for (let i = 0; i < 8 / STEP && w.cordon!.state === 'cold'; i++) {
      const h = w.cordon!.hulls[1]!;
      w.ship.x = h.x - 15; w.ship.z = h.z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 99;
      w.step(STEP, GO);
    }
    expect(w.cordon!.state).toBe('made');
    expect(w.flags.has('cordon_made')).toBe(true);
    expect(w.bk!.nextPursuit).toBeLessThan(w.runTime + 5);
  });

  it('lets her through a gap, and nobody comes after her', () => {
    const w = world();
    for (let i = 0; i < 1 / STEP; i++) w.step(STEP, NO);
    const c = w.cordon!, b = w.bk!;
    // between the middle two posts, short of the line, burning for the gate
    const s = w.ship, d = Math.hypot(b.lane.x - c.x, b.lane.z - c.z), ux = (b.lane.x - c.x) / d, uz = (b.lane.z - c.z) / d;
    s.x = c.x - ux * 90; s.z = c.z - uz * 90; s.vx = s.vz = 0; s.heading = Math.atan2(-uz, ux);
    for (let i = 0; i < 12 / STEP && c.state === 'cold'; i++) { s.invuln = 99; w.step(STEP, c.inside ? NO : GO); }
    expect(c.state).toBe('through');
    expect(w.flags.has('cordon_cold')).toBe(true);
    expect(b.nextPursuit).toBeGreaterThan(1e8);
  });

  it('is made when she fires on a picket', () => {
    const w = world();
    w.step(STEP, NO);
    const h = w.cordon!.hulls[0]!;
    w.cordon!.shot(w, h);
    expect(w.cordon!.state).toBe('made');
  });

  it('is not there once Val is paid off', () => {
    expect(world(['vell_paid']).cordon).toBeNull();
  });
});
