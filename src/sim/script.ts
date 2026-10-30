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
//
// A stop's main beats (`main`: its card, an arrival's handshake) hold the Jump
// Gate until they have played (sim/world.ts `gateHeld`). If one still has not
// after the hold's release, `release` carries it on, so it plays first thing
// at the next stop: a beat is never dropped, and once played never returns.

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
  /** Flags it needs, and flags that stop it; `full`: only with the tank over half (true) or at half or under (false). */
  if?: { has?: string[]; not?: string[]; full?: boolean };
  /** A Wall flag set the moment the row triggers. */
  wall?: string;
  do: Output;
  /** A job at this stop does not ring until this row has played (the hub's beat comes before any job). */
  holdsJob?: boolean;
  /** Flavour only: seconds in the queue before it is dropped. Story rows never expire. */
  stale?: number;
  /** A main beat of its stop: the Jump Gate holds until it has played, and a release carries it to the next stop. */
  main?: boolean;
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
  /** Main beats the gate let go of before they triggered: carried to the next stop. */
  private released: string[] = [];

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
  pending(): string[] { return [...(this.holding ? [this.holding.row] : []), ...this.queue.map((q) => q.id), ...this.released]; }
  /** Whether a story line is waiting (the radio's chatter holds back for it). */
  waiting(): boolean { return this.queue.length > 0 || this.holding !== null; }
  /** Whether a hub beat is still due or out: a job's call waits for it. A row that waits on a flag or an earlier row holds only once that has come. */
  holdsJob(flags: ReadonlySet<string>, tank = 0): boolean {
    if (this.holding) return true;
    // a stop's main card comes before any job there (docs/overhaul/BEAT_MAP.md §0.2)
    return this.mine.some((r) => (r.holdsJob || (r.main && 'card' in r.do)) && !this.seen.has(r.id) && this.cond(r, flags, tank) && this.due(r, flags, tank));
  }

  /**
   * Whether a row's trigger could still come at this stop: it waits on nothing, or the flag or earlier row it waits on has come, or
   * is itself due here (a chain of rows leading to a main card counts from its first link).
   */
  private due(r: Row, flags: ReadonlySet<string>, tank: number, depth = 0): boolean {
    if (depth > 24) return false;
    const link = (x: Row) => !this.seen.has(x.id) && this.cond(x, flags, tank) && this.due(x, flags, tank, depth + 1);
    if (r.on.on === 'flag') {
      const f = r.on.flag;
      if (flags.has(f)) return true;
      return this.mine.some((x) => (('card' in x.do && x.do.card === f) || ('wall' in x.do && x.do.wall === f) || x.wall === f) && link(x));
    }
    if (r.on.on === 'after') {
      const id = r.on.row;
      if (this.played(id) || this.fired.has(id)) return true;
      const x = this.all.get(id);
      return !!x && (x.stop === this.stop || x.stop === '*') && link(x);
    }
    if (r.on.on === 'tank') return tank >= r.on.share;
    if (r.on.on === 'pursuit') return false;
    return true;
  }

  /**
   * The main beats still owed here: those that have triggered and not yet played, and those whose trigger is due. `handshake`: one
   * of them waits on the player reaching a site (a relay mast), which no clock should let go of.
   */
  owed(flags: ReadonlySet<string>, tank = 0): { any: boolean; handshake: boolean } {
    let any = false, handshake = false;
    if (this.holding && this.all.get(this.holding.row)?.main) any = true;
    for (const r of this.mine) {
      if (!r.main || this.seen.has(r.id) || this.playedAt.has(r.id) || this.released.includes(r.id)) continue;
      const waiting = this.fired.has(r.id);
      if (!waiting && !(this.cond(r, flags, tank) && this.due(r, flags, tank))) continue;
      any = true;
      if (!waiting && r.on.on === 'near') handshake = true;
    }
    return { any, handshake };
  }

  /** The gate lets go: main beats owed here that have not triggered are carried on, to play first at the next stop. */
  release(flags: ReadonlySet<string>, tank = 0): string[] {
    const out: string[] = [];
    for (const r of this.mine) {
      if (!r.main || this.fired.has(r.id) || this.seen.has(r.id) || !this.cond(r, flags, tank) || !this.due(r, flags, tank) || 'wall' in r.do || 'objective' in r.do) continue;
      this.fired.add(r.id);
      this.released.push(r.id);
      out.push(r.id);
    }
    return out;
  }
  played(id: string): boolean { return this.playedAt.has(id) || this.seen.has(id); }

  private cond(r: Row, flags: ReadonlySet<string>, tank = 0): boolean {
    const full = r.if?.full;
    return (r.if?.has ?? []).every((f) => flags.has(f)) && !(r.if?.not ?? []).some((f) => flags.has(f)) && (full === undefined || full === tank > 0.5);
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
      if (this.fired.has(r.id) || !this.fires(r, c) || !this.cond(r, c.flags, c.tank)) continue;
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
