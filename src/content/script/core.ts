import type { Row } from '../../sim/script';
import { ADA, CORE_CATCHUP, CORE_MET } from '../story';
import { card, free } from './kit';

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

/** A line of hers on the road. */
export const core = (id: string, stop: string, on: Row['on'], text: string, extra: Partial<Row> = {}): Row =>
  ({ id, stop, on, do: { radio: { from: ADA, caller: 'core', text } }, ...extra });

export const CORE_ROWS: Row[] = [
  // a save that read the grandmother's old letter before ADA-1 had a voice (meta/save.ts marks it on load): she says who she is, once, at the
  // first free moment on the road
  card('core_catchup', '*', free(8), 'story_core_catchup', { if: { has: [CORE_CATCHUP], not: [CORE_MET] } }),
];
