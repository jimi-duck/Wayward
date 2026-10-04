import { newId } from './ids';
import type { ShipState } from './ship';
import type { Stats } from './stats';

// ── the systems that fire themselves ──────────────────────────────────────
// Mines, the plasma trail and the hull arc are not on a trigger: what you
// control is where the ship is. Mines go down in your wake, so a mine build
// is about leading what chases you over them; the trail burns where your
// engines were, so a plasma build is about the line you fly; the arc reaches
// only what is close, so an arc build has to get close. These functions find
// what each system touches; the world applies the damage, so every kill can
// be credited to the system that made it.

export interface Mine {
  id: number;
  x: number; z: number; vx: number; vz: number;
  life: number;
  /** Seconds before it is armed. */
  arm: number;
  /** Seconds to detonation once triggered, or -1 while waiting. */
  fuse: number;
  /** Damage multiplier when it goes (set off by a laser: harder). */
  boost: number;
}

/** A patch of burning plasma: from the vent, a plasma warhead or a chain reaction's cloud. */
export interface Burn {
  x: number; z: number; r: number;
  life: number; max: number;
  dps: number;
  /** Laid by the vent (draws as trail) or a cloud. */
  trail: boolean;
}

export interface Systems {
  mines: Mine[];
  burns: Burn[];
  /** Seconds to the next mine, the next plasma puff and the next arc. */
  mineT: number;
  ventT: number;
  arcT: number;
}

export const newSystems = (): Systems => ({ mines: [], burns: [], mineT: 1, ventT: 0, arcT: 0 });

const STERN = 1.7;
const VENT_EVERY = 0.05;
export const MINE_ARM = 0.5;
const MINE_FUSE = 0.12;
export const GRAVITY_FUSE = 0.7;
export const GRAVITY_PULL = 20;
export const CHAIN_CLOUD = 2.5;

/** Lay mines and plasma behind the ship as the build allows. Returns a mine laid this step, if any. */
export function laySystems(sys: Systems, ship: ShipState, s: Stats, dt: number, overload: boolean): Mine | null {
  const hx = Math.cos(ship.heading), hz = -Math.sin(ship.heading);
  let laid: Mine | null = null;
  if (s.mines) {
    sys.mineT -= dt * (overload ? 2.5 : 1);
    if (sys.mineT <= 0) {
      if (sys.mines.length < s.mineMax) {
        laid = { id: newId(), x: ship.x - hx * STERN, z: ship.z - hz * STERN, vx: ship.vx * 0.15, vz: ship.vz * 0.15, life: s.mineLife, arm: MINE_ARM, fuse: -1, boost: 1 };
        sys.mines.push(laid);
        sys.mineT = s.mineInterval;
      } else sys.mineT = 0.2;
    }
  }
  if (s.plasma && ship.thrust > 0.3) {
    sys.ventT -= dt;
    if (sys.ventT <= 0) {
      sys.ventT = VENT_EVERY;
      // two nozzles, either side of the stern
      for (const side of [-1, 1]) {
        const ox = Math.sin(ship.heading) * 0.55 * side, oz = Math.cos(ship.heading) * 0.55 * side;
        sys.burns.push({ x: ship.x - hx * STERN + ox, z: ship.z - hz * STERN + oz, r: s.plasmaRadius, life: s.plasmaLife, max: s.plasmaLife, dps: s.plasmaDps, trail: true });
        // the corona: plasma wreathes the bow and flanks, briefly
        if (s.plasmaCorona) sys.burns.push({ x: ship.x + hx * 0.6 + ox * 2.6, z: ship.z + hz * 0.6 + oz * 2.6, r: s.plasmaRadius * 0.85, life: 0.35, max: 0.35, dps: s.plasmaDps, trail: true });
      }
    }
  }
  return laid;
}

/** A ring of plasma round the ship: the afterburner wake on a barrel roll. */
export function plasmaRing(sys: Systems, ship: ShipState, s: Stats): void {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    sys.burns.push({ x: ship.x + Math.cos(a) * 3, z: ship.z + Math.sin(a) * 3, r: s.plasmaRadius * 1.4, life: s.plasmaLife * 1.2, max: s.plasmaLife * 1.2, dps: s.plasmaDps, trail: true });
  }
}

/** A ring of six mines round the ship (core-charged mines on a release). */
export function mineRing(sys: Systems, ship: ShipState, s: Stats): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    sys.mines.push({ id: newId(), x: ship.x + Math.cos(a) * 6, z: ship.z + Math.sin(a) * 6, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, life: s.mineLife, arm: MINE_ARM, fuse: -1, boost: 1 });
  }
}

/** A thing in reach of a system: enough to measure and to report. */
export interface Reachable { id: number; x: number; y: number; z: number; r: number; }

/**
 * Age and move mines; trigger those with a hull (or heavy rock) inside their
 * trigger radius. Returns mines that go off this step (removed from the list).
 */
export function stepMines(sys: Systems, s: Stats, hulls: readonly Reachable[], rocks: readonly Reachable[], dt: number): Mine[] {
  const out: Mine[] = [];
  for (let i = sys.mines.length - 1; i >= 0; i--) {
    const m = sys.mines[i]!;
    m.life -= dt;
    if (m.arm > 0) m.arm -= dt;
    const drag = Math.pow(0.94, dt * 60);
    m.vx *= drag; m.vz *= drag;
    if (m.fuse < 0 && m.arm <= 0) {
      let near: Reachable | null = null, nd = Infinity;
      for (const h of hulls) {
        if (Math.abs(h.y) > s.mineTrigger + h.r + 2) continue;
        const d = Math.hypot(h.x - m.x, h.z - m.z) - h.r;
        if (d < nd) { nd = d; near = h; }
      }
      if (near && nd < s.mineTrigger) m.fuse = s.mineGravity ? GRAVITY_FUSE : MINE_FUSE;
      else {
        for (const r of rocks) if (r.r > 1.5 && Math.hypot(r.x - m.x, r.z - m.z) - r.r < s.mineTrigger * 0.6) { m.fuse = MINE_FUSE; break; }
      }
      // seekers drift toward a hull in reach
      if (m.fuse < 0 && s.mineSeek > 0 && near && nd < s.mineTrigger * 3) {
        const dx = near.x - m.x, dz = near.z - m.z, d = Math.hypot(dx, dz) || 1;
        m.vx += (dx / d) * s.mineSeek * 3 * dt; m.vz += (dz / d) * s.mineSeek * 3 * dt;
      }
    }
    m.x += m.vx * dt; m.z += m.vz * dt;
    if (m.fuse >= 0) {
      m.fuse -= dt;
      if (m.fuse <= 0) { sys.mines.splice(i, 1); out.push(m); continue; }
    }
    if (m.life <= 0) sys.mines.splice(i, 1);
  }
  return out;
}

/** Set off every waiting mine within `r` of (x, z): the chain reaction. */
export function chainMines(sys: Systems, x: number, z: number, r: number): void {
  for (const m of sys.mines) if (m.fuse < 0 && Math.hypot(m.x - x, m.z - z) < r) m.fuse = MINE_FUSE;
}

export function stepBurns(sys: Systems, dt: number): void {
  for (let i = sys.burns.length - 1; i >= 0; i--) {
    const b = sys.burns[i]!;
    b.life -= dt;
    if (b.life <= 0) sys.burns.splice(i, 1);
  }
}

/** The damage per second burning on something at (x, z) of radius r (the hottest patch it touches). */
export function burnAt(sys: Systems, x: number, z: number, r: number): number {
  let dps = 0;
  for (const b of sys.burns) {
    if (b.dps <= dps) continue;
    const dx = b.x - x, dz = b.z - z, rr = b.r + r;
    if (dx * dx + dz * dz < rr * rr) dps = b.dps;
  }
  return dps;
}

export interface ArcHit<T> { target: T; dmg: number; from: [number, number, number]; }

/**
 * The hull arc: up to `arcTargets` of the nearest things in reach (hulls
 * before rock), then `arcJumps` onward hops from each at falling damage.
 */
export function arcTargets<A extends Reachable, B extends Reachable>(ship: ShipState, s: Stats, hulls: readonly A[], rocks: readonly B[], overload: boolean): ArcHit<A | B>[] {
  type T = A | B;
  const reach = s.arcRange;
  const dist = (a: Reachable, x: number, y: number, z: number) => Math.hypot(a.x - x, a.y - y, a.z - z) - a.r;
  const near = (list: readonly T[], x: number, y: number, z: number, max: number, skip: Set<number>): T[] =>
    list.filter((o) => !skip.has(o.id) && dist(o, x, y, z) < max).sort((a, b) => dist(a, x, y, z) - dist(b, x, y, z));
  const hit = new Set<number>();
  const out: ArcHit<T>[] = [];
  const first = [...near(hulls, ship.x, 0.3, ship.z, reach, hit), ...near(rocks, ship.x, 0, ship.z, reach, hit)].slice(0, s.arcTargets);
  const dmg = s.arcDamage * (overload ? 1.5 : 1);
  // lightning is for hulls: rock takes half
  const rock = new Set<T>(rocks);
  for (const t of first) {
    hit.add(t.id);
    out.push({ target: t, dmg: rock.has(t) ? dmg * 0.5 : dmg, from: [ship.x, 0.4, ship.z] });
    let from: T = t, d = dmg;
    for (let j = 0; j < s.arcJumps; j++) {
      const next = near(hulls, from.x, from.y, from.z, reach * 0.8, hit)[0] ?? near(rocks, from.x, from.y, from.z, reach * 0.6, hit)[0];
      if (!next) break;
      d *= 0.6;
      hit.add(next.id);
      out.push({ target: next, dmg: rock.has(next) ? d * 0.5 : d, from: [from.x, from.y, from.z] });
      from = next;
    }
  }
  return out;
}
