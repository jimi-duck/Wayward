import { describe, expect, it } from 'vitest';
import { UPGRADES, UPGRADE } from '../src/content/upgrades';
import { MODULES } from '../src/content/modules';
import { ARCADE_PRICE, FITTING, FITTINGS, NODE, RATINGS, STOCK_DRAW, TAB_ORDER, TABS, WEB } from '../src/content/web';
import { blockOf, budgets, cheapest, cost, install, maxLevel, PICKS, quickPicks, reachable, roleOf, stockLevels, type BayCtx } from '../src/sim/bay';
import { computeStats, upgradeFigures } from '../src/sim/build';
import { feelBudgets, overload, OVERLOAD } from '../src/sim/budgets';
import { World } from '../src/sim/world';
import { Rng } from '../src/sim/rng';

const ALL = new Set(UPGRADES.map((u) => u.id));
const ctx = (o: Partial<BayCtx> = {}): BayCtx => ({ levels: stockLevels(), unlocked: ALL, techs: new Set(), arcade: true, krail: 1e9, chits: 1e9, ...o });

describe('the web', () => {
  it('places every upgrade, every fitting and every yard module exactly once, and nothing else', () => {
    const ids = WEB.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...UPGRADES.map((u) => u.id), ...FITTINGS.map((f) => f.id), ...MODULES.map((m) => m.id)].sort());
  });

  it('leads only from shallower nodes in the same tab, with no two nodes in one place', () => {
    for (const w of WEB) {
      for (const f of w.from ?? []) {
        expect(NODE[f], `${w.id} from ${f}`).toBeDefined();
        expect(NODE[f]!.tab).toBe(w.tab);
        expect(NODE[f]!.tier).toBeLessThan(w.tier);
      }
    }
    const spots = WEB.map((w) => `${w.tab}/${w.tier}/${w.row}`);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it('keeps every tab small enough to read at a glance', () => {
    for (const t of TAB_ORDER) {
      const nodes = WEB.filter((w) => w.tab === t);
      expect(nodes.length, TABS[t].name).toBeGreaterThan(0);
      expect(nodes.length, TABS[t].name).toBeLessThanOrEqual(17);
      expect(Math.max(...nodes.map((w) => w.tier))).toBeLessThanOrEqual(4);
    }
  });

  it('can reach every node from the stock ship, given Krail, power, the unlocks and a port', () => {
    const techs = new Set(['gutter', 'custody', 'office', 'voice', 'thren']);
    /** What a node needs fitted first: where it comes from, and what its upgrade requires, all the way back. */
    const before = (id: string, out = new Set<string>()): Set<string> => {
      for (const f of [...(NODE[id]!.from ?? []), ...(UPGRADE[id]?.requires ?? []).map((r) => r.id)]) if (!out.has(f)) { out.add(f); before(f, out); }
      return out;
    };
    for (const w of WEB) {
      const path = before(w.id);
      // power is not what this is about: a core far bigger than any ship's
      let levels: Record<string, number> = { ...stockLevels(), rx_core: 100 };
      const c = (lv: Record<string, number>) => ctx({ levels: lv, techs, arcade: !w.story, docked: true });
      for (let round = 0; round < 12 && blockOf(w.id, c(levels)) !== null; round++) {
        for (const o of WEB) {
          // never a specialisation that is not on the way: it would close the target's group
          if (o.id === w.id || (UPGRADE[o.id]?.group && !path.has(o.id))) continue;
          const r = install(o.id, c(levels));
          if (typeof r !== 'string') levels = r.levels;
        }
      }
      // fitted already counts (the stock torpedo bay; the test's own core)
      const b = blockOf(w.id, c(levels));
      expect(b === null || b === 'full', `${w.id}: ${b}`).toBe(true);
    }
  });
});

describe('the bay’s rules', () => {
  it('starts every ship with the basics: lasers, torpedoes and a shield charge', () => {
    const s = computeStats(stockLevels());
    expect(s.torpedoes).toBe(true);
    expect(s.shieldMax).toBe(1);
    const { use, cap } = budgets(stockLevels());
    expect(use.power).toBe(STOCK_DRAW.power + (NODE.tp_bay!.draw.power ?? 0));
    expect(cap).toEqual(RATINGS);
    expect(use.power).toBeLessThan(cap.power);
  });

  it('opens a node once something it comes from is fitted', () => {
    expect(blockOf('ph_pierce', ctx())).toBe('path');
    const r = install('ph_emitters', ctx());
    expect(typeof r).not.toBe('string');
    expect(blockOf('ph_pierce', ctx({ levels: (r as { levels: Record<string, number> }).levels }))).toBeNull();
  });

  it('charges the Story mode more for deeper nodes and later levels, and the Arcade one price for all', () => {
    expect(cost('ph_lance', 1, false)).toBeGreaterThan(cost('ph_emitters', 1, false));
    expect(cost('ph_emitters', 2, false)).toBeGreaterThan(cost('ph_emitters', 1, false));
    const story = { arcade: false, krail: cost('ph_emitters', 1, false) - 1 };
    expect(blockOf('ph_emitters', ctx(story))).toBe('krail');
    expect(blockOf('ph_emitters', ctx({ ...story, krail: story.krail + 1 }))).toBeNull();
    // the Arcade: a tier-one module, a tier-four one and a later level all cost ARCADE_PRICE
    for (const [id, lv] of [['ph_emitters', 1], ['ph_emitters', 2], ['ph_lance', 1], ['tp_cluster', 1]] as const) expect(cost(id, lv, true), `${id} ${lv}`).toBe(ARCADE_PRICE);
    expect(blockOf('ph_emitters', ctx({ krail: ARCADE_PRICE - 1 }))).toBe('krail');
    expect(blockOf('ph_emitters', ctx({ krail: ARCADE_PRICE }))).toBeNull();
    const r = install('ph_emitters', ctx()) as { cost: number };
    expect(r.cost).toBe(ARCADE_PRICE);
    expect(cheapest(ctx({ krail: 0 }))?.cost).toBe(ARCADE_PRICE);
  });

  it('keeps the upgrades’ own rules: one specialisation per group, a deep enough branch', () => {
    const deep = { ...stockLevels(), ph_emitters: 2, ph_pierce: 1, ph_capacitors: 1 };
    expect(blockOf('ph_lance', ctx({ levels: deep }))).toBeNull();
    const taken = { ...deep, ph_lance: 1, ph_bank: 1, ph_lenses: 1 };
    expect(blockOf('ph_array', ctx({ levels: taken }))).toBe('needs');
    expect(blockOf('ph_lance', ctx({ levels: { ...stockLevels(), ph_emitters: 1, ph_pierce: 1 } }))).toBe('needs');
  });

  it('holds to the mode, the unlocks and the salvage', () => {
    expect(blockOf('df_repair', ctx({ arcade: false }))).toBe('mode');
    expect(blockOf('tp_swarm', ctx({ unlocked: new Set(), levels: { ...stockLevels(), tp_yield: 3 } }))).toBe('locked');
    expect(blockOf('tech_gutter', ctx())).toBe('tech');
    expect(blockOf('tech_gutter', ctx({ techs: new Set(['gutter']) }))).toBeNull();
  });

  it('never fits past the power, and never twice past the top level', () => {
    let levels = stockLevels();
    // fill the power with whatever draws it
    for (const w of WEB.filter((x) => (x.draw.power ?? 0) > 0)) {
      for (let i = 0; i < 5; i++) {
        const r = install(w.id, ctx({ levels }));
        if (typeof r === 'string') break;
        levels = r.levels;
      }
    }
    const { use, cap } = budgets(levels);
    expect(use.power).toBeLessThanOrEqual(cap.power);
    expect(WEB.some((w) => blockOf(w.id, ctx({ levels })) === 'power')).toBe(true);
    for (const w of WEB) expect(levels[w.id] ?? 0).toBeLessThanOrEqual(maxLevel(w.id));
  });

  it('never leaves a build stuck for power while the reactor core has room: there is no refund', () => {
    const rng = new Rng(5);
    for (let trial = 0; trial < 40; trial++) {
      let levels = stockLevels();
      for (let step = 0; step < 60; step++) {
        const open = WEB.filter((w) => blockOf(w.id, ctx({ levels })) === null);
        if ((levels.rx_core ?? 0) < maxLevel('rx_core')) expect(open.map((w) => w.id)).toContain('rx_core');
        if (!open.length) break;
        const r = install(open[rng.int(open.length)]!.id, ctx({ levels }));
        if (typeof r !== 'string') levels = r.levels;
      }
    }
  });

  it('lights what could be fitted with Krail enough, power or not', () => {
    const lit = reachable(ctx({ krail: 0 })).map((w) => w.id);
    expect(lit).toContain('ph_emitters');
    expect(lit).toContain('rx_core');
    expect(lit).not.toContain('ph_pierce');
    expect(lit).not.toContain('tp_bay'); // fitted, and only one level
  });
});

describe('the budgets, felt (step 3)', () => {
  it('cost nothing within the ratings', () => {
    const o = overload(stockLevels());
    expect(o.handling).toEqual({ thrust: 1, turn: 1 });
    expect(o.cooling).toBe(1);
  });

  it('a hot ship recharges and reloads slower; heat exchangers take it back', () => {
    const hot = { ...stockLevels(), ph_emitters: 5, ph_capacitors: 4, ph_pierce: 3 };
    const { use, cap } = budgets(hot);
    expect(use.heat).toBeGreaterThan(cap.heat);
    const s = feelBudgets(computeStats(hot), hot), base = computeStats(hot);
    expect(s.bankRefill).toBeLessThan(base.bankRefill);
    expect(s.torpReload).toBeGreaterThan(base.torpReload);
    const cooled = { ...hot, rx_sinks: 2 };
    expect(feelBudgets(computeStats(cooled), cooled).bankRefill).toBe(computeStats(cooled).bankRefill);
  });

  it('a heavy ship turns and speeds up slower, never below the floor; a frame takes it back', () => {
    const heavy = { ...stockLevels(), df_armour: 2, cl_ram: 3, cl_juggernaut: 1 };
    const s = feelBudgets(computeStats(heavy), heavy), base = computeStats(heavy);
    expect(s.thrust).toBeLessThan(base.thrust);
    expect(s.turn).toBeLessThan(base.turn);
    const worst = overload({ ...heavy, df_armour: 50 });
    expect(worst.handling.thrust).toBe(OVERLOAD.massFloor);
    const framed = { ...heavy, hl_frame: 3 };
    expect(overload(framed).handling.thrust).toBe(1);
  });

  it('both modes fly with it, and the figures show it', () => {
    const hot = { ...stockLevels(), ph_emitters: 5, ph_capacitors: 4, ph_pierce: 3 };
    const w = new World(1);
    w.setLevels(hot);
    expect(w.stats.bankRefill).toBeLessThan(computeStats(hot).bankRefill);
    const s = new World(1, { mode: 'breakout' });
    s.setLevels(hot);
    expect(s.stats.bankRefill).toBeLessThan(computeStats(hot).bankRefill);
    const fig = upgradeFigures({ ...stockLevels(), ph_emitters: 3, ph_capacitors: 2, ph_pierce: 1 }, 'ph_pierce').find((f) => f.label === 'Bank refill/sec');
    expect(fig?.cost).toBe(true);
  });
});

describe('suggestions', () => {
  it('offers a few modules that can be fitted (or want only Krail), from different tabs, the same each time (the Story mode)', () => {
    const story = (o: Partial<BayCtx> = {}) => ctx({ arcade: false, ...o });
    const picks = quickPicks(story({ krail: 0 }));
    expect(picks.length).toBe(PICKS);
    for (const p of picks) expect(['krail', null]).toContain(blockOf(p.id, story({ krail: 0 })));
    expect(new Set(picks.map((p) => p.tab)).size).toBe(PICKS);
    expect(quickPicks(story({ krail: 0 })).map((p) => p.id)).toEqual(picks.map((p) => p.id));
  });

  it('leans toward what the ship already is, and asks for power or cooling when they run short (the Story mode)', () => {
    const story = (o: Partial<BayCtx> = {}) => ctx({ arcade: false, ...o });
    const lasers = { ...stockLevels(), ph_emitters: 2, ph_capacitors: 1 };
    expect(quickPicks(story({ levels: lasers })).map((p) => p.tab)).toContain('weapons');
    const hot = { ...stockLevels(), ph_emitters: 3, ph_capacitors: 2, ph_pierce: 1 };
    expect(quickPicks(story({ levels: hot })).map((p) => p.id)).toContain('rx_sinks');
    const flat = { ...stockLevels(), df_shield: 1 }; // 7 of 8 power
    expect(quickPicks(story({ levels: flat })).map((p) => p.id)).toContain('rx_core');
  });
});

describe('the Arcade’s three picks', () => {
  const roles = (o: Partial<BayCtx> = {}) => quickPicks(ctx({ krail: 0, ...o })).map((p) => roleOf(p.id));

  it('is always a gun, a defence and a part of the ship, in that order, every opening', () => {
    let levels = stockLevels();
    for (let deal = 0; deal < 20; deal++) {
      const picks = quickPicks(ctx({ levels, deal }));
      expect(picks.map((p) => roleOf(p.id))).toEqual(['weapons', 'defence', 'ship']);
      for (const p of picks) expect(['krail', null]).toContain(blockOf(p.id, ctx({ levels, deal, krail: 0 })));
      levels = { ...levels, [picks[deal % 3]!.id]: (levels[picks[deal % 3]!.id] ?? 0) + 1 };
    }
  });

  it('deals the same opening the same way, and a later opening differently', () => {
    const a = quickPicks(ctx({ deal: 0 })).map((p) => p.id), b = quickPicks(ctx({ deal: 0 })).map((p) => p.id);
    expect(b).toEqual(a);
    const seen = new Set<string>();
    for (let deal = 0; deal < 12; deal++) for (const p of quickPicks(ctx({ deal }))) seen.add(p.id);
    expect(seen.size).toBeGreaterThan(6);
  });

  it('starts on the basics, and never opens with the reactor, cooling or frame unless the ship needs one', () => {
    for (let deal = 0; deal < 6; deal++) {
      const ids = quickPicks(ctx({ deal })).map((p) => p.id);
      for (const id of ids) expect(FITTING[id], id).toBeUndefined();
    }
    const flat = { ...stockLevels(), df_shield: 1, df_armour: 1, df_repair: 1 }; // out of power
    expect(quickPicks(ctx({ levels: flat })).map((p) => p.id)).toContain('rx_core');
  });

  it('is slower to deal a card again that was passed over', () => {
    const first = quickPicks(ctx({ deal: 1 }));
    const again = quickPicks(ctx({ deal: 2, passed: first.map((p) => p.id) }));
    expect(again.map((p) => p.id)).not.toEqual(first.map((p) => p.id));
    expect(roles({ deal: 2 })).toEqual(['weapons', 'defence', 'ship']);
  });

  it('turns the explorer to a new branch: a part of the ship with nothing fitted', () => {
    // opening 0: the gun slot explores, so it is not a laser or torpedo card
    const gun = quickPicks(ctx({ deal: 0 }))[0]!;
    expect(['laser', 'torpedo']).not.toContain(UPGRADE[gun.id]?.branch);
  });

  it('is kept by the world: the bay deals afresh once it has shut', () => {
    const w = new World(2);
    const a = w.bayCtx().deal;
    w.phase = 'bay';
    w.closeBay();
    expect(w.bayCtx().deal).toBe((a ?? 0) + 1);
  });
});
