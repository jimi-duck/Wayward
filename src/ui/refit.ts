import { BRANCHES, UPGRADE, upgradeText, type Branch } from '../content/upgrades';
import { branchLevels, upgradeFigures, type Levels } from '../sim/build';
import type { Card, CardTag, Offer } from '../sim/offers';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';

// ── the refit: three cards ────────────────────────────────────────────────
// A full rail stops the run on three cards. Read them, take one, fly on:
// a few seconds, every time. Each card is a module for the ship, drawn in
// the HUD's line language: the system it fits and what kind of change it
// is, the name, one sentence, the module's level as blocks, and the two or
// three numbers it changes, before and after. Keys 1 2 3 take a card
// outright; arrows or Tab and Enter, a tap, or a pad's stick and A work too.

const TAG_WORD: Record<CardTag, string> = {
  new: 'New system', up: 'Upgrade', spec: 'Specialisation', synergy: 'Synergy', tech: 'Salvaged tech', wild: 'New direction',
};
/** The HUD's icon for each branch. */
const ICON: Record<Branch, string> = {
  phaser: 'i-phaser', torpedo: 'i-torp', mine: 'i-mine', plasma: 'i-plasma', close: 'i-arc', mobility: 'i-engine',
  defence: 'i-shield', utility: 'i-rock', overcharge: 'i-core', synergy: 'i-link', salvage: 'i-capital',
};
/** Phasers and the warp core come fitted from the yard, so they count from level 1, as on the HUD. */
const STOCK = new Set<Branch>(['phaser', 'overcharge']);
const MAX_FIGS = 3;
const pad2 = (n: number) => String(n).padStart(2, '0');

export function systemLevel(levels: Levels, b: Branch): number {
  return branchLevels(levels, b) + (STOCK.has(b) ? 1 : 0);
}

function icon(id: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

export class RefitPanel {
  private off: (() => void) | null = null;
  private sel = 0;
  private pad: { opened: number; n: number; pick: (i: number) => void } | null = null;

  get open(): boolean {
    return !$('refit').hidden;
  }

  show(offer: Offer, levels: Levels, onPick: (i: number) => void): void {
    this.close();
    const opened = performance.now();
    const kind = offer.kind;
    $('refit-k').textContent = kind === 'salvage' ? 'Battle salvage' : kind === 'spec' ? 'Specialisation' : `Field refit · ${pad2(offer.refit)}`;
    const spec = kind === 'spec' ? UPGRADE[offer.cards[0]!.id]! : null;
    $('refit-t').textContent = kind === 'salvage' ? 'Take one from the wreck' : spec ? `${BRANCHES[spec.branch].name}: specialise` : 'Choose an upgrade';
    $('refit-s').textContent = kind === 'spec' ? 'One per system, for the rest of the run. It decides what this ship is.' : '';
    const pick = (i: number) => { this.close(); onPick(i); };
    $('cards').replaceChildren(...offer.cards.map((c, i) => this.card(c, i, levels, guarded(opened, () => pick(i)))));
    this.sel = 0;
    this.mark();
    this.pad = { opened, n: offer.cards.length, pick };
    $('refit').hidden = false;
    this.off = keys((e) => {
      const n = offer.cards.length;
      const digit = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code), num = ['Numpad1', 'Numpad2', 'Numpad3'].indexOf(e.code);
      const i = Math.max(digit, num);
      if (i >= 0 && i < n) return pick(i), true;
      if (e.code === 'Tab' || e.code === 'ArrowRight' || e.code === 'KeyD') { this.sel = (this.sel + (e.shiftKey && e.code === 'Tab' ? n - 1 : 1)) % n; this.mark(); return true; }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { this.sel = (this.sel + n - 1) % n; this.mark(); return true; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter') return pick(this.sel), true;
      // the flight keys do nothing here; swallow them so nothing behind the panel answers
      return ['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'KeyE', 'KeyF', 'KeyR', 'Escape'].includes(e.code);
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    this.pad = null;
    $('refit').hidden = true;
  }

  /** A gamepad: move the selection, or take it. */
  padInput(p: PadEdges): void {
    const pad = this.pad;
    if (!pad || performance.now() - pad.opened < GUARD) return;
    if (p.left || p.right) { this.sel = (this.sel + (p.right ? 1 : pad.n - 1)) % pad.n; this.mark(); }
    else if (p.a) pad.pick(this.sel);
  }

  private mark(): void {
    [...$('cards').children].forEach((c, i) => c.classList.toggle('sel', i === this.sel));
  }

  /**
   * One card: the system it fits and the kind of change, the name, what it
   * does, the module's level as blocks (owned, and the one this card adds),
   * and the numbers it changes.
   */
  private card(c: Card, i: number, levels: Levels, onClick: (e: Event) => void): HTMLElement {
    const u = UPGRADE[c.id]!;
    const b = h('button', `card ${c.tag} ${u.cat}`) as HTMLButtonElement;
    b.type = 'button';
    b.addEventListener('click', onClick);
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('pointerenter', () => { this.sel = i; this.mark(); });

    const sys = u.branch === 'salvage' && u.tech ? `${u.tech.charAt(0).toUpperCase()}${u.tech.slice(1)} salvage` : BRANCHES[u.branch].name;
    const top = h('span', 'c-top', '', icon(ICON[u.branch]), h('span', 'c-sys', sys), h('span', 'c-tag', TAG_WORD[c.tag]), h('kbd', 'only-desktop', String(i + 1)));
    const name = h('span', 'c-name', u.name);

    // the module's level: owned blocks, then the one this card adds
    const lv = h('span', 'lvl');
    if (u.max > 1) {
      for (let k = 1; k <= u.max; k++) lv.append(h('i', k < c.level ? 'on' : k === c.level ? 'add' : ''));
      lv.append(h('span', 'lvl-n', `Lv ${c.level}/${u.max}`));
    } else {
      const sl = systemLevel(levels, u.branch);
      lv.append(h('span', 'lvl-n', u.kind === 'spec' ? 'Once per run' : u.kind === 'tech' ? 'Her faction’s tech' : u.kind === 'synergy' ? 'Both halves fitted' : sl > 0 ? `${BRANCHES[u.branch].name} Lv ${sl}` : 'Fits a new system'));
    }

    const text = h('span', 'c-text', upgradeText(u, c.level));
    const figs = h('span', 'c-figs');
    for (const f of upgradeFigures(levels, c.id).slice(0, MAX_FIGS)) {
      figs.append(h('span', `fig${f.cost ? ' cost' : ''}`, '', h('span', 'f-l', f.label), h('span', 'f-v', '', h('s', '', f.from), document.createTextNode(' → '), h('b', '', f.to))));
    }
    b.append(top, name, lv, text, figs);
    if (u.note) b.append(h('span', 'c-note', u.note));
    return b;
  }
}
