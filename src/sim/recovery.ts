import type { FlightControls } from './controls';
import { lockLifted } from './postjump';
import { topSpeed, type ShipState } from './ship';
import { SHIP_R } from './tuning';
import type { Hull } from '../content/hulls';

// ── the forced recovery ───────────────────────────────────────────────────
// The opening handover (2026-10-23, F → G). The breach notice is answered and
// Lane Control takes the ship: the recovery flag is set, the player's flight
// controls lock, and an autopilot flies her toward the company's audit dock.
// After forty seconds of play (the game clock, so a pause or a document does not
// count; the owner, 23 October 2026) Sam's private channel opens, once. His code lifts the owner lock: the
// autopilot lets go and the controls come back. The flag stays for good.
//
// Nothing here docks her. The autopilot stops short of the dock's call range
// and holds, and the dock does not hail while the recovery runs. One flag and
// the owner lock decide it, so a reload picks it up: the flag is banked with the
// breach's answer and the lock with Sam's, and the chain deals Sam's card again
// a couple of seconds into the system (sim/story.ts `dueBeat`) rather than
// running the whole forty seconds once more.

/** Set by the breach notice's answer and never cleared: the vessel stays flagged for recovery. */
export const RECOVERY_FLAG = 'recovery_flag';
/** Seconds of play from the breach to Sam's channel. */
export const RECOVERY_T = 40;
/** Where the autopilot holds, short of the dock (its call range is 150). */
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

/** The autopilot's hand on the controls: nose to the dock round whatever is in the way, a slow cruise, and a hold short of it. No guns. */
export function recoveryControls(s: ShipState, to: { x: number; z: number } | null, hull: Hull, obs: readonly Obstacle[] = []): FlightControls {
  const idle: FlightControls = { turn: 0, thrust: 0, roll: false, brk: false, rollDir: 0, fire: false, torpedo: false };
  if (!to) return idle;
  const dx = to.x - s.x, dz = to.z - s.z;
  const d = Math.hypot(dx, dz) || 1;
  const speed = Math.hypot(s.vx, s.vz);
  // at the hold she only turns to face the dock; on the way she picks a course round what is ahead
  const path = d > HOLD_R ? clearCourse(s, dx / d, dz / d, obs) : { x: dx / d, z: dz / d, danger: 0 };
  // forward is (cos h, -sin h); turning right lowers the heading
  const err = wrap(Math.atan2(-path.z, path.x) - s.heading);
  const turn = Math.max(-1, Math.min(1, -err * 1.5));
  // slower with something close ahead, and none at the hold
  const want = d > HOLD_R ? Math.min(topSpeed(hull) * CRUISE * (1 - 0.6 * path.danger), (d - HOLD_R) * 0.6) : 0;
  const thrust = speed < want && Math.abs(err) < 0.7 ? 0.7 : 0;
  return { ...idle, turn, thrust };
}
