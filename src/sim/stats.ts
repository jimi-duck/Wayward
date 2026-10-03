import { HULL, type Hull } from '../content/hulls';
import {
  BANK_MAX, BANK_REFILL, BANK_SHOT, BOLT_DAMAGE, BOLT_LIFE, BOLT_SPEED, HIT_GRACE, PX, ROLL_COOLDOWN, ROLL_IFRAMES, ROLL_KICK,
  SHOT_COOLDOWN, TORP_ACCEL, TORP_BLAST, TORP_CONE, TORP_DAMAGE, TORP_MAX, TORP_RELOAD, TORP_SEEK, TORP_TURN,
} from './tuning';

// ── the ship's numbers ────────────────────────────────────────────────────
// Everyone flies the same hull, so everything an upgrade can change lives in
// one flat block. A run's block is rebuilt from scratch whenever the build
// changes: start from BASE, let every owned upgrade level change it, then
// clamp (`capStats`). The caps come last, after every multiplier, which is
// the lesson the original learned the hard way: a cap applied per upgrade is
// no cap at all once three upgrades multiply the same number.

export interface Stats {
  // phasers (button 1)
  phaserDamage: number;
  phaserCooldown: number;
  phaserSpeed: number;
  phaserLife: number;
  /** Extra targets a lance passes through. */
  phaserPierce: number;
  /** Lances per shot (the cone), and the angle between them. */
  phaserLances: number;
  phaserSpread: number;
  /** Radians per second a lance bends toward the hull nearest the nose (the array). */
  phaserHoming: number;
  bankMax: number;
  bankShot: number;
  bankRefill: number;
  /** Damage multiplier on lances fired while drifting (off the throttle). */
  driftBonus: number;
  /** Phaser hits paint their target for the torpedoes. */
  painter: boolean;

  // photon torpedoes (button 2)
  torpedoes: boolean;
  torpRack: number;
  torpReload: number;
  torpDamage: number;
  torpBlast: number;
  torpTurn: number;
  torpSeek: number;
  torpCone: number;
  torpMax: number;
  torpAccel: number;
  /** Torpedoes per press (the swarm). */
  torpSalvo: number;
  /** Bomblets thrown out by each blast. */
  torpCluster: number;
  /** Damage multiplier against hulls (precision guidance). */
  torpVsShips: number;
  /** Damage multiplier against a painted target. */
  markBonus: number;
  /** Blasts leave a burning plasma cloud. */
  torpPlasma: boolean;
  /** Blasts arc to this many nearby hulls. */
  torpArc: number;

  // tricobalt mines (laid by themselves)
  mines: boolean;
  mineInterval: number;
  mineMax: number;
  mineLife: number;
  mineDamage: number;
  mineBlast: number;
  mineTrigger: number;
  /** 0: mines sit still; above 0, they drift toward a hull in reach at this speed. */
  mineSeek: number;
  mineChain: boolean;
  mineGravity: boolean;
  /** Lances that hit a mine set it off, harder. */
  mineDetonate: boolean;

  // warp plasma (laid while thrusting)
  plasma: boolean;
  plasmaDps: number;
  plasmaLife: number;
  plasmaRadius: number;
  /** Damage per second a hull keeps burning for after touching the trail. */
  plasmaBurn: number;
  /** The barrel roll dumps a ring of plasma. */
  rollBurst: boolean;

  // the hull arc (fires by itself at close range)
  arc: boolean;
  arcInterval: number;
  arcRange: number;
  arcDamage: number;
  arcTargets: number;
  arcJumps: number;
  /** A shield charge breaking discharges an arc at everything near. */
  arcShield: boolean;

  // ramming
  ramDamage: number;
  /** A ram that destroys its target costs no hull. */
  ramSafe: boolean;
  /** Rams land during a barrel roll, and hit harder with speed. */
  ramjet: boolean;

  // the ship
  thrust: number;
  turn: number;
  grip: number;
  rollCooldown: number;
  rollKick: number;
  rollIframes: number;
  drift: boolean;
  /** Grazes during a roll count double and refund the roll. */
  evasion: boolean;

  // defence
  maxPlates: number;
  shieldMax: number;
  shieldRecharge: number;
  grace: number;
  damageControl: number;
  reactive: boolean;
  /** Seconds without damage before a plate is repaired; 0 for never. */
  regen: number;

  // utility and the warp core
  tractor: number;
  xpMult: number;
  ocGain: number;
  ocRadius: number;
  ocDamage: number;
  ocOverload: number;
  /** Seconds of intangibility a release gives (the phase cloak). */
  ocPhase: number;
  /** A release refills the torpedo rack and lays a ring of mines. */
  ocRefill: boolean;
}

export const BASE: Readonly<Stats> = Object.freeze({
  phaserDamage: BOLT_DAMAGE, phaserCooldown: SHOT_COOLDOWN, phaserSpeed: BOLT_SPEED, phaserLife: BOLT_LIFE,
  phaserPierce: 0, phaserLances: 1, phaserSpread: 0.11, phaserHoming: 0,
  bankMax: BANK_MAX, bankShot: BANK_SHOT, bankRefill: BANK_REFILL, driftBonus: 1, painter: false,

  torpedoes: false, torpRack: 2, torpReload: TORP_RELOAD, torpDamage: TORP_DAMAGE, torpBlast: TORP_BLAST,
  torpTurn: TORP_TURN, torpSeek: TORP_SEEK, torpCone: TORP_CONE, torpMax: TORP_MAX, torpAccel: TORP_ACCEL,
  torpSalvo: 1, torpCluster: 0, torpVsShips: 1, markBonus: 1, torpPlasma: false, torpArc: 0,

  mines: false, mineInterval: 2.6, mineMax: 5, mineLife: 16, mineDamage: 7, mineBlast: 6.5, mineTrigger: 3.5,
  mineSeek: 0, mineChain: false, mineGravity: false, mineDetonate: false,

  plasma: false, plasmaDps: 10, plasmaLife: 1.5, plasmaRadius: 1.9, plasmaBurn: 0, rollBurst: false,

  arc: false, arcInterval: 0.9, arcRange: 9, arcDamage: 2.5, arcTargets: 2, arcJumps: 0, arcShield: false,

  ramDamage: 3, ramSafe: false, ramjet: false,

  thrust: 1, turn: 1, grip: HULL.grip, rollCooldown: ROLL_COOLDOWN, rollKick: ROLL_KICK, rollIframes: ROLL_IFRAMES,
  drift: false, evasion: false,

  maxPlates: HULL.plates, shieldMax: 0, shieldRecharge: 20, grace: HIT_GRACE, damageControl: 0, reactive: false, regen: 0,

  tractor: 165 * PX, xpMult: 1, ocGain: 1, ocRadius: 20, ocDamage: 10, ocOverload: 4, ocPhase: 0, ocRefill: false,
});

export const newStats = (): Stats => ({ ...BASE });

/** The hard limits, applied once every upgrade has had its say. */
export const CAPS = {
  phaserDamageMult: 5,
  phaserCooldown: 0.09,
  phaserLances: 7,
  phaserPierce: 4,
  phaserReach: 190,
  bankShotMin: 3,
  torpRack: 6,
  torpReload: 1.1,
  torpSalvo: 6,
  torpDamageMult: 8,
  torpBlast: 18,
  mineInterval: 0.7,
  mineMax: 16,
  mineBlast: 13,
  arcInterval: 0.32,
  arcTargets: 6,
  arcRange: 16,
  maxPlates: 5,
  shieldMax: 2,
  shieldRecharge: 9,
  grace: 2.2,
  tractor: 42,
  xpMult: 1.5,
  thrust: 1.45,
  turn: 1.6,
  rollCooldown: 0.45,
  ocRadius: 34,
  ocGain: 2.2,
} as const;

/** Clamp a finished block. Mutates and returns it. */
export function capStats(s: Stats): Stats {
  s.phaserDamage = Math.min(s.phaserDamage, BASE.phaserDamage * CAPS.phaserDamageMult);
  s.phaserCooldown = Math.max(s.phaserCooldown, CAPS.phaserCooldown);
  s.phaserLances = Math.min(Math.round(s.phaserLances), CAPS.phaserLances);
  s.phaserPierce = Math.min(Math.round(s.phaserPierce), CAPS.phaserPierce);
  if (s.phaserSpeed * s.phaserLife > CAPS.phaserReach) s.phaserLife = CAPS.phaserReach / s.phaserSpeed;
  s.bankShot = Math.max(s.bankShot, CAPS.bankShotMin);
  s.torpRack = Math.max(1, Math.min(Math.round(s.torpRack), CAPS.torpRack));
  s.torpReload = Math.max(s.torpReload, CAPS.torpReload);
  s.torpSalvo = Math.min(Math.round(s.torpSalvo), CAPS.torpSalvo);
  s.torpDamage = Math.min(s.torpDamage, BASE.torpDamage * CAPS.torpDamageMult);
  s.torpBlast = Math.min(s.torpBlast, CAPS.torpBlast);
  s.mineInterval = Math.max(s.mineInterval, CAPS.mineInterval);
  s.mineMax = Math.min(Math.round(s.mineMax), CAPS.mineMax);
  s.mineBlast = Math.min(s.mineBlast, CAPS.mineBlast);
  s.arcInterval = Math.max(s.arcInterval, CAPS.arcInterval);
  s.arcTargets = Math.min(Math.round(s.arcTargets), CAPS.arcTargets);
  s.arcRange = Math.min(s.arcRange, CAPS.arcRange);
  s.maxPlates = Math.min(Math.round(s.maxPlates), CAPS.maxPlates);
  s.shieldMax = Math.min(Math.round(s.shieldMax), CAPS.shieldMax);
  s.shieldRecharge = Math.max(s.shieldRecharge, CAPS.shieldRecharge);
  s.grace = Math.min(s.grace, CAPS.grace);
  s.tractor = Math.min(s.tractor, CAPS.tractor);
  s.xpMult = Math.min(s.xpMult, CAPS.xpMult);
  s.thrust = Math.min(s.thrust, CAPS.thrust);
  s.turn = Math.min(s.turn, CAPS.turn);
  s.rollCooldown = Math.max(s.rollCooldown, CAPS.rollCooldown);
  s.ocRadius = Math.min(s.ocRadius, CAPS.ocRadius);
  s.ocGain = Math.min(s.ocGain, CAPS.ocGain);
  return s;
}

/** The hull the flight model flies, with the build's engines, thrusters and dampers. */
export function flightHull(s: Stats): Hull {
  return {
    ...HULL,
    plates: s.maxPlates,
    thrust: HULL.thrust * s.thrust,
    rot: HULL.rot * s.turn,
    grip: s.grip,
    rollCooldown: s.rollCooldown,
    rollKick: s.rollKick,
    rollIframes: s.rollIframes,
    drift: s.drift,
  };
}
