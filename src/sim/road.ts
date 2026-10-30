import { GATES, LEGS, type RoadStop } from '../content/road';
import { regionOf, regionDef, sysById, type Chart, type StarSystem } from './chart';

// ── where the Warden's Road applies ───────────────────────────────────────
// A road journey's chart lays every region out as one line of stops
// (content/road.ts). A road journey saved before the overhaul laid out only
// the Reach that way, and the regions past the Narrows as generated charts:
// those must keep playing as they did. So a region counts as the road's only
// if its systems in this chart are the leg's stops, one a column, by name.
// Plain data, no Three.js: the journey, the world and the pilots share it.

/** The open systems of a region in this chart, in column order (no gate, no Cerro). */
const stopsIn = (c: Chart, region: number): StarSystem[] =>
  c.systems.filter((s) => regionOf(s) === region && s.kind !== 'home' && s.kind !== 'gate' && s.kind !== 'edge').sort((a, b) => a.col - b.col);

const cache = new WeakMap<Chart, Map<number, boolean>>();

/** Whether a region of this chart is a leg of the road: its systems are the leg's stops, one a column, named as the rows say. */
export function roadRegion(c: Chart, region: number): boolean {
  if (c.regionSet !== 'road') return false;
  let m = cache.get(c);
  if (!m) cache.set(c, (m = new Map()));
  const hit = m.get(region);
  if (hit !== undefined) return hit;
  const rows = regionDef(c, region)?.road;
  const here = stopsIn(c, region);
  const ok = !!rows && rows.length === here.length && rows.every((r, k) => !r.name || r.name === here[k]!.name);
  m.set(region, ok);
  return ok;
}

/** The leg a system is on (its region), or -1 off the road. A gate belongs to the leg it closes. */
export const legOf = (c: Chart, s: StarSystem): number => (s.kind !== 'home' && roadRegion(c, regionOf(s)) ? regionOf(s) : -1);

/** The stop a system is on the road, or undefined (a gate, Cerro, or off the road). */
export function stopAt(c: Chart, s: StarSystem): RoadStop | undefined {
  const leg = legOf(c, s);
  if (leg < 0 || s.kind === 'gate' || s.kind === 'edge') return undefined;
  const k = stopsIn(c, leg).findIndex((x) => x.id === s.id);
  return LEGS[leg]?.[k];
}

/** The index of a system in its leg (0 the first stop; the gate is the leg's length), or -1 off the road. */
export function stopIndex(c: Chart, s: StarSystem): number {
  const leg = legOf(c, s);
  if (leg < 0) return -1;
  if (s.kind === 'gate' || s.kind === 'edge') return stopsIn(c, leg).length;
  return stopsIn(c, leg).findIndex((x) => x.id === s.id);
}

/** The script key of a system on the road (content/script/): its stop's, or its gate's. */
export function scriptKey(c: Chart, s: StarSystem): string | undefined {
  const leg = legOf(c, s);
  if (leg < 0) return undefined;
  if (s.kind === 'gate' || s.kind === 'edge') return GATES[leg]?.script;
  return stopAt(c, s)?.script;
}

/** Whether a system is a road gate, where an arrival plays at a Warden relay. */
export const roadGate = (c: Chart, id: string): boolean => { const s = sysById(c, id); return (s.kind === 'gate' || s.kind === 'edge') && legOf(c, s) >= 0; };
