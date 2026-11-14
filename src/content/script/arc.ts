import type { Row } from '../../sim/script';
import { CALLOWAY } from '../arc';
import { after, card, flag, free, radio } from './kit';

// ── Calloway and Juno, leg by leg (content/arc.ts) ────────────────────────
// After the Narrows she watches before she speaks again, and every offer she
// makes later has a reason she has found on the way.

const CAL = (id: string, stop: string, on: Row['on'], text: string, extra: Partial<Row> = {}): Row => radio(id, stop, on, CALLOWAY, 'calloway', text, { stale: 200, ...extra });

export const ARC_ROWS: Row[] = [
  // the Marches: she studies her from a distance
  radio('arc_wake', 'm_wake', after('mw_edge', 8), 'Intercepted · CCV Patience', 'calloway', '“Pull everything on Contract Resident Aster. Every port, every scan. I want to know how she thinks.”', { stale: 200 }),
  CAL('arc_saints', 'm_tamsin', flag('saints_helped'), '“Eleven conscripts, Juno. Bonded, like you. I’d like to hear how that was freedom.”'),
  CAL('arc_saints_warned', 'm_tamsin', flag('saints_stopped'), '“You warned my conscripts. A thief with a conscience. That’s new.”'),

  // the Belt: she has read the file, and calls
  card('arc_file', 'b_exchange', after('bx_val', 40), 'calloway_file'),

  // the Yards: what freedom costs
  CAL('arc_yard', 'y_torch', after('rs_seized', 12), '“A yard with no breakers. When the Thren come through, who holds the line? You?”'),
  CAL('arc_passes', 'y_torch', after('rs_passes', 12), '“Passes for crew families. You bargained like one of us. Careful.”'),

  // the Free Ports: the first offer, and it is a hook (a clean name for a question owed)
  card('arc_name', 'f_saltquay', free(40), 'offer_identity'),
];
