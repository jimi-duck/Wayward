import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { regionOf, sysById, viewOf } from '../src/sim/chart';
import { DAY_SECONDS, daysUntil, halfDays } from '../src/sim/hunt';
import { endSortie, newJourney, plot, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { SCRIPT } from '../src/content/script';
import { flyWorld, stratName, type Policy, type Strategy } from './pilot';
import { planRoute } from './route';

// ── the Warden's Road balance report ──────────────────────────────────────
// `npm run pilot:road` flies the Reach slice (behind `?road`): from Cerro through
// the audit dock's system and the eight stops to the Narrows, with the same
// scripted pilot as the journey report. It writes docs/BALANCE-ROAD.md: the
// minutes at each stop and for the whole leg (the target is about 40), Cyrite and
// jump fluid in and out, the pursuit in days at each arrival and as each stop is
// left, and how many of the script's rows played and how many were carried.
// ROAD_RUNS trades precision for speed.

const RUNS = Number(process.env.ROAD_RUNS ?? 6);
const STRATEGIES: Strategy[] = [{ kind: 'random' }, { kind: 'focus', branch: 'torpedo', second: 'defence' }];
const POLICIES: Policy[] = ['run', 'bluff', 'fight'];
const MAX_LEGS = 14;

interface StopRun { name: string; stop: string; time: number; cyriteIn: number; cyriteOut: number; fuelIn: number; fuelOut: number; daysIn: number; daysOut: number; played: number; carried: number; ended: string }
interface Run { j: Journey; stops: StopRun[]; reached: boolean; stuck: boolean }

function fly(seed: number, strat: Strategy, policy: Policy): Run {
  const j = newJourney(seed, false, 'road');
  const run: Run = { j, stops: [], reached: false, stuck: false };
  let n = 0;
  while (j.status !== 'over' && n < MAX_LEGS) {
    if (j.status === 'chart') plot(j, planRoute(j));
    const here = sysById(j.chart, j.at);
    // the Narrows, the gate out of the Reach, is the end of the slice
    if (here.kind === 'gate' && regionOf(here) === 0 && viewOf(j.chart, j.at) >= 1 && n > 0 && run.stops.at(-1)?.stop === 'narrows') break;
    const def = sortieDef(j);
    const w = new World(seed * 31 + n * 7 + 1, { mode: 'breakout', sortie: def, carry: j.carry });
    const cyriteIn = w.chits, fuelIn = w.fuel;
    const daysIn = Math.max(0, halfDays(daysUntil(j.hunt, j.chart, j.trail)));
    const seenBefore = new Set(j.carry.seen);
    const res = flyWorld(w, seed * 31 + n, strat, { maxTime: 1200, breakout: true, policy });
    void res;
    if (w.phase !== 'over') { run.stuck = true; }
    const c = w.carry();
    const rows = SCRIPT.filter((r) => r.stop === def.script || r.stop === '*');
    run.stops.push({
      name: def.name, stop: def.script ?? '—', time: w.runTime, cyriteIn, cyriteOut: c.cyrite, fuelIn, fuelOut: c.fuel, daysIn,
      daysOut: Math.max(0, halfDays((def.calloway ?? Infinity) / DAY_SECONDS - w.runTime / DAY_SECONDS)), played: rows.filter((r) => c.seen.includes(r.id) && !seenBefore.has(r.id)).length,
      carried: c.pending?.length ?? 0, ended: w.alive ? 'jumped' : 'destroyed',
    });
    if (run.stuck) break;
    endSortie(j, w.result());
    if (def.script === 'narrows') { run.reached = true; break; }
    n++;
  }
  return run;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mmss = (s: number) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };
/** Days as the report reads them: none at a breather, where no pursuit runs. */
const days = (a: number[]) => { const v = a.filter((x) => Number.isFinite(x)); return v.length ? mean(v).toFixed(1) : '—'; };
const pct = (n: number) => `${Math.round(n * 100)}%`;

it('flies the Reach', { timeout: 7_200_000 }, () => {
  const all: Array<Run & { strat: string; policy: Policy }> = [];
  const rows: string[] = [];
  for (const strat of STRATEGIES) for (const policy of POLICIES) {
    const res: Run[] = [];
    for (let i = 0; i < RUNS; i++) res.push(fly(3000 + i * 13, strat, policy));
    all.push(...res.map((r) => ({ ...r, strat: stratName(strat), policy })));
    const through = res.filter((r) => r.reached);
    rows.push(`| ${stratName(strat)} | ${policy} | ${through.length}/${res.length} | ${res.filter((r) => r.stuck).length} | ${mean(res.map((r) => r.stops.reduce((a, s) => a + s.time, 0))) ? mmss(mean(res.map((r) => r.stops.reduce((a, s) => a + s.time, 0)))) : '—'} | ${mean(res.map((r) => r.j.wrecks)).toFixed(1)} |`);
  }
  const names = [...new Set(all.flatMap((r) => r.stops.map((s) => s.name)))];
  const stopRows = names.map((nm) => {
    const v = all.flatMap((r) => r.stops.filter((s) => s.name === nm));
    return `| ${nm} | ${v.length} | ${mmss(mean(v.map((s) => s.time)))} | ${mean(v.map((s) => s.cyriteIn)).toFixed(1)} → ${mean(v.map((s) => s.cyriteOut)).toFixed(1)} | ${mean(v.map((s) => s.fuelIn)).toFixed(1)} → ${mean(v.map((s) => s.fuelOut)).toFixed(1)} | ${days(v.map((s) => s.daysIn))} → ${days(v.map((s) => s.daysOut))} | ${mean(v.map((s) => s.played)).toFixed(1)} | ${mean(v.map((s) => s.carried)).toFixed(1)} | ${pct(v.filter((s) => s.ended === 'destroyed').length / v.length)} |`;
  });
  const total = all.filter((r) => r.reached).map((r) => r.stops.reduce((a, s) => a + s.time, 0));
  const md = `# The Warden's Road: Reach balance report

Generated by \`npm run pilot:road\`: the scripted pilot flew ${all.length} journeys of the Reach
slice (${RUNS} ${RUNS === 1 ? 'seed' : 'seeds'} per strategy and policy) behind \`?road\`, from Cerro to the Narrows, answering every card by one
policy. It flies each stop as it flies the Breakout and jumps as soon as the tank holds the jump, so it is a
pilot who keeps moving; it does not read, and it does not linger. These are pilot numbers, not playtests.

## How far it gets

| Strategy | Policy | At the Narrows | Stuck | Time on the road | Wrecks |
|---|---|---|---|---|---|
${rows.join('\n')}

Whole leg, those that arrived (${total.length}): ${total.length ? mmss(mean(total)) : '—'} on average, against a target of about 40 minutes.

## Stop by stop

"Days" is the pursuit counted in days (it starts a leg at 2, amber at 1, red at 0.5): at arrival, then as the stop was left.
"Rows" is the script's rows played at the stop, and "carried" the rows still waiting when the pilot jumped.

| Stop | Visits | Time | Cyrite in → out | Jump fluid in → out | Days | Rows | Carried | Wrecked |
|---|---|---|---|---|---|---|---|---|
${stopRows.join('\n')}
`;
  writeFileSync(new URL('../docs/BALANCE-ROAD.md', import.meta.url), md);
});
