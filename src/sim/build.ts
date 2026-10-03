import { BRANCHES, UPGRADE, UPGRADES, upgradeText, type Branch, type UpgradeDef, type UpgradeKind } from '../content/upgrades';
import type { Rng } from './rng';
import { flightHull, capStats, newStats, type Stats } from './stats';
import { topSpeed, turnPerStep } from './ship';
import { HZ, PX } from './tuning';

// ── the build ─────────────────────────────────────────────────────────────
// What the player has made of the ship: a level per upgrade id. Everything
// else (the stat block, the cards on offer, the name the ship ends up with)
// is worked out from it, so a build can be saved, compared or replayed.

export type Levels = Record<string, number>;

/** The stat block for a build: base, every owned level in tree order, then the caps. */
export function computeStats(levels: Levels): Stats {
  const s = newStats();
  for (const u of UPGRADES) {
    const lv = levels[u.id] ?? 0;
    for (let i = 1; i <= lv; i++) u.apply(s, i);
  }
  return capStats(s);
}

/** Levels owned in a branch. */
export function branchLevels(levels: Levels, branch: Branch): number {
  let n = 0;
  for (const u of UPGRADES) if (u.branch === branch) n += levels[u.id] ?? 0;
  return n;
}

/** How much of the build carries each tag: the sum of owned levels of upgrades with it. */
export function tagWeights(levels: Levels): Map<string, number> {
  const w = new Map<string, number>();
  for (const u of UPGRADES) {
    const lv = levels[u.id] ?? 0;
    if (!lv) continue;
    for (const t of u.tags) if (t !== 'unlock' && t !== 'once') w.set(t, (w.get(t) ?? 0) + lv);
  }
  return w;
}

/** Specialisation groups already settled. */
function takenGroups(levels: Levels): Set<string> {
  const g = new Set<string>();
  for (const u of UPGRADES) if (u.group && (levels[u.id] ?? 0) > 0) g.add(u.group);
  return g;
}

/** Can this upgrade be offered now? */
export function available(u: UpgradeDef, levels: Levels, unlocked: ReadonlySet<string>): boolean {
  if ((levels[u.id] ?? 0) >= u.max) return false;
  if (u.locked && !unlocked.has(u.id)) return false;
  if (u.requires && !u.requires.every((r) => (levels[r.id] ?? 0) >= (r.lv ?? 1))) return false;
  if (u.group) {
    if (takenGroups(levels).has(u.group)) return false;
    if (branchLevels(levels, u.branch) < (u.needs ?? 0)) return false;
  }
  return true;
}

export type CardTag = 'new' | 'up' | 'spec' | 'synergy' | 'wild';

export interface Card {
  id: string;
  /** The level this card takes the upgrade to. */
  level: number;
  kind: UpgradeKind;
  tag: CardTag;
  name: string;
  text: string;
  note: string;
  branch: Branch;
  /** "Label  before → after" lines for every number the card changes. */
  figs: Fig[];
}

export interface Fig { label: string; from: string; to: string; cost: boolean; }

export type OfferKind = 'refit' | 'spec' | 'salvage';

export interface Offer {
  kind: OfferKind;
  /** The refit number (salvage keeps the current one). */
  refit: number;
  cards: Card[];
  /** For a specialisation refit: the branch being specialised. */
  branch?: Branch;
}

export interface OfferContext {
  levels: Levels;
  unlocked: ReadonlySet<string>;
  /** Specialisation groups already presented (each gets its moment once). */
  presented: Set<string>;
  refit: number;
  kind?: OfferKind;
}

const SPEC_GROUPS = [...new Set(UPGRADES.filter((u) => u.group).map((u) => u.group!))];

/**
 * Roll three cards for the build. The panel is meant to feel like help, not a
 * slot machine:
 *  · the first two lean toward what the build already is (tag affinity);
 *  · the third is usually a wildcard from a direction the build has not taken,
 *    so there is always a way to change course;
 *  · while the ship has fewer than two systems, a system card is always there;
 *  · when a branch is deep enough to specialise, that refit is the
 *    specialisation, once.
 */
export function makeOffer(ctx: OfferContext, rng: Rng): Offer {
  const { levels, unlocked } = ctx;
  const pool = UPGRADES.filter((u) => available(u, levels, unlocked));

  // a specialisation moment
  if (ctx.kind !== 'salvage') {
    for (const g of SPEC_GROUPS) {
      if (ctx.presented.has(g)) continue;
      const specs = pool.filter((u) => u.group === g);
      if (specs.length === 0) continue;
      ctx.presented.add(g);
      const cards = specs.map((u) => card(u, levels, 'spec'));
      // a group with only two open specs gets one ordinary card alongside
      const rest = pool.filter((u) => !u.group);
      while (cards.length < 3 && rest.length) cards.push(card(takeWeighted(rest, (u) => weight(u, levels), rng), levels));
      return { kind: 'spec', refit: ctx.refit, cards, branch: specs[0]!.branch };
    }
  }

  const ordinary = pool.filter((u) => !u.group);
  const affinity = tagWeights(levels);
  const aff = (u: UpgradeDef) => u.tags.reduce((a, t) => a + (affinity.get(t) ?? 0), 0);
  const chosen: Array<{ u: UpgradeDef; wild: boolean }> = [];
  const left = [...ordinary];

  const systems = UPGRADES.filter((u) => u.kind === 'system' && (levels[u.id] ?? 0) > 0).length;
  if (systems < 2) {
    const sys = left.filter((u) => u.kind === 'system');
    if (sys.length) chosen.push({ u: takeWeighted(sys, (u) => u.weight ?? 1, rng, left), wild: false });
  }
  while (chosen.length < 2 && left.length) chosen.push({ u: takeWeighted(left, (u) => weight(u, levels) * (1 + 0.45 * aff(u)), rng), wild: false });
  if (left.length) {
    const fresh = left.filter((u) => aff(u) === 0);
    const owned = Object.values(levels).some((v) => v > 0);
    if (owned && fresh.length && rng.next() < 0.7) chosen.push({ u: takeWeighted(fresh, (u) => weight(u, levels), rng, left), wild: true });
    else chosen.push({ u: takeWeighted(left, (u) => weight(u, levels) * (1 + 0.45 * aff(u)), rng), wild: false });
  }
  // shuffle, so the wildcard is not always on the right
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = rng.int(i + 1), tmp = chosen[i]!;
    chosen[i] = chosen[j]!;
    chosen[j] = tmp;
  }
  return { kind: ctx.kind ?? 'refit', refit: ctx.refit, cards: chosen.map(({ u, wild }) => card(u, levels, wild ? 'wild' : undefined)) };
}

function weight(u: UpgradeDef, levels: Levels): number {
  let w = u.weight ?? 1;
  if (u.kind === 'synergy') w *= 1.8;
  // a stat card already well up its ladder comes round a little less
  w *= 1 - 0.08 * (levels[u.id] ?? 0);
  return Math.max(0.05, w);
}

/** Remove and return one item, by weight. `also` is another list to remove it from. */
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

export function card(u: UpgradeDef, levels: Levels, force?: CardTag): Card {
  const lv = (levels[u.id] ?? 0) + 1;
  const tag: CardTag = force ?? (u.kind === 'synergy' ? 'synergy' : u.kind === 'spec' ? 'spec' : lv === 1 ? 'new' : 'up');
  const before = computeStats(levels), after = computeStats({ ...levels, [u.id]: lv });
  return {
    id: u.id, level: lv, kind: u.kind, tag, name: u.name, text: upgradeText(u, lv), note: u.note ?? '', branch: u.branch,
    figs: figures(before, after),
  };
}

// ── figures ───────────────────────────────────────────────────────────────
// Every number a card can change, how to read it and which way is better.
// A card shows the rows whose value it changes, as "before → after".

interface FigDef { label: string; get: (s: Stats) => number; fmt: (v: number) => string; lower?: boolean; }

const f1 = (v: number) => v.toFixed(1);
const f0 = (v: number) => String(Math.round(v));
const sec = (v: number) => `${v.toFixed(1)}s`;
const m = (v: number) => `${Math.round(v / PX)} m`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const off = (on: boolean, v: number) => (on ? v : 0);
const dash = (fmt: (v: number) => string) => (v: number) => (v === 0 ? '—' : fmt(v));

export const FIGURES: FigDef[] = [
  { label: 'Lance damage', get: (s) => s.phaserDamage, fmt: f1 },
  { label: 'Phaser shots/sec', get: (s) => 1 / s.phaserCooldown, fmt: f1 },
  { label: 'Lances per shot', get: (s) => s.phaserLances, fmt: f0 },
  { label: 'Lance reach', get: (s) => s.phaserSpeed * s.phaserLife, fmt: m },
  { label: 'Targets pierced', get: (s) => s.phaserPierce, fmt: f0 },
  { label: 'Phaser bank', get: (s) => s.bankMax, fmt: f0 },
  { label: 'Bank refill/sec', get: (s) => s.bankRefill, fmt: f0 },
  { label: 'Energy per shot', get: (s) => s.bankShot, fmt: f1, lower: true },
  { label: 'Torpedo rack', get: (s) => off(s.torpedoes, s.torpRack), fmt: dash(f0) },
  { label: 'Torpedo reload', get: (s) => off(s.torpedoes, s.torpReload), fmt: dash(sec), lower: true },
  { label: 'Torpedoes per press', get: (s) => off(s.torpedoes, s.torpSalvo), fmt: dash(f0) },
  { label: 'Blast damage', get: (s) => off(s.torpedoes, s.torpDamage), fmt: dash(f1) },
  { label: 'Blast radius', get: (s) => off(s.torpedoes, s.torpBlast), fmt: dash(m) },
  { label: 'Torpedo turn', get: (s) => off(s.torpedoes, (s.torpTurn * 180) / Math.PI), fmt: dash((v) => `${Math.round(v)}°/s`) },
  { label: 'Seeker reach', get: (s) => off(s.torpedoes, s.torpSeek), fmt: dash(m) },
  { label: 'Bomblets', get: (s) => s.torpCluster, fmt: f0 },
  { label: 'Mine damage', get: (s) => off(s.mines, s.mineDamage), fmt: dash(f1) },
  { label: 'Mine blast', get: (s) => off(s.mines, s.mineBlast), fmt: dash(m) },
  { label: 'Mine every', get: (s) => off(s.mines, s.mineInterval), fmt: dash(sec), lower: true },
  { label: 'Mines out', get: (s) => off(s.mines, s.mineMax), fmt: dash(f0) },
  { label: 'Mine trigger', get: (s) => off(s.mines, s.mineTrigger), fmt: dash(m) },
  { label: 'Mine life', get: (s) => off(s.mines, s.mineLife), fmt: dash(sec) },
  { label: 'Plasma burn/sec', get: (s) => off(s.plasma, s.plasmaDps), fmt: dash(f1) },
  { label: 'Trail lasts', get: (s) => off(s.plasma, s.plasmaLife), fmt: dash(sec) },
  { label: 'Afterburn/sec', get: (s) => s.plasmaBurn, fmt: dash(f1) },
  { label: 'Arc damage', get: (s) => off(s.arc, s.arcDamage), fmt: dash(f1) },
  { label: 'Arc every', get: (s) => off(s.arc, s.arcInterval), fmt: dash(sec), lower: true },
  { label: 'Arc targets', get: (s) => off(s.arc, s.arcTargets), fmt: dash(f0) },
  { label: 'Arc reach', get: (s) => off(s.arc, s.arcRange), fmt: dash(m) },
  { label: 'Arc jumps', get: (s) => s.arcJumps, fmt: f0 },
  { label: 'Ram damage', get: (s) => s.ramDamage, fmt: f0 },
  { label: 'Top speed', get: (s) => topSpeed(flightHull(s)), fmt: (v) => `${Math.round(v / PX)} m/s` },
  { label: 'Turn rate', get: (s) => (turnPerStep(flightHull(s)) * HZ * 180) / Math.PI, fmt: (v) => `${Math.round(v)}°/s` },
  { label: 'Roll every', get: (s) => s.rollCooldown, fmt: sec, lower: true },
  { label: 'Roll cover', get: (s) => s.rollIframes, fmt: sec },
  { label: 'Hull plates', get: (s) => s.maxPlates, fmt: f0 },
  { label: 'Shield charges', get: (s) => s.shieldMax, fmt: dash(f0) },
  { label: 'Shield recharge', get: (s) => off(s.shieldMax > 0, s.shieldRecharge), fmt: dash(sec), lower: true },
  { label: 'Grace after a hit', get: (s) => s.grace, fmt: sec },
  { label: 'Tractor reach', get: (s) => s.tractor, fmt: m },
  { label: 'Dilithium yield', get: (s) => s.xpMult, fmt: pct },
  { label: 'Overcharge gain', get: (s) => s.ocGain, fmt: pct },
  { label: 'Release radius', get: (s) => s.ocRadius, fmt: m },
  { label: 'Release damage', get: (s) => s.ocDamage, fmt: f0 },
  { label: 'Overload', get: (s) => s.ocOverload, fmt: sec },
];

export function figures(before: Stats, after: Stats): Fig[] {
  const out: Fig[] = [];
  for (const d of FIGURES) {
    const a = d.get(before), b = d.get(after);
    const fa = d.fmt(a), fb = d.fmt(b);
    if (fa === fb) continue;
    out.push({ label: d.label, from: fa, to: fb, cost: d.lower ? b > a : b < a });
  }
  return out;
}

// ── what the ship became ──────────────────────────────────────────────────

export interface Identity {
  /** "Swarm torpedo boat", "Heavy-lance gunship / minelayer". */
  title: string;
  /** Branches by levels owned, deepest first (synergies left out). */
  branches: Array<{ branch: Branch; levels: number }>;
  /** Specialisations taken, by name. */
  specs: string[];
}

const SPEC_PREFIX: Record<string, string> = {
  ph_cone: 'Cone', ph_lance: 'Heavy-lance', ph_array: 'Array', tp_heavy: 'Heavy', tp_swarm: 'Swarm', tp_precision: 'Precision',
  mn_field: 'Minefield', mn_chain: 'Chain-reaction', mn_gravity: 'Graviton', pl_ignite: 'Incendiary', pl_wake: 'Afterburner',
  cl_storm: 'Storm', cl_juggernaut: 'Juggernaut', mo_drift: 'Drift', mo_evasion: 'Evasive', df_fortress: 'Fortress',
  df_reactive: 'Reactive', df_regenerative: 'Regenerative', oc_nova: 'Nova', oc_overload: 'Overload', oc_phase: 'Phase',
};

export function identity(levels: Levels): Identity {
  const branches = (Object.keys(BRANCHES) as Branch[])
    .filter((b) => b !== 'synergy')
    .map((branch) => ({ branch, levels: branchLevels(levels, branch) }))
    .filter((b) => b.levels > 0)
    .sort((a, b) => b.levels - a.levels);
  const specs = UPGRADES.filter((u) => u.kind === 'spec' && (levels[u.id] ?? 0) > 0);
  if (!branches.length) return { title: 'Stock Defiant', branches, specs: [] };
  const top = branches[0]!;
  const spec = specs.find((u) => u.branch === top.branch);
  let title = BRANCHES[top.branch].identity;
  if (spec) title = `${SPEC_PREFIX[spec.id] ?? spec.name} ${title.toLowerCase()}`;
  const second = branches[1];
  if (second && second.levels >= top.levels * 0.6 && second.levels >= 3) title += ` / ${BRANCHES[second.branch].identity.toLowerCase()}`;
  return { title, branches, specs: specs.map((u) => u.name) };
}

export { UPGRADE };
