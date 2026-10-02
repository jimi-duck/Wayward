import { Gamepads } from './gamepad';
import { Keyboard } from './keyboard';
import { TouchStick, type TouchElements } from './touch';
import type { Device, InputFrame, Press } from './types';

/**
 * Every input device, merged into one InputFrame per simulation step.
 * Presses (roll, overcharge) are queued as they happen and consumed by the
 * next step, so a press is never lost between steps and never read twice when
 * one display frame runs two steps. Pause goes straight to `onPause`.
 */
export class Input {
  device: Device;
  /** The most recent frame handed to the simulation, for the debug readout. */
  last: InputFrame | null = null;

  private readonly presses = new Set<Exclude<Press, 'pause'>>();
  private readonly keyboard: Keyboard;
  private readonly touch: TouchStick;
  private readonly pads = new Gamepads();

  constructor(
    touchEls: TouchElements,
    private readonly onPause: () => void,
  ) {
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.device = coarse ? 'touch' : 'keyboard';
    if (coarse) document.documentElement.classList.add('touch-ui');

    this.keyboard = new Keyboard(window, this.press, () => this.use('keyboard'));
    this.touch = new TouchStick(touchEls, this.press, () => this.use('touch'));
  }

  sample(): InputFrame {
    const pad = this.pads.poll(this.press, () => this.use('gamepad'));
    const frame: InputFrame = {
      turn: Math.max(-1, Math.min(1, this.keyboard.turn() + pad.turn)),
      thrust: Math.max(this.keyboard.thrust(), pad.thrust),
      aim: this.touch.aim ?? pad.aim,
      roll: this.presses.has('roll'),
      overcharge: this.presses.has('overcharge'),
      device: this.device,
    };
    this.presses.clear();
    this.last = frame;
    return frame;
  }

  /** Drop everything held or queued, e.g. when the game loses focus. */
  reset(): void {
    this.presses.clear();
    this.touch.letGo();
  }

  private press = (p: Press): void => {
    if (p === 'pause') this.onPause();
    else this.presses.add(p);
  };

  private use(d: Device): void {
    this.device = d;
    // Touch controls appear the first time a finger lands, so a laptop with
    // a touchscreen gets them only once it is used that way.
    if (d === 'touch') document.documentElement.classList.add('touch-ui');
  }
}
