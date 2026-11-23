import type { GameEvent } from '../sim/events';

// Vibration on a phone: a short buzz for what the hand should feel. Android browsers have it; iPhone
// browsers give a web page no vibration at all, so there this is silent and its setting is hidden.
// On by default where it works; the Settings row turns it off, kept per device.

const KEY = 'wayward.buzz';

/** Pulse lengths, in ms: short for what you did, longer for what was done to you. */
const PULSE = { roll: 12, torpedo: 18, hit: [30, 40, 30], card: 20 } as const;

export class Haptics {
  readonly available = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  on: boolean;

  constructor() {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch { /* no storage: the default */ }
    this.on = v !== '0';
  }

  toggle(): void {
    this.on = !this.on;
    try { localStorage.setItem(KEY, this.on ? '1' : '0'); } catch { /* not kept */ }
    if (this.on) this.buzz('card');
  }

  buzz(kind: keyof typeof PULSE): void {
    if (!this.on || !this.available) return;
    try { navigator.vibrate(PULSE[kind] as number | number[]); } catch { /* a browser that refuses */ }
  }

  /** The step's events: a hit taken, a torpedo away. (The roll buzzes from the button, as it is pressed.) */
  events(events: readonly GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'shipHit' || e.type === 'shieldHit') { this.buzz('hit'); return; }
      if (e.type === 'torpedo') this.buzz('torpedo');
    }
  }
}
