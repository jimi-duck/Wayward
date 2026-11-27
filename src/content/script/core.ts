import type { Row } from '../../sim/script';
import { ADA, CORE_CATCHUP, CORE_MET } from '../story';
import { after, card, free } from './kit';

// ── ADA-1, the ship's Warden core ─────────────────────────────────────────
// Every line she says on the road, in road order, so her voice can be read in
// one place (sentient-ship plan, owner 2026-11-27: https://claude.ai/artifact/HciUREW2H4EuAeg434Wp86).
// She flew this hull with Ada Aster for decades, then sat shut in under
// Kellern's lock, watching, until Ned's reboot gave the ship back to her.
//
// Her voice: plain and dry, kind underneath; "I", sentence case, contractions
// (never capitals, which are the Voice's); "Juno", never "pilot"; 20 words a
// line at most, two a stop at most, never in a fight and never before the
// stop's own card. About one line in three is a memory that serves no plot.
// She never names a button, and every rule she mentions is also on the HUD.
// Her habit changes over the road: "Ada used to say…", then "I used to
// think…", then "I don't think Ada would agree with me."

/** Her first words back on the network, as the first relay wakes (sim/relaywake.ts): the record the old letter used to carry. */
export const CORE_FIRST = '“I can hear them again. First thing back: Krail reserves, the night they shut the lanes. Ninety-four per cent.”';

/** A flavour line of hers: dropped rather than played late (sim/script.ts `stale`). */
export const CORE_STALE = 150;

/** A small memory of hers after a relay wakes: flavour, so dropped if the stop is too busy to hear it. */
const memory = (id: string, stop: string, relayRow: string, text: string, extra: Partial<Row> = {}): Row =>
  core(id, stop, after(relayRow, 4), text, { stale: CORE_STALE, ...extra });

/** A line of hers on the road. */
export const core = (id: string, stop: string, on: Row['on'], text: string, extra: Partial<Row> = {}): Row =>
  ({ id, stop, on, do: { radio: { from: ADA, caller: 'core', text } }, ...extra });

export const CORE_ROWS: Row[] = [
  // ── Act II · the Reach: alone, and out of practice. Sam is still the warm voice; she speaks after him, one line a stop ──
  // Northfold: the lead Gran's letter used to give, then the ghost
  core('nf_core_ilse', 'northfold', free(8), '“Ada had a watch partner. Ilse Marrow. If she’s alive, she’s at Halden’s Reach.”'),
  core('nf_core_ghost', 'northfold', after('nf_sam_g1', 3), '“That isn’t a relay.”', { stale: CORE_STALE }),
  // Halden's Reach: Ilse half remembered, then the engine
  core('hr_core_ilse', 'halden', after('hr_ada', 3), '“Ilse. She cheated at cards on the long watches. I don’t remember her face.”'),
  memory('hr_core_mem', 'halden', 'hr_relay', '“She hated that engine. Said it sounded like a dying animal. I said it sounded worse when she flew.”'),
  // Tallyhouse: the initials, then the logs
  core('ml_core_lc', 'marlow', after('ml_sam_1', 4), '“Ada used to say L. C. had steady hands. I don’t know who L. C. is.”', { if: { has: ['clue_order_sig'] }, stale: CORE_STALE }),
  memory('ml_core_mem', 'marlow', 'ml_relay', '“When she couldn’t sleep, she’d ask me to read her the relay logs. Just the numbers.”'),
  // Miners' Gap: the singing (the buried mast is the HUD's to tell; the stop is busy before its relay)
  memory('bf_core_mem', 'branford', 'bf_relay', '“She sang when she fixed things. Badly. I never told her.”'),
  // Copperline: after the chase
  memory('cl_core_mem', 'copperline', 'cl_relay', '“She always took the port corridor. Said starboard was haunted. It was a loose panel.”'),

  // ── the Narrows: her old watch. The key line plays in the fight (as Ada's note does); the tea after it ──
  core('nr_core_key', 'narrows', after('nr_key', 1), '“This was her watch. I was here. I remember the lights going out.”'),
  core('nr_core_tea', 'narrows', { on: 'flag', flag: 'narrows_gate_open' }, '“She drank her tea cold on this watch. Said hot tea made her sleepy.”', { stale: CORE_STALE }),

  // a save that read the grandmother's old letter before ADA-1 had a voice (meta/save.ts marks it on load): she says who she is, once, at the
  // first free moment on the road
  card('core_catchup', '*', free(8), 'story_core_catchup', { if: { has: [CORE_CATCHUP], not: [CORE_MET] } }),
];
