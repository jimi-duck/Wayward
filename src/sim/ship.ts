import type { Hull } from '../content/hulls';
import type { FlightControls } from './controls';
import {
  GRIP_CARVE, HELM_EASE, HZ, PX, ROLL_COOLDOWN, ROLL_IFRAMES, ROLL_KICK, ROLL_TIME, ROT_SPEED, THRUST,
} from './tuning';

// ── the flight model ──────────────────────────────────────────────────────
// A port of the original's update() for the ship, step for step: helm, then
// thrust (and grip), then drag, then position. One step is one of
// the original's 60Hz frames, so its per-frame numbers apply unchanged and
// only distances convert (PX). The 3D game adds the barrel roll.
//
// Coordinates: the play plane is XZ, +Z toward the camera. Heading 0 faces +X
// and PI/2 faces -Z. The original's angle a (screen y down) is our -a, which
// is why turning right lowers the heading here and raised it there.

export interface ShipState {
  x: number;
  z: number;
  /** World units per second. */
  vx: number;
  vz: number;
  /** Radians, never wrapped. */
  heading: number;
  /** The eased helm, -1 to 1. */
  helm: number;
  /** Throttle applied this step, 0 to 1. For the engines' glow. */
  thrust: number;
  /** Radians per second turned this step. For banking. */
  yawRate: number;
  /** Seconds into a barrel roll, or -1 when not rolling. */
  rollT: number;
  /** Direction of the current or last roll: 1 right, -1 left. */
  rollDir: 1 | -1;
  /** Seconds until another roll is allowed. */
  rollCooldown: number;
  /** Seconds of invulnerability left. */
  invuln: number;
}

export function newShip(): ShipState {
  return {
    x: 0, z: 0, vx: 0, vz: 0, heading: Math.PI / 2, helm: 0, thrust: 0, yawRate: 0,
    rollT: -1, rollDir: 1, rollCooldown: 0, invuln: 0,
  };
}

/** Thrust in units/s gained per step at full throttle. */
export function thrustPerStep(hull: Hull): number {
  return THRUST * hull.thrust * PX * HZ;
}

/** Top speed in units/s: thrust against the hull's own drag. */
export function topSpeed(hull: Hull): number {
  return (thrustPerStep(hull) * hull.drag) / (1 - hull.drag);
}

/** Radians per step at full helm. */
export function turnPerStep(hull: Hull): number {
  return ROT_SPEED * hull.rot;
}

/**
 * The Kestrel's grip: under thrust, the slide across the nose bleeds away
 * and GRIP_CARVE of what it sheds comes back as speed along the nose, so the
 * ship carves a turn instead of skidding through it. Off the throttle it
 * drifts like every hull.
 */
function applyGrip(s: ShipState, g: number): void {
  const hx = Math.cos(s.heading), hz = -Math.sin(s.heading);
  let f = s.vx * hx + s.vz * hz;
  const l = s.vz * hx - s.vx * hz;
  const nl = l * (1 - g);
  if (f > 0) f = Math.sqrt(f * f + (l * l - nl * nl) * GRIP_CARVE);
  s.vx = f * hx - nl * hz;
  s.vz = f * hz + nl * hx;
}

/** Drag kept per step while drifting: most of the speed carries. */
const DRIFT_DRAG = 0.988;
/** Turn rate while drifting, as a multiple of the hull's own. */
const DRIFT_TURN = 1.3;

/** True while the drift drive is carrying the ship: off the throttle, still moving. */
export function drifting(s: ShipState, hull: Hull): boolean {
  return !!hull.drift && s.thrust === 0 && Math.hypot(s.vx, s.vz) > topSpeed(hull) * 0.3;
}

export function stepShip(s: ShipState, c: FlightControls, hull: Hull, dt: number): void {
  const before = s.heading;
  const drift = !!hull.drift && c.thrust === 0 && Math.hypot(s.vx, s.vz) > topSpeed(hull) * 0.3;
  const turnRate = turnPerStep(hull) * (drift ? DRIFT_TURN : 1);

  // The helm eases in over about a tenth of a second, so a tap nudges the
  // nose and a hold comes round at full rate.
  s.helm += (c.turn - s.helm) * Math.min(1, HELM_EASE * dt);
  if (!c.turn && Math.abs(s.helm) < 0.02) s.helm = 0;
  s.heading -= turnRate * s.helm;

  s.thrust = c.thrust;
  if (c.thrust > 0) {
    const a = thrustPerStep(hull) * c.thrust;
    s.vx += Math.cos(s.heading) * a;
    s.vz -= Math.sin(s.heading) * a;
    if (hull.grip) applyGrip(s, hull.grip * c.thrust);
  }

  // The barrel roll: a sideways kick at the start, then the hull's own drag.
  if (s.rollCooldown > 0) s.rollCooldown = Math.max(0, s.rollCooldown - dt);
  if (c.roll && s.rollCooldown === 0) {
    s.rollDir = c.rollDir === 0 ? (s.rollDir === 1 ? -1 : 1) : c.rollDir;
    s.rollT = 0;
    s.rollCooldown = hull.rollCooldown ?? ROLL_COOLDOWN;
    s.invuln = Math.max(s.invuln, hull.rollIframes ?? ROLL_IFRAMES);
    const kick = topSpeed(hull) * (hull.rollKick ?? ROLL_KICK) * s.rollDir;
    // right of the nose is the heading turned a quarter clockwise
    s.vx += Math.sin(s.heading) * kick;
    s.vz += Math.cos(s.heading) * kick;
  } else if (s.rollT >= 0) {
    s.rollT += dt;
    if (s.rollT >= ROLL_TIME) s.rollT = -1;
  }
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);

  const drag = drift ? Math.max(hull.drag, DRIFT_DRAG) : hull.drag;
  s.vx *= drag;
  s.vz *= drag;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.yawRate = (s.heading - before) / dt;
}
