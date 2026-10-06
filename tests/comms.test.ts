import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { CARDS, FLAGS } from '../src/content/cards';
import { MODULES } from '../src/content/modules';
import { UPGRADES } from '../src/content/upgrades';
import { CARD_BY_ID, COMMS_FIRST, SLOW, condOk, openCard, resolve, sensors, type Ctx } from '../src/sim/comms';
import { VARIANTS } from '../src/sim/enemies';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';

const input = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, cut: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard' });
const run = (w: World, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) w.step(STEP, input()); };

const ctx = (x: Partial<Ctx> = {}): Ctx => ({
  t: 300, heat: 0.3, cyrite: 10, need: 20, tank: 40, ore: 0, holdMax: 40, chits: 0, parts: 0, plates: 3, maxPlates: 3,
  levels: {}, flags: new Set(), standing: {}, place: 'open', hostiles: 0, food: 12, kind: 'home', netted: true, behind: Infinity, ...x,
});

/** A quiet Breakout: no rock, no pursuit, no chance cards unless asked. */
function quiet(seed = 5): World {
  const w = new World(seed, { mode: 'breakout' });
  w.field.rocks = [];
  w.field.bulwarks = [];
  w.field.step = () => {};
  w.bk!.nextPursuit = Infinity;
  w.cardNext = Infinity;
  w.portCalled = true;
  return w;
}

describe('the cards', () => {
  it('number about thirty, of every kind, with unique ids', () => {
    expect(CARDS.filter((c) => (c.trigger ?? 'chance') !== 'follow').length).toBeGreaterThanOrEqual(30);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const k of ['trade', 'plea', 'job', 'warning', 'shakedown', 'checkpoint', 'distress', 'rumour']) expect(CARDS.some((c) => c.kind === k)).toBe(true);
  });

  it('only refer to things that exist', () => {
    const ups = new Set([...UPGRADES.map((u) => u.id), ...MODULES.map((m) => m.id)]);
    for (const c of CARDS) {
      expect(c.choices.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.choices.length, c.id).toBeLessThanOrEqual(6);
      expect(new Set(c.choices.map((ch) => ch.id)).size, c.id).toBe(c.choices.length);
      for (const s of c.ships ?? []) expect(VARIANTS[s.variant], `${c.id} ship ${s.variant}`).toBeDefined();
      if (c.slow) expect(c.choices.some((ch) => ch.id === c.slow!.default), c.id).toBe(true);
      const truths = new Set((c.truths ?? []).map((t) => t.id));
      for (const ch of c.choices) {
        for (const t of ch.loseIf ?? []) expect(truths.has(t), `${c.id}.${ch.id} loses to ${t}`).toBe(true);
        if (ch.loseIf || ch.odds) expect(ch.lose, `${c.id}.${ch.id} can lose`).toBeDefined();
        if (ch.needs?.flag) expect(FLAGS[ch.needs.flag], `${c.id}.${ch.id} flag ${ch.needs.flag}`).toBeDefined();
        for (const id of [ch.needs?.fitted ?? []].flat()) expect(ups.has(id), `${c.id}.${ch.id} needs ${id}`).toBe(true);
        for (const id of Object.keys(ch.odds?.fitted ?? {})) expect(ups.has(id), `${c.id}.${ch.id} odds ${id}`).toBe(true);
        for (const o of [ch.win, ch.lose]) {
          if (!o) continue;
          if (o.follow) expect(CARD_BY_ID[o.follow.card], `${c.id}.${ch.id} follows ${o.follow.card}`).toBeDefined();
          for (const s of o.spawn ?? []) expect(VARIANTS[s.variant], `${c.id}.${ch.id} spawns ${s.variant}`).toBeDefined();
        }
      }
    }
  });

  it('gives every follow-up a card that leads to it', () => {
    const led = new Set(CARDS.flatMap((c) => c.choices.flatMap((ch) => [ch.win.follow?.card, ch.lose?.follow?.card])));
    for (const c of CARDS.filter((x) => x.trigger === 'follow')) expect(led.has(c.id), c.id).toBe(true);
  });
});

describe('the comms engine', () => {
  it('reads conditions off the ship', () => {
    expect(condOk({ short: true }, ctx({ cyrite: 10 }))).toBe(true);
    expect(condOk({ short: true }, ctx({ cyrite: 25 }))).toBe(false);
    expect(condOk({ holdFull: true }, ctx({ ore: 35 }))).toBe(true);
    expect(condOk({ flag: 'codes' }, ctx())).toBe(false);
    expect(condOk({ noFlag: 'codes', heatMax: 0.5 }, ctx())).toBe(true);
    expect(condOk({ fitted: ['tp_bay', 'ut_scanner'] }, ctx({ levels: { ut_scanner: 1 } }))).toBe(true);
    expect(condOk({ standing: ['gutter', 2] }, ctx({ standing: { gutter: 1 } }))).toBe(false);
  });

  it('shows earned choices greyed out with what they need', () => {
    const o = openCard(CARD_BY_ID.gutter_toll!, ctx({ cyrite: 2 }), new Rng(1));
    const bay = o.choices.find((c) => c.id === 'bay')!;
    expect(bay.ok).toBe(false);
    expect(bay.needs.join()).toMatch(/Torpedo bay/);
    const friend = o.choices.find((c) => c.id === 'friend')!;
    expect(friend.needs.join()).toMatch(/friend in the Gutter/);
    const pay = o.choices.find((c) => c.id === 'pay')!;
    expect(pay.ok).toBe(false);
    expect(pay.needs.join()).toMatch(/4 Cyrite/);
    // fitted, the bay is a gamble on the odds
    const fitted = openCard(CARD_BY_ID.gutter_toll!, ctx({ levels: { tp_bay: 1 } }), new Rng(1)).choices.find((c) => c.id === 'bay')!;
    expect(fitted.ok).toBe(true);
    expect(fitted.odds).toBeCloseTo(0.7);
  });

  it('reads differently with a full hold', () => {
    const empty = openCard(CARD_BY_ID.gutter_toll!, ctx(), new Rng(1));
    const full = openCard(CARD_BY_ID.gutter_toll!, ctx({ ore: 38 }), new Rng(1));
    expect(empty.text).not.toMatch(/how low you sit/);
    expect(full.text).toMatch(/how low you sit/);
    expect(empty.choices.some((c) => c.id === 'ore')).toBe(false);
    expect(full.choices.some((c) => c.id === 'ore')).toBe(true);
  });

  it('reads intent as well as the sensors allow', () => {
    const hit = (levels: Record<string, number>) => {
      const rng = new Rng(7);
      let right = 0;
      for (let i = 0; i < 600; i++) {
        const o = openCard(CARD_BY_ID.distress_tug!, ctx({ levels }), rng);
        if (o.read.intent === CARD_BY_ID.distress_tug!.truths!.find((t) => t.id === o.truth)!.read) right++;
      }
      return right / 600;
    };
    expect(sensors({})).toBeCloseTo(0.65);
    expect(hit({})).toBeGreaterThan(0.58);
    expect(hit({})).toBeLessThan(0.72);
    expect(hit({ ut_scanner: 1 })).toBeGreaterThan(0.8);
  });

  it('weighs their strength against yours', () => {
    const o = openCard(CARD_BY_ID.gutter_toll!, ctx(), new Rng(1));
    expect(o.read.them).toBeGreaterThan(0);
    expect(o.read.you).toBeGreaterThan(0);
    const armed = openCard(CARD_BY_ID.gutter_toll!, ctx({ levels: { tp_bay: 1, ph_emitters: 3 } }), new Rng(1));
    expect(armed.read.you).toBeGreaterThan(o.read.you);
    expect(openCard(CARD_BY_ID.rumour_seam!, ctx(), new Rng(1)).read.them).toBe(0);
  });

  it('loses to the truth, whatever the odds', () => {
    const x = ctx({ chits: 200 });
    const o = openCard(CARD_BY_ID.checkpoint!, x, new Rng(2));
    o.truth = 'by_book';
    expect(resolve(o, 'pay', x, new Rng(1))!.outcome.blockade).toBe('fight');
    o.truth = 'corrupt';
    const r = resolve(o, 'pay', x, new Rng(1))!;
    expect(r.outcome.blockade).toBe('pass');
    expect(r.cost.chits).toBe(o.fee);
  });

  it('makes a lie harder the more they are looking', () => {
    const cool = openCard(CARD_BY_ID.checkpoint!, ctx({ heat: 0.1 }), new Rng(1)).choices.find((c) => c.id === 'talk')!;
    const hot = openCard(CARD_BY_ID.checkpoint!, ctx({ heat: 0.9 }), new Rng(1)).choices.find((c) => c.id === 'talk')!;
    expect(cool.odds!).toBeGreaterThan(hot.odds! + 0.3);
  });

  it('prices the checkpoint by heat, and cheaper with word of her fees', () => {
    const lo = openCard(CARD_BY_ID.checkpoint!, ctx({ heat: 0.1 }), new Rng(1)).fee;
    const hi = openCard(CARD_BY_ID.checkpoint!, ctx({ heat: 0.9 }), new Rng(1)).fee;
    const known = openCard(CARD_BY_ID.checkpoint!, ctx({ heat: 0.9, flags: new Set(['fee_known']) }), new Rng(1)).fee;
    expect(hi).toBeGreaterThan(lo);
    expect(known).toBeLessThan(hi);
  });
});

describe('comms in the Breakout', () => {
  it('opens the first card early, and the world waits for the answer', () => {
    const w = new World(11, { mode: 'breakout' });
    w.bk!.nextPursuit = Infinity;
    w.field.rocks = [];
    run(w, COMMS_FIRST + 1);
    expect(w.phase).toBe('comms');
    const t = w.runTime;
    run(w, 3);
    expect(w.runTime).toBe(t);
    expect(w.drain().some((e) => e.type === 'comms')).toBe(true);
    const i = w.comms!.choices.findIndex((c) => c.ok);
    expect(w.answer(i)).toBe(true);
    expect(w.phase).toBe('play');
    expect(w.run.cards.length).toBe(1);
  });

  it('refuses a choice the ship has not earned', () => {
    const w = quiet();
    w.openComms(CARD_BY_ID.gutter_toll!);
    expect(w.answer('bay')).toBe(false);
    expect(w.phase).toBe('comms');
  });

  it('sells the hold to the Guild at the Guild’s price', () => {
    const w = quiet();
    w.ore = 20;
    w.openComms(CARD_BY_ID.ore_buyer!);
    w.comms!.truth = 'honest';
    w.answer('sell');
    expect(w.ore).toBe(0);
    expect(w.chits).toBe(60);
    expect(w.standing.guild).toBe(1);
  });

  it('slows the world for an ambush, and takes the default when time runs out', () => {
    const w = quiet();
    w.bk!.heat = 0.5;
    w.openComms(CARD_BY_ID.office_ambush!);
    expect(w.aliens.length).toBe(3);
    const t = w.runTime;
    run(w, 1);
    expect(w.runTime - t).toBeCloseTo(SLOW, 1);
    expect(w.phase).toBe('comms');
    run(w, CARD_BY_ID.office_ambush!.slow!.timeout / SLOW + 1);
    expect(w.phase).toBe('play');
    expect(w.run.cards[0]).toMatchObject({ id: 'office_ambush', choice: 'fight' });
  });

  it('pays the ambushers off, and they break away', () => {
    const w = quiet();
    w.cyrite = 10;
    w.openComms(CARD_BY_ID.office_ambush!);
    w.answer('surrender');
    expect(w.cyrite).toBe(5);
    expect(w.aliens.every((a) => a.fleeing)).toBe(true);
  });

  it('pays a job on docking with the goods, and holds it without them', () => {
    const w = quiet();
    w.openComms(CARD_BY_ID.haul_job!);
    w.answer('take');
    expect(w.jobs.length).toBe(1);
    const b = w.bk!;
    w.ship.x = b.port!.x; w.ship.z = b.port!.z; w.ship.vx = w.ship.vz = 0;
    w.ore = 5;
    run(w, 1.5);
    expect(w.phase).toBe('dock');
    expect(w.drain().some((e) => e.type === 'jobShort')).toBe(true);
    expect(w.jobs.length).toBe(1);
    w.undock();
    w.ore = 20;
    w.ship.x += 40;
    run(w, 0.5);
    w.ship.x = b.port!.x; w.ship.vx = w.ship.vz = 0;
    run(w, 1.5);
    expect(w.jobs.length).toBe(0);
    expect(w.ore).toBe(5);
    expect(w.chits).toBe(60);
    expect(w.run.jobsDone).toBe(1);
  });

  it('calls in a favour later', () => {
    const w = quiet();
    w.cyrite = 5;
    w.openComms(CARD_BY_ID.fuel_runner!);
    w.answer('favour');
    expect(w.cyrite).toBe(11);
    expect(w.flags.has('owes_runner')).toBe(true);
    run(w, 59);
    expect(w.phase).toBe('play');
    run(w, 2);
    expect(w.phase).toBe('comms');
    expect(w.comms!.def.id).toBe('runner_favour');
  });

  it('lets forged codes through the checkpoint, usually', () => {
    let passed = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const w = quiet(seed);
      w.flags.add('codes');
      w.bk!.heat = 0.3;
      w.openComms(CARD_BY_ID.checkpoint!);
      expect(w.comms!.choices.some((c) => c.id === 'rig')).toBe(false);
      w.answer('spoof');
      if (w.bk!.blockade === 'done') passed++;
    }
    expect(passed).toBeGreaterThan(24);
    expect(passed).toBeLessThan(40);
  });

  it('pays the job at the lane when the ship jumps', () => {
    const w = quiet();
    w.openComms(CARD_BY_ID.stowaways!);
    w.answer('take');
    const b = w.bk!;
    b.blockade = 'done';
    w.ship.x = b.lane.x; w.ship.z = b.lane.z;
    w.cyrite = 25;
    run(w, 8);
    expect(w.run.escaped).toBe(true);
    expect(w.run.jobsDone).toBe(1);
    expect(w.standing.miners).toBe(3);
  });

  it('stays out of the arcade', () => {
    const w = new World(3);
    w.cardNext = 0;
    run(w, COMMS_FIRST + 5);
    expect(w.comms).toBeNull();
    expect(w.run.cards.length).toBe(0);
  });
});
