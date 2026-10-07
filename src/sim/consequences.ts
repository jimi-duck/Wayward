import { CONSEQUENCES, type Consequence } from '../content/consequences';
import type { Holder } from '../content/systems';

// ── what the flags go on doing ────────────────────────────────────────────
// The rules for content/consequences.ts: given the flags a journey holds and
// the system it is flying, what changes there. Read when a sortie is built
// (sim/journey.ts sortieDef) and when a jump lands.

/** The flag that marks the log having said so, so it does not at every jump. */
export const KEYS_NOTED = 'keys_noted';

/** Where a sortie is: who holds the system, what else is here (sim/scatter.ts presence), and whether it has a port. */
export interface Place { holder: Holder; here: string[]; port: boolean }

const held = (flags: readonly string[]): Consequence[] => CONSEQUENCES.filter((c) => flags.includes(c.flag));

export interface Shift {
  /** A multiplier on the price of plates at the port. */
  plates: number;
  /** The change to the heat at arrival. */
  heat: number;
  /** Added to the share of the pursuit from ahead. */
  ahead: number;
}

/** What the flags change in this system. */
export function shift(flags: readonly string[], at: Place): Shift {
  const out: Shift = { plates: 1, heat: 0, ahead: 0 };
  for (const c of held(flags)) {
    if (at.port && c.plates?.[at.holder] !== undefined) out.plates *= c.plates[at.holder]!;
    if (c.near) {
      if (at.here.includes(c.near.here)) out.heat += c.near.heat; else out.ahead += c.near.elsewhere;
    }
    out.ahead += (c.ahead ?? 0) + (c.aheadAt?.[at.holder] ?? 0);
  }
  return out;
}

/** The log lines for arriving here: where a flag bites. */
export function arrival(flags: readonly string[], at: Place): string[] {
  const out: string[] = [];
  for (const c of held(flags)) {
    for (const l of c.lines) {
      if (l.holder && !(at.holder === l.holder && at.port)) continue;
      if (l.here && !at.here.includes(l.here)) continue;
      out.push(l.text);
    }
  }
  return out;
}

/** Days Calloway is held up at every jump. */
export const delay = (flags: readonly string[]): number => held(flags).reduce((n, c) => n + (c.delay ?? 0), 0);

/** The chips a flag puts on the choice that sets it, if it has consequences. */
export const chipsOf = (flag: string): string[] | undefined => CONSEQUENCES.find((c) => c.flag === flag)?.chips;
