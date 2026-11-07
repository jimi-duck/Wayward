import { angleDelta } from '../core/math';
import type { Alien } from './enemies';
import type { Rng } from './rng';
import type { ShipState } from './ship';

// ── the pack ──────────────────────────────────────────────────────────────
// Light hulls in a fight do not take turns at you: the pack calls a play.
// Each member is given a station round the ship (a bearing off the ship's
// nose and a distance) and flies to it ('muster'), guns on you and firing
// as it comes; when the stations are taken, or the set time runs out, the
// whole pack goes at once. After the run each member is its own hull again
// until the pack calls the next play.
//
//   pincer · two or three stations spread round you: one run from every side
//   hammer · one hull (the bait) sits off your nose and weaves; the rest swing
//            round astern and come in on your tail together
//   wheel  · three or more circle you, evenly spaced, the ring turning and
//            tightening, shooting as they go; then all break in
//   sweep  · a line abreast out ahead, then straight through you on parallel
//            lines
//
// Plays are rows (PLAYS); `station` is the only geometry. Everything draws
// from the world's rng, so a seed plays the same.

export type PlayId = 'pincer' | 'hammer' | 'wheel' | 'sweep';
export type PlayRole = 'wing' | 'bait' | 'hammer' | 'ring' | 'line';

/** A member's part in the current play. */
export interface Part {
  id: PlayId;
  role: PlayRole;
  /** Bearing off the ship's nose (radians, + is to port) and distance of its station. */
  ang: number; R: number;
  /** Lateral offset on its run (the sweep's lines). */
  off: number;
  /** Set when the pack goes: the member breaks from its station into a run. */
  go: boolean;
  /** Seconds since it was cast (turns a wheel, closes its ring). */
  t: number;
}

export interface PlayDef {
  /** Fewest and most members. */
  min: number; max: number;
  weight: number;
  /** Seconds the pack waits for its stations before it goes anyway. */
  set: number;
  /** Ring spin (rad/s) while mustering, and how far the ring closes (share of R) by the go. */
  spin?: number; close?: number;
}

export const PLAYS: Record<PlayId, PlayDef> = {
  pincer: { min: 2, max: 3, weight: 3, set: 4.5 },
  hammer: { min: 2, max: 4, weight: 2.5, set: 5 },
  wheel:  { min: 3, max: 5, weight: 2, set: 6, spin: 0.35, close: 0.3 },
  sweep:  { min: 2, max: 4, weight: 1.5, set: 4.5 },
};
const PLAY_ORDER = Object.keys(PLAYS) as PlayId[];

/** Seconds between plays (after one ends), and the range a member must be within to be drafted. */
export const PACK = { gap: [5, 9] as const, reach: 150, first: 1.5 } as const;

/** Modes a light hull can be drafted from: fighting, or closing to fight (a hull still looking you over is not drafted). */
const DRAFT = new Set(['approach', 'setup', 'extend', 'hold', 'cover', 'peek', 'line']);

/** Can this hull take part in a play? */
export const draftable = (al: Alien) =>
  !al.ward && !al.job && !al.fleeing && !al.play && (al.kind === 'scout' || al.kind === 'raptor' || al.kind === 'stalker') && DRAFT.has(al.mode);

/** Where a member's station is now: round the ship, turning with it (and with the ring, for a wheel). */
export function station(p: Part, s: ShipState): { x: number; z: number } {
  const t = p.t;
  const d = PLAYS[p.id];
  const a = s.heading + p.ang + (d.spin ? d.spin * t : 0);
  const R = p.R * (d.close ? 1 - d.close * Math.min(1, t / d.set) : 1);
  // led by the ship's drift, so a member holds its place on a moving ship instead of trailing it
  return { x: s.x + s.vx * 0.6 + Math.cos(a) * R, z: s.z + s.vz * 0.6 - Math.sin(a) * R };
}

export class Pack {
  /** The play running, its members (Alien ids) and seconds since it was called. */
  play: PlayId | null = null;
  members: number[] = [];
  t = 0;
  /** Seconds until the next play may be called. */
  next: number = PACK.first;
  /** Plays called, by id (for the pilots and tests). */
  readonly called: Record<PlayId, number> = { pincer: 0, hammer: 0, wheel: 0, sweep: 0 };

  step(dt: number, aliens: Alien[], s: ShipState, rng: Rng): void {
    if (this.play) {
      this.t += dt;
      // members that died, ran, or finished their run drop out
      this.members = this.members.filter((id) => aliens.some((a) => a.id === id && a.play && !a.fleeing));
      const ms = this.members.map((id) => aliens.find((a) => a.id === id)!);
      if (!ms.length) { this.end(rng); return; }
      if (!ms[0]!.play!.go) {
        const ready = ms.every((a) => { const p = station(a.play!, s); return Math.hypot(p.x - a.x, p.z - a.z) < 12; });
        if (ready || this.t >= PLAYS[this.play].set) for (const a of ms) a.play!.go = true;
      }
      return;
    }
    if ((this.next -= dt) > 0) return;
    const pool = aliens.filter((a) => draftable(a) && Math.hypot(a.x - s.x, a.z - s.z) < PACK.reach);
    if (pool.length < 2) { this.next = 0.5; return; }
    const id = this.pick(pool.length, rng);
    if (!id) { this.next = 0.5; return; }
    const def = PLAYS[id];
    // the nearest hulls are drafted; the rest carry on as they were
    pool.sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z));
    const ms = pool.slice(0, def.max);
    this.cast(id, ms, s, rng);
    for (const a of ms) { a.mode = 'muster'; a.modeT = def.set + 4; a.peeks = 0; }
    this.play = id;
    this.members = ms.map((a) => a.id);
    this.t = 0;
    this.called[id]++;
  }

  private pick(n: number, rng: Rng): PlayId | null {
    const ok = PLAY_ORDER.filter((p) => n >= PLAYS[p].min);
    let total = 0;
    for (const p of ok) total += PLAYS[p].weight;
    let r = rng.next() * total;
    for (const p of ok) { r -= PLAYS[p].weight; if (r <= 0) return p; }
    return ok[ok.length - 1] ?? null;
  }

  /** Hand out the parts: each member gets the station nearest its own bearing, so nobody crosses the ship to reach it. */
  private cast(id: PlayId, ms: Alien[], s: ShipState, rng: Rng): void {
    const n = ms.length, side = rng.next() < 0.5 ? 1 : -1;
    const slots: Array<Omit<Part, 'id' | 'go' | 't'>> = [];
    if (id === 'pincer') {
      const spread = n === 2 ? [Math.PI / 2, -Math.PI / 2] : [Math.PI * 0.62, -Math.PI * 0.62, Math.PI];
      for (let i = 0; i < n; i++) slots.push({ role: 'wing', ang: spread[i]! + rng.range(-0.25, 0.25), R: rng.range(38, 48), off: rng.range(2, 5) });
    } else if (id === 'hammer') {
      slots.push({ role: 'bait', ang: rng.range(-0.3, 0.3), R: rng.range(30, 36), off: 3 });
      for (let i = 1; i < n; i++) slots.push({ role: 'hammer', ang: Math.PI + side * (i - n / 2) * 0.5, R: rng.range(40, 50), off: rng.range(2, 4) });
    } else if (id === 'wheel') {
      for (let i = 0; i < n; i++) slots.push({ role: 'ring', ang: (i / n) * Math.PI * 2 * side, R: rng.range(40, 46), off: rng.range(1, 4) });
    } else {
      // the line out ahead, abreast across your course
      for (let i = 0; i < n; i++) {
        const lat = (i - (n - 1) / 2) * 10;
        slots.push({ role: 'line', ang: Math.atan2(lat, 55), R: Math.hypot(55, lat), off: lat * 0.5 });
      }
    }
    // greedy: the member nearest each slot takes it
    const left = [...ms];
    for (const sl of slots) {
      const want = s.heading + sl.ang;
      let bi = 0, bd = Infinity;
      left.forEach((a, i) => {
        const d = Math.abs(angleDelta(want, Math.atan2(-(a.z - s.z), a.x - s.x)));
        if (d < bd) { bd = d; bi = i; }
      });
      const a = left.splice(bi, 1)[0]!;
      a.play = { id, ...sl, go: false, t: 0 };
    }
  }

  private end(rng: Rng): void {
    this.play = null;
    this.members = [];
    this.next = rng.range(PACK.gap[0], PACK.gap[1]);
  }
}
