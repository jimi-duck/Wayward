import { cheapest } from '../sim/bay';
import type { World } from '../sim/world';
import { $, h } from './dom';
import { opsOf, OPS_NOTE, opsText } from './ops';
import { num, t } from '../i18n';

// ── the briefing, on the ship's console ───────────────────────────────────
// The pause card as a display the ship has switched on: a rule above and a
// line of readings below, and between them the loop as three steps, each
// leading to the next (mine, upgrade, survive), with a chip of where you
// stand in it now. Amber is the player's hand, teal the ship's state, red
// threat.

export function showBriefing(w: World): void {
  const k = Math.floor(w.krail), next = cheapest(w.bayCtx())?.cost ?? 0, ops = opsOf(w);
  const step = (n: string, verb: string, chip: string, tone: string) =>
    h('li', `stp ${tone}`, '', h('b', 'stp-n', n), h('span', 'stp-v', t(verb)), h('span', 'stp-c', chip));
  const to = () => h('li', 'stp-a', '→');
  $('pause-flow').replaceChildren(
    step('01', 'Mine', `${t('Krail')} ${num(k)}`, 'amber'),
    to(),
    step('02', 'Upgrade', next && k >= next ? t('Refit available') : `${t('Fit')} · ${num(next)} ${t('Krail')}`, next && k >= next ? 'amber' : 'teal'),
    to(),
    step('03', 'Survive', `${opsText(ops)} · ${t(OPS_NOTE[ops])}`, ops === 'battle' || ops === 'critical' ? 'red' : 'teal'),
  );
  $('pause-foot').replaceChildren(
    h('span', '', t('Obedience class')),
    h('span', '', `${t('Krail')} ${num(k)}`),
    h('span', '', `${t('Plates')} ${w.plates}/${w.stats.maxPlates}`),
  );
}
