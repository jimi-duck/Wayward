import type { Waypoint } from './breakout';
import type { ShipState } from './ship';

// ── Lane Control's tow ────────────────────────────────────────────────────
// The first system past Cerro, before Sam's code (docs/ROAD.md, "the story in
// places", owner 2026-11-21). The story is told by things she can see, not by a
// clock:
//
//   out    · the Jump Gate's beacon has read her ID: Lane Control limits her drive
//            and safes her guns, and two Kellern tugs undock from the audit dock
//            and come for her (they are faster than a limited drive)
//   tow    · the lead tug has her: the breach is served (the card) and the tug
//            tows her in on a line. She can pull and swing against it, but the
//            line holds (the recovery cannot fail: owner, 23 October 2026)
//   loose  · Sam's code: the line snaps, the drive is hers, and the tugs turn
//            back for the dock, where they report her stolen
//
// Plain data on the ship's plane, like the rest of the sim. Nothing here is
// saved: the phase follows from the flags (recovery_flag, the owner lock), so
// a reload mid-tow puts the tugs back on the line.

/** Seconds after arrival that the Jump Gate's beacon reads her ID. */
export const ID_AT = 3;
/** Her drive while Lane Control limits it, as a share of top speed. */
export const DRIVE_CAP = 0.4;
/** The tugs' speed out to her, as a share of her top speed: faster than a limited drive. */
export const TUG_SPEED = 0.62;
/** The lead tug locks on this close to its place on the line (units). */
export const LOCK_R = 12;
/** At the latest, seconds after the read: the breach is served wherever she is, and the tugs close the rest. */
export const LOCK_LATEST = 45;
/** The line: the lead tug holds this far off her bow (units). */
export const TOW_LEN = 16;
/** The wing tug's place: out ahead and off to the right, beyond the lead, in view and clear of the line (units). */
const WING = { ahead: 24, side: 8 } as const;
/** How far her pull swings the tow's course at full helm (radians). */
export const STRAIN_TURN = 0.42;
/** The tugs' turn rate (radians a second) and how fast they fall in on the line (a share a second). */
const TUG_TURN = 1.4;
const FALL_IN = 2.2;
/** Gone back into the dock this close (units). */
const HOME_R = 40;

export interface Tug {
  x: number; z: number; heading: number; vx: number; vz: number;
  /** 0 the lead (the line is hers), 1 the wing. */
  slot: 0 | 1;
}

export type TowPhase = 'out' | 'tow' | 'loose';

export interface Tow {
  phase: TowPhase;
  tugs: Tug[];
  /** How hard she pulls against the line, 0 to 1 (smoothed): the line's glow and the HUD line follow it. */
  strain: number;
  /** When the phase began (runTime). */
  at: number;
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Two tugs at the dock's mouth, pointed at her. */
export function launchTugs(dock: Waypoint, s: { x: number; z: number }, t: number): Tow {
  const to = Math.atan2(-(s.z - dock.z), s.x - dock.x);
  const fx = Math.cos(to), fz = -Math.sin(to), rx = -fz, rz = fx;
  const out = dock.r + 12;
  const tugs: Tug[] = [0, 1].map((i) => ({
    x: dock.x + fx * out + rx * (i ? -14 : 14), z: dock.z + fz * out + rz * (i ? -14 : 14),
    heading: to, vx: 0, vz: 0, slot: i as 0 | 1,
  }));
  return { phase: 'out', tugs, strain: 0, at: t };
}

/** The tugs already on the line (a reload mid-tow, or the breach served before they reached her). */
export function onTheLine(s: ShipState, t: number): Tow {
  const tow: Tow = { phase: 'tow', tugs: [0, 1].map((i) => ({ x: s.x, z: s.z, heading: s.heading, vx: 0, vz: 0, slot: i as 0 | 1 })), strain: 0, at: t };
  for (const g of tow.tugs) { const p = slotOf(g.slot, s); g.x = p.x; g.z = p.z; }
  return tow;
}

/** Where a tug holds on the line: the lead ahead of her bow, the wing off her quarter. */
export function slotOf(slot: 0 | 1, s: { x: number; z: number; heading: number }): { x: number; z: number } {
  const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), rx = -fz, rz = fx;
  return slot === 0 ? { x: s.x + fx * TOW_LEN, z: s.z + fz * TOW_LEN } : { x: s.x + fx * WING.ahead + rx * WING.side, z: s.z + fz * WING.ahead + rz * WING.side };
}

/** Steer one tug toward a point at a speed, turning at its own rate. */
function fly(g: Tug, to: { x: number; z: number }, speed: number, dt: number): number {
  const dx = to.x - g.x, dz = to.z - g.z, d = Math.hypot(dx, dz);
  const want = Math.atan2(-dz, dx);
  g.heading += Math.max(-TUG_TURN * dt, Math.min(TUG_TURN * dt, wrap(want - g.heading)));
  const v = Math.min(speed, d * 1.5);
  g.vx = Math.cos(g.heading) * v; g.vz = -Math.sin(g.heading) * v;
  g.x += g.vx * dt; g.z += g.vz * dt;
  return d;
}

/**
 * The tugs coming out: each flies for its place beside her. Returns whether the lead is close enough to lock on.
 * `top` is her top speed (units a second).
 */
export function stepOut(tow: Tow, s: ShipState, top: number, dt: number): boolean {
  let lead = Infinity;
  for (const g of tow.tugs) {
    const d = fly(g, slotOf(g.slot, s), top * TUG_SPEED + Math.hypot(s.vx, s.vz) * 0.5, dt);
    if (g.slot === 0) lead = d;
  }
  return lead <= LOCK_R;
}

/**
 * On the line: the tugs fall in on their places and keep them, pointed the way she is towed. `pull` is how hard she pulls
 * (0 to 1, from the helm and the throttle), smoothed into the strain.
 */
export function stepLine(tow: Tow, s: ShipState, pull: number, dt: number): void {
  tow.strain += (Math.max(0, Math.min(1, pull)) - tow.strain) * Math.min(1, 3 * dt);
  const k = Math.min(1, FALL_IN * dt);
  for (const g of tow.tugs) {
    const p = slotOf(g.slot, s);
    const px = g.x, pz = g.z;
    g.x += (p.x - g.x) * k; g.z += (p.z - g.z) * k;
    g.heading += wrap(s.heading - g.heading) * k;
    g.vx = (g.x - px) / Math.max(dt, 1e-6); g.vz = (g.z - pz) / Math.max(dt, 1e-6);
  }
}

/** Let go: the line has snapped. The tugs turn back for the dock. */
export function letGo(tow: Tow, t: number): void {
  tow.phase = 'loose';
  tow.at = t;
  tow.strain = 0;
}

/** Back to the dock: each tug that reaches it is gone. Returns whether any are still out. */
export function stepHome(tow: Tow, dock: Waypoint | null, top: number, dt: number): boolean {
  if (!dock) { tow.tugs.length = 0; return false; }
  tow.tugs = tow.tugs.filter((g) => fly(g, dock, top * TUG_SPEED * 0.8, dt) > HOME_R);
  return tow.tugs.length > 0;
}
