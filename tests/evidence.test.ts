import { describe, expect, it } from 'vitest';
import { WALL, WALL_BY_FLAG } from '../src/content/wall';
import { EVIDENCE_ROWS } from '../src/content/script/evidence';
import { SCRIPT } from '../src/content/script';
import { wallView } from '../src/sim/wall';

// The present-day evidence (docs/STORY_DIRECTION.md §3): four Wall clues, each set by a road row, each answering a broadcast.
describe('present-day evidence', () => {
  const CLUES = ['clue_allocation', 'clue_debt_clause', 'clue_attrition', 'clue_survey'];

  it('every clue is on the Wall, answers a broadcast and is set by a row in the script', () => {
    for (const f of CLUES) {
      expect(WALL_BY_FLAG[f], f).toBeDefined();
      expect(WALL_BY_FLAG[f]!.says, f).toBeTruthy();
      expect(SCRIPT.some((r) => r.wall === f), f).toBe(true);
    }
    for (const r of EVIDENCE_ROWS) expect(SCRIPT).toContain(r);
  });

  it('every link names a real Wall row', () => {
    for (const w of WALL) for (const l of w.links ?? []) expect(WALL_BY_FLAG[l], `${w.flag} → ${l}`).toBeDefined();
  });

  it('ties two found rows together, both ways, and nothing unfound', () => {
    const v = wallView(['frag_ledger', 'clue_allocation'], 0);
    expect(v.ties.clue_allocation).toContain(WALL_BY_FLAG.frag_ledger!.name);
    expect(v.ties.frag_ledger).toContain(WALL_BY_FLAG.clue_allocation!.name);
    expect(wallView(['clue_allocation'], 0).ties.clue_allocation ?? []).toEqual([]);
  });
});
