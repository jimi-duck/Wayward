import type { Press } from './types';

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const UP = ['ArrowUp', 'KeyW'];
/** Button 1: lasers, held. */
const FIRE = ['Digit1', 'Numpad1', 'Space', 'KeyJ'];
/** Button 3: the cutter, held. */
const CUT = ['Digit3', 'Numpad3', 'KeyC', 'KeyL'];

/** Keys that toggle pause. Anything listening for "any key" must skip these. */
export const PAUSE_KEYS: readonly string[] = ['Escape', 'KeyP'];

const PRESSES: Record<string, Press> = {
  // button 2: one torpedo per press
  Digit2: 'torpedo',
  Numpad2: 'torpedo',
  KeyF: 'torpedo',
  KeyK: 'torpedo',
  KeyE: 'overcharge',
  ShiftLeft: 'roll',
  ShiftRight: 'roll',
  ...Object.fromEntries(PAUSE_KEYS.map((k) => [k, 'pause' as const])),
};

// Keys the game owns. Their default is always prevented: Space must never
// scroll anything, and arrows must never move focus.
const OWNED = new Set([...LEFT, ...RIGHT, ...UP, ...FIRE, ...CUT, 'ArrowDown', 'KeyS', ...Object.keys(PRESSES)]);

export class Keyboard {
  private held = new Set<string>();

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

  turn(): number {
    return (this.any(RIGHT) ? 1 : 0) - (this.any(LEFT) ? 1 : 0);
  }

  thrust(): number {
    return this.any(UP) ? 1 : 0;
  }

  fire(): boolean {
    return this.any(FIRE);
  }

  cut(): boolean {
    return this.any(CUT);
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
    // this guard a full overcharge would be spent on every repeat.
    const p = PRESSES[e.code];
    if (p && !e.repeat) this.onPress(p);
  };

  private up = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };
}
