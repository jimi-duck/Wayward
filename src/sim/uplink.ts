// ── the uplink: waking a Warden relay ─────────────────────────────────────
// The Wayward is a Warden tender under Kellern's paint (plan "Reopen the
// spaceways", owner 24 November 2026). At a road gate's relay she wakes it
// herself: inside its ring the Warden core charges the relay, in three
// stages, while she moves and fights. Leaving the ring pauses the charge; it
// never drains. Each of the first two stages sends Custody a trace, and a wave
// comes. Woken, the relay overrides the lock and the gate opens. The Narrows
// keeps its own scene (sim/narrows.ts). Plain data: the relay's flag is the
// only thing saved.

import { RELAY_WAVES, type WaveRow, type WaveTier } from '../content/waves';

/** Units from the mast within which the uplink charges. */
export const UPLINK_R = 45;
/** Seconds in the ring to wake a relay. */
export const UPLINK_TIME = 36;
/** A buried relay's rock: its radius and hull (a bulwark that sits on the mast until she mines it away). */
export const BURIED_R = 10;
export const BURIED_HP = 150;
/** A guarded relay: how many hulls sit on it, how near she comes before they move, and how near the mast a hostile holds the charge. */
export const GUARDS = 2;
export const GUARD_WAKE = 450;
export const GUARD_HOLD = 65;
/** An adrift relay's tumble: a slow figure of eight (seconds a loop, its half-widths along and across, and how far out from the mast's stand it is centred). */
export const ADRIFT_LOOP = 110;
export const ADRIFT_A = 60;
export const ADRIFT_B = 30;
export const ADRIFT_OUT = 70;
/** How near she comes before an adrift relay is told, and how near the mast she holds the ring while locals wake a given one. */
export const ADRIFT_TELL = 450;
export const GIVEN_R = 260;
/** The flag that says the moot stood with her, so Kessel's crews wake its relay (content/road.ts LEG_RELAYS). */
export const GIVEN_FLAG = 'pact_holdfast';
/** A split relay's three masts, each woken in turn (one a stage): units back from the gate and across from where the first stands. */
export const SPLIT_MASTS: ReadonlyArray<{ back: number; across: number }> = [{ back: 0, across: 0 }, { back: 130, across: -80 }, { back: 70, across: 95 }];
/** Stages of the wake: lamps, the dish, the core. */
export const UPLINK_STAGES = 3;

/** How fast the charge runs while a tether hunter sits on the mast (content/waves.ts): it drags, it does not stop. */
export const HUNTED_RATE = 1 / 3;

/** One step of the charge at `rate` (1 free, 0 held): the new charge (0 to 1) and the stage just reached (1 to 3), or 0. */
export function stepUplink(charge: number, inRing: boolean, rate: number, dt: number): { charge: number; stage: number } {
  if (!inRing || rate <= 0 || charge >= 1) return { charge, stage: 0 };
  const next = Math.min(1, charge + (dt * rate) / UPLINK_TIME);
  const before = Math.floor(charge * UPLINK_STAGES + 1e-9), after = Math.floor(next * UPLINK_STAGES + 1e-9);
  return { charge: next, stage: after > before ? after : 0 };
}

/** The wave a stage sends, from the relay's tier (content/waves.ts RELAY_WAVES): bigger down the road; none at the core. */
export function uplinkWave(stage: number, tier: WaveTier): readonly WaveRow[] {
  return stage >= 1 && stage < UPLINK_STAGES ? RELAY_WAVES[tier][stage - 1]! : [];
}

/** A hauler captain on the radio, a few seconds after a relay has opened its gate: the lane is live again (one per gate, in turn). */
export const LANE_LINES = [
  '“Gate’s live? First time in years. Whoever lit it, thank you.”',
  '“That gate’s been dark since my mother flew it. Who woke it?”',
  '“Lane’s open! Haulers, form up. We’re going through.”',
  '“Warden signal on the gate. I haven’t seen that since I was a boy.”',
] as const;
