import type { CardDef, Weight } from './comms';
import type { Moment } from '../content/chatter';
import type { Rng } from './rng';

// ── the comms desk ────────────────────────────────────────────────────────
// Everything in a sortie that wants to talk to the player goes through here,
// so nothing fires on its own clock and the player is never bombarded. The
// world offers a card (or asks for a line of chatter); the desk decides when
// it may be heard, by its weight and by what the player is doing:
//
//   major      full panel, world waits. A story beat, Calloway, a captain, a
//              blockade, a shakedown. Rare. Waits for a clear sky.
//   important  a small call that rides along while you fly: a warning, a plea,
//              a follow-up. Waits for a clear sky, a pause since the last call.
//   routine    the same card, lighter: a job, a trade, a rumour. Waits longer
//              and lapses if the moment passes.
//   ambient    one line on the radio, no answer. Never stops anything; held
//              only in a fight or on a jump or a dock.
//
// What a player is doing (`Busy`): fighting, cutting rock, flying tight
// through rock, jumping or docking, or free. Only a free sky hears a card.
// New cards do not come on a timer: they come on an opportunity, a fight won,
// a hold filling up, or a long quiet, and at most a few a sortie. The same
// rules run in the pilot and the tests, because the desk is plain data.

export type Busy = 'free' | 'cutting' | 'tight' | 'fight' | 'transit';

/** The hush of a journey that has not spoken yet: a long quiet, in seconds. */
export const HUSH = 600;

export const DESK = {
  /** A hostile this close (units) is a fight; a rock this close past its edge, at speed, is tight flying. */
  threat: 90,
  tight: 14,
  /** Seconds after arriving before a card may open (a radio line may come sooner). */
  arrive: 20,
  /** Seconds of clear sky after the last hostile before a card opens, major/important and routine. */
  settle: { major: 4, important: 6, routine: 12, ambient: 0 } as Record<Weight, number>,
  /** Seconds after the beam stops before a card opens. */
  cutSettle: 3,
  /** Seconds since the last card closed before this weight may open. */
  gap: { major: 180, important: 150, routine: 220, ambient: 0 } as Record<Weight, number>,
  /** The gap an eager (scene) call waits instead, seconds since the last card closed. */
  eager: 50,
  /** Seconds a call stays up unanswered, then lapses. */
  window: { important: 30, routine: 22 },
  /** Seconds a queued card waits before it is dropped. */
  stale: { major: Infinity, important: 300, routine: 120, ambient: 20 } as Record<Weight, number>,
  /** The chance a sortie has a card by chance at all (times the system's call rate): most sorties have none. */
  chance: 0.4,
  /** Seconds of free flight with nothing said before a long quiet is itself an opportunity. */
  quiet: 170,
  /** How long an opportunity (a fight won, a full hold) stays good. */
  opportunity: 100,
  /** Radio lines: seconds between, a sortie's most, seconds a line stays up, and the least between two. */
  ping: { between: [240, 420] as const, max: 2, show: 7, least: 60, arrive: 0.12, moment: 0.4 },
  /** The chance the open lane's toll is called at the lane mouth, and a routine port call at the port's approach. */
  toll: 0.3,
  portNews: 0.5,
};

export interface Ask {
  def: CardDef;
  tier: Weight;
  at: number;
  /** Place-bound: dropped on docking (the port's approach call). */
  port?: boolean;
  /** A scene's call (sim/stage.ts): it is the point of the system, so it waits for a shorter quiet than a chance call. */
  eager?: boolean;
}

const RANK: Record<Weight, number> = { major: 3, important: 2, routine: 1, ambient: 0 };

export class Desk {
  queue: Ask[] = [];
  /** Clock of the last card closed or opened. */
  lastClose: number;
  lastThreat = -Infinity;
  lastCut = -Infinity;
  lastPing = -Infinity;
  nextPing: number;
  pings = 0;
  chance = 0;
  /** Opportunities and when they lapse. */
  opp: Partial<Record<Moment, number>> = {};
  /** Moments a radio line is wanted for. */
  wish: Array<[Moment, number]> = [];
  arrived = 0;
  /** This sortie has a card by chance (rolled once, at the start). */
  allowed: boolean;

  constructor(rng: Rng, now = 0, rate = 1, hush = HUSH) {
    this.arrived = now;
    this.lastClose = now - hush;
    this.allowed = rng.next() < DESK.chance * rate;
    this.nextPing = now + rng.range(...DESK.ping.between);
  }

  /** Ask to be heard. Offered twice, heard once. */
  offer(def: CardDef, tier: Weight, now: number, port = false, eager = false): void {
    if (this.queue.some((a) => a.def.id === def.id)) return;
    this.queue.push({ def, tier, at: now, port, eager });
  }

  /** What is the player doing. Call every step. */
  watch(busy: Busy, now: number): void {
    if (busy === 'fight') this.lastThreat = now;
    if (busy === 'cutting') this.lastCut = now;
  }

  /** The moment something happened that is worth a word. */
  moment(m: Moment, now: number, rng: Rng): void {
    this.opp[m] = now + DESK.opportunity;
    if (m !== 'calm' && rng.next() < (m === 'arrive' ? DESK.ping.arrive : DESK.ping.moment)) this.wish.push([m, now]);
  }

  /** Whether a card of this weight may open now. */
  may(tier: Weight, busy: Busy, now: number, eager = false): boolean {
    if (busy === 'transit' || busy === 'fight') return false;
    if (tier === 'ambient') return true;
    if (busy !== 'free' || (tier !== 'major' && now - this.arrived < DESK.arrive)) return false;
    if (now - this.lastThreat < DESK.settle[tier] || now - this.lastCut < DESK.cutSettle) return false;
    return now - this.lastClose >= (eager ? Math.min(DESK.eager, DESK.gap[tier]) : DESK.gap[tier]);
  }

  /** Drop what has waited too long (or was bound to a place the ship has left). */
  sweep(now: number, docked: boolean): void {
    this.queue = this.queue.filter((a) => now - a.at < DESK.stale[a.tier] && !(a.port && docked));
  }

  /** The card to open now, if any: the heaviest first, and nothing lighter while a heavier one waits, unless the lighter is a scene's call and the heavier has to wait its gap. */
  next(busy: Busy, now: number): Ask | null {
    const order = [...this.queue].sort((a, b) => RANK[b.tier] - RANK[a.tier] || a.at - b.at);
    const top = order[0] && RANK[order[0].tier];
    const pick = order.find((a) => (RANK[a.tier] === top || a.eager) && this.may(a.tier, busy, now, a.eager));
    if (!pick) return null;
    this.queue.splice(this.queue.indexOf(pick), 1);
    return pick;
  }

  /** A card opened or closed. */
  closed(now: number): void {
    this.lastClose = now;
  }

  /** A new card by chance is welcome: the sortie is one that has one, the opportunity is live (or it has been quiet too long), and nothing else waits. */
  wants(now: number, busy: Busy): boolean {
    if (!this.allowed || this.chance >= 1 || this.queue.length || !this.may('routine', busy, now)) return false;
    const live = (['won', 'haul'] as const).some((m) => (this.opp[m] ?? 0) > now);
    return live || now - Math.max(this.lastClose, this.arrived) >= DESK.quiet;
  }

  /** The chance card was dealt: that opportunity is used. */
  used(): void {
    this.chance++;
    this.opp.won = this.opp.haul = 0;
  }

  /** The moment a radio line is due for, if one is: a wish first, then the quiet between. */
  pingFor(busy: Busy, now: number, rng: Rng): Moment | null {
    if (busy === 'transit' || busy === 'fight' || this.pings >= DESK.ping.max || now - this.lastPing < DESK.ping.least) return null;
    this.wish = this.wish.filter(([, at]) => now - at < DESK.ping.show * 3);
    const wish = this.wish.shift();
    if (wish) return wish[0];
    if (now < this.nextPing) return null;
    this.nextPing = now + rng.range(...DESK.ping.between);
    return 'calm';
  }

  /** A line went out. */
  spoke(now: number): void {
    this.lastPing = now;
    this.pings++;
  }
}
