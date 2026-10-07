import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { BOSS_FIRST } from '../src/sim/director';
import { ENCOUNTERS, startEncounter } from '../src/sim/encounters';
import { spawnAlien } from '../src/sim/enemies';
import { CRYSTAL_LIFE, dropCrystals } from '../src/sim/pickups';
import { CHAIN_WINDOW, OC_MAX, SHIP_R } from '../src/sim/tuning';
import { ARCADE_PRICE } from '../src/content/web';
import { launchTorpedo } from '../src/sim/weapons';
import { BAY_QUIET, World } from '../src/sim/world';

const input = (f: Partial<InputFrame> = {}): InputFrame =>
  ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard', ...f });

function run(w: World, seconds: number, f: Partial<InputFrame> = {}) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input(f));
}

/** A quiet world: no rock, no traffic, no capital ships, no events. */
function quiet(seed = 1): World {
  const w = new World(seed);
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  w.pace.until = 1e9;
  w.command.next = 1e9;
  (w as unknown as { nextEvent: number }).nextEvent = 1e9;
  return w;
}

/** A hull parked at (x, y, z), going nowhere. */
function parked(w: World, x: number, z: number, y = 0, kind: Parameters<typeof spawnAlien>[0] = 'scout') {
  const al = spawnAlien(kind, w.ship, 0, w.rng, { x, y, z });
  al.escort = false;
  al.mode = 'hold';
  al.modeT = 1e9;
  al.nextShot = 1e9;
  w.aliens.push(al);
  return al;
}
const hold = (w: World, al: { x: number; y: number; z: number; vx: number; vy: number; vz: number }, x: number, y: number, z: number) => {
  al.x = x; al.y = y; al.z = z; al.vx = al.vy = al.vz = 0;
};

describe('krail and the refit bay', () => {
  it('pulls crystals in from the tractor radius, and lets the rest fade', () => {
    const w = quiet();
    dropCrystals(w.pickups, 10, 0, 1, w.rng, 0);
    dropCrystals(w.pickups, 60, 0, 1, w.rng, 0);
    run(w, 2);
    expect(w.run.krail).toBe(1);
    expect(w.pickups.length).toBe(1);
    run(w, CRYSTAL_LIFE);
    expect(w.pickups.length).toBe(0);
  });

  it('in the arcade, krail is a stock to spend in the refit bay', () => {
    const w = quiet();
    dropCrystals(w.pickups, 1, 0, 50, w.rng, 0);
    run(w, 1);
    expect(w.krail).toBe(50);
    expect(w.phase).toBe('play'); // no rail, no cards
    expect(w.refit).toBe(0);
  });

  it('opens the bay when it is quiet; the world waits; a level is paid for in krail', () => {
    const w = quiet();
    w.krail = ARCADE_PRICE;
    expect(w.openBay()).toBe(true);
    expect(w.phase).toBe('bay');
    const t = w.runTime;
    run(w, 1);
    expect(w.runTime).toBe(t); // the world waits
    expect(w.install('ph_pierce')).toBe('path');
    expect(w.install('ph_emitters')).toBeNull();
    expect(w.levels.ph_emitters).toBe(1);
    expect(w.krail).toBe(0);
    expect(w.refit).toBe(1);
    expect(w.install('ph_capacitors')).toBe('krail');
    w.closeBay();
    expect(w.phase).toBe('play');
    expect(w.install('ph_capacitors')).toBe('closed');
  });

  it('opens when the alert is clear; yellow alert (observed) and red alert (targeted) keep it shut', () => {
    const w = quiet();
    expect(w.alert()).toBe('clear');
    expect(w.bayClosed()).toBeNull();
    // a hull close by, not attacking: yellow alert
    const near = parked(w, 0, -78, 0, 'scout');
    near.mode = 'patrol';
    expect(w.alert()).toBe('yellow');
    expect(w.bayClosed()).toBe('yellow');
    // one in the fight: red alert
    w.aliens = [];
    const al = parked(w, 0, -30, 0, 'lancer');
    al.mode = 'hold';
    expect(w.alert()).toBe('red');
    expect(w.bayClosed()).toBe('red');
    expect(w.openBay()).toBe(false);
    w.aliens = [];
    expect(w.openBay()).toBe(true);
    w.closeBay();
  });

  it('in the arcade the bay opens by itself once a price of Krail is aboard and the alert is clear', () => {
    const w = quiet();
    w.krail = ARCADE_PRICE - 1;
    run(w, BAY_QUIET + 1);
    expect(w.phase).toBe('play'); // not enough yet
    dropCrystals(w.pickups, 1, 0, 1, w.rng, 0);
    run(w, 1);
    expect(w.krail).toBeGreaterThanOrEqual(ARCADE_PRICE);
    expect(w.phase).toBe('play'); // a moment of quiet first, to pick up what is falling
    run(w, BAY_QUIET);
    expect(w.phase).toBe('bay');
    const t = w.runTime;
    run(w, 1);
    expect(w.runTime).toBe(t); // the world waits
  });

  it('waits for the alert to clear, and for the hull that raises it to go', () => {
    const w = quiet();
    const al = parked(w, 0, -30, 0, 'lancer');
    al.mode = 'hold';
    w.krail = ARCADE_PRICE;
    run(w, BAY_QUIET + 3);
    expect(w.alert()).toBe('red');
    expect(w.phase).toBe('play');
    w.aliens = [];
    run(w, BAY_QUIET - 0.5);
    expect(w.phase).toBe('play');
    run(w, 1);
    expect(w.phase).toBe('bay');
  });

  it('charges every module the same in the arcade, and the bay stays up for as many as the Krail buys', () => {
    const w = quiet();
    w.krail = ARCADE_PRICE * 2 + 10;
    run(w, BAY_QUIET + 0.5);
    expect(w.phase).toBe('bay');
    expect(w.install('ph_emitters')).toBeNull();
    expect(w.krail).toBe(ARCADE_PRICE + 10);
    expect(w.install('ph_emitters')).toBeNull(); // a second level costs the same
    expect(w.krail).toBe(10);
    expect(w.install('ph_capacitors')).toBe('krail');
    expect(w.run.krailSpent).toBe(ARCADE_PRICE * 2);
  });

  it('asks again a price later when the player leaves with a price unspent, and at the price once it is spent down', () => {
    const w = quiet();
    const P = ARCADE_PRICE, start = P * 2 + 10;
    w.krail = start;
    run(w, BAY_QUIET + 0.5);
    expect(w.phase).toBe('bay');
    w.closeBay(); // launched without fitting
    run(w, BAY_QUIET + 2);
    expect(w.phase).toBe('play');
    w.krail = start + P - 1;
    run(w, BAY_QUIET + 2);
    expect(w.phase).toBe('play');
    w.krail += 1;
    run(w, BAY_QUIET + 0.5);
    expect(w.phase).toBe('bay');
    // spent down below a price, it opens again at the price
    expect(w.install('ph_emitters')).toBeNull();
    expect(w.install('ph_emitters')).toBeNull();
    expect(w.install('ph_capacitors')).toBeNull();
    expect(w.krail).toBe(start + P - 3 * P);
    expect(w.krail).toBeLessThan(P);
    w.closeBay();
    w.krail = P;
    run(w, BAY_QUIET + 0.5);
    expect(w.phase).toBe('bay');
  });

  it('asks again at once for what is left after a pick, since that is a new pick and not a skipped one', () => {
    const w = quiet();
    w.krail = ARCADE_PRICE * 2;
    run(w, BAY_QUIET + 0.5);
    expect(w.phase).toBe('bay');
    expect(w.install('ph_emitters')).toBeNull();
    w.closeBay(); // the bay shuts itself after a pick
    expect(w.krail).toBe(ARCADE_PRICE);
    run(w, BAY_QUIET + 0.5);
    expect(w.phase).toBe('bay');
  });

  it('leaves the Story mode’s bay to the player', () => {
    const s = new World(1, { mode: 'breakout' });
    s.field.rocks = [];
    s.field.step = () => {};
    s.aliens = [];
    s.bk!.nextPursuit = Infinity;
    s.cardNext = Infinity;
    s.portCalled = true;
    s.krail = 500;
    for (let i = 0; i < 60 * (BAY_QUIET + 3); i++) s.step(STEP, input());
    expect(s.phase).toBe('play');
  });

  it('starts a new run from the stock ship: lasers, a shield charge and the torpedo bay', () => {
    const w = quiet();
    w.krail = 999;
    w.openBay();
    w.install('ph_emitters');
    w.closeBay();
    w.restart();
    expect(w.levels).toEqual({ tp_bay: 1 });
    expect(w.krail).toBe(0);
    expect(w.stats.torpedoes).toBe(true);
    expect(w.stats.shieldMax).toBe(1);
  });

  it('the Story mode builds in the bay too: stock fit, Krail from rock, the bay opens when clear and while docked', () => {
    const w = new World(1, { mode: 'breakout' });
    w.field.rocks = [];
    w.field.step = () => {};
    w.aliens = [];
    w.bk!.nextPursuit = Infinity;
    w.cardNext = Infinity;
    w.portCalled = true;
    expect(w.levels).toEqual({ tp_bay: 1 });
    w.dropCrystals(w.ship.x, w.ship.z, 50, 0);
    for (let i = 0; i < 90; i++) w.step(STEP, input());
    expect(w.krail).toBeGreaterThanOrEqual(50);
    expect(w.phase).toBe('play');
    expect(w.openBay()).toBe(true);
    expect(w.install('ph_emitters')).toBeNull();
    expect(w.levels.ph_emitters).toBe(1);
    w.closeBay();
    expect(w.phase).toBe('play');
    // docked, the bay opens whatever is about, and closing it goes back to the dock
    w.phase = 'dock'; w.docked = true;
    parked(w, 0, -20, 0, 'lancer');
    expect(w.openBay()).toBe(true);
    w.closeBay();
    expect(w.phase).toBe('dock');
  });
});

describe('the reactor', () => {
  it('charges from fire that passes close without hitting', () => {
    const w = quiet();
    w.shots.push({ id: 1, x: 2.8, y: 0, z: -6, vx: 0, vy: 0, vz: 20, life: 2, r: 0.45, faction: 'gutter', hp: 0, seek: 0, split: 0 });
    run(w, 0.6);
    expect(w.plates).toBe(w.stats.maxPlates);
    expect(w.oc).toBeGreaterThan(0);
    expect(w.run.grazes).toBe(1);
  });

  it('releases on the key when full: hulls near take damage, fire near is gone, the guns run hot', () => {
    const w = quiet();
    const al = parked(w, 8, -8);
    al.hp = al.maxHp = 3;
    for (let i = 0; i < 12; i++) w.shots.push({ id: 100 + i, x: 10, y: 0, z: 10 + i, vx: 0, vy: 0, vz: 0, life: 9, r: 0.45, faction: 'gutter', hp: 0, seek: 0, split: 0 });
    w.oc = OC_MAX;
    w.step(STEP, input({ overcharge: true }));
    expect(w.aliens.includes(al)).toBe(false);
    expect(w.shots.length).toBe(0);
    expect(w.overload).toBeGreaterThan(3);
    expect(w.oc).toBe(0);
    expect(w.run.overcharges).toBe(1);
    expect(w.run.killsBy.overcharge).toBe(1);
  });

  it('does nothing on the key while it is still charging', () => {
    const w = quiet();
    w.oc = OC_MAX - 1;
    w.step(STEP, input({ overcharge: true }));
    expect(w.run.overcharges).toBe(0);
  });
});

describe('the kill chain', () => {
  it('multiplies kill score while kills keep coming, and lapses after the window', () => {
    const w = quiet();
    w.setLevels({ ph_emitters: 5 });
    for (let i = 0; i < 6; i++) {
      const al = parked(w, 0, -10);
      al.hp = 0.1;
      w.bolts.push({ x: 0, y: 0, z: -10, vx: 0, vy: 0, vz: 0, life: 1, dmg: 5, pierce: 0, hit: [], homing: 0 });
      w.step(STEP, input());
    }
    expect(w.chain).toBe(6);
    expect(w.chainMult).toBe(1.25);
    expect(w.run.bestChain).toBe(6);
    w.pickups = []; // their krail would open a refit, and the world would wait on it
    run(w, CHAIN_WINDOW + 0.1);
    expect(w.chain).toBe(0);
  });
});

describe('defence', () => {
  it('a shield charge takes a hit instead of the hull, then builds back up once the ship is left alone', () => {
    const w = quiet();
    expect(w.shields).toBe(1);
    w.setLevels({ df_shield: 1 });
    expect(w.shields).toBe(2);
    w.shots.push({ id: 1, x: w.ship.x, y: 0, z: w.ship.z, vx: 0, vy: 0, vz: 0, life: 1, r: 0.45, faction: 'gutter', hp: 0, seek: 0, split: 0 });
    w.step(STEP, input());
    expect(w.plates).toBe(w.stats.maxPlates);
    expect(w.shields).toBe(1);
    expect(w.run.shieldsAbsorbed).toBe(1);
    // nothing comes back until the delay has passed, then it fills smoothly
    run(w, w.stats.shieldDelay - 0.1);
    expect(w.shields).toBe(1);
    run(w, 0.1 + w.stats.shieldRecharge / 2);
    expect(w.shields).toBeGreaterThan(1.4);
    expect(w.shields).toBeLessThan(1.6);
    run(w, w.stats.shieldRecharge);
    expect(w.shields).toBe(2);
  });

  it('a hit with only part of a charge built goes to the hull and starts the wait again', () => {
    const w = quiet();
    w.shields = 0.8;
    w.shots.push({ id: 1, x: w.ship.x, y: 0, z: w.ship.z, vx: 0, vy: 0, vz: 0, life: 1, r: 0.45, faction: 'gutter', hp: 0, seek: 0, split: 0 });
    w.step(STEP, input());
    expect(w.plates).toBe(w.stats.maxPlates - 1);
    expect(w.shields).toBeCloseTo(0.8);
    expect(w.shieldT).toBeGreaterThan(w.stats.shieldDelay - 0.1);
  });

  it('damage control saves the last plate, once', () => {
    const w = quiet();
    w.setLevels({ df_control: 1 });
    w.plates = 1;
    w.shields = 0;
    const hit = () => {
      w.ship.invuln = 0;
      w.shots.push({ id: 9, x: w.ship.x, y: 0, z: w.ship.z, vx: 0, vy: 0, vz: 0, life: 1, r: 0.45, faction: 'gutter', hp: 0, seek: 0, split: 0 });
      w.step(STEP, input());
    };
    hit();
    expect(w.plates).toBe(1);
    expect(w.alive).toBe(true);
    hit();
    expect(w.alive).toBe(false);
  });

  it('ablative armour comes fitted whole', () => {
    const w = quiet();
    w.plates = 2;
    w.setLevels({ df_armour: 1 });
    expect(w.stats.maxPlates).toBe(4);
    expect(w.plates).toBe(3);
  });

  it('a ram prow breaks a light hull for free; without it, a ram costs a plate', () => {
    for (const prow of [false, true]) {
      const w = quiet();
      if (prow) w.setLevels({ cl_ram: 1 });
      w.shields = 0;
      const al = parked(w, 0, -SHIP_R - 1);
      al.hp = 2;
      w.step(STEP, input());
      expect(w.aliens.includes(al)).toBe(false);
      expect(w.plates).toBe(prow ? w.stats.maxPlates : w.stats.maxPlates - 1);
    }
  });
});

describe('the systems that fire themselves', () => {
  it('mines go down in the wake and go off under a hull', () => {
    const w = quiet();
    w.setLevels({ mn_layer: 1 });
    run(w, 3, { thrust: 1 });
    expect(w.sys.mines.length).toBeGreaterThan(0);
    const m = w.sys.mines[0]!;
    expect(Math.hypot(m.x - w.ship.x, m.z - w.ship.z)).toBeGreaterThan(20);
    const al = parked(w, m.x + 1, m.z);
    al.hp = 1;
    for (let i = 0; i < 18; i++) { hold(w, al, m.x + 1, 0, m.z); w.step(STEP, input()); }
    expect(w.aliens.includes(al)).toBe(false);
    expect(w.run.killsBy.mine).toBe(1);
  });

  it('the hull arc reaches what is close, and only what is close', () => {
    const w = quiet();
    w.setLevels({ cl_arc: 1 });
    const near = parked(w, 4, 4), far = parked(w, 40, 40);
    near.hp = far.hp = 1;
    run(w, 1);
    expect(w.aliens.includes(near)).toBe(false);
    expect(w.aliens.includes(far)).toBe(true);
    expect(w.run.killsBy.arc).toBe(1);
  });

  it('the plasma trail burns what follows through it', () => {
    const w = quiet();
    w.setLevels({ pl_vent: 1 });
    run(w, 0.5, { thrust: 1 });
    const patch = w.sys.burns[0]!;
    const al = parked(w, patch.x, patch.z);
    al.hp = al.maxHp = 2;
    for (let i = 0; i < 40 && w.aliens.includes(al); i++) { hold(w, al, patch.x, 0, patch.z); w.step(STEP, input({ thrust: 1 })); }
    expect(al.hp).toBeLessThan(2);
  });

  it('cone lances fan out; piercing lances pass through', () => {
    const w = quiet();
    w.setLevels({ ph_emitters: 2, ph_capacitors: 1, ph_bank: 1, ph_lenses: 1, ph_cone: 1, ph_pierce: 1 });
    w.step(STEP, input({ fire: true }));
    expect(w.bolts.length).toBe(3);
    expect(new Set(w.bolts.map((b) => Math.atan2(b.vz, b.vx).toFixed(2))).size).toBe(3);
    expect(w.bolts.every((b) => b.pierce === 1)).toBe(true);
  });
});

describe('power-ups', () => {
  it('a rare rock breaks into a power-up, and rapid fire stops the bank draining', () => {
    const w = quiet();
    const r = w.field.spawn(1, 0, -12, 0, 0, 'rare');
    r.hp = 0.1;
    run(w, 0.5, { fire: true });
    const p = w.pickups.find((k) => k.kind !== 'crystal');
    expect(p).toBeDefined();
    w.pickups = [];
    w.powers.rapid = 5;
    const bank = w.arms.bank;
    run(w, 1, { fire: true });
    expect(w.arms.bank).toBeGreaterThanOrEqual(bank);
  });
});

describe('capital ships: the hail', () => {
  const toHail = (w: World) => { for (let i = 0; i < (BOSS_FIRST + 5) * 60 && w.phase !== 'hail'; i++) { w.ship.invuln = 1; w.step(STEP, input()); } };

  it('opens before a contact; evading sends the next one sooner, and you cannot evade twice running', () => {
    const w = quiet(7);
    w.command.next = BOSS_FIRST;
    toHail(w);
    expect(w.phase).toBe('hail');
    const c = w.command.pending!;
    expect(c.canEvade).toBe(true);
    const t = w.runTime;
    w.answerHail(false);
    expect(w.command.boss).toBeNull();
    expect(w.run.capitalsEvaded).toBe(1);
    expect(w.command.next).toBeCloseTo(t + c.evadeGap, 0);
    for (let i = 0; i < 120 * 60 && w.phase !== 'hail'; i++) { w.ship.invuln = 1; w.step(STEP, input()); }
    expect(w.phase).toBe('hail');
    expect(w.command.pending!.canEvade).toBe(false);
    w.answerHail(false); // refused: you fight
    run(w, 2);
    expect(w.command.boss).not.toBeNull();
  });

  it('telegraphs every attack before it opens, and turns nastier in phases', () => {
    const w = quiet(7);
    w.command.next = BOSS_FIRST;
    toHail(w);
    w.answerHail(true);
    let teles = 0;
    for (let i = 0; i < 30 * 60; i++) {
      w.ship.invuln = 1;
      w.step(STEP, input());
      const b = w.command.boss;
      if (b && b.windT > 0 && (w.tele.length || w.strikes.length || b.attack === 'beams' || b.attack === 'tractor' || b.attack === 'cloak')) teles++;
      if (b && !b.arriving && b.fightT > 12) break;
    }
    expect(teles).toBeGreaterThan(0);
    const b = w.command.boss!;
    expect(b.phase).toBe(0);
    b.hp = b.maxHp * 0.6;
    w.bolts.push({ x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, vz: 0, life: 1, dmg: 1, pierce: 0, hit: [], homing: 0 });
    w.step(STEP, input());
    expect(b.phase).toBe(1);
    expect(w.drain().some((e) => e.type === 'bossPhase')).toBe(true);
  });
});

describe('sector events', () => {
  it('a distress signal pays a repair for holding position in the beacon circle', () => {
    const w = quiet();
    w.plates = 1;
    w.encounter = startEncounter('distress', w);
    w.aliens = [];
    const e = w.encounter;
    for (let i = 0; i < 9 * 60 && w.encounter; i++) {
      w.ship.x = e.x; w.ship.z = e.z; w.ship.vx = w.ship.vz = 0; w.ship.invuln = 1;
      w.step(STEP, input());
    }
    expect(w.encounter).toBeNull();
    expect(w.plates).toBe(2);
    expect(w.run.eventsWon).toBe(1);
  });

  it('every event starts and finishes cleanly', () => {
    for (const id of Object.keys(ENCOUNTERS) as Array<keyof typeof ENCOUNTERS>) {
      const w = quiet();
      w.encounter = startEncounter(id, w);
      for (let i = 0; i < (ENCOUNTERS[id].duration + 1) * 60; i++) { w.ship.invuln = 1; w.step(STEP, input()); }
      expect(w.encounter, id).toBeNull();
      expect(w.field.richBoost).toBe(0);
    }
  });
});

describe('salvaged tech and the ship-wide stats', () => {
  it('Gutter scatterguns: every fourth laser shot is a heavy bolt at triple damage', () => {
    const w = quiet();
    w.setLevels({ tech_gutter: 1 });
    const seen: Array<{ heavy: boolean; dmg: number }> = [];
    for (let i = 0; i < 120; i++) {
      const before = new Set(w.bolts);
      w.step(STEP, input({ fire: true }));
      for (const b of w.bolts) if (!before.has(b)) seen.push({ heavy: !!b.heavy, dmg: b.dmg });
    }
    const heavy = seen.filter((b) => b.heavy), light = seen.filter((b) => !b.heavy);
    expect(heavy.length).toBeGreaterThan(0);
    expect(light.length).toBeCloseTo(heavy.length * 3, -1);
    expect(heavy[0]!.dmg).toBeCloseTo(light[0]!.dmg * 3);
  });

  it('Thren snares: a torpedo blast that does not kill slows the hull it catches', () => {
    const w = quiet();
    w.setLevels({ tp_bay: 1, tech_thren: 1 });
    const al = parked(w, 20, 0);
    al.hp = al.maxHp = 1000;
    launchTorpedo(w.torps, w.stats, 17, 0, 0, 10, null, 1);
    run(w, 0.3);
    expect(al.snare).toBeGreaterThan(0);
    al.vx = 20;
    run(w, 0.5);
    expect(Math.abs(al.vx)).toBeLessThan(10);
  });

  it('Office cloak: a barrel roll hides the ship for a moment', () => {
    const w = quiet();
    w.setLevels({ tech_office: 1 });
    w.step(STEP, input({ roll: true }));
    expect(w.cloakT).toBeGreaterThan(1);
    expect(w.drain().some((e) => e.type === 'cloak')).toBe(true);
  });

  it('the tactical computer multiplies every weapon; the economy upgrades move the drops', () => {
    const w = quiet();
    w.setLevels({ ut_tactical: 3, ut_prospector: 1 });
    expect(w.dmgMult).toBeCloseTo(1.07 ** 3);
    expect(w.stats.crystalChance).toBeCloseTo(1.5);
  });
});
