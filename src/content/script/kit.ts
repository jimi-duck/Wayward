import type { Row, Tone } from '../../sim/script';

// ── a script's building blocks ─────────────────────────────────────────────
// Small makers for the rows of the road past the Reach (legs.ts, arrivals.ts),
// so each row reads as the Script has it: who says what, when, and on what.

type Extra = Partial<Row>;

export const radio = (id: string, stop: string, on: Row['on'], from: string, caller: string, text: string, extra: Extra = {}): Row =>
  ({ id, stop, on, do: { radio: { from, caller, text } }, ...extra });
export const notice = (id: string, stop: string, on: Row['on'], tone: Tone, headline: string, reason?: string, extra: Extra = {}): Row =>
  ({ id, stop, on, do: { notice: { tone, headline, reason } }, ...extra });
export const objective = (id: string, stop: string, on: Row['on'], main?: string, quiet?: string, extra: Extra = {}): Row =>
  ({ id, stop, on, do: { objective: { main, quiet } }, ...extra });
export const card = (id: string, stop: string, on: Row['on'], def: string, extra: Extra = {}): Row => ({ id, stop, on, do: { card: def }, ...extra });
export const wall = (id: string, stop: string, on: Row['on'], flag: string, extra: Extra = {}): Row => ({ id, stop, on, do: { wall: flag }, ...extra });

/** A stop's main card: the gate holds for it, and no job rings before it. */
export const main = (id: string, stop: string, on: Row['on'], def: string, extra: Extra = {}): Row => card(id, stop, on, def, { main: true, ...extra });

export const arrive = (delay = 2): Row['on'] => ({ on: 'arrive', delay });
export const free = (after = 6): Row['on'] => ({ on: 'free', after });
export const settle = (): Row['on'] => ({ on: 'settle' });
export const after = (row: string, delay = 0): Row['on'] => ({ on: 'after', row, delay });
export const flag = (f: string): Row['on'] => ({ on: 'flag', flag: f });
export const leave = (): Row['on'] => ({ on: 'leave' });
export const relay = (): Row['on'] => ({ on: 'near', site: 'relay', within: 200 });

/** The people who speak on the road, with the caller their channel shows. */
export const SAM = ['Sam Okoro', 'miners'] as const;
export const PIKE = ['Owen Pike', 'gutter'] as const;
export const HESTER = ['Hester Vane', 'miners'] as const;
export const QUILL = ['Quill', 'frontier'] as const;
export const ANALYST = ['Survey Office · an analyst', 'office'] as const;
export const ACCOUNTS = ['Kellern Recovery · Accounts', 'kellern'] as const;
