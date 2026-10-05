import { clamp } from '../core/math';
import type { SystemKind } from '../content/systems';
import type { Branch } from '../content/upgrades';
import type { Sector } from '../render/sector';
import type { Levels } from '../sim/build';
import { ENCOUNTERS, type EncounterId } from '../sim/encounters';
import { ALIEN_TYPES, alienLabel, cloaked, FIRE_RANGE } from '../sim/enemies';
import type { GameEvent } from '../sim/events';
import { DOCK_TIME } from '../sim/breakout';
import { POWER_LABEL } from '../sim/pickups';
import { OC_MAX } from '../sim/tuning';
import type { World } from '../sim/world';
import { systemLevel } from './refit';
import { Radar } from './radar';
import { range, Targeting } from './targeting';
import { INK } from './palette';
import { num, plural, t } from '../i18n';
import { damageWord } from './panels';

// ── the HUD ───────────────────────────────────────────────────────────────
// A tactical overlay on the view in the brand's six zones, with nothing on
// it that does not earn its place while flying. It answers four questions:
// what am I doing, what is threatening me, what condition is the ship in,
// where am I.
//   upper left   · the current objective as short steps: a sector event,
//                  the Breakout's course, or Krail toward the next refit
//   upper centre · the heading, and one card: the capital ship, else the
//                  nearest pursuer (red), else the target (what it is, how
//                  far, what it yields, how much is left)
//   upper right  · ship status, a row each (icon, name, key, gauge,
//                  reading): hull, fuel, energy, core, Krail, hold, then
//                  torpedoes and mines once fitted; the score under them.
//                  Power-ups running sit below.
//   centre       · the world: the gunsight, the target's brackets and marks
//                  (ui/targeting.ts)
//   lower left   · the scope (ui/radar.ts), the contacts, the hunt, the sector
//   lower right  · the operating mode and only the keys that mode uses,
//                  the last thing that happened fading above it
// Alerts are placards that come and go. Every figure is live. Text is
// written ten times a second, the scope thirty, the world every frame.

export const FACTION_NAME: Record<string, string> = { gutter: 'Gutter', custody: 'Custody', office: 'Office', voice: 'Voice', thren: 'Thren' };
const faction = (f: string) => t(FACTION_NAME[f] ?? f);
const LOG_LINES = 1;
const LOG_LIFE = 4.5;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const ROCK_BROKEN: Record<string, string> = { basalt: 'Rock broken', iron: 'Iron rock broken', rich: 'Rich rock broken', volatile: 'Volatile rock broken', rare: 'Rare rock broken' };
const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0');
const fmt = num;

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
const KIND_NAME: Record<SystemKind, string> = {
  home: 'Kellern yards', mining: 'Mining system', port: 'Port system', transit: 'Transit', contested: 'Contested', gate: 'Gate', edge: 'The last lane',
};

/** The actions each operating mode puts under the thumb: [key, what it does]. */
type Hint = [string, string];

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
  private centreKey = '';

  constructor(onZoom: (dir: 1 | -1) => void) {
    // on a phone the scope hangs under the sector block, whose height follows what the run shows
    const sector = $('sector');
    new ResizeObserver(() => document.documentElement.style.setProperty('--sector-b', `${Math.round(sector.getBoundingClientRect().bottom)}px`)).observe(sector);
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

  /** The language changed: redraw what is only written when it changes. */
  relabel(): void {
    this.modeKey = this.contactKey = this.powerKey = this.plateKey = '';
    this.levels = null;
    this.seed = -1;
  }

  showZoom(level: number): void {
    $('zoom-v').textContent = String(level + 1);
  }

  /** Put a line on the log. Kills of the same kind in a quick run add up on one line. */
  note(world: World, line: string, cls = '', kind = '', points = 0): void {
    const last = this.log[this.log.length - 1];
    if (kind && last && last.kind === kind && world.time - last.at < 1.6) {
      last.n++; last.pts += points; last.at = world.time;
      last.text = `${t(kind === 'rock' ? '{n} rocks broken' : '{n} kills', { n: last.n })} · +${fmt(last.pts)}`;
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
        case 'rockDestroyed': this.note(world, `${t(ROCK_BROKEN[e.kind] ?? 'Rock broken')} · +${e.points}`, '', 'rock', e.points); break;
        case 'alienDestroyed': this.note(world, `${t('{name} destroyed', { name: t(e.label) })} · +${fmt(e.points)}`, 'gain', 'hull', e.points); break;
        case 'crystal': if (!world.bk) { this.gain += e.value * world.stats.xpMult; this.gainT = 1.4; } break;
        case 'ore': this.gain += e.value * world.stats.xpMult; this.gainT = 1.4; break;
        case 'rockCut': this.note(world, `${t('Cut clean')} · ${t('{n} ore', { n: e.ore })}${e.krail ? ` · ${e.krail} Krail` : ''}`, 'gain'); break;
        case 'fracture': this.note(world, t(e.kind === 'volatile' ? 'Volatile rock · it blew' : 'Rock cracked · too hot'), 'hit'); break;
        case 'holdFull': this.note(world, t('Hold full · sell at the port'), 'hit'); break;
        case 'patched': this.note(world, `${t('Plate patched')} · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'docked': this.note(world, `${t('Docked')} · ${e.name}`, 'gain'); break;
        case 'comms': this.note(world, `${t(e.slow ? 'Ambush' : 'Channel open')} · ${t(e.from)}`, e.slow ? 'hit' : undefined); break;
        case 'commsAnswer': this.note(world, t(e.text), e.won ? undefined : 'hit'); break;
        case 'jobDone': this.note(world, `${t('Job done')} · ${t(e.text)}`, 'gain'); break;
        case 'jobShort': this.note(world, `${t('Job open')} · ${t(e.text)}`, 'hit'); break;
        case 'spool': this.banner(t('Lane mouth'), t('Jump drive spooling'), t('Stay in the lane'), 1.6, 'calm'); break;
        case 'needKrail': this.banner(t('Lane mouth'), t('Not enough Krail'), t('{have} of {need} in the tank', { have: e.have, need: e.need }), 2.2, 'caution'); break;
        case 'jumped': this.banner(t('Jump'), t('Into the lane'), world.bk ? t('Bound for {dest}', { dest: t(world.bk.def.dest) }) : t('Out of the system'), 2, 'calm'); break;
        case 'pickup': this.note(world, `${t('Hull repaired')} · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'power': this.note(world, t(POWER_LABEL[e.kind]), 'gain'); break;
        case 'plasmaDown': this.note(world, t('Plasma torpedo shot down')); break;
        case 'tractor': this.note(world, t('Tractor lock · thrust away'), 'hit'); break;
        case 'bankEmpty': this.note(world, t('Laser bank low · slower fire'), 'hit'); break;
        case 'rackEmpty': this.retrigger($('sys-tp'), 'dry'); break;
        case 'shieldHit':
          this.note(world, e.left > 0 ? t('Shield took it · {n} left', { n: e.left }) : t('Shield down'), 'hit');
          this.flashHit();
          break;
        case 'shieldUp': if (e.charges >= world.stats.shieldMax) this.note(world, t('Shield up'), 'gain'); break;
        case 'regen': this.note(world, `${t('Hull regrown')} · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'damageControl': this.banner(t('Damage control'), t('Hull held'), t('One plate · two seconds of grace'), 2, 'caution'); break;
        case 'overchargeReady': this.note(world, t(document.documentElement.classList.contains('touch-ui') ? 'Core charged · tap Core' : 'Core charged · press E'), 'gain'); break;
        case 'overcharge': this.note(world, `${t('Overcharge')} · ${plural(e.hits, '{n} hit', '{n} hits')}`, 'gain'); break;
        case 'chain': this.note(world, t('Chain {n} · score ×{m}', { n: e.count, m: e.mult }), 'gain'); break;
        case 'squad': this.note(world, t('{name} inbound', { name: t(e.label) }), 'hit'); break;
        case 'levelUp': this.banner(t('Krail hold full'), `${t('Refit')} ${pad(e.refit, 2)}`, t('Pick an upgrade'), 0.9, 'gain'); break;
        case 'salvage': this.note(world, `${t('Salvage')}${e.tech ? ` · ${t('{f} tech recovered', { f: faction(e.faction) })}` : ''}`, 'gain'); break;
        case 'cloak': this.note(world, t('Cloaked · they hold fire'), 'gain'); break;
        case 'shipHit':
          this.note(world, `${t('Hull hit')} · ${damageWord(e.source)}`, 'hit');
          this.flashHit();
          this.retrigger($('sys-hull'), 'hit');
          if (e.plates === 1) this.banner(t('Alarm'), t('Hull critical'), t('One plate left'), 1.8);
          break;
        case 'bossWarn':
          this.note(world, t('{name} inbound', { name: t(e.name) }), 'hit');
          this.banner(t('Contact'), t(e.name), t(e.hails ? 'Capital ship inbound' : 'Decloaking · no hail'), 2.6, 'caution');
          break;
        case 'bossEvaded': this.note(world, t('Broke away from {name}', { name: t(e.name) })); break;
        case 'bossArrive': this.note(world, t('{name} on intercept', { name: t(e.name) }), 'hit'); break;
        case 'bossPhase': this.banner(t('Capital ship'), t(e.phase === 2 ? 'Last stand' : 'Hull buckling'), t(e.phase === 2 ? 'Everything she has left' : 'Reinforcements inbound'), 1.6); break;
        case 'bossLeft': this.note(world, t('Capital ship breaking off')); break;
        case 'captainLeft': this.note(world, t(e.text)); this.banner(t('Contact'), t(e.name), t('Turning away'), 2, 'calm'); break;
        case 'bossDestroyed':
          this.note(world, `${t('{name} destroyed', { name: t(e.name) })} · +${fmt(e.points)}`, 'gain');
          this.banner(t('Kill confirmed'), t(e.name), `+${fmt(e.points)} · ${t('battle salvage')}`, 2.4, 'calm');
          break;
        case 'sectorEvent': this.banner(t('Sector event'), t(e.name), t(e.text), 2.4, 'caution'); this.note(world, t(e.name)); break;
        case 'sectorEventEnd': this.note(world, `${t(e.name)} · ${t(e.text)}`, e.success ? 'gain' : 'hit'); break;
        case 'breach':
          this.note(world, `${t('Hull breach')} · ${t('run {n}', { n: fmt(e.score) })}`, 'hit');
          this.banner(t('Alarm'), t('Hull breach'), t('Run {n}', { n: fmt(e.score) }), 1.6);
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
      text($('sec-code'), `${t('Sector')} ${10 + (world.seed % 89)}-${String(Math.floor(world.seed / 89) % 97).padStart(2, '0')}`);
    }
    const e = world.encounter;
    if (world.bk) {
      // a sortie: the system, and who holds it
      const d = world.bk.def;
      this.seed = -1;
      text($('sec-code'), t(d.netted ? 'Netted · Custody control' : KIND_NAME[d.kind]));
      text($('sec-name'), d.name);
      return;
    }
    text($('sec-name'), t(e && !e.done ? SECTOR_NAME[e.id] : 'Asteroid field'));
  }

  // ── the rail ────────────────────────────────────────────────────────────

  private updateRail(world: World): void {
    text($('xp-l'), t(world.bk ? 'Ore' : 'Krail'));
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
    $('sys-hold').hidden = !b;
    $('vy-cells').hidden = !b;
    $('voyage').hidden = !b;
    if (!b) { $('threat').classList.remove('on'); return; }
    const v = $('voyage');
    // the tank, in the systems panel: Krail toward the jump
    const fuel = $('sys-fuel'), need = b.jumpCost;
    text($('v-fuel'), `${world.krail}/${need}`);
    $('g-fuel').style.setProperty('--v', Math.min(1, world.krail / need).toFixed(2));
    fuel.classList.toggle('ready', world.krail >= need);
    text($('lv-fuel'), t(world.krail >= need ? 'Jump' : 'Tank'));
    const ore = $('vy-ore');
    text(ore, `${world.ore}/${world.holdMax}`);
    $('g-hold').style.setProperty('--v', Math.min(1, world.ore / world.holdMax).toFixed(2));
    $('sys-hold').classList.toggle('full', world.ore >= world.holdMax);
    text($('vy-parts'), String(world.parts));
    text($('vy-chits'), String(world.chits));
    const food = $('vy-food');
    text(food, String(world.food));
    food.classList.toggle('full', world.food < 6);
    const heat = b.heat;
    text($('vy-heat'), `${t('Wanted')} ${heat < 0.3 ? 1 : heat < 0.55 ? 2 : heat < 0.8 ? 3 : 4}/4`);
    ticks($('vy-heat-t'), heat, 20, 'ceil');
    v.classList.toggle('hot', heat >= 0.8);
    // the contacts beside the scope: the two places, the nearest hostile, the nearest Krail trace
    const s = world.ship, dist = (o: { x: number; z: number }) => Math.hypot(o.x - s.x, o.z - s.z);
    let hostile: { label: string; d: number; faction: string } | null = null;
    for (const a of world.aliens) {
      if (cloaked(a)) continue;
      const d = dist(a);
      if (!hostile || d < hostile.d) hostile = { label: t(alienLabel(a)), d, faction: a.faction };
    }
    let trace = Infinity;
    for (const r of world.field.rocks) if (r.kind === 'rich' || r.kind === 'rare') trace = Math.min(trace, dist(r));
    const rows: Array<[string, number, string]> = [];
    if (hostile) rows.push([hostile.label, hostile.d, 'var(--alert)']);
    if (b.port) rows.push([b.port.name, dist(b.port), INK.teal]);
    rows.push([t(b.lane.name), dist(b.lane), 'var(--amber)']);
    if (trace < Infinity) rows.push([t('Krail trace'), trace, 'var(--violet)']);
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
    const docked = b.docks > 0, ready = world.krail >= b.jumpCost;
    const steps: Array<[string, 'done' | 'now' | '']> = [
      [`${t('Krail to jump')} · <b>${world.krail}/${b.jumpCost}</b>`, ready ? 'done' : 'now'],
      ...(b.port ? [[`${t('Dock at {port} (optional)', { port: b.port.name })}${docked ? '' : ` · <b>${range(dist(b.port))}</b>`}`, docked ? 'done' : ''] as [string, 'done' | '']] : []),
      [`${t('Reach the lane mouth')} · <b>${range(dist(b.lane))}</b>`, ready ? 'now' : ''],
      // jobs taken on comms cards, paid where they say
      ...world.jobs.map((j): [string, ''] => [`${t('Job')} · ${t(j.text)}`, '']),
    ];
    const html = steps.map(([t, c]) => `<li class="${c}">${t}</li>`).join('');
    // the threat card: the nearest pursuer, how close and how bad
    const th = $('threat');
    const near = hostile && hostile.d < 320 ? hostile : null;
    const thOn = !!near && world.command.state !== 'fight';
    th.classList.toggle('on', thOn);
    const cKey = `${thOn}`;
    if (cKey !== this.centreKey) { this.centreKey = cKey; this.measure(); }
    if (near) {
      const level = near.d < 45 ? 'high' : near.d < 110 ? 'medium' : 'low';
      th.classList.toggle('high', level === 'high');
      text($('th-n'), t(near.faction === 'custody' ? 'Custody patrol' : near.faction === 'gutter' ? 'Gutter crew' : 'Contact'));
      text($('th-s'), `${near.label} · ${range(near.d)}`);
      text($('th-l'), t(level === 'high' ? 'Threat high' : level === 'medium' ? 'Threat medium' : 'Threat low'));
    }
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
        text(el, n > 0 ? `${t('Lv')} ${n}` : '');
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
    if (dry) text(vb, t('Low'));
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
      text(vr, arms.rack === 0 ? `${Math.max(0, arms.reload).toFixed(1)}s` : t(locked ? 'Lock' : 'Ready'));
    }

    $('sys-fuel').hidden = !world.bk;

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
    const word = world.phaseT > 0 ? `${Math.ceil(world.phaseT)}s` : world.overload > 0 ? `${Math.ceil(world.overload)}s` : ready ? t('Ready') : '';
    vo.classList.toggle('word', !!word);
    if (word) text(vo, word);
    else if (vo.firstChild?.nodeValue !== `${Math.round(oc * 100)}` || vo.childNodes.length !== 2) vo.replaceChildren(`${Math.round(oc * 100)}`, Object.assign(document.createElement('small'), { textContent: '%' }));

    // the hull: plates, then shield charges, the one filling drawn part full
    const shields = st.shieldMax + (world.powers.shield > 0 ? 1 : 0);
    const fill = Math.round((world.shields % 1) * 10) / 10;
    const key = `${world.plates}/${st.maxPlates}/${world.shields | 0}/${fill}/${shields}`;
    if (key !== this.plateKey) {
      this.plateKey = key;
      const host = $('g-plates');
      const kids: HTMLElement[] = [];
      for (let i = 0; i < st.maxPlates; i++) { const p = document.createElement('i'); if (i < world.plates) p.className = 'on'; kids.push(p); }
      for (let i = 0; i < shields; i++) {
        const p = document.createElement('i');
        p.className = `sh${i < (world.shields | 0) || (i >= st.shieldMax && world.powers.shield > 0) ? ' on' : ''}`;
        if (i === (world.shields | 0) && i < st.shieldMax && fill > 0) p.style.setProperty('--fill', `${fill * 100}%`);
        kids.push(p);
      }
      host.replaceChildren(...kids);
      host.setAttribute('aria-label', `${t('Hull {n} of {max}', { n: world.plates, max: st.maxPlates })}${shields ? `, ${t('shields {n}', { n: world.shields | 0 })}` : ''}`);
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
      const chips = live.map((k) => chip(t(POWER_LABEL[k]), world.powers[k]));
      if (world.phaseT > 0) chips.push(chip(t('Phase cloak'), world.phaseT));
      if (world.cloakT > 0) chips.push(chip(t('Cloak'), world.cloakT));
      $('powers').replaceChildren(...chips);
    }

    // touch: each button's own gauge
    ticks($('t-bank'), bank, 10);
    $('fire').classList.toggle('dry', dry);
    ticks($('t-oc'), oc, 10);
    $('release').classList.toggle('ready', ready);

    // the panel's height places the power-ups under it, and the centre block on narrow screens
    const sysKey = `${st.torpedoes}${st.mines}${shields}${!!world.bk}`;
    if (sysKey !== this.sysKey) { this.sysKey = sysKey; this.measure(); }
  }

  // ── top centre: a capital ship, a sector event ──────────────────────────

  private updateCentre(world: World): void {
    const b = world.command.boss, boss = $('boss');
    boss.classList.toggle('on', !!b);
    if (b) {
      boss.classList.toggle('cloaked', b.cloak > 0.5);
      boss.classList.toggle('inbound', b.arriving);
      text($('boss-name'), t(b.name));
      text($('boss-cls'), t('{f} capital ship', { f: faction(b.faction) }));
      ticks($('boss-hp'), b.hp / b.maxHp, 45, 'ceil');
      const d = Math.hypot(b.x - world.ship.x, b.z - world.ship.z);
      text($('boss-hull'), b.arriving ? t('Inbound') : `${t('Hull')} ${Math.max(0, Math.round((b.hp / b.maxHp) * 100))}%`);
      text($('boss-phase'), b.arriving ? range(d) : b.leaving ? t('Breaking off') : `${t('Phase')} ${b.phase + 1}/3`);
      text($('boss-fuse'), b.arriving || b.leaving ? '' : `${t('Fuse')} ${Math.ceil(b.fuse)}s`);
    }

    const e = world.encounter, obj = $('objective');
    const bk = world.bk;
    obj.classList.toggle('on', world.alive);
    const course = !!bk && world.alive && (!e || e.done || bk.spool > 0 || bk.dockT > 0);
    const event = !!e && !e.done;
    obj.classList.toggle('course', (course && bk.spool === 0 && bk.dockT === 0 && bk.jumpT < 0) || (!bk && !event));
    obj.classList.toggle('event', event && !course);
    if (bk && course) {
      // the Breakout's course: the lane mouth, or what is happening at one of the two places
      const s = world.ship;
      const dl = Math.hypot(bk.lane.x - s.x, bk.lane.z - s.z);
      if (bk.jumpT >= 0) {
        text($('obj-t'), t('Jump')); text($('obj-left'), ''); ticks($('obj-p'), 1, 30); text($('obj-s'), t('Into the lane'));
      } else if (bk.spool > 0) {
        text($('obj-t'), t('Jump drive')); text($('obj-left'), `${Math.max(0, bk.spoolNeed - bk.spool).toFixed(1)}s`);
        ticks($('obj-p'), bk.spool / bk.spoolNeed, 30); text($('obj-s'), t('Spooling · stay in the lane'));
      } else if (bk.dockT > 0) {
        text($('obj-t'), bk.port?.name ?? ''); text($('obj-left'), '');
        ticks($('obj-p'), bk.dockT / DOCK_TIME, 30); text($('obj-s'), t('Docking clamps'));
      } else {
        text($('obj-t'), t('Make for the lane mouth')); text($('obj-left'), range(dl));
        ticks($('obj-p'), 1 - dl / bk.def.lane, 30);
        text($('obj-s'), `Krail ${world.krail}/${bk.jumpCost} · ${t(world.krail >= bk.jumpCost ? 'enough to jump' : 'cut the violet rock')}`);
      }
    } else if (e && !e.done) {
      const def = ENCOUNTERS[e.id];
      const left = Math.max(0, Math.ceil(e.dur - e.t));
      text($('obj-t'), t(def.name));
      text($('obj-left'), `${left}s`);
      const p = e.id === 'distress' || e.id === 'derelict' || e.id === 'convoy' ? e.progress : 1 - e.t / e.dur;
      ticks($('obj-p'), p, 30);
      const d = Math.hypot(e.x - world.ship.x, e.z - world.ship.z);
      const inside = d < e.r;
      text($('obj-s'), e.id === 'distress' ? (inside ? t('Holding at the beacon') : `${t('Reach the beacon')} · ${range(d)}`)
        : e.id === 'derelict' ? (inside ? t('Salvaging') : `${t('Get close to salvage')} · ${range(d)}`)
        : e.id === 'convoy' ? t('{n}/3 freighters', { n: Math.round(e.progress * 3) })
        : e.id === 'anomaly' ? t('Keep clear of the core')
        : t(def.text));
    } else if (!bk) {
      // the arcade between events: break rock, fill the hold, refit
      text($('obj-t'), t('Extract Krail'));
      text($('obj-left'), '');
      ticks($('obj-p'), world.xp / world.xpNext, 30);
      text($('obj-s'), '');
      const html = `<li class="now">${t('Break rock')} · <b>${Math.floor(world.xp)}/${world.xpNext}</b></li><li>${t('Refit {n} when full', { n: pad(world.refit + 1, 2) })}</li>`;
      const list = $('obj-list');
      if (list.innerHTML !== html) list.innerHTML = html;
    }
  }

  // ── bottom right: the mode, and the log ─────────────────────────────────

  /** What the ship is doing, in one word or two: an alert, an event, a fight, mining, or cruising. */
  private updateMode(world: World): void {
    const s = world.ship, cs = world.command.state, e = world.encounter;
    let cls = 'cruise', word = 'Cruise mode';
    if (!world.alive) { cls = 'alert'; word = 'Hull breach'; }
    else if (cs === 'fight' && world.command.boss) { cls = 'alert'; word = 'Alarm'; }
    else if (cs === 'warning' || cs === 'hailing' || cs === 'inbound') { cls = 'caution'; word = 'Contact'; }
    else if (world.aliens.some((a) => !cloaked(a) && ALIEN_TYPES[a.kind].fire !== 'none' && Math.hypot(a.x - s.x, a.z - s.z) < FIRE_RANGE * a.rgK)) { cls = 'combat'; word = 'Combat mode'; }
    else if (e && !e.done) { cls = 'caution'; word = ENCOUNTERS[e.id].name; }
    else if (world.cutting !== null || this.aim.targetKind === 'rock') { cls = 'mining'; word = 'Mining mode'; }
    // only what this mode uses, the one in use lit
    const st = world.stats, ready = world.oc >= OC_MAX;
    const hints: Hint[] = cls === 'mining'
      ? (world.bk ? [['3', 'Cut'], ['1', 'Break']] : [['1', 'Break rock']])
      : cls === 'cruise'
        ? [['W', 'Thrust'], ['Shift', 'Roll'], ['Z', 'Zoom']]
        : [['1', 'Lasers'], ...(st.torpedoes ? [['2', 'Torpedo'] as Hint] : []), ['Shift', 'Roll']];
    if (cls !== 'cruise' && ready) hints.push(['E', 'Core']);
    const lit = world.cutting !== null ? 'Cut' : ready ? 'Core' : '';
    const key = `${cls}${word}${hints.join()}${lit}`;
    if (key === this.modeKey) return;
    this.modeKey = key;
    $('mode').className = `cut ${cls}`;
    text($('mode-t'), t(word));
    $('hints').replaceChildren(...hints.map(([k, a]) => {
      const d = document.createElement('div');
      if (a === lit) d.className = 'lit';
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = t(a);
      d.append(dt, dd);
      return d;
    }));
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
