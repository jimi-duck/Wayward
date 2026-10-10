import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';

// ── the opening ───────────────────────────────────────────────────────────
// What the game is, in a few lines, read at the start of every new Story
// journey: who you are, what is after you, and the first job. The controls
// card (the pause card) follows it.

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
      h('b', '', t('The Continuance controls the core. Everyone else is on their own.')),
      h('p', '', t('Seventy years ago, the jump lanes went dark, cutting the outer systems off from the core. The Continuance blamed dwindling Krail. Millions were stranded, and the core tightened its grip on what remained.')),
      h('p', '', t('Today, every citizen is scored, every resource is rationed, and every ship is tracked. The Offices of Peace deal with anyone they deem undesirable. People like you.')),
      h('p', '', t('When they came for you, you escaped aboard a decommissioned Continuance ore hauler, the Wayward. Hidden in its systems is a sealed archive revealing the truth behind the blackout. The shortages were a cover. The isolation was used to purge those who could challenge the Continuance and secure its hold on power.')),
      h('p', '', t('Your ship is still broadcasting its identity. The patrols are coming.')),
      h('p', '', t('You don’t have to win a war. You just have to get out of this system.')),
      h('b', 'op-job', t('Your first job')),
      h('p', '', t('Break asteroids for Cyrite. Your ship’s refinery converts it into jump fluid until the drive tank is full. Any surplus can be spent on upgrades and supplies.')),
      h('p', '', t('Keep moving, watch your hull, and choose carefully who to trust. The longer you stay, the closer the patrols get.')),
    );
    this.paged = matchMedia('(max-height: 460px)').matches;
    this.page = 0;
    // page two starts at the patrols: the story so far, then what is coming and the first job
    Array.from($('op-l').children).forEach((el, i) => el.classList.toggle('op-p2', i >= 4));
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
    $('op-go').textContent = t('Continue');
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
