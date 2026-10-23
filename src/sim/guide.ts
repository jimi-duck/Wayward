import { angleDelta } from '../core/math';
import { ENCOUNTERS } from './encounters';
import { ALIEN_TYPES, cloaked, FIRE_RANGE } from './enemies';
import { topSpeed } from './ship';
import { lockLifted } from './postjump';
import type { World } from './world';

// ── the guide ─────────────────────────────────────────────────────────────
// What the navigation strip reads: where to go, and who is where, as a bearing
// off the nose and a distance. Plain numbers, so a test can fly the scenarios
// (objective ahead, turned away, behind, a crowd, a circling hull, top speed).
// Bearings are radians off the nose, in (-PI, PI]; positive is to the left, the
// way the screen and the scope turn.

/** Hulls further than this (units, 1.1 km) are not worth a mark. */
export const GUIDE_RANGE = 110;
/** A hull further than this (units, 1.2 km: hulls are culled at 2.1 km) shows only as an unknown contact: no faction, no worth, no type. */
export const IDENT_RANGE = 120;
/** Within this off the nose a thing counts as dead ahead. */
export const AHEAD = (8 * Math.PI) / 180;
/** Further round than this it counts as behind. */
export const BEHIND = (135 * Math.PI) / 180;
/** An armed hull this close (units) puts the strip on the fight. */
export const FIGHT_RANGE = FIRE_RANGE * 1.25;

export interface Guide {
  kind: 'lane' | 'port' | 'audit' | 'event';
  /** English; the strip runs it through t(). */
  name: string;
  x: number;
  z: number;
  /** Arrived inside this. */
  r: number;
}

export interface Place {
  kind: 'lane' | 'port' | 'audit';
  name: string;
  x: number;
  z: number;
}

export interface Threat {
  id: number;
  rel: number;
  dist: number;
  armed: boolean;
  elite: boolean;
  /** A convoy hull: ours to keep alive, not to shoot. */
  friendly: boolean;
  /** Bigger is more pressing: armed and near first, what you cannot see a little ahead of what you can. */
  score: number;
}

export interface Fix {
  rel: number;
  dist: number;
}

/** Where a point lies from the ship: its bearing off the nose and how far. */
export function fix(sx: number, sz: number, heading: number, x: number, z: number): Fix {
  return { rel: angleDelta(heading, Math.atan2(-(z - sz), x - sx)), dist: Math.hypot(x - sx, z - sz) };
}

/** The one thing to go to now: an event's marker, else the audit dock until the owner lock is lifted, then the Jump Gate (the port while the clamps close). Null in the arcade between events. */
export function guideTarget(world: World): Guide | null {
  if (!world.alive || world.phase === 'over') return null;
  const e = world.encounter, bk = world.bk;
  const places = world.seenPlaces();
  const lane = places.find((p) => p.kind === 'lane'), port = places.find((p) => p.kind === 'port'), audit = places.find((p) => p.kind === 'audit');
  const busy = !!bk && (bk.spool > 0 || bk.dockT > 0 || bk.jumpT >= 0);
  if (e && !e.done && !e.dormant && e.r > 0 && !busy) return { kind: 'event', name: e.label ?? e.place ?? ENCOUNTERS[e.id].name, x: e.x, z: e.z, r: e.r };
  if (bk) {
    if (bk.dockT > 0 && port) return { kind: 'port', name: port.name, x: port.x, z: port.z, r: port.r };
    if (audit && !lockLifted(world.flags)) return { kind: 'audit', name: audit.name, x: audit.x, z: audit.z, r: audit.r };
    if (lane) return { kind: 'lane', name: lane.name, x: lane.x, z: lane.z, r: lane.r };
  }
  return null;
}

/** The other places the strip keeps in sight: the lane and the port, bar the one it leads with. */
export function sidePlaces(world: World, lead: Guide | null): Place[] {
  return world.seenPlaces()
    .filter((p) => !(lead && lead.kind === p.kind && lead.x === p.x && lead.z === p.z))
    .map((p) => ({ kind: p.kind, name: p.name, x: p.x, z: p.z }));
}

/** Hulls worth a mark, most pressing first. Cloaked hulls are not there. */
export function threats(world: World, max = 8): Threat[] {
  const s = world.ship, out: Threat[] = [];
  for (const a of world.aliens) {
    if (cloaked(a)) continue;
    const f = fix(s.x, s.z, s.heading, a.x, a.z);
    if (f.dist > GUIDE_RANGE) continue;
    const T = ALIEN_TYPES[a.kind];
    const friendly = a.kind === 'freighter' || !!a.ward;
    const armed = !friendly && T.fire !== 'none' && !a.fleeing;
    const near = 1 - f.dist / GUIDE_RANGE;
    const blind = Math.abs(f.rel) > BEHIND ? 0.25 : Math.abs(f.rel) > Math.PI / 3 ? 0.12 : 0;
    const score = friendly ? near * 0.2 : (armed ? 1 : 0.3) * near + (a.elite ? 0.15 : 0) + (armed ? blind : 0);
    out.push({ id: a.id, rel: f.rel, dist: f.dist, armed, elite: !!a.elite, friendly, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max);
}

/** The fight takes the strip when a hostile gun can reach you, or the capital ship is on you; else it is travel. */
export function inFight(world: World): boolean {
  if (!world.alive) return false;
  if (world.alert() === 'red') return true;
  const s = world.ship, b = world.command.boss;
  if (b && !b.arriving && !b.leaving && b.cloak < 0.5 && Math.hypot(b.x - s.x, b.z - s.z) < FIGHT_RANGE * 2) return true;
  for (const a of world.aliens) {
    if (cloaked(a) || a.fleeing || a.ward || ALIEN_TYPES[a.kind].fire === 'none') continue;
    if (Math.hypot(a.x - s.x, a.z - s.z) < FIGHT_RANGE) return true;
  }
  return false;
}

/** The ship's speed along its own track (units/s) and the bearing it is actually moving on, off the nose; null when nearly still. */
export function track(world: World): { speed: number; rel: number; frac: number } | null {
  const s = world.ship, v = Math.hypot(s.vx, s.vz), top = topSpeed(world.hull);
  if (v < top * 0.08) return null;
  return { speed: v, rel: angleDelta(s.heading, Math.atan2(-s.vz, s.vx)), frac: Math.min(1, v / top) };
}

/** A bearing in words: "ahead", "30° left", "behind". Degrees in fives, so the number does not flicker. */
export function sayBearing(rel: number): { word: 'ahead' | 'left' | 'right' | 'behind'; deg: number } {
  const deg = Math.round(((Math.abs(rel) * 180) / Math.PI) / 5) * 5;
  if (Math.abs(rel) <= AHEAD) return { word: 'ahead', deg: 0 };
  if (Math.abs(rel) >= BEHIND) return { word: 'behind', deg };
  return { word: rel > 0 ? 'left' : 'right', deg };
}

/** The side of a bearing the shortest turn takes: +1 left, -1 right. */
export function turnSide(rel: number): 1 | -1 {
  return rel >= 0 ? 1 : -1;
}
