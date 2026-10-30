import { LOG, STAMP } from '../content/papers';
import { UPGRADE } from '../content/upgrades';
import { NODE, STOCK, TAB_ORDER, TABS, WEB, type Budget, type Tab, type WebNode } from '../content/web';
import { blockOf, budgets, cost, endless, maxLevel, nodeName, nodeText, quickPicks, roleOf, type Block, type PickRole } from '../sim/bay';
import type { Advice } from '../sim/advice';
import { felt, upgradeFigures, type Fig } from '../sim/build';
import { MARK_GLYPH, MARK_WORD, originOf, papersOf, tabMark, worn, type Mark } from '../sim/papers';
import { profileOf } from '../sim/profile';
import { stepOf } from '../sim/tutor';
import type { World } from '../sim/world';
import { $, GUARD, h, keys, type PadEdges } from './dom';
import { icon, nodeIcon } from './icons';
import { artImg, artUrl } from './art';
import { opsOf, opsText } from './ops';
import { tick } from './tick';
import { num, t } from '../i18n';

// ── the refit bay ─────────────────────────────────────────────────────────
// Where the ship is built. Two ways in, for two kinds of player:
//
//   Suggested · the default: three modules that suit the ship as it is, as
//               big cards, one tap (or 1 2 3) to fit. Nothing to plan.
//   the tabs  · for whoever wants to build: each part of the ship as a small
//               web, left to right by tier (fitted amber, ready teal with its
//               price, the rest dimmed), and an inspector on the right.
//
// In the Arcade mode only the suggestions are open ("Pick one"): the tabs are
// shown, locked, as what the Story mode has. Same screen, nothing to explore.
//
// Along the bottom, the ship's three budgets. The world waits while the bay
// is open. In the Story mode the yard's work (its modules, the frame, the
// core's last level) is fitted only at a port, for chits as well as Krail.
//
// Keys: Q E (or Tab) change view, arrows move, Enter fits, 1 2 3 fit a
// suggestion, Esc or B launches. A pad: bumpers, stick, A, B. Touch: tap.

type View = 'picks' | Tab;
/** What the Arcade's three cards are called: a gun, a defence, a part of the ship. */
const ROLE_NAME: Record<PickRole, string> = { weapons: 'Weapons', defence: 'Defence', ship: 'Ship' };

const TAB_ICON: Record<View, string> = {
  picks: 'i-event', hull: 'i-hull', weapons: 'i-laser', ordnance: 'i-torp', engines: 'i-engine', defence: 'i-shield', utility: 'i-rock', signals: 'i-signal', reactor: 'i-core', synergies: 'i-link',
};

/**
 * The ship in the bay is the painted Wayward of the title art (src/assets/wayward-menu-background.webp,
 * 1735 × 906): her middle and size in the picture, so the bay can fit her to the room it has,
 * and where each part of the ship is on her, for the rings. Signals is the mast, Defence the turrets.
 */
const ART = { w: 1735, h: 906, cx: 952, cy: 580, sw: 985, sh: 440 };
const ZONE_AT: Partial<Record<Tab, readonly [number, number]>> = {
  weapons: [1415, 735], ordnance: [945, 622], engines: [737, 600], defence: [963, 433], hull: [1090, 615],
  utility: [1230, 560], signals: [777, 367], reactor: [860, 520], synergies: [1000, 545],
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
  krail: 'Not enough Cyrite',
};
/** The three things a ship feels, which the three loads set (sim/budgets.ts): mass is acceleration, power is top speed, heat is cooldown. */
const BUDGET_WORD: Record<keyof Budget, string> = { power: 'Top speed', mass: 'Acceleration', heat: 'Cooldown' };
/** What the warning light says when a load is past its rating. */
const LIGHT_WORD: Record<keyof Budget, string> = { power: 'Strained', mass: 'Sluggish', heat: 'Slow guns' };
/** What running past a rating costs (sim/budgets.ts). */
const OVER_WORD: Record<keyof Budget, string> = {
  mass: 'Past the load rating: slow off the mark and slow to turn',
  power: 'Past the reactor rating: lower top speed and slower guns',
  heat: 'Past the cooling rating: the guns take longer to cycle',
};
/** The felt stat a load sets, in `felt()` (sim/build.ts), and which way is better. */
const FELT: Record<keyof Budget, { key: 'accel' | 'speed' | 'cooldown'; lower: boolean; unit: string; abs: 'accelAbs' | 'speedAbs' | 'cooldownAbs'; dp: number }> = {
  mass: { key: 'accel', lower: false, unit: 'm/s²', abs: 'accelAbs', dp: 0 },
  power: { key: 'speed', lower: false, unit: 'm/s', abs: 'speedAbs', dp: 0 },
  heat: { key: 'cooldown', lower: true, unit: 's', abs: 'cooldownAbs', dp: 2 },
};
/** The bar's scale: from 40% to 140% of the stock ship, the stock ship at 60% along. */
const BAR = { lo: 0.4, hi: 1.4 } as const;

const nameOf = (id: string) => t(nodeName(id));
const textOf = (id: string, lv: number) => t(nodeText(id, lv));

/** The price of the next level, in Cyrite. */
const priceOf = (w: World, id: string): number => cost(id, (w.levels[id] ?? 0) + 1, !w.bk, w.levels);

/** Does this node's ladder go on for ever here (the Story's stat upgrades and balance parts)? Its level reads "Mk 7", with no top. */
const endlessIn = (w: World, id: string): boolean => !!w.bk && endless(id);

/** A level as the bay writes it: "Lv 2/5", or "Mk 7" on a ladder with no top. */
const levelWord = (w: World, id: string, lv: number): string => (endlessIn(w, id) ? `${t('Mk')} ${lv}` : `${t('Lv')} ${lv}/${maxLevel(id)}`);

/** What the Fit button says: the price, how much Cyrite is missing, or why not. */
function fitWord(w: World, id: string, why: Block | null): string {
  if (why === 'krail') return t('{n} more Cyrite', { n: num(Math.ceil(priceOf(w, id) - w.purse)) });
  if (why === 'full' && endlessIn(w, id)) return t('At its limit');
  if (why === 'full' && STOCK[id] && (w.levels[id] ?? 0) <= STOCK[id]!) return t('Fitted at launch');
  return why ? t(WHY[why]) : `${t('Fit')} · ${num(priceOf(w, id))} ${t('Cyrite')}`;
}

/** The Arcade mode: three picks, no web (the Story mode has no bk of its own here, so `!w.bk` is the arcade, as for fee). */
/** The plain bay: one view of cards, no prices to read, closes on a pick. The Arcade's, and the training's one upgrade. */
const isArcade = (w: World) => !w.bk || stepOf(w) === 'bay';

/** The Recommended tag, up in the card's top row so the body text starts in the same place on every card; the reason is its tooltip. */
function recTag(adv: Advice): HTMLElement {
  const tag = h('span', 'pc-rec', '', h('b', '', `◆ ${t('Recommended')}`));
  tag.title = t(adv.text, adv.vars);
  return tag;
}

/** The views: the suggestions, then every tab with something for this mode (Signals is the Story mode's). */
const viewsOf = (w: World): View[] => ['picks', ...TAB_ORDER.filter((tab) => WEB.some((n) => n.tab === tab && blockOf(n.id, { ...w.bayCtx(), krail: Infinity }) !== 'mode'))];

/** A module's look: fitted (all, or some), ready to fit, in reach but short of Krail or power, or not yet open. */
function stateOf(world: World, id: string): 'max' | 'owned' | 'open' | 'short' | 'locked' {
  const lv = world.levels[id] ?? 0, b = blockOf(id, world.bayCtx());
  if (b === 'full') return 'max';
  if (b === null) return lv ? 'owned' : 'open';
  if (b === 'krail') return lv ? 'owned' : 'short';
  return lv ? 'owned' : 'locked';
}

/** A module's level as pips, the next one (if any) marked. Past the written top there is no pip to light: the label counts on. */
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
  /** An Arcade pick is made and the bay is about to shut. */
  private closing = false;
  private view: View = 'picks';
  private sel: string | null = null;
  /** The suggestion selected, in the Suggested view. */
  private pick = 0;
  /** The inspector's details (the paragraph, the advice, every figure, the note) are open. */
  private more = false;
  /** Rings over the ship: one per part, set on the art by percent (see ZONE_AT). */
  private rings = new Map<string, HTMLButtonElement>();
  /** The module just fitted and the budgets it moved: lit for a moment (see install). */
  private fresh: { id: string; moved: Set<string> } | null = null;
  /** The budget readouts as last drawn, so a fit can tick from what they said (see budgetBar). */
  private shown: Record<string, string> = {};
  /** The ship's answer to a fit, in the voice line, until this timer puts the voice back. */
  private logT = 0;
  /** The choice the ship link was last drawn for. */
  private linked = '';
  private linkTry = 0;

  constructor() {
    $('bay-x').addEventListener('click', (e) => { e.stopPropagation(); if (this.open) this.launch(); });
    // a tap on the bay never reaches the flight controls behind it
    $('bay').addEventListener('pointerdown', (e) => e.stopPropagation());
    // the Arcade bay opens by itself, mid-flight: a tap in its first moments is still the fight's
    $('bay').addEventListener('click', (e) => { if (performance.now() - this.opened < GUARD) { e.stopPropagation(); e.preventDefault(); } }, true);
    addEventListener('resize', () => { if (this.open) { this.placeArt(); this.link(); } });
  }

  /** The view open, for the ship drawn behind (render/ships.ts lights its part). */
  get zone(): string {
    return this.view;
  }

  get open(): boolean {
    return !$('bay').hidden;
  }

  /** Open and opaque: not fading out on a pick, so the view behind it is not seen. */
  get covers(): boolean {
    const bay = $('bay');
    return !bay.hidden && !bay.classList.contains('leaving');
  }

  show(world: World, onClose: () => void): void {
    this.close();
    this.world = world;
    this.onClose = onClose;
    this.opened = performance.now();
    this.closing = false;
    $('bay').classList.remove('chosen', 'leaving', 'warm');
    this.shown = {};
    this.linked = '';
    // the bay opens on the suggestions; the tabs are a step further in
    this.view = 'picks';
    this.pick = 0;
    // at a port the bay closes back onto the dock; in flight it launches
    const x = $('bay-x');
    x.replaceChildren(h('kbd', 'only-desktop', 'B'), ` ${t(world.docked ? 'Back to the dock' : 'Launch')}`);
    $('bay').hidden = false;
    this.render();
    // the type changes the room once the fonts arrive: the line finds its ring again
    document.fonts?.ready.then(() => this.open && this.link());
    for (const ms of [150, 500]) setTimeout(() => this.open && this.link(), ms);
    this.off = keys((e) => {
      const c = e.code;
      if (c === 'Escape' || c === 'KeyB') return this.launch(), true;
      if (c === 'KeyQ' || (c === 'Tab' && e.shiftKey)) return this.step(-1), true;
      if (c === 'KeyE' || c === 'Tab') return this.step(1), true;
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
    $('bay-pts').replaceChildren();
    $('bay').querySelectorAll<HTMLElement>('.bay-back i').forEach((l) => { l.classList.remove('on'); delete l.dataset.u; });
    this.rings.clear();
    $('bay').querySelector('.bay-link-pick')?.remove();
    for (const k of ['--ax', '--ay', '--aw']) $('bay').style.removeProperty(k);
    $('bay').classList.remove('chosen', 'leaving', 'warm');
    $('bay').hidden = true;
  }

  /** A gamepad: bumpers change view, the stick moves, A fits, B launches. */
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

  private go(view: View): void {
    // the Arcade's tabs are locked: they are there to be seen
    if (this.world && isArcade(this.world) && view !== 'picks') return;
    this.view = view;
    this.pick = 0;
    this.sel = view === 'picks' ? null : this.first(view);
    this.render();
  }

  private step(d: number): void {
    const views = isArcade(this.world!) ? (['picks'] as View[]) : viewsOf(this.world!), i = views.indexOf(this.view);
    this.go(views[(i + d + views.length) % views.length]!);
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
      if (dx && n) this.choose((this.pick + dx + n) % n);
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
    if (!w || this.closing) return;
    const before = budgets(w.levels), feltBefore = felt(w.levels), krailBefore = Math.floor(w.purse);
    let fitted = false;
    if (w.install(id) === null) {
      const after = budgets(w.levels), moved = new Set<string>(['krail']);
      for (const k of ['power', 'mass', 'heat'] as const) if (after.use[k] !== before.use[k] || after.cap[k] !== before.cap[k] || feltBefore[FELT[k].key] !== felt(w.levels)[FELT[k].key]) moved.add(k);
      this.fresh = { id, moved };
      fitted = true;
      // the web's panel flashes; in the suggestions it is see-through, so the flash would only draw a stray frame
      if (this.view !== 'picks') {
        const el = $('bay-main');
        el.classList.remove('done');
        void el.offsetWidth;
        el.classList.add('done');
      }
    }
    // the Arcade's cards stay as they are (the next three are not the point of this moment): the chosen one confirms, the rest step back
    if (fitted && isArcade(w) && this.view === 'picks') this.confirm(w, id);
    else this.render();
    if (fitted) { this.installFx(id, krailBefore, Math.floor(w.purse)); this.answer(id); }
    this.fresh = null;
  }

  /**
   * The Arcade's pick, one clean beat: the chosen card says Fitted and lights solid, the other two
   * fall back, the ring on the ship answers (installFx), the bars tick; then the bay fades and shuts.
   */
  private confirm(w: World, id: string): void {
    this.closing = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, bay = $('bay');
    $('bay-krail').replaceChildren(icon('i-rock'), h('b', '', num(Math.floor(w.purse))), h('span', '', t('Cyrite')));
    this.budgetBar(w);
    this.papers(w);
    [...$('bay-web').querySelectorAll('.pick-card')].forEach((c, k) => {
      const on = k === this.pick;
      c.classList.toggle('fitted', on);
      c.classList.toggle('gone', !on);
      if (on) { const go = c.querySelector('.pc-go') as HTMLButtonElement; go.disabled = true; go.textContent = `✓ ${t('Fitted')}`; }
    });
    bay.classList.add('chosen');
    window.setTimeout(() => { if (this.open && this.world === w) bay.classList.add('leaving'); }, reduce ? 150 : 650);
    window.setTimeout(() => { if (this.open && this.world === w) this.launch(); }, reduce ? 300 : 950);
  }

  /** The ship answers a fit in the voice line for a few seconds: accepted, or not factory spec if the part has a stamp. */
  private answer(id: string): void {
    const o = originOf(id), off = !!o && o !== 'oem', el = $('bay-voice');
    el.textContent = t(off ? LOG.offSpec : LOG.accepted);
    el.classList.toggle('log', true);
    el.classList.toggle('off', off);
    clearTimeout(this.logT);
    this.logT = window.setTimeout(() => {
      el.classList.remove('log', 'off');
      if (this.world && this.open) el.textContent = t(this.world.voice());
    }, 3200);
  }

  /**
   * The install, felt (under 600 ms): Krail counts down, the module flashes (the fresh class),
   * the ring on the part it belongs to pings and the ship warms for a beat, the budgets bump.
   * None of it blocks a second install, and none of it with reduced motion.
   */
  private installFx(id: string, from: number, to: number): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.countKrail(from, to, 520);
    const bay = $('bay'), ring = this.rings.get(NODE[id]!.tab);
    bay.classList.remove('warm');
    void bay.offsetWidth;
    bay.classList.add('warm');
    setTimeout(() => bay.classList.remove('warm'), 600);
    if (ring) { ring.classList.remove('hit'); void ring.offsetWidth; ring.classList.add('hit'); setTimeout(() => ring.classList.remove('hit'), 700); }
  }

  /** Count the Krail readout from one value to another. */
  private countKrail(from: number, to: number, ms: number): void {
    const el = $('bay-krail').querySelector('b');
    if (!el) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      el.textContent = num(v);
      if (k < 1 && this.open) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * The ship's computer's picks: the modules ready to fit that have a reason
   * (sim/advice.ts), the three firmest across the whole bay. Recomputed per draw; cheap.
   */
  private advice(w: World): Map<string, Advice> {
    const picks: Array<[string, Advice]> = [];
    for (const n of WEB) {
      const st = stateOf(w, n.id);
      if (st !== 'open' && st !== 'owned') continue;
      if (blockOf(n.id, w.bayCtx())) continue;
      const a = w.advise(n.id);
      if (a) picks.push([n.id, a]);
    }
    return new Map(picks.sort((a, b) => a[1].rank - b[1].rank).slice(0, 3));
  }

  /** The build's profile: a name, a few plain lines, and how it leans (close, ordnance, range, defence). */
  private profile(w: World): HTMLElement {
    const p = profileOf(w.levels), WAY: Record<string, string> = { close: 'Close range', ordnance: 'Ordnance', range: 'Range', defence: 'Defence' };
    const bars = h('div', 'pf-bars');
    for (const [a, v] of Object.entries(p.axes)) {
      const i = h('i', 'pf-bar');
      i.style.setProperty('--v', v.toFixed(2));
      bars.append(h('span', 'pf-b', '', h('span', 'pf-l', t(WAY[a]!)), i));
    }
    return h('div', 'bay-prof', '', h('span', 'bf-h', t('Profile')), h('b', 'pf-name', t(p.name)), ...p.lines.map((l) => h('span', 'pf-line', t(l))), bars);
  }

  // ── drawing ─────────────────────────────────────────────────────────────

  /** The tab's painted backdrop fades in behind the ship; no picture, no layer. */
  private backdrop(): void {
    const layers = $('bay').querySelectorAll<HTMLElement>('.bay-back i');
    const url = artUrl('baybanner', this.view === 'picks' ? 'suggested' : this.view);
    const now = $('bay').querySelector<HTMLElement>('.bay-back i.on');
    if (url && now?.dataset.u === url) return;
    const next = [...layers].find((l) => l !== now);
    if (!next) return;
    now?.classList.remove('on');
    if (!url) return;
    next.dataset.u = url;
    next.style.backgroundImage = `url("${url}")`;
    next.classList.add('on');
  }

  private render(): void {
    this.backdrop();
    const w = this.world;
    if (!w) return;
    $('bay-voice').textContent = t(w.voice());
    const o = opsOf(w);
    $('bay-ops').className = `ops ${o}`;
    $('bay-ops').textContent = opsText(o);
    $('bay-krail').replaceChildren(icon('i-rock'), h('b', '', num(Math.floor(w.purse))), h('span', '', t('Cyrite')));
    this.papers(w);
    $('bay').classList.toggle('picks', this.view === 'picks');
    $('bay').classList.toggle('arcade', isArcade(w));
    this.tabs(w);
    if (this.view === 'picks') this.suggested(w);
    else { this.web(w, this.view); this.inspector(w); }
    // after layout: the line from the chosen card to its part of the ship
    requestAnimationFrame(() => this.link());
    this.budgetBar(w);
    this.ringsFor(w);
  }

  /**
   * The ship as the stage: a ring on each part of the ship that has modules,
   * in every view. Amber and pulsing where a suggestion is (in the Suggested
   * view a tap selects it), teal and still elsewhere; a tap opens that
   * part's tab. The open part's ring is the selected one.
   */
  private ringsFor(w: World): void {
    const layer = $('bay-pts');
    const picks = this.picks(), live = new Set<string>(), views = viewsOf(w);
    for (const zone of Object.keys(ZONE_AT) as Tab[]) {
      // the Signals tab is the Story mode's
      if (!views.includes(zone)) continue;
      live.add(zone);
      const i = picks.findIndex((n) => n.tab === zone);
      let b = this.rings.get(zone);
      if (!b) {
        b = h('button', 'bay-ring') as HTMLButtonElement;
        b.type = 'button';
        b.append(h('i', 'br-o'), h('span', 'br-l'));
        const [x, y] = ZONE_AT[zone]!;
        b.style.left = `${(x / ART.w) * 100}%`;
        b.style.top = `${(y / ART.h) * 100}%`;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.world && isArcade(this.world) && !this.picks().some((n) => n.tab === zone)) return;
          const k = this.picks().findIndex((n) => n.tab === zone);
          if (this.view === 'picks' && k >= 0) this.choose(k); else this.go(zone);
        });
        this.rings.set(zone, b);
        layer.append(b);
      }
      // in the Arcade only the suggested parts are live
      const still = isArcade(w) && i < 0;
      b.tabIndex = still ? -1 : 0;
      b.className = `bay-ring${still ? ' still' : ''}${i >= 0 ? ' sug' : ''}${(this.view === 'picks' ? i >= 0 && i === this.pick : zone === this.view) ? ' sel' : ''}${WEB.some((n) => n.tab === zone && (w.levels[n.id] ?? 0) > 0) ? ' fitted' : ''}`;
      const name = t(TABS[zone].name);
      b.setAttribute('aria-label', i >= 0 ? `${name} · ${nameOf(picks[i]!.id)}` : name);
      // the part's name beside its ring (on hover, focus and while it is the one open)
      b.lastElementChild!.textContent = i >= 0 && this.view === 'picks' ? nameOf(picks[i]!.id) : name;
    }
    for (const [zone, b] of this.rings) if (!live.has(zone)) { b.remove(); this.rings.delete(zone); }
    this.placeArt();
  }

  /**
   * Fit the ship to the room the screen leaves her: between the tabs and the
   * inspector, from under the header to the cards (or the web). The art and
   * the rings share one box, set as three custom properties on the bay.
   */
  private placeArt(): void {
    const bay = $('bay'), box = bay.getBoundingClientRect(), r = (id: string) => $(id).getBoundingClientRect();
    const nav = r('bay-tabs'), insp = r('bay-insp'), web = r('bay-main');
    // the tabs are a column on the left, or (a phone on its side) a row across the top
    const column = nav.width > 0 && nav.width < box.width * 0.6;
    const left = column ? nav.right + 12 : box.left + 12;
    // in the Suggested view the title of the view sits in the stage's top; in a tab it is part of the web's panel
    const top = column ? (this.view === 'picks' ? r('bay-tab-h').bottom + 4 : (bay.querySelector('.bay-h') as HTMLElement).getBoundingClientRect().bottom + 8) : Math.max(nav.height ? nav.bottom : 0, (bay.querySelector('.bay-h') as HTMLElement).getBoundingClientRect().bottom) + 6;
    const right = insp.width > 10 ? insp.left - 12 : box.right - 12;
    const card = this.view === 'picks' ? document.querySelector('.pick-card, .pick-none') : null;
    const bottom = (card ? card.getBoundingClientRect().top : web.top) - 8;
    const aw = right - left, ah = bottom - top;
    const art = bay.querySelector('.bay-art') as HTMLElement;
    // too little room (a phone's tab, with the web alone): no ship
    art.classList.toggle('none', ah < 80);
    $('bay-pts').classList.toggle('none', ah < 80);
    if (ah < 80) return;
    const W = Math.max(340, Math.min(aw * 0.94 / (ART.sw / ART.w), ah * 0.94 / (ART.sh / ART.w), 1300));
    const x = left + aw / 2 - (ART.cx / ART.w) * W - box.left, y = top + ah / 2 - (ART.cy / ART.w) * W - box.top;
    // the first placement snaps into place: she does not fly in from the corner when the bay opens
    if (!bay.style.getPropertyValue('--aw')) {
      bay.classList.add('snap');
      requestAnimationFrame(() => requestAnimationFrame(() => bay.classList.remove('snap')));
    }
    bay.style.setProperty('--ax', `${x.toFixed(1)}px`);
    bay.style.setProperty('--ay', `${y.toFixed(1)}px`);
    bay.style.setProperty('--aw', `${W.toFixed(1)}px`);
    // the ring has moved with her: the line to it follows
    requestAnimationFrame(() => this.link());
  }

  private tabs(w: World): void {
    const arcade = isArcade(w);
    $('bay-tabs').replaceChildren(...viewsOf(w).map((v) => {
      const locked = arcade && v !== 'picks';
      const name = v === 'picks' ? t(arcade ? 'Pick one' : 'Suggested') : t(TABS[v].name);
      // a locked tab (the Arcade's) shows a padlock where the others show their state mark
      const mark = v === 'picks' || locked ? 'none' : this.markOf(w, v);
      const b = h('button', `bay-tab${v === this.view ? ' on' : ''}${v === 'picks' ? ' sug' : ''}${locked ? ' locked' : ''}${mark !== 'none' ? ` m-${mark}` : ''}`, '', icon(TAB_ICON[v]), h('span', 'bt-n', name),
        locked ? icon('i-lock') : mark !== 'none' ? h('i', `bt-m ${mark}`, MARK_GLYPH[mark]) : null) as HTMLButtonElement;
      if (mark !== 'none') b.setAttribute('aria-description', t(MARK_WORD[mark]));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(v === this.view));
      if (locked) { b.setAttribute('aria-disabled', 'true'); b.tabIndex = -1; b.title = t('Story mode: plan your own build'); }
      b.addEventListener('click', (e) => { e.stopPropagation(); this.go(v); });
      return b;
    }), ...(arcade ? [h('p', 'bay-lock-note', '', icon('i-lock'), document.createTextNode(` ${t('Story: full refit control')}`))] : []), this.profile(w));
  }

  /** The ship's papers along the foot of the web: her designation, and what the registry says of her. Quiet; desktop only. */
  private papers(w: World): void {
    const p = papersOf(w.levels), field = (k: string, v: string) => `${t(k)}: ${t(v)}`;
    $('bay-papers').replaceChildren(
      h('span', '', `${t('OB-7731-A · Fit bay 03 · Rev 14')} · ${t('Service cycle')}: 19,842 h`),
      h('span', '', [field('Registry', 'Flagged'), field('Operator', 'Unregistered'), field('Factory profile', 'Obedience / standard'), field('Current', p.modified ? 'Modified' : 'Standard')].join(' · ')),
    );
  }

  /** The module's origin stamp (content/papers.ts), if it has one. */
  private stamp(id: string, cls: string): HTMLElement[] {
    const o = originOf(id);
    return o ? [h('span', `stamp ${cls} ${o}`, t(STAMP[o]))] : [];
  }

  /** A tab's state as one mark (sim/papers.ts): the list reads like a systems console. */
  private markOf(w: World, tab: Tab): Mark {
    const { use, cap } = budgets(w.levels), ctx = w.bayCtx();
    const nodes = WEB.filter((n) => n.tab === tab);
    const blocks = nodes.map((n) => blockOf(n.id, ctx));
    return tabMark({
      over: (['mass', 'heat'] as const).some((k) => use[k] > cap[k] && nodes.some((n) => (w.levels[n.id] ?? 0) > 0 && (n.draw[k] ?? 0) > 0)),
      damaged: tab === 'hull' && worn(w.plates, w.stats.maxPlates),
      ready: blocks.filter((b) => b === null).length,
      fitted: nodes.some((n) => (w.levels[n.id] ?? 0) > 0),
      reachable: blocks.some((b) => b === null || b === 'krail' || b === 'yard'),
    });
  }

  /** The suggestions: three cards, what each does in a line, the number that matters, and the price on the button. */
  private suggested(w: World): void {
    const picks = this.picks();
    this.pick = Math.min(this.pick, Math.max(0, picks.length - 1));
    const ctx = w.bayCtx();
    const cards = picks.map((n, i) => {
      const lv = w.levels[n.id] ?? 0, max = maxLevel(n.id), why = blockOf(n.id, ctx);
      const why1 = w.advise(n.id);
      const card = h('div', `pick-card${why ? ' short' : ' ready'}${i === this.pick ? ' sel' : ''}`);
      const go = h('button', 'pc-go', '') as HTMLButtonElement;
      go.type = 'button';
      go.disabled = !!why;
      // the Arcade's cards say Fit and nothing else: the price gates when the bay opens, it is not part of the choice
      go.append(document.createTextNode(isArcade(w) && (!why || why === 'krail') ? t('Fit') : fitWord(w, n.id, why)));
      go.addEventListener('click', (e) => { e.stopPropagation(); this.pick = i; this.install(n.id); });
      card.addEventListener('click', () => this.choose(i));
      card.append(
        this.shot(n.tab),
        h('span', 'pc-top', '', h('span', 'pc-oct', '', nodeIcon(n.id)), h('span', 'pc-tab', t(isArcade(w) ? ROLE_NAME[roleOf(n.id)] : TABS[n.tab].name)), ...(why1 ? [recTag(why1)] : []), ...this.stamp(n.id, 'pc-stamp'), h('kbd', 'only-desktop', String(i + 1))),
        h('span', 'pc-name', nameOf(n.id)),
        max > 1 ? pips(lv, max, true) : h('span', 'pc-new', t(lv ? 'Fitted' : 'New')),
        h('span', 'pc-text', textOf(n.id, Math.min(max, lv + 1))),
        go,
      );
      return card;
    });
    const empty = h('p', 'pick-none', t(w.bk ? 'No upgrade available yet · collect salvage to earn Cyrite' : 'Nothing to fit yet · break rock for Cyrite'));
    const arcade = isArcade(w);
    $('bay-tab-h').replaceChildren(icon('i-event'), h('span', 'bw-n', t(arcade ? 'Pick one' : 'Suggested')), h('span', 'bw-s', t(w.bk && arcade ? 'Your first refit' : arcade ? 'Three refits for your ship' : 'Picked for your ship')));
    $('bay-web').replaceChildren(h('div', 'pick-row', '', ...(cards.length ? cards : [empty])),
      h('p', 'pick-more', t('Want to plan your own build? Pick a part of the ship on the left.')));
    $('bay-insp').replaceChildren();
  }

  /** A window on the painted ship at the part a card is about: the card shows what it fits. */
  private shot(tab: Tab): HTMLElement {
    const [x, y] = ZONE_AT[tab] ?? [ART.cx, ART.cy], Z = 3, ASPECT = 0.4;
    // the picture is Z times the window's width, centred on the part: background-position in percent
    const pos = (f: number, win: number, size: number) => (((win / 2 - size * f) / (win - size)) * 100).toFixed(1);
    const el = h('span', 'pc-shot', '', h('i', 'pc-ring'));
    el.style.setProperty('--bx', `${pos(x / ART.w, 1, Z)}%`);
    el.style.setProperty('--by', `${pos(y / ART.h, ASPECT, Z * ART.h / ART.w)}%`);
    return el;
  }

  /**
   * CARD → HARDWARE → SHIP: a thin technical line from the chosen card up to the ring on its part
   * of the ship. It draws itself once when the choice changes (then the ring answers with a ping),
   * stays still on a redraw, and waits out the install's own line.
   */
  private link(): void {
    const bay = $('bay'), old = bay.querySelector('.bay-link-pick') as SVGSVGElement | null;
    const card = this.view === 'picks' && this.open ? bay.querySelector('.pick-card.sel') as HTMLElement | null : null;
    const zone = card && this.picks()[this.pick]?.tab, ring = zone ? this.rings.get(zone) : undefined;
    if (!card || !ring) { old?.remove(); this.linked = ''; return; }
    // the ship is not on the stage yet: placeArt calls this again when she is
    if (!bay.style.getPropertyValue('--aw')) return;
    const o = bay.getBoundingClientRect(), c = card.getBoundingClientRect(), r = ring.getBoundingClientRect();
    // the ring is not where the ship will put it yet: look again in a moment
    if (r.width < 1 || r.left <= o.left || r.top <= o.top) { if (this.open && this.linkTry++ < 20) setTimeout(() => this.link(), 60); return; }
    this.linkTry = 0;
    const x0 = c.left + c.width / 2 - o.left, y0 = c.top - o.top, x1 = r.left + r.width / 2 - o.left, y1 = r.top + r.height - o.top - r.height * 0.1;
    if (y1 >= y0 - 6) { old?.remove(); this.linked = ''; return; }
    const key = `${zone}:${this.pick}`, fresh = key !== this.linked;
    this.linked = key;
    const ns = 'http://www.w3.org/2000/svg', my = y0 - Math.min(26, (y0 - y1) / 2);
    const svg = old ?? document.createElementNS(ns, 'svg');
    svg.setAttribute('class', `bay-link-pick${fresh ? ' draw' : ''}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path d="M${x0} ${y0} V${my} H${x1} V${y1}" pathLength="1" vector-effect="non-scaling-stroke"/><circle cx="${x0}" cy="${y0}" r="3"/>`;
    if (!old) bay.append(svg);
    // the line arrives: the ring answers
    if (fresh && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTimeout(() => { if (this.open && ring.isConnected) { ring.classList.remove('hit'); void ring.offsetWidth; ring.classList.add('hit'); setTimeout(() => ring.classList.remove('hit'), 700); } }, 300);
    }
  }

  /** Choose a card (a tap, an arrow, its ring): the cards, the ring, the line and the bars answer in place, so nothing is rebuilt and the changes can move. */
  private choose(i: number): void {
    const w = this.world;
    if (!w || this.view !== 'picks') return;
    const cards = [...$('bay-web').querySelectorAll('.pick-card')];
    if (!cards[i] || i === this.pick) return;
    this.pick = i;
    cards.forEach((c, k) => c.classList.toggle('sel', k === i));
    this.ringsFor(w);
    this.budgetBar(w);
    requestAnimationFrame(() => this.link());
  }

  private web(w: World, tab: Tab): void {
    const nodes = WEB.filter((n) => n.tab === tab);
    const tiers = Math.max(...nodes.map((n) => n.tier)), rows = Math.max(...nodes.map((n) => n.row)) + 1;
    // the web takes the rows it needs from the bottom of the screen, the ship what is left above (see the CSS)
    $('bay').style.setProperty('--rows', String(Math.max(rows, 3)));
    $('bay').classList.toggle('dense', rows >= 4);
    const X = (n: WebNode) => ((n.tier - 0.5) / Math.max(tiers, 3)) * 100;
    const Y = (n: WebNode) => ((n.row + 0.5) / Math.max(rows, 3)) * 100;
    const mark = this.markOf(w, tab);
    $('bay-tab-h').replaceChildren(icon(TAB_ICON[tab]), h('span', 'bw-n', t(TABS[tab].name)), h('span', 'bw-s', t(TABS[tab].sub)),
      ...(mark !== 'none' ? [h('span', `bw-m ${mark}`, '', h('i', '', MARK_GLYPH[mark]), h('span', '', t(MARK_WORD[mark])))] : []));

    // the links behind, as hardware: a bus a parent's children share (a fork, drawn as a junction),
    // a bus into a child with two parents (a join), conduits under the live wire, lit where both ends are fitted
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'bay-links');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    const kids = new Map<string, WebNode[]>();
    for (const n of nodes) for (const f of n.from ?? []) kids.set(f, [...(kids.get(f) ?? []), n]);
    /** Where a parent's children branch off (a fork), and where a child's parents come together (a join). */
    const forkX = (a: WebNode) => X(a) + 0.45 * Math.min(...kids.get(a.id)!.map((c) => X(c) - X(a)));
    const joinX = (n: WebNode) => X(n) - 0.45 * Math.min(...(n.from ?? []).map((f) => X(n) - X(NODE[f]!)));
    const junctions: Array<[number, number, string]> = [];
    for (const n of nodes) {
      const parents = (n.from ?? []).map((f) => NODE[f]!);
      if (parents.length > 1) junctions.push([joinX(n), Y(n), 'join']);
      for (const a of parents) {
        const mx = parents.length > 1 ? joinX(n) : kids.get(a.id)!.length > 1 ? forkX(a) : (X(a) + X(n)) / 2;
        if (parents.length === 1 && kids.get(a.id)!.length > 1 && !junctions.some((j) => j[0] === mx && j[1] === Y(a))) junctions.push([mx, Y(a), 'fork']);
        const d = `M${X(a)} ${Y(a)} H${mx} V${Y(n)} H${X(n)}`, st = (w.levels[a.id] ?? 0) > 0 ? ((w.levels[n.id] ?? 0) > 0 ? 'lit' : 'open') : '';
        for (const cls of ['conduit', 'wire']) {
          const line = document.createElementNS(ns, 'path');
          line.setAttribute('d', d);
          line.setAttribute('class', `${cls} ${st}`);
          line.setAttribute('vector-effect', 'non-scaling-stroke');
          svg.append(line);
        }
      }
    }
    const recs = this.advice(w);
    const field = h('div', 'bay-nodes');
    for (const [x, y, kind] of junctions) {
      const j = h('i', `bay-junc ${kind}`);
      j.style.left = `${x}%`;
      j.style.top = `${y}%`;
      field.append(j);
    }
    for (const n of nodes) {
      const st = stateOf(w, n.id), lv = w.levels[n.id] ?? 0, max = maxLevel(n.id);
      const b = h('button', `bay-node ${st}${recs.has(n.id) ? ' rec' : ''}${n.id === this.sel ? ' sel' : ''}${n.id === this.fresh?.id ? ' fresh' : ''}`) as HTMLButtonElement;
      b.type = 'button';
      b.style.left = `${X(n)}%`;
      b.style.top = `${Y(n)}%`;
      b.setAttribute('aria-label', `${nameOf(n.id)} · ${levelWord(w, n.id, lv)}`);
      // the price where it can be paid soon: fitted-or-ready modules say what the next level costs
      const price = st === 'open' || st === 'short' || st === 'owned' ? priceOf(w, n.id) : 0;
      // three levels: the name, then the level pips, then what it moves (the first figure's label)
      const first = st !== 'max' && st !== 'locked' ? upgradeFigures(w.levels, n.id, !w.bk).find((f) => !f.cost)?.label : undefined;
      b.append(h('span', 'bn-oct', '', nodeIcon(n.id)), max > 1 ? pips(lv, max) : h('span', 'bi-pips'), h('span', 'bn-name', nameOf(n.id)),
        ...(first ? [h('span', 'bn-tag', t(first))] : []), ...(price ? [h('span', 'bn-cost', num(price))] : []));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.sel = n.id; this.render(); });
      field.append(b);
    }
    $('bay-web').replaceChildren(svg, field);
  }

  /** The selected module: its name and level, what each figure changes, what it draws, and Fit with its price. The paragraph, the advice and the note sit behind (i). */
  private inspector(w: World): void {
    const id = this.sel;
    const el = $('bay-insp');
    if (!id) { el.replaceChildren(); return; }
    const node = NODE[id]!;
    const lv = w.levels[id] ?? 0, max = maxLevel(id), next = Math.min(max, lv + 1);
    const why = blockOf(id, w.bayCtx()), more = why !== 'full';
    const info = h('button', `bi-i${this.more ? ' on' : ''}`, 'i') as HTMLButtonElement;
    info.type = 'button';
    info.title = t('Details');
    info.setAttribute('aria-label', t('Details'));
    info.setAttribute('aria-expanded', String(this.more));
    info.addEventListener('click', (e) => { e.stopPropagation(); this.more = !this.more; this.render(); });
    const head = h('div', 'bi-h', '', h('span', 'bi-oct', '', nodeIcon(id)),
      h('div', 'bi-hd', '', h('span', 'bi-name', nameOf(id)), h('span', 'bi-lv', '', h('span', '', levelWord(w, id, lv)), pips(lv, max, more))), info);
    const adv = more && !why ? this.advice(w).get(id) : undefined;
    // a specialisation or salvaged tech has a picture, above the name (desktop; a phone's inspector keeps to the words)
    const pic = artImg('spec', id, 'bi-pic');
    const out: HTMLElement[] = [...(pic ? [pic] : []), head, ...this.stamp(id, 'bi-stamp'), ...(adv ? [h('p', 'bi-rec', '', h('b', '', `◆ ${t('Recommended')}`))] : [])];
    if (more) {
      // what the next level does: the first gain large, the rest smaller, then only the costs a player would feel
      const figs = upgradeFigures(w.levels, id, !w.bk).filter((f) => !f.minor);
      const gains = figs.filter((f) => !f.cost), costs = figs.filter((f) => f.cost);
      const main = gains[0];
      const line = (f: Fig, cls: string) => h('p', `bi-fig ${cls}`, '', h('span', 'bi-fl', t(f.label)), h('span', 'bi-fv', `${f.from} → ${f.to}`));
      if (main) out.push(h('div', 'bi-figs', '',
        h('p', 'bi-main', '', h('b', '', main.delta), h('span', '', t(main.label))),
        ...gains.slice(1, 3).map((f) => line(f, 'gain')), ...costs.slice(0, 2).map((f) => line(f, 'cost'))));
    }
    if (more) {
      // past a rating the module says so; the bars along the bottom carry the numbers
      const { use, cap } = budgets(w.levels);
      const warn: string[] = [];
      for (const k of ['power', 'mass', 'heat'] as const) if ((node.draw[k] ?? 0) > 0 && use[k] + node.draw[k]! > cap[k]) warn.push(t(OVER_WORD[k]));
      out.push(...warn.map((x) => h('p', 'bi-warn', x)));
    }
    if (this.more) {
      const note = UPGRADE[id]?.note;
      out.push(h('div', 'bi-more', '',
        ...(adv ? [h('p', 'bi-why', t(adv.text, adv.vars))] : []),
        h('p', 'bi-text', textOf(id, next)),
        ...(note ? [h('p', 'bi-note', t(note))] : [])));
    }
    const btn = h('button', 'bi-go', '') as HTMLButtonElement;
    btn.type = 'button';
    btn.disabled = !!why;
    btn.textContent = fitWord(w, id, why);
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.install(id); });
    // the climb: what the level after this one will cost, so a ladder that never ends still shows where it goes
    if (more && endlessIn(w, id)) out.push(h('p', 'bi-then', t('The next one costs {n} Cyrite', { n: num(cost(id, lv + 2, false, { ...w.levels, [id]: lv + 1 })) })));
    out.push(btn);
    el.replaceChildren(...out);
  }

  /** What the ship feels along the bottom: three bars, acceleration, top speed, cooldown. The selected module moves them before it is fitted. */
  private budgetBar(w: World): void {
    const { use, cap } = budgets(w.levels), now = felt(w.levels);
    const sel = this.view === 'picks' ? this.picks()[this.pick] ?? null : this.sel ? NODE[this.sel] : null;
    const can = sel && blockOf(sel.id, w.bayCtx()) !== 'full';
    const next = can ? felt({ ...w.levels, [sel!.id]: (w.levels[sel!.id] ?? 0) + 1 }) : null;
    $('bay-budget').replaceChildren(...(['mass', 'power', 'heat'] as const).map((k) => {
      const { key, lower, unit, abs, dp } = FELT[k], fmt = (v: number) => `${v.toFixed(dp)}`;
      // the warning light: only once the load is past its rating. A little short of it the bar warms, with no word.
      const share = use[k] / cap[k], state = share > 1 ? 'over' : share >= 0.8 ? 'warn' : '';
      const word = state === 'over' ? LIGHT_WORD[k] : '';
      // a fit just moved this stat: it ticks from what it said to what it says now, with the old figure struck beside it
      const shownNow = fmt(now[abs]), was = this.shown[k], moved = !!this.fresh?.moved.has(k) && was !== undefined && was !== shownNow;
      this.shown[k] = shownNow;
      // the bar is the stat, longer is better (cooldown is drawn as the guns' rate); the tick is the stock ship
      const at = (v: number) => Math.round(Math.min(1, Math.max(0, ((lower ? 1 / v : v) - BAR.lo) / (BAR.hi - BAR.lo))) * 1000) / 10;
      const from = at(now[key]), to = next ? at(next[key]) : from;
      const bar = h('i', `bb-bar${state ? ` ${state}` : ''}`, '', h('i', 'bb-fill'), h('i', 'bb-mark'));
      bar.style.setProperty('--at', `${from}%`);
      bar.style.setProperty('--stock', `${at(1)}%`);
      // what the selected module would do: teal ahead of the fill where it helps, gold over the end of it where it costs
      if (to !== from) {
        const d = h('i', `bb-delta ${to > from ? 'better' : 'worse'}`);
        d.style.left = `${Math.min(from, to)}%`;
        d.style.width = `${Math.abs(to - from)}%`;
        bar.append(d);
      }
      bar.title = `${t('Load')} ${use[k]}/${cap[k]}`;
      const fig = h('span', 'bb-n', shownNow);
      const val = h('b', `bb-v${moved ? ' bump' : ''}`, '', fig);
      const u = h('small', '', ` ${unit}`);
      const then = next ? fmt(next[abs]) : shownNow;
      if (moved) {
        tick(fig, was!, shownNow);
        val.prepend(h('s', 'bb-was', was!));
        setTimeout(() => this.open && this.world && this.budgetBar(this.world), 1500);
      } else if (then !== shownNow) val.append(h('em', '', ` → ${then}`));
      val.append(u);
      // better (teal) or worse (gold): cooldown is better when lower
      if (then !== shownNow) val.classList.add((next![key] < now[key]) === lower ? 'better' : 'worse');
      return h('span', `bb ${k}${state ? ` ${state}` : ''}`, '', h('span', 'bb-l', t(BUDGET_WORD[k]), ...(word ? [h('span', 'bb-w', '', h('i', '', '▲'), h('span', 'bb-wt', t(word)))] : []), val), bar);
    }));
  }
}
