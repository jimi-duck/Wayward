import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';

// ── the heat note ─────────────────────────────────────────────────────────
// Shown once, at the end of the Story's training: what the Wanted bar in the
// lower right of the HUD means. The bar here is the HUD's own, at half.

export class HeatNote {
  private off: (() => void) | null = null;
  private opened = 0;
  private onDone: (() => void) | null = null;

  get open(): boolean {
    return !$('heatnote').hidden;
  }

  show(onDone: () => void): void {
    this.close();
    this.onDone = onDone;
    this.opened = performance.now();
    $('hn-t').textContent = t('Wanted');
    const bar = h('span', 'ht-b');
    bar.dataset.lit = '2';
    for (let i = 0; i < 4; i++) bar.append(document.createElement('i'));
    $('hn-l').replaceChildren(
      h('p', '', t('Every Continuance ship you fight raises your Wanted level. Lingering in a system raises it too. The higher it climbs, the more ships the Continuance sends and the greater the risk of getting trapped behind a blockade.')),
      h('div', 'hn-bar', '', h('span', 'ht-l', t('Wanted')), bar),
      h('p', '', t('Your Wanted level is shown in the bottom-right corner.')),
    );
    const go = $('hn-go');
    go.textContent = t('Got it');
    go.onclick = guarded(this.opened, () => this.done());
    go.onpointerdown = (e) => e.stopPropagation();
    $('heatnote').hidden = false;
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.done(), true;
      return ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF', 'Escape'].includes(e.code);
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('heatnote').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (this.open && performance.now() - this.opened >= GUARD && (p.a || p.b)) this.done();
  }

  private done(): void {
    if (performance.now() - this.opened < GUARD) return;
    const f = this.onDone;
    this.onDone = null;
    this.close();
    f?.();
  }
}
