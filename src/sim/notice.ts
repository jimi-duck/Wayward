import { t as tr } from '../i18n';
import {
  BEATEN_RELIEF, CAPTAIN_AT, CAPTAIN_LIVES, CAPTAIN_REST, NOTICE, NOTICE_CAP, PARLEY_RELIEF, STANDING_FLOOR, TIERS, type Tier,
} from '../content/factions';
import { CAPTAIN_BY_ID, form, meet, meetingLine, newMemory, type CaptainCall, type CaptainMemory, type Report } from './captains';
import type { Standing } from './comms';
import { ALIEN_TYPES, VARIANTS, type Faction } from './enemies';
import type { Rng } from './rng';
import type { RunStats } from './run';

// ── notice and nemeses ────────────────────────────────────────────────────
// Per faction, how much it has marked the Wayward, and what that brings. The
// numbers are rows in content/factions.ts; this module keeps the score across
// a journey and says what a sortie should feel of it.
//
//   notice  · points: kills raise it (up to a cap), days let it fade. Its tier (quiet,
//             warning, toll, hunters, captain) is what the sortie reads:
//             cards that know you, dearer fees, a harder pursuit.
//   standing · kills cost standing with whoever the faction answers to, a
//             point for every so much notice, down to a floor.
//   captains · at the top tier the faction names a captain (sim/captains.ts:
//             a capital ship with a name, a face, a personality and a
//             memory). They come into a system after a rest between
//             meetings, and every meeting is remembered and changes them.
//             Beaten CAPTAIN_LIVES times, or killed, and they are gone, and
//             the faction's next captain takes up your file.

/** Gutter crews hunting you: this much more of the pursuit comes from ahead. */
export const GUTTER_HUNT = 0.15;

export interface FactionState {
  notice: number;
  tier: Tier;
  /** Standing owed but not yet lost (a fraction of a point). */
  owed: number;
}

/** A named captain on your file, and what they remember (sim/captains.ts). */
export type Captain = CaptainMemory;

export interface Notice {
  by: Partial<Record<Faction, FactionState>>;
  /** Captains who are after you now. */
  captains: Captain[];
  /** Captains beaten for good, by id. */
  fallen: string[];
}

export type { CaptainCall };

/** What a sortie feels of the notice it flies under. */
export interface Pressure {
  tiers: Partial<Record<Faction, Tier>>;
  /** Fee multipliers by faction (only those at toll or above). */
  toll: Partial<Record<Faction, number>>;
  /** A multiplier on the pursuit's interval, extra elite chance, and extra share of Gutter crews from ahead. */
  pursuit: number;
  elite: number;
  gutter: number;
  captain: CaptainCall | null;
}

export const QUIET: Pressure = { tiers: {}, toll: {}, pursuit: 1, elite: 0, gutter: 0, captain: null };

export const newNotice = (): Notice => ({ by: {}, captains: [], fallen: [] });

const round = (v: number) => Math.round(v * 100) / 100;
const rank = (t: Tier) => TIERS.indexOf(t);
/** At least this tier. */
export const atLeast = (t: Tier | undefined, min: Tier) => rank(t ?? 'quiet') >= rank(min);

/** The tier a faction's notice puts it at. */
export function tierOf(f: Faction, notice: number): Tier {
  const at = NOTICE[f].at;
  let t: Tier = 'quiet';
  for (const k of TIERS) if (k !== 'quiet' && notice >= at[k]) t = k;
  return t;
}

const state = (n: Notice, f: Faction): FactionState => (n.by[f] ??= { notice: 0, tier: 'quiet', owed: 0 });

export const noticeOf = (n: Notice, f: Faction) => n.by[f]?.notice ?? 0;
export const tier = (n: Notice, f: Faction): Tier => n.by[f]?.tier ?? 'quiet';
/** The captain on a faction's file, if one is named. */
export const captainOf = (n: Notice, f: Faction) => n.captains.find((c) => CAPTAIN_BY_ID[c.id]?.faction === f) ?? null;

/** The notice a sortie's kills come to, by faction: each hull by its role, each capital ship by its faction. */
export function noticeFromRun(run: Pick<RunStats, 'killsByKind' | 'capitalFactions'>): Partial<Record<Faction, number>> {
  const out: Partial<Record<Faction, number>> = {};
  const add = (f: Faction, v: number) => { out[f] = (out[f] ?? 0) + v; };
  for (const [variant, k] of Object.entries(run.killsByKind)) {
    const v = VARIANTS[variant];
    if (!v) continue;
    add(v.faction, NOTICE[v.faction].kill[ALIEN_TYPES[v.kind].role] * k);
  }
  for (const f of run.capitalFactions) if (f in NOTICE) add(f as Faction, NOTICE[f as Faction].kill.capital);
  return out;
}

/** The next captain on a faction's roster, if it has one left. */
function nameCaptain(n: Notice, f: Faction): Captain | null {
  const id = NOTICE[f].captains.find((x) => CAPTAIN_BY_ID[x] && !n.fallen.includes(x) && !n.captains.some((c) => c.id === x));
  if (!id) return null;
  const c = newMemory(id);
  n.captains.push(c);
  return c;
}

/** Set a faction's tier from its notice. Returns the log lines for any tier newly reached on the way up. */
function retier(n: Notice, f: Faction): string[] {
  const s = state(n, f);
  const was = s.tier;
  s.tier = tierOf(f, s.notice);
  const lines: string[] = [];
  for (const t of TIERS.slice(rank(was) + 1, rank(s.tier) + 1)) if (t !== 'quiet') lines.push(tr(NOTICE[f].lines[t]));
  if (s.tier === 'captain' && !captainOf(n, f)) {
    const c = nameCaptain(n, f);
    if (c) lines.push(tr('{name} of the {ship} is coming for you', { name: CAPTAIN_BY_ID[c.id]!.name, ship: CAPTAIN_BY_ID[c.id]!.ship }));
  }
  return lines;
}

/**
 * A faction marks you: `points` of notice (negative to ease it), and the
 * standing that costs. `standing` is changed in place. Returns the log lines
 * for what the notice brought.
 */
export function raise(n: Notice, f: Faction, points: number, standing: Partial<Record<Standing, number>>): string[] {
  if (!points) return [];
  const s = state(n, f);
  s.notice = round(Math.min(NOTICE[f].at.captain * NOTICE_CAP, Math.max(0, s.notice + points)));
  const key = NOTICE[f].standing;
  if (points > 0 && key) {
    s.owed += points / NOTICE[f].standingPer;
    const lost = Math.floor(s.owed + 1e-9);
    if (lost > 0) { standing[key] = Math.min(standing[key] ?? 0, Math.max(STANDING_FLOOR, (standing[key] ?? 0) - lost)); s.owed -= lost; }
    s.owed = round(s.owed);
  }
  return retier(n, f);
}

/** Days pass: notice fades, and a tier can fall back. A named captain stays named. */
export function cool(n: Notice, days: number): void {
  for (const f of Object.keys(n.by) as Faction[]) {
    const s = state(n, f);
    s.notice = round(Math.max(0, s.notice - NOTICE[f].decay * days));
    retier(n, f);
  }
}

/**
 * What a meeting came to, remembered. Returns the log lines. A beaten ship
 * is a scar or a death, by the captain's luck; beaten CAPTAIN_LIVES times
 * or killed and they are gone. Beaten, paid or turned away, the faction's
 * notice eases.
 */
export function remember(n: Notice, id: string, report: Report, day: number, standing: Partial<Record<Standing, number>>, rng: Rng): string[] {
  const c = n.captains.find((x) => x.id === id);
  const def = CAPTAIN_BY_ID[id];
  if (!c || !def) return [];
  const met = meet(c, report, day, rng);
  c.rest = round(day + CAPTAIN_REST);
  const f = def.faction;
  const lines = [meetingLine(id, met)];
  if (met === 'scarred' || met === 'killed') raise(n, f, -noticeOf(n, f) * BEATEN_RELIEF, standing);
  else if (met === 'bargained' || met === 'left') raise(n, f, -noticeOf(n, f) * PARLEY_RELIEF, standing);
  if (met === 'killed' || c.scarred >= CAPTAIN_LIVES) {
    n.captains.splice(n.captains.indexOf(c), 1);
    n.fallen.push(c.id);
    if (met !== 'killed') lines.push(tr('{name} won’t come again', { name: def.name }));
  }
  // a fall can leave the faction still at the top: the next captain takes it up
  if (tier(n, f) === 'captain' && !captainOf(n, f)) {
    const next = nameCaptain(n, f);
    if (next) lines.push(tr('{name} of the {ship} takes up your file', { name: CAPTAIN_BY_ID[next.id]!.name, ship: CAPTAIN_BY_ID[next.id]!.ship }));
  }
  return lines;
}

/** What a sortie on `day` feels: every faction's tier, the fees, the pursuit, and the captain who calls (the most marked faction's, once she has rested). */
export function pressure(n: Notice, day: number): Pressure {
  const p: Pressure = { tiers: {}, toll: {}, pursuit: 1, elite: 0, gutter: 0, captain: null };
  let best: Captain | null = null, bestV = -Infinity;
  for (const f of Object.keys(n.by) as Faction[]) {
    const t = tier(n, f);
    if (t === 'quiet') continue;
    const row = NOTICE[f];
    p.tiers[f] = t;
    if (atLeast(t, 'toll')) p.toll[f] = row.toll;
    if (atLeast(t, 'hunters')) {
      if (f === 'gutter') p.gutter += GUTTER_HUNT;
      else p.pursuit *= row.hunt;
      p.elite += row.elite;
    }
    const c = t === 'captain' ? captainOf(n, f) : null;
    if (c && c.rest <= day + 1e-9) {
      const v = noticeOf(n, f) / row.at.captain;
      if (v > bestV) { bestV = v; best = c; }
    }
  }
  if (best) {
    const def = CAPTAIN_BY_ID[best.id]!;
    p.captain = { id: best.id, faction: def.faction, name: def.name, ship: form(def, best).ship, at: CAPTAIN_AT, memory: { ...best } };
  }
  return p;
}

/** One faction's line on the chart's notice readout. */
export interface NoticeLine {
  faction: Faction;
  name: string;
  tier: Tier;
  notice: number;
  /** The next tier up and the notice it begins at (null at the top). */
  next: { tier: Tier; at: number } | null;
  /** Standing with whoever the faction answers to (null: nobody you can stand with). */
  standing: number | null;
  /** The captain on the faction's file, and the day they can come again. */
  captain: { name: string; ship: string; rest: number } | null;
}

/** What the chart shows of the notice: every faction that has marked you, most marked first. */
export function readout(n: Notice, standing: Partial<Record<Standing, number>>): NoticeLine[] {
  const out: NoticeLine[] = [];
  for (const f of Object.keys(n.by) as Faction[]) {
    const v = noticeOf(n, f), t = tier(n, f), c = captainOf(n, f), row = NOTICE[f];
    if (v <= 0 && t === 'quiet' && !c) continue;
    const up = TIERS[rank(t) + 1];
    const def = c ? CAPTAIN_BY_ID[c.id] : undefined;
    out.push({
      faction: f, name: row.name, tier: t, notice: v,
      next: up && up !== 'quiet' ? { tier: up, at: row.at[up] } : null,
      standing: row.standing ? standing[row.standing] ?? 0 : null,
      captain: c && def ? { name: def.name, ship: form(def, c).ship, rest: c.rest } : null,
    });
  }
  return out.sort((a, b) => rank(b.tier) - rank(a.tier) || b.notice / NOTICE[b.faction].at.captain - a.notice / NOTICE[a.faction].at.captain);
}
