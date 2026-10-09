import { OBSERVATIONS } from '../content/situations';
import { CHITS_PER_CYRITE } from './purse';
import { t } from '../i18n';
import { ENDING_BY_ID, ENDINGS, FRIEND, SCATTER, type EndingDef, type EndingId, type Need } from '../content/endings';
import { CAPTAIN_BY_ID } from './captains';
import type { Standing } from './comms';
import type { Faction } from './enemies';
import type { Journey } from './journey';
import { hasFitted, systemMarks, type Marks } from './modules';
import { atLeast, tier } from './notice';
import { fileCount, fragmentsFound } from './story';
import { STORY_PEOPLE } from '../content/story';

// ── the Choice ────────────────────────────────────────────────────────────
// The third act. Through the Threshold, the journey is over (status 'over',
// end 'through') but the file is still aboard: `pending` says so, and the
// save keeps the journey until the choice is made. The Threshold panel asks
// `choices` which endings are open and why the rest are shut; `choose` makes
// the choice and returns the epilogue, read off content/endings.ts against
// what the journey built.

/** What the journey built, as the endings read it. */
export interface Ledger {
  standing: Partial<Record<Standing, number>>;
  flags: Set<string>;
  marks: Marks;
  levels: Journey['carry']['levels'];
  friends: number;
  notice: (f: Faction) => boolean;
  beaten: number;
  chits: number;
  /** Pieces of the Severance's history in the file. */
  fragments: number;
  wrecks: number;
  hardcore: boolean;
}

export function ledger(j: Journey): Ledger {
  const standing = j.carry.standing;
  return {
    standing,
    flags: new Set(j.carry.flags),
    marks: systemMarks(j.carry.levels),
    levels: j.carry.levels,
    friends: SCATTER.filter((s) => (standing[s] ?? 0) >= FRIEND).length,
    notice: (f) => atLeast(tier(j.notice, f), 'hunters'),
    beaten: j.hunt.beaten,
    chits: j.carry.cyrite * CHITS_PER_CYRITE,
    fragments: fileCount(j.carry.flags).found,
    wrecks: j.wrecks,
    hardcore: j.hardcore,
  };
}

/** Does the journey meet every part of this need? */
export function meets(l: Ledger, n: Need): boolean {
  for (const [s, v] of Object.entries(n.standing ?? {}) as Array<[Standing, number]>) if ((l.standing[s] ?? 0) < v) return false;
  for (const [s, v] of Object.entries(n.marks ?? {}) as Array<[keyof Marks, number]>) if (l.marks[s] < v) return false;
  if (n.allFlags && !n.allFlags.every((f) => l.flags.has(f))) return false;
  if (n.friends !== undefined && l.friends < n.friends) return false;
  if (n.flags && !n.flags.some((f) => l.flags.has(f))) return false;
  if (n.module && !n.module.some((m) => hasFitted(l.levels, m))) return false;
  if (n.calm && n.calm.some((f) => l.notice(f))) return false;
  if (n.beaten !== undefined && l.beaten < n.beaten) return false;
  if (n.chits !== undefined && l.chits < n.chits) return false;
  if (n.fragments !== undefined && l.fragments < n.fragments) return false;
  if (n.wrecksMin !== undefined && l.wrecks < n.wrecksMin) return false;
  if (n.wrecksMax !== undefined && l.wrecks > n.wrecksMax) return false;
  if (n.hardcore !== undefined && l.hardcore !== n.hardcore) return false;
  return true;
}

/** Through the Threshold with the file still aboard: the choice is waiting. */
export const pending = (j: Journey): boolean => j.status === 'over' && j.end === 'through' && !j.ending;

export interface Choice {
  def: EndingDef;
  open: boolean;
}

/** All six endings, in order, each open or shut for this journey. */
export function choices(j: Journey): Choice[] {
  const l = ledger(j);
  return ENDINGS.map((def) => ({ def, open: def.ways.some((w) => meets(l, w)) }));
}

/** The epilogue of an ending, for this journey. */
export function epilogue(j: Journey, id: EndingId): string[] {
  const l = ledger(j);
  return ENDING_BY_ID[id].epilogue.filter((e) => !e.if || meets(l, e.if)).map((e) => e.text);
}

/** Make the choice. Returns the epilogue, or null if the choice is not waiting or the ending is shut. */
export function choose(j: Journey, id: EndingId): string[] | null {
  if (!pending(j) || !choices(j).find((c) => c.def.id === id)?.open) return null;
  j.ending = id;
  j.log.push({ day: Math.round(j.day * 10) / 10, text: `${t('The Severance file')} · ${t(ENDING_BY_ID[id].name)}` });
  return epilogue(j, id);
}

/** What a finished journey leaves in the Archive (meta/profile.ts). */
export interface JourneyRecord {
  seed: number;
  end: NonNullable<Journey['end']>;
  ending: EndingId | null;
  days: number;
  jumps: number;
  wrecks: number;
  score: number;
  hardcore: boolean;
  /** The people met on the way, by name. */
  people: string[];
  /** The file, as the Archive keeps it, if an ending was reached. */
  file: string | null;
  /** The pieces of the Severance's history found (content/story.ts), by flag. */
  records: string[];
  /** What was seen of the unknown, by flag (content/situations.ts). */
  sightings?: string[];
}

export function journeyRecord(j: Journey): JourneyRecord {
  const people: string[] = [];
  if (j.hunt.caught > 0 || j.carry.flags.some((f) => f.startsWith('calloway_'))) people.push('Prefect Idris Calloway');
  for (const id of [...j.notice.captains.map((c) => c.id), ...j.notice.fallen]) {
    const c = CAPTAIN_BY_ID[id];
    if (c && !people.includes(`${c.rank} ${c.name}`)) people.push(`${c.rank} ${c.name}`);
  }
  const f = new Set(j.carry.flags);
  if (f.has('stalled')) people.push('Foreman Draper');
  if (f.has('gutter_friend')) people.push('The crew of the Leaky Tin');
  if (f.has('owes_runner')) people.push('Tallow, a fuel runner');
  if (f.has('passengers')) people.push('The Okafor family');
  if (f.has('pod')) people.push('An Ares Drive survivor');
  for (const p of STORY_PEOPLE) if (p.flags.some((x) => f.has(x))) people.push(p.name);
  const ending = j.ending ?? null;
  return {
    seed: j.seed, end: j.end ?? 'wrecked', ending, days: Math.round(j.day), jumps: j.legs.filter((l) => l.ended === 'jumped').length,
    wrecks: j.wrecks, score: j.score, hardcore: j.hardcore, people, file: ending ? ENDING_BY_ID[ending].file : null,
    records: fragmentsFound(f),
    sightings: OBSERVATIONS.map((o) => o.flag).filter((x) => f.has(x)),
  };
}
