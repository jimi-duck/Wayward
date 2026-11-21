import { describe, expect, it } from 'vitest';
import { LEGS } from '../src/content/road';
import { legOf, OVERS, scarsOf, SLOGANS } from '../src/sim/scars';
import { PLACES_DE } from '../src/i18n/de/places';

// The Severance where she can see it (sim/scars.ts, owner 2026-11-21): a dead gate in every road system, the Bonded
// work lane at Kellern's, a billboard by the live gate that the Scatter writes over once Ada's key has spoken.

const lane = { kind: 'lane' as const, name: 'Jump Gate', x: 1000, z: 0, r: 30 };

describe('the Severance, in every system', () => {
  it('every road stop has a dead gate well off the line, and a billboard by the live gate', () => {
    for (const [i, leg] of LEGS.entries()) for (const s of leg) {
      expect(legOf(s.script), s.script).toBe(i);
      const sc = scarsOf({ lane, port: null, def: { script: s.script, holder: s.holder } }, new Set());
      expect(sc.dead, s.script).not.toBeNull();
      expect(Math.abs(sc.dead!.z), s.script).toBeGreaterThan(200);
      expect(sc.board!.line).toBe(SLOGANS[i]);
      expect(sc.board!.over).toBeNull();
      expect(!!sc.queue, s.script).toBe(s.holder === 'kellern');
    }
  });

  it('off the road there is none of it', () => {
    expect(scarsOf({ lane, port: null, def: {} }, new Set())).toEqual({ dead: null, queue: null, board: null });
  });

  it('past the Narrows, once Ada’s key has spoken, the billboards are written over; the Reach’s never are', () => {
    const woke = new Set(['relay_broadcast']);
    expect(scarsOf({ lane, port: null, def: { script: LEGS[0]![0]!.script } }, woke).board!.over).toBeNull();
    expect(scarsOf({ lane, port: null, def: { script: LEGS[1]![0]!.script } }, woke).board!.over).toBe(OVERS[1]);
  });

  it('says it all in German too', () => {
    for (const line of [...SLOGANS, ...OVERS, 'Dead gate', 'shut on Severance night, seventy years ago']) expect(PLACES_DE[line], line).toBeTruthy();
  });
});
