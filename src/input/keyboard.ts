import type { Press } from './types';

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const UP = ['ArrowUp', 'KeyW'];
/** Share of full turn rate a fresh key press gets, and seconds to wind up to full. */
const TURN_TAP = 0.5;
const TURN_WIND = 0.35;
/** Button 1: lasers, held. */
const FIRE = ['Digit1', 'Numpad1', 'Space', 'KeyJ'];

/** Keys that toggle pause. Anything listening for "any key" must skip these. */
export const PAUSE_KEYS: readonly string[] = ['Escape', 'KeyP'];

const PRESSES: Record<string, Press> = {
  // button 2: one torpedo per press
  Digit2: 'torpedo',
  Numpad2: 'torpedo',
  KeyF: 'torpedo',
  KeyK: 'torpedo',
  ArrowDown: 'brk',
  KeyS: 'brk',
  ShiftLeft: 'roll',
  ShiftRight: 'roll',
  ...Object.fromEntries(PAUSE_KEYS.map((k) => [k, 'pause' as const])),
};

// Keys the game owns. Their default is always prevented: Space must never
// scroll anything, and arrows must never move focus.
const OWNED = new Set([...LEFT, ...RIGHT, ...UP, ...FIRE, 'ArrowDown', 'KeyS', ...Object.keys(PRESSES)]);

export class Keyboard {
  private held = new Set<string>();
  private dir = 0;
  private held_s = 0;
  private lastTurn = 0;

  constructor(
    target: Window,
    private readonly onPress: (p: Press) => void,
    private readonly onActive: () => void,
  ) {
    target.addEventListener('keydown', this.down);
    target.addEventListener('keyup', this.up);
    // A key released while the window is not focused never sends its keyup,
    // and a stuck helm key flies the ship into a wall on return.
    target.addEventListener('blur', () => this.held.clear());
  }

  /**
   * A key is on or off, so the turn is eased by hand: a tap trims the nose at
   * about half rate and a hold winds up to full rate over TURN_WIND seconds.
   * This lives here, not in the sim, so the scripted pilots are unchanged.
   */
  turn(now = performance.now()): number {
    const dir = (this.any(RIGHT) ? 1 : 0) - (this.any(LEFT) ? 1 : 0);
    const dt = Math.min(0.1, Math.max(0, (now - this.lastTurn) / 1000));
    this.lastTurn = now;
    if (dir === 0 || dir !== this.dir) this.held_s = 0;
    else this.held_s += dt;
    this.dir = dir;
    if (dir === 0) return 0;
    return dir * (TURN_TAP + (1 - TURN_TAP) * Math.min(1, this.held_s / TURN_WIND));
  }

  thrust(): number {
    return this.any(UP) ? 1 : 0;
  }

  fire(): boolean {
    return this.any(FIRE);
  }

  private any(codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  private down = (e: KeyboardEvent): void => {
    // Leave browser shortcuts alone (reload, devtools, tab switching).
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!OWNED.has(e.code)) return;
    e.preventDefault();
    this.onActive();
    this.held.add(e.code);
    // A press is a press, not a hold: a held key repeats keydown, and without
    // this guard a torpedo would be spent on every repeat.
    const p = PRESSES[e.code];
    if (p && !e.repeat) this.onPress(p);
  };

  private up = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };
}
