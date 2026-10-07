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
  /** Krail taken aboard for the refit bay (after the matrix), and spent there. */
  krailEarned: number;
  krailSpent: number;
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
  /** Of the plates gained, those the self-repair mended (the arcade). */
  platesMended: number;
  shieldsAbsorbed: number;
  /** Encounters sent (the arcade). */
  waves: number;
  /** Plates and shield charges lost, by what did it. */
  damageBy: Record<string, number>;
  events: number;
  eventsWon: number;
  powerups: number;
  /** One sample every TIMELINE seconds. */
  timeline: Array<{ t: number; score: number; plates: number; refit: number }>;
  build: Levels;
  identity: string;
  /** The survival mode it was played in (content/survival.ts). */
  survival: string;
  /** Where Krail, Cyrite, ore and parts came from, as they were dropped (not as collected): rock (cut or broken) and wrecks. */
  loot: Record<'rock' | 'wreck', Loot>;
  /** What ended it. */
  cause: string;
  /** The Breakout or the arcade. */
  mode: 'breakout' | 'arcade';
  /** The Story mode: out through the lane mouth; Cyrite collected, and left in the tank when it jumped. */
  escaped: boolean;
  cyrite: number;
  cyriteLeft: number;
  /** Ore taken aboard and sold; parts salvaged; rocks cut clean and fractured; seconds of cutting; times docked. */
  ore: number;
  oreSold: number;
  parts: number;
  cut: number;
  fractured: number;
  cutTime: number;
  docked: number;
  /** Every comms card answered: which, how, and whether it came off. Jobs finished. */
  cards: Array<{ id: string; choice: string; won: boolean; t: number }>;
  jobsDone: number;
  /** Ports docked at, by name. */
  ports: string[];
}

export interface Loot { krail: number; cyrite: number; ore: number; parts: number }
export const NO_LOOT = (): Loot => ({ krail: 0, cyrite: 0, ore: 0, parts: 0 });

export const TIMELINE = 10;

export function newRun(seed: number, survival = 'prospector'): RunStats {
  return {
    seed, time: 0, score: 0,
    scoreBy: { time: 0, kills: 0, rocks: 0, krail: 0, capitals: 0, events: 0, overcharge: 0 },
    kills: 0, killsBy: { laser: 0, torpedo: 0, mine: 0, plasma: 0, arc: 0, ram: 0, overcharge: 0, hazard: 0 },
    killsByKind: {}, elites: 0, rocks: 0, krail: 0, dropped: 0, krailEarned: 0, krailSpent: 0, refit: 0, overcharges: 0, grazes: 0, bestChain: 0,
    capitals: 0, capitalsEvaded: 0, capitalsEscaped: 0, capitalFactions: [],
    platesLost: 0, platesGained: 0, platesMended: 0, shieldsAbsorbed: 0, waves: 0, damageBy: {}, events: 0, eventsWon: 0, powerups: 0,
    timeline: [], build: {}, identity: '', survival, loot: { rock: NO_LOOT(), wreck: NO_LOOT() }, cause: '',
    mode: 'arcade', escaped: false, cyrite: 0, cyriteLeft: 0, ore: 0, oreSold: 0, parts: 0, cut: 0, fractured: 0, cutTime: 0, docked: 0,
    cards: [], jobsDone: 0, ports: [],
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
