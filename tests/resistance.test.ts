import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { RESISTANCE_ROWS } from '../src/content/script/resistance';
import { SCRIPT } from '../src/content/script';

// The divided resistance (docs/STORY_DIRECTION.md, plan priority 4): three scenes, no perfect rebels.
describe('the divided resistance', () => {
  it('puts every row in the script, and every card it plays exists', () => {
    for (const r of RESISTANCE_ROWS) expect(SCRIPT).toContain(r);
    for (const r of RESISTANCE_ROWS) if ('card' in r.do) expect(CARDS.some((c) => c.id === (r.do as { card: string }).card)).toBe(true);
  });

  it('gives the Saints card a price on every answer that acts', () => {
    const c = CARDS.find((x) => x.id === 'saints_relay')!;
    expect(c.choices.map((x) => x.win.flag)).toEqual(['saints_helped', 'saints_stopped', 'saints_ignored']);
  });

  it('lets the strike seize the yard or bargain for passes', () => {
    const c = CARDS.find((x) => x.id === 'story_crew')!;
    const flags = c.choices.flatMap((x) => [x.win.flag ?? []].flat());
    expect(flags).toContain('strike_seized');
    expect(flags).toContain('strike_passes');
  });
});
