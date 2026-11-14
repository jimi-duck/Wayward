import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { THREN_ROWS } from '../src/content/script/thren';
import { SCRIPT } from '../src/content/script';
import { SWARM_DRAWN, swarmGap } from '../src/sim/breakout';

// The rising Thren (docs/STORY_DIRECTION.md §3): mining draws them, and gunfire draws more.
describe('the rising Thren', () => {
  it('puts every row in the script, and the Stillwater card exists', () => {
    for (const r of THREN_ROWS) expect(SCRIPT).toContain(r);
    const c = CARDS.find((x) => x.id === 'thren_still')!;
    expect(c.choices.map((x) => x.id)).toEqual(['vent', 'rig', 'fight']);
    expect(c.choices.filter((x) => x.win.calm).length).toBe(2);
  });

  it('brings the next knot sooner after gunfire than any swarm gap would', () => {
    for (const thren of [0.3, 0.6, 1]) expect(SWARM_DRAWN).toBeLessThan(swarmGap(thren, 0));
  });
});
