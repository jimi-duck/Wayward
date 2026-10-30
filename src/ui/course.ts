import { expects } from '../sim/calloway';
import { courseView, type Course } from '../sim/course';
import type { Journey } from '../sim/journey';
import { halfDays } from '../sim/hunt';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { fillWall, glyph, hash01, storeCells, svg } from './chart';
import { INK } from './palette';
import { plural, t } from '../i18n';

// ── the Course ────────────────────────────────────────────────────────────
// On the Warden's Road the chart's question changes from "where next?" to
// "how far, and at what cost?". It is drawn in the chart's own look (chart.css):
// the header with the leg goal as a bar and the stores, the road as one calm line
// of stops, one card for the jump and one for the stop after, the pursuit in
// days and one button. The view is sim/course.ts; the Wall lives here as it
// does on the chart.

/** How far behind, in words: half a day, a day, a day and a half. */
export function whenWords(days: number): string {
  const d = halfDays(days);
  if (d <= 0) return t('here');
  if (d < 1) return t('half a day');
  return Number.isInteger(d) ? plural(d, '{n} day', '{n} days') : t('{n} days', { n: `${Math.floor(d)}½` });
}

/** The pursuit line: who, how far, and what they know. */
export function pursuitLine(p: Course['pursuit']): string {
  if (p.hidden) return t('Not shown while you rest');
  const when = whenWords(p.days);
  if (p.days <= 0) return p.who === 'calloway' ? t('Governor Calloway · here') : t('Custody pursuit · here');
  return p.who === 'calloway' ? t('Governor Calloway · {when} behind · knows your route', { when }) : t('Custody pursuit · {when} behind', { when });
}

/** One node of the map: a stop, the state it is in, and what it is. */
interface Node { name: string; kind: Course['here']['kind']; state: 'done' | 'here' | 'next' | 'ahead'; gate: boolean }

export class CoursePanel {
  private off: (() => void) | null = null;
  private opened = 0;
  private onGo: (() => void) | null = null;
  private c: Course | null = null;
  private watch: ResizeObserver | null = null;

  get open(): boolean { return !$('course').hidden; }

  /** Whether this journey's next jump is plotted on the Course (the road's own stops). */
  static applies(j: Journey): boolean { return courseView(j) !== null; }

  /** Show the Course; `go` plots the one lane. */
  show(j: Journey, go: (id: string) => void): void {
    const c = courseView(j);
    if (!c) return;
    this.close();
    this.c = c;
    this.opened = performance.now();
    this.onGo = () => go(c.to.id);
    $('course').hidden = false;
    $('co-k').textContent = `${t(c.region)} · ${t('day {n}', { n: c.day })}`;
    $('co-t').textContent = t(c.here.name);
    const short = Math.max(0, c.fuel.need - c.fuel.have);
    const cells = storeCells(j, short > 0);
    // the jump's fluid beside what the tank holds
    const tank = cells[0]!.querySelector('b')!;
    tank.textContent = `${tank.textContent} / ${c.fuel.need}`;
    cells[0]!.title = t('Jump fluid aboard, and what this jump needs');
    $('co-res').replaceChildren(...cells);
    // the leg goal: the bar and the jumps left, with its one line
    const total = c.road.length, done = Math.max(0, Math.min(1, 1 - c.goal.jumps / Math.max(1, total)));
    const bar = h('div', 'ch-bar', '', h('i'));
    (bar.firstElementChild as HTMLElement).style.width = `${(done * 100).toFixed(1)}%`;
    bar.style.setProperty('--step', `${100 / Math.max(1, total)}%`);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(total));
    bar.setAttribute('aria-valuenow', String(total - c.goal.jumps));
    $('co-gate').replaceChildren(h('span', 'k', `${t('Leg goal')} · ${t(c.goal.name)}`), bar, h('b', 'n', plural(c.goal.jumps, '{n} jump', '{n} jumps')), h('p', 'ch-quest', t(c.goal.purpose)));
    // one short line about the stop she jumps to
    $('co-blurb').replaceChildren(h('b', '', t(c.next.name)), ` · ${t(c.next.purpose)}`, ...(expects(j.chart, j.at, c.to.id, j.hunt.hunch) ? [h('span', 'chip her', t('Calloway may expect this'))] : []));
    const purs = $('co-purs');
    purs.textContent = pursuitLine(c.pursuit);
    purs.className = `co-purs ${c.pursuit.hidden ? 'rest' : c.pursuit.tone}`;
    // the breach debt, once the Account has called: what is left, or Draper's hold on it once he has shown himself
    const debt = $('co-debt');
    debt.hidden = !c.debt;
    debt.textContent = !c.debt ? '' : c.debt.settled ? `${t('Debt · Settled')} · ${t('held by Director Draper')}` : t('Debt · {n} CR · Kellern Recovery', { n: c.debt.left });
    const why = $('co-why');
    why.hidden = short <= 0;
    why.textContent = short > 0 ? t('Needs {n} more fluid', { n: short }) : '';
    fillWall(j, { s: $('co-wall-s'), lead: $('co-wall-lead'), list: $('co-wall-l') });
    ($('co-wall') as HTMLDetailsElement).open = false;
    const go$ = $('co-go') as HTMLButtonElement;
    go$.classList.toggle('short', short > 0);
    go$.textContent = short > 0 ? t('Plot course to {name}', { name: t(c.next.name) }) : t('Jump to {name}', { name: t(c.next.name) });
    go$.onclick = guarded(this.opened, () => this.go());
    go$.onpointerdown = (e) => e.stopPropagation();
    this.draw();
    this.watch = new ResizeObserver(() => this.draw());
    this.watch.observe($('co-map').parentElement!);
    this.off = keys((e) => {
      if (e.code === 'KeyW') { const w = $('co-wall') as HTMLDetailsElement; w.open = !w.open; if (w.open) w.scrollIntoView({ block: 'nearest' }); return true; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return (document.activeElement as HTMLElement | null)?.closest('summary') ? false : (this.go(), true);
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF'].includes(e.code);
    });
  }

  /**
   * The map: the road as one gentle line, left to right, the stops a little up and down so their names never meet.
   * Where she is, the next stop (the one to jump to, with its fluid), the stops behind dimmed and the Narrows as the goal.
   * The dark lanes are short dashed stubs that end in nothing.
   */
  private draw(): void {
    const c = this.c;
    if (!c) return;
    const map = $('co-map') as unknown as SVGSVGElement;
    const box = map.getBoundingClientRect();
    const W = Math.round(box.width) || 640, H = Math.round(box.height) || 320;
    map.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const here = c.road.findIndex((r) => r.state === 'here');
    const nodes: Node[] = [
      ...(here < 0 ? [{ name: c.here.name, kind: c.here.kind, state: 'here' as const, gate: false }] : []),
      ...c.road.map((r, i) => ({ name: r.name, kind: r.kind, state: (r.state === 'ahead' && (here < 0 ? i === 0 : i === here + 1) ? 'next' : r.state) as Node['state'], gate: r.kind === 'gate' || r.kind === 'edge' })),
    ];
    const kids: SVGElement[] = [];
    for (let x = 60; x < W; x += 60) kids.push(svg('line', { x1: x, y1: 0, x2: x, y2: H, class: 'ch-grid' }));
    for (let y = 60; y < H; y += 60) kids.push(svg('line', { x1: 0, y1: y, x2: W, y2: y, class: 'ch-grid' }));
    // faint stars, the same every time
    for (let i = 0; i < 46; i++) kids.push(svg('circle', { cx: (hash01(`co${i}x`) * W).toFixed(1), cy: (hash01(`co${i}y`) * H).toFixed(1), r: (0.5 + hash01(`co${i}r`) * 0.9).toFixed(2), class: 'ch-dust', opacity: (0.15 + hash01(`co${i}o`) * 0.35).toFixed(2) }));
    const padX = 44, step = (W - padX * 2) / Math.max(1, nodes.length - 1), amp = Math.min(12, H * 0.04);
    const px = (i: number) => padX + step * i, py = (i: number) => H / 2 + (i % 2 ? amp : -amp);
        // the road itself
    for (let i = 1; i < nodes.length; i++) {
      const a = i - 1, state = nodes[i]!.state;
      const cls = state === 'next' ? 'ch-lane teal sel' : nodes[i]!.state === 'done' || nodes[i]!.state === 'here' ? 'ch-lane teal done' : 'ch-net-lane';
      const d = `M${px(a)} ${py(a)}Q${((px(a) + px(i)) / 2).toFixed(1)} ${((py(a) + py(i)) / 2 + (a % 2 ? 6 : -6)).toFixed(1)} ${px(i)} ${py(i)}`;
      if (state === 'next') kids.push(svg('path', { d, class: 'ch-lane-under teal' }));
      kids.push(svg('path', { d, class: cls }));
    }
    nodes.forEach((n, i) => {
      const x = px(i), y = py(i), r = (n.gate ? 14 : 11) * (W < 380 ? 0.72 : 1), col = n.state === 'here' ? INK.white : n.gate ? INK.teal : n.state === 'done' ? INK.dust : INK.teal;
      const g = svg('g', { class: `ch-s${n.state === 'next' ? ' out sel' : ''}${n.state === 'here' ? ' here' : ''}${n.gate ? ' gate' : ''}${n.state === 'done' ? ' past' : ''}` });
      const s = (r * 2 + 4) / 16;
      const shape = n.state === 'here' ? 'home' : n.kind;
      g.append(svg('path', { d: (glyph(shape).firstElementChild as SVGPathElement).getAttribute('d')!, transform: `translate(${x - 8 * s} ${y - 8 * s}) scale(${s})`, class: 'ch-node', stroke: col, fill: `${col}26`, 'vector-effect': 'non-scaling-stroke' }));
      if (n.state === 'next') g.append(svg('circle', { cx: x, cy: y, r: r + 7, class: 'ch-ring' }));
      if (n.state === 'here') g.append(svg('circle', { cx: x, cy: y, r: r + 6, class: 'ch-ring here' }));
      // the name above or below, the other way to its neighbour's; the tag under the name for where she is and the goal
      const up = i % 2 === 0, lab = svg('g', { class: 'ch-lab', transform: `translate(${Math.max(34, Math.min(W - 34, x)).toFixed(1)} ${(up ? y - r - 12 : y + r + 14).toFixed(1)})` });
      lab.append(svg('text', { x: 0, y: 0, 'text-anchor': 'middle', class: 'ch-name' }, t(n.name)));
      const tag = n.state === 'here' ? t('Here') : n.gate ? t('Goal') : '';
      if (tag) {
        const tw = tag.length * 7 + 8, ty = up ? -22 : 5;
        lab.append(svg('rect', { x: -tw / 2, y: ty, width: tw, height: 12, rx: 1.5, class: `ch-tagb ${n.gate ? 'gate' : 'here'}` }), svg('text', { x: 0, y: ty + 9, 'text-anchor': 'middle', class: 'ch-tagm' }, tag));
      }
      // on a small map only the stops that matter are named: where she is, the next, the goal
      if (W < 380 && n.state !== 'here' && n.state !== 'next' && !n.gate) lab.setAttribute('display', 'none');
      g.append(lab);
      kids.push(g);
    });
    map.replaceChildren(...kids);
  }

  close(): void {
    this.off?.();
    this.off = null;
    this.watch?.disconnect();
    this.watch = null;
    $('course').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (!this.open || performance.now() - this.opened < GUARD) return;
    if (p.a) this.go();
  }

  private go(): void {
    const fn = this.onGo;
    this.close();
    fn?.();
  }
}
