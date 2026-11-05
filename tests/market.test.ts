import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { BASE_PRICES } from '../src/content/systems';
import { STEP } from '../src/core/loop';
import { MARKET_DEALS } from '../src/sim/market';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(holder: 'guild' | 'kellern' = 'guild'): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, situation: undefined, holder, kind: 'mining' as const, thren: 0, port: { name: 'T', prices: { ...BASE_PRICES } } };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}
const hold = (w: World, s: number) => {
  const m = w.market!;
  for (let i = 0; i < Math.round(s / STEP) && w.phase === 'play'; i++) { w.ship.x = m.x + 3; w.ship.z = m.z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 1; w.step(STEP, input()); }
};
const wait = (w: World, s: number) => { for (let i = 0; i < Math.round(s / STEP) && w.phase === 'play'; i++) { w.ship.invuln = 1; w.step(STEP, input()); } };

describe('the Dust Market', () => {
  it('stands only where the Dust Traders hold', () => {
    expect(level('guild').market).toBeTruthy();
    expect(level('kellern').market).toBeNull();
  });

  it('calls its stalls to a ship that waits slow in its ring, and sells', () => {
    const w = level();
    w.cyrite = 100;
    w.powers.yield = 0;
    hold(w, 60);
    expect(w.phase === 'comms' || w.comms?.def.id === 'market_stall').toBe(true);
    expect(w.comms?.def.id).toBe('market_stall');
    w.answer('warheads');
    expect(w.powers.yield).toBe(8);
    expect(w.cyrite).toBe(70);
    expect(w.market!.deals).toBe(MARKET_DEALS - 1);
  });

  it('stays quiet through a fight and runs from it', () => {
    const w = level();
    const m = w.market!;
    const x0 = m.x;
    const a = w.spawnHostile('scout', { x: m.x - 100, y: 0, z: m.z });
    for (let i = 0; i < 120; i++) { a.x = m.x - 100; a.z = m.z; w.ship.x = m.x + 40; w.ship.z = m.z; w.ship.invuln = 1; w.step(STEP, input()); }
    expect(m.state).toBe('shut');
    expect(m.x).toBeGreaterThan(x0);
    wait(w, 1);
  });
});
