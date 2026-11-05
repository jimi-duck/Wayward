import { describe, expect, it } from 'vitest';
import { autoCourse, endSortie, newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import type { SortieResult } from '../src/sim/breakout';
import { World } from '../src/sim/world';
import { guideTarget, sidePlaces } from '../src/sim/guide';
import { places } from '../src/sim/breakout';
import { paintHull } from './paint';
import { BAY_AFTER, BAY_OUT } from '../src/sim/paintbay';
import { lockLifted, painted, paintAt, PAINT_NOTICE, refuelAt, STOLEN, STOLEN_NOTICE, STOLEN_SAM, SUPPLY_DEPOT, AUDIT_DOCK } from '../src/sim/postjump';
import { FIRST_SECURITY_MAX, SECURITY_FROM, SECURITY_TO, SECURITY_GAP, SECURITY_DELAY, TRAFFIC_CLEAR, TRAFFIC_N } from '../src/sim/traffic';
import { goalOf } from '../src/sim/goal';
import { CARD_BY_ID } from '../src/sim/comms';
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
    expect(goalOf(w).goal).toBe('Dock at the company port');
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
    play(w, 60);
    expect(w.flags.has('ship_stolen')).toBe(true);
    // the code sets the call sign only: the course is the paint bay at the depot until she has been there
    expect(w.flags.has('paint_due')).toBe(true);
    expect(guideTarget(w)).toMatchObject({ kind: 'port', name: SUPPLY_DEPOT });
    expect(goalOf(w).goal).toMatch(/repaint/);
    paintHull(w);
    expect(w.flags.has('hull_repainted')).toBe(true);
    expect(guideTarget(w)).toMatchObject({ kind: 'lane', name: 'Jump Gate' });
  });

  it('comes back right from a save: a sortie that starts with the flag already banked leads to the gate', () => {
    const j = past();
    j.carry.flags.push('ship_stolen');
    const w = level(j);
    expect(guideTarget(w)).toMatchObject({ kind: 'lane' });
  });
});

describe('after Sam’s code', () => {
  const custody = (w: World) => w.aliens.filter((a) => !a.ward && !a.escort && !a.extra);
  it('nobody hunts her before the unlock, however long she takes', () => {
    const w = quiet();
    let hunted = 0;
    let calls = 0; // chance cards
    // the old pace sent the first hull 150 s in, while the recovery autopilot still had the helm
    for (let i = 0; i < 400 / STEP; i++) {
      if (w.phase === 'comms') { if (CARD_BY_ID[w.comms!.def.id]?.trigger === undefined || CARD_BY_ID[w.comms!.def.id]?.trigger === 'chance') calls++; w.answer(0); continue; }
      w.ship.invuln = 1; w.step(STEP, input());
      hunted = Math.max(hunted, custody(w).length);
    }
    expect(lockLifted(w.flags)).toBe(false);
    expect(hunted).toBe(0);
    // and no chance card on top of the story here
    expect(calls).toBe(0);
  }, 30000);

  it('then Sam names the depot, the hull is reported stolen, and only then does Custody come', () => {
    const w = quiet();
    run(w, 200);
    w.fuel = 0;
    w.cyrite = 36;
    w.flags.add('ship_stolen');
    expect(w.bk!.docks).toBe(0);
    expect(refuelAt(w)).toBe(true);
    expect(goalOf(w).goal).toBe('Fill the tank: buy fluid at the depot or mine Cyrite');
    const said: string[] = [];
    let firstHull = Infinity;
    const t0 = w.runTime;
    while (w.runTime - t0 < STOLEN.pursuit + 20) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      w.ship.invuln = 1; w.step(STEP, input());
      for (const e of w.events) {
        if (e.type === 'ping' && e.id === 'stolen_sam') said.push(`sam@${Math.round(w.runTime - t0)}`);
        if (e.type === 'storyNotice' && e.headline === STOLEN_NOTICE[0]) said.push(`notice@${Math.round(w.runTime - t0)}`);
      }
      w.events.length = 0;
      if (firstHull === Infinity && custody(w).length) firstHull = w.runTime - t0;
    }
    expect(said).toEqual([`sam@${STOLEN.sam}`, `notice@${STOLEN.notice}`]);
    expect(firstHull).toBeGreaterThanOrEqual(STOLEN.pursuit - 0.1);
    expect(STOLEN_SAM).toMatch(/depot/);
  });

  it('no pursuit banner in the first system: its own notice says it', () => {
    const w = quiet();
    w.flags.add('ship_stolen');
    let banner = false;
    for (let i = 0; i < Math.round(120 / STEP); i++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      w.ship.invuln = 1; w.step(STEP, input());
      if (w.events.some((e) => e.type === 'storyNotice' && /Custody pursuit/.test(e.headline))) banner = true;
      w.events.length = 0;
    }
    expect(banner).toBe(false);
  });

  it('once the tank is full, the gate is the objective again', () => {
    const w = quiet();
    w.flags.add('ship_stolen');
    w.fuel = w.jumpCost;
    expect(refuelAt(w)).toBe(false);
    expect(goalOf(w).goal).toMatch(/Jump Gate/);
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
  it('answers a first hit in this busy yard at once: Wanted to the top, the hull runs, four guards come', () => {
    const w = quiet();
    hurt(w, 0, 0.1);
    expect(w.bk!.heat).toBe(1);
    run(w, SECURITY_DELAY + 0.5);
    expect(w.aliens.filter((a) => a.faction === 'custody' && a.variant === 'picket')).toHaveLength(4);
  });

  it('sends four guards, never closer than the safe distance, and only once a while', () => {
    const w = quiet();
    hurt(w, 0, 0.1);
    hurt(w, 1, 0.1);
    run(w, SECURITY_DELAY + 0.5);
    const g = w.aliens.filter((a) => a.variant === 'picket');
    expect(g).toHaveLength(4);
    for (const a of g) expect(Math.hypot(a.x - w.ship.x, a.z - w.ship.z)).toBeGreaterThanOrEqual(SECURITY_FROM - 4);
    for (const a of g) expect(Math.hypot(a.x - w.ship.x, a.z - w.ship.z)).toBeLessThan(SECURITY_TO + 40);
    // more fire inside the gap calls nobody else
    hurt(w, 2, 0.1);
    run(w, SECURITY_DELAY + 1);
    expect(w.aliens.filter((a) => a.variant === 'picket')).toHaveLength(4);
    run(w, SECURITY_GAP);
    expect(w.traffic!.responders).toBeLessThanOrEqual(FIRST_SECURITY_MAX);
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

describe('the paint bay (owner 2026-11-05)', () => {
  const custody = (w: World) => w.aliens.filter((a) => !a.ward && !a.escort && !a.extra);
  const afterCode = () => { const w = quiet(); w.flags.add('ship_stolen'); w.flags.add('paint_due'); return w; };

  it('old saves with the lock lifted and no paint flag are painted already', () => {
    const w = quiet();
    w.flags.add('ship_stolen');
    expect(painted(w.flags)).toBe(true);
    expect(paintAt(w)).toBe(false);
  });

  it('is the objective after the code: the depot, free, before the tank and before the gate', () => {
    const w = afterCode();
    w.fuel = 0;
    expect(paintAt(w)).toBe(true);
    expect(refuelAt(w)).toBe(false);
    expect(goalOf(w).goal).toBe('Fly to the depot: free repaint at the paint bay');
  });

  it('Ned speaks once the ship comes up on the depot, then the paint goes on, with a notice', () => {
    const w = afterCode();
    const said: string[] = [];
    const p = w.bk!.port!;
    w.ship.x = p.x - 100; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < Math.round(40 / STEP) && !w.flags.has('hull_repainted'); i++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      w.ship.invuln = 1; w.ship.x = Math.min(w.ship.x, p.x - 60); w.step(STEP, input());
      for (const e of w.events) {
        if (e.type === 'ping' && e.id === 'paint_bay') said.push('ned');
        if (e.type === 'storyNotice' && e.headline === PAINT_NOTICE[0]) said.push('notice');
      }
      w.events.length = 0;
    }
    expect(said).toEqual(['ned']);
    expect(w.flags.has('hull_repainted')).toBe(true);
    // the notice goes out in the step that sets the flag
    expect(painted(w.flags)).toBe(true);
    expect(paintAt(w)).toBe(false);
  });

  it('nothing attacks and no swarm comes between the code and the paint, however long she takes', () => {
    const w = afterCode();
    w.bk!.nextPursuit = 0;
    w.bk!.nextSwarm = 0;
    let hulls = 0;
    for (let i = 0; i < Math.round(300 / STEP); i++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      w.ship.invuln = 1; w.step(STEP, input());
      hulls = Math.max(hulls, custody(w).length, w.aliens.filter((a) => a.variant === 'mote').length);
    }
    expect(hulls).toBe(0);
    expect(w.sortie.calm).toBe(true);
  });

  it('the pursuit clock starts at the paint, not at the code', () => {
    const w = afterCode();
    play(w, 120);
    expect(custody(w).length).toBe(0);
    paintHull(w);
    const t0 = w.runTime;
    let first = Infinity;
    while (w.runTime - t0 < STOLEN.pursuit + 20) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      w.ship.invuln = 1; w.step(STEP, input());
      if (first === Infinity && custody(w).length) first = w.runTime - t0;
    }
    // the cut scene's last seconds were already behind her when the helper returned
    expect(first).toBeGreaterThanOrEqual(STOLEN.pursuit - BAY_OUT - BAY_AFTER - 0.1);
  });
});
