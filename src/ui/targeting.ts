import { angleDelta, clamp } from '../core/math';
import type { Sector } from '../render/sector';
import type { Boss } from '../sim/bosses';
import { ENCOUNTERS } from '../sim/encounters';
import { alienBonus, alienLabel, cloaked, type Alien } from '../sim/enemies';
import { ROCK_KINDS, type Rock } from '../sim/field';
import { POWER_LABEL } from '../sim/pickups';
import { BOLT_ELEVATE_CONE, PX } from '../sim/tuning';
import type { World } from '../sim/world';

// ── targeting, in the world ───────────────────────────────────────────────
// What the targeting computer is looking at, drawn where it is:
//   the gunsight · where the phasers go; it lights, and the target shows a
//                  centre mark, when a lance fired now would hit
//   the target   · the torpedo lock if there is one; otherwise the hull or
//                  the rock nearest the line of fire (hulls count closer).
//                  Brackets that close in on a new target, a scan line, the
//                  range under it, and a readout beside it: what it is, its
//                  integrity, and for rock what breaking it yields
//   marks        · brackets on every other hull in view (amber for elites),
//                  the capital ship by name, the nearest dilithium-rich or
//                  rare rock, repairs and power-ups to go and get, the
//                  objective. Only the things worth flying to get a word.
//   pointers     · the capital ship and the objective, pinned to the edge
//                  when they are off screen

type Kind = 'hull' | 'boss' | 'rock';

interface Pick { kind: Kind; id: number; x: number; y: number; z: number; r: number; ref: Alien | Boss | Rock; }

const MAX_MARKS = 18;
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

/** Set a node's text only when it changed. */
function text(el: HTMLElement, t: string): void {
  if (el.textContent !== t) el.textContent = t;
}

export class Targeting {
  /** The current target's id, for the radar. */
  target: number | null = null;

  private readonly marks: HTMLSpanElement[] = [];
  private readonly markState: Array<{ cls: string; t: string }> = [];
  private readonly box = $('tgt');
  private readonly ret = $('reticle');
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
    const arc = !!t && this.inArc(world, t, s.x, s.z, s.heading);
    this.ret.classList.toggle('on', arc);
    this.drawTarget(world, sector, t, arc, dt);
    this.drawMarks(world, sector, t, live);
    this.drawPointers(world, sector, live);
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
    const reach = world.stats.phaserSpeed * world.stats.phaserLife;
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
    if (d > world.stats.phaserSpeed * world.stats.phaserLife || d < 0.5) return false;
    const off = Math.abs(angleDelta(heading, Math.atan2(-dz, dx)));
    if (t.kind === 'rock') return off < Math.PI / 2 && Math.sin(off) * d < t.r + 0.3;
    return off < BOLT_ELEVATE_CONE + t.r / d;
  }

  // ── the target: brackets, range, readout ────────────────────────────────

  private drawTarget(world: World, sector: Sector, t: Pick | null, arc: boolean, dt: number): void {
    const el = this.box;
    const c = t ? sector.project(t.x, t.y, t.z) : null;
    const top = t && c ? sector.project(t.x, t.y + t.r, t.z) : null;
    if (!t || !c || !top || c.x < -40 || c.y < -40 || c.x > this.w + 40 || c.y > this.h + 40) {
      el.classList.remove('on');
      el.dataset.id = '';
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

    // small things get a readable box, big things a box that does not swallow the screen
    const half = clamp(Math.abs(c.y - top.y) * 1.3, 16, 64);
    el.style.setProperty('--h', `${half.toFixed(0)}px`);
    el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`;
    // the readout goes beside the box, on whichever side has room (clear of the panel and the
    // scope), or under it when neither has
    const CARD = 190, CARD_H = 64, GAP = 12, EDGE = 10;
    let maxX = this.w - EDGE, minX = EDGE;
    const cardTop = c.y - half, cardBottom = cardTop + CARD_H;
    for (const r of this.avoid) {
      if (cardBottom < r.top || cardTop > r.bottom) continue;
      if (r.left > c.x) maxX = Math.min(maxX, r.left - 8);
      else if (r.right < c.x) minX = Math.max(minX, r.right + 8);
    }
    const right = c.x + half + GAP + CARD <= maxX, left = c.x - half - GAP - CARD >= minX;
    // and never off the top or the bottom of the screen
    const dy = clamp(cardTop, 32, this.h - CARD_H - 10) - cardTop;
    el.style.setProperty('--dy', `${dy.toFixed(0)}px`);
    el.classList.toggle('flip', !right && left);
    el.classList.toggle('below', !right && !left);
    if (!right && !left) {
      const dx = clamp(c.x, EDGE + CARD / 2, this.w - EDGE - CARD / 2) - c.x;
      el.style.setProperty('--dx', `${dx.toFixed(0)}px`);
    }

    const s = world.ship;
    const d = Math.hypot(t.x - s.x, t.y, t.z - s.z);
    const alt = t.kind === 'rock' ? '' : t.y > 1 ? ` · ▲ ${metres(t.y)} m` : t.y < -1 ? ` · ▼ ${metres(-t.y)} m` : '';
    text($('tgt-d'), `${range(d)}${alt}`);

    // the readout changes slowly; ten times a second is plenty
    this.cardClock += dt;
    if (this.cardClock < 0.1) return;
    this.cardClock = 0;
    let name = '', sub = '', intK = 'Hull', ico = '#i-hostile', hp = 1, cls = '';
    if (t.kind === 'hull') {
      const a = t.ref as Alien;
      name = alienLabel(a);
      sub = `<b>${cap(a.faction)}</b> · +${alienBonus(a)}`;
      hp = a.hp / a.maxHp;
      if (a.elite) cls = 'elite';
    } else if (t.kind === 'boss') {
      const b = t.ref as Boss;
      name = b.name;
      sub = `<b>${cap(b.faction)} capital</b> · phase ${b.phase + 1}/3`;
      hp = b.hp / b.maxHp;
      ico = '#i-capital';
    } else {
      // mining: what the rock is, what breaking it yields, what it breaks into
      const r = t.ref as Rock, K = ROCK_KINDS[r.kind];
      name = `${r.kind === 'basalt' ? 'Asteroid' : `${cap(r.kind)} asteroid`} ${SIZE[r.size]}-${String(r.id % 1000).padStart(3, '0')}`;
      const chance = K.crystal[r.size]!, n = K.crystals[r.size]!;
      const yieldWord = chance >= 1 ? `Yield <b>${n}</b>` : `Yield <b>${n}</b> · ${Math.round(chance * 100)}%`;
      const extra = r.kind === 'rare' ? ' · power-up'
        : r.kind === 'volatile' ? ' · unstable'
        : K.splitsInto && r.size < 2 ? ` · splits ${r.kind === 'iron' ? 3 : 2}` : '';
      sub = `${yieldWord}${extra}`;
      intK = 'Integrity';
      hp = r.hp / r.maxHp;
      ico = '#i-rock';
      cls = `rock ${r.kind}`;
    }
    text($('tgt-name'), name);
    const subEl = $('tgt-sub');
    if (subEl.innerHTML !== sub) subEl.innerHTML = sub;
    text($('tgt-int-k'), intK);
    const v = clamp(hp, 0, 1);
    $('tgt-int').style.setProperty('--v', String(Math.ceil(v * 10) / 10));
    text($('tgt-int-v'), `${Math.round(v * 100)}%`);
    const use = $('tgt-ico');
    if (use.getAttribute('href') !== ico) use.setAttribute('href', ico);
    if (t.kind === 'boss') cls = 'boss';
    for (const k of ['rock', 'basalt', 'iron', 'rich', 'volatile', 'rare', 'elite', 'boss']) el.classList.toggle(k, cls.split(' ').includes(k));
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
    const put = (x: number, y: number, z: number, cls: string, label: string) => {
      if (n >= MAX_MARKS) return;
      const p = sector.project(x, y, z);
      if (!p || p.x < 8 || p.y < 8 || p.x > this.w - 8 || p.y > this.h - 8) return;
      const m = this.marks[n]!, st = this.markState[n]!;
      n++;
      if (st.cls !== cls) { st.cls = cls; m.className = cls; }
      if (st.t !== label) { st.t = label; m.dataset.t = label; }
      m.hidden = false;
      m.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    };
    if (live) {
      // the objective first: it must never be crowded out
      const e = world.encounter;
      if (e && !e.done && (e.id === 'distress' || e.id === 'derelict' || e.id === 'anomaly' || e.id === 'convoy')) {
        put(e.x, 0.5, e.z, 'm dia obj', `${ENCOUNTERS[e.id].name} · ${range(Math.hypot(e.x - s.x, e.z - s.z))}`);
      }
      const boss = world.command.boss;
      if (boss && !boss.leaving && boss.cloak < 0.5 && boss.id !== t?.id) put(boss.x, boss.y, boss.z, 'm cap', boss.name);
      // things to go and get
      for (const p of world.pickups) {
        if (p.kind === 'crystal') continue;
        if (Math.hypot(p.x - s.x, p.z - s.z) > NEAR) continue;
        put(p.x, 0.4, p.z, 'm dia', p.kind === 'repair' ? 'Hull repair' : POWER_LABEL[p.kind]);
      }
      // the nearest dilithium-rich or rare rock: a deposit worth the detour
      let dep: Rock | null = null, depD = NEAR;
      for (const r of world.field.rocks) {
        if ((r.kind !== 'rich' && r.kind !== 'rare') || r.id === t?.id) continue;
        const d = Math.hypot(r.x - s.x, r.z - s.z);
        if (d < depD) { depD = d; dep = r; }
      }
      if (dep) put(dep.x, dep.r + 0.6, dep.z, dep.kind === 'rich' ? 'm dia dep' : 'm dia', dep.kind === 'rich' ? 'Dilithium · rich' : 'Rare · power-up');
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
    const boss = world.command.boss;
    const showBoss = live && !!boss && !boss.leaving && boss.cloak < 0.5;
    this.pointer($('ptr-cap'), $('ptr-cap-t'), sector, s.x, s.z, s.heading, showBoss ? boss! : null,
      showBoss ? `${boss!.name} · ${range(Math.hypot(boss!.x - s.x, boss!.z - s.z))}` : '');
    const e = world.encounter;
    const showObj = live && !!e && !e.done && e.r > 0;
    this.pointer($('ptr-obj'), $('ptr-obj-t'), sector, s.x, s.z, s.heading, showObj ? { x: e!.x, y: 0.5, z: e!.z } : null,
      showObj ? `${ENCOUNTERS[e!.id].name} · ${range(Math.hypot(e!.x - s.x, e!.z - s.z))}` : '');
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
