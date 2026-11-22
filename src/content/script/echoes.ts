import type { Row } from '../../sim/script';
import { CALLOWAY } from '../arc';
import { SAINTS } from '../resistance';
import { after, arrive, free, notice, PIKE, radio, settle } from './kit';

// ── echoes: the road remembers (story plan, item 7; owner, 16 November 2026) ──
// Choices that were recorded and never heard of again come back here, one
// short radio line each, a leg or more later, from someone who was there.
// They also give the thinner stops (Longwater, Mute Hall, Ghostcinder,
// Lastlight) something to see or hear. Flavour only: `stale` drops a line that
// waits too long for a quiet sky, so none ever holds the gate.

const S = { stale: 150 } as const;
const OREN = ['Oren Lisle', 'frontier'] as const;
const INES = ['Ines Duarte', 'guild'] as const;
const BROOK = ['Adam Brook', 'kellern'] as const;
const ODUYA = ['Councillor Oduya', 'holdfast'] as const;
const DRIFT = ['Longwater lamp-keeper', 'frontier'] as const;
const GANNET = ['Gannet crew', 'miners'] as const;

export const ECHO_ROWS: Row[] = [
  // the Marches: what she told Calloway at the Narrows
  radio('ec_named', 'm_walk', settle(), CALLOWAY, 'calloway', '“Juno Aster. A name makes a file so much easier to keep.”', { if: { has: ['calloway_named'] }, ...S }),
  radio('ec_asked', 'm_walk', settle(), CALLOWAY, 'calloway', '“You asked what I want with Ada. I’m still deciding what you want.”', { if: { has: ['calloway_ada'] }, ...S }),
  radio('ec_silent', 'm_walk', settle(), CALLOWAY, 'calloway', '“Nothing to say at the Narrows. The file says plenty for you.”', { if: { has: ['calloway_silent'] }, ...S }),

  // the Belt: the Saints' relay she walked past
  radio('ec_saints', 'b_breakwater', settle(), SAINTS, 'unknown', '“You flew past Tamsin. Custody kept its relay. We buried ours.”', { if: { has: ['saints_ignored'] }, ...S }),

  // the Drift Deep, Longwater: hand-lit lamps, and word from Kiln
  notice('ec_lamps', 'd_longwater', after('dl_notice', 6), 'white', 'Drift lamps', 'a chain of hand-lit beacons'),
  radio('ec_lampkeeper', 'd_longwater', settle(), DRIFT[0], DRIFT[1], '“Lamps are lit for you. Keep your guns cold past the Ferry.”', S),
  radio('ec_witness', 'd_longwater', after('ec_lampkeeper', 10), PIKE[0], PIKE[1], '“The witness you got out of Kiln talked. Val’s buyers have names now.”', { if: { has: ['witness_saved'] }, ...S }),

  // the Breaker Yards: the crew she pulled out at Gannet Reach
  radio('ec_crew', 'y_cutton', settle(), GANNET[0], GANNET[1], '“Gannet’s missing shift says hello. The yards know your hull now.”', { if: { has: ['crew_saved'] }, ...S }),

  // the Hollows: Ines, refused at Gilt Market
  radio('ec_ines', 'h_ashdeep', settle(), INES[0], INES[1], '“You turned down a very good price at Gilt. Few do. I remember them.”', { if: { has: ['ines_refused'] }, ...S }),
  // Mute Hall: Calloway, quietly, in a quiet place
  radio('ec_mute', 'h_cairn', free(40), CALLOWAY, 'calloway', '“Quiet out here. I could almost forget I’m meant to stop you.”', { if: { has: ['calloway_curious'] }, ...S }),
  // Ghostcinder: a dead foundry on the lane
  notice('ec_cinder', 'h_cinder', arrive(10), 'white', 'A dead foundry', 'its furnaces still warm'),

  // the Last Lanes, Lastlight: who is still with her
  radio('ec_brook', 'l_lastlight', settle(), BROOK[0], BROOK[1], '“I read your file at every dock since you got me out. People listen.”', { if: { has: ['brook_free'] }, ...S }),
  radio('ec_oduya', 'l_lastlight', settle(), ODUYA[0], ODUYA[1], '“Kessel heard your file read aloud. We still stand with you.”', { if: { has: ['oduya_name'] }, ...S }),
  // Lone Step: Oren remembers her first answer
  radio('ec_oren_heir', 'l_step', arrive(6), OREN[0], OREN[1], '“A Warden’s heir, you said. Heirs inherit what she owed, too.”', { if: { has: ['oren_heir'] }, ...S }),
  radio('ec_oren_pilot', 'l_step', arrive(6), OREN[0], OREN[1], '“A hauler pilot, you said. Pilots still choose the heading.”', { if: { has: ['oren_pilot'] }, ...S }),
];
