import { relayOf } from './breakout';
import { portStyleOf, type PortStyle } from './site';
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

/**
 * The hull core of each built thing (units): its body, never the ring that shows where it works. Every ring and berth stays open:
 * you fly onto the gantry's pad between its pylons, onto the market's deck round its stalls, under the audit dock's arch and
 * between the depot's arms. What stands is what you would hit: a hub, a tank, a pylon, an office block.
 */
export const SOLID_R = {
  relayPost: 3, mast: 3, barge: 9, den: 12,
  /** The Dust Market's stall ring round its mast: the deck outside it is open, out to the 16-unit trading ring. */
  market: 7,
} as const;

/** A part of a built thing: a circle at (x, z) in the thing's own frame (its +x, its +z), before it is turned. */
export type Part = readonly [x: number, z: number, r: number];

/** Where the depot stands from its berth (render/stations.ts builds it so: the berth is at local (-17, 6), between the arms). */
export const DEPOT_AT = { x: 17, z: -6 } as const;
const ring5 = (i: number): Part => { const a = (i / 5) * Math.PI * 2 + 0.4; return [Math.cos(a) * 12.5, Math.sin(a) * 12.5, 2.6]; };
/** The tank farm's places round the hub, clear of the arms (render/stations.ts stands its tanks here). */
export const PORT_TANKS: readonly Part[] = [0, 1, 3, 4].map(ring5);
/** Kellern's checkpoint arch over the approach: its x, and the z of its two legs (the berth's z is between them). */
export const KELLERN_ARCH = [-26, -2, 14] as const;
/** A Holdfast's rock: centre and radius. */
export const HOLDFAST_ROCK = [8, 12, 10] as const;
/** The Dust Traders' stall tents on the raft (x, z, half-width), kept off the berth side, and their two moored skiffs. */
export const GUILD_TENTS: readonly Part[] = [15, 70, 225, 280, 330].map((d): Part => [Math.cos((d * Math.PI) / 180) * 12, Math.sin((d * Math.PI) / 180) * 12, 2.2]);
export const GUILD_SKIFFS: readonly Part[] = [[10, 16, 3.6], [16, -14, 3.6]];
/** Each holder's depot as the ship meets it: the hub and what stands round it (render/stations.ts). The arms and berth are open. */
const DEPOT: Readonly<Record<PortStyle, readonly Part[]>> = {
  frontier: [[0, 0, 8.5], ...PORT_TANKS],
  kellern: [[0, 0, 8.8], [4, 15, 5.4], PORT_TANKS[2]!, PORT_TANKS[3]!, [KELLERN_ARCH[0], KELLERN_ARCH[1], 1.4], [KELLERN_ARCH[0], KELLERN_ARCH[2], 1.4]],
  // the hub, the gutted freighter lying behind it (four circles down its length), a ball tank
  gutter: [[0, 0, 7.4], [6.1, -15.9, 4.4], [12.7, -9.3, 4.6], [19.3, -2.7, 4.6], [25.9, 3.9, 4.2], PORT_TANKS[1]!],
  holdfast: [[0, 0, 7.2], HOLDFAST_ROCK, [-4, -12, 6.5], [17, 5, 3.2]],
  guild: [[0, 0, 7.2], ...GUILD_TENTS, ...GUILD_SKIFFS],
};
/** The repair gantry's two pylons; the pad between them is where she is mended (render/breakout.ts buildGantry). */
const GANTRY: readonly Part[] = [[-7.5, -3.5, 1.3], [7.5, 3.5, 1.3]];
/** The audit dock: the arch's two legs (the way between them is open), the office block, the mast, two tanks (render/breakout.ts buildAudit). */
const AUDIT: readonly Part[] = [[0, -7.6, 1.3], [0, 7.6, 1.3], [10, -4, 3.6], [10, 4, 3.6], [14.5, -4, 3.6], [14.5, 4, 3.6], [18, -5, 1], [20, -12, 2.6], [20, 12, 2.6]];

/** Parts turned by `th` about y (as three.js turns a group) and set down at (x, z). */
function placed(parts: readonly Part[], x: number, z: number, th = 0): Solid[] {
  const c = Math.cos(th), sn = Math.sin(th);
  return parts.map(([px, pz, r]) => ({ x: x + px * c + pz * sn, z: z - px * sn + pz * c, r }));
}

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
  if (b.port) out.push(...placed(DEPOT[b.def.first ? 'frontier' : portStyleOf(b.def.holder)], b.port.x + DEPOT_AT.x, b.port.z + DEPOT_AT.z));
  if (b.audit) out.push(...placed(AUDIT, b.audit.x, b.audit.z, b.audit.face ?? 0));
  if (b.yard) out.push(...yardRock(b.yard, b.audit ?? { x: 0, z: 0 }));
  // neutral traffic (wards) is solid too: you cannot fly through a hauler, and bumping one hurts neither of you
  for (const a of w.aliens) if (a.ward) out.push({ x: a.x, z: a.z, r: a.r * 0.9 });
  const rp = w.traffic?.relayPost;
  if (rp) out.push({ x: rp.x, z: rp.z, r: SOLID_R.relayPost });
  const mast = relayOf(b);
  if (mast) out.push({ x: mast.x, z: mast.z, r: SOLID_R.mast });
  if (w.barge) out.push({ x: w.barge.x, z: w.barge.z, r: SOLID_R.barge });
  if (w.gantry) out.push(...placed(GANTRY, w.gantry.x, w.gantry.z));
  if (w.market) out.push({ x: w.market.x, z: w.market.z, r: SOLID_R.market });
  if (w.den && w.den.state !== 'dead' && w.den.state !== 'moving') out.push({ x: w.den.x, z: w.den.z, r: SOLID_R.den });
  if (w.thrSeed && w.thrSeed.state !== 'dead') out.push({ x: w.thrSeed.x, z: w.thrSeed.z, r: w.thrSeed.r });
  const st = w.stage;
  const rs = st ? SITE_R[st.def.prop ?? ''] : undefined;
  if (st && rs) out.push({ x: st.x, z: st.z, r: rs });
  return out;
}
