import { describe, expect, it } from 'vitest';
import { SCENE_IN, SCENE_OUT, SceneArc } from '../src/render/scenes';

const DT = 1 / 60;
function run(a: SceneArc, on: boolean, secs: number, reduced = false): number {
  let v = 0;
  for (let t = 0; t < secs; t += DT) v = a.update(on, DT, reduced);
  return v;
}

describe('story scene arc', () => {
  it('swings to her flank while the scene plays, and holds there', () => {
    const a = new SceneArc();
    const mid = run(a, true, SCENE_IN / 2);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(run(a, true, SCENE_IN)).toBeCloseTo(1, 3);
    expect(run(a, true, 20)).toBe(1);
  });

  it('eases back behind her when the scene ends', () => {
    const a = new SceneArc();
    run(a, true, SCENE_IN + 1);
    expect(run(a, false, SCENE_OUT / 2)).toBeGreaterThan(0);
    expect(run(a, false, SCENE_OUT)).toBe(0);
  });

  it('stays static with reduced motion', () => {
    const a = new SceneArc();
    expect(run(a, true, 10, true)).toBe(0);
  });
});
