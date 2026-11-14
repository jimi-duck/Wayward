import type { Row } from '../../sim/script';
import { THANE } from '../hearing';
import { CPS } from './broadcasts';
import { flag, free, main, radio } from './kit';

// ── Thane's hearing at Gilt Market (content/hearing.ts) ───────────────────
// The card, then what the Office says about it.

export const HEARING_ROWS: Row[] = [
  main('fg_hearing', 'f_gilt', free(45), 'story_hearing'),
  radio('fg_hearing_brook', 'f_gilt', flag('brook_struck'), THANE, 'office', '“Entered. Mr Brook, your Charter is withdrawn, effective now. Your family’s with it.”'),
  radio('fg_hearing_brook_2', 'f_gilt', flag('brook_struck'), 'Adam Brook', 'kellern', '“Contract Resident Brook. It has a ring to it. Keep flying.”', { stale: 120 }),
  radio('fg_hearing_sealed', 'f_gilt', flag('hearing_sealed'), CPS, 'office', '“A document in the Aster matter has been sealed for review. There is nothing further to report.”'),
  radio('fg_hearing_forgery', 'f_gilt', flag('hearing_forgery'), CPS, 'office', '“The Office of Public Record finds the Aster file a forgery. The matter is closed.”'),
];
