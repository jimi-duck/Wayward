import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { num, t } from '../i18n';

// ── the job done ──────────────────────────────────────────────────────────
// A job paid at a port gets its own pop-up, so the player knows it is over:
// what was done, and what it paid. It holds the world, like every pop-up.

export interface JobResult { job: string; text: string; cyrite: number; supplies: number }

export class JobDone {
  private off: (() => void) | null = null;
  private opened = 0;
  private onDone: (() => void) | null = null;

  get open(): boolean {
    return !$('jobdone').hidden;
  }

  show(r: JobResult, onDone: () => void): void {
    this.close();
    this.onDone = onDone;
    this.opened = performance.now();
    $('jd-k').textContent = t('Job complete');
    $('jd-t').textContent = t(r.job);
    const pay = [...(r.cyrite > 0 ? [t('{n} Cyrite', { n: num(r.cyrite) })] : []), ...(r.supplies > 0 ? [t('+{n} supplies', { n: r.supplies })] : [])];
    $('jd-l').replaceChildren(
      h('p', '', t(r.text)),
      ...(pay.length ? [h('p', 'jd-pay', '', h('span', 'k', t('Paid')), ...pay.map((x) => h('b', 'g-gain', x)))] : []),
    );
    const go = $('jd-go');
    go.textContent = t('Continue');
    go.onclick = guarded(this.opened, () => this.done());
    go.onpointerdown = (e) => e.stopPropagation();
    $('jobdone').hidden = false;
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.done(), true;
      return ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF', 'Escape'].includes(e.code);
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('jobdone').hidden = true;
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
