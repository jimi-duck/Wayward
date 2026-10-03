import { describe, expect, it } from 'vitest';
import { barsOut } from '../src/ui/bars';

describe("the browser's bars", () => {
  // an iPhone on its side: 393px of screen, 283px of it left with the tab bar out
  const small = 283;
  const large = 393;

  it('are out at the small height, and folded at the large one', () => {
    expect(barsOut(283, small, large)).toBe(true);
    expect(barsOut(393, small, large)).toBe(false);
  });

  it('count as folded once the window is past halfway between the two', () => {
    expect(barsOut(330, small, large)).toBe(true);
    expect(barsOut(345, small, large)).toBe(false);
  });

  it('never count as out where they do not fold (desktop, fullscreen, a Home Screen app)', () => {
    expect(barsOut(600, 600, 600)).toBe(false);
    expect(barsOut(380, 380, 400)).toBe(false);
  });
});
