import type { PressureEvent } from '../sim/pressure';
import { t } from '../i18n';

// Calloway's words (sim/pressure.ts says when): the hunt that follows the route, and hers is about the route. Wanted,
// this system's heat, has no words: the Wanted bar pulses (ui/hud.ts).

/** The system kinds her read can name, as a phrase. */
const KIND: Record<string, string> = { mining: 'mining systems', port: 'port systems', transit: 'transit systems', contested: 'contested systems' };

/** Her line, in the comms strip: the route, never the ships. */
export function callowayText(e: Extract<PressureEvent, { type: 'callowayReads' | 'callowayClose' | 'callowayLost' }>): string {
  switch (e.type) {
    case 'callowayReads':
      return e.kind
        ? t("She's reading your route: {kind} again. Pick another kind.", { kind: t(KIND[e.kind] ?? e.kind) })
        : t("She's reading your route: straight at the Threshold. Turn aside once.");
    case 'callowayClose': return t('One jump behind you, and she knows your pattern. Change your route.');
    case 'callowayLost': return t('She has lost your trail.');
  }
}
