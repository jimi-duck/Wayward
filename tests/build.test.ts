import { describe, expect, it } from 'vitest';
import { UPGRADE, UPGRADES } from '../src/content/upgrades';
import { available, card, computeStats, identity, makeOffer, tagWeights, type Levels } from '../src/sim/build';
import { pressure } from '../src/sim/director';
import { Rng } from '../src/sim/rng';
import { BASE, CAPS } from '../src/sim/stats';

const none = new Set<string>();
const all = new Set(UPGRADES.map((u) => u.id));
const offer = (levels: Levels, seed = 1, presented = new Set<string>(), unlocked: ReadonlySet<string> = none) =>
  makeOffer({ levels, unlocked, presented, refit: 1 }, new Rng(seed));

describe('the refit tree', () => {
  it('starts from the stock ship: twin phasers, three plates, no systems', () => {
    const s = computeStats({});
    expect(s).toEqual(BASE);
    expect(s.torpedoes || s.mines || s.plasma || s.arc).toBe(false);
    expect(s.shieldMax).toBe(0);
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
    expect(s.phaserCooldown).toBeGreaterThanOrEqual(CAPS.phaserCooldown);
    expect(s.phaserLances).toBeLessThanOrEqual(CAPS.phaserLances);
    expect(s.maxPlates).toBeLessThanOrEqual(CAPS.maxPlates);
    expect(s.shieldMax).toBeLessThanOrEqual(CAPS.shieldMax);
    expect(s.phaserSpeed * s.phaserLife).toBeLessThanOrEqual(CAPS.phaserReach + 1e-6);
    expect(s.torpRack).toBeLessThanOrEqual(CAPS.torpRack);
    expect(s.thrust).toBeLessThanOrEqual(CAPS.thrust);
  });

  it('opens systems before their upgrades, and specialisations only once a branch is deep enough', () => {
    expect(available(UPGRADE.tp_magazine!, {}, none)).toBe(false);
    expect(available(UPGRADE.tp_magazine!, { tp_bay: 1 }, none)).toBe(true);
    expect(available(UPGRADE.tp_heavy!, { tp_bay: 1 }, none)).toBe(false);
    expect(available(UPGRADE.tp_heavy!, { tp_bay: 1, tp_yield: 2 }, none)).toBe(true);
    // one specialisation per branch
    expect(available(UPGRADE.tp_precision!, { tp_bay: 1, tp_yield: 2, tp_heavy: 1 }, none)).toBe(false);
  });

  it('keeps locked cards out until long-term progression opens them', () => {
    const deep = { tp_bay: 1, tp_yield: 2 };
    expect(available(UPGRADE.tp_swarm!, deep, none)).toBe(false);
    expect(available(UPGRADE.tp_swarm!, deep, new Set(['tp_swarm']))).toBe(true);
  });
});

describe('the offer', () => {
  it('always offers three different cards', () => {
    for (let seed = 1; seed < 40; seed++) {
      const o = offer({ ph_emitters: 1 }, seed);
      expect(o.cards.length).toBe(3);
      expect(new Set(o.cards.map((c) => c.id)).size).toBe(3);
    }
  });

  it('puts a system on the table while the ship has fewer than two', () => {
    for (let seed = 1; seed < 40; seed++) expect(offer({}, seed).cards.some((c) => c.kind === 'system')).toBe(true);
  });

  it('leans toward the build: a torpedo ship sees torpedo cards far more often than a phaser ship does', () => {
    const count = (levels: Levels) => {
      let n = 0;
      for (let seed = 1; seed <= 300; seed++) n += offer(levels, seed, new Set(['torpedo', 'phaser', 'defence', 'mine', 'mobility'])).cards.filter((c) => UPGRADE[c.id]!.tags.includes('torpedo')).length;
      return n;
    };
    const torp = count({ tp_bay: 1, tp_yield: 2, tp_magazine: 1, mn_layer: 1 });
    const phaser = count({ tp_bay: 1, ph_emitters: 3, ph_capacitors: 2, mn_layer: 1 });
    expect(torp).toBeGreaterThan(phaser * 1.5);
  });

  it('usually leaves one card for a new direction', () => {
    let wild = 0;
    for (let seed = 1; seed <= 200; seed++) if (offer({ tp_bay: 1, tp_yield: 2, mn_layer: 1 }, seed, new Set(['torpedo'])).cards.some((c) => c.tag === 'wild')) wild++;
    expect(wild).toBeGreaterThan(100);
  });

  it('turns a refit into the specialisation, once, when a branch is deep enough', () => {
    const presented = new Set<string>();
    const deep = { tp_bay: 1, tp_yield: 1, tp_tracking: 1 };
    const first = offer(deep, 3, presented);
    expect(first.kind).toBe('spec');
    expect(first.branch).toBe('torpedo');
    expect(first.cards.filter((c) => c.kind === 'spec').map((c) => c.id).sort()).toEqual(['tp_heavy', 'tp_precision']);
    // the swarm is locked here, so an ordinary card fills the third place
    expect(first.cards.length).toBe(3);
    expect(offer(deep, 4, presented).kind).toBe('refit');
    expect(offer(deep, 5, new Set(), all).cards.map((c) => c.id)).toContain('tp_swarm');
  });

  it('shows every number a card changes, before and after', () => {
    const c = card(UPGRADE.ph_capacitors!, {});
    expect(c.figs.map((f) => f.label)).toContain('Phaser shots/sec');
    const heavy = card(UPGRADE.tp_heavy!, { tp_bay: 1, tp_yield: 1, tp_tracking: 1 });
    const rack = heavy.figs.find((f) => f.label === 'Torpedo rack');
    expect(rack?.cost).toBe(true);
    const bay = card(UPGRADE.tp_bay!, {});
    expect(bay.figs.find((f) => f.label === 'Torpedo rack')).toMatchObject({ from: '—', cost: false });
  });
});

describe('what the ship became', () => {
  it('names a build by its deepest branch and its specialisation', () => {
    expect(identity({}).title).toBe('Stock Defiant');
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
