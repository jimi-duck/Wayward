import type { World } from '../sim/world';
import { ALIEN_TYPES } from '../sim/enemies';
import { t } from '../i18n';

// ── the ship's operating state ────────────────────────────────────────────
// One word for how things stand, the same on the HUD, the pause card and the
// bay: observation (nothing near; the bay opens), contact (something awake
// inside sensor range), battle (the bay is locked), critical (the hull is
// nearly gone). Teal is calm, amber is a thing to watch, red is threat.

export type Ops = 'observation' | 'contact' | 'battle' | 'critical';

const CONTACT_RANGE = 130;

export const OPS_WORD: Record<Ops, string> = { observation: 'Observation', contact: 'Contact', battle: 'Battle', critical: 'Critical' };
/** What each state means for the bay, in a few words. */
export const OPS_NOTE: Record<Ops, string> = { observation: 'The bay opens', contact: 'The bay opens', battle: 'The bay is locked', critical: 'Hull failing' };

export function opsOf(w: World): Ops {
  if (w.alive && w.stats.maxPlates > 1 && w.plates <= 1) return 'critical';
  if (w.inDanger()) return 'battle';
  const s = w.ship;
  for (const a of w.aliens) {
    if (a.fleeing || ALIEN_TYPES[a.kind].fire === 'none') continue;
    if (Math.hypot(a.x - s.x, a.z - s.z) < CONTACT_RANGE) return 'contact';
  }
  return 'observation';
}

export const opsText = (o: Ops) => `◆ ${t(OPS_WORD[o])}`;
