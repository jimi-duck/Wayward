import { PLACES, REWARD_WORD } from '../content/phenomena';
import { HOLDER_NAMES, SYSTEMS, type SystemKind } from '../content/systems';
import { TANK_MAX } from '../sim/breakout';
import { fileLines } from '../sim/calloway';
import { gateOf, jumps, krailKnown, lanesFrom, placeAt, regionCount, regionSystems, sysById, viewOf, type Chart, type Place, type StarSystem } from '../sim/chart';
import { REGIONS } from '../content/regions';
import { fleetAt, raided, threnAt, THREN_ABOUT } from '../sim/scatter';
import { RATION, WRECKS, here, options, type Journey, type Outcome } from '../sim/journey';
import { readout, type NoticeLine } from '../sim/notice';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { INK } from './palette';
import { num, plural, t } from '../i18n';

// ── the chart ─────────────────────────────────────────────────────────────
// Between systems the drive cools and the chart comes up: the region you
// are in as you know it (one of three, content/regions.ts; through a gate,
// the next), and the lanes out of where you are. Systems are nodes coloured
// by kind; the Net's edge is red (as of the day you last had news); your
// trail is a line behind you; Calloway is a red shadow where she was last
// seen. Pick a lane by its number, a tap on the list or on the map, or the
// pad, and the next sortie begins. Under the stores, each faction that has
// marked you: its notice tier, how far to the next, your standing with it,
// and its named captain (sim/notice.ts readout). A small diamond marks a
// system with a place in it you know of (content/phenomena.ts), and the
// lane list says what it is. The factions on the move (sim/scatter.ts) show
// too: the Thren as a green haze, a Drift fleet as a teal pennant, a Gutter
// raid as a red slash. The goal (the region's gate out) is named over
// the stores and on the map, and when the lanes differ, the ones that bring
// it nearer are marked and the highlight starts on one. The same panel tells you when you are
// adrift after a wreck, and how the journey ended.

const NS = 'http://www.w3.org/2000/svg';
const W = 640, H = 300, PAD_X = 44, PAD_Y = 34;
const KIND_COLOUR: Record<SystemKind, string> = {
  home: INK.white, port: INK.teal, mining: INK.krail, contested: INK.red, transit: INK.dust, gate: INK.amber, edge: INK.amber,
};
const KIND_WORD: Record<SystemKind, string> = {
  home: 'Home', port: 'Port', mining: 'Mining', contested: 'Contested', transit: 'Transit', gate: 'Gate', edge: 'The last lane',
};

/** Where a system sits on the map of a region: its columns spread across the width. */
type Proj = { px: (s: StarSystem) => number; py: (s: StarSystem) => number };
function project(shown: StarSystem[]): Proj {
  const lo = Math.min(...shown.map((s) => s.col)), hi = Math.max(lo + 1, ...shown.map((s) => s.col));
  return { px: (s) => PAD_X + ((s.col - lo) / (hi - lo)) * (W - PAD_X * 2), py: (s) => PAD_Y + s.y * (H - PAD_Y * 2) };
}
const days = (n: number) => plural(n, '{n} day', '{n} days');
const richWord = (k: number) => t(k >= 0.7 ? 'rich' : k >= 0.4 ? 'fair' : 'poor');
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
/** A place in a few words: what it is, and what it pays (a strange signal's is not known till it is read). */
const placeText = (p: Place) => `${t(PLACES[p.id].name)}, ${t(REWARD_WORD[PLACES[p.id].reward === 'unknown' ? 'unknown' : p.reward])}`;

/** The goal from where you are: the way out of the region you are in (its gate, or the Threshold). */
const goalOf = (c: Chart, at: string) => gateOf(c, viewOf(c, at));
/** Jumps from a system to the goal (Infinity with no way). */
const toGoal = (c: Chart, at: string, id: string) => jumps(c, id, goalOf(c, at).id);
/** The region's name, when the chart has more than one. */
const regionName = (c: Chart, at: string) => (regionCount(c) > 1 ? t(REGIONS[viewOf(c, at)]?.name ?? '') : '');

/** A faction's notice in a line: its tier, how far to the next, standing, and its captain. */
function noticeText(l: NoticeLine, day: number): string {
  const name = t(l.name.replace(/^the /, ''));
  const parts = [`${name} · ${t(l.tier)}`, l.next ? t('{n}/{at} to {tier}', { n: Math.floor(l.notice), at: l.next.at, tier: t(l.next.tier) }) : t('{n} notice', { n: Math.floor(l.notice) })];
  if (l.standing !== null) parts.push(`${t('standing')} ${signed(l.standing)}`);
  if (l.captain) parts.push(`${l.captain.name}, ${l.captain.rest > day + 1e-9 ? t('resting till day {n}', { n: Math.floor(l.captain.rest) + 1 }) : t('hunting you')}`);
  return parts.join(' · ');
}

function svg(tag: string, attrs: Record<string, string | number>, text = ''): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text) e.textContent = text;
  return e;
}

export class ChartPanel {
  private off: (() => void) | null = null;
  private sel = 0;
  private opened = 0;
  private ids: string[] = [];
  private onPick: ((id: string) => void) | null = null;
  private onGo: (() => void) | null = null;

  get open(): boolean {
    return !$('chart').hidden;
  }

  /** The chart, to plot the next jump. `lines`: what happened on the way here. */
  plot(j: Journey, lines: string[], onPick: (id: string) => void): void {
    this.begin(j, lines);
    const s = here(j);
    const rn = regionName(j.chart, j.at);
    $('ch-k').textContent = [t('The chart'), rn, t('day {n}', { n: Math.floor(j.day) + 1 })].filter(Boolean).join(' · ');
    $('ch-t').textContent = j.legs.length ? `${t('Arrived')} · ${s.name}` : s.name;
    $('ch-s').textContent = `${t(KIND_WORD[s.kind])} · ${t(SYSTEMS[s.kind].blurb)}`;
    this.onPick = onPick;
    this.onGo = null;
    $('ch-go').hidden = true;
    const opts = options(j);
    this.ids = opts.map((o) => o.to.id);
    // the highlight starts on a lane toward the goal, so Enter alone keeps the journey moving
    const now = toGoal(j.chart, j.at, j.at);
    this.sel = Math.max(0, opts.findIndex((o) => toGoal(j.chart, j.at, o.to.id) < now));
    this.renderList(j);
    this.draw(j);
    this.off = keys((e) => {
      const n = this.ids.length;
      const i = Math.max(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code), ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5'].indexOf(e.code));
      if (i >= 0 && i < n) return this.pick(i), true;
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { this.move(-1, j); return true; }
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'Tab') { this.move(1, j); return true; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.pick(this.sel), true;
      return ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF', 'Escape'].includes(e.code);
    }, ['ArrowUp', 'ArrowDown']);
  }

  /** A notice with one way on: adrift after a wreck, or a journey's end. */
  notice(j: Journey, out: Outcome, onGo: () => void): void {
    this.begin(j, out.lines);
    const s = here(j);
    const end = out.kind === 'through' || out.kind === 'captured' || out.kind === 'wrecked';
    $('chart').classList.toggle('alert', out.kind !== 'through');
    $('ch-k').textContent = end ? `${t('Journey over')} · ${t('day {n}', { n: Math.floor(j.day) + 1 })}` : t('Wreck {n} of {of}', { n: j.wrecks, of: WRECKS });
    $('ch-t').textContent = out.kind === 'through' ? t('Into the Scatter') : out.kind === 'captured' ? t('Taken by Calloway') : out.kind === 'wrecked' ? t('The Wayward is lost') : `${t('Adrift')} · ${s.name}`;
    const legs = j.legs.filter((l) => l.ended === 'jumped').length;
    $('ch-s').textContent = end
      ? [plural(legs, '{n} jump', '{n} jumps'), days(Math.round(j.day)), plural(j.wrecks, '{n} wreck', '{n} wrecks'), plural(j.hunt.caught, 'Calloway caught you once', 'Calloway caught you {n} times'), `${t('score')} ${num(j.score)}`].join(' · ')
      : t('She flies again. Same system, a day later, hold empty.');
    this.onPick = null;
    this.onGo = onGo;
    const go = $('ch-go');
    go.hidden = false;
    go.textContent = t(end ? 'New journey' : 'Fly on');
    go.onclick = guarded(this.opened, () => this.go());
    go.onpointerdown = (e) => e.stopPropagation();
    this.ids = [];
    if (end) {
      // the journey, system by system
      $('ch-list').replaceChildren(...j.legs.map((l, i) => h('div', `ch-leg${l.ended === 'destroyed' ? ' wreck' : ''}`, '',
        h('span', 'k', String(i + 1).padStart(2, '0')), h('b', '', l.name),
        h('span', 'pl-note', `${t(l.ended === 'destroyed' ? 'Wrecked' : 'Jumped')} · ${Math.floor(l.time / 60)}:${String(l.time % 60).padStart(2, '0')} · Krail ${l.krailIn}→${l.krailOut}${l.calloway ? ' · Calloway' : ''}`))));
    } else $('ch-list').replaceChildren();
    this.draw(j);
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.go(), true;
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(e.code);
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('chart').hidden = true;
    $('chart').classList.remove('alert');
  }

  padInput(p: PadEdges, j: Journey): void {
    if (!this.open || performance.now() - this.opened < GUARD) return;
    if (this.onGo) { if (p.a) this.go(); return; }
    if (p.up || p.left) this.move(-1, j);
    else if (p.down || p.right) this.move(1, j);
    else if (p.a) this.pick(this.sel);
  }

  private begin(j: Journey, lines: string[]): void {
    this.close();
    this.opened = performance.now();
    $('ch-news').replaceChildren(...lines.map((l) => h('li', '', t(l))));
    this.renderStat(j);
    $('chart').hidden = false;
  }

  private go(): void {
    const fn = this.onGo;
    this.close();
    fn?.();
  }

  private pick(i: number): void {
    const id = this.ids[i], fn = this.onPick;
    if (!id || !fn) return;
    this.close();
    fn(id);
  }

  private move(d: number, j: Journey): void {
    const n = this.ids.length;
    if (!n) return;
    this.sel = (this.sel + d + n) % n;
    this.mark();
    this.draw(j);
  }

  private mark(): void {
    $('ch-list').querySelectorAll('.ch-l').forEach((b, i) => b.classList.toggle('sel', i === this.sel));
  }

  private renderList(j: Journey): void {
    const opts = options(j), now = toGoal(j.chart, j.at, j.at);
    // marked only where it tells lanes apart: when every lane closes on the goal, the goal line says enough
    const near = opts.map((o) => toGoal(j.chart, j.at, o.to.id) < now), some = near.some((n) => !n);
    $('ch-list').replaceChildren(...opts.map((o, i) => {
      const s = o.to;
      // a lane that brings the goal a jump nearer says so, at a glance
      const left = toGoal(j.chart, j.at, s.id), closer = some && near[i]!;
      const notes = [
        days(o.route.days), `${t('food')} ${o.food}`, s.port ? s.port.name : t('no port'), `Krail ${richWord(krailKnown(j.chart, s))}${j.chart.visited.includes(s.id) ? '' : '?'}`,
      ];
      if (o.place) notes.push(placeText(o.place));
      if (fleetAt(j.chart, s.id)) notes.push(t('Drift fleet'));
      if (threnAt(j.chart, s.id) >= THREN_ABOUT) notes.push('Thren');
      if (raided(j.chart, s.id)) notes.push(t('raided'));
      if (o.netted) notes.push(t('netted'));
      if (o.shadow) notes.push(t('Calloway last seen'));
      const b = h('button', `port-l ch-l${i === this.sel ? ' sel' : ''}${o.netted ? ' net' : ''}`, '',
        h('kbd', '', String(i + 1)),
        h('span', 'pl-n', '', h('b', '', s.name), left === 0 ? h('span', 'ch-goal-c', t('Goal')) : closer ? h('span', 'ch-goal-c', t('Toward goal')) : null, h('span', 'ch-kind', ` ${t(KIND_WORD[s.kind])}${s.kind === 'edge' || s.kind === 'gate' ? '' : ` · ${t(HOLDER_NAMES[s.holder])}`}`)),
        h('span', 'pl-note', notes.join(' · ')),
        h('b', 'pl-p', String(o.route.krail)),
      ) as HTMLButtonElement;
      b.type = 'button';
      b.title = t('{n} Krail to jump', { n: o.route.krail });
      b.onclick = guarded(this.opened, () => this.pick(i));
      b.onpointerdown = (e) => e.stopPropagation();
      // hover marks it in place: a tap must not replace the button it is landing on
      b.onpointerenter = () => { if (this.sel !== i) { this.sel = i; this.mark(); this.draw(j); } };
      return b;
    }));
  }

  private renderStat(j: Journey): void {
    const c = j.carry, ago = Math.max(0, Math.floor(j.day - j.hunt.seenDay));
    const seen = j.trail[j.hunt.seenIdx];
    const gap = Math.max(0, j.trail.length - 1 - j.hunt.seenIdx);
    const netN = j.chart.seenNet.length;
    const cells: Array<[string, string]> = [
      [t('Tank'), `${c.krail}/${TANK_MAX}`], [t('Food'), `${c.food} · ${t('{n}/day', { n: RATION })}`], [t('Parts'), String(c.parts)], [t('Chits'), String(c.chits)], [t('Hold'), t('{n} ore', { n: c.ore })],
    ];
    const goal = goalOf(j.chart, j.at), left = toGoal(j.chart, j.at, j.at);
    $('ch-stat').replaceChildren(
      ...(left > 0 && left < Infinity ? [h('p', 'ch-goal', `${t('Goal')} · ${t('reach {name}', { name: goal.name })} · ${plural(left, '{n} jump', '{n} jumps')}`)] : []),
      h('div', 'port-stock', '', ...cells.map(([k, v]) => h('span', '', '', h('span', 'k', k), h('b', '', v)))),
      h('p', 'ch-hunt', j.trail.length < 2
        ? `Calloway · ${t('not on your trail yet')}`
        : `Calloway · ${t('last seen {where}', { where: seen ? sysById(j.chart, seen).name : t('unknown') })}, ${ago ? plural(ago, '{n} day ago', '{n} days ago') : t('today')} · ${gap === 0 ? t('in this system') : plural(gap, 'about {n} jump behind', 'about {n} jumps behind')}`),
      ...fileLines(j.calloway, j.hunt.hunch).map((l) => h('p', 'ch-file', t(l))),
      h('p', 'ch-netl', `${t('The Net')} · ${plural(netN, '{n} system', '{n} systems')} · ${t('as of day {n}', { n: Math.floor(j.chart.seenDay) + 1 })}`),
      ...readout(j.notice, c.standing).map((l) => h('p', `ch-notice t-${l.tier}`, noticeText(l, j.day))),
    );
  }

  private draw(j: Journey): void {
    const map = $('ch-map') as unknown as SVGSVGElement;
    const c = j.chart, at = j.at;
    // one region at a time: the way in, its systems, and its gate
    const view = viewOf(c, at), shown = regionSystems(c, view), vis = new Set(shown.map((s) => s.id));
    const { px, py } = project(shown);
    const out = new Set(lanesFrom(c, at).map((l) => l.to.id));
    const target = this.ids[this.sel];
    const kids: SVGElement[] = [];
    const rn = regionName(c, at);
    if (rn) kids.push(svg('text', { x: W / 2, y: 14, 'text-anchor': 'middle', class: 'ch-region' }, rn));
    // lanes: faint; the ones out of here amber, the selected one bright, with its cost
    for (const r of c.routes) {
      if (!vis.has(r.a) || !vis.has(r.b)) continue;
      const a = sysById(c, r.a), b = sysById(c, r.b);
      const live = (r.a === at && out.has(r.b)) || (r.b === at && out.has(r.a));
      const sel = live && (r.a === target || r.b === target);
      kids.push(svg('line', { x1: px(a), y1: py(a), x2: px(b), y2: py(b), class: `ch-r${live ? ' live' : ''}${sel ? ' sel' : ''}` }));
      if (live) kids.push(svg('text', { x: (px(a) + px(b)) / 2, y: (py(a) + py(b)) / 2 - 5, class: `ch-cost${sel ? ' sel' : ''}`, 'text-anchor': 'middle' }, `${r.krail}`));
    }
    // your trail
    for (let i = 1; i < j.trail.length; i++) {
      if (!vis.has(j.trail[i - 1]!) || !vis.has(j.trail[i]!)) continue;
      const a = sysById(c, j.trail[i - 1]!), b = sysById(c, j.trail[i]!);
      kids.push(svg('line', { x1: px(a), y1: py(a), x2: px(b), y2: py(b), class: 'ch-trail' }));
    }
    // systems
    const goal = goalOf(c, at);
    for (const s of shown) {
      const x = px(s), y = py(s), net = c.seenNet.includes(s.id), visited = c.visited.includes(s.id);
      const g = svg('g', { class: `ch-s${out.has(s.id) ? ' out' : ''}${s.id === target ? ' sel' : ''}` });
      // the Thren as a haze, thicker where there are more of them
      const thren = threnAt(c, s.id);
      if (thren >= THREN_ABOUT * 0.5) g.append(svg('circle', { cx: x, cy: y, r: 13 + 9 * thren, class: 'ch-thren', opacity: Math.min(1, 0.35 + thren) }));
      if (net) g.append(svg('circle', { cx: x, cy: y, r: 15, class: 'ch-net' }));
      if (j.chart.stall[s.id]) g.append(svg('circle', { cx: x, cy: y, r: 12, class: 'ch-stall' }));
      if (fleetAt(c, s.id)) g.append(svg('path', { d: `M${x + 9} ${y + 4}l4 8h-8z`, class: 'ch-drift' }));
      if (raided(c, s.id)) g.append(svg('path', { d: `M${x - 13} ${y + 9}l5 -6M${x - 9} ${y + 11}l5 -6`, class: 'ch-raid' }));
      g.append(svg('circle', { cx: x, cy: y, r: s.kind === 'edge' || s.kind === 'home' || s.kind === 'gate' ? 8 : 6.5, fill: visited ? KIND_COLOUR[s.kind] : 'rgba(11,12,15,.9)', stroke: KIND_COLOUR[s.kind], 'stroke-width': 2 }));
      if (s.port) g.append(svg('rect', { x: x + 6, y: y - 11, width: 5, height: 5, fill: INK.teal }));
      const place = placeAt(c, s.id);
      if (place) {
        const m = svg('path', { d: `M${x - 9} ${y - 14}l3 3l-3 3l-3-3z`, class: 'ch-place' });
        m.append(svg('title', {}, placeText(place)));
        g.append(m);
      }
      g.append(svg('text', { x, y: y + 20, 'text-anchor': 'middle', class: 'ch-name' }, s.name));
      if (s.id === goal.id) g.append(svg('text', { x, y: y + 31, 'text-anchor': 'middle', class: 'ch-goalm' }, t('Goal')));
      const n = this.ids.indexOf(s.id);
      if (n >= 0) g.append(svg('text', { x, y: y - 13, 'text-anchor': 'middle', class: 'ch-num' }, String(n + 1)));
      if (n >= 0 && this.onPick) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', guarded(this.opened, () => this.pick(n)) as EventListener);
        g.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
      kids.push(g);
    }
    // Calloway's shadow, where she was last seen
    const seen = j.trail.length > 1 ? j.trail[j.hunt.seenIdx] : undefined;
    if (seen && vis.has(seen)) {
      const s = sysById(c, seen), x = px(s) - 14, y = py(s) - 14;
      kids.push(svg('path', { d: `M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z`, class: 'ch-cal' }));
    }
    // you
    const me = sysById(c, at);
    kids.push(svg('path', { d: `M${px(me)} ${py(me) - 22}l5 8h-10z`, class: 'ch-you' }));
    map.replaceChildren(...kids);
  }
}
