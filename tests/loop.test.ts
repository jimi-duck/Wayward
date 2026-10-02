import { describe, expect, it } from 'vitest';
import { FixedStepLoop, STEP } from '../src/core/loop';

function rig() {
  const log = { steps: 0, alphas: [] as number[], frameDts: [] as number[] };
  const loop = new FixedStepLoop({
    step: () => {
      log.steps++;
    },
    render: (alpha, frameDt) => {
      log.alphas.push(alpha);
      log.frameDts.push(frameDt);
    },
  });
  return { loop, log };
}

function run(loop: FixedStepLoop, hz: number, seconds: number) {
  for (let i = 0; i < Math.round(hz * seconds); i++) loop.advance(1 / hz);
}

describe('FixedStepLoop', () => {
  it('runs the same number of steps at 60Hz, 120Hz and 144Hz', () => {
    for (const hz of [60, 120, 144]) {
      const { loop, log } = rig();
      run(loop, hz, 10);
      expect(Math.abs(log.steps - 600)).toBeLessThanOrEqual(1);
    }
  });

  it('runs one step per frame at 60Hz', () => {
    const { loop } = rig();
    for (let i = 0; i < 120; i++) expect(loop.advance(1 / 60)).toBe(1);
  });

  it('interpolates between steps on a fast display', () => {
    const { loop, log } = rig();
    run(loop, 120, 1);
    // at 120Hz every other frame lands halfway between two steps
    expect(log.alphas.some((a) => a > 0.4 && a < 0.6)).toBe(true);
    for (const a of log.alphas) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1 + 1e-9);
    }
  });

  it('clamps a stalled frame to three steps instead of fast-forwarding', () => {
    const { loop, log } = rig();
    expect(loop.advance(5)).toBe(3);
    expect(log.frameDts.at(-1)).toBeCloseTo(0.05);
    // and carries no backlog into the next frame
    expect(loop.advance(1 / 60)).toBe(1);
  });

  it('ignores zero, negative and NaN intervals', () => {
    const { loop, log } = rig();
    loop.advance(0);
    loop.advance(-1);
    loop.advance(Number.NaN);
    expect(log.steps).toBe(0);
    expect(log.alphas).toHaveLength(3);
  });

  it('draws but does not simulate while paused', () => {
    const { loop, log } = rig();
    loop.paused = true;
    run(loop, 60, 1);
    expect(log.steps).toBe(0);
    expect(log.alphas).toHaveLength(60);
  });

  it('holds the simulation still during a freeze and then carries on', () => {
    const { loop, log } = rig();
    loop.freeze(0.05);
    run(loop, 60, 0.05);
    expect(log.steps).toBe(0);
    run(loop, 60, 1);
    expect(log.steps).toBeGreaterThanOrEqual(59);
  });

  it('caps a freeze at the original HITSTOP_MAX', () => {
    const { loop, log } = rig();
    loop.freeze(10);
    run(loop, 60, 0.5);
    const frozenFrames = Math.round(0.11 / STEP);
    expect(log.steps).toBeGreaterThanOrEqual(30 - frozenFrames - 1);
  });

  it('slows down under a time scale', () => {
    const { loop, log } = rig();
    loop.timeScale = 0.5;
    run(loop, 60, 2);
    expect(Math.abs(log.steps - 60)).toBeLessThanOrEqual(1);
  });
});
