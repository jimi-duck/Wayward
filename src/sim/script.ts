import type { Busy } from './desk';

// ── a stop's script ───────────────────────────────────────────────────────
// The story's lines at a stop (content/script/), played at a safe moment and
// never dropped. A row has a trigger (`on`), an optional condition on flags
// (`if`) and one output (`do`). A triggered row joins a queue and plays in
// order, one at a time:
//
//   radio, notice  · wait while the player fights or jumps, and 2 s apart
//   card           · offered to the comms desk (which waits for a clear sky); the
//                    queue holds until it has been answered
//   objective, wall, pursuit · quiet bookkeeping: done at once, in no queue
//
// A row's `wall` flag is set the moment it triggers, before any line about it
// plays: clues live in the Wall. Rows still waiting at a jump are carried
// (`Script.pending`, saved in `carry.pending`) and play at the next stop's
// first free moment. Plain data: the tests and the pilot run it headless.

export type Tone = 'teal' | 'amber' | 'red' | 'white';

export type Trigger =
  | { on: 'arrive'; delay?: number }
  /** The first free moment, `after` seconds from arriving at the least. */
  | { on: 'free'; after?: number }
  /** Drifting: slow, with a free sky. */
  | { on: 'settle' }
  /** The tank at this share (0 to 1) or more. */
  | { on: 'tank'; share: number }
  /** Within `within` units of a named site (`gate`, `port`, `audit`, or a stop's own). */
  | { on: 'near'; site: string; within: number }
  /** Another row has played, `delay` seconds ago at the least. */
  | { on: 'after'; row: string; delay?: number }
  | { on: 'flag'; flag: string }
  /** The pursuit has closed to this many days or fewer (sim/hunt.ts PURSUIT); never at a breather. */
  | { on: 'pursuit'; days: number }
  /** Near the Jump Gate. */
  | { on: 'leave' };

export type Output =
  | { radio: { from: string; caller: string; text: string } }
  | { notice: { tone: Tone; headline: string; reason?: string } }
  | { objective: { main?: string; quiet?: string } }
  | { card: string }
  | { wall: string }
  | { pursuit: string };

export interface Row {
  id: string;
  /** The stop it belongs to (content/road.ts `script`), or `*` for any stop of the road. */
  stop: string;
  on: Trigger;
  /** Flags it needs, and flags that stop it. */
  if?: { has?: string[]; not?: string[] };
  /** A Wall flag set the moment the row triggers. */
  wall?: string;
  do: Output;
  /** Flavour only: seconds in the queue before it is dropped. Story rows never expire. */
  stale?: number;
}

/** What the world tells the script each step. */
export interface Ctx {
  /** Run time, and when this sortie began. */
  t: number;
  arrived: number;
  busy: Busy;
  /** A free moment (sim/world.ts `scriptFree`): no hostile in range, no fire for 4 s, no card open, no job fight, not in a ring or a jump. */
  free: boolean;
  /** Slow enough to look about. */
  slow: boolean;
  /** The tank, 0 to 1. */
  tank: number;
  /** Days until the pursuit is here, if the player stays (Infinity where none runs). */
  pursuit: number;
  /** Units to a named site (Infinity: not here). */
  dist(site: string): number;
  flags: ReadonlySet<string>;
  /** A card has been answered (or none is open and it was seen). */
  cardDone(id: string): boolean;
}

/** Seconds between two lines, and how near the gate "leave" is. */
export const GAP = 2;
export const LEAVE_R = 900;

export class Script {
  /** Rows by id, for any stop (a carried row may belong to the last one). */
  private readonly all: Map<string, Row>;
  private readonly mine: Row[];
  /** Triggered, waiting their turn (row ids). */
  private queue: Array<{ id: string; at: number; carried: boolean }> = [];
  /** Triggered or played this sortie, and when each was played. */
  private fired = new Set<string>();
  private playedAt = new Map<string, number>();
  private last = -Infinity;
  /** A card out with the desk: nothing else plays until it is answered. */
  private holding: { row: string; card: string } | null = null;

  /**
   * @param rows every row of the script; those of `stop` can trigger here
   * @param seen the ids already played on the journey (`carry.seen`)
   * @param pending the ids carried over a jump (`carry.pending`)
   */
  constructor(rows: readonly Row[], private readonly stop: string, private readonly seen: Set<string>, pending: readonly string[] = []) {
    this.all = new Map(rows.map((r) => [r.id, r]));
    this.mine = rows.filter((r) => (r.stop === stop || r.stop === '*') && !seen.has(r.id));
    for (const id of pending) if (this.all.has(id) && !seen.has(id) && !this.fired.has(id)) { this.fired.add(id); this.queue.push({ id, at: -Infinity, carried: true }); }
  }

  /** Row ids waiting, for the save. */
  pending(): string[] { return [...(this.holding ? [this.holding.row] : []), ...this.queue.map((q) => q.id)]; }
  /** Whether a story line is waiting (the radio's chatter holds back for it). */
  waiting(): boolean { return this.queue.length > 0 || this.holding !== null; }
  played(id: string): boolean { return this.playedAt.has(id) || this.seen.has(id); }

  private cond(r: Row, flags: ReadonlySet<string>): boolean {
    return (r.if?.has ?? []).every((f) => flags.has(f)) && !(r.if?.not ?? []).some((f) => flags.has(f));
  }

  private fires(r: Row, c: Ctx): boolean {
    const o = r.on;
    switch (o.on) {
      case 'arrive': return c.t - c.arrived >= (o.delay ?? 0);
      case 'free': return c.free && c.t - c.arrived >= (o.after ?? 0);
      case 'settle': return c.free && c.slow;
      case 'tank': return c.tank >= o.share;
      case 'near': return c.dist(o.site) <= o.within;
      case 'after': { const at = this.playedAt.get(o.row); return at !== undefined && c.t - at >= (o.delay ?? 0); }
      case 'flag': return c.flags.has(o.flag);
      case 'pursuit': return c.pursuit <= o.days;
      case 'leave': return c.dist('gate') <= LEAVE_R;
    }
  }

  /** One step: what plays now, in order. The caller carries each out. */
  step(c: Ctx): Output[] {
    const out: Output[] = [];
    const play = (id: string, keep = true) => { this.playedAt.set(id, c.t); if (keep) this.seen.add(id); };
    // triggers
    for (const r of this.mine) {
      if (this.fired.has(r.id) || !this.fires(r, c) || !this.cond(r, c.flags)) continue;
      this.fired.add(r.id);
      if (r.wall) out.push({ wall: r.wall });
      const d = r.do;
      if ('objective' in d || 'wall' in d || 'pursuit' in d) { out.push(d); play(r.id); } else this.queue.push({ id: r.id, at: c.t, carried: false });
    }
    // flavour that waited too long
    this.queue = this.queue.filter((q) => { const s = this.all.get(q.id)?.stale; return s === undefined || c.t - q.at < s; });
    // the queue, one at a time
    if (this.holding) { if (!c.cardDone(this.holding.card)) return out; this.seen.add(this.holding.row); this.holding = null; this.last = c.t; }
    const head = this.queue[0];
    if (!head || c.t - this.last < GAP) return out;
    const row = this.all.get(head.id);
    if (!row) { this.queue.shift(); return out; }
    const quiet = c.busy !== 'fight' && c.busy !== 'transit';
    // a carried row waits for a free moment, as does any card
    if (!quiet || ((head.carried || 'card' in row.do) && !c.free)) return out;
    this.queue.shift();
    // a card counts as played once it is answered, so a jump before then carries it
    const card = 'card' in row.do ? row.do.card : null;
    play(row.id, !card);
    this.last = c.t;
    if (card) this.holding = { row: row.id, card };
    out.push(row.do);
    return out;
  }
}
