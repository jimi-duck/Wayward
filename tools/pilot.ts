import { angleDelta, clamp } from '../src/core/math';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { UPGRADE, type Branch } from '../src/content/upgrades';
import { ALIEN_TYPES, beamLive, cloaked, FIRE_RANGE, rayDist } from '../src/sim/enemies';
import { identity } from '../src/sim/build';
import { thrustPerStep, topSpeed, turnPerStep } from '../src/sim/ship';
import { BASE } from '../src/sim/stats';
import { SHIP_R } from '../src/sim/tuning';
import { World } from '../src/sim/world';
import { PATCH_COST } from '../src/sim/breakout';
import type { Tone } from '../src/sim/comms';
import type { RunStats } from '../src/sim/run';
import type { GameEvent } from '../src/sim/events';
import { blockOf, budgets, cost, reachable } from '../src/sim/bay';
import { FITTING } from '../src/content/web';
import { MODULE_BY_ID } from '../src/content/modules';
import type { SurvivalId } from '../src/content/survival';

// ── the scripted pilot ────────────────────────────────────────────────────
// A competent, unspectacular player, for balancing. It picks a goal (nose
// on a target at its weapon's range, leading it; else toward krail,
// pickups and objectives), then keeps that goal safe with a short look-ahead:
// ten times a second it flies a dozen candidate headings 1.2s forward
// against where rock, hulls, fire, beams, telegraphed charges and landing
// circles will be, and takes the safest that still serves the goal. It sees
// new fire only after a person's reaction time, shoots what is in front of
// it, rolls when the look-ahead finds no clean line, and builds the ship to a strategy from the cards
// it is dealt, and answers comms cards by a policy. It plays through the same
// API the app does (step, choose, answerHail, answer), so a balance number
// here is a number in the game.

export type Strategy =
  | { kind: 'random' }
  | { kind: 'focus'; branch: Branch; second?: Branch };

/** How the pilot answers comms cards: by the kind of answer it reaches for first. */
export type Policy = 'fight' | 'run' | 'pay' | 'bluff';
const PREFER: Record<Policy, Tone[]> = {
  fight: ['fight', 'help', 'trade', 'refuse', 'pay', 'bluff', 'run'],
  run: ['run', 'refuse', 'trade', 'pay', 'help', 'bluff', 'fight'],
  pay: ['pay', 'trade', 'help', 'refuse', 'bluff', 'run', 'fight'],
  bluff: ['bluff', 'trade', 'help', 'pay', 'refuse', 'run', 'fight'],
};

/** One answered card, and what it did to the ship there and then. */
export interface Answer {
  card: string;
  choice: string;
  won: boolean;
  krail: number;
  chits: number;
  heat: number;
  /** Hostile hulls it brought, or the blockade it started. */
  fight: boolean;
}

export interface PilotOptions {
  maxTime?: number;
  /** Evade every hail that can be evaded. */
  evade?: boolean;
  unlocked?: string[];
  /** The survival mode (content/survival.ts), the baseline unless given. */
  survival?: SurvivalId;
  /** Input lag in steps (reaction to new fire is modelled separately, REACT). */
  lag?: number;
  /** Fly the Breakout instead of the endless arcade run. */
  breakout?: boolean;
  /** How to answer comms cards (the Breakout). Bluff by default. */
  policy?: Policy;
  /** Docked at a port (once a dock, before trading): the journey's chance to plot again. */
  onDock?: (w: World) => void;
  /** An answer to take before the policy's, when it has one (the ship pilot uses what it built). */
  answer?: (w: World) => string | null;
  /** Sees every event and the world after each step, for the measuring tools. */
  watch?: (w: World, events: readonly GameEvent[]) => void;
  /** The yard's modules the pilot wants at a port (the Story mode), most wanted first; others it leaves. */
  modules?: string[];
}

export interface PilotResult {
  run: RunStats;
  strategy: string;
  identity: string;
  /** Plates lost and gained in each minute. */
  lostByMinute: number[];
  gainedByMinute: number[];
  /** Run time at which refits 1, 5, 10 and 15 came. */
  refitAt: Record<number, number>;
  bossFights: Array<{ faction: string; outcome: 'killed' | 'escaped' | 'died'; seconds: number; hpLeft: number; refit: number }>;
  /** Seconds with a hostile in firing range, or a capital ship fighting. */
  combat: number;
  /** Seconds with three or more hostiles in firing range at once, and the most there ever were. */
  crowd: number;
  peak: number;
  /** The longest stretch, in seconds, with no hostile in firing range and no capital ship fighting, and how many times a hostile came into range from nothing. */
  longestCalm: number;
  contacts: number;
  /** The arcade's refit bay at the end: the budgets drawn against the ratings. */
  budget: { use: { power: number; mass: number; heat: number }; cap: { power: number; mass: number; heat: number } };
  answers: Answer[];
}

/**
 * The comms answer. The policy's favourite kind of answer the ship can take
 * (a bluff only if the odds are at least even), then the next kind. It never
 * reads the intent estimate: the report shows what a player who always
 * answers the same way gets.
 */
export function pickAnswer(w: World, policy: Policy): string {
  const o = (w.comms ?? w.call)!;
  for (const tone of PREFER[policy]) {
    const c = o.choices.find((ch) => ch.ok && ch.tone === tone && (tone !== 'bluff' || ch.odds === null || ch.odds >= 0.4));
    if (c) return c.id;
  }
  return o.choices.find((ch) => ch.ok)!.id;
}

const blank = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' });

export function stratName(s: Strategy): string {
  return s.kind === 'random' ? 'random' : `${s.branch}${s.second ? `+${s.second}` : ''}`;
}

const KIND_BONUS: Record<string, number> = { system: 4, spec: 5, synergy: 4, tech: 5, stat: 1 };
const WEAPON_BRANCHES = new Set<string>(['laser', 'torpedo', 'mine', 'plasma', 'close']);

/** How much the strategy wants a module of the bay: its branch, then its second, a little defence, tech and synergies; fittings when their budget is short; the yard's modules it was told to want. */
function want(w: World, s: Strategy, id: string, modules: readonly string[] = []): number {
  if (MODULE_BY_ID[id]) { const i = modules.indexOf(id); return i < 0 ? -1 : 16 - i; }
  if (FITTING[id]) {
    // a fitting when its budget is short: power nearly gone, or the ship run hot or heavy
    const { use, cap } = budgets(w.levels);
    if (id === 'rx_core') return cap.power - use.power < 2 ? 14 : 0.5;
    if (id === 'rx_sinks') return use.heat > cap.heat ? 13 : 0.5;
    return use.mass > cap.mass ? 12 : 0.5;
  }
  const u = UPGRADE[id]!;
  if (s.kind === 'random') return 1;
  let v = u.branch === s.branch ? 10 : u.branch === s.second ? 6 : 0;
  if (!WEAPON_BRANCHES.has(s.branch) && !(s.second && WEAPON_BRANCHES.has(s.second)) && u.branch === 'laser') v += 8;
  if (u.branch === 'defence') v += 3;
  if (u.branch === s.branch || u.branch === s.second || u.kind === 'tech' || u.kind === 'synergy') v += KIND_BONUS[u.kind] ?? 0;
  else if (u.kind === 'system') v -= 3;
  return v;
}

/**
 * The refit bay, in a quiet moment (or as it opens by itself, in the arcade): the module the strategy wants most of
 * those it could fit with Krail enough. Bought if the Krail is there; if
 * power is what stops it, the reactor core first; otherwise the pilot saves
 * for it. A random pilot buys whatever it can afford, at random. A pilot
 * told to want some of the yard's modules fits them first at a port, and
 * away from one keeps back the Krail the next of them costs.
 */
function shop(w: World, s: Strategy, rngPick: () => number, modules: readonly string[] = []): void {
  if (w.phase !== 'bay' && !w.openBay()) return;
  // the arcade's bay shuts itself after one pick, and opens again when the Krail is there
  for (let i = 0; i < (w.bk ? 6 : 1); i++) {
    const ctx = w.bayCtx();
    const open = reachable(ctx);
    if (!open.length) break;
    let pick: string | null;
    // the yard's modules it was told to want come first, whenever one can be fitted
    const wanted = modules.find((id) => blockOf(id, ctx) === null);
    if (wanted) pick = wanted;
    else if (s.kind === 'random') {
      const now = open.filter((n) => blockOf(n.id, ctx) === null && !MODULE_BY_ID[n.id]);
      pick = now.length ? now[Math.floor(rngPick() * now.length)]!.id : null;
    } else {
      const best = open.map((n) => ({ id: n.id, v: want(w, s, n.id, modules) + rngPick() })).sort((a, b) => b.v - a.v)[0]!;
      const why = blockOf(best.id, ctx);
      pick = why === null ? best.id : why === 'power' && blockOf('rx_core', ctx) === null ? 'rx_core' : null;
    }
    // away from a port, keep back the Krail the next wanted yard module will cost, as a player saving for the yard would
    if (pick && !MODULE_BY_ID[pick] && !w.docked && w.krail - cost(pick, (w.levels[pick] ?? 0) + 1, !w.bk) < saveFor(w, modules)) break;
    if (!pick || w.install(pick)) break;
  }
  w.closeBay();
}

/** The Krail to keep for the first wanted yard module that a port could fit (nothing once they are all in). */
function saveFor(w: World, modules: readonly string[]): number {
  const port = { ...w.bayCtx(), docked: true, krail: Infinity, chits: Infinity };
  const next = modules.find((id) => blockOf(id, port) === null);
  return next ? cost(next, (w.levels[next] ?? 0) + 1, !w.bk) : 0;
}

/**
 * What a ram would do right now, at this speed, with a little margin: a
 * steady player knows a nudge from a ram, and does not fly into a hull the
 * prow will not break.
 */
function ramNow(w: World): number {
  const st = w.stats, s = w.ship;
  const f = Math.min(1, Math.hypot(s.vx, s.vz) / topSpeed(w.hull));
  return Math.max(BASE.ramDamage, st.ramDamage * (st.ramjet ? 0.5 + f : 0.5 + 0.5 * f)) * w.dmgMult * 0.9;
}

/** Reaction time to new fire: a shot is invisible to the pilot until it has existed this long. */
const REACT = 0.2;

/** What the pilot remembers between steps: when each shot was first seen, and the current plan. */
interface Memo { seen: Map<number, number>; plan: { heading: number; thrust: number; until: number } | null }

const PLAN_DT = 0.1, PLAN_STEPS = 12, PLAN_EVERY = 5;
const OFFSETS = [0, 0.4, -0.4, 0.8, -0.8, 1.25, -1.25, 1.7, -1.7, 2.3, -2.3, Math.PI];

interface Obstacle { x: number; z: number; vx: number; vz: number; r: number; /** live from, until (seconds ahead) */ from: number; to: number; }

/**
 * A short look ahead: try a dozen headings, with and without thrust, fly
 * each 1.2s forward against where everything will be, and score it by how
 * close it comes to something that hurts, plus how far it strays from what
 * the pilot wants. Returns the best, and the risk it still carries.
 */
function plan(w: World, goal: number, goalThrust: number, seen: Map<number, number>, close: boolean): { heading: number; thrust: number; risk: number } {
  const s = w.ship, hull = w.hull, st = w.stats, ram = ramNow(w);
  const obs: Obstacle[] = [];
  const near = (x: number, z: number, m: number) => Math.abs(x - s.x) < m && Math.abs(z - s.z) < m;
  for (const r of w.field.rocks) {
    if (close && st.ramSafe && r.size > 0) continue;
    if (near(r.x, r.z, 40)) obs.push({ x: r.x, z: r.z, vx: r.vx, vz: r.vz, r: r.r * 0.88, from: 0, to: 9 });
  }
  for (const b of w.field.bulwarks) if (near(b.x, b.z, 60)) obs.push({ x: b.x, z: b.z, vx: b.vx, vz: b.vz, r: b.r * 0.88, from: 0, to: 9 });
  for (const a of w.aliens) {
    if (close && st.ramSafe && a.hp < ram) continue;
    if (near(a.x, a.z, 40) && Math.abs(a.y + a.vy * 0.5) < 3.2) obs.push({ x: a.x, z: a.z, vx: a.vx, vz: a.vz, r: a.r, from: 0, to: 9 });
  }
  for (const sh of w.shots) {
    const first = seen.get(sh.id) ?? w.time;
    if (!seen.has(sh.id)) seen.set(sh.id, first);
    if (w.time - first < REACT || !near(sh.x, sh.z, 45)) continue;
    // only while it is down near the plane
    const vy = sh.vy, y = sh.y;
    let from = 0, to = 9;
    if (Math.abs(vy) > 0.01) { const t0 = (-2 - y) / vy, t1 = (2 - y) / vy; from = Math.max(0, Math.min(t0, t1)); to = Math.max(t0, t1); }
    else if (Math.abs(y) > 2) continue;
    obs.push({ x: sh.x, z: sh.z, vx: sh.vx, vz: sh.vz, r: sh.r, from, to });
  }
  for (const wb of w.webs) if (wb.r > 1 && near(wb.x, wb.z, 40)) obs.push({ x: wb.x, z: wb.z, vx: 0, vz: 0, r: wb.r * 0.92, from: 0, to: wb.life });
  for (const k of w.strikes) if (k.kind !== 'web' && near(k.x, k.z, 30)) obs.push({ x: k.x, z: k.z, vx: 0, vz: 0, r: k.r, from: k.t - 0.15, to: k.t + 0.1 });
  const boss = w.command.boss;
  if (boss && !boss.arriving && boss.cloak < 0.5) obs.push({ x: boss.x, z: boss.z, vx: boss.vx, vz: boss.vz, r: boss.r * 0.85, from: 0, to: 9 });
  // a telegraphed charge or strafe: the capital ship will come down that line when the telegraph runs out
  if (boss && boss.windT > 0 && (boss.attack === 'charge' || boss.attack === 'strafe')) {
    const sp = boss.attack === 'charge' ? 44 : 30, ang = boss.aimLock;
    obs.push({ x: boss.x, z: boss.z, vx: Math.cos(ang) * sp, vz: -Math.sin(ang) * sp, r: boss.r * 0.85 + 1, from: boss.windT, to: boss.windT + 1.3 });
  }
  // beams: the ray, while it burns (and a little before)
  const beams: Array<{ x: number; z: number; a: number; from: number; to: number }> = [];
  for (const a of w.aliens) if (a.beamT > 0 && Math.abs(a.y) < 3) beams.push({ x: a.x, z: a.z, a: a.beamAng, from: Math.max(0, a.beamT - 1.35 - 0.2), to: a.beamT });
  for (const bm of boss?.beams ?? []) if (bm.beamT > 0) beams.push({ x: bm.x, z: bm.z, a: bm.beamAng, from: Math.max(0, bm.beamT - 1.35 - 0.2), to: bm.beamT });

  const acc = thrustPerStep(hull) * 60, turn = turnPerStep(hull) * 60, drag = Math.pow(hull.drag, PLAN_DT * 60);
  let best = { heading: goal, thrust: goalThrust, risk: Infinity }, bestCost = Infinity;
  const candidates: Array<[number, number]> = [];
  for (const o of OFFSETS) for (const t of [1, 0]) candidates.push([s.heading + o, t]);
  for (const t of [1, 0]) candidates.push([goal, t]);
  for (const [hc, thr] of candidates) {
    let x = s.x, z = s.z, vx = s.vx, vz = s.vz, h = s.heading, risk = 0;
    for (let i = 1; i <= PLAN_STEPS; i++) {
      const t = i * PLAN_DT;
      h += clamp(angleDelta(h, hc), -turn * PLAN_DT, turn * PLAN_DT);
      if (thr) { vx += Math.cos(h) * acc * PLAN_DT * thr; vz -= Math.sin(h) * acc * PLAN_DT * thr; }
      vx *= drag; vz *= drag;
      x += vx * PLAN_DT; z += vz * PLAN_DT;
      const wgt = 1 - 0.55 * (t / (PLAN_STEPS * PLAN_DT));
      for (const o of obs) {
        if (t < o.from || t > o.to) continue;
        const c = Math.hypot(o.x + o.vx * t - x, o.z + o.vz * t - z) - o.r - SHIP_R;
        if (c < 0) risk += 60 * wgt;
        else if (c < 1.6) risk += (1.6 - c) * 8 * wgt;
      }
      for (const b of beams) {
        if (t < b.from || t > b.to) continue;
        const c = rayDist(x, z, b.x, b.z, b.a, 54) - 0.7 - SHIP_R;
        if (c < 0) risk += 60 * wgt;
        else if (c < 2) risk += (2 - c) * 6 * wgt;
      }
    }
    const stray = Math.abs(angleDelta(hc, goal)) * 2.5 + (thr !== (goalThrust > 0.5 ? 1 : 0) ? 0.8 : 0);
    const cost = risk + stray;
    if (cost < bestCost) { bestCost = cost; best = { heading: hc, thrust: thr, risk }; }
  }
  return best;
}

/** One step of flying: the goal, the look-ahead that keeps it safe, the trigger and the roll. */
function control(w: World, close: boolean, memo: Memo): InputFrame {
  const seen = memo.seen;
  const f = blank();
  const s = w.ship, st = w.stats;
  let ax = 0, az = 0;
  /** The pull of what it wants and the push of what hurts, summed into the goal direction. */
  const push = (dx: number, dz: number, k: number) => { ax += dx * k; az += dz * k; };
  const flee = push;

  // pulled toward krail and pickups
  for (const p of w.pickups) {
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz) || 1;
    if (d > 45) continue;
    const want = p.kind === 'crystal' ? 0.6 : p.kind === 'repair' ? (w.plates < st.maxPlates ? 4 : 0.3) : 2.5;
    push(dx / d, dz / d, want * (1 - d / 50));
  }
  // the Breakout: the course. Port when the hold is nearly full or the hull wants patching and there is
  // money for it; the lane mouth once the tank holds the jump; drifting lane-ward meanwhile
  const bk = w.bk;
  const need = !!bk && w.cyrite < bk.jumpCost;
  const pr = w.prices;
  const hungry = !!bk && w.food < 9 && w.chits + w.ore * pr.ore >= pr.food * 6;
  const goPort = !!bk && !!bk.port && bk.docks === 0
    && (w.ore >= w.holdMax * 0.8 || hungry || (w.plates < st.maxPlates && w.parts < PATCH_COST && (w.chits + w.ore * pr.ore) >= pr.plate));
  const dest = bk ? (goPort ? bk.port : !need ? bk.lane : null) : null;
  if (bk) {
    const wp = dest ?? bk.lane, dx = wp.x - s.x, dz = wp.z - s.z, d = Math.hypot(dx, dz) || 1;
    push(dx / d, dz / d, dest ? 3 : 0.5);
  }
  // objectives
  const e = w.encounter;
  if (e && !e.done && (e.id === 'distress' || e.id === 'derelict')) {
    const dx = e.x - s.x, dz = e.z - s.z, d = Math.hypot(dx, dz) || 1;
    push(dx / d, dz / d, d > e.r * 0.6 ? 2.5 : 0);
  }
  if (e && !e.done && e.id === 'anomaly') {
    const dx = s.x - e.x, dz = s.z - e.z, d = Math.hypot(dx, dz) || 1;
    if (d < 20) push(dx / d, dz / d, 6 * (1 - d / 20));
  }

  // a target at our range: hulls first, then rock
  const targets = w.targets();
  const prefer = close ? 6 : 30;
  let tgt: { x: number; z: number; y?: number; vx: number; vz: number } | null = targets.boss;
  let td = tgt ? Math.hypot(tgt.x - s.x, tgt.z - s.z) : Infinity;
  for (const a of targets.ships) {
    // a ward (traffic, a visitor) is not shot at: the pilot has no quarrel with it
    if (w.aliens.some((x) => x.id === (a as { id?: number }).id && x.ward)) continue;
    const d = Math.hypot(a.x - s.x, a.z - s.z);
    if (d < td && d < (bk ? 32 : 55) && Math.abs(a.y ?? 0) < 12) { td = d; tgt = a; }
  }
  // no hull in reach: mine the field, nearest first, the rich before the rest
  // (the Breakout: only while there is mining to do; on the way to a berth it keeps going)
  let mining: (typeof w.field.rocks)[number] | null = null;
  if (!tgt && !(bk && dest)) {
    let best = Infinity;
    for (const r of w.field.rocks) {
      const d = Math.hypot(r.x - s.x, r.z - s.z);
      const veined = r.kind === 'rich';
      const k = d * (veined ? (need ? 0.25 : 0.6) : r.kind === 'volatile' ? 2 : 1);
      if (bk && !veined && w.ore >= w.holdMax) continue;
      if (k < best && d < 50) { best = k; td = d; tgt = r; mining = r; }
    }
  }
  const aimAt = tgt, aimD = td;
  const standoff = bk && mining ? mining.r + 6 : prefer;
  if (tgt) {
    const dx = tgt.x - s.x, dz = tgt.z - s.z, d = Math.hypot(dx, dz) || 1;
    push(dx / d, dz / d, d > standoff ? 0.8 : -0.8);
  }

  // pushed away from what hurts: rock and hulls by where they will be, not where they are
  let dodge = false;
  const avoid = (x: number, z: number, vx: number, vz: number, r: number, k: number, horizon: number) => {
    const rx = x - s.x, rz = z - s.z, d = Math.hypot(rx, rz) - r - SHIP_R;
    if (d > 40) return;
    const wx = vx - s.vx, wz = vz - s.vz, vv = wx * wx + wz * wz || 1;
    const t = clamp(-(rx * wx + rz * wz) / vv, 0, horizon);
    const cx = rx + wx * t, cz = rz + wz * t, miss = Math.hypot(cx, cz) - r - SHIP_R;
    if (miss > 2.5 && d > 3) return;
    const m = Math.hypot(cx, cz) || 1, urgency = (1 - t / horizon) * (miss < 0.5 ? 1.6 : 1);
    // sideways off the line of approach, and back from it when it is close
    flee(-cx / m, -cz / m, k * urgency);
    if (d < 4) flee(-rx / (d + r + SHIP_R), -rz / (d + r + SHIP_R), k * 0.8);
    if (t < 0.3 && miss < 0.6) dodge = true;
  };
  for (const r of w.field.rocks) {
    if (close && st.ramSafe && r.size === 2) continue;
    avoid(r.x, r.z, r.vx, r.vz, r.r * 0.88, 5, 1.1);
  }
  for (const b of w.field.bulwarks) {
    avoid(b.x, b.z, b.vx, b.vz, b.r * 0.88, 7, 1.4);
    const dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz) - b.r;
    if (d < 6) flee(dx / (d + b.r), dz / (d + b.r), 6 * (1 - d / 6));
  }
  for (const sh of w.shots) {
    const first = seen.get(sh.id) ?? w.time;
    if (!seen.has(sh.id)) seen.set(sh.id, first);
    if (w.time - first < REACT) continue;
    // closest approach in the next 0.9s
    const rx = sh.x - s.x, rz = sh.z - s.z, vx = sh.vx - s.vx, vz = sh.vz - s.vz, vv = vx * vx + vz * vz || 1;
    const t = clamp(-(rx * vx + rz * vz) / vv, 0, 0.9);
    const cx = rx + vx * t, cz = rz + vz * t, miss = Math.hypot(cx, cz);
    if (miss < sh.r + SHIP_R + 1.8 && Math.abs(sh.y + sh.vy * t) < 2) {
      const m = miss || 1;
      flee(-cx / m, -cz / m, 5);
      if (t < 0.28 && miss < sh.r + SHIP_R + 0.4) dodge = true;
    }
  }
  const ram = ramNow(w);
  for (const a of w.aliens) {
    if (cloaked(a)) continue;
    // where it will be: height too, since divers come down onto the plane
    if (a.y + a.vy * 0.6 < 4 && !(close && st.ramSafe && a.hp < ram)) avoid(a.x, a.z, a.vx, a.vz, a.r, 4.5, 0.9);
    if (a.beamT > 0 && Math.abs(a.y) < 3) {
      const ang = a.beamAng, nx = -Math.sin(ang), nz = -Math.cos(ang);
      const side = Math.sign((s.x - a.x) * nx + (s.z - a.z) * nz) || 1;
      flee(nx * side, nz * side, beamLive(a) ? 5 : 3);
    }
  }
  const boss = w.command.boss;
  if (boss) {
    for (const bm of boss.beams) {
      if (bm.beamT <= 0) continue;
      const nx = -Math.sin(bm.beamAng), nz = -Math.cos(bm.beamAng);
      const side = Math.sign((s.x - bm.x) * nx + (s.z - bm.z) * nz) || 1;
      flee(nx * side, nz * side, 5);
    }
    avoid(boss.x, boss.z, boss.vx, boss.vz, boss.r * 0.85, 7, 1.2);
    const dx = s.x - boss.x, dz = s.z - boss.z, d = Math.hypot(dx, dz);
    if (d < 16) flee(dx / d, dz / d, 4);
  }
  for (const k of w.strikes) {
    const dx = s.x - k.x, dz = s.z - k.z, d = Math.hypot(dx, dz) || 1;
    if (d < k.r + 4) flee(dx / d, dz / d, 7);
  }
  for (const t of w.tele) {
    if (t.kind !== 'line') continue;
    const nx = -Math.sin(t.ang), nz = -Math.cos(t.ang);
    const off = (s.x - t.x) * nx + (s.z - t.z) * nz;
    if (Math.abs(off) < 5) flee(nx * Math.sign(off || 1), nz * Math.sign(off || 1), 4);
  }
  for (const wb of w.webs) {
    const dx = s.x - wb.x, dz = s.z - wb.z, d = Math.hypot(dx, dz) - wb.r;
    if (d < 6) flee(dx / (d + wb.r || 1), dz / (d + wb.r || 1), 7 * (1 - d / 6));
  }

  // the goal: nose on a target in reach, leading it; otherwise toward whatever pulls (krail, pickups, objectives)
  const speed = Math.hypot(s.vx, s.vz) / topSpeed(w.hull);
  let want = s.heading, thrust = 0;
  const berth = dest ? Math.hypot(dest.x - s.x, dest.z - s.z) : Infinity;
  if (dest && berth < 70) {
    // coming in to a berth: point at it and come in slowly, to stop inside the ring
    want = Math.atan2(-(dest.z - s.z), dest.x - s.x);
    thrust = berth > dest.r * 0.5 && speed < Math.min(0.3, berth / 160) ? 1 : 0;
  } else if (aimAt && aimD < st.laserSpeed * st.laserLife * 0.85) {
    const lead = aimD / st.laserSpeed;
    want = Math.atan2(-(aimAt.z + aimAt.vz * lead - s.z), aimAt.x + aimAt.vx * lead - s.x);
    // hold standoff: close in if far, coast if near
    thrust = aimD > standoff + 8 && speed < 0.5 ? 1 : speed < 0.12 ? 0.3 : 0;
  } else if (Math.hypot(ax, az) > 0.05) {
    want = Math.atan2(-az, ax);
    thrust = speed < 0.55 ? 1 : 0;
  }
  // the look-ahead keeps the goal safe, ten times a second
  if (!memo.plan || w.time >= memo.plan.until) {
    const p = plan(w, want, thrust, seen, close);
    memo.plan = p.risk > 0.5 ? { heading: p.heading, thrust: p.thrust, until: w.time + PLAN_EVERY / 60 } : null;
    if (p.risk > 30 && s.rollCooldown === 0) dodge = true;
  }
  if (memo.plan) { want = memo.plan.heading; thrust = memo.plan.thrust; }
  const off = angleDelta(s.heading, want);
  f.turn = clamp(-off * 4, -1, 1);
  f.thrust = Math.abs(off) < 1.3 ? thrust : Math.min(thrust, 0.3);
  if (dodge && s.rollCooldown === 0) f.roll = true;

  // fire: whatever is in front, within reach
  const reach = st.laserSpeed * st.laserLife;
  const inFront = (x: number, z: number, r: number, range: number) => {
    const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz);
    return d < range && Math.abs(angleDelta(s.heading, Math.atan2(-dz, dx))) < Math.max(0.06, st.laserLances > 1 ? 0.3 : 0.05) + r / Math.max(1, d);
  };
  f.fire = targets.ships.some((a) => inFront(a.x, a.z, a.r, reach)) || (!!targets.boss && inFront(targets.boss.x, targets.boss.z, targets.boss.r, reach))
    || w.field.rocks.some((r) => inFront(r.x, r.z, r.r, bk ? 9 : reach * 0.7));
  // the lasers mine: fire on the rock it is working once in reach
  if (bk && mining && inFront(mining.x, mining.z, mining.r, reach * 0.8)) f.fire = true;
  if (w.arms.bank < st.bankShot * 2 && !f.fire) f.fire = false;
  // torpedoes at hulls, or rock when the rack is full
  if (st.torpedoes && w.lock !== null) {
    const ship = targets.ships.some((a) => a.id === w.lock) || targets.boss?.id === w.lock;
    if (ship || w.arms.rack === st.torpRack) f.torpedo = true;
  }
  return f;
}

/** Fly one run to the end (or maxTime) and report it. */
export function fly(seed: number, strategy: Strategy, o: PilotOptions = {}): PilotResult {
  const w = new World(seed, { unlocked: o.unlocked ?? [], survival: o.survival, mode: o.breakout ? 'breakout' : 'arcade' });
  return flyWorld(w, seed, strategy, o);
}

/** Fly a world already set up (a sortie of a journey) to the end, or maxTime. */
export function flyWorld(w: World, seed: number, strategy: Strategy, o: PilotOptions = {}): PilotResult {
  const maxTime = o.maxTime ?? 900;
  let r = seed * 9301 + 49297;
  const rngPick = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const close = strategy.kind === 'focus' && strategy.branch === 'close';
  const lostByMinute: number[] = [], gainedByMinute: number[] = [];
  const refitAt: Record<number, number> = {};
  const bossFights: PilotResult['bossFights'] = [];
  const answers: Answer[] = [];
  let fightStart = -1, fightFaction = '';
  let combat = 0, crowd = 0, peak = 0;
  let calmRun = 0, longestCalm = 0, contacts = 0, wasNear = false;
  let lastLost = 0, lastGained = 0;
  const lag = o.lag ?? 1;
  const queue: InputFrame[] = [];
  const memo: Memo = { seen: new Map(), plan: null };
  const seen = memo.seen;
  let docks = 0;
  let nextShop = 0, fitted = 0;
  while (w.phase !== 'over' && w.runTime < maxTime) {
    // the arcade's bay opens by itself; the Story mode's pilot looks into it every couple of seconds, when it will open
    if (w.phase === 'bay') { shop(w, strategy, rngPick, o.modules); continue; }
    if (w.phase === 'play' && w.bk && w.runTime >= nextShop) { nextShop = w.runTime + 2; shop(w, strategy, rngPick, o.modules); }
    if (w.phase === 'hail') { w.answerHail(!o.evade || !w.command.pending?.canEvade); continue; }
    if (w.phase === 'comms' || (w.phase === 'play' && w.call)) {
      const before = { krail: w.cyrite, chits: w.chits, heat: w.bk?.heat ?? 0, aliens: w.aliens.length, card: (w.comms ?? w.call)!.def.id };
      w.answer(o.answer?.(w) ?? pickAnswer(w, o.policy ?? 'bluff'));
      const last = w.run.cards[w.run.cards.length - 1]!;
      answers.push({
        card: before.card, choice: last.choice, won: last.won, krail: w.cyrite - before.krail, chits: w.chits - before.chits,
        heat: (w.bk?.heat ?? 0) - before.heat, fight: w.aliens.length > before.aliens || w.bk?.blockade === 'called',
      });
      continue;
    }
    if (w.phase === 'dock') {
      if (w.bk && w.bk.docks > docks) { docks = w.bk.docks; o.onDock?.(w); }
      // the port: sell, top the tank up toward the jump, stock the galley for two jumps, patch, then the bay
      w.sellOre();
      while (w.cyrite < w.jumpCost && w.buy('cyrite'));
      while (w.food < 12 && w.buy('food'));
      while (w.plates < w.stats.maxPlates && w.buy('plate'));
      shop(w, strategy, rngPick, o.modules);
      w.undock();
      continue;
    }
    // react a beat late, as a person does
    queue.push(control(w, close, memo));
    if (seen.size > 2000) for (const id of [...seen.keys()]) if (!w.shots.some((sh) => sh.id === id)) seen.delete(id);
    const input = queue.length > lag ? queue.shift()! : blank();
    w.step(STEP, input);
    const near = w.aliens.filter((a) => !cloaked(a) && !a.ward && ALIEN_TYPES[a.kind].fire !== 'none' && Math.hypot(a.x - w.ship.x, a.z - w.ship.z) < FIRE_RANGE * a.rgK).length;
    if (w.command.state === 'fight' || near > 0) combat += STEP;
    if (near >= 3) crowd += STEP;
    const hot = w.command.state === 'fight' || near > 0;
    if (hot) { calmRun = 0; if (!wasNear) contacts++; } else { calmRun += STEP; longestCalm = Math.max(longestCalm, calmRun); }
    wasNear = hot;
    peak = Math.max(peak, near);
    const evs = w.drain();
    o.watch?.(w, evs);
    for (const ev of evs) {
      if (ev.type === 'fitted' && [1, 5, 10, 15, 20].includes(++fitted)) refitAt[fitted] = Math.round(w.runTime);
      if (ev.type === 'bossArrive') { fightStart = w.runTime; fightFaction = ev.faction; }
      if (ev.type === 'bossDestroyed') { bossFights.push({ faction: ev.faction, outcome: 'killed', seconds: Math.round(w.runTime - fightStart), hpLeft: 0, refit: w.refit }); fightStart = -1; }
      if (ev.type === 'bossLeft') {
        const b = w.command.boss;
        bossFights.push({ faction: fightFaction, outcome: 'escaped', seconds: Math.round(w.runTime - fightStart), hpLeft: b ? b.hp / b.maxHp : 1, refit: w.refit });
        fightStart = -1;
      }
    }
    const m = Math.floor(w.runTime / 60);
    while (lostByMinute.length <= m) { lostByMinute.push(0); gainedByMinute.push(0); }
    lostByMinute[m]! += w.run.platesLost - lastLost;
    gainedByMinute[m]! += w.run.platesGained - lastGained;
    lastLost = w.run.platesLost;
    lastGained = w.run.platesGained;
  }
  if (fightStart >= 0) {
    const b = w.command.boss;
    bossFights.push({ faction: fightFaction, outcome: 'died', seconds: Math.round(w.runTime - fightStart), hpLeft: b ? b.hp / b.maxHp : 1, refit: w.refit });
  }
  if (w.phase !== 'over') {
    // ran out the clock: record it as the world would
    w.run.time = Math.round(w.runTime);
    w.run.score = w.score;
    w.run.build = { ...w.levels };
    w.run.cause = 'survived';
  }
  return { run: w.run, strategy: stratName(strategy), identity: identity(w.levels).title, lostByMinute, gainedByMinute, refitAt, bossFights, combat, crowd, peak, longestCalm, contacts, budget: budgets(w.levels), answers };
}
