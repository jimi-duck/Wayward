import { artImg } from './art';
import { placeOfPort } from '../content/art';
import { affordable, cheapest } from '../sim/bay';
import { needsTorpedoFit } from '../sim/tutor';
import { stopIdle, SUPPLIES_TARGET, type Stop } from '../sim/stop';
import type { PortItem, World } from '../sim/world';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { num, plural, t } from '../i18n';

// The pictures (icons, item art, the hangar) come from src/assets/supply.
const PICS = import.meta.glob('../assets/supply/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
function pic(name: string, cls: string): HTMLImageElement {
  const img = new Image();
  img.src = PICS[`../assets/supply/${name}.webp`] ?? '';
  img.alt = '';
  img.className = cls;
  img.draggable = false;
  return img;
}

// ── the port ──────────────────────────────────────────────────────────────
// Docked: the world waits while you trade. Top to bottom: what the ship holds
// (Cyrite to spend, jump fluid against the jump, supplies, hull plates), the
// services (the refit bay, which is free to enter and prices its own
// modules; jump fluid, supplies and hull plates a unit at a time), the
// sensible stop (everything topped up in one go: sim/stop.ts) and the
// departure: where the lane goes, whether the tank can make it, and Cast off.
// Every port sets its own prices, and the Net marks them up. The panel is
// redrawn after every trade, so every price and every "can't" is live.
// Entries sit in rows (bay · three purchases · stop · cast off); the arrows
// move between them, Space or a click uses one, Enter casts off. A purchase
// has a quantity (the − and + buttons, or the − and + keys on the selected
// card) and buys that many in one press. The lane is chosen on the chart, not
// here.
// The yard's modules are in the refit bay, fitted only while docked.

/** What a sensible stop does, as chips: what comes aboard. */
function deltas(s: Stop): string[] {
  return [
    ...(s.fuel ? [`+${s.fuel} ${t('Jump fluid')}`] : []),
    ...(s.supplies ? [`+${s.supplies} ${t('Supplies')}`] : []),
    ...(s.plate ? [`+${s.plate} ${t('Hull')}`] : []),
  ];
}

/** One thing to press: a service, the stop or Cast off. */
type Entry = { key: 'bay' | 'fuel' | 'supplies' | 'plate' | 'stop' | 'cast'; ok: boolean; go: () => void; el?: HTMLElement };
type Buyable = 'fuel' | 'supplies' | 'plate';

/** The rows the arrows walk (keys of the entries, left to right). */
const ROWS: Entry['key'][][] = [['fuel', 'supplies', 'plate'], ['bay'], ['stop'], ['cast']];

/** The lane out of here, for the departure line (the lane itself is plotted on the chart). */
export interface Course {
  lanes: () => Array<{ id: string; name: string; cyrite: number; days: number; note: string }>;
  current: () => string | null;
}

/** What a port says of the ship's state, and what to do about it (World.warnings). */
const PORT_WARN = {
  empty: 'Out of supplies · handling is reduced. Buy more here.',
  low: 'Supplies low · only a few jumps remain before performance drops. Buy more here.',
  heavy: 'Heavy load · slower turning and {n} extra jump fluid per jump. Sell cargo or refit at the Bay to reduce the load.',
  hot: 'Weapons overheating · guns fire more slowly. Fit cooling at the Bay to fix this.',
} as const;

/** The state words, the same on every service: say what you can do, or why not. Never colour alone. */
function badge(kind: 'ok' | 'short' | 'done' | 'lock', text: string): HTMLElement {
  return h('span', `pl-badge ${kind}`, text);
}

export class PortPanel {
  private off: (() => void) | null = null;
  private sel: Entry['key'] = 'bay';
  private opened = 0;
  private entries: Entry[] = [];
  private world: World | null = null;
  private onLeave: (() => void) | null = null;
  private onBay: (() => void) | null = null;
  private course: Course | null = null;
  /** How many of each the next press buys. */
  private qty: Record<Buyable, number> = { fuel: 1, supplies: 1, plate: 1 };
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
    this.qty = { fuel: 1, supplies: 1, plate: 1 };
    this.msg = '';
    $('port-t').textContent = world.bk?.port?.name ?? t('Port');
    // a banner of the place, where the build has one for who holds it
    const banner = world.bk?.port ? artImg('place', placeOfPort(world.bk.port.name, !!world.bk.def.netted), 'port-pic') : null;
    $('port-art').hidden = !banner;
    $('port-art').replaceChildren(...(banner ? [banner] : []));
    $('port-s').textContent = t(world.bk?.def.netted ? 'Implant scans required' : 'No implant checks');
    const x = $('port-x');
    x.onclick = guarded(this.opened, () => this.leave());
    x.onpointerdown = (e) => e.stopPropagation();
    // the header's three words are shortcuts: Trade and Repair walk to their card, Refit opens the bay
    const jump: Record<string, () => void> = { trade: () => this.pick('fuel'), repair: () => this.pick('plate'), refit: () => this.act('bay') };
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
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') return this.step(this.sel, -1), true;
      if (e.code === 'Equal' || e.code === 'NumpadAdd') return this.step(this.sel, 1), true;
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

  /** The most one press can buy now: what is short, what there is room for, what the Cyrite reaches. */
  private most(w: World, key: Buyable): number {
    const price = key === 'fuel' ? w.fluidPrice : w.prices[key];
    const room = key === 'fuel' ? Math.floor(w.tankCap - w.fuel) : key === 'plate' ? w.stats.maxPlates - w.plates : w.supplyMax - w.supplies;
    return Math.max(0, Math.min(room, Math.floor(w.cyrite / price)));
  }

  /** Change how many the selected card buys, kept between 1 and what can be bought. */
  private step(key: Entry['key'], d: number): void {
    const w = this.world;
    if (!w || (key !== 'fuel' && key !== 'supplies' && key !== 'plate')) return;
    this.qty[key] = Math.max(1, Math.min(Math.max(1, this.most(w, key)), this.qty[key] + d));
    this.render();
  }

  private render(): void {
    const w = this.world!;
    // keep the selection on something that still works (a trade can use up the last of what it was on)
    const p = this.plan(w);
    this.entries = p.entries;
    if (!this.entries.find((e) => e.key === this.sel)?.ok) this.sel = this.entries.find((e) => e.ok)?.key ?? 'cast';
    // what the ship holds: an icon, the name, what is aboard against what fits
    const short = Math.max(0, Math.ceil(w.jumpCost - w.fuel));
    const cell = (ico: string, k: string, v: string, sub?: string, cls = '') => h('span', `ps-c ${cls}`, '', pic(ico, 'ps-pic'), h('span', 'ps-t', '', h('span', 'k', k), h('b', '', v), ...(sub ? [h('span', 'ps-sub', sub)] : [])));
    $('port-stock').replaceChildren(
      cell('ico-cyrite', t('Cyrite'), num(Math.floor(w.cyrite))),
      cell('ico-fluid', t('Jump fluid'), `${num(Math.floor(w.fuel))}/${w.jumpCost}`, short ? t('{n} more to jump', { n: short }) : t('Ready to jump'), short ? 'short' : 'ok'),
      cell('ico-supplies', t('Supplies'), `${w.supplies}/${w.supplyMax}`),
      cell('ico-hull', t('Hull'), `${w.plates}/${w.stats.maxPlates}`),
    );
    // the ship's trouble and where it is mended: the stores here, the weight in the bay
    const warn = w.warnings.map((k) => t(PORT_WARN[k], { n: w.weightFuel }));
    const el = $('port-warn');
    el.hidden = !warn.length;
    el.replaceChildren(...warn.map((l) => h('span', '', l)));
    // the services
    for (const [id, node] of [['port-buy', p.buy], ['port-bay', p.bay], ['port-stop', p.stop]] as const) $(id).replaceChildren(...node);
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
  private plan(w: World): { entries: Entry[]; bay: HTMLElement[]; buy: HTMLElement[]; stop: HTMLElement[] } {
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
      pic('art-bay', 'pl-art bayico'),
      h('span', 'pl-m', '', h('span', 'pl-t', bayName), h('span', 'pl-d', bayText), h('span', `pl-badge ${can || first ? 'ok' : 'none'}`, bayState)),
      pic('bay-wide', 'bay-wide'),
      h('span', 'pl-go', t('Open bay')),
    ) as HTMLButtonElement;
    bay.type = 'button';
    bay.setAttribute('aria-label', `${bayName}. ${bayText} ${bayState}`);
    bay.onclick = guarded(this.opened, () => this.act('bay'));
    bay.onpointerdown = (e) => e.stopPropagation();
    remember('bay', true, bay, () => { this.close(); this.onBay?.(); });
    // a purchase: what is aboard, the unit price, a quantity, and the one state word that says if you can
    const buy = (key: Buyable, ico: string, name: string, detail: string, price: number, full: string, tag: string, verb: string, did: (n: number, c: number) => string): HTMLElement => {
      const done = key === 'fuel' ? w.fuel >= w.tankCap : key === 'plate' ? w.plates >= w.stats.maxPlates : w.supplies >= w.supplyMax;
      const most = this.most(w, key);
      const ok = !first && w.canBuy(key);
      const n = Math.max(1, Math.min(Math.max(1, most), this.qty[key]));
      this.qty[key] = n;
      const need = Math.max(0, Math.ceil(price - w.cyrite));
      const state = first ? badge('lock', t('Locked · use the bay first')) : done ? badge('done', full) : need ? badge('short', t('Need {n} more Cyrite', { n: num(need) })) : badge('ok', t('Can afford'));
      const stepper = (sign: 1 | -1, label: string) => {
        const b = h('button', 'pl-q', sign < 0 ? '−' : '+') as HTMLButtonElement;
        b.type = 'button';
        b.disabled = !ok || (sign < 0 ? n <= 1 : n >= most);
        b.setAttribute('aria-label', label);
        b.onclick = guarded(this.opened, () => { this.sel = key; this.step(key, sign); });
        b.onpointerdown = (e) => e.stopPropagation();
        return b;
      };
      const go = h('button', 'pl-go', ok ? `${verb} ${n}` : verb) as HTMLButtonElement;
      go.type = 'button';
      go.disabled = !ok;
      go.onclick = guarded(this.opened, () => this.act(key));
      go.onpointerdown = (e) => e.stopPropagation();
      const card = h('div', `port-l buy${first ? ' locked' : done ? ' done' : need ? ' short' : ''}`, '',
        pic(ico, 'pl-art'),
        h('span', 'pl-m', '', h('span', 'pl-t', name), h('span', 'pl-d', detail), h('span', 'pl-p', tag)),
        h('span', 'pl-r', '', state),
        ...(ok ? [h('span', 'pl-buy', '', h('span', 'pl-qty', '', stepper(-1, t('Fewer')), h('b', '', String(n)), stepper(1, t('More'))), go, h('span', 'pl-tot', t('Total {n} Cyrite', { n: num(n * price) })))] : []),
      );
      card.setAttribute('role', 'group');
      card.setAttribute('aria-label', `${name}. ${detail}. ${tag}`);
      card.onpointerdown = () => { if (ok) this.sel = key; this.mark(); };
      remember(key, ok, card, () => {
        let got = 0;
        for (let i = 0; i < n && w.buy(key); i++) got++;
        this.msg = got ? did(got, got * price) : '';
        this.render();
      });
      return card;
    };
    const room = w.supplyMax - w.supplies;
    const buys = [
      buy('fuel', 'art-fluid', t('Buy jump fluid'), t('{n} in the tank · {m} to jump', { n: Math.floor(w.fuel), m: w.jumpCost }), w.fluidPrice, t('Tank full'), t('{n} Cyrite each', { n: w.fluidPrice }), t('Buy'), (n, c) => t('Bought {n} jump fluid · −{c} Cyrite', { n, c: num(c) })),
      buy('supplies', 'art-supplies', t('Buy supplies'), room > 0 ? t('{n} aboard · Room for {m} more', { n: w.supplies, m: room }) : t('{n} aboard · No room for more', { n: w.supplies }), P.supplies, t('At capacity'), t('{n} Cyrite each', { n: P.supplies }), t('Buy'), (n, c) => t('Bought {n} supplies · −{c} Cyrite', { n, c: num(c) })),
      buy('plate', 'art-hull', t('Hull repair'), w.plates >= w.stats.maxPlates ? t('{n} of {m} plates', { n: w.plates, m: w.stats.maxPlates }) : t('{n} of {m} plates · {k} damaged', { n: w.plates, m: w.stats.maxPlates, k: w.stats.maxPlates - w.plates }), P.plate, t('Fully repaired'), t('{n} Cyrite per plate', { n: P.plate }), t('Repair'), (n, c) => t('Repaired {n} hull plates · −{c} Cyrite', { n, c: num(c) })),
    ];
    // the sensible stop: everything up to the jump, then supplies, then the hull, as far as the Cyrite reaches
    const plan = w.planStop(), idle = stopIdle(plan);
    const lack = Math.max(0, Math.ceil(w.jumpCost - w.fuel) - plan.fuel);
    const missing = w.fuel < w.jumpCost || w.supplies < Math.min(w.supplyMax, SUPPLIES_TARGET) || w.plates < w.stats.maxPlates;
    const stopOk = !idle && !first;
    const stop = h('div', `port-l stop${stopOk ? '' : ' off'}`, '',
      pic('act-buy', 'pl-art stopico'),
      h('span', 'pl-m', '', h('span', 'pl-t', t('Recommended purchase')), h('span', 'pl-d', idle && lack ? t('Need {n} more jump fluid to jump', { n: lack }) : t('Sensible stop for your next jump.'))),
      ...(idle ? [] : [h('span', 'pl-chips', '', ...deltas(plan).map((c) => h('span', 'pl-chip', c)))]),
      h('span', 'pl-r', '', first ? badge('lock', t('Locked · use the bay first')) : idle ? (missing ? badge('short', t('Need Cyrite')) : badge('done', t('All topped up'))) : h('span', 'pl-cost', '', h('span', 'k', t('Total cost')), h('b', 'pl-sum', `${num(Math.abs(plan.cyrite))} ${t('Cyrite')}`))),
    );
    if (stopOk) {
      const go = h('button', 'pl-go', t('Buy recommended')) as HTMLButtonElement;
      go.type = 'button';
      go.onclick = guarded(this.opened, () => this.act('stop'));
      go.onpointerdown = (e) => e.stopPropagation();
      stop.append(go);
    }
    stop.setAttribute('aria-label', t('Recommended purchase'));
    remember('stop', stopOk, stop, () => { const done = w.sensibleStop(); this.msg = t('Topped up · −{c} Cyrite', { c: num(Math.abs(done.cyrite)) }); this.render(); });
    entries.push({ key: 'cast', ok: true, go: () => this.leave() });
    return { entries, bay: [bay], buy: buys, stop: [stop] };
  }
}
