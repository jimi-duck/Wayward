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
    gate: 'The Narrows', last: false, net: 1, thren: {}, drifts: 1, port: 1, heatRate: 1, ahead: 1,
  },
  {
    name: 'The Marches', blurb: 'Holdfasts, Drift fleets, and the Gutter raiding both.',
    cols: [['mining', 'contested', 'port', 'transit'], ['contested', 'mining', 'transit', 'port']],
    sizes: [3, 3],
    holders: { mining: ['holdfast', 'holdfast', 'none'], port: ['holdfast', 'guild'], contested: ['gutter'], transit: ['none'] },
    gate: 'The Rift', last: false, net: 0.55, thren: { none: 0.15 }, drifts: 2, port: 0.9, heatRate: 0.85, ahead: 1.3,
  },
  {
    name: 'The Hollows', blurb: 'Voice foundries and Thren lanes. Nothing human lives here.',
    cols: [['mining', 'transit', 'contested'], ['contested', 'transit', 'mining']],
    sizes: [2, 2],
    holders: { mining: ['voice', 'none'], contested: ['voice', 'thren'], transit: ['thren', 'none'], port: ['none'] },
    gate: 'The Threshold', last: true, net: 0.25, thren: { thren: 0.8, none: 0.35, voice: 0.1 }, drifts: 0, port: 0.35, heatRate: 0.7, ahead: 1.6,
  },
];

/** Drift fleets' names, drawn without repeats. */
export const FLEETS = ['the Long Walk', 'the Slow Rain', 'the Kindly Ann', 'the Ninth Mile', 'the Lantern Fleet'];
