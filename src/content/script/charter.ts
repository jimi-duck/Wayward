import type { Row } from '../../sim/script';
import { CHARTER_FORGED, CHARTER_STRIPPED } from '../../sim/charter';
import { CPS } from './broadcasts';
import { card, flag, free, leave, notice, radio } from './kit';

// ── the Charter on the road ───────────────────────────────────────────────
// The class line in play (docs/STORY_DIRECTION.md §2): the work lane at the
// first gate, the service berths at Kellern ports, a Bonded mother who cannot
// cross, Val's forged Charter at Kiln, and what follows it. The Bonded rate
// at the pumps is sim/charter.ts. Flavour rows go stale; Val's card does not.

const near = (within: number): Row['on'] => ({ on: 'near', site: 'port', within });
const BONDED = { not: [CHARTER_FORGED] };

export const CHARTER_ROWS: Row[] = [
  // ── the Reach: who may move ──
  radio('ch_mother', 'northfold', free(55), 'A mother at Northfold', 'frontier', '“My girl needs the clinic at Halden. Bonded, no pass. They turned us back at the gate.”', { stale: 200 }),
  notice('ch_lane', 'northfold', leave(), 'amber', 'Work lane', 'Bonded hulls wait for a pass', { if: BONDED }),
  notice('ch_berth_halden', 'halden', near(320), 'amber', 'Service berth', 'No Charter · Bonded side only', { if: BONDED }),
  notice('ch_berth_marlow', 'marlow', near(320), 'amber', 'Service berth', 'No Charter · Bonded side only', { if: BONDED }),
  notice('ch_berth_nine', 'y_nine', near(320), 'amber', 'Service berth', 'No Charter · Bonded side only', { if: BONDED }),

  // ── the Belt: a Charter for sale ──
  card('ch_offer', 'b_kiln', free(40), 'charter_offer'),
  radio('ch_welcome', '*', flag(CHARTER_FORGED), CPS, 'office', '“Welcome, Chartered citizen. Your safety is our continuity. Report contract residents travelling without passes.”', { stale: 300 }),
  radio('ch_stripped', '*', flag(CHARTER_STRIPPED), 'Val · a broker of the Gutter', 'gutter', '“Lost it already? I don’t do refunds, love.”', { stale: 300 }),
];
