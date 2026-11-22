import type { Breakout } from './breakout';

// ── story places ──────────────────────────────────────────────────────────
// A story beat happens somewhere she can see (owner 2026-11-21, "Tie the
// story to places and play"): a skiff to hold alongside, a wreck to read, a
// canister to take aboard. Each place is a mark on the scope and the HUD, set
// out along the course of its stop, with one thing to do there:
//
//   hold    · stay inside its ring, slow, for a few seconds (the ring fills)
//   pickup  · fly over it: it comes aboard
//
// Done, it sets its flag and goes off the scope; the stop's script rows
// trigger on that flag (content/script/). A main beat that waits on a place
// holds the Jump Gate for as long as it takes, and the gate names the place.
// Plain data: the flag is the only state that is saved.

export type PlaceLook = 'skiff' | 'ferry' | 'wreck' | 'canister' | 'buoy';

export interface StoryPlaceDef {
  id: string;
  /** The stop it belongs to (content/road.ts `script`). */
  stop: string;
  /** English, for t(). */
  name: string;
  look: PlaceLook;
  /** Where: units ahead of the arrival, toward the Jump Gate, and units off the line (+ starboard, − port). Close, so she sees it from where she comes in (owner 2026-11-22). */
  along: number;
  off: number;
  /** Hold: seconds to hold inside the ring. Pickup: fly over it. */
  act: { hold: number } | { pickup: true };
  /** The ring (units). */
  r: number;
  /** Set when it is done: the script's rows trigger on it. */
  done: string;
  /** On the scope only once this flag is set (from arrival when absent). */
  show?: string;
  /** On the scope only once this script row has played (a line that points to it). */
  after?: string;
  /** Not needed once any of these is set (the beat came another way): counts as done. */
  skip?: string[];
  /** What to do there, for the HUD (English, for t()). */
  verb: string;
  /** A pickup on a trail toward the gate (Yard Nine's breaker line): it may stand further out than the first beat. */
  trail?: boolean;
}

/** Slow enough to count as holding (units a second). */
export const HOLD_SLOW = 6;
/** A pickup comes aboard this close to its centre (units). */
export const PICK_R = 6;
/** Rock and bulwarks are kept this far outside a live place's ring, so she can hold there. */
export const PLACE_CLEAR = 18;

/** Where a place stands in a sortie: laid out from the start (0, 0) toward the Jump Gate, never past half the way there. */
export function placeAt(def: StoryPlaceDef, b: Pick<Breakout, 'lane'>): { x: number; z: number } {
  const d = Math.hypot(b.lane.x, b.lane.z) || 1, fx = b.lane.x / d, fz = b.lane.z / d, rx = -fz, rz = fx;
  const a = Math.min(def.along, d / 2);
  return { x: fx * a + rx * def.off, z: fz * a + rz * def.off };
}

/**
 * The place this stop shows now: the first not yet done whose time has come (one at a time, so the course is never in doubt).
 * `spent` says a place's beat has already played (a reload mid-stop, or the gate let it go): it is not shown again.
 */
export function livePlace(defs: readonly StoryPlaceDef[], stop: string | undefined, flags: ReadonlySet<string>, played: (row: string) => boolean = () => true, spent: (place: string) => boolean = () => false): StoryPlaceDef | null {
  if (!stop) return null;
  return defs.find((p) => p.stop === stop && !placeDone(p, flags) && !spent(p.id) && (!p.show || flags.has(p.show)) && (!p.after || played(p.after))) ?? null;
}

/** A place is done: its flag is set, or the beat came another way. */
export const placeDone = (p: StoryPlaceDef, flags: ReadonlySet<string>): boolean => flags.has(p.done) || (p.skip ?? []).some((f) => flags.has(f));

/** Every place of a stop not yet done, shown or not (the script's sites). */
export function stopPlaces(defs: readonly StoryPlaceDef[], stop: string | undefined, flags: ReadonlySet<string>): StoryPlaceDef[] {
  return stop ? defs.filter((p) => p.stop === stop && !placeDone(p, flags)) : [];
}

/**
 * One step at a live place. `hold` is the seconds held so far; returns the new hold and whether it is done now. A hold drains
 * slowly when she leaves the ring or speeds up, so a brush past does not count but a short drift out costs little.
 */
export function stepPlace(def: StoryPlaceDef, at: { x: number; z: number }, s: { x: number; z: number; vx: number; vz: number }, hold: number, dt: number, free: boolean): { hold: number; done: boolean } {
  const d = Math.hypot(s.x - at.x, s.z - at.z);
  if ('pickup' in def.act) return { hold: 0, done: d <= PICK_R };
  const inside = d <= def.r && Math.hypot(s.vx, s.vz) <= HOLD_SLOW && free;
  const h = inside ? hold + dt : Math.max(0, hold - dt * 0.5);
  return { hold: h, done: h >= def.act.hold };
}
