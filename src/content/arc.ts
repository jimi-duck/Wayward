import type { CardDef } from '../sim/comms';
import { CALLOWAY_FACE } from './calloway';

// ── Calloway and Juno: a slow burn (docs/STORY_DIRECTION.md §9) ───────────
// The Narrows is their first encounter: she asks, she watches, nothing is
// bargained. In the Marches she studies Juno from a distance; in the Belt she
// has read the file and calls, interested; in the Yards they disagree about
// what freedom costs; in the Free Ports she starts to manipulate (a clean name
// for a question owed); at the Tollgate she bargains for the first time, for
// what she has wanted since the Narrows; in the Last Lanes she negotiates in
// earnest. This file holds the Belt call; the rows are content/script/arc.ts.

export const CALLOWAY = 'Governor Idris Calloway';

export const ARC_CARDS: CardDef[] = [
  {
    id: 'calloway_file', kind: 'warning', caller: 'calloway', trigger: 'story', face: CALLOWAY_FACE, gist: 'Calloway has read your file',
    from: 'Governor Idris Calloway · CCV Patience', title: 'Your file',
    text: '“Your grandmother vanished, your family lost its Charter, and you inherited the debt. I’ve read your file, Juno. Tell me what you think you’re doing.”',
    cargo: 'A Governor’s channel · nothing offered',
    choices: [
      { id: 'truth', label: 'Tell her what the Severance was', tone: 'help', hint: 'She hears it from you. She will argue.', win: { text: '“I know what it was. It kept forty worlds alive.” · she closes the channel', flag: 'calloway_told' } },
      { id: 'ask', label: 'Ask why she cares', tone: 'bluff', hint: 'She may say more than she means to.', win: { text: '“Ada asked the same questions. I want to know where they led her.”', flag: 'calloway_curious' } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Give her nothing.', win: { text: '“You can’t outrun a file, Juno.”', flag: 'calloway_silent' } },
    ],
  },
];
