import { describe, expect, it } from 'vitest';
import { UPGRADE, UPGRADES } from '../src/content/upgrades';
import { available, computeStats, identity, tagWeights, upgradeFigures, type Levels } from '../src/sim/build';
import { pressure } from '../src/sim/director';
import { BASE, CAPS } from '../src/sim/stats';

const none = new Set<string>();

describe('the refit tree', () => {
  it('starts from the stock ship: twin lasers, three plates, one shield charge, no systems', () => {
    const s = computeStats({});
    expect(s).toEqual(BASE);
    expect(s.torpedoes || s.mines || s.plasma || s.arc).toBe(false);
    expect(s.shieldMax).toBe(1);
  });

  it('is consistent: every requirement and group points at a real upgrade', () => {
    for (const u of UPGRADES) {
      for (const r of u.requires ?? []) expect(UPGRADE[r.id], `${u.id} requires ${r.id}`).toBeDefined();
      if (u.kind === 'spec') { expect(u.group).toBeTruthy(); expect(u.needs).toBeGreaterThan(0); }
      expect(typeof u.text === 'string' ? u.text : u.text(1)).toMatch(/\.$/);
    }
  });

  it('applies the caps after every multiplier, not per upgrade', () => {
    // everything maxed: the result is still inside the caps
    const levels: Levels = {};
    for (const u of UPGRADES) levels[u.id] = u.max;
    const s = computeStats(levels);
    expect(s.laserCooldown).toBeGreaterThanOrEqual(CAPS.laserCooldown);
    expect(s.laserLances).toBeLessThanOrEqual(CAPS.laserLances);
    expect(s.maxPlates).toBeLessThanOrEqual(CAPS.maxPlates);
    expect(s.shieldMax).toBeLessThanOrEqual(CAPS.shieldMax);
    expect(s.laserSpeed * s.laserLife).toBeLessThanOrEqual(CAPS.laserReach + 1e-6);
    expect(s.torpRack).toBeLessThanOrEqual(CAPS.torpRack);
    expect(s.drive).toBeLessThanOrEqual(CAPS.drive);
    expect(s.topSpeed).toBeLessThanOrEqual(CAPS.topSpeed);
  });

  it('opens systems before their upgrades, and specialisations only once a branch is deep enough', () => {
    expect(available(UPGRADE.tp_magazine!, {}, none)).toBe(false);
    expect(available(UPGRADE.tp_magazine!, { tp_bay: 1 }, none)).toBe(true);
    expect(available(UPGRADE.tp_heavy!, { tp_bay: 1 }, none)).toBe(false);
    expect(available(UPGRADE.tp_heavy!, { tp_bay: 1, tp_yield: 2 }, none)).toBe(true);
    // one specialisation per branch
    expect(available(UPGRADE.tp_precision!, { tp_bay: 1, tp_yield: 2, tp_heavy: 1 }, none)).toBe(false);
  });

  it('keeps locked upgrades out until long-term progression opens them', () => {
    const deep = { tp_bay: 1, tp_yield: 2 };
    expect(available(UPGRADE.tp_swarm!, deep, none)).toBe(false);
    expect(available(UPGRADE.tp_swarm!, deep, new Set(['tp_swarm']))).toBe(true);
  });
});

describe('the figures', () => {
  it('shows every number a card changes, before and after', () => {
    expect(upgradeFigures({}, 'ph_capacitors').map((f) => f.label)).toContain('Laser shots/sec');
    const rack = upgradeFigures({ tp_bay: 1, tp_yield: 1, tp_tracking: 1 }, 'tp_heavy').find((f) => f.label === 'Torpedo rack');
    expect(rack?.cost).toBe(true);
    // a system switched on is never a cost
    expect(upgradeFigures({}, 'tp_bay').find((f) => f.label === 'Torpedo rack')).toMatchObject({ from: '—', cost: false });
    expect(upgradeFigures({}, 'ut_tactical').map((f) => f.label)).toContain('All weapon damage');
  });

  it('gives each figure one signed change in its own unit, for the delta chips', () => {
    // a system switched on: from nothing to the new value, so the change is the value
    const rack = upgradeFigures({}, 'tp_bay').find((f) => f.label === 'Torpedo rack')!;
    expect(rack.delta).toBe(`+${rack.to}`);
    // every figure of every upgrade reads as a sign and a number, or the new value where the change rounds to nothing
    for (const u of UPGRADES) {
      for (const f of upgradeFigures({}, u.id)) {
        expect(f.delta, `${u.id}: ${f.label}`).toMatch(/^[+−]\S|^\S/);
        expect(f.delta, `${u.id}: ${f.label}`).not.toMatch(/^[+−]0(\.0)?\D*$/);
      }
    }
    // a gain where lower is better still reads as the number going down
    const reload = upgradeFigures({ tp_bay: 1 }, 'tp_magazine').find((f) => f.label === 'Torpedo reload');
    expect(reload?.delta.startsWith('−'), 'a faster reload is a smaller number').toBe(true);
  });
});

describe('the cards', () => {
  it('show at least one gain a player can feel for every upgrade, with its systems on', () => {
    const systems = { tp_bay: 1, mn_layer: 1, pl_vent: 1, cl_arc: 1, df_shield: 1, ph_emitters: 2 };
    const bare: string[] = [];
    for (const u of UPGRADES) {
      if (u.arcade) continue;
      const have: Record<string, number> = { ...systems };
      delete have[u.id];
      for (const r of u.requires ?? []) have[r.id] = Math.max(have[r.id] ?? 0, r.lv ?? 1);
      const gains = upgradeFigures(have, u.id, false).filter((f) => !f.cost && !f.minor);
      if (!gains.length) bare.push(u.id);
    }
    expect(bare, 'upgrades whose card shows no gain').toEqual([]);
  });
});

describe('what the ship became', () => {
  it('names a build by its deepest branch and its specialisation', () => {
    expect(identity({}).title).toBe('Stock Wayward');
    expect(identity({ tp_bay: 1, tp_yield: 2, tp_swarm: 1 }).title).toBe('Swarm torpedo boat');
    expect(identity({ mn_layer: 1, mn_racks: 2, ph_emitters: 3, ph_capacitors: 1 }).title).toBe('Gunship / minelayer');
  });

  it('counts tags across the build', () => {
    expect(tagWeights({ tp_bay: 1, tp_yield: 2 }).get('torpedo')).toBe(3);
  });
});

describe('the director', () => {
  it('opens calm and climbs smoothly: every pressure rises (or eases off) monotonically', () => {
    let prev = pressure(0);
    expect(prev.eliteChance).toBe(0);
    expect(prev.squadChance).toBe(0);
    for (let t = 10; t <= 900; t += 10) {
      const p = pressure(t);
      expect(p.enemyInterval).toBeLessThanOrEqual(prev.enemyInterval);
      expect(p.enemyCap).toBeGreaterThanOrEqual(prev.enemyCap);
      expect(p.enemyHp).toBeGreaterThanOrEqual(prev.enemyHp);
      expect(p.fieldTarget).toBeGreaterThanOrEqual(prev.fieldTarget);
      expect(p.eliteChance).toBeGreaterThanOrEqual(prev.eliteChance);
      prev = p;
    }
  });

  it('leans on combinations late, not only counts: the ceiling levels off while elites and squads keep coming', () => {
    const at10 = pressure(600), at15 = pressure(900);
    expect(at15.enemyCap).toBe(at10.enemyCap);
    expect(at15.eliteChance).toBeGreaterThan(at10.eliteChance);
    expect(at15.enemyHp).toBeGreaterThan(at10.enemyHp);
  });
});
