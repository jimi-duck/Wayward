import { describe, expect, it } from 'vitest';
import { BAY, BAY_EXIT_SPEED, bayAt, bayExit, bayFrame, bayMouth, bayTimes, startBay } from '../src/sim/paintbay';
import { PAINTED } from '../src/sim/postjump';
import { newJourney, sortieDef, endSortie, autoCourse } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { World } from '../src/sim/world';

// The paint bay cut scene (owner 2026-11-05): the ship is flown on rails into the shed, held, and rolled out of the far door.
const PORT = { x: 500, z: 100 };
const STEP = 1 / 60;
const IDLE = { turn: 0, thrust: 1, aim: null, fire: true, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

describe('the paint bay timeline', () => {
  it('starts where she was, reaches the mouth, stops in the middle of the shed, and leaves by the far door', () => {
    const b = startBay({ x: 420, z: 220, heading: 3 }, PORT);
    const tm = bayTimes(b), c = bayAt(PORT), m = bayMouth(c);
    const f0 = bayFrame(b, 0);
    expect(Math.hypot(f0.x - 420, f0.z - 220)).toBeLessThan(0.01);
    const fm = bayFrame(b, tm.mouth);
    expect(Math.hypot(fm.x - m.x, fm.z - m.z)).toBeLessThan(0.01);
    const fi = bayFrame(b, tm.inside);
    expect(Math.hypot(fi.x - c.x, fi.z - c.z)).toBeLessThan(0.01);
    expect(Math.hypot(fi.vx, fi.vz)).toBeLessThan(0.5);
    // held while the paint goes on
    const fp = bayFrame(b, tm.paint);
    expect(fp.x).toBeCloseTo(c.x, 1);
    // out of the far door at the exit speed, with the helm back
    const out = bayExit(b);
    expect(out.vx).toBe(BAY_EXIT_SPEED);
    expect(out.x).toBeGreaterThan(c.x + BAY.halfLen);
    expect(bayFrame(b, tm.release - 0.01).locked).toBe(true);
    expect(bayFrame(b, tm.release + 0.01).locked).toBe(false);
  });

  it('keeps about twelve seconds: concise', () => {
    for (const from of [{ x: 420, z: 220 }, { x: 600, z: 80 }, { x: 380, z: 100 }, { x: 560, z: 300 }]) {
      const tm = bayTimes(startBay({ ...from, heading: 0 }, PORT));
      expect(tm.release).toBeGreaterThan(10);
      expect(tm.release).toBeLessThan(14.5);
    }
  });

  it('closes the near curtain once she is in and lifts the far one when the paint is on', () => {
    const b = startBay({ x: 420, z: 220, heading: 0 }, PORT), tm = bayTimes(b);
    expect(bayFrame(b, tm.mouth).near).toBe(0);
    expect(bayFrame(b, tm.inside + 1).near).toBe(1);
    expect(bayFrame(b, tm.paint - 0.1).far).toBe(1);
    expect(bayFrame(b, tm.paint + 1.2).far).toBe(0);
  });

  it('cuts to the pad from the side as she nears the gate, to the far gate for the roll-out, and back to the chase', () => {
    const b = startBay({ x: 420, z: 220, heading: 0 }, PORT), tm = bayTimes(b);
    expect([bayFrame(b, 0.5).shot, bayFrame(b, tm.mouth + 0.5).shot, bayFrame(b, tm.paint + 0.5).shot, bayFrame(b, tm.release + 1).shot]).toEqual([0, 1, 2, 0]);
  });

  it('never turns her through the long way: the heading ends facing along the shed', () => {
    const b = startBay({ x: 420, z: 220, heading: 17 }, PORT), tm = bayTimes(b);
    const h = bayFrame(b, tm.mouth).heading;
    expect(Math.cos(h)).toBeGreaterThan(0.99);
  });
});

describe('the paint bay in the world', () => {
  function level(): World {
    const j = newJourney(7);
    const r = newRun(1); r.escaped = true;
    endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, plates: 3 }, run: r, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
    autoCourse(j);
    j.carry.flags.push('archive_woke', 'ship_stolen', 'paint_due');
    const w = new World(5, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    w.skipTraining();
    return w;
  }

  it('flies her in with the helm locked, nothing can hurt her, the paint goes on inside it, and the helm comes back', () => {
    const w = level();
    const p = w.bk!.port!;
    w.ship.x = p.x - 110; w.ship.z = p.z + 30; w.ship.vx = w.ship.vz = 0;
    let bolts0 = 99, lockedAt = Infinity, painted = Infinity, helm = Infinity, doneLine = false, hull = w.plates;
    for (let i = 0; i < Math.round(80 / STEP); i++) {
      if (w.phase === 'comms') { w.answer(0); continue; }
      const had = !!w.bay;
      w.step(STEP, IDLE);
      for (const e of w.events) if (e.type === 'ping' && e.id === 'paint_done') doneLine = true;
      w.events.length = 0;
      if (w.bay && w.bay.e > 0.5 && lockedAt === Infinity) lockedAt = w.runTime;
      if (w.flags.has(PAINTED) && painted === Infinity) painted = w.bay ? w.bay.e : -1;
      if (had && !w.bay && helm === Infinity) helm = w.runTime;
      if (w.bay && bayFrame(w.bay).locked) {
        // the controls are full thrust and fire, and she goes only where the rails take her; no weapons, no damage
        expect(w.plates).toBe(hull);
        // what she fired before the cut scene may still be flying; nothing new leaves her
        if (w.bay.e > 1.5 && bolts0 === 99) bolts0 = w.bolts.length;
        if (w.bay.e > 1.5) expect(w.bolts.length).toBeLessThanOrEqual(bolts0);
      }
    }
    expect(lockedAt).toBeLessThan(Infinity);
    expect(painted).toBeGreaterThan(8);
    expect(painted).toBeLessThan(12);
    expect(w.flags.has(PAINTED)).toBe(true);
    expect(doneLine).toBe(true);
    expect(helm).toBeLessThan(Infinity);
    expect(w.bay).toBeNull();
  });
});
