import { leave, provoke, type Alien } from './enemies';
import { topSpeed } from './ship';
import type { World } from './world';

// ── speaking to a knot ────────────────────────────────────────────────────
// Stillwater, the Deep's set piece (living-world plan, 21 November 2026): a
// Thren knot hangs over Hester's rig. "Answer the pattern" (content/thren.ts)
// puts a knot in front of her that moves in a shape: it goes still, it
// circles, it goes still. She answers in kind, beside it: still, one loop
// round it, still. Answered, the knot lifts off the rig and leaves. A shot
// at it, or too long, and it comes on. Plain data: the tests play it.

/** The flag the card's answer sets, and the ones the knot leaves. */
export const SPEAK_FLAG = 'still_speak';
export const SPOKEN = 'still_spoken';
export const SPEAK_FAILED = 'still_fought';
/** Beside the knot: inside this (units); the loop is flown between these. */
const NEAR = 75;
const LOOP_IN = 28;
const LOOP_OUT = 130;
/** Seconds to hold still; a still ship is under this share of top speed. */
const STILL = 3;
const SLOW = 0.12;
/** Seconds before the knot loses patience. */
const LIMIT = 150;
/** The knot: so many motes on a ring this wide. */
const MOTES = 6;
const RING = 22;

export type SpeakStep = 'still' | 'loop' | 'again' | 'done' | 'failed';

export class Speak {
  readonly x: number; readonly z: number;
  motes: Alien[] = [];
  step: SpeakStep = 'still';
  /** Seconds held still (the two still steps), and the loop flown so far (radians). */
  hold = 0;
  turned = 0;
  clock = 0;
  private lastA: number | null = null;

  constructor(w: World) {
    const b = w.bk!, s = w.ship;
    const dx = b.lane.x - s.x, dz = b.lane.z - s.z, d = Math.hypot(dx, dz) || 1;
    this.x = s.x + (dx / d) * 110; this.z = s.z + (dz / d) * 110;
    for (let i = 0; i < MOTES; i++) {
      const a = (i / MOTES) * Math.PI * 2;
      const al = w.spawnHostile('mote', { x: this.x + Math.cos(a) * RING, y: w.rng.range(-1, 1), z: this.z + Math.sin(a) * RING }, null, true);
      al.canCloak = false; al.cloak = 0; al.mode = 'drift'; al.escort = false; al.job = true;
      al.ward = { act: 'hold', temper: 'wary', hx: this.x, hz: this.z, ring: RING, warned: 0, tag: 'Thren knot' };
      this.motes.push(al);
    }
  }

  get live(): boolean { return this.step !== 'done' && this.step !== 'failed'; }

  /** What the HUD says now (English keys), and how far along the step is, 0 to 1. */
  get line(): string {
    return this.step === 'still' ? 'The knot is still · go still beside it' : this.step === 'loop' ? 'It circles · fly one loop round it' : 'Still again · hold beside it';
  }
  get progress(): number { return this.step === 'loop' ? Math.min(1, Math.abs(this.turned) / (Math.PI * 2)) : Math.min(1, this.hold / STILL); }

  /** A mote was hit: the knot comes on. */
  shot(w: World, al: Alien): void {
    if (this.live && this.motes.includes(al)) this.fail(w);
  }

  tick(w: World, dt: number): void {
    this.motes = this.motes.filter((a) => w.aliens.includes(a));
    if (!this.live) return;
    if (!this.motes.length) return this.fail(w);
    this.clock += dt;
    const s = w.ship, d = Math.hypot(s.x - this.x, s.z - this.z);
    // the knot shows the step it wants: still, a slow wheel, still
    const spin = this.step === 'loop' ? w.runTime * 1.1 : 0.2 * Math.sin(w.runTime * 0.8);
    for (const [i, a] of this.motes.entries()) {
      const th = (i / this.motes.length) * Math.PI * 2 + spin;
      a.mode = 'drift';
      a.ax = this.x + Math.cos(th) * RING; a.az = this.z + Math.sin(th) * RING;
    }
    const still = Math.hypot(s.vx, s.vz) < topSpeed(w.hull) * SLOW;
    if (this.step === 'still' || this.step === 'again') {
      if (d < NEAR && still) this.hold += dt; else this.hold = Math.max(0, this.hold - dt);
      if (this.hold >= STILL) {
        if (this.step === 'again') return this.answered(w);
        this.step = 'loop'; this.hold = 0; this.turned = 0; this.lastA = null;
      }
    } else {
      // one loop round it, at any speed, inside the band
      if (d > LOOP_IN && d < LOOP_OUT) {
        const a = Math.atan2(s.z - this.z, s.x - this.x);
        if (this.lastA !== null) { let da = a - this.lastA; da = Math.atan2(Math.sin(da), Math.cos(da)); this.turned += da; }
        this.lastA = a;
      } else if (d >= LOOP_OUT) { this.turned = 0; this.lastA = null; }
      if (Math.abs(this.turned) >= Math.PI * 2) { this.step = 'again'; this.hold = 0; }
    }
    if (this.clock > LIMIT) this.fail(w);
  }

  private answered(w: World): void {
    this.step = 'done';
    for (const a of this.motes) { a.job = false; leave(a); }
    w.applyOutcome({ text: '', flag: SPOKEN, calm: 120, standing: { miners: 1 } }, 1, []);
    w.events.push({ type: 'storyNotice', tone: 'teal', headline: 'The knot answers', reason: 'it lifts off the rig' });
  }

  private fail(w: World): void {
    this.step = 'failed';
    for (const a of this.motes) { a.job = false; provoke(a, w.events); }
    w.flags.add(SPEAK_FAILED);
    w.events.push({ type: 'storyNotice', tone: 'red', headline: 'The knot comes on', reason: 'it did not hear you' });
  }
}
