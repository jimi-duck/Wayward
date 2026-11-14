import type { Ctx, Outcome } from './comms';
import { gains } from './gains';
import { bounty } from './mission';
import { cy } from './purse';
import { DEBT_TAKES, THREADS } from './threads';
import { t } from '../i18n';

// ── what a job offer says it pays ─────────────────────────────────────────
// The Reward column of a job's call (ui/radio.ts) is read off the scene's win outcome, so the card and the payout cannot drift
// apart: the Cyrite and supplies first (best case, at this depth), then what else the win brings in the card's own short words
// (who likes you more, what you hold, the Wanted bar), then, for a step of the Account, the breach debt it takes off. A loss is
// written with a minus sign, like a cost, so the panel colours it as one.

const ACCOUNT = THREADS.find((x) => x.id === 'account')!.jobs;
/** gains() reads the purse only for amounts that are not plain numbers; a job's pay is plain. */
const NONE = { cyrite: 0, supplies: 0, fuel: 0 } as unknown as Ctx;

export function jobReward(job: string, win: Outcome, k: number, num: (n: number) => string): string[] {
  const pay = bounty(win, k);
  const cyrite = cy(typeof pay.chits === 'number' ? pay.chits : 0) + (typeof pay.cyrite === 'number' ? pay.cyrite : 0);
  const supplies = typeof pay.supplies === 'number' ? pay.supplies : 0;
  const rest = gains({ ...pay, chits: undefined, cyrite: undefined, supplies: undefined }, NONE, 0).map((g) => t(g));
  return [
    ...(cyrite > 0 ? [t('Up to {n} Cyrite', { n: num(cyrite) })] : []),
    ...(supplies > 0 ? [t('+{n} supplies', { n: supplies })] : []),
    ...(ACCOUNT.includes(job) && DEBT_TAKES[job] ? [t('Debt −{n} CR', { n: DEBT_TAKES[job] })] : []),
    ...rest,
  ];
}
