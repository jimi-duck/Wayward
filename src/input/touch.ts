import type { Aim, Press } from './types';

// ── one floating thumbstick ────────────────────────────────────────────────
// Ported from the original. The guns fire themselves, so the whole screen is
// the stick's catchment: press anywhere and the ring comes to the thumb
// instead of the thumb hunting for a ring in a corner. The ring is anchored
// far enough from the edges that the full throw is reachable every way.

const EDGE = 6; // px kept between the ring and the screen edge
const KNOB_INSET = 14; // px the knob stops short of the ring

export interface TouchElements {
  layer: HTMLElement;
  stick: HTMLElement;
  knob: HTMLElement;
  release: HTMLElement;
  roll: HTMLElement;
}

export class TouchStick {
  aim: Aim | null = null;
  private pointer: number | null = null;

  constructor(
    private readonly el: TouchElements,
    private readonly onPress: (p: Press) => void,
    private readonly onActive: () => void,
  ) {
    const { layer, release, roll } = el;
    layer.addEventListener('pointerdown', this.down);
    layer.addEventListener('pointermove', this.move);
    layer.addEventListener('pointerup', this.up);
    layer.addEventListener('pointercancel', this.up);
    // The button sits inside the stick's catchment, so it has to stop the
    // event as well as use it, or every tap on it also anchors the stick
    // under the other thumb.
    release.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onActive();
      this.onPress('overcharge');
    });
    roll.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onActive();
      this.onPress('roll');
    });
  }

  /** Let go of the stick, e.g. when the game pauses under the thumb. */
  letGo(): void {
    this.pointer = null;
    this.aim = null;
    const { stick, knob } = this.el;
    stick.classList.remove('on', 'free');
    stick.style.left = stick.style.top = '';
    knob.style.transform = '';
  }

  private down = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    // A second finger while the stick is held is a barrel roll.
    if (this.pointer !== null) {
      e.preventDefault();
      this.onPress('roll');
      return;
    }
    e.preventDefault();
    this.onActive();
    this.pointer = e.pointerId;
    const { layer, stick } = this.el;
    const half = stick.offsetWidth / 2 || 70;
    const x = clamp(e.clientX, half + EDGE, window.innerWidth - half - EDGE);
    const y = clamp(e.clientY, half + EDGE, window.innerHeight - half - EDGE);
    stick.classList.add('free', 'on');
    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
    try {
      layer.setPointerCapture(e.pointerId);
    } catch {
      // capture is a nicety; the stick still works without it
    }
    this.track(e);
  };

  private move = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointer) return;
    e.preventDefault();
    this.track(e);
  };

  private up = (e: PointerEvent): void => {
    if (e.pointerId === this.pointer) this.letGo();
  };

  private track(e: PointerEvent): void {
    const { stick, knob } = this.el;
    const r = stick.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - KNOB_INSET;
    const mag = max > 0 ? Math.min(1, Math.hypot(dx, dy) / max) : 0;
    const screenAngle = Math.atan2(dy, dx); // y down, for the knob
    this.aim = { angle: -screenAngle, mag }; // y up, for the game
    const kx = Math.cos(screenAngle) * mag * max;
    const ky = Math.sin(screenAngle) * mag * max;
    knob.style.transform = `translate(-50%,-50%) translate(${kx.toFixed(1)}px,${ky.toFixed(1)}px)`;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
