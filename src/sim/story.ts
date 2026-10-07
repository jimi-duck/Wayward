import { t } from '../i18n';
import { ACTS, BEATS, CHOICE_REGION, FRAGMENT_FLAGS, FRAGMENT_FLAGS_LONG, FRAGMENTS_ALL, YARD_BEAT, type Act } from '../content/story';
import type { RegionSet } from '../content/regions';
import { tierOf, viewOf } from './chart';
import type { Journey } from './journey';

// ── the story ─────────────────────────────────────────────────────────────
// Which act the journey is in, how much of the Severance file it has
// pieced together, and which story beat is due in the next sortie
// (content/story.ts). One beat a sortie at most: the one for the region
// you are in, or an older one you missed.

/** The act: the Breakout until the first jump, the Run, then the Choice from the Hollows on. */
export function act(j: Journey): Act {
  if (j.trail.length < 2) return ACTS[0]!;
  return tierOf(j.chart, viewOf(j.chart, j.at)) >= CHOICE_REGION || j.end === 'through' ? ACTS[2]! : ACTS[1]!;
}

/** The act as a heading: "Act II · The Run". */
export const actLine = (a: Act): string => t('Act {n} · {name}', { n: ['I', 'II', 'III'][a.n - 1]!, name: t(a.name) });

/** Pieces of the file found, out of all of them (the long journey's file has eight; the endings read the first four). */
export function fileCount(flags: Iterable<string>, set: RegionSet = 'three'): { found: number; of: number } {
  const f = new Set(flags), all = set === 'eight' ? FRAGMENT_FLAGS_LONG : FRAGMENT_FLAGS;
  return { found: all.filter((x) => f.has(x)).length, of: all.length };
}

/** The pieces found, by flag, for the Archive. */
export const fragmentsFound = (flags: Iterable<string>): string[] => {
  const f = new Set(flags);
  return FRAGMENTS_ALL.filter((x) => f.has(x.flag)).map((x) => x.flag);
};

/** The story beat due in this system's sortie, if any: the yard's call before the first jump, then this region's first and any missed before. */
export function dueBeat(j: Journey): string | null {
  if (j.trail.length < 2) return j.carry.seen.includes(YARD_BEAT) ? null : YARD_BEAT;
  // the three-region chart's beats come by tier; the eight-region chart's by its own regions
  const long = j.chart.regionSet === 'eight';
  const seen = new Set(j.carry.seen), r = long ? viewOf(j.chart, j.at) : tierOf(j.chart, viewOf(j.chart, j.at));
  const at = (b: (typeof BEATS)[number]) => (long ? b.long : b.region);
  const open = BEATS.filter((b) => at(b) !== undefined && at(b)! <= r && !seen.has(b.card));
  return (open.find((b) => at(b) === r) ?? open[0])?.card ?? null;
}
