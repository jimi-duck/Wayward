import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../src/content/upgrades';
import { NODE, STORY_PRICE, WEB } from '../src/content/web';
import { blockOf, budgets, built, cost, endless, install, limitOf, maxLevel, stockLevels, type BayCtx } from '../src/sim/bay';
import { computeStats, gains, overhaul } from '../src/sim/build';
import { depthOf, DEPTH, bountyAt, newJourney, sortieDef, threatAt } from '../src/sim/journey';
import { bounty } from '../src/sim/mission';
import { threatened, NO_MODS } from '../src/sim/director';
import { colsOf } from '../src/sim/chart';

const ALL = new Set(UPGRADES.map((u) => u.id));
const story = (o: Partial<BayCtx> = {}): BayCtx => ({ levels: stockLevels(), unlocked: ALL, techs: new Set(), arcade: false, docked: true, krail: 1e9, ...o });

describe('the Story’s prices', () => {
  it('start well above the Arcade’s old ones and rise with every level of the same part', () => {
    expect(cost('ph_emitters', 1, false)).toBeGreaterThanOrEqual(20);
    let last = 0;
    for (let lv = 1; lv <= 12; lv++) {
      const c = cost('ph_emitters', lv, false);
      expect(c, `level ${lv}`).toBeGreaterThan(last);
      last = c;
    }
    // a fifth dearer a level, within the five-Cyrite rounding
    expect(cost('ph_emitters', 6, false)).toBeGreaterThan(cost('ph_emitters', 1, false) * STORY_PRICE.growth ** 4 * 0.95);
  });

  it('rise with every level fitted anywhere on the ship, not counting what it left Cerro with', () => {
    const bare = stockLevels(), grown = { ...bare, ph_capacitors: 4, df_shield: 2, mo_thrusters: 3 };
    expect(built(bare)).toBe(0);
    expect(built(grown)).toBe(9);
    expect(cost('tp_yield', 1, false, grown)).toBeGreaterThan(cost('tp_yield', 1, false, bare));
    expect(cost('tp_yield', 1, false, grown)).toBeGreaterThanOrEqual(Math.round(cost('tp_yield', 1, false, bare) * (1 + STORY_PRICE.ship * 9) * 0.9));
  });

  it('charge the same flat price in the Arcade whatever is fitted', () => {
    expect(cost('ph_emitters', 1, true)).toBe(cost('ph_emitters', 5, true, { ph_emitters: 4, tp_yield: 3 }));
  });

  it('charge the balance parts a gentler climb than the parts they keep in trim', () => {
    expect(cost('rx_core', 8, false)).toBeLessThan(cost('ph_emitters', 8, false));
  });
});

describe('endless ladders', () => {
  it('end nowhere for a stat upgrade, a balance part or a module that moves the stat block, and keep the Arcade’s tops', () => {
    for (const id of ['ph_emitters', 'tp_yield', 'rx_core', 'rx_sinks', 'hl_frame', 'md_hardpoints']) {
      expect(endless(id), id).toBe(true);
      expect(limitOf(id, false), id).toBe(Infinity);
      expect(limitOf(id, true), id).toBe(maxLevel(id));
    }
    // a one-off, a system and a module that only sets a flag are written to their top
    for (const id of ['tp_bay', 'ph_cone', 'md_spoofer', 'md_racks']) expect(limitOf(id, false), id).toBe(maxLevel(id));
  });

  it('fit past the written top in the Story, never in the Arcade', () => {
    const top = maxLevel('ph_emitters');
    const levels = { ...stockLevels(), ph_emitters: top };
    expect(blockOf('ph_emitters', story({ levels }))).toBeNull();
    expect(blockOf('ph_emitters', story({ levels: { ...levels, ph_emitters: top + 3 } }))).toBeNull();
    // the ship has physical limits, though: the lance cannot be made hit five times harder than it did, so the ladder stops there
    expect(blockOf('ph_emitters', story({ levels: { ...levels, ph_emitters: top + 12 } }))).toBe('full');
    expect(blockOf('ph_emitters', story({ levels, arcade: true }))).toBe('full');
    const r = install('ph_emitters', story({ levels }));
    expect(typeof r).toBe('object');
  });

  it('give a fading share of a written level, so the tenth extra level is worth less than the first', () => {
    expect(overhaul(1)).toBeCloseTo(0.5);
    expect(overhaul(10)).toBeLessThan(overhaul(1) * 0.5);
    const top = maxLevel('ph_emitters'), dmg = (n: number) => computeStats({ ph_emitters: top + n }).laserDamage;
    const first = dmg(1) - dmg(0), fifth = dmg(5) - dmg(4);
    expect(first).toBeGreaterThan(0);
    expect(fifth).toBeGreaterThan(0);
    expect(fifth).toBeLessThan(first);
  });

  it('stop where a further level would change nothing: the plates and the shield charges have physical limits', () => {
    // the hull leaves with three plates and can carry five: the first plate adds one, the second adds one, the third nothing
    expect(blockOf('md_plate', story({ levels: { ...stockLevels(), md_plate: 1 } }))).toBeNull();
    const l = { ...stockLevels(), md_plate: 2 };
    expect(gains(l, 'md_plate')).toBe(false);
    expect(blockOf('md_plate', story({ levels: l }))).toBe('full');
  });

  it('keep the balance parts open however many are fitted, each taking a little of the next gauge', () => {
    const levels = { ...stockLevels(), rx_core: 20, rx_sinks: 20, hl_frame: 20 };
    for (const id of ['rx_core', 'rx_sinks', 'hl_frame']) expect(blockOf(id, story({ levels })), id).toBeNull();
    const { use, cap } = budgets({ rx_core: 1, rx_sinks: 1, hl_frame: 1 });
    const bare = budgets({});
    // each brings its gauge up by more than the next one's draw takes back
    expect(cap.power - bare.cap.power).toBeGreaterThan(0);
    expect(use.heat - bare.use.heat).toBeGreaterThan(0);
    expect(use.mass - bare.use.mass).toBeGreaterThan(0);
    expect(use.power - bare.use.power).toBeGreaterThan(0);
    expect(cap.heat - bare.cap.heat).toBeGreaterThan(use.heat - bare.use.heat);
    expect(cap.mass - bare.cap.mass).toBeGreaterThan(use.mass - bare.use.mass);
    expect(cap.power - bare.cap.power).toBeGreaterThan(use.power - bare.use.power);
  });

  it('let a ship that keeps adding gear find its way back into balance, at a price that rises', () => {
    // a heavy gun build: keep fitting emitters and capacitors, adding a core before power runs out
    let levels = stockLevels();
    const ctx = (l: typeof levels) => story({ levels: l });
    for (let i = 0; i < 40; i++) {
      const { use, cap } = budgets(levels);
      for (const id of ['ph_emitters', 'ph_capacitors', 'df_shield', 'rx_core']) {
        // a ship that means to stay in trim adds a core before the gear that would run its reactor over
        if (blockOf(id, ctx(levels)) === null && (id === 'rx_core' || use.power + (NODE[id]!.draw.power ?? 0) <= cap.power)) { levels = { ...levels, [id]: (levels[id] ?? 0) + 1 }; break; }
      }
    }
    const { use, cap } = budgets(levels);
    expect(use.power).toBeLessThanOrEqual(cap.power);
    expect(levels.rx_core).toBeGreaterThan(0);
    expect(WEB.some((n) => n.id === 'rx_core')).toBe(true);
  });
});

describe('the further along the chart', () => {
  it('hulls are tougher and fire oftener, jobs pay more, from Cerro to the Threshold', () => {
    const j = newJourney(3000, false, 'eight');
    expect(threatAt(j.chart, j.chart.home)).toBe(1);
    expect(threatAt(j.chart, j.chart.edge)).toBeCloseTo(DEPTH.threat);
    expect(bountyAt(j.chart, j.chart.edge)).toBeCloseTo(DEPTH.pay);
    expect(depthOf(j.chart, j.chart.edge)).toBe(1);
    expect(colsOf(j.chart)).toBeGreaterThan(10);
    // Cerro is as it was; the sorties beyond it carry both (sim/journey.ts `sortieDef`)
    const def = sortieDef(j);
    expect(def.threat ?? 1).toBe(1);
    expect(def.pay ?? 1).toBe(1);
  });

  it('toughens the sky by the threat and quickens its fire a quarter as much', () => {
    expect(threatened(NO_MODS, 1)).toBe(NO_MODS);
    const m = threatened(NO_MODS, 3);
    expect(m.toughness).toBe(3);
    expect(m.fire).toBeCloseTo(1 / 1.5);
    expect(m.traffic).toBe(1);
  });

  it('raises a job’s Cyrite and nothing else', () => {
    const out = bounty({ text: 'x', chits: 100, supplies: 2, standing: { custody: 1 } }, 2);
    expect(out.chits).toBe(200);
    expect(out.supplies).toBe(2);
    expect(out.standing).toEqual({ custody: 1 });
    expect(bounty({ text: 'x', chits: 100 }, 1).chits).toBe(100);
  });
});
