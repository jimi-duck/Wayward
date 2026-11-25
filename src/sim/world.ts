import { DEFAULT_SURVIVAL, SURVIVAL, type Survival, type SurvivalId } from '../content/survival';
import type { Hull } from '../content/hulls';
import type { InputFrame } from '../input/types';
import {
  arcTargets, burnAt, chainMines, CHAIN_CLOUD, GRAVITY_PULL, laySystems, newSystems, plasmaRing, stepBurns, stepMines,
  type Mine, type Reachable, type Systems,
} from './arsenal';
import { Command, JUMP_KRAIL, JUMP_SCORE, bossBounty, type Boss, type Strike, type Telegraph } from './bosses';
import { CAPTAIN_BY_ID, captainCard, captainShips, form, turnsAway, type Report } from './captains';
import { OFFER_AT } from '../content/calloway';
import { CHATTER, type Moment } from '../content/chatter';
import { Desk, DESK, HUSH, type Busy } from './desk';
import { Floor, FLOOR, SCAN_LINE } from './floor';
import { HUNTED_RATE, SPLIT_MASTS, ADRIFT_A, ADRIFT_B, ADRIFT_LOOP, ADRIFT_OUT, ADRIFT_TELL, BURIED_HP, BURIED_R, GIVEN_FLAG, GIVEN_R, GUARD_HOLD, GUARD_WAKE, GUARDS, LANE_LINES, stepUplink, uplinkWave, UPLINK_R } from './uplink';
import { COVER, COVER_DMG, COVER_EVERY, COVER_R, HUNT_PULL, HUNT_SIT, PULSE_CROWD, PULSE_PUSH, PULSE_R, PULSE_SNARE, waveTier, type CoverRow } from '../content/waves';
import { Script, type Output } from './script';
import { derive, SIG_CLUES, relaysLit, relayFlag } from './evidence';
import { GATES, ON_ROAD, REACH_RELAYS } from '../content/road';
import { debtLeft } from './threads';
import { GHOST_AFTER, GHOST_STOP, spawnGhost, stepGhost, type Ghost } from './ghost';
import { DAY_SECONDS, halfDays } from './hunt';
import { SCRIPT } from '../content/script';

const SCRIPT_BY_ID = new Map(SCRIPT.map((r) => [r.id, r]));
/** Seconds the drive waits at the gate for the story to finish a line (World.listening). */
const LISTEN = 12;
/** ...and for a main beat's line still to be said. */
const LISTEN_MAIN = 40;
/** Seconds into a line before it counts as heard (World.rowHeard). */
const HEARD = 2;
import { GATHERING } from '../content/script/threshold';
import { CERRO_BEATS, OPENING_AT, SAM_BEAT, STORY_AT, WAKE_BEAT } from '../content/story';
import { ledgerFor, type LedgerRow } from './contract';
import { APPROACH, JUMP_T, BLOCKADE_AT, BLOCKADE_HP, CAPITAL_CYRITE, CAPITAL_KRAIL, CAPITAL_SUPPLIES, ROCK_KRAIL, WRECK_KRAIL, DOCK_COOL, DOCK_TIME, HEAT_CLOCK, HEAT_MINE, MINE_WORK, rockTake, TORP_YIELD, HEAT_KILL, HEAT_KILL_CUSTODY, HEAT_RATE, QUIET_COOL, JUMP_COST, PATCH_COST, PATCH_QUIET, PATCH_TIME, SPOOL, SPOOL_RUN, SPOOL_KNOCK, JAM_SPOOL, SWARM_WEAVER, SWARM_DRAWN, THREN_JAM, swarmGap, swarmSize, type Waypoint, TANK_MAX, newBreakout, pickPursuer, pursuitCap, CHASE_LANE, CHASE_FIRST, chaseCap, chaseGap, chaseHull, chaseLabel, pursuitElite, pursuitInterval, rockYield, DOCK_SPEED, YARD_CLEAR, relayOf, relayKey, laneBack, RELAY_MARK_R, SAFE_R, SAFE_HOLD, HOLD_MAX, holdMax, ROLL_SECRET, SUPPLIES_MAX, LOW_SUPPLIES, EMPTY_STORES, HOME, places, type Breakout, type Carry, type Mode, type SortieDef, type SortieResult } from './breakout';
import {
  CARD_BY_ID, COMMS_FIRST, PORT_CALL, RADIO_GAP, SLOW, amount, condOk, openCard, pickCard, refresh, resolve, theirStrength, weightOf, yourStrength, type CardDef, type Ctx, type JobDef, type Open,
  type Outcome, type Standing,
} from './comms';
import { computeStats, identity, type Levels } from './build';
import { flightControls, type FlightControls } from './controls';
import { ARCADE_EDGE, STORY_EDGE, EVENT_FIRST, eventGap, NO_MODS, pressure, threatened, type Mods, type Pressure } from './director';
import { Stage, makeStage } from './stage';
import { DEPOT_LINE, lockLifted, painted, paintDue, PAINT_LINE, YARD_ZAP, YARD_REBOOT, YARD_OUT_AT, YARD_AUTO_END, YARD_DARK, YARD_BOOT, YARD_REPAINT_AT, YARD_TITLE_AT, PAINTED, RENAMED, PAINTER, STOLEN, STOLEN_NOTICE, STOLEN_SAM, STOLEN_SAM_POOR, SAM_RELAY, NED_DONE, NED_DONE_AT, NED_PARTITION, NED_PARTITION_AT, PARTITION } from './postjump';
import { HOLD_R, RECOVERY_CONTROLS, RECOVERY_T, SAM_CALL_R, recovering, recoveryStep } from './recovery';
import { Traffic, trafficPlan } from './traffic';
import { Cordon, HEARING_IN, HEARING_LAUNCH } from './cordon';
import { Gathering } from './gathering';
import { Speak, SPEAK_FAILED, SPEAK_FLAG, SPOKEN } from './speak';
import { BUSY_R, CRANE_KEEP, CRANE_PULL, CRANE_R, FLAK_DAMAGE, FLAK_EVERY, FLAK_EVERY_ALERT, FLAK_R, SiteBrain, type Mood } from './site';
import { LOOSE } from './pickups';
import { Barge, bargeBerth } from './barge';
import { Gantry, gantryBerth } from './gantry';
import { ThrenSeed, seedBerth, seedLine, SEED_CYRITE, SEED_PARTS } from './thrseed';
import { livingOf } from './living';
import { GATE_OPEN, NOTE, PATIENCE, PATIENCE_AT, PATIENCE_CARD, REBOOT, REBOOTING, type NarrowsState } from './narrows';
import { BUMP_QUIET, BUMP_SPEED, solidsOf } from './solids';
import { Den, denBerth, DEN_BOUNTY, DEN_CYRITE, DEN_HP, DEN_PARTS, DEN_R } from './den';
import { Market, marketBerth } from './market';
import { calmWeights, live, pickEncounter, startEncounter, stepEncounter, wakeEncounter, wellPull, type Encounter, type EncounterHost, type EncounterId } from './encounters';
import { FEATURES, metFlag } from '../content/features';
import {
  ALIEN_FIRST, ARCADE_OPENING, ALIEN_TYPES, BEAM_LEN, BEAM_W, BORG_ADAPT, CULL, ELITE_BLAST_DAMAGE, ELITES, FACTION_TRAITS, SPAWN_FAR, SPAWN_NEAR, SQUADS, VARIANTS,
  WEB_R, alienBonus, alienFire, alienLabel, beamLive, cloaked, leave, moveAlien, moveShots, pickElite, pickVariant, provoke, rayDist,
  spawnAlien, stepBeam, stepWebs, type Alien, type Arena, type EliteId, type Faction, type Shot, type Web,
} from './enemies';
import type { BlastKind, GameEvent, PowerKind } from './events';
import { CHITS_PER_CYRITE, cy, fluidPrice, refine, tankFor } from './purse';
import { bonded, bondedPrice } from './charter';
import { newTutor, settleAtBay, skipTutor, stepOf, stepTutor, LESSON_NODE, type Tutor } from './tutor';
import { Field, ROCK_KINDS, VOLATILE_BLAST, VOLATILE_DAMAGE, type Bulwark, type Rock } from './field';
import { Ids, newId, useIds } from './ids';
import { CELL, dropCrystals, dropItem, POWERS, POWER_STOCK, POWER_STOCK_MAX, POWER_TIME, STOCKED, stepPickups, YIELD_BLAST, YIELD_DAMAGE, type CellSource, type Pickup, type PickupKind } from './pickups';
import { Rng } from './rng';
import { laySortie, type Laid } from './sites';
import { claimPatience, coverRate, easeSky, stealthOf } from './rules';
import { t as tr } from '../i18n';
import { CALM, reports, weightAt, Space, type Influence, type Report as Condition } from './space';
import { newRun, TIMELINE, type RunStats, type ScoreSource, type Weapon } from './run';
import { drifting, newShip, stepShip, topSpeed, type ShipState } from './ship';
import { BASE, flightHull, type Stats } from './stats';
import {
  BREACH_GRACE, CHAIN_WINDOW, DYING, PX, BOOST_FIRST, BOOST_CHANCE, ARCADE_BOUNTY, ARCADE_ROCK, BOOST_GAP, REPAIR_CHANCE,
  REPAIR_CHANCE_ELITE, REPAIR_GAP, BULWARK_POINTS, MINE_HP, MINE_KRAIL, ROCK_BUMP, ROCK_POINTS, ROCK_PUSH, SCORE_PER_CRYSTAL, SCORE_PER_SECOND, SHIELD_GRACE, SHIP_R, TORP_FUSE, chainMult, CHAIN, DEFLECT, SURGE, WELL,
} from './tuning';
import { SCRAP_PRICE, type Prices } from '../content/systems';
import { ARCADE_PRICE } from '../content/web';
import { blockOf, install as bayInstall, quickPicks, stockLevels, type BayCtx, type Block } from './bay';
import { feelBudgets, overRatings, weightFuel } from './budgets';
import { PressureWatch } from './pressure';
import { JumpWatch } from './jumpready';
import { arrival, newPace, PACING, patrolStart, pickApproach, waveSize, type Approach, type Pace } from './pacing';
import { planStop, type Stop } from './stop';
import { reasonOf, type Advice } from './advice';
import { voiceId, voiceText } from './voice';
import { hurtMend, newMend, SELF_REPAIR, stepMend, type Mend } from './repair';
import { discounted, effects, type Effects } from './modules';
import { Pack } from './tactics';
import { scarsOf, type Scars } from './scars';
import { ALONGSIDE, alongside, handed, STATION, livePlace, meets, placeAt, placeDone, PLACE_CLEAR, stepHanded, stepMeet, stepPlace, stopPlaces, ESCORT_STAY, stepLeave, type Mover, type PlaceLook, type StoryPlaceDef } from './places';
import { STORY_PLACES } from '../content/script/places';
import {
  acquire, fireWeapons, launchTorpedo, moveBolts, moveTorpedoes, newArms, type Arms, type Bolt, type FireMods, type Targets, type Torpedo,
} from './weapons';

// The simulation's root. It never touches Three.js, so it can run headless.
// Conventions: the ship flies on the XZ plane (y = 0), heading 0 faces +X and
// PI/2 faces -Z ("up" on screen), headings are never wrapped. Enemies, their
// fire and the player's fire move in 3D; rock and bulwarks sit on the plane.
//
// A run is a loop: fly, fight, collect krail, refit in the bay, face harder
// sky, meet capital ships, and in the end lose the hull. The world pauses
// itself at the decisions a run asks for, a hail ('hail': engage or evade), a comms card
// in the Breakout ('comms': the card in `comms`; an ambush slows the world
// instead of stopping it), a dock ('dock'), the refit bay ('bay': the Story
// mode's player opens it, the arcade's opens by itself once a price of Krail
// is aboard; sim/bay.ts says what can be fitted), and at the end ('over': the
// record in `run`). The app answers with answerHail(), answer(), the port's calls, install() and closeBay(), and
// restart(); the scripted pilot calls the same.

export type Phase = 'play' | 'hail' | 'comms' | 'dock' | 'bay' | 'over';
/** What the port sells. */
export type PortItem = 'plate' | 'supplies' | 'fuel';

export interface WorldOptions {
  /** Upgrade, event and modifier ids opened by long-term progression. */
  unlocked?: Iterable<string>;
  /** The survival mode (content/survival.ts); a sortie's own (SortieDef.survival) when not given, else the baseline. */
  survival?: SurvivalId;
  /** The Breakout (a destination, a pursuit, the cutter and the hold) or the endless arcade run. Arcade unless asked. */
  mode?: Mode;
  /** The system to fly, in the Breakout mode (Cerro unless given), and what the ship brings into it from the last. */
  sortie?: SortieDef;
  carry?: Carry | null;
  /** The shared world's expanses and features (sim/space.ts): off until stage 3 of docs/ENVIRONMENT.md turns it on. */
  space?: boolean;
  /** The review world (docs/REVIEW.md): a ship that cannot be hurt, in a gallery that holds still. src/review/ lays the exhibits. */
  review?: boolean;
}

/** What the review world adds to a World: capital ships on show (the command only ever holds the one in the fight), and the places' gate and depot. */
export interface ReviewState {
  bosses: Boss[];
  bk: Breakout | null;
}

/** Ten rolls pay out; a roll counts if the last was no more than this many seconds ago (a roll takes 0.45 s, its cooldown is 1). */
export const ROLL_CHAIN = 10;
export const ROLL_CHAIN_GAP = 2.5;
export const ROLL_CHAIN_PAY = 999999;
const IDLE: FlightControls = { turn: 0, thrust: 0, roll: false, brk: false, rollDir: 0, fire: false, torpedo: false };
const BOSS_PLATES = 1;
/** The first dead gate is named once she comes within this range (units), and the flag that says she has. */
const DEAD_GATE_SEEN_R = 260;
const DEAD_GATE_SEEN = 'dead_gate_seen';
/** Seconds the HUD says a hit knocked the drive back. */
const SPOOL_KNOCK_SHOW = 2.5;

/** The ship's alert (World.alert): clear, yellow (observed) or red (targeted). */
export type Alert = 'clear' | 'yellow' | 'red';
/** A hostile hull this close (units) puts the ship on yellow alert: a little outside its guns' reach (FIRE_RANGE 70), well inside where hulls arrive. */
const WATCH_RANGE = 85;
/** Seconds between two "docking denied" calls while the ship waits at a port in a fight. */
const DENIED_EVERY = 6;
/** The depot shield: a fight this close to the depot (units) raises it, it holds this long after the fight (s), and the card shows while the ship is this far outside it (units). */
const SHIELD_FIGHT_R = 150;
const SHIELD_HOLD = 2.5;
const SHIELD_NEAR = 25;

/** The arcade's bay opens by itself after this long with the alert clear and a price of Krail aboard. */
export const BAY_QUIET = 2;

/** Seconds into a sortie before the system's place shows itself. */
export const PLACE_AT = 30;

/** Seconds a road gate holds a stop's main beats once the player is near it (the Narrows rule, #384, for every stop): the HUD counts it down, so the wait always has an end (owner, 14 November 2026). */
const GATE_HOLD = 90;
/** Seconds from her coming near a gate that waits on a call only waiting its turn, before it says it is holding (the HUD gate line says so all along). */
const CALL_QUIET = 20;
/** Units from the gate at which a hold is told and its clock starts: she is waiting at the gate, not only in the ring. */
const HOLD_NEAR = 900; // or 0.6 of a short lane, so the hold's clock never runs from the arrival
/** Seconds after arriving on the road that the scan is said. */
const SCAN_AT = 0.8;
/** The Slow Door takes this long to open after arrival (content/script/arrivals.ts). */
const SLOW_DOOR = 180;

export class World implements EncounterHost {
  readonly rng: Rng;
  readonly ids = new Ids();
  readonly seed: number;
  ship: ShipState = newShip();
  /** The ship one step ago, for interpolation. */
  prev: ShipState = newShip();
  /** What the player has made of the ship, and the numbers that follow from it. */
  levels: Levels = {};
  stats: Stats;
  hull: Hull;
  plates: number;
  /** The shield meter, in charges (fractional while it fills), and seconds until it starts filling. */
  shields = 0;
  shieldT = 0;
  arms: Arms;
  field: Field;
  bolts: Bolt[] = [];
  torps: Torpedo[] = [];
  aliens: Alien[] = [];
  shots: Shot[] = [];
  webs: Web[] = [];
  /** The pack's plays: light hulls that attack together (sim/tactics.ts). */
  pack = new Pack();
  pickups: Pickup[] = [];
  sys: Systems = newSystems();
  tele: Telegraph[] = [];
  strikes: Strike[] = [];
  readonly command = new Command();
  encounter: Encounter | null = null;
  /** A place asleep in the sky while a chance event runs in front of it. */
  private parked: Encounter | null = null;
  /** The system's situation, played on the sector (sim/stage.ts). */
  stage: Stage | null = null;
  /** A cordon across the lane, for a silent run (sim/cordon.ts). */
  cordon: Cordon | null = null;
  /** A Thren knot she is answering, at Stillwater (sim/speak.ts). */
  knot: Speak | null = null;
  /** Everyone she helped, come to the Threshold (sim/gathering.ts). */
  gathering: Gathering | null = null;
  /** The first system past Cerro's working traffic and the guards its dock sends (sim/traffic.ts). */
  traffic: Traffic | null = null;
  /** The mining system's refinery barge (sim/barge.ts), if it has one. */
  barge: Barge | null = null;
  /** A transit system's repair gantry (sim/gantry.ts), if it has one. */
  gantry: Gantry | null = null;
  /** A mining system's raider den (sim/den.ts), if it has one. */
  den: Den | null = null;
  /** A Thren sky's seed (sim/thrseed.ts), if it has one. */
  thrSeed: ThrenSeed | null = null;
  /** A Dust Traders system's market raft (sim/market.ts), if it has one. */
  market: Market | null = null;
  /** The target a torpedo launched now would lock, for the HUD. */
  lock: number | null = null;
  score = 0;
  best = 0;
  /** Seconds of simulated time, and seconds into the current run. */
  time = 0;
  runTime = 0;
  /** The expanses and features around the ship (null: off). */
  space: Space | null = null;
  private spaceOn = false;
  /** The named place the ship is inside (content/features.ts NAMED), if any; its flag `site:<id>` is set on entering. */
  siteHere: string | null = null;
  /** Where the system's place or job sits, and the feature it sits in (sim/sites.ts); null with no sky. */
  siteAt: Laid | null = null;
  private stormT = 2;
  private coreT = 1;
  /** What the place does to the ship now (sim/space.ts), and what to tell the player of it. */
  /** Seconds before the next "guns cold" cue inside a damping field. */
  private coldT = 0;
  /** Inside the port's ring, slow, and the port refusing the clamps because a fight is on. */
  dockHeld = false;
  /** The depot's shield is up: a fight is on, so nobody outside gets in and no enemy fire crosses it. Never up while the ship is inside the ring. */
  shield = false;
  /** How the port stands: calm, busy, alert or shut (sim/site.ts). The renderer and the scope read it. */
  readonly portSite = new SiteBrain();
  private shieldHold = 0;
  private deniedT = 0;
  air: Influence = { ...CALM, tint: [0, 0, 0], from: [] };
  conditions: Condition[] = [];
  private readonly there: Influence = { ...CALM, tint: [0, 0, 0], from: [] };
  /** Rocks and hulls broken this run. */
  kills = 0;
  /** The arcade's encounters: a wave on its way or being fought, or the quiet between (sim/pacing.ts). */
  pace: Pace = newPace(ARCADE_OPENING.first);
  /** The arcade's self-repair (sim/repair.ts). */
  mend: Mend = newMend();
  /** The arcade's bay: how long the alert has been clear in a quiet spell with a price aboard, and the quiet spell (`pace.n`) it last offered itself in. */
  private bayQuiet = 0;
  /** The Cyrite the arcade's bay waits for before it opens by itself again: a price past what was left unspent. */
  private bayFloor = 0;
  /** Times the bay has shut this run: each opening deals the Arcade picks a little differently (sim/bay.ts). */
  private bayDeal = 0;
  private bayShown: { ids: string[]; at: Record<string, number> } | null = null;
  private bayPassed: string[] = [];

  // the decisions, and the bay
  phase: Phase = 'play';
  /** Installs made in the bay (the journey's, in the Story mode). */
  refit = 0;
  /** The factions whose capital ship has been destroyed: their tech can be fitted. */
  techs = new Set<string>();

  // the chain, power-ups
  /** Seconds of the roll cloak (Office tech) left. */
  cloakT = 0;
  chain = 0;
  chainT = 0;
  powers: Record<PowerKind, number> = { shield: 0, rapid: 0, yield: 0, overdrive: 0 };

  alive = true;
  /** Hostiles that pressed close lately, fading (see step). */
  closePressed = 0;
  run: RunStats;
  readonly unlocked: Set<string>;
  /** Set in the review world only: nothing in it moves, hunts or hurts. */
  review: ReviewState | null = null;
  /** The survival mode this run plays in: every rule that differs between modes reads its row (content/survival.ts). */
  survival: Survival = SURVIVAL[DEFAULT_SURVIVAL];
  private mods: Mods = NO_MODS;
  private dying = 0;
  private dcUsed = false;
  private sinceHit = 0;
  private repairCd = 0;
  /** Seconds before an ordinary hull may carry a booster again. */
  private boostCd = BOOST_FIRST;
  private theatre: Faction = 'gutter';
  private theatreT = 70;
  private nextEvent = EVENT_FIRST;
  private eventN = 0;
  private lastEvent: EncounterId | null = null;
  private timeScore = 0;
  private nextSample = 0;
  private wasRolling = false;
  /** Surge core: kills stacked, and seconds left before they fade. */
  surgeN = 0;
  private surgeT = 0;
  /** Singularity wells left by torpedo blasts. */
  private wells: Array<{ x: number; z: number; life: number; r: number }> = [];
  /** Seconds to the point-defence turret's next shot. */
  private pdT = 0;
  /** The secret: barrel rolls in a row in the Story, each within ROLL_CHAIN_GAP seconds of the last. */
  private rollChain = 0;
  private rollChainAt = -Infinity;
  private wasBreaking = false;
  readonly events: GameEvent[] = [];

  // the Breakout: the course and the pursuit (null in the arcade), the tank, the hold, the cutter
  mode: Mode;
  bk: Breakout | null = null;
  /** Cyrite is the purse, in both modes: the bay builds with it, the ports sell for it. `krail` and `chits` are the old names for the same stock (the Arcade's tuning, records and the content rows still use them). The Story's jump is paid in `fuel`, not from here. */
  get krail(): number { return this.cyrite; }
  set krail(v: number) { this.cyrite = v; }
  get chits(): number { return this.cyrite; }
  set chits(v: number) { this.cyrite = v; }
  /** What the bay spends. */
  get purse(): number { return this.cyrite; }
  /** Cyrite aboard: money and build material. Rock, scrap and wrecks give it as it is picked up, once the tank is full. */
  cyrite = 0;
  /** Jump fluid in the drive tank (the Story): the refinery fills it first from what is picked up, the jump burns it, the ports sell a top-up. */
  fuel = 0;
  /** What the tank holds: the plotted jump. Over it, what is picked up is Cyrite. */
  get tankCap(): number { return tankFor(this.jumpCost); }
  /** A port's price for one unit of jump fluid, in Cyrite. */
  get fluidPrice(): number { return bondedPrice(this.postedFluid, this.bondedRate); }
  /** The price on the port's board, before any Bonded rate. */
  get postedFluid(): number { return fluidPrice(this.prices.cyrite); }
  /** The Bonded rate applies at this port: on the road, a Kellern port past the audit dock, no Charter (sim/charter.ts). */
  get bondedRate(): boolean { return !!this.bk?.port && !this.bk.def.first && bonded(this.flags, this.bk.def.holder); }
  /** Supplies aboard: the galley and the spares in one. A lane's days, the drive's wear and a plate patch draw on it. */
  supplies = 0;
  /** Seconds into patching a plate from supplies. */
  patchT = 0;
  /** Seconds left of "the lasers are working a rock" after the last hit on one (the comms desk waits it out). */
  mineT = 0;
  /** A multiplier on `TORP_YIELD`: the high-yield torpedo booster lifts it to the whole rock while it runs. */
  get torpYieldMult(): number {
    return this.powers.yield > 0 ? 1 / TORP_YIELD : 1;
  }
  /** Docked at the port: `phase` is 'dock', or 'bay' while the bay is open there. */
  docked = false;
  /** What the fitted modules do (sim/modules.ts), worked out with the stats. */
  fx: Effects = effects({});

  // the comms: the card on the table, what the run has set in motion, and who thinks what of you
  comms: Open | null = null;
  /** The call that rides along while the ship flies (a lighter card), and the run time it lapses at. */
  call: Open | null = null;
  callUntil = 0;
  /** The comms desk: what may be heard, and when (sim/desk.ts). */
  desk!: Desk;
  private deskRng = new Rng(1);
  private heardChatter = new Set<string>();
  private wasBusy: Busy = 'free';
  private arrivalSaid = false;
  private fightT = 0;
  flags = new Set<string>();
  standing: Partial<Record<Standing, number>> = {};
  /** Jobs taken and not yet paid. */
  jobs: JobDef[] = [];
  /** Run time of the next chance card (Infinity: none), and whether the port's approach has called. */
  cardNext = COMMS_FIRST;
  /** The first minutes' training (sim/tutor.ts), while a new pilot is being taught. */
  tutor: Tutor | null = null;
  /** The opening ended in the raiders' hands: the app starts it again from the top (set by a card, read by main.ts). */
  redo = false;
  /** The outlying mine of Contract 08-441 is being flown (set with the training): the Cyrite it gives is kept for the settlement. */
  opening = false;
  portCalled = false;
  auditCalled = false;
  /** Seconds of play since Lane Control took the ship (sim/recovery.ts); counts only while it has her. */
  recoverT = 0;
  /** How far the stop's Warden relay is woken (sim/uplink.ts), 0 to 1. */
  uplink = 0;
  /** Seconds held at the live story place (sim/places.ts); and which place they count for. */
  placeHold = 0;
  private placeHoldOf = '';
  /** A story place that moves (sim/places.ts): a hull coming alongside, or a canister handed across. Not saved: it starts again. */
  private mover: (Mover & { id: string }) | null = null;
  /** The hull that came alongside, once the meeting is made: it keeps pace while it hands anything across, then peels away. Seen, not saved. */
  escort: (Mover & { look: PlaceLook; t: number; leaving: boolean }) | null = null;
  /** Where a fixed place stands this visit: on her line to the gate, ahead of her when it comes up. */
  private anchor: { id: string; x: number; z: number } | null = null;
  /** Radio lines waiting their turn, by run time: a voice's beats one after another (`radioLines`). */
  private radioQ: Array<{ at: number; id: string; from: string; caller: string; text: string }> = [];
  /** One voice at a time (sim/floor.ts): the radio lines and notices wait here for their turn. */
  floor = new Floor();
  private cardsSeen = new Set<string>();
  /** The stop's story script (sim/script.ts), if it has one, and the objective it has set. */
  private script: Script | null = null;
  /** The contact at Northfold (sim/ghost.ts), once it has come. */
  ghost: Ghost | null = null;
  private ghostMade = false;
  /** Seconds of quiet sky before it came, and seconds since. */
  private ghostWait = 0;
  private ghostAge = 0;
  storyObjective: { main?: string; quiet?: string; from?: string } | null = null;
  /** Cards heard earlier in the journey: the ones that come once do not come again. */
  private heard = new Set<string>();
  private follows: Array<{ card: string; at: number; quick?: boolean }> = [];
  /** Seconds of a sold survey's veined rock left. */
  private seamT = 0;

  // the journey: the system being flown, what came aboard with the ship, and what this sortie did to the hunt
  sortie: SortieDef = HOME;
  private carryIn: Carry | null = null;
  /** Wear brought from earlier systems (Carry.scars). */
  private scarsIn = 0;
  /** Calloway: seconds into the sortie she arrives; whether she has, and whether her ship is the one fighting. */
  callowayAt = Infinity;
  /** Seconds the HUD still says the drive was knocked back by a hit. */
  spoolKnockT = 0;
  callowayMet = false;
  callowayBeaten = false;
  private callowayShip = false;
  /** Her offer (sim/calloway.ts): made this sortie. */
  offerMade = false;
  /** The story beat (sim/story.ts): played this sortie. */
  storyMade = false;
  /** The arrival scan has been said this sortie (the road: a Signal on entry, before any call or waypoint). */
  private scanned = false;
  /** Jumps she is behind, for the cards (Infinity: not on the trail yet). */
  behind = Infinity;
  /** Wanted and Calloway, as warnings (sim/pressure.ts). */
  private watch = new PressureWatch();
  /** The tank against the jump's need (sim/jumpready.ts); a new one each system. */
  private jumpWatch = new JumpWatch();
  huntDelay = 0;
  stall = 0;
  /** A named captain (sim/captains.ts): seconds into the sortie they find you; whether they have, their ship is the one fighting, and how it went. */
  captainAt = Infinity;
  captainMet = false;
  private captainFighting = false;
  private captainEnd: Report | null = null;
  /** Notice the sortie's cards moved, by faction. */
  noticeDelta: Partial<Record<Faction, number>> = {};
  /** The system's place (SortieDef.place): still to come, and how it went once it has. */
  private placeDue = false;
  placeWon: boolean | null = null;

  constructor(seed = 47, opts: WorldOptions = {}) {
    useIds(this.ids);
    this.seed = seed;
    this.rng = new Rng(seed);
    this.unlocked = new Set(opts.unlocked ?? []);
    this.survival = SURVIVAL[opts.survival ?? opts.sortie?.survival ?? DEFAULT_SURVIVAL];
    this.mods = threatened(this.survival.sky, opts.sortie?.threat);
    this.stats = this.buildStats();
    this.hull = flightHull(this.stats);
    this.plates = this.stats.maxPlates;
    this.shields = this.stats.shieldMax;
    this.arms = newArms(this.stats);
    this.field = new Field(this.rng);
    this.field.seed(0, 0);
    this.mode = opts.mode ?? 'arcade';
    this.spaceOn = !!opts.space;
    if (this.spaceOn && this.mode === 'arcade') this.space = new Space(seed, { hazard: this.mods.hazard });
    if (opts.review) {
      this.review = { bosses: [], bk: null };
      this.space = new Space(seed, { compose: false });
    }
    this.sortie = opts.sortie ?? HOME;
    this.carryIn = opts.carry ?? null;
    this.run = newRun(seed, this.survival.id);
    this.begin();
    this.layStory();
  }

  /** What the mode needs at the start of a run: the Breakout's course, tank and veined rock, and no capital ships of its own accord. */
  private begin(): void {
    this.run.mode = this.mode;
    this.command.auto = this.mode === 'arcade';
    this.command.reset();
    this.mineT = 0;
    this.docked = false;
    this.patchT = 0;
    this.comms = null;
    this.call = null;
    this.deskRng = new Rng(this.seed * 7919 + 13);
    this.desk = new Desk(this.deskRng, 0, this.sortie.calls ?? 1, this.carryIn?.hush ?? HUSH);
    this.heardChatter = new Set();
    this.wasBusy = 'free'; this.arrivalSaid = false; this.fightT = 0;
    this.flags = new Set();
    this.standing = {};
    this.jobs = [];
    this.cardNext = COMMS_FIRST;
    this.cardsSeen = new Set();
    this.follows = [];
    this.portCalled = false;
    this.auditCalled = false;
    this.paintCalled = false; this.yardT = 0; this.yardAt = Infinity; this.yardBeat = 0; this.yardPhase = 0; this.wakeHerald = false;
    this.recoverT = 0;
    this.placeHold = 0; this.placeHoldOf = ''; this.mover = null; this.escort = null; this.anchor = null; this.uplink = 0; this.laneOpened = false; this.burial = null; this.buried = false; this.guardsSent = false; this.adriftTold = false; this.hunters = new Set(); this.pulsed = false; this.cover = null; this.coverT = 0; this.mainLines = new Set(); this.listenAt = Infinity;
    this.radioQ = [];
    this.floor = new Floor();
    this.ghost = null; this.ghostMade = false; this.ghostWait = 0; this.ghostAge = 0;
    this.seamT = 0;
    this.callowayMet = false; this.callowayBeaten = false; this.callowayShip = false; this.offerMade = false; this.storyMade = false; this.scanned = false; this.huntDelay = 0; this.stall = 0;
    this.captainMet = false; this.captainFighting = false; this.captainEnd = null; this.noticeDelta = {}; this.captainAt = Infinity;
    this.placeDue = this.mode === 'breakout' && !!this.sortie.place; this.placeWon = null;
    this.stage = null;
    this.cordon = null;
    this.gathering = null;
    this.knot = null;
    this.traffic = null;
    if (this.mode !== 'breakout') {
      this.bk = null; this.cyrite = 0; this.fuel = 0; this.supplies = 0; this.callowayAt = Infinity;
      this.bayQuiet = 0; this.bayFloor = 0;
      this.stock();
      return;
    }
    const def = this.sortie;
    this.bk = newBreakout(this.ship.heading + (def.off ?? 0), def);
    this.callowayAt = def.calloway;
    this.captainAt = def.quiet ? Infinity : def.notice.captain?.at ?? Infinity;
    this.behind = def.behind;
    this.watch = new PressureWatch();
    this.jumpWatch = new JumpWatch();
    this.heard = new Set();
    // the course is laid out from where the ship is now
    const b = this.bk, s = this.ship;
    for (const w of places(b)) { w.x += s.x; w.z += s.z; }
    this.field.density = def.density;
    this.cyrite = 0;
    this.fuel = this.survival.voyage.start.cyrite;
    this.supplies = this.survival.voyage.start.supplies;
    // a few violet-veined rocks in the opening field: the first Cyrite is there to be cut
    let n = 0;
    const most = Math.round(this.richShare * 44);
    for (const r of this.field.rocks) {
      if (r.size === 0 && this.rng.next() < 0.12 && n < most) { r.kind = 'rich'; r.hp = r.maxHp = Math.round(r.maxHp * 1.6); n++; }
    }
    if (def.situation && !def.home) this.stage = makeStage(def.system, def.situation, this);
    if (def.cordon && this.bk) this.cordon = new Cordon(def.cordon, this);
    { const plan = trafficPlan(this); if (plan) this.traffic = new Traffic(this, plan); }
    {
      const d = this.bk?.def;
      const live = d ? livingOf(d) : null;
      // a mining system has a refinery barge on its field and, on the other side of the course, a raider den hidden in a ring of rock
      if (d && live) {
        const side = this.seed & 1 ? -1 : 1;
        if (live.barge) {
          const at = bargeBerth(this.ship.x, this.ship.z, this.ship.heading, d.lane, side);
          this.barge = new Barge(at.x, at.z, at.dir);
        }
        if (live.den) {
          const dn = denBerth(this.ship.x, this.ship.z, this.ship.heading, d.lane, live.barge ? -side : side);
          this.den = new Den(dn.x, dn.z, dn.second);
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + 0.3;
            this.field.spawn(i % 3 === 0 ? 0 : 1, dn.x + Math.cos(a) * 30, dn.z + Math.sin(a) * 30, 0, 0, 'iron', 1, 0);
          }
        }
        if (live.market) {
          const at = marketBerth(this.ship.x, this.ship.z, this.ship.heading, d.lane, this.seed & 4 ? -1 : 1);
          this.market = new Market(at.x, at.z);
        }
        if (live.seed) {
          const at = seedBerth(this.ship.x, this.ship.z, this.ship.heading, d.lane, this.seed & 8 ? -1 : 1);
          this.thrSeed = new ThrenSeed(at.x, at.z);
        }
        if (live.gantry) {
          const at = gantryBerth(this.ship.x, this.ship.z, this.ship.heading, d.lane, this.seed & 2 ? -1 : 1);
          this.gantry = new Gantry(at.x, at.z);
        }
      }
    }
    if (this.carryIn) this.bringAboard(this.carryIn);
    this.script = def.script ? new Script(SCRIPT, def.script, this.heard, this.carryIn?.pending ?? []) : null;
    if (def.script === 'l_wane' && this.bk) this.gathering = new Gathering(GATHERING);
    this.holdAt = Infinity;
    this.gateLet = false;
    this.holdNoted = '';
    this.arrivalLine = null;
    this.nowCard = null;
    this.storyObjective = null;
    this.stock();
    this.fitAboard();
  }

  /** Whether a story row has played here (or earlier on the journey). */
  rowPlayed(id: string): boolean { return this.script?.played(id) ?? false; }

  /** A new ship leaves with the basics fitted: lasers, a shield charge, the torpedo bay. */
  private stock(): void {
    if (!Object.keys(this.levels).length) { this.levels = stockLevels(); this.refreshStats(); }
  }

  /** What the fitted modules set up at the start of a sortie, or when one is fitted: the supply racks, the flags they open in the comms. */
  private fitAboard(): void {
    for (const f of this.fx.flags) this.flags.add(f);
  }

  /** What the ship brings from the last system: the stores, the tank, the build, the plates, and what the comms set in motion. */
  private bringAboard(c: Carry): void {
    this.cyrite = Math.min(holdMax(c.flags), c.cyrite);
    this.supplies = Math.min(this.supplyMax, c.supplies);
    this.levels = { ...c.levels };
    this.refreshStats();
    this.fuel = c.fuel;
    this.plates = Math.max(1, Math.min(this.stats.maxPlates, c.plates));
    this.powers.shield = c.stock?.shield ?? 0;
    this.powers.yield = c.stock?.yield ?? 0;
    this.refit = c.refit;
    this.techs = new Set(c.techs);
    this.flags = new Set(c.flags);
    this.standing = { ...c.standing };
    this.jobs = c.jobs.map((j) => ({ ...j }));
    this.heard = new Set(c.seen);
    this.scarsIn = c.scars ?? 0;
  }

  /** The cards that cannot come now: heard this sortie, or heard on the journey and not the kind that comes again. */
  private blocked(): Set<string> {
    const out = new Set(this.cardsSeen);
    for (const id of this.heard) if (!CARD_BY_ID[id]?.repeat) out.add(id);
    return out;
  }

  /** Hits taken (a lost plate counts one, a shield charge a quarter) and time flown (900 s a point), over the journey. */
  get scars(): number {
    return this.scarsIn + this.run.platesLost + this.run.shieldsAbsorbed * 0.25 + this.runTime / 900;
  }

  /** How worn the hull shows, 0 to 1: about half after a dozen systems of flying and fighting. */
  get use(): number {
    return 1 - Math.exp(-this.scars / 12);
  }

  /** What the ship carries now, into the next system. */
  carry(): Carry {
    return {
      cyrite: this.cyrite, fuel: this.fuel, supplies: this.supplies, plates: this.plates, stock: { shield: this.powers.shield, yield: this.powers.yield }, levels: { ...this.levels },
      refit: this.refit, techs: [...this.techs], flags: [...this.flags], standing: { ...this.standing }, jobs: this.jobs.map((j) => ({ ...j })),
      seen: [...new Set([...this.heard, ...this.cardsSeen])],
      pending: this.script?.pending() ?? [],
      scars: Math.round(this.scars * 100) / 100,
      hush: Math.min(HUSH, Math.round(this.runTime - this.desk.lastClose)),
    };
  }

  /** The sortie, once it is over: what the journey needs to carry on. */
  result(): SortieResult {
    const situation = this.stage?.conclude(this) ?? null;
    return {
      situation,
      ended: this.run.escaped ? 'jumped' : 'destroyed', time: this.runTime, carry: this.carry(), run: this.run,
      calloway: this.callowayMet, callowayBeaten: this.callowayBeaten, huntDelay: this.huntDelay, stall: this.stall,
      captain: this.captainResult(), notice: { ...this.noticeDelta }, place: this.placeWon,
    };
  }

  /** What came of the named captain, if they found you: a fight still on when the sortie ends is theirs if the Wayward did not get out, and slipped if it jumped. */
  private captainResult(): { id: string; report: Report } | null {
    const c = this.sortie.notice.captain;
    if (!c || !this.captainMet) return null;
    // a captain who found a ship that then broke up, their call still unanswered, counts it theirs: they rest like any meeting,
    // and do not wait at the very stop the tow brings her back to
    const report = this.captainEnd ?? (this.captainFighting ? (this.run.escaped ? 'evaded' : 'won') : this.alive ? null : 'won');
    return report ? { id: c.id, report } : null;
  }

  /** What the jobs here pay against their rows (sim/journey.ts `bountyAt`). */
  get pay(): number {
    return this.sortie.pay ?? 1;
  }

  /** Cyrite the plotted jump takes (the Breakout's lane in Cerro). */
  get jumpCost(): number {
    return (this.bk?.jumpCost ?? 0) + this.weightFuel;
  }

  /** Cyrite a jump takes on top of the lane's, for a ship carried heavy. */
  weightFuel = 0;
  /** The stores are gone: the ship flies slower and worse until a crate is aboard (EMPTY_STORES). */
  thin = false;

  /** What is wrong with the ship, in the order it matters: for the HUD's quiet line. */
  get warnings(): Array<'empty' | 'low' | 'heavy' | 'hot' | 'strained'> {
    const out: Array<'empty' | 'low' | 'heavy' | 'hot' | 'strained'> = [];
    if (this.bk) {
      if (this.supplies <= 0) out.push('empty');
      else if (this.supplies <= LOW_SUPPLIES) out.push('low');
    }
    const over = overRatings(this.levels);
    if (over.mass) out.push('heavy');
    if (over.heat) out.push('hot');
    if (over.power) out.push('strained');
    return out;
  }

  /** The clock the difficulty curve reads: run time in the arcade, heat in the Breakout. */
  private get clock(): number {
    return this.bk ? this.bk.heat * HEAT_CLOCK : this.runTime;
  }

  /** Everything that happened since the last call. */
  drain(): GameEvent[] {
    // a line made outside a step (an answer's radio) waits its turn like any other
    this.floor.take(this.events, this.runTime);
    return this.events.splice(0);
  }

  /** What the seeker can see this step. A capital ship still dropping in is not yet in reach; a cloaked hull never is. */
  targets(): Targets {
    const boss = this.command.targetable();
    // a ward is nobody's target: homing and aim help leave traffic and visitors alone
    return { ships: this.aliens.filter((a) => !cloaked(a) && !a.ward), boss: boss && !boss.arriving ? boss : null, rocks: this.field.rocks };
  }

  /** Seconds the Arcade's hulls are ahead in how they close: they commit from the start instead of looking the ship over first (sim/pacing.ts APPROACHES). */
  private get approachAhead(): number {
    return this.mode === 'arcade' && !this.review ? 75 : 0;
  }

  /** The mode's sky, and in the Arcade its sharper aim and opening (ARCADE_EDGE). */
  private get flightMods(): Mods {
    if (this.review) return this.mods;
    return this.mode === 'arcade' ? { ...this.mods, ...ARCADE_EDGE } : this.mode === 'breakout' ? { ...this.mods, aim: STORY_EDGE.aim, fire: this.mods.fire * STORY_EDGE.fire } : this.mods;
  }

  /** The current difficulty. */
  get pressure(): Pressure {
    return pressure(this.clock, this.flightMods);
  }

  /** The arcade's Krail income: the mode's sky says how much; the Story's income is in its rock and salvage rows. */
  private get income(): number {
    return this.bk ? 1 : this.mods.income * ARCADE_ROCK;
  }

  /** The share of veined rock in this system: the system's own, and the mode's. */
  private get richShare(): number {
    return (this.bk?.def.rich ?? 0) * this.survival.rock.veins;
  }

  /** `n` scaled by a mode's multiplier; the fraction is kept as a chance, so a small yield thins out rather than rounds to nothing. A multiplier of 1 changes nothing and draws nothing. */
  private share(n: number, k: number): number {
    return k === 1 || n <= 0 ? n : this.roll(n * k);
  }

  /** A whole number near `x`: the fraction is the chance of one more. */
  private roll(x: number): number {
    if (x <= 0) return 0;
    const f = Math.floor(x);
    return f + (this.rng.next() < x - f ? 1 : 0);
  }

  get chainMult(): number {
    return chainMult(this.chain);
  }

  /** Every weapon's damage: the build's fire control. */
  get dmgMult(): number {
    return this.stats.dmgAll;
  }

  /** Sensors are down (the nebula, or the Thren close by): shorter radar and locks. */
  get sensorsDown(): boolean {
    return (this.encounter?.id === 'nebula' && live(this.encounter) && !this.encounter.anchored) || this.navNoise > 0.3 || this.air.sight < 0.7;
  }

  /** How scrambled navigation is, 0 to 1: Thren hulls close by make the Jump Gate swim on the scope and the drive spool slow. */
  navNoise = 0;

  /** Teach the first minutes: a few marked steps, then the run goes on as it was. */
  train(): void { this.tutor = newTutor(!!this.bk); this.opening = true; stepTutor(this, 0); }

  /** End the training now. */
  skipTraining(): void { skipTutor(this); }

  /** The places as the scope shows them: the Jump Gate wanders while the Thren scramble navigation. */
  seenPlaces(): Waypoint[] {
    const b = this.bk;
    if (!b) return [];
    // Ned's yard shows only while the hull is waiting for it
    const all = places(b).filter((w) => w.kind !== 'yard' || paintDue(this.flags));
    // a Warden relay not yet answered (and the Narrows' mast): a place on the scope and the HUD, so it is clear where to go
    const rl = relayOf(b);
    // (the first system's relay shows once the hull is hers: it is the archive's to point at)
    if (rl && !this.flags.has(relayKey(b.def)) && (!b.def.first || painted(this.flags))) all.push({ kind: 'relay', name: b.def.script === 'narrows' ? 'Relay mast' : 'Warden relay', x: rl.x, z: rl.z, r: RELAY_MARK_R });
    // the stop's story place, while it waits for her (sim/places.ts)
    const sp = this.storyPlace;
    if (sp) all.push({ kind: 'story', name: sp.def.name, x: sp.x, z: sp.z, r: sp.def.r });
    if (this.navNoise <= 0) return all;
    const t = this.runTime, n = this.navNoise * 60;
    return all.map((w) => (w.kind === 'lane' ? { ...w, x: w.x + Math.sin(t * 1.3) * n, z: w.z + Math.cos(t * 0.9) * n } : w));
  }

  // ── the step ──────────────────────────────────────────────────────────

  step(dt: number, input: InputFrame): void {
    useIds(this.ids);
    if (this.review) return this.stepReview(dt, input);
    if (this.tutor) stepTutor(this, dt);
    // an ambush on the table slows the world rather than stopping it, and does not wait for ever
    const slowed = this.phase === 'comms' && !!this.comms && this.comms.slow > 0;
    if (this.phase !== 'play' && !slowed) return;
    // a demand on the radio holds the world: pop-ups always pause, and the answer is the player's to give
    if (this.call?.def.demand) return;
    if (slowed) {
      dt *= SLOW;
      const o = this.comms!;
      if ((o.slow = Math.max(0, o.slow - dt)) <= 0) { this.answer(o.def.slow!.default, true); return; }
    }
    // the stores run out or come back: the stat block follows
    if (this.bk && (this.supplies <= 0) !== this.thin) this.refreshStats();
    Object.assign(this.prev, this.ship);
    const s = this.ship, t = this.runTime, st = this.stats;
    const p = pressure(this.clock, this.flightMods);
    // Lane Control's recovery has the helm until Sam's code lifts the owner lock
    const held = !!this.bk && recovering(this.flags);
    // ...and Ned's yard has it from the ring to the way out (sim/postjump.ts YARD_ZAP)
    const yardAuto = !!this.bk && this.yardPhase > 0;
    let c = !this.alive || slowed || (this.bk && this.bk.jumpT >= 0) ? IDLE : held || yardAuto ? RECOVERY_CONTROLS : flightControls(input);
    if ((held || yardAuto) && this.alive && !slowed) {
      // Lane Control flies her on rails; everyone else keeps clear of a ship under recovery
      // she steers round the bulwarks only; loose rock in her lane drifts aside ahead of her
      const yd = this.bk!.yard, front = this.yardFront();
      const yardTo = !yardAuto || !yd ? null : this.yardPhase === 1 ? yd : this.yardPhase === 4 && this.runTime - this.yardAt >= YARD_OUT_AT ? { x: yd.x + front.x * 70, z: yd.z + front.z * 70 } : null;
      if (yardAuto) s.invuln = Math.max(s.invuln, 0.5);
      recoveryStep(s, yardAuto ? yardTo : this.bk!.audit, this.hull, yardAuto ? [] : this.field.bulwarks, dt, yardAuto ? (this.yardPhase === 1 ? 1.5 : 6) : HOLD_R);
      const fx = Math.cos(s.heading), fz = -Math.sin(s.heading);
      for (const r of this.field.rocks) {
        const rx = r.x - s.x, rz = r.z - s.z, ahead = rx * fx + rz * fz, side = rx * -fz + rz * fx, clear = r.r + SHIP_R + 4;
        if (ahead < -clear || ahead > 60 || Math.abs(side) > clear) continue;
        const away = side >= 0 ? 1 : -1;
        r.vx += -fz * away * 12 * dt; r.vz += fx * away * 12 * dt;
      }
      for (const al of this.aliens) if (!al.fleeing) leave(al);
      this.shots.length = 0;
    } else stepShip(s, c, this.hull, dt);
    if (held) this.recoverT += dt;
    if (this.bk?.def.first && this.alive) this.stepFirst();
    if (this.bk && this.alive) { this.stepStoryPlace(dt); this.stepScars(); this.stepRelay(dt); }
    if (this.nowCard && !this.comms && !this.call && this.phase === 'play' && this.busy() !== 'fight' && !this.floor.holding && this.floor.mayMoment(this.runTime, 0)) { const d = this.nowCard; this.nowCard = null; this.openComms(d); }
    this.flushRadio();
    if (this.space) this.stepSpace(dt, s);
    const rolling = s.rollT >= 0;
    // the gate's and the depot's damping field holds every gun cold, ours as well as theirs
    const cold = !!this.safe;
    if (rolling && !this.wasRolling && st.rollBurst && !cold) plasmaRing(this.sys, s, st);
    if (rolling && !this.wasRolling && st.rollFlush > 0 && this.alive) this.flush();
    if (rolling && !this.wasRolling && st.rollCloak > 0) { this.cloakT = st.rollCloak; this.events.push({ type: 'cloak', x: s.x, z: s.z }); }
    if (rolling && !this.wasRolling && this.bk) this.chainRoll();
    this.wasRolling = rolling;
    const breaking = s.breakT >= 0;
    if (breaking && !this.wasBreaking) this.events.push({ type: 'break', x: s.x, z: s.z });
    this.wasBreaking = breaking;
    this.tick(dt);

    // our weapons and systems
    const targets = this.targets();
    const fm: FireMods = { rapid: this.powers.rapid > 0, damage: this.dmgMult * (this.powers.overdrive > 0 ? 1.5 : 1) * (1 + SURGE.damage * this.surgeN), drifting: drifting(s, this.hull), speed: Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(this.hull)) };
    let fireStats = this.sensorsDown || this.air.lock < 1 ? { ...st, torpSeek: st.torpSeek * (this.sensorsDown ? 0.6 : 1) * this.air.lock } : st;
    if (this.powers.yield > 0) fireStats = { ...fireStats, torpDamage: fireStats.torpDamage * YIELD_DAMAGE, torpBlast: fireStats.torpBlast * YIELD_BLAST };
    if (this.alive) {
      if (cold) {
        this.coldT = Math.max(0, this.coldT - dt);
        if ((c.fire || c.torpedo) && this.coldT === 0) { this.coldT = 2.5; this.events.push({ type: 'gunsCold', at: this.safe }); }
      }
      const seen = this.events.length;
      fireWeapons(this.arms, s, cold ? { ...c, fire: false, torpedo: false } : c, targets, fireStats, fm, this.bolts, this.torps, this.events, dt);
      // each press that launched under high-yield warheads uses one up
      if (this.powers.yield > 0) for (let i = seen; i < this.events.length; i++) if (this.events[i]!.type === 'torpedo') this.powers.yield = Math.max(0, this.powers.yield - 1);
      if (this.bk && this.events.slice(seen).some((e) => e.type === 'bolt' || e.type === 'torpedo')) this.gunfireDraws(t);
      const laid = cold ? null : laySystems(this.sys, s, st, dt, fm.rapid, this.alert() === 'red');
      if (laid) this.events.push({ type: 'mineLaid', x: laid.x, z: laid.z });
    }

    // the sector
    this.field.step(dt, s.x, s.z, this.bk ? { ...p, rockHp: p.rockHp * MINE_HP, rich: this.richShare } : p);
    // under recovery nothing comes for her at all (the arcade's waves are not the Story's)
    // ...and from the code to the paint bay nothing comes either (owner, 5 November 2026): no pursuit, no swarm, no jam
    if (this.bk) { if (!held) { this.pursue(t); if (!(this.bk.def.first && paintDue(this.flags))) { this.swarm(t); this.jam(dt); } } }
    // the Arcade's first-run lesson flies alone: the first wave waits until it is over
    else if (!this.tutor || this.tutor.done) this.spawn(t, p);
    this.stepAliens(dt, t, p);
    const before = this.command.state, sighted = this.command.boss;
    this.command.step(t, dt, s, this.aliens, this.shots, this.webs, this.tele, this.strikes, this.rng, this.events);
    if (before === 'sighted' && this.command.state === 'idle' && sighted) {
      // it jumped out without ever knowing you: staying clear pays a little
      this.run.capitalsEvaded++;
      this.addScore(Math.round(bossBounty(sighted.n, sighted.faction) * JUMP_SCORE / 10) * 10, 'events');
      this.krail += JUMP_KRAIL;
      this.run.krailEarned += JUMP_KRAIL;
    }
    if (before !== 'fight' && this.command.state === 'fight') {
      // engaged: the regular traffic clears out for the capital ship and her wing
      for (const al of this.aliens) if (!al.escort && !al.extra) leave(al);
    }
    // a captain whose ship is gone without being beaten left the fight on their own terms
    if (this.captainFighting && this.command.state === 'idle' && !this.command.boss) { this.captainFighting = false; this.captainEnd = 'escaped'; }
    this.stepEncounter(dt, t);
    moveShots(this.shots, s, dt);
    stepWebs(this.webs, dt);
    moveBolts(this.bolts, dt, targets);
    for (const tp of moveTorpedoes(this.torps, targets, dt)) this.torpBlast(tp);
    this.stepFieldWall();
    this.stepSystems(dt, fm.rapid);
    this.stepDeflect(dt);
    this.stepWells(dt);
    this.stepFlak(dt);
    this.stepStrikes(dt);
    for (let i = this.tele.length - 1; i >= 0; i--) if ((this.tele[i]!.t -= dt) <= 0) this.tele.splice(i, 1);
    this.stepPickups(dt);
    this.collide();
    if (this.bk) this.stepBreakout(dt);
    if (this.bk && !slowed) this.stepComms();
    const lock = acquire(this.targets(), s.x, s.z, s.heading, fireStats.torpCone, fireStats.torpSeek);
    this.lock = lock ? lock.id : null;

    this.time += dt;
    if (this.alive) {
      this.runTime += dt;
      this.timeScore += SCORE_PER_SECOND * dt;
      if (this.timeScore >= 1) { const n = Math.floor(this.timeScore); this.timeScore -= n; this.addScore(n, 'time'); }
      if (this.runTime >= this.nextSample) {
        this.run.timeline.push({ t: Math.round(this.runTime), score: this.score, plates: this.plates, refit: this.refit });
        this.nextSample += TIMELINE;
      }
    } else if ((this.dying -= dt) <= 0) this.finish();
    if (this.bk && this.bk.jumpT >= 0 && (this.bk.jumpT -= dt) <= 0) this.finish();

    this.speak();

    // the decisions: a hail
    if (this.phase !== 'play') return;
    if (this.alive && this.command.hailing) this.phase = 'hail';
  }

  /**
   * The review world's step (docs/REVIEW.md): the ship flies and fires, the
   * place it is in works on it, and nothing else moves. No hull hunts, no rock
   * drifts, no pickup fades, no clock runs down, and nothing collides, so
   * there is nothing to die of.
   */
  private stepReview(dt: number, input: InputFrame): void {
    Object.assign(this.prev, this.ship);
    const s = this.ship;
    const c = { ...flightControls(input), torpedo: false };
    stepShip(s, c, this.hull, dt);
    if (this.space) {
      // the place's pull and drag, without its lightning
      const space = this.space;
      space.step(dt, this.runTime, s);
      const a = space.sample(s.x, s.z, this.air);
      if (a.drag > 1) { const k = Math.exp(-(a.drag - 1) * 1.5 * dt); s.vx *= k; s.vz *= k; }
      s.vx += a.ax * dt; s.vz += a.az * dt;
      this.conditions = reports(a);
    }
    // free fire, at nothing: the lances only show what they look like
    fireWeapons(this.arms, s, c, { ships: [], boss: null, rocks: [] }, this.stats, { rapid: true, damage: 1, drifting: drifting(s, this.hull) }, this.bolts, this.torps, this.events, dt);
    moveBolts(this.bolts, dt);
    this.time += dt;
    this.runTime += dt;
  }

  // ── the Breakout ──────────────────────────────────────────────────────

  /** Heat, patching, the port and the Jump Gate. */
  private stepBreakout(dt: number): void {
    const b = this.bk!, s = this.ship;
    // the hunt's clock runs slower in cover, and faster in the open where the region is watched (sim/rules.ts); only where there is a sky to read
    const rate = this.space && this.siteAt !== undefined && !b.def.quiet ? coverRate(this.air.conceal, b.def.rules?.watch) : 1;
    if (rate !== 1) { b.nextPursuit += (1 - rate) * dt; b.nextSwarm += (1 - rate) * dt; }
    b.heat = b.def.quiet ? Math.max(0, b.heat - QUIET_COOL * dt) : Math.min(1, b.heat + HEAT_RATE * b.def.heatRate * this.fx.heat * this.survival.heat.rate * rate * dt);
    this.stepClaim(dt);
    if (b.nagT > 0) b.nagT -= dt;
    if (this.seamT > 0 && (this.seamT -= dt) <= 0) { this.field.richBoost = 0; this.field.density = b.def.density; }
    if (!this.alive || b.jumpT >= 0) return;
    // a situation (a patrol's sweep, a toll, a distress call) never plays in the first system once the story has it: from the breach to the jump
    // (owner, 6 November 2026: no distress signal or raider there)
    if (!(b.def.first && (recovering(this.flags) || lockLifted(this.flags)))) this.stage?.step(this, dt);
    // "Answer the pattern" at Stillwater (content/thren.ts): the knot comes in front of her
    if (!this.knot && this.bk?.def.script === 'd_still' && this.flags.has(SPEAK_FLAG) && !this.flags.has(SPOKEN) && !this.flags.has(SPEAK_FAILED)) this.knot = new Speak(this);
    // Thane's hearing (content/hearing.ts): the Registry launch carries the witness in through Custody's scan cordon
    const bk = this.bk;
    if (bk && !this.cordon && bk.def.script === 'f_gilt' && this.flags.has(HEARING_LAUNCH) && !this.flags.has(HEARING_IN)) {
      const d = Math.hypot(bk.lane.x - this.ship.x, bk.lane.z - this.ship.z) || 1;
      this.cordon = new Cordon({ n: 3, along: Math.min(0.7, Math.max(0.25, 320 / d)), escort: true, flags: ['hearing_cold', 'hearing_made'] }, this);
      // as at Kiln: nobody comes unless the cordon sees her
      bk.nextPursuit = Math.max(bk.nextPursuit, this.runTime + 1e9);
    }
    if (this.cordon && this.cordon.state !== 'cold' && this.flags.has(HEARING_LAUNCH)) this.flags.add(HEARING_IN);
    if (this.phase === 'play') { this.gathering?.step(this); this.knot?.tick(this, dt); this.cordon?.step(this, dt); this.traffic?.step(this, dt); this.barge?.step(this, dt); this.gantry?.step(this, dt); this.market?.step(this, dt); this.den?.step(this, dt); this.thrSeed?.step(this, dt); }
    // the Archive keeps a photograph of a den once it has been seen, and of a seed once she has come near it
    if (this.den && this.den.state !== 'dark') this.flags.add('raider_den');
    if (this.thrSeed && Math.hypot(this.ship.x - this.thrSeed.x, this.ship.z - this.thrSeed.z) < 220) this.flags.add('thren_seed');
    const sig = this.jumpWatch.step(this.fuel, this.jumpCost, this.docked);
    if (sig) this.events.push({ type: sig, have: Math.floor(this.fuel), need: this.jumpCost });
    // Calloway's route lines ("change your route") are for the free chart: the road is one fixed line, so only Wanted speaks there
    if (!b.def.quiet) this.events.push(...this.watch.step({
      t: this.runTime, heat: b.heat, cap: Math.max(1, Math.round(pursuitCap(b.heat) * this.survival.pursuit.cap)),
      elite: this.aliens.some((a) => !!a.elite), inbound: this.aliens.some((a) => !a.ward && !a.fleeing && a.kind !== 'freighter' && Math.hypot(a.x - s.x, a.z - s.z) < 260),
      hunch: this.sortie.nemesis.hunch, was: this.sortie.nemesis.was, behind: this.behind,
    }).filter((e) => !(this.flags.has(ON_ROAD) && e.type.startsWith('calloway'))));

    if (this.mineT > 0) this.mineT -= dt;

    // patching: supplies into a plate, once the ship has been left alone for a while
    if (this.plates < this.stats.maxPlates && this.supplies >= this.patchCost && this.sinceHit >= PATCH_QUIET) {
      if ((this.patchT += dt) >= PATCH_TIME) {
        this.patchT = 0;
        this.supplies -= this.patchCost;
        this.repair(1);
        this.events.push({ type: 'patched', plates: this.plates });
      }
    } else this.patchT = 0;

    // keep the places clear: rock and bulwarks drift off them
    const st = this.stage;
    for (const w of st ? [...places(b), { kind: 'site' as const, x: st.x, z: st.z }] : places(b)) {
      const clear = w.kind === 'port' || w.kind === 'site' ? 30 : w.kind === 'audit' ? 40 : 24;
      for (const o of [...this.field.rocks, ...this.field.bulwarks]) {
        const dx = o.x - w.x, dz = o.z - w.z, d = Math.hypot(dx, dz) || 1, min = clear + o.r;
        if (d < min) { o.x = w.x + (dx / d) * min; o.z = w.z + (dz / d) * min; }
      }
    }

    // the paint shed's room: no rock or bulwark in or before it while the work is due
    if (b.yard && paintDue(this.flags)) {
      const c = { x: b.yard.x, z: b.yard.z };
      for (const o of [...this.field.rocks, ...this.field.bulwarks]) {
        const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz) || 1, min = YARD_CLEAR + o.r;
        if (d < min) { o.x = c.x + (dx / d) * min; o.z = c.z + (dz / d) * min; }
      }
    }

    const speed = Math.hypot(s.vx, s.vz) / topSpeed(this.hull);
    // the port: slow inside its ring, and the clamps take you
    const dp = b.port ? Math.hypot(s.x - b.port.x, s.z - b.port.z) : Infinity;
    if (b.port && dp > b.port.r) b.castOff = false;
    // the clamps stay open while a fight is on: slow at the ring and under attack, the port says no
    const ready = !!b.port && !b.castOff && dp < b.port.r && speed < DOCK_SPEED && this.phase === 'play';
    this.stepShield(dt, dp);
    this.stepSite(dt);
    this.stepYard(dt, speed);
    const nearDepot = !!b.port && dp < SAFE_R + SHIELD_NEAR;
    const held = (ready && this.inDanger()) || (this.shield && nearDepot);
    if (this.dockHeld && !held && (ready || nearDepot)) this.events.push({ type: 'dockCleared' });
    this.dockHeld = held;
    this.deniedT = Math.max(0, this.deniedT - dt);
    if (this.dockHeld && this.deniedT === 0) { this.deniedT = DENIED_EVERY; this.events.push({ type: 'dockDenied' }); }
    if (ready && !this.dockHeld) {
      if ((b.dockT += dt) >= DOCK_TIME) this.dock();
    } else b.dockT = Math.max(0, b.dockT - dt * 2);

    // Calloway: once she reaches the system, she opens a channel, and the rest is up to you
    if (!this.callowayMet && this.runTime >= this.callowayAt && this.command.state === 'idle' && this.phase === 'play' && b.blockade !== 'checkpoint') {
      this.callowayMet = true;
      const def = CARD_BY_ID.calloway_here;
      if (def) this.desk.offer(def, weightOf(def), this.runTime);
    }

    // the story beat: once, a little after arrival, if the journey has one due here
    const beat = b.def.story;
    const opening = !!beat && (CERRO_BEATS as readonly string[]).includes(beat);
    // on the road, entering a system: the scan is said first, then the calls come in and their waypoints with them (the owner, 31 October 2026)
    // ...and nothing else is said, and no card or call opens, until the camera's arrival sweep and the system's title are done
    const arriving = !!this.script && !opening && !recovering(this.flags) && !this.tutor;
    this.floor.hush = (arriving && this.runTime < FLOOR.arrival);
    if (!this.scanned && arriving && this.runTime >= SCAN_AT && this.phase === 'play' && b.jumpT < 0) {
      this.scanned = true;
      this.events.push({ type: 'storyNotice', tone: 'teal', headline: SCAN_LINE, reason: this.sortie.name });
    }

    // in the first system past Cerro the archive opens once Ned has said the reboot woke it (stepFirst)
    const placed = b.def.first && beat === WAKE_BEAT;
    if (beat && !this.storyMade && !placed && !(beat === WAKE_BEAT && paintDue(this.flags)) && this.runTime >= (opening ? OPENING_AT : STORY_AT) && this.command.state === 'idle' && this.phase === 'play' && b.blockade !== 'checkpoint' && b.jumpT < 0) {
      this.storyMade = true;
      const def = CARD_BY_ID[beat];
      // Sam's card is the recovery's to deal, at 2 km from the dock, even after a load mid-recovery
      if (def && !this.heard.has(def.id) && !this.cardsSeen.has(def.id) && !(def.id === SAM_BEAT && recovering(this.flags))) {
        // the opening's chain begins at once and runs on its own: a pop-up a moment after the last
        if (opening) this.openComms(def);
        else this.desk.offer(def, weightOf(def), this.runTime);
      }
    }

    // her offer: once a sortie at most, when she has one to make (and is not here in person)
    const offer = b.def.nemesis.offer;
    if (offer && !this.offerMade && !this.callowayMet && this.runTime >= OFFER_AT && this.command.state === 'idle' && this.phase === 'play' && b.blockade !== 'checkpoint' && b.jumpT < 0) {
      this.offerMade = true;
      const def = CARD_BY_ID[offer];
      if (def) this.desk.offer(def, weightOf(def), this.runTime);
    }

    // a named captain: they find you once, and come their own way
    const cap = b.def.notice.captain, cdef = cap && CAPTAIN_BY_ID[cap.id];
    if (cap && cdef && !this.captainMet && this.runTime >= this.captainAt && this.command.state === 'idle' && this.phase === 'play' && b.blockade !== 'checkpoint' && b.jumpT < 0) {
      this.captainMet = true;
      const you = yourStrength(this.levels, this.plates), them = theirStrength({ ships: captainShips(cdef, form(cdef, cap.memory)) });
      if (turnsAway(cdef, cap.memory, you, them, this.rng)) {
        this.captainEnd = 'left';
        this.events.push({ type: 'captainLeft', id: cdef.id, name: cdef.name, text: cdef.lines.leave });
      } else { const cc = captainCard(cdef, cap.memory, you, them); this.desk.offer(cc, weightOf(cc), this.runTime); }
    }

    // the Jump Gate: a blockade's checkpoint is a comms card; an open lane may still have someone waiting
    const dl = Math.hypot(s.x - b.lane.x, s.z - b.lane.z);
    if (b.blockade === 'none' && dl < BLOCKADE_AT && this.command.state === 'idle' && this.phase === 'play') {
      if (b.def.nemesis.finale) {
        // the last meeting: Calloway holds the lane to the Threshold herself
        b.blockade = 'checkpoint';
        this.callowayMet = true;
        this.openComms(b.def.nemesis.finale);
      } else if (b.def.blockade) {
        b.blockade = 'checkpoint';
        // Cerro's own: the registry reads the pilot first (content/story.ts); every later checkpoint is the generic one
        this.openComms((b.def.home && CARD_BY_ID.story_registry) || (b.def.checkpoint && CARD_BY_ID[b.def.checkpoint]) || CARD_BY_ID.checkpoint!);
      } else {
        b.blockade = 'done';
        // an open lane's toll is not every jump's: a roll, and not on the heels of another call; none in the first system past Cerro, whose story is enough, nor at a road gate, whose arrival is authored
        const def = !b.def.quiet && !b.def.safe && !b.def.first && !b.def.relay && !this.flags.has(ON_ROAD) && this.deskRng.next() < DESK.toll && this.desk.may('major', 'free', this.runTime) ? pickCard(this.commsCtx(), this.blocked(), this.rng, 'toll') : null;
        if (def) this.openComms(def);
      }
    }
    if (b.blockade === 'called' && this.command.state === 'idle' && !this.command.boss) b.blockade = 'done';

    // the Jump Gate: the drive charges on the way in (with the fluid in the tank) and the ship goes through the ring as soon as it is ready
    // the Narrows gate holds her while its scene plays: no spooling, so the script's lines are not held back as a jump's
    const inReach = dl < Math.max(APPROACH, b.spoolNeed * 46);
    // near the gate, the hold is told and its clock runs (she may wait short of the ring); in reach, it stops the drive
    const atGate = dl < Math.max(Math.min(HOLD_NEAR, Math.hypot(b.lane.x, b.lane.z) * 0.6), APPROACH, b.spoolNeed * 46);
    const gateHeld = atGate && this.gateHeld();
    // from afar the gate is just as shut: the HUD and the ring show it (quietly; the notice waits until she is near the gate)
    if (!gateHeld) this.gateWhy = atGate ? '' : (this.holdOf()?.why ?? '');
    // a gate that held her and now lets her go says so
    if (atGate && !gateHeld && this.holdNoted && this.holdNoted !== 'open') {
      this.holdNoted = 'open';
      this.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Jump Gate open', reason: 'fly through' });
    }
    // the story is still talking: the drive waits for the line, and the HUD says why
    const listen = inReach && !gateHeld && this.listening();
    if (listen) this.gateWhy = 'the radio first';
    const near = inReach && !gateHeld && !listen;
    if (near && this.fuel >= this.jumpCost && this.phase === 'play') {
      if (b.spool === 0) this.events.push({ type: 'spool' });
      b.spool += dt * (1 - JAM_SPOOL * this.navNoise);
      if (b.spool >= b.spoolNeed && dl < b.lane.r) this.jump();
    } else if (near) {
      if (this.fuel < this.jumpCost && b.nagT <= 0) {
        b.nagT = 6;
        this.events.push({ type: 'needFuel', have: Math.floor(this.fuel), need: this.jumpCost });
      }
    } else b.spool = Math.max(0, b.spool - dt * 2);
  }

  /**
   * Claimed ground (content/profiles.ts Rules.claim): time spent in a feature with something to take in it
   * (rubble, wrecks, a seam) is noticed, slower the better the ship passes for something else. One warning, then a crew.
   */
  private claimT = 0;
  private claimed = 0;
  private claimNoted = false;
  private stepClaim(dt: number): void {
    const rule = this.bk?.def.rules?.claim, space = this.space;
    if (!rule || !space || this.claimed >= 2 || this.bk!.def.quiet || this.bk!.def.safe || this.bk!.def.netted) return;
    const s = this.ship;
    let rich = false;
    for (const f of this.air.from) if (FEATURES[f.def].purpose.includes('resource') && weightAt(f, s.x, s.z) * f.level > 0.5) rich = true;
    // those who stand well with the claimant are let linger; their enemies are not
    const who = rule.card === 'claim_guild' ? 'guild' : 'frontier';
    // a paid claim stands for the rest of the region; a crew that was fought comes sooner next time
    if (this.flags.has(`claim_paid_${who}`)) {
      if (rich && !this.claimNoted) { this.claimNoted = true; this.events.push({ type: 'ping', id: `claim_${this.sortie.system}_ok`, from: tr('Scope'), caller: 'unknown', text: tr('Claim paid · the tally stands'), moment: 'calm', system: this.sortie.name }); }
      return;
    }
    const grudge = this.flags.has(`claim_fought_${who}`) ? 0.6 : 1;
    this.claimT = rich ? this.claimT + dt * stealthOf(this.levels) / claimPatience(this.standing[who] ?? 0) / grudge : Math.max(0, this.claimT - dt * 0.6);
    if (this.claimed === 0 && this.claimT >= rule.after * 0.55) {
      this.claimed = 1;
      this.events.push({ type: 'ping', id: `claim_${this.sortie.system}_w`, from: tr('Scope'), caller: 'unknown', text: tr(rule.warn), moment: 'calm', system: this.sortie.name });
    }
    if (this.claimT >= rule.after && this.claimed === 1 && this.command.state === 'idle') {
      this.claimed = 2;
      // the crew hails first: pay, bluff, bill, or fight (a decision, so the world pauses)
      const def = CARD_BY_ID[rule.card];
      if (def && this.phase === 'play') this.openComms(def);
    }
  }

  /** The pursuit holds off for this system's calm (SortieDef.pace): after an answered card, or when the last pursuer is beaten. */
  private rest(): void {
    const b = this.bk;
    if (b?.chase) return;
    if (b?.def.pace) b.nextPursuit = Math.max(b.nextPursuit, this.runTime + b.def.pace.calm);
  }

  /**
   * The opening chase (sim/breakout.ts): the lane is set a fixed run ahead, and the pirates' reinforcements come
   * from behind in waves that grow. Called once, when the training ends; Story's first system only.
   */
  startChase(): void {
    const b = this.bk;
    if (!b || b.chase || b.def.quiet) return;
    const s = this.ship, dx = b.lane.x - s.x, dz = b.lane.z - s.z, d = Math.hypot(dx, dz) || 1;
    b.lane.x = s.x + (dx / d) * CHASE_LANE;
    b.lane.z = s.z + (dz / d) * CHASE_LANE;
    b.def = { ...b.def, lane: CHASE_LANE };
    b.heat = Math.max(b.heat, 0.25);
    b.chase = { t0: this.runTime, wave: 0 };
    b.nextPursuit = this.runTime + CHASE_FIRST;
    this.events.push({ type: 'chase' });
  }

  /** The pursuit: Custody hulls from behind (from home), now and then a Gutter crew from ahead, as often as the heat says. */
  private pursue(t: number): void {
    const b = this.bk!, s = this.ship;
    if (b.def.first && !this.stolen(t)) return;
    const cs = this.command.state;
    if (b.def.quiet || cs === 'fight' || cs === 'inbound' || cs === 'hailing' || t < b.nextPursuit) return;
    if (b.chase) return this.chaseWave(t);
    const regular = this.aliens.filter((a) => !a.escort && !a.extra).length;
    const cap = Math.max(1, Math.round(pursuitCap(b.heat) * this.survival.pursuit.cap));
    if (regular < cap) {
      const pick = pickPursuer(b.heat, this.rng, b.def.gutter, b.def.ahead);
      const v = VARIANTS[pick.variant]!;
      // behind: the bearing from the Jump Gate back past the ship, spread a little
      const home = Math.atan2(-(s.z - b.lane.z), s.x - b.lane.x);
      const a = (pick.ahead ? home + Math.PI : home) + this.rng.range(-0.7, 0.7);
      const d = this.rng.range(115, 145);
      const at = { x: s.x + Math.cos(a) * d, y: 0, z: s.z - Math.sin(a) * d };
      const elite = this.rng.next() < pursuitElite(b.heat) * this.survival.pursuit.elite + b.def.notice.elite ? pickElite(v.kind, v.faction, this.rng) : null;
      const lead = this.spawnHostile(v.id, at, elite);
      // a pair, once the heat is up
      if (b.heat > 0.35 && regular + 1 < cap && ALIEN_TYPES[v.kind].role === 'interceptor' && this.rng.next() < 0.5) {
        const wing = this.spawnHostile(v.id, { x: at.x + Math.sin(a) * 5, y: at.y + 1.5, z: at.z + Math.cos(a) * 5 });
        wing.modeT = lead.modeT + 0.6;
        wing.lead = lead.id; wing.slot = 1;
      }
    }
    // hunters: a faction that has marked you sends its pursuit oftener
    b.nextPursuit = t + pursuitInterval(b.heat) * b.def.notice.pursuit * this.survival.pursuit.gap * this.rng.range(0.8, 1.2);
  }

  /** When the paint was done in the first system past Cerro (Infinity: not yet): the pursuit counts from it. */
  private stolenAt = Infinity;
  private stolenSaid = 0;
  /** Ned's words after the work: 1 what he did, 2 what he found. */
  private nedSaid = 0;

  /** The first system past Cerro, after the work: Ned says what he did and what he found, and the partition the reboot woke opens. */
  private stepFirst(): void {
    const t = this.runTime;
    // Ned, after the work: what he did, then what he found (the partition the reboot woke)
    if (this.yardAt !== Infinity && this.phase === 'play') {
      const e = t - this.yardAt;
      if (this.nedSaid === 0 && e >= NED_DONE_AT) { this.nedSaid = 1; this.radioLines('ned_done', tr(PAINTER), 'frontier', [tr(NED_DONE)]); }
      if (this.nedSaid === 1 && e >= NED_PARTITION_AT) { this.nedSaid = 2; this.flags.add(PARTITION); this.radioLines('ned_partition', tr(PAINTER), 'frontier', [tr(NED_PARTITION)]); }
    }
    // the yard's reboot woke the partition: once Ned has said so, at a free moment, the stored message comes (owner, 24 November 2026:
    // straight after the yard, not after filling the tank, for the story's sake)
    if (painted(this.flags) && !this.flags.has('archive_woke') && !this.cardsSeen.has(WAKE_BEAT) && !this.wakeHerald && !this.follows.some((f) => f.card === WAKE_BEAT)
      && (this.flags.has(PARTITION) || this.yardAt === Infinity) && !this.docked && this.phase === 'play' && this.scriptFree(this.busy(), t)) {
      this.follows.push({ card: WAKE_BEAT, at: t });
    }
  }
  /** Ned's yard (sim/postjump.ts): Ned has been heard. */
  private paintCalled = false;
  /** The archive's herald has been shown (it comes before the paint card; the archive's message follows that card's answer). */
  private wakeHerald = false;
  /** Ned's yard: how long she has held in its ring (the ring fills as it goes), and when the work was done (runTime; Infinity: not yet). */
  yardT = 0;
  yardAt = Infinity;
  /** The autopilot's part in Ned's yard: 0 none, 1 flying to the pad, 2 held while the zaps run (yardT counts), 3 shut down with the rebooting loader (yardT counts), 4 rebooted and flying out. */
  yardPhase = 0;
  /** The shut-down screen with its rebooting loader: 0 to 1 through the reboot, -1 when it is not up. */
  get yardReboot(): number { return this.yardPhase === 3 ? Math.min(1, this.yardT / YARD_REBOOT) : -1; }
  /** How glitched the HUD is, 0 to 1 (1: dark): rising through the zaps, dark at the reboot, flickering back after. */
  get yardGlitch(): number {
    if (this.yardPhase === 2) return Math.min(1, this.yardT / YARD_ZAP) * 0.85;
    if (this.yardPhase === 3) return 1;
    if (this.yardAt === Infinity) return 0;
    const e = this.runTime - this.yardAt;
    if (e < YARD_DARK) return 1;
    return e < YARD_BOOT ? 0.55 * (1 - (e - YARD_DARK) / (YARD_BOOT - YARD_DARK)) : 0;
  }
  private yardBeat = 0;
  /** The first system past Cerro: the hull is not reported stolen yet, so nothing there explains Wanted yet (main.ts holds the note). */
  get beforeReport(): boolean { return !!this.bk?.def.first && this.runTime < this.stolenAt + STOLEN.notice + STOLEN.explain; }

  /**
   * The first system past Cerro (sim/postjump.ts): nobody hunts the Wayward while she is still the company's. Once
   * Sam's code has lifted the lock, Sam tells her where the fluid is, the company reports the hull stolen, and only
   * then does the first Custody hull come (STOLEN). Returns whether the pursuit may run.
   */
  private stolen(t: number): boolean {
    if (!painted(this.flags)) return false;
    const b = this.bk!;
    if (this.stolenAt === Infinity) { this.stolenAt = t; b.nextPursuit = Math.max(b.nextPursuit, t + STOLEN.pursuit); }
    const since = t - this.stolenAt, name = b.def.name;
    if (this.stolenSaid === 0 && since >= STOLEN.sam) {
      this.stolenSaid = 1;
      if (this.fuel < this.jumpCost) this.events.push({ type: 'ping', id: 'stolen_sam', from: tr('Sam Okoro'), caller: 'miners', text: tr(b.port && this.cyrite >= this.fluidPrice ? STOLEN_SAM : STOLEN_SAM_POOR), moment: 'calm', system: name });
    }
    if (this.stolenSaid === 1 && since >= STOLEN.notice) {
      this.stolenSaid = 2;
      this.events.push({ type: 'storyNotice', tone: 'amber', headline: STOLEN_NOTICE[0], reason: STOLEN_NOTICE[1] });
    }
    return t >= this.stolenAt + STOLEN.pursuit;
  }

  /**
   * Ned's yard (owner, 5 November 2026): a place to dock, like the depot. Ease into its ring and hold still (slow, no fight on) and the
   * work is done at once: the hull is repainted and renamed (the reveal plays), the call sign is WAYWARD, a card says what happened,
   * and the archive follows later.
   */
  private stepYard(dt: number, speed: number): void {
    const b = this.bk!, y = b.yard;
    // the special moment after the work: a second notice, then the title card (the first notice went with the work)
    if (this.yardAt !== Infinity && this.yardBeat < 2) {
      const e = this.runTime - this.yardAt;
      if (this.yardBeat === 0 && e >= YARD_REPAINT_AT) { this.yardBeat = 1; this.events.push({ type: 'yardDone', n: 1 }); }
      else if (this.yardBeat === 1 && e >= YARD_TITLE_AT) { this.yardBeat = 2; this.events.push({ type: 'yardDone', n: 2 }); }
    }
    if (this.yardPhase === 4) { if (this.runTime - this.yardAt >= YARD_AUTO_END) this.yardPhase = 0; return; }
    if (!y || !paintDue(this.flags) || this.docked || this.phase !== 'play') { this.yardPhase = 0; this.yardT = 0; return; }
    const d = Math.hypot(this.ship.x - y.x, this.ship.z - y.z);
    if (this.yardPhase === 0) {
      // in the ring: the autopilot takes her to the pad (no fight on)
      if (d < y.r && !this.inDanger()) { this.yardPhase = 1; this.yardT = 0; }
      return;
    }
    this.yardT += dt;
    if (this.yardPhase === 1) {
      if ((d < 4 && speed < 0.4) || this.yardT > 12) { this.yardPhase = 2; this.yardT = 0; }
      return;
    }
    // held on the pad while the zaps run, then the ship shuts down and reboots (the loader), and then the work shows
    if (this.yardPhase === 2) { if (this.yardT >= YARD_ZAP) { this.yardPhase = 3; this.yardT = 0; } return; }
    if (this.yardT < YARD_REBOOT) return;
    this.yardPhase = 4;
    this.yardT = 0;
    this.yardAt = this.runTime;
    this.yardBeat = 0;
    this.flags.add(PAINTED);
    this.flags.add(RENAMED);
    this.events.push({ type: 'yardDone', n: 0 });
    // Ned says what he did and what he found (stepFirst); the archive in the partition follows
  }

  /** The way out of Ned's yard: the unit vector from the yard toward the company's dock, which its open front faces. */
  yardFront(): { x: number; z: number } {
    const y = this.bk?.yard, a = this.bk?.audit;
    if (!y || !a) return { x: 0, z: 1 };
    const dx = a.x - y.x, dz = a.z - y.z, n = Math.hypot(dx, dz) || 1;
    return { x: dx / n, z: dz / n };
  }

  /** One wave of the opening chase: heavier and more of them each time, always from behind. */
  private chaseWave(t: number): void {
    const b = this.bk!, c = b.chase!, s = this.ship;
    const regular = this.aliens.filter((a) => !a.escort && !a.extra).length;
    if (regular < chaseCap(c.wave)) {
      const v = VARIANTS[chaseHull(c.wave)]!;
      const home = Math.atan2(-(s.z - b.lane.z), s.x - b.lane.x);
      const n = c.wave >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const a = home + this.rng.range(-0.6, 0.6), d = this.rng.range(85, 115);
        this.spawnHostile(v.id, { x: s.x + Math.cos(a) * d, y: this.rng.range(-3, 10), z: s.z - Math.sin(a) * d });
      }
      this.events.push({ type: 'squad', label: chaseLabel(c.wave) });
      c.wave++;
    }
    b.nextPursuit = t + chaseGap(c.wave) * this.rng.range(0.9, 1.1);
  }

  /**
   * The Thren, where the chart has them: a knot of motes (and a web layer
   * leading, where they are thick), from any side, sooner and oftener the
   * more Cyrite is aboard. They hold off while a capital ship is engaged.
   */
  private swarm(t: number): void {
    const b = this.bk!, s = this.ship, thren = b.def.thren ?? 0;
    if (b.def.quiet || t < b.nextSwarm) return;
    const cs = this.command.state;
    if (cs === 'fight' || cs === 'inbound' || cs === 'hailing') { b.nextSwarm = t + 10; return; }
    const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(120, 150);
    const at = { x: s.x + Math.cos(a) * d, y: this.rng.range(-2, 10), z: s.z - Math.sin(a) * d };
    const lead = thren >= SWARM_WEAVER ? this.spawnHostile('weaver', at) : null;
    const n = swarmSize(thren);
    for (let i = 0; i < n; i++) {
      const k = (i / n) * Math.PI * 2;
      const m = this.spawnHostile('mote', { x: at.x + Math.cos(k) * 7, y: at.y + this.rng.range(-2, 3), z: at.z + Math.sin(k) * 7 }, null, true);
      m.modeT = (lead?.modeT ?? 0) + i * 0.25;
    }
    this.events.push({ type: 'squad', label: 'Thren swarm' });
    b.nextSwarm = t + swarmGap(thren, (this.fuel / this.tankCap) * TANK_MAX) * this.rng.range(0.8, 1.2);
  }

  /**
   * Gunfire inside a swarm draws more (docs/STORY_DIRECTION.md, plan priority 3):
   * a shot with Thren hulls close by brings the next knot within SWARM_DRAWN,
   * once, until every Thren hull is gone (no endless chain for a pilot who fights them).
   * The flags let the script notice, here and at a stop (`thren_drawn_<stop>`).
   */
  private gunfireDraws(t: number): void {
    const b = this.bk!, s = this.ship;
    if (b.def.quiet || (b.def.thren ?? 0) <= 0.05) return;
    const thren = this.aliens.filter((a) => a.faction === 'thren');
    // one drawn knot at a time: a fight with them must be one a pilot can finish
    if (!thren.length) { b.drawn = false; return; }
    if (b.drawn || !thren.some((a) => Math.hypot(a.x - s.x, a.z - s.z) < THREN_JAM)) return;
    b.drawn = true;
    b.nextSwarm = Math.min(b.nextSwarm, t + SWARM_DRAWN);
    this.flags.add('thren_drawn');
    if (b.def.script) this.flags.add(`thren_drawn_${b.def.script}`);
  }

  /** Navigation scrambles near Thren hulls, and settles once they are gone. */
  private jam(dt: number): void {
    const s = this.ship;
    const near = this.aliens.some((a) => a.faction === 'thren' && Math.hypot(a.x - s.x, a.z - s.z) < THREN_JAM);
    this.navNoise = near ? Math.min(1, this.navNoise + dt * 0.8) : Math.max(0, this.navNoise - dt * 0.5);
  }

  /** A rock mined with the lasers: everything in it falls out for the tractor, and nothing is left to split. */
  private mineRock(r: Rock): void {
    const y = rockYield(r.kind, r.size);
    const i = this.field.rocks.indexOf(r);
    if (i >= 0) this.field.rocks.splice(i, 1);
    this.run.mined++;
    this.run.rocks++;
    this.kills++;
    if (!this.bk!.def.quiet) this.bk!.heat = Math.min(1, this.bk!.heat + HEAT_MINE * MINE_WORK[r.size] * this.survival.heat.mine);
    const points = Math.round(ROCK_POINTS[r.size] * ROCK_KINDS[r.kind].points * 1.5);
    this.addScore(points, 'rocks');
    const R = this.survival.rock, ore = this.share(y.ore, R.ore), cyrite = this.share(y.cyrite, R.cyrite);
    if (ore) this.loot('rock', 'ore', ore, r.x, r.z, 3, r.vx, r.vz);
    if (cyrite) this.loot('rock', 'cyrite', cyrite, r.x, r.z, 3, r.vx, r.vz);
    // Krail: what a break would give by chance, sure when mined
    const K = ROCK_KINDS[r.kind];
    this.loot('rock', 'crystal', this.share(K.crystals[r.size]! * ROCK_KRAIL * MINE_KRAIL, R.krail * this.income), r.x, r.z, 3, r.vx, r.vz);
    if (r.kind === 'volatile') this.blast(r.x, 0, r.z, VOLATILE_BLAST, VOLATILE_DAMAGE, 'laser', 'volatile', 1, true);
    this.events.push({ type: 'rockMined', id: r.id, x: r.x, z: r.z, r: r.r, vx: r.vx, vz: r.vz, size: r.size, kind: r.kind, ore, cyrite, points });
  }

  private dock(): void {
    const b = this.bk!;
    this.lapse();
    b.dockT = 0;
    b.docks++;
    this.run.docked++;
    this.docked = true;
    this.phase = 'dock';
    this.run.ports.push(b.port!.name);
    const s = this.ship;
    s.vx = s.vz = 0;
    if (!b.portCooled) { b.portCooled = true; b.heat = Math.max(0, b.heat - DOCK_COOL - this.fx.dockCool); }
    // the pickups in the tractor's reach come aboard with you
    for (const pk of [...this.pickups]) if (Math.hypot(pk.x - s.x, pk.z - s.z) < this.stats.tractor) { this.pickups.splice(this.pickups.indexOf(pk), 1); this.collect(pk); }
    this.events.push({ type: 'docked', name: b.port!.name });
    this.settleJobs('port');
    // the training's work bay is a settlement, one panel, and then straight back to flight (sim/tutor.ts)
    settleAtBay(this);
  }

  /** What the port here charges (Cerro's prices outside a sortie), less what the ship's contacts knock off, and the survival mode's rate for ore. */
  get prices(): Prices {
    // the rows are written in chits; the port charges in Cyrite
    const p = discounted(this.bk?.prices ?? HOME.port!.prices, this.levels);
    return { ...p, supplies: cy(p.supplies), plate: cy(p.plate) };
  }

  /** The most supplies the ship holds: the racks add to it. */
  get supplyMax(): number {
    return SUPPLIES_MAX + this.fx.hold;
  }

  /** What a lump of scrap is worth, in chits (a fifth of a Cyrite): the port's price for it, at the survival mode's rate. */
  get scrapValue(): number {
    return Math.max(1, Math.round(SCRAP_PRICE * this.survival.voyage.ore));
  }

  /** Supplies a patch takes: the machine shop saves some. */
  get patchCost(): number {
    return Math.max(1, PATCH_COST - this.fx.patch);
  }

  /** Whether a thing can be had at the port now. */
  canBuy(item: PortItem): boolean {
    if (this.phase !== 'dock') return false;
    if (item === 'fuel') return !!this.bk && this.fuel < this.tankCap && this.cyrite >= this.fluidPrice;
    if (this.cyrite < this.prices[item]) return false;
    if (item === 'plate') return this.plates < this.stats.maxPlates;
    return this.supplies < this.supplyMax;
  }

  /** At the port: buy one of something, with Cyrite. */
  buy(item: PortItem): boolean {
    useIds(this.ids);
    if (!this.canBuy(item)) return false;
    if (item === 'fuel') { this.cyrite -= this.fluidPrice; this.fuel++; return true; }
    this.cyrite -= this.prices[item];
    if (item === 'supplies') this.supplies++;
    else this.repair(1);
    return true;
  }

  /** The yard mends the hull for nothing while the ship is docked: no plates to buy. Returns how many came back. */
  mendAtDock(): number {
    if (this.phase !== 'dock') return 0;
    const before = this.plates;
    this.repair(this.stats.maxPlates - before);
    return this.plates - before;
  }

  /** What the port would do for a sensible stop now (sim/stop.ts): the tank up to the jump first. */
  planStop(): Stop {
    return planStop({ supplyMax: this.supplyMax, cyrite: this.cyrite, prices: this.prices, jumpCost: this.jumpCost, fuel: this.fuel, fluidPrice: this.fluidPrice, supplies: this.supplies, plates: this.plates, maxPlates: this.stats.maxPlates });
  }

  /** At the port: the sensible stop. Returns what it did. */
  sensibleStop(): Stop {
    const plan = this.planStop();
    if (this.phase !== 'dock') return { fuel: 0, supplies: 0, plate: 0, cyrite: 0 };
    for (const item of ['fuel', 'supplies', 'plate'] as const) for (let i = 0; i < plan[item]; i++) this.buy(item);
    return plan;
  }

  /** Docked: the journey plotted another lane out of here (sim/journey.ts replot). The Jump Gate stays where it is. */
  replot(dest: string, jumpCost: number): boolean {
    const b = this.bk;
    if (!b || this.phase !== 'dock') return false;
    b.def = this.sortie = { ...b.def, dest, jumpCost };
    b.jumpCost = jumpCost;
    return true;
  }

  /** Cast off. A moment of grace to get clear. */
  undock(): void {
    if (this.phase !== 'dock') return;
    this.docked = false;
    this.phase = 'play';
    if (this.bk) this.bk.castOff = true;
    this.ship.invuln = Math.max(this.ship.invuln, 2);
  }

  /** Into the lane: the drive burns the fluid and the ship is gone. */
  private jump(): void {
    const b = this.bk!, s = this.ship;
    this.fuel -= this.jumpCost;
    this.settleJobs('lane');
    this.run.escaped = true;
    this.run.cyriteLeft = this.cyrite;
    this.run.cause = 'escaped';
    this.addScore(5000 + (this.cyrite + this.fuel) * 50 + this.plates * 500, 'events');
    b.jumpT = JUMP_T;
    s.invuln = 99;
    this.events.push({ type: 'jumped', x: s.x, z: s.z });
  }

  /** Clocks: boosters, the chain, shields, regeneration. */
  private tick(dt: number): void {
    const st = this.stats;
    for (const k of POWERS) if (this.powers[k] > 0 && !STOCKED.has(k)) this.powers[k] = Math.max(0, this.powers[k] - dt);
    if (this.cloakT > 0) this.cloakT = Math.max(0, this.cloakT - dt);
    if (this.repairCd > 0) this.repairCd -= dt;
    if (this.boostCd > 0) this.boostCd -= dt;
    if (this.chain > 0 && (this.chainT -= dt) <= 0) this.chain = 0;
    if (this.surgeN > 0 && (this.surgeT -= dt) <= 0) this.surgeN = 0;
    this.sinceHit += dt;
    this.spoolKnockT = Math.max(0, this.spoolKnockT - dt);
    if (this.shieldT > 0) this.shieldT = Math.max(0, this.shieldT - dt);
    else if (this.shields < st.shieldMax && this.alive) {
      const was = Math.floor(this.shields);
      this.shields = Math.min(st.shieldMax, this.shields + dt / st.shieldRecharge);
      if (Math.floor(this.shields) > was) this.events.push({ type: 'shieldUp', charges: Math.floor(this.shields) });
    }
    // the arcade mends itself (below); the Story mode's regenerative hull grows a plate back
    if (st.regen > 0 && this.bk && this.alive && this.plates < st.maxPlates && this.sinceHit >= st.regen) {
      this.plates++;
      this.sinceHit = 0;
      this.run.platesGained++;
      this.events.push({ type: 'regen', plates: this.plates });
    }
    // how hard the fights have pressed lately: the most hostiles inside 60 m, fading over about forty seconds (the bay's advice, sim/advice.ts)
    {
      const sh = this.ship;
      let close = 0;
      for (const a of this.aliens) if (!a.fleeing && !a.ward && Math.hypot(a.x - sh.x, a.z - sh.z) < 60) close++;
      this.closePressed = Math.max(close, this.closePressed * (1 - dt / 40));
    }
    this.bayDue(dt);
    if (!this.bk && this.alive) {
      const news = stepMend(this.mend, { sinceHit: this.sinceHit, plates: this.plates, maxPlates: st.maxPlates, danger: this.inDanger(), stats: st }, dt);
      if (news === 'start') this.events.push({ type: 'mendStart' });
      else if (news === 'plate' && this.repair(1)) {
        this.run.platesMended++;
        this.events.push({ type: 'mended', plates: this.plates });
      }
    }
  }

  /** Is anything dangerous near: a hostile that has committed to a fight inside SELF_REPAIR.danger, fire close by, or a capital ship? */
  inDanger(): boolean {
    const s = this.ship, cs = this.command.state;
    if (cs === 'fight' || cs === 'inbound') return true;
    for (const a of this.aliens) if (this.committed(a) && Math.hypot(a.x - s.x, a.z - s.z) < SELF_REPAIR.danger) return true;
    for (const sh of this.shots) if (Math.hypot(sh.x - s.x, sh.z - s.z) < SELF_REPAIR.fireDanger) return true;
    return false;
  }

  /**
   * The depot shield (every depot, every system). While a fight is on near the
   * depot it raises the field: the ship cannot cross the edge, and enemy fire
   * that reaches the edge is absorbed. It never comes up while the ship is
   * already inside, and it drops a moment after the fight is over.
   */
  /** The port's mood from what is going on round its ring. */
  private stepSite(dt: number): void {
    const port = this.bk?.port;
    if (!port) { this.portSite.reset(); return; }
    let fight = 0, ships = 0;
    for (const a of this.aliens) {
      if (Math.hypot(a.x - port.x, a.z - port.z) > BUSY_R) continue;
      if (a.ward) ships++; else if (this.committed(a)) fight++;
    }
    this.portSite.step(dt, { shield: this.shield, fight, heat: this.bk!.heat, ships });
    this.stepWorks(dt, port);
  }

  private flakT = 0;
  /** Pickups the yard crane has taken hold of (ids), so each is claimed once. */
  private craned = new Set<number>();

  /**
   * What the holder's port does about what it senses. A Holdfast's flak shoots the rock drifting in and any
   * hostile hull near the ring, twice as often once the port is alert. The Gutter yard's crane hauls loose
   * salvage that would soon be lost to the ring's edge and keeps it a while, so a fight does not cost the loot.
   */
  private stepWorks(dt: number, port: { x: number; z: number }): void {
    const holder = this.bk?.def.holder;
    if (holder === 'holdfast') {
      if ((this.flakT -= dt) > 0) return;
      this.flakT = this.portSite.mood === 'alert' || this.portSite.mood === 'shut' ? FLAK_EVERY_ALERT : FLAK_EVERY;
      const aim: Array<{ x: number; z: number; hit: () => void; d: number }> = [];
      for (const r of this.field.rocks) {
        const d = Math.hypot(r.x - port.x, r.z - port.z);
        if (d > FLAK_R || d < SAFE_R * 0.5) continue;
        // only what is drifting in
        if ((port.x - r.x) * r.vx + (port.z - r.z) * r.vz <= 0) continue;
        aim.push({ x: r.x, z: r.z, d, hit: () => { this.damageRock(r, FLAK_DAMAGE, 'hazard', r.x, 0, r.z); } });
      }
      for (const a of this.aliens) {
        const d = Math.hypot(a.x - port.x, a.z - port.z);
        if (d > FLAK_R || !this.committed(a)) continue;
        aim.push({ x: a.x, z: a.z, d, hit: () => { this.hurtAlien(a, FLAK_DAMAGE, 'hazard', a.x, 0, a.z); } });
      }
      aim.sort((p, q) => p.d - q.d);
      for (const t of aim.slice(0, 2)) {
        this.events.push({ type: 'blast', x: t.x, y: 0, z: t.z, radius: 1.6, kind: 'bomblet' });
        t.hit();
      }
    } else if (holder === 'gutter') {
      for (const p of this.pickups) {
        if (!LOOSE.has(p.kind)) continue;
        const dx = port.x - p.x, dz = port.z - p.z, d = Math.hypot(dx, dz) || 1;
        if (d > CRANE_R || d < SAFE_R * 0.8) continue;
        if (!this.craned.has(p.id)) {
          if (p.life > 3) continue;
          this.craned.add(p.id);
          p.life = CRANE_KEEP;
        }
        p.vx += (dx / d) * CRANE_PULL * dt;
        p.vz += (dz / d) * CRANE_PULL * dt;
      }
      if (this.craned.size > 64) { const ids = new Set(this.pickups.map((p) => p.id)); for (const id of this.craned) if (!ids.has(id)) this.craned.delete(id); }
    }
  }

  /** The port's mood now (calm when there is none). */
  get portMood(): Mood { return this.portSite.mood; }

  private stepShield(dt: number, dp: number): void {
    const port = this.bk?.port;
    if (!port) { this.shield = false; return; }
    const was = Math.hypot(this.prev.x - port.x, this.prev.z - port.z);
    if (was < SAFE_R) { this.shield = false; this.shieldHold = 0; return; }
    const fight = this.inDanger() || this.aliens.some((a) => this.committed(a) && Math.hypot(a.x - port.x, a.z - port.z) < SHIELD_FIGHT_R);
    if (fight) { this.shield = true; this.shieldHold = SHIELD_HOLD; }
    else if (this.shield && (this.shieldHold -= dt) <= 0) this.shield = false;
    if (!this.shield) return;
    // the edge holds the ship: pushed back out, the inward drift gone
    const s = this.ship;
    if (dp < SAFE_R + 0.5) {
      const nx = (s.x - port.x) / (dp || 1), nz = (s.z - port.z) / (dp || 1);
      s.x = port.x + nx * (SAFE_R + 0.5); s.z = port.z + nz * (SAFE_R + 0.5);
      const vin = s.vx * nx + s.vz * nz;
      if (vin < 0) { s.vx -= vin * nx; s.vz -= vin * nz; }
    }
    // enemy fire that meets the edge is absorbed
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i]!;
      if (Math.hypot(sh.x - port.x, sh.z - port.z) < SAFE_R) this.shots.splice(i, 1);
    }
  }

  /**
   * The damping field is a wall as well as a dead zone: fire from outside stops at the ring (lasers, torpedoes, hostile
   * shots and webs), and rock is held out of it, turned at the edge like a hull. Nothing crosses it either way.
   */
  private stepFieldWall(): void {
    const b = this.bk;
    if (!b) return;
    const rings = [...(this.fieldDown ? [] : [b.lane]), ...(b.port ? [b.port] : [])];
    const inside = (x: number, z: number) => rings.some((k) => Math.hypot(x - k.x, z - k.z) < SAFE_R);
    for (const list of [this.bolts, this.torps, this.shots, this.webs] as Array<Array<{ x: number; z: number }>>) {
      for (let i = list.length - 1; i >= 0; i--) if (inside(list[i]!.x, list[i]!.z)) list.splice(i, 1);
    }
    for (const r of this.field.rocks) {
      for (const k of rings) {
        const dx = r.x - k.x, dz = r.z - k.z, d = Math.hypot(dx, dz) || 0.01, edge = SAFE_R + r.r;
        if (d >= edge) continue;
        const nx = dx / d, nz = dz / d;
        r.x = k.x + nx * edge; r.z = k.z + nz * edge;
        const vin = r.vx * nx + r.vz * nz;
        if (vin < 0) { r.vx -= 2 * vin * nx; r.vz -= 2 * vin * nz; }
      }
    }
  }

  /** A hostile that has committed to a fight with the ship. */
  committed(a: Alien): boolean {
    return !(a.fleeing || a.ward || ALIEN_TYPES[a.kind].fire === 'none' || a.mode === 'patrol' || a.mode === 'watch' || a.mode === 'brawl');
  }

  /** How many committed hostiles are inside the danger range: the live count the port quotes when it refuses the clamps. */
  engaged(): number {
    const s = this.ship;
    return this.aliens.filter((a) => this.committed(a) && Math.hypot(a.x - s.x, a.z - s.z) < SELF_REPAIR.danger).length;
  }

  /** Inside the Jump Gate's or the depot's safe ring: nothing hurts the ship here and hostile hulls keep out. */
  get safe(): 'lane' | 'port' | 'place' | null {
    const b = this.bk;
    if (!b || !this.alive) return null;
    const s = this.ship;
    if (!this.fieldDown && Math.hypot(s.x - b.lane.x, s.z - b.lane.z) < SAFE_R) return 'lane';
    if (b.port && Math.hypot(s.x - b.port.x, s.z - b.port.z) < SAFE_R) return 'port';
    // a meeting: the civilian hull's beacon holds every gun cold inside its ring, so she can hold alongside while hunted
    const sp = this.storyPlace;
    if (sp && 'hold' in sp.def.act && Math.hypot(s.x - sp.x, s.z - sp.z) < sp.def.r) return 'place';
    return null;
  }

  /**
   * The ship's alert, three steps, what the HUD shows and what the refit bay
   * opens on:
   *   clear  · nothing hostile about: the HUD stays quiet, the bay opens
   *   yellow · you are being observed: a hull close by or looking you over, a
   *            capital ship on its way; nobody has committed yet, the bay stays shut
   *   red    · you are being directly targeted: a committed hostile close, fire
   *            near, a capital ship engaged (inDanger)
   */
  alert(): Alert {
    if (this.review || this.safe) return 'clear';
    if (!this.alive || this.inDanger()) return 'red';
    const s = this.ship, cs = this.command.state;
    if (cs === 'sighted') {
      // a capital ship that has not noticed you is only on the map; yellow once it starts to
      if ((this.command.boss?.aware ?? 0) > 0.05) return 'yellow';
    } else if (cs !== 'idle') return 'yellow';
    for (const a of this.aliens) {
      if (a.fleeing || a.ward || ALIEN_TYPES[a.kind].fire === 'none') continue;
      if (a.mode === 'watch' || Math.hypot(a.x - s.x, a.z - s.z) < WATCH_RANGE) return 'yellow';
    }
    return 'clear';
  }

  // ── decisions ─────────────────────────────────────────────────────────

  /** Go in at a sighted capital ship now (what flying up to it does; the scripted pilot calls it). */
  provoke(): void {
    useIds(this.ids);
    this.command.provoke(this.runTime, this.ship, this.aliens, this.rng, this.events);
  }

  /** The hail: engage (true) or evade (false). Evade is refused when it is not on offer. */
  answerHail(engage: boolean): void {
    useIds(this.ids);
    if (this.phase !== 'hail') return;
    if (engage) this.command.engage(this.runTime);
    else if (this.command.evade(this.runTime, this.events)) this.run.capitalsEvaded++;
    else this.command.engage(this.runTime);
    this.phase = 'play';
  }

  // ── the refit bay ─────────────────────────────────────────────────────

  /** What the bay's rules see of the ship. */
  /** Why a module is worth fitting now, in a few words (sim/advice.ts), or null. */
  advise(id: string): Advice | null {
    return reasonOf(id, { levels: this.levels, plates: this.plates, maxPlates: this.stats.maxPlates, pressure: this.closePressed });
  }

  /** What the ship says about itself now (sim/voice.ts), in English. */
  voice(): string {
    return voiceText(voiceId({ bay: this.bayCtx(), plates: this.plates, maxPlates: this.stats.maxPlates }));
  }

  bayCtx(): BayCtx {
    return { levels: this.levels, unlocked: this.unlocked, techs: this.techs, arcade: !this.bk, docked: this.docked || stepOf(this) === 'bay', only: this.bk && stepOf(this) === 'bay' ? LESSON_NODE : undefined, krail: this.chits, deal: this.bayDeal, passed: this.bayPassed };
  }

  /**
   * Why the bay will not open now, or null if it will: while flying with
   * the alert clear, or docked at a port. The HUD shows the alert, so it
   * always says whether the bay will open: yellow and red keep it shut.
   */
  bayClosed(): 'busy' | 'yellow' | 'red' | 'away' | null {
    if (!this.alive) return 'busy';
    if (this.phase === 'dock') return null;
    if (this.phase !== 'play') return 'busy';
    if (stepOf(this) === 'bay' && !this.bk) return null; // the Arcade lesson's one upgrade, in flight
    if (this.bk) return 'away'; // the Story fits only at a work bay
    const a = this.alert();
    return a === 'clear' ? null : a;
  }

  /** Open the bay: the world waits while you fit. False if it cannot open now (see bayClosed). */
  openBay(): boolean {
    if (this.bayClosed()) return false;
    this.phase = 'bay';
    if (!this.bk) { this.bayShown = { ids: quickPicks(this.bayCtx()).map((w) => w.id), at: this.levels }; this.run.bayOpens++; }
    return true;
  }

  /** Fit one more level of `id`, paid in Krail (and the yard's chits). Null when fitted, else why not (sim/bay.ts). */
  install(id: string): Block | 'closed' | null {
    useIds(this.ids);
    if (this.phase !== 'bay') return 'closed';
    return this.fit(id);
  }

  /**
   * The arcade's bay opens by itself whenever a refit is paid for and it is safe: between encounters
   * (sim/pacing.ts quiet), the alert clear a moment, no capital ship about, and something to fit.
   * Never between the arrivals of one encounter. After a pick, Fit another is the player's choice
   * (`redeal`). Left with Cyrite unspent, it waits until another price is aboard; B and the badge
   * open it whenever the alert is clear.
   */
  private bayDue(dt: number): void {
    const capital = this.command.state !== 'idle';
    if (this.bk || !this.alive || this.phase !== 'play' || this.krail < Math.max(ARCADE_PRICE, this.bayFloor) || this.pace.state !== 'quiet' || capital) { this.bayQuiet = 0; return; }
    this.bayQuiet = this.alert() !== 'clear' ? 0 : this.bayQuiet + dt;
    if (this.bayQuiet < BAY_QUIET) return;
    this.bayQuiet = 0;
    const ctx = this.bayCtx();
    if (quickPicks(ctx).some((w) => blockOf(w.id, ctx) === null)) { this.openBay(); this.run.bayOffers++; }
    else this.bayFloor = this.krail + ARCADE_PRICE;
  }

  /** The Arcade: the Cyrite aboard at which the bay next opens by itself (a refit's price, or one more after a pass). */
  get nextRefit(): number { return Math.max(ARCADE_PRICE, this.bayFloor); }

  /** The Arcade's Fit another: there is Cyrite for another refit, and something to fit with it. */
  canFitAnother(): boolean {
    if (this.bk || this.phase !== 'bay' || this.krail < ARCADE_PRICE) return false;
    const ctx = { ...this.bayCtx(), deal: this.bayDeal + 1 };
    return quickPicks(ctx).some((w) => blockOf(w.id, ctx) === null);
  }

  /** How many more refits the Cyrite aboard pays for (the Arcade: every refit costs the same). */
  get refitsAffordable(): number {
    return this.bk ? 0 : Math.floor(this.krail / ARCADE_PRICE);
  }

  /** The Arcade's Fit another: deal three fresh cards in the same visit. The ones passed over come round less readily. */
  redeal(): boolean {
    if (!this.canFitAnother()) return false;
    this.passOn();
    this.bayShown = { ids: quickPicks(this.bayCtx()).map((w) => w.id), at: this.levels };
    return true;
  }

  /** The cards dealt and not taken, kept so the next deal is slower to offer them again; the next deal is a new one. */
  private passOn(): void {
    this.bayDeal++;
    if (this.bayShown) this.bayPassed = this.bayShown.ids.filter((id) => (this.levels[id] ?? 0) === (this.bayShown!.at[id] ?? 0));
    this.bayShown = null;
  }

  private fit(id: string): Block | null {
    const r = bayInstall(id, this.bayCtx());
    if (typeof r === 'string') return r;
    if (this.bk) this.chits -= r.cost;
    else this.krail -= r.cost;
    this.levels = r.levels;
    this.refreshStats();
    this.fitAboard();
    this.refit++;
    this.run.refit++;
    this.run.krailSpent += r.cost;
    this.events.push({ type: 'fitted', id });
    return null;
  }

  closeBay(): void {
    if (this.phase !== 'bay') return;
    this.phase = this.docked ? 'dock' : 'play';
    this.bayQuiet = 0;
    // Cyrite left unspent: the bay opens by itself again one price further on
    this.bayFloor = this.krail >= ARCADE_PRICE ? this.krail + ARCADE_PRICE : 0;
    this.passOn();
  }

  // ── comms ─────────────────────────────────────────────────────────────

  /** What a card can see of the ship and the run. */
  commsCtx(): Ctx {
    const b = this.bk, s = this.ship;
    const place = !b ? 'open' : Math.hypot(s.x - b.lane.x, s.z - b.lane.z) < BLOCKADE_AT ? 'lane' : b.port && Math.hypot(s.x - b.port.x, s.z - b.port.z) < PORT_CALL ? 'port' : 'open';
    return {
      t: this.runTime, heat: b?.heat ?? 0, cyrite: this.cyrite, fuel: this.fuel, need: b ? this.jumpCost : JUMP_COST, tank: TANK_MAX, chits: this.cyrite,
      plates: this.plates, maxPlates: this.stats.maxPlates, levels: this.levels, flags: this.flags, standing: this.standing, place,
      hostiles: this.aliens.filter((a) => !a.fleeing && !a.ward && Math.hypot(a.x - s.x, a.z - s.z) < 60).length,
      supplies: this.supplies, kind: this.sortie.kind, netted: this.sortie.netted, behind: this.behind,
      notice: this.sortie.notice.tiers, toll: this.sortie.notice.toll, region: this.sortie.region, captain: this.sortie.notice.captain,
      wise: this.sortie.nemesis.wise, hunch: this.sortie.nemesis.hunch, here: this.sortie.here,
    };
  }

  /** Slow enough to look at something (a scene's watch). */
  stageSlow(): boolean { return Math.hypot(this.ship.vx, this.ship.vz) < topSpeed(this.hull) * 0.35; }

  /** What the player is doing: only a free sky hears a card (sim/desk.ts). */
  private busy(): Busy {
    const b = this.bk!, s = this.ship;
    if (b.jumpT >= 0 || b.spool > 0 || b.dockT > 0.2 || b.blockade === 'checkpoint') return 'transit';
    if (this.command.state !== 'idle' || this.aliens.some((a) => !a.fleeing && !a.ward && Math.hypot(a.x - s.x, a.z - s.z) < DESK.threat)) return 'fight';
    if (this.mineT > 0) return 'mining';
    const fast = Math.hypot(s.vx, s.vz) > topSpeed(this.hull) * 0.5;
    if (fast && this.field.rocks.some((r) => Math.hypot(r.x - s.x, r.z - s.z) < r.r + DESK.tight)) return 'tight';
    return 'free';
  }

  /**
   * A road stop's Jump Gate holds while its main beats are owed (sim/script.ts `owed`): the card at a stop, the scene at a relay
   * mast. A handshake not yet made holds it for as long as it takes: the mast is a short flight off. Anything else is given
   * GATE_HOLD seconds from the moment she is at the gate; then the gate lets her go, and what was owed is carried to the next
   * stop. The Slow Door also takes SLOW_DOOR seconds to open. Called only with the gate in reach.
   */
  private gateHeld(): boolean {
    const sc = this.script;
    const h = this.holdOf();
    if (!h) return false;
    // (the Narrows' reboot has its own notice, as the gate goes down)
    // (a call's changing blocker, a hostile then calm, is the HUD line's to follow, not a new notice each time)
    const kind = /^(wait for the call|clear the hostiles|hold still)/.test(h.why) ? 'a call is due' : h.why;
    // a gate that waits on a story place says so once she makes for it, not while she is at the place itself (the HUD shows it from afar)
    const b = this.bk!, dl = Math.hypot(b.lane.x - this.ship.x, b.lane.z - this.ship.z);
    const early = h.why === '{who} first' && dl > APPROACH * 1.5;
    // a call that is only waiting its turn is told on the HUD's gate line; the notice comes only if it keeps her waiting, so a card due at
    // the gate opens on its own and not after "holding", then "open" (23 November 2026: every place-less stop said both round its card)
    if (this.holdAt === Infinity && !h.paint && !h.handshake) this.holdAt = this.runTime;
    const due = kind === 'a call is due' && /^wait for the call/.test(h.why) && this.runTime - this.holdAt < CALL_QUIET;
    if (this.holdNoted !== kind && h.why !== 'the gate is rebooting' && !early && !due) {
      this.holdNoted = kind;
      // with the Warden key in, the gate is resetting: say so, so a gate that will not take her yet is never a mystery (the owner, 31 October 2026)
      this.events.push(h.resetting
        ? { type: 'storyNotice', tone: 'amber', headline: 'Jump Gate resetting', reason: 'Warden key accepted · opens in a moment' }
        : { type: 'storyNotice', tone: 'amber', headline: 'Jump Gate holding', reason: tr(h.why, { who: this.gateWho }) });
    }
    this.gateWhy = h.why;
    if (h.paint || h.handshake) return true;
    if (this.holdAt === Infinity) this.holdAt = this.runTime;
    if (!h.slow && this.runTime - this.holdAt >= GATE_HOLD) { sc!.release(this.flags, this.tankCap ? this.fuel / this.tankCap : 0); this.gateLet = true; return false; }
    return true;
  }

  /**
   * What holds the Jump Gate now, at any distance and with no side effects ('' reasons are never returned): the paint bay, a relay not yet
   * answered, the Slow Door, a beat owed. The gate's look and the HUD read it from afar, so a shut gate never looks open.
   */
  private holdOf(): { why: string; paint: boolean; handshake: boolean; slow: boolean; resetting: boolean } | null {
    const sc = this.script, b = this.bk;
    // the hull is still the company's grey (owner, 5 November 2026): the gate waits for the paint bay
    if (b?.def.first && b.yard && paintDue(this.flags)) return { why: 'Ned’s yard first', paint: true, handshake: false, slow: false, resetting: false };
    // the first system past Cerro: her gate is locked to Kellern's ID; the Warden relay by it opens it on her own key (the archive says so)
    if (b?.def.first && painted(this.flags) && !this.flags.has(relayKey(b.def))) return { why: 'wake the relay', paint: false, handshake: true, slow: false, resetting: false };
    if (!sc || !b || this.gateLet) return null;
    // the Narrows: locked by Custody until Ada's key is in, then down while it reboots under her key (sim/narrows.ts)
    if (b.def.script === 'narrows' && this.narrows !== 'done') {
      const key = this.flags.has(relayFlag('narrows'));
      if (key) return { why: 'the gate is rebooting', paint: false, handshake: false, slow: true, resetting: false };
      return { why: 'locked by Custody', paint: false, handshake: true, slow: false, resetting: false };
    }
    const o = sc.owed(this.flags, this.tankCap ? this.fuel / this.tankCap : 0);
    const slow = b.def.script === 'slowdoor' && this.runTime - this.desk.arrived < SLOW_DOOR;
    if (!o.any && !slow) return null;
    const lit = this.flags.has(relayFlag(b.def.script ?? ''));
    const resetting = lit && !o.handshake && !slow;
    const call = !o.handshake && !slow && !lit ? this.callHold() : null;
    this.gateWho = call?.who ?? '';
    // a beat that waits on a story place: the gate names the place (sim/places.ts)
    const at = o.handshake ? sc.owedPlace(this.flags, this.tankCap ? this.fuel / this.tankCap : 0) : null;
    const place = at ? STORY_PLACES.find((p) => p.id === at) : undefined;
    if (place) { this.gateWho = tr(place.name); return { why: '{who} first', paint: false, handshake: true, slow: false, resetting: false }; }
    return { why: o.handshake ? (this.wakeRelay ? 'wake the relay' : 'reach the relay mast') : slow ? 'the gate is opening' : lit ? 'resetting after the key' : call!.why, paint: false, handshake: o.handshake, slow, resetting };
  }

  /**
   * What the gate waits on when a card is owed, and what the player must do about it: the caller's name, and whether the call is
   * held back by a hostile near her, by mining or tight flying (she must clear it or hold still), or only by the queue ahead of it.
   */
  private callHold(): { why: string; who: string } {
    const row = this.script?.owedRow(this.flags, this.tankCap ? this.fuel / this.tankCap : 0);
    const def = row && 'card' in row.do ? CARD_BY_ID[row.do.card] : undefined;
    const who = (def?.from ?? '').split(' · ')[0]!;
    const busy = this.busy();
    const kind = busy === 'fight' || this.aliens.some((a) => !a.fleeing && !a.ward && Math.hypot(a.x - this.ship.x, a.z - this.ship.z) < DESK.threat * 2) ? 'clear' : busy === 'mining' || busy === 'tight' ? 'still' : 'wait';
    const why = who
      ? kind === 'clear' ? 'clear the hostiles · {who} will call' : kind === 'still' ? 'hold still · {who} will call' : 'wait for the call from {who}'
      : kind === 'clear' ? 'clear the hostiles · a call will come' : kind === 'still' ? 'hold still · a call will come' : 'wait for the call';
    return { why, who };
  }

  /** Who the call is from, while the gate waits on one (the HUD names it). */
  gateWho = '';

  /** Seconds the Slow Door still needs (0 elsewhere, and once it is open). */
  get gateEta(): number {
    // a call or a beat owed: the gate lets her go when the hold runs out, whatever the call is waiting on
    if (this.holdAt < Infinity && !this.gateLet && /^(wait for the call|clear the hostiles|hold still)/.test(this.gateWhy)) return Math.max(0, Math.ceil(GATE_HOLD - (this.runTime - this.holdAt)));
    if (this.bk?.def.script === 'narrows' && this.narrows !== 'done') return this.narrows === 'reboot' ? Math.max(0, Math.ceil(REBOOT - (this.runTime - this.narrowsAt))) : REBOOT;
    return this.bk?.def.script === 'slowdoor' && !this.gateLet ? Math.max(0, Math.ceil(SLOW_DOOR - (this.runTime - this.desk.arrived))) : 0;
  }

  /** The gate's countdown while it reboots or opens, for the HUD (null otherwise): seconds left, of how many. */
  get gateTimer(): { left: number; total: number } | null {
    if (this.gateWhy !== 'the gate is rebooting' && this.gateWhy !== 'the gate is opening') return null;
    return { left: this.gateEta, total: this.bk?.def.script === 'narrows' ? REBOOT : SLOW_DOOR };
  }

  /** The stop's story place waiting for her now, where it stands, and how far through its hold she is (0 to 1). Null where none waits. */
  get storyPlace(): { def: StoryPlaceDef; x: number; z: number; held: number; heading?: number } | null {
    const b = this.bk;
    if (!b || !this.script) return null;
    const sc = this.script;
    const def = livePlace(STORY_PLACES, b.def.script, this.flags, (row) => this.rowHeard(row), (id) => sc.placeSpent(id));
    if (!def) return null;
    const held = 'hold' in def.act && this.placeHoldOf === def.id ? Math.min(1, this.placeHold / def.act.hold) : 0;
    const m = this.mover;
    if (m && m.id === def.id) return { def, x: m.x, z: m.z, held, heading: Math.atan2(-m.vz, m.vx) };
    const a = this.anchor;
    if (a && a.id === def.id) return { def, x: a.x, z: a.z, held };
    return { def, ...this.placeStart(def, b), held };
  }

  /** Where a place starts: a hull coming to her ahead of her, toward the gate; a canister at the hull that hands it across; a fixed one on her line to the gate, ahead of her if she is already past its spot. */
  private placeStart(def: StoryPlaceDef, b: Breakout): { x: number; z: number } {
    const s = this.ship, e = this.escort;
    if (handed(def)) return e ? { x: e.x, z: e.z } : { x: s.x - Math.sin(s.heading) * ALONGSIDE, z: s.z - Math.cos(s.heading) * ALONGSIDE };
    const at = placeAt(def, b);
    const d = Math.hypot(b.lane.x, b.lane.z) || 1, fx = b.lane.x / d, fz = b.lane.z / d;
    const her = s.x * fx + s.z * fz, its = at.x * fx + at.z * fz;
    if (meets(def)) {
      if (Math.hypot(s.x, s.z) < 60) return at;
      // she has flown on: it comes out from ahead of her, between her and the gate
      const dx = b.lane.x - s.x, dz = b.lane.z - s.z, dd = Math.hypot(dx, dz) || 1, a = Math.min(160, dd * 0.6);
      return { x: s.x + (dx / dd) * a + (dz / dd) * 30, z: s.z + (dz / dd) * a - (dx / dd) * 30 };
    }
    if (def.trail || her < its - 30) return at;
    // she is past its spot: it stands ahead of her instead, never behind
    const side = at.x * -fz + at.z * fx, on = her + Math.min(150, Math.max(40, (d - her) * 0.5));
    return { x: fx * on - fz * side, z: fz * on + fx * side };
  }

  /** The Severance where she can see it (sim/scars.ts): the dead gate, the work lane, the billboard. */
  get severance(): Scars {
    const b = this.bk;
    return b ? scarsOf(b, this.flags) : { dead: null, queue: null, board: null };
  }

  /** The first dead gate she passes is named, once in the journey; after that she knows one when she sees it. */
  private stepScars(): void {
    if (this.flags.has(DEAD_GATE_SEEN) || this.phase !== 'play') return;
    const dead = this.severance.dead;
    if (!dead || Math.hypot(this.ship.x - dead.x, this.ship.z - dead.z) > DEAD_GATE_SEEN_R) return;
    this.flags.add(DEAD_GATE_SEEN);
    this.events.push({ type: 'storyNotice', tone: 'white', headline: 'Dead gate', reason: 'shut on Severance night, seventy years ago' });
  }

  /** The live story place: hold at it or take it aboard; done, its flag is set and the stop's script goes on (sim/places.ts). */
  private stepStoryPlace(dt: number): void {
    if (this.phase !== 'play') return;
    this.stepEscort(dt);
    const sp = this.storyPlace;
    if (!sp) return;
    if (this.placeHoldOf !== sp.def.id) { this.placeHoldOf = sp.def.id; this.placeHold = 0; }
    const moving = meets(sp.def) || handed(sp.def);
    if (moving) {
      // the story comes to her: the hull flies out and keeps pace off her port side; what it hands across flies to her
      if (this.mover?.id !== sp.def.id) this.mover = { id: sp.def.id, x: sp.x, z: sp.z, vx: 0, vz: 0 };
      // a hull keeps station ahead of her, in sight, until its hail is heard; then it comes alongside
      if (meets(sp.def)) stepMeet(this.mover, this.ship, topSpeed(this.hull), dt, alongside(sp.def), this.hailed(sp.def) ? 0 : STATION);
      else stepHanded(this.mover, this.ship, dt);
      sp.x = this.mover.x; sp.z = this.mover.z;
    } else {
      if (this.anchor?.id !== sp.def.id) this.anchor = { id: sp.def.id, x: sp.x, z: sp.z };
      // room at a fixed place: no rock or bulwark in the ring
      const clear = sp.def.r + PLACE_CLEAR;
      for (const o of [...this.field.rocks, ...this.field.bulwarks]) {
        const dx = o.x - sp.x, dz = o.z - sp.z, d = Math.hypot(dx, dz) || 1, min = clear + o.r;
        if (d < min) { o.x = sp.x + (dx / d) * min; o.z = sp.z + (dz / d) * min; }
      }
    }
    // a fixed place counts once the arrival is over (a hull alongside counts at once: it has come to talk); a fight does not stop either
    const free = meets(sp.def) ? this.hailed(sp.def) : !this.floor.hush;
    const r = stepPlace(sp.def, sp, this.ship, this.placeHold, dt, free);
    this.placeHold = r.hold;
    if (!r.done) return;
    this.flags.add(sp.def.done);
    this.placeHold = 0; this.placeHoldOf = '';
    // the hull stays alongside while it hands anything across, then peels away
    if (meets(sp.def) && this.mover) this.escort = { ...this.mover, look: sp.def.look, t: 0, leaving: false };
    this.mover = null;
    const pickup = 'pickup' in sp.def.act;
    this.events.push({ type: 'placeDone', x: sp.x, z: sp.z, look: sp.def.look, pickup });
    if (pickup) this.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Taken aboard', reason: sp.def.name });
  }

  /** The hull that came alongside: it keeps pace while it has anything to hand across, a few seconds more, then peels off to port and away. */
  private stepEscort(dt: number): void {
    const e = this.escort;
    if (!e) return;
    const sp = this.storyPlace, handing = !!sp && handed(sp.def);
    e.t = handing ? 0 : e.t + dt;
    if (!e.leaving && e.t > ESCORT_STAY) e.leaving = true;
    if (!e.leaving) stepMeet(e, this.ship, topSpeed(this.hull), dt, e.look === 'ferry' ? 9.5 : ALONGSIDE);
    else if (stepLeave(e, this.ship, topSpeed(this.hull), dt)) this.escort = null;
  }

  /**
   * A script row has been heard: a radio line once the floor has let it out (not just queued), anything else once it has played. The
   * story waits on what she has heard, so a hull never pulls alongside before its hail, nor a canister flies across before the line
   * that says it is coming (owner, 24 November 2026: "Ilse's line is shown after she meets").
   */
  rowHeard(row: string): boolean {
    const sc = this.script;
    if (!sc || !sc.played(row)) return false;
    const r = SCRIPT_BY_ID.get(row);
    if (!r || !('radio' in r.do)) return true;
    // heard, not just begun: a moment into the line, so what it says is coming comes after it
    return this.floor.log.some((l) => (l.id === `story_${row}` || l.id === `scene_${row}` || l.id === `say_${row}` || l.id === `cue_${row}`) && this.runTime - l.t >= HEARD);
  }

  /** A hull's hail has been heard, or is not coming (its row never triggered once the arrival was over and a little more). */
  private hailed(def: StoryPlaceDef): boolean {
    if (!def.hail) return true;
    if (this.rowHeard(def.hail)) return true;
    return !this.script?.triggered(def.hail) && this.runTime - this.desk.arrived > FLOOR.arrival + 4;
  }

  /** The story is still talking at the gate: a radio line queued or on screen. The drive waits (silently, at most LISTEN s) so a jump never cuts a line off or leaves it unsaid. */
  private listening(): boolean {
    for (const r of this.mainLines) if (this.rowHeard(r)) this.mainLines.delete(r);
    // only on the road's stops, where the script speaks: the opening's jump keeps its own timing
    const talking = !!this.script && (this.script.talking || this.floor.holding || this.floor.busy(this.runTime));
    if (!talking || this.floor.hush) { this.listenAt = Infinity; return false; }
    if (this.listenAt === Infinity) this.listenAt = this.runTime;
    // a main beat still to be said holds her longer than a passing line
    return this.runTime - this.listenAt < (this.mainLines.size ? LISTEN_MAIN : LISTEN);
  }
  /** Main beats' radio lines played but not yet heard (World.listening). */
  private mainLines = new Set<string>();
  private listenAt = Infinity;

  /** A road gate's relay that she wakes herself (sim/uplink.ts): every relay but the Narrows', until it is awake. */
  get wakeRelay(): { x: number; z: number } | null {
    const b = this.bk;
    if (!b || b.def.script === 'narrows' || this.uplink >= 1 || this.flags.has(relayKey(b.def)) || (b.def.first && !painted(this.flags))) return null;
    return relayOf(b);
  }

  /** She is in the relay's ring and the charge is running. */
  get uplinking(): boolean {
    const rl = this.wakeRelay;
    // (a given relay: the locals wake it, and she only has to hold near it)
    return !!rl && this.phase === 'play' && !this.floor.hush && Math.hypot(this.ship.x - rl.x, this.ship.z - rl.z) < (this.given ? GIVEN_R : UPLINK_R);
  }

  /** A given relay (content/road.ts LEG_RELAYS) whose locals stand with her: they wake it while she holds near. */
  get given(): boolean {
    return this.bk?.def.twist === 'given' && this.flags.has(GIVEN_FLAG);
  }

  /** The uplink: inside the relay's ring the charge runs; each stage is told, and the first two send a wave. */
  private stepRelay(dt: number): void {
    const rl = this.wakeRelay, b = this.bk;
    // a woken relay opens the lane: the trade comes through the gate again (a reload of the system finds it open, without the voice)
    if (b && !this.laneOpened && b.def.script !== 'narrows' && relayOf(b) && this.flags.has(relayKey(b.def))) this.openLane(this.uplink >= 1);
    if (!rl || !b || this.phase !== 'play') return;
    this.stepTwist(rl);
    this.stepHunters(rl, dt);
    this.stepPulse(rl);
    this.stepCover(rl, dt);
    // a rock or a guard on the mast holds the charge; a tether hunter drags it
    const blk = this.uplinkBlock;
    const r = stepUplink(this.uplink, this.uplinking, !blk ? 1 : blk === 'Drive the hunter off the relay' ? HUNTED_RATE : 0, dt);
    this.uplink = r.charge;
    if (!r.stage) return;
    const gate = b.def.first ? -1 : Math.max(0, GATES.findIndex((g) => g.script === b.def.script) - 1);
    const reach = !!(b.def.script && REACH_RELAYS[b.def.script]);
    const wave = uplinkWave(r.stage, waveTier(!!b.def.first, reach, gate));
    const hunted = wave.some((w) => w.hunter);
    // the first system has no stop script: the woken relay is told here, and Sam follows it
    if (r.stage === 3 && b.def.first) {
      this.flags.add(relayKey(b.def));
      // (its own notice says the gate is open: the gate's "open · fly through" would say it twice)
      this.holdNoted = 'open';
      this.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Warden key accepted', reason: 'Jump Gate open', main: true });
      this.radioLines('sam_relay', tr('Sam Okoro'), 'miners', [tr(SAM_RELAY)]);
    }
    // (elsewhere the last stage is told by the stop's own row: "Warden key accepted", content/script/arrivals.ts)
    // a split relay: this mast is awake, the next is marked (the core wakes on the third)
    const split = b.def.twist === 'split';
    if (split) {
      b.split = r.stage;
      if (r.stage < 3) { const m = SPLIT_MASTS[r.stage]!; b.drift = this.backFrom(m.back, m.across); }
    }
    if (r.stage < 3 && split) this.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Mast awake', reason: hunted ? 'a tether hunter is coming' : 'fly to the next mast', main: true });
    else if (r.stage < 3) this.events.push(r.stage === 1
      ? { type: 'storyNotice', tone: 'amber', headline: 'Relay waking', reason: 'Custody traced the uplink', main: true }
      : { type: 'storyNotice', tone: 'amber', headline: 'Relay dish turning', reason: hunted ? 'a tether hunter is coming' : reach ? 'the core is warming' : 'more Custody inbound', main: true });
    const rows = (h: boolean) => wave.filter((w) => !!w.hunter === h).map((w) => ({ variant: w.variant, n: w.n, from: 'ahead' as const }));
    if (rows(false).length) this.applyOutcome({ text: '', spawn: rows(false) }, 0, []);
    if (hunted) for (const id of this.applyOutcome({ text: '', spawn: rows(true) }, 0, [])) this.hunters.add(id);
    // the locals she helped come out at the first wave (content/waves.ts COVER)
    if (r.stage === 1 && !this.cover) {
      const c = COVER.find((x) => x.stop === b.def.script && this.flags.has(x.flag));
      if (c) { this.cover = c; this.radioLines(`cover_${c.stop}`, tr(c.from), c.caller, [tr(c.line)], 2); }
    }
  }

  /** Tether hunters (content/waves.ts): hulls that make for the mast and hold the charge while they sit by it. */
  private hunters = new Set<number>();
  /** Whether this wake's damping pulse has gone, and the locals flying cover (null: none), and their next shot. */
  private pulsed = false;
  private cover: CoverRow | null = null;
  private coverT = 0;

  /** Hostile hulls near the mast that hold the charge: a guard on a guarded relay, or a tether hunter. */
  private onMast(rl: { x: number; z: number }): Alien[] {
    const guarded = this.bk?.def.twist === 'guarded';
    return this.aliens.filter((a) => !a.ward && !a.fleeing && (guarded || this.hunters.has(a.id)) && Math.hypot(a.x - rl.x, a.z - rl.z) < GUARD_HOLD);
  }

  /** A hunter closes on the mast on top of its own flying, and settles there. */
  private stepHunters(rl: { x: number; z: number }, dt: number): void {
    if (!this.hunters.size) return;
    for (const id of this.hunters) {
      const al = this.aliens.find((a) => a.id === id);
      if (!al) { this.hunters.delete(id); continue; }
      if (al.fleeing || al.snare > 0) continue;
      const dx = rl.x - al.x, dz = rl.z - al.z, d = Math.hypot(dx, dz);
      if (d <= HUNT_SIT) continue;
      const v = Math.min(d - HUNT_SIT, HUNT_PULL * dt);
      al.x += (dx / d) * v; al.z += (dz / d) * v;
    }
  }

  /**
   * The relay's damping pulse: once a wake, once its lamps are lit, it throws the hulls crowding its ring outward and snares them a
   * moment. It goes by itself when a guard or a hunter sits on the mast, or when the ring is crowded while she holds the key.
   */
  private stepPulse(rl: { x: number; z: number }): void {
    if (this.pulsed || this.uplink < 1 / 3 - 1e-9) return;
    const near = this.aliens.filter((a) => !a.ward && !a.fleeing && this.committed(a) && Math.hypot(a.x - rl.x, a.z - rl.z) < PULSE_R);
    if (!this.onMast(rl).length && !(this.uplinking && near.length >= PULSE_CROWD)) return;
    this.pulsed = true;
    for (const a of near) {
      const dx = a.x - rl.x, dz = a.z - rl.z, d = Math.hypot(dx, dz) || 1;
      a.vx = (dx / d) * PULSE_PUSH; a.vz = (dz / d) * PULSE_PUSH;
      // (thrown past the mast's hold, so the charge runs again while they come back)
      const out = Math.max(d, GUARD_HOLD + 20);
      a.x = rl.x + (dx / d) * out; a.z = rl.z + (dz / d) * out;
      a.snare = Math.max(a.snare, PULSE_SNARE);
    }
    this.events.push({ type: 'relayPulse', x: rl.x, z: rl.z, r: PULSE_R });
    this.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Relay pulse', reason: 'the ring is clear for now', main: true });
  }

  /** The locals' guns: a shot at the nearest hostile hull near the mast every few seconds, for the rest of the wake. */
  private stepCover(rl: { x: number; z: number }, dt: number): void {
    if (!this.cover || (this.coverT -= dt) > 0) return;
    this.coverT = COVER_EVERY;
    let best: Alien | null = null, bd = COVER_R;
    for (const a of this.aliens) {
      if (a.ward || a.fleeing || !this.committed(a)) continue;
      const d = Math.hypot(a.x - rl.x, a.z - rl.z);
      if (d < bd) { bd = d; best = a; }
    }
    if (!best) return;
    this.events.push({ type: 'flak', x: best.x, y: best.y, z: best.z });
    this.hurtAlien(best, COVER_DMG, 'hazard', best.x, best.y, best.z);
  }

  /** A buried relay's rock, while it sits on the mast (sim/uplink.ts); whether a guarded relay's picket has been sent. */
  private burial: Bulwark | null = null;
  private buried = false;
  private guardsSent = false;
  private adriftTold = false;

  /** An offset from where the relay stands, back toward where she came in and across (sim/breakout.ts laneBack). */
  private backFrom(back: number, across: number): { x: number; z: number } { return laneBack(this.bk!.lane, back, across); }

  /** A relay's twist (content/road.ts REACH_RELAYS): the rock on a buried mast, held where it sits; the picket on a guarded one, when she comes near. */
  private stepTwist(rl: { x: number; z: number }): void {
    const tw = this.bk?.def.twist;
    if (tw === 'buried') {
      if (!this.buried) { this.buried = true; this.burial = this.field.bury(rl.x, rl.z, BURIED_R, BURIED_HP); }
      // (the rock is pinned: the field never wraps it round the ship, sim/field.ts)
      if (this.burial && !this.field.bulwarks.includes(this.burial)) {
        this.burial = null;
        this.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Relay clear', reason: 'hold in its ring', main: true });
      }
    }
    if (tw === 'adrift') {
      // the mast tumbles on a slow loop out from where it stood: she keeps in its ring as it goes (it steadies once awake)
      const a = (this.runTime / ADRIFT_LOOP) * Math.PI * 2;
      this.bk!.drift = this.backFrom(ADRIFT_OUT + ADRIFT_A * Math.sin(a), ADRIFT_B * Math.sin(2 * a));
      if (!this.adriftTold && Math.hypot(this.ship.x - rl.x, this.ship.z - rl.z) < ADRIFT_TELL) {
        this.adriftTold = true;
        this.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Relay adrift', reason: 'keep in its ring as it tumbles', main: true });
      }
    }
    if (tw === 'guarded' && !this.guardsSent && Math.hypot(this.ship.x - rl.x, this.ship.z - rl.z) < GUARD_WAKE) {
      this.guardsSent = true;
      for (let i = 0; i < GUARDS; i++) {
        const a = (i / GUARDS) * Math.PI * 2;
        this.spawnHostile('picket', { x: rl.x + Math.cos(a) * 30, y: 0, z: rl.z + Math.sin(a) * 30 }, null, true);
      }
      this.events.push({ type: 'storyNotice', tone: 'red', headline: 'Relay guarded', reason: 'drive them off the mast', main: true });
    }
  }

  /** Why the uplink cannot run at a relay with a twist ('' when it can): the HUD's objective says what to do (English, for t()). */
  get uplinkBlock(): string {
    const rl = this.wakeRelay;
    if (!rl) return '';
    if (this.burial) return 'Mine the relay clear';
    const sit = this.onMast(rl);
    if (sit.length) return this.bk?.def.twist === 'guarded' && !sit.some((a) => this.hunters.has(a.id)) ? 'Drive the guards off the relay' : 'Drive the hunter off the relay';
    return '';
  }

  /** The lane is open on this sortie (World.openLane). */
  laneOpened = false;

  /** A woken relay's lane: hulls come through the gate (sim/traffic.ts), and one of them says so on the radio a little after the key. */
  private openLane(voice: boolean): void {
    this.laneOpened = true;
    if (!this.traffic) this.traffic = new Traffic(this, { n: 0, patrols: false, routes: [], busy: false });
    this.traffic.openLane(this);
    if (!voice) return;
    const line = LANE_LINES[(GATES.findIndex((g) => g.script === this.bk?.def.script) + 1) % LANE_LINES.length]!;
    this.radioLines('lane_open', tr('Hauler captain'), 'frontier', [tr(line)], 6);
  }

  /** Where the relay mast stands that the gate waits on, while it waits on it (the HUD names its range). */
  get gateRelay(): { x: number; z: number } | null {
    const b = this.bk;
    return b && (this.gateWhy === 'reach the relay mast' || this.gateWhy === 'wake the relay' || this.gateWhy === 'locked by Custody') ? relayOf(b) : null;
  }

  /** Why the Jump Gate is holding her now, in English for t() ('' when it is not): the HUD's sub-line. */
  gateWhy = '';

  /**
   * What the stop asks of her now, for the HUD and the pause card (translated). A stop's arrival line holds while its main beat is
   * still to come; once that has played, the goal is the way out (`Jump to …`) and the line goes, or stays as a quiet line where
   * the stop has no beat of its own (it says what the place is). The Slow Door counts down.
   */
  storyGoal(): { main?: string; quiet: string[]; out?: boolean } {
    const sc = this.script;
    // before the stop's line has played (a delayed one), it is shown already; a stop with none has the way out
    const first = sc && !this.storyObjective ? sc.arrivalLine() : undefined;
    const way = sc && !this.storyObjective && !first ? sc.leaveLine() : undefined;
    const o = this.storyObjective ?? (first ? { main: first.main && tr(first.main), quiet: first.quiet && tr(first.quiet), from: 'arrive' } : way ? { main: tr(way) } : null);
    if (!o) return { quiet: [] };
    let main = o.main;
    let quiet = o.quiet ? [o.quiet] : [];
    // whether the line is the way out (the Jump Gate), so the HUD may put the gate's range beside it
    let out = this.storyObjective ? this.storyObjective.from === 'leave' : !first && !!way;
    if (o.from === 'arrive' && sc && main && main !== tr('Rest here, or keep moving') && !sc.mainsLeft(this.flags, this.tankCap ? this.fuel / this.tankCap : 0)) {
      const leave = sc.leaveLine();
      // a stop with no beat keeps what it is, without its "Next:"
      if (!sc.hasMains()) quiet = [main.replace(/^[^·:]+:\s*/, ''), ...quiet];
      main = leave ? tr(leave) : undefined;
      out = true;
    }
    if (this.bk?.def.script === 'slowdoor') {
      const left = Math.ceil(SLOW_DOOR - (this.runTime - this.desk.arrived));
      const now = left > 0 ? `${tr('Opening')} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : tr('Gate open');
      quiet = quiet.map((q) => (q === tr('Opening · 3:00') ? now : q));
    }
    return { main, quiet, out };
  }

  /** When the gate first held her (Infinity: not yet), whether it has let go, and whether she was told. */
  private holdAt = Infinity;
  /** A card earned at a place, waiting only for the scene's queued voices (sim/script.ts `now`). */
  private nowCard: CardDef | null = null;
  /** The stop's own arrival line (its zone notice's reason), told by the jump's title card, not as a second notice under it. */
  arrivalLine: { tone: 'teal' | 'amber' | 'red' | 'white'; reason: string } | null = null;
  private gateLet = false;
  /** The hold's reason last told to her ('' when none): a new reason is told again, and the gate opening is told once. */
  private holdNoted = '';

  /** The Narrows' scene (sim/narrows.ts): where it stands, when the gate went down, the blockade's hulls, and what is done. */
  private narrows: NarrowsState | null = null;
  private narrowsAt = 0;
  private narrowsHulls: number[] = [];
  private patienceSaid = false;
  private patienceAnswered = false;

  /** The Narrows gate is down and its damping field with it: no safe ring, and hostile hulls come in. */
  get fieldDown(): boolean { return this.narrows === 'reboot'; }

  /**
   * The Narrows, once Ada's note has closed: the gate reboots under her key with its field down, the blockade comes, and the Patience
   * calls in the middle of it. Their first encounter: she asks, she watches, and the fight plays out whatever Juno answers. A journey that reaches the Narrows with the note read finds it open.
   */
  private stepNarrows(t: number): void {
    const f = this.flags;
    this.narrows ??= f.has(NOTE) ? 'done' : 'idle';
    if (this.narrows === 'done' || this.comms || this.call) return;
    if (this.narrows === 'idle') {
      if (!f.has(NOTE)) return;
      this.narrows = 'reboot';
      this.narrowsAt = t;
      f.add(REBOOTING);
      f.add('ashgrove_met');
      this.events.push({ type: 'storyNotice', tone: 'amber', headline: 'Jump Gate rebooting', reason: 'damping field down' });
      this.holdNoted = 'the gate is rebooting';
      // a "locked" notice still waiting its turn is out of date now
      this.floor.drop((e) => e.type === 'storyNotice' && e.headline === 'Jump Gate holding');
      // the blockade: the Kind Regard and her pickets, from the gate's side
      this.narrowsHulls = this.applyOutcome({ text: '', spawn: [{ variant: 'lancer', n: 1, from: 'ahead' }, { variant: 'picket', n: 2, from: 'ahead' }] }, 0, []);
      return;
    }
    const since = t - this.narrowsAt;
    if (!this.patienceSaid && since >= PATIENCE_AT) {
      this.patienceSaid = true;
      this.events.push({ type: 'storyNotice', tone: 'red', headline: 'CCV Patience inbound', reason: 'a Governor’s ship' });
    }
    const card = CARD_BY_ID[PATIENCE];
    if (card && this.patienceSaid && since >= PATIENCE_AT + PATIENCE_CARD && !this.cardsSeen.has(PATIENCE) && this.phase === 'play') { this.openComms(card); return; }
    if (this.cardsSeen.has(PATIENCE) && !this.patienceAnswered) {
      // she studies, she does not bargain (owner, 14 November 2026): the blockade fights on whatever Juno said
      this.patienceAnswered = true;
      this.events.push({ type: 'ping', id: 'narrows_watch', from: tr('Governor Idris Calloway'), caller: 'calloway', text: tr('“Kind Regard, carry on. I want to see what she does with ninety seconds.”'), moment: 'calm', system: this.bk?.def.name ?? '' });
    }
    if (since >= REBOOT && this.cardsSeen.has(PATIENCE)) {
      this.narrows = 'done';
      f.add(GATE_OPEN);
      this.holdNoted = 'open';
      this.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Jump Gate open', reason: 'fly through' });
    }
  }

  /** A hub beat of the stop's script is still due: a job's call waits for it. */
  scriptHoldsJob(): boolean { return !!this.script?.holdsJob(this.flags, this.tankCap ? this.fuel / this.tankCap : 0); }

  /** A free moment for the story: nothing hostile near or firing, no card or call open or a job's call waiting to ring (it goes first), no job fight, not in a ring or a jump (a road gate's ring is fine). */
  private scriptFree(busy: Busy, t: number): boolean {
    // waiting at a shut gate, she is waiting for this: a job she has taken, mining or flying among rocks no longer hold the story back (owner,
    // 14 November 2026: a taken job kept the stop's call from ever coming while the HUD said to wait for it); only a fight does
    // (a gate held for a handshake, a story place's beat, has no clock: being at it, in its ring, is waiting too, or a card she flew
    // away from before it opened would never come there, and the gate would hold her for good: found 23 November 2026)
    const waiting = this.holdAt < Infinity || (this.safe === 'lane' && !!this.gateWhy);
    return (busy === 'free' || (waiting && (busy === 'mining' || busy === 'tight'))) && !this.call && !this.comms && !this.desk.eagerWaiting() && !this.floor.busy(t) && (!this.safe || this.bk?.def.script === 'narrows' || !!this.bk?.def.relay || waiting) && (!this.stage?.taken || waiting) && t - this.desk.lastThreat >= DESK.settle.major && (waiting || t - this.desk.lastMine >= DESK.mineSettle);
  }

  /** Days until Custody's pursuit is here, in half days (Infinity off the road, in the first system past Cerro, at a breather, or with no pursuit): the HUD's readout. */
  get pursuitDays(): number {
    const b = this.bk;
    if (!b || !this.script || b.def.first || b.def.quiet) return Infinity;
    return Math.max(0, halfDays((this.sortie.calloway ?? Infinity) / DAY_SECONDS - this.runTime / DAY_SECONDS));
  }

  private scriptCtx(busy: Busy, t: number) {
    const b = this.bk!, s = this.ship;
    // a relay she wakes herself is reached when it is awake (sim/uplink.ts); the Narrows' when she comes near
    // (a woken relay is told wherever she is: a given one wakes while she holds further off, an adrift one tumbles away)
    const sites: Record<string, { x: number; z: number } | null> = { gate: b.lane, port: b.port, audit: b.audit, relay: b.def.script === 'narrows' ? relayOf(b) : this.uplink >= 1 ? { x: this.ship.x, z: this.ship.z } : null };
    for (const p of stopPlaces(STORY_PLACES, b.def.script, this.flags)) sites[p.id] = placeAt(p, b);
    return {
      t, arrived: this.desk.arrived, busy, free: this.scriptFree(busy, t), slow: this.stageSlow(), tank: this.tankCap ? this.fuel / this.tankCap : 0, flags: this.flags,
      // the first system past Cerro has its own word on the pursuit (stolen): the days count from the next stop
      pursuit: b.def.first ? Infinity : Math.max(0, halfDays((this.sortie.calloway ?? Infinity) / DAY_SECONDS - t / DAY_SECONDS)),
      dist: (site: string) => { const p = sites[site]; return p ? Math.hypot(p.x - s.x, p.z - s.z) : Infinity; },
      lane: Math.hypot(b.lane.x, b.lane.z),
      cardDone: (id: string) => this.cardsSeen.has(id) && !this.comms && !this.call,
      placeDone: (id: string) => { const p = STORY_PLACES.find((x) => x.id === id); return !!p && placeDone(p, this.flags); },
    };
  }

  /** What a script row does when it plays. */
  private playOutput(o: Output): void {
    const name = this.bk?.def.name ?? '';
    // a line may carry what the flags add up to: the debt left, the relays lit
    const vars = { debt: debtLeft(this.flags), relays: relaysLit(this.flags) };
    if ('radio' in o && o.radio.main && o.radio.row) this.mainLines.add(o.radio.row);
    if ('radio' in o) this.events.push({ type: 'ping', id: `${o.radio.live ? 'say' : o.radio.cue ? 'cue' : o.radio.scene ? 'scene' : 'story'}_${o.radio.row ?? this.runTime.toFixed(1)}`, from: tr(o.radio.from), caller: o.radio.caller, text: tr(o.radio.text, vars), moment: 'calm', system: name });
    // a stop's arrival notice names the system: the jump's title card names it already, so its reason becomes the card's kicker (23 November 2026)
    else if ('notice' in o && this.bk && o.notice.headline === this.bk.def.name && o.notice.reason && this.runTime - this.desk.arrived < 3) this.arrivalLine = { tone: o.notice.tone, reason: o.notice.reason };
    else if ('notice' in o) this.events.push({ type: 'storyNotice', tone: o.notice.tone, headline: o.notice.headline, reason: o.notice.reason && (o.notice.reason.includes('{') ? tr(o.notice.reason, vars) : o.notice.reason), ...(o.notice.near ? {} : { main: true }) });
    else if ('objective' in o) this.storyObjective = { main: o.objective.main && tr(o.objective.main), quiet: o.objective.quiet && tr(o.objective.quiet), from: o.objective.from };
    else if ('card' in o) {
      const def = CARD_BY_ID[o.card];
      // an urgent card opens now in a fight, where the desk would hold it (the Narrows' note: the gate's reboot waits on it); otherwise the desk
      if (def && o.urgent && this.busy() === 'fight' && !this.comms && !this.call && this.phase === 'play') this.openComms(def);
      // a card earned at a story place opens as she finishes there (sim/script.ts `now`)
      // (a voice of the scene still queued goes first: the card waits for it here, not on the desk, so it still opens at the place)
      else if (def && o.now) this.nowCard = def;
      else if (def) this.desk.offer(def, 'major', this.runTime, false, true);
    }
    else if ('wall' in o) this.flags.add(o.wall);
    else if ('chase' in o) { const b = this.bk; if (b) { b.heat = Math.max(b.heat, 0.4); b.nextPursuit = Math.min(b.nextPursuit, this.runTime + 3); } }
    else this.flags.add(`pursuit_${o.pursuit}`);
  }

  /** Who calls, and when. Everything that wants to talk is offered to the desk, which says when it is heard. */
  private stepComms(): void {
    const b = this.bk!, t = this.runTime, s = this.ship, d = this.desk;
    if (!this.alive || this.phase !== 'play') return;
    const busy = this.busy();
    const was = this.wasBusy;
    this.wasBusy = busy;
    d.watch(busy, t);
    d.sweep(t, this.docked);
    // the recovery: nobody else calls while Lane Control flies her in, and Sam's channel opens once, 2 km out from the dock
    if (recovering(this.flags)) {
      const dock = b.audit, near = !!dock && Math.hypot(dock.x - s.x, dock.z - s.z) <= SAM_CALL_R;
      if (((near && !this.floor.busy(this.runTime)) || this.recoverT >= RECOVERY_T - 1e-6) && !this.cardsSeen.has(SAM_BEAT)) {
        const sam = CARD_BY_ID[SAM_BEAT];
        // his lines on the way in are said by now (his channel waits for them): any still waiting would land after his code
        this.radioQ.length = 0;
        this.floor.drop((e) => e.type === 'ping');
        if (sam) this.openComms(sam);
      }
      return;
    }
    // a call nobody picked up: the channel closes
    if (this.call && t >= this.callUntil) this.lapse();

    // the moments worth a word: the arrival, a fight won, a hold nearly full
    if (!this.arrivalSaid && t >= 5) { this.arrivalSaid = true; d.moment('arrive', t, this.deskRng); }
    if (busy === 'fight') this.fightT += 1 / 60;
    else if (was === 'fight' && busy !== 'transit') {
      if (this.fightT > 6) d.moment('won', t, this.deskRng);
      this.fightT = 0;
    }

    // follow-ups, once due
    const due = this.follows.findIndex((f) => f.at <= t && (!f.quick || this.phase === 'play'));
    if (due >= 0) {
      const [f] = this.follows.splice(due, 1);
      const def = CARD_BY_ID[f!.card];
      if (def && !this.cardsSeen.has(def.id)) {
        if (f!.quick) this.openComms(def);
        else {
          // the herald goes to the floor at once, so the card (offered below) waits for it, whatever else is quiet; the archive's
          // message follows its herald closely (the partition opening, then what is in it)
          if (def.herald && !this.wakeHerald) { this.wakeHerald = true; this.events.push({ type: 'storyNotice', tone: 'teal', headline: def.herald.headline, reason: def.herald.reason }); this.floor.take(this.events, t); }
          if (def.id === WAKE_BEAT) d.chain.add(def.id);
          d.offer(def, weightOf(def), t, false, def.trigger === 'story');
        }
      }
    }
    // the stop's story script: its lines wait for a safe moment and never drop (sim/script.ts)
    // the ghost: it comes after a while of quiet sky, and never in a fight
    if (this.ghost) stepGhost(this.ghost, s, (this.ghostAge += 1 / 60), 1 / 60);
    else if (!this.ghostMade && b.def.script === GHOST_STOP && this.scriptFree(busy, t) && (this.ghostWait += 1 / 60) >= GHOST_AFTER) {
      this.ghostMade = true;
      this.ghost = spawnGhost({ x: s.x, z: s.z, heading: s.heading });
      this.flags.add('ghost_here');
    }
    if (this.ghost?.near) this.flags.add('ghost_close');
    // what the flags add up to (relays lit, thread steps, the proofs), kept as flags for the script and the cards (sim/evidence.ts)
    if (this.flags.has(ON_ROAD)) derive(this.flags);
    else for (const [clue, sig] of SIG_CLUES) if (this.flags.has(clue)) this.flags.add(sig);
    if (this.script) for (const o of this.script.step(this.scriptCtx(busy, t))) this.playOutput(o);
    if (b.def.script === 'narrows' && this.flags.has(ON_ROAD)) this.stepNarrows(t);
    // the first system's docks always call when you come up on them, the depot once and the audit dock while its lock holds
    if (b.def.first && !this.docked) {
      const near = (p: { x: number; z: number } | null) => !!p && Math.hypot(s.x - p.x, s.z - p.z) < PORT_CALL;
      const hail = !this.portCalled && near(b.port) ? 'depot_hail' : !this.auditCalled && !lockLifted(this.flags) && near(b.audit) ? 'audit_hail' : null;
      // the depot says so on the radio, no card (owner 2026-10-31): flying into its ring docks
      if (hail === 'depot_hail') {
        this.portCalled = true;
        this.events.push({ type: 'ping', id: 'depot_hail', from: tr('Frontier Supply Depot'), caller: 'frontier', text: tr(DEPOT_LINE), moment: 'calm', system: b.def.name });
      } else if (hail) {
        this.auditCalled = true;
        d.offer(CARD_BY_ID[hail]!, 'major', t, true);
      }
    }
    // Ned's yard (owner, 5 November 2026): Sam's code leaves the hull grey; Ned does it for nothing when she holds in his ring. His line comes when the
    // ship comes up on the yard
    if (b.yard && paintDue(this.flags) && !this.docked && this.phase === 'play' && !this.paintCalled && Math.hypot(s.x - b.yard.x, s.z - b.yard.z) < PORT_CALL) {
      this.paintCalled = true;
      this.events.push({ type: 'ping', id: 'paint_bay', from: tr(PAINTER), caller: 'frontier', text: tr(PAINT_LINE), moment: 'calm', system: b.def.name });
    }
    // on the road a stop has one card at most, its own (living-world plan, 22 November 2026): no port approach card and no chance card
    const road = this.flags.has(ON_ROAD);
    // the port's approach calls once
    if (!road && !this.portCalled && !this.docked && b.port && Math.hypot(s.x - b.port.x, s.z - b.port.z) < PORT_CALL) {
      this.portCalled = true;
      const def = pickCard(this.commsCtx(), this.blocked(), this.rng, 'port');
      if (def && (weightOf(def) === 'major' || this.deskRng.next() < DESK.portNews)) d.offer(def, weightOf(def), t, true);
    }
    // a new card by chance: only on an opportunity, never on a timer alone, and few a sortie; none in the first system past Cerro, whose story is enough
    if (!road && !b.def.quiet && !b.def.first && t >= this.cardNext && d.wants(t, busy)) {
      const def = pickCard(this.commsCtx(), this.blocked(), this.rng);
      if (def) { d.offer(def, weightOf(def), t); d.used(); }
    }

    // deliver the one that is next, if the moment is right: a story line still waiting goes first, and a card is FLOOR.moments after the last
    // ...but the archive's message follows the paint card closely, once the herald has said it was found, and a job follows the story card by DESK.eager
    const chained = this.wakeHerald && !this.cardsSeen.has(WAKE_BEAT);
    const jobWaits = d.eagerWaiting(), heldForLines = jobWaits && this.floor.busy(t) && !this.floor.busy(t, true);
    // (the archive's message waits for its herald to be out: the partition opens, then what is in it)
    if (!this.call && !this.floor.busy(t, jobWaits) && !(chained && this.floor.waiting) && this.floor.mayMoment(t, chained ? 4 : jobWaits ? DESK.eager : undefined)) {
      const a = d.next(busy, t, heldForLines);
      if (a) {
        const pre = a.def.trigger === 'chance' || a.def.trigger === 'follow' || a.def.trigger === 'port' || a.def.trigger === undefined;
        if (!pre || condOk(a.def.when, this.commsCtx())) {
          if (a.tier === 'major') return this.openComms(a.def);
          this.openCall(a.def);
        }
      }
    }
    // the radio: a line, no answer. A card on the table has the screen. Filler (chatter, the weather desk, traffic advisories)
    // only once the first chapter is over: never in Cerro or the first system, and on the road not before the Narrows
    const filler = !b.def.home && !b.def.first && (!this.flags.has(ON_ROAD) || this.flags.has('sam_silent'));
    if (filler && !this.call && !this.script?.waiting()) {
      const m = d.pingFor(busy, t, this.deskRng);
      if (m) this.say(m);
    }
  }

  /**
   * A voice's lines on the radio one after another, as subtitle beats: the first after `delay` seconds of play, then one
   * every `gap`. They wait out a pause, and a new sortie drops any still waiting.
   */
  radioLines(id: string, from: string, caller: string, texts: readonly string[], delay = 0, gap = RADIO_GAP): void {
    const at = this.runTime + delay;
    texts.forEach((text, i) => this.radioQ.push({ at: at + i * gap, id: i ? `${id}_${i}` : id, from, caller, text }));
    this.radioQ.sort((a, b) => a.at - b.at);
    this.flushRadio();
  }

  private flushRadio(): void {
    if (!this.radioQ.length || this.phase !== 'play') return;
    const name = this.bk?.def.name ?? '';
    while (this.radioQ.length && this.radioQ[0]!.at <= this.runTime) {
      const r = this.radioQ.shift()!;
      this.events.push({ type: 'ping', id: r.id, from: r.from, caller: r.caller, text: r.text, moment: 'calm', system: name });
    }
  }

  /** The floor (sim/floor.ts): this step's radio lines and notices join the queue, and one may go out. */
  private speak(): void {
    this.floor.fight = !!this.bk && this.phase === 'play' && this.busy() === 'fight';
    this.floor.take(this.events, this.runTime);
    const e = this.floor.step(this.runTime, this.phase === 'play' && !this.call && this.alive);
    if (e) {
      this.events.push(e);
      // the first stroke of paint waits for her voice to have gone out
    }
  }

  /** One line on the radio for this moment, if one fits and has not been heard. */
  private say(m: Moment): void {
    const b = this.bk!, x = this.commsCtx();
    const pool = CHATTER.filter((c) => c.on.includes(m) && !this.heardChatter.has(c.id) && (!c.kind || c.kind.includes(x.kind)) && (c.netted === undefined || c.netted === x.netted));
    if (!pool.length) return;
    const c = pool[this.deskRng.int(pool.length)]!;
    this.heardChatter.add(c.id);
    this.desk.spoke(this.runTime);
    this.events.push({ type: 'ping', id: c.id, from: c.from, caller: c.caller, text: c.text, moment: m, system: b.def.name });
  }

  /** A card as a call: the world does not wait. It lapses if nobody answers. */
  private openCall(def: CardDef): void {
    useIds(this.ids);
    const o = openCard(def, this.commsCtx(), this.rng);
    this.cardsSeen.add(def.id);
    this.call = o;
    this.callUntil = this.runTime + (o.tier === 'important' ? DESK.window.important : DESK.window.routine);
    this.desk.closed(this.runTime);
    this.floor.opened(this.runTime, def.id);
    if (this.stage && this.stage.rangAt === null && def.id === this.stage.def.card) this.stage.rangAt = this.runTime;
    this.events.push({ type: 'call', id: def.id, tier: o.tier as 'important' | 'routine', kind: def.kind, from: o.def.from, title: o.def.title, seconds: this.callUntil - this.runTime });
  }

  /** Nobody answered: the channel closes and nothing happens. */
  private lapse(): void {
    const o = this.call;
    if (!o) return;
    this.call = null;
    this.desk.closed(this.runTime);
    this.floor.closed(this.runTime);
    this.run.cards.push({ id: o.def.id, choice: 'lapsed', won: false, t: Math.round(this.runTime) });
    this.events.push({ type: 'callEnd', id: o.def.id, lapsed: true });
    this.stage?.lapsed(this, o.def.id);
  }

  /** The raiders' toll in four facts: what stands between the ship and the hold. */
  private raidFacts(): LedgerRow[] {
    const armed = this.tutor?.pirates.length || 2;
    return [
      { k: 'Your hull', v: `${this.plates} / ${this.stats.maxPlates}` },
      { k: 'Torpedoes', v: String(this.arms.rack) },
      { k: 'Raiders armed', v: String(armed), tone: 'bad' },
      { k: 'Cargo at risk', n: Math.round(this.tutor?.onboard ?? this.cyrite) },
    ];
  }

  /** Put a card on the table: the world waits (or slows), and anyone it brings arrives. */
  openComms(def: CardDef): void {
    useIds(this.ids);
    this.lapse();
    const x = this.commsCtx();
    const o = openCard(def, x, this.rng);
    this.cardsSeen.add(def.id);
    this.desk.closed(this.runTime);
    this.floor.opened(this.runTime, def.id);
    if (def.ledger) o.ledger = ledgerFor(def.ledger);
    if (def.facts === 'raid') o.ledger = this.raidFacts();
    if (def.doc) o.doc = ledgerFor(def.doc.kind);
    this.comms = o;
    this.phase = 'comms';
    if (def.arrive) o.brought.push(...this.applyOutcome(def.arrive, o.fee, []));
    refresh(o, this.commsCtx());
    this.events.push({ type: 'comms', id: def.id, tier: 'major', kind: def.kind, from: o.def.from, title: o.def.title, slow: o.slow > 0 });
  }

  /** Answer the card on the table with choice `id` (or its index). False if it cannot be taken. `timedOut`: the slowed card ran out of time. */
  answer(id: string | number, timedOut = false): boolean {
    useIds(this.ids);
    const o = this.phase === 'comms' ? this.comms : this.call;
    if (!o) return false;
    const key = typeof id === 'number' ? o.choices[id]?.id : id;
    if (!key) return false;
    const x = this.commsCtx();
    let res = resolve(o, key, x, this.rng);
    // a timed-out default the ship cannot afford falls to the first choice it can
    if (!res && timedOut) { const ok = o.choices.find((c) => c.ok); if (ok) res = resolve(o, ok.id, x, this.rng); }
    if (!res) return false;
    this.cyrite -= res.cost.cyrite; this.supplies -= res.cost.supplies; this.fuel = Math.max(0, this.fuel - res.cost.fuel);
    if (o === this.call) this.call = null;
    else { this.comms = null; this.phase = 'play'; }
    this.desk.closed(this.runTime);
    this.floor.closed(this.runTime);
    this.applyOutcome(res.outcome, o.fee, o.brought);
    if (o.def.id === 'market_stall' && key !== 'on') this.market?.sold();
    this.rest();
    this.run.cards.push({ id: o.def.id, choice: res.choice.id, won: res.won, t: Math.round(this.runTime) });
    this.events.push({ type: 'commsAnswer', id: o.def.id, choice: res.choice.id, text: res.outcome.text, won: res.won });
    this.stage?.answered(this, o.def.id, res.choice.id, res.choice.tone, res.won, res.outcome);
    return true;
  }

  /** Do what an outcome says, at the card's fee. `brought`: the hulls the card brought in, for a dismissal. Returns the ids of any hulls it brings. */
  applyOutcome(out: Outcome, fee: number, brought: number[]): number[] {
    const b = this.bk;
    // Cyrite found or paid: in the Story the refinery takes it into the tank first, the rest is the purse; a loss comes out of the purse
    const dCy = amount(out.cyrite, this.cyrite, fee) + amount(out.chits, this.cyrite, fee, true);
    if (b && dCy > 0) { const r = refine(this.fuel, this.cyrite, this.tankCap, dCy); this.fuel = r.fuel; this.cyrite = Math.min(holdMax(this.flags), r.purse); }
    else this.cyrite = Math.min(holdMax(this.flags), Math.max(0, this.cyrite + dCy));
    this.supplies = Math.min(this.supplyMax, Math.max(0, this.supplies + amount(out.supplies, this.supplies, fee)));
    if (out.krail) {
      const k = b ? cy(out.krail) : out.krail;
      if (b && k > 0) { const r = refine(this.fuel, this.cyrite, this.tankCap, k); this.fuel = r.fuel; this.cyrite = Math.min(holdMax(this.flags), r.purse); }
      else this.cyrite = Math.max(0, this.cyrite + k);
    }
    if (out.fuel && b) {
      // fluid handed over: into the tank, and what it cannot hold is worth the same in Cyrite
      if (out.fuel > 0) { const r = refine(this.fuel, this.cyrite, this.tankCap, out.fuel); this.fuel = r.fuel; this.cyrite = Math.min(holdMax(this.flags), r.purse); }
      else this.fuel = Math.max(0, this.fuel + out.fuel);
    }
    if (out.hunt) this.huntDelay += out.hunt;
    if (out.stall) this.stall += out.stall;
    if (b && out.calm) b.nextSwarm = Math.max(b.nextSwarm, this.runTime + out.calm);
    if (out.plates && out.plates > 0) this.repair(out.plates);
    if (out.stock) for (const k of ['shield', 'yield'] as const) { const n = out.stock[k]; if (n) this.powers[k] = Math.min(POWER_STOCK_MAX[k]!, this.powers[k] + n); }
    if (out.score) this.addScore(out.score, 'events');
    if (b && out.heat) b.heat = Math.min(1, Math.max(0, b.heat + out.heat));
    if (out.hostile) for (const al of this.aliens) if (al.ward) provoke(al, this.events);
    if (out.redo) { this.redo = true; this.events.push({ type: 'redo' }); }
    if (out.fit && !this.levels[out.fit]) { this.setLevels({ ...this.levels, [out.fit]: 1 }); this.events.push({ type: 'fitted', id: out.fit }); }
    for (const f of [out.flag ?? []].flat()) this.flags.add(f);
    for (const f of [out.unflag ?? []].flat()) this.flags.delete(f);
    for (const [k, v] of Object.entries(out.standing ?? {}) as Array<[Standing, number]>) this.standing[k] = (this.standing[k] ?? 0) + v;
    for (const [k, v] of Object.entries(out.notice ?? {}) as Array<[Faction, number]>) this.noticeDelta[k] = (this.noticeDelta[k] ?? 0) + v;
    if (out.follow) this.follows.push({ card: out.follow.card, at: this.runTime + out.follow.after, quick: out.follow.quick });
    if (out.signal) this.events.push({ type: 'storyNotice', tone: out.signal.tone, headline: out.signal.headline, reason: out.signal.reason });
    if (out.radio) {
      const lines = [out.radio.text].flat();
      this.radioLines(`radio_${lines[0]!.slice(1, 12)}`, tr(out.radio.from), out.radio.caller ?? 'unknown', lines.map((l) => tr(l)), out.radio.delay ?? 0, out.radio.gap ?? RADIO_GAP);
    }
    if (out.job && !this.jobs.some((j) => j.id === out.job!.id)) this.jobs.push(out.job);
    if (out.drop) this.jobs = this.jobs.filter((j) => j.id !== out.drop);
    if (out.seam) { this.seamT = out.seam; this.field.richBoost = 0.35; this.field.density = 1.2; }
    if (out.dismiss) for (const al of this.aliens) if (brought.includes(al.id)) leave(al);
    const ids: number[] = [];
    const s = this.ship;
    for (const sp of out.spawn ?? []) {
      for (let i = 0; i < sp.n; i++) {
        let at: { x: number; y: number; z: number } | undefined;
        if (sp.from === 'around') {
          const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(26, 34);
          at = { x: s.x + Math.cos(a) * d, y: this.rng.range(2, 9), z: s.z + Math.sin(a) * d };
        } else if (b) {
          // ahead: from the lane's side; behind: from home
          const toward = Math.atan2(-(b.lane.z - s.z), b.lane.x - s.x) + (sp.from === 'behind' ? Math.PI : 0) + this.rng.range(-0.5, 0.5);
          const d = this.rng.range(80, 100);
          at = { x: s.x + Math.cos(toward) * d, y: this.rng.range(-2, 10), z: s.z - Math.sin(toward) * d };
        }
        ids.push(this.spawnHostile(sp.variant, at, null, true).id);
      }
    }
    if (b && out.calloway) {
      // her ship comes in; running means the whole system with her, and her field on the drive
      this.callowayShip = true;
      this.command.summon(this.runTime, 'custody', this.sortie.nemesis.hp, false, 'Calloway · CCV Patience', this.sortie.nemesis.wing);
      if (out.calloway === 'run') { b.spoolNeed = Math.max(b.spoolNeed, SPOOL * SPOOL_RUN); b.heat = 1; b.nextPursuit = this.runTime; this.run.capitalsEvaded++; }
    }
    const cap = this.sortie.notice.captain, cdef = cap && CAPTAIN_BY_ID[cap.id];
    if (b && cap && cdef && out.captain) {
      // their ship comes in under their name; or you slipped them, paid them, or they thought better of it
      if (out.captain === 'fight') {
        const f = form(cdef, cap.memory);
        this.captainFighting = true;
        this.command.summon(this.runTime, cap.faction, f.hp, false, cap.ship, f.wing);
      } else {
        this.captainEnd = out.captain === 'run' ? 'evaded' : out.captain === 'pay' ? 'bargained' : 'left';
        if (out.captain === 'run') this.run.capitalsEvaded++;
      }
    }
    if (b && out.blockade) {
      if (out.blockade === 'fight') { b.blockade = 'called'; this.command.summon(this.runTime, 'custody', BLOCKADE_HP, false); }
      else if (out.blockade === 'pass') b.blockade = 'done';
      else {
        // running it: she and her wing come after you while her interdiction field drags on the drive,
        // and the whole system is on alert. Survive the spool and you are gone; nothing obliges you to kill her.
        b.blockade = 'done';
        b.spoolNeed = Math.max(b.spoolNeed, SPOOL * SPOOL_RUN);
        b.heat = 1;
        b.nextPursuit = this.runTime;
        this.run.capitalsEvaded++;
        this.command.summon(this.runTime, 'custody', BLOCKADE_HP, false);
      }
    }
    return ids;
  }

  /** What an outcome pays in Cyrite and supplies, as the player is told it (the purse and the tank are one figure to them). */
  worth(out: Outcome): { cyrite: number; supplies: number } {
    const cyrite = amount(out.cyrite, this.cyrite, 1) + amount(out.chits, this.cyrite, 1, true) + (out.krail ? cy(out.krail) : 0);
    return { cyrite: Math.max(0, Math.round(cyrite)), supplies: Math.max(0, amount(out.supplies, this.supplies, 1)) };
  }

  /** Jobs paid where the ship is now: the port on docking, the lane on the jump. */
  private settleJobs(at: 'port' | 'lane'): void {
    for (const j of [...this.jobs]) {
      if (j.at !== at) continue;
      const g = j.give ?? {};
      if ((g.supplies ?? 0) > this.supplies) { this.events.push({ type: 'jobShort', id: j.id, text: j.text }); continue; }
      this.supplies -= g.supplies ?? 0;
      this.jobs.splice(this.jobs.indexOf(j), 1);
      this.run.jobsDone++;
      const cyrite = amount(j.pay.cyrite, this.cyrite, 0) + amount(j.pay.chits, this.cyrite, 0, true) + (j.pay.krail ? cy(j.pay.krail) : 0);
      const supplies = amount(j.pay.supplies, this.supplies, 0);
      this.applyOutcome(j.pay, 0, []);
      this.events.push({ type: 'jobDone', id: j.id, text: j.pay.text, job: j.text, at, cyrite: Math.max(0, cyrite), supplies: Math.max(0, supplies) });
    }
  }

  /** Fit a build outright (tests, the scripted pilot, debugging). */
  setLevels(levels: Levels): void {
    this.levels = { ...levels };
    this.refreshStats();
  }

  private buildStats(): Stats {
    this.fx = effects(this.levels);
    const s = computeStats(this.levels);
    // the arcade feels its budgets: heavy is slow, hot is slow to reload (the Story mode's turn comes with its bay)
    feelBudgets(s, this.levels);
    // the Story's stores: out of them the crew tires and the drive goes unserviced
    this.thin = !!this.bk && this.supplies <= 0;
    if (this.thin) {
      s.drive *= EMPTY_STORES;
      s.topSpeed *= EMPTY_STORES;
      s.turn *= EMPTY_STORES;
      s.bankRefill *= EMPTY_STORES;
      s.torpReload /= EMPTY_STORES;
      s.mineInterval /= EMPTY_STORES;
      s.arcInterval /= EMPTY_STORES;
    }
    this.weightFuel = this.bk ? weightFuel(this.levels) : 0;
    // the survival mode's hull: plates, how fast a shield comes back, grace after a hit, how far the tractor reaches
    const K = this.survival;
    s.maxPlates = Math.max(1, s.maxPlates + K.ship.plates);
    s.shieldRecharge *= K.ship.recharge;
    s.grace *= K.ship.grace;
    s.tractor *= K.salvage.reach;
    return s;
  }

  private refreshStats(): void {
    const old = this.stats;
    this.stats = this.buildStats();
    this.hull = flightHull(this.stats);
    // a new plate or shield comes fitted whole; a new torpedo bay comes loaded
    if (this.stats.maxPlates > old.maxPlates) this.plates += this.stats.maxPlates - old.maxPlates;
    this.plates = Math.min(this.plates, this.stats.maxPlates);
    if (this.stats.shieldMax > old.shieldMax) this.shields += this.stats.shieldMax - old.shieldMax;
    this.shields = Math.min(this.shields, this.stats.shieldMax);
    if (this.stats.torpedoes && !old.torpedoes) this.arms.rack = this.stats.torpRack;
    if (this.stats.torpRack > old.torpRack && old.torpedoes) this.arms.rack += this.stats.torpRack - old.torpRack;
    if (this.stats.bankMax > old.bankMax) this.arms.bank += this.stats.bankMax - old.bankMax;
  }

  // ── the sector: spawning, hulls, events ───────────────────────────────

  /**
   * The arcade's encounters (sim/pacing.ts): a quiet spell, then a group
   * arriving a hull (or a pair, or a squad) at a time, from clear of the
   * nose; once the group is beaten or shaken off, quiet again. A capital
   * ship's fight holds everything, and is followed by a quiet spell.
   */
  private spawn(t: number, p: Pressure): void {
    if ((this.theatreT -= 1 / 60) <= 0) this.rotateTheatre(t);
    const pc = this.pace, lull = p.lull * this.stats.lull;
    const cs = this.command.state;
    if (cs === 'fight' || cs === 'inbound' || cs === 'hailing') {
      pc.state = 'quiet';
      pc.left = 0;
      pc.until = Math.max(pc.until, t + lull);
      return;
    }
    if (pc.state === 'quiet') {
      if (t < pc.until) return;
      pc.state = 'wave';
      pc.left = waveSize(p, this.refit);
      if (pc.n === 0) pc.left = Math.max(pc.left, ARCADE_OPENING.size);
      pc.next = t;
      pc.last = t;
      pc.ids.clear();
      pc.n++;
      this.run.waves++;
      this.events.push({ type: 'contacts', n: pc.left });
    }
    const regular = this.aliens.filter((a) => !a.escort && !a.extra).length;
    if (pc.left > 0 && t >= pc.next && regular < p.enemyCap) this.arrive(t, p, regular);
    // gone means destroyed, leaving, or left behind past the cull ring
    const live = this.aliens.filter((a) => pc.ids.has(a.id) && !a.fleeing);
    if (pc.left <= 0 && !live.length) {
      pc.state = 'quiet';
      pc.until = t + lull;
      this.events.push({ type: 'quiet' });
    } else if (t - pc.last > PACING.maxLength) {
      // dragged on: the survivors break off, and the next group waits its turn
      for (const a of live) leave(a);
      pc.left = 0;
    }
  }

  /** The wave's next arrival: a squad, a pair of interceptors, or one hull, each with its way of closing in. */
  private arrive(t: number, p: Pressure, regular: number): void {
    const pc = this.pace;
    pc.next = t + p.enemyInterval * this.rng.range(0.8, 1.2);
    const squads = SQUADS.filter((q) => q.at <= t && q.members.length <= pc.left && regular + q.members.length <= p.enemyCap);
    if (squads.length && this.rng.next() < p.squadChance) {
      const q = squads[this.rng.int(squads.length)]!;
      // the squad closes as its leader would
      const ap = pickApproach(ALIEN_TYPES[VARIANTS[q.members[0]!]!.kind].role, t + this.approachAhead, this.rng);
      for (const al of this.spawnSquad(q, p, ap)) pc.ids.add(al.id);
      pc.left -= q.members.length;
      pc.last = t;
      return;
    }
    const v = pickVariant(t, this.aliens, this.rng, this.theatre, p.theatre);
    if (!v) { pc.next = t + 1; return; }
    const T = ALIEN_TYPES[v.kind];
    const first = pc.n === 1;
    const lead = this.sendHostile(v.id, first ? 'direct' : pickApproach(T.role, t + this.approachAhead, this.rng), first ? null : this.rollElite(v.kind, v.faction, p), first);
    pc.ids.add(lead.id);
    pc.left--;
    pc.last = t;
    // interceptors past the opening often come in pairs: a wingman in echelon
    if (T.role === 'interceptor' && t > 90 && pc.left > 0 && regular + 1 < p.enemyCap && this.rng.next() < 0.6) {
      const wing = this.spawnHostile(v.id, { x: lead.x + Math.sin(lead.face) * 5, y: lead.y + 1.5, z: lead.z + Math.cos(lead.face) * 5 });
      Object.assign(wing, { approach: lead.approach, mode: lead.mode, ax: lead.ax, az: lead.az, slide: lead.slide, modeT: lead.modeT + 0.6, lead: lead.id, slot: 1 });
      pc.ids.add(wing.id);
      pc.left--;
    }
  }

  /** A hostile from far out, clear of the nose, closing its own way (sim/pacing.ts). */
  private sendHostile(variant: string, approach: Approach, elite: EliteId | null = null, opening = false): Alien {
    const v = VARIANTS[variant] ?? VARIANTS.scout!, s = this.ship;
    const at = arrival(s, approach, this.rng, opening ? this.rng.range(ARCADE_OPENING.near, ARCADE_OPENING.far) : this.rng.range(SPAWN_NEAR, SPAWN_FAR));
    const al = this.spawnHostile(v.id, { x: at.x, y: 0, z: at.z }, elite);
    al.approach = approach;
    // it flanks on the side it came in, and patrols cross from that side to the other
    al.slide = at.off > 0 ? -1 : 1;
    if (approach === 'patrol') {
      const w = patrolStart(s, at.off);
      al.mode = 'patrol';
      al.ax = w.x; al.az = w.z;
      al.modeT = PACING.patrolTime;
    }
    return al;
  }

  private rollElite(kind: Alien['kind'], faction: Faction, p: Pressure): EliteId | null {
    return this.rng.next() < p.eliteChance ? pickElite(kind, faction, this.rng) : null;
  }

  private rotateTheatre(t: number): void {
    const open = [...new Set(Object.values(VARIANTS).filter((v) => v.at <= t && v.weight > 0).map((v) => v.faction))];
    const pool = open.filter((f) => f !== this.theatre);
    if (pool.length) this.theatre = pool[this.rng.int(pool.length)]!;
    this.theatreT = 70;
  }

  private spawnSquad(q: (typeof SQUADS)[number], p: Pressure, approach: Approach): Alien[] {
    const first = this.sendHostile(q.members[0]!, approach, this.rollElite(VARIANTS[q.members[0]!]!.kind, VARIANTS[q.members[0]!]!.faction, p));
    const out = [first];
    for (let i = 1; i < q.members.length; i++) {
      const a = (i / q.members.length) * Math.PI * 2;
      const m = this.spawnHostile(q.members[i]!, { x: first.x + Math.cos(a) * 8, y: first.y + this.rng.range(-2, 3), z: first.z + Math.sin(a) * 8 });
      // the squad closes as one: the leader's way, its waypoint, its side
      Object.assign(m, { approach: first.approach, mode: first.mode, ax: first.ax, az: first.az, slide: first.slide, modeT: first.modeT + i * 0.4, lead: first.id, slot: i });
      out.push(m);
    }
    this.events.push({ type: 'squad', label: q.label });
    return out;
  }

  /** A hostile of a variant, from the spawn ring or at a given point, as regular traffic. */
  spawnHostile(variant: string, at?: { x: number; y: number; z: number }, elite: EliteId | null = null, extra = false): Alien {
    const v = VARIANTS[variant] ?? VARIANTS.scout!;
    const al = spawnAlien(v.kind, this.ship, this.runTime, this.rng, at, { variant: v.id, elite, hp: pressure(this.clock, this.flightMods).enemyHp });
    al.escort = false;
    al.extra = extra;
    if (al.canCloak && at) al.cloak = 1;
    this.aliens.push(al);
    return al;
  }

  /**
   * The two features that hurt, each with a drawn circle first (strikes, the same warning as a
   * storm event's lightning): a storm cell throws lightning near the ship, and a well's core
   * crushes what sits in it. Neither touches the alert: they are weather, not a hunter.
   */
  private spaceThreats(dt: number, s: ShipState, a: Influence): void {
    if (!this.alive) return;
    let storm = 0, core: { x: number; z: number; r: number } | null = null;
    for (const f of a.from) {
      if (f.def === 'storm') storm = Math.max(storm, weightAt(f, s.x, s.z) * f.level);
      else if (f.def === 'well') {
        const r = Math.max(24, f.r * 0.09);
        if (Math.hypot(s.x - f.x, s.z - f.z) < r * 1.8) core = { x: f.x, z: f.z, r };
      }
    }
    if (storm > 0.3) {
      this.stormT -= dt;
      if (this.stormT <= 0) {
        this.stormT = this.rng.range(1.6, 2.8) / (storm * this.mods.hazard);
        const lead = this.rng.range(0.3, 1.1);
        this.strikes.push({ id: newId(), kind: 'lightning', x: s.x + s.vx * lead + this.rng.range(-8, 8), z: s.z + s.vz * lead + this.rng.range(-8, 8), r: 3.6, t: 1.1, total: 1.1, faction: null });
      }
    } else this.stormT = Math.max(this.stormT, 1.5);
    if (core) {
      this.coreT -= dt;
      if (this.coreT <= 0) {
        this.coreT = 2.2;
        this.strikes.push({ id: newId(), kind: 'blast', x: core.x + this.rng.range(-4, 4), z: core.z + this.rng.range(-4, 4), r: core.r * 0.5, t: 1.2, total: 1.2, faction: null });
      }
    } else this.coreT = Math.max(this.coreT, 1);
  }

  /** Story's space: laid by hand along the course, not composed (sim/sites.ts). */
  private layStory(): void {
    this.siteHere = null;
    this.siteAt = null;
    if (!this.spaceOn || this.mode !== 'breakout' || !this.bk) return;
    this.space = new Space(this.seed + this.sortie.lane, { hazard: this.mods.hazard, compose: false });
    // a situation's stage and its sky's site are one spot (sim/sites.ts); a place has its own
    const anchor = this.stage ? { x: this.stage.x, z: this.stage.z } : undefined;
    this.siteAt = laySortie(this.space, this.sortie, this.ship, this.bk.lane, this.bk.port, anchor, this.bk.audit ? [this.bk.audit] : []);
  }

  /** The shared world: deal it, ask what it does here, and apply it (docs/ENVIRONMENT.md). */
  private stepSpace(dt: number, s: ShipState): void {
    const space = this.space!;
    space.step(dt, this.runTime, s);
    const a = space.sample(s.x, s.z, this.air);
    // a calm system has no anomalies: the sky's features keep their rock and their look, and nothing else
    if (this.sortie.calm) {
      Object.assign(a, { sight: CALM.sight, lock: CALM.lock, jam: CALM.jam, drag: CALM.drag, ax: 0, az: 0, conceal: CALM.conceal, steady: CALM.steady, shield: CALM.shield });
      a.from = a.from.filter((f) => f.def !== 'storm' && f.def !== 'well');
    }
    easeSky(this.levels, a);
    this.field.zone = a.rock;
    this.navNoise = Math.max(Math.max(0, a.jam - a.steady), this.navNoise > 0 ? this.navNoise - dt * 0.5 : 0);
    // heavy going slows the ship; a pull leans it
    if (a.drag > 1) { const k = Math.exp(-(a.drag - 1) * 1.5 * dt); s.vx *= k; s.vz *= k; }
    s.vx += a.ax * dt; s.vz += a.az * dt;
    if (space.features.some((f) => f.def === 'well')) {
      for (const al of this.aliens) {
        const h = space.sample(al.x, al.z, this.there);
        al.vx += h.ax * dt; al.vz += h.az * dt;
      }
    }
    const was = this.conditions.length > 0;
    this.conditions = reports(a);
    if (!was && this.conditions.length) this.events.push({ type: 'anomalyIn', kinds: this.conditions.map((c) => c.kind) });
    this.spaceThreats(dt, s, a);
    // inside a named place: say so once, and let the story read the flag
    const f = space.features.find((q) => q.named && Math.hypot(s.x - q.x, s.z - q.z) < q.r);
    this.siteHere = f?.named ?? null;
    if (f?.named) this.flags.add(`site:${f.named}`);
    // the Archive keeps each kind of phenomenon she has flown into
    for (const q of space.features) if (Math.hypot(s.x - q.x, s.z - q.z) < q.r) this.flags.add(metFlag(q.def));
  }

  private stepAliens(dt: number, t: number, p: Pressure): void {
    const s = this.ship;
    const arena: Arena = { bulwarks: this.field.bulwarks, rocks: this.field.rocks, aliens: this.aliens, bolts: this.bolts, notice: this.stats.notice };
    const well = this.encounter?.id === 'anomaly' && live(this.encounter) && !this.encounter.anchored ? this.encounter : null;
    const meet = this.storyPlace, held = meet && 'hold' in meet.def.act ? [{ x: meet.x, z: meet.z, r: meet.def.r }] : [];
    const safe = !!this.safe, keep = this.bk ? [...(this.fieldDown ? [] : [this.bk.lane]), ...(this.bk.port ? [this.bk.port] : []), ...(this.bk.audit ? [this.bk.audit] : []), ...held] : [];
    // the pack calls its plays before anyone moves (sim/tactics.ts)
    if (this.alive && !safe) this.pack.step(dt, this.aliens, s, this.rng);
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const al = this.aliens[i];
      // a hull moving can clear another from the list (a ram, a break); skip the hole
      if (!al) continue;
      moveAlien(al, s, dt, arena, this.webs, this.rng, this.events);
      // the gate and the depot are not entered by a hostile hull: it holds at the ring and circles there
      if (!al.ward && al.kind !== 'freighter') for (const k of keep) this.holdOut(al, k.x, k.z);
      if (al.snare > 0) {
        // snared (Thren tech): the hull wades as if through a web
        al.snare = Math.max(0, al.snare - dt);
        const k = Math.exp(-4 * dt);
        al.vx *= k; al.vy *= k; al.vz *= k;
      }
      // the roll cloak: hulls lose the ship and hold their fire
      if (this.alive && this.cloakT <= 0 && !safe) alienFire(al, s, t, this.shots, this.field.bulwarks, this.rng, this.events, p);
      stepBeam(al, s, dt);
      this.hullVsRock(al);
      if (!this.aliens.includes(al)) continue;
      if (well) {
        const [ax, az] = wellPull(well, al.x, al.z, 10);
        al.vx += ax * dt; al.vz += az * dt;
        if (Math.hypot(al.x - well.x, al.z - well.z) < well.r + al.r) this.hurtAlien(al, 20 * dt, 'hazard', al.x, al.y, al.z, true);
      }
      if (al.burn > 0 && this.aliens.includes(al)) {
        al.burn = Math.max(0, al.burn - dt);
        this.hurtAlien(al, al.burnDps * dt, 'plasma', al.x, al.y, al.z, true);
      }
      if (!this.aliens.includes(al)) continue;
      // gone: off the far side of the sky, or away after leaving
      const d = Math.hypot(al.x - s.x, al.z - s.z);
      if (!al.ward && !al.job && (d > CULL || (al.fleeing && al.age > 3 && d > 160))) {
        this.aliens.splice(this.aliens.indexOf(al), 1);
        // a scout that ran from a losing fight is out of sight: its friends come, once, from its side
        if (al.help && this.alive && !safe && !this.sortie.quiet && this.aliens.filter((a) => !a.escort && !a.extra).length < p.enemyCap + 1) {
          const help = this.sendHostile(this.runTime >= VARIANTS.raptor!.at && this.rng.next() < 0.4 ? 'raptor' : 'scout', 'flank');
          help.slide = al.slide;
        }
      }
    }
  }

  /** Keep a hostile hull outside a safe ring: at the edge it turns along it, the way round it was already going. */
  private holdOut(al: Alien, x: number, z: number): void {
    const dx = al.x - x, dz = al.z - z, d = Math.hypot(dx, dz) || 0.01, edge = SAFE_R + SAFE_HOLD;
    if (d >= edge) return;
    const nx = dx / d, nz = dz / d, dir = al.id % 2 ? 1 : -1, sp = Math.max(6, Math.hypot(al.vx, al.vz) * 0.8);
    al.x = x + nx * edge; al.z = z + nz * edge;
    al.vx = -nz * dir * sp; al.vz = nx * dir * sp;
  }

  /**
   * Rock is solid to a hull as it is to the ship, but a hull is bigger: it
   * is held out of every rock, and what it hits at speed breaks on it (a
   * hull) and cracks it (the rock). Fliers who chase through a field lose
   * hulls to it; the Wayward, smaller, slips between.
   */
  private hullVsRock(al: Alien): void {
    if (al.mode === 'cross') return;
    for (const r of this.field.rocks) {
      const dx = al.x - r.x, dz = al.z - r.z;
      const min = r.r * 0.9 + al.r;
      if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
      const d = Math.hypot(dx, dz) || 0.01;
      if (d >= min) continue;
      const nx = dx / d, nz = dz / d;
      al.x = r.x + nx * min; al.z = r.z + nz * min;
      // closing speed along the contact normal: what is lost in the bounce
      const vn = (al.vx - r.vx) * nx + (al.vz - r.vz) * nz;
      if (vn >= 0) continue;
      al.vx -= 1.3 * vn * nx; al.vz -= 1.3 * vn * nz;
      if (al.bumpT > 0 || al.fleeing) continue;
      al.bumpT = 0.7;
      const T = ALIEN_TYPES[al.kind], hit = Math.min(1, -vn / T.dash);
      const calm = al.calm;
      this.hurtAlien(al, al.maxHp * ROCK_BUMP[T.role === 'cruiser' ? 'cruiser' : 'light'] * hit, 'hazard', al.x, al.y, al.z, true);
      if (this.aliens.includes(al)) al.calm = calm;
      this.damageRock(r, 0.4 + (-vn) * 0.08, 'hazard', r.x, 0, r.z, true);
    }
  }

  private stepEncounter(dt: number, t: number): void {
    const e = this.encounter;
    // a place pinned to the sky wakes when the ship comes near it; until then the sector's own events may still come (and park it)
    if (e?.dormant) {
      if (this.command.state === 'idle' && Math.hypot(this.ship.x - e.x, this.ship.z - e.z) < (e.act ?? 0)) { wakeEncounter(e, this); return; }
    } else if (e) {
      if (stepEncounter(e, this, dt)) {
        this.run.events++;
        if (e.success) this.run.eventsWon++;
        if (e.place) this.placeWon = e.success;
        this.encounter = this.parked;
        this.parked = null;
        this.nextEvent = t + eventGap(this.eventN) * this.survival.events.gap;
      }
      return;
    }
    // the first system past Cerro stays quiet from the breach to the jump (owner, 6 November 2026): no distress signal, no skirmish, no place
    if (this.bk?.def.first && (recovering(this.flags) || lockLifted(this.flags))) return;
    // the system's own place comes first, a little after arrival, when the sky is clear; the sector's chance events wait for it
    const place = this.sortie.place;
    if (this.placeDue && place) {
      // pinned to the feature it sits in: marked from the start, asleep until the ship comes near (sim/sites.ts)
      const at = this.siteAt;
      if (at) {
        this.placeDue = false;
        const far = FEATURES[at.feature].layer === 'far';
        this.encounter = startEncounter(place.plays, this, place, { x: at.x, z: at.z, r: far ? 320 : at.r, act: far ? 480 : at.r * 0.8 });
        this.lastEvent = place.plays;
        return;
      }
      if (this.runTime < PLACE_AT || this.command.state !== 'idle') return;
      this.placeDue = false;
      this.encounter = startEncounter(place.plays, this, place);
      this.lastEvent = place.plays;
      return;
    }
    // only in open sky: no capital ship about, and not just before one; a quiet system has no chance events
    if (this.sortie.quiet || this.sortie.safe || t < this.nextEvent || this.command.state !== 'idle' || this.command.next - t < 20) return;
    const weights = this.sortie.calm ? calmWeights(this.survival.events.weights) : this.survival.events.weights;
    const id = pickEncounter(t, this.lastEvent, this.unlocked, this.rng, weights);
    if (!id) { this.nextEvent = t + 20; return; }
    if (e?.dormant) this.parked = e;
    this.encounter = startEncounter(id, this);
    this.lastEvent = id;
    this.eventN++;
  }

  // ── our systems ───────────────────────────────────────────────────────

  private reachableHulls(): Array<Reachable & { al: Alien | null }> {
    const out: Array<Reachable & { al: Alien | null }> = this.aliens.filter((a) => !cloaked(a)).map((a) => ({ id: a.id, x: a.x, y: a.y, z: a.z, r: a.r, al: a }));
    const b = this.command.targetable();
    if (b && !b.arriving) out.push({ id: b.id, x: b.x, y: b.y, z: b.z, r: b.r * 0.85, al: null });
    return out;
  }

  private reachableRocks(): Array<Reachable & { rock: Rock }> {
    return this.field.rocks.map((r) => ({ id: r.id, x: r.x, y: 0, z: r.z, r: r.r, rock: r }));
  }

  private stepSystems(dt: number, rapid: boolean): void {
    const st = this.stats, sys = this.sys;
    // mines
    if (sys.mines.length) {
      const hulls = this.reachableHulls(), rocks = this.reachableRocks();
      for (const m of sys.mines) {
        if (m.fuse > 0 && st.mineGravity) this.gravity(m, dt);
      }
      for (const m of stepMines(sys, st, hulls, rocks, dt)) this.mineBlast(m);
    }
    // plasma and clouds
    stepBurns(sys, dt);
    if (sys.burns.length) {
      for (const al of [...this.aliens]) {
        if (Math.abs(al.y) > 4.5 || !this.aliens.includes(al)) continue;
        const dps = burnAt(sys, al.x, al.z, al.r);
        if (dps <= 0) continue;
        this.hurtAlien(al, dps * this.dmgMult * dt, 'plasma', al.x, al.y, al.z, true);
        if (st.plasmaBurn > 0) { al.burn = 3; al.burnDps = st.plasmaBurn * this.dmgMult; }
      }
      for (const r of [...this.field.rocks]) {
        const dps = burnAt(sys, r.x, r.z, r.r);
        if (dps > 0) this.damageRock(r, dps * this.dmgMult * dt, 'plasma', r.x, 0, r.z, true);
      }
      for (const w of [...this.field.bulwarks]) {
        const dps = burnAt(sys, w.x, w.z, w.r * 0.9);
        if (dps > 0) this.damageBulwark(w, dps * this.dmgMult * dt, w.x, 0, w.z, true);
      }
      const b = this.command.targetable();
      if (b && !b.arriving && Math.abs(b.y) < 4) {
        const dps = burnAt(sys, b.x, b.z, b.r * 0.85);
        if (dps > 0) this.hurtBoss(dps * this.dmgMult * dt, 'plasma', b.x, b.y, b.z, true);
      }
    }
    // the hull arc
    if (st.arc && this.alive) {
      sys.arcT -= dt * (rapid ? 2 : 1);
      if (sys.arcT <= 0) {
        // the arc is a defence: it only fires while a hull that has committed to a fight is in reach, and only at such hulls
        const foes = this.reachableHulls().filter((h) => (h.al ? this.committed(h.al) : true));
        const hits = foes.length ? arcTargets(this.ship, st, foes, [], rapid) : [];
        if (hits.length) {
          const pts: number[] = [];
          for (const h of hits) {
            pts.push(h.from[0], h.from[1], h.from[2], h.target.x, h.target.y, h.target.z);
            this.hurtReachable(h.target, h.dmg * this.dmgMult, 'arc');
          }
          this.events.push({ type: 'arc', points: pts });
          sys.arcT = st.arcInterval;
        } else sys.arcT = 0.1;
      }
    }
  }

  /** Damage whatever a Reachable stands for: a hull, the boss or a rock. */
  private hurtReachable(t: Reachable & { al?: Alien | null; rock?: Rock }, dmg: number, src: Weapon): void {
    if (t.rock) { if (this.field.rocks.includes(t.rock)) this.damageRock(t.rock, dmg, src, t.x, t.y, t.z); }
    else if (t.al) { if (this.aliens.includes(t.al)) this.hurtAlien(t.al, dmg, src, t.x, t.y, t.z); }
    else this.hurtBoss(dmg, src, t.x, t.y, t.z);
  }

  /** A graviton mine about to go: drag hulls and rock in. */
  private gravity(m: Mine, dt: number): void {
    const r = this.stats.mineBlast * 2.5;
    const pull = (o: { x: number; z: number; vx: number; vz: number }) => {
      const dx = m.x - o.x, dz = m.z - o.z, d = Math.hypot(dx, dz) || 1;
      if (d < r) { o.vx += (dx / d) * GRAVITY_PULL * 3 * dt; o.vz += (dz / d) * GRAVITY_PULL * 3 * dt; }
    };
    for (const al of this.aliens) pull(al);
    for (const rk of this.field.rocks) pull(rk);
  }

  private mineBlast(m: Mine): void {
    const st = this.stats;
    this.blast(m.x, 0.3, m.z, st.mineBlast, st.mineDamage * m.boost * this.dmgMult, 'mine', 'mine');
    if (st.mineChain) {
      chainMines(this.sys, m.x, m.z, st.mineBlast * 1.6);
      this.sys.burns.push({ x: m.x, z: m.z, r: st.mineBlast * 0.6, life: CHAIN_CLOUD, max: CHAIN_CLOUD, dps: 4 * (st.mineDamage / 7), trail: false });
    }
  }

  private torpBlast(tp: Torpedo): void {
    const st = this.stats;
    this.blast(tp.x, tp.y, tp.z, tp.blast, tp.dmg, 'torpedo', tp.small ? 'bomblet' : 'torpedo', st.torpVsShips);
    if (tp.small) return;
    for (let i = 0; i < st.torpCluster; i++) {
      const a = (i / st.torpCluster) * Math.PI * 2 + this.rng.range(-0.3, 0.3);
      const b = launchTorpedo(this.torps, st, tp.x, tp.z, a, 14, null, tp.dmg * 0.35, true);
      b.y = tp.y; b.life = 0.45; b.max = 20; b.blast = tp.blast * 0.45; b.cone = 0;
    }
    if (st.torpWell) { this.wells.push({ x: tp.x, z: tp.z, life: WELL.life, r: tp.blast + WELL.reach }); this.events.push({ type: 'well', x: tp.x, z: tp.z, r: tp.blast + WELL.reach }); }
    if (st.torpPlasma) this.sys.burns.push({ x: tp.x, z: tp.z, r: tp.blast * 0.6, life: 2.5, max: 2.5, dps: st.plasmaDps, trail: false });
    if (st.torpArc > 0) {
      const near = this.reachableHulls()
        .filter((h) => Math.hypot(h.x - tp.x, h.y - tp.y, h.z - tp.z) < 16)
        .sort((a, b) => Math.hypot(a.x - tp.x, a.z - tp.z) - Math.hypot(b.x - tp.x, b.z - tp.z))
        .slice(0, st.torpArc);
      if (near.length) {
        const pts: number[] = [];
        for (const h of near) { pts.push(tp.x, tp.y, tp.z, h.x, h.y, h.z); this.hurtReachable(h, st.arcDamage * 1.2 * this.dmgMult, 'arc'); }
        this.events.push({ type: 'arc', points: pts });
      }
    }
  }

  /** Coolant flush: a barrel roll vents the loops, half the bank back and a torpedo racked. */
  private flush(): void {
    const st = this.stats, a = this.arms, s = this.ship;
    a.bank = Math.min(st.bankMax, a.bank + st.bankMax * st.rollFlush);
    if (st.torpedoes && a.rack < st.torpRack) { a.rack++; a.reload = a.rack < st.torpRack ? st.torpReload : 0; a.spacing = 0; }
    this.events.push({ type: 'flush', x: s.x, z: s.z });
  }

  /** Surge core: a kill stacks the surge and keeps it alive a little longer. */
  private surge(): void {
    const n = this.stats.surge;
    if (n <= 0) return;
    this.surgeN = Math.min(n, this.surgeN + 1);
    this.surgeT = SURGE.window;
    this.events.push({ type: 'surge', n: this.surgeN, max: n, x: this.ship.x, z: this.ship.z });
  }

  /** Deflectors: every rock near the ship drifts gently away from it, big or small; the bow wave cracks what drifts off ahead at speed. */
  private stepDeflect(dt: number): void {
    const st = this.stats, s = this.ship;
    if (st.deflect <= 0 || !this.alive) return;
    const frac = Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(this.hull));
    const hx = Math.cos(s.heading), hz = -Math.sin(s.heading);
    for (const r of [...this.field.rocks]) {
      const dx = r.x - s.x, dz = r.z - s.z, d = Math.hypot(dx, dz) || 1, lim = DEFLECT.reach + r.r;
      if (d >= lim) continue;
      const nx = dx / d, nz = dz / d, fall = 1 - d / lim;
      // a slow, steady drift outward: never faster than DEFLECT.drift away from the ship, so nothing is flung
      const out = r.vx * nx + r.vz * nz, room = DEFLECT.drift * st.deflect - out;
      if (room > 0) {
        const dv = Math.min(room, (DEFLECT.push * st.deflect * fall * dt) / (0.8 + 0.04 * r.r * r.r));
        r.vx += nx * dv; r.vz += nz * dv;
      }
      if (st.bowWave > 0 && (dx * hx + dz * hz) / d > 0.3 && frac > 0.45) this.damageRock(r, st.bowWave * frac * fall * dt, 'ram', r.x, 0, r.z, true);
    }
  }

  /** Singularity wells: hulls, rock and enemy fire in reach are dragged toward the middle until it closes. */
  private stepWells(dt: number): void {
    for (let i = this.wells.length - 1; i >= 0; i--) {
      const w = this.wells[i]!;
      if ((w.life -= dt) <= 0) { this.wells.splice(i, 1); continue; }
      const pull = (o: { x: number; z: number; vx: number; vz: number }, k: number) => {
        const dx = w.x - o.x, dz = w.z - o.z, d = Math.hypot(dx, dz) || 1;
        if (d > w.r * 2.2 || d < 0.6) return;
        o.vx += (dx / d) * WELL.pull * k * (1 - d / (w.r * 2.2)) * dt; o.vz += (dz / d) * WELL.pull * k * (1 - d / (w.r * 2.2)) * dt;
      };
      for (const al of this.aliens) if (!al.ward && Math.abs(al.y) < 5) pull(al, 1.4);
      for (const rk of this.field.rocks) pull(rk, 1);
      for (const sh of this.shots) pull(sh, 0.5);
    }
  }

  /** Point defence: the turret shoots down the nearest enemy bolt in reach, one every so often. */
  private stepFlak(dt: number): void {
    const st = this.stats, s = this.ship;
    if (st.flakEvery <= 0 || !this.alive || this.safe) return;
    if ((this.pdT -= dt) > 0) return;
    let best = -1, bd = st.flakRange;
    for (let i = 0; i < this.shots.length; i++) {
      const sh = this.shots[i]!;
      if (sh.from === 'tutor-missile' || sh.from === 'tutor-roll') continue;
      const d = Math.hypot(sh.x - s.x, sh.y, sh.z - s.z);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) { this.pdT = 0; return; }
    const sh = this.shots.splice(best, 1)[0]!;
    this.pdT = st.flakEvery;
    this.events.push({ type: 'arc', points: [s.x, 0.6, s.z, sh.x, sh.y, sh.z] });
    this.events.push({ type: 'flak', x: sh.x, y: sh.y, z: sh.z });
  }

  /** Chain lances: the lance that struck `from` goes on to the nearest other hull in reach. */
  private chainLance(b: Bolt, from: Alien): void {
    let to: Alien | null = null, bd: number = CHAIN.reach;
    for (const al of this.aliens) {
      if (al === from || al.ward || cloaked(al) || b.hit.includes(al.id)) continue;
      const d = Math.hypot(al.x - from.x, al.y - from.y, al.z - from.z);
      if (d < bd) { bd = d; to = al; }
    }
    if (!to) return;
    const sp = Math.hypot(b.vx, b.vz) || this.stats.laserSpeed, d3 = Math.max(0.5, Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z));
    this.events.push({ type: 'arc', points: [from.x, from.y, from.z, to.x, to.y, to.z] });
    const k = sp / d3;
    this.bolts.push({
      x: from.x, y: from.y, z: from.z, vx: (to.x - from.x) * k, vy: (to.y - from.y) * k, vz: (to.z - from.z) * k, life: d3 / sp + 0.25,
      dmg: b.dmg * CHAIN.keep, pierce: 0, hit: [...b.hit, from.id], homing: 0, chain: (b.chain ?? 1) - 1,
    });
  }

  /** Lightning, shells and webs landing where their circles were drawn. */
  private stepStrikes(dt: number): void {
    const s = this.ship;
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const k = this.strikes[i]!;
      if ((k.t -= dt) > 0) continue;
      this.strikes.splice(i, 1);
      this.events.push({ type: 'strike', x: k.x, z: k.z, r: k.r, kind: k.kind });
      if (k.kind === 'web') {
        this.webs.push({ id: k.id, x: k.x, z: k.z, life: 12 * 0.7, r: 0, max: k.r });
        continue;
      }
      const d = Math.hypot(s.x - k.x, s.z - k.z);
      if (this.alive && d < k.r + SHIP_R) {
        if (s.invuln <= 0) this.hitShip(k.kind === 'lightning' ? 'lightning' : 'artillery', k.x, k.z);
      }
      if (k.kind === 'lightning') {
        for (const al of [...this.aliens]) if (Math.abs(al.y) < 4 && Math.hypot(al.x - k.x, al.z - k.z) < k.r + al.r) this.hurtAlien(al, 6, 'hazard', al.x, al.y, al.z);
        for (const r of [...this.field.rocks]) if (Math.hypot(r.x - k.x, r.z - k.z) < k.r + r.r) this.damageRock(r, 3, 'hazard', r.x, 0, r.z);
      }
    }
  }

  private stepPickups(dt: number): void {
    const s = this.ship, well = this.encounter?.id === 'anomaly' && live(this.encounter) && !this.encounter.anchored ? this.encounter : null;
    if (well) {
      for (const pk of this.pickups) { const [ax, az] = wellPull(well, pk.x, pk.z, 6); pk.vx += ax * dt; pk.vz += az * dt; }
      for (const r of this.field.rocks) { const [ax, az] = wellPull(well, r.x, r.z, 4); r.vx += ax * dt; r.vz += az * dt; }
      for (const sh of this.shots) { const [ax, az] = wellPull(well, sh.x, sh.z, 8); sh.vx += ax * dt; sh.vz += az * dt; }
      if (this.alive) {
        const [ax, az] = wellPull(well, s.x, s.z, 7);
        s.vx += ax * dt; s.vz += az * dt;
        if (Math.hypot(s.x - well.x, s.z - well.z) < well.r + SHIP_R && s.invuln <= 0) this.hitShip('anomaly', well.x, well.z);
      }
      for (const r of [...this.field.rocks]) if (Math.hypot(r.x - well.x, r.z - well.z) < well.r + r.r * 0.5) this.damageRock(r, 30 * dt, 'hazard', r.x, 0, r.z, true);
    }
    if (!this.alive) return;
    for (const pk of stepPickups(this.pickups, s, this.stats.tractor, dt)) this.collect(pk);
  }

  /** The Story's secret (owner, 6 November 2026): ten barrel rolls in a row pay 999,999 Cyrite, once per run of rolls, and lift the hold's cap for the journey. */
  private chainRoll(): void {
    this.rollChain = this.runTime - this.rollChainAt <= ROLL_CHAIN_GAP ? this.rollChain + 1 : 1;
    this.rollChainAt = this.runTime;
    if (this.rollChain < ROLL_CHAIN) return;
    this.rollChain = 0;
    this.flags.add(ROLL_SECRET);
    this.cyrite += ROLL_CHAIN_PAY;
    this.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Secret found', reason: '+999,999 Cyrite' });
  }

  private collect(pk: Pickup): void {
    switch (pk.kind) {
      case 'crystal': {
        this.run.krail += pk.value;
        this.addScore(pk.value * SCORE_PER_CRYSTAL, 'krail');
        this.events.push({ type: 'crystal', x: pk.x, z: pk.z, value: pk.value });
        // what the refit bay builds from: Krail in the Arcade, chits in the Story (one purse)
        this.cyrite += pk.value * this.stats.xpMult;
        this.run.krailEarned += pk.value * this.stats.xpMult;
        break;
      }
      case 'cyrite': {
        // the Story's refinery: the tank first, the rest is Cyrite for the purse
        const r = refine(this.fuel, this.cyrite, this.tankCap, pk.value), toTank = r.fuel - this.fuel;
        this.fuel = r.fuel;
        this.cyrite = Math.min(holdMax(this.flags), r.purse);
        this.run.cyrite += pk.value;
        this.events.push({ type: 'cyrite', x: pk.x, z: pk.z, value: pk.value, fuel: toTank });
        break;
      }
      case 'ore': {
        // scrap pays at once: one purse, no hold
        const got = pk.value * this.scrapValue;
        this.chits += got;
        this.run.ore += pk.value;
        this.run.oreSold += got;
        this.addScore(pk.value * SCORE_PER_CRYSTAL, 'krail');
        this.events.push({ type: 'ore', x: pk.x, z: pk.z, value: got });
        break;
      }
      case 'parts': {
        // a crate of supplies, as far as the racks hold
        const got = Math.min(pk.value, Math.max(0, this.supplyMax - this.supplies));
        this.supplies += got;
        this.run.parts += pk.value;
        this.events.push({ type: 'parts', x: pk.x, z: pk.z, value: pk.value });
        break;
      }
      case 'repair':
        if (this.repair(1)) this.events.push({ type: 'pickup', x: pk.x, z: pk.z, plates: this.plates });
        else this.addScore(500, 'events');
        break;
      default: {
        const kind = pk.kind as PowerKind;
        this.run.powerups++;
        const stock = POWER_STOCK[kind];
        // plating and warheads add to what is aboard; the rest run on a clock
        this.powers[kind] = stock ? Math.min(POWER_STOCK_MAX[kind]!, this.powers[kind] + stock) : POWER_TIME[kind] * this.stats.powerTime;
        this.events.push({ type: 'power', x: pk.x, z: pk.z, kind });
      }
    }
  }

  /** Mend `n` plates, up to the hull's maximum. False if there was nothing to mend. */
  repair(n: number): boolean {
    const before = this.plates;
    this.plates = Math.min(this.stats.maxPlates, this.plates + n);
    this.run.platesGained += this.plates - before;
    return this.plates > before;
  }

  dropCrystals(x: number, z: number, total: number, spread = 6, vx = 0, vz = 0, kind: 'crystal' | 'cyrite' | 'ore' | 'parts' = 'crystal', life = 1): void {
    // a place rich in salvage (docs/ENVIRONMENT.md) pays more Krail where it is dropped
    if (kind === 'crystal' && this.space) total = Math.round(total * this.air.krail);
    if (kind === 'crystal') this.run.dropped += Math.round(total);
    dropCrystals(this.pickups, x, z, total, this.rng, spread, vx, vz, kind, life);
  }

  /** Loot from `src` (rock or a wreck), counted in the run's record as it is dropped. */
  private loot(src: 'rock' | 'wreck', kind: 'crystal' | 'cyrite' | 'ore' | 'parts', total: number, x: number, z: number, spread: number, vx = 0, vz = 0, life = 1): void {
    this.run.loot[src][kind === 'crystal' ? 'krail' : kind] += Math.max(0, Math.round(total));
    // the Story has one thing to find: scrap and crystal are worth so many chits and fall as Cyrite, a fifth each, the odd part by chance
    if (this.bk && (kind === 'crystal' || kind === 'ore')) {
      const q = (kind === 'ore' ? total * this.scrapValue : total * this.stats.xpMult) / CHITS_PER_CYRITE;
      total = Math.floor(q) + (this.rng.next() < q - Math.floor(q) ? 1 : 0);
      kind = 'cyrite';
      if (total <= 0) return;
    }
    // the Story's Cyrite is big and worth finding: it flies well clear of the rock, not in a clump
    if (this.bk && kind !== 'parts') spread *= 2.2;
    this.dropCrystals(x, z, total, spread, vx, vz, kind, life);
  }

  dropItem(kind: PickupKind, x: number, z: number): void {
    dropItem(this.pickups, kind, x, z, this.rng);
  }

  /** The cell a source gives: what the place it came from would do for you (sim/pickups.ts). */
  cell(source: CellSource): PickupKind {
    const kind = CELL[source];
    // warheads are no use without a torpedo bay: the lasers get the charge instead
    return kind === 'yield' && !this.stats.torpedoes ? 'rapid' : kind;
  }

  /** A booster for an ordinary hull to carry: plating, unlimited lasers or, with a torpedo bay, warheads. */
  private boosterKind(): PickupKind {
    const kinds: PowerKind[] = this.stats.torpedoes ? ['shield', 'rapid', 'yield'] : ['shield', 'rapid'];
    return kinds[this.rng.int(kinds.length)]!;
  }

  addScore(points: number, src: ScoreSource = 'events'): void {
    const p = Math.round(points * this.survival.score);
    this.score += p;
    this.run.scoreBy[src] += p;
  }

  // ── collisions ────────────────────────────────────────────────────────

  private collide(): void {
    const rocks = this.field.rocks, bulwarks = this.field.bulwarks, s = this.ship, st = this.stats;
    const inBulwark = (x: number, y: number, z: number, r: number) =>
      bulwarks.find((b) => (x - b.x) ** 2 + y * y + (z - b.z) ** 2 < (b.r * 0.9 + r) ** 2);

    // laser lances: plasma torpedoes first (they can be shot down), then our own mines (the
    // detonator), hulls, the boss, rock, bulwarks. A piercing lance carries on through.
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]!;
      const hit = (x: number, y: number, z: number, r: number) => (b.x - x) ** 2 + (b.y - y) ** 2 + (b.z - z) ** 2 < (r + 0.3) ** 2;
      let spent = false;
      const land = (id: number) => {
        b.hit.push(id);
        if (b.pierce > 0) b.pierce--;
        else spent = true;
      };
      for (let k = this.shots.length - 1; k >= 0 && !spent; k--) {
        const sh = this.shots[k]!;
        if (sh.hp > 0 && hit(sh.x, sh.y, sh.z, sh.r)) {
          spent = true;
          if (--sh.hp <= 0) { this.shots.splice(k, 1); this.events.push({ type: 'plasmaDown', x: sh.x, y: sh.y, z: sh.z }); }
        }
      }
      if (st.mineDetonate) {
        for (let k = this.sys.mines.length - 1; k >= 0 && !spent; k--) {
          const m = this.sys.mines[k]!;
          if (m.arm <= 0 && hit(m.x, 0.3, m.z, 0.7)) { spent = true; this.sys.mines.splice(k, 1); m.boost = 1.5; this.mineBlast(m); }
        }
      }
      for (const al of [...this.aliens]) {
        if (spent) break;
        if (cloaked(al) || b.hit.includes(al.id) || !hit(al.x, al.y, al.z, al.r)) continue;
        land(al.id);
        if (st.painter) al.mark = 4;
        this.hurtAlien(al, b.dmg, 'laser', b.x, b.y, b.z);
        if ((b.chain ?? 0) > 0) { this.chainLance(b, al); b.chain = 0; }
      }
      const sd = this.thrSeed;
      if (!spent && sd && sd.state !== 'dead' && hit(sd.x, 0, sd.z, sd.r)) { spent = true; this.hurtSeed(sd, b.dmg, b.x, b.y, b.z); }
      const dn = this.den;
      if (!spent && dn && dn.state !== 'dead' && dn.state !== 'moving' && hit(dn.x, 0, dn.z, DEN_R)) { spent = true; this.hurtDen(dn, b.dmg, b.x, b.y, b.z); }
      const boss = this.command.targetable();
      if (!spent && boss && !b.hit.includes(boss.id) && hit(boss.x, boss.y, boss.z, boss.r * 0.85)) { land(boss.id); this.hurtBoss(b.dmg, 'laser', b.x, b.y, b.z); }
      for (const r of [...rocks]) {
        if (spent) break;
        if (b.hit.includes(r.id) || !hit(r.x, 0, r.z, r.r)) continue;
        land(r.id);
        const sp = Math.hypot(b.vx, b.vz) || 1;
        const broke = this.damageRock(r, b.dmg, 'laser', b.x, b.y, b.z);
        if (!broke) this.field.impulse(r, b.vx / sp, b.vz / sp, ROCK_PUSH.laser, b.x - r.x, b.z - r.z);
      }
      const wall = spent ? undefined : inBulwark(b.x, b.y, b.z, 0.2);
      if (wall) { spent = true; this.damageBulwark(wall, b.dmg, b.x, b.y, b.z); }
      if (spent) this.bolts.splice(i, 1);
    }

    // torpedoes: a proximity fuse on anything in the way
    for (let i = this.torps.length - 1; i >= 0; i--) {
      const tp = this.torps[i]!;
      const near = (x: number, y: number, z: number, r: number) => (tp.x - x) ** 2 + (tp.y - y) ** 2 + (tp.z - z) ** 2 < (r + TORP_FUSE) ** 2;
      const boss = this.command.targetable();
      const sd = this.thrSeed;
      if (sd && sd.state !== 'dead' && near(sd.x, 0, sd.z, sd.r)) { this.torps.splice(i, 1); this.torpBlast(tp); this.hurtSeed(sd, 30, tp.x, tp.y, tp.z); continue; }
      const dn = this.den;
      if (dn && dn.state !== 'dead' && dn.state !== 'moving' && near(dn.x, 0, dn.z, DEN_R)) { this.torps.splice(i, 1); this.torpBlast(tp); this.hurtDen(dn, 30, tp.x, tp.y, tp.z); continue; }
      if (this.aliens.some((a) => !cloaked(a) && near(a.x, a.y, a.z, a.r)) || (boss && !boss.arriving && near(boss.x, boss.y, boss.z, boss.r))
        || rocks.some((r) => near(r.x, 0, r.z, r.r)) || inBulwark(tp.x, tp.y, tp.z, TORP_FUSE)) {
        this.torps.splice(i, 1);
        this.torpBlast(tp);
      }
    }

    // enemy fire stops on a bulwark, and on any rock in its way: rock is cover
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i]!;
      if (inBulwark(sh.x, sh.y, sh.z, sh.r)) { this.shots.splice(i, 1); this.events.push({ type: 'bulwarkHit', x: sh.x, y: sh.y, z: sh.z }); continue; }
      const rock = rocks.find((r) => (sh.x - r.x) ** 2 + (sh.z - r.z) ** 2 < (r.r * 0.9 + sh.r) ** 2);
      if (rock) { this.shots.splice(i, 1); this.damageRock(rock, 0.15, 'hazard', sh.x, sh.y, sh.z, true); }
    }

    if (!this.alive) return;
    this.stepSolids();
    // the ship against a bulwark: it is solid, whatever the grace
    for (const b of bulwarks) {
      const dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz) || 1, min = b.r * 0.88 + SHIP_R;
      if (d >= min) continue;
      const nx = dx / d, nz = dz / d;
      s.x = b.x + nx * min; s.z = b.z + nz * min;
      const vn = s.vx * nx + s.vz * nz;
      if (vn < 0) { s.vx -= 1.5 * vn * nx; s.vz -= 1.5 * vn * nz; }
      if (s.invuln <= 0) return this.hitShip('bulwark');
    }

    const speedFrac = Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(this.hull));
    // a ram at speed hits twice as hard as a nudge; never less than the stock hull's own weight
    const ramDmg = Math.max(BASE.ramDamage, st.ramDamage * (st.ramjet ? 0.5 + speedFrac : 0.5 + 0.5 * speedFrac)) * this.dmgMult;
    const rolling = s.rollT >= 0;
    const vulnerable = s.invuln <= 0;
    // ramjet: a roll is a ram that cannot hurt you
    if (!vulnerable && !(st.ramjet && rolling)) return;
    if (vulnerable) {
      // enemy fire
      for (let i = this.shots.length - 1; i >= 0; i--) {
        const sh = this.shots[i]!;
        if (sh.from === 'tutor-missile' || sh.from === 'tutor-roll') continue; // the lessons' shots land on the tutor's terms, not here
        if ((sh.x - s.x) ** 2 + sh.y ** 2 + (sh.z - s.z) ** 2 < (sh.r + SHIP_R) ** 2) {
          this.shots.splice(i, 1);
          this.impactAt = [sh.x, sh.z];
          return this.hitShip(sh.hp > 0 ? 'fire:plasma' : sh.from ? `fire:${sh.from}` : 'fire');
        }
      }
      // beams: drones low enough to cut across the plane, and the foundry
      // a beam discharges into the hull it cuts: one hit per beam, however long it would have burned
      for (const al of this.aliens) {
        if (Math.abs(al.y) < 3 && beamLive(al) && rayDist(s.x, s.z, al.x, al.z, al.beamAng, BEAM_LEN) < BEAM_W + SHIP_R) { al.beamT = 0; return this.hitShip(`beam:${al.variant}`); }
      }
      for (const bm of this.command.boss?.beams ?? []) {
        if (beamLive(bm) && rayDist(s.x, s.z, bm.x, bm.z, bm.beamAng, BEAM_LEN) < BEAM_W + SHIP_R) { bm.beamT = 0; return this.hitShip('beam:capital'); }
      }
      // webs
      for (const w of this.webs) if (w.r > 1 && Math.hypot(s.x - w.x, s.z - w.z) < w.r * 0.92) return this.hitShip('web');
    }
    // ramming: hulls and the boss (not while Lane Control flies her: she passes, nobody is hurt)
    if (this.bk && recovering(this.flags)) {
      for (const r of rocks) {
        const dx = r.x - s.x, dz = r.z - s.z, d = Math.hypot(dx, dz) || 1;
        if (d < r.r * 0.88 + SHIP_R) { r.vx = (dx / d) * 8; r.vz = (dz / d) * 8; }
      }
      return;
    }
    for (const al of [...this.aliens]) {
      // neutral traffic is solid (sim/solids.ts) but nobody's enemy: no ram, no damage
      if (al.ward) continue;
      if (Math.hypot(s.x - al.x, al.y, s.z - al.z) >= al.r + SHIP_R) continue;
      if (al.calm < 0.3 && !vulnerable) continue;
      const killed = this.hurtAlien(al, ramDmg, 'ram', al.x, al.y, al.z);
      if (st.ramArc) this.ramArc(al.x, al.y, al.z, al.id);
      if (!vulnerable) continue;
      if (killed && st.ramSafe) { s.invuln = Math.max(s.invuln, 0.25); continue; }
      return this.hitShip(`ram:${al.variant}`, al.x, al.z);
    }
    const boss = this.command.boss;
    if (vulnerable && boss && !boss.leaving && boss.cloak < 0.5 && Math.hypot(s.x - boss.x, boss.y, s.z - boss.z) < boss.r * 0.85 + SHIP_R) {
      this.hurtBoss(ramDmg, 'ram', boss.x, boss.y, boss.z);
      // one ram, not a grind: the charge ends and the two rebound apart
      const dx = boss.x - s.x, dz = boss.z - s.z, d = Math.hypot(dx, dz) || 1;
      boss.chargeT = 0;
      boss.vx = (dx / d) * 14; boss.vz = (dz / d) * 14;
      s.vx -= (dx / d) * 10; s.vz -= (dz / d) * 10;
      return this.hitShip('ram:capital', boss.x, boss.z);
    }
    // rock
    for (const r of [...rocks]) {
      if (Math.hypot(s.x - r.x, s.z - r.z) >= r.r * 0.88 + SHIP_R) continue;
      // a prow breaks small and medium rock; a big rock still wins
      if (st.ramSafe && r.size > 0 && (vulnerable || r.hitT <= 0)) {
        const broke = this.damageRock(r, ramDmg, 'ram', r.x, 0, r.z);
        if (broke) { s.invuln = Math.max(s.invuln, 0.2); continue; }
      }
      if (!vulnerable) continue;
      r.vx -= (s.x - r.x) * 0.5; r.vz -= (s.z - r.z) * 0.5;
      if (r.size === 2) return this.graze(r.x, r.z);
      return this.hitShip('rock', r.x, r.z);
    }
  }

  // ── damage ────────────────────────────────────────────────────────────

  /** A mission hazard (the core of a black hole) scorches the hull: one hit, as any other. */
  scorch(): void { if (this.ship.invuln <= 0) this.hitShip('hazard'); }

  /** A small rock only scrapes: the shield flashes and the ship is nudged, but no charge and no plate is lost. */
  private graze(fromX: number, fromZ: number): void {
    const s = this.ship, st = this.stats;
    if (!this.alive || this.safe) return;
    if (this.bk && recovering(this.flags)) return this.hitShip('rock', fromX, fromZ);
    const dx = s.x - fromX, dz = s.z - fromZ, d = Math.hypot(dx, dz) || 1;
    s.vx += (dx / d) * 6; s.vz += (dz / d) * 6;
    s.invuln = Math.max(s.invuln, 0.35);
    this.shieldT = Math.max(this.shieldT, st.shieldDelay * 0.5);
    if (this.powers.shield > 0 || this.shields >= 1) this.events.push({ type: 'shieldHit', x: s.x, z: s.z, left: Math.floor(this.shields), source: 'rock', fx: fromX, fz: fromZ });
  }

  /** Where the last blow came from (for the shield's ripple only; it changes no rule). */
  private impactAt: [number, number] | null = null;

  private hitShip(source: string, fromX?: number, fromZ?: number): void {
    const s = this.ship, st = this.stats;
    if (!this.alive || this.safe) return;
    // nothing hurts her while Lane Control flies her in; rock she touches is pushed off the course
    if (this.bk && recovering(this.flags)) {
      if (fromX !== undefined && fromZ !== undefined) for (const r of this.field.rocks) if (r.x === fromX && r.z === fromZ) { const dx = r.x - s.x, dz = r.z - s.z, d = Math.hypot(dx, dz) || 1; r.vx = (dx / d) * 8; r.vz = (dz / d) * 8; }
      return;
    }
    const at = fromX !== undefined && fromZ !== undefined ? [fromX, fromZ] : this.impactAt;
    this.impactAt = null;
    if (fromX !== undefined && fromZ !== undefined) {
      // knock the two apart, so the hit reads as a collision and not a pass
      const dx = s.x - fromX, dz = s.z - fromZ, d = Math.hypot(dx, dz) || 1;
      s.vx += (dx / d) * 12; s.vz += (dz / d) * 12;
    }
    this.run.damageBy[source] = (this.run.damageBy[source] ?? 0) + 1;
    this.sinceHit = 0;
    // a hit while the drive spools knocks it back: under fire, the jump is earned
    const bk = this.bk;
    if (bk && bk.spool > 0 && bk.jumpT < 0) { bk.spool = Math.max(0, bk.spool - SPOOL_KNOCK); this.spoolKnockT = SPOOL_KNOCK_SHOW; }
    // and a job's hold slips under fire too
    this.stage?.knocked();
    hurtMend(this.mend);
    // any damage holds the shield's recharge off
    this.shieldT = st.shieldDelay;
    // hardened plating (booster) turns every hit for its few seconds; then a whole shield charge, then the hull
    if (this.powers.shield > 0 || this.shields >= 1) {
      // a plate of hardened plating goes first; then a shield charge
      if (this.powers.shield > 0) this.powers.shield--;
      else this.shields -= 1;
      s.invuln = SHIELD_GRACE;
      this.run.shieldsAbsorbed++;
      this.events.push({ type: 'shieldHit', x: s.x, z: s.z, left: Math.floor(this.shields), source, fx: at?.[0], fz: at?.[1] });
      if (st.reactive) this.reactive();
      if (st.arcShield) this.arcNova();
      return;
    }
    this.plates--;
    this.run.platesLost++;
    s.invuln = st.grace;
    this.events.push({ type: 'shipHit', x: s.x, z: s.z, plates: this.plates, source, fx: at?.[0], fz: at?.[1] });
    if (st.reactive) this.reactive();
    if (this.plates <= 0) {
      if (st.damageControl > 0 && !this.dcUsed) {
        this.dcUsed = true;
        this.plates = 1;
        s.invuln = 2;
        this.events.push({ type: 'damageControl', x: s.x, z: s.z });
        return;
      }
      this.run.cause = source;
      this.breach();
    }
  }

  /** Reactive armour: clear the fire around the ship and knock back what is close. */
  private reactive(): void {
    const s = this.ship;
    this.shots = this.shots.filter((sh) => Math.hypot(sh.x - s.x, sh.z - s.z) > 16);
    this.blast(s.x, 0.3, s.z, 12, 6 * this.dmgMult, 'hazard', 'reactive', 1, false);
  }

  /** The capacitor shield: a shield breaking discharges into every hull near. */
  private arcNova(): void {
    const s = this.ship, pts: number[] = [];
    for (const h of this.reachableHulls()) {
      if (Math.hypot(h.x - s.x, h.y, h.z - s.z) > 14) continue;
      pts.push(s.x, 0.4, s.z, h.x, h.y, h.z);
      this.hurtReachable(h, this.stats.arcDamage * 3 * this.dmgMult, 'arc');
    }
    if (pts.length) this.events.push({ type: 'arc', points: pts });
  }

  /** The shock prow: a ram discharges into the hulls near what it struck. */
  private ramArc(x: number, y: number, z: number, skip: number): void {
    const pts: number[] = [];
    for (const h of this.reachableHulls()) {
      if (h.id === skip || Math.hypot(h.x - x, h.y - y, h.z - z) > 12) continue;
      pts.push(x, y, z, h.x, h.y, h.z);
      this.hurtReachable(h, this.stats.arcDamage * 2 * this.dmgMult, 'arc');
    }
    if (pts.length) this.events.push({ type: 'arc', points: pts });
  }

  /** Returns true if the hull was destroyed. `quiet` skips the hit flash (damage over time). */
  private hurtAlien(al: Alien, dmg: number, src: Weapon, x: number, y: number, z: number, quiet = false): boolean {
    if (!this.aliens.includes(al)) return false;
    // a cloaked hull is out of reach of everything: shots, blasts, mines, a ram, flak, a well
    if (cloaked(al)) return false;
    // Voice hulls adapt: past a share of their hull soaked (the original's 6 of 16), half damage
    if (FACTION_TRAITS[al.faction].adapt && al.soaked >= al.maxHp * (BORG_ADAPT / 16)) dmg *= 0.5;
    if (src === 'torpedo' && al.mark > 0) dmg *= this.stats.markBonus;
    if (al.ward && src !== 'hazard' && src !== 'plasma') { this.stage?.shot(this, al); this.cordon?.shot(this, al); this.knot?.shot(this, al); }
    if (this.traffic && src !== 'hazard' && src !== 'plasma') this.traffic.hit(this, al, al.hp - dmg <= 0);
    al.soaked += dmg;
    al.hp -= dmg;
    al.calm = 0;
    if (al.canCloak) al.cloak = Math.min(al.cloak, 0.3);
    if (!quiet || al.hitT <= 0) {
      al.hitT = 0.1;
      this.events.push({ type: 'alienHit', x, y, z, id: al.id });
    }
    if (al.hp > 0) return false;
    this.killAlien(al, src);
    return true;
  }

  private killAlien(al: Alien, src: Weapon): void {
    this.aliens.splice(this.aliens.indexOf(al), 1);
    const mult = this.chainKill();
    const points = Math.round(alienBonus(al) * mult);
    this.addScore(points, 'kills');
    this.kills++;
    this.run.kills++;
    this.run.killsBy[src]++;
    this.surge();
    this.run.killsByKind[al.variant] = (this.run.killsByKind[al.variant] ?? 0) + 1;
    if (al.elite) this.run.elites++;
    this.events.push({
      type: 'alienDestroyed', x: al.x, y: al.y, z: al.z, kind: al.kind, faction: al.faction, points, r: al.r,
      elite: !!al.elite, label: alienLabel(al),
    });
    this.salvage(al);
    if (this.bk) {
      // the Story mode: the Custody notices
      this.bk.heat = Math.min(1, this.bk.heat + (al.faction === 'custody' ? HEAT_KILL_CUSTODY : HEAT_KILL) * this.survival.heat.kill);
      // one of Ashgrove's own, at the Narrows: he will remember it (content/script/legs.ts)
      if (this.narrows === 'reboot' && this.narrowsHulls.includes(al.id)) this.flags.add('ashgrove_crossed');
      if (!this.aliens.some((a) => !a.escort && !a.extra)) this.rest();
    }
    const chance = (al.elite ? REPAIR_CHANCE_ELITE : REPAIR_CHANCE) * this.stats.repairChance;
    if (!this.bk && this.repairCd <= 0 && this.plates < this.stats.maxPlates && this.rng.next() < chance) {
      this.dropItem('repair', al.x, al.z);
      this.repairCd = REPAIR_GAP;
    }
    const E = al.elite ? ELITES[al.elite] : null;
    // an elite's fire control comes off the wreck whole; an ordinary hull sometimes carries a booster
    if (E) this.dropItem(this.cell('elite'), al.x, al.z);
    else if (this.boostCd <= 0 && this.rng.next() < BOOST_CHANCE * this.stats.boostRate) {
      this.dropItem(this.boosterKind(), al.x, al.z);
      this.boostCd = BOOST_GAP;
    }
    if (E?.blast) this.blast(al.x, al.y, al.z, E.blast, ELITE_BLAST_DAMAGE, 'hazard', 'elite', 1, true);
    if (FACTION_TRAITS[al.faction].web || E?.web) {
      this.webs.push({ id: al.id, x: al.x, z: al.z, life: 6, r: 0, max: WEB_R * (E?.web ? 0.8 : 0.45) });
    }
  }

  /**
   * What a dead hull leaves where it died. The arcade: Krail. The Story: Krail and parts, and what its kind carries (a fighter's tanks are dry, a
   * cruiser has cells, a hauler is a hold), all at the survival mode's rate (content/survival.ts `salvage`), and lying for as long as it says.
   */
  private salvage(al: Alien): void {
    const K = this.survival.salvage, loot = al.elite ? this.stats.eliteLoot : 1, life = K.life;
    const v = { x: al.x, z: al.z, vx: al.vx, vz: al.vz };
    if (!this.bk) {
      this.loot('wreck', 'crystal', this.share(al.xp * loot, K.krail * this.mods.income * ARCADE_BOUNTY), v.x, v.z, 5, v.vx, v.vz, life);
      return;
    }
    const C = K.cargo[ALIEN_TYPES[al.kind].role];
    this.loot('wreck', 'parts', Math.max(1, Math.round(al.xp * C.parts * loot)), v.x, v.z, 5, v.vx, v.vz, life);
    this.loot('wreck', 'crystal', this.share(al.xp * WRECK_KRAIL * loot, K.krail), v.x, v.z, 5, v.vx, v.vz, life);
    const cyrite = this.roll(al.xp * C.cyrite * loot), ore = this.roll(al.xp * C.ore * loot);
    if (cyrite > 0) this.loot('wreck', 'cyrite', cyrite, v.x, v.z, 5, v.vx, v.vz, life);
    if (ore > 0) this.loot('wreck', 'ore', ore, v.x, v.z, 5, v.vx, v.vz, life);
  }

  /** A hull lost in someone else's fight (a skirmish): it goes up, and leaves its wreck, but is nobody's kill, so no score and no notice. */
  wreck(al: Alien): void {
    const i = this.aliens.indexOf(al);
    if (i < 0) return;
    this.aliens.splice(i, 1);
    this.events.push({ type: 'alienDestroyed', x: al.x, y: al.y, z: al.z, kind: al.kind, faction: al.faction, points: 0, r: al.r, elite: !!al.elite, label: alienLabel(al) });
    this.salvage(al);
  }

  private chainKill(): number {
    this.chain++;
    this.chainT = CHAIN_WINDOW;
    if (this.chain > this.run.bestChain) this.run.bestChain = this.chain;
    if (this.chain % 10 === 0) this.events.push({ type: 'chain', count: this.chain, mult: chainMult(this.chain) });
    return chainMult(this.chain);
  }

  private hurtBoss(dmg: number, src: Weapon, x: number, y: number, z: number, quiet = false): void {
    const b = this.command.boss;
    if (!b || b.arriving || b.cloak > 0.5) return;
    if (!quiet || b.hitT <= 0) this.events.push({ type: 'bossHit', x, y, z });
    if (!this.command.hurt(dmg, this.aliens, this.ship, this.runTime, this.rng, this.events)) return;
    const bounty = this.command.killed(this.runTime);
    this.addScore(bounty, 'capitals');
    this.kills++;
    this.run.capitals++;
    this.run.capitalFactions.push(b.faction);
    this.run.killsBy[src]++;
    this.chainKill();
    this.events.push({ type: 'bossDestroyed', x: b.x, y: b.y, z: b.z, name: b.name, faction: b.faction, points: bounty });
    // the salvage: krail, a hull repair, a power-up, the faction's tech; in the Story mode a top-up of Cyrite and parts
    const cap = this.survival.salvage.capital, life = this.survival.salvage.life;
    this.loot('wreck', 'crystal', this.share(this.bk ? CAPITAL_KRAIL : (26 + 8 * b.n) * ARCADE_BOUNTY, cap), b.x, b.z, 12, 0, 0, life);
    if (this.bk) { this.loot('wreck', 'cyrite', this.share(CAPITAL_CYRITE, cap), b.x, b.z, 10, 0, 0, life); this.loot('wreck', 'parts', this.share(CAPITAL_SUPPLIES, cap), b.x, b.z, 10, 0, 0, life); }
    if (this.callowayShip && b.name.startsWith('Calloway')) { this.callowayShip = false; this.callowayBeaten = true; this.flags.add('calloway_beaten'); }
    if (this.captainFighting && b.name === this.sortie.notice.captain?.ship) { this.captainFighting = false; this.captainEnd = 'beaten'; }
    for (let i = 0; i < BOSS_PLATES; i++) this.dropItem('repair', b.x, b.z);
    this.dropItem(this.cell('wreck'), b.x, b.z);
    const fresh = !this.techs.has(b.faction);
    this.techs.add(b.faction);
    this.events.push({ type: 'salvage', faction: b.faction, tech: fresh });
    // the wing breaks off when its flagship goes
    for (const al of this.aliens) if (al.escort) { al.fleeing = true; al.mode = 'leave'; al.vx = (al.x - b.x) * 2; al.vz = (al.z - b.z) * 2; }
  }

  /** Returns true if the rock broke. */
  private damageRock(r: Rock, amount: number, src: Weapon, x: number, y: number, z: number, quiet = false): boolean {
    if (!this.field.rocks.includes(r)) return false;
    r.hp -= amount;
    if (this.bk && src === 'laser') this.mineT = 0.6;
    if (!quiet || r.hitT <= 0) {
      r.hitT = 0.12;
      this.events.push({ type: 'rockHit', x, y, z, id: r.id, rx: r.x, rz: r.z, r: r.r, kind: r.kind, size: r.size, hp: Math.max(0, r.hp / r.maxHp), src });
    }
    if (r.hp <= 0) { this.destroyRock(r, src); return true; }
    return false;
  }

  /** A bulwark takes fire: it stops the shot and, a great deal of fire later, bursts into debris. */
  private damageBulwark(b: Bulwark, amount: number, x: number, y: number, z: number, quiet = false): void {
    if (!this.field.bulwarks.includes(b)) return;
    const bucket = Math.ceil(b.hp / (b.maxHp / 12));
    b.hp -= amount;
    if (!quiet || Math.ceil(b.hp / (b.maxHp / 12)) < bucket) this.events.push({ type: 'bulwarkHit', x, y, z });
    if (b.hp > 0) return;
    if (this.chain > 0) this.chainT = CHAIN_WINDOW;
    const points = Math.round(BULWARK_POINTS * chainMult(this.chain));
    this.addScore(points, 'rocks');
    this.kills++;
    this.run.rocks++;
    this.field.shatter(b, pressure(this.clock, this.flightMods).rockHp * (this.bk ? MINE_HP : 1));
    this.events.push({ type: 'bulwarkBroken', x: b.x, z: b.z, r: b.r, points });
  }

  /** The Thren seed takes a hit; broken, it leaves a little Cyrite and parts where it grew. */
  private hurtSeed(d: ThrenSeed, dmg: number, x: number, y: number, z: number): void {
    this.events.push({ type: 'rockHit', x, y, z, id: -2, rx: d.x, rz: d.z, r: d.r, kind: 'volatile', size: 1, hp: Math.max(0, d.hp / 40), src: 'laser' });
    if (!d.hurt(this, dmg)) return;
    this.addScore(150, 'kills');
    this.events.push({ type: 'alienDestroyed', x: d.x, y: 0, z: d.z, kind: 'scout', faction: 'thren', points: 150, r: d.r, elite: false, label: 'Thren seed' });
    this.loot('rock', 'cyrite', SEED_CYRITE, d.x, d.z, 6);
    this.loot('rock', 'parts', SEED_PARTS, d.x, d.z, 6);
  }

  /** A seed studied quietly: a little Cyrite and parts, a radio line, once. */
  studySeed(d: ThrenSeed): void {
    this.loot('rock', 'cyrite', SEED_CYRITE, d.x, d.z, 6);
    this.loot('rock', 'parts', SEED_PARTS, d.x, d.z, 6);
    this.events.push({ type: 'ping', id: 'seed_studied', from: tr('Scope'), caller: 'unknown', text: seedLine(), moment: 'calm', system: this.sortie.name });
  }

  /** Seconds before the next bump flash. */
  private bumpT = 0;

  /**
   * Built things are solid (sim/solids.ts): the ship is pushed out and loses its inward way. A bump that is
   * more than a touch flashes the shield, and that is all: no charge, no plate, no grace.
   */
  private stepSolids(): void {
    this.bumpT = Math.max(0, this.bumpT - 1 / 60);
    // Lane Control flies her on rails past the depot; the paint bay and the jump have the helm too
    if (!this.bk || recovering(this.flags) || this.bk.jumpT >= 0 || this.phase !== 'play') return;
    const s = this.ship;
    for (const k of solidsOf(this)) {
      const dx = s.x - k.x, dz = s.z - k.z, d = Math.hypot(dx, dz) || 0.01, min = k.r + SHIP_R;
      if (d >= min) continue;
      const nx = dx / d, nz = dz / d;
      s.x = k.x + nx * min; s.z = k.z + nz * min;
      const vn = s.vx * nx + s.vz * nz;
      if (vn >= 0) continue;
      s.vx -= 1.4 * vn * nx; s.vz -= 1.4 * vn * nz;
      if (-vn > BUMP_SPEED && this.bumpT <= 0) {
        this.bumpT = BUMP_QUIET;
        this.events.push({ type: 'shieldHit', x: s.x, z: s.z, left: Math.floor(this.shields), source: 'solid', fx: k.x, fz: k.z });
      }
    }
  }

  /** The raider den takes a hit; when it breaks it spills its loot where it lay and pays its bounty. */
  private hurtDen(d: Den, dmg: number, x: number, y: number, z: number): void {
    this.events.push({ type: 'rockHit', x, y, z, id: -1, rx: d.x, rz: d.z, r: DEN_R, kind: 'iron', size: 0, hp: Math.max(0, d.hp / DEN_HP), src: 'laser' });
    if (!d.hurt(this, dmg)) return;
    const points = Math.round(DEN_BOUNTY * this.chainKill());
    this.addScore(points, 'kills');
    this.kills++;
    this.events.push({ type: 'alienDestroyed', x: d.x, y: 0, z: d.z, kind: 'freighter', faction: 'gutter', points, r: DEN_R, elite: false, label: 'Raider den' });
    this.loot('wreck', 'cyrite', DEN_CYRITE, d.x, d.z, 12);
    this.loot('wreck', 'parts', DEN_PARTS, d.x, d.z, 12);
    if (this.bk) this.bk.heat = Math.min(1, this.bk.heat + 0.05);
  }

  /** The refinery barge grinds a rock: it breaks as a blast would, its Cyrite spilling where it is. */
  grindRock(r: Rock): void { this.damageRock(r, r.hp + 1, 'hazard', r.x, 0, r.z, true); }

  private destroyRock(r: Rock, src: Weapon): void {
    if (!this.field.rocks.includes(r)) return;
    // the Story: the lasers take a rock apart clean, nothing left to split
    if (this.bk && src === 'laser') { this.mineRock(r); return; }
    const K = ROCK_KINDS[r.kind];
    if (this.chain > 0) this.chainT = CHAIN_WINDOW;
    const points = Math.round(ROCK_POINTS[r.size] * K.points * chainMult(this.chain));
    this.addScore(points, 'rocks');
    this.kills++;
    this.run.rocks++;
    // the Story: a blast destroys part of what was in it, and the rock is gone with it
    if (this.bk) { this.field.rocks.splice(this.field.rocks.indexOf(r), 1); this.run.blasted++; }
    else this.field.split(r, pressure(this.clock, this.flightMods).rockHp);
    let left: number | undefined;
    if (this.bk) {
      // broken, not mined: what the blast left of it
      const take = rockTake(src, TORP_YIELD * this.torpYieldMult), y = rockYield(r.kind, r.size, take);
      if (y.ore || y.cyrite) left = Math.round(take * 100);
      const ore = this.share(y.ore, this.survival.rock.ore), cyrite = this.share(y.cyrite, this.survival.rock.cyrite);
      if (ore) this.loot('rock', 'ore', ore, r.x, r.z, 4, r.vx, r.vz);
      if (cyrite) this.loot('rock', 'cyrite', cyrite, r.x, r.z, 4, r.vx, r.vz);
    }
    this.events.push({ type: 'rockDestroyed', id: r.id, x: r.x, z: r.z, r: r.r, vx: r.vx, vz: r.vz, size: r.size, points, kind: r.kind, src, left });
    // Krail by chance, in both modes (less of it in the Story mode, where mining gives it surely); a blast destroys some of it
    const blasted = src === 'torpedo' || src === 'mine' || src === 'plasma' || src === 'arc';
    if (this.rng.next() < K.crystal[r.size]! * this.stats.crystalChance * (blasted ? Math.min(1, TORP_YIELD * this.torpYieldMult) : 1)) this.loot('rock', 'crystal', this.share(K.crystals[r.size]! * (this.bk ? ROCK_KRAIL : 1), this.survival.rock.krail * this.income), r.x, r.z, 4, r.vx, r.vz);
    if (r.kind === 'volatile') this.blast(r.x, 0, r.z, VOLATILE_BLAST, VOLATILE_DAMAGE, src === 'hazard' ? 'hazard' : src, 'volatile', 1, true);
  }

  /**
   * A blast: damage to every hull, the boss and rock inside it. `vsShips`
   * multiplies the damage to hulls; `hurtsShip` lets it catch the player too.
   */
  private blast(x: number, y: number, z: number, radius: number, dmg: number, src: Weapon, kind: BlastKind, vsShips = 1, hurtsShip = false): void {
    this.events.push({ type: 'blast', x, y, z, radius, kind });
    const inside = (ox: number, oy: number, oz: number, r: number) => (ox - x) ** 2 + (oy - y) ** 2 + (oz - z) ** 2 < (radius + r) ** 2;
    for (const r of [...this.field.rocks]) {
      if (!inside(r.x, 0, r.z, r.r)) continue;
      if (!this.damageRock(r, dmg, src, r.x, 0, r.z)) this.field.impulse(r, r.x - x, r.z - z, ROCK_PUSH.blast * Math.max(0.3, 1 - Math.hypot(r.x - x, r.z - z) / (radius + r.r)));
    }
    for (const b of [...this.field.bulwarks]) if (inside(b.x, 0, b.z, b.r * 0.9)) this.damageBulwark(b, dmg, x, y, z, true);
    const snare = (src === 'torpedo' || src === 'mine') ? this.stats.snare : 0;
    for (const al of [...this.aliens]) {
      if (!inside(al.x, al.y, al.z, al.r)) continue;
      if (!this.hurtAlien(al, dmg * vsShips, src, al.x, al.y, al.z) && snare > 0) al.snare = snare;
    }
    const boss = this.command.targetable();
    if (boss && !boss.arriving && inside(boss.x, boss.y, boss.z, boss.r)) this.hurtBoss(dmg * vsShips, src, boss.x, boss.y, boss.z);
    const s = this.ship;
    if (hurtsShip && this.alive && s.invuln <= 0 && inside(s.x, 0, s.z, SHIP_R)) this.hitShip(kind === 'volatile' ? 'volatile' : 'blast', x, z);
  }

  // ── the end ───────────────────────────────────────────────────────────

  /** The last plate went: the wreck drifts a moment, then the run report. */
  private breach(): void {
    const s = this.ship;
    this.alive = false;
    this.dying = DYING;
    this.best = Math.max(this.best, this.score);
    this.events.push({ type: 'breach', x: s.x, z: s.z, score: this.score });
  }

  private finish(): void {
    const r = this.run;
    r.time = Math.round(this.runTime * 10) / 10;
    r.score = this.score;
    r.refit = this.refit;
    r.build = { ...this.levels };
    r.identity = identity(this.levels).title;
    r.capitalsEscaped = Math.max(0, this.command.count - this.command.kills - (this.command.boss ? 1 : 0));
    r.timeline.push({ t: Math.round(this.runTime), score: this.score, plates: this.run.escaped ? this.plates : 0, refit: this.refit });
    this.comms = null; this.call = null;
    this.phase = 'over';
  }

  /** A new run where the ship is: same sector, fresh ship. */
  restart(opts: WorldOptions = {}): void {
    useIds(this.ids);
    const s = this.ship;
    if (opts.mode) this.mode = opts.mode;
    if (opts.unlocked) for (const u of opts.unlocked) this.unlocked.add(u);
    // a new run takes the mode it is given: the options', else its sortie's, else the one it had
    if (opts.survival || opts.sortie?.survival) { this.survival = SURVIVAL[opts.survival ?? opts.sortie!.survival!]; this.mods = threatened(this.survival.sky, (opts.sortie ?? this.sortie).threat); }
    this.field.rocks = this.field.rocks.filter((r) => Math.hypot(r.x - s.x, r.z - s.z) >= 18);
    if (opts.sortie) {
      // a new system: new rock all round
      this.sortie = opts.sortie;
      this.mods = threatened(this.survival.sky, opts.sortie.threat);
      this.field.rocks = [];
      this.field.bulwarks = [];
      this.field.seed(s.x, s.z);
    }
    if (opts.carry !== undefined) this.carryIn = opts.carry;
    this.field.richBoost = 0;
    this.field.density = 1;
    this.aliens = []; this.shots = []; this.webs = []; this.pickups = []; this.bolts = []; this.torps = [];
    this.tele = []; this.strikes = []; this.sys = newSystems();
    this.closePressed = 0;
    this.command.reset();
    this.encounter = null; this.parked = null;
    this.tutor = null;
    this.redo = false;
    this.opening = false;
    this.pace = newPace(this.mode === 'arcade' ? ARCADE_OPENING.first : ALIEN_FIRST);
    this.mend = newMend();
    this.score = 0; this.kills = 0; this.runTime = 0;
    this.space = this.spaceOn && this.mode === 'arcade' ? new Space(this.rng.int(1e9), { hazard: this.mods.hazard }) : null;
    this.levels = {};
    this.stats = this.buildStats();
    this.hull = flightHull(this.stats);
    this.plates = this.stats.maxPlates;
    this.shields = this.stats.shieldMax; this.shieldT = 0;
    this.arms = newArms(this.stats);
    this.refit = 0; this.techs = new Set();
    this.cloakT = 0; this.chain = 0; this.chainT = 0; this.surgeN = 0; this.surgeT = 0; this.wells = []; this.pdT = 0;
    for (const k of POWERS) this.powers[k] = 0;
    this.dcUsed = false; this.sinceHit = 0; this.repairCd = 0; this.boostCd = BOOST_FIRST;
    this.theatre = 'gutter'; this.theatreT = 70; this.nextEvent = EVENT_FIRST; this.eventN = 0; this.lastEvent = null;
    this.timeScore = 0; this.nextSample = 0;
    this.alive = true; this.dying = 0;
    s.vx = s.vz = 0;
    s.invuln = BREACH_GRACE;
    this.run = newRun(this.seed, this.survival.id);
    this.phase = 'play';
    this.begin();
    this.layStory();
  }
}

/** Distance in metres, for copy. */
export const metres = (u: number) => Math.round(u / PX);
