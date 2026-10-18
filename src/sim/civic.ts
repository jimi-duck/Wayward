import { t } from '../i18n';

// ── the Civic Score ───────────────────────────────────────────────────────
// The Continuance's administrative judgement of a person: compliance,
// productivity, reliability and how much of a risk the Offices think they
// are. It is not Juno's moral worth, and it is not the Custody's heat,
// a faction's standing, Calloway's hunt or the Net's spread; those mean
// other things and are kept apart. It lives in the carry (`carry.civic`),
// only in the Story: the Arcade has no registry.
//
// A low Score closes Core doors and opens Scatter ones; a high Score is
// easier now and says what it cost. Nothing on the main route needs a high
// or a low Score: every checkpoint has an answer whatever it reads.

/** Where a new Story journey starts: COMPLIANT / LOW MERIT. */
export const CIVIC_START = 412;
export const CIVIC_MAX = 500;
/** The archive wakes on Juno's hand and the registry logs the unauthorised access. */
export const WAKE_DROP = 38;
/** At or above this the registry still vouches for you (the doorway at a checkpoint). */
export const CIVIC_REGISTERED = 400;
/** Below this the Continuance's own fees rise: your access is restricted. */
export const CIVIC_RESTRICTED = 300;
/** The share added to a Continuance fee when the Score is restricted. */
export const RESTRICTED_FEE = 0.25;

export type CivicBand = 'high' | 'low' | 'review' | 'restricted' | 'flagged' | 'near' | 'unperson';

/** The band a Score falls in. */
export function civicBand(n: number): CivicBand {
  if (n >= 450) return 'high';
  if (n >= CIVIC_REGISTERED) return 'low';
  if (n >= CIVIC_RESTRICTED) return 'review';
  if (n >= 200) return 'restricted';
  if (n >= 100) return 'flagged';
  return n > 0 ? 'near' : 'unperson';
}

/** The registry's label for each band. */
export const CIVIC_LABEL: Record<CivicBand, string> = {
  high: 'COMPLIANT / HIGH MERIT',
  low: 'COMPLIANT / LOW MERIT',
  review: 'UNDER REVIEW',
  restricted: 'RESTRICTED',
  flagged: 'FLAGGED',
  near: 'NEAR-UNPERSON',
  unperson: 'UNPERSON',
};

export const civicLabel = (n: number): string => t(CIVIC_LABEL[civicBand(n)]);

/** A Score kept in range, whole. */
export const clampCivic = (n: number): number => Math.max(0, Math.min(CIVIC_MAX, Math.round(n)));

/** Who is the Continuance's own: its fees follow the Score. */
const CONTINUANCE = new Set(['custody', 'office', 'kellern']);

/** The multiplier on a Continuance fee at this Score. */
export function civicToll(caller: string, civic: number | undefined): number {
  return civic !== undefined && civic < CIVIC_RESTRICTED && CONTINUANCE.has(caller) ? 1 + RESTRICTED_FEE : 1;
}

/** The line the HUD shows when the Score moves: what it is now, the band, and why. */
export function civicNote(to: number, why: string | undefined): string {
  const head = t('Civic Score {n} · {band}', { n: to, band: civicLabel(to) });
  return why ? `${head} · ${t(why)}` : head;
}
