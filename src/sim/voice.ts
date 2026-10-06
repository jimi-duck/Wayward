import { VOICE, type VoiceId } from '../content/voice';
import { budgets, cheapest, stockLevels, type BayCtx } from './bay';
import { worn } from './papers';

// ── what the ship says ────────────────────────────────────────────────────
// The firmest line that is true now (content/voice.ts has the words, in
// order): over the mass rating, worn plates, a build that is no longer the
// yard's, Krail enough for a module, a stock ship, and crew absent for the
// rest. Shown on the bay and the pause card.

export interface VoiceCtx { bay: BayCtx; plates: number; maxPlates: number; }

const sum = (l: Record<string, number>) => Object.values(l).reduce((a, b) => a + b, 0);

export function voiceId(c: VoiceCtx): VoiceId {
  const { use, cap } = budgets(c.bay.levels);
  const modified = sum(c.bay.levels) > sum(stockLevels());
  const next = cheapest(c.bay);
  const holds: Record<VoiceId, boolean> = {
    overweight: use.mass > cap.mass,
    maintenance: worn(c.plates, c.maxPlates),
    unauthorised: modified,
    refit: !!next && c.bay.krail >= next.cost,
    obedience: !modified,
    crew: true,
  };
  return VOICE.find((v) => holds[v.id])!.id;
}

export const voiceText = (id: VoiceId): string => VOICE.find((v) => v.id === id)!.text;
