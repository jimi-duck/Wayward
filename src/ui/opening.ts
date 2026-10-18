import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';
import { CIVIC_START, civicLabel } from '../sim/civic';

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
    // page one: the work order, the registry, the shortage story. Page two: the theft, the wake, the first job.
    const row = (k: string, v: string, cls = '') => h('li', cls, '', h('span', '', t(k)), h('b', '', v));
    const one = [
      h('p', 'op-job', t('Extraction contract · renewal 08-441')),
      h('ul', 'op-order', '',
        row('Gross yield', t('{n} Cyrite', { n: 48 })),
        row('Refinery allocation', '21'),
        row('Equipment lease', '9'),
        row('Fuel reserve', '11'),
        row('Penalty escrow', '3'),
        row('Your credit', '4', 'mine'),
      ),
      h('p', 'op-thanks', t('The Continuance thanks you for your contribution.')),
      h('p', 'op-score', '', h('span', '', t('Civic Score')), h('b', '', String(CIVIC_START)), h('em', '', civicLabel(CIVIC_START))),
      h('b', '', t('You mined 48. You keep 4.')),
      h('p', '', t('Seventy years ago the lanes went dark. The Continuance said Krail was running out, and has rationed everything since.')),
    ];
    const two = [
      h('p', '', t('Tonight the yard is scrapping the Wayward, an old Continuance ore hauler. Tam Okoro, the foreman, will look away at the gate for a minute.')),
      h('p', '', t('You take her. The helm reads your hand, and something sealed inside wakes. The registry sees it too.')),
      h('b', 'op-job', t('Your first job')),
      h('p', '', t('Break asteroids for Cyrite. Your refinery fills the drive tank first. Everything past that is yours to spend.')),
      h('p', '', t('Keep moving, watch your hull, and choose carefully who to trust.')),
    ];
    for (const el of two) el.classList.add('op-p2');
    $('op-l').replaceChildren(...one, ...two);
    this.paged = matchMedia('(max-height: 460px)').matches;
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
