import { tradeoff, type TradeEntry, type Tradeoff } from '../sim/tradeoff';
import type { World } from '../sim/world';
import { h } from './dom';
import { icon } from './icons';
import { t } from '../i18n';

// The whole trade of a part as a row of chips beside its Fit button (sim/tradeoff.ts does the sums):
// steel blue for what it gives, gold for what it takes, red only where the next jump can no longer be paid.

type Tone = 'gain' | 'loss' | 'stop';
interface Chip { tone: Tone; text: string; fluid?: boolean }

/** How many chips show before the rest fold into "+N more". */
export const MAX_CHIPS = 4;

const OVER = { mass: 'Mass over limit', power: 'Power over limit', heat: 'Heat over limit' } as const;

const signed = (e: TradeEntry): string => {
  const pct = e.change !== null && Math.abs(e.change) >= 0.01 ? `${e.change > 0 ? '+' : '−'}${Math.round(Math.abs(e.change) * 100)}%` : e.delta;
  return `${pct} ${t(e.label)}`;
};

/**
 * The chips in the order that matters when there is room for four: the main gain, the worst handling loss, the
 * jump fluid, the rating passed; then the rest of the handling, the cooldowns and the other gains.
 */
export function chipsOf(w: World, trade: Tradeoff): Chip[] {
  const gains = trade.gains.map((e): Chip => ({ tone: 'gain', text: signed(e) }));
  const feel = [...trade.handling, ...trade.cooldown].map((e): Chip => ({ tone: e.better ? 'gain' : 'loss', text: signed(e) }));
  const worst = feel.findIndex((c) => c.tone === 'loss');
  const first = worst >= 0 ? feel.splice(worst, 1) : [];
  const chips: Chip[] = [...gains.slice(0, 1), ...first];
  if (trade.jumpFluid !== 0) {
    const stuck = trade.jumpFluid > 0 && w.fuel < w.jumpCost + trade.jumpFluid;
    const n = `${trade.jumpFluid > 0 ? '+' : '−'}${Math.abs(trade.jumpFluid)}`;
    chips.push({ tone: stuck ? 'stop' : trade.jumpFluid > 0 ? 'loss' : 'gain', fluid: true, text: stuck ? `${n} ${t('jump fluid')} · ${t("can't jump yet")}` : `${n} ${t('jump fluid')}` });
  }
  for (const k of ['mass', 'power', 'heat'] as const) if (trade.overBudget[k]) chips.push({ tone: 'loss', text: t(OVER[k]) });
  return [...chips, ...feel, ...gains.slice(1)];
}

/** The row for a part's next level, or null where it changes nothing worth a chip. `small` is the Suggested card's. */
export function tradeRow(w: World, id: string, small = false): HTMLElement | null {
  const chips = chipsOf(w, tradeoff(w.levels, id, !w.bk));
  if (!chips.length) return null;
  const fold = chips.length > MAX_CHIPS, shown = fold ? MAX_CHIPS - 1 : chips.length;
  const el = (c: Chip, hidden = false) => h('span', `tr-chip ${c.tone}${hidden ? ' tr-hide' : ''}`, '', ...(c.fluid ? [icon('i-fluid')] : []), document.createTextNode(c.text));
  const row = h('div', `tr-row${small ? ' small' : ''}`, '', ...chips.slice(0, shown).map((c) => el(c)), ...chips.slice(shown).map((c) => el(c, true)));
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', t('What this changes'));
  if (fold) {
    const more = h('button', 'tr-more', t('+{n} more', { n: chips.length - shown })) as HTMLButtonElement;
    more.type = 'button';
    more.addEventListener('click', (e) => { e.stopPropagation(); row.classList.toggle('open'); });
    row.append(more);
  }
  return row;
}
