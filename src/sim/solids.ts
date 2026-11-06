import { relayOf } from './breakout';
import type { World } from './world';

// ── solid places ──────────────────────────────────────────────────────────
// Every built thing in a system is solid to the player: the depot, the audit
// dock, Ned's yard, neutral traffic, the relay post and mast, the barge, the gantry, the Dust Market, the
// den and the seed, a situation's site. The ship is pushed back out and its
// inward way is lost, and the shield flashes, but nothing is damaged: a bump
// is never a hit. The jump gate and the berths are not solid (you fly through
// the ring; you dock at the berth), and nothing here changes what hurts.
// Plain circles, read from what the world already holds (docs/SITES.md).

export interface Solid { x: number; z: number; r: number }

/** The hull core of each built thing (units): its body, not the ring that shows where it works. */
export const SOLID_R = {
  depot: 9, depotAt: { x: 17, z: -6 },
  audit: 8, relayPost: 3, mast: 3, barge: 9, gantry: 7, market: 9, den: 12,
} as const;
/** What a situation's site stands as, by prop (units). Gates, seams and holes are flown through and left out. */
export const SITE_R: Readonly<Record<string, number>> = {
  settlement: 12, relay: 4, wreck: 8, beacon: 3, yard: 9, foundry: 14, object: 5, rig: 8,
};
/** The ship's inward speed (units/s) above which a bump flashes the shield, and the quiet between flashes (s). */
export const BUMP_SPEED = 3;
export const BUMP_QUIET = 0.5;

/**
 * Ned's yard: the asteroid it is cut into, never the pad. The pad is the berth (a work pad in its ring), so the ship flies in and holds
 * there. The rock stands behind the deck and to its sides (render/yard.ts: massif, shoulders), turned to face the way she comes in
 * (the company's dock), so these are the lumps' own offsets, turned the same way.
 */
const YARD_ROCK: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: -8, z: -31, r: 13 }, { x: 6, z: -31, r: 13 }, { x: -31, z: -18, r: 12 }, { x: 31, z: -10, r: 10 }, { x: 25, z: -19, r: 5.5 },
];
export function yardRock(yard: { x: number; z: number }, from: { x: number; z: number }): Solid[] {
  const th = Math.atan2(from.x - yard.x, from.z - yard.z), c = Math.cos(th), sn = Math.sin(th);
  return YARD_ROCK.map((k) => ({ x: yard.x + k.x * c + k.z * sn, z: yard.z - k.x * sn + k.z * c, r: k.r }));
}

/** Everything solid in the world now. */
export function solidsOf(w: World): Solid[] {
  const out: Solid[] = [];
  const b = w.bk;
  if (!b) return out;
  if (b.port) out.push({ x: b.port.x + SOLID_R.depotAt.x, z: b.port.z + SOLID_R.depotAt.z, r: SOLID_R.depot });
  if (b.audit) out.push({ x: b.audit.x, z: b.audit.z, r: SOLID_R.audit });
  if (b.yard) out.push(...yardRock(b.yard, b.audit ?? { x: 0, z: 0 }));
  // neutral traffic (wards) is solid too: you cannot fly through a hauler, and bumping one hurts neither of you
  for (const a of w.aliens) if (a.ward) out.push({ x: a.x, z: a.z, r: a.r * 0.9 });
  const rp = w.traffic?.relayPost;
  if (rp) out.push({ x: rp.x, z: rp.z, r: SOLID_R.relayPost });
  const mast = relayOf(b);
  if (mast) out.push({ x: mast.x, z: mast.z, r: SOLID_R.mast });
  if (w.barge) out.push({ x: w.barge.x, z: w.barge.z, r: SOLID_R.barge });
  if (w.gantry) out.push({ x: w.gantry.x, z: w.gantry.z, r: SOLID_R.gantry });
  if (w.market) out.push({ x: w.market.x, z: w.market.z, r: SOLID_R.market });
  if (w.den && w.den.state !== 'dead' && w.den.state !== 'moving') out.push({ x: w.den.x, z: w.den.z, r: SOLID_R.den });
  if (w.thrSeed && w.thrSeed.state !== 'dead') out.push({ x: w.thrSeed.x, z: w.thrSeed.z, r: w.thrSeed.r });
  const st = w.stage;
  const rs = st ? SITE_R[st.def.prop ?? ''] : undefined;
  if (st && rs) out.push({ x: st.x, z: st.z, r: rs });
  return out;
}
