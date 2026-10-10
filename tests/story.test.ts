import { describe, expect, it } from 'vitest';
import { BEATS, FRAGMENTS, FRAGMENTS_ALL, STORY_AT, STORY_CARDS, YARD_BEAT } from '../src/content/story';
import type { SortieResult } from '../src/sim/breakout';
import { jumps, viewOf } from '../src/sim/chart';
import { CARD_BY_ID, pickCard, type Ctx } from '../src/sim/comms';
import { choices, epilogue, journeyRecord } from '../src/sim/endings';
import { chipsOf } from '../src/sim/consequences';
import { gains } from '../src/sim/gains';
import { endSortie, newJourney, options, plot, sortieDef, type Journey } from '../src/sim/journey';
import { Rng } from '../src/sim/rng';
import { newRun } from '../src/sim/run';
import { act, actLine, dueBeat, fileCount } from '../src/sim/story';
import { World } from '../src/sim/world';

function result(j: Journey, c: Partial<Journey['carry']> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = true;
  return { ended: 'jumped', time: 60, carry: { ...j.carry, plates: 3, supplies: 30, cyrite: 20, ...c }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} };
}

/** One jump nearer the Threshold. */
function step(j: Journey, c: Partial<Journey['carry']> = {}): void {
  const o = options(j).sort((a, b) => jumps(j.chart, a.to.id, j.chart.edge) - jumps(j.chart, b.to.id, j.chart.edge))[0]!;
  plot(j, o.to.id);
  endSortie(j, result(j, c));
}

const ctx = (o: Partial<Ctx> = {}): Ctx => ({
  t: 400, heat: 0.2, cyrite: 20, fuel: 20, need: 20, tank: 40, chits: 100, plates: 3, maxPlates: 3, levels: {}, flags: new Set(),
  standing: {}, place: 'open', hostiles: 0, supplies: 10, kind: 'transit', netted: false, behind: 3, ...o,
});

const opened = (j: Journey) => choices(j).filter((c) => c.open).map((c) => c.def.id);

describe('the acts', () => {
  it('run Breakout, then the Run out of Cerro, then the Choice from the Hollows', () => {
    const j = newJourney(7);
    expect(act(j).n).toBe(1);
    const out = endSortie(j, result(j));
    expect(act(j).n).toBe(2);
    expect(out.lines[0]).toBe('Act II · The Run');
    let guard = 0, third: string[] = [];
    while (j.status === 'chart' && viewOf(j.chart, j.at) < 2 && guard++ < 20) {
      const o = options(j).sort((a, b) => jumps(j.chart, a.to.id, j.chart.edge) - jumps(j.chart, b.to.id, j.chart.edge))[0]!;
      plot(j, o.to.id);
      third = endSortie(j, result(j)).lines;
    }
    expect(act(j).n).toBe(3);
    expect(third[0]).toBe('Act III · The Choice');
    expect(j.log.some((l) => l.text === 'Act III · The Choice')).toBe(true);
  });

  it('name themselves', () => {
    expect(actLine({ n: 1, name: 'The Breakout' })).toBe('Act I · The Breakout');
    expect(actLine({ n: 3, name: 'The Choice' })).toBe('Act III · The Choice');
  });
});

describe('the story beats', () => {
  it('are real cards, never dealt by chance', () => {
    for (const card of [YARD_BEAT, ...BEATS.map((b) => b.card)]) expect(CARD_BY_ID[card]?.trigger, card).toBe('story');
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = pickCard(ctx(), seen, new Rng(i));
      expect(c?.trigger ?? 'chance').toBe('chance');
    }
  });

  it('come one a sortie: the yard’s call in Cerro, this region’s first, and a missed one later', () => {
    const j = newJourney(7);
    expect(dueBeat(j)).toBe(YARD_BEAT);
    expect(sortieDef(j).story).toBe(YARD_BEAT);
    j.carry.seen.push(YARD_BEAT);
    expect(dueBeat(j)).toBeNull();
    endSortie(j, result(j));
    expect(dueBeat(j)).toBe('story_warden');
    expect(sortieDef(j).story).toBe('story_warden');
    j.carry.seen.push('story_warden');
    expect(dueBeat(j)).toBe('story_ledger');
    // in the Marches with the ledger missed: the Marches' own beat first, then the ledger
    j.carry.seen = ['story_warden'];
    while (j.status === 'chart' && viewOf(j.chart, j.at) < 1) step(j, { seen: ['story_warden'] });
    expect(dueBeat(j)).toBe('story_moot');
    j.carry.seen.push('story_moot', 'story_drift', 'story_broker');
    expect(dueBeat(j)).toBe('story_ledger');
    j.carry.seen.push('story_ledger');
    expect(dueBeat(j)).toBeNull();
  });

  it('play a little after arrival, once', () => {
    const j = newJourney(7);
    endSortie(j, result(j));
    const def = sortieDef(j);
    const w = new World(5, { mode: 'breakout', sortie: { ...def, calloway: Infinity, place: null, notice: { ...def.notice, captain: null } }, carry: j.carry });
    w.cardNext = Infinity;
    w.portCalled = true;
    w.bk!.nextPursuit = Infinity;
    w.field.rocks = [];
    const run = (secs: number) => { for (let t = 0; t < secs * 60 && w.phase === 'play'; t++) { w.ship.invuln = 1; w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' }); } };
    run(STORY_AT - 2);
    expect(w.phase).not.toBe('comms');
    run(4);
    expect(w.comms?.def.id).toBe('story_warden');
    w.answer('hear');
    expect(w.result().carry.flags).toContain('frag_order');
    run(30);
    expect(w.comms?.def.id).not.toBe('story_warden');
    expect(w.result().carry.seen).toContain('story_warden');
  });

  it('open with the yard’s call in Cerro, whose answers set the first lane up', () => {
    const play = (answer: string) => {
      const j = newJourney(7);
      const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
      w.cardNext = Infinity;
      w.bk!.nextPursuit = Infinity;
      w.field.rocks = [];
      for (let t = 0; t < (STORY_AT + 2) * 60 && w.phase === 'play'; t++) { w.ship.invuln = 1; w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' }); }
      expect(w.comms?.def.id).toBe(YARD_BEAT);
      const before = w.result().carry;
      w.answer(answer);
      return { before, after: w.result().carry };
    };
    const fuel = play('fuel');
    expect(fuel.after.fuel).toBe(Math.min(40, fuel.before.fuel + 14));
    expect(fuel.after.cyrite).toBe(fuel.before.cyrite);
    const codes = play('codes');
    expect(codes.after.flags).toContain('codes');
    expect(codes.after.supplies).toBe(codes.before.supplies - 4);
    expect(codes.after.seen).toContain(YARD_BEAT);
  });

  it('show what each answer gives before any other chip', () => {
    for (const c of STORY_CARDS) {
      const story = c.choices.filter((ch) => [ch.win.flag ?? []].flat().length);
      for (const ch of story) {
        const named = [ch.win.flag ?? []].flat().flatMap((f) => chipsOf(f) ?? []);
        expect([...named, 'File +1', 'Copy out', 'Forged codes'], `${c.id}.${ch.id}`).toContain(gains(ch.win, ctx(), 0)[0]);
      }
    }
  });
});

describe('the file', () => {
  it('counts its pieces', () => {
    expect(fileCount(['frag_order', 'codes', 'frag_keys'])).toEqual({ found: 2, of: FRAGMENTS.length });
  });

  it('opens endings at the Threshold', () => {
    const through = (flags: string[]) => {
      const j = newJourney(7);
      endSortie(j, result(j, { flags }));
      let guard = 0;
      while (j.status === 'chart' && guard++ < 20) step(j, { flags });
      return j;
    };
    expect(opened(through([]))).toEqual(['vanish']);
    expect(opened(through(['frag_order', 'frag_ledger', 'frag_manifests', 'frag_keys']))).toContain('broadcast');
    expect(opened(through(['frag_order', 'frag_ledger', 'frag_manifests']))).not.toContain('broadcast');
    expect(opened(through(['voice_read']))).toContain('broadcast');
    expect(opened(through(['pact_holdfast', 'pact_drift']))).toContain('unite');
    expect(opened(through(['pact_holdfast']))).not.toContain('unite');
    expect(opened(through(['broker']))).toContain('sell');
    expect(opened(through(['lane_keys']))).toContain('seal');
    const whole = through(['frag_order', 'frag_ledger', 'frag_manifests', 'frag_keys', 'copy_warden']);
    expect(epilogue(whole, 'broadcast').some((l) => l.includes('It goes out whole'))).toBe(true);
    const rec = journeyRecord(whole);
    expect(rec.records).toHaveLength(4);
    expect(rec.people).toContain('Warden Ilse Marrow');
    expect(rec.people).toContain('The Voice');
  });
});

describe('the long journey’s story', () => {
  it('has two beats in each of the eight regions, and the three-region chart keeps its six', () => {
    for (let r = 0; r < 8; r++) expect(BEATS.filter((b) => b.long === r), `region ${r}`).toHaveLength(2);
    expect(BEATS.filter((b) => b.region !== undefined)).toHaveLength(6);
    expect(FRAGMENTS_ALL).toHaveLength(8);
  });

  it('deals the long chart’s beats by its own regions', () => {
    const j = newJourney(7, false, 'eight');
    j.carry.seen.push(YARD_BEAT);
    endSortie(j, result(j));
    expect(dueBeat(j)).toBe('story_warden');
    // arriving in the Salvage Belt (the third region) with the Marches' beats seen: its own come first
    j.at = j.chart.systems.find((s) => viewOf(j.chart, s.id) === 2)!.id;
    j.carry.seen = [YARD_BEAT, 'story_warden', 'story_ledger', 'story_moot', 'story_drift'];
    expect(['story_broker', 'story_salvor']).toContain(dueBeat(j));
    j.carry.seen.push('story_broker', 'story_salvor');
    expect(dueBeat(j)).toBeNull();
  });

  it('count eight pieces of the file on the long chart, and four on the old one', () => {
    const flags = ['frag_order', 'frag_blackbox', 'frag_witnesses'];
    expect(fileCount(flags, 'eight')).toEqual({ found: 3, of: 8 });
    expect(fileCount(flags)).toEqual({ found: 1, of: FRAGMENTS.length });
  });

  it('read the extra pieces as a line in the epilogue, not as a need', () => {
    const j = newJourney(7);
    endSortie(j, result(j, { flags: ['frag_order', 'frag_ledger', 'frag_manifests', 'frag_keys', 'frag_blackbox', 'frag_charts', 'frag_workorder', 'frag_witnesses'] }));
    let guard = 0;
    while (j.status === 'chart' && guard++ < 20) step(j, { flags: j.carry.flags });
    expect(epilogue(j, 'broadcast').some((l) => l.includes('the rest: the black box'))).toBe(true);
    expect(journeyRecord(j).records).toHaveLength(8);
  });
});
