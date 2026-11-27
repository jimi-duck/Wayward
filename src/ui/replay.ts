// ── restarting a CSS animation without a forced layout ─────────────────────
// The usual trick (take the class off, read offsetWidth, put it back) makes the browser lay out the whole page there
// and then, in the middle of the HUD's frame. On a busy frame that was the HUD's biggest cost (docs/PERF.md, pass 17).
// Here the class comes off now and goes back on at the next frame, so the browser's own style pass between the two
// ends the old run and starts a new one. The animation starts one frame (16 ms) later; nothing else changes.

const due = new Map<HTMLElement, string[]>();
let queued = false;

function flush(): void {
  queued = false;
  for (const [el, cls] of due) el.classList.add(...cls);
  due.clear();
}

/** Take `off` and `cls` off `el` now, and put `cls` back on at the next frame: its CSS animation plays from the start. */
export function replay(el: HTMLElement, cls: string, ...off: string[]): void {
  el.classList.remove(cls, ...off);
  const list = due.get(el);
  if (list) { for (const c of off) { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); } if (!list.includes(cls)) list.push(cls); }
  else due.set(el, [cls]);
  if (!queued) { queued = true; requestAnimationFrame(flush); }
}

/** Drop a replay still waiting for its frame (the element was hidden or its class cleared since). */
export function cancelReplay(el: HTMLElement, cls?: string): void {
  const list = due.get(el);
  if (!list) return;
  if (cls === undefined) { due.delete(el); return; }
  const i = list.indexOf(cls);
  if (i >= 0) list.splice(i, 1);
}
