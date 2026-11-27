import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { endSortie, newJourney, plot, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { flySteps, type Strategy } from './pilot';
import { planRoute } from './route';

// ── the simulation's fingerprint ──────────────────────────────────────────
// `npm run pilot:fingerprint` flies the scripted pilot through the first legs of the Story road and a few Arcade runs,
// and hashes what the world is (the ship, every hull, every card and event) once a second of game time. A change that
// only moves code (splitting World, say) must leave every hash as it was: run this before and after and compare
// FINGERPRINT_OUT (default fingerprint.txt). It is not a balance report: one changed number anywhere changes a hash.

const OUT = process.env.FINGERPRINT_OUT ?? 'fingerprint.txt';
const LEGS = Number(process.env.FINGERPRINT_LEGS ?? 4);
const STRAT: Strategy = { kind: 'random' };

/** What the world is, as plain numbers and names (rounded so float printing never differs). */
function state(w: World): unknown {
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return {
    t: r(w.runTime), phase: w.phase, alive: w.alive, chits: r(w.chits), fuel: r(w.fuel),
    ship: [r(w.ship.x), r(w.ship.z), r(w.ship.vx), r(w.ship.vz), r(w.ship.heading)],
    aliens: w.aliens.map((a) => [a.id, a.kind, r(a.x), r(a.z), r(a.hp)]),
    flags: [...w.flags].sort(), comms: w.comms?.def.id ?? null,
  };
}

it('fingerprints the simulation', { timeout: 3_600_000 }, () => {
  const lines: string[] = [];
  const hash = (s: unknown) => createHash('sha1').update(JSON.stringify(s)).digest('hex').slice(0, 12);
  const fly = (w: World, seed: number, tag: string, breakout: boolean) => {
    let n = 0, h = '';
    // the pilot drains each step's events: they are hashed as it hands them on
    const g = flySteps(w, seed, STRAT, { breakout, maxTime: 600, watch: (_, evs) => { if (evs.length) h = hash([h, evs]); } });
    for (;;) {
      const s = g.next();
      if (++n % 60 === 0) lines.push(`${tag} ${n / 60}s ${hash([h, state(w)])}`);
      if (s.done) { lines.push(`${tag} end ${hash([h, state(w), s.value])}`); return s.value; }
    }
  };
  for (const seed of [11, 23]) {
    const j = newJourney(seed, false, 'road');
    for (let leg = 0; leg < LEGS && j.status !== 'over'; leg++) {
      if (j.status === 'chart') plot(j, planRoute(j));
      const w = new World(seed * 31 + leg * 7 + 1, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
      fly(w, seed, `road${seed}.${leg}`, true);
      if (w.phase !== 'over') break;
      endSortie(j, w.result());
    }
    lines.push(`road${seed} journey ${hash(j)}`);
  }
  for (const seed of [5, 9]) fly(new World(seed, { mode: 'arcade' }), seed, `arcade${seed}`, false);
  writeFileSync(OUT, lines.join('\n') + '\n');
});
