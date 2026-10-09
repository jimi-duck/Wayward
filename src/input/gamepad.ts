import type { Aim, Press } from './types';

// Standard-mapping button indices.
const A = 0;
const B = 1;
const X = 2;
const RB = 5;
const RT = 7;
const BACK = 8;
const START = 9;
const L3 = 10;
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;

const PRESSES: Array<[number, Press]> = [
  [X, 'torpedo'],
  [B, 'roll'],
  [RB, 'roll'],
  [L3, 'brk'],
  [DPAD_DOWN, 'brk'],
  [START, 'pause'],
  [BACK, 'bay'],
];

// Hardware deadzone only: enough to stop a worn stick drifting the ship.
const DEAD = 0.15;

export interface PadState {
  turn: number;
  thrust: number;
  aim: Aim | null;
  /** A held: lasers. */
  fire: boolean;
}

const IDLE: PadState = { turn: 0, thrust: 0, aim: null, fire: false };

export class Gamepads {
  private prev: boolean[] = [];

  /** Read the first connected pad. Fires presses on the frame a button goes down. */
  poll(onPress: (p: Press) => void, onActive: () => void): PadState {
    const pad = typeof navigator.getGamepads === 'function'
      ? navigator.getGamepads().find((p) => p && p.connected)
      : null;
    if (!pad) {
      this.prev.length = 0;
      return IDLE;
    }
    const down = (i: number) => pad.buttons[i]?.pressed ?? false;
    let active = false;

    for (const [i, p] of PRESSES) {
      if (down(i) && !this.prev[i]) {
        onPress(p);
        active = true;
      }
    }
    this.prev = pad.buttons.map((b) => b.pressed);

    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    const mag = Math.min(1, Math.hypot(x, y));
    const aim = mag > DEAD ? { angle: Math.atan2(-y, x), mag: (mag - DEAD) / (1 - DEAD) } : null;
    const turn = (down(DPAD_RIGHT) ? 1 : 0) - (down(DPAD_LEFT) ? 1 : 0);
    const thrust = Math.max(pad.buttons[RT]?.value ?? 0, down(DPAD_UP) ? 1 : 0);

    const fire = down(A);
    if (aim || turn || fire || thrust > 0.05) active = true;
    if (active) onActive();
    return { turn, thrust, aim, fire };
  }
}
