import { describe, expect, it } from 'vitest';
import { REGIONS_LONG } from '../src/content/regions';
import { PALETTE_COUNT, skyFor } from '../src/render/sky';

describe('region skies', () => {
  it('every long-journey region names a palette that exists', () => {
    for (const r of REGIONS_LONG) expect(r.sky ?? r.tier).toBeLessThan(PALETTE_COUNT);
  });
  it('the long journey gives each of its eight regions its own palette', () => {
    const used = REGIONS_LONG.map((r) => r.sky ?? r.tier);
    expect(new Set(used).size).toBe(REGIONS_LONG.length);
  });
  it('a sky is made for every palette', () => {
    for (let i = 0; i < PALETTE_COUNT; i++) expect(skyFor(7, i)).toBeTruthy();
  });
});
