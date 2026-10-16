import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { MISSIONS, MISSION_CARDS } from '../src/content/missions';
import { SITUATION_BY_ID } from '../src/content/situations';
import type { InputFrame } from '../src/input/types';
import { lanesFrom, makeChart, regionOf } from '../src/sim/chart';
import { JOB_COLS } from '../src/content/situations';
import { laySituations } from '../src/sim/situations';
import { migrate } from '../src/meta/save';
import { endSortie, newJourney, plot, sortieDef, VERSION, type Journey } from '../src/sim/journey';
import { newRun } from '../src/sim/run';
import { cy } from '../src/sim/purse';
import { scaleOut } from '../src/sim/mission';
import type { Alien } from '../src/sim/enemies';
import { World } from '../src/sim/world';

// Missions (content/missions.ts, sim/mission.ts): each job played through headless, the way the
// pilot and the player meet it: the call, the goal, the ending, and the pay.

const input = (f: Partial<InputFrame> = {}): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard', ...f });

function world(id: string, carry: Partial<Journey['carry']> = {}, levels: Record<string, number> = {}) {
  const j = newJourney(5, false, 'eight');
  const run = newRun(1);
  run.escaped = true;
  endSortie(j, { ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 30, fuel: 40, supplies: 12, plates: 3 }, run, calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {} });
  plot(j, lanesFrom(j.chart, j.at)[0]!.to.id);
  const def = { ...sortieDef(j), situation: id, quiet: true, place: null, story: null, pay: 1 };
  const w = new World(j.seed * 31 + 1, { mode: 'breakout', sortie: def, carry: { ...j.carry, fuel: 40, ...carry } });
  w.levels = { ...w.levels, ...levels };
  w.ship.invuln = 1e9;
  return w;
}
const run = (w: World, seconds: number, f: Partial<InputFrame> = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    w.ship.invuln = 1e9;
    w.step(STEP, input(f));
    if (w.phase === 'comms' && w.comms && !w.comms.def.id.startsWith('sc_')) w.answer(w.comms.choices.find((c) => c.ok)!.id);
    if (w.phase === 'hail') w.answerHail(false);
  }
};
const put = (w: World, x: number, z: number) => { w.ship.x = x; w.ship.z = z; w.ship.vx = w.ship.vz = 0; };
const kill = (w: World, al: Alien) => (w as unknown as { hurtAlien(a: Alien, d: number, s: string, x: number, y: number, z: number): boolean }).hurtAlien(al, 1e6, 'laser', al.x, al.y, al.z);
const hit = (w: World, al: Alien, d: number) => (w as unknown as { hurtAlien(a: Alien, d: number, s: string, x: number, y: number, z: number): boolean }).hurtAlien(al, d, 'laser', al.x, al.y, al.z);

/** Take the call: go to the site, wait for the card, answer with `choice`. */
function take(id: string, choice: string, carry: Partial<Journey['carry']> = {}, levels: Record<string, number> = {}) {
  const w = world(id, carry, levels);
  const st = w.stage!;
  put(w, st.x, st.z + 160);
  for (let i = 0; i < 60 && !(w.call ?? w.comms); i++) run(w, 1);
  expect((w.call ?? w.comms)?.def.id, id).toBe(SITUATION_BY_ID[id]!.card);
  expect(w.answer(choice)).toBe(true);
  return { w, st };
}
const gain = (w: World, before: number) => w.cyrite - before;

describe('the missions as data', () => {
  it('each has a card, two ways to settle it at least, and a German-ready goal line', () => {
    for (const d of MISSIONS) {
      const card = MISSION_CARDS.find((c) => c.id === d.card)!;
      expect(card, d.id).toBeDefined();
      expect(card.choices.length, d.id).toBeGreaterThanOrEqual(3);
      expect(d.goal.kind, d.id).not.toBe('call');
      expect(d.win, d.id).toBeDefined();
    }
  });

  it('scale the pay and nothing else', () => {
    const o = scaleOut({ text: 'x', chits: 100, supplies: 4, flag: 'f', standing: { gutter: 1 } }, 0.5);
    expect(o.chits).toBe(50);
    expect(o.supplies).toBe(2);
    expect(o.flag).toBe('f');
    expect(o.standing).toEqual({ gutter: 1 });
  });
});

describe('a pirate toll', () => {
  it('pays in full for the whole crew, and less when the captain goes first and the rest scatter', () => {
    const a = take('pirate_toll', 'break');
    const before = a.w.cyrite;
    run(a.w, 1);
    expect(a.st.run!.foes.length).toBe(4);
    for (const f of [...a.st.run!.foes].reverse()) kill(a.w, f);
    run(a.w, 1);
    expect(a.st.result).toBe('won');
    expect(gain(a.w, before)).toBe(cy(110));

    const b = take('pirate_toll', 'break');
    const before2 = b.w.cyrite;
    run(b.w, 1);
    const cap = b.st.run!.foes.find((f) => (f as Alien & { scatter?: boolean }).scatter)!;
    kill(b.w, cap);
    run(b.w, 1);
    expect(b.st.result).toBe('won');
    expect(gain(b.w, before2)).toBe(cy(Math.round(110 * 0.7)));
  });

  it('settles with a jammer, and pays nothing for the goal it never took', () => {
    const j = take('pirate_toll', 'jam', {}, { md_jammer: 1 });
    expect(j.st.taken).toBe(false);
    run(j.w, 1);
    expect(j.st.result).toBe('won');
    expect(j.w.stage!.run).toBeNull();
  });

  it('is lost when the time runs out', () => {
    const a = take('pirate_toll', 'break');
    a.w.cyrite = 0;
    put(a.w, a.st.x + 3000, a.st.z);
    for (const f of a.st.run!.foes) f.ward = undefined;
    run(a.w, 160);
    expect(a.st.result).toBe('lost');
  });
});

describe('a heavy tanker', () => {
  it('has to be crippled, then taken in tow', () => {
    const { w, st } = take('heavy_tanker', 'strike');
    const tg = st.run!.target!;
    const before = w.cyrite;
    hit(w, tg, tg.maxHp * 0.75);
    run(w, 1);
    expect(tg.hp).toBeLessThan(tg.maxHp * 0.3);
    expect(st.result).toBeNull();
    put(w, tg.x + 6, tg.z);
    run(w, 5);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(150));
  });

  it('pays the spoiled share when she is destroyed outright', () => {
    const { w, st } = take('heavy_tanker', 'strike');
    const before = w.cyrite;
    kill(w, st.run!.target!);
    run(w, 1);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBeGreaterThan(0);
    expect(gain(w, before)).toBeLessThan(cy(150));
  });

  it('is lost when she gets away', () => {
    const { w, st } = take('heavy_tanker', 'strike');
    const tg = st.run!.target!;
    w.aliens.splice(w.aliens.indexOf(tg), 1);
    run(w, 1);
    expect(st.result).toBe('lost');
  });

  it('does not pay the job when the tanker is warned', () => {
    const { w, st } = take('heavy_tanker', 'warn');
    const k = w.cyrite;
    run(w, 1);
    expect(st.result).toBe('won');
    expect(w.cyrite - k).toBe(0);
    expect(k).toBeGreaterThan(0);
  });
});

describe('the last shift', () => {
  it('pays by what is left of the rig when the time is up', () => {
    const { w, st } = take('last_shift', 'stand');
    const before = w.cyrite;
    for (let i = 0; i < 110 && !st.result; i++) {
      run(w, 1);
      for (const f of [...(st.run?.foes ?? [])]) kill(w, f);
    }
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBeGreaterThanOrEqual(cy(135));
  });

  it('is lost when the raiders chew through the hull', () => {
    const { w, st } = take('last_shift', 'stand');
    const rig = st.run!.target!;
    run(w, 16);
    for (const f of st.run!.foes) { f.x = rig.x + 20; f.z = rig.z; f.ax = rig.x; f.az = rig.z; f.vx = f.vz = 0; }
    for (let i = 0; i < 90 && !st.result; i++) { run(w, 1); for (const f of st.run?.foes ?? []) { f.x = rig.x + 20; f.z = rig.z; } }
    expect(st.result).toBe('lost');
  });
});

describe('run the needle', () => {
  it('is won through the beacons in order, and lost to a rival who is left to fly it alone', () => {
    const a = take('needle', 'race', { cyrite: 40 });
    const before = a.w.cyrite;
    run(a.w, 3.5);
    for (let k = 0; k < 6; k++) {
      const p = a.st.pins.find((q) => q.on)!;
      put(a.w, p.x, p.z);
      run(a.w, 0.1);
    }
    expect(a.st.result).toBe('won');
    expect(gain(a.w, before)).toBeGreaterThan(0);

    const b = take('needle', 'race', { cyrite: 40 });
    for (let i = 0; i < 125 && !b.st.result; i++) run(b.w, 1);
    expect(b.st.result).toBe('lost');
  });
});

describe('the point of no return', () => {
  it('pays more for each ring held, and burns in the core', () => {
    const { w, st } = take('no_return', 'go');
    const before = w.cyrite;
    put(w, st.x + 200, st.z);
    w.ship.vx = w.ship.vz = 0;
    for (let i = 0; i < 180; i++) { put(w, st.x + 200, st.z); run(w, 0.05); }
    run(w, 0.1);
    put(w, st.x + 900, st.z);
    run(w, 1);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(Math.round(220 * 0.35)));
  });

  it('is lost when the ship turns back before a single reading', () => {
    const { w, st } = take('no_return', 'go');
    put(w, st.x + 900, st.z);
    run(w, 200);
    expect(st.result).not.toBe('won');
  });
});

describe('nothing to declare', () => {
  it('is won at the drop when the patrols have not read the ship', () => {
    const { w, st } = take('nothing_to_declare', 'drop');
    const before = w.cyrite;
    for (let i = 0; i < 12 * 60 && !st.result; i++) { put(w, st.x, st.z); run(w, 1 / 60); }
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(130));
  });

  it('is lost when the ship sits in a sweep, and the patrols turn', () => {
    const { w, st } = take('nothing_to_declare', 'drop');
    const pat = st.actors.filter((a) => a.ward?.act === 'patrol');
    expect(pat.length).toBe(3);
    for (let i = 0; i < 20 * 60 && !st.result; i++) { put(w, pat[0]!.x + 10, pat[0]!.z); run(w, 1 / 60); }
    expect(st.result).toBe('lost');
    expect(pat.some((a) => !a.ward)).toBe(true);
  });
});

describe('the second batch', () => {
  it('a kill zone pays when every raider is down', () => {
    const { w, st } = take('kill_zone', 'clear');
    const before = w.cyrite;
    run(w, 1);
    expect(st.run!.foes.length).toBe(6);
    for (const f of [...st.run!.foes]) kill(w, f);
    run(w, 1);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(170));
  });

  it('the missing shift is found by holding at the wreck with a supply', () => {
    const { w, st } = take('missing_shift', 'search');
    const before = w.cyrite, sup = w.supplies;
    for (let i = 0; i < 12 * 60 && !st.result; i++) { put(w, st.x, st.z); run(w, 1 / 60); }
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(100));
    expect(w.supplies).toBe(sup - 1 + 3);
  });

  it('the prospector is followed to the vein, and lost when the ship stays behind', () => {
    const a = take('follow_cyrite', 'follow');
    const before = a.w.cyrite;
    for (let i = 0; i < 70 * 60 && !a.st.result; i++) {
      const lead = a.st.actors.find((x) => x.ward?.act === 'lead');
      if (lead) put(a.w, lead.x, lead.z + 20);
      run(a.w, 1 / 60);
    }
    expect(a.st.result).toBe('won');
    expect(gain(a.w, before)).toBe(cy(90));
    const b = take('follow_cyrite', 'follow');
    put(b.w, b.st.x + 4000, b.st.z);
    for (let i = 0; i < 60 && !b.st.result; i++) run(b.w, 1);
    expect(b.st.result).toBe('lost');
  });

  it('the chart can be bought instead, and the goal is never paid', () => {
    const { w, st } = take('follow_cyrite', 'buy', { cyrite: 40 });
    const before = w.cyrite;
    run(w, 1);
    expect(st.result).toBe('won');
    expect(w.cyrite).toBe(before);
  });

  it('a signal and a wreck are read by holding slow and close', () => {
    for (const [id, choice, pay] of [['someone_answered', 'listen', 130], ['wreck_remembered', 'read', 120]] as const) {
      const { w, st } = take(id, choice);
      const before = w.cyrite;
      for (let i = 0; i < 14 * 60 && !st.result; i++) { put(w, st.x, st.z); run(w, 1 / 60); }
      expect(st.result, id).toBe('won');
      expect(gain(w, before), id).toBe(cy(pay));
    }
  });
});

describe('the third batch', () => {
  it('keep your distance is won by sitting unseen in the middle of the loop', () => {
    const { w, st } = take('keep_distance', 'record');
    const before = w.cyrite;
    expect(st.actors.filter((a) => a.ward?.act === 'patrol').length).toBe(4);
    for (let i = 0; i < 16 * 60 && !st.result; i++) { put(w, st.x, st.z); run(w, 1 / 60); }
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(150));
  });

  it('be the bait is won by breaking the four pickets that come', () => {
    const { w, st } = take('be_bait', 'bait');
    const before = w.cyrite;
    run(w, 1);
    expect(st.run!.foes.length).toBe(4);
    for (const f of [...st.run!.foes]) kill(w, f);
    run(w, 1);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(160));
  });

  it('the dead drop is collected by holding at the beacon', () => {
    const { w, st } = take('dead_drop', 'fetch');
    const before = w.cyrite;
    for (let i = 0; i < 9 * 60 && !st.result; i++) { put(w, st.x, st.z); run(w, 1 / 60); }
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(140));
  });

  it('the long walk is won by staying with a slow hauler, and lost by leaving her', () => {
    const a = take('long_walk', 'escort');
    const before = a.w.cyrite;
    for (let i = 0; i < 90 * 60 && !a.st.result; i++) {
      const lead = a.st.actors.find((x) => x.ward?.act === 'lead');
      if (lead) put(a.w, lead.x, lead.z + 20);
      for (const h of a.w.aliens) if (!h.ward) h.hp = 0;
      run(a.w, 1 / 60);
    }
    expect(a.st.result).toBe('won');
    expect(gain(a.w, before)).toBeGreaterThanOrEqual(cy(120));
    const b = take('long_walk', 'escort');
    put(b.w, b.st.x + 4000, b.st.z);
    for (let i = 0; i < 60 && !b.st.result; i++) run(b.w, 1);
    expect(b.st.result).toBe('lost');
  });

  it('finders keepers is a race of four marks', () => {
    const { w, st } = take('finders_keepers', 'race');
    const before = w.cyrite;
    run(w, 3.5);
    for (let k = 0; k < 4; k++) {
      const p = st.pins.find((q) => q.on)!;
      put(w, p.x, p.z);
      run(w, 0.1);
    }
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBeGreaterThanOrEqual(cy(150));
  });
});

describe('the fourth batch', () => {
  const hold = (id: string, choice: string, secs: number, pay: number, at = 0) => {
    const { w, st } = take(id, choice);
    const before = w.cyrite;
    for (let i = 0; i < secs * 60 && !st.result; i++) { put(w, st.x + at, st.z); run(w, 1 / 60); }
    expect(st.result, id).toBe('won');
    expect(gain(w, before), id).toBe(cy(pay));
    return w;
  };

  it('is won by holding where the job asks', () => {
    const d = take('something_dark', 'probe');
    const before = d.w.cyrite;
    for (let i = 0; i < 12 * 60; i++) { put(d.w, d.st.x + 110, d.st.z); run(d.w, 1 / 60); }
    put(d.w, d.st.x + 900, d.st.z);
    run(d.w, 1);
    expect(d.st.result).toBe('won');
    expect(gain(d.w, before)).toBe(cy(160));
    hold('voice_wire', 'listen', 10, 130);
    hold('lose_prefect', 'lose', 12, 100);
  });

  it('the filter needs the parts, and pays when they are delivered in time', () => {
    const w = hold('one_filter', 'bring', 14, 120);
    expect(w.supplies).toBeLessThanOrEqual(10);
    const b = take('one_filter', 'bring', { supplies: 0 });
    for (let i = 0; i < 95 * 60 && !b.st.result; i++) { put(b.w, b.st.x, b.st.z); run(b.w, 1 / 60); }
    expect(b.st.result).toBe('lost');
  });

  it('the payroll is taken from a crippled courier', () => {
    const { w, st } = take('missing_payroll', 'take');
    const tg = st.run!.target!, before = w.cyrite;
    hit(w, tg, tg.maxHp * 0.8);
    run(w, 1);
    put(w, tg.x + 6, tg.z);
    run(w, 5);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(180));
  });

  it('two captains are both broken', () => {
    const { w, st } = take('two_captains', 'break');
    const before = w.cyrite;
    run(w, 1);
    expect(st.run!.foes.length).toBe(5);
    for (const f of [...st.run!.foes]) kill(w, f);
    run(w, 1);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(170));
  });

  it('the witness lives when the pickets are broken, and is lost when she is not', () => {
    const a = take('the_witness', 'guard');
    const before = a.w.cyrite;
    for (let i = 0; i < 85 && !a.st.result; i++) { run(a.w, 1); for (const f of [...(a.st.run?.foes ?? [])]) kill(a.w, f); }
    expect(a.st.result).toBe('won');
    expect(gain(a.w, before)).toBeGreaterThanOrEqual(cy(150 * 0.45));
    const b = take('the_witness', 'guard');
    kill(b.w, b.st.run!.target!);
    run(b.w, 1);
    expect(b.st.result).toBe('lost');
  });
});

describe('a job in the sky', () => {
  it('is pinned on the scope before the call, and rings again if the desk lost the call', () => {
    const w = world('pirate_toll');
    const st = w.stage!;
    put(w, st.x, st.z + 900);
    run(w, 35);
    expect(st.begun && st.onScope).toBe(true);
    expect(w.encounter?.id).toBe('scene');
    expect(w.encounter?.label).toBe(st.def.name);
    // near enough to ring; the desk drops the card before it opens
    w.desk.closed(w.runTime);
    put(w, st.x, st.z + 300);
    run(w, 1);
    expect(st.offered && w.desk.waiting(st.def.card!)).toBe(true);
    (w.desk as unknown as { queue: unknown[] }).queue.length = 0;
    for (let i = 0; i < 60 && !(w.call ?? w.comms); i++) run(w, 1);
    expect((w.call ?? w.comms)?.def.id).toBe(SITUATION_BY_ID.pirate_toll!.card);
  });
});

describe('jobs on the timetable', () => {
  const isJob = (id: string) => MISSIONS.some((m) => m.id === id);

  it('every region of every journey has its jobs, and the first is within the first few stops', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const c = makeChart(seed, 'eight', 0.2);
      const q = laySituations(c, seed);
      for (let region = 0; region < 8; region++) {
        const cols = new Set(c.systems.filter((s) => regionOf(s) === region && isJob(q[s.id]?.id ?? '')).map((s) => s.col));
        expect(cols.size, `seed ${seed} region ${region}`).toBeGreaterThanOrEqual(JOB_COLS[region]!);
      }
      // a job in every system of such a column: whichever lane is flown, the player meets it
      const first = Math.min(...c.systems.filter((s) => isJob(q[s.id]?.id ?? '')).map((s) => s.col));
      expect(first, `seed ${seed}`).toBeLessThanOrEqual(5);
    }
  });

  it('a journey saved before them gets jobs in the columns ahead, and nowhere the ship has been', () => {
    const j = newJourney(11, false, 'eight');
    const raw = JSON.parse(JSON.stringify(j)) as Record<string, unknown> & { chart: { situations: Record<string, { id: string; arc?: boolean }> } };
    for (const [id, s] of Object.entries(raw.chart.situations)) if (isJob(s.id)) delete raw.chart.situations[id];
    expect(Object.values(raw.chart.situations).some((s) => isJob(s.id))).toBe(false);
    raw.version = 15;
    const m = migrate(raw)!;
    expect(m.version).toBe(VERSION);
    const jobs = Object.entries(m.chart.situations!).filter(([, s]) => isJob(s.id));
    expect(jobs.length).toBeGreaterThan(8);
    for (const [id, s] of Object.entries(m.chart.situations!)) if (isJob(s.id)) expect(s.arc, id).toBeFalsy();
  });
});

describe('the drift cache', () => {
  const pins = (st: { pins: Array<{ x: number; z: number; on: boolean }> }) => st.pins;
  const gather = (w: World, st: { pins: Array<{ x: number; z: number; on: boolean }> }, n: number) => {
    for (let k = 0; k < n; k++) {
      const p = pins(st).find((q) => q.on)!;
      for (let i = 0; i < 70 && p.on; i++) { put(w, p.x, p.z); run(w, 0.05); }
    }
  };

  it('pays in full for every case, and a crew comes after the first', () => {
    const { w, st } = take('drift_cache', 'recover');
    const before = w.cyrite, aliens = w.aliens.length;
    gather(w, st, 1);
    run(w, 0.2);
    expect(w.aliens.length).toBeGreaterThan(aliens);
    gather(w, st, 3);
    run(w, 0.5);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(140));
  });

  it('pays for the cases aboard when time runs out', () => {
    const { w, st } = take('drift_cache', 'recover');
    const before = w.cyrite;
    gather(w, st, 2);
    put(w, st.x + 900, st.z);
    run(w, 170);
    expect(st.result).toBe('won');
    expect(gain(w, before)).toBe(cy(70));
  });

  it('is lost when no case is taken', () => {
    const { w, st } = take('drift_cache', 'recover');
    put(w, st.x + 900, st.z);
    run(w, 170);
    expect(st.result).not.toBe('won');
  });
});
