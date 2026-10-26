// ── the ghost at Hollis ───────────────────────────────────────────────────
// The first meeting with the unknown (docs/ROAD.md): one contact that holds at the
// edge of the scope, matches the ship's speed and is never explained. It is no
// ship: it lives outside `aliens`, so no weapon, AI or target rule ever touches
// it, and a bolt passes through. It keeps one bearing from the ship and one
// distance, so flying at it never closes the gap; it comes nearer once, when the
// tank passes three quarters. Plain data; render/ and ui/ only draw the blip.

/** Units: 4.2 km out, then 3.1 km. */
export const GHOST_FAR = 420;
export const GHOST_NEAR = 310;
/** The share of the tank at which it appears, and at which it comes nearer. */
export const GHOST_TANK = 0.5;
export const GHOST_CLOSE = 0.75;
/** How fast it closes from the far hold to the near one (units a second). */
const CLOSE_RATE = 6;
/** The stop it haunts (content/road.ts `script`). */
export const GHOST_STOP = 'hollis';

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

/** One step: it keeps its bearing and its distance whatever the ship does, and closes once the tank is nearly full. */
export function stepGhost(g: Ghost, ship: { x: number; z: number }, tank: number, dt: number): void {
  if (!g.near && tank >= GHOST_CLOSE) g.near = true;
  if (g.near && g.dist > GHOST_NEAR) g.dist = Math.max(GHOST_NEAR, g.dist - CLOSE_RATE * dt);
  const f = fwd(g.dir);
  g.x = ship.x + f.x * g.dist;
  g.z = ship.z + f.z * g.dist;
}
