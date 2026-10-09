import { clamp } from '../core/math';
import type { SystemKind } from '../content/systems';
import type { Sector } from '../render/sector';
import { ENCOUNTERS, type EncounterId } from '../sim/encounters';
import { alienLabel, cloaked } from '../sim/enemies';
import type { GameEvent } from '../sim/events';
import { DOCK_TIME } from '../sim/breakout';
import { POWER_HINT, POWER_LABEL } from '../sim/pickups';
import { NAMED } from '../content/features';
import { REPORT_TEXT } from '../sim/space';
import type { World } from '../sim/world';
import { Radar } from './radar';
import { Heading } from './guide';
import { range, Targeting } from './targeting';
import { num, plural, t } from '../i18n';
import { damageWord } from './panels';
import { blockOf, cheapest, nodeName, quickPicks } from '../sim/bay';
import { BREAK_COOLDOWN } from '../sim/tuning';

// ── the HUD ───────────────────────────────────────────────────────────────
// The ship and the world come first; the HUD answers five questions and
// shows anything else only when it is the answer (docs/HUD.md).
//   what am I doing    · upper left: one objective, how far, and the one
//                        threat worth a line
//   where to           · upper centre: the heading tape, the objective on it;
//                        in the world, a name and a distance on the place
//   am I in danger     · the alert card under the tape (yellow: observed, red:
//                        targeted), the capital ship, the target in the brackets
//   is the ship fine   · upper right: hull, fuel, energy; munitions say more
//                        in a fight; stores in one quiet line
//   what is around me  · lower left: the scope, and the sector
// The lower right holds the last thing that happened and, when something can
// be fitted, [B] Open bay. Every figure is live. Text is written ten times a
// second, the scope thirty, the world every frame.

export const FACTION_NAME: Record<string, string> = { gutter: 'Gutter', custody: 'Custody', office: 'Office', voice: 'Voice', thren: 'Thren' };
const faction = (f: string) => t(FACTION_NAME[f] ?? f);
const LOG_LINES = 1;
const LOG_LIFE = 4.5;
/** A hostile this close (units) earns the objective a threat line. */
const THREAT_NEAR = 320;
/** Seconds before the log says again that the self-repair has started. */
const MEND_QUIET = 10;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const ROCK_BROKEN: Record<string, string> = { basalt: 'Rock broken', iron: 'Iron rock broken', rich: 'Rich rock broken', volatile: 'Volatile rock broken' };
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

/** What the top-left label calls the sector while an event is on. */
const KIND_NAME: Record<SystemKind, string> = {
  home: 'Kellern yards', mining: 'Mining system', port: 'Port system', transit: 'Transit', contested: 'Contested', gate: 'Gate', edge: 'The last lane',
};

const SECTOR_NAME: Record<EncounterId, string> = {
  rich_field: 'Mineral-rich field', distress: 'Distress call', convoy: 'Convoy lane', ion_storm: 'Ion storm', nebula: 'Nebula',
  derelict: 'Derelict hulk', anomaly: 'Spatial anomaly', skirmish: 'Skirmish',
};

export class Hud {
  private readonly radar = new Radar($<HTMLCanvasElement>('radar'));
  private readonly aim = new Targeting();
  private readonly guide = new Heading();
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
  private readonly powerFull = new Map<string, number>();
  private seed = -1;
  private modeKey = '';
  private condKey = '';
  /** The arcade's refit bay: the cheapest module in reach, and when it was last worked out. */
  private next = 0;
  private stockAt = 0;
  /** Modules that can be fitted now, and how many the badge last showed (it pulses when there are more). */
  private count = 0;
  private shown = 0;
  /** Opens the refit bay (main.ts), for the badge. */
  onBay: () => void = () => {};
  /** When the log last said the self-repair had started, so a flicker of danger does not repeat it. */
  private mendNoted = -Infinity;
  private contactKey = '';
  private centreKey = '';

  constructor() {
    // the refit bay's badge opens it, by tap or click; the flight controls behind never see the touch
    const upg = $('upg');
    upg.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this.onBay(); });
    // on a phone the scope hangs under the objective, whose height follows what the run shows
    const objective = $('objective');
    new ResizeObserver(() => document.documentElement.style.setProperty('--sector-b', `${Math.round(objective.getBoundingClientRect().bottom)}px`)).observe(objective);
  }

  /** Size the scope's backing store. The HUD needs no lift: it leaves the picture alone. */
  layout(): number {
    this.radar.layout();
    this.measure();
    return 0;
  }

  /** The language changed: redraw what is only written when it changes. */
  relabel(): void {
    this.modeKey = this.condKey = this.contactKey = this.powerKey = this.plateKey = '';
    this.seed = -1;
  }

  /** The bay would not open: say why, short, and shake the badge. */
  bayDenied(world: World, why: 'yellow' | 'red' | 'busy'): void {
    if (why === 'busy') return;
    this.note(world, t(why === 'red' ? 'Bay locked · red alert' : 'Bay locked · yellow alert'), 'hit');
    this.retrigger($('upg'), 'deny');
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
        case 'bulwarkBroken': this.note(world, `${t('Bulwark shattered')} · +${e.points}`, '', 'rock', e.points); break;
        case 'alienDestroyed': this.note(world, `${t('{name} destroyed', { name: t(e.label) })} · +${fmt(e.points)}`, 'gain', 'hull', e.points); break;
        case 'crystal': this.gain += e.value * world.stats.xpMult; this.gainT = 1.4; break;
        case 'ore': this.gain += e.value * world.stats.xpMult; this.gainT = 1.4; break;
        case 'rockCut': this.note(world, `${t('Cut clean')} · ${t('{n} ore', { n: e.ore })}${e.cyrite ? ` · ${e.cyrite} Cyrite` : ''}`, 'gain'); break;
        case 'fracture': this.note(world, t(e.kind === 'volatile' ? 'Volatile rock · it blew' : 'Rock cracked · too hot'), 'hit'); break;
        case 'holdFull': this.note(world, t('Hold full · sell at the port'), 'hit'); break;
        case 'patched': this.note(world, `${t('Plate patched')} · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'docked': this.note(world, `${t('Docked')} · ${e.name}`, 'gain'); break;
        case 'comms': this.note(world, `${t(e.slow ? 'Ambush' : 'Channel open')} · ${t(e.from)}`, e.slow ? 'hit' : undefined); break;
        case 'commsAnswer': this.note(world, t(e.text), e.won ? undefined : 'hit'); break;
        case 'jobDone': this.note(world, `${t('Job done')} · ${t(e.text)}`, 'gain'); break;
        case 'jobShort': this.note(world, `${t('Job open')} · ${t(e.text)}`, 'hit'); break;
        case 'spool': this.banner(t('Lane mouth'), t('Jump drive spooling'), t('Stay in the lane'), 1.6, 'calm'); break;
        case 'needCyrite': this.banner(t('Ship system'), t('Not enough Cyrite'), t('{have} of {need} in the tank', { have: e.have, need: e.need }), 2.2, 'caution'); break;
        case 'jumped': this.banner(t('Jump'), t('Into the lane'), world.bk ? t('Bound for {dest}', { dest: t(world.bk.def.dest) }) : t('Out of the system'), 2, 'calm'); break;
        case 'pickup': this.note(world, `${t('Hull repaired')} · ${e.plates}/${world.stats.maxPlates}`, 'gain'); break;
        case 'power': this.note(world, `${t(POWER_LABEL[e.kind])} · ${t(POWER_HINT[e.kind])}`, 'gain'); break;
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
        case 'mendStart': if (world.time - this.mendNoted > MEND_QUIET) { this.mendNoted = world.time; this.note(world, t('Self-repair under way')); } break;
        case 'mended': this.note(world, `${t('Hull mended')} · ${e.plates}/${world.stats.maxPlates}`, 'gain'); this.retrigger($('sys-hull'), 'mended'); break;
        case 'contacts': this.note(world, plural(e.n, '{n} contact inbound', '{n} contacts inbound'), 'hit'); break;
        case 'quiet': this.note(world, t('Sector quiet'), 'gain'); break;
        case 'noticed': {
          const al = world.aliens.find((a) => a.id === e.id);
          if (al) this.note(world, t('{name} has seen you', { name: alienLabel(al) }), 'hit');
          break;
        }
        case 'damageControl': this.banner(t('Ship system'), t('Hull held'), t('One plate · two seconds of grace'), 2, 'caution'); break;
        case 'chain': this.note(world, t('Chain {n} · score ×{m}', { n: e.count, m: e.mult }), 'gain'); break;
        case 'squad': this.note(world, t('{name} inbound', { name: t(e.label) }), 'hit'); break;
        case 'salvage': this.note(world, `${t('Salvage')}${e.tech ? ` · ${t('{f} tech recovered', { f: faction(e.faction) })}` : ''}`, 'gain'); break;
        case 'cloak': this.note(world, t('Cloaked · they hold fire'), 'gain'); break;
        case 'shipHit':
          this.note(world, `${t('Hull hit')} · ${damageWord(e.source)}`, 'hit');
          this.flashHit();
          this.retrigger($('sys-hull'), 'hit');
          if (e.plates === 1) this.banner(t('Warning'), t('Hull critical'), t('One plate left'), 1.8);
          break;
        case 'bossWarn':
          this.note(world, t('{name} inbound', { name: t(e.name) }), 'hit');
          this.banner(t(e.hails ? 'Continuance signal' : 'Contact'), t(e.name), t(e.hails ? 'Capital ship inbound' : 'Decloaking · no hail'), 2.6, e.hails ? 'caution corp' : 'caution');
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
    // the heading tape, with the objective on it; it also says whether this is travel or a fight
    this.guide.update(world, sector.shipNow.heading, dt);
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
    this.updateStock(world);
    this.updateVoyage(world);
    this.updateSystems(world);
    this.updateCentre(world);
    this.updateMode(world);
    this.updateCond(world);
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

  // ── the stores, and the bay's prompt ────────────────────────────────────

  /**
   * Krail is the stock for the refit bay, in both modes. In the Story, [B] Open
   * bay shows only once something can be fitted (the Arcade bay opens by
   * itself); under an alert it stays, locked, and says why.
   */
  private updateStock(world: World): void {
    if (world.time >= this.stockAt) {
      this.stockAt = world.time + 0.4;
      const ctx = world.bayCtx();
      this.next = cheapest(ctx)?.cost ?? 0;
      // the prompt counts the bay's suggestions you can pay for: a few, never a list to read
      this.count = quickPicks(ctx).filter((w) => blockOf(w.id, ctx) === null).length;
    }
    const n = this.count;
    const alert = world.alert(), locked = alert !== 'clear';
    text($('xp-v'), String(Math.floor(world.krail)));
    const badge = $('upg');
    badge.hidden = !world.bk || n === 0;
    badge.classList.toggle('ready', n > 0 && !locked);
    badge.classList.toggle('locked', n > 0 && locked);
    badge.classList.toggle('red', alert === 'red');
    text($('upg-n'), n ? String(n) : '');
    text($('upg-t'), t(n > 0 && locked ? 'Bay locked' : 'Open bay'));
    text($('upg-s'), t(n > 0 && locked ? (alert === 'red' ? 'Red alert' : 'Yellow alert') : 'Upgrade ship'));
    if (n > this.shown && !locked) this.retrigger(badge, 'new');
    this.shown = n;
    const g = $('xp-gain');
    g.classList.toggle('on', this.gainT > 0.6);
    if (this.gain > 0) text(g, `+${Math.round(this.gain)}`);
  }

  // ── the Story's stores, the tank, and the threat worth a line ───────────

  private updateVoyage(world: World): void {
    const b = world.bk;
    $('vy-cells').hidden = !b;
    $('sys-score').hidden = !!b;
    const th = $('obj-threat');
    if (!b) { th.hidden = true; return; }
    // the tank, in the status panel: Cyrite toward the jump
    const fuel = $('sys-fuel'), need = b.jumpCost;
    text($('v-fuel'), `${world.cyrite}/${need}`);
    $('g-fuel').style.setProperty('--v', Math.min(1, world.cyrite / need).toFixed(2));
    fuel.classList.toggle('ready', world.cyrite >= need);
    // the stores: hold, parts, chits, food, one line
    const ore = $('vy-ore');
    text(ore, `${world.ore}/${world.holdMax}`);
    ore.classList.toggle('full', world.ore >= world.holdMax);
    text($('vy-parts'), String(world.parts));
    text($('vy-chits'), String(world.chits));
    const food = $('vy-food');
    text(food, String(world.food));
    food.classList.toggle('full', world.food < 6);
    // the objective's threat line: the nearest hostile when it is close, else how hard the Custody is looking
    const s = world.ship;
    let hostile: { label: string; d: number; faction: string } | null = null;
    for (const a of world.aliens) {
      if (cloaked(a) || a.kind === 'freighter') continue;
      const d = Math.hypot(a.x - s.x, a.z - s.z);
      if (!hostile || d < hostile.d) hostile = { label: t(alienLabel(a)), d, faction: a.faction };
    }
    const near = hostile && hostile.d < THREAT_NEAR ? hostile : null;
    const heat = b.heat, level = heat < 0.3 ? 1 : heat < 0.55 ? 2 : heat < 0.8 ? 3 : 4;
    const line = near ? `${t(near.faction === 'custody' ? 'Custody patrol' : near.faction === 'gutter' ? 'Gutter crew' : 'Contact')} · ${range(near.d)}`
      : level >= 3 ? `${t('Wanted')} ${level}/4` : '';
    th.hidden = !line;
    text(th, line);
    th.classList.toggle('hot', level >= 4 || (!!near && near.d < 110));
    const cKey = `${!!line}`;
    if (cKey !== this.centreKey) { this.centreKey = cKey; this.measure(); }

    // touch: the cutter's heat in the rock under the beam
    const r = world.field.find(world.cutting);
    const h = r?.heat ?? 0;
    ticks($('t-heat'), h, 10);
    $('cut').classList.toggle('hot', h > 0.8);
    // touch: the break's recharge fills the button's gauge back up
    const brkReady = 1 - world.ship.breakCooldown / BREAK_COOLDOWN;
    ticks($('t-brk'), brkReady, 5);
    $('brk').classList.toggle('wait', world.ship.breakCooldown > 0);
  }

  // ── top right: ship systems ─────────────────────────────────────────────

  private updateSystems(world: World): void {
    const st = world.stats, arms = world.arms;

    // lasers: the bank
    const bank = arms.bank / st.bankMax, hot = world.powers.rapid > 0;
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
      // out of a fight a full rack is only a quiet line
      tp.classList.toggle('idle', !this.guide.fighting && arms.rack === st.torpRack && !locked);
      text(vr, arms.rack === 0 ? `${Math.max(0, arms.reload).toFixed(1)}s` : t(locked ? 'Lock' : 'Ready'));
    }

    $('sys-fuel').hidden = !world.bk;

    // mines: laid by themselves, out of a rack
    const mn = $('sys-mn');
    mn.hidden = !st.mines;
    if (st.mines) {
      blocks($('g-mines'), st.mineMax).forEach((p, i) => p.classList.toggle('on', i < world.sys.mines.length));
      text($('v-mines'), `${world.sys.mines.length}/${st.mineMax}`);
      mn.classList.toggle('idle', !this.guide.fighting);
    }

    // the hull: plates, then shield charges, the one filling drawn part full;
    // in the arcade the plate the self-repair is on fills too, and pulses while it works
    const shields = st.shieldMax + (world.powers.shield > 0 ? 1 : 0);
    const fill = Math.round((world.shields % 1) * 10) / 10;
    const mend = world.bk ? null : world.mend;
    const mendFill = mend ? Math.round(mend.progress * 20) / 20 : 0;
    const mending = mend?.state === 'repairing';
    const key = `${world.plates}/${st.maxPlates}/${world.shields | 0}/${fill}/${shields}/${mendFill}/${mending}`;
    if (key !== this.plateKey) {
      this.plateKey = key;
      const host = $('g-plates');
      const kids: HTMLElement[] = [];
      for (let i = 0; i < st.maxPlates; i++) {
        const p = document.createElement('i');
        if (i < world.plates) p.className = 'on';
        else if (i === world.plates && (mendFill > 0 || mending)) {
          p.className = mending ? 'mend live' : 'mend';
          p.style.setProperty('--fill', `${mendFill * 100}%`);
        }
        kids.push(p);
      }
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
    $('sys-hull').classList.toggle('mending', mending);
    $('vignette').classList.toggle('critical', world.plates <= 1 && world.alive);

    // score and the chain
    text($('score'), pad(world.score, 6));
    const chain = $('chain');
    chain.classList.toggle('on', world.chain >= 2);
    if (world.chain >= 2) {
      text($('chain-n'), String(world.chain));
      text($('chain-x'), `×${world.chainMult}`);
    }

    // boosters running
    const live = (Object.keys(world.powers) as Array<keyof typeof world.powers>).filter((k) => world.powers[k] > 0);
    const pk = live.map((k) => `${k}${Math.ceil(world.powers[k])}`).join()
      + (world.cloakT > 0 ? `cloak${Math.ceil(world.cloakT)}` : '');
    if (pk !== this.powerKey) {
      this.powerKey = pk;
      // a chip each: name, seconds left and a bar that drains (its full length is the longest it has been seen)
      const chip = (id: string, label: string, secs: number) => {
        const full = Math.max(this.powerFull.get(id) ?? 0, secs);
        this.powerFull.set(id, full);
        const s = document.createElement('span');
        const b = document.createElement('b');
        b.textContent = `${Math.ceil(secs)}s`;
        const bar = document.createElement('i');
        bar.style.setProperty('--left', String(Math.min(1, secs / full)));
        s.dataset.power = id;
        s.append(label, b, bar);
        return s;
      };
      for (const id of [...this.powerFull.keys()]) if (!live.includes(id as never) && !(id === 'cloak' && world.cloakT > 0)) this.powerFull.delete(id);
      const chips = live.map((k) => chip(k, t(POWER_LABEL[k]), world.powers[k]));
      if (world.cloakT > 0) chips.push(chip('cloak', t('Cloak'), world.cloakT));
      $('powers').replaceChildren(...chips);
    }
    // the bars drain smoothly between the whole seconds
    for (const c of Array.from($('powers').children) as HTMLElement[]) {
      const id = c.dataset.power!, left = id === 'cloak' ? world.cloakT : world.powers[id as keyof typeof world.powers];
      (c.lastElementChild as HTMLElement).style.setProperty('--left', String(Math.min(1, left / (this.powerFull.get(id) || 1))));
    }

    // touch: each button's own gauge
    ticks($('t-bank'), bank, 10);
    $('fire').classList.toggle('dry', dry);

    // the panel's height places the boosters under it, and the centre block on narrow screens
    const sysKey = `${st.torpedoes}${st.mines}${shields}${!!world.bk}`;
    if (sysKey !== this.sysKey) { this.sysKey = sysKey; this.measure(); }
  }

  // ── top centre: a capital ship; top left: the objective ──────────────────────────

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
        // the one thing to do now, and at most two quiet lines under it
        const ready = world.cyrite >= bk.jumpCost;
        text($('obj-t'), t(ready ? 'Make for the lane mouth' : 'Cyrite to jump'));
        text($('obj-left'), ready ? range(dl) : `${world.cyrite}/${bk.jumpCost}`);
        ticks($('obj-p'), 1 - dl / bk.def.lane, 30);
        text($('obj-s'), '');
        const lines: string[] = [];
        if (!ready) lines.push(`${t('Reach the lane mouth')} · <b>${range(dl)}</b>`);
        for (const j of world.jobs) lines.push(`${t('Job')} · ${t(j.text)}`);
        if (bk.port && bk.docks === 0) lines.push(`${t('Dock at {port} (optional)', { port: bk.port.name })} · <b>${range(Math.hypot(bk.port.x - s.x, bk.port.z - s.z))}</b>`);
        const html = lines.slice(0, 2).map((l) => `<li>${l}</li>`).join('');
        const list = $('obj-list');
        if (list.innerHTML !== html) list.innerHTML = html;
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
      // the arcade between events: break rock toward the next refit, which opens by itself
      text($('obj-t'), t('Extract Krail'));
      text($('obj-left'), `${Math.floor(world.krail)}/${this.next || '—'}`);
      ticks($('obj-p'), this.next ? Math.min(1, world.krail / this.next) : 1, 30);
      text($('obj-s'), '');
      const list = $('obj-list');
      if (list.innerHTML) list.innerHTML = '';
    }
  }

  // ── bottom right: the mode, and the log ─────────────────────────────────

  /**
   * The ship's alert (World.alert), the same test the refit bay opens on:
   * clear shows nothing at all; yellow alert when you are being observed
   * (hulls near or looking you over); red alert when you are being directly
   * targeted.
   */
  private updateMode(world: World): void {
    const a = world.alert();
    const word = !world.alive ? 'Hull breach' : a === 'red' ? 'Red alert' : 'Yellow alert';
    const key = `${a}${word}`;
    if (key === this.modeKey) return;
    this.modeKey = key;
    const mode = $('mode');
    mode.className = `glass ${a}`;
    mode.hidden = a === 'clear';
    text($('mode-t'), t(word));
    text($('mode-s'), t(a === 'red' ? 'You are being targeted' : 'You are being observed'));
    // a step up or down lights the card once, so a change is seen and not only read
    if (a !== 'clear') this.retrigger(mode, 'enter');
  }

  /** The place's effects on the ship, in the ship's words: nothing for what only looks like something. */
  private updateCond(world: World): void {
    const key = (world.siteHere ?? '') + world.conditions.map((c) => c.kind).join();
    if (key === this.condKey) return;
    this.condKey = key;
    const el = $('cond');
    el.hidden = !key;
    const lines = [...(world.siteHere ? [NAMED[world.siteHere]!.name] : []), ...world.conditions.map((c) => REPORT_TEXT[c.kind])];
    el.replaceChildren(...lines.map((l) => { const d = document.createElement('div'); d.textContent = t(l); return d; }));
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
    const h = $('systems').offsetHeight;
    if (h) $('hud').style.setProperty('--sys-h', `${h}px`);
    this.aim.layout([$('systems'), $('sensors'), $('objective'), $('log'), $('centre'), $('fire'), $('torp')]);
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
