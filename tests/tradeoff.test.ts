import { describe, expect, it } from 'vitest';
import { WEB } from '../src/content/web';
import { stockLevels } from '../src/sim/bay';
import type { Levels } from '../src/sim/build';
import { budgets, weightFuel, WEIGHT_FUEL } from '../src/sim/budgets';
import { tradeoff } from '../src/sim/tradeoff';

/** A build carrying `mass` more than the stock ship, by stacking weight parts (availability does not matter to the maths). */
function loaded(over: number): Levels {
  const levels: Levels = { ...stockLevels() };
  const ids = ['md_racks', 'md_shop', 'md_baffles', 'df_bulkheads', 'df_armour', 'cl_ram'];
  for (let i = 0; budgets(levels).use.mass - budgets(levels).cap.mass < over && i < 60; i++) levels[ids[i % ids.length]!] = (levels[ids[i % ids.length]!] ?? 0) + 1;
  return levels;
}

describe('the trade of one more level', () => {
  it('shows a pure weapon upgrade as gains, with no handling change, no extra fluid and no rating passed', () => {
    const t = tradeoff(stockLevels(), 'ph_emitters', false);
    expect(t.gains.map((g) => g.label)).toContain('Lance damage');
    expect(t.gains.every((g) => g.better)).toBe(true);
    expect(t.handling).toEqual([]);
    expect(t.jumpFluid).toBe(0);
    expect(t.overBudget).toEqual({ mass: false, heat: false, power: false });
    expect(t.price).toBeGreaterThan(0);
  });

  it('shows a heavy part on a loaded ship as a handling loss and more jump fluid', () => {
    const base = loaded(0), t = tradeoff(base, 'df_armour', false);
    expect(t.gains.map((g) => g.label)).toContain('Hull plates');
    expect(t.handling.some((h) => !h.better)).toBe(true);
    expect(t.jumpFluid).toBeGreaterThan(0);
    expect(t.jumpFluid).toBe(weightFuel({ ...base, df_armour: (base.df_armour ?? 0) + 1 }) - weightFuel(base));
  });

  it('stops the extra fluid at the cap', () => {
    const base = loaded(WEIGHT_FUEL.max + 2);
    expect(weightFuel(base)).toBe(WEIGHT_FUEL.max);
    expect(tradeoff(base, 'df_armour', false).jumpFluid).toBe(0);
    // one short of the cap: the part that would go past it only adds what is left
    const near = loaded(WEIGHT_FUEL.max - 1);
    const t = tradeoff(near, 'df_armour', false);
    expect(weightFuel(near) + t.jumpFluid).toBeLessThanOrEqual(WEIGHT_FUEL.max);
  });

  it('says which rating the purchase pushes past', () => {
    const base = loaded(0), b = budgets(base);
    expect(b.use.mass).toBeGreaterThanOrEqual(b.cap.mass);
    const t = tradeoff(base, 'df_armour', false);
    expect(t.overBudget.mass).toBe(true);
    expect(t.overBudget.heat).toBe(false);
    // a ship well inside its ratings passes none
    expect(tradeoff(stockLevels(), 'df_armour', false).overBudget.mass).toBe(false);
  });

  it('leaves out every change that comes to nothing, and charges no fluid in the Arcade', () => {
    for (const n of WEB) {
      const t = tradeoff(stockLevels(), n.id, true);
      for (const e of [...t.gains, ...t.handling, ...t.cooldown]) expect(e.delta, `${n.id} ${e.label}`).toMatch(/[1-9]|[A-Za-z]/);
      expect(t.jumpFluid).toBe(0);
    }
    const quiet = tradeoff(stockLevels(), 'md_ledger', false);
    expect([quiet.gains, quiet.handling, quiet.cooldown]).toEqual([[], [], []]);
  });
});
