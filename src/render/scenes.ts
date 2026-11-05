// ── story scenes ──────────────────────────────────────────────────────────
// A scene is a short, still-world camera moment at a key beat. All three use the same arc the rename reveal made
// (camera.ts REVEAL_*: round to her flank, lower, further off):
//   Sam's code     the rename reveal itself (render/reveal.ts), once, when the lock lifts
//   gate arrivals  the arrival sweep (render/sector.ts arriveSweep): wide and high, then in behind her
//   the endings    this file: the Threshold panel's world holds on her flank while the file is read
// Presentation only: the ship and her physics never move. Reduced motion: the camera stays behind her. No Three.js,
// so the timing is tested headless.

/** Seconds the camera takes to swing round to her flank, and to come back. */
export const SCENE_IN = 5;
export const SCENE_OUT = 1.6;

const smooth = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** A held arc: eases up to 1 while `on`, back to 0 after. Runs on interface time, so it plays in a paused world. */
export class SceneArc {
  private t = 0;

  update(on: boolean, dt: number, reduced: boolean): number {
    if (reduced) { this.t = 0; return 0; }
    this.t = on ? Math.min(1, this.t + dt / SCENE_IN) : Math.max(0, this.t - dt / SCENE_OUT);
    return smooth(this.t);
  }
}
