// ── the uplink: waking a Warden relay ─────────────────────────────────────
// The Wayward is a Warden tender under Kellern's paint (plan "Reopen the
// spaceways", owner 24 November 2026). At a road gate's relay she wakes it
// herself: inside its ring the Warden core charges the relay, in three
// stages, while she moves and fights. Leaving the ring pauses the charge; it
// never drains. Each of the first two stages sends Custody a trace, and a wave
// comes. Woken, the relay overrides the lock and the gate opens. The Narrows
// keeps its own scene (sim/narrows.ts). Plain data: the relay's flag is the
// only thing saved.

/** Units from the mast within which the uplink charges. */
export const UPLINK_R = 45;
/** Seconds in the ring to wake a relay. */
export const UPLINK_TIME = 36;
/** Stages of the wake: lamps, the dish, the core. */
export const UPLINK_STAGES = 3;

/** One step of the charge: the new charge (0 to 1) and the stage just reached (1 to 3), or 0. */
export function stepUplink(charge: number, inRing: boolean, free: boolean, dt: number): { charge: number; stage: number } {
  if (!inRing || !free || charge >= 1) return { charge, stage: 0 };
  const next = Math.min(1, charge + dt / UPLINK_TIME);
  const before = Math.floor(charge * UPLINK_STAGES + 1e-9), after = Math.floor(next * UPLINK_STAGES + 1e-9);
  return { charge: next, stage: after > before ? after : 0 };
}

/** The wave a stage sends, by how far down the road the gate is (0: the first after the Narrows). Bigger later; none at the core. */
export function uplinkWave(stage: number, gate: number): Array<{ variant: 'picket' | 'lancer' | 'enforcer'; n: number }> {
  if (stage >= UPLINK_STAGES) return [];
  const pickets = Math.min(4, 2 + Math.floor(gate / 2));
  return stage === 1 ? [{ variant: 'picket', n: pickets }] : [{ variant: 'picket', n: pickets - 1 }, { variant: gate >= 3 ? 'enforcer' : 'lancer', n: 1 }];
}
