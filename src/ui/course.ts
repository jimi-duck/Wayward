import { courseView, type Course } from '../sim/course';
import type { Journey } from '../sim/journey';
import { halfDays } from '../sim/hunt';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { fillWall, hash01, storeCells, svg } from './chart';
import { plural, t } from '../i18n';

// ── the Course ────────────────────────────────────────────────────────────
// On the Warden's Road the chart's question changes from "where next?" to
// "how far, and at what cost?". It is drawn in the chart's own look (chart.css):
// the header with the leg goal as a bar and the stores, the road as one calm line
// of stops, one card for the jump and one for the stop after, the pursuit in
// days and one button. The view is sim/course.ts; the Wall lives here as it
// does on the chart.

/** How far behind, in words: half a day, a day, a day and a half. */
function whenWords(days: number): string {
  const d = halfDays(days);
  if (d <= 0) return t('here');
  if (d < 1) return t('half a day');
  return Number.isInteger(d) ? plural(d, '{n} day', '{n} days') : t('{n} days', { n: `${Math.floor(d)}½` });
}

/** The pursuit line: who, how far, and what they know. */
function pursuitLine(p: Course['pursuit']): string {
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
    $('co-blurb').replaceChildren(h('b', '', t(c.next.name)), ` · ${t(c.next.purpose)}`); // one fixed line: no "she may expect this" chip
    const purs = $('co-purs');
    purs.textContent = pursuitLine(c.pursuit);
    purs.className = `co-purs ${c.pursuit.hidden ? 'rest' : c.pursuit.tone}`;
    // the breach debt, once the Account has called: what is left, or Draper's hold on it once he has shown himself
    const debt = $('co-debt');
    debt.hidden = !c.debt;
    debt.textContent = !c.debt ? '' : c.debt.settled ? t('Debt · Settled') : t('Debt · {n} CR · Kellern Recovery', { n: c.debt.left });
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
    // the sky behind: soft blooms, a faint dot lattice that fades to the edges, dust. All gradients, no edges.
    const defs = svg('defs', {});
    const grad = (id: string, stops: Array<[number, string, number]>) => {
      const g = svg('radialGradient', { id });
      for (const [o, c, a] of stops) g.append(svg('stop', { offset: o, style: `stop-color:${c};stop-opacity:${a}` }));
      defs.append(g);
    };
    grad('co-neb-a', [[0, 'var(--blue)', 0.5], [1, 'var(--blue)', 0]]);
    grad('co-neb-b', [[0, 'var(--anomaly)', 0.4], [1, 'var(--anomaly)', 0]]);
    grad('co-neb-c', [[0, 'var(--cy)', 0.32], [1, 'var(--cy)', 0]]);
    for (const [id, c] of [['teal', 'var(--cy)'], ['amber', 'var(--pick)'], ['white', 'var(--ink)'], ['dim', 'var(--ink-2)']] as const) {
      grad(`co-h-${id}`, [[0, c, 0.55], [0.22, c, 0.22], [0.6, c, 0.05], [1, c, 0]]);
    }
    const fade = svg('radialGradient', { id: 'co-fade' });
    fade.append(svg('stop', { offset: 0.25, 'stop-color': '#fff' }), svg('stop', { offset: 1, 'stop-color': '#000' }));
    const mask = svg('mask', { id: 'co-latm' });
    mask.append(svg('rect', { width: W, height: H, fill: 'url(#co-fade)' }));
    defs.append(fade, mask);
    kids.push(defs);
    const R = Math.max(W, H);
    kids.push(
      svg('ellipse', { cx: W * 0.5, cy: H * 0.5, rx: R * 0.4, ry: H * 0.45, fill: 'url(#co-neb-a)', opacity: 0.55 }),
      svg('ellipse', { cx: W * 0.28, cy: H * 0.58, rx: R * 0.26, ry: H * 0.4, fill: 'url(#co-neb-b)', opacity: 0.5 }),
      svg('ellipse', { cx: W * 0.72, cy: H * 0.48, rx: Math.min(R * 0.24, W * 0.26), ry: H * 0.4, fill: 'url(#co-neb-c)', opacity: 0.6 }),
    );
    const lat = svg('g', { class: 'co-lat', mask: 'url(#co-latm)' });
    for (let x = 22; x < W; x += 44) for (let y = 22; y < H; y += 44) lat.append(svg('circle', { cx: x, cy: y, r: 0.8 }));
    kids.push(lat);
    for (let i = 0; i < 60; i++) kids.push(svg('circle', { cx: (hash01(`co${i}x`) * W).toFixed(1), cy: (hash01(`co${i}y`) * H).toFixed(1), r: (0.5 + hash01(`co${i}r`) * 0.9).toFixed(2), class: 'ch-dust', opacity: (0.12 + hash01(`co${i}o`) * 0.4).toFixed(2) }));
    // the road as one soft wave: stops alternate above and below the middle, so each name sits on the side away from the line
    const small = W < 380, padX = small ? 34 : 56, step = (W - padX * 2) / Math.max(1, nodes.length - 1), tight = H < 170, amp = Math.max(6, Math.min(H * 0.2, (H - (tight ? 76 : 120)) / 2, 74));
    const pts = nodes.map((_, i) => ({ x: padX + step * i, y: H / 2 - (tight ? 8 : 0) + (i % 2 ? 1 : -1) * amp * (0.55 + 0.45 * hash01(`co-y${i}`)) }));
    // a smooth curve through the stops (Catmull-Rom as cubic segments), one path per hop so each can take its own tone
    const seg = (i: number) => {
      const p0 = pts[Math.max(0, i - 2)]!, p1 = pts[i - 1]!, p2 = pts[i]!, p3 = pts[Math.min(pts.length - 1, i + 1)]!, k = 0.2;
      return `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}C${(p1.x + (p2.x - p0.x) * k).toFixed(1)} ${(p1.y + (p2.y - p0.y) * k).toFixed(1)} ${(p2.x - (p3.x - p1.x) * k).toFixed(1)} ${(p2.y - (p3.y - p1.y) * k).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    };
    for (let i = 1; i < nodes.length; i++) {
      const state = nodes[i]!.state, d = seg(i);
      if (state === 'next') kids.push(svg('path', { d, class: 'co-lane-under' }));
      kids.push(svg('path', { d, class: `co-lane ${state === 'next' ? 'next' : state === 'done' || state === 'here' ? 'done' : 'ahead'}` }));
    }
    nodes.forEach((n, i) => {
      const { x, y } = pts[i]!, up = y < H / 2, big = n.gate, here = n.state === 'here', next = n.state === 'next', done = n.state === 'done';
      const k = small ? 0.75 : 1, core = (big ? 6.5 : here ? 5 : next ? 5 : 3.6) * k, ring = (big ? 15 : here ? 12 : next ? 12 : 9) * k, halo = (big ? 78 : here ? 62 : next ? 56 : done ? 30 : 36) * k;
      const tone = here ? 'white' : done ? 'dim' : big || next ? 'amber' : 'teal';
      const g = svg('g', { class: `ch-s co-s ${n.state}${big ? ' gate' : ''}` });
      g.append(svg('circle', { cx: x, cy: y, r: halo, fill: `url(#co-h-${here ? 'teal' : tone})`, opacity: done ? 0.5 : 1 }));
      if (!done) g.append(svg('circle', { cx: x, cy: y, r: halo * 2, fill: `url(#co-h-${here ? 'teal' : tone})`, opacity: 0.14 }));
      g.append(svg('circle', { cx: x, cy: y, r: ring, class: `co-ring ${tone}` }));
      if (here) g.append(svg('circle', { cx: x, cy: y, r: ring + 8 * k, class: 'co-ring outer' }));
      if (big) g.append(svg('path', { d: `M${x} ${y - ring * 0.62}L${x + ring * 0.62} ${y}L${x} ${y + ring * 0.62}L${x - ring * 0.62} ${y}Z`, class: 'co-gem' }));
      g.append(svg('circle', { cx: x, cy: y, r: core, class: `co-core ${tone}` }));
      // a short leader, then the name in small wide-tracked capitals; the tag under it for where she is and the goal
      const tag = here ? t('Here') : big ? t('Goal') : '';
      const hw = Math.min(W / 2, (t(n.name).length + (tight && tag ? tag.length + 3 : 0)) * (big ? 5.6 : 4.8) + 14), off = ring + (tight ? 3 : 10), ly = up ? y - off : y + off, lab = svg('g', { class: `ch-lab co-lab ${n.state}${big ? ' gate' : ''}`, transform: `translate(${Math.max(hw, Math.min(W - hw, x)).toFixed(1)} ${ly.toFixed(1)})` });
      if (!tight) lab.append(svg('line', { x1: 0, y1: up ? 4 : -4, x2: 0, y2: up ? 14 : -14, class: 'co-leader' }));
      lab.append(svg('text', { x: 0, y: tight ? (up ? -2 : 12) : up ? -(tag ? 20 : 8) : 24, 'text-anchor': 'middle', class: 'ch-name' }, tight && tag ? `${t(n.name)} · ${tag}` : t(n.name)));
      if (tag && !tight) lab.append(svg('text', { x: 0, y: tight ? (up ? 0 : 23) : up ? -6 : 38, 'text-anchor': 'middle', class: 'co-tag' }, tag));
      // on a small map only the stops that matter are named: where she is, the next, the goal
      if ((small || (tight && W < 640)) && !here && !next && !big) lab.setAttribute('display', 'none');
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
