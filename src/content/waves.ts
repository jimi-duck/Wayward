// ── a relay's waves, cover and pulse (spaceways plan, step 5) ─────────────
// Waking a relay is loud: each of the first two stages sends Custody a wave
// (sim/uplink.ts). The waves grow down the road. From the middle legs the
// second wave brings a tether hunter, a hull that makes for the mast and holds
// the charge while it sits there. Locals she has helped fly cover at their own
// relay. Rules live in sim/world.ts (stepRelay); these are the rows.

export type WaveTier = 'first' | 'reach' | 'mid' | 'late';
export interface WaveRow { variant: 'picket' | 'lancer' | 'enforcer'; n: number; /** It makes for the mast and holds the charge while it is near. */ hunter?: boolean }

/** Each tier's waves: what stage 1 sends, then what stage 2 sends. The core (stage 3) sends none. */
export const RELAY_WAVES: Record<WaveTier, readonly [readonly WaveRow[], readonly WaveRow[]]> = {
  // the first system past Cerro: two patrol fighters a stage, short and winnable
  first: [[{ variant: 'picket', n: 2 }], [{ variant: 'picket', n: 2 }]],
  // the Reach: one wave of two, at the first stage
  reach: [[{ variant: 'picket', n: 2 }], []],
  // the first legs past the Narrows: two waves, the second with a hunter
  mid: [[{ variant: 'picket', n: 2 }], [{ variant: 'picket', n: 1 }, { variant: 'lancer', n: 1, hunter: true }]],
  // the late legs: bigger, and the hunter is an enforcer
  late: [[{ variant: 'picket', n: 3 }], [{ variant: 'picket', n: 2 }, { variant: 'enforcer', n: 1, hunter: true }]],
};

/** The road's gates past the Narrows (content/road.ts GATES, counted from 0) at which the late tier starts. */
export const LATE_FROM = 3;

/** Which tier a relay's waves come from: the first system, a Reach relay, or a gate down the road (0: the first past the Narrows). */
export function waveTier(first: boolean, reach: boolean, gate: number): WaveTier {
  return first ? 'first' : reach ? 'reach' : gate >= LATE_FROM ? 'late' : 'mid';
}

/** Locals who fly cover at a relay once she has helped them: the stop, the flag that says she did, and who speaks. */
export interface CoverRow { stop: string; flag: string; from: string; caller: 'miners' | 'frontier'; line: string }
export const COVER: readonly CoverRow[] = [
  // Hester's crews, if she broke the toll beacon on their lane (content/script/reach.ts)
  { stop: 'branford', flag: 'job_pirate_toll_won', from: 'Hester', caller: 'miners', line: '“That’s Custody on our lane. Crews, cover her. Rig guns on anything near the mast.”' },
  // every crew she helped stands at the Breaker (content/script/legs.ts yt_hester)
  { stop: 'breaker', flag: 'thread_crews_3', from: 'Hester', caller: 'miners', line: '“Every rig we’ve got is on the mast. Hold the key, we’ll hold the ring.”' },
];

/** Cover: how far from the mast the locals' guns reach, how often they fire, and what a shot does. */
export const COVER_R = 160;
export const COVER_EVERY = 2.5;
export const COVER_DMG = 14;

/** The relay's damping pulse, once a wake once its lamps are lit: how far it reaches and where it throws hulls. */
export const PULSE_R = 70;
export const PULSE_PUSH = 55;
export const PULSE_SNARE = 3;
/** How many hostile hulls in the ring set it off (a guard or a hunter on the mast always does). */
export const PULSE_CROWD = 2;
/** How fast a tether hunter closes on the mast on top of its own flying (units a second), and how near it settles. */
export const HUNT_PULL = 16;
export const HUNT_SIT = 14;
