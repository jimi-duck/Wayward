import { beforeEach, describe, expect, it } from 'vitest';
import { availableModifiers, grants, loadProfile, migrate, recordRun } from '../src/meta/profile';
import { newRun } from '../src/sim/run';

// a small in-memory localStorage, so the profile can be tested in node
const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
});

const runWith = (o: Partial<ReturnType<typeof newRun>>) => ({ ...newRun(1), ...o });

describe('the profile between runs', () => {
  beforeEach(() => mem.clear());

  it('keeps bests and compares a run against the best before it', () => {
    const p = loadProfile();
    const a = recordRun(p, runWith({ score: 1000, time: 120, bestChain: 5 }));
    expect(a.newBest).toBe(true);
    expect(a.previous.score).toBe(0);
    const b = recordRun(loadProfile(), runWith({ score: 800, time: 200, bestChain: 9 }));
    expect(b.newBest).toBe(false);
    expect(b.previous.score).toBe(1000);
    const q = loadProfile();
    expect(q.best).toMatchObject({ score: 1000, time: 200, chain: 9 });
    expect(q.life.runs).toBe(2);
    expect(q.history.length).toBe(2);
  });

  it('earns unlocks by doing things, and they open options, not power', () => {
    const p = loadProfile();
    expect(grants(p)).toEqual([]);
    const r = recordRun(p, runWith({ time: 310, overcharges: 6, capitalFactions: ['voice'], capitals: 1 }));
    const ids = r.unlocked.map((u) => u.id);
    expect(ids).toContain('u_derelict');
    expect(ids).toContain('u_phase');
    expect(ids).toContain('u_regenerative');
    expect(grants(loadProfile())).toEqual(expect.arrayContaining(['derelict', 'oc_phase', 'df_regenerative']));
    // earned once
    expect(recordRun(loadProfile(), runWith({ time: 310 })).unlocked.map((u) => u.id)).not.toContain('u_derelict');
  });

  it('offers a challenge modifier only once it is earned', () => {
    const p = loadProfile();
    expect(availableModifiers(p)).toEqual([]);
    recordRun(p, runWith({ time: 500 }));
    expect(availableModifiers(loadProfile())).toContain('ironman');
  });

  it('plays on when storage refuses', () => {
    const real = globalThis.localStorage;
    Object.assign(globalThis, { localStorage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } });
    const p = loadProfile();
    expect(() => recordRun(p, runWith({ score: 5 }))).not.toThrow();
    Object.assign(globalThis, { localStorage: real });
  });
});

describe('the WAYWARD rename', () => {
  it('moves dilithium to krail and the old faction ids to the new ones', () => {
    const old = {
      best: { score: 10, dilithium: 40 },
      life: { runs: 3, dilithium: 120, capitalsBy: { klingon: 2, borg: 1, gutter: 1 } },
    };
    const p = migrate(old);
    expect(p.best).toEqual({ score: 10, krail: 40 });
    expect(p.life.krail).toBe(120);
    expect(p.life.capitalsBy).toEqual({ gutter: 3, voice: 1 });
  });

  it('leaves a renamed profile alone', () => {
    const now = { best: { krail: 5 }, life: { krail: 9, capitalsBy: { thren: 1 } } };
    expect(migrate(structuredClone(now))).toEqual(now);
  });
});
