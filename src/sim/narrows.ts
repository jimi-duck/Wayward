// ── the Narrows: the key opens the gate ───────────────────────────────────
// Custody has locked the Narrows' Jump Gate. Ada's key at the old relay
// overrides the lock: when her note closes, the gate is open at once
// (`narrows_gate_open`, owner 28 November 2026: no more waiting to fly
// through) and the blockade (the Kind Regard and two pickets) comes for the
// Wayward. The Patience calls PATIENCE_AT seconds in: Juno and Calloway's
// first encounter. She asks who Juno is and why she carries Ada's key; nothing
// is bargained (owner, 14 November 2026). The world runs it (sim/world.ts
// `stepNarrows`); the lines are content/script/narrows.ts.

/** Seconds the gate takes to reboot under Ada's key. */
export const REBOOT = 90;
/** Seconds into the reboot that the Patience comes on the scope, and her card a moment after. */
export const PATIENCE_AT = 1;
export const PATIENCE_CARD = 1.5;
/** The card Calloway calls with. */
export const PATIENCE = 'story_calloway_narrows';
/** Set as the reboot starts, and as the gate opens. */
export const REBOOTING = 'narrows_reboot';
export const GATE_OPEN = 'narrows_gate_open';
/** The note whose closing starts the reboot. */
export const NOTE = 'warden_note_1';

/** Where the scene stands: before the note, the gate down, or over (or never: a journey that reaches the Narrows with the note already read). */
export type NarrowsState = 'idle' | 'reboot' | 'done';
