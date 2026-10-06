import type { World } from '../sim/world';
import { t } from '../i18n';

// ── the ship's state, one word ────────────────────────────────────────────
// The ship's alert (World.alert: clear, yellow, red) as a word on the bay and
// the pause card, with one more step the alert does not have: critical, when
// one plate is left. Teal is calm, amber (yellow alert) is being observed, red
// is being targeted.

export type Ops = 'clear' | 'yellow' | 'red' | 'critical';

export const OPS_WORD: Record<Ops, string> = { clear: 'Clear', yellow: 'Yellow alert', red: 'Red alert', critical: 'Critical' };

export function opsOf(w: World): Ops {
  if (w.alive && w.stats.maxPlates > 1 && w.plates <= 1) return 'critical';
  return w.alert();
}

export const opsText = (o: Ops) => `◆ ${t(OPS_WORD[o])}`;
