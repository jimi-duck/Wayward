import { clamp, lerp } from '../core/math';
import { BASE_PRICES, type Prices, type SystemKind } from '../content/systems';
import type { Levels } from './build';
import type { JobDef, Standing } from './comms';
import type { EncounterId } from './encounters';
import type { Faction } from './enemies';
import type { RockKind, RockSize } from './field';
import type { Report } from './captains';
import { NO_NEMESIS, type Nemesis } from './calloway';
import type { Kit } from './modules';
import { QUIET, type Pressure } from './notice';
import type { RunStats } from './run';
import type { Rng } from './rng';

// ── the Breakout ──────────────────────────────────────────────────────────
// The opening of WAYWARD: get the stolen hauler out of the home system. The
// sortie has a shape instead of an endless clock:
//
//   the lane mouth · far across the system, the old jump lane out. Reach it
//                    with enough Cyrite in the tank, hold inside it while the
//                    drive spools, and you are gone. A Custody capital ship
//                    blockades it, and her checkpoint is a comms card: run
//                    it, spoof it, pay it, talk through it, or fight her.
//   the port       · a fuel dock off the direct line, roughly halfway, that
//                    does not check implants. Dock to sell ore, buy Cyrite,
//                    patch the hull and pay for a refit. Docking quiets the
//                    pursuit a little, once.
//   heat           · how hard the Custody is looking for you, 0 to 1. It
//                    climbs with time, with every kill and with the noise of
//                    the cutter. It decides how often pursuers come, how many,
//                    and which: pickets first, then cruisers, enforcers and
//                    interdictors. They come from behind, from home.
//
// Cyrite is the fuel, and scarce: it comes from violet-veined rock cut clean,
// from the rare gold rock, from the port and from a capital ship's wreck.
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
export const PORT_ALONG = 1250;
export const PORT_OFF = 260;
export const LANE_R = 16;
export const PORT_R = 9;

/** Cyrite it takes to jump, what the tank holds at the start, and the hold's capacity. */
export const JUMP_COST = 20;
export const START_CYRITE = 6;
export const TANK_MAX = 40;
export const HOLD_START = 40;
/** Each unit of ore is worth this much on the refit rail: a Breakout is short, and a build should take shape in it. */
export const ORE_XP = 1.7;
/** Seconds inside the lane mouth for the drive to spool; and how much longer once you have run the blockade (her interdiction field drags on the drive). */
export const SPOOL = 5;
export const SPOOL_RUN = 2.2;
/** Within this distance of the lane mouth, the blockade's checkpoint calls. */
export const BLOCKADE_AT = 420;
/** The blockade's hull against an arcade run's first capital ship: she is the system's picket flagship, not an introduction. */
export const BLOCKADE_HP = 3;
/** Cyrite and parts a capital ship's wreck leaves in a sortie: a top-up, not a jump, so a blockade or a captain is never a payday. */
export const CAPITAL_CYRITE = 6;
/** Krail in the Story mode, for the refit bay: a share of a wreck's worth, a share of what rock gives in the arcade (a cut gives it surely, a break by chance), and a capital ship's salvage. */
export const WRECK_KRAIL = 0.6;
export const ROCK_KRAIL = 0.6;
export const CAPITAL_KRAIL = 40;
export const CAPITAL_PARTS = 18;

/** Parts to patch a plate, the quiet it needs, and how long the patch takes. */
export const PATCH_COST = 6;
export const PATCH_QUIET = 6;
export const PATCH_TIME = 4;

/** Seconds docking takes once slow inside the port's ring. */
export const DOCK_TIME = 1;
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
/** Per second the cutter runs. */
export const HEAT_CUT = 0.002;
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
  /** The chart's id for the system, its name and kind. */
  system: string;
  /** Its region (content/regions.ts), for the sky; the Reach unless given. */
  region?: number;
  name: string;
  kind: SystemKind;
  /** Where the plotted lane goes, and the Cyrite it takes to jump. */
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
  /** Thren in the system, 0 to 1: they swarm, drawn by the Cyrite aboard (sim/world.ts). */
  thren?: number;
  /** Who else is here, for the cards (sim/scatter.ts presence): 'drift', 'holdfast', 'raid', 'voice', 'thren'. */
  here?: string[];
  /** A multiplier on the gap between chance calls. */
  calls: number;
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
  place?: { name: string; text: string; plays: EncounterId } | null;
  /** The story beat due here (content/story.ts): its card calls a little after arrival. */
  story?: string | null;
}

export const HOME: SortieDef = {
  system: 'home', name: 'Cerro', kind: 'home', dest: 'the Scatter', jumpCost: 20, lane: 2600, port: { name: 'Frontier Supply', prices: BASE_PRICES },
  heat: 0.1, heatRate: 1, rich: 0.09, density: 1, gutter: 0.22, calls: 1, blockade: true, netted: true, calloway: Infinity, behind: Infinity, home: true, notice: QUIET, nemesis: NO_NEMESIS,
};

/** What the Wayward carries from one sortie into the next. */
export interface Carry {
  /** Cyrite in the tank: fuel for the jumps. */
  cyrite: number;
  /** Krail aboard: what the refit bay builds from. */
  krail: number;
  ore: number;
  parts: number;
  chits: number;
  food: number;
  /** Plates whole (never more than the build allows). */
  plates: number;
  levels: Levels;
  /** The refit rail. */
  xp: number;
  refit: number;
  /** Factions whose tech has been salvaged. */
  techs: string[];
  flags: string[];
  standing: Partial<Record<Standing, number>>;
  jobs: JobDef[];
  /** Cards already heard on this journey (the ones that come once). */
  seen: string[];
  /** Each ship system's resource, for fitting modules at a port (sim/modules.ts). */
  kit: Kit;
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
}

/** Food, in days for the one aboard: what the galley holds at most, and at the start. */
export const FOOD_MAX = 10;
export const FOOD_START = 4;

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
// with a web layer once they are thick, drawn by the Cyrite aboard. The
// fuller the tank, the sooner and the oftener they come. Near them,
// sensors and navigation go strange: the scope fills with static and the
// lane mouth will not hold still (World.navNoise).

/** Seconds to the first swarm, and between swarms, with an empty tank in thin Thren and a full one in thick; Cyrite aboard divides it. */
export const SWARM_FIRST = 50;
export const swarmGap = (thren: number, cyrite: number) => lerp(110, 40, clamp(thren, 0, 1)) / (0.5 + clamp(cyrite / TANK_MAX, 0, 1));
/** Motes in a swarm, and the Thren at which a web layer leads it. */
export const swarmSize = (thren: number) => 3 + Math.round(clamp(thren, 0, 1) * 3);
export const SWARM_WEAVER = 0.6;
/** Within this of a Thren hull, sensors and navigation scramble; the drive spools this much slower at full noise. */
export const THREN_JAM = 80;
export const JAM_SPOOL = 0.5;

// ── what rock gives ───────────────────────────────────────────────────────
// Cut clean, a rock gives all of this; broken by the guns, only scraps.

export interface Yield { ore: number; cyrite: number }

const ORE: Record<RockKind, readonly [number, number, number]> = {
  basalt: [6, 3, 1],
  iron: [10, 5, 2],
  rich: [3, 2, 1],
  volatile: [12, 6, 3],
  rare: [4, 4, 4],
};
const CYRITE: Record<RockKind, readonly [number, number, number]> = {
  basalt: [0, 0, 0],
  iron: [0, 0, 0],
  rich: [12, 7, 4],
  volatile: [0, 0, 0],
  rare: [6, 6, 6],
};
/** Of a clean cut, what the guns leave behind. */
export const SCRAP = 0.3;

export function rockYield(kind: RockKind, size: RockSize, clean: boolean): Yield {
  const k = clean ? 1 : SCRAP;
  return { ore: Math.round(ORE[kind][size] * k), cyrite: Math.round(CYRITE[kind][size] * k) };
}

// ── the course ────────────────────────────────────────────────────────────

/** A sortie's places, laid out from the start along the ship's heading: the lane mouth ahead, the port (if any) off the line about halfway. */
export function course(heading: number, x = 0, z = 0, def: SortieDef = HOME): { lane: Waypoint; port: Waypoint | null } {
  const fx = Math.cos(heading), fz = -Math.sin(heading), rx = Math.sin(heading), rz = Math.cos(heading);
  const along = def.lane * (PORT_ALONG / LANE_DIST);
  return {
    lane: { kind: 'lane', name: 'Lane mouth', x: x + fx * def.lane, z: z + fz * def.lane, r: LANE_R },
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
  /** Cyrite the plotted jump takes. */
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
  /** The port's one-off quieting is spent. */
  portCooled: boolean;
  /** Times docked. */
  docks: number;
  /** The blockade: not yet met, at the checkpoint (her card on the table), called (a capital ship on the way or fighting), or behind you. */
  blockade: 'none' | 'checkpoint' | 'called' | 'done';
  /** Seconds of the jump's flash before the report; -1 until the jump. */
  jumpT: number;
  /** Seconds until the next "not enough Cyrite" reminder. */
  nagT: number;
}

export function newBreakout(heading: number, def: SortieDef = HOME): Breakout {
  const c = course(heading, 0, 0, def);
  return {
    def, lane: c.lane, port: c.port, jumpCost: def.jumpCost, prices: def.port?.prices ?? BASE_PRICES, heat: def.heat, nextPursuit: PURSUIT_FIRST, nextSwarm: (def.thren ?? 0) > 0.05 ? SWARM_FIRST : Infinity, spool: 0, spoolNeed: SPOOL, dockT: 0, portCooled: false, docks: 0,
    blockade: 'none', jumpT: -1, nagT: 0,
  };
}
