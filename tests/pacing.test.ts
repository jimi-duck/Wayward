import { describe, expect, it } from 'vitest';
import { angleDelta } from '../src/core/math';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { UPGRADES } from '../src/content/upgrades';
import { computeStats, upgradeFigures } from '../src/sim/build';
import { pressure } from '../src/sim/director';
import { ALIEN_FIRST, alienFire, moveAlien, SPAWN_NEAR, spawnAlien, type Arena } from '../src/sim/enemies';
import type { GameEvent } from '../src/sim/events';
import { blockOf } from '../src/sim/bay';
import { APPROACHES, PACING, pickApproach, waveSize } from '../src/sim/pacing';
import { hurtMend, newMend, SELF_REPAIR, stepMend } from '../src/sim/repair';
import { Rng } from '../src/sim/rng';
import { newShip } from '../src/sim/ship';
import { BASE } from '../src/sim/stats';
import { World } from '../src/sim/world';

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, brk: false, overcharge: false, device: 'keyboard' };

function run(w: World, seconds: number, each?: (w: World) => void) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (w.phase === 'hail') w.answerHail(false);
    w.step(STEP, idle);
    each?.(w);
  }
}

/** A world with no rock, no capital ships and no sector events: only the encounters. */
function open(seed = 5): World {
  const w = new World(seed);
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  w.command.next = 1e9;
  (w as unknown as { nextEvent: number }).nextEvent = 1e9;
  return w;
}
/** And no encounters either. */
function still(seed = 5): World {
  const w = open(seed);
  w.pace.until = 1e9;
  return w;
}
const hit = (w: World) => (w as unknown as { hitShip(source: string): void }).hitShip('test');
const arena = (notice = 1): Arena => ({ bulwarks: [], rocks: [], aliens: [], bolts: [], notice });

describe('self-repair (the rules)', () => {
  const stats = { repairDelay: BASE.repairDelay, repairRate: BASE.repairRate, repairMax: BASE.repairMax, repairUnderFire: false };
  const ctx = (o: Partial<Parameters<typeof stepMend>[1]> = {}) => ({ sinceHit: 100, plates: 1, maxPlates: 3, danger: false, stats, ...o });

  it('waits for the delay, then fills a plate at the rate', () => {
    const m = newMend();
    expect(stepMend(m, ctx({ sinceHit: SELF_REPAIR.delay - 0.1 }), 1)).toBeNull();
    expect(m.state).toBe('waiting');
    expect(stepMend(m, ctx(), 1)).toBe('start');
    expect(m.progress).toBeCloseTo(1 / SELF_REPAIR.perPlate);
    let news = null;
    for (let i = 0; i < SELF_REPAIR.perPlate && news !== 'plate'; i++) news = stepMend(m, ctx(), 1);
    expect(news).toBe('plate');
  });

  it('holds (keeping its progress) while danger is near, and a hit throws the plate away', () => {
    const m = newMend();
    for (let i = 0; i < 5; i++) stepMend(m, ctx(), 1);
    const kept = m.progress;
    stepMend(m, ctx({ danger: true }), 1);
    expect(m.state).toBe('paused');
    expect(m.progress).toBe(kept);
    hurtMend(m);
    expect(m.progress).toBe(0);
    expect(m.state).toBe('waiting');
  });

  it('mends no more than its allowance in one quiet spell; danger starts a new one', () => {
    const m = newMend();
    let plates = 1;
    for (let i = 0; i < 200; i++) if (stepMend(m, ctx({ plates }), 1) === 'plate') plates++;
    expect(plates).toBe(1 + SELF_REPAIR.max);
    expect(m.state).toBe('spent');
    stepMend(m, ctx({ plates, danger: true }), 1);
    for (let i = 0; i < 200; i++) if (stepMend(m, ctx({ plates }), 1) === 'plate') plates++;
    expect(plates).toBe(Math.min(3, 1 + 2 * SELF_REPAIR.max));
  });

  it('a regenerative hull works with danger near', () => {
    const m = newMend();
    expect(stepMend(m, { ...ctx({ danger: true }), stats: { ...stats, repairUnderFire: true } }, 1)).toBe('start');
  });
});

describe('self-repair (in the arcade)', () => {
  it('mends a plate after a quiet spell, and says so', () => {
    const w = still();
    w.plates = 1;
    const seen: GameEvent['type'][] = [];
    run(w, SELF_REPAIR.delay + SELF_REPAIR.perPlate + 0.5, (x) => seen.push(...x.drain().map((e) => e.type)));
    expect(w.plates).toBe(2);
    expect(w.run.platesMended).toBe(1);
    expect(seen).toContain('mendStart');
    expect(seen).toContain('mended');
  });

  it('stops at once when the ship is hit', () => {
    const w = still();
    w.plates = 2;
    run(w, SELF_REPAIR.delay + 5);
    expect(w.mend.progress).toBeGreaterThan(0);
    w.shields = 0;
    hit(w);
    expect(w.plates).toBe(1);
    expect(w.mend.progress).toBe(0);
    expect(w.mend.state).toBe('waiting');
  });

  it('pauses while a hostile is in range', () => {
    const w = still();
    w.plates = 1;
    run(w, SELF_REPAIR.delay + 3);
    const al = spawnAlien('lancer', w.ship, 0, w.rng, { x: 0, y: 0, z: -30 });
    al.escort = false;
    al.mode = 'hold';
    w.aliens.push(al);
    w.ship.invuln = 99;
    run(w, 0.5);
    expect(w.mend.state).toBe('paused');
  });

  it('is the arcade’s: the Story mode patches plates from parts instead', () => {
    const w = new World(2, { mode: 'breakout' });
    w.plates = 1;
    run(w, SELF_REPAIR.delay + SELF_REPAIR.perPlate + 1);
    expect(w.run.platesMended).toBe(0);
  });

  it('Repair drones and the regenerative hull improve it; the figures say so in the arcade only', () => {
    const s = computeStats({ df_repair: 1 });
    expect(s.repairDelay).toBeLessThan(BASE.repairDelay);
    expect(s.repairRate).toBeGreaterThan(BASE.repairRate);
    expect(s.repairMax).toBe(BASE.repairMax + 1);
    expect(computeStats({ df_regenerative: 1 }).repairUnderFire).toBe(true);
    expect(upgradeFigures({}, 'df_repair').map((f) => f.label)).toContain('Self-repair, a plate');
    expect(upgradeFigures({}, 'df_regenerative', false).map((f) => f.label)).not.toContain('Self-repair, a plate');
  });
});

describe('encounters', () => {
  it('opens on a single scout that looks you over before it commits', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const w = open(seed);
      run(w, ALIEN_FIRST + 0.2);
      expect(w.aliens.length).toBe(1);
      expect(['patrol', 'investigate']).toContain(w.aliens[0]!.approach);
    }
  });

  it('never sends a hull in ahead of the ship, nor close by', () => {
    const w = open(9);
    const known = new Set<number>();
    let n = 0;
    run(w, 420, (x) => {
      x.ship.heading += 0.004; // the ship looks round as it goes
      for (const a of x.aliens) {
        if (known.has(a.id)) continue;
        known.add(a.id);
        if (a.escort || a.extra) continue;
        n++;
        const off = Math.abs(angleDelta(x.ship.heading, Math.atan2(-(a.z - x.ship.z), a.x - x.ship.x)));
        expect(off).toBeGreaterThan(PACING.noseClear - 0.12);
        expect(Math.hypot(a.x - x.ship.x, a.z - x.ship.z)).toBeGreaterThan(SPAWN_NEAR - 10);
      }
      x.ship.invuln = 1;
    });
    expect(n).toBeGreaterThan(5);
  });

  it('gives a quiet spell between encounters', () => {
    const w = open(4);
    let quietAt = -1;
    const gaps: number[] = [];
    run(w, 600, (x) => {
      for (const e of x.drain()) {
        if (e.type === 'quiet') quietAt = x.runTime;
        if (e.type === 'contacts' && quietAt >= 0) { gaps.push(x.runTime - quietAt); quietAt = -1; }
      }
      // the ship wins every fight at once: each wave is cleared as it arrives
      x.aliens.length = 0;
      x.ship.invuln = 1;
    });
    expect(gaps.length).toBeGreaterThan(8);
    for (const g of gaps) expect(g).toBeGreaterThanOrEqual(w.pressure.lull - 0.1);
  });

  it('grows the groups with the clock and the refits, under the ceiling', () => {
    expect(waveSize(pressure(60), 0)).toBe(1);
    expect(waveSize(pressure(360), 0)).toBeGreaterThan(waveSize(pressure(60), 0));
    expect(waveSize(pressure(360), 15)).toBeGreaterThan(waveSize(pressure(360), 0));
    for (const t of [60, 300, 600, 900]) expect(waveSize(pressure(t), 40)).toBeLessThanOrEqual(pressure(t).enemyCap);
  });

  it('looks you over first early on, and commits more often later', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 50; i++) expect(['patrol', 'investigate']).toContain(pickApproach('interceptor', 30, rng));
    const late = new Set(Array.from({ length: 200 }, () => pickApproach('interceptor', 600, rng)));
    for (const a of ['direct', 'flank', 'intercept', 'circle']) expect(late).toContain(a);
    expect(pickApproach('special', 600, rng)).toBe('direct');
    expect(Object.keys(APPROACHES).length).toBeGreaterThanOrEqual(6);
  });
});

describe('approaches', () => {
  it('a hull coming straight in only closes and engages: nothing of the patrol or the watch', () => {
    const ship = newShip(), rng = new Rng(8), events: GameEvent[] = [];
    const al = spawnAlien('scout', ship, 100, rng, { x: 130, y: 6, z: 0 });
    al.escort = false;
    const t0 = al.modeT;
    moveAlien(al, ship, STEP, arena(), [], rng, events);
    expect(al.modeT).toBeLessThan(t0);
    for (let i = 0; i < 600 && al.mode === 'approach'; i++) moveAlien(al, ship, STEP, arena(), [], rng, events);
    expect(al.mode).not.toBe('approach');
    expect(al.approach).toBe('direct');
    expect(events.some((e) => e.type === 'noticed')).toBe(false);
  });

  it('a hull shot while it closes keeps its way of closing', () => {
    const ship = newShip(), rng = new Rng(9), events: GameEvent[] = [];
    const al = spawnAlien('scout', ship, 100, rng, { x: 130, y: 6, z: 0 }, { approach: 'intercept' });
    al.escort = false;
    al.calm = 0;
    al.ax = 500; al.az = 500;
    moveAlien(al, ship, STEP, arena(), [], rng, events);
    expect(al.mode).toBe('approach');
    expect(al.approach).toBe('intercept');
    expect(events.some((e) => e.type === 'noticed')).toBe(false);
  });

  it('a patrol keeps to its beat and holds its fire until it sees you', () => {
    const ship = newShip(), rng = new Rng(1), events: GameEvent[] = [];
    const al = spawnAlien('scout', ship, 100, rng, { x: 100, y: 5, z: -60 }, { approach: 'patrol' });
    al.mode = 'patrol'; al.ax = 100; al.az = 60; al.modeT = PACING.patrolTime;
    const shots: Parameters<typeof alienFire>[3] = [];
    for (let i = 0; i < 300; i++) { moveAlien(al, ship, STEP, arena(), [], rng, events); alienFire(al, ship, 100 + i * STEP, shots, [], rng, events); }
    expect(al.mode).toBe('patrol');
    expect(shots.length).toBe(0);
    // the ship comes close: it turns on you
    ship.x = al.x - 30; ship.z = al.z;
    moveAlien(al, ship, STEP, arena(), [], rng, events);
    expect(al.mode).not.toBe('patrol');
    expect(events.some((e) => e.type === 'noticed')).toBe(true);
  });

  it('quiet running lets you closer before a patrol notices', () => {
    const rng = new Rng(2);
    const at = (notice: number) => {
      const ship = newShip(), events: GameEvent[] = [];
      const al = spawnAlien('scout', ship, 100, rng, { x: 0, y: 5, z: -40 }, { approach: 'patrol' });
      al.mode = 'patrol'; al.ax = 0; al.az = -40; al.modeT = PACING.patrolTime;
      moveAlien(al, ship, STEP, arena(notice), [], rng, events);
      return al.mode;
    };
    expect(at(1)).not.toBe('patrol');
    expect(at(computeStats({ ut_quiet: 2 }).notice)).toBe('patrol');
  });

  it('a watcher holds off beyond gun range, unfiring, before it commits', () => {
    const ship = newShip(), rng = new Rng(4), events: GameEvent[] = [];
    const al = spawnAlien('lancer', ship, 100, rng, { x: 140, y: 2, z: 0 }, { approach: 'investigate' });
    al.escort = false;
    const shots: Parameters<typeof alienFire>[3] = [];
    let closest = Infinity, watched = false;
    for (let i = 0; i < 60 * 12 && al.mode !== 'cover' && al.mode !== 'hold' && !al.fleeing; i++) {
      moveAlien(al, ship, STEP, arena(), [], rng, events);
      alienFire(al, ship, 100 + i * STEP, shots, [], rng, events);
      if (al.mode === 'watch') { watched = true; closest = Math.min(closest, Math.hypot(al.x, al.z)); }
    }
    expect(watched).toBe(true);
    expect(closest).toBeGreaterThan(70);
    expect(shots.length).toBe(0);
  });
});

describe('the whole loop', () => {
  it('a fight, a hit, an escape, a mend, the next encounter, mining and a refit', () => {
    const w = open(6);
    const seen: GameEvent['type'][] = [];
    const fly = (seconds: number, f: Partial<InputFrame> = {}, until?: () => boolean) => {
      for (let i = 0; i < Math.round(seconds / STEP) && !until?.(); i++) {
        w.step(STEP, { ...idle, ...f });
        seen.push(...w.drain().map((e) => e.type));
      }
    };
    // the first encounter
    fly(ALIEN_FIRST + 1);
    expect(seen).toContain('contacts');
    expect(w.aliens.length).toBeGreaterThan(0);
    // taking damage stops any repair
    w.shields = 0;
    w.ship.invuln = 0;
    hit(w);
    expect(w.plates).toBe(2);
    expect(w.mend.progress).toBe(0);
    // escaping: far enough that the group is left behind, and the sector goes quiet
    const group = new Set(w.aliens.filter((a) => !a.escort && !a.extra).map((a) => a.id));
    w.ship.x += 400;
    // a heavier wave still has hulls to arrive: the ship deals with those as they come, so only the group left behind is checked
    fly(40, {}, () => { w.aliens = w.aliens.filter((a) => group.has(a.id)); return seen.includes('quiet'); });
    expect(w.aliens.filter((a) => group.has(a.id)).length).toBe(0);
    expect(seen).toContain('quiet');
    // repairing in the quiet
    fly(60, {}, () => w.plates === 3);
    expect(w.plates).toBe(3);
    expect(w.run.platesMended).toBe(1);
    // back into it: the next encounter comes
    seen.length = 0;
    fly(60, {}, () => seen.includes('contacts'));
    expect(seen).toContain('contacts');
    // mining: rock ahead breaks under the lasers; the krail goes to the bay, opened in the quiet
    const r = w.field.spawn(0, w.ship.x + Math.cos(w.ship.heading) * 14, w.ship.z - Math.sin(w.ship.heading) * 14, 0, 0, 'rich');
    r.hp = 0.1;
    fly(1.5, { fire: true });
    expect(w.run.rocks).toBeGreaterThan(0);
    w.aliens = w.aliens.filter((a) => a.escort || a.extra);
    w.shots = [];
    w.dropCrystals(w.ship.x, w.ship.z, 60, 0);
    fly(2);
    expect(w.krail).toBeGreaterThanOrEqual(60);
    // the bay opens in the quiet: a heavier wave may have come in these two seconds, and the ship has dealt with it
    w.aliens = w.aliens.filter((a) => a.escort || a.extra);
    expect(w.openBay()).toBe(true);
    expect(w.install('df_armour')).toBeNull();
    w.closeBay();
    expect(w.refit).toBe(1);
    expect(w.stats.maxPlates).toBe(4);
  });
});

describe('arcade-only modules', () => {
  it('open in the arcade\'s bay and never in the Story mode\'s', () => {
    const ids = UPGRADES.filter((u) => u.arcade).map((u) => u.id);
    expect(ids).toEqual(expect.arrayContaining(['df_repair', 'ut_quiet']));
    const ctx = (arcade: boolean) => ({ levels: {}, unlocked: new Set<string>(), techs: new Set<string>(), arcade, krail: 1e6 });
    for (const id of ids) {
      expect(blockOf(id, ctx(true)), id).not.toBe('mode');
      expect(blockOf(id, ctx(false)), id).toBe('mode');
    }
  });
});
