import type { Holder, SystemKind } from './systems';
import type { CordonDef } from '../sim/cordon';

// ── the Warden's Road: the Reach as fixed stops ─────────────────────────────
// Behind `?road` the Reach is not a chart to choose across but one line of
// stops, in order (docs/ROAD.md). Each row fixes what the seeded chart would
// have dealt: the name, the kind, who holds it, its port and whether it is a
// breather. Skies and rock stay seeded. The column is the index in `ROAD`;
// the Narrows, the gate out, follows the last row.

/** The flag a road journey carries from its first day: the road's own lines and chips (a job's thread) are shown only with it. */
export const ON_ROAD = 'on_road';

/** What a stop is for in the story, so a script and a pilot can say why it is there. */
type RoadRole = 'start' | 'landfall' | 'hub' | 'work' | 'turn' | 'breather' | 'pressure' | 'reckoning';

export interface RoadStop {
  /** The system's name. Absent: the chart deals one (only a save from before v26 has a dealt name on the road). */
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
  /**
   * What is going on here, for the pause card's Objective: one or two short sentences (30 words at most) that give a
   * little more than the HUD (who, why, what is at stake). Absent: the card shows the purpose. The story thread owns it.
   */
  brief?: string;
  /** A job (content/missions.ts) pinned here, and nowhere else. */
  job?: string;
  /** The key of this stop's script (content/script/). */
  script: string;
  /** A moment of the unknown (content/situations.ts ARC) pinned to a stop with no job: one meeting a leg, at a fixed stop. A stop holds one or the other. */
  scene?: string;
}

export const ROAD: RoadStop[] = [
  // the audit dock's system: named, so the chart, the title card and the story agree from the first jump (owner 2026-11-22)
  { name: 'Ringhold', purpose: 'the company’s audit dock', kind: 'port', holder: 'kellern', role: 'start', script: 'audit' },
  { name: 'Northfold', purpose: 'the quiet way to Halden’s Reach', brief: 'The archive named a quiet lane, and this is it. Every other way out is watched, and your hull is posted as stolen. Nobody is hunting you yet.', kind: 'transit', holder: 'none', port: null, role: 'landfall', job: 'nothing_to_declare', script: 'northfold' },
  { name: 'Halden’s Reach', purpose: 'meet Ilse Marrow', brief: 'Ilse Marrow stood watch at the Narrows the night the lanes closed. She kept the order, and she is waiting off the hospice ring.', kind: 'port', holder: 'kellern', port: 'Kellern Fuel Dock', role: 'hub', script: 'halden' },
  { name: 'Tallyhouse', purpose: 'meet Adam Brook, a clerk', brief: 'Kellern’s accounts station. Adam Brook, a clerk, keeps the real books: where the Scatter’s Krail went. He wants them out, and he is waiting in his shuttle.', kind: 'port', holder: 'kellern', port: 'Kellern Claim Office', role: 'turn', script: 'marlow' },
  { name: 'Miners’ Gap', purpose: 'the Net closes behind', brief: 'The lane Hester’s crews haul through. Pirates have put a toll beacon on it, and the Net is spreading behind you. Staying long is a risk.', kind: 'contested', holder: 'gutter', port: null, role: 'pressure', job: 'pirate_toll', script: 'branford' },
  { name: 'Copperline', scene: 'brook_transport', purpose: 'a clerk in trouble', brief: 'Kellern’s last port before the Narrows. Fit what you can. Custody has traced the company’s real books to Adam Brook, the clerk at Tallyhouse.', kind: 'port', holder: 'kellern', port: 'Kellern Fuel Dock', role: 'reckoning', script: 'copperline' },
];


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
const MARCHES: RoadStop[] = [
  stop('landfall', 'Wake', 'transit', 'none', 'm_wake', { purpose: 'a lifeboat, and raiders', brief: 'You are through the Narrows and into the Scatter, cut off for seventy years. Ada’s note sends you on. Raiders work this lane, and a lifeboat is calling.', job: 'lifeboat_wake' }),
  stop('hub', 'Kessel Hold', 'port', 'holdfast', 'm_kessel', { port: 'The Claim Hall', purpose: 'the moot wants your file', brief: 'A Holdfast port that lost kin the night the lanes closed. Its moot is meeting, and the file you carry is what they want to hear.', job: 'keep_distance' }),
  stop('work', 'Tamsin Field', 'contested', 'gutter', 'm_tamsin', { purpose: 'someone offers to settle your debt', brief: 'Gutter ground. Kellern’s recovery accounts desk has found you, and an offer to settle your debt is coming. They want you alive, and in their hands.', job: 'wanted' }),
  // Low Harrow, the breather, is cut (living-world plan, 22 November 2026): its scored hull, Wren's rule and the watcher are here now
  stop('turn', 'The Long Walk', 'transit', 'none', 'm_walk', { purpose: 'the Drift kept the names', brief: 'A Drift fleet, always moving. Ma Saffi kept the manifests of the ships turned back that night. Kellern wants them off the lane. Walk them to the gate.', scene: 'drift_walk' }),
  stop('pressure', 'Gannet Reach', 'mining', 'holdfast', 'm_gannet', { purpose: 'the rigs are boarded', brief: 'Kellern security is boarding Holdfast rigs and taking the claims. Whoever stood with you at Kessel Hold is counting on you here. Expect Kellern ships.', job: 'missing_shift' }),
  stop('reckoning', 'Sallow Port', 'transit', 'guild', 'm_sallow', { port: 'Guild Hall', purpose: 'refit before the Rift', brief: 'Last refit before the Rift, a broken relay with no beacons. A fixer’s tanker job and the crews’ need for the filters it carries pull against each other.', job: 'heavy_tanker' }),
];

/** The Salvage Belt: what things are worth. */
const BELT: RoadStop[] = [
  stop('landfall', 'Breakwater', 'transit', 'none', 'b_breakwater', { purpose: 'listen to the wrecks', brief: 'The Belt is wreck country, worked by the Dust Traders, and everything has a price. It is quiet here, but Hester’s people are down to their last filter.', job: 'one_filter' }),
  stop('hub', 'Scrap Exchange', 'port', 'guild', 'b_exchange', { port: 'Dust Traders Exchange', purpose: 'everyone knows what you carry', brief: 'The Belt’s market. Word has spread about what you carry, and Val, a broker of the Gutter, is the first to name a price for it.', job: 'ransom_crew' }),
  stop('work', 'The Graveyard', 'mining', 'guild', 'b_graveyard', { purpose: 'a wreck that remembers', brief: 'A field of broken ships. One wreck still holds a recording of a hull that met something and turned back. A salvage broker wants it opened.', job: 'wreck_remembered' }),
  stop('turn', 'Kessler’s Wreck', 'contested', 'guild', 'b_kessler', { purpose: 'a recorder that still runs', brief: 'Dov Kessler is stripping a Warden wreck whose recorder still runs. It heard the night the lanes went dark, and he can’t cut it free alone.' , scene: 'thren_swarm' }),
  stop('pressure', 'Kiln', 'contested', 'gutter', 'b_kiln', { purpose: 'someone is selling routes', brief: 'Gutter-held and hot. Someone sold your heading to the Offices, and their pickets are on the way. A witness knows who, and wants out.', job: 'the_witness' }),
  stop('reckoning', 'Tarik’s Lamps', 'transit', 'guild', 'b_tarik', { port: 'Salvage Barge', purpose: 'the charts they burned', brief: 'A salvage barge where Tarik Silva draws lanes by hand from charts the Continuance burned. Put together, the closures make a shape, and he can show you.', job: 'long_walk' }),
];

/** The Drift Deep: the ring. */
const DEEP: RoadStop[] = [
  stop('landfall', 'Longwater', 'transit', 'none', 'd_longwater', { purpose: 'ask the Drift where the closures run', brief: 'The Drift Deep is fleets that never stop, past where the Net has reached. The lanes were closed in a pattern, and the Drift may remember it.', scene: 'lane_signal' }),
  stop('hub', 'The Quiet Ferry', 'transit', 'none', 'd_ferry', { port: 'Free Dock', purpose: 'a lane ahead, no questions', brief: 'Ossie Raine runs a ferry nobody hunts. He can carry you a lane ahead of anyone behind you, for stores and no questions.', job: 'finders_keepers' }),
  stop('work', 'Lantern Mile', 'mining', 'none', 'd_lantern', { purpose: 'a warm object, moving', brief: 'A mining field the Survey Office is watching. Something warm and slow moves through it toward the lanes, and heavy digging seems to make it louder.', job: 'something_dark' }),
  stop('turn', 'Ninth Fold', 'transit', 'none', 'd_fold', { purpose: 'someone aboard is watching', brief: 'One of the ferry’s passengers has watched you the whole way. A fixer’s payroll job waits here too, and the wages are Hester’s crews’.', job: 'missing_payroll' }),
  stop('breather', 'Hushlight', 'transit', 'none', 'd_hush', { purpose: 'a quiet relay', brief: 'A quiet relay, and the first time the Voice speaks to you. It is an old Accord intelligence that kept the lane keys. It knows who is behind you.', scene: 'thren_shadow' }),
  stop('pressure', 'Stillwater', 'mining', 'holdfast', 'd_still', { purpose: 'Hester’s own rig', brief: 'Hester’s own rig, and Custody has followed you into the Deep. Her crew is holding the last shift and needs you to hold it with them.', job: 'last_shift' }),
  stop('reckoning', 'Kindmere', 'port', 'holdfast', 'd_kindmere', { port: 'Holdfast Stores', purpose: 'a lane only Tarik drew', brief: 'Holdfast stores, the last stop before the Slow Door. On a chart the closures form a ring. Tarik drew one lane through it, and only he knows it.', job: 'tarik_bend' }),
];

/** The Breaker Yards: who built it. */
const YARDS: RoadStop[] = [
  stop('landfall', 'Cutton', 'transit', 'none', 'y_cutton', { purpose: 'forty sealed in a cradle', brief: 'Custody’s breaker yards, watched hard. Forty crew are sealed in a cradle awaiting the cutters, and their radio is still on.', job: 'cradle_crew' }),
  stop('hub', 'Yard Nine', 'port', 'kellern', 'y_nine', { port: 'Kellern Claim Office', purpose: 'the first work order', brief: 'Ben Anand, a yard clerk, has the first work order for the breakers, signed in the Continuance’s own hand. Handing it over costs him his pension.', job: 'needle' }),
  stop('work', 'Anvil Slip', 'mining', 'kellern', 'y_anvil', { purpose: 'a cargo train broke up here', brief: 'A cargo train broke up here and its cargo is drifting loose. A Guild salvage desk has an open claim, but the cargo belongs to the Drift.', job: 'drift_cache' }),
  stop('turn', 'Keelberth', 'contested', 'kellern', 'y_keel', { purpose: 'Sam, through the relays', brief: 'Sam, silent since the Narrows, reaches you through three relays. The hulls coming into the yards are scarred, and his brother Eben works there.', job: 'voice_wire' }),
  stop('pressure', 'Torchwall', 'contested', 'gutter', 'y_torch', { purpose: 'the crews may strike', brief: 'The yard crews are ready to strike. Marit Voss asks you to stand with them, and Draper’s yard security is coming for you either way.', job: 'kill_zone' }),
  stop('reckoning', 'Davit Dock', 'port', 'frontier', 'y_davit', { port: 'Free Dock', purpose: 'who has been paying you', brief: 'Director Draper has run Kellern’s accounts desk all along. He heads the Offices’ asset recovery, and he is about to show himself. He wants the file.', scene: 'yard_hulk' }),
];

/** The Free Ports: who was in the room. */
const PORTS: RoadStop[] = [
  stop('landfall', 'Saltquay', 'transit', 'none', 'f_saltquay', { purpose: 'the free ports kept the names', brief: 'The Free Ports are Gutter ports where everyone trades and nobody asks. They also kept the names of the people who were in the room when the lanes closed.', scene: 'voice_guide' }),
  stop('hub', 'Duarte Harbour', 'port', 'guild', 'f_duarte', { port: 'Dust Traders Exchange', purpose: 'a berth, no questions', brief: 'Ines Duarte, harbour-master of the Dust Traders, offers you a berth and no questions. The Guild only wants to know you as a friend.' }),
  stop('work', 'Penny Cross', 'mining', 'gutter', 'f_penny', { purpose: 'something answers a full tank', brief: 'A rough mining stop. Something answers a full tank here, and the Governor’s pickets want your copy of the file.', job: 'dead_drop' }),
  stop('turn', 'Mirren’s Pier', 'transit', 'none', 'f_mirren', { purpose: 'forty names in a box', brief: 'Old Mirren keeps the list of everyone who was in the room when the order was read. Forty names. She will let you read them.', job: 'be_bait' }),
  stop('pressure', 'Gilt Market', 'contested', 'gutter', 'f_gilt', { purpose: 'everyone wants a copy', brief: 'A busy Gutter market where everyone wants a copy of your file. A hearing is held here over what you carry, and Ines’s offer is still open.', job: 'lose_prefect' }),
  stop('reckoning', 'Ninehaven', 'port', 'gutter', 'f_nine', { port: 'The Bent Nail', purpose: 'static on the approach', brief: 'Static on the approach plays Ada’s first note back to you. Then the Voice speaks: it built the breakers that closed the lanes, and it kept the keys.', scene: 'thren_exchange' }),
];

/** The Hollows: what it was for. */
const HOLLOWS: RoadStop[] = [
  stop('landfall', 'Ashdeep', 'transit', 'none', 'h_ashdeep', { purpose: 'where the lanes began', brief: 'Nothing human lives in the Hollows, only the Voice’s old foundries and the Thren’s lanes. This is where the lanes were first built.' }),
  stop('hub', 'Hollowforge', 'mining', 'voice', 'h_forge', { purpose: 'a pattern on the scope', brief: 'A Voice foundry. The pattern on the scope is the Thren speaking, with the Voice translating. They follow the Cyrite, and you carry it.' }),
  stop('work', 'Coldvault', 'contested', 'voice', 'h_vault', { purpose: 'a tug for your registry', brief: 'Kellern’s recovery tug has caught up with you. It is here to take the ship back in the company’s name, the last step of the account that began in Cerro.', job: 'recovery_order' }),
  stop('turn', 'Palecairn', 'transit', 'thren', 'h_cairn', { purpose: 'two voices want something', brief: 'Two voices want something from you. One is a fragment of the Voice asking to be freed. The other is Sable, touched by the Thren, who wants to go home.', job: 'sables_crossing' }),
  stop('pressure', 'Ghostcinder', 'contested', 'thren', 'h_cinder', { purpose: 'the swarm lane', brief: 'The swarm lane, the hardest crossing yet. The Voice’s drones are not fighting the swarm, they are opening the gates for it. Hold your course.', scene: 'foundry_both' }),
  stop('reckoning', 'Gaunt Watch', 'mining', 'none', 'h_gaunt', { purpose: 'the Governor’s aide', brief: 'Noor Haddad, the Governor’s aide, calls ahead of the Seam. She holds one of the three keys, and wants to hear what you plan to do with the file.', job: 'ring_centre' }),
];

/** The Last Lanes: what you do with it. The Threshold follows the last row. */
const LAST: RoadStop[] = [
  stop('landfall', 'Lastlight', 'transit', 'none', 'l_lastlight', { purpose: 'the last relay ahead', brief: 'The last stretch. One relay ahead, then the Threshold, where the chase ends. Whatever you do with the file, you must decide before you get there.' }),
  stop('hub', 'The Last Toll', 'port', 'none', 'l_toll', { port: 'The Last Toll', purpose: 'every lane ends here', brief: 'Oren Lisle keeps the last toll, an archivist’s window at the end of every lane. He will let you through, but he asks three questions first.' }),
  stop('work', 'Thin Gap', 'transit', 'thren', 'l_gap', { purpose: 'the first question', brief: 'Oren’s first question: who are you to carry that file? Answer as a hauler pilot, a Warden’s heir, or not at all. It is logged.' }),
  stop('turn', 'Dimrim', 'mining', 'none', 'l_dimrim', { purpose: 'the second question', brief: 'Oren’s second question: what has carrying the file cost other people? Your answer is logged, and the epilogue reads it back.' }),
  stop('breather', 'Lone Step', 'transit', 'none', 'l_step', { purpose: 'the third question', brief: 'Oren’s third question: what is the file for? Truth, mercy or freedom. The Voice asks too, and wants to know who you trust with it.' }),
  stop('pressure', 'Dusk Mark', 'contested', 'voice', 'l_dusk', { purpose: 'instruments disagree', brief: 'Instruments disagree here. Ashgrove, the Custody inspector, signals you through or flies with Draper, depending on how you treated him.', scene: 'unknown_pulse' }),
  stop('reckoning', 'Wane Rest', 'transit', 'none', 'l_wane', { purpose: 'the Threshold is ahead', brief: 'The last quiet before the Threshold. Draper’s fleet has gathered ahead, and the relays you lit may carry Sam’s voice again.' }),
];

/** Every leg of the road, the Reach first (its audit dock included). */
export const LEGS: RoadStop[][] = [ROAD, MARCHES, BELT, DEEP, YARDS, PORTS, HOLLOWS, LAST];

/** Each leg's gate: its script key, and what the Course says of it. The last is the Threshold. */
/**
 * The Reach's relays (spaceways plan, step 4, owner 24 November 2026): a Warden relay by each stop's gate, woken by her own key.
 * Their flags (`relay_<script>`) are not the road's gates (GATES), so the lit-relay count Ada's notes speak of is unchanged.
 * `twist`: buried (a rock sits on the mast, she mines it clear first), guarded (a Custody picket sits on it).
 */
export const REACH_RELAYS: Record<string, { twist?: 'buried' | 'guarded' }> = {
  halden: {},
  marlow: {},
  branford: { twist: 'buried' },
  copperline: { twist: 'guarded' },
};

export const GATES: Array<{ script: string; purpose: string; /** What is going on at this gate, for the pause card (as RoadStop.brief). */ brief?: string }> = [
  { script: 'narrows', purpose: NARROWS.purpose, brief: 'Custody has locked the gate. Ada’s relay still answers to her key and will knock the gate offline for ninety seconds. The Governor is on her way.' },
  { script: 'rift', purpose: 'a broken relay, no beacons', brief: 'A broken relay with no beacons, the gate between the Marches and the Belt. A Custody inspector, Ashgrove, runs a checkpoint here and wants your registry.' },
  { script: 'scrapgate', purpose: 'a gate made of ships', brief: 'A gate made of welded ship hulls. Its relay answers to Ada’s key. She left another note, and this one is in her own voice.' },
  { script: 'slowdoor', purpose: 'three minutes to open', brief: 'The Slow Door takes three minutes to open, long enough for anyone behind you to catch up. Ada’s note waits at the relay.' },
  { script: 'breaker', purpose: 'the machine itself', brief: 'This is a lane breaker, one of the machines that shut the outer lanes seventy years ago. Ada’s next note says who it was built for.' },
  { script: 'tollgate', purpose: 'Calloway’s field', brief: 'Calloway has closed this gate behind you. No guns, no jump, until you answer her about the name signed on the order.' },
  { script: 'seam', purpose: 'the relay is awake', brief: 'The relay is awake, and the Voice asks for its key. Ada’s implant is still in the helm, and you decide what happens to it.' },
  { script: 'threshold', purpose: 'the last relay' },
];


/** What a job of the road costs another thread when it is won (docs/overhaul/BEAT_MAP.md §4): the collision chips. */
export const COLLISIONS: Record<string, { standing?: Partial<Record<'miners' | 'frontier' | 'guild' | 'gutter', number>>; unflag?: string }> = {
  heavy_tanker: { standing: { miners: -1 } },
  missing_payroll: { standing: { miners: -2 } },
  drift_cache: { unflag: 'wren_trust' },
};


// ── the chases: one hunted stop a leg (owner, 16 November 2026) ─────────────
// Every leg has a stop (the pressure stop, where it fits) where someone comes after Juno by name: the
// first hull soon after arrival and more after every calm, mostly from ahead,
// with a red notice saying who and why (content/script/chase.ts). Never a
// breather. The Belt keeps its two (Val sold her heading), shaken by paying or
// jamming her. A named captain does not come to a chased stop, so the hunts
// never stack.

export interface LegChase {
  /** Who comes, as variant ids (sim/enemies.ts), mostly from ahead. */
  who: string[];
  /** Seconds to the first hull, and after each calm. */
  first: number;
  calm: number;
  /** Heat at arrival, and the share of the pursuit from ahead. */
  heat: number;
  ahead: number;
  /** Any of these flags shakes it. */
  shaken?: string[];
  /** A cordon across the lane (sim/cordon.ts): the chase waits until it sees her, and never comes if she runs through it cold. */
  cordon?: CordonDef;
}

const HUNT = { first: 25, calm: 8, heat: 0.3, ahead: 0.6 } as const;
/** The chased stops, by script key. */
export const LEG_CHASES: Record<string, LegChase> = {
  // the Reach: the stolen hull is posted; milder, the first leg
  branford: { who: ['enforcer', 'picket'], first: 40, calm: 12, heat: 0.2, ahead: 0.4 },
  // the Marches: Kellern security boards the rigs, then comes for her
  m_gannet: { who: ['picket', 'picket', 'lancer'], ...HUNT },
  // the Belt: the Offices bought her heading from Val
  // Kiln is the Belt's set piece: a silent run through the cordon the Offices strung on her heading (living-world plan)
  b_kiln: { who: ['picket', 'picket', 'lancer'], first: 20, calm: 6, heat: 0.3, ahead: 0.6, shaken: ['vell_paid', 'vell_exposed'], cordon: { n: 4, along: 0.45 } },
  b_tarik: { who: ['picket', 'picket', 'lancer'], first: 20, calm: 6, heat: 0.3, ahead: 0.6, shaken: ['vell_paid', 'vell_exposed'] },
  // the Drift Deep: Custody follows her into the swarm
  d_still: { who: ['picket', 'lancer'], ...HUNT },
  // the Breaker Yards: Draper's yard security, sent to break the strike
  y_torch: { who: ['whisper', 'whisper', 'picket'], ...HUNT },
  // the Free Ports: the Governor's pickets want her copy of the file. At Penny Cross, not Gilt Market:
  // Gilt's job is a sneak past a patrol, and a chase on top of a sneak cannot be won
  f_penny: { who: ['picket', 'picket', 'lancer'], ...HUNT },
  // the Hollows: Foundry drones at Hollowforge (Ghostcinder, the pressure stop, is a crossing with no fighting)
  h_forge: { who: ['drone', 'probe'], ...HUNT },
  // the Last Lanes: the Patience's pickets
  l_dusk: { who: ['picket', 'lancer', 'lancer'], ...HUNT },
};
