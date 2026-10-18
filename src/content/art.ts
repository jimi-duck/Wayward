import { PORT_NAMES } from './systems';

// ── artwork slots ─────────────────────────────────────────────────────────
// Where a picture made outside the game can sit, as data. An image is a file
// `src/art/<dir>/<id>.<ext>`; ui/art.ts finds the files at build time, and a
// slot with no file keeps the look it has today. The ids come from the game's
// own rows (a captain's id, an ending's id, a card's id, a ship variant), so
// the file names are decided here and tools/art-brief.pilot.ts can write the
// prompt for every one. docs/ART-SLOTS.md says what each is for and how to
// brief it; src/art/README.md says how to drop the files in.

export type SlotId = 'captain' | 'contact' | 'emblem' | 'ship' | 'place' | 'ending' | 'sighting' | 'file' | 'region' | 'fleet' | 'job' | 'phenomenon';

export interface SlotDef {
  id: SlotId;
  /** The folder under src/art. */
  dir: string;
  /** Pixels to deliver (twice what the screen draws, so phones and sharp screens are covered). */
  w: number;
  h: number;
  /** Transparent background wanted (a cut-out), or a full picture. */
  alpha: boolean;
  /** The screen the game draws it on today ('' : the slot is ready but no screen draws it yet). */
  shownIn: string;
}

export const SLOTS: Record<SlotId, SlotDef> = {
  captain:  { id: 'captain',  dir: 'captains',  w: 640,  h: 800,  alpha: false, shownIn: 'comms header' },
  contact:  { id: 'contact',  dir: 'contacts',  w: 640,  h: 800,  alpha: false, shownIn: 'comms header' },
  emblem:   { id: 'emblem',   dir: 'emblems',   w: 256,  h: 256,  alpha: true,  shownIn: 'comms header' },
  ship:     { id: 'ship',     dir: 'ships',     w: 960,  h: 480,  alpha: true,  shownIn: 'comms read' },
  place:    { id: 'place',    dir: 'places',    w: 1280, h: 320,  alpha: false, shownIn: 'port' },
  ending:   { id: 'ending',   dir: 'endings',   w: 1280, h: 720,  alpha: false, shownIn: 'the Threshold' },
  sighting: { id: 'sighting', dir: 'sightings', w: 800,  h: 600,  alpha: false, shownIn: 'Archive' },
  file:     { id: 'file',     dir: 'file',      w: 800,  h: 600,  alpha: false, shownIn: 'Archive' },
  region:   { id: 'region',   dir: 'regions',   w: 1280, h: 480,  alpha: false, shownIn: '' },
  fleet:    { id: 'fleet',    dir: 'fleet',     w: 960,  h: 480,  alpha: false, shownIn: '' },
  job:      { id: 'job',      dir: 'jobs',      w: 1280, h: 720,  alpha: false, shownIn: '' },
  phenomenon: { id: 'phenomenon', dir: 'phenomena', w: 800, h: 600, alpha: false, shownIn: '' },
};

/** Formats the loader takes, best first. */
export const ART_EXT = ['webp', 'avif', 'png', 'jpg', 'jpeg'] as const;

/** The emblems: one per faction or crowd that opens a channel. Drawn as a single-colour mark, tinted in the game. */
export const EMBLEMS = ['custody', 'office', 'kellern', 'guild', 'frontier', 'miners', 'gutter', 'drift', 'voice', 'thren'] as const;

/**
 * Callers that open a channel with a name and a face: story and chance cards whose `from` is a person.
 * A card not listed here shows its caller's emblem and no portrait. A value shares another card's portrait
 * (the same person calling again).
 */
export const CONTACTS: Record<string, string | null> = {
  story_yard: null, story_warden: null, story_ledger: null, story_moot: null, story_drift: null, story_broker: null,
  story_salvor: null, story_charts: null, story_ferry: null, story_workorder: null, story_crew: null, story_harbour: null,
  story_kesh: null, story_vell_betray: 'story_broker', story_ada: null, story_ferry_agent: 'story_ferry', story_tam_brother: 'story_yard', story_ines_offer: 'story_harbour', story_vell_reckoning: 'story_broker', story_tollgate: null, story_echo_sable: null, story_implant: null, story_draper: 'foreman', story_oren_who: 'story_toll', story_oren_cost: 'story_toll', story_oren_why: 'story_toll', story_witnesses: null, story_brook_arrest: 'story_ledger', story_oduya_rigs: 'story_moot', story_aide: null, story_toll: null,
  foreman: null, foreman_again: 'foreman', krail_seller: null, fuel_runner: null,
};

/** Cards whose caller is Calloway share her portrait with the captains' (captains/calloway). */
export const CALLOWAY_ID = 'calloway';

/** The ports' holders, for the banner: the id of a port's place art from its name (null: no art for it). */
export function placeOfPort(name: string, netted: boolean): string {
  if (netted) return 'netted';
  for (const [holder, names] of Object.entries(PORT_NAMES)) if (names.includes(name)) return holder === 'none' ? 'free' : holder;
  return 'frontier';
}
export const PLACES = ['kellern', 'frontier', 'guild', 'gutter', 'holdfast', 'free', 'netted'] as const;

/** A region's file name: "The Salvage Belt" is `salvage-belt`. */
export const regionSlug = (name: string) => name.replace(/^the\s+/i, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Hulls that are not in the spawner's variant list (sim/enemies.ts): the captains'
 * capital ships (a picture per captain, so `capital-<captain id>`), the ships that
 * go about their business in a system, and the Wayward itself as it is fitted.
 */
export const FLEET = [
  'capital-vance', 'capital-sorensen', 'capital-kade', 'capital-vex', 'capital-ashgrove', 'capital-pell', 'capital-chorus', 'capital-loom', 'capital-calloway',
  'tanker', 'hauler', 'courier', 'gunship', 'barge', 'salvager', 'drifter', 'ferry',
  'wayward-stock', 'wayward-guns', 'wayward-rig', 'wayward-signals',
  // a card's first hull, drawn for its caller: `<variant>-<caller>` is used before the plain hull (ui/comms.ts)
  'enforcer-kellern', 'freighter-frontier', 'freighter-guild', 'freighter-miners', 'lancer-calloway', 'scout-guild',
] as const;
