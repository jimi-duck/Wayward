import { t } from '../i18n';
import {
  DANGER_DAYS, PLACE_CHITS, PLACE_COVER, PLACE_CYRITE, PLACE_KRAIL, PLACE_PARTS, PLACES, REWARD_WORD,
} from '../content/phenomena';
import { SYSTEMS } from '../content/systems';
import type { RegionSet } from '../content/regions';
import { FOOD_START, HOME, JUMP_COST, START_CYRITE, TANK_MAX, type Carry, type SortieDef, type SortieResult } from './breakout';
import {
  arrive, jumps, lanesFrom, makeChart, netted, openShortcut, placeAt, pricesAt, pushNet, regionDef, regionOf, regionsOf, routeBetween, SIGHT, sightPlaces, spreadNet, sysById,
  tierOf, viewOf, type Chart, type StarSystem,
} from './chart';
import { fleetAt, presence, raided, stepScatter, threnAt, THREN_ABOUT } from './scatter';
import { ENDING_LINES, ending, hunchOf, nemesis, newDossier, offerFor, study, type Dossier } from './calloway';
import { BEATEN_DELAY, behind, daysUntil, huntOn, newHunt, type Hunt } from './hunt';
import { cool, newNotice, noticeFromRun, pressure, raise, remember, type Notice } from './notice';
import { effects } from './modules';
import { stockLevels } from './bay';
import { Rng } from './rng';
import { sensors } from './comms';
import type { Faction } from './enemies';
import type { EndingId } from '../content/endings';
import { ACTS, CHOICE_REGION } from '../content/story';
import { actLine, dueBeat } from './story';

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
// Failure costs, but rarely ends it. A wreck leaves you adrift in the same
// system with the hold gone and half of everything else, a day later; a
// third wreck, a wreck with Calloway in the system, or any wreck in
// hardcore, and the journey is over. Reaching the Threshold ends the
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
export const DAY = 240;
/** Food a day: the Wayward is flown by one person. */
export const RATION = 1;
/** Parts the drive wears through a jump, and the spares aboard when you steal her. */
export const WEAR = 2;
export const START_PARTS = 4;
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
export const VERSION = 7;
/** Who comes from ahead in a system the Voice or the Thren hold (the Gutter's crews everywhere else). */
export const AHEAD: Partial<Record<string, string[]>> = { voice: ['drone', 'probe', 'drone'], thren: ['mote', 'mote', 'weaver'] };
/** A Gutter raid adds this to the share of the pursuit from ahead. */
export const RAID_AHEAD = 0.25;

export type JourneyEnd = 'through' | 'captured' | 'wrecked';

export interface Leg {
  system: string;
  name: string;
  day: number;
  /** Cyrite aboard arriving, and leaving (after the jump). */
  cyriteIn: number;
  cyriteOut: number;
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
  /** What Calloway knows of you (sim/calloway.ts). */
  calloway: Dossier;
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
  /** Through the Threshold: the ending chosen (sim/endings.ts), or not yet. */
  ending?: EndingId | null;
  score: number;
  legs: Leg[];
  log: Array<{ day: number; text: string }>;
  /** Draws from the journey's own generator, so a loaded journey carries on exactly. */
  rolls: number;
}

const rng = (j: Journey) => new Rng((j.seed * 7919 + ++j.rolls * 104729) >>> 0);

export function startCarry(): Carry {
  return {
    cyrite: START_CYRITE, krail: 0, ore: 0, parts: START_PARTS, chits: 0, food: FOOD_START, plates: 99, levels: stockLevels(), refit: 0, techs: [], flags: [], standing: {}, jobs: [], seen: [],
  };
}

/** A new journey: the region laid out, the Breakout first. The old lane out of Cerro leads to one system of the next column. */
export function newJourney(seed: number, hardcore = false, set: RegionSet = 'three'): Journey {
  const chart = makeChart(seed, set);
  const j: Journey = {
    version: VERSION, seed, hardcore, day: 0, chart, at: chart.home, dest: null, trail: [chart.home], hunt: newHunt(), calloway: newDossier(), notice: newNotice(), carry: startCarry(),
    wrecks: 0, hungry: 0, status: 'sortie', end: null, score: 0, legs: [], log: [], rolls: 0,
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
export function sortieDef(j: Journey): SortieDef {
  const s = here(j);
  const notice = pressure(j.notice, j.day);
  if (s.kind === 'home') return { ...HOME, system: s.id, dest: j.dest ? sysById(j.chart, j.dest).name : HOME.dest, behind: Infinity, notice };
  const t = SYSTEMS[s.kind];
  const net = netted(j.chart, s.id);
  const route = j.dest ? routeBetween(j.chart, s.id, j.dest) : null;
  // Calloway: here already (she calls once you are clear of the arrival), or due in so many days of lingering
  const until = daysUntil(j.hunt, j.chart, j.trail);
  // the jump to the Threshold: she is not behind you, she is waiting at the lane mouth
  const finale = j.dest === j.chart.edge;
  const offer = offerFor(j.calloway, { day: j.day, behind: behind(j.hunt, j.trail), caught: j.hunt.caught, flown: j.trail.length - 1, flags: j.carry.flags });
  const p = placeAt(j.chart, s.id), pd = p && PLACES[p.id];
  // further out the Custody is far from home, and whoever holds the system comes at you from ahead
  const R = regionDef(j.chart, regionOf(s)) ?? regionsOf(j.chart)[0]!, raid = raided(j.chart, s.id);
  // a breather is quiet unless the Net has reached it: a blockade is not a rest
  const quiet = !!s.quiet && !net;
  const ahead = (net ? t.gutter * 0.5 : t.gutter) * R.ahead + (raid ? RAID_AHEAD : 0);
  return {
    system: s.id, region: tierOf(j.chart, regionOf(s)), name: s.name, kind: s.kind, dest: j.dest ? sysById(j.chart, j.dest).name : 'nowhere', jumpCost: route?.cyrite ?? JUMP_COST, lane: s.lane,
    port: s.port ? { name: s.port.name, prices: pricesAt(j.chart, s.id)! } : null,
    heat: Math.min(0.6, t.heat + (net ? 0.25 : 0)), heatRate: t.heatRate * (net ? 1.3 : R.heatRate),
    rich: t.rich * (0.6 + s.cyrite * 0.8), density: t.density, gutter: Math.min(0.8, ahead + notice.gutter), calls: t.calls, quiet,
    ahead: raid ? undefined : AHEAD[s.holder], thren: threnAt(j.chart, s.id), here: presence(j.chart, s.id),
    blockade: net, netted: net, calloway: finale || quiet ? Infinity : until <= 0 ? WAITING : until * DAY, behind: behind(j.hunt, j.trail), home: false, notice,
    place: pd ? { name: pd.name, text: pd.text, plays: pd.plays } : null,
    nemesis: nemesis(j.calloway, j.hunt, { finale, offer: quiet ? null : offer }),
    story: quiet ? null : dueBeat(j),
  };
}

/** The lanes on offer from here, with what each costs and what is known at the other end. */
export function options(j: Journey) {
  // never back to Cerro (the yards are the Continuance's), nor back through a gate
  return lanesFrom(j.chart, j.at).filter(({ to }) => onward(j, to)).map(({ to, route }) => ({
    to, route, food: route.days * RATION, netted: j.chart.seenNet.includes(to.id),
    /** Calloway was last seen there (as far as you know). */
    shadow: j.trail[j.hunt.seenIdx] === to.id,
    /** The place there, as far as you know. */
    place: placeAt(j.chart, to.id),
  }));
}

/** A lane you may take from here: not to Cerro, and never back through a gate (from one, only on into the region beyond). */
function onward(j: Journey, to: StarSystem): boolean {
  if (to.kind === 'home') return false;
  const s = here(j);
  return s.kind === 'gate' ? regionOf(to) > regionOf(s) : regionOf(to) >= regionOf(s);
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
  const fell = spreadNet(j.chart, days, rng(j));
  // the Thren follow the Cyrite: in a lane, to where it is going (the Wayward is already set down there)
  const at = j.at;
  for (const n of stepScatter(j.chart, days, rng(j), { at, cyrite: j.carry.cyrite, tank: TANK_MAX })) {
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
    case 'cyrite': c.cyrite = Math.min(TANK_MAX, c.cyrite + PLACE_CYRITE); lines.push(`+${PLACE_CYRITE} Cyrite`); break;
    case 'parts': c.parts += PLACE_PARTS; c.krail += PLACE_KRAIL; lines.push(t('+{n} parts · +{k} Krail', { n: PLACE_PARTS, k: PLACE_KRAIL })); break;
    case 'cover': j.hunt.delay += PLACE_COVER; lines.push(t('Calloway loses your trail for a while')); break;
    case 'shortcut': {
      const to = openShortcut(j.chart, from);
      lines.push(to ? t('New lane: {a} to {b}', { a: sysById(j.chart, from).name, b: to.name }) : t('The lane it showed leads nowhere new'));
      break;
    }
    case 'favour': c.chits += PLACE_CHITS; lines.push(t('+{n} chits · favours owed', { n: PLACE_CHITS })); break;
    case 'info': hearNews(j); sightPlaces(j.chart, s.id, 3); lines.push(t('The Net’s edge, and the places three jumps round')); break;
    case 'danger':
      c.parts += PLACE_PARTS; c.krail += PLACE_KRAIL * 2;
      huntOn(j.hunt, j.chart, j.trail, DANGER_DAYS);
      lines.push(t('+{n} parts · +{k} Krail', { n: PLACE_PARTS, k: PLACE_KRAIL * 2 }), t('Word gets out · Calloway gains a day'));
      break;
  }
  note(j, head);
  return lines;
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
  const cyriteIn = j.carry.cyrite;
  j.score += res.run.score;
  // the sortie's own consequences: a held-up hunter, a system that will hold out
  if (res.huntDelay > 0) j.hunt.delay += res.huntDelay;
  else if (res.huntDelay < 0) huntOn(j.hunt, j.chart, j.trail, -res.huntDelay);
  if (res.stall > 0 && !netted(j.chart, s.id)) j.chart.stall[s.id] = (j.chart.stall[s.id] ?? 0) + res.stall;
  else if (res.stall < 0) pushNet(j.chart, s.id, -res.stall);
  if (res.calloway) j.hunt.caught++;
  if (res.callowayBeaten) { j.hunt.beaten++; j.hunt.delay += BEATEN_DELAY; lines.push(t('Calloway’s ship is crippled · {n} days of repairs', { n: BEATEN_DELAY })); }
  // the system's place, dealt with: it pays now, and any new lane opens from where you go next
  if (res.place) lines.push(...claim(j, s, res.carry, res.ended === 'jumped' && j.dest ? j.dest : s.id));
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
    system: s.id, name: s.name, day: Math.round(j.day * 10) / 10, cyriteIn, cyriteOut: res.carry.cyrite, time: Math.round(res.time), ended: res.ended,
    cards: res.run.cards.length, kills: res.run.kills, calloway: res.calloway, score: res.run.score,
  };
  j.legs.push(leg);

  if (res.ended === 'destroyed') {
    j.wrecks++;
    if (j.hardcore || j.wrecks >= WRECKS || res.calloway) {
      j.status = 'over';
      j.end = res.calloway ? 'captured' : 'wrecked';
      j.carry = res.carry;
      note(j, t(res.calloway ? 'Taken by Calloway in {name}' : 'The Wayward breaks up in {name}', { name: s.name }));
      return { kind: j.end, lines: [t(res.calloway ? 'Calloway’s boarders cut through the airlock.' : 'The Wayward is beyond saving.')] };
    }
    // adrift: you patch her enough to fly, and the hold is gone
    const c = res.carry;
    j.carry = { ...c, ore: 0, parts: Math.floor(c.parts / 2), cyrite: Math.floor(c.cyrite / 2), chits: Math.floor(c.chits / 2), plates: 2 };
    pass(j, ADRIFT);
    note(j, t('Wrecked in {name} · adrift a day', { name: s.name }));
    lines.push(t('The hull went. She flies again, a day later.'), t('Hold lost, and half your Cyrite, parts and chits.'), t('{n} more and she won’t fly again.', { n: WRECKS - j.wrecks }));
    j.status = 'sortie';
    return { kind: 'adrift', lines };
  }

  // jumped: the lane takes days, food and parts
  const to = j.dest!;
  const route = routeBetween(j.chart, s.id, to);
  const days = route?.days ?? 1;
  const c = { ...res.carry };
  const eat = days * RATION;
  let penalty = 0;
  if (c.food >= eat) { c.food -= eat; j.hungry = 0; }
  else { c.food = 0; j.hungry++; penalty++; lines.push(t('Out of food in the lane · a plate down')); }
  if (c.parts >= WEAR) c.parts -= WEAR;
  else { c.parts = 0; penalty++; lines.push(t('No parts for the drive · a plate down')); }
  c.plates = Math.max(1, c.plates - penalty);
  j.carry = c;
  j.at = to;
  j.dest = null;
  j.trail.push(to);
  // she crosses after you: the lane's days count on her trail too
  fell.push(...pass(j, days, lines));
  arrive(j.chart, to, j.day);
  if (news) {
    hearNews(j);
    lines.push(t('Your news: the Net’s edge and the Prefect’s last port'));
  } else sight(j, false);
  leg.cyriteOut = c.cyrite;
  const there = sysById(j.chart, to);
  note(j, t('Jumped to {name}', { name: there.name }));
  for (const id of fell) if (j.chart.seenNet.includes(id)) lines.push(t('The Net has taken {name}', { name: sysById(j.chart, id).name }));
  const place = placeAt(j.chart, to);
  if (place && there.kind !== 'edge') lines.push(`${t('{name} here', { name: t(PLACES[place.id].name) })} · ${t(PLACES[place.id].blurb)}`);
  // through a gate: a new region
  if (there.kind === 'gate') { const R = regionDef(j.chart, viewOf(j.chart, to)); if (R) { lines.unshift(`${t(R.name)} · ${t(R.blurb)}`); note(j, t('Through {gate} into {region}', { gate: there.name, region: t(R.name) })); } }
  // a new act: out of Cerro, the Run; into the Hollows, the Choice
  const turn = j.trail.length === 2 ? ACTS[1] : there.kind === 'gate' && tierOf(j.chart, viewOf(j.chart, to)) === CHOICE_REGION && tierOf(j.chart, regionOf(there)) < CHOICE_REGION ? ACTS[2] : null;
  if (turn) { lines.unshift(actLine(turn)); note(j, actLine(turn)); }
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
  // with every system flown she reads your route a little better, unless the echoes left behind make it lie
  const echo = effects(c.levels).echo;
  if (echo > 0) { j.hunt.delay += ECHO_DELAY * echo; lines.push(t('A ghost echo lays a false trail behind you')); }
  j.hunt.hunch = echo >= ECHO_BLIND ? undefined : hunchOf(j.chart, j.trail);
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
  for (const k of ['cyrite', 'krail', 'ore', 'parts', 'chits', 'food'] as const) c[k] = Math.max(0, c[k] + after[k] - before[k]);
  const diff = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));
  c.flags = [...diff(c.flags, diff(before.flags, after.flags)), ...diff(diff(after.flags, before.flags), c.flags)];
  c.seen = [...c.seen, ...diff(diff(after.seen, before.seen), c.seen)];
  for (const k of Object.keys(after.standing) as Array<keyof Carry['standing']>) {
    const d = (after.standing[k] ?? 0) - (before.standing[k] ?? 0);
    if (d) c.standing[k] = (c.standing[k] ?? 0) + d;
  }
  const key = (x: Carry['jobs'][number]) => JSON.stringify(x);
  const had = new Set(before.jobs.map(key)), has = new Set(after.jobs.map(key));
  c.jobs = [...c.jobs.filter((x) => !had.has(key(x)) || has.has(key(x))), ...after.jobs.filter((x) => !had.has(key(x)) && !c.jobs.some((y) => key(y) === key(x)))];
}

/** The stocks and the day, taken at the start of a sortie, to show what it changed. */
export interface Tally { cyrite: number; krail: number; plates: number; parts: number; food: number; chits: number; day: number }
export const tally = (j: Journey): Tally => ({
  cyrite: j.carry.cyrite, krail: j.carry.krail, plates: j.carry.plates, parts: j.carry.parts, food: j.carry.food, chits: j.carry.chits, day: j.day,
});

/** One change for the debrief strip: what moved, and by how much (days are tenths). */
export interface Chip { key: keyof Tally; d: number }

/** What a sortie changed, for the chart's strip: each stock that moved, then the days. Nothing that stayed the same. */
export function debrief(was: Tally, j: Journey): Chip[] {
  const now = tally(j), out: Chip[] = [];
  for (const key of ['cyrite', 'krail', 'plates', 'parts', 'food', 'chits'] as const) {
    const d = Math.round(now[key] - was[key]);
    if (d) out.push({ key, d });
  }
  const d = Math.round((now.day - was.day) * 10) / 10;
  if (d) out.push({ key: 'day', d });
  return out;
}

/** Jumps from here to the Threshold by the shortest way. */
export const toEdge = (j: Journey) => jumps(j.chart, j.at, j.chart.edge);
