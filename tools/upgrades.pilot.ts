import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { budgets } from '../src/sim/bay';
import { endSortie, hearNews, newJourney, plot, replot, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { flyWorld, type Policy, type Strategy } from './pilot';
import { planRoute } from './route';

// ── the upgrade economy's report ──────────────────────────────────────────
// `npm run pilot:upgrades` folds whole eight-region journeys into
// docs/BALANCE-UPGRADES.md: how much Cyrite is spare in each stretch of the
// chart, what the pilot builds with it, how the gauges stand, and what the
// journey costs a ship that builds nothing against one that keeps growing.
//
// One journey takes a long time, so they are flown in pieces:
//   UPG_OUT=dir UPG_POLICY=none|build UPG_SEED=n  flies one journey into dir
//   UPG_REPORT=dir                                folds every journey in dir into the report
// UPG_LEGS caps the systems flown; UPG_STRAT=random fits at random.

const OUT = process.env.UPG_OUT;
const REPORT = process.env.UPG_REPORT;
const POLICY = (process.env.UPG_POLICY ?? 'build') as 'none' | 'build';
const SEED = Number(process.env.UPG_SEED ?? 3000);
const MAX_LEGS = Number(process.env.UPG_LEGS ?? 140);
const STRATEGY: Strategy = process.env.UPG_STRAT === 'random' ? { kind: 'random' } : { kind: 'focus', branch: 'torpedo', second: 'defence' };
const ANSWERS: Policy = 'bluff';

interface Stop {
  n: number;
  /** The purse and the tank as the sortie ended, and the levels fitted by then. */
  purse: number;
  fuel: number;
  built: number;
  power: string;
  mass: string;
  heat: string;
  time: number;
  combat: number;
  platesLost: number;
  wrecked: boolean;
}

interface Saved { policy: string; seed: number; end: string | null; stops: Stop[] }

function fly(): Saved {
  const j: Journey = newJourney(SEED, false, 'eight');
  const stops: Stop[] = [];
  let n = 0;
  while (j.status !== 'over' && n < MAX_LEGS) {
    if (j.status === 'chart') plot(j, planRoute(j));
    const def = sortieDef(j);
    const w = new World(SEED * 31 + n * 7 + 1, { mode: 'breakout', sortie: def, carry: j.carry });
    const onDock = (w: World) => {
      if (w.carry().flags.includes('news')) hearNews(j);
      const was = j.dest, r = replot(j, planRoute(j, w.carry()));
      if (r && j.dest !== was) w.replot(r.dest, r.jumpCost);
    };
    const res = flyWorld(w, SEED * 31 + n, STRATEGY, { maxTime: 1200, breakout: true, policy: ANSWERS, onDock, noShop: POLICY === 'none' });
    if (w.phase !== 'over') break;
    const { use, cap } = budgets(w.levels);
    stops.push({
      n, purse: Math.round(w.cyrite), fuel: Math.round(w.fuel), built: Object.values(w.levels).reduce((a, b) => a + b, 0) - 1,
      power: `${use.power}/${cap.power}`, mass: `${use.mass}/${cap.mass}`, heat: `${use.heat}/${cap.heat}`,
      time: Math.round(w.runTime), combat: Math.round(res.combat), platesLost: w.run.platesLost, wrecked: !w.run.escaped,
    });
    endSortie(j, w.result());
    n++;
  }
  return { policy: POLICY, seed: SEED, end: j.end, stops };
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n: number) => `${Math.round(n * 100)}%`;

it('flies one journey, or folds the journeys flown into the report', { timeout: 7_200_000 }, () => {
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/${POLICY}-${SEED}.json`, JSON.stringify(fly()));
    return;
  }
  if (!REPORT) return;
  const runs: Saved[] = readdirSync(REPORT).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${REPORT}/${f}`, 'utf8')) as Saved);
  const policies = [...new Set(runs.map((r) => r.policy))];
  const bands = [[0, 9], [10, 19], [20, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 79], [80, 139]] as const;
  const rows: string[] = [];
  for (const p of policies) {
    const rs = runs.filter((r) => r.policy === p);
    for (const [lo, hi] of bands) {
      const st = rs.flatMap((r) => r.stops.filter((s) => s.n >= lo && s.n <= hi));
      if (!st.length) continue;
      // the purse's change from the stop before: what was spare (for "build", after the pilot spent)
      const per = rs.flatMap((r) => r.stops.filter((s) => s.n >= lo && s.n <= hi && s.n > 0).map((s) => s.purse - r.stops[s.n - 1]!.purse));
      rows.push(`| ${p} | ${lo + 1}-${Math.min(hi + 1, 99)} | ${rs.length} | ${mean(st.map((s) => s.purse)).toFixed(0)} | ${mean(per).toFixed(1)} | ${mean(st.map((s) => s.built)).toFixed(1)} | ${mean(st.map((s) => s.time)).toFixed(0)}s | ${pct(mean(st.map((s) => s.combat / Math.max(1, s.time))))} | ${mean(st.map((s) => s.platesLost)).toFixed(1)} | ${pct(st.filter((s) => s.wrecked).length / st.length)} |`);
    }
  }
  const ends = policies.map((p) => {
    const rs = runs.filter((r) => r.policy === p);
    return `| ${p} | ${rs.length} | ${rs.filter((r) => r.end === 'through').length} | ${rs.filter((r) => r.end === 'captured').length} | ${rs.filter((r) => r.end === 'wrecked').length} | ${mean(rs.map((r) => r.stops.length)).toFixed(1)} |`;
  });
  const last = runs.filter((r) => r.policy === 'build').map((r) => r.stops[r.stops.length - 1]).filter((s) => !!s);
  const md = `# Upgrade economy report

Generated by \`npm run pilot:upgrades\` (see tools/upgrades.pilot.ts): whole eight-region journeys flown by
the scripted pilot, one that fits parts at every work bay ("build") and one that fits none ("none").

## How the journeys ended

| Policy | Journeys | Through | Captured | Wrecked out | Systems flown |
|---|---|---|---|---|---|
${ends.join('\n')}

## Along the chart

Purse and parts at the end of each stretch of systems. "Spare a stop" is how much the purse grew from one stop to the next (for "build", after the pilot spent).

| Policy | Systems | Journeys | Purse | Spare a stop | Parts fitted | Sortie | In combat | Plates lost | Wrecked |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## The gauges at the end of "build"

| Journey | Power | Mass | Heat |
|---|---|---|---|
${last.map((s, i) => `| ${i + 1} | ${s!.power} | ${s!.mass} | ${s!.heat} |`).join('\n')}
`;
  writeFileSync(new URL('../docs/BALANCE-UPGRADES.md', import.meta.url), md);
});
