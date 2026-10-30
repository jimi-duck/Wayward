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
  /** A moment of the unknown (content/situations.ts ARC) pinned to a stop with no job: one meeting a leg, at a fixed stop. */
  scene?: string;
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

/** The stop a system is, by name (the audit dock's system has none). Any leg's. */
export const roadStop = (name: string): RoadStop | undefined => LEGS.flat().find((r) => r.name === name);

/** The gate out of the Reach, as the Course screen names it. */
export const NARROWS = { name: 'The Narrows', purpose: 'an old relay, dark seventy years', ada: 'the relay Ada watched' } as const;

// ── the road past the Narrows: seven legs, seven stops each ─────────────────
// The narrative overhaul (docs/overhaul/BEAT_MAP.md) lays every region out as
// the Reach is: one lane per stop, in the same order of roles (landfall, hub,
// work, turn, breather, pressure, reckoning), then the region's gate, where an
// arrival plays at a Warden relay. The rows fix the name, kind, holder, port,
// breather and pinned job; skies and rock stay seeded.

const stop = (role: RoadRole, name: string, kind: RoadStop['kind'], holder: Holder, script: string, o: Partial<RoadStop> = {}): RoadStop =>
  ({ name, kind, holder, port: null, role, script, ...(role === 'breather' ? { quiet: true } : {}), ...o });

/** The Marches: who stands with you. */
export const MARCHES: RoadStop[] = [
  stop('landfall', 'Wake', 'transit', 'none', 'm_wake', { purpose: 'past the charts', scene: 'thren_curious' }),
  stop('hub', 'Kessel Hold', 'port', 'holdfast', 'm_kessel', { port: 'The Claim Hall', purpose: 'the moot wants your file', job: 'keep_distance' }),
  stop('work', 'Tamsin Field', 'contested', 'gutter', 'm_tamsin', { purpose: 'someone offers to settle your debt', job: 'wanted' }),
  stop('turn', 'The Long Walk', 'transit', 'none', 'm_walk', { purpose: 'the Drift kept the names' }),
  stop('breather', 'Low Harrow', 'transit', 'none', 'm_harrow', { purpose: 'rest, and listen to the Drift' }),
  stop('pressure', 'Gannet Reach', 'mining', 'holdfast', 'm_gannet', { purpose: 'the rigs are boarded', job: 'missing_shift' }),
  stop('reckoning', 'Sallow Port', 'transit', 'guild', 'm_sallow', { port: 'Guild Hall', purpose: 'refit before the Rift', job: 'heavy_tanker' }),
];

/** The Salvage Belt: what things are worth. */
export const BELT: RoadStop[] = [
  stop('landfall', 'Breakwater', 'transit', 'none', 'b_breakwater', { purpose: 'listen to the wrecks', job: 'one_filter' }),
  stop('hub', 'Scrap Exchange', 'port', 'guild', 'b_exchange', { port: 'Dust Traders Exchange', purpose: 'everyone knows what you carry' }),
  stop('work', 'The Graveyard', 'mining', 'guild', 'b_graveyard', { purpose: 'a wreck that remembers', job: 'wreck_remembered' }),
  stop('turn', 'Kessler’s Wreck', 'contested', 'guild', 'b_kessler', { purpose: 'a recorder that still runs', job: 'dead_drop' }),
  stop('breather', 'Saltmarsh', 'transit', 'none', 'b_saltmarsh', { purpose: 'something crosses the lane', scene: 'thren_swarm' }),
  stop('pressure', 'Kiln', 'contested', 'gutter', 'b_kiln', { purpose: 'someone is selling routes', job: 'the_witness' }),
  stop('reckoning', 'Tarik’s Lamps', 'transit', 'guild', 'b_tarik', { port: 'Salvage Barge', purpose: 'the charts they burned', job: 'long_walk' }),
];

/** The Drift Deep: the ring. */
export const DEEP: RoadStop[] = [
  stop('landfall', 'Longwater', 'transit', 'none', 'd_longwater', { purpose: 'ask the Drift where the closures run', scene: 'thren_shadow' }),
  stop('hub', 'The Quiet Ferry', 'transit', 'none', 'd_ferry', { port: 'Free Dock', purpose: 'a lane ahead, no questions', job: 'finders_keepers' }),
  stop('work', 'Lantern Mile', 'mining', 'none', 'd_lantern', { purpose: 'a warm object, moving', job: 'something_dark' }),
  stop('turn', 'Ninth Fold', 'transit', 'none', 'd_fold', { purpose: 'someone aboard is watching', job: 'missing_payroll' }),
  stop('breather', 'Hushlight', 'transit', 'none', 'd_hush', { purpose: 'a quiet relay' }),
  stop('pressure', 'Stillwater', 'mining', 'holdfast', 'd_still', { purpose: 'Hester’s own rig', job: 'last_shift' }),
  stop('reckoning', 'Kindmere', 'port', 'holdfast', 'd_kindmere', { port: 'Holdfast Stores', purpose: 'a signal that answers', scene: 'lane_signal' }),
];

/** The Breaker Yards: who built it. */
export const YARDS: RoadStop[] = [
  stop('landfall', 'Cutton', 'transit', 'none', 'y_cutton', { purpose: 'the yards remember', scene: 'yard_hulk' }),
  stop('hub', 'Yard Nine', 'port', 'kellern', 'y_nine', { port: 'Kellern Claim Office', purpose: 'the first work order', job: 'needle' }),
  stop('work', 'Anvil Slip', 'mining', 'kellern', 'y_anvil', { purpose: 'a cargo train broke up here', job: 'drift_cache' }),
  stop('turn', 'Keelberth', 'contested', 'kellern', 'y_keel', { purpose: 'Sam, through the relays', job: 'voice_wire' }),
  stop('breather', 'Cradle Gap', 'transit', 'none', 'y_cradle', { purpose: 'a breaker still holds something' }),
  stop('pressure', 'Torchwall', 'contested', 'gutter', 'y_torch', { purpose: 'the crews may strike', job: 'kill_zone' }),
  stop('reckoning', 'Davit Dock', 'port', 'frontier', 'y_davit', { port: 'Free Dock', purpose: 'who has been paying you' }),
];

/** The Free Ports: who was in the room. */
export const PORTS: RoadStop[] = [
  stop('landfall', 'Saltquay', 'transit', 'none', 'f_saltquay', { purpose: 'the free ports kept the names', scene: 'voice_guide' }),
  stop('hub', 'Duarte Harbour', 'port', 'guild', 'f_duarte', { port: 'Dust Traders Exchange', purpose: 'a berth, no questions' }),
  stop('work', 'Penny Cross', 'mining', 'gutter', 'f_penny', { purpose: 'something answers a full tank', job: 'someone_answered' }),
  stop('turn', 'Mirren’s Pier', 'transit', 'none', 'f_mirren', { purpose: 'forty names in a box', job: 'be_bait' }),
  stop('breather', 'Lucky Haven', 'transit', 'none', 'f_haven', { purpose: 'people who live with them' }),
  stop('pressure', 'Gilt Market', 'contested', 'gutter', 'f_gilt', { purpose: 'everyone wants a copy', job: 'lose_prefect' }),
  stop('reckoning', 'Ninehaven', 'port', 'gutter', 'f_nine', { port: 'The Bent Nail', purpose: 'static on the approach', scene: 'thren_exchange' }),
];

/** The Hollows: what it was for. */
export const HOLLOWS: RoadStop[] = [
  stop('landfall', 'Ashdeep', 'transit', 'none', 'h_ashdeep', { purpose: 'where the lanes began', job: 'no_return' }),
  stop('hub', 'Hollowforge', 'mining', 'voice', 'h_forge', { purpose: 'a pattern on the scope' }),
  stop('work', 'Coldvault', 'contested', 'voice', 'h_vault', { purpose: 'the ring’s centre', job: 'two_captains' }),
  stop('turn', 'Palecairn', 'transit', 'thren', 'h_cairn', { purpose: 'two voices want something' }),
  stop('breather', 'Mute Hall', 'transit', 'none', 'h_mute', { purpose: 'they line the lane', scene: 'thren_watch' }),
  stop('pressure', 'Ghostcinder', 'contested', 'thren', 'h_cinder', { purpose: 'the swarm lane', scene: 'foundry_both' }),
  stop('reckoning', 'Gaunt Watch', 'mining', 'none', 'h_gaunt', { purpose: 'the Governor’s aide' }),
];

/** The Last Lanes: what you do with it. The Threshold follows the last row. */
export const LAST: RoadStop[] = [
  stop('landfall', 'Lastlight', 'transit', 'none', 'l_lastlight', { purpose: 'the last relay ahead' }),
  stop('hub', 'The Last Toll', 'port', 'none', 'l_toll', { port: 'The Last Toll', purpose: 'every lane ends here' }),
  stop('work', 'Thin Gap', 'transit', 'thren', 'l_gap', { purpose: 'the first question' }),
  stop('turn', 'Dimrim', 'mining', 'none', 'l_dimrim', { purpose: 'the second question' }),
  stop('breather', 'Lone Step', 'transit', 'none', 'l_step', { purpose: 'the third question' }),
  stop('pressure', 'Dusk Mark', 'contested', 'voice', 'l_dusk', { purpose: 'instruments disagree', scene: 'unknown_pulse' }),
  stop('reckoning', 'Wane Rest', 'transit', 'none', 'l_wane', { purpose: 'the Threshold is behind her' }),
];

/** Every leg of the road, the Reach first (its audit dock included). */
export const LEGS: RoadStop[][] = [ROAD, MARCHES, BELT, DEEP, YARDS, PORTS, HOLLOWS, LAST];

/** Each leg's gate: its script key, and what the Course says of it. The last is the Threshold. */
export const GATES: Array<{ script: string; purpose: string }> = [
  { script: 'narrows', purpose: NARROWS.purpose },
  { script: 'rift', purpose: 'a broken relay, no beacons' },
  { script: 'scrapgate', purpose: 'a gate made of ships' },
  { script: 'slowdoor', purpose: 'three minutes to open' },
  { script: 'breaker', purpose: 'the machine itself' },
  { script: 'tollgate', purpose: 'Calloway’s field' },
  { script: 'seam', purpose: 'the relay is awake' },
  { script: 'threshold', purpose: 'the last relay' },
];

/** Every stop's script key, gates included: a row's `stop` must be one of these (or `*`). */
export const SCRIPT_KEYS: ReadonlySet<string> = new Set([...LEGS.flat().map((r) => r.script), ...GATES.map((g) => g.script)]);

/** What a job of the road costs another thread when it is won (docs/overhaul/BEAT_MAP.md §4): the collision chips. */
export const COLLISIONS: Record<string, { standing?: Partial<Record<'miners' | 'frontier' | 'guild' | 'gutter', number>>; unflag?: string }> = {
  heavy_tanker: { standing: { miners: -1 } },
  missing_payroll: { standing: { miners: -2 } },
  drift_cache: { unflag: 'wren_trust' },
  two_captains: { standing: { frontier: -1 } },
};
