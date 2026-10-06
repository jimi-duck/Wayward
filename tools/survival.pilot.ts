import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { SURVIVAL, SURVIVAL_IDS, type SurvivalId } from '../src/content/survival';
import { netted } from '../src/sim/chart';
import { endSortie, newJourney, plot, replot, sortieDef, hearNews, type Journey } from '../src/sim/journey';
import { NO_LOOT, type Loot } from '../src/sim/run';
import { World } from '../src/sim/world';
import { fly, flyWorld, stratName, type PilotResult, type Strategy } from './pilot';
import { planRoute } from './route';

// ── the survival modes' balance report ────────────────────────────────────
// `npm run pilot:survival` flies the scripted pilot through the arcade and
// through whole journeys in each survival mode, on the same seeds, and writes
// docs/BALANCE-SURVIVAL.md: how much hostile pressure each mode brings, where
// its Krail, Cyrite and parts come from (rock or wrecks), and whether every
// mode stays playable. SURV_RUNS, SURV_TIME and SURV_JOURNEYS trade precision
// for speed. Prospector is the baseline the other two are read against.

const RUNS = Number(process.env.SURV_RUNS ?? 10);
const TIME = Number(process.env.SURV_TIME ?? 600);
const JOURNEYS = Number(process.env.SURV_JOURNEYS ?? 6);
const MAX_LEGS = 24;

const STRATEGIES: Strategy[] = [{ kind: 'random' }, { kind: 'focus', branch: 'torpedo', second: 'defence' }];

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const mmss = (s: number) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };
const add = (a: Loot, b: Loot): Loot => ({ krail: a.krail + b.krail, cyrite: a.cyrite + b.cyrite, ore: a.ore + b.ore, parts: a.parts + b.parts });
const per = (n: number, seconds: number) => (seconds > 0 ? (n / seconds) * 60 : 0);

interface Flown { r: PilotResult; seconds: number }

function arcade(mode: SurvivalId): Flown[] {
  const out: Flown[] = [];
  for (const strat of STRATEGIES) for (let i = 0; i < RUNS; i++) {
    const r = fly(1000 + i * 7, strat, { maxTime: TIME, survival: mode });
    out.push({ r, seconds: r.run.time });
  }
  return out;
}

interface JourneyFlown {
  j: Journey;
  stuck: boolean;
  seconds: number;
  combat: number;
  contacts: number;
  calm: number[];
  rock: Loot;
  wreck: Loot;
  hungry: number;
  tank: number[];
}

function journey(seed: number, mode: SurvivalId): JourneyFlown {
  const j = newJourney(seed, false, 'three', mode);
  const out: JourneyFlown = { j, stuck: false, seconds: 0, combat: 0, contacts: 0, calm: [], rock: NO_LOOT(), wreck: NO_LOOT(), hungry: 0, tank: [] };
  let n = 0;
  while (j.status !== 'over' && n < MAX_LEGS) {
    if (j.status === 'chart') { plot(j, planRoute(j)); out.tank.push(j.carry.cyrite); }
    const def = sortieDef(j);
    const w = new World(seed * 31 + n * 7 + 1, { mode: 'breakout', sortie: def, carry: j.carry });
    const onDock = (w: World) => {
      if (w.carry().flags.includes('news')) hearNews(j);
      const was = j.dest, r = replot(j, planRoute(j, w.carry()));
      if (r && j.dest !== was) w.replot(r.dest, r.jumpCost);
    };
    const res = flyWorld(w, seed * 31 + n, { kind: 'random' }, { maxTime: 1200, breakout: true, policy: 'bluff', onDock });
    out.seconds += w.runTime;
    out.combat += res.combat;
    out.contacts += res.contacts;
    out.calm.push(res.longestCalm);
    out.rock = add(out.rock, w.run.loot.rock);
    out.wreck = add(out.wreck, w.run.loot.wreck);
    if (w.phase !== 'over') { out.stuck = true; break; }
    const before = j.hungry;
    endSortie(j, w.result());
    if (j.hungry > before) out.hungry++;
    n++;
  }
  return out;
}

it('flies the survival modes', { timeout: 7_200_000 }, () => {
  const sections: string[] = [];
  const arcadeRows: string[] = [];
  const sourceRows: string[] = [];
  const storyRows: string[] = [];
  const storySource: string[] = [];
  const t0 = Date.now();
  for (const mode of SURVIVAL_IDS) {
    const A = arcade(mode);
    const secs = sum(A.map((x) => x.seconds));
    const rock = A.map((x) => x.r.run.loot.rock.krail), wreck = A.map((x) => x.r.run.loot.wreck.krail);
    arcadeRows.push(`| ${SURVIVAL[mode].name} | ${A.length} | ${pct(A.filter((x) => x.r.run.cause === 'survived').length / A.length)} | ${mmss(mean(A.map((x) => x.seconds)))} | ${per(sum(A.map((x) => x.r.contacts)), secs).toFixed(2)} | ${pct(sum(A.map((x) => x.r.combat)) / secs)} | ${mmss(mean(A.map((x) => x.r.longestCalm)))} | ${per(sum(A.map((x) => x.r.run.kills)), secs).toFixed(1)} | ${per(sum(A.map((x) => x.r.run.platesLost)), secs).toFixed(2)} | ${Math.round(mean(A.map((x) => x.r.run.score))).toLocaleString('en-GB')} |`);
    const k = per(sum(rock) + sum(wreck), secs);
    sourceRows.push(`| ${SURVIVAL[mode].name} | ${per(sum(rock), secs).toFixed(1)} | ${per(sum(wreck), secs).toFixed(1)} | ${k.toFixed(1)} | ${pct(sum(wreck) / Math.max(1, sum(rock) + sum(wreck)))} | ${per(sum(A.map((x) => x.r.run.refit)), secs).toFixed(1)} |`);

    const J: JourneyFlown[] = [];
    for (let i = 0; i < JOURNEYS; i++) J.push(journey(3000 + i * 13, mode));
    const js = sum(J.map((x) => x.seconds));
    const through = J.filter((x) => x.j.end === 'through').length;
    storyRows.push(`| ${SURVIVAL[mode].name} | ${through}/${J.length} | ${J.filter((x) => x.j.end === 'captured').length} | ${J.filter((x) => x.j.end === 'wrecked').length} | ${J.filter((x) => x.stuck).length} | ${mean(J.map((x) => x.j.legs.length)).toFixed(1)} | ${mean(J.map((x) => x.j.day)).toFixed(1)} | ${mean(J.map((x) => x.j.wrecks)).toFixed(1)} | ${pct(sum(J.map((x) => x.combat)) / js)} | ${per(sum(J.map((x) => x.contacts)), js).toFixed(2)} | ${mmss(mean(J.flatMap((x) => x.calm)))} | ${mean(J.map((x) => x.hungry)).toFixed(1)} | ${mean(J.flatMap((x) => x.tank)).toFixed(1)} |`);
    const R = J.reduce((a, x) => add(a, x.rock), NO_LOOT()), W = J.reduce((a, x) => add(a, x.wreck), NO_LOOT());
    const row = (name: string, r: number, w: number) => `| ${SURVIVAL[mode].name} | ${name} | ${per(r, js).toFixed(1)} | ${per(w, js).toFixed(1)} | ${pct(w / Math.max(1, r + w))} |`;
    storySource.push(row('Krail', R.krail, W.krail), row('Cyrite', R.cyrite, W.cyrite), row('Ore', R.ore, W.ore), row('Parts', R.parts, W.parts));
    console.log(`${mode}: ${Math.round((Date.now() - t0) / 1000)}s`);
  }

  sections.push(`# Survival modes balance report

Generated by \`npm run pilot:survival\`: the scripted pilot flew the arcade
(${RUNS} seeds × ${STRATEGIES.length} strategies, ${mmss(TIME)} each: ${STRATEGIES.map(stratName).join(', ')}) and
${JOURNEYS} whole journeys in each mode, on the same seeds. Prospector is the
baseline; Drifter and Raider are read against it. The pilot flies one way in
every mode: it shoots what is in front of it, takes what lies near, mines when
the tank is low. It does not wait out a skirmish or choose its fights, so a
mode's salvage loop is a floor here, not what a player who plays it can do.

## The arcade: pressure

| Mode | Runs | Survived | Mean time | Contacts / min | Time in combat | Longest calm | Kills / min | Plates lost / min | Score |
|---|---|---|---|---|---|---|---|---|---|
${arcadeRows.join('\n')}

"Contacts" are times a hostile came into firing range from nothing.
"Longest calm" is the longest stretch with no hostile in range.

## The arcade: where the Krail comes from

Krail dropped a minute, by source, and bay picks a minute (every pick costs 30 Krail).

| Mode | From rock | From wrecks | Total | Wreck share | Picks / min |
|---|---|---|---|---|---|
${sourceRows.join('\n')}

## The Story: how journeys go

| Mode | Through | Captured | Wrecked out | Stuck | Systems flown | Days | Wrecks | Time in combat | Contacts / min | Longest calm | Hungry jumps | Cyrite at the chart |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${storyRows.join('\n')}

"Stuck" is a sortie that ran out the pilot's twenty minutes without a jump or a wreck: the
sign of an unwinnable resource state.

## The Story: where the loot comes from

Dropped a minute of flight, by source.

| Mode | Resource | From rock | From wrecks | Wreck share |
|---|---|---|---|---|
${storySource.join('\n')}
`);
  writeFileSync(new URL('../docs/BALANCE-SURVIVAL.md', import.meta.url), sections.join('\n'));
});
