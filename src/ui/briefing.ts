import type { World } from '../sim/world';
import type { Course } from '../sim/course';
import { $, h } from './dom';
import { t } from '../i18n';
import { goalOf } from '../sim/goal';
import { voiceText } from '../sim/voice';

// ── the briefing, on the ship's console ───────────────────────────────────
// The pause card's Objective plate: the goal, then a little more than the HUD
// says (owner, 18 November 2026): the stop's brief, where she is, where the
// road goes next and who is behind her, the jobs, and the ship's one line of
// voice (sim/voice.ts). Off the road (the opening, the Arcade) only the goal,
// the jobs and the voice show.

export function showConsole(w: World, c: Course | null = null): void {
  // the stock-ship line is the bay's joke, not the pause card's
  const v = w.voice();
  $('pause-voice').textContent = v === voiceText('obedience') ? '' : t(v);
  const g = goalOf(w);
  const goal = t(g.goal);
  $('pause-goal').textContent = goal;
  // where and when, beside the plate's label
  $('pause-where').textContent = c ? `${t(c.region)} · ${t('Day {n}', { n: c.day })}` : '';
  // the brief: the stop's own words, else its purpose, never the goal again
  const brief = c ? sentence(t(c.here.brief || c.here.purpose)) : '';
  const bEl = $('pause-brief');
  bEl.textContent = brief && !same(brief, goal) ? brief : '';
  bEl.hidden = !bEl.textContent;
  // the facts: here, next, who is behind her; then the jobs and a job on the scope
  const row = (k: string, v: string, cls = '') => h('li', cls, '', h('span', 'k', k), h('span', 'v', v));
  const rows: HTMLElement[] = [];
  if (c) {
    rows.push(row(t('Here'), t(c.here.name)));
    rows.push(row(t('Next'), c.next.purpose ? `${t(c.next.name)} · ${t(c.next.purpose)}` : t(c.next.name)));
    if (!c.pursuit.hidden) rows.push(row(t('Behind you'), `${t(c.pursuit.who === 'calloway' ? 'Calloway' : 'Custody')} · ${behind(c.pursuit.days)}`, c.pursuit.tone === 'red' ? 'threat' : c.pursuit.tone === 'amber' ? 'caution' : ''));
  }
  for (const j of g.jobs) rows.push(row(t('Job'), t(j)));
  if (g.scope) rows.push(row(t('On the scope'), t(g.scope)));
  const list = $('pause-jobs');
  list.replaceChildren(...rows);
  list.hidden = !rows.length;
}

/** How far behind, as the Course says it: in half days, never in jumps. */
function behind(days: number): string {
  if (days <= 0.5) return t('half a day behind');
  const n = Math.round(days);
  return n === 1 ? t('1 day behind') : t('{n} days behind', { n });
}

/** A line as a sentence: a capital and a full stop. */
function sentence(s: string): string {
  const v = s.trim();
  return v ? `${v[0]!.toUpperCase()}${v.slice(1)}${/[.!?…]$/.test(v) ? '' : '.'}` : '';
}

/** Whether two lines say the same thing, near enough (the purpose often is the goal). */
function same(a: string, b: string): boolean {
  const k = (s: string) => s.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, '').trim();
  return k(a) === k(b) || k(b).includes(k(a)) || k(a).includes(k(b));
}
