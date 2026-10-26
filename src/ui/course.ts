import { courseView, type Course } from '../sim/course';
import type { Journey } from '../sim/journey';
import { halfDays } from '../sim/hunt';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { fillWall } from './chart';
import { plural, t } from '../i18n';

// ── the Course ────────────────────────────────────────────────────────────
// On the Warden's Road (`?road`) the chart's question changes from "where
// next?" to "how far, and at what cost?". Three layers at once (where the leg
// ends, the next stop, the stop after), the road as a line of stops, the dark
// lanes that lead nowhere, the pursuit in days, and one button. The view is
// sim/course.ts; the Wall lives here as it does on the chart.

/** How far behind, in words: half a day, a day, a day and a half. */
export function whenWords(days: number): string {
  const d = halfDays(days);
  if (d <= 0) return t('here');
  if (d < 1) return t('half a day');
  return Number.isInteger(d) ? plural(d, '{n} day', '{n} days') : t('{n} days', { n: `${Math.floor(d)}½` });
}

/** The pursuit line: who, how far, and what they know. */
export function pursuitLine(p: Course['pursuit']): string {
  if (p.hidden) return t('Not shown while you rest');
  const when = whenWords(p.days);
  if (p.days <= 0) return p.who === 'calloway' ? t('Governor Calloway · here') : t('Custody pursuit · here');
  return p.who === 'calloway' ? t('Governor Calloway · {when} behind · knows your route', { when }) : t('Custody pursuit · {when} behind', { when });
}

export class CoursePanel {
  private off: (() => void) | null = null;
  private opened = 0;
  private onGo: (() => void) | null = null;

  get open(): boolean { return !$('course').hidden; }

  /** Whether this journey's next jump is plotted on the Course (the road's own stops). */
  static applies(j: Journey): boolean { return courseView(j) !== null; }

  /** Show the Course; `go` plots the one lane. */
  show(j: Journey, go: (id: string) => void): void {
    const c = courseView(j);
    if (!c) return;
    this.close();
    this.opened = performance.now();
    this.onGo = () => go(c.to.id);
    $('course').hidden = false;
    $('co-k').textContent = `${t(c.region)} · ${t('day {n}', { n: c.day })}`;
    const purs = $('co-purs');
    purs.textContent = pursuitLine(c.pursuit);
    purs.className = `co-purs ${c.pursuit.hidden ? 'rest' : c.pursuit.tone}`;
    const layer = (cls: string, k: string, name: string, purpose: string, extra = '') =>
      h('li', `co-layer ng-n ${cls}`, '', h('span', 'k', t(k)), h('b', '', t(name)), h('span', 'p', [t(purpose), extra].filter(Boolean).join(' · ')));
    $('co-layers').replaceChildren(
      layer('goal', 'Leg goal', c.goal.name, c.goal.purpose, plural(c.goal.jumps, '{n} jump', '{n} jumps')),
      layer('next', 'Next stop', c.next.name, c.next.purpose),
      ...(c.after ? [layer('after', 'Then', c.after.name, c.after.purpose)] : []),
    );
    $('co-road').setAttribute('aria-label', t('The road: {n} stops', { n: c.road.length }));
    $('co-road').replaceChildren(...c.road.map((r) => h('span', `pip ${r.state}${r.job ? ' job' : ''}`, '', h('i'), h('em', '', t(r.name)))));
    $('co-lanes').replaceChildren(...Array.from({ length: c.lanes }, () => h('li', 'dark', t('Netted · Custody holds this lane'))));
    const tank = c.fuel.have >= c.fuel.need;
    $('co-cost').replaceChildren(
      h('span', tank ? '' : 'short', `${t('Jump fluid')} · ${c.fuel.have}/${c.fuel.need}`),
      h('span', c.supplies.have >= c.supplies.need ? '' : 'short', `${t('Supplies')} · ${c.supplies.have}/${c.supplies.need}`),
    );
    fillWall(j, { s: $('co-wall-s'), lead: $('co-wall-lead'), list: $('co-wall-l') });
    ($('co-wall') as HTMLDetailsElement).open = false;
    const go$ = $('co-go');
    go$.textContent = t('Jump to {name}', { name: t(c.next.name) });
    go$.onclick = guarded(this.opened, () => this.go());
    go$.onpointerdown = (e) => e.stopPropagation();
    this.off = keys((e) => {
      if (e.code === 'KeyW') { const w = $('co-wall') as HTMLDetailsElement; w.open = !w.open; if (w.open) w.scrollIntoView({ block: 'nearest' }); return true; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return (document.activeElement as HTMLElement | null)?.closest('summary') ? false : (this.go(), true);
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF'].includes(e.code);
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('course').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (!this.open || performance.now() - this.opened < GUARD) return;
    if (p.a) this.go();
  }

  private go(): void {
    const fn = this.onGo;
    this.close();
    fn?.();
  }
}
