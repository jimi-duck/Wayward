// The tap guard. When a card or the pause card opens under a thumb, the same touch's click (and a thumb
// still drumming on Laser) must not answer it. For a short moment after anything opens, taps outside the
// touch controls are swallowed. Keys and pad presses are never touched: a click from Enter has no detail.

/** How long a newly opened card ignores taps, in ms: longer than a tap, shorter than a read. */
export const GUARD_MS = 350;

export class TapGuard {
  private until = 0;

  constructor(private readonly free: HTMLElement, private readonly now: () => number = () => performance.now()) {
    for (const type of ['pointerdown', 'pointerup', 'click'] as const) {
      window.addEventListener(type, this.stop, true);
    }
  }

  /** Something just opened: start the quiet moment. */
  arm(): void {
    this.until = this.now() + GUARD_MS;
  }

  /** Is the quiet moment still running? */
  get armed(): boolean {
    return this.now() < this.until;
  }

  private stop = (e: Event): void => {
    if (!this.armed) return;
    if (e.type === 'click' && (e as MouseEvent).detail === 0) return;
    if (e.type !== 'click' && (e as PointerEvent).pointerType === 'mouse') return;
    if (e.target instanceof Node && this.free.contains(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
}
