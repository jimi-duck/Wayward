import { $, GUARD, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';
import { CREDIT_START, CUTS, FIRST_LOAD, GROSS, PENALTY, QUOTA, ratio } from '../sim/contract';

// ── the opening ───────────────────────────────────────────────────────────
// What the game is, in a few lines, read at the start of every new Story
// journey: who you are, what is after you, and the first job. The controls
// card (the pause card) follows it.

export class OpeningPanel {
  private off: (() => void) | null = null;
  private opened = 0;
  private onDone: (() => void) | null = null;
  private page = 0;

  get open(): boolean {
    return !$('opening').hidden;
  }

  show(onDone: () => void): void {
    this.close();
    this.onDone = onDone;
    this.opened = performance.now();
    this.page = 0;
    this.paint();
    const go = $('op-go');
    go.onclick = () => this.done();
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

  /** Two cards, in the sheet's format: the resident record, then the contract notice. Each has one button and an optional file. */
  private paint(): void {
    const first = this.page === 0;
    $('opening').dataset.page = String(this.page);
    $('op-k').textContent = t(first ? 'Resident record · Cerro system · Year 70' : 'Story I · Breakout · Company dispatch');
    $('op-t').textContent = t(first ? 'Nobody leaves Cerro.' : 'Fill the hold. 200 to go.');
    $('op-go').textContent = t(first ? 'Begin shift' : 'Start mining');
    $('op-l').replaceChildren(...(first ? this.cold() : this.contract()));
    $('op-l').scrollTop = 0;
  }

  private cold(): HTMLElement[] {
    return [
      h('p', '', t('Seventy years ago the Continuance closed the outer lanes and called it a Krail shortage. Fuel, work and permits still come from the same office.')),
      h('p', 'op-juno', t('Contractor. Never been past the gate.')),
      this.file('Resident file', 'Access, permit record, sealed family detail', [
        ['Aster, Juno', ''],
        ['Resident', 'RESIDENT-CERRO-0412-77'],
        ['Residence', 'Low Ring, Cerro'],
        ['Access', 'Restricted'],
        ['Travel permits', '0 granted'],
        ['Request history', '3 requested · 3 refused'],
        ['Next of kin', 'Ada Aster · record sealed'],
      ], 'Sealed family records cannot be requested by the subject.'),
    ];
  }

  private contract(): HTMLElement[] {
    const tile = (k: string, v: string, s: string) => h('li', '', '', h('span', '', t(k)), h('b', '', v), h('em', '', s));
    return [
      h('p', '', t('The hauler is leased and the hold isn’t yours either. Deliver 1,000 Cyrite and you’re paid what’s left after charges.')),
      h('p', 'op-juno', t('Two hundred more and I’m even. For once.')),
      h('ul', 'op-facts', '',
        tile('Cargo in hold', ratio(FIRST_LOAD), t('{n} Cyrite to go', { n: QUOTA - FIRST_LOAD })),
        tile('Gross payout', t('{n} credit', { n: GROSS }), t('On full delivery')),
        tile('Current credit', t('{n} credit', { n: CREDIT_START }), t('In your account'))),
      this.file('Contract terms', 'Clause 9 and the full deductions', [
        ['Quota', t('{n} Cyrite', { n: QUOTA })],
        ['Gross payout', t('{n} credit', { n: GROSS })],
        ['Vessel lease', t('{n} credit', { n: CUTS.lease })],
        ['Short-delivery penalty', t('{n} credit', { n: PENALTY })],
        ['Launcher', 'Financed · company property until settled'],
      ], 'Clause 9. Loss, seizure or interruption does not void operator liability.'),
    ];
  }

  /** An optional attachment: a bar with its title that opens the rows. Never blocks the button. */
  private file(title: string, sub: string, rows: Array<[string, string]>, note: string): HTMLElement {
    const body = h('div', 'op-attbody', '', h('ul', 'op-rows', '', ...rows.map(([k, v]) => h('li', '', '', h('span', '', t(k)), v ? h('b', '', t(v)) : null))), h('p', 'op-note', t(note)));
    body.hidden = true;
    const bar = h('button', 'op-att', '', h('span', '', `${t('Attached')} · ${t(title)}`), h('em', '', t(sub)), h('b', '', t('Open')));
    (bar as HTMLButtonElement).type = 'button';
    bar.setAttribute('aria-expanded', 'false');
    bar.onclick = () => {
      body.hidden = !body.hidden;
      bar.setAttribute('aria-expanded', String(!body.hidden));
      bar.lastElementChild!.textContent = t(body.hidden ? 'Open' : 'Close');
    };
    bar.onpointerdown = (e) => e.stopPropagation();
    return h('div', 'op-file', '', bar, body);
  }

  private done(): void {
    if (performance.now() - this.opened < GUARD) return;
    if (this.page === 0) { this.page = 1; this.opened = performance.now(); this.paint(); return; }
    const f = this.onDone;
    this.onDone = null;
    this.close();
    f?.();
  }
}
