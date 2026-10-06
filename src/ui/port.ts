import { MODULES, SHIP_SYSTEMS, SYSTEM_DEFS, type ShipSystem } from '../content/modules';
import { FOOD_MAX, TANK_MAX } from '../sim/breakout';
import { fitCost } from '../sim/modules';
import type { PortItem, World } from '../sim/world';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { plural, t } from '../i18n';

// ── the port ──────────────────────────────────────────────────────────────
// Docked: the world waits while you trade. Five things to do and a way out:
// sell the hold, buy Cyrite and food a unit at a time, patch a plate, pay for
// a refit (three cards there and then), cast off. Every port sets its own
// prices, and the Net marks them up. The list is redrawn after every trade,
// so every price and every "can't" is live. On a journey a sixth line plots
// again: each press turns to the next lane out of here.
//
// The yard fits modules (content/modules.ts): a line opens the four ship
// systems, each with what its resource stands at, and a system opens its
// modules, each with the next mark's price or what it still needs. Back
// (or Escape, or the pad's B) climbs out a level at a time.

type Line = { key: 'sell' | 'course' | 'yard' | 'back' | 'fit' | PortItem; label: string; price: string; note: string; ok: boolean; go?: () => void };
/** What the panel shows: the trade, the four systems, or one system's modules. */
type View = 'trade' | 'yard' | ShipSystem;

/** The lanes out of a port, for re-plotting while docked: `pick` plots one and the world's jump follows it. */
export interface Course {
  lanes: () => Array<{ id: string; name: string; cyrite: number; days: number; note: string }>;
  current: () => string | null;
  pick: (id: string) => void;
}

export class PortPanel {
  private off: (() => void) | null = null;
  private sel = 0;
  private opened = 0;
  private lines: Line[] = [];
  private world: World | null = null;
  private onLeave: (() => void) | null = null;
  private onRefit: (() => void) | null = null;
  private course: Course | null = null;
  private view: View = 'trade';

  get open(): boolean {
    return !$('port').hidden;
  }

  /** Open on the world's dock. `onRefit` is called when a bought refit puts cards on the table. */
  show(world: World, onLeave: () => void, onRefit: () => void, course: Course | null = null): void {
    this.close();
    this.world = world;
    this.course = course;
    this.onLeave = onLeave;
    this.onRefit = onRefit;
    this.opened = performance.now();
    this.sel = 0;
    this.view = 'trade';
    $('port-t').textContent = world.bk?.port?.name ?? t('Port');
    $('port-s').textContent = t(world.bk?.def.netted ? 'Refuel · repair · trade · under Continuance order' : 'Refuel · repair · trade · no implant checks');
    const x = $('port-x');
    x.onclick = guarded(this.opened, () => this.leave());
    x.onpointerdown = (e) => e.stopPropagation();
    this.render();
    $('port').hidden = false;
    this.off = keys((e) => {
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'].indexOf(e.code);
      if (n >= 0) return this.act(n), true;
      if (e.code === 'Escape' && this.view !== 'trade') return this.back(), true;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape') return this.leave(), true;
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { this.move(e.code === 'ArrowUp' ? -1 : 1); return true; }
      if (e.code === 'Space') return this.act(this.sel), true;
      return e.code.startsWith('Arrow') || e.code === 'Tab';
    }, ['ArrowUp', 'ArrowDown']);
  }

  /** The refit's cards were taken: back to the dock. */
  resume(): void {
    if (!this.world) return;
    this.render();
    $('port').hidden = false;
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('port').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (!this.open || performance.now() - this.opened < GUARD) return;
    if (p.up) this.move(-1);
    else if (p.down) this.move(1);
    else if (p.a) this.act(this.sel);
    else if (p.b) { if (this.view !== 'trade') this.back(); else this.leave(); }
  }

  /** Out of the yard a level: a system to the four, the four to the trade. */
  private back(): void {
    this.go(this.view === 'trade' || this.view === 'yard' ? 'trade' : 'yard');
  }

  private go(v: View): void {
    this.view = v;
    this.sel = 0;
    this.render();
  }

  private move(d: number): void {
    this.sel = (this.sel + d + this.lines.length) % this.lines.length;
    this.render();
  }

  private act(i: number): void {
    const w = this.world, l = this.lines[i];
    if (!w || !l || !l.ok) return;
    this.sel = i;
    if (l.go) { l.go(); return; }
    if (l.key === 'sell') w.sellOre();
    else if (l.key === 'course') {
      // the next lane out of here, round and round
      const c = this.course!, lanes = c.lanes(), at = lanes.findIndex((x) => x.id === c.current());
      c.pick(lanes[(at + 1) % lanes.length]!.id);
    } else {
      w.buy(l.key as PortItem);
      if (l.key === 'refit' && w.phase === 'refit') {
        // the cards take the screen; the dock comes back when they are done
        $('port').hidden = true;
        this.onRefit?.();
        return;
      }
    }
    this.render();
  }

  private leave(): void {
    const w = this.world;
    this.close();
    this.world = null;
    w?.undock();
    this.onLeave?.();
  }

  private render(): void {
    const w = this.world!;
    if (this.view === 'trade') this.trade(w);
    else if (this.view === 'yard') this.yard(w);
    else this.system(w, this.view);
    this.sel = Math.min(this.sel, this.lines.length - 1);
    const kit = w.kit;
    const stock = this.view === 'trade'
      ? [[t('Chits'), String(w.chits)], [t('Tank'), `${w.cyrite}/${w.jumpCost}`], [t('Food'), String(w.food)], [t('Hold'), `${w.ore}/${w.holdMax}`], [t('Hull'), `${w.plates}/${w.stats.maxPlates}`]]
      : [[t('Chits'), String(w.chits)], ...SHIP_SYSTEMS.map((s) => [t(SYSTEM_DEFS[s].name), String(kit[s])])];
    $('port-stock').replaceChildren(...stock.map(([k, v]) => h('span', '', '', h('span', 'k', k!), h('b', '', v!))));
    $('port-list').replaceChildren(...this.lines.map((l, i) => {
      const b = h('button', `port-l${i === this.sel ? ' sel' : ''}`, '', h('kbd', '', String(i + 1)), h('span', 'pl-n', l.label), h('span', 'pl-note', l.note), h('b', 'pl-p', l.price)) as HTMLButtonElement;
      b.type = 'button';
      b.disabled = !l.ok;
      b.onclick = guarded(this.opened, () => this.act(i));
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }

  /** Modules whose next mark can be fitted now. */
  private fittable(w: World, sys?: ShipSystem): number {
    return MODULES.filter((m) => (!sys || m.system === sys) && !w.fitNeeds(m.id).length).length;
  }

  private yard(w: World): void {
    const kit = w.kit;
    this.lines = [
      { key: 'back', label: t('Back to the dock'), price: '', note: '', ok: true, go: () => this.go('trade') },
      ...SHIP_SYSTEMS.map((s): Line => {
        const d = SYSTEM_DEFS[s], n = this.fittable(w, s);
        return { key: 'yard', label: t(d.name), price: n ? String(n) : '—', note: `${kit[s]} ${t(d.resource)} · ${t(d.source)}`, ok: true, go: () => this.go(s) };
      }),
    ];
  }

  private system(w: World, sys: ShipSystem): void {
    this.lines = [
      { key: 'back', label: t('Back to the systems'), price: '', note: '', ok: true, go: () => this.go('yard') },
      ...MODULES.filter((m) => m.system === sys).map((m): Line => {
        const mk = w.levels[m.id] ?? 0, cost = fitCost(w.levels, m.id), needs = w.fitNeeds(m.id);
        const label = m.max > 1 ? `${t(m.name)} ${cost ? `Mk ${mk + 1}` : `Mk ${mk}`}` : t(m.name);
        return {
          key: 'fit', label, price: cost ? `${cost.kit} ${t(SYSTEM_DEFS[sys].name)} · ${cost.chits}c` : t('Fitted'), note: cost && needs.length ? needs.map((n) => t(n)).join(' · ') : t(m.text), ok: !needs.length,
          go: () => { w.fitModule(m.id); this.render(); },
        };
      }),
    ];
  }

  private trade(w: World): void {
    const P = w.prices, need = Math.max(0, w.jumpCost - w.cyrite);
    this.lines = [
      { key: 'sell', label: t('Sell the hold'), price: w.ore ? `+${w.ore * P.ore}` : '—', note: t('{n} ore at {p} chits', { n: w.ore, p: P.ore }), ok: w.ore > 0 },
      { key: 'cyrite', label: t('Buy Cyrite'), price: `${P.cyrite}`, note: w.cyrite >= TANK_MAX ? t('Tank full') : need ? t('{n} short of the jump', { n: need }) : t('Enough to jump'), ok: w.canBuy('cyrite') },
      { key: 'food', label: t('Buy food'), price: `${P.food}`, note: w.food >= FOOD_MAX ? t('Galley full') : t('{n} in the galley · a day each', { n: w.food }), ok: w.canBuy('food') },
      { key: 'plate', label: t('Patch a plate'), price: `${P.plate}`, note: w.plates >= w.stats.maxPlates ? t('Hull whole') : `${t('Hull')} ${w.plates}/${w.stats.maxPlates}`, ok: w.canBuy('plate') },
      { key: 'refit', label: t('Pay for a refit'), price: `${P.refit}`, note: t('Three cards, take one'), ok: w.canBuy('refit') },
    ];
    const c = this.course, lanes = c?.lanes() ?? [];
    if (c && lanes.length) {
      const now = lanes.find((x) => x.id === c.current()) ?? lanes[0]!;
      this.lines.push({
        key: 'course', label: t(lanes.length > 1 ? 'Plot another lane' : 'The lane out'), price: `${now.cyrite} ${t('Cyrite')}`,
        note: [t('Bound for {dest}', { dest: now.name }), plural(now.days, '{n} day', '{n} days'), now.note].filter(Boolean).join(' · '), ok: lanes.length > 1,
      });
    }
    // the yard, after the trade: modules for the four systems
    const n = this.fittable(w);
    this.lines.push({ key: 'yard', label: t('Fit modules'), price: n ? String(n) : '—', note: n ? t('{n} ready to fit', { n }) : SHIP_SYSTEMS.map((s) => t(SYSTEM_DEFS[s].name)).join(' · '), ok: true, go: () => this.go('yard') });
  }
}
