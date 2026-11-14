import type { CardDef } from '../sim/comms';

// ── the divided resistance ────────────────────────────────────────────────
// Three answers to the same Continuance (docs/STORY_DIRECTION.md, plan
// priority 4): collective action (Hester's crews), self-rule (Kessel Hold, the
// Drift, the Quiet Line) and armed resistance (the Hollow Saints). The Saints'
// card is the Marches' failed operation: whatever Juno picks, someone pays.

export const SAINTS = 'Sister Vera Hask · the Hollow Saints';

export const RESISTANCE_CARDS: CardDef[] = [
  {
    id: 'saints_relay', kind: 'plea', caller: 'gutter', trigger: 'story', gist: 'The Saints will blow the Custody relay',
    from: SAINTS, title: 'The relay at Tamsin Field',
    text: '“Custody’s relay here tracks every hull in the Marches. We blow it tonight. Eleven Bonded conscripts crew it. They’d shoot you for Custody, and you know it.”',
    cargo: 'The Last Mercy · lights off',
    choices: [
      { id: 'help', label: 'Fly cover for them', tone: 'fight', hint: 'The relay goes dark, and the conscripts with it. Custody is blind for a day.',
        win: { text: 'The relay goes dark · eleven conscripts with it', flag: 'saints_helped', hunt: 1, heat: 0.08, standing: { gutter: 1, custody: -1 } } },
      { id: 'warn', label: 'Warn the conscripts', tone: 'help', hint: 'They get off the relay. The Saints call you a collaborator.',
        win: { text: 'The conscripts abandon the relay · the Saints turn on you', flag: 'saints_stopped', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }], standing: { gutter: -1 } } },
      { id: 'walk', label: 'Not my fight', tone: 'refuse', hint: 'It happens anyway.', win: { text: 'The relay goes dark behind you', flag: 'saints_ignored' } },
    ],
  },
];
