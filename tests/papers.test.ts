import { describe, expect, it } from 'vitest';
import { LOG, ORIGIN, STAMP } from '../src/content/papers';
import { NODE, WEB } from '../src/content/web';
import { stockLevels } from '../src/sim/bay';
import { MARK_GLYPH, MARK_WORD, papersOf, tabMark, worn, type MarkCtx } from '../src/sim/papers';

const ctx = (c: Partial<MarkCtx> = {}): MarkCtx => ({ over: false, damaged: false, ready: 0, fitted: false, reachable: true, ...c });

describe('the ship’s papers', () => {
  it('stamps only modules that exist, with a word for each origin', () => {
    for (const id of Object.keys(ORIGIN)) expect(NODE[id], id).toBeDefined();
    for (const o of Object.values(ORIGIN)) expect(STAMP[o]).toBeTruthy();
  });

  it('stamps a minority of the web, and never all of one tab', () => {
    const share = Object.keys(ORIGIN).length / WEB.length;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.4);
    for (const tab of new Set(WEB.map((n) => n.tab))) expect(WEB.filter((n) => n.tab === tab).every((n) => ORIGIN[n.id]), tab).toBe(false);
  });

  it('answers a fit in two ways', () => {
    expect(LOG.accepted).not.toBe(LOG.offSpec);
  });

  it('tells a stock ship from a modified one', () => {
    expect(papersOf(stockLevels()).modified).toBe(false);
    expect(papersOf({ ...stockLevels(), ph_emitters: 1 }).modified).toBe(true);
  });
});

describe('a tab’s state', () => {
  it('reads firmest first: overloaded, damaged, ready, stable, offline', () => {
    expect(tabMark(ctx({ over: true, damaged: true, ready: 2, fitted: true }))).toBe('over');
    expect(tabMark(ctx({ damaged: true, ready: 2, fitted: true }))).toBe('damaged');
    expect(tabMark(ctx({ ready: 1, fitted: true }))).toBe('ready');
    expect(tabMark(ctx({ fitted: true }))).toBe('stable');
    expect(tabMark(ctx({ reachable: false }))).toBe('offline');
  });

  it('says nothing for a tab that is merely out of Krail', () => {
    expect(tabMark(ctx())).toBe('none');
  });

  it('has a glyph and a word for every mark but none', () => {
    for (const m of ['over', 'damaged', 'ready', 'stable', 'offline'] as const) { expect(MARK_GLYPH[m]).toBeTruthy(); expect(MARK_WORD[m]).toBeTruthy(); }
    expect(MARK_GLYPH.none).toBe('');
  });

  it('calls plates worn at half or less, and a whole hull sound', () => {
    expect(worn(3, 3)).toBe(false);
    expect(worn(2, 3)).toBe(true);
    expect(worn(1, 1)).toBe(false);
    expect(worn(3, 6)).toBe(true);
    expect(worn(4, 6)).toBe(false);
  });
});
