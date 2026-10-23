import type { FlightControls } from './controls';
import { lockLifted } from './postjump';
import { topSpeed, type ShipState } from './ship';
import { SHIP_R } from './tuning';
import type { Hull } from '../content/hulls';

// ── the forced recovery ───────────────────────────────────────────────────
// The opening handover (2026-10-23, F → G). The breach notice is answered and
// Lane Control takes the ship: the recovery flag is set, the player's flight
// controls lock, and an autopilot flies her toward the company's audit dock.
// When she is 2 km from the dock (the owner, 23 October 2026: "so it always comes
// just in time, no matter what happens") Sam's private channel opens, once; from
// the breach that is about half a minute of play. His code lifts the owner lock: the
// autopilot lets go and the controls come back. The flag stays for good.
//
// Nothing here docks her. The autopilot stops short of the dock and holds, past
// Sam's range so his call always comes first, and the dock does not hail while
// the recovery runs. One flag and the owner lock decide it, so a reload picks it
// up: the flag is banked with the breach's answer and the lock with Sam's, and
// a load mid-recovery flies her in again from the system's edge to the same 2 km.

/** Set by the breach notice's answer and never cleared: the vessel stays flagged for recovery. */
export const RECOVERY_FLAG = 'recovery_flag';
/** Sam's channel opens this close to the dock: 2 km (units are 10 cm, sim/tuning.ts PX). */
export const SAM_CALL_R = 200;
/** The latest it comes, in seconds of play, should she ever be held off the dock (a fight, a jam). */
export const RECOVERY_T = 90;
/** Where the autopilot holds, short of the dock and inside Sam's range. */
export const HOLD_R = 170;
/** The autopilot's top speed, as a share of the hull's. */
const CRUISE = 0.25;

/** Lane Control has the ship: flagged for recovery, and the owner lock not yet lifted. */
export const recovering = (flags: ReadonlySet<string> | readonly string[]): boolean => {
  const has = flags instanceof Set ? flags.has(RECOVERY_FLAG) : (flags as readonly string[]).includes(RECOVERY_FLAG);
  return has && !lockLifted(flags);
};

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Something the autopilot keeps clear of: rock, a bulwark, another hull. */
export interface Obstacle { x: number; z: number; r: number; vx?: number; vz?: number }
/** Room the autopilot leaves round anything in its way, on top of the two radii. */
const MARGIN = 8;

/**
 * Where to point to keep clear of what is ahead (owner, 23 October 2026: the autopilot should avoid rocks and other
 * ships). Each obstacle in the corridor ahead pushes the course sideways, harder the nearer and more centred it is;
 * anything already close pushes straight out. Moving hulls are read a second ahead. Returns the course and how
 * pressing the nearest danger is, 0 to 1, so the cruise can ease off.
 */
export function clearCourse(s: ShipState, ux: number, uz: number, obs: readonly Obstacle[]): { x: number; z: number; danger: number } {
  const speed = Math.hypot(s.vx, s.vz);
  const look = Math.max(70, speed * 3.2 + 40);
  // the side of the course: right-hand normal of (ux, uz)
  const px = -uz, pz = ux;
  let ox = 0, oz = 0, danger = 0;
  for (const o of obs) {
    const x = o.x + (o.vx ?? 0), z = o.z + (o.vz ?? 0);
    const rx = x - s.x, rz = z - s.z;
    if (Math.abs(rx) > look + o.r || Math.abs(rz) > look + o.r) continue;
    const clear = o.r + SHIP_R + MARGIN;
    const d = Math.hypot(rx, rz);
    if (d < clear + 6) {
      // already close: straight out
      const k = (clear + 6 - d) / (clear + 6);
      ox -= (rx / (d || 1)) * k * 3; oz -= (rz / (d || 1)) * k * 3;
      danger = Math.max(danger, Math.min(1, 0.5 + k));
      continue;
    }
    const ahead = rx * ux + rz * uz;
    if (ahead < 0 || ahead > look + o.r) continue;
    const side = rx * px + rz * pz;
    if (Math.abs(side) >= clear) continue;
    const near = 1 - ahead / (look + o.r);
    const k = near * (1 - Math.abs(side) / clear);
    // away from the side it sits on (dead ahead: break right)
    const away = side > 0 ? -1 : 1;
    ox += px * away * k * 2.4; oz += pz * away * k * 2.4;
    danger = Math.max(danger, k);
  }
  const cx = ux + ox, cz = uz + oz, n = Math.hypot(cx, cz) || 1;
  return { x: cx / n, z: cz / n, danger };
}

/** How far the autopilot's course may swing off the straight line to the dock: never so far that she circles. */
const SWING = 0.9;
/** How fast the autopilot turns her, radians a second. */
const TURN = 1.6;

/**
 * The autopilot flies her itself, on rails (owner, 23 October 2026: "it doesn't need to be perfect, just working for
 * the story"). Nose round toward the dock, swinging off the straight line round what is ahead but never more than
 * SWING, so she cannot fly in circles; a steady cruise that slows to turn and to clear what is close; no drift, no
 * thrust physics; a stop short of the dock. Rock that still touches her is shoved aside (world.ts), and nothing hurts
 * her while Lane Control has her.
 */
export function recoveryStep(s: ShipState, to: { x: number; z: number } | null, hull: Hull, obs: readonly Obstacle[], dt: number): void {
  const before = s.heading;
  let want = 0;
  if (to) {
    const dx = to.x - s.x, dz = to.z - s.z, d = Math.hypot(dx, dz) || 1;
    const ux = dx / d, uz = dz / d;
    const path = d > HOLD_R ? clearCourse(s, ux, uz, obs) : { x: ux, z: uz, danger: 0 };
    const line = Math.atan2(-uz, ux);
    const course = line + Math.max(-SWING, Math.min(SWING, wrap(Math.atan2(-path.z, path.x) - line)));
    const err = wrap(course - s.heading);
    s.heading += Math.max(-TURN * dt, Math.min(TURN * dt, err));
    // slow to turn and with something close ahead, and none at the hold
    if (d > HOLD_R) want = Math.min(topSpeed(hull) * CRUISE * (1 - 0.6 * path.danger) * Math.max(0.25, Math.cos(Math.min(Math.abs(err), Math.PI / 2))), (d - HOLD_R) * 0.6);
  }
  const speed = Math.hypot(s.vx, s.vz);
  const v = speed + (want - speed) * Math.min(1, 2 * dt);
  s.vx = Math.cos(s.heading) * v;
  s.vz = -Math.sin(s.heading) * v;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.thrust = want > speed ? 0.7 : 0;
  s.helm = 0;
  s.breakT = -1; s.rollT = -1;
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
  s.yawRate = wrap(s.heading - before) / dt;
}

/** The autopilot's hand on the controls, as controls: none. It flies her itself (`recoveryStep`); no guns. */
export const RECOVERY_CONTROLS: FlightControls = { turn: 0, thrust: 0, roll: false, brk: false, rollDir: 0, fire: false, torpedo: false };
