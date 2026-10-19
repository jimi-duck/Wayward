import { describe, expect, it } from 'vitest';
import { BEATS, BREACH_BEAT, CERRO_BEATS, FRAGMENTS, FRAGMENTS_ALL, OPENING_AT, STORY_AT, STORY_CARDS, WAKE_BEAT } from '../src/content/story';
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
  return { ended: 'jumped', time: 60, carry: { ...j.carry, plates: 3, supplies: 30, cyrite: 20, ...c, flags: [...(c.flags ?? j.carry.flags), 'archive_woke'] }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} };
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
    expect(out.lines).toContain('Act II · The Run');
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
    for (const card of [...CERRO_BEATS, ...BEATS.map((b) => b.card)]) expect(CARD_BY_ID[card]?.trigger, card).toBe('story');
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = pickCard(ctx(), seen, new Rng(i));
      expect(c?.trigger ?? 'chance').toBe('chance');
    }
  });

  it('come one a sortie: none in Cerro, the opening chain past the gate, this region’s first, and a missed one later', () => {
    const j = newJourney(7);
    expect(dueBeat(j)).toBeNull();
    expect(sortieDef(j).story).toBeNull();
    // the chain is dealt in the first sortie beyond the gate
    const out = result(j);
    out.carry.flags = out.carry.flags.filter((f) => f !== 'archive_woke');
    endSortie(j, out);
    expect(sortieDef(j).story).toBe(BREACH_BEAT);
    j.carry.seen.push(...CERRO_BEATS);
    j.carry.flags.push('archive_woke');
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

  it('open the chain a moment after arrival beyond the gate: one notice with Sam on it, then the archive', () => {
    const j = newJourney(7);
    j.trail.push('x');
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), calloway: Infinity }, carry: j.carry });
    w.cardNext = Infinity;
    w.bk!.nextPursuit = Infinity;
    w.field.rocks = [];
    const run = (secs: number) => { for (let t = 0; t < secs * 60 && w.phase === 'play'; t++) { w.ship.invuln = 1; w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' }); } };
    run(OPENING_AT - 1);
    expect(w.phase).toBe('play');
    run(2);
    expect(w.comms?.def.id).toBe(BREACH_BEAT);
    // Lane Control and Sam are one thread: one card, two voices, one answer
    expect(w.comms?.def.reply?.from).toMatch(/^Sam Okoro/);
    expect(w.comms?.choices.map((c) => c.id)).toEqual(['code']);
    expect(w.comms?.ledger?.find((r) => r.k === 'Remaining shortfall')?.n).toBe(200);
    const before = w.result().carry;
    w.answer('code');
    run(4);
    expect(w.comms?.def.id).toBe(WAKE_BEAT);
    const after = w.result().carry;
    expect(after.flags).toEqual(expect.arrayContaining(['ship_stolen', 'lease_broken', 'codes', 'tam_codes', 'tam_favour']));
    expect(after.flags).not.toContain('tam_alone');
    expect(after.civic!).toBeLessThan(before.civic!);
    expect(after.seen).toContain(BREACH_BEAT);
  });

  it('show what each answer gives before any other chip', () => {
    for (const c of STORY_CARDS) {
      const story = c.choices.filter((ch) => [ch.win.flag ?? []].flat().some((f) => /^(frag_|copy_|voice_|lane_|pact_|broker|codes$|clue_)/.test(f)));
      for (const ch of story) {
        const named = [ch.win.flag ?? []].flat().flatMap((f) => chipsOf(f) ?? []);
        expect([...named, 'File +1', 'Copy out', 'Forged codes', 'Hull stolen', 'Wall +1', 'Civic Score ↓'], `${c.id}.${ch.id}`).toContain(gains(ch.win, ctx(), 0)[0]);
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
  it('has two main beats in each of the eight regions (follow-ups wait on a choice), and the three-region chart keeps its six', () => {
    for (let r = 0; r < 8; r++) expect(BEATS.filter((b) => b.long === r && !b.needs), `region ${r}`).toHaveLength(2);
    expect(BEATS.filter((b) => b.region !== undefined)).toHaveLength(6);
    expect(FRAGMENTS_ALL).toHaveLength(8);
  });

  it('deals the long chart’s beats by its own regions', () => {
    const j = newJourney(7, false, 'eight');
    j.carry.seen.push(...CERRO_BEATS);
    endSortie(j, result(j));
    expect(dueBeat(j)).toBe('story_warden');
    // arriving in the Salvage Belt (the third region) with the Marches' beats seen: its own come first
    j.at = j.chart.systems.find((s) => viewOf(j.chart, s.id) === 2)!.id;
    j.carry.seen = [...CERRO_BEATS, 'story_warden', 'story_ledger', 'story_moot', 'story_drift'];
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
