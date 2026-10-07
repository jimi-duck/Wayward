import { FEATURES, NAMED, type ExpanseId, type FeatureId } from '../content/features';
import type { EncounterId } from './encounters';
import type { SortieDef } from './breakout';
import type { Space } from './space';

// ── Story's sites ─────────────────────────────────────────────────────────
// Story does not compose: it lays a sortie's space by hand from the same
// rows Arcade deals from (docs/ENVIRONMENT.md, stage 5). A system gets a
// calm backdrop for its region, and its place (content/phenomena.ts) gets
// the feature that looks like it, a little off the line to the lane mouth so
// the player chooses whether to fly into it. Some of those are one of the
// four named places. Busy expanses are Arcade's: a Story system's difficulty
// comes from its pursuit and notice, not from the sky.

/** The calm backdrops of each tier (0 the Reach, 1 the Marches, 2 the Hollows). */
const BACKDROP: ExpanseId[][] = [['open', 'veil'], ['veil', 'hush'], ['hush', 'open']];

/** The feature a place's event looks like. Nothing for a call for help: that is a ship, not a place. */
const LOOKS: Partial<Record<EncounterId, FeatureId>> = {
  ion_storm: 'storm', nebula: 'shroud', anomaly: 'well', derelict: 'graveyard', convoy: 'passage',
};

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export interface Site { feature: FeatureId; named?: string; }

/** What a sortie's place becomes: the feature, and the named place it is (about one system in three where one fits the region). */
export function siteFor(def: SortieDef): Site | null {
  const f = def.place ? LOOKS[def.place.plays] : undefined;
  if (!f) return null;
  const tier = def.region ?? 0, h = hash(def.system);
  const fits = Object.values(NAMED).filter((n) => n.feature === f && tier >= n.regions[0] && tier <= n.regions[1]);
  const named = fits.length && h % 3 === 0 ? fits[(h >>> 4) % fits.length] : null;
  return { feature: f, named: named?.id };
}

/**
 * Lay a sortie's space: `from` is the start, `to` the lane mouth. The backdrop is centred on the
 * middle of the course; the site sits about a third of the way along and to one side.
 */
export function laySortie(space: Space, def: SortieDef, from: { x: number; z: number }, to: { x: number; z: number }): void {
  const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz) || 1;
  const fx = dx / len, fz = dz / len, rx = fz, rz = -fx;
  const tier = Math.min(2, Math.max(0, def.region ?? 0)), h = hash(def.system);
  const side = h & 1 ? 1 : -1;
  const back = BACKDROP[tier]![(h >>> 1) % 2]!;
  const site = siteFor(def);
  if (site) {
    const d = FEATURES[site.feature], r = (site.named ? NAMED[site.named]!.radius : undefined) ?? (d.size[0] + d.size[1]) / 2;
    const off = Math.max(450, r * 0.9 + 250), at = len * 0.35;
    space.place(site.feature, from.x + fx * at + rx * side * off, from.z + fz * at + rz * side * off, { r, named: site.named });
  }
  // quiet systems keep to the open dark: nothing for the player to read
  space.addExpanse(def.quiet ? 'open' : back, from.x + fx * len * 0.6 - rx * side * 500, from.z + fz * len * 0.6 - rz * side * 500, { r: 1200 });
}
