// ── the ghost at Northfold ────────────────────────────────────────────────
// The first meeting with the unknown (docs/ROAD.md): one contact that holds at the
// edge of the scope, matches the ship's speed and is never explained. It is no
// ship: it lives outside `aliens`, so no weapon, AI or target rule ever touches
// it, and a bolt passes through. It keeps one bearing from the ship and one
// distance, so flying at it never closes the gap; it comes nearer once, a while
// after it came. It haunts the quiet lane the archive chose: the first stop past
// the audit dock, where nothing is hunting her yet. Plain data; render/ and ui/
// only draw the blip.

/** Units: 4.2 km out, then 3.1 km. */
export const GHOST_FAR = 420;
export const GHOST_NEAR = 310;
/** Seconds of quiet sky at the stop before it appears, and seconds after that before it comes nearer. */
export const GHOST_AFTER = 8;
export const GHOST_CLOSE_AFTER = 25;
/** How fast it closes from the far hold to the near one (units a second). */
const CLOSE_RATE = 6;
/** The stop it haunts (content/road.ts `script`). */
export const GHOST_STOP = 'northfold';

export interface Ghost {
  x: number;
  z: number;
  /** Its bearing from the ship, in the world (radians, the ship's heading convention). */
  dir: number;
  dist: number;
  near: boolean;
}

/** Where a heading points on the plane. */
const fwd = (h: number) => ({ x: Math.cos(h), z: -Math.sin(h) });

/** It appears off the quarter, behind the beam: never ahead of the ship, where the flight path is. */
export function spawnGhost(ship: { x: number; z: number; heading: number }): Ghost {
  const dir = ship.heading + 2.5;
  const f = fwd(dir);
  return { x: ship.x + f.x * GHOST_FAR, z: ship.z + f.z * GHOST_FAR, dir, dist: GHOST_FAR, near: false };
}

/** One step: it keeps its bearing and its distance whatever the ship does, and closes once, `GHOST_CLOSE_AFTER` seconds after it came. */
export function stepGhost(g: Ghost, ship: { x: number; z: number }, age: number, dt: number): void {
  if (!g.near && age >= GHOST_CLOSE_AFTER) g.near = true;
  if (g.near && g.dist > GHOST_NEAR) g.dist = Math.max(GHOST_NEAR, g.dist - CLOSE_RATE * dt);
  const f = fwd(g.dir);
  g.x = ship.x + f.x * g.dist;
  g.z = ship.z + f.z * g.dist;
}
