import { BRANCHES, UPGRADE, upgradeText, type UpgradeDef } from '../content/upgrades';
import { REGION_LABELS, WEB, WEB_NODE, type WebNode } from '../content/web';
import { branchLevels, computeStats, figures, identity, upgradeFigures, type Fig } from '../sim/build';
import { closed, suggest, type Closed, type WebView } from '../sim/web';
import type { World } from '../sim/world';
import { NEON_CSS } from './colors';
import { $, GUARD, h, keys, type PadEdges } from './dom';

// ── the refit web, on screen ──────────────────────────────────────────────
// A map of every node, to pan and zoom (drag, wheel, pinch, + and −), with
// an inspector for the node under the cursor or the selection, and three
// suggestions for a quick pick. Tap or click a node to look at it; tap it
// again, or press Enter, to fit it. Keys: arrows move across the web, Tab
// steps through what can be fitted, 1 2 3 fit a suggestion, Esc launches
// (points left over stay banked). A pad: the stick or d-pad moves, A fits,
// LB and RB step through what can be fitted, Y frames, B launches.

const U = 40; // pixels per web unit at zoom 1
const NS = 'http://www.w3.org/2000/svg';
const K_MIN = 0.35;
const K_MAX = 3.2;

const KIND_WORD: Record<string, string> = {
  core: 'Your ship', minor: 'Minor node', stat: 'Upgrade', system: 'System', spec: 'Specialisation', synergy: 'Synergy', tech: 'Salvaged tech',
};
/** Node radius, in web units, by kind. */
const SIZE: Record<string, number> = { core: 0.5, minor: 0.15, stat: 0.23, system: 0.33, spec: 0.43, synergy: 0.31, tech: 0.3 };
const CAT_COLOUR = { weapons: 'var(--red-2)', defence: 'var(--ink)', ship: 'var(--violet)' } as const;
const SYNERGY = '#e9c9ff';
const FACTION_WORD: Record<string, string> = { klingon: 'Klingon', cardassian: 'Cardassian', romulan: 'Romulan', borg: 'Borg', tholian: 'Tholian' };

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, ...kids: SVGElement[]): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  for (const c of kids) e.append(c);
  return e;
}

const px = (n: WebNode) => n.x * U;
const py = (n: WebNode) => -n.y * U;

/** A regular polygon's points, radius r, turned by `rot`. */
function poly(sides: number, r: number, rot = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** The node's mark: a ring for the core, circles for minors and upgrades, a hexagon for a system, diamonds for specialisations and synergies, an octagon for tech. */
function shape(kind: string, r: number, cls = 's'): SVGElement {
  switch (kind) {
    case 'system': return el('polygon', { class: cls, points: poly(6, r, Math.PI / 6) });
    case 'spec': case 'synergy': return el('polygon', { class: cls, points: poly(4, r, 0) });
    case 'tech': return el('polygon', { class: cls, points: poly(8, r, Math.PI / 8) });
    default: return el('circle', { class: cls, r: r.toFixed(1) });
  }
}

export function nodeColour(n: WebNode): string {
  const u = n.up ? UPGRADE[n.up] : null;
  if (!u) return 'var(--ink)';
  if (u.tech) return NEON_CSS[u.tech];
  if (u.kind === 'spec') return 'var(--amber)';
  if (u.branch === 'synergy') return SYNERGY;
  return CAT_COLOUR[u.cat];
}

/** Every link once. */
const EDGES: ReadonlyArray<[string, string]> = (() => {
  const out: Array<[string, string]> = [];
  for (const n of WEB) for (const l of n.links) if (n.id < l) out.push([n.id, l]);
  return out;
})();

/** Where a node sits on the wheel, for stepping through nodes in a sensible order. */
const AROUND = (n: WebNode) => (Math.atan2(n.y, n.x) + Math.PI * 2.5) % (Math.PI * 2);

/** Why a node is closed, in words. */
function reason(n: WebNode, c: Closed, v: WebView, points: number): string {
  const u = n.up ? UPGRADE[n.up]! : null;
  switch (c) {
    case 'fitted': return n.up ? 'Fitted.' : 'Your ship. Every route starts here.';
    case 'unreached': return 'Out of reach: fit a node joined to it first.';
    case 'locked': return 'Locked: long-term progression opens it (see the logbook).';
    case 'tech': return `Salvage: destroy a ${FACTION_WORD[u!.tech!]} capital ship this run to open it.`;
    case 'taken': {
      const other = Object.keys(v.levels).map((id) => UPGRADE[id]).find((o) => o && o.group === u!.group && (v.levels[o.id] ?? 0) > 0);
      return `One ${BRANCHES[u!.branch].name.toLowerCase()} specialisation a run: you fitted ${other?.name ?? 'another'}.`;
    }
    case 'needs': return needs(u!, v);
    case 'maxed': return `${u!.name} is at its highest level.`;
    default: return points > 0 ? '' : 'No points left: the next refit brings more.';
  }
}

function needs(u: UpgradeDef, v: WebView): string {
  const parts: string[] = [];
  for (const r of u.requires ?? []) {
    const have = v.levels[r.id] ?? 0, want = r.lv ?? 1;
    if (have < want) parts.push(want > 1 ? `${UPGRADE[r.id]!.name} ${want} (you have ${have})` : UPGRADE[r.id]!.name);
  }
  if (u.group && u.needs) {
    const have = branchLevels(v.levels, u.branch);
    if (have < u.needs) parts.push(`${u.needs} levels in ${BRANCHES[u.branch].name.toLowerCase()} (you have ${have})`);
  }
  return parts.length ? `Needs ${parts.join(' and ')}.` : 'Not yet.';
}

/** The figure rows, before → after. */
function figRows(figs: Fig[], max = 6): HTMLElement {
  const box = h('div', 'figs');
  for (const f of figs.slice(0, max)) box.append(h('span', f.cost ? 'cost' : '', f.label, h('b', '', `${f.from} → ${f.to}`)));
  return box;
}

const present = (...xs: Array<Node | null>): Node[] => xs.filter((x): x is Node => x !== null);

interface Cam { x: number; y: number; k: number; }

export class WebPanel {
  private world: World | null = null;
  private auto = false;
  private onClose: (() => void) | null = null;
  private off: (() => void) | null = null;
  private opened = 0;
  private sel = 'core';
  private hover: string | null = null;
  private sugg: string[] = [];
  private closeT = 0;
  private built = false;
  private readonly nodes = new Map<string, SVGGElement>();
  private readonly lines: Array<{ a: string; b: string; e: SVGLineElement }> = [];
  private cam: Cam = { x: 0, y: 0, k: 1 };
  private goal: Cam = { x: 0, y: 0, k: 1 };
  private raf = 0;
  private lastT = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private drag: { x: number; y: number; moved: boolean; pinch: number; cx: number; cy: number } | null = null;

  get open(): boolean {
    return !$('web').hidden;
  }

  /** Open on the world's web. `auto`: opened by a refit, so it closes itself once the points are spent. */
  show(world: World, auto: boolean, onClose: () => void): void {
    this.close(false);
    this.build();
    this.world = world;
    this.auto = auto;
    this.onClose = onClose;
    this.opened = performance.now();
    this.hover = null;
    $('web').hidden = false;
    document.documentElement.classList.add('webopen');
    this.refresh();
    this.sel = this.sugg[0] ?? 'core';
    this.paint();
    this.frame(true);
    this.off = keys((e) => this.key(e), ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Equal', 'Minus', 'Tab']);
  }

  close(notify = true): void {
    clearTimeout(this.closeT);
    this.closeT = 0;
    this.off?.();
    this.off = null;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.open) $('web').hidden = true;
    document.documentElement.classList.remove('webopen');
    const cb = this.onClose;
    this.onClose = null;
    if (notify && this.world) { this.world.closeRefit(); cb?.(); }
  }

  /** A gamepad on the web. */
  padInput(p: PadEdges): void {
    if (!this.world || performance.now() - this.opened < GUARD) return;
    if (p.left) this.move(-1, 0);
    else if (p.right) this.move(1, 0);
    else if (p.up) this.move(0, -1);
    else if (p.down) this.move(0, 1);
    if (p.a) this.fit(this.sel);
    if (p.lb || p.rb) this.cycle(p.lb ? -1 : 1);
    if (p.y) this.frame(false);
    if (p.x) this.zoomBy(this.goal.k < 1.4 ? 1.6 : 1 / 1.6);
    if (p.b || p.back) this.close();
  }

  // ── building the map ────────────────────────────────────────────────

  private build(): void {
    if (this.built) return;
    this.built = true;
    const svg = $('web-svg') as unknown as SVGSVGElement;
    const cam = el('g', { class: 'cam' });
    // the tech ring and the region labels
    const tech = WEB.filter((n) => n.kind === 'tech');
    const tr = tech.length ? Math.hypot(tech[0]!.x, tech[0]!.y) * U : 0;
    const under = el('g', { class: 'under' }, el('circle', { class: 'ring', r: tr.toFixed(1) }));
    for (const l of REGION_LABELS) {
      const t = el('text', { class: 'region', x: (l.x * U).toFixed(1), y: (-l.y * U).toFixed(1) });
      t.textContent = BRANCHES[l.region].name;
      under.append(t);
    }
    const edges = el('g', { class: 'edges' });
    for (const [a, b] of EDGES) {
      const A = WEB_NODE.get(a)!, B = WEB_NODE.get(b)!;
      const e = el('line', { x1: px(A).toFixed(1), y1: py(A).toFixed(1), x2: px(B).toFixed(1), y2: py(B).toFixed(1) });
      edges.append(e);
      this.lines.push({ a, b, e });
    }
    const nodes = el('g', { class: 'nodes' });
    for (const n of WEB) {
      const r = SIZE[n.kind]! * U;
      const g = el('g', { class: 'n', transform: `translate(${px(n).toFixed(1)} ${py(n).toFixed(1)})` });
      g.style.setProperty('--c', nodeColour(n));
      g.dataset.k = n.kind;
      g.append(shape(n.kind, r * 1.9, 'halo'), shape(n.kind, r));
      if (n.kind === 'core') g.append(el('circle', { class: 'core-in', r: (r * 0.45).toFixed(1) }));
      const u = n.up ? UPGRADE[n.up] : null;
      const t = el('text', { class: 'lbl', y: (r + 13).toFixed(1) });
      t.textContent = u ? u.name : 'Core';
      const q = el('text', { class: 'qn', x: (-r - 14).toFixed(1), y: (-r * 0.4).toFixed(1) });
      g.append(t, q);
      nodes.append(g);
      this.nodes.set(n.id, g);
    }
    const sel = el('path', { class: 'reticle', d: '' });
    cam.append(under, edges, nodes, sel);
    svg.append(cam);

    const map = $('web-map');
    map.addEventListener('pointerdown', this.down);
    map.addEventListener('pointermove', this.moveP);
    map.addEventListener('pointerup', this.up);
    map.addEventListener('pointercancel', this.up);
    map.addEventListener('pointerleave', () => { if (this.hover) { this.hover = null; this.inspect(); } });
    map.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = map.getBoundingClientRect();
      this.zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016)), e.clientX - r.left, e.clientY - r.top, true);
    }, { passive: false });
    $('web-zin').addEventListener('click', () => this.zoomBy(1.4));
    $('web-zout').addEventListener('click', () => this.zoomBy(1 / 1.4));
    $('web-zfit').addEventListener('click', () => this.frame(false));
    $('web-x').addEventListener('click', (e) => { e.stopPropagation(); if (performance.now() - this.opened >= GUARD) this.close(); });
    for (const id of ['web-zin', 'web-zout', 'web-zfit', 'web-x']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  // ── state ────────────────────────────────────────────────────────────

  /** New suggestions and header after the web changes. */
  private refresh(): void {
    const w = this.world!;
    this.sugg = w.points > 0 ? suggest(w.web, w.seed ^ (w.refit * 7919) ^ (w.fitted.size * 104729)) : [];
    const pts = $('web-pts');
    pts.replaceChildren(
      h('span', 'pips', '', ...Array.from({ length: Math.min(w.points, 8) }, () => h('i'))),
      h('b', '', String(w.points)),
      h('span', 'k', w.points === 1 ? 'point' : 'points'),
    );
    pts.classList.toggle('none', w.points === 0);
    $('web-k').textContent = this.auto ? `Field refit · ${String(w.refit).padStart(2, '0')}` : 'Refit web';
    $('web-t').textContent = w.points > 0 ? (w.points === 1 ? 'Fit one more node' : `Fit ${w.points} nodes`) : 'Your ship';
    $('web-ship').replaceChildren(h('span', '', 'Your ship · '), h('b', '', identity(w.levels).title));
    $('web-x').firstChild!.textContent = w.points > 0 ? 'Bank and launch ' : 'Launch ';
    const quick = $('web-quick');
    quick.replaceChildren(...this.sugg.map((id, i) => {
      const n = WEB_NODE.get(id)!, u = UPGRADE[n.up!]!;
      const b = h('button', 'wq', '', h('kbd', '', String(i + 1)), h('span', 'nm', u.name),
        h('span', 'rg', `${u.branch === 'synergy' ? 'Bridge' : BRANCHES[u.branch].name} · ${KIND_WORD[n.kind]}`));
      b.style.setProperty('--c', nodeColour(n));
      b.setAttribute('type', 'button');
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', () => {
        if (performance.now() - this.opened < GUARD) return;
        if (this.sel === id) this.fit(id);
        else { this.select(id); }
      });
      return b;
    }));
    quick.parentElement!.classList.toggle('empty', !this.sugg.length);
  }

  /** Every node's and link's look. */
  private paint(): void {
    const w = this.world!, v = w.web;
    const state = new Map<string, Closed>();
    for (const n of WEB) state.set(n.id, closed(n, v));
    for (const n of WEB) {
      const g = this.nodes.get(n.id)!, c = state.get(n.id)!;
      const cls = c === 'fitted' ? 'fit' : c === null ? (w.points > 0 ? 'open' : 'can') : c === 'unreached' ? 'far' : 'shut';
      const q = this.sugg.indexOf(n.id);
      g.setAttribute('class', `n ${cls}${n.id === this.sel ? ' sel' : ''}${q >= 0 ? ' sug' : ''}${c === 'locked' || c === 'tech' ? ' lock' : ''}`);
      g.lastChild!.textContent = q >= 0 ? String(q + 1) : '';
    }
    for (const l of this.lines) {
      const a = state.get(l.a), b = state.get(l.b);
      const on = a === 'fitted' && b === 'fitted';
      const lead = (a === 'fitted' && b === null) || (b === 'fitted' && a === null);
      const near = a === 'fitted' || b === 'fitted';
      l.e.setAttribute('class', on ? 'on' : lead ? 'lead' : near ? 'near' : '');
    }
    this.reticle();
    this.inspect();
  }

  private reticle(): void {
    const n = WEB_NODE.get(this.sel)!;
    const r = SIZE[n.kind]! * U + 7, l = Math.max(5, r * 0.45), x = px(n), y = py(n);
    const c = (sx: number, sy: number) => `M${x + sx * r} ${y + sy * (r - l)}V${y + sy * r}H${x + sx * (r - l)}`;
    $('web-svg').querySelector('.reticle')!.setAttribute('d', c(-1, -1) + c(1, -1) + c(-1, 1) + c(1, 1));
  }

  // ── the inspector ───────────────────────────────────────────────────

  private inspect(): void {
    const w = this.world!, v = w.web;
    const n = WEB_NODE.get(this.hover ?? this.sel)!;
    const box = $('web-insp');
    const c = closed(n, v);
    box.style.setProperty('--c', nodeColour(n));
    if (!n.up) {
      // the core: the ship as it stands, against the stock hull
      const figs = figures(computeStats({}), computeStats(w.levels));
      box.replaceChildren(...present(
        h('div', 'wi-path', '', h('i'), h('span', '', 'Core')),
        h('h3', '', identity(w.levels).title),
        h('p', 'ben', `${w.fitted.size - 1} node${w.fitted.size === 2 ? '' : 's'} fitted. Every route out starts here; salvaged tech rings the core.`),
        figs.length ? h('div', 'wi-sub k', 'Against the stock hull') : null,
        figs.length ? figRows(figs, 12) : h('p', 'cav', 'Stock: twin phasers, three plates, nothing else fitted.'),
      ));
      return;
    }
    const u = UPGRADE[n.up]!;
    const lv = v.levels[u.id] ?? 0;
    const path = u.tech ? `Salvage · ${FACTION_WORD[u.tech]}` : u.branch === 'synergy'
      ? (u.requires?.length ? u.requires.map((r) => BRANCHES[UPGRADE[r.id]!.branch].name).join(' + ') : 'Bridge')
      : BRANCHES[u.branch].name;
    const fitted = c === 'fitted';
    const level = u.max > 1 ? (fitted ? `${u.name} at level ${lv} of ${u.max}` : `Level ${lv} → ${lv + 1} · of ${u.max}`) : fitted ? 'Fitted' : lv ? 'Fitted elsewhere' : 'One level';
    const why = reason(n, c, v, w.points);
    const can = c === null && w.points > 0;
    const fit = h('button', 'wi-fit', can ? 'Fit · 1 point ' : fitted ? 'Fitted' : 'Cannot fit', can ? h('kbd', '', 'Enter') : null);
    fit.setAttribute('type', 'button');
    (fit as HTMLButtonElement).disabled = !can;
    fit.addEventListener('pointerdown', (e) => e.stopPropagation());
    fit.addEventListener('click', () => { if (performance.now() - this.opened >= GUARD) this.fit(n.id); });
    const figs = !fitted && c !== 'maxed' ? upgradeFigures(v.levels, u.id) : [];
    box.replaceChildren(...present(
      h('div', 'wi-path', '', h('i'), h('span', '', path), h('span', `wi-tag ${n.kind}`, KIND_WORD[n.kind] ?? '')),
      h('h3', '', u.name),
      h('div', 'wi-lv', level),
      h('p', 'ben', upgradeText(u, fitted ? Math.max(1, lv) : lv + 1)),
      u.note ? h('p', 'cav', u.note) : null,
      figs.length ? figRows(figs) : null,
      why ? h('p', `wi-why ${c ?? ''}`, why) : null,
      fit,
    ));
  }

  // ── actions ─────────────────────────────────────────────────────────

  private select(id: string, pan = true): void {
    this.sel = id;
    this.hover = null;
    this.paint();
    if (pan) this.keepInView(id);
  }

  private fit(id: string): void {
    const w = this.world;
    if (!w || !w.fit(id)) {
      // a refused fit says why, on the node
      if (w && id !== this.sel) this.select(id);
      const g = this.nodes.get(id);
      g?.classList.add('no');
      setTimeout(() => g?.classList.remove('no'), 380);
      return;
    }
    const g = this.nodes.get(id)!;
    this.refresh();
    this.sel = id;
    this.paint();
    g.classList.add('just');
    setTimeout(() => g.classList.remove('just'), 700);
    // the selection stays on what was fitted, so the next step is an arrow away
    if (w.points <= 0 && this.auto) this.closeT = window.setTimeout(() => this.close(), 750);
  }

  private cycle(dir: 1 | -1): void {
    const w = this.world!, v = w.web;
    const list = WEB.filter((n) => closed(n, v) === null).sort((a, b) => AROUND(a) - AROUND(b));
    if (!list.length) return;
    const cur = WEB_NODE.get(this.sel)!, at = AROUND(cur);
    let i = list.findIndex((n) => n.id === cur.id);
    if (i < 0) {
      i = list.findIndex((n) => AROUND(n) > at);
      if (dir < 0) i = (i < 0 ? list.length : i) - 1;
      else if (i < 0) i = 0;
    } else i = (i + dir + list.length) % list.length;
    this.select(list[i]!.id);
  }

  /** Arrow keys: the nearest node in that direction on screen, links first. */
  private move(dx: number, dy: number): void {
    const cur = WEB_NODE.get(this.sel)!;
    let best: WebNode | null = null, bestS = Infinity;
    for (const n of WEB) {
      if (n === cur) continue;
      const vx = px(n) - px(cur), vy = py(n) - py(cur), d = Math.hypot(vx, vy);
      const cos = (vx * dx + vy * dy) / d;
      if (cos < 0.45) continue;
      let s = d * (2.2 - cos * 1.2);
      if (cur.links.includes(n.id)) s *= 0.55;
      if (s < bestS) { bestS = s; best = n; }
    }
    if (best) this.select(best.id);
  }

  private key(e: KeyboardEvent): boolean {
    const c = e.code;
    if (c === 'Escape' || c === 'KeyR' || c === 'Backspace') { this.close(); return true; }
    const q = ['Digit1', 'Digit2', 'Digit3'].indexOf(c) >= 0 ? ['Digit1', 'Digit2', 'Digit3'].indexOf(c) : ['Numpad1', 'Numpad2', 'Numpad3'].indexOf(c);
    if (q >= 0) { const id = this.sugg[q]; if (id) this.fit(id); return true; }
    if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyF') { this.fit(this.sel); return true; }
    if (c === 'Tab') { this.cycle(e.shiftKey ? -1 : 1); return true; }
    if (c === 'ArrowLeft' || c === 'KeyA') { this.move(-1, 0); return true; }
    if (c === 'ArrowRight' || c === 'KeyD') { this.move(1, 0); return true; }
    if (c === 'ArrowUp' || c === 'KeyW') { this.move(0, -1); return true; }
    if (c === 'ArrowDown' || c === 'KeyS') { this.move(0, 1); return true; }
    if (c === 'Equal' || c === 'NumpadAdd') { this.zoomBy(1.3); return true; }
    if (c === 'Minus' || c === 'NumpadSubtract') { this.zoomBy(1 / 1.3); return true; }
    if (c === 'Digit0' || c === 'KeyC' || c === 'Home') { this.frame(false); return true; }
    if (c === 'KeyX' || c === 'KeyE') { this.select('core'); return true; }
    return ['KeyP', 'KeyK', 'KeyJ', 'ShiftLeft', 'ShiftRight', 'Digit2', 'Numpad2'].includes(c);
  }

  // ── the camera ──────────────────────────────────────────────────────

  private size(): { w: number; h: number } {
    const r = $('web-map').getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

  /** Frame what matters now: what is fitted and what can be fitted next, never closer than a ring of regions. */
  private frame(snap: boolean): void {
    const w = this.world!, v = w.web, { w: W, h: H } = this.size();
    const show = WEB.filter((n) => w.fitted.has(n.id) || closed(n, v) === null);
    // at least the core, its tech ring and the first steps out; more room on a wide screen
    const m = (Math.min(W, H) < 560 ? 4 : 6.5) * U;
    let x0 = -m, x1 = m, y0 = -m, y1 = m;
    for (const n of show) { x0 = Math.min(x0, px(n)); x1 = Math.max(x1, px(n)); y0 = Math.min(y0, py(n)); y1 = Math.max(y1, py(n)); }
    const pad = 1.4 * U;
    const k = Math.min(K_MAX, Math.max(K_MIN, Math.min(W / (x1 - x0 + pad * 2), H / (y1 - y0 + pad * 2))));
    this.goal = { k, x: W / 2 - ((x0 + x1) / 2) * k, y: H / 2 - ((y0 + y1) / 2) * k };
    if (snap) this.cam = { ...this.goal };
    this.animate();
  }

  private zoomBy(f: number): void {
    const { w, h } = this.size();
    this.zoomAt(f, w / 2, h / 2, false);
  }

  private zoomAt(f: number, sx: number, sy: number, snap: boolean): void {
    const g = snap ? this.cam : this.goal;
    const k = Math.min(K_MAX, Math.max(K_MIN, g.k * f)), r = k / g.k;
    const next = { k, x: sx - (sx - g.x) * r, y: sy - (sy - g.y) * r };
    this.goal = next;
    if (snap) this.cam = { ...next };
    this.animate();
  }

  /** Pan just enough to keep a node clear of the edges. */
  private keepInView(id: string): void {
    const n = WEB_NODE.get(id)!, { w: W, h: H } = this.size(), g = this.goal;
    const m = Math.min(90, W * 0.2, H * 0.2);
    const sx = px(n) * g.k + g.x, sy = py(n) * g.k + g.y;
    const dx = sx < m ? m - sx : sx > W - m ? W - m - sx : 0;
    const dy = sy < m ? m - sy : sy > H - m ? H - m - sy : 0;
    if (!dx && !dy) return;
    this.goal = { ...g, x: g.x + dx, y: g.y + dy };
    this.animate();
  }

  private animate(): void {
    if (this.raf) return;
    this.lastT = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastT) / 1000);
      this.lastT = now;
      const a = 1 - Math.exp(-dt * 16), c = this.cam, g = this.goal;
      c.x += (g.x - c.x) * a; c.y += (g.y - c.y) * a; c.k += (g.k - c.k) * a;
      const done = Math.abs(g.x - c.x) < 0.3 && Math.abs(g.y - c.y) < 0.3 && Math.abs(g.k - c.k) < 0.001;
      if (done) this.cam = { ...g };
      this.apply();
      this.raf = done || !this.open ? 0 : requestAnimationFrame(tick);
    };
    this.apply();
    this.raf = requestAnimationFrame(tick);
  }

  private apply(): void {
    const c = this.cam, svg = $('web-svg');
    svg.querySelector('.cam')!.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${c.k.toFixed(4)})`);
    svg.style.setProperty('--k', c.k.toFixed(4));
    // labels come in as the map comes closer: the big nodes first
    svg.classList.toggle('z-mid', c.k >= 0.72);
    svg.classList.toggle('z-near', c.k >= 1.25);
  }

  // ── pointers: drag to pan, pinch or wheel to zoom, tap to look and tap again to fit ──

  /** The node nearest a point on screen, within reach of a finger. */
  private nodeAt(sx: number, sy: number, reach: number): string | null {
    const c = this.cam;
    let best: string | null = null, bestD = Infinity;
    for (const n of WEB) {
      const d = Math.hypot(px(n) * c.k + c.x - sx, py(n) * c.k + c.y - sy) - SIZE[n.kind]! * U * c.k;
      if (d < reach && d < bestD) { bestD = d; best = n.id; }
    }
    return best;
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const r = $('web-map').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down = (e: PointerEvent): void => {
    if (!this.world) return;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    ($('web-map') as HTMLElement).setPointerCapture?.(e.pointerId);
    if (this.pointers.size === 1) this.drag = { x: p.x, y: p.y, moved: false, pinch: 0, cx: p.x, cy: p.y };
    else if (this.pointers.size === 2 && this.drag) {
      const [a, b] = [...this.pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      this.drag.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      this.drag.cx = (a.x + b.x) / 2; this.drag.cy = (a.y + b.y) / 2;
      this.drag.moved = true;
    }
  };

  private moveP = (e: PointerEvent): void => {
    if (!this.world) return;
    const p = this.local(e);
    if (!this.pointers.has(e.pointerId)) {
      // a mouse hovering: the inspector follows it
      if (e.pointerType === 'mouse') {
        const id = this.nodeAt(p.x, p.y, 10);
        if (id !== this.hover) { this.hover = id; this.inspect(); }
      }
      return;
    }
    const prev = this.pointers.get(e.pointerId)!;
    this.pointers.set(e.pointerId, p);
    const d = this.drag;
    if (!d) return;
    if (this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      this.cam.x += cx - d.cx; this.cam.y += cy - d.cy;
      this.goal = { ...this.cam };
      if (d.pinch > 0) this.zoomAt(dist / d.pinch, cx, cy, true);
      d.pinch = dist; d.cx = cx; d.cy = cy;
      return;
    }
    if (!d.moved && Math.hypot(p.x - d.x, p.y - d.y) > 7) d.moved = true;
    if (d.moved) {
      this.cam.x += p.x - prev.x; this.cam.y += p.y - prev.y;
      this.goal = { ...this.cam };
      this.apply();
    }
  };

  private up = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    const p = this.local(e);
    this.pointers.delete(e.pointerId);
    const d = this.drag;
    if (this.pointers.size) return;
    this.drag = null;
    if (!d || d.moved || e.type === 'pointercancel' || performance.now() - this.opened < GUARD) return;
    const id = this.nodeAt(p.x, p.y, e.pointerType === 'mouse' ? 10 : 22);
    if (!id) return;
    if (id === this.sel) this.fit(id);
    else this.select(id, false);
  };
}

// ── the web in miniature, for the run report ──────────────────────────────

/** The whole web, small and still, with a run's route lit. */
export function miniWeb(fitted: Iterable<string>): SVGSVGElement {
  const on = new Set(fitted);
  on.add('core');
  let r = 0;
  for (const n of WEB) r = Math.max(r, Math.hypot(n.x, n.y));
  r = (r + 0.8) * U;
  const svg = el('svg', { class: 'miniweb', viewBox: `${-r} ${-r} ${r * 2} ${r * 2}`, role: 'img', 'aria-label': `The refit web: ${on.size - 1} nodes fitted` });
  const edges = el('g', { class: 'edges' });
  for (const [a, b] of EDGES) {
    const A = WEB_NODE.get(a)!, B = WEB_NODE.get(b)!;
    edges.append(el('line', { class: on.has(a) && on.has(b) ? 'on' : '', x1: px(A).toFixed(0), y1: py(A).toFixed(0), x2: px(B).toFixed(0), y2: py(B).toFixed(0) }));
  }
  const nodes = el('g', { class: 'nodes' });
  for (const n of WEB) {
    const g = el('g', { class: `n ${on.has(n.id) ? 'fit' : 'far'}`, transform: `translate(${px(n).toFixed(0)} ${py(n).toFixed(0)})` });
    g.style.setProperty('--c', nodeColour(n));
    g.append(shape(n.kind, SIZE[n.kind]! * U * 1.15));
    nodes.append(g);
  }
  svg.append(edges, nodes);
  return svg;
}
