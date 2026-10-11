import type { GameEvent } from '../sim/events';
import type { Effects, RGB } from './fx';
import type { RockView } from './rocks';

// ── what a rock does when it is hit, split and broken ─────────────────────
// The simulation decides all of it (hp, the pieces, the loot); this only
// presents it. A hit is local: a small flash where the shot lands, a few
// chips and sparks thrown the way it came, a shove on the rock and its seams
// waking in its own colour. A break is a short physical event: stone pieces
// fly from the rock's body with its drift, dust hangs, and the new rocks grow
// out of the break (the field gives them a young age). Each kind answers in
// its own way, and a torpedo lands heavier than a laser, never as a fireball.

/** Dim, so a puff of dust never blooms. */
const STONE_DUST: Record<string, RGB> = { basalt: [0.34, 0.3, 0.27], iron: [0.3, 0.3, 0.32], rich: [0.3, 0.26, 0.36], volatile: [0.3, 0.33, 0.38] };
const EMBER: RGB = [2.4, 0.8, 0.2];
const GLINT: RGB = [1.6, 0.8, 2.6];
const COLD: RGB = [1.4, 2.2, 3.2];
const WHITE_HOT: RGB = [3.2, 3, 2.8];
const CHIP_FLASH: RGB = [2.4, 2, 1.6];

const BLASTED = new Set(['torpedo', 'mine', 'plasma', 'arc']);

/** What the caller does with a rock event: a camera shake and a hold, both small. */
export interface Impact { shake: number; hold: number }

export class RockFx {
  /** Where each rock was last hit: the break throws its pieces away from there. */
  private readonly last = new Map<number, { dx: number; dz: number }>();

  constructor(private readonly fx: Effects, private readonly rocks: RockView) {}

  react(e: GameEvent): Impact | null {
    switch (e.type) {
      case 'rockHit': return this.hit(e);
      case 'rockDestroyed': return this.broke(e.id, e.kind, e.size, e.x, e.z, e.r, e.vx, e.vz, e.src);
      case 'rockMined': return this.broke(e.id, e.kind, e.size, e.x, e.z, e.r, e.vx, e.vz, 'laser', true);
      default: return null;
    }
  }

  private hit(e: Extract<GameEvent, { type: 'rockHit' }>): Impact {
    const heavy = BLASTED.has(e.src);
    // the way the blow came, out from the rock's centre through the point it landed: a blast lands at the centre, so it throws chips every way
    let dx = e.x - e.rx, dz = e.z - e.rz;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dz = Math.sin(a); } else { dx /= d; dz /= d; }
    if (this.last.size > 64) this.last.clear();
    this.last.set(e.id, { dx, dz });
    const big = [1, 0.7, 0.5][e.size] ?? 0.5;
    const x = e.x, y = Math.max(0.1, e.y), z = e.z;
    const k = heavy ? 2.2 : 1;
    this.fx.flash(x, y, z, (heavy ? 2.4 : 0.9) * (0.7 + 0.3 * big), CHIP_FLASH, heavy ? 0.1 : 0.06);
    const dust = STONE_DUST[e.kind] ?? STONE_DUST.basalt!;
    if (Math.random() < (heavy ? 0.9 : 0.35)) this.fx.dust(x, y, z, 0.45 * big * k, dust, 1, 1, 0.7, 0.3);
    this.fx.chips(x, y, z, dx, dz, Math.round((1 + Math.random() * 1.5) * k), 0.1 + 0.03 * k, 3.5 + 2 * k);
    switch (e.kind) {
      case 'rich':
        // an occasional crystal splinter and a brief violet wake in the seams
        if (Math.random() < 0.55 * k) this.fx.spray(x, y, z, dx, dz, Math.round(1 + k), GLINT, 6, 0.14, 0.3, 0.7);
        this.fx.light(x, y, z, [0.5, 0.25, 1], 18 * k, 0.15);
        break;
      case 'volatile':
        this.fx.spray(x, y, z, dx, dz, Math.round(2 + k), WHITE_HOT, 8, 0.15, 0.25, 0.9);
        this.fx.light(x, y, z, [0.5, 0.8, 1], 26 * k, 0.18);
        break;
      case 'iron':
        this.fx.spray(x, y, z, dx, dz, Math.round(2 * k), [2.2, 1.9, 1.5], 9, 0.1, 0.18, 0.5);
        break;
      default:
        this.fx.spray(x, y, z, dx, dz, Math.round(1 + k), EMBER, 5, 0.12, 0.22, 0.8);
    }
    return { shake: heavy ? 0.05 : 0, hold: 0 };
  }

  private broke(id: number, kind: string, size: number, x: number, z: number, r: number, vx: number, vz: number, src: string, mined = false): Impact {
    const heavy = BLASTED.has(src);
    const big = [1, 0.62, 0.38][size] ?? 0.4;
    const last = this.last.get(id);
    this.last.delete(id);
    // thrown away from where the last blow landed; with no blow on record (a blast), any way
    let dx = last?.dx ?? 0, dz = last?.dz ?? 0;
    if (!last) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dz = Math.sin(a); }
    const power = (heavy ? 1.5 : 1) * (mined ? 1.1 : 1);
    // the body of the break: stone pieces with the rock's own drift
    this.rocks.fracture(kind, size, x, z, r, vx, vz, -dx, -dz, power);
    const y = 0;
    // a short fracture flash, then dust that hangs
    this.fx.flash(x, y, z, r * (heavy ? 1.9 : 1.1), CHIP_FLASH, heavy ? 0.1 : 0.07);
    const dust = STONE_DUST[kind] ?? STONE_DUST.basalt!;
    this.fx.dust(x, y, z, r * 0.55, dust, Math.round((3 + 4 * big) * (heavy ? 1.4 : 1)), 1.6 + 2.4 * big, 1.1, heavy ? 0.36 : 0.28);
    this.fx.chips(x, y, z, -dx, -dz, Math.round((2 + 4 * big) * power), 0.1 + 0.07 * big, 6 + 3 * power, 2.2);
    if (heavy) this.fx.ring(x, y, z, r * 2.6, [0.9, 0.8, 0.7], 0.3);
    switch (kind) {
      case 'rich':
        // the mineral lights up as it lets go: crystal glints thrown out and a brief violet glow
        this.fx.burst(x, 0.2, z, Math.round((6 + 12 * big) * power), GLINT, 7 + 3 * power, 0.16, 0.5);
        this.fx.light(x, y, z, [0.55, 0.28, 1], 90 * (0.4 + big) * power, 0.3);
        break;
      case 'volatile':
        // the Break itself is the blast (its own event); this is the rock giving way under it
        this.fx.flash(x, y, z, r * 2.2, COLD, 0.14);
        break;
      case 'iron':
        this.fx.burst(x, 0.2, z, Math.round(6 * big * power), [2.4, 2.1, 1.7], 8, 0.12, 0.3);
        break;
      default:
        // basalt: heavy and dusty, the embers in its cracks fly out as dull sparks
        this.fx.burst(x, 0.2, z, Math.round((3 + 6 * big) * power), EMBER, 5 + 2 * power, 0.15, 0.4);
    }
    return { shake: (heavy ? 0.12 : 0.03) + (heavy ? 0.2 : 0.07) * big, hold: size === 0 ? 0.03 : 0 };
  }
}
