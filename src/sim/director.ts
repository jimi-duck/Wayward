import { clamp } from '../core/math';
import { FIELD_TARGET, HZ, PX } from './tuning';

// ── the director ──────────────────────────────────────────────────────────
// No waves. Everything that makes the sector harder is a smooth function of
// how long the run has lasted, read from here by the field, the spawner, the
// enemy guns and the capital ships, so the whole curve can be read (and
// tuned) in one place.
//
// The shape is a slow burn. The first forty seconds are yours alone: a thin
// field of slow rock to learn the ship on and mine the first refit out of.
// Then the arcade's hulls come in encounters (sim/pacing.ts): a group,
// one or two at first, arriving a few seconds apart, then a quiet spell once
// it is beaten or shaken off. The groups grow with the clock (and the
// refits, in the pacing), the quiet spells shorten, and the ceiling holds the
// most hulls at once. Density, speed and toughness climb steadily; enemy
// variety opens up over the first five minutes; from two and a half minutes
// elites start to appear, from three squads, and from four the factions mix,
// so the build-up begins before the first capital ship rather than with it. Late difficulty
// leans on combinations (squads, elites, faction mixes, hazardous rock) more
// than on raw numbers: the counts level off while the combinations keep
// coming.
//
// Every curve is in minutes, m. `Mods` scales the whole thing for the
// survival mode chosen on the title (content/survival.ts `sky`).

export interface Mods {
  /** Multiplier on enemy spawn rate and ceiling. */
  traffic: number;
  /** Multiplier on enemy hull. */
  toughness: number;
  /** Multiplier on the time between an enemy's volleys: below 1 they fire oftener. */
  fire: number;
  /** Multiplier on the chance of an elite and of a squad. */
  elites: number;
  /** Multiplier on the share of rock that is clustered, shepherded or volatile. */
  hazard: number;
  /** Multiplier on the Krail the arcade's rock and wrecks drop (the Story's rows are in the mode's `rock` and `salvage`). */
  income: number;
}

export const NO_MODS: Mods = { traffic: 1, toughness: 1, fire: 1, elites: 1, hazard: 1, income: 1 };

const V = PX * HZ;

export interface Pressure {
  m: number;
  /** Seconds between the hulls of one encounter arriving. */
  enemyInterval: number;
  /** Most regular hulls at once. */
  enemyCap: number;
  /** Hulls an encounter brings, before the refits add to it (sim/pacing.ts rounds it). */
  groupSize: number;
  /** Seconds of quiet after an encounter, before the next. */
  lull: number;
  /** Multiplier on enemy hull points. */
  enemyHp: number;
  /** Base seconds between an enemy's volleys (each type scales it). */
  fireCd: number;
  /** Enemy shot speed, units/s. */
  shotSpeed: number;
  /** Aim error, radians either side. */
  spread: number;
  eliteChance: number;
  /** Chance the next spawn is a squad rather than one hull. */
  squadChance: number;
  /** How strongly spawns favour the current theatre's faction (1 = not at all). */
  theatre: number;
  /** Rock: how many large rocks' worth to keep around the ship, and how fast and tough it is. */
  fieldTarget: number;
  rockSpeed: number;
  rockHp: number;
  /** Of new rock: chances of a cluster, a shepherd (a big rock in its own debris), iron, volatile, rich. */
  cluster: number;
  shepherd: number;
  iron: number;
  volatile: number;
  rich: number;
}

export function pressure(t: number, mods: Mods = NO_MODS): Pressure {
  const m = Math.max(0, t) / 60;
  const late = Math.max(0, m - 8);
  return {
    m,
    enemyInterval: Math.max(1.2, 3.4 - 0.22 * m) / mods.traffic,
    enemyCap: Math.round(clamp(1.1 * m + 0.2, 1, 10) * mods.traffic),
    groupSize: clamp(1 + 0.6 * m, 1, 8) * mods.traffic,
    lull: Math.max(9, 18 - 1.1 * m) / mods.traffic,
    enemyHp: (1 + 0.17 * m + 0.06 * late) * mods.toughness,
    fireCd: Math.max(0.62, 2.2 - 0.17 * m) * mods.fire,
    shotSpeed: Math.min(5.6, 3.1 + 0.42 * m) * V,
    spread: Math.max(0.07, 0.26 - 0.03 * m),
    eliteChance: clamp((m - 2.5) * 0.04, 0, 0.42) * mods.elites,
    squadChance: clamp((m - 3) * 0.06, 0, 0.55) * mods.elites,
    theatre: Math.max(1, 4 - Math.max(0, m - 4) * 0.75),
    fieldTarget: Math.min(60, FIELD_TARGET * 0.4 + 5 * m),
    rockSpeed: Math.min(1.9, 0.75 + 0.1 * m),
    rockHp: Math.min(2.6, 1 + 0.1 * m),
    cluster: clamp((m - 2) * 0.06, 0, 0.3) * mods.hazard,
    shepherd: clamp((m - 3) * 0.04, 0, 0.18) * mods.hazard,
    iron: clamp((m - 3) * 0.05, 0, 0.32),
    volatile: clamp((m - 5) * 0.03, 0, 0.14) * mods.hazard,
    rich: 0.035,
  };
}

// ── capital ships ─────────────────────────────────────────────────────────
// The first arrives at 3:30, once a build has a shape. Then one every 80s,
// closing by 5s a ship to a floor of 50s. Evading one brings the next one in
// sooner: the gap is cut to EVADE_GAP of itself. A faction's first capital
// ship of a run is lighter (INTRO_HP, sim/bosses.ts), and the Voice and the
// Thren, whose beams and webs are the hardest to read, are not dealt until
// 6:40 and 5:40 (FACTIONS), so the new things arrive one at a time.
export const BOSS_FIRST = 210;
export const bossGap = (n: number) => Math.max(50, 80 - n * 5);
export const EVADE_GAP = 0.55;
/** Hull points of the n-th capital ship of a run, before its faction's multiplier. The first is a lighter introduction. */
export const bossHp = (n: number, t: number) => (55 + n * 85 + n * n * 12) * (1 + 0.05 * (t / 60));

// ── sector events ─────────────────────────────────────────────────────────
export const EVENT_FIRST = 75;
export const eventGap = (n: number) => Math.max(50, 75 - n * 4);
