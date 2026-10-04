import { JUMP_COST, PRICE, TANK_MAX } from '../sim/breakout';
import type { PortItem, World } from '../sim/world';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';

// ── the port ──────────────────────────────────────────────────────────────
// Docked at Frontier Supply: the world waits while you trade. Four things to
// do and a way out: sell the hold, buy Krail a unit at a time, patch a
// plate, pay for a refit (three cards there and then), cast off. The list
// is redrawn after every trade, so every price and every "can't" is live.

type Line = { key: 'sell' | PortItem; label: string; price: string; note: string; ok: boolean };

export class PortPanel {
  private off: (() => void) | null = null;
  private sel = 0;
  private opened = 0;
  private lines: Line[] = [];
  private world: World | null = null;
  private onLeave: (() => void) | null = null;
  private onRefit: (() => void) | null = null;

  get open(): boolean {
    return !$('port').hidden;
  }

  /** Open on the world's dock. `onRefit` is called when a bought refit puts cards on the table. */
  show(world: World, onLeave: () => void, onRefit: () => void): void {
    this.close();
    this.world = world;
    this.onLeave = onLeave;
    this.onRefit = onRefit;
    this.opened = performance.now();
    this.sel = 0;
    $('port-t').textContent = world.bk?.port.name ?? 'Port';
    const x = $('port-x');
    x.onclick = guarded(this.opened, () => this.leave());
    x.onpointerdown = (e) => e.stopPropagation();
    this.render();
    $('port').hidden = false;
    this.off = keys((e) => {
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (n >= 0) return this.act(n), true;
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
    if (l.key === 'sell') w.sellOre();
    else {
      w.buy(l.key);
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
    const need = Math.max(0, JUMP_COST - w.krail);
    this.lines = [
      { key: 'sell', label: 'Sell the hold', price: w.ore ? `+${w.ore * PRICE.ore}` : '—', note: `${w.ore} ore at ${PRICE.ore} chits`, ok: w.ore > 0 },
      { key: 'krail', label: 'Buy Krail', price: `${PRICE.krail}`, note: w.krail >= TANK_MAX ? 'Tank full' : need ? `${need} short of the jump` : 'Enough to jump', ok: w.canBuy('krail') },
      { key: 'plate', label: 'Patch a plate', price: `${PRICE.plate}`, note: w.plates >= w.stats.maxPlates ? 'Hull whole' : `Hull ${w.plates}/${w.stats.maxPlates}`, ok: w.canBuy('plate') },
      { key: 'refit', label: 'Pay for a refit', price: `${PRICE.refit}`, note: 'Three cards, take one', ok: w.canBuy('refit') },
    ];
    $('port-stock').replaceChildren(
      ...[['Chits', String(w.chits)], ['Tank', `${w.krail}/${JUMP_COST}`], ['Hold', `${w.ore}/${w.holdMax}`], ['Hull', `${w.plates}/${w.stats.maxPlates}`]]
        .map(([k, v]) => h('span', '', '', h('span', 'k', k!), h('b', '', v!))),
    );
    $('port-list').replaceChildren(...this.lines.map((l, i) => {
      const b = h('button', `port-l${i === this.sel ? ' sel' : ''}`, '', h('kbd', '', String(i + 1)), h('span', 'pl-n', l.label), h('span', 'pl-note', l.note), h('b', 'pl-p', l.price)) as HTMLButtonElement;
      b.type = 'button';
      b.disabled = !l.ok;
      b.onclick = guarded(this.opened, () => this.act(i));
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }
}
