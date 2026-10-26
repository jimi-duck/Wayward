import { HUSH } from './desk';
import { t } from '../i18n';
import {
  DANGER_DAYS, PLACE_CHITS, PLACE_COVER, PLACE_CYRITE, PLACE_KRAIL, PLACE_PARTS, PLACES, REWARD_WORD,
} from '../content/phenomena';
import { SYSTEMS } from '../content/systems';
import { DEFAULT_SURVIVAL, survivalOf, type SurvivalId } from '../content/survival';
import type { RegionSet } from '../content/regions';
import { weightFuel } from './budgets';
import { cy, refine } from './purse';
import { SUPPLIES_MAX, SUPPLIES_START, HOME, JUMP_COST, START_CYRITE, TANK_MAX, HOLD_MAX, type Carry, type SortieDef, type SortieResult } from './breakout';
import {
  arrive, colsOf, jumps, lanesFrom, makeChart, netted, openShortcut, placeAt, pricesAt, pushNet, regionDef, regionOf, regionsOf, routeBetween, SIGHT, sightPlaces, spreadNet, sysById,
  tierOf, viewOf, type Chart, type StarSystem,
} from './chart';
import { fleetAt, presence, raided, stepScatter, threnAt, THREN_ABOUT } from './scatter';
import { arrival, delay as keysDelay, KEYS_NOTED, shift } from './consequences';
import { ENDING_LINES, ending, hunchOf, nemesis, newDossier, offerFor, study, type Dossier } from './calloway';
import { BEATEN_DELAY, DAY_SECONDS, behind, crossGate, daysUntil, huntOn, newHunt, type Hunt } from './hunt';
import { dealSituations, liveSituation, longIndex, settle, situationLine } from './situations';
import { composeChart, expOf } from './experience';
import { PROFILES } from '../content/profiles';
import { cool, newNotice, noticeFromRun, pressure, raise, remember, type Notice } from './notice';
import { openChapter, type Chapter } from './chapters';
import { effects } from './modules';
import { stockLevels } from './bay';
import { Rng } from './rng';
import { sensors } from './comms';
import type { Faction } from './enemies';
import type { EndingId } from '../content/endings';
import { ACTS, CHOICE_REGION } from '../content/story';
import { actLine, dueBeat } from './story';
import { postJump } from './postjump';
import { ON_ROAD, roadStop } from '../content/road';

// ── the journey ───────────────────────────────────────────────────────────
// The layer above the world: everything that lasts longer than one system.
// The ship (build, plates, the rail), the hold, the tank, the galley, the
// purse, who you have helped and what you have heard; the chart and the
// Net; Calloway and the trail she follows; the day.
//
// A journey is a loop of two steps:
//
//   a sortie · one system flown in real time by the world (sim/world.ts).
//              `sortieDef` says what the system is; the world hands back a
//              SortieResult. Every DAY seconds flown is a day gone.
//   the chart · on the far side of the lane, the drive cools and you plot
//              the next jump from the lanes out of where you are. The jump
//              costs the Cyrite on the lane, days in the lane, and food and
//              parts for those days.
//
// Failure costs, but rarely ends it. A wreck leaves you adrift: a Drift tug
// tows the Wayward to another system of the same region, a day later, with
// the hold and the Krail taken as the fee and half the rest. The third wreck
// in one region (the mode's limit) is a total loss: the region is flown
// again from its gate (main.ts, with the chapter save). A wreck with
// Calloway in the system, or any wreck in hardcore, ends the journey. Reaching the Threshold ends the
// region: out into the Scatter, with one choice left, what the Severance
// file is worth (sim/endings.ts).
//
// Every faction keeps notice of the Wayward (sim/notice.ts): the kills of
// each sortie raise it, the days let it fade, and what it has risen to goes
// into the next sortie's SortieDef: cards that know you, dearer fees, a
// harder pursuit, and at the top a named captain who remembers.
//
// Calloway keeps a file on you (sim/calloway.ts): every trick you use on
// her, your habits on the chart, what your answers say you care about, and
// how far she can trust you. It makes her harder to fool, sends her offers,
// and when you plot the jump to the Threshold she is waiting at the lane
// mouth for a last meeting built from all of it.
//
// Most systems have a place in them (content/phenomena.ts). The sortie
// plays it once; dealt with, it pays here, in whatever it pays: Cyrite,
// salvage, cover from Calloway, a new lane, a favour owed, news, or a find
// that someone else hears about.

/** Seconds of a sortie that make a day. */
export const DAY = DAY_SECONDS;
/** Supplies a day: the Wayward is flown by one person. */
export const RATION = 1;
/** Supplies the drive wears through a jump, on top of the lane's days. */
export const WEAR = 2;
/** Wrecks the Wayward survives. */
export const WRECKS = 3;
/** Days lost adrift after a wreck. */
export const ADRIFT = 1;
/** Seconds into a sortie before Calloway can call, if she was already waiting. */
export const WAITING = 40;
/** Days a ghost echo holds Calloway up, per mark, at every jump; the mark at which she cannot read your route. */
export const ECHO_DELAY = 0.5;
export const ECHO_BLIND = 2;
/** The save's version: bump it and add a migration in meta/save.ts when the shape changes. */
export const VERSION = 21;
/** A breather has rock to mine at your own pace: with no wrecks to cut for Cyrite, a thin sky would be a trap. */
const QUIET_RICH = 0.16, QUIET_DENSITY = 1;
/** Who comes from ahead in a system the Voice or the Thren hold (the Gutter's crews everywhere else). */
export const AHEAD: Partial<Record<string, string[]>> = { voice: ['drone', 'probe', 'drone'], thren: ['mote', 'mote', 'weaver'] };
/** A Gutter raid adds this to the share of the pursuit from ahead. */
export const RAID_AHEAD = 0.25;

/** How much tougher the hulls are at the Threshold than in Cerro, and how much more the jobs pay: the chart's depth sets both, so a ship that stays as it was falls behind and a ship that keeps growing keeps up. */
export const DEPTH = { threat: 8, pay: 2.5 } as const;

/** How far along the chart a system is, 0 in Cerro to 1 at the Threshold. */
export const depthOf = (c: Chart, id: string): number => Math.min(1, sysById(c, id).col / Math.max(1, colsOf(c) - 1));
/** The hull multiplier at a system (1 to `DEPTH.threat`). */
export const threatAt = (c: Chart, id: string): number => 1 + (DEPTH.threat - 1) * depthOf(c, id);
/** The multiplier on a job's pay at a system (1 to `DEPTH.pay`). */
export const bountyAt = (c: Chart, id: string): number => 1 + (DEPTH.pay - 1) * depthOf(c, id);

export type JourneyEnd = 'through' | 'captured' | 'wrecked';

export interface Leg {
  system: string;
  name: string;
  day: number;
  /** Cyrite (the purse) aboard arriving, and leaving (after the jump); and the same for the drive tank's jump fluid (absent in a leg saved before the tank). */
  cyriteIn: number;
  cyriteOut: number;
  fuelIn?: number;
  fuelOut?: number;
  time: number;
  ended: 'jumped' | 'destroyed';
  cards: number;
  kills: number;
  combat?: number;
  calloway: boolean;
  score: number;
}

export interface Journey {
  version: number;
  seed: number;
  hardcore: boolean;
  /** The survival mode it was begun in (content/survival.ts): fixed for the journey, whatever the title shows later. */
  survival: SurvivalId;
  day: number;
  chart: Chart;
  /** Where the Wayward is, and where the plotted lane goes (null while the chart is open). */
  at: string;
  dest: string | null;
  /** Every system flown, in order: what Calloway follows. */
  trail: string[];
  hunt: Hunt;
  /** What Calloway knows of you (sim/calloway.ts). */
  calloway: Dossier;
  /** Every faction's notice of you, and the captains it has sent. */
  notice: Notice;
  /** What the ship carries into the next sortie. */
  carry: Carry;
  /** Wrecks so far, and jumps in a row without enough food. */
  wrecks: number;
  /** Wrecks in the region flown now: the mode's limit makes it a total loss (back to the gate). Starts again at each gate. */
  lost: number;
  hungry: number;
  /** Between sorties, plotting ('chart'); in a sortie ('sortie'); or done. */
  status: 'chart' | 'sortie' | 'over';
  end: JourneyEnd | null;
  /** Through the Threshold: the ending chosen (sim/endings.ts), or not yet. */
  ending?: EndingId | null;
  score: number;
  legs: Leg[];
  log: Array<{ day: number; text: string }>;
  /** A record for each gate crossed (sim/chapters.ts); absent on a journey saved before them. */
  chapters?: Chapter[];
  /** Draws from the journey's own generator, so a loaded journey carries on exactly. */
  rolls: number;
}

const rng = (j: Journey) => new Rng((j.seed * 7919 + ++j.rolls * 104729) >>> 0);

export function startCarry(survival: SurvivalId = DEFAULT_SURVIVAL): Carry {
  const K = survivalOf(survival).voyage.start;
  return {
    cyrite: 0, fuel: K.cyrite, supplies: K.supplies, plates: 99, levels: stockLevels(), refit: 0, techs: [], flags: [], standing: {}, jobs: [], seen: [], hush: HUSH,
  };
}

/** A new journey: the region laid out, the Breakout first. The old lane out of Cerro leads to one system of the next column. */
export function newJourney(seed: number, hardcore = false, set: RegionSet = 'three', survival: SurvivalId = DEFAULT_SURVIVAL): Journey {
  const V = survivalOf(survival).voyage;
  const chart = makeChart(seed, set, V.breathers);
  // the mode's fuel economy is written into the lanes once, so everything that reads a lane's Cyrite (the chart, the planner, the save) agrees
  if (V.jump !== 1) {
    chart.fuel = V.jump;
    for (const r of chart.routes) r.cyrite = Math.max(1, Math.round(r.cyrite * V.jump));
  }
  dealSituations(chart, seed);
  composeChart(chart, seed);
  const carry = startCarry(survival);
  if (set === 'road') carry.flags.push(ON_ROAD);
  const j: Journey = {
    version: VERSION, seed, hardcore, survival: survivalOf(survival).id, day: 0, chart, at: chart.home, dest: null, trail: [chart.home], hunt: newHunt(), calloway: newDossier(), notice: newNotice(), carry,
    wrecks: 0, lost: 0, hungry: 0, status: 'sortie', end: null, score: 0, legs: [], log: [], rolls: 0,
  };
  const out = lanesFrom(chart, chart.home);
  j.dest = out[rng(j).int(out.length)]!.to.id;
  note(j, t('Breakout · the Kellern yards are locked down'));
  return j;
}

const note = (j: Journey, text: string) => { j.log.push({ day: Math.round(j.day * 10) / 10, text }); };

/** The system the Wayward is in. */
export const here = (j: Journey): StarSystem => sysById(j.chart, j.at);

/** What the world needs to fly the current system. */
/** The road's columns that are safe: the audit dock's system and Northfold. */
const SAFE_COLS = 2;

export function sortieDef(j: Journey): SortieDef {
  const s = here(j);
  const notice = pressure(j.notice, j.day);
  // no checkpoint at Cerro's gate: the registry meets Juno beyond it (docs/ONBOARDING.md), and the run to the gate is a chase
  if (s.kind === 'home') return { ...HOME, blockade: false, survival: j.survival, jumpCost: Math.max(1, Math.round(HOME.jumpCost * (j.chart.fuel ?? 1))), system: s.id, dest: j.dest ? sysById(j.chart, j.dest).name : HOME.dest, behind: Infinity, notice, story: dueBeat(j) };
  const t = SYSTEMS[s.kind];
  const net = netted(j.chart, s.id);
  const route = j.dest ? routeBetween(j.chart, s.id, j.dest) : null;
  // Calloway: here already (she calls once you are clear of the arrival), or due in so many days of lingering
  const until = daysUntil(j.hunt, j.chart, j.trail);
  // the jump to the Threshold: she is not behind you, she is waiting at the Jump Gate
  const finale = j.dest === j.chart.edge;
  const offer = offerFor(j.calloway, { day: j.day, behind: behind(j.hunt, j.trail), caught: j.hunt.caught, flown: j.trail.length - 1, flags: j.carry.flags, hurt: j.carry.plates <= 2, netted: net });
  const p = placeAt(j.chart, s.id), pd = p && PLACES[p.id];
  // further out the Custody is far from home, and whoever holds the system comes at you from ahead
  const R = regionDef(j.chart, regionOf(s)) ?? regionsOf(j.chart)[0]!, raid = raided(j.chart, s.id);
  // a breather is quiet unless the Net has reached it: a blockade is not a rest
  const quiet = !!s.quiet && !net;
  // what the flags from earlier choices change here (content/consequences.ts)
  const at = { holder: s.holder, here: presence(j.chart, s.id), port: !!s.port };
  const echo = shift(j.carry.flags, at);
  // the long journey: she meets you once a region
  const met = !!R.calloway && !!j.hunt.met?.includes(regionOf(s));
  const ahead = (net ? t.gutter * 0.5 : t.gutter) * R.ahead + (raid ? RAID_AHEAD : 0) + echo.ahead;
  const quoted = s.port ? pricesAt(j.chart, s.id)! : null;
  // a copy: the chart's own prices are not the flags' to change
  const prices = quoted && { ...quoted, plate: Math.round(quoted.plate * echo.plates) };
  const def: SortieDef = {
    survival: j.survival, threat: threatAt(j.chart, s.id), pay: bountyAt(j.chart, s.id), system: s.id, region: tierOf(j.chart, regionOf(s)), sky: R.sky, name: s.name, kind: s.kind, dest: j.dest ? sysById(j.chart, j.dest).name : 'nowhere', jumpCost: route?.cyrite ?? JUMP_COST, lane: s.lane,
    port: prices ? { name: s.port!.name, prices } : null,
    heat: Math.max(0, Math.min(0.6, t.heat + (net ? 0.25 : 0) + echo.heat)), heatRate: t.heatRate * (net ? 1.3 : R.heatRate),
    rich: quiet ? Math.max(QUIET_RICH, t.rich * (0.6 + s.cyrite * 0.8)) : t.rich * (0.6 + s.cyrite * 0.8), density: quiet ? Math.max(QUIET_DENSITY, t.density) : t.density, gutter: Math.min(0.8, ahead + notice.gutter), calls: t.calls, pace: t.pace, quiet,
    ahead: raid ? undefined : AHEAD[s.holder], thren: threnAt(j.chart, s.id), here: presence(j.chart, s.id),
    blockade: net, netted: net, calloway: finale || quiet || met ? Infinity : until <= 0 ? WAITING : until * DAY, behind: behind(j.hunt, j.trail), home: false, notice,
    place: pd ? { name: pd.name, text: pd.text, plays: pd.plays, id: pd.id } : null,
    exp: expOf(j.chart, s.id, j.seed),
    rules: PROFILES[longIndex(j.chart, regionOf(s))]?.rules,
    nemesis: nemesis(j.calloway, j.hunt, { finale, offer: quiet ? null : offer, flags: j.carry.flags }),
    story: quiet ? null : dueBeat(j),
    situation: liveSituation(j.chart, s.id)?.id ?? null,
    script: j.chart.regionSet === 'road' && regionOf(s) === 0 ? (s.kind === 'gate' ? 'narrows' : roadStop(s.name)?.script) : undefined,
  };
  // the Narrows: Ashgrove holds the gate (content/script/narrows.ts)
  if (def.script === 'narrows') { def.blockade = true; def.checkpoint = 'narrows_checkpoint'; }
  // set adrift here a moment ago: the gate is not dead ahead any more
  const last = j.legs[j.legs.length - 1];
  if (j.chart.regionSet === 'road' && last?.ended === 'destroyed' && last.system === s.id) def.off = (j.lost % 2 ? 1 : -1) * (0.25 + 0.1 * (j.lost % 3));
  // the road's first two systems are safe: no raiders, no chance fights; only lingering draws the police (owner, 26 October 2026)
  if (j.chart.regionSet === 'road' && regionOf(s) === 0 && s.col <= SAFE_COLS) { def.safe = true; def.gutter = 0; def.pace = { first: Math.max(def.pace?.first ?? 0, 150), calm: Math.max(def.pace?.calm ?? 0, 30) }; def.heatRate = Math.min(def.heatRate, 0.7); }
  // the first system past Cerro is its own level (sim/postjump.ts)
  return j.trail.length === 2 ? postJump(def) : def;
}

/** The lanes on offer from here, with what each costs and what is known at the other end. */
export function options(j: Journey) {
  // never back to Cerro (the yards are the Continuance's), nor back through a gate
  return lanesFrom(j.chart, j.at).filter(({ to }) => onward(j, to)).map(({ to, route }) => ({
    to, route, fuel: route.cyrite + weightFuel(j.carry.levels), supplies: route.days * RATION + survivalOf(j.survival).voyage.wear, netted: j.chart.seenNet.includes(to.id),
    /** Calloway was last seen there (as far as you know). */
    shadow: j.trail[j.hunt.seenIdx] === to.id,
    /** The place there, as far as you know. */
    place: placeAt(j.chart, to.id),
    /** What is going on there, in a few words, as far as you know. */
    scene: situationLine(j.chart, to.id),
  }));
}

/**
 * The first jump out of Cerro has no choice, so it has no chart: called as the ship lands in the first system beyond (the
 * trail is Cerro and here), it plots the next lane at once. Returns whether it did. Every later jump is the player's to plot.
 */
export function autoCourse(j: Journey): boolean {
  if (j.status !== 'chart' || j.trail.length !== 2) return false;
  const o = options(j)[0];
  return !!o && plot(j, o.to.id);
}

/** A lane you may take from here: not to Cerro, and never back through a gate (from one, only on into the region beyond). */
function onward(j: Journey, to: StarSystem): boolean {
  if (to.kind === 'home') return false;
  const s = here(j);
  // and never back along the chart: the way is on
  return to.col >= s.col && (s.kind === 'gate' ? regionOf(to) > regionOf(s) : regionOf(to) >= regionOf(s));
}

/** Plot the next jump. False if there is no lane there from here. */
export function plot(j: Journey, to: string): boolean {
  if (j.status !== 'chart' || !routeBetween(j.chart, j.at, to) || !onward(j, sysById(j.chart, to))) return false;
  j.dest = to;
  j.status = 'sortie';
  return true;
}

/**
 * At a port, plot again: the lane out of here can change while you are
 * docked, with what the dockmaster told you in mind. The world needs the
 * new destination and its Cyrite (World.replot). False if not docked at a
 * port here, or there is no such lane.
 */
export function replot(j: Journey, to: string): { dest: string; jumpCost: number } | false {
  const s = here(j);
  if (j.status !== 'sortie' || !s.port || s.kind === 'home' || !routeBetween(j.chart, s.id, to) || !onward(j, sysById(j.chart, to))) return false;
  const route = routeBetween(j.chart, s.id, to);
  if (!route) return false;
  if (to !== j.dest) note(j, t('Re-plotted for {name}', { name: sysById(j.chart, to).name }));
  j.dest = to;
  return { dest: sysById(j.chart, to).name, jumpCost: route.cyrite };
}

/** News bought (the dockmaster, a Drift fleet): the Net's edge as it is now, and where she is. */
export function hearNews(j: Journey): void {
  j.chart.seenNet = j.chart.systems.filter((x) => netted(j.chart, x.id)).map((x) => x.id);
  sight(j, true);
}

/**
 * Time passes: the Net spreads, Calloway moves, the factions go about
 * their business. Returns the systems the Net took; what the factions did
 * within sight goes into `heard`.
 */
function pass(j: Journey, days: number, heard: string[] = []): string[] {
  j.day += days;
  huntOn(j.hunt, j.chart, j.trail, days);
  cool(j.notice, days);
  // the Net moves once you are out of Cerro: it is the Continuance answering the escape
  if (j.trail.length < 2) return [];
  const fell = spreadNet(j.chart, days * survivalOf(j.survival).voyage.net, rng(j));
  // the Thren follow the Cyrite: in a lane, to where it is going (the Wayward is already set down there)
  const at = j.at;
  for (const n of stepScatter(j.chart, days, rng(j), { at, cyrite: j.carry.fuel, tank: JUMP_COST })) {
    if (jumps(j.chart, at, n.id) > SIGHT) continue;
    note(j, n.text);
    heard.push(n.text);
  }
  return fell;
}

/** Where Calloway is believed to be: seen exactly when she is close, the news is fresh, or the sensors catch her. */
function sight(j: Journey, sure: boolean): void {
  if (sure || behind(j.hunt, j.trail) <= 1 || rng(j).next() < sensors(j.carry.levels) * 0.5) {
    j.hunt.seenIdx = j.hunt.idx;
    j.hunt.seenDay = j.day;
  }
}

/** Cyrite found between systems, into the carry: the tank first, the rest to the purse (the refinery, as in flight). */
function bank(c: Carry, n: number): void {
  const r = refine(c.fuel, c.cyrite, JUMP_COST, n);
  c.fuel = r.fuel;
  c.cyrite = Math.min(HOLD_MAX, r.purse);
}

/**
 * The place in `s` was dealt with: mark it and pay it, into the carry `c`.
 * A new lane opens from `from` (where the Wayward goes next, so it can be
 * used). Returns lines for the panel.
 */
function claim(j: Journey, s: StarSystem, c: Carry, from: string): string[] {
  const p = j.chart.places[s.id];
  if (!p || p.done) return [];
  p.done = true;
  const d = PLACES[p.id];
  const head = d.reward === 'unknown' ? `${t(d.name)} · ${t(d.done)}: ${t(REWARD_WORD[p.reward])}` : `${t(d.name)} · ${t(d.done)}`;
  const lines = [head];
  switch (p.reward) {
    case 'cyrite': bank(c, PLACE_CYRITE); lines.push(`+${PLACE_CYRITE} Cyrite`); break;
    case 'parts': c.supplies = Math.min(SUPPLIES_MAX, c.supplies + PLACE_PARTS); bank(c, cy(PLACE_KRAIL)); lines.push(t('+{n} supplies · +{k} Cyrite', { n: PLACE_PARTS, k: cy(PLACE_KRAIL) })); break;
    case 'cover': j.hunt.delay += PLACE_COVER; lines.push(t('Calloway loses your trail for a while')); break;
    case 'shortcut': {
      const to = openShortcut(j.chart, from);
      lines.push(to ? t('New lane: {a} to {b}', { a: sysById(j.chart, from).name, b: to.name }) : t('The lane it showed leads nowhere new'));
      break;
    }
    case 'favour': bank(c, cy(PLACE_CHITS)); lines.push(t('+{n} Cyrite · favours owed', { n: cy(PLACE_CHITS) })); break;
    case 'info': hearNews(j); sightPlaces(j.chart, s.id, 3); lines.push(t('The Net’s edge, and the places three jumps round')); break;
    case 'danger':
      c.supplies = Math.min(SUPPLIES_MAX, c.supplies + PLACE_PARTS); bank(c, cy(PLACE_KRAIL * 2));
      huntOn(j.hunt, j.chart, j.trail, DANGER_DAYS);
      lines.push(t('+{n} supplies · +{k} Cyrite', { n: PLACE_PARTS, k: cy(PLACE_KRAIL * 2) }), t('Word gets out · Calloway gains a day'));
      break;
  }
  note(j, head);
  return lines;
}

export interface Outcome {
  /** 'lost' is made by the app from a 'wrecked' that can be flown again: the region from its gate. */
  kind: 'jumped' | 'adrift' | 'lost' | JourneyEnd;
  /** What happened, in lines for the panel. */
  lines: string[];
}

/**
 * The tug puts the Wayward down in another system of the region: a new one if any is left, and one the Net
 * does not hold. Not the Cerro yards, a gate or the Threshold. The lane out is plotted for her, as at the start.
 */
function driftTo(j: Journey, from: StarSystem): StarSystem {
  const region = viewOf(j.chart, from.id);
  // on the road there is nowhere else to be towed: she stays in the system, a little off her course (sortieDef)
  if (j.chart.regionSet === 'road' && regionOf(from) === 0) return from;
  const pool = j.chart.systems.filter((x) => x.id !== from.id && viewOf(j.chart, x.id) === region && x.kind !== 'home' && x.kind !== 'gate' && x.kind !== 'edge' && !netted(j.chart, x.id));
  const fresh = pool.filter((x) => !j.chart.visited.includes(x.id));
  const pick = fresh.length ? fresh : pool.length ? pool : [from];
  const to = pick[rng(j).int(pick.length)]!;
  j.at = to.id;
  j.trail.push(to.id);
  arrive(j.chart, to.id, j.day);
  const out = lanesFrom(j.chart, to.id);
  j.dest = out[rng(j).int(out.length)]!.to.id;
  return to;
}

/** A wreck with Calloway in the system: a capture, or on the long chart with the region's chance. */
function captureRoll(j: Journey, s: StarSystem): boolean {
  const risk = regionDef(j.chart, regionOf(s))?.calloway?.risk;
  return risk === undefined || rng(j).next() < risk;
}

/** A sortie is over: fold its result into the journey. */
export function endSortie(j: Journey, res: SortieResult): Outcome {
  const lines: string[] = [];
  const s = here(j);
  const cyriteIn = j.carry.cyrite, fuelIn = j.carry.fuel;
  j.score += res.run.score;
  // the sortie's own consequences: a held-up hunter, a system that will hold out
  if (res.huntDelay > 0) j.hunt.delay += res.huntDelay;
  else if (res.huntDelay < 0) huntOn(j.hunt, j.chart, j.trail, -res.huntDelay);
  if (res.stall > 0 && !netted(j.chart, s.id)) j.chart.stall[s.id] = (j.chart.stall[s.id] ?? 0) + res.stall;
  else if (res.stall < 0) pushNet(j.chart, s.id, -res.stall);
  if (res.calloway) { j.hunt.caught++; (j.hunt.met ??= []).push(regionOf(s)); }
  if (res.callowayBeaten) { j.hunt.beaten++; j.hunt.delay += BEATEN_DELAY; lines.push(t('Calloway’s ship is crippled · {n} days of repairs', { n: BEATEN_DELAY })); }
  // the system's place, dealt with: it pays now, and any new lane opens from where you go next
  if (res.place) lines.push(...claim(j, s, res.carry, res.ended === 'jumped' && j.dest ? j.dest : s.id));
  // the system's situation, met: what it did to the chart and the hunt
  if (res.situation) {
    const flag = (f: string) => { if (!res.carry.flags.includes(f)) res.carry.flags.push(f); };
    const hunt = (d: number) => { if (d > 0) j.hunt.delay += d; else if (d < 0) huntOn(j.hunt, j.chart, j.trail, -d); };
    const before = new Set(Object.keys(j.chart.situations ?? {}));
    lines.push(...settle(j.chart, res.situation.id, res.situation.result, { at: s.id, day: j.day, flag, hunt }));
    // a follow-up situation turned up further on: its system gets the sky that fits it
    for (const id of Object.keys(j.chart.situations ?? {})) if (!before.has(id)) composeChart(j.chart, j.seed, id);
  }
  const flags = new Set(res.carry.flags);
  const news = flags.delete('news');
  flags.delete('calloway_beaten');
  res.carry.flags = [...flags];
  // the factions take note of what you broke and what you said; a captain remembers how it went
  const marked = noticeFromRun(res.run);
  for (const [f, v] of Object.entries(res.notice ?? {}) as Array<[Faction, number]>) marked[f] = (marked[f] ?? 0) + v;
  const heard: string[] = [];
  // Calloway studies what you did: her own people killed after you gave your word, the tricks, the truths, the offers
  const killed = noticeFromRun(res.run);
  heard.push(...study(j.calloway, res.run.cards, (killed.custody ?? 0) > 0 || (killed.office ?? 0) > 0, j.day));
  if (res.captain) heard.push(...remember(j.notice, res.captain.id, res.captain.report, j.day, res.carry.standing, rng(j)));
  for (const [f, v] of Object.entries(marked) as Array<[Faction, number]>) heard.push(...raise(j.notice, f, v, res.carry.standing));
  for (const h of heard) note(j, h);
  lines.push(...heard);
  const fell = pass(j, res.time / DAY, lines);
  const leg: Leg = {
    system: s.id, name: s.name, day: Math.round(j.day * 10) / 10, cyriteIn, cyriteOut: res.carry.cyrite, fuelIn, fuelOut: res.carry.fuel, time: Math.round(res.time), ended: res.ended,
    cards: res.run.cards.length, kills: res.run.kills, calloway: res.calloway, score: res.run.score,
  };
  j.legs.push(leg);

  if (res.ended === 'destroyed') {
    j.wrecks++;
    j.lost = (j.lost ?? 0) + 1;
    // a wreck with her in the system is a capture (on the long chart, with the region's risk)
    const V = survivalOf(j.survival).voyage;
    const taken = res.calloway && captureRoll(j, s);
    if (j.hardcore || j.lost >= V.wrecks || taken) {
      j.status = 'over';
      j.end = taken ? 'captured' : 'wrecked';
      j.carry = res.carry;
      note(j, t(taken ? 'Taken by Calloway in {name}' : 'The Wayward breaks up in {name}', { name: s.name }));
      return { kind: j.end, lines: [t(taken ? 'Calloway’s boarders cut through the airlock.' : 'The Wayward is beyond saving.')] };
    }
    // adrift: a Drift tug tows her to another system of the region. The fee is some of everything you carry.
    const c = res.carry;
    j.carry = { ...c, supplies: Math.max(3, Math.floor(c.supplies * V.kept)), cyrite: Math.floor(c.cyrite * V.kept), fuel: Math.floor(c.fuel * V.kept), plates: 2, stock: { shield: 0, yield: 0 } };
    pass(j, ADRIFT);
    const to = driftTo(j, s);
    const stay = to.id === s.id;
    note(j, stay ? t('Wrecked in {name} · set going again', { name: s.name }) : t('Wrecked in {name} · towed to {to}', { name: s.name, to: to.name }));
    lines.push(stay ? t('A Drift tug found the wreck and set her going again, a little off her course.') : t('A Drift tug found the wreck and towed her to {to}.', { to: to.name }), t(V.kept > 0.5 ? 'The fee: a quarter of your Cyrite, jump fluid and supplies.' : 'The fee: half your Cyrite, jump fluid and supplies.'), t('Wrecks left in this region · {n}', { n: V.wrecks - j.lost }));
    j.status = 'sortie';
    return { kind: 'adrift', lines };
  }

  // jumped: the lane takes days, and the drive wears
  const to = j.dest!;
  const route = routeBetween(j.chart, s.id, to);
  const days = route?.days ?? 1;
  const c = { ...res.carry };
  const eat = days * RATION + survivalOf(j.survival).voyage.wear;
  let penalty = 0;
  if (c.supplies >= eat) { c.supplies -= eat; j.hungry = 0; }
  else { c.supplies = 0; j.hungry++; penalty++; lines.push(t('Out of supplies in the lane · a plate down')); }
  c.plates = Math.max(1, c.plates - penalty);
  j.carry = c;
  j.at = to;
  j.dest = null;
  j.trail.push(to);
  // out of a gate, into the next region: she starts it close behind, not with the last one's debt
  if (s.kind === 'gate' && regionDef(j.chart, regionOf(s))?.calloway) crossGate(j.hunt, j.trail);
  // she crosses after you: the lane's days count on her trail too
  fell.push(...pass(j, days, lines));
  arrive(j.chart, to, j.day);
  if (news) {
    hearNews(j);
    lines.push(t('Your news: the Net’s edge and the Governor’s last port'));
  } else sight(j, false);
  leg.cyriteOut = c.cyrite;
  leg.fuelOut = c.fuel;
  const there = sysById(j.chart, to);
  note(j, t('Jumped to {name}', { name: there.name }));
  for (const id of fell) if (j.chart.seenNet.includes(id)) lines.push(t('The Net has taken {name}', { name: sysById(j.chart, id).name }));
  const place = placeAt(j.chart, to);
  if (place && there.kind !== 'edge') lines.push(`${t('{name} here', { name: t(PLACES[place.id].name) })} · ${t(PLACES[place.id].blurb)}`);
  // through a gate: a new region
  if (there.kind === 'gate') { openChapter(j, viewOf(j.chart, to)); const R = regionDef(j.chart, viewOf(j.chart, to)); if (R) { lines.unshift(`${t(R.name)} · ${t(R.blurb)}`); note(j, t('Through {gate} into {region}', { gate: there.name, region: t(R.name) })); } }
  // a new act: out of Cerro, the Run; into the Hollows, the Choice
  const turn = j.trail.length === 2 ? ACTS[1] : there.kind === 'gate' && tierOf(j.chart, viewOf(j.chart, to)) === CHOICE_REGION && tierOf(j.chart, regionOf(there)) < CHOICE_REGION ? ACTS[2] : null;
  if (turn) { lines.unshift(actLine(turn)); note(j, actLine(turn)); }
  lines.push(...arrival(c.flags, { holder: there.holder, here: presence(j.chart, to), port: !!there.port }).map((l) => t(l)));
  const fleet = fleetAt(j.chart, to);
  if (fleet) lines.push(t('Drift fleet here · {name} trades food and news', { name: fleet.name }));
  if (threnAt(j.chart, to) >= THREN_ABOUT) lines.push(t('Thren here · they come for Cyrite'));
  if (there.kind === 'edge') {
    j.status = 'over';
    j.end = 'through';
    const how = ending(res.run.cards, res.callowayBeaten);
    if (how) { j.calloway.ending = how; note(j, t(ENDING_LINES[how])); lines.unshift(t(ENDING_LINES[how])); }
    note(j, t('Through the Threshold · into the Scatter'));
    j.ending = null;
    return { kind: 'through', lines: [t('The old lane opens. Beyond it, the Scatter.'), ...lines] };
  }
  // the keys from the Voice close the lane behind you
  const held = keysDelay(c.flags);
  if (held > 0) {
    j.hunt.delay += held;
    if (!c.flags.includes(KEYS_NOTED)) { c.flags.push(KEYS_NOTED); lines.push(t('A lane closes behind you · Calloway is held up')); }
  }
  // with every system flown she reads your route a little better, unless the echoes left behind make it lie
  const echo = effects(c.levels).echo;
  if (echo > 0) { j.hunt.delay += ECHO_DELAY * echo; lines.push(t('A ghost echo lays a false trail behind you')); }
  j.hunt.hunch = echo >= ECHO_BLIND ? undefined : hunchOf(j.chart, j.trail, c.flags);
  j.status = 'chart';
  return { kind: 'jumped', lines };
}

/** At a port: the journey keeps what the ship has, so a load starts the system again from here. */
export function checkpoint(j: Journey, c: Carry): void {
  j.carry = { ...c, flags: [...c.flags], jobs: c.jobs.map((x) => ({ ...x })), seen: [...c.seen] };
}

/**
 * A comms or story answer, banked at once: what it changed in the ship's carry
 * (stock spent or won, flags, standing, cards heard, jobs) is written into the
 * journey, so a closed tab costs flight time and not the choice. Only the
 * change is applied, so the stock mined so far this sortie is not banked with it.
 */
export function bankAnswer(j: Journey, before: Carry, after: Carry): void {
  const c = j.carry;
  for (const k of ['cyrite', 'supplies'] as const) c[k] = Math.max(0, c[k] + after[k] - before[k]);
  const diff = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));
  c.flags = [...diff(c.flags, diff(before.flags, after.flags)), ...diff(diff(after.flags, before.flags), c.flags)];
  // every card shown so far this sortie, the one just answered among them (it was counted as seen when it opened, so a
  // diff against `before` would miss it, and a reload would deal it again)
  c.seen = [...c.seen, ...diff(after.seen, c.seen)];
  for (const k of Object.keys(after.standing) as Array<keyof Carry['standing']>) {
    const d = (after.standing[k] ?? 0) - (before.standing[k] ?? 0);
    if (d) c.standing[k] = (c.standing[k] ?? 0) + d;
  }
  const key = (x: Carry['jobs'][number]) => JSON.stringify(x);
  const had = new Set(before.jobs.map(key)), has = new Set(after.jobs.map(key));
  c.jobs = [...c.jobs.filter((x) => !had.has(key(x)) || has.has(key(x))), ...after.jobs.filter((x) => !had.has(key(x)) && !c.jobs.some((y) => key(y) === key(x)))];
}

/** The stocks and the day, taken at the start of a sortie, to show what it changed. */
export interface Tally { cyrite: number; fuel: number; plates: number; supplies: number; day: number }
export const tally = (j: Journey): Tally => ({
  cyrite: j.carry.cyrite, fuel: j.carry.fuel, plates: j.carry.plates, supplies: j.carry.supplies, day: j.day,
});

/** One change for the debrief strip: what moved, and by how much (days are tenths). */
export interface Chip { key: keyof Tally; d: number }

/** What a sortie changed, for the chart's strip: each stock that moved, then the days. Nothing that stayed the same. */
export function debrief(was: Tally, j: Journey): Chip[] {
  const now = tally(j), out: Chip[] = [];
  for (const key of ['fuel', 'cyrite', 'plates', 'supplies'] as const) {
    const d = Math.round(now[key] - was[key]);
    if (d) out.push({ key, d });
  }
  const d = Math.round((now.day - was.day) * 10) / 10;
  if (d) out.push({ key: 'day', d });
  return out;
}

/** Jumps from here to the Threshold by the shortest way. */
export const toEdge = (j: Journey) => jumps(j.chart, j.at, j.chart.edge);
