import type { Row } from '../../sim/script';
import { ADA, CORE_CATCHUP, CORE_MET } from '../story';
import { after, card, flag, free } from './kit';

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
  // Northfold: the lead the old letter used to give, then the ghost
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

  // ── Act II · the Marches and the Belt: remembering. Sam is gone, so she is the voice aboard; the Belt holds Ada's death ──
  core('mw_core', 'm_wake', after('mw_edge', 4), '“No Sam past the Narrows. Just me. I’m out of practice at company.”', { stale: CORE_STALE }),
  memory('mk_core_mem', 'm_kessel', 'mk_relay', '“Ada used to say a moot is a fight with chairs. She went to every one.”'),
  core('ri_core_adrift', 'rift', { on: 'near', site: 'mast', within: 300 }, '“It’s tumbling. Keep with it. I’ll keep talking.”', { stale: CORE_STALE }),
  // a gate relay gives back three things: Ada's note, the record (a Wall row, set by the note's row) and her own memory of it
  core('ri_core_note', 'rift', after('ri_note', 3), '“She says she never read the names out. She did. To me.”'),
  core('bk_core_cutter', 'b_kessler', after('bk_after', 4), '“This was her cutter. She died out here. I kept thinking she’d come back for the ship.”'),
  core('sg_core_note', 'scrapgate', after('sg_note', 3), '“She asked if I minded carrying them. Nobody had asked me anything before.”'),

  // ── the Drift Deep and the Breaker Yards: questioning. "Ada used to say" turns into "I used to think" ──
  core('dm_core_jam', 'd_lantern', after('dm_relay_say', 10), '“That isn’t static. Something’s singing over me.”', { stale: CORE_STALE }),
  core('dh_core_voice', 'd_hush', after('dh_voice', 3), '“They’re older than me. They’re not like me.”'),
  core('sd_core_note', 'slowdoor', after('sd_note', 3), '“Ada used to say the fence kept people safe. I used to think she believed it.”'),
  // Keelberth: she carries Sam's voice down the relays she woke (his card follows), then the thirsty relay
  core('yk_core_voice', 'y_keel', free(2), '“I can carry a voice down the lit relays now. Someone’s asking for you.”'),
  core('yk_core_tank', 'y_keel', after('yk_relay_say', 4), '“Relays drink the same fluid your drive does. Keep the tank up.”', { stale: CORE_STALE }),
  core('br_core_note', 'breaker', after('br_note', 3), '“I checked her sums before she carried them in. They were right. That’s the worst part.”'),

  // ── the Free Ports: what Ada was afraid of ──
  core('fg_core_property', 'f_gilt', after('fg_thane_core', 4), '“Property, not testimony. All those years shut in, and I’m still somebody’s asset.”'),
  core('fm_core_dark', 'f_mirren', flag('relay_dark_f_mirren'), '“I used to think Ada was always right about relays. Leave it dark.”', { stale: CORE_STALE }),
  core('tg_core_note', 'tollgate', after('tg_note', 3), '“She was brave, Juno. But don’t mistake that for never being afraid.”'),

  // ── Act III · the Hollows and the Seam: her own ──
  // Hollowforge's loud relay is hers to tell now (legs.ts hf_relay_say speaks as ADA-1, a main line)
  core('hc_core_echo', 'h_cairn', after('hc_two', 3), '“It wants out of its orders. I know what shut in feels like.”'),
  // note 7, then her card (arrivals.ts se_implant waits on this line: it never goes stale)
  core('se_core_note', 'seam', flag('warden_note_7'), '“Ada was scared of what the Thren would answer. I’m not. I don’t think she’d agree with me.”'),
  // after the Seam, every line of hers checks she isn't resting (implant_burned): after "Rest now" she says nothing more

  // a save that read the grandmother's old letter before ADA-1 had a voice (meta/save.ts marks it on load): she says who she is, once, at the
  // first free moment on the road
  card('core_catchup', '*', free(8), 'story_core_catchup', { if: { has: [CORE_CATCHUP], not: [CORE_MET] } }),
];
