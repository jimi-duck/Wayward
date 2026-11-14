import type { Row } from '../../sim/script';
import { arrive, flag, notice } from './kit';

// ── the Belt chase (sim/journey.ts beltChased) ────────────────────────────
// Val's route trade sold Juno's heading to the Offices: pickets come fast at
// Kiln and Tarik's Lamps, and wait at the Scrapgate. Paying Val to forget, or
// jamming her channel, shakes them.

const HUNTED = { not: ['vell_paid', 'vell_exposed'] };

export const CHASE_ROWS: Row[] = [
  notice('bc_kiln', 'b_kiln', arrive(4), 'red', 'Pickets inbound', 'someone sold your heading', { if: HUNTED }),
  notice('bc_tarik', 'b_tarik', arrive(4), 'red', 'Still hunted', 'pickets on your heading', { if: HUNTED }),
  notice('bc_cold', '*', flag('vell_paid'), 'teal', 'Trail cold', 'the pickets lose your heading'),
  notice('bc_jammed', '*', flag('vell_exposed'), 'teal', 'Heading dark', 'the Offices hear nothing more'),
];
