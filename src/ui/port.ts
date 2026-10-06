import { FOOD_MAX, TANK_MAX } from '../sim/breakout';
import type { PortItem, World } from '../sim/world';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { num, plural, t } from '../i18n';

// ── the port ──────────────────────────────────────────────────────────────
// Docked: the world waits while you trade. Five things to do and a way out:
// sell the hold, buy Cyrite and food a unit at a time, patch a plate, open
// the refit bay (it always opens at a port), cast off. Every port sets its own
// prices, and the Net marks them up. The list is redrawn after every trade,
// so every price and every "can't" is live. On a journey a sixth line plots
// again: each press turns to the next lane out of here. The yard's modules
// are in the refit bay, fitted only while docked.

type Line = { key: 'sell' | 'course' | 'bay' | PortItem; label: string; price: string; note: string; ok: boolean; go?: () => void };

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
    this.sel = 0;
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
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape') return this.leave(), true;
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { this.move(e.code === 'ArrowUp' ? -1 : 1); return true; }
      if (e.code === 'Space') return this.act(this.sel), true;
      return e.code.startsWith('Arrow') || e.code === 'Tab';
    }, ['ArrowUp', 'ArrowDown']);
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
    else if (p.b) this.leave();
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
    this.trade(w);
    this.sel = Math.min(this.sel, this.lines.length - 1);
    const stock = [[t('Chits'), String(w.chits)], [t('Tank'), `${w.cyrite}/${w.jumpCost}`], [t('Food'), String(w.food)], [t('Hold'), `${w.ore}/${w.holdMax}`], [t('Hull'), `${w.plates}/${w.stats.maxPlates}`]];
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

  private trade(w: World): void {
    const P = w.prices, need = Math.max(0, w.jumpCost - w.cyrite);
    this.lines = [
      { key: 'sell', label: t('Sell the hold'), price: w.ore ? `+${w.ore * P.ore}` : '—', note: t('{n} ore at {p} chits', { n: w.ore, p: P.ore }), ok: w.ore > 0 },
      { key: 'cyrite', label: t('Buy Cyrite'), price: `${P.cyrite}`, note: w.cyrite >= TANK_MAX ? t('Tank full') : need ? t('{n} short of the jump', { n: need }) : t('Enough to jump'), ok: w.canBuy('cyrite') },
      { key: 'food', label: t('Buy food'), price: `${P.food}`, note: w.food >= FOOD_MAX ? t('Galley full') : t('{n} in the galley · a day each', { n: w.food }), ok: w.canBuy('food') },
      { key: 'plate', label: t('Patch a plate'), price: `${P.plate}`, note: w.plates >= w.stats.maxPlates ? t('Hull whole') : `${t('Hull')} ${w.plates}/${w.stats.maxPlates}`, ok: w.canBuy('plate') },
      { key: 'bay', label: t('Refit bay'), price: `${num(Math.floor(w.krail))} Krail`, note: t('Modules for Krail · the yard’s work only here'), ok: true, go: () => { this.close(); this.onBay?.(); } },
    ];
    const c = this.course, lanes = c?.lanes() ?? [];
    if (c && lanes.length) {
      const now = lanes.find((x) => x.id === c.current()) ?? lanes[0]!;
      this.lines.push({
        key: 'course', label: t(lanes.length > 1 ? 'Plot another lane' : 'The lane out'), price: `${now.cyrite} ${t('Cyrite')}`,
        note: [t('Bound for {dest}', { dest: now.name }), plural(now.days, '{n} day', '{n} days'), now.note].filter(Boolean).join(' · '), ok: lanes.length > 1,
      });
    }
  }
}
