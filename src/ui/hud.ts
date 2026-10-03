import { clamp } from '../core/math';
import type { Branch } from '../content/upgrades';
import type { Sector } from '../render/sector';
import { identity, type Levels } from '../sim/build';
import { ENCOUNTERS } from '../sim/encounters';
import type { GameEvent } from '../sim/events';
import { POWER_LABEL } from '../sim/pickups';
import { OC_MAX } from '../sim/tuning';
import { POINTS_PER_REFIT } from '../sim/web';
import type { World } from '../sim/world';
import { systemLevel } from './loadout';
import { Radar } from './radar';
import { range, Targeting } from './targeting';

// ── the HUD ───────────────────────────────────────────────────────────────
// A tactical overlay on the view, as in the reference frames, with nothing
// on it that does not earn its place while flying:
//   top edge     · the refit rail: dilithium toward the next refit, violet,
//                  and the refit web's banked points (R or a tap opens it)
//   top right    · ship systems, one panel: the build's name; phasers, then
//                  torpedoes and mines once they are fitted, and the warp
//                  core, each with its key, a gauge, a reading and the level
//                  the refits have taken it to; then the hull (plates and
//                  shield charges), the score and the chain. Power-ups
//                  running sit under it.
//   top centre   · a capital ship (hull with phase notches, fuse), or a
//                  sector event's objective
//   in the world · the gunsight, the target and marks (ui/targeting.ts)
//   bottom left  · the sensor scope (ui/radar.ts)
//   bottom right · the last two things that happened, fading
// Alerts are placards that come and go. Every figure is live. Text is
// written ten times a second, the scope thirty, the world every frame.

const FACTION_NAME: Record<string, string> = { klingon: 'Klingon', cardassian: 'Cardassian', romulan: 'Romulan', borg: 'Borg', tholian: 'Tholian' };
const LOG_LINES = 2;
const LOG_LIFE = 4.5;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0');
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** Set a node's text only when it changed. */
function text(el: HTMLElement, t: string): void {
  if (el.textContent !== t) el.textContent = t;
}
/** A tick meter's fill, rounded to whole ticks. */
function ticks(el: HTMLElement, v: number, n: number, round: 'floor' | 'ceil' = 'floor'): void {
  const q = String(Math[round](clamp(v, 0, 1) * n) / n);
  if (el.style.getPropertyValue('--v') !== q) el.style.setProperty('--v', q);
}
/** Rebuild a row of blocks when the count changes. */
function blocks(host: HTMLElement, n: number): HTMLElement[] {
  if (host.children.length !== n) host.replaceChildren(...Array.from({ length: n }, () => document.createElement('i')));
  return [...host.children] as HTMLElement[];
}

interface LogLine { el: HTMLParagraphElement; text: string; at: number; kind: string; n: number; pts: number; }

/** The rows that carry a system level, and the branch each one reads. */
const ROWS: Array<{ id: string; branch: Branch }> = [
  { id: 'ph', branch: 'phaser' },
  { id: 'tp', branch: 'torpedo' },
  { id: 'mn', branch: 'mine' },
  { id: 'oc', branch: 'overcharge' },
];

export class Hud {
  private readonly radar = new Radar($<HTMLCanvasElement>('radar'));
  private readonly aim = new Targeting();
  private readonly log: LogLine[] = [];
  private textClock = 1;
  private measureClock = 0;
  private radarClock = 1;
  private bannerT = 0;
  private gain = 0;
  private gainT = 0;
  private plateKey = '';
  private sysKey = '';
  private powerKey = '';
  private levels: Levels | null = null;
  private lv: Record<string, number> = {};
  private title = '';

  constructor(onZoom: (dir: 1 | -1) => void) {
    for (const [id, dir] of [['zoom-in', -1], ['zoom-out', 1]] as const) {
      const b = $(id);
      b.addEventListener('click', () => onZoom(dir));
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
  }

  /** Size the scope's backing store. The HUD needs no lift: it leaves the picture alone. */
  layout(): number {
    this.radar.layout();
    this.measure();
    return 0;
  }

  showZoom(level: number): void {
    $('zoom-v').textContent = String(level + 1);
  }

  /** Put a line on the log. Kills of the same kind in a quick run add up on one line. */
  note(world: World, line: string, cls = '', kind = '', points = 0): void {
    const last = this.log[this.log.length - 1];
    if (kind && last && last.kind === kind && world.time - last.at < 1.6) {
      last.n++; last.pts += points; last.at = world.time;
      last.text = `${last.n} ${kind === 'rock' ? 'rocks broken' : 'kills'} · +${fmt(last.pts)}`;
      (last.el.lastChild as HTMLElement).textContent = last.text;
      last.el.classList.remove('old', 'gone');
      return;
    }
    const el = document.createElement('p');
    el.className = `new ${cls}`;
    const span = document.createElement('span');
    span.textContent = line;
    el.append(span);
    $('log-lines').append(el);
    this.log.push({ el, text: line, at: world.time, kind, n: 1, pts: points });
    while (this.log.length > LOG_LINES) this.log.shift()!.el.remove();
  }

  events(evts: GameEvent[], world: World): void {
    for (const e of evts) {
      switch (e.type) {
        case 'rockDestroyed': this.note(world, `${e.kind === 'basalt' ? 'Rock' : `${e.kind} rock`} broken · +${e.points}`, '', 'rock', e.points); break;
        case 'alienDestroyed': this.note(world, `${e.label} destroyed · +${fmt(e.points)}`, 'gain', 'hull', e.points); break;
        case 'crystal': this.gain += e.value * world.stats.xpMult; this.gainT = 1.4; break;
        case 'pickup': this.note(world, `Hull repaired · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'power': this.note(world, `${POWER_LABEL[e.kind]}`, 'gain'); break;
        case 'plasmaDown': this.note(world, 'Plasma torpedo shot down'); break;
        case 'tractor': this.note(world, 'Tractor lock · thrust away', 'hit'); break;
        case 'bankEmpty': this.note(world, 'Phaser bank dry', 'hit'); break;
        case 'rackEmpty': this.retrigger($('sys-tp'), 'dry'); break;
        case 'shieldHit':
          this.note(world, e.left > 0 ? `Shield took it · ${e.left} left` : 'Shield down · recharging', 'hit');
          this.flashHit();
          break;
        case 'shieldUp': this.note(world, `Shield up · ${e.charges}`, 'gain'); break;
        case 'regen': this.note(world, `Hull regrown · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'damageControl': this.banner('Damage control', 'Hull held', 'One plate · two seconds of grace', 2, 'caution'); break;
        case 'overchargeReady': this.note(world, 'Warp core charged · E to release', 'gain'); break;
        case 'overcharge': this.note(world, `Overcharge released · ${e.hits} hit${e.hits === 1 ? '' : 's'}`, 'gain'); break;
        case 'chain': this.note(world, `Chain ${e.count} · score ×${e.mult}`, 'gain'); break;
        case 'squad': this.note(world, `${e.label} inbound`, 'hit'); break;
        case 'levelUp': this.banner('Dilithium hold full', `Refit ${pad(e.refit, 2)}`, `+${POINTS_PER_REFIT} points for the refit web`, 0.9, 'gain'); break;
        case 'salvage': this.note(world, `Salvage · +${e.points} web points${e.tech ? ` · ${FACTION_NAME[e.faction] ?? e.faction} tech open` : ''}`, 'gain'); break;
        case 'cloak': this.note(world, 'Cloaked · hulls hold fire', 'gain'); break;
        case 'shipHit':
          this.note(world, `Hull struck · ${e.source.split(':')[0]}`, 'hit');
          this.flashHit();
          this.retrigger($('sys-hull'), 'hit');
          if (e.plates === 1) this.banner('Red alert', 'Hull critical', 'One plate left', 1.8);
          break;
        case 'bossWarn':
          this.note(world, `${e.name} inbound`, 'hit');
          this.banner('Yellow alert', `${e.name}`, e.hails ? 'Capital ship inbound' : 'Decloaking · no hail', 2.6, 'caution');
          break;
        case 'bossEvaded': this.note(world, `Broke away from ${e.name}`); break;
        case 'bossArrive': this.note(world, `${e.name} on intercept`, 'hit'); break;
        case 'bossPhase': this.banner('Capital ship', e.phase === 2 ? 'Last stand' : 'Hull buckling', e.phase === 2 ? 'Everything she has left' : 'Reinforcements inbound', 1.6); break;
        case 'bossLeft': this.note(world, 'Capital ship breaking off'); break;
        case 'bossDestroyed':
          this.note(world, `${e.name} destroyed · +${fmt(e.points)}`, 'gain');
          this.banner('Kill confirmed', `${e.name}`, `+${fmt(e.points)} · battle salvage`, 2.4, 'calm');
          break;
        case 'sectorEvent': this.banner('Sector event', e.name, e.text, 2.4, 'caution'); this.note(world, e.name); break;
        case 'sectorEventEnd': this.note(world, `${e.name} · ${e.text}`, e.success ? 'gain' : 'hit'); break;
        case 'breach':
          this.note(world, `Hull breach · run ${fmt(e.score)}`, 'hit');
          this.banner('Red alert', 'Hull breach', `Run ${fmt(e.score)}`, 1.6);
          break;
      }
    }
  }

  update(world: World, sector: Sector, dt: number): void {
    this.aim.update(world, sector, dt);
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) $('banner').classList.remove('on');
    if (this.gainT > 0 && (this.gainT -= dt) <= 0) this.gain = 0;
    this.textClock += dt;
    if (this.textClock >= 0.1) { this.textClock = 0; this.updateText(world); }
    // the fixed blocks move with rotation, rows appearing and the touch layout: keep the target's readout clear of them
    this.measureClock += dt;
    if (this.measureClock >= 0.5) { this.measureClock = 0; this.measure(); }
    this.radarClock += dt;
    if (this.radarClock >= 1 / 30) { this.radarClock = 0; this.radar.draw(world, sector, this.aim.target); }
  }

  private updateText(world: World): void {
    this.updateRail(world);
    this.updateSystems(world);
    this.updateCentre(world);
    this.updateLog(world);
  }

  // ── the rail ────────────────────────────────────────────────────────────

  private updateRail(world: World): void {
    text($('refit-n'), pad(world.refit, 2));
    text($('xp-v'), String(Math.floor(world.xp)));
    text($('xp-n'), String(world.xpNext));
    ticks($('xp'), world.xp / world.xpNext, 60);
    $('rail').classList.toggle('full', world.celebrate > 0);
    text($('rail-pts'), String(world.points));
    $('rail-web').classList.toggle('has', world.points > 0);
    const g = $('xp-gain');
    g.classList.toggle('on', this.gainT > 0.6);
    if (this.gain > 0) text(g, `+${Math.round(this.gain)}`);
  }

  // ── top right: ship systems ─────────────────────────────────────────────

  private updateSystems(world: World): void {
    const st = world.stats, arms = world.arms;

    // the build: its name, and the level each system's refits have reached
    if (world.levels !== this.levels) {
      const first = this.levels === null;
      this.levels = world.levels;
      const title = identity(world.levels).title;
      const shown = title === 'Stock Defiant' ? 'Stock' : title;
      if (shown !== this.title) {
        this.title = shown;
        text($('ship-id'), shown);
        if (!first) this.retrigger($('ship-id'), 'new');
      }
      for (const r of ROWS) {
        const n = systemLevel(world.levels, r.branch);
        const el = $(`lv-${r.id}`);
        text(el, n > 0 ? `Lv ${n}` : '');
        if (!first && n > (this.lv[r.id] ?? 0)) this.retrigger(el, 'up');
        this.lv[r.id] = n;
      }
    }

    // phasers: the bank
    const bank = arms.bank / st.bankMax, hot = world.overload > 0 || world.powers.rapid > 0;
    const dry = arms.bank < st.bankShot && !hot;
    ticks($('g-bank'), bank, 20);
    const ph = $('sys-ph');
    ph.classList.toggle('dry', dry);
    ph.classList.toggle('low', !dry && !hot && bank < 0.25);
    ph.classList.toggle('hot', hot);
    const vb = $('v-bank');
    const pct = `${Math.round(bank * 100)}`;
    if (dry) text(vb, 'Dry');
    else if (vb.firstChild?.nodeValue !== pct || vb.childNodes.length !== 2) vb.replaceChildren(pct, Object.assign(document.createElement('small'), { textContent: '%' }));

    // torpedoes: the rack, the next round filling as it reloads, and the lock
    const tp = $('sys-tp'), vr = $('v-rack');
    tp.hidden = !st.torpedoes;
    document.documentElement.classList.toggle('has-torps', st.torpedoes);
    const rack = blocks($('g-rack'), st.torpedoes ? st.torpRack : 0);
    const touchRack = blocks($('t-rack'), st.torpedoes ? st.torpRack : 0);
    if (st.torpedoes) {
      const fill = arms.rack < st.torpRack ? clamp(1 - arms.reload / st.torpReload, 0, 1) : 0;
      rack.forEach((p, i) => { p.classList.toggle('on', i < arms.rack); p.style.setProperty('--p', i === arms.rack ? fill.toFixed(2) : '0'); });
      touchRack.forEach((p, i) => p.classList.toggle('on', i < arms.rack));
      const locked = world.lock !== null;
      tp.classList.toggle('lock', locked && arms.rack > 0);
      tp.classList.toggle('empty', arms.rack === 0);
      text(vr, arms.rack === 0 ? `${Math.max(0, arms.reload).toFixed(1)}s` : locked ? 'Lock' : 'Ready');
    }

    // mines: laid by themselves, out of a rack
    const mn = $('sys-mn');
    mn.hidden = !st.mines;
    if (st.mines) {
      blocks($('g-mines'), st.mineMax).forEach((p, i) => p.classList.toggle('on', i < world.sys.mines.length));
      text($('v-mines'), `${world.sys.mines.length}/${st.mineMax}`);
    }

    // the warp core
    const oc = world.oc / OC_MAX, ready = oc >= 1;
    ticks($('g-oc'), oc, 20);
    const ocRow = $('sys-oc');
    ocRow.classList.toggle('ready', ready && world.overload <= 0);
    ocRow.classList.toggle('hot', world.overload > 0 || world.phaseT > 0);
    const vo = $('v-oc');
    const word = world.phaseT > 0 ? `${Math.ceil(world.phaseT)}s` : world.overload > 0 ? `${Math.ceil(world.overload)}s` : ready ? 'Ready' : '';
    vo.classList.toggle('word', !!word);
    if (word) text(vo, word);
    else if (vo.firstChild?.nodeValue !== `${Math.round(oc * 100)}` || vo.childNodes.length !== 2) vo.replaceChildren(`${Math.round(oc * 100)}`, Object.assign(document.createElement('small'), { textContent: '%' }));

    // the hull: plates, then shield charges
    const shields = st.shieldMax + (world.powers.shield > 0 ? 1 : 0);
    const key = `${world.plates}/${st.maxPlates}/${world.shields}/${shields}`;
    if (key !== this.plateKey) {
      this.plateKey = key;
      const host = $('g-plates');
      const kids: HTMLElement[] = [];
      for (let i = 0; i < st.maxPlates; i++) { const p = document.createElement('i'); if (i < world.plates) p.className = 'on'; kids.push(p); }
      for (let i = 0; i < shields; i++) {
        const p = document.createElement('i');
        p.className = `sh${i < world.shields || (i >= st.shieldMax && world.powers.shield > 0) ? ' on' : ''}`;
        kids.push(p);
      }
      host.replaceChildren(...kids);
      host.setAttribute('aria-label', `Hull ${world.plates} of ${st.maxPlates}${shields ? `, shields ${world.shields}` : ''}`);
      text($('v-hull'), `${world.plates}/${st.maxPlates}`);
    }
    $('sys-hull').classList.toggle('crit', world.plates <= 1 && world.alive);
    $('vignette').classList.toggle('critical', world.plates <= 1 && world.alive);

    // score and the chain
    text($('score'), pad(world.score, 6));
    const chain = $('chain');
    chain.classList.toggle('on', world.chain >= 2);
    if (world.chain >= 2) {
      text($('chain-n'), String(world.chain));
      text($('chain-x'), `×${world.chainMult}`);
      ticks($('chain-t'), world.chainLeft, 10, 'ceil');
    }

    // power-ups running
    const live = (Object.keys(world.powers) as Array<keyof typeof world.powers>).filter((k) => world.powers[k] > 0);
    const pk = live.map((k) => `${k}${Math.ceil(world.powers[k])}`).join() + (world.phaseT > 0 ? `phase${Math.ceil(world.phaseT)}` : '')
      + (world.cloakT > 0 ? `cloak${Math.ceil(world.cloakT)}` : '');
    if (pk !== this.powerKey) {
      this.powerKey = pk;
      const chip = (label: string, secs: number) => {
        const s = document.createElement('span');
        const b = document.createElement('b');
        b.textContent = `${Math.ceil(secs)}s`;
        s.append(label, b);
        return s;
      };
      const chips = live.map((k) => chip(POWER_LABEL[k], world.powers[k]));
      if (world.phaseT > 0) chips.push(chip('Phase cloak', world.phaseT));
      if (world.cloakT > 0) chips.push(chip('Cloak', world.cloakT));
      $('powers').replaceChildren(...chips);
    }

    // touch: each button's own gauge
    ticks($('t-bank'), bank, 10);
    $('fire').classList.toggle('dry', dry);
    ticks($('t-oc'), oc, 10);
    $('release').classList.toggle('ready', ready);

    // the panel's height places the power-ups under it, and the centre block on narrow screens
    const sysKey = `${st.torpedoes}${st.mines}${shields}`;
    if (sysKey !== this.sysKey) { this.sysKey = sysKey; this.measure(); }
  }

  // ── top centre: a capital ship, a sector event ──────────────────────────

  private updateCentre(world: World): void {
    const b = world.command.boss, boss = $('boss');
    boss.classList.toggle('on', !!b);
    if (b) {
      boss.classList.toggle('cloaked', b.cloak > 0.5);
      boss.classList.toggle('inbound', b.arriving);
      text($('boss-name'), b.name);
      text($('boss-cls'), `${b.faction} capital ship`);
      ticks($('boss-hp'), b.hp / b.maxHp, 45, 'ceil');
      const d = Math.hypot(b.x - world.ship.x, b.z - world.ship.z);
      text($('boss-hull'), b.arriving ? 'Inbound' : `Hull ${Math.max(0, Math.round((b.hp / b.maxHp) * 100))}%`);
      text($('boss-phase'), b.arriving ? range(d) : b.leaving ? 'Breaking off' : `Phase ${b.phase + 1}/3`);
      text($('boss-fuse'), b.arriving || b.leaving ? '' : `Fuse ${Math.ceil(b.fuse)}s`);
    }

    const e = world.encounter, obj = $('objective');
    obj.classList.toggle('on', !!e && !e.done);
    if (e && !e.done) {
      const def = ENCOUNTERS[e.id];
      const left = Math.max(0, Math.ceil(e.dur - e.t));
      text($('obj-t'), def.name);
      text($('obj-left'), `${left}s`);
      const p = e.id === 'distress' || e.id === 'derelict' || e.id === 'convoy' ? e.progress : 1 - e.t / e.dur;
      ticks($('obj-p'), p, 30);
      const d = Math.hypot(e.x - world.ship.x, e.z - world.ship.z);
      const inside = d < e.r;
      text($('obj-s'), e.id === 'distress' ? (inside ? 'Holding at the beacon' : `Reach the beacon · ${range(d)}`)
        : e.id === 'derelict' ? (inside ? 'Salvaging' : `Close to salvage · ${range(d)}`)
        : e.id === 'convoy' ? `${Math.round(e.progress * 3)}/3 freighters`
        : e.id === 'anomaly' ? 'Keep clear of the core'
        : def.text);
    }
  }

  // ── bottom right: the log ───────────────────────────────────────────────

  private updateLog(world: World): void {
    for (const l of this.log) {
      const age = world.time - l.at;
      l.el.classList.toggle('old', age > 2.5);
      l.el.classList.toggle('gone', age > LOG_LIFE);
      if (age > 0.3) l.el.classList.remove('new');
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private measure(): void {
    const h = $('systems').offsetHeight;
    if (h) $('hud').style.setProperty('--sys-h', `${h}px`);
    this.aim.layout([$('systems'), $('sensors')]);
  }

  private retrigger(el: HTMLElement, cls: string): void {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  private flashHit(): void {
    this.retrigger($('vignette'), 'hit');
  }

  private banner(kicker: string, title: string, sub: string, secs: number, tone = ''): void {
    text($('banner-k'), kicker);
    text($('banner-t'), title);
    text($('banner-s'), sub);
    const b = $('banner');
    b.className = '';
    void b.offsetWidth;
    b.className = `on ${tone}`;
    this.bannerT = secs;
  }
}
