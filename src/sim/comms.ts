import { LEARN } from '../content/calloway';
import { t } from '../i18n';
import { CARDS, FLAGS } from '../content/cards';
import type { Tier } from '../content/factions';
import type { SystemKind } from '../content/systems';
import { MODULE_BY_ID } from '../content/modules';
import { UPGRADES } from '../content/upgrades';
import type { Levels } from './build';
import { countedBy, effects, hasFitted, systemMarks } from './modules';
import type { Face } from './captains';
import { ALIEN_TYPES, VARIANTS, type Faction } from './enemies';
import { atLeast, type CaptainCall } from './notice';
import { gains } from './gains';
import type { Rng } from './rng';

// ── the comms card ────────────────────────────────────────────────────────
// The game's main interaction: someone opens a channel, and the world waits
// while you decide. A card is a row in content/cards.ts: who is calling, what
// they say (with slots and lines that change with your state), what is
// really going on (a hidden truth, rolled when the card opens), and two to
// five choices. This module is the headless half: which card comes, what the
// read shows, which choices are earned, and what an answer does. The world
// applies the outcome; the panel draws the view; the pilot answers through
// the same calls.
//
//   the read     · their strength against yours, their cargo, and an
//                  estimate of their intent, right as often as your sensors
//                  are good (the estimate is a guess at the hidden truth).
//   earned       · a choice that needs a system, a standing or a flag is shown
//                  greyed out with what it needs, so the player sees what a
//                  build would open.
//   gambles      · a choice can lose: to the truth (a distress call that was
//                  bait) or to the odds (a bluff), and the odds move with
//                  heat, flags, standing and fitted systems.

export type CardKind = 'trade' | 'plea' | 'job' | 'warning' | 'shakedown' | 'checkpoint' | 'distress' | 'rumour' | 'captain' | 'offer';
/** What kind of answer a choice is, for the pilot's policies and the report. */
export type Tone = 'fight' | 'run' | 'pay' | 'bluff' | 'trade' | 'help' | 'refuse';
/** Who you can stand well or badly with. */
export type Standing = 'custody' | 'gutter' | 'frontier' | 'guild' | 'kellern' | 'miners';
/** Who is on the channel, for the colour of the card. */
export type Caller = Standing | 'office' | 'calloway' | 'captain' | 'unknown';
/** How a card comes: by chance, only as a follow-up, on the port's approach, at a blockaded lane mouth, at an open one, with Calloway, as her offer (from her file), or as a story beat (sim/story.ts). */
export type Trigger = 'chance' | 'follow' | 'port' | 'lane' | 'toll' | 'hunt' | 'offer' | 'story' | 'scene';
/** How much a transmission weighs (sim/desk.ts): what it may interrupt, and how it is shown. */
export type Weight = 'major' | 'important' | 'routine' | 'ambient';
/** Where the ship is: open space, the port's approach, the lane mouth. */
export type Place = 'open' | 'port' | 'lane';

/** What a card can see of the ship and the run. */
export interface Ctx {
  t: number;
  heat: number;
  cyrite: number;
  /** Cyrite the jump needs, and what the tank holds. */
  need: number;
  tank: number;
  chits: number;
  plates: number;
  maxPlates: number;
  levels: Levels;
  flags: ReadonlySet<string>;
  standing: Readonly<Partial<Record<Standing, number>>>;
  place: Place;
  /** Hostile hulls within reach. */
  hostiles: number;
  /** Supplies aboard. */
  supplies: number;
  /** The system: its kind, and whether the Net holds it. */
  kind: SystemKind;
  netted: boolean;
  /** Jumps Calloway is behind (Infinity before she has the trail). */
  behind: number;
  /** Each faction's notice tier, the fee multipliers it brings, and the named captain in the system (sim/notice.ts). */
  notice?: Partial<Record<Faction, Tier>>;
  toll?: Partial<Record<Faction, number>>;
  captain?: CaptainCall | null;
  /** Calloway's file (sim/calloway.ts): times she has seen each trick, and her read on your route. */
  wise?: Readonly<Partial<Record<string, number>>>;
  hunch?: readonly string[];
  /** Who else is in the system (sim/scatter.ts): 'drift', 'holdfast', 'raid', 'voice', 'thren'. */
  here?: readonly string[];
}

/** A condition on the ship and the run. Every field given must hold. */
export interface Cond {
  /** Not before this many seconds into the run. */
  after?: number;
  heatMin?: number;
  heatMax?: number;
  /** At least this much in the tank, the purse. */
  cyrite?: number;
  chits?: number;
  /** The tank is short of the jump. */
  short?: boolean;
  /** A plate is missing. */
  hurt?: boolean;
  /** Every flag set, none of these set. */
  flag?: string | string[];
  noFlag?: string | string[];
  /** Any of these systems fitted. */
  fitted?: string | string[];
  standing?: [Standing, number];
  place?: Place;
  /** Hostiles about (true) or a clear sky (false). */
  hostiles?: boolean;
  /** The ship has less than this much in supplies. */
  hungry?: number;
  /** The system is one of these kinds. */
  kind?: SystemKind | SystemKind[];
  /** The Net holds the system (true) or not (false). */
  netted?: boolean;
  /** Calloway is at most this many jumps behind. */
  hunted?: number;
  /** The faction's notice is at least this tier. */
  notice?: [Faction, Tier];
  /** Calloway has seen this trick at least so many times. */
  wise?: [string, number];
  /** Calloway's read on your route says this: a system kind, or 'straight'. */
  hunch?: string;
  /** Someone is in the system (sim/scatter.ts presence): a Drift fleet, a Holdfast, a raid, the Voice, the Thren. */
  here?: string;
}

/** A number, or a token read off the ship: the card's fee, all of it, half of it. */
export type Amount = number | 'fee' | '-fee' | '-all' | '-half';

export interface Spawn { variant: string; n: number; from?: 'ahead' | 'behind' | 'around' }

/** A job: carry something somewhere, and be paid on arrival. */
export interface JobDef {
  id: string;
  /** The objective line. */
  text: string;
  /** Paid at the port (on docking) or at the lane mouth (on the jump). */
  at: 'port' | 'lane';
  /** What has to be handed over there. */
  give?: { supplies?: number };
  pay: Outcome;
}

/** What an answer does. Amounts are deltas; heat is the Custody's attention. */
export interface Outcome {
  /** The log line. */
  text: string;
  cyrite?: Amount;
  chits?: Amount;
  supplies?: Amount;
  /** Chits for the bay (Story), from wrecks and finds: Krail in the Arcade's old words, one purse now. Kept as the name the content uses. */
  krail?: number;
  plates?: number;
  heat?: number;
  score?: number;
  flag?: string | string[];
  unflag?: string | string[];
  standing?: Partial<Record<Standing, number>>;
  /** Hulls that turn up now. */
  spawn?: Spawn[];
  /** The hulls the card brought in break off. */
  dismiss?: boolean;
  /** The lane mouth: fight her, run past her, or be let through. */
  blockade?: 'fight' | 'run' | 'pass';
  /** Another card, this many seconds on. */
  follow?: { card: string; after: number };
  job?: JobDef;
  /** A job given up. */
  drop?: string;
  /** Seconds of veined rock all round (a seam found). */
  seam?: number;
  /** Days of delay for Calloway (a false trail, a lie she has to check). */
  hunt?: number;
  /** Seconds the Thren hold off before they swarm again (Cyrite vented for them). */
  calm?: number;
  /** Days this system holds the Net out (a settlement helped, a relay broken); negative, days the Net gains here (a relay left to finish). */
  stall?: number;
  /** Calloway's ship: she comes for a fight, or you run with her on your tail. */
  calloway?: 'fight' | 'run';
  /** Notice moved, by faction (a bribe that buries a report, a broadcast that makes one). */
  notice?: Partial<Record<Faction, number>>;
  /** A named captain's card (sim/captains.ts): fight, run past, pay off, or see them leave. */
  captain?: 'fight' | 'run' | 'pay' | 'leave';
}

/** What a choice asks to be possible. What it costs is in `cost`, and counts too. */
export interface Need {
  fitted?: string | string[];
  flag?: string;
  standing?: [Standing, number];
  cyrite?: number;
  supplies?: number;
}

/** What a choice takes: a number, the card's fee, all of it, or half of it. */
export type Take = number | 'fee' | 'all' | 'half';
/** What a choice takes whatever happens next (the fee is gone whether or not she honours it). */
export interface Cost { chits?: Take; cyrite?: Take; supplies?: Take }

/** The chance a gamble comes off: a base, moved by heat, flags, systems and standing. */
export interface Odds {
  base: number;
  /** Added per unit of heat (usually negative: the more they are looking, the less a lie holds). */
  heat?: number;
  flags?: Record<string, number>;
  fitted?: Record<string, number>;
  standing?: Partial<Record<Standing, number>>;
  /** A trick Calloway learns (content/calloway.ts): LEARN off for every time she has seen it. */
  learn?: string;
}

export interface ChoiceDef {
  id: string;
  label: string;
  tone: Tone;
  /** One line on what it means. */
  hint: string;
  /** Offered only when this holds (otherwise not shown at all). */
  show?: Cond;
  needs?: Need;
  cost?: Cost;
  /** The truth decides: if it is one of these, the choice loses. */
  loseIf?: string[];
  odds?: Odds;
  win: Outcome;
  lose?: Outcome;
}

/** What could really be going on, and how the read describes it. */
export interface Truth {
  id: string;
  weight: number;
  /** The read's line for it. */
  read: string;
  /** More (or less) likely when a condition holds. */
  boost?: { if: Cond; mult: number };
}

export interface CardDef {
  id: string;
  kind: CardKind;
  caller: Caller;
  /** Who is speaking, and the card's title. */
  from: string;
  title: string;
  /** What they say. Slots: {fee} {cyrite} {need} {short} {chits} {supplies}, and {captain} {ship} (also in `from` and `title`). */
  text: string;
  /** Lines added when their condition holds: the same card reads differently with a full hold or a checkpoint ahead. */
  lines?: Array<{ if: Cond; text: string }>;
  /** How it comes: by chance (the default), only as a follow-up, on the port's approach, at the lane mouth (a blockade's, or an open one: a toll), or with Calloway. */
  trigger?: Trigger;
  when?: Cond;
  weight?: number;
  /** More likely when this holds (a Holdfast's plea, in a Holdfast). */
  boost?: { if: Cond; mult: number };
  /** Can come again in a later system (otherwise once a journey). */
  repeat?: boolean;
  /** Its weight, when the default for its kind (see `weightOf`) is not right. */
  tier?: Weight;
  /** Who is on the channel, for the read (no ships: a voice on the radio). */
  ships?: Array<{ variant: string; n: number }>;
  cargo?: string;
  fee?: { base: number; heat?: number; flags?: Record<string, number> };
  truths?: Truth[];
  /** Ambushes and declarations do not wait: the world slows instead of stopping, and after `timeout` seconds of it the default is taken. */
  slow?: { timeout: number; default: string };
  /** A named captain's portrait, and the scars they have picked up since. */
  face?: Face;
  scars?: number;
  /** Applied as the card opens (the ambushers decloak). */
  arrive?: Outcome;
  choices: ChoiceDef[];
}

/** One choice as the panel shows it. */
export interface ChoiceView {
  id: string;
  label: string;
  tone: Tone;
  hint: string;
  /** Can be taken now. */
  ok: boolean;
  /** What it still needs, in words (empty when ok). */
  needs: string[];
  /** What it costs, in words. */
  cost: string[];
  /** The chance it comes off, if it is a gamble on the odds; null if the odds do not decide it. */
  odds: number | null;
  /** It can lose to the truth: the read is the only guide. */
  risky: boolean;
  /** The chance it comes off, all told: the odds, and the read's best guess at the truth; null when nothing is left to chance. */
  chance: number | null;
  /** What it brings if it comes off, in a few words each (sim/gains). */
  gains: string[];
}

export interface Read {
  /** Strength on the same scale: theirs (0 for a voice on the radio) and yours. */
  them: number;
  you: number;
  /** Who is out there, in words. */
  ships: string;
  cargo: string;
  /** The intent estimate (one truth's read line), and how far sensors can be trusted. */
  intent: string;
  sure: number;
  /** The truth the read shows (null: nothing hidden). */
  shown: string | null;
}

/** A card on the table. */
export interface Open {
  def: CardDef;
  /** Its weight: a major card stops the world, the rest ride along as a call. */
  tier: Weight;
  truth: string | null;
  read: Read;
  /** The call, as spoken. */
  text: string;
  /** What the ship's state adds to it, a line each (behind the (i) on the panel). */
  more: string[];
  choices: ChoiceView[];
  fee: number;
  /** Hulls the card brought in. */
  brought: number[];
  /** Seconds of slow motion left before the default is taken; 0 when the world simply waits. */
  slow: number;
}

/** Seconds into a Breakout before the first card, and the gap between chance cards. */
export const COMMS_FIRST = 24;
export const commsGap = (heat: number, rng: Rng) => rng.range(30, 46) + (1 - heat) * 8;
/** Within this distance of the port, its approach calls (once). */
export const PORT_CALL = 150;
/** The world's speed while an ambush or a declaration waits. */
export const SLOW = 0.2;

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

const list = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const fitted = (levels: Levels, ids: string | string[] | undefined) => list(ids).some((id) => hasFitted(levels, id));

export function condOk(c: Cond | undefined, x: Ctx): boolean {
  if (!c) return true;
  if (c.after !== undefined && x.t < c.after) return false;
  if (c.heatMin !== undefined && x.heat < c.heatMin) return false;
  if (c.heatMax !== undefined && x.heat > c.heatMax) return false;
  if (c.cyrite !== undefined && x.cyrite < c.cyrite) return false;
  if (c.chits !== undefined && x.chits < c.chits) return false;
  if (c.short !== undefined && (x.cyrite < x.need) !== c.short) return false;
  if (c.hurt !== undefined && (x.plates < x.maxPlates) !== c.hurt) return false;
  if (!list(c.flag).every((f) => x.flags.has(f))) return false;
  if (list(c.noFlag).some((f) => x.flags.has(f))) return false;
  if (c.fitted !== undefined && !fitted(x.levels, c.fitted)) return false;
  if (c.standing && (x.standing[c.standing[0]] ?? 0) < c.standing[1]) return false;
  if (c.place !== undefined && x.place !== c.place) return false;
  if (c.hostiles !== undefined && (x.hostiles > 0) !== c.hostiles) return false;
  if (c.hungry !== undefined && x.supplies >= c.hungry) return false;
  if (c.kind !== undefined && !list(c.kind).includes(x.kind)) return false;
  if (c.netted !== undefined && x.netted !== c.netted) return false;
  if (c.hunted !== undefined && !(x.behind <= c.hunted)) return false;
  if (c.notice && !atLeast(x.notice?.[c.notice[0]], c.notice[1])) return false;
  if (c.wise && (x.wise?.[c.wise[0]] ?? 0) < c.wise[1]) return false;
  if (c.hunch !== undefined && !x.hunch?.includes(c.hunch)) return false;
  if (c.here !== undefined && !x.here?.includes(c.here)) return false;
  return true;
}

/** The card's fee for this ship, now: a faction that has marked you charges more. */
export function feeFor(def: CardDef, x: Ctx): number {
  const f = def.fee;
  if (!f) return 0;
  let v = f.base + (f.heat ?? 0) * x.heat;
  for (const [flag, m] of Object.entries(f.flags ?? {})) if (x.flags.has(flag)) v *= m;
  v *= x.toll?.[def.caller as Faction] ?? 1;
  return Math.max(1, Math.round(v / 5) * 5);
}

/** What an amount comes to against what is held: a delta. */
export function amount(a: Amount | undefined, held: number, fee: number): number {
  if (a === undefined) return 0;
  if (typeof a === 'number') return a;
  switch (a) {
    case 'fee': return fee;
    case '-fee': return -fee;
    case '-all': return -held;
    case '-half': return -Math.ceil(held / 2);
  }
}

/** How far the read can be trusted: stock sensors guess right about two times in three. */
export function sensors(levels: Levels): number {
  let s = 0.65;
  if ((levels.ut_scanner ?? 0) > 0) s += 0.2;
  if ((levels.tech_office ?? 0) > 0) s += 0.1;
  s += 0.02 * (levels.ut_tactical ?? 0);
  s += effects(levels).sensors;
  return Math.min(0.95, s);
}

/** A hull's weight in a fight, for the read. */
const hullWeight = (variant: string) => {
  const v = VARIANTS[variant];
  return v ? ALIEN_TYPES[v.kind].hp / 2 : 1;
};

/** The ship's weight in a fight, on the same scale: plates, the guns fitted, shields, the Guns system's modules. */
export function yourStrength(levels: Levels, plates: number): number {
  let s = 1 + plates;
  for (const u of UPGRADES) {
    const lv = levels[u.id] ?? 0;
    if (!lv) continue;
    if (u.cat === 'weapons') s += lv * (u.kind === 'system' || u.kind === 'spec' ? 1.2 : 0.5);
    else if (u.branch === 'defence') s += lv * 0.6;
  }
  // the Guns system's modules: heavier mounts, plate, faster loaders
  s += systemMarks(levels).guns * 0.8;
  return Math.round(s * 10) / 10;
}

export function theirStrength(def: Pick<CardDef, 'ships'>): number {
  return Math.round((def.ships ?? []).reduce((a, s) => a + hullWeight(s.variant) * s.n, 0) * 10) / 10;
}

const shipsWords = (def: CardDef) => {
  const s = def.ships ?? [];
  if (!s.length) return 'No ship in range · a voice on the channel';
  return s.map((x) => `${x.n > 1 ? `${x.n} × ` : ''}${VARIANTS[x.variant]?.label ?? x.variant}`).join(' · ');
};

const upgradeName = (id: string) => UPGRADES.find((u) => u.id === id)?.name ?? MODULE_BY_ID[id]?.name ?? id;
const STANDING_WORDS: Record<Standing, string> = {
  custody: 'the Custody', gutter: 'the Gutter', frontier: 'Frontier Supply', guild: 'the Dust Traders', kellern: 'Kellern Mining', miners: 'the miners',
};
export const standingName = (s: Standing) => STANDING_WORDS[s];

/** The chance a choice's odds give, clamped to a gamble (never certain, never hopeless). */
export function oddsFor(o: Odds, x: Ctx): number {
  let p = o.base + (o.heat ?? 0) * x.heat;
  for (const [f, d] of Object.entries(o.flags ?? {})) if (x.flags.has(f)) p += d;
  for (const [id, d] of Object.entries(o.fitted ?? {})) if (hasFitted(x.levels, id)) p += d;
  for (const [s, d] of Object.entries(o.standing ?? {}) as Array<[Standing, number]>) p += d * (x.standing[s] ?? 0);
  if (o.learn) p -= LEARN * (x.wise?.[o.learn] ?? 0);
  return Math.min(0.95, Math.max(0.05, p));
}

const AMOUNT_WORDS: Record<keyof Cost, string> = { chits: 'chits', cyrite: 'Cyrite', supplies: 'supplies' };
const NONE_WORDS: Record<keyof Cost, string> = { chits: 'No chits to give', cyrite: 'No Cyrite to give', supplies: 'No supplies to give' };

const take = (a: Take, held: number, fee: number) => (a === 'fee' ? fee : a === 'all' ? held : a === 'half' ? Math.ceil(held / 2) : a);

/** What a cost comes to, as numbers taken from the ship. */
function costOf(c: Cost | undefined, x: Ctx, fee: number): Record<keyof Cost, number> {
  const held = { chits: x.chits, cyrite: x.cyrite, supplies: x.supplies };
  const out = { chits: 0, cyrite: 0, supplies: 0 };
  for (const k of Object.keys(out) as Array<keyof Cost>) if (c?.[k] !== undefined) out[k] = take(c[k]!, held[k], fee);
  return out;
}

/**
 * What the truth really is, given what the read shows: the truths' weights,
 * and a read that is right as often as the sensors are good (and otherwise
 * names one of the other stories at random).
 */
export function truthOdds(def: CardDef, x: Ctx, shown: string | null, sure: number): Record<string, number> {
  const ts = def.truths ?? [];
  if (!ts.length) return {};
  const prior = ts.map((t) => t.weight * (t.boost && condOk(t.boost.if, x) ? t.boost.mult : 1));
  const n = ts.length;
  const like = ts.map((t) => (shown === null || n === 1 ? 1 : t.id === shown ? sure : (1 - sure) / (n - 1)));
  const w = prior.map((p, i) => p * like[i]!);
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(ts.map((t, i) => [t.id, w[i]! / sum]));
}

export function choiceView(c: ChoiceDef, def: CardDef, x: Ctx, fee: number, read?: Pick<Read, 'shown' | 'sure'>): ChoiceView {
  const needs: string[] = [];
  const n = c.needs;
  if (n) {
    if (n.fitted !== undefined && !fitted(x.levels, n.fitted)) {
      // what would open it: the upgrades it names, and any module that counts as one
      const names = [...new Set([...list(n.fitted).map(upgradeName), ...list(n.fitted).flatMap((id) => countedBy(id).map((m) => m.name))])];
      needs.push(t('Needs {what}', { what: names.map((n) => t(n)).join(t(' or ')) }));
    }
    if (n.flag && !x.flags.has(n.flag)) needs.push(t('Needs {what}', { what: t(FLAGS[n.flag] ?? n.flag) }));
    if (n.standing && (x.standing[n.standing[0]] ?? 0) < n.standing[1]) needs.push(t('Needs standing with {who}', { who: t(standingName(n.standing[0])) }));
    if (n.cyrite !== undefined && x.cyrite < n.cyrite) needs.push(t('Needs {n} Cyrite', { n: n.cyrite }));
    if (n.supplies !== undefined && x.supplies < n.supplies) needs.push(t('Needs {n} supplies', { n: n.supplies }));
  }
  const cost = costOf(c.cost, x, fee);
  const held = { chits: x.chits, cyrite: x.cyrite, supplies: x.supplies };
  const costWords: string[] = [];
  for (const k of Object.keys(cost) as Array<keyof Cost>) {
    if (!c.cost || c.cost[k] === undefined) continue;
    if (cost[k] > held[k]) needs.push(`${t('Needs')} ${cost[k]} ${t(AMOUNT_WORDS[k])}`);
    else if (cost[k] === 0) needs.push(t(NONE_WORDS[k]));
    costWords.push(`−${cost[k]} ${t(AMOUNT_WORDS[k])}`);
  }
  const odds = c.odds ? oddsFor(c.odds, x) : null;
  const risky = !!(c.loseIf?.length && def.truths?.some((t) => c.loseIf!.includes(t.id)));
  let chance = odds;
  if (risky) {
    const p = truthOdds(def, x, read?.shown ?? null, read?.sure ?? sensors(x.levels));
    const safe = 1 - c.loseIf!.reduce((a, id) => a + (p[id] ?? 0), 0);
    chance = (odds ?? 1) * safe;
  }
  return {
    id: c.id, label: c.label, tone: c.tone, hint: c.hint, ok: needs.length === 0, needs, cost: costWords,
    odds, risky, chance, gains: gains(c.win, x, fee, cost),
  };
}

const slotFill = (x: Ctx, slots: Record<string, string> = {}) => {
  const all: Record<string, string> = { captain: x.captain?.name ?? t('the captain'), ship: x.captain?.ship ?? t('their ship'), ...slots };
  return (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => all[k] ?? m);
};

/** Words a card may show at once; the rest of what the ship's state adds waits behind the (i). */
export const SHOWN_WORDS = 24;
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * A card's call: its text, then the lines that hold (what the ship's state
 * adds) for as long as the whole stays within SHOWN_WORDS. The lines after
 * that go to `more`, one tap behind the (i), in order.
 */
export function cardParts(def: CardDef, x: Ctx, fee: number): { text: string; more: string[] } {
  const slots: Record<string, string> = {
    fee: String(fee), cyrite: String(x.cyrite), need: String(x.need), short: String(Math.max(0, x.need - x.cyrite)),
    chits: String(x.chits), supplies: String(x.supplies),
  };
  const fill = slotFill(x, slots);
  let text = fill(t(def.text));
  const more: string[] = [];
  for (const l of (def.lines ?? []).filter((l) => condOk(l.if, x))) {
    const line = fill(t(l.text));
    if (!more.length && wordCount(`${text} ${line}`) <= SHOWN_WORDS) text = `${text} ${line}`;
    else more.push(line);
  }
  return { text, more };
}

function rollTruth(def: CardDef, x: Ctx, rng: Rng): string | null {
  const ts = def.truths;
  if (!ts?.length) return null;
  const w = ts.map((t) => t.weight * (t.boost && condOk(t.boost.if, x) ? t.boost.mult : 1));
  let roll = rng.next() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ts.length; i++) if ((roll -= w[i]!) <= 0) return ts[i]!.id;
  return ts[ts.length - 1]!.id;
}

/** Put a card on the table: roll what is really going on, and take the read. */
export function openCard(def: CardDef, x: Ctx, rng: Rng): Open {
  const truth = rollTruth(def, x, rng);
  const sure = sensors(x.levels);
  let intent = 'Means what they say';
  let shown: string | null = null;
  if (def.truths?.length && truth) {
    // right as often as the sensors are good; otherwise one of the other stories
    shown = truth;
    if (def.truths.length > 1 && rng.next() >= sure) {
      const others = def.truths.filter((t) => t.id !== truth);
      shown = others[rng.int(others.length)]!.id;
    }
    intent = def.truths.find((t) => t.id === shown)!.read;
  }
  // a card that names the captain on your file: the def on the table carries the filled name and title
  if (def.from.includes('{') || def.title.includes('{')) {
    const fill = slotFill(x);
    def = { ...def, from: fill(t(def.from)), title: fill(t(def.title)) };
  }
  const fee = feeFor(def, x);
  const read: Read = { them: theirStrength(def), you: yourStrength(x.levels, x.plates), ships: shipsWords(def), cargo: def.cargo ?? 'Unknown', intent, sure, shown };
  const { text, more } = cardParts(def, x, fee);
  return {
    def, tier: weightOf(def), truth, fee, brought: [], read,
    text, more,
    choices: def.choices.filter((c) => condOk(c.show, x)).map((c) => choiceView(c, def, x, fee, read)),
    slow: def.slow ? def.slow.timeout : 0,
  };
}

/** Re-evaluate the choices against the ship as it is now (a slowed card, or after something changed). */
export function refresh(o: Open, x: Ctx): void {
  o.choices = o.def.choices.filter((c) => condOk(c.show, x)).map((c) => choiceView(c, o.def, x, o.fee, o.read));
}

/** Answer: did it come off, and what follows. Costs are paid either way; the caller applies `cost` and `outcome`. */
export function resolve(o: Open, id: string, x: Ctx, rng: Rng): { choice: ChoiceDef; won: boolean; cost: Record<keyof Cost, number>; outcome: Outcome } | null {
  const c = o.def.choices.find((ch) => ch.id === id);
  const v = o.choices.find((ch) => ch.id === id);
  if (!c || !v || !v.ok) return null;
  let won = true;
  if (c.loseIf && o.truth && c.loseIf.includes(o.truth)) won = false;
  else if (c.odds) won = rng.next() < oddsFor(c.odds, x);
  const outcome = won || !c.lose ? c.win : c.lose;
  return { choice: c, won: won || !c.lose, cost: costOf(c.cost, x, o.fee), outcome };
}

/**
 * How much a card weighs. Anything a story, Calloway, a captain, a blockade or
 * a shakedown brings, and anything with more than three answers, is a major
 * event: the full panel, the world waits. Warnings, pleas, distress calls and
 * follow-ups are important; trades, jobs and rumours are routine. Both of
 * those ride along as a small call while the ship keeps flying. A row can say
 * otherwise with `tier`.
 */
export function weightOf(def: CardDef): Weight {
  if (def.tier) return def.tier;
  if (def.slow || def.face || ['story', 'offer', 'hunt', 'lane', 'toll'].includes(def.trigger ?? '')) return 'major';
  if (['checkpoint', 'shakedown', 'captain', 'offer'].includes(def.kind) || def.choices.length > 3) return 'major';
  if (def.trigger === 'follow' || ['warning', 'plea', 'distress'].includes(def.kind)) return 'important';
  return 'routine';
}

/** The next chance card: one the run has not seen, whose condition holds, by weight. */
export function pickCard(x: Ctx, seen: ReadonlySet<string>, rng: Rng, trigger: Exclude<Trigger, 'follow' | 'offer' | 'story' | 'scene'> = 'chance'): CardDef | null {
  const pool = CARDS.filter((c) => (c.trigger ?? 'chance') === trigger && !seen.has(c.id) && condOk(c.when, x));
  if (!pool.length) return null;
  const w = (c: CardDef) => (c.weight ?? 1) * (c.boost && condOk(c.boost.if, x) ? c.boost.mult : 1);
  let roll = rng.next() * pool.reduce((a, c) => a + w(c), 0);
  for (const c of pool) if ((roll -= w(c)) <= 0) return c;
  return pool[pool.length - 1]!;
}
