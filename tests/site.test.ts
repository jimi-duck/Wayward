import { describe, expect, it } from 'vitest';
import { ALERT_HEAT, MOOD_HOLD, SiteBrain, moodOf, portStyleOf } from '../src/sim/site';

const quiet = { shield: false, fight: 0, heat: 0, ships: 0 };

describe('site mood', () => {
  it('reads the signals in order of weight', () => {
    expect(moodOf(quiet)).toBe('calm');
    expect(moodOf({ ...quiet, ships: 3 })).toBe('busy');
    expect(moodOf({ ...quiet, ships: 3, heat: ALERT_HEAT })).toBe('alert');
    expect(moodOf({ ...quiet, fight: 1 })).toBe('alert');
    expect(moodOf({ ...quiet, fight: 1, shield: true })).toBe('shut');
  });

  it('rises at once and falls after the hold', () => {
    const b = new SiteBrain();
    b.step(0.1, { ...quiet, shield: true });
    expect(b.mood).toBe('shut');
    b.step(MOOD_HOLD - 0.5, quiet);
    expect(b.mood).toBe('shut');
    b.step(1, quiet);
    expect(b.mood).toBe('calm');
  });

  it('gives each holder a look, and the plain depot to the rest', () => {
    expect(portStyleOf('kellern')).toBe('kellern');
    expect(portStyleOf('gutter')).toBe('gutter');
    expect(portStyleOf('holdfast')).toBe('holdfast');
    expect(portStyleOf('guild')).toBe('guild');
    expect(portStyleOf('frontier')).toBe('frontier');
    expect(portStyleOf(undefined)).toBe('frontier');
    expect(portStyleOf('none')).toBe('frontier');
  });
});
