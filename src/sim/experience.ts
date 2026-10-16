import { EXPANSES, FEATURES, NAMED, RARITY, type ExpanseId, type FeatureId } from '../content/features';
import { PLACES } from '../content/phenomena';
import { HAZARDS, PROFILES, SITE_OF_GOAL, SITE_OF_PLACE, type Exp, type RegionProfile } from '../content/profiles';
import { SITUATION_BY_ID } from '../content/situations';
import { regionOf, sysById, type Chart, type StarSystem } from './chart';
import { Rng } from './rng';
import { longIndex } from './situations';

// ── the experience composer ───────────────────────────────────────────────
// What a Story system is like to fly, decided once from the journey's seed
// and kept on the chart (Chart.exp). A system has an objective (the job or
// place the chart dealt it, a breather, or a plain crossing), and the
// composer gives it a sky to match: an expanse from its region's profile
// (content/profiles.ts), the feature its job or place sits in, and a few
// ambient features off the straight line. Not every system gets every part:
// a breather gets calm sky, a crossing gets weather to look at.
//
// Memory keeps neighbours different. The chart is dealt column by column, and
// a candidate is less likely the more the last two columns, and the systems
// already dealt in its own column, already hold it. The sky is a function of
// the seed and the chart's static facts, so a reloaded journey is the same.
//
// Fairness is data too: at most one hazard (a storm or a well) in a system,
// never in a breather, never as the site of a job that is not about it; and
// the layout (sim/sites.ts) keeps all of it off the straight line.

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** A system the composer deals a sky to: not Cerro, a gate, or the Threshold (the same set the situations use). */
const open = (s: StarSystem) => s.kind !== 'home' && s.kind !== 'gate' && s.kind !== 'edge';

/** How much less likely a candidate is for each system in the previous column, the one before, and the same column that already has it. */
const BACK = [0.3, 0.6] as const;
const SIDE = 0.35;
/** A busy expanse after a busy column. */
const TIRED = 0.4;
/** The most busy features (the site included) in one system's sky. */
const BUSY_MAX = 2;
/** How often a lantern line is passed over when it would be dealt. */
const LANTERN_SKIP = 0.6;

/** What a system asks of the player, in one word, from what the chart dealt it. */
export function objectiveOf(c: Chart, id: string): string {
  const s = sysById(c, id);
  const q = c.situations?.[id];
  const sit = q ? SITUATION_BY_ID[q.id] : undefined;
  if (sit) return `job:${sit.goal.kind}`;
  const p = c.places[id];
  if (p) return `place:${PLACES[p.id].plays}`;
  return s.quiet ? 'quiet' : 'crossing';
}

/** The goal family that picks a job's site: 'call' for a card alone. */
const goalOf = (obj: string): string | null => (obj.startsWith('job:') ? obj.slice(4) : null);

/** A system's whole experience as one comparable string: objective, expanse, features, holder. */
export function signature(c: Chart, id: string): string {
  const e = c.exp?.[id];
  const s = sysById(c, id);
  const feats = e ? [...(e.s ? [e.s] : []), ...e.f].sort().join('+') : '';
  return [objectiveOf(c, id), e?.x ?? '-', feats || '-', s.holder].join('|');
}

/** Just the sky of a signature (expanse and features), for the repeat checks. */
export const skyOfSignature = (sig: string): string => sig.split('|').slice(1, 3).join('|');

interface Seen { x: Map<ExpanseId, number>; f: Map<FeatureId, number> }
const tally = (): Seen => ({ x: new Map(), f: new Map() });
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

function note(seen: Seen, e: Exp): void {
  bump(seen.x as Map<string, number>, e.x);
  for (const f of new Set([...(e.s ? [e.s] : []), ...e.f])) bump(seen.f as Map<string, number>, f);
}

/** A weight lowered by how many systems nearby already hold the thing. */
function worn(w: number, prev: number, prev2: number, side: number): number {
  return w * BACK[0] ** prev * BACK[1] ** prev2 * SIDE ** side;
}

function roll<T>(rng: Rng, pool: Array<[T, number]>): T | null {
  let total = 0;
  for (const [, w] of pool) total += w;
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const [v, w] of pool) { r -= w; if (r <= 0) return v; }
  return pool[pool.length - 1]![0];
}

/** Deal one system's sky. `back` are the tallies of the previous column and the one before, `side` the systems already dealt in its own. */
function composeOne(c: Chart, s: StarSystem, seed: number, back: [Seen, Seen], side: Seen): Exp {
  const rng = new Rng(seed ^ 0xe4b ^ hash(s.id));
  const P: RegionProfile = PROFILES[longIndex(c, regionOf(s))] ?? PROFILES[0]!;
  const obj = objectiveOf(c, s.id);
  const quiet = obj === 'quiet' || !!s.quiet;
  const place = c.places[s.id];
  const goal = goalOf(obj);

  // the site: a place looks like what it is; a job sits where it makes a different place to be
  let site: FeatureId | undefined;
  if (place) site = SITE_OF_PLACE[place.id];
  else if (goal) {
    const table = SITE_OF_GOAL[goal] ?? SITE_OF_GOAL.call!;
    // (a breather keeps to the calm features, whatever is going on in it)
    site = roll(rng, (Object.entries(table) as Array<[FeatureId, number]>).filter(([f]) => !quiet || FEATURES[f].load === 'calm').map(([f, w]) => [f, worn(w * (P.lean[f] ?? 1), back[0].f.get(f) ?? 0, back[1].f.get(f) ?? 0, side.f.get(f) ?? 0)]))
      ?? undefined;
  }

  // the expanse: the region's, calm for a breather, not busy after busy, and one that fits the site
  const busyBefore = [...back[0].x.entries()].filter(([x]) => EXPANSES[x].load === 'busy').reduce((a, [, n]) => a + n, 0);
  const pool: Array<[ExpanseId, number]> = [];
  for (const [x, w0] of Object.entries(P.expanses) as Array<[ExpanseId, number]>) {
    const d = EXPANSES[x];
    if (quiet && d.load === 'busy') continue;
    let w = worn(w0, back[0].x.get(x) ?? 0, back[1].x.get(x) ?? 0, side.x.get(x) ?? 0);
    if (d.load === 'busy' && busyBefore >= 2) w *= TIRED;
    if (site && (d.roster[site] ?? 0) > 0) w *= 1.6;
    pool.push([x, w]);
  }
  const x = roll(rng, pool) ?? (quiet ? 'open' : 'veil');

  // ambient features: from the expanse's roster, leaning to the region, never doubling the site, one hazard at most
  const feats: FeatureId[] = [];
  const hazard = () => (site && HAZARDS.has(site)) || feats.some((f) => HAZARDS.has(f));
  const busy = () => [site, ...feats].filter((f): f is FeatureId => !!f && FEATURES[f].load === 'busy').length;
  const [lo, hi] = quiet ? [0, 1] : P.ambient;
  const n = lo + rng.int(hi - lo + 1);
  for (let i = 0; i < n; i++) {
    const cand: Array<[FeatureId, number]> = [];
    for (const [f, w0] of Object.entries(EXPANSES[x].roster) as Array<[FeatureId, number]>) {
      const fd = FEATURES[f];
      if (f === site || feats.includes(f)) continue;
      // a lantern line is meant to be a find: most of the time it is not on offer
      if (f === 'lanterns' && rng.next() < LANTERN_SKIP) continue;
      if (quiet && (fd.load === 'busy' || HAZARDS.has(f))) continue;
      if (HAZARDS.has(f) && hazard()) continue;
      if (fd.load === 'busy' && fd.layer !== 'far' && busy() >= BUSY_MAX) continue;
      cand.push([f, worn(w0 * RARITY[fd.rarity] * (P.lean[f] ?? 1), back[0].f.get(f) ?? 0, back[1].f.get(f) ?? 0, side.f.get(f) ?? 0)]);
    }
    const f = roll(rng, cand);
    if (f) feats.push(f);
  }
  // a lantern line is the way through a static field: where there is one, there is the other
  if ((feats.includes('static') || site === 'static') && !feats.includes('lanterns') && site !== 'lanterns' && (P.lean.lanterns ?? 1) >= 1 && rng.next() < 0.6) feats.push('lanterns');

  // about one site in three where a named place fits the region (as Story always did)
  const h = hash(s.id);
  const fits = site ? Object.values(NAMED).filter((nm) => nm.feature === site && longTier(c, s) >= nm.regions[0] && longTier(c, s) <= nm.regions[1]) : [];
  const named = fits.length && h % 3 === 0 ? fits[(h >>> 4) % fits.length]!.id : undefined;
  return { x, f: feats, ...(site ? { s: site } : {}), ...(named ? { n: named } : {}) };
}

/** The old three-tier region of a system (what NAMED's regions are written in). */
const longTier = (c: Chart, s: StarSystem): number => {
  const r = regionOf(s);
  return c.regionSet === 'eight' ? ([0, 1, 1, 1, 1, 1, 2, 2][r] ?? 2) : r;
};

/**
 * Deal every open system a sky, a column at a time, with a memory of the last
 * two columns. Call after the places and situations are laid. `only` redeals
 * one system (a follow-up situation arrived there), keeping the rest.
 */
export function composeChart(c: Chart, seed: number, only?: string): void {
  const exp: Record<string, Exp> = only ? { ...(c.exp ?? {}) } : {};
  const cols = [...new Set(c.systems.map((s) => s.col))].sort((a, b) => a - b);
  const history: Seen[] = [];
  for (const col of cols) {
    const here = c.systems.filter((s) => s.col === col && open(s)).sort((a, b) => (a.id < b.id ? -1 : 1));
    const side = tally();
    for (const s of here) {
      if (only && s.id !== only) { if (exp[s.id]) note(side, exp[s.id]!); continue; }
      const e = composeOne(c, s, seed, [history[history.length - 1] ?? tally(), history[history.length - 2] ?? tally()], side);
      exp[s.id] = e;
      note(side, e);
    }
    history.push(side);
  }
  c.exp = exp;
}

/** The sky a system was dealt, composing the chart first if it is from a save that had none. */
export function expOf(c: Chart, id: string, seed: number): Exp | undefined {
  if (!c.exp) composeChart(c, seed);
  return c.exp?.[id];
}
