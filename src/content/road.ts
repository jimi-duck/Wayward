import type { Holder, SystemKind } from './systems';

// ── the Warden's Road: the Reach as fixed stops ─────────────────────────────
// Behind `?road` the Reach is not a chart to choose across but one line of
// stops, in order (docs/ROAD.md). Each row fixes what the seeded chart would
// have dealt: the name, the kind, who holds it, its port and whether it is a
// breather. Skies and rock stay seeded. The column is the index in `ROAD`;
// the Narrows, the gate out, follows the last row.

/** The flag a road journey carries from its first day: the road's own lines and chips (a job's thread) are shown only with it. */
export const ON_ROAD = 'on_road';

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
  /** What the stop is for, in a few words, for the Course screen (provisional: the story thread owns the copy). */
  purpose?: string;
  /** A job (content/missions.ts) pinned here, and nowhere else. */
  job?: string;
  /** The key of this stop's script (content/script/). */
  script: string;
}

export const ROAD: RoadStop[] = [
  { kind: 'port', holder: 'kellern', role: 'start', script: 'audit' },
  { name: 'Northfold', purpose: 'quiet landfall', kind: 'transit', holder: 'none', port: null, role: 'landfall', script: 'northfold' },
  { name: 'Halden’s Reach', purpose: 'find the Warden’s record', kind: 'port', holder: 'kellern', port: 'Kellern Fuel Dock', role: 'hub', job: 'nothing_to_declare', script: 'halden' },
  { name: 'Hollis', purpose: 'mine, and fill the tank', kind: 'mining', holder: 'none', port: null, role: 'work', job: 'follow_cyrite', script: 'hollis' },
  { name: 'Marlow', purpose: 'someone here keeps the real books', kind: 'port', holder: 'kellern', port: 'Kellern Claim Office', role: 'turn', script: 'marlow' },
  { name: 'Vesta', purpose: 'rest here, or keep moving', kind: 'transit', holder: 'none', port: null, quiet: true, role: 'breather', script: 'vesta' },
  { name: 'Branford', purpose: 'the Net closes behind', kind: 'contested', holder: 'gutter', port: null, role: 'pressure', job: 'pirate_toll', script: 'branford' },
  { name: 'Copperline', purpose: 'a clerk in trouble', kind: 'port', holder: 'kellern', port: 'Kellern Fuel Dock', role: 'reckoning', script: 'copperline' },
];

/** The stop a system is, by name (the audit dock's system has none). */
export const roadStop = (name: string): RoadStop | undefined => ROAD.find((r) => r.name === name);

/** The gate out of the Reach, as the Course screen names it. */
export const NARROWS = { name: 'The Narrows', purpose: 'an old relay, dark seventy years', ada: 'the relay Ada watched' } as const;
