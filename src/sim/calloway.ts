import { t } from '../i18n';
import {
  ARCHIVE_BASE, ARCHIVE_TRUST, BROKEN, CALLOWAY_FACE, CALLOWAY_HP, HABIT, HP_BEATEN, HUNCH_LINES, KEPT, OFFER_FLOWN, OFFER_GAP, OFFER_NEAR, READ_AT, STRAIGHT,
  TOLD, TRICKS, TRICK_WORDS, WING_RUNS, type Trick,
} from '../content/calloway';
import type { SystemKind } from '../content/systems';
import { jumps, sysById, type Chart } from './chart';
import { CARD_BY_ID, type CardDef, type ChoiceDef } from './comms';
import type { RunStats } from './run';

// ── Calloway's file ───────────────────────────────────────────────────────
// sim/hunt.ts is where she is; this is what she knows. Across the journey
// she keeps a file on the Wayward, and the file changes how she comes:
//
//   tricks  · every way you have got away from her (a false heading, the
//             stores dumped, going dark, a false flight plan...) is counted, won
//             or lost, and each one she has seen works less well the next
//             time (content/calloway.ts LEARN off its odds). Running from
//             her brings a bigger wing; beating her ship, a heavier one.
//   habits  · once you have flown a few systems she reads your route: the
//             kind of system you stop in, and whether you run straight for
//             the Threshold. Where you are predictable she does not stop to
//             ask questions (sim/hunt.ts), so she gains on you there.
//   cares   · what your answers to everyone else say about you: people,
//             profit, or the guns. Her offers are chosen from it, from what
//             you have told her, and from who you know.
//   trust   · the truth told her and offers taken, less the lies and any
//             word broken. It decides whether she can be reached at the end.
//   the end · when you plot the last jump, to the Threshold, she is waiting
//             at the lane mouth. That meeting is built from the file: what
//             she says, the ship she brings, and which ways past her exist.

/** Her read on your route: the kind of system you stop in, and whether you go straight for the Threshold. */
export interface Hunch {
  kind: SystemKind | null;
  straight: boolean;
}

/** How the last meeting ended, if you got past her. */
export type Ending = 'turned' | 'yielded' | 'bluffed' | 'dark' | 'beaten' | 'slipped';

export interface Dossier {
  /** Every trick she has seen, counted. */
  tricks: Partial<Record<Trick, number>>;
  /** What your answers to everyone else say you care about. */
  cares: { people: number; profit: number; fight: number };
  /** Times you told her the truth or met her halfway. */
  told: number;
  /** Offers she has made, and the ones you took. */
  offers: string[];
  took: string[];
  /** The day of her last offer (null: none yet). */
  lastOffer: number | null;
  /** Your word, given on her truce and not yet broken; and words broken. */
  promise: boolean;
  broken: number;
  ending: Ending | null;
}

/** What a sortie knows of her: the tricks she is wise to, her ship, her read on you, an offer to make, and the last meeting. */
export interface Nemesis {
  wise: Partial<Record<Trick, number>>;
  /** Her ship's hull, and extra hulls in her wing. */
  hp: number;
  wing: number;
  /** Her read on your route, for the cards' `hunch` lines: a system kind, and 'straight'. */
  hunch: string[];
  /** The offer she calls with (an id in content/calloway.ts OFFERS), if she has one this sortie. */
  offer: string | null;
  /** The last meeting, at the lane mouth to the Threshold. */
  finale: CardDef | null;
}

export const NO_NEMESIS: Nemesis = { wise: {}, hp: CALLOWAY_HP, wing: 0, hunch: [], offer: null, finale: null };

export function newDossier(): Dossier {
  return { tricks: {}, cares: { people: 0, profit: 0, fight: 0 }, told: 0, offers: [], took: [], lastOffer: null, promise: false, broken: 0, ending: null };
}

const uses = (d: Dossier, t: Trick) => d.tricks[t] ?? 0;
/** Lies she has caught you in or been told: false headings and the file bluff. */
export const lies = (d: Dossier) => uses(d, 'lie') + uses(d, 'bluff');
/** The truth and kept bargains, less lies and broken words. */
export const trust = (d: Dossier) => d.told + KEPT * d.took.length - lies(d) - BROKEN * d.broken;

/** What you care about most, by your answers (null: nothing yet). */
export function care(d: Dossier): keyof Dossier['cares'] | null {
  let best: keyof Dossier['cares'] | null = null, v = 0;
  for (const k of ['people', 'profit', 'fight'] as const) if (d.cares[k] > v) { v = d.cares[k]; best = k; }
  return best;
}

/** Her read on your route from the trail: a habit once READ_AT systems are flown. */
export function hunchOf(c: Chart, trail: readonly string[]): Hunch {
  const flown = trail.slice(1).map((id) => sysById(c, id)).filter((s) => s.kind !== 'edge' && s.kind !== 'home');
  if (flown.length < READ_AT) return { kind: null, straight: false };
  const count = new Map<SystemKind, number>();
  for (const s of flown) count.set(s.kind, (count.get(s.kind) ?? 0) + 1);
  let kind: SystemKind | null = null, n = 0;
  for (const [k, v] of count) if (v > n) { n = v; kind = k; }
  if (n < 2 || n / flown.length < HABIT) kind = null;
  let straight = 0;
  for (let i = 0; i < trail.length - 1; i++) if (jumps(c, trail[i]!, c.edge) - jumps(c, trail[i + 1]!, c.edge) === 1) straight++;
  return { kind, straight: straight / (trail.length - 1) >= STRAIGHT };
}

const hunchWords = (h: Hunch | undefined): string[] => [...(h?.kind ? [h.kind] : []), ...(h?.straight ? ['straight'] : [])];

/** One answered card, as the run keeps it. */
type Answer = RunStats['cards'][number];

/**
 * Fold a sortie into her file: the tricks used on her, the truths told, the
 * offers made and taken, what your other answers say about you, and whether
 * you kept your word (`killedHers`: the sortie broke Custody or Office hulls).
 * Returns the log lines.
 */
export function study(d: Dossier, cards: readonly Answer[], killedHers: boolean, day: number): string[] {
  const lines: string[] = [];
  if (d.promise && killedHers) {
    d.promise = false;
    d.broken++;
    lines.push(t('You broke your word to Calloway · she will remember it'));
  }
  for (const a of cards) {
    const key = `${a.id}:${a.choice}`;
    const t = TRICKS[key];
    if (t) d.tricks[t] = uses(d, t) + 1;
    if (TOLD.has(key)) d.told++;
    if (a.id.startsWith('offer_')) {
      if (!d.offers.includes(a.id)) d.offers.push(a.id);
      d.lastOffer = day;
      if (a.choice === 'accept') {
        d.took.push(a.id);
        if (a.id === 'offer_truce') d.promise = true;
      }
      continue;
    }
    if (a.id.startsWith('calloway')) continue;
    const tone = CARD_BY_ID[a.id]?.choices.find((c) => c.id === a.choice)?.tone;
    if (tone === 'help') d.cares.people++;
    else if (tone === 'trade') d.cares.profit++;
    else if (tone === 'fight') d.cares.fight++;
  }
  return lines;
}

/** How the last meeting ended, from the answer given there and whether her ship was beaten. Null if she was not met there. */
export function ending(cards: readonly Answer[], beaten: boolean): Ending | null {
  const a = cards.find((x) => x.id === 'calloway_last');
  if (!a) return null;
  if (a.won && a.choice === 'archive') return 'turned';
  if (a.won && a.choice === 'remind') return 'yielded';
  if (a.won && a.choice === 'owe') return 'turned';
  if (a.won && a.choice === 'bluff') return 'bluffed';
  if (a.won && a.choice === 'dark') return 'dark';
  return beaten ? 'beaten' : 'slipped';
}

export const ENDING_LINES: Record<Ending, string> = {
  turned: 'Calloway read the archive at the Threshold, and stood her ship aside',
  yielded: 'Calloway held her fire at the Threshold · the Patience could not take another beating',
  bluffed: 'Calloway let you through the Threshold to find out if the file was out',
  dark: 'You drifted through the Threshold under Calloway’s guns, dark',
  beaten: 'You broke the Patience at the Threshold',
  slipped: 'You spooled out of the Threshold with the Patience firing',
};

/** The offer she would make now, if any: what you told her first, then who you know, then what you care about. `flown`: systems flown since Cerro. */
export function offerFor(d: Dossier, o: { day: number; behind: number; caught: number; flown: number; flags: readonly string[]; hurt?: boolean; netted?: boolean }): string | null {
  if (o.flown < OFFER_FLOWN || (o.caught < 1 && o.behind > OFFER_NEAR)) return null;
  if (d.lastOffer !== null && o.day < d.lastOffer + OFFER_GAP) return null;
  const c = care(d);
  const want: Array<[string, boolean]> = [
    ['offer_meet', d.told > 0],
    // a hull in a bad way, and what you have seen of the unknown, are things she notices first
    ['offer_shelter', !!o.hurt],
    ['offer_info', o.flags.some((f) => f === 'saw_thren' || f === 'saw_voice' || f === 'saw_object')],
    ['offer_name', o.flags.includes('gutter_friend')],
    ['offer_passage', !!o.netted || o.flown >= 6],
    ['offer_truce', c === 'fight'],
    ['offer_tank', c === 'profit'],
    ['offer_identity', o.flown >= 9],
    ['offer_home', true],
  ];
  return want.find(([id, ok]) => ok && !d.offers.includes(id))?.[0] ?? null;
}

/** What a sortie knows of her. `finale`: this sortie ends at the Threshold's lane mouth. */
export function nemesis(d: Dossier, hunt: { caught: number; beaten: number; hunch?: Hunch }, o: { finale: boolean; offer: string | null; flags?: readonly string[] }): Nemesis {
  const hunch = hunchWords(hunt.hunch);
  return {
    wise: { ...d.tricks },
    hp: Math.round(CALLOWAY_HP * (1 + HP_BEATEN * hunt.beaten) * 100) / 100,
    wing: Math.min(3, Math.floor(uses(d, 'run') / WING_RUNS)),
    hunch,
    offer: o.finale ? null : o.offer,
    finale: o.finale ? finaleCard(d, hunt, o.flags) : null,
  };
}

const times = (n: number) => (n === 1 ? t('once') : n === 2 ? t('twice') : t('{n} times', { n }));

/** The last meeting: at the lane mouth to the Threshold, built from everything between you. */
export function finaleCard(d: Dossier, hunt: { caught: number; beaten: number; hunch?: Hunch }, flags: readonly string[] = []): CardDef {
  const has = (f: string) => flags.includes(f);
  const turned = has('calloway_turned'), hostile = has('calloway_hostile'), fleet = has('draper_director');
  const trusted = trust(d), lied = lies(d), runs = uses(d, 'run');
  const wing = Math.min(3, Math.floor(runs / WING_RUNS));
  const said: string[] = [t(hunt.caught === 0
    ? '“We’ve never spoken face to face, Juno. I thought we should, once.”'
    : '“I didn’t follow you here, Juno. I knew where you had to come.”')];
  for (const h of hunchWords(hunt.hunch)) if (HUNCH_LINES[h]) said.push(t(HUNCH_LINES[h]!));
  if (d.broken) said.push(t('“You gave me your word, and you broke it.”'));
  else if (d.took.length) said.push(t('“You took what I offered, and I kept my word.”'));
  if (lied >= 2) said.push(t('“You lied to me {n} times. I counted.”', { n: lied }));
  else if (lied === 1) said.push(t('“You lied to me once. I noticed.”'));
  if (d.took.includes('offer_identity')) said.push(t('“I gave you a name, Juno. You owe me an answer.”'));
  if (d.told && trusted > 0) said.push(t('“You told me the truth when it cost you. I remember.”'));
  if (hunt.beaten) said.push(t('The Patience was rebuilt {times}, heavier each time.', { times: times(hunt.beaten) }));
  if (wing) said.push(t('An interdictor flies with her. You ran too often.'));
  if (turned) said.push(t('“I read my father’s hand twice. My guns are cold.”'));
  else if (hostile) said.push(t('“You fired on my cutter. I have not forgotten.”'));
  if (fleet) said.push(t('Draper’s tender holds behind her, with the Offices’ fleet.'));
  said.push(t('“The Threshold is behind me. Power down.”'));

  const fight = { text: 'Weapons hot on the Patience, one last time', calloway: 'fight' as const, blockade: 'pass' as const };
  const choices: ChoiceDef[] = [
    {
      id: 'fight', label: 'Fight her', tone: 'fight',
      hint: [t('The Patience'), hunt.beaten ? t('beaten {times}, refitted', { times: times(hunt.beaten) }) : '', wing ? t('{n} more in her wing', { n: wing }) : ''].filter(Boolean).join(', ') + '.',
      win: fight,
    },
    {
      id: 'run', label: 'Spool under her guns', tone: 'run', hint: 'Her field slows the drive and the whole system comes. Survive the spool and you’re through.',
      win: { text: 'Spooling · the Patience is on you', calloway: 'run', blockade: 'pass' },
    },
  ];
  if (turned) {
    choices.push({
      id: 'stand', label: 'Thank her and go', tone: 'help', hint: 'She has stood her guns down. Draper’s fleet has not.',
      win: { text: 'The Patience stands aside · you spool out', blockade: 'pass', score: 4000 },
    });
  }
  if (d.told > 0) {
    choices.push({
      id: 'archive', label: 'Show her the archive', tone: 'help',
      hint: trusted > 1 ? 'She has listened before. She might now.' : trusted > 0 ? 'She might read it. She might not.' : 'Too many lies between you. She may not buy it.',
      odds: { base: ARCHIVE_BASE + ARCHIVE_TRUST * trusted },
      win: { text: 'She reads it all the way through. Then the Patience stands aside.', blockade: 'pass', score: 5000 },
      lose: { text: '“It changes nothing.” · weapons hot', calloway: 'fight', blockade: 'pass' },
    });
  }
  if (d.took.includes('offer_identity')) {
    choices.push({
      id: 'owe', label: 'Pay what you owe', tone: 'help', hint: 'You took her name. Answer her one question, and she may stand aside.',
      odds: { base: 0.55 + ARCHIVE_TRUST * Math.max(0, trusted) },
      win: { text: 'You answer. She stands aside.', blockade: 'pass', score: 3000 },
      lose: { text: '“That is not an answer.” · weapons hot', calloway: 'fight', blockade: 'pass' },
    });
  }
  if (hunt.beaten >= 2) {
    choices.push({
      id: 'remind', label: 'Remind her how it went', tone: 'bluff', hint: t('You’ve broken her ship {times}. Her crew know it.', { times: times(hunt.beaten) }),
      odds: { base: 0.2 + 0.15 * hunt.beaten },
      win: { text: 'Her crew will not fight you again · she holds her fire', blockade: 'pass', score: 2500 },
      lose: { text: '“Once more, then.” · weapons hot', calloway: 'fight', blockade: 'pass' },
    });
  }
  if (uses(d, 'bluff')) {
    choices.push({
      id: 'bluff', label: 'Tell her the file is already out', tone: 'bluff', hint: t('She’s heard it {times}.', { times: times(uses(d, 'bluff')) }),
      odds: { base: 0.5, learn: 'bluff' },
      win: { text: '“If that is true, there is nothing left to stop.” · she lets you go to find out', blockade: 'pass' },
      lose: { text: '“Not again, Juno.” · weapons hot', calloway: 'fight', blockade: 'pass' },
    });
  }
  if (uses(d, 'dark')) {
    choices.push({
      id: 'dark', label: 'Go dark in the lane’s shadow', tone: 'bluff', hint: t('You’ve done it {times}. Her sweep is tuned for it.', { times: times(uses(d, 'dark')) }),
      needs: { fitted: ['ut_scanner', 'tech_office'] }, odds: { base: 0.6, heat: -0.2, learn: 'dark' },
      win: { text: 'Dark · you drift into the lane and spool cold', blockade: 'pass' },
      lose: { text: 'Her sweep finds you at once · weapons hot', calloway: 'fight', blockade: 'pass' },
    });
  }
  const known = (Object.keys(d.tricks) as Trick[]).filter((k) => uses(d, k) > 0).map((k) => t(TRICK_WORDS[k]));
  return {
    id: 'calloway_last', kind: 'warning', caller: 'calloway', trigger: 'follow',
    from: 'Governor Idris Calloway · CCV Patience', title: 'The Threshold',
    text: said.join(' '), face: CALLOWAY_FACE, scars: Math.min(3, hunt.beaten),
    ships: [{ variant: 'lancer', n: turned ? 0 : 1 }, { variant: 'enforcer', n: (turned ? 0 : 2) + wing + (hostile ? 1 : 0) + (fleet ? 2 : 0) }].filter((x) => x.n > 0),
    cargo: `${t('Offices of Peace cutter')} · ${t('met {times}', { times: times(Math.max(1, hunt.caught)) })}`,
    truths: [{ id: 'file', weight: 1, read: known.length ? t('Her file on you: {list}', { list: known.join(', ') }) : 'Her file on you is thin · she has never seen you run' }],
    choices,
  };
}

/** Her file, in lines for the chart. */
export function fileLines(d: Dossier, hunch?: Hunch): string[] {
  const out: string[] = [];
  const known = (Object.keys(d.tricks) as Trick[]).filter((k) => uses(d, k) > 0);
  if (known.length) out.push(t('Wise to {list}', { list: known.map((k) => `${t(TRICK_WORDS[k])}${uses(d, k) > 1 ? ` (${uses(d, k)})` : ''}`).join(', ') }));
  const h = hunchWords(hunch);
  if (h.length) out.push(t('Reads your route: {list}', { list: h.map((x) => t(x === 'straight' ? 'straight for the Threshold' : x === 'port' ? 'you stop at ports' : x === 'mining' ? 'you stop at mining systems' : x === 'transit' ? 'you stop at transit systems' : x === 'contested' ? 'you stop at contested systems' : 'you stop at gate systems')).join(', ') }));
  if (d.broken) out.push(t('You broke your word to her'));
  else if (d.promise) out.push(t('Your word given: no Custody or Office kills'));
  return out;
}
