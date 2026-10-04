import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CARDS } from '../src/content/cards';
import { MODULES, MODULE_BY_ID, SHIP_SYSTEMS } from '../src/content/modules';
import { UPGRADES } from '../src/content/upgrades';
import { HOLD_START, PATCH_COST, PRICE } from '../src/sim/breakout';
import { computeStats } from '../src/sim/build';
import { CARD_BY_ID as CARDS_BY_ID, choiceView, sensors, yourStrength, type Ctx } from '../src/sim/comms';
import { newJourney } from '../src/sim/journey';
import {
  CAPITAL_SALVAGE, discounted, earned, effects, fitCost, fitNeeds, hasFitted, JOB_FAVOURS, LISTENER_KIT, mainSystem, noKit, systemMarks,
} from '../src/sim/modules';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input()); };

const ctx = (x: Partial<Ctx> = {}): Ctx => ({
  t: 300, heat: 0.3, krail: 10, need: 20, tank: 40, ore: 0, holdMax: 40, chits: 0, parts: 0, plates: 3, maxPlates: 3,
  levels: {}, flags: new Set(), standing: {}, place: 'open', hostiles: 0, food: 12, kind: 'home', netted: true, behind: Infinity, ...x,
});

/** A quiet Breakout docked at the port, with `chits` and `kit` aboard. */
function docked(chits = 500, kit = { guns: 20, rig: 20, signals: 20, contacts: 20 }): World {
  const j = newJourney(3);
  const w = new World(5, { mode: 'breakout', carry: { ...j.carry, chits, kit } });
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  w.bk!.nextPursuit = Infinity;
  w.cardNext = Infinity;
  w.portCalled = true;
  const b = w.bk!;
  w.ship.x = b.port!.x; w.ship.z = b.port!.z; w.ship.vx = w.ship.vz = 0;
  run(w, 1.5);
  return w;
}

describe('the ship’s systems', () => {
  it('lists modules for all four systems, each priced for every mark, with ids that collide with nothing', () => {
    for (const s of SHIP_SYSTEMS) expect(MODULES.filter((m) => m.system === s).length).toBeGreaterThanOrEqual(3);
    const ups = new Set(UPGRADES.map((u) => u.id));
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length);
    for (const m of MODULES) {
      expect(ups.has(m.id)).toBe(false);
      expect(m.kit.length).toBe(m.max);
      expect(m.chits.length).toBe(m.max);
      for (const id of m.counts ?? []) expect(ups.has(id)).toBe(true);
    }
  });

  it('earns each system’s resource from its own way of playing', () => {
    const r = newRun(1);
    expect(earned(r)).toEqual(noKit());
    r.kills = 9; r.capitals = 1; r.capitalFactions = ['office'];
    r.cut = 7; r.ore = 30;
    r.jobsDone = 1;
    const bluff = CARDS.find((c) => c.choices.some((x) => x.tone === 'bluff'))!;
    const help = CARDS.find((c) => c.choices.some((x) => x.tone === 'help'))!;
    r.cards = [
      { id: bluff.id, choice: bluff.choices.find((x) => x.tone === 'bluff')!.id, won: true, t: 1 },
      { id: bluff.id, choice: bluff.choices.find((x) => x.tone === 'bluff')!.id, won: false, t: 2 },
      { id: help.id, choice: help.choices.find((x) => x.tone === 'help')!.id, won: true, t: 3 },
    ];
    expect(earned(r)).toEqual({ guns: 2 + CAPITAL_SALVAGE, rig: 2 + 1, signals: LISTENER_KIT + 1, contacts: JOB_FAVOURS + 1 });
  });

  it('prices each mark dearer, stops at the last, and says what is missing', () => {
    expect(fitCost({}, 'md_racks')).toEqual({ kit: 3, chits: 25 });
    expect(fitCost({ md_racks: 1 }, 'md_racks')).toEqual({ kit: 5, chits: 45 });
    expect(fitCost({ md_racks: 3 }, 'md_racks')).toBeNull();
    expect(fitCost({}, 'ph_emitters')).toBeNull();
    expect(fitNeeds({}, { ...noKit(), rig: 3 }, 25, 'md_racks')).toEqual([]);
    expect(fitNeeds({}, { ...noKit(), guns: 9 }, 10, 'md_racks')).toEqual(['Needs 3 rig parts', 'Needs 25 chits']);
    expect(fitNeeds({ md_spoofer: 1 }, { ...noKit(), signals: 99 }, 999, 'md_spoofer')).toEqual(['Fully fitted']);
  });

  it('changes the stat block, the hold, the heat, the prices and what the comms open', () => {
    const base = computeStats({});
    const guns = computeStats({ md_hardpoints: 2, md_plate: 1 });
    expect(guns.dmgAll).toBeCloseTo(base.dmgAll * 1.21);
    expect(guns.maxPlates).toBe(base.maxPlates + 1);
    const e = effects({ md_racks: 2, md_baffles: 2, md_ledger: 1, md_spoofer: 1, md_jammer: 1, md_shop: 1 });
    expect(e.hold).toBe(30);
    expect(e.heat).toBeCloseTo(0.875 ** 2);
    expect(e.patch).toBe(2);
    expect(e.flags).toEqual(['codes']);
    expect(e.counts).toEqual(['ut_scanner']);
    expect(discounted(PRICE, { md_ledger: 1 })).toEqual({ ...PRICE, krail: Math.round(PRICE.krail * 0.9), food: Math.round(PRICE.food * 0.9), plate: 27, refit: 54 });
    expect(discounted(PRICE, {})).toBe(PRICE);
  });

  it('counts a module as the kit a card asks for, and names it in what a choice needs', () => {
    expect(hasFitted({ md_jammer: 1 }, 'ut_scanner')).toBe(true);
    expect(hasFitted({}, 'ut_scanner')).toBe(false);
    const relay = CARDS_BY_ID.relay!, jam = relay.choices.find((c) => c.id === 'jam')!;
    expect(choiceView(jam, relay, ctx(), 0).needs[0]).toContain('Jammer');
    expect(choiceView(jam, relay, ctx({ levels: { md_jammer: 1 } }), 0).ok).toBe(true);
    expect(sensors({ md_array: 1 })).toBeCloseTo(sensors({}) + 0.15);
    expect(yourStrength({ md_hardpoints: 2 }, 3)).toBeGreaterThan(yourStrength({}, 3));
  });

  it('names the system a ship is built on', () => {
    expect(mainSystem({})).toBeNull();
    expect(mainSystem({ md_racks: 2, md_baffles: 1 })).toBe('rig');
    expect(mainSystem({ md_racks: 1, md_baffles: 1 })).toBeNull();
    expect(systemMarks({ md_racks: 2, md_shop: 1, md_names: 1 })).toEqual({ guns: 0, rig: 3, signals: 0, contacts: 1 });
  });
});

describe('the yard', () => {
  it('fits a module at a port, paid in its resource and chits, and nowhere else', () => {
    const w = docked(100);
    expect(w.phase).toBe('dock');
    expect(w.fitModule('md_racks')).toBe(true);
    expect(w.levels.md_racks).toBe(1);
    expect(w.chits).toBe(75);
    expect(w.kit.rig).toBe(17);
    expect(w.holdMax).toBe(HOLD_START + 15);
    expect(w.fitModule('md_spoofer')).toBe(true);
    expect(w.flags.has('codes')).toBe(true);
    // out of chits
    expect(w.fitNeeds('md_plate')).toEqual(['Needs 40 chits']);
    expect(w.fitModule('md_plate')).toBe(false);
    w.undock();
    w.chits = 500;
    expect(w.fitNeeds('md_plate')).toEqual(['Only at a port']);
    expect(w.fitModule('md_plate')).toBe(false);
    // the fitted modules and what is left of the resources go on with the ship
    const c = w.carry();
    expect(c.levels).toMatchObject({ md_racks: 1, md_spoofer: 1 });
    expect(c.kit).toEqual({ guns: 20, rig: 17, signals: 14, contacts: 20 });
  });

  it('brings the modules aboard in the next system: racks, flags, a cheaper patch, a cheaper port', () => {
    const j = newJourney(3);
    const w = new World(5, { mode: 'breakout', carry: { ...j.carry, ore: 50, levels: { md_racks: 1, md_names: 1, md_shop: 1, md_ledger: 1 } } });
    expect(w.holdMax).toBe(HOLD_START + 15);
    expect(w.ore).toBe(50);
    expect(w.flags.has('gutter_friend')).toBe(true);
    expect(w.patchCost).toBe(PATCH_COST - 2);
    expect(w.prices.refit).toBe(54);
  });

  it('lets heat climb slower behind baffles', () => {
    const quiet = (levels = {}) => {
      const j = newJourney(3);
      const w = new World(5, { mode: 'breakout', carry: { ...j.carry, levels } });
      w.field.rocks = []; w.field.bulwarks = []; w.field.step = () => {};
      w.bk!.nextPursuit = Infinity; w.cardNext = Infinity; w.portCalled = true;
      return w;
    };
    const a = quiet(), b = quiet({ md_baffles: 2 });
    const h0 = a.bk!.heat;
    run(a, 20); run(b, 20);
    expect(b.bk!.heat - h0).toBeCloseTo((a.bk!.heat - h0) * 0.875 ** 2, 4);
  });

  it('adds what a sortie earns to what came aboard', () => {
    const j = newJourney(3);
    const w = new World(5, { mode: 'breakout', carry: { ...j.carry, kit: { guns: 1, rig: 0, signals: 0, contacts: 0 } } });
    w.run.kills = 8;
    expect(w.kit.guns).toBe(3);
    expect(w.result().carry.kit.guns).toBe(3);
  });
});

describe('the save', () => {
  it('brings a version 2 journey up with nothing earned for the systems', () => {
    const j = newJourney(4) as unknown as Record<string, unknown> & { carry: Record<string, unknown> };
    j.version = 2;
    delete j.carry.kit;
    const m = migrate(JSON.parse(JSON.stringify(j)));
    expect(m?.version).toBe(3);
    expect(m?.carry.kit).toEqual(noKit());
    expect(MODULE_BY_ID.md_racks).toBeDefined();
  });
});
