import type { World } from '../sim/world';
import { $, h } from './dom';
import { t } from '../i18n';
import { goalOf } from '../sim/goal';
import { voiceText } from '../sim/voice';

// ── the briefing, on the ship's console ───────────────────────────────────
// The pause card: the ship's one line of voice (sim/voice.ts), then the
// objective and the jobs taken on (sim/goal.ts).

export function showConsole(w: World): void {
  // the stock-ship line is the bay's joke, not the pause card's
  const v = w.voice();
  $('pause-voice').textContent = v === voiceText('obedience') ? '' : t(v);
  const g = goalOf(w);
  $('pause-goal').textContent = t(g.goal);
  const jobs = $('pause-jobs');
  jobs.replaceChildren(...g.jobs.map((j) => h('li', '', `${t('Job')} · ${t(j)}`)));
  jobs.hidden = !g.jobs.length;
}
