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
  it('is the road’s gate, locked by Custody, with a mast off the ring and no checkpoint card', () => {
    const j = narrows();
    const def = sortieDef(j);
    expect(def.kind).toBe('gate');
    expect(def.script).toBe('narrows');
    expect(def.blockade).toBe(false);
    expect(def.checkpoint).toBeUndefined();
    expect(SCRIPT.filter((r) => r.stop === 'narrows').length).toBeGreaterThan(10);
  });

  /** Flies the stop: the ship is put 1.5 km from the mast after 20 s (the mast stands about 1 km off the ring), and answers the Patience with `answer`. */
  function play(seed: number, answer = 'tell', secs = 300) {
    const j = narrows();
    const def = { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity };
    const w = new World(seed, { mode: 'breakout', sortie: def, carry: j.carry });
    const log: string[] = [];
    const seen = { down: -1, open: -1, held: false, hulls: 0, fleeing: 0, after: 0, read: false, lockedAtGate: '' };
    for (let i = 0; i < Math.round(secs / STEP); i++) {
      const r = relayOf(w.bk!)!;
      if (i === Math.round(12 / STEP)) seen.lockedAtGate = w.gateWhy;
      if (i === Math.round(20 / STEP)) { expect(w.flags.has('relay_broadcast')).toBe(false); w.ship.x = r.x - 150; w.ship.z = r.z; }
      w.ship.invuln = 99;
      w.step(STEP, NO_INPUT);
      for (const e of w.events) {
        if (e.type === 'comms') log.push(`card:${e.id}`);
        if (e.type === 'storyNotice') log.push(`notice:${e.headline}`);
        if (e.type === 'ping') log.push(`say:${e.text.slice(1, 14)}`);
      }
      w.events.length = 0;
      if (w.fieldDown && seen.down < 0) { seen.down = w.runTime; seen.hulls = w.aliens.filter((a) => a.faction === 'custody' && !a.ward).length; }
      if (w.fieldDown) seen.held = seen.held || w.gateWhy === 'the gate is rebooting';
      if (seen.open < 0 && w.flags.has('narrows_gate_open')) seen.open = w.runTime;
      if (w.comms?.def.id === 'story_calloway_narrows') w.answer(answer);
      else if (w.comms) w.answer(w.comms.def.choices[0]!.id);
      if (w.flags.has('calloway_asked') && !seen.read) {
        // a second on, once the world has read her answer
        seen.read = true;
        for (let k = 0; k < Math.round(1 / STEP); k++) { w.step(STEP, NO_INPUT); w.events.length = 0; }
        seen.after = w.aliens.filter((a) => a.faction === 'custody' && !a.ward && !a.fleeing).length;
        seen.fleeing = w.aliens.filter((a) => a.faction === 'custody' && !a.ward && a.fleeing).length;
      }
    }
    return { w, log, seen };
  }

  const ORDER = ['notice:The Narrows', 'say:The Narrows g', 'say:That’s the re', 'notice:Warden key accepted', 'card:warden_note_1', 'notice:Jump Gate rebooting', 'say:I’ll remember', 'notice:CCV Patience inbound', 'card:story_calloway_narrows', 'notice:Jump Gate open', 'say:This is wher', 'notice:Signal lost'];
  const inOrder = (log: string[]) => {
    const at = (s: string) => log.findIndex((l) => l.startsWith(s));
    for (const o of ORDER) expect(at(o), `${o} in ${log.join(' | ')}`).toBeGreaterThanOrEqual(0);
    const idx = ORDER.map(at);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  };

  it('plays one scene in order: locked, the key, the gate down, the Patience, the way out', () => {
    const { w, log, seen } = play(7);
    inOrder(log);
    expect(seen.lockedAtGate).toBe('locked by Custody');
    expect(w.flags.has('relay_broadcast')).toBe(true);
    expect(w.flags.has('sam_silent')).toBe(true);
    expect(pursuerOf([...w.flags])).toBe('calloway');
    // no checkpoint card, and the gate's old "holding" notice never repeats the reboot's own
    expect(log.some((l) => l === 'card:narrows_checkpoint' || l === 'card:checkpoint')).toBe(false);
    expect(log.slice(log.indexOf('notice:Warden key accepted')).filter((l) => l === 'notice:Jump Gate holding')).toEqual([]);
  }, 60000);

  it('takes the gate down for 90 s with its field off, and the blockade comes', () => {
    const { w, seen } = play(3);
    expect(seen.down).toBeGreaterThan(0);
    expect(seen.held).toBe(true);
    expect(seen.hulls).toBeGreaterThanOrEqual(3);
    // the card pauses the world, so the gate opens 90 s of flying after it went down
    expect(seen.open - seen.down).toBeGreaterThanOrEqual(90 - 1e-6);
    expect(seen.open - seen.down).toBeLessThan(92);
    expect(w.fieldDown).toBe(false);
    expect(w.flags.has('ashgrove_met')).toBe(true);
  }, 60000);

  it('changes the fight by her answer: the truth calls the pickets off, cutting her off leaves them on you', () => {
    const told = play(4, 'tell', 150).seen;
    expect(told.fleeing).toBeGreaterThanOrEqual(3);
    const cut = play(4, 'cut', 150).seen;
    expect(cut.fleeing).toBe(0);
    expect(cut.after).toBeGreaterThan(0);
  }, 60000);

  it('opens at once for a journey that reaches the Narrows with the note already read', () => {
    const j = narrows();
    j.carry.flags.push('warden_note_1', 'relay_narrows', 'relay_broadcast', 'clue_relay_answered');
    const w = new World(1, { mode: 'breakout', sortie: { ...sortieDef(j), pace: { first: 1e9, calm: 1e9 } }, carry: j.carry });
    for (let i = 0; i < Math.round(5 / STEP); i++) { w.step(STEP, NO_INPUT); w.events.length = 0; }
    expect(w.fieldDown).toBe(false);
    expect(w.aliens.filter((a) => a.faction === 'custody' && !a.ward).length).toBe(0);
  });

  it('never opens the Patience’s card before the note, even if the sortie asks for the beat', () => {
    const j = narrows();
    expect(sortieDef(j).story).toBeNull();
  });
});
