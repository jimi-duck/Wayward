import type { Holder, SystemKind } from './systems';

// ── the Warden's Road: the Reach as fixed stops ─────────────────────────────
// Behind `?road` the Reach is not a chart to choose across but one line of
// stops, in order (docs/ROAD.md). Each row fixes what the seeded chart would
// have dealt: the name, the kind, who holds it, its port and whether it is a
// breather. Skies and rock stay seeded. The column is the index in `ROAD`;
// the Narrows, the gate out, follows the last row.

/** What a stop is for in the story, so a script and a pilot can say why it is there. */
export type RoadRole = 'start' | 'landfall' | 'hub' | 'work' | 'turn' | 'breather' | 'pressure' | 'reckoning';

export interface RoadStop {
  /** Absent: the chart names it (the audit dock's system, which plays as it does today). */
  name?: string;
  kind: Exclude<SystemKind, 'home' | 'gate' | 'edge'>;
  holder: Holder;
  /** The port's name; null for none; absent: the chart deals it. */
  port?: string | null;
  /** A breather: nothing hunts you here and no cards call. */
  quiet?: boolean;
  role: RoadRole;
  /** A job (content/missions.ts) pinned here, and nowhere else. */
  job?: string;
  /** The key of this stop's script (content/script/). */
  script: string;
}

export const ROAD: RoadStop[] = [
  { kind: 'port', holder: 'kellern', role: 'start', script: 'audit' },
  { name: 'Northfold', kind: 'transit', holder: 'none', port: null, role: 'landfall', script: 'northfold' },
  { name: 'Halden’s Reach', kind: 'port', holder: 'kellern', port: 'Kellern Fuel Dock', role: 'hub', job: 'nothing_to_declare', script: 'halden' },
  { name: 'Hollis', kind: 'mining', holder: 'none', port: null, role: 'work', job: 'follow_cyrite', script: 'hollis' },
  { name: 'Marlow', kind: 'port', holder: 'kellern', port: 'Kellern Claim Office', role: 'turn', script: 'marlow' },
  { name: 'Vesta', kind: 'transit', holder: 'none', port: null, quiet: true, role: 'breather', script: 'vesta' },
  { name: 'Branford', kind: 'contested', holder: 'gutter', port: null, role: 'pressure', job: 'pirate_toll', script: 'branford' },
  { name: 'Copperline', kind: 'port', holder: 'kellern', port: 'Kellern Fuel Dock', role: 'reckoning', script: 'copperline' },
];

/** The stop a system is, by name (the audit dock's system has none). */
export const roadStop = (name: string): RoadStop | undefined => ROAD.find((r) => r.name === name);
