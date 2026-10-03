import { angleDelta, clamp } from '../src/core/math';
import { STEP } from '../src/core/loop';
import type { InputFrame } from '../src/input/types';
import { UPGRADE, type Branch } from '../src/content/upgrades';
import { beamLive, cloaked } from '../src/sim/enemies';
import { identity } from '../src/sim/build';
import { topSpeed } from '../src/sim/ship';
import { OC_MAX, SHIP_R } from '../src/sim/tuning';
import { World } from '../src/sim/world';
import type { RunStats } from '../src/sim/run';

// ── the scripted pilot ────────────────────────────────────────────────────
// A competent, unspectacular player, for balancing: it flies a potential
// field (pulled toward dilithium, pickups, objectives and a target at its
// weapon's range; pushed away from rock, fire, beams, webs, circles and
// rammers), shoots what is in front of it, rolls out of the way of fire it
// sees coming, releases the overcharge into a crowd, and builds the ship
// to a strategy. It plays through the same API the app does (step,
// choose, answerHail), so a balance number here is a number in the game.

export type Strategy =
  | { kind: 'random' }
  | { kind: 'focus'; branch: Branch; second?: Branch };

export interface PilotOptions {
  maxTime?: number;
  /** Evade every hail that can be evaded. */
  evade?: boolean;
  unlocked?: string[];
  modifiers?: string[];
  /** Input lag in steps (reaction to new fire is modelled separately, REACT). */
  lag?: number;
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
}

const blank = (): InputFrame => ({ turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, overcharge: false, device: 'keyboard' });

export function stratName(s: Strategy): string {
  return s.kind === 'random' ? 'random' : `${s.branch}${s.second ? `+${s.second}` : ''}`;
}

/** Choose a card: the strategy's branch first, then its second, then defence, then anything. */
function pick(w: World, s: Strategy, rngPick: () => number): number {
  const cards = w.offer!.cards;
  if (s.kind === 'random') return Math.floor(rngPick() * cards.length);
  const score = (i: number) => {
    const c = cards[i]!, u = UPGRADE[c.id]!;
    let v = 0;
    if (u.branch === s.branch || u.tags.includes(s.branch)) v += 10;
    if (s.second && (u.branch === s.second || u.tags.includes(s.second))) v += 6;
    if (u.branch === 'defence') v += 3;
    if (c.kind === 'system' && u.branch !== s.branch && u.branch !== s.second) v -= 2;
    if (c.kind === 'spec') v += 2;
    if (c.kind === 'synergy') v += 4;
    return v + rngPick();
  };
  let best = 0;
  for (let i = 1; i < cards.length; i++) if (score(i) > score(best)) best = i;
  return best;
}

/** Reaction time to new fire: a shot is invisible to the pilot until it has existed this long. */
const REACT = 0.2;

/** One step of flying: the potential field, the trigger and the roll. `seen` is when each shot was first seen. */
function control(w: World, close: boolean, seen: Map<number, number>): InputFrame {
  const f = blank();
  const s = w.ship, st = w.stats;
  let ax = 0, az = 0;
  /** The pull of everything, and separately the push of what hurts (for deciding when to dodge). */
  let dx2 = 0, dz2 = 0;
  const push = (dx: number, dz: number, k: number) => { ax += dx * k; az += dz * k; };
  const flee = (dx: number, dz: number, k: number) => { ax += dx * k; az += dz * k; dx2 += dx * k; dz2 += dz * k; };

  // pulled toward dilithium and pickups
  for (const p of w.pickups) {
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz) || 1;
    if (d > 45) continue;
    const want = p.kind === 'crystal' ? 0.6 : p.kind === 'repair' ? (w.plates < st.maxPlates ? 4 : 0.3) : 2.5;
    push(dx / d, dz / d, want * (1 - d / 50));
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
    const d = Math.hypot(a.x - s.x, a.z - s.z);
    if (d < td && d < 55 && Math.abs(a.y ?? 0) < 12) { td = d; tgt = a; }
  }
  // no hull in reach: mine the field, nearest first, the rich and the rare before the rest
  if (!tgt) {
    let best = Infinity;
    for (const r of w.field.rocks) {
      const d = Math.hypot(r.x - s.x, r.z - s.z);
      const k = d * (r.kind === 'rich' || r.kind === 'rare' ? 0.4 : r.kind === 'volatile' ? 2 : 1);
      if (k < best && d < 50) { best = k; td = d; tgt = r; }
    }
  }
  const aimAt = tgt, aimD = td;
  if (tgt) {
    const dx = tgt.x - s.x, dz = tgt.z - s.z, d = Math.hypot(dx, dz) || 1;
    push(dx / d, dz / d, d > prefer ? 0.8 : -0.8);
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
  for (const a of w.aliens) {
    if (cloaked(a)) continue;
    // where it will be: height too, since divers come down onto the plane
    if (a.y + a.vy * 0.6 < 4 && !(close && st.ramSafe && a.hp < st.ramDamage)) avoid(a.x, a.z, a.vx, a.vz, a.r, 4.5, 0.9);
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

  // steer: away from trouble if there is any; otherwise nose on a target in reach, leading it;
  // otherwise toward whatever pulls (dilithium, pickups, objectives)
  const speed = Math.hypot(s.vx, s.vz) / topSpeed(w.hull);
  const urgent = Math.hypot(dx2, dz2) > 1.2;
  const lanceSpeed = st.phaserSpeed;
  let want = s.heading, thrust = 0;
  if (urgent) {
    want = Math.atan2(-(az), ax);
    thrust = 1;
  } else if (aimAt && aimD < st.phaserSpeed * st.phaserLife * 0.85) {
    const lead = aimD / lanceSpeed;
    want = Math.atan2(-(aimAt.z + aimAt.vz * lead - s.z), aimAt.x + aimAt.vx * lead - s.x);
    // hold standoff: close in if far, coast if near
    thrust = aimD > prefer + 8 && speed < 0.5 ? 1 : speed < 0.12 ? 0.3 : 0;
  } else if (Math.hypot(ax, az) > 0.05) {
    want = Math.atan2(-az, ax);
    thrust = speed < 0.55 ? 1 : 0;
  }
  const off = angleDelta(s.heading, want);
  f.turn = clamp(-off * 4, -1, 1);
  f.thrust = Math.abs(off) < 1.3 ? thrust : Math.min(thrust, 0.3);
  if (dodge && s.rollCooldown === 0) f.roll = true;

  // fire: whatever is in front, within reach
  const reach = st.phaserSpeed * st.phaserLife;
  const inFront = (x: number, z: number, r: number, range: number) => {
    const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz);
    return d < range && Math.abs(angleDelta(s.heading, Math.atan2(-dz, dx))) < Math.max(0.06, st.phaserLances > 1 ? 0.3 : 0.05) + r / Math.max(1, d);
  };
  f.fire = targets.ships.some((a) => inFront(a.x, a.z, a.r, reach)) || (!!targets.boss && inFront(targets.boss.x, targets.boss.z, targets.boss.r, reach))
    || w.field.rocks.some((r) => inFront(r.x, r.z, r.r, reach * 0.7));
  if (w.arms.bank < st.bankShot * 2 && !f.fire) f.fire = false;
  // torpedoes at hulls, or rock when the rack is full
  if (st.torpedoes && w.lock !== null) {
    const ship = targets.ships.some((a) => a.id === w.lock) || targets.boss?.id === w.lock;
    if (ship || w.arms.rack === st.torpRack) f.torpedo = true;
  }
  // the overcharge into a crowd, or out of trouble
  if (w.oc >= OC_MAX) {
    const R = st.ocRadius;
    const near = w.aliens.filter((a) => Math.hypot(a.x - s.x, a.z - s.z) < R).length;
    const fire = w.shots.filter((sh) => Math.hypot(sh.x - s.x, sh.z - s.z) < R).length;
    if (near >= 3 || fire >= 6 || (boss && Math.hypot(boss.x - s.x, boss.z - s.z) < R) || w.plates === 1) f.overcharge = true;
  }
  return f;
}

/** Fly one run to the end (or maxTime) and report it. */
export function fly(seed: number, strategy: Strategy, o: PilotOptions = {}): PilotResult {
  const w = new World(seed, { unlocked: o.unlocked ?? [], modifiers: o.modifiers ?? [] });
  const maxTime = o.maxTime ?? 900;
  let r = seed * 9301 + 49297;
  const rngPick = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const close = strategy.kind === 'focus' && strategy.branch === 'close';
  const lostByMinute: number[] = [], gainedByMinute: number[] = [];
  const refitAt: Record<number, number> = {};
  const bossFights: PilotResult['bossFights'] = [];
  let fightStart = -1, fightFaction = '';
  let lastLost = 0, lastGained = 0;
  const lag = o.lag ?? 1;
  const queue: InputFrame[] = [];
  const seen = new Map<number, number>();
  while (w.phase !== 'over' && w.runTime < maxTime) {
    if (w.phase === 'refit') { w.choose(pick(w, strategy, rngPick)); continue; }
    if (w.phase === 'hail') { w.answerHail(!o.evade || !w.command.pending?.canEvade); continue; }
    // react a beat late, as a person does
    queue.push(control(w, close, seen));
    if (seen.size > 2000) for (const id of [...seen.keys()]) if (!w.shots.some((sh) => sh.id === id)) seen.delete(id);
    const input = queue.length > lag ? queue.shift()! : blank();
    w.step(STEP, input);
    for (const ev of w.drain()) {
      if (ev.type === 'levelUp' && [1, 5, 10, 15, 20].includes(ev.refit)) refitAt[ev.refit] = Math.round(w.runTime);
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
  return { run: w.run, strategy: stratName(strategy), identity: identity(w.levels).title, lostByMinute, gainedByMinute, refitAt, bossFights };
}
