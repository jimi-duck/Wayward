import type { Row } from '../../sim/script';
import { THANE } from '../hearing';
import { CPS } from './broadcasts';
import { flag, free, main, radio } from './kit';

// ── Thane's hearing at Gilt Market (content/hearing.ts) ───────────────────
// The card; the launch through the scan cordon (sim/cordon.ts); then what the Office says about it.

export const HEARING_ROWS: Row[] = [
  main('fg_hearing', 'f_gilt', free(45), 'story_hearing'),
  radio('fg_launch', 'f_gilt', flag('hearing_launch'), THANE, 'office', '“The Registry launch will carry it in. Custody scans the approach for Bonded hulls. Keep close to the launch.”'),
  // the ruling's last word is about the ship (sentient-ship plan): ADA-1 answers it (content/script/core.ts)
  radio('fg_thane_core', 'f_gilt', flag('hearing_in'), THANE, 'office', '“Entered. One thing for the record: a ship’s memory is property, not testimony.”'),
  radio('fg_hearing_brook', 'f_gilt', flag('hearing_in'), THANE, 'office', '“Entered. Mr Brook, your Charter is withdrawn, effective now. Your family’s with it.”', { if: { has: ['brook_struck'] } }),
  radio('fg_hearing_brook_2', 'f_gilt', flag('hearing_in'), 'Adam Brook', 'kellern', '“Contract Resident Brook. It has a ring to it. Keep flying.”', { if: { has: ['brook_struck'] }, stale: 120 }),
  radio('fg_hearing_sealed', 'f_gilt', flag('hearing_in'), CPS, 'office', '“A document in the Aster matter has been sealed for review. There is nothing further to report.”', { if: { has: ['hearing_sealed'] } }),
  radio('fg_hearing_forgery', 'f_gilt', flag('hearing_forgery'), CPS, 'office', '“The Office of Public Record finds the Aster file a forgery. The matter is closed.”'),
];
