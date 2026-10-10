import { t } from '../i18n';
import type { ActorSpec, Goal, SituationDef } from '../content/situations';
import type { Outcome } from './comms';
import { leave, type Alien } from './enemies';
import { topSpeed } from './ship';
import type { World } from './world';

// ── missions ──────────────────────────────────────────────────────────────
// The goals a situation can ask beyond reaching, following and watching
// (content/situations.ts `Goal.kind`). A Stage (sim/stage.ts) owns the call,
// the site and the ending; once the goal is taken it hands the sector to one
// Run, which spawns what the job needs, watches it each step and says how it
// ended and how much of the pay it earned. Plain data, so a test flies them.
//
//   destroy  clear every foe. A ship that is marked `scatter` breaks the rest
//            when it goes down, and the job is done for less (`goal.spoil`).
//   strike   a target that must be crippled, not destroyed: take its hull down
//            to a third and it stops. Close in and hold to take it. Destroyed
//            outright, the cargo is gone and the pay is `goal.spoil`.
//   defend   a rig that must live until the hold is up. Foes near it chew at
//            it, so drawing them off is as good as killing them. Pay by what
//            is left of the rig.
//   race     beacons in order against a rival that flies the same course at a
//            share of your top speed. Rock lies in the gaps.
//   survey   a hazard with readings at rings: each is held for a moment. It
//            pulls, it burns, and the pay is what the readings are worth.
//   sneak    reach the drop past patrols that sweep the site. Time spent
//            inside a sweep builds exposure (a spoofer, ghost echo or baffles
//            slow it); full exposure and the patrols turn.

/** A beacon, a drop or a ring: where the HUD points and where the world draws a mark. */
export interface Pt { x: number; z: number; on: boolean }
export interface Focus { x: number; z: number; r: number }

export type Verdict = 'won' | 'lost' | null;

/** The target is taken down to this share of its hull and stops. */
const DISABLED_AT = 0.3;
/** Close in this near, slow, for this long, to take a crippled target. */
const TOW_R = 28;
const TOW_HOLD = 4;
/** Foes this near a rig chew at it, this much of its hull a second each. */
const CHEW_R = 95;
const CHEW = 0.9;
/** A beacon counts inside this; the countdown before a race, and the gaps' rock. */
const BEACON_R = 26;
const COUNTDOWN = 3;
/** The pull of a hazard: out to this far, hardest at the core. */
const PULL_R = 330;
const PULL = 14;
/** A reading is held this long inside its ring. */
const READ_HOLD = 2.2;
/** Beyond this far from the hazard, after a reading, the survey is over. */
const LEAVE_R = 470;
/** A patrol's sweep reaches this far; exposure builds this fast (per second) and falls this fast outside. */
const SCAN_R = 62;
const EXPOSE = 0.3;
const COOL = 0.18;
const DROP_R = 28;
const DROP_HOLD = 3;
/** Seconds in the core between burns. */
const BURN_EVERY = 1.6;

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** An outcome at a share of its pay: the numbers that are pay scale, the rest stands. */
export function scaleOut(out: Outcome, k: number): Outcome {
  if (k >= 1) return out;
  const o: Outcome = { ...out };
  for (const f of ['cyrite', 'chits', 'supplies'] as const) if (typeof o[f] === 'number') (o as unknown as Record<string, number>)[f] = Math.round((o[f] as number) * k);
  if (o.krail) o.krail = Math.round(o.krail * k);
  if (o.score) o.score = Math.round(o.score * k);
  return o;
}

export interface Site { x: number; z: number; ux: number; uz: number }

export class Run {
  readonly def: SituationDef;
  readonly goal: Goal;
  private readonly site: Site;
  /** Seconds since it began. */
  clock = 0;
  /** The line under the goal on the HUD, and how far along (0 to 1). */
  status = '';
  progress = 0;
  /** The share of the pay it has earned, read when the goal is finished. */
  scale = 1;
  /** What the HUD and the world mark. */
  points: Pt[] = [];
  focus: Focus;
  /** The ship the goal is about, and the hostiles of the job. */
  target: Alien | null = null;
  foes: Alien[] = [];
  private rival: Alien | null = null;
  private total = 0;
  private state: 'on' | 'disabled' | 'scattered' = 'on';
  private hold = 0;
  private waves = 0;
  private next = 0;
  private rivalNext = 0;
  private reads = 0;
  private holdRing = 0;
  private maxReads = 0;
  private exposure = 0;
  private stealth = 1;
  private burn = 0;
  private startHp = 1;
  private readonly name: string;
  private readonly adopted: Alien[];

  constructor(def: SituationDef, site: Site, w: World, adopted: Alien[] = []) {
    this.adopted = adopted;
    this.def = def;
    this.goal = def.goal;
    this.site = site;
    this.focus = { x: site.x, z: site.z, r: 30 };
    this.name = def.name;
    this.start(w);
  }

  owns(al: Alien): boolean { return al === this.target || al === this.rival || this.foes.includes(al); }

  // ── spawning ───────────────────────────────────────────────────────────
  private spot(w: World, a: ActorSpec, i: number, n: number): { x: number; z: number } {
    const { x, z, ux, uz } = this.site;
    if (a.from === 'ahead') {
      const d = 330 + w.rng.range(-30, 60), k = (i - (n - 1) / 2) * 34;
      return { x: w.ship.x + ux * d - uz * k, z: w.ship.z + uz * d + ux * k };
    }
    const r = (a.ring ?? 70) * (0.6 + w.rng.range(0, 0.5)), th = (i / Math.max(1, n)) * Math.PI * 2 + w.rng.range(0, 0.7);
    return { x: x + Math.cos(th) * r, z: z + Math.sin(th) * r };
  }

  private foe(w: World, a: ActorSpec): void {
    for (let i = 0; i < a.n; i++) {
      const p = this.spot(w, a, i, a.n);
      const al = w.spawnHostile(a.variant, { x: p.x, y: w.rng.range(-1.5, 1.5), z: p.z }, null, true);
      al.spK *= a.pace ?? 1;
      if (a.hp) { al.hp *= a.hp; al.maxHp *= a.hp; }
      if (a.scatter) (al as Alien & { scatter?: boolean }).scatter = true;
      al.job = true;
      this.foes.push(al);
    }
    this.total = this.foes.length;
  }

  private ship(w: World, a: ActorSpec, at: { x: number; z: number }, act: 'hold' | 'pass'): Alien {
    const al = w.spawnHostile(a.variant, { x: at.x, y: 0, z: at.z }, null, true);
    al.canCloak = false; al.cloak = 0;
    al.mode = 'drift'; al.escort = false;
    al.hp *= a.hp ?? 1; al.maxHp *= a.hp ?? 1;
    al.spK *= a.pace ?? 1;
    al.ax = at.x; al.az = at.z;
    al.job = true;
    al.ward = { act, temper: 'meek', hx: at.x, hz: at.z, ring: 20, warned: 0, tag: a.tag };
    return al;
  }

  private start(w: World): void {
    const g = this.goal, d = this.def, { x, z, ux, uz } = this.site;
    const specs = d.actors ?? [];
    switch (g.kind) {
      case 'destroy':
        for (const a of specs) if (a.foe) this.foe(w, a);
        break;
      case 'strike': {
        const ta = specs.find((a) => a.target)!;
        // out to the side of the course, heading for the far edge
        const side = hash(d.id) & 1 ? 1 : -1;
        this.target = this.adopted[0] ?? this.ship(w, ta, { x, z }, 'pass');
        this.target.ward!.act = 'pass';
        this.target.ward!.hx = x - uz * side * 520 + ux * 180; this.target.ward!.hz = z + ux * side * 520 + uz * 180;
        this.startHp = this.target.maxHp;
        for (const a of specs) if (a.foe) this.foe(w, a);
        break;
      }
      case 'defend': {
        const ta = specs.find((a) => a.target)!;
        this.target = this.adopted[0] ?? this.ship(w, ta, { x, z }, 'hold');
        this.startHp = this.target.maxHp;
        this.next = 0;
        break;
      }
      case 'race': {
        const n = g.beacons ?? 6, s = w.ship;
        const side = hash(d.id) & 1 ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const along = 120 * (i + 1), off = (i % 2 ? -1 : 1) * side * (70 + (i % 3) * 30);
          this.points.push({ x: s.x + ux * along - uz * off, z: s.z + uz * along + ux * off, on: i === 0 });
        }
        // rock in the gaps: cut a corner and it shows
        for (let i = 0; i < n - 1; i++) {
          const a = this.points[i]!, b = this.points[i + 1]!;
          for (const k of [0.4, 0.62]) {
            const r = w.field.spawn(k > 0.5 ? 1 : 0, a.x + (b.x - a.x) * k + w.rng.range(-8, 8), a.z + (b.z - a.z) * k + w.rng.range(-8, 8), 0, 0, 'basalt', 1, 0);
            r.age = 10;
          }
        }
        const ra = specs.find((a) => a.target)!;
        const start = { x: s.x - uz * 14 * side, z: s.z + ux * 14 * side };
        this.rival = this.adopted[0] ?? this.ship(w, ra, start, 'pass');
        this.rival.x = start.x; this.rival.z = start.z; this.rival.vx = this.rival.vz = 0; this.rival.ward!.act = 'pass';
        this.rivalNext = 0;
        this.hold = 0;
        break;
      }
      case 'survey':
        this.maxReads = (g.rings ?? [250, 170, 100]).length;
        this.points = (g.rings ?? [250, 170, 100]).map((r) => ({ x, z, on: false, r } as Pt & { r: number }));
        break;
      case 'sneak': {
        this.points = [{ x, z, on: true }];
        this.focus = { x, z, r: DROP_R };
        const L = w.levels;
        // what the ship carries to look like something else
        this.stealth = 1 - 0.28 * (L.md_spoofer ?? 0) - 0.2 * (L.md_ghost ?? 0) - 0.12 * (L.md_baffles ?? 0);
        this.stealth = Math.max(0.25, this.stealth);
        break;
      }
    }
    this.focusNow(w);
  }

  // ── events ─────────────────────────────────────────────────────────────
  /** A mission hull was hit by the player. A destroyed rig, rival or target is read in the step; here only a spared target stops fleeing. */
  shot(w: World, al: Alien): void {
    void w; void al;
  }

  // ── the step ───────────────────────────────────────────────────────────
  step(w: World, dt: number): Verdict {
    this.clock += dt;
    const g = this.goal;
    let v: Verdict = null;
    switch (g.kind) {
      case 'destroy': v = this.destroy(w); break;
      case 'strike': v = this.strike(w, dt); break;
      case 'defend': v = this.defend(w, dt); break;
      case 'race': v = this.race(w, dt); break;
      case 'survey': v = this.survey(w, dt); break;
      case 'sneak': v = this.sneak(w, dt); break;
    }
    this.focusNow(w);
    return v;
  }

  private alive(w: World, list: Alien[]): Alien[] { return list.filter((a) => w.aliens.includes(a)); }

  private destroy(w: World): Verdict {
    this.foes = this.alive(w, this.foes);
    // the one that holds the rest together
    const broke = this.total > 0 && this.state === 'on' && this.def.actors?.some((a) => a.scatter) && !this.foes.some((a) => (a as Alien & { scatter?: boolean }).scatter);
    if (broke && this.foes.length) {
      this.state = 'scattered';
      for (const a of this.foes) leave(a);
      this.scale = this.goal.spoil ?? 0.7;
      return 'won';
    }
    this.progress = this.total ? 1 - this.foes.length / this.total : 0;
    this.status = this.foes.length ? t('{n} left', { n: this.foes.length }) : '';
    return this.foes.length ? null : 'won';
  }

  private strike(w: World, dt: number): Verdict {
    this.foes = this.alive(w, this.foes);
    const tg = this.target!;
    if (!w.aliens.includes(tg)) {
      // gone: destroyed outright (the cargo with it), or lost to the edge of the sky
      if (tg.hp <= 0) { this.scale = this.goal.spoil ?? 0.4; return 'won'; }
      return 'lost';
    }
    const W = tg.ward!;
    if (this.state === 'on') {
      if (tg.hp <= tg.maxHp * DISABLED_AT) {
        this.state = 'disabled';
        W.act = 'hold'; W.hx = tg.x; W.hz = tg.z;
        tg.vx = tg.vz = 0;
        tg.ax = tg.x; tg.az = tg.z;
        this.hold = 0;
        w.events.push({ type: 'ping', id: `mis_${this.def.id}_down`, from: t(W.tag), caller: 'unknown', text: t('“Engines out. We are dead in space.”'), moment: 'calm', system: w.sortie.name });
      } else {
        // a fleeing target keeps away from the ship, inside the sector; a runner holds its course
        if (this.def.goal.pace) {
          const s = w.ship, dx = tg.x - s.x, dz = tg.z - s.z, d = Math.hypot(dx, dz) || 1;
          let gx = tg.x + (dx / d) * 160, gz = tg.z + (dz / d) * 160;
          const cx = this.site.x, cz = this.site.z, off = Math.hypot(gx - cx, gz - cz);
          if (off > 420) { gx = cx + ((gx - cx) / off) * 420 - (dz / d) * 120; gz = cz + ((gz - cz) / off) * 420 + (dx / d) * 120; }
          tg.ax = gx; tg.az = gz;
        } else { tg.ax = W.hx; tg.az = W.hz; }
      }
    }
    if (this.state === 'disabled') {
      const s = w.ship, d = Math.hypot(tg.x - s.x, tg.z - s.z);
      if (d < TOW_R && w.stageSlow()) this.hold += dt; else this.hold = Math.max(0, this.hold - dt * 0.5);
      this.progress = Math.min(1, this.hold / TOW_HOLD);
      this.status = d < TOW_R ? t('Taking her in tow') : t('Disabled · close in and hold');
      if (this.hold >= TOW_HOLD) { this.scale = 1; return 'won'; }
      return null;
    }
    this.progress = 1 - Math.max(0, (tg.hp - tg.maxHp * DISABLED_AT) / (tg.maxHp * (1 - DISABLED_AT)));
    this.status = t('Hull {n}% · cripple, do not destroy', { n: Math.round((tg.hp / tg.maxHp) * 100) });
    return null;
  }

  private defend(w: World, dt: number): Verdict {
    const g = this.goal, rig = this.target!;
    if (!w.aliens.includes(rig)) return 'lost';
    // waves
    const waves = this.def.waves ?? [];
    while (this.waves < waves.length && this.clock >= waves[this.waves]!.at) {
      const wv = waves[this.waves]!;
      this.foe(w, { variant: wv.variant, n: wv.n, act: 'pass', temper: 'hostile', tag: 'Raider', foe: true, from: 'ahead' });
      this.waves++;
      w.events.push({ type: 'ping', id: `mis_${this.def.id}_w${this.waves}`, from: t('Scope'), caller: 'unknown', text: t('“Hostiles inbound on the rig.”'), moment: 'calm', system: w.sortie.name });
    }
    this.foes = this.alive(w, this.foes);
    let near = 0;
    for (const f of this.foes) if (Math.hypot(f.x - rig.x, f.z - rig.z) < CHEW_R) near++;
    if (near) {
      rig.hp -= CHEW * near * dt * (rig.maxHp / this.startHp) * (this.startHp / 40);
      if (rig.hp <= 0) { w.wreck(rig); return 'lost'; }
    }
    this.progress = Math.min(1, this.clock / g.hold);
    this.status = t('Rig {n}%', { n: Math.max(0, Math.round((rig.hp / this.startHp) * 100)) });
    if (this.clock >= g.hold) {
      this.scale = 0.45 + 0.55 * Math.max(0, rig.hp / this.startHp);
      for (const f of this.foes) leave(f);
      return 'won';
    }
    return null;
  }

  private race(w: World, dt: number): Verdict {
    const s = w.ship, pts = this.points, rv = this.rival!;
    // a beat to line up
    if (this.clock < COUNTDOWN) {
      this.status = t('Go in {n}', { n: Math.ceil(COUNTDOWN - this.clock) });
      rv.ax = rv.x; rv.az = rv.z;
      return null;
    }
    const mine = pts.findIndex((p) => p.on);
    if (mine < 0) return 'won';
    if (Math.hypot(pts[mine]!.x - s.x, pts[mine]!.z - s.z) < BEACON_R) {
      pts[mine]!.on = false;
      if (mine + 1 < pts.length) pts[mine + 1]!.on = true;
      else return this.rivalNext >= pts.length ? 'lost' : 'won';
    }
    // the rival flies the same course, a share of the top speed
    if (this.rivalNext < pts.length) {
      const p = pts[this.rivalNext]!;
      rv.ax = p.x; rv.az = p.z;
      rv.spK = ((topSpeed(w.hull) * (this.goal.pace ?? 0.8)) / 21.6);
      if (Math.hypot(p.x - rv.x, p.z - rv.z) < 14) this.rivalNext++;
    } else { rv.ax = rv.x; rv.az = rv.z; return 'lost'; }
    const on = pts.filter((p) => !p.on).length;
    this.progress = Math.min(1, on / pts.length);
    this.status = t('Beacon {n}/{m} · rival {r}', { n: Math.min(pts.length, on + 1), m: pts.length, r: this.rivalNext });
    void dt;
    return null;
  }

  private survey(w: World, dt: number): Verdict {
    const g = this.goal, s = w.ship, rings = g.rings ?? [250, 170, 100], shares = g.shares ?? [0.3, 0.6, 1];
    const dx = this.site.x - s.x, dz = this.site.z - s.z, d = Math.hypot(dx, dz) || 1;
    // the pull: a thin tug at the edge, a grip at the core, and the nav goes
    if (d < PULL_R) {
      const k = (1 - d / PULL_R) ** 2 * PULL * dt;
      s.vx += (dx / d) * k; s.vz += (dz / d) * k;
      w.navNoise = Math.max(w.navNoise, Math.min(1, (1 - d / PULL_R) * 1.4));
    }
    // the core burns
    const core = rings[rings.length - 1]! * 0.6;
    if (d < core) { if ((this.burn += dt) >= BURN_EVERY) { this.burn = 0; w.scorch(); } } else this.burn = Math.max(0, this.burn - dt);
    // readings: each ring held for a moment, inside to out
    if (this.reads < this.maxReads) {
      const ring = rings[this.reads]!;
      if (d < ring) { this.hold += dt; if (this.hold >= READ_HOLD) { this.reads++; this.hold = 0; w.events.push({ type: 'ping', id: `mis_${this.def.id}_r${this.reads}`, from: t('Survey'), caller: 'unknown', text: t('“Reading {n} logged.”', { n: this.reads }), moment: 'calm', system: w.sortie.name }); } }
      else this.hold = Math.max(0, this.hold - dt);
    }
    this.progress = this.maxReads ? (this.reads + Math.min(1, this.hold / READ_HOLD)) / this.maxReads : 0;
    this.status = this.reads >= this.maxReads ? t('All readings taken · turn back') : t('Reading {n}/{m} · {d} m', { n: Math.min(this.maxReads, this.reads + 1), m: this.maxReads, d: Math.round(d) });
    // done: every reading in and clear of the pull, or turned back after some
    const clear = d > LEAVE_R || (this.reads >= this.maxReads && d > PULL_R);
    if (clear && this.reads > 0) {
      this.scale = shares[Math.min(this.reads, shares.length) - 1] ?? 1;
      return 'won';
    }
    return null;
  }

  private sneak(w: World, dt: number): Verdict {
    const s = w.ship, drop = this.points[0]!;
    // the sweep: patrols orbit the site, the ship inside any one's reach is read
    let seen = false;
    for (const a of w.aliens) {
      if (!a.ward || a.ward.act !== 'patrol') continue;
      if (Math.hypot(a.x - s.x, a.z - s.z) < SCAN_R) seen = true;
    }
    this.exposure = Math.min(1, Math.max(0, this.exposure + (seen ? EXPOSE * this.stealth : -COOL) * dt));
    const near = Math.hypot(drop.x - s.x, drop.z - s.z);
    if (near < DROP_R && w.stageSlow()) this.hold += dt; else this.hold = Math.max(0, this.hold - dt * 0.5);
    const need = this.goal.hold || DROP_HOLD;
    this.progress = Math.min(1, this.hold / need);
    this.status = this.exposure > 0.02 ? t('Exposure {n}%', { n: Math.round(this.exposure * 100) }) : near < DROP_R * 4 ? t('Hold still at the drop') : t('Unseen');
    if (this.exposure >= 1) return 'lost';
    if (this.hold >= need) return 'won';
    return null;
  }

  /** How full the exposure bar is, for the HUD's tint. */
  get exposed(): number { return this.exposure; }

  // ── the marker ─────────────────────────────────────────────────────────
  private focusNow(w: World): void {
    const g = this.goal;
    void w;
    switch (g.kind) {
      case 'strike': case 'defend': { const t0 = this.target; if (t0) this.focus = { x: t0.x, z: t0.z, r: this.state === 'disabled' ? TOW_R : 40 }; break; }
      case 'race': { const p = this.points.find((q) => q.on); if (p) this.focus = { x: p.x, z: p.z, r: BEACON_R }; break; }
      case 'survey': this.focus = { x: this.site.x, z: this.site.z, r: (g.rings ?? [250])[0]! }; break;
      case 'destroy': { const f = this.foes[0]; if (f) this.focus = { x: f.x, z: f.z, r: 60 }; break; }
      default: break;
    }
  }
}
