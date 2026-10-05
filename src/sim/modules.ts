import { t } from '../i18n';
import { CARDS } from '../content/cards';
import { MODULE_BY_ID, MODULES, SHIP_SYSTEMS, SYSTEM_DEFS, type ModuleDef, type ShipSystem } from '../content/modules';
import type { Prices } from '../content/systems';
import type { Levels } from './build';
import { VARIANTS } from './enemies';
import type { RunStats } from './run';
import type { Stats } from './stats';

// ── the ship's systems ────────────────────────────────────────────────────
// The headless half of content/modules.ts: what each system's resource a
// sortie earned, what a module costs to fit and whether it can be, and what
// the fitted modules do to the ship, the hold, the heat, the port's prices
// and the comms. Fitted modules are marks in the build's levels, under the
// module's id; the resources are the `kit` the Wayward carries.

/** Each system's resource aboard. */
export type Kit = Record<ShipSystem, number>;

export const noKit = (): Kit => ({ guns: 0, rig: 0, signals: 0, contacts: 0 });

export const addKit = (a: Kit, b: Kit): Kit => ({ guns: a.guns + b.guns, rig: a.rig + b.rig, signals: a.signals + b.signals, contacts: a.contacts + b.contacts });

/** Marks of a module fitted. */
export const marksOf = (levels: Levels, id: string): number => (MODULE_BY_ID[id] ? levels[id] ?? 0 : 0);

// ── what a sortie earns ───────────────────────────────────────────────────
// Read off the run's record, so the world needs no bookkeeping of its own
// and the pilot can see what each way of playing earns.

/** Kills to a piece of salvage; rock cut clean to a rig part; ore hauled to a rig part. */
export const KILLS_PER_SALVAGE = 6;
export const CUTS_PER_PART = 1;
export const ORE_PER_PART = 12;
/** A capital ship's wreck, in salvage; one that listened (the Office, the Voice), in signal kit too. */
export const CAPITAL_SALVAGE = 3;
export const LISTENER_KIT = 2;
/** A bluff that came off, in signal kit. */
export const BLUFF_KIT = 2;
/** A job done, in favours. */
export const JOB_FAVOURS = 2;

const LISTENERS = new Set(['office', 'voice']);

const tones = new Map<string, string>();
for (const c of CARDS) for (const ch of c.choices) tones.set(`${c.id}/${ch.id}`, ch.tone);

/** What a sortie earned for each system, from its record. */
export function earned(run: RunStats): Kit {
  const k = noKit();
  k.guns = Math.floor(run.kills / KILLS_PER_SALVAGE) + run.capitals * CAPITAL_SALVAGE;
  k.rig = Math.floor(run.cut / CUTS_PER_PART) + Math.floor(run.ore / ORE_PER_PART);
  k.signals = run.capitalFactions.filter((f) => LISTENERS.has(f)).length * LISTENER_KIT;
  // a listening hull's set, off every Office or Voice wreck
  for (const [v, n] of Object.entries(run.killsByKind)) if (LISTENERS.has(VARIANTS[v]?.faction ?? '')) k.signals += n;
  k.contacts = run.jobsDone * JOB_FAVOURS;
  for (const a of run.cards) {
    if (!a.won) continue;
    const tone = tones.get(`${a.id}/${a.choice}`);
    if (tone === 'bluff') k.signals += BLUFF_KIT;
    else if (tone === 'help' || tone === 'trade') k.contacts++;
  }
  return k;
}

// ── fitting ───────────────────────────────────────────────────────────────

/** The next mark's price, or null once the module is at its last mark. */
export function fitCost(levels: Levels, id: string): { kit: number; chits: number } | null {
  const m = MODULE_BY_ID[id];
  if (!m) return null;
  const mk = marksOf(levels, id);
  if (mk >= m.max) return null;
  return { kit: m.kit[mk]!, chits: m.chits[mk]! };
}

/** Why the next mark cannot be fitted now, in words (empty when it can). */
export function fitNeeds(levels: Levels, kit: Kit, chits: number, id: string): string[] {
  const m = MODULE_BY_ID[id];
  const cost = fitCost(levels, id);
  if (!m || !cost) return [t('Fully fitted')];
  const out: string[] = [];
  if (kit[m.system] < cost.kit) out.push(`${t('Needs')} ${cost.kit} ${t(SYSTEM_DEFS[m.system].resource)}`);
  if (chits < cost.chits) out.push(t('Needs {n} chits', { n: cost.chits }));
  return out;
}

// ── what the fitted modules do ────────────────────────────────────────────

export interface Effects {
  hold: number;
  patch: number;
  /** Multiplier on how fast heat climbs. */
  heat: number;
  sensors: number;
  /** Multiplier on what a port charges (not on what it pays for ore). */
  price: number;
  dockCool: number;
  /** Marks of false echo left behind each jump. */
  echo: number;
  flags: string[];
  /** Upgrade ids the fitted modules count as. */
  counts: string[];
}

function each(levels: Levels, f: (m: ModuleDef, mk: number) => void): void {
  for (const m of MODULES) {
    const mk = levels[m.id] ?? 0;
    if (mk > 0) f(m, Math.min(mk, m.max));
  }
}

export function effects(levels: Levels): Effects {
  const e: Effects = { hold: 0, patch: 0, heat: 1, sensors: 0, price: 1, dockCool: 0, echo: 0, flags: [], counts: [] };
  each(levels, (m, mk) => {
    e.hold += (m.hold ?? 0) * mk;
    e.patch += (m.patch ?? 0) * mk;
    e.heat *= (1 - (m.quiet ?? 0)) ** mk;
    e.sensors += m.sensors ?? 0;
    e.price *= (1 - (m.discount ?? 0)) ** mk;
    e.dockCool += m.dockCool ?? 0;
    e.echo += (m.echo ?? 0) * mk;
    e.flags.push(...(m.flags ?? []));
    e.counts.push(...(m.counts ?? []));
  });
  return e;
}

/** The modules' share of the stat block, applied after the refit rail's and before the caps. */
export function applyModules(s: Stats, levels: Levels): void {
  each(levels, (m, mk) => {
    if (m.stats) for (let i = 1; i <= mk; i++) m.stats(s, i);
  });
}

/** Is this upgrade id fitted, or does a fitted module count as it? */
export function hasFitted(levels: Levels, id: string): boolean {
  if ((levels[id] ?? 0) > 0) return true;
  let yes = false;
  each(levels, (m) => { if (m.counts?.includes(id)) yes = true; });
  return yes;
}

/** The modules that count as an upgrade id, for a card's needs. */
export const countedBy = (id: string): ModuleDef[] => MODULES.filter((m) => m.counts?.includes(id));

/** A port's prices, with what the ship's contacts knock off. Ore pays what it pays. */
export function discounted(p: Prices, levels: Levels): Prices {
  const f = effects(levels).price;
  if (f === 1) return p;
  const off = (v: number) => Math.max(1, Math.round(v * f));
  return { ore: p.ore, krail: off(p.krail), food: off(p.food), plate: off(p.plate), refit: off(p.refit) };
}

/** Marks fitted in each system. */
export function systemMarks(levels: Levels): Kit {
  const k = noKit();
  each(levels, (m, mk) => { k[m.system] += mk; });
  return k;
}

/** The system the ship is built on, if any is ahead of the rest. */
export function mainSystem(levels: Levels): ShipSystem | null {
  const k = systemMarks(levels);
  let best: ShipSystem | null = null, n = 0, tie = false;
  for (const s of SHIP_SYSTEMS) {
    if (k[s] > n) { best = s; n = k[s]; tie = false; } else if (k[s] === n && n > 0) tie = true;
  }
  return tie ? null : best;
}
