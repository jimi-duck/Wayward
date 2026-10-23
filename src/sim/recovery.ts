import type { FlightControls } from './controls';
import { lockLifted } from './postjump';
import { topSpeed, type ShipState } from './ship';
import type { Hull } from '../content/hulls';

// ── the forced recovery ───────────────────────────────────────────────────
// The opening handover (2026-10-23, F → G). The breach notice is answered and
// Lane Control takes the ship: the recovery flag is set, the player's flight
// controls lock, and an autopilot flies her toward the company's audit dock.
// After ten seconds of play (the game clock, so a pause or a document does not
// count) Sam's private channel opens, once. His code lifts the owner lock: the
// autopilot lets go and the controls come back. The flag stays for good.
//
// Nothing here docks her. The autopilot stops short of the dock's call range
// and holds, and the dock does not hail while the recovery runs. One flag and
// the owner lock decide it, so a reload picks it up: the flag is banked with the
// breach's answer and the lock with Sam's, and the chain deals Sam's card again
// a couple of seconds into the system (sim/story.ts `dueBeat`) rather than
// running the whole ten seconds once more.

/** Set by the breach notice's answer and never cleared: the vessel stays flagged for recovery. */
export const RECOVERY_FLAG = 'recovery_flag';
/** Seconds of play from the breach to Sam's channel. */
export const RECOVERY_T = 10;
/** Where the autopilot holds, short of the dock (its call range is 150). */
export const HOLD_R = 170;
/** The autopilot's top speed, as a share of the hull's. */
const CRUISE = 0.45;

/** Lane Control has the ship: flagged for recovery, and the owner lock not yet lifted. */
export const recovering = (flags: ReadonlySet<string> | readonly string[]): boolean => {
  const has = flags instanceof Set ? flags.has(RECOVERY_FLAG) : (flags as readonly string[]).includes(RECOVERY_FLAG);
  return has && !lockLifted(flags);
};

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The autopilot's hand on the controls: nose to the dock, a slow cruise, and a hold short of it. No guns. */
export function recoveryControls(s: ShipState, to: { x: number; z: number } | null, hull: Hull): FlightControls {
  const idle: FlightControls = { turn: 0, thrust: 0, roll: false, brk: false, rollDir: 0, fire: false, torpedo: false };
  if (!to) return idle;
  const dx = to.x - s.x, dz = to.z - s.z;
  const d = Math.hypot(dx, dz);
  // forward is (cos h, -sin h); turning right lowers the heading
  const err = wrap(Math.atan2(-dz, dx) - s.heading);
  const turn = Math.max(-1, Math.min(1, -err * 1.5));
  const want = d > HOLD_R ? Math.min(topSpeed(hull) * CRUISE, (d - HOLD_R) * 0.6) : 0;
  const speed = Math.hypot(s.vx, s.vz);
  const thrust = speed < want && Math.abs(err) < 0.7 ? 0.7 : 0;
  return { ...idle, turn, thrust };
}
