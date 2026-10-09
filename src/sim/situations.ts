import { t } from '../i18n';
import {
  ARC, EARLY_QUIET, SIT_CHANCE, SIT_CHANCE_QUIET, SITUATION_BY_ID, SITUATIONS, SWEEP_CHANCE, type ChartFx, type SitResult, type SituationDef,
} from '../content/situations';
import { REGIONS_LONG } from '../content/regions';
import { jumps, lanesFrom, netted, pushNet, regionOf, sysById, type Chart, type Sit, type StarSystem } from './chart';
import { Rng } from './rng';

// ── situations on the chart ───────────────────────────────────────────────
// Which system has what going on (content/situations.ts), dealt once from the
// journey's seed. Two ways in:
//
//   the timetable  · ARC rows promise a situation in a column of a region, so
//                    the first half hour, and the alien thread through every
//                    region, do not depend on a roll or on which lane is taken.
//   the roll       · every other system may have one, by its kind: quiet
//                    systems far less often, and a netted one gets a sweep.
//
// The Net changes what is there: a system it holds plays the tightened
// variant of its situation (an empty berth for a trader, a closed dock for a
// settlement). What a sortie did is folded in by `settle`.

/** The eight-region chart's index for a region of this chart (the short chart plays the first, second and Hollows). */
export const longIndex = (c: Chart, region: number): number => (c.regionSet === 'eight' ? region : [0, 1, 6][region] ?? region);

/** A system a situation can sit in: not Cerro, a gate, or the Threshold. */
const open = (s: StarSystem) => s.kind !== 'home' && s.kind !== 'gate' && s.kind !== 'edge';

/** The columns of a region a situation can sit in, in order. */
function columnsOf(c: Chart, region: number): number[] {
  return [...new Set(c.systems.filter((s) => regionOf(s) === region && open(s)).map((s) => s.col))].sort((a, b) => a - b);
}

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Deal the situations over a laid-out chart. Its own generator, so a seed's systems and lanes are what they were without them. */
export function laySituations(c: Chart, seed: number): Record<string, Sit> {
  const rng = new Rng(seed ^ 0x51737);
  const out: Record<string, Sit> = {};
  // the timetable
  for (let region = 0; region < (c.regionSet === 'eight' ? 8 : 3); region++) {
    const long = longIndex(c, region);
    const rows = ARC.filter((r) => r.region === long);
    if (!rows.length) continue;
    const cols = columnsOf(c, region);
    if (!cols.length) continue;
    const of = REGIONS_LONG[long]!.cols.length;
    for (const row of rows) {
      const k = Math.min(cols.length - 1, Math.round((row.col / Math.max(1, of - 1)) * (cols.length - 1)));
      for (const s of c.systems.filter((x) => regionOf(x) === region && x.col === cols[k] && open(x))) out[s.id] = { id: row.id, seen: false, done: false, arc: true };
    }
  }
  // the roll
  const firstCol = Math.min(...c.systems.filter((x) => regionOf(x) === 0 && open(x)).map((x) => x.col));
  const used = new Map<string, number>();
  for (const s of c.systems) {
    if (!open(s) || out[s.id]) continue;
    // the first region opens quiet: nothing is rolled in its first columns
    if (regionOf(s) === 0 && s.col <= firstCol + EARLY_QUIET - 1) continue;
    const chance = s.quiet ? SIT_CHANCE_QUIET : SIT_CHANCE[s.kind] ?? 0;
    if (rng.next() >= chance) continue;
    const long = longIndex(c, regionOf(s));
    const pool = SITUATIONS.filter((d) => !d.variant && d.weight > 0 && d.kinds.includes(s.kind) && long >= d.regions[0] && long <= d.regions[1] && (!d.holders || d.holders.includes(s.holder)));
    // the unknown has its own timetable: the roll deals only what people do
    const people = pool.filter((d) => d.group !== 'unknown');
    if (!people.length) continue;
    const w = (d: SituationDef) => d.weight / (1 + 1.2 * (used.get(d.id) ?? 0));
    let roll = rng.next() * people.reduce((a, d) => a + w(d), 0);
    let pick = people[people.length - 1]!;
    for (const d of people) { roll -= w(d); if (roll <= 0) { pick = d; break; } }
    used.set(pick.id, (used.get(pick.id) ?? 0) + 1);
    out[s.id] = { id: pick.id, seen: false, done: false };
  }
  return out;
}

/** Lay the situations on a chart, in place of any place (phenomenon) in the same system, and mark where the ship has been as done. */
export function dealSituations(c: Chart, seed: number): void {
  const q = laySituations(c, seed);
  c.situations = q;
  for (const id of Object.keys(q)) delete c.places[id];
  for (const id of c.visited) if (q[id]) { q[id]!.seen = true; q[id]!.done = true; }
}

/** What is going on in a system, as far as the chart knows: there, not dealt with, and within sight. */
export function situationAt(c: Chart, id: string): Sit | null {
  const q = c.situations?.[id];
  return q && q.seen && !q.done ? q : null;
}

/** The situation that plays in a system now: its own, tightened if the Net holds the system, or a sweep where nothing else is. */
export function liveSituation(c: Chart, id: string): SituationDef | null {
  const s = sysById(c, id);
  const q = c.situations?.[id];
  const base = q && !q.done ? SITUATION_BY_ID[q.id] : undefined;
  if (!open(s)) return null;
  if (base) return netted(c, id) && base.tight ? SITUATION_BY_ID[base.tight] ?? base : base;
  // a netted system with nothing going on is not nothing: the Net is what is going on
  if (!q && netted(c, id) && (hash(`${id}:sweep`) % 1000) / 1000 < SWEEP_CHANCE) return SITUATION_BY_ID.sweep ?? null;
  return null;
}

/** The chart line for a situation in sight: what it is, in a few words. */
export function situationLine(c: Chart, id: string): string | null {
  const q = situationAt(c, id);
  const d = q && SITUATION_BY_ID[q.id];
  if (!d) return null;
  const live = liveSituation(c, id) ?? d;
  return t(live.blurb);
}

/** A system `n` jumps on from `from`, preferring ones with nothing going on, for a follow-up. */
function onward(c: Chart, from: string, n: number): StarSystem | null {
  let frontier = [from];
  const seen = new Set(frontier);
  for (let i = 0; i < n; i++) {
    const next: string[] = [];
    for (const id of frontier) for (const { to } of lanesFrom(c, id)) if (!seen.has(to.id) && to.col > sysById(c, from).col) { seen.add(to.id); next.push(to.id); }
    if (!next.length) break;
    frontier = next;
  }
  const free = frontier.map((id) => sysById(c, id)).filter((s) => open(s) && !c.situations?.[s.id]);
  return free[0] ?? null;
}

export interface SettleCtx {
  /** The system it was met in, and the day. */
  at: string;
  day: number;
  /** Adds journey flags. */
  flag(f: string): void;
  /** Calloway's days (positive: delays her). */
  hunt(days: number): void;
}

/** A situation is over: mark it, and do what its ending does to the chart. Returns the lines for the debrief. */
export function settle(c: Chart, at: string, result: SitResult, ctx: SettleCtx, def: SituationDef | null = liveSituation(c, at)): string[] {
  const q = c.situations?.[at];
  if (!def) return [];
  // the variant the Net swapped in ends the base situation too
  if (q && !q.done) { q.done = true; q.result = result; }
  const fx: ChartFx | undefined = def.after?.[result];
  const lines: string[] = [];
  for (const f of [def.seen ?? []].flat()) ctx.flag(f);
  if (!fx) return lines;
  const near = lanesFrom(c, at).map((l) => l.to.id);
  if (fx.text) lines.push(t(fx.text));
  if (fx.stallNear) for (const id of near) if (!netted(c, id)) c.stall[id] = (c.stall[id] ?? 0) + fx.stallNear;
  if (fx.pushNear) for (const id of near) pushNet(c, id, fx.pushNear);
  if (fx.market) {
    const { days, ...mult } = fx.market;
    (c.market ??= []).push({ region: regionOf(sysById(c, at)), until: ctx.day + days, mult });
  }
  if (fx.forget) c.seenNet = [c.home];
  if (fx.follow) {
    const to = onward(c, at, fx.follow.jumps);
    if (to) (c.situations ??= {})[to.id] = { id: fx.follow.id, seen: false, done: false };
  }
  if (fx.hunt) ctx.hunt(fx.hunt);
  for (const f of [fx.flag ?? []].flat()) ctx.flag(f);
  return lines;
}

/** How near the front the Net is to a system, in jumps from the nearest netted one (0 netted). Used for the chart's fear. */
export function netDistance(c: Chart, id: string): number {
  let best = Infinity;
  for (const s of c.systems) if (netted(c, s.id)) best = Math.min(best, jumps(c, id, s.id));
  return best;
}
