import { GATES } from '../content/road';
import { count, THREADS } from './threads';

// ── what the flags add up to ──────────────────────────────────────────────
// Some of what the road reads is not one choice but several: how many relays
// are lit, how far each job thread has come, and whether the three proofs
// behind "Show the signature" are in the file by either of their routes
// (docs/overhaul/BEAT_MAP.md §2). The world keeps these as plain flags, set
// from the rest each step (sim/world.ts), so a script row, a card's line or
// an ending can read them like any other flag, and a save keeps nothing new.

/** The flag a road gate's handshake sets: its relay is lit. The Narrows' also sets `relay_broadcast`. */
export const relayFlag = (script: string) => `relay_${script}`;
export const RELAY_FLAGS = GATES.map((g) => relayFlag(g.script));

/** Relays lit on the road. */
export function relaysLit(flags: ReadonlySet<string>): number {
  return RELAY_FLAGS.filter((f, i) => flags.has(f) || (i === 0 && flags.has('relay_broadcast'))).length;
}

/** Counted flags, rebuilt from the rest each time: `relays_<n>` and `thread_<thread>_<n>` for every n reached. */
const COUNTED = /^(relays_\d|thread_[a-z]+_\d)$/;

/**
 * Bring the flags that add up up to date, in place. Counted ones follow the count both ways (a thread can lose steps); the
 * proofs and the strike, once made, stay made.
 */
export function derive(flags: Set<string>): void {
  for (const f of [...flags]) if (COUNTED.test(f)) flags.delete(f);
  for (let n = 1, lit = relaysLit(flags); n <= lit; n++) flags.add(`relays_${n}`);
  for (const t of THREADS) for (let n = 1, c = count(flags, t.id); n <= c; n++) flags.add(`thread_${t.id}_${n}`);
  const has = (f: string) => flags.has(f);
  // the three proofs, each by either route: who was paid, who built the breakers, who was in the room
  if (has('clue_sig_reach') || has('frag_order')) flags.add('sig_paid');
  if (has('clue_sig_yards') || has('clue_sig_serial')) flags.add('sig_built');
  if (has('clue_sig_ports') || has('forty_held') || has('forty_known')) flags.add('sig_room');
  // the strike holds if she stood with the crews and Hester's people were enough to come
  if (has('crews_stood') && has('thread_crews_3')) flags.add('strike_held');
  // Draper shown up with three or more of his jobs on the sheet: a Trade is easier to make
  if (has('draper_revealed') && has('thread_account_3')) flags.add('stalled');
}
