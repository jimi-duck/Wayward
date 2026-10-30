import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { blockOf, budgets, cost, reachable } from '../src/sim/bay';
import { UPGRADE } from '../src/content/upgrades';
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
const ECONOMY = process.env.UPG_ECONOMY;
const POLICY = (process.env.UPG_POLICY ?? 'build') as 'none' | 'build';
const SEED = Number(process.env.UPG_SEED ?? 3000);
const MAX_LEGS = Number(process.env.UPG_LEGS ?? 140);
const STRAT = process.env.UPG_STRAT ?? 'wide';
// 'economy' pours Cyrite into the utility branch (tractor, matrix, prospector) and keeps a laser to fight with; 'combat' into lasers and torpedoes
const STRATEGY: Strategy = STRAT === 'economy' ? { kind: 'focus', branch: 'utility', second: 'defence' } : STRAT === 'combat' ? { kind: 'focus', branch: 'laser', second: 'torpedo' } : process.env.UPG_STRAT === 'random' ? { kind: 'random' } : process.env.UPG_STRAT === 'focus' ? { kind: 'focus', branch: 'torpedo', second: 'defence' } : { kind: 'wide' };
/** The yard's modules the build wants, most wanted first. */
const MODULES_WANTED = ['md_plate', 'md_projector', 'md_hardpoints', 'md_gunnery', 'md_capacitor', 'md_tractor', 'md_plate', 'md_projector'];
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
  levels: Record<string, number>;
  /** Cyrite earned this sortie, and what the next meaningful (tier 2 or deeper) level costs at its end. */
  earned: number;
  nextCost: number;
}

interface Saved { policy: string; strat?: string; seed: number; end: string | null; stops: Stop[] }

/** The cheapest next level among nodes of tier 2 or deeper that could be fitted were the Cyrite there. */
function nextMeaningful(w: World): number {
  const ctx = w.bayCtx();
  const open = reachable({ ...ctx, docked: true }).filter((n) => n.tier >= 2 && !n.id.startsWith('rx_') && !n.id.startsWith('hl_'));
  return open.length ? Math.min(...open.map((n) => cost(n.id, (w.levels[n.id] ?? 0) + 1, false, w.levels))) : 0;
}

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
    const res = flyWorld(w, SEED * 31 + n, STRATEGY, { maxTime: 1200, breakout: true, policy: ANSWERS, onDock, noShop: POLICY === 'none', modules: MODULES_WANTED });
    if (w.phase !== 'over') break;
    const { use, cap } = budgets(w.levels);
    stops.push({
      n, purse: Math.round(w.cyrite), fuel: Math.round(w.fuel), built: Object.values(w.levels).reduce((a, b) => a + b, 0) - 1,
      power: `${use.power}/${cap.power}`, mass: `${use.mass}/${cap.mass}`, heat: `${use.heat}/${cap.heat}`,
      time: Math.round(w.runTime), combat: Math.round(res.combat), platesLost: w.run.platesLost, wrecked: !w.run.escaped, levels: { ...w.levels },
      earned: Math.round(w.run.cyrite), nextCost: nextMeaningful(w),
    });
    endSortie(j, w.result());
    n++;
  }
  return { policy: POLICY, strat: STRAT, seed: SEED, end: j.end, stops };
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n: number) => `${Math.round(n * 100)}%`;

it('flies one journey, or folds the journeys flown into the report', { timeout: 7_200_000 }, () => {
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/${POLICY}-${STRAT}-${SEED}.json`, JSON.stringify(fly()));
    return;
  }
  if (ECONOMY) return foldEconomy(ECONOMY);
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

Read it as a shape, not a verdict. The pilot dodges better than most people and does not chase jobs (their pay is on top of
what is spare here); its "build" fits what a torpedo-and-defence ship wants, spreading over its parts, so late in the
chart it has fitted what it wants and the purse piles up. The hulls grow tougher with depth (\`threatAt\`, 1 to 5).

## Before and after

Same four journeys (seeds 3000, 3013, 3026, 3039), the same wide build. "Before" is the old economy (flat tier prices, levels
capped, hulls the same everywhere); "after" is this one (prices climb, no top level, hulls toughen to 8x, jobs pay up to 2.5x).

| | Before | After |
|---|---|---|
| Parts fitted by stop 10 / 20 / 30 / 60 | 7.5 / 18.5 / 22.5 / 25 (then flat) | 2.3 / 6 / 13 / 31, still 42 at the end |
| Purse at stop 20 / 30 / 60 | 208 / 678 / 999 (the cap) | 71 / 86 / 111 |
| Purse at the end (stops 61+) | 999 | 420 to 690 |
| In combat late (stops 61+) | 6 to 16% | 40 to 47% |
| Plates lost a late sortie | about 0 | 1.0 to 1.6 |
| A fitted ship gets through | 4 of 4 | 4 of 4 |
| A ship that fits nothing gets through | not flown | 0 of 4 (2 wrecked out, 2 captured) |

The purse that remains late is what is left after the pilot has bought everything it wants; it does not chase jobs, and
it stops buying a ladder when the next level is dearer than it likes. A player has no such list.

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

// ── the economy comparison ────────────────────────────────────────────────
// `UPG_ECONOMY=dir` folds the "build" journeys flown with UPG_STRAT=economy and UPG_STRAT=combat into docs/BALANCE-ECONOMY.md.

const ECON_IDS = new Set(['ut_tractor', 'ut_matrix', 'ut_prospector', 'ut_salvager', 'ut_scanner', 'ut_tactical', 'md_tractor']);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function foldEconomy(dir: string): void {
  const runs = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Saved).filter((r) => r.policy === 'build');
  const strats = [...new Set(runs.map((r) => r.strat ?? 'wide'))].sort();
  const bands = [[0, 9], [10, 19], [20, 29], [30, 39], [40, 49], [50, 59], [60, 69]] as const;
  const econLv = (s: Stop) => sum(Object.entries(s.levels).filter(([id]) => ECON_IDS.has(id) && UPGRADE[id]).map(([, v]) => v));
  const fightLv = (s: Stop) => sum(Object.entries(s.levels).filter(([id]) => UPGRADE[id] && !ECON_IDS.has(id) && ['weapons', 'defence'].includes(UPGRADE[id]!.cat)).map(([, v]) => v));
  const rows: string[] = [], ends: string[] = [];
  for (const st of strats) {
    const rs = runs.filter((r) => (r.strat ?? 'wide') === st);
    ends.push(`| ${st} | ${rs.length} | ${rs.filter((r) => r.end === 'through').length} | ${rs.filter((r) => r.end === 'captured').length} | ${rs.filter((r) => r.end === 'wrecked').length} | ${mean(rs.map((r) => r.stops.length)).toFixed(1)} |`);
    for (const [lo, hi] of bands) {
      const stops = rs.flatMap((r) => r.stops.filter((s) => s.n >= lo && s.n <= hi));
      if (!stops.length) continue;
      const earned = mean(stops.map((s) => s.earned)), perMin = mean(stops.map((s) => (s.earned / Math.max(1, s.time)) * 60));
      const toNext = mean(stops.filter((s) => s.nextCost > 0).map((s) => s.nextCost / Math.max(1, s.earned)));
      rows.push(`| ${st} | ${lo + 1}-${hi + 1} | ${earned.toFixed(0)} | ${perMin.toFixed(1)} | ${toNext.toFixed(1)} | ${mean(stops.map(econLv)).toFixed(1)} | ${mean(stops.map(fightLv)).toFixed(1)} | ${mean(stops.map((s) => s.platesLost)).toFixed(1)} | ${pct(stops.filter((s) => s.wrecked).length / stops.length)} |`);
    }
  }
  const md = `# Economy report: economy-first against combat-first

Generated by \`UPG_ECONOMY=dir npx vitest run --config tools/vitest.config.ts tools/upgrades.pilot.ts\` from journeys flown with
\`UPG_STRAT=economy\` (utility first: tractor, matrix, prospector, with a laser and some defence) and \`UPG_STRAT=combat\`
(lasers, then torpedoes). The same four seeds each, "build" policy, the first 70 systems. The pilot does not chase jobs.

Read it as a shape, not a verdict: four journeys a side, a scripted pilot that dodges better than most people.

## How the journeys ended

| Build | Journeys | Through | Captured | Wrecked out | Systems flown |
|---|---|---|---|---|---|
${ends.join('\n')}

## Along the chart

"Earned" is Cyrite picked up in a sortie (rock and wreck drops; the tank is topped up from it first). "Stops to the next upgrade" is the cheapest tier-2-or-deeper level on
offer divided by what one sortie earns: how many sorties of saving it takes. "Economy" and "fight" are levels fitted by the end
of the stretch, in the utility branch and in the weapons and defence branches.

| Build | Systems | Earned a sortie | Earned a minute | Stops to the next upgrade | Economy levels | Fight levels | Plates lost | Wrecked |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
  writeFileSync('docs/BALANCE-ECONOMY.md', md);
}
