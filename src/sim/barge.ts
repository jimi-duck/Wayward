import type { Rock } from './field';
import type { World } from './world';

// ── the refinery barge ────────────────────────────────────────────────────
// A slow ore barge working a mining system's field. It tethers the nearest
// ordinary rock, hauls it in and grinds it, spilling the Cyrite round its
// hull for anyone with a tractor, and it works the field the player is
// working: leave rock drifting about it and it will be taken. When a fight
// comes within reach it stops pulling and runs from the nearest hostile.
// Plain data and the world's own rock and loot rules (docs/SITES.md).

/** How far it tethers (units), the pull of each haul, how often it hauls (s) and how close a rock must come to be ground (units). */
export const BARGE_PULL_R = 100;
const BARGE_PULL = 1.4;
const BARGE_EVERY = 1;
const BARGE_MOUTH = 11;
/** Its drift (units/s), its flight from a fight, and how near a fight must be to send it (units). */
const BARGE_DRIFT = 5;
const BARGE_RUN = 12;
const BARGE_FEAR_R = 220;
/** Rock it will not touch: it blows up when ground. */
const SKIP: ReadonlySet<string> = new Set(['volatile']);
/** The fastest a hauled rock goes (units/s): a tether, not a catapult. */
const ROCK_MAX = 14;

export type BargeMood = 'working' | 'fleeing';

export class Barge {
  x: number; z: number;
  /** The way it faces, radians (the drift direction). */
  face: number;
  mood: BargeMood = 'working';
  /** The rock on its tether now, for the renderer. */
  target: Rock | null = null;
  /** Rocks ground so far. */
  ground = 0;
  private dir: number;
  private t = 0;

  constructor(x: number, z: number, dir: number) {
    this.x = x; this.z = z; this.dir = dir; this.face = dir;
  }

  step(w: World, dt: number): void {
    // fear: the nearest committed hostile in reach
    let fear: { x: number; z: number } | null = null, best = BARGE_FEAR_R;
    for (const a of w.aliens) {
      if (!w.committed(a)) continue;
      const d = Math.hypot(a.x - this.x, a.z - this.z);
      if (d < best) { best = d; fear = a; }
    }
    this.mood = fear ? 'fleeing' : 'working';
    if (fear) {
      const d = Math.hypot(this.x - fear.x, this.z - fear.z) || 1;
      this.x += ((this.x - fear.x) / d) * BARGE_RUN * dt;
      this.z += ((this.z - fear.z) / d) * BARGE_RUN * dt;
      this.face = Math.atan2(-(this.z - fear.z), this.x - fear.x);
      this.target = null;
      return;
    }
    // drift to and fro about its berth, so it works a stretch of field and not a point
    this.t += dt;
    const sway = Math.sin(this.t * 0.03);
    this.x += Math.cos(this.dir) * BARGE_DRIFT * sway * dt;
    this.z += -Math.sin(this.dir) * BARGE_DRIFT * sway * dt;
    this.face = this.dir + (sway < 0 ? Math.PI : 0);
    // grind what has come in
    if (this.target && !w.field.rocks.includes(this.target)) this.target = null;
    for (const r of [...w.field.rocks]) {
      if (SKIP.has(r.kind)) continue;
      if (Math.hypot(r.x - this.x, r.z - this.z) < BARGE_MOUTH + r.r * 0.5) {
        w.grindRock(r);
        this.ground++;
        if (r === this.target) this.target = null;
      }
    }
    // haul: the nearest ordinary rock in reach
    if (this.t % BARGE_EVERY > dt) return;
    let pick: Rock | null = null, near = BARGE_PULL_R;
    for (const r of w.field.rocks) {
      if (SKIP.has(r.kind)) continue;
      const d = Math.hypot(r.x - this.x, r.z - this.z);
      if (d < near) { near = d; pick = r; }
    }
    this.target = pick;
    if (!pick) return;
    w.field.impulse(pick, this.x - pick.x, this.z - pick.z, BARGE_PULL * pick.r * pick.r);
    const v = Math.hypot(pick.vx, pick.vz);
    if (v > ROCK_MAX) { pick.vx *= ROCK_MAX / v; pick.vz *= ROCK_MAX / v; }
  }
}

/** Where a mining system's barge works: a good way along the course, well off the line (the flight path stays clear). */
export function bargeBerth(x0: number, z0: number, heading: number, lane: number, side: number): { x: number; z: number; dir: number } {
  const fx = Math.cos(heading), fz = -Math.sin(heading), rx = Math.sin(heading), rz = Math.cos(heading);
  return { x: x0 + fx * lane * 0.45 + rx * side * 170, z: z0 + fz * lane * 0.45 + rz * side * 170, dir: Math.atan2(-fz, fx) };
}
