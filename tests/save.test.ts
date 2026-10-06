import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearJourney, exportJourney, hasBackup, importJourney, loadJourney, restoreJourney, saveJourney, saveUnreadable,
} from '../src/meta/save';
import { newJourney } from '../src/sim/journey';

// The journey save keeps the save it replaces as a safety copy, reports a save it cannot read, and
// round-trips through an exported file.

describe('the journey save', () => {
  // the tests run without a browser: a small in-memory localStorage stands in
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    clearJourney();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the save it replaces as a safety copy', () => {
    const a = newJourney(1);
    saveJourney(a);
    expect(hasBackup()).toBe(false);
    const b = newJourney(2);
    saveJourney(b);
    expect(hasBackup()).toBe(true);
    // the latest is damaged: it is reported, and the copy comes back
    localStorage.setItem('wayward.journey', '{ not json');
    expect(loadJourney()).toBeNull();
    expect(saveUnreadable()).toBe(true);
    const back = restoreJourney();
    expect(back?.seed).toBe(1);
    expect(loadJourney()?.seed).toBe(1);
    expect(saveUnreadable()).toBe(false);
  });

  it('does not copy a broken save over a good copy', () => {
    saveJourney(newJourney(1));
    saveJourney(newJourney(2));
    localStorage.setItem('wayward.journey', '{ broken');
    saveJourney(newJourney(3));
    expect(restoreJourney()?.seed).toBe(1);
  });

  it('says nothing is wrong when there is simply no save', () => {
    expect(loadJourney()).toBeNull();
    expect(saveUnreadable()).toBe(false);
  });

  it('reports a save from a newer game as unreadable', () => {
    localStorage.setItem('wayward.journey', JSON.stringify({ version: 99 }));
    expect(loadJourney()).toBeNull();
    expect(saveUnreadable()).toBe(true);
  });

  it('exports to text and imports it back as the current save', () => {
    const j = newJourney(5);
    j.day = 4;
    const text = exportJourney(j);
    clearJourney();
    expect(importJourney('not a save')).toBeNull();
    expect(importJourney(JSON.stringify({ version: 99 }))).toBeNull();
    expect(importJourney(text)?.day).toBe(4);
    expect(loadJourney()?.seed).toBe(5);
  });
});
