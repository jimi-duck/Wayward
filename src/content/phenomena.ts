import type { EncounterId } from '../sim/encounters';
import type { SystemKind } from './systems';

// ── phenomena and places ──────────────────────────────────────────────────
// The things that sit in a system, as data. The sector events (sim/
// encounters.ts) come and go at random in any sortie; a place is one of
// them pinned to a system on the chart, there when you arrive, there until
// you have dealt with it. The chart (sim/chart.ts) deals places out from
// these rows; a sortie plays the row's event once, a little after arrival;
// the journey (sim/journey.ts) pays the reward if it went well.
//
// Not every system has one, and not every place pays in Krail:
//
//   krail    · Krail aboard, straight into the tank.
//   parts    · salvage: drive parts and kit for the ship's systems.
//   cover    · somewhere to lose the trail: Calloway is held up.
//   shortcut · a lane the charts never had, from here two columns on.
//   favour   · someone set safe, and the people who owe you for it: chits
//              and contacts.
//   info     · the Net's edge as it is, and the places around you.
//   danger   · a find worth having, that someone else hears about.
//
// The Reach is human: wrecks, convoys, people in trouble. Further out the
// places get stranger: signals nobody can read in the Marches, and in the
// Hollows foundries the Voice left running and lanes the Thren cut. A Thren
// lane brings the Thren with it (sim/scatter.ts).

export type PlaceId =
  | 'ion_storm' | 'nebula' | 'gravity_well' | 'derelict' | 'convoy' | 'distress'
  | 'relay_ruin' | 'strange_signal' | 'voice_foundry' | 'thren_lane';

export type Reward = 'krail' | 'parts' | 'cover' | 'shortcut' | 'favour' | 'info' | 'danger';

export interface PlaceDef {
  id: PlaceId;
  name: string;
  /** One line for the chart. */
  blurb: string;
  /** How it plays in the sortie: the sector event it runs. */
  plays: EncounterId;
  /** The banner line when it starts. */
  text: string;
  /** What it pays when it goes well; the strange signal's is rolled when the chart is laid out. */
  reward: Reward | 'unknown';
  /** The line when it pays. */
  done: string;
  /** The kinds of system it can sit in, and the regions (content/regions.ts: 0 the Reach, 2 the Hollows). */
  kinds: SystemKind[];
  regions: [number, number];
  weight: number;
  /** Seen from anywhere on the chart (a storm, a nebula), or only once within sight. */
  far: boolean;
}

export const PLACES: Record<PlaceId, PlaceDef> = {
  ion_storm: {
    id: 'ion_storm', name: 'Ion storm', blurb: 'A standing storm. The lightning charges whatever it misses.', plays: 'ion_storm',
    text: 'Fly the storm · Krail condenses on the hull', reward: 'krail', done: 'Krail condensed from the storm',
    kinds: ['mining', 'transit', 'contested'], regions: [0, 1], weight: 1, far: true,
  },
  nebula: {
    id: 'nebula', name: 'Nebula', blurb: 'Thick dust. Sensors fail here, theirs as well as yours.', plays: 'nebula',
    text: 'Sensors down · nobody can follow you in here', reward: 'cover', done: 'Lost in the dust · the trail goes cold',
    kinds: ['transit', 'mining', 'port'], regions: [0, 2], weight: 1, far: true,
  },
  gravity_well: {
    id: 'gravity_well', name: 'Gravity well', blurb: 'Something heavy and unseen. It bends the lanes around it.', plays: 'anomaly',
    text: 'Gravity well · ride the pull, not the core', reward: 'shortcut', done: 'The well bent a lane · a new route on the chart',
    kinds: ['transit', 'mining'], regions: [0, 2], weight: 0.8, far: true,
  },
  derelict: {
    id: 'derelict', name: 'Derelict hulk', blurb: 'A dead ship on the old charts. Somebody else may be waiting by it.', plays: 'derelict',
    text: 'Salvage it, if you dare', reward: 'parts', done: 'Parts and kit stripped from the hulk',
    kinds: ['mining', 'transit', 'contested', 'port'], regions: [0, 2], weight: 1.1, far: false,
  },
  convoy: {
    id: 'convoy', name: 'Convoy lane', blurb: 'Freighters run through here on a schedule, heavy with Krail.', plays: 'convoy',
    text: 'Freighters crossing, heavy with Krail', reward: 'krail', done: 'Krail from the convoy’s holds',
    kinds: ['port', 'contested', 'mining'], regions: [0, 1], weight: 0.9, far: false,
  },
  distress: {
    id: 'distress', name: 'Distress beacon', blurb: 'Someone is still broadcasting. Help comes with company.', plays: 'distress',
    text: 'Hold position at the beacon', reward: 'favour', done: 'Survivors set safe · their people owe you',
    kinds: ['transit', 'mining', 'contested', 'port'], regions: [0, 1], weight: 1, far: false,
  },
  relay_ruin: {
    id: 'relay_ruin', name: 'Dead relay', blurb: 'An old survey relay, dark. Its memory may not be.', plays: 'distress',
    text: 'Hold at the relay while it wakes', reward: 'info', done: 'The relay’s memory: the Net, and what lies around you',
    kinds: ['transit', 'mining', 'contested'], regions: [0, 1], weight: 0.9, far: false,
  },
  strange_signal: {
    id: 'strange_signal', name: 'Strange signal', blurb: 'A pattern in the noise. Nobody on board can read it.', plays: 'distress',
    text: 'Hold at the source · something is answering', reward: 'unknown', done: 'The signal resolves',
    kinds: ['transit', 'mining', 'contested'], regions: [1, 2], weight: 0.8, far: false,
  },
  voice_foundry: {
    id: 'voice_foundry', name: 'Voice foundry', blurb: 'Machinery the Voice left running. Rich, and watched.', plays: 'derelict',
    text: 'Strip the foundry · its keepers are close', reward: 'danger', done: 'Foundry stock aboard · word of it travels',
    kinds: ['mining', 'contested'], regions: [2, 2], weight: 0.8, far: false,
  },
  thren_lane: {
    id: 'thren_lane', name: 'Thren lane', blurb: 'A lane no human cut. Things move along it.', plays: 'anomaly',
    text: 'The Thren lane pulls · hold your course', reward: 'shortcut', done: 'The Thren lane runs on · a new route on the chart',
    kinds: ['transit', 'contested', 'mining'], regions: [2, 2], weight: 1, far: false,
  },
};
export const PLACE_ORDER = Object.keys(PLACES) as PlaceId[];

/** What a strange signal turns out to be. */
export const SIGNAL_REWARDS: Reward[] = ['info', 'favour', 'shortcut', 'danger'];

/** The share of systems (besides Cerro and the Threshold) with a place in them; ports are busy enough already. */
export const PLACE_CHANCE: Partial<Record<SystemKind, number>> = { mining: 0.7, transit: 0.75, contested: 0.65, port: 0.4 };

/** What each reward pays, in one word for the chart. */
export const REWARD_WORD: Record<Reward | 'unknown', string> = {
  krail: 'Krail', parts: 'salvage', cover: 'cover', shortcut: 'a shortcut', favour: 'a favour', info: 'news', danger: 'a find', unknown: 'unknown',
};

/** Rewards, in amounts. */
export const PLACE_KRAIL = 14;
export const PLACE_PARTS = 3;
export const PLACE_COVER = 1.5;
export const PLACE_CHITS = 40;
/** Calloway's days gained on a find that travels. */
export const DANGER_DAYS = 1;
