import type { Exp } from '../content/profiles';
import { BASE_PRICES } from '../content/systems';
import type { SortieDef } from './breakout';
import { WEATHER } from './encounters';

// ── the first system past Cerro ───────────────────────────────────────────
// The level the first jump lands in (docs/POSTJUMP.md). A mined-out industrial
// system that still runs: the company's audit dock stands off the course, a
// small supply depot sits on the way to the Jump Gate, the rock is worked
// over, and ships still go about their trade (sim/traffic.ts).
//
// The objective follows the story and nothing else. Until Sam's code has
// lifted the owner lock (`ship_stolen`, set by the `story_sam` card) the course
// is set for the audit dock; the moment it is, for the Jump Gate. One flag, one
// objective: nothing here keeps a second state, so a saved and reloaded journey
// picks the right one up from its flags.

/** What the dock and the depot are called on the HUD and the scope. */
export const AUDIT_DOCK = 'Kellern Audit Dock';
export const SUPPLY_DEPOT = 'Frontier Supply Depot';

/** The flag that lifts the owner lock (content/story.ts `story_sam`): from here on the course is the Jump Gate. */
export const LOCK_LIFTED = 'ship_stolen';
export const lockLifted = (flags: ReadonlySet<string> | readonly string[]): boolean => (flags instanceof Set ? flags.has(LOCK_LIFTED) : (flags as readonly string[]).includes(LOCK_LIFTED));

/** The straight run from the arrival to the Jump Gate, in units: 10 km, about 25 s flat out. */
export const POSTJUMP_LANE = 1000;

/**
 * The sky: a worked-over scrap expanse. A gantry works, a breaker field and a graveyard of hulls are the spent
 * mine's leavings, a Cyrite seam is what is left in it, and a passage is the far traffic that still crosses.
 */
export const POSTJUMP_SKY: Exp = { x: 'scrap', f: ['works', 'breakers', 'graveyard', 'seam', 'passage'] };

/** The first level's own numbers: a worked-out field (thin, with a few veined rocks left), a slow pursuit, no blockade. */
export const WORKED = { density: 0.6, rich: 0.1, pace: { first: 150, calm: 30 }, heatRate: 0.7 } as const;

/**
 * What the first system past Cerro is, laid over what the chart dealt it. The chart keeps its row (its name, holder,
 * lane to the next system, and whatever it deals of a place, a situation, a blockade or a hunt); this is the level's
 * shape: the company's dock and the depot are always here, whatever the chart said of a port, the Jump Gate stands
 * a straight run off, the rock is worked over, and the pursuit starts late and slow.
 */
export function postJump(def: SortieDef): SortieDef {
  return {
    ...def,
    first: true,
    audit: AUDIT_DOCK,
    lane: POSTJUMP_LANE,
    port: { name: SUPPLY_DEPOT, prices: def.port?.prices ?? { ...BASE_PRICES } },
    density: Math.min(def.density, WORKED.density),
    rich: Math.min(def.rich, WORKED.rich),
    pace: { ...WORKED.pace },
    heatRate: Math.min(def.heatRate, WORKED.heatRate),
    exp: POSTJUMP_SKY,
    // no anomalies here (owner, 23 October 2026): no storm, nebula or gravity well, as an event or as the system's place
    calm: true,
    place: def.place && WEATHER.has(def.place.plays) ? null : def.place,
  };
}
