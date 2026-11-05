import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { PLANE, VARIANTS, spawnAlien, styleFor } from '../src/sim/enemies';
import { Rng } from '../src/sim/rng';
import { newShip } from '../src/sim/ship';
import { World } from '../src/sim/world';

const idle: InputFrame = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' };

/** A world where nothing can hurt the ship and the field holds still. */
function calm(seed = 3): World {
  const w = new World(seed);
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  w.pace.until = 1e9;
  w.command.next = 1e9;
  return w;
}

describe('enemy flight: one plane', () => {
  it('puts a hull on the plane wherever it is sent from', () => {
    const rng = new Rng(2), ship = newShip();
    for (const y of [-30, -6, 0, 4, 18, 40]) {
      for (const kind of ['scout', 'raptor', 'lancer', 'drone'] as const) {
        const lane = kind === 'lancer' || kind === 'drone' ? PLANE.cruiser : PLANE.light;
        expect(Math.abs(spawnAlien(kind, ship, 10, rng, { x: 90, y, z: 40 }).y)).toBeLessThanOrEqual(lane + 1e-9);
      }
    }
  });

  it('holds every hull on the plane through a long fight, jinks and runs included', () => {
    const w = calm(9);
    w.command.next = 1e9;
    let worst = 0;
    for (let i = 0; i < 240 * 60; i++) {
      w.ship.invuln = 1;
      if (i % 60 === 0 && w.aliens.length < 6) w.spawnHostile(Object.keys(VARIANTS).filter((k) => VARIANTS[k]!.weight > 0)[i % 9 % 7]!);
      w.step(STEP, { ...idle, fire: i % 3 === 0 });
      for (const a of w.aliens) if (a.mode !== 'cross') worst = Math.max(worst, Math.abs(a.y));
    }
    // a hand above its cruise height at most, never another level
    expect(worst).toBeLessThan(PLANE.light + 0.6 + 1e-6);
  });
});

describe('enemy flight: round the rock', () => {
  it('steers a fast hull round a rock that stands on its line, without a scrape', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const w = calm(seed);
      const rock = w.field.spawn(0, 0, -75, 0, 0, 'iron', 1, 0);
      w.field.rocks.push(rock);
      const al = spawnAlien('scout', w.ship, 0, w.rng, { x: 0, y: 0, z: -140 });
      al.escort = false;
      w.aliens.push(al);
      const hp = al.hp;
      let near = Infinity, closest = Infinity;
      for (let i = 0; i < 12 * 60 && al.z < -45; i++) {
        w.ship.invuln = 1;
        w.step(STEP, idle);
        near = Math.min(near, Math.hypot(al.x - rock.x, al.z - rock.z));
        closest = Math.min(closest, Math.hypot(al.x, al.z));
      }
      expect(al.hp).toBe(hp);
      expect(near).toBeGreaterThanOrEqual(rock.r * 0.9 + al.r - 1e-6);
      expect(closest).toBeLessThan(140); // it went on in
    }
  });

  it('steers a heavy cruiser round a rock too', () => {
    const w = calm(4);
    const rock = w.field.spawn(0, 0, -70, 0, 0, 'iron', 1, 0);
    w.field.rocks.push(rock);
    const al = spawnAlien('lancer', w.ship, 0, w.rng, { x: 0, y: 0, z: -130 });
    al.escort = false;
    w.aliens.push(al);
    let near = Infinity;
    for (let i = 0; i < 20 * 60; i++) {
      w.ship.invuln = 1;
      w.step(STEP, idle);
      near = Math.min(near, Math.hypot(al.x - rock.x, al.z - rock.z));
    }
    expect(near).toBeGreaterThanOrEqual(rock.r * 0.9 + al.r - 1e-6);
  });
});

describe('enemy flight: no two alike', () => {
  it('gives scouts a spread of weave, rhythm and habit, the same every time', () => {
    const a = Array.from({ length: 60 }, (_, i) => styleFor(i + 1, 'scout', 'scout'));
    const b = Array.from({ length: 60 }, (_, i) => styleFor(i + 1, 'scout', 'scout'));
    expect(a).toEqual(b);
    expect(new Set(a.map((s) => s.weave.toFixed(1))).size).toBeGreaterThan(30);
    const skulkers = a.filter((s) => s.skulk).length;
    expect(skulkers).toBeGreaterThan(8);
    expect(skulkers).toBeLessThan(35);
    expect(Math.max(...a.map((s) => s.weave))).toBeGreaterThan(6);
  });

  it('cruisers hold their line, strike fighters commit', () => {
    for (let i = 1; i < 40; i++) {
      expect(styleFor(i, 'drone', 'drone').weave).toBe(0);
      expect(styleFor(i, 'lancer', 'lancer').weave).toBeLessThanOrEqual(1.2);
      expect(styleFor(i, 'raptor', 'raptor').skulk).toBe(false);
    }
  });

  it('flies different attack lines on different passes', () => {
    const w = calm(5);
    const al = spawnAlien('scout', w.ship, 0, w.rng, { x: 0, y: 0, z: -90 });
    al.escort = false;
    al.style.skulk = false;
    w.aliens.push(al);
    const heights = new Set<string>();
    let last = '';
    for (let i = 0; i < 90 * 60; i++) {
      w.ship.invuln = 1;
      w.step(STEP, idle);
      if (al.mode === 'setup' && last !== 'setup') heights.add(`${Math.round(al.pass.ahead / 6)}:${Math.round(al.pass.side / 8)}`);
      last = al.mode;
      if (!w.aliens.includes(al)) break;
    }
    expect(heights.size).toBeGreaterThan(1);
  });

  it('lets a skulker fight from behind a rock', () => {
    let hid = 0;
    for (const seed of [1, 2, 3, 4]) {
      const w = calm(seed);
      const rock = w.field.spawn(0, 25, -50, 0, 0, 'iron', 1, 0);
      w.field.rocks.push(rock);
      const al = spawnAlien('scout', w.ship, 0, w.rng, { x: 60, y: 0, z: -90 });
      al.escort = false;
      al.style.skulk = true;
      w.aliens.push(al);
      let peeked = false;
      for (let i = 0; i < 30 * 60 && !peeked; i++) {
        w.ship.invuln = 1;
        w.step(STEP, idle);
        peeked = al.mode === 'peek';
      }
      if (peeked) hid++;
    }
    expect(hid).toBeGreaterThanOrEqual(3);
  });

  it('keeps a wingman on its leader while they close', () => {
    const w = calm(6);
    const lead = spawnAlien('scout', w.ship, 0, w.rng, { x: 60, y: 0, z: -140 });
    const wing = spawnAlien('scout', w.ship, 0, w.rng, { x: 62, y: 0, z: -135 });
    for (const a of [lead, wing]) { a.escort = false; a.style.weave = 0; w.aliens.push(a); }
    wing.lead = lead.id; wing.slot = 1;
    let far = 0;
    for (let i = 0; i < 5 * 60; i++) {
      w.ship.invuln = 1;
      w.step(STEP, idle);
      if (i > 60 && lead.mode === 'approach' && wing.mode === 'approach') far = Math.max(far, Math.hypot(lead.x - wing.x, lead.z - wing.z));
    }
    expect(far).toBeLessThan(25);
  });
});
