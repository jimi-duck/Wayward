import { gateOf, regionCount, regionDef, sysById } from './chart';
import { openChapter } from './chapters';
import { newJourney, type Journey } from './journey';
import type { SurvivalId } from '../content/survival';

// ── skipping to a chapter ─────────────────────────────────────────────────
// For the review world (docs/REVIEW.md): a Story journey on the road that starts
// at the gate a chapter is entered by, as if the player had flown there. Nothing
// of the chapters skipped is played, so none of their flags are set: the story
// takes the branch where those things did not happen. Plain data, no Three.js.

/** Flags the opening sets and later chapters take for granted: the owner lock lifted, the codes passed. */
const OPENING_FLAGS = ['ship_stolen', 'codes_passed'];

/** How many chapters the road has. */
export const CHAPTERS = 8;

/** A Story journey on the road standing at the start of a chapter (0 is the Reach: the plain new journey). */
export function journeyAtChapter(seed: number, chapter: number, survival?: SurvivalId): Journey {
  const j = newJourney(seed, false, 'road', survival);
  const n = Math.max(0, Math.min(chapter, regionCount(j.chart) - 1));
  if (n === 0) return j;
  for (const f of OPENING_FLAGS) if (!j.carry.flags.includes(f)) j.carry.flags.push(f);
  // a chapter begins at the gate that closes the one before; arriving there writes the chapter's record
  const gate = gateOf(j.chart, n - 1);
  j.at = gate.id;
  j.dest = null;
  j.trail = [j.chart.home, gate.id];
  j.day = n * 6;
  openChapter(j, n);
  j.status = 'chart';
  return j;
}

/** The name of a chapter's region, for the review menu (English; the menu is a builder's tool). */
export function chapterName(j: Journey, chapter: number): string {
  const R = regionDef(j.chart, chapter);
  return R ? R.name : `Chapter ${chapter + 1}`;
}

export { sysById };
