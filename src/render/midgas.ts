import { Color, Group, type Camera } from 'three';
import { Gas, type GasLump } from './gas';
import { seeded } from './kit';
import { signatureOf } from './signature';
import type { Sky } from './sky';

// ── the middle distance ───────────────────────────────────────────────────
// Between the rock round the ship and the painted sky there was nothing, so a system had a near layer and a backdrop and
// no depth between. These are banks of gas and dust a kilometre or so out, above and below the ship's plane: some lit in
// the sky's own colours, some dark lanes of dust against it. They are anchored in the world on a repeating tile, so they
// slide past at their own pace as the ship travels (parallax), and they fade in and out at the edge of the tile and well
// before the ship could reach one, so none ever pops or comes close. Each bank is one draw of the shared gas (gas.ts).

/** The repeating tile the banks sit on, in world units. */
const TILE = 3600;
/** Fully there between these distances from the camera; gone nearer than NEAR[0] and beyond FAR[1]. */
const NEAR = [320, 560];
const FAR = [1450, 1800];

interface Bank { gas: Gas; x: number; y: number; z: number; level: number }

export class MidGas {
  readonly group = new Group();
  private banks: Bank[] = [];
  private lean = false;
  private sky: Sky | null = null;
  private t = 0;

  /** Fewer banks, and fewer lumps in each, on Phone and Low. */
  setLean(lean: boolean): void {
    if (lean === this.lean) return;
    this.lean = lean;
    if (this.sky) this.setSky(this.sky);
  }

  setSky(sky: Sky): void {
    this.sky = sky;
    for (const b of this.banks) { b.gas.mesh.removeFromParent(); b.gas.dispose(); }
    this.banks = [];
    const r = seeded(sky.seed * 13 + 7);
    // the region's signature: how thick, how much of it is dark dust or smoke, and whether the gas glows from within
    const sig = signatureOf(sky.palette);
    const n = Math.max(2, Math.round((this.lean ? 5 : 9) * Math.min(1, sig.banks)));
    const thick = 0.7 + 0.3 * sig.banks;
    for (let i = 0; i < n; i++) {
      // some are dark dust lanes (about a third, by region), the rest gas lit in one of the sky's colours
      const dark = (i * 0.618 + 0.3) % 1 < sig.dark;
      const base = sky.neb[i % 2]!.clone();
      const lum = base.r * 0.3 + base.g * 0.5 + base.b * 0.2;
      const hue = new Color(Math.max(0, lum + (base.r - lum) * 1.6), Math.max(0, lum + (base.g - lum) * 1.6), Math.max(0, lum + (base.b - lum) * 1.6));
      const colour = dark ? hue.multiplyScalar(0.05) : hue.multiplyScalar(0.48 + r() * 0.2);
      const lumps: GasLump[] = [];
      const count = this.lean ? 8 : 14, spread = 260 + r() * 160;
      for (let k = 0; k < count; k++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * spread, edge = d / spread;
        lumps.push({
          x: Math.cos(a) * d, y: (r() - 0.5) * spread * 0.45, z: Math.sin(a) * d * 0.6,
          size: 170 + r() * 220,
          colour: colour.clone().multiplyScalar(0.8 + r() * 0.4),
          alpha: (dark ? 0.75 : 0.5) * (0.6 + r() * 0.4) * (1 - edge * 0.45) * thick,
          glow: dark ? 0 : 0.05 + sig.inner * (1 - edge), stretch: dark ? 1.8 + r() : 1 + r() * 0.6, family: dark ? 1 : r() < 0.7 ? 0 : 2,
        });
      }
      const gas = new Gas(lumps, sky.seed + i * 31);
      // high or low, never in the plane the ship flies in
      const y = (r() < 0.5 ? -1 : 1) * (70 + r() * 230);
      this.group.add(gas.mesh);
      this.banks.push({ gas, x: r() * TILE, y, z: r() * TILE, level: 0 });
    }
  }

  update(camera: Camera, cx: number, cz: number, dt: number, motion: boolean): void {
    if (motion) this.t += dt;
    const e = camera.position;
    for (const b of this.banks) {
      // the nearest copy of the bank on the tile round the ship
      const x = cx + wrap(b.x - cx), z = cz + wrap(b.z - cz);
      b.gas.mesh.position.set(x, b.y, z);
      const d = Math.hypot(x - e.x, b.y - e.y, z - e.z);
      b.level = step(NEAR[0]!, NEAR[1]!, d) * (1 - step(FAR[0]!, FAR[1]!, d));
      b.gas.update(b.level, this.t, dt, camera);
    }
  }
}

function wrap(v: number): number {
  return ((((v + TILE / 2) % TILE) + TILE) % TILE) - TILE / 2;
}

function step(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
