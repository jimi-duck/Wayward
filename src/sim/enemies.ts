import { angleDelta, clamp } from '../core/math';
import type { GameEvent } from './events';
import type { Rng } from './rng';
import type { ShipState } from './ship';
import { HZ, PX } from './tuning';

// ── the enemy roster ──────────────────────────────────────────────────────
// Ported from the original's ALIEN_TYPES, ALIEN_MOVE and ALIEN_FIRE. Seven
// hulls across five factions, unlocked on the run clock, and each asks a
// different question:
//
//   scout   · Bird-of-Prey. Strafes past, takes pot shots. The baseline.
//   raptor  · K'Tinga. Lines up, then commits to a run straight through you.
//   lancer  · Galor. A slow platform that fires in fans.
//   warbird · Romulan. Holds station at range and lobs a plasma torpedo
//             that follows you, and that your phasers can shoot down.
//   stalker · Heavy Bird-of-Prey. Steers at you and leads its shots.
//   drone   · Borg cube. Grinds straight at you and cuts with a tracking
//             beam; adapts (half damage) once it has soaked enough.
//   weaver  · Tholian. Flies to a point, spins a web, leaves. The web hurts.
//
// The original measured in px and 60Hz frames. Here distances are ×PX and
// px/frame speeds are ×PX×HZ (units per second).

export type Faction = 'klingon' | 'cardassian' | 'romulan' | 'borg' | 'tholian';
export type AlienKind = 'scout' | 'raptor' | 'lancer' | 'warbird' | 'stalker' | 'drone' | 'weaver';
type Move = 'strafe' | 'run' | 'standoff' | 'chase' | 'grind' | 'anchor';
type Fire = 'fan' | 'burst' | 'plasma' | 'lead' | 'beam' | 'none';

const V = PX * HZ; // px/frame → units/second

export interface AlienType {
  r: number; hp: number; speed: number; bonus: number; heart: number; at: number; weight: number;
  cd: number; shots: number; cap: number; bob: number; faction: Faction; move: Move; fire: Fire; ttl: number;
}

export const ALIEN_TYPES: Record<AlienKind, AlienType> = {
  scout:   { r: 1.5, hp: 2,  speed: 1.55 * V, bonus: 150, heart: 0.28, at: 0,   weight: 3, cd: 1,    shots: 1, cap: 4, bob: 2.6, faction: 'klingon',    move: 'strafe',   fire: 'fan',    ttl: 0 },
  raptor:  { r: 1.7, hp: 4,  speed: 1.35 * V, bonus: 300, heart: 0.30, at: 40,  weight: 2, cd: 1,    shots: 2, cap: 2, bob: 0,   faction: 'klingon',    move: 'run',      fire: 'burst',  ttl: 0 },
  lancer:  { r: 1.9, hp: 5,  speed: 0.95 * V, bonus: 280, heart: 0.36, at: 70,  weight: 2, cd: 1.55, shots: 3, cap: 2, bob: 1.5, faction: 'cardassian', move: 'strafe',   fire: 'fan',    ttl: 0 },
  warbird: { r: 2.1, hp: 6,  speed: 1.05 * V, bonus: 420, heart: 0.34, at: 95,  weight: 2, cd: 2.3,  shots: 1, cap: 2, bob: 0,   faction: 'romulan',    move: 'standoff', fire: 'plasma', ttl: 22 },
  stalker: { r: 1.6, hp: 4,  speed: 1.15 * V, bonus: 340, heart: 0.40, at: 115, weight: 2, cd: 1.3,  shots: 1, cap: 2, bob: 0,   faction: 'klingon',    move: 'chase',    fire: 'lead',   ttl: 24 },
  drone:   { r: 2.0, hp: 14, speed: 0.52 * V, bonus: 520, heart: 0.42, at: 138, weight: 2, cd: 1,    shots: 0, cap: 2, bob: 0,   faction: 'borg',       move: 'grind',    fire: 'beam',   ttl: 0 },
  weaver:  { r: 1.5, hp: 3,  speed: 1.45 * V, bonus: 380, heart: 0.30, at: 158, weight: 2, cd: 1,    shots: 0, cap: 1, bob: 0,   faction: 'tholian',    move: 'anchor',   fire: 'none',   ttl: 0 },
};
export const ALIEN_ORDER = Object.keys(ALIEN_TYPES) as AlienKind[];

// The original's difficulty curves, on the run clock t (seconds).
const PAST_OPEN = 60;
export const ALIEN_FIRST = 4;
export const alienInterval = (t: number) => Math.max(2.4, 7.5 - t * 0.03);
export const alienCooldown = (t: number) => Math.max(0.7, 2.2 - t * 0.009);
const alienSpread = (t: number) => Math.max(0.07, 0.26 - t * 0.0014);
export const shotSpeed = (t: number) => Math.min(5.6, 3.1 + t * 0.012) * V;
export const alienMax = (t: number) => Math.min(9, 3 + Math.floor(t / 24) + (t > PAST_OPEN ? 1 : 0));
const alienHpScale = (t: number) => 1 + Math.min(1.7, t / 125);

// Borg adaptation, plasma, beams and webs: the original's numbers.
export const BORG_ADAPT = 6;
const PLASMA_SPEED = 2.2 * V, PLASMA_TURN = 1.05, PLASMA_HP = 3;
export const BEAM_WIND = 1.05, BEAM_FIRE = 1.35, BEAM_LEN = 540 * PX, BEAM_W = 0.7;
const BEAM_TRACK = 0.85;
export const WEB_R = 86 * PX, WEB_LIFE = 12, WEB_GROW = 0.55;
const WEB_SPIN = 1.5;

export interface Alien {
  id: number; kind: AlienKind; x: number; z: number; vx: number; vz: number;
  face: number; hp: number; maxHp: number; r: number; age: number; nextShot: number;
  phase: string; phaseT: number; ttl: number; fleeing: boolean; slide: number;
  /** strafers: the line they fly and how far along it */
  ox: number; oz: number; dx: number; dz: number;
  /** anchor point (weaver) */
  ax: number; az: number;
  /** beam: seconds left (wind then fire) and its angle */
  beamT: number; beamAng: number;
  /** damage soaked (Borg adaptation) */
  soaked: number;
  hitT: number;
  /** part of a capital ship's escort wing */
  escort: boolean;
}

export interface Shot {
  id: number; x: number; z: number; vx: number; vz: number; life: number; r: number; faction: Faction;
  /** plasma: shootable, and steers after the ship */
  hp: number; seek: number;
  /** shards: seconds until it splits in three */
  split: number;
}

export interface Web { id: number; x: number; z: number; life: number; r: number; }
export interface Pickup { id: number; x: number; z: number; vx: number; vz: number; life: number; }

let nextId = 1;
export const newId = () => nextId++;

/** Choose the next hull to send: unlocked by the clock, under its cap, by weight. */
export function pickKind(t: number, aliens: readonly Alien[], rng: Rng): AlienKind | null {
  const pool: AlienKind[] = [];
  let total = 0;
  for (const k of ALIEN_ORDER) {
    const T = ALIEN_TYPES[k];
    if (T.at > t || aliens.filter((a) => a.kind === k && !a.escort).length >= T.cap) continue;
    pool.push(k);
    total += T.weight;
  }
  let roll = rng.next() * total;
  for (const k of pool) { roll -= ALIEN_TYPES[k].weight; if (roll <= 0) return k; }
  return pool[pool.length - 1] ?? null;
}

export function spawnAlien(kind: AlienKind, ship: ShipState, t: number, rng: Rng, at?: { x: number; z: number }): Alien {
  const T = ALIEN_TYPES[kind];
  const a = rng.range(0, Math.PI * 2), d = rng.range(48, 58);
  const x = at ? at.x : ship.x + Math.cos(a) * d, z = at ? at.z : ship.z + Math.sin(a) * d;
  const hp = Math.round(T.hp * alienHpScale(t));
  const al: Alien = {
    id: newId(), kind, x, z, vx: 0, vz: 0, face: Math.atan2(-(ship.z - z), ship.x - x), hp, maxHp: hp, r: T.r, age: 0,
    nextShot: t + alienCooldown(t) * T.cd * rng.range(0.6, 1.2), phase: 'line', phaseT: 1.5, ttl: T.ttl, fleeing: false,
    slide: rng.next() < 0.5 ? 1 : -1, ox: x, oz: z, dx: 0, dz: 0, ax: 0, az: 0, beamT: 0, beamAng: 0, soaked: 0, hitT: 0, escort: !!at,
  };
  if (T.move === 'strafe') {
    // a pass across the ship's neighbourhood, never straight at it
    const px = ship.x + rng.range(-14, 14), pz = ship.z + rng.range(-14, 14);
    const l = Math.hypot(px - x, pz - z) || 1;
    al.dx = (px - x) / l; al.dz = (pz - z) / l;
    al.vx = al.dx * T.speed; al.vz = al.dz * T.speed;
  }
  if (T.move === 'anchor') {
    al.phase = 'seek';
    al.ax = ship.x + ship.vx * 1.2 + rng.range(-9, 9);
    al.az = ship.z + ship.vz * 1.2 + rng.range(-9, 9);
  }
  return al;
}

/** Move one alien a step: the original's ALIEN_MOVE, on the plane. */
export function moveAlien(al: Alien, s: ShipState, dt: number, webs: Web[], events: GameEvent[]): void {
  const T = ALIEN_TYPES[al.kind];
  al.age += dt;
  if (al.hitT > 0) al.hitT = Math.max(0, al.hitT - dt);
  const tx = s.x - al.x, tz = s.z - al.z, d = Math.hypot(tx, tz) || 1;
  const flee = (k: number) => {
    if (al.fleeing) return;
    al.fleeing = true;
    al.vx = (-tx / d) * T.speed * k;
    al.vz = (-tz / d) * T.speed * k;
  };
  switch (T.move) {
    case 'strafe': {
      // along the line, bobbing across it
      const bob = Math.sin(al.age * 2) * T.bob;
      const along = al.age * T.speed;
      al.x = al.ox + al.dx * along - al.dz * bob;
      al.z = al.oz + al.dz * along + al.dx * bob;
      al.face = Math.atan2(-al.dz, al.dx);
      return;
    }
    case 'chase':
      al.ttl -= dt;
      if (al.ttl > 0 && !al.fleeing) {
        al.vx += (tx / d) * 0.06 * V * 60 * dt;
        al.vz += (tz / d) * 0.06 * V * 60 * dt;
        const k = Math.pow(0.975, dt * 60);
        al.vx *= k; al.vz *= k;
        const sp = Math.hypot(al.vx, al.vz), cap = T.speed * 1.9;
        if (sp > cap) { al.vx *= cap / sp; al.vz *= cap / sp; }
      } else flee(2.4);
      break;
    case 'run':
      al.phaseT -= dt;
      if (al.phase === 'line') {
        const want = Math.atan2(-tz, tx);
        al.face += angleDelta(al.face, want) * (1 - Math.pow(0.95, dt * 60));
        al.vx = -Math.cos(al.face) * T.speed * 0.5;
        al.vz = Math.sin(al.face) * T.speed * 0.5;
        if (al.phaseT <= 0) {
          al.phase = 'run'; al.phaseT = 2;
          al.vx = Math.cos(al.face) * T.speed * 2.7;
          al.vz = -Math.sin(al.face) * T.speed * 2.7;
        }
      } else if (al.phaseT <= 0) { al.phase = 'line'; al.phaseT = 1.5 + (al.id % 5) * 0.16; }
      break;
    case 'standoff': {
      al.ttl -= dt;
      if (al.ttl <= 0) { flee(2.4); break; }
      const push = (d - 38) * 0.016 * V; // the original: (d - 380px) × 0.0016
      al.vx += (tx / d) * push * dt * 60;
      al.vz += (tz / d) * push * dt * 60;
      al.phaseT -= dt;
      if (al.phaseT <= 0) { al.slide = -al.slide; al.phaseT = 2 + (al.id % 7) * 0.35; }
      al.vx += (-tz / d) * 0.014 * V * al.slide * dt * 60;
      al.vz += (tx / d) * 0.014 * V * al.slide * dt * 60;
      const k = Math.pow(0.97, dt * 60);
      al.vx *= k; al.vz *= k;
      const sp = Math.hypot(al.vx, al.vz), cap = T.speed * 1.7;
      if (sp > cap) { al.vx *= cap / sp; al.vz *= cap / sp; }
      break;
    }
    case 'grind':
      al.vx = (tx / d) * T.speed;
      al.vz = (tz / d) * T.speed;
      break;
    case 'anchor':
      if (al.phase === 'seek') {
        const ax = al.ax - al.x, az = al.az - al.z, ad = Math.hypot(ax, az) || 1;
        if (ad < 1.4) { al.phase = 'spin'; al.phaseT = WEB_SPIN; al.vx = al.vz = 0; }
        else { al.vx = (ax / ad) * T.speed * 1.8; al.vz = (az / ad) * T.speed * 1.8; }
      } else if (al.phase === 'spin') {
        al.phaseT -= dt;
        if (al.phaseT <= 0) {
          webs.push({ id: newId(), x: al.x, z: al.z, life: WEB_LIFE, r: 0 });
          events.push({ type: 'webSet', x: al.x, z: al.z });
          al.phase = 'leave';
          al.vx = (-tx / d) * T.speed * 2.3;
          al.vz = (-tz / d) * T.speed * 2.3;
        }
      }
      break;
  }
  al.x += al.vx * dt;
  al.z += al.vz * dt;
  if (T.move !== 'run' && Math.hypot(al.vx, al.vz) > 0.5) al.face = Math.atan2(-al.vz, al.vx);
}

/** The original's ALIEN_FIRE, when an alien's cooldown is up. */
export function alienFire(al: Alien, s: ShipState, t: number, shots: Shot[], rng: Rng, events: GameEvent[]): void {
  const T = ALIEN_TYPES[al.kind];
  if (T.fire === 'none' || al.fleeing || t < al.nextShot) return;
  const d = Math.hypot(s.x - al.x, s.z - al.z);
  if (d > 62) { al.nextShot = t + 0.4; return; }
  al.nextShot = t + alienCooldown(t) * T.cd * rng.range(0.85, 1.15);
  const sp = shotSpeed(t);
  const aim = Math.atan2(-(s.z - al.z), s.x - al.x);
  const shot = (a: number, speed = sp, extra: Partial<Shot> = {}) => shots.push({
    id: newId(), x: al.x, z: al.z, vx: Math.cos(a) * speed, vz: -Math.sin(a) * speed, life: 2.9, r: 0.35,
    faction: T.faction, hp: 0, seek: 0, split: 0, ...extra,
  });
  switch (T.fire) {
    case 'fan': {
      const a = aim + (rng.next() - 0.5) * 2 * alienSpread(t);
      for (let i = 0; i < T.shots; i++) shot(a + (i - (T.shots - 1) / 2) * 0.2);
      break;
    }
    case 'lead': {
      const lead = d / sp;
      const a = Math.atan2(-(s.z + s.vz * lead * 0.55 - al.z), s.x + s.vx * lead * 0.55 - al.x) + (rng.next() - 0.5) * 2 * alienSpread(t);
      shot(a);
      break;
    }
    case 'burst':
      if (al.phase !== 'run') { al.nextShot = t + 0.25; return; }
      for (const side of [-1, 1]) {
        shots.push({
          id: newId(), x: al.x + Math.sin(al.face) * side * al.r * 0.5, z: al.z + Math.cos(al.face) * side * al.r * 0.5,
          vx: Math.cos(al.face) * sp * 1.15, vz: -Math.sin(al.face) * sp * 1.15, life: 2.6, r: 0.35,
          faction: T.faction, hp: 0, seek: 0, split: 0,
        });
      }
      break;
    case 'plasma':
      shot(aim, PLASMA_SPEED, { life: 8, r: 0.8, hp: PLASMA_HP, seek: PLASMA_TURN });
      events.push({ type: 'plasma', x: al.x, z: al.z });
      break;
    case 'beam':
      al.beamT = BEAM_WIND + BEAM_FIRE;
      al.beamAng = aim;
      al.nextShot = t + 5.4;
      break;
  }
}

/** Beams track toward the ship while winding up and firing. */
export function stepBeam(al: { x: number; z: number; beamT: number; beamAng: number }, s: ShipState, dt: number): void {
  if (al.beamT <= 0) return;
  al.beamT = Math.max(0, al.beamT - dt);
  const want = Math.atan2(-(s.z - al.z), s.x - al.x);
  al.beamAng += clamp(angleDelta(al.beamAng, want), -BEAM_TRACK * dt, BEAM_TRACK * dt);
}

/** True while a beam is live (past its wind-up). */
export const beamLive = (b: { beamT: number }) => b.beamT > 0 && b.beamT <= BEAM_FIRE;

/** Shortest distance from (px, pz) to a ray from (x, z) at angle a, length len. */
export function rayDist(px: number, pz: number, x: number, z: number, a: number, len: number): number {
  const dx = Math.cos(a), dz = -Math.sin(a);
  const t = clamp((px - x) * dx + (pz - z) * dz, 0, len);
  return Math.hypot(px - (x + dx * t), pz - (z + dz * t));
}

export function moveShots(shots: Shot[], s: ShipState, dt: number): void {
  for (let i = shots.length - 1; i >= 0; i--) {
    const b = shots[i]!;
    if (b.seek) {
      const sp = Math.hypot(b.vx, b.vz);
      let a = Math.atan2(-b.vz, b.vx);
      a += clamp(angleDelta(a, Math.atan2(-(s.z - b.z), s.x - b.x)), -b.seek * dt, b.seek * dt);
      b.vx = Math.cos(a) * sp; b.vz = -Math.sin(a) * sp;
    }
    if (b.split > 0 && (b.split -= dt) <= 0) {
      // Tholian shards break in three
      const sp = Math.hypot(b.vx, b.vz), a = Math.atan2(-b.vz, b.vx);
      for (const o of [-0.45, 0.45]) shots.push({ ...b, id: newId(), split: 0, vx: Math.cos(a + o) * sp, vz: -Math.sin(a + o) * sp });
      b.split = 0;
    }
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    if (b.life <= 0) shots.splice(i, 1);
  }
}

export function stepWebs(webs: Web[], dt: number): void {
  for (let i = webs.length - 1; i >= 0; i--) {
    const w = webs[i]!;
    w.life -= dt;
    w.r = WEB_R * Math.min(1, (WEB_LIFE - w.life) / WEB_GROW);
    if (w.life <= 0) webs.splice(i, 1);
  }
}
