import { describe, expect, it } from 'vitest';
import { BREACH_BEAT, OPENING_AT, RENAME_BEAT, SAM_BEAT, WAKE_BEAT } from '../src/content/story';
import { CARD_BY_ID, PORT_CALL } from '../src/sim/comms';
import { owed, ledgerFor } from '../src/sim/contract';
import type { SortieResult } from '../src/sim/breakout';
import { autoCourse, bankAnswer, endSortie, newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { lockLifted } from '../src/sim/postjump';
import { HOLD_R, RECOVERY_FLAG, RECOVERY_T, SAM_CALL_R, clearCourse, recovering } from '../src/sim/recovery';
import { postJump } from '../src/sim/postjump';
import { WEATHER, calmWeights, pickEncounter } from '../src/sim/encounters';
import { Rng } from '../src/sim/rng';
import { SHIP_R } from '../src/sim/tuning';
import { World } from '../src/sim/world';

// ── the forced recovery (the opening handover, 2026-10-23, F → G) ─────────
// Lane Control locks the controls and flies the ship toward the audit dock for ten seconds of play, then Sam's channel
// opens once; his code gives the helm back. A reload in the middle picks the same state up from the banked flags.

const FULL = { turn: 1, thrust: 1, aim: null, fire: true, torpedo: false, roll: false, brk: false, device: 'keyboard' as const };

/** The first system past Cerro, with the chain's state as the journey holds it. */
function arrive(j: Journey): World {
  const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
  w.cardNext = Infinity;
  w.bk!.nextPursuit = Infinity;
  w.skipTraining();
  w.field.rocks = [];
  return w;
}

/** A journey one jump out of Cerro, where the chain starts (the post-jump level, with its audit dock). */
function beyond(): Journey {
  const j = newJourney(7);
  const r = newRun(1);
  r.escaped = true;
  const res: SortieResult = { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} };
  endSortie(j, res);
  autoCourse(j);
  return j;
}

/** Play `secs` seconds with the player's hands full on the controls (or until a card stops the world). */
const run = (w: World, secs: number, input = FULL) => {
  for (let t = 0; t < Math.round(secs * 60) && w.phase === 'play'; t++) { w.ship.invuln = 1; w.step(1 / 60, input); }
};

/** Answer the card on the table as the app does: the change is banked into the journey at once. */
function answer(j: Journey, w: World, id: string): void {
  const before = w.carry();
  expect(w.answer(id)).toBe(true);
  bankAnswer(j, before, w.carry());
}

/** To the breach notice, and its answer. */
function breach(j: Journey): World {
  const w = arrive(j);
  run(w, OPENING_AT + 0.5);
  expect(w.comms?.def.id).toBe(BREACH_BEAT);
  answer(j, w, 'proceed');
  return w;
}

/** How far the ship is from the audit dock. */
const fromDock = (w: World) => { const d = w.bk!.audit!; return Math.hypot(d.x - w.ship.x, d.z - w.ship.z); };
/** Fly on until something stops the world (Sam's card), at most `secs` seconds; returns the seconds flown. */
const until = (w: World, secs = 100, each?: () => void) => {
  let t = 0;
  for (; t < secs && w.phase === 'play'; t += 1 / 60) { w.ship.invuln = 1; w.step(1 / 60, FULL); each?.(); }
  return t;
};

describe('the forced recovery', () => {
  it('locks the controls and flies the ship toward the audit dock, without docking or a hail', () => {
    const j = beyond();
    const w = breach(j);
    expect(w.flags.has(RECOVERY_FLAG)).toBe(true);
    expect(j.carry.flags).toContain(RECOVERY_FLAG);
    expect(recovering(w.flags)).toBe(true);
    const dock = w.bk!.audit!;
    const d0 = Math.hypot(dock.x - w.ship.x, dock.z - w.ship.z);
    // full right turn, full throttle and the trigger held: none of it reaches the ship
    let bolts = 0;
    w.events.length = 0;
    while (fromDock(w) > SAM_CALL_R + 3 && w.phase === 'play') {
      // open sky, so the nose is on the dock and not turned aside for rock
      w.field.rocks.length = 0;
      w.step(1 / 60, FULL);
      bolts += w.events.filter((e) => e.type === 'bolt' || e.type === 'torpedo').length;
      w.events.length = 0;
    }
    expect(w.phase).toBe('play');
    expect(w.comms).toBeNull();
    const d1 = Math.hypot(dock.x - w.ship.x, dock.z - w.ship.z);
    expect(d1).toBeLessThan(d0);
    // nose on the dock
    const bearing = Math.atan2(-(dock.z - w.ship.z), dock.x - w.ship.x);
    expect(Math.abs(Math.atan2(Math.sin(bearing - w.ship.heading), Math.cos(bearing - w.ship.heading)))).toBeLessThan(0.5);
    expect(bolts).toBe(0);
    expect(w.docked).toBe(false);
    expect(w.auditCalled).toBe(false);
    expect(d1).toBeGreaterThan(Math.min(d0, PORT_CALL));
  });

  it('has Sam on the radio in two beats while Lane Control flies her in', () => {
    const j = beyond();
    const w = breach(j);
    w.events.length = 0;
    const heard: Array<[number, string]> = [];
    const t = until(w, 100, () => {
      for (const e of w.events) if (e.type === 'ping' && e.from === 'Sam Okoro') heard.push([w.recoverT, e.text]);
      w.events.length = 0;
    });
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    expect(heard.map(([, x]) => x)).toEqual(['“They’re calling it a breach and want the hauler back. Let the autopilot fly.”', '“Hold on, Juno. I’m working on a way out.”']);
    // spread over the run in, the last a few seconds before his channel opens
    expect(heard[1]![0] - heard[0]![0]).toBeGreaterThanOrEqual(10);
    expect(heard[1]![0]).toBeLessThan(t - 3);
  });

  it('opens Sam’s channel 2 km from the dock, not before, about half a minute in', () => {
    expect(SAM_CALL_R).toBe(200);
    expect(HOLD_R).toBeLessThan(SAM_CALL_R);
    const j = beyond();
    const w = breach(j);
    let last = Infinity;
    const t = until(w, 100, () => { if (w.phase === 'play') last = fromDock(w); });
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    expect(w.comms?.choices.map((c) => c.label)).toEqual(['Input the code']);
    // his channel waits for his last line to be read, so the hauler may be held off the dock by then
    expect(last).toBeGreaterThan(HOLD_R - 3);
    expect(fromDock(w)).toBeLessThanOrEqual(SAM_CALL_R);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(RECOVERY_T);
  });

  it('opens it anyway, at the latest, if she is held off the dock', () => {
    const j = beyond();
    const w = breach(j);
    // something holds her where she is
    const t = until(w, 100, () => { w.ship.x = w.prev.x; w.ship.z = w.prev.z; });
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    expect(fromDock(w)).toBeGreaterThan(SAM_CALL_R);
    expect(t).toBeCloseTo(RECOVERY_T, 0);
  });

  it('does not count time the world is paused, and the card still comes at 2 km', () => {
    const j = beyond();
    const w = breach(j);
    run(w, 4);
    const t = w.recoverT;
    // another card on the table (as a document or a menu would): the world stands still for half a minute
    w.openComms(CARD_BY_ID.audit_hail!);
    for (let i = 0; i < 30 * 60; i++) w.step(1 / 60, FULL);
    expect(w.recoverT).toBe(t);
    w.answer(0);
    until(w);
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    expect(fromDock(w)).toBeLessThanOrEqual(SAM_CALL_R);
  });

  it('holds short of the dock however long it runs, and Sam’s card comes once', () => {
    const j = beyond();
    const w = breach(j);
    run(w, RECOVERY_T + 1);
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    // the card has the screen: the hold does not creep on behind it
    const at = { x: w.ship.x, z: w.ship.z };
    for (let i = 0; i < 20 * 60; i++) w.step(1 / 60, FULL);
    expect(Math.hypot(w.ship.x - at.x, w.ship.z - at.z)).toBe(0);
    answer(j, w, 'code');
    expect(w.answer('code')).toBe(false);
    const dock = w.bk!.audit!;
    expect(Math.hypot(dock.x - w.ship.x, dock.z - w.ship.z)).toBeGreaterThan(HOLD_R - 20);
    expect(w.docked).toBe(false);
  });

  it('gives the helm back on the code, and keeps the flag, the unregistered hull and the 80 CR', () => {
    const j = beyond();
    const w = breach(j);
    run(w, RECOVERY_T + 0.2);
    answer(j, w, 'code');
    expect(lockLifted(w.flags)).toBe(true);
    expect(w.flags.has(RECOVERY_FLAG)).toBe(true);
    expect(recovering(w.flags)).toBe(false);
    expect(owed()).toBe(80);
    expect(ledgerFor('rename').find((r) => r.k === 'Registry status')?.v).toBe('Unregistered');
    // the controls are the player's again: a hard right turn turns her
    const h = w.ship.heading;
    run(w, 1);
    expect(w.comms).toBeNull();
    expect(w.ship.heading).toBeLessThan(h - 0.3);
    run(w, 6);
    expect(w.comms?.def.id).toBe(RENAME_BEAT);
    answer(j, w, 'helm');
    run(w, 3);
    expect(w.comms?.def.id).toBe(WAKE_BEAT);
    answer(j, w, 'lead');
    expect(j.carry.flags).toEqual(expect.arrayContaining(['archive_woke', RECOVERY_FLAG, 'ship_stolen']));
    // the autopilot does not come back
    run(w, 20);
    expect(recovering(w.flags)).toBe(false);
    expect(j.carry.seen.filter((s) => s === SAM_BEAT)).toHaveLength(1);
  });
});

describe('the autopilot keeps clear (owner, 23 October 2026)', () => {
  it('turns aside for something dead ahead, and holds the line when the way is clear', () => {
    const s = { x: 0, z: 0, vx: 20, vz: 0 } as Parameters<typeof clearCourse>[0];
    expect(clearCourse(s, 1, 0, [])).toMatchObject({ x: 1, z: 0, danger: 0 });
    const c = clearCourse(s, 1, 0, [{ x: 50, z: 0, r: 12 }]);
    expect(Math.abs(c.z)).toBeGreaterThan(0.3);
    expect(c.danger).toBeGreaterThan(0.3);
    // well off to one side, or behind: no change
    expect(clearCourse(s, 1, 0, [{ x: 50, z: 60, r: 12 }]).z).toBe(0);
    expect(clearCourse(s, 1, 0, [{ x: -60, z: 0, r: 12 }]).z).toBe(0);
  });

  it('gets a big rock out of her lane on the way to the dock without touching it', () => {
    const j = beyond();
    const w = breach(j);
    const dock = w.bk!.audit!;
    const dx = dock.x - w.ship.x, dz = dock.z - w.ship.z, d = Math.hypot(dx, dz);
    // a big rock across the line a little way on
    const rock = w.field.spawn(0, w.ship.x + (dx / d) * 90, w.ship.z + (dz / d) * 90, 0, 0);
    let close = Infinity, hits = 0;
    w.events.length = 0;
    for (let i = 0; i < (RECOVERY_T - 1) * 60 && w.phase === 'play'; i++) {
      w.step(1 / 60, FULL);
      if (w.field.rocks.includes(rock)) close = Math.min(close, Math.hypot(w.ship.x - rock.x, w.ship.z - rock.z) - rock.r * 0.88 - SHIP_R);
      hits += w.events.filter((e) => e.type === 'shipHit').length;
      w.events.length = 0;
    }
    expect(close).toBeGreaterThan(0);
    expect(hits).toBe(0);
    expect(Math.hypot(dock.x - w.ship.x, dock.z - w.ship.z)).toBeLessThan(d - 100);
  });
});

describe('the autopilot just works for the story (owner, 23 October 2026)', () => {
  it('flies straight in through the real rock field on many seeds: no circles, no hits, Sam at 2 km', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const j = beyond();
      const w = new World(seed, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
      w.cardNext = Infinity;
      w.skipTraining();
      for (let t = 0; t < (OPENING_AT + 0.5) * 60 && w.phase === 'play'; t++) w.step(1 / 60, FULL);
      expect(w.comms?.def.id).toBe(BREACH_BEAT);
      answer(j, w, 'proceed');
      // a pack of hostiles on her, and rock thick along the line
      const dock = w.bk!.audit!;
      const d0 = fromDock(w), ux = (dock.x - w.ship.x) / d0, uz = (dock.z - w.ship.z) / d0;
      for (let k = 1; k <= 8; k++) w.field.spawn((k % 2) as 0 | 1, w.ship.x + ux * k * 60 + (k % 3 - 1) * 6, w.ship.z + uz * k * 60, 0, 0);
      let path = 0, hits = 0, turned = 0, last = { x: w.ship.x, z: w.ship.z };
      const h0 = w.ship.heading;
      let prevH = h0;
      w.events.length = 0;
      for (let t = 0; t < RECOVERY_T * 60 && w.phase === 'play'; t++) {
        w.step(1 / 60, FULL);
        path += Math.hypot(w.ship.x - last.x, w.ship.z - last.z); last = { x: w.ship.x, z: w.ship.z };
        turned += Math.abs(Math.atan2(Math.sin(w.ship.heading - prevH), Math.cos(w.ship.heading - prevH))); prevH = w.ship.heading;
        hits += w.events.filter((e) => e.type === 'shipHit').length;
        w.events.length = 0;
      }
      expect(w.comms?.def.id, `seed ${seed}`).toBe(SAM_BEAT);
      expect(fromDock(w), `seed ${seed}`).toBeLessThanOrEqual(SAM_CALL_R);
      expect(hits, `seed ${seed}`).toBe(0);
      // close to the straight line, and never a full turn
      expect(path, `seed ${seed}`).toBeLessThan((d0 - SAM_CALL_R) * 1.4 + 40);
      expect(turned, `seed ${seed}`).toBeLessThan(2 * Math.PI);
    }
  });
});

describe('the autopilot and a bulwark dead ahead', () => {
  it('steers round it without circling, touching it or missing Sam', () => {
    const j = beyond();
    const w = breach(j);
    const dock = w.bk!.audit!;
    const d0 = fromDock(w), ux = (dock.x - w.ship.x) / d0, uz = (dock.z - w.ship.z) / d0;
    const b = { ...w.field.bulwarks[0]!, id: 999_001, x: w.ship.x + ux * 80, z: w.ship.z + uz * 80, vx: 0, vz: 0, r: 12 };
    w.field.bulwarks.push(b);
    let close = Infinity, turned = 0, prevH = w.ship.heading;
    for (let t = 0; t < RECOVERY_T * 60 && w.phase === 'play'; t++) {
      b.vx = 0; b.vz = 0;
      w.step(1 / 60, FULL);
      close = Math.min(close, Math.hypot(w.ship.x - b.x, w.ship.z - b.z) - b.r * 0.88 - SHIP_R);
      turned += Math.abs(Math.atan2(Math.sin(w.ship.heading - prevH), Math.cos(w.ship.heading - prevH))); prevH = w.ship.heading;
    }
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    expect(fromDock(w)).toBeLessThanOrEqual(SAM_CALL_R);
    expect(close).toBeGreaterThan(0);
    expect(turned).toBeLessThan(2 * Math.PI);
  });
});

describe('no anomalies in the first system past Cerro (owner, 23 October 2026)', () => {
  it('deals no weather, as an event or a place, and the sky leaves the ship alone', () => {
    const j = beyond();
    const def = sortieDef(j);
    expect(def.calm).toBe(true);
    expect(postJump({ ...def, place: { name: 'x', text: 'x', plays: 'anomaly' } }).place).toBeNull();
    expect(postJump({ ...def, place: { name: 'x', text: 'x', plays: 'convoy' } }).place?.plays).toBe('convoy');
    const w = new World(9, { mode: 'breakout', sortie: { ...def, calloway: Infinity }, carry: j.carry, space: true });
    w.cardNext = Infinity;
    w.bk!.nextPursuit = Infinity;
    w.skipTraining();
    const weather: string[] = [];
    let reports = 0;
    for (let i = 0; i < 300 * 60; i++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      if (w.phase !== 'play') break;
      w.ship.invuln = 1;
      w.step(1 / 60, { ...FULL, turn: i % 900 < 450 ? 0.2 : -0.2, fire: false });
      if (w.encounter && WEATHER.has(w.encounter.id)) weather.push(w.encounter.id);
      if (w.conditions.length) reports++;
    }
    expect(weather).toEqual([]);
    expect(reports).toBe(0);
  });
});

it('never picks weather from calm weights', () => {
  const rng = new Rng(3);
  const all = new Set(['ion_storm', 'nebula', 'anomaly']);
  for (let i = 0; i < 500; i++) expect(WEATHER.has(pickEncounter(9999, null, all, rng, calmWeights({}))!)).toBe(false);
});

describe('the forced recovery across a reload', () => {
  it('during the recovery: still locked, flown in again, and Sam’s card at 2 km', () => {
    const j = beyond();
    const w0 = breach(j);
    run(w0, 5);
    const w = arrive(j);
    expect(recovering(w.flags)).toBe(true);
    run(w, OPENING_AT + 0.5);
    // not dealt as the system's story beat: the recovery deals it
    expect(w.comms).toBeNull();
    until(w);
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    expect(fromDock(w)).toBeLessThanOrEqual(SAM_CALL_R);
  });

  it('on Sam’s card: it comes again, and the code is not bypassed', () => {
    const j = beyond();
    const w0 = breach(j);
    run(w0, RECOVERY_T + 0.2);
    expect(w0.comms?.def.id).toBe(SAM_BEAT);
    const w = arrive(j);
    expect(lockLifted(w.flags)).toBe(false);
    until(w);
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    answer(j, w, 'code');
    expect(recovering(w.flags)).toBe(false);
  });

  it('on the registry card and after it: no lock, no second debt, no replay', () => {
    const j = beyond();
    const w0 = breach(j);
    run(w0, RECOVERY_T + 0.2);
    answer(j, w0, 'code');
    // loaded before the registry card was answered: it comes again, with the helm free
    const w = arrive(j);
    expect(recovering(w.flags)).toBe(false);
    run(w, OPENING_AT + 0.5);
    expect(w.comms?.def.id).toBe(RENAME_BEAT);
    answer(j, w, 'helm');
    // loaded after it: straight to the archive, never the registry again
    const w2 = arrive(j);
    run(w2, OPENING_AT + 0.5);
    expect(w2.comms?.def.id).toBe(WAKE_BEAT);
    answer(j, w2, 'lead');
    const w3 = arrive(j);
    run(w3, 20);
    expect(w3.comms?.def.id).not.toBe(RENAME_BEAT);
    expect(w3.comms?.def.id).not.toBe(SAM_BEAT);
    expect(owed()).toBe(80);
  });
});
