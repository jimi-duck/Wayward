// ── the Narrows: the gate goes down ────────────────────────────────────────
// Custody has locked the Narrows' Jump Gate. Ada's key at the old relay
// overrides the lock and knocks the gate offline: when her note closes, the
// gate reboots under her key for REBOOT seconds, its damping field down, and
// the blockade (the Kind Regard and two pickets) comes for the Wayward. The
// Patience calls PATIENCE_AT seconds in; Calloway's answer changes the fight
// (`patience_hold`: she calls the pickets off; a lie caught: two more come).
// Then the gate opens (`narrows_gate_open`). The world runs it
// (sim/world.ts `stepNarrows`); the lines are content/script/narrows.ts.

/** Seconds the gate takes to reboot under Ada's key. */
export const REBOOT = 90;
/** Seconds into the reboot that the Patience comes on the scope, and her card a moment after. */
export const PATIENCE_AT = 25;
export const PATIENCE_CARD = 4;
/** The card Calloway calls with. */
export const PATIENCE = 'story_calloway_narrows';
/** Set as the reboot starts, and as the gate opens. */
export const REBOOTING = 'narrows_reboot';
export const GATE_OPEN = 'narrows_gate_open';
/** Calloway called the pickets off (her card: the truth, or a lie she believed). */
export const HOLD_FIRE = 'patience_hold';
/** The note whose closing starts the reboot. */
export const NOTE = 'warden_note_1';

/** Where the scene stands: before the note, the gate down, or over (or never: a journey that reaches the Narrows with the note already read). */
export type NarrowsState = 'idle' | 'reboot' | 'done';
