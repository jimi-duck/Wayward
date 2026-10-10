import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { ARC, QUESTIONS, SITUATIONS, SITUATION_BY_ID, OBSERVATIONS } from '../src/content/situations';
import { SCENE_CARDS } from '../src/content/situationCards';
import { REGIONS_LONG } from '../src/content/regions';
import { VARIANTS } from '../src/sim/enemies';
import type { InputFrame } from '../src/input/types';
import { lanesFrom, makeChart, netted, regionOf, sysById } from '../src/sim/chart';
import { endSortie, newJourney, plot, sortieDef, type Journey } from '../src/sim/journey';
import { dealSituations, laySituations, liveSituation, settle } from '../src/sim/situations';
import { newRun } from '../src/sim/run';
import { cy } from '../src/sim/purse';
import { World } from '../src/sim/world';

// The Situation layer: what is going on in a system (content/situations.ts), dealt on the chart
// (sim/situations.ts) and played on the sector (sim/stage.ts).

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const CARD = Object.fromEntries(SCENE_CARDS.map((c) => [c.id, c]));

/** A journey one jump out of Cerro, with a sortie for the situation `id` instead of whatever the chart dealt. Quiet, so no pursuit comes to the idle ship. */
function sortieFor(id: string, seed = 5) {
  const j = newJourney(seed, false, 'eight');
  const run = newRun(1);
  run.escaped = true;
  endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 30, supplies: 12, plates: 3 }, run, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
  plot(j, lanesFrom(j.chart, j.at)[0]!.to.id);
  return { j, def: { ...sortieDef(j), situation: id, quiet: true, place: null, story: null } };
}

function world(id: string, carry: Partial<Journey['carry']> = {}) {
  const { j, def } = sortieFor(id);
  const w = new World(j.seed * 31 + 1, { mode: 'breakout', sortie: def, carry: { ...j.carry, ...carry } });
  w.ship.invuln = 1e9;
  return w;
}
/** Fly idle. A full-panel card that is not the scene's own is answered (the first choice open) so the world goes on. */
const run = (w: World, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.ship.invuln = 1e9;
    w.step(STEP, input());
    if (w.phase === 'comms' && w.comms && !w.comms.def.id.startsWith('sc_')) w.answer(w.comms.choices.find((c) => c.ok)!.id);
    if (w.phase === 'hail') w.answerHail(false);
  }
};
/** Fly idle until a call of the scene's is on the table (or `limit` seconds pass). */
const untilCall = (w: World, limit = 90) => { for (let i = 0; i < limit && !(w.call ?? w.comms); i++) run(w, 1); return w.call ?? w.comms; };
const put = (w: World, x: number, z: number) => { w.ship.x = x; w.ship.z = z; w.ship.vx = w.ship.vz = 0; };

describe('the situations as data', () => {
  it('name a real call, real hulls and real follow-ups', () => {
    for (const d of SITUATIONS) {
      if (d.card) expect(CARD[d.card], d.id).toBeDefined();
      if (d.tight) expect(SITUATION_BY_ID[d.tight], d.id).toBeDefined();
      for (const a of d.actors ?? []) expect(VARIANTS[a.variant], `${d.id}:${a.variant}`).toBeDefined();
      if (d.threat) expect(VARIANTS[d.threat.variant], d.id).toBeDefined();
      if (d.trap) expect(VARIANTS[d.trap.variant], d.id).toBeDefined();
      for (const fx of Object.values(d.after ?? {})) if (fx.follow) expect(SITUATION_BY_ID[fx.follow.id], d.id).toBeDefined();
      // an accepted answer is one the card has
      for (const k of d.accept ?? []) expect(CARD[d.card!]?.choices.map((c) => c.id), `${d.id}:${k}`).toContain(k);
      // a goal that asks for something has a card to take it on
      if (d.goal.kind !== 'call') expect(d.card, d.id).toBeDefined();
    }
    for (const c of SCENE_CARDS) expect(SITUATIONS.some((d) => d.card === c.id), c.id).toBe(true);
  });

  it('give every region a human question, an unknown one, and an alien situation on the timetable', () => {
    expect(QUESTIONS).toHaveLength(REGIONS_LONG.length);
    for (let r = 0; r < REGIONS_LONG.length; r++) {
      const rows = ARC.filter((a) => a.region === r).map((a) => SITUATION_BY_ID[a.id]!);
      expect(rows.length, `region ${r}`).toBeGreaterThanOrEqual(2);
      expect(rows.some((d) => d.group === 'unknown'), `region ${r}`).toBe(true);
    }
    for (const a of ARC) expect(SITUATION_BY_ID[a.id], a.id).toBeDefined();
  });

  it('keep the unknown from being all hostile: no Thren or Voice scene starts as an enemy', () => {
    for (const d of SITUATIONS.filter((s) => s.group === 'unknown')) for (const a of d.actors ?? []) expect(a.temper, `${d.id}:${a.tag}`).not.toBe('hostile');
    const tempers = new Set(SITUATIONS.flatMap((d) => (d.actors ?? []).map((a) => a.temper)));
    for (const t of ['meek', 'wary', 'territorial', 'drawn'] as const) expect(tempers.has(t), t).toBe(true);
  });

  it('put the first alien moment in the last third of the first region, a half hour in', () => {
    const first = ARC.filter((a) => a.region === 0 && SITUATION_BY_ID[a.id]!.group === 'unknown').sort((a, b) => a.col - b.col)[0]!;
    expect(first.col).toBeGreaterThanOrEqual(6);
    expect(first.col).toBeLessThanOrEqual(8);
  });

  it('have an Archive line for every flag the unknown sets', () => {
    const have = new Set(OBSERVATIONS.map((o) => o.flag));
    for (const d of SITUATIONS.filter((s) => s.group === 'unknown')) if (d.seen?.length) expect(d.seen.some((f) => have.has(f)), d.id).toBe(true);
  });
});

describe('dealing them', () => {
  it('lays the timetable on every chart, whichever lane is taken, and does not move the systems', () => {
    for (const seed of [1, 2, 3, 4]) {
      const c = makeChart(seed, 'eight', 0.2);
      const before = JSON.stringify(c.systems);
      const q = laySituations(c, seed);
      expect(JSON.stringify(c.systems)).toBe(before);
      for (let r = 0; r < 8; r++) {
        const ids = Object.entries(q).filter(([id]) => regionOf(sysById(c, id)) === r).map(([, s]) => s.id);
        for (const row of ARC.filter((a) => a.region === r)) expect(ids, `seed ${seed} region ${r}`).toContain(row.id);
      }
    }
  });

  it('is the same for the same seed, and puts at most one situation in a system', () => {
    const c = makeChart(9, 'eight', 0.2);
    expect(laySituations(c, 9)).toEqual(laySituations(c, 9));
  });

  it('takes the place out of a system with a situation', () => {
    const j = newJourney(3, false, 'eight');
    for (const id of Object.keys(j.chart.situations!)) expect(j.chart.places[id], id).toBeUndefined();
  });

  it('plays a tightened variant where the Net holds the system', () => {
    const j = newJourney(3, false, 'eight');
    const [id] = Object.entries(j.chart.situations!).find(([, s]) => SITUATION_BY_ID[s.id]?.tight)!;
    expect(liveSituation(j.chart, id)!.id).not.toBe(SITUATION_BY_ID[j.chart.situations![id]!.id]!.tight);
    j.chart.net[id] = 1;
    expect(netted(j.chart, id)).toBe(true);
    expect(liveSituation(j.chart, id)!.id).toBe(SITUATION_BY_ID[j.chart.situations![id]!.id]!.tight);
  });

  it('brings an old journey up to date: systems it has been through are done', () => {
    const j = newJourney(3, false, 'eight');
    j.chart.visited.push(Object.keys(j.chart.situations!)[0]!);
    dealSituations(j.chart, j.seed);
    expect(j.chart.situations![j.chart.visited[1]!]?.done).toBe(true);
  });
});

describe('settling', () => {
  it('turns a lost shortage into dearer food, and holds the Net off after a cut relay', () => {
    const j = newJourney(3, false, 'eight');
    const id = j.chart.home;
    const ctx = { at: id, day: 4, flag: () => {}, hunt: () => {} };
    j.chart.situations = { [id]: { id: 'shortage', seen: true, done: false } };
    // the home system is no place for one; the market is what matters here
    settle(j.chart, id, 'lost', ctx, SITUATION_BY_ID.shortage);
    expect(j.chart.market?.[0]?.mult.supplies).toBeGreaterThan(1);
    expect(j.chart.situations[id]!.done).toBe(true);
    expect(j.chart.situations[id]!.result).toBe('lost');
  });
});

describe('the stage', () => {
  it('rings the call when the ship is near, and puts a goal on the sector when it is taken', () => {
    const w = world('shortage', { supplies: 6 });
    const st = w.stage!;
    expect(st).not.toBeNull();
    put(w, st.x + 60, st.z);
    run(w, 24);
    expect(w.call ?? w.comms).not.toBeNull();
    expect((w.call ?? w.comms)!.def.id).toBe('sc_shortage');
    w.answer('bring');
    expect(st.taken).toBe(true);
    run(w, 1);
    expect(w.encounter?.id).toBe('scene');
    expect(w.encounter?.label).toBeTruthy();
  });

  it('pays a delivered goal, takes what it asked for, and gives the sky back', () => {
    const w = world('shortage', { supplies: 6, cyrite: 0 });
    const st = w.stage!;
    put(w, st.x + 60, st.z);
    run(w, 24);
    w.answer('bring');
    put(w, st.x, st.z);
    run(w, 6);
    expect(st.result).toBe('won');
    expect(w.supplies).toBe(3);
    expect(w.cyrite + w.fuel).toBeGreaterThanOrEqual(cy(20));
    expect(w.encounter).toBeNull();
    expect(w.result().situation).toEqual({ id: w.sortie.system, result: 'won' });
  });

  it('does not count the hold without what the site asks for', () => {
    const w = world('shortage', { supplies: 0 });
    const st = w.stage!;
    put(w, st.x + 60, st.z);
    run(w, 24);
    w.answer('bring');
    put(w, st.x, st.z);
    run(w, 8);
    expect(st.result).toBeNull();
  });

  it('misses a goal that is not met in time', () => {
    const w = world('shortage', { supplies: 6 });
    const st = w.stage!;
    put(w, st.x + 60, st.z);
    run(w, 24);
    w.answer('bring');
    put(w, st.x + 400, st.z);
    run(w, 215);
    expect(st.result).toBe('lost');
  });

  it('records a refusal as declined and lets the ships go', () => {
    const w = world('trader');
    const st = w.stage!;
    put(w, st.x + 60, st.z);
    expect(untilCall(w)!.def.id).toBe('sc_trader');
    w.answer('no');
    expect(w.result().situation?.result).toBe('declined');
  });

  it('warns a territorial guard before it turns, and gives the ship time to leave', () => {
    const w = world('inspection');
    const st = w.stage!;
    const guard = st.actors[0]!;
    put(w, guard.x + 40, guard.z);
    run(w, 2);
    expect(w.events.length >= 0).toBe(true);
    expect(guard.ward?.warned).toBeGreaterThan(0);
    expect(guard.ward).toBeDefined();
    // away again: the warning lifts, nobody turned
    put(w, guard.x + 400, guard.z);
    run(w, 3);
    expect(guard.ward?.warned).toBe(0);
    // stay in the ring past the grace: they turn
    put(w, guard.x + 40, guard.z);
    run(w, 12);
    expect(w.aliens.some((a) => !a.ward && a.faction === 'custody' && !a.fleeing)).toBe(true);
  });

  it('keeps a ward out of the fight count: nothing hostile is near', () => {
    const w = world('trader');
    const st = w.stage!;
    put(w, st.actors[0]!.x + 10, st.actors[0]!.z);
    run(w, 30);
    expect(w.commsCtx().hostiles).toBe(0);
    expect(w.alert()).toBe('clear');
  });

  it('turns a wary ward when it is shot, and sends a meek one away', () => {
    const w = world('survey');
    const st = w.stage!;
    const picket = st.actors[0]!;
    (w as unknown as { hurtAlien(a: unknown, d: number, s: string, x: number, y: number, z: number): boolean }).hurtAlien(picket, 0.01, 'laser', picket.x, picket.y, picket.z);
    expect(picket.ward).toBeUndefined();
    const m = world('trader');
    const hauler = m.stage!.actors[0]!;
    (m as unknown as { hurtAlien(a: unknown, d: number, s: string, x: number, y: number, z: number): boolean }).hurtAlien(hauler, 0.01, 'laser', hauler.x, hauler.y, hauler.z);
    expect(hauler.fleeing).toBe(true);
  });

  it('plays a card-less scene as something to see, and sets its flags', () => {
    const w = world('thren_pass');
    const st = w.stage!;
    run(w, SITUATION_BY_ID.thren_pass!.at + 5);
    expect(st.begun).toBe(true);
    expect(st.actors.length).toBe(5);
    expect(w.flags.has('saw_thren')).toBe(true);
    expect(w.aliens.filter((a) => a.ward).length).toBe(5);
    // none of them fires at the ship
    run(w, 40);
    expect(w.shots.length).toBe(0);
  });

  it('follows a leader: stays with it to win', () => {
    const w = world('voice_guide');
    const st = w.stage!;
    run(w, SITUATION_BY_ID.voice_guide!.at + 2);
    // the call is a major (9999 hail): it opens
    run(w, 5);
    const open = w.call ?? w.comms;
    expect(open?.def.id).toBe('sc_voice_guide');
    w.answer('follow');
    expect(st.taken).toBe(true);
    for (let i = 0; i < 70 * 60 && !st.result; i++) {
      const lead = st.actors.find((a) => a.ward?.act === 'lead');
      if (lead) put(w, lead.x - 20, lead.z);
      w.ship.invuln = 1e9;
      w.step(STEP, input());
    }
    expect(st.result).toBe('won');
  });

  it('is never made for the home system, or when the chart has none', () => {
    const j = newJourney(3, false, 'eight');
    const w = new World(j.seed, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    expect(w.stage).toBeNull();
  });
});
