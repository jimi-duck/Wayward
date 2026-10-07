import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { BOSS_FIRST, FACTIONS, INTRO_HP, bossGap } from '../src/sim/bosses';
import { bossHp, pressure } from '../src/sim/director';
import { ALIEN_FIRST, SPAWN_NEAR, VARIANTS, alienMax, spawnAlien } from '../src/sim/enemies';
import type { Bulwark } from '../src/sim/field';
import { Rng } from '../src/sim/rng';
import { newShip } from '../src/sim/ship';
import { World } from '../src/sim/world';

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, brk: false, device: 'keyboard' };
const bolt = (x: number, y: number, z: number, vx = 0, vy = 0, vz = 0, life = 1) => ({ x, y, z, vx, vy, vz, life, dmg: 1.4, pierce: 0, hit: [], homing: 0 });

/** A world where nothing can hurt the ship, so the clock can run long. */
function immortal(seed = 3): World {
  const w = new World(seed);
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  return w;
}
/** A still bulwark, for cover and blocking tests. */
function bulwark(x: number, z: number, r = 9): Bulwark {
  return { id: 999, x, z, vx: 0, vz: 0, r, variant: 0, ax: 0, ay: 1, az: 0, spin: 0, age: 10, hp: 100, maxHp: 100 };
}
/** Run until a capital ship is on station. */
function onStation(w: World) {
  run(w, BOSS_FIRST + 0.5);
  for (let i = 0; i < 40 && w.command.boss?.arriving; i++) run(w, 0.5);
  expect(w.command.boss?.arriving).toBe(false);
}
/** Run the clock, answering the decisions a run asks for: engage every hail. */
function run(w: World, seconds: number) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (w.phase === 'hail') w.answerHail(true);
    w.ship.invuln = 1;
    w.step(STEP, idle);
  }
}

describe('enemy pacing (the original curves)', () => {
  it('sends the first hull on the clock, and only scouts at first', () => {
    const w = immortal();
    run(w, ALIEN_FIRST - 0.1);
    expect(w.aliens.length).toBe(0);
    run(w, 0.3);
    expect(w.aliens.length).toBe(1);
    expect(w.aliens[0]!.kind).toBe('scout');
  });

  it('never exceeds the ceiling, and unlocks hulls on the clock', () => {
    const w = immortal();
    w.command.next = 1e9; // regular traffic only: a capital ship's fight holds it
    const seen = new Set<string>();
    for (let s = 0; s < 330; s++) {
      run(w, 1);
      if (!w.command.boss) expect(w.aliens.filter((a) => !a.escort && !a.extra).length).toBeLessThanOrEqual(w.pressure.enemyCap);
      for (const a of w.aliens) {
        seen.add(a.kind);
        if (!a.escort && !a.extra) expect(VARIANTS[a.variant]!.at).toBeLessThanOrEqual(w.runTime);
      }
      // the ship wins its fights: a hull that has been about a while is gone, so the encounters keep coming
      w.aliens = w.aliens.filter((a) => a.escort || a.extra || a.age < 8);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});

describe('capital ships', () => {
  it('warn, then arrive on the original clock with an escort wing', () => {
    const w = immortal(7);
    run(w, BOSS_FIRST - 3);
    expect(w.command.boss).toBeNull();
    run(w, 3.2);
    const ev = w.drain().map((e) => e.type);
    expect(ev).toContain('bossWarn');
    expect(ev).toContain('bossArrive');
    expect(w.command.boss).not.toBeNull();
    expect(['gutter', 'custody']).toContain(w.command.boss!.faction); // unlocked by 135s; never a Office first
    expect(w.aliens.some((a) => a.escort)).toBe(true);
  });

  it('drop in from far out and high, and cannot be hurt until on station', () => {
    const w = immortal(7);
    run(w, BOSS_FIRST + 0.2);
    const b = w.command.boss!;
    expect(b.arriving).toBe(true);
    expect(b.y).toBeGreaterThan(10);
    expect(Math.hypot(b.x - w.ship.x, b.z - w.ship.z)).toBeGreaterThan(100);
    expect(w.targets().boss).toBeNull();
  });

  it('pays the bounty and the salvage when broken, then schedules the next', () => {
    const w = immortal(7);
    onStation(w);
    const b = w.command.boss!;
    w.plates = 1;
    b.hp = 1;
    w.bolts.push(bolt(b.x, b.y, b.z));
    w.step(STEP, idle);
    expect(w.command.boss).toBeNull();
    const evs = w.drain();
    expect(evs.some((e) => e.type === 'bossDestroyed')).toBe(true);
    expect(evs.some((e) => e.type === 'salvage' && e.faction === b.faction && e.tech)).toBe(true);
    expect(w.run.capitals).toBe(1);
    expect(w.run.scoreBy.capitals).toBeGreaterThan(1000);
    // a hull repair, a power-up and krail to collect, and her faction's tech open in the bay
    expect(w.pickups.some((p) => p.kind === 'repair')).toBe(true);
    expect(w.pickups.filter((p) => p.kind === 'crystal').length).toBeGreaterThan(5);
    expect(w.techs.has(b.faction)).toBe(true);
    expect(w.command.next).toBeCloseTo(w.runTime + bossGap(1), 0);
  });

  it('make a faction’s first capital ship lighter, and its second the usual weight', () => {
    const w = immortal(7);
    w.command.next = 1e9;
    const arrive = () => {
      w.command.summon(w.runTime, 'custody');
      for (let i = 0; i < 40 * 60 && !w.command.boss; i++) { if (w.phase === 'hail') w.answerHail(true); w.ship.invuln = 1; w.step(STEP, idle); }
      const b = w.command.boss!;
      return { ratio: b.maxHp / (bossHp(b.n, w.runTime) * FACTIONS.custody.hp), b };
    };
    const first = arrive();
    expect(first.ratio).toBeCloseTo(INTRO_HP, 1);
    // break it, and the next of the same faction comes at full weight
    first.b.hp = 1;
    w.bolts.push(bolt(first.b.x, first.b.y, first.b.z));
    for (let i = 0; i < 60 * 40 && w.command.boss; i++) { w.ship.invuln = 1; w.step(STEP, idle); if (w.command.boss?.arriving) { first.b.hp = 1; w.command.boss.hp = 1; w.bolts.push(bolt(w.command.boss.x, w.command.boss.y, w.command.boss.z)); } }
    expect(w.command.boss).toBeNull();
    expect(arrive().ratio).toBeCloseTo(1, 1);
  });

  it('deal the beams and webs last, so new things arrive one at a time', () => {
    expect(FACTIONS.voice.at).toBeGreaterThan(FACTIONS.thren.at);
    expect(FACTIONS.thren.at).toBeGreaterThan(FACTIONS.office.at + 120);
    // the build-up starts before the first capital ship: elites and squads are on their way by then, and the factions mix before the second
    const p = pressure(BOSS_FIRST);
    expect(p.eliteChance).toBeGreaterThan(0);
    expect(p.squadChance).toBeGreaterThan(0);
    expect(pressure(BOSS_FIRST + bossGap(0)).theatre).toBeLessThan(4);
  });

  it('leave when the fuse runs out', () => {
    const w = immortal(7);
    run(w, BOSS_FIRST + 75);
    expect(w.drain().some((e) => e.type === 'bossLeft')).toBe(true);
  });
});

describe('enemy fire', () => {
  it('costs a hull plate when it lands on a ship with its shield down', () => {
    const w = immortal();
    w.shields = 0;
    w.shots.push({ id: 1, x: w.ship.x, y: 0, z: w.ship.z, vx: 0, vy: 0, vz: 0, life: 1, r: 0.35, faction: 'gutter', hp: 0, seek: 0, split: 0 });
    w.step(STEP, idle);
    expect(w.plates).toBe(w.hull.plates - 1);
  });

  it('plasma can be shot down', () => {
    const w = immortal();
    w.shots.push({ id: 1, x: 0, y: 0, z: -12, vx: 0, vy: 0, vz: 0, life: 8, r: 0.8, faction: 'office', hp: 1, seek: 0, split: 0 });
    for (let i = 0; i < 40; i++) w.step(STEP, { ...idle, fire: true });
    expect(w.drain().some((e) => e.type === 'plasmaDown')).toBe(true);
  });
});

describe('the 3D sky', () => {
  it('sends hulls in from far out, mostly ahead, at altitude', () => {
    const rng = new Rng(11), ship = newShip();
    let ahead = 0;
    for (let i = 0; i < 200; i++) {
      const a = spawnAlien('scout', ship, 10, rng);
      expect(Math.hypot(a.x, a.z)).toBeGreaterThanOrEqual(SPAWN_NEAR);
      expect(a.mode).toBe('approach');
      if (-a.z > Math.abs(a.x) * 0.5) ahead++;
    }
    expect(ahead).toBeGreaterThan(120);
  });

  it('interceptors close to fighting range, then fly strafing runs down past the ship, not through it', () => {
    const w = immortal(4);
    w.pace.until = 1e9;
    const al = spawnAlien('scout', w.ship, 0, w.rng);
    w.aliens.push(al);
    const modes = new Set<string>();
    let low = Infinity, closest = Infinity;
    for (let i = 0; i < 20 * 60; i++) {
      w.ship.invuln = 1;
      w.step(STEP, idle);
      if (!w.aliens.includes(al)) break;
      modes.add(al.mode);
      if (al.mode === 'run') low = Math.min(low, Math.abs(al.y));
      closest = Math.min(closest, Math.hypot(al.x - w.ship.x, al.y, al.z - w.ship.z));
    }
    expect(modes).toContain('setup');
    expect(modes).toContain('run');
    expect(modes).toContain('extend');
    expect(low).toBeLessThan(4);
    // close enough to graze, never close enough to ram
    expect(closest).toBeGreaterThan(al.r + 0.9);
  });

  it('interceptors jink out of the way of a lance they see coming', () => {
    let evaded = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const w = immortal(seed);
      w.pace.until = 1e9;
      const al = spawnAlien('scout', w.ship, 0, w.rng, { x: 0, y: 0, z: -30 });
      al.escort = false;
      al.mode = 'setup';
      w.aliens.push(al);
      w.bolts.push(bolt(0, 0, -18, 0, 0, -80));
      w.step(STEP, idle);
      if (w.drain().some((e) => e.type === 'evade')) evaded++;
    }
    expect(evaded).toBeGreaterThan(4);
    expect(evaded).toBeLessThan(17);
  });

  it('cruisers take cover behind a bulwark, on the far side from the ship', () => {
    const w = immortal(2);
    w.pace.until = 1e9;
    const rock = bulwark(0, -60);
    w.field.bulwarks = [rock];
    const al = spawnAlien('lancer', w.ship, 50, w.rng, { x: 20, y: 4, z: -90 });
    al.escort = false;
    w.aliens.push(al);
    let covered = false;
    for (let i = 0; i < 25 * 60 && !covered; i++) {
      w.ship.invuln = 1;
      w.step(STEP, idle);
      covered = al.mode === 'cover' && Math.hypot(al.x - rock.x, al.z - rock.z) < rock.r + al.r + 6 && al.z < rock.z;
    }
    expect(covered).toBe(true);
  });

  it('a bulwark stops lances and enemy fire, and nothing breaks it', () => {
    const w = immortal();
    w.field.bulwarks = [bulwark(0, -25)];
    for (let i = 0; i < 60; i++) w.step(STEP, { ...idle, fire: true });
    w.shots.push({ id: 1, x: 0, y: 0, z: -50, vx: 0, vy: 0, vz: 30, life: 3, r: 0.45, faction: 'gutter', hp: 0, seek: 0, split: 0 });
    for (let i = 0; i < 90; i++) w.step(STEP, idle);
    expect(w.drain().filter((e) => e.type === 'bulwarkHit').length).toBeGreaterThan(2);
    expect(w.plates).toBe(w.hull.plates);
    expect(w.field.bulwarks.length).toBe(1);
  });

  it('the gunnery computer lifts a lance onto a hull flying above the plane', () => {
    const w = immortal();
    w.pace.until = 1e9;
    const al = spawnAlien('lancer', w.ship, 0, w.rng, { x: 0, y: 7, z: -40 });
    al.escort = false;
    al.mode = 'hold';
    al.modeT = 99;
    w.aliens.push(al);
    let hits = 0;
    for (let i = 0; i < 60; i++) {
      al.x = 0; al.y = 7; al.z = -40; al.vx = al.vy = al.vz = 0;
      w.ship.invuln = 1;
      w.step(STEP, { ...idle, fire: true });
      hits += w.drain().filter((e) => e.type === 'alienHit').length;
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('torpedoes climb after a target above the plane', () => {
    const w = immortal();
    w.setLevels({ tp_bay: 1 });
    w.pace.until = 1e9;
    const al = spawnAlien('scout', w.ship, 0, w.rng, { x: 4, y: 9, z: -45 });
    al.escort = false;
    al.mode = 'hold';
    w.aliens.push(al);
    w.step(STEP, { ...idle, torpedo: true });
    let blast: { y: number } | undefined;
    for (let i = 0; i < 180 && !blast; i++) {
      al.x = 4; al.y = 9; al.z = -45; al.vx = al.vy = al.vz = 0;
      w.ship.invuln = 1;
      w.step(STEP, idle);
      blast = w.drain().find((e) => e.type === 'blast') as { y: number } | undefined;
    }
    expect(blast).toBeDefined();
    expect(blast!.y).toBeGreaterThan(5);
  });
});

describe('one plane, and rock in the way', () => {
  it('keeps every hull within a hand of the ship’s plane', () => {
    const rng = new Rng(5), ship = newShip();
    for (const kind of ['scout', 'raptor', 'lancer', 'warbird', 'stalker', 'drone'] as const) {
      for (let i = 0; i < 40; i++) expect(Math.abs(spawnAlien(kind, ship, 10, rng).y)).toBeLessThanOrEqual(1.1);
    }
  });

  it('holds a hull out of a rock, and a hard hit costs it hull and the rock too', () => {
    const w = immortal(6);
    w.command.next = 1e9;
    w.pace.until = 1e9;
    const rock = w.field.spawn(0, 40, 0, 0, 0, 'iron', 1, 0);
    w.field.rocks.push(rock);
    const al = spawnAlien('raptor', w.ship, 0, w.rng, { x: 20, y: 0, z: 0 });
    w.aliens.push(al);
    const hp = al.hp, rockHp = rock.hp;
    // a hull driven into the rock at speed
    al.x = rock.x - 1; al.z = 0; al.vx = 45;
    (w as unknown as { hullVsRock(a: typeof al): void }).hullVsRock(al);
    expect(Math.hypot(al.x - rock.x, al.z - rock.z)).toBeGreaterThanOrEqual(rock.r * 0.9 + al.r - 1e-6);
    expect(al.vx).toBeLessThan(0);
    expect(al.hp).toBeLessThan(hp);
    expect(rock.hp).toBeLessThan(rockHp);
  });

  it('stops enemy fire on a rock between the gun and the ship', () => {
    const w = immortal(7);
    w.command.next = 1e9;
    w.pace.until = 1e9;
    const rock = w.field.spawn(0, 10, 0, 0, 0, 'iron', 1, 0);
    w.field.rocks.push(rock);
    w.shots.push({ id: 1, x: 7.5, y: 0, z: 0, vx: -20, vy: 0, vz: 0, life: 3, r: 0.4, faction: 'gutter', hp: 0, seek: 0, split: 0 });
    const plates = w.plates;
    w.step(STEP, idle);
    w.step(STEP, idle);
    expect(w.shots.length).toBe(0);
    expect(w.plates).toBe(plates);
  });
});
