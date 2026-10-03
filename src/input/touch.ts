import { clamp } from '../core/math';
import type { Press } from './types';

// ── the touch controller ──────────────────────────────────────────────────
// The screen splits down the middle. The left half is the stick's: a thumb
// lands anywhere there and the ring comes to it, centred exactly under the
// thumb, so a touch never steers by itself. Drag past the ring's edge and
// the ring follows the thumb, so reversing a turn is always one ring's
// width away however far the thumb has wandered.
//
// The right half is the trigger's. A thumb on Torpedo or Release (or close
// to either) presses it; a thumb anywhere else on the right holds the
// phasers. A thumb that misses a button still fires, rather than doing
// nothing or, worse, anchoring the stick under the wrong thumb.
//
// Steering drives like a racing game: across turns the nose, any push away
// from the centre opens the throttle, and pulling back coasts. A second
// finger on the stick's side is a barrel roll.

/** How far the thumb travels for a full deflection, as a share of the ring's width. */
const TRAVEL = 0.4;
/** Slack round a small button, in CSS pixels, inside which a touch still counts as on it. */
const SLACK = 18;
/** Below this deflection the stick does nothing. */
export const STICK_DEAD = 0.12;

export interface TouchElements {
  layer: HTMLElement;
  stick: HTMLElement;
  knob: HTMLElement;
  /** The trigger: phasers, held. */
  fire: HTMLElement;
  /** A torpedo per tap. */
  torpedo: HTMLElement;
  /** The warp core, when it is full. */
  release: HTMLElement;
}

/**
 * A stick deflection (x right, y up, each -1 to 1) as a helm and a throttle.
 * Across is the helm, eased so a small push trims the nose and a full one
 * comes round hard. Any push opens the throttle (full from 70% out), except
 * one pulled back toward the player, which coasts.
 */
export function driveStick(x: number, y: number): { turn: number; thrust: number } {
  const m = Math.min(1, Math.hypot(x, y));
  if (m < STICK_DEAD) return { turn: 0, thrust: 0 };
  const ax = clamp((Math.abs(x) - 0.06) / 0.72, 0, 1);
  const turn = Math.sign(x) * ax * (0.4 + 0.6 * ax);
  const back = y < -0.35 * m && y < -0.3;
  const thrust = back ? 0 : clamp((m - 0.25) / 0.45, 0, 1);
  return { turn, thrust };
}

type Role = 'stick' | 'fire' | 'torpedo' | 'release' | 'roll';

export class TouchStick {
  /** The helm, -1 to 1, and the throttle, 0 to 1, from the stick. */
  turn = 0;
  thrust = 0;
  /** The trigger is held. */
  firing = false;

  private readonly roles = new Map<number, Role>();
  private stickId: number | null = null;
  private ox = 0;
  private oy = 0;
  private travel = 50;

  constructor(
    private readonly el: TouchElements,
    private readonly onPress: (p: Press) => void,
    private readonly onActive: () => void,
  ) {
    const { layer } = el;
    layer.addEventListener('pointerdown', this.down);
    layer.addEventListener('pointermove', this.move);
    layer.addEventListener('pointerup', this.up);
    layer.addEventListener('pointercancel', this.up);
    // Safety net: when the last finger lifts, nothing can still be held,
    // whatever pointer events a system gesture swallowed on the way.
    layer.addEventListener('touchend', (e) => { if (e.touches.length === 0) this.letGo(); });
    layer.addEventListener('touchcancel', (e) => { if (e.touches.length === 0) this.letGo(); });
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Let go of everything, e.g. when the game pauses under the thumbs. */
  letGo(): void {
    this.roles.clear();
    this.releaseStick();
    this.firing = false;
    this.el.fire.classList.remove('on');
  }

  private down = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    this.onActive();
    const role = this.pick(e.clientX, e.clientY);
    this.roles.set(e.pointerId, role);
    try { this.el.layer.setPointerCapture(e.pointerId); } catch { /* fine without */ }
    switch (role) {
      case 'stick': this.grab(e); break;
      case 'roll': this.onPress('roll'); break;
      case 'fire': this.firing = true; this.el.fire.classList.add('on'); break;
      case 'torpedo': this.onPress('torpedo'); this.blink(this.el.torpedo); break;
      case 'release': this.onPress('overcharge'); this.blink(this.el.release); break;
    }
  };

  private move = (e: PointerEvent): void => {
    if (e.pointerId !== this.stickId) return;
    e.preventDefault();
    this.track(e.clientX, e.clientY);
  };

  private up = (e: PointerEvent): void => {
    const role = this.roles.get(e.pointerId);
    if (!role) return;
    this.roles.delete(e.pointerId);
    if (role === 'stick') this.releaseStick();
    if (role === 'fire' && ![...this.roles.values()].includes('fire')) {
      this.firing = false;
      this.el.fire.classList.remove('on');
    }
  };

  /** What a new touch at (x, y) is for. */
  private pick(x: number, y: number): Role {
    if (x < window.innerWidth / 2) return this.stickId === null ? 'stick' : 'roll';
    if (inside(this.el.fire, x, y, 0)) return 'fire';
    let best: Role = 'fire', bestD = SLACK;
    for (const [node, role] of [[this.el.torpedo, 'torpedo'], [this.el.release, 'release']] as const) {
      const d = edgeDistance(node, x, y);
      if (d < bestD) { bestD = d; best = role; }
    }
    return best;
  }

  private grab(e: PointerEvent): void {
    const { stick } = this.el;
    this.stickId = e.pointerId;
    this.travel = (stick.offsetWidth || 120) * TRAVEL;
    this.ox = e.clientX;
    this.oy = e.clientY;
    stick.classList.add('free', 'on');
    this.track(e.clientX, e.clientY);
  }

  private track(x: number, y: number): void {
    let dx = x - this.ox, dy = y - this.oy;
    const d = Math.hypot(dx, dy), r = this.travel;
    // past the rim the ring is dragged along behind the thumb
    if (d > r) {
      const k = (d - r) / d;
      this.ox += dx * k;
      this.oy += dy * k;
      dx = x - this.ox;
      dy = y - this.oy;
    }
    const drive = driveStick(dx / r, -dy / r);
    this.turn = drive.turn;
    this.thrust = drive.thrust;
    const { stick, knob } = this.el;
    stick.style.transform = `translate3d(${this.ox.toFixed(1)}px,${this.oy.toFixed(1)}px,0) translate(-50%,-50%)`;
    knob.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) translate(-50%,-50%)`;
  }

  private releaseStick(): void {
    this.stickId = null;
    this.turn = 0;
    this.thrust = 0;
    const { stick, knob } = this.el;
    stick.classList.remove('on', 'free');
    stick.style.transform = knob.style.transform = '';
  }

  private blink(node: HTMLElement): void {
    node.classList.remove('on');
    void node.offsetWidth;
    node.classList.add('on');
  }
}

/** Is (x, y) inside the node's box, grown by `pad`? A hidden node never is. */
function inside(node: HTMLElement, x: number, y: number, pad: number): boolean {
  const r = node.getBoundingClientRect();
  return r.width > 0 && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

/** How far (x, y) is outside a round button's edge: negative inside, Infinity when hidden. */
function edgeDistance(node: HTMLElement, x: number, y: number): number {
  const r = node.getBoundingClientRect();
  if (!r.width) return Infinity;
  return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) - r.width / 2;
}
