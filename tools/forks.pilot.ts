import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { regionOf, regionDef } from '../src/sim/chart';
import { forks } from '../src/sim/forks';
import { newJourney, type Journey } from '../src/sim/journey';
import type { RegionSet } from '../src/content/regions';

// ── the fork audit ────────────────────────────────────────────────────────
// `npm run pilot:forks` lays out charts from many seeds, stands the ship in
// every system that has a choice of lanes, and asks whether the lanes differ
// in something a player can weigh: the kind of place, its style, a port, a
// breather, a place already sighted, the days, the jump fluid (by 4 or more),
// or whether it leaves the gate nearer. A fork whose lanes differ on at most
// one of those is "thin": a coin toss with a different name. Writes
// docs/BALANCE-FORKS.md. FORK_SEEDS trades precision for speed.

const SEEDS = Number(process.env.FORK_SEEDS ?? 60);
const SETS: RegionSet[] = ['three', 'eight'];

/** What a lane offers, as the axes a player can weigh. */
function axes(j: Journey): { n: number; axes: string[] } | null {
  const fs = forks(j);
  if (fs.length < 2) return null;
  const differs = (f: (x: (typeof fs)[number]) => unknown) => new Set(fs.map(f)).size > 1;
  const out: string[] = [];
  if (differs((x) => x.to.kind)) out.push('kind');
  if (differs((x) => x.stance)) out.push('style');
  if (differs((x) => !!x.to.port)) out.push('port');
  if (differs((x) => !!x.to.quiet && !x.netted)) out.push('breather');
  if (differs((x) => x.place?.id ?? '')) out.push('place');
  if (differs((x) => x.days)) out.push('days');
  if (differs((x) => x.heat)) out.push('heat');
  if (Math.max(...fs.map((x) => x.fuel)) - Math.min(...fs.map((x) => x.fuel)) >= 4) out.push('fluid');
  // the choice as the player feels it: kind and the gate's distance are labels, the rest are costs and opportunities
  if (!out.some((k) => ['style', 'port', 'breather', 'place', 'days', 'fluid', 'heat'].includes(k))) out.push('TIGHT');
  if (differs((x) => x.nearer)) out.push('gate');
  return { n: fs.length, axes: out };
}

it('audits the forks', { timeout: 300000 }, () => {
  const rows: string[] = [];
  const total: Record<string, { forks: number; thin: number; same: number; sizes: Record<number, number>; axisHits: Record<string, number> }> = {};
  const examples: string[] = [];
  for (const set of SETS) {
    const t = { forks: 0, thin: 0, same: 0, sizes: {} as Record<number, number>, axisHits: {} as Record<string, number> };
    total[set] = t;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const j = newJourney(seed * 7919, false, set);
      for (const s of j.chart.systems) {
        if (s.kind === 'home' || s.kind === 'edge') continue;
        j.at = s.id;
        const a = axes(j);
        if (!a) continue;
        t.forks++;
        t.sizes[a.n] = (t.sizes[a.n] ?? 0) + 1;
        for (const x of a.axes) t.axisHits[x] = (t.axisHits[x] ?? 0) + 1;
        if (a.axes.includes('TIGHT')) t.same++;
        if (a.axes.filter((x) => x !== 'TIGHT').length <= 1) {
          t.thin++;
          if (examples.length < 6 && set === 'eight') examples.push(`${regionDef(j.chart, regionOf(s))?.name} · ${s.name}: ${forks(j).map((f) => `${f.to.name} (${f.to.kind}, ${f.days}d, ${f.fuel})`).join(' / ')}`);
        }
      }
    }
  }
  rows.push('# Balance: forks', '', `Seeds per set: ${SEEDS}. A fork is a system with two or more lanes on. "Thin": the lanes differ on at most one thing a player can weigh. "No cost or opportunity apart": same style, port, breather, place, days and jump fluid within 3 (only the kind and the gate distance differ).`, '');
  for (const set of SETS) {
    const t = total[set]!;
    rows.push(`## ${set} regions`, '', `- forks ${t.forks}, thin ${t.thin} (${((100 * t.thin) / Math.max(1, t.forks)).toFixed(1)}%), no cost or opportunity apart ${t.same} (${((100 * t.same) / Math.max(1, t.forks)).toFixed(1)}%)`,
      `- lanes per fork: ${Object.entries(t.sizes).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      `- forks where the lanes differ in each: ${Object.entries(t.axisHits).filter(([k]) => k !== 'TIGHT').map(([k, v]) => `${k} ${((100 * v) / Math.max(1, t.forks)).toFixed(0)}%`).join(', ')}`, '');
  }
  rows.push('## Thin forks, examples', '', ...examples.map((e) => `- ${e}`), '');
  writeFileSync('docs/BALANCE-FORKS.md', rows.join('\n'));
  console.log(rows.join('\n'));
});
