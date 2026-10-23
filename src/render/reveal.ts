// ── the rename reveal ─────────────────────────────────────────────────────
// Sam's code lifts the owner lock (the `ship_stolen` flag, set once by the story card's answer) and the ship takes
// her new identity in about two and a half seconds (the owner's rename reveal kit, 2026-10-22):
//   0.00–0.35  the lock lifts: the HUD's centre notice says so, the hull is still grey
//   0.35–1.45  one amber band crosses the hull from bow to stern; the plate behind it is ochre
//   1.45–2.35  the camera swings about 24° round the ship (only when no hostile gun can reach her)
//   2.40       the registry card (`story_rename`, a follow-up of the Sam card) pauses the game over that view
// After the card is answered the camera eases back. The flag is the livery: this only decides how it is shown, so a
// save made at any point loads straight into the ochre hull with no replay. Reduced motion: ochre at once, no arc.
// No Three.js here, so the timing is tested headless.

export const LOCK_AT = 0.35;
export const SWEEP_END = 1.45;
export const ARC_END = 2.35;
/** Seconds the camera takes to ease back once the card is answered. */
const BACK = 0.9;
/** The arc gives up if no card came (a save, a death, a jump) by then. */
const GIVE_UP = 12;

export interface RevealFrame {
  /** 0 grey to 1 ochre, when no sweep is running. */
  livery: number;
  /** Where the band is along the hull (-1 bow, +1 stern) while it crosses; null otherwise. */
  sweep: number | null;
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
  private held = false;
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
        this.held = false;
        this.release = -1;
      }
    }
    if (!i.stolen) this.known = false;
    if (this.t0 < 0) return { livery: i.stolen ? 1 : 0, sweep: null, arc: 0 };

    const e = i.time - this.t0;
    const sweep = e >= LOCK_AT && e < SWEEP_END ? -1 + 2 * smooth((e - LOCK_AT) / (SWEEP_END - LOCK_AT)) : null;
    const livery = e < LOCK_AT ? 0 : 1;

    let arc = 0;
    if (this.orbit) {
      if (i.paused && e >= SWEEP_END) this.held = true;
      // a gun in range, the card answered, or no card at all: the camera comes back
      const done = (this.held && !i.paused) || (!i.paused && !i.calm) || e > GIVE_UP;
      if (done && this.release < 0) { this.release = 0; this.back = smooth((e - SWEEP_END) / (ARC_END - SWEEP_END)); }
      if (this.release >= 0) {
        this.release += i.paused ? 0 : dt;
        arc = this.back * (1 - smooth(this.release / BACK));
      } else arc = smooth((e - SWEEP_END) / (ARC_END - SWEEP_END));
    }
    const over = e >= SWEEP_END && (!this.orbit || (this.release >= BACK));
    if (over) { this.t0 = -1; return { livery: 1, sweep: null, arc: 0 }; }
    return { livery, sweep, arc };
  }
}
