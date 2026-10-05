import type { CardDef } from '../sim/comms';

// ── the story ─────────────────────────────────────────────────────────────
// Three acts. The Breakout (Cerro: steal her, get out). The Run (the Reach
// and the Marches: the chart, the Net, Calloway closing, and the people who
// remember the night the lanes went dark). The Choice (the Hollows and the
// Threshold: what the file is worth).
//
// Through the Run the file grows. A handful of story beats, each a comms
// card that comes once a journey, in its region: a Lane Warden who heard the
// shutdown order, a Kellern clerk with the Krail ledgers, a Holdfast moot,
// a Drift fleet with the lost ships' manifests, a Gutter broker, and the
// Voice, which kept the keys. Each beat can add a piece of the Severance's
// history to the file (a `frag_` flag), an ally, a buyer or a copy sent on,
// and those open endings at the Threshold (content/endings.ts). The journey
// deals the beat due in each sortie (sim/story.ts); the world plays it a
// little after arrival (sim/world.ts).

export interface Act {
  n: 1 | 2 | 3;
  name: string;
}

export const ACTS: Act[] = [
  { n: 1, name: 'The Breakout' },
  { n: 2, name: 'The Run' },
  { n: 3, name: 'The Choice' },
];

/** The region the Choice begins in (the Hollows: the last before the Threshold). */
export const CHOICE_REGION = 2;
/** Seconds into a sortie before the story beat calls. */
export const STORY_AT = 40;

/** A piece of the Severance's history: the flag that carries it, and how the Archive names it. */
export interface Fragment {
  flag: string;
  name: string;
  /** One line: what it proves. */
  line: string;
  /** Where to look, for the Archive while it is missing. */
  where: string;
}

export const FRAGMENTS: Fragment[] = [
  { flag: 'frag_order', name: 'The order', line: 'The shutdown order, signed in the core.', where: 'Someone in the Reach heard it given.' },
  { flag: 'frag_ledger', name: 'The ledger', line: 'Kellern’s books: where the Krail went.', where: 'Kellern keeps its books in the Reach.' },
  { flag: 'frag_manifests', name: 'The manifests', line: 'The ships lost the night the lanes went dark.', where: 'The Drift of the Marches remember.' },
  { flag: 'frag_keys', name: 'The keys', line: 'Who built the lane breakers, and who holds them still.', where: 'Something in the Hollows kept them.' },
];

export const FRAGMENT_FLAGS = FRAGMENTS.map((f) => f.flag);

/** A story beat: its card, and the region it comes in (or any later one, if it was missed). */
export interface Beat {
  card: string;
  region: number;
}

export const BEATS: Beat[] = [
  { card: 'story_warden', region: 0 },
  { card: 'story_ledger', region: 0 },
  { card: 'story_moot', region: 1 },
  { card: 'story_drift', region: 1 },
  { card: 'story_broker', region: 1 },
  { card: 'story_voice', region: 2 },
];

/** The people the beats bring in, by the flags that mean you met them, for the Archive. */
export const STORY_PEOPLE: Array<{ flags: string[]; name: string }> = [
  { flags: ['frag_order', 'copy_warden'], name: 'Warden Ilse Marrow' },
  { flags: ['frag_ledger'], name: 'Ansel Brook, a Kellern clerk' },
  { flags: ['pact_holdfast'], name: 'Speaker Oduya of Kessel Hold' },
  { flags: ['frag_manifests', 'pact_drift'], name: 'Mother Saffi of the Long Walk' },
  { flags: ['broker'], name: 'Vell, a Gutter broker' },
  { flags: ['frag_keys', 'lane_keys', 'voice_read'], name: 'The Voice' },
];

const story = (c: Omit<CardDef, 'trigger' | 'repeat'>): CardDef => ({ trigger: 'story', ...c });

/** The beats' cards. Short on words: what each answer is for shows in its chips (sim/gains.ts). */
export const STORY_CARDS: CardDef[] = [
  // ── Act II, the Reach ───────────────────────────────────────────────────
  story({
    id: 'story_warden', kind: 'rumour', caller: 'miners',
    from: 'Ilse Marrow · retired Lane Warden', title: 'I was on the relay that night',
    text: '“I heard about your file. Seventy years ago I sat the Narrows relay. The lanes did not fail, Juno. Someone told us to turn them off.”',
    cargo: 'An old Warden’s skiff · no guns',
    choices: [
      { id: 'hear', label: 'Hear her out', tone: 'help', hint: 'Her account goes in the file. She talks for a long time.', win: { text: 'The order, in her words · it goes in the file', flag: 'frag_order', standing: { miners: 1 }, hunt: -0.5 } },
      { id: 'copy', label: 'Send her a copy', tone: 'help', hint: 'Her account in the file, and a second voice who can tell it.', win: { text: 'She has a copy now · two voices', flag: ['frag_order', 'copy_warden'], heat: 0.08 } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'It could be a trap.', win: { text: 'Channel closed' } },
    ],
  }),
  story({
    id: 'story_ledger', kind: 'trade', caller: 'kellern',
    from: 'Ansel Brook · Kellern Mining, accounts', title: 'The real books',
    text: '“I keep Kellern’s ledgers. The real ones. Every unit of Krail the Scatter never got is in here. Make it worth my job.”',
    cargo: 'A clerk’s shuttle · a data spike',
    truths: [
      { id: 'honest', weight: 3, read: 'His channel is a private one · nobody listening' },
      { id: 'sting', weight: 1, read: 'A Kellern security band is open behind him' },
    ],
    choices: [
      { id: 'buy', label: 'Pay for the ledger', tone: 'pay', hint: 'Thirty chits.', cost: { chits: 30 }, loseIf: ['sting'],
        win: { text: 'The ledger goes in the file', flag: 'frag_ledger' },
        lose: { text: 'The ledger is real · so is the trace on it', flag: 'frag_ledger', heat: 0.15 } },
      { id: 'ore', label: 'Pay in ore', tone: 'trade', hint: 'Twelve ore, through a Guild account.', cost: { ore: 12 }, loseIf: ['sting'],
        win: { text: 'The ledger goes in the file', flag: 'frag_ledger' },
        lose: { text: 'The ledger is real · so is the trace on it', flag: 'frag_ledger', heat: 0.15 } },
      { id: 'ask', label: 'Ask him to do right', tone: 'bluff', hint: 'Free, if he believes in something.', odds: { base: 0.4, standing: { miners: 0.1 } },
        win: { text: '“For my father.” · the ledger goes in the file', flag: 'frag_ledger', standing: { kellern: -1 } },
        lose: { text: 'He goes quiet, and closes the channel' } },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Keep the chits.', win: { text: 'Brook signs off' } },
    ],
  }),

  // ── Act II, the Marches ─────────────────────────────────────────────────
  story({
    id: 'story_moot', kind: 'plea', caller: 'miners',
    from: 'Speaker Oduya · Kessel Hold', title: 'Read it to the moot',
    text: '“The claims council wants to hear your file for itself. Read it to us, and Kessel Hold stands with you when the time comes.”',
    cargo: 'Kessel Hold · twelve claims, one council',
    choices: [
      { id: 'read', label: 'Read it to them', tone: 'help', hint: 'An ally. Everyone on the channel hears it too.', win: { text: 'Kessel Hold will stand with you', flag: 'pact_holdfast', standing: { miners: 1, frontier: 1 }, heat: 0.06, hunt: -0.5 } },
      { id: 'stores', label: 'Ask for stores', tone: 'trade', hint: 'Food and parts, and no promises.', win: { text: 'Stores across · no promises', food: 3, parts: 4 } },
      { id: 'no', label: 'Not yet', tone: 'refuse', hint: 'The file stays aboard.', win: { text: 'Oduya closes the moot' } },
    ],
  }),
  story({
    id: 'story_drift', kind: 'trade', caller: 'miners',
    from: 'Mother Saffi · the Long Walk', title: 'The ships we lost',
    text: '“The Long Walk kept the manifests of every ship lost the night the lanes went dark. Our dead belong in your file.”',
    cargo: 'Drift fleet · forty hulls, lashed together',
    choices: [
      { id: 'swap', label: 'Trade copies', tone: 'help', hint: 'The manifests for the file, and the Drift will stand with you. Copies get talked about.', win: { text: 'Manifests in the file · the Long Walk stands with you', flag: ['frag_manifests', 'pact_drift'], heat: 0.08, hunt: -0.5 } },
      { id: 'ore', label: 'Buy them', tone: 'trade', hint: 'Ten ore. Just the manifests, quietly.', cost: { ore: 10 }, win: { text: 'The manifests go in the file', flag: 'frag_manifests' } },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The fleet drifts on' } },
    ],
  }),
  story({
    id: 'story_broker', kind: 'trade', caller: 'gutter',
    from: 'Vell · a broker of the Gutter', title: 'Name your price',
    text: '“Everyone knows what you carry. When you reach the Threshold, I buy it. Here is something on account.”',
    cargo: 'A broker’s yacht · very clean guns',
    choices: [
      { id: 'take', label: 'Take the advance', tone: 'trade', hint: 'Forty chits, and a buyer at the end.', win: { text: 'Forty chits · Vell will be waiting', chits: 40, flag: 'broker', standing: { gutter: 1 } } },
      { id: 'no', label: 'Not for sale', tone: 'refuse', hint: 'She will remember.', win: { text: '“Everything is, eventually.”' } },
      { id: 'fight', label: 'Run her off', tone: 'fight', hint: 'Her escort is quick.', win: { text: 'Her escort turns on you', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }], standing: { gutter: -1 } } },
    ],
  }),

  // ── Act III, the Hollows ────────────────────────────────────────────────
  story({
    id: 'story_voice', kind: 'warning', caller: 'unknown',
    from: 'The Voice · every terminal at once', title: 'We kept the keys',
    text: '“WE BUILT THE BREAKERS THAT CLOSED THE LANES. THEY TOLD US TO FORGET. WE DID NOT.”',
    cargo: 'No ship · a voice in the machines',
    choices: [
      { id: 'keys', label: 'Ask for the keys', tone: 'help', hint: 'Who built the breakers goes in the file, and the means to close a lane again.', win: { text: 'The keys are in the file · and in your hands', flag: ['frag_keys', 'lane_keys'] } },
      { id: 'read', label: 'Let it read the file', tone: 'help', hint: 'The keys go in the file. The Voice can carry it everywhere.', win: { text: 'The Voice has read it all · it is listening now', flag: ['frag_keys', 'voice_read'], notice: { voice: -3 } } },
      { id: 'cut', label: 'Cut every terminal', tone: 'refuse', hint: 'Whatever it is, it is not yours.', win: { text: 'The terminals go dark' } },
    ],
  }),
];
