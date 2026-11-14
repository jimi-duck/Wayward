import { describe, expect, it } from 'vitest';
import { BONDED_RATE, CHARTER_FORGED, CHARTER_STRIPPED, bonded, bondedPrice, stripCharter } from '../src/sim/charter';
import { ON_ROAD } from '../src/content/road';
import { CARDS } from '../src/content/cards';
import { CHARTER_ROWS } from '../src/content/script/charter';
import { SCRIPT } from '../src/content/script';

// The Charter (docs/STORY_DIRECTION.md §2): a yes-or-no status, felt at Kellern pumps and lost to a patrol's check.
describe('the Charter', () => {
  const road = new Set([ON_ROAD]);

  it('charges the Bonded rate only on the road, at a Kellern port, without a Charter', () => {
    expect(bonded(road, 'kellern')).toBe(true);
    expect(bonded(road, 'holdfast')).toBe(false);
    expect(bonded(new Set(), 'kellern')).toBe(false);
    expect(bonded(new Set([ON_ROAD, CHARTER_FORGED]), 'kellern')).toBe(false);
  });

  it('always costs the Bonded more, and the Chartered the posted price', () => {
    for (const p of [1, 2, 3, 5]) {
      expect(bondedPrice(p, true)).toBeGreaterThan(p);
      expect(bondedPrice(p, true)).toBe(Math.ceil(p * BONDED_RATE));
      expect(bondedPrice(p, false)).toBe(p);
    }
  });

  it('loses a forged Charter to a check, once', () => {
    const f = new Set([ON_ROAD, CHARTER_FORGED]);
    expect(stripCharter(f)).toBe(true);
    expect(f.has(CHARTER_FORGED)).toBe(false);
    expect(f.has(CHARTER_STRIPPED)).toBe(true);
    expect(stripCharter(f)).toBe(false);
  });

  it('is sold by a card that exists, and every row is in the script', () => {
    const offer = CARDS.find((c) => c.id === 'charter_offer');
    expect(offer).toBeDefined();
    expect(offer!.choices.some((c) => c.win.flag === CHARTER_FORGED)).toBe(true);
    expect(offer!.choices.some((c) => c.tone === 'refuse')).toBe(true);
    for (const r of CHARTER_ROWS) expect(SCRIPT).toContain(r);
    for (const r of CHARTER_ROWS) if ('card' in r.do) expect(CARDS.some((c) => c.id === (r.do as { card: string }).card)).toBe(true);
  });
});
