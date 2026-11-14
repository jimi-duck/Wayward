import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { HEARING_ROWS } from '../src/content/script/hearing';
import { SCRIPT } from '../src/content/script';

// Thane's hearing (docs/STORY_DIRECTION.md §2): Bonded evidence is not admissible; a Chartered voice is.
describe('Thane’s hearing', () => {
  it('is a main beat at Gilt Market, and every row is in the script', () => {
    for (const r of HEARING_ROWS) expect(SCRIPT).toContain(r);
    expect(HEARING_ROWS.filter((r) => r.main).map((r) => r.stop)).toEqual(['f_gilt']);
  });

  it('offers only the Chartered voices she has, and always a way out', () => {
    const c = CARDS.find((x) => x.id === 'story_hearing')!;
    expect(c.choices.find((x) => x.id === 'brook')!.show).toEqual({ flag: 'brook_free' });
    expect(c.choices.find((x) => x.id === 'sign')!.show).toEqual({ flag: 'clue_order_sig' });
    const out = c.choices.find((x) => x.tone === 'refuse')!;
    expect(out.show).toBeUndefined();
    expect(out.win.flag).toBe('hearing_forgery');
  });
});
