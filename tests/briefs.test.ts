import { describe, expect, it } from 'vitest';
import { GATES, LEGS } from '../src/content/road';

// The pause card's Objective gives a little more than the HUD: every stop of the road, and every gate it
// arrives at, carries a brief of one or two short sentences (30 words at most).
const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

describe('the stops’ briefs', () => {
  it('gives every stop past the audit dock a brief of 30 words at most', () => {
    const bad: string[] = [];
    LEGS.forEach((rows, leg) => rows.slice(leg === 0 ? 1 : 0).forEach((r) => {
      if (!r.brief) bad.push(`${r.name}: none`);
      else if (words(r.brief) > 30) bad.push(`${r.name}: ${words(r.brief)} words`);
    }));
    expect(bad).toEqual([]);
  });

  it('gives every gate the road arrives at, the Threshold excepted, a brief', () => {
    const bad = GATES.slice(0, -1).filter((g) => !g.brief || words(g.brief) > 30).map((g) => g.script);
    expect(bad).toEqual([]);
  });

  it('never mentions the Civic score', () => {
    const all = [...LEGS.flat().map((r) => r.brief ?? ''), ...GATES.map((g) => g.brief ?? '')].join(' ');
    expect(all).not.toMatch(/civic/i);
  });
});
