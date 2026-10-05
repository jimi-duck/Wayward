import { UPGRADE } from '../content/upgrades';
import { FITTING, LEVEL_STEP, NODE, RATINGS, STOCK, STOCK_DRAW, TIER_COST, WEB, type Budget, type WebNode } from '../content/web';
import { available, type Levels } from './build';

// ── the refit bay: what can be fitted, what it costs, what it leaves ──────
// The rules over content/web.ts. Building happens only in the bay (PLAN.md,
// R): you open it when it is quiet, pay Krail, and fit one level at a time.
// Nothing comes out again. This module only answers questions about a
// build; the world keeps the Krail and the levels and calls `install`.

export interface BayCtx {
  levels: Levels;
  /** Long-term unlocks (locked upgrades need them). */
  unlocked: ReadonlySet<string>;
  /** Factions whose capital ship was destroyed this run: their tech can be fitted. */
  techs: ReadonlySet<string>;
  /** The arcade (its own modules) or the Story mode (its own, and the yard's). */
  arcade: boolean;
  /** Story: docked at a port, where yard-only modules can be fitted. */
  docked?: boolean;
  /** Krail aboard to pay with: in both modes what the fabricators build from. */
  krail: number;
}

/** Why a node cannot be fitted now, first reason first. */
export type Block =
  | 'full' // every level fitted
  | 'mode' // not in this mode
  | 'locked' // needs a long-term unlock
  | 'tech' // needs her capital ship destroyed
  | 'path' // nothing it comes from is fitted
  | 'needs' // the upgrade's own rules: what it requires, a specialisation taken, a branch not deep enough
  | 'yard' // fitted only at a port
  | 'power' // not enough power free
  | 'krail'; // not enough Krail

export const maxLevel = (id: string): number => UPGRADE[id]?.max ?? FITTING[id]?.max ?? 0;

/** Krail for level `lv` (1 up) of a node. */
export function cost(id: string, lv: number): number {
  const node = NODE[id];
  if (!node) return Infinity;
  const base = TIER_COST[Math.min(node.tier, TIER_COST.length - 1)]!;
  return Math.round((base * (1 + LEVEL_STEP * (lv - 1))) / 5) * 5;
}

const add = (b: Budget, d: Partial<Budget>, k = 1) => { b.power += (d.power ?? 0) * k; b.mass += (d.mass ?? 0) * k; b.heat += (d.heat ?? 0) * k; };

/** What a build draws and what it is rated for. */
export function budgets(levels: Levels): { use: Budget; cap: Budget } {
  const use: Budget = { ...STOCK_DRAW }, cap: Budget = { ...RATINGS };
  for (const node of WEB) {
    const lv = levels[node.id] ?? 0;
    if (!lv) continue;
    add(use, node.draw, lv);
    if (node.gives) add(cap, node.gives, lv);
  }
  return { use, cap };
}

/** Over a soft rating, as a share of it (0 when within): what step 3 turns into slower handling and slower guns. */
export const overBy = (use: number, cap: number) => Math.max(0, use - cap) / Math.max(1, cap);

/** Why `id` cannot be fitted now, or null if it can. */
export function blockOf(id: string, ctx: BayCtx): Block | null {
  const node = NODE[id];
  if (!node) return 'mode';
  const lv = ctx.levels[id] ?? 0;
  if (lv >= maxLevel(id)) return 'full';
  const u = UPGRADE[id];
  if ((u?.arcade && !ctx.arcade) || (node.story && ctx.arcade)) return 'mode';
  if (u?.locked && !ctx.unlocked.has(id)) return 'locked';
  if (u?.tech && !ctx.techs.has(u.tech)) return 'tech';
  if (lv === 0 && node.from && !node.from.some((f) => (ctx.levels[f] ?? 0) > 0)) return 'path';
  if (u && !available(u, ctx.levels, ctx.unlocked)) return 'needs';
  if (node.yard && !ctx.docked) return 'yard';
  const { use, cap } = budgets(ctx.levels);
  if (use.power + (node.draw.power ?? 0) > cap.power) return 'power';
  if (ctx.krail < cost(id, lv + 1)) return 'krail';
  return null;
}

/** Fit one more level of `id`: the new levels and what it cost, or why not. */
export function install(id: string, ctx: BayCtx): { levels: Levels; cost: number } | Block {
  const why = blockOf(id, ctx);
  if (why) return why;
  const lv = ctx.levels[id] ?? 0;
  return { levels: { ...ctx.levels, [id]: lv + 1 }, cost: cost(id, lv + 1) };
}

/** The nodes of a tab that could be fitted were there Krail and power enough: what the bay lights as available. */
export function reachable(ctx: BayCtx, nodes: readonly WebNode[] = WEB): WebNode[] {
  const rich = { ...ctx, krail: Infinity };
  return nodes.filter((w) => {
    const b = blockOf(w.id, rich);
    return b === null || b === 'power';
  });
}

/** A new ship's levels: the stock fit. */
export const stockLevels = (): Levels => ({ ...STOCK });
