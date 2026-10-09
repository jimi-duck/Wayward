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
// little after arrival (sim/world.ts). The eight-region journey has two a
// region, ten more, and four more pieces of the file.

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
/** Act I's one beat: a call from the yard in Cerro, before the first jump. */
export const YARD_BEAT = 'story_yard';

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

/** The four more the long journey's beats bring in. The endings still read the first four; these are the rest of the file. */
export const FRAGMENTS_LONG: Fragment[] = [
  { flag: 'frag_blackbox', name: 'The black box', line: 'A wreck’s recorder: the last call from the night the lanes went dark.', where: 'Wrecks in the Salvage Belt keep their recorders.' },
  { flag: 'frag_charts', name: 'The charts', line: 'The old lane charts, from before the breakers.', where: 'Someone in the Drift Deep still sails by them.' },
  { flag: 'frag_workorder', name: 'The work order', line: 'The Continuance’s order to build the breakers, signed and dated.', where: 'The Breaker Yards filed everything.' },
  { flag: 'frag_witnesses', name: 'The witnesses', line: 'Forty names of people who were in the room, and kept quiet.', where: 'The Free Ports keep a list of who was there.' },
];
export const FRAGMENTS_ALL: Fragment[] = [...FRAGMENTS, ...FRAGMENTS_LONG];
export const FRAGMENT_FLAGS_LONG = FRAGMENTS_ALL.map((f) => f.flag);

/**
 * A story beat: its card, and the region it comes in (or any later one, if it was missed). `region` is the
 * three-region chart's; `long` is the eight-region chart's (two a region: one that moves the file, one a faction).
 * A beat with no `region` belongs to the long chart alone.
 */
export interface Beat {
  card: string;
  region?: number;
  long: number;
}

export const BEATS: Beat[] = [
  { card: 'story_warden', region: 0, long: 0 },
  { card: 'story_ledger', region: 0, long: 0 },
  { card: 'story_moot', region: 1, long: 1 },
  { card: 'story_drift', region: 1, long: 1 },
  { card: 'story_broker', region: 1, long: 2 },
  { card: 'story_salvor', long: 2 },
  { card: 'story_charts', long: 3 },
  { card: 'story_ferry', long: 3 },
  { card: 'story_workorder', long: 4 },
  { card: 'story_crew', long: 4 },
  { card: 'story_harbour', long: 5 },
  { card: 'story_witnesses', long: 5 },
  { card: 'story_voice', region: 2, long: 6 },
  { card: 'story_thren', long: 6 },
  { card: 'story_aide', long: 7 },
  { card: 'story_toll', long: 7 },
];

/** The people the beats bring in, by the flags that mean you met them, for the Archive. */
export const STORY_PEOPLE: Array<{ flags: string[]; name: string }> = [
  { flags: ['frag_order', 'copy_warden'], name: 'Warden Ilse Marrow' },
  { flags: ['frag_ledger'], name: 'Ansel Brook, a Kellern clerk' },
  { flags: ['pact_holdfast'], name: 'Speaker Oduya of Kessel Hold' },
  { flags: ['frag_manifests', 'pact_drift'], name: 'Mother Saffi of the Long Walk' },
  { flags: ['broker'], name: 'Vell, a Gutter broker' },
  { flags: ['frag_keys', 'lane_keys', 'voice_read'], name: 'The Voice' },
  { flags: ['frag_blackbox'], name: 'Dov Kessin, a salvor' },
  { flags: ['frag_charts'], name: 'Hale Tarn, a chartwright' },
  { flags: ['frag_workorder'], name: 'Pell Anand, a yard clerk' },
  { flags: ['frag_witnesses'], name: 'Mirren, keeper of the list' },
];

const story = (c: Omit<CardDef, 'trigger' | 'repeat'>): CardDef => ({ trigger: 'story', ...c });

/** The beats' cards. Short on words: what each answer is for shows in its chips (sim/gains.ts). */
export const STORY_CARDS: CardDef[] = [
  // ── Act I, the Breakout ─────────────────────────────────────────────────
  story({
    id: 'story_yard', kind: 'trade', caller: 'miners',
    from: 'Tam Okoro · yard foreman', title: 'The gate crew owes you',
    text: '“The gate crew looks away for a minute, Juno. I can get you codes, or fill your tank. Not both.”',
    cargo: 'Cerro yard · one open bay',
    choices: [
      { id: 'codes', label: 'Take the codes', tone: 'pay', hint: 'A clean ID at the lane, if it passes the scan. Costs four supplies.', cost: { supplies: 4 }, win: { text: 'Forged codes loaded', flag: 'codes' } },
      { id: 'fuel', label: 'Fill the tank', tone: 'help', hint: 'Enough Cyrite for the first jump. The yard logs it.', win: { text: 'Tank topped up · the yard logs it', cyrite: 14, heat: 0.06 } },
      { id: 'wave', label: 'Wave him off', tone: 'refuse', hint: 'Keep your supplies and your record.', win: { text: 'Okoro closes the channel' } },
    ],
  }),
  // ── Act II, the Reach ───────────────────────────────────────────────────
  story({
    id: 'story_warden', kind: 'rumour', caller: 'miners',
    from: 'Ilse Marrow · retired Lane Warden', title: 'I was on the relay that night',
    text: '“I heard about your file. Seventy years ago I ran the Narrows relay. The lanes didn’t fail. We were told to turn them off.”',
    cargo: 'An old Warden’s skiff · no guns',
    choices: [
      { id: 'hear', label: 'Hear her out', tone: 'help', hint: 'Her account goes in the file. She talks for a long time.', win: { text: 'The order, in her words · it goes in the file', flag: 'frag_order', standing: { miners: 1 }, hunt: -0.5 } },
      { id: 'copy', label: 'Send her a copy', tone: 'help', hint: 'Her account in the file, and a second voice to tell it.', win: { text: 'She has a copy now · two voices', flag: ['frag_order', 'copy_warden'], heat: 0.08 } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'It could be a trap.', win: { text: 'Channel closed' } },
    ],
  }),
  story({
    id: 'story_ledger', kind: 'trade', caller: 'kellern',
    from: 'Ansel Brook · Kellern Mining, accounts', title: 'The real books',
    text: '“I keep Kellern’s real books. Every unit of Krail the Scatter never got is in here. Make it worth my job.”',
    cargo: 'A clerk’s shuttle · a data spike',
    truths: [
      { id: 'honest', weight: 3, read: 'His channel is a private one · nobody listening' },
      { id: 'sting', weight: 1, read: 'A Kellern security band is open behind him' },
    ],
    choices: [
      { id: 'buy', label: 'Pay for the ledger', tone: 'pay', hint: 'Six Cyrite.', cost: { chits: 30 }, loseIf: ['sting'],
        win: { text: 'The ledger goes in the file', flag: 'frag_ledger' },
        lose: { text: 'The ledger is real · so is the trace on it', flag: 'frag_ledger', heat: 0.15 } },
      { id: 'ask', label: 'Ask him to do right', tone: 'bluff', hint: 'Free, if he believes in something.', odds: { base: 0.4, standing: { miners: 0.1 } },
        win: { text: '“For my father.” · the ledger goes in the file', flag: 'frag_ledger', standing: { kellern: -1 } },
        lose: { text: 'He goes quiet, and closes the channel' } },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Keep the Cyrite.', win: { text: 'Brook signs off' } },
    ],
  }),

  // ── Act II, the Marches ─────────────────────────────────────────────────
  story({
    id: 'story_moot', kind: 'plea', caller: 'miners',
    from: 'Speaker Oduya · Kessel Hold', title: 'Read it to the moot',
    text: '“The council wants to hear your file. Read it to us and Kessel Hold stands with you.”',
    cargo: 'Kessel Hold · twelve claims, one council',
    choices: [
      { id: 'read', label: 'Read it to them', tone: 'help', hint: 'An ally. Everyone on the channel hears it too.', win: { text: 'Kessel Hold will stand with you', flag: 'pact_holdfast', standing: { miners: 1, frontier: 1 }, heat: 0.06, hunt: -0.5 } },
      { id: 'stores', label: 'Ask for stores', tone: 'trade', hint: 'Supplies, and no promises.', win: { text: 'Stores across · no promises', supplies: 5 } },
      { id: 'no', label: 'Not yet', tone: 'refuse', hint: 'The file stays aboard.', win: { text: 'Oduya closes the moot' } },
    ],
  }),
  story({
    id: 'story_drift', kind: 'trade', caller: 'miners',
    from: 'Mother Saffi · the Long Walk', title: 'The ships we lost',
    text: '“We kept the manifests of every ship lost the night the lanes went dark. Our dead belong in your file.”',
    cargo: 'Drift fleet · forty hulls, lashed together',
    choices: [
      { id: 'swap', label: 'Trade copies', tone: 'help', hint: 'The manifests, and the Drift stand with you. Copies get talked about.', win: { text: 'Manifests in the file · the Long Walk stands with you', flag: ['frag_manifests', 'pact_drift'], heat: 0.08, hunt: -0.5 } },
      { id: 'ore', label: 'Buy them', tone: 'trade', hint: 'Four Cyrite. Just the manifests, quietly.', cost: { chits: 20 }, win: { text: 'The manifests go in the file', flag: 'frag_manifests' } },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The fleet drifts on' } },
    ],
  }),
  story({
    id: 'story_broker', kind: 'trade', caller: 'gutter',
    from: 'Vell · a broker of the Gutter', title: 'Name your price',
    text: '“Everyone knows what you carry. At the Threshold, I buy it. Here’s something on account.”',
    cargo: 'A broker’s yacht · very clean guns',
    choices: [
      { id: 'take', label: 'Take the advance', tone: 'trade', hint: 'Eight Cyrite, and a buyer at the end.', win: { text: 'Eight Cyrite · Vell will be waiting', chits: 40, flag: 'broker', standing: { gutter: 1 } } },
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
      { id: 'keys', label: 'Ask for the keys', tone: 'help', hint: 'Who built the breakers goes in the file, and a way to close a lane.', win: { text: 'The keys are in the file · and in your hands', flag: ['frag_keys', 'lane_keys'] } },
      { id: 'read', label: 'Let it read the file', tone: 'help', hint: 'The keys go in the file. The Voice can carry it everywhere.', win: { text: 'The Voice has read it all · it is listening now', flag: ['frag_keys', 'voice_read'], notice: { voice: -3 } } },
      { id: 'cut', label: 'Cut every terminal', tone: 'refuse', hint: 'Whatever it is, it is not yours.', win: { text: 'The terminals go dark' } },
    ],
  }),

  // ── the long journey: the Salvage Belt to the Last Lanes ──────────────────
  story({
    id: 'story_salvor', kind: 'trade', caller: 'miners',
    from: 'Dov Kessin · salvor', title: 'A recorder that still runs',
    text: '“That wreck’s recorder still runs. It heard the night the lanes went dark. I can’t cut it free alone.”',
    cargo: 'A salvage tug · one cutting arm',
    choices: [
      { id: 'cut', label: 'Cut it free together', tone: 'help', hint: 'Two supplies for the blades. The recording goes in the file.', cost: { supplies: 2 }, win: { text: 'The black box goes in the file', flag: 'frag_blackbox', standing: { miners: 1 } } },
      { id: 'pay', label: 'Pay him to do it', tone: 'pay', hint: 'Five Cyrite. Quiet, and slower.', cost: { chits: 25 }, win: { text: 'Kessin hands over the recorder', flag: 'frag_blackbox' } },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'Not worth the time.', win: { text: 'Kessin goes back to his wreck' } },
    ],
  }),
  story({
    id: 'story_charts', kind: 'trade', caller: 'miners',
    from: 'Hale Tarn · chartwright', title: 'The charts they burned',
    text: '“I draw lanes by hand, from charts the Continuance burned. I’ll trade you a copy for something to eat.”',
    cargo: 'A drifting chart room · lamps and paper',
    choices: [
      { id: 'food', label: 'Trade supplies', tone: 'trade', hint: 'Three supplies for the old charts.', cost: { supplies: 3 }, win: { text: 'The old charts go in the file', flag: 'frag_charts' } },
      { id: 'share', label: 'Share what you know', tone: 'help', hint: 'Free. He hears the file too, and talks.', win: { text: 'Tarn copies your route · the charts go in the file', flag: 'frag_charts', heat: 0.08, standing: { miners: 1 } } },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The lamps drift astern' } },
    ],
  }),
  story({
    id: 'story_ferry', kind: 'trade', caller: 'miners',
    from: 'Ossi Rane · the Quiet Ferry', title: 'A lane ahead',
    text: '“Nobody hunts out here. I can carry you a lane ahead of anyone behind you. Stores, and no questions.”',
    cargo: 'A slow ferry · forty berths, all empty',
    choices: [
      { id: 'ride', label: 'Ride the ferry', tone: 'trade', hint: 'Four food. Calloway loses a day.', cost: { supplies: 4 }, win: { text: 'The ferry carries you ahead', hunt: 1, standing: { miners: 1 } } },
      { id: 'talk', label: 'Trade stories', tone: 'help', hint: 'Rane shares his stores for the news.', win: { text: 'Stores across · the news goes round', supplies: 3, heat: 0.05 } },
      { id: 'no', label: 'Wave him on', tone: 'refuse', hint: 'Keep your stores.', win: { text: 'The ferry idles away' } },
    ],
  }),
  story({
    id: 'story_workorder', kind: 'trade', caller: 'kellern',
    from: 'Pell Anand · yard clerk', title: 'The first work order',
    text: '“Every breaker built here has a work order. The first is signed in the Continuance’s own hand. Taking it costs me my pension.”',
    cargo: 'A yard shuttle · a sealed case',
    choices: [
      { id: 'buy', label: 'Pay for the order', tone: 'pay', hint: 'Seven Cyrite.', cost: { chits: 35 }, win: { text: 'The work order goes in the file', flag: 'frag_workorder' } },
      { id: 'shield', label: 'Promise to shield him', tone: 'bluff', hint: 'Free, if he believes you can.', odds: { base: 0.45, standing: { kellern: 0.1 } }, win: { text: '“Then take it.” · the work order goes in the file', flag: 'frag_workorder', standing: { kellern: -1 } }, lose: { text: 'He thinks better of it, and closes the case' } },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Keep the Cyrite.', win: { text: 'Anand signs off' } },
    ],
  }),
  story({
    id: 'story_crew', kind: 'plea', caller: 'frontier',
    from: 'Marit Voss · crew steward', title: 'The yard crews',
    text: '“The yard crews stop work if you stand with us. It buys you a quiet lane, and Kellern a bad week.”',
    cargo: 'A crew barge · two hundred hands',
    choices: [
      { id: 'stand', label: 'Stand with the crews', tone: 'help', hint: 'Calloway loses a day. Kellern will not forget it.', win: { text: 'The crews stop work · the lane goes quiet', hunt: 1, standing: { frontier: 1, miners: 1, kellern: -1 } } },
      { id: 'parts', label: 'Ask for supplies', tone: 'trade', hint: 'Four supplies, and no promises.', win: { text: 'Supplies across · no promises', supplies: 4 } },
      { id: 'no', label: 'Not yet', tone: 'refuse', hint: 'Stay out of it.', win: { text: 'The barge falls away' } },
    ],
  }),
  story({
    id: 'story_harbour', kind: 'trade', caller: 'guild',
    from: 'Ines Duarte · harbour-master, the Dust Traders', title: 'A berth, no questions',
    text: '“A berth for the Wayward, and no questions. The Guild only wants to know you for a friend.”',
    cargo: 'The harbour-master’s launch · very good manners',
    choices: [
      { id: 'berth', label: 'Take the berth', tone: 'trade', hint: 'Supplies for the stay. The Guild takes note.', win: { text: 'A berth, stores and a friend in the Guild', supplies: 6, heat: 0.05, standing: { guild: 1 } } },
      { id: 'pay', label: 'Pay your way', tone: 'pay', hint: 'Four Cyrite. No favours owed.', cost: { chits: 20 }, win: { text: 'Docked and square', supplies: 6 } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'You fly on your own.', win: { text: 'The launch turns back' } },
    ],
  }),
  story({
    id: 'story_witnesses', kind: 'rumour', caller: 'guild',
    from: 'Old Mirren · keeper of the free ports’ list', title: 'Forty names',
    text: '“We keep the names of everyone in the room when the order was read. Forty of them. Read it to no one.”',
    cargo: 'A ledger-keeper’s skiff · a locked box',
    choices: [
      { id: 'copy', label: 'Copy the list', tone: 'help', hint: 'The names go in the file. Copies get talked about.', win: { text: 'The witnesses go in the file', flag: 'frag_witnesses', heat: 0.08 } },
      { id: 'swear', label: 'Swear to guard it', tone: 'help', hint: 'Only the file, and her trust.', win: { text: 'She lets you read it · the witnesses go in the file', flag: 'frag_witnesses', standing: { guild: 1 } } },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'Some names are better left.', win: { text: 'Mirren closes the box' } },
    ],
  }),
  story({
    id: 'story_thren', kind: 'warning', caller: 'unknown',
    from: 'The Thren · a signal that is not speech', title: 'They follow you',
    text: '“THEY FOLLOW THE CYRITE. THEY FOLLOW YOU. SPEAK, OR BE FOLLOWED.”',
    cargo: 'No ship · a pulse in the dark',
    choices: [
      { id: 'vent', label: 'Vent six Cyrite', tone: 'pay', hint: 'The swarm feeds and drifts off.', cost: { cyrite: 6 }, win: { text: 'The Thren feed on the Cyrite and go quiet', calm: 120 } },
      { id: 'show', label: 'Show them the file', tone: 'bluff', hint: 'A gamble. They may read it as a threat.', odds: { base: 0.5 }, win: { text: 'They read it, and make room', calm: 240, notice: { thren: -2 } }, lose: { text: 'They take it as a challenge' } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Whatever it is, it is not yours.', win: { text: 'The pulse fades' } },
    ],
  }),
  story({
    id: 'story_aide', kind: 'plea', caller: 'office',
    from: 'Noor Hale · sub-prefect, the Continuance', title: 'The Prefect’s aide',
    text: '“I serve the Prefect. I could lose her for a day. Tell me what you mean to do at the Threshold.”',
    cargo: 'A Continuance cutter · no weapons showing',
    choices: [
      { id: 'tell', label: 'Tell her the truth', tone: 'help', hint: 'She delays the Prefect two days. She also knows your plan.', win: { text: 'Hale holds the Prefect back, and keeps your answer', hunt: 2, heat: 0.1 } },
      { id: 'lie', label: 'Give her a lie', tone: 'bluff', hint: 'A day, if she believes it.', odds: { base: 0.5 }, win: { text: 'She believes you · a day gained', hunt: 1 }, lose: { text: 'She sees through it, and marks you' } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Trust no one from the Office.', win: { text: 'The cutter turns away' } },
    ],
  }),
  story({
    id: 'story_toll', kind: 'trade', caller: 'guild',
    from: 'Keeper Oren · the Last Toll', title: 'Every lane ends here',
    text: '“Every lane ends here. The toll is what you carry, or what you are.”',
    cargo: 'A toll platform · one lit window',
    choices: [
      { id: 'pay', label: 'Pay the toll', tone: 'pay', hint: 'Six Cyrite. He tops up the tank.', cost: { chits: 30 }, win: { text: 'Toll paid · the tank is topped up', cyrite: 10 } },
      { id: 'name', label: 'Say who you are', tone: 'bluff', hint: 'Free, if he cares.', odds: { base: 0.45, standing: { guild: 0.1 } }, win: { text: '“Then the lane is yours.” · the tank is topped up', cyrite: 10, heat: 0.05 }, lose: { text: 'He bars the window' } },
      { id: 'run', label: 'Run the gate', tone: 'fight', hint: 'The platform’s guns wake.', win: { text: 'The platform opens fire', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }] } },
    ],
  }),
];
