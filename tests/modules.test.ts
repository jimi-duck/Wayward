import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CARDS } from '../src/content/cards';
import { MODULES, MODULE_BY_ID, SHIP_SYSTEMS } from '../src/content/modules';
import { upgradeSystem, UPGRADES } from '../src/content/upgrades';
import { HOLD_START, PATCH_COST, PRICE } from '../src/sim/breakout';
import { computeStats } from '../src/sim/build';
import { CARD_BY_ID as CARDS_BY_ID, choiceView, sensors, yourStrength, type Ctx } from '../src/sim/comms';
import { ECHO_DELAY, endSortie, newJourney, VERSION } from '../src/sim/journey';
import { makeOffer } from '../src/sim/offers';
import { Rng } from '../src/sim/rng';
import {
  BLUFF_KIT, CAPITAL_SALVAGE, discounted, earned, effects, fitCost, fitNeeds, hasFitted, JOB_FAVOURS, LISTENER_KIT, mainSystem, noKit, systemMarks,
} from '../src/sim/modules';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input()); };

const ctx = (x: Partial<Ctx> = {}): Ctx => ({
  t: 300, heat: 0.3, cyrite: 10, need: 20, tank: 40, ore: 0, holdMax: 40, chits: 0, parts: 0, plates: 3, maxPlates: 3,
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
    r.kills = 13; r.capitals = 1; r.capitalFactions = ['office']; r.killsByKind = { warbird: 2, scout: 11 };
    r.cut = 7; r.ore = 30;
    r.jobsDone = 1;
    const bluff = CARDS.find((c) => c.choices.some((x) => x.tone === 'bluff'))!;
    const help = CARDS.find((c) => c.choices.some((x) => x.tone === 'help'))!;
    r.cards = [
      { id: bluff.id, choice: bluff.choices.find((x) => x.tone === 'bluff')!.id, won: true, t: 1 },
      { id: bluff.id, choice: bluff.choices.find((x) => x.tone === 'bluff')!.id, won: false, t: 2 },
      { id: help.id, choice: help.choices.find((x) => x.tone === 'help')!.id, won: true, t: 3 },
    ];
    expect(earned(r)).toEqual({ guns: 2 + CAPITAL_SALVAGE, rig: 7 + 2, signals: LISTENER_KIT + 2 + BLUFF_KIT, contacts: JOB_FAVOURS + 1 });
  });

  it('prices each mark dearer, stops at the last, and says what is missing', () => {
    expect(fitCost({}, 'md_racks')).toEqual({ kit: 3, chits: 10 });
    expect(fitCost({ md_racks: 1 }, 'md_racks')).toEqual({ kit: 5, chits: 20 });
    expect(fitCost({ md_racks: 3 }, 'md_racks')).toBeNull();
    expect(fitCost({}, 'ph_emitters')).toBeNull();
    expect(fitNeeds({}, { ...noKit(), rig: 3 }, 10, 'md_racks')).toEqual([]);
    expect(fitNeeds({}, { ...noKit(), guns: 9 }, 5, 'md_racks')).toEqual(['Needs 3 rig parts', 'Needs 10 chits']);
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
    expect(discounted(PRICE, { md_ledger: 1 })).toEqual({ ...PRICE, cyrite: Math.round(PRICE.cyrite * 0.9), food: Math.round(PRICE.food * 0.9), plate: 27, refit: 54 });
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
    const w = docked(40);
    expect(w.phase).toBe('dock');
    expect(w.fitModule('md_racks')).toBe(true);
    expect(w.levels.md_racks).toBe(1);
    expect(w.chits).toBe(30);
    expect(w.kit.rig).toBe(17);
    expect(w.holdMax).toBe(HOLD_START + 15);
    expect(w.fitModule('md_spoofer')).toBe(true);
    expect(w.flags.has('codes')).toBe(true);
    // out of chits
    expect(w.fitNeeds('md_plate')).toEqual(['Needs 15 chits']);
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
    w.run.kills = 12;
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
    expect(m?.version).toBe(VERSION);
    expect(m?.carry.kit).toEqual(noKit());
    expect(MODULE_BY_ID.md_racks).toBeDefined();
  });
});

describe('what each system opens', () => {
  const view = (card: string, choice: string, levels: Record<string, number>, x: Partial<Ctx> = {}) => {
    const c = CARDS_BY_ID[card]!, ch = c.choices.find((y) => y.id === choice)!;
    return choiceView(ch, c, ctx({ levels, ore: 20, parts: 5, ...x }), 0);
  };

  it('gives every system choices of its own on the cards, greyed out until a module is fitted', () => {
    const opened = new Map<string, number>();
    for (const c of CARDS) for (const ch of c.choices) {
      for (const id of [ch.needs?.fitted ?? []].flat()) {
        const m = MODULE_BY_ID[id];
        if (m) opened.set(m.system, (opened.get(m.system) ?? 0) + 1);
      }
    }
    for (const s of SHIP_SYSTEMS) expect(opened.get(s) ?? 0, s).toBeGreaterThanOrEqual(2);
    for (const [card, choice, id] of [
      ['picket_fine', 'mounts', 'md_hardpoints'], ['office_ambush', 'plate', 'md_plate'], ['office_ambush', 'jam', 'md_jammer'], ['picket_fine', 'licence', 'md_spoofer'],
      ['claim_jumpers', 'racks', 'md_racks'], ['distress_tug', 'tow', 'md_tractor'], ['hungry_crew', 'shop', 'md_shop'],
      ['port_scan', 'friends', 'md_dock'], ['lane_toll', 'account', 'md_ledger'], ['calloway_here', 'dark', 'md_baffles'],
    ] as const) {
      const shut = view(card, choice, {});
      expect(shut.ok, `${card}.${choice}`).toBe(false);
      expect(shut.needs.join(' '), `${card}.${choice}`).toContain(MODULE_BY_ID[id]!.name);
      expect(view(card, choice, { [id]: 1 }).ok, `${card}.${choice}`).toBe(true);
    }
  });
});

describe('the ghost echo', () => {
  /** Through the Breakout and over the first lane, with `levels` fitted. */
  const jumped = (levels: Record<string, number>) => {
    const j = newJourney(7);
    const r = newRun(1);
    r.escaped = true;
    endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 20, food: 12, parts: 6, plates: 3, levels }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
    return j;
  };

  it('holds Calloway up at every jump, and at the second mark hides your route from her', () => {
    const plain = jumped({}), one = jumped({ md_ghost: 1 }), two = jumped({ md_ghost: 2 });
    expect(one.hunt.delay - plain.hunt.delay).toBeCloseTo(ECHO_DELAY);
    expect(two.hunt.delay - plain.hunt.delay).toBeCloseTo(2 * ECHO_DELAY);
    expect(plain.hunt.hunch).toBeDefined();
    expect(one.hunt.hunch).toBeDefined();
    expect(two.hunt.hunch).toBeUndefined();
  });
});

describe('the field refit under the four systems', () => {
  it('puts every upgrade under a system, and deals a system’s cards more often once its modules are fitted', () => {
    for (const u of UPGRADES) expect(SHIP_SYSTEMS).toContain(upgradeSystem(u));
    expect(upgradeSystem(UPGRADES.find((u) => u.id === 'ut_scanner')!)).toBe('signals');
    const share = (levels: Record<string, number>) => {
      let rig = 0, all = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const o = makeOffer({ levels, unlocked: new Set(), techs: new Set(), presented: new Set(UPGRADES.filter((u) => u.group).map((u) => u.group!)), refit: 3 }, new Rng(seed));
        for (const c of o.cards) { all++; if (upgradeSystem(UPGRADES.find((u) => u.id === c.id)!) === 'rig') rig++; }
      }
      return rig / all;
    };
    expect(share({ md_racks: 3, md_shop: 2, md_tractor: 2 })).toBeGreaterThan(share({}) * 1.3);
  });
});
