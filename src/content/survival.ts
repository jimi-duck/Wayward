import type { Mods } from '../sim/director';
import type { Role } from '../sim/enemies';

// ── survival modes ────────────────────────────────────────────────────────
// How the whole game plays, chosen on the title before a run: one row here,
// read by the systems that care. Nothing else in the code asks which mode it
// is; it asks this row for a number. To rebalance a mode, change its row.
//
//   Drifter    · calmer skies, a kinder economy. Explore and follow the story.
//   Prospector · the game as designed, and the baseline the other two are read
//                against. Its numbers are 1 or what the code had before modes,
//                bar the arcade sky, set above 1 once the bay cost 30 Krail.
//   Raider     · mining is thin and loud, wrecks are rich and last. You live
//                off what the fighting leaves: find a fight, outlast it,
//                strip what it left, sell what you cannot use.
//
// A multiplier of 1 changes nothing. The groups say where each row bites:
//   sky      · the arcade's encounters (how many, how tough, how hard they fire) and its Krail income (sim/director.ts)
//   pursuit  · the Story's hunters: how far apart they come, how many at once, how many elites
//   heat     · the Story's heat (how hard the Custody looks): its climb, what a kill and a mined rock add
//   rock     · what rock gives (sim/world.ts: mined with the lasers, blasted or broken)
//   salvage  · what a dead hull gives, and for how long it lies there
//   events   · which sector events come, and how often (sim/encounters.ts)
//   ship     · how much the hull can take (sim/world.ts)
//   voyage   · the Story's journey: fuel, food, wear, wrecks, the port, the Net, breathers
// The Story's numbers for Prospector equal the code's old constants, so a test
// pinned to them stays true (tests/survival.test.ts keeps it so). The arcade
// sky is Prospector's one row above 1; Drifter and Raider keep their distance
// from it (their rows were scaled by the same factors).

export type SurvivalId = 'drifter' | 'prospector' | 'raider';
export const SURVIVAL_IDS: readonly SurvivalId[] = ['drifter', 'prospector', 'raider'];
export const DEFAULT_SURVIVAL: SurvivalId = 'prospector';
/** The Arcade has no difficulty to pick: it always plays on this row, whatever the profile chose for the Story. */
export const ARCADE_SURVIVAL: SurvivalId = 'prospector';

/** What a wreck of one kind of hull leaves in the Story, per point of the hull's worth: parts, Cyrite, ore. Krail is the same for all (`salvage.krail`). */
export interface Cargo { parts: number; cyrite: number; ore: number }

/** The sector events, by id (sim/encounters.ts), and the weight each has in the draw. */
export type EventWeights = Record<'rich_field' | 'distress' | 'convoy' | 'ion_storm' | 'nebula' | 'derelict' | 'anomaly' | 'skirmish', number>;

export interface Survival {
  id: SurvivalId;
  /** The name on the title, a line under it, and what it means in two. English; the UI puts them through t(). */
  name: string;
  tag: string;
  text: string;
  /** The strip under the description: how much sky (red), mining and wrecks (amber) each mode has, 1 to 3. */
  scale: { sky: number; mining: number; wrecks: number };
  /** Score multiplier. */
  score: number;
  /** Hulls: how many arrive, how tough, how often they fire, how many elites and squads, how hazardous the rock. */
  sky: Mods;
  pursuit: {
    /** Multiplier on the gap between pursuers (more than 1 is rarer) and on how many fly at once. */
    gap: number;
    cap: number;
    /** Multiplier on the chance a pursuer is an elite. */
    elite: number;
  };
  heat: {
    /** Multipliers on the heat's climb, on what a kill adds, and on what mining a rock adds. */
    rate: number;
    kill: number;
    mine: number;
  };
  rock: {
    /** Krail, ore and Cyrite a rock gives, and the share of veined rock in a system. */
    krail: number;
    ore: number;
    cyrite: number;
    veins: number;
  };
  salvage: {
    /** Krail a dead hull gives, against the baseline's. */
    krail: number;
    /** The Story: what a wreck holds besides Krail, by the kind of hull. */
    cargo: Record<Role, Cargo>;
    /** How long its loot lies before it fades, against the usual eleven seconds. */
    life: number;
    /** The arcade: the chance a kill leaves a hull repair. */
    repair: number;
    /** Capital ships' Krail, Cyrite and parts. */
    capital: number;
    /** How far out the tractor reaches. */
    reach: number;
  };
  events: {
    weights: EventWeights;
    /** Multiplier on the gap between sector events. */
    gap: number;
  };
  ship: {
    /** Plates added to the hull. */
    plates: number;
    /** Multipliers on how long a shield takes to recharge and on the grace after a hit. */
    recharge: number;
    grace: number;
  };
  voyage: {
    /** Multiplier on the Cyrite a lane costs. */
    jump: number;
    /** What the Wayward starts a journey with, and the supplies the drive wears through a jump (on top of the lane's days). */
    start: { cyrite: number; supplies: number };
    wear: number;
    /** Wrecks in one region that end it (the last is a total loss: the region is flown again from its gate), and the share of Cyrite, supplies and chits it keeps when it is adrift. */
    wrecks: number;
    kept: number;
    /** Multiplier on what scrap pays when it is picked up. */
    ore: number;
    /** The Net's spread, and the share of breathers (quiet systems) the chart lays. */
    net: number;
    breathers: number;
  };
}

const NO_CARGO: Cargo = { parts: 0.5, cyrite: 0, ore: 0 };

export const SURVIVAL: Record<SurvivalId, Survival> = {
  drifter: {
    id: 'drifter',
    name: 'Drifter',
    tag: 'Calmer skies.',
    text: 'Fewer threats, a kinder economy. Explore, and follow the story at your own pace.',
    scale: { sky: 1, mining: 3, wrecks: 2 },
    score: 0.8,
    sky: { traffic: 1.2, toughness: 1.45, fire: 1.7, elites: 0.95, hazard: 0.75, income: 0.9 },
    pursuit: { gap: 1.5, cap: 0.67, elite: 0.5 },
    heat: { rate: 0.8, kill: 1, mine: 1 },
    rock: { krail: 1.25, ore: 1.2, cyrite: 1.3, veins: 1.15 },
    salvage: {
      krail: 1,
      cargo: { interceptor: { parts: 0.7, cyrite: 0, ore: 0 }, cruiser: { parts: 0.7, cyrite: 0, ore: 0 }, special: { parts: 0.7, cyrite: 0, ore: 0 } },
      life: 1.3, repair: 1.5, capital: 1, reach: 1.15,
    },
    events: { weights: { rich_field: 1.5, distress: 1.3, convoy: 0.6, ion_storm: 0.5, nebula: 0.6, derelict: 1, anomaly: 0.5, skirmish: 0 }, gap: 1.25 },
    ship: { plates: 1, recharge: 0.75, grace: 1.3 },
    voyage: { jump: 0.8, start: { cyrite: 10, supplies: 11 }, wear: 1, wrecks: 4, kept: 0.75, ore: 1, net: 0.85, breathers: 1.5 },
  },
  prospector: {
    id: 'prospector',
    name: 'Prospector',
    tag: 'The way the game was meant to be played.',
    text: 'Mine rock. Manage Cyrite. Trade, run or fight.',
    scale: { sky: 2, mining: 2, wrecks: 2 },
    score: 1,
    sky: { traffic: 1.7, toughness: 1.7, fire: 1.35, elites: 1.9, hazard: 1.5, income: 0.75 },
    pursuit: { gap: 1, cap: 1, elite: 1 },
    heat: { rate: 1, kill: 1, mine: 1 },
    rock: { krail: 1, ore: 1, cyrite: 1, veins: 1 },
    salvage: {
      krail: 1,
      cargo: { interceptor: NO_CARGO, cruiser: NO_CARGO, special: NO_CARGO },
      life: 1, repair: 1, capital: 1, reach: 1,
    },
    events: { weights: { rich_field: 1, distress: 1, convoy: 1, ion_storm: 1, nebula: 1, derelict: 1, anomaly: 1, skirmish: 0 }, gap: 1 },
    ship: { plates: 0, recharge: 1, grace: 1 },
    voyage: { jump: 1, start: { cyrite: 6, supplies: 8 }, wear: 2, wrecks: 3, kept: 0.5, ore: 1, net: 1, breathers: 1 },
  },
  raider: {
    id: 'raider',
    name: 'Raider',
    tag: 'Take it from the dead.',
    text: 'Mining is scarce and loud, wrecks are plentiful. Survive on what others leave behind.',
    scale: { sky: 3, mining: 1, wrecks: 3 },
    score: 1.25,
    sky: { traffic: 2.1, toughness: 1.9, fire: 1.2, elites: 2.65, hazard: 1.95, income: 0.75 },
    pursuit: { gap: 0.8, cap: 1.34, elite: 1.4 },
    heat: { rate: 1.1, kill: 0.6, mine: 2 },
    rock: { krail: 0.4, ore: 0.5, cyrite: 0.45, veins: 0.6 },
    salvage: {
      krail: 2,
      cargo: {
        // a fighter's tanks are nearly dry; a cruiser carries cells; a hauler is a cargo hold
        interceptor: { parts: 0.6, cyrite: 0.25, ore: 0 },
        cruiser: { parts: 0.9, cyrite: 0.8, ore: 0.3 },
        special: { parts: 0.5, cyrite: 0.6, ore: 2 },
      },
      life: 2.2, repair: 2, capital: 1.5, reach: 1.3,
    },
    events: { weights: { rich_field: 0.4, distress: 0.8, convoy: 1.8, ion_storm: 1, nebula: 1, derelict: 1.5, anomaly: 1, skirmish: 2.2 }, gap: 0.8 },
    ship: { plates: 0, recharge: 1, grace: 1 },
    voyage: { jump: 1, start: { cyrite: 6, supplies: 8 }, wear: 2, wrecks: 3, kept: 0.5, ore: 1.6, net: 1, breathers: 0.5 },
  },
};

/** A saved or typed id, as a mode: anything unknown is the baseline. */
export const survivalOf = (id: unknown): Survival => (typeof id === 'string' && Object.hasOwn(SURVIVAL, id) ? SURVIVAL[id as SurvivalId] : SURVIVAL[DEFAULT_SURVIVAL]);

/** The three modes, in the order the title shows them. */
export const SURVIVALS: readonly Survival[] = SURVIVAL_IDS.map((id) => SURVIVAL[id]);
