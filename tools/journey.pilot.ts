import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { netted, sysById } from '../src/sim/chart';
import { behind } from '../src/sim/hunt';
import { OFFERS } from '../src/content/calloway';
import { endSortie, hearNews, newJourney, plot, replot, sortieDef, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { flyWorld, stratName, type Policy, type Strategy } from './pilot';
import { planRoute } from './route';

// ── the journey's balance report ──────────────────────────────────────────
// `npm run pilot:journey` flies whole journeys: the Breakout, then system
// after system across the chart, plotting each jump with a simple route
// planner, until the Threshold, a capture or the third wreck. It writes
// docs/BALANCE-JOURNEY.md: how far journeys get and why they end, the
// Krail curve, the days, the Net, how often Calloway catches up, and what
// her file on you comes to (her offers, the tricks she learns, the last meeting).
// JOURNEY_RUNS trades precision for speed.

const RUNS = Number(process.env.JOURNEY_RUNS ?? 8);
const MAX_LEGS = 24;

const STRATEGIES: Strategy[] = [
  { kind: 'random' },
  { kind: 'focus', branch: 'torpedo', second: 'defence' },
];
const POLICIES: Policy[] = ['run', 'bluff', 'fight'];

interface JourneyRun {
  j: Journey;
  stuck: boolean;
  combat: number;
  hungryJumps: number;
  nettedArrivals: number;
  callowayCalls: number;
  callowayFights: number;
  /** Times it docked and plotted a different lane. */
  replots: number;
  answers: Array<{ card: string; choice: string }>;
}

function flyJourney(seed: number, strat: Strategy, policy: Policy): JourneyRun {
  const j = newJourney(seed);
  const out: JourneyRun = { j, stuck: false, combat: 0, hungryJumps: 0, nettedArrivals: 0, callowayCalls: 0, callowayFights: 0, replots: 0, answers: [] };
  let n = 0;
  while (j.status !== 'over' && n < MAX_LEGS) {
    if (j.status === 'chart') {
      plot(j, planRoute(j));
      if (netted(j.chart, j.at)) out.nettedArrivals++;
    }
    const def = sortieDef(j);
    const w = new World(seed * 31 + n * 7 + 1, { mode: 'breakout', sortie: def, carry: j.carry });
    // docked: with the news (if bought) in hand, plot again from here
    const onDock = (w: World) => {
      if (w.carry().flags.includes('news')) hearNews(j);
      const was = j.dest, r = replot(j, planRoute(j, w.carry()));
      if (r && j.dest !== was) { w.replot(r.dest, r.jumpCost); out.replots++; }
    };
    const res = flyWorld(w, seed * 31 + n, strat, { maxTime: 1200, breakout: true, policy, onDock });
    out.combat += res.combat;
    out.answers.push(...res.answers.map((a) => ({ card: a.card, choice: a.choice })));
    for (const a of res.answers) if (a.card === 'calloway_here') { out.callowayCalls++; if (a.choice === 'fight' || a.fight) out.callowayFights++; }
    if (w.phase !== 'over') { out.stuck = true; break; }
    const hungryBefore = j.hungry;
    endSortie(j, w.result());
    if (j.hungry > hungryBefore) out.hungryJumps++;
    n++;
  }
  return out;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const mmss = (s: number) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };

it('flies whole journeys', { timeout: 7_200_000 }, () => {
  const all: Array<JourneyRun & { strat: string; policy: Policy }> = [];
  const rows: string[] = [];
  for (const strat of STRATEGIES) {
    for (const policy of POLICIES) {
      const res: JourneyRun[] = [];
      for (let i = 0; i < RUNS; i++) res.push(flyJourney(3000 + i * 13, strat, policy));
      all.push(...res.map((r) => ({ ...r, strat: stratName(strat), policy })));
      const through = res.filter((r) => r.j.end === 'through');
      rows.push(`| ${stratName(strat)} | ${policy} | ${through.length}/${res.length} | ${res.filter((r) => r.j.end === 'captured').length} | ${res.filter((r) => r.j.end === 'wrecked').length} | ${res.filter((r) => r.stuck).length} | ${mean(res.map((r) => r.j.legs.length)).toFixed(1)} | ${mean(res.map((r) => r.j.day)).toFixed(1)} | ${mean(res.map((r) => r.j.wrecks)).toFixed(1)} | ${mean(res.map((r) => r.callowayCalls)).toFixed(1)} | ${pct(mean(res.map((r) => r.combat / Math.max(1, r.j.legs.reduce((a, l) => a + l.time, 0)))))} | ${mmss(mean(res.flatMap((r) => r.j.legs.map((l) => l.time))))} |`);
    }
  }
  // the Krail curve: Krail aboard arriving in the nth system, and leaving it
  const depth = Math.max(...all.map((r) => r.j.legs.length));
  const curve: string[] = [];
  for (let i = 0; i < depth; i++) {
    const legs = all.map((r) => r.j.legs[i]).filter((l) => !!l);
    if (legs.length < 3) break;
    curve.push(`| ${i + 1} | ${legs.length} | ${mean(legs.map((l) => l.krailIn)).toFixed(1)} | ${mean(legs.map((l) => l.krailOut)).toFixed(1)} | ${mmss(mean(legs.map((l) => l.time)))} | ${mean(legs.map((l) => l.day)).toFixed(1)} | ${pct(legs.filter((l) => l.calloway).length / legs.length)} | ${pct(legs.filter((l) => l.ended === 'destroyed').length / legs.length)} |`);
  }
  // by kind of system: how long it took, how often it wrecked
  const kinds = new Map<string, Array<{ time: number; wrecked: boolean }>>();
  for (const r of all) for (const l of r.j.legs) {
    const k = sysById(r.j.chart, l.system).kind;
    if (!kinds.has(k)) kinds.set(k, []);
    kinds.get(k)!.push({ time: l.time, wrecked: l.ended === 'destroyed' });
  }
  const kindRows = [...kinds.entries()].map(([k, v]) => `| ${k} | ${v.length} | ${mmss(mean(v.map((x) => x.time)))} | ${pct(v.filter((x) => x.wrecked).length / v.length)} |`);
  // the Prefect's choices, and the M3 cards
  const m3 = ['calloway_here', 'calloway_word', 'lane_toll', 'port_scan', 'port_news', 'food_trader', 'drift_fleet', 'holdout', 'relay', 'false_trail', ...OFFERS.map((o) => o.id), 'calloway_last'];
  const cardRows = m3.map((id) => {
    const v = all.flatMap((r) => r.answers.filter((a) => a.card === id));
    const by: Record<string, number> = {};
    for (const a of v) by[a.choice] = (by[a.choice] ?? 0) + 1;
    return `| ${id} | ${v.length} | ${Object.entries(by).map(([c, n]) => `${c} ${n}`).join(', ') || '—'} |`;
  });
  // her file: how the last meeting went, and what she had learned by the end
  const lastMet = all.filter((r) => r.answers.some((a) => a.card === 'calloway_last'));
  const endings: Record<string, number> = {};
  for (const r of lastMet) { const k = r.j.calloway.ending ?? (r.j.end === 'captured' ? 'taken at the Threshold' : 'wrecked out at the Threshold'); endings[k] = (endings[k] ?? 0) + 1; }
  const tricksSeen = (r: JourneyRun) => Object.values(r.j.calloway.tricks).reduce((a, n) => a + (n ?? 0), 0);
  const ends: Record<string, number> = {};
  for (const r of all) { const k = r.stuck ? 'stuck (timed out)' : r.j.end ?? 'unfinished'; ends[k] = (ends[k] ?? 0) + 1; }
  const md = `# Journey balance report

Generated by \`npm run pilot:journey\`: the scripted pilot flew ${all.length}
whole journeys (${RUNS} seeds per strategy and policy), each a fresh chart.
It flies every system as it flies the Breakout (mines, docks once when the
hold is nearly full, the galley is low or the hull wants patching, then
makes for the lane mouth once the tank holds the jump), and plots every
jump with a cautious route planner: toward the Threshold, away from the Net
and from where Calloway was last seen, toward a port when food is short and
toward Krail when the tank is. It answers every comms card by one policy.

## How far journeys get

| Strategy | Policy | Through | Captured | Wrecked out | Stuck | Systems flown | Days | Wrecks | Calloway calls | Time in combat | Sortie length |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

"Through" reached the Threshold. "Captured": wrecked with Calloway in the
system. "Wrecked out": the third wreck. "Stuck": a sortie ran out the
pilot's clock (twenty minutes) without a jump or a wreck.

## How journeys end

| End | Journeys |
|---|---|
${Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## The Krail curve, system by system

| System | Journeys still going | Krail arriving | Krail after the jump | Sortie | Day | Calloway came | Wrecked |
|---|---|---|---|---|---|---|---|
${curve.join('\n')}

## By kind of system

| Kind | Sorties | Mean length | Wrecked |
|---|---|---|---|
${kindRows.join('\n')}

## The Net and the galley

| | Per journey |
|---|---|
| Arrivals in a netted system | ${mean(all.map((r) => r.nettedArrivals)).toFixed(1)} |
| Jumps without enough food | ${mean(all.map((r) => r.hungryJumps)).toFixed(1)} |
| Calloway's ship fought | ${mean(all.map((r) => r.callowayFights)).toFixed(1)} |
| Calloway beaten | ${mean(all.map((r) => r.j.hunt.beaten)).toFixed(1)} |
| Lanes re-plotted at a port | ${mean(all.map((r) => r.replots)).toFixed(1)} |
| Jumps she was behind at the end | ${mean(all.map((r) => Math.min(9, behind(r.j.hunt, r.j.trail)))).toFixed(1)} |

## Calloway's file

| | Per journey |
|---|---|
| Offers she made | ${mean(all.map((r) => r.j.calloway.offers.length)).toFixed(1)} |
| Offers taken | ${mean(all.map((r) => r.j.calloway.took.length)).toFixed(1)} |
| Tricks she saw | ${mean(all.map(tricksSeen)).toFixed(1)} |
| Truths told her | ${mean(all.map((r) => r.j.calloway.told)).toFixed(1)} |
| Read your route by the end | ${pct(all.filter((r) => r.j.hunt.hunch?.kind || r.j.hunt.hunch?.straight).length / all.length)} |
| Met her at the Threshold | ${lastMet.length} of ${all.length} |

How the last meeting ended:

| Ending | Journeys |
|---|---|
${Object.entries(endings).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n') || '| none reached | 0 |'}

## The journey's cards

| Card | Answered | Choices |
|---|---|---|
${cardRows.join('\n')}
`;
  writeFileSync(new URL('../docs/BALANCE-JOURNEY.md', import.meta.url), md);
});
