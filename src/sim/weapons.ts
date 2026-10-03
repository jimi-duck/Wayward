import { angleDelta, clamp } from '../core/math';
import type { FlightControls } from './controls';
import type { GameEvent } from './events';
import type { Field, Rock } from './field';
import type { ShipState } from './ship';
import {
  BANK_DELAY, BANK_MAX, BANK_REFILL, BANK_SHOT, BOLT_LIFE, BOLT_SPEED, SHOT_COOLDOWN, TORP_CONE, TORP_LIFE, TORP_RACK,
  TORP_RELOAD, TORP_SEEK, TORP_SPACING, TORP_SPEED, TORP_TURN,
} from './tuning';

// ── the two weapons ───────────────────────────────────────────────────────
// Phasers (button 1): hold to fire, two emitters alternating, limited by the
// phaser bank. Torpedoes (button 2): one per press from a rack of three, each
// locking the best target in a cone ahead and steering onto it.
// Both carry the ship's own velocity, as in the original: without it a ship at
// full impulse outruns its own fire.

export interface Bolt { x: number; z: number; vx: number; vz: number; life: number; }
export interface Torpedo { id: number; x: number; z: number; vx: number; vz: number; life: number; target: number | null; }

export interface Arms {
  /** Phaser bank energy, 0 to BANK_MAX. */
  bank: number;
  /** Seconds before the bank starts refilling. */
  bankWait: number;
  /** Seconds before the next phaser shot. */
  cooldown: number;
  /** Which emitter fires next: 1 starboard, -1 port. */
  side: 1 | -1;
  /** Torpedoes in the rack, and seconds until the next one is reloaded. */
  rack: number;
  reload: number;
  /** Seconds before another torpedo can launch. */
  spacing: number;
  /** The trigger was refused for an empty bank this press (so it is said once). */
  dryFired: boolean;
}

export function newArms(): Arms {
  return { bank: BANK_MAX, bankWait: 0, cooldown: 0, side: 1, rack: TORP_RACK, reload: 0, spacing: 0, dryFired: false };
}

const NOSE = 1.5; // units ahead of the ship's centre that fire leaves from
const EMITTER = 0.42; // units either side of the centreline

/**
 * The target a torpedo launched now would take: the original's scoring
 * (distance, made worse by how far off the nose), inside the seeker's range
 * and a cone ahead.
 */
export function acquire(field: Field, x: number, z: number, heading: number): Rock | null {
  let best: Rock | null = null, bestScore = Infinity;
  for (const r of field.rocks) {
    const dx = r.x - x, dz = r.z - z, d = Math.hypot(dx, dz);
    if (d > TORP_SEEK || d < 0.01) continue;
    const off = Math.abs(angleDelta(heading, Math.atan2(-dz, dx)));
    if (off > TORP_CONE) continue;
    const score = d * (1 + off * 0.55);
    if (score < bestScore) { bestScore = score; best = r; }
  }
  return best;
}

let torpId = 1;

export function fireWeapons(
  arms: Arms, ship: ShipState, c: FlightControls, field: Field,
  bolts: Bolt[], torps: Torpedo[], events: GameEvent[], dt: number,
): void {
  arms.cooldown = Math.max(0, arms.cooldown - dt);
  arms.spacing = Math.max(0, arms.spacing - dt);
  const hx = Math.cos(ship.heading), hz = -Math.sin(ship.heading);

  // phasers
  if (c.fire && arms.cooldown === 0) {
    if (arms.bank >= BANK_SHOT) {
      const ox = Math.sin(ship.heading) * EMITTER * arms.side, oz = Math.cos(ship.heading) * EMITTER * arms.side;
      const x = ship.x + hx * NOSE + ox, z = ship.z + hz * NOSE + oz;
      bolts.push({ x, z, vx: hx * BOLT_SPEED + ship.vx, vz: hz * BOLT_SPEED + ship.vz, life: BOLT_LIFE });
      events.push({ type: 'bolt', x, z, heading: ship.heading });
      arms.bank -= BANK_SHOT;
      arms.bankWait = BANK_DELAY;
      arms.cooldown = SHOT_COOLDOWN;
      arms.side = arms.side === 1 ? -1 : 1;
    } else if (!arms.dryFired) {
      arms.dryFired = true;
      events.push({ type: 'bankEmpty' });
    }
  }
  if (!c.fire) arms.dryFired = false;
  if (arms.bankWait > 0) arms.bankWait = Math.max(0, arms.bankWait - dt);
  else arms.bank = Math.min(BANK_MAX, arms.bank + BANK_REFILL * dt);

  // torpedoes
  if (c.torpedo) {
    if (arms.rack > 0 && arms.spacing === 0) {
      const target = acquire(field, ship.x, ship.z, ship.heading);
      const x = ship.x + hx * NOSE, z = ship.z + hz * NOSE;
      const forward = Math.max(0, ship.vx * hx + ship.vz * hz);
      const sp = TORP_SPEED + forward;
      torps.push({ id: torpId++, x, z, vx: hx * sp, vz: hz * sp, life: TORP_LIFE, target: target ? target.id : null });
      events.push({ type: 'torpedo', x, z, heading: ship.heading, target: target ? target.id : null });
      if (arms.rack === TORP_RACK) arms.reload = TORP_RELOAD;
      arms.rack--;
      arms.spacing = TORP_SPACING;
    } else if (arms.rack === 0) {
      events.push({ type: 'rackEmpty' });
    }
  }
  if (arms.rack < TORP_RACK) {
    arms.reload -= dt;
    if (arms.reload <= 0) {
      arms.rack++;
      arms.reload = arms.rack < TORP_RACK ? TORP_RELOAD : 0;
    }
  }
}

export function moveBolts(bolts: Bolt[], dt: number): void {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]!;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    if (b.life <= 0) bolts.splice(i, 1);
  }
}

/** Steer each torpedo onto its target, leading a moving one. Returns those whose fuse ran out. */
export function moveTorpedoes(torps: Torpedo[], field: Field, dt: number): Torpedo[] {
  const spent: Torpedo[] = [];
  for (let i = torps.length - 1; i >= 0; i--) {
    const t = torps[i]!;
    const sp = Math.hypot(t.vx, t.vz);
    let heading = Math.atan2(-t.vz, t.vx);
    let target = field.find(t.target);
    if (!target) {
      // a target that broke up hands the lock to the best of what is left
      target = acquire(field, t.x, t.z, heading) ?? undefined;
      t.target = target ? target.id : null;
    }
    if (target) {
      // pure pursuit tail-chases a moving rock; lead it by the flight time,
      // capped at half a second (the original's TORP_LEAD)
      const d = Math.hypot(target.x - t.x, target.z - t.z);
      const lead = clamp(d / Math.max(1, sp), 0, 0.5);
      const want = Math.atan2(-(target.z + target.vz * lead - t.z), target.x + target.vx * lead - t.x);
      heading += clamp(angleDelta(heading, want), -TORP_TURN * dt, TORP_TURN * dt);
      t.vx = Math.cos(heading) * sp;
      t.vz = -Math.sin(heading) * sp;
    }
    t.x += t.vx * dt;
    t.z += t.vz * dt;
    t.life -= dt;
    if (t.life <= 0) { torps.splice(i, 1); spent.push(t); }
  }
  return spent;
}
