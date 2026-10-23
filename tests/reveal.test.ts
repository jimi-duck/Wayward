import { describe, expect, it } from 'vitest';
import { ARC_END, LOCK_AT, RenameReveal, SWEEP_END } from '../src/render/reveal';

// The rename reveal is presentation only: the `ship_stolen` flag is the livery, and the reveal plays once, when the
// flag turns on in play, never on a load.
const DT = 1 / 60;
function run(r: RenameReveal, from: number, to: number, o: { stolen?: boolean; paused?: boolean; calm?: boolean; reduced?: boolean } = {}) {
  let last = r.update({ stolen: o.stolen ?? true, time: from, paused: !!o.paused, calm: o.calm ?? true, reduced: !!o.reduced }, DT);
  const frames = [last];
  for (let t = from + DT; t <= to + 1e-9; t += DT) {
    last = r.update({ stolen: o.stolen ?? true, time: o.paused ? from : t, paused: !!o.paused, calm: o.calm ?? true, reduced: !!o.reduced }, DT);
    frames.push(last);
  }
  return { last, frames };
}

describe('rename reveal', () => {
  it('shows a loaded ochre hull at once, with no sweep or arc', () => {
    const r = new RenameReveal();
    const { frames } = run(r, 100, 104);
    expect(frames.every((f) => f.livery === 1 && f.sweep === null && f.arc === 0)).toBe(true);
    expect(r.active).toBe(false);
  });

  it('plays once when the lock lifts: grey, one sweep, the arc held under the card, then back', () => {
    const r = new RenameReveal();
    run(r, 10, 11, { stolen: false });
    const a = run(r, 11, 11 + LOCK_AT - 0.05);
    expect(a.last).toMatchObject({ livery: 0, sweep: null });
    const b = run(r, 11 + LOCK_AT + 0.02, 11 + SWEEP_END - 0.05);
    const sweeps = b.frames.map((f) => f.sweep!);
    expect(sweeps.every((s) => s !== null && s >= -1 && s <= 1)).toBe(true);
    expect(sweeps[sweeps.length - 1]!).toBeGreaterThan(sweeps[0]!);
    const c = run(r, 11 + SWEEP_END, 11 + ARC_END + 0.05);
    expect(c.last.livery).toBe(1);
    expect(c.last.arc).toBeCloseTo(1, 2);
    // the registry card: the game pauses, the view holds
    const d = run(r, 11 + 2.4, 11 + 2.4 + 3, { paused: true });
    expect(d.frames.every((f) => f.arc > 0.99)).toBe(true);
    // answered: the camera comes back and the reveal ends, ochre
    const e = run(r, 11 + 2.4, 11 + 4);
    expect(e.last).toEqual({ livery: 1, sweep: null, arc: 0 });
    expect(r.active).toBe(false);
    // it never plays again while the flag stays on
    const f = run(r, 20, 30);
    expect(f.frames.every((x) => x.livery === 1 && x.sweep === null && x.arc === 0)).toBe(true);
  });

  it('keeps the camera still when a hostile gun is in range', () => {
    const r = new RenameReveal();
    run(r, 0, 1, { stolen: false });
    const { frames, last } = run(r, 1, 1 + ARC_END + 0.5, { calm: false });
    expect(frames.every((f) => f.arc === 0)).toBe(true);
    expect(frames.some((f) => f.sweep !== null)).toBe(true);
    expect(last.livery).toBe(1);
  });

  it('lets the camera go if a fight starts mid-arc', () => {
    const r = new RenameReveal();
    run(r, 0, 1, { stolen: false });
    run(r, 1, 1 + 2);
    const { last } = run(r, 3, 4.5, { calm: false });
    expect(last.arc).toBe(0);
  });

  it('skips it all with reduced motion', () => {
    const r = new RenameReveal();
    run(r, 0, 1, { stolen: false });
    const { frames } = run(r, 1, 4, { reduced: true });
    expect(frames.every((f) => f.livery === 1 && f.sweep === null && f.arc === 0)).toBe(true);
  });

  it('does not replay after a load mid-reveal', () => {
    const r = new RenameReveal();
    run(r, 0, 1, { stolen: false });
    run(r, 1, 1.8);
    r.reset();
    const { frames } = run(r, 1.8, 5);
    expect(frames.every((f) => f.livery === 1 && f.sweep === null && f.arc === 0)).toBe(true);
  });
});
