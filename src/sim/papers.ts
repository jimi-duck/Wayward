import { ORIGIN, type Origin } from '../content/papers';
import { stockLevels } from './bay';

// ── the ship's state and papers ───────────────────────────────────────────
// Two small readings of the world for the bay: what state a tab of the ship is
// in (one mark, so the list reads like a systems console), and what the ship's
// registry says about her. No rule depends on either.

export type Mark = 'over' | 'damaged' | 'ready' | 'stable' | 'offline' | 'none';

export interface MarkCtx {
  /** Over a soft rating (mass or heat) through something fitted here. */
  over: boolean;
  /** The plates are worn and this is where they are mended. */
  damaged: boolean;
  /** How many modules here can be fitted now. */
  ready: number;
  /** Anything fitted here, stock or not. */
  fitted: boolean;
  /** Any module here that could be fitted with more Krail or at a port (not locked out or behind an unfitted one). */
  reachable: boolean;
}

/** The firmest state: overloaded, damaged, an upgrade ready, stable (something fitted), offline (nothing here can be reached), else none. */
export function tabMark(c: MarkCtx): Mark {
  if (c.over) return 'over';
  if (c.damaged) return 'damaged';
  if (c.ready > 0) return 'ready';
  if (c.fitted) return 'stable';
  return c.reachable ? 'none' : 'offline';
}

export const MARK_GLYPH: Record<Mark, string> = { over: '▲', damaged: '!', ready: '◐', stable: '●', offline: '—', none: '' };
export const MARK_WORD: Record<Mark, string> = { over: 'Overloaded', damaged: 'Damaged', ready: 'Upgrade ready', stable: 'Stable', offline: 'Offline', none: '' };

/** The plates are at half or less, and not whole: the hull wants a yard (the same test as the ship's voice). */
export const worn = (plates: number, maxPlates: number): boolean => plates < maxPlates && plates <= Math.ceil(maxPlates / 2);

const sum = (l: Record<string, number>) => Object.values(l).reduce((a, b) => a + b, 0);

export interface Papers {
  /** Anything fitted beyond the stock ship. */
  modified: boolean;
}

export const papersOf = (levels: Record<string, number>): Papers => ({ modified: sum(levels) > sum(stockLevels()) });

/** A module's origin, if it has a stamp. */
export const originOf = (id: string): Origin | undefined => ORIGIN[id];
