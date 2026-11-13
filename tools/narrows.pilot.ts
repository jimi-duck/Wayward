import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { newJourney, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { flyWorld, type Policy } from './pilot';

// ── the Narrows' gate-down scene ───────────────────────────────────────────
// `npm run pilot:narrows` flies the Narrows alone (sim/narrows.ts): a fresh
// starter fit (harder than a real run, which has a Reach's refits behind it),
// from arrival to the jump, by each answer policy. It prints how many got
// through, how many were wrecked, and the minutes and hull it took. Pilot
// numbers, not playtests (docs/BALANCE-ROAD.md).

const RUNS = Number(process.env.NARROWS_RUNS ?? 8);
const POLICIES: Policy[] = ['fight', 'bluff', 'run'];

function narrows(seed: number) {
  const j = newJourney(seed, false, 'road');
  const line = j.chart.systems.filter((s) => s.col >= 1 && s.col <= 9).sort((a, b) => a.col - b.col);
  j.trail = [j.chart.home, ...line.map((s) => s.id)];
  j.at = line[line.length - 1]!.id;
  j.status = 'sortie';
  j.dest = null;
  j.carry.flags.push('archive_woke', 'on_road');
  return j;
}

it('flies the Narrows', () => {
  const rows: string[] = [];
  for (const policy of POLICIES) {
    let through = 0, wrecked = 0, mins = 0, lost = 0, open = 0;
    const answers = new Map<string, number>();
    for (let seed = 1; seed <= RUNS; seed++) {
      const j = narrows(seed);
      const w = new World(seed * 17 + 3, { mode: 'breakout', sortie: sortieDef(j), carry: j.carry });
      const hull = w.plates;
      const r = flyWorld(w, seed * 13, { kind: 'focus', branch: 'torpedo', second: 'defence' }, { maxTime: 900, breakout: true, policy });
      const a = r.answers.find((x) => x.card === 'story_calloway_narrows')?.choice ?? 'none';
      answers.set(a, (answers.get(a) ?? 0) + 1);
      if (w.flags.has('narrows_gate_open')) open++;
      if (w.phase === 'over' && w.alive) { through++; mins += w.runTime / 60; lost += hull - w.plates; } else wrecked++;
    }
    rows.push(`| ${policy} | ${through}/${RUNS} | ${wrecked} | ${open}/${RUNS} | ${through ? (mins / through).toFixed(1) : '-'} | ${through ? (lost / through).toFixed(1) : '-'} | ${[...answers].map(([k, v]) => `${k} ${v}`).join(', ')} |`);
  }
  const out = ['| Policy | Through | Wrecked | Gate opened | Minutes | Plates lost | Calloway answer |', '|---|---|---|---|---|---|---|', ...rows].join('\n');
  writeFileSync(process.env.NARROWS_OUT ?? 'narrows-pilot.md', `${out}\n`);
}, 1_800_000);
