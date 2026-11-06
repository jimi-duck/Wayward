import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { BASE_PRICES } from '../src/content/systems';
import { STEP } from '../src/core/loop';
import { RELAY_JAMMED } from '../src/sim/traffic';
import type { InputFrame } from '../src/input/types';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, safe: false, quiet: false, situation: undefined, kind: 'transit' as const, port: { name: 'T', prices: { ...BASE_PRICES } } };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}
const at = (w: World, x: number, z: number) => { w.ship.x = x; w.ship.z = z; w.ship.vx = w.ship.vz = 0; };

describe("the Custody's relay post", () => {
  it('stands off the course in a system with patrols', () => {
    const w = level();
    expect(w.traffic?.relayPost).toBeTruthy();
  });

  it('calls a patrol on a flagged ship that lingers in its reach, and says so', () => {
    const w = level();
    const r = w.traffic!.relayPost!;
    w.bk!.heat = 0.8;
    const said: string[] = [];
    at(w, r.x + 60, r.z);
    for (let i = 0; i < Math.round(8 / STEP); i++) { at(w, r.x + 60, r.z); w.ship.invuln = 1; w.step(STEP, input()); for (const e of w.events) if (e.type === 'ping') said.push(e.id); }
    expect(said.some((id) => id.startsWith('relay_call'))).toBe(true);
  });

  it('leaves an unflagged ship alone', () => {
    const w = level();
    const r = w.traffic!.relayPost!;
    w.bk!.heat = 0;
    const said: string[] = [];
    for (let i = 0; i < Math.round(8 / STEP); i++) { at(w, r.x + 60, r.z); w.ship.invuln = 1; w.step(STEP, input()); for (const e of w.events) if (e.type === 'ping') said.push(e.id); }
    expect(said.some((id) => id.startsWith('relay_'))).toBe(false);
  });

  it('is jammed by slow flight alongside it, and then stays quiet', () => {
    const w = level();
    const r = w.traffic!.relayPost!;
    w.bk!.heat = 0.8;
    for (let i = 0; i < Math.round(6 / STEP); i++) { at(w, r.x + 10, r.z); w.ship.invuln = 1; w.step(STEP, input()); }
    expect(r.jammedUntil).toBeGreaterThan(w.runTime);
    w.events.length = 0;
    expect(r.jammedUntil - w.runTime).toBeLessThanOrEqual(RELAY_JAMMED);
    const said: string[] = [];
    for (let i = 0; i < Math.round(8 / STEP); i++) { at(w, r.x + 60, r.z); w.ship.invuln = 1; w.step(STEP, input()); for (const e of w.events) if (e.type === 'ping') said.push(e.id); }
    expect(said.some((id) => id.startsWith('relay_call'))).toBe(false);
  });
});
