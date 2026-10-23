// ── Arrivals: how a pop-up shows that it came over the air (docs/DESIGN-GUIDELINES.md, "Motion") ─────────
// A fresh message marks its pop-up `data-rx` for a moment: the signal bars fill in one by one, one reflection crosses
// the glass's edge band, and Sam's bearing line draws itself. A message that replaces one already on screen marks it
// `data-ring` instead: one ring from the antenna, the bars stay full. Both marks go once the effects have run, so a
// redraw (a document opened and closed) never plays them again. Everything here is CSS; with reduced motion nothing
// moves and the bars are simply full.

const CLEAR_MS = 2400;
const timers = new WeakMap<HTMLElement, number>();

const reduced = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mark a pop-up as just arrived (`again`: it replaced a message that was already open). */
export function arrive(el: HTMLElement, again = false): void {
  clearTimeout(timers.get(el));
  delete el.dataset.rx;
  delete el.dataset.ring;
  void el.offsetWidth; // restart the CSS animations
  el.dataset[again ? 'ring' : 'rx'] = '';
  timers.set(el, window.setTimeout(() => settle(el), CLEAR_MS));
}

/** Drop the marks at once (a redraw that is not a new message). */
export function settle(el: HTMLElement): void {
  clearTimeout(timers.get(el));
  delete el.dataset.rx;
  delete el.dataset.ring;
}

/** True while a pop-up's arrival is still playing. */
export const arriving = (el: HTMLElement): boolean => 'rx' in el.dataset;

/** The header's signal bars: four, filled; they fill in one by one while the pop-up is arriving. */
export function bars(): HTMLElement {
  const b = document.createElement('i');
  b.className = 'rx-bars';
  b.setAttribute('aria-hidden', 'true');
  b.append(...[0, 1, 2, 3].map(() => document.createElement('i')));
  return b;
}

/** A bearing readout's digits settle on the value over about half a second, then hold. */
export function settleDigits(el: HTMLElement, text: string): void {
  el.textContent = text;
  if (reduced()) return;
  const start = performance.now();
  const tick = (first = false) => {
    if (!first && !el.isConnected) return;
    if (performance.now() - start > 560) { el.textContent = text; return; }
    el.textContent = text.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
    window.setTimeout(tick, 70);
  };
  tick(true);
}

/**
 * A private channel's bearing (Sam always calls from the same direction): a fine dotted line drawn once from the panel's
 * edge toward the bearing, off screen, then gone. Placed in `wrap` (the panel itself scrolls and would clip it).
 */
export function bearingLine(wrap: HTMLElement, panel: HTMLElement, deg: number): void {
  if (reduced()) return;
  const wr = wrap.getBoundingClientRect(), pr = panel.getBoundingClientRect();
  const a = deg - 90; // compass to screen: 0° is up, 90° is right
  const right = Math.cos((a * Math.PI) / 180) >= 0;
  const line = document.createElement('i');
  line.className = 'rx-bearing';
  line.setAttribute('aria-hidden', 'true');
  line.style.left = `${(right ? pr.right : pr.left) - wr.left}px`;
  line.style.top = `${pr.top - wr.top + 28}px`;
  line.style.setProperty('--a', `${a}deg`);
  wrap.append(line);
  line.addEventListener('animationend', () => line.remove(), { once: true });
}

// a hidden page stops every ambient effect where it is
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('page-hidden', document.hidden));
}
