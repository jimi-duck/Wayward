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
import { STORY_AT } from '../content/story';
import {
  BLOCKADE_AT, BLOCKADE_HP, CAPITAL_CYRITE, CAPITAL_KRAIL, CAPITAL_SUPPLIES, ROCK_KRAIL, WRECK_KRAIL, DOCK_COOL, DOCK_TIME, HEAT_CLOCK, HEAT_MINE, MINE_WORK, rockTake, TORP_YIELD, HEAT_KILL, HEAT_KILL_CUSTODY, HEAT_RATE, QUIET_COOL, JUMP_COST, PATCH_COST,
  PATCH_QUIET, PATCH_TIME, SPOOL, SPOOL_RUN, JAM_SPOOL, SWARM_WEAVER, THREN_JAM, swarmGap, swarmSize, type Waypoint, START_CYRITE, TANK_MAX, newBreakout, pickPursuer, pursuitCap, pursuitElite, pursuitInterval,
  rockYield, DOCK_SPEED, CYRITE_SELL, CYRITE_RUSH, SUPPLIES_MAX, SUPPLIES_START, LOW_SUPPLIES, EMPTY_STORES, HOME, places, type Breakout, type Carry, type Mode, type SortieDef, type SortieResult,
} from './breakout';
import {
  CARD_BY_ID, COMMS_FIRST, PORT_CALL, SLOW, amount, condOk, openCard, pickCard, refresh, resolve, theirStrength, weightOf, yourStrength, type CardDef, type Ctx, type JobDef, type Open,
  type Outcome, type Standing,
} from './comms';
import { computeStats, identity, type Levels } from './build';
import { flightControls, type FlightControls } from './controls';
import { EVENT_FIRST, eventGap, NO_MODS, pressure, type Mods, type Pressure } from './director';
import { Stage, makeStage } from './stage';
import { pickEncounter, startEncounter, stepEncounter, wellPull, type Encounter, type EncounterHost, type EncounterId } from './encounters';
import {
  ALIEN_FIRST, ALIEN_TYPES, BEAM_LEN, BEAM_W, BORG_ADAPT, CULL, ELITE_BLAST_DAMAGE, ELITES, FACTION_TRAITS, SPAWN_FAR, SPAWN_NEAR, SQUADS, VARIANTS,
  WEB_R, alienBonus, alienFire, alienLabel, beamLive, cloaked, leave, moveAlien, moveShots, pickElite, pickVariant, rayDist,
  spawnAlien, stepBeam, stepWebs, type Alien, type Arena, type EliteId, type Faction, type Shot, type Web,
} from './enemies';
import type { BlastKind, GameEvent, PowerKind } from './events';
import { Field, ROCK_KINDS, VOLATILE_BLAST, VOLATILE_DAMAGE, type Bulwark, type Rock } from './field';
import { Ids, newId, useIds } from './ids';
import { CELL, dropCrystals, dropItem, POWERS, POWER_TIME, stepPickups, YIELD_BLAST, YIELD_DAMAGE, type CellSource, type Pickup, type PickupKind } from './pickups';
import { Rng } from './rng';
import { laySortie } from './sites';
import { CALM, reports, weightAt, Space, type Influence, type Report as Condition } from './space';
import { newRun, TIMELINE, type RunStats, type ScoreSource, type Weapon } from './run';
import { drifting, newShip, stepShip, topSpeed, type ShipState } from './ship';
import { BASE, flightHull, type Stats } from './stats';
import {
  BREACH_GRACE, CHAIN_WINDOW, DYING, PX, BOOST_FIRST, BOOST_CHANCE, BOOST_GAP, REPAIR_CHANCE,
  REPAIR_CHANCE_ELITE, REPAIR_GAP, BULWARK_POINTS, MINE_HP, MINE_KRAIL, ROCK_BUMP, ROCK_POINTS, SCORE_PER_CRYSTAL, SCORE_PER_SECOND, SHIELD_GRACE, SHIP_R, TORP_FUSE, chainMult,
} from './tuning';
import { SCRAP_PRICE, type Prices } from '../content/systems';
import { ARCADE_PRICE } from '../content/web';
import { blockOf, install as bayInstall, quickPicks, stockLevels, type BayCtx, type Block } from './bay';
import { feelBudgets, overRatings, weightFuel } from './budgets';
import { arrival, newPace, PACING, patrolStart, pickApproach, waveSize, type Approach, type Pace } from './pacing';
import { planStop, type Stop } from './stop';
import { reasonOf, type Advice } from './advice';
import { voiceId, voiceText } from './voice';
import { hurtMend, newMend, SELF_REPAIR, stepMend, type Mend } from './repair';
import { discounted, effects, type Effects } from './modules';
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
export type PortItem = 'cyrite' | 'plate' | 'supplies';

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

const IDLE: FlightControls = { turn: 0, thrust: 0, roll: false, brk: false, rollDir: 0, fire: false, torpedo: false };
const BOSS_PLATES = 1;

/** The ship's alert (World.alert): clear, yellow (observed) or red (targeted). */
export type Alert = 'clear' | 'yellow' | 'red';
/** A hostile hull this close (units) puts the ship on yellow alert: a little outside its guns' reach (FIRE_RANGE 70), well inside where hulls arrive. */
export const WATCH_RANGE = 85;

/** The arcade's bay opens by itself after this long with the alert clear and a price of Krail aboard. */
export const BAY_QUIET = 2;

/** Seconds into a sortie before the system's place shows itself. */
export const PLACE_AT = 30;

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
  pickups: Pickup[] = [];
  sys: Systems = newSystems();
  tele: Telegraph[] = [];
  strikes: Strike[] = [];
  readonly command = new Command();
  encounter: Encounter | null = null;
  /** The system's situation, played on the sector (sim/stage.ts). */
  stage: Stage | null = null;
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
  private stormT = 2;
  private coreT = 1;
  /** What the place does to the ship now (sim/space.ts), and what to tell the player of it. */
  air: Influence = { ...CALM, tint: [0, 0, 0], from: [] };
  conditions: Condition[] = [];
  private readonly there: Influence = { ...CALM, tint: [0, 0, 0], from: [] };
  /** Rocks and hulls broken this run. */
  kills = 0;
  /** The arcade's encounters: a wave on its way or being fought, or the quiet between (sim/pacing.ts). */
  pace: Pace = newPace(ALIEN_FIRST);
  /** The arcade's self-repair (sim/repair.ts). */
  mend: Mend = newMend();
  /** The arcade's bay: the Krail it opens at next, and how long it has been quiet with that much aboard. */
  private bayAt = ARCADE_PRICE;
  private bayQuiet = 0;
  /** Something was fitted since the bay opened: what is left is a new pick, not a skipped one. */
  private bayFit = false;
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
  private wasBreaking = false;
  readonly events: GameEvent[] = [];

  // the Breakout: the course and the pursuit (null in the arcade), the tank, the hold, the cutter
  mode: Mode;
  bk: Breakout | null = null;
  /** Chits are the only money, in both modes. `krail` is the run's old name for the same purse (the Arcade's tuning and records still use it). */
  get krail(): number { return this.chits; }
  set krail(v: number) { this.chits = v; }
  /** What the bay spends: chits, in both modes. */
  get purse(): number { return this.chits; }
  /** Cyrite in the tank: fuel for the jump (the Story mode). */
  cyrite = 0;
  /** Chits aboard: the one purse in both modes (the bay, ports, favours). Rock and scrap pay into it as they are picked up. */
  chits = 0;
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
  portCalled = false;
  private cardsSeen = new Set<string>();
  /** Cards heard earlier in the journey: the ones that come once do not come again. */
  private heard = new Set<string>();
  private follows: Array<{ card: string; at: number }> = [];
  /** Seconds of a sold survey's veined rock left. */
  private seamT = 0;

  // the journey: the system being flown, what came aboard with the ship, and what this sortie did to the hunt
  sortie: SortieDef = HOME;
  private carryIn: Carry | null = null;
  /** Calloway: seconds into the sortie she arrives; whether she has, and whether her ship is the one fighting. */
  callowayAt = Infinity;
  callowayMet = false;
  callowayBeaten = false;
  private callowayShip = false;
  /** Her offer (sim/calloway.ts): made this sortie. */
  offerMade = false;
  /** The story beat (sim/story.ts): played this sortie. */
  storyMade = false;
  /** Jumps she is behind, for the cards (Infinity: not on the trail yet). */
  behind = Infinity;
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
    this.mods = this.survival.sky;
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
    this.seamT = 0;
    this.callowayMet = false; this.callowayBeaten = false; this.callowayShip = false; this.offerMade = false; this.storyMade = false; this.huntDelay = 0; this.stall = 0;
    this.captainMet = false; this.captainFighting = false; this.captainEnd = null; this.noticeDelta = {}; this.captainAt = Infinity;
    this.placeDue = this.mode === 'breakout' && !!this.sortie.place; this.placeWon = null;
    this.stage = null;
    if (this.mode !== 'breakout') {
      this.bk = null; this.krail = 0; this.cyrite = 0; this.chits = 0; this.supplies = 0; this.callowayAt = Infinity;
      this.bayAt = ARCADE_PRICE; this.bayQuiet = 0;
      this.stock();
      return;
    }
    const def = this.sortie;
    this.bk = newBreakout(this.ship.heading, def);
    this.callowayAt = def.calloway;
    this.captainAt = def.quiet ? Infinity : def.notice.captain?.at ?? Infinity;
    this.behind = def.behind;
    this.heard = new Set();
    // the course is laid out from where the ship is now
    const b = this.bk, s = this.ship;
    for (const w of places(b)) { w.x += s.x; w.z += s.z; }
    this.field.density = def.density;
    this.cyrite = this.survival.voyage.start.cyrite;
    this.krail = 0;
    this.chits = 0;
    this.supplies = this.survival.voyage.start.supplies;
    // a few violet-veined rocks in the opening field: the first Cyrite is there to be cut
    let n = 0;
    const most = Math.round(this.richShare * 44);
    for (const r of this.field.rocks) {
      if (r.size === 0 && this.rng.next() < 0.12 && n < most) { r.kind = 'rich'; r.hp = r.maxHp = Math.round(r.maxHp * 1.6); n++; }
    }
    if (def.situation && !def.home) this.stage = makeStage(def.system, def.situation, this);
    if (this.carryIn) this.bringAboard(this.carryIn);
    this.stock();
    this.fitAboard();
  }

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
    this.cyrite = Math.min(TANK_MAX, c.cyrite);
    this.chits = c.chits;
    this.supplies = Math.min(this.supplyMax, c.supplies);
    this.levels = { ...c.levels };
    this.refreshStats();
    this.plates = Math.max(1, Math.min(this.stats.maxPlates, c.plates));
    this.refit = c.refit;
    this.techs = new Set(c.techs);
    this.flags = new Set(c.flags);
    this.standing = { ...c.standing };
    this.jobs = c.jobs.map((j) => ({ ...j }));
    this.heard = new Set(c.seen);
  }

  /** The cards that cannot come now: heard this sortie, or heard on the journey and not the kind that comes again. */
  private blocked(): Set<string> {
    const out = new Set(this.cardsSeen);
    for (const id of this.heard) if (!CARD_BY_ID[id]?.repeat) out.add(id);
    return out;
  }

  /** What the ship carries now, into the next system. */
  carry(): Carry {
    return {
      cyrite: this.cyrite, chits: this.chits, supplies: this.supplies, plates: this.plates, levels: { ...this.levels },
      refit: this.refit, techs: [...this.techs], flags: [...this.flags], standing: { ...this.standing }, jobs: this.jobs.map((j) => ({ ...j })),
      seen: [...new Set([...this.heard, ...this.cardsSeen])],
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
    const report = this.captainEnd ?? (this.captainFighting ? (this.run.escaped ? 'evaded' : 'won') : null);
    return report ? { id: c.id, report } : null;
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
  get warnings(): Array<'empty' | 'low' | 'heavy' | 'hot'> {
    const out: Array<'empty' | 'low' | 'heavy' | 'hot'> = [];
    if (this.bk) {
      if (this.supplies <= 0) out.push('empty');
      else if (this.supplies <= LOW_SUPPLIES) out.push('low');
    }
    const over = overRatings(this.levels);
    if (over.mass) out.push('heavy');
    if (over.heat) out.push('hot');
    return out;
  }

  /** The clock the difficulty curve reads: run time in the arcade, heat in the Breakout. */
  private get clock(): number {
    return this.bk ? this.bk.heat * HEAT_CLOCK : this.runTime;
  }

  /** Everything that happened since the last call. */
  drain(): GameEvent[] {
    return this.events.splice(0);
  }

  /** What the seeker can see this step. A capital ship still dropping in is not yet in reach; a cloaked hull never is. */
  targets(): Targets {
    const boss = this.command.targetable();
    // a ward is nobody's target: homing and aim help leave traffic and visitors alone
    return { ships: this.aliens.filter((a) => !cloaked(a) && !a.ward), boss: boss && !boss.arriving ? boss : null, rocks: this.field.rocks };
  }

  /** The current difficulty. */
  get pressure(): Pressure {
    return pressure(this.clock, this.mods);
  }

  /** The arcade's Krail income: the mode's sky says how much; the Story's income is in its rock and salvage rows. */
  private get income(): number {
    return this.bk ? 1 : this.mods.income;
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
    return (this.encounter?.id === 'nebula' && !this.encounter.done) || this.navNoise > 0.3 || this.air.sight < 0.7;
  }

  /** How scrambled navigation is, 0 to 1: Thren hulls close by make the lane mouth swim on the scope and the drive spool slow. */
  navNoise = 0;

  /** The places as the scope shows them: the lane mouth wanders while the Thren scramble navigation. */
  seenPlaces(): Waypoint[] {
    const b = this.bk;
    if (!b) return [];
    if (this.navNoise <= 0) return places(b);
    const t = this.runTime, n = this.navNoise * 60;
    return places(b).map((w) => (w.kind === 'lane' ? { ...w, x: w.x + Math.sin(t * 1.3) * n, z: w.z + Math.cos(t * 0.9) * n } : w));
  }

  // ── the step ──────────────────────────────────────────────────────────

  step(dt: number, input: InputFrame): void {
    useIds(this.ids);
    if (this.review) return this.stepReview(dt, input);
    // an ambush on the table slows the world rather than stopping it, and does not wait for ever
    const slowed = this.phase === 'comms' && !!this.comms && this.comms.slow > 0;
    if (this.phase !== 'play' && !slowed) return;
    if (slowed) {
      dt *= SLOW;
      const o = this.comms!;
      if ((o.slow = Math.max(0, o.slow - dt)) <= 0) { this.answer(o.def.slow!.default, true); return; }
    }
    // the stores run out or come back: the stat block follows
    if (this.bk && (this.supplies <= 0) !== this.thin) this.refreshStats();
    Object.assign(this.prev, this.ship);
    const s = this.ship, t = this.runTime, st = this.stats;
    const p = pressure(this.clock, this.mods);
    const c = this.alive && !slowed && (!this.bk || this.bk.jumpT < 0) ? flightControls(input) : IDLE;
    stepShip(s, c, this.hull, dt);
    if (this.space) this.stepSpace(dt, s);
    const rolling = s.rollT >= 0;
    if (rolling && !this.wasRolling && st.rollBurst) plasmaRing(this.sys, s, st);
    if (rolling && !this.wasRolling && st.rollCloak > 0) { this.cloakT = st.rollCloak; this.events.push({ type: 'cloak', x: s.x, z: s.z }); }
    this.wasRolling = rolling;
    const breaking = s.breakT >= 0;
    if (breaking && !this.wasBreaking) this.events.push({ type: 'break', x: s.x, z: s.z });
    this.wasBreaking = breaking;
    this.tick(dt);

    // our weapons and systems
    const targets = this.targets();
    const fm: FireMods = { rapid: this.powers.rapid > 0, damage: this.dmgMult * (this.powers.overdrive > 0 ? 1.5 : 1), drifting: drifting(s, this.hull) };
    let fireStats = this.sensorsDown || this.air.lock < 1 ? { ...st, torpSeek: st.torpSeek * (this.sensorsDown ? 0.6 : 1) * this.air.lock } : st;
    if (this.powers.yield > 0) fireStats = { ...fireStats, torpDamage: fireStats.torpDamage * YIELD_DAMAGE, torpBlast: fireStats.torpBlast * YIELD_BLAST };
    if (this.alive) {
      fireWeapons(this.arms, s, c, targets, fireStats, fm, this.bolts, this.torps, this.events, dt);
      const laid = laySystems(this.sys, s, st, dt, fm.rapid);
      if (laid) this.events.push({ type: 'mineLaid', x: laid.x, z: laid.z });
    }

    // the sector
    this.field.step(dt, s.x, s.z, this.bk ? { ...p, rockHp: p.rockHp * MINE_HP, rich: this.richShare } : p);
    if (this.bk) { this.pursue(t); this.swarm(t); this.jam(dt); }
    else this.spawn(t, p);
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
    this.stepSystems(dt, fm.rapid);
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

  /** Heat, patching, the port and the lane mouth. */
  private stepBreakout(dt: number): void {
    const b = this.bk!, s = this.ship;
    b.heat = b.def.quiet ? Math.max(0, b.heat - QUIET_COOL * dt) : Math.min(1, b.heat + HEAT_RATE * b.def.heatRate * this.fx.heat * this.survival.heat.rate * dt);
    if (b.nagT > 0) b.nagT -= dt;
    if (this.seamT > 0 && (this.seamT -= dt) <= 0) { this.field.richBoost = 0; this.field.density = b.def.density; }
    if (!this.alive || b.jumpT >= 0) return;
    this.stage?.step(this, dt);

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
      const clear = w.kind === 'port' || w.kind === 'site' ? 30 : 24;
      for (const o of [...this.field.rocks, ...this.field.bulwarks]) {
        const dx = o.x - w.x, dz = o.z - w.z, d = Math.hypot(dx, dz) || 1, min = clear + o.r;
        if (d < min) { o.x = w.x + (dx / d) * min; o.z = w.z + (dz / d) * min; }
      }
    }

    const speed = Math.hypot(s.vx, s.vz) / topSpeed(this.hull);
    // the port: slow inside its ring, and the clamps take you
    const dp = b.port ? Math.hypot(s.x - b.port.x, s.z - b.port.z) : Infinity;
    if (b.port && dp < b.port.r && speed < DOCK_SPEED && this.command.state !== 'fight' && this.phase === 'play') {
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
    if (beat && !this.storyMade && this.runTime >= STORY_AT && this.command.state === 'idle' && this.phase === 'play' && b.blockade !== 'checkpoint' && b.jumpT < 0) {
      this.storyMade = true;
      const def = CARD_BY_ID[beat];
      if (def && !this.heard.has(def.id) && !this.cardsSeen.has(def.id)) this.desk.offer(def, weightOf(def), this.runTime);
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

    // the lane mouth: a blockade's checkpoint is a comms card; an open lane may still have someone waiting
    const dl = Math.hypot(s.x - b.lane.x, s.z - b.lane.z);
    if (b.blockade === 'none' && dl < BLOCKADE_AT && this.command.state === 'idle' && this.phase === 'play') {
      if (b.def.nemesis.finale) {
        // the last meeting: Calloway holds the lane to the Threshold herself
        b.blockade = 'checkpoint';
        this.callowayMet = true;
        this.openComms(b.def.nemesis.finale);
      } else if (b.def.blockade) {
        b.blockade = 'checkpoint';
        this.openComms(CARD_BY_ID.checkpoint!);
      } else {
        b.blockade = 'done';
        // an open lane's toll is not every jump's: a roll, and not on the heels of another call
        const def = this.deskRng.next() < DESK.toll && this.desk.may('major', 'free', this.runTime) ? pickCard(this.commsCtx(), this.blocked(), this.rng, 'toll') : null;
        if (def) this.openComms(def);
      }
    }
    if (b.blockade === 'called' && this.command.state === 'idle' && !this.command.boss) b.blockade = 'done';

    // the lane mouth: hold inside it with the Cyrite to jump while the drive spools
    if (dl < b.lane.r) {
      if (this.cyrite >= this.jumpCost && this.phase === 'play') {
        if (b.spool === 0) this.events.push({ type: 'spool' });
        b.spool += dt * (1 - JAM_SPOOL * this.navNoise);
        if (b.spool >= b.spoolNeed) this.jump();
      } else if (b.nagT <= 0) {
        b.nagT = 6;
        this.events.push({ type: 'needCyrite', have: this.cyrite, need: this.jumpCost });
      }
    } else b.spool = Math.max(0, b.spool - dt * 2);
  }

  /** The pursuit holds off for this system's calm (SortieDef.pace): after an answered card, or when the last pursuer is beaten. */
  private rest(): void {
    const b = this.bk;
    if (b?.def.pace) b.nextPursuit = Math.max(b.nextPursuit, this.runTime + b.def.pace.calm);
  }

  /** The pursuit: Custody hulls from behind (from home), now and then a Gutter crew from ahead, as often as the heat says. */
  private pursue(t: number): void {
    const b = this.bk!, s = this.ship;
    const cs = this.command.state;
    if (b.def.quiet || cs === 'fight' || cs === 'inbound' || cs === 'hailing' || t < b.nextPursuit) return;
    const regular = this.aliens.filter((a) => !a.escort && !a.extra).length;
    const cap = Math.max(1, Math.round(pursuitCap(b.heat) * this.survival.pursuit.cap));
    if (regular < cap) {
      const pick = pickPursuer(b.heat, this.rng, b.def.gutter, b.def.ahead);
      const v = VARIANTS[pick.variant]!;
      // behind: the bearing from the lane mouth back past the ship, spread a little
      const home = Math.atan2(-(s.z - b.lane.z), s.x - b.lane.x);
      const a = (pick.ahead ? home + Math.PI : home) + this.rng.range(-0.7, 0.7);
      const d = this.rng.range(115, 145);
      const at = { x: s.x + Math.cos(a) * d, y: ALIEN_TYPES[v.kind].role === 'cruiser' ? this.rng.range(-3, 8) : this.rng.range(-4, 16), z: s.z - Math.sin(a) * d };
      const elite = this.rng.next() < pursuitElite(b.heat) * this.survival.pursuit.elite + b.def.notice.elite ? pickElite(v.kind, v.faction, this.rng) : null;
      const lead = this.spawnHostile(v.id, at, elite);
      // a pair, once the heat is up
      if (b.heat > 0.35 && regular + 1 < cap && ALIEN_TYPES[v.kind].role === 'interceptor' && this.rng.next() < 0.5) {
        const wing = this.spawnHostile(v.id, { x: at.x + Math.sin(a) * 5, y: at.y + 1.5, z: at.z + Math.cos(a) * 5 });
        wing.modeT = lead.modeT + 0.6;
      }
    }
    // hunters: a faction that has marked you sends its pursuit oftener
    b.nextPursuit = t + pursuitInterval(b.heat) * b.def.notice.pursuit * this.survival.pursuit.gap * this.rng.range(0.8, 1.2);
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
    b.nextSwarm = t + swarmGap(thren, this.cyrite) * this.rng.range(0.8, 1.2);
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
    this.events.push({ type: 'rockMined', x: r.x, z: r.z, size: r.size, kind: r.kind, ore, cyrite, points });
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
  }

  /** What the port here charges (Cerro's prices outside a sortie), less what the ship's contacts knock off, and the survival mode's rate for ore. */
  get prices(): Prices {
    return discounted(this.bk?.prices ?? HOME.port!.prices, this.levels);
  }

  /** The most supplies the ship holds: the racks add to it. */
  get supplyMax(): number {
    return SUPPLIES_MAX + this.fx.hold;
  }

  /** What a lump of scrap pays in chits when it is picked up: the port's price for it, at the survival mode's rate. */
  get scrapValue(): number {
    return Math.max(1, Math.round(SCRAP_PRICE * this.survival.voyage.ore));
  }

  /** Supplies a patch takes: the machine shop saves some. */
  get patchCost(): number {
    return Math.max(1, PATCH_COST - this.fx.patch);
  }

  /** What a unit of Cyrite costs here: the work bay's price, doubled while the tank is short of the jump. */
  get cyritePrice(): number {
    const p = this.prices.cyrite;
    return this.bk && this.cyrite < this.jumpCost ? Math.ceil(p * CYRITE_RUSH) : p;
  }

  /** Cyrite aboard beyond what the jump takes: what the bay will buy. */
  get spareCyrite(): number {
    return Math.max(0, this.cyrite - this.jumpCost);
  }

  /** At the work bay: sell spare Cyrite (all of it, or `n`) for chits. Returns the chits paid. */
  sellCyrite(n = Infinity): number {
    if (this.phase !== 'dock' || !this.bk) return 0;
    const k = Math.min(Math.floor(n), this.spareCyrite);
    if (k <= 0) return 0;
    const got = k * CYRITE_SELL;
    this.cyrite -= k;
    this.chits += got;
    return got;
  }

  /** Whether a thing can be had at the port now. */
  canBuy(item: PortItem): boolean {
    if (this.phase !== 'dock') return false;
    if (this.chits < (item === 'cyrite' ? this.cyritePrice : this.prices[item])) return false;
    if (item === 'cyrite') return this.cyrite < TANK_MAX;
    if (item === 'plate') return this.plates < this.stats.maxPlates;
    if (item === 'supplies') return this.supplies < this.supplyMax;
    return true;
  }

  /** At the port: buy one of something. */
  buy(item: PortItem): boolean {
    useIds(this.ids);
    if (!this.canBuy(item)) return false;
    this.chits -= item === 'cyrite' ? this.cyritePrice : this.prices[item];
    if (item === 'cyrite') this.cyrite++;
    else if (item === 'supplies') this.supplies++;
    else this.repair(1);
    return true;
  }

  /** What the port would do for a sensible stop now (sim/stop.ts). */
  planStop(): Stop {
    return planStop({ rush: this.bk ? CYRITE_RUSH : 1, supplyMax: this.supplyMax, chits: this.chits, prices: this.prices, cyrite: this.cyrite, jumpCost: this.jumpCost, supplies: this.supplies, plates: this.plates, maxPlates: this.stats.maxPlates });
  }

  /** At the port: the sensible stop. Returns what it did. */
  sensibleStop(): Stop {
    const plan = this.planStop();
    if (this.phase !== 'dock') return { cyrite: 0, supplies: 0, plate: 0, chits: 0 };
    for (const item of ['cyrite', 'supplies', 'plate'] as const) for (let i = 0; i < plan[item]; i++) this.buy(item);
    return plan;
  }

  /** Docked: the journey plotted another lane out of here (sim/journey.ts replot). The lane mouth stays where it is. */
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
    this.ship.invuln = Math.max(this.ship.invuln, 2);
  }

  /** Into the lane: the drive takes the Cyrite and the ship is gone. */
  private jump(): void {
    const b = this.bk!, s = this.ship;
    this.cyrite -= this.jumpCost;
    this.settleJobs('lane');
    this.run.escaped = true;
    this.run.cyriteLeft = this.cyrite;
    this.run.cause = 'escaped';
    this.addScore(5000 + this.cyrite * 50 + this.plates * 500, 'events');
    b.jumpT = 1.6;
    s.invuln = 99;
    this.events.push({ type: 'jumped', x: s.x, z: s.z });
  }

  /** Clocks: boosters, the chain, shields, regeneration. */
  private tick(dt: number): void {
    const st = this.stats;
    for (const k of POWERS) if (this.powers[k] > 0) this.powers[k] = Math.max(0, this.powers[k] - dt);
    if (this.cloakT > 0) this.cloakT = Math.max(0, this.cloakT - dt);
    if (this.repairCd > 0) this.repairCd -= dt;
    if (this.boostCd > 0) this.boostCd -= dt;
    if (this.chain > 0 && (this.chainT -= dt) <= 0) this.chain = 0;
    this.sinceHit += dt;
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
    for (const a of this.aliens) {
      if (a.fleeing || a.ward || ALIEN_TYPES[a.kind].fire === 'none' || a.mode === 'patrol' || a.mode === 'watch' || a.mode === 'brawl') continue;
      if (Math.hypot(a.x - s.x, a.z - s.z) < SELF_REPAIR.danger) return true;
    }
    for (const sh of this.shots) if (Math.hypot(sh.x - s.x, sh.z - s.z) < SELF_REPAIR.fireDanger) return true;
    return false;
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
    if (this.review) return 'clear';
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
    return { levels: this.levels, unlocked: this.unlocked, techs: this.techs, arcade: !this.bk, docked: this.docked, krail: this.chits, chits: this.chits, pooled: true, deal: this.bayDeal, passed: this.bayPassed };
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
    if (this.bk) return 'away'; // the Story fits only at a work bay
    const a = this.alert();
    return a === 'clear' ? null : a;
  }

  /** Open the bay: the world waits while you fit. False if it cannot open now (see bayClosed). */
  openBay(): boolean {
    if (this.bayClosed()) return false;
    this.phase = 'bay';
    if (!this.bk) this.bayShown = { ids: quickPicks(this.bayCtx()).map((w) => w.id), at: this.levels };
    return true;
  }

  /** Fit one more level of `id`, paid in Krail (and the yard's chits). Null when fitted, else why not (sim/bay.ts). */
  install(id: string): Block | 'closed' | null {
    useIds(this.ids);
    if (this.phase !== 'bay') return 'closed';
    return this.fit(id);
  }

  /**
   * The arcade's bay opens by itself: once the Krail aboard reaches a price,
   * the alert has been clear a moment, and something can be fitted. Leaving
   * with a price or more unspent puts the next opening one price further on
   * (closeBay); the B key and the badge still open it sooner.
   */
  private bayDue(dt: number): void {
    if (this.bk || !this.alive || this.phase !== 'play' || this.krail < this.bayAt) { this.bayQuiet = 0; return; }
    this.bayQuiet = this.alert() !== 'clear' ? 0 : this.bayQuiet + dt;
    if (this.bayQuiet < BAY_QUIET) return;
    this.bayQuiet = 0;
    const ctx = this.bayCtx();
    if (quickPicks(ctx).some((w) => blockOf(w.id, ctx) === null)) this.openBay();
    else this.bayAt = this.krail + ARCADE_PRICE; // nothing it could buy now: look again a price later
  }

  private fit(id: string): Block | null {
    const r = bayInstall(id, this.bayCtx());
    if (typeof r === 'string') return r;
    this.bayFit = true;
    if (this.bk) this.chits -= r.cost + r.fee;
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
    // the arcade asks again at a price: at once for what is left after a pick, a price past it if the player left without one
    this.bayAt = this.bayFit || this.krail < ARCADE_PRICE ? ARCADE_PRICE : this.krail + ARCADE_PRICE;
    this.bayFit = false;
    this.bayQuiet = 0;
    this.bayDeal++;
    // the cards that were dealt and not taken: the next opening is slower to deal them again
    if (this.bayShown) this.bayPassed = this.bayShown.ids.filter((id) => (this.levels[id] ?? 0) === (this.bayShown!.at[id] ?? 0));
    this.bayShown = null;
  }

  // ── comms ─────────────────────────────────────────────────────────────

  /** What a card can see of the ship and the run. */
  commsCtx(): Ctx {
    const b = this.bk, s = this.ship;
    const place = !b ? 'open' : Math.hypot(s.x - b.lane.x, s.z - b.lane.z) < BLOCKADE_AT ? 'lane' : b.port && Math.hypot(s.x - b.port.x, s.z - b.port.z) < PORT_CALL ? 'port' : 'open';
    return {
      t: this.runTime, heat: b?.heat ?? 0, cyrite: this.cyrite, need: b ? this.jumpCost : JUMP_COST, tank: TANK_MAX, chits: this.chits,
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

  /** Who calls, and when. Everything that wants to talk is offered to the desk, which says when it is heard. */
  private stepComms(): void {
    const b = this.bk!, t = this.runTime, s = this.ship, d = this.desk;
    if (!this.alive || this.phase !== 'play') return;
    const busy = this.busy();
    const was = this.wasBusy;
    this.wasBusy = busy;
    d.watch(busy, t);
    d.sweep(t, this.docked);
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
    const due = this.follows.findIndex((f) => f.at <= t);
    if (due >= 0) {
      const [f] = this.follows.splice(due, 1);
      const def = CARD_BY_ID[f!.card];
      if (def && !this.cardsSeen.has(def.id)) d.offer(def, weightOf(def), t);
    }
    // the port's approach calls once
    if (!this.portCalled && !this.docked && b.port && Math.hypot(s.x - b.port.x, s.z - b.port.z) < PORT_CALL) {
      this.portCalled = true;
      const def = pickCard(this.commsCtx(), this.blocked(), this.rng, 'port');
      if (def && (weightOf(def) === 'major' || this.deskRng.next() < DESK.portNews)) d.offer(def, weightOf(def), t, true);
    }
    // a new card by chance: only on an opportunity, never on a timer alone, and few a sortie
    if (!b.def.quiet && t >= this.cardNext && d.wants(t, busy)) {
      const def = pickCard(this.commsCtx(), this.blocked(), this.rng);
      if (def) { d.offer(def, weightOf(def), t); d.used(); }
    }

    // deliver the one that is next, if the moment is right
    if (!this.call) {
      const a = d.next(busy, t);
      if (a) {
        const pre = a.def.trigger === 'chance' || a.def.trigger === 'follow' || a.def.trigger === 'port' || a.def.trigger === undefined;
        if (!pre || condOk(a.def.when, this.commsCtx())) {
          if (a.tier === 'major') return this.openComms(a.def);
          this.openCall(a.def);
        }
      }
    }
    // the radio: a line, no answer. A card on the table has the screen.
    if (!this.call) {
      const m = d.pingFor(busy, t, this.deskRng);
      if (m) this.say(m);
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
    this.events.push({ type: 'call', id: def.id, tier: o.tier as 'important' | 'routine', kind: def.kind, from: o.def.from, title: o.def.title, seconds: this.callUntil - this.runTime });
  }

  /** Nobody answered: the channel closes and nothing happens. */
  private lapse(): void {
    const o = this.call;
    if (!o) return;
    this.call = null;
    this.desk.closed(this.runTime);
    this.run.cards.push({ id: o.def.id, choice: 'lapsed', won: false, t: Math.round(this.runTime) });
    this.events.push({ type: 'callEnd', id: o.def.id, lapsed: true });
    this.stage?.lapsed(this, o.def.id);
  }

  /** Put a card on the table: the world waits (or slows), and anyone it brings arrives. */
  openComms(def: CardDef): void {
    useIds(this.ids);
    this.lapse();
    const x = this.commsCtx();
    const o = openCard(def, x, this.rng);
    this.cardsSeen.add(def.id);
    this.desk.closed(this.runTime);
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
    this.cyrite -= res.cost.cyrite; this.chits -= res.cost.chits; this.supplies -= res.cost.supplies;
    if (o === this.call) this.call = null;
    else { this.comms = null; this.phase = 'play'; }
    this.desk.closed(this.runTime);
    this.applyOutcome(res.outcome, o.fee, o.brought);
    this.rest();
    this.run.cards.push({ id: o.def.id, choice: res.choice.id, won: res.won, t: Math.round(this.runTime) });
    this.events.push({ type: 'commsAnswer', id: o.def.id, choice: res.choice.id, text: res.outcome.text, won: res.won });
    this.stage?.answered(this, o.def.id, res.choice.id, res.choice.tone, res.won, res.outcome);
    return true;
  }

  /** Do what an outcome says, at the card's fee. `brought`: the hulls the card brought in, for a dismissal. Returns the ids of any hulls it brings. */
  applyOutcome(out: Outcome, fee: number, brought: number[]): number[] {
    const b = this.bk;
    this.cyrite = Math.min(TANK_MAX, Math.max(0, this.cyrite + amount(out.cyrite, this.cyrite, fee)));
    this.chits = Math.max(0, this.chits + amount(out.chits, this.chits, fee));
    this.supplies = Math.min(this.supplyMax, Math.max(0, this.supplies + amount(out.supplies, this.supplies, fee)));
    if (out.krail) { if (b) this.chits = Math.max(0, this.chits + out.krail); else this.krail = Math.max(0, this.krail + out.krail); }
    if (out.hunt) this.huntDelay += out.hunt;
    if (out.stall) this.stall += out.stall;
    if (b && out.calm) b.nextSwarm = Math.max(b.nextSwarm, this.runTime + out.calm);
    if (out.plates && out.plates > 0) this.repair(out.plates);
    if (out.score) this.addScore(out.score, 'events');
    if (b && out.heat) b.heat = Math.min(1, Math.max(0, b.heat + out.heat));
    for (const f of [out.flag ?? []].flat()) this.flags.add(f);
    for (const f of [out.unflag ?? []].flat()) this.flags.delete(f);
    for (const [k, v] of Object.entries(out.standing ?? {}) as Array<[Standing, number]>) this.standing[k] = (this.standing[k] ?? 0) + v;
    for (const [k, v] of Object.entries(out.notice ?? {}) as Array<[Faction, number]>) this.noticeDelta[k] = (this.noticeDelta[k] ?? 0) + v;
    if (out.follow) this.follows.push({ card: out.follow.card, at: this.runTime + out.follow.after });
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

  /** Jobs paid where the ship is now: the port on docking, the lane on the jump. */
  private settleJobs(at: 'port' | 'lane'): void {
    for (const j of [...this.jobs]) {
      if (j.at !== at) continue;
      const g = j.give ?? {};
      if ((g.supplies ?? 0) > this.supplies) { this.events.push({ type: 'jobShort', id: j.id, text: j.text }); continue; }
      this.supplies -= g.supplies ?? 0;
      this.jobs.splice(this.jobs.indexOf(j), 1);
      this.run.jobsDone++;
      this.applyOutcome(j.pay, 0, []);
      this.events.push({ type: 'jobDone', id: j.id, text: j.pay.text });
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
      s.thrust *= EMPTY_STORES;
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
      const ap = pickApproach(ALIEN_TYPES[VARIANTS[q.members[0]!]!.kind].role, t, this.rng);
      for (const al of this.spawnSquad(q, p, ap)) pc.ids.add(al.id);
      pc.left -= q.members.length;
      pc.last = t;
      return;
    }
    const v = pickVariant(t, this.aliens, this.rng, this.theatre, p.theatre);
    if (!v) { pc.next = t + 1; return; }
    const T = ALIEN_TYPES[v.kind];
    const lead = this.sendHostile(v.id, pickApproach(T.role, t, this.rng), this.rollElite(v.kind, v.faction, p));
    pc.ids.add(lead.id);
    pc.left--;
    pc.last = t;
    // interceptors past the opening often come in pairs: a wingman in echelon
    if (T.role === 'interceptor' && t > 90 && pc.left > 0 && regular + 1 < p.enemyCap && this.rng.next() < 0.6) {
      const wing = this.spawnHostile(v.id, { x: lead.x + Math.sin(lead.face) * 5, y: lead.y + 1.5, z: lead.z + Math.cos(lead.face) * 5 });
      Object.assign(wing, { approach: lead.approach, mode: lead.mode, ax: lead.ax, az: lead.az, slide: lead.slide, modeT: lead.modeT + 0.6 });
      pc.ids.add(wing.id);
      pc.left--;
    }
  }

  /** A hostile from far out, clear of the nose, closing its own way (sim/pacing.ts). */
  private sendHostile(variant: string, approach: Approach, elite: EliteId | null = null): Alien {
    const v = VARIANTS[variant] ?? VARIANTS.scout!, s = this.ship;
    const at = arrival(s, approach, this.rng, this.rng.range(SPAWN_NEAR, SPAWN_FAR));
    const y = ALIEN_TYPES[v.kind].role === 'cruiser' ? this.rng.range(-4, 9) : this.rng.range(-6, 18);
    const al = this.spawnHostile(v.id, { x: at.x, y, z: at.z }, elite);
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
      Object.assign(m, { approach: first.approach, mode: first.mode, ax: first.ax, az: first.az, slide: first.slide, modeT: first.modeT + i * 0.4 });
      out.push(m);
    }
    this.events.push({ type: 'squad', label: q.label });
    return out;
  }

  /** A hostile of a variant, from the spawn ring or at a given point, as regular traffic. */
  spawnHostile(variant: string, at?: { x: number; y: number; z: number }, elite: EliteId | null = null, extra = false): Alien {
    const v = VARIANTS[variant] ?? VARIANTS.scout!;
    const al = spawnAlien(v.kind, this.ship, this.runTime, this.rng, at, { variant: v.id, elite, hp: pressure(this.clock, this.mods).enemyHp });
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
    if (!this.spaceOn || this.mode !== 'breakout' || !this.bk) return;
    this.space = new Space(this.seed + this.sortie.lane, { hazard: this.mods.hazard, compose: false });
    laySortie(this.space, this.sortie, this.ship, this.bk.lane);
  }

  /** The shared world: deal it, ask what it does here, and apply it (docs/ENVIRONMENT.md). */
  private stepSpace(dt: number, s: ShipState): void {
    const space = this.space!;
    space.step(dt, this.runTime, s);
    const a = space.sample(s.x, s.z, this.air);
    this.field.zone = a.rock;
    this.navNoise = Math.max(a.jam, this.navNoise > 0 ? this.navNoise - dt * 0.5 : 0);
    // heavy going slows the ship; a pull leans it
    if (a.drag > 1) { const k = Math.exp(-(a.drag - 1) * 1.5 * dt); s.vx *= k; s.vz *= k; }
    s.vx += a.ax * dt; s.vz += a.az * dt;
    if (space.features.some((f) => f.def === 'well')) {
      for (const al of this.aliens) {
        const h = space.sample(al.x, al.z, this.there);
        al.vx += h.ax * dt; al.vz += h.az * dt;
      }
    }
    this.conditions = reports(a);
    this.spaceThreats(dt, s, a);
    // inside a named place: say so once, and let the story read the flag
    const f = space.features.find((q) => q.named && Math.hypot(s.x - q.x, s.z - q.z) < q.r);
    this.siteHere = f?.named ?? null;
    if (f?.named) this.flags.add(`site:${f.named}`);
  }

  private stepAliens(dt: number, t: number, p: Pressure): void {
    const s = this.ship;
    const arena: Arena = { bulwarks: this.field.bulwarks, rocks: this.field.rocks, aliens: this.aliens, bolts: this.bolts, notice: this.stats.notice };
    const well = this.encounter?.id === 'anomaly' && !this.encounter.done ? this.encounter : null;
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const al = this.aliens[i];
      // a hull moving can clear another from the list (a ram, a break); skip the hole
      if (!al) continue;
      moveAlien(al, s, dt, arena, this.webs, this.rng, this.events);
      if (al.snare > 0) {
        // snared (Thren tech): the hull wades as if through a web
        al.snare = Math.max(0, al.snare - dt);
        const k = Math.exp(-4 * dt);
        al.vx *= k; al.vy *= k; al.vz *= k;
      }
      // the roll cloak: hulls lose the ship and hold their fire
      if (this.alive && this.cloakT <= 0) alienFire(al, s, t, this.shots, this.field.bulwarks, this.rng, this.events, p);
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
      if (!al.ward && (d > CULL || (al.fleeing && al.age > 3 && d > 160))) this.aliens.splice(this.aliens.indexOf(al), 1);
    }
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
    if (e) {
      if (stepEncounter(e, this, dt)) {
        this.run.events++;
        if (e.success) this.run.eventsWon++;
        if (e.place) this.placeWon = e.success;
        this.encounter = null;
        this.nextEvent = t + eventGap(this.eventN) * this.survival.events.gap;
      }
      return;
    }
    // the system's own place comes first, a little after arrival, when the sky is clear; the sector's chance events wait for it
    const place = this.sortie.place;
    if (this.placeDue && place) {
      if (this.runTime < PLACE_AT || this.command.state !== 'idle') return;
      this.placeDue = false;
      this.encounter = startEncounter(place.plays, this, place);
      this.lastEvent = place.plays;
      return;
    }
    // only in open sky: no capital ship about, and not just before one; a quiet system has no chance events
    if (this.sortie.quiet || t < this.nextEvent || this.command.state !== 'idle' || this.command.next - t < 20) return;
    const id = pickEncounter(t, this.lastEvent, this.unlocked, this.rng, this.survival.events.weights);
    if (!id) { this.nextEvent = t + 20; return; }
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
        const hits = arcTargets(this.ship, st, this.reachableHulls(), this.reachableRocks(), rapid);
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
    const s = this.ship, well = this.encounter?.id === 'anomaly' && !this.encounter.done ? this.encounter : null;
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

  private collect(pk: Pickup): void {
    switch (pk.kind) {
      case 'crystal': {
        this.run.krail += pk.value;
        this.addScore(pk.value * SCORE_PER_CRYSTAL, 'krail');
        this.events.push({ type: 'crystal', x: pk.x, z: pk.z, value: pk.value });
        // what the refit bay builds from: Krail in the Arcade, chits in the Story (one purse)
        if (this.bk) this.chits += pk.value * this.stats.xpMult;
        else this.krail += pk.value * this.stats.xpMult;
        this.run.krailEarned += pk.value * this.stats.xpMult;
        break;
      }
      case 'cyrite':
        // the Story mode's fuel, into the tank
        this.cyrite = Math.min(TANK_MAX, this.cyrite + pk.value);
        this.run.cyrite += pk.value;
        this.events.push({ type: 'cyrite', x: pk.x, z: pk.z, value: pk.value });
        break;
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
        this.powers[kind] = POWER_TIME[kind] * this.stats.powerTime;
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
      }
      const boss = this.command.targetable();
      if (!spent && boss && !b.hit.includes(boss.id) && hit(boss.x, boss.y, boss.z, boss.r * 0.85)) { land(boss.id); this.hurtBoss(b.dmg, 'laser', b.x, b.y, b.z); }
      for (const r of [...rocks]) {
        if (spent) break;
        if (b.hit.includes(r.id) || !hit(r.x, 0, r.z, r.r)) continue;
        land(r.id);
        this.damageRock(r, b.dmg, 'laser', b.x, b.y, b.z);
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
        if ((sh.x - s.x) ** 2 + sh.y ** 2 + (sh.z - s.z) ** 2 < (sh.r + SHIP_R) ** 2) {
          this.shots.splice(i, 1);
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
    // ramming: hulls and the boss
    for (const al of [...this.aliens]) {
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
      return this.hitShip('rock', r.x, r.z);
    }
  }

  // ── damage ────────────────────────────────────────────────────────────

  private hitShip(source: string, fromX?: number, fromZ?: number): void {
    const s = this.ship, st = this.stats;
    if (!this.alive) return;
    if (fromX !== undefined && fromZ !== undefined) {
      // knock the two apart, so the hit reads as a collision and not a pass
      const dx = s.x - fromX, dz = s.z - fromZ, d = Math.hypot(dx, dz) || 1;
      s.vx += (dx / d) * 12; s.vz += (dz / d) * 12;
    }
    this.run.damageBy[source] = (this.run.damageBy[source] ?? 0) + 1;
    this.sinceHit = 0;
    hurtMend(this.mend);
    // any damage holds the shield's recharge off
    this.shieldT = st.shieldDelay;
    // hardened plating (booster) turns every hit for its few seconds; then a whole shield charge, then the hull
    if (this.powers.shield > 0 || this.shields >= 1) {
      if (this.powers.shield <= 0) this.shields -= 1;
      s.invuln = SHIELD_GRACE;
      this.run.shieldsAbsorbed++;
      this.events.push({ type: 'shieldHit', x: s.x, z: s.z, left: Math.floor(this.shields), source });
      if (st.reactive) this.reactive();
      if (st.arcShield) this.arcNova();
      return;
    }
    this.plates--;
    this.run.platesLost++;
    s.invuln = st.grace;
    this.events.push({ type: 'shipHit', x: s.x, z: s.z, plates: this.plates, source });
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
    // Voice hulls adapt: past a share of their hull soaked (the original's 6 of 16), half damage
    if (FACTION_TRAITS[al.faction].adapt && al.soaked >= al.maxHp * (BORG_ADAPT / 16)) dmg *= 0.5;
    if (src === 'torpedo' && al.mark > 0) dmg *= this.stats.markBonus;
    if (al.ward && src !== 'hazard' && src !== 'plasma') this.stage?.shot(this, al);
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
      this.loot('wreck', 'crystal', this.share(al.xp * loot, K.krail * this.income), v.x, v.z, 5, v.vx, v.vz, life);
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
    if (!b || b.arriving) return;
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
    this.loot('wreck', 'crystal', this.share(this.bk ? CAPITAL_KRAIL : 26 + 8 * b.n, cap), b.x, b.z, 12, 0, 0, life);
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
      this.events.push({ type: 'rockHit', x, y, z, id: r.id });
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
    this.field.shatter(b, pressure(this.clock, this.mods).rockHp * (this.bk ? MINE_HP : 1));
    this.events.push({ type: 'bulwarkBroken', x: b.x, z: b.z, r: b.r, points });
  }

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
    else this.field.split(r, pressure(this.clock, this.mods).rockHp);
    let left: number | undefined;
    if (this.bk) {
      // broken, not mined: what the blast left of it
      const take = rockTake(src, TORP_YIELD * this.torpYieldMult), y = rockYield(r.kind, r.size, take);
      if (y.ore || y.cyrite) left = Math.round(take * 100);
      const ore = this.share(y.ore, this.survival.rock.ore), cyrite = this.share(y.cyrite, this.survival.rock.cyrite);
      if (ore) this.loot('rock', 'ore', ore, r.x, r.z, 4, r.vx, r.vz);
      if (cyrite) this.loot('rock', 'cyrite', cyrite, r.x, r.z, 4, r.vx, r.vz);
    }
    this.events.push({ type: 'rockDestroyed', x: r.x, z: r.z, size: r.size, points, kind: r.kind, left });
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
    for (const r of [...this.field.rocks]) if (inside(r.x, 0, r.z, r.r)) this.damageRock(r, dmg, src, r.x, 0, r.z);
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
    if (opts.survival || opts.sortie?.survival) { this.survival = SURVIVAL[opts.survival ?? opts.sortie!.survival!]; this.mods = this.survival.sky; }
    this.field.rocks = this.field.rocks.filter((r) => Math.hypot(r.x - s.x, r.z - s.z) >= 18);
    if (opts.sortie) {
      // a new system: new rock all round
      this.sortie = opts.sortie;
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
    this.encounter = null;
    this.pace = newPace(ALIEN_FIRST);
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
    this.cloakT = 0; this.chain = 0; this.chainT = 0;
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
