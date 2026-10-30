import { cost } from './bay';
import { upgradeFigures, type Fig, type Levels } from './build';
import { budgets, overRatings, weightFuel, WEIGHT_FUEL } from './budgets';

// ── the whole trade, before the button ────────────────────────────────────
// What buying one more level of a part does, in one place: what it gains, what
// the ship loses in handling and cooldown, what each jump costs in extra fluid
// and which rating it pushes past. Plain data, no sentences: the bay turns it
// into chips. The numbers all come from sim/build.ts and sim/budgets.ts.

export interface TradeEntry {
  /** The figure's name (content key; the UI puts it through t()). */
  label: string;
  /** The change as a share of what it was (0.12 is +12%), or null where the figure comes from nothing. */
  change: number | null;
  /** The change in the figure's own unit, signed. */
  delta: string;
  /** Whether the ship is better for it. */
  better: boolean;
}

export interface Tradeoff {
  /** What the part gains: damage, rate, reach, shield and the rest. */
  gains: TradeEntry[];
  /** Acceleration, top speed and turn rate: the upgrade's own and the loads', net. */
  handling: TradeEntry[];
  /** How often the guns and the roll are ready: net. */
  cooldown: TradeEntry[];
  /** Cyrite of jump fluid each jump costs more (or less) after this level; 0 in the Arcade, and held at `WEIGHT_FUEL.max`. */
  jumpFluid: number;
  /** The ratings this level runs past (or deeper past). */
  overBudget: { mass: boolean; heat: boolean; power: boolean };
  /** Cyrite, as the button says. */
  price: number;
}

const HANDLING = new Set(['Acceleration', 'Top speed', 'Turn rate']);
const COOLDOWN = new Set(['Roll every', 'Laser shots/sec']);

const entry = (f: Fig): TradeEntry => ({ label: f.label, change: f.change, delta: f.delta, better: !f.cost });

/** What one more level of `id` changes, from the build `levels`. Changes too small to feel are left out. */
export function tradeoff(levels: Levels, id: string, arcade: boolean): Tradeoff {
  const lv = levels[id] ?? 0, next = { ...levels, [id]: lv + 1 };
  const figs = upgradeFigures(levels, id, arcade).filter((f) => !f.minor);
  const gains: TradeEntry[] = [], handling: TradeEntry[] = [], cooldown: TradeEntry[] = [];
  for (const f of figs) {
    if (f.label.endsWith(' room')) continue; // the balance parts' room is the bars' business
    (HANDLING.has(f.label) ? handling : COOLDOWN.has(f.label) ? cooldown : gains).push(entry(f));
  }
  const was = budgets(levels), now = budgets(next), over0 = overRatings(levels), over1 = overRatings(next);
  const over = (k: 'mass' | 'heat' | 'power') => over1[k] && (!over0[k] || now.use[k] > was.use[k]);
  return {
    gains, handling, cooldown,
    jumpFluid: arcade ? 0 : Math.min(WEIGHT_FUEL.max, weightFuel(next)) - weightFuel(levels),
    overBudget: { mass: over('mass'), heat: over('heat'), power: over('power') },
    price: cost(id, lv + 1, arcade, levels),
  };
}
