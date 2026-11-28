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
// and the floor lets them out one at a time on each of its two channels (the radio at the bottom, a notice low in
// the middle): never over a card, never two voices or two notices at once, a Voice only once the last one has been
// read, and no Voice in the quiet window after a Moment (a Signal may go out in it: it names what just happened).
// The two channels do not wait on each other, so a run of notices never holds a voice back (owner, 28 November
// 2026: "voice messages are out of sync with the game"). Lines keep their order on each channel. A line of chatter
// that waited too long is dropped; a story line never is; a line said because she is somewhere or something just
// happened (REACTIVE) goes ahead of the queue, and is dropped if it could not be said while it was still true. Plain data, so the pilots and the tests hear exactly what a player would.

export const FLOOR = {
  /** Seconds between the starts of two radio lines, at least. */
  gap: 6,
  /** Seconds a radio line holds the radio past its time on screen (`lineSecs`): a breath before the next; a Signal holds the notice channel for `signal`, its time on screen (ui/notify.ts SECS). */
  hold: 1.5,
  signal: 5,
  /** Seconds a story line waits for a fight to end before it is said anyway: a short lull, not the whole chase (owner, 28 November 2026: Sam's "the gate's open" came 30 s late). */
  fight: 8,
  /** Seconds of quiet after a Moment closes: no Voice, no new Moment. */
  quiet: 15,
  /** Seconds between two Moments, unless the second answers the first (a chained follow-up). */
  moments: 20,
  /** Seconds a line of chatter (not story) may wait before it is dropped. */
  stale: 25,
  /** Seconds a notice may wait: it says what is true now, so one that waited longer is out of date and is dropped (owner, 23 November 2026: "messages often outdated, stacked"). A notice the story tells is kept. */
  signalStale: 12,
  /** Seconds a line tied to an event (a patrol's challenge, a warning, a wave inbound) may wait: it is said in step with the event or not at all. */
  live: 6,
  /** Seconds after a road arrival that nothing is said but the scan: the camera's sweep over the new system and its title (render/sector.ts) play first. */
  arrival: 9,
  /** Seconds after a card closes in which a Voice made by its answer is a reply: it skips the quiet window and the gap, and waits only for the line on screen. Raiders answer a refusal; Sam answers a fitted launcher. A card's own answer lines (`radio_`) are replies at any delay. */
  reply: 3,
} as const;

/** The one Signal the arrival lets through: it is the title card's last line while the camera sweeps (ui/hud.ts). */
export const SCAN_LINE = 'Scanning for transmissions';

/** Seconds a radio line is on screen: long enough to read at a glance in flight (owner, 22 November 2026: "super quick"). */
export function lineSecs(text: string): number {
  return 3 + 0.35 * text.split(/\s+/).filter(Boolean).length;
}

export type Kind = 'voice' | 'signal';
type Held = Extract<GameEvent, { type: 'ping' }> | Extract<GameEvent, { type: 'storyNotice' }>;
interface Line { ev: Held; kind: Kind; at: number; keep: boolean; reply: boolean; live: boolean; hot: boolean; calm: boolean; scene: boolean }

/** Lines said because something just happened (sim/traffic, stage, mission, den, gantry, claim rules), not because the story reached them. */
const REACTIVE = /^(relay_|patrol|traffic_|say_|warn_|mis_|gantry_|den_|claim_|seed_studied|paint_bay|depot_hail)/;
/** The opening lesson's lines (sim/tutor.ts, `train_`): each is said when the lesson reaches its step or the raiders strike, so it goes ahead of the gap; a story line is never dropped. A later beat of the same voice (`_1`) waits its turn. */
const LESSON = /^train_.*[^\d]$/;
/** Lines of colour tied to no moment (a hauler through a lane just opened): said when there is room, dropped like chatter when there is none. */
const COLOUR = /^lane_open/;
/** A turn in a conversation (sim/script.ts `scene`): it follows the line before it once that is read, without the gap. */
const SCENE = /^scene_/;
/** A line the scene she is in waits on (sim/script.ts CUES): next on the floor, ahead of the queue, the gap and a card's quiet. */
const CUE = /^cue_/;
/** A notice's kind, for replacing one still waiting: its first two words ("Jump Gate holding" and "Jump Gate open" are one kind). */
const family = (headline: string): string => (/^(Relay |Mast awake)/.test(headline) ? 'relay stage' : headline.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
const reactive = (e: Held): boolean => e.type === 'ping' && REACTIVE.test(e.id);

const CHATTER_IDS = new Set(CHATTER.map((c) => c.id));
/** Whether an event is a Voice or a Signal the floor paces, and which. */
const kindOf = (e: GameEvent): Kind | null => (e.type === 'ping' ? 'voice' : e.type === 'storyNotice' ? 'signal' : null);

export class Floor {
  private q: Line[] = [];
  /** The radio is busy until then (a line on screen), and the notice channel until `signalUntil`. */
  private floorUntil = -Infinity;
  private signalUntil = -Infinity;
  private lastVoice = -Infinity;
  private quietUntil = -Infinity;
  private momentClosed = -Infinity;
  private momentOpen = false;
  /** The arrival's hush (FLOOR.arrival): set by the world each step while it lasts. No line but the scan, no Moment. */
  hush = false;
  /** A fight is on: set by the world each step. A story line made before it waits it out; one made in it (an urgent script row) is part of it. */
  fight = false;
  /** A card is due next (set by the world each step): only a story line may go out ahead of it, never chatter or a line said because something happened. */
  cardDue = false;
  /** Lines already let out, so a later take does not hold them again. */
  private out = new WeakSet<object>();
  /** Every line let out, in order, with its time: what the budget test reads. */
  readonly log: Array<{ t: number; kind: Kind | 'moment' | 'close'; id: string; reply?: boolean; wait?: number }> = [];

  /** Take the Voices and Signals out of a step's events (in place) into the queue. */
  take(events: GameEvent[], now: number): void {
    for (let i = 0; i < events.length; i++) {
      const e = events[i]!, kind = kindOf(e);
      if (!kind || this.out.has(e)) continue;
      const ev = e as Held;
      // a card's own answer lines (World.radioLines `radio_`, from Outcome.radio) are replies whatever their delay: they keep the time the card set
      const reply = kind === 'voice' && !this.momentOpen && (now - this.momentClosed < FLOOR.reply || (ev.type === 'ping' && ev.id.startsWith('radio_')));
      // a notice replaces one of its own kind still waiting ("Jump Gate holding", then "Jump Gate open"): only the news is told
      if (ev.type === 'storyNotice') { const k = family(ev.headline); this.q = this.q.filter((l) => !(l.ev.type === 'storyNotice' && !l.ev.main && family(l.ev.headline) === k)); }
      this.q.push({ ev, kind, at: now, keep: ev.type === 'storyNotice' ? !!ev.main || ev.headline === SCAN_LINE : !(ev.type === 'ping' && (CHATTER_IDS.has(ev.id) || reactive(ev) || COLOUR.test(ev.id))), reply, live: reactive(ev), hot: reactive(ev) || (ev.type === 'ping' && LESSON.test(ev.id)), calm: !this.fight, scene: ev.type === 'ping' && SCENE.test(ev.id) });
      events.splice(i--, 1);
    }
  }

  /** Let the next line out if the floor is free. Lines keep the order they were made in: the story is told in order. */
  step(now: number, free: boolean): Held | null {
    this.q = this.q.filter((l) => (l.live ? now - l.at < FLOOR.live : l.keep || now - l.at < (l.kind === 'signal' ? FLOOR.signalStale : FLOOR.stale)));
    if (!free || this.momentOpen || !this.q.length) return null;
    // each channel lets one out at a time: a line waits only for a line of its own kind on screen
    const open = (l: Line) => now >= (l.kind === 'voice' ? this.floorUntil : this.signalUntil);
    const q = this.q.filter((l) => open(l) && !(this.cardDue && l.kind === 'voice' && (!l.keep || l.live)));
    if (!q.length) return null;
    // a line tied to an event goes ahead of the queue, the gap and a card's quiet: it names what is happening now, so later is wrong
    const hot = this.hush ? undefined : q.find((l) => l.hot);
    // a story line made in calm waits out a fight that began after it, so it is heard, not missed under fire (the script holds its
    // own rows in a fight: sim/script.ts); the lines after it go on. A reply is said at once, and no line waits longer than FLOOR.fight
    const waits = (l: Line) => this.fight && l.kind === 'voice' && l.keep && l.calm && !l.reply && now - l.at < FLOOR.fight;
    const cue = this.hush ? undefined : q.find((l) => l.ev.type === 'ping' && CUE.test(l.ev.id));
    const reply = this.hush ? undefined : q.find((l) => l.reply);
    const pick = cue ?? reply ?? hot ?? (this.hush ? q.find((l) => l.ev.type === 'storyNotice' && l.ev.headline === SCAN_LINE) : q.find((l) => !waits(l)));
    if (!pick) return null;
    if (pick.kind === 'voice' && !pick.reply && pick !== cue && ((now < this.quietUntil && !pick.hot) || (!pick.hot && !pick.scene && now - this.lastVoice < FLOOR.gap))) return null;
    this.q.splice(this.q.indexOf(pick), 1);
    if (pick.kind === 'voice') { this.lastVoice = now; this.floorUntil = now + lineSecs((pick.ev as Extract<Held, { type: 'ping' }>).text) + FLOOR.hold; }
    else this.signalUntil = now + FLOOR.signal;
    this.log.push({ t: now, kind: pick.kind, id: pick.ev.type === 'ping' ? pick.ev.id : pick.ev.headline, wait: now - pick.at, ...(pick.reply ? { reply: true } : {}) });
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
    this.signalUntil = Math.max(this.signalUntil, now + 1);
  }

  /** Whether a new Moment may go up: nothing open, and the gap since the last one has passed. */
  mayMoment(now: number, gap: number = FLOOR.moments): boolean {
    return !this.hush && !this.momentOpen && now - this.momentClosed >= gap;
  }

  /** Drop waiting Voices (Sam's lines still waiting when his card opens), by a test on the event. */
  drop(test: (e: Held) => boolean): void {
    this.q = this.q.filter((l) => !test(l.ev));
  }

  /** Story lines still to be said: a card waits for them, so the story keeps its order. A notice never holds a card back: it can follow it
   * (a stream of notices kept Halden's card waiting until she was at the gate, 23 November 2026). */
  get holding(): boolean { return this.q.some((l) => l.keep && l.kind === 'voice'); }

  /** A card waits while a story line is queued or any line is still on screen: it never cuts a voice off. A job's call (`job`) waits only for the arrival's hush and the line on screen: queued notices and radio lines follow it, so a job never waits behind a chain of notices (owner, 13 November 2026: jobs rang 20 s and more after arrival at stops with a zone notice and a story line). */
  busy(now: number, job = false): boolean { return this.hush || (!job && this.holding) || now < this.floorUntil || now < this.signalUntil; }

  /** Lines still waiting. */
  get waiting(): number { return this.q.length; }
}
