import { NODE } from '../content/web';
import { BRANCHES, UPGRADE, type Branch } from '../content/upgrades';
import { branchLevels, type Levels } from './build';
import { budgets } from './bay';

// ── the ship's computer, recommending ─────────────────────────────────────
// Why a module is worth fitting now, from the run's own numbers: a rating
// near its limit and a module that raises it, worn plates and a module that
// guards them, fights that pressed close and a module for close work, a
// system you are already deepest in. A few words, or null. English here;
// the UI puts them through t() with the vars.

export interface AdviceCtx {
  levels: Levels;
  plates: number;
  maxPlates: number;
  /** Hostiles that pressed close lately (World.closePressed). */
  pressure: number;
}

export interface Advice {
  text: string;
  vars?: Record<string, string | number>;
  /** How firm: 0 a rating at its limit, 1 worn plates, 2 pressure, 3 a leaning. The bay shows the firmest few. */
  rank: number;
}

const CLOSE_WORK = new Set<Branch>(['close', 'defence', 'mine']);
const GUARD = new Set<Branch>(['defence']);

/** The reason, or null. Rules in order; the first that fits wins. */
export function reasonOf(id: string, ctx: AdviceCtx): Advice | null {
  const node = NODE[id], u = UPGRADE[id];
  const { use, cap } = budgets(ctx.levels);
  if (node?.gives?.power && use.power >= cap.power - 1) return { text: 'Top speed slipping', rank: 0 };
  if (node?.gives?.heat && use.heat / cap.heat >= 0.8) return { text: 'Cooldown creeping up', rank: 0 };
  if (node?.gives?.mass && use.mass / cap.mass >= 0.8) return { text: 'Handling getting heavy', rank: 0 };
  if (!u) return null;
  if (ctx.plates < ctx.maxPlates && ctx.plates <= Math.ceil(ctx.maxPlates / 2) && GUARD.has(u.branch)) return { text: 'Plates down to {n}/{max}', vars: { n: ctx.plates, max: ctx.maxPlates }, rank: 1 };
  if (ctx.pressure >= 3 && CLOSE_WORK.has(u.branch)) return { text: 'Hostiles pressing close', rank: 2 };
  // the system you are deepest in
  const deepest = (Object.keys(BRANCHES) as Branch[]).filter((b) => b !== 'synergy' && b !== 'salvage').map((b) => [b, branchLevels(ctx.levels, b)] as const).sort((a, b) => b[1] - a[1])[0];
  if (deepest && deepest[1] >= 3 && deepest[0] === u.branch) return { text: 'Builds on your {system}', vars: { system: BRANCHES[u.branch].name }, rank: 3 };
  return null;
}
