import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CAPTAIN_AT, CAPTAIN_LIVES, CAPTAIN_REST, NOTICE, NOTICE_CAP, STANDING_FLOOR, TIERS } from '../src/content/factions';
import { CAPTAIN_BY_ID, form } from '../src/sim/captains';
import type { SortieResult } from '../src/sim/breakout';
import { CARD_BY_ID, condOk, feeFor, openCard, type Ctx } from '../src/sim/comms';
import { ALIEN_TYPES, VARIANTS } from '../src/sim/enemies';
import { endSortie, newJourney, options, plot, sortieDef, VERSION, type Journey } from '../src/sim/journey';
import {
  captainOf, cool, GUTTER_HUNT, newNotice, noticeFromRun, noticeOf, pressure, raise, readout, remember, tier, tierOf, type Notice,
} from '../src/sim/notice';
import { Rng } from '../src/sim/rng';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, brk: false, overcharge: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input()); };

const ctx = (x: Partial<Ctx> = {}): Ctx => ({
  t: 300, heat: 0.3, cyrite: 10, need: 20, tank: 40, ore: 0, holdMax: 40, chits: 0, parts: 0, plates: 3, maxPlates: 3,
  levels: {}, flags: new Set(), standing: {}, place: 'open', hostiles: 0, food: 12, kind: 'transit', netted: false, behind: Infinity, ...x,
});

/** A faction pushed to the captain tier. */
function marked(f: 'custody' | 'gutter' = 'custody'): Notice {
  const n = newNotice();
  raise(n, f, NOTICE[f].at.captain, {});
  return n;
}

function result(j: Journey, o: Partial<SortieResult> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = (o.ended ?? 'jumped') === 'jumped';
  return { ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 20, food: 12, parts: 6, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o };
}

describe('the factions’ data', () => {
  it('climbs through the tiers in order, and every faction can name a captain', () => {
    for (const [f, row] of Object.entries(NOTICE)) {
      const at = TIERS.slice(1).map((t) => row.at[t as Exclude<typeof t, 'quiet'>]);
      for (let i = 1; i < at.length; i++) expect(at[i], f).toBeGreaterThan(at[i - 1]!);
      expect(row.captains.length, f).toBeGreaterThan(0);
      expect(row.kill.capital).toBeGreaterThan(row.kill.cruiser);
      expect(row.decay).toBeGreaterThan(0);
    }
    const ids = Object.values(NOTICE).flatMap((r) => r.captains);
    expect(new Set(ids).size).toBe(ids.length);
    // every captain on a faction's file exists, and flies that faction's ship
    for (const [f, row] of Object.entries(NOTICE)) for (const id of row.captains) expect(CAPTAIN_BY_ID[id]?.faction, id).toBe(f);
  });
});

describe('notice', () => {
  it('counts a sortie’s kills by faction, heavier hulls and capital ships for more', () => {
    const run = newRun(1);
    run.killsByKind = { picket: 2, lancer: 1, scout: 3 };
    run.capitalFactions = ['custody'];
    const k = NOTICE.custody.kill, g = NOTICE.gutter.kill;
    expect(ALIEN_TYPES[VARIANTS.lancer!.kind].role).toBe('cruiser');
    expect(noticeFromRun(run)).toEqual({ custody: 2 * k.interceptor + k.cruiser + k.capital, gutter: 3 * g.interceptor });
  });

  it('escalates warning, toll, hunters, then names a captain, with a line for each', () => {
    const n = newNotice();
    const at = NOTICE.custody.at;
    expect(raise(n, 'custody', at.warning - 0.5, {})).toEqual([]);
    expect(tier(n, 'custody')).toBe('quiet');
    expect(raise(n, 'custody', 0.5, {})).toEqual([NOTICE.custody.lines.warning]);
    // a big jump reports every tier it crosses, in order
    const lines = raise(n, 'custody', at.captain, {});
    expect(lines.slice(0, 3)).toEqual([NOTICE.custody.lines.toll, NOTICE.custody.lines.hunters, NOTICE.custody.lines.captain]);
    const c = captainOf(n, 'custody')!;
    expect(c.id).toBe(NOTICE.custody.captains[0]);
    expect(lines[3]).toContain(CAPTAIN_BY_ID[c.id]!.name);
    expect(tierOf('custody', at.hunters)).toBe('hunters');
  });

  it('costs standing with whoever the faction answers to, and nothing with those it does not', () => {
    const standing: Record<string, number> = { custody: 1 };
    const per = NOTICE.custody.standingPer;
    raise(newNotice(), 'custody', per * 2.5, standing);
    expect(standing.custody).toBe(1 - 2);
    const n = newNotice();
    raise(n, 'custody', per * 0.6, standing);
    raise(n, 'custody', per * 0.6, standing);
    expect(standing.custody).toBe(1 - 3);
    const before = { ...standing };
    raise(newNotice(), 'office', 50, standing);
    expect(standing).toEqual(before);
    // kills alone stop at the floor, and never lift standing a card already sank below it
    raise(newNotice(), 'custody', per * 100, standing);
    expect(standing.custody).toBe(STANDING_FLOOR);
    standing.custody = STANDING_FLOOR - 3;
    raise(newNotice(), 'custody', per * 2, standing);
    expect(standing.custody).toBe(STANDING_FLOOR - 3);
  });

  it('tops out, so a long war can still be cooled', () => {
    const n = newNotice();
    raise(n, 'gutter', 1000, {});
    expect(noticeOf(n, 'gutter')).toBe(NOTICE.gutter.at.captain * NOTICE_CAP);
  });

  it('fades with the days, tier and all, but a named captain stays on your file', () => {
    const n = marked();
    cool(n, 1);
    expect(noticeOf(n, 'custody')).toBeCloseTo(NOTICE.custody.at.captain - NOTICE.custody.decay, 5);
    cool(n, 1000);
    expect(noticeOf(n, 'custody')).toBe(0);
    expect(tier(n, 'custody')).toBe('quiet');
    expect(captainOf(n, 'custody')).not.toBeNull();
  });

  it('puts fees up, the pursuit on, and a captain in the system, by tier', () => {
    expect(pressure(newNotice(), 0)).toEqual({ tiers: {}, toll: {}, pursuit: 1, elite: 0, gutter: 0, captain: null });
    const n = newNotice();
    raise(n, 'custody', NOTICE.custody.at.toll, {});
    raise(n, 'gutter', NOTICE.gutter.at.hunters, {});
    const p = pressure(n, 0);
    expect(p.tiers).toEqual({ custody: 'toll', gutter: 'hunters' });
    expect(p.toll).toEqual({ custody: NOTICE.custody.toll, gutter: NOTICE.gutter.toll });
    expect(p.pursuit).toBe(1);
    expect(p.gutter).toBe(GUTTER_HUNT);
    expect(p.elite).toBe(NOTICE.gutter.elite);
    expect(p.captain).toBeNull();
    raise(n, 'custody', NOTICE.custody.at.captain, {});
    const q = pressure(n, 0);
    expect(q.pursuit).toBe(NOTICE.custody.hunt);
    expect(q.captain).toMatchObject({ id: NOTICE.custody.captains[0], faction: 'custody', at: CAPTAIN_AT, memory: { met: 0 } });
  });
});

describe('named captains', () => {
  it('rest between meetings, and come back changed after you slip them', () => {
    const n = marked();
    const c = captainOf(n, 'custody')!;
    const def = CAPTAIN_BY_ID[c.id]!;
    const fresh = form(def, c).hp;
    expect(remember(n, c.id, 'evaded', 3, {}, new Rng(1))[0]).toContain(def.name);
    expect(pressure(n, 3).captain).toBeNull();
    expect(pressure(n, 3 + CAPTAIN_REST - 0.1).captain).toBeNull();
    const back = pressure(n, 3 + CAPTAIN_REST).captain!;
    expect(back.memory).toMatchObject({ met: 1, evaded: 1, last: 'evaded' });
    expect(form(def, back.memory).hp).toBeGreaterThan(fresh);
  });

  it('beaten, ease the faction off, and are gone once killed or scarred enough; the next takes up the file', () => {
    for (let seed = 1; seed < 20; seed++) {
      const n = marked();
      const first = captainOf(n, 'custody')!;
      const before = noticeOf(n, 'custody');
      remember(n, first.id, 'beaten', 1, {}, new Rng(seed));
      expect(noticeOf(n, 'custody')).toBeLessThan(before);
      for (let i = 0; i < CAPTAIN_LIVES && !n.fallen.includes(first.id); i++) remember(n, first.id, 'beaten', 1, {}, new Rng(seed + i));
      expect(n.fallen).toContain(first.id);
      expect(first.scarred).toBeLessThanOrEqual(CAPTAIN_LIVES);
      expect(captainOf(n, 'custody')?.id ?? null).not.toBe(first.id);
      // still marked enough: the second captain takes it up
      raise(n, 'custody', NOTICE.custody.at.captain, {});
      expect(captainOf(n, 'custody')!.id).toBe(NOTICE.custody.captains[1]);
    }
  });

  it('remember a win, and terms too', () => {
    const n = marked();
    const c = captainOf(n, 'custody')!;
    remember(n, c.id, 'won', 0, {}, new Rng(1));
    expect(c.won).toBe(1);
    const before = noticeOf(n, 'custody');
    remember(n, c.id, 'bargained', 0, {}, new Rng(1));
    expect(c.bargained).toBe(1);
    expect(noticeOf(n, 'custody')).toBeLessThan(before);
    expect(c.met).toBe(2);
  });
});

describe('notice on the channel', () => {
  it('charges a marked faction’s toll, and reads its tier', () => {
    const def = CARD_BY_ID.lane_toll!;
    const base = feeFor(def, ctx());
    expect(feeFor(def, ctx({ toll: { gutter: 2 } }))).toBe(Math.round((base * 2) / 5) * 5);
    expect(feeFor(def, ctx({ toll: { custody: 2 } }))).toBe(base);
    expect(condOk({ notice: ['custody', 'warning'] }, ctx())).toBe(false);
    expect(condOk({ notice: ['custody', 'warning'] }, ctx({ notice: { custody: 'hunters' } }))).toBe(true);
    expect(condOk({ notice: ['custody', 'captain'] }, ctx({ notice: { custody: 'hunters' } }))).toBe(false);
  });

  it('names the captain on your file in a card’s slots', () => {
    const n = marked('custody');
    const call = pressure(n, 0).captain!;
    const o = openCard(CARD_BY_ID.custody_bulletin!, ctx({ captain: call, notice: { custody: 'captain' }, t: 300 }), new Rng(1));
    expect([o.text, ...o.more].join(' ')).toContain(`signed by ${call.name}`);
  });
});

describe('notice on the journey', () => {
  function out(): Journey {
    const j = newJourney(7);
    endSortie(j, result(j));
    return j;
  }

  it('is raised by the kills and the cards, logged, and fades with the days', () => {
    const j = out();
    plot(j, options(j)[0]!.to.id);
    const r = result(j);
    r.run.killsByKind = { picket: NOTICE.custody.at.warning };
    r.notice = { gutter: 1 };
    const res = endSortie(j, r);
    expect(res.lines).toContain(NOTICE.custody.lines.warning);
    expect(j.log.some((l) => l.text === NOTICE.custody.lines.warning)).toBe(true);
    expect(noticeOf(j.notice, 'custody')).toBeLessThan(NOTICE.custody.at.warning);
    expect(noticeOf(j.notice, 'custody')).toBeGreaterThan(0);
    expect(noticeOf(j.notice, 'gutter')).toBeLessThan(1);
  });

  it('hands the sortie its pressure, and folds a captain’s meeting back in', () => {
    const j = out();
    raise(j.notice, 'gutter', NOTICE.gutter.at.captain + 5, j.carry.standing);
    plot(j, options(j)[0]!.to.id);
    const def = sortieDef(j);
    expect(def.notice.captain?.faction).toBe('gutter');
    expect(def.notice.tiers.gutter).toBe('captain');
    const id = def.notice.captain!.id;
    endSortie(j, result(j, { captain: { id, report: 'escaped' } }));
    expect(captainOf(j.notice, 'gutter')!.escaped).toBe(1);
    expect(sortieDef(j).notice.captain).toBeNull();
  });

  it('saves with a version, and brings a save from before notice up to date', () => {
    const j = out();
    raise(j.notice, 'custody', 30, j.carry.standing);
    expect(j.version).toBe(VERSION);
    expect(migrate(JSON.parse(JSON.stringify(j)))).toEqual(j);
    const old = JSON.parse(JSON.stringify(j)) as Partial<Journey>;
    old.version = 1;
    delete old.notice;
    const up = migrate(old)!;
    expect(up.version).toBe(VERSION);
    expect(up.notice).toEqual(newNotice());
    expect(sortieDef(up).notice.captain).toBeNull();
  });
});

describe('a captain in the world', () => {
  function sortie(j: Journey, chits = 0): World {
    const def = sortieDef(j);
    const w = new World(5, { mode: 'breakout', sortie: def, carry: { ...j.carry, chits } });
    w.cardNext = Infinity;
    w.portCalled = true;
    w.bk!.nextPursuit = Infinity;
    return w;
  }

  function hunted(f: 'custody' | 'gutter'): Journey {
    const j = newJourney(7);
    endSortie(j, result(j));
    raise(j.notice, f, NOTICE[f].at.captain, j.carry.standing);
    plot(j, options(j)[0]!.to.id);
    return j;
  }

  it('find you once due, and their ship comes in under its name', () => {
    const j = hunted('custody');
    const w = sortie(j);
    w.captainAt = 1;
    run(w, 1.2);
    expect(w.phase).toBe('comms');
    const id = NOTICE.custody.captains[0]!;
    expect(w.comms!.def.id).toBe(`captain:${id}`);
    expect(w.answer('fight')).toBe(true);
    run(w, 6);
    expect(w.command.boss?.name).toBe(CAPTAIN_BY_ID[id]!.ship);
    // the sortie ended short of the lane with them still fighting: theirs
    expect(w.result().captain).toEqual({ id, report: 'won' });
  });

  it('ambush, if that is their way, and stand off when paid, if they deal', () => {
    const j = hunted('gutter');
    // the Gutter's first captain is a broker
    const v = sortie(j, 500);
    v.captainAt = 1;
    run(v, 1.2);
    expect(v.answer('pay')).toBe(true);
    expect(v.chits).toBeLessThan(500);
    expect(v.result().captain).toEqual({ id: 'kade', report: 'bargained' });
    // a scarred captain ambushes, whatever they were
    captainOf(j.notice, 'gutter')!.scarred = 1;
    const w = sortie(j);
    w.captainAt = 1;
    run(w, 1.2);
    expect(w.comms!.slow).toBeGreaterThan(0);
  });

  it('sends hunters oftener', () => {
    const j = hunted('custody');
    const w = sortie(j);
    expect(w.sortie.notice.pursuit).toBe(NOTICE.custody.hunt);
    const quiet = newJourney(7);
    endSortie(quiet, result(quiet));
    plot(quiet, options(quiet)[0]!.to.id);
    expect(sortieDef(quiet).notice.pursuit).toBe(1);
  });

  it('tells the journey what the cards did to notice', () => {
    const j = hunted('custody');
    const w = sortie(j, 100);
    j.carry.levels = {};
    w.openComms(CARD_BY_ID.gutter_word!);
    expect(w.answer('pay')).toBe(true);
    expect(w.result().notice).toEqual({ gutter: -4 });
  });
});

describe('the chart readout', () => {
  it('lists only factions that have marked you, most marked first, with standing and the next tier', () => {
    const n = newNotice();
    expect(readout(n, {})).toEqual([]);
    const standing = { custody: -1 };
    raise(n, 'gutter', NOTICE.gutter.at.warning, {});
    raise(n, 'custody', NOTICE.custody.at.toll + 1, standing);
    const [a, b] = readout(n, standing);
    expect(a).toMatchObject({ faction: 'custody', tier: 'toll', next: { tier: 'hunters', at: NOTICE.custody.at.hunters }, standing: standing.custody, captain: null });
    expect(b).toMatchObject({ faction: 'gutter', tier: 'warning', standing: 0 });
    raise(n, 'office', 1, {});
    expect(readout(n, standing).find((l) => l.faction === 'office')).toMatchObject({ tier: 'quiet', standing: null });
  });

  it('names the captain on the file at the top tier, with no tier above', () => {
    const n = marked('custody');
    const [l] = readout(n, {});
    const c = captainOf(n, 'custody')!;
    expect(l).toMatchObject({ tier: 'captain', next: null, captain: { name: CAPTAIN_BY_ID[c.id]!.name, rest: c.rest } });
  });
});
