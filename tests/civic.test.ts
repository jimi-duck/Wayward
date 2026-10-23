import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WALL } from '../src/content/wall';
import { CIVIC_START, STOLEN_DROP, civicBand, civicToll } from '../src/sim/civic';
import { CARD_BY_ID, choiceView, type Ctx } from '../src/sim/comms';
import { VERSION, newJourney, sortieDef } from '../src/sim/journey';
import { migrate } from '../src/meta/save';
import { wallView } from '../src/sim/wall';
import { CREDIT_START, CUTS, FINAL_LOAD, FIRST_LOAD, GROSS, LEASE_DUE, NET, PENALTY, QUOTA, ledgerFor, owed, projectedAfterLauncher, upgradePrice, type LedgerRow } from '../src/sim/contract';
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
    expect(civicBand(CIVIC_START - STOLEN_DROP)).not.toBe(civicBand(CIVIC_START));
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
    expect(dueBeat(j)).toBe('story_sam');
    j.carry.seen.push('story_sam');
    expect(dueBeat(j)).toBe('story_rename');
    j.carry.seen.push('story_rename');
    expect(dueBeat(j)).toBe('story_wake');
    j.carry.flags.push('archive_woke');
    expect(dueBeat(j)).not.toBe('story_wake');
  });
  it('skips the cards the first cut of the opening had and this one does not, so a save part-way through plays on', () => {
    const j = newJourney(7);
    j.trail.push('x');
    j.carry.seen.push('story_breach', 'story_sam', 'story_yard', 'story_recovery');
    expect(dueBeat(j)).toBe('story_rename');
    j.carry.seen.push('story_rename');
    expect(dueBeat(j)).toBe('story_wake');
  });
  it('plays through in four cards, the Score falling once, at the theft', () => {
    const j = newJourney(7);
    j.trail.push('x');
    const w = new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), story: 'story_breach', calloway: Infinity }, carry: j.carry });
    w.cardNext = Infinity;
    w.field.rocks = [];
    const run = (secs: number) => { for (let t = 0; t < secs * 60 && w.phase === 'play'; t++) { w.ship.invuln = 1; w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' }); } };
    const seen: string[] = [];
    run(4);
    // the breach notice and the override's lead-up do not move the Score: the theft is the one fall
    expect(w.civic).toBe(CIVIC_START);
    for (const answer of ['proceed', 'code', 'helm', 'lead']) {
      seen.push(w.comms!.def.id);
      // one action each: the notice offers no way out, Sam's card is the override, and the archive is one card
      expect(w.comms!.choices).toHaveLength(1);
      w.answer(answer);
      if (answer === 'proceed') expect(w.civic).toBe(CIVIC_START);
      if (answer === 'code') expect(civicBand(w.civic!)).toBe('restricted');
      run(10);
    }
    expect(seen).toEqual(['story_breach', 'story_sam', 'story_rename', 'story_wake']);
    expect(w.phase).toBe('play');
    const c = w.result().carry;
    expect(c.flags).toEqual(expect.arrayContaining(['ship_stolen', 'lease_broken', 'codes', 'tam_codes', 'archive_woke', 'clue_reserves']));
    // the theft took it to RESTRICTED, and the archive did not take more
    expect(c.civic).toBe(CIVIC_START - STOLEN_DROP);
    expect(civicBand(c.civic!)).toBe('restricted');
  });
  it('adds up (opening sheets B and F): a projection, not a balance, and a breach bill of 47 CR kept apart from it', () => {
    const bay = ledgerFor('bay');
    const credit = (rows: LedgerRow[], k: string) => rows.find((r) => r.k === k)?.cr;
    // B: 100 CR gross − 98 CR charges = 2 CR, on delivery; the launcher's 20 CR is among the charges
    expect(upgradePrice()).toBe(20);
    expect(credit(bay, 'Gross')).toBe(GROSS);
    expect(credit(bay, 'Projected charges')).toBe(-98);
    expect(credit(bay, 'Projected settlement')).toBe(2);
    expect(projectedAfterLauncher()).toBe(GROSS - CUTS.refinery - CUTS.lease - CUTS.reserve - CUTS.escrow - upgradePrice());
    expect(NET).toBe(GROSS - CUTS.refinery - CUTS.lease - CUTS.reserve - CUTS.escrow);
    expect(credit(ledgerFor('launcher'), 'Torpedo launcher')).toBe(upgradePrice());
    // the card's action names the bay's own price
    expect(CARD_BY_ID.story_bay!.choices[0]!.label).toContain(`${upgradePrice()} CR`);
    // nothing earned, nothing delivered: the cargo stays in the hold
    expect(bay.some((r) => /balance|available|delivered/i.test(r.k))).toBe(false);
    expect(FINAL_LOAD).toBe(QUOTA - FIRST_LOAD);
    expect(CREDIT_START).toBeLessThan(GROSS);
    // financed, not bought: no cost at the bay
    expect(CARD_BY_ID.story_bay!.choices[0]!.cost).toBeUndefined();
    // F: 15 CR penalty + 12 CR lease + 20 CR financed launcher = 47 CR, never netted against the projection
    const invoice = ledgerFor('invoice');
    expect(credit(invoice, 'Penalty')).toBe(PENALTY);
    expect(credit(invoice, 'Lease')).toBe(LEASE_DUE);
    expect(credit(invoice, 'Financed launcher')).toBe(upgradePrice());
    expect(credit(invoice, 'Outstanding')).toBe(owed());
    expect(credit(ledgerFor('breach'), 'Outstanding')).toBe(owed());
    expect(owed()).toBe(47);
  });
  it('shows the archive’s one record: 94% on the day of the order, Halden’s Reach next', () => {
    expect(ledgerFor('evidence').find((r) => r.k === 'Reserve level')?.v).toBe('94%');
    expect(ledgerFor('evidence').find((r) => r.k === 'Record and order')?.v).toBe('same day');
    expect(ledgerFor('archive').find((r) => r.k === 'Next lead')?.v).toBe('Halden’s Reach');
    expect(CARD_BY_ID.story_wake!.hero).toEqual(['94%', 'Krail reserves']);
  });
});

describe('save 17 to 18', () => {
  it('gives a past-Cerro save the post-theft Score and the two Cerro flags, and is idempotent', () => {
    const old = JSON.parse(readFileSync('tests/fixtures/journey-v17.json', 'utf8'));
    const a = migrate(structuredClone(old))!;
    expect(a.version).toBe(VERSION);
    if (a.trail.length >= 2) {
      expect(a.carry.civic).toBe(CIVIC_START - STOLEN_DROP);
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
      // the work bay's settlement puts the credit for the rack in the purse as it opens (sim/tutor.ts), so its one answer is payable
      const free = c.choices.filter((ch) => !ch.needs && (!ch.cost || c.id === 'story_bay') && !ch.odds && !ch.loseIf);
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
