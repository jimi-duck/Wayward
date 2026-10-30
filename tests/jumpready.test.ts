import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { JUMP_HYST, JumpWatch } from '../src/sim/jumpready';
import { World } from '../src/sim/world';

describe('the jump-ready watch', () => {
  it('fires once on crossing up, and not again while above', () => {
    const w = new JumpWatch();
    expect(w.step(0, 10, false)).toBeNull();
    expect(w.step(9.9, 10, false)).toBeNull();
    expect(w.step(10, 10, false)).toBe('jumpReady');
    expect(w.step(10, 10, false)).toBeNull();
    expect(w.step(14, 10, false)).toBeNull();
  });

  it('says nothing for a system begun full', () => {
    const w = new JumpWatch();
    expect(w.step(12, 10, false)).toBeNull();
    expect(w.step(13, 10, false)).toBeNull();
  });

  it('says lost once the tank is short, and ready again after, without flicker at the line', () => {
    const w = new JumpWatch();
    w.step(10, 10, false);
    // a hair under the need is not a loss
    expect(w.step(10 - JUMP_HYST + 0.01, 10, false)).toBeNull();
    expect(w.step(10 - JUMP_HYST - 0.01, 10, false)).toBe('jumpLost');
    expect(w.step(8, 10, false)).toBeNull();
    // a pickup that brings it only just back under the line does not fire ready; reaching the need does
    expect(w.step(9.9, 10, false)).toBeNull();
    expect(w.step(10, 10, false)).toBe('jumpReady');
  });

  it('keeps the ready quiet at a port, where the refuel screen says it', () => {
    const w = new JumpWatch();
    w.step(0, 10, true);
    expect(w.step(10, 10, true)).toBeNull();
    // and it counts as ready after: leaving does not fire it
    expect(w.step(10, 10, false)).toBeNull();
  });

  it('is lost when a heavier part raises the need above the tank', () => {
    const w = new JumpWatch();
    w.step(10, 10, false);
    expect(w.step(10, 11, true)).toBe('jumpLost');
  });
});

describe('in the world', () => {
  const frame = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' as const };
  function quiet(): World {
    const w = new World(3, { mode: 'breakout' });
    w.field.rocks = [];
    w.field.bulwarks = [];
    w.bk!.nextPursuit = Infinity;
    w.cardNext = Infinity;
    return w;
  }
  const seen = (w: World) => { const out: string[] = []; for (const e of w.events) if (e.type === 'jumpReady' || e.type === 'jumpLost') out.push(e.type); w.events.length = 0; return out; };

  it('puts jumpReady on World.events when the tank fills, and jumpLost when a heavy part raises the need', () => {
    const w = quiet();
    w.fuel = 0;
    for (let i = 0; i < 30; i++) w.step(STEP, frame);
    expect(seen(w)).toEqual([]);
    w.fuel = w.jumpCost;
    w.step(STEP, frame);
    expect(seen(w)).toEqual(['jumpReady']);
    for (let i = 0; i < 30; i++) w.step(STEP, frame);
    expect(seen(w)).toEqual([]);
    // the ship grows heavy: the same tank no longer jumps
    w.weightFuel = 3;
    w.step(STEP, frame);
    expect(seen(w)).toEqual(['jumpLost']);
  });

  it('says nothing when a system starts with a full tank', () => {
    const w = quiet();
    w.fuel = w.jumpCost + 5;
    for (let i = 0; i < 60; i++) w.step(STEP, frame);
    expect(seen(w)).toEqual([]);
  });
});
