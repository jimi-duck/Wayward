import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { CARD_BY_ID } from '../src/sim/comms';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { SCRIPT } from '../src/content/script';
import { GATES, LEGS, ROAD } from '../src/content/road';

// The Reach on the road: the chapter script plays stop by stop, from data, in a world with a quiet sky.

const NO_INPUT = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/** A road journey standing at stop `i` (0 the audit dock's system) with the trail behind it. */
function at(i: number, seed = 5): Journey {
  const j = newJourney(seed, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= i + 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke');
  j.carry.cyrite = 60;
  return j;
}

interface Played { cards: string[]; says: string[]; notices: string[]; pings: string[] }

/** Fly one stop with a quiet sky for `secs`, answering each story card from `answers` (the first choice otherwise). Carries the ship on. */
function fly(j: Journey, answers: Record<string, string> = {}, secs = 240): Played {
  const def = sortieDef(j);
  const s = { ...def, pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, blockade: false, situation: null, place: null, thren: 0, calloway: Infinity };
  const next = j.carry.fuel;
  void next;
  const w = new World(j.seed * 31 + 7, { mode: 'breakout', sortie: s, carry: j.carry });
  const out: Played = { cards: [], says: [], notices: [], pings: [] };
  for (let i = 0; i < Math.round(secs / STEP); i++) {
    w.step(STEP, NO_INPUT);
    for (const e of w.events) {
      if (e.type === 'comms') out.cards.push(e.id);
      if (e.type === 'ping') out.pings.push(e.text);
      if (e.type === 'storyNotice') out.notices.push(`${e.headline}${e.reason ? ` · ${e.reason}` : ''}`);
    }
    w.events.length = 0;
    if (w.comms) { const id = w.comms.def.id; w.answer(answers[id] ?? w.comms.def.choices[0]!.id); }
  }
  j.carry = w.carry();
  return out;
}

describe('the script', () => {
  it('has unique row ids, real cards, and a stop in the road for every row', () => {
    expect(new Set(SCRIPT.map((r) => r.id)).size).toBe(SCRIPT.length);
    const stops = new Set([...LEGS.flat().map((r) => r.script), ...GATES.map((g) => g.script)]);
    for (const r of SCRIPT) {
      expect(r.stop === '*' || stops.has(r.stop), r.id).toBe(true);
      if ('card' in r.do) expect(CARD_BY_ID[r.do.card], r.id).toBeDefined();
    }
  });
});

describe('Halden’s Reach and Vesta', () => {
  it('hear her out: the account, the order, then her name, in that order', () => {
    const j = at(2);
    const p = fly(j, { story_warden: 'hear', story_handwriting: 'grandmother' });
    expect(p.cards).toEqual(['story_warden', 'story_order', 'story_handwriting']);
    expect(j.carry.flags).toEqual(expect.arrayContaining(['frag_order', 'clue_order_sig', 'ada_named']));
    expect(p.notices).toContain('The Wall · the closing order, signed L. C.');
    expect(p.pings.some((t) => t.includes('Ada left it listening'))).toBe(true);
    expect(j.carry.pending).toEqual([]);
  });

  it('cut her off: no order at Halden’s Reach, her recording at Vesta, and the same flags after', () => {
    const j = at(2);
    const p = fly(j, { story_warden: 'cut' });
    expect(p.cards).toEqual(['story_warden']);
    expect(j.carry.flags).not.toContain('frag_order');
    // jump on to Vesta (stop 5): the recording waits for Juno to settle, and nothing runs on a timer
    const v = at(5);
    v.carry.flags = [...j.carry.flags];
    v.carry.seen = [...j.carry.seen];
    const q = fly(v, {});
    expect(q.cards).toEqual(['ilse_recording']);
    expect(v.carry.flags).toEqual(expect.arrayContaining(['frag_order', 'ada_named', 'clue_order_sig']));
  });

  it('does not play her recording to a player who has the order already', () => {
    const v = at(5);
    v.carry.flags.push('frag_order', 'clue_order_sig', 'ada_named');
    expect(fly(v).cards).toEqual([]);
  });
});

describe('Marlow and Copperline', () => {
  it('Sam’s lines follow the order: with it, L. C. again; without, L. C. means nothing', () => {
    const withOrder = at(4);
    withOrder.carry.flags.push('frag_order', 'clue_order_sig', 'ada_named');
    const a = fly(withOrder, { story_ledger: 'buy' }, 320);
    expect(a.cards).toEqual(['story_ledger']);
    expect(a.pings).toEqual(expect.arrayContaining(['“L. C. again. On the order, and on the money.”', '“Whoever that is, they signed both.”']));
    const without = at(4);
    const b = fly(without, { story_ledger: 'buy' }, 320);
    expect(b.pings).toContain('“L. C. means nothing to me. Remember it anyway.”');
    expect(b.pings).not.toContain('“L. C. again. On the order, and on the money.”');
  });

  it('Brook comes to Copperline whichever way the ledger went', () => {
    const bought = at(7);
    bought.carry.flags.push('brook_met');
    expect(fly(bought, { story_brook_road: 'leave' }, 200).cards).toEqual(['story_brook_road']);
    expect(bought.carry.flags).toContain('brook_taken');
    const declined = at(7);
    declined.carry.flags.push('ledger_declined');
    expect(fly(declined, { story_brook_declined: 'leave' }, 200).cards).toEqual(['story_brook_declined']);
  });
});
