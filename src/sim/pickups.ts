import type { PowerKind } from './events';
import { newId } from './ids';
import type { Rng } from './rng';
import type { ShipState } from './ship';
import { SHIP_R } from './tuning';

// ── things to pick up ─────────────────────────────────────────────────────
// Krail is the run's currency and its XP: crystals fall out of broken
// rock and dead hulls, drift, and fade after a while, so a field left
// uncollected is a field lost. Inside the tractor radius they are pulled in,
// harder the closer they come, which is what makes flying through a fight
// to collect a reward of its own. Hull repairs and power-ups are rarer and
// are not tractored: you go and get them.

export type PickupKind = 'crystal' | 'cyrite' | 'ore' | 'parts' | 'repair' | PowerKind;
/** What the tractor pulls in by itself: Krail, Cyrite, ore and parts. */
export const LOOSE: ReadonlySet<PickupKind> = new Set(['crystal', 'cyrite', 'ore', 'parts']);

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number; z: number; vx: number; vz: number;
  life: number;
  /** Crystals: krail in it. */
  value: number;
  /** Seconds it has existed (the renderer pops it in). */
  age: number;
}

export const CRYSTAL_LIFE = 11;
export const REPAIR_LIFE = 12;
export const POWER_LIFE = 14;
export const PICKUP_R = SHIP_R + 1.3;
/** How long each power-up lasts, seconds. Charge is instant. */
export const POWER_TIME: Record<PowerKind, number> = { shield: 10, rapid: 8, magnet: 5, overdrive: 8, charge: 0 };
export const POWER_LABEL: Record<PowerKind, string> = {
  shield: 'Emergency shield', rapid: 'Rapid fire', magnet: 'Tractor surge', overdrive: 'Overdrive', charge: 'Reactor charge',
};
export const POWERS: PowerKind[] = ['shield', 'rapid', 'magnet', 'overdrive', 'charge'];

/** Scatter `total` krail as crystals of 1, 3 and 5 (or Cyrite, ore or parts, as `kind`), thrown out from (x, z). */
export function dropCrystals(out: Pickup[], x: number, z: number, total: number, rng: Rng, spread = 6, vx = 0, vz = 0, kind: 'crystal' | 'cyrite' | 'ore' | 'parts' = 'crystal'): void {
  let left = Math.max(0, Math.round(total));
  while (left > 0) {
    const v = left >= 10 ? 5 : left >= 4 ? 3 : 1;
    left -= v;
    const a = rng.range(0, Math.PI * 2), sp = rng.range(0.4, 1) * spread;
    out.push({ id: newId(), kind, x, z, vx: vx * 0.4 + Math.cos(a) * sp, vz: vz * 0.4 + Math.sin(a) * sp, life: CRYSTAL_LIFE + rng.range(-1, 1), value: v, age: 0 });
  }
}

export function dropItem(out: Pickup[], kind: PickupKind, x: number, z: number, rng: Rng): Pickup {
  const a = rng.range(0, Math.PI * 2);
  const p: Pickup = {
    id: newId(), kind, x, z, vx: Math.cos(a) * 2, vz: Math.sin(a) * 2,
    life: kind === 'repair' ? REPAIR_LIFE : POWER_LIFE, value: 0, age: 0,
  };
  out.push(p);
  return p;
}

/**
 * Drift, tractor and age every pickup. Returns those collected this step.
 * `tractor` is the pull radius for crystals; `surge` pulls everything on the
 * field (the magnet power-up).
 */
export function stepPickups(list: Pickup[], s: ShipState, tractor: number, surge: boolean, dt: number): Pickup[] {
  const got: Pickup[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]!;
    p.life -= dt;
    p.age += dt;
    const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz) || 1;
    const loose = LOOSE.has(p.kind);
    const reach = loose ? (surge ? 120 : tractor) : surge ? 60 : 0;
    if (d < reach && p.age > 0.25) {
      // the pull grows as it closes, and always outruns the ship
      const pull = 40 + 260 * (1 - d / reach) * (1 - d / reach) + Math.hypot(s.vx, s.vz) * 1.5;
      p.vx += (dx / d) * pull * dt;
      p.vz += (dz / d) * pull * dt;
    }
    const drag = Math.pow(0.92, dt * 60);
    p.vx *= drag; p.vz *= drag;
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (d < PICKUP_R + (loose ? 0.4 : 0.6)) {
      list.splice(i, 1);
      got.push(p);
    } else if (p.life <= 0) list.splice(i, 1);
  }
  return got;
}
