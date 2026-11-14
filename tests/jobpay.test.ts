import { describe, expect, it } from 'vitest';
import { SITUATION_BY_ID } from '../src/content/situations';
import { jobReward } from '../src/sim/jobpay';

const num = (n: number) => String(n);

describe('what a job offer says it pays', () => {
  it('names the Cyrite, the supplies and the standing the win brings', () => {
    const r = jobReward('missing_shift', SITUATION_BY_ID.missing_shift!.win!, 1, num);
    expect(r.some((x) => /Cyrite/.test(x))).toBe(true);
    expect(r.some((x) => /supplies/.test(x))).toBe(true);
    expect(r.length).toBeGreaterThan(2);
  });
  it('names the breach debt for a step of the Account, and only there', () => {
    expect(jobReward('wanted', SITUATION_BY_ID.wanted!.win!, 1, num)).toContain('Debt \u2212250 CR');
    expect(jobReward('recovery_order', SITUATION_BY_ID.recovery_order!.win!, 1, num)).toContain('Debt \u2212300 CR');
    expect(jobReward('dead_drop', SITUATION_BY_ID.dead_drop!.win!, 1, num).join()).not.toMatch(/Debt/);
  });
});
