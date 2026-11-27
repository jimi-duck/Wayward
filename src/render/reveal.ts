// ── the rename reveal ─────────────────────────────────────────────────────
// Ned's yard paints and renames her in the dark (sim/postjump.ts): the `hull_repainted` flag turns on as the light comes back, and the
// ship is already in her new colours (owner, 27 November 2026: no painting animation). What plays is the camera:
//   0.60–6.00  it swings slowly round to her flank and pulls back (only when no hostile gun can reach her)
//   6.00–7.20  the view holds on her flank, then the camera eases back
// The flag is the livery: this only decides how it is shown, so a save made at any point loads straight into the new paint with no
// replay. Reduced motion: no arc. No Three.js here, so the timing is tested headless.

const ARC_START = 0.6;
export const ARC_END = 6;
/** When the camera starts back, after a moment held on her flank. */
export const HOLD_END = 7.2;
/** Seconds the camera takes to ease back. */
const BACK = 1.6;

export interface RevealFrame {
  /** 0 grey, 1 her new paint: the flag, as it stands. */
  livery: number;
  /** 0 to 1: the camera's arc. */
  arc: number;
}

export interface RevealInput {
  /** The world's flag: the owner lock is lifted. */
  stolen: boolean;
  /** Game seconds (stops while the game is paused). */
  time: number;
  /** True while the game is paused for a card or a menu. */
  paused: boolean;
  /** No hostile gun can reach the ship now. */
  calm: boolean;
  reduced: boolean;
}

const smooth = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export class RenameReveal {
  private known: boolean | null = null;
  private t0 = -1;
  private orbit = false;
  private release = -1;
  private back = 0;

  /** Forget the last world (a new run or a load): the next frame's flag is taken as it stands, without a reveal. */
  reset(): void {
    this.known = null;
    this.t0 = -1;
    this.release = -1;
    this.back = 0;
  }

  /** True while the reveal is playing (from the lock lifting to the camera settling back). */
  get active(): boolean {
    return this.t0 >= 0;
  }

  update(i: RevealInput, dt: number): RevealFrame {
    if (this.known === null) this.known = i.stolen;
    if (!this.known && i.stolen) {
      this.known = true;
      if (!i.reduced) {
        this.t0 = i.time;
        this.orbit = i.calm;
        this.release = -1;
      }
    }
    if (!i.stolen) this.known = false;
    const livery = i.stolen ? 1 : 0;
    if (this.t0 < 0) return { livery, arc: 0 };

    const e = i.time - this.t0;

    let arc = 0;
    if (this.orbit) {
      // a gun in range, or the view has been held long enough: the camera comes back
      const done = (!i.paused && !i.calm) || e >= HOLD_END;
      if (done && this.release < 0) { this.release = 0; this.back = smooth((e - ARC_START) / (ARC_END - ARC_START)); }
      if (this.release >= 0) {
        this.release += i.paused ? 0 : dt;
        arc = this.back * (1 - smooth(this.release / BACK));
      } else arc = smooth((e - ARC_START) / (ARC_END - ARC_START));
    }
    if (!this.orbit || this.release >= BACK) { this.t0 = -1; return { livery, arc: 0 }; }
    return { livery, arc };
  }
}
