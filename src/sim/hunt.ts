import { routeBetween, type Chart } from './chart';

// ── the hunt ──────────────────────────────────────────────────────────────
// Prefect Idris Calloway follows the Wayward personally. She does not guess:
// she follows the trail, the systems you have flown in the order you flew
// them, a lane at a time. Each lane takes her as long as it took you, and
// then she spends half a day in the system asking questions before she
// picks the trail up again. So she gains on you only while you linger, and
// a run that keeps moving stays ahead.
//
//   delay    · days she is held up before she moves again: a false trail, a
//              lie that has to be checked, repairs after a fight.
//   caught   · when she reaches the system you are in, she comes for you.
//              That is an encounter (a comms card, then perhaps her ship),
//              not the end: you can run, fight, decoy or talk. Only a wreck
//              while she is in the system ends the journey.
//   the shadow · the chart shows where she was last seen, which is only
//              where she is when she is close or your sensors are good.

/** Days she spends in each system before she picks the trail up. */
export const SEARCH = 0.3;
/** Days' start you have when you leave Cerro (on top of the lane she has to cross after you). */
export const HUNT_START = 1;
/** Days she loses to a beating. */
export const BEATEN_DELAY = 4;

export interface Hunt {
  /** Her position: an index into the trail, and days spent toward the next system on it. */
  idx: number;
  progress: number;
  /** Days before she moves again. */
  delay: number;
  /** Where she was last seen (a trail index) and when. */
  seenIdx: number;
  seenDay: number;
  /** Times she has caught up, and times her ship was beaten. */
  caught: number;
  beaten: number;
}

export function newHunt(): Hunt {
  return { idx: 0, progress: 0, delay: HUNT_START, seenIdx: 0, seenDay: 0, caught: 0, beaten: 0 };
}

/** Days it takes her to cover the trail from index i to i + 1 and take up the scent. */
export function leg(c: Chart, trail: readonly string[], i: number): number {
  const a = trail[i], b = trail[i + 1];
  if (!a || !b) return Infinity;
  if (a === b) return SEARCH;
  return (routeBetween(c, a, b)?.days ?? 1) + SEARCH;
}

/** She moves on for `days`. Returns true if she reaches the end of the trail (your system) on the way. */
export function huntOn(h: Hunt, c: Chart, trail: readonly string[], days: number): boolean {
  // she sets out once you have left Cerro: the Breakout is the yards' business
  if (trail.length < 2) return false;
  let left = days;
  if (h.delay > 0) { const d = Math.min(h.delay, left); h.delay -= d; left -= d; }
  while (left > 1e-9 && h.idx < trail.length - 1) {
    const need = leg(c, trail, h.idx) - h.progress;
    if (left < need) { h.progress += left; left = 0; break; }
    left -= need;
    h.idx++;
    h.progress = 0;
  }
  return h.idx >= trail.length - 1;
}

/** Jumps she is behind you. */
export const behind = (h: Hunt, trail: readonly string[]) => Math.max(0, trail.length - 1 - h.idx);

/** Days until she reaches your system, if you stay put (0: she is here). */
export function daysUntil(h: Hunt, c: Chart, trail: readonly string[]): number {
  let d = h.delay - h.progress;
  for (let i = h.idx; i < trail.length - 1; i++) d += leg(c, trail, i);
  return Math.max(0, h.idx >= trail.length - 1 ? 0 : d);
}
