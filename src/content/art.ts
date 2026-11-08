import { PORT_NAMES } from './systems';

// ── artwork slots ─────────────────────────────────────────────────────────
// Where a picture made outside the game can sit, as data. An image is a file
// `src/art/<dir>/<id>.<ext>`; ui/art.ts finds the files at build time, and a
// slot with no file keeps the look it has today. The ids come from the game's
// own rows (a captain's id, an ending's id, a card's id, a ship variant), so
// the file names are decided here and tools/art-brief.pilot.ts can write the
// prompt for every one. docs/ART-SLOTS.md says what each is for and how to
// brief it; src/art/README.md says how to drop the files in.

export type SlotId = 'captain' | 'contact' | 'emblem' | 'ship' | 'place' | 'ending' | 'sighting' | 'file' | 'region' | 'fleet' | 'job' | 'phenomenon' | 'gate' | 'planet' | 'debrief' | 'baybanner' | 'spec' | 'unlock' | 'survival' | 'kind';

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
  job:      { id: 'job',      dir: 'jobs',      w: 960,  h: 1440, alpha: false, shownIn: 'job offer card, full height' },
  phenomenon: { id: 'phenomenon', dir: 'phenomena', w: 800, h: 600, alpha: false, shownIn: '' },
  gate:     { id: 'gate',     dir: 'gates',     w: 1280, h: 720,  alpha: false, shownIn: '' },
  planet:   { id: 'planet',   dir: 'planets',   w: 1280, h: 720,  alpha: false, shownIn: '' },
  debrief:  { id: 'debrief',  dir: 'debrief',   w: 1280, h: 720,  alpha: false, shownIn: '' },
  baybanner: { id: 'baybanner', dir: 'baybanners', w: 1280, h: 720, alpha: false, shownIn: '' },
  spec:     { id: 'spec',     dir: 'specs',     w: 1280, h: 720,  alpha: false, shownIn: '' },
  unlock:   { id: 'unlock',   dir: 'unlocks',   w: 1280, h: 720,  alpha: false, shownIn: 'Archive, beside an earned unlock' },
  survival: { id: 'survival', dir: 'survivals', w: 1280, h: 720,  alpha: false, shownIn: 'start menu, under the difficulty choice' },
  kind:     { id: 'kind',     dir: 'kinds',     w: 1280, h: 720,  alpha: false, shownIn: 'jump chart, beside each system' },
};

/** The planets the fuel stops hang over, and the two debrief scenes. */
export const PLANETS = ['rocky', 'ice', 'gas', 'dead'] as const;
/** The planet a system hangs over, worked out from its name (the same one every visit): the port banner shows it. */
export function planetOf(system: string): (typeof PLANETS)[number] {
  let n = 0;
  for (const c of system) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return PLANETS[n % PLANETS.length]!;
}
export const DEBRIEFS = ['castoff', 'limping'] as const;
/** One painted backdrop per refit bay tab (Suggested plus the nine in `content/web.ts`). */
/** The refit bay's 26 specialisations and 5 salvaged techs: each has an inspector picture (a node id in `content/web.ts`). */
export const SPECS = ['ph_cone', 'ph_lance', 'ph_array', 'tp_heavy', 'tp_swarm', 'tp_precision', 'mn_field', 'mn_chain', 'mn_gravity', 'pl_ignite', 'pl_wake', 'cl_storm', 'cl_juggernaut', 'mo_drift', 'mo_evasion', 'df_fortress', 'df_reactive', 'df_regenerative', 'pl_corona', 'cl_shock', 'mo_afterburner', 'ut_prospector', 'ut_salvager', 'ut_scanner', 'tech_gutter', 'tech_custody', 'tech_office', 'tech_voice', 'tech_thren', 'ph_chain', 'tp_well'] as const;
export const BAYBANNERS = ['suggested', 'hull', 'weapons', 'ordnance', 'engines', 'defence', 'utility', 'signals', 'reactor', 'synergies'] as const;

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
  story_sam: null, story_yard_done: null, story_warden: null, story_ledger: null, story_moot: null, story_drift: null, story_broker: null,
  story_salvor: null, story_charts: null, story_ferry: null, story_workorder: null, story_crew: null, story_harbour: null,
  story_kesh: null, story_vell_betray: 'story_broker', story_ada: null, story_ferry_agent: 'story_ferry', story_tam_brother: 'story_sam', story_ines_offer: 'story_harbour', story_vell_reckoning: 'story_broker', story_tollgate: null, story_echo_sable: null, story_implant: null, story_draper: 'foreman', story_oren_who: 'story_toll', story_oren_cost: 'story_toll', story_oren_why: 'story_toll', story_calloway_narrows: null, story_witnesses: null, story_brook_arrest: 'story_ledger', story_order: 'story_warden', story_handwriting: 'story_warden', ilse_recording: 'story_warden', story_brook_road: 'story_ledger', story_brook_declined: 'story_ledger', story_oduya_rigs: 'story_moot', story_aide: null, story_toll: null,
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
  'wayward-stock', 'wayward-guns', 'wayward-rig', 'wayward-signals', 'wayward-registry', 'wayward-registry-before', 'wayward-registry-after',
  // dead hulks for salvage, the Wayward hurt, and the nastier versions of three hulls
  'wreck-scout', 'wreck-hauler', 'wreck-gunship', 'wreck-capital', 'wayward-scuffed', 'wayward-half', 'wayward-last', 'raider', 'hunter', 'custody-cruiser',
  // a card's first hull, drawn for its caller: `<variant>-<caller>` is used before the plain hull (ui/comms.ts)
  'enforcer-kellern', 'freighter-frontier', 'freighter-guild', 'freighter-miners', 'lancer-calloway', 'scout-guild',
  // the repair gantry's rig, for the hull strip when a gantry calls
  'gantry',
] as const;

/**
 * The cards that open at a place, and the place scene each shows (a `jobs` picture, tall like the job scenes):
 * the depot, the audit dock, the Dust Market raft and Ned's yard.
 */
export const PLACE_SCENES: Record<string, string> = {
  depot_hail: 'sc_depot', audit_hail: 'sc_audit', market_stall: 'sc_market', story_yard_done: 'sc_yard',
  // story beats: the Narrows checkpoint, the Last Toll, the Voice's foundry, the Thren, the helm, the Long Walk, Kessel Hold, the damping field
  narrows_checkpoint: 'sc_narrows', story_toll: 'sc_lasttoll', story_voice: 'sc_foundry', story_thren: 'sc_followers', story_implant: 'sc_helm',
  story_drift: 'sc_longwalk', story_oduya_rigs: 'sc_kessel', story_tollgate: 'sc_dampfield',
};

/** An unlock's own picture (`unlocks/`), or the inspector picture of the thing it opens (`specs/`) where the upgrade is drawn already. */
export const UNLOCK_PICS = ['u_derelict', 'u_anomaly', 'u_ion', 'u_gold', 'u_ramjet'] as const;
export const UNLOCK_SPEC: Record<string, string> = { u_swarm: 'tp_swarm', u_graviton: 'mn_gravity', u_regenerative: 'df_regenerative', u_juggernaut: 'cl_juggernaut' };
/** The kinds of system the chart draws a picture for. */
export const KINDS = ['port', 'mining', 'contested', 'transit'] as const;
