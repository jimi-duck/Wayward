import { describe, expect, it } from 'vitest';
import { World, ROLL_CHAIN, ROLL_CHAIN_GAP } from '../src/sim/world';

// Ten barrel rolls in a row pay 1,000 Cyrite in the Story (owner, 6 November 2026).
describe('the roll secret', () => {
  const pay = (w: World, gap: number, n: number): number => {
    const before = w.cyrite;
    for (let i = 0; i < n; i++) {
      w.runTime += gap;
      (w as unknown as { chainRoll(): void }).chainRoll();
    }
    return w.cyrite - before;
  };
  it('pays on the tenth roll in a row, and not on the ninth', () => {
    const w = new World(1);
    expect(pay(w, 1, ROLL_CHAIN - 1)).toBe(0);
    expect(pay(w, 1, 1)).toBe(1000);
  });
  it('starts over after a pause', () => {
    const w = new World(1);
    pay(w, 1, 9);
    expect(pay(w, ROLL_CHAIN_GAP + 1, 1)).toBe(0);
    expect(pay(w, 1, 8)).toBe(0);
    expect(pay(w, 1, 1)).toBe(1000);
  });
});
