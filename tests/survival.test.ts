import { beforeEach, describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { DEFAULT_SURVIVAL, SURVIVAL, SURVIVAL_IDS, survivalOf, type SurvivalId } from '../src/content/survival';
import type { InputFrame } from '../src/input/types';
import { loadProfile, migrate as migrateProfile, saveProfile } from '../src/meta/profile';
import { exportJourney, importJourney, loadJourney, migrate, saveJourney } from '../src/meta/save';
import { lanesFrom, layQuiet, makeChart, netted, spreadNet } from '../src/sim/chart';
import { NO_MODS, pressure } from '../src/sim/director';
import { ENCOUNTER_ORDER, pickEncounter, startEncounter, type EncounterId } from '../src/sim/encounters';
import { spawnAlien } from '../src/sim/enemies';
import { ADRIFT, DAY, endSortie, newJourney, plot, sortieDef, START_PARTS, VERSION, WEAR, WRECKS, type Journey } from '../src/sim/journey';
import { HOME, JUMP_COST, FOOD_START, START_CYRITE, pursuitCap, pursuitInterval } from '../src/sim/breakout';
import { newRun } from '../src/sim/run';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';

// ── survival modes ────────────────────────────────────────────────────────
// Drifter, Prospector and Raider (content/survival.ts): the table, how a mode
// reaches a run and a journey, how it is saved, and that each one plays the way
// its row says: the sky, the rock, the wrecks, the sector events, the voyage.

const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
});
beforeEach(() => mem.clear());

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, brk: false, device: 'keyboard' };
const priv = (w: World) => w as unknown as {
  nextEvent: number; encounter: unknown; killAlien(a: unknown, s: string): void; cutClean(r: unknown): void; destroyRock(r: unknown, s: string): void; richShare: number;
};
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** An arcade world with no rock, capital ships or sector events, and a hull that cannot be sunk. */
function sky(mode: SurvivalId, seed = 5): World {
  const w = new World(seed, { survival: mode });
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  w.command.next = 1e9;
  priv(w).nextEvent = 1e9;
  return w;
}
/** Hostile hulls that arrived over `seconds` with nobody flying: distinct ids seen, and the longest stretch with no hostile hull in the sky (the ship keeps itself alive but does not fight, so a hull may linger). */
function traffic(w: World, seconds: number): { arrived: number; gap: number } {
  const seen = new Set<number>();
  let quiet = 0, gap = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.plates = 99;
    // the arcade bay opens by itself once the Krail is aboard (a hull that rams the ship drops some): shut it, nobody is refitting here
    if (w.phase === 'bay') w.closeBay();
    w.step(STEP, idle);
    let any = false;
    for (const a of w.aliens) if (!a.extra) { any = true; seen.add(a.id); }
    quiet = any ? 0 : quiet + STEP;
    gap = Math.max(gap, quiet);
  }
  return { arrived: seen.size, gap };
}

describe('the table', () => {
  it('has the three modes, Prospector the default', () => {
    expect(SURVIVAL_IDS).toEqual(['drifter', 'prospector', 'raider']);
    expect(DEFAULT_SURVIVAL).toBe('prospector');
    for (const id of SURVIVAL_IDS) expect(SURVIVAL[id].id).toBe(id);
  });

  it('reads an unknown id as the baseline', () => {
    for (const bad of [undefined, null, 7, 'easy', 'constructor', '__proto__', {}]) expect(survivalOf(bad).id).toBe('prospector');
    expect(survivalOf('raider').id).toBe('raider');
  });

  it('keeps Prospector at the old numbers: every multiplier 1, bar the arcade sky', () => {
    const P = SURVIVAL.prospector;
    // the arcade sky is the one thing set above 1 (Jimi: "harder", with the bay at 30 Krail); everything the Story reads is the old number
    expect(P.sky).toEqual({ traffic: 2, toughness: 2, fire: 1.35, elites: 1.9, hazard: 1.5, income: 0.75 });
    expect(P.score).toBe(1);
    expect(P.pursuit).toEqual({ gap: 1, cap: 1, elite: 1 });
    expect(P.heat).toEqual({ rate: 1, kill: 1, cut: 1 });
    expect(P.rock).toEqual({ krail: 1, ore: 1, cyrite: 1, veins: 1 });
    expect(P.salvage).toMatchObject({ krail: 1, life: 1, repair: 1, capital: 1, reach: 1 });
    for (const c of Object.values(P.salvage.cargo)) expect(c).toEqual({ parts: 0.5, cyrite: 0, ore: 0 });
    expect(P.ship).toEqual({ plates: 0, recharge: 1, grace: 1 });
    expect(P.voyage).toMatchObject({ jump: 1, start: { cyrite: START_CYRITE, food: FOOD_START, parts: START_PARTS }, wear: WEAR, wrecks: WRECKS, kept: 0.5, ore: 1, net: 1, breathers: 1 });
    // a sector event it never draws: the skirmish is the Raider's
    expect(P.events.gap).toBe(1);
    for (const [id, w] of Object.entries(P.events.weights)) expect(w).toBe(id === 'skirmish' ? 0 : 1);
  });

  it('gives every mode the three lines the title shows, and an ordered scale', () => {
    for (const m of Object.values(SURVIVAL)) {
      expect(m.name && m.tag && m.text).toBeTruthy();
      for (const v of Object.values(m.scale)) expect([1, 2, 3]).toContain(v);
    }
    // the title's strip tells the modes apart: calmer, baseline, hotter sky; richer to thinner mining
    expect(SURVIVAL.drifter.scale.sky).toBeLessThan(SURVIVAL.prospector.scale.sky);
    expect(SURVIVAL.prospector.scale.sky).toBeLessThan(SURVIVAL.raider.scale.sky);
    expect(SURVIVAL.raider.scale.mining).toBeLessThan(SURVIVAL.prospector.scale.mining);
    expect(SURVIVAL.raider.scale.wrecks).toBeGreaterThan(SURVIVAL.prospector.scale.wrecks);
  });

  it('names a weight for every sector event', () => {
    for (const m of Object.values(SURVIVAL)) expect(Object.keys(m.events.weights).sort()).toEqual([...ENCOUNTER_ORDER].sort());
  });
});

describe('choosing a mode', () => {
  it('reaches the world, each of the three', () => {
    for (const id of SURVIVAL_IDS) {
      const w = new World(1, { survival: id });
      expect(w.survival.id).toBe(id);
      expect(w.run.survival).toBe(id);
    }
    expect(new World(1).survival.id).toBe('prospector');
  });

  it('restarts in the mode it is given, and keeps its own otherwise', () => {
    const w = new World(1, { survival: 'raider' });
    w.restart({});
    expect(w.survival.id).toBe('raider');
    w.restart({ survival: 'drifter' });
    expect(w.survival.id).toBe('drifter');
    expect(w.run.survival).toBe('drifter');
    // the hull, the sky and the score all follow
    expect(w.stats.maxPlates).toBe(new World(1).stats.maxPlates + SURVIVAL.drifter.ship.plates);
  });

  it('does not change in the middle of a run', () => {
    const w = sky('raider');
    for (let i = 0; i < 600; i++) w.step(STEP, idle);
    expect(w.survival.id).toBe('raider');
    expect(w.run.survival).toBe('raider');
  });

  it('is the journey\'s mode in a sortie, from the sortie\'s definition', () => {
    for (const id of SURVIVAL_IDS) {
      const j = newJourney(7, false, 'three', id);
      expect(j.survival).toBe(id);
      const w = new World(3, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
      expect(w.survival.id).toBe(id);
      // a world restarted into the next system keeps it
      w.restart({ mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
      expect(w.survival.id).toBe(id);
    }
  });

  it('is the baseline for a journey begun without one', () => {
    expect(newJourney(7).survival).toBe('prospector');
  });

  it('changes nothing else: the same seed lays the same systems in every mode', () => {
    const names = SURVIVAL_IDS.map((id) => newJourney(11, false, 'three', id).chart.systems.map((s) => `${s.name}:${s.kind}:${s.holder}`));
    expect(names[1]).toEqual(names[0]);
    expect(names[1]).toEqual(names[2]);
  });
});

describe('saving the mode', () => {
  it('keeps the profile\'s pick between sessions', () => {
    expect(loadProfile().survival).toBe('prospector');
    const p = loadProfile();
    p.survival = 'raider';
    saveProfile(p);
    expect(loadProfile().survival).toBe('raider');
  });

  it('turns the old difficulties into modes', () => {
    expect(migrateProfile({ modifiers: ['easy'] })).toMatchObject({ survival: 'drifter' });
    expect(migrateProfile({ modifiers: ['hard'] })).toMatchObject({ survival: 'raider' });
    expect(migrateProfile({ modifiers: ['ironman', 'hostile'] })).toMatchObject({ survival: 'raider' });
    expect(migrateProfile({ modifiers: [] })).toMatchObject({ survival: 'prospector' });
    expect(migrateProfile({ modifiers: ['glass'] })).toMatchObject({ survival: 'prospector' });
    expect(migrateProfile({ modifiers: ['easy'] })).not.toHaveProperty('modifiers');
    // a pick already made stays, and a made-up one is the baseline
    expect(migrateProfile({ survival: 'drifter', modifiers: ['hard'] })).toMatchObject({ survival: 'drifter' });
    expect(migrateProfile({ survival: 'nonsense' })).toMatchObject({ survival: 'prospector' });
  });

  it('writes the version and the mode into a journey, and reads them back', () => {
    for (const id of SURVIVAL_IDS) {
      const j = newJourney(4, false, 'three', id);
      saveJourney(j);
      const back = loadJourney()!;
      expect(back.version).toBe(VERSION);
      expect(back.survival).toBe(id);
      expect(back).toEqual(j);
    }
  });

  it('brings a journey from before the modes in as Prospector', () => {
    const j = JSON.parse(JSON.stringify(newJourney(4))) as Record<string, unknown>;
    j.version = 7;
    delete j.survival;
    expect(migrate(j)).toMatchObject({ version: VERSION, survival: 'prospector' });
    j.version = 7;
    j.survival = 'bogus';
    expect(migrate(j)!.survival).toBe('prospector');
  });

  it('exports and imports the mode with the journey', () => {
    const j = newJourney(9, false, 'three', 'raider');
    const back = importJourney(exportJourney(j))!;
    expect(back.survival).toBe('raider');
    expect(loadJourney()!.survival).toBe('raider');
  });

  it('keeps a saved journey\'s mode whatever the profile says later', () => {
    const j = newJourney(5, false, 'three', 'drifter');
    saveJourney(j);
    const p = loadProfile();
    p.survival = 'raider';
    saveProfile(p);
    const back = loadJourney()!;
    expect(back.survival).toBe('drifter');
    // a sortie flown from it is a Drifter's, and its Cyrite is not the Raider's
    plot(back, lanesFrom(back.chart, back.at)[0]!.to.id);
    expect(new World(1, { mode: 'breakout', sortie: sortieDef(back), carry: back.carry }).survival.id).toBe('drifter');
  });

  it('does not corrupt the rest of the journey by choosing a mode', () => {
    const a = newJourney(8, false, 'three', 'prospector'), b = newJourney(8);
    expect(b).toEqual(a);
    const c = JSON.parse(JSON.stringify(newJourney(8, false, 'three', 'raider'))) as Journey;
    for (const k of ['seed', 'day', 'at', 'trail', 'status', 'wrecks'] as const) expect(c[k]).toEqual(a[k]);
    expect(c.chart.systems).toEqual(a.chart.systems);
  });
});

describe('the sky', () => {
  it('brings fewer, softer hulls in Drifter and more, tougher ones in Raider', () => {
    for (const m of [2, 5, 9]) {
      const [d, p, r] = SURVIVAL_IDS.map((id) => pressure(m * 60, SURVIVAL[id].sky));
      expect(p).toEqual(pressure(m * 60, SURVIVAL.prospector.sky));
      expect(d!.enemyCap).toBeLessThanOrEqual(p!.enemyCap);
      expect(p!.enemyCap).toBeLessThanOrEqual(r!.enemyCap);
      expect(d!.groupSize).toBeLessThan(p!.groupSize);
      expect(r!.groupSize).toBeGreaterThan(p!.groupSize);
      expect(d!.lull).toBeGreaterThan(p!.lull);
      expect(r!.lull).toBeLessThan(p!.lull);
      expect(d!.enemyHp).toBeLessThan(p!.enemyHp);
      expect(r!.enemyHp).toBeGreaterThan(p!.enemyHp);
      expect(d!.fireCd).toBeGreaterThan(p!.fireCd);
      expect(r!.fireCd).toBeLessThan(p!.fireCd);
    }
    const late = SURVIVAL_IDS.map((id) => pressure(9 * 60, SURVIVAL[id].sky));
    expect(late[0]!.eliteChance).toBeLessThan(late[1]!.eliteChance);
    expect(late[2]!.eliteChance).toBeGreaterThan(late[1]!.eliteChance);
    expect(late[0]!.volatile).toBeLessThan(late[1]!.volatile);
    expect(late[2]!.volatile).toBeGreaterThan(late[1]!.volatile);
  });

  it('sends more hulls in the arcade as the modes go from Drifter to Raider', { timeout: 30_000 }, () => {
    const got = SURVIVAL_IDS.map((id) => [1, 2, 3, 4].map((seed) => traffic(sky(id, seed), 420).arrived));
    const [d, p, r] = got.map(mean);
    expect(d!).toBeLessThan(p!);
    expect(p!).toBeLessThan(r!);
    // not empty, not a flood
    expect(d!).toBeGreaterThan(5);
    expect(r!).toBeLessThan(p! * 2);
  });

  it('never goes quiet for too long, or sends hulls without a break', { timeout: 30_000 }, () => {
    for (const id of SURVIVAL_IDS) for (const seed of [1, 2, 3]) {
      const { gap } = traffic(sky(id, seed), 420);
      // the longest stretch with nothing new on the way: the opening quiet is ALIEN_FIRST (about 20 s) and the quiet spells run to 30 s
      expect(gap, `${id} seed ${seed}`).toBeLessThan(id === 'drifter' ? 75 : 55);
    }
  });

  it('plays the Story\'s pursuit slower in Drifter and faster in Raider', { timeout: 30_000 }, () => {
    const spawned = (id: SurvivalId) => {
      const j = newJourney(7, false, 'three', id);
      j.carry.cyrite = 0;
      const def = { ...sortieDef(j), home: false, blockade: false, calloway: Infinity, notice: { ...sortieDef(j).notice, captain: null, elite: 0, pursuit: 1 }, story: null };
      const w = new World(2, { mode: 'breakout', sortie: def, carry: j.carry });
      w.field.rocks = []; w.field.bulwarks = []; w.field.step = () => {};
      w.cardNext = Infinity; w.portCalled = true; w.command.next = 1e9;
      priv(w).nextEvent = 1e9;
      const seen = new Set<number>();
      for (let i = 0; i < Math.round(300 / STEP); i++) {
        w.plates = 99;
        w.bk!.heat = 0.5;
        w.step(STEP, idle);
        for (const a of w.aliens) seen.add(a.id);
      }
      return seen.size;
    };
    const [d, p, r] = SURVIVAL_IDS.map((id) => spawned(id));
    expect(d!).toBeLessThan(p!);
    expect(r!).toBeGreaterThan(p!);
    // and the table agrees with itself: the same heat, a different gap and ceiling
    const gap = (id: SurvivalId) => pursuitInterval(0.5) * SURVIVAL[id].pursuit.gap;
    const cap = (id: SurvivalId) => Math.max(1, Math.round(pursuitCap(1) * SURVIVAL[id].pursuit.cap));
    expect(gap('drifter')).toBeGreaterThan(gap('prospector'));
    expect(gap('raider')).toBeLessThan(gap('prospector'));
    expect(cap('drifter')).toBeLessThan(cap('prospector'));
    expect(cap('raider')).toBeGreaterThan(cap('prospector'));
  });

  it('heats the Story at the rate the mode says, and the cutter\'s noise, and what a kill adds', () => {
    const j = (id: SurvivalId) => {
      const jj = newJourney(7, false, 'three', id);
      const w = new World(2, { mode: 'breakout', sortie: { ...sortieDef(jj), home: false, calloway: Infinity, story: null }, carry: jj.carry });
      w.bk!.heat = 0.2;
      w.bk!.nextPursuit = Infinity;
      w.cardNext = Infinity; w.portCalled = true; w.command.next = 1e9; priv(w).nextEvent = 1e9;
      w.field.rocks = []; w.field.bulwarks = []; w.field.step = () => {};
      return w;
    };
    const climb = (id: SurvivalId) => { const w = j(id); for (let i = 0; i < 600; i++) { w.plates = 99; w.step(STEP, idle); } return w.bk!.heat - 0.2; };
    expect(climb('drifter')).toBeLessThan(climb('prospector'));
    expect(climb('raider')).toBeGreaterThan(climb('prospector'));
    // a kill: the Raider's heat grows less for it, so a life of fights does not run away with the hunt
    const killed = (id: SurvivalId) => { const w = j(id); const h0 = w.bk!.heat; const a = spawnAlien('lancer', w.ship, 0, w.rng, { x: 50, y: 0, z: 0 }); w.aliens.push(a); priv(w).killAlien(a, 'laser'); return w.bk!.heat - h0; };
    expect(killed('raider')).toBeLessThan(killed('prospector'));
    expect(killed('raider')).toBeGreaterThan(0);
  });
});

describe('the hull', () => {
  it('has a plate more and a quicker shield in Drifter, the stock hull otherwise', () => {
    const d = new World(1, { survival: 'drifter' }), p = new World(1, { survival: 'prospector' }), r = new World(1, { survival: 'raider' });
    expect(d.stats.maxPlates).toBe(p.stats.maxPlates + 1);
    expect(d.plates).toBe(d.stats.maxPlates);
    expect(d.stats.shieldRecharge).toBeLessThan(p.stats.shieldRecharge);
    expect(d.stats.grace).toBeGreaterThan(p.stats.grace);
    expect(r.stats.maxPlates).toBe(p.stats.maxPlates);
    expect(r.stats.tractor).toBeGreaterThan(p.stats.tractor);
  });
});

describe('rock', () => {
  /** What cutting every kind and size of rock clean (or breaking it) drops, summed over `n` goes. */
  function mined(id: SurvivalId, how: 'cut' | 'break', n = 30) {
    const w = new World(4, { mode: 'breakout', survival: id });
    w.field.rocks = []; w.field.bulwarks = []; w.field.step = () => {};
    for (let k = 0; k < n; k++) for (const kind of ['basalt', 'iron', 'rich'] as const) for (const size of [0, 1, 2] as const) {
      const r = w.field.spawn(size, 500, 500, 0, 0, kind);
      if (how === 'cut') priv(w).cutClean(r); else priv(w).destroyRock(r, 'laser');
    }
    return w.run.loot.rock;
  }

  it('gives a Drifter more, and a Raider a good deal less, of Krail, ore and Cyrite', () => {
    for (const how of ['cut', 'break'] as const) {
      const [d, p, r] = SURVIVAL_IDS.map((id) => mined(id, how));
      for (const k of ['krail', 'ore', 'cyrite'] as const) {
        expect(d![k], `${how} ${k}`).toBeGreaterThan(p![k]);
        expect(r![k], `${how} ${k}`).toBeLessThan(p![k]);
      }
      // the Raider keeps a third to a half: mining stays possible, and stops being the way
      expect(r!.cyrite / p!.cyrite).toBeGreaterThan(0.3);
      expect(r!.cyrite / p!.cyrite).toBeLessThan(0.6);
      expect(r!.krail / p!.krail).toBeLessThan(0.5);
    }
  });

  it('keeps the Prospector\'s rock exactly as it was', () => {
    // 12 Cyrite from a large veined rock, 6 and 3 ore from a large basalt: the table's own numbers, no rounding in the way
    const w = new World(4, { mode: 'breakout' });
    w.field.rocks = []; w.field.bulwarks = []; w.field.step = () => {};
    priv(w).cutClean(w.field.spawn(0, 500, 500, 0, 0, 'rich'));
    expect(w.run.loot.rock.cyrite).toBe(12);
    priv(w).cutClean(w.field.spawn(0, 500, 500, 0, 0, 'basalt'));
    expect(w.run.loot.rock.ore).toBe(3 + 6);
  });

  it('lays fewer veined rocks for a Raider and more for a Drifter', () => {
    // the share of veined rock a system lays: its own, times the mode's (the field's dice are too few rocks to read it from)
    const veins = (id: SurvivalId) => sum([1, 2, 3, 4, 5, 6].map((seed) => {
      const j = newJourney(seed, false, 'three', id);
      const def = { ...sortieDef(j), home: false, rich: 0.1 };
      return priv(new World(seed, { mode: 'breakout', sortie: def, carry: j.carry })).richShare;
    }));
    const [d, p, r] = SURVIVAL_IDS.map(veins);
    expect(d!).toBeGreaterThanOrEqual(p!);
    expect(r!).toBeLessThan(p!);
  });
});

describe('wrecks', () => {
  /** What a wreck of each kind of hull leaves, summed over `n` of each. */
  function wrecked(id: SurvivalId, mode: 'breakout' | 'arcade', n = 40) {
    const w = new World(6, { mode, survival: id });
    const by: Record<string, { krail: number; cyrite: number; ore: number; parts: number }> = {};
    for (const kind of ['scout', 'raptor', 'lancer', 'freighter'] as const) {
      const before = JSON.parse(JSON.stringify(w.run.loot.wreck)) as typeof w.run.loot.wreck;
      for (let i = 0; i < n; i++) {
        const a = spawnAlien(kind, w.ship, 0, w.rng, { x: 90, y: 0, z: 90 });
        w.aliens.push(a);
        priv(w).killAlien(a, 'laser');
      }
      const now = w.run.loot.wreck;
      by[kind] = { krail: (now.krail - before.krail) / n, cyrite: (now.cyrite - before.cyrite) / n, ore: (now.ore - before.ore) / n, parts: (now.parts - before.parts) / n };
    }
    return { by, w };
  }

  it('leaves the Prospector\'s wrecks as they were: parts and Krail, no Cyrite, no cargo', () => {
    const { by } = wrecked('prospector', 'breakout');
    for (const k of Object.keys(by)) { expect(by[k]!.cyrite).toBe(0); expect(by[k]!.ore).toBe(0); }
    // a lancer is worth 7: 4 parts (7 × 0.5, rounded), and 4 Krail (7 × 0.6, rounded)
    expect(by.lancer!.parts).toBe(4);
    expect(by.lancer!.krail).toBe(4);
  });

  it('makes the Raider\'s wrecks a source of everything: Cyrite, ore, parts and Krail, by what the hull carried', () => {
    const { by } = wrecked('raider', 'breakout');
    const P = wrecked('prospector', 'breakout').by;
    // a hauler is a hold: ore and Cyrite; a cruiser has cells; a fighter has little
    expect(by.freighter!.ore).toBeGreaterThan(20);
    expect(by.freighter!.cyrite).toBeGreaterThan(by.lancer!.cyrite);
    expect(by.lancer!.cyrite).toBeGreaterThan(by.scout!.cyrite);
    expect(by.scout!.cyrite).toBeGreaterThan(0);
    expect(by.lancer!.ore).toBeGreaterThan(by.scout!.ore);
    for (const k of Object.keys(by)) {
      expect(by[k]!.krail, k).toBeGreaterThan(P[k]!.krail);
      expect(by[k]!.parts, k).toBeGreaterThanOrEqual(P[k]!.parts);
    }
  });

  it('is not simply the Prospector\'s loot multiplied: the Raider\'s wrecks carry things the Prospector\'s do not', () => {
    const { by } = wrecked('raider', 'breakout'), P = wrecked('prospector', 'breakout').by;
    const ratios = ['krail', 'parts'].map((k) => by.lancer![k as 'krail']! / P.lancer![k as 'krail']!);
    // Krail and parts rise by different amounts, and Cyrite and ore appear from nothing
    expect(Math.abs(ratios[0]! - ratios[1]!)).toBeGreaterThan(0.1);
    expect(P.lancer!.cyrite).toBe(0);
    expect(by.lancer!.cyrite).toBeGreaterThan(3);
  });

  it('never gives more than the hull was worth', () => {
    for (const id of SURVIVAL_IDS) {
      const { by } = wrecked(id, 'breakout');
      for (const [kind, loot] of Object.entries(by)) {
        const xp = spawnAlien(kind as 'scout', new World(1).ship, 0, new Rng(1)).xp;
        expect(loot.cyrite, `${id} ${kind} Cyrite`).toBeLessThanOrEqual(xp);
        expect(loot.krail, `${id} ${kind} Krail`).toBeLessThanOrEqual(xp * 2.1);
        expect(loot.parts, `${id} ${kind} parts`).toBeLessThanOrEqual(xp);
      }
    }
  });

  it('pays the arcade in Krail only, more from a Raider\'s kills', () => {
    const [d, p, r] = SURVIVAL_IDS.map((id) => wrecked(id, 'arcade').by.lancer!);
    for (const x of [d!, p!, r!]) { expect(x.cyrite).toBe(0); expect(x.ore).toBe(0); expect(x.parts).toBe(0); }
    // a lancer is worth 7; the arcade's income factor (and only the arcade's: the Story's 4 Krail above is untouched) takes a quarter off
    expect(p!.krail).toBeCloseTo(7 * SURVIVAL.prospector.sky.income, 0);
    expect(r!.krail).toBeGreaterThan(p!.krail);
  });

  it('lets a Raider\'s salvage lie longer before it fades', () => {
    const life = (id: SurvivalId) => {
      const w = new World(6, { mode: 'breakout', survival: id });
      const a = spawnAlien('lancer', w.ship, 0, w.rng, { x: 90, y: 0, z: 90 });
      w.aliens.push(a);
      priv(w).killAlien(a, 'laser');
      return mean(w.pickups.map((pk) => pk.life));
    };
    expect(life('raider')).toBeGreaterThan(life('prospector') * 2);
    expect(life('drifter')).toBeGreaterThan(life('prospector'));
  });

  it('pays the capital ships\' salvage by the mode', () => {
    const [d, p, r] = SURVIVAL_IDS.map((id) => SURVIVAL[id].salvage.capital);
    expect(d!).toBe(p!);
    expect(r!).toBeGreaterThan(p!);
  });
});

describe('the economy', () => {
  /** A Raider gets its Cyrite from the dead, not the rock: the same effort (a veined rock cut, a cruiser killed) pays the other way round. */
  it('makes a wreck worth more Cyrite than a veined rock to a Raider, and the other way round for a Prospector', () => {
    const veined = (id: SurvivalId) => {
      const w = new World(4, { mode: 'breakout', survival: id });
      w.field.rocks = []; w.field.bulwarks = []; w.field.step = () => {};
      let got = 0;
      for (let i = 0; i < 60; i++) { const before = w.run.loot.rock.cyrite; priv(w).cutClean(w.field.spawn(0, 500, 500, 0, 0, 'rich')); got += w.run.loot.rock.cyrite - before; }
      return got / 60;
    };
    const cruiser = (id: SurvivalId) => {
      const w = new World(4, { mode: 'breakout', survival: id });
      let got = 0;
      for (let i = 0; i < 60; i++) { const a = spawnAlien('lancer', w.ship, 0, w.rng, { x: 90, y: 0, z: 90 }); w.aliens.push(a); const before = w.run.loot.wreck.cyrite; priv(w).killAlien(a, 'laser'); got += w.run.loot.wreck.cyrite - before; }
      return got / 60;
    };
    expect(veined('prospector')).toBeGreaterThan(cruiser('prospector'));
    expect(veined('raider')).toBeLessThan(veined('prospector') * 0.6);
    expect(cruiser('raider')).toBeGreaterThan(veined('raider') * 0.8);
    // a Raider's best day mining a big seam still falls short of a Prospector's ordinary one
    expect(veined('raider')).toBeLessThan(veined('prospector'));
  });

  it('cannot be run on infinite resources: loot is bounded by what arrives, and arrives at the sky\'s rate', () => {
    // a Raider who kills everything that comes for five minutes at the hottest pursuit: the hulls are few, and each gives at most what it was worth
    const j = newJourney(7, false, 'three', 'raider');
    const hulls = 300 / (pursuitInterval(1) * SURVIVAL.raider.pursuit.gap) * Math.max(1, Math.round(pursuitCap(1) * SURVIVAL.raider.pursuit.cap));
    expect(hulls).toBeLessThan(200);
    // and a tank starts well short of a lane's cost, whatever is collected after
    expect(j.carry.cyrite).toBeLessThan(40);
  });

  it('sells the Raider\'s ore for more, and nobody else\'s', () => {
    const price = (id: SurvivalId) => new World(1, { mode: 'breakout', survival: id }).prices.ore;
    expect(price('raider')).toBeGreaterThan(price('prospector'));
    expect(price('prospector')).toBe(HOME.port!.prices.ore);
    expect(price('drifter')).toBe(price('prospector'));
    // the rest of the board is the same
    const a = new World(1, { mode: 'breakout', survival: 'raider' }).prices, b = new World(1, { mode: 'breakout' }).prices;
    expect({ ...a, ore: 0 }).toEqual({ ...b, ore: 0 });
  });

  it('keeps Drifter generous but not free: its Cyrite is richer, its jumps cheaper, and neither is without limit', () => {
    const d = newJourney(7, false, 'three', 'drifter'), p = newJourney(7);
    expect(d.carry.cyrite).toBeGreaterThan(p.carry.cyrite);
    expect(d.carry.food).toBeGreaterThan(p.carry.food);
    // cheaper lanes, but a lane always costs something, and a jump to the next system is still more than the opening tank gave Prospector
    for (const [i, r] of d.chart.routes.entries()) {
      expect(r.cyrite).toBeLessThan(p.chart.routes[i]!.cyrite);
      expect(r.cyrite).toBeGreaterThanOrEqual(8);
    }
    expect(d.carry.cyrite).toBeLessThan(Math.min(...d.chart.routes.map((r) => r.cyrite)) * 2);
  });
});

describe('sector events', () => {
  it('draws the skirmish for a Raider only', () => {
    const draws = (id: SurvivalId) => {
      const rng = new Rng(11), count: Partial<Record<EncounterId, number>> = {};
      let last: EncounterId | null = null as EncounterId | null;
      for (let i = 0; i < 4000; i++) { const e: EncounterId = pickEncounter(900, last, new Set(['derelict', 'anomaly']), rng, SURVIVAL[id].events.weights)!; count[e] = (count[e] ?? 0) + 1; last = e; }
      return count;
    };
    expect(draws('drifter').skirmish ?? 0).toBe(0);
    expect(draws('prospector').skirmish ?? 0).toBe(0);
    expect(draws('raider').skirmish ?? 0).toBeGreaterThan(300);
  });

  it('leans the mix: Drifter finds seams and distress calls, Raider convoys and hulks', () => {
    const rng = (id: SurvivalId) => {
      const r = new Rng(3), count: Partial<Record<EncounterId, number>> = {};
      let last: EncounterId | null = null;
      for (let i = 0; i < 6000; i++) { const e: EncounterId = pickEncounter(900, last, new Set(['derelict', 'anomaly']), r, SURVIVAL[id].events.weights)!; count[e] = (count[e] ?? 0) + 1; last = e; }
      return count;
    };
    const [d, p, r] = SURVIVAL_IDS.map(rng);
    expect(d!.rich_field!).toBeGreaterThan(p!.rich_field!);
    expect(r!.rich_field!).toBeLessThan(p!.rich_field!);
    expect(r!.convoy!).toBeGreaterThan(p!.convoy!);
    expect(r!.derelict!).toBeGreaterThan(p!.derelict!);
  });

  it('keeps the Prospector\'s draw exactly what it was', () => {
    const a = new Rng(5), b = new Rng(5);
    let last: EncounterId | null = null;
    for (let i = 0; i < 200; i++) {
      const x = pickEncounter(500, last, new Set(), a, SURVIVAL.prospector.events.weights), y = pickEncounter(500, last, new Set(), b, { skirmish: 0 }); // the old draw: every event but the new one
      expect(x).toBe(y);
      last = x;
    }
  });

  it('comes more often to a Raider, less often to a Drifter', () => {
    expect(SURVIVAL.drifter.events.gap).toBeGreaterThan(1);
    expect(SURVIVAL.raider.events.gap).toBeLessThan(1);
  });
});

describe('the skirmish', () => {
  /** An arcade Raider world with the sky empty, and a skirmish begun ahead. */
  function fight(seed = 5, id: SurvivalId = 'raider') {
    const w = sky(id, seed);
    w.pace.until = 1e9;
    priv(w).encounter = startEncounter('skirmish', w);
    priv(w).nextEvent = 1e9;
    return w;
  }
  const modes = (w: World) => w.aliens.map((a) => a.mode);

  it('sets two crews at each other, ignoring the ship', () => {
    const w = fight();
    expect(w.aliens.length).toBe(6);
    expect(modes(w).every((m) => m === 'brawl')).toBe(true);
    expect(w.aliens.every((a) => a.extra && a.hp > 0)).toBe(true);
    const plates = w.plates;
    for (let i = 0; i < Math.round(20 / STEP); i++) w.step(STEP, idle);
    // nobody fired at the ship
    expect(w.plates).toBe(plates);
    expect(w.shots.length).toBe(0);
  });

  it('grinds one side down and leaves its wrecks to be stripped, the other side battered', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const w = fight(seed);
      const before = w.run.loot.wreck.krail;
      // until it is decided: after that the winners go to look the ship over, and the ship may shoot them
      for (let i = 0; i < Math.round(60 / STEP) && !(priv(w).encounter as { fight?: { over: boolean } }).fight?.over; i++) { w.plates = 99; w.step(STEP, idle); }
      const left = w.aliens.filter((a) => a.hp > 0);
      expect(left.length, `seed ${seed}`).toBeLessThan(6);
      expect(left.length).toBeGreaterThan(0);
      expect(w.run.loot.wreck.krail, `seed ${seed}`).toBeGreaterThan(before);
      // the winners are hurt: none of them whole
      for (const a of left.filter((x) => x.kind !== 'freighter')) expect(a.hp, `seed ${seed}`).toBeLessThan(a.maxHp);
      // nobody's kill: no score, no kills
      expect(w.kills).toBe(0);
      expect(w.run.kills).toBe(0);
    }
  });

  it('takes time: a fight a player can wait out, not one that is over in a moment', () => {
    const w = fight(2);
    let over = 0;
    for (let i = 0; i < Math.round(60 / STEP) && !over; i++) {
      w.plates = 99;
      w.step(STEP, idle);
      const f = (priv(w).encounter as { fight?: { over: boolean } } | null)?.fight;
      if (f?.over) over = w.runTime;
    }
    expect(over).toBeGreaterThan(12);
    expect(over).toBeLessThan(50);
  });

  it('sends the winners to look the ship over once it is decided', () => {
    const w = fight(3);
    for (let i = 0; i < Math.round(55 / STEP); i++) { w.plates = 99; w.step(STEP, idle); }
    const alive = w.aliens.filter((a) => a.kind !== 'freighter');
    expect(alive.length).toBeGreaterThan(0);
    for (const a of alive) expect(a.mode).not.toBe('brawl');
  });

  it('turns both crews on the ship if it comes close or shoots', () => {
    const w = fight(4);
    w.ship.x = w.aliens[0]!.x + 6; w.ship.z = w.aliens[0]!.z; // right on top of one of them
    for (let i = 0; i < 90; i++) { w.plates = 99; w.step(STEP, idle); }
    const fighters = w.aliens.filter((a) => a.kind !== 'freighter' && !a.fleeing);
    expect(fighters.length).toBeGreaterThan(0);
    for (const a of fighters) expect(['approach', 'setup', 'run', 'line', 'extend', 'hold', 'cover', 'peek', 'seek'], a.mode).toContain(a.mode);
    // the hauler runs
    for (const a of w.aliens.filter((x) => x.kind === 'freighter')) expect(a.mode).toBe('leave');
  });

  it('does not count in the arcade\'s waves, so it does not hold the next encounter off', () => {
    const w = fight();
    expect(w.aliens.every((a) => a.extra)).toBe(true);
  });

  it('ends: after the fight the event closes, win or lose', () => {
    const w = fight(6);
    // it closes by itself; the next event is a gap away, so look as soon as it has gone
    for (let i = 0; i < Math.round(120 / STEP) && priv(w).encounter; i++) { w.plates = 99; w.step(STEP, idle); }
    expect(priv(w).encounter).toBeNull();
    expect(w.runTime).toBeLessThan(110);
    expect(w.run.events).toBe(1);
  });
});

describe('the voyage', () => {
  const result = (j: Journey, o: Partial<Parameters<typeof endSortie>[1]> = {}) => {
    const run = newRun(1, j.survival);
    run.escaped = o.ended !== 'destroyed';
    return { ended: 'jumped' as const, time: 120, carry: { ...j.carry }, run, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o };
  };

  it('starts every mode with its own tank, galley and spares', () => {
    for (const id of SURVIVAL_IDS) {
      const j = newJourney(7, false, 'three', id), K = SURVIVAL[id].voyage.start;
      expect(j.carry).toMatchObject({ cyrite: K.cyrite, food: K.food, parts: K.parts });
    }
    expect(newJourney(7).carry).toMatchObject({ cyrite: START_CYRITE, food: FOOD_START, parts: START_PARTS });
  });

  it('prices the lanes by the mode, once, and the opening lane too', () => {
    const base = newJourney(7).chart, d = newJourney(7, false, 'three', 'drifter');
    expect(d.chart.fuel).toBe(SURVIVAL.drifter.voyage.jump);
    expect(newJourney(7).chart.fuel).toBeUndefined();
    expect(newJourney(7, false, 'three', 'raider').chart.routes).toEqual(base.routes);
    expect(sortieDef(d).jumpCost).toBe(Math.round(JUMP_COST * SURVIVAL.drifter.voyage.jump));
    expect(sortieDef(newJourney(7)).jumpCost).toBe(JUMP_COST);
  });

  it('lets a Drifter survive a wreck more than the others, and keep more of what it carried', () => {
    const wreck = (id: SurvivalId) => {
      const j = newJourney(3, false, 'three', id);
      j.carry.cyrite = 20; j.carry.parts = 8; j.carry.chits = 40; j.carry.ore = 10;
      const out = endSortie(j, result(j, { ended: 'destroyed' }));
      return { j, out };
    };
    const d = wreck('drifter'), p = wreck('prospector');
    expect(d.out.kind).toBe('adrift');
    expect(d.j.carry.cyrite).toBe(15);
    expect(d.j.carry.parts).toBe(6);
    expect(d.j.carry.chits).toBe(30);
    expect(p.j.carry.cyrite).toBe(10);
    expect(p.j.carry.parts).toBe(4);
    expect(d.j.carry.ore).toBe(0);
    // the days lost adrift are the same, and the wreck count is
    expect(d.j.day).toBeCloseTo(p.j.day, 5);
    expect(ADRIFT).toBe(1);
    const ends = (id: SurvivalId) => { const j = newJourney(3, false, 'three', id); let n = 0; while (j.status !== 'over' && n < 9) { endSortie(j, result(j, { ended: 'destroyed' })); n++; } return n; };
    expect(ends('prospector')).toBe(WRECKS);
    expect(ends('drifter')).toBe(SURVIVAL.drifter.voyage.wrecks);
    expect(ends('raider')).toBe(WRECKS);
  });

  it('wears the drive less in Drifter', () => {
    const jump = (id: SurvivalId) => {
      const j = newJourney(3, false, 'three', id);
      j.carry.parts = 6;
      plot(j, lanesFrom(j.chart, j.at)[0]!.to.id);
      endSortie(j, result(j));
      return j.carry.parts;
    };
    expect(jump('prospector')).toBe(6 - WEAR);
    expect(jump('drifter')).toBe(6 - SURVIVAL.drifter.voyage.wear);
  });

  it('spreads the Net slower in Drifter', () => {
    const net = (id: SurvivalId) => {
      const j = newJourney(3, false, 'three', id);
      plot(j, lanesFrom(j.chart, j.at)[0]!.to.id);
      // a long sortie: the days pass, the Net moves
      endSortie(j, result(j, { time: 14 * DAY }));
      return sum(Object.values(j.chart.net));
    };
    expect(net('drifter')).toBeLessThan(net('prospector'));
    expect(net('raider')).toBe(net('prospector'));
  });

  it('lays more breathers for a Drifter and fewer for a Raider', { timeout: 30_000 }, () => {
    const quiet = (b: number) => sum([1, 2, 3, 4].map((seed) => makeChart(seed, 'eight', b).systems.filter((s) => s.quiet).length));
    const [d, p, r] = [SURVIVAL.drifter, SURVIVAL.prospector, SURVIVAL.raider].map((m) => quiet(m.voyage.breathers));
    expect(d!).toBeGreaterThan(p!);
    expect(r!).toBeLessThan(p!);
    expect(r!).toBeGreaterThan(0);
    // the systems and lanes do not move
    const a = makeChart(5, 'eight', 1.5), b = makeChart(5, 'eight');
    expect(a.systems.map((s) => s.id + s.kind)).toEqual(b.systems.map((s) => s.id + s.kind));
    // an old chart relaid at the baseline gets the same breathers it had
    const again = makeChart(5, 'eight');
    layQuiet(again, 5);
    expect(again.systems.map((s) => !!s.quiet)).toEqual(b.systems.map((s) => !!s.quiet));
    // eight-region charts are slow to lay: the explicit timeout keeps a busy machine from flaking it
  });
});

describe('a mode that is playable', () => {
  /** One sortie, flown by holding the nose at the lane mouth and firing; with the ship kept whole, it must neither stall nor spiral. */
  it('lets every mode begin a sortie, cut rock and reach a state it can leave', () => {
    for (const id of SURVIVAL_IDS) {
      const j = newJourney(7, false, 'three', id);
      const w = new World(3, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
      for (let i = 0; i < Math.round(30 / STEP); i++) w.step(STEP, { ...idle, thrust: 1 });
      expect(w.phase, id).not.toBe('over');
      expect(w.cyrite, id).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(w.ship.x)).toBe(true);
    }
  });

  it('never starts a journey short of what its first lane asks, unless it has to mine for it', () => {
    for (const id of SURVIVAL_IDS) {
      const j = newJourney(7, false, 'three', id);
      const first = sortieDef(j).jumpCost;
      // the opening tank is a start, not the jump: the first Cyrite is to be found, in every mode
      expect(j.carry.cyrite, id).toBeLessThan(first + 1);
      expect(j.carry.cyrite, id).toBeGreaterThan(0);
    }
  });

  it('is not unwinnable by hunger: every mode begins with food for the first jump', () => {
    for (const id of SURVIVAL_IDS) expect(newJourney(7, false, 'three', id).carry.food).toBeGreaterThanOrEqual(FOOD_START);
  });

  it('keeps netted systems and the Net from Cerro the same everywhere at the start', () => {
    for (const id of SURVIVAL_IDS) {
      const c = newJourney(7, false, 'three', id).chart;
      expect(netted(c, c.home)).toBe(true);
      expect(spreadNet(JSON.parse(JSON.stringify(c)), 0, new Rng(1))).toEqual([]);
    }
  });
});

describe('the run record', () => {
  it('names the mode and counts loot by source', () => {
    const r = newRun(1, 'raider');
    expect(r.survival).toBe('raider');
    expect(r.loot.rock).toEqual({ krail: 0, cyrite: 0, ore: 0, parts: 0 });
    expect(newRun(1).survival).toBe('prospector');
    // a record carries them through JSON, as the app stores runs
    expect(JSON.parse(JSON.stringify(r)).loot.wreck.cyrite).toBe(0);
  });
});
