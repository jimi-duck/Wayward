import { t } from '../i18n';
import { ACTS, BEATS, CHOICE_REGION, FRAGMENT_FLAGS, FRAGMENTS, type Act } from '../content/story';
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

/** Pieces of the file found, out of all of them. */
export function fileCount(flags: Iterable<string>): { found: number; of: number } {
  const f = new Set(flags);
  return { found: FRAGMENT_FLAGS.filter((x) => f.has(x)).length, of: FRAGMENT_FLAGS.length };
}

/** The pieces found, by flag, for the Archive. */
export const fragmentsFound = (flags: Iterable<string>): string[] => {
  const f = new Set(flags);
  return FRAGMENTS.filter((x) => f.has(x.flag)).map((x) => x.flag);
};

/** The story beat due in this system's sortie, if any: this region's first, then any missed before. */
export function dueBeat(j: Journey): string | null {
  if (j.trail.length < 2) return null;
  const seen = new Set(j.carry.seen), r = tierOf(j.chart, viewOf(j.chart, j.at));
  const open = BEATS.filter((b) => b.region <= r && !seen.has(b.card));
  return (open.find((b) => b.region === r) ?? open[0])?.card ?? null;
}
