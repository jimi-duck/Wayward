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
  /** Seconds a line tied to an event (a patrol's challenge, a warning, a wave inbound) may wait: it is said in step with the event or not at all. */
  live: 6,
  /** Seconds after a road arrival that nothing is said but the scan: the camera's sweep over the new system and its title (render/sector.ts) play first. */
  arrival: 9,
  /** Seconds after a card closes in which a Voice made by its answer is a reply: it skips the quiet window and the gap, and waits only for the line on screen. Raiders answer a refusal; Sam answers a fitted launcher. Under the 3.5 s Sam's breach lines wait, so those keep the quiet. */
  reply: 3,
} as const;

/** The one Signal the arrival lets through: it is the title card's last line while the camera sweeps (ui/hud.ts). */
export const SCAN_LINE = 'Scanning for transmissions';

export type Kind = 'voice' | 'signal';
type Held = Extract<GameEvent, { type: 'ping' }> | Extract<GameEvent, { type: 'storyNotice' }>;
interface Line { ev: Held; kind: Kind; at: number; keep: boolean; reply: boolean; live: boolean; hot: boolean }

/** Lines said because something just happened (sim/traffic, stage, mission, den, gantry, claim rules), not because the story reached them. */
const REACTIVE = /^(relay_|patrol|traffic_|say_|warn_|mis_|gantry_|den_|claim_|seed_studied)/;
/** The opening lesson's lines (sim/tutor.ts, `train_`): each is said when the lesson reaches its step or the raiders strike, so it goes ahead of the gap; a story line is never dropped. A later beat of the same voice (`_1`) waits its turn. */
const LESSON = /^train_.*[^\d]$/;
const reactive = (e: Held): boolean => e.type === 'ping' && REACTIVE.test(e.id);

const CHATTER_IDS = new Set(CHATTER.map((c) => c.id));
/** Whether an event is a Voice or a Signal the floor paces, and which. */
const kindOf = (e: GameEvent): Kind | null => (e.type === 'ping' ? 'voice' : e.type === 'storyNotice' ? 'signal' : null);

export class Floor {
  private q: Line[] = [];
  private floorUntil = -Infinity;
  private lastVoice = -Infinity;
  private quietUntil = -Infinity;
  private momentClosed = -Infinity;
  private momentOpen = false;
  /** The arrival's hush (FLOOR.arrival): set by the world each step while it lasts. No line but the scan, no Moment. */
  hush = false;
  /** Lines already let out, so a later take does not hold them again. */
  private out = new WeakSet<object>();
  /** Every line let out, in order, with its time: what the budget test reads. */
  readonly log: Array<{ t: number; kind: Kind | 'moment' | 'close'; id: string; reply?: boolean }> = [];

  /** Take the Voices and Signals out of a step's events (in place) into the queue. */
  take(events: GameEvent[], now: number): void {
    for (let i = 0; i < events.length; i++) {
      const e = events[i]!, kind = kindOf(e);
      if (!kind || this.out.has(e)) continue;
      const ev = e as Held;
      const reply = kind === 'voice' && !this.momentOpen && now - this.momentClosed < FLOOR.reply;
      this.q.push({ ev, kind, at: now, keep: kind === 'signal' || !(ev.type === 'ping' && (CHATTER_IDS.has(ev.id) || reactive(ev))), reply, live: reactive(ev), hot: reactive(ev) || (ev.type === 'ping' && LESSON.test(ev.id)) });
      events.splice(i--, 1);
    }
  }

  /** Let the next line out if the floor is free. Lines keep the order they were made in: the story is told in order. */
  step(now: number, free: boolean): Held | null {
    this.q = this.q.filter((l) => (l.live ? now - l.at < FLOOR.live : l.keep || now - l.at < FLOOR.stale));
    if (!free || this.momentOpen || now < this.floorUntil || !this.q.length) return null;
    // a line tied to an event goes ahead of the queue, and ahead of the gap: it names what is happening now
    const hot = this.hush ? undefined : this.q.find((l) => l.hot && now >= this.quietUntil);
    const pick = hot ?? (this.hush ? this.q.find((l) => l.ev.type === 'storyNotice' && l.ev.headline === SCAN_LINE) : this.q[0]!);
    if (!pick) return null;
    if (pick.kind === 'voice' && !pick.reply && (now < this.quietUntil || (!pick.hot && now - this.lastVoice < FLOOR.gap))) return null;
    this.q.splice(this.q.indexOf(pick), 1);
    if (pick.kind === 'voice') { this.lastVoice = now; this.floorUntil = now + FLOOR.hold; }
    else this.floorUntil = now + FLOOR.signal;
    this.log.push({ t: now, kind: pick.kind, id: pick.ev.type === 'ping' ? pick.ev.id : pick.ev.headline, ...(pick.reply ? { reply: true } : {}) });
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
  mayMoment(now: number, gap: number = FLOOR.moments): boolean {
    return !this.hush && !this.momentOpen && now - this.momentClosed >= gap;
  }

  /** Drop waiting Voices (Sam's lines still waiting when his card opens), by a test on the event. */
  drop(test: (e: Held) => boolean): void {
    this.q = this.q.filter((l) => !test(l.ev));
  }

  /** Story lines still to be said: a card waits for them, so the story keeps its order. */
  get holding(): boolean { return this.q.some((l) => l.keep); }

  /** A card waits while a story line is queued or any line is still on screen: it never cuts a voice off. A job's call (`job`) waits only for the arrival's hush and the line on screen: queued notices and radio lines follow it, so a job never waits behind a chain of notices (owner, 13 November 2026: jobs rang 20 s and more after arrival at stops with a zone notice and a story line). */
  busy(now: number, job = false): boolean { return this.hush || (!job && this.holding) || now < this.floorUntil; }

  /** Lines still waiting. */
  get waiting(): number { return this.q.length; }
}
