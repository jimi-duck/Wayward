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
          expect(l.t - lastVoice, `${l.id} too soon after the last voice`).toBeGreaterThanOrEqual(FLOOR.gap - 1e-6);
          expect(l.t - closed, `${l.id} inside the quiet after a card`).toBeGreaterThanOrEqual(FLOOR.quiet - 1e-6);
          lastVoice = l.t;
        }
      }
    }
    // nothing of the story left waiting, and every line the player heard went through the floor
    expect(w.floor.holding).toBe(false);
    expect(said.length).toBe(log.filter((l) => l.kind === 'voice' || l.kind === 'signal').length);
  }, 30000);
});
