import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { FLOOR } from '../src/sim/floor';
import { uplinkWave, GUARD_HOLD, HUNTED_RATE, UPLINK_TIME } from '../src/sim/uplink';
import { RELAY_WAVES, waveTier } from '../src/content/waves';

// Waves that grow (spaceways plan, step 5): each relay's waves are rows by tier; from the middle legs the second brings a tether hunter
// that sits on the mast and holds the charge. The relay's damping pulse throws the hulls in its ring out, once a wake; locals she has
// helped fly cover at their own relay.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/** A quiet world at the road stop whose script is `script`, with `flags` carried. */
function stop(script: string, flags: string[] = []): World {
  const j0 = newJourney(5, false, 'road');
  const line = [...j0.chart.systems].sort((a, b) => a.col - b.col);
  for (let i = 1; i < line.length; i++) {
    const j = newJourney(5, false, 'road');
    const l = [...j.chart.systems].sort((a, b) => a.col - b.col);
    j.trail = l.slice(0, i + 1).map((x) => x.id); j.at = l[i]!.id; j.status = 'sortie'; j.dest = null;
    const def = sortieDef(j);
    if (def.script !== script) continue;
    j.carry.flags.push('archive_woke', 'ship_stolen', 'on_road', 'lock_lifted', 'dead_gate_seen', ...flags);
    return new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), blockade: false, checkpoint: undefined, pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
  }
  throw new Error(`no stop ${script}`);
}

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

/** Out of the ring until the arrival's quiet is over (the charge waits for it). */
function settle(w: World, x: number, z: number): void {
  sit(w, FLOOR.arrival + 0.5, x - 300, z);
}

const hunters = (w: World) => (w as unknown as { hunters: Set<number> }).hunters;

describe('waves that grow', () => {
  it('come from rows by tier: none at the core, a hunter in the second wave from the middle legs', () => {
    expect(waveTier(true, false, -1)).toBe('first');
    expect(waveTier(false, true, 0)).toBe('reach');
    expect(waveTier(false, false, 0)).toBe('mid');
    expect(waveTier(false, false, 4)).toBe('late');
    expect(uplinkWave(3, 'late')).toEqual([]);
    expect(uplinkWave(2, 'reach')).toEqual([]);
    for (const t of ['mid', 'late'] as const) {
      expect(uplinkWave(1, t).some((r) => r.hunter)).toBe(false);
      expect(uplinkWave(2, t).filter((r) => r.hunter).length).toBe(1);
    }
    const n = (t: keyof typeof RELAY_WAVES) => RELAY_WAVES[t].flat().reduce((a, r) => a + r.n, 0);
    expect(n('late')).toBeGreaterThan(n('mid'));
    expect(n('mid')).toBeGreaterThan(n('reach'));
  });

  it('a tether hunter makes for the mast and drags the charge; the pulse throws it out once', () => {
    const w = stop('breaker');
    const rl = w.wakeRelay;
    expect(rl).toBeTruthy();
    const notices: string[] = [];
    settle(w, rl!.x, rl!.z);
    // to the second stage: the hunter comes
    w.uplink = 0.66;
    for (let i = 0; i < 20 && !hunters(w).size; i++) sit(w, 0.5, rl!.x - 20, rl!.z, notices);
    expect(hunters(w).size).toBe(1);
    const id = [...hunters(w)][0]!;
    // it closes on the mast (the pulse is spent first, so it may sit)
    (w as unknown as { pulsed: boolean }).pulsed = true;
    for (let i = 0; i < 40 && w.uplinkBlock !== 'Drive the hunter off the relay'; i++) sit(w, 0.5, rl!.x - 20, rl!.z, notices);
    expect(w.uplinkBlock).toBe('Drive the hunter off the relay');
    // it drags the charge to a third, it does not stop it
    const held = w.uplink;
    sit(w, 3, rl!.x - 20, rl!.z, notices);
    if (w.uplinkBlock === 'Drive the hunter off the relay') {
      expect(w.uplink).toBeGreaterThan(held);
      expect(w.uplink - held).toBeLessThan((3 / UPLINK_TIME) * HUNTED_RATE + 1e-6);
    }
    // a fresh pulse throws it past the mast's hold
    (w as unknown as { pulsed: boolean }).pulsed = false;
    sit(w, STEP, rl!.x - 20, rl!.z, notices);
    expect((w as unknown as { pulsed: boolean }).pulsed).toBe(true);
    const al = w.aliens.find((a) => a.id === id)!;
    expect(Math.hypot(al.x - rl!.x, al.z - rl!.z)).toBeGreaterThan(GUARD_HOLD);
    expect(w.uplinkBlock).toBe('');
    // told once, and once a wake: it does not pulse again
    sit(w, 25, rl!.x - 20, rl!.z, notices);
    expect(w.floor.log.filter((l) => l.kind === 'signal' && l.id === 'Relay pulse').length).toBe(1);
  });

  it('Hester’s crews fly cover at Miners’ Gap once she broke the toll beacon, and not otherwise', () => {
    const hurt = (flags: string[]) => {
      const w = stop('branford', flags);
      const rl = w.wakeRelay!;
      settle(w, rl.x, rl.z);
      // the rock mined away: the charge runs
      for (let i = w.field.bulwarks.length - 1; i >= 0; i--) if (Math.hypot(w.field.bulwarks[i]!.x - rl.x, w.field.bulwarks[i]!.z - rl.z) < 1) w.field.bulwarks.splice(i, 1);
      w.uplink = 0.3;
      sit(w, 3, rl.x - 20, rl.z);
      const hostile = w.aliens.filter((a) => !a.ward);
      expect(hostile.length).toBeGreaterThan(0);
      const before = hostile.reduce((s, a) => s + a.hp, 0);
      // hold them off the mast's pulse range so only the cover touches them
      for (let i = 0; i < Math.round(8 / STEP); i++) {
        for (const a of hostile) { a.x = rl.x + 120; a.z = rl.z; a.vx = a.vz = 0; }
        w.ship.invuln = 99; w.ship.x = rl.x - 20; w.ship.z = rl.z; w.ship.vx = w.ship.vz = 0;
        w.step(STEP, NO); w.events.length = 0;
        const open = w.comms ?? w.call; if (open) w.answer(open.def.choices[0]!.id);
      }
      return before - hostile.reduce((s, a) => s + (w.aliens.includes(a) ? a.hp : 0), 0);
    };
    expect(hurt(['job_pirate_toll_won'])).toBeGreaterThan(0);
    expect(hurt([])).toBe(0);
  });
});
