import { describe, expect, it } from 'vitest';
import { BROADCAST_ROWS, CPS } from '../src/content/script/broadcasts';
import { LEGS } from '../src/content/road';
import { DE } from '../src/i18n/de';

// The Continuance's broadcasts (docs/STORY_DIRECTION.md §6): flavour, one a stop at most, never at a breather.
describe('Continuance Public Service', () => {
  const stops = new Map(LEGS.flat().map((s) => [s.script, s]));

  it('speaks only at real stops, never at a breather or the start', () => {
    for (const r of BROADCAST_ROWS) {
      const s = stops.get(r.stop);
      expect(s, r.id).toBeDefined();
      expect(s!.quiet ?? false, r.id).toBe(false);
      expect(s!.role, r.id).not.toBe('start');
    }
  });

  it('is flavour: never a main beat, and dropped if it waits too long', () => {
    for (const r of BROADCAST_ROWS) {
      expect(r.main ?? false, r.id).toBe(false);
      expect(r.stale, r.id).toBeGreaterThan(0);
      expect('radio' in r.do && r.do.radio.from, r.id).toBe(CPS);
    }
  });

  it('plays at most one unconditional broadcast a stop', () => {
    const per = new Map<string, number>();
    for (const r of BROADCAST_ROWS) if (r.on.on === 'free' && !r.if) per.set(r.stop, (per.get(r.stop) ?? 0) + 1);
    for (const [stop, n] of per) expect(n, stop).toBe(1);
  });

  it('has German for every line', () => {
    expect(DE[CPS]).toBeTruthy();
    for (const r of BROADCAST_ROWS) if ('radio' in r.do) expect(DE[r.do.radio.text], r.id).toBeTruthy();
  });
});
