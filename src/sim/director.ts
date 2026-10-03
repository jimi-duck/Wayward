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
// Then one hostile at a time, scouts only, until about a minute and a half;
// two or three by two minutes. Density, speed and toughness climb steadily
// from there; enemy variety opens up over the first five minutes; from four
// minutes elites and squads start to appear, and from five the factions mix.
// Late difficulty leans on combinations (squads, elites, faction mixes,
// hazardous rock) more than on raw numbers: the counts level off while the
// combinations keep coming.
//
// Every curve is in minutes, m. `Mods` scales the whole thing for the
// challenge modifiers a player can switch on between runs.

export interface Mods {
  /** Multiplier on enemy spawn rate and ceiling. */
  traffic: number;
  /** Multiplier on enemy hull. */
  toughness: number;
}

export const NO_MODS: Mods = { traffic: 1, toughness: 1 };

const V = PX * HZ;

export interface Pressure {
  m: number;
  /** Seconds between enemy spawns. */
  enemyInterval: number;
  /** Most regular hulls at once. */
  enemyCap: number;
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
    enemyInterval: Math.max(1.35, 9 - 0.9 * m) / mods.traffic,
    enemyCap: Math.round(clamp(1.35 * m - 0.2, 1, 13) * mods.traffic),
    enemyHp: (1 + 0.17 * m + 0.06 * late) * mods.toughness,
    fireCd: Math.max(0.62, 2.2 - 0.17 * m),
    shotSpeed: Math.min(5.6, 3.1 + 0.42 * m) * V,
    spread: Math.max(0.07, 0.26 - 0.03 * m),
    eliteChance: clamp((m - 4) * 0.045, 0, 0.42),
    squadChance: clamp((m - 4) * 0.07, 0, 0.55),
    theatre: Math.max(1, 4 - Math.max(0, m - 5) * 0.75),
    fieldTarget: Math.min(60, FIELD_TARGET * 0.4 + 5 * m),
    rockSpeed: Math.min(1.9, 0.75 + 0.1 * m),
    rockHp: Math.min(2.6, 1 + 0.1 * m),
    cluster: clamp((m - 2) * 0.06, 0, 0.3),
    shepherd: clamp((m - 3) * 0.04, 0, 0.18),
    iron: clamp((m - 3) * 0.05, 0, 0.32),
    volatile: clamp((m - 5) * 0.03, 0, 0.14),
    rich: 0.035,
  };
}

// ── capital ships ─────────────────────────────────────────────────────────
// The first arrives at 3:30, once a build has a shape. Then one every 80s,
// closing by 5s a ship to a floor of 50s. Evading one brings the next one in
// sooner: the gap is cut to EVADE_GAP of itself.
export const BOSS_FIRST = 210;
export const bossGap = (n: number) => Math.max(50, 80 - n * 5);
export const EVADE_GAP = 0.55;
/** Hull points of the n-th capital ship of a run, before its faction's multiplier. */
export const bossHp = (n: number, t: number) => (70 + n * 75 + n * n * 12) * (1 + 0.05 * (t / 60));

// ── sector events ─────────────────────────────────────────────────────────
export const EVENT_FIRST = 100;
export const eventGap = (n: number) => Math.max(55, 85 - n * 4);
