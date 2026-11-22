import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { THREN_ROWS } from '../src/content/script/thren';
import { SCRIPT } from '../src/content/script';
import { SWARM_DRAWN, swarmGap } from '../src/sim/breakout';
import { spawnAlien } from '../src/sim/enemies';
import { World } from '../src/sim/world';

// The rising Thren (docs/STORY_DIRECTION.md §3): mining draws them, and gunfire draws more.
describe('the rising Thren', () => {
  it('puts every row in the script, and the Stillwater card exists', () => {
    for (const r of THREN_ROWS) expect(SCRIPT).toContain(r);
    const c = CARDS.find((x) => x.id === 'thren_still')!;
    expect(c.choices.map((x) => x.id)).toEqual(['vent', 'speak', 'fight']);
    expect(c.choices.filter((x) => x.win.calm).length).toBe(1);
    // answering the pattern calms them only once the knot has heard her (sim/speak.ts)
  });

  it('brings the next knot sooner after gunfire than any swarm gap would', () => {
    for (const thren of [0.3, 0.6, 1]) expect(SWARM_DRAWN).toBeLessThan(swarmGap(thren, 0));
  });

  it('draws one knot at a time: firing on, it brings no more until the Thren are gone', () => {
    const w = new World(3, { mode: 'breakout' });
    const b = w.bk!;
    b.def = { ...b.def, thren: 1, quiet: false };
    const m = spawnAlien('scout', w.ship, 0, w.rng, { x: w.ship.x + 20, y: 0, z: w.ship.z }, { variant: 'mote' });
    w.aliens.push(m);
    const draw = (t: number) => (w as unknown as { gunfireDraws(t: number): void }).gunfireDraws(t);
    b.nextSwarm = 1000;
    draw(10);
    expect(b.nextSwarm).toBe(10 + SWARM_DRAWN);
    b.nextSwarm = 1000;
    draw(20);
    expect(b.nextSwarm).toBe(1000);
    // the field clears, and the next fight can draw again
    w.aliens.length = 0;
    draw(30);
    w.aliens.push(m);
    draw(40);
    expect(b.nextSwarm).toBe(40 + SWARM_DRAWN);
  });
});
