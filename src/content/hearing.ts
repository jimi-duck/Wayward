import type { CardDef } from '../sim/comms';

// ── Thane's hearing at Gilt Market ────────────────────────────────────────
// The Office of Public Record will hear Juno's file, but Bonded evidence is
// "not admissible" (docs/STORY_DIRECTION.md §2). She needs a Chartered voice:
// Brook, if she freed him, or Lucan Calloway's own signature on the order.
// Either way it goes in aboard the Office's Chartered launch, and she flies
// beside it through Custody's scan cordon (sim/cordon.ts, the Free Ports' set piece).

export const THANE = 'Commissioner Aurel Thane · Office of Public Record';

export const HEARING_CARDS: CardDef[] = [
  {
    id: 'story_hearing', kind: 'warning', caller: 'office', trigger: 'story', gist: 'Thane will hear the file, but not from her',
    from: THANE, title: 'The hearing',
    text: '“The Office will hear your file. Your own evidence, Contract Resident Aster, is not admissible. Bonded testimony never is. Have you a Chartered voice?”',
    cargo: 'Office of Public Record · an open channel',
    choices: [
      { id: 'brook', label: 'Brook speaks for it', tone: 'help', show: { flag: 'brook_free' }, hint: 'A Chartered clerk under oath. Thane will take his Charter for it.',
        win: { text: 'Brook boards the Registry launch · fly him in', flag: ['hearing_heard', 'brook_struck', 'hearing_launch'], hunt: 1 } },
      { id: 'sign', label: 'Enter Lucan’s signature', tone: 'bluff', show: { flag: 'clue_order_sig' }, hint: 'His own hand, from his own office. Thane can’t strike it, only seal it.',
        win: { text: 'The signature goes aboard the Registry launch · fly it in', flag: ['hearing_heard', 'hearing_sealed', 'hearing_launch'], heat: 0.1 } },
      { id: 'walk', label: 'Walk out', tone: 'refuse', hint: 'Thane rules the file a forgery, on every band.', win: { text: 'Ruled a forgery · on every band', flag: 'hearing_forgery' } },
    ],
  },
];
