import { MODULE_BY_ID } from '../content/modules';
import { UPGRADE, upgradeText } from '../content/upgrades';
import { ARCADE_PRICE, FITTING, LEVEL_STEP, NODE, STOCK, TIER_COST, WEB, YARD_FEE, type WebNode } from '../content/web';
import { budgets } from './budgets';
import { available, branchLevels, type Levels } from './build';

// ── the refit bay: what can be fitted, what it costs, what it leaves ──────
// The rules over content/web.ts. Building happens only in the bay (PLAN.md,
// R): in the Arcade mode it opens by itself once a price of Krail is aboard
// and the alert is clear, and every level costs the same; in the Story mode
// you open it (in flight when the alert is clear, and always at a port) and
// the price is the tier's. You pay Krail and fit one level at a time. In the
// Story mode the yard's work is fitted only while docked, and the yard
// charges chits as well.
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
  /** Story: chits aboard, for the yard's fee. */
  chits?: number;
  /** The Arcade: how many times the bay has shut this run, so each opening deals a little differently (the same opening always deals the same). */
  deal?: number;
  /** The Arcade: cards dealt at the last opening and not taken, which come round again less readily. */
  passed?: readonly string[];
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
  | 'krail' // not enough Krail
  | 'chits'; // not enough chits for the yard

export const maxLevel = (id: string): number => UPGRADE[id]?.max ?? FITTING[id]?.max ?? MODULE_BY_ID[id]?.max ?? 0;

/** A node's name, and what its level `lv` does, in English (the caller translates). */
export const nodeName = (id: string): string => UPGRADE[id]?.name ?? FITTING[id]?.name ?? MODULE_BY_ID[id]?.name ?? id;
export const nodeText = (id: string, lv: number): string => (UPGRADE[id] ? upgradeText(UPGRADE[id]!, lv) : FITTING[id]?.text ?? MODULE_BY_ID[id]?.text ?? '');

/** Whether level `lv` of a node is yard work: the Story mode, at a port only. */
export const yardWork = (id: string, lv: number, arcade: boolean): boolean => !arcade && NODE[id]?.yard !== undefined && lv >= NODE[id]!.yard!;

/** The yard's fee in chits for level `lv` (1 up) of a node, or 0 when it is not yard work. */
export function fee(id: string, lv: number, arcade: boolean): number {
  if (!yardWork(id, lv, arcade)) return 0;
  return MODULE_BY_ID[id]?.chits[lv - 1] ?? YARD_FEE * lv;
}

/** Krail for level `lv` (1 up) of a node: ARCADE_PRICE in the Arcade mode, else by tier and level. */
export function cost(id: string, lv: number, arcade: boolean): number {
  const node = NODE[id];
  if (!node) return Infinity;
  if (arcade) return ARCADE_PRICE;
  const base = TIER_COST[Math.min(node.tier, TIER_COST.length - 1)]! * (node.price ?? 1);
  return Math.round((base * (1 + LEVEL_STEP * (lv - 1))) / 5) * 5;
}

export { budgets, overBy } from './budgets';

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
  if (yardWork(id, lv + 1, ctx.arcade) && !ctx.docked) return 'yard';
  const { use, cap } = budgets(ctx.levels);
  if ((node.draw.power ?? 0) > 0 && use.power + node.draw.power! > cap.power) return 'power';
  if (ctx.krail < cost(id, lv + 1, ctx.arcade)) return 'krail';
  if ((ctx.chits ?? 0) < fee(id, lv + 1, ctx.arcade)) return 'chits';
  return null;
}

/** Fit one more level of `id`: the new levels and what it cost (Krail, and the yard's chits), or why not. */
export function install(id: string, ctx: BayCtx): { levels: Levels; cost: number; fee: number } | Block {
  const why = blockOf(id, ctx);
  if (why) return why;
  const lv = ctx.levels[id] ?? 0;
  return { levels: { ...ctx.levels, [id]: lv + 1 }, cost: cost(id, lv + 1, ctx.arcade), fee: fee(id, lv + 1, ctx.arcade) };
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

/** The cheapest module that only wants Krail to be fitted: what the HUD counts toward. Null when nothing is in reach. */
export function cheapest(ctx: BayCtx): { id: string; cost: number } | null {
  let best: { id: string; cost: number } | null = null;
  for (const w of WEB) {
    const b = blockOf(w.id, ctx);
    if (b !== null && b !== 'krail' && b !== 'chits') continue;
    const c = cost(w.id, (ctx.levels[w.id] ?? 0) + 1, ctx.arcade);
    if (!best || c < best.cost) best = { id: w.id, cost: c };
  }
  return best;
}

// ── suggestions ───────────────────────────────────────────────────────────
// What the bay puts first, and what Auto-refit fits: a few modules that suit
// the ship as it is, so a player who does not want to plan never has to read
// the web. Deterministic (no dice), so the same ship gets the same picks.

/** How many suggestions the bay shows. */
export const PICKS = 3;

/** How much a module suits this build: leaning to what is fitted, a system early, and a fitting when its budget is short. */
function suits(id: string, ctx: BayCtx, affinity: Map<string, number>, systems: number): number {
  const { use, cap } = budgets(ctx.levels);
  const node = NODE[id]!;
  if (FITTING[id]) {
    // the reactor core when power is nearly gone; cooling or a frame once the ship runs hot or heavy
    if (id === 'rx_core') return cap.power - use.power < 2 ? 9 : 0.2;
    if (id === 'rx_sinks') return use.heat >= cap.heat ? 8 : 0.2;
    return use.mass >= cap.mass ? 7 : 0.2;
  }
  const u = UPGRADE[id];
  // a yard module (the Story mode): each changes how a system plays
  if (!u) return MODULE_BY_ID[id] ? 1.6 : 0.2;
  let v = 1 + u.tags.reduce((a, t) => a + Math.min(4, affinity.get(t) ?? 0), 0) * 0.6;
  if (u.kind === 'system' && systems < 2) v += 1.2;
  if (u.kind === 'spec' || u.kind === 'synergy' || u.kind === 'tech') v += 2.5;
  // a module that would run the ship over a soft rating counts for less
  if (use.mass + (node.draw.mass ?? 0) > cap.mass || use.heat + (node.draw.heat ?? 0) > cap.heat) v *= 0.45;
  return v;
}

/**
 * The bay's suggestions: up to PICKS modules that can be fitted now or want
 * only Krail, best first, each from a different tab where it can.
 */
export function quickPicks(ctx: BayCtx, n = PICKS): WebNode[] {
  if (ctx.arcade && n === PICKS) return arcadePicks(ctx);
  const affinity = new Map<string, number>();
  for (const [id, lv] of Object.entries(ctx.levels)) for (const t of UPGRADE[id]?.tags ?? []) affinity.set(t, (affinity.get(t) ?? 0) + lv);
  const systems = Object.keys(ctx.levels).filter((id) => UPGRADE[id]?.kind === 'system' && (ctx.levels[id] ?? 0) > 0).length;
  const scored = WEB
    .filter((w) => { const b = blockOf(w.id, ctx); return b === null || b === 'krail' || b === 'chits'; })
    .map((w) => ({ w, v: suits(w.id, ctx, affinity, systems) / Math.sqrt(cost(w.id, (ctx.levels[w.id] ?? 0) + 1, ctx.arcade) / 40) }))
    .sort((a, b) => b.v - a.v || a.w.id.localeCompare(b.w.id));
  // a spread: different tabs, and no more than one new system at a time
  const out: WebNode[] = [];
  const isNew = (w: WebNode) => UPGRADE[w.id]?.kind === 'system' && !(ctx.levels[w.id] ?? 0);
  const fits = (w: WebNode, spread: boolean) => !out.includes(w) && (!isNew(w) || !out.some(isNew)) && (!spread || !out.some((o) => o.tab === w.tab));
  for (const { w } of scored) if (out.length < n && fits(w, true)) out.push(w);
  for (const { w } of scored) if (out.length < n && fits(w, false)) out.push(w);
  for (const { w } of scored) if (out.length < n && !out.includes(w)) out.push(w);
  return out;
}

// ── the Arcade's three picks ──────────────────────────────────────────────
// Always one of each: a gun, a defence, a part of the ship, in that order, so
// the cards read the same every time and nothing is a mystery. Each is the
// module that suits the ship best in its role (what it already leans to, a
// basic early, what its budgets need), nudged by a deterministic shuffle of
// the opening so the same ship is not dealt the same cards twice. One slot
// in three, in turn, is an explorer: it prefers a part of the ship you have
// not touched, so a run can wander off its first idea. The reactor, heat
// and frame fittings are not picks: they come only when the ship has run
// out of power, cooling or frame, as the one card in the ship's slot.

/** Branches the ship leaves with already (lasers, and the torpedo bay): never new. */
const STOCK_BRANCH: ReadonlySet<string> = new Set(['laser', 'torpedo']);

export type PickRole = 'weapons' | 'defence' | 'ship';
export const PICK_ROLES: readonly PickRole[] = ['weapons', 'defence', 'ship'];

/** Which of the three a node is: its upgrade's category, and the ship's for a fitting. */
export const roleOf = (id: string): PickRole => UPGRADE[id]?.cat ?? 'ship';

/** A steady number from 0 to 1 for a card at an opening: nothing random about it, so the bay and the HUD agree. */
function shuffle(id: string, deal: number, progress: number): number {
  let h = 2166136261;
  for (const c of `${id}:${deal}:${progress}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** The fitting a ship has run short of, if any: it takes the ship's slot, being the thing that stops the rest. */
function shortOf(ctx: BayCtx): string | null {
  const { use, cap } = budgets(ctx.levels);
  // power gone is the hard stop; heat and mass only count once they are over, and then every other opening, so the ship's slot is not always the same card
  // (one that was passed over waits a few openings before it asks again)
  const deal = ctx.deal ?? 0, asked = (id: string) => !ctx.passed?.includes(id) || deal % 3 === 0;
  if (cap.power - use.power < 1) return asked('rx_core') ? 'rx_core' : null;
  if (deal % 2) return null;
  if (use.heat > cap.heat && asked('rx_sinks')) return 'rx_sinks';
  if (use.mass > cap.mass && asked('hl_frame')) return 'hl_frame';
  return null;
}

export function arcadePicks(ctx: BayCtx): WebNode[] {
  // the ship leaves with lasers and torpedoes, so those are what it starts out leaning to
  const affinity = new Map<string, number>([['laser', 1], ['torpedo', 1]]);
  for (const [id, lv] of Object.entries(ctx.levels)) for (const t of UPGRADE[id]?.tags ?? []) affinity.set(t, (affinity.get(t) ?? 0) + lv);
  const systems = Object.keys(ctx.levels).filter((id) => UPGRADE[id]?.kind === 'system' && (ctx.levels[id] ?? 0) > 0).length;
  const progress = Object.values(ctx.levels).reduce((a, b) => a + b, 0), early = progress < 5;
  const deal = ctx.deal ?? 0, explorer = PICK_ROLES[deal % PICK_ROLES.length]!;
  const open = WEB.filter((w) => { const b = blockOf(w.id, ctx); return b === null || b === 'krail' || b === 'chits'; });
  const need = shortOf(ctx);
  const score = (w: WebNode, role: PickRole): number => {
    let v = suits(w.id, ctx, affinity, systems);
    // a basic first, the late rungs later
    if (early) v *= w.tier <= 1 ? 1.5 : w.tier >= 3 ? 0.6 : 1;
    // and the guns the ship already has, over a new toy, until it has a few fitted
    if (early && UPGRADE[w.id]?.kind === 'stat' && (UPGRADE[w.id]!.branch === 'laser' || UPGRADE[w.id]!.branch === 'torpedo')) v *= 1.7;
    // the explorer wants something this ship has none of
    const u = UPGRADE[w.id];
    if (role === explorer && u && u.kind !== 'tech' && !STOCK_BRANCH.has(u.branch) && branchLevels(ctx.levels, u.branch) === 0) v *= 2.2;
    if (ctx.passed?.includes(w.id)) v *= 0.2;
    return v * (0.7 + 0.6 * shuffle(w.id, deal, progress));
  };
  const out: WebNode[] = [];
  for (const role of PICK_ROLES) {
    const fix = role === 'ship' ? open.find((w) => w.id === need) : undefined;
    const best = fix ?? open
      .filter((w) => !FITTING[w.id] && roleOf(w.id) === role && !out.includes(w))
      .map((w) => ({ w, v: score(w, role) }))
      .sort((a, b) => b.v - a.v || a.w.id.localeCompare(b.w.id))[0]?.w;
    // the ship's slot, with no part left to fit that the power allows, offers the cooling, frame or core that opens more
    const spare = role === 'ship' && !best ? ['rx_sinks', 'hl_frame', 'rx_core'].map((id) => open.find((w) => w.id === id)).find(Boolean) : undefined;
    if (best ?? spare) out.push((best ?? spare)!);
  }
  // a role with nothing left to fit: the best of what remains
  const rest = open.filter((w) => !FITTING[w.id] && !out.includes(w)).sort((a, b) => score(b, roleOf(b.id)) - score(a, roleOf(a.id)) || a.id.localeCompare(b.id));
  for (const w of rest) if (out.length < PICKS) out.push(w);
  return out;
}
