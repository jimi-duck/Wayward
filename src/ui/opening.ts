import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';

// ── the opening ───────────────────────────────────────────────────────────
// What the game is, in a few lines, read once at the start of every new
// Story journey: who you are, what is after you, and what the first job is.

export class OpeningPanel {
  private off: (() => void) | null = null;
  private opened = 0;
  private onDone: (() => void) | null = null;
  /** Short screens (a phone on its side) read it as two pages: the story, then the first job. */
  private paged = false;
  private page = 0;

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
      h('p', '', t('The Continuance rules the core worlds. It began as an emergency government, when the Krail that keeps humanity running grew scarce, and it never gave the power back.')),
      h('p', '', t('The shortage ended in the lane blackout: the outer systems were abandoned and millions were cut off from the core. Now every citizen is scored, rationed and tracked, and the Office of Peace deals with anyone it no longer finds desirable. People like you.')),
      h('p', '', t('You stole an ore hauler. Hidden in its systems was something far more dangerous than you knew: a file that exposes what really happened when the jump lanes went dark seventy years ago.')),
      h('p', '', t('Now they want their ship, and their secret, back.')),
      h('p', '', t('You don’t have to win a war. You only have to get out of this system.')),
      h('b', 'op-job', t('Your first job')),
      h('p', '', t('Break asteroids for Cyrite. It pays for upgrades and fuels the jump to the next system.')),
      h('p', '', t('Keep moving and watch your hull. Not every ship you meet is an enemy. And the longer you linger, the sooner they find you.')),
    );
    this.paged = matchMedia('(max-height: 460px)').matches;
    this.page = 0;
    let job = false;
    for (const el of Array.from($('op-l').children)) {
      job = job || el.classList.contains('op-job');
      el.classList.toggle('op-p2', job);
    }
    this.paint();
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

  private paint(): void {
    $('opening').classList.toggle('paged', this.paged);
    $('opening').dataset.page = String(this.page);
    $('op-go').textContent = t(this.paged && this.page === 0 ? 'Continue' : 'Begin');
    $('op-l').scrollTop = 0;
  }

  private done(): void {
    if (performance.now() - this.opened < GUARD) return;
    if (this.paged && this.page === 0) { this.page = 1; this.paint(); return; }
    const f = this.onDone;
    this.onDone = null;
    this.close();
    f?.();
  }
}
