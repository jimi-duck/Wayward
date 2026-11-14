import { courseView, type Course } from '../sim/course';
import type { Journey } from '../sim/journey';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { fillWall, KIND_WORD, placeLabels, svg } from './chart';
import { num, plural, t } from '../i18n';

// ── the Course ────────────────────────────────────────────────────────────
// On the Warden's Road the chart's question changes from "where next?" to
// "how far, and at what cost?". The screen comes up as she lands: the header
// says where (with the goal, the jumps to it and the Net behind), the map is the
// road as one wave over the nebula with the route in amber, the panel on the right
// is the next stop and the route to the goal, with the one button that flies on
// into the system she has just reached. Under the map a legend and the whole road,
// leg by leg. The view is sim/course.ts; the Wall lives here as it does on the chart.

type State = 'done' | 'here' | 'next' | 'route' | 'ahead';
/** One node of the map: a stop, the state it is in, what it is, the jump it is (J1…) on the route, and whether the Net holds it. */
interface MapNode { name: string; kind: Course['here']['kind']; state: State; gate: boolean; aim: boolean; jump: number; day?: number; net: boolean }

/** A number in the mono face. */
const mono = (text: string, cls = 'mono') => h('span', cls, text);

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
    this.head(c);
    this.side(c);
    this.foot(c);
    fillWall(j, { s: $('co-wall-s'), lead: $('co-wall-lead'), list: $('co-wall-l') });
    ($('co-wall') as HTMLDetailsElement).open = false;
    const go$ = $('co-go') as HTMLButtonElement;
    go$.onclick = guarded(this.opened, () => this.go());
    go$.onpointerdown = (e) => e.stopPropagation();
    this.draw();
    this.watch = new ResizeObserver(() => this.draw());
    this.watch.observe($('co-map').parentElement!);
    this.off = keys((e) => {
      if (e.code === 'KeyW') { this.wall(); return true; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return (document.activeElement as HTMLElement | null)?.closest('summary, .co-wallb') ? false : (this.go(), true);
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF'].includes(e.code);
    });
  }

  /** Open or close the Wall, under the map. */
  private wall(): void {
    const w = $('co-wall') as HTMLDetailsElement;
    w.open = !w.open;
    if (w.open) w.scrollIntoView({ block: 'nearest' });
  }

  /** The header: arrived where and when, the name, the goal, the jumps to it and the Net behind; the stores on the right. */
  private head(c: Course): void {
    $('co-k').replaceChildren(h('i', 'co-dia'), h('b', '', t('Arrived')), ` · ${t(c.region)} · ${t('Day {n}', { n: c.day })}`);
    $('co-t').textContent = t(c.here.name);
    $('co-chips').replaceChildren(
      h('span', 'co-chip goal', `${t('Goal')} · ${t(c.aim.name)}`),
      h('span', 'co-chip info', plural(c.aim.jumps, '{n} jump', '{n} jumps')),
      ...(c.net === null ? [] : [h('span', 'co-chip net', c.net === 0 ? `▲ ${t('Net holds this system')}` : `▲ ${plural(c.net, 'Net {n} system behind', 'Net {n} systems behind')}`)]),
    );
    const s = c.stores;
    const row = (k: string, v: string, fill: number | null, low = false) => {
      const bar = h('span', 'bar');
      if (fill !== null) { const i = h('i'); i.style.width = `${(Math.max(0, Math.min(1, fill)) * 100).toFixed(1)}%`; bar.append(i); }
      return h('div', `co-sr${low ? ' low' : ''}`, '', h('span', 'k', k), bar, mono(v, 'v'));
    };
    $('co-res').replaceChildren(
      row(t('Hull'), `${s.plates}/${s.maxPlates}`, s.plates / Math.max(1, s.maxPlates), s.plates <= 2),
      row(t('Cyrite'), num(s.cyrite), null),
    );
  }

  /** The panel: the next stop, what it offers, the route to the goal, and the one button. */
  private side(c: Course): void {
    $('co-nk').textContent = `${t('Next stop')} · ${t('J{n} of {of}', { n: 1, of: c.aim.jumps })}`;
    $('co-nn').textContent = t(c.next.name);
    $('co-ns').textContent = c.next.purpose ? sentence(t(c.next.purpose)) : '';
    const n = c.nextAt;
    const dl = (k: string, ...v: Array<Node | string>) => h('div', 'co-row', '', h('span', 'k', k), h('span', 'v', '', ...v.map((x) => (typeof x === 'string' ? document.createTextNode(x) : x))));
    const wallb = h('button', 'co-wallb', '', mono(t('File {n}/{of}', { n: c.file.found, of: c.file.of })), h('span', 'tri', ' ▸')) as HTMLButtonElement;
    wallb.type = 'button';
    wallb.onclick = () => this.wall();
    $('co-rows').replaceChildren(
      dl(t('Depot'), n.depot ? t('Yes') : t('No'), ...(n.depot && n.bonded ? [h('span', 'amb', ` · ${t('Bonded +{n}%', { n: n.bonded })}`)] : [])),
      dl(t('Continuance'), ...(n.net ? [h('span', 'red', `▲ ${t('Net holds it')}`)] : [h('span', 'dim', t('No Net'))])),
      dl(t('Wall'), wallb),
      ...(c.debt ? [dl(t('Debt'), c.debt.settled ? t('Settled') : mono(`${num(c.debt.left)} CR`))] : []),
    );
    // the route to the goal: here, then each jump with its number
    const route = c.road.map((r, i) => ({ r, i })).filter(({ r }) => r.state !== 'done');
    const hereRow = c.road.some((r) => r.state === 'here') ? [] : [{ name: c.here.name, state: 'here' as const, gate: false }];
    const upto = route.findIndex(({ r }) => r.name === c.aim.name);
    const list = [...hereRow, ...route.slice(0, upto + 1).map(({ r }) => ({ name: r.name, state: r.state, gate: r.kind === 'gate' || r.kind === 'edge' }))];
    let k = 0;
    $('co-route').replaceChildren(...list.map((x, i) => {
      const here = x.state === 'here', last = i === list.length - 1;
      const cls = here ? 'here' : last && x.gate ? 'goal gate' : last ? 'goal' : i === 1 ? 'next' : 'later';
      const tag = here ? t('Here') : `J${++k}`;
      return h('li', cls, '', h('i', 'pip'), h('span', 'nm', t(x.name)), mono(tag, 'j'));
    }));
    // the button: into the system she has just reached, and what is there to do in it
    const what = [c.hereAt.depot ? t('Refuel') : '', c.hereAt.job ? t('Job') : '', t('Wall')].filter(Boolean).join(' · ');
    $('co-go-t').textContent = t('Enter {name}', { name: t(c.here.name) });
    $('co-go-s').textContent = what;
  }

  /** Under the map: the whole road, leg by leg, with the prologue done and this leg in amber. */
  private foot(c: Course): void {
    const L = c.legs;
    $('co-road-k').textContent = t('The road · leg {n} of {of}', { n: L.at + 1, of: L.names.length });
    $('co-road').replaceChildren(
      h('div', 'co-seg done', '', h('i', 'fill', '', null), h('span', '', `✓ ${t('Prologue')}`)),
      ...L.names.map((name, i) => {
        const cur = i === L.at, done = i < L.at;
        const seg = h('div', `co-seg${cur ? ' cur' : done ? ' done' : ''}`, '', h('i', 'fill'), h('span', '', `${done ? '✓ ' : ''}${i + 1} · ${t(name)}`, ...(cur ? [mono(` ${Math.max(0, L.done)}/${L.of}`, 'n')] : [])));
        if (cur) (seg.firstElementChild as HTMLElement).style.width = `${((Math.max(0, L.done) / L.of) * 100).toFixed(1)}%`;
        return seg;
      }),
    );
  }

  /**
   * The map: the road as one smooth wave, left to right, the stops a little up and down so their names never meet. Flown
   * lanes are thin grey, the route to the goal amber (the next jump solid with a glow, the rest dashed, each with a J tag),
   * the stops past the goal dotted. The Continuance Net, where it holds stops behind her, is a red hatched zone with a
   * dashed edge. Names are placed after drawing, clear of every node and of each other (chart.ts placeLabels).
   */
  private draw(): void {
    const c = this.c;
    if (!c) return;
    const map = $('co-map') as unknown as SVGSVGElement;
    const box = map.getBoundingClientRect();
    const W = Math.round(box.width) || 640, H = Math.round(box.height) || 320;
    map.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const at = c.road.findIndex((r) => r.state === 'here');
    const aimAt = c.road.findIndex((r, i) => i > at && r.name === c.aim.name);
    const nodes: MapNode[] = [
      ...(at < 0 ? [{ name: c.here.name, kind: c.here.kind, state: 'here' as const, gate: false, aim: false, jump: 0, net: false }] : []),
      ...c.road.map((r, i): MapNode => {
        const k = i - at; // jumps from here (at -1: the first stop is J1)
        const state: State = r.state === 'done' ? 'done' : r.state === 'here' ? 'here' : k === 1 ? 'next' : i <= aimAt ? 'route' : 'ahead';
        return { name: r.name, kind: r.kind, state, gate: r.kind === 'gate' || r.kind === 'edge', aim: i === aimAt, jump: state === 'next' || state === 'route' ? k : 0, day: r.day, net: r.net };
      }),
    ];
    const hereI = nodes.findIndex((n) => n.state === 'here');
    const kids: SVGElement[] = [];
    const defs = svg('defs', {});
    const grad = (id: string, col: string) => {
      const g = svg('radialGradient', { id });
      for (const [o, a] of [[0, 0.5], [0.3, 0.16], [1, 0]] as const) g.append(svg('stop', { offset: o, style: `stop-color:${col};stop-opacity:${a}` }));
      defs.append(g);
    };
    grad('co-h-amber', 'var(--pick)');
    grad('co-h-teal', 'var(--teal-bright)');
    // the Net's hatching: thin red diagonals
    const pat = svg('pattern', { id: 'co-hatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.append(svg('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'co-hatch' }));
    const fadeL = svg('linearGradient', { id: 'co-netfade', x1: 0, x2: 1, y1: 0, y2: 0 });
    fadeL.append(svg('stop', { offset: 0, style: 'stop-color:var(--white);stop-opacity:.25' }), svg('stop', { offset: 1, style: 'stop-color:var(--white);stop-opacity:1' }));
    const netMask = svg('mask', { id: 'co-netm' });
    netMask.append(svg('rect', { width: W, height: H, fill: 'url(#co-netfade)' }));
    defs.append(pat, fadeL, netMask);
    kids.push(defs);
    // the wave: stops alternate above and below the middle
    const small = W < 420, padX = small ? 30 : 64, step = (W - padX * 2) / Math.max(1, nodes.length - 1);
    const amp = Math.max(8, Math.min(H * 0.2, (H - 120) / 2, 90));
    const pts = nodes.map((_, i) => ({ x: padX + step * i, y: H * 0.47 + (i % 2 ? 1 : -1) * amp * (i % 3 === 0 ? 0.9 : 0.72) }));
    // the Net: a hatched zone over the stops it holds behind her, its edge dashed, chevrons pushing on
    if (c.net !== null && hereI >= 0) {
      const e = hereI - c.net, a = pts[e]!, b = pts[Math.min(pts.length - 1, e + 1)]!;
      const ex = e + 1 < pts.length ? (a.x + b.x) / 2 : a.x + step / 2;
      const g = svg('g', { class: 'co-net' });
      g.append(svg('rect', { x: 0, y: 0, width: ex, height: H, fill: 'url(#co-hatch)', mask: 'url(#co-netm)', class: 'co-netz' }));
      g.append(svg('path', { d: `M${ex - 6} ${H * 0.06}Q${ex + 8} ${H * 0.5} ${ex - 2} ${H * 0.94}`, class: 'co-nete' }));
      for (const fy of [0.3, 0.72]) g.append(svg('text', { x: ex + 6, y: H * fy, class: 'co-chev' }, '››'));
      if (!small) g.append(svg('text', { x: ex - 12, y: Math.max(14, H * 0.06 + 2), 'text-anchor': 'end', class: 'co-netc' }, t('Continuance Net').toUpperCase()));
      kids.push(g);
    }
    // a smooth curve through the stops (Catmull-Rom as cubic segments), one path per hop so each can take its own look
    const ctl = (i: number) => {
      const p0 = pts[Math.max(0, i - 2)]!, p1 = pts[i - 1]!, p2 = pts[i]!, p3 = pts[Math.min(pts.length - 1, i + 1)]!, k = 0.2;
      return [p1, { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k }, { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k }, p2] as const;
    };
    const f = (v: number) => v.toFixed(1);
    const tags: SVGElement[] = [];
    for (let i = 1; i < nodes.length; i++) {
      const [p1, c1, c2, p2] = ctl(i), d = `M${f(p1.x)} ${f(p1.y)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
      const n = nodes[i]!, look = n.state === 'done' || n.state === 'here' ? 'done' : n.state === 'next' ? 'next' : n.state === 'route' ? 'route' : 'ahead';
      if (look === 'next') kids.push(svg('path', { d, class: 'co-lane-glow' }));
      kids.push(svg('path', { d, class: `co-lane ${look}` }));
      if (n.jump && (!small || n.state === 'next')) {
        // the J tag at the middle of the hop (the cubic at t = 0.5), a little off the line
        const mx = (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8, my = (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8;
        const w = 30, hh = 17, x0 = mx + 8, y0 = my - hh / 2, cut = 4;
        const tag = svg('g', { class: `co-jtag${n.state === 'next' ? ' next' : ''}` });
        tag.append(svg('path', { d: `M${f(x0 + cut)} ${f(y0)}H${f(x0 + w)}V${f(y0 + hh - cut)}L${f(x0 + w - cut)} ${f(y0 + hh)}H${f(x0)}V${f(y0 + cut)}Z` }));
        tag.append(svg('text', { x: f(x0 + w / 2), y: f(y0 + hh / 2 + 4), 'text-anchor': 'middle' }, `J${n.jump}`));
        tag.append(svg('circle', { cx: f(mx), cy: f(my), r: 2 }));
        tags.push(tag);
      }
    }
    const labels: Array<{ g: SVGElement; x: number; y: number; r: number; up: boolean }> = [];
    const solids: Array<{ x: number; y: number; r: number }> = [];
    nodes.forEach((n, i) => {
      const { x, y } = pts[i]!, up = y < H * 0.47, k = small ? 0.8 : 1;
      const g = svg('g', { class: `co-s ${n.state}${n.gate ? ' gate' : ''}` });
      let r = 7 * k;
      if (n.gate) {
        r = 15 * k;
        if (n.state !== 'done') g.append(svg('circle', { cx: x, cy: y, r: 46 * k, fill: 'url(#co-h-amber)' }));
        const dia = (s: number, cls: string) => svg('path', { d: `M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`, class: cls });
        g.append(dia(15 * k, 'co-dia-o'), dia(8 * k, 'co-dia-i'));
      } else if (n.state === 'here') {
        r = 15 * k;
        g.append(svg('circle', { cx: x, cy: y, r: 40 * k, fill: 'url(#co-h-teal)' }));
        g.append(svg('circle', { cx: x, cy: y, r: 13 * k, class: 'co-here' }));
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) g.append(svg('line', { x1: x + dx * 16 * k, y1: y + dy * 16 * k, x2: x + dx * 21 * k, y2: y + dy * 21 * k, class: 'co-tick' }));
        g.append(svg('path', { d: `M${x} ${y - 7 * k}L${x + 5.5 * k} ${y + 5.5 * k}L${x} ${y + 2.5 * k}L${x - 5.5 * k} ${y + 5.5 * k}Z`, class: 'co-ship' }));
      } else if (n.state === 'next') {
        r = 15 * k;
        g.append(svg('circle', { cx: x, cy: y, r: 44 * k, fill: 'url(#co-h-amber)' }));
        g.append(svg('circle', { cx: x, cy: y, r: 15 * k, class: 'co-ring amber' }), svg('circle', { cx: x, cy: y, r: 10 * k, class: 'co-ring amber thick' }), svg('circle', { cx: x, cy: y, r: 4.5 * k, class: 'co-core amber' }));
      } else if (n.state === 'route') {
        r = 9 * k;
        g.append(svg('circle', { cx: x, cy: y, r: 9 * k, class: 'co-ring amber thick' }), svg('circle', { cx: x, cy: y, r: 3 * k, class: 'co-core amber' }));
      } else if (n.state === 'done') {
        g.append(svg('circle', { cx: x, cy: y, r: 7 * k, class: 'co-ring done' }), svg('circle', { cx: x, cy: y, r: 2.6 * k, class: 'co-core done' }));
      } else {
        g.append(svg('circle', { cx: x, cy: y, r: 6 * k, class: 'co-ring ahead' }), svg('circle', { cx: x, cy: y, r: 2.2 * k, class: 'co-core ahead' }));
      }
      // the Net holds it: a small red triangle beside it
      if (n.net) g.append(svg('path', { d: `M${x + r + 6} ${y - 3}l4 7h-8z`, class: 'co-tri' }));
      solids.push({ x, y, r: r + 4 });
      // the name in wide-tracked capitals, and one line under it: here and what it is, the jump and what it is, or the day flown
      const kind = n.gate ? t('Jump Gate') : t(KIND_WORD[n.kind]);
      const sub = n.state === 'here' ? `${t('Here')} · ${kind}`
        : n.state === 'done' ? (n.day ? t('Day {n}', { n: n.day }) : '')
        : n.jump ? `J${n.jump} · ${n.aim && !n.gate ? t('Goal') : kind}` : n.gate ? kind : '';
      const lab = svg('g', { class: `co-lab ${n.state}${n.gate ? ' gate' : ''}` });
      lab.append(svg('text', { x: 0, y: 0, 'text-anchor': 'middle', class: 'co-name' }, t(n.name).toUpperCase()));
      if (sub && (!small || n.state === 'here')) lab.append(svg('text', { x: 0, y: 15, 'text-anchor': 'middle', class: 'co-sub' }, sub.toUpperCase()));
      // on a small map only where she is and the goal are named (the panel names the next stop)
      if (small && n.state !== 'here' && !n.aim) lab.setAttribute('display', 'none');
      g.append(lab);
      labels.push({ g: lab, x, y, r: r + 2, up });
      kids.push(g);
    });
    kids.push(...tags);
    for (const tg of tags) { const c0 = tg.querySelector('circle')!; solids.push({ x: Number(c0.getAttribute('cx')) + 23, y: Number(c0.getAttribute('cy')), r: 14 }); }
    // past the goal: the next leg, faint, fading out
    if (c.legs.at + 1 < c.legs.names.length && !small) {
      kids.push(svg('text', { x: W - 16, y: H - 14, 'text-anchor': 'end', class: 'co-legnext' }, `${t('Leg {n} · {name}', { n: c.legs.at + 2, name: t(c.legs.names[c.legs.at + 1]!) }).toUpperCase()} ▸`));
    }
    map.replaceChildren(...kids);
    placeLabels(labels.filter((l) => l.g.getAttribute('display') !== 'none'), solids, W, H);
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

/** A stop's purpose as a sentence: a capital and a full stop. */
function sentence(s: string): string {
  const v = s.trim();
  return v ? `${v[0]!.toUpperCase()}${v.slice(1)}${/[.!?…]$/.test(v) ? '' : '.'}` : '';
}
