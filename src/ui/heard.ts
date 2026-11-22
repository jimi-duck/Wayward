import { $, h } from './dom';
import { t } from '../i18n';

// ── what was said: the line log ───────────────────────────────────────────
// The last radio lines and story notices, newest first, on the pause card's log face (L in flight, or the log button on
// the card). A line read too late, or missed in a fight, can be read again here (owner, 22 November 2026).

interface Heard { from: string; text: string; ink: string }

/** How many lines the log keeps. */
export const KEEP = 12;
const lines: Heard[] = [];

/** A line was said: `from` is the speaker ('' for a notice), `ink` the speaker's colour. Already translated. */
export function heard(from: string, text: string, ink: string): void {
  if (lines[0]?.text === text) return;
  lines.unshift({ from, text, ink });
  lines.length = Math.min(lines.length, KEEP);
}

/** Forget them: a new run. */
export function forget(): void { lines.length = 0; }

/** The lines, newest first. */
export function heardLines(): readonly Heard[] { return lines; }

/** Fill the pause card's log. */
export function showHeard(): void {
  const list = $('heard');
  if (!lines.length) { list.replaceChildren(h('li', 'hd-none', t('Nothing on the radio yet.'))); return; }
  list.replaceChildren(...lines.map((l) => {
    const who = h('b', 'hd-from', l.from || t('Notice'));
    if (l.ink) who.style.color = l.ink;
    return h('li', l.from ? '' : 'hd-note', '', who, h('span', 'hd-text', l.text));
  }));
}
