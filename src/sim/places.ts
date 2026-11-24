import type { Breakout } from './breakout';

// ── story places ──────────────────────────────────────────────────────────
// A story beat happens somewhere she can see (owner 2026-11-21, "Tie the
// story to places and play"): a skiff to hold alongside, a wreck to read, a
// canister to take aboard. Each place is a mark on the scope and the HUD, set
// out along the course of its stop, with one thing to do there:
//
//   hold    · a hull that comes to her (a skiff, a ferry): it flies out from
//             ahead, pulls alongside and keeps pace while they talk (the ring fills)
//   pickup  · handed across: the canister flies over from the hull alongside.
//             On a trail (Yard Nine), she flies close and it comes aboard
//   pass    · come close, at any speed: a set piece she flies by, on her line
//             to the Jump Gate
//
// The story comes to her (owner, 23 November 2026: "fly to this ship, then
// that ship, wait, pick up the paper"): she never stops, turns back or goes
// out of her way. A fixed place stands between her and the gate.
//
// Done, it sets its flag and goes off the scope; the stop's script rows
// trigger on that flag (content/script/). A main beat that waits on a place
// holds the Jump Gate for as long as it takes, and the gate names the place.
// Plain data: the flag is the only state that is saved.

export type PlaceLook = 'skiff' | 'ferry' | 'wreck' | 'canister' | 'buoy' | 'moot' | 'relay' | 'picket' | 'chorus' | 'spiral';

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
  /** Hold: seconds to hold inside the ring. Pickup: fly over it. Pass: come inside the ring, at any speed (a set piece she flies by). */
  act: { hold: number } | { pickup: true } | { pass: true };
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
  /** A hull's hail (a script row): it keeps station ahead of her until the line is heard, then comes alongside. */
  hail?: string;
  /** A pickup on a trail toward the gate (Yard Nine's breaker line): it may stand further out than the first beat. */
  trail?: boolean;
}

/** Slow enough to count as holding (units a second). */
export const HOLD_SLOW = 6;
/** A pickup comes aboard this close to its centre (units). */
export const PICK_R = 6;
/** Rock and bulwarks are kept this far outside a live place's ring, so she can hold there. */
export const PLACE_CLEAR = 18;

/** Where a place stands in a sortie: on the way from the start (0, 0) to the Jump Gate, about a third of the way, close enough to
 * the line that flying at the gate passes through its ring. A trail keeps its own spacing. A hull that comes to her starts here. */
export function placeAt(def: StoryPlaceDef, b: Pick<Breakout, 'lane'>): { x: number; z: number } {
  const d = Math.hypot(b.lane.x, b.lane.z) || 1, fx = b.lane.x / d, fz = b.lane.z / d, rx = -fz, rz = fx;
  const a = def.trail ? Math.min(def.along, d / 2) : Math.min(d / 2, Math.max(ON_LINE[0], Math.min(ON_LINE[1], d * 0.32)));
  const off = Math.sign(def.off) * Math.min(Math.abs(def.off), def.trail ? TRAIL_R * 0.5 : Math.max(8, def.r * 0.5));
  return { x: fx * a + rx * off, z: fz * a + rz * off };
}

/** How far along her line to the gate a fixed place stands (units). */
export const ON_LINE: readonly [number, number] = [150, 210];

/** A hull that comes to her: it flies out, pulls alongside and keeps pace (owner, 23 November 2026: "the story comes to you"). */
export const meets = (p: StoryPlaceDef): boolean => 'hold' in p.act && (p.look === 'skiff' || p.look === 'ferry');
/** Handed across from the hull alongside: it flies to her. */
export const handed = (p: StoryPlaceDef): boolean => 'pickup' in p.act && !p.trail;
/** Units off her port side a hull keeps while alongside: a ferry is twice a skiff. */
export const ALONGSIDE = 6;
export const alongside = (p: StoryPlaceDef): number => (p.look === 'ferry' ? 9.5 : ALONGSIDE);
/** Units ahead of her a hull keeps station until its hail is heard: in sight, not yet alongside. */
export const STATION = 90;
/** And this far ahead of her, so the chase camera has it in view. */
const LEAD = 2.5;
/** A work order on a trail comes aboard this close (units): she flies near it, not over it. */
export const TRAIL_R = 22;

/** A moving place: where it is and how it moves (units a second). */
export interface Mover { x: number; z: number; vx: number; vz: number }

/**
 * One step of a hull coming to her: it closes on a spot off her port side and matches her speed there. `s` is the ship; `top` is her
 * top speed (units a second), so it can always catch her.
 */
export function stepMeet(m: Mover, s: { x: number; z: number; vx: number; vz: number; heading: number }, top: number, dt: number, gap = ALONGSIDE, ahead = 0): void {
  const side = ahead ? gap * 4 : gap, lead = ahead || LEAD;
  const tx = s.x - Math.sin(s.heading) * side + Math.cos(s.heading) * lead, tz = s.z - Math.cos(s.heading) * side - Math.sin(s.heading) * lead;
  const svx = s.vx, svz = s.vz;
  let wx = svx + (tx - m.x) * 0.9, wz = svz + (tz - m.z) * 0.9;
  const cap = top * 1.5, w = Math.hypot(wx, wz);
  if (w > cap) { wx *= cap / w; wz *= cap / w; }
  const k = Math.min(1, dt * 2.5);
  m.vx += (wx - m.vx) * k; m.vz += (wz - m.vz) * k;
  m.x += m.vx * dt; m.z += m.vz * dt;
}

/** Seconds a hull stays alongside once it has nothing more to hand across. */
export const ESCORT_STAY = 4;

/** One step of a hull peeling away: it turns off to port and opens the throttle. True once it is far enough to drop. */
export function stepLeave(m: Mover, s: { x: number; z: number; heading: number }, top: number, dt: number): boolean {
  const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), px = -Math.sin(s.heading), pz = -Math.cos(s.heading);
  const v = top * 1.6, wx = (fx * 0.5 + px) * v * 0.9, wz = (fz * 0.5 + pz) * v * 0.9;
  const k = Math.min(1, dt * 0.8);
  m.vx += (wx - m.vx) * k; m.vz += (wz - m.vz) * k;
  m.x += m.vx * dt; m.z += m.vz * dt;
  return Math.hypot(m.x - s.x, m.z - s.z) > 450;
}

/** One step of a canister handed across: it flies straight to her, a little faster than she goes. */
export function stepHanded(m: Mover, s: { x: number; z: number; vx: number; vz: number }, dt: number): void {
  const dx = s.x - m.x, dz = s.z - m.z, d = Math.hypot(dx, dz) || 1;
  const v = Math.hypot(s.vx, s.vz) + 18;
  m.vx = (dx / d) * v; m.vz = (dz / d) * v;
  const g = Math.min(d, v * dt);
  m.x += (dx / d) * g; m.z += (dz / d) * g;
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
 * One step at a live place. `hold` is the seconds held (or alongside) so far; returns the new hold and whether it is done now. A hold drains
 * slowly when she leaves the ring or speeds up, so a brush past does not count but a short drift out costs little.
 */
export function stepPlace(def: StoryPlaceDef, at: { x: number; z: number }, s: { x: number; z: number; vx: number; vz: number }, hold: number, dt: number, free: boolean): { hold: number; done: boolean } {
  const d = Math.hypot(s.x - at.x, s.z - at.z);
  if ('pickup' in def.act) return { hold: 0, done: d <= (def.trail ? TRAIL_R : PICK_R) };
  if ('pass' in def.act) return { hold: 0, done: d <= def.r && free };
  // alongside, at any speed: the hull keeps pace with her
  const inside = d <= def.r && (meets(def) || Math.hypot(s.vx, s.vz) <= HOLD_SLOW) && free;
  const h = inside ? hold + dt : Math.max(0, hold - dt * 0.5);
  return { hold: h, done: h >= def.act.hold };
}
