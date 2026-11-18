import type { World } from '../sim/world';
import type { Course } from '../sim/course';
import type { Best } from '../meta/profile';
import { $, h } from './dom';
import { num, t } from '../i18n';
import { goalOf } from '../sim/goal';
import { voiceText } from '../sim/voice';

// ── the briefing, on the ship's console ───────────────────────────────────
// The pause card's Objective plate: the goal, then a little more than the HUD
// says (owner, 18 November 2026): the stop's brief, where she is, where the
// road goes next and who is behind her, the jobs, and the ship's one line of
// voice (sim/voice.ts). The Arcade's plate is a run sheet instead (owner,
// 18 November): difficulty and time, a line on what is happening, then this
// run, the best on this difficulty and the next refit; before the first launch
// it teaches the loop. The opening shows only the goal, the jobs and the voice.

/** The Arcade's best on this difficulty, and its score curve, to set this run against. */
export interface ArcadeBest { best: Best; curve: Array<{ t: number; score: number }> }

export function showConsole(w: World, c: Course | null = null, arcade: ArcadeBest | null = null): void {
  // the stock-ship line is the bay's joke, not the pause card's
  const v = w.voice();
  $('pause-voice').textContent = v === voiceText('obedience') ? '' : t(v);
  const g = goalOf(w);
  const goal = t(g.goal);
  $('pause-goal').textContent = goal;
  // where and when, beside the plate's label
  $('pause-where').textContent = c ? `${t(c.region)} · ${t('Day {n}', { n: c.day })}` : '';
  // the brief: the stop's own words, else its purpose, never the goal again
  const full = c ? sentence(t(c.here.brief || c.here.purpose)) : '';
  // a phone's plate has room for one sentence of it
  const brief = typeof matchMedia === 'function' && matchMedia('(max-height: 520px)').matches ? firstSentence(full) : full;
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
  if (w.mode === 'arcade' && arcade) {
    $('pause-where').textContent = `${t(w.survival.name)} · ${clock(w.runTime)}`;
    // the run's first card begins it; every one after resumes it
    const go = $('p-go').querySelector('.arcade-only');
    if (go) go.textContent = t(w.runTime < 1 ? 'Begin' : 'Resume');
    const line = arcadeLine(w);
    bEl.textContent = line ? t(line) : '';
    bEl.hidden = !bEl.textContent;
    rows.push(...arcadeRows(w, arcade, row));
  }
  for (const j of g.jobs) rows.push(row(t('Job'), t(j)));
  if (g.scope) rows.push(row(t('On the scope'), t(g.scope)));
  const list = $('pause-jobs');
  list.replaceChildren(...rows);
  list.hidden = !rows.length;
}

type Row = (k: string, v: string, cls?: string) => HTMLElement;

/** What is going on in the run, in a line: a capital ship, a wave, the last plate, or the quiet and what it is for. */
function arcadeLine(w: World): string {
  if (w.runTime < 1) return 'Every run starts from scratch. How long can you last?';
  if (w.command.state !== 'idle') return 'A capital ship is in the sector. Fight it for bounty and tech, or stay clear for score.';
  if (w.plates <= 1) return 'One plate left. Keep your distance until the next refit.';
  if (w.pace.state === 'wave') return 'Hostiles inbound. Keep moving and use the rocks as cover.';
  if (w.krail >= w.nextRefit) return 'Quiet spell. The bay opens once the sky is clear.';
  return 'Quiet spell. Mine rocks and wrecks for Cyrite before the next wave.';
}

/** The run sheet: this run, the best on this difficulty (ahead or behind it at this minute), the next refit; before the first launch, the loop. */
function arcadeRows(w: World, a: ArcadeBest, row: Row): HTMLElement[] {
  if (w.runTime < 1) return [
    row(t('Mine'), t('Cyrite from rocks and wrecks')),
    row(t('Refit'), t('Spend it in the bay between waves')),
    row(t('Survive'), t('As long as you can')),
  ];
  const out = [row(t('This run'), `${num(w.score)} · ${clock(w.runTime)} · ${t(w.kills === 1 ? '{n} kill' : '{n} kills', { n: w.kills })}`)];
  const b = a.best;
  if (b.score > 0) {
    const then = scoreAt(a.curve, w.runTime), d = Math.round(w.score - then);
    const lead = d > 0 ? `+${num(d)}` : d < 0 ? `−${num(-d)}` : '';
    out.push(row(t('Your best'), `${num(b.score)} · ${clock(b.time)}${lead ? ` · ${lead}` : ''}`, d > 0 ? 'ahead' : ''));
  } else out.push(row(t('Your best'), t('None yet on this difficulty')));
  const have = Math.floor(w.krail), need = w.nextRefit;
  out.push(row(t('Next refit'), have >= need ? `${t('Ready')} · ${num(have)} ${t('Cyrite')}` : `${num(have)} / ${num(need)} ${t('Cyrite')}`, have >= need ? 'ready' : ''));
  return out;
}

/** The best run's score at this minute of it (the curve is sampled; straight between samples). */
function scoreAt(curve: Array<{ t: number; score: number }>, at: number): number {
  if (!curve.length) return 0;
  let prev = { t: 0, score: 0 };
  for (const p of curve) {
    if (p.t >= at) return prev.score + (p.score - prev.score) * ((at - prev.t) / Math.max(1e-6, p.t - prev.t));
    prev = p;
  }
  return prev.score;
}

/** m:ss. */
function clock(s: number): string {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
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

/** The first sentence of a brief, whole. */
function firstSentence(s: string): string {
  return /^.*?[.!?](?=\s|$)/.exec(s)?.[0] ?? s;
}

/** Whether two lines say the same thing, near enough (the purpose often is the goal). */
function same(a: string, b: string): boolean {
  const k = (s: string) => s.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, '').trim();
  return k(a) === k(b) || k(b).includes(k(a)) || k(a).includes(k(b));
}
