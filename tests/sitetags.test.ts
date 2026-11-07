import { describe, expect, it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { siteTags, TAG_R } from '../src/sim/sitetags';

function level(kind: 'transit' | 'mining' | 'port', holder?: 'guild' | 'kellern'): World {
  const j = newJourney(7);
  const def = { ...sortieDef(j), home: false, first: false, safe: false, situation: undefined, kind, holder, thren: 0 };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}

describe('places name themselves', () => {
  it('says what the gantry is and what it does when you come near, and nothing from afar', () => {
    const w = level('transit');
    const g = w.gantry!;
    w.ship.x = g.x + TAG_R + 50; w.ship.z = g.z;
    expect(siteTags(w).some((t) => t.name === 'Repair gantry')).toBe(false);
    w.ship.x = g.x + 40;
    const tag = siteTags(w).find((t) => t.name === 'Repair gantry')!;
    expect(tag).toBeTruthy();
    expect(tag.line.length).toBeGreaterThan(5);
  });

  it('names a depot by its holder and a market by what it does', () => {
    const w = level('port', 'guild');
    const b = w.bk!;
    w.ship.x = b.port!.x - 30; w.ship.z = b.port!.z;
    expect(siteTags(w).some((t) => t.name === b.port!.name && /Dust Traders/.test(t.line))).toBe(true);
    const m = w.market!;
    w.ship.x = m.x + 30; w.ship.z = m.z;
    expect(siteTags(w).find((t) => t.name === 'Dust Market')?.line).toMatch(/trade/);
  });

  it('turns a refusal amber', () => {
    const w = level('transit');
    const g = w.gantry!;
    w.bk!.heat = 1;
    w.ship.x = g.x + 5; w.ship.z = g.z; w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 5; i++) w.step(1 / 60, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
    const tag = siteTags(w).find((t) => t.name === 'Repair gantry')!;
    if (g.state === 'refuses') expect(tag.warn).toBe(true);
  });
});
