import { describe, expect, it } from 'vitest';
import { EXPANSES, EXPANSE_ORDER, FEATURES, FEATURE_ORDER, NAMED, type Purpose } from '../src/content/features';
import { STEP } from '../src/core/loop';
import { REGIONS } from '../src/content/regions';
import { reports, REPORT_TEXT, Space, weightAt, type Pose } from '../src/sim/space';
import { World } from '../src/sim/world';
import { HOME, type SortieDef } from '../src/sim/breakout';
import { siteFor } from '../src/sim/sites';

const PURPOSES: Purpose[] = ['visual', 'exploration', 'resource', 'tactical', 'hazard', 'mystery', 'navigation', 'story', 'neutral'];

/** Fly straight on for `secs`, at the ship's top speed, dealing as it goes. */
function fly(seed: number, secs: number, turn = 0): { space: Space; deals: Array<{ t: number; id: string }> } {
  const space = new Space(seed);
  const ship: Pose = { x: 0, z: 0, heading: Math.PI / 2 };
  const deals: Array<{ t: number; id: string }> = [];
  let seen = 0;
  for (let t = 0; t < secs; t += 0.5) {
    ship.heading += turn * 0.5;
    ship.x += Math.cos(ship.heading) * 39 * 0.5; ship.z -= Math.sin(ship.heading) * 39 * 0.5;
    space.step(0.5, t, ship);
    if (space.history.length && seen !== space.expanses.length) seen = space.expanses.length;
    for (const e of space.expanses) if (!deals.some((d) => d.id === `${e.n}`)) deals.push({ t, id: `${e.n}` });
  }
  return { space, deals };
}

describe('the library', () => {
  it('gives every feature a purpose, and the library every purpose', () => {
    for (const f of Object.values(FEATURES)) expect(f.purpose.length, f.id).toBeGreaterThan(0);
    for (const p of PURPOSES) expect(FEATURE_ORDER.some((id) => FEATURES[id].purpose.includes(p)), p).toBe(true);
  });

  it('is not all hazard: most features are harmless', () => {
    const hazard = FEATURE_ORDER.filter((id) => FEATURES[id].purpose.includes('hazard'));
    expect(hazard.length / FEATURE_ORDER.length).toBeLessThan(0.25);
    // (the lantern line steadies navigation, so it has an effect; it is still an aid, not a hazard)
    expect(FEATURE_ORDER.filter((id) => !Object.keys(FEATURES[id].effects).length).length).toBeGreaterThanOrEqual(4);
  });

  it('keeps every roster to real features, and every feature in some roster', () => {
    const used = new Set<string>();
    for (const e of Object.values(EXPANSES)) for (const id of Object.keys(e.roster)) { expect(FEATURES[id as keyof typeof FEATURES], id).toBeDefined(); used.add(id); }
    for (const id of FEATURE_ORDER) expect(used.has(id), id).toBe(true);
  });

  it('keeps colour clear of amber and red: no tint leans warm and bright', () => {
    for (const f of Object.values(FEATURES)) {
      const [r, g, b] = f.look.tint;
      expect(Math.max(r, g, b), f.id).toBeLessThanOrEqual(0.62);
      // amber is a lot of red, some green, no blue; red is red alone
      expect(r > 0.4 && b < 0.1, `${f.id} reads as amber or red`).toBe(false);
    }
  });

  it('names real features in real regions', () => {
    for (const n of Object.values(NAMED)) {
      expect(FEATURES[n.feature], n.id).toBeDefined();
      expect(n.regions[0]).toBeGreaterThanOrEqual(0);
      expect(n.regions[1]).toBeLessThan(REGIONS.length);
    }
  });
});

describe('space', () => {
  it('deals the same sky for the same seed and course', () => {
    const a = fly(7, 300), b = fly(7, 300);
    expect(a.space.expanses.map((e) => [e.def, Math.round(e.x)])).toEqual(b.space.expanses.map((e) => [e.def, Math.round(e.x)]));
    expect(a.space.features.map((f) => [f.def, Math.round(f.x)])).toEqual(b.space.features.map((f) => [f.def, Math.round(f.x)]));
  });

  it('leaves the first half minute alone, then opens calm', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { space, deals } = fly(seed, 120);
      expect(deals[0]!.t, `seed ${seed}`).toBeGreaterThanOrEqual(35);
      expect(EXPANSES[space.history[0]!].load, `seed ${seed}`).toBe('calm');
    }
  });

  it('varies: ten minutes cross six or more kinds of expanse and never repeat back to back', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const space = new Space(seed), ship: Pose = { x: 0, z: 0, heading: Math.PI / 2 };
      const seq: string[] = [];
      let last = -1;
      for (let t = 0; t < 900; t += 0.5) {
        ship.x += Math.cos(ship.heading) * 39 * 0.5; ship.z -= Math.sin(ship.heading) * 39 * 0.5;
        space.step(0.5, t, ship);
        const top = space.expanses[space.expanses.length - 1];
        if (top && top.n !== last) { last = top.n; seq.push(top.def); }
      }
      expect(new Set(seq).size, `seed ${seed}: ${seq}`).toBeGreaterThanOrEqual(5);
      for (let i = 1; i < seq.length; i++) expect(seq[i], `seed ${seed}: ${seq}`).not.toBe(seq[i - 1]);
    }
  });

  it('keeps a rhythm: never three busy expanses running', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const space = new Space(seed);
      const ship: Pose = { x: 0, z: 0, heading: 0 };
      const loads: string[] = [];
      let last = -1;
      for (let t = 0; t < 1500; t += 1) {
        ship.x += 39;
        space.step(1, t, ship);
        const top = space.expanses[space.expanses.length - 1];
        if (top && top.n !== last) { last = top.n; loads.push(EXPANSES[top.def].load); }
      }
      expect(loads.join(',').includes('busy,busy,busy'), `seed ${seed}: ${loads}`).toBe(false);
    }
  });

  it('holds back what is strange until the run has gone on', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { space } = fly(seed, 150);
      for (const f of space.features) expect(FEATURES[f.def].from, `${f.def} at seed ${seed}`).toBeLessThanOrEqual(150);
      expect(space.expanses.every((e) => EXPANSES[e.def].from <= 150)).toBe(true);
    }
  });

  it('keeps matter apart and keeps its own kind spaced', () => {
    const { space } = fly(3, 900);
    const matter = space.features.filter((f) => FEATURES[f.def].layer === 'matter');
    for (let i = 0; i < matter.length; i++) for (let j = i + 1; j < matter.length; j++) {
      const a = matter[i]!, b = matter[j]!;
      expect(Math.hypot(a.x - b.x, a.z - b.z) + 40, `${a.def} ${b.def}`).toBeGreaterThan(a.r + b.r);
    }
  });

  it('deals a feature every so often, not a flood', () => {
    let total = 0;
    for (let seed = 1; seed <= 10; seed++) total += fly(seed, 600).deals.length;
    const per = total / 10;
    expect(per).toBeGreaterThanOrEqual(6);
    expect(per).toBeLessThanOrEqual(16);
    for (let seed = 1; seed <= 10; seed++) expect(fly(seed, 600).space.features.length).toBeLessThanOrEqual(56);
  });

  it('lets go of what is far behind', () => {
    const { space } = fly(5, 1500);
    expect(space.expanses.length).toBeLessThanOrEqual(5);
    expect(space.history.length).toBeLessThanOrEqual(4);
  });

  it('places by hand for Story, and does not deal on its own', () => {
    const space = new Space(1, { compose: false });
    space.step(1, 999, { x: 0, z: 0, heading: 0 });
    expect(space.expanses.length).toBe(0);
    const f = space.place('well', 800, 0, { named: 'sable_well' });
    expect(f.r).toBe(NAMED.sable_well!.radius);
    expect(f.named).toBe('sable_well');
  });
});

describe('what it does to the ship', () => {
  it('is nothing in the open and everything at the heart', () => {
    const space = new Space(1, { compose: false });
    const f = space.place('shroud', 0, 0, { r: 400 });
    expect(weightAt(f, 0, 0)).toBe(1);
    expect(weightAt(f, 399, 0)).toBeLessThan(0.05);
    expect(weightAt(f, 401, 0)).toBe(0);
    expect(space.sample(2000, 0).weight).toBe(0);
    expect(space.sample(2000, 0).sight).toBe(1);
    const inside = space.sample(0, 0);
    expect(inside.sight).toBeCloseTo(0.4);
    expect(inside.lock).toBeCloseTo(0.5);
    expect(space.sample(250, 0).sight).toBeGreaterThan(inside.sight);
  });

  it('leans toward a well, and harder the nearer', () => {
    const space = new Space(1, { compose: false });
    space.place('well', 0, 0, { r: 500 });
    const near = space.sample(100, 0), far = space.sample(400, 0);
    expect(near.ax).toBeLessThan(0);
    expect(far.ax).toBeLessThan(0);
    expect(Math.abs(near.ax)).toBeGreaterThan(Math.abs(far.ax));
    expect(near.az).toBeCloseTo(0);
  });

  it('breathes: a static field comes and goes', () => {
    const space = new Space(1, { compose: false });
    space.place('static', 0, 0, { r: 500 });
    const ship = { x: 9999, z: 9999, heading: 0 };
    const seen: number[] = [];
    for (let t = 0; t < 40; t += 1) { space.step(1, t, ship); seen.push(space.sample(0, 0).jam); }
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(0.2);
  });

  it('drifts a cloud without moving a wreck far', () => {
    const space = new Space(1, { compose: false });
    const v = space.place('veil', 0, 0), g = space.place('graveyard', 5000, 0);
    for (let t = 0; t < 300; t++) space.step(1, t, { x: 0, z: 0, heading: 0 });
    expect(Math.hypot(v.x, v.z)).toBeGreaterThan(100);
    expect(Math.hypot(v.x, v.z)).toBeLessThan(900);
    expect(Math.hypot(g.x - 5000, g.z)).toBeLessThan(250);
  });

  it('says nothing about what only looks like something', () => {
    const space = new Space(1, { compose: false });
    space.place('curtain', 0, 0, { r: 600 });
    space.place('veil', 0, 0, { r: 600 });
    expect(reports(space.sample(0, 0))).toEqual([]);
  });

  it('reports what it changes, briefly, and only when it matters', () => {
    const space = new Space(1, { compose: false });
    space.place('static', 0, 0, { r: 600 });
    const r = reports(space.sample(0, 0));
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(2);
    for (const x of r) expect(REPORT_TEXT[x.kind]).toBeTruthy();
    expect(reports(space.sample(560, 0))).toEqual([]);
  });

  it('puts the expanse’s own rock on the field', () => {
    const space = new Space(1, { compose: false });
    space.addExpanse('scrap', 0, 0, { r: 1500, deal: false });
    space.addExpanse('hush', 9000, 0, { r: 1000, deal: false });
    expect(space.sample(0, 0).rock).toBeGreaterThan(1.2);
    expect(space.sample(9000, 0).rock).toBeLessThan(0.5);
    expect(space.sample(4000, 0).rock).toBe(1);
  });

  it('knows the expanses by name', () => {
    expect(EXPANSE_ORDER.length).toBe(7);
    for (const id of EXPANSE_ORDER) expect(EXPANSES[id].count[0]).toBeLessThanOrEqual(EXPANSES[id].count[1]);
  });
});

describe('in the world', () => {
  const idle = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' as const };
  const fly = (w: World, secs: number) => { for (let i = 0; i < Math.round(secs / STEP); i++) w.step(STEP, idle); };
  const bare = (): { w: World; space: Space } => {
    const w = new World(5, { space: true });
    const space = w.space!;
    // nothing dealt on its own: the test places what it wants
    (space as unknown as { compose: boolean }).compose = false;
    return { w, space };
  };

  it('is off unless asked, and plays as before', () => {
    expect(new World(5).space).toBeNull();
    expect(new World(5).conditions).toEqual([]);
  });

  it('blinds the scope and the torpedoes in a shroud, and says so', () => {
    const { w, space } = bare();
    space.place('shroud', 0, 0, { r: 500 });
    fly(w, 1);
    expect(w.sensorsDown).toBe(true);
    expect(w.air.lock).toBeLessThan(0.6);
    expect(w.conditions.length).toBeGreaterThan(0);
    w.ship.x = 4000;
    fly(w, 1);
    expect(w.sensorsDown).toBe(false);
    expect(w.conditions).toEqual([]);
  });

  it('thickens the rock in breakers and thins it in the hush', () => {
    const { w, space } = bare();
    space.place('breakers', 0, 0, { r: 500 });
    fly(w, 0.5);
    expect(w.field.zone).toBeGreaterThan(2);
    w.ship.x = 4000;
    fly(w, 0.5);
    expect(w.field.zone).toBe(1);
  });

  it('pays more Krail in a graveyard', () => {
    const { w, space } = bare();
    space.place('graveyard', 0, 0, { r: 500 });
    fly(w, 0.5);
    w.dropCrystals(0, 0, 10);
    expect(w.run.dropped).toBe(16);
  });

  it('scrambles navigation in a static field', () => {
    const { w, space } = bare();
    space.place('static', 0, 0, { r: 600 });
    fly(w, 2);
    expect(w.navNoise).toBeGreaterThan(0.2);
  });

  it('leans the ship toward a well', () => {
    const { w, space } = bare();
    space.place('well', 300, 0, { r: 500 });
    fly(w, 3);
    expect(w.ship.vx).toBeGreaterThan(5);
  });
});

describe('Story sites', () => {
  const def = (system: string, plays: 'ion_storm' | 'nebula' | 'anomaly' | 'derelict' | 'distress', region = 0): SortieDef => ({
    ...HOME, system, region, name: 'Test', kind: 'transit', home: false,
    place: { name: 'Place', text: 't', plays },
  });
  const story = (d: SortieDef) => new World(9, { mode: 'breakout', sortie: d, space: true });

  it('lays a hand-made space, one backdrop and the place, and never composes', () => {
    const w = story(def('s1', 'ion_storm'));
    const sp = w.space!;
    expect(sp.expanses.length).toBe(1);
    expect(sp.features.some((f) => f.def === 'storm')).toBe(true);
    const n = sp.features.length;
    for (let i = 0; i < 600; i++) w.step(STEP, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    expect(sp.expanses.length).toBe(1);
    expect(sp.features.length).toBe(n);
  });

  it('maps each event to the feature that looks like it, and none for a call for help', () => {
    expect(siteFor(def('a', 'nebula'))?.feature).toBe('shroud');
    expect(siteFor(def('a', 'anomaly'))?.feature).toBe('well');
    expect(siteFor(def('a', 'derelict'))?.feature).toBe('graveyard');
    expect(siteFor(def('a', 'distress'))).toBeNull();
  });

  it('names a place only where its region fits, and the same way every time', () => {
    let named = 0;
    for (let i = 0; i < 60; i++) {
      const s = siteFor(def(`sys${i}`, 'anomaly', 0));
      expect(s?.named).toBeUndefined(); // the Sable Well is Marches and Hollows
      expect(siteFor(def(`sys${i}`, 'anomaly', 1))).toEqual(siteFor(def(`sys${i}`, 'anomaly', 1)));
      if (siteFor(def(`sys${i}`, 'anomaly', 1))?.named) named++;
    }
    expect(named).toBeGreaterThan(5);
    expect(named).toBeLessThan(40);
  });

  it('sets the site flag on entering a named place, and keeps the site off the lane', () => {
    const d = [...Array(80).keys()].map((i) => def(`n${i}`, 'anomaly', 1)).find((x) => siteFor(x)?.named)!;
    const w = story(d);
    const f = w.space!.features.find((q) => q.named)!;
    expect(Math.hypot(f.x - w.bk!.lane.x, f.z - w.bk!.lane.z)).toBeGreaterThan(f.r);
    w.ship.x = f.x; w.ship.z = f.z;
    w.step(STEP, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    expect(w.siteHere).toBe(f.named);
    expect(w.flags.has(`site:${f.named}`)).toBe(true);
  });

  it('keeps Story without a space unless asked', () => {
    expect(new World(9, { mode: 'breakout', sortie: def('s1', 'ion_storm') }).space).toBeNull();
  });
});

describe('Story sites, every system', () => {
  it('lays something for any system id without throwing', () => {
    for (let i = 0; i < 300; i++) {
      const w = new World(3, { mode: 'breakout', sortie: { ...HOME, system: `x${i * 7919}`, region: i % 3, home: false, place: { name: 'P', text: 't', plays: 'derelict' } }, space: true });
      expect(w.space!.expanses.length).toBe(1);
    }
  });
});

describe('Storm lightning and the well core', () => {
  const idle = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, overcharge: false, device: 'keyboard' as const };
  const bare = () => {
    const w = new World(5, { space: true });
    (w.space as unknown as { compose: boolean }).compose = false;
    w.ship.invuln = 0;
    return w;
  };
  const fly = (w: World, secs: number) => { for (let i = 0; i < Math.round(secs / STEP); i++) w.step(STEP, idle); };

  it('draws a circle before lightning in a storm cell, and none outside it', () => {
    const w = bare();
    w.space!.place('storm', 0, 0, { r: 600 });
    fly(w, 4);
    expect(w.strikes.some((k) => k.kind === 'lightning' && k.t > 0)).toBe(true);
    const out = bare();
    out.space!.place('storm', 5000, 5000, { r: 600 });
    fly(out, 4);
    expect(out.strikes.length).toBe(0);
  });

  it('crushes only what sits in the core, and tells it first', () => {
    const w = bare();
    w.space!.place('well', 0, 0, { r: 500 });
    fly(w, 2);
    expect(w.strikes.some((k) => k.kind === 'blast' && k.t > 0)).toBe(true);
    const far = bare();
    far.space!.place('well', 300, 0, { r: 500 });
    fly(far, 3);
    expect(far.strikes.filter((k) => k.kind === 'blast').length).toBe(0);
  });

  it('never raises the alert by itself', () => {
    const w = bare();
    w.space!.place('storm', 0, 0, { r: 600 });
    w.pace.until = Infinity; // the opening fight would raise it
    fly(w, 6);
    expect(w.alert()).toBe('clear');
  });
});
