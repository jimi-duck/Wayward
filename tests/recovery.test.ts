import { describe, expect, it } from 'vitest';
import { BREACH_BEAT, OPENING_AT, RENAME_BEAT, SAM_BEAT, WAKE_BEAT } from '../src/content/story';
import { CARD_BY_ID, PORT_CALL } from '../src/sim/comms';
import { owed, ledgerFor } from '../src/sim/contract';
import type { SortieResult } from '../src/sim/breakout';
import { autoCourse, bankAnswer, endSortie, newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { lockLifted } from '../src/sim/postjump';
import { HOLD_R, RECOVERY_FLAG, RECOVERY_T, recovering } from '../src/sim/recovery';
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
    for (let i = 0; i < (RECOVERY_T - 0.5) * 60 && w.phase === 'play'; i++) {
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
    expect(Math.abs(Math.atan2(Math.sin(bearing - w.ship.heading), Math.cos(bearing - w.ship.heading)))).toBeLessThan(0.3);
    expect(bolts).toBe(0);
    expect(w.docked).toBe(false);
    expect(w.auditCalled).toBe(false);
    expect(d1).toBeGreaterThan(Math.min(d0, PORT_CALL));
  });

  it('has Sam on the radio in four beats while Lane Control flies her in', () => {
    const j = beyond();
    const w = breach(j);
    w.events.length = 0;
    const heard: Array<[number, string]> = [];
    for (let i = 0; i < RECOVERY_T * 60 && w.phase === 'play'; i++) {
      w.step(1 / 60, FULL);
      for (const e of w.events) if (e.type === 'ping' && e.from === 'Sam Okoro') heard.push([w.recoverT, e.text]);
      w.events.length = 0;
    }
    expect(heard.map(([, x]) => x)).toEqual(['“They’re calling it a breach. Blaming you for the lost cargo.”', '“Now they want the hauler back—and you sent to the mines.”', '“Let the autopilot fly. Don’t give Lane Control a reason.”', '“Hold on, Juno. I’m working on a way out.”']);
    // spread over the forty seconds, the last well before his channel opens
    expect(heard[1]![0] - heard[0]![0]).toBeGreaterThan(6);
    expect(heard[3]![0]).toBeLessThan(RECOVERY_T - 5);
  });

  it('opens Sam’s channel after forty seconds of play, not before', () => {
    expect(RECOVERY_T).toBe(40);
    const j = beyond();
    const w = breach(j);
    run(w, RECOVERY_T - 0.2);
    expect(w.phase).toBe('play');
    run(w, 0.4);
    expect(w.comms?.def.id).toBe(SAM_BEAT);
    expect(w.comms?.choices.map((c) => c.label)).toEqual(['Input the code']);
  });

  it('does not count time the world is paused', () => {
    const j = beyond();
    const w = breach(j);
    run(w, 4);
    const t = w.recoverT;
    // another card on the table (as a document or a menu would): the world stands still for half a minute
    w.openComms(CARD_BY_ID.audit_hail!);
    for (let i = 0; i < 30 * 60; i++) w.step(1 / 60, FULL);
    expect(w.recoverT).toBe(t);
    w.answer(0);
    run(w, RECOVERY_T - t - 0.3);
    expect(w.phase).toBe('play');
    run(w, 0.5);
    expect(w.comms?.def.id).toBe(SAM_BEAT);
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

describe('the forced recovery across a reload', () => {
  it('during the recovery: still locked, and Sam’s card a moment in, not forty seconds', () => {
    const j = beyond();
    const w0 = breach(j);
    run(w0, 5);
    const w = arrive(j);
    expect(recovering(w.flags)).toBe(true);
    run(w, OPENING_AT + 0.5);
    expect(w.comms?.def.id).toBe(SAM_BEAT);
  });

  it('on Sam’s card: it comes again, and the code is not bypassed', () => {
    const j = beyond();
    const w0 = breach(j);
    run(w0, RECOVERY_T + 0.2);
    expect(w0.comms?.def.id).toBe(SAM_BEAT);
    const w = arrive(j);
    expect(lockLifted(w.flags)).toBe(false);
    run(w, OPENING_AT + 0.5);
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
