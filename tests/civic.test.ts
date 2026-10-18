import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WALL } from '../src/content/wall';
import { CIVIC_START, WAKE_DROP, civicBand, civicToll } from '../src/sim/civic';
import { CARD_BY_ID, choiceView, type Ctx } from '../src/sim/comms';
import { VERSION, newJourney, sortieDef } from '../src/sim/journey';
import { migrate } from '../src/meta/save';
import { wallView } from '../src/sim/wall';
import { CUTS, DELIVERED_AT_START, PENALTY, QUOTA, ledgerFor, upgradePrice } from '../src/sim/contract';
import { dueBeat } from '../src/sim/story';
import { World } from '../src/sim/world';
import { Rng } from '../src/sim/rng';

const ctx = (o: Partial<Ctx> = {}): Ctx => ({
  t: 400, heat: 0.2, cyrite: 20, fuel: 20, need: 20, tank: 40, chits: 100, plates: 3, maxPlates: 3, levels: {}, flags: new Set(),
  standing: {}, place: 'open', hostiles: 0, supplies: 10, kind: 'transit', netted: false, behind: 3, ...o,
});

describe('the Civic Score', () => {
  it('starts at 412 on the Story journey and is its own number', () => {
    const j = newJourney(7);
    expect(j.carry.civic).toBe(CIVIC_START);
    expect(CIVIC_START).toBe(412);
    expect(civicBand(CIVIC_START - WAKE_DROP)).not.toBe(civicBand(CIVIC_START));
  });
  it('is absent in Arcade', () => {
    expect(new World(3).civic).toBeUndefined();
  });
  it('raises the toll for officials below 300 and not otherwise', () => {
    expect(civicToll('office', 299)).toBeGreaterThan(1);
    expect(civicToll('office', 350)).toBe(1);
    expect(civicToll('drift', 100)).toBe(1);
  });
  it('greys "show" on the registry card once the Score is low, and opens it when high', () => {
    const def = CARD_BY_ID.story_registry!;
    expect(def.choices.length).toBeLessThanOrEqual(6);
    const show = def.choices.find((c) => c.id === 'show')!;
    expect(choiceView(show, def, ctx({ civic: 374 }), 0).ok).toBe(false);
    expect(choiceView(show, def, ctx({ civic: 412 }), 0).ok).toBe(true);
  });
});

describe('the opening chain beyond the gate', () => {
  it('comes in order, ends when the archive has woken, and is not dealt in Cerro', () => {
    const j = newJourney(7);
    expect(dueBeat(j)).toBeNull();
    j.trail.push('x');
    expect(dueBeat(j)).toBe('story_breach');
    j.carry.seen.push('story_breach');
    expect(dueBeat(j)).toBe('story_yard');
    j.carry.seen.push('story_yard', 'story_recovery');
    expect(dueBeat(j)).toBe('story_wake');
    j.carry.flags.push('archive_woke');
    expect(dueBeat(j)).not.toBe('story_wake');
  });
  it('plays through with every answer, the Score falling for a reason each time', () => {
    for (const [yard, rec] of [['codes', 'override'], ['official', 'appeal']] as const) {
      const j = newJourney(7);
      j.trail.push('x');
      j.carry.contract = { got: 6 };
      const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), story: 'story_breach', calloway: Infinity }, carry: j.carry });
      w.cardNext = Infinity;
      w.field.rocks = [];
      const run = (secs: number) => { for (let t = 0; t < secs * 60 && w.phase === 'play'; t++) { w.ship.invuln = 1; w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' }); } };
      const seen: string[] = [];
      run(4);
      for (const answer of ['audit', yard, rec, 'log']) {
        seen.push(w.comms!.def.id);
        w.answer(answer);
        run(4);
      }
      expect(seen).toEqual(['story_breach', 'story_yard', 'story_recovery', 'story_wake']);
      const c = w.result().carry;
      expect(c.flags).toEqual(expect.arrayContaining(['ship_stolen', 'lease_broken', 'archive_woke', 'clue_reserves']));
      expect(c.civic).toBeLessThan(CIVIC_START - 60);
      expect(c.civic).toBeGreaterThanOrEqual(300);
      expect(c.flags.includes('codes')).toBe(yard === 'codes');
    }
  });
  it('shows the ledger from the live carry: the bay’s cuts, the breach’s shortfall', () => {
    const rows = ledgerFor('bay', { flags: [] });
    expect(rows[0]).toMatchObject({ k: 'Gross yield', n: QUOTA });
    expect(rows.map((r) => r.n ?? 0).slice(0, 6).reduce((a, b) => a + b, 0)).toBe(QUOTA - CUTS.refinery - CUTS.lease - CUTS.reserve - CUTS.escrow - upgradePrice());
    const breach = ledgerFor('breach', { contract: { got: 5 }, flags: ['lease_financed'] });
    expect(breach.find((r) => r.k === 'Delivery window')).toBeUndefined();
    expect(breach.find((r) => r.k === 'Delivered')?.n).toBe(DELIVERED_AT_START + 5);
    expect(breach.find((r) => r.k === 'Balance owed')?.n).toBe(PENALTY + CUTS.lease + upgradePrice());
    expect(ledgerFor('breach', { contract: { got: 5 }, flags: [] }).some((r) => r.k === 'Upgrade instalment')).toBe(false);
  });
});

describe('save 17 to 18', () => {
  it('gives a past-Cerro save 374 and the two Cerro flags, and is idempotent', () => {
    const old = JSON.parse(readFileSync('tests/fixtures/journey-v17.json', 'utf8'));
    const a = migrate(structuredClone(old))!;
    expect(a.version).toBe(VERSION);
    if (a.trail.length >= 2) {
      expect(a.carry.civic).toBe(374);
      expect(a.carry.flags).toEqual(expect.arrayContaining(['archive_woke', 'clue_reserves']));
    } else expect(a.carry.civic).toBe(412);
    expect(migrate(JSON.parse(JSON.stringify(a)))!.carry.civic).toBe(a.carry.civic);
  });
});

describe('the Wall', () => {
  it('lists found items first and always gives a lead', () => {
    const v = wallView(['archive_woke', 'clue_reserves'], 0);
    expect(v.rows[0]!.found).toBe(true);
    expect(v.lead.length).toBeGreaterThan(0);
    expect(wallView([], -1).rows.every((r) => !r.found)).toBe(true);
  });
  it('plays the short chart on its own subset', () => {
    const v = wallView([], 6, 'three');
    expect(v.file.of).toBeLessThan(wallView([], 6, 'eight').file.of);
  });
  it('has unique flags', () => {
    expect(new Set(WALL.map((w) => w.flag)).size).toBe(WALL.length);
  });
  void Rng;
});

describe('follow-up beats', () => {
  it('wait on the choice that opens them', async () => {
    const { BEATS } = await import('../src/content/story');
    const needs = BEATS.filter((b) => b.needs);
    expect(needs.map((b) => b.card)).toEqual(expect.arrayContaining(['story_brook_arrest', 'story_oduya_rigs']));
    for (const b of needs) expect(b.needs).toMatch(/^(brook_met|pact_holdfast|broker|frag_blackbox|ferry_met|archive_woke|ines_berth|stalled)$/);
  });
});

describe('nothing soft-locks', () => {
  it('leaves every story card an answer that needs and costs nothing', async () => {
    const { STORY_CARDS } = await import('../src/content/story');
    for (const c of STORY_CARDS) {
      const free = c.choices.filter((ch) => !ch.needs && !ch.cost && !ch.odds && !ch.loseIf);
      expect(free.length, c.id).toBeGreaterThan(0);
    }
  });
  it('never gates a fragment-bearing beat on a follow-up flag', async () => {
    const { BEATS, FRAGMENT_FLAGS_LONG, STORY_CARDS } = await import('../src/content/story');
    for (const b of BEATS.filter((x) => x.needs)) {
      const card = STORY_CARDS.find((c) => c.id === b.card)!;
      const flags = card.choices.flatMap((ch) => [ch.win.flag ?? [], ch.lose?.flag ?? []].flat());
      expect(flags.filter((f) => FRAGMENT_FLAGS_LONG.includes(f)), b.card).toEqual([]);
    }
  });
  it('leaves the registry open to a pilot with a Score of 100', () => {
    const def = CARD_BY_ID.story_registry!;
    const open = def.choices.filter((c) => choiceView(c, def, ctx({ civic: 100 }), 0).ok);
    expect(open.length).toBeGreaterThanOrEqual(3);
  });
  it('keeps the tollgate answerable without the signature chain', () => {
    const def = CARD_BY_ID.story_tollgate!;
    const view = def.choices.map((c) => choiceView(c, def, ctx({ civic: 300 }), 0));
    expect(view.find((v) => v.id === 'sign')!.ok).toBe(false);
    expect(view.filter((v) => v.ok).length).toBeGreaterThanOrEqual(2);
    const all = new Set(['clue_sig_reach', 'clue_sig_yards', 'clue_sig_ports']);
    expect(choiceView(def.choices.find((c) => c.id === 'sign')!, def, ctx({ flags: all }), 0).ok).toBe(true);
  });
});

describe('the gate beat and the finale', () => {
  it('lets only gate arrivals draw the Narrows', async () => {
    const { BEATS } = await import('../src/content/story');
    expect(BEATS.find((b) => b.card === 'story_calloway_narrows')!.gate).toBe(true);
  });
  it('turns the Patience aside when Calloway turned, and brings Draper’s fleet when he is the Director', async () => {
    const { finaleCard, newDossier } = await import('../src/sim/calloway');
    const base = finaleCard(newDossier(), { caught: 0, beaten: 0 });
    const hot = finaleCard(newDossier(), { caught: 0, beaten: 0 }, ['draper_director', 'calloway_hostile']);
    const cold = finaleCard(newDossier(), { caught: 0, beaten: 0 }, ['calloway_turned']);
    const count = (c: typeof base) => (c.ships ?? []).reduce((n, x) => n + x.n, 0);
    expect(count(hot)).toBeGreaterThan(count(base));
    expect(count(cold)).toBe(0);
    expect(cold.choices.some((c) => c.id === 'stand')).toBe(true);
    expect(base.choices.some((c) => c.id === 'stand')).toBe(false);
  });
});

describe('the Narrows at the Reach gate', () => {
  it('is dealt on arriving at the gate out of the Reach, and nowhere else', async () => {
    const { dueBeat } = await import('../src/sim/story');
    const { viewOf } = await import('../src/sim/chart');
    const j = newJourney(7, false, 'eight');
    j.trail.push(j.at);
    j.carry.seen = ['story_wake', 'story_yard', 'story_warden', 'story_ledger'];
    j.carry.flags.push('archive_woke');
    const gate = j.chart.systems.find((s) => s.kind === 'gate' && viewOf(j.chart, s.id) === 1)!;
    const inside = j.chart.systems.find((s) => s.kind !== 'gate' && s.kind !== 'home' && viewOf(j.chart, s.id) === 0)!;
    j.at = inside.id;
    expect(dueBeat(j)).not.toBe('story_calloway_narrows');
    j.at = gate.id;
    expect(dueBeat(j)).toBe('story_calloway_narrows');
  });
});

describe('a reader and a skimmer on the long chart', () => {
  const run = async (flags: string[]) => {
    const { endSortie, options, plot } = await import('../src/sim/journey');
    const { jumps } = await import('../src/sim/chart');
    const { newRun } = await import('../src/sim/run');
    const { choices } = await import('../src/sim/endings');
    const j = newJourney(7, false, 'eight');
    const go = () => {
      const r = newRun(1);
      r.escaped = true;
      endSortie(j, { ended: 'jumped', time: 60, carry: { ...j.carry, plates: 3, supplies: 30, cyrite: 20, flags: [...new Set([...j.carry.flags, ...flags])] }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
    };
    go();
    let guard = 0;
    while (j.status === 'chart' && guard++ < 120) {
      const o = options(j).sort((a, b) => jumps(j.chart, a.to.id, j.chart.edge) - jumps(j.chart, b.to.id, j.chart.edge))[0]!;
      plot(j, o.to.id);
      go();
    }
    return { j, open: choices(j).filter((c) => c.open).map((c) => c.def.id) };
  };
  it('both reach the Threshold; the skimmer keeps Vanish, the reader opens more', { timeout: 60_000 }, async () => {
    const { STORY_CARDS } = await import('../src/content/story');
    const readerFlags = STORY_CARDS.flatMap((c) => c.choices.filter((ch) => ch.tone !== 'refuse').flatMap((ch) => [ch.win.flag ?? []].flat()));
    const skim = await run([]);
    const read = await run(readerFlags);
    expect(skim.j.status).not.toBe('chart');
    expect(read.j.status).not.toBe('chart');
    expect(skim.open).toContain('vanish');
    expect(read.open.length).toBeGreaterThan(skim.open.length);
    for (const w of [skim.j, read.j]) {
      expect(w.carry.civic).toBeGreaterThanOrEqual(0);
      expect(w.carry.civic).toBeLessThanOrEqual(500);
    }
  });
});
