import { describe, expect, it } from 'vitest';
import { JUMP_T } from '../src/sim/breakout';
import { flare, launchFrom, pose, rush, stretch, whiteout } from '../src/render/warp';

// The jump's path (render/warp.ts) is plain arithmetic on the seconds since the drive let go.

const gate = { x: 100, z: -40 };
// the ring faces +x (the ship came in from that side); the way out is -x
const axis = 0;

describe('the jump through the ring', () => {
  it('takes the way out of the ring that the ship is pointing at', () => {
    const toward = launchFrom(gate, axis, { x: 110, z: -40, vx: -30, vz: 0, heading: Math.PI });
    expect(toward.dx).toBeCloseTo(-1);
    // already past the plane and pointing the other way: out of that side
    const back = launchFrom(gate, axis, { x: 90, z: -40, vx: 0, vz: 0, heading: 0 });
    expect(back.dx).toBeCloseTo(1);
  });

  it('crosses the ring after it starts, moving on without a jump in position', () => {
    const l = launchFrom(gate, axis, { x: 112, z: -44, vx: -40, vz: 0, heading: Math.PI });
    expect(l.cross).toBeGreaterThan(0.1);
    expect(l.cross).toBeLessThan(1);
    const before = pose(l, l.cross - 0.01), after = pose(l, l.cross + 0.01);
    expect(before.x).toBeGreaterThan(gate.x);
    expect(after.x).toBeLessThan(gate.x);
    // centred on the ring's middle by the time it is through
    expect(Math.abs(after.z - gate.z)).toBeLessThan(1);
    // starts where the ship was, and never goes backwards
    const p0 = pose(l, 0);
    expect(p0.x).toBeCloseTo(112);
    expect(p0.z).toBeCloseTo(-44);
    let last = p0.x;
    for (let t = 0.05; t <= JUMP_T; t += 0.05) { const p = pose(l, t); expect(p.x).toBeLessThanOrEqual(last + 1e-9); last = p.x; }
  });

  it('is a long way off, fast, by the end', () => {
    const l = launchFrom(gate, axis, { x: 110, z: -40, vx: -30, vz: 0, heading: Math.PI });
    expect(gate.x - pose(l, JUMP_T).x).toBeGreaterThan(1500);
    expect(rush(JUMP_T)).toBe(1);
    expect(rush(0)).toBe(0);
  });

  it('closes the view only at the end, and flares the ring around the crossing', () => {
    const l = launchFrom(gate, axis, { x: 110, z: -40, vx: -30, vz: 0, heading: Math.PI });
    expect(whiteout(1)).toBe(0);
    expect(whiteout(JUMP_T)).toBe(1);
    expect(stretch(0)).toBe(1);
    expect(stretch(JUMP_T)).toBeGreaterThan(2);
    expect(flare(l, l.cross)).toBeGreaterThan(0.9);
    expect(flare(l, -1)).toBe(0);
    expect(flare(l, JUMP_T)).toBe(0);
  });
});
