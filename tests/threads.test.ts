import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { MISSIONS, MISSION_CARDS } from '../src/content/missions';
import { ON_ROAD } from '../src/content/road';
import { newJourney, sortieDef } from '../src/sim/journey';
import { CARD_BY_ID, openCard } from '../src/sim/comms';
import { World } from '../src/sim/world';
import fixture from './fixtures/road-jobs.json';

// The road's first jobs: two spine steps with a chip and a line (Pike's, Hester's replies) and a standalone one (the prospector's).

const NO_INPUT = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;
const IDS = ['nothing_to_declare', 'follow_cyrite', 'pirate_toll'];
const CARDS = ['sc_declare', 'sc_follow', 'sc_toll'];

describe('the threads', () => {
  // a snapshot of the job rework v2 (November 2026): regenerate tests/fixtures/road-jobs.json only on purpose
  it('leave every job’s rules, rewards and endings exactly as the rework set them', () => {
    const now = JSON.parse(JSON.stringify({ missions: MISSIONS.filter((m) => IDS.includes(m.id)), cards: MISSION_CARDS.filter((c) => CARDS.includes(c.id)).map(({ thread, ...c }) => (void thread, c)) }));
    expect(now).toEqual(fixture);
  });

  it('show a chip and a line on the road only', () => {
    const ctx = (flags: string[]) => ({ levels: {}, plates: 4, flags: new Set(flags), cyrite: 60, fuel: 10, need: 5, supplies: 5, heat: 0, standing: {}, fitted: new Set<string>(), notice: {} }) as never;
    for (const id of ['sc_declare', 'sc_toll', 'sc_witness']) {
      const def = CARD_BY_ID[id]!;
      expect(def.thread, id).toBeDefined();
      expect(openCard(def, ctx([ON_ROAD]), { next: () => 0.5, range: () => 0, int: () => 0 } as never).thread).toEqual(def.thread);
      expect(openCard(def, ctx([]), { next: () => 0.5, range: () => 0, int: () => 0 } as never).thread).toBeUndefined();
    }
  });
});

/** A road journey at stop `i`, flown for `secs` with the job kept; `answer` is what each job call is answered with. */
// four minutes: a job call waits 8 s after a card, and every line takes its turn (sim/floor.ts)
function fly(i: number, card: string, answer: string, secs = 240): { pings: string[]; flags: Set<string> } {
  const j = newJourney(5, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= i + 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke');
  const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, blockade: false, thren: 0, calloway: Infinity, place: null };
  const w = new World(9, { mode: 'breakout', sortie: def, carry: j.carry });
  const pings: string[] = [];
  for (let n = 0; n < secs / STEP; n++) {
    w.step(STEP, NO_INPUT);
    w.ship.invuln = 99;
    for (const e of w.events) if (e.type === 'ping') pings.push(e.text);
    w.events.length = 0;
    const o = w.comms ?? w.call;
    if (o) w.answer(o.def.id === card ? answer : o.def.choices[0]!.id);
  }
  return { pings, flags: w.flags };
}

describe('the replies', () => {
  it('Pike answers a refusal and a sale', () => {
    const no = fly(1, 'sc_declare', 'no');
    expect(no.pings).toContain('“No offence taken. The Line’s patient.”');
    const sold = fly(1, 'sc_declare', 'sell');
    expect(sold.pings).toContain('“Custody paid you thirty-five. The hospice paid the rest.”');
    expect(sold.pings).not.toContain('“Medicine through, and nobody saw you. Good. I’ll call again.”');
  });

  it('hester answers a refusal at Branford', () => {
    const no = fly(6, 'sc_toll', 'no');
    expect(no.pings).toContain('“Understood. We’ll find another way. We always do.”');
  });

  it('say nothing off the road', () => {
    const j = newJourney(5, false, 'three');
    expect(j.carry.flags).not.toContain(ON_ROAD);
  });
});
