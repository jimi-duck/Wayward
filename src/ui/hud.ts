import { clamp } from '../core/math';
import type { Branch } from '../content/upgrades';
import type { Sector } from '../render/sector';
import type { Levels } from '../sim/build';
import { ENCOUNTERS, type EncounterId } from '../sim/encounters';
import { ALIEN_TYPES, alienLabel, cloaked, FIRE_RANGE } from '../sim/enemies';
import type { GameEvent } from '../sim/events';
import { DOCK_TIME, JUMP_COST, LANE_DIST, SPOOL } from '../sim/breakout';
import { POWER_LABEL } from '../sim/pickups';
import { OC_MAX } from '../sim/tuning';
import type { World } from '../sim/world';
import { systemLevel } from './refit';
import { Radar } from './radar';
import { range, Targeting } from './targeting';

// ── the HUD ───────────────────────────────────────────────────────────────
// A tactical overlay on the view, after the reference frame, with nothing
// on it that does not earn its place while flying:
//   top left     · the sector (and the event in it), and krail toward
//                  the next refit, violet
//   top centre   · the heading; a capital ship (hull with phase notches,
//                  fuse), or a sector event's objective
//   top right    · ship systems, one panel: lasers, then torpedoes and
//                  mines once they are fitted, each with its key, a gauge, a
//                  reading and the level the refits have taken it to; then
//                  the hull (plates and shield charges), the reactor, and
//                  the score with its chain. Power-ups running sit under it.
//   in the world · the gunsight, the target and marks (ui/targeting.ts)
//   bottom left  · the sensor scope and its range (ui/radar.ts)
//   bottom right · the mode the ship is in (cruise, mining, combat, alerts)
//                  and the last thing that happened, fading
// Alerts are placards that come and go. Every figure is live. Text is
// written ten times a second, the scope thirty, the world every frame.

const FACTION_NAME: Record<string, string> = { gutter: 'Gutter', custody: 'Custody', office: 'Office', voice: 'Voice', thren: 'Thren' };
const LOG_LINES = 1;
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
  { id: 'ph', branch: 'laser' },
  { id: 'tp', branch: 'torpedo' },
  { id: 'mn', branch: 'mine' },
];
/** What the top-left label calls the sector while an event is on. */
const SECTOR_NAME: Record<EncounterId, string> = {
  rich_field: 'Mineral-rich field', distress: 'Distress call', convoy: 'Convoy lane', ion_storm: 'Ion storm', nebula: 'Nebula',
  derelict: 'Derelict hulk', anomaly: 'Spatial anomaly',
};

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
  private seed = -1;
  private modeKey = '';
  private headingShown = true;
  private contactKey = '';

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
        case 'crystal': if (!world.bk) { this.gain += e.value * world.stats.xpMult; this.gainT = 1.4; } break;
        case 'ore': this.gain += e.value * world.stats.xpMult; this.gainT = 1.4; break;
        case 'rockCut': this.note(world, `Cut clean · ${e.ore} ore${e.krail ? ` · ${e.krail} Krail` : ''}`, 'gain'); break;
        case 'fracture': this.note(world, e.kind === 'volatile' ? 'Volatile rock · it went up' : 'Rock fractured · too hot', 'hit'); break;
        case 'holdFull': this.note(world, 'Hold full · sell at the port', 'hit'); break;
        case 'patched': this.note(world, `Plate patched from parts · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'docked': this.note(world, `Docked · ${e.name}`, 'gain'); break;
        case 'spool': this.banner('Lane mouth', 'Jump drive spooling', 'Hold inside the lane', 1.6, 'calm'); break;
        case 'needKrail': this.banner('Lane mouth', 'Not enough Krail', `${e.have} of ${e.need} in the tank`, 2.2, 'caution'); break;
        case 'jumped': this.banner('Jump', 'Into the lane', 'Out of the home system', 2, 'calm'); break;
        case 'pickup': this.note(world, `Hull repaired · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'power': this.note(world, `${POWER_LABEL[e.kind]}`, 'gain'); break;
        case 'plasmaDown': this.note(world, 'Plasma torpedo shot down'); break;
        case 'tractor': this.note(world, 'Tractor lock · thrust away', 'hit'); break;
        case 'bankEmpty': this.note(world, 'Laser bank dry', 'hit'); break;
        case 'rackEmpty': this.retrigger($('sys-tp'), 'dry'); break;
        case 'shieldHit':
          this.note(world, e.left > 0 ? `Shield took it · ${e.left} left` : 'Shield down · recharging', 'hit');
          this.flashHit();
          break;
        case 'shieldUp': this.note(world, `Shield up · ${e.charges}`, 'gain'); break;
        case 'regen': this.note(world, `Hull regrown · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'damageControl': this.banner('Damage control', 'Hull held', 'One plate · two seconds of grace', 2, 'caution'); break;
        case 'overchargeReady': this.note(world, `Reactor charged · ${document.documentElement.classList.contains('touch-ui') ? 'tap Core' : 'E'} to release`, 'gain'); break;
        case 'overcharge': this.note(world, `Overcharge released · ${e.hits} hit${e.hits === 1 ? '' : 's'}`, 'gain'); break;
        case 'chain': this.note(world, `Chain ${e.count} · score ×${e.mult}`, 'gain'); break;
        case 'squad': this.note(world, `${e.label} inbound`, 'hit'); break;
        case 'levelUp': this.banner('Krail hold full', `Refit ${pad(e.refit, 2)}`, 'Choose an upgrade', 0.9, 'gain'); break;
        case 'salvage': this.note(world, `Salvage${e.tech ? ` · ${FACTION_NAME[e.faction] ?? e.faction} tech recovered` : ''}`, 'gain'); break;
        case 'cloak': this.note(world, 'Cloaked · hulls hold fire', 'gain'); break;
        case 'shipHit':
          this.note(world, `Hull struck · ${e.source.split(':')[0]}`, 'hit');
          this.flashHit();
          this.retrigger($('sys-hull'), 'hit');
          if (e.plates === 1) this.banner('Alarm', 'Hull critical', 'One plate left', 1.8);
          break;
        case 'bossWarn':
          this.note(world, `${e.name} inbound`, 'hit');
          this.banner('Contact', `${e.name}`, e.hails ? 'Capital ship inbound' : 'Decloaking · no hail', 2.6, 'caution');
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
          this.banner('Alarm', 'Hull breach', `Run ${fmt(e.score)}`, 1.6);
          break;
      }
    }
  }

  update(world: World, sector: Sector, dt: number): void {
    this.aim.update(world, sector, dt);
    // the heading: a compass bearing (north is up the screen at the start), the tape sliding under it
    // (skipped while the layout hides it, as it does on phones: a style write a frame is not free there)
    if (this.headingShown) {
      const deg = (((90 - (sector.shipNow.heading * 180) / Math.PI) % 360) + 360) % 360;
      text($('hdg'), String(Math.round(deg) % 360).padStart(3, '0'));
      $('hdg-tape').style.setProperty('--o', `${(-deg * 2).toFixed(1)}px`);
    }
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) $('banner').classList.remove('on');
    if (this.gainT > 0 && (this.gainT -= dt) <= 0) this.gain = 0;
    this.textClock += dt;
    if (this.textClock >= 0.1) { this.textClock = 0; this.updateText(world); }
    // the fixed blocks move with rotation, rows appearing and the touch layout: keep the target's readout clear of them
    this.measureClock += dt;
    if (this.measureClock >= 0.5) { this.measureClock = 0; this.measure(); }
    this.radarClock += dt;
    if (this.radarClock >= 1 / 30) {
      this.radarClock = 0;
      this.radar.draw(world, sector, this.aim.target);
      text($('radar-r'), range(this.radar.reach(world)));
    }
  }

  private updateText(world: World): void {
    this.updateSector(world);
    this.updateRail(world);
    this.updateVoyage(world);
    this.updateSystems(world);
    this.updateCentre(world);
    this.updateMode(world);
    this.updateLog(world);
  }

  // ── top left: the sector ────────────────────────────────────────────────

  private updateSector(world: World): void {
    if (world.seed !== this.seed) {
      this.seed = world.seed;
      text($('sec-code'), `Sector ${10 + (world.seed % 89)}-${String(Math.floor(world.seed / 89) % 97).padStart(2, '0')}`);
    }
    const e = world.encounter;
    text($('sec-name'), e && !e.done ? SECTOR_NAME[e.id] : 'Asteroid field');
  }

  // ── the rail ────────────────────────────────────────────────────────────

  private updateRail(world: World): void {
    text($('xp-l'), world.bk ? 'Ore' : 'Krail');
    text($('refit-n'), pad(world.refit, 2));
    text($('xp-v'), String(Math.floor(world.xp)));
    text($('xp-n'), String(world.xpNext));
    ticks($('xp'), world.xp / world.xpNext, 30);
    $('rail').classList.toggle('full', world.celebrate > 0);
    const g = $('xp-gain');
    g.classList.toggle('on', this.gainT > 0.6);
    if (this.gain > 0) text(g, `+${Math.round(this.gain)}`);
  }

  // ── the Breakout: tank, hold, parts, chits, the Custody alert ───────────

  private updateVoyage(world: World): void {
    const b = world.bk;
    if (!b) return;
    const v = $('voyage');
    text($('vy-krail'), String(world.krail));
    text($('vy-need'), String(JUMP_COST));
    ticks($('vy-tank'), world.krail / JUMP_COST, 24);
    v.classList.toggle('ready', world.krail >= JUMP_COST);
    const ore = $('vy-ore');
    text(ore, `${world.ore}/${world.holdMax}`);
    ore.classList.toggle('full', world.ore >= world.holdMax);
    text($('vy-parts'), String(world.parts));
    text($('vy-chits'), String(world.chits));
    const heat = b.heat;
    text($('vy-heat'), `Wanted Lv ${heat < 0.3 ? 1 : heat < 0.55 ? 2 : heat < 0.8 ? 3 : 4}`);
    ticks($('vy-heat-t'), heat, 20, 'ceil');
    v.classList.toggle('hot', heat >= 0.8);
    // the contacts beside the scope: the two places, the nearest hostile, the nearest Krail trace
    const s = world.ship, dist = (o: { x: number; z: number }) => Math.hypot(o.x - s.x, o.z - s.z);
    let hostile: { label: string; d: number } | null = null;
    for (const a of world.aliens) {
      if (cloaked(a)) continue;
      const d = dist(a);
      if (!hostile || d < hostile.d) hostile = { label: alienLabel(a), d };
    }
    let trace = Infinity;
    for (const r of world.field.rocks) if (r.kind === 'rich' || r.kind === 'rare') trace = Math.min(trace, dist(r));
    const rows: Array<[string, number, string]> = [];
    if (hostile) rows.push([hostile.label, hostile.d, 'var(--alert)']);
    rows.push([b.port.name, dist(b.port), '#5ad0e3'], [b.lane.name, dist(b.lane), 'var(--amber)']);
    if (trace < Infinity) rows.push(['Krail trace', trace, 'var(--violet)']);
    const key = rows.map(([n, d]) => `${n}${Math.round(d / 10)}`).join();
    if (key !== this.contactKey) {
      this.contactKey = key;
      $('contacts-l').replaceChildren(...rows.map(([n, d, c]) => {
        const li = document.createElement('li');
        li.style.setProperty('--c', c);
        const name = document.createElement('span'); name.textContent = n;
        const v = document.createElement('b'); v.textContent = range(d);
        li.append(name, v);
        return li;
      }));
    }

    // the objective, as steps
    const docked = b.docks > 0, ready = world.krail >= JUMP_COST;
    const steps: Array<[string, 'done' | 'now' | '']> = [
      [`Krail for the jump · <b>${world.krail}/${JUMP_COST}</b>`, ready ? 'done' : 'now'],
      [`Dock at ${b.port.name}${docked ? '' : ` · <b>${range(dist(b.port))}</b>`} (optional)`, docked ? 'done' : ''],
      [`Reach the lane mouth · <b>${range(dist(b.lane))}</b>`, ready ? 'now' : ''],
    ];
    const html = steps.map(([t, c]) => `<li class="${c}">${t}</li>`).join('');
    const list = $('obj-list');
    if (list.innerHTML !== html) list.innerHTML = html;

    // touch: the cutter's heat in the rock under the beam
    const r = world.field.find(world.cutting);
    const h = r?.heat ?? 0;
    ticks($('t-heat'), h, 10);
    $('cut').classList.toggle('hot', h > 0.8);
  }

  // ── top right: ship systems ─────────────────────────────────────────────

  private updateSystems(world: World): void {
    const st = world.stats, arms = world.arms;

    // the level each system's refits have reached
    if (world.levels !== this.levels) {
      const first = this.levels === null;
      this.levels = world.levels;
      for (const r of ROWS) {
        const n = systemLevel(world.levels, r.branch);
        const el = $(`lv-${r.id}`);
        text(el, n > 0 ? `Lv ${n}` : '');
        if (!first && n > (this.lv[r.id] ?? 0)) this.retrigger(el, 'up');
        this.lv[r.id] = n;
      }
    }

    // lasers: the bank
    const bank = arms.bank / st.bankMax, hot = world.overload > 0 || world.powers.rapid > 0;
    const dry = arms.bank < st.bankShot && !hot;
    ticks($('g-bank'), bank, 50);
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

    // the reactor
    const oc = world.oc / OC_MAX, ready = oc >= 1;
    ticks($('g-oc'), oc, 12);
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
    const bk = world.bk;
    obj.classList.toggle('on', (!!e && !e.done) || (!!bk && world.alive));
    const course = !!bk && world.alive && (!e || e.done || bk.spool > 0 || bk.dockT > 0);
    obj.classList.toggle('course', course && bk.spool === 0 && bk.dockT === 0 && bk.jumpT < 0);
    if (bk && course) {
      // the Breakout's course: the lane mouth, or what is happening at one of the two places
      const s = world.ship;
      const dl = Math.hypot(bk.lane.x - s.x, bk.lane.z - s.z);
      if (bk.jumpT >= 0) {
        text($('obj-t'), 'Jump'); text($('obj-left'), ''); ticks($('obj-p'), 1, 30); text($('obj-s'), 'Into the lane');
      } else if (bk.spool > 0) {
        text($('obj-t'), 'Jump drive'); text($('obj-left'), `${Math.max(0, SPOOL - bk.spool).toFixed(1)}s`);
        ticks($('obj-p'), bk.spool / SPOOL, 30); text($('obj-s'), 'Spooling · hold inside the lane');
      } else if (bk.dockT > 0) {
        text($('obj-t'), bk.port.name); text($('obj-left'), '');
        ticks($('obj-p'), bk.dockT / DOCK_TIME, 30); text($('obj-s'), 'Docking clamps');
      } else {
        text($('obj-t'), 'Make for the lane mouth'); text($('obj-left'), range(dl));
        ticks($('obj-p'), 1 - dl / LANE_DIST, 30);
        text($('obj-s'), world.krail >= JUMP_COST ? `Krail ${world.krail}/${JUMP_COST} · enough to jump` : `Krail ${world.krail}/${JUMP_COST} · cut the violet rock`);
      }
    } else if (e && !e.done) {
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

  // ── bottom right: the mode, and the log ─────────────────────────────────

  /** What the ship is doing, in one word or two: an alert, an event, a fight, mining, or cruising. */
  private updateMode(world: World): void {
    const s = world.ship, cs = world.command.state, e = world.encounter;
    let cls = 'cruise', word = 'Cruise';
    if (!world.alive) { cls = 'alert'; word = 'Hull breach'; }
    else if (cs === 'fight' && world.command.boss) { cls = 'alert'; word = 'Alarm'; }
    else if (cs === 'warning' || cs === 'hailing' || cs === 'inbound') { cls = 'caution'; word = 'Contact'; }
    else if (world.aliens.some((a) => !cloaked(a) && ALIEN_TYPES[a.kind].fire !== 'none' && Math.hypot(a.x - s.x, a.z - s.z) < FIRE_RANGE * a.rgK)) { cls = 'combat'; word = 'Combat'; }
    else if (e && !e.done) { cls = 'caution'; word = ENCOUNTERS[e.id].name; }
    else if (world.cutting !== null) { cls = 'mining'; word = 'Cutting'; }
    else if (this.aim.targetKind === 'rock') { cls = 'mining'; word = 'Mining mode'; }
    const key = `${cls}${word}`;
    if (key === this.modeKey) return;
    this.modeKey = key;
    $('mode').className = cls;
    text($('mode-t'), word);
  }

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
    this.headingShown = $('heading').offsetWidth > 0;
    const h = $('systems').offsetHeight;
    if (h) $('hud').style.setProperty('--sys-h', `${h}px`);
    this.aim.layout([$('systems'), $('sensors'), $('sector'), $('log'), $('centre'), $('fire'), $('torp'), $('release')]);
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
