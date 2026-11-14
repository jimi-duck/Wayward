import type { Row } from '../../sim/script';
import { ACCOUNTS, ANALYST, flag, free, radio } from './kit';

// ── the present-day evidence ──────────────────────────────────────────────
// Four Wall clues that show the Severance still running (docs/STORY_DIRECTION.md
// §3): the allocation tables, the debt transfer clause, the attrition schedule,
// the sealed Survey reports. Each row sets its clue (`wall`) as it triggers;
// each answers a broadcast the player has already heard (content/wall.ts `says`).

export const EVIDENCE_ROWS: Row[] = [
  // Marlow: Brook's second set of books
  radio('ev_allocation', 'marlow', flag('frag_ledger'), 'Adam Brook', 'kellern', '“Read the second set too. Fuel tables. The Merit Grants column is forty years of zeros.”', { wall: 'clue_allocation' }),

  // Tamsin Field: the debt has a history
  radio('ev_debt', 'm_tamsin', free(30), ACCOUNTS[0], ACCOUNTS[1], '“Clause nine, Ms Aster: debt passes to heirs. Your grandmother’s became your mother’s, then yours.”', { wall: 'clue_debt_clause' }),

  // Kiln: the witness typed it; if the witness never got out, the word does anyway (at Tarik's Lamps)
  radio('ev_attrition', 'b_kiln', flag('job_the_witness_won'), 'Brother Orrin', 'gutter', '“Kellern priced it. An attrition schedule: which settlements fail, which year. I typed it.”', { wall: 'clue_attrition' }),
  radio('ev_attrition_late', 'b_tarik', free(30), 'A Gutter runner', 'gutter', '“Orrin got word out anyway. Kellern keeps an attrition schedule: which settlements fail, and when.”', { wall: 'clue_attrition', if: { not: ['clue_attrition'] } }),

  // Lantern Mile: the Survey, off the record
  radio('ev_survey', 'd_lantern', free(30), ANALYST[0], ANALYST[1], '“Off the record: our readings rise with extraction. Every year. Every report gets sealed.”', { wall: 'clue_survey' }),
];
