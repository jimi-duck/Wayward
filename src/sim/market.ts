import { CARD_BY_ID, weightOf } from './comms';
import type { World } from './world';

// ── the Dust Market ───────────────────────────────────────────────────────
// A raft of Dust Traders drifting off the lane in systems the Traders hold.
// Slow inside its ring for two seconds and the stalls call (a card: buy
// warheads or plating for Cyrite, or fly on), without docking. It will not
// open while a fight is near, it moves off from one (and comes back), and it
// has stock for two sales a system. Plain data and the desk's own card rule
// (docs/SITES.md).

export const MARKET_R = 16;
const MARKET_SPEED = 14;
const MARKET_DWELL = 2;
export const MARKET_DEALS = 2;
const MARKET_FEAR_R = 220;
const MARKET_RUN = 10;
/** The ring it keeps clear of its berth when it runs, and how far it may run (units). */
const RUN_MAX = 260;

export type MarketState = 'open' | 'shut' | 'sold';

export class Market {
  x: number; z: number;
  readonly x0: number; readonly z0: number;
  state: MarketState = 'open';
  deals = MARKET_DEALS;
  /** Seconds the ship has waited slow in the ring. */
  dwell = 0;
  /** A card is out for this visit: no second one until the ship has left. */
  private asked = false;
  private t = 0;

  constructor(x: number, z: number) { this.x = this.x0 = x; this.z = this.z0 = z; }

  /** A sale went through (the card's answer): one fewer in stock. */
  sold(): void { if (--this.deals <= 0) this.state = 'sold'; }

  step(w: World, dt: number): void {
    this.t += dt;
    const s = w.ship;
    let fear: { x: number; z: number } | null = null, best = MARKET_FEAR_R;
    for (const a of w.aliens) {
      if (!w.committed(a)) continue;
      const d = Math.hypot(a.x - this.x, a.z - this.z);
      if (d < best) { best = d; fear = a; }
    }
    if (fear) {
      // off and away from the nearest hostile, but never far from its berth
      const d = Math.hypot(this.x - fear.x, this.z - fear.z) || 1;
      if (Math.hypot(this.x - this.x0, this.z - this.z0) < RUN_MAX) {
        this.x += ((this.x - fear.x) / d) * MARKET_RUN * dt;
        this.z += ((this.z - fear.z) / d) * MARKET_RUN * dt;
      }
      if (this.state === 'open') this.state = 'shut';
      this.dwell = 0;
      return;
    }
    // home again, slowly, once the fight is gone
    const hx = this.x0 - this.x, hz = this.z0 - this.z, hd = Math.hypot(hx, hz);
    if (hd > 1) { this.x += (hx / hd) * Math.min(hd, MARKET_RUN * 0.5 * dt); this.z += (hz / hd) * Math.min(hd, MARKET_RUN * 0.5 * dt); }
    if (this.state === 'shut') this.state = 'open';
    if (this.state !== 'open' || !w.alive || w.phase !== 'play') return;
    const d = Math.hypot(s.x - this.x, s.z - this.z);
    if (d > MARKET_R * 3) this.asked = false;
    if (d < MARKET_R && Math.hypot(s.vx, s.vz) < MARKET_SPEED && !this.asked) {
      this.dwell += dt;
      if (this.dwell >= MARKET_DWELL) {
        this.dwell = 0; this.asked = true;
        const def = CARD_BY_ID.market_stall;
        if (def) w.desk.offer(def, weightOf(def), w.runTime);
      }
    } else this.dwell = Math.max(0, this.dwell - dt);
  }
}

/** Where a Dust Traders system's market stands: a third of the way along, well off the line. */
export function marketBerth(x0: number, z0: number, heading: number, lane: number, side: number): { x: number; z: number } {
  const fx = Math.cos(heading), fz = -Math.sin(heading), rx = Math.sin(heading), rz = Math.cos(heading);
  return { x: x0 + fx * lane * 0.3 + rx * side * 150, z: z0 + fz * lane * 0.3 + rz * side * 150 };
}
