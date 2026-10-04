import { MODIFIERS, UNLOCKS, type Lifetime, type UnlockDef } from '../content/unlocks';
import type { RunStats } from '../sim/run';

// ── the pilot's record, between runs ──────────────────────────────────────
// Bests, lifetime totals, the last few runs and what long-term progression
// has opened, kept in localStorage. The simulation never sees this file: the
// app reads the unlocked ids out of it and hands them to the world.
// Storage can be missing or refuse (private windows, blocked site data), so
// every read and write is guarded and the game plays the same without it.

// The storage key keeps the game's old name, so saved profiles carry over.
const KEY = 'asteroid-blaster.profile.v1';
const HISTORY = 20;

export interface Best {
  score: number;
  time: number;
  chain: number;
  krail: number;
  overcharges: number;
  capitals: number;
  kills: number;
  refit: number;
}

export interface RunRecord {
  at: number;
  score: number;
  time: number;
  refit: number;
  identity: string;
  cause: string;
}

export interface Profile {
  version: 1;
  best: Best;
  /** The score curve of the best-scoring run, for the report's chart. */
  bestCurve: Array<{ t: number; score: number }>;
  life: Lifetime;
  history: RunRecord[];
  /** Unlock ids earned. */
  earned: string[];
  /** Challenge modifiers switched on for the next run, and the engine colour. */
  modifiers: string[];
  cosmetic: string;
  /** The camera distance last chosen (an index into the zoom steps). */
  zoom: number;
}

const fresh = (): Profile => ({
  version: 1,
  best: { score: 0, time: 0, chain: 0, krail: 0, overcharges: 0, capitals: 0, kills: 0, refit: 0 },
  bestCurve: [],
  life: { runs: 0, kills: 0, capitals: 0, krail: 0, capitalsBy: {}, bestTime: 0, bestScore: 0 },
  history: [],
  earned: [],
  modifiers: [],
  cosmetic: 'engine-stock',
  zoom: 1,
});

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const p = migrate(JSON.parse(raw) as Record<string, any>) as Partial<Profile>;
    const f = fresh();
    return { ...f, ...p, best: { ...f.best, ...p.best }, life: { ...f.life, ...p.life } } as Profile;
  } catch {
    return fresh();
  }
}

/** Faction ids before the WAYWARD rename, and what they became. */
const OLD_FACTIONS: Record<string, string> = { klingon: 'gutter', cardassian: 'custody', romulan: 'office', borg: 'voice', tholian: 'thren' };

/**
 * Profiles saved before the WAYWARD rename carry the old names: dilithium
 * for Krail, and the old faction ids in the capital-ship tally. Move them across,
 * so bests and unlocks survive. A profile already renamed passes through.
 */
export function migrate(p: Record<string, any>): Record<string, any> {
  for (const k of ['best', 'life']) {
    const o = p[k];
    if (o && 'dilithium' in o) {
      o.krail = Math.max(o.krail ?? 0, o.dilithium);
      delete o.dilithium;
    }
  }
  const by = p.life?.capitalsBy;
  if (by) {
    for (const [old, now] of Object.entries(OLD_FACTIONS)) {
      if (old in by) {
        by[now] = (by[now] ?? 0) + by[old];
        delete by[old];
      }
    }
  }
  return p;
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage refused: the run still counts for this session
  }
}

/** Every id the profile's unlocks open (upgrades, events, modifiers, cosmetics). */
export function grants(p: Profile): string[] {
  return UNLOCKS.filter((u) => p.earned.includes(u.id)).flatMap((u) => u.grants);
}

/** Modifiers the player may switch on: earned ones only. */
export function availableModifiers(p: Profile): string[] {
  const g = new Set(grants(p));
  return Object.keys(MODIFIERS).filter((m) => g.has(m));
}

export interface Recorded {
  /** The bests before this run, to compare against. */
  previous: Best;
  previousCurve: Array<{ t: number; score: number }>;
  newBest: boolean;
  unlocked: UnlockDef[];
}

/** Fold a finished run into the profile. Returns what the report needs. */
export function recordRun(p: Profile, r: RunStats): Recorded {
  const previous = { ...p.best }, previousCurve = p.bestCurve;
  const newBest = r.score > p.best.score;
  const b = p.best;
  b.score = Math.max(b.score, r.score);
  b.time = Math.max(b.time, r.time);
  b.chain = Math.max(b.chain, r.bestChain);
  b.krail = Math.max(b.krail, r.krail);
  b.overcharges = Math.max(b.overcharges, r.overcharges);
  b.capitals = Math.max(b.capitals, r.capitals);
  b.kills = Math.max(b.kills, r.kills);
  b.refit = Math.max(b.refit, r.refit);
  if (newBest) p.bestCurve = r.timeline.map(({ t, score }) => ({ t, score }));
  const l = p.life;
  l.runs++;
  l.kills += r.kills;
  l.capitals += r.capitals;
  l.krail += r.krail;
  for (const f of r.capitalFactions) l.capitalsBy[f] = (l.capitalsBy[f] ?? 0) + 1;
  l.bestTime = b.time;
  l.bestScore = b.score;
  p.history.unshift({ at: Date.now(), score: r.score, time: r.time, refit: r.refit, identity: r.identity, cause: r.cause });
  p.history.length = Math.min(p.history.length, HISTORY);
  const unlocked = UNLOCKS.filter((u) => !p.earned.includes(u.id) && u.earned(r, l));
  for (const u of unlocked) p.earned.push(u.id);
  saveProfile(p);
  return { previous, previousCurve, newBest, unlocked };
}
