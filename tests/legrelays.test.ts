import { describe, expect, it } from 'vitest';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { relayOf, splitMasts } from '../src/sim/breakout';
import { FLOOR } from '../src/sim/floor';
import { GIVEN_R, HUNGRY_FEED, STARVED, UPLINK_R } from '../src/sim/uplink';

// The legs' relays (spaceways plan, step 6): the Marches. Kessel Hold gains a relay that the moot's crews wake if it stood with her
// (given); the Rift's relay is adrift, tumbling on a slow loop, and she keeps in its ring as it goes.

const NO = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

function stop(script: string, flags: string[] = []): World {
  const n = newJourney(5, false, 'road').chart.systems.length;
  for (let i = 1; i < n; i++) {
    const j = newJourney(5, false, 'road');
    const l = [...j.chart.systems].sort((a, b) => a.col - b.col);
    j.trail = l.slice(0, i + 1).map((x) => x.id); j.at = l[i]!.id; j.status = 'sortie'; j.dest = null;
    if (sortieDef(j).script !== script) continue;
    j.carry.flags.push('archive_woke', 'ship_stolen', 'on_road', 'lock_lifted', 'dead_gate_seen', ...flags);
    return new World(5, { mode: 'breakout', sortie: { ...sortieDef(j), blockade: false, checkpoint: undefined, pace: { first: 1e9, calm: 1e9 }, heatRate: 0, gutter: 0, heat: 0, situation: null, place: null, thren: 0, calloway: Infinity }, carry: j.carry });
  }
  throw new Error(`no stop ${script}`);
}

/** Hold her at an offset from the relay (where it is now) for a while, answering what comes and clearing hostiles. */
function hold(w: World, secs: number, dx: number, dz: number): void {
  for (let i = 0; i < Math.round(secs / STEP); i++) {
    const m = relayOf(w.bk!)!;
    w.ship.invuln = 99; w.ship.x = m.x + dx; w.ship.z = m.z + dz; w.ship.vx = w.ship.vz = 0;
    for (let k = w.aliens.length - 1; k >= 0; k--) if (!w.aliens[k]!.ward) w.aliens.splice(k, 1);
    w.step(STEP, NO);
    w.events.length = 0;
    const open = w.comms ?? w.call;
    if (open) w.answer(open.def.choices[0]!.id);
  }
}

describe('the Marches’ relays', () => {
  it('Kessel Hold has a given relay, the Rift an adrift one', () => {
    expect(stop('m_kessel').bk!.def.twist).toBe('given');
    expect(stop('m_kessel').bk!.def.relay).toBe(true);
    expect(stop('rift').bk!.def.twist).toBe('adrift');
  });

  it('the Rift: the mast tumbles away from where it stood, she keeps in its ring, and woken it steadies', () => {
    const w = stop('rift');
    hold(w, FLOOR.arrival + 0.5, -300, 0);
    const a = relayOf(w.bk!)!;
    hold(w, 20, -20, 0);
    const b = relayOf(w.bk!)!;
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(30);
    expect(w.floor.log.some((l) => l.kind === 'signal' && l.id === 'Relay adrift')).toBe(true);
    // it never drifts behind its gate: always nearer the way in than the gate is
    const lane = w.bk!.lane;
    expect(Math.hypot(b.x, b.z)).toBeLessThan(Math.hypot(lane.x, lane.z) + 120);
    hold(w, 40, -20, 0);
    expect(w.flags.has('relay_rift')).toBe(true);
    const c = relayOf(w.bk!)!;
    hold(w, 10, -20, 0);
    const d = relayOf(w.bk!)!;
    expect(Math.hypot(c.x - d.x, c.z - d.z)).toBeLessThan(0.01);
  });

  it('Kessel Hold: with the moot behind her, the crews wake it while she holds off; without, it waits for her key', () => {
    const off = (UPLINK_R + GIVEN_R) / 2;
    for (const [flags, runs] of [[['pact_holdfast'], true], [[], false]] as const) {
      const w = stop('m_kessel', [...flags]);
      hold(w, FLOOR.arrival + 0.5, -400, 0);
      const was = w.uplink;
      hold(w, 10, -off, 0);
      expect(w.uplink > was, `pact ${flags.length}`).toBe(runs);
    }
  });
});

describe('the Belt’s relays', () => {
  it('Kessler’s Wreck has a relay, the Scrapgate a split one', () => {
    expect(stop('b_kessler').bk!.def.relay).toBe(true);
    expect(stop('scrapgate').bk!.def.twist).toBe('split');
  });

  it('the Scrapgate: three masts, one a stage, each marked in turn, and the gate opens on the third', () => {
    const w = stop('scrapgate');
    hold(w, FLOOR.arrival + 0.5, -300, 0);
    const masts = splitMasts(w.bk!);
    expect(masts.length).toBe(3);
    const seen: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 3; i++) {
      const m = relayOf(w.bk!)!;
      expect(Math.hypot(m.x - masts[i]!.x, m.z - masts[i]!.z)).toBeLessThan(0.01);
      seen.push(m);
      // a stage at this mast
      for (let k = 0; k < 40 && (w.bk!.split ?? 0) <= i && !w.flags.has('relay_scrapgate'); k++) hold(w, 0.5, -15, 0);
    }
    expect(w.flags.has('relay_scrapgate') || w.uplink >= 1).toBe(true);
    // far apart: she flies between them
    expect(Math.hypot(seen[0]!.x - seen[1]!.x, seen[0]!.z - seen[1]!.z)).toBeGreaterThan(100);
    hold(w, 4, -15, 0);
    expect(w.flags.has('relay_scrapgate')).toBe(true);
  });
});

describe('the Drift Deep’s relay', () => {
  it('Lantern Mile: static bursts on a cycle hold the charge, and it runs between them', () => {
    const w = stop('d_lantern');
    expect(w.bk!.def.twist).toBe('jammed');
    hold(w, FLOOR.arrival + 0.5, -300, 0);
    let ran = 0, held = 0, arcs = 0;
    for (let i = 0; i < Math.round(28 / STEP); i++) {
      const before = w.uplink, jam = w.jammed;
      const m = relayOf(w.bk!)!;
      w.ship.invuln = 99; w.ship.x = m.x - 15; w.ship.z = m.z; w.ship.vx = w.ship.vz = 0;
      for (let k = w.aliens.length - 1; k >= 0; k--) if (!w.aliens[k]!.ward) w.aliens.splice(k, 1);
      w.step(STEP, NO);
      arcs += w.events.filter((e) => e.type === 'arc').length;
      w.events.length = 0;
      const open = w.comms ?? w.call; if (open) w.answer(open.def.choices[0]!.id);
      if (w.phase !== 'play' || w.uplink >= 1) continue;
      if (jam && w.jammed) { expect(w.uplink).toBe(before); held++; } else if (!jam && !w.jammed && w.uplink > before) ran++;
    }
    expect(held).toBeGreaterThan(60);
    expect(ran).toBeGreaterThan(60);
    expect(arcs).toBeGreaterThan(3);
    expect(w.floor.log.some((l) => l.kind === 'signal' && l.id === 'Relay jammed')).toBe(true);
  });
});

describe('the Breaker Yards’ relay', () => {
  it('Keelberth: the core drinks her jump fluid as it charges, and starves when the tank is dry', () => {
    const w = stop('y_keel');
    expect(w.bk!.def.twist).toBe('hungry');
    hold(w, FLOOR.arrival + 0.5, -300, 0);
    w.fuel = 30;
    const f0 = w.fuel, u0 = w.uplink;
    hold(w, 6, -15, 0);
    expect(w.uplink).toBeGreaterThan(u0);
    expect(w.fuel).toBeLessThan(f0);
    expect(f0 - w.fuel).toBeCloseTo((w.uplink - u0) * HUNGRY_FEED, 3);
    // dry: the charge waits and the HUD asks her to feed it
    w.fuel = 0;
    const held = w.uplink;
    hold(w, 3, -15, 0);
    expect(w.uplink).toBe(held);
    expect(w.uplinkBlock).toBe(STARVED);
    w.fuel = 30;
    hold(w, 2, -15, 0);
    expect(w.uplink).toBeGreaterThan(held);
  });
});

describe('the Free Ports’ relay', () => {
  /** Hold her near the mast, answering the pier's card with `pick`; other cards with their first answer. */
  function near(w: World, secs: number, pick: string): boolean {
    let asked = false;
    for (let i = 0; i < Math.round(secs / STEP); i++) {
      const m = relayOf(w.bk!)!;
      w.ship.invuln = 99; w.ship.x = m.x - 15; w.ship.z = m.z; w.ship.vx = w.ship.vz = 0;
      for (let k = w.aliens.length - 1; k >= 0; k--) if (!w.aliens[k]!.ward) w.aliens.splice(k, 1);
      w.step(STEP, NO); w.events.length = 0;
      if (w.comms?.def.id === 'story_mirren_relay') { asked = true; w.answer(pick); continue; }
      const open = w.comms ?? w.call; if (open) w.answer(open.def.choices[0]!.id);
    }
    return asked;
  }

  it('Mirren’s Pier: the locals ask her to leave it dark; woken, the gate opens on her key', () => {
    const w = stop('f_mirren', ['frag_witnesses', 'forty_held']);
    expect(w.bk!.def.twist).toBe('refused');
    hold(w, FLOOR.arrival + 0.5, -400, 0);
    expect(w.uplinkBlock).toBe('Hear the locals out first');
    expect(near(w, 60, 'wake')).toBe(true);
    expect(w.flags.has('relay_f_mirren')).toBe(true);
  });

  it('Mirren’s Pier: left dark, no relay to wake, the long way costs jump fluid, and the gate does not wait on it', () => {
    const w = stop('f_mirren', ['frag_witnesses', 'forty_held']);
    hold(w, FLOOR.arrival + 0.5, -400, 0);
    w.fuel = 30;
    expect(near(w, 40, 'dark')).toBe(true);
    expect(w.fuel).toBeLessThanOrEqual(24.01);
    expect(w.wakeRelay).toBeNull();
    hold(w, 20, -15, 0);
    expect(w.flags.has('relay_f_mirren')).toBe(false);
    expect(w.gateWhy).not.toBe('wake the relay');
  });
});

describe('the Hollows’ relay', () => {
  it('Hollowforge: drifting, it wakes quiet at half rate; flying, it wakes fast and draws Thren knots', () => {
    const w = stop('h_forge');
    expect(w.bk!.def.twist).toBe('loud');
    hold(w, FLOOR.arrival + 0.5, -300, 0);
    // quiet: still in the ring, no knots and half the rate
    const u0 = w.uplink;
    hold(w, 6, -15, 0);
    expect(w.quiet).toBe(true);
    expect(w.uplinkLine).toBe('Waking it quietly');
    const quiet = w.uplink - u0;
    expect(quiet).toBeGreaterThan(0);
    // loud: moving through the ring, the charge runs faster and the noise brings motes
    let motes = 0;
    const u1 = w.uplink;
    for (let i = 0; i < Math.round(10 / STEP); i++) {
      const m = relayOf(w.bk!)!;
      w.ship.invuln = 99; w.ship.x = m.x - 15; w.ship.z = m.z; w.ship.vx = 40; w.ship.vz = 0;
      w.step(STEP, NO);
      motes += w.aliens.filter((a) => a.variant === 'mote').length;
      w.events.length = 0;
      for (let k = w.aliens.length - 1; k >= 0; k--) if (!w.aliens[k]!.ward) w.aliens.splice(k, 1);
      const open = w.comms ?? w.call; if (open) w.answer(open.def.choices[0]!.id);
    }
    expect(w.uplinkLine).toBe('Waking it loud · the Thren hear');
    expect((w.uplink - u1) / 10).toBeGreaterThan((quiet / 6) * 1.5);
    expect(motes).toBeGreaterThan(0);
  });
});
