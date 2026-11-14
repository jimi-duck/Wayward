import type { Row } from '../../sim/script';
import { flag, free, radio } from './kit';

// ── Continuance Public Service ─────────────────────────────────────────────
// The regime's own voice on the road (docs/STORY_DIRECTION.md §6): short,
// official, plausible broadcasts, each a lie the player will later disprove.
// Addressed to Chartered citizens, about contract residents (the Bonded).
// At most one a stop, never at a breather or the start, and flavour: a
// broadcast that has waited too long for a quiet sky is dropped (`stale`), so
// it never holds a stop or a gate. A few change as Juno acts.

export const CPS = 'Continuance Public Service';
const OFFICE = 'office';
/** Seconds a broadcast may wait for a free sky before it is dropped. */
const STALE = 150;

const say = (id: string, stop: string, text: string, extra: Partial<Row> = {}): Row =>
  radio(id, stop, free(25), CPS, OFFICE, text, { stale: STALE, ...extra });
const when = (id: string, stop: string, f: string, text: string, extra: Partial<Row> = {}): Row =>
  radio(id, stop, flag(f), CPS, OFFICE, text, { stale: STALE, ...extra });

export const BROADCAST_ROWS: Row[] = [
  // ── the Reach: the core's own band ──
  say('cps_northfold', 'northfold', '“Chartered citizens: the Severance keeps you safe. Bonded transit is by employer pass only. Continuity is care.”'),
  say('cps_halden', 'halden', '“A stolen ore hauler, OB-7731-A, is at large. Its pilot is a contract resident. Report unlicensed hulls.”'),
  say('cps_marlow', 'marlow', '“Merit Grants remain open to every contract resident. Contribution is rewarded. The system is operating as designed.”'),
  say('cps_branford', 'branford', '“Unlicensed trade feeds raiders. Pay no toll outside the Continuance. Report the Gutter.”'),
  when('cps_brook_taken', 'copperline', 'brook_taken', '“Kellern clerk Adam Brook is detained for fraud. His Charter is withdrawn. His family is under review.”'),
  when('cps_brook_free', 'copperline', 'brook_free', '“A Custody transport was attacked near Copperline. The contract resident Juno Aster is sought for questioning.”'),
  say('cps_ledger', 'copperline', '“Reports of falsified Kellern accounts are being investigated. Do not share unverified documents.”', { if: { has: ['frag_ledger'] } }),

  // ── the Marches: the relays she woke carry the core's band out ──
  say('cps_wake', 'm_wake', '“This is Commissioner Aurel Thane, Office of Public Record. Juno Aster is armed and dangerous. Do not assist her.”'),
  say('cps_kessel', 'm_kessel', '“The outer worlds failed through their own neglect. The Continuance grieves them. The lanes stay closed for your safety.”'),
  say('cps_tamsin', 'm_tamsin', '“A bounty stands on the stolen hauler OB-7731-A. Bring her in alive. Her debt is owed to us all.”'),
  say('cps_gannet', 'm_gannet', '“Holdfast councils are unlicensed. Contracts signed with them are void. Kellern remains your only lawful buyer.”'),

  // ── the Salvage Belt ──
  say('cps_exchange', 'b_exchange', '“Salvage from the Severance is Continuance property. Wreck records are sealed for the comfort of families.”'),
  say('cps_kiln', 'b_kiln', '“A forged Charter carries permanent Bonded status. Check your papers. Check your neighbour’s.”'),

  // ── the Drift Deep ──
  say('cps_ferry', 'd_ferry', '“Thren activity is rare and contained. The Survey Office finds no link to extraction. Mining is safe.”'),
  say('cps_still', 'd_still', '“Stillwater management has been evacuated safely. Contract crews are instructed to remain at their posts.”'),

  // ── the Breaker Yards ──
  say('cps_nine', 'y_nine', '“Yard Nine builds the ring that keeps you safe. Every Bonded hand here is proud to serve.”'),
  when('cps_strike', 'y_torch', 'crews_stood', '“Illegal stoppages at the Breaker Yards are being resolved. Strikers forfeit their passes. Order is returning.”'),

  // ── the Free Ports ──
  say('cps_duarte', 'f_duarte', '“Commissioner Thane. Juno Aster’s so-called file is a forgery. I will prove it, on every band.”'),
  say('cps_gilt', 'f_gilt', '“Only Chartered testimony is admissible before the Office of Public Record. The law protects you from rumour.”'),

  // ── the Hollows: the band thins out ──
  say('cps_forge', 'h_forge', '“Signal degraded. Public Service cannot be guaranteed beyond this point. Turn back. Turn back.”'),

  // ── the Last Lanes ──
  say('cps_toll', 'l_toll', '“Commissioner Thane. The Scatter’s terrorist nears the last lane. If she opens it, what follows is on her.”'),
];
