import { t } from '../i18n';
import { ACTS, BEATS, CHOICE_REGION, FRAGMENT_FLAGS, FRAGMENT_FLAGS_LONG, FRAGMENTS_ALL, CERRO_BEATS, type Act } from '../content/story';
import type { RegionSet } from '../content/regions';
import { sysById, tierOf, viewOf } from './chart';
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

/**
 * The story beat due in this system's sortie, if any. Cerro's sortie is the training and the chase and has none. The first sortie
 * beyond the gate opens the chain (breach, Tam's code, the recovery order, the archive), which any later sortie finishes if it was
 * cut short. After that: this region's first beat and any missed before.
 */
export function dueBeat(j: Journey): string | null {
  if (j.trail.length < 2) return null;
  if (!j.carry.flags.includes('archive_woke')) { const next = CERRO_BEATS.find((b) => !j.carry.seen.includes(b)); if (next) return next; }
  // the three-region chart's beats come by tier; the eight-region chart's by its own regions
  const long = j.chart.regionSet === 'eight';
  const seen = new Set(j.carry.seen), has = new Set(j.carry.flags), r = long ? viewOf(j.chart, j.at) : tierOf(j.chart, viewOf(j.chart, j.at));
  const at = (b: (typeof BEATS)[number]) => (long ? b.long : b.region);
  const atGate = sysById(j.chart, j.at).kind === 'gate';
  const open = BEATS.filter((b) => at(b) !== undefined && at(b)! <= r && !seen.has(b.card) && (!b.needs || has.has(b.needs)) && (!b.gate || (atGate && at(b)! + 1 === r)));
  // a gate beat belongs to the gate out of its own region (a gate shows the next region): it comes before that region's own
  return (open.find((b) => b.gate) ?? open.find((b) => at(b) === r) ?? open[0])?.card ?? null;
}
