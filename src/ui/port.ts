import { artImg } from './art';
import { placeOfPort } from '../content/art';
import { affordable, cheapest } from '../sim/bay';
import { needsTorpedoFit } from '../sim/tutor';
import { stopIdle, SUPPLIES_TARGET, type Stop } from '../sim/stop';
import type { PortItem, World } from '../sim/world';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { num, plural, t } from '../i18n';

// ── the port ──────────────────────────────────────────────────────────────
// Docked: the world waits while you trade. Top to bottom: what the ship holds
// (Cyrite to spend, jump fluid against the jump, supplies, hull plates), the
// services (the refit bay, which is free to enter and prices its own
// modules; jump fluid, supplies and hull plates a unit at a time), the
// sensible stop (everything topped up in one go: sim/stop.ts) and the
// departure: where the lane goes, whether the tank can make it, and Cast off.
// Every port sets its own prices, and the Net marks them up. The panel is
// redrawn after every trade, so every price and every "can't" is live.
// Entries sit in rows (bay · three purchases · stop · lane and cast off); the
// arrows move between them, Space or a click uses one, Enter casts off.
// The yard's modules are in the refit bay, fitted only while docked.

/** What a sensible stop does, as chips: what comes aboard. */
function deltas(s: Stop): string[] {
  return [
    ...(s.fuel ? [`+${s.fuel} ${t('Jump fluid')}`] : []),
    ...(s.supplies ? [`+${s.supplies} ${t('Supplies')}`] : []),
    ...(s.plate ? [`+${s.plate} ${t('Hull')}`] : []),
  ];
}

/** One thing to press: a service, the stop, the lane change or Cast off. */
type Entry = { key: 'bay' | 'fuel' | 'supplies' | 'plate' | 'stop' | 'lane' | 'cast'; ok: boolean; go: () => void; el?: HTMLElement };

/** The rows the arrows walk (keys of the entries, left to right). */
const ROWS: Entry['key'][][] = [['bay'], ['fuel', 'supplies', 'plate'], ['stop'], ['lane', 'cast']];

/** The lanes out of a port, for re-plotting while docked: `pick` plots one and the world's jump follows it. */
export interface Course {
  lanes: () => Array<{ id: string; name: string; cyrite: number; days: number; note: string }>;
  current: () => string | null;
  pick: (id: string) => void;
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
    $('port-t').textContent = world.bk?.port?.name ?? t('Port');
    // a banner of the place, where the build has one for who holds it
    const banner = world.bk?.port ? artImg('place', placeOfPort(world.bk.port.name, !!world.bk.def.netted), 'port-pic') : null;
    $('port-art').hidden = !banner;
    $('port-art').replaceChildren(...(banner ? [banner] : []));
    $('port-s').textContent = t(world.bk?.def.netted ? 'Refuel · repair · trade · implant scans required' : 'Refuel · repair · trade · no implant checks');
    const x = $('port-x');
    x.onclick = guarded(this.opened, () => this.leave());
    x.onpointerdown = (e) => e.stopPropagation();
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
  private mark(): void {
    for (const e of this.entries) e.el?.classList.toggle('sel', e.key === this.sel);
  }

  private render(): void {
    const w = this.world!;
    // keep the selection on something that still works (a trade can use up the last of what it was on)
    const p = this.plan(w);
    this.entries = p.entries;
    if (!this.entries.find((e) => e.key === this.sel)?.ok) this.sel = this.entries.find((e) => e.ok)?.key ?? 'cast';
    // what the ship holds
    const short = Math.max(0, Math.ceil(w.jumpCost - w.fuel));
    const cell = (k: string, v: string, sub?: string, cls = '') => h('span', `ps-c ${cls}`, '', h('span', 'k', k), h('b', '', v), ...(sub ? [h('span', 'ps-sub', sub)] : []));
    $('port-stock').replaceChildren(
      cell(t('Cyrite'), num(Math.floor(w.cyrite)), t('to spend')),
      cell(t('Jump fluid'), `${num(Math.floor(w.fuel))}/${w.jumpCost}`, short ? t('{n} more to jump', { n: short }) : t('Ready to jump'), short ? 'short' : 'ok'),
      cell(t('Supplies'), `${w.supplies}/${w.supplyMax}`),
      cell(t('Hull'), `${w.plates}/${w.stats.maxPlates}`, t('plates')),
    );
    // the ship's trouble and where it is mended: the stores here, the weight in the bay
    const warn = w.warnings.map((k) => t(PORT_WARN[k], { n: w.weightFuel }));
    const el = $('port-warn');
    el.hidden = !warn.length;
    el.replaceChildren(...warn.map((l) => h('span', '', l)));
    // the services
    for (const [id, node] of [['port-bay', p.bay], ['port-buy', p.buy], ['port-stop', p.stop]] as const) $(id).replaceChildren(...node);
    this.departure(w, short);
    this.mark();
  }

  /** The departure block: where the lane goes, whether the tank can make it, the lane change where there is one. */
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
    st.textContent = short ? t('Need {n} more jump fluid to jump', { n: short }) : t('Ready to jump');
    const lane = $('port-lane') as HTMLButtonElement;
    lane.hidden = lanes.length < 2;
    lane.textContent = t('Change lane');
    lane.onclick = guarded(this.opened, () => this.act('lane'));
    lane.onpointerdown = (e) => e.stopPropagation();
    const e = (k: Entry['key']) => this.entries.find((x) => x.key === k)!;
    lane.disabled = !e('lane').ok;
    e('lane').el = lane;
    e('cast').el = $('port-x');
  }

  /** The port's entries and the rows that show them. */
  private plan(w: World): { entries: Entry[]; bay: HTMLElement[]; buy: HTMLElement[]; stop: HTMLElement[] } {
    const P = w.prices, cy = Math.floor(w.cyrite);
    // the first visit of the training: only the bay is open, and it says to start there (sim/tutor.ts)
    const first = needsTorpedoFit(w);
    const entries: Entry[] = [];
    /** A pressable card; the entry remembers its element so the selection can move without a redraw. */
    const card = (key: Entry['key'], ok: boolean, cls: string, kids: HTMLElement[], go: () => void, label: string): HTMLElement => {
      const b = h('button', `port-l ${cls}`, '', ...kids) as HTMLButtonElement;
      b.type = 'button';
      b.disabled = !ok;
      b.setAttribute('aria-label', label);
      b.onclick = guarded(this.opened, () => this.act(key));
      b.onpointerdown = (e) => e.stopPropagation();
      entries.push({ key, ok, go, el: b });
      return b;
    };
    // the bay: free to enter; the count is what the bay itself would let you fit now
    const ctx = w.bayCtx(), can = affordable(ctx), next = can ? null : cheapest(ctx);
    const bayName = t('Refit bay'), bayText = t('Browse weapons, systems and ship upgrades.');
    const bayState = first ? t('Start here · fit your torpedoes') : can ? plural(can, '{n} upgrade you can afford', '{n} upgrades you can afford') : next ? t('Cheapest part: {n} Cyrite', { n: num(next.cost) }) : t('No upgrades you can afford yet');
    const bay = card('bay', true, `bay${first ? ' lead' : ''}`, [
      h('span', 'pl-t', bayName), h('span', 'pl-d', bayText),
      h('span', 'pl-r', '', h('span', `pl-badge ${can || first ? 'ok' : 'none'}`, bayState), h('span', 'pl-go', t('Open bay'))),
    ], () => { this.close(); this.onBay?.(); }, `${bayName}. ${bayText} ${bayState}`);
    // a purchase: what is aboard, the price, and the one state word that says if you can
    const buy = (key: 'fuel' | 'supplies' | 'plate', name: string, detail: string, price: number, full: string, tag: string, verb: string): HTMLElement => {
      const done = key === 'fuel' ? w.fuel >= w.tankCap : key === 'plate' ? w.plates >= w.stats.maxPlates : w.supplies >= w.supplyMax;
      const ok = !first && w.canBuy(key);
      const need = Math.max(0, Math.ceil(price - w.cyrite));
      const state = first ? badge('lock', t('Locked · use the bay first')) : done ? badge('done', full) : need ? badge('short', t('Need {n} more Cyrite', { n: num(need) })) : badge('ok', t('Can afford'));
      return card(key, ok, `buy${first ? ' locked' : done ? ' done' : need ? ' short' : ''}`, [
        h('span', 'pl-t', name), h('span', 'pl-d', detail), h('span', 'pl-p', tag),
        h('span', 'pl-r', '', state, ...(ok ? [h('span', 'pl-go', verb)] : [])),
      ], () => { w.buy(key); this.render(); }, `${name}. ${detail}. ${tag}`);
    };
    const room = w.supplyMax - w.supplies;
    const buys = [
      buy('fuel', t('Buy jump fluid'), t('{n} in the tank · {m} to jump', { n: Math.floor(w.fuel), m: w.jumpCost }), w.fluidPrice, t('Tank full'), t('{n} Cyrite each', { n: w.fluidPrice }), t('Buy 1')),
      buy('supplies', t('Buy supplies'), room > 0 ? t('{n} aboard · Room for {m} more', { n: w.supplies, m: room }) : t('{n} aboard · No room for more', { n: w.supplies }), P.supplies, t('At capacity'), t('{n} Cyrite each', { n: P.supplies }), t('Buy 1')),
      buy('plate', t('Hull repair'), w.plates >= w.stats.maxPlates ? t('{n} of {m} plates', { n: w.plates, m: w.stats.maxPlates }) : t('{n} of {m} plates · {k} damaged', { n: w.plates, m: w.stats.maxPlates, k: w.stats.maxPlates - w.plates }), P.plate, t('Fully repaired'), t('{n} Cyrite per plate', { n: P.plate }), t('Repair 1')),
    ];
    // the sensible stop: everything up to the jump, then supplies, then the hull, as far as the Cyrite reaches
    const plan = w.planStop(), idle = stopIdle(plan);
    const lack = Math.max(0, Math.ceil(w.jumpCost - w.fuel) - plan.fuel);
    const missing = w.fuel < w.jumpCost || w.supplies < Math.min(w.supplyMax, SUPPLIES_TARGET) || w.plates < w.stats.maxPlates;
    const stop = card('stop', !idle && !first, 'stop', [
      h('span', 'pl-t', t('Sensible stop')),
      idle ? h('span', 'pl-d', lack ? t('Need {n} more jump fluid to jump', { n: lack }) : '') : h('span', 'pl-chips', '', ...deltas(plan).map((c) => h('span', 'pl-chip', c))),
      h('span', 'pl-r', '', first ? badge('lock', t('Locked · use the bay first')) : idle ? (missing ? badge('short', t('Need Cyrite')) : badge('done', t('All topped up'))) : h('b', 'pl-sum', `−${Math.abs(plan.cyrite)} ${t('Cyrite')}`), ...(idle || first ? [] : [h('span', 'pl-go', t('Top up'))])),
    ], () => { w.sensibleStop(); this.render(); }, t('Sensible stop'));
    // the lane change and Cast off live in the departure block; they are entries all the same
    const lanes = this.course?.lanes() ?? [];
    entries.push({
      key: 'lane', ok: lanes.length > 1 && !first,
      go: () => {
        // the next lane out of here, round and round
        const c = this.course!, ls = c.lanes(), at = ls.findIndex((x) => x.id === c.current());
        c.pick(ls[(at + 1) % ls.length]!.id);
        this.render();
      },
    });
    entries.push({ key: 'cast', ok: true, go: () => this.leave() });
    return { entries, bay: [bay], buy: buys, stop: [stop] };
  }
}
