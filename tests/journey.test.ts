import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CARDS } from '../src/content/cards';
import { HOME, JUMP_T, SUPPLIES_START, TANK_MAX, type SortieResult } from '../src/sim/breakout';
import {
  arrive, COLS, jumps, lanesFrom, makeChart, NET_MARKUP, NET_RATE, netted, pricesAt, pushNet, spreadNet, sysById, viewOf, type Chart,
} from '../src/sim/chart';
import { behind, daysUntil, huntOn, newHunt, SEARCH } from '../src/sim/hunt';
import {
  ADRIFT, bankAnswer, DAY, debrief, endSortie, here, RATION, newJourney, options, plot, replot, sortieDef, tally, WAITING, WEAR, WRECKS, type Journey,
} from '../src/sim/journey';
import { openChapter } from '../src/sim/chapters';
import { Rng } from '../src/sim/rng';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';
import { VERSION } from '../src/sim/journey';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input()); };

/** A sortie result as the world would hand it back: jumped (or wrecked) after `time` seconds, with the journey's carry changed by `c`. */
function result(j: Journey, o: Partial<SortieResult> = {}, c: Partial<Journey['carry']> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = (o.ended ?? 'jumped') === 'jumped';
  return { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3, ...c }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o };
}

/** Out of Cerro and onto the chart in the first system. */
function pastBreakout(seed = 7): Journey {
  const j = newJourney(seed);
  endSortie(j, result(j, {}, { cyrite: 20, supplies: 12}));
  // the opening's chain beyond the gate is played already
  j.carry.flags.push('archive_woke');
  return j;
}

describe('the chart', () => {
  it('lays out the same region for the same seed, Cerro to the Threshold', () => {
    const a = makeChart(11), b = makeChart(11);
    expect(a).toEqual(b);
    // three regions: Cerro, nine systems and the Narrows; six and the Rift; four and the Threshold
    expect(a.systems.length).toBe(23);
    expect(a.systems.filter((s) => s.kind === 'gate').map((s) => s.name)).toEqual(['The Narrows', 'The Rift']);
    expect(sysById(a, a.home).kind).toBe('home');
    expect(sysById(a, a.edge).kind).toBe('edge');
    expect(sysById(a, a.edge).col).toBe(COLS - 1);
    expect(makeChart(12).systems.map((s) => s.name)).not.toEqual(a.systems.map((s) => s.name));
  });

  it('can always be crossed, and every system reached', () => {
    for (let seed = 1; seed < 40; seed++) {
      const c = makeChart(seed);
      for (const s of c.systems) expect(jumps(c, c.home, s.id), `seed ${seed} ${s.name}`).toBeLessThan(Infinity);
      expect(jumps(c, c.home, c.edge)).toBeGreaterThanOrEqual(COLS - 1);
      // a region has somewhere to buy food and somewhere to cut Cyrite beyond Cerro
      expect(c.systems.some((s) => s.kind === 'port')).toBe(true);
      expect(c.systems.some((s) => s.kind === 'mining')).toBe(true);
      for (const r of c.routes) {
        expect(r.cyrite).toBeGreaterThanOrEqual(10);
        expect(r.cyrite).toBeLessThan(TANK_MAX);
        expect([1, 2]).toContain(r.days);
      }
    }
  });

  it('spreads the Net along the lanes only, faster into Cyrite, and not into a system holding out', () => {
    const c = makeChart(5);
    const first = lanesFrom(c, c.home).map((l) => l.to.id);
    spreadNet(c, 1, new Rng(1));
    for (const s of c.systems) if (!first.includes(s.id) && s.id !== c.home) expect(c.net[s.id] ?? 0).toBe(0);
    const held = first[0]!;
    c.stall[held] = 50;
    spreadNet(c, 12, new Rng(2));
    expect(netted(c, held)).toBe(false);
    for (const id of first.slice(1)) expect(netted(c, id)).toBe(true);
  });

  it('presses harder where the front is broad', () => {
    // a system with two netted neighbours falls faster than with one
    let one = 0, two = 0;
    for (let seed = 1; seed < 30; seed++) {
      const c = makeChart(seed);
      const s = c.systems.find((x) => x.col === 2 && lanesFrom(c, x.id).filter((l) => l.to.col === 1).length >= 2);
      if (!s) continue;
      const [a, b] = lanesFrom(c, s.id).filter((l) => l.to.col === 1).map((l) => l.to.id);
      const c1 = structuredClone(c), c2 = structuredClone(c);
      c1.net[a!] = 1;
      c2.net[a!] = 1; c2.net[b!] = 1;
      spreadNet(c1, 1, new Rng(seed));
      spreadNet(c2, 1, new Rng(seed));
      one += c1.net[s.id] ?? 0;
      two += c2.net[s.id] ?? 0;
    }
    expect(one).toBeGreaterThan(0);
    expect(two).toBeGreaterThan(one * 1.3);
  });

  it('lets a survey relay bring the Net in at a stroke, ahead of the front, unless the system holds out', () => {
    const c = makeChart(4);
    const far = c.systems.find((s) => s.col === 3)!;
    pushNet(c, far.id, 4);
    expect(c.net[far.id]).toBeCloseTo(Math.min(1, 4 * NET_RATE * (0.5 + far.cyrite)), 5);
    const held = c.systems.find((s) => s.col === 2)!;
    c.stall[held.id] = 2;
    pushNet(c, held.id, 4);
    expect(c.net[held.id] ?? 0).toBe(0);
  });

  it('marks a netted port’s prices up', () => {
    const c = makeChart(3);
    const s = c.systems.find((x) => x.port && x.kind !== 'home')!;
    const before = pricesAt(c, s.id)!;
    c.net[s.id] = 1;
    const after = pricesAt(c, s.id)!;
    expect(after.cyrite).toBeGreaterThanOrEqual(Math.round(before.cyrite * NET_MARKUP.cyrite!) - 1);
      });

  it('knows the Net only as far as the news reaches', () => {
    const c: Chart = makeChart(9);
    for (const s of c.systems) c.net[s.id] = 1;
    arrive(c, c.home, 3);
    for (const id of c.seenNet) expect(jumps(c, c.home, id)).toBeLessThanOrEqual(2);
    expect(c.seenNet).not.toContain(c.edge);
  });
});

describe('Calloway', () => {
  it('does not set out until you leave Cerro, then follows the trail a lane at a time', () => {
    const c = makeChart(4), h = newHunt();
    const trail = [c.home];
    huntOn(h, c, trail, 10);
    expect(h.delay).toBeGreaterThan(0);
    const next = lanesFrom(c, c.home)[0]!;
    trail.push(next.to.id);
    expect(behind(h, trail)).toBe(1);
    const until = daysUntil(h, c, trail);
    expect(until).toBeCloseTo(h.delay + next.route.days + SEARCH, 5);
    expect(huntOn(h, c, trail, until - 0.01)).toBe(false);
    expect(huntOn(h, c, trail, 0.02)).toBe(true);
    expect(behind(h, trail)).toBe(0);
    expect(daysUntil(h, c, trail)).toBe(0);
  });
});

describe('the journey', () => {
  it('begins with the Breakout, the lane out of Cerro already plotted', () => {
    const j = newJourney(2);
    expect(j.status).toBe('sortie');
    const d = sortieDef(j);
    expect(d.home).toBe(true);
    expect(d.blockade).toBe(true);
    expect(d.jumpCost).toBe(HOME.jumpCost);
    expect(d.calloway).toBe(Infinity);
    expect(lanesFrom(j.chart, j.at).map((l) => l.to.id)).toContain(j.dest);
    expect(j.carry.supplies).toBe(SUPPLIES_START);
  });

  it('jumps: the lane takes days, food and parts, then the chart', () => {
    const j = newJourney(2);
    const dest = j.dest!;
    const days = lanesFrom(j.chart, j.at).find((l) => l.to.id === dest)!.route.days;
    const out = endSortie(j, result(j, { time: DAY / 2 }, { cyrite: 5, supplies: 12}));
    expect(out.kind).toBe('jumped');
    expect(j.status).toBe('chart');
    expect(j.at).toBe(dest);
    expect(j.trail).toEqual([j.chart.home, dest]);
    expect(j.day).toBeCloseTo(0.5 + days, 5);
    expect(j.carry.supplies).toBe(12 - days * RATION - WEAR);
    expect(j.carry.cyrite).toBe(5);
    expect(j.chart.visited).toContain(dest);
  });

  it('goes hungry and wears the hull when the supplies run out', () => {
    const j = newJourney(2);
    endSortie(j, result(j, {}, { supplies: 0, plates: 3 }));
    expect(j.hungry).toBe(1);
    expect(j.carry.plates).toBe(2);
  });

  it('plots only lanes out of here, and never back to Cerro', () => {
    const j = pastBreakout();
    expect(options(j).some((o) => o.to.kind === 'home')).toBe(false);
    expect(plot(j, j.chart.home)).toBe(false);
    const far = j.chart.systems.find((s) => !lanesFrom(j.chart, j.at).some((l) => l.to.id === s.id) && s.id !== j.at)!;
    expect(plot(j, far.id)).toBe(false);
    const to = options(j)[0]!;
    expect(plot(j, to.to.id)).toBe(true);
    expect(j.status).toBe('sortie');
    expect(sortieDef(j).jumpCost).toBe(to.route.cyrite);
  });

  it('flies a netted system under a blockade, hotter, at a dearer port', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    delete j.chart.net[j.at];
    const free = sortieDef(j);
    j.chart.net[j.at] = 1;
    const held = sortieDef(j);
    expect(free.blockade).toBe(false);
    expect(held.blockade).toBe(true);
    expect(held.heat).toBeGreaterThan(free.heat);
  });

  it('brings Calloway in when she reaches the system, sooner the longer you linger', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const d = sortieDef(j);
    expect(d.calloway).toBeCloseTo(daysUntil(j.hunt, j.chart, j.trail) * DAY, 3);
    j.hunt.idx = j.trail.length - 1;
    j.hunt.delay = 0;
    expect(sortieDef(j).calloway).toBe(WAITING);
  });

  it('holds her up and stalls the Net for what the sortie did', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const at = j.at;
    delete j.chart.net[at];
    const same = structuredClone(j);
    endSortie(j, result(j, { huntDelay: 2, stall: 3, time: 0 }));
    endSortie(same, result(same, { time: 0 }));
    // two days further behind than she would have been, wherever she is
    expect(daysUntil(j.hunt, j.chart, j.trail) - daysUntil(same.hunt, same.chart, same.trail)).toBeCloseTo(2, 5);
    expect(j.chart.stall[at]).toBeGreaterThan(0);
  });

  it('leaves you adrift after a wreck: towed to another system of the region, a day later, a share of the stores gone; the third in the region is a total loss', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const at = j.at, day = j.day, region = viewOf(j.chart, at);
    const out = endSortie(j, result(j, { ended: 'destroyed', time: DAY }, { cyrite: 11 + 8 }));
    expect(out.kind).toBe('adrift');
    expect(j.status).toBe('sortie');
    expect(j.at).not.toBe(at);
    expect(viewOf(j.chart, j.at)).toBe(region);
    expect(['home', 'gate', 'edge']).not.toContain(sysById(j.chart, j.at).kind);
    expect(j.dest).not.toBeNull();
    expect(j.lost).toBe(1);
    expect(j.day).toBeCloseTo(day + 1 + ADRIFT, 5);
    expect(j.carry).toMatchObject({ cyrite: 9, plates: 2 });
    for (let i = 1; i < WRECKS - 1; i++) { endSortie(j, result(j, { ended: 'destroyed' })); }
    const end = endSortie(j, result(j, { ended: 'destroyed' }));
    expect(end.kind).toBe('wrecked');
    expect(j.status).toBe('over');
  });

  it('counts wrecks for each region: crossing a gate starts the count again', () => {
    const j = pastBreakout();
    j.lost = 2;
    openChapter(j, 1);
    expect(j.lost).toBe(0);
  });

  it('ends it at the first wreck in hardcore, or with Calloway in the system', () => {
    const hard = newJourney(3, true);
    expect(endSortie(hard, result(hard, { ended: 'destroyed' })).kind).toBe('wrecked');
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    expect(endSortie(j, result(j, { ended: 'destroyed', calloway: true })).kind).toBe('captured');
    expect(j.end).toBe('captured');
  });

  it('is through when the Wayward reaches the Threshold', () => {
    const j = pastBreakout();
    let guard = 0;
    while (j.status === 'chart' && guard++ < 20) {
      // always the lane that gets closest to the Threshold
      const o = options(j).sort((a, b) => jumps(j.chart, a.to.id, j.chart.edge) - jumps(j.chart, b.to.id, j.chart.edge))[0]!;
      plot(j, o.to.id);
      endSortie(j, result(j, { time: 60 }, { supplies: 30}));
    }
    expect(j.end).toBe('through');
    expect(j.at).toBe(j.chart.edge);
  });

  it('re-plots from a port while docked, and only from a port', () => {
    let j: Journey | null = null;
    for (let seed = 1; seed < 60 && !j; seed++) {
      const k = pastBreakout(seed);
      if (here(k).port && options(k).length >= 2) j = k;
    }
    plot(j!, options(j!)[0]!.to.id);
    const other = options(j!)[1]!;
    expect(replot(j!, j!.chart.home)).toBe(false);
    expect(replot(j!, other.to.id)).toEqual({ dest: other.to.name, jumpCost: other.route.cyrite });
    expect(j!.dest).toBe(other.to.id);
    expect(sortieDef(j!).jumpCost).toBe(other.route.cyrite);
    // between systems there is nothing to re-plot: the chart is open
    const at = structuredClone(j!);
    at.status = 'chart';
    expect(replot(at, other.to.id)).toBe(false);
    // and a system without a port has no dock to do it from
    for (let seed = 1; seed < 60; seed++) {
      const k = pastBreakout(seed);
      if (here(k).port) continue;
      plot(k, options(k)[0]!.to.id);
      expect(replot(k, options(k)[0]!.to.id)).toBe(false);
      break;
    }
  });

  it('brings the Net into a system whose survey relay was left to finish', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const at = j.at;
    delete j.chart.net[at];
    endSortie(j, result(j, { stall: -4, time: 0 }));
    expect(j.chart.net[at]).toBeGreaterThan(0.5);
  });

  it('brings the chart up to date when news was bought', () => {
    const j = pastBreakout();
    for (const s of j.chart.systems) j.chart.net[s.id] = 1;
    plot(j, options(j)[0]!.to.id);
    endSortie(j, result(j, {}, { flags: ['news'] }));
    expect(j.chart.seenNet.length).toBe(j.chart.systems.length);
    expect(j.carry.flags).not.toContain('news');
  });

  it('saves and loads through JSON, and refuses what it cannot read', () => {
    const j = pastBreakout();
    const back = migrate(JSON.parse(JSON.stringify(j)));
    expect(back).toEqual(j);
    expect(migrate(null)).toBeNull();
    expect(migrate({ version: 99 })).toBeNull();
    expect(migrate({ version: 1 })).toBeNull();
  });

  it('turns an old save\'s Krail into Cyrite, its rail into Krail, and fits the stock ship', () => {
    const j = pastBreakout();
    const old = JSON.parse(JSON.stringify(j).replace(/cyrite/g, 'krail'));
    old.version = 6;
    delete old.carry.krail;
    old.carry.krail = 17;
    old.carry.xp = 9;
    old.carry.levels = { ph_emitters: 2 };
    const back = migrate(old)!;
    expect(back.version).toBe(VERSION);
    // all of it the tank's, up to what the tank holds
    expect(back.carry.fuel + back.carry.cyrite).toBe(17 + Math.round(9 / 5));
    expect(back.carry.fuel).toBe(17 + Math.round(9 / 5));
    expect('krail' in back.carry).toBe(false);
    expect(back.carry.levels).toEqual({ tp_bay: 1, ph_emitters: 2 });
    expect('xp' in back.carry).toBe(false);
    expect(back.chart.routes.every((r) => typeof r.cyrite === 'number')).toBe(true);
    expect(back.chart.systems.every((s) => typeof s.cyrite === 'number' && (!s.port || typeof s.port.prices.cyrite === 'number'))).toBe(true);
    expect(Object.values(back.chart.places).some((p) => (p.reward as string) === 'krail')).toBe(false);
  });
});

describe('a sortie in the world', () => {
  /** The world flying the journey's next system. */
  function sortie(j: Journey): World {
    const w = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    w.cardNext = Infinity;
    w.portCalled = true;
    w.bk!.nextPursuit = Infinity;
    return w;
  }

  it('carries the ship in and back out', () => {
    const j = pastBreakout();
    j.carry = { ...j.carry, cyrite: 17, supplies: 7, plates: 2, levels: { ut_scanner: 1 }, refit: 2, flags: ['codes'], standing: { guild: 1 } };
    plot(j, options(j)[0]!.to.id);
    const w = sortie(j);
    expect(w.cyrite).toBe(17);
    expect(w.supplies).toBe(7);
    expect(w.plates).toBe(2);
    expect(w.levels.ut_scanner).toBe(1);
    expect(w.refit).toBe(2);
    expect(w.flags.has('codes')).toBe(true);
    expect(w.carry()).toMatchObject({ cyrite: 17, supplies: 7, plates: 2, refit: 2, flags: ['codes'] });
  });

  it('takes a new lane plotted at the dock, and only while docked', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const w = sortie(j);
    expect(w.replot('Elsewhere', 17)).toBe(false);
    w.phase = 'dock';
    expect(w.replot('Elsewhere', 17)).toBe(true);
    expect(w.jumpCost).toBe(17);
    expect(w.bk!.def.dest).toBe('Elsewhere');
  });

  it('jumps on the plotted lane’s Cyrite, and has a port only where the system has one', () => {
    const j = pastBreakout();
    const o = options(j)[0]!;
    plot(j, o.to.id);
    const w = sortie(j);
    expect(w.jumpCost).toBe(o.route.cyrite);
    expect(!!w.bk!.port).toBe(!!here(j).port);
    const b = w.bk!;
    b.blockade = 'done';
    w.fuel = o.route.cyrite;
    w.ship.x = b.lane.x; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0;
    run(w, 8 + JUMP_T);
    expect(w.phase).toBe('over');
    const res = w.result();
    expect(res.ended).toBe('jumped');
    expect(res.carry.fuel).toBe(0);
  });

  it('opens Calloway’s channel when she arrives, and counts her ship beaten', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const w = sortie(j);
    w.callowayAt = 1;
    run(w, 1.5);
    expect(w.phase).toBe('comms');
    expect(w.comms!.def.id).toBe('calloway_here');
    expect(w.answer('fight')).toBe(true);
    run(w, 6);
    const boss = w.command.boss;
    expect(boss?.name.startsWith('Calloway')).toBe(true);
    expect(w.result().calloway).toBe(true);
  });

  it('sends the hunt and the Net what the cards did', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const w = sortie(j);
    w.cyrite = 40;
    w.openComms(CARDS.find((c) => c.id === 'false_trail')!);
    w.comms!.truth = 'honest';
    expect(w.answer('pay')).toBe(true);
    w.openComms(CARDS.find((c) => c.id === 'holdout')!);
    w.comms!.truth = 'true';
    expect(w.answer('krail')).toBe(true);
    const res = w.result();
    expect(res.huntDelay).toBeCloseTo(1.5, 5);
    expect(res.stall).toBe(3);
  });

  it('puts a toll on an open lane instead of the blockade', () => {
    let tolls = 0;
    for (let seed = 1; seed < 60; seed++) {
      const j = pastBreakout(seed);
      plot(j, options(j)[0]!.to.id);
      // an open lane: the Net may already hold the first system at its pace
      delete j.chart.net[j.at];
      j.carry.hush = 600;
      const w = new World(seed, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
      w.cardNext = Infinity; w.portCalled = true; w.bk!.nextPursuit = Infinity;
      const b = w.bk!;
      w.ship.x = b.lane.x + 300; w.ship.z = b.lane.z; w.ship.vx = w.ship.vz = 0;
      run(w, 0.2);
      expect(b.blockade).not.toBe('checkpoint');
      if (w.phase === 'comms') { expect(w.comms!.def.trigger).toBe('toll'); tolls++; }
    }
    // a toll is a roll, not every jump's
    expect(tolls).toBeGreaterThan(0);
    expect(tolls).toBeLessThan(40);
  });

  it('keeps Cerro’s story in Cerro, and plays a card that comes once only once a journey', () => {
    const j = pastBreakout();
    plot(j, options(j)[0]!.to.id);
    const w = sortie(j);
    const ctx = w.commsCtx();
    expect(ctx.kind).not.toBe('home');
    const home = CARDS.filter((c) => c.when?.kind === 'home');
    expect(home.map((c) => c.id)).toContain('foreman');
    const heard = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: { ...j.carry, seen: ['calloway', 'ore_buyer'] } });
    const blocked = (heard as unknown as { blocked(): Set<string> }).blocked();
    expect(blocked.has('calloway')).toBe(true);
  });

  it('sells food at the port', () => {
    const w = new World(5, { mode: 'breakout' });
    const b = w.bk!;
    w.cardNext = Infinity; w.portCalled = true; b.nextPursuit = Infinity;
    w.ship.x = b.port!.x; w.ship.z = b.port!.z; w.ship.vx = w.ship.vz = 0;
    run(w, 1.5);
    expect(w.phase).toBe('dock');
    w.chits = 10;
    const food = w.supplies;
    expect(w.buy('supplies')).toBe(true);
    expect(w.supplies).toBe(food + 1);
    expect(w.chits).toBe(10 - w.prices.supplies);
  });
});

describe('banking an answer', () => {
  const copy = (c: Journey['carry']): Journey['carry'] => ({ ...c, flags: [...c.flags], seen: [...c.seen], standing: { ...c.standing }, jobs: c.jobs.map((x) => ({ ...x })) });

  it('writes only what the answer changed into the journey, and survives a save', () => {
    const j = pastBreakout();
    j.carry.cyrite = 50;
    j.status = 'sortie';
    // the answer pays 30 Cyrite and gives a flag, standing and a heard card
    const before = copy(j.carry);
    const after = copy(before);
    after.cyrite -= 30;
    after.flags.push('frag_ledger');
    after.seen.push('story_ledger');
    after.standing.kellern = -1;
    bankAnswer(j, before, after);
    expect(j.carry.cyrite).toBe(20);
    expect(j.carry.flags).toContain('frag_ledger');
    expect(j.carry.seen).toContain('story_ledger');
    expect(j.carry.standing.kellern).toBe(-1);
    const back = migrate(JSON.parse(JSON.stringify(j)));
    expect(back?.carry.flags).toContain('frag_ledger');
    expect(back?.carry.cyrite).toBe(20);
  });

  it('never drops a stock below nothing, and takes back a flag an answer cleared', () => {
    const j = pastBreakout();
    j.carry.flags = ['news'];
    j.carry.supplies = 1;
    const before = copy(j.carry);
    before.supplies = 5;
    const after = copy(before);
    after.supplies = 0;
    after.flags = [];
    bankAnswer(j, before, after);
    expect(j.carry.supplies).toBe(0);
    expect(j.carry.flags).not.toContain('news');
  });
});

describe('the debrief strip', () => {
  it('lists only what a sortie changed, stocks first and the days last', () => {
    const j = pastBreakout();
    const was = tally(j);
    j.carry.cyrite += 12;
    j.carry.supplies -= 2;
    j.carry.plates -= 1;
    j.day += 1.5;
    expect(debrief(was, j)).toEqual([
      { key: 'cyrite', d: 12 }, { key: 'plates', d: -1 }, { key: 'supplies', d: -2 }, { key: 'day', d: 1.5 },
    ]);
  });

  it('is empty when nothing moved', () => {
    const j = pastBreakout();
    expect(debrief(tally(j), j)).toEqual([]);
  });
});
