import type { Holder } from '../content/systems';

// ── sites ─────────────────────────────────────────────────────────────────
// A place that senses the game round it. The port was scenery: one model, one
// ring, a shield switch. A Site is the small brain every place shares: it
// reads a few signals the world already has (a fight close by, the hunt, the
// traffic about its ring), keeps a mood, and the renderer and the scope read
// the mood (lamps, window rows, the scope mark). Plain data, no Three.js, no
// random draws, nothing saved: the mood is the run's clock, the look is the
// holder. See docs/SITES.md.

/** How a place stands right now. Calm: nothing near. Busy: ships working about it. Alert: a hunt on you or a fight near. Shut: the field is up. */
export type Mood = 'calm' | 'busy' | 'alert' | 'shut';
const RANK: Record<Mood, number> = { calm: 0, busy: 1, alert: 2, shut: 3 };

/** What a port looks like, by who holds it. */
export type PortStyle = 'frontier' | 'kellern' | 'gutter' | 'holdfast' | 'guild';

/** The port's look from the system's holder; Frontier Supply's plain depot for anyone without a style of their own. */
export function portStyleOf(holder: Holder | undefined): PortStyle {
  switch (holder) {
    case 'kellern': return 'kellern';
    case 'gutter': return 'gutter';
    case 'holdfast': return 'holdfast';
    case 'guild': return 'guild';
    default: return 'frontier';
  }
}

/** The hunt (0 to 1) from which a port watches the ship; the Custody's patrols use the same 0.6 (docs/TRAFFIC.md). */
export const ALERT_HEAT = 0.6;
/** Working ships (wards) about the ring that make it busy, and how near they must be (units). */
export const BUSY_SHIPS = 2;
export const BUSY_R = 140;
/** Seconds a mood is held after what raised it has passed, so a lamp row does not flicker. */
export const MOOD_HOLD = 4;

export interface Signals {
  /** The depot's shield is up (a fight is on near the ring). */
  shield: boolean;
  /** Committed hostiles near the ring. */
  fight: number;
  /** The hunt on the ship, 0 to 1. */
  heat: number;
  /** Wards (haulers, patrols, port traffic) about the ring. */
  ships: number;
}

/** The mood the signals call for, before any holding. */
export function moodOf(s: Signals): Mood {
  if (s.shield) return 'shut';
  if (s.fight > 0 || s.heat >= ALERT_HEAT) return 'alert';
  if (s.ships >= BUSY_SHIPS) return 'busy';
  return 'calm';
}

/** A site's mood over time: it rises at once and falls after `MOOD_HOLD`. */
export class SiteBrain {
  mood: Mood = 'calm';
  private hold = 0;

  step(dt: number, s: Signals): Mood {
    const want = moodOf(s);
    if (RANK[want] >= RANK[this.mood]) {
      this.mood = want;
      this.hold = MOOD_HOLD;
    } else if ((this.hold -= dt) <= 0) {
      this.mood = want;
      this.hold = MOOD_HOLD;
    }
    return this.mood;
  }

  reset(): void { this.mood = 'calm'; this.hold = 0; }
}

/** How bright a place's lamps and window rows stand in each mood (1 is the old fixed look). */
export const MOOD_LIGHT: Record<Mood, number> = { calm: 0.8, busy: 1.15, alert: 1, shut: 1 };
/** How far a mood turns the lamps from warm white towards amber, 0 to 1. Never red: red is the threat's colour only. */
export const MOOD_AMBER: Record<Mood, number> = { calm: 0, busy: 0, alert: 0.7, shut: 1 };
