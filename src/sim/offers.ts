import { UPGRADES, type TechFaction, type UpgradeDef } from '../content/upgrades';
import { available, tagWeights, type Levels } from './build';
import type { Rng } from './rng';

// ── the refit: three cards ────────────────────────────────────────────────
// A full rail pauses the run on three cards; you take one and fly on. That
// is the whole decision, made in a few seconds, so the run keeps its pace.
// The cards are meant to feel like help, not a slot machine:
//  · the first two lean toward what the build already is (tag affinity);
//  · the third is usually a wildcard from a direction the build has not
//    taken, so there is always a way to change course;
//  · while the ship has fewer than two systems (torpedoes, mines, plasma,
//    the hull arc, shields), one card is always a system: the early refits
//    are the ones that change how the ship plays;
//  · when a branch is first deep enough to specialise, that refit is the
//    specialisation, once;
//  · battle salvage (a capital ship destroyed) leads with her faction's
//    tech, while it is new.

export type OfferKind = 'refit' | 'spec' | 'salvage';
export type CardTag = 'new' | 'up' | 'spec' | 'synergy' | 'tech' | 'wild';

export interface Card {
  /** The upgrade this card adds a level of. */
  id: string;
  /** The level it takes the upgrade to. */
  level: number;
  tag: CardTag;
}

export interface Offer {
  kind: OfferKind;
  /** The refit number (salvage keeps the current one). */
  refit: number;
  cards: Card[];
}

export interface OfferContext {
  levels: Levels;
  unlocked: ReadonlySet<string>;
  /** Factions whose capital ship has been destroyed this run. */
  techs: ReadonlySet<string>;
  /** Specialisation groups already presented (each gets its moment once). */
  presented: Set<string>;
  refit: number;
  kind?: OfferKind;
  /** For salvage: the faction just beaten. */
  faction?: TechFaction;
}

const SPEC_GROUPS = [...new Set(UPGRADES.filter((u) => u.group).map((u) => u.group!))];

/** Can this upgrade be a card now? Everything `available` says, and tech only once its faction is salvaged. */
function offerable(u: UpgradeDef, levels: Levels, unlocked: ReadonlySet<string>, techs: ReadonlySet<string>): boolean {
  if (u.tech && !techs.has(u.tech)) return false;
  return available(u, levels, unlocked);
}

function card(u: UpgradeDef, levels: Levels, tag?: CardTag): Card {
  const lv = levels[u.id] ?? 0;
  const t: CardTag = tag ?? (u.kind === 'tech' ? 'tech' : u.kind === 'synergy' ? 'synergy' : u.kind === 'spec' ? 'spec' : u.kind === 'system' ? 'new' : 'up');
  return { id: u.id, level: lv + 1, tag: t };
}

export function makeOffer(ctx: OfferContext, rng: Rng): Offer {
  const { levels, unlocked, techs } = ctx;
  const pool = UPGRADES.filter((u) => offerable(u, levels, unlocked, techs));
  const kind = ctx.kind ?? 'refit';

  // battle salvage: her tech first, while it is new
  const lead: UpgradeDef[] = [];
  if (kind === 'salvage' && ctx.faction) {
    const tech = pool.find((u) => u.tech === ctx.faction);
    if (tech) { lead.push(tech); pool.splice(pool.indexOf(tech), 1); }
  }

  // a specialisation moment
  if (kind !== 'salvage') {
    for (const g of SPEC_GROUPS) {
      if (ctx.presented.has(g)) continue;
      const specs = pool.filter((u) => u.group === g);
      if (specs.length === 0) continue;
      ctx.presented.add(g);
      const cards = specs.slice(0, 3).map((u) => card(u, levels, 'spec'));
      // a group with only two open specialisations gets one ordinary card alongside
      const rest = pool.filter((u) => !u.group);
      while (cards.length < 3 && rest.length) cards.push(card(takeWeighted(rest, (u) => weight(u, levels), rng), levels));
      return { kind: 'spec', refit: ctx.refit, cards };
    }
  }

  const ordinary = pool.filter((u) => !u.group);
  const affinity = tagWeights(levels);
  const aff = (u: UpgradeDef) => u.tags.reduce((a, t) => a + (affinity.get(t) ?? 0), 0);
  const chosen: Array<{ u: UpgradeDef; wild: boolean }> = lead.map((u) => ({ u, wild: false }));
  const left = [...ordinary];

  const systems = UPGRADES.filter((u) => u.kind === 'system' && (levels[u.id] ?? 0) > 0).length;
  if (systems < 2 && chosen.length < 3) {
    const sys = left.filter((u) => u.kind === 'system');
    if (sys.length) chosen.push({ u: takeWeighted(sys, (u) => u.weight ?? 1, rng, left), wild: false });
  }
  while (chosen.length < 2 && left.length) chosen.push({ u: takeWeighted(left, (u) => weight(u, levels) * (1 + 0.45 * aff(u)), rng), wild: false });
  if (left.length && chosen.length < 3) {
    const fresh = left.filter((u) => aff(u) === 0);
    const owned = Object.values(levels).some((v) => v > 0);
    if (owned && fresh.length && rng.next() < 0.7) chosen.push({ u: takeWeighted(fresh, (u) => weight(u, levels), rng, left), wild: true });
    else chosen.push({ u: takeWeighted(left, (u) => weight(u, levels) * (1 + 0.45 * aff(u)), rng), wild: false });
  }
  // shuffle, so the wildcard is not always on the right (salvage keeps her tech first)
  const from = lead.length;
  for (let i = chosen.length - 1; i > from; i--) {
    const j = from + rng.int(i - from + 1), tmp = chosen[i]!;
    chosen[i] = chosen[j]!;
    chosen[j] = tmp;
  }
  return { kind, refit: ctx.refit, cards: chosen.map(({ u, wild }) => card(u, levels, wild ? 'wild' : undefined)) };
}

function weight(u: UpgradeDef, levels: Levels): number {
  let w = u.weight ?? 1;
  if (u.kind === 'synergy') w *= 1.8;
  if (u.kind === 'tech') w *= 1.6;
  // a stat card already well up its ladder comes round a little less
  w *= 1 - 0.08 * (levels[u.id] ?? 0);
  return Math.max(0.05, w);
}

/** Take one from `list` by weight, removing it (and from `also`, when given). */
function takeWeighted<T>(list: T[], w: (t: T) => number, rng: Rng, also?: T[]): T {
  let total = 0;
  for (const t of list) total += w(t);
  let roll = rng.next() * total;
  let pick: T = list[list.length - 1] as T;
  for (const t of list) { roll -= w(t); if (roll <= 0) { pick = t; break; } }
  list.splice(list.indexOf(pick), 1);
  if (also && also !== list) { const i = also.indexOf(pick); if (i >= 0) also.splice(i, 1); }
  return pick;
}

