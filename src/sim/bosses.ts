import { angleDelta, clamp } from '../core/math';
import {
  BEAM_FIRE, BEAM_WIND, newId, shotSpeed, spawnAlien, WEB_LIFE,
  type Alien, type AlienKind, type Faction, type Shot, type Web,
} from './enemies';
import type { GameEvent } from './events';
import type { Rng } from './rng';
import type { ShipState } from './ship';

// ── capital ships ─────────────────────────────────────────────────────────
// The original's BOSS_TYPES: each faction sends its own flagship, unlocked on
// the run clock, never the same faction twice running. The first arrives at
// 110s, then one every 68s, the gap closing by 4s a ship to a floor of 44s.
// Each holds station ahead of you, cycles its faction's attacks, calls in an
// escort wing, turns nastier at half hull, and leaves when its fuse runs out.
// A kill pays the bounty and two hull plates.

export const BOSS_FIRST = 110;
export const BOSS_WARN = 2.6;
const BOSS_R = 4.4;
export const bossGap = (n: number) => Math.max(44, 68 - n * 4);
const bossHp = (n: number) => 110 + n * 80 + n * n * 10;
export const bossBounty = (n: number, f: Faction) => Math.round((1800 + n * 700) * FACTIONS[f].bounty / 10) * 10;

type Attack = 'ring' | 'volley' | 'charge' | 'spiral' | 'cloak' | 'salvo' | 'beams' | 'tractor' | 'cage' | 'shards';

interface FactionDef {
  at: number; hull: AlienKind; names: string[]; hp: number; fuse: number; bounty: number;
  cycle: Attack[]; wing: AlienKind; wingN: number; wingHp: number;
}

export const FACTIONS: Record<Faction, FactionDef> = {
  klingon:    { at: 0,   hull: 'raptor',  names: ['I.K.S. Vor’cha', 'I.K.S. Negh’Var', 'I.K.S. Qu’Vat', 'I.K.S. Gr’oth'], hp: 1.2, fuse: 42, bounty: 1, cycle: ['ring', 'volley', 'charge'], wing: 'scout', wingN: 3, wingHp: 0.85 },
  cardassian: { at: 70,  hull: 'lancer',  names: ['Keldon-class Trager', 'Keldon-class Koranak', 'Keldon-class Prakesh', 'Keldon-class Rabol'], hp: 0.8, fuse: 46, bounty: 1, cycle: ['spiral', 'volley', 'ring'], wing: 'lancer', wingN: 3, wingHp: 0.85 },
  romulan:    { at: 95,  hull: 'warbird', names: ['I.R.W. Khazara', 'I.R.W. Valdore', 'I.R.W. Haakona', 'I.R.W. T’Met'], hp: 0.85, fuse: 46, bounty: 1.1, cycle: ['cloak', 'salvo', 'volley'], wing: 'warbird', wingN: 2, wingHp: 0.85 },
  borg:       { at: 138, hull: 'drone',   names: ['Tactical Cube 138', 'Tactical Cube 630', 'Tactical Cube 972', 'Tactical Cube 316'], hp: 1.15, fuse: 55, bounty: 1.3, cycle: ['beams', 'tractor', 'ring'], wing: 'drone', wingN: 4, wingHp: 0.3 },
  tholian:    { at: 158, hull: 'weaver',  names: ['Tholian Tarantula', 'Tholian Recluse', 'Tholian Widow', 'Tholian Orb-Weaver'], hp: 1, fuse: 46, bounty: 1.1, cycle: ['cage', 'shards', 'ring'], wing: 'weaver', wingN: 3, wingHp: 1 },
};
const ORDER: Faction[] = ['klingon', 'cardassian', 'romulan', 'borg', 'tholian'];

export interface Boss {
  id: number; faction: Faction; name: string; n: number;
  x: number; z: number; vx: number; vz: number; face: number;
  hp: number; maxHp: number; r: number;
  attack: Attack; attackT: number; cycleI: number; shotT: number; spin: number;
  fuse: number; leaving: boolean; cloak: number; hitT: number; soaked: number;
  /** two beams for the Borg; the charge vector for the Klingon */
  beams: Array<{ x: number; z: number; beamT: number; beamAng: number }>;
  chargeT: number;
}

export class Command {
  boss: Boss | null = null;
  next = BOSS_FIRST;
  count = 0;
  kills = 0;
  private last: Faction | null = null;
  private warned = false;
  private seen: Partial<Record<Faction, number>> = {};
  private pending: { faction: Faction; name: string } | null = null;

  reset(): void {
    this.boss = null; this.next = BOSS_FIRST; this.count = 0; this.kills = 0;
    this.last = null; this.warned = false; this.seen = {}; this.pending = null;
  }

  /** Warnings, arrivals, the fight itself, and departures. */
  step(t: number, dt: number, s: ShipState, aliens: Alien[], shots: Shot[], webs: Web[], rng: Rng, events: GameEvent[]): void {
    if (!this.boss) {
      if (!this.warned && t >= this.next - BOSS_WARN) {
        this.pending = this.pick(t, rng);
        this.warned = true;
        events.push({ type: 'bossWarn', name: this.pending.name, faction: this.pending.faction });
      }
      if (this.pending && t >= this.next) this.arrive(t, s, aliens, rng, events);
      return;
    }
    this.fight(this.boss, t, dt, s, shots, webs, rng, events);
  }

  /** The boss took damage. Returns true if it broke up. */
  hurt(dmg: number): boolean {
    const b = this.boss;
    if (!b || b.leaving || b.cloak > 0.5) return false;
    // the cube adapts, as its drones do: once it has soaked enough, half damage
    if (b.faction === 'borg' && b.soaked >= 30) dmg *= 0.5;
    b.soaked += dmg;
    b.hp -= dmg;
    b.hitT = 0.1;
    return b.hp <= 0;
  }

  /** Kill bookkeeping; the world pays the bounty. */
  killed(t: number): number {
    const b = this.boss!;
    const bounty = bossBounty(b.n, b.faction);
    this.kills++;
    this.end(t);
    return bounty;
  }

  targetable(): Boss | null {
    const b = this.boss;
    return b && !b.leaving && b.cloak < 0.5 ? b : null;
  }

  private pick(t: number, rng: Rng): { faction: Faction; name: string } {
    // the first contact of a run is never the Romulan ambush (the original's rule)
    let pool = ORDER.filter((f) => FACTIONS[f].at <= t && f !== this.last && !(this.count === 0 && f === 'romulan'));
    if (!pool.length) pool = ['klingon'];
    const f = pool[rng.int(pool.length)]!;
    const k = this.seen[f] ?? 0;
    const def = FACTIONS[f];
    const base = def.names[k % def.names.length]!, mk = Math.floor(k / def.names.length);
    return { faction: f, name: mk ? `${base} MK${mk + 1}` : base };
  }

  private arrive(t: number, s: ShipState, aliens: Alien[], rng: Rng, events: GameEvent[]): void {
    const { faction, name } = this.pending!;
    const def = FACTIONS[faction];
    const hp = Math.round(bossHp(this.count) * def.hp);
    // in front of the ship, so the chase camera sees it come in
    const x = s.x + Math.cos(s.heading) * 60, z = s.z - Math.sin(s.heading) * 60;
    this.boss = {
      id: newId(), faction, name, n: this.count, x, z, vx: 0, vz: 0, face: s.heading + Math.PI,
      hp, maxHp: hp, r: BOSS_R, attack: def.cycle[0]!, attackT: 4, cycleI: 0, shotT: 0, spin: 0,
      fuse: def.fuse, leaving: false, cloak: 0, hitT: 0, soaked: 0, beams: [], chargeT: 0,
    };
    this.seen[faction] = (this.seen[faction] ?? 0) + 1;
    this.last = faction;
    this.count++;
    this.pending = null;
    // the escort wing comes in with her, together
    for (let i = 0; i < def.wingN; i++) {
      const a = (i / def.wingN) * Math.PI * 2;
      const e = spawnAlien(def.wing, s, t, rng, { x: x + Math.cos(a) * 9, z: z + Math.sin(a) * 9 });
      e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * def.wingHp));
      aliens.push(e);
    }
    events.push({ type: 'bossArrive', name, faction, x, z });
  }

  private end(t: number): void {
    this.boss = null;
    this.warned = false;
    this.next = t + bossGap(this.count);
  }

  private fight(b: Boss, t: number, dt: number, s: ShipState, shots: Shot[], webs: Web[], rng: Rng, events: GameEvent[]): void {
    if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
    const dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz) || 1;
    const aim = Math.atan2(-dz, dx);

    b.fuse -= dt;
    if (b.fuse <= 0 && !b.leaving) {
      b.leaving = true;
      events.push({ type: 'bossLeft', name: b.name });
    }
    if (b.leaving) {
      b.vx += (-dx / d) * 30 * dt; b.vz += (-dz / d) * 30 * dt;
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (d > 110) this.end(t);
      return;
    }

    // hold station ahead of the ship at about 26 units, sliding to keep it
    const hx = s.x + Math.cos(s.heading) * 26, hz = s.z - Math.sin(s.heading) * 26;
    if (b.attack === 'charge' && b.chargeT > 0) {
      b.chargeT -= dt;
    } else {
      const gx = hx - b.x, gz = hz - b.z;
      b.vx += gx * 1.6 * dt; b.vz += gz * 1.6 * dt;
      const k = Math.pow(0.93, dt * 60);
      b.vx *= k; b.vz *= k;
    }
    b.x += b.vx * dt; b.z += b.vz * dt;
    b.face += clamp(angleDelta(b.face, aim), -1.5 * dt, 1.5 * dt);
    if (b.cloak > 0) b.cloak = Math.max(0, b.cloak - dt * 0.7);

    // the attack cycle, faster at half hull
    const rage = b.hp < b.maxHp / 2;
    b.attackT -= dt;
    if (b.attackT <= 0) {
      const cycle = FACTIONS[b.faction].cycle;
      b.cycleI = (b.cycleI + 1) % cycle.length;
      b.attack = cycle[b.cycleI]!;
      b.attackT = rage ? 2.6 : 3.4;
      b.shotT = 0;
      this.open(b, s, aim, d, t, shots, webs, rng, events);
    }
    b.shotT -= dt;
    const sp = shotSpeed(t);
    const fire = (a: number, speed = sp, extra: Partial<Shot> = {}) => shots.push({
      id: newId(), x: b.x, z: b.z, vx: Math.cos(a) * speed, vz: -Math.sin(a) * speed, life: 3.2, r: 0.45,
      faction: b.faction, hp: 0, seek: 0, split: 0, ...extra,
    });
    switch (b.attack) {
      case 'volley':
        if (b.shotT <= 0) { b.shotT = rage ? 0.28 : 0.38; for (const o of [-0.18, 0, 0.18]) fire(aim + o); }
        break;
      case 'spiral':
        if (b.shotT <= 0) { b.shotT = rage ? 0.06 : 0.09; b.spin += 0.42; fire(b.spin, sp * 0.8); fire(b.spin + Math.PI, sp * 0.8); }
        break;
      case 'shards':
        if (b.shotT <= 0) { b.shotT = rage ? 0.5 : 0.7; fire(aim, sp * 0.8, { split: 0.6, r: 0.5 }); }
        break;
      case 'beams':
      case 'tractor':
        for (const bm of b.beams) {
          bm.x = b.x; bm.z = b.z;
          bm.beamT = Math.max(0, bm.beamT - dt);
          const want = Math.atan2(-(s.z - b.z), s.x - b.x);
          bm.beamAng += clamp(angleDelta(bm.beamAng, want), -0.7 * dt, 0.7 * dt);
        }
        if (b.attack === 'tractor' && d < 56) {
          // the tractor lock: thrust away from the cube to break it
          s.vx += (-dx / d) * 16 * dt;
          s.vz += (-dz / d) * 16 * dt;
        }
        break;
    }
  }

  /** The moment an attack begins. */
  private open(b: Boss, s: ShipState, aim: number, d: number, t: number, shots: Shot[], webs: Web[], rng: Rng, events: GameEvent[]): void {
    const sp = shotSpeed(t);
    const fire = (a: number, speed = sp, extra: Partial<Shot> = {}) => shots.push({
      id: newId(), x: b.x, z: b.z, vx: Math.cos(a) * speed, vz: -Math.sin(a) * speed, life: 3.2, r: 0.45,
      faction: b.faction, hp: 0, seek: 0, split: 0, ...extra,
    });
    b.beams = [];
    switch (b.attack) {
      case 'ring':
        for (let i = 0; i < 20; i++) fire(aim + (i / 20) * Math.PI * 2, sp * 0.7);
        break;
      case 'charge':
        // a ramming run: straight at where you are
        b.chargeT = 0.9;
        b.vx = (Math.cos(aim) * 44);
        b.vz = (-Math.sin(aim) * 44);
        events.push({ type: 'bossCharge', x: b.x, z: b.z });
        break;
      case 'cloak':
        b.cloak = 1;
        break;
      case 'salvo':
        for (const o of [-0.5, 0, 0.5]) fire(aim + o, 2.2 * 6, { life: 8, r: 0.8, hp: 3, seek: 1.05 });
        break;
      case 'beams':
        for (const o of [-0.35, 0.35]) b.beams.push({ x: b.x, z: b.z, beamT: BEAM_WIND + BEAM_FIRE, beamAng: aim + o });
        break;
      case 'tractor':
        b.beams.push({ x: b.x, z: b.z, beamT: BEAM_WIND + BEAM_FIRE, beamAng: aim });
        if (d < 56) events.push({ type: 'tractor' });
        break;
      case 'cage':
        for (let i = 0; i < 4; i++) {
          const a = rng.range(0, Math.PI * 2);
          webs.push({ id: newId(), x: s.x + Math.cos(a) * 13, z: s.z + Math.sin(a) * 13, life: WEB_LIFE * 0.7, r: 0 });
        }
        events.push({ type: 'webSet', x: s.x, z: s.z });
        break;
    }
  }
}
