import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CARDS } from '../src/content/cards';
import { MODULES, MODULE_BY_ID, SHIP_SYSTEMS } from '../src/content/modules';
import { NODE } from '../src/content/web';
import { upgradeSystem, UPGRADES } from '../src/content/upgrades';
import { PATCH_COST, PRICE, SUPPLIES_MAX } from '../src/sim/breakout';
import { blockOf, cost, fee, stockLevels, type BayCtx } from '../src/sim/bay';
import { computeStats } from '../src/sim/build';
import { CARD_BY_ID as CARDS_BY_ID, choiceView, sensors, yourStrength, type Ctx } from '../src/sim/comms';
import { ECHO_DELAY, endSortie, newJourney, VERSION } from '../src/sim/journey';
import { discounted, effects, hasFitted, mainSystem, systemMarks } from '../src/sim/modules';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input()); };

const ctx = (x: Partial<Ctx> = {}): Ctx => ({
  t: 300, heat: 0.3, cyrite: 10, need: 20, tank: 40, chits: 0, plates: 3, maxPlates: 3,
  levels: {}, flags: new Set(), standing: {}, place: 'open', hostiles: 0, supplies: 12, kind: 'home', netted: true, behind: Infinity, ...x,
});

/** A quiet Breakout docked at the port, with `chits` aboard. */
function docked(chits = 500): World {
  const j = newJourney(3);
  const w = new World(5, { mode: 'breakout', carry: { ...j.carry, chits } });
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
  it('lists modules for all four systems, each a Story node of the bay\'s web fitted at the yard, with a fee for every mark', () => {
    for (const s of SHIP_SYSTEMS) expect(MODULES.filter((m) => m.system === s).length).toBeGreaterThanOrEqual(3);
    const ups = new Set(UPGRADES.map((u) => u.id));
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length);
    for (const m of MODULES) {
      expect(ups.has(m.id)).toBe(false);
      expect(m.chits.length).toBe(m.max);
      expect(NODE[m.id], m.id).toMatchObject({ story: true, yard: 1 });
      for (const id of m.counts ?? []) expect(ups.has(id)).toBe(true);
    }
  });

  it('prices the yard\'s work in chits, only at a port, and only in the Story mode', () => {
    const story = (x: Partial<BayCtx> = {}): BayCtx => ({ levels: stockLevels(), unlocked: new Set(), techs: new Set(), arcade: false, krail: 1000, chits: 1000, ...x });
    expect(blockOf('md_racks', story())).toBe('yard');
    expect(blockOf('md_racks', story({ docked: true }))).toBeNull();
    expect(blockOf('md_racks', story({ docked: true, chits: 5 }))).toBe('chits');
    expect(blockOf('md_racks', { ...story({ docked: true }), arcade: true })).toBe('mode');
    expect(fee('md_racks', 1, false)).toBe(10);
    expect(fee('md_racks', 2, false)).toBe(20);
    expect(cost('md_racks', 2, false)).toBeGreaterThan(cost('md_racks', 1, false));
    expect(blockOf('md_racks', story({ docked: true, levels: { ...stockLevels(), md_racks: 3 } }))).toBe('full');
    // the frame is yard work in the Story mode, never in the arcade; the core only from its last level
    expect(blockOf('hl_frame', story())).toBe('yard');
    expect(blockOf('hl_frame', { ...story(), arcade: true })).toBeNull();
    expect(fee('hl_frame', 1, true)).toBe(0);
    expect(blockOf('rx_core', story({ levels: { ...stockLevels(), rx_core: 1 } }))).toBeNull();
    expect(blockOf('rx_core', story({ levels: { ...stockLevels(), rx_core: 2 } }))).toBe('yard');
  });

  it('changes the stat block, the hold, the heat, the prices and what the comms open', () => {
    const base = computeStats({});
    const guns = computeStats({ md_hardpoints: 2, md_plate: 1 });
    expect(guns.dmgAll).toBeCloseTo(base.dmgAll * 1.21);
    expect(guns.maxPlates).toBe(base.maxPlates + 1);
    const e = effects({ md_racks: 2, md_baffles: 2, md_ledger: 1, md_spoofer: 1, md_jammer: 1, md_shop: 1 });
    expect(e.hold).toBe(8);
    expect(e.heat).toBeCloseTo(0.875 ** 2);
    expect(e.patch).toBe(1);
    expect(e.flags).toEqual(['codes']);
    expect(e.counts).toEqual(['ut_scanner']);
    expect(discounted(PRICE, { md_ledger: 1 })).toEqual({ ...PRICE, cyrite: Math.round(PRICE.cyrite * 0.9), supplies: Math.round(PRICE.supplies * 0.9), plate: 27 });
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
  it('fits a module in the bay at a port, paid from the one purse, and not at sea', () => {
    const w = docked(500);
    expect(w.phase).toBe('dock');
    expect(w.openBay()).toBe(true);
    expect(w.install('md_racks')).toBeNull();
    expect(w.levels.md_racks).toBe(1);
    expect(w.chits).toBe(500 - cost('md_racks', 1, false) - fee('md_racks', 1, false));
    expect(w.supplyMax).toBe(SUPPLIES_MAX + 4);
    // the spoofer comes after the baffles on the web
    expect(w.install('md_spoofer')).toBe('path');
    expect(w.install('md_baffles')).toBeNull();
    expect(w.install('md_spoofer')).toBeNull();
    expect(w.flags.has('codes')).toBe(true);
    // out of chits: one purse, so the whole price is short
    w.chits = 10;
    expect(w.install('md_plate')).toBe('krail');
    w.closeBay();
    expect(w.phase).toBe('dock');
    w.undock();
    w.chits = 500;
    w.aliens = [];
    expect(w.openBay()).toBe(true);
    expect(w.install('md_plate')).toBe('yard');
    w.closeBay();
    expect(w.carry().levels).toMatchObject({ md_racks: 1, md_spoofer: 1 });
  });

  it('brings the modules aboard in the next system: racks, flags, a cheaper patch, a cheaper port', () => {
    const j = newJourney(3);
    const w = new World(5, { mode: 'breakout', carry: { ...j.carry, levels: { md_racks: 1, md_names: 1, md_shop: 1, md_ledger: 1 } } });
    expect(w.supplyMax).toBe(SUPPLIES_MAX + 4);
    expect(w.flags.has('gutter_friend')).toBe(true);
    expect(w.patchCost).toBe(PATCH_COST - 1);
    expect(w.prices.supplies).toBeLessThan(w.sortie.port!.prices.supplies);
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
});

describe('the save', () => {
  it('brings an old journey\'s systems\' resources back as chits', () => {
    const j = JSON.parse(JSON.stringify(newJourney(4)).replace(/cyrite/g, 'krail')) as Record<string, unknown> & { carry: Record<string, unknown> };
    j.version = 6;
    j.carry.krail = 20;
    j.carry.kit = { guns: 3, rig: 2, signals: 0, contacts: 1 };
    const m = migrate(JSON.parse(JSON.stringify(j)));
    expect(m?.version).toBe(VERSION);
    expect(m?.carry.cyrite).toBe(20);
    expect(m?.carry.chits).toBe(6 * 8);
    expect('kit' in m!.carry).toBe(false);
    expect(MODULE_BY_ID.md_racks).toBeDefined();
  });
});

describe('what each system opens', () => {
  const view = (card: string, choice: string, levels: Record<string, number>, x: Partial<Ctx> = {}) => {
    const c = CARDS_BY_ID[card]!, ch = c.choices.find((y) => y.id === choice)!;
    return choiceView(ch, c, ctx({ levels, ...x }), 0);
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
    endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 20, supplies: 12, plates: 3, levels }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
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
  it('puts every upgrade under a system', () => {
    for (const u of UPGRADES) expect(SHIP_SYSTEMS).toContain(upgradeSystem(u));
    expect(upgradeSystem(UPGRADES.find((u) => u.id === 'ut_scanner')!)).toBe('signals');
  });
});
