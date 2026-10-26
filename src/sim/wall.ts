import { t } from '../i18n';
import { WALL, WALL_BY_FLAG, type WallItem } from '../content/wall';
import { isLongSet, type RegionSet } from '../content/regions';
import type { Carry } from './breakout';

// ── the Wall ──────────────────────────────────────────────────────────────
// The evidence view, worked out from the journey's flags (content/wall.ts):
// no state of its own. It says what the file holds, what is still open, and
// one lead: where to look next. The Cerro reveal also lives here, because it
// is the one clue the story hands over without a choice.

/** The three-region chart's regions on the eight-region scale (Reach, Marches, Hollows). */
const THREE_AS_LONG = [0, 1, 6] as const;

export interface WallRow { item: WallItem; found: boolean }

export interface WallView {
  /** Found rows first (in the order the story finds them), then the questions still open here or ahead. */
  rows: WallRow[];
  /** Pieces of the file found, of those this chart plays. */
  file: { found: number; of: number };
  /** One line: where to look next. */
  lead: string;
  /** The latest row found, for the recap. */
  latest: WallItem | null;
}

/** The region a journey is in, on the eight-region scale: -1 in Cerro. */
export function wallRegion(trail: number, region: number, set: RegionSet): number {
  if (trail < 2) return -1;
  return isLongSet(set) ? region : THREE_AS_LONG[Math.min(region, 2)]!;
}

const playedOn = (set: RegionSet) => (w: WallItem) => isLongSet(set) || !!w.short;

export function wallView(flags: Iterable<string>, at: number, set: RegionSet = 'eight'): WallView {
  const have = new Set(flags);
  const mine = WALL.filter(playedOn(set));
  const found = mine.filter((w) => have.has(w.flag));
  const open = mine.filter((w) => !have.has(w.flag) && w.at <= at + 1);
  const spine = mine.filter((w) => w.kind === 'fragment');
  const behind = spine.find((w) => !have.has(w.flag) && w.at <= at);
  const latest = found[found.length - 1] ?? null;
  const lead = behind ? t('Still open · {ask}', { ask: t(behind.ask) }) : latest ? t(latest.lead) : t('Fly the first jump and see what the archive holds.');
  const fragments = spine;
  return {
    rows: [...found.map((item) => ({ item, found: true })), ...open.map((item) => ({ item, found: false }))],
    file: { found: fragments.filter((w) => have.has(w.flag)).length, of: fragments.length },
    lead,
    latest,
  };
}

/** Flags that are clues, newly found between two flag sets: what the recap line names. */
export const newClues = (before: Iterable<string>, after: Iterable<string>): WallItem[] => {
  const was = new Set(before);
  return [...after].filter((f) => !was.has(f)).map((f) => WALL_BY_FLAG[f]).filter((w): w is WallItem => !!w);
};

