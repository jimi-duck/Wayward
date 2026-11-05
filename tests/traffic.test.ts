import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { World } from '../src/sim/world';
import type { InputFrame } from '../src/input/types';
import { endSortie, newJourney, sortieDef, autoCourse } from '../src/sim/journey';
import type { SortieResult } from '../src/sim/breakout';
import { newRun } from '../src/sim/run';
import { PATROL_FIRST, PATROL_FLAG, PATROL_LOOK, PATROL_MAX, trafficPlan } from '../src/sim/traffic';
import { places } from '../src/sim/breakout';

// Living traffic past the first system: haulers on routes, port traffic, and Custody patrols that look you over.

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
/** Fly `seconds`, answering whatever the story puts up with its first choice. */
const run = (w: World, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (w.phase === 'comms' || w.phase === 'hail') { w.answer(0); continue; }
    w.ship.invuln = 1; w.step(STEP, input());
  }
};

function base() {
  const j = newJourney(7);
  const r = newRun(1);
  r.escaped = true;
  const res: SortieResult = { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, };
  endSortie(j, res);
  autoCourse(j);
  j.carry.flags.push('archive_woke');
  return sortieDef(j);
}
/** An ordinary system of a kind: the first system's level stripped back. */
function system(kind: 'port' | 'transit' | 'mining' | 'edge', over: object = {}): World {
  const d = { ...base(), first: false, audit: undefined, situation: undefined, here: [], kind, quiet: false, safe: false, calm: false, ...over } as ReturnType<typeof base>;
  if (kind === 'port') d.port = d.port ?? { name: 'Test Port', prices: { cyrite: 5, plate: 30, supplies: 9 } };
  if (kind !== 'port') d.port = null;
  const w = new World(5, { mode: 'breakout', sortie: d, carry: { ...newJourney(7).carry, flags: ['archive_woke'] } });
  w.skipTraining();
  return w;
}

describe('traffic in an ordinary system', () => {
  it('a port is a crowd, a crossing has a few, the edge and Thren space none or few', () => {
    expect(system('port').traffic!.count).toBeGreaterThanOrEqual(5);
    expect(system('transit').traffic!.count).toBeGreaterThanOrEqual(3);
    expect(system('edge').traffic!.count).toBeLessThanOrEqual(1);
    expect(trafficPlan(system('transit', { here: ['thren'] }))).toBeNull();
  });

  it('keeps clear of the ship and every dock, and is never pursuit', () => {
    const w = system('port');
    run(w, 90);
    for (const a of w.aliens) {
      if (!a.ward) continue;
      expect(a.extra).toBe(true);
      expect(a.ward.temper).not.toBe('hostile');
    }
    expect(w.aliens.some((a) => w.committed(a))).toBe(false);
    expect(places(w.bk!).length).toBeGreaterThan(0);
  });

  it('a port has its own lines: ships coming in, casting off, and a harbour loop', () => {
    const w = system('port');
    const ids = (w.traffic as unknown as { routes: Array<{ id: string }> }).routes.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['dock-in', 'cast-off', 'harbour']));
  });
});

describe('patrols', () => {
  it('look a clean ship over once, then leave, and are not hostile', () => {
    const w = system('transit');
    w.bk!.heat = 0;
    run(w, PATROL_FIRST[1] + 60);
    const t = w.traffic!;
    expect(t.patrolCalls).toBe(1);
    run(w, PATROL_LOOK + 40);
    // the patrol looked and left: none of its hulls ever fired, and the dock's guards were not called
    const crews = (t as unknown as { crews: Array<{ ward?: unknown; fleeing?: boolean }> }).crews;
    expect(crews.every((a) => a.fleeing && !a.ward)).toBe(true);
    expect(t.responders).toBe(0);
    expect(w.alive).toBe(true);
  });

  it('turn on a flagged ship', () => {
    const w = system('transit');
    run(w, PATROL_FIRST[1] + 25);
    w.bk!.heat = PATROL_FLAG + 0.2;
    run(w, 40);
    expect(w.traffic!.patrolCalls).toBeGreaterThanOrEqual(1);
    expect(w.aliens.some((a) => w.committed(a)) || w.traffic!.responders > 0).toBe(true);
  });

  it('call at most PATROL_MAX times, and not at all in a safe system', () => {
    const w = system('transit');
    w.bk!.heat = 0;
    run(w, 1200);
    expect(w.traffic!.patrolCalls).toBeLessThanOrEqual(PATROL_MAX);
    const safe = system('transit', { safe: true });
    run(safe, 300);
    expect(safe.traffic!.patrolCalls).toBe(0);
  }, 60000);
});
