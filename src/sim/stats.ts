import { HULL, type Hull } from '../content/hulls';
import {
  BANK_MAX, BANK_REFILL, BANK_SHOT, BOLT_DAMAGE, BOLT_LIFE, BOLT_SPEED, HIT_GRACE, PX, ROLL_COOLDOWN, ROLL_IFRAMES, ROLL_KICK,
  SHIELD_DELAY, SHIELD_MAX, SHIELD_RECHARGE, SHOT_COOLDOWN, TORP_ACCEL, TORP_BLAST, TORP_CONE, TORP_DAMAGE, TORP_MAX, TORP_RELOAD, TORP_SEEK, TORP_TURN,
} from './tuning';
import { SELF_REPAIR } from './repair';
import { thrustPerStep, topSpeed } from './ship';

// ── the ship's numbers ────────────────────────────────────────────────────
// Everyone flies the same hull, so everything an upgrade can change lives in
// one flat block. A run's block is rebuilt from scratch whenever the build
// changes: start from BASE, let every owned upgrade level change it, then
// clamp (`capStats`). The caps come last, after every multiplier, which is
// the lesson the original learned the hard way: a cap applied per upgrade is
// no cap at all once three upgrades multiply the same number.

export interface Stats {
  // lasers (button 1)
  laserDamage: number;
  laserCooldown: number;
  laserSpeed: number;
  laserLife: number;
  /** Extra targets a lance passes through. */
  laserPierce: number;
  /** Lances per shot (the cone), and the angle between them. */
  laserLances: number;
  laserSpread: number;
  /** Radians per second a lance bends toward the hull nearest the nose (the array). */
  laserHoming: number;
  bankMax: number;
  bankShot: number;
  bankRefill: number;
  /** Damage multiplier on lances fired while drifting (off the throttle). */
  driftBonus: number;
  /** Laser hits paint their target for the torpedoes. */
  painter: boolean;

  // torpedoes (button 2)
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

  // seismic mines (laid by themselves)
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

  // drive plasma (laid while thrusting)
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
  /** Upgrades: thrust raises both acceleration and top speed. */
  thrust: number;
  turn: number;
  /** What the ship's loads do (sim/budgets.ts): multipliers on acceleration and on top speed, 1 for the stock ship. */
  accel: number;
  speed: number;
  grip: number;
  rollCooldown: number;
  rollKick: number;
  rollIframes: number;
  drift: boolean;

  // defence
  maxPlates: number;
  /** Shield charges the meter holds; a hit takes a whole charge. */
  shieldMax: number;
  /** Seconds the meter takes to fill one charge, once it is recharging. */
  shieldRecharge: number;
  /** Seconds without damage before the meter starts to fill. */
  shieldDelay: number;
  grace: number;
  damageControl: number;
  reactive: boolean;
  /** Story mode: seconds without damage before a plate grows back; 0 for never. */
  regen: number;
  /** Self-repair (the arcade, sim/repair.ts): seconds without damage before it starts, plates a second, plates a quiet spell, and whether danger near holds it. */
  repairDelay: number;
  repairRate: number;
  repairMax: number;
  repairUnderFire: boolean;

  // utility
  tractor: number;
  xpMult: number;

  // the whole ship
  /** Multiplier on every weapon's damage. */
  dmgAll: number;
  /** Rides on the plasma vent: plasma wreathes the hull while you thrust. */
  plasmaCorona: boolean;
  /** A ram discharges an arc into the hulls near its target. */
  ramArc: boolean;

  // the economy (utility)
  /** Multipliers: rock's chance of krail, hull repairs' chance, booster time, booster frequency, an elite's krail. */
  crystalChance: number;
  repairChance: number;
  powerTime: number;
  boostRate: number;
  eliteLoot: number;

  // salvaged tech (from capital ships)
  /** Every nth laser shot is a disruptor bolt at triple damage; 0 for none. */
  disruptor: number;
  /** Seconds a barrel roll hides you from enemy guns. */
  rollCloak: number;
  /** Seconds a blast snares the hulls it catches. */
  snare: number;

  // encounter control (sim/pacing.ts)
  /** Multiplier on how far off patrols and watchers notice you: lower is quieter. */
  notice: number;
  /** Multiplier on the quiet spells between encounters. */
  lull: number;
}

export const BASE: Readonly<Stats> = Object.freeze({
  laserDamage: BOLT_DAMAGE, laserCooldown: SHOT_COOLDOWN, laserSpeed: BOLT_SPEED, laserLife: BOLT_LIFE,
  laserPierce: 0, laserLances: 1, laserSpread: 0.11, laserHoming: 0,
  bankMax: BANK_MAX, bankShot: BANK_SHOT, bankRefill: BANK_REFILL, driftBonus: 1, painter: false,

  torpedoes: false, torpRack: 2, torpReload: TORP_RELOAD, torpDamage: TORP_DAMAGE, torpBlast: TORP_BLAST,
  torpTurn: TORP_TURN, torpSeek: TORP_SEEK, torpCone: TORP_CONE, torpMax: TORP_MAX, torpAccel: TORP_ACCEL,
  torpSalvo: 1, torpCluster: 0, torpVsShips: 1, markBonus: 1, torpPlasma: false, torpArc: 0,

  mines: false, mineInterval: 5, mineMax: 4, mineLife: 16, mineDamage: 7, mineBlast: 6.5, mineTrigger: 4.2,
  mineSeek: 0, mineChain: false, mineGravity: false, mineDetonate: false,

  plasma: false, plasmaDps: 10, plasmaLife: 1.5, plasmaRadius: 1.9, plasmaBurn: 0, rollBurst: false,

  arc: false, arcInterval: 1.05, arcRange: 8.5, arcDamage: 2.5, arcTargets: 2, arcJumps: 0, arcShield: false,

  ramDamage: 3, ramSafe: false, ramjet: false,

  thrust: 1, turn: 1, accel: 1, speed: 1, grip: HULL.grip, rollCooldown: ROLL_COOLDOWN, rollKick: ROLL_KICK, rollIframes: ROLL_IFRAMES,
  drift: false,

  maxPlates: HULL.plates, shieldMax: SHIELD_MAX, shieldRecharge: SHIELD_RECHARGE, shieldDelay: SHIELD_DELAY, grace: HIT_GRACE, damageControl: 0, reactive: false, regen: 0,
  repairDelay: SELF_REPAIR.delay, repairRate: 1 / SELF_REPAIR.perPlate, repairMax: SELF_REPAIR.max, repairUnderFire: false,

  tractor: 165 * PX, xpMult: 1,

  dmgAll: 1, plasmaCorona: false, ramArc: false,
  crystalChance: 1, repairChance: 1, powerTime: 1, boostRate: 1, eliteLoot: 1,
  disruptor: 0, rollCloak: 0, snare: 0,
  notice: 1, lull: 1,
});

export const newStats = (): Stats => ({ ...BASE });

/** The hard limits, applied once every upgrade has had its say. */
export const CAPS = {
  laserDamageMult: 5,
  laserCooldown: 0.09,
  laserLances: 7,
  laserPierce: 4,
  laserReach: 190,
  bankShotMin: 3,
  torpRack: 6,
  torpReload: 1.1,
  torpSalvo: 6,
  torpDamageMult: 8,
  torpBlast: 18,
  mineInterval: 0.7,
  mineMax: 16,
  mineBlast: 13,
  arcInterval: 0.5,
  arcTargets: 6,
  arcRange: 16,
  maxPlates: 5,
  shieldMax: 3,
  shieldRecharge: 2.5,
  shieldDelay: 1.2,
  grace: 2.2,
  tractor: 42,
  xpMult: 1.5,
  thrust: 1.45,
  turn: 1.6,
  rollCooldown: 0.45,
  /** A roll covers the ship for at most this share of the time until the next, so rolling on the cooldown always leaves a gap. */
  rollCover: 0.8,
  dmgAll: 1.6,
  /** A ram that kills costs no hull, and the arc fires by itself, so both have a ceiling. */
  ramDamage: 18,
  arcDamage: 5,
  crystalChance: 2,
  repairChance: 2.5,
  /** Self-repair: never sooner than this, never faster than a plate in this many seconds, never more plates a spell than this. */
  repairDelay: 2.5,
  repairPlate: 8,
  repairMax: 3,
  /** Quiet running: patrols still see you this close, and quiet spells stretch this far at most. */
  notice: 0.55,
  lull: 1.6,
} as const;

/** Clamp a finished block. Mutates and returns it. */
export function capStats(s: Stats): Stats {
  s.laserDamage = Math.min(s.laserDamage, BASE.laserDamage * CAPS.laserDamageMult);
  s.laserCooldown = Math.max(s.laserCooldown, CAPS.laserCooldown);
  s.laserLances = Math.min(Math.round(s.laserLances), CAPS.laserLances);
  s.laserPierce = Math.min(Math.round(s.laserPierce), CAPS.laserPierce);
  if (s.laserSpeed * s.laserLife > CAPS.laserReach) s.laserLife = CAPS.laserReach / s.laserSpeed;
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
  s.shieldDelay = Math.max(s.shieldDelay, CAPS.shieldDelay);
  s.grace = Math.min(s.grace, CAPS.grace);
  s.tractor = Math.min(s.tractor, CAPS.tractor);
  s.xpMult = Math.min(s.xpMult, CAPS.xpMult);
  s.thrust = Math.min(s.thrust, CAPS.thrust);
  s.turn = Math.min(s.turn, CAPS.turn);
  s.rollCooldown = Math.max(s.rollCooldown, CAPS.rollCooldown);
  s.rollIframes = Math.min(s.rollIframes, s.rollCooldown * CAPS.rollCover);
  s.dmgAll = Math.min(s.dmgAll, CAPS.dmgAll);
  s.ramDamage = Math.min(s.ramDamage, CAPS.ramDamage);
  s.arcDamage = Math.min(s.arcDamage, CAPS.arcDamage);
  s.crystalChance = Math.min(s.crystalChance, CAPS.crystalChance);
  s.repairChance = Math.min(s.repairChance, CAPS.repairChance);
  s.repairDelay = Math.max(s.repairDelay, CAPS.repairDelay);
  s.repairRate = Math.min(s.repairRate, 1 / CAPS.repairPlate);
  s.repairMax = Math.min(Math.round(s.repairMax), CAPS.repairMax);
  s.notice = Math.max(s.notice, CAPS.notice);
  s.lull = Math.min(s.lull, CAPS.lull);
  return s;
}

/** The hull the flight model flies, with the build's engines, thrusters and dampers. */
export function flightHull(s: Stats): Hull {
  // acceleration and top speed are set apart: the drive pushes `a`, and the drag is what holds the top speed at `top`
  const a = HULL.thrust * s.thrust * s.accel, base = topSpeed(HULL), top = base * s.thrust * s.speed;
  const push = thrustPerStep({ ...HULL, thrust: a });
  return {
    ...HULL,
    plates: s.maxPlates,
    thrust: a,
    drag: top / (push + top),
    rot: HULL.rot * s.turn,
    grip: s.grip,
    rollCooldown: s.rollCooldown,
    rollKick: s.rollKick,
    rollIframes: s.rollIframes,
    drift: s.drift,
  };
}
