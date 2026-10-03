import { HULLS, type HullId } from '../content/hulls';
import { clamp } from '../core/math';
import { NEON } from '../render/enemies';
import type { Sector } from '../render/sector';
import { ALIEN_TYPES, type Faction } from '../sim/enemies';
import type { GameEvent } from '../sim/events';
import { BANK_MAX, PX, TORP_RACK, TORP_RELOAD } from '../sim/tuning';
import type { World } from '../sim/world';

// ── the HUD ───────────────────────────────────────────────────────────────
// Four corners and nothing in between. Top left: score and hull. Top right:
// weapons, the hull switch and zoom. Bottom left: a round radar. Bottom
// right: the last few log lines, fading. Top centre, only while a capital
// ship is in the sector: its name and hull. Every figure is live.

const RADAR_RANGE = 60;
const LOG_LIFE = 6;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0');
const metres = (u: number) => Math.round(u / PX);
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
const css = (c: { r: number; g: number; b: number }) => {
  const m = Math.max(c.r, c.g, c.b);
  return `rgb(${Math.round((c.r / m) * 255)},${Math.round((c.g / m) * 255)},${Math.round((c.b / m) * 255)})`;
};

export class Hud {
  private readonly radar = $<HTMLCanvasElement>('radar');
  private readonly hullBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-hull]')];
  private readonly log: Array<{ html: string; cls: string; at: number; kind: string; n: number; pts: number }> = [];
  private textClock = 1;
  private radarClock = 1;
  private bannerT = 0;
  private platesShown = -1;

  constructor(onHull: (id: HullId) => void, onZoom: (dir: 1 | -1) => void) {
    for (const b of this.hullBtns) b.addEventListener('click', () => { onHull(b.dataset.hull as HullId); b.blur(); });
    $('zoom-in').addEventListener('click', () => onZoom(-1));
    $('zoom-out').addEventListener('click', () => onZoom(1));
    // a tap on the controls must not also anchor the thumbstick underneath
    $('controls').addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  /** Size the radar's backing store. The HUD needs no lift: it leaves the picture alone. */
  layout(): number {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.radar.width = Math.max(1, Math.round(this.radar.clientWidth * dpr));
    this.radar.height = Math.max(1, Math.round(this.radar.clientHeight * dpr));
    return 0;
  }

  showHull(id: HullId): void {
    for (const b of this.hullBtns) b.setAttribute('aria-checked', String(b.dataset.hull === id));
    $('hullname').textContent = HULLS[id].name;
    this.platesShown = -1;
  }

  showZoom(level: number): void {
    $('zoom-v').textContent = String(level + 1);
  }

  note(world: World, html: string, cls = '', kind = '', points = 0): void {
    const last = this.log[0];
    if (kind && last && last.kind === kind && world.time - last.at < 1.5) {
      last.n++; last.pts += points; last.at = world.time;
      last.html = `${last.n} ${kind === 'rock' ? 'rocks broken' : 'hulls destroyed'} · <b>+${fmt(last.pts)}</b>`;
    } else {
      this.log.unshift({ html, cls, at: world.time, kind, n: 1, pts: points });
      this.log.length = Math.min(this.log.length, 4);
    }
    this.drawLog(world);
  }

  events(evts: GameEvent[], world: World): void {
    for (const e of evts) {
      switch (e.type) {
        case 'rockDestroyed': this.note(world, `Rock broken · <b>+${e.points}</b>`, 'gain', 'rock', e.points); break;
        case 'alienDestroyed': this.note(world, `${e.faction} ${e.kind} destroyed · <b>+${e.points}</b>`, 'gain', 'hull', e.points); break;
        case 'pickup': this.note(world, `Hull repaired · ${e.plates}/${world.hull.plates}`, 'gain'); break;
        case 'plasmaDown': this.note(world, 'Plasma torpedo shot down'); break;
        case 'tractor': this.note(world, 'Tractor lock · thrust away to break it', 'hit'); break;
        case 'shipHit':
          this.note(world, `Hull struck · ${e.source}`, 'hit');
          this.flashHit();
          if (e.plates === 1) this.banner('Red alert', 'Hull critical', 'One plate left', 1.8);
          break;
        case 'bossWarn':
          this.note(world, `${e.name} approaching`, 'boss');
          this.banner('Yellow alert', `${e.name}`, 'Capital ship approaching', 2.6, 'caution');
          break;
        case 'bossArrive': this.note(world, `${e.name} on intercept course`, 'boss'); break;
        case 'bossLeft': this.note(world, 'The capital ship breaks off', 'boss'); break;
        case 'bossDestroyed':
          this.note(world, `${e.name} destroyed · <b>+${fmt(e.points)}</b>`, 'gain');
          this.banner('Victory', `${e.name}`, `Destroyed · +${fmt(e.points)} · two plates repaired`, 2.4, 'caution');
          break;
        case 'breach':
          this.note(world, `Hull breach · run ${fmt(e.score)}`, 'hit');
          this.banner('Red alert', 'Hull breach', `Run ${fmt(e.score)} · best ${fmt(world.best)} · new run`, 2.6);
          break;
      }
    }
  }

  update(world: World, sector: Sector, dt: number): void {
    this.updateLock(world, sector);
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) $('banner').classList.remove('on');
    this.textClock += dt;
    if (this.textClock >= 0.1) { this.textClock = 0; this.updateText(world); this.drawLog(world); }
    this.radarClock += dt;
    if (this.radarClock >= 1 / 30) { this.radarClock = 0; this.drawRadar(world, sector); }
  }

  private updateText(world: World): void {
    const pow = Math.round((world.arms.bank / BANK_MAX) * 100);
    $('score').textContent = pad(world.score, 6);
    $('best').textContent = pad(Math.max(world.best, world.score), 6);
    const plates = $('plates');
    if (this.platesShown !== world.hull.plates) {
      plates.innerHTML = '<i></i>'.repeat(world.hull.plates);
      this.platesShown = world.hull.plates;
    }
    [...plates.children].forEach((p, i) => p.classList.toggle('on', i < world.plates));
    plates.classList.toggle('crit', world.plates <= 1);
    $('hull-v').textContent = `${Math.round((world.plates / world.hull.plates) * 100)}%`;
    $('g-pow').style.width = `${pow}%`;
    $('g-pow').parentElement!.classList.toggle('warn', pow < 25);
    [...$('g-torp').children].forEach((p, i) => p.classList.toggle('on', i < world.arms.rack));
    const reload = world.arms.rack < TORP_RACK ? 1 - world.arms.reload / TORP_RELOAD : 1;
    $('g-reload').style.width = `${Math.round(clamp(reload, 0, 1) * 100)}%`;
    $('vignette').classList.toggle('critical', world.plates <= 1);

    const b = world.command.boss, bar = $('bossbar');
    bar.classList.toggle('on', !!b);
    if (b) {
      bar.style.setProperty('--boss', css(NEON[b.faction]));
      bar.classList.toggle('cloaked', b.cloak > 0.5);
      $('boss-name').textContent = b.name;
      $('boss-hp').style.width = `${Math.max(0, (b.hp / b.maxHp) * 100)}%`;
      $('boss-fuse').textContent = b.leaving ? 'Breaking off' : `${b.faction} capital ship · ${Math.ceil(b.fuse)}s`;
    }
  }

  private drawLog(world: World): void {
    const html = this.log.map((l) => {
      const o = clamp(1 - (world.time - l.at - (LOG_LIFE - 1.5)) / 1.5, 0, 1);
      return o > 0 ? `<li class="${l.cls}" style="opacity:${o.toFixed(2)}">${l.html}</li>` : '';
    }).join('');
    const el = $('log');
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  private updateLock(world: World, sector: Sector): void {
    const s = sector.shipNow;
    const ahead = sector.project(s.x + Math.cos(s.heading) * 24, 0, s.z - Math.sin(s.heading) * 24);
    const ret = $('reticle');
    ret.style.display = ahead ? '' : 'none';
    if (ahead) ret.style.transform = `translate(${ahead.x}px, ${ahead.y}px)`;

    const lockEl = $('lock');
    const t = world.lock === null ? null
      : world.aliens.find((a) => a.id === world.lock) ?? (world.command.boss?.id === world.lock ? world.command.boss : null)
        ?? world.field.find(world.lock) ?? null;
    if (!t) { lockEl.classList.remove('on'); return; }
    const c = sector.project(t.x, 0, t.z), edge = sector.project(t.x + t.r, 0, t.z);
    if (!c || !edge) { lockEl.classList.remove('on'); return; }
    const r = Math.max(14, Math.hypot(edge.x - c.x, edge.y - c.y) * 1.25);
    lockEl.classList.add('on');
    lockEl.style.left = `${c.x - r}px`;
    lockEl.style.top = `${c.y - r}px`;
    lockEl.style.width = lockEl.style.height = `${r * 2}px`;
    const what = 'kind' in t ? `${ALIEN_TYPES[t.kind].faction} ${t.kind}` : 'faction' in t ? t.name : 'Rock';
    $('lock-id').textContent = `Lock · ${what}`;
    $('lock-d').textContent = `${metres(Math.hypot(t.x - s.x, t.z - s.z))} m`;
  }

  private drawRadar(world: World, sector: Sector): void {
    const c = this.radar, g = c.getContext('2d');
    if (!g || !c.width) return;
    const s = sector.shipNow, h = s.heading;
    const W = c.width, R = W / 2, k = R / RADAR_RANGE;
    const fx = Math.cos(h), fz = -Math.sin(h), rx = Math.sin(h), rz = Math.cos(h);
    const to = (x: number, z: number): [number, number] => {
      const dx = x - s.x, dz = z - s.z;
      return [R + (dx * rx + dz * rz) * k, R - (dx * fx + dz * fz) * k];
    };
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(3,10,16,.55)'; g.fillRect(0, 0, W, W);
    g.strokeStyle = 'rgba(0,240,255,.16)'; g.lineWidth = 1;
    for (const rr of [20, 40]) { g.beginPath(); g.arc(R, R, rr * k, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(R, 0); g.lineTo(R, W); g.moveTo(0, R); g.lineTo(W, R); g.stroke();
    // the seeker's cone
    g.fillStyle = 'rgba(255,159,67,.07)';
    g.beginPath(); g.moveTo(R, R); g.arc(R, R, 52 * k, -Math.PI / 2 - 1.1, -Math.PI / 2 + 1.1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(199,125,255,.6)';
    for (const r of world.field.rocks) {
      const [x, y] = to(r.x, r.z);
      g.beginPath(); g.arc(x, y, Math.max(1.5, r.r * k), 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(199,125,255,.35)';
    for (const w of world.webs) { const [x, y] = to(w.x, w.z); g.beginPath(); g.arc(x, y, w.r * k, 0, Math.PI * 2); g.fill(); }
    for (const a of world.aliens) {
      const [x, y] = to(a.x, a.z);
      g.fillStyle = css(NEON[ALIEN_TYPES[a.kind].faction as Faction]);
      g.save(); g.translate(x, y); g.rotate(-(a.face - h));
      g.beginPath(); g.moveTo(5, 0); g.lineTo(-4, 3.5); g.lineTo(-4, -3.5); g.closePath(); g.fill();
      g.restore();
    }
    const b = world.command.boss;
    if (b) {
      let [x, y] = to(b.x, b.z);
      // off the scope, a capital ship pins to the rim
      const dx = x - R, dy = y - R, d = Math.hypot(dx, dy);
      if (d > R - 8) { x = R + (dx / d) * (R - 8); y = R + (dy / d) * (R - 8); }
      g.strokeStyle = css(NEON[b.faction]); g.lineWidth = 2;
      g.strokeRect(x - 6, y - 6, 12, 12);
    }
    g.fillStyle = 'rgba(255,90,140,.9)';
    for (const sh of world.shots) { const [x, y] = to(sh.x, sh.z); g.fillRect(x - 1, y - 1, 2, 2); }
    g.fillStyle = '#7ff6ff';
    for (const p of world.pickups) { const [x, y] = to(p.x, p.z); g.fillRect(x - 2, y - 2, 4, 4); }
    g.restore();
    g.strokeStyle = 'rgba(0,240,255,.45)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#00f0ff';
    g.beginPath(); g.moveTo(R, R - 6); g.lineTo(R + 4.5, R + 5); g.lineTo(R, R + 2.5); g.lineTo(R - 4.5, R + 5); g.closePath(); g.fill();
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
