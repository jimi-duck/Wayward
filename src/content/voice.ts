// ── the ship's voice ──────────────────────────────────────────────────────
// What the Wayward's own operating system says about itself: short, flat,
// a little too obedient. Each line is tied to a real state (sim/voice.ts
// picks the firmest that holds); this is only the words, firmest first.

export type VoiceId = 'overweight' | 'maintenance' | 'unauthorised' | 'refit' | 'obedience' | 'crew';

export const VOICE: Array<{ id: VoiceId; text: string }> = [
  { id: 'overweight', text: 'Load limit exceeded' },
  { id: 'maintenance', text: 'Maintenance required' },
  { id: 'unauthorised', text: 'Unauthorised configuration' },
  { id: 'refit', text: 'Refit authorised' },
  { id: 'obedience', text: 'Obedience protocol: active' },
  { id: 'crew', text: 'Crew absent' },
];
