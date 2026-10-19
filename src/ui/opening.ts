import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';
import { CIVIC_START, civicLabel } from '../sim/civic';
import { CONTRACT_ID, QUOTA, ratio } from '../sim/contract';

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
    // one short page, plain admin: the contract, the Score, whose hauler this is, and what to do first. Nothing is delivered yet:
    // the cargo is counted at the work bay.
    const lines = [
      h('p', 'op-job', t('Extraction contract · renewal {id}', { id: CONTRACT_ID })),
      h('p', 'op-score', '', h('span', '', t('Delivered')), h('b', '', ratio(0, QUOTA)), h('em', '', t('Cyrite'))),
      h('p', 'op-score', '', h('span', '', t('Civic Score')), h('b', '', civicLabel(CIVIC_START))),
      h('p', 'op-thanks', t('Your productivity protects your future.')),
      h('p', '', t('The hauler is the company’s. You may fly her while the contract holds.')),
      h('b', '', t('Fill the hold, then bring it to the work bay.')),
    ];
    $('op-l').replaceChildren(...lines);
    this.paged = false;
    this.page = 0;
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
