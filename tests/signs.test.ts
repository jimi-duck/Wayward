import { beforeAll, describe, expect, it } from 'vitest';
import { SIGNS } from '../src/content/gatesigns';
import { mixAt, pickSign, ripe, signCtx, signHold, signRuns, SIGN_HOLD, type SignCtx } from '../src/sim/signs';
import { SIGNS_DE } from '../src/i18n/de/signs';
import { PLACES_DE } from '../src/i18n/de/places';
import { LEGS } from '../src/content/road';

// The signs by the Jump Gates (content/gatesigns.ts, sim/signs.ts): a library of lines in categories, a weighted pick that
// never repeats, and a mix that moves from the Continuance's voice toward the truth as relays wake.

function rng(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; }; }
const def = { script: LEGS[1]![0]!.script, holder: 'frontier' };
const ctx = (flags: string[], relays = 0, lit = false): SignCtx => {
  const c = signCtx(new Set(flags), def, 'relay_x');
  return { ...c, relays, lit };
};
const run = (c: SignCtx, slot: number, n: number, seed = 1) => {
  const r = rng(seed); let prev = null as ReturnType<typeof pickSign> | null; const out = [];
  for (let i = 0; i < n; i++) { prev = pickSign(r, c, slot, prev); out.push(prev); }
  return out;
};

describe('the gate signs: library', () => {
  it('has unique ids, well-formed markup and a real follower for every `then`', () => {
    const ids = SIGNS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of SIGNS) {
      expect(signRuns(d.text).map((r) => r.text).join('').length, d.id).toBeLessThan(62);
      expect((d.text.match(/\[/g) ?? []).length, d.id).toBe((d.text.match(/\|/g) ?? []).length);
      if (d.cat === 'defaced') expect(signRuns(d.text).some((r) => r.old !== undefined), d.id).toBe(true);
      if (d.then) expect(ids, d.id).toContain(d.then);
    }
  });
  it('holds every line the brief asked for', () => {
    const n = (c: string) => SIGNS.filter((d) => d.cat === c && !d.id.startsWith('official_the_') ).length;
    expect(SIGNS.filter((d) => d.cat === 'defaced')).toHaveLength(8);
    expect(SIGNS.filter((d) => d.cat === 'krail')).toHaveLength(10);
    expect(SIGNS.filter((d) => d.cat === 'civilian')).toHaveLength(10);
    expect(SIGNS.filter((d) => d.cat === 'rare')).toHaveLength(8);
    expect(n('resistance')).toBeGreaterThanOrEqual(15);
  });
  it('says every line in German too', () => {
    for (const d of SIGNS) for (const run of [d.text]) expect(SIGNS_DE[run] ?? PLACES_DE[run], run).toBeTruthy();
    for (const tag of ['Unregistered signal', 'Recovered record', 'Open channel · unverified', 'Warden relay · automatic']) expect(SIGNS_DE[tag]).toBeTruthy();
  });
});

describe('the gate signs: picking', () => {
  it('never shows a line twice in a row, on any panel, early or late', () => {
    for (const [flags, relays] of [[[], 0], [['clue_reserves'], 8]] as const) for (const slot of [0, 1, 2]) {
      const seq = run(ctx([...flags], relays), slot, 400, slot + 3);
      for (let i = 1; i < seq.length; i++) expect(seq[i]!.id).not.toBe(seq[i - 1]!.id);
    }
  });
  it('holds each line 8 to 12 seconds', () => {
    const r = rng(9);
    for (let i = 0; i < 200; i++) { const h = signHold(r); expect(h).toBeGreaterThanOrEqual(SIGN_HOLD[0]); expect(h).toBeLessThanOrEqual(SIGN_HOLD[1]); }
  });
  it('starts as the Continuance’s voice with graffiti already up, and no truth she has not found', () => {
    const early = run(ctx([], 0), 0, 1500).concat(run(ctx([], 0), 1, 1500, 2), run(ctx([], 0), 2, 1500, 3));
    const share = (c: string) => early.filter((d) => d.cat === c).length / early.length;
    expect(share('official')).toBeGreaterThan(0.3);
    expect(share('defaced') + share('resistance')).toBeGreaterThan(0.25);
    // only the two questions anyone could scrawl, never the 94%
    expect(early.filter((d) => d.cat === 'krail').every((d) => /Who ordered|Find the reserves/.test(d.text))).toBe(true);
    expect(early.some((d) => /94%/.test(d.text))).toBe(false);
  });
  it('after the Krail record, the 94% shows; the sharpest line waits for more relays', () => {
    const lines = (relays: number) => new Set(run(ctx(['clue_reserves'], relays), 2, 3000, 5).map((d) => d.text));
    expect(lines(0).has('94% remained. They knew.')).toBe(true);
    expect(lines(1).has('They didn’t run out of Krail. They ran out of excuses.')).toBe(false);
    expect(lines(10).has('They didn’t run out of Krail. They ran out of excuses.')).toBe(true);
  });
  it('mixes about 25 / 30 / 20 / 10 / 10 / 5 half way along', () => {
    // all three panels together, the share of each category's weight
    const c = ctx(['clue_reserves'], 6);
    const sum: Record<string, number> = {};
    for (const slot of [0, 1, 2]) for (const [k, w] of Object.entries(mixAt({ ...c, lean: {} }, slot))) sum[k] = (sum[k] ?? 0) + w;
    const total = Object.values(sum).reduce((a, b) => a + b, 0);
    const pct = (k: string) => (100 * sum[k]!) / total;
    expect(pct('official')).toBeGreaterThan(15); expect(pct('official')).toBeLessThan(40);
    expect(pct('defaced')).toBeGreaterThan(20); expect(pct('defaced')).toBeLessThan(40);
    expect(pct('krail')).toBeGreaterThan(5); expect(pct('krail')).toBeLessThan(20);
  });
  it('shows the sealed gate status only while this gate’s relay sleeps', () => {
    const sealed = SIGNS.find((d) => d.text === 'Gate status: sealed.')!;
    expect(ripe(sealed, ctx([], 0, false))).toBe(true);
    expect(ripe(sealed, ctx([], 0, true))).toBe(false);
    expect(ripe(SIGNS.find((d) => d.text === 'Warden key accepted. Relay online.')!, ctx([], 0, false))).toBe(false);
  });
  it('lets a flagged message be removed, and restored only much later', () => {
    const flagged = SIGNS.find((d) => d.id === 'flagged')!;
    const removed = pickSign(() => 0.1, ctx([], 0), 0, flagged);
    expect(removed.id).toBe('removed');
    expect(ripe(SIGNS.find((d) => d.id === 'restored')!, ctx([], 2))).toBe(false);
    expect(pickSign(() => 0.1, ctx([], 12), 0, removed).id).toBe('restored');
  });
  it('gives gates different pools', () => {
    const a = signCtx(new Set(), { script: LEGS[1]![0]!.script }, 'x'), b = signCtx(new Set(), { script: LEGS[3]![1]!.script }, 'x');
    expect(a.lean).not.toEqual(b.lean);
  });
});
