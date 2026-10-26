import { describe, expect, it } from 'vitest';
import { REACH } from '../src/content/script/reach';
import { Script, type Ctx, type Output, type Row } from '../src/sim/script';
import type { Busy } from '../src/sim/desk';
import { World } from '../src/sim/world';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { regionOf } from '../src/sim/chart';
import { ROAD } from '../src/content/road';
import { migrate } from '../src/meta/save';

// The story queue (sim/script.ts): lines wait for a safe moment and are never dropped.

const radio = (id: string, stop: string, on: Row['on'], text = id, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { radio: { from: 'Sam', caller: 'miners', text } }, ...extra });
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ t: 10, arrived: 0, busy: 'free' as Busy, free: true, slow: true, tank: 0, dist: () => Infinity, flags: new Set<string>(), cardDone: () => true, ...over });
const said = (o: Output[]) => o.flatMap((x) => ('radio' in x ? [x.radio.text] : []));

describe('the story queue', () => {
  it('holds a line triggered mid-fight and plays it after', () => {
    const s = new Script([radio('a', 's', { on: 'arrive' })], 's', new Set());
    expect(said(s.step(ctx({ busy: 'fight', free: false })))).toEqual([]);
    expect(s.waiting()).toBe(true);
    expect(said(s.step(ctx({ t: 30 })))).toEqual(['a']);
    expect(s.waiting()).toBe(false);
  });

  it('never plays two lines at once, and keeps them 2 s apart and in order', () => {
    const s = new Script([radio('a', 's', { on: 'arrive' }), radio('b', 's', { on: 'arrive' })], 's', new Set());
    expect(said(s.step(ctx({ t: 10 })))).toEqual(['a']);
    expect(said(s.step(ctx({ t: 11 })))).toEqual([]);
    expect(said(s.step(ctx({ t: 12.1 })))).toEqual(['b']);
  });

  it('carries a line still waiting at the jump to the next stop, which plays it at its first free moment', () => {
    const rows = [radio('a', 's1', { on: 'arrive' }), radio('b', 's2', { on: 'free' })];
    const seen = new Set<string>();
    const first = new Script(rows, 's1', seen);
    first.step(ctx({ busy: 'fight', free: false }));
    const carried = first.pending();
    expect(carried).toEqual(['a']);
    const next = new Script(rows, 's2', seen, carried);
    expect(said(next.step(ctx({ free: false })))).toEqual([]);
    expect(said(next.step(ctx({ free: true })))).toEqual(['a']);
    expect(said(next.step(ctx({ t: 14 })))).toEqual(['b']);
    expect([...seen]).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('sets a Wall flag the moment its row triggers, before the line plays', () => {
    const s = new Script([radio('a', 's', { on: 'arrive' }, 'a', { wall: 'clue_x' })], 's', new Set());
    const out = s.step(ctx({ busy: 'fight', free: false }));
    expect(out).toEqual([{ wall: 'clue_x' }]);
    expect(said(s.step(ctx({ t: 30 })))).toEqual(['a']);
  });

  it('offers a card only at a free moment and holds the queue until it is answered', () => {
    const rows: Row[] = [
      { id: 'c', stop: 's', on: { on: 'arrive' }, do: { card: 'story_x' } },
      radio('after', 's', { on: 'arrive' }),
    ];
    const seen = new Set<string>();
    const s = new Script(rows, 's', seen);
    expect(s.step(ctx({ free: false }))).toEqual([]);
    expect(s.step(ctx({ t: 12 }))).toEqual([{ card: 'story_x' }]);
    expect(seen.has('c')).toBe(false);
    expect(s.step(ctx({ t: 20, cardDone: () => false }))).toEqual([]);
    expect(s.step(ctx({ t: 30, cardDone: () => true }))).toEqual([]);
    expect(said(s.step(ctx({ t: 32.5, cardDone: () => true })))).toEqual(['after']);
    expect(seen.has('c')).toBe(true);
  });

  it('carries a card that was offered but not answered', () => {
    const rows: Row[] = [{ id: 'c', stop: 's', on: { on: 'arrive' }, do: { card: 'story_x' } }];
    const s = new Script(rows, 's', new Set());
    s.step(ctx());
    expect(s.pending()).toEqual(['c']);
  });

  it('loses nothing across a save and reload mid-queue', () => {
    const rows = [radio('a', 's', { on: 'arrive' }), radio('b', 's', { on: 'after', row: 'a' }), radio('c', 's', { on: 'arrive' })];
    const seen = new Set<string>();
    const s = new Script(rows, 's', seen);
    s.step(ctx({ busy: 'transit', free: false }));
    const saved = JSON.parse(JSON.stringify({ pending: s.pending(), seen: [...seen] }));
    const back = new Script(rows, 's', new Set<string>(saved.seen), saved.pending);
    const heard: string[] = [];
    for (let t = 20; t < 40; t += 3) heard.push(...said(back.step(ctx({ t }))));
    expect(heard).toEqual(['a', 'c', 'b']);
  });

  it('keeps flavour only as long as it is fresh, story never', () => {
    const rows = [radio('flav', 's', { on: 'arrive' }, 'f', { stale: 5 }), radio('story', 's', { on: 'arrive' })];
    const s = new Script(rows, 's', new Set());
    s.step(ctx({ t: 1, busy: 'fight', free: false }));
    expect(said(s.step(ctx({ t: 100 })))).toEqual(['story']);
  });

  it('fires on the flag, the tank, the site and the gate', () => {
    const rows = [radio('f', 's', { on: 'flag', flag: 'x' }), radio('k', 's', { on: 'tank', share: 0.5 }), radio('n', 's', { on: 'near', site: 'mast', within: 100 }), radio('g', 's', { on: 'leave' })];
    const s = new Script(rows, 's', new Set());
    expect(s.step(ctx())).toEqual([]);
    expect(said(s.step(ctx({ t: 12, flags: new Set(['x']) })))).toEqual(['f']);
    expect(said(s.step(ctx({ t: 15, tank: 0.6 })))).toEqual(['k']);
    expect(said(s.step(ctx({ t: 18, dist: (x) => (x === 'mast' ? 50 : Infinity) })))).toEqual(['n']);
    expect(said(s.step(ctx({ t: 21, dist: (x) => (x === 'gate' ? 400 : Infinity) })))).toEqual(['g']);
  });

  it('skips a row whose condition fails', () => {
    const s = new Script([radio('a', 's', { on: 'arrive' }, 'a', { if: { has: ['yes'] } })], 's', new Set());
    expect(s.step(ctx())).toEqual([]);
    expect(said(s.step(ctx({ flags: new Set(['yes']) })))).toEqual(['a']);
  });
});

describe('Northfold plays from data', () => {
  it('has rows for the stop in the road, and no row is ever played twice', () => {
    for (const r of REACH) expect(ROAD.some((s) => s.script === r.stop)).toBe(true);
    expect(new Set(REACH.map((r) => r.id)).size).toBe(REACH.length);
  });

  it('flies in a world: notice, objective, Sam twice, then the gate objective', () => {
    const j = newJourney(5, false, 'road');
    const north = j.chart.systems.find((s) => s.name === 'Northfold')!;
    j.at = north.id;
    j.trail = [j.chart.home, j.chart.systems.find((s) => s.col === 1)!.id, north.id];
    j.carry.flags.push('archive_woke');
    const def = sortieDef(j);
    expect(def.script).toBe('northfold');
    const w = new World(3, { mode: 'breakout', sortie: def, carry: j.carry });
    const heard: string[] = [];
    const types: string[] = [];
    for (let i = 0; i < Math.round(90 / STEP); i++) {
      w.step(STEP, { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });
      for (const e of w.events) { if (e.type === 'ping' && e.from === 'Sam Okoro') heard.push(e.text); if (e.type === 'storyNotice') types.push(e.headline); }
      w.events.length = 0;
    }
    expect(types).toContain('Northfold');
    expect(heard.length).toBeGreaterThanOrEqual(1);
    expect(w.storyObjective?.main).toContain('Halden');
    expect(w.carry().seen).toContain('nf_notice');
  });

  it('keeps the queue in the save', () => {
    const j = newJourney(5, false, 'road');
    j.carry.pending = ['nf_sam_2'];
    expect(migrate(JSON.parse(JSON.stringify(j)))?.carry.pending).toEqual(['nf_sam_2']);
    expect(regionOf(j.chart.systems[1]!)).toBe(0);
  });
});
