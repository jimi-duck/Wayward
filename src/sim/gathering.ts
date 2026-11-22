import type { Alien } from './enemies';
import type { World } from './world';

// ── the gathering at the Threshold ────────────────────────────────────────
// Wane Rest, the last stop (living-world plan, 22 November 2026): everyone she
// helped comes. Each ally's radio line (content/script/threshold.ts) brings
// their hulls in down the lane; they take a place in two lines
// either side of the lane short of the gate, so she flies the last stretch to
// Calloway between them. Nobody's enemy, nobody's guns: they came to watch.
// Plain data: the tests play it.

/** One ally: the row that brings them, their hulls, and the tag the scope shows. */
export interface Comer {
  row: string;
  variant: string;
  n: number;
  tag: string;
}

/** The lines start this far short of the gate (outside Calloway's checkpoint), a place apart, either side of the lane. */
const FIRST = 470;
const APART = 42;
const SIDE = 70;
/** They come in this far short of their place, wide of it, a little quicker than they cruise. */
const RUN_IN = 260;
const PACE = 2;

export class Gathering {
  readonly hulls: Alien[] = [];
  private readonly came = new Set<string>();
  private readonly slots = new Map<Alien, { x: number; z: number }>();
  private axis: { ux: number; uz: number } | null = null;

  constructor(private readonly comers: Comer[]) {}

  /** The allies that have come so far, by row. */
  get rows(): string[] { return [...this.came]; }

  step(w: World): void {
    for (const c of this.comers) if (!this.came.has(c.row) && w.rowPlayed(c.row)) { this.came.add(c.row); this.bring(w, c); }
    for (const [a, p] of this.slots) {
      if (!w.aliens.includes(a)) { this.slots.delete(a); continue; }
      a.mode = 'drift'; a.ax = p.x; a.az = p.z;
    }
  }

  private bring(w: World, c: Comer): void {
    const b = w.bk;
    if (!b) return;
    const s = w.ship, g = b.lane;
    if (!this.axis) {
      const dx = g.x - s.x, dz = g.z - s.z, d = Math.hypot(dx, dz) || 1;
      this.axis = { ux: dx / d, uz: dz / d };
    }
    const { ux, uz } = this.axis;
    for (let i = 0; i < c.n; i++) {
      const k = this.hulls.length, side = k % 2 ? 1 : -1, back = FIRST + Math.floor(k / 2) * APART;
      const slot = { x: g.x - ux * back - uz * side * SIDE, z: g.z - uz * back + ux * side * SIDE };
      const wide = SIDE * 2 + i * 12;
      const at = { x: slot.x - ux * RUN_IN - uz * side * wide, y: w.rng.range(-2, 2), z: slot.z - uz * RUN_IN + ux * side * wide };
      const al = w.spawnHostile(c.variant, at, null, true);
      al.canCloak = false; al.cloak = 0; al.mode = 'drift'; al.escort = false; al.job = true; al.civil = true;
      al.ax = slot.x; al.az = slot.z; al.spK *= PACE;
      al.ward = { act: 'hold', temper: 'meek', hx: slot.x, hz: slot.z, ring: 20, warned: 0, tag: c.tag };
      this.hulls.push(al);
      this.slots.set(al, slot);
    }
  }
}
