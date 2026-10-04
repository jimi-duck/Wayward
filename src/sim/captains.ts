import { CAPTAINS, PERSONALITIES } from '../content/captains';
import { CAPTAIN_HP } from '../content/factions';
import { FACTIONS } from './bosses';
import type { Caller, CardDef, ChoiceDef } from './comms';
import type { Faction } from './enemies';
import type { Rng } from './rng';

// ── named captains ────────────────────────────────────────────────────────
// The capital ships with a name, a face and a memory. Who they are is data
// (content/captains.ts); this module is what they do about you. A captain
// is named when a faction's notice of you reaches its last tier, and
// sim/notice.ts decides when they come (once they have rested after the
// last meeting). They come the way their personality says:
//
//   announce · they open a channel first: a comms card with their face, and
//              choices to fight, to run past, to pay them off (if they deal)
//              or to stare them down (if they can be made to leave).
//   ambush   · they come out of the rock: the same card, slowed, and if you
//              do nothing the guns decide.
//   leave    · a captain with little nerve looks at a ship that outguns
//              them and turns away without a word.
//
// A fight is the faction's existing capital ship (three phases, telegraphs,
// signature attacks) under the captain's name. What came of the meeting is
// remembered, and a captain who lives comes back changed:
//
//   won      · they wrecked you: bolder, a bigger hull, a dearer price, and
//              they will not be stared down.
//   scarred  · you broke their ship and they got off it: a grudge. They
//              ambush from now on, never deal, and bring a heavier ship.
//   escaped  · they left the fight on their own terms: warier, a bigger wing.
//   evaded   · you ran past them: they know the trick, and it works less.
//   bargained· you paid: the price goes up every time.
//   left     · they turned away: they will not do it twice.
//   killed   · they went down with the ship, or have been beaten too many
//              times to come again. The faction's next captain takes over.
//
// The world flies the meeting and reports it (a capital ship beaten is
// 'beaten': whether the captain lived is a roll); sim/notice.ts keeps the
// memory between systems.
export type Personality = 'duelist' | 'zealot' | 'broker' | 'ambusher' | 'cautious';

/** What a meeting came to, as the journey remembers it. */
export type Meeting = 'won' | 'scarred' | 'escaped' | 'evaded' | 'bargained' | 'left' | 'killed';
/** What the world reports: a beaten ship is a scar or a death, which the journey decides. */
export type Report = Exclude<Meeting, 'scarred' | 'killed'> | 'beaten';

/** A portrait, drawn by the comms panel: every part a choice from a short list. */
export interface Face {
  skin: string;
  hair: 'shaved' | 'crop' | 'swept' | 'long' | 'hood';
  hairColour: string;
  eye: 'none' | 'patch' | 'implant' | 'visor';
  mark: 'none' | 'tattoo' | 'brand' | 'circuit';
  jaw: 'narrow' | 'square';
}

export interface CaptainDef {
  id: string;
  name: string;
  /** How the channel names them: Captain, Commander, Inquisitor. */
  rank: string;
  ship: string;
  /** The faction whose capital ship they fly (and whose notice names them: content/factions.ts lists them in order). */
  faction: Faction;
  personality: Personality;
  face: Face;
  lines: {
    /** The first time they open a channel. */
    hail: string;
    /** Coming out of the rock. */
    ambush: string;
    /** Added when they will deal. Slot: {fee}. */
    bargain: string;
    /** Turning away without a fight (the log line). */
    leave: string;
    /** Coming back, by what happened last time. */
    back: Record<Exclude<Meeting, 'killed'>, string>;
  };
}

export interface PersonalityDef {
  /** In words, for the read. */
  word: string;
  approach: 'announce' | 'ambush';
  /** Their price to let you go, in chits; null if they never deal. */
  fee: number | null;
  /** They may leave without a fight against a ship this much stronger than theirs (Infinity: never). */
  nerve: number;
  /** Their hull, against the base captain's (CAPTAIN_HP). */
  hp: number;
  /** The chance a beaten captain gets off the ship. */
  survive: number;
  /** The chance running past them comes off, the first time. */
  run: number;
}

/** What one captain remembers of the Wayward. */
export interface CaptainMemory {
  id: string;
  /** Meetings, and the last one (null: never met). */
  met: number;
  last: Meeting | null;
  lastDay: number;
  /** How each meeting went, counted. */
  won: number;
  scarred: number;
  escaped: number;
  evaded: number;
  bargained: number;
  left: number;
  dead: boolean;
  /** The day before which they do not come again. */
  rest: number;
}

/** A captain sent into a system: who, how many seconds into the sortie they find you, and what they remember. */
export interface CaptainCall {
  id: string;
  faction: Faction;
  name: string;
  /** The ship's name this time (it is how the world knows them among the capital ships). */
  ship: string;
  at: number;
  memory: CaptainMemory;
}

/** How a captain comes this time: their personality, changed by what they remember. */
export interface Form {
  approach: 'announce' | 'ambush';
  /** Their price (null: they will not deal). */
  fee: number | null;
  nerve: number;
  /** Hull multiplier on the capital ship, and extra hulls in the wing. */
  hp: number;
  wing: number;
  /** The chance running past them comes off. */
  run: number;
  /** The ship's name: a new hull after each one lost. */
  ship: string;
  /** What has changed, in words, for the read. */
  mood: string;
}

/** Each run past them takes this off the odds. */
export const RUN_LEARN = 0.22;
/** Each payment puts the price up by this share. */
export const FEE_RISE = 0.5;

export const CAPTAIN_BY_ID: Record<string, CaptainDef> = Object.fromEntries(CAPTAINS.map((c) => [c.id, c]));

export function newMemory(id: string): CaptainMemory {
  return { id, met: 0, last: null, lastDay: 0, won: 0, scarred: 0, escaped: 0, evaded: 0, bargained: 0, left: 0, dead: false, rest: 0 };
}

/** How they come this time. */
export function form(def: CaptainDef, m: CaptainMemory): Form {
  const p = PERSONALITIES[def.personality];
  const grudge = m.scarred > 0, bold = m.won > 0;
  let fee = p.fee;
  if (fee !== null) fee = Math.round((fee * (1 + FEE_RISE * m.bargained) * (bold ? 1.5 : 1)) / 5) * 5;
  const moods: string[] = [];
  if (grudge) moods.push('a grudge: no deals, no warning');
  if (bold) moods.push('bold: they beat you once');
  if (m.escaped) moods.push('wary: a bigger wing');
  if (m.evaded) moods.push('wise to running');
  if (m.bargained && !grudge) moods.push('expects paying');
  if (m.left && !grudge && !bold) moods.push('will not turn away twice');
  return {
    approach: grudge ? 'ambush' : p.approach,
    fee: grudge ? null : fee,
    nerve: bold || grudge || m.left ? Infinity : p.nerve,
    hp: Math.round(CAPTAIN_HP * p.hp * (1 + 0.3 * m.scarred + 0.15 * m.won + 0.1 * m.escaped + 0.1 * m.evaded) * 100) / 100,
    wing: Math.min(3, m.escaped + m.scarred),
    run: Math.max(0.1, p.run - RUN_LEARN * m.evaded),
    ship: m.scarred ? `${def.ship} MK${m.scarred + 1}` : def.ship,
    mood: moods.length ? moods.join(' · ') : m.met ? 'Remembers you' : `${p.word} · never met`,
  };
}

/** Their strength on the comms read's scale: the capital ship and its wing. */
export function captainShips(def: CaptainDef, f: Form): Array<{ variant: string; n: number }> {
  const fd = FACTIONS[def.faction];
  return [{ variant: fd.hull, n: 1 }, { variant: fd.wing, n: fd.wingN + f.wing }];
}

const CALLER: Partial<Record<Faction, Caller>> = { custody: 'custody', gutter: 'gutter', office: 'office' };

/** The comms card for a captain who has found you. `you` and `them`: strengths on the read's scale, for a stare-down's odds. */
export function captainCard(def: CaptainDef, m: CaptainMemory, you: number, them: number): CardDef {
  const f = form(def, m);
  const back = m.last && m.last !== 'killed' ? def.lines.back[m.last] : null;
  const opening = f.approach === 'ambush' ? def.lines.ambush : back ?? def.lines.hail;
  const text = [opening, f.approach === 'ambush' && back ? back : null, f.fee !== null ? def.lines.bargain : null].filter(Boolean).join(' ');
  const choices: ChoiceDef[] = [
    {
      id: 'fight', label: 'Fight', tone: 'fight', hint: `The ${f.ship} and its wing. Break it and there is a wreck to pick over; ${def.name} may not be aboard by then.`,
      win: { text: `Weapons hot on the ${f.ship}`, captain: 'fight' },
    },
    {
      id: 'run', label: f.approach === 'ambush' ? 'Break out of the trap' : 'Run for it', tone: 'run',
      hint: m.evaded ? `${def.name} has seen this before.` : `Lose the ${f.ship} in the rock before it closes.`,
      odds: { base: f.run, heat: -0.15 },
      win: { text: `You lose the ${f.ship} in the rock`, captain: 'run', heat: 0.05 },
      lose: { text: `The ${f.ship} cuts you off · weapons hot`, captain: 'fight', heat: 0.05 },
    },
  ];
  if (f.fee !== null) {
    choices.push({
      id: 'pay', label: 'Pay them off', tone: 'pay', hint: m.bargained ? 'The price went up. It will again.' : `Chits, and ${def.name} finds somewhere else to be.`,
      cost: { chits: 'fee' }, win: { text: `${def.name} takes the chits and stands off`, captain: 'pay' },
    });
  }
  if (f.nerve < Infinity) {
    // the stronger you are against the ship, the likelier the captain turns away
    const base = Math.min(0.85, Math.max(0.1, 0.25 + 0.3 * (you / Math.max(1, them) - f.nerve)));
    choices.push({
      id: 'stare', label: 'Run out the guns', tone: 'bluff', hint: `Let ${def.name} count them and think again.`,
      odds: { base },
      win: { text: `${def.name} thinks better of it`, captain: 'leave' },
      lose: { text: `${def.name} is not impressed · weapons hot`, captain: 'fight' },
    });
  }
  return {
    id: `captain:${def.id}`, kind: 'captain', caller: CALLER[def.faction] ?? 'captain', trigger: 'follow', repeat: true,
    from: `${def.rank} ${def.name} · ${f.ship}`, title: m.met ? `${def.name} again` : `${def.rank} ${def.name}`,
    text, face: def.face, scars: m.scarred,
    ships: captainShips(def, f), cargo: `${PERSONALITIES[def.personality].word} · met ${m.met} ${m.met === 1 ? 'time' : 'times'}`,
    fee: f.fee !== null ? { base: f.fee } : undefined,
    truths: [{ id: 'mood', weight: 1, read: f.mood }],
    slow: f.approach === 'ambush' ? { timeout: 6, default: 'fight' } : undefined,
    choices,
  };
}

/** Whether they turn away at the sight of you, before a word: only a captain with little nerve, against a ship that clearly outguns theirs. */
export function turnsAway(def: CaptainDef, m: CaptainMemory, you: number, them: number, rng: Rng): boolean {
  const f = form(def, m);
  if (f.nerve === Infinity || f.approach === 'ambush') return false;
  const over = you / Math.max(1, them) - f.nerve;
  return over > 0 && rng.next() < Math.min(0.6, over * 0.5);
}

/** Fold a meeting into the memory, in place. A beaten ship is a scar or a death, by the captain's luck. Returns the meeting it came to. */
export function meet(m: CaptainMemory, report: Report, day: number, rng: Rng): Meeting {
  const def = CAPTAIN_BY_ID[m.id];
  const meeting: Meeting = report === 'beaten' ? (def && rng.next() < PERSONALITIES[def.personality].survive ? 'scarred' : 'killed') : report;
  m.met++;
  m.last = meeting;
  m.lastDay = day;
  if (meeting === 'killed') m.dead = true;
  else m[meeting]++;
  return meeting;
}

/** The log line for a meeting. */
export function meetingLine(id: string, meeting: Meeting): string {
  const def = CAPTAIN_BY_ID[id];
  const n = def?.name ?? id, s = def?.ship ?? 'ship';
  switch (meeting) {
    case 'won': return `${n} broke the Wayward · and will remember it`;
    case 'scarred': return `The ${s} is wreckage · ${n}’s lifeboat got clear`;
    case 'killed': return `${n} went down with the ${s}`;
    case 'escaped': return `${n} broke off the fight · and will be back`;
    case 'evaded': return `You slipped ${n} · who knows the trick now`;
    case 'bargained': return `${n} was paid off · for now`;
    case 'left': return `${n} turned away`;
  }
}
