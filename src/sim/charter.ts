import { ON_ROAD } from '../content/road';
import type { Holder } from '../content/systems';

// ── the Charter ───────────────────────────────────────────────────────────
// The right of passage (docs/STORY_DIRECTION.md §2). Juno is Bonded: a
// contract resident with no Charter. In play it is a yes-or-no status, never a
// number: core ports charge the Bonded rate for jump fluid, their berths send
// her to the service side, and a forged Charter bought in the Belt lifts both
// until a Custody patrol's check strips it. Only on the road; the Arcade and
// the classic chart never see it.

/** Bought from Val at Kiln; a patrol's check takes it away again. */
export const CHARTER_FORGED = 'charter_forged';
/** A patrol found the forged seal and took it. */
export const CHARTER_STRIPPED = 'charter_stripped';
/** What the Bonded pay for jump fluid at a core port, against the posted price. */
export const BONDED_RATE = 1.4;
/** The heat a stripped Charter adds (0 to 1). */
export const STRIP_HEAT = 0.25;

/** The Continuance's own ports: the Bonded rate applies here. The Scatter has one price, because nobody there has a Charter. */
const CORE: ReadonlySet<Holder> = new Set<Holder>(['kellern']);

export const chartered = (flags: ReadonlySet<string>): boolean => flags.has(CHARTER_FORGED);

/** Does the Bonded rate apply here: on the road, at a core port, with no Charter? */
export function bonded(flags: ReadonlySet<string>, holder: Holder | undefined): boolean {
  return flags.has(ON_ROAD) && !!holder && CORE.has(holder) && !chartered(flags);
}

/** The price of one unit of jump fluid, the Bonded rate added where it applies (rounded up, so it always costs more). */
export const bondedPrice = (posted: number, isBonded: boolean): number => (isBonded ? Math.ceil(posted * BONDED_RATE) : posted);

/** A patrol's check: a forged Charter does not survive it. Returns true when it was taken. */
export function stripCharter(flags: Set<string>): boolean {
  if (!flags.has(CHARTER_FORGED)) return false;
  flags.delete(CHARTER_FORGED);
  flags.add(CHARTER_STRIPPED);
  return true;
}
