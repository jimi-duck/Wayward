import { describe, expect, it } from 'vitest';
import { FEATURE_ORDER, NAMED } from '../src/content/features';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { Gallery } from '../src/review/gallery';
import { ELITE_ORDER, VARIANT_ORDER } from '../src/sim/enemies';
import { ROCK_KINDS } from '../src/sim/field';
import { POWERS } from '../src/sim/pickups';
import { World } from '../src/sim/world';

const input = (f: Partial<InputFrame> = {}): InputFrame =>
  ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, brk: false, device: 'keyboard', ...f });

function make(): { w: World; g: Gallery } {
  const w = new World(5, { review: true });
  return { w, g: new Gallery(w) };
}

describe('the review world', () => {
  it('shows one of every hull, elite, capital ship, rock, bulwark and pickup', () => {
    const { w } = make();
    expect(w.aliens.filter((a) => !a.elite).map((a) => a.variant).sort()).toEqual([...VARIANT_ORDER].sort());
    expect(w.aliens.filter((a) => a.elite).map((a) => a.elite).sort()).toEqual([...ELITE_ORDER].sort());
    expect(new Set(w.review!.bosses.map((b) => b.faction)).size).toBe(5);
    for (const kind of Object.keys(ROCK_KINDS)) for (const size of [0, 1, 2]) expect(w.field.rocks.some((r) => r.kind === kind && r.size === size), `${kind} ${size}`).toBe(true);
    expect(w.field.bulwarks.length).toBe(3);
    expect(new Set(w.pickups.filter((p) => p.kind === 'crystal').map((p) => p.value))).toEqual(new Set([1, 2, 3, 4, 5]));
    for (const k of ['cyrite', 'ore', 'parts', 'repair', ...POWERS] as const) expect(w.pickups.some((p) => p.kind === k), k).toBe(true);
    expect(w.review!.bk?.port).toBeTruthy();
  });

  it('has a stop and a name for every feature, named place and event', () => {
    const { g } = make();
    const ids = new Set(g.stops.map((s) => s.id));
    for (const f of FEATURE_ORDER) expect(ids.has(`feature:${f}`), f).toBe(true);
    for (const n of Object.keys(NAMED)) expect(ids.has(`named:${n}`), n).toBe(true);
    for (const e of ['distress', 'derelict', 'ion_storm', 'nebula', 'anomaly']) expect(ids.has(`event:${e}`), e).toBe(true);
    for (const s of g.stops) expect(g.labels.some((l) => l.stop === s.id), `${s.id} has a label`).toBe(true);
  });

  it('builds each space stop alone, and clears it on leaving', () => {
    const { w, g } = make();
    for (const s of g.stops) {
      g.go(s.id);
      const feature = s.id.startsWith('feature:') || s.id.startsWith('named:');
      expect(w.space!.features.length, s.id).toBe(feature ? 1 : 0);
      expect(!!w.encounter, s.id).toBe(s.id.startsWith('event:'));
    }
  });

  it('cannot be hurt, and holds everything still while the ship flies through it all', () => {
    const { w, g } = make();
    const still = () => JSON.stringify([w.aliens.map((a) => [a.x, a.y, a.z]), w.field.rocks.map((r) => [r.x, r.z]), w.review!.bosses.map((b) => [b.x, b.z]), w.pickups.map((p) => [p.x, p.z])]);
    const before = still();
    const plates = w.plates, shields = w.shields;
    for (const s of g.stops) {
      g.go(s.id);
      for (let i = 0; i < 600; i++) w.step(STEP, input({ thrust: 1, fire: true, turn: i % 200 < 100 ? 0.4 : -0.4 }));
      expect(w.alive, s.id).toBe(true);
      expect(w.alert(), s.id).toBe('clear');
    }
    g.go(g.stops[0]!.id);
    expect(still()).toBe(before);
    expect(w.plates).toBe(plates);
    expect(w.shields).toBe(shields);
    expect(w.phase).toBe('play');
  });

  it('keeps a normal world as it was', () => {
    const w = new World(5);
    expect(w.review).toBeNull();
    for (let i = 0; i < 60; i++) w.step(STEP, input({ thrust: 1 }));
    expect(w.runTime).toBeGreaterThan(0.9);
  });
});
