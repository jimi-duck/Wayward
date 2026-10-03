import { angleDelta, clamp } from '../core/math';
import type { Sector } from '../render/sector';
import { ALIEN_TYPES } from '../sim/enemies';
import type { GameEvent } from '../sim/events';
import { BANK_MAX, PX, TORP_RACK, TORP_RELOAD } from '../sim/tuning';
import type { World } from '../sim/world';

// ── the HUD ───────────────────────────────────────────────────────────────
// Laid out as in the reference frame, in red on dark grey:
//   top right    · phaser bank (a flat bar), torpedo rack (pips and a reload
//                  line), and a dark readout with the score and hull plates
//   bottom left  · a round red radar with a sweep
//   bottom right · one status line with a dotted leader: the latest event
//   in the world · a red box on the current target (the torpedo lock if
//                  there is one, else the hull nearest the nose), small
//                  brackets on every other hull in view, a faint reticle
//   top centre   · a capital ship's name and hull, only while one is here
// Every figure is live.

const RADAR_RANGE = 90;
const STATUS_LIFE = 6;
const MAX_MARKS = 12;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0');
const metres = (u: number) => Math.round(u / PX);
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
const range = (u: number) => (metres(u) >= 1000 ? `${(metres(u) / 1000).toFixed(1)} km` : `${metres(u)} m`);

interface Tracked { id: number; x: number; y: number; z: number; r: number; label: string; }

export class Hud {
  private readonly radar = $<HTMLCanvasElement>('radar');
  private readonly marks: HTMLSpanElement[] = [];
  private status = { text: '', cls: '', at: -99, kind: '', n: 0, pts: 0 };
  private textClock = 1;
  private radarClock = 1;
  private bannerT = 0;
  private time = 0;

  constructor(onZoom: (dir: 1 | -1) => void) {
    for (const [id, dir] of [['zoom-in', -1], ['zoom-out', 1]] as const) {
      const b = $(id);
      b.addEventListener('click', () => onZoom(dir));
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    const host = $('marks');
    for (let i = 0; i < MAX_MARKS; i++) {
      const s = document.createElement('span');
      s.hidden = true;
      host.append(s);
      this.marks.push(s);
    }
  }

  /** Size the radar's backing store. The HUD needs no lift: it leaves the picture alone. */
  layout(): number {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.radar.width = Math.max(1, Math.round(this.radar.clientWidth * dpr));
    this.radar.height = Math.max(1, Math.round(this.radar.clientHeight * dpr));
    return 0;
  }

  showZoom(level: number): void {
    $('zoom-v').textContent = String(level + 1);
  }

  /** Put a line on the status readout. Kills of the same kind in a quick run add up. */
  note(world: World, text: string, cls = '', kind = '', points = 0): void {
    const s = this.status;
    if (kind && s.kind === kind && world.time - s.at < 1.6) {
      s.n++; s.pts += points; s.at = world.time;
      s.text = `${s.n} ${kind === 'rock' ? 'rocks broken' : 'kills'} · +${fmt(s.pts)}`;
    } else {
      this.status = { text, cls, at: world.time, kind, n: 1, pts: points };
    }
    this.drawStatus(world);
  }

  events(evts: GameEvent[], world: World): void {
    for (const e of evts) {
      switch (e.type) {
        case 'rockDestroyed': this.note(world, `Rock broken · +${e.points}`, '', 'rock', e.points); break;
        case 'alienDestroyed': this.note(world, `${ALIEN_TYPES[e.kind as keyof typeof ALIEN_TYPES]?.label ?? e.kind} destroyed · +${e.points}`, '', 'hull', e.points); break;
        case 'pickup': this.note(world, `Hull repaired · ${e.plates}/${world.hull.plates}`); break;
        case 'plasmaDown': this.note(world, 'Plasma torpedo shot down'); break;
        case 'tractor': this.note(world, 'Tractor lock · thrust away', 'hit'); break;
        case 'bankEmpty': this.note(world, 'Phaser bank dry', 'hit'); break;
        case 'shipHit':
          this.note(world, `Hull struck · ${e.source}`, 'hit');
          this.flashHit();
          if (e.plates === 1) this.banner('Red alert', 'Hull critical', 'One plate left', 1.8);
          break;
        case 'bossWarn':
          this.note(world, `${e.name} inbound`, 'hit');
          this.banner('Contact', `${e.name}`, 'Capital ship inbound', 2.6);
          break;
        case 'bossArrive': this.note(world, `${e.name} on intercept`, 'hit'); break;
        case 'bossLeft': this.note(world, 'Capital ship breaking off'); break;
        case 'bossDestroyed':
          this.note(world, `${e.name} destroyed · +${fmt(e.points)}`);
          this.banner('Kill confirmed', `${e.name}`, `+${fmt(e.points)} · two plates repaired`, 2.4, 'calm');
          break;
        case 'breach':
          this.note(world, `Hull breach · run ${fmt(e.score)}`, 'hit');
          this.banner('Red alert', 'Hull breach', `Run ${fmt(e.score)} · best ${fmt(world.best)} · new run`, 2.6);
          break;
      }
    }
  }

  update(world: World, sector: Sector, dt: number): void {
    this.time += dt;
    this.updateTargets(world, sector);
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) $('banner').classList.remove('on');
    this.textClock += dt;
    if (this.textClock >= 0.1) { this.textClock = 0; this.updateText(world); this.drawStatus(world); }
    this.radarClock += dt;
    if (this.radarClock >= 1 / 30) { this.radarClock = 0; this.drawRadar(world, sector); }
  }

  private updateText(world: World): void {
    const pow = Math.round((world.arms.bank / BANK_MAX) * 100);
    $('score').textContent = pad(world.score, 6);
    $('plates').textContent = String(world.plates);
    $('hull-cell').classList.toggle('crit', world.plates <= 1);
    $('g-pow').style.width = `${pow}%`;
    $('g-pow').parentElement!.classList.toggle('warn', pow < 20);
    [...$('g-torp').children].forEach((p, i) => p.classList.toggle('on', i < world.arms.rack));
    const reload = world.arms.rack < TORP_RACK ? 1 - world.arms.reload / TORP_RELOAD : 1;
    $('g-reload').style.width = `${Math.round(clamp(reload, 0, 1) * 100)}%`;
    $('vignette').classList.toggle('critical', world.plates <= 1);

    const b = world.command.boss, bar = $('bossbar');
    bar.classList.toggle('on', !!b);
    if (b) {
      bar.classList.toggle('cloaked', b.cloak > 0.5);
      bar.classList.toggle('inbound', b.arriving);
      $('boss-name').textContent = b.name;
      $('boss-hp').style.width = `${Math.max(0, (b.hp / b.maxHp) * 100)}%`;
      const d = Math.hypot(b.x - world.ship.x, b.z - world.ship.z);
      $('boss-fuse').textContent = b.arriving ? `Inbound · ${range(d)}` : b.leaving ? 'Breaking off' : `${b.faction} capital ship · ${Math.ceil(b.fuse)}s`;
    }
  }

  private drawStatus(world: World): void {
    const s = this.status, el = $('status'), age = world.time - s.at;
    const text = s.text || `${world.hull.name} · holding`;
    if ($('status-t').textContent !== text) $('status-t').textContent = text;
    el.classList.toggle('hit', s.cls === 'hit' && age < STATUS_LIFE);
    el.classList.toggle('calm', age >= STATUS_LIFE);
    el.style.opacity = age >= STATUS_LIFE ? '.5' : '1';
  }

  /** The box on the current target, brackets on the rest, and the reticle. */
  private updateTargets(world: World, sector: Sector): void {
    const s = sector.shipNow;
    const ahead = sector.project(s.x + Math.cos(s.heading) * 30, 0.4, s.z - Math.sin(s.heading) * 30);
    const ret = $('reticle');
    ret.style.display = ahead ? '' : 'none';
    if (ahead) ret.style.transform = `translate(${ahead.x}px, ${ahead.y}px)`;

    const tracked: Tracked[] = world.aliens.map((a) => ({ id: a.id, x: a.x, y: a.y, z: a.z, r: a.r, label: ALIEN_TYPES[a.kind].label }));
    const boss = world.command.boss;
    if (boss && !boss.leaving && boss.cloak < 0.5) tracked.push({ id: boss.id, x: boss.x, y: boss.y, z: boss.z, r: boss.r, label: 'Capital ship' });

    // the target: the torpedo lock if there is one, else the hull nearest the nose
    let target: Tracked | null = null;
    const locked = world.lock !== null;
    if (locked) {
      target = tracked.find((t) => t.id === world.lock) ?? null;
      const rock = target ? null : world.field.find(world.lock);
      if (rock) target = { id: rock.id, x: rock.x, y: 0, z: rock.z, r: rock.r, label: 'Asteroid' };
    }
    if (!target) {
      let best = Infinity;
      for (const t of tracked) {
        const dx = t.x - s.x, dz = t.z - s.z, d = Math.hypot(dx, dz);
        const off = Math.abs(angleDelta(s.heading, Math.atan2(-dz, dx)));
        if (off > 1.1) continue;
        const score = d * (1 + off * 1.5);
        if (score < best) { best = score; target = t; }
      }
    }

    const lockEl = $('lock');
    const box = target ? this.screenBox(sector, target) : null;
    if (!target || !box) lockEl.classList.remove('on');
    else {
      lockEl.classList.add('on');
      lockEl.classList.toggle('locked', locked);
      lockEl.style.transform = `translate(${box.x - box.r}px, ${box.y - box.r}px)`;
      lockEl.style.width = lockEl.style.height = `${box.r * 2}px`;
      $('lock-id').textContent = locked ? `Lock · ${target.label}` : target.label;
      $('lock-d').textContent = range(Math.hypot(target.x - s.x, target.y, target.z - s.z));
    }

    let n = 0;
    for (const t of tracked) {
      if (n >= MAX_MARKS) break;
      if (target && t.id === target.id) continue;
      const p = sector.project(t.x, t.y, t.z);
      if (!p || p.x < 0 || p.y < 0 || p.x > innerWidth || p.y > innerHeight) continue;
      const m = this.marks[n++]!;
      m.hidden = false;
      m.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
    for (; n < MAX_MARKS; n++) this.marks[n]!.hidden = true;
  }

  private screenBox(sector: Sector, t: Tracked): { x: number; y: number; r: number } | null {
    const c = sector.project(t.x, t.y, t.z), top = sector.project(t.x, t.y + t.r, t.z);
    if (!c || !top) return null;
    return { x: c.x, y: c.y, r: clamp(Math.abs(c.y - top.y) * 1.5, 14, 160) };
  }

  /** The radar: ship-up, a red ring and sweep, bracket arcs either side. */
  private drawRadar(world: World, sector: Sector): void {
    const c = this.radar, g = c.getContext('2d');
    if (!g || !c.width) return;
    const s = sector.shipNow, h = s.heading;
    const W = c.width, C = W / 2, dpr = W / Math.max(1, c.clientWidth), R = C - 11 * dpr, k = R / RADAR_RANGE;
    const fx = Math.cos(h), fz = -Math.sin(h), rx = Math.sin(h), rz = Math.cos(h);
    const to = (x: number, z: number): [number, number, boolean] => {
      const dx = x - s.x, dz = z - s.z;
      let px = (dx * rx + dz * rz) * k, py = -(dx * fx + dz * fz) * k;
      const d = Math.hypot(px, py), out = d > R - 5 * dpr;
      if (out) { px *= (R - 5 * dpr) / d; py *= (R - 5 * dpr) / d; }
      return [C + px, C + py, out];
    };
    g.clearRect(0, 0, W, W);

    // the bracket arcs outside the scope
    g.strokeStyle = 'rgba(255,59,48,.8)'; g.lineWidth = 2.5 * dpr;
    for (const a of [Math.PI, 0]) { g.beginPath(); g.arc(C, C, R + 6 * dpr, a - 0.42, a + 0.42); g.stroke(); }

    g.save();
    g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(14,15,18,.72)'; g.fillRect(0, 0, W, W);
    g.strokeStyle = 'rgba(255,59,48,.14)'; g.lineWidth = 1 * dpr;
    for (const rr of [30, 60]) { g.beginPath(); g.arc(C, C, rr * k, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(C, 0); g.lineTo(C, W); g.moveTo(0, C); g.lineTo(W, C); g.stroke();
    // the sweep: a fading wedge behind a bright line
    const sweep = this.time * 2.2;
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(255,59,48,${0.16 * (1 - i / 14)})`;
      g.beginPath(); g.moveTo(C, C); g.arc(C, C, R, sweep - (i + 1) * 0.05, sweep - i * 0.05); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(255,90,79,.7)'; g.lineWidth = 1.2 * dpr;
    g.beginPath(); g.moveTo(C, C); g.lineTo(C + Math.cos(sweep) * R, C + Math.sin(sweep) * R); g.stroke();

    g.fillStyle = 'rgba(236,230,225,.12)';
    for (const b of world.field.bulwarks) { const [x, y, out] = to(b.x, b.z); if (!out) { g.beginPath(); g.arc(x, y, Math.max(3, b.r * k), 0, Math.PI * 2); g.fill(); } }
    g.fillStyle = 'rgba(236,230,225,.32)';
    for (const r of world.field.rocks) { const [x, y, out] = to(r.x, r.z); if (!out) { g.beginPath(); g.arc(x, y, Math.max(1.2 * dpr, r.r * k), 0, Math.PI * 2); g.fill(); } }
    g.fillStyle = 'rgba(255,59,48,.2)';
    for (const w of world.webs) { const [x, y] = to(w.x, w.z); g.beginPath(); g.arc(x, y, w.r * k, 0, Math.PI * 2); g.fill(); }
    for (const a of world.aliens) {
      const [x, y, out] = to(a.x, a.z);
      g.fillStyle = out ? 'rgba(255,59,48,.5)' : '#ff3b30';
      g.save(); g.translate(x, y); g.rotate(-(a.face - h));
      const sz = (ALIEN_TYPES[a.kind].role === 'cruiser' ? 5 : 3.6) * dpr;
      g.beginPath(); g.moveTo(sz * 1.3, 0); g.lineTo(-sz, sz); g.lineTo(-sz, -sz); g.closePath(); g.fill();
      g.restore();
    }
    const b = world.command.boss;
    if (b) {
      const [x, y] = to(b.x, b.z);
      g.strokeStyle = '#ff3b30'; g.lineWidth = 2 * dpr;
      g.strokeRect(x - 6 * dpr, y - 6 * dpr, 12 * dpr, 12 * dpr);
    }
    g.fillStyle = 'rgba(255,170,150,.85)';
    for (const sh of world.shots) { const [x, y, out] = to(sh.x, sh.z); if (!out) g.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr); }
    g.fillStyle = '#ffd08a';
    for (const p of world.pickups) { const [x, y] = to(p.x, p.z); g.fillRect(x - 2 * dpr, y - 2 * dpr, 4 * dpr, 4 * dpr); }
    g.restore();

    g.strokeStyle = 'rgba(255,59,48,.6)'; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.stroke();
    // the ship, and its forward arc
    g.fillStyle = '#ece6e1';
    g.beginPath(); g.moveTo(C, C - 5 * dpr); g.lineTo(C + 3.5 * dpr, C + 4 * dpr); g.lineTo(C, C + 2 * dpr); g.lineTo(C - 3.5 * dpr, C + 4 * dpr); g.closePath(); g.fill();
  }

  private flashHit(): void {
    const v = $('vignette');
    v.classList.remove('hit');
    void v.offsetWidth;
    v.classList.add('hit');
  }

  private banner(kicker: string, title: string, sub: string, secs: number, tone = ''): void {
    $('banner-k').textContent = kicker;
    $('banner-t').textContent = title;
    $('banner-s').textContent = sub;
    const b = $('banner');
    b.className = `on ${tone}`;
    this.bannerT = secs;
  }
}
