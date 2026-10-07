import type { Strike } from './bosses';
import { leave, provoke, type Alien, type EliteId } from './enemies';
import type { GameEvent } from './events';
import type { Field } from './field';
import { newId } from './ids';
import type { CellSource, PickupKind } from './pickups';
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
//   Skirmish           · two crews at each other ahead: raiders on a convoy.
//                        They ignore you until you come close or shoot. Wait it
//                        out and the loser's wrecks lie there (loot lasts longer
//                        than usual in a mode that salvages) and the winner is
//                        battered; step in early and both turn on you. Only the
//                        Raider mode draws it (content/survival.ts `events`).

export type EncounterId = 'rich_field' | 'distress' | 'derelict' | 'convoy' | 'ion_storm' | 'nebula' | 'anomaly' | 'skirmish';

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
  skirmish:   { id: 'skirmish',   name: 'Skirmish',           at: 60,  weight: 1,   duration: 75, text: 'Raiders on a convoy · let it burn out' },
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
  /** A skirmish: who is on each side, which side loses, and where the fight stands. */
  fight?: Fight;
}

export interface Fight {
  a: number[];
  b: number[];
  loser: 'a' | 'b';
  /** Seconds to the next exchange of fire. */
  tempo: number;
  /** The fight is decided (the winners come to look the ship over), and when. */
  over: boolean;
  overAt: number;
  /** The ship came close or shot at someone: every hull turns on it. */
  alarm: boolean;
  /** Hulls lost so far. */
  wrecks: number;
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
  /** The cell a source gives (sim/pickups.ts CELL). */
  cell(source: CellSource): PickupKind;
  repair(n: number): boolean;
  addScore(points: number): void;
  /** A hull lost in someone else's fight: it goes up and leaves its wreck, nobody's kill. */
  wreck(al: Alien): void;
}

const ahead = (s: ShipState, d: number, side = 0): [number, number] => {
  const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), rx = Math.sin(s.heading), rz = Math.cos(s.heading);
  return [s.x + fx * d + rx * side, s.z + fz * d + rz * side];
};

/** The event to run next: by its weight, times the survival mode's weight for it (none at all: it never comes). */
export function pickEncounter(t: number, last: EncounterId | null, unlocked: ReadonlySet<string>, rng: Rng, weights: Partial<Record<EncounterId, number>> = {}): EncounterId | null {
  const w = (id: EncounterId) => ENCOUNTERS[id].weight * (weights[id] ?? 1);
  const pool = ENCOUNTER_ORDER.filter((id) => {
    const d = ENCOUNTERS[id];
    return d.at <= t && id !== last && (!d.locked || unlocked.has(id)) && w(id) > 0;
  });
  if (!pool.length) return null;
  let total = 0;
  for (const id of pool) total += w(id);
  let roll = rng.next() * total;
  for (const id of pool) { roll -= w(id); if (roll <= 0) return id; }
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
    case 'skirmish': {
      // raiders (Gutter) on a convoy (Custody), far enough ahead to watch: the sides hold station either side of the centre
      const side = rng.next() < 0.5 ? 1 : -1;
      const [cx, cz] = ahead(s, 85, side * 35);
      const px = Math.sin(s.heading), pz = Math.cos(s.heading); // across the line of sight
      const crew = (variants: string[], k: number) => variants.map((v, i) => {
        const x = cx + px * k * 13 + rng.range(-5, 5), z = cz + pz * k * 13 + rng.range(-5, 5);
        const al = h.spawnHostile(v, { x, y: rng.range(1, 7), z }, null, true);
        al.mode = 'brawl'; al.ax = x; al.az = z; al.ttl = 999; al.cloak = 0; al.slide = i % 2 ? 1 : -1; al.cruiseY = al.y;
        return al.id;
      });
      e.fight = { a: crew(['scout', 'scout', 'raptor'], -1), b: crew(['freighter', 'picket', 'picket'], 1), loser: rng.next() < 0.5 ? 'a' : 'b', tempo: 2, over: false, overAt: 0, alarm: false, wrecks: 0 };
      e.ids = [...e.fight.a, ...e.fight.b];
      e.x = cx; e.z = cz; e.r = 20;
      break;
    }
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
          h.dropItem(h.cell('derelict'), e.x, e.z);
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
    case 'skirmish': {
      const f = e.fight!;
      const live = (ids: number[]) => ids.map((id) => h.aliens.find((a) => a.id === id)).filter((a): a is Alien => !!a);
      const A = live(f.a), B = live(f.b);
      const all = [...A, ...B];
      if (!all.length) return finish(e, h, f.wrecks > 0);
      if (!f.alarm && all.some((a) => a.mode !== 'brawl' && !(f.over && a.mode === 'approach'))) {
        // the ship was noticed: whoever is left in the fight turns on it
        f.alarm = true;
        for (const a of all) if (a.mode === 'brawl') provoke(a, h.events);
      }
      if (!f.over && !f.alarm && (f.tempo -= dt) <= 0) {
        f.tempo = rng.range(0.9, 1.5);
        const [lose, win] = f.loser === 'a' ? [A, B] : [B, A];
        // the losing side is ground down; the winning side is hurt, but never finished
        const hit = (from: Alien | undefined, to: Alien | undefined, share: number, floor: number) => {
          if (!to) return;
          if (from) h.events.push({ type: 'enemyFire', x: from.x, y: from.y, z: from.z, faction: from.faction });
          to.hp = Math.max(floor * to.maxHp, to.hp - to.maxHp * share);
          to.hitT = 0.1;
          h.events.push({ type: 'alienHit', x: to.x, y: to.y, z: to.z, id: to.id });
        };
        const shooter = (side: Alien[]) => { const guns = side.filter((a) => a.kind !== 'freighter'); return guns[rng.int(Math.max(1, guns.length))]; };
        const victim = lose[rng.int(lose.length)];
        hit(shooter(win), victim, 0.17, 0);
        if (victim && victim.hp <= 0.01) { h.wreck(victim); f.wrecks++; }
        hit(shooter(lose), win[rng.int(win.length)], 0.05, 0.3);
      }
      if (!f.over && !f.alarm && (f.loser === 'a' ? A : B).length === 0) {
        // decided: the winners come to look you over
        f.over = true;
        f.overAt = e.t;
        for (const a of f.loser === 'a' ? B : A) {
          if (a.kind === 'freighter') leave(a);
          else { a.mode = 'approach'; a.approach = 'investigate'; a.modeT = 16; }
        }
      }
      if (f.over && e.t - f.overAt > 30) return finish(e, h, f.wrecks > 0);
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
        h.dropItem(h.cell('rescue'), e.x, e.z);
        h.addScore(1500);
        text = fixed ? 'Survivors aboard · hull repaired' : 'Survivors aboard · krail transferred';
      } else text = 'Signal lost';
      break;
    case 'derelict': text = success ? 'Salvage aboard · contacts closing' : 'The hulk drifts off'; break;
    case 'convoy':
      if (success) h.addScore(Math.round(800 * e.progress));
      text = e.progress >= 1 ? 'Convoy destroyed' : e.progress > 0 ? 'Convoy broken' : 'Convoy got away';
      break;
    case 'skirmish': text = success ? 'The fight is over · the wrecks are yours' : 'They broke it off'; break;
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
