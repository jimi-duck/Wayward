import { UPGRADE, type Branch } from '../content/upgrades';
import { WEB, WEB_NODE, type WebNode } from '../content/web';
import { available, tagWeights, type Levels } from './build';
import { Rng } from './rng';

// ── the refit web: the rules ──────────────────────────────────────────────
// A refit gives points; a point fits one node joined to a node already
// fitted (the core is always fitted). A node can also be closed: by a lock
// that long-term progression opens, by a faction's tech not yet salvaged
// this run, by another specialisation of its region already taken, by a
// synergy's other half not yet owned, or by its upgrade being maxed.

/** Points a refit gives. */
export const POINTS_PER_REFIT = 2;
/** Points battle salvage (a destroyed capital ship) gives. */
export const POINTS_PER_SALVAGE = 2;

export interface WebView {
  levels: Levels;
  fitted: ReadonlySet<string>;
  /** Long-term unlocks (upgrade ids). */
  unlocked: ReadonlySet<string>;
  /** Factions whose tech has been salvaged this run. */
  techs: ReadonlySet<string>;
}

export type Closed = 'fitted' | 'unreached' | 'locked' | 'tech' | 'taken' | 'needs' | 'maxed' | null;

/** Why a node cannot be fitted now, or null if it can. */
export function closed(n: WebNode, v: WebView): Closed {
  if (v.fitted.has(n.id)) return 'fitted';
  if (!n.links.some((l) => v.fitted.has(l))) return 'unreached';
  const u = n.up ? UPGRADE[n.up] : null;
  if (!u) return 'fitted';
  if (u.locked && !v.unlocked.has(u.id)) return 'locked';
  if (u.tech && !v.techs.has(u.tech)) return 'tech';
  if ((v.levels[u.id] ?? 0) >= u.max) return 'maxed';
  if (u.group && Object.keys(v.levels).some((id) => (v.levels[id] ?? 0) > 0 && UPGRADE[id]?.group === u.group)) return 'taken';
  if (!available(u, v.levels, v.unlocked)) return 'needs';
  return null;
}

export const canFit = (n: WebNode, v: WebView) => closed(n, v) === null;

/** Every node that can be fitted now. */
export function open(v: WebView): WebNode[] {
  return WEB.filter((n) => canFit(n, v));
}

const KIND_PULL: Record<string, number> = { system: 2.2, spec: 2.6, synergy: 2.2, tech: 2.6, stat: 1.4, minor: 1, core: 0 };

/**
 * Three nodes to suggest for a quick pick: two that lean toward the build
 * (the nodes whose tags the build already carries, the bigger the better),
 * and, when there is one, a node in a direction the build has not taken.
 * Its own generator, so suggestions never move the world's dice.
 */
export function suggest(v: WebView, seed: number): string[] {
  const rng = new Rng(seed);
  const pool = open(v);
  if (!pool.length) return [];
  const affinity = tagWeights(v.levels);
  const aff = (n: WebNode) => UPGRADE[n.up!]!.tags.reduce((a, t) => a + (affinity.get(t) ?? 0), 0);
  const weight = (n: WebNode) => { const u = UPGRADE[n.up!]!; return KIND_PULL[u.kind]! * (u.weight ?? 1) * (1 + 0.8 * aff(n)); };
  const out: WebNode[] = [];
  const take = (list: WebNode[], w: (n: WebNode) => number) => {
    const left = list.filter((n) => !out.includes(n));
    if (!left.length) return;
    let total = 0;
    for (const n of left) total += w(n);
    let roll = rng.next() * total;
    for (const n of left) { roll -= w(n); if (roll <= 0) { out.push(n); return; } }
    out.push(left[left.length - 1]!);
  };
  take(pool, weight);
  take(pool, weight);
  const fresh = pool.filter((n) => aff(n) === 0);
  take(fresh.length && Object.keys(v.levels).length ? fresh : pool, (n) => KIND_PULL[UPGRADE[n.up!]!.kind]!);
  return out.map((n) => n.id);
}

/** Steps from every node to the nearest node of each region (ignoring gates), for planning a route. */
export const REGION_DISTANCE: ReadonlyMap<string, Partial<Record<Branch, number>>> = (() => {
  const out = new Map<string, Partial<Record<Branch, number>>>();
  for (const n of WEB) out.set(n.id, {});
  const regions = [...new Set(WEB.map((n) => n.region))].filter((r): r is Branch => r !== 'core');
  for (const r of regions) {
    const queue = WEB.filter((n) => n.region === r).map((n) => n.id);
    const dist = new Map(queue.map((id) => [id, 0]));
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]!, d = dist.get(id)!;
      for (const l of WEB_NODE.get(id)!.links) if (!dist.has(l)) { dist.set(l, d + 1); queue.push(l); }
    }
    for (const [id, d] of dist) out.get(id)![r] = d;
  }
  return out;
})();
