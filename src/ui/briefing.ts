import type { World } from '../sim/world';
import { $, h } from './dom';
import { num, t } from '../i18n';

// ── the briefing, on the ship's console ───────────────────────────────────
// The pause card as a display the ship has switched on: a rule above, and a
// line of readings and the ship's one line of voice (sim/voice.ts) under
// the three steps main.ts's showBrief fills.

export function showConsole(w: World): void {
  $('pause-voice').textContent = `› ${t(w.voice())}`;
  $('pause-foot').replaceChildren(
    h('span', '', t('Obedience class')),
    h('span', '', `${t('Krail')} ${num(Math.floor(w.krail))}`),
    h('span', '', `${t('Plates')} ${w.plates}/${w.stats.maxPlates}`),
  );
  // the ship's papers, in small print: her designation, the registry, and a log that no longer reads
  $('pause-papers').replaceChildren(h('span', '', `OB-7731-A · ${t('Registry')}: ${t('Flagged')}`), h('span', '', `${t('Repair log')}: `, h('i', 'corrupt', t('[corrupted]'))));
}
