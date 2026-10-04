import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { STEP } from '../src/core/loop';
import { HULL } from '../src/content/hulls';
import { newShip, stepShip, topSpeed } from '../src/sim/ship';
import { BASE, flightHull } from '../src/sim/stats';
import { fireWeapons, newArms, NO_FIRE_MODS, type Bolt } from '../src/sim/weapons';
import type { FlightControls } from '../src/sim/controls';
import { fly, type Strategy } from './pilot';

// ── the feel report ───────────────────────────────────────────────────────
// `npm run pilot:feel` measures moment-to-moment play in numbers: how the
// hull accelerates, turns and coasts, what the laser does on a held trigger,
// and, from the scripted pilot's arcade runs, how long fights take and how
// often the ship is hit. Writes docs/FEEL.md.

const RUNS = Number(process.env.PILOT_RUNS ?? 8);
const MAX = Number(process.env.PILOT_TIME ?? 360);

const IDLE: FlightControls = { turn: 0, thrust: 0, roll: false, rollDir: 0, fire: false, torpedo: false, cut: false };
const f1 = (n: number) => n.toFixed(1), f2 = (n: number) => n.toFixed(2);
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)]! : 0; };

/** Handling, measured by flying the model, not read off the constants. */
export function handling() {
  const hull = flightHull({ ...BASE });
  const top = topSpeed(hull);
  const s = newShip();
  let t = 0, t50 = 0, t90 = 0;
  while (t < 5) {
    stepShip(s, { ...IDLE, thrust: 1 }, hull, STEP); t += STEP;
    const v = Math.hypot(s.vx, s.vz);
    if (!t50 && v >= top * 0.5) t50 = t;
    if (!t90 && v >= top * 0.9) t90 = t;
  }
  // let go at top speed: how far and how long it carries
  const x0 = s.x, z0 = s.z; let tc = 0;
  while (Math.hypot(s.vx, s.vz) > top * 0.1 && tc < 10) { stepShip(s, IDLE, hull, STEP); tc += STEP; }
  const coast = Math.hypot(s.x - x0, s.z - z0);
  // a half turn from rest, and the circle flown at full throttle and full helm
  const r = newShip(); let tt = 0;
  while (Math.abs(r.heading - Math.PI / 2) < Math.PI && tt < 5) { stepShip(r, { ...IDLE, turn: 1 }, hull, STEP); tt += STEP; }
  const c = newShip();
  for (let i = 0; i < 300; i++) stepShip(c, { ...IDLE, thrust: 1 }, hull, STEP);
  let tr = 0, minX = Infinity, maxX = -Infinity; const h0 = c.heading;
  while (Math.abs(c.heading - h0) < Math.PI * 2 && tr < 10) {
    stepShip(c, { ...IDLE, thrust: 1, turn: 1 }, hull, STEP); tr += STEP;
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
  }
  // a roll at top speed: how far across it carries
  const rl = newShip();
  for (let i = 0; i < 300; i++) stepShip(rl, { ...IDLE, thrust: 1 }, hull, STEP);
  const side0 = { x: rl.x, z: rl.z, h: rl.heading };
  stepShip(rl, { ...IDLE, thrust: 1, roll: true, rollDir: 1 }, hull, STEP);
  for (let i = 0; i < 40; i++) stepShip(rl, { ...IDLE, thrust: 1 }, hull, STEP);
  const dx = rl.x - side0.x, dz = rl.z - side0.z;
  const across = Math.abs(dx * Math.sin(side0.h) + dz * Math.cos(side0.h));
  return { top, t50, t90, coastT: tc, coast, halfTurn: tt, circleT: tr, circleD: maxX - minX, rollAcross: across };
}

/** The laser on a held trigger: shots and damage in each second of ten. */
export function laserHold(seconds = 10) {
  const st = { ...BASE };
  const arms = newArms(st), ship = newShip(), bolts: Bolt[] = [];
  const perSec: number[] = [];
  let t = 0;
  while (t < seconds) {
    const before = bolts.length;
    fireWeapons(arms, ship, { ...IDLE, fire: true }, { ships: [], boss: null, rocks: [] }, st, NO_FIRE_MODS, bolts, [], [], STEP);
    const sec = Math.floor(t);
    perSec[sec] = (perSec[sec] ?? 0) + (bolts.length - before);
    t += STEP;
  }
  return { perSec, dps: perSec.map((n) => n * st.laserDamage) };
}

export interface Fights {
  shots: number; hits: number; evades: number; kills: number;
  ttk: Record<string, number[]>;
  hitsTaken: number; shieldHits: number; time: number;
  gaps: number[]; firstHit: number[];
  killGaps: number[];
}

/** The scripted pilot's arcade runs, watched for the fights. */
export function fights(runs = RUNS, maxTime = MAX, strategy: Strategy = { kind: 'random' }): Fights {
  const f: Fights = { shots: 0, hits: 0, evades: 0, kills: 0, ttk: {}, hitsTaken: 0, shieldHits: 0, time: 0, gaps: [], firstHit: [], killGaps: [] };
  for (let i = 0; i < runs; i++) {
    const seen = new Map<number, { kind: string; first: number }>();
    let lastHit = -1, lastKill = -1;
    const res = fly(2000 + i * 13, strategy, {
      maxTime,
      watch: (w, evs) => {
        const live = new Set(w.aliens.map((a) => a.id));
        for (const ev of evs) {
          if (ev.type === 'bolt') f.shots++;
          if (ev.type === 'alienHit') {
            f.hits++;
            if (!seen.has(ev.id)) seen.set(ev.id, { kind: w.aliens.find((a) => a.id === ev.id)?.kind ?? 'one-hit kills', first: w.runTime });
          }
          if (ev.type === 'evade') f.evades++;
          if (ev.type === 'shipHit' || ev.type === 'shieldHit') {
            if (ev.type === 'shieldHit') f.shieldHits++; else f.hitsTaken++;
            if (lastHit < 0) f.firstHit.push(w.runTime); else f.gaps.push(w.runTime - lastHit);
            lastHit = w.runTime;
          }
          if (ev.type === 'alienDestroyed') {
            f.kills++;
            if (lastKill >= 0) f.killGaps.push(w.runTime - lastKill);
            lastKill = w.runTime;
          }
        }
        for (const [id, e] of seen) {
          if (live.has(id)) continue;
          (f.ttk[e.kind] ??= []).push(w.runTime - e.first);
          seen.delete(id);
        }
      },
    });
    f.time += res.run.time;
  }
  return f;
}

export function report(): string {
  const h = handling(), l = laserHold(), fx = fights();
  const mins = fx.time / 60;
  const lines = [
    '# Feel report',
    '',
    'Generated by `npm run pilot:feel`. Handling and the laser are measured by',
    `flying the model; fights come from the scripted pilot's arcade runs (${RUNS} runs, up to ${MAX}s, random builds).`,
    '',
    '## Handling (stock hull)',
    '',
    '| Measure | Value |',
    '|---|---|',
    `| Top speed | ${f1(h.top)} u/s |`,
    `| Rest to half / 90% speed | ${f2(h.t50)}s / ${f2(h.t90)}s |`,
    `| Let go at top speed: carries | ${f1(h.coast)} u over ${f2(h.coastT)}s (to 10%) |`,
    `| Half turn from rest | ${f2(h.halfTurn)}s |`,
    `| Full circle at full throttle | ${f2(h.circleT)}s, ${f1(h.circleD)} u across |`,
    `| Barrel roll at speed: sideways | ${f1(h.rollAcross)} u |`,
    '',
    '## Laser on a held trigger (stock)',
    '',
    '| Second | ' + l.perSec.map((_, i) => i + 1).join(' | ') + ' |',
    '|---|' + l.perSec.map(() => '---').join('|') + '|',
    '| Shots | ' + l.perSec.join(' | ') + ' |',
    '| Damage | ' + l.dps.map(f1).join(' | ') + ' |',
    '',
    '## Fights (scripted pilot, arcade)',
    '',
    '| Measure | Value |',
    '|---|---|',
    `| Lances fired per minute | ${f1(fx.shots / mins)} |`,
    `| Hull hits per lance (accuracy) | ${Math.round((fx.hits / Math.max(1, fx.shots)) * 100)}% |`,
    `| Jinks per minute | ${f1(fx.evades / mins)} |`,
    `| Kills per minute | ${f1(fx.kills / mins)} |`,
    `| Median seconds between kills | ${f1(median(fx.killGaps))} |`,
    `| Hits taken per minute (plates / shields) | ${f2(fx.hitsTaken / mins)} / ${f2(fx.shieldHits / mins)} |`,
    `| First hit taken at (median) | ${f1(median(fx.firstHit))}s |`,
    `| Median seconds between hits taken | ${f1(median(fx.gaps))} |`,
    '',
    '### Time to kill, from first hit to dead',
    '',
    '| Hull | Kills | Median | Mean |',
    '|---|---|---|---|',
    ...Object.entries(fx.ttk).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `| ${k} | ${v.length} | ${f1(median(v))}s | ${f1(mean(v))}s |`),
    '',
    `Stock hull: ${HULL.name}, thrust ${HULL.thrust}, turn ${HULL.rot}, drag ${HULL.drag}, grip ${HULL.grip}.`,
    '',
  ];
  return lines.join('\n');
}

it('measures the feel', { timeout: 3_600_000 }, () => {
  const out = report();
  writeFileSync(new URL('../docs/FEEL.md', import.meta.url), out);
  console.log(out);
});
