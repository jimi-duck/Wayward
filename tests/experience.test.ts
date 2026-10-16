import { describe, expect, it, vi } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { EXPANSES, FEATURES, type FeatureId } from '../src/content/features';
import { HAZARDS, PROFILES, SITE_OF_PLACE } from '../src/content/profiles';
import { migrate } from '../src/meta/save';
import { regionOf, sysById, type Chart } from '../src/sim/chart';
import { composeChart, expOf, objectiveOf, signature, skyOfSignature } from '../src/sim/experience';
import { newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { coverRate } from '../src/sim/rules';
import { laySortie } from '../src/sim/sites';
import { Space } from '../src/sim/space';
import { World } from '../src/sim/world';

// the tests deal many whole journeys; a busy CI runner needs more than the default 5 s
vi.setConfig({ testTimeout: 30_000 });
const idle = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const open = (c: Chart) => c.systems.filter((s) => s.kind !== 'home' && s.kind !== 'gate' && s.kind !== 'edge');
const SEEDS = Array.from({ length: 24 }, (_, i) => 100 + i * 37);
const made = new Map<number, Journey>();
/** A fresh journey, or a shared one for the tests that only read the chart. */
const journey = (seed: number): Journey => newJourney(seed, false, 'eight');
const shared = (seed: number): Journey => { let j = made.get(seed); if (!j) { j = journey(seed); made.set(seed, j); } return j; };
/** The sortie the Wayward would fly in this system. */
const defOf = (j: Journey, id: string) => { j.at = id; return sortieDef(j); };

describe('the experience composer', () => {
  it('deals every open system a sky, and nothing to the rest', () => {
    const j = journey(7);
    for (const s of j.chart.systems) {
      if (s.kind === 'home' || s.kind === 'gate' || s.kind === 'edge') expect(j.chart.exp![s.id]).toBeUndefined();
      else expect(j.chart.exp![s.id], s.id).toBeDefined();
    }
  });

  it('is the same every time for a seed, and different for another', () => {
    expect(journey(11).chart.exp).toEqual(journey(11).chart.exp);
    expect(journey(11).chart.exp).not.toEqual(journey(12).chart.exp);
  });

  it('redeals a single system without touching the rest', () => {
    const j = journey(5);
    const before = JSON.stringify(j.chart.exp);
    composeChart(j.chart, j.seed, open(j.chart)[3]!.id);
    expect(JSON.stringify(j.chart.exp)).toBe(before);
  });

  it('keeps a breather calm: no busy expanse, no hazard, at most one ambient feature', () => {
    let seen = 0;
    for (const seed of SEEDS) {
      const c = shared(seed).chart;
      for (const s of open(c).filter((x) => x.quiet)) {
        seen++;
        const e = c.exp![s.id]!;
        expect(EXPANSES[e.x].load, `${s.id} ${e.x}`).toBe('calm');
        expect(e.f.length).toBeLessThanOrEqual(1);
        for (const f of [...e.f, ...(e.s && !c.places[s.id] ? [e.s] : [])]) expect(HAZARDS.has(f), f).toBe(false);
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('never stacks hazards: one storm or well to a system, and not two busy expanses in a row', () => {
    for (const seed of SEEDS) {
      const c = shared(seed).chart;
      for (const s of open(c)) {
        const e = c.exp![s.id]!;
        const all = [...(e.s ? [e.s] : []), ...e.f];
        expect(all.filter((f) => HAZARDS.has(f)).length, `${seed} ${s.id}`).toBeLessThanOrEqual(1);
        expect(all.filter((f) => FEATURES[f].load === 'busy' && FEATURES[f].layer !== 'far').length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('puts a place in the feature that looks like it, and a hazard only where the job is about it', () => {
    let places = 0;
    for (const seed of SEEDS) {
      const c = shared(seed).chart;
      for (const s of open(c)) {
        const e = c.exp![s.id]!, p = c.places[s.id], obj = objectiveOf(c, s.id);
        if (p) { places++; expect(e.s).toBe(SITE_OF_PLACE[p.id]); }
        else if (e.s && HAZARDS.has(e.s)) expect(obj).toBe('job:survey');
      }
    }
    expect(places).toBeGreaterThan(100);
  });

  it('keeps the neighbours different: no column deals one sky twice, and few repeat the last column', () => {
    let pairs = 0, same = 0, columns = 0, dupes = 0;
    for (const seed of SEEDS) {
      const c = shared(seed).chart;
      const cols = [...new Set(open(c).map((s) => s.col))].sort((a, b) => a - b);
      let prev: string[] = [];
      for (const col of cols) {
        const here = open(c).filter((s) => s.col === col).map((s) => skyOfSignature(signature(c, s.id)));
        columns++;
        if (new Set(here).size < here.length) dupes++;
        for (const k of here) { pairs++; if (prev.includes(k)) same++; }
        prev = here;
      }
    }
    expect(dupes / columns).toBeLessThan(0.08);
    expect(same / pairs).toBeLessThan(0.03);
  });

  it('shows something in the sky of nearly every active system, and leaves the breathers open', () => {
    // a breather has at most its place and one ambient feature
    let active = 0, shown = 0, calm = 0, quiet = 0;
    for (const seed of SEEDS) {
      const c = shared(seed).chart;
      for (const s of open(c)) {
        const e = c.exp![s.id]!, n = e.f.length + (e.s ? 1 : 0);
        if (s.quiet) { quiet++; if (n <= 2) calm++; } else { active++; if (n > 0) shown++; }
      }
    }
    expect(shown / active).toBeGreaterThan(0.9);
    expect(calm / quiet).toBe(1);
  });

  it('gives the regions different skies, each leaning to what it is about', () => {
    const share = (region: number, pick: (e: { x: string; f: FeatureId[]; s?: FeatureId }) => boolean) => {
      let n = 0, hit = 0;
      for (const seed of SEEDS) {
        const c = shared(seed).chart;
        for (const s of open(c).filter((x) => regionOf(x) === region && !x.quiet)) { n++; if (pick(c.exp![s.id]!)) hit++; }
      }
      return hit / n;
    };
    const has = (...fs: FeatureId[]) => (e: { f: FeatureId[]; s?: FeatureId }) => fs.some((f) => e.f.includes(f) || e.s === f);
    // the Salvage Belt is wrecks and yards; the Reach is neither
    expect(share(2, has('graveyard', 'works', 'breakers'))).toBeGreaterThan(share(0, has('graveyard', 'works', 'breakers')) + 0.3);
    // the Drift Deep is standing static, with the lantern line that steadies it
    expect(share(3, has('static'))).toBeGreaterThan(0.25);
    expect(share(3, has('static'))).toBeGreaterThan(share(0, has('static')) + 0.2);
    // the Hollows have the Voice's quiet
    expect(share(6, (e) => e.x === 'hush' || e.x === 'shoals')).toBeGreaterThan(0.5);
    expect(share(6, has('relic', 'carrier', 'well'))).toBeGreaterThan(share(1, has('relic', 'carrier', 'well')) + 0.2);
    // the Breaker Yards are the yards
    expect(share(4, (e) => e.x === 'yards')).toBeGreaterThan(0.4);
    // and no two regions deal the same mix
    const mix = (region: number) => Object.fromEntries(Object.keys(EXPANSES).map((x) => [x, Math.round(share(region, (e) => e.x === x) * 10)]));
    const seen = new Set(Array.from({ length: 8 }, (_, r) => JSON.stringify(mix(r))));
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });

  it('gives static a lantern line to follow', () => {
    let withStatic = 0, withLine = 0;
    for (const seed of SEEDS) {
      const c = shared(seed).chart;
      for (const s of open(c)) {
        const e = c.exp![s.id]!;
        if (e.f.includes('static') || e.s === 'static') { withStatic++; if (e.f.includes('lanterns') || e.s === 'lanterns') withLine++; }
      }
    }
    expect(withStatic).toBeGreaterThan(40);
    // (the Hollows leave it out: nothing human lit a line there)
    expect(withLine / withStatic).toBeGreaterThan(0.85);
  });

  it('has a profile for every region, with only real expanses and features in it', () => {
    expect(PROFILES.length).toBe(8);
    for (const P of PROFILES) {
      for (const x of Object.keys(P.expanses)) expect(EXPANSES[x as keyof typeof EXPANSES], x).toBeDefined();
      for (const f of Object.keys(P.lean)) expect(FEATURES[f as FeatureId], f).toBeDefined();
      expect(P.ambient[0]).toBeLessThanOrEqual(P.ambient[1]);
    }
  });

  it('composes an old save on load, from its seed', () => {
    const j = journey(9);
    const raw = JSON.parse(JSON.stringify(j));
    delete raw.chart.exp;
    raw.version = 16;
    const back = migrate(raw)!;
    expect(back.chart.exp).toBeDefined();
    expect(back.chart.exp).toEqual(j.chart.exp);
    expect(expOf(back.chart, back.chart.home, back.seed)).toBeUndefined();
  });
});

describe('Story sites, laid from the sky', () => {
  /** A sortie's space as the world lays it, on a straight course from the origin. */
  const lay = (j: Journey, id: string) => {
    const def = defOf(j, id);
    const space = new Space(j.seed + def.lane, { compose: false });
    const port = def.port ? { x: def.lane * 0.385 + 0, z: 200, r: 14 } : null;
    const laid = laySortie(space, def, { x: 0, z: 0 }, { x: def.lane, z: 0 }, port);
    return { def, space, laid, port };
  };

  it('keeps every feature off the straight line, the start, the lane mouth and the port', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const j = journey(seed);
      for (const s of open(j.chart)) {
        const { def, space, laid, port } = lay(j, s.id);
        for (const f of space.features) {
          const d = FEATURES[f.def];
          if (d.layer === 'far') continue;
          const isSite = laid && f.x === laid.x && f.z === laid.z;
          if (!isSite && d.layer !== 'air') continue;
          if (isSite && !j.chart.places[s.id]) continue; // a job's stage is on the way by design
          // clear of the lane mouth and the start
          expect(Math.hypot(f.x - def.lane, f.z), `${s.id} ${f.def} at lane`).toBeGreaterThan(f.r * (isSite ? 0.4 : 1) * 0.8);
          if (!isSite) {
            expect(Math.abs(f.z), `${s.id} ${f.def} on the line`).toBeGreaterThan(f.r * 0.9);
            if (port) expect(Math.hypot(f.x - port.x, f.z - port.z), `${s.id} ${f.def} on the port`).toBeGreaterThan(f.r);
          }
        }
      }
    }
  });

  it('lays the same space every time', () => {
    const j = journey(21);
    const id = open(j.chart)[8]!.id;
    const a = lay(j, id).space, b = lay(j, id).space;
    expect(a.features.map((f) => [f.def, f.x, f.z, f.r])).toEqual(b.features.map((f) => [f.def, f.x, f.z, f.r]));
  });

  it('puts a job’s stage in the feature that was dealt for it, on the side the port is not', () => {
    let jobs = 0;
    for (const seed of SEEDS.slice(0, 12)) {
      const j = journey(seed);
      for (const s of open(j.chart)) {
        const q = j.chart.situations?.[s.id];
        if (!q || !j.chart.exp![s.id]!.s || s.quiet) continue;
        const def = defOf(j, s.id);
        if (!def.situation) continue;
        jobs++;
        const w = new World(seed, { mode: 'breakout', sortie: def, space: true });
        expect(w.stage, s.id).not.toBeNull();
        expect(w.siteAt, s.id).not.toBeNull();
        expect(w.siteAt!.x).toBeCloseTo(w.stage!.x, 5);
        expect(w.siteAt!.z).toBeCloseTo(w.stage!.z, 5);
        const f = w.space!.features.find((q2) => q2.x === w.stage!.x && q2.z === w.stage!.z);
        expect(f?.def).toBe(j.chart.exp![s.id]!.s);
        if (w.bk!.port) {
          // the port is on the right of the heading; the stage is not
          const rx = Math.sin(w.ship.heading), rz = Math.cos(w.ship.heading);
          const sideOf = (p: { x: number; z: number }) => Math.sign((p.x - w.ship.x) * rx + (p.z - w.ship.z) * rz);
          expect(sideOf(w.stage!)).not.toBe(sideOf(w.bk!.port));
        }
      }
    }
    expect(jobs).toBeGreaterThan(30);
  });
});

describe('places pinned to the sky', () => {
  /** A system with this place, and a world flying it. */
  function placeWorld(id: string, region?: number) {
    for (const seed of SEEDS) {
      const j = journey(seed);
      for (const s of open(j.chart)) {
        const p = j.chart.places[s.id];
        if (p?.id !== id || s.quiet || (region !== undefined && regionOf(s) !== region)) continue;
        const def = defOf(j, s.id);
        return { w: new World(seed, { mode: 'breakout', sortie: def, space: true }), def, seed };
      }
    }
    throw new Error(`no ${id}`);
  }
  /** Flies, with the hull kept whole and the ship where it is unless it is told to move: the question is the sky, not the pursuit. */
  const fly = (w: World, s: number, hold = false) => { for (let i = 0; i < Math.round(s / STEP); i++) {
    if (hold) w.ship.vx = w.ship.vz = 0;
    w.plates = 9;
    // a call is answered with the first thing that can be said: the question here is the sky
    if (w.phase === 'comms') w.answer(w.comms!.choices.findIndex((c) => c.ok));
    else if (w.phase === 'hail') w.answer(0);
    w.step(STEP, idle());
  } };

  it('marks the place from the start, asleep, where the feature is', () => {
    const { w } = placeWorld('ion_storm');
    fly(w, 1);
    const e = w.encounter!;
    expect(e.dormant).toBe(true);
    expect(e.anchored).toBe(true);
    expect(w.siteAt).not.toBeNull();
    expect(e.x).toBeCloseTo(w.siteAt!.x, 5);
    expect(e.z).toBeCloseTo(w.siteAt!.z, 5);
    expect(w.space!.features.some((f) => f.def === 'storm' && f.x === e.x && f.z === e.z)).toBe(true);
    // nothing has happened: no hulls from it, no banner, no weather
    fly(w, 60, true);
    expect(w.encounter!.dormant).toBe(true);
    expect(w.encounter!.t).toBe(0);
  });

  it('wakes when the ship comes in, and a storm pays for the time spent in it', () => {
    const { w } = placeWorld('ion_storm');
    fly(w, 1);
    const e = w.encounter!;
    w.ship.x = e.x; w.ship.z = e.z + e.r * 0.3; w.ship.vx = w.ship.vz = 0;
    // sit in the cell: the world's lightning is the feature's; the event keeps the count
    w.plates = 9;
    let woke = false;
    for (let i = 0; i < Math.round(30 / STEP) && w.alive; i++) {
      w.ship.x = e.x; w.ship.z = e.z + e.r * 0.3; w.ship.vx = w.ship.vz = 0;
      w.step(STEP, idle());
      if (!e.dormant) woke = true;
      if (e.done) break;
    }
    expect(woke).toBe(true);
    expect(e.done).toBe(true);
    expect(e.success).toBe(true);
  });

  it('pays nothing for a storm flown past: the place stays on the chart', () => {
    const { w } = placeWorld('ion_storm');
    fly(w, 90, true);
    expect(w.result().place ?? null).toBeNull();
  });

  it('puts the wreck in the graveyard, and the hulks come only when you salvage it', () => {
    const { w } = placeWorld('derelict');
    fly(w, 1);
    const e = w.encounter!;
    const before = w.aliens.length;
    expect(e.dormant).toBe(true);
    expect(w.space!.features.some((f) => f.def === 'graveyard' && f.x === e.x && f.z === e.z)).toBe(true);
    w.ship.x = e.x; w.ship.z = e.z; w.ship.vx = w.ship.vz = 0;
    fly(w, 0.2);
    expect(e.dormant).toBe(false);
    expect(e.r).toBe(7);
    expect(w.aliens.length).toBeGreaterThanOrEqual(before);
  });

  it('lets the sector’s own events come while a place sleeps, and gives the place back after', () => {
    const { w } = placeWorld('derelict');
    fly(w, 1);
    const place = w.encounter!;
    let parked = false;
    for (let i = 0; i < Math.round(400 / STEP) && w.alive; i++) {
      fly(w, STEP, true);
      if (w.encounter && w.encounter !== place && !w.encounter.dormant) parked = true;
      if (parked && w.encounter === place) break;
    }
    expect(parked).toBe(true);
    expect(w.encounter).toBe(place);
    expect(place.dormant).toBe(true);
  });
});

describe('what the ground does', () => {
  it('runs the hunt slower in cover and faster where the region is watched', () => {
    expect(coverRate(0.45)).toBe(0.45);
    expect(coverRate(1)).toBe(1);
    expect(coverRate(1, 1.3)).toBe(1.3);
    expect(coverRate(0.45, 1.3)).toBe(0.45);
  });

  it('warns, then hails with a claim card, when you linger in a claimed field', () => {
    let found: { w: World } | null = null;
    for (const seed of SEEDS) {
      const j = journey(seed);
      for (const s of open(j.chart)) {
        if (found || s.quiet || ![1, 2].includes(regionOf(s))) continue;
        const def = defOf(j, s.id);
        if (!def.rules?.claim || def.netted) continue;
        const w = new World(seed, { mode: 'breakout', sortie: def, space: true });
        if (w.space!.features.some((f) => FEATURES[f.def].purpose.includes('resource'))) found = { w };
      }
      if (found) break;
    }
    const w = found!.w;
    const f = w.space!.features.find((x) => FEATURES[x.def].purpose.includes('resource'))!;
    const card = w.bk!.def.rules!.claim!.card;
    let hailed = '';
    for (let i = 0; i < Math.round(120 / STEP) && !hailed; i++) {
      w.ship.x = f.x; w.ship.z = f.z; w.ship.vx = w.ship.vz = 0; w.plates = 9;
      w.step(STEP, idle());
      if (w.phase === 'comms') hailed = w.comms!.def.id;
    }
    expect(hailed).toBe(card);
    // the crew only comes if the player says so: paying ends it
    const pay = w.comms!.choices.findIndex((c) => c.id === 'pay');
    const before = w.aliens.length;
    w.answer(pay);
    expect(w.aliens.length).toBe(before);
  });

  it('makes a lantern line steady the lane mouth in a static field', () => {
    const sp = new Space(1, { compose: false });
    sp.place('static', 0, 0, { r: 500 });
    sp.place('lanterns', 0, 0, { r: 200 });
    const inLine = sp.sample(0, 0), inStatic = sp.sample(350, 0);
    expect(inStatic.jam).toBeGreaterThan(0.3);
    expect(inLine.steady).toBeGreaterThan(0.8);
    expect(inLine.jam - inLine.steady).toBeLessThan(0.1);
  });
});
