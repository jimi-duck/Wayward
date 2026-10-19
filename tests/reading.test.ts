import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';

// ── the reading budget ────────────────────────────────────────────────────
// The comms card is read mid-flight, so every part of it has a cap in words.
// The caps were widened in the copy pass of 2026-10-10 (docs/COPY.md): clear
// beats short, so a line may say what it costs and risks. They still stop the
// journey's cards from growing. A few older lines run over and are
// listed with their own ceiling, so they cannot grow; shorten one and drop
// its row.

const CAP = { title: 7, from: 10, text: 32, line: 15, read: 14, label: 8, hint: 19, win: 16, lose: 13 };
/** Lines already over their cap, held at today's length. */
const LEGACY: Record<string, number> = { 'text story_raiders': 62 };

const words = (s: string) => s.trim().split(/\s+/).length;

function over(): string[] {
  const out: string[] = [];
  const check = (part: keyof typeof CAP, s: unknown, id: string) => {
    if (typeof s !== 'string') return;
    const n = words(s), key = `${part} ${id}`;
    if (n > (LEGACY[key] ?? CAP[part])) out.push(`${key}: ${n} words (cap ${LEGACY[key] ?? CAP[part]}) · ${s}`);
  };
  for (const c of CARDS) {
    check('title', c.title, c.id); check('from', c.from, c.id); check('text', c.text, c.id);
    for (const l of c.lines ?? []) check('line', l.text, c.id);
    for (const t of c.truths ?? []) check('read', t.read, c.id);
    for (const ch of c.choices) {
      const id = `${c.id}:${ch.id}`;
      check('label', ch.label, id); check('hint', ch.hint, id); check('win', ch.win?.text, id); check('lose', ch.lose?.text, id);
    }
  }
  return out;
}

describe('the reading budget', () => {
  it('keeps every part of a comms card within its word cap', () => {
    const long = over();
    expect(long, `${long.length} lines are over:\n${long.join('\n')}`).toEqual([]);
  });

  it('lists only lines that are still over their cap', () => {
    const live = new Map<string, number>();
    for (const c of CARDS) {
      const add = (part: string, s: unknown, id: string) => { if (typeof s === 'string') live.set(`${part} ${id}`, words(s)); };
      add('text', c.text, c.id);
      for (const ch of c.choices) { add('label', ch.label, `${c.id}:${ch.id}`); add('hint', ch.hint, `${c.id}:${ch.id}`); add('win', ch.win?.text, `${c.id}:${ch.id}`); }
    }
    const stale = Object.entries(LEGACY).filter(([k, n]) => (live.get(k) ?? 0) > n || (live.get(k) ?? 0) <= CAP[k.split(' ')[0] as keyof typeof CAP]);
    expect(stale, 'drop the row of a line that is back within its cap').toEqual([]);
  });
});
