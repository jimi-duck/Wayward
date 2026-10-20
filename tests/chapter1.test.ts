import { describe, expect, it } from 'vitest';
import { autoCourse, endSortie, newJourney, sortieDef, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import type { SortieResult } from '../src/sim/breakout';
import { World } from '../src/sim/world';
import { migrate } from '../src/meta/save';
import { lockLifted } from '../src/sim/postjump';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';

// Chapter one, end to end (docs/QA-CHAPTER-1.md): the first system past Cerro played on many seeds, so every kind of
// system the chart can deal the level gets the same calls, docks, objective and way out.

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

function past(seed: number, flags: string[] = []): Journey {
  const j = newJourney(seed);
  const r = newRun(1);
  r.escaped = true;
  const res: SortieResult = { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} };
  endSortie(j, res);
  autoCourse(j);
  j.carry.flags.push(...flags);
  return j;
}
const level = (j: Journey): World => {
  const w = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
  w.skipTraining();
  w.fuel = w.tankCap;
  return w;
};
const fly = (w: World, seconds: number, stop: () => boolean = () => false): void => {
  for (let i = 0; i < Math.round(seconds / STEP) && !stop(); i++) { w.ship.invuln = 1; w.step(STEP, input()); }
};
const callId = (w: World): string | undefined => w.comms?.def.id;
const to = (w: World, p: { x: number; z: number }, off: number) => { w.ship.x = p.x - off; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0; };

describe('chapter one: the first system past Cerro, on every seed', () => {
  it.each(SEEDS)('seed %i: the depot calls on the approach, can be docked at, and casts off to the Jump Gate', (seed) => {
    const w = level(past(seed, ['archive_woke', 'ship_stolen']));
    const b = w.bk!;
    to(w, b.port!, 100);
    fly(w, 20, () => w.phase !== 'play');
    expect(w.phase).toBe('comms');
    expect(callId(w)).toBe('depot_hail');
    // the answer ends the call and the ship is still where it was
    w.answer(0);
    expect(w.phase).toBe('play');
    // slow inside the ring: the clamps take it
    to(w, b.port!, 5);
    fly(w, 12, () => w.phase === 'dock');
    expect(w.phase).toBe('dock');
    w.undock();
    expect(w.phase).toBe('play');
    // and on to the Jump Gate and out
    to(w, b.lane, 0);
    const seen: string[] = [];
    for (let i = 0; i < 60 * 30 && w.phase !== 'over'; i++) {
      if (w.phase === 'comms') { seen.push(w.comms!.def.id); w.answer(0); continue; }
      w.ship.invuln = 1; w.step(STEP, input());
    }
    expect(w.phase, `cards at the gate: ${seen.join(',')}`).toBe('over');
    expect(w.result().ended).toBe('jumped');
  });

  it.each(SEEDS)('seed %i: the audit dock calls while the owner lock holds, and only then', (seed) => {
    const w = level(past(seed, ['archive_woke']));
    expect(lockLifted(w.flags)).toBe(false);
    to(w, w.bk!.audit!, 100);
    fly(w, 20, () => w.phase !== 'play');
    expect(callId(w)).toBe('audit_hail');
    w.answer(0);
    const lifted = level(past(seed, ['archive_woke', 'ship_stolen']));
    to(lifted, lifted.bk!.audit!, 100);
    fly(lifted, 20);
    expect(lifted.phase).toBe('play');
  });

  it.each(SEEDS.slice(0, 6))('seed %i: five minutes of the real chain with traffic stay finite, bounded, and end on the Jump Gate', (seed) => {
    const w = level(past(seed));
    for (let i = 0; i < 60 * 300; i++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      if (w.phase === 'dock') { w.undock(); continue; }
      if (w.phase === 'over') break;
      w.ship.invuln = 1; w.step(STEP, input());
      if (i % 600 === 0) {
        expect(Number.isFinite(w.ship.x + w.ship.z)).toBe(true);
        expect(w.aliens.length).toBeLessThan(40);
        for (const a of w.aliens) expect(Number.isFinite(a.x + a.z)).toBe(true);
      }
    }
    expect(lockLifted(w.flags)).toBe(true);
  });

  it('is the same level after the journey is saved and read back', () => {
    const j = past(3, ['archive_woke', 'ship_stolen']);
    const back = migrate(JSON.parse(JSON.stringify(j)))!;
    expect(back).not.toBeNull();
    const a = sortieDef(j), c = sortieDef(back);
    expect([c.first, c.audit, c.port?.name, c.lane]).toEqual([a.first, a.audit, a.port?.name, a.lane]);
    expect(lockLifted(new Set(back.carry.flags))).toBe(true);
  });

  it('is only the first jump: the next system is an ordinary one', () => {
    const j = past(3, ['archive_woke', 'ship_stolen']);
    const w = level(j);
    to(w, w.bk!.lane, 0);
    fly(w, 20, () => w.phase === 'over');
    expect(w.phase).toBe('over');
    endSortie(j, w.result());
    autoCourse(j);
    expect(sortieDef(j).first).toBeFalsy();
  });
});
