// ── numbers that tick ─────────────────────────────────────────────────────
// A readout of figures ("5/8") steps from its old values to its new ones, one
// whole number at a time, the way a counter on a machine does: a short hold,
// then the steps. Not a tween. Skipped (it shows the new value) under reduced
// motion, and when the element is gone before it ends.

const NUM = /-?\d+/g;
const HOLD = 140;

/** The figures in a string. */
const figures = (s: string): number[] => (s.match(NUM) ?? []).map(Number);

/** Show `from`, then step to `to` over about `ms`. Both read like "5/8" (the same number of figures); otherwise `to` is shown at once. */
export function tick(el: HTMLElement, from: string, to: string, ms = 520): void {
  const a = figures(from), b = figures(to);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !a.length || a.length !== b.length || from === to) { el.textContent = to; return; }
  const steps = Math.max(1, ...a.map((x, i) => Math.abs(b[i]! - x)));
  const gap = Math.max(40, Math.round((ms - HOLD) / steps));
  el.textContent = from;
  let k = 0;
  const next = () => {
    if (!el.isConnected) return;
    k++;
    let i = 0;
    el.textContent = to.replace(NUM, () => {
      const at = i++;
      return String(Math.round(a[at]! + (b[at]! - a[at]!) * Math.min(1, k / steps)));
    });
    if (k < steps) setTimeout(next, gap);
  };
  setTimeout(next, HOLD);
}
