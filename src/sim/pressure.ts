import { clamp } from '../core/math';

// ── two threats, told apart ───────────────────────────────────────────────
// Wanted is this system's heat (sim/breakout.ts): it rises with lingering and
// fighting, sends more Custody hulls and resets when you leave. Calloway's
// hunt is the campaign's (sim/hunt.ts): it follows the route across systems,
// and her hunch (sim/calloway.ts hunchOf) is what she reads in it. Neither is
// a new meter. This turns each into discrete events, on a threshold crossing
// and never on a frame, so the HUD can say one short thing when something
// changes. Plain data: the words and the places they go are the UI's.

/** Wanted shows four pips (ui/hud.ts); a warning fires on climbing into the second, third and fourth. */
export const wantedPips = (heat: number): number => Math.ceil(clamp(heat, 0, 1) * 4);

/** Heat has to fall this far under a pip's start before it can fire again, so a hand on the edge does not repeat it. */
export const REARM = 0.05;
/** The same warning does not come twice inside this many seconds. */
export const DEBOUNCE = 25;
/** Calloway's "close behind" line: jumps behind you at most. */
export const CLOSE_BEHIND = 1;

export type Act = 'quiet' | 'leave';

export type PressureEvent =
  /** Wanted climbed into pip `level` (2 to 4). `inbound`: hulls are on their way now. `act`: what to do. */
  | { type: 'wanted'; level: number; inbound: boolean; act: Act }
  /** The Custody now sends up to `cap` hulls at once. */
  | { type: 'pursuitUp'; cap: number; act: Act }
  /** The first elite hull of this system has come. */
  | { type: 'eliteSeen'; act: Act }
  /** She has read your route: `kind` is a system kind you keep stopping in, null with `straight` for flying straight at the Threshold. */
  | { type: 'callowayReads'; kind: string | null; straight: boolean }
  /** She is no more than a jump behind and does not stop to ask questions on your route. */
  | { type: 'callowayClose'; kind: string | null; straight: boolean }
  /** What she had read of your route no longer holds. */
  | { type: 'callowayLost' };

/** What the tracker looks at, once per step. */
export interface PressureView {
  /** Seconds into the system. */
  t: number;
  heat: number;
  /** Hulls the pursuit may have out at once. */
  cap: number;
  /** An elite hull is out. */
  elite: boolean;
  /** Hostile hulls are out and coming. */
  inbound: boolean;
  /** Her read now and on the way in (sim/calloway.ts: system kinds and 'straight'). */
  hunch: readonly string[];
  was: readonly string[];
  /** Jumps she is behind you. */
  behind: number;
}

const split = (words: readonly string[]) => ({ kind: words.find((w) => w !== 'straight') ?? null, straight: words.includes('straight') });

/** Watches a sortie and says what changed. One per world; it is not saved (a load starts the system again). */
export class PressureWatch {
  private fired = new Set<number>();
  private cap = -1;
  private elite = false;
  private met = false;
  private close = false;
  private at = new Map<string, number>();

  /** Events for this step: usually none. */
  step(v: PressureView): PressureEvent[] {
    const out: PressureEvent[] = [];
    const say = (key: string, e: PressureEvent) => {
      const last = this.at.get(key);
      if (last !== undefined && v.t - last < DEBOUNCE) return;
      this.at.set(key, v.t);
      out.push(e);
    };
    // ── local: Wanted, the pursuit, the elites ──
    const pip = wantedPips(v.heat);
    if (this.cap < 0) { // the first look is the baseline: arriving hot is not news
      for (let p = 2; p <= pip; p++) this.fired.add(p);
      this.cap = v.cap;
      this.elite = v.elite;
    } else {
      for (let p = 2; p <= 4; p++) if (this.fired.has(p) && v.heat < (p - 1) / 4 - REARM) this.fired.delete(p);
      let top = 0;
      for (let p = 2; p <= pip; p++) if (!this.fired.has(p)) { this.fired.add(p); top = p; }
      if (top) say(`wanted${top}`, { type: 'wanted', level: top, inbound: v.inbound, act: top >= 3 ? 'leave' : 'quiet' });
      if (v.cap > this.cap) say(`cap${v.cap}`, { type: 'pursuitUp', cap: v.cap, act: 'leave' });
      this.cap = v.cap;
      if (v.elite && !this.elite) say('elite', { type: 'eliteSeen', act: 'leave' });
      this.elite = v.elite;
    }
    // ── Calloway: the route, whatever the heat ──
    const now = split(v.hunch), was = split(v.was);
    if (!this.met) {
      this.met = true;
      const gained = (now.kind && now.kind !== was.kind) || (now.straight && !was.straight);
      if (gained) say('reads', { type: 'callowayReads', kind: now.kind && now.kind !== was.kind ? now.kind : null, straight: now.straight && !was.straight });
      else if (!now.kind && !now.straight && (was.kind || was.straight)) say('lost', { type: 'callowayLost' });
    }
    if (!this.close && (now.kind || now.straight) && v.behind <= CLOSE_BEHIND) {
      this.close = true;
      say('close', { type: 'callowayClose', kind: now.kind, straight: now.straight });
    }
    return out;
  }
}
