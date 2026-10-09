import { artImg } from './art';
import { placeOfPort } from '../content/art';
import { SUPPLIES_MAX } from '../sim/breakout';
import { stopIdle, type Stop } from '../sim/stop';
import type { PortItem, World } from '../sim/world';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { num, plural, t } from '../i18n';

// ── the port ──────────────────────────────────────────────────────────────
// Docked: the world waits while you trade. One tap does the sensible stop
// (Cyrite for the jump, supplies, the hull and a second jump,
// as far as the chits reach: sim/stop.ts), and the row says what it will do.
// Buying Cyrite and supplies a unit at a time and patching a plate are
// one tap deeper, under "By hand". Beside them: open the refit bay (it
// always opens at a port) and cast off. Every port sets its own
// prices, and the Net marks them up. The list is redrawn after every trade,
// so every price and every "can't" is live. On a journey a sixth line plots
// again: each press turns to the next lane out of here. The yard's modules
// are in the refit bay, fitted only while docked.

/** What a sensible stop does, as chips: what comes aboard. */
function deltas(s: Stop): string[] {
  return [
    ...(s.supplies ? [`+${s.supplies} ${t('Supplies')}`] : []),
    ...(s.plate ? [`+${s.plate} ${t('Hull')}`] : []),
  ];
}

type Line = { key: 'stop' | 'hand' | 'course' | 'bay' | PortItem; label: string; price: string; note: string; chips?: string[]; ok: boolean; go?: () => void };

/** The lanes out of a port, for re-plotting while docked: `pick` plots one and the world's jump follows it. */
export interface Course {
  lanes: () => Array<{ id: string; name: string; cyrite: number; days: number; note: string }>;
  current: () => string | null;
  pick: (id: string) => void;
}

/** What a port says of the ship's state, and what to do about it (World.warnings). */
const PORT_WARN = {
  empty: 'Out of supplies · the ship flies slower and worse. Buy some here.',
  low: 'Supplies low · a lane or two left. Buy some here.',
  heavy: 'Heavy · slower to turn, and each jump burns {n} more Cyrite. A lighter build or a bigger frame in the bay fixes it.',
  hot: 'Running hot · the guns cycle slower. Cooling in the bay fixes it.',
} as const;

export class PortPanel {
  private off: (() => void) | null = null;
  private sel = 0;
  private opened = 0;
  private lines: Line[] = [];
  private world: World | null = null;
  private onLeave: (() => void) | null = null;
  private onBay: (() => void) | null = null;
  private course: Course | null = null;
  /** The by-hand rows are open. */
  private manual = false;

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
    this.manual = false;
    $('port-t').textContent = world.bk?.port?.name ?? t('Port');
    // a banner of the place, where the build has one for who holds it
    const banner = world.bk?.port ? artImg('place', placeOfPort(world.bk.port.name, !!world.bk.def.netted), 'port-pic') : null;
    $('port-art').hidden = !banner;
    $('port-art').replaceChildren(...(banner ? [banner] : []));
    $('port-s').textContent = t(world.bk?.def.netted ? 'Refuel · repair · trade · under Continuance order' : 'Refuel · repair · trade · no implant checks');
    const x = $('port-x');
    x.onclick = guarded(this.opened, () => this.leave());
    x.onpointerdown = (e) => e.stopPropagation();
    this.render();
    $('port').hidden = false;
    this.off = keys((e) => {
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].indexOf(e.code);
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
    if (l.key === 'stop') w.sensibleStop();
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
    const stock = [[t('Cyrite'), `${w.cyrite}`], [t('Jump'), String(w.jumpCost)], [t('Supplies'), `${w.supplies}/${w.supplyMax}`], [t('Hull'), `${w.plates}/${w.stats.maxPlates}`]];
    $('port-stock').replaceChildren(...stock.map(([k, v]) => h('span', '', '', h('span', 'k', k!), h('b', '', v!))));
    // the ship's trouble and where it is mended: the stores here, the weight in the bay
    const warn = w.warnings.map((k) => t(PORT_WARN[k], { n: w.weightFuel }));
    const el = $('port-warn');
    el.hidden = !warn.length;
    el.replaceChildren(...warn.map((l) => h('span', '', l)));
    $('port-list').replaceChildren(...this.lines.map((l, i) => {
      const b = h('button', `port-l${i === this.sel ? ' sel' : ''}${l.key === 'stop' ? ' stop' : ''}`, '', h('kbd', '', String(i + 1)), h('span', 'pl-n', l.label), l.chips ? h('span', 'pl-chips', '', ...l.chips.map((c) => h('span', 'pl-chip', c))) : h('span', 'pl-note', l.note), h('b', 'pl-p', l.price)) as HTMLButtonElement;
      b.type = 'button';
      b.disabled = !l.ok;
      b.onclick = guarded(this.opened, () => this.act(i));
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }

  private trade(w: World): void {
    const P = w.prices;
    const plan = w.planStop(), idle = stopIdle(plan);
    // the jump's own Cyrite is kept back from the stop; short of it the port says so
    const short = Math.max(0, w.jumpCost - w.cyrite);
    this.lines = [
      { key: 'stop', label: t('Sensible stop'), price: idle ? '—' : `−${Math.abs(plan.cyrite)}`, note: short ? t('{n} Cyrite short of the jump', { n: short }) : t('Nothing to do'), chips: idle ? undefined : deltas(plan), ok: !idle },
      { key: 'bay', label: t('Refit bay'), price: `${num(Math.floor(w.cyrite))} ${t('Cyrite')}`, note: t('Upgrades are fitted at a work bay, only here'), ok: true, go: () => { this.close(); this.onBay?.(); } },
    ];
    const c = this.course, lanes = c?.lanes() ?? [];
    if (c && lanes.length) {
      const now = lanes.find((x) => x.id === c.current()) ?? lanes[0]!;
      this.lines.push({
        key: 'course', label: t(lanes.length > 1 ? 'Plot another lane' : 'The lane out'), price: `${now.cyrite} ${t('Cyrite')}`,
        note: [t('Bound for {dest}', { dest: now.name }), plural(now.days, '{n} day', '{n} days'), now.note].filter(Boolean).join(' · '), ok: lanes.length > 1,
      });
    }
    this.lines.push({ key: 'hand', label: t(this.manual ? 'By hand ▾' : 'By hand ▸'), price: '', note: t('Buy and patch one at a time'), ok: true, go: () => { this.manual = !this.manual; this.render(); } });
    if (this.manual) this.lines.push(
      { key: 'supplies', label: t('Buy supplies'), price: `${P.supplies}`, note: w.supplies >= w.supplyMax ? t('Stores full') : t('{n} aboard · a day each', { n: w.supplies }), ok: w.canBuy('supplies') },
      { key: 'plate', label: t('Patch a plate'), price: `${P.plate}`, note: w.plates >= w.stats.maxPlates ? t('Hull whole') : `${t('Hull')} ${w.plates}/${w.stats.maxPlates}`, ok: w.canBuy('plate') },
    );
  }
}
