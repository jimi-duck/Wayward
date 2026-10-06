import { UPGRADE, upgradeText } from '../content/upgrades';
import { FITTING, NODE, TAB_ORDER, TABS, WEB, type Budget, type Tab, type WebNode } from '../content/web';
import { blockOf, budgets, cost, maxLevel, quickPicks, type Block } from '../sim/bay';
import { upgradeFigures } from '../sim/build';
import type { World } from '../sim/world';
import { $, GUARD, h, keys, type PadEdges } from './dom';
import { icon, nodeIcon } from './refit';
import { num, t } from '../i18n';

// ── the refit bay ─────────────────────────────────────────────────────────
// Where the ship is built (PLAN.md, R). Two ways in, for two kinds of player:
//
//   Suggested · the default: three modules that suit the ship as it is, as
//               big cards, one tap (or 1 2 3) to fit. Nothing to plan. With
//               Auto-refit on, the ship fits these by itself as you fly.
//   the tabs  · for whoever wants to build: each part of the ship as a small
//               web, left to right by tier (fitted amber, ready teal with its
//               price, the rest dimmed), and an inspector on the right.
//
// Along the bottom, the ship's three budgets. The world waits while the bay
// is open, so it opens any time.
//
// Keys: Q E (or Tab) change view, arrows move, Enter fits, 1 2 3 fit a
// suggestion, A toggles Auto-refit, Esc or B launches. A pad: bumpers,
// stick, A, Y for Auto-refit, B. Touch: tap.

type View = 'picks' | Tab;
const VIEWS: View[] = ['picks', ...TAB_ORDER];

const TAB_ICON: Record<View, string> = {
  picks: 'i-event', hull: 'i-hull', weapons: 'i-laser', ordnance: 'i-torp', engines: 'i-engine', defence: 'i-shield', utility: 'i-rock', reactor: 'i-core', synergies: 'i-link',
};

/** Why a module cannot be fitted, in a few words. */
const WHY: Record<Block, string> = {
  full: 'Fully fitted',
  mode: 'Not in this mode',
  locked: 'Locked · unlock it between runs',
  tech: 'Destroy her capital ship first',
  path: 'Fit the one before it first',
  needs: 'Needs more of its system, or a rival is fitted',
  yard: 'Fitted only at a port',
  power: 'Not enough power · fit a reactor core',
  krail: 'Not enough Krail',
};
const BUDGET_WORD: Record<keyof Budget, string> = { power: 'Power', mass: 'Mass', heat: 'Heat' };
/** What running over a soft rating costs (sim/budgets.ts). */
const OVER_WORD = { mass: 'Over the mass rating: slower to turn and to speed up', heat: 'Over the heat rating: the guns recharge and reload slower' } as const;

const nameOf = (id: string) => t(UPGRADE[id]?.name ?? FITTING[id]?.name ?? id);
const textOf = (id: string, lv: number) => t(UPGRADE[id] ? upgradeText(UPGRADE[id]!, lv) : FITTING[id]!.text);

/** A module's look: fitted (all, or some), ready to fit, in reach but short of Krail or power, or not yet open. */
function stateOf(world: World, id: string): 'max' | 'owned' | 'open' | 'short' | 'locked' {
  const lv = world.levels[id] ?? 0, b = blockOf(id, world.bayCtx());
  if (lv >= maxLevel(id)) return 'max';
  if (b === null) return lv ? 'owned' : 'open';
  if (b === 'krail' || b === 'power') return lv ? 'owned' : 'short';
  return lv ? 'owned' : 'locked';
}

/** A module's level as pips, the next one (if any) marked. */
function pips(lv: number, max: number, next = false): HTMLElement {
  const p = h('span', 'bi-pips');
  for (let k = 1; k <= max; k++) p.append(h('i', k <= lv ? 'on' : next && k === lv + 1 ? 'add' : ''));
  return p;
}

export class BayPanel {
  private world: World | null = null;
  private onClose: (() => void) | null = null;
  private off: (() => void) | null = null;
  private opened = 0;
  private view: View = 'picks';
  private sel: string | null = null;
  /** The suggestion selected, in the Suggested view. */
  private pick = 0;
  /** Auto-refit, and what to tell when it is switched. */
  auto = false;
  onAuto: (on: boolean) => void = () => {};

  constructor() {
    $('bay-x').addEventListener('click', (e) => { e.stopPropagation(); if (this.open) this.launch(); });
    $('bay-auto').addEventListener('click', (e) => { e.stopPropagation(); this.toggleAuto(); });
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
    // the bay opens on the suggestions; the tabs are a step further in
    this.view = 'picks';
    this.pick = 0;
    $('bay').hidden = false;
    this.render();
    this.off = keys((e) => {
      const c = e.code;
      if (c === 'Escape' || c === 'KeyB') return this.launch(), true;
      if (c === 'KeyQ' || (c === 'Tab' && e.shiftKey)) return this.step(-1), true;
      if (c === 'KeyE' || c === 'Tab') return this.step(1), true;
      if (c === 'KeyA' && this.view === 'picks') return this.toggleAuto(), true;
      const d = c === 'ArrowLeft' ? [-1, 0] : c === 'ArrowRight' ? [1, 0] : c === 'ArrowUp' || c === 'KeyW' ? [0, -1] : c === 'ArrowDown' || c === 'KeyS' ? [0, 1] : null;
      if (d) return this.move(d[0]!, d[1]!), true;
      if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') return this.fit(), true;
      const k = ['Digit1', 'Digit2', 'Digit3'].indexOf(c);
      if (k >= 0 && this.view === 'picks') return this.fitPick(k), true;
      return ['KeyF', 'KeyR', 'KeyZ', 'KeyP', 'KeyD'].includes(c);
    }, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('bay').hidden = true;
  }

  /** A gamepad: bumpers change view, the stick moves, A fits, Y switches Auto-refit, B launches. */
  padInput(p: PadEdges): void {
    if (!this.world || performance.now() - this.opened < GUARD) return;
    if (p.lb) this.step(-1);
    else if (p.rb) this.step(1);
    else if (p.left || p.right || p.up || p.down) this.move(p.left ? -1 : p.right ? 1 : 0, p.up ? -1 : p.down ? 1 : 0);
    else if (p.a) this.fit();
    else if (p.y) this.toggleAuto();
    else if (p.b || p.back) this.launch();
  }

  private launch(): void {
    const done = this.onClose;
    this.close();
    done?.();
  }

  private toggleAuto(): void {
    this.auto = !this.auto;
    this.onAuto(this.auto);
    this.render();
  }

  private go(view: View): void {
    this.view = view;
    this.pick = 0;
    this.sel = view === 'picks' ? null : this.first(view);
    this.render();
  }

  private step(d: number): void {
    const i = VIEWS.indexOf(this.view);
    this.go(VIEWS[(i + d + VIEWS.length) % VIEWS.length]!);
  }

  /** The module to start on in a tab: the first ready to fit, else the first. */
  private first(tab: Tab): string | null {
    const nodes = WEB.filter((w) => w.tab === tab);
    const w = this.world;
    return (w && nodes.find((n) => stateOf(w, n.id) === 'open')?.id) ?? nodes[0]?.id ?? null;
  }

  /** Move: across the suggestions, or to the nearest module that way in the web. */
  private move(dx: number, dy: number): void {
    if (this.view === 'picks') {
      const n = this.picks().length;
      if (dx && n) { this.pick = (this.pick + dx + n) % n; this.render(); }
      return;
    }
    const cur = this.sel ? NODE[this.sel] : null;
    if (!cur) return;
    let best: WebNode | null = null, bestD = Infinity;
    for (const w of WEB) {
      if (w.tab !== cur.tab || w.id === cur.id) continue;
      const ex = w.tier - cur.tier, ey = w.row - cur.row;
      if ((dx && Math.sign(ex) !== dx) || (dy && Math.sign(ey) !== dy)) continue;
      const d = dx ? Math.abs(ex) * 10 + Math.abs(ey) : Math.abs(ey) * 10 + Math.abs(ex);
      if (d < bestD) { bestD = d; best = w; }
    }
    if (best) { this.sel = best.id; this.render(); }
  }

  private picks(): WebNode[] {
    return this.world ? quickPicks(this.world.bayCtx()) : [];
  }

  private fit(): void {
    if (this.view === 'picks') return this.fitPick(this.pick);
    if (this.sel) this.install(this.sel);
  }

  private fitPick(i: number): void {
    const p = this.picks()[i];
    if (p) this.install(p.id);
  }

  private install(id: string): void {
    const w = this.world;
    if (!w) return;
    if (w.install(id) === null) {
      const el = $('bay-main');
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
    const auto = $('bay-auto');
    auto.classList.toggle('on', this.auto);
    auto.setAttribute('aria-pressed', String(this.auto));
    $('bay-auto-v').textContent = t(this.auto ? 'On' : 'Off');
    $('bay').classList.toggle('picks', this.view === 'picks');
    this.tabs(w);
    if (this.view === 'picks') this.suggested(w);
    else { this.web(w, this.view); this.inspector(w); }
    this.budgetBar(w);
  }

  private tabs(w: World): void {
    $('bay-tabs').replaceChildren(...VIEWS.map((v) => {
      const ready = v === 'picks' ? 0 : WEB.filter((n) => n.tab === v && blockOf(n.id, w.bayCtx()) === null).length;
      const name = v === 'picks' ? t('Suggested') : t(TABS[v].name);
      const b = h('button', `bay-tab${v === this.view ? ' on' : ''}${v === 'picks' ? ' sug' : ''}`, '', icon(TAB_ICON[v]), h('span', 'bt-n', name), ready ? h('b', 'bt-c', String(ready)) : null) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(v === this.view));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.go(v); });
      return b;
    }));
  }

  /** The suggestions: three cards, what each does in a line, the number that matters, and the price on the button. */
  private suggested(w: World): void {
    const picks = this.picks();
    this.pick = Math.min(this.pick, Math.max(0, picks.length - 1));
    const ctx = w.bayCtx();
    const cards = picks.map((n, i) => {
      const lv = w.levels[n.id] ?? 0, max = maxLevel(n.id), price = cost(n.id, lv + 1), why = blockOf(n.id, ctx);
      const fig = upgradeFigures(w.levels, n.id, true).find((f) => !f.cost);
      const card = h('div', `pick-card${why ? ' short' : ' ready'}${i === this.pick ? ' sel' : ''}`);
      const go = h('button', 'pc-go', '') as HTMLButtonElement;
      go.type = 'button';
      go.disabled = !!why;
      go.append(why === 'krail'
        ? document.createTextNode(t('{n} more Krail', { n: num(Math.ceil(price - w.krail)) }))
        : why ? document.createTextNode(t(WHY[why])) : document.createTextNode(`${t('Fit')} · ${num(price)} Krail`));
      go.addEventListener('click', (e) => { e.stopPropagation(); this.pick = i; this.install(n.id); });
      card.addEventListener('click', () => { this.pick = i; this.render(); });
      card.append(
        h('span', 'pc-top', '', h('span', 'pc-oct', '', nodeIcon(n.id)), h('span', 'pc-tab', t(TABS[n.tab].name)), h('kbd', 'only-desktop', String(i + 1))),
        h('span', 'pc-name', nameOf(n.id)),
        max > 1 ? pips(lv, max, true) : h('span', 'pc-new', t(lv ? 'Fitted' : 'New')),
        h('span', 'pc-text', textOf(n.id, Math.min(max, lv + 1))),
        fig ? h('span', 'pc-fig', '', h('span', '', t(fig.label)), h('b', '', t(fig.to))) : h('span', 'pc-fig'),
        go,
      );
      return card;
    });
    const empty = h('p', 'pick-none', t('Nothing to fit yet · break rock for Krail'));
    $('bay-tab-h').replaceChildren(icon('i-event'), h('span', 'bw-n', t('Suggested')), h('span', 'bw-s', t('Picked for your ship')));
    $('bay-web').replaceChildren(h('div', 'pick-row', '', ...(cards.length ? cards : [empty])),
      h('p', 'pick-more', t('Want to plan your own build? Pick a part of the ship on the left.')));
    $('bay-insp').replaceChildren();
  }

  private web(w: World, tab: Tab): void {
    const nodes = WEB.filter((n) => n.tab === tab);
    const tiers = Math.max(...nodes.map((n) => n.tier)), rows = Math.max(...nodes.map((n) => n.row)) + 1;
    const X = (n: WebNode) => ((n.tier - 0.5) / Math.max(tiers, 3)) * 100;
    const Y = (n: WebNode) => ((n.row + 0.5) / Math.max(rows, 3)) * 100;
    $('bay-tab-h').replaceChildren(icon(TAB_ICON[tab]), h('span', 'bw-n', t(TABS[tab].name)), h('span', 'bw-s', t(TABS[tab].sub)));

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
    const field = h('div', 'bay-nodes');
    for (const n of nodes) {
      const st = stateOf(w, n.id), lv = w.levels[n.id] ?? 0, max = maxLevel(n.id);
      const b = h('button', `bay-node ${st}${n.id === this.sel ? ' sel' : ''}`) as HTMLButtonElement;
      b.type = 'button';
      b.style.left = `${X(n)}%`;
      b.style.top = `${Y(n)}%`;
      b.setAttribute('aria-label', `${nameOf(n.id)} · ${t('Lv')} ${lv}/${max}`);
      // the price where it can be paid soon: fitted-or-ready modules say what the next level costs
      const price = st === 'open' || st === 'short' || st === 'owned' ? cost(n.id, lv + 1) : 0;
      b.append(h('span', 'bn-oct', '', nodeIcon(n.id)), max > 1 ? pips(lv, max) : h('span', 'bi-pips'), h('span', 'bn-name', nameOf(n.id)),
        ...(price ? [h('span', 'bn-cost', num(price))] : []));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.sel = n.id; this.render(); });
      field.append(b);
    }
    $('bay-web').replaceChildren(svg, field);
  }

  /** The selected module: what it does, the numbers it changes, what it would leave the ship, and Fit with its price. */
  private inspector(w: World): void {
    const id = this.sel;
    const el = $('bay-insp');
    if (!id) { el.replaceChildren(); return; }
    const node = NODE[id]!;
    const lv = w.levels[id] ?? 0, max = maxLevel(id), next = Math.min(max, lv + 1);
    const why = blockOf(id, w.bayCtx());
    const head = h('div', 'bi-h', '', h('span', 'bi-oct', '', nodeIcon(id)),
      h('div', 'bi-hd', '', h('span', 'bi-name', nameOf(id)), h('span', 'bi-lv', '', h('span', '', `${t('Lv')} ${lv}/${max}`), pips(lv, max, lv < max))));
    const out: HTMLElement[] = [head, h('p', 'bi-text', textOf(id, next))];
    if (lv < max) {
      const figs = h('div', 'bi-figs');
      for (const f of upgradeFigures(w.levels, id, !w.bk).slice(0, 3)) {
        figs.append(h('div', `fig${f.cost ? ' cost' : ''}`, '', h('span', 'f-l', t(f.label)), h('span', 'f-v', '', h('s', '', t(f.from)), document.createTextNode(' → '), h('b', '', t(f.to)))));
      }
      // what it draws, as chips: +1 power, +2 heat
      const { use, cap } = budgets(w.levels);
      const chips = h('div', 'bi-chips');
      const warn: string[] = [];
      for (const k of ['power', 'mass', 'heat'] as const) {
        const d = node.draw[k] ?? 0, g = node.gives?.[k] ?? 0;
        if (d) chips.append(h('span', `chip ${k}${use[k] + d > cap[k] ? ' over' : ''}`, `+${d} ${t(BUDGET_WORD[k])}`));
        if (g) chips.append(h('span', `chip ${k} gives`, `${t(BUDGET_WORD[k])} ${t('limit')} +${g}`));
        if (d && k !== 'power' && use[k] + d > cap[k]) warn.push(t(OVER_WORD[k]));
      }
      out.push(figs);
      if (chips.childElementCount) out.push(chips);
      out.push(...warn.map((x) => h('p', 'bi-warn', x)));
    }
    const price = lv < max ? cost(id, lv + 1) : 0;
    const btn = h('button', 'bi-go', '') as HTMLButtonElement;
    btn.type = 'button';
    btn.disabled = !!why;
    btn.textContent = why === 'krail' ? t('{n} more Krail', { n: num(Math.ceil(price - w.krail)) }) : why ? t(WHY[why]) : `${t('Fit')} · ${num(price)} Krail`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.install(id); });
    out.push(btn);
    el.replaceChildren(...out);
  }

  /** The ship's three budgets along the bottom, with what the selected module would take. */
  private budgetBar(w: World): void {
    const { use, cap } = budgets(w.levels);
    const sel = this.view === 'picks' ? this.picks()[this.pick] ?? null : this.sel ? NODE[this.sel] : null;
    const can = sel && (w.levels[sel.id] ?? 0) < maxLevel(sel.id);
    $('bay-budget').replaceChildren(...(['power', 'mass', 'heat'] as const).map((k) => {
      const add = can ? sel!.draw[k] ?? 0 : 0;
      const bar = h('i', `bb-bar${use[k] > cap[k] ? ' over' : ''}`);
      bar.style.setProperty('--v', Math.min(1, use[k] / cap[k]).toFixed(3));
      bar.style.setProperty('--a', Math.min(1, (use[k] + add) / cap[k]).toFixed(3));
      return h('span', `bb ${k}`, '', h('span', 'bb-l', t(BUDGET_WORD[k])), bar, h('b', 'bb-v', `${use[k]}/${cap[k]}`));
    }));
  }
}
