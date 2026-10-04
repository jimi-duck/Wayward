import { describe, expect, it } from 'vitest';
import { UPGRADE, UPGRADES } from '../src/content/upgrades';
import type { Levels } from '../src/sim/build';
import { makeOffer, type OfferKind } from '../src/sim/offers';
import { Rng } from '../src/sim/rng';
import type { TechFaction } from '../src/content/upgrades';

const none = new Set<string>();
const all = new Set(UPGRADES.map((u) => u.id));
const offer = (levels: Levels, seed = 1, presented = new Set<string>(), o: { unlocked?: ReadonlySet<string>; techs?: ReadonlySet<string>; kind?: OfferKind; faction?: TechFaction } = {}) =>
  makeOffer({ levels, unlocked: o.unlocked ?? none, techs: o.techs ?? none, presented, refit: 1, kind: o.kind, faction: o.faction }, new Rng(seed));

describe('the refit cards', () => {
  it('always deals three different cards', () => {
    for (let seed = 1; seed < 40; seed++) {
      const o = offer({ ph_emitters: 1 }, seed);
      expect(o.cards.length).toBe(3);
      expect(new Set(o.cards.map((c) => c.id)).size).toBe(3);
    }
  });

  it('puts a system on the table while the ship has fewer than two', () => {
    for (let seed = 1; seed < 40; seed++) expect(offer({}, seed).cards.some((c) => UPGRADE[c.id]!.kind === 'system')).toBe(true);
  });

  it('leans toward the build: a torpedo ship sees torpedo cards far more often than a laser ship does', () => {
    const count = (levels: Levels) => {
      let n = 0;
      for (let seed = 1; seed <= 300; seed++) n += offer(levels, seed, new Set(['torpedo', 'laser', 'defence', 'mine', 'mobility'])).cards.filter((c) => UPGRADE[c.id]!.tags.includes('torpedo')).length;
      return n;
    };
    const torp = count({ tp_bay: 1, tp_yield: 2, tp_magazine: 1, mn_layer: 1 });
    const laser = count({ tp_bay: 1, ph_emitters: 3, ph_capacitors: 2, mn_layer: 1 });
    expect(torp).toBeGreaterThan(laser * 1.5);
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
    expect(first.cards.filter((c) => c.tag === 'spec').map((c) => c.id).sort()).toEqual(['tp_heavy', 'tp_precision']);
    // the swarm is locked here, so an ordinary card fills the third place
    expect(first.cards.length).toBe(3);
    expect(offer(deep, 4, presented).kind).toBe('refit');
    expect(offer(deep, 5, new Set(), { unlocked: all }).cards.map((c) => c.id)).toContain('tp_swarm');
  });

  it('never deals a faction’s tech before her capital ship is destroyed; salvage leads with it', () => {
    for (let seed = 1; seed < 60; seed++) expect(offer({ ph_emitters: 2 }, seed).cards.some((c) => UPGRADE[c.id]!.kind === 'tech')).toBe(false);
    const techs = new Set(['gutter']);
    const salvage = offer({ ph_emitters: 2 }, 7, new Set(), { techs, kind: 'salvage', faction: 'gutter' });
    expect(salvage.kind).toBe('salvage');
    expect(salvage.cards[0]).toMatchObject({ id: 'tech_gutter', tag: 'tech' });
    expect(salvage.cards.length).toBe(3);
    // once fitted, her tech is not dealt again
    const again = offer({ ph_emitters: 2, tech_gutter: 1 }, 7, new Set(), { techs, kind: 'salvage', faction: 'gutter' });
    expect(again.cards.map((c) => c.id)).not.toContain('tech_gutter');
  });

  it('says what each card is: a new system, the next level of an upgrade', () => {
    const levels: Levels = { ph_emitters: 2 };
    for (let seed = 1; seed < 30; seed++) {
      for (const c of offer(levels, seed).cards) {
        expect(c.level).toBe((levels[c.id] ?? 0) + 1);
        if (c.id === 'ph_emitters' && c.tag !== 'wild') expect(c.tag).toBe('up');
        if (UPGRADE[c.id]!.kind === 'system' && c.tag !== 'wild') expect(c.tag).toBe('new');
      }
    }
  });
});
