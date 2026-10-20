import type { ExpanseId, FeatureId } from './features';
import type { PlaceId } from './phenomena';

// ── regional profiles ─────────────────────────────────────────────────────
// What each of the eight regions asks of the player, as data. The composer
// (sim/experience.ts) reads a row to decide what the sky of a system holds;
// the world (sim/world.ts, sim/rules.ts) reads its rules to decide what that
// sky does. A region teaches one thing, lets the player learn it in the
// systems that follow, and later regions recombine what came before.
//
//   the Reach         · open dark and a few dust veils: nothing to fear in the sky, so the
//                       sky is something to look at. Cover is shown, not needed.
//   the Marches       · claimed ground: rubble the Holdfasts stake. Rich fields are
//                       watched, so mining the best rock has a price, and rubble is cover.
//   the Salvage Belt  · wrecks and yards. The best salvage is on ground somebody has staked,
//                       and a claim crew comes if you linger in it.
//   the Drift Deep    · standing static. The Jump Gate swims and locks fail; a lantern line
//                       is the way through, and the way to read it is to follow it.
//   the Breaker Yards · the Custody watches the open dark. Heat climbs faster in clear
//                       space; the rubble and the shrouds are where you can breathe.
//   the Free Ports    · traffic: lit lanes and slow convoys, trade and favours. Few
//                       hazards, many people.
//   the Hollows       · the Voice's quiet and the Thren's cuts. The Thren read the tank;
//                       dust and shadow are the place to wait it out.
//   the Last Lanes    · everything above, in pairs.

/** What a system's sky holds, as the composer dealt it (stored on the chart: Chart.exp). */
export interface Exp {
  /** The expanse the system's space is a part of. */
  x: ExpanseId;
  /** Features besides the site, ambient: laid off the straight line to the Jump Gate. */
  f: FeatureId[];
  /** The feature the system's place or job sits in. */
  s?: FeatureId;
  /** The site is one of the four named places (content/features.ts NAMED). */
  n?: string;
}

/** How the world answers a ship in space of a certain kind (sim/rules.ts). */
export interface Rules {
  /** The watchers' eyes: the pursuit's clock runs at this rate in clear space (1: as everywhere). Cover slows it. */
  watch?: number;
  /** Ground with something worth taking is claimed: a crew arrives after this many seconds spent in it. */
  claim?: { after: number; warn: string; card: string };
}

export interface RegionProfile {
  /** How readily each expanse is dealt to an active system here. Breathers keep to the calm ones. */
  expanses: Partial<Record<ExpanseId, number>>;
  /** How many ambient features an active system holds, least and most. */
  ambient: [number, number];
  /** A multiplier on a feature's weight when it is chosen for the sky here. */
  lean: Partial<Record<FeatureId, number>>;
  rules: Rules;
}

export const PROFILES: RegionProfile[] = [
  { // 0 the Reach
    expanses: { open: 1.4, veil: 1, scrap: 0.1 }, ambient: [0, 1],
    lean: { veil: 1.5, curtain: 1.4, passage: 1.4, seam: 1.3, lanterns: 0.8, shroud: 0.6 },
    rules: {},
  },
  { // 1 the Marches
    expanses: { veil: 0.7, scrap: 1.1, open: 0.5, front: 0.15 }, ambient: [1, 2],
    lean: { breakers: 1.8, seam: 1.5, graveyard: 0.8, shroud: 1.1, veil: 0.7 },
    rules: { claim: { after: 24, warn: 'Holdfast marker · this seam is claimed', card: 'claim_holdfast' } },
  },
  { // 2 the Salvage Belt
    expanses: { scrap: 1.6, yards: 1, veil: 0.2, open: 0.25 }, ambient: [1, 2],
    lean: { graveyard: 2.2, breakers: 1.6, works: 2, seam: 1.2, shroud: 0.9 },
    rules: { claim: { after: 16, warn: 'Claim buoy · this wreck field is staked', card: 'claim_guild' } },
  },
  { // 3 the Drift Deep
    expanses: { front: 1.3, veil: 0.7, open: 0.8, shoals: 0.15 }, ambient: [1, 2],
    lean: { static: 2.2, lanterns: 1.8, storm: 1.4, curtain: 1.3, carrier: 1.5, veil: 0.8 },
    rules: {},
  },
  { // 4 the Breaker Yards
    expanses: { yards: 1.5, scrap: 0.8, open: 0.3 }, ambient: [1, 2],
    lean: { works: 1.8, breakers: 1.6, shroud: 1.6, lanterns: 1, graveyard: 1.1, veil: 0.4, curtain: 0.4 },
    rules: { watch: 1.3 },
  },
  { // 5 the Free Ports
    expanses: { yards: 0.6, open: 0.9, front: 0.4, scrap: 0.35, veil: 0.4 }, ambient: [0, 2],
    lean: { passage: 2.4, lanterns: 1.1, works: 1.4, seam: 1.1, curtain: 1.1, storm: 0.5, well: 0.4 },
    rules: {},
  },
  { // 6 the Hollows
    expanses: { hush: 1.3, shoals: 1, veil: 0.5, open: 0.2 }, ambient: [1, 2],
    lean: { shroud: 1.8, relic: 3, carrier: 2, well: 1.6, graveyard: 1.1, curtain: 0.8, lanterns: 0.6, passage: 0.2 },
    rules: {},
  },
  { // 7 the Last Lanes
    expanses: { front: 0.9, shoals: 0.9, hush: 0.7, yards: 0.7, scrap: 0.5, veil: 0.4 }, ambient: [2, 3],
    lean: { static: 1.4, well: 1.4, shroud: 1.4, relic: 2, carrier: 1.6, works: 1.2, breakers: 1.2, storm: 1.2, passage: 0.3 },
    rules: { watch: 1.15 },
  },
];

/** The feature a place on the chart looks like, by the place's own id. */
export const SITE_OF_PLACE: Record<PlaceId, FeatureId> = {
  ion_storm: 'storm', nebula: 'shroud', gravity_well: 'well', derelict: 'graveyard', convoy: 'passage',
  distress: 'lanterns', relay_ruin: 'works', strange_signal: 'relic', voice_foundry: 'works', thren_lane: 'well',
};

/**
 * Where a job's site sits, by its goal: the features that make it a different place to be. A sneak wants
 * cover; a defence wants rubble to fight in; a hail wants somewhere a ship would wait. A crossing (nothing
 * dealt) has no site. Hazards are for the job that is about them (a survey).
 */
export const SITE_OF_GOAL: Record<string, Partial<Record<FeatureId, number>>> = {
  call: { lanterns: 0.25, passage: 0.8, veil: 0.8, breakers: 0.7, works: 0.6, curtain: 0.4 },
  reach: { works: 1, lanterns: 0.4, breakers: 0.8, seam: 0.5, veil: 0.4 },
  follow: { lanterns: 1, static: 0.7, veil: 0.6, passage: 0.5 },
  watch: { curtain: 1, relic: 0.7, passage: 0.8, carrier: 0.3, veil: 0.5 },
  destroy: { breakers: 1, graveyard: 0.9, shroud: 0.7, works: 0.5 },
  strike: { breakers: 1, graveyard: 0.8, shroud: 0.9, static: 0.5 },
  defend: { breakers: 1, graveyard: 0.9, works: 0.7, seam: 0.4 },
  race: { lanterns: 0.5, static: 0.8, breakers: 0.6 },
  recover: { graveyard: 1, breakers: 0.9, works: 0.5, seam: 0.4 },
  survey: { storm: 1, static: 1, well: 0.5 },
  sneak: { shroud: 1.3, breakers: 0.9, graveyard: 0.8, static: 0.4 },
};

/** Features that need no particular care to be near. The rest hurt, pull or hide. */
export const HAZARDS: ReadonlySet<FeatureId> = new Set<FeatureId>(['storm', 'well']);
