import { artImg } from './art';
import { placeOfPort } from '../content/art';
import { affordable, cheapest } from '../sim/bay';
import { needsTorpedoFit } from '../sim/tutor';
import type { World } from '../sim/world';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { num, plural, t } from '../i18n';
import supplyBackdrop from '../assets/wayward-supply-background.webp?url';

// The pictures (icons, item art, the hangar) come from src/assets/supply.
const PICS = import.meta.glob('../assets/supply/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** Fetch and decode the port's pictures now, in a quiet moment, so the first dock does not pay for them. */
export function preloadPort(): void {
  for (const url of [supplyBackdrop, ...Object.values(PICS)]) {
    const img = new Image();
    img.src = url;
    void img.decode?.().catch(() => undefined);
  }
}

function pic(name: string, cls: string): HTMLImageElement {
  const img = new Image();
  img.src = PICS[`../assets/supply/${name}.webp`] ?? '';
  img.alt = '';
  img.className = cls;
  img.draggable = false;
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

// ── the port ──────────────────────────────────────────────────────────────
// Docked: the world waits while you trade. Top to bottom: what the ship holds
// (Cyrite to spend, then jump fluid and supplies, each with its one Fill
// button), the refit bay (free to enter; it prices its own modules) and the
// departure: where the lane goes, whether the tank can make it, and Cast off.
// The yard mends the hull for nothing, so there is no hull to buy. Every port
// sets its own prices, and the Net marks them up. The panel is redrawn after
// every trade, so every price and every "can't" is live. Entries sit in rows
// (bay · fluid and supplies · cast off); the arrows move between them, Space or
// a click uses one, Enter casts off. The lane is chosen on the chart, not here.
// The yard's modules are in the refit bay, fitted only while docked.

/** One thing to press: a service, the stop or Cast off. */
type Entry = { key: 'bay' | 'fuel' | 'supplies' | 'cast'; ok: boolean; go: () => void; el?: HTMLElement };
type Buyable = 'fuel' | 'supplies';

/** The rows the arrows walk (keys of the entries, left to right). */
const ROWS: Entry['key'][][] = [['bay'], ['fuel', 'supplies'], ['cast']];

/** The lane out of here, for the departure line (the lane itself is plotted on the chart). */
export interface Course {
  lanes: () => Array<{ id: string; name: string; cyrite: number; days: number; note: string }>;
  current: () => string | null;
}

/** What a port says of the ship's state, and what to do about it (World.warnings). */
const PORT_WARN = {
  empty: 'Out of supplies · handling is reduced. Buy more here.',
  low: 'Supplies low · only a few jumps remain before performance drops. Buy more here.',
  heavy: 'Heavy load · sluggish handling and {n} extra jump fluid per jump. Sell cargo or refit at the Bay to reduce the load.',
  hot: 'Guns slow · long cooldown. Fit coolant loops at the Bay to fix this.',
  strained: 'Reactor strained · lower top speed. Fit a reactor core at the Bay to fix this.',
} as const;

export class PortPanel {
  private off: (() => void) | null = null;
  private sel: Entry['key'] = 'bay';
  private opened = 0;
  private entries: Entry[] = [];
  private world: World | null = null;
  private onLeave: (() => void) | null = null;
  private onBay: (() => void) | null = null;
  private course: Course | null = null;
  /** The line under the services: what the last press did. */
  private msg = '';

  get open(): boolean {
    return !$('port').hidden;
  }

  /** Open on the world's dock. `onBay` opens the refit bay; the dock comes back when it closes. */
  show(world: World, onLeave: () => void, onBay: () => void, course: Course | null = null): void {
    this.close();
    this.world = world;
    this.course = course;
    this.onLeave = onLeave;
    this.onBay = onBay;
    this.opened = performance.now();
    this.sel = 'bay';
    // the yard mends the hull while the ship is docked
    const mended = world.mendAtDock();
    this.msg = mended ? t('Hull mended at the dock · {n} plates', { n: mended }) : '';
    $('port-t').textContent = world.bk?.port?.name ?? t('Port');
    // a banner of the place, where the build has one for who holds it
    const banner = world.bk?.port ? artImg('place', placeOfPort(world.bk.port.name, !!world.bk.def.netted), 'port-pic') : null;
    $('port-art').hidden = !banner;
    $('port-art').replaceChildren(...(banner ? [banner] : []));
    // where this is (the system) and what the port asks of the crew
    $('port-s').textContent = [world.bk?.def.name ? t(world.bk.def.name) : '', t(world.bk?.def.netted ? 'Implant scans required' : 'No implant checks')].filter(Boolean).join(' · ');
    const x = $('port-x');
    x.onclick = guarded(this.opened, () => this.leave());
    x.onpointerdown = (e) => e.stopPropagation();
    // the header's two words are shortcuts: Trade walks to the stores, Refit opens the bay
    const jump: Record<string, () => void> = { trade: () => this.pick('fuel'), refit: () => this.act('bay') };
    for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>('#port .dk-nav button'))) {
      b.onclick = guarded(this.opened, () => jump[b.dataset.go ?? '']?.());
      b.onpointerdown = (e) => e.stopPropagation();
    }
    this.render();
    $('port').hidden = false;
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape') return this.leave(), true;
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { this.move(0, e.code === 'ArrowUp' ? -1 : 1); return true; }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { this.move(e.code === 'ArrowLeft' ? -1 : 1, 0); return true; }
      if (e.code === 'Space') return this.act(this.sel), true;
      return e.code.startsWith('Arrow') || e.code === 'Tab';
    }, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('port').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (!this.open || performance.now() - this.opened < GUARD) return;
    if (p.up) this.move(0, -1);
    else if (p.down) this.move(0, 1);
    else if (p.left) this.move(-1, 0);
    else if (p.right) this.move(1, 0);
    else if (p.a) this.act(this.sel);
    else if (p.b) this.leave();
  }

  /** Walk the rows: sideways within one, up or down to the nearest pressable entry of the next row that has one. */
  private move(dx: number, dy: number): void {
    const live = (k: Entry['key']) => !!this.entries.find((e) => e.key === k)?.ok;
    let r = ROWS.findIndex((row) => row.includes(this.sel)), c = ROWS[r]!.indexOf(this.sel);
    if (dx) {
      const row = ROWS[r]!.filter(live), at = row.indexOf(this.sel);
      const next = row[at + dx];
      if (next) this.sel = next;
    } else {
      for (let n = r + dy; n >= 0 && n < ROWS.length; n += dy) {
        const row = ROWS[n]!.filter(live);
        if (!row.length) continue;
        // keep the column where the row is as wide, else the nearest
        const want = Math.min(c, ROWS[n]!.length - 1);
        this.sel = row.reduce((a, b) => (Math.abs(ROWS[n]!.indexOf(b) - want) < Math.abs(ROWS[n]!.indexOf(a) - want) ? b : a));
        break;
      }
    }
    this.mark();
  }

  private act(key: Entry['key']): void {
    const w = this.world, e = this.entries.find((x) => x.key === key);
    if (!w || !e || !e.ok) return;
    this.sel = key;
    e.go();
  }

  private leave(): void {
    const w = this.world;
    this.close();
    this.world = null;
    w?.undock();
    this.onLeave?.();
  }

  /** The selection highlight, moved without redrawing. */
  private pick(key: Entry['key']): void {
    if (!this.entries.find((e) => e.key === key)?.ok) return;
    this.sel = key;
    this.mark();
  }

  private mark(): void {
    for (const e of this.entries) e.el?.classList.toggle('sel', e.key === this.sel);
  }

  /** The most one press can buy now: what there is room for, as far as the Cyrite reaches. */
  private most(w: World, key: Buyable): number {
    const price = key === 'fuel' ? w.fluidPrice : w.prices[key];
    const room = key === 'fuel' ? Math.floor(w.tankCap - w.fuel) : w.supplyMax - w.supplies;
    return Math.max(0, Math.min(room, Math.floor(w.cyrite / price)));
  }

  private render(): void {
    const w = this.world!;
    // keep the selection on something that still works (a trade can use up the last of what it was on)
    const p = this.plan(w);
    this.entries = p.entries;
    if (!this.entries.find((e) => e.key === this.sel)?.ok) this.sel = this.entries.find((e) => e.ok)?.key ?? 'cast';
    // what the ship holds: Cyrite, then the two things bought here, each with its one button
    const short = Math.max(0, Math.ceil(w.jumpCost - w.fuel));
    const cell = (ico: string, k: string, v: string, sub?: string, cls = '', act?: HTMLElement) => h('span', `ps-c ${cls}`, '', pic(ico, 'ps-pic'), h('span', 'ps-t', '', h('span', 'k', k), h('b', '', v), ...(sub ? [h('span', 'ps-sub', sub)] : [])), ...(act ? [act] : []));
    $('port-stock').replaceChildren(
      cell('ico-cyrite', t('Cyrite'), num(Math.floor(w.cyrite))),
      cell('ico-fluid', t('Jump fluid'), `${num(Math.floor(w.fuel))}/${w.jumpCost}`, p.sub.fuel, `buyc ${short ? 'short' : 'ok'}`, p.act.fuel),
      cell('ico-supplies', t('Supplies'), `${w.supplies}/${w.supplyMax}`, p.sub.supplies, 'buyc', p.act.supplies),
    );
    // the ship's trouble and where it is mended: the stores here, the weight in the bay
    const warn = w.warnings.map((k) => t(PORT_WARN[k], { n: w.weightFuel }));
    const el = $('port-warn');
    el.hidden = !warn.length;
    el.replaceChildren(...warn.map((l) => h('span', '', l)));
    // the services
    $('port-bay').replaceChildren(...p.bay);
    $('port-msg').textContent = this.msg;
    this.departure(w, short);
    this.mark();
  }

  /** The departure block: where the lane goes, and whether the tank can make it. */
  private departure(w: World, short: number): void {
    const c = this.course, lanes = c?.lanes() ?? [];
    const now = c ? lanes.find((x) => x.id === c.current()) ?? lanes[0] : undefined;
    const dest = now?.name ?? (w.bk ? t(w.bk.def.dest) : '');
    $('port-dest').textContent = dest ? t('Bound for {dest}', { dest }) : t('Out of the system');
    // the jump asks what the world asks (the lane's cost and the ship's weight): the one number the strip and the jump check share
    const meta = [now ? plural(now.days, '{n} day', '{n} days') : '', t('{n} jump fluid', { n: w.jumpCost }), now?.note].filter(Boolean).join(' · ');
    $('port-dmeta').textContent = meta;
    const st = $('port-dstat');
    st.className = `pd-stat ${short ? 'short' : 'ok'}`;
    st.replaceChildren(...(short ? [pic('warn', 'warnico')] : []), document.createTextNode(short ? t('Need {n} more jump fluid to jump', { n: short }) : t('Ready to jump')));
    $('port-pin').replaceChildren(pic('act-pin', 'pinico'));
    this.entries.find((x) => x.key === 'cast')!.el = $('port-x');
  }

  /** The port's entries and the rows that show them. */
  private plan(w: World): { entries: Entry[]; bay: HTMLElement[]; act: Record<Buyable, HTMLElement>; sub: Record<Buyable, string> } {
    const P = w.prices;
    // the first visit of the training: only the bay is open, and it says to start there (sim/tutor.ts)
    const first = needsTorpedoFit(w);
    const entries: Entry[] = [];
    const remember = (key: Entry['key'], ok: boolean, el: HTMLElement, go: () => void) => { entries.push({ key, ok, go, el }); };
    // the bay: free to enter; the count is what the bay itself would let you fit now
    const ctx = w.bayCtx(), can = affordable(ctx), next = can ? null : cheapest(ctx);
    const bayName = t('Refit bay'), bayText = t('Browse weapons, systems and ship upgrades.');
    const bayState = first ? t('Start here · fit your torpedoes') : can ? plural(can, '{n} upgrade you can afford', '{n} upgrades you can afford') : next ? t('Cheapest part: {n} Cyrite', { n: num(next.cost) }) : t('No upgrades you can afford yet');
    const bay = h('button', `port-l bay${first ? ' lead' : ''}`, '',
      h('span', 'pl-id', '', pic('act-repair', 'pl-art bayico'), h('span', 'pl-m', '', h('span', 'pl-t', bayName), h('span', 'pl-d', bayText), h('span', `pl-badge ${can || first ? 'ok' : 'none'}`, bayState))),
      pic('bay-hero', 'bay-hero'),
      h('span', 'pl-go', t('Open refit bay')),
    ) as HTMLButtonElement;
    bay.type = 'button';
    bay.setAttribute('aria-label', `${bayName}. ${bayText} ${bayState}`);
    bay.onclick = guarded(this.opened, () => this.act('bay'));
    bay.onpointerdown = (e) => e.stopPropagation();
    remember('bay', true, bay, () => { this.close(); this.onBay?.(); });
    // a purchase: one Fill button that tops the store up as far as the Cyrite reaches; the line under the count says what it costs
    const act = {} as Record<Buyable, HTMLElement>, sub = {} as Record<Buyable, string>;
    const buy = (key: Buyable, price: number, done: boolean, did: (n: number, c: number) => string) => {
      const most = this.most(w, key);
      const ok = !first && w.canBuy(key);
      const need = Math.max(0, Math.ceil(price - w.cyrite));
      sub[key] = first ? t('Locked · use the bay first') : done ? t('Full') : need ? t('Need {n} more Cyrite', { n: num(need) }) : t('{n} for {c} Cyrite', { n: most, c: num(most * price) });
      const go = h('button', 'pl-go', ok ? `${t('Fill')} +${most}` : t('Fill')) as HTMLButtonElement;
      go.type = 'button';
      go.disabled = !ok;
      go.onclick = guarded(this.opened, () => this.act(key));
      go.onpointerdown = (e) => { e.stopPropagation(); this.sel = key; this.mark(); };
      act[key] = go;
      remember(key, ok, go, () => {
        let got = 0;
        for (let i = 0; i < most && w.buy(key); i++) got++;
        this.msg = got ? did(got, got * price) : '';
        this.render();
      });
    };
    buy('fuel', w.fluidPrice, w.fuel >= w.tankCap, (n, c) => t('Bought {n} jump fluid · −{c} Cyrite', { n, c: num(c) }));
    buy('supplies', P.supplies, w.supplies >= w.supplyMax, (n, c) => t('Bought {n} supplies · −{c} Cyrite', { n, c: num(c) }));
    entries.push({ key: 'cast', ok: true, go: () => this.leave() });
    return { entries, bay: [bay], act, sub };
  }
}
