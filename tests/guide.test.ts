import { describe, expect, it } from 'vitest';
import { spawnAlien } from '../src/sim/enemies';
import { AHEAD, BEHIND, FIGHT_RANGE, fix, guideTarget, inFight, sayBearing, threats, track } from '../src/sim/guide';
import { topSpeed } from '../src/sim/ship';
import { World } from '../src/sim/world';

// The navigation strip's numbers, flown as the scenarios a pilot meets: the
// objective ahead, turned away, behind, a crowd, a hull circling, top speed
// and a ship sliding tail-first after a break.

const DEG = Math.PI / 180;
/** A point `dist` away at `deg` off the nose (positive left), for a ship at the origin with this heading. */
const at = (heading: number, deg: number, dist: number) => {
  const a = heading + deg * DEG;
  return { x: Math.cos(a) * dist, z: -Math.sin(a) * dist };
};

function story(): World {
  const w = new World(3, { mode: 'breakout' });
  w.ship.x = 0; w.ship.z = 0; w.ship.vx = 0; w.ship.vz = 0;
  return w;
}
function lane(w: World, deg: number, dist: number): void {
  const p = at(w.ship.heading, deg, dist);
  w.bk!.lane.x = p.x; w.bk!.lane.z = p.z;
}
function hull(w: World, kind: 'scout' | 'lancer' | 'freighter', deg: number, dist: number) {
  const p = at(w.ship.heading, deg, dist);
  const a = spawnAlien(kind, w.ship, 0, w.rng, { x: p.x, y: 0, z: p.z });
  w.aliens.push(a);
  return a;
}

describe('the guide: where to go', () => {
  it('names the lane mouth in the Story, ahead and slightly left, as an angle and a distance', () => {
    const w = story();
    lane(w, 30, 240);
    const g = guideTarget(w)!;
    expect(g.kind).toBe('lane');
    const f = fix(w.ship.x, w.ship.z, w.ship.heading, g.x, g.z);
    expect(f.dist).toBeCloseTo(240, 3);
    expect(f.rel / DEG).toBeCloseTo(30, 3);
    expect(sayBearing(f.rel)).toEqual({ word: 'left', deg: 30 });
  });

  it('flips to the right side when the objective is on the right, and is dead ahead inside a few degrees', () => {
    const w = story();
    lane(w, -45, 300);
    const g = guideTarget(w)!;
    expect(sayBearing(fix(0, 0, w.ship.heading, g.x, g.z).rel)).toEqual({ word: 'right', deg: 45 });
    lane(w, 3, 300);
    const h = guideTarget(w)!;
    expect(sayBearing(fix(0, 0, w.ship.heading, h.x, h.z).rel).word).toBe('ahead');
    expect(AHEAD).toBeLessThan(BEHIND);
  });

  it('turning away swings the bearing the other way round, and behind says behind', () => {
    const w = story();
    lane(w, 0, 500);
    const g = guideTarget(w)!;
    const seen: string[] = [];
    for (let turn = 0; turn <= 180; turn += 45) {
      seen.push(sayBearing(fix(0, 0, w.ship.heading + turn * DEG, g.x, g.z).rel).word);
    }
    // turning left takes a thing that was ahead to the right, then right round behind
    expect(seen).toEqual(['ahead', 'right', 'right', 'behind', 'behind']);
    expect(sayBearing(fix(0, 0, w.ship.heading + Math.PI, g.x, g.z).rel).deg).toBe(180);
  });

  it('survives a 180° break: the bearing flips by half a turn in one step and stays in range', () => {
    const w = story();
    lane(w, 20, 400);
    const g = guideTarget(w)!;
    const before = fix(0, 0, w.ship.heading, g.x, g.z).rel;
    const after = fix(0, 0, w.ship.heading + Math.PI, g.x, g.z).rel;
    expect(Math.abs(before - after) % (2 * Math.PI)).toBeCloseTo(Math.PI, 6);
    expect(Math.abs(after)).toBeLessThanOrEqual(Math.PI + 1e-9);
    expect(sayBearing(after).word).toBe('behind');
  });

  it('puts an event ahead of the lane, and the lane back once the clamps or the drive are working', () => {
    const w = story();
    w.encounter = { id: 'distress', x: 100, z: 50, r: 12, done: false, t: 0, dur: 40, progress: 0 } as World['encounter'];
    expect(guideTarget(w)!.kind).toBe('event');
    w.bk!.spool = 1;
    expect(guideTarget(w)!.kind).toBe('lane');
  });

  it('has nothing to lead with in the arcade between events, and nothing once the run is over', () => {
    const a = new World(2);
    expect(guideTarget(a)).toBeNull();
    const w = story();
    w.phase = 'over';
    expect(guideTarget(w)).toBeNull();
  });
});

describe('the guide: who is where', () => {
  it('ranks an armed hull close behind above a far one ahead, and keeps a convoy hull last', () => {
    const w = story();
    const far = hull(w, 'scout', 0, 60);
    const rear = hull(w, 'scout', 175, 40);
    const friend = hull(w, 'freighter', 20, 80);
    const list = threats(w);
    expect(list.map((t) => t.id)).toEqual([rear.id, far.id, friend.id]);
    expect(list[0]!.armed).toBe(true);
    expect(list[2]!.friendly).toBe(true);
    expect(sayBearing(list[0]!.rel).word).toBe('behind');
  });

  it('leaves out hulls past the strip\'s reach and cloaked ones', () => {
    const w = story();
    hull(w, 'scout', 0, 900);
    expect(threats(w)).toEqual([]);
  });

  it('with a crowd, returns at most the asked number, nearest armed first', () => {
    const w = story();
    for (let i = 0; i < 12; i++) hull(w, 'scout', i * 30, 20 + i * 6);
    const list = threats(w, 6);
    expect(list).toHaveLength(6);
    const scores = list.map((t) => t.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('a hull circling the ship sweeps its bearing all the way round at a steady distance', () => {
    const w = story();
    const a = hull(w, 'scout', 0, 45);
    const words = new Set<string>();
    for (let deg = 0; deg < 360; deg += 10) {
      const p = at(w.ship.heading, deg, 45);
      a.x = p.x; a.z = p.z;
      const t = threats(w)[0]!;
      expect(t.dist).toBeCloseTo(45, 3);
      words.add(sayBearing(t.rel).word);
    }
    expect([...words].sort()).toEqual(['ahead', 'behind', 'left', 'right']);
  });
});

describe('the guide: the fight', () => {
  it('is travel with nothing near, a fight once an armed hull is in gun reach, and not for a convoy hull', () => {
    const w = story();
    expect(inFight(w)).toBe(false);
    hull(w, 'freighter', 0, 10);
    expect(inFight(w)).toBe(false);
    hull(w, 'scout', 90, FIGHT_RANGE * 2);
    expect(inFight(w)).toBe(false);
    hull(w, 'scout', 90, FIGHT_RANGE * 0.5);
    expect(inFight(w)).toBe(true);
  });
});

describe('the guide: how the ship is really going', () => {
  it('is silent while nearly still and reads the track off the nose at speed', () => {
    const w = story();
    expect(track(w)).toBeNull();
    const top = topSpeed(w.hull), h = w.ship.heading;
    w.ship.vx = Math.cos(h) * top; w.ship.vz = -Math.sin(h) * top;
    const t = track(w)!;
    expect(t.rel).toBeCloseTo(0, 6);
    expect(t.frac).toBeCloseTo(1, 6);
  });

  it('reads backwards after a break: nose turned half a turn, the track now behind it', () => {
    const w = story();
    const top = topSpeed(w.hull), h = w.ship.heading;
    w.ship.vx = Math.cos(h) * top * 0.6; w.ship.vz = -Math.sin(h) * top * 0.6;
    w.ship.heading = h + Math.PI;
    const t = track(w)!;
    expect(Math.abs(t.rel)).toBeGreaterThan(BEHIND);
    expect(t.frac).toBeCloseTo(0.6, 6);
  });

  it('drifting sideways to the objective: the nose can point at it while the track does not', () => {
    const w = story();
    lane(w, 0, 600);
    const h = w.ship.heading, top = topSpeed(w.hull);
    // sliding to the left at three quarters of top speed
    const a = h + Math.PI / 2;
    w.ship.vx = Math.cos(a) * top * 0.75; w.ship.vz = -Math.sin(a) * top * 0.75;
    const g = guideTarget(w)!;
    expect(sayBearing(fix(0, 0, h, g.x, g.z).rel).word).toBe('ahead');
    expect(track(w)!.rel / DEG).toBeCloseTo(90, 3);
  });
});
