// ── the four job threads of the road ──────────────────────────────────────
// Twenty-five jobs, each pinned to one stop (content/road.ts), make four
// threads that run the length of the road (docs/overhaul/BEAT_MAP.md §4): the
// Quiet Line (Owen Pike, then Quill), Hester's crews, the Survey (Noor Haddad)
// and the Account (Kellern Recovery, which is Draper). A job of a thread
// leaves `job_<id>_<answer>` and `job_<id>_<won|lost|declined>` flags
// (sim/stage.ts); a step counts when its job was won. Everything here is read
// off the flags, so it survives a save and a reload with nothing new to keep.

export type ThreadId = 'line' | 'crews' | 'survey' | 'account';

export interface Thread {
  id: ThreadId;
  name: string;
  contact: string;
  /** Its jobs, in the order the road deals them. */
  jobs: string[];
}

export const THREADS: Thread[] = [
  { id: 'line', name: 'Quiet Line', contact: 'Owen Pike', jobs: ['nothing_to_declare', 'keep_distance', 'dead_drop', 'the_witness', 'finders_keepers', 'needle', 'lose_prefect'] },
  { id: 'crews', name: 'Hester’s crews', contact: 'Hester Vane', jobs: ['follow_cyrite', 'pirate_toll', 'missing_shift', 'one_filter', 'long_walk', 'last_shift', 'kill_zone'] },
  { id: 'survey', name: 'The Survey', contact: 'a Survey analyst', jobs: ['wreck_remembered', 'something_dark', 'voice_wire', 'someone_answered', 'no_return'] },
  { id: 'account', name: 'The Account', contact: 'Kellern Recovery · Accounts', jobs: ['wanted', 'heavy_tanker', 'missing_payroll', 'drift_cache', 'be_bait', 'two_captains'] },
];

export const THREAD_BY_ID = Object.fromEntries(THREADS.map((t) => [t.id, t])) as Record<ThreadId, Thread>;

/** The breach debt the Account starts from, and what each step takes off it (to nothing at the sixth). */
export const ACCOUNT_DEBT = 80;
export const DEBT_STEP = 14;

/** A flag test; a set is used as it is, since this runs every step on the road (sim/evidence.ts `derive`). */
const has = (flags: Iterable<string>) => { const f = flags instanceof Set ? flags : new Set(flags); return (x: string) => f.has(x); };

/** Answers that settle a job some other way: sold, reported, warned off or stripped. Won like that, a job is not a step of its thread. */
const ASIDE = ['sell', 'tell', 'warn', 'strip', 'rob'];

/** Whether a job was won for its thread: taken on and done, not settled aside. */
export const stepWon = (flags: Iterable<string>, job: string): boolean => { const h = has(flags); return h(`job_${job}_won`) && !ASIDE.some((a) => h(`job_${job}_${a}`)); };

/** Jobs of a thread won. */
export function won(flags: Iterable<string>, id: ThreadId): number {
  const list = flags instanceof Set ? flags : new Set(flags);
  return THREAD_BY_ID[id].jobs.filter((j) => stepWon(list, j)).length;
}

/**
 * A thread's count, as its payoffs read it. Hester's crews lose one for the Heavy Tanker (it carried their filters) and two for the
 * Stolen Payroll (their wages), if those were won for the Account.
 */
export function count(flags: Iterable<string>, id: ThreadId): number {
  const list = flags instanceof Set ? flags : new Set(flags);
  let n = won(list, id);
  if (id === 'crews') n -= (stepWon(list, 'heavy_tanker') ? 1 : 0) + (stepWon(list, 'missing_payroll') ? 2 : 0);
  return Math.max(0, n);
}

/** Whether the Account has called yet: any of its jobs offered. */
export const accountCalled = (flags: Iterable<string>): boolean => { const list = [...flags]; return THREAD_BY_ID.account.jobs.some((j) => list.some((f) => f.startsWith(`job_${j}_`))); };

/** What is left of the breach debt, after the Account's steps. */
export const debtLeft = (flags: Iterable<string>): number => Math.max(0, ACCOUNT_DEBT - DEBT_STEP * won(flags, 'account'));

/** The thread a job is in, if any. */
export const threadOf = (job: string): Thread | undefined => THREADS.find((t) => t.jobs.includes(job));
