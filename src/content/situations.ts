import type { Outcome } from '../sim/comms';
import type { Temper, WardAct } from '../sim/enemies';
import { MISSIONS } from './missions';
import type { Holder, SystemKind } from './systems';

// ── situations ────────────────────────────────────────────────────────────
// What is going on in a system. A system's kind (mining, port, transit,
// contested) says what it is; its situation says what is happening in it
// right now: a settlement short of food, a hauler with stock to swap, a
// checkpoint, a relay about to finish its survey, a swarm passing through a
// Cyrite field, a terminal that speaks. One major situation at most, and a
// quiet system is often without one.
//
// A situation is a row. It names the thing that stands at its site (the
// prop), the ships that are there (actors, for the traffic and the unknown;
// none of them fires unless its temper says why), the call that opens it (a
// card, content/situationCards.ts), the one goal it asks (a line of
// objective on the HUD), and what each way it can end does: to the sortie
// (an Outcome, applied where it happens) and to the chart (ChartFx, applied
// when the journey folds the sortie in). The mechanics are sim/stage.ts (the
// sortie) and sim/situations.ts (the chart); the reasons are docs/SITUATIONS.md.
//
// Three groups for the player, whatever the factions underneath:
//   corporate   Continuance, Custody, Office, Kellern
//   frontier    Holdfasts, Drifts, the Gutter, the Dust Traders, independents
//   unknown     the Thren, the Voice, whatever the old lanes keep
//
// The alien thread has its own timetable (ARC): presence from the first
// region, interaction in the middle, understanding late. The player's
// understanding waits; the presence does not.

export type SitGroup = 'corporate' | 'frontier' | 'unknown';
/** How a situation ended: carried through, lost, turned down, or left behind unanswered. */
export type SitResult = 'won' | 'lost' | 'declined' | 'ignored';
/** What stands at the site, drawn in render/stage.ts. */
export type Prop = 'settlement' | 'relay' | 'wreck' | 'beacon' | 'checkpoint' | 'yard' | 'lane' | 'foundry' | 'seam' | 'object' | 'hole' | 'rig';

/** One kind of ship in a scene, and how it behaves while it is not fighting (see Ward in sim/enemies.ts). */
export interface ActorSpec {
  variant: string;
  n: number;
  act: WardAct;
  temper: Temper;
  /** Where it starts: at the site, out ahead of the ship on a line across its course, or beyond the Jump Gate side of the site. */
  from?: 'site' | 'ahead' | 'astern';
  /** The ring it keeps or guards (units); the default suits the act. */
  ring?: number;
  /** A multiplier on its pace. */
  pace?: number;
  /** The name the HUD and radio give it. */
  tag: string;
  /** Missions (sim/mission.ts): a real hostile that fights from the start of the goal, not a ward. */
  foe?: boolean;
  /** Missions: the ship the goal is about (the tanker, the wanted captain, the rig), a ward whose hull is `hp` times the usual. */
  target?: boolean;
  hp?: number;
  /** Missions: when this ship goes down the rest scatter and the job is done for less (`goal.scatter`). */
  scatter?: boolean;
}

/** What the sortie asks of the player once the call is taken. */
export interface Goal {
  /**
   * call, reach, follow and watch are the quiet goals. The mission goals (sim/mission.ts):
   *   destroy  clear every foe (or the one that breaks the rest)
   *   strike   cripple the target, then close in and take it
   *   defend   keep the target alive until the hold is up
   *   race     the beacons in order, ahead of a rival
   *   survey   readings at rings round a hazard, as close as you dare
   *   sneak    reach the drop without the patrols reading the hold
   *   recover  drifting cases to pick up, in any order; a crew arrives after the first
   */
  kind: 'call' | 'reach' | 'follow' | 'watch' | 'destroy' | 'strike' | 'defend' | 'race' | 'survey' | 'sneak' | 'recover';
  /** Seconds to hold inside the ring (reach, watch) or stay with the lead ship (follow). */
  hold: number;
  /** Seconds after taking it before it is missed. */
  limit: number;
  /** The objective line on the HUD. */
  line: string;
  /** What has to be handed over at the site (reach): short of it, the hold does not count. */
  give?: { supplies?: number; chits?: number; cyrite?: number };
  /** Missions: the share of the pay when the target is destroyed outright (strike), or the job is done by scattering the foes (destroy). */
  spoil?: number;
  /** Missions: how many beacons (race), and the rival's pace as a share of the ship's top speed. */
  beacons?: number;
  pace?: number;
  /** Missions: the distances of the readings, outermost first (survey); the share of the pay each earns. */
  rings?: number[];
  shares?: number[];
  /** Missions: how many cases to pick up (recover). */
  caches?: number;
}

/** What a situation does to the chart when it is over. */
export interface ChartFx {
  /** A line for the journey log and the debrief. */
  text?: string;
  /** Days the Net is held out of the neighbouring systems; or pushed on into them. */
  stallNear?: number;
  pushNear?: number;
  /** Prices around move for a while: multipliers on what the ports charge in this region, and the days it lasts. */
  market?: { supplies?: number; cyrite?: number; plate?: number; days: number };
  /** What the ship knew of the Net and the Governor is lost. */
  forget?: boolean;
  /** Another situation turns up this many jumps on. */
  follow?: { id: string; jumps: number };
  /** A journey flag (the Archive and later calls read it). */
  flag?: string | string[];
  /** Days Calloway gains (positive) or loses. */
  hunt?: number;
}

/** A line on the radio during a scene: no answer, a few seconds. */
export interface Say {
  /** When: the ship comes near the site, the scene starts, the goal is won or lost. */
  on: 'start' | 'near' | 'won' | 'lost';
  from: string;
  text: string;
}

export interface SituationDef {
  id: string;
  name: string;
  /** One line for the chart, once the system is within sight. */
  blurb: string;
  group: SitGroup;
  /** Where it can be dealt. `regions` are the eight-region chart's (the short chart maps onto them: see regionIndex). */
  kinds: SystemKind[];
  regions: [number, number];
  holders?: Holder[];
  weight: number;
  /** A system the Net holds plays this one instead (the same place, tightened). */
  tight?: string;
  /** Only ever a variant: never dealt on its own. */
  variant?: boolean;
  prop?: Prop;
  actors?: ActorSpec[];
  /** The call that opens it (a card id), the seconds into the sortie before it may, and how near the ship must be (units) for it to ring. */
  card?: string;
  at: number;
  hail: number;
  /** The choices of the card that take the goal on; every other answer ends it at once (a refusal is declined, the rest won). */
  accept?: string[];
  goal: Goal;
  /** Hostiles that come once the goal is taken on: so many seconds in, from ahead (a convoy's raiders). */
  threat?: { variant: string; n: number; after: number };
  /** Missions: more foes in waves (defend): so many seconds into the goal, from out ahead. */
  waves?: Array<{ variant: string; n: number; at: number }>;
  /** Hostiles waiting on the straight line to the Jump Gate, sprung when the ship passes this far along it, unless the situation was won (the pickets the stranger led you round). */
  trap?: { variant: string; n: number; at: number };
  /** What it does in the sortie when the goal is carried, or missed. */
  win?: Outcome;
  lose?: Outcome;
  /** When the system is left with the call never answered or the goal never taken. */
  ignore?: Outcome;
  /** What each ending does to the chart. */
  after?: Partial<Record<SitResult, ChartFx>>;
  /** Marks the scene sets when it is met at all (what the Archive and later calls read). */
  seen?: string[];
  say?: Say[];
}

const act = (variant: string, n: number, a: WardAct, temper: Temper, tag: string, o: Partial<ActorSpec> = {}): ActorSpec => ({ variant, n, act: a, temper, tag, ...o });

/** A goal that is just the call. */
const CALL: Goal = { kind: 'call', hold: 0, limit: 0, line: '' };

export const SITUATIONS: SituationDef[] = [
  // ══ frontier ═══════════════════════════════════════════════════════════
  {
    id: 'trader', name: 'A hauler with stock', blurb: 'A hauler with stock to swap.', group: 'frontier',
    kinds: ['mining', 'transit', 'port', 'contested'], regions: [0, 7], weight: 1.3, tight: 'trader_gone',
    actors: [act('freighter', 1, 'hold', 'meek', 'Hauler', { from: 'site', ring: 18 })],
    card: 'sc_trader', at: 30, hail: 340, goal: CALL,
    ignore: { text: 'The hauler idles on' },
  },
  {
    id: 'trader_gone', name: 'An empty berth', blurb: 'A hauler’s berth, empty. The dock clerk is looking over their shoulder.', group: 'frontier',
    kinds: ['mining', 'transit', 'port', 'contested'], regions: [0, 7], weight: 0, variant: true,
    prop: 'settlement', card: 'sc_trader_gone', at: 30, hail: 380, goal: CALL,
    after: { won: { flag: 'missing_hauler' } },
  },
  {
    id: 'shortage', name: 'A settlement short of supplies', blurb: 'A settlement running out of supplies.', group: 'frontier',
    kinds: ['mining', 'transit', 'port', 'contested'], regions: [0, 5], holders: ['holdfast', 'none', 'guild', 'gutter', 'frontier'], weight: 1.4, tight: 'roundup',
    prop: 'settlement', card: 'sc_shortage', at: 20, hail: 520, accept: ['bring'],
    goal: { kind: 'reach', hold: 4, limit: 200, line: 'Bring supplies to the settlement', give: { supplies: 3 } },
    win: { text: 'The settlement eats · word goes down the lanes', standing: { miners: 1, frontier: 1 }, chits: 20, stall: 3, flag: 'helped_settlement' },
    lose: { text: 'Too late · the settlement stops answering', standing: { miners: -1 } },
    ignore: { text: 'You flew on · the settlement noted it', standing: { miners: -1 } },
    after: { lost: { market: { supplies: 1.25, days: 8 }, text: 'Food runs short on the lanes round here' }, ignored: { market: { supplies: 1.15, days: 6 } } },
  },
  {
    id: 'roundup', name: 'A settlement under guard', blurb: 'A settlement the Custody has closed. People are missing.', group: 'corporate',
    kinds: ['mining', 'transit', 'port', 'contested'], regions: [0, 7], weight: 0, variant: true,
    prop: 'settlement', actors: [act('picket', 2, 'hold', 'territorial', 'Custody guard', { from: 'site', ring: 150 })],
    card: 'sc_roundup', at: 20, hail: 520, accept: ['clerk'],
    goal: { kind: 'reach', hold: 5, limit: 200, line: 'Reach the settlement’s dock', give: { chits: 30 } },
    win: { text: 'The workers are back aboard their barge · the guard looked the other way', standing: { miners: 1, frontier: 1 }, notice: { custody: 1 }, flag: 'freed_workers' },
    lose: { text: 'The guard moved first · the barge is gone', standing: { miners: -1 } },
    ignore: { text: 'The barge leaves in custody · you flew on', standing: { miners: -1 } },
    after: { won: { stallNear: 2 }, ignored: { pushNear: 1, text: 'The Net presses on' } },
  },
  {
    id: 'courier', name: 'A courier overdue', blurb: 'A courier is overdue near here.', group: 'frontier',
    kinds: ['mining', 'transit', 'contested'], regions: [0, 6], weight: 1.1,
    prop: 'beacon', actors: [act('scout', 1, 'hold', 'meek', 'Courier', { from: 'site', ring: 10 })],
    card: 'sc_courier', at: 25, hail: 600, accept: ['look'],
    goal: { kind: 'reach', hold: 4, limit: 190, line: 'Find the lost courier' },
    win: { text: 'The courier is alive · her packet is in your hold', flag: 'news', standing: { miners: 1 }, chits: 15 },
    lose: { text: 'Her beacon goes dark', standing: { miners: -1 } },
    after: { lost: { forget: true, text: 'What the courier knew is gone' }, ignored: { forget: true } },
  },
  {
    id: 'claim', name: 'A salvage dispute', blurb: 'Two crews, one wreck.', group: 'frontier',
    kinds: ['mining', 'contested', 'transit'], regions: [1, 5], weight: 1.1,
    prop: 'wreck', actors: [act('scout', 2, 'hold', 'wary', 'Gutter crew', { from: 'site', ring: 24 }), act('freighter', 1, 'hold', 'meek', 'Claim tug', { from: 'site', ring: 30 })],
    card: 'sc_claim', at: 25, hail: 420, accept: ['cut'],
    goal: { kind: 'reach', hold: 5, limit: 150, line: 'Strip the wreck' },
    win: { text: 'Supplies and Cyrite off the wreck', supplies: 3, krail: 25, score: 600 },
    lose: { text: 'The crews stripped it before you' },
    ignore: { text: 'The crews settle it with their guns' },
  },
  {
    id: 'convoy', name: 'A convoy wants an escort', blurb: 'A convoy, short of guns.', group: 'frontier',
    kinds: ['port', 'mining', 'contested', 'transit'], regions: [1, 5], weight: 1, holders: ['holdfast', 'guild', 'none', 'frontier', 'gutter'],
    actors: [act('freighter', 3, 'lead', 'meek', 'Convoy', { from: 'ahead', pace: 1 })],
    card: 'sc_convoy', at: 20, hail: 9999, accept: ['escort'],
    goal: { kind: 'follow', hold: 70, limit: 170, line: 'Stay with the convoy' },
    threat: { variant: 'raptor', n: 2, after: 25 },
    win: { text: 'The convoy made the lane', chits: 50, standing: { guild: 1, frontier: 1 } },
    lose: { text: 'You lost the convoy', standing: { guild: -1 } },
    after: { lost: { market: { supplies: 1.15, days: 8 }, text: 'Stock does not arrive · prices move' } },
  },
  {
    id: 'smugglers', name: 'A sealed crate', blurb: 'Somebody needs a crate carried quietly.', group: 'frontier',
    kinds: ['mining', 'transit', 'contested', 'port'], regions: [1, 6], weight: 1, holders: ['gutter', 'none', 'guild', 'holdfast'],
    actors: [act('scout', 1, 'hold', 'wary', 'Runner', { from: 'site', ring: 14 })],
    card: 'sc_smugglers', at: 30, hail: 360, goal: CALL,
    ignore: { text: 'The runner ends the call and moves on' },
  },
  {
    id: 'resistance', name: 'A cell that needs supplies', blurb: 'A cell that has not been counted.', group: 'frontier',
    kinds: ['mining', 'transit', 'contested'], regions: [1, 5], weight: 0.9, holders: ['holdfast', 'none', 'gutter'],
    prop: 'settlement', card: 'sc_resistance', at: 30, hail: 480, accept: ['supply'],
    goal: { kind: 'reach', hold: 4, limit: 190, line: 'Take supplies to the cell', give: { supplies: 4 } },
    win: { text: 'The cell is working · the relay in the next lane goes dark', standing: { miners: 1, frontier: 1 }, stall: 4, flag: 'supplied_cell' },
    lose: { text: 'The cell went to ground', standing: { frontier: -1 } },
    after: { won: { stallNear: 3, text: 'A resistance cell holds the Net off' } },
  },

  // ══ corporate ═══════════════════════════════════════════════════════════
  {
    id: 'inspection', name: 'A Custody inspection', blurb: 'An inspection station on the route.', group: 'corporate',
    kinds: ['port', 'mining', 'contested', 'transit'], regions: [0, 5], weight: 1.2, tight: 'lockdown',
    prop: 'checkpoint', actors: [act('picket', 2, 'hold', 'territorial', 'Custody picket', { from: 'site', ring: 120 })],
    card: 'sc_inspection', at: 20, hail: 460, goal: CALL,
    ignore: { text: 'You went round the picket' },
  },
  {
    id: 'lockdown', name: 'A lockdown', blurb: 'The Net has closed this route to anyone unlisted.', group: 'corporate',
    kinds: ['port', 'mining', 'contested', 'transit'], regions: [0, 7], weight: 0, variant: true,
    prop: 'checkpoint', actors: [act('picket', 3, 'hold', 'territorial', 'Custody picket', { from: 'site', ring: 150 })],
    card: 'sc_lockdown', at: 20, hail: 520, goal: CALL,
    ignore: { text: 'You went round the pickets' }, after: { ignored: { pushNear: 0.5 } },
  },
  {
    id: 'survey', name: 'A survey relay', blurb: 'A survey relay, close to finishing.', group: 'corporate',
    kinds: ['mining', 'transit', 'contested'], regions: [0, 5], weight: 1.1,
    prop: 'relay', actors: [act('picket', 1, 'hold', 'wary', 'Survey picket', { from: 'site', ring: 60 })],
    card: 'sc_survey', at: 25, hail: 480, accept: ['cut', 'jam'],
    goal: { kind: 'reach', hold: 8, limit: 170, line: 'Cut the survey relay', give: { supplies: 2 } },
    win: { text: 'The relay goes dark · the Net slows round here', stall: 4, notice: { custody: 1 } },
    lose: { text: 'The relay finished its survey', stall: -3 },
    ignore: { text: 'The relay finishes its survey', stall: -2 },
    after: { won: { stallNear: 3 }, lost: { pushNear: 1, text: 'The survey is complete · the Net has the route' }, ignored: { pushNear: 1 } },
  },
  {
    id: 'sweep', name: 'A Net sweep', blurb: 'Patrols out in numbers. The Net has been here.', group: 'corporate',
    kinds: ['mining', 'transit', 'contested', 'port'], regions: [0, 7], weight: 0, variant: true,
    actors: [act('picket', 3, 'orbit', 'territorial', 'Custody patrol', { from: 'ahead', ring: 130, pace: 0.8 })],
    card: 'sc_sweep', at: 25, hail: 9999, goal: CALL,
  },

  // ══ unknown: the Thren ═══════════════════════════════════════════════════
  {
    id: 'thren_pass', name: 'Something Crossed the Scope', blurb: 'An unidentified formation crossed your sensors and did not answer the hail.', group: 'unknown',
    kinds: ['mining', 'transit', 'contested', 'port'], regions: [0, 7], weight: 0.5,
    actors: [act('mote', 5, 'pass', 'wary', 'Unknown formation', { from: 'ahead', pace: 1.2 })],
    at: 50, hail: 9999, goal: CALL, seen: ['saw_thren'],
    say: [{ on: 'start', from: 'Scope', text: '“Unregistered contacts crossing our field of view. No transponder signal.”' }],
  },
  {
    id: 'thren_curious', name: 'It Is Studying You', blurb: 'One unknown contact matches your speed and keeps its distance.', group: 'unknown',
    kinds: ['mining', 'transit', 'port', 'contested'], regions: [0, 7], weight: 0.5,
    actors: [act('weaver', 1, 'orbit', 'wary', 'Unknown contact', { from: 'ahead', ring: 55, pace: 0.8 })],
    at: 45, hail: 9999, goal: CALL, seen: ['saw_thren', 'thren_curious'],
    say: [{ on: 'near', from: 'Scope', text: '“One contact matching our speed. No hail. No weapons detected.”' }],
  },
  {
    id: 'thren_swarm', name: 'A Swarm in the Cyrite', blurb: 'Unusual shapes move through the Cyrite field and react to the readings.', group: 'unknown',
    kinds: ['mining', 'contested', 'transit'], regions: [1, 7], weight: 0.5,
    actors: [act('mote', 7, 'pass', 'wary', 'Swarm', { from: 'ahead', pace: 0.7 }), act('weaver', 1, 'pass', 'wary', 'Swarm', { from: 'ahead', pace: 0.7 })],
    at: 40, hail: 9999, goal: CALL, seen: ['saw_thren', 'thren_swarm'],
    say: [{ on: 'start', from: 'Scope', text: '“Cyrite readings are spiking ahead. Something is moving through the field.”' }],
  },
  {
    id: 'thren_guard', name: 'Something Guards the Vein', blurb: 'A rich Cyrite seam is surrounded by an unknown formation.', group: 'unknown',
    kinds: ['mining', 'contested'], regions: [1, 7], weight: 0.6,
    prop: 'seam', actors: [act('mote', 4, 'hold', 'territorial', 'Thren', { from: 'site', ring: 85 }), act('weaver', 1, 'hold', 'territorial', 'Thren', { from: 'site', ring: 85 })],
    at: 30, hail: 9999, goal: CALL, seen: ['saw_thren', 'thren_territory'],
    say: [{ on: 'near', from: 'Scope', text: '“They are holding position around the seam. Every one of them is facing outward.”' }],
  },
  {
    id: 'thren_exchange', name: 'A Strange Offer', blurb: 'A Thren object holds position beside Cyrite and seems to be waiting.', group: 'unknown',
    kinds: ['mining', 'transit', 'contested'], regions: [2, 7], weight: 0.5,
    prop: 'object', actors: [act('shard', 1, 'hold', 'drawn', 'Thren object', { from: 'site', ring: 30 })],
    card: 'sc_thren_exchange', at: 30, hail: 220, accept: [], goal: CALL, seen: ['saw_thren', 'thren_trade'],
  },
  {
    id: 'thren_hurt', name: 'A Damaged Thren Object', blurb: 'A broken Thren structure drifts alone nearby.', group: 'unknown',
    kinds: ['mining', 'transit', 'contested'], regions: [2, 7], weight: 0.5,
    prop: 'object', actors: [act('mote', 1, 'hold', 'meek', 'Damaged Thren', { from: 'site', ring: 10 })],
    card: 'sc_thren_hurt', at: 30, hail: 260, goal: CALL, seen: ['saw_thren', 'thren_hurt'],
  },
  {
    id: 'thren_shadow', name: 'A navigation shadow', blurb: 'The lane charts wander here.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested'], regions: [3, 7], weight: 0.5,
    actors: [act('mote', 3, 'follow', 'wary', 'Unknown contacts', { from: 'astern', ring: 120, pace: 0.9 })],
    at: 60, hail: 9999, goal: CALL, seen: ['saw_thren', 'thren_lane'],
    say: [{ on: 'start', from: 'Navigation', text: '“the Jump Gate is drifting. It is not us. Something else is moving it.”' }],
  },
  {
    id: 'thren_watch', name: 'They line the lane', blurb: 'The Thren are lined up along a lane. They face the way you are going.', group: 'unknown',
    kinds: ['transit', 'contested', 'mining'], regions: [5, 7], weight: 0.5,
    prop: 'lane', actors: [act('mote', 6, 'hold', 'territorial', 'Thren', { from: 'site', ring: 60 }), act('shard', 1, 'hold', 'territorial', 'Thren', { from: 'site', ring: 60 })],
    at: 30, hail: 9999, goal: CALL, seen: ['saw_thren', 'thren_lane', 'thren_watch'],
    say: [{ on: 'near', from: 'Scope', text: '“It is a line. It is exactly a line. Nobody drew it.”' }],
  },

  // ══ unknown: the Voice ═══════════════════════════════════════════════════
  {
    id: 'voice_relay', name: 'The Relay Wakes', blurb: 'An old relay is transmitting, though no one should be powering it.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested', 'port'], regions: [0, 7], weight: 0.5,
    prop: 'relay', card: 'sc_voice_relay', at: 30, hail: 260, goal: CALL, seen: ['saw_voice', 'voice_heard'],
  },
  {
    id: 'voice_repair', name: 'A Request from the Relay', blurb: 'A relay requests a part for an unknown repair.', group: 'unknown',
    kinds: ['mining', 'transit', 'contested'], regions: [1, 7], weight: 0.5,
    prop: 'foundry', card: 'sc_voice_repair', at: 30, hail: 240, goal: CALL, seen: ['saw_voice', 'voice_mended'],
  },
  {
    id: 'voice_knows', name: 'It Knows Your Ship', blurb: 'A Voice system addresses the Wayward by name.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested', 'port'], regions: [2, 7], weight: 0.5,
    prop: 'relay', card: 'sc_voice_knows', at: 30, hail: 260, goal: CALL, seen: ['saw_voice', 'voice_knows'],
  },
  {
    id: 'voice_request', name: 'A Task from the Voice', blurb: 'A fabrication system asks you to retrieve something it cannot reach.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested'], regions: [3, 7], weight: 0.5,
    prop: 'relay', card: 'sc_voice_request', at: 30, hail: 260, goal: CALL, seen: ['saw_voice', 'voice_asked'],
  },
  {
    id: 'voice_guide', name: 'An Unmarked Route', blurb: 'An old relay transmits a route that does not appear on your chart.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested'], regions: [2, 7], weight: 0.5,
    actors: [act('probe', 1, 'lead', 'meek', 'Unknown ship', { from: 'ahead', pace: 1.1 })],
    card: 'sc_voice_guide', at: 25, hail: 9999, accept: ['follow'],
    goal: { kind: 'follow', hold: 45, limit: 160, line: 'Follow the unknown ship' },
    trap: { variant: 'whisper', n: 3, at: 0.62 },
    win: { text: 'It brought you round the pickets · and left without a word', standing: {}, hunt: 0.5, flag: 'voice_led' },
    lose: { text: 'You lost it in the dark' },
    seen: ['saw_voice', 'voice_guide'],
  },
  {
    id: 'voice_direct', name: 'Follow the Signal', blurb: 'A signal is leading toward an old-lane structure.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested'], regions: [6, 7], weight: 0.5,
    prop: 'foundry', card: 'sc_voice_direct', at: 30, hail: 280, goal: CALL, seen: ['saw_voice', 'voice_direct'],
  },

  // ══ unknown: the old lanes, and where the two stories meet ═══════════════
  {
    id: 'old_object', name: 'An Object off the Chart', blurb: 'An uncharted object produces readings that do not agree.', group: 'unknown',
    kinds: ['mining', 'transit', 'contested'], regions: [2, 7], weight: 0.5,
    prop: 'wreck', card: 'sc_old_object', at: 30, hail: 300, accept: ['look'],
    goal: { kind: 'watch', hold: 6, limit: 150, line: 'Look inside the wreck' },
    win: { text: 'Something inside answered the Cyrite aboard', krail: 30, score: 600, flag: 'saw_object' },
    lose: { text: 'It went quiet' },
    seen: ['saw_object'],
  },
  {
    id: 'strange_ship', name: 'A ship that follows', blurb: 'Contacts ahead, flying a course no chart has.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested'], regions: [2, 7], weight: 0.5,
    actors: [act('probe', 1, 'follow', 'wary', 'Unknown ship', { from: 'astern', ring: 160, pace: 1 })],
    at: 55, hail: 9999, goal: CALL, seen: ['saw_unknown_ship'],
    say: [{ on: 'near', from: 'Scope', text: '“It has been behind us for six minutes. It does not hide and it does not close.”' }],
  },
  {
    id: 'yard_hulk', name: 'A Thren hulk in a Custody yard', blurb: 'A Custody yard, and something on the cradle that is not a ship.', group: 'corporate',
    kinds: ['mining', 'contested', 'port'], regions: [4, 7], weight: 0.5,
    prop: 'yard', actors: [act('lancer', 1, 'hold', 'territorial', 'Custody yard guard', { from: 'site', ring: 100 }), act('shard', 1, 'hold', 'meek', 'Thren hulk', { from: 'site', ring: 8 })],
    card: 'sc_yard_hulk', at: 30, hail: 520, accept: ['cut'],
    goal: { kind: 'reach', hold: 8, limit: 180, line: 'Reach the cradle', give: { supplies: 3 } },
    win: { text: 'The hulk is loose · it went into the dark', flag: ['freed_hulk', 'saw_hulk'], notice: { custody: 3, thren: -3 } },
    lose: { text: 'The cutting crews were ready' },
    ignore: { text: 'You left the cradle as it was' },
    seen: ['saw_hulk'],
  },
  {
    id: 'foundry_both', name: 'Machines and swarm', blurb: 'A Voice foundry, and the Thren are in it.', group: 'unknown',
    kinds: ['mining', 'contested', 'transit'], regions: [6, 7], weight: 0.5,
    prop: 'foundry', actors: [act('drone', 2, 'hold', 'wary', 'Foundry', { from: 'site', ring: 40 }), act('mote', 5, 'orbit', 'wary', 'Thren', { from: 'site', ring: 50, pace: 0.5 })],
    at: 30, hail: 9999, goal: CALL, seen: ['saw_voice', 'saw_thren', 'both_seen'],
    say: [{ on: 'near', from: 'Scope', text: '“They are not fighting. The drones are letting them through the gates.”' }],
  },
  {
    id: 'lane_signal', name: 'A signal that answers', blurb: 'A pattern in the noise that changes when you listen.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested'], regions: [1, 7], weight: 0.5,
    prop: 'relay', card: 'sc_lane_signal', at: 30, hail: 280, goal: CALL, seen: ['saw_signal'],
  },
  {
    id: 'unknown_pulse', name: 'Instruments disagree', blurb: 'Every instrument disagrees for a few seconds.', group: 'unknown',
    kinds: ['transit', 'mining', 'contested', 'port'], regions: [3, 7], weight: 0.5,
    at: 70, hail: 9999, goal: CALL, seen: ['saw_pulse'],
    say: [{ on: 'start', from: 'Ship', text: '“Navigation fault. Navigation fault. Navigation restored. Cause: none recorded.”' }],
  },
];

SITUATIONS.push(...MISSIONS);

export const SITUATION_BY_ID: Record<string, SituationDef> = Object.fromEntries(SITUATIONS.map((s) => [s.id, s]));

/** The kinds of situation that are only variants, never dealt out on their own. */
export const ARC_FLAGS = ['saw_thren', 'saw_voice', 'saw_object', 'saw_unknown_ship', 'saw_hulk', 'saw_signal', 'saw_pulse'];

// ── the timetable ─────────────────────────────────────────────────────────
// Where a situation is promised. `col` is the column inside the region (0 the
// first after the way in); every system in that column plays it, so the
// player meets it whichever lane they take. The first thirty minutes are
// laid out here on purpose: the first trade, the first thing to decide for
// someone else, the checkpoint, and then the first thing that is not human.
// The alien thread runs through every region: presence from the first,
// interaction in the middle, understanding late.
export interface ArcRow { region: number; col: number; id: string }
export const ARC: ArcRow[] = [
  // the Reach: why are they still following me · what was that signal. The first columns carry nothing: the escape, the first
  // refit and the first port come first. Then, by the pilot's clock (about 2.5 minutes a system), the first human optional
  // situation at 15 to 20 minutes, a checkpoint at 20 to 25, and the first alien moment at 25 to 30.
  { region: 0, col: 4, id: 'trader' },
  { region: 0, col: 5, id: 'shortage' },
  { region: 0, col: 6, id: 'inspection' },
  { region: 0, col: 7, id: 'thren_pass' },
  { region: 0, col: 8, id: 'voice_relay' },
  // the Marches: who survived · why Thren near the routes
  { region: 1, col: 0, id: 'thren_curious' },
  { region: 1, col: 1, id: 'thren_swarm' },
  { region: 1, col: 3, id: 'voice_repair' },
  { region: 1, col: 5, id: 'thren_guard' },
  // the Salvage Belt: what was abandoned · why wrecks do not behave
  { region: 2, col: 2, id: 'old_object' },
  { region: 2, col: 5, id: 'strange_ship' },
  { region: 2, col: 7, id: 'thren_hurt' },
  // the Drift Deep: who knows the old routes · who has been travelling them
  { region: 3, col: 2, id: 'thren_shadow' },
  { region: 3, col: 5, id: 'voice_knows' },
  { region: 3, col: 7, id: 'lane_signal' },
  // the Breaker Yards: what was hidden · what technology was taken apart
  { region: 4, col: 2, id: 'yard_hulk' },
  { region: 4, col: 5, id: 'voice_request' },
  // the Free Ports: who to trust · who else knows
  { region: 5, col: 2, id: 'thren_exchange' },
  { region: 5, col: 5, id: 'voice_guide' },
  // the Hollows: what do they already know · what are the Thren doing
  { region: 6, col: 2, id: 'foundry_both' },
  { region: 6, col: 5, id: 'thren_watch' },
  // the Last Lanes: what to do with the truth · what the lanes connect to
  { region: 7, col: 3, id: 'voice_direct' },
  { region: 7, col: 8, id: 'unknown_pulse' },
];

/** The chance a system with no promised situation has one, by kind; a quiet one has far fewer. */
export const SIT_CHANCE: Partial<Record<SystemKind, number>> = { mining: 0.3, transit: 0.25, port: 0.2, contested: 0.35 };
export const SIT_CHANCE_QUIET = 0.05;
/** Columns at the start of the first region with nothing rolled in them: the escape, the first refit and the first port. */
export const EARLY_QUIET = 4;
/**
 * Columns of each region (eight regions) where every system carries a job: about two in three (four in the first region, which opens
 * quiet). A job rings on arrival, so this is how often a player is offered one. The roll adds more on top.
 */
export const JOB_COLS = [4, 6, 6, 6, 6, 6, 6, 8];
/** A netted system with none gets a sweep this often. */
export const SWEEP_CHANCE = 0.45;

// ── the questions ─────────────────────────────────────────────────────────
// Every region asks two things, one human and one not. The player-facing
// themes: short, and not answered by a block of text.
export const QUESTIONS: Array<{ human: string; unknown: string }> = [
  { human: 'Why is the Continuance still following me?', unknown: 'What was that strange signal?' },
  { human: 'Who survived out here?', unknown: 'Why are the Thren near the routes?' },
  { human: 'What was left behind?', unknown: 'Why do some wrecks not behave?' },
  { human: 'Who knows the old routes?', unknown: 'Who has been travelling them?' },
  { human: 'What was the Continuance hiding?', unknown: 'What were they taking apart?' },
  { human: 'Who can I trust?', unknown: 'Who else knows about the old lanes?' },
  { human: 'What does the Continuance already know?', unknown: 'What are the Thren really doing?' },
  { human: 'What do I do with the truth?', unknown: 'What are the lanes connected to?' },
];

// Why the player is going on, one line a region, for the chart's goal: a reminder of the quest.
// Each answers the region's human question above, in the same order.
export const WHYS: string[] = [
  'The Continuance wants the Wayward back. Reach the Narrows before the Net closes the road.',
  'You carry the Archive. Cross the Marches and learn who survived out here.',
  'Old wrecks keep old secrets. Find what was left behind, and keep the Archive safe.',
  'The Drift remembers the old routes. Find who still knows them.',
  'The Continuance took ships apart here to hide something. Get through with the Archive.',
  'Everyone trades here and nobody asks. Find someone you can trust with the truth.',
  'Nothing human lives here. Learn what the Continuance already knows, and stay ahead of it.',
  'One gate left. Carry the truth out before Calloway takes it back.',
];

// ── the observations ──────────────────────────────────────────────────────
// What the Archive keeps of the unknown: what you saw, and what people say
// about it. Theories contradict each other on purpose.
export interface Observation { flag: string; name: string; line: string; theory: string }
export const OBSERVATIONS: Observation[] = [
  { flag: 'saw_thren', name: 'The formation', line: 'Unregistered contacts crossed the scope without a word.', theory: 'Pirates, say the Gutter. Survey drones, say the Offices. Neither of them looked up.' },
  { flag: 'thren_curious', name: 'The watcher', line: 'One contact matched your speed, studied the Wayward and left.', theory: 'Nobody has seen a Thren do that to a ship that was not carrying Cyrite.' },
  { flag: 'thren_swarm', name: 'The feeding', line: 'A swarm moved through a Cyrite field and ignored everything in it.', theory: 'Miners say they eat it. The Warden says they count it.' },
  { flag: 'thren_territory', name: 'The ring', line: 'They hold a seam and face outward, every one of them.', theory: 'A territory? A nest? A guard set by something that is not there?' },
  { flag: 'thren_trade', name: 'The exchange', line: 'A Thren object gave something back for Cyrite.', theory: 'An exchange. Or a test. Or a child learning what is edible.' },
  { flag: 'thren_hurt', name: 'The wounded', line: 'A Thren object, broken and adrift.', theory: 'They are not invulnerable. Somebody has been breaking them for a long time.' },
  { flag: 'thren_lane', name: 'The shadow', line: 'the Jump Gate drifted while something steered it.', theory: 'The old lanes were never ours. We borrowed them.' },
  { flag: 'thren_watch', name: 'The line', line: 'The Thren, in a straight line, facing the way you were going.', theory: 'A border. A welcome. A warning.' },
  { flag: 'saw_voice', name: 'The relay', line: 'A relay that should be dead answered, and used the Wayward’s name.', theory: 'A fault in the old network, say the Dust Traders. A person, say the Drift.' },
  { flag: 'voice_mended', name: 'The mending', line: 'A factory hull repaired the Wayward and asked for nothing.', theory: 'It was practising on you. Or it was being kind. The Voice does not say.' },
  { flag: 'voice_knows', name: 'The knowing', line: 'The Voice told you something nobody but the Governor should know.', theory: 'It listens to every channel. It always has.' },
  { flag: 'voice_asked', name: 'The request', line: 'The Voice asked you to carry something.', theory: 'Why would a machine need a courier?' },
  { flag: 'voice_guide', name: 'The guide', line: 'An unknown ship led you past a trap and left.', theory: 'The same hand that built the breakers. The same hand that kept the keys.' },
  { flag: 'voice_direct', name: 'The voice', line: 'Every terminal in a system spoke to you at once.', theory: 'One mind, or many agreeing. The Voice calls itself “we” and means it.' },
  { flag: 'saw_object', name: 'The object', line: 'Something in a wreck that no yard built.', theory: 'Salvors left it alone. They say it left the wreck on purpose.' },
  { flag: 'saw_unknown_ship', name: 'The follower', line: 'A ship behind you for six minutes that never closed.', theory: 'It was learning how a human ship flies.' },
  { flag: 'saw_hulk', name: 'The hulk', line: 'The Continuance was cutting up a Thren hulk.', theory: 'Not a ship at all, say the yard crews. A lane breaker, says the Voice.' },
  { flag: 'both_seen', name: 'The foundry', line: 'The Voice’s machines let the Thren through their gates.', theory: 'They are not enemies. Perhaps they never were.' },
  { flag: 'saw_signal', name: 'The signal', line: 'A pattern in the noise that changed when you listened.', theory: 'Cyrite sings, the old miners say, if you carry enough of it.' },
  { flag: 'saw_pulse', name: 'The pulse', line: 'Every instrument disagreed for a few seconds.', theory: 'The lane breakers are still working, somewhere.' },
];
