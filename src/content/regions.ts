import type { Holder, SystemKind } from './systems';

// ── regions ───────────────────────────────────────────────────────────────
// The way out is three regions, each less human than the last, joined by a
// single choke system (a gate) that every route has to pass through:
//
//   the Reach   · Kellern space: ports, claims, Custody patrols, and the
//                 Net spreading from Cerro. Out through the Narrows.
//   the Marches · Holdfast claims that will not give in, Drift fleets that
//                 never stop moving, Gutter crews raiding both. Out through
//                 the Rift.
//   the Hollows · foundries the Voice left running and lanes the Thren cut.
//                 Nothing human lives here. Out through the Threshold.
//
// The chart (sim/chart.ts) lays the regions out left to right from these
// rows: Cerro first, then each region's columns, then its gate. The chart
// panel shows one region at a time.

export interface RegionDef {
  name: string;
  /** One line for the chart. */
  blurb: string;
  /** The columns between the way in and the gate out: systems in each, and the kinds dealt to them. */
  cols: SystemKind[][];
  sizes: number[];
  /** Who holds a system of each kind here (the template's own holders where not given). */
  holders: Partial<Record<SystemKind, Holder[]>>;
  /** The gate out: its name, and whether it is the last (the Threshold). */
  gate: string;
  last: boolean;
  /** The Net's pace here: it spreads from Cerro and slows the further out it gets. */
  net: number;
  /** Thren in a system at the start, by holder (the Thren own nothing, but they live where nobody else does). */
  thren: Partial<Record<Holder, number>>;
  /** Drift fleets crossing the region. */
  drifts: number;
  /** The chance of a port, against the system's own: fewer docks the further out. */
  port: number;
  /** The share of its mining and transit systems that are quiet (breathers: no pursuit, no cards). None where not given. */
  quiet?: number;
  /**
   * The old region this one plays as: the places, the story beats and the act read the tier, so a
   * longer chart reuses them (0 the Reach, 1 the Marches, 2 the Hollows).
   */
  tier: number;
  /** The sky palette (render/sky.ts); the tier's own where absent. */
  sky?: number;
  /** Where a system's name comes from: an opening and an ending, joined. Absent: the shared list (content/systems.ts NAMES). */
  names?: { pre: string[]; post: string[] };
  /**
   * Calloway here (the long journey only): she meets you once a region at most, and a wreck while she is
   * in the system is a capture with this chance. Absent: she follows the trail, and every such wreck is one.
   */
  calloway?: { risk: number };
  /** The pursuit here: a multiplier on how fast heat climbs (the Custody is far from home), and on the share from ahead. */
  heatRate: number;
  ahead: number;
}

export const REGIONS: RegionDef[] = [
  {
    name: 'The Reach', blurb: 'Kellern space. The Net spreads from Cerro.',
    cols: [['port', 'mining', 'transit'], ['mining', 'contested', 'port', 'transit'], ['contested', 'port', 'mining', 'transit']],
    sizes: [3, 3, 3],
    holders: {},
    gate: 'The Narrows', last: false, tier: 0, net: 1, thren: {}, drifts: 1, port: 1, heatRate: 1, ahead: 1,
  },
  {
    name: 'The Marches', blurb: 'Holdfasts, Drift fleets, and the Gutter raiding both.',
    cols: [['mining', 'contested', 'port', 'transit'], ['contested', 'mining', 'transit', 'port']],
    sizes: [3, 3],
    holders: { mining: ['holdfast', 'holdfast', 'none'], port: ['holdfast', 'guild'], contested: ['gutter'], transit: ['none'] },
    gate: 'The Rift', last: false, tier: 1, net: 0.55, thren: { none: 0.15 }, drifts: 2, port: 0.9, heatRate: 0.85, ahead: 1.3,
  },
  {
    name: 'The Hollows', blurb: 'Voice foundries and Thren lanes. Nothing human lives here.',
    cols: [['mining', 'transit', 'contested'], ['contested', 'transit', 'mining']],
    sizes: [2, 2],
    holders: { mining: ['voice', 'none'], contested: ['voice', 'thren'], transit: ['thren', 'none'], port: ['none'] },
    gate: 'The Threshold', last: true, tier: 2, net: 0.25, thren: { thren: 0.8, none: 0.35, voice: 0.1 }, drifts: 0, port: 0.35, heatRate: 0.7, ahead: 1.6,
  },
];

/** The way out as eight regions, for the long journey. A chart is laid out from one set or the other and says which. */
export type RegionSet = 'three' | 'eight';

/** `n` columns dealt from a few templates in turn. */
const cycle = (n: number, ...templates: SystemKind[][]): SystemKind[][] => Array.from({ length: n }, (_, i) => templates[i % templates.length]!);
const sizes = (n: number, each: number) => Array<number>(n).fill(each);

export const REGIONS_LONG: RegionDef[] = [
  {
    name: 'The Reach', blurb: 'Kellern space. The Net spreads from Cerro.',
    cols: cycle(9, ['port', 'mining', 'transit'], ['mining', 'contested', 'port', 'transit'], ['contested', 'port', 'mining', 'transit']), sizes: sizes(9, 3),
    holders: {}, gate: 'The Narrows', last: false, tier: 0, net: 1.1, calloway: { risk: 0.25 }, thren: {}, drifts: 1, port: 1, heatRate: 1, ahead: 1, quiet: 0.4,
    names: { pre: ['Hal', 'Toll', 'Ash', 'Cor', 'Mar', 'Sal', 'Pell', 'Dun', 'Ket', 'Bran', 'Orm', 'West'], post: ['ford', 'mere', 'wick', 'moor', 'by', 'ton', 'dale', 'fell', 'reach', 'watch', 'rest', 'row'] },
  },
  {
    name: 'The Marches', blurb: 'Holdfasts, Drift fleets, and the Gutter raiding both.',
    cols: cycle(9, ['mining', 'contested', 'port', 'transit'], ['contested', 'mining', 'transit', 'port']), sizes: sizes(9, 3),
    holders: { mining: ['holdfast', 'holdfast', 'none'], port: ['holdfast', 'guild'], contested: ['gutter'], transit: ['none'] },
    gate: 'The Rift', last: false, tier: 1, net: 0.825, calloway: { risk: 0.3 }, thren: { none: 0.15 }, drifts: 2, port: 0.9, heatRate: 0.85, ahead: 1.3, quiet: 0.35,
    names: { pre: ['Stone', 'Hard', 'Rook', 'Cairn', 'Grim', 'Bar', 'Hold', 'Gall', 'Thorn', 'Wen', 'Rust', 'Kest'], post: ['hold', 'stead', 'fast', 'gate', 'by', 'wick', 'mark', 'ridge', 'reach', 'mere', 'fell', 'watch'] },
  },
  {
    name: 'The Salvage Belt', blurb: 'Dust Trader wrecks and claims. Everything is for sale.',
    cols: cycle(9, ['mining', 'port', 'transit'], ['contested', 'mining', 'transit'], ['port', 'mining', 'contested', 'transit']), sizes: sizes(9, 3),
    holders: { mining: ['guild', 'guild', 'none'], port: ['guild'], contested: ['gutter', 'guild'], transit: ['none'] },
    gate: 'The Scrapgate', last: false, tier: 1, sky: 5, net: 0.77, calloway: { risk: 0.35 }, thren: { none: 0.1 }, drifts: 1, port: 0.9, heatRate: 0.9, ahead: 1.2, quiet: 0.4,
    names: { pre: ['Scrap', 'Rivet', 'Tally', 'Ledger', 'Barrow', 'Cinder', 'Bolt', 'Slag', 'Hawser', 'Weld', 'Gantry', 'Dross'], post: ['yard', 'reach', 'fall', 'mouth', 'shoal', 'wharf', 'row', 'bank', 'mere', 'fell', 'watch', 'rest'] },
  },
  {
    name: 'The Drift Deep', blurb: 'Fleets that never stop. The Net has not found this far.',
    cols: cycle(9, ['transit', 'mining', 'port'], ['mining', 'transit', 'contested']), sizes: sizes(9, 3),
    holders: { mining: ['none', 'holdfast'], port: ['none', 'holdfast'], contested: ['gutter'], transit: ['none'] },
    gate: 'The Slow Door', last: false, tier: 1, sky: 6, net: 0.275, calloway: { risk: 0.4 }, thren: { none: 0.1 }, drifts: 3, port: 0.7, heatRate: 0.7, ahead: 1.1, quiet: 0.6,
    names: { pre: ['Slow', 'Long', 'Tide', 'Lantern', 'Hush', 'Wander', 'Ninth', 'Kind', 'Dawn', 'Mile', 'Far', 'Still'], post: ['water', 'rain', 'mile', 'walk', 'light', 'fold', 'lea', 'drift', 'reach', 'mere', 'fell', 'watch'] },
  },
  {
    name: 'The Breaker Yards', blurb: 'Custody yards where ships are taken apart. Watched.',
    cols: cycle(9, ['contested', 'port', 'mining'], ['contested', 'mining', 'transit']), sizes: sizes(9, 3),
    holders: { contested: ['kellern', 'gutter'], mining: ['kellern', 'none'], port: ['kellern', 'frontier'], transit: ['none'] },
    gate: 'The Breaker', last: false, tier: 1, sky: 7, net: 0.88, calloway: { risk: 0.5 }, thren: { none: 0.1 }, drifts: 0, port: 0.8, heatRate: 1.1, ahead: 0.9, quiet: 0.25,
    names: { pre: ['Cut', 'Anvil', 'Keel', 'Spar', 'Gird', 'Torch', 'Plate', 'Brace', 'Hull', 'Rake', 'Stay', 'Davit'], post: ['ton', 'yard', 'dock', 'slip', 'berth', 'gap', 'wall', 'cradle', 'reach', 'mere', 'fell', 'watch'] },
  },
  {
    name: 'The Free Ports', blurb: 'Gutter ports. Everyone trades and nobody asks.',
    cols: cycle(9, ['port', 'contested', 'mining'], ['mining', 'port', 'transit'], ['contested', 'transit', 'mining']), sizes: sizes(9, 3),
    holders: { contested: ['gutter'], port: ['gutter', 'none', 'guild'], mining: ['gutter', 'none'], transit: ['none'] },
    gate: 'The Tollgate', last: false, tier: 1, sky: 8, net: 0.55, calloway: { risk: 0.55 }, thren: { none: 0.2 }, drifts: 1, port: 1.1, heatRate: 0.85, ahead: 1.4, quiet: 0.3,
    names: { pre: ['Dice', 'Penny', 'Marrow', 'Toll', 'Rum', 'Gilt', 'Jack', 'Wager', 'Lucky', 'Salt', 'Tinker', 'Nine'], post: ['harbour', 'quay', 'port', 'street', 'cross', 'haven', 'pier', 'market', 'reach', 'mere', 'fell', 'watch'] },
  },
  {
    name: 'The Hollows', blurb: 'Voice foundries and Thren lanes. Nothing human lives here.',
    cols: cycle(9, ['mining', 'transit', 'contested'], ['contested', 'transit', 'mining']), sizes: sizes(9, 2),
    holders: { mining: ['voice', 'none'], contested: ['voice', 'thren'], transit: ['thren', 'none'], port: ['none'] },
    gate: 'The Seam', last: false, tier: 2, net: 0.44, calloway: { risk: 0.75 }, thren: { thren: 0.8, none: 0.35, voice: 0.1 }, drifts: 0, port: 0.35, heatRate: 0.7, ahead: 1.6, quiet: 0.3,
    names: { pre: ['Hollow', 'Ash', 'Void', 'Cold', 'Dead', 'Pale', 'Gaunt', 'Mute', 'Bleak', 'Husk', 'Sere', 'Ghost'], post: ['forge', 'deep', 'cairn', 'reach', 'vault', 'mere', 'cinder', 'hall', 'fell', 'watch', 'rest'] },
  },
  {
    name: 'The Last Lanes', blurb: 'The Voice’s keys and the Thren’s cuts. Then the Threshold.',
    cols: cycle(13, ['transit', 'contested', 'mining'], ['contested', 'mining', 'transit']), sizes: sizes(13, 2),
    holders: { mining: ['voice', 'none'], contested: ['voice', 'thren'], transit: ['thren', 'none'], port: ['none'] },
    gate: 'The Threshold', last: true, tier: 2, sky: 9, net: 0.33, calloway: { risk: 1 }, thren: { thren: 0.8, none: 0.4, voice: 0.15 }, drifts: 0, port: 0.25, heatRate: 0.7, ahead: 1.6, quiet: 0.2,
    names: { pre: ['Last', 'Final', 'Far', 'End', 'Late', 'Thin', 'Dim', 'Lone', 'Rimed', 'Gray', 'Wane', 'Dusk'], post: ['lane', 'light', 'mark', 'cut', 'gap', 'rim', 'step', 'watch', 'reach', 'mere', 'fell', 'rest'] },
  },
];

/** The region table a chart was laid out with. */
export const REGION_SETS: Record<RegionSet, RegionDef[]> = { three: REGIONS, eight: REGIONS_LONG };

/** Drift fleets' names, drawn without repeats. */
export const FLEETS = [
  'the Long Walk', 'the Slow Rain', 'the Kindly Ann', 'the Ninth Mile', 'the Lantern Fleet',
  'the Patient Hand', 'the Dawn Tithe', 'the Quiet Mercy', 'the Far Wheel', 'the Tin Cathedral',
];

/** Real names and place-words for the names a region makes: about four in ten read "Morgan Deep", "Amara Station". */
export const NAME_PEOPLE = ['Hadley', 'Morgan', 'Kowalski', 'Amara', 'Okafor', 'Jansen', 'Ibarra', 'Lindqvist', 'Castell', 'Nakamura', 'Brandt', 'Quill'];
export const NAME_PLACES = ['’s Rest', 'Deep', 'Yard', 'Station', 'Reach', 'Mere', 'Fell', 'Watch'];
