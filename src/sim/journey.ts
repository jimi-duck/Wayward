import { SYSTEMS } from '../content/systems';
import { FOOD_START, HOME, JUMP_COST, START_KRAIL, type Carry, type SortieDef, type SortieResult } from './breakout';
import {
  arrive, jumps, lanesFrom, makeChart, netted, pricesAt, routeBetween, spreadNet, sysById, type Chart, type StarSystem,
} from './chart';
import { BEATEN_DELAY, behind, daysUntil, huntOn, newHunt, type Hunt } from './hunt';
import { cool, newNotice, noticeFromRun, pressure, raise, remember, type Notice } from './notice';
import { Rng } from './rng';
import { sensors } from './comms';
import type { Faction } from './enemies';

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
//              costs the Krail on the lane, days in the lane, and food and
//              parts for those days.
//
// Failure costs, but rarely ends it. A wreck leaves you adrift in the same
// system with the hold gone and half of everything else, a day later; a
// third wreck, a wreck with Calloway in the system, or any wreck in
// hardcore, and the journey is over. Reaching the Threshold ends the
// region: out into the Scatter.
//
// Every faction keeps notice of the Wayward (sim/notice.ts): the kills of
// each sortie raise it, the days let it fade, and what it has risen to goes
// into the next sortie's SortieDef: cards that know you, dearer fees, a
// harder pursuit, and at the top a named captain who remembers.

/** Seconds of a sortie that make a day. */
export const DAY = 240;
/** Mouths in the galley: food a day. */
export const CREW = 3;
/** Parts the drive wears through a jump, and the spares aboard when you steal her. */
export const WEAR = 2;
export const START_PARTS = 4;
/** Wrecks the Wayward survives. */
export const WRECKS = 3;
/** Days lost adrift after a wreck. */
export const ADRIFT = 1;
/** Seconds into a sortie before Calloway can call, if she was already waiting. */
export const WAITING = 40;
/** The save's version: bump it and add a migration in meta/save.ts when the shape changes. */
export const VERSION = 2;

export type JourneyEnd = 'through' | 'captured' | 'wrecked';

export interface Leg {
  system: string;
  name: string;
  day: number;
  /** Krail aboard arriving, and leaving (after the jump). */
  krailIn: number;
  krailOut: number;
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
  day: number;
  chart: Chart;
  /** Where the Wayward is, and where the plotted lane goes (null while the chart is open). */
  at: string;
  dest: string | null;
  /** Every system flown, in order: what Calloway follows. */
  trail: string[];
  hunt: Hunt;
  /** Every faction's notice of you, and the captains it has sent. */
  notice: Notice;
  /** What the ship carries into the next sortie. */
  carry: Carry;
  /** Wrecks so far, and jumps in a row without enough food. */
  wrecks: number;
  hungry: number;
  /** Between sorties, plotting ('chart'); in a sortie ('sortie'); or done. */
  status: 'chart' | 'sortie' | 'over';
  end: JourneyEnd | null;
  score: number;
  legs: Leg[];
  log: Array<{ day: number; text: string }>;
  /** Draws from the journey's own generator, so a loaded journey carries on exactly. */
  rolls: number;
}

const rng = (j: Journey) => new Rng((j.seed * 7919 + ++j.rolls * 104729) >>> 0);

export function startCarry(): Carry {
  return {
    krail: START_KRAIL, ore: 0, parts: START_PARTS, chits: 0, food: FOOD_START, plates: 99, levels: {}, xp: 0, refit: 0, techs: [], flags: [], standing: {}, jobs: [], seen: [],
  };
}

/** A new journey: the region laid out, the Breakout first. The old lane out of Cerro leads to one system of the next column. */
export function newJourney(seed: number, hardcore = false): Journey {
  const chart = makeChart(seed);
  const j: Journey = {
    version: VERSION, seed, hardcore, day: 0, chart, at: chart.home, dest: null, trail: [chart.home], hunt: newHunt(), notice: newNotice(), carry: startCarry(),
    wrecks: 0, hungry: 0, status: 'sortie', end: null, score: 0, legs: [], log: [], rolls: 0,
  };
  const out = lanesFrom(chart, chart.home);
  j.dest = out[rng(j).int(out.length)]!.to.id;
  note(j, 'Breakout · the Kellern yards are locked down');
  return j;
}

const note = (j: Journey, text: string) => { j.log.push({ day: Math.round(j.day * 10) / 10, text }); };

/** The system the Wayward is in. */
export const here = (j: Journey): StarSystem => sysById(j.chart, j.at);

/** What the world needs to fly the current system. */
export function sortieDef(j: Journey): SortieDef {
  const s = here(j);
  const notice = pressure(j.notice, j.day);
  if (s.kind === 'home') return { ...HOME, system: s.id, dest: j.dest ? sysById(j.chart, j.dest).name : HOME.dest, behind: Infinity, notice };
  const t = SYSTEMS[s.kind];
  const net = netted(j.chart, s.id);
  const route = j.dest ? routeBetween(j.chart, s.id, j.dest) : null;
  // Calloway: here already (she calls once you are clear of the arrival), or due in so many days of lingering
  const until = daysUntil(j.hunt, j.chart, j.trail);
  return {
    system: s.id, name: s.name, kind: s.kind, dest: j.dest ? sysById(j.chart, j.dest).name : 'nowhere', jumpCost: route?.krail ?? JUMP_COST, lane: s.lane,
    port: s.port ? { name: s.port.name, prices: pricesAt(j.chart, s.id)! } : null,
    heat: Math.min(0.6, t.heat + (net ? 0.25 : 0)), heatRate: t.heatRate * (net ? 1.3 : 1),
    rich: t.rich * (0.6 + s.krail * 0.8), density: t.density, gutter: Math.min(0.8, (net ? t.gutter * 0.5 : t.gutter) + notice.gutter), calls: t.calls,
    blockade: net, netted: net, calloway: until <= 0 ? WAITING : until * DAY, behind: behind(j.hunt, j.trail), home: false, notice,
  };
}

/** The lanes on offer from here, with what each costs and what is known at the other end. */
export function options(j: Journey) {
  // never back to Cerro: the yards are the Continuance's
  return lanesFrom(j.chart, j.at).filter(({ to }) => to.kind !== 'home').map(({ to, route }) => ({
    to, route, food: route.days * CREW, netted: j.chart.seenNet.includes(to.id),
    /** Calloway was last seen there (as far as you know). */
    shadow: j.trail[j.hunt.seenIdx] === to.id,
  }));
}

/** Plot the next jump. False if there is no lane there from here. */
export function plot(j: Journey, to: string): boolean {
  if (j.status !== 'chart' || !routeBetween(j.chart, j.at, to) || to === j.chart.home) return false;
  j.dest = to;
  j.status = 'sortie';
  return true;
}

/** Time passes: the Net spreads, Calloway moves. Returns the systems the Net took. */
function pass(j: Journey, days: number): string[] {
  j.day += days;
  huntOn(j.hunt, j.chart, j.trail, days);
  cool(j.notice, days);
  // the Net moves once you are out of Cerro: it is the Continuance answering the escape
  return j.trail.length > 1 ? spreadNet(j.chart, days, rng(j)) : [];
}

/** Where Calloway is believed to be: seen exactly when she is close, the news is fresh, or the sensors catch her. */
function sight(j: Journey, sure: boolean): void {
  if (sure || behind(j.hunt, j.trail) <= 1 || rng(j).next() < sensors(j.carry.levels) * 0.5) {
    j.hunt.seenIdx = j.hunt.idx;
    j.hunt.seenDay = j.day;
  }
}

export interface Outcome {
  kind: 'jumped' | 'adrift' | JourneyEnd;
  /** What happened, in lines for the panel. */
  lines: string[];
}

/** A sortie is over: fold its result into the journey. */
export function endSortie(j: Journey, res: SortieResult): Outcome {
  const lines: string[] = [];
  const s = here(j);
  const krailIn = j.carry.krail;
  j.score += res.run.score;
  // the sortie's own consequences: a held-up hunter, a system that will hold out
  if (res.huntDelay > 0) j.hunt.delay += res.huntDelay;
  else if (res.huntDelay < 0) huntOn(j.hunt, j.chart, j.trail, -res.huntDelay);
  if (res.stall > 0 && !netted(j.chart, s.id)) j.chart.stall[s.id] = (j.chart.stall[s.id] ?? 0) + res.stall;
  if (res.calloway) j.hunt.caught++;
  if (res.callowayBeaten) { j.hunt.beaten++; j.hunt.delay += BEATEN_DELAY; lines.push(`Calloway’s ship is crippled · ${BEATEN_DELAY} days of repairs`); }
  const flags = new Set(res.carry.flags);
  const news = flags.delete('news');
  flags.delete('calloway_beaten');
  res.carry.flags = [...flags];
  // the factions take note of what you broke and what you said; a captain remembers how it went
  const marked = noticeFromRun(res.run);
  for (const [f, v] of Object.entries(res.notice ?? {}) as Array<[Faction, number]>) marked[f] = (marked[f] ?? 0) + v;
  const heard: string[] = [];
  if (res.captain) heard.push(...remember(j.notice, res.captain.id, res.captain.result, j.day, res.carry.standing));
  for (const [f, v] of Object.entries(marked) as Array<[Faction, number]>) heard.push(...raise(j.notice, f, v, res.carry.standing));
  for (const h of heard) note(j, h);
  lines.push(...heard);
  const fell = pass(j, res.time / DAY);
  const leg: Leg = {
    system: s.id, name: s.name, day: Math.round(j.day * 10) / 10, krailIn, krailOut: res.carry.krail, time: Math.round(res.time), ended: res.ended,
    cards: res.run.cards.length, kills: res.run.kills, calloway: res.calloway, score: res.run.score,
  };
  j.legs.push(leg);

  if (res.ended === 'destroyed') {
    j.wrecks++;
    if (j.hardcore || j.wrecks >= WRECKS || res.calloway) {
      j.status = 'over';
      j.end = res.calloway ? 'captured' : 'wrecked';
      j.carry = res.carry;
      note(j, res.calloway ? `Taken by Calloway in ${s.name}` : `The Wayward breaks up in ${s.name}`);
      return { kind: j.end, lines: [res.calloway ? 'Calloway’s boarding party cuts through the airlock.' : 'The Wayward is beyond saving.'] };
    }
    // adrift: the crew patch her enough to fly, and the hold is gone
    const c = res.carry;
    j.carry = { ...c, ore: 0, parts: Math.floor(c.parts / 2), krail: Math.floor(c.krail / 2), chits: Math.floor(c.chits / 2), plates: 2 };
    pass(j, ADRIFT);
    note(j, `Wrecked in ${s.name} · adrift a day`);
    lines.push('The hull went. The crew got her flying again, a day later.', 'The hold is lost; half the Krail, parts and chits with it.', `${WRECKS - j.wrecks} more and she will not fly again.`);
    j.status = 'sortie';
    return { kind: 'adrift', lines };
  }

  // jumped: the lane takes days, food and parts
  const to = j.dest!;
  const route = routeBetween(j.chart, s.id, to);
  const days = route?.days ?? 1;
  const c = { ...res.carry };
  const eat = days * CREW;
  let penalty = 0;
  if (c.food >= eat) { c.food -= eat; j.hungry = 0; }
  else { c.food = 0; j.hungry++; penalty++; lines.push(`The galley ran out in the lane · the crew are weak (a plate down)`); }
  if (c.parts >= WEAR) c.parts -= WEAR;
  else { c.parts = 0; penalty++; lines.push(`No parts for the drive’s wear · the hull took it (a plate down)`); }
  c.plates = Math.max(1, c.plates - penalty);
  j.carry = c;
  j.at = to;
  j.dest = null;
  j.trail.push(to);
  // she crosses after you: the lane's days count on her trail too
  fell.push(...pass(j, days));
  arrive(j.chart, to, j.day);
  if (news) {
    j.chart.seenNet = j.chart.systems.filter((x) => netted(j.chart, x.id)).map((x) => x.id);
    lines.push('The news you bought: the Net’s edge and the Prefect’s last port');
  }
  sight(j, news);
  leg.krailOut = c.krail;
  const there = sysById(j.chart, to);
  note(j, `Jumped to ${there.name}`);
  for (const id of fell) if (j.chart.seenNet.includes(id)) lines.push(`The Net has taken ${sysById(j.chart, id).name}`);
  if (there.kind === 'edge') {
    j.status = 'over';
    j.end = 'through';
    note(j, 'Through the Threshold · into the Scatter');
    return { kind: 'through', lines: ['The old lane opens. Beyond it, the Scatter.', ...lines] };
  }
  j.status = 'chart';
  return { kind: 'jumped', lines };
}

/** At a port: the journey keeps what the ship has, so a load starts the system again from here. */
export function checkpoint(j: Journey, c: Carry): void {
  j.carry = { ...c, flags: [...c.flags], jobs: c.jobs.map((x) => ({ ...x })), seen: [...c.seen] };
}

/** Jumps from here to the Threshold by the shortest way. */
export const toEdge = (j: Journey) => jumps(j.chart, j.at, j.chart.edge);
