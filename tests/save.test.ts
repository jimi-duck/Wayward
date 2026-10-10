import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearJourney, exportJourney, hasBackup, importJourney, loadJourney, migrate, restoreJourney, saveJourney, saveUnreadable,
} from '../src/meta/save';
import { newJourney, VERSION } from '../src/sim/journey';
import { TANK_MAX } from '../src/sim/purse';

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

describe('a journey saved before the overcharge was removed (version 9 and older)', () => {
  it.each([8, 9])('loses the reactor modules, keeps the rest, and gets its Krail back (saved as version %i)', (version) => {
    const j = newJourney(3) as unknown as { version: number; carry: { krail: number; levels: Record<string, number> } };
    j.version = version;
    j.carry.krail = 10;
    j.carry.levels = { tp_bay: 1, mn_layer: 1, oc_coils: 2, oc_nova: 1, sy_core_mines: 1, mo_impulse: 2 };
    const back = migrate(JSON.parse(JSON.stringify(j)))!;
    expect(back.version).toBe(VERSION);
    expect(Object.keys(back.carry.levels).some((id) => id.startsWith('oc_') || id === 'sy_core_mines')).toBe(false);
    expect(back.carry.levels).toMatchObject({ tp_bay: 1, mn_layer: 1, mo_impulse: 2 });
    // coils 40 + 60, nova 60, core-charged mines 40: 200 refunded, in chits, so 40 Cyrite
    expect(back.carry.cyrite + back.carry.fuel).toBeGreaterThanOrEqual(40);
  });

  it('splits an old save\'s Cyrite into the new drive tank and the purse (version 14 and older)', () => {
    const at = (cyrite: number) => {
      const j = newJourney(4) as unknown as { version: number; carry: { cyrite: number; fuel?: number } };
      j.version = 14;
      j.carry.cyrite = cyrite;
      delete j.carry.fuel;
      return migrate(JSON.parse(JSON.stringify(j)))!;
    };
    // a small hold goes wholly to the tank, as the jump's fuel always was
    expect(at(6).carry).toMatchObject({ fuel: 6, cyrite: 0 });
    // a big one fills the tank and the rest is the purse: nothing is lost
    const big = at(100);
    expect(big.carry).toMatchObject({ fuel: TANK_MAX, cyrite: 100 - TANK_MAX });
    expect(big.version).toBe(VERSION);
  });

  it('leaves a current save alone', () => {
    const j = newJourney(4);
    j.carry.cyrite = 77;
    expect(migrate(JSON.parse(JSON.stringify(j)))!.carry.cyrite).toBe(77);
  });
});
