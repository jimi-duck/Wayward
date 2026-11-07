import type { World } from './world';
import { t } from '../i18n';

// ── the repair gantry ─────────────────────────────────────────────────────
// A small mend point on the lane, away from any port: a cradle on a gantry
// arm. Hold the ship slow inside its ring and it mends a plate. It refuses a
// hull the Custody has flagged (the hunt at 0.6 or more), shuts for as long as
// a fight is near, and wears out: a few mends and the arm is spent.
// Plain data and the world's own repair rule (docs/SITES.md).

/** The cradle's ring (units), how slow the ship must be, the seconds a mend takes, the mends it has in it, and how near a fight shuts it (units). */
export const GANTRY_R = 12;
const GANTRY_SPEED = 12;
export const GANTRY_MEND_T = 6;
export const GANTRY_USES = 3;
const GANTRY_FIGHT_R = 200;
/** The hunt at which it turns the ship away: the same flag the Custody's patrols read. */
const GANTRY_FLAG = 0.6;

export type GantryState = 'ready' | 'working' | 'shut' | 'refuses' | 'spent' | 'full';

export class Gantry {
  x: number; z: number;
  uses = GANTRY_USES;
  state: GantryState = 'ready';
  /** Seconds of the mend done, 0 to GANTRY_MEND_T. */
  hold = 0;
  private toldAt = -Infinity;

  constructor(x: number, z: number) { this.x = x; this.z = z; }

  step(w: World, dt: number): void {
    if (this.uses <= 0) { this.state = 'spent'; return; }
    const s = w.ship, d = Math.hypot(s.x - this.x, s.z - this.z), speed = Math.hypot(s.vx, s.vz);
    const fight = w.aliens.some((a) => w.committed(a) && Math.hypot(a.x - this.x, a.z - this.z) < GANTRY_FIGHT_R) || w.inDanger();
    const inside = d < GANTRY_R && speed < GANTRY_SPEED;
    this.state = fight ? 'shut' : w.bk!.heat >= GANTRY_FLAG ? 'refuses' : w.plates >= w.stats.maxPlates ? 'full' : 'ready';
    if (!inside) { this.hold = Math.max(0, this.hold - dt * 2); return; }
    if (this.state !== 'ready') { this.hold = 0; this.tell(w); return; }
    this.state = 'working';
    this.hold += dt;
    if (this.hold >= GANTRY_MEND_T) {
      this.hold = 0;
      this.uses--;
      w.repair(1);
      w.events.push({ type: 'mended', plates: w.plates });
    }
  }

  /** Why it will not mend you, said once in a while on the radio. */
  private tell(w: World): void {
    if (w.runTime - this.toldAt < 20) return;
    this.toldAt = w.runTime;
    const text = this.state === 'shut' ? t('“Gantry locked. Fight in range.”') : this.state === 'refuses' ? t('“Hull flagged. Gantry won’t service you.”') : t('“Plating is full. Nothing to mend.”');
    w.events.push({ type: 'ping', id: `gantry_${this.state}`, from: t('Repair gantry'), caller: 'unknown', text, moment: 'calm', system: w.sortie.name });
  }
}

/** Where a transit system's gantry stands: past the middle of the course, well off the line. */
export function gantryBerth(x0: number, z0: number, heading: number, lane: number, side: number): { x: number; z: number } {
  const fx = Math.cos(heading), fz = -Math.sin(heading), rx = Math.sin(heading), rz = Math.cos(heading);
  return { x: x0 + fx * lane * 0.65 + rx * side * 130, z: z0 + fz * lane * 0.65 + rz * side * 130 };
}
