import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';

// Stillwater, the Deep's set piece: "Answer the pattern" puts a Thren knot in front of her. Still beside it, one loop round
// it, still again, and it lifts off the rig. A shot at it, and it comes on.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

function stillwater(): World {
  const j = newJourney(5, false, 'road');
  const at = j.chart.systems.find((s) => s.name === 'Stillwater')!;
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= at.col && j.chart.systems.filter((x) => x.col === s.col).length === 1).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)]; j.at = at.id; j.status = 'sortie'; j.dest = null;
  j.carry.flags.push('archive_woke', 'ship_stolen', 'still_speak');
  const def = sortieDef(j);
  return new World(11, { mode: 'breakout', sortie: { ...def, situation: null, thren: 0, calloway: Infinity, place: null, pace: { first: 1e9, calm: 1e9 } }, carry: j.carry });
}

const sit = (w: World, x: number, z: number) => { w.ship.x = x; w.ship.z = z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 99; };

describe('answering the knot at Stillwater', () => {
  it('lifts off the rig when she flies its shape back', () => {
    const w = stillwater();
    w.step(STEP, NO);
    const k = w.knot!;
    expect(k).not.toBeNull();
    expect(k.motes.length).toBe(6);
    // still beside it
    for (let i = 0; i < 4 / STEP && k.step === 'still'; i++) { sit(w, k.x + 50, k.z); w.step(STEP, NO); }
    expect(k.step).toBe('loop');
    // one loop round it
    for (let i = 0; i <= 64 && k.step === 'loop'; i++) { const a = (i / 60) * Math.PI * 2; sit(w, k.x + Math.cos(a) * 60, k.z + Math.sin(a) * 60); w.step(STEP, NO); }
    expect(k.step).toBe('again');
    for (let i = 0; i < 4 / STEP && k.step === 'again'; i++) { sit(w, k.x + 50, k.z); w.step(STEP, NO); }
    expect(k.step).toBe('done');
    expect(w.flags.has('still_spoken')).toBe(true);
  });

  it('does not count a hold made far off, or on the move', () => {
    const w = stillwater();
    w.step(STEP, NO);
    const k = w.knot!;
    for (let i = 0; i < 4 / STEP; i++) { sit(w, k.x + 200, k.z); w.step(STEP, NO); }
    expect(k.step).toBe('still');
    for (let i = 0; i < 4 / STEP; i++) { sit(w, k.x + 50, k.z); w.ship.vx = 30; w.step(STEP, NO); }
    expect(k.step).toBe('still');
  });

  it('comes on when she fires on it', () => {
    const w = stillwater();
    w.step(STEP, NO);
    const k = w.knot!;
    k.shot(w, k.motes[0]!);
    expect(k.step).toBe('failed');
    expect(w.flags.has('still_fought')).toBe(true);
  });
});
