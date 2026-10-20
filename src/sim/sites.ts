import { FEATURES, NAMED, type ExpanseId, type FeatureId, EXPANSES } from '../content/features';
import { Rng } from './rng';
import type { EncounterId } from './encounters';
import type { SortieDef } from './breakout';
import type { Space } from './space';

// ── Story's sites ─────────────────────────────────────────────────────────
// Story does not compose in flight: it lays a sortie's space by hand, from the
// sky the chart dealt the system (sim/experience.ts, Chart.exp):
//
//   the expanse   · the stretch of space the course runs through
//   the site      · the feature the system's place or job sits in. One spot, shared
//                   by everything that points at it: the feature you can see from far
//                   off, the place's event, the job's hail ring and radar marker.
//   the ambient   · other features, off the straight line to the Jump Gate, so the
//                   player chooses whether to fly into them. Hazards are never on the
//                   line, never on the start, the Jump Gate or the port.
//
// A def without a sky (the Breakout, an old test) keeps the earlier layout:
// one calm backdrop and the place's feature off the line.

/** The calm backdrops of each tier (0 the Reach, 1 the Marches, 2 the Hollows). */
const BACKDROP: ExpanseId[][] = [['open', 'veil'], ['veil', 'hush'], ['hush', 'open']];

/** The feature a place's event looks like, where the def carries no sky. Nothing for a call for help: that is a ship, not a place. */
const LOOKS: Partial<Record<EncounterId, FeatureId>> = {
  ion_storm: 'storm', nebula: 'shroud', anomaly: 'well', derelict: 'graveyard', convoy: 'passage',
};

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export interface Site { feature: FeatureId; named?: string; }
export interface Disc { x: number; z: number; r: number }
/** A site as laid: where, and how big. */
export interface Laid extends Disc { feature: FeatureId; named?: string }

/** What a sortie's site becomes: the feature, and the named place it is (about one system in three where one fits the region). */
export function siteFor(def: SortieDef): Site | null {
  if (def.exp) return def.exp.s ? { feature: def.exp.s, named: def.exp.n } : null;
  const f = def.place ? LOOKS[def.place.plays] : undefined;
  if (!f) return null;
  const tier = def.region ?? 0, h = hash(def.system);
  const fits = Object.values(NAMED).filter((n) => n.feature === f && tier >= n.regions[0] && tier <= n.regions[1]);
  const named = fits.length && h % 3 === 0 ? fits[(h >>> 4) % fits.length] : null;
  return { feature: f, named: named?.id };
}

/** The unit vectors along the course (from the start to the Jump Gate) and to its right, and its length. */
function frame(from: { x: number; z: number }, to: { x: number; z: number }) {
  const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz) || 1;
  const fx = dx / len, fz = dz / len;
  return { fx, fz, rx: -fz, rz: fx, len };
}

/** +1 when the port is on the right of the heading, -1 on the left. */
const portSideOf = (from: { x: number; z: number }, to: { x: number; z: number }, port: Disc): number => {
  const { rx, rz } = frame(from, to);
  return Math.sign((port.x - from.x) * rx + (port.z - from.z) * rz) || 1;
};

/**
 * A situation's stage: on the way but not in the way, on the side the port is not (it used to sit on the
 * port's own side, a few tens of units off the dock). Everything that points at the situation uses this one spot.
 */
export const STAGE_ALONG = 0.34;
export const STAGE_OFF = 150;
export function stageAnchor(system: string, from: { x: number; z: number }, to: { x: number; z: number }, port: Disc | null): { x: number; z: number } {
  const { fx, fz, rx, rz, len } = frame(from, to);
  const side = port ? -portSideOf(from, to, port) : hash(system) & 1 ? 1 : -1;
  const along = STAGE_ALONG + ((hash(system + 'a') % 100) / 100) * 0.1;
  return { x: from.x + fx * len * along + rx * side * STAGE_OFF, z: from.z + fz * len * along + rz * side * STAGE_OFF };
}

/** Where a place sits (no situation): a third of the way along and well off the line, away from the port, so it is a diversion the player chooses. */
export function placeAnchor(system: string, r: number, from: { x: number; z: number }, to: { x: number; z: number }, port: Disc | null): { x: number; z: number } {
  const { fx, fz, rx, rz, len } = frame(from, to);
  const h = hash(system);
  const side = port ? -portSideOf(from, to, port) : h & 1 ? 1 : -1;
  const off = Math.max(450, r * 0.9 + 250), at = len * 0.35;
  return { x: from.x + fx * at + rx * side * off, z: from.z + fz * at + rz * side * off };
}

/**
 * Lay a sortie's space: `from` is the start, `to` the Jump Gate, `port` the port if there is one. The
 * expanse is centred on the middle of the course; the site is where the system's place or job is
 * (`site`, from `placeAnchor` or `stageAnchor`); the ambient features sit off the line.
 */
export function laySortie(space: Space, def: SortieDef, from: { x: number; z: number }, to: { x: number; z: number }, port: Disc | null = null, anchor?: { x: number; z: number }, also: Disc[] = []): Laid | null {
  const { fx, fz, rx, rz, len } = frame(from, to);
  const h = hash(def.system);
  const exp = def.exp;
  if (!exp) return layOld(space, def, from, to, port);
  const dx = EXPANSES[exp.x];
  // the stretch of space the course runs through
  const r0 = (dx.radius[0] + dx.radius[1]) / 2;
  space.addExpanse(exp.x, from.x + fx * len * 0.52, from.z + fz * len * 0.52, { r: r0, deal: false });
  const rng = new Rng(def.lane ^ h ^ 0x51e);
  const taken: Disc[] = [
    { x: from.x, z: from.z, r: 260 }, { x: to.x, z: to.z, r: 320 },
    ...(port ? [{ x: port.x, z: port.z, r: 260 }] : []),
    ...also.map((d) => ({ x: d.x, z: d.z, r: 260 })),
  ];
  let laid: Laid | null = null;
  if (exp.s) {
    const d = FEATURES[exp.s];
    const r = (exp.n ? NAMED[exp.n]!.radius : undefined) ?? (d.size[0] + d.size[1]) / 2;
    const at = anchor ?? placeAnchor(def.system, r, from, to, port);
    // a far feature (a convoy crossing the sky) is seen on a bearing: the one toward the place it stands for
    space.place(exp.s, at.x, at.z, { r, named: exp.n, still: true, bearing: Math.atan2(-(at.z - from.z), at.x - from.x) });
    laid = { x: at.x, z: at.z, r, feature: exp.s, named: exp.n };
    taken.push({ x: at.x, z: at.z, r });
  }
  // ambient features: further along than the site, off the line by more than their own reach
  let flip = h & 1 ? 1 : -1;
  for (const id of exp.f) {
    const fd = FEATURES[id];
    const r = rng.range(fd.size[0], fd.size[1]);
    if (fd.layer === 'far') { space.place(id, from.x + fx * len * 0.5, from.z + fz * len * 0.5, { r, bearing: rng.range(0, Math.PI * 2), still: true }); continue; }
    // a lantern line goes where the static it steadies is
    const mate = id === 'lanterns' ? space.features.find((f) => f.def === 'static') : undefined;
    if (mate) { space.place(id, mate.x + rng.range(-40, 40), mate.z + rng.range(-40, 40), { r: Math.min(r, mate.r * 0.7), still: true }); continue; }
    for (let tries = 0; tries < 14; tries++) {
      const along = len * rng.range(0.5, 0.9), off = r + 260 + rng.range(0, 260) + tries * 40;
      const side = tries % 2 ? -flip : flip;
      const x = from.x + fx * along + rx * side * off, z = from.z + fz * along + rz * side * off;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < t.r + r + 60)) continue;
      space.place(id, x, z, { r, still: true });
      taken.push({ x, z, r });
      flip = -flip;
      break;
    }
  }
  return laid;
}

/** The earlier layout, for a def without a sky: one calm backdrop, and the place's feature off the line. */
function layOld(space: Space, def: SortieDef, from: { x: number; z: number }, to: { x: number; z: number }, port: Disc | null): Laid | null {
  const { fx, fz, rx, rz, len } = frame(from, to);
  const tier = Math.min(2, Math.max(0, def.region ?? 0)), h = hash(def.system);
  const side = h & 1 ? 1 : -1;
  const back = BACKDROP[tier]![(h >>> 1) % 2]!;
  const site = siteFor(def);
  let laid: Laid | null = null;
  if (site) {
    const d = FEATURES[site.feature], r = (site.named ? NAMED[site.named]!.radius : undefined) ?? (d.size[0] + d.size[1]) / 2;
    const at = placeAnchor(def.system, r, from, to, port);
    void side;
    space.place(site.feature, at.x, at.z, { r, named: site.named, still: true });
    laid = { x: at.x, z: at.z, r, feature: site.feature, named: site.named };
  }
  // quiet systems keep to the open dark: nothing for the player to read
  space.addExpanse(def.quiet ? 'open' : back, from.x + fx * len * 0.6 - rx * side * 500, from.z + fz * len * 0.6 - rz * side * 500, { r: 1200, deal: false });
  void rz;
  return laid;
}
