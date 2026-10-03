import { angleDelta, clamp } from '../core/math';
import type { Sector } from '../render/sector';
import { ENCOUNTERS } from '../sim/encounters';
import { ALIEN_TYPES, alienLabel, cloaked } from '../sim/enemies';
import type { GameEvent } from '../sim/events';
import { POWER_LABEL } from '../sim/pickups';
import { OC_MAX, PX } from '../sim/tuning';
import type { World } from '../sim/world';

// ── the HUD ───────────────────────────────────────────────────────────────
// Laid out as in the reference frame, in red on dark grey:
//   top edge     · the refit rail: dilithium toward the next refit, in violet
//   top right    · phaser bank (a flat bar), torpedo rack (pips and a reload
//                  line), mines out, the overcharge gauge (amber when ready),
//                  a dark readout with the score and the hull (plates, and
//                  shield charges beside them), the kill chain, power-ups
//   bottom left  · a round red radar with a sweep
//   bottom right · one status line with a dotted leader: the latest event
//   in the world · a red box on the current target (the torpedo lock if
//                  there is one, else the hull nearest the nose), small
//                  brackets on every other hull in view, a faint reticle, an
//                  amber diamond on a sector event's objective
//   top centre   · a capital ship's name and hull, or an event's objective
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
  private plateKey = '';
  private rackKey = '';
  private mineKey = '';
  private powerKey = '';

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
        case 'rockDestroyed': this.note(world, `${e.kind === 'basalt' ? 'Rock' : `${e.kind} rock`} broken · +${e.points}`, '', 'rock', e.points); break;
        case 'alienDestroyed': this.note(world, `${e.label} destroyed · +${fmt(e.points)}`, '', 'hull', e.points); break;
        case 'pickup': this.note(world, `Hull repaired · ${e.plates}/${world.stats.maxPlates}`); break;
        case 'power': this.note(world, `${POWER_LABEL[e.kind]}`); break;
        case 'plasmaDown': this.note(world, 'Plasma torpedo shot down'); break;
        case 'tractor': this.note(world, 'Tractor lock · thrust away', 'hit'); break;
        case 'bankEmpty': this.note(world, 'Phaser bank dry', 'hit'); break;
        case 'shieldHit': this.note(world, e.left > 0 ? `Shield took it · ${e.left} left` : 'Shield down · recharging', 'hit'); this.flashHit(); break;
        case 'shieldUp': this.note(world, `Shield up · ${e.charges}`); break;
        case 'regen': this.note(world, `Hull regrown · ${e.plates}/${world.stats.maxPlates}`); break;
        case 'damageControl': this.banner('Damage control', 'Hull held', 'One plate · two seconds of grace', 2, 'caution'); break;
        case 'overchargeReady': this.note(world, 'Overcharge ready · E'); break;
        case 'overcharge': this.note(world, `Overcharge released · ${e.hits} hit${e.hits === 1 ? '' : 's'}`); break;
        case 'chain': this.note(world, `Chain ${e.count} · score ×${e.mult}`); break;
        case 'squad': this.note(world, `${e.label} inbound`, 'hit'); break;
        case 'levelUp': this.banner('Dilithium', `Refit ${pad(e.refit, 2)}`, 'Rail full', 0.9, 'gain'); break;
        case 'shipHit':
          this.note(world, `Hull struck · ${e.source.split(':')[0]}`, 'hit');
          this.flashHit();
          if (e.plates === 1) this.banner('Red alert', 'Hull critical', 'One plate left', 1.8);
          break;
        case 'bossWarn':
          this.note(world, `${e.name} inbound`, 'hit');
          this.banner('Yellow alert', `${e.name}`, e.hails ? 'Capital ship inbound' : 'Decloaking: no hail', 2.6, 'caution');
          break;
        case 'bossEvaded': this.note(world, `Broke away from ${e.name}`); break;
        case 'bossArrive': this.note(world, `${e.name} on intercept`, 'hit'); break;
        case 'bossPhase': this.banner('Capital ship', e.phase === 2 ? 'Last stand' : 'Hull buckling', e.phase === 2 ? 'Everything she has left' : 'Reinforcements inbound', 1.6); break;
        case 'bossLeft': this.note(world, 'Capital ship breaking off'); break;
        case 'bossDestroyed':
          this.note(world, `${e.name} destroyed · +${fmt(e.points)}`);
          this.banner('Kill confirmed', `${e.name}`, `+${fmt(e.points)} · battle salvage`, 2.4, 'calm');
          break;
        case 'sectorEvent': this.banner('Sector event', e.name, e.text, 2.4, 'caution'); this.note(world, e.name); break;
        case 'sectorEventEnd': this.note(world, `${e.name} · ${e.text}`, e.success ? '' : 'hit'); break;
        case 'breach': this.note(world, `Hull breach · run ${fmt(e.score)}`, 'hit'); this.banner('Red alert', 'Hull breach', `Run ${fmt(e.score)}`, 1.6); break;
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
    const st = world.stats, arms = world.arms;
    const pow = Math.round((arms.bank / st.bankMax) * 100);
    $('score').textContent = pad(world.score, 6);
    $('g-pow').style.width = `${pow}%`;
    $('g-pow').parentElement!.classList.toggle('warn', pow < 20 && world.overload <= 0 && world.powers.rapid <= 0);

    // the rail
    $('refit-n').textContent = pad(world.refit, 2);
    $('xp-v').textContent = String(Math.floor(world.xp));
    $('xp-n').textContent = String(world.xpNext);
    $('xp').style.width = `${clamp(world.xp / world.xpNext, 0, 1) * 100}%`;
    $('rail').classList.toggle('full', world.celebrate > 0);

    // torpedoes: offline until the bay is fitted
    const torp = $('row-torp');
    torp.classList.toggle('off', !st.torpedoes);
    document.documentElement.classList.toggle('has-torps', st.torpedoes);
    const rackKey = `${st.torpedoes ? st.torpRack : 0}`;
    if (rackKey !== this.rackKey) {
      this.rackKey = rackKey;
      $('g-torp').replaceChildren(...Array.from({ length: st.torpedoes ? st.torpRack : 2 }, () => document.createElement('i')));
    }
    [...$('g-torp').children].forEach((p, i) => p.classList.toggle('on', st.torpedoes && i < arms.rack));
    const reload = st.torpedoes && arms.rack < st.torpRack ? 1 - arms.reload / st.torpReload : st.torpedoes ? 1 : 0;
    $('g-reload').style.width = `${Math.round(clamp(reload, 0, 1) * 100)}%`;

    // mines out
    const mines = $('row-mines');
    mines.hidden = !st.mines;
    if (st.mines) {
      const key = `${st.mineMax}`;
      if (key !== this.mineKey) { this.mineKey = key; $('g-mines').replaceChildren(...Array.from({ length: st.mineMax }, () => document.createElement('i'))); }
      [...$('g-mines').children].forEach((p, i) => p.classList.toggle('on', i < world.sys.mines.length));
    }

    // the warp core
    const oc = world.oc / OC_MAX;
    $('g-oc').style.width = `${Math.round(oc * 100)}%`;
    $('row-oc').classList.toggle('ready', oc >= 1);
    $('row-oc').classList.toggle('hot', world.overload > 0);
    $('oc-k').textContent = world.overload > 0 ? `Overload ${Math.ceil(world.overload)}s` : oc >= 1 ? 'Overcharge ready' : 'Overcharge';
    $('release-f').style.width = `${Math.round(oc * 100)}%`;
    $('release').classList.toggle('ready', oc >= 1);

    // the hull: plates, then shield charges
    const key = `${world.plates}/${st.maxPlates}/${world.shields}/${st.shieldMax}/${world.powers.shield > 0}`;
    if (key !== this.plateKey) {
      this.plateKey = key;
      const host = $('plates');
      const kids: HTMLElement[] = [];
      for (let i = 0; i < st.maxPlates; i++) { const p = document.createElement('i'); if (i < world.plates) p.className = 'on'; kids.push(p); }
      const shields = st.shieldMax + (world.powers.shield > 0 ? 1 : 0);
      for (let i = 0; i < shields; i++) {
        const p = document.createElement('i');
        p.className = `sh${i < world.shields || (i >= st.shieldMax && world.powers.shield > 0) ? ' on' : ''}`;
        kids.push(p);
      }
      host.replaceChildren(...kids);
      host.setAttribute('aria-label', `Hull ${world.plates} of ${st.maxPlates}${st.shieldMax ? `, shields ${world.shields}` : ''}`);
    }
    $('hull-cell').classList.toggle('crit', world.plates <= 1);
    $('vignette').classList.toggle('critical', world.plates <= 1 && world.alive);

    // the chain
    const chain = $('chain');
    chain.classList.toggle('on', world.chain >= 2);
    if (world.chain >= 2) {
      $('chain-n').textContent = String(world.chain);
      $('chain-x').textContent = `×${world.chainMult}`;
      $('chain-t').style.width = `${Math.round(world.chainLeft * 100)}%`;
    }

    // power-ups
    const live = (Object.keys(world.powers) as Array<keyof typeof world.powers>).filter((k) => world.powers[k] > 0);
    const pk = live.map((k) => `${k}${Math.ceil(world.powers[k])}`).join() + (world.phaseT > 0 ? `phase${Math.ceil(world.phaseT)}` : '');
    if (pk !== this.powerKey) {
      this.powerKey = pk;
      const chips = live.map((k) => { const s = document.createElement('span'); s.textContent = `${POWER_LABEL[k]} · ${Math.ceil(world.powers[k])}s`; return s; });
      if (world.phaseT > 0) { const s = document.createElement('span'); s.textContent = `Phased · ${Math.ceil(world.phaseT)}s`; chips.push(s); }
      $('powers').replaceChildren(...chips);
    }

    // the capital ship
    const b = world.command.boss, bar = $('bossbar');
    bar.classList.toggle('on', !!b);
    if (b) {
      bar.classList.toggle('cloaked', b.cloak > 0.5);
      bar.classList.toggle('inbound', b.arriving);
      $('boss-name').textContent = b.name;
      $('boss-hp').style.width = `${Math.max(0, (b.hp / b.maxHp) * 100)}%`;
      const d = Math.hypot(b.x - world.ship.x, b.z - world.ship.z);
      $('boss-fuse').textContent = b.arriving ? `Inbound · ${range(d)}` : b.leaving ? 'Breaking off' : `${b.faction} capital ship · phase ${b.phase + 1}/3 · ${Math.ceil(b.fuse)}s`;
    }

    // a sector event's objective
    const e = world.encounter, obj = $('objective');
    obj.classList.toggle('on', !!e && !e.done);
    if (e && !e.done) {
      const def = ENCOUNTERS[e.id];
      const left = Math.max(0, Math.ceil(e.dur - e.t));
      $('obj-t').textContent = def.name;
      const p = e.id === 'distress' || e.id === 'derelict' || e.id === 'convoy' ? e.progress : 1 - e.t / e.dur;
      $('obj-p').style.width = `${Math.round(clamp(p, 0, 1) * 100)}%`;
      const d = Math.hypot(e.x - world.ship.x, e.z - world.ship.z);
      const inside = d < e.r;
      $('obj-s').textContent = e.id === 'distress' ? (inside ? `Holding · ${left}s left` : `Reach the beacon · ${range(d)} · ${left}s`)
        : e.id === 'derelict' ? (inside ? 'Salvaging…' : `Close to salvage · ${range(d)}`)
        : e.id === 'convoy' ? `${Math.round(e.progress * 3)}/3 freighters · ${left}s`
        : e.id === 'anomaly' ? `Keep clear of the core · ${left}s` : `${left}s`;
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

  /** The box on the current target, brackets on the rest, the reticle and the objective. */
  private updateTargets(world: World, sector: Sector): void {
    const s = sector.shipNow;
    const ahead = sector.project(s.x + Math.cos(s.heading) * 30, 0.4, s.z - Math.sin(s.heading) * 30);
    const ret = $('reticle');
    ret.style.display = ahead && world.alive ? '' : 'none';
    if (ahead) ret.style.transform = `translate(${ahead.x}px, ${ahead.y}px)`;

    const tracked: Tracked[] = world.aliens.filter((a) => !cloaked(a)).map((a) => ({ id: a.id, x: a.x, y: a.y, z: a.z, r: a.r, label: alienLabel(a) }));
    const boss = world.command.boss;
    if (boss && !boss.leaving && boss.cloak < 0.5) tracked.push({ id: boss.id, x: boss.x, y: boss.y, z: boss.z, r: boss.r, label: 'Capital ship' });

    // the target: the torpedo lock if there is one, else the hull nearest the nose
    let target: Tracked | null = null;
    const locked = world.lock !== null && world.stats.torpedoes;
    if (locked) {
      target = tracked.find((t) => t.id === world.lock) ?? null;
      const rock = target ? null : world.field.find(world.lock);
      if (rock) target = { id: rock.id, x: rock.x, y: 0, z: rock.z, r: rock.r, label: rock.kind === 'basalt' ? 'Asteroid' : `${rock.kind} asteroid` };
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
    const box = target && world.alive ? this.screenBox(sector, target) : null;
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

    // the objective: a diamond on the beacon, the hulk or the well
    const e = world.encounter, om = $('objmark');
    const show = !!e && !e.done && (e.id === 'distress' || e.id === 'derelict' || e.id === 'anomaly' || e.id === 'convoy');
    const p = show ? sector.project(e!.x, 0.5, e!.z) : null;
    om.classList.toggle('on', !!p);
    if (p && e) {
      om.style.transform = `translate(${clamp(p.x, 20, innerWidth - 60)}px, ${clamp(p.y, 40, innerHeight - 30)}px) rotate(45deg)`;
      $('objmark-d').textContent = range(Math.hypot(e.x - s.x, e.z - s.z));
      ($('objmark-d') as HTMLElement).style.transform = 'rotate(-45deg)';
    }
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
    const blind = world.sensorsDown;
    const reach = blind ? RADAR_RANGE * 0.45 : RADAR_RANGE;
    const W = c.width, C = W / 2, dpr = W / Math.max(1, c.clientWidth), R = C - 11 * dpr, k = R / reach;
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
    const ROCK_DOT: Record<string, string> = { basalt: 'rgba(236,230,225,.32)', iron: 'rgba(170,175,185,.45)', rich: 'rgba(199,125,255,.85)', volatile: 'rgba(255,120,60,.8)', rare: '#ffd36a' };
    for (const r of world.field.rocks) {
      const [x, y, out] = to(r.x, r.z);
      if (out && r.kind !== 'rare') continue;
      g.fillStyle = ROCK_DOT[r.kind] ?? ROCK_DOT.basalt!;
      g.beginPath(); g.arc(x, y, Math.max((r.kind === 'rare' ? 2.6 : 1.2) * dpr, r.r * k), 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(199,125,255,.9)';
    for (const p of world.pickups) { if (p.kind !== 'crystal') continue; const [x, y, out] = to(p.x, p.z); if (!out) g.fillRect(x - 0.8 * dpr, y - 0.8 * dpr, 1.6 * dpr, 1.6 * dpr); }
    g.fillStyle = 'rgba(255,59,48,.2)';
    for (const w of world.webs) { const [x, y] = to(w.x, w.z); g.beginPath(); g.arc(x, y, w.r * k, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(255,178,63,.6)'; g.lineWidth = 1 * dpr;
    for (const st of world.strikes) { const [x, y, out] = to(st.x, st.z); if (!out) { g.beginPath(); g.arc(x, y, Math.max(2 * dpr, st.r * k), 0, Math.PI * 2); g.stroke(); } }
    g.fillStyle = 'rgba(255,178,63,.8)';
    for (const m of world.sys.mines) { const [x, y, out] = to(m.x, m.z); if (!out) g.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr); }
    for (const a of world.aliens) {
      if (cloaked(a)) continue;
      const [x, y, out] = to(a.x, a.z);
      g.fillStyle = out ? 'rgba(255,59,48,.5)' : a.elite ? '#ffb23f' : a.kind === 'freighter' ? '#f0a848' : '#ff3b30';
      g.save(); g.translate(x, y); g.rotate(-(a.face - h));
      const sz = (ALIEN_TYPES[a.kind].role === 'cruiser' || a.kind === 'freighter' ? 5 : 3.6) * dpr;
      g.beginPath(); g.moveTo(sz * 1.3, 0); g.lineTo(-sz, sz); g.lineTo(-sz, -sz); g.closePath(); g.fill();
      g.restore();
    }
    const b = world.command.boss;
    if (b && b.cloak < 0.5) {
      const [x, y] = to(b.x, b.z);
      g.strokeStyle = '#ff3b30'; g.lineWidth = 2 * dpr;
      g.strokeRect(x - 6 * dpr, y - 6 * dpr, 12 * dpr, 12 * dpr);
    }
    g.fillStyle = 'rgba(255,170,150,.85)';
    for (const sh of world.shots) { const [x, y, out] = to(sh.x, sh.z); if (!out) g.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr); }
    for (const p of world.pickups) {
      if (p.kind === 'crystal') continue;
      const [x, y] = to(p.x, p.z);
      g.fillStyle = p.kind === 'repair' ? '#ffd08a' : '#ffffff';
      g.fillRect(x - 2 * dpr, y - 2 * dpr, 4 * dpr, 4 * dpr);
    }
    const e = world.encounter;
    if (e && !e.done && e.r > 0) {
      const [x, y] = to(e.x, e.z);
      g.strokeStyle = '#ffb23f'; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.moveTo(x, y - 5 * dpr); g.lineTo(x + 5 * dpr, y); g.lineTo(x, y + 5 * dpr); g.lineTo(x - 5 * dpr, y); g.closePath(); g.stroke();
    }
    if (blind) {
      // sensors down: static over the scope
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(236,230,225,${Math.random() * 0.25})`;
        g.fillRect(Math.random() * W, Math.random() * W, 1.5 * dpr, 1.5 * dpr);
      }
    }
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
