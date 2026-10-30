import type { PressureEvent } from '../sim/pressure';
import { t } from '../i18n';

// The words for the two kinds of warning (sim/pressure.ts says when). Wanted is this system's heat, and its warning
// ends with what to do here. Calloway is the hunt that follows the route, and hers is about the route.

/** The system kinds her read can name, as a phrase. */
const KIND: Record<string, string> = { mining: 'mining systems', port: 'port systems', transit: 'transit systems', contested: 'contested systems' };

/** A local warning, for the callout at the Wanted bar. `act` is last, always. */
export function wantedText(e: Extract<PressureEvent, { type: 'wanted' | 'pursuitUp' | 'eliteSeen' }>, inbound: boolean): string {
  const act = t(e.act === 'quiet' ? 'Go quiet' : 'Leave the system');
  switch (e.type) {
    case 'wanted': return `${t('Wanted {n} of 4', { n: e.level })}${e.inbound || inbound ? ` · ${t('Ships inbound')}` : ''} · ${act}`;
    case 'pursuitUp': return `${t('More Custody hulls coming')} · ${act}`;
    case 'eliteSeen': return `${t('Elite hull here')} · ${act}`;
  }
}

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
