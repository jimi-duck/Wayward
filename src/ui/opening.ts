import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';

// ── the opening ───────────────────────────────────────────────────────────
// What the game is, in a few lines, read once at the start of every new
// Story journey: who you are, what is after you, and what the first job is.

export class OpeningPanel {
  private off: (() => void) | null = null;
  private opened = 0;
  private onDone: (() => void) | null = null;

  get open(): boolean {
    return !$('opening').hidden;
  }

  show(onDone: () => void): void {
    this.close();
    this.onDone = onDone;
    this.opened = performance.now();
    $('op-k').textContent = t('Story 01');
    $('op-t').textContent = t('Breakout');
    $('op-l').replaceChildren(
      h('b', '', t('The Wayward is yours now.')),
      h('p', '', t('You stole an ore hauler from Kellern Mining, and with it something far more dangerous: a file that could expose what really happened when the Continuance shut down the jump lanes seventy years ago.')),
      h('p', '', t('Now they want their ship, and their secret, back.')),
      h('p', '', t('You don’t have to win a war. You only have to get out of this system.')),
      h('b', 'op-job', t('Your first job')),
      h('p', '', t('Break asteroids for Cyrite. It pays for upgrades and fuels the jump to the next system.')),
      h('p', '', t('Keep moving and watch your hull. Not every ship you meet is an enemy. And the longer you linger, the sooner they find you.')),
    );
    const go = $('op-go');
    go.onclick = guarded(this.opened, () => this.done());
    go.onpointerdown = (e) => e.stopPropagation();
    $('opening').hidden = false;
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.done(), true;
      return ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF', 'Escape'].includes(e.code);
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('opening').hidden = true;
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
