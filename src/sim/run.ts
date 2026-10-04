import type { Levels } from './build';

// ── the run's record ──────────────────────────────────────────────────────
// Everything worth knowing about a run once it is over, kept as it happens:
// where the score came from, what killed what, what hurt the ship and what
// mended it. The summary screen reads it to say what kind of run it was;
// the scripted pilot reads it to balance the game (plates lost against
// plates gained, the real sources of damage, how long builds survive).

export type Weapon = 'laser' | 'torpedo' | 'mine' | 'plasma' | 'arc' | 'ram' | 'overcharge' | 'hazard';
export type ScoreSource = 'time' | 'kills' | 'rocks' | 'krail' | 'capitals' | 'events' | 'overcharge';

export interface RunStats {
  seed: number;
  time: number;
  score: number;
  scoreBy: Record<ScoreSource, number>;
  kills: number;
  killsBy: Record<Weapon, number>;
  killsByKind: Record<string, number>;
  elites: number;
  rocks: number;
  /** Krail collected (crystal value, before the matrix), and dropped in all. */
  krail: number;
  dropped: number;
  refit: number;
  overcharges: number;
  grazes: number;
  bestChain: number;
  capitals: number;
  capitalsEvaded: number;
  capitalsEscaped: number;
  capitalFactions: string[];
  platesLost: number;
  platesGained: number;
  shieldsAbsorbed: number;
  /** Plates and shield charges lost, by what did it. */
  damageBy: Record<string, number>;
  events: number;
  eventsWon: number;
  powerups: number;
  /** One sample every TIMELINE seconds. */
  timeline: Array<{ t: number; score: number; plates: number; refit: number }>;
  build: Levels;
  identity: string;
  modifiers: string[];
  /** What ended it. */
  cause: string;
}

export const TIMELINE = 10;

export function newRun(seed: number, modifiers: string[] = []): RunStats {
  return {
    seed, time: 0, score: 0,
    scoreBy: { time: 0, kills: 0, rocks: 0, krail: 0, capitals: 0, events: 0, overcharge: 0 },
    kills: 0, killsBy: { laser: 0, torpedo: 0, mine: 0, plasma: 0, arc: 0, ram: 0, overcharge: 0, hazard: 0 },
    killsByKind: {}, elites: 0, rocks: 0, krail: 0, dropped: 0, refit: 0, overcharges: 0, grazes: 0, bestChain: 0,
    capitals: 0, capitalsEvaded: 0, capitalsEscaped: 0, capitalFactions: [],
    platesLost: 0, platesGained: 0, shieldsAbsorbed: 0, damageBy: {}, events: 0, eventsWon: 0, powerups: 0,
    timeline: [], build: {}, identity: '', modifiers, cause: '',
  };
}

/** The weapon that did most of the killing, and its share. */
export function mainWeapon(r: RunStats): { weapon: Weapon; share: number } {
  let best: Weapon = 'laser', n = -1, total = 0;
  for (const [w, k] of Object.entries(r.killsBy) as Array<[Weapon, number]>) {
    total += k;
    if (k > n) { n = k; best = w; }
  }
  return { weapon: best, share: total ? n / total : 0 };
}
