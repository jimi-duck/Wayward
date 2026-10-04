import { PLACES, REWARD_WORD } from '../content/phenomena';
import { HOLDER_NAMES, SYSTEMS, type SystemKind } from '../content/systems';
import { TANK_MAX } from '../sim/breakout';
import { krailKnown, lanesFrom, placeAt, sysById, type Place, type StarSystem } from '../sim/chart';
import { RATION, WRECKS, here, options, type Journey, type Outcome } from '../sim/journey';
import { readout, type NoticeLine } from '../sim/notice';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { INK } from './palette';

// ── the chart ─────────────────────────────────────────────────────────────
// Between systems the drive cools and the chart comes up: the region as you
// know it, and the lanes out of where you are. Systems are nodes coloured
// by kind; the Net's edge is red (as of the day you last had news); your
// trail is a line behind you; Calloway is a red shadow where she was last
// seen. Pick a lane by its number, a tap on the list or on the map, or the
// pad, and the next sortie begins. Under the stores, each faction that has
// marked you: its notice tier, how far to the next, your standing with it,
// and its named captain (sim/notice.ts readout). A small diamond marks a
// system with a place in it you know of (content/phenomena.ts), and the
// lane list says what it is. The same panel tells you when you are
// adrift after a wreck, and how the journey ended.

const NS = 'http://www.w3.org/2000/svg';
const W = 640, H = 300, PAD_X = 44, PAD_Y = 34;
const KIND_COLOUR: Record<SystemKind, string> = {
  home: INK.white, port: INK.teal, mining: INK.krail, contested: INK.red, transit: INK.dust, edge: INK.amber,
};
const KIND_WORD: Record<SystemKind, string> = {
  home: 'Home', port: 'Port', mining: 'Mining', contested: 'Contested', transit: 'Transit', edge: 'The last lane',
};

const px = (s: StarSystem) => PAD_X + s.x * (W - PAD_X * 2);
const py = (s: StarSystem) => PAD_Y + s.y * (H - PAD_Y * 2);
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
const richWord = (k: number) => (k >= 0.7 ? 'rich' : k >= 0.4 ? 'fair' : 'poor');
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
/** A place in a few words: what it is, and what it pays (a strange signal's is not known till it is read). */
const placeText = (p: Place) => `${PLACES[p.id].name}, ${REWARD_WORD[PLACES[p.id].reward === 'unknown' ? 'unknown' : p.reward]}`;

/** A faction's notice in a line: its tier, how far to the next, standing, and its captain. */
function noticeText(l: NoticeLine, day: number): string {
  const name = l.name.replace(/^the /, '');
  const parts = [`${name} · ${l.tier}`, l.next ? `${Math.floor(l.notice)}/${l.next.at} to ${l.next.tier}` : `${Math.floor(l.notice)} notice`];
  if (l.standing !== null) parts.push(`standing ${signed(l.standing)}`);
  if (l.captain) parts.push(`${l.captain.name}${l.captain.rest > day + 1e-9 ? `, resting till day ${Math.floor(l.captain.rest) + 1}` : ', hunting you'}`);
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
    $('ch-k').textContent = `The chart · day ${Math.floor(j.day) + 1}`;
    $('ch-t').textContent = j.legs.length ? `Arrived · ${s.name}` : s.name;
    $('ch-s').textContent = `${KIND_WORD[s.kind]} · ${SYSTEMS[s.kind].blurb}`;
    this.onPick = onPick;
    this.onGo = null;
    $('ch-go').hidden = true;
    const opts = options(j);
    this.ids = opts.map((o) => o.to.id);
    this.sel = 0;
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
    $('ch-k').textContent = end ? `Journey over · day ${Math.floor(j.day) + 1}` : `Wreck ${j.wrecks} of ${WRECKS}`;
    $('ch-t').textContent = out.kind === 'through' ? 'Into the Scatter' : out.kind === 'captured' ? 'Taken by Calloway' : out.kind === 'wrecked' ? 'The Wayward is lost' : `Adrift · ${s.name}`;
    const legs = j.legs.filter((l) => l.ended === 'jumped').length;
    $('ch-s').textContent = end
      ? `${legs} jump${legs === 1 ? '' : 's'} · ${Math.round(j.day)} days · ${j.wrecks} wreck${j.wrecks === 1 ? '' : 's'} · Calloway caught up ${j.hunt.caught} time${j.hunt.caught === 1 ? '' : 's'} · score ${j.score.toLocaleString('en-GB')}`
      : 'You got her flying again. Same system, a day later, and the hold is gone.';
    this.onPick = null;
    this.onGo = onGo;
    const go = $('ch-go');
    go.hidden = false;
    go.textContent = end ? 'New journey' : 'Fly on';
    go.onclick = guarded(this.opened, () => this.go());
    go.onpointerdown = (e) => e.stopPropagation();
    this.ids = [];
    if (end) {
      // the journey, system by system
      $('ch-list').replaceChildren(...j.legs.map((l, i) => h('div', `ch-leg${l.ended === 'destroyed' ? ' wreck' : ''}`, '',
        h('span', 'k', String(i + 1).padStart(2, '0')), h('b', '', l.name),
        h('span', 'pl-note', `${l.ended === 'destroyed' ? 'Wrecked' : 'Jumped'} · ${Math.floor(l.time / 60)}:${String(l.time % 60).padStart(2, '0')} · Krail ${l.krailIn}→${l.krailOut}${l.calloway ? ' · Calloway' : ''}`))));
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
    $('ch-news').replaceChildren(...lines.map((l) => h('li', '', l)));
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
    const opts = options(j);
    $('ch-list').replaceChildren(...opts.map((o, i) => {
      const s = o.to;
      const notes = [
        days(o.route.days), `food ${o.food}`, s.port ? s.port.name : 'no port', `Krail ${richWord(krailKnown(j.chart, s))}${j.chart.visited.includes(s.id) ? '' : '?'}`,
      ];
      if (o.place) notes.push(placeText(o.place));
      if (o.netted) notes.push('netted');
      if (o.shadow) notes.push('Calloway last seen');
      const b = h('button', `port-l ch-l${i === this.sel ? ' sel' : ''}${o.netted ? ' net' : ''}`, '',
        h('kbd', '', String(i + 1)),
        h('span', 'pl-n', '', h('b', '', s.name), h('span', 'ch-kind', ` ${KIND_WORD[s.kind]}${s.kind === 'edge' ? '' : ` · ${HOLDER_NAMES[s.holder]}`}`)),
        h('span', 'pl-note', notes.join(' · ')),
        h('b', 'pl-p', String(o.route.krail)),
      ) as HTMLButtonElement;
      b.type = 'button';
      b.title = `${o.route.krail} Krail to jump`;
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
      ['Tank', `${c.krail}/${TANK_MAX}`], ['Food', `${c.food} · ${RATION}/day`], ['Parts', String(c.parts)], ['Chits', String(c.chits)], ['Hold', `${c.ore} ore`],
    ];
    $('ch-stat').replaceChildren(
      h('div', 'port-stock', '', ...cells.map(([k, v]) => h('span', '', '', h('span', 'k', k), h('b', '', v)))),
      h('p', 'ch-hunt', j.trail.length < 2
        ? 'Calloway · not on your trail yet'
        : `Calloway · last seen ${seen ? sysById(j.chart, seen).name : 'unknown'}${ago ? `, ${ago} day${ago === 1 ? '' : 's'} ago` : ', today'} · ${gap === 0 ? 'in this system' : `about ${gap} jump${gap === 1 ? '' : 's'} behind`}`),
      h('p', 'ch-netl', `The Net · ${netN} system${netN === 1 ? '' : 's'} as of day ${Math.floor(j.chart.seenDay) + 1}`),
      ...readout(j.notice, c.standing).map((l) => h('p', `ch-notice t-${l.tier}`, noticeText(l, j.day))),
    );
  }

  private draw(j: Journey): void {
    const map = $('ch-map') as unknown as SVGSVGElement;
    const c = j.chart, at = j.at;
    const out = new Set(lanesFrom(c, at).map((l) => l.to.id));
    const target = this.ids[this.sel];
    const kids: SVGElement[] = [];
    // lanes: faint; the ones out of here amber, the selected one bright, with its cost
    for (const r of c.routes) {
      const a = sysById(c, r.a), b = sysById(c, r.b);
      const live = (r.a === at && out.has(r.b)) || (r.b === at && out.has(r.a));
      const sel = live && (r.a === target || r.b === target);
      kids.push(svg('line', { x1: px(a), y1: py(a), x2: px(b), y2: py(b), class: `ch-r${live ? ' live' : ''}${sel ? ' sel' : ''}` }));
      if (live) kids.push(svg('text', { x: (px(a) + px(b)) / 2, y: (py(a) + py(b)) / 2 - 5, class: `ch-cost${sel ? ' sel' : ''}`, 'text-anchor': 'middle' }, `${r.krail}`));
    }
    // your trail
    for (let i = 1; i < j.trail.length; i++) {
      const a = sysById(c, j.trail[i - 1]!), b = sysById(c, j.trail[i]!);
      kids.push(svg('line', { x1: px(a), y1: py(a), x2: px(b), y2: py(b), class: 'ch-trail' }));
    }
    // systems
    for (const s of c.systems) {
      const x = px(s), y = py(s), net = c.seenNet.includes(s.id), visited = c.visited.includes(s.id);
      const g = svg('g', { class: `ch-s${out.has(s.id) ? ' out' : ''}${s.id === target ? ' sel' : ''}` });
      if (net) g.append(svg('circle', { cx: x, cy: y, r: 15, class: 'ch-net' }));
      if (j.chart.stall[s.id]) g.append(svg('circle', { cx: x, cy: y, r: 12, class: 'ch-stall' }));
      g.append(svg('circle', { cx: x, cy: y, r: s.kind === 'edge' || s.kind === 'home' ? 8 : 6.5, fill: visited ? KIND_COLOUR[s.kind] : 'rgba(11,12,15,.9)', stroke: KIND_COLOUR[s.kind], 'stroke-width': 2 }));
      if (s.port) g.append(svg('rect', { x: x + 6, y: y - 11, width: 5, height: 5, fill: INK.teal }));
      const place = placeAt(c, s.id);
      if (place) {
        const m = svg('path', { d: `M${x - 9} ${y - 14}l3 3l-3 3l-3-3z`, class: 'ch-place' });
        m.append(svg('title', {}, placeText(place)));
        g.append(m);
      }
      g.append(svg('text', { x, y: y + 20, 'text-anchor': 'middle', class: 'ch-name' }, s.name));
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
    if (seen) {
      const s = sysById(c, seen), x = px(s) - 14, y = py(s) - 14;
      kids.push(svg('path', { d: `M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z`, class: 'ch-cal' }));
    }
    // you
    const me = sysById(c, at);
    kids.push(svg('path', { d: `M${px(me)} ${py(me) - 22}l5 8h-10z`, class: 'ch-you' }));
    map.replaceChildren(...kids);
  }
}
