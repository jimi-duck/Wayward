import { t } from '../i18n';
import { HOLDER_NAMES } from '../content/systems';
import { regionDef, viewOf } from './chart';
import { fragmentsFound } from './story';
import type { Journey } from './journey';

// ── chapters ──────────────────────────────────────────────────────────────
// A chapter is a region. Arriving at its gate writes a record into the journey
// (what the file held, whose side you were on, whether Calloway had read your
// route), and the save keeps the journey as it stood there (meta/save.ts), so a
// player can start the chapter again. The recap on the title is worked out from
// two records: what this chapter changed against the one before.

/** The journey as it stood at a gate. */
export interface Chapter {
  /** The region entered (an index into the chart's regions). */
  region: number;
  day: number;
  /** Systems flown so far. */
  stops: number;
  /** What the factions think of you, and the file's fragments found, at the gate. */
  standing: Record<string, number>;
  fragments: string[];
  /** Calloway had read how you fly. */
  read: boolean;
}

/** Writes the record for the region the Wayward has just entered. */
export function openChapter(j: Journey, region: number): void {
  (j.chapters ??= []).push({
    region, day: j.day, stops: j.legs.length, standing: { ...j.carry.standing }, fragments: fragmentsFound(j.carry.flags),
    read: !!(j.hunt.hunch?.kind || j.hunt.hunch?.straight),
  });
}

/** Whether the journey stands at a gate it just crossed: the moment the save keeps as a chapter. */
export const atChapter = (j: Journey): boolean => !!j.chapters?.length && j.chapters[j.chapters.length - 1]!.stops === j.legs.length;

/** The recap of the latest chapter: its name, how long it has run, and what changed in it (a faction, a fragment, a read). */
export interface Recap {
  name: string;
  days: number;
  stops: number;
  changes: string[];
}

export function recap(j: Journey): Recap | null {
  const list = j.chapters;
  if (!list?.length) return null;
  // the open chapter is the last record; what changed in it, against the one before
  const now = list[list.length - 1]!, was = list[list.length - 2];
  const R = regionDef(j.chart, now.region) ?? regionDef(j.chart, viewOf(j.chart, j.at));
  const moved = (Object.keys(j.carry.standing) as string[])
    .map((f) => ({ f, d: (j.carry.standing[f as keyof typeof j.carry.standing] ?? 0) - (was?.standing[f] ?? 0) }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  const changes: string[] = [];
  if (moved && moved.d !== 0) changes.push(`${t(HOLDER_NAMES[moved.f as keyof typeof HOLDER_NAMES] ?? moved.f)} ${moved.d > 0 ? '+' : ''}${moved.d}`);
  const found = fragmentsFound(j.carry.flags).length - (was?.fragments.length ?? 0);
  if (found > 0) changes.push(`${t('File')} +${found}`);
  if (now.read && !was?.read) changes.push(t('Calloway reads you'));
  return { name: R ? t(R.name) : '', days: Math.floor(j.day - (was?.day ?? 0)), stops: j.legs.length - (was?.stops ?? 0), changes };
}
