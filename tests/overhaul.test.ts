import { beforeEach, describe, expect, it } from 'vitest';
import { GATES, LEGS } from '../src/content/road';
import { SCRIPT } from '../src/content/script';
import { CARD_BY_ID, choiceView } from '../src/sim/comms';
import { ENDINGS, ENDING_BY_ID } from '../src/content/endings';
import type { SortieResult } from '../src/sim/breakout';
import { jumps, regionOf, type Chart } from '../src/sim/chart';
import { authoredEnd, choices, epilogue } from '../src/sim/endings';
import { derive } from '../src/sim/evidence';
import { endSortie, gateCheck, newJourney, options, plot, sortieDef, type Journey } from '../src/sim/journey';
import { legOf, roadRegion, scriptKey, stopAt } from '../src/sim/road';
import { Script, type Ctx, type Output, type Row } from '../src/sim/script';
import { count, debtLeft } from '../src/sim/threads';
import { newRun } from '../src/sim/run';
import { migrate } from '../src/meta/save';
import { finaleCard } from '../src/sim/calloway';
import { newDossier } from '../src/sim/calloway';
import type { Busy } from '../src/sim/desk';

// The narrative overhaul (docs/overhaul/): the authored road from Cerro to the Threshold, its main beats, the four threads,
// the Tollgate's three proofs and the six endings.

const mem = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } });

const stops = (c: Chart, leg: number) =>
  c.systems.filter((s) => regionOf(s) === leg && s.kind !== 'home' && s.kind !== 'gate' && s.kind !== 'edge').sort((a, b) => a.col - b.col);

describe('the road', () => {
  it('lays every leg out as its authored stops, one a column, on every seed', () => {
    for (const seed of [1, 2, 3, 7, 11]) {
      const j = newJourney(seed, false, 'road');
      LEGS.forEach((leg, i) => {
        expect(roadRegion(j.chart, i), `seed ${seed} leg ${i}`).toBe(true);
        stops(j.chart, i).forEach((s, k) => { if (leg[k]!.name) expect(s.name).toBe(leg[k]!.name); });
        expect(stops(j.chart, i)).toHaveLength(leg.length);
        for (const s of stops(j.chart, i)) expect(stopAt(j.chart, s)?.script).toBe(scriptKey(j.chart, s));
      });
    }
  });

  it('gives every stop and every gate rows of its own, with real cards and unique ids', () => {
    const ids = new Set(SCRIPT.map((r) => r.id));
    expect(ids.size).toBe(SCRIPT.length);
    const keys = new Set(SCRIPT.map((r) => r.stop));
    for (const r of LEGS.slice(1).flat()) expect(keys.has(r.script), r.script).toBe(true);
    for (const g of GATES.filter((x) => x.script !== 'threshold')) expect(keys.has(g.script), g.script).toBe(true);
    for (const r of SCRIPT) if ('card' in r.do) expect(CARD_BY_ID[r.do.card], r.id).toBeDefined();
  });

  it('has one or two main cards a stop past the Narrows, and a handshake and Ada’s note at every arrival', () => {
    const mainCards = new Map<string, number>();
    for (const r of SCRIPT) if (r.main && 'card' in r.do && LEGS.slice(1).flat().some((s) => s.script === r.stop)) mainCards.set(r.stop, (mainCards.get(r.stop) ?? 0) + 1);
    for (const [stop, n] of mainCards) expect(n, stop).toBeLessThanOrEqual(2);
    for (const [gate, note] of [['rift', 2], ['scrapgate', 3], ['slowdoor', 4], ['breaker', 5], ['tollgate', 6], ['seam', 7]] as const) {
      expect(SCRIPT.some((r) => r.stop === gate && r.wall === `relay_${gate}`), gate).toBe(true);
      expect(SCRIPT.some((r) => r.stop === gate && r.main && 'card' in r.do && r.do.card === `warden_note_${note}`), gate).toBe(true);
    }
  });

  it('sends each gate its own card, and none where the journey earned a clear one', () => {
    expect(gateCheck('narrows', [])).toBe('narrows_checkpoint');
    expect(gateCheck('rift', [])).toBe('rift_checkpoint');
    expect(gateCheck('scrapgate', [])).toBeNull();
    expect(gateCheck('scrapgate', ['vell_betrayed'])).toBe('scrapgate_pickets');
    expect(gateCheck('scrapgate', ['vell_betrayed', 'vell_paid'])).toBeNull();
    expect(gateCheck('breaker', [])).toBe('breaker_lockdown');
    expect(gateCheck('breaker', ['strike_held'])).toBeNull();
    expect(gateCheck('tollgate', [])).toBe('story_tollgate');
  });

  it('makes no Calloway offer of its own on a road leg: the scripts make them', () => {
    const j = newJourney(5, false, 'road');
    const wake = stops(j.chart, 1)[0]!;
    j.at = wake.id;
    j.trail.push(wake.id);
    expect(legOf(j.chart, wake)).toBe(1);
    expect(sortieDef(j).nemesis.offer).toBeNull();
  });
});

describe('the reveals', () => {
  /** Where on the road a card first plays: its stop's place, legs and gates in order. */
  const order = LEGS.flatMap((leg, i) => [...leg.map((r) => r.script), GATES[i]!.script]);
  const at = (def: string) => {
    const r = SCRIPT.find((x) => 'card' in x.do && x.do.card === def);
    expect(r, def).toBeDefined();
    return order.indexOf(r!.stop);
  };
  const inOrder = (defs: string[]) => {
    const pos = defs.map(at);
    for (const p of pos) expect(p).toBeGreaterThanOrEqual(0);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  };

  it('plays Ada’s notes one to seven at the gates, in order', () => inOrder(['warden_note_1', 'warden_note_2', 'warden_note_3', 'warden_note_4', 'warden_note_5', 'warden_note_6', 'warden_note_7']));
  it('reveals the Severance in order: the recorder, the work order, the room, the implant', () => inOrder(['story_salvor', 'story_draper', 'story_witnesses', 'story_implant']));
  it('lets the Voice speak before it asks, and the Thren be named before they are met', () => {
    inOrder(['sc_voice_knows', 'story_voice', 'seam_voice', 'sc_voice_direct']);
    inOrder(['story_thren', 'story_echo_sable', 'story_aide']);
  });
  it('asks Oren’s three questions in order', () => inOrder(['story_oren_who', 'story_oren_cost', 'story_oren_why']));
});

// ── the queue: main beats hold the gate, a release carries them, nothing is dropped or played twice ──

const card = (id: string, stop: string, on: Row['on'], def: string, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { card: def }, ...extra });
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ t: 10, arrived: 0, busy: 'free' as Busy, free: true, slow: true, tank: 0, pursuit: Infinity, dist: () => Infinity, flags: new Set<string>(), cardDone: () => true, ...over });
const cards = (o: Output[]) => o.flatMap((x) => ('card' in x ? [x.card] : []));

describe('main beats', () => {
  it('owe the gate a beat whose chain has not started yet', () => {
    const rows: Row[] = [
      { id: 'n', stop: 's', on: { on: 'free', after: 30 }, do: { notice: { tone: 'teal', headline: 'x' } } },
      card('c', 's', { on: 'after', row: 'n' }, 'warden_note_2', { main: true }),
    ];
    const s = new Script(rows, 's', new Set());
    expect(s.owed(new Set()).any).toBe(true);
  });

  it('hold for a handshake with no clock, and say so', () => {
    const s = new Script([card('h', 's', { on: 'near', site: 'relay', within: 200 }, 'warden_note_2', { main: true })], 's', new Set());
    expect(s.owed(new Set())).toEqual({ any: true, handshake: true });
  });

  it('carry a released beat to the next stop, play it first there, and never again', () => {
    const rows: Row[] = [card('m', 's1', { on: 'flag', flag: 'never' }, 'warden_note_2', { main: true }), card('m2', 's1', { on: 'free', after: 9999 }, 'warden_note_3', { main: true })];
    const seen = new Set<string>();
    const first = new Script(rows, 's1', seen);
    expect(first.release(new Set())).toEqual(['m2']);
    expect(first.owed(new Set()).any).toBe(false);
    const carried = first.pending();
    expect(carried).toEqual(['m2']);
    const next = new Script(rows, 's2', seen, JSON.parse(JSON.stringify(carried)));
    expect(cards(next.step(ctx()))).toEqual(['warden_note_3']);
    next.step(ctx({ t: 20 }));
    expect(seen.has('m2')).toBe(true);
    const again = new Script(rows, 's1', seen);
    expect(cards(again.step(ctx({ t: 99999 })))).toEqual([]);
  });

  it('keep a card waiting out across a save: it is pending until answered', () => {
    const rows: Row[] = [card('a', 's', { on: 'arrive' }, 'warden_note_2', { main: true })];
    const seen = new Set<string>();
    const s = new Script(rows, 's', seen);
    expect(cards(s.step(ctx()))).toEqual(['warden_note_2']);
    s.step(ctx({ t: 11, cardDone: () => false }));
    expect(s.owed(new Set()).any).toBe(true);
    const saved = s.pending();
    expect(saved).toEqual(['a']);
    const loaded = new Script(rows, 's', new Set(seen), saved);
    expect(cards(loaded.step(ctx()))).toEqual(['warden_note_2']);
  });
});

// ── the threads, the debt and the proofs, read off the flags ──

describe('the threads', () => {
  it('count a won job, not one settled aside, and take Hester’s down for the tanker and the payroll', () => {
    const f = ['job_follow_cyrite_won', 'job_pirate_toll_won', 'job_missing_shift_won', 'job_one_filter_won', 'job_long_walk_won', 'job_long_walk_sell'];
    expect(count(f, 'crews')).toBe(4);
    expect(count([...f, 'job_heavy_tanker_won'], 'crews')).toBe(3);
    expect(count([...f, 'job_heavy_tanker_won', 'job_missing_payroll_won'], 'crews')).toBe(1);
  });

  it('take the debt down 14 a step, to nothing at the sixth', () => {
    expect(debtLeft([])).toBe(80);
    expect(debtLeft(['job_wanted_won'])).toBe(66);
    expect(debtLeft(['job_wanted_won', 'job_heavy_tanker_won', 'job_missing_payroll_won', 'job_drift_cache_won', 'job_be_bait_won', 'job_two_captains_won'])).toBe(0);
  });

  it('keep their step flags in step with the flags, every time', () => {
    const f = new Set(['job_nothing_to_declare_won', 'job_keep_distance_won', 'job_dead_drop_won', 'relay_narrows', 'relay_rift']);
    derive(f);
    expect([...f]).toEqual(expect.arrayContaining(['thread_line_1', 'thread_line_3', 'relays_2']));
    expect(f.has('thread_line_4')).toBe(false);
    f.delete('job_dead_drop_won');
    derive(f);
    expect(f.has('thread_line_3')).toBe(false);
  });

  it('show a chip on every job of the four threads', () => {
    for (const id of ['sc_declare', 'sc_distance', 'sc_dead_drop', 'sc_witness', 'sc_finders', 'sc_needle', 'sc_prefect', 'sc_follow', 'sc_toll', 'sc_missing', 'sc_filter', 'sc_long_walk', 'sc_shift', 'sc_kill_zone',
      'sc_wreck', 'sc_dark', 'sc_wire', 'sc_answered', 'sc_hole', 'sc_wanted', 'sc_tanker', 'sc_payroll', 'sc_cache', 'sc_bait', 'sc_captains']) expect(CARD_BY_ID[id]!.thread, id).toBeDefined();
  });
});

describe('the Tollgate’s three proofs', () => {
  const tollCtx = (flags: string[]) => ({ levels: {}, plates: 4, flags: new Set(flags), cyrite: 60, fuel: 10, need: 5, supplies: 5, heat: 0, standing: {}, fitted: new Set<string>(), notice: {} }) as never;
  const ok = (flags: string[]) => {
    const f = new Set(flags);
    derive(f);
    const def = CARD_BY_ID.story_tollgate!;
    return choiceView(def.choices.find((c) => c.id === 'sign')!, def, tollCtx([...f]), 0).ok;
  };

  it('opens the signature by either route to each proof', () => {
    expect(ok([])).toBe(false);
    expect(ok(['clue_sig_reach', 'clue_sig_yards', 'clue_sig_ports'])).toBe(true);
    expect(ok(['frag_order', 'clue_sig_serial', 'forty_known'])).toBe(true);
    expect(ok(['frag_order', 'clue_sig_serial'])).toBe(false);
  });

  it('offers the Quiet Line’s answer only with five steps of it, and drops the field whatever she picks', () => {
    const def = CARD_BY_ID.story_tollgate!;
    const line = def.choices.find((c) => c.id === 'line')!;
    expect(line.show).toEqual({ flag: 'thread_line_5' });
    for (const c of def.choices) expect([c.win.flag].flat(), c.id).toContain('field_dropped');
  });
});

// ── the six endings ──

function result(j: Journey, c: Partial<Journey['carry']> = {}): SortieResult {
  const r = newRun(1);
  r.escaped = true;
  return { ended: 'jumped', time: 60, carry: { ...j.carry, plates: 3, supplies: 30, cyrite: 20, ...c }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} };
}

/** Down the road to the Threshold, with the carry changed by `c` on the way. */
function toThreshold(c: Partial<Journey['carry']> = {}, seed = 7): Journey {
  const j = newJourney(seed, false, 'road');
  endSortie(j, result(j, c));
  let guard = 0;
  while (j.status === 'chart' && guard++ < 80) {
    const o = options(j).sort((a, b) => jumps(j.chart, a.to.id, j.chart.edge) - jumps(j.chart, b.to.id, j.chart.edge))[0]!;
    plot(j, o.to.id);
    endSortie(j, result(j, c));
  }
  return j;
}

const open = (j: Journey) => choices(j).filter((c) => c.open).map((c) => c.def.id);

describe('the endings on the road', () => {
  beforeEach(() => mem.clear());

  it('reaches the Threshold down the authored road', () => {
    const j = toThreshold();
    expect(j.status).toBe('over');
    expect(j.end).toBe('through');
    expect(authoredEnd(j)).toBe(true);
  });

  it('opens each of the six by what the road built', () => {
    expect(open(toThreshold())).toEqual(['vanish']);
    expect(open(toThreshold({ flags: ['voice_read'] }))).toContain('broadcast');
    expect(open(toThreshold({ flags: ['pact_holdfast', 'pact_drift'] }))).toContain('unite');
    expect(open(toThreshold({ flags: ['gutter_friend'] }))).toContain('sell');
    expect(open(toThreshold({ flags: ['calloway_turned'] }))).toContain('trade');
    expect(open(toThreshold({ flags: ['lane_keys'] }))).toContain('seal');
  });

  it('reads each ending as the road’s: an opener, one line a slot at most, Oren’s answer, and the close', () => {
    const j = toThreshold({ flags: ['voice_read', 'field_line', 'copy_warden', 'oren_truth'] });
    const lines = epilogue(j, 'broadcast');
    const r = ENDING_BY_ID.broadcast.road;
    expect(lines[0]).toBe(r.open);
    expect(lines.at(-1)).toBe(r.close);
    expect(lines).toContain('It doesn’t leave on one ship. Quill and a hundred hulls carry copies into the core.');
    expect(lines).toContain('You said it was for the truth. Oren writes that down.');
    expect(lines.length).toBeLessThanOrEqual(6);
    for (const e of ENDINGS) {
      expect(epilogue(toThreshold(), e.id)[0]).toBe(e.road.open);
      expect(epilogue(toThreshold(), e.id).at(-1)).toBe(e.road.close);
    }
  });

  it('keeps the old epilogues off the road', () => {
    const j = newJourney(7);
    expect(authoredEnd(j)).toBe(false);
  });
});

describe('Calloway at the Threshold', () => {
  it('adds the road’s lines after your history and before her last word', () => {
    const c = finaleCard(newDossier(), { caught: 1, beaten: 0 }, ['sig_used', 'field_dropped', 'noor_met', 'seam_key_given', 'draper_recorded']);
    expect(c.text).toContain('He asked for ten years.');
    expect(c.text).toContain('every full tank home');
    expect(c.text).toContain('a machine that cannot say no');
    expect(c.text).toContain('He will still try to sell you.');
    expect(c.text.endsWith('“The Threshold is behind me. Power down.”')).toBe(true);
  });
});

describe('a road save from before the whole road', () => {
  /** A road journey in the Reach whose legs past the Narrows were dealt, not authored (as a v21 save has them). */
  const oldSave = (at: number) => {
    const j = newJourney(7, false, 'road');
    const reach = stops(j.chart, 0);
    j.trail = [j.chart.home, ...reach.slice(0, at + 1).map((s) => s.id)];
    j.at = reach[at]!.id;
    j.dest = null;
    const o = JSON.parse(JSON.stringify(j)) as Journey;
    o.version = 21;
    o.chart.systems.filter((s) => regionOf(s) >= 1 && s.kind !== 'gate' && s.kind !== 'edge').forEach((s, i) => { s.name = `Dealt ${i}`; });
    o.chart.visited = [...j.trail];
    return o;
  };

  it('gets the authored road ahead while it is still in the Reach, and keeps what it knows', () => {
    const o = oldSave(3);
    expect(roadRegion(o.chart, 1)).toBe(false);
    const back = migrate(o)!;
    expect(back.version).toBe(22);
    for (let i = 0; i < LEGS.length; i++) expect(roadRegion(back.chart, i), `leg ${i}`).toBe(true);
    expect(back.at).toBe(o.at);
    expect(back.chart.visited).toEqual(o.chart.visited);
  });

  it('keeps the legs it was dealt once past the Narrows', () => {
    const o = oldSave(3);
    const far = o.chart.systems.find((s) => regionOf(s) === 1 && s.kind !== 'gate')!;
    o.trail.push(far.id);
    o.at = far.id;
    const back = migrate(o)!;
    expect(roadRegion(back.chart, 1)).toBe(false);
    expect(back.chart.systems.find((s) => s.id === far.id)!.name).toBe(far.name);
  });
});
