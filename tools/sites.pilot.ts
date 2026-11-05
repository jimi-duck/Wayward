import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { angleDelta, clamp } from '../src/core/math';
import { STEP } from '../src/core/loop';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import type { InputFrame } from '../src/input/types';

// ── the raider den and the Thren seed ─────────────────────────────────────
// `npm run pilot:sites` flies a plain ship at each in turn and writes docs/BALANCE-SITES.md.
// The raid stops when the den is first crushed (the second den is not chased). The ship is the stock hull with no upgrades: it turns to the site, closes to 70 units, and fires
// when it points at it (and at nothing else). It is a worst-case raid, not a good player: a human
// dodges, uses rock and picks the raiders off. Numbers tell the order of magnitude, not the feel.

const SEEDS = Number(process.env.SITES_SEEDS ?? 12);
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const blank = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

function level(seed: number, thren: number): World {
  const j = newJourney(seed);
  const def = { ...sortieDef(j), home: false, first: false, safe: false, situation: undefined, kind: 'mining' as const, thren };
  const w = new World(seed, { mode: 'breakout', sortie: def, carry: j.carry });
  w.skipTraining();
  return w;
}

/** Turn to a point, close to `hold` units, fire when pointing at it. */
function toward(w: World, x: number, z: number, hold: number, shoot: boolean): InputFrame {
  const s = w.ship, f = blank(), dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), off = angleDelta(s.heading, Math.atan2(-dz, dx));
  f.turn = clamp(-off * 4, -1, 1);
  f.thrust = d > hold ? (Math.abs(off) < 1.3 ? 0.8 : 0.25) : 0;
  f.fire = shoot && d < 180 && Math.abs(off) < 0.1;
  return f;
}

interface Raid { seconds: number; done: boolean; hull: number; died: boolean; waves: number; sent: number; moved: boolean }

/** The same ship flying the same raid with no den: how much the ordinary raiders of the system cost it. */
function baseline(seed: number): boolean {
  const w = level(seed, 0), d = w.den!;
  const at = { x: d.x, z: d.z };
  w.den = null;
  w.ship.x = at.x - 400; w.ship.z = at.z; w.ship.heading = 0;
  for (let i = 0; i < 60 * 150 && w.alive; i++) {
    const foe = w.aliens.filter((a) => !a.ward && Math.hypot(a.x - w.ship.x, a.z - w.ship.z) < 140).sort((a, b) => Math.hypot(a.x - w.ship.x, a.z - w.ship.z) - Math.hypot(b.x - w.ship.x, b.z - w.ship.z))[0];
    w.step(STEP, foe ? toward(w, foe.x, foe.z, 50, true) : toward(w, at.x, at.z, 70, false));
    w.drain();
  }
  return !w.alive;
}

function raid(seed: number): Raid {
  const w = level(seed, 0), d = w.den!;
  const start = w.plates;
  let sent = 0, seen = new Set<number>();
  w.ship.x = d.x - 400; w.ship.z = d.z; w.ship.heading = 0;
  for (let i = 0; i < 60 * 150 && w.alive && d.state !== 'dead' && !d.moved; i++) {
    w.ship.invuln = Math.max(0, w.ship.invuln);
    // raiders first, when one is close; the den when none is
    const foe = w.aliens.filter((a) => !a.ward && Math.hypot(a.x - w.ship.x, a.z - w.ship.z) < 140).sort((a, b) => Math.hypot(a.x - w.ship.x, a.z - w.ship.z) - Math.hypot(b.x - w.ship.x, b.z - w.ship.z))[0];
    w.step(STEP, foe ? toward(w, foe.x, foe.z, 50, true) : toward(w, d.x, d.z, 70, true));
    for (const id of d.sent) if (!seen.has(id)) { seen.add(id); sent++; }
    w.drain();
  }
  return { seconds: Math.round(w.runTime), done: d.state === 'dead', hull: start - w.plates, died: !w.alive, waves: d.waves, sent, moved: d.moved };
}

interface Study { studied: boolean; seconds: number; died: boolean; mote: number }

function study(seed: number): Study {
  const w = level(seed, 0.6), d = w.thrSeed!;
  let mote = 0;
  w.ship.x = d.x - 300; w.ship.z = d.z; w.ship.heading = 0;
  for (let i = 0; i < 60 * 120 && w.alive && d.state !== 'studied'; i++) { w.step(STEP, toward(w, d.x, d.z, 20, false)); w.drain(); }
  mote = d.sent.size;
  return { studied: d.state === 'studied', seconds: Math.round(w.runTime), died: !w.alive, mote };
}

function burn(seed: number): { motes: number; died: boolean; clean: boolean } {
  const w = level(seed, 0.6), d = w.thrSeed!;
  w.ship.x = d.x - 300; w.ship.z = d.z; w.ship.heading = 0;
  const young = d.growth < 0.5;
  let motes = 0; const seen = new Set<number>();
  for (let i = 0; i < 60 * 180 && w.alive && d.state !== 'dead'; i++) {
    const foe = w.aliens.filter((a) => !a.ward && Math.hypot(a.x - w.ship.x, a.z - w.ship.z) < 100).sort((a, b) => Math.hypot(a.x - w.ship.x, a.z - w.ship.z) - Math.hypot(b.x - w.ship.x, b.z - w.ship.z))[0];
    w.step(STEP, foe ? toward(w, foe.x, foe.z, 40, true) : toward(w, d.x, d.z, 60, true));
    for (const id of d.sent) if (!seen.has(id)) { seen.add(id); motes++; }
    w.drain();
  }
  return { motes, died: !w.alive, clean: young };
}

it('reports the sites', { timeout: 3_600_000 }, () => {
  const R = Array.from({ length: SEEDS }, (_, i) => raid(i + 1));
  const base = Array.from({ length: SEEDS }, (_, i) => baseline(i + 1));
  const S = Array.from({ length: SEEDS }, (_, i) => study(i + 1));
  const B = Array.from({ length: SEEDS }, (_, i) => burn(i + 1));
  const p = (n: number, of: number) => `${n}/${of}`;
  const md = `# BALANCE-SITES

Written by \`npm run pilot:sites\` (${SEEDS} seeds). A plain stock hull, no upgrades, shoots the nearest raider within 140 units, otherwise closes to 70 units and shoots the site. A worst-case raid: a player dodges, uses rock, picks raiders off. Orders of magnitude, not feel.

## Raider den

| | |
|---|---|
| crushed (killed, or run to its second den) within 150 s | ${p(R.filter((r) => r.done || r.moved).length, SEEDS)} |
| ship lost | ${p(R.filter((r) => r.died).length, SEEDS)} (same ship, no den, 150 s of the same flight: ${p(base.filter(Boolean).length, SEEDS)}) |
| of those, ran to its second den | ${p(R.filter((r) => r.moved).length, SEEDS)} |
| time to crush it (s, mean of those that did) | ${Math.round(mean(R.filter((r) => r.done || r.moved).map((r) => r.seconds)))} |
| plates lost (mean) | ${mean(R.map((r) => r.hull)).toFixed(1)} |
| raiders sent (mean) | ${mean(R.map((r) => r.sent)).toFixed(1)} |

## Thren seed

| | |
|---|---|
| studied (still beside it) | ${p(S.filter((s) => s.studied).length, SEEDS)} in a mean ${Math.round(mean(S.map((s) => s.seconds)))} s |
| ship lost while studying | ${p(S.filter((s) => s.died).length, SEEDS)} |
| burned: ship lost | ${p(B.filter((b) => b.died).length, SEEDS)} |
| burned: motes it answered with (mean) | ${mean(B.map((b) => b.motes)).toFixed(1)} |
`;
  writeFileSync('docs/BALANCE-SITES.md', md);
  console.log(md);
});
