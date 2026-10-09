import { MODULES, SHIP_SYSTEMS, type ModuleDef, type ShipSystem } from '../content/modules';
import type { Prices } from '../content/systems';
import type { Levels } from './build';
import type { Stats } from './stats';

// ── the ship's systems ────────────────────────────────────────────────────
// The headless half of content/modules.ts: what the fitted modules do to the
// ship, the hold, the heat, the port's prices and the comms, and how many
// marks each system has. Fitted modules are marks in the build's levels,
// under the module's id; the refit bay (sim/bay.ts) fits them.

/** A count for each of the four systems. */
export type Marks = Record<ShipSystem, number>;

export const noMarks = (): Marks => ({ guns: 0, rig: 0, signals: 0, contacts: 0 });

// ── what the fitted modules do ────────────────────────────────────────────

export interface Effects {
  hold: number;
  patch: number;
  /** Multiplier on how fast heat climbs. */
  heat: number;
  sensors: number;
  /** Multiplier on what a port charges . */
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

/** The modules' share of the stat block, applied after the upgrades' and before the caps. */
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
  return { cyrite: off(p.cyrite), supplies: off(p.supplies), plate: off(p.plate) };
}

/** Marks fitted in each system. */
export function systemMarks(levels: Levels): Marks {
  const k = noMarks();
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
