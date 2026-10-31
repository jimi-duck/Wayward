import { CHATTER } from '../content/chatter';
import type { GameEvent } from './events';

// ── the floor: one voice at a time ───────────────────────────────────────
// Every message the player is told falls into one of four kinds (docs/DESIGN-GUIDELINES.md, "One voice at a time"):
//
//   Moment   a card that pauses the world: a turn in the story to read or decide. The desk and the script open them;
//            the floor keeps them apart and gives each a quiet window after it.
//   Voice    a person on the radio: one line (`ping`).
//   Signal   the state just changed: a short notice (`storyNotice`).
//   Ambient  what is true now: the objective, the HUD, the scope. Never queued, never interrupts.
//
// Voices and Signals do not go out when they are made. The world hands them to the floor at the end of each step,
// and the floor lets one out at a time: never over a card, never two at once, a Voice never sooner than FLOOR.gap
// after the last, and no Voice in the quiet window after a Moment (a Signal may go out in it: it names what just
// happened). Lines keep their order. A line of chatter that waited too long is dropped; a story line never is. Plain data, so the pilots and the tests hear exactly what a player would.

export const FLOOR = {
  /** Seconds between two radio lines. */
  gap: 10,
  /** Seconds a radio line holds the floor (it is on screen 7 s); a Signal holds it for `signal`. */
  hold: 7.5,
  signal: 3,
  /** Seconds of quiet after a Moment closes: no Voice, no new Moment. */
  quiet: 15,
  /** Seconds between two Moments, unless the second answers the first (a chained follow-up). */
  moments: 20,
  /** Seconds a line of chatter (not story) may wait before it is dropped. */
  stale: 25,
} as const;

export type Kind = 'voice' | 'signal';
type Held = Extract<GameEvent, { type: 'ping' }> | Extract<GameEvent, { type: 'storyNotice' }>;
interface Line { ev: Held; kind: Kind; at: number; keep: boolean }

const CHATTER_IDS = new Set(CHATTER.map((c) => c.id));
/** Whether an event is a Voice or a Signal the floor paces, and which. */
export const kindOf = (e: GameEvent): Kind | null => (e.type === 'ping' ? 'voice' : e.type === 'storyNotice' ? 'signal' : null);

export class Floor {
  private q: Line[] = [];
  private floorUntil = -Infinity;
  private lastVoice = -Infinity;
  private quietUntil = -Infinity;
  private momentClosed = -Infinity;
  private momentOpen = false;
  /** Lines already let out, so a later take does not hold them again. */
  private out = new WeakSet<object>();
  /** Every line let out, in order, with its time: what the budget test reads. */
  readonly log: Array<{ t: number; kind: Kind | 'moment' | 'close'; id: string }> = [];

  /** Take the Voices and Signals out of a step's events (in place) into the queue. */
  take(events: GameEvent[], now: number): void {
    for (let i = 0; i < events.length; i++) {
      const e = events[i]!, kind = kindOf(e);
      if (!kind || this.out.has(e)) continue;
      const ev = e as Held;
      this.q.push({ ev, kind, at: now, keep: kind === 'signal' || !(ev.type === 'ping' && CHATTER_IDS.has(ev.id)) });
      events.splice(i--, 1);
    }
  }

  /** Let the next line out if the floor is free. Lines keep the order they were made in: the story is told in order. */
  step(now: number, free: boolean): Held | null {
    this.q = this.q.filter((l) => l.keep || now - l.at < FLOOR.stale);
    if (!free || this.momentOpen || now < this.floorUntil || !this.q.length) return null;
    const pick = this.q[0]!;
    if (pick.kind === 'voice' && (now < this.quietUntil || now - this.lastVoice < FLOOR.gap)) return null;
    this.q.shift();
    if (pick.kind === 'voice') { this.lastVoice = now; this.floorUntil = now + FLOOR.hold; }
    else this.floorUntil = now + FLOOR.signal;
    this.log.push({ t: now, kind: pick.kind, id: pick.ev.type === 'ping' ? pick.ev.id : pick.ev.headline });
    this.out.add(pick.ev);
    return pick.ev;
  }

  /** A card went up. */
  opened(now: number, id: string): void {
    this.momentOpen = true;
    this.log.push({ t: now, kind: 'moment', id });
  }

  /** The card came down: the quiet window starts. */
  closed(now: number): void {
    if (!this.momentOpen) return;
    this.momentOpen = false;
    this.momentClosed = now;
    this.log.push({ t: now, kind: 'close', id: '' });
    this.quietUntil = Math.max(this.quietUntil, now + FLOOR.quiet);
    this.floorUntil = Math.max(this.floorUntil, now + 1);
  }

  /** Whether a new Moment may go up: nothing open, and the gap since the last one has passed. */
  mayMoment(now: number): boolean {
    return !this.momentOpen && now - this.momentClosed >= FLOOR.moments;
  }

  /** Drop waiting Voices (Sam's lines still waiting when his card opens), by a test on the event. */
  drop(test: (e: Held) => boolean): void {
    this.q = this.q.filter((l) => !test(l.ev));
  }

  /** Story lines still to be said: a card waits for them, so the story keeps its order. */
  get holding(): boolean { return this.q.some((l) => l.keep); }

  /** A card waits while a story line is queued or any line is still on screen: it never cuts a voice off. */
  busy(now: number): boolean { return this.holding || now < this.floorUntil; }

  /** Lines still waiting. */
  get waiting(): number { return this.q.length; }
}
