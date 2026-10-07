import { beforeEach, describe, expect, it } from 'vitest';
import { type SortieResult } from '../src/sim/breakout';
import { planRoute } from '../tools/route';
import { gateOf } from '../src/sim/chart';
import { atChapter, recap } from '../src/sim/chapters';
import { endSortie, newJourney, plot, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { chapterSave, clearJourney, restartChapter, saveJourney } from '../src/meta/save';

// A chapter is a region: arriving at its gate writes a record and the save keeps the journey as it stood there.

class Store {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
}

function result(j: Journey): SortieResult {
  const r = newRun(1);
  r.escaped = true;
  return { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3, cyrite: 40, food: 30, parts: 10 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {}, ...o() };
}
const o = () => ({});

/** Flies on, lane by lane with the pilot's route planner, until the Wayward stands in the first gate. */
function toFirstGate(j: Journey): void {
  const gate = gateOf(j.chart, 0).id;
  for (let n = 0; n < 80 && j.at !== gate; n++) {
    if (j.status === 'chart') plot(j, planRoute(j));
    endSortie(j, result(j));
  }
}

describe('chapters', () => {
  beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = new Store(); });

  it('opens a record on arriving at a gate, and not before', () => {
    const j = newJourney(7, false, 'eight');
    expect(j.chapters).toBeUndefined();
    toFirstGate(j);
    expect(j.at).toBe(gateOf(j.chart, 0).id);
    expect(j.chapters?.length).toBe(1);
    expect(atChapter(j)).toBe(true);
    expect(recap(j)?.name).toBeTruthy();
  });

  it('keeps the journey at the gate, and lets the chapter start again', () => {
    const j = newJourney(7, false, 'eight');
    toFirstGate(j);
    saveJourney(j);
    const day = j.day;
    // fly on past the gate, saving as the app does
    expect(plot(j, planRoute(j))).toBe(true);
    endSortie(j, result(j));
    saveJourney(j);
    expect(atChapter(j)).toBe(false);
    expect(j.day).toBeGreaterThan(day);
    const snap = chapterSave();
    expect(snap?.day).toBe(day);
    const back = restartChapter();
    expect(back?.at).toBe(gateOf(j.chart, 0).id);
    clearJourney();
    expect(chapterSave()).toBeNull();
  });
});
