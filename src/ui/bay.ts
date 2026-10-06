import { UPGRADE, upgradeText } from '../content/upgrades';
import { FITTING, NODE, TAB_ORDER, TABS, WEB, type Budget, type Tab, type WebNode } from '../content/web';
import { blockOf, budgets, cost, maxLevel, type Block } from '../sim/bay';
import { upgradeFigures } from '../sim/build';
import type { World } from '../sim/world';
import { $, GUARD, h, keys, type PadEdges } from './dom';
import { icon, ICON } from './refit';
import { num, t } from '../i18n';

// ── the refit bay ─────────────────────────────────────────────────────────
// Where the ship is built (PLAN.md, R), after the reference board: the tabs
// down the left, the tab's web in the middle (left to right, tier by tier:
// fitted in amber, ready in teal, out of reach dimmed), the inspector on the
// right (what the selected module does, its figures before and after, what
// it draws, what it costs, Install), and along the bottom what is fitted in
// this tab and the ship's three budgets. The world waits while it is open.
//
// Keys: Q and E (or Tab) change tab, arrows move across the web, Enter
// installs, Esc or B launches. A pad: bumpers, stick, A, B. Touch: tap.

const TAB_ICON: Record<Tab, string> = {
  hull: 'i-hull', weapons: 'i-laser', ordnance: 'i-torp', engines: 'i-engine', defence: 'i-shield', utility: 'i-rock', reactor: 'i-core', synergies: 'i-link',
};
const FIT_ICON: Record<string, string> = { rx_core: 'i-core', rx_sinks: 'i-plasma', hl_frame: 'i-hull' };

/** Why an install is refused, in a few words. */
const WHY: Record<Block, string> = {
  full: 'Fully fitted',
  mode: 'Not in this mode',
  locked: 'Locked · unlock it between runs',
  tech: 'Destroy her capital ship first',
  path: 'Fit a module that leads here first',
  needs: 'Needs more of its system, or a rival is fitted',
  yard: 'Fitted only at a port',
  power: 'Not enough power · fit a bigger reactor core',
  krail: 'Not enough Krail',
};
const BUDGET_WORD: Record<keyof Budget, string> = { power: 'Power', mass: 'Mass', heat: 'Heat' };
/** What running over a soft rating costs (sim/budgets.ts). */
const OVER_WORD = { mass: 'Over the mass rating: slower to turn and to speed up', heat: 'Over the heat rating: the guns recharge and reload slower' } as const;

const nameOf = (id: string) => t(UPGRADE[id]?.name ?? FITTING[id]?.name ?? id);
const iconOf = (id: string) => FIT_ICON[id] ?? ICON[UPGRADE[id]?.branch ?? 'utility'];

/** A node's look: fitted (all, or some), ready to fit, in reach but short of Krail or power, or not yet open. */
function stateOf(world: World, id: string): 'max' | 'owned' | 'open' | 'short' | 'locked' {
  const lv = world.levels[id] ?? 0, b = blockOf(id, world.bayCtx());
  if (lv >= maxLevel(id)) return 'max';
  if (b === null) return lv ? 'owned' : 'open';
  if (b === 'krail' || b === 'power') return lv ? 'owned' : 'short';
  return lv ? 'owned' : 'locked';
}

export class BayPanel {
  private world: World | null = null;
  private onClose: (() => void) | null = null;
  private off: (() => void) | null = null;
  private opened = 0;
  private tab: Tab = 'weapons';
  private sel: string | null = null;

  constructor() {
    $('bay-x').addEventListener('click', (e) => { e.stopPropagation(); if (this.open) this.launch(); });
    // a tap on the bay never reaches the flight controls behind it
    $('bay').addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  get open(): boolean {
    return !$('bay').hidden;
  }

  show(world: World, onClose: () => void): void {
    this.close();
    this.world = world;
    this.onClose = onClose;
    this.opened = performance.now();
    if (!this.sel || NODE[this.sel]?.tab !== this.tab) this.sel = this.first();
    $('bay').hidden = false;
    this.render();
    this.off = keys((e) => {
      const c = e.code;
      if (c === 'Escape' || c === 'KeyB') return this.launch(), true;
      if (c === 'KeyQ' || (c === 'Tab' && e.shiftKey)) return this.step(-1), true;
      if (c === 'KeyE' || c === 'Tab') return this.step(1), true;
      const d = c === 'ArrowLeft' || c === 'KeyA' ? [-1, 0] : c === 'ArrowRight' || c === 'KeyD' ? [1, 0] : c === 'ArrowUp' || c === 'KeyW' ? [0, -1] : c === 'ArrowDown' || c === 'KeyS' ? [0, 1] : null;
      if (d) return this.move(d[0]!, d[1]!), true;
      if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') return this.fit(), true;
      const k = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].indexOf(c);
      if (k >= 0) return this.go(TAB_ORDER[k]!), true;
      return ['KeyF', 'KeyR', 'KeyZ', 'KeyP'].includes(c);
    }, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('bay').hidden = true;
  }

  /** A gamepad: bumpers change tab, the stick moves, A installs, B launches. */
  padInput(p: PadEdges): void {
    if (!this.world || performance.now() - this.opened < GUARD) return;
    if (p.lb) this.step(-1);
    else if (p.rb) this.step(1);
    else if (p.left || p.right || p.up || p.down) this.move(p.left ? -1 : p.right ? 1 : 0, p.up ? -1 : p.down ? 1 : 0);
    else if (p.a) this.fit();
    else if (p.b || p.back) this.launch();
  }

  private launch(): void {
    const done = this.onClose;
    this.close();
    done?.();
  }

  private go(tab: Tab): void {
    this.tab = tab;
    this.sel = this.first();
    this.render();
  }

  private step(d: number): void {
    const i = TAB_ORDER.indexOf(this.tab);
    this.go(TAB_ORDER[(i + d + TAB_ORDER.length) % TAB_ORDER.length]!);
  }

  /** The node to start on in a tab: the first ready to fit, else the first. */
  private first(): string | null {
    const nodes = WEB.filter((w) => w.tab === this.tab);
    const w = this.world;
    return (w && nodes.find((n) => stateOf(w, n.id) === 'open')?.id) ?? nodes[0]?.id ?? null;
  }

  /** Move the selection to the nearest node that way. */
  private move(dx: number, dy: number): void {
    const cur = this.sel ? NODE[this.sel] : null;
    if (!cur) return;
    let best: WebNode | null = null, bestD = Infinity;
    for (const w of WEB) {
      if (w.tab !== this.tab || w.id === cur.id) continue;
      const ex = w.tier - cur.tier, ey = w.row - cur.row;
      if ((dx && Math.sign(ex) !== dx) || (dy && Math.sign(ey) !== dy)) continue;
      const d = dx ? Math.abs(ex) * 10 + Math.abs(ey) : Math.abs(ey) * 10 + Math.abs(ex);
      if (d < bestD) { bestD = d; best = w; }
    }
    if (best) { this.sel = best.id; this.render(); }
  }

  private fit(): void {
    const w = this.world;
    if (!w || !this.sel) return;
    if (w.install(this.sel) === null) {
      const el = $('bay-insp');
      el.classList.remove('done');
      void el.offsetWidth;
      el.classList.add('done');
    }
    this.render();
  }

  // ── drawing ─────────────────────────────────────────────────────────────

  private render(): void {
    const w = this.world;
    if (!w) return;
    $('bay-krail').replaceChildren(icon('i-rock'), h('b', '', num(Math.floor(w.krail))), h('span', '', 'Krail'));
    this.tabs(w);
    this.web(w);
    this.inspector(w);
    this.footer(w);
  }

  private tabs(w: World): void {
    $('bay-tabs').replaceChildren(...TAB_ORDER.map((tab, i) => {
      const nodes = WEB.filter((n) => n.tab === tab);
      const fitted = nodes.reduce((a, n) => a + (w.levels[n.id] ?? 0), 0);
      const ready = nodes.some((n) => stateOf(w, n.id) === 'open');
      const b = h('button', `bay-tab${tab === this.tab ? ' on' : ''}${ready ? ' ready' : ''}`, '', icon(TAB_ICON[tab]), h('span', 'bt-n', t(TABS[tab].name)), h('b', 'bt-c', String(fitted)), h('kbd', 'only-desktop', String(i + 1))) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(tab === this.tab));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.go(tab); });
      return b;
    }));
  }

  private web(w: World): void {
    const nodes = WEB.filter((n) => n.tab === this.tab);
    const tiers = Math.max(...nodes.map((n) => n.tier)), rows = Math.max(...nodes.map((n) => n.row)) + 1;
    const X = (n: WebNode) => ((n.tier - 0.5) / Math.max(tiers, 3)) * 100;
    const Y = (n: WebNode) => ((n.row + 0.5) / Math.max(rows, 3)) * 100;
    $('bay-tab-h').replaceChildren(icon(TAB_ICON[this.tab]), h('span', 'bw-n', t(TABS[this.tab].name)), h('span', 'bw-s', t(TABS[this.tab].sub)));

    // the links behind, lit where both ends are fitted
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'bay-links');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    for (const n of nodes) {
      for (const f of n.from ?? []) {
        const a = NODE[f]!;
        const line = document.createElementNS(ns, 'path');
        const mx = (X(a) + X(n)) / 2;
        line.setAttribute('d', `M${X(a)} ${Y(a)} H${mx} V${Y(n)} H${X(n)}`);
        line.setAttribute('class', (w.levels[f] ?? 0) > 0 ? ((w.levels[n.id] ?? 0) > 0 ? 'lit' : 'open') : '');
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.append(line);
      }
    }
    // tier marks along the bottom
    const marks = h('div', 'bay-tiers');
    for (let i = 1; i <= Math.max(tiers, 3); i++) marks.append(h('span', '', `${t('Tier')} ${i}`));

    const field = h('div', 'bay-nodes');
    for (const n of nodes) {
      const st = stateOf(w, n.id), lv = w.levels[n.id] ?? 0, max = maxLevel(n.id);
      const b = h('button', `bay-node ${st}${n.id === this.sel ? ' sel' : ''}`) as HTMLButtonElement;
      b.type = 'button';
      b.style.left = `${X(n)}%`;
      b.style.top = `${Y(n)}%`;
      b.setAttribute('aria-label', `${nameOf(n.id)} · ${t('Lv')} ${lv}/${max}`);
      const pips = h('span', 'bn-pips');
      if (max > 1) for (let k = 1; k <= max; k++) pips.append(h('i', k <= lv ? 'on' : ''));
      b.append(h('span', 'bn-oct', '', icon(iconOf(n.id))), pips, h('span', 'bn-name', nameOf(n.id)));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.sel = n.id; this.render(); });
      field.append(b);
    }
    $('bay-web').replaceChildren(svg, field, marks);
  }

  private inspector(w: World): void {
    const id = this.sel;
    const el = $('bay-insp');
    if (!id) { el.replaceChildren(); return; }
    const u = UPGRADE[id], fit = FITTING[id], node = NODE[id]!;
    const lv = w.levels[id] ?? 0, max = maxLevel(id), next = Math.min(max, lv + 1);
    const ctx = w.bayCtx(), why = blockOf(id, ctx);

    const pips = h('span', 'bi-pips');
    for (let k = 1; k <= max; k++) pips.append(h('i', k <= lv ? 'on' : k === lv + 1 && lv < max ? 'add' : ''));
    const head = h('div', 'bi-h', '', h('span', 'bi-oct', '', icon(iconOf(id))), h('div', 'bi-hd', '', h('span', 'bi-tab', t(TABS[node.tab].name)), h('span', 'bi-name', nameOf(id)), h('span', 'bi-lv', '', h('span', '', `${t('Lv')} ${lv}/${max}`), pips)));
    const text = h('p', 'bi-text', t(u ? upgradeText(u, next) : fit!.text));
    const out: HTMLElement[] = [head, text];
    if (u?.note) out.push(h('p', 'bi-note', t(u.note)));

    // what the next level changes: the figures, then the budgets
    if (lv < max) {
      const figs = h('div', 'bi-figs');
      for (const f of upgradeFigures(w.levels, id, !w.bk).slice(0, 4)) {
        figs.append(h('div', `fig${f.cost ? ' cost' : ''}`, '', h('span', 'f-l', t(f.label)), h('span', 'f-v', '', h('s', '', t(f.from)), document.createTextNode(' → '), h('b', '', t(f.to)))));
      }
      const { use, cap } = budgets(w.levels);
      const warn: string[] = [];
      for (const k of ['power', 'mass', 'heat'] as const) {
        const d = node.draw[k] ?? 0, g = node.gives?.[k] ?? 0;
        if (!d && !g) continue;
        const after = g ? `${use[k]}/${cap[k] + g}` : `${use[k] + d}/${cap[k]}`;
        const over = !g && use[k] + d > cap[k];
        figs.append(h('div', `fig budget${over ? ' cost' : ''}`, '', h('span', 'f-l', t(BUDGET_WORD[k])), h('span', 'f-v', '', h('s', '', `${use[k]}/${cap[k]}`), document.createTextNode(' → '), h('b', '', after))));
        // what running over will cost, in words
        if (over && k !== 'power') warn.push(t(OVER_WORD[k]));
      }
      out.push(figs, ...warn.map((x) => h('p', 'bi-warn', x)));
    }

    // the price, and the button
    const price = lv < max ? cost(id, lv + 1) : 0;
    if (lv < max) out.push(h('div', `bi-cost${why === 'krail' ? ' short' : ''}`, '', h('span', 'bc-l', t('Cost')), icon('i-rock'), h('b', '', num(price)), h('span', '', 'Krail')));
    const btn = h('button', 'bi-go', why ? t(WHY[why]) : t('Install')) as HTMLButtonElement;
    btn.type = 'button';
    btn.disabled = !!why;
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.fit(); });
    out.push(btn);
    el.replaceChildren(...out);
  }

  private footer(w: World): void {
    // fitted in this tab
    const fitted = WEB.filter((n) => n.tab === this.tab && (w.levels[n.id] ?? 0) > 0);
    $('bay-fitted').replaceChildren(
      h('span', 'bf-h', `${t(TABS[this.tab].name)} · ${t('fitted')}`),
      ...(fitted.length ? fitted.map((n) => {
        const lv = w.levels[n.id] ?? 0, max = maxLevel(n.id);
        const pips = h('span', 'bi-pips');
        for (let k = 1; k <= max; k++) pips.append(h('i', k <= lv ? 'on' : ''));
        return h('span', 'bf-m', '', icon(iconOf(n.id)), h('span', 'bf-n', nameOf(n.id)), pips);
      }) : [h('span', 'bf-none', t('Nothing yet'))]),
    );
    // the three budgets, with what the selected module would take
    const { use, cap } = budgets(w.levels);
    const sel = this.sel ? NODE[this.sel] : null, can = sel && (w.levels[sel.id] ?? 0) < maxLevel(sel.id);
    $('bay-budget').replaceChildren(h('span', 'bf-h', t('Ship overview')), ...(['power', 'mass', 'heat'] as const).map((k) => {
      const add = can ? sel!.draw[k] ?? 0 : 0;
      const bar = h('i', `bb-bar${use[k] > cap[k] ? ' over' : ''}`);
      bar.style.setProperty('--v', Math.min(1, use[k] / cap[k]).toFixed(3));
      bar.style.setProperty('--a', Math.min(1, (use[k] + add) / cap[k]).toFixed(3));
      return h('span', `bb ${k}`, '', h('span', 'bb-l', t(BUDGET_WORD[k])), bar, h('b', 'bb-v', `${use[k]}/${cap[k]}`));
    }));
  }
}
