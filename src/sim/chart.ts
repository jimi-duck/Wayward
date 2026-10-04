import { clamp } from '../core/math';
import {
  BASE_PRICES, EDGE_NAME, HOLDER_PRICES, HOME_NAME, NAMES, PORT_NAMES, SYSTEMS, type Holder, type Prices, type SystemKind,
} from '../content/systems';
import { PLACE_CHANCE, PLACE_ORDER, PLACES, SIGNAL_REWARDS, type PlaceId, type Reward } from '../content/phenomena';
import { Rng } from './rng';

// ── the chart ─────────────────────────────────────────────────────────────
// The region the Wayward runs across: about a dozen systems in six columns,
// from Cerro (the home system, the Breakout) on the left to the Threshold
// (the last lane the old charts know) on the right, joined by lanes. Laid
// out from a seed and the templates in content/systems.ts, so a journey's
// map is the same every time it loads.
//
//   lanes    · every lane costs Krail to jump and days to cross; most run
//              one column on, a few run sideways.
//   the Net  · Continuance control, spreading from Cerro along the lanes a
//              little every day, faster into systems with Krail to take.
//              A netted system has a blockade at its lane mouth, a Custody
//              that starts out looking for you, dearer markets and fewer
//              friendly calls. A stall holds it out of one system for a
//              while.
//   what you know · the Net's edge as it was when you last had news of it
//              (the systems within two jumps of you, each arrival), prices
//              only where you have been, Krail as a survey estimate that
//              can be out by a quarter until you have flown the system.
//   places   · most systems past Cerro have something in them (content/
//              phenomena.ts): a storm, a wreck, a beacon, a Thren lane.
//              Storms and nebulae show from anywhere; the rest once you
//              are within sight of them. Each is there until dealt with.

export interface StarSystem {
  id: string;
  name: string;
  kind: SystemKind;
  col: number;
  /** Position on the chart, 0 to 1 both ways. */
  x: number;
  y: number;
  holder: Holder;
  /** Krail richness and food supply, 0 to 1. */
  krail: number;
  food: number;
  /** The port's name and prices (before the Net's mark-up), or no port. */
  port: { name: string; prices: Prices } | null;
  /** World units from the arrival point to the lane mouth. */
  lane: number;
  /** The survey's estimate of `krail`, until it has been flown. */
  survey: number;
}

export interface Route {
  a: string;
  b: string;
  /** Krail to jump it, and days in the lane. */
  krail: number;
  days: number;
}

/** A place in a system: which, whether you know of it, whether it is dealt with, and what a strange signal will turn out to be. */
export interface Place {
  id: PlaceId;
  seen: boolean;
  done: boolean;
  reward: Reward;
}

export interface Chart {
  systems: StarSystem[];
  routes: Route[];
  home: string;
  edge: string;
  /** The Net's progress into each system: at 1, it is netted. */
  net: Record<string, number>;
  /** Days left that a system holds the Net out. */
  stall: Record<string, number>;
  /** What you know: systems flown, the Net as last seen, and the day it was seen. */
  visited: string[];
  seenNet: string[];
  seenDay: number;
  /** The places, by system. */
  places: Record<string, Place>;
}

export const COLS = 6;
/** The Net's pace: progress a day into a system next to a netted one, before richness. */
export const NET_RATE = 0.45;
/** How much harder each further netted neighbour presses a system. */
export const NET_PRESS = 0.5;
/** How far the news reaches: the Net is seen this many jumps out, each arrival. */
export const SIGHT = 2;
/** What the Net does to a port: dearer Krail, food and plates, less for ore. */
export const NET_MARKUP: Partial<Record<keyof Prices, number>> = { ore: 0.75, krail: 1.4, food: 1.4, plate: 1.25 };

const COL_SIZES = [1, 3, 3, 3, 2, 1];
/** Kinds by column: the near systems are human and busy, the far ones emptier and rougher. */
const COL_KINDS: SystemKind[][] = [
  ['home'],
  ['port', 'mining', 'transit'],
  ['mining', 'contested', 'port', 'transit'],
  ['contested', 'port', 'mining', 'transit'],
  ['mining', 'contested', 'transit', 'port'],
  ['edge'],
];

const round5 = (n: number) => Math.max(1, Math.round(n));

function pricesFor(holder: Holder, rng: Rng): Prices {
  const m = HOLDER_PRICES[holder];
  const p = { ...BASE_PRICES };
  for (const k of Object.keys(p) as Array<keyof Prices>) {
    const v = BASE_PRICES[k] * (m[k] ?? 1) * rng.range(0.9, 1.1);
    p[k] = k === 'ore' || k === 'krail' || k === 'food' ? Math.max(1, Math.round(v)) : Math.round(v / 5) * 5;
  }
  return p;
}

/** Lay a region out from a seed. */
export function makeChart(seed: number): Chart {
  const rng = new Rng(seed ^ 0x5eed);
  const names = [...NAMES];
  const systems: StarSystem[] = [];
  for (let col = 0; col < COLS; col++) {
    const n = COL_SIZES[col]!;
    // each column deals its kinds from a shuffled list, so a region always has ports and mines spread across it
    const kinds = [...COL_KINDS[col]!];
    for (let i = kinds.length - 1; i > 0; i--) { const j = rng.int(i + 1); [kinds[i], kinds[j]] = [kinds[j]!, kinds[i]!]; }
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % kinds.length]!;
      const t = SYSTEMS[kind];
      const holder = t.holders[rng.int(t.holders.length)]!;
      const name = kind === 'home' ? HOME_NAME : kind === 'edge' ? EDGE_NAME : names.splice(rng.int(names.length), 1)[0]!;
      const krail = Math.round(rng.range(t.krail[0], t.krail[1]) * 100) / 100;
      const hasPort = rng.next() < t.port;
      const portNames = PORT_NAMES[holder];
      const y = n === 1 ? 0.5 : clamp((i + 0.5) / n + rng.range(-0.08, 0.08), 0.08, 0.92);
      systems.push({
        id: `s${systems.length}`, name, kind, col, x: col / (COLS - 1), y, holder, krail,
        food: Math.round(rng.range(t.food[0], t.food[1]) * 100) / 100,
        port: hasPort ? { name: kind === 'home' ? 'Frontier Supply' : portNames[rng.int(portNames.length)]!, prices: kind === 'home' ? { ...BASE_PRICES } : pricesFor(holder, rng) } : null,
        lane: Math.round(rng.range(t.lane[0], t.lane[1]) / 50) * 50,
        survey: clamp(Math.round((krail + rng.range(-0.25, 0.25)) * 100) / 100, 0, 1),
      });
    }
  }
  const routes: Route[] = [];
  const link = (a: StarSystem, b: StarSystem) => {
    if (routes.some((r) => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id))) return;
    const d = Math.hypot((a.x - b.x) * 1.6, a.y - b.y);
    routes.push({ a: a.id, b: b.id, krail: round5(12 + 9 * d + rng.range(-1, 2)), days: d > 0.42 ? 2 : 1 });
  };
  for (let col = 0; col < COLS - 1; col++) {
    const here = systems.filter((s) => s.col === col), next = systems.filter((s) => s.col === col + 1);
    // each system links on to the nearest one or two in the next column
    for (const s of here) {
      const by = [...next].sort((p, q) => Math.abs(p.y - s.y) - Math.abs(q.y - s.y));
      link(s, by[0]!);
      if (by[1] && (col === 0 || rng.next() < 0.55)) link(s, by[1]);
    }
    // and nothing is left without a way in
    for (const t of next) if (!routes.some((r) => r.b === t.id || r.a === t.id)) link([...here].sort((p, q) => Math.abs(p.y - t.y) - Math.abs(q.y - t.y))[0]!, t);
    // now and then a lane runs sideways
    for (let i = 0; i + 1 < next.length; i++) if (col + 1 < COLS - 1 && rng.next() < 0.35) link(next[i]!, next[i + 1]!);
  }
  const home = systems[0]!.id, edge = systems[systems.length - 1]!.id;
  const c: Chart = { systems, routes, home, edge, net: { [home]: 1 }, stall: {}, visited: [home], seenNet: [home], seenDay: 0, places: {} };
  c.places = layPlaces(c, seed);
  arrive(c, home, 0);
  return c;
}

/**
 * Deal the places out over a laid-out chart. Its own generator, so the
 * systems and lanes of a seed are the same as they were before places, and
 * a save from before them can be given the same ones.
 */
export function layPlaces(c: Chart, seed: number): Record<string, Place> {
  const rng = new Rng(seed ^ 0x91ace);
  const out: Record<string, Place> = {};
  const used = new Map<PlaceId, number>();
  for (const s of c.systems) {
    if (rng.next() >= (PLACE_CHANCE[s.kind] ?? 0)) continue;
    // the ones that fit here, less likely each time one has been dealt already
    const pool = PLACE_ORDER.filter((id) => { const d = PLACES[id]; return d.kinds.includes(s.kind) && s.col >= d.cols[0] && s.col <= d.cols[1]; });
    if (!pool.length) continue;
    const w = (id: PlaceId) => PLACES[id].weight / (1 + 1.5 * (used.get(id) ?? 0));
    let roll = rng.next() * pool.reduce((t, id) => t + w(id), 0);
    let id = pool[pool.length - 1]!;
    for (const p of pool) { roll -= w(p); if (roll <= 0) { id = p; break; } }
    used.set(id, (used.get(id) ?? 0) + 1);
    const d = PLACES[id];
    out[s.id] = { id, seen: d.far, done: false, reward: d.reward === 'unknown' ? SIGNAL_REWARDS[rng.int(SIGNAL_REWARDS.length)]! : d.reward };
  }
  return out;
}

/** The place in a system you know of and have not dealt with, if any. */
export function placeAt(c: Chart, id: string): Place | null {
  const p = c.places[id];
  return p && p.seen && !p.done ? p : null;
}

/** Bring the places within `n` jumps of a system onto the chart. */
export function sightPlaces(c: Chart, id: string, n: number): void {
  for (const s of c.systems) { const p = c.places[s.id]; if (p && jumps(c, id, s.id) <= n) p.seen = true; }
}

/**
 * A lane the charts never had: from `id` to the nearest system two columns
 * on (one, at the far side) that it has no lane to. Cheap, and a day.
 * Returns the system it reaches, or null if there is nowhere for one to go.
 */
export function openShortcut(c: Chart, id: string): StarSystem | null {
  const s = sysById(c, id);
  const col = Math.min(COLS - 1, s.col + 2);
  const by = c.systems.filter((t) => (t.col === col || t.col === s.col + 1) && t.kind !== 'home' && !routeBetween(c, id, t.id))
    .sort((p, q) => (q.col - p.col) || Math.abs(p.y - s.y) - Math.abs(q.y - s.y));
  const to = by[0];
  if (!to) return null;
  c.routes.push({ a: id, b: to.id, krail: 10, days: 1 });
  return to;
}

export const sysById = (c: Chart, id: string): StarSystem => {
  const s = c.systems.find((x) => x.id === id);
  if (!s) throw new Error(`no system ${id}`);
  return s;
};

/** The lanes out of a system, and where they go. */
export function lanesFrom(c: Chart, id: string): Array<{ to: StarSystem; route: Route }> {
  return c.routes.filter((r) => r.a === id || r.b === id).map((r) => ({ to: sysById(c, r.a === id ? r.b : r.a), route: r }));
}

export function routeBetween(c: Chart, a: string, b: string): Route | null {
  return c.routes.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)) ?? null;
}

export const netted = (c: Chart, id: string) => (c.net[id] ?? 0) >= 1;

/** Jumps between two systems by the lanes (Infinity if there is no way). */
export function jumps(c: Chart, from: string, to: string): number {
  if (from === to) return 0;
  const dist = new Map([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    for (const { to: n } of lanesFrom(c, id)) {
      if (dist.has(n.id)) continue;
      dist.set(n.id, dist.get(id)! + 1);
      if (n.id === to) return dist.get(n.id)!;
      queue.push(n.id);
    }
  }
  return Infinity;
}

/**
 * The Net spreads for `days`: every system next to a netted one, and not
 * holding it out, falls a little further, faster where there is Krail to
 * take. Stepped in quarter days, so a system netted at noon pushes on by
 * evening. Returns the systems newly netted.
 */
export function spreadNet(c: Chart, days: number, rng: Rng): string[] {
  const fell: string[] = [];
  let left = days;
  while (left > 1e-6) {
    const dt = Math.min(0.25, left);
    left -= dt;
    for (const id of Object.keys(c.stall)) if ((c.stall[id]! -= dt) <= 0) delete c.stall[id];
    // the front, and how many netted systems press on each part of it: a broad front pushes harder
    const front = c.systems.filter((s) => !netted(c, s.id) && !c.stall[s.id]).map((s) => ({ s, n: lanesFrom(c, s.id).filter((l) => netted(c, l.to.id)).length })).filter((f) => f.n > 0);
    for (const { s, n } of front) {
      c.net[s.id] = (c.net[s.id] ?? 0) + dt * NET_RATE * (0.5 + s.krail) * (1 + NET_PRESS * (Math.min(n, 3) - 1)) * rng.range(0.7, 1.3);
      if (netted(c, s.id)) { c.net[s.id] = 1; fell.push(s.id); }
    }
  }
  return fell;
}

/** The Net gains `days` of its spread in one system at a stroke, front or not (a survey relay left to finish). */
export function pushNet(c: Chart, id: string, days: number): void {
  if (netted(c, id) || c.stall[id]) return;
  const s = sysById(c, id);
  c.net[id] = Math.min(1, (c.net[id] ?? 0) + days * NET_RATE * (0.5 + s.krail));
}

/** Arriving somewhere: the system is flown (its Krail is known, its prices too), and the news brings the Net's edge up to date nearby. */
export function arrive(c: Chart, id: string, day: number): void {
  if (!c.visited.includes(id)) c.visited.push(id);
  const near = c.systems.filter((s) => jumps(c, id, s.id) <= SIGHT).map((s) => s.id);
  c.seenNet = [...c.seenNet.filter((s) => !near.includes(s)), ...near.filter((s) => netted(c, s))];
  c.seenDay = day;
  sightPlaces(c, id, SIGHT);
}

/** What a port charges now: its own prices, marked up once the Net holds the system. */
export function pricesAt(c: Chart, id: string): Prices | null {
  const s = sysById(c, id);
  if (!s.port) return null;
  if (!netted(c, id)) return s.port.prices;
  const p = { ...s.port.prices };
  for (const [k, m] of Object.entries(NET_MARKUP) as Array<[keyof Prices, number]>) {
    const v = p[k] * m;
    p[k] = k === 'ore' || k === 'krail' || k === 'food' ? Math.max(1, Math.round(v)) : Math.round(v / 5) * 5;
  }
  return p;
}

/** The Krail you believe is there: the truth once flown, the survey before. */
export const krailKnown = (c: Chart, s: StarSystem) => (c.visited.includes(s.id) ? s.krail : s.survey);
