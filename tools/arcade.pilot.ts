import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { fly, stratName, type Strategy } from './pilot';

// ── the arcade report ─────────────────────────────────────────────────────
// `npm run pilot:arcade` flies the scripted pilot through seeded arcade runs and
// writes docs/BALANCE-ARCADE.md: when the fighting starts, where the Krail comes
// from (rock or wrecks), and how fast the refits come. ARCADE_RUNS and
// ARCADE_TIME (environment) trade precision for speed. ARCADE_OUT overrides the path.

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
  const rows: string[] = [];
  for (const strat of STRATEGIES) {
    const res = Array.from({ length: RUNS }, (_, i) => fly(1000 + i * 7, strat, { maxTime: MAX }));
    const wreck = mean(res.map((r) => r.run.loot.wreck.krail)), rock = mean(res.map((r) => r.run.loot.rock.krail));
    const first = res.map((r) => r.refitAt[1]).filter((x): x is number => x !== undefined);
    rows.push(`| ${stratName(strat)} | ${mmss(mean(res.map((r) => r.run.time)))} | ${mean(res.map((r) => r.contacts)).toFixed(1)} | ${wreck.toFixed(0)} / ${rock.toFixed(0)} | ${Math.round((100 * wreck) / Math.max(1, wreck + rock))}% | ${first.length ? mmss(mean(first)) : '–'} | ${mean(res.map((r) => r.run.refit)).toFixed(1)} | ${Math.round(mean(res.map((r) => r.run.score))).toLocaleString('en-GB')} | ${res.filter((r) => r.run.cause === 'survived').length}/${res.length} |`);
  }
  const md = `# Arcade balance

Written by \`npm run pilot:arcade\`: ${RUNS} seeded runs per strategy, each capped at ${mmss(MAX)}.
Krail is from wrecks / from rock. The pilot flies the same seeds every time.

| Strategy | Mean time | Contacts | Krail wreck / rock | Wreck share | First refit | Refits | Score | Survived |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
  writeFileSync(OUT, md);
  console.log(md);
});
