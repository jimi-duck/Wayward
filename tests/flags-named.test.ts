import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Story flags are plain strings: a card's answer sets one, a beat, an ending or the world reads it. A flag spelt one
// way where it is set and another where it is read fails silently: the beat just never plays. So every flag named in
// the code must be named at least twice (set and read), unless it is on the list below.

/**
 * Flags named only once, on purpose: set for the record (save, a later idea) and not read yet, or read or set through
 * a built name (`claim_paid_${who}`, `job_${id}_won`, `relay_ok_${script}`). A new flag belongs here only if it is
 * one of those; otherwise the other half is missing or misspelt.
 */
const ONCE = new Set([
  'owes_calloway', 'calloway_known', 'claim_paid_frontier', 'claim_fought_frontier', 'claim_fought_guild',
  'seam_asked', 'seam_key_kept', 'calloway_seen_before', 'calloway_alone', 'toll_broken', 'bounty_taken', 'raced',
  'drop_made', 'zone_cleared', 'vein_found', 'hauler_saved', 'claim_won', 'payroll_taken', 'cache_taken',
  'prospector_robbed', 'ransom_sold', 'bend_sold', 'gouged', 'voice_recorded', 'voice_asked_how', 'voice_refused',
  'voice_door', 'voice_thren', 'object_cut', 'cut_hulk', 'signal_fed', 'missing_hauler', 'helped_settlement',
  'supplied_cell', 'voice_led', 'scanned', 'vell_collected', 'vell_settled', 'relay_ok_f_mirren', 'job_wanted_won',
  'oren_owned', 'hearing_cold', 'hearing_made',
  'thread_crews_2', 'thread_crews_4', 'thread_line_1', 'job_missing_shift_tell', 'job_heavy_tanker_warn', 'relay_rift', 'relays_4',
  'thren_drawn_h_cinder',
]);

const files: string[] = [];
const walk = (d: string): void => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!p.endsWith(join('i18n', 'de'))) walk(p); } else if (p.endsWith('.ts')) files.push(p);
  }
};
walk('src');
const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');

/** Every flag the code names where a flag is set, cleared or read. */
function flagNames(): Set<string> {
  const names = new Set<string>();
  for (const m of all.matchAll(/\bflag\s*:\s*'([a-z][a-z0-9_]+)'/g)) names.add(m[1]!);
  for (const m of all.matchAll(/\b(?:flags|allFlags|has|not)\s*:\s*\[([^\]]*)\]/g)) for (const n of m[1]!.matchAll(/'([a-z][a-z0-9_]+)'/g)) names.add(n[1]!);
  for (const m of all.matchAll(/flags\.(?:has|add|delete)\(\s*'([a-z][a-z0-9_]+)'/g)) names.add(m[1]!);
  return names;
}

const mentions = (n: string): number => all.split(`'${n}'`).length - 1 + all.split(`"${n}"`).length - 1;

describe('story flags', () => {
  it('are each named where set and where read', () => {
    const lone = [...flagNames()].filter((n) => mentions(n) <= 1 && !ONCE.has(n));
    expect(lone).toEqual([]);
  });

  it('list as named-once only flags that still are', () => {
    const names = flagNames();
    expect([...ONCE].filter((n) => !names.has(n) || mentions(n) > 1)).toEqual([]);
  });
});
