import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { ENDINGS, SCATTER } from '../src/content/endings';
import { MODULES, SHIP_SYSTEMS, type ShipSystem } from '../src/content/modules';
import { choices, ledger } from '../src/sim/endings';
import { endSortie, newJourney, options, plot, sortieDef, toEdge, type Journey } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { flyWorld, type Policy, type Strategy } from './pilot';

// ── the endings report ────────────────────────────────────────────────────
// `npm run pilot:endings` flies whole journeys and, for the ones that reach
// the Threshold, asks which of the six endings they opened. Each journey
// leans on one ship system: at every port it fits the cheapest module of
// that system it can afford, the way a player building toward an ending
// would. It writes docs/BALANCE-ENDINGS.md. ENDINGS_RUNS trades precision
// for speed.

const RUNS = Number(process.env.ENDINGS_RUNS ?? 4);
const MAX_LEGS = 24;
const STRAT: Strategy = { kind: 'random' };
const POLICIES: Policy[] = ['run', 'bluff', 'fight'];

/** Toward the Threshold, away from the Net: the journey pilot's planner, plainer. */
function planRoute(j: Journey): string {
  let best = '', bestV = -Infinity;
  for (const o of options(j)) {
    const at = j.at;
    j.at = o.to.id;
    const left = o.to.kind === 'edge' ? 0 : toEdge(j);
    j.at = at;
    const v = -left * 40 - o.route.cyrite * 1.2 - (o.netted ? 35 : 0) - (o.shadow ? 30 : 0);
    if (v > bestV) { bestV = v; best = o.to.id; }
  }
  return best;
}

/** At a port: fit what can be fitted of the system this journey leans on. */
function fitAll(w: World, lean: ShipSystem): void {
  for (let k = 0; k < 4; k++) {
    const m = MODULES.filter((x) => x.system === lean).find((x) => w.fitNeeds(x.id).length === 0);
    if (!m || !w.fitModule(m.id)) return;
  }
}

function flyJourney(seed: number, policy: Policy, lean: ShipSystem): Journey {
  const j = newJourney(seed);
  let n = 0;
  while (j.status !== 'over' && n < MAX_LEGS) {
    if (j.status === 'chart') plot(j, planRoute(j));
    const w = new World(seed * 31 + n * 7 + 1, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    flyWorld(w, seed * 31 + n, STRAT, { maxTime: 1200, breakout: true, policy, onDock: (w) => fitAll(w, lean) });
    if (w.phase !== 'over') break;
    endSortie(j, w.result());
    n++;
  }
  return j;
}

it('opens endings on real journeys', { timeout: 7_200_000 }, () => {
  const rows: string[] = [];
  const opened: Record<string, number> = Object.fromEntries(ENDINGS.map((e) => [e.id, 0]));
  let through = 0, total = 0;
  for (const lean of SHIP_SYSTEMS) {
    for (const policy of POLICIES) {
      for (let i = 0; i < RUNS; i++) {
        const j = flyJourney(5000 + i * 17, policy, lean);
        total++;
        if (j.end !== 'through') { rows.push(`| ${lean} | ${policy} | ${j.end ?? 'unfinished'} | | | | | | | |`); continue; }
        through++;
        const l = ledger(j);
        const open = choices(j).filter((c) => c.open).map((c) => c.def.id);
        for (const id of open) opened[id]!++;
        const st = SCATTER.map((s) => `${s} ${l.standing[s] ?? 0}`).join(', ');
        const mk = SHIP_SYSTEMS.map((s) => `${s} ${l.marks[s]}`).join(', ');
        const kit = SHIP_SYSTEMS.map((s) => `${s} ${j.carry.kit[s]}`).join(', ');
        const hunting = (['custody', 'office', 'gutter'] as const).filter((f) => l.notice(f)).join(', ') || '—';
        rows.push(`| ${lean} | ${policy} | through | ${open.join(', ')} | ${st} | ${mk} | ${kit} | ${hunting} | ${l.beaten} | ${[...l.flags].join(', ') || '—'} |`);
      }
    }
  }
  const md = `# Endings: which ones real journeys open

\`npm run pilot:endings\` (${RUNS} journeys per lean and policy). Each journey
leans on one ship system and fits what it can of it at every port.
${through} of ${total} reached the Threshold.

| Ending | Open at the Threshold |
|---|---|
${ENDINGS.map((e) => `| ${e.name} | ${opened[e.id]}/${through} |`).join('\n')}

| Lean | Policy | End | Open | Standing (Scatter) | Marks | Kit aboard | Hunting you | Calloway beaten | Flags |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
  writeFileSync('docs/BALANCE-ENDINGS.md', md);
  console.log(md);
});
