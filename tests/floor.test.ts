import { describe, expect, it } from 'vitest';
import { BREACH_BEAT } from '../src/content/story';
import { CHATTER } from '../src/content/chatter';
import type { SortieResult } from '../src/sim/breakout';
import type { GameEvent } from '../src/sim/events';
import { FLOOR, Floor } from '../src/sim/floor';
import { autoCourse, endSortie, newJourney, sortieDef } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';

// One voice at a time (sim/floor.ts, docs/DESIGN-GUIDELINES.md): the radio and the notices take turns, never over a
// card, with room to read between them and a quiet spell after each card.

const voice = (id: string): GameEvent => ({ type: 'ping', id, from: 'Sam Okoro', caller: 'miners', text: id, moment: 'calm', system: '' });
const signal = (h: string): GameEvent => ({ type: 'storyNotice', tone: 'teal', headline: h });

/** Step a floor for `secs` from `t0`, free unless `busy` says not; what went out, with times. */
function play(f: Floor, t0: number, secs: number, busy = (_t: number) => false) {
  const out: Array<[number, string]> = [];
  for (let i = 0; i <= secs * 60; i++) {
    const t = t0 + i / 60, e = f.step(t, !busy(t));
    if (e) out.push([t, e.type === 'ping' ? e.id : e.headline]);
  }
  return out;
}

describe('the floor', () => {
  it('lets one line out at a time, in order, a voice every FLOOR.gap seconds', () => {
    const f = new Floor();
    const evs = [voice('a'), signal('S'), voice('b'), voice('c')];
    f.take(evs, 0);
    expect(evs).toEqual([]);
    const out = play(f, 0, 60);
    expect(out.map(([, id]) => id)).toEqual(['a', 'S', 'b', 'c']);
    expect(out[2]![0] - out[0]![0]).toBeGreaterThanOrEqual(FLOOR.gap);
    expect(out[3]![0] - out[2]![0]).toBeGreaterThanOrEqual(FLOOR.gap);
  });

  it('says nothing while a card is up, then keeps the quiet window for voices', () => {
    const f = new Floor();
    f.opened(0, 'card');
    f.take([voice('a')], 0);
    expect(play(f, 0, 5)).toEqual([]);
    f.closed(5);
    const [[t]] = play(f, 5, 30) as [[number, string]];
    expect(t).toBeGreaterThanOrEqual(5 + FLOOR.quiet);
    expect(f.mayMoment(5 + FLOOR.moments - 1)).toBe(false);
    expect(f.mayMoment(5 + FLOOR.moments)).toBe(true);
  });

  it('lets a reply to the answer just given out at once, but not a voice made later', () => {
    const f = new Floor();
    f.opened(0, 'card');
    f.closed(5);
    // made 1 s after the card closed: a reply. Made 5 s after: not.
    f.take([voice('reply')], 6);
    const [[t, id]] = play(f, 6, 3) as [[number, string]];
    expect([id, t]).toEqual(['reply', 6]);
    f.take([voice('later')], 10);
    const out = play(f, 10, 30);
    expect(out[0]![0]).toBeGreaterThanOrEqual(5 + FLOOR.quiet);
  });

  it('drops chatter that waited too long, never a story line', () => {
    const f = new Floor();
    f.take([voice(CHATTER[0]!.id), voice('story_1')], 0);
    const out = play(f, 0, 60, (t) => t < FLOOR.stale + 1);
    expect(out.map(([, id]) => id)).toEqual(['story_1']);
  });

  it('holds a card while a story line waits or is on screen', () => {
    const f = new Floor();
    f.take([voice('story_1')], 0);
    expect(f.busy(0)).toBe(true);
    play(f, 0, 1);
    expect(f.holding).toBe(false);
    expect(f.busy(1)).toBe(true);
    expect(f.busy(FLOOR.hold + 0.1)).toBe(false);
  });
});

describe('the first system past Cerro, by the floor', () => {
  /** From the breach through the theft and the archive, idle and unhurt, every card answered. */
  function fly(seed: number, secs = 240) {
    const j = newJourney(seed);
    const r = newRun(1);
    r.escaped = true;
    const res: SortieResult = { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} };
    endSortie(j, res);
    autoCourse(j);
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.skipTraining();
    const idle = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
    const said: GameEvent[] = [];
    for (let i = 0; i < secs * 60; i++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      w.ship.invuln = 1;
      w.step(1 / 60, idle);
      said.push(...w.drain().filter((e) => e.type === 'ping' || e.type === 'storyNotice'));
    }
    return { w, log: w.floor.log, said };
  }

  it.each([1, 4, 7])('seed %i: no two voices close together, none over a card or in its quiet spell, and the story all told', (seed) => {
    const { w, log, said } = fly(seed);
    expect(log.find((l) => l.kind === 'moment')?.id).toBe(BREACH_BEAT);
    let open = false, closed = -Infinity, lastVoice = -Infinity;
    for (const l of log) {
      if (l.kind === 'moment') open = true;
      else if (l.kind === 'close') { open = false; closed = l.t; }
      else {
        expect(open, `${l.id} over a card`).toBe(false);
        if (l.kind === 'voice') {
          // a reply to the card just answered (FLOOR.reply) waits only for the line on screen
          expect(l.t - lastVoice, `${l.id} too soon after the last voice`).toBeGreaterThanOrEqual((l.reply ? FLOOR.hold : FLOOR.gap) - 1e-6);
          if (!l.reply) expect(l.t - closed, `${l.id} inside the quiet after a card`).toBeGreaterThanOrEqual(FLOOR.quiet - 1e-6);
          lastVoice = l.t;
        }
      }
    }
    // nothing of the story left waiting, and every line the player heard went through the floor
    expect(w.floor.holding).toBe(false);
    expect(said.length).toBe(log.filter((l) => l.kind === 'voice' || l.kind === 'signal').length);
  }, 30000);
});

describe('the opening answers at once (tuning, 2026-11-05)', () => {
  const idle = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' as const };
  it('has the raiders and Sam answer a refusal within 10 s, not after the quiet window', () => {
    const j = newJourney(7);
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.train(); w.field.step = () => {};
    w.setLevels({ ...w.levels, tp_bay: 1 });
    w.tutor!.i = 3; w.tutor!.begun = false; w.tutor!.onboard = 1000; w.tutor!.said.push('dispatch'); w.events.length = 0;
    let at = -1;
    for (let i = 0; i < 60 * 60 && w.runTime < 40; i++) {
      if (w.phase === 'comms') { at = w.runTime; w.answer('refuse'); continue; }
      w.ship.invuln = 1; w.step(1 / 60, idle);
    }
    expect(at).toBeGreaterThan(0);
    const voices = w.floor.log.filter((l) => l.kind === 'voice' && l.t > at);
    expect(voices.length).toBeGreaterThanOrEqual(2);
    expect(voices[0]!.t - at, 'the raiders').toBeLessThan(3);
    expect(voices[1]!.t - at, 'Sam on the hold').toBeLessThan(FLOOR.hold + 3);
  }, 30000);
});

describe('lines tied to an event', () => {
  it('go out at once, ahead of the gap and the queue, and are dropped when stale', () => {
    const f = new Floor();
    f.take([voice('story_1')], 0);
    play(f, 0, 1);
    f.take([voice('story_2'), voice('patrol_1')], 2);
    const out = play(f, 2, 8);
    expect(out[0]![1]).toBe('patrol_1');
    expect(out[0]![0]).toBeLessThanOrEqual(FLOOR.hold + 0.1);
    const g = new Floor();
    g.opened(0, 'card');
    g.take([voice('warn_x')], 0);
    g.closed(1);
    expect(play(g, 1, 30).map(([, id]) => id)).toEqual([]);
  });
});

describe('a job\u2019s call', () => {
  it('waits for the line on screen, not for notices and radio lines still queued', () => {
    const f = new Floor();
    const ev: GameEvent[] = [signal('The Wall'), signal('Penny Cross'), voice('story_x')];
    f.take(ev, 10);
    expect(f.busy(10)).toBe(true);
    expect(f.busy(10, true)).toBe(false);
    f.step(10, true);
    expect(f.busy(10.5, true)).toBe(true);
    expect(f.busy(10 + FLOOR.signal + 0.1, true)).toBe(false);
  });
});
