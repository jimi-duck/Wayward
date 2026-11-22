import { provoke, type Alien } from './enemies';
import { stealthOf } from './rules';
import type { World } from './world';

// ── the cordon: a silent run ─────────────────────────────────────────────
// Kiln, the Belt's set piece (living-world plan, 21 November 2026): Val sold
// her heading, and Custody has strung pickets across the lane. Each sways on
// its post and sweeps a ring round it, so the gaps open and close. Inside a
// sweep with the drive lit, the exposure climbs fast; drifting, it barely
// moves; outside, it falls. The way through is to wait for a gap, burn
// through it, and go still when a ring swings over her.
// Full, the cordon is made: the pickets turn and the leg's chase begins.
// Past the line unseen, she is through, and nobody comes after her here.
// Plain data: the pilot and the tests play it.

/** A sweep reaches this far round its picket (units; less inside cover). */
export const CORDON_SCAN = 60;
/** Posts this far apart across the lane, each picket swaying this far either side of its own. */
const SPACING = 170;
const SWAY = 50;
/** Exposure a second inside a sweep: drive lit, and coasting; and how fast it falls outside. */
const BURN = 0.55;
const COAST = 0.06;
const COOL = 0.12;
/** Past the line by this much, unseen, she is through. */
const PAST = 70;

export interface CordonDef {
  /** Pickets across the lane. */
  n: number;
  /** How far along the lane the line is, as a share of it. */
  along: number;
}

export class Cordon {
  hulls: Alien[] = [];
  /** The posts, the line's middle, the lane's direction and its normal. */
  readonly posts: Array<{ x: number; z: number }> = [];
  readonly x: number; readonly z: number;
  private readonly ux: number; private readonly uz: number;
  exposure = 0;
  state: 'cold' | 'made' | 'through' = 'cold';
  /** Whether a sweep has her now (the HUD's readout, the render's rings). */
  inside = false;
  private readonly stealth: number;

  constructor(def: CordonDef, w: World) {
    const b = w.bk!, s = w.ship;
    const dx = b.lane.x - s.x, dz = b.lane.z - s.z, d = Math.hypot(dx, dz) || 1;
    this.ux = dx / d; this.uz = dz / d;
    this.x = s.x + this.ux * d * def.along; this.z = s.z + this.uz * d * def.along;
    this.stealth = stealthOf(w.levels);
    for (let i = 0; i < def.n; i++) {
      const k = (i - (def.n - 1) / 2) * SPACING;
      const p = { x: this.x - this.uz * k, z: this.z + this.ux * k };
      this.posts.push(p);
      const al = w.spawnHostile('picket', { x: p.x, y: w.rng.range(-1, 1), z: p.z }, null, true);
      al.canCloak = false; al.cloak = 0; al.mode = 'drift'; al.escort = false; al.job = true;
      al.ax = p.x; al.az = p.z;
      al.ward = { act: 'hold', temper: 'territorial', hx: p.x, hz: p.z, ring: CORDON_SCAN, warned: 0, tag: 'Custody picket' };
      this.hulls.push(al);
    }
  }

  /** How far past the line a point is (units; negative before it). */
  past(x: number, z: number): number { return (x - this.x) * this.ux + (z - this.z) * this.uz; }

  /** Each picket's sweep now: where it is, and its reach. */
  sweeps(w: World): Array<{ x: number; z: number; r: number }> {
    return this.hulls.filter((a) => w.aliens.includes(a)).map((a) => ({ x: a.x, z: a.z, r: CORDON_SCAN * w.air.conceal }));
  }

  /** A picket was hit: the cordon knows she is there. */
  shot(w: World, al: Alien): void {
    if (this.state === 'cold' && this.hulls.includes(al)) this.made(w);
  }

  step(w: World, dt: number): void {
    this.hulls = this.hulls.filter((a) => w.aliens.includes(a));
    if (this.state !== 'cold') { this.inside = false; return; }
    const s = w.ship;
    // the pickets sway on their posts, out of step, so the gaps open and close
    for (const [i, a] of this.hulls.entries()) {
      const p = this.posts[i] ?? this.posts[0]!, sw = Math.sin(w.runTime * 0.32 + i * 1.7) * SWAY;
      a.mode = 'drift';
      a.ax = p.x - this.uz * sw; a.az = p.z + this.ux * sw;
    }
    const reach = CORDON_SCAN * w.air.conceal;
    this.inside = this.hulls.some((a) => Math.hypot(a.x - s.x, a.z - s.z) < reach);
    const lit = s.thrust > 0.05;
    this.exposure = Math.min(1, Math.max(0, this.exposure + (this.inside ? (lit ? BURN : COAST) * this.stealth : -COOL) * dt));
    if (this.exposure >= 1) return this.made(w);
    if (this.past(s.x, s.z) > PAST) {
      this.state = 'through';
      this.inside = false;
      w.flags.add('cordon_cold');
      w.events.push({ type: 'storyNotice', tone: 'teal', headline: 'Through the cordon', reason: 'they never saw you' });
    }
  }

  private made(w: World): void {
    this.state = 'made';
    this.inside = false;
    w.flags.add('cordon_made');
    for (const a of this.hulls) { provoke(a, w.events); a.job = false; }
    // the leg's chase begins now (content/road.ts LEG_CHASES)
    const b = w.bk;
    if (b) b.nextPursuit = Math.min(b.nextPursuit, w.runTime + 4);
    w.events.push({ type: 'storyNotice', tone: 'red', headline: 'Seen', reason: 'the cordon turns on you' });
  }
}
