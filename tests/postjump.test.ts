import { describe, expect, it } from 'vitest';
import { autoCourse, endSortie, newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import type { SortieResult } from '../src/sim/breakout';
import { World } from '../src/sim/world';
import { guideTarget, sidePlaces } from '../src/sim/guide';
import { places } from '../src/sim/breakout';
import { lockLifted, SUPPLY_DEPOT, AUDIT_DOCK } from '../src/sim/postjump';
import { SECURITY_FROM, SECURITY_TO, SECURITY_GAP, SECURITY_DELAY, TRAFFIC_CLEAR, TRAFFIC_N } from '../src/sim/traffic';
import { goalOf } from '../src/sim/goal';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';

// The first system past Cerro (docs/POSTJUMP.md): the course follows the owner lock, the traffic is friendly and
// answers fire fairly, and the level is its own, not any later system.

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) { w.ship.invuln = 1; w.step(STEP, input()); } };

function past(seed = 7): Journey {
  const j = newJourney(seed);
  const r = newRun(1);
  r.escaped = true;
  const res: SortieResult = { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, };
  endSortie(j, res);
  autoCourse(j);
  return j;
}
/** The level with the opening's chain already played, so a test can fly it without cards. */
function quiet(): World {
  const j = past();
  j.carry.flags.push('archive_woke');
  return level(j);
}
function level(j = past()): World {
  const w = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
  w.skipTraining();
  return w;
}
const hulls = (w: World) => (w.traffic as unknown as { hulls: Array<{ al: unknown }> }).hulls;
const hurt = (w: World, i: number, dmg: number) => (w as unknown as { hurtAlien(a: unknown, d: number, s: string, x: number, y: number, z: number): boolean }).hurtAlien(hulls(w)[i]!.al, dmg, 'laser', 0, 0, 0);
/** Fly `seconds`, answering whatever the story puts up with its first choice. */
function play(w: World, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (w.phase === 'comms') { w.answer(0); continue; }
    w.ship.invuln = 1; w.step(STEP, input());
  }
}

describe('the first system past Cerro', () => {
  it('is dealt only to the first jump: a company dock, a depot, a Jump Gate and traffic', () => {
    const def = sortieDef(past());
    expect(def.first).toBe(true);
    expect(def.audit).toBe(AUDIT_DOCK);
    expect(def.port?.name).toBe(SUPPLY_DEPOT);
    expect(def.blockade).toBe(false);
    const w = level();
    expect(places(w.bk!).map((p) => p.name)).toEqual(['Jump Gate', SUPPLY_DEPOT, AUDIT_DOCK]);
    expect(w.traffic).not.toBeNull();
    // no later system is this one
    const j = past();
    j.trail.push('x');
    expect(sortieDef(j).first).toBeFalsy();
  });

  it('puts the depot on the way to the gate: before it, off the line, and the gate stays clear of it', () => {
    const b = level().bk!;
    const along = (p: { x: number; z: number }) => ((p.x - 0) * (b.lane.x) + (p.z) * (b.lane.z)) / (Math.hypot(b.lane.x, b.lane.z) ** 2);
    expect(along(b.port!)).toBeGreaterThan(0.5);
    expect(along(b.port!)).toBeLessThan(1);
    expect(Math.hypot(b.port!.x - b.lane.x, b.port!.z - b.lane.z)).toBeGreaterThan(300);
  });
});

describe('the objective follows the owner lock', () => {
  it('leads to the audit dock until Sam’s code, then to the Jump Gate, and reads the flag alone', () => {
    const w = level();
    expect(lockLifted(w.flags)).toBe(false);
    expect(guideTarget(w)).toMatchObject({ kind: 'audit', name: AUDIT_DOCK });
    expect(goalOf(w).goal).toBe('Head for the audit dock');
    w.flags.add('ship_stolen');
    w.fuel = w.jumpCost;
    expect(guideTarget(w)).toMatchObject({ kind: 'lane', name: 'Jump Gate' });
    expect(goalOf(w).goal).toMatch(/Jump Gate/);
    expect(guideTarget(w)!.kind).not.toBe('audit');
    // the depot stays on the strip
    expect(sidePlaces(w, guideTarget(w)).some((p) => p.kind === 'port')).toBe(true);
  });

  it('flips on the real transition: the chain plays, and only Sam’s code lifts the lock', () => {
    const w = level();
    expect(guideTarget(w)!.kind).toBe('audit');
    // the breach notice is not the code: the course is still the dock
    for (let i = 0; i < 600 && w.phase !== 'comms'; i++) { w.ship.invuln = 1; w.step(STEP, input()); }
    expect(w.phase).toBe('comms');
    expect(guideTarget(w)!.kind).toBe('audit');
    expect(w.flags.has('ship_stolen')).toBe(false);
    play(w, 40);
    expect(w.flags.has('ship_stolen')).toBe(true);
    expect(guideTarget(w)).toMatchObject({ kind: 'lane', name: 'Jump Gate' });
  });

  it('comes back right from a save: a sortie that starts with the flag already banked leads to the gate', () => {
    const j = past();
    j.carry.flags.push('ship_stolen');
    const w = level(j);
    expect(guideTarget(w)).toMatchObject({ kind: 'lane' });
  });
});

describe('the traffic', () => {
  it('fills the sky with unarmed ships, none on top of the ship or inside a ring', () => {
    const w = quiet();
    const t = w.traffic!;
    expect(t.count).toBeGreaterThanOrEqual(TRAFFIC_N - 2);
    for (const a of w.aliens) {
      expect(a.ward?.temper).toBe('meek');
      expect(Math.hypot(a.x - w.ship.x, a.z - w.ship.z)).toBeGreaterThan(TRAFFIC_CLEAR);
      for (const p of places(w.bk!)) expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeGreaterThan(55);
    }
    // the director does not count them as pursuit
    expect(w.aliens.every((a) => a.extra)).toBe(true);
  });

  it('keeps flying its lines for minutes, at different speeds, and tops the sky up', () => {
    const w = quiet();
    const speeds = new Set(w.aliens.map((a) => Math.round(a.spK * 10)));
    expect(speeds.size).toBeGreaterThan(2);
    run(w, 120);
    expect(w.traffic!.count).toBeGreaterThanOrEqual(TRAFFIC_N - 3);
    expect(w.aliens.some((a) => a.ward && Math.hypot(a.vx, a.vz) > 1)).toBe(true);
  });
});

describe('firing on the traffic', () => {
  it('warns on a first hit: the hull runs, nobody is sent', () => {
    const w = quiet();
    const before = w.aliens.length;
    hurt(w, 0, 0.1);
    expect(w.traffic!.responders).toBe(0);
    run(w, SECURITY_DELAY + 2);
    expect(w.aliens.filter((a) => a.faction === 'custody' && a.variant === 'picket')).toHaveLength(0);
    expect(w.aliens.length).toBeGreaterThanOrEqual(before - 1);
  });

  it('sends two guards after a second hit, never closer than the safe distance, and only once a while', () => {
    const w = quiet();
    hurt(w, 0, 0.1);
    hurt(w, 1, 0.1);
    run(w, SECURITY_DELAY + 0.5);
    const g = w.aliens.filter((a) => a.variant === 'picket');
    expect(g).toHaveLength(2);
    for (const a of g) expect(Math.hypot(a.x - w.ship.x, a.z - w.ship.z)).toBeGreaterThanOrEqual(SECURITY_FROM - 4);
    for (const a of g) expect(Math.hypot(a.x - w.ship.x, a.z - w.ship.z)).toBeLessThan(SECURITY_TO + 40);
    // more fire inside the gap calls nobody else
    hurt(w, 2, 0.1);
    run(w, SECURITY_DELAY + 1);
    expect(w.aliens.filter((a) => a.variant === 'picket')).toHaveLength(2);
    run(w, SECURITY_GAP);
    expect(w.traffic!.responders).toBeLessThanOrEqual(4);
  });

  it('is local: ships beyond the scatter do not run', () => {
    const w = quiet();
    const far = w.aliens.filter((a) => a.ward && Math.hypot(a.x - w.aliens[0]!.x, a.z - w.aliens[0]!.z) > 400);
    hurt(w, 0, 0.1);
    expect(far.every((a) => !!a.ward)).toBe(true);
  });
});

describe('the arrival after a jump', () => {
  it('carries no jump state into the level: the veil’s inputs are clear on the first frame', () => {
    const j = past();
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(newJourney(7)), calloway: Infinity }, carry: j.carry });
    w.train();
    w.skipTraining();
    // fly the first sortie out of Cerro's gate
    const b = w.bk!;
    w.ship.x = b.lane.x; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 60 * 12 && w.phase === 'play'; i++) { w.ship.invuln = 1; w.step(STEP, input()); }
    expect(w.phase).toBe('over');
    expect(w.run.escaped).toBe(true);
    // and the next system, started the way the app does it
    w.restart({ mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    expect(w.phase).toBe('play');
    expect(w.run.escaped).toBe(false);
    expect(w.bk!.jumpT).toBe(-1);
  });
});
