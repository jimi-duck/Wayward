import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { relaysLit } from '../src/sim/evidence';
import { REACH_RELAYS } from '../src/content/road';

// The Reach's relays (spaceways plan, step 4): a relay by each gate from Halden to Copperline, woken by her key. Miners' Gap's is buried
// under a rock she mines away; Copperline's is guarded by a picket she drives off.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/** A quiet world at a named Reach stop. */
function stop(name: string): World {
  const j = newJourney(5, false, 'road');
  const s = j.chart.systems.find((x) => x.name === name)!;
  const line = j.chart.systems.filter((x) => x.col >= 1 && x.col < s.col).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((x) => x.id), s.id]; j.at = s.id; j.status = 'sortie'; j.dest = null;
  j.carry.flags.push('archive_woke');
  return new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
}

/** Sit in the relay's ring for a while, answering what comes. */
function sit(w: World, secs: number, x: number, z: number, notices: string[] = []): void {
  for (let i = 0; i < Math.round(secs / STEP); i++) {
    w.ship.invuln = 99; w.ship.x = x; w.ship.z = z; w.ship.vx = w.ship.vz = 0;
    w.step(STEP, NO);
    for (const e of w.events) if (e.type === 'storyNotice') notices.push(e.headline);
    w.events.length = 0;
    const open = w.comms ?? w.call;
    if (open) w.answer(open.def.choices[0]!.id);
  }
}

describe('the Reach’s relays', () => {
  it('stand by every Reach gate, with the twists where the plan puts them', () => {
    for (const [name, script, twist] of [['Halden’s Reach', 'halden', undefined], ['Tallyhouse', 'marlow', undefined], ['Miners’ Gap', 'branford', 'buried'], ['Copperline', 'copperline', 'guarded']] as const) {
      const w = stop(name);
      expect(w.bk!.def.script).toBe(script);
      expect(w.bk!.def.relay).toBe(true);
      expect(w.bk!.def.twist).toBe(twist);
      expect(REACH_RELAYS[script]).toBeTruthy();
    }
  });

  it('Tallyhouse: woken, the gate opens on her key, and the count Ada’s notes speak of is untouched', () => {
    const w = stop('Tallyhouse');
    const rl = w.wakeRelay!;
    const notices: string[] = [];
    sit(w, 50, rl.x - 20, rl.z, notices);
    expect(w.flags.has('relay_marlow')).toBe(true);
    expect((w as unknown as { script: { triggered(id: string): boolean } }).script.triggered('ml_relay')).toBe(true);
    // the gate is open on her key
    sit(w, 2, rl.x - 20, rl.z, notices);
    expect(w.gateWhy).not.toBe('wake the relay');
    expect(relaysLit(w.flags)).toBe(0);
  });

  it('Miners’ Gap: a rock sits on the mast and holds the charge until it is mined away', () => {
    const w = stop('Miners’ Gap');
    const rl = w.wakeRelay!;
    sit(w, 1, rl.x - 20, rl.z);
    const rock = w.field.bulwarks.find((b) => Math.hypot(b.x - rl.x, b.z - rl.z) < 1);
    expect(rock).toBeTruthy();
    // it stays on the mast while she is away
    sit(w, 3, rl.x + 400, rl.z);
    expect(Math.hypot(rock!.x - rl.x, rock!.z - rl.z)).toBeLessThan(1);
    sit(w, 10, rl.x - 20, rl.z);
    expect(w.uplink).toBe(0);
    expect(w.uplinkBlock).toBe('Mine the relay clear');
    // mined away (its hull spent): the charge runs
    w.field.bulwarks.splice(w.field.bulwarks.indexOf(rock!), 1);
    sit(w, 10, rl.x - 20, rl.z);
    expect(w.uplink).toBeGreaterThan(0);
    // told, in its turn on the floor
    sit(w, 15, rl.x - 20, rl.z);
    expect(w.floor.log.some((l) => l.id === 'Relay clear')).toBe(true);
  });

  it('Copperline: a picket sits on the mast; the charge holds while one is near it', () => {
    const w = stop('Copperline');
    const rl = w.wakeRelay!;
    sit(w, 2, rl.x - 20, rl.z);
    const guards = () => w.aliens.filter((a) => !a.ward && Math.hypot(a.x - rl.x, a.z - rl.z) < 120);
    expect(guards().length).toBeGreaterThanOrEqual(2);
    expect(w.uplinkBlock).toBe('Drive the guards off the relay');
    const held = w.uplink;
    sit(w, 3, rl.x - 20, rl.z);
    expect(w.uplink).toBeCloseTo(held, 5);
    // driven off: the charge runs
    for (const a of guards()) w.aliens.splice(w.aliens.indexOf(a), 1);
    sit(w, 5, rl.x - 20, rl.z);
    expect(w.uplink).toBeGreaterThan(held);
    sit(w, 15, rl.x - 20, rl.z);
    expect(w.floor.log.some((l) => l.id === 'Relay guarded')).toBe(true);
  });
});
