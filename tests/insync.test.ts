import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';

// Lines in step with what is happening (owner, 24 November 2026: "Ilse's line is shown after she meets"): flying straight at the gate,
// a hull's hail is heard before it comes alongside, the line that says the paper is coming before it comes, and every beat before the jump.

describe('the voices stay in step', () => {
  it('Halden: hail, alongside, the card, the paper’s line, the paper aboard, Sam, then the jump', () => {
    const j = newJourney(5, false, 'road');
    const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= 3).sort((a, b) => a.col - b.col);
    j.trail = [j.chart.home, ...line.map((s) => s.id)]; j.at = line[line.length - 1]!.id; j.status = 'sortie'; j.dest = null;
    j.carry.flags.push('archive_woke'); j.carry.fuel = 40;
    const w = new World(7, { mode: 'breakout', sortie: { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
    const b = w.bk!, log: string[] = [];
    for (let i = 0; i < 160 / STEP && b.jumpT < 0; i++) {
      w.ship.invuln = 9;
      // the gate waits on Halden's relay (spaceways plan, step 4): she flies to it and sits in its ring until it is awake
      const tgt = w.gateRelay ?? b.lane, near = tgt !== b.lane && Math.hypot(tgt.x - w.ship.x, tgt.z - w.ship.z) < 25;
      const want = Math.atan2(-(tgt.z - w.ship.z), tgt.x - w.ship.x), d = Math.atan2(Math.sin(want - w.ship.heading), Math.cos(want - w.ship.heading));
      if (near) { w.ship.vx *= 0.9; w.ship.vz *= 0.9; }
      w.step(STEP, { turn: Math.max(-1, Math.min(1, -d * 3)), thrust: near ? 0 : 0.8, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as never);
      for (const e of w.events) {
        if (e.type === 'ping') log.push(e.id);
        if (e.type === 'placeDone') log.push(`done:${e.look}`);
      }
      w.events.length = 0;
      if (w.comms) { log.push(`card:${w.comms.def.id}`); w.answer(w.comms.def.choices[0]!.id); }
    }
    expect(b.jumpT).toBeGreaterThanOrEqual(0);
    const at = (s: string) => log.indexOf(s);
    const order = ['cue_hr_ilse', 'done:skiff', 'card:story_order', 'cue_hr_canister', 'done:canister', 'story_hr_paper', 'story_hr_relay_say'];
    for (const o of order) expect(at(o), `${o} in ${log.join(' | ')}`).toBeGreaterThanOrEqual(0);
    expect(order.map(at)).toEqual([...order.map(at)].sort((x, y) => x - y));
  });
});
