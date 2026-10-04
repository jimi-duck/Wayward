import type { Strike } from './bosses';
import type { Alien, EliteId } from './enemies';
import type { GameEvent } from './events';
import type { Field } from './field';
import { newId } from './ids';
import type { PickupKind } from './pickups';
import type { Rng } from './rng';
import type { ShipState } from './ship';

// ── sector events ─────────────────────────────────────────────────────────
// Every minute or so, when no capital ship is about, the sector does
// something: a short change to the battlefield or a small decision, never a
// menu. Each is a row in ENCOUNTERS and a case in start/step/finish below.
//
//   Mineral-rich field · rich rock everywhere for half a minute: go mining.
//   Distress signal    · a beacon ahead; hold position in its circle while
//                        the sector comes for you. Pays a hull repair.
//   Derelict hulk      · salvage it for a power-up and krail, and spring
//                        the ambush waiting for whoever does.
//   Enemy convoy       · freighters crossing under escort, heavy with
//                        krail. They will not stop for you.
//   Ion storm          · lightning lands where the circles are drawn, on
//                        anything; near misses charge the core twice as fast.
//   Nebula             · sensors fail: short radar, short torpedo locks, a
//                        thick fog; the core charges faster in it.
//   Spatial anomaly    · a gravity well drags in everything, rock, fire,
//                        crystals and you, and crushes what reaches its core.

export type EncounterId = 'rich_field' | 'distress' | 'derelict' | 'convoy' | 'ion_storm' | 'nebula' | 'anomaly';

export interface EncounterDef {
  id: EncounterId;
  name: string;
  /** Not before this many seconds into a run. */
  at: number;
  weight: number;
  duration: number;
  /** Needs a long-term unlock. */
  locked?: boolean;
  /** The banner line when it starts. */
  text: string;
}

export const ENCOUNTERS: Record<EncounterId, EncounterDef> = {
  rich_field: { id: 'rich_field', name: 'Mineral-rich field', at: 60,  weight: 1.2, duration: 32, text: 'Krail readings off the scale' },
  distress:   { id: 'distress',   name: 'Distress signal',    at: 90,  weight: 1,   duration: 42, text: 'Hold position at the beacon' },
  convoy:     { id: 'convoy',     name: 'Enemy convoy',       at: 150, weight: 1,   duration: 46, text: 'Freighters crossing, heavy with krail' },
  ion_storm:  { id: 'ion_storm',  name: 'Ion storm',          at: 200, weight: 1,   duration: 26, text: 'Lightning on the circles · grazes charge double' },
  nebula:     { id: 'nebula',     name: 'Nebula',             at: 240, weight: 0.9, duration: 30, text: 'Sensors down · the core charges faster' },
  derelict:   { id: 'derelict',   name: 'Derelict hulk',      at: 120, weight: 1,   duration: 45, locked: true, text: 'Salvage it, if you dare' },
  anomaly:    { id: 'anomaly',    name: 'Spatial anomaly',    at: 300, weight: 0.8, duration: 26, locked: true, text: 'Gravity well · everything falls in' },
};
export const ENCOUNTER_ORDER = Object.keys(ENCOUNTERS) as EncounterId[];

export interface Encounter {
  id: EncounterId;
  t: number;
  dur: number;
  /** The point of interest: beacon, hulk, well. */
  x: number; z: number; r: number;
  /** 0 to 1: holding, salvaging. */
  progress: number;
  done: boolean;
  success: boolean;
  /** Seconds to the next lightning strike, the hulk's drift, convoy ids. */
  timer: number;
  ids: number[];
  /** A place on the chart playing this event (content/phenomena.ts): its name on the banners. */
  place?: string;
}

/** What an event needs from the world it runs in. */
export interface EncounterHost {
  readonly rng: Rng;
  readonly ship: ShipState;
  readonly field: Field;
  readonly aliens: Alien[];
  readonly strikes: Strike[];
  readonly events: GameEvent[];
  spawnHostile(variant: string, at?: { x: number; y: number; z: number }, elite?: EliteId | null, extra?: boolean): Alien;
  dropCrystals(x: number, z: number, total: number): void;
  dropItem(kind: PickupKind, x: number, z: number): void;
  randomPower(): PickupKind;
  repair(n: number): boolean;
  addScore(points: number): void;
}

const ahead = (s: ShipState, d: number, side = 0): [number, number] => {
  const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), rx = Math.sin(s.heading), rz = Math.cos(s.heading);
  return [s.x + fx * d + rx * side, s.z + fz * d + rz * side];
};

export function pickEncounter(t: number, last: EncounterId | null, unlocked: ReadonlySet<string>, rng: Rng): EncounterId | null {
  const pool = ENCOUNTER_ORDER.filter((id) => {
    const d = ENCOUNTERS[id];
    return d.at <= t && id !== last && (!d.locked || unlocked.has(id));
  });
  if (!pool.length) return null;
  let total = 0;
  for (const id of pool) total += ENCOUNTERS[id].weight;
  let roll = rng.next() * total;
  for (const id of pool) { roll -= ENCOUNTERS[id].weight; if (roll <= 0) return id; }
  return pool[pool.length - 1]!;
}

/** Start an event; `place`, a place on the chart playing it, with its own name and banner line. */
export function startEncounter(id: EncounterId, h: EncounterHost, place?: { name: string; text: string }): Encounter {
  const def = ENCOUNTERS[id], s = h.ship, rng = h.rng;
  const e: Encounter = { id, t: 0, dur: def.duration, x: s.x, z: s.z, r: 0, progress: 0, done: false, success: false, timer: 1, ids: [], place: place?.name };
  switch (id) {
    case 'rich_field':
      h.field.richBoost = 0.35;
      h.field.density = 1.25;
      break;
    case 'distress': {
      [e.x, e.z] = ahead(s, 55, rng.range(-20, 20));
      e.r = 11;
      // the signal draws attention
      for (let i = 0; i < 2; i++) h.spawnHostile('scout', { x: e.x + rng.range(-30, 30), y: rng.range(4, 12), z: e.z + rng.range(-30, 30) }, null, true);
      break;
    }
    case 'derelict':
      [e.x, e.z] = ahead(s, 60, rng.range(-25, 25));
      e.r = 7;
      break;
    case 'convoy': {
      // three freighters crossing ahead, one escort fighter each side
      const side = rng.next() < 0.5 ? 1 : -1;
      const [cx, cz] = ahead(s, 70, -side * 90);
      const dx = Math.sin(s.heading) * side, dz = Math.cos(s.heading) * side; // the ship's starboard, flipped by side
      for (let i = 0; i < 3; i++) {
        const al = h.spawnHostile('freighter', { x: cx - dx * i * 12, y: rng.range(-1, 3), z: cz - dz * i * 12 }, null, true);
        al.ax = dx; al.az = dz;
        al.face = Math.atan2(-dz, dx);
        e.ids.push(al.id);
      }
      for (let i = 0; i < 2; i++) h.spawnHostile('picket', { x: cx + rng.range(-8, 8), y: 6, z: cz + rng.range(-8, 8) }, null, true);
      e.x = cx; e.z = cz;
      break;
    }
    case 'ion_storm':
      e.timer = 1.2;
      break;
    case 'nebula':
      break;
    case 'anomaly':
      [e.x, e.z] = ahead(s, 38, rng.range(-15, 15));
      e.r = 3.5;
      break;
  }
  h.events.push({ type: 'sectorEvent', id, name: place?.name ?? def.name, text: place?.text ?? def.text });
  return e;
}

/** Advance an event. Returns true when it is over (finish() has been called). */
export function stepEncounter(e: Encounter, h: EncounterHost, dt: number): boolean {
  if (e.done) return true;
  e.t += dt;
  const s = h.ship, rng = h.rng;
  switch (e.id) {
    case 'distress': {
      if (Math.hypot(s.x - e.x, s.z - e.z) < e.r) e.progress = Math.min(1, e.progress + dt / 7);
      // more come while you hold
      e.timer -= dt;
      if (e.timer <= 0) {
        e.timer = rng.range(5, 8);
        const a = rng.range(0, Math.PI * 2);
        h.spawnHostile(rng.next() < 0.5 ? 'scout' : 'raptor', { x: e.x + Math.cos(a) * 45, y: rng.range(4, 14), z: e.z + Math.sin(a) * 45 }, null, true);
      }
      if (e.progress >= 1) return finish(e, h, true);
      break;
    }
    case 'derelict':
      if (e.progress < 1 && Math.hypot(s.x - e.x, s.z - e.z) < e.r) {
        e.progress = Math.min(1, e.progress + dt / 3.5);
        if (e.progress >= 1) {
          // the salvage, and the trap
          h.dropItem(h.randomPower(), e.x, e.z);
          h.dropCrystals(e.x, e.z, 30);
          h.addScore(1000);
          // an Office of Peace ambush, decloaking round the hulk
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + rng.range(-0.4, 0.4);
            h.spawnHostile(rng.next() < 0.6 ? 'whisper' : 'scout', { x: e.x + Math.cos(a) * 32, y: rng.range(2, 10), z: e.z + Math.sin(a) * 32 }, null, true);
          }
          return finish(e, h, true);
        }
      }
      break;
    case 'convoy': {
      const left = e.ids.filter((id) => h.aliens.some((a) => a.id === id));
      e.progress = 1 - left.length / Math.max(1, e.ids.length);
      if (left.length === 0) return finish(e, h, true);
      break;
    }
    case 'ion_storm':
      e.timer -= dt;
      if (e.timer <= 0) {
        e.timer = rng.range(0.7, 1.4);
        // most land near you, some anywhere
        const near = rng.next() < 0.7;
        const lead = near ? rng.range(0.3, 1.1) : 0;
        const x = near ? s.x + s.vx * lead + rng.range(-7, 7) : s.x + rng.range(-50, 50);
        const z = near ? s.z + s.vz * lead + rng.range(-7, 7) : s.z + rng.range(-60, 20);
        h.strikes.push({ id: newId(), kind: 'lightning', x, z, r: 3.6, t: 1.1, total: 1.1, faction: null });
      }
      break;
    case 'anomaly':
      e.x += (s.x - e.x) * 0.02 * dt;
      e.z += (s.z - e.z) * 0.02 * dt;
      break;
  }
  if (e.t >= e.dur) return finish(e, h, e.id === 'rich_field' || e.id === 'ion_storm' || e.id === 'nebula' || e.id === 'anomaly' || (e.id === 'convoy' && e.progress > 0));
  return false;
}

function finish(e: Encounter, h: EncounterHost, success: boolean): true {
  e.done = true;
  e.success = success;
  const def = ENCOUNTERS[e.id];
  let text = success ? 'Complete' : 'Lost';
  switch (e.id) {
    case 'rich_field': h.field.richBoost = 0; h.field.density = 1; text = 'The seam runs out'; break;
    case 'distress':
      if (success) {
        const fixed = h.repair(1);
        if (!fixed) h.dropCrystals(e.x, e.z, 25);
        h.dropItem(h.randomPower(), e.x, e.z);
        h.addScore(1500);
        text = fixed ? 'Survivors aboard · hull repaired' : 'Survivors aboard · krail transferred';
      } else text = 'Signal lost';
      break;
    case 'derelict': text = success ? 'Salvage aboard · contacts closing' : 'The hulk drifts off'; break;
    case 'convoy':
      if (success) h.addScore(Math.round(800 * e.progress));
      text = e.progress >= 1 ? 'Convoy destroyed' : e.progress > 0 ? 'Convoy broken' : 'Convoy got away';
      break;
    case 'ion_storm': text = 'The storm passes'; break;
    case 'nebula': text = 'Sensors restored'; break;
    case 'anomaly': text = 'The anomaly collapses'; h.addScore(600); break;
  }
  h.events.push({ type: 'sectorEventEnd', id: e.id, name: e.place ?? def.name, text, success });
  return true;
}

/** The anomaly's pull on something at (x, z), as an acceleration. */
export function wellPull(e: Encounter, x: number, z: number, strength: number): [number, number] {
  const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz) || 1;
  if (d > 55) return [0, 0];
  const k = strength * (1 - d / 55) * (1 - d / 55) * 2 + strength * 0.15;
  return [(dx / d) * k, (dz / d) * k];
}
