import { t } from '../i18n';
import { Rng } from './rng';
import { leave, provoke, VARIANTS, type Alien } from './enemies';
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
const SECURITY_TTL = 70;
export const SECURITY_GAP = 45;
const SECURITY_MAX = 4;
/** The first system past Cerro is a busy yard: fire on a civilian there and Wanted goes to the top, with a bigger and faster response. */
export const FIRST_SECURITY_MAX = 7;
const FIRST_SECURITY_GAP = 25;
/** Seconds between the shot and the guns arriving. */
export const SECURITY_DELAY = 3.5;
/** A second hit inside this many seconds calls them. */
const STRIKE_WINDOW = 60;
/** Traffic within this of a shot hull scatters (units). */
const SCATTER_R = 170;

interface Route {
  id: string;
  /** Runs to or from the port: it may end at the ring's edge (a ship docking) and starts there (one casting off). */
  port?: boolean;
  /** Points as [share of the way to the gate, units off the line (right positive)]. */
  pts: Array<[number, number]>;
  /** Loops forever instead of ending. */
  loop?: boolean;
  /** Hulls that fly it and the pace multiplier they fly it at. */
  ships: string[];
  pace: [number, number];
}

/** The lines of the system, in the course's own frame. None pass through the start, the gate, the dock or the depot. */
const ROUTES: Route[] = [
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


// ── every other system ────────────────────────────────────────────────────
// The sky past the first is busy in proportion to the kind of place it is: a port is a
// crowd, an empty crossing a few freighters, Thren and Voice space nobody at all. The lines
// are laid from the course, so a crossing never runs through the Jump Gate, and a port gets
// its own: ships coming in to dock, ships casting off, and a slow harbour loop about it.
// A Custody patrol drops by now and then to look you over (see `patrolStep`).

/** What a system's traffic is: how many hulls, whether patrols call, and the lines. */
export interface TrafficPlan { n: number; patrols: boolean; routes: Route[]; busy: boolean }

/** Hulls by the kind of place. */
const KIND_N: Record<string, number> = { port: 7, mining: 3, transit: 4, contested: 3, gate: 4, edge: 1 };
/** Who is about silences it: nobody trades in the Hollows, and a raid thins the lanes. */
const here_ = (d: { here?: string[]; thren?: number }): number => (d.here?.some((h) => h === 'voice' || h === 'thren') || (d.thren ?? 0) > 0.3 ? 0 : d.here?.includes('raid') ? 0.5 : 1);

/** A patrol drops by this long after arrival, then again after this many seconds. */
export const PATROL_FIRST: [number, number] = [75, 110];
const PATROL_GAP: [number, number] = [150, 220];
/** Per system, at most this many calls. */
export const PATROL_MAX = 3;
/** The patrol comes alongside to this far and keeps this long on the ship. */
const PATROL_STAND = 55;
export const PATROL_LOOK = 6;
/** The heat at which a patrol finds the ship flagged and turns on it. */
export const PATROL_FLAG = 0.6;

/** The plan for this world's system, or null where there is none (the opening, a scene's stage, a quiet hostile sky). */
export function trafficPlan(w: World): TrafficPlan | null {
  const b = w.bk;
  if (!b) return null;
  const d = b.def;
  if (d.first) return { n: TRAFFIC_N, patrols: false, routes: ROUTES, busy: true };
  if (d.home || (d.situation && !d.home)) return null;
  const n = Math.round((KIND_N[d.kind] ?? 0) * here_(d));
  if (n <= 0) return null;
  return { n, patrols: !d.safe && d.kind !== 'edge', routes: [], busy: false };
}

/** The Custody's relay post (docs/SITES.md): an unmanned beacon off the course that scans a flagged ship and routes a patrol to it. Jammed by slow flight alongside it. */
export interface RelayPost { x: number; z: number; lock: number; jam: number; jammedUntil: number; calledAt: number }
/** How far it scans (units), how near and how slow the ship must be to jam it, how long that takes (s) and holds (s), and the quiet between its calls (s). */
export const RELAY_R = 110;
export const RELAY_JAM_R = 28;
const RELAY_JAM_SPEED = 18;
const RELAY_JAM_T = 4;
export const RELAY_JAMMED = 120;
const RELAY_LOCK_T = 3;
const RELAY_GAP = 45;

interface Hull { al: Alien; route: Route; leg: number; }
interface Patrol { al: Alien[]; phase: 'in' | 'look' | 'out'; since: number; side: number }

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
  private routes: Route[];
  private n: number;
  private busy: boolean;
  private patrols: boolean;
  private patrol: Patrol | null = null;
  private patrolled = 0;
  private crews: Alien[] = [];
  private nextPatrol = Infinity;
  /** The relay post of a system that has patrols, or null. */
  relayPost: RelayPost | null = null;

  constructor(w: World, plan: TrafficPlan) {
    const b = w.bk!, h = w.ship.heading;
    this.fx = Math.cos(h); this.fz = -Math.sin(h); this.rx = Math.sin(h); this.rz = Math.cos(h);
    this.len = b.def.lane; this.x0 = w.ship.x; this.z0 = w.ship.z;
    this.rng = new Rng(0x7a1f ^ w.seed);
    this.n = plan.n; this.busy = plan.busy; this.patrols = plan.patrols;
    this.routes = plan.routes.length ? plan.routes : this.lay(w);
    if (this.patrols) {
      this.nextPatrol = w.runTime + this.rng.range(PATROL_FIRST[0], PATROL_FIRST[1]);
      // off the line, a good way along: never in the flight path, never on the gate or the port
      const side = this.rng.next() < 0.5 ? -1 : 1, off = 380 + this.rng.range(0, 80);
      this.relayPost = { x: this.x0 + this.fx * this.len * 0.4 + this.rx * side * off, z: this.z0 + this.fz * this.len * 0.4 + this.rz * side * off, lock: 0, jam: 0, jammedUntil: 0, calledAt: -Infinity };
    }
    for (let i = 0; i < this.n; i++) this.launch(w, true);
  }

  /** The lines of an ordinary system, from the course: crossings, the miners' circuit and, at a port, its own. */
  private lay(w: World): Route[] {
    const b = w.bk!, len = this.len;
    const rs: Route[] = [
      { id: 'freight', pts: [[0.25, -950], [0.45, 950]], ships: ['hauler', 'liner'], pace: [0.9, 1.4] },
      { id: 'return', pts: [[0.62, 1100], [0.34, -1000]], ships: ['hauler', 'barge'], pace: [1.1, 1.7] },
      { id: 'passage', pts: [[0.05, 1750], [0.55, 1550], [1.1, 1700]], ships: ['liner', 'hauler'], pace: [2, 2.8] },
    ];
    if (b.def.kind === 'mining') rs.push({ id: 'seam', pts: [[0.4, -450], [0.5, -650], [0.6, -480], [0.5, -300]], loop: true, ships: ['barge', 'barge', 'hauler'], pace: [0.8, 1.1] });
    if (b.port) {
      const dx = b.port.x - this.x0, dz = b.port.z - this.z0;
      const pf = (dx * this.fx + dz * this.fz) / len, po = dx * this.rx + dz * this.rz;
      const rel = (a: number, c: number): [number, number] => [pf + a / len, po + c];
      const ring: Array<[number, number]> = [];
      for (let i = 0; i < 8; i++) { const th = (i / 8) * Math.PI * 2; ring.push(rel(Math.cos(th) * 170, Math.sin(th) * 170)); }
      rs.push(
        // ships coming in to dock, ending at the ring's edge
        { id: 'dock-in', port: true, pts: [rel(-620, 420), rel(-250, 150), rel(-62, 52)], ships: ['hauler', 'barge'], pace: [0.9, 1.3] },
        { id: 'dock-in2', port: true, pts: [rel(300, -520), rel(130, -200), rel(52, -62)], ships: ['barge', 'hauler'], pace: [0.9, 1.2] },
        // and ships casting off
        { id: 'cast-off', port: true, pts: [rel(60, 52), rel(260, 160), rel(700, 460)], ships: ['hauler', 'liner'], pace: [0.8, 1.2] },
        // the slow harbour round it
        { id: 'harbour', port: true, pts: ring, loop: true, ships: ['barge', 'barge'], pace: [0.55, 0.8] },
      );
    }
    // none runs through the Jump Gate, nor (but a port's own) through a dock
    const clear = (r: Route): boolean => {
      if (r.port) return true;
      for (let i = 0; i < r.pts.length - 1; i++) {
        for (let k = 0; k <= 12; k++) {
          const a = this.at(r.pts[i]!), c = this.at(r.pts[i + 1]!), u = k / 12;
          const x = a.x + (c.x - a.x) * u, z = a.z + (c.z - a.z) * u;
          if (this.rings(w).some((q) => Math.hypot(x - q.x, z - q.z) < q.r + 40)) return false;
        }
      }
      return true;
    };
    return rs.filter(clear);
  }

  /** A point of the course frame in the world. */
  at(p: [number, number]): { x: number; z: number } {
    return { x: this.x0 + this.fx * this.len * p[0] + this.rx * p[1], z: this.z0 + this.fz * this.len * p[0] + this.rz * p[1] };
  }

  get count(): number { return this.hulls.length; }
  /** A hull of a Custody patrol that has not turned on the ship (it reads as Custody, not as a hostile). */
  isPatrol(al: Alien): boolean { return this.crews.includes(al) && !!(al.ward || al.fleeing); }
  get patrolCalls(): number { return this.patrolled; }
  get responders(): number { return this.security.length; }
  owns(al: Alien): boolean { return this.hulls.some((h) => h.al === al); }

  private rings(w: World): Array<{ x: number; z: number; r: number }> {
    const b = w.bk!;
    return [b.lane, ...(b.port ? [b.port] : []), ...(b.audit ? [b.audit] : [])].map((p) => ({ x: p.x, z: p.z, r: 60 }));
  }

  /** Put a hull on a route: at a random stretch of it when the system is first dealt, else at its start. */
  private launch(w: World, deal: boolean): void {
    for (let tries = 0; tries < 8; tries++) {
      const route = this.routes[this.pick++ % this.routes.length]!;
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
      if (this.hulls.length < this.n) this.launch(w, false);
    }
    // a patrol, now and then
    if (this.patrols) { this.relayStep(w, dt); this.patrolStep(w); }
    // the dock's security, when called
    const now = w.runTime;
    this.strikes = this.strikes.filter((t) => now - t < STRIKE_WINDOW);
    for (const p of [...this.pending]) {
      if (now < p.at) continue;
      this.pending.splice(this.pending.indexOf(p), 1);
      this.send(w, p.n);
    }
  }

  /** The relay post: a flagged ship in its reach for a few seconds calls the patrol now; slow flight alongside jams it for two minutes. */
  private relayStep(w: World, dt: number): void {
    const r = this.relayPost;
    if (!r || !w.alive) return;
    const s = w.ship, now = w.runTime, b = w.bk!;
    if (now < r.jammedUntil) return;
    const d = Math.hypot(s.x - r.x, s.z - r.z), speed = Math.hypot(s.vx, s.vz);
    // jamming: close and slow
    if (d < RELAY_JAM_R && speed < RELAY_JAM_SPEED) r.jam += dt; else r.jam = Math.max(0, r.jam - dt);
    if (r.jam >= RELAY_JAM_T) {
      r.jam = 0; r.lock = 0; r.jammedUntil = now + RELAY_JAMMED;
      b.heat = Math.min(1, b.heat + 0.03);
      w.events.push({ type: 'ping', id: `relay_jam_${this.patrolled}`, from: t('Relay post'), caller: 'custody', text: t('“Relay post offline. Signal lost.”'), moment: 'calm', system: w.sortie.name });
      return;
    }
    // scanning: a flagged hull in reach
    if (d < RELAY_R && b.heat >= PATROL_FLAG) r.lock += dt; else r.lock = Math.max(0, r.lock - dt);
    if (r.lock >= RELAY_LOCK_T && now - r.calledAt > RELAY_GAP) {
      r.lock = 0; r.calledAt = now;
      if (!this.patrol) { this.nextPatrol = now; this.patrolled = Math.min(this.patrolled, PATROL_MAX - 1); }
      w.events.push({ type: 'ping', id: `relay_call_${Math.floor(now)}`, from: t('Relay post'), caller: 'custody', text: t('“Flagged hull in range. Patrol routed.”'), moment: 'calm', system: w.sortie.name });
    }
  }

  /** A Custody patrol comes alongside, looks the ship over and goes. A flagged ship (Wanted high) gets more than a look. */
  private patrolStep(w: World): void {
    const s = w.ship, b = w.bk!, now = w.runTime;
    this.crews = this.crews.filter((a) => w.aliens.includes(a));
    const p = this.patrol;
    if (!p) {
      if (now < this.nextPatrol || this.patrolled >= PATROL_MAX || !w.alive) return;
      // never while there is a fight, a dock, a gate or a scene to mind
      if (w.aliens.some((a) => w.committed(a)) || w.inDanger() || w.stage) return;
      if (this.rings(w).some((r) => Math.hypot(s.x - r.x, s.z - r.z) < 220)) return;
      this.send2(w);
      return;
    }
    p.al = p.al.filter((a) => w.aliens.includes(a));
    // shot at, or one of them has turned: it is a fight now
    if (!p.al.length) { this.patrol = null; return; }
    if (p.al.some((a) => !a.ward)) { this.turn(w, p.al); return; }
    if (w.aliens.some((a) => w.committed(a) && Math.hypot(a.x - s.x, a.z - s.z) < 500) || w.inDanger()) { this.part(w, p.al); return; }
    const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), rx = Math.sin(s.heading), rz = Math.cos(s.heading);
    let near = 0;
    p.al.forEach((a, i) => {
      const k = PATROL_STAND * (1 + 0.7 * i), back = 14 * i;
      const x = s.x + s.vx * 1.2 + rx * p.side * k - fx * back, z = s.z + s.vz * 1.2 + rz * p.side * k - fz * back;
      a.mode = 'drift'; a.ax = x; a.az = z;
      if (a.ward) { a.ward.hx = x; a.ward.hz = z; }
      if (Math.hypot(a.x - s.x, a.z - s.z) < PATROL_STAND * 2.2) near++;
    });
    if (p.phase === 'in' && near === p.al.length) {
      p.phase = 'look'; p.since = now;
      w.events.push({ type: 'ping', id: `patrol_${this.patrolled}`, from: t('Custody patrol'), caller: 'custody', text: t('“Routine check. Hold your course.”'), moment: 'calm', system: w.sortie.name });
    } else if (p.phase === 'look' && now - p.since >= PATROL_LOOK) {
      if (b.heat >= PATROL_FLAG) {
        w.events.push({ type: 'ping', id: `patrol_flag_${this.patrolled}`, from: t('Custody patrol'), caller: 'custody', text: t('“Your hull is flagged. Stand down.”'), moment: 'calm', system: w.sortie.name });
        this.turn(w, p.al);
      } else this.part(w, p.al);
    }
  }

  private send2(w: World): void {
    const s = w.ship, b = w.bk!;
    const side = this.patrolled % 2 ? -1 : 1;
    const fx = Math.cos(s.heading), fz = -Math.sin(s.heading), rx = Math.sin(s.heading), rz = Math.cos(s.heading);
    const al: Alien[] = [];
    for (let i = 0; i < 2; i++) {
      const x = s.x + rx * side * (300 + 24 * i) - fx * (170 + 20 * i), z = s.z + rz * side * (300 + 24 * i) - fz * (170 + 20 * i);
      const a = w.spawnHostile('picket', { x, y: this.rng.range(-1, 1), z }, null, true);
      a.canCloak = false; a.cloak = 0; a.escort = false; a.ttl = 0; a.mode = 'drift';
      a.spK *= 1.9;
      a.ax = s.x; a.az = s.z;
      a.face = Math.atan2(-(s.z - z), s.x - x);
      a.ward = { act: 'pass', temper: 'wary', hx: s.x, hz: s.z, ring: 0, warned: 0, tag: 'Custody patrol' };
      al.push(a);
    }
    this.crews.push(...al);
    this.patrol = { al, phase: 'in', since: w.runTime, side };
    this.patrolled++;
    void b;
  }

  /** Looked over and let go: they peel away. */
  private part(w: World, al: Alien[]): void {
    for (const a of al) { delete a.ward; leave(a); }
    this.patrol = null;
    this.nextPatrol = w.runTime + this.rng.range(PATROL_GAP[0], PATROL_GAP[1]);
  }

  /** They turn on the ship, and give up after the dock's security time. */
  private turn(w: World, al: Alien[]): void {
    for (const a of al) {
      if (a.ward) provoke(a, w.events);
      this.security.push(a);
      this.until.set(a, w.runTime + SECURITY_TTL);
    }
    this.patrol = null;
    this.nextPatrol = w.runTime + this.rng.range(PATROL_GAP[0], PATROL_GAP[1]);
  }

  private drop(h: Hull): void { this.hulls.splice(this.hulls.indexOf(h), 1); }

  /** The ship has hit a hull of the traffic (`dies`: it will not survive it). */
  hit(w: World, al: Alien, dies: boolean): void {
    if (this.patrol?.al.includes(al)) { this.turn(w, this.patrol.al); return; }
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
    const busy = this.busy;
    if (busy && w.bk) {
      w.bk.heat = 1;
      w.bk.nextPursuit = Math.min(w.bk.nextPursuit, now + 8);
    }
    const alarm = busy || dies || this.strikes.length >= 2;
    if (!alarm) {
      if (now - this.warnAt > 12) {
        this.warnAt = now;
        w.events.push({ type: 'ping', id: `traffic_warn_${Math.floor(now)}`, from: t('Dock control'), caller: 'custody', text: t('“Cease fire. That’s a working hull. Next shot calls security.”'), moment: 'calm', system: w.sortie.name });
      }
      return;
    }
    if (now < this.nextDispatch) return;
    this.nextDispatch = now + (busy ? FIRST_SECURITY_GAP : SECURITY_GAP);
    const n = Math.min(busy ? (this.kills >= 1 ? 5 : 4) : this.kills >= 2 ? 3 : 2, (busy ? FIRST_SECURITY_MAX : SECURITY_MAX) - this.security.length);
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
