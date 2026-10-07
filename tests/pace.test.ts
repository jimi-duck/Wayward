import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { SYSTEMS } from '../src/content/systems';
import { CARDS } from '../src/content/cards';
import type { InputFrame } from '../src/input/types';
import { PURSUIT_FIRST, type SortieDef } from '../src/sim/breakout';
import { lanesFrom } from '../src/sim/chart';
import { endSortie, newJourney, plot, sortieDef } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';

// The pursuit's room to breathe: when the first pursuer comes, and the quiet after an answer or a beaten pursuer (content/systems.ts `pace`).

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, brk: false, device: 'keyboard' };

/** The first system out of Cerro as a sortie, with the pace given and no chance cards or port call to interrupt. */
function sortie(pace: SortieDef['pace'], quiet = false): World {
  const j = newJourney(7);
  const run = newRun(1);
  run.escaped = true;
  endSortie(j, {
    ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 30, food: 12, parts: 6, plates: 3 }, run,
    calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {},
  });
  plot(j, lanesFrom(j.chart, j.at)[0]!.to.id);
  const def = { ...sortieDef(j), pace, quiet, calloway: Infinity, story: null, place: null };
  const w = new World(5, { mode: 'breakout', sortie: def, carry: j.carry });
  w.cardNext = Infinity;
  w.portCalled = true;
  return w;
}

const fly = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, idle); };
const pursuers = (w: World) => w.aliens.filter((a) => !a.escort && !a.extra).length;

describe('the pursuit’s pace', () => {
  it('holds the first pursuer until the system’s own time', () => {
    const w = sortie({ first: 100, calm: 0 });
    expect(w.bk!.nextPursuit).toBe(100);
    fly(w, 95);
    expect(pursuers(w)).toBe(0);
    fly(w, 10);
    expect(pursuers(w)).toBeGreaterThan(0);
  });

  it('keeps the Breakout’s own first pursuer when a sortie has no pace', () => {
    expect(sortie(undefined).bk!.nextPursuit).toBe(PURSUIT_FIRST);
  });

  it('pushes the next pursuer out after an answered card', () => {
    const w = sortie({ first: 20, calm: 40 });
    fly(w, 10);
    w.openComms(CARDS.find((c) => c.id === 'stowaways') ?? CARDS.find((c) => c.kind === 'rumour')!);
    expect(w.answer(w.comms!.choices.findIndex((c) => c.ok))).toBe(true);
    expect(w.bk!.nextPursuit).toBeGreaterThanOrEqual(w.runTime + 40);
    fly(w, 35);
    expect(pursuers(w)).toBe(0);
  });

  it('pushes the next pursuer out when the last one is beaten', () => {
    const w = sortie({ first: 1, calm: 30 });
    fly(w, 3);
    expect(pursuers(w)).toBe(1);
    (w as unknown as { killAlien(a: unknown, s: string): void }).killAlien(w.aliens.find((a) => !a.escort && !a.extra), 'laser');
    expect(w.bk!.nextPursuit).toBeGreaterThanOrEqual(w.runTime + 30);
  });

  it('does not stack with a quiet system: a breather is quiet whatever its pace', () => {
    const w = sortie({ first: 10, calm: 10 }, true);
    fly(w, 200);
    expect(w.aliens.length).toBe(0);
  });

  it('gives the rock the longest quiet and the contested systems the least', () => {
    expect(SYSTEMS.mining.pace.first).toBeGreaterThanOrEqual(60);
    for (const k of ['port', 'transit', 'gate', 'edge'] as const) expect(SYSTEMS.mining.pace.first).toBeGreaterThanOrEqual(SYSTEMS[k].pace.first);
    for (const k of ['mining', 'port', 'transit', 'gate', 'edge'] as const) expect(SYSTEMS.contested.pace.first).toBeLessThanOrEqual(SYSTEMS[k].pace.first);
    for (const t of Object.values(SYSTEMS)) expect(t.pace.calm).toBeGreaterThanOrEqual(0);
  });
});
