// A phone browser's bars (address, tabs, toolbar) fold away as the page
// scrolls and come back as it scrolls the other way. CSS knows the window's
// height both ways: 100svh with the bars out, 100lvh with them folded.

/** Below this the bars barely move, and are not worth a swipe. */
const FOLDS = 40;

/** The bars are out: the window is nearer its height with them than without. */
export function barsOut(inner: number, small: number, large: number): boolean {
  return large - small >= FOLDS && inner < (small + large) / 2;
}
