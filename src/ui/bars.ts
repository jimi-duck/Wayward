// A phone browser's bars (address, tabs, toolbar) fold away as the page
// scrolls and come back as it scrolls the other way. CSS knows the window's
// height both ways: 100svh with the bars out, 100lvh with them folded.

/** Below this the bars barely move, and are not worth a swipe. */
const FOLDS = 40;

/** The bars are out: the window is nearer its height with them than without. */
export function barsOut(inner: number, small: number, large: number): boolean {
  return large - small >= FOLDS && inner < (small + large) / 2;
}

/**
 * Keep the screen playable: a phone held upright gets the turn screen over everything, and on an iPhone browser
 * (not a Home Screen app) the swipe screen asks for the swipe up that folds the bars. Either one calls `interrupt`,
 * which pauses a run under it; turned back or folded, the pause card waits for a tap.
 *
 * An iPhone browser folds its tabs and bars away only when the page scrolls, so there the page scrolls under the game,
 * which stays fixed. The game's own surfaces never scroll the page, so once folded the bars stay folded.
 */
export function watchScreen(canvas: HTMLElement, iphoneBrowser: boolean, interrupt: () => void): void {
  const root = document.documentElement;
  const upright = matchMedia('(orientation: portrait) and (max-width: 600px) and (pointer: coarse)');
  const turn = (): void => {
    root.classList.toggle('upright', upright.matches);
    if (upright.matches) interrupt();
  };
  upright.addEventListener('change', turn);
  turn();

  root.classList.toggle('swipe', iphoneBrowser);
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none';
  const tall = (h: string): number => { probe.style.height = h; return probe.offsetHeight; };
  let small = 0, large = 0, out = false;
  let kept = false; // the player chose to play with the bars
  const bars = (): void => {
    const now = iphoneBrowser && !kept && barsOut(innerHeight, small, large);
    if (now === out) return;
    out = now;
    root.classList.toggle('bars', out);
    if (out) interrupt();
  };
  // the two heights change only with the window's shape; the bars, on every scroll
  new ResizeObserver(() => { small = tall('100svh'); large = tall('100lvh'); bars(); }).observe(canvas);
  window.addEventListener('scroll', bars, { passive: true });
  window.visualViewport?.addEventListener('resize', bars);
  document.getElementById('swipe-x')?.addEventListener('click', () => { kept = true; bars(); });
}
