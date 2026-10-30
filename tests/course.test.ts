import { describe, expect, it } from 'vitest';
import { ROAD } from '../src/content/road';
import { RELAY_BROADCAST } from '../src/sim/calloway';
import { courseView, onRoad, pursuerOf, toneOf } from '../src/sim/course';
import { halfDays, PURSUIT } from '../src/sim/hunt';
import { newJourney, type Journey } from '../src/sim/journey';
import { sysById } from '../src/sim/chart';

// The Course screen's view (sim/course.ts): three layers, the pursuit in days, the label switch.

/** A road journey standing at stop `i` of the road, with the trail behind it. */
function at(i: number, seed = 5): Journey {
  const j = newJourney(seed, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= i + 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'chart';
  j.dest = null;
  return j;
}

describe('the Course', () => {
  it('shows three layers at Northfold: the Narrows, Halden\'s Reach and Hollis', () => {
    const c = courseView(at(1))!;
    expect(c.goal).toMatchObject({ name: 'The Narrows', jumps: 7 });
    expect(c.next.name).toBe('Halden’s Reach');
    expect(c.after?.name).toBe('Hollis');
    expect(c.to.name).toBe('Halden’s Reach');
  });

  it('ends the layers at the last stop: next is the Narrows, nothing after', () => {
    const c = courseView(at(ROAD.length - 1))!;
    expect(c.goal.jumps).toBe(1);
    expect(c.next.name).toBe('The Narrows');
    expect(c.after).toBeNull();
  });

  it('draws the road as one pip per stop, the Narrows last, with the current one lit', () => {
    const c = courseView(at(3))!;
    expect(c.road.map((r) => r.name)).toEqual([...ROAD.slice(1).map((r) => r.name), 'The Narrows']);
    expect(c.road.map((r) => r.state)).toEqual(['done', 'done', 'here', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead']);
    expect(c.road.filter((r) => r.job)).toHaveLength(3);
  });

  it('is only the road\'s own: no Course off the road; at the Narrows it shows the Marches ahead', () => {
    const three = newJourney(5, false, 'eight');
    expect(onRoad(three)).toBe(false);
    expect(courseView(three)).toBeNull();
    expect(courseView(at(0))).not.toBeNull();
    const j = at(7);
    j.at = j.chart.systems.find((s) => s.kind === 'gate')!.id;
    const c = courseView(j)!;
    expect(c.next.name).toBe('Wake');
    expect(c.goal).toMatchObject({ name: 'The Rift', jumps: 8 });
  });

  it('hides the pursuit while Juno rests at the breather', () => {
    const vesta = at(5);
    expect(sysById(vesta.chart, vesta.at).name).toBe('Vesta');
    expect(courseView(vesta)!.pursuit.hidden).toBe(true);
    expect(courseView(at(4))!.pursuit.hidden).toBe(false);
  });

  it('counts the pursuit to the half day and reads amber at 1 and red at half a day', () => {
    expect(halfDays(1.74)).toBe(1.5);
    expect(halfDays(0.2)).toBe(0);
    expect(halfDays(0.3)).toBe(0.5);
    expect(toneOf(PURSUIT.start)).toBe('calm');
    expect(toneOf(1.5)).toBe('calm');
    expect(toneOf(PURSUIT.amber)).toBe('amber');
    expect(toneOf(0.5)).toBe('red');
    expect(toneOf(0)).toBe('red');
    const c = courseView(at(2))!;
    expect(Number.isInteger(c.pursuit.days * 2)).toBe(true);
  });

  it('names Calloway only once the relay has broadcast, and says so from one helper', () => {
    expect(pursuerOf([])).toBe('custody');
    expect(pursuerOf(['archive_woke'])).toBe('custody');
    expect(pursuerOf([RELAY_BROADCAST])).toBe('calloway');
    const j = at(2);
    expect(courseView(j)!.pursuit.who).toBe('custody');
    j.carry.flags.push(RELAY_BROADCAST);
    expect(courseView(j)!.pursuit.who).toBe('calloway');
  });

  it('changes the goal once Ada is named', () => {
    const j = at(3);
    const before = courseView(j)!.goal.purpose;
    j.carry.flags.push('ada_named');
    expect(courseView(j)!.goal.purpose).not.toBe(before);
  });

  it('reads the cost of the one lane against what is aboard', () => {
    const j = at(2);
    j.carry.fuel = 3;
    const c = courseView(j)!;
    expect(c.fuel.have).toBe(3);
    expect(c.fuel.need).toBeGreaterThan(3);
    expect(c.supplies.need).toBeGreaterThan(0);
  });
});
