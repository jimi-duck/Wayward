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
 * What the company bills when the contract breaches (the opening chapter sheets, 2026-10-22): the short-delivery penalty,
 * the lease that was due anyway, and the launcher it financed. The projected settlement is never netted against it.
 */
export const PENALTY = 15;
export const LEASE_DUE = CUTS.lease;
/** What Juno owes once the contract breaches. */
export const owed = (price = upgradePrice()): number => PENALTY + LEASE_DUE + price;

export type RowTone = '' | 'mine' | 'warn' | 'bad';
/**
 * One line of a ledger: an English label, and an amount or a word. `n` is Cyrite cargo, `cr` is credit (the purse), `v`
 * is a word or a preformatted figure. The panel runs the label and the word through t().
 */
export interface LedgerRow { k: string; n?: number; cr?: number; v?: string; tone?: RowTone }

/** A figure of the cargo, read as "800 / 1,000". */
export const ratio = (n: number, m = QUOTA): string => `${n.toLocaleString('en')} / ${m.toLocaleString('en')}`;

/** The Work Bay's projection: what 1,000 Cyrite would settle for once the company's charges, the launcher among them, are taken. Not earned, and not a balance. */
export function bayLedger(): LedgerRow[] {
  const price = upgradePrice();
  return [
    { k: 'Gross', cr: GROSS },
    { k: 'Projected charges', cr: -(GROSS - projectedAfterLauncher(price)) },
    { k: 'Projected settlement', cr: projectedAfterLauncher(price), tone: 'mine' },
  ];
}

/** The torpedo launcher's price, on the bay's card under the projection. */
export function launcherLedger(): LedgerRow[] {
  return [...bayLedger(), { k: 'Torpedo launcher', cr: upgradePrice(), tone: 'warn' }];
}

/** The breach notice: only what is owed. The invoice behind it has the lines. */
export function breachLedger(): LedgerRow[] {
  return [{ k: 'Outstanding', cr: owed(), tone: 'bad' }];
}

/** The breach invoice: the penalty, the lease and the financed launcher. */
export function invoiceLedger(): LedgerRow[] {
  return [
    { k: 'Penalty', cr: PENALTY },
    { k: 'Lease', cr: LEASE_DUE },
    { k: 'Financed launcher', cr: upgradePrice() },
    { k: 'Outstanding', cr: owed(), tone: 'bad' },
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

/** The registry's notice once the lock is lifted: what changed, and what did not. */
export function renameLedger(): LedgerRow[] {
  return [
    { k: 'Registry status', v: 'Unregistered', tone: 'warn' },
    { k: 'Owner lock', v: 'Lifted', tone: 'warn' },
    { k: 'Hull finish', v: 'Grey → Yellow / Ochre', tone: 'warn' },
  ];
}

/** The archive's finding, on its card: where it points. */
export function archiveLedger(): LedgerRow[] {
  return [{ k: 'Next lead', v: 'Halden’s Reach', tone: 'warn' }];
}

/** The archive record, opened on request. No date, time or reference that is not known. */
export function evidenceLedger(): LedgerRow[] {
  return [
    { k: 'Reserve level', v: '94%', tone: 'mine' },
    { k: 'Record and order', v: 'same day' },
    { k: 'Next lead', v: 'Halden’s Reach', tone: 'warn' },
  ];
}

const LEDGERS = {
  bay: bayLedger, launcher: launcherLedger, breach: breachLedger, invoice: invoiceLedger, seized: seizedLedger,
  rename: renameLedger, archive: archiveLedger, evidence: evidenceLedger,
} as const;
export type LedgerKind = keyof typeof LEDGERS;

/** The rows a card or its document shows (the sim's side; the panel only draws them). */
export function ledgerFor(kind: LedgerKind): LedgerRow[] {
  return LEDGERS[kind]();
}

/** The cargo as the HUD reads it: what is aboard, what the Work Bay has counted, and what the contract asks. */
export interface Cargo { onboard: number; delivered: number; quota: number; hold: number }
