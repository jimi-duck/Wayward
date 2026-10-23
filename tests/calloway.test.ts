import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CALLOWAY_HP, HP_BEATEN, LEARN, OFFER_AT, OFFER_GAP, OFFERS, READ_AT, TRICKS } from '../src/content/calloway';
import { CARDS } from '../src/content/cards';
import { type SortieResult } from '../src/sim/breakout';
import {
  care, ending, finaleCard, hunchOf, lies, nemesis, newDossier, offerFor, study, trust, type Dossier,
} from '../src/sim/calloway';
import { jumps, lanesFrom, makeChart, sysById, type Chart } from '../src/sim/chart';
import { CARD_BY_ID, oddsFor, openCard, type Ctx } from '../src/sim/comms';
import { daysUntil, newHunt, search, SEARCH } from '../src/sim/hunt';
import { endSortie, newJourney, options, plot, sortieDef, VERSION, type Journey } from '../src/sim/journey';
import { Rng } from '../src/sim/rng';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) { w.ship.invuln = 1; w.step(STEP, input()); } };

function result(j: Journey, o: Partial<SortieResult> = {}, cards: SortieResult['run']['cards'] = []): SortieResult {
  const r = newRun(1);
  r.escaped = (o.ended ?? 'jumped') === 'jumped';
  r.cards = cards;
  return { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3, cyrite: 30, supplies: 30}, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o };
}
const answer = (id: string, choice: string, won = true) => ({ id, choice, won, t: 60 });
const file = (d: Partial<Dossier> = {}): Dossier => ({ ...newDossier(), ...d });

/** A ctx for odds and conditions, with her file's tricks. */
const ctx = (wise: Ctx['wise'] = {}, hunch: string[] = []): Ctx => ({
  t: 100, heat: 0, cyrite: 10, fuel: 10, need: 20, tank: 40, chits: 50, plates: 3, maxPlates: 3, levels: {}, flags: new Set(),
  standing: {}, place: 'open', hostiles: 0, supplies: 10, kind: 'transit', netted: false, behind: 1, wise, hunch,
});

/** A trail through the chart that keeps to one kind of system where it can. */
function trailOf(c: Chart, prefer: string, n: number): string[] {
  const trail = [c.home];
  for (let i = 0; i < n; i++) {
    const out = lanesFrom(c, trail[trail.length - 1]!).map((l) => l.to).filter((s) => s.kind !== 'edge' && s.kind !== 'home' && !trail.includes(s.id));
    if (!out.length) break;
    trail.push((out.find((s) => s.kind === prefer) ?? out[0]!).id);
  }
  return trail;
}

describe('Calloway learns your tricks', () => {
  it('maps every trick to a real card and choice', () => {
    const all = [...CARDS];
    for (const key of Object.keys(TRICKS)) {
      const [card, choice] = key.split(':');
      if (card === 'calloway_last') continue;
      const def = all.find((c) => c.id === card);
      expect(def, key).toBeDefined();
      expect(def!.choices.some((c) => c.id === choice), key).toBe(true);
    }
  });

  it('a lie works less well every time she has heard one', () => {
    const lie = CARD_BY_ID.calloway_word!.choices.find((c) => c.id === 'lie')!.odds!;
    const fresh = oddsFor(lie, ctx()), once = oddsFor(lie, ctx({ lie: 1 })), twice = oddsFor(lie, ctx({ lie: 2 }));
    expect(fresh - once).toBeCloseTo(LEARN, 5);
    expect(once - twice).toBeCloseTo(LEARN, 5);
  });

  it('counts every trick in her file, won or lost, and the truths you told her', () => {
    const d = newDossier();
    study(d, [answer('calloway_word', 'lie', false), answer('calloway_here', 'decoy'), answer('calloway_word', 'ask'), answer('false_trail', 'pay')], false, 3);
    study(d, [answer('calloway_word', 'lie')], false, 5);
    expect(d.tricks).toEqual({ lie: 2, decoy: 1, plan: 1 });
    expect(d.told).toBe(1);
    expect(lies(d)).toBe(2);
    expect(trust(d)).toBe(-1);
  });

  it('carries what she knows into the next sortie, where her cards say so', () => {
    const j = newJourney(7);
    endSortie(j, result(j));
    plot(j, options(j)[0]!.to.id);
    endSortie(j, result(j, {}, [answer('calloway_here', 'decoy'), answer('calloway_here', 'run')]));
    const def = sortieDef(j);
    expect(def.nemesis.wise).toEqual({ decoy: 1, run: 1 });
    const o = openCard(CARD_BY_ID.calloway_here!, ctx(def.nemesis.wise), new Rng(1));
    expect([o.text, ...o.more].join(' ')).toContain('stores');
    expect(o.choices.find((c) => c.id === 'decoy')!.odds).toBeCloseTo(oddsFor(CARD_BY_ID.calloway_here!.choices.find((c) => c.id === 'decoy')!.odds!, ctx()) - LEARN, 5);
  });

  it('refits her ship for every beating, and brings a bigger wing for a ship that keeps running', () => {
    const d = file({ tricks: { run: 4 } });
    const n = nemesis(d, { caught: 3, beaten: 2 }, { finale: false, offer: null });
    expect(n.hp).toBeCloseTo(CALLOWAY_HP * (1 + 2 * HP_BEATEN), 5);
    expect(n.wing).toBe(2);
    expect(nemesis(newDossier(), { caught: 0, beaten: 0 }, { finale: false, offer: null }).hp).toBe(CALLOWAY_HP);
  });
});

describe('Calloway reads your route', () => {
  it('has no read until she has seen a few systems', () => {
    const c = makeChart(7);
    expect(hunchOf(c, trailOf(c, 'port', READ_AT - 1))).toEqual({ kind: null, straight: false });
  });

  it('works out the kind of system you stop in, and stops asking questions there', () => {
    // find a region where a route can keep stopping at the same kind
    for (let seed = 1; seed < 60; seed++) {
      const c = makeChart(seed);
      for (const kind of ['port', 'mining', 'transit', 'contested']) {
        const trail = trailOf(c, kind, 4);
        const h = hunchOf(c, trail);
        if (h.kind !== kind) continue;
        expect(search(c, trail.find((id) => sysById(c, id).kind === kind)!, h)).toBe(0);
        const other = c.systems.find((s) => s.kind !== kind && s.kind !== 'edge');
        if (!h.straight) expect(search(c, other!.id, h)).toBe(SEARCH);
        // she closes faster on a trail she can read
        const read = { ...newHunt(), delay: 0, hunch: h }, blind = { ...newHunt(), delay: 0 };
        expect(daysUntil(read, c, trail)).toBeLessThan(daysUntil(blind, c, trail));
        return;
      }
    }
    throw new Error('no region gave a habit');
  });

  it('knows a ship that always runs straight for the Threshold', () => {
    const c = makeChart(9);
    const trail = [c.home];
    while (sysById(c, trail[trail.length - 1]!).kind !== 'edge') {
      const at = trail[trail.length - 1]!;
      trail.push(lanesFrom(c, at).map((l) => l.to.id).find((id) => jumps(c, id, c.edge) === jumps(c, at, c.edge) - 1)!);
    }
    expect(hunchOf(c, trail.slice(0, -1)).straight).toBe(true);
  });
});

describe('Calloway makes offers', () => {
  it('only once she is close or has caught you, and no more often than every few days', () => {
    const d = newDossier();
    expect(offerFor(d, { day: 3, behind: 4, caught: 0, flown: 3, flags: [] })).toBeNull();
    expect(offerFor(d, { day: 3, behind: 1, caught: 1, flown: 1, flags: [] })).toBeNull();
    expect(offerFor(d, { day: 3, behind: 2, caught: 0, flown: 3, flags: [] })).toBe('offer_home');
    study(d, [answer('offer_home', 'silence')], false, 3);
    expect(offerFor(d, { day: 3 + OFFER_GAP - 0.5, behind: 1, caught: 1, flown: 3, flags: ['gutter_friend'] })).toBeNull();
    expect(offerFor(d, { day: 3 + OFFER_GAP, behind: 1, caught: 1, flown: 3, flags: ['gutter_friend'] })).toBe('offer_name');
  });

  it('chooses from what you told her, who you know, and what you care about', () => {
    expect(offerFor(file({ told: 1 }), { day: 9, behind: 1, caught: 1, flown: 3, flags: ['gutter_friend'] })).toBe('offer_meet');
    const fighter = newDossier();
    study(fighter, [answer('relay', 'break'), answer('relay', 'break'), answer('food_trader', 'chits')], false, 1);
    expect(care(fighter)).toBe('fight');
    expect(offerFor(fighter, { day: 9, behind: 1, caught: 1, flown: 3, flags: [] })).toBe('offer_truce');
    const trader = newDossier();
    study(trader, [answer('food_trader', 'chits'), answer('food_trader', 'chits')], false, 1);
    expect(offerFor(trader, { day: 9, behind: 1, caught: 1, flown: 3, flags: [] })).toBe('offer_tank');
  });

  it('remembers a promise, and a promise broken', () => {
    const d = newDossier();
    study(d, [answer('offer_truce', 'accept')], false, 4);
    expect(d.promise).toBe(true);
    expect(d.took).toEqual(['offer_truce']);
    expect(study(d, [], false, 6)).toEqual([]);
    expect(study(d, [], true, 8)[0]).toContain('broke your word');
    expect(d.broken).toBe(1);
    expect(d.promise).toBe(false);
  });

  it('are her cards, with her face, and only come when she brings them', () => {
    for (const o of OFFERS) {
      expect(o.trigger).toBe('offer');
      expect(o.face).toBeDefined();
      expect(o.choices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('opens her offer a minute into the sortie', () => {
    const j = newJourney(7);
    endSortie(j, result(j));
    plot(j, options(j)[0]!.to.id);
    endSortie(j, result(j));
    j.hunt.caught = 1;
    plot(j, options(j)[0]!.to.id);
    for (const id of Object.keys(j.chart.net)) j.chart.net[id] = 0;
    const def = sortieDef(j);
    expect(def.nemesis.offer).toBe('offer_home');
    const w = new World(5, { mode: 'breakout', sortie: { ...def, calloway: Infinity, notice: { ...def.notice, captain: null }, story: null }, carry: j.carry });
    w.cardNext = Infinity;
    w.portCalled = true;
    w.bk!.nextPursuit = Infinity;
    w.field.rocks = [];
    run(w, OFFER_AT - 1);
    expect(w.phase).not.toBe('comms');
    // the desk waits for a clear sky: nothing hostile about
    for (let i = 0; i < 4000 && w.phase !== 'comms'; i++) { w.aliens = []; run(w, 0.1); }
    expect(w.comms?.def.id).toBe('offer_home');
  });
});

describe('the last meeting', () => {
  it('is built from the relationship: what she says and which ways past her there are', () => {
    const stranger = finaleCard(newDossier(), { caught: 0, beaten: 0 });
    expect(stranger.choices.map((c) => c.id)).toEqual(['fight', 'run']);
    expect(stranger.text).toContain('never spoken');

    const history = file({ told: 2, tricks: { bluff: 1, lie: 2, dark: 1 }, took: ['offer_meet'] });
    const old = finaleCard(history, { caught: 3, beaten: 2 });
    expect(old.choices.map((c) => c.id)).toEqual(['fight', 'run', 'archive', 'remind', 'bluff', 'dark']);
    expect(old.text).toContain('3 times. I counted');
    expect(old.text).toContain('rebuilt twice');
    expect(old.scars).toBe(2);
    // every way past her settles the lane, won or lost
    for (const c of old.choices) {
      expect(c.win.blockade, c.id).toBe('pass');
      if (c.lose) expect(c.lose.blockade, c.id).toBe('pass');
    }
  });

  it('lets the truth move her as far as she trusts you', () => {
    const honest = finaleCard(file({ told: 3 }), { caught: 2, beaten: 0 }).choices.find((c) => c.id === 'archive')!;
    const liar = finaleCard(file({ told: 1, tricks: { lie: 3 } }), { caught: 2, beaten: 0 }).choices.find((c) => c.id === 'archive')!;
    expect(oddsFor(honest.odds!, ctx())).toBeGreaterThan(oddsFor(liar.odds!, ctx()) + 0.4);
  });

  it('is waiting at the Jump Gate when you plot the jump to the Threshold', () => {
    const j = newJourney(3);
    endSortie(j, result(j));
    // fly on toward the edge until it is one jump away
    while (jumps(j.chart, j.at, j.chart.edge) > 1) {
      const next = options(j).find((o) => jumps(j.chart, o.to.id, j.chart.edge) === jumps(j.chart, j.at, j.chart.edge) - 1)!;
      plot(j, next.to.id);
      endSortie(j, result(j, {}, [answer('calloway_word', 'ask')]));
    }
    plot(j, j.chart.edge);
    const def = sortieDef(j);
    expect(def.calloway).toBe(Infinity);
    expect(def.nemesis.offer).toBeNull();
    expect(def.nemesis.finale?.id).toBe('calloway_last');
    const w = new World(5, { mode: 'breakout', sortie: { ...def, notice: { ...def.notice, captain: null } }, carry: j.carry });
    w.cardNext = Infinity;
    w.portCalled = true;
    w.bk!.nextPursuit = Infinity;
    const b = w.bk!;
    w.ship.x = b.lane.x + 300; w.ship.z = b.lane.z;
    run(w, 0.5);
    expect(w.comms?.def.id).toBe('calloway_last');
    expect(w.answer('run')).toBe(true);
    expect(w.callowayMet).toBe(true);
    const out = endSortie(j, result(j, { calloway: true }, [answer('calloway_last', 'run')]));
    expect(out.kind).toBe('through');
    expect(j.calloway.ending).toBe('slipped');
    expect(out.lines.some((l) => l.includes('Threshold'))).toBe(true);
  });

  it('names how it ended', () => {
    expect(ending([answer('calloway_last', 'archive')], false)).toBe('turned');
    expect(ending([answer('calloway_last', 'archive', false)], true)).toBe('beaten');
    expect(ending([answer('calloway_last', 'fight')], false)).toBe('slipped');
    expect(ending([], false)).toBeNull();
  });
});

describe('the save', () => {
  it('brings a version 2 journey up with an empty file on her', () => {
    const j = newJourney(4);
    endSortie(j, result(j));
    const old = JSON.parse(JSON.stringify(j));
    old.version = 2;
    delete old.calloway;
    delete old.hunt.hunch;
    const back = migrate(old)!;
    expect(back.version).toBe(VERSION);
    expect(back.calloway).toEqual(newDossier());
    expect(back.hunt.hunch).toBeDefined();
  });
});
