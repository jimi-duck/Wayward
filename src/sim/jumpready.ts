// ── the moment escape becomes possible ────────────────────────────────────
// The HUD shows jump fluid as have/need. This says when it crosses: once up to
// "ready" and, if the need rises (a heavy part) or the tank falls, once down
// to "lost". It counts from the first look of a system (a ship that arrives
// full is not news) and the port's refuel screen says it itself, so docked
// the ready is kept quiet. The fall has a margin, so pickups right at the
// line do not flicker it.

/** The tank has to fall this far under the need before the ready is lost. */
export const JUMP_HYST = 0.5;

export type JumpSignal = 'jumpReady' | 'jumpLost';

export class JumpWatch {
  private ready: boolean | null = null;

  /** `fuel` and `need` in jump fluid; `docked`: at a port. Returns what changed, if anything. */
  step(fuel: number, need: number, docked: boolean): JumpSignal | null {
    const up = fuel >= need;
    if (this.ready === null) { this.ready = up; return null; }
    if (!this.ready && up) { this.ready = true; return docked ? null : 'jumpReady'; }
    if (this.ready && fuel < need - JUMP_HYST) { this.ready = false; return 'jumpLost'; }
    return null;
  }
}
