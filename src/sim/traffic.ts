import { t } from '../i18n';
import { Rng } from './rng';
import { leave, VARIANTS, type Alien } from './enemies';
import { lockLifted } from './postjump';
import type { World } from './world';

// ── the working traffic of the first system past Cerro ────────────────────
// Haulers, barges and liners going about the trade on routes that run across and
// along the course: believable lines, at their own speeds and distances. They are
// wards (sim/enemies.ts), nobody's enemy and never armed, and they keep clear of
// the Jump Gate, the dock and the depot rings. The director does not count them.
//
// Fire on one and it runs; the ones near it scatter. A second hit within a minute,
// or a kill, calls the dock's security: two Patrol fighters (three after a second
// kill), from the nearer dock and never closer than SECURITY_FROM, who hunt on the
// existing AI and give up after SECURITY_TTL. One dispatch a SECURITY_GAP; no more
// than SECURITY_MAX at once. Nothing else in the system answers.

/** Live traffic hulls kept in the sky. */
export const TRAFFIC_N = 9;
/** No traffic hull starts or spawns inside this of the ship (units). */
export const TRAFFIC_CLEAR = 140;
/** The security dispatch: never nearer than this, gives up after this many seconds, one per this many, at most this many alive. */
export const SECURITY_FROM = 130;
export const SECURITY_TO = 180;
export const SECURITY_TTL = 70;
export const SECURITY_GAP = 45;
export const SECURITY_MAX = 4;
/** Seconds between the shot and the guns arriving. */
export const SECURITY_DELAY = 3.5;
/** A second hit inside this many seconds calls them. */
const STRIKE_WINDOW = 60;
/** Traffic within this of a shot hull scatters (units). */
const SCATTER_R = 170;

interface Route {
  id: string;
  /** Points as [share of the way to the gate, units off the line (right positive)]. */
  pts: Array<[number, number]>;
  /** Loops forever instead of ending. */
  loop?: boolean;
  /** Hulls that fly it and the pace multiplier they fly it at. */
  ships: string[];
  pace: [number, number];
}

/** The lines of the system, in the course's own frame. None pass through the start, the gate, the dock or the depot. */
export const ROUTES: Route[] = [
  // the long freight crossing the course ahead, mine to port and the yards to starboard
  { id: 'freight', pts: [[0.3, -1150], [0.4, 1150]], ships: ['hauler', 'liner'], pace: [0.9, 1.4] },
  // and back, further out
  { id: 'return', pts: [[0.5, 1500], [0.2, -1300]], ships: ['hauler', 'barge'], pace: [1.1, 1.8] },
  // the shuttle between the audit dock and the depot
  { id: 'shuttle', pts: [[0.64, 380], [0.7, 120], [0.77, -150], [0.8, -290], [0.7, 40], [0.64, 330]], loop: true, ships: ['barge'], pace: [1, 1.3] },
  // out of the depot toward the gate, and away
  { id: 'outbound', pts: [[0.82, -230], [0.9, -120], [0.96, -240], [1.3, -300]], ships: ['hauler', 'liner'], pace: [1, 1.5] },
  // in from the gate to the depot
  { id: 'inbound', pts: [[1.12, 330], [0.92, 240], [0.8, -60], [0.76, -330]], ships: ['hauler', 'barge'], pace: [1, 1.5] },
  // the miners' circuit round what is left of the seam
  { id: 'seam', pts: [[0.48, 480], [0.56, 640], [0.66, 520], [0.58, 380]], loop: true, ships: ['barge', 'barge', 'hauler'], pace: [0.8, 1.1] },
  // far traffic: the passage, fast and distant
  { id: 'passage', pts: [[0.05, 1750], [0.55, 1550], [1.1, 1700]], ships: ['liner', 'hauler'], pace: [2, 2.8] },
];

interface Hull { al: Alien; route: Route; leg: number; }

const now_ = (w: World): number => w.runTime;

export class Traffic {
  private hulls: Hull[] = [];
  private security: Alien[] = [];
  private until = new Map<Alien, number>();
  private pending: Array<{ at: number; n: number }> = [];
  private rng: Rng;
  private fx: number; private fz: number; private rx: number; private rz: number;
  private len: number; private x0: number; private z0: number;
  private respawn = 0;
  private strikes: number[] = [];
  private kills = 0;
  private nextDispatch = 0;
  private warnAt = -Infinity;
  private pick = 0;

  constructor(w: World) {
    const b = w.bk!, h = w.ship.heading;
    this.fx = Math.cos(h); this.fz = -Math.sin(h); this.rx = Math.sin(h); this.rz = Math.cos(h);
    this.len = b.def.lane; this.x0 = w.ship.x; this.z0 = w.ship.z;
    this.rng = new Rng(0x7a1f ^ w.seed);
    for (let i = 0; i < TRAFFIC_N; i++) this.launch(w, true);
  }

  /** A point of the course frame in the world. */
  at(p: [number, number]): { x: number; z: number } {
    return { x: this.x0 + this.fx * this.len * p[0] + this.rx * p[1], z: this.z0 + this.fz * this.len * p[0] + this.rz * p[1] };
  }

  get count(): number { return this.hulls.length; }
  get responders(): number { return this.security.length; }
  owns(al: Alien): boolean { return this.hulls.some((h) => h.al === al); }

  private rings(w: World): Array<{ x: number; z: number; r: number }> {
    const b = w.bk!;
    return [b.lane, ...(b.port ? [b.port] : []), ...(b.audit ? [b.audit] : [])].map((p) => ({ x: p.x, z: p.z, r: 60 }));
  }

  /** Put a hull on a route: at a random stretch of it when the system is first dealt, else at its start. */
  private launch(w: World, deal: boolean): void {
    for (let tries = 0; tries < 8; tries++) {
      const route = ROUTES[this.pick++ % ROUTES.length]!;
      const leg = deal ? this.rng.int(route.pts.length - 1) : 0;
      const a = this.at(route.pts[leg]!), b2 = this.at(route.pts[Math.min(route.pts.length - 1, leg + 1)]!);
      const k = deal ? this.rng.range(0.05, 0.95) : 0;
      const x = a.x + (b2.x - a.x) * k, z = a.z + (b2.z - a.z) * k;
      if (Math.hypot(x - w.ship.x, z - w.ship.z) < (deal ? TRAFFIC_CLEAR + 60 : 260)) continue;
      if (this.rings(w).some((r) => Math.hypot(x - r.x, z - r.z) < r.r)) continue;
      const v = route.ships[this.rng.int(route.ships.length)]!;
      const al = w.spawnHostile(v, { x, y: this.rng.range(-1.5, 1.5), z }, null, true);
      al.canCloak = false; al.cloak = 0; al.mode = 'drift'; al.escort = false; al.ttl = 0;
      al.r *= v === 'barge' ? 0.78 : v === 'liner' ? 1.18 : 1;
      al.hp = al.maxHp = Math.max(4, Math.round(al.maxHp * 0.35));
      al.spK *= this.rng.range(route.pace[0], route.pace[1]);
      const g = this.at(route.pts[Math.min(route.pts.length - 1, leg + 1)]!);
      al.ax = g.x; al.az = g.z;
      al.face = Math.atan2(-(g.z - z), g.x - x);
      al.ward = { act: 'pass', temper: 'meek', hx: g.x, hz: g.z, ring: 0, warned: 0, tag: VARIANTS[v]!.label };
      this.hulls.push({ al, route, leg: Math.min(route.pts.length - 1, leg + 1) });
      return;
    }
  }

  step(w: World, dt: number): void {
    const s = w.ship;
    // the hulls follow their lines
    for (const h of [...this.hulls]) {
      const al = h.al;
      if (!w.aliens.includes(al)) { this.drop(h); continue; }
      if (!al.ward) {
        // it ran (or turned): not traffic any more; the sky's own rules cull it
        if (al.fleeing && Math.hypot(al.x - s.x, al.z - s.z) > 400) w.aliens.splice(w.aliens.indexOf(al), 1);
        continue;
      }
      const g = this.at(h.route.pts[h.leg]!);
      if (Math.hypot(g.x - al.x, g.z - al.z) < 30) {
        if (h.leg >= h.route.pts.length - 1) {
          if (h.route.loop) h.leg = 0;
          else { w.aliens.splice(w.aliens.indexOf(al), 1); this.drop(h); continue; }
        } else h.leg++;
      }
      const n = this.at(h.route.pts[h.leg]!);
      al.mode = 'drift'; al.ax = n.x; al.az = n.z; al.ward.hx = n.x; al.ward.hz = n.z;
    }
    this.hulls = this.hulls.filter((h) => w.aliens.includes(h.al) && h.al.ward);
    this.security = this.security.filter((a) => w.aliens.includes(a));
    for (const a of this.security) if (now_(w) > (this.until.get(a) ?? Infinity) && !a.fleeing) leave(a);
    // keep the sky busy
    if ((this.respawn -= dt) <= 0) {
      this.respawn = 5;
      if (this.hulls.length < TRAFFIC_N) this.launch(w, false);
    }
    // the dock's security, when called
    const now = w.runTime;
    this.strikes = this.strikes.filter((t) => now - t < STRIKE_WINDOW);
    for (const p of [...this.pending]) {
      if (now < p.at) continue;
      this.pending.splice(this.pending.indexOf(p), 1);
      this.send(w, p.n);
    }
  }

  private drop(h: Hull): void { this.hulls.splice(this.hulls.indexOf(h), 1); }

  /** The ship has hit a hull of the traffic (`dies`: it will not survive it). */
  hit(w: World, al: Alien, dies: boolean): void {
    const h = this.hulls.find((x) => x.al === al);
    if (!h) return;
    const now = w.runTime;
    // it runs, and so do the ones near it
    for (const o of this.hulls) {
      if (!o.al.ward || o.al.fleeing) continue;
      if (o.al === al || Math.hypot(o.al.x - al.x, o.al.z - al.z) < SCATTER_R) { leave(o.al); delete o.al.ward; }
    }
    this.strikes.push(now);
    if (dies) this.kills++;
    const alarm = dies || this.strikes.length >= 2;
    if (!alarm) {
      if (now - this.warnAt > 12) {
        this.warnAt = now;
        w.events.push({ type: 'ping', id: `traffic_warn_${Math.floor(now)}`, from: t('Dock control'), caller: 'custody', text: t('“Cease fire. That is a working hull. Next shot calls security.”'), moment: 'calm', system: w.sortie.name });
      }
      return;
    }
    if (now < this.nextDispatch) return;
    this.nextDispatch = now + SECURITY_GAP;
    const n = Math.min(this.kills >= 2 ? 3 : 2, SECURITY_MAX - this.security.length);
    if (n <= 0) return;
    this.pending.push({ at: now + SECURITY_DELAY, n });
    w.events.push({ type: 'ping', id: `traffic_call_${Math.floor(now)}`, from: t('Dock security'), caller: 'custody', text: t('“Fire on civilian traffic. Patrol is on its way. Stand down.”'), moment: 'calm', system: w.sortie.name });
  }

  /** The guards leave the nearer dock, and are held out of the ship's reach to start. */
  private send(w: World, n: number): void {
    const s = w.ship, b = w.bk!;
    const docks = [...(b.port ? [b.port] : []), ...(b.audit && !lockLifted(w.flags) ? [b.audit] : [])];
    const dock = docks.sort((p, q) => Math.hypot(p.x - s.x, p.z - s.z) - Math.hypot(q.x - s.x, q.z - s.z))[0] ?? b.lane;
    let dx = dock.x - s.x, dz = dock.z - s.z;
    let d = Math.hypot(dx, dz) || 1;
    // they come out of the dock's side of the sky, inside the sky's reach (the cull) and outside SECURITY_FROM
    dx /= d; dz /= d; d = Math.min(SECURITY_TO, Math.max(SECURITY_FROM, d));
    for (let i = 0; i < n; i++) {
      const k = (i - (n - 1) / 2) * 12;
      const x = s.x + dx * d - dz * k, z = s.z + dz * d + dx * k;
      const al = w.spawnHostile('picket', { x, y: this.rng.range(0, 3), z }, null, true);
      al.mode = 'approach'; al.approach = 'direct'; al.modeT = 10;
      this.security.push(al);
      this.until.set(al, w.runTime + SECURITY_TTL);
    }
    w.events.push({ type: 'squad', label: 'Dock security' });
  }
}
