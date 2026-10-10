// ── the purse and the tank ────────────────────────────────────────────────
// Cyrite is the one thing found: rock and wrecks give it. The Story's ship
// cooks it as it comes aboard: the refinery fills the drive tank with jump
// fluid first (the jump burns that and nothing else), and what the tank
// cannot take stays Cyrite, the purse: the bay builds with it, the ports sell
// with it, favours are paid in it. The Arcade has the purse only.
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

/** The scale a good tank is read against (the Thren swarms, the old save's tank): two jumps. */
export const TANK_MAX = 40;
/** What the drive tank holds, in jump fluid: the plotted jump and no more. The refinery sends the rest to the purse. */
export const tankFor = (jump: number): number => Math.max(1, jump);

/** A port's price for one unit of jump fluid, in Cyrite, from the Cyrite price on its board (about two). */
export const FLUID_PRICE = 0.4;
export const fluidPrice = (cyritePrice: number): number => Math.max(1, Math.round(cyritePrice * FLUID_PRICE));

/**
 * Cyrite coming aboard in the Story: the tank first, up to `cap`; the rest to
 * the purse. Returns the tank and the purse after.
 */
export function refine(fuel: number, purse: number, cap: number, n: number): { fuel: number; purse: number } {
  const room = Math.max(0, cap - fuel);
  const take = Math.min(room, Math.max(0, n));
  return { fuel: fuel + take, purse: purse + (n - take) };
}
