import { HULLS, type HullId } from '../content/hulls';
import { clamp } from '../core/math';
import type { Sector } from '../render/sector';
import type { GameEvent } from '../sim/events';
import { topSpeed } from '../sim/ship';
import { BANK_MAX, PX, TORP_RACK, TORP_RELOAD } from '../sim/tuning';
import type { World } from '../sim/world';

// ── the console ───────────────────────────────────────────────────────────
// The bridge around the viewscreen: a drawn bezel, the sector radar, the hull
// selector, performance traces, the hull schematic, and the bottom console
// (mission log, ship identity, gauges, communications). Every figure on it is
// live: nothing here is decoration that pretends to be data.
//
// Two layouts. Full (a landscape window with room): the whole bridge. Compact
// (phones, small windows): score, gauges, a small radar and the hull buttons,
// with the thumbs given the bottom of the screen.

const RADAR_RANGE = 60;
const REG: Record<HullId, string> = { escort: 'NX-4720', cruiser: 'NCC-4733', scout: 'NCC-4747' };
const SPARK_N = 90;
const STARDATE0 = 47634;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0');
const metres = (units: number) => Math.round(units / PX);
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

interface Spark { canvas: HTMLCanvasElement; data: number[]; max: number; }

export class Console {
  readonly hud = $('hud');
  private readonly bezel = $('bezel') as unknown as SVGSVGElement;
  private readonly lines = $('lines') as unknown as SVGSVGElement;
  private readonly radar = $<HTMLCanvasElement>('radar');
  private readonly sparks: Record<'vel' | 'pow' | 'thr', Spark> = {
    vel: { canvas: $<HTMLCanvasElement>('spark-vel'), data: [], max: 50 },
    pow: { canvas: $<HTMLCanvasElement>('spark-pow'), data: [], max: BANK_MAX },
    thr: { canvas: $<HTMLCanvasElement>('spark-thr'), data: [], max: 8 },
  };
  private readonly hullBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-hull]')];
  private readonly log: Array<{ t: string; html: string; cls: string; at: number; kind: string; n: number; pts: number }> = [];
  private compact = false;
  private shield: DOMRect | null = null;
  private textClock = 1;
  private radarClock = 1;
  private sparkClock = 1;
  private commsClock = 1;
  private bannerT = 0;
  private tip = 0;
  private formText = '';

  constructor(onHull: (id: HullId) => void, onZoom: (dir: 1 | -1) => void) {
    for (const b of this.hullBtns) b.addEventListener('click', () => { onHull(b.dataset.hull as HullId); b.blur(); });
    $('zoom-in').addEventListener('click', () => onZoom(-1));
    $('zoom-out').addEventListener('click', () => onZoom(1));
    // a tap on any console control must not also anchor the thumbstick
    for (const id of ['controls']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  /** Where the hull schematic should be drawn, in CSS pixels; null when it is hidden. */
  get shieldRect(): DOMRect | null {
    return this.shield;
  }

  /** Fit the console to the window. Returns how far to lift the picture's centre. */
  layout(): number {
    const w = window.innerWidth, h = window.innerHeight;
    this.compact = !(w >= 940 && h >= 560 && w / h >= 1.2);
    const s = clamp(Math.min(w / 1600, h / 940), 0.7, 1.2);
    const T = Math.round(52 * s), R = Math.round(26 * s), B = Math.round(176 * s);
    const st = this.hud.style;
    st.setProperty('--s', s.toFixed(3));
    st.setProperty('--T', `${T}px`);
    st.setProperty('--R', `${R}px`);
    st.setProperty('--B', `${B}px`);
    this.hud.classList.toggle('compact', this.compact);
    this.drawBezel(w, h, s, T, R, B);
    // size the canvases' backing stores to their boxes
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [this.radar, ...Object.values(this.sparks).map((k) => k.canvas)]) {
      c.width = Math.max(1, Math.round(c.clientWidth * dpr));
      c.height = Math.max(1, Math.round(c.clientHeight * dpr));
    }
    const slot = $('schematic');
    this.shield = this.compact ? null : slot.getBoundingClientRect();
    this.textClock = this.radarClock = this.sparkClock = 1;
    return this.compact ? h * 0.04 : (B - T) / 2;
  }

  showHull(id: HullId): void {
    for (const b of this.hullBtns) b.setAttribute('aria-checked', String(b.dataset.hull === id));
    const h = HULLS[id];
    $('id-class').textContent = `[${h.name} · ${h.role}`;
    $('id-reg').textContent = REG[id];
    this.formText = `${REG[id]} · hull form 1.1 · ${h.name}`;
    const form = this.bezel.querySelector('#bz-form');
    if (form) form.textContent = this.formText;
  }

  showZoom(level: number): void {
    $('zoom-v').textContent = String(level + 1);
  }

  /** A line in the mission log. */
  note(world: World, html: string, cls = '', kind = '', points = 0): void {
    const last = this.log[0];
    // a run of rocks broken in quick succession reads as one line
    if (kind === 'rock' && last && last.kind === 'rock' && world.time - last.at < 1.5) {
      last.n++;
      last.pts += points;
      last.at = world.time;
      last.html = `${last.n} rocks broken · <b>+${last.pts}</b>`;
    } else {
      this.log.unshift({ t: stardate(world.time), html, cls, at: world.time, kind, n: 1, pts: points });
      this.log.length = Math.min(this.log.length, 7);
    }
    $('log-list').innerHTML = this.log.map((l) => `<li class="${l.cls}"><time>${l.t}</time>${l.html}</li>`).join('');
  }

  events(evts: GameEvent[], world: World): void {
    for (const e of evts) {
      switch (e.type) {
        case 'torpedo':
          this.note(world, `Torpedo away · ${e.target ? `lock ${rid(e.target)}` : 'no lock'}`);
          break;
        case 'rockDestroyed':
          this.note(world, `Rock broken · <b>+${e.points}</b>`, 'gain', 'rock', e.points);
          break;
        case 'shipHit': {
          const pct = Math.round((Math.max(0, e.plates) / world.hull.plates) * 100);
          this.note(world, `Hull struck · ${pct}%`, 'hit');
          this.flashHit();
          if (e.plates === 1) this.banner('Red alert', 'Hull critical', 'One plate left', 1.8);
          break;
        }
        case 'bankEmpty':
          this.note(world, 'Phaser bank dry · recharging');
          break;
        case 'rackEmpty':
          this.note(world, 'Torpedo rack empty · reloading');
          break;
        case 'breach':
          this.note(world, `Hull breach · run ${fmt(e.score)}`, 'hit');
          this.banner('Red alert', 'Hull breach', `Run ${fmt(e.score)} · best ${fmt(world.best)} · new run`, 2.6);
          break;
      }
    }
  }

  update(world: World, sector: Sector, dt: number): void {
    const s = sector.shipNow;
    this.updateLock(world, sector);
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) $('banner').classList.remove('on');

    this.textClock += dt;
    if (this.textClock >= 0.1) { this.textClock = 0; this.updateText(world); }
    this.radarClock += dt;
    if (this.radarClock >= 1 / 30) { this.radarClock = 0; this.drawRadar(world, s.x, s.z, s.heading); }
    this.sparkClock += dt;
    if (this.sparkClock >= 0.1 && !this.compact) { this.sparkClock = 0; this.sampleSparks(world); }
    this.commsClock += dt;
    if (this.commsClock >= 0.5) { this.commsClock = 0; this.updateComms(world); }
  }

  // ── pieces ─────────────────────────────────────────────────────────────

  private updateText(world: World): void {
    const s = world.ship, top = topSpeed(world.hull);
    const speed = Math.hypot(s.vx, s.vz);
    const near = world.field.rocks.filter((r) => Math.hypot(r.x - s.x, r.z - s.z) < RADAR_RANGE).length;
    const pow = Math.round((world.arms.bank / BANK_MAX) * 100);
    const integrity = world.plates / world.hull.plates;

    $('score').textContent = pad(world.score, 6);
    $('best').textContent = pad(Math.max(world.best, world.score), 6);
    $('st-rocks').textContent = String(near);
    $('st-vel').textContent = String(metres(speed));
    $('st-pow').textContent = `${pow}%`;
    $('sb-rocks').style.width = `${Math.min(100, (near / 14) * 100)}%`;
    $('sb-vel').style.width = `${Math.min(100, (speed / top) * 100)}%`;
    $('sb-pow').style.width = `${pow}%`;

    if (this.compact) {
      // compact shows the gauges only
    } else {
      $('id-date').textContent = stardate(world.time);
      $('d-vel').textContent = String(metres(speed));
      $('d-hdg').textContent = pad(compass(s.heading), 3);
      $('d-x').textContent = String(metres(s.x));
      $('d-z').textContent = String(metres(-s.z));
      $('d-kills').textContent = String(world.kills);
      $('d-t').textContent = world.runTime.toFixed(1);
      $('pf-vel').textContent = String(metres(speed));
      $('pf-pow').textContent = `${pow}%`;
      $('hs-plates').textContent = `${world.plates} / ${world.hull.plates}`;
      $('hs-note').textContent = integrity > 0.67 ? 'Integrity nominal' : world.plates > 1 ? 'Hull worn · avoid rock' : 'One plate left';
    }

    const hullPct = Math.round(integrity * 100);
    $('g-hull-v').textContent = String(hullPct);
    const hb = $('g-hull');
    hb.style.width = `${hullPct}%`;
    hb.parentElement!.classList.toggle('warn', integrity <= 0.67 && world.plates > 1);
    hb.parentElement!.classList.toggle('crit', world.plates <= 1);
    $('g-pow-v').textContent = String(pow);
    $('g-pow').style.width = `${pow}%`;
    $('g-pow').parentElement!.classList.toggle('warn', pow < 25);
    [...$('g-torp').children].forEach((p, i) => p.classList.toggle('on', i < world.arms.rack));
    const reload = world.arms.rack < TORP_RACK ? 1 - world.arms.reload / TORP_RELOAD : 1;
    $('g-reload').style.width = `${Math.round(clamp(reload, 0, 1) * 100)}%`;
    $('vignette').classList.toggle('critical', world.plates <= 1);
  }

  private updateComms(world: World): void {
    const s = world.ship;
    const lock = world.field.find(world.lock);
    let nearest = Infinity;
    for (const r of world.field.rocks) nearest = Math.min(nearest, Math.hypot(r.x - s.x, r.z - s.z) - r.r);
    const tips = document.documentElement.classList.contains('touch-ui')
      ? ['Hold Phaser to fire', 'Tap Torpedo to launch', 'Second finger to roll', 'Push the stick up for impulse']
      : ['Hold 1 for phasers', 'Press 2 for a torpedo', 'Shift to roll through a gap', 'Zoom out with the arrows by the hull buttons'];
    this.tip = (this.tip + 1) % (tips.length * 12);
    const lines = [
      `<b>Helm</b>${s.rollCooldown > 0 ? `roll recharging ${s.rollCooldown.toFixed(1)}s` : 'roll ready'}`,
      `<b>Tactical</b>${lock ? `lock ${rid(lock.id)} · ${metres(Math.hypot(lock.x - s.x, lock.z - s.z))} m` : 'no target in the cone'}`,
      `<b>Ops</b>field ${world.field.rocks.length} rocks · nearest ${Number.isFinite(nearest) ? metres(Math.max(0, nearest)) : '—'} m`,
      `<b>Eng</b>phasers ${Math.round((world.arms.bank / BANK_MAX) * 100)}% · torpedoes ${world.arms.rack}/${TORP_RACK}`,
      `<b>Comms</b>${tips[Math.floor(this.tip / 12)]}`,
    ];
    $('comms-list').innerHTML = lines.map((l) => `<li>${l}</li>`).join('');
  }

  private updateLock(world: World, sector: Sector): void {
    const lockEl = $('lock');
    const rock = world.field.find(world.lock);
    const s = sector.shipNow;
    // the reticle: where the phasers are pointing, 24 units off the nose
    const ahead = sector.project(s.x + Math.cos(s.heading) * 24, 0, s.z - Math.sin(s.heading) * 24);
    const ret = $('reticle');
    ret.style.display = ahead ? '' : 'none';
    if (ahead) ret.style.transform = `translate(${ahead.x}px, ${ahead.y}px)`;

    let line = '';
    if (rock) {
      const c = sector.project(rock.x, -0.3, rock.z);
      const edge = sector.project(rock.x + rock.r, -0.3, rock.z);
      if (c && edge) {
        const r = Math.max(14, Math.hypot(edge.x - c.x, edge.y - c.y) * 1.25);
        lockEl.classList.add('on');
        lockEl.style.left = `${c.x - r}px`;
        lockEl.style.top = `${c.y - r}px`;
        lockEl.style.width = `${r * 2}px`;
        lockEl.style.height = `${r * 2}px`;
        $('lock-id').textContent = `Lock ${rid(rock.id)}`;
        $('lock-d').textContent = `${metres(Math.hypot(rock.x - s.x, rock.z - s.z))} m`;
        if (!this.compact) {
          // a data link from the lock to the performance panel, as on the reference console
          const p = $('systems').getBoundingClientRect();
          line = `<line x1="${c.x + r}" y1="${c.y - r}" x2="${p.left}" y2="${p.bottom}"/>`;
        }
      } else lockEl.classList.remove('on');
    } else lockEl.classList.remove('on');
    if (this.lines.innerHTML !== line) this.lines.innerHTML = line;
  }

  private drawRadar(world: World, sx: number, sz: number, h: number): void {
    const c = this.radar, g = c.getContext('2d');
    if (!g || !c.width) return;
    const W = c.width, H = c.height, k = (W / 2) / RADAR_RANGE, cx = W / 2, cy = H * 0.6;
    const fx = Math.cos(h), fz = -Math.sin(h), rx = Math.sin(h), rz = Math.cos(h);
    const to = (x: number, z: number): [number, number] => {
      const dx = x - sx, dz = z - sz;
      return [cx + (dx * rx + dz * rz) * k, cy - (dx * fx + dz * fz) * k];
    };
    g.clearRect(0, 0, W, H);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(0,240,255,.1)';
    const step = 10 * k;
    g.beginPath();
    for (let x = cx % step; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = cy % step; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    g.setLineDash([3, 4]);
    g.strokeStyle = 'rgba(0,240,255,.22)';
    for (const rr of [20, 40, 60]) { g.beginPath(); g.arc(cx, cy, rr * k, 0, Math.PI * 2); g.stroke(); }
    g.setLineDash([]);
    // the seeker's cone
    g.fillStyle = 'rgba(255,159,67,.06)';
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 52 * k, -Math.PI / 2 - 1.1, -Math.PI / 2 + 1.1); g.closePath(); g.fill();

    for (const r of world.field.rocks) {
      const [x, y] = to(r.x, r.z);
      const rad = Math.max(2, r.r * k);
      if (x < -rad || x > W + rad || y < -rad || y > H + rad) continue;
      g.fillStyle = 'rgba(199,125,255,.55)';
      g.strokeStyle = '#c77dff';
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + r.id, q = rad * (0.8 + ((r.id * (i + 3)) % 5) * 0.06);
        i ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
      }
      g.closePath(); g.fill(); g.stroke();
      if (r.id === world.lock) {
        g.strokeStyle = '#ff9f43';
        g.lineWidth = 1.5;
        const b = rad + 4, l = 4;
        g.beginPath();
        for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          g.moveTo(x + ox * b, y + oy * (b - l)); g.lineTo(x + ox * b, y + oy * b); g.lineTo(x + ox * (b - l), y + oy * b);
        }
        g.stroke();
        g.lineWidth = 1;
      }
    }
    g.fillStyle = '#00f0ff';
    for (const t of world.torps) { const [x, y] = to(t.x, t.z); g.fillRect(x - 2, y - 2, 4, 4); }
    for (const b of world.bolts) { const [x, y] = to(b.x, b.z); g.fillRect(x - 1, y - 1, 2, 2); }
    // the ship, always nose up
    g.fillStyle = '#00f0ff';
    g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 5, cy + 6); g.lineTo(cx, cy + 3); g.lineTo(cx - 5, cy + 6); g.closePath(); g.fill();
  }

  private sampleSparks(world: World): void {
    const s = world.ship;
    this.sparks.vel.max = topSpeed(world.hull);
    const threat = world.field.rocks.filter((r) => Math.hypot(r.x - s.x, r.z - s.z) < 30).length;
    const push = (k: keyof Console['sparks'], v: number) => {
      const d = this.sparks[k].data;
      d.push(v);
      if (d.length > SPARK_N) d.shift();
      this.drawSpark(this.sparks[k]);
    };
    push('vel', Math.hypot(s.vx, s.vz));
    push('pow', world.arms.bank);
    push('thr', threat);
    $('pf-thr').textContent = String(threat);
  }

  private drawSpark(sp: Spark): void {
    const c = sp.canvas, g = c.getContext('2d');
    if (!g || !c.width) return;
    const W = c.width, H = c.height, d = sp.data;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,240,255,.1)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < 4; i++) { g.moveTo(0, (H * i) / 4); g.lineTo(W, (H * i) / 4); }
    g.stroke();
    if (d.length < 2) return;
    const x = (i: number) => (i / (SPARK_N - 1)) * W;
    const y = (v: number) => H - 2 - clamp(v / sp.max, 0, 1) * (H - 4);
    const off = SPARK_N - d.length;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,240,255,.32)');
    grad.addColorStop(1, 'rgba(0,240,255,0)');
    g.beginPath();
    g.moveTo(x(off), H);
    d.forEach((v, i) => g.lineTo(x(off + i), y(v)));
    g.lineTo(x(off + d.length - 1), H);
    g.closePath();
    g.fillStyle = grad;
    g.fill();
    g.beginPath();
    d.forEach((v, i) => (i ? g.lineTo(x(off + i), y(v)) : g.moveTo(x(off), y(v))));
    g.strokeStyle = '#00f0ff';
    g.lineWidth = 1.5 * (W / c.clientWidth || 1);
    g.stroke();
    g.fillStyle = '#e8f3f7';
    const lx = x(off + d.length - 1), ly = y(d[d.length - 1]!);
    g.fillRect(lx - 2, ly - 2, 4, 4);
  }

  private flashHit(): void {
    const v = $('vignette');
    v.classList.remove('hit');
    void v.offsetWidth;
    v.classList.add('hit');
  }

  private banner(kicker: string, title: string, sub: string, secs: number): void {
    $('banner-k').textContent = kicker;
    $('banner-t').textContent = title;
    $('banner-s').textContent = sub;
    $('banner').classList.add('on');
    this.bannerT = secs;
  }

  // ── the bezel ──────────────────────────────────────────────────────────
  // Drawn to the window's size in SVG, so its angled panels stay sharp and
  // undistorted at any aspect. The open window in the middle is cut out of a
  // full-screen plate (even-odd fill).

  private drawBezel(w: number, h: number, s: number, T: number, R: number, B: number): void {
    const n = (v: number) => Math.round(v * 10) / 10;
    const pts = (a: Array<[number, number]>) => a.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
    const poly = (a: Array<[number, number]>, cls: string, extra = '') => `<polygon class="${cls}" points="${pts(a)}" ${extra}/>`;
    const defs = `<defs>
      <linearGradient id="bz-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#112a35"/><stop offset=".5" stop-color="#0a1b23"/><stop offset="1" stop-color="#06121a"/></linearGradient>
      <filter id="bz-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;

    if (this.compact) {
      // phones: four corner brackets, nothing that eats the screen
      const m = 8, l = 18;
      const br = [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]
        .map(([x, y, dx, dy]) => `<polyline class="bz-edge" points="${x! + dx! * l},${y} ${x},${y} ${x},${y! + dy! * l}"/>`).join('');
      this.bezel.innerHTML = defs + br;
      return;
    }

    const C = 30 * s, P = 170 * s, D = 14 * s;
    // where the console's centre plate (identity and gauges) sits, matching the CSS grid
    const inner = w - 2 * R - 20 * s, gap = 14 * s, unit = (inner - 3 * gap) / 5.05;
    const q1 = R + 10 * s + unit + gap / 2, q2 = R + 10 * s + unit + gap + unit * 3.05 + gap * 1.5;
    const rise = 18 * s, top = h - B;
    const win: Array<[number, number]> = [
      [R + C, T], [w / 2 - P - D, T], [w / 2 - P, T + D], [w / 2 + P, T + D], [w / 2 + P + D, T], [w - R - C, T], [w - R, T + C],
      [w - R, top - C], [w - R - C, top], [q2 + rise, top], [q2, top - rise], [q1, top - rise], [q1 - rise, top], [R + C, top], [R, top - C], [R, T + C],
    ];
    let out = defs;
    out += `<path class="bz-metal" fill-rule="evenodd" d="M0 0H${w}V${h}H0Z M${pts(win).replace(/ /g, ' L')}Z"/>`;

    // top bar: two wing panels with tick rows, red lamps at their outer ends
    const wy0 = 9 * s, wy1 = T - 10 * s, wc = 6 * s;
    const wing = (x0: number, x1: number): Array<[number, number]> =>
      [[x0 + wc, wy0], [x1, wy0], [x1, wy1 - wc], [x1 - wc, wy1], [x0, wy1], [x0, wy0 + wc]];
    const lx0 = R + C + 30 * s, lx1 = w / 2 - P - 46 * s, rx0 = w / 2 + P + 46 * s, rx1 = w - R - C - 30 * s;
    out += poly(wing(lx0, lx1), 'bz-panel') + poly(wing(rx0, rx1), 'bz-panel');
    out += `<rect class="bz-lamp" x="${n(lx0 + 10 * s)}" y="${n(wy0 + 6 * s)}" width="${n(22 * s)}" height="${n(6 * s)}"/>`;
    out += `<rect class="bz-lamp" x="${n(rx1 - 32 * s)}" y="${n(wy0 + 6 * s)}" width="${n(22 * s)}" height="${n(6 * s)}"/>`;
    let ticks = '';
    for (let x = lx0 + 46 * s; x < lx1 - 120 * s; x += 9 * s) ticks += `M${n(x)} ${n(wy1 - 9 * s)}V${n(wy1 - 4 * s)}`;
    for (let x = rx0 + 120 * s; x < rx1 - 46 * s; x += 9 * s) ticks += `M${n(x)} ${n(wy1 - 9 * s)}V${n(wy1 - 4 * s)}`;
    out += `<path class="bz-tick" d="${ticks}"/>`;
    out += `<text class="bz-text" x="${n(lx1 - 10 * s)}" y="${n(wy0 + 13 * s)}" text-anchor="end">AB-47 · Tactical console</text>`;
    out += `<text class="bz-text" x="${n(rx0 + 10 * s)}" y="${n(wy0 + 13 * s)}">Sector 001 · Sol belt</text>`;
    // the centre plate behind the score, and a glowing slot under it
    out += poly([[w / 2 - P + 10 * s, 6 * s], [w / 2 + P - 10 * s, 6 * s], [w / 2 + P - 10 * s - D, T + D - 6 * s], [w / 2 - P + 10 * s + D, T + D - 6 * s]], 'bz-panel');
    out += `<rect class="bz-slot" x="${n(w / 2 - 70 * s)}" y="${n(T + D - 3 * s)}" width="${n(140 * s)}" height="${n(3 * s)}"/>`;
    // rails: a slot line and a block of hazard stripes on each side
    for (const x of [R / 2, w - R / 2]) {
      out += `<rect class="bz-slot-dim" x="${n(x - 1.5 * s)}" y="${n(T + C + 20 * s)}" width="${n(3 * s)}" height="${n(top - T - 2 * C - 40 * s)}"/>`;
      const y0 = (T + top) / 2 - 40 * s;
      for (let i = 0; i < 6; i++) {
        const y = y0 + i * 13 * s, hw = R * 0.32;
        out += poly([[x - hw, y + 8 * s], [x + hw, y], [x + hw, y + 5 * s], [x - hw, y + 13 * s]], 'bz-hazard');
      }
    }
    // the console: slots along its top edge, and the raised centre plate's inner frame
    out += `<rect class="bz-slot" x="${n((q1 + q2) / 2 - 60 * s)}" y="${n(top - rise + 7 * s)}" width="${n(120 * s)}" height="${n(3 * s)}"/>`;
    for (const x of [R + C + 40 * s, w - R - C - 100 * s]) out += `<rect class="bz-slot-dim" x="${n(x)}" y="${n(top + 8 * s)}" width="${n(60 * s)}" height="${n(4 * s)}"/>`;
    out += `<polyline class="bz-inner" points="${pts([[q1 - rise + 8 * s, top + 8 * s], [q1 + 2 * s, top - rise + 14 * s], [q2 - 2 * s, top - rise + 14 * s], [q2 + rise - 8 * s, top + 8 * s]])}"/>`;
    out += `<line class="bz-inner" x1="${n((q1 + q2) / 2 + 6 * s)}" y1="${n(top + 4 * s)}" x2="${n((q1 + q2) / 2 + 6 * s)}" y2="${n(h - 14 * s)}"/>`;
    out += `<text class="bz-text" id="bz-form" x="${n(q2 - 8 * s)}" y="${n(top - rise - 6 * s)}" text-anchor="end">${this.formText}</text>`;
    // the window's lit edge, last, over everything
    out += poly(win, 'bz-edge');
    this.bezel.innerHTML = out;
  }
}

function stardate(t: number): string {
  return (STARDATE0 + t / 10).toFixed(1);
}

function compass(heading: number): number {
  return Math.round(((90 - (heading * 180) / Math.PI) % 360 + 360) % 360) % 360;
}

function rid(id: number): string {
  return `R-${String(id).padStart(4, '0')}`;
}
