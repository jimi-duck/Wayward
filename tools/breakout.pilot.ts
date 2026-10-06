import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { CARD_BY_ID } from '../src/sim/comms';
import { fly, stratName, type PilotResult, type Policy, type Strategy } from './pilot';

// ── the Breakout's balance report ─────────────────────────────────────────
// `npm run pilot:breakout` flies the scripted pilot through the Breakout on
// fixed seeds and writes docs/BALANCE-BREAKOUT.md: how often it gets out,
// how long it takes, how much of it is fighting, what the Krail looks like at
// the jump, what catches the ones who do not, and what every comms card's
// every choice did, by policy (always fight, always run, always pay, bluff
// when it can). BREAKOUT_RUNS trades precision for speed.

const RUNS = Number(process.env.BREAKOUT_RUNS ?? 16);
const MAX = 1200;

const STRATEGIES: Strategy[] = [
  { kind: 'random' },
  { kind: 'focus', branch: 'laser', second: 'defence' },
  { kind: 'focus', branch: 'torpedo', second: 'defence' },
];
const POLICIES: Policy[] = ['fight', 'run', 'pay', 'bluff'];

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mmss = (s: number) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };
const pct = (n: number) => `${Math.round(n * 100)}%`;

it('flies the Breakout', { timeout: 3_600_000 }, () => {
  const all: Array<PilotResult & { policy: Policy }> = [];
  const rows: string[] = [];
  for (const strat of STRATEGIES) {
    for (const policy of POLICIES) {
      const res: PilotResult[] = [];
      for (let i = 0; i < RUNS; i++) res.push(fly(2000 + i * 11, strat, { maxTime: MAX, breakout: true, policy }));
      all.push(...res.map((r) => ({ ...r, policy })));
      const out = res.filter((r) => r.run.escaped);
      const caught = res.filter((r) => !r.run.escaped);
      rows.push(`| ${stratName(strat)} | ${policy} | ${out.length}/${res.length} | ${out.length ? mmss(mean(out.map((r) => r.run.time))) : '—'} | ${caught.length ? mmss(mean(caught.map((r) => r.run.time))) : '—'} | ${pct(mean(res.map((r) => r.combat / Math.max(1, r.run.time))))} | ${mean(res.map((r) => r.run.refit)).toFixed(1)} | ${mean(res.map((r) => r.run.ore)).toFixed(0)} | ${mean(res.map((r) => r.run.cyrite)).toFixed(0)} | ${mean(res.map((r) => r.run.cut)).toFixed(1)} / ${mean(res.map((r) => r.run.fractured)).toFixed(1)} | ${pct(res.filter((r) => r.run.docked > 0).length / res.length)} | ${mean(res.map((r) => r.run.platesLost)).toFixed(1)} / ${mean(res.map((r) => r.run.platesGained)).toFixed(1)} |`);
    }
  }
  const damage: Record<string, number> = {};
  for (const r of all) for (const [k, v] of Object.entries(r.run.damageBy)) damage[k] = (damage[k] ?? 0) + v;
  const total = Object.values(damage).reduce((a, b) => a + b, 0) || 1;
  const dmgRows = Object.entries(damage).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `| ${k} | ${v} | ${pct(v / total)} |`);
  const causes: Record<string, number> = {};
  for (const r of all) if (!r.run.escaped) causes[r.run.cause || 'timeout'] = (causes[r.run.cause || 'timeout'] ?? 0) + 1;
  const causeRows = Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`);
  const blockade = all.flatMap((r) => r.bossFights);
  // every card's every choice: how often, how often it came off, what it did there and then, and how those runs ended
  const byChoice = new Map<string, Array<{ won: boolean; krail: number; chits: number; heat: number; fight: boolean; escaped: boolean }>>();
  for (const r of all) for (const a of r.answers) {
    const k = `${a.card}|${a.choice}`;
    if (!byChoice.has(k)) byChoice.set(k, []);
    byChoice.get(k)!.push({ ...a, escaped: r.run.escaped });
  }
  const order = (k: string) => `${CARD_BY_ID[k.split('|')[0]!]?.kind ?? ''}|${k}`;
  const sign = (n: number, d = 0) => `${n > 0 ? '+' : ''}${n.toFixed(d)}`;
  const cardRows = [...byChoice.entries()].sort((a, b) => order(a[0]).localeCompare(order(b[0]))).map(([k, v]) => {
    const [card, choice] = k.split('|');
    return `| ${card} | ${choice} | ${v.length} | ${pct(v.filter((x) => x.won).length / v.length)} | ${sign(mean(v.map((x) => x.krail)), 1)} | ${sign(mean(v.map((x) => x.chits)))} | ${sign(mean(v.map((x) => x.heat)), 2)} | ${pct(v.filter((x) => x.fight).length / v.length)} | ${pct(v.filter((x) => x.escaped).length / v.length)} |`;
  });
  const policyRows = POLICIES.map((p) => {
    const res = all.filter((r) => r.policy === p);
    const out = res.filter((r) => r.run.escaped);
    return `| ${p} | ${pct(out.length / res.length)} | ${mean(res.map((r) => r.answers.length)).toFixed(1)} | ${mean(res.map((r) => r.run.jobsDone)).toFixed(1)} | ${pct(mean(res.map((r) => r.combat / Math.max(1, r.run.time))))} | ${out.length ? mmss(mean(out.map((r) => r.run.time))) : '—'} |`;
  });
  const check = all.flatMap((r) => r.answers.filter((a) => a.card === 'checkpoint').map((a) => ({ ...a, escaped: r.run.escaped })));
  const checkRows = ['run', 'spoof', 'rig', 'pay', 'talk', 'fight'].map((c) => {
    const v = check.filter((a) => a.choice === c);
    return v.length ? `| ${c} | ${v.length} | ${pct(v.filter((a) => a.won).length / v.length)} | ${pct(v.filter((a) => a.escaped).length / v.length)} |` : `| ${c} | 0 | — | — |`;
  });
  const md = `# Breakout balance report

Generated by \`npm run pilot:breakout\`: the scripted pilot flew the Breakout
${all.length} times (${RUNS} seeds per strategy and policy), on fixed seeds. It
mines with the cutter, docks once when the hold is nearly full or the hull
wants patching, and makes for the lane mouth once the tank holds the jump. A
steady player, not a strong one. It answers every comms card by one policy:
fight (reach for the guns), run (turn it down, or run), pay (pay or trade),
or bluff (bluff when the odds are at least even). It never reads the intent
estimate, so these are the numbers for a player who always answers the same
way.

## Escapes

| Strategy | Policy | Escaped | Time to escape | Lasted, if caught | Time in combat | Installs | Ore | Cyrite | Cut / fractured | Docked | Plates lost / gained |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

"Time in combat" is the share of the run with a hostile in firing range of
the ship.

## By policy

| Policy | Escaped | Cards answered | Jobs done | Time in combat | Time to escape |
|---|---|---|---|---|---|
${policyRows.join('\n')}

## The checkpoint

| Choice | Taken | Came off | Then escaped |
|---|---|---|---|
${checkRows.join('\n')}

## The blockade, when it came to a fight

| Outcome | Fights |
|---|---|
| killed | ${blockade.filter((b) => b.outcome === 'killed').length} |
| escaped (she left) | ${blockade.filter((b) => b.outcome === 'escaped').length} |
| died | ${blockade.filter((b) => b.outcome === 'died').length} |

## Every card, every choice

What each answer did there and then (Krail, chits and heat; "fight" if it
brought hostile hulls or started the blockade), and how the runs that took
it ended. A choice that always comes off and costs nothing would be a menu,
not a gamble; the aim is that none does.

| Card | Choice | Taken | Came off | Krail | Chits | Heat | Fight | Then escaped |
|---|---|---|---|---|---|---|---|---|
${cardRows.join('\n')}

## What caught the ones who did not get out

| Cause | Runs |
|---|---|
${causeRows.join('\n')}

## Where the damage comes from

| Source | Hits | Share |
|---|---|---|
${dmgRows.join('\n')}
`;
  writeFileSync(new URL('../docs/BALANCE-BREAKOUT.md', import.meta.url), md);
});
