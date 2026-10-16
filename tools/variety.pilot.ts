import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { SITUATION_BY_ID } from '../src/content/situations';
import { regionOf, sysById } from '../src/sim/chart';
import { newJourney, options, sortieDef, type Journey } from '../src/sim/journey';
import { Rng } from '../src/sim/rng';
import { laySortie } from '../src/sim/sites';
import { Space } from '../src/sim/space';
import type { SortieDef } from '../src/sim/breakout';

// ── the variety report ────────────────────────────────────────────────────
// `npm run pilot:variety` walks whole eight-region journeys over the chart
// (no flying: the question is what each system asks, not how it ends), reads
// every sortie's definition and the space it is laid in, and writes
// docs/BALANCE-VARIETY.md: how many different experiences a journey meets and
// how often neighbours repeat. VARIETY_RUNS trades precision for speed.

const RUNS = Number(process.env.VARIETY_RUNS ?? 60);

/** What a sortie asks of the player, in one word: the goal's family, the place's event, or the plain crossing. */
export function objectiveOf(def: SortieDef): string {
  if (def.quiet) return 'quiet';
  const sit = def.situation ? SITUATION_BY_ID[def.situation] : null;
  if (sit) return `job:${sit.goal.kind}`;
  if (def.place) return `place:${def.place.plays}`;
  return 'crossing';
}

/** The sky it is laid in: the expanse and the features, read from the real Space the world would build. */
export function skyOf(def: SortieDef, seed: number): { expanse: string; features: string[] } {
  const space = new Space(seed + def.lane, { compose: false });
  laySortie(space, def, { x: 0, z: 0 }, { x: def.lane, z: 0 });
  return { expanse: space.expanses[0]?.def ?? 'none', features: space.features.map((f) => f.def).sort() };
}

const sigOf = (def: SortieDef, seed: number, holder: string): string => {
  const sky = skyOf(def, seed);
  return [objectiveOf(def), sky.expanse, sky.features.join('+') || '-', holder].join('|');
};

interface Step { region: number; kind: string; objective: string; expanse: string; features: string[]; holder: string; sig: string; quiet: boolean }

function walk(seed: number): Step[] {
  const j: Journey = newJourney(seed, false, 'eight');
  const rng = new Rng(seed ^ 0x77);
  const out: Step[] = [];
  let guard = 0;
  while (j.at !== j.chart.edge && guard++ < 160) {
    const col = sysById(j.chart, j.at).col;
    const onward = options(j).filter((o) => o.to.col > col);
    const lanes = onward.length ? onward : options(j);
    if (!lanes.length) break;
    // a player biased onward, not a straight line: any lane, the nearer the edge the likelier
    const pick = lanes[rng.int(lanes.length)]!;
    j.at = pick.to.id;
    const s = sysById(j.chart, j.at);
    if (s.kind === 'gate' || s.kind === 'edge') continue;
    const def = sortieDef(j);
    const sky = skyOf(def, seed);
    out.push({ region: regionOf(s), kind: s.kind, objective: objectiveOf(def), expanse: sky.expanse, features: sky.features, holder: s.holder, sig: sigOf(def, seed, s.holder), quiet: !!def.quiet });
  }
  return out;
}

/** The jobs that ask for effort: not a plain call, a reach, a follow or a watch. */
const HEAVY = new Set(['job:destroy', 'job:strike', 'job:defend', 'job:race', 'job:survey', 'job:sneak', 'job:recover']);
/** The longest run of consecutive heavy systems on a walk, breathers included (a breather breaks a run). */
const longestRun = (r: Step[]): number => { let best = 0, run = 0; for (const s of r) { run = HEAVY.has(s.objective) ? run + 1 : 0; best = Math.max(best, run); } return best; };

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n: number) => `${Math.round(n * 100)}%`;

it('walks whole journeys and measures their variety', { timeout: 600_000 }, () => {
  const runs: Step[][] = [];
  for (let i = 0; i < RUNS; i++) runs.push(walk(5000 + i * 17));
  const active = runs.map((r) => r.filter((s) => !s.quiet));
  // distinct signatures in the first 12 active systems, and over the whole walk
  const first12 = mean(active.map((r) => new Set(r.slice(0, 12).map((s) => s.sig)).size));
  const whole = mean(active.map((r) => new Set(r.map((s) => s.sig)).size / Math.max(1, r.length)));
  // the terrain a sortie shows (expanse + features) repeating within a window of 3 active systems
  let win = 0, winRep = 0, same = 0, pairs = 0, corridor = 0, acts = 0, featureful = 0;
  for (const r of active) {
    for (let i = 0; i < r.length; i++) {
      acts++;
      if (r[i]!.objective === 'crossing') corridor++;
      if (r[i]!.features.length) featureful++;
      if (i > 0) { pairs++; if (r[i]!.sig.split('|').slice(0, 3).join('|') === r[i - 1]!.sig.split('|').slice(0, 3).join('|')) same++; }
      if (i >= 2) { win++; const t = new Set(r.slice(i - 2, i + 1).map((s) => `${s.objective}|${s.expanse}`)); if (t.size < 3) winRep++; }
    }
  }
  const tally = (key: (s: Step) => string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const r of runs) for (const s of r) for (const k of key(s)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const table = (m: Map<string, number>, n = 40) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  const total = runs.reduce((a, r) => a + r.length, 0);
  // per region: expanse and feature mix
  const regionRows: string[] = [];
  for (let reg = 0; reg < 8; reg++) {
    const steps = runs.flatMap((r) => r.filter((s) => s.region === reg));
    if (!steps.length) continue;
    const ex = new Map<string, number>(), fe = new Map<string, number>(), ob = new Map<string, number>();
    for (const s of steps) { ex.set(s.expanse, (ex.get(s.expanse) ?? 0) + 1); ob.set(s.objective, (ob.get(s.objective) ?? 0) + 1); for (const f of s.features) fe.set(f, (fe.get(f) ?? 0) + 1); }
    const top = (m: Map<string, number>, k = 4) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, v]) => `${n} ${pct(v / steps.length)}`).join(', ');
    regionRows.push(`| ${reg + 1} | ${steps.length} | ${top(ex)} | ${top(fe, 5)} | ${top(ob, 4)} |`);
  }
  const md = `# Variety report

Generated by \`npm run pilot:variety\`: ${RUNS} eight-region journeys walked over the chart
(no flying), every sortie read as the world would build it. A signature is
objective, expanse, features and holder; a journey is "varied" when its
active (non-breather) systems do not repeat one.

| Measure | Value |
|---|---|
| Systems walked | ${total} (${pct(1 - acts / Math.max(1, total))} breathers) |
| Distinct signatures in the first 12 active systems | ${first12.toFixed(1)} of 12 |
| Distinct signatures over a whole journey, per active system | ${pct(whole)} |
| Neighbouring active systems with the same objective, expanse and features | ${pct(same / Math.max(1, pairs))} |
| Windows of 3 active systems repeating an objective and expanse | ${pct(winRep / Math.max(1, win))} |
| Active systems that are a plain crossing (no job, no place) | ${pct(corridor / Math.max(1, acts))} |
| Active systems with at least one feature in the sky | ${pct(featureful / Math.max(1, acts))} |
| Heavy jobs (destroy, strike, defend, race, survey, sneak, recover) | ${pct(runs.reduce((a, r) => a + r.filter((x) => HEAVY.has(x.objective)).length, 0) / Math.max(1, total))} of systems |
| Longest run of heavy systems in a row (mean, worst of ${RUNS}) | ${mean(runs.map(longestRun)).toFixed(1)}, ${Math.max(...runs.map(longestRun))} |

## By region

| Region | Systems | Expanses | Features | Objectives |
|---|---|---|---|---|
${regionRows.join('\n')}

## Expanses
| Expanse | Systems |
|---|---|
${table(tally((s) => [s.expanse]))}

## Features
| Feature | Systems |
|---|---|
${table(tally((s) => s.features))}

## Objectives
| Objective | Systems |
|---|---|
${table(tally((s) => [s.objective]))}
`;
  writeFileSync('docs/BALANCE-VARIETY.md', md);
  console.log(md.split('\n').slice(0, 20).join('\n'));
});
