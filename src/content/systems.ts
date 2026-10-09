// ── systems ───────────────────────────────────────────────────────────────
// The kinds of place a jump can bring the Wayward to, as data. The chart
// (sim/chart.ts) lays a region out from these: every system is one template
// with a name, a Cyrite richness and a food supply rolled inside the
// template's range. A sortie (one system, flown in real time) reads the
// rest: how far the lane mouth is, whether there is a port and what it
// charges, how much rock there is and how much of it is veined, who flies
// there besides the Custody, and how much the Custody already cares.
//
//   home      · Cerro, the Kellern yards: the Breakout.
//   mining    · rich rock, a rough fuel dock or none, little traffic.
//   port      · a station: trade, food, a refit; busy, so the Custody looks.
//   transit   · an empty crossing: thin rock, a short run, few calls.
//   contested · Gutter crews and Custody patrols, both; more calls, more fire.
//   gate      · the one way from a region into the next (content/regions.ts).
//   edge      · the last lane the old charts know, out into the Scatter.

export type SystemKind = 'home' | 'mining' | 'port' | 'transit' | 'contested' | 'gate' | 'edge';
/** Who runs a system before the Net reaches it: the companies, the Holdfasts' claims, the Gutter, the Voice's foundries, Thren space, or nobody. */
export type Holder = 'kellern' | 'frontier' | 'guild' | 'gutter' | 'holdfast' | 'voice' | 'thren' | 'none';

/** What a port charges, in chits. */
export interface Prices { cyrite: number; plate: number; supplies: number }

export const BASE_PRICES: Prices = { cyrite: 5, plate: 30, supplies: 9 };

/** What a lump of scrap pays in chits when it is picked up (the survival mode moves the rate). */
export const SCRAP_PRICE = 2;

export interface SystemTemplate {
  kind: SystemKind;
  /** One line for the chart. */
  blurb: string;
  holders: Holder[];
  /** Cyrite richness and food supply, 0 to 1, rolled inside these. */
  cyrite: [number, number];
  supplies: [number, number];
  /** A port, and the chance of one when it is not certain. */
  port: number;
  /** Distance to the lane mouth, world units. */
  lane: [number, number];
  /** The rock: veined share and density (1 is the Breakout's field). */
  rich: number;
  density: number;
  /** Of the pursuit, the share that is Gutter crews from ahead rather than Custody from behind. */
  gutter: number;
  /** Heat at arrival, and how fast it climbs (1 is the Breakout's rate). */
  heat: number;
  heatRate: number;
  /** Seconds before the first chance call, and a multiplier on the gap between them. */
  calls: number;
  /** The pursuit's room to breathe: seconds before the first pursuer, and the quiet that follows an answered card or a beaten pursuer. */
  pace: { first: number; calm: number };
}

export const SYSTEMS: Record<SystemKind, SystemTemplate> = {
  home: {
    kind: 'home', blurb: 'Kellern Mining’s yards. Home, until today.', holders: ['kellern'],
    cyrite: [0.4, 0.4], supplies: [0, 0], port: 1, lane: [2600, 2600], rich: 0.09, density: 1, gutter: 0.22, heat: 0.1, heatRate: 1, calls: 1, pace: { first: 45, calm: 0 },
  },
  mining: {
    kind: 'mining', blurb: 'Veined rock and a few claim crews. Cyrite if you will mine for it.', holders: ['kellern', 'guild', 'none'],
    cyrite: [0.6, 1], supplies: [0, 0.3], port: 0.4, lane: [2200, 2700], rich: 0.16, density: 1.15, gutter: 0.3, heat: 0.05, heatRate: 0.85, calls: 1.2, pace: { first: 75, calm: 18 },
  },
  port: {
    kind: 'port', blurb: 'A station with a market, a galley and a refit bay. Busy, and watched.', holders: ['frontier', 'guild'],
    cyrite: [0.2, 0.5], supplies: [0.6, 1], port: 1, lane: [2200, 2600], rich: 0.07, density: 0.9, gutter: 0.15, heat: 0.12, heatRate: 1.1, calls: 0.85, pace: { first: 55, calm: 12 },
  },
  transit: {
    kind: 'transit', blurb: 'Empty space between lanes. Quick, quiet, and nothing to eat.', holders: ['none'],
    cyrite: [0.1, 0.35], supplies: [0, 0], port: 0, lane: [1500, 1900], rich: 0.06, density: 0.65, gutter: 0.25, heat: 0.04, heatRate: 0.75, calls: 1.5, pace: { first: 60, calm: 14 },
  },
  contested: {
    kind: 'contested', blurb: 'Gutter crews and Custody patrols, both looking for a prize.', holders: ['gutter'],
    cyrite: [0.35, 0.75], supplies: [0.2, 0.5], port: 0.5, lane: [2300, 2800], rich: 0.1, density: 1.05, gutter: 0.55, heat: 0.18, heatRate: 1.15, calls: 0.8, pace: { first: 38, calm: 8 },
  },
  gate: {
    kind: 'gate', blurb: 'The one way through to the next region. Everyone passes here.', holders: ['none'],
    cyrite: [0.25, 0.45], supplies: [0, 0.2], port: 0.5, lane: [2200, 2500], rich: 0.08, density: 0.9, gutter: 0.35, heat: 0.12, heatRate: 1.05, calls: 0.9, pace: { first: 45, calm: 10 },
  },
  edge: {
    kind: 'edge', blurb: 'The last lane the old charts know. Beyond it, the Scatter.', holders: ['none'],
    cyrite: [0.2, 0.4], supplies: [0, 0], port: 0, lane: [2400, 2400], rich: 0.08, density: 0.9, gutter: 0.3, heat: 0.1, heatRate: 1, calls: 1, pace: { first: 45, calm: 10 },
  },
};

/** System names, drawn without repeats. The home system and the edge have their own. */
export const NAMES = [
  'Halden’s Reach', 'Tollmere', 'Vesk', 'Ashgrove', 'Corrin Deep', 'Marrow', 'Sallow', 'Pell', 'Ninefold', 'Dunmore', 'Kettle', 'Brask',
  'Oriel', 'Wick', 'Lantern', 'Hask', 'Sable Run', 'Greyhollow', 'Imbrie', 'Coldwater', 'Tamsin’s Rest', 'Orrin', 'Fallow', 'Quarry Nine',
];
export const HOME_NAME = 'Cerro';
export const EDGE_NAME = 'The Threshold';

/** Port names by holder. */
export const PORT_NAMES: Record<Holder, string[]> = {
  kellern: ['Kellern Fuel Dock', 'Kellern Claim Office'],
  frontier: ['Frontier Supply', 'Frontier Supply Depot'],
  guild: ['Dust Traders Exchange', 'Guild Hall'],
  gutter: ['The Bent Nail', 'Salvage Barge'],
  holdfast: ['Holdfast Stores', 'The Claim Hall'],
  voice: [],
  thren: [],
  none: ['Free Dock', 'Claim Shack'],
};

/** Price multipliers by holder (Cyrite, plates and supplies). */
export const HOLDER_PRICES: Record<Holder, Partial<Record<keyof Prices, number>>> = {
  kellern: { cyrite: 1.1 },
  frontier: {},
  guild: {},
  gutter: { cyrite: 0.8, plate: 0.8, supplies: 1.3 },
  holdfast: { cyrite: 1.15, supplies: 0.8 },
  voice: {},
  thren: {},
  none: { cyrite: 1.2, supplies: 1.2 },
};

export const HOLDER_NAMES: Record<Holder, string> = {
  kellern: 'Kellern Mining', frontier: 'Frontier Supply', guild: 'the Dust Traders', gutter: 'the Gutter', holdfast: 'a Holdfast',
  voice: 'the Voice', thren: 'the Thren', none: 'nobody',
};
