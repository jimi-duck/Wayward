// Clarity pass: the trade beside the Fit button, Wanted and Calloway warnings, Jump ready.
export const SIGNALS: Record<string, string> = {
  // the trade row (ui/tradechips.ts)
  'jump fluid': 'Sprungfluid',
  "can't jump yet": 'Sprung noch nicht möglich',
  '+{n} more': '+{n} mehr',
  'Mass over limit': 'Masse über Limit',
  'Power over limit': 'Strom über Limit',
  'Heat over limit': 'Hitze über Limit',
  'What this changes': 'Was sich ändert',
  // Wanted's callout and Calloway's lines (ui/pressure.ts)
  'Go quiet': 'Leise werden',
  'Ships inbound': 'Schiffe im Anflug',
  "She's reading your route: {kind} again. Pick another kind.": 'Sie liest deine Route: wieder {kind}. Wähl mal eine andere Sorte.',
  "She's reading your route: straight at the Threshold. Turn aside once.": 'Sie liest deine Route: geradeaus zur Schwelle. Bieg mal ab.',
  'One jump behind you, and she knows your pattern. Change your route.': 'Einen Sprung hinter dir, und sie kennt dein Muster. Ändere deine Route.',
  'She has lost your trail.': 'Sie hat deine Spur verloren.',
  'mining systems': 'Bergbau-Systeme',
  'port systems': 'Hafen-Systeme',
  'transit systems': 'Transit-Systeme',
  'contested systems': 'Kampf-Systeme',
  'Calloway may expect this': 'Calloway rechnet damit',
  // Jump ready (ui/hud.ts)
  'Jump ready': 'Sprung bereit',
  'Jump fluid short': 'Sprungfluid knapp',
};
