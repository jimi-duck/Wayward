import { LESSON_NODE } from './tutor';
import { cost } from './bay';

// ── Contract 08-441 ───────────────────────────────────────────────────────
// The opening's work order (docs/ONBOARDING.md). Juno flies a leased hauler
// under a Cerro extraction contract. Nothing here is a payroll simulation. Four
// things are kept apart, in two units:
//
//   cargo (Cyrite ore, the hold)  · `onboard`: in the hold, not yet counted
//                                 · `delivered`: accepted by the Work Bay, counted against the contract
//   credit (the purse)            · the settlement's net, spent on the rack, then what is left
//   debt (credit owed)            · the short-delivery penalty and the lease, when the contract breaches
//
// The Work Bay's acceptance is the one transition from onboard to delivered. The
// figures are design targets, tuned in docs/BALANCE-STORY-REWRITE.md.

export const CONTRACT_ID = '08-441';
/** What the contract asks for (Cyrite cargo), the hold, and what the first load is. */
export const QUOTA = 1000;
export const HOLD = 1000;
export const FIRST_LOAD = 800;
/** The last of the contract, mined on the second trip and lost to the raiders. */
export const FINAL_LOAD = QUOTA - FIRST_LOAD;
/** Where the hold's meter starts: the shift is already under way, so the first rock tops it up to the load. */
export const HOLD_AT_START = 600;

/** The settlement's gross credit, and the company's cuts, taken before Juno sees anything (all credit). */
export const GROSS = 100;
export const CUTS = { refinery: 40, lease: 12, reserve: 20, escrow: 6 } as const;
/** What is left to Juno once the cuts are taken. */
export const NET = GROSS - CUTS.refinery - CUTS.lease - CUTS.reserve - CUTS.escrow;
/** What the torpedo rack costs, paid from the net (Cyrite credit, the bay's own price). */
export const upgradePrice = (): number => cost(LESSON_NODE, 1, false);
/** What is in the purse once the rack is paid. */
export const balanceAfterRack = (price = upgradePrice()): number => NET - price;

/** The short-delivery penalty added when the contract is missed, and the lease due on top of it (credit). */
export const PENALTY = 15;
export const LEASE_DUE = CUTS.lease;
/** What Juno owes once the contract breaches. */
export const OWED = PENALTY + LEASE_DUE;

export type RowTone = '' | 'mine' | 'warn' | 'bad';
/**
 * One line of a ledger: an English label, and an amount or a word. `n` is Cyrite cargo, `cr` is credit (the purse), `v`
 * is a word or a preformatted figure. The panel runs the label and the word through t().
 */
export interface LedgerRow { k: string; n?: number; cr?: number; v?: string; tone?: RowTone }

/** A figure of the cargo, read as "800 / 1,000". */
export const ratio = (n: number, m = QUOTA): string => `${n.toLocaleString('en')} / ${m.toLocaleString('en')}`;

/** The Work Bay's receipt: the load it takes in, what that counts for, and the credit left after the company's cuts. */
export function bayLedger(): LedgerRow[] {
  return [
    { k: 'Delivered', v: ratio(FIRST_LOAD) },
    { k: 'Remaining', n: FINAL_LOAD },
    { k: 'Gross contract credit', cr: GROSS },
    { k: 'Refinery & handling', cr: -CUTS.refinery },
    { k: 'Vessel lease', cr: -CUTS.lease },
    { k: 'Fuel reserve', cr: -CUTS.reserve },
    { k: 'Reliability escrow', cr: -CUTS.escrow },
    { k: 'Available credit', cr: NET, tone: 'mine' },
  ];
}

/** The short-delivery result: the cargo counted, the shortfall, the payout withheld, the debt. */
export function breachLedger(): LedgerRow[] {
  return [
    { k: 'Contract delivery', v: ratio(FIRST_LOAD) },
    { k: 'Remaining shortfall', n: FINAL_LOAD, tone: 'warn' },
    { k: 'Payout', v: 'Withheld', tone: 'warn' },
    { k: 'Short-delivery penalty', cr: -PENALTY, tone: 'warn' },
    { k: 'Vessel lease due', cr: -LEASE_DUE, tone: 'warn' },
    { k: 'Vessel asset recovery', v: 'Authorised', tone: 'warn' },
    { k: 'Balance owed', cr: OWED, tone: 'bad' },
  ];
}

/** The archive's one record: the reserve figure and the order it contradicts, with whoever signed it struck out. */
export function archiveLedger(): LedgerRow[] {
  return [
    { k: 'Krail reserve status', v: 'Day of shortage order' },
    { k: 'Validated reserves', v: '94% remaining', tone: 'mine' },
    { k: 'Shortage order', v: 'Issued 03:14' },
    { k: 'Authorisation', v: 'Redacted', tone: 'warn' },
    { k: 'Relay reference', v: 'Halden’s Reach' },
    { k: 'Access key', v: 'Legacy · this hull only' },
  ];
}

export type LedgerKind = 'bay' | 'breach' | 'archive';

/** The rows a card shows (the sim's side; the panel only draws them). */
export function ledgerFor(kind: LedgerKind): LedgerRow[] {
  return kind === 'bay' ? bayLedger() : kind === 'breach' ? breachLedger() : archiveLedger();
}

/** The cargo as the HUD reads it: what is aboard, what the Work Bay has counted, and what the contract asks. */
export interface Cargo { onboard: number; delivered: number; quota: number; hold: number }
