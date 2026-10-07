import { angleDelta, clamp } from '../core/math';
import type { Sector } from '../render/sector';
import type { Boss } from '../sim/bosses';
import { rockYield } from '../sim/breakout';
import { ENCOUNTERS } from '../sim/encounters';
import { alienBonus, alienLabel, cloaked, type Alien } from '../sim/enemies';
import { ROCK_KINDS, type Rock } from '../sim/field';
import { CELL, LOOSE, POWER_LABEL } from '../sim/pickups';
import type { PowerKind } from '../sim/events';
import { BOLT_ELEVATE_CONE, PX } from '../sim/tuning';
import type { World } from '../sim/world';
import { NEON_CSS } from './colors';
import { t as tr } from '../i18n';

// ── targeting, in the world ───────────────────────────────────────────────
// What the targeting computer is looking at, drawn where it is:
//   the gunsight · where the lasers go; it lights, and the target shows a
//                  centre mark, when a lance fired now would hit
//   the target   · the torpedo lock if there is one; otherwise the hull or
//                  the rock nearest the line of fire (hulls count closer).
//                  Brackets that close in on a new target, a scan line, the
//                  range under it, and a readout beside it: what it is, its
//                  integrity, and for rock what breaking it yields
//   marks        · brackets on every other hull in view (amber for elites),
//                  the capital ship by name, the nearest krail-rich or
//                  rare rock, repairs and power-ups to go and get, the
//                  objective. Only the things worth flying to get a word.
//   pointers     · the capital ship and the objective, pinned to the edge
//                  when they are off screen; a small chevron for each hull
//                  out of view, in its faction's colour, brighter the closer
//                  it is, blinking when one is close behind

type Kind = 'hull' | 'boss' | 'rock';

interface Pick { kind: Kind; id: number; x: number; y: number; z: number; r: number; ref: Alien | Boss | Rock; }

const MAX_MARKS = 18;
/** Chevrons for hulls out of view, and how far out they reach. */
const MAX_THREATS = 10;
const THREAT_RANGE = 110;
/** Hull targets win over rock at the same range: rock counts this much further away. */
const ROCK_BIAS = 1.6;
/** A new candidate must beat the current target by this much to take over. */
const STICKY = 1.25;
/** Deposits and pickups are marked inside this range. */
const NEAR = 80;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const metres = (u: number) => Math.round(u / PX);
export const range = (u: number) => (metres(u) >= 1000 ? `${(metres(u) / 1000).toFixed(1)} km` : `${metres(u)} m`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SIZE = ['L', 'M', 'S'] as const;
const ASTEROID: Record<string, string> = { basalt: 'Asteroid', iron: 'Iron asteroid', rich: 'Rich asteroid', volatile: 'Volatile asteroid', rare: 'Rare asteroid' };

/** Set a node's text only when it changed. */
function text(el: HTMLElement, t: string): void {
  if (el.textContent !== t) el.textContent = t;
}

export class Targeting {
  /** The current target's id, for the radar, and what it is, for the mode line. */
  target: number | null = null;
  targetKind: Kind | null = null;

  private readonly marks: HTMLSpanElement[] = [];
  private readonly threats: HTMLElement[] = [];
  private readonly markState: Array<{ cls: string; t: string }> = [];
  private readonly box = $('tgt');
  private readonly ret = $('reticle');
  private readonly card = $('tgt-card');
  private lockedNow = false;
  private cardClock = 1;
  private w = 1;
  private h = 1;
  /** Screen boxes the readout must not slide under: the systems panel and the scope. */
  private avoid: DOMRect[] = [];

  constructor() {
    const host = $('marks');
    for (let i = 0; i < MAX_MARKS; i++) {
      const s = document.createElement('span');
      s.className = 'm';
      s.hidden = true;
      host.append(s);
      this.marks.push(s);
      this.markState.push({ cls: 'm', t: '' });
    }
    const th = $('threats');
    for (let i = 0; i < MAX_THREATS; i++) {
      const d = document.createElement('div');
      d.className = 'thr';
      d.hidden = true;
      d.append(document.createElement('i'));
      th.append(d);
      this.threats.push(d);
    }
  }

  /** Note where the fixed HUD blocks sit, so the target's readout keeps clear of them. */
  layout(blocks: HTMLElement[]): void {
    this.avoid = blocks.map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  }

  update(world: World, sector: Sector, dt: number): void {
    const s = sector.shipNow;
    this.w = innerWidth;
    this.h = innerHeight;
    const live = world.alive && world.phase !== 'over';

    // the gunsight, thirty units ahead on the plane
    const ahead = live ? sector.project(s.x + Math.cos(s.heading) * 30, 0.4, s.z - Math.sin(s.heading) * 30) : null;
    this.ret.style.display = ahead ? '' : 'none';
    if (ahead) this.ret.style.transform = `translate(${ahead.x.toFixed(1)}px, ${ahead.y.toFixed(1)}px)`;

    const t = live ? this.pick(world, s.x, s.z, s.heading) : null;
    this.target = t ? t.id : null;
    this.targetKind = t ? t.kind : null;
    const arc = !!t && this.inArc(world, t, s.x, s.z, s.heading);
    this.ret.classList.toggle('on', arc);
    this.drawTarget(world, sector, t, arc, dt);
    this.drawMarks(world, sector, t, live);
    this.drawPointers(world, sector, live);
    this.drawThreats(world, sector, live);
  }

  // ── choosing the target ─────────────────────────────────────────────────

  private pick(world: World, x: number, z: number, heading: number): Pick | null {
    const boss = world.command.boss;
    const bossPick = (b: Boss): Pick => ({ kind: 'boss', id: b.id, x: b.x, y: b.y, z: b.z, r: b.r, ref: b });
    const hullPick = (a: Alien): Pick => ({ kind: 'hull', id: a.id, x: a.x, y: a.y, z: a.z, r: a.r, ref: a });
    const rockPick = (r: Rock): Pick => ({ kind: 'rock', id: r.id, x: r.x, y: 0, z: r.z, r: r.r, ref: r });
    const bossOk = !!boss && !boss.leaving && boss.cloak < 0.5;

    // the torpedo lock, when the bay is fitted
    this.lockedNow = world.lock !== null && world.stats.torpedoes;
    if (this.lockedNow) {
      if (bossOk && boss!.id === world.lock) return bossPick(boss!);
      const al = world.aliens.find((a) => a.id === world.lock && !cloaked(a));
      if (al) return hullPick(al);
      const rock = world.field.find(world.lock);
      if (rock) return rockPick(rock);
      this.lockedNow = false;
    }

    // otherwise the best of: hulls toward the nose, the rock in the line of fire
    const reach = world.stats.laserSpeed * world.stats.laserLife;
    const scoreOf = (p: Pick): number => {
      const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz);
      const off = Math.abs(angleDelta(heading, Math.atan2(-dz, dx)));
      if (p.kind === 'rock') {
        // only rock the lances would actually meet
        if (d > reach || d < 0.5 || Math.sin(Math.min(off, Math.PI / 2)) * d > p.r + 0.6 || off > Math.PI / 2) return Infinity;
        return d * ROCK_BIAS;
      }
      if (off > 1.1) return Infinity;
      return d * (1 + off * 1.5) * (p.kind === 'boss' ? 0.6 : 1);
    };
    const candidates: Pick[] = [];
    for (const a of world.aliens) if (!cloaked(a)) candidates.push(hullPick(a));
    if (bossOk && !boss!.arriving) candidates.push(bossPick(boss!));
    for (const r of world.field.rocks) if (Math.abs(r.x - x) < reach && Math.abs(r.z - z) < reach) candidates.push(rockPick(r));
    let best: Pick | null = null, bestScore = Infinity, keep: Pick | null = null, keepScore = Infinity;
    for (const p of candidates) {
      const sc = scoreOf(p);
      if (sc < bestScore) { bestScore = sc; best = p; }
      if (p.id === this.target) { keep = p; keepScore = sc; }
    }
    // hold on to the current target unless something is clearly better
    if (keep && keepScore < Infinity && keepScore <= bestScore * STICKY) return keep;
    return best;
  }

  /** Would a lance fired now hit it? The gunnery computer lifts lances onto hulls in a narrow cone. */
  private inArc(world: World, t: Pick, x: number, z: number, heading: number): boolean {
    const dx = t.x - x, dz = t.z - z, d = Math.hypot(dx, dz);
    if (d > world.stats.laserSpeed * world.stats.laserLife || d < 0.5) return false;
    const off = Math.abs(angleDelta(heading, Math.atan2(-dz, dx)));
    if (t.kind === 'rock') return off < Math.PI / 2 && Math.sin(off) * d < t.r + 0.3;
    return off < BOLT_ELEVATE_CONE + t.r / d;
  }

  // ── the target: brackets, range, readout ────────────────────────────────
  // Brackets close round it with its health as a thin bar and its range
  // under them: that is all a rock needs. A hostile hull also gets the
  // upper-centre card (what it is, whose, what it is worth).

  private drawTarget(world: World, sector: Sector, t: Pick | null, arc: boolean, dt: number): void {
    const el = this.box;
    const c = t ? sector.project(t.x, t.y, t.z) : null;
    const top = t && c ? sector.project(t.x, t.y + t.r, t.z) : null;
    const card = this.card;
    // the readout is the HUD's upper-centre card: it follows the target, not the brackets on screen
    card.classList.toggle('on', !!t);
    card.classList.toggle('locked', !!t && this.lockedNow);
    if (!t || !c || !top || c.x < -40 || c.y < -40 || c.x > this.w + 40 || c.y > this.h + 40) {
      el.classList.remove('on');
      el.dataset.id = '';
      if (t) this.drawCard(world, t, dt);
      return;
    }
    // a new target: the brackets close in and a scan line runs down it; a new lock: they snap
    const fresh = el.dataset.id !== String(t.id);
    const wasLocked = el.classList.contains('locked');
    el.classList.add('on');
    el.classList.toggle('locked', this.lockedNow);
    el.classList.toggle('arc', arc);
    if (fresh) {
      el.dataset.id = String(t.id);
      this.retrigger(el, 'acq', 'lockon');
      this.cardClock = 1;
    } else if (this.lockedNow && !wasLocked) this.retrigger(el, 'lockon', 'acq');

    // close round what it is: small things a readable box, big things one that never swallows the view
    const half = clamp(Math.abs(c.y - top.y) * 1.15, 12, Math.min(46, this.h * 0.08));
    el.style.setProperty('--h', `${half.toFixed(0)}px`);
    el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`;
    const s = world.ship;
    const d = Math.hypot(t.x - s.x, t.y, t.z - s.z);
    const alt = t.kind === 'rock' ? '' : t.y > 1 ? ` · ▲ ${metres(t.y)} m` : t.y < -1 ? ` · ▼ ${metres(-t.y)} m` : '';
    text($('tgt-d'), `${range(d)}${alt}`);

    this.drawCard(world, t, dt);
  }

  /** The target's readout: what it is, what it is worth, how much of it is left. */
  private drawCard(world: World, t: Pick, dt: number): void {
    // the readout changes slowly; ten times a second is plenty
    this.cardClock += dt;
    if (this.cardClock < 0.1) return;
    this.cardClock = 0;
    let name = '', sub = '', intK = tr('Hull'), ico = '#i-hostile', hp = 1, cls = '';
    if (t.kind === 'hull') {
      const a = t.ref as Alien;
      name = tr(alienLabel(a));
      sub = `<b>${tr(cap(a.faction))}</b> · +${alienBonus(a)}`;
      hp = a.hp / a.maxHp;
      if (a.elite) cls = 'elite';
    } else if (t.kind === 'boss') {
      const b = t.ref as Boss;
      name = tr(b.name);
      sub = `<b>${tr('{f} capital', { f: tr(cap(b.faction)) })}</b> · ${tr('phase')} ${b.phase + 1}/3`;
      hp = b.hp / b.maxHp;
      ico = '#i-capital';
    } else {
      // mining: what the rock is, what breaking it yields, what it breaks into
      const r = t.ref as Rock, K = ROCK_KINDS[r.kind];
      name = `${tr(ASTEROID[r.kind] ?? 'Asteroid')} ${SIZE[r.size]}-${String(r.id % 1000).padStart(3, '0')}`;
      const extra = r.kind === 'rare' ? ` · ${tr(POWER_LABEL[CELL.rock])}` : r.kind === 'volatile' ? ` · ${tr('unstable')}` : '';
      if (world.bk) {
        // the Breakout: what a clean cut gives, and how the cut is going
        const y = rockYield(r.kind, r.size, true);
        sub = `${tr('Ore')} <b>${y.ore}</b>${y.cyrite ? ` · Cyrite <b>${y.cyrite}</b>` : ''}${extra}`;
        if ((r.cut ?? 0) > 0 || (r.heat ?? 0) > 0) {
          intK = tr((r.heat ?? 0) > 0.8 ? 'Too hot · cut' : 'Cut');
          hp = r.cut ?? 0;
        } else { intK = tr('Integrity'); hp = r.hp / r.maxHp; }
      } else {
        const chance = K.crystal[r.size]!, n = K.crystals[r.size]!;
        const yieldWord = chance >= 1 ? `${tr('Yield')} <b>${n}</b>` : `${tr('Yield')} <b>${n}</b> · ${Math.round(chance * 100)}%`;
        sub = `${yieldWord}${extra}`;
        intK = tr('Integrity');
        hp = r.hp / r.maxHp;
      }
      ico = '#i-rock';
      cls = `rock ${r.kind}`;
    }
    // how far: the brackets carry it on screen, the card everywhere
    const d = Math.hypot(t.x - world.ship.x, t.y, t.z - world.ship.z);
    sub = `<b>${range(d)}</b> · ${sub}`;
    text($('tgt-name'), name);
    const subEl = $('tgt-sub');
    if (subEl.innerHTML !== sub) subEl.innerHTML = sub;
    text($('tgt-int-k'), `${intK}:`);
    const v = clamp(hp, 0, 1);
    $('tgt-int').style.setProperty('--v', v.toFixed(2));
    $('tgt-hp').style.setProperty('--v', v.toFixed(2));
    text($('tgt-int-v'), `${Math.round(v * 100)}%`);
    const use = $('tgt-ico');
    if (use.getAttribute('href') !== ico) use.setAttribute('href', ico);
    if (t.kind === 'boss') cls = 'boss';
    const card = this.card;
    for (const k of ['rock', 'basalt', 'iron', 'rich', 'volatile', 'rare', 'elite', 'boss']) {
      const on = cls.split(' ').includes(k);
      this.box.classList.toggle(k, on);
      card.classList.toggle(k, on);
    }
  }

  private retrigger(el: HTMLElement, on: string, off: string): void {
    el.classList.remove(on, off);
    void el.offsetWidth;
    el.classList.add(on);
  }

  // ── marks ───────────────────────────────────────────────────────────────

  private drawMarks(world: World, sector: Sector, t: Pick | null, live: boolean): void {
    let n = 0;
    const s = world.ship;
    const put = (x: number, y: number, z: number, cls: string, label0: string) => {
      let label = label0;
      if (n >= MAX_MARKS) return;
      const p = sector.project(x, y, z);
      if (!p || p.x < 8 || p.y < 8 || p.x > this.w - 8 || p.y > this.h - 8) return;
      const m = this.marks[n]!, st = this.markState[n]!;
      n++;
      if (label) {
        // the label's rough box: beside a hexagon, under anything else
        const side = cls.includes('dia');
        const lx0 = side ? p.x + 12 : p.x - 70, lx1 = side ? p.x + 170 : p.x + 70, ly0 = side ? p.y - 16 : p.y + 8, ly1 = side ? p.y + 16 : p.y + 34;
        if (this.avoid.some((r) => !(lx1 < r.left || lx0 > r.right || ly1 < r.top || ly0 > r.bottom))) label = '';
      }
      if (st.cls !== cls) { st.cls = cls; m.className = cls; }
      if (st.t !== label) { st.t = label; m.dataset.t = label; }
      m.hidden = false;
      m.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    };
    if (live) {
      // the objective first: it must never be crowded out
      const e = world.encounter;
      if (e && !e.done && (e.id === 'distress' || e.id === 'derelict' || e.id === 'anomaly' || e.id === 'convoy')) {
        put(e.x, 0.5, e.z, 'm dia obj', `${tr(ENCOUNTERS[e.id].name)} · ${range(Math.hypot(e.x - s.x, e.z - s.z))}`);
      }
      // the Breakout's two places, when they are in view
      if (world.bk) {
        for (const wp of world.seenPlaces()) {
          const d = Math.hypot(wp.x - s.x, wp.z - s.z);
          if (d < 400) put(wp.x, 0.5, wp.z, 'm dia obj', `${tr(wp.name)} · ${range(d)}`);
        }
      }
      const boss = world.command.boss;
      if (boss && !boss.leaving && boss.cloak < 0.5 && boss.id !== t?.id) put(boss.x, boss.y, boss.z, 'm cap', tr(boss.name));
      // things to go and get
      for (const p of world.pickups) {
        if (LOOSE.has(p.kind)) continue;
        if (Math.hypot(p.x - s.x, p.z - s.z) > NEAR) continue;
        put(p.x, 0.4, p.z, 'm dia', tr(p.kind === 'repair' ? 'Hull repair' : POWER_LABEL[p.kind as PowerKind]));
      }
      // the nearest krail-rich or rare rock: a deposit worth the detour
      let dep: Rock | null = null, depD = NEAR;
      for (const r of world.field.rocks) {
        if ((r.kind !== 'rich' && r.kind !== 'rare') || r.id === t?.id) continue;
        const d = Math.hypot(r.x - s.x, r.z - s.z);
        if (d < depD) { depD = d; dep = r; }
      }
      if (dep) put(dep.x, dep.r + 0.6, dep.z, dep.kind === 'rich' ? 'm dia dep' : 'm dia', tr(dep.kind === 'rich' ? 'Mineral deposit\nRich · krail' : 'Rare ore\nPower-up inside'));
      // every other hull: brackets only, amber for an elite
      for (const a of world.aliens) {
        if (cloaked(a) || a.id === t?.id) continue;
        put(a.x, a.y, a.z, a.elite ? 'm elite' : 'm', '');
      }
    }
    for (; n < MAX_MARKS; n++) if (!this.marks[n]!.hidden) this.marks[n]!.hidden = true;
  }

  // ── pointers on the edge ────────────────────────────────────────────────

  private drawPointers(world: World, sector: Sector, live: boolean): void {
    const s = sector.shipNow;
    const bk = world.bk;
    if (bk && !bk.port) $('ptr-port').classList.remove('on');
    for (const wp of world.seenPlaces()) {
      const id = wp.kind === 'lane' ? 'ptr-lane' : 'ptr-port';
      this.pointer($(id), $(`${id}-t`), sector, s.x, s.z, s.heading, live ? { x: wp.x, y: 0.5, z: wp.z } : null,
        `${tr(wp.name)} · ${range(Math.hypot(wp.x - s.x, wp.z - s.z))}`);
    }
    if (!bk) { $('ptr-lane').classList.remove('on'); $('ptr-port').classList.remove('on'); }
    const boss = world.command.boss;
    const showBoss = live && !!boss && !boss.leaving && boss.cloak < 0.5;
    this.pointer($('ptr-cap'), $('ptr-cap-t'), sector, s.x, s.z, s.heading, showBoss ? boss! : null,
      showBoss ? `${tr(boss!.name)} · ${range(Math.hypot(boss!.x - s.x, boss!.z - s.z))}` : '');
    const e = world.encounter;
    const showObj = live && !!e && !e.done && e.r > 0;
    this.pointer($('ptr-obj'), $('ptr-obj-t'), sector, s.x, s.z, s.heading, showObj ? { x: e!.x, y: 0.5, z: e!.z } : null,
      showObj ? `${tr(ENCOUNTERS[e!.id].name)} · ${range(Math.hypot(e!.x - s.x, e!.z - s.z))}` : '');
  }

  /** Hulls out of view: the nearest first, each pinned to the edge along its bearing. */
  private drawThreats(world: World, sector: Sector, live: boolean): void {
    const s = sector.shipNow, m = 30;
    let n = 0;
    if (live) {
      const out = world.aliens
        .filter((a) => !cloaked(a))
        .map((a) => ({ a, d: Math.hypot(a.x - s.x, a.z - s.z) }))
        .filter(({ a, d }) => {
          if (d > THREAT_RANGE) return false;
          const p = sector.project(a.x, a.y, a.z);
          return !p || p.x < 0 || p.y < 0 || p.x > this.w || p.y > this.h;
        })
        .sort((x, y) => x.d - y.d);
      const cx = this.w / 2, cy = this.h / 2;
      for (const { a, d } of out) {
        if (n >= MAX_THREATS) break;
        const rel = angleDelta(s.heading, Math.atan2(-(a.z - s.z), a.x - s.x));
        const dx = -Math.sin(rel), dy = -Math.cos(rel);
        const k = Math.min((cx - m) / Math.max(1e-3, Math.abs(dx)), (cy - m - 30) / Math.max(1e-3, Math.abs(dy)));
        const el = this.threats[n++]!;
        el.hidden = false;
        el.className = `thr${a.elite ? ' elite' : ''}${d < 30 && dy > 0.3 ? ' close' : ''}`;
        el.style.setProperty('--pc', NEON_CSS[a.faction]);
        el.style.setProperty('--a', `${((Math.atan2(dy, dx) * 180) / Math.PI + 45).toFixed(0)}deg`);
        el.style.opacity = clamp(1.25 - d / THREAT_RANGE, 0.45, 1).toFixed(2);
        el.style.transform = `translate(${(cx + dx * k).toFixed(1)}px, ${(cy + dy * k).toFixed(1)}px)`;
      }
    }
    for (; n < MAX_THREATS; n++) if (!this.threats[n]!.hidden) this.threats[n]!.hidden = true;
  }

  private pointer(el: HTMLElement, label: HTMLElement, sector: Sector, sx: number, sz: number, heading: number, o: { x: number; y: number; z: number } | null, t: string): void {
    if (!o) { el.classList.remove('on'); return; }
    const p = sector.project(o.x, o.y, o.z);
    const m = 46;
    if (p && p.x > m && p.y > m && p.x < this.w - m && p.y < this.h - m) { el.classList.remove('on'); return; }
    // off screen: point along its bearing from the middle of the screen, pinned inside the edge
    const rel = angleDelta(heading, Math.atan2(-(o.z - sz), o.x - sx));
    const dx = -Math.sin(rel), dy = -Math.cos(rel);
    const cx = this.w / 2, cy = this.h / 2;
    const kx = (cx - m) / Math.max(1e-3, Math.abs(dx)), ky = (cy - m - 40) / Math.max(1e-3, Math.abs(dy));
    const k = Math.min(kx, ky);
    const x = cx + dx * k, y = cy + dy * k;
    el.classList.add('on');
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.style.setProperty('--a', `${((Math.atan2(dy, dx) * 180) / Math.PI + 45).toFixed(0)}deg`);
    text(label, t);
  }
}
