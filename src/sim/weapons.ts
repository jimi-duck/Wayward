import { angleDelta, clamp } from '../core/math';
import type { FlightControls } from './controls';
import type { GameEvent } from './events';
import { newId } from './ids';
import type { ShipState } from './ship';
import { BASE, type Stats } from './stats';
import { BOLT_ELEVATE_CONE, TORP_SPACING, TORP_SPEED } from './tuning';

// ── phasers and torpedoes ─────────────────────────────────────────────────
// Phasers (button 1): hold to fire, two emitters alternating, limited by the
// phaser bank. Torpedoes (button 2, once the bay is fitted): one press, one
// launch from the rack (a salvo, with the swarm launcher), each locking the
// best target in a cone ahead and steering onto it.
// Both carry the ship's own velocity, as in the original: without it a ship at
// full impulse outruns its own fire.
//
// The ship steers on the plane but its enemies fly above and below it, so
// both weapons work in 3D: a lance fired with a hull in the narrow cone ahead
// is lifted or dropped onto that hull's altitude (the gunnery computer), and
// a torpedo climbs or dives after its target as it steers.
//
// Every number comes from the build's stat block (sim/stats.ts), so the
// same code fires a stock twin phaser, a seven-lance cone or a heavy lance.

export interface Bolt {
  x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number;
  dmg: number;
  /** Targets it can still pass through, and those it already has. */
  pierce: number;
  hit: number[];
  /** Radians per second it bends toward the hull nearest its nose. */
  homing: number;
  /** A disruptor bolt (Klingon tech): drawn heavier. */
  heavy?: boolean;
}

export interface Torpedo {
  id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  /** Speed across the plane: it starts slow and the motor builds it. */
  speed: number; life: number; target: number | null;
  dmg: number; blast: number; turn: number; max: number; accel: number; cone: number; seek: number;
  /** A swarm micro-torpedo or a bomblet: drawn small. */
  small: boolean;
}

export interface Arms {
  /** Phaser bank energy, 0 to the bank's size. */
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
  /** Phaser shots fired, for the disruptor's count. */
  shots: number;
}

export function newArms(s: Stats = BASE): Arms {
  return { bank: s.bankMax, bankWait: 0, cooldown: 0, side: 1, rack: s.torpRack, reload: 0, spacing: 0, dryFired: false, shots: 0 };
}

/** What changes how the guns fire this step, beyond the build. */
export interface FireMods {
  /** Overcharge overload or rapid fire: faster, and the bank is not drawn. */
  overload: boolean;
  /** Damage multiplier (overdrive, challenge modifiers). */
  damage: number;
  /** Drifting with the drift drive. */
  drifting: boolean;
}

export const NO_FIRE_MODS: FireMods = { overload: false, damage: 1, drifting: false };

const NOSE = 1.5; // units ahead of the ship's centre that fire leaves from
const EMITTER = 0.42; // units either side of the centreline

/** Anything a torpedo can lock: a rock, an enemy hull or a capital ship. Rock has no altitude: it is on the plane. */
export interface Target { id: number; x: number; y?: number; z: number; vx: number; vz: number; r: number; mark?: number; }

/** What the seeker can see: ships first, rock only when there is no ship. */
export interface Targets { ships: readonly Target[]; boss: Target | null; rocks: readonly Target[]; }

/**
 * The target a torpedo launched now would take: the original's scoring
 * (distance, made worse by how far off the nose; a capital ship counts as
 * closer; a painted target closer still), inside the seeker's range and a
 * cone ahead. Torpedoes hunt ships, as in the original; rock is a target only
 * when no ship is in the cone. `skip` leaves out targets already taken.
 */
export function acquire(t: Targets, x: number, z: number, heading: number, cone = BASE.torpCone, seek = BASE.torpSeek, skip?: ReadonlySet<number>): Target | null {
  let best: Target | null = null, bestScore = Infinity;
  const consider = (o: Target, bias: number) => {
    if (skip?.has(o.id)) return;
    const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz);
    if (d > seek || d < 0.01) return;
    const off = Math.abs(angleDelta(heading, Math.atan2(-dz, dx)));
    if (off > cone) return;
    const score = d * (1 + off * 0.55) * bias * (o.mark ? 0.4 : 1);
    if (score < bestScore) { bestScore = score; best = o; }
  };
  for (const o of t.ships) consider(o, 1);
  if (t.boss) consider(t.boss, 0.6);
  if (best) return best;
  for (const o of t.rocks) consider(o, 1);
  return best;
}

export function findTarget(t: Targets, id: number | null): Target | undefined {
  if (id === null) return undefined;
  if (t.boss && t.boss.id === id) return t.boss;
  return t.ships.find((o) => o.id === id) ?? t.rocks.find((o) => o.id === id);
}

/**
 * The gunnery computer: the altitude a lance fired now should climb or dive
 * to, and how far away that is. The nearest hull inside a narrow cone ahead
 * (widened by its size), within a lance's reach.
 */
export function elevation(t: Targets, x: number, z: number, heading: number, reach = BASE.phaserSpeed * BASE.phaserLife): { y: number; d: number } | null {
  let best: { y: number; d: number } | null = null;
  const consider = (o: Target) => {
    const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz);
    if (d > reach || d < 1 || (best && d > best.d)) return;
    const off = Math.abs(angleDelta(heading, Math.atan2(-dz, dx)));
    if (off < BOLT_ELEVATE_CONE + o.r / d) best = { y: o.y ?? 0, d };
  };
  for (const o of t.ships) consider(o);
  if (t.boss) consider(t.boss);
  return best;
}

export function launchTorpedo(torps: Torpedo[], s: Stats, x: number, z: number, heading: number, speed: number, target: Target | null, dmg: number, small = false): Torpedo {
  const tp: Torpedo = {
    id: newId(), x, y: 0, z, vx: Math.cos(heading) * speed, vy: 0, vz: -Math.sin(heading) * speed, speed, life: 3.4,
    target: target ? target.id : null, dmg, blast: s.torpBlast * (small ? 0.55 : 1), turn: s.torpTurn * (small ? 1.25 : 1),
    max: s.torpMax, accel: s.torpAccel, cone: s.torpCone, seek: s.torpSeek, small,
  };
  torps.push(tp);
  return tp;
}

export function fireWeapons(
  arms: Arms, ship: ShipState, c: FlightControls, targets: Targets, s: Stats, m: FireMods,
  bolts: Bolt[], torps: Torpedo[], events: GameEvent[], dt: number,
): void {
  arms.cooldown = Math.max(0, arms.cooldown - dt);
  arms.spacing = Math.max(0, arms.spacing - dt);
  if (arms.bank > s.bankMax) arms.bank = s.bankMax;
  if (arms.rack > s.torpRack) arms.rack = s.torpRack;
  const hx = Math.cos(ship.heading), hz = -Math.sin(ship.heading);

  // phasers
  if (c.fire && arms.cooldown === 0) {
    if (m.overload || arms.bank >= s.bankShot) {
      const n = s.phaserLances, cone = n > 1;
      const ox = cone ? 0 : Math.sin(ship.heading) * EMITTER * arms.side, oz = cone ? 0 : Math.cos(ship.heading) * EMITTER * arms.side;
      const x = ship.x + hx * NOSE + ox, z = ship.z + hz * NOSE + oz;
      const reach = s.phaserSpeed * s.phaserLife;
      // every nth shot a disruptor bolt, with salvaged Klingon tech
      const heavy = s.disruptor > 0 && ++arms.shots % s.disruptor === 0;
      const dmg = s.phaserDamage * m.damage * (m.drifting ? s.driftBonus : 1) * (heavy ? 3 : 1);
      for (let i = 0; i < n; i++) {
        const a = ship.heading + (i - (n - 1) / 2) * s.phaserSpread;
        const ax = Math.cos(a), az = -Math.sin(a);
        const el = elevation(targets, x, z, a, reach);
        const vy = el ? el.y / (el.d / s.phaserSpeed) : 0;
        bolts.push({
          x, y: 0, z, vx: ax * s.phaserSpeed + ship.vx, vy, vz: az * s.phaserSpeed + ship.vz, life: s.phaserLife,
          dmg, pierce: s.phaserPierce, hit: [], homing: s.phaserHoming, heavy,
        });
      }
      events.push({ type: 'bolt', x, z, heading: ship.heading });
      if (!m.overload) arms.bank -= s.bankShot;
      arms.bankWait = m.overload ? 0 : 0.35;
      arms.cooldown = s.phaserCooldown * (m.overload ? 0.5 : 1);
      arms.side = arms.side === 1 ? -1 : 1;
    } else if (!arms.dryFired) {
      arms.dryFired = true;
      events.push({ type: 'bankEmpty' });
    }
  }
  if (!c.fire) arms.dryFired = false;
  if (arms.bankWait > 0) arms.bankWait = Math.max(0, arms.bankWait - dt);
  else arms.bank = Math.min(s.bankMax, arms.bank + s.bankRefill * dt);

  if (!s.torpedoes) return;
  // torpedoes
  if (c.torpedo) {
    if (arms.rack > 0 && arms.spacing === 0) {
      const x = ship.x + hx * NOSE, z = ship.z + hz * NOSE;
      const forward = Math.max(0, ship.vx * hx + ship.vz * hz);
      const sp = TORP_SPEED + forward;
      const taken = new Set<number>();
      let first: number | null = null;
      for (let i = 0; i < s.torpSalvo; i++) {
        // a salvo fans out and spreads its locks across different targets
        const off = s.torpSalvo > 1 ? (i - (s.torpSalvo - 1) / 2) * 0.32 : 0;
        const target = acquire(targets, ship.x, ship.z, ship.heading, s.torpCone, s.torpSeek, taken)
          ?? acquire(targets, ship.x, ship.z, ship.heading, s.torpCone, s.torpSeek);
        if (target) taken.add(target.id);
        if (i === 0) first = target ? target.id : null;
        launchTorpedo(torps, s, x, z, ship.heading + off, sp, target, s.torpDamage * m.damage, s.torpSalvo > 1);
      }
      events.push({ type: 'torpedo', x, z, heading: ship.heading, target: first });
      if (arms.rack === s.torpRack) arms.reload = s.torpReload;
      arms.rack--;
      arms.spacing = TORP_SPACING;
    } else if (arms.rack === 0) {
      events.push({ type: 'rackEmpty' });
    }
  }
  if (arms.rack < s.torpRack) {
    arms.reload -= dt * (m.overload ? 4 : 1);
    if (arms.reload <= 0) {
      arms.rack++;
      arms.reload = arms.rack < s.torpRack ? s.torpReload : 0;
    }
  }
}

/** Move the lances; a homing lance bends toward the hull nearest its nose. */
export function moveBolts(bolts: Bolt[], dt: number, targets?: Targets): void {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]!;
    if (b.homing > 0 && targets) {
      const h = Math.atan2(-b.vz, b.vx), sp = Math.hypot(b.vx, b.vz);
      let best: Target | null = null, bestOff = 0.45;
      const consider = (o: Target) => {
        const dx = o.x - b.x, dz = o.z - b.z, d = Math.hypot(dx, dz);
        if (d > 70 || d < 0.5) return;
        const off = Math.abs(angleDelta(h, Math.atan2(-dz, dx)));
        if (off < bestOff) { bestOff = off; best = o; }
      };
      for (const o of targets.ships) consider(o);
      if (targets.boss) consider(targets.boss);
      if (best) {
        const o = best as Target;
        const want = Math.atan2(-(o.z - b.z), o.x - b.x);
        const nh = h + clamp(angleDelta(h, want), -b.homing * dt, b.homing * dt);
        b.vx = Math.cos(nh) * sp; b.vz = -Math.sin(nh) * sp;
        const d = Math.hypot(o.x - b.x, o.z - b.z);
        b.vy += clamp(((o.y ?? 0) - b.y) / Math.max(0.2, d / sp) - b.vy, -40 * dt, 40 * dt);
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    if (b.life <= 0) bolts.splice(i, 1);
  }
}

/** Steer each torpedo onto its target, leading a moving one. Returns those whose fuse ran out. */
export function moveTorpedoes(torps: Torpedo[], targets: Targets, dt: number): Torpedo[] {
  const spent: Torpedo[] = [];
  for (let i = torps.length - 1; i >= 0; i--) {
    const t = torps[i]!;
    t.speed = Math.min(t.max, t.speed + t.accel * dt);
    const sp = t.speed;
    let heading = Math.atan2(-t.vz, t.vx);
    let target = findTarget(targets, t.target);
    if (!target) {
      // a target that broke up hands the lock to the best of what is left
      target = acquire(targets, t.x, t.z, heading, t.cone, t.seek) ?? undefined;
      t.target = target ? target.id : null;
    }
    if (target) {
      // pure pursuit tail-chases a moving rock; lead it by the flight time,
      // capped at half a second (the original's TORP_LEAD)
      const d = Math.hypot(target.x - t.x, target.z - t.z);
      const lead = clamp(d / Math.max(1, sp), 0, 0.5);
      const want = Math.atan2(-(target.z + target.vz * lead - t.z), target.x + target.vx * lead - t.x);
      heading += clamp(angleDelta(heading, want), -t.turn * dt, t.turn * dt);
      // and climb or dive onto it, arriving as it arrives
      const wantVy = clamp(((target.y ?? 0) - t.y) / Math.max(0.25, d / sp), -sp * 0.8, sp * 0.8);
      t.vy += clamp(wantVy - t.vy, -80 * dt, 80 * dt);
    } else {
      t.vy *= Math.pow(0.9, dt * 60);
    }
    t.vx = Math.cos(heading) * sp;
    t.vz = -Math.sin(heading) * sp;
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.z += t.vz * dt;
    t.life -= dt;
    if (t.life <= 0) { torps.splice(i, 1); spent.push(t); }
  }
  return spent;
}
