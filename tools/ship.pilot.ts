import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { MODULE_BY_ID, SHIP_SYSTEMS, SYSTEM_DEFS, type ShipSystem } from '../src/content/modules';
import { CARD_BY_ID } from '../src/sim/comms';
import { endSortie, hearNews, newJourney, plot, replot, sortieDef, type Journey } from '../src/sim/journey';
import { addKit, earned, noKit, systemMarks, type Kit } from '../src/sim/modules';
import { World } from '../src/sim/world';
import { flyWorld, type Policy, type Strategy } from './pilot';
import { planRoute } from './route';

// ── the ship's balance report ─────────────────────────────────────────────
// `npm run pilot:ship` flies whole journeys as the journey pilot does, once
// for each of the ship's four systems and once with no modules at all. Each
// system's pilot builds toward it: it fits that system's modules at every
// port it can afford them (keeping the chits for the jump and the galley),
// takes refit cards from the branches that system holds, answers the
// comms the way that system plays, and takes a choice its modules opened
// whenever one is on the table. It writes docs/BALANCE-SHIP.md: how each
// build gets through, and whether each gets through in its own way.
// SHIP_RUNS trades precision for speed.

const RUNS = Number(process.env.SHIP_RUNS ?? 6);
const MAX_LEGS = 24;

interface Build {
  name: string;
  system: ShipSystem | null;
  strat: Strategy;
  policy: Policy;
  /** Modules to fit, in order of want. */
  modules: string[];
}

const BUILDS: Build[] = [
  { name: 'none', system: null, strat: { kind: 'focus', branch: 'torpedo', second: 'defence' }, policy: 'bluff', modules: [] },
  { name: 'Guns', system: 'guns', strat: { kind: 'focus', branch: 'torpedo', second: 'defence' }, policy: 'fight', modules: ['md_hardpoints', 'md_plate', 'md_gunnery'] },
  { name: 'Rig', system: 'rig', strat: { kind: 'focus', branch: 'utility', second: 'mobility' }, policy: 'pay', modules: ['md_racks', 'md_shop', 'md_tractor'] },
  { name: 'Signals', system: 'signals', strat: { kind: 'focus', branch: 'laser', second: 'mobility' }, policy: 'bluff', modules: ['md_baffles', 'md_spoofer', 'md_ghost', 'md_jammer', 'md_array'] },
  { name: 'Contacts', system: 'contacts', strat: { kind: 'focus', branch: 'torpedo', second: 'defence' }, policy: 'pay', modules: ['md_ledger', 'md_dock', 'md_names'] },
];

/** Chits held back at a yard: the Krail still owed to the jump, and two jumps of food. */
const reserve = (w: World) => Math.max(0, w.jumpCost - w.krail) * w.prices.krail + Math.max(0, 12 - w.food) * w.prices.food;

/** Fit what the build wants, cheapest first among the ones it can have now, while the purse allows. */
function fitAt(w: World, b: Build, fitted: string[]): void {
  w.sellOre();
  for (let tries = 0; tries < 8; tries++) {
    const can = b.modules.filter((id) => !w.fitNeeds(id).length);
    const id = can.find((m) => w.chits - (MODULE_BY_ID[m]!.chits[w.levels[m] ?? 0] ?? Infinity) >= reserve(w));
    if (!id || !w.fitModule(id)) return;
    fitted.push(id);
  }
}

/** A choice the build's modules opened, if one is on the table. */
function ownChoice(w: World, b: Build): string | null {
  if (!b.system || !w.comms) return null;
  const def = CARD_BY_ID[w.comms.def.id];
  for (const ch of w.comms.choices) {
    if (!ch.ok) continue;
    const needs = [def?.choices.find((c) => c.id === ch.id)?.needs?.fitted ?? []].flat();
    if (needs.some((id) => MODULE_BY_ID[id]?.system === b.system) && (ch.odds === null || ch.odds >= 0.4)) return ch.id;
  }
  return null;
}

interface ShipRun {
  j: Journey;
  stuck: boolean;
  combat: number;
  time: number;
  kills: number;
  earned: Kit;
  fitted: string[];
  /** Choices its modules opened, taken. */
  own: Array<{ card: string; choice: string; won: boolean }>;
  callowayCalls: number;
}

function flyJourney(seed: number, b: Build): ShipRun {
  const j = newJourney(seed);
  const out: ShipRun = { j, stuck: false, combat: 0, time: 0, kills: 0, earned: noKit(), fitted: [], own: [], callowayCalls: 0 };
  let n = 0;
  while (j.status !== 'over' && n < MAX_LEGS) {
    if (j.status === 'chart') plot(j, planRoute(j));
    const w = new World(seed * 31 + n * 7 + 1, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
    const onDock = (w: World) => {
      if (w.carry().flags.includes('news')) hearNews(j);
      const was = j.dest, r = replot(j, planRoute(j, w.carry()));
      if (r && j.dest !== was) w.replot(r.dest, r.jumpCost);
      fitAt(w, b, out.fitted);
    };
    const own = new Set<string>();
    const answer = (w: World) => { const id = ownChoice(w, b); if (id) own.add(`${w.comms!.def.id}:${id}`); return id; };
    const res = flyWorld(w, seed * 31 + n, b.strat, { maxTime: 1200, breakout: true, policy: b.policy, onDock, answer });
    out.combat += res.combat;
    out.time += res.run.time;
    out.kills += res.run.kills;
    out.earned = addKit(out.earned, earned(res.run));
    for (const a of res.answers) {
      if (own.has(`${a.card}:${a.choice}`)) out.own.push({ card: a.card, choice: a.choice, won: a.won });
      if (a.card === 'calloway_here') out.callowayCalls++;
    }
    if (w.phase !== 'over') { out.stuck = true; break; }
    endSortie(j, w.result());
    n++;
  }
  return out;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const f1 = (n: number) => n.toFixed(1);

it('flies whole journeys, one build per system', { timeout: 7_200_000 }, () => {
  const rows: string[] = [], how: string[] = [], earnRows: string[] = [], ownRows: string[] = [], fitRows: string[] = [];
  for (const b of BUILDS) {
    const res: ShipRun[] = [];
    for (let i = 0; i < RUNS; i++) res.push(flyJourney(3000 + i * 13, b));
    const through = res.filter((r) => r.j.end === 'through').length;
    rows.push(`| ${b.name} | ${b.policy} | ${through}/${res.length} | ${res.filter((r) => r.j.end === 'captured').length} | ${res.filter((r) => r.j.end === 'wrecked').length} | ${res.filter((r) => r.stuck).length} | ${f1(mean(res.map((r) => r.j.legs.length)))} | ${f1(mean(res.map((r) => r.j.day)))} | ${f1(mean(res.map((r) => r.j.wrecks)))} | ${f1(mean(res.map((r) => r.callowayCalls)))} |`);
    how.push(`| ${b.name} | ${pct(mean(res.map((r) => r.combat / Math.max(1, r.time))))} | ${f1(mean(res.map((r) => r.kills)))} | ${pct(res.filter((r) => r.j.hunt.hunch?.kind || r.j.hunt.hunch?.straight).length / res.length)} | ${f1(mean(res.map((r) => r.j.carry.chits)))} | ${f1(mean(res.map((r) => r.j.carry.krail)))} |`);
    earnRows.push(`| ${b.name} | ${SHIP_SYSTEMS.map((s) => f1(mean(res.map((r) => r.earned[s])))).join(' | ')} |`);
    const marks = SHIP_SYSTEMS.map((s) => f1(mean(res.map((r) => systemMarks(r.j.carry.levels)[s]))));
    fitRows.push(`| ${b.name} | ${marks.join(' | ')} | ${f1(mean(res.map((r) => r.fitted.length)))} | ${res.filter((r) => r.fitted.length).length}/${res.length} |`);
    const own: Record<string, { n: number; won: number }> = {};
    for (const r of res) for (const a of r.own) { const k = `${a.card}.${a.choice}`; own[k] ??= { n: 0, won: 0 }; own[k].n++; if (a.won) own[k].won++; }
    ownRows.push(`| ${b.name} | ${f1(mean(res.map((r) => r.own.length)))} | ${Object.entries(own).sort((x, y) => y[1].n - x[1].n).map(([k, v]) => `${k} ${v.won}/${v.n}`).join(', ') || '—'} |`);
  }
  const md = `# Ship balance report

Generated by \`npm run pilot:ship\`: the scripted pilot flew ${BUILDS.length * RUNS}
whole journeys (${RUNS} seeds per build, the same seeds for every build), as
the journey pilot flies them (docs/BALANCE-JOURNEY.md). Each build is one of
the ship's four systems, plus one that fits no modules at all. A build fits
its system's modules at every port it can afford them, keeping the chits
for the jump and two jumps of food; takes refit cards from the branches its
system holds; answers the comms by one policy; and takes a choice its
modules opened whenever one is on the table at even odds or better.

| Build | Modules wanted |
|---|---|
${BUILDS.map((b) => `| ${b.name} | ${b.modules.map((m) => MODULE_BY_ID[m]!.name).join(', ') || '—'} |`).join('\n')}

## How each gets through

| Build | Policy | Through | Captured | Wrecked out | Stuck | Systems flown | Days | Wrecks | Calloway calls |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## In what way

| Build | Time in combat | Kills a journey | She read the route | Chits at the end | Krail at the end |
|---|---|---|---|---|---|
${how.join('\n')}

## What each earns (per journey)

| Build | ${SHIP_SYSTEMS.map((s) => `${SYSTEM_DEFS[s].name} (${SYSTEM_DEFS[s].resource})`).join(' | ')} |
|---|---|---|---|---|
${earnRows.join('\n')}

## What each fits

| Build | ${SHIP_SYSTEMS.map((s) => `${SYSTEM_DEFS[s].name} marks`).join(' | ')} | Marks fitted | Journeys that fitted any |
|---|---|---|---|---|---|---|
${fitRows.join('\n')}

## The choices its modules opened

| Build | Taken a journey | Card.choice won/taken |
|---|---|---|
${ownRows.join('\n')}
`;
  writeFileSync(new URL('../docs/BALANCE-SHIP.md', import.meta.url), md);
});
