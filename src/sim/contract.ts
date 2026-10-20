import { LESSON_NODE } from './tutor';
import { cost } from './bay';

// ── Contract 08-441 ───────────────────────────────────────────────────────
// The opening's work order (docs/ONBOARDING.md). Juno flies a leased hauler
// under a Cerro extraction contract. Nothing here is a payroll simulation. Four
// things are kept apart, in two units:
//
//   cargo (Cyrite ore, the hold)  · `onboard`: in the hold; the Work Bay never takes it, only Cerro does, at the end
//   credit (the purse)            · what Juno can spend now: very little
//   financing                     · the torpedo launcher, put on the company's account against the contract's payout
//   debt (credit owed)            · the penalty, the lease and the launcher, when the contract breaches
//
// The figures are design targets, tuned in docs/BALANCE-STORY-REWRITE.md.

export const CONTRACT_ID = '08-441';
/** What the contract asks for (Cyrite cargo) and what the hold carries. */
export const QUOTA = 1000;
export const HOLD = 1000;
/** What is already in the hold when the shift is picked up in flight. */
export const FIRST_LOAD = 800;
/** What each of the opening's two lesson rocks adds to the hold: nothing. The 800 is what she has, from the first minute to the raiders. */
export const ROCK_LOAD = 0;
export const FINAL_LOAD = QUOTA - FIRST_LOAD;
/** Where the hold's meter starts. */
export const HOLD_AT_START = FIRST_LOAD;

/** The contract's gross credit, and the company's cuts, taken before Juno sees anything (all credit). */
export const GROSS = 100;
export const CUTS = { refinery: 40, lease: 12, reserve: 20, escrow: 6 } as const;
/** What the contract leaves once the cuts are taken, before the launcher. */
export const NET = GROSS - CUTS.refinery - CUTS.lease - CUTS.reserve - CUTS.escrow;
/** Credit in the purse at the Work Bay: almost nothing. */
export const CREDIT_START = 4;
/** What the torpedo launcher costs (credit, the bay's own price). The company finances it. */
export const upgradePrice = (): number => cost(LESSON_NODE, 1, false);
/** What the contract would leave Juno with, launcher paid off: the figure the Work Bay shows. */
export const projectedAfterLauncher = (price = upgradePrice()): number => NET - price;

/**
 * What the company bills when the contract breaches, in the same credit as everything else (2026-10-19: made extreme on
 * purpose, to show the unfairness). The cargo it never received is charged at its replacement rate, ten times what a
 * delivery would have paid her; the penalty, the whole lease term and the collection fees come on top, and the financed
 * launcher stays on the account.
 */
export const REPLACEMENT = 1000;
export const PENALTY = 250;
export const LEASE_DUE = 120;
export const COLLECTION = 110;
/** What Juno owes once the contract breaches. */
export const owed = (price = upgradePrice()): number => REPLACEMENT + PENALTY + LEASE_DUE + COLLECTION + price;

export type RowTone = '' | 'mine' | 'warn' | 'bad';
/**
 * One line of a ledger: an English label, and an amount or a word. `n` is Cyrite cargo, `cr` is credit (the purse), `v`
 * is a word or a preformatted figure. The panel runs the label and the word through t().
 */
export interface LedgerRow { k: string; n?: number; cr?: number; v?: string; tone?: RowTone }

/** A figure of the cargo, read as "800 / 1,000". */
export const ratio = (n: number, m = QUOTA): string => `${n.toLocaleString('en')} / ${m.toLocaleString('en')}`;

/** The Work Bay's account: what is held, what is left to spend, and what 1,000 Cyrite would earn after the company's charges. */
export function bayLedger(): LedgerRow[] {
  const price = upgradePrice();
  return [
    { k: 'Cargo held', v: ratio(FIRST_LOAD) },
    { k: 'Available credit', cr: CREDIT_START },
    { k: 'Gross contract credit', cr: GROSS },
    { k: 'Refinery & handling', cr: -CUTS.refinery },
    { k: 'Vessel lease', cr: -CUTS.lease },
    { k: 'Fuel reserve', cr: -CUTS.reserve },
    { k: 'Reliability escrow', cr: -CUTS.escrow },
    { k: 'Torpedo launcher · financed', cr: -price, tone: 'warn' },
    { k: 'Left after charges', cr: projectedAfterLauncher(price), tone: 'mine' },
  ];
}

/** The short-delivery result: nothing delivered, the payout withheld, the debt. */
export function breachLedger(): LedgerRow[] {
  return [
    { k: 'Contract delivery', v: ratio(0), tone: 'warn' },
    { k: 'Payout', v: 'Withheld', tone: 'warn' },
    { k: 'Undelivered cargo · replacement rate', cr: -REPLACEMENT, tone: 'warn' },
    { k: 'Short-delivery penalty', cr: -PENALTY, tone: 'warn' },
    { k: 'Vessel lease due', cr: -LEASE_DUE, tone: 'warn' },
    { k: 'Collection fees', cr: -COLLECTION, tone: 'warn' },
    { k: 'Torpedo launcher · financed', cr: -upgradePrice(), tone: 'warn' },
    { k: 'Vessel asset recovery', v: 'Authorised', tone: 'warn' },
    { k: 'Repayment', v: 'Referral pending', tone: 'warn' },
    { k: 'Balance owed', cr: owed(), tone: 'bad' },
  ];
}

/** The raiders' terms taken: the ship, the cargo and the pilot. */
export function seizedLedger(): LedgerRow[] {
  return [
    { k: 'Cargo', v: 'Seized', tone: 'warn' },
    { k: 'Vessel', v: 'Seized', tone: 'warn' },
    { k: 'Pilot', v: 'Forced labour', tone: 'bad' },
    { k: 'Contract 08-441', v: 'Terminated', tone: 'bad' },
  ];
}

/** Sam's offer: what the override does, said before the player confirms it. */
export function lockLedger(): LedgerRow[] {
  return [
    { k: 'Hull', v: 'Reported stolen', tone: 'bad' },
    { k: 'Debt', v: 'Remains', tone: 'warn' },
    { k: 'Core ports', v: 'Closed', tone: 'warn' },
  ];
}

/** The archive's one record: the reserve figure and the order it contradicts, with whoever signed it struck out. */
export function archiveLedger(): LedgerRow[] {
  return [
    { k: 'Reserves', v: '94% nominal', tone: 'mine' },
    { k: 'Shortage order', v: 'Same day · 23:14' },
    { k: 'Authorisation', v: 'Redacted', tone: 'warn' },
    { k: 'Relay reference', v: 'Halden’s Reach' },
    { k: 'Access key', v: 'Legacy · this hull only' },
  ];
}

export type LedgerKind = 'bay' | 'breach' | 'archive' | 'seized' | 'lock';

/** The rows a card shows (the sim's side; the panel only draws them). */
export function ledgerFor(kind: LedgerKind): LedgerRow[] {
  return kind === 'bay' ? bayLedger() : kind === 'breach' ? breachLedger() : kind === 'seized' ? seizedLedger() : kind === 'lock' ? lockLedger() : archiveLedger();
}

/** The cargo as the HUD reads it: what is aboard, what the Work Bay has counted, and what the contract asks. */
export interface Cargo { onboard: number; delivered: number; quota: number; hold: number }
