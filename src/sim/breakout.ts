import { clamp, lerp } from '../core/math';
import { BASE_PRICES, type Prices, type SystemKind } from '../content/systems';
import type { Levels } from './build';
import type { JobDef, Standing } from './comms';
import type { Faction } from './enemies';
import type { RockKind, RockSize } from './field';
import type { Report } from './captains';
import { QUIET, type Pressure } from './notice';
import type { RunStats } from './run';
import type { Rng } from './rng';

// ── the Breakout ──────────────────────────────────────────────────────────
// The opening of WAYWARD: get the stolen hauler out of the home system. The
// sortie has a shape instead of an endless clock:
//
//   the lane mouth · far across the system, the old jump lane out. Reach it
//                    with enough Krail in the tank, hold inside it while the
//                    drive spools, and you are gone. A Custody capital ship
//                    blockades it, and her checkpoint is a comms card: run
//                    it, spoof it, pay it, talk through it, or fight her.
//   the port       · a fuel dock off the direct line, roughly halfway, that
//                    does not check implants. Dock to sell ore, buy Krail,
//                    patch the hull and pay for a refit. Docking quiets the
//                    pursuit a little, once.
//   heat           · how hard the Custody is looking for you, 0 to 1. It
//                    climbs with time, with every kill and with the noise of
//                    the cutter. It decides how often pursuers come, how many,
//                    and which: pickets first, then cruisers, enforcers and
//                    interdictors. They come from behind, from home.
//
// Krail is fuel now, and scarce: it comes from violet-veined rock cut clean,
// from the rare gold rock, from the port and from a capital ship's wreck.
// Ore is what the cutter takes out of ordinary rock: it fills the hold, it
// pays for refits on the rail, and it sells at the port. Parts are salvage
// from wrecks; the crew patch a plate out of them when the ship is left
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

/** Krail it takes to jump, what the tank holds at the start, and the hold's capacity. */
export const JUMP_COST = 20;
export const START_KRAIL = 6;
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
/** Krail and parts a capital ship's wreck leaves in a sortie: a top-up, not a jump, so a blockade or a captain is never a payday. */
export const CAPITAL_KRAIL = 6;
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
  name: string;
  kind: SystemKind;
  /** Where the plotted lane goes, and the Krail it takes to jump. */
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
  /** Of the pursuit, the share that is Gutter crews from ahead. */
  gutter: number;
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
}

export const HOME: SortieDef = {
  system: 'home', name: 'Cerro', kind: 'home', dest: 'the Scatter', jumpCost: 20, lane: 2600, port: { name: 'Frontier Supply', prices: BASE_PRICES },
  heat: 0.1, heatRate: 1, rich: 0.09, density: 1, gutter: 0.22, calls: 1, blockade: true, netted: true, calloway: Infinity, behind: Infinity, home: true, notice: QUIET,
};

/** What the Wayward carries from one sortie into the next. */
export interface Carry {
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
}

/** Food: what the galley holds at most, and at the start. */
export const FOOD_MAX = 30;
export const FOOD_START = 12;

/** The pursuers, by the heat they need. Gutter crews work the belt ahead and do not care who you are. */
const PURSUERS: Array<{ variant: string; from: number; weight: number }> = [
  { variant: 'picket', from: 0, weight: 3 },
  { variant: 'lancer', from: 0.25, weight: 2 },
  { variant: 'enforcer', from: 0.4, weight: 2 },
  { variant: 'interdictor', from: 0.65, weight: 1 },
];
const GUTTER = ['scout', 'scout', 'raptor'];

/** Which hull comes next, and whether it is Custody from behind or a Gutter crew from ahead. */
export function pickPursuer(heat: number, rng: Rng, gutter = 0.22): { variant: string; ahead: boolean } {
  if (heat < 0.6 && rng.next() < gutter) return { variant: GUTTER[rng.int(GUTTER.length)]!, ahead: true };
  const pool = PURSUERS.filter((p) => p.from <= heat);
  let roll = rng.next() * pool.reduce((a, p) => a + p.weight, 0);
  for (const p of pool) if ((roll -= p.weight) <= 0) return { variant: p.variant, ahead: false };
  return { variant: pool[pool.length - 1]!.variant, ahead: false };
}

// ── what rock gives ───────────────────────────────────────────────────────
// Cut clean, a rock gives all of this; broken by the guns, only scraps.

export interface Yield { ore: number; krail: number }

const ORE: Record<RockKind, readonly [number, number, number]> = {
  basalt: [6, 3, 1],
  iron: [10, 5, 2],
  rich: [3, 2, 1],
  volatile: [12, 6, 3],
  rare: [4, 4, 4],
};
const KRAIL: Record<RockKind, readonly [number, number, number]> = {
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
  return { ore: Math.round(ORE[kind][size] * k), krail: Math.round(KRAIL[kind][size] * k) };
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
  /** Krail the plotted jump takes. */
  jumpCost: number;
  /** The port's prices today. */
  prices: Prices;
  heat: number;
  nextPursuit: number;
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
  /** Seconds until the next "not enough Krail" reminder. */
  nagT: number;
}

export function newBreakout(heading: number, def: SortieDef = HOME): Breakout {
  const c = course(heading, 0, 0, def);
  return {
    def, lane: c.lane, port: c.port, jumpCost: def.jumpCost, prices: def.port?.prices ?? BASE_PRICES, heat: def.heat, nextPursuit: PURSUIT_FIRST, spool: 0, spoolNeed: SPOOL, dockT: 0, portCooled: false, docks: 0,
    blockade: 'none', jumpT: -1, nagT: 0,
  };
}
