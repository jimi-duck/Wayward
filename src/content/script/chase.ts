import type { Row } from '../../sim/script';
import { arrive, flag, notice } from './kit';

// ── the chases (content/road.ts LEG_CHASES, sim/journey.ts chaseAt) ─────────
// One hunted stop a leg, each with a red notice on arrival saying who comes
// and why. In the Belt, Val's route trade sold Juno's heading to the Offices:
// pickets come fast at Kiln and Tarik's Lamps, and wait at the Scrapgate.
// Paying Val to forget, or jamming her channel, shakes them.

const HUNTED = { not: ['vell_paid', 'vell_exposed'] };

export const CHASE_ROWS: Row[] = [
  notice('lc_branford', 'branford', arrive(4), 'red', 'Custody cutters', 'the stolen hull is posted'),
  notice('lc_gannet', 'm_gannet', arrive(4), 'red', 'Kellern security', 'the rigs first, then you'),
  notice('lc_still', 'd_still', arrive(4), 'red', 'Custody behind', 'they follow you into the swarm'),
  notice('lc_torch', 'y_torch', arrive(4), 'red', 'Yard security', 'Draper wants the strike broken'),
  notice('lc_penny', 'f_penny', arrive(4), 'red', 'Governor’s pickets', 'everyone wants your copy'),
  notice('lc_forge', 'h_forge', arrive(4), 'red', 'Foundry drones', 'the Voice has your pattern'),
  notice('lc_dusk', 'l_dusk', arrive(4), 'red', 'The Patience’s pickets', 'Calloway wants you slowed'),
  // Kiln's cordon (sim/cordon.ts): the pickets wait on the lane; the chase comes only if they see her
  notice('bc_kiln', 'b_kiln', arrive(4), 'amber', 'Custody cordon ahead', 'someone sold your heading', { if: HUNTED }),
  notice('bc_tarik', 'b_tarik', arrive(4), 'red', 'Still hunted', 'pickets on your heading', { if: HUNTED }),
  notice('bc_cold', '*', flag('vell_paid'), 'teal', 'Trail cold', 'the pickets lose your heading'),
  notice('bc_jammed', '*', flag('vell_exposed'), 'teal', 'Heading dark', 'the Offices hear nothing more'),
];
