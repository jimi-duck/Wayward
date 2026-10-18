import { LESSON_NODE } from './tutor';
import { cost } from './bay';

// ── Contract 08-441 ───────────────────────────────────────────────────────
// The opening's work order (docs/ONBOARDING.md). Juno flies a leased hauler
// under a Cerro extraction contract. Nothing here is a payroll simulation:
// two small ledgers read the live game (the Cyrite mined, the price of the
// first upgrade), and one number rides in the carry (`Carry.contract`) from
// the outlying mine to the controlled space beyond the gate. All amounts are
// Cyrite. The figures are design targets, tuned in docs/BALANCE-STORY-REWRITE.md.

export const CONTRACT_ID = '08-441';
/** What the contract asks for, and what had been delivered when the story opens (the player starts "nearly there"). */
export const QUOTA = 100;
export const DELIVERED_AT_START = 80;

/** The company's cuts, taken before Juno sees anything. */
export const CUTS = { refinery: 40, lease: 12, reserve: 20, escrow: 6 } as const;
/** The short-delivery penalty added when the minimum is missed, in place of the escrow. */
export const PENALTY = 15;

export type RowTone = '' | 'mine' | 'warn' | 'bad';
/** One line of a ledger: an English label, and either an amount (Cyrite) or a word. The panel runs both through t(). */
export interface LedgerRow { k: string; n?: number; v?: string; tone?: RowTone }

/** What the first upgrade costs, financed against the lease. */
export const upgradePrice = (): number => cost(LESSON_NODE, 1, false);

/** The settlement as it would read if the contract were delivered: the gross melts into cuts. */
export function bayLedger(price = upgradePrice()): LedgerRow[] {
  const left = QUOTA - CUTS.refinery - CUTS.lease - CUTS.reserve - CUTS.escrow - price;
  return [
    { k: 'Gross yield', n: QUOTA },
    { k: 'Refinery allocation', n: -CUTS.refinery },
    { k: 'Equipment lease', n: -CUTS.lease },
    { k: 'Fuel reserve', n: -CUTS.reserve },
    { k: 'Penalty escrow', n: -CUTS.escrow },
    { k: 'Upgrade instalment', n: -price, tone: 'warn' },
    left >= 0 ? { k: 'Your credit', n: left, tone: 'mine' } : { k: 'You would owe', n: -left, tone: 'bad' },
  ];
}

/** Cyrite counted toward the contract: what was delivered before, and what this run brought. */
export const deliveredOf = (got: number): number => DELIVERED_AT_START + Math.max(0, Math.round(got));

/** What Juno owes once the minimum is missed: the penalty, this period's lease and the financed upgrade. */
export const owed = (financed: boolean, price = upgradePrice()): number => PENALTY + CUTS.lease + (financed ? price : 0);

/** The short-delivery result: the minimum, the cargo, the payout withheld, and the balance. */
export function breachLedger(got: number, financed: boolean, price = upgradePrice()): LedgerRow[] {
  const d = deliveredOf(got);
  return [
    { k: 'Contract minimum', n: QUOTA },
    { k: 'Delivered', n: d },
    // only when the quota was reached after all: late is still a breach
    ...(d >= QUOTA ? [{ k: 'Delivery window', v: 'Closed', tone: 'bad' as const }] : []),
    { k: 'Payout', v: 'Withheld', tone: 'bad' },
    { k: 'Short-delivery penalty', n: -PENALTY, tone: 'warn' },
    { k: 'Vessel lease', n: -CUTS.lease, tone: 'warn' },
    ...(financed ? [{ k: 'Upgrade instalment', n: -price, tone: 'warn' as const }] : []),
    { k: 'Balance owed', n: owed(financed, price), tone: 'bad' },
  ];
}

/** The recovery order: what ends, and what stays payable. */
export function recoveryLedger(financed: boolean, price = upgradePrice()): LedgerRow[] {
  return [
    { k: 'Vessel lease', v: 'Terminated', tone: 'bad' },
    { k: 'Accreditation', v: 'Suspended', tone: 'warn' },
    { k: 'Asset recovery', v: 'Active', tone: 'bad' },
    { k: 'Balance owed', n: owed(financed, price), tone: 'bad' },
  ];
}

export type LedgerKind = 'bay' | 'breach' | 'recovery';

/** The rows a card shows, from the live carry (the sim's side; the panel only draws them). */
export function ledgerFor(kind: LedgerKind, carry: { contract?: { got: number }; flags: readonly string[] }): LedgerRow[] {
  const financed = carry.flags.includes('lease_financed');
  if (kind === 'bay') return bayLedger();
  if (kind === 'breach') return breachLedger(carry.contract?.got ?? 0, financed);
  return recoveryLedger(financed);
}
