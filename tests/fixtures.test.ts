import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { migrate } from '../src/meta/save';
import { lanesFrom } from '../src/sim/chart';
import { plot, sortieDef, VERSION } from '../src/sim/journey';
import { World } from '../src/sim/world';

// A saved journey of each VERSION is kept in tests/fixtures, and each must still load and fly a system.
// A change to the journey's shape bumps VERSION: write the new fixture beside the old ones (the way
// the first was made: a short journey out of Cerro, saved as JSON), and leave the old ones as they are.

const DIR = new URL('./fixtures/', import.meta.url);
const files = readdirSync(DIR).filter((f) => /^journey-v\d+\.json$/.test(f));
const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, brk: false, overcharge: false, device: 'keyboard' });

describe('saved journeys of every version', () => {
  it('keeps a fixture for the current version', () => {
    expect(files).toContain(`journey-v${VERSION}.json`);
  });

  it.each(files)('%s loads, plots a lane and plays a system', (file) => {
    const raw = JSON.parse(readFileSync(new URL(file, DIR), 'utf8'));
    const j = migrate(raw);
    expect(j).not.toBeNull();
    expect(j!.version).toBe(VERSION);
    const lane = lanesFrom(j!.chart, j!.at).find((l) => l.to.col > j!.chart.systems.find((s) => s.id === j!.at)!.col);
    expect(lane).toBeDefined();
    plot(j!, lane!.to.id);
    const w = new World(j!.seed * 31 + 1, { mode: 'breakout', sortie: sortieDef(j!), carry: j!.carry });
    for (let i = 0; i < Math.round(10 / STEP); i++) w.step(STEP, input());
    expect(w.phase).not.toBe('over');
  });
});
