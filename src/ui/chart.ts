import { PLACES, REWARD_WORD } from '../content/phenomena';
import type { SystemKind } from '../content/systems';
import { overRatings, weightFuel } from '../sim/budgets';
import { fileLines } from '../sim/calloway';
import { QUESTIONS } from '../content/situations';
import { longIndex, situationLine } from '../sim/situations';
import { netted, placeAt, regionCount, regionDef, regionSystems, sysById, viewOf, type Place, type StarSystem } from '../sim/chart';
import { forks, gateProgress, goalOf, trouble, type Fork } from '../sim/forks';
import { behind } from '../sim/hunt';
import type { Stance } from '../sim/lanes';
import { fleetAt, raided, threnAt, THREN_ABOUT } from '../sim/scatter';
import { survivalOf } from '../content/survival';
import { here, type Chip, type Journey, type Outcome } from '../sim/journey';
import { readout, type NoticeLine } from '../sim/notice';
import { act, actLine, fileCount } from '../sim/story';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { INK } from './palette';
import { num, plural, t } from '../i18n';

// ── the chart ─────────────────────────────────────────────────────────────
// Between systems the drive cools and the chart comes up. It answers a few
// questions and no more: where you are, how far the gate is, which lanes lead
// on, what each costs (jump fluid, supplies, days) and what it offers, and
// which one you are about to take. Header: the system, the gate with the jumps
// left, the stores. Map: the region as the simulation has it, the lanes out
// of here lit and the rest quiet. List: the real lanes out, each with its
// facts (sim/forks.ts). Strip: the one lane selected and the one button that
// takes it. A tap, a click, the arrows or the pad only select; Enter, the pad's
// A or the button jumps. What else the chart knows (what the last system
// changed, the story's questions, the file, Calloway's trail, the Net, each
// faction's notice) sits behind Intel. The same panel tells you when you are
// adrift after a wreck, and how the journey ended.

const NS = 'http://www.w3.org/2000/svg';
/** The map is drawn in screen pixels: its box is measured when it is drawn. */
const FALLBACK = { w: 640, h: 320 };
const PAD_X = 38, PAD_Y = 40;
const KIND_COLOUR: Record<SystemKind, string> = {
  home: INK.white, port: INK.teal, mining: INK.cyrite, contested: INK.red, transit: INK.dust, gate: INK.caution, edge: INK.caution,
};
const KIND_WORD: Record<SystemKind, string> = {
  home: 'Home', port: 'Port', mining: 'Mining', contested: 'Contested', transit: 'Transit', gate: 'Gate', edge: 'The last lane',
};
/** A lane's style, in words (sim/lanes.ts). */
const STANCE_WORD: Record<Stance, string> = { quiet: 'Quiet', watched: 'Watched', hostile: 'Hostile' };
const KEY_DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

/**
 * Where a system sits on the map of a region: columns left to right in the order the simulation has them, y as it
 * has it. The columns round the ship are given more room than the far ones, so the lanes you can take are easy to
 * read and the whole region (and its gate) still fits.
 */
type Proj = { px: (s: StarSystem) => number; py: (s: StarSystem) => number };
const NEAR = { back: 1, ahead: 2 };
function project(shown: StarSystem[], w: number, hgt: number, focus: number): Proj {
  const cols = [...new Set(shown.map((s) => s.col))].sort((a, b) => a - b);
  const near = w < 520 ? 2.2 : 3.2;
  const weight = (col: number) => (col >= focus - NEAR.back && col <= focus + NEAR.ahead ? near : 1);
  // each column's centre sits at the middle of its share of the width
  const start = new Map<number, number>();
  let sum = 0;
  for (const col of cols) { start.set(col, sum); sum += weight(col); }
  const span = w - PAD_X * 2;
  const at = (col: number) => PAD_X + ((start.get(col)! + (weight(col) - 1) / 2) / Math.max(1, sum - 1)) * span;
  return { px: (s) => at(s.col), py: (s) => PAD_Y + s.y * (hgt - PAD_Y * 2) };
}
const days = (n: number) => plural(n, '{n} day', '{n} days');
const CHIP_WORD: Record<Exclude<Chip['key'], 'day'>, string> = { fuel: 'Jump fluid', cyrite: 'Cyrite', plates: 'Plates', supplies: 'Supplies' };
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
/** A place in a few words: what it is, and what it pays (a strange signal's is not known till it is read). */
const placeText = (p: Place) => `${t(PLACES[p.id].name)}, ${t(REWARD_WORD[PLACES[p.id].reward === 'unknown' ? 'unknown' : p.reward])}`;
/** A place that bends space: the chart marks it apart. */
const isAnomaly = (p: Place | null) => !!p && PLACES[p.id].plays === 'anomaly';

/** The region's name, when the chart has more than one. */
export const regionName = (c: Journey['chart'], at: string) => (regionCount(c) > 1 ? t(regionDef(c, viewOf(c, at))?.name ?? '') : '');

/** The two things the region you are heading into asks: one about the people, one about what is not. */
function regionAsks(c: Journey['chart'], at: string): HTMLElement[] {
  const q = QUESTIONS[longIndex(c, viewOf(c, at))];
  return q ? [h('p', 'ch-asks', `${t('The region asks')} · ${t(q.human)} ${t(q.unknown)}`)] : [];
}

/** A faction's notice in a line: its tier, how far to the next, standing, and its captain. */
function noticeText(l: NoticeLine, day: number): string {
  const name = t(l.name.replace(/^the /, ''));
  const parts = [`${name} · ${t(l.tier)}`, l.next ? t('{n}/{at} to {tier}', { n: Math.floor(l.notice), at: l.next.at, tier: t(l.next.tier) }) : t('{n} notice', { n: Math.floor(l.notice) })];
  if (l.standing !== null) parts.push(`${t('standing')} ${signed(l.standing)}`);
  if (l.captain) parts.push(`${l.captain.name}, ${l.captain.rest > day + 1e-9 ? t('resting until day {n}', { n: Math.floor(l.captain.rest) + 1 }) : t('hunting you')}`);
  return parts.join(' · ');
}

function svg(tag: string, attrs: Record<string, string | number>, text = ''): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text) e.textContent = text;
  return e;
}

/** Small line glyphs on a 16 unit grid: a kind of system, and the four things a lane costs. */
const GLYPH: Record<string, string> = {
  port: 'M2 13h12M3 13V7l5-4 5 4v6M6.5 13V9.5h3V13',
  mining: 'M8 2l5 5-5 7-5-7zM3 7h10',
  transit: 'M3 4l4 4-4 4M9 4l4 4-4 4',
  contested: 'M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM8 .5v4M8 11.5v4M.5 8h4M11.5 8h4',
  gate: 'M3 14V8a5 5 0 0110 0v6M6 14V9a2 2 0 014 0v5',
  edge: 'M2 8l6-6 6 6-6 6zM8 5.5v5',
  home: 'M2 13h12M4 13V6l4-3 4 3v7',
  clock: 'M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM8 5v3.4l2.2 1.4',
  drop: 'M8 2s4.5 4.8 4.5 8A4.5 4.5 0 013.5 10C3.5 6.8 8 2 8 2z',
  box: 'M2.5 5L8 2.5 13.5 5v6L8 13.5 2.5 11zM2.5 5L8 7.5 13.5 5M8 7.5v6',
  arrow: 'M2 8h11M9 4l4 4-4 4',
};
function glyph(name: string): SVGElement {
  const e = svg('svg', { viewBox: '0 0 16 16', class: 'cg', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  e.append(svg('path', { d: GLYPH[name] ?? GLYPH.transit! }));
  return e;
}

/** The ship's trouble that is not about the choice: weight that costs jump fluid, and guns that run hot (it flies on, worse). */
function shipTrouble(j: Journey): string[] {
  const out: string[] = [];
  const fuel = weightFuel(j.carry.levels);
  if (fuel) out.push(t('Heavy · each jump burns {n} more jump fluid', { n: fuel }));
  if (overRatings(j.carry.levels).heat) out.push(t('Weapons overheating · slower fire rate'));
  return out;
}

export class ChartPanel {
  private off: (() => void) | null = null;
  private sel = 0;
  private opened = 0;
  private fs: Fork[] = [];
  private j: Journey | null = null;
  private onPick: ((id: string) => void) | null = null;
  private onGo: (() => void) | null = null;
  private chips: Chip[] = [];
  private watch: ResizeObserver | null = null;

  get open(): boolean {
    return !$('chart').hidden;
  }

  /** What the last system changed, for the strip over the next chart or notice. */
  debrief(chips: Chip[]): void {
    this.chips = chips;
  }

  /** The chart, to plot the next jump. `lines`: what happened on the way here. */
  plot(j: Journey, lines: string[], onPick: (id: string) => void): void {
    this.begin(j, false);
    const s = here(j);
    this.j = j;
    $('ch-k').textContent = [t('The chart'), regionName(j.chart, j.at), t('day {n}', { n: Math.floor(j.day) + 1 })].filter(Boolean).join(' · ');
    $('ch-t').textContent = j.legs.length ? `${t('Arrived')} · ${s.name}` : s.name;
    $('ch-s').textContent = `${t(KIND_WORD[s.kind])}${s.quiet && !netted(j.chart, s.id) ? ` · ${t('Quiet')}` : ''}`;
    this.onPick = onPick;
    this.onGo = null;
    $('ch-go').hidden = true;
    // nearest the gate first: Enter alone keeps the journey moving
    this.fs = forks(j).sort((a, b) => (a.gateAfter ?? 1e9) - (b.gateAfter ?? 1e9) || a.fuel - b.fuel || a.to.y - b.to.y);
    this.sel = 0;
    this.renderHead(j);
    ($('ch-alerts') as HTMLElement).replaceChildren(...this.alerts(j).map((a) => h('li', a.hot ? 'hot' : '', a.text)));
    this.renderList();
    this.renderStrip();
    this.draw();
    this.renderIntel(j, lines);
    // opened, Intel comes into view above the strip
    const intel = $('ch-intel') as HTMLDetailsElement;
    intel.ontoggle = () => { if (intel.open) intel.scrollIntoView({ block: 'nearest' }); };
    const jump = $('ch-jump');
    jump.onclick = guarded(this.opened, () => this.pick());
    jump.onpointerdown = (e) => e.stopPropagation();
    this.off = keys((e) => {
      const n = this.fs.length;
      const i = KEY_DIGITS.indexOf(e.code) >= 0 ? KEY_DIGITS.indexOf(e.code) : ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6'].indexOf(e.code);
      if (i >= 0 && i < n) return this.select(i), true;
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { this.move(-1); return true; }
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'Tab') { this.move(1); return true; }
      // the keyboard's Enter on the list or the button is the jump; on the Intel summary it opens it
      if (e.code === 'KeyI') { this.intel(); return true; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return (document.activeElement as HTMLElement | null)?.closest('summary') ? false : (this.pick(), true);
      if (e.code === 'Escape') { this.intel(false); return true; }
      return ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF'].includes(e.code);
    }, ['ArrowUp', 'ArrowDown']);
  }

  /** A notice with one way on: adrift after a wreck, a region lost, or a journey's end. */
  notice(j: Journey, out: Outcome, onGo: () => void): void {
    this.begin(j, true);
    this.j = j;
    const s = here(j);
    const end = out.kind === 'through' || out.kind === 'captured' || out.kind === 'wrecked';
    const rn = regionName(j.chart, j.at);
    $('chart').classList.toggle('alert', out.kind !== 'through');
    $('ch-k').textContent = end ? `${t('Journey ended')} · ${t('day {n}', { n: Math.floor(j.day) + 1 })}`
      : out.kind === 'lost' ? [t('Total loss'), rn].filter(Boolean).join(' · ')
      : [t('Wreck {n} of {of}', { n: j.lost, of: survivalOf(j.survival).voyage.wrecks }), rn].filter(Boolean).join(' · ');
    $('ch-t').textContent = out.kind === 'through' ? t('Into the Scatter') : out.kind === 'captured' ? t('Taken by Calloway') : out.kind === 'wrecked' ? t('The Wayward is lost') : out.kind === 'lost' ? t('The region starts again') : `${t('Adrift')} · ${s.name}`;
    const legs = j.legs.filter((l) => l.ended === 'jumped').length;
    $('ch-s').textContent = end
      ? [plural(legs, '{n} jump', '{n} jumps'), days(Math.round(j.day)), plural(j.wrecks, '{n} wreck', '{n} wrecks'), plural(j.hunt.caught, 'Calloway caught you once', 'Calloway caught you {n} times'), `${t('score')} ${num(j.score)}`].join(' · ')
      : out.kind === 'lost' ? t('Too many wrecks in this region · restart the region')
      : t('She flies again from here, a day later. A share of the stores gone.');
    this.onPick = null;
    this.onGo = onGo;
    this.fs = [];
    const go = $('ch-go');
    go.hidden = false;
    go.textContent = t(end ? 'New journey' : out.kind === 'lost' ? 'Restart this region' : 'Fly on');
    go.onclick = guarded(this.opened, () => this.go());
    go.onpointerdown = (e) => e.stopPropagation();
    $('ch-gate').hidden = true;
    ($('ch-alerts') as HTMLElement).replaceChildren();
    $('ch-res').replaceChildren(...this.resCells(j));
    this.renderIntel(j, out.lines);
    ($('ch-intel') as HTMLDetailsElement).open = true;
    if (end) {
      // the journey, system by system
      $('ch-list').replaceChildren(...j.legs.map((l, i) => h('div', `ch-leg${l.ended === 'destroyed' ? ' wreck' : ''}`, '',
        h('span', 'k', String(i + 1).padStart(2, '0')), h('b', '', l.name),
        h('span', 'pl-note', `${t(l.ended === 'destroyed' ? 'Wrecked' : 'Jumped')} · ${Math.floor(l.time / 60)}:${String(l.time % 60).padStart(2, '0')} · ${l.fuelIn === undefined ? `Cyrite ${l.cyriteIn}→${l.cyriteOut}` : `${t('Jump fluid')} ${Math.floor(l.fuelIn)}→${Math.floor(l.fuelOut ?? 0)}`}${l.calloway ? ' · Calloway' : ''}`))));
    } else if (out.kind === 'adrift') {
      // the rule, where the player is looking: the last wreck here is a total loss
      const left = survivalOf(j.survival).voyage.wrecks - j.lost;
      $('ch-list').replaceChildren(h('p', 'ch-rule', left > 1 ? t('Wrecks left in this region · {n}', { n: left }) : t('The next wreck in this region will end the journey · restart the region to continue')));
    } else $('ch-list').replaceChildren();
    this.draw();
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.go(), true;
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(e.code);
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    this.watch?.disconnect();
    this.watch = null;
    $('chart').hidden = true;
    $('chart').classList.remove('alert');
    $('chart').querySelector('.chartp')?.classList.remove('notice');
  }

  padInput(p: PadEdges): void {
    if (!this.open || performance.now() - this.opened < GUARD) return;
    if (this.onGo) { if (p.a) this.go(); return; }
    if (p.up || p.left) this.move(-1);
    else if (p.down || p.right) this.move(1);
    else if (p.a) this.pick();
    else if (p.b) this.intel(false);
    else if (p.x) this.intel();
  }

  private begin(j: Journey, notice: boolean): void {
    this.close();
    this.opened = performance.now();
    $('chart').querySelector('.chartp')?.classList.toggle('notice', notice);
    ($('ch-intel') as HTMLDetailsElement).open = false;
    $('chart').hidden = false;
    // the map is drawn in pixels: draw again when its box changes (a phone turning, a window resized)
    const map = $('ch-map');
    if (typeof ResizeObserver !== 'undefined') {
      let first = true;
      this.watch = new ResizeObserver(() => { if (first) { first = false; return; } if (this.j) this.draw(); });
      this.watch.observe(map);
    }
    this.j = j;
  }

  private go(): void {
    const fn = this.onGo;
    this.close();
    fn?.();
  }

  /** Take the selected lane. */
  private pick(): void {
    const f = this.fs[this.sel], fn = this.onPick;
    if (!f || !fn) return;
    this.close();
    fn(f.to.id);
  }

  /** Preview a lane: the list, the map and the strip follow; nothing is committed. */
  private select(i: number): void {
    if (i < 0 || i >= this.fs.length) return;
    this.sel = i;
    this.syncList();
    this.renderStrip();
    this.draw();
  }

  private move(d: number): void {
    const n = this.fs.length;
    if (n) this.select((this.sel + d + n) % n);
  }

  private intel(open?: boolean): void {
    const d = $('ch-intel') as HTMLDetailsElement;
    d.open = open ?? !d.open;
  }

  private syncList(): void {
    $('ch-list').querySelectorAll<HTMLElement>('.ch-opt').forEach((b, i) => {
      b.classList.toggle('sel', i === this.sel);
      b.setAttribute('aria-checked', String(i === this.sel));
      b.tabIndex = i === this.sel ? 0 : -1;
    });
  }

  /** The stores, compact: what the jumps burn, what buys, what the trip eats, what keeps the hull. */
  private resCells(j: Journey): HTMLElement[] {
    const c = j.carry;
    const cell = (k: string, v: string, cls = '', why = '') => { const e = h('span', cls, '', h('span', 'k', k), h('b', '', v)); if (why) e.title = why; return e; };
    const hull = c.plates <= 1 ? 'crit' : c.plates <= 2 ? 'low' : '';
    return [
      cell(t('Jump fluid'), String(Math.floor(c.fuel)), '', t('Jump fluid: the drive burns it to jump. The ship refines what you mine into the tank first.')),
      cell(t('Cyrite'), num(c.cyrite), '', t('Cyrite is your money, for upgrades and ports. What the tank cannot hold stays Cyrite.')),
      cell(t('Supplies'), String(c.supplies), c.supplies <= 4 ? 'low' : '', t('Supplies: the lane’s days, the drive’s wear and hull patches. Run out and a jump costs a plate.')),
      cell(t('Hull'), String(c.plates), hull, t('Hull plates: each is one hit the Wayward can take.')),
    ];
  }

  private renderHead(j: Journey): void {
    $('ch-res').replaceChildren(...this.resCells(j));
    const g = gateProgress(j), el = $('ch-gate');
    if (g.left === null || g.left <= 0) { el.hidden = true; return; }
    el.hidden = false;
    const total = g.total ?? g.left, done = Math.max(0, Math.min(1, 1 - g.left / Math.max(1, total)));
    const bar = h('div', 'ch-bar', '', h('i'));
    (bar.firstElementChild as HTMLElement).style.width = `${(done * 100).toFixed(1)}%`;
    bar.style.setProperty('--step', `${100 / Math.max(1, total)}%`);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(total));
    bar.setAttribute('aria-valuenow', String(Math.max(0, total - g.left)));
    el.replaceChildren(h('span', 'k', '', document.createTextNode(`${g.gate.name} · `), h('b', '', plural(g.left, '{n} jump remaining', '{n} jumps remaining'))), bar);
  }

  /** What needs the eye before the choice, and only when it is true now: stores, the tank, a Net or Calloway too near to ignore. */
  private alerts(j: Journey): Array<{ text: string; hot?: boolean }> {
    const out = trouble(j, this.fs);
    if (netted(j.chart, j.at)) out.push({ text: t('The Net holds {name}', { name: here(j).name }), hot: true });
    const gap = behind(j.hunt, j.trail);
    if (j.trail.length > 1 && gap <= 1) out.push({ text: gap === 0 ? t('Calloway is in this system') : t('Calloway is one jump behind'), hot: true });
    return out;
  }

  private renderList(): void {
    const list = $('ch-list');
    list.replaceChildren(...this.fs.map((f, i) => {
      const s = f.to;
      const tag = [t(KIND_WORD[s.kind]), t(STANCE_WORD[f.stance])].join(' · ');
      const gate = f.atGate ? t('The gate') : f.gateAfter === null ? '' : t('{n} to gate', { n: f.gateAfter });
      const b = h('button', `ch-opt ${f.stance}${i === this.sel ? ' sel' : ''}`, '',
        h('div', 'ch-o1', '', h('kbd', '', String(i + 1)), glyph(s.kind), h('b', '', s.name), h('span', 'tag', tag)),
        h('div', 'ch-o2', '',
          h('span', '', '', glyph('clock'), h('b', '', days(f.days))),
          h('span', f.short ? 'short' : '', '', glyph('drop'), h('b', '', String(f.fuel)), document.createTextNode(` ${t('jump fluid')}`), ...(f.short ? [document.createTextNode(` · ${t('{n} short', { n: f.short })}`)] : [])),
          h('span', f.thin ? 'short' : '', '', glyph('box'), h('b', '', String(f.supplies)), document.createTextNode(` ${t('supplies')}`)),
          gate ? h('span', '', '', glyph('arrow'), h('b', '', gate)) : null),
        f.up || f.down ? h('div', 'ch-o3', '',
          f.up ? h('span', '', '', h('em', '', t('Upside')), document.createTextNode(f.up.text)) : null,
          f.down ? h('span', f.down.hot ? 'hot' : '', '', h('em', '', t('Trade-off')), document.createTextNode(f.down.text)) : null) : null,
      ) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === this.sel));
      b.tabIndex = i === this.sel ? 0 : -1;
      b.onclick = guarded(this.opened, () => this.select(i));
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }

  /** The strip: the selected lane's cost in four numbers, and the button that takes it. */
  private renderStrip(): void {
    const f = this.fs[this.sel], jump = $('ch-jump') as HTMLButtonElement, sum = $('ch-sum');
    if (!f) { sum.replaceChildren(); jump.disabled = true; return; }
    const st = (k: string, v: string, short = false) => h('div', `st${short ? ' short' : ''}`, '', h('span', 'k', k), h('b', '', v));
    sum.replaceChildren(
      h('div', 'nm', '', h('span', 'k', `${t(KIND_WORD[f.to.kind])} · ${t(STANCE_WORD[f.stance])}`), h('b', '', f.to.name)),
      st(t('Jump fluid'), f.short ? `${f.fuel} · ${t('{n} short', { n: f.short })}` : String(f.fuel), f.short > 0),
      st(t('Travel time'), days(f.days)),
      st(t('Supplies'), String(f.supplies), f.thin),
      ...(f.gateAfter === null && !f.atGate ? [] : [st(t('Gate after arrival'), f.atGate ? t('Arrived') : plural(f.gateAfter ?? 0, '{n} jump', '{n} jumps'))]),
    );
    jump.disabled = false;
    jump.textContent = t('Jump to {name}', { name: f.to.name });
  }

  /** Intel: the rest of what the chart knows. */
  private renderIntel(j: Journey, lines: string[]): void {
    const c = j.carry, ago = Math.max(0, Math.floor(j.day - j.hunt.seenDay));
    const seen = j.trail[j.hunt.seenIdx];
    const gap = Math.max(0, j.trail.length - 1 - j.hunt.seenIdx);
    const netN = j.chart.seenNet.length;
    // what the last system changed as chips, then the first two lines; the rest sit behind a tap
    const shown = lines.slice(0, 2), rest = lines.slice(2);
    $('ch-news').replaceChildren(...shown.map((l) => h('li', '', t(l))));
    $('ch-more').hidden = !rest.length;
    ($('ch-more') as HTMLDetailsElement).open = false;
    $('ch-more-s').textContent = plural(rest.length, '{n} more line', '{n} more lines');
    $('ch-more-l').replaceChildren(...rest.map((l) => h('li', '', t(l))));
    $('ch-chips').replaceChildren(...this.chips.map((ch) => {
      const label = ch.key === 'day' ? days(Math.abs(ch.d)) : `${t(CHIP_WORD[ch.key])} ${num(Math.abs(ch.d))}`;
      return h('span', `ch-chip ${ch.key === 'day' ? 'day' : ch.d > 0 ? 'up' : 'down'}`, '', ch.key === 'day' ? null : h('i', '', ch.d > 0 ? '▲' : '▼'), h('b', '', label));
    }));
    const notes = this.chips.length + lines.length;
    $('ch-intel-s').textContent = notes ? `${t('Intel')} · ${plural(notes, '{n} note', '{n} notes')}` : t('Intel');
    this.chips = [];
    const file = fileCount(c.flags, j.chart.regionSet ?? 'three');
    // the factions on the move, by name, for the systems this region shows
    const view = viewOf(j.chart, j.at), moving = regionSystems(j.chart, view).flatMap((s) => [
      fleetAt(j.chart, s.id) ? `${t('Drift fleet')} · ${s.name}` : '', threnAt(j.chart, s.id) >= THREN_ABOUT ? `Thren · ${s.name}` : '', raided(j.chart, s.id) ? `${t('raided')} · ${s.name}` : '',
    ]).filter(Boolean);
    $('ch-stat').replaceChildren(
      h('p', 'ch-act', actLine(act(j)), h('span', 'ch-filec', t('File {n}/{of}', { n: file.found, of: file.of }))),
      ...regionAsks(j.chart, j.at),
      ...shipTrouble(j).map((l) => h('p', 'ch-warn', l)),
      h('p', 'ch-goal', `${t('Goal')} · ${t('Reach {name}', { name: goalOf(j.chart, j.at).name })}`),
      h('p', 'ch-hunt', j.trail.length < 2
        ? `Calloway · ${t('Not on your trail yet')}`
        : `Calloway · ${t('last seen {where}', { where: seen ? sysById(j.chart, seen).name : t('unknown') })}, ${ago ? plural(ago, '{n} day ago', '{n} days ago') : t('today')} · ${gap === 0 ? t('in this system') : plural(gap, 'About {n} jump behind', 'About {n} jumps behind')}`),
      ...fileLines(j.calloway, j.hunt.hunch).map((l) => h('p', 'ch-file', t(l))),
      h('p', 'ch-netl', `${t('The Net')} · ${plural(netN, '{n} system', '{n} systems')} · ${t('as of day {n}', { n: Math.floor(j.chart.seenDay) + 1 })}`),
      ...(moving.length ? [h('p', 'ch-netl', moving.join(' · '))] : []),
      ...readout(j.notice, c.standing).map((l) => h('p', `ch-notice t-${l.tier}`, noticeText(l, j.day))),
    );
  }

  /** The map: the region as the simulation has it. The lanes out of here are lit, the selected one bright with its cost; the rest is quiet. */
  private draw(): void {
    const j = this.j;
    if (!j) return;
    const map = $('ch-map') as unknown as SVGSVGElement;
    const box = map.getBoundingClientRect();
    const W = Math.round(box.width) || FALLBACK.w, H = Math.round(box.height) || FALLBACK.h;
    map.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const c = j.chart, at = j.at;
    // one region at a time: the way in, its systems, and its gate
    const view = viewOf(c, at), shown = regionSystems(c, view), vis = new Set(shown.map((s) => s.id));
    const { px, py } = project(shown, W, H, sysById(c, at).col);
    const live = new Map(this.fs.map((f, i) => [f.to.id, i]));
    const target = this.fs[this.sel]?.to.id;
    const goal = goalOf(c, at);
    const extra = weightFuel(j.carry.levels);
    const kids: SVGElement[] = [];
    const rn = regionName(c, at);
    if (rn) kids.push(svg('text', { x: W / 2, y: 16, 'text-anchor': 'middle', class: 'ch-region' }, rn));
    // taken space, for labels to keep clear of: every node and every cost
    const taken: Array<[number, number, number, number]> = [];
    for (const s of shown) taken.push([px(s) - 10, py(s) - 10, px(s) + 10, py(s) + 10]);
    // lanes: the graph quiet; the ones out of here lit, the selected one bright, with its cost
    const costs: SVGElement[] = [];
    for (const r of c.routes) {
      if (!vis.has(r.a) || !vis.has(r.b)) continue;
      const a = sysById(c, r.a), b = sysById(c, r.b);
      const out = (r.a === at && live.has(r.b)) || (r.b === at && live.has(r.a));
      const sel = out && (r.a === target || r.b === target);
      const hot = out && (c.seenNet.includes(r.a === at ? r.b : r.a));
      kids.push(svg('line', { x1: px(a), y1: py(a), x2: px(b), y2: py(b), class: `ch-r${out ? ' live' : ''}${sel ? ' sel' : ''}${hot && !sel ? ' net' : ''}` }));
      // a lane's number is shown on the selected lane, and on the others where there is room for it
      if (out && (sel || Math.hypot(px(a) - px(b), py(a) - py(b)) > 64)) {
        const x = (px(a) + px(b)) / 2, y = (py(a) + py(b)) / 2, label = String(r.cyrite + extra);
        const w = label.length * 7 + 10;
        const g = svg('g', { class: `ch-cost${sel ? ' sel' : ''}` });
        g.append(svg('rect', { x: x - w / 2, y: y - 8, width: w, height: 16, rx: 2 }), svg('text', { x, y: y + 4 }, label));
        costs.push(g);
        taken.push([x - w / 2 - 2, y - 10, x + w / 2 + 2, y + 10]);
      }
    }
    // your trail, faint
    for (let i = 1; i < j.trail.length; i++) {
      if (!vis.has(j.trail[i - 1]!) || !vis.has(j.trail[i]!)) continue;
      const a = sysById(c, j.trail[i - 1]!), b = sysById(c, j.trail[i]!);
      kids.push(svg('line', { x1: px(a), y1: py(a), x2: px(b), y2: py(b), class: 'ch-trail' }));
    }
    // names go to the places that matter, each to the first free side of its node
    const named = new Set([at, goal.id, ...live.keys(), ...(target ? [target] : [])]);
    const place = (s: StarSystem, tagged: boolean): { x: number; y: number; anchor: string; tagY: number } => {
      const x = px(s), y = py(s), r = s.kind === 'gate' || s.kind === 'edge' || s.id === at ? 9 : 7;
      const w = s.name.length * 6.6 + 4, hgt = tagged ? 26 : 12;
      const tries: Array<{ x: number; y: number; anchor: string; box: [number, number, number, number]; tagY: number }> = [
        { x, y: y + r + 13, anchor: 'middle', box: [x - w / 2, y + r + 2, x + w / 2, y + r + 2 + hgt], tagY: y + r + 24 },
        { x, y: y - r - 6 - (tagged ? 13 : 0), anchor: 'middle', box: [x - w / 2, y - r - 4 - hgt, x + w / 2, y - r - 2], tagY: y - r - 6 },
        { x: x + r + 6, y: y + 4, anchor: 'start', box: [x + r + 4, y - 7, x + r + 8 + w, y - 7 + hgt], tagY: y + 16 },
        { x: x - r - 6, y: y + 4, anchor: 'end', box: [x - r - 8 - w, y - 7, x - r - 4, y - 7 + hgt], tagY: y + 16 },
      ];
      const free = (b: [number, number, number, number]) => b[0] >= 2 && b[2] <= W - 2 && b[1] >= 22 && b[3] <= H - 2
        && !taken.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1] && !(o[0] === x - 10 && o[1] === y - 10));
      const pick = tries.find((t2) => free(t2.box)) ?? tries[0]!;
      taken.push(pick.box);
      return pick;
    };
    // here and the selection first, so they get the best sides
    const order = [...shown].sort((a, b) => Number(b.id === at) - Number(a.id === at) || Number(b.id === target) - Number(a.id === target) || Number(b.id === goal.id) - Number(a.id === goal.id));
    const labelAt = new Map<string, ReturnType<typeof place>>();
    for (const s of order) if (named.has(s.id) && (this.onPick || s.id === at || s.id === goal.id)) labelAt.set(s.id, place(s, s.id === at || s.id === goal.id));
    // systems
    for (const s of shown) {
      const x = px(s), y = py(s), net = c.seenNet.includes(s.id), visited = c.visited.includes(s.id), isGate = s.kind === 'gate' || s.kind === 'edge';
      const out = live.has(s.id), isSel = s.id === target;
      const g = svg('g', { class: `ch-s${out ? ' out' : ' far'}${isSel ? ' sel' : ''}${s.id === at ? ' here' : ''}${net ? ' net' : ''}${isGate ? ' gate' : ''}` });
      // the lanes out, here and the gate carry the detail; the rest of the graph is context, small and plain
      const ctx = !out && s.id !== at && !isGate;
      if (net) {
        g.append(svg('circle', { cx: x, cy: y, r: ctx ? 9 : 13, class: 'ch-net' }));
        // a lane you could take into it carries a mark besides the colour
        if (out) g.append(svg('path', { d: `M${x + 9} ${y - 12}l4 7h-8z`, fill: INK.red }));
      }
      if (s.quiet && !net && !ctx) g.append(svg('circle', { cx: x, cy: y, r: 12, class: 'ch-quiet' }));
      const col = KIND_COLOUR[s.kind], r = isGate || s.id === at ? 8 : ctx ? 4.5 : 6.5;
      if (isGate) g.append(svg('path', { d: `M${x} ${y - r - 2}L${x + r + 2} ${y}L${x} ${y + r + 2}L${x - r - 2} ${y}Z`, class: 'ch-node', stroke: col, 'fill-opacity': visited ? 1 : 0.9 }));
      else g.append(svg('circle', { cx: x, cy: y, r, class: 'ch-node', stroke: col, fill: visited ? `${col}33` : 'rgba(11,12,15,.92)' }));
      if (s.port && !ctx) g.append(svg('rect', { x: x + 6, y: y - 11, width: 5, height: 5, class: 'ch-port' }));
      const p = placeAt(c, s.id), scene = situationLine(c, s.id);
      if (ctx && !isAnomaly(p)) { /* no mark */ }
      else if (isAnomaly(p)) g.append(svg('path', { d: `M${x - 10} ${y - 15}l4 4l-4 4l-4-4z`, class: 'ch-anom' }));
      else if (p || scene) g.append(svg('path', { d: `M${x - 9} ${y - 14}l3 3l-3 3l-3-3z`, class: 'ch-place' }));
      if (p || scene) { const ti = svg('title', {}); ti.textContent = p ? placeText(p) : scene!; g.append(ti); }
      if (out) g.append(svg('circle', { cx: x, cy: y, r: r + 5, class: isSel ? 'ch-ring' : 'ch-ring dim', ...(isSel ? {} : { opacity: 0.25 }) }));
      if (s.id === at) g.append(svg('circle', { cx: x, cy: y, r: r + 5, class: 'ch-ring here' }));
      const lab = labelAt.get(s.id);
      if (lab) {
        g.append(svg('text', { x: lab.x, y: lab.y, 'text-anchor': lab.anchor, class: 'ch-name' }, s.name));
        const tag = s.id === at ? t('Here') : isGate ? t(s.kind === 'edge' ? 'The last lane' : 'Gate') : '';
        if (tag) {
          const tw = tag.length * 7 + 8, ax = lab.anchor === 'middle' ? lab.x - tw / 2 : lab.anchor === 'start' ? lab.x : lab.x - tw;
          g.append(svg('rect', { x: ax, y: lab.tagY - 9, width: tw, height: 12, rx: 1.5, class: 'ch-tagb' }), svg('text', { x: ax + tw / 2, y: lab.tagY, 'text-anchor': 'middle', class: 'ch-tagm' }, tag));
        }
      }
      const n = live.get(s.id);
      if (n !== undefined && this.onPick) {
        const hit = svg('circle', { cx: x, cy: y, r: 18, fill: 'transparent' });
        g.append(hit);
        g.addEventListener('click', guarded(this.opened, () => this.select(n)) as EventListener);
        g.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
      kids.push(g);
    }
    kids.push(...costs);
    // Calloway's shadow, where she was last seen
    const seen = j.trail.length > 1 ? j.trail[j.hunt.seenIdx] : undefined;
    if (seen && vis.has(seen) && seen !== at) {
      const s = sysById(c, seen), x = px(s) - 14, y = py(s) - 14;
      kids.push(svg('path', { d: `M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z`, class: 'ch-cal' }));
    }
    map.replaceChildren(...kids);
  }
}
