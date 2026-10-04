import {
  BEATEN_RELIEF, CAPTAIN_AT, CAPTAIN_HP, CAPTAIN_HP_BEATEN, CAPTAIN_HP_ESCAPE, CAPTAIN_LIVES, CAPTAIN_REST, NOTICE, NOTICE_CAP, PARLEY_RELIEF, STANDING_FLOOR, TIERS,
  type Personality, type Tier,
} from '../content/factions';
import type { Standing } from './comms';
import { ALIEN_TYPES, VARIANTS, type Faction } from './enemies';
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
//   captains · at the top tier the faction names a captain. She is a capital
//             ship with a name, a personality and a memory: she comes once a
//             system (after a rest between meetings), and every meeting is
//             remembered. Get away from her and she comes back tougher; beat
//             her and she limps off to come back with a grudge, until she
//             has been beaten enough and is gone; bargain and she leaves you
//             be a while; win, and she knows it.

/** Gutter crews hunting you: this much more of the pursuit comes from ahead. */
export const GUTTER_HUNT = 0.15;

export interface FactionState {
  notice: number;
  tier: Tier;
  /** Standing owed but not yet lost (a fraction of a point). */
  owed: number;
}

/** What a meeting with a captain came to: you beat her, got away from her, she beat you, or you parted on terms. */
export type CaptainResult = 'beaten' | 'escaped' | 'won' | 'parted';

export interface Captain {
  id: string;
  faction: Faction;
  name: string;
  ship: string;
  personality: Personality;
  /** Meetings, and how each kind ended. */
  met: number;
  beaten: number;
  escapes: number;
  wins: number;
  parted: number;
  /** The day before which she does not come again. */
  rest: number;
}

export interface Notice {
  by: Partial<Record<Faction, FactionState>>;
  /** Captains who are after you now. */
  captains: Captain[];
  /** Captains beaten for good, by id. */
  fallen: string[];
}

/** A captain's call in a sortie: who, when, and how hard. */
export interface CaptainCall {
  id: string;
  faction: Faction;
  name: string;
  ship: string;
  personality: Personality;
  /** Seconds into the sortie she calls, and her hull against a blockade's. */
  at: number;
  hp: number;
  /** She has met you before, and how it went. */
  rematch: boolean;
  beaten: number;
  escapes: number;
  wins: number;
}

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
export const captainOf = (n: Notice, f: Faction) => n.captains.find((c) => c.faction === f) ?? null;

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
  const def = NOTICE[f].captains.find((c) => !n.fallen.includes(c.id) && !n.captains.some((x) => x.id === c.id));
  if (!def) return null;
  const c: Captain = { ...def, faction: f, met: 0, beaten: 0, escapes: 0, wins: 0, parted: 0, rest: 0 };
  n.captains.push(c);
  return c;
}

/** Set a faction's tier from its notice. Returns the log lines for any tier newly reached on the way up. */
function retier(n: Notice, f: Faction): string[] {
  const s = state(n, f);
  const was = s.tier;
  s.tier = tierOf(f, s.notice);
  const lines: string[] = [];
  for (const t of TIERS.slice(rank(was) + 1, rank(s.tier) + 1)) if (t !== 'quiet') lines.push(NOTICE[f].lines[t]);
  if (s.tier === 'captain' && !captainOf(n, f)) {
    const c = nameCaptain(n, f);
    if (c) lines.push(`${c.name} of the ${c.ship} is coming for you`);
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

/** A captain's hull: tougher for every time you got away from her, and every time she came back from a beating. */
export const captainHp = (c: Captain) => CAPTAIN_HP * (1 + CAPTAIN_HP_ESCAPE * c.escapes + CAPTAIN_HP_BEATEN * c.beaten);

/**
 * What a meeting came to, remembered. Returns the log lines. Beaten
 * `CAPTAIN_LIVES` times and she is gone (the faction's notice eases with
 * her); beaten or bargained with, the faction's notice eases.
 */
export function remember(n: Notice, id: string, result: CaptainResult, day: number, standing: Partial<Record<Standing, number>>): string[] {
  const c = n.captains.find((x) => x.id === id);
  if (!c) return [];
  c.met++;
  c.rest = round(day + CAPTAIN_REST);
  const f = c.faction;
  const lines: string[] = [];
  switch (result) {
    case 'beaten':
      c.beaten++;
      raise(n, f, -noticeOf(n, f) * BEATEN_RELIEF, standing);
      if (c.beaten >= CAPTAIN_LIVES) {
        n.captains.splice(n.captains.indexOf(c), 1);
        n.fallen.push(c.id);
        lines.push(`${c.name} will not come again`);
      } else lines.push(`${c.name} limps away · she will be back, and she will remember`);
      break;
    case 'escaped':
      c.escapes++;
      lines.push(`You got away from ${c.name} · she is refitting for the next time`);
      break;
    case 'won':
      c.wins++;
      lines.push(`${c.name} broke the Wayward · she will tell it in every bar`);
      break;
    case 'parted':
      c.parted++;
      raise(n, f, -noticeOf(n, f) * PARLEY_RELIEF, standing);
      lines.push(`${c.name} takes her terms and lets you be, for now`);
      break;
  }
  // a fall can leave the faction still at the top: the next captain takes it up
  if (tier(n, f) === 'captain' && !captainOf(n, f)) {
    const next = nameCaptain(n, f);
    if (next) lines.push(`${next.name} of the ${next.ship} takes up your file`);
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
    p.captain = {
      id: best.id, faction: best.faction, name: best.name, ship: best.ship, personality: best.personality, at: CAPTAIN_AT, hp: round(captainHp(best)),
      rematch: best.met > 0, beaten: best.beaten, escapes: best.escapes, wins: best.wins,
    };
  }
  return p;
}
