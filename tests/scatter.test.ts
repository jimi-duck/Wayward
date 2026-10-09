import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { REGIONS } from '../src/content/regions';
import { CARDS } from '../src/content/cards';
import { condOk, type Ctx } from '../src/sim/comms';
import { TANK_MAX, type SortieResult } from '../src/sim/breakout';
import { gateOf, jumps, lanesFrom, makeChart, regionOf, routeBetween, spreadNet, sysById, viewOf, type Chart } from '../src/sim/chart';
import { endSortie, newJourney, options, plot, sortieDef, VERSION, type Journey } from '../src/sim/journey';
import { fleetAt, layScatter, presence, raided, stepScatter, threnAt, THREN_ABOUT } from '../src/sim/scatter';
import { Rng } from '../src/sim/rng';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function result(j: Journey, o: Partial<SortieResult> = {}, c: Partial<Journey['carry']> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = (o.ended ?? 'jumped') === 'jumped';
  return { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3, ...c }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o };
}

/** The chart with one lane cut, to see whether the way through still holds. */
const without = (c: Chart, id: string): Chart => ({ ...c, routes: c.routes.filter((r) => r.a !== id && r.b !== id) });

describe('regions', () => {
  it('are three, each out through a single gate, the last through the Threshold', () => {
    for (let seed = 1; seed < 30; seed++) {
      const c = makeChart(seed);
      expect(REGIONS.map((_, i) => gateOf(c, i).name)).toEqual(['The Narrows', 'The Rift', 'The Threshold']);
      // every way to the Threshold goes through both gates
      for (const i of [0, 1]) expect(jumps(without(c, gateOf(c, i).id), c.home, c.edge)).toBe(Infinity);
      // a gate's lanes run only to its own region and the next
      for (const i of [0, 1]) for (const { to } of lanesFrom(c, gateOf(c, i).id)) expect([i, i + 1]).toContain(regionOf(to));
    }
  });

  it('grow less human the further out', () => {
    let reachThren = 0, hollowsThren = 0, holdfasts = 0, alien = 0;
    const ports = [0, 0, 0], n = [0, 0, 0];
    for (let seed = 1; seed < 40; seed++) {
      const c = makeChart(seed);
      for (const s of c.systems) {
        const r = regionOf(s);
        if (s.kind !== 'home' && s.kind !== 'gate' && s.kind !== 'edge') { n[r]!++; if (s.port) ports[r]!++; }
        if (r === 0) { reachThren += threnAt(c, s.id); expect(['holdfast', 'voice', 'thren']).not.toContain(s.holder); }
        if (r === 1 && s.holder === 'holdfast') holdfasts++;
        if (r === 2 && s.kind !== 'edge') { hollowsThren += threnAt(c, s.id); if (s.holder === 'voice' || s.holder === 'thren') alien++; }
      }
    }
    expect(reachThren).toBe(0);
    expect(hollowsThren).toBeGreaterThan(20);
    // fewer docks the further out
    expect(ports[2]! / n[2]!).toBeLessThan(ports[1]! / n[1]!);
    expect(ports[1]! / n[1]!).toBeLessThan(ports[0]! / n[0]!);
    expect(holdfasts).toBeGreaterThan(30);
    expect(alien).toBeGreaterThan(40);
  });

  it('are shown one at a time: through a gate, the chart is the next region', () => {
    const c = makeChart(4);
    expect(viewOf(c, c.home)).toBe(0);
    expect(viewOf(c, gateOf(c, 0).id)).toBe(1);
    expect(viewOf(c, gateOf(c, 1).id)).toBe(2);
  });

  it('never let you back through a gate', () => {
    const j = newJourney(9);
    endSortie(j, result(j, {}, { cyrite: 30, supplies: 12}));
    j.at = gateOf(j.chart, 0).id;
    j.status = 'chart';
    const back = lanesFrom(j.chart, j.at).find(({ to }) => regionOf(to) === 0)!;
    expect(options(j).every((o) => regionOf(o.to) === 1)).toBe(true);
    expect(plot(j, back.to.id)).toBe(false);
    // and on the far side, the gate is behind you
    j.at = options(j)[0]!.to.id;
    expect(options(j).some((o) => o.to.kind === 'gate' && regionOf(o.to) === 0)).toBe(false);
  });

  it('slow the Net the further out it gets, and a Holdfast slows it more', () => {
    const c = makeChart(5);
    // net every system up to the Narrows, and let it press on for a while
    for (const s of c.systems) if (regionOf(s) === 0) c.net[s.id] = 1;
    const marches = c.systems.filter((s) => regionOf(s) === 1 && s.col === Math.min(...c.systems.filter((x) => regionOf(x) === 1).map((x) => x.col)));
    spreadNet(c, 1, new Rng(1));
    for (const s of marches) {
      // a day is not enough to take a first-column system of the Marches
      expect(c.net[s.id] ?? 0).toBeLessThan(1);
    }
  });
});

describe('the factions on their own', () => {
  it('start the same for a seed, and a save from before them is given theirs', () => {
    expect(makeChart(12).drifts).toEqual(makeChart(12).drifts);
    const j = newJourney(12);
    const old = JSON.parse(JSON.stringify(j));
    old.version = 5;
    delete old.chart.drifts; delete old.chart.thren; delete old.chart.raid;
    const back = migrate(old)!;
    expect(back.version).toBe(VERSION);
    expect(back.chart.drifts).toEqual(j.chart.drifts);
  });

  it('move: Drift fleets cross the chart, the Gutter raids, the Voice builds', () => {
    let moved = 0, raids = 0, built = 0;
    for (let seed = 1; seed < 20; seed++) {
      const c = makeChart(seed);
      const was = c.drifts!.map((f) => f.at);
      const voice = c.systems.filter((s) => s.holder === 'voice').length;
      const news = stepScatter(c, 10, new Rng(seed), { at: c.home, cyrite: 0, tank: TANK_MAX });
      moved += c.drifts!.filter((f, i) => f.at !== was[i]).length;
      raids += news.filter((n) => n.text.startsWith('Gutter raiders') || n.text.startsWith('The Gutter has taken')).length;
      built += c.systems.filter((s) => s.holder === 'voice').length - voice;
      for (const f of c.drifts!) expect(sysById(c, f.at).kind).not.toBe('home');
    }
    expect(moved).toBeGreaterThan(15);
    expect(raids).toBeGreaterThan(10);
    expect(built).toBeGreaterThan(3);
  });

  it('a raid makes a port dearer while it lasts', () => {
    const j = newJourney(3);
    const s = j.chart.systems.find((x) => x.port && x.kind !== 'home')!;
    const before = sortieDef({ ...j, at: s.id }).port!.prices.cyrite;
    j.chart.raid![s.id] = 2;
    expect(raided(j.chart, s.id)).toBe(true);
    expect(presence(j.chart, s.id)).toContain('raid');
    expect(sortieDef({ ...j, at: s.id }).port!.prices.cyrite).toBeGreaterThan(before);
  });

  it('the Thren follow Cyrite on the move', () => {
    const drawn = (cyrite: number) => {
      const c = makeChart(8);
      const at = c.systems.find((s) => regionOf(s) === 1 && s.kind !== 'gate')!;
      c.thren = {};
      for (const { to } of lanesFrom(c, at.id)) c.thren[to.id] = 0.6;
      stepScatter(c, 2, new Rng(1), { at: at.id, cyrite, tank: TANK_MAX });
      return threnAt(c, at.id);
    };
    expect(drawn(TANK_MAX)).toBeGreaterThan(drawn(0) + 0.05);
  });
});

describe('the Thren in a sortie', () => {
  function threnSortie(thren: number, cyrite: number) {
    const j = newJourney(6);
    endSortie(j, result(j, {}, { cyrite, supplies: 12}));
    j.chart.thren![j.at] = thren;
    const def = sortieDef(j);
    expect(def.thren).toBe(thren);
    return new World(11, { mode: 'breakout', sortie: def, carry: { ...j.carry, cyrite } });
  }

  it('swarm, sooner with a full tank, and scramble sensors and navigation', () => {
    const first = (cyrite: number) => {
      const w = threnSortie(0.8, cyrite);
      for (let i = 0; i < Math.round(240 / STEP); i++) {
        if (w.phase === 'comms') w.answer(0, true);
        w.step(STEP, input());
        if (w.aliens.some((a) => a.variant === 'mote')) return { t: w.runTime, w };
      }
      return { t: Infinity, w };
    };
    const full = first(TANK_MAX), dry = first(0);
    expect(full.t).toBeLessThan(120);
    // drawn by Cyrite: with a full tank the second swarm comes sooner than with none (the first is on a clock)
    expect(full.w.bk!.nextSwarm - full.t).toBeLessThan(dry.w.bk!.nextSwarm - dry.t);
    // close by, the scope and the lane mouth go strange
    const w = full.w;
    const m = w.aliens.find((a) => a.variant === 'mote')!;
    m.x = w.ship.x + 10; m.z = w.ship.z + 10;
    for (let i = 0; i < Math.round(2 / STEP); i++) w.step(STEP, input());
    expect(w.navNoise).toBeGreaterThan(0.5);
    expect(w.sensorsDown).toBe(true);
    const lane = w.seenPlaces().find((p) => p.kind === 'lane')!;
    expect(Math.hypot(lane.x - w.bk!.lane.x, lane.z - w.bk!.lane.z)).toBeGreaterThan(0);
  });

  it('never come where there are none', () => {
    const w = threnSortie(0, TANK_MAX);
    expect(w.bk!.nextSwarm).toBe(Infinity);
  });
});

describe('cards for who is here', () => {
  const ctx = (here: string[]): Ctx => ({
    t: 120, heat: 0.2, cyrite: 20, need: 20, tank: TANK_MAX, chits: 50, plates: 3, maxPlates: 3, levels: {}, flags: new Set(),
    standing: {}, place: 'open', hostiles: 0, supplies: 5, kind: 'transit', netted: false, behind: Infinity, here,
  });
  const card = (id: string) => CARDS.find((c) => c.id === id)!;

  it('come only where their people are', () => {
    for (const [id, who] of [['thren_smell', 'thren'], ['voice_ask', 'voice'], ['gutter_raid', 'raid'], ['drift_fleet', 'drift']] as const) {
      expect(condOk(card(id).when, ctx([])), id).toBe(false);
      expect(condOk(card(id).when, ctx([who])), id).toBe(true);
    }
  });

  it('a Drift fleet on the chart puts its card in the system', () => {
    const j = newJourney(2);
    const f = j.chart.drifts![0]!;
    expect(fleetAt(j.chart, f.at)).toBe(f);
    expect(presence(j.chart, f.at)).toContain('drift');
    expect(THREN_ABOUT).toBeGreaterThan(0);
    expect(routeBetween(j.chart, j.chart.home, j.chart.home)).toBeNull();
  });
});

describe('layScatter', () => {
  it('puts the Thren on every Thren lane', () => {
    for (let seed = 1; seed < 30; seed++) {
      const c = makeChart(seed);
      layScatter(c, seed);
      for (const [id, p] of Object.entries(c.places)) if (p.id === 'thren_lane') expect(threnAt(c, id)).toBeGreaterThanOrEqual(0.6);
    }
  });
});
