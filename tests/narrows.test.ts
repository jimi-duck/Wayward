import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { relayOf } from '../src/sim/breakout';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { SCRIPT } from '../src/content/script';
import { pursuerOf } from '../src/sim/course';

// The Narrows on the road: approach, handshake, the note, the answer and the way on, in that order.

const NO_INPUT = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/** A road journey standing at the Narrows, the gate out of the Reach. */
function narrows(seed = 5) {
  const j = newJourney(seed, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= 9).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'brook_free');
  return j;
}

describe('the Narrows', () => {
  it('is the road’s gate, with Ashgrove holding it and a mast off the ring', () => {
    const j = narrows();
    const def = sortieDef(j);
    expect(def.kind).toBe('gate');
    expect(def.script).toBe('narrows');
    expect(def.blockade).toBe(true);
    expect(def.checkpoint).toBe('narrows_checkpoint');
    expect(SCRIPT.filter((r) => r.stop === 'narrows').length).toBeGreaterThan(10);
  });

  /** Flies the stop: the ship is put at the blockade after 14 s and 1.5 km from the mast after 34 s. With `blockade` Ashgrove's checkpoint is live and the first answer is taken. */
  function play(seed: number, blockade: boolean, secs = 420, answer = 'talk', breakAt = Infinity) {
    const j = narrows();
    const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity, blockade };
    const w = new World(seed, { mode: 'breakout', sortie: def, carry: j.carry });
    const log: string[] = [];
    let fought = false;
    for (let i = 0; i < Math.round(secs / STEP); i++) {
      // the blockade first (3.5 km from the mast, inside Ashgrove's 4.2 km of the gate), then the ship is flown to 1.5 km from the mast
      const r = relayOf(w.bk!)!;
      if (i === Math.round(14 / STEP)) { expect(w.flags.has('relay_broadcast')).toBe(false); w.ship.x = r.x - 350; w.ship.z = r.z; }
      if (i === Math.round(34 / STEP)) { w.ship.x = r.x - 150; w.ship.z = r.z; }
      w.ship.invuln = 99;
      // the fight is cut short at `breakAt`: nobody is shooting back, so it would run on for ever
      if (fought && w.runTime >= breakAt) { w.command.reset(); w.aliens.length = 0; w.bk!.blockade = 'done'; }
      w.step(STEP, NO_INPUT);
      for (const e of w.events) {
        if (e.type === 'comms') log.push(`card:${e.id}`);
        if (e.type === 'storyNotice') log.push(`notice:${e.headline}`);
        if (e.type === 'ping') log.push(`say:${e.text.slice(1, 14)}`);
      }
      w.events.length = 0;
      if (w.bk!.blockade === 'called' || w.command.state !== 'idle') fought = true;
      if (w.comms) w.answer(w.comms.def.id === 'narrows_checkpoint' ? answer : w.comms.def.choices[0]!.id);
    }
    return { w, log, fought };
  }

  const ORDER = ['notice:The Narrows', 'say:That’s the re', 'notice:Warden key accepted', 'notice:Warden channel open', 'say:Juno. The rel', 'say:It’s not jus', 'card:warden_note_1', 'notice:Offices channel open', 'say:That’s no pic', 'card:story_calloway_narrows', 'notice:Governor Calloway', 'say:This is wher', 'notice:Signal lost'];
  const inOrder = (log: string[]) => {
    const at = (s: string) => log.findIndex((l) => l.startsWith(s));
    for (const o of ORDER) expect(at(o), `${o} in ${log.join(' | ')}`).toBeGreaterThanOrEqual(0);
    const idx = ORDER.map(at);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  };

  it('plays the five steps in order, and the hunt learns the route only at the handshake', () => {
    const { w, log } = play(7, false);
    inOrder(log);
    expect(w.flags.has('relay_broadcast')).toBe(true);
    expect(w.flags.has('sam_silent')).toBe(true);
    expect(pursuerOf([...w.flags])).toBe('calloway');
  }, 60000);

  it('holds every line while the blockade fight runs, then plays them in order', () => {
    const first = play(1, true, 70, 'run');
    expect(first.fought).toBe(true);
    // no line, notice or card of the handshake got through a live fight
    expect(first.log.some((l) => l.startsWith('notice:Warden') || l === 'card:warden_note_1')).toBe(false);
    const { w, log } = play(1, true, 500, 'run', 24);
    expect(w.alive).toBe(true);
    inOrder(log);
  }, 60000);

  it('never opens the Patience’s card before the note, even if the sortie asks for the beat', () => {
    const j = narrows();
    expect(sortieDef(j).story).toBeNull();
  });
});
