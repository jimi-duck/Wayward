import type { Stats } from './stats';

// ── self-repair (the arcade) ──────────────────────────────────────────────
// The hull mends itself, slowly, once the ship has been left alone. It is a
// reason to pull out of a fight, not a replacement for repair pickups, the
// shield or careful flying:
//
//   waiting   · no damage for `repairDelay` seconds yet, or a hull already whole
//   repairing · a plate fills at `repairRate` plates a second
//   paused    · danger near (a hostile in range, fire close by, a capital
//               ship fighting): the plate keeps what it has and waits
//   cooling   · a plate is done; the next starts after SELF_REPAIR.cooldown
//   spent     · `repairMax` plates mended in this quiet spell; danger or a
//               hit ends the spell, and the next quiet one starts afresh
//
// A hit stops it at once and throws away the plate in progress. The Story
// mode has its own repair (parts patched into a plate, sim/breakout.ts).

export const SELF_REPAIR = {
  /** Seconds without damage before repairs begin. */
  delay: 6,
  /** Seconds to mend one plate. */
  perPlate: 18,
  /** Plates mended in one quiet spell. */
  max: 1,
  /** Seconds between one mended plate and the next starting. */
  cooldown: 6,
  /** A hostile this close (units) holds the repairs: a little short of its firing range. */
  danger: 60,
  /** Enemy fire this close (units) holds them too. */
  fireDanger: 22,
} as const;

export type MendState = 'waiting' | 'repairing' | 'paused' | 'cooling' | 'spent';

export interface Mend {
  state: MendState;
  /** Of the plate being mended, 0 to 1. */
  progress: number;
  /** Plates mended in this quiet spell. */
  spell: number;
  /** Seconds left to cool before the next plate. */
  cool: number;
}

export const newMend = (): Mend => ({ state: 'waiting', progress: 0, spell: 0, cool: 0 });

export interface MendCtx {
  /** Seconds since the ship last took damage. */
  sinceHit: number;
  plates: number;
  maxPlates: number;
  /** Something dangerous is near (see SELF_REPAIR.danger). */
  danger: boolean;
  stats: Pick<Stats, 'repairDelay' | 'repairRate' | 'repairMax' | 'repairUnderFire'>;
}

/** What a step of repairs did: began a plate, finished one, or nothing to tell. */
export type MendNews = 'start' | 'plate' | null;

/** Advance the repairs by `dt`. On 'plate' the caller adds the plate. */
export function stepMend(m: Mend, c: MendCtx, dt: number): MendNews {
  const st = c.stats;
  const held = c.danger && !st.repairUnderFire;
  // danger ends a quiet spell: the next one gets a fresh allowance
  if (held) m.spell = 0;
  if (m.cool > 0) m.cool = Math.max(0, m.cool - dt);
  if (c.plates >= c.maxPlates || c.sinceHit < st.repairDelay) {
    m.state = 'waiting';
    if (c.plates >= c.maxPlates) m.progress = 0;
    return null;
  }
  if (held) { m.state = 'paused'; return null; }
  if (m.spell >= st.repairMax) { m.state = 'spent'; return null; }
  if (m.cool > 0) { m.state = 'cooling'; return null; }
  const was = m.state;
  m.state = 'repairing';
  m.progress += st.repairRate * dt;
  if (m.progress >= 1) {
    m.progress = 0;
    m.spell++;
    m.cool = SELF_REPAIR.cooldown;
    m.state = m.spell >= st.repairMax ? 'spent' : 'cooling';
    return 'plate';
  }
  return was === 'repairing' ? null : 'start';
}

/** A hit: the plate in progress is lost, and the quiet spell is over. */
export function hurtMend(m: Mend): void {
  m.progress = 0;
  m.spell = 0;
  m.cool = 0;
  m.state = 'waiting';
}
