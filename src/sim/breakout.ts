import { TANK_MAX } from './purse';
import { clamp, lerp } from '../core/math';
import { BASE_PRICES, type Prices, type SystemKind } from '../content/systems';
import type { Levels } from './build';
import type { JobDef, Standing } from './comms';
import type { EncounterId } from './encounters';
import type { Faction } from './enemies';
import type { RockKind, RockSize } from './field';
import type { Report } from './captains';
import type { SurvivalId } from '../content/survival';
import type { Exp, Rules } from '../content/profiles';
import { NO_NEMESIS, type Nemesis } from './calloway';
import { QUIET, type Pressure } from './notice';
import type { RunStats, Weapon } from './run';
import type { Rng } from './rng';

// ── the Breakout ──────────────────────────────────────────────────────────
// The opening of WAYWARD: get the stolen hauler out of the home system. The
// sortie has a shape instead of an endless clock:
//
//   the lane mouth · far across the system, the old jump lane out. Reach it
//                    with enough jump fluid in the tank, hold inside it while the
//                    drive spools, and you are gone. A Custody capital ship
//                    blockades it, and her checkpoint is a comms card: run
//                    it, spoof it, pay it, talk through it, or fight her.
//   the port       · a work bay off the direct line, a little under halfway,
//                    that does not check implants. Dock to top up the tank,
//                    buy supplies (dear when you are short), patch
//                    the hull and fit upgrades: the refit bay only opens here. Docking quiets the
//                    pursuit a little, once.
//   heat           · how hard the Custody is looking for you, 0 to 1. It
//                    climbs with time, with every kill and with the noise of
//                    the cutter. It decides how often pursuers come, how many,
//                    and which: pickets first, then cruisers, enforcers and
//                    interdictors. They come from behind, from home.
//
// Jump fluid is the fuel, and scarce: the ship's refinery cooks it from the
// Cyrite that violet-veined rock and wrecks give, filling the tank first; what
// the tank cannot take stays Cyrite, the money. The port sells a top-up.
// Krail is what the refit bay builds from, as in the arcade: crystals out of
// ordinary rock and the wrecks of what you destroy. Ore is what the cutter
// takes out of ordinary rock: it fills the hold and sells at the port. Parts are salvage
// from wrecks; you patch a plate out of them when the ship is left
// alone for a few seconds.

export type Mode = 'breakout' | 'arcade';

export interface Waypoint {
  kind: 'port' | 'lane';
  name: string;
  x: number;
  z: number;
  /** Inside this radius: docking range, or the lane's throat. */
  r: number;
}

/** Straight-line distance from the start to the lane mouth: about a minute flat out. */
export const LANE_DIST = 2600;
/** The port: this far along the line, this far off it. */
export const PORT_ALONG = 1000;
export const PORT_OFF = 200;
export const LANE_R = 16;
export const PORT_R = 14;
/** The gate and the depot keep their own: inside this (units) nothing can hurt the ship, and hostile hulls will not enter, but circle outside. */
export const SAFE_R = 40;
/** How far outside the safe ring a hostile hull holds, and how fast (of its cruise) it circles there. */
export const SAFE_HOLD = 8;

/** Jump fluid it takes to jump, and what the tank holds at the start. */
export const JUMP_COST = 20;
export const START_CYRITE = 6;
/** Cyrite the ship can hold, as a ceiling for sums; money does not run to the top of a tank. */
export const HOLD_MAX = 999;
/** The drive tank (sim/purse.ts): a lane and a half. The Thren swarms read the tank against it. */
export { TANK_MAX };
/** Seconds inside the lane mouth for the drive to spool; and how much longer once you have run the blockade (her interdiction field drags on the drive). */
export const SPOOL = 5;
export const SPOOL_RUN = 2.2;
/** Within this distance of the lane mouth, the blockade's checkpoint calls. */
export const BLOCKADE_AT = 420;
/** The blockade's hull against an arcade run's first capital ship: she is the system's picket flagship, not an introduction. */
export const BLOCKADE_HP = 3;
/** Cyrite and supplies a capital ship's wreck leaves in a sortie: a top-up, not a jump, so a blockade or a captain is never a payday. */
export const CAPITAL_CYRITE = 6;
/** Krail in the Story mode, for the refit bay: a share of a wreck's worth, a share of what rock gives in the arcade (a cut gives it surely, a break by chance), and a capital ship's salvage. */
export const WRECK_KRAIL = 0.6;
export const ROCK_KRAIL = 0.6;
export const CAPITAL_KRAIL = 40;
export const CAPITAL_SUPPLIES = 6;

/** Supplies to patch a plate, the quiet it needs, and how long the patch takes. */
export const PATCH_COST = 3;
export const PATCH_QUIET = 6;
export const PATCH_TIME = 4;

/** Seconds docking takes once slow inside the port's ring. */
export const DOCK_TIME = 1;
/** The share of top speed under which the clamps take you inside the ring. */
export const DOCK_SPEED = 0.5;
/** Docking quiets the pursuit by this much, once per port. */
export const DOCK_COOL = 0.2;

/** Cerro's port's prices, in chits (other ports set their own: SortieDef.port). */
export const PRICE = BASE_PRICES;

// ── heat ──────────────────────────────────────────────────────────────────
export const HEAT_START = 0.1;
/** Per second: about 0.13 a minute, so heat alone tops out after about seven minutes. */
export const HEAT_RATE = 0.0022;
export const HEAT_KILL = 0.008;
/** Custody hulls are missed more. */
export const HEAT_KILL_CUSTODY = 0.014;
/** Per second of work a mined rock adds: a large rock takes about 5.5 s of it, a small one 1.4 s. */
export const HEAT_MINE = 0.002;
export const MINE_WORK = [5.5, 3.2, 1.4] as const;
/** How fast the heat fades in a quiet system, a second (from 0.6 to nothing in about two minutes). */
export const QUIET_COOL = 0.005;
/** The heat a run's difficulty curve reads as its clock: heat 1 plays like seven minutes of the arcade. */
export const HEAT_CLOCK = 420;
/** The first pursuer, seconds in. */
export const PURSUIT_FIRST = 45;

export const pursuitInterval = (heat: number) => lerp(38, 10, clamp(heat, 0, 1));
export const pursuitCap = (heat: number) => Math.round(lerp(1, 3, clamp(heat, 0, 1)));
export const pursuitElite = (heat: number) => clamp((heat - 0.7) * 0.6, 0, 0.2);

// ── a sortie ──────────────────────────────────────────────────────────────
// One system, flown in real time: what the journey (sim/journey.ts) hands
// the world when the Wayward arrives somewhere. The Breakout is the first
// sortie, in Cerro; an unconfigured Breakout world flies HOME.

export interface SortieDef {
  /** The journey's survival mode (content/survival.ts); the baseline when absent. */
  survival?: SurvivalId;
  /** How much tougher the hulls are this far along the chart (sim/journey.ts `threatAt`); 1 when absent. */
  threat?: number;
  /** A multiplier on what the jobs here pay (sim/journey.ts `bountyAt`); 1 when absent. */
  pay?: number;
  /** The chart's id for the system, its name and kind. */
  system: string;
  /** Its region (content/regions.ts), for the sky; the Reach unless given. */
  region?: number;
  /** The sky palette (content/regions.ts); the region's own where absent. */
  sky?: number;
  name: string;
  kind: SystemKind;
  /** Where the plotted lane goes, and the jump fluid it takes to jump. */
  dest: string;
  jumpCost: number;
  /** Distance to the lane mouth. */
  lane: number;
  /** The port, if there is one: its name and today's prices. */
  port: { name: string; prices: Prices } | null;
  /** Heat at arrival, and a multiplier on how fast it climbs. */
  heat: number;
  heatRate: number;
  /** The rock: veined share and density. */
  rich: number;
  density: number;
  /** Of the pursuit, the share that comes from ahead: Gutter crews, or whoever holds the system. */
  gutter: number;
  /** Who comes from ahead, as variant ids, where it is not the Gutter (a Voice system, Thren space). */
  ahead?: string[];
  /** Thren in the system, 0 to 1: they swarm, drawn by the fluid aboard (sim/world.ts). */
  thren?: number;
  /** Who else is here, for the cards (sim/scatter.ts presence): 'drift', 'holdfast', 'raid', 'voice', 'thren'. */
  here?: string[];
  /** A quiet system (a breather): no pursuit, no Thren, no chance cards or events; the heat fades. */
  quiet?: boolean;
  /** A multiplier on the gap between chance calls. */
  calls: number;
  /** The pursuit's room to breathe (content/systems.ts): the first pursuer's time, and the quiet after an answered card or a beaten pursuer. The Breakout has none. */
  pace?: { first: number; calm: number };
  /** A Custody blockade holds the lane mouth (Cerro, and every netted system). */
  blockade: boolean;
  netted: boolean;
  /** Seconds into the sortie that Calloway arrives (Infinity: not in this sortie), and jumps she is behind at arrival. */
  calloway: number;
  behind: number;
  /** The Breakout's opening: veined rock round the start, the yards behind you. */
  home: boolean;
  /** What the factions' notice brings here: tiers the cards read, fees, the pursuit, a captain. */
  notice: Pressure;
  /** What Calloway knows of you here (sim/calloway.ts): the tricks she is wise to, her ship, an offer, and whether she waits at the lane mouth for the last time. */
  nemesis: Nemesis;
  /** The place in this system still to be dealt with (content/phenomena.ts): the event it plays, a little after arrival. */
  place?: { name: string; text: string; plays: EncounterId; id?: string } | null;
  /** The sky the chart dealt this system (sim/experience.ts): the expanse, the site, the ambient features. Absent: the earlier layout (sim/sites.ts). */
  exp?: Exp;
  /** What the region's ground does (content/profiles.ts Rules). */
  rules?: Rules;
  /** The story beat due here (content/story.ts): its card calls a little after arrival. */
  story?: string | null;
  /** The situation playing here (content/situations.ts), as the chart has it now: its tightened variant where the Net holds the system. */
  situation?: string | null;
}

export const HOME: SortieDef = {
  system: 'home', name: 'Cerro', kind: 'home', dest: 'the Scatter', jumpCost: 20, lane: 2600, port: { name: 'Frontier Supply', prices: BASE_PRICES },
  heat: 0.1, heatRate: 1, rich: 0.09, density: 1, gutter: 0.22, calls: 1, blockade: true, netted: true, calloway: Infinity, behind: Infinity, home: true, notice: QUIET, nemesis: NO_NEMESIS,
};

/** What the Wayward carries from one sortie into the next. */
export interface Carry {
  /** Cyrite aboard: the purse. It pays the bay, the ports and the favours; the jump does not touch it. */
  cyrite: number;
  /** Jump fluid in the drive tank: mining and wrecks fill it first, a jump burns it. Never more than the tank holds. */
  fuel: number;
  /** Supplies aboard: the galley and the spares in one. A lane's days and the drive's wear draw on it, and so does patching a plate. */
  supplies: number;
  /** Plates whole (never more than the build allows). */
  plates: number;
  /** Hardened plating and high-yield torpedoes aboard: they stay until a hit or a launch uses one. Saves from before have neither. */
  stock?: { shield: number; yield: number };
  levels: Levels;
  /** Installs made in the refit bay. */
  refit: number;
  /** Factions whose tech has been salvaged. */
  techs: string[];
  flags: string[];
  standing: Partial<Record<Standing, number>>;
  jobs: JobDef[];
  /** Cards already heard on this journey (the ones that come once). */
  seen: string[];
  /** Seconds of flight since the last card or call closed: the comms desk's pacing runs on across systems (sim/desk.ts). */
  hush: number;
  /** The Civic Score (sim/civic.ts): the Story's only. Absent in the Arcade, and in a save from before v18 until it is migrated. */
  civic?: number;
}

/** What a sortie hands back to the journey. */
export interface SortieResult {
  /** Out through the lane, or the hull went. */
  ended: 'jumped' | 'destroyed';
  /** Seconds flown. */
  time: number;
  carry: Carry;
  run: RunStats;
  /** Calloway came for you here, and whether her ship was beaten. */
  calloway: boolean;
  callowayBeaten: boolean;
  /** Days of delay the sortie's choices put on her, and days this system now holds the Net out (negative: days the Net gains here). */
  huntDelay: number;
  stall: number;
  /** The named captain who called here, if one did, and how it ended. */
  captain: { id: string; report: Report } | null;
  /** Notice the sortie's choices moved, by faction (the kills are counted from the run). */
  notice: Partial<Record<Faction, number>>;
  /** The system's place: dealt with (true), tried and lost (false), or not met (null or absent). */
  place?: boolean | null;
  /** The system's situation, if it was met: which system, and how it ended (sim/stage.ts). */
  situation?: { id: string; result: 'won' | 'lost' | 'declined' | 'ignored' } | null;
}

/** Supplies: what the ship holds at most, and at the start. */
export const SUPPLIES_MAX = 16;
export const SUPPLIES_START = 8;
/** At or under this many, the HUD and the ports say supplies are low. */
export const LOW_SUPPLIES = 4;
/**
 * With the stores gone the crew tires and the drive goes unserviced: the ship still flies, but thrust, turning and
 * the guns' cycle run at this share. It comes back the moment a crate is aboard.
 */
export const EMPTY_STORES = 0.85;

/** The pursuers, by the heat they need. Gutter crews work the belt ahead and do not care who you are. */
const PURSUERS: Array<{ variant: string; from: number; weight: number }> = [
  { variant: 'picket', from: 0, weight: 3 },
  { variant: 'lancer', from: 0.25, weight: 2 },
  { variant: 'enforcer', from: 0.4, weight: 2 },
  { variant: 'interdictor', from: 0.65, weight: 1 },
];
const GUTTER = ['scout', 'scout', 'raptor'];

/** Which hull comes next, and whether it is Custody from behind or a crew from ahead (the Gutter's, or `ahead`'s). */
export function pickPursuer(heat: number, rng: Rng, gutter = 0.22, ahead: readonly string[] = GUTTER): { variant: string; ahead: boolean } {
  if (heat < 0.6 && rng.next() < gutter) return { variant: ahead[rng.int(ahead.length)]!, ahead: true };
  const pool = PURSUERS.filter((p) => p.from <= heat);
  let roll = rng.next() * pool.reduce((a, p) => a + p.weight, 0);
  for (const p of pool) if ((roll -= p.weight) <= 0) return { variant: p.variant, ahead: false };
  return { variant: pool[pool.length - 1]!.variant, ahead: false };
}

// ── the Thren ─────────────────────────────────────────────────────────────
// Where the chart has Thren (sim/scatter.ts), they swarm: a knot of motes,
// with a web layer once they are thick, drawn by the fluid aboard. The
// fuller the tank, the sooner and the oftener they come. Near them,
// sensors and navigation go strange: the scope fills with static and the
// lane mouth will not hold still (World.navNoise).

/** Seconds to the first swarm, and between swarms, with an empty tank in thin Thren and a full one in thick; the fluid aboard divides it. */
export const SWARM_FIRST = 50;
export const swarmGap = (thren: number, fuel: number) => lerp(110, 40, clamp(thren, 0, 1)) / (0.5 + clamp(fuel / TANK_MAX, 0, 1));
/** Motes in a swarm, and the Thren at which a web layer leads it. */
export const swarmSize = (thren: number) => 3 + Math.round(clamp(thren, 0, 1) * 3);
export const SWARM_WEAVER = 0.6;
/** Within this of a Thren hull, sensors and navigation scramble; the drive spools this much slower at full noise. */
export const THREN_JAM = 80;
export const JAM_SPOOL = 0.5;

// ── what rock gives ───────────────────────────────────────────────────────
// Mined with the lasers, a rock gives all of this and comes apart clean.
// Torpedoes and other blasts destroy part of it on the way (`TORP_YIELD`),
// and rock broken any other way gives only scraps.

export interface Yield { ore: number; cyrite: number }

const ORE: Record<RockKind, readonly [number, number, number]> = {
  basalt: [6, 3, 1],
  iron: [10, 5, 2],
  rich: [3, 2, 1],
  volatile: [12, 6, 3],
};
const CYRITE: Record<RockKind, readonly [number, number, number]> = {
  basalt: [0, 0, 0],
  iron: [0, 0, 0],
  rich: [12, 7, 4],
  volatile: [0, 0, 0],
};
/** Of a clean take, what rock broken any other way (a ram, lightning) leaves behind. */
export const SCRAP = 0.3;
/** Of a clean take, what a torpedo, mine or burn leaves: the blast destroys the rest. One number, so a booster can multiply it. */
export const TORP_YIELD = 0.5;

/** The share of a rock's yield a weapon's kill gives. */
/** `torp` is the blast share in force (`TORP_YIELD` times any booster, see `World.torpYieldMult`). */
export const rockTake = (src: Weapon, torp = TORP_YIELD): number => src === 'laser' ? 1 : src === 'ram' || src === 'hazard' ? SCRAP : Math.min(1, torp);

export function rockYield(kind: RockKind, size: RockSize, k = 1): Yield {
  return { ore: Math.round(ORE[kind][size] * k), cyrite: Math.round(CYRITE[kind][size] * k) };
}

// ── the course ────────────────────────────────────────────────────────────

/** A sortie's places, laid out from the start along the ship's heading: the lane mouth ahead, the port (if any) off the line about halfway. */
export function course(heading: number, x = 0, z = 0, def: SortieDef = HOME): { lane: Waypoint; port: Waypoint | null } {
  const fx = Math.cos(heading), fz = -Math.sin(heading), rx = Math.sin(heading), rz = Math.cos(heading);
  const along = def.lane * (PORT_ALONG / LANE_DIST);
  return {
    lane: { kind: 'lane', name: 'Lane entrance', x: x + fx * def.lane, z: z + fz * def.lane, r: LANE_R },
    port: def.port ? { kind: 'port', name: def.port.name, x: x + fx * along + rx * PORT_OFF, z: z + fz * along + rz * PORT_OFF, r: PORT_R } : null,
  };
}

/** The places in a sortie: the lane mouth, and the port if there is one. */
export const places = (b: Breakout): Waypoint[] => (b.port ? [b.lane, b.port] : [b.lane]);

/** The Breakout's state while it runs. */
export interface Breakout {
  def: SortieDef;
  lane: Waypoint;
  port: Waypoint | null;
  /** Jump fluid the plotted jump takes. */
  jumpCost: number;
  /** The port's prices today. */
  prices: Prices;
  heat: number;
  nextPursuit: number;
  /** When the next Thren swarm comes (Infinity: no Thren here). */
  nextSwarm: number;
  /** Seconds the drive has spooled inside the lane mouth, and the seconds it needs. */
  spool: number;
  spoolNeed: number;
  /** Seconds slow inside the port's ring. */
  dockT: number;
  /** Set on cast-off: the clamps stay open until the ship has left the port's ring. */
  castOff: boolean;
  /** The port's one-off quieting is spent. */
  portCooled: boolean;
  /** Times docked. */
  docks: number;
  /** The blockade: not yet met, at the checkpoint (her card on the table), called (a capital ship on the way or fighting), or behind you. */
  blockade: 'none' | 'checkpoint' | 'called' | 'done';
  /** Seconds of the jump's flash before the report; -1 until the jump. */
  jumpT: number;
  /** Seconds until the next "not enough jump fluid" reminder. */
  nagT: number;
}

export function newBreakout(heading: number, def: SortieDef = HOME): Breakout {
  const c = course(heading, 0, 0, def);
  return {
    def, lane: c.lane, port: c.port, jumpCost: def.jumpCost, prices: def.port?.prices ?? BASE_PRICES, heat: def.heat, nextPursuit: def.pace?.first ?? PURSUIT_FIRST, nextSwarm: (def.thren ?? 0) > 0.05 ? SWARM_FIRST : Infinity, spool: 0, spoolNeed: SPOOL, dockT: 0, castOff: false, portCooled: false, docks: 0,
    blockade: 'none', jumpT: -1, nagT: 0,
  };
}
