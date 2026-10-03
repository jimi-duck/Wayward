// ── small things every panel shares ───────────────────────────────────────
// An element builder, a key listener that ignores a panel's first moments
// and held keys, a click guard to match, and a gamepad read by edges.

export const GUARD = 400;
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** A small element builder: tag, class, text, children. */
export function h(tag: string, cls = '', text = '', ...kids: Array<Node | null>): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  for (const k of kids) if (k) e.append(k);
  return e;
}

/** Listen for keys while a panel is open, past the guard, ignoring repeats (unless `repeats`). Returns the remover. */
export function keys(onKey: (e: KeyboardEvent) => boolean, repeats: readonly string[] = []): () => void {
  const opened = performance.now();
  const fn = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.repeat && !repeats.includes(e.code)) || performance.now() - opened < GUARD) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (onKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); }
  };
  window.addEventListener('keydown', fn, true);
  return () => window.removeEventListener('keydown', fn, true);
}

/** A click handler that only answers after the guard. */
export const guarded = (opened: number, fn: () => void) => (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  if (performance.now() - opened >= GUARD) fn();
};

// ── a gamepad on the panels ───────────────────────────────────────────────
// The flight input reads the pad while flying; while a panel is open this
// reads it instead, by edges only, so a held button never answers. A held
// direction repeats, for moving along the cards.

export interface PadEdges {
  left: boolean; right: boolean; up: boolean; down: boolean;
  a: boolean; b: boolean; x: boolean; y: boolean; lb: boolean; rb: boolean; back: boolean;
}

const NONE: PadEdges = { left: false, right: false, up: false, down: false, a: false, b: false, x: false, y: false, lb: false, rb: false, back: false };
const REPEAT_FIRST = 0.38;
const REPEAT_EVERY = 0.13;

export class PadNav {
  private prev: boolean[] = [];
  private held = 0;
  private heldDir = -1;
  private last = performance.now();

  poll(): PadEdges {
    const now = performance.now(), dt = (now - this.last) / 1000;
    this.last = now;
    const pad = typeof navigator.getGamepads === 'function' ? navigator.getGamepads().find((p) => p && p.connected) : null;
    if (!pad) { this.prev.length = 0; return NONE; }
    const b = pad.buttons.map((x) => x.pressed);
    const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
    // directions: the d-pad or the left stick, as indices 100-103 (left, right, up, down)
    b[100] = !!b[14] || x < -0.6; b[101] = !!b[15] || x > 0.6; b[102] = !!b[12] || y < -0.6; b[103] = !!b[13] || y > 0.6;
    const edge = (i: number) => !!b[i] && !this.prev[i];
    const dirs = [100, 101, 102, 103];
    let rep = -1;
    const down = dirs.find((i) => b[i]) ?? -1;
    if (down !== this.heldDir) { this.heldDir = down; this.held = 0; }
    else if (down >= 0) {
      this.held += dt;
      if (this.held >= REPEAT_FIRST) { rep = down; this.held -= REPEAT_EVERY; }
    }
    const dir = (i: number) => edge(i) || rep === i;
    const out: PadEdges = {
      left: dir(100), right: dir(101), up: dir(102), down: dir(103),
      a: edge(0), b: edge(1), x: edge(2), y: edge(3), lb: edge(4), rb: edge(5), back: edge(8),
    };
    this.prev = b;
    return out;
  }
}
