// ── one stock ─────────────────────────────────────────────────────────────
// Cyrite is the one thing: the drive burns it, the bay builds with it, the
// ports sell with it, favours are paid in it, and rock and wrecks give it.
// Content rows (cards, fees, prices, the bay's tiers) were written in chits,
// the old unit; a chit is a fifth of a Cyrite, and the engine converts where
// a row meets the stock, so the tuning of those rows stands.

/** Chits to a Cyrite: how the content's old amounts convert. */
export const CHITS_PER_CYRITE = 5;

/** An amount written in chits, as Cyrite: whole, never lost to rounding (a small amount is at least one), and its sign kept. */
export function cy(chits: number): number {
  if (!chits) return 0;
  return Math.sign(chits) * Math.max(1, Math.round(Math.abs(chits) / CHITS_PER_CYRITE));
}
