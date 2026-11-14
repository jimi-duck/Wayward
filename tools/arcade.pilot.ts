import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { fly, stratName, type Strategy } from './pilot';

// ── the arcade report ─────────────────────────────────────────────────────
// `npm run pilot:arcade` flies the scripted pilot through seeded arcade runs and
// writes docs/BALANCE-ARCADE.md: when the fighting starts, where the Krail comes
// from (rock or wrecks), and how fast the refits come. ARCADE_RUNS and
// ARCADE_TIME (environment) trade precision for speed. ARCADE_OUT overrides the path.
// PILOT_NO_B=1 flies without pressing B (the bay only opens by itself).

const RUNS = Number(process.env.ARCADE_RUNS ?? 12);
const MAX = Number(process.env.ARCADE_TIME ?? 600);
const OUT = process.env.ARCADE_OUT ?? 'docs/BALANCE-ARCADE.md';
const STRATEGIES: Strategy[] = [
  { kind: 'random' },
  { kind: 'focus', branch: 'laser', second: 'defence' },
  { kind: 'focus', branch: 'torpedo', second: 'laser' },
  { kind: 'focus', branch: 'mine', second: 'mobility' },
];
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mmss = (s: number) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };

it('flies the arcade matrix', { timeout: 3_600_000 }, () => {
  const rows: string[] = [], bays: string[] = [], caps: string[] = [];
  for (const strat of STRATEGIES) {
    const res = Array.from({ length: RUNS }, (_, i) => fly(1000 + i * 7, strat, { maxTime: MAX }));
    const wreck = mean(res.map((r) => r.run.loot.wreck.krail)), rock = mean(res.map((r) => r.run.loot.rock.krail));
    const first = res.map((r) => r.refitAt[1]).filter((x): x is number => x !== undefined);
    const at = (xs: number[]) => { const k = xs.filter((x) => x >= 0); return k.length ? mmss(mean(k)) : '–'; };
    const offered = res.map((r) => r.bay.offered), earned = res.map((r) => r.bay.earned);
    const mins = mean(res.map((r) => r.run.time / 60));
    bays.push(`| ${stratName(strat)} | ${at(earned)} | ${at(offered)} | ${mean(res.map((r) => r.bay.wait)).toFixed(1)} s | ${(mean(res.map((r) => r.bay.opens)) / Math.max(1, mins)).toFixed(2)} | ${mean(res.map((r) => r.bay.picks / Math.max(1, r.bay.opens))).toFixed(2)} | ${at(res.map((r) => r.firstSpec))} | ${mean(res.map((r) => r.mended)).toFixed(1)} | ${mean(res.filter((r) => r.hitToPlate > 0).map((r) => r.hitToPlate)).toFixed(0)} s | ${mean(res.map((r) => r.overlap)).toFixed(0)} s |`);
    const outs = ['killed', 'avoided', 'escaped', 'none'].map((o) => `${o} ${res.filter((r) => r.firstCapital.outcome === o).length}`).join(', ');
    const builds = new Map<string, number>();
    for (const r of res) builds.set(r.identity, (builds.get(r.identity) ?? 0) + 1);
    caps.push(`| ${stratName(strat)} | ${at(res.map((r) => r.firstCapital.at))} | ${outs} | ${[...builds].sort((a, b) => b[1] - a[1]).map(([b, n]) => `${b} ${n}`).join(', ')} |`);
    rows.push(`| ${stratName(strat)} | ${mmss(mean(res.map((r) => r.run.time)))} | ${mean(res.map((r) => r.contacts)).toFixed(1)} | ${wreck.toFixed(0)} / ${rock.toFixed(0)} | ${Math.round((100 * wreck) / Math.max(1, wreck + rock))}% | ${first.length ? mmss(mean(first)) : '–'} | ${mean(res.map((r) => r.run.refit)).toFixed(1)} | ${Math.round(mean(res.map((r) => r.run.score))).toLocaleString('en-GB')} | ${res.filter((r) => r.run.cause === 'survived').length}/${res.length} |`);
  }
  const md = `# Arcade balance

Written by \`npm run pilot:arcade\`: ${RUNS} seeded runs per strategy, each capped at ${mmss(MAX)}.
Krail is from wrecks / from rock. The pilot flies the same seeds every time.

| Strategy | Mean time | Contacts | Krail wreck / rock | Wreck share | First refit | Refits | Score | Survived |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

**The bay and the hull.** *Earned*: the first refit's price aboard; *offered*: the bay first open; *wait*: mean seconds from a price
aboard to the bay open; *opens/min* and *picks/open*; *first spec*: the first specialisation; *mended*: plates the
self-repair put back; *hit→plate*: mean seconds from a plate lost to the hull whole again (never-mended plates left out);
*overlap*: seconds with a wave, a live event and a capital ship all at once. The pilot cannot measure seconds paused in the bay.

| Strategy | First refit earned | First bay | Wait | Opens/min | Picks/open | First spec | Mended | Hit→plate | Overlap |
|---|---|---|---|---|---|---|---|---|---|
${bays.join('\n')}

**Capital ships and builds.** The pilot always fights a capital ship it can reach, so *avoided* tells little.

| Strategy | First capital | First outcome | Builds (runs) |
|---|---|---|---|
${caps.join('\n')}
`;
  // the dated history under the tables is kept (written by hand when a result is worth remembering)
  const old = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  const at = old.indexOf('\n## History');
  writeFileSync(OUT, at >= 0 ? md + old.slice(at) : md);
  console.log(md);
});
