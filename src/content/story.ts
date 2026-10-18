import type { CardDef } from '../sim/comms';
import { WAKE_DROP } from '../sim/civic';

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
/** Act I's two beats in Cerro, before the first jump: the registry notice when the archive wakes, then the call from the yard. */
export const WAKE_BEAT = 'story_wake';
export const YARD_BEAT = 'story_yard';
export const CERRO_BEATS = [WAKE_BEAT, YARD_BEAT] as const;

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
  /** Comes only once this flag is set: a follow-up to an earlier choice. Never gates the main spine. */
  needs?: string;
  region?: number;
  long: number;
}

export const BEATS: Beat[] = [
  { card: 'story_warden', region: 0, long: 0 },
  { card: 'story_ledger', region: 0, long: 0 },
  { card: 'story_brook_arrest', needs: 'brook_met', long: 0 },
  { card: 'story_moot', region: 1, long: 1 },
  { card: 'story_drift', region: 1, long: 1 },
  { card: 'story_oduya_rigs', needs: 'pact_holdfast', long: 1 },
  { card: 'story_broker', region: 1, long: 2 },
  { card: 'story_kesh', needs: 'broker', long: 2 },
  { card: 'story_vell_betray', needs: 'broker', long: 2 },
  { card: 'story_ada', needs: 'frag_blackbox', long: 2 },
  { card: 'story_salvor', long: 2 },
  { card: 'story_charts', long: 3 },
  { card: 'story_ferry', long: 3 },
  { card: 'story_ferry_agent', needs: 'ferry_met', long: 3 },
  { card: 'story_workorder', long: 4 },
  { card: 'story_crew', long: 4 },
  { card: 'story_tam_brother', needs: 'archive_woke', long: 4 },
  { card: 'story_harbour', long: 5 },
  { card: 'story_ines_offer', needs: 'ines_berth', long: 5 },
  { card: 'story_vell_reckoning', needs: 'broker', long: 5 },
  { card: 'story_tollgate', needs: 'archive_woke', long: 5 },
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
  { flags: ['frag_charts'], name: 'Tarn Ilvo, a chartwright' },
  { flags: ['frag_workorder'], name: 'Pell Anand, a yard clerk' },
  { flags: ['frag_witnesses'], name: 'Mirren, keeper of the list' },
];

const story = (c: Omit<CardDef, 'trigger' | 'repeat'>): CardDef => ({ trigger: 'story', ...c });

/**
 * Cerro's lane mouth: the first time the Score is a door. The registry reads the pilot, not the hull: a compliant
 * pilot is waved through; one under review has to scan, pay, send the yard's codes, run or fight.
 */
export const REGISTRY_CARD: CardDef = {
  id: 'story_registry', kind: 'checkpoint', caller: 'custody', trigger: 'lane',
  from: 'Custody blockade · Cerro lane', title: 'Pilot under review',
  text: '“Hauler OB-7731-A, reported stolen. Registry status: UNDER REVIEW. Lane access is suspended pending inspection. Stand by.”',
  lines: [
    { if: { civicMin: 400 }, text: 'Your registry still reads COMPLIANT. She hesitates.' },
    { if: { civicMax: 399 }, text: 'The ordinary doorway is shut: it needs a Civic Score of 400.' },
    { if: { flag: 'tam_codes' }, text: 'Okoro’s codes are loaded.' },
    { if: { heatMin: 0.5 }, text: 'Your ship is flagged across the system.' },
  ],
  ships: [{ variant: 'lancer', n: 1 }, { variant: 'picket', n: 2 }], cargo: 'Custody blockade cutter, full magazines',
  fee: { base: 40, heat: 60 },
  truths: [
    { id: 'corrupt', weight: 1, read: 'Her log shows she has waved ships through for a fee all week.' },
    { id: 'by_book', weight: 1, read: 'Her record is clean. She follows the rules.' },
  ],
  choices: [
    {
      id: 'show', label: 'Show your registry', tone: 'pay', hint: 'A compliant pilot is waved through unlogged. Needs a Civic Score of 400.',
      needs: { civic: 400 },
      win: { text: 'She waves a compliant pilot through · the lane is clear', blockade: 'pass', civic: 3, civicWhy: 'Registry presented at a checkpoint' },
    },
    {
      id: 'scan', label: 'Submit to the scan', tone: 'pay', hint: 'Slow and safe. The scan is logged, and the Offices see where you went.',
      win: { text: 'The scan is logged · you reach the lane', blockade: 'pass', heat: 0.12, civic: -6, civicWhy: 'Mandatory scan logged', flag: 'scanned' },
    },
    {
      id: 'pay', label: 'Pay the inspection fee', tone: 'pay', hint: 'If she takes bribes you pass. If not, she takes the money and scans you anyway.',
      cost: { chits: 'fee' }, loseIf: ['by_book'],
      win: { text: 'She takes the fee · the scan finds nothing', blockade: 'pass', civic: 5, civicWhy: 'Fee paid on time' },
      lose: { text: 'She takes the fee and orders the scan anyway', blockade: 'fight' },
    },
    {
      id: 'spoof', label: 'Send the forged codes', tone: 'bluff', hint: 'The codes from the yard. They may hold, or be flagged on the scan.',
      needs: { flag: 'codes' }, odds: { base: 0.8, heat: -0.25, flags: { codes_bad: -0.6 } },
      win: { text: 'The registration matches · she lets you through', blockade: 'pass', heat: -0.1, flag: 'codes_passed' },
      lose: { text: 'The codes are flagged · she opens fire', blockade: 'fight', heat: 0.1, civic: -15, civicWhy: 'Forged registration detected' },
    },
    {
      id: 'run', label: 'Run the blockade', tone: 'run', hint: 'Make for the lane under her guns. She chases you, and her field slows your jump.',
      win: { text: 'You break through the blockade · the system is alerted', blockade: 'run', civic: -25, civicWhy: 'Ran a registry checkpoint' },
    },
    {
      id: 'fight', label: 'Fight through', tone: 'fight', hint: 'Break the blockade and salvage the wrecks. Every pilot in Cerro hears of it.',
      win: { text: 'Weapons hot · you attack the blockade', blockade: 'fight', civic: -40, civicWhy: 'Attacked the Custody' },
    },
  ],
};

/** The beats' cards. Short on words: what each answer is for shows in its chips (sim/gains.ts). */
export const STORY_CARDS: CardDef[] = [
  // ── Act I, the Breakout ─────────────────────────────────────────────────
  // The registry reads the Wayward's helm and logs the unauthorised access; the Score drops where the player
  // can see it. The yard's call follows it: the forged codes are what the checkpoint's doorway turns on.
  story({
    id: 'story_wake', kind: 'warning', caller: 'office',
    from: 'Registry · automated notice', title: 'Unauthorised archive access',
    text: '“HELM ACCEPTED: ASTER. Sealed archive opened on OB-7731-A. Unauthorised access recorded. Civic Score 412 to 374. Status: UNDER REVIEW.”',
    cargo: 'The Wayward · a hauler that was meant for scrap',
    choices: [
      { id: 'log', label: 'Open the archive log', tone: 'help', hint: 'Read what woke. It costs nothing, and the Wall keeps it.',
        win: { text: 'A Warden routine woke on your hand · the log is on the Wall', civic: -WAKE_DROP, civicWhy: 'Unauthorised archive access recorded', flag: ['archive_woke', 'clue_archive_log'], follow: { card: YARD_BEAT, after: 22 } } },
      { id: 'later', label: 'Keep flying', tone: 'refuse', hint: 'The log stays sealed until you ask for it.',
        win: { text: 'The log stays sealed · your status reads UNDER REVIEW', civic: -WAKE_DROP, civicWhy: 'Unauthorised archive access recorded', flag: 'archive_woke', follow: { card: YARD_BEAT, after: 22 } } },
    ],
  }),
  story({
    id: 'story_yard', kind: 'trade', caller: 'miners',
    from: 'Tam Okoro · yard foreman', title: 'The gate crew owes you',
    text: '“The gate crew looks away for one minute, Juno. Codes or a full tank. Not both. I am putting my name on it either way.”',
    cargo: 'Cerro yard · one open bay',
    choices: [
      { id: 'codes', label: 'Take the codes', tone: 'pay', hint: 'They pass the lane scan if they hold. Costs four supplies. Okoro will ask a favour.', cost: { supplies: 4 }, win: { text: 'Forged codes loaded · Okoro will ask a favour', flag: ['codes', 'tam_codes'] } },
      { id: 'fuel', label: 'Fill the tank', tone: 'help', hint: 'Enough jump fluid for the first jump. The yard logs the draw and your Score drops.', win: { text: 'Tank topped up · the yard logs the draw', fuel: 14, heat: 0.06, civic: -10, civicWhy: 'Unscheduled fuel draw logged', flag: 'tam_fuel' } },
      { id: 'wave', label: 'Wave him off', tone: 'refuse', hint: 'Keep your supplies and your record. He will remember.', win: { text: 'Okoro closes the channel', flag: 'tam_alone' } },
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
        win: { text: 'The ledger goes in the file', flag: ['frag_ledger', 'brook_met', 'clue_sig_reach'] },
        lose: { text: 'The ledger is real · so is the trace on it', flag: ['frag_ledger', 'brook_met', 'clue_sig_reach'], heat: 0.15 } },
      { id: 'ask', label: 'Ask him to do right', tone: 'bluff', hint: 'Free, if he believes in something.', odds: { base: 0.4, standing: { miners: 0.1 } },
        win: { text: '“For my father.” · the ledger goes in the file', flag: ['frag_ledger', 'brook_met', 'clue_sig_reach'], standing: { kellern: -1 } },
        lose: { text: 'He goes quiet, and closes the channel' } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Keep the Cyrite.', win: { text: 'Brook signs off' } },
    ],
  }),

  // ── Act II, the Marches ─────────────────────────────────────────────────
  story({
    id: 'story_brook_arrest', kind: 'warning', caller: 'custody',
    from: 'Ansel Brook · in Custody transport', title: 'They took the clerk',
    text: '“They traced the ledger to me. I am in a Custody transport, ten minutes from a cell. Please. You have the only copy.”',
    cargo: 'A Custody transport · one escort',
    choices: [
      { id: 'rescue', label: 'Break him out', tone: 'fight', hint: 'Fight the escort. Custody hears of it, and your Score falls.', win: { text: 'Brook is aboard the shuttle · Custody marks you', flag: 'brook_free', civic: -20, civicWhy: 'Interfered with a Custody transport', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }], standing: { custody: -1 } } },
      { id: 'divert', label: 'Divert the transport', tone: 'bluff', hint: 'Spoof a priority order. A gamble; failure costs Score.', odds: { base: 0.45, civic: 0.2 }, win: { text: 'The transport turns aside · Brook walks free', flag: 'brook_free', civic: -5, civicWhy: 'A forged order was logged' }, lose: { text: 'The order fails · the transport runs on', flag: 'brook_taken', civic: -12, civicWhy: 'A forged order was logged' } },
      { id: 'leave', label: 'Leave him', tone: 'refuse', hint: 'His account is already in your file.', win: { text: 'The channel closes · he is taken', flag: 'brook_taken' } },
    ],
  }),
  story({
    id: 'story_oduya_rigs', kind: 'plea', caller: 'miners',
    from: 'Speaker Oduya · Kessel Hold', title: 'The rigs are under attack',
    text: '“Kellern security is boarding our rigs. You stood with us in the moot. Stand with us now, or we lose the claims.”',
    cargo: 'Kessel Hold · twelve claims, two raiders',
    choices: [
      { id: 'defend', label: 'Defend the rigs', tone: 'fight', hint: 'Fight the raiders. Kessel Hold will not forget it.', win: { text: 'The raiders break off · the claims hold', flag: 'oduya_rigs', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }], standing: { miners: 1, kellern: -1 } } },
      { id: 'stores', label: 'Send supplies', tone: 'help', hint: 'Three supplies for the crews. They hold on their own.', cost: { supplies: 3 }, win: { text: 'The crews hold the rigs on your stores', flag: 'oduya_rigs', standing: { miners: 1 } } },
      { id: 'no', label: 'Not now', tone: 'refuse', hint: 'You cannot afford the fight.', win: { text: 'Oduya closes the channel' } },
    ],
  }),
  story({
    id: 'story_moot', kind: 'plea', caller: 'miners',
    from: 'Speaker Oduya · Kessel Hold', title: 'Read it to the moot',
    text: '“The council wants to hear your file. Read it to us and Kessel Hold stands with you.”',
    cargo: 'Kessel Hold · twelve claims, one council',
    choices: [
      { id: 'read', label: 'Read it to them', tone: 'help', hint: 'An ally. Everyone on the channel hears it too.', win: { text: 'Kessel Hold will stand with you', flag: ['pact_holdfast', 'oduya_name'], standing: { miners: 1, frontier: 1 }, heat: 0.06, hunt: -0.5 } },
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
      { id: 'swap', label: 'Trade copies', tone: 'help', hint: 'The manifests, and the Drift stand with you. Copies get talked about.', win: { text: 'Manifests in the file · the Long Walk stands with you', flag: ['frag_manifests', 'pact_drift', 'wren_trust'], heat: 0.08, hunt: -0.5 } },
      { id: 'ore', label: 'Buy them', tone: 'trade', hint: 'Four Cyrite. Just the manifests, quietly.', cost: { chits: 20 }, win: { text: 'The manifests go in the file', flag: ['frag_manifests', 'wren_family'] } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The fleet drifts on' } },
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
    id: 'story_kesh', kind: 'trade', caller: 'gutter',
    from: 'Kesh · a fixer of the Gutter', title: 'Vell talks too much',
    text: '“I work for Vell. I also have ears. She is shopping your heading to the Offices. Pay my debt and I look the other way.”',
    cargo: 'A fixer’s skiff · patched, fast',
    choices: [
      { id: 'pay', label: 'Settle his debt', tone: 'pay', hint: 'Six Cyrite. He warns you when Vell moves.', cost: { chits: 30 }, win: { text: 'Kesh is square · he will warn you', flag: ['kesh_trust', 'kesh_warned'], standing: { gutter: 1 } } },
      { id: 'trust', label: 'Trust him', tone: 'bluff', hint: 'Free, if he believes you. He may sell you too.', odds: { base: 0.4, standing: { gutter: 0.1 } }, win: { text: '“Then I owe you.” · he will warn you', flag: ['kesh_trust', 'kesh_warned'] }, lose: { text: 'He laughs, and closes the channel' } },
      { id: 'no', label: 'Wave him off', tone: 'refuse', hint: 'Trust nobody from the Gutter.', win: { text: 'Kesh drifts away' } },
    ],
  }),
  story({
    id: 'story_vell_betray', kind: 'warning', caller: 'gutter',
    from: 'Vell · a broker of the Gutter', title: 'Your heading, sold',
    text: '“Business, pilot. The Offices pay better than I do. They know where you are going. I wish you luck.”',
    cargo: 'A broker’s yacht · leaving fast',
    choices: [
      { id: 'pay', label: 'Pay her to forget', tone: 'pay', hint: 'Eight Cyrite. She sells the next heading to you instead.', cost: { chits: 40 }, win: { text: 'Vell takes the money · the trail goes cold', flag: 'vell_paid', hunt: 1 } },
      { id: 'jam', label: 'Jam her channel', tone: 'fight', hint: 'The Offices hear nothing more, and the Gutter hears of it.', win: { text: 'The channel dies · the Gutter will remember', flag: 'vell_exposed', standing: { gutter: -1 }, heat: 0.08 } },
      { id: 'no', label: 'Let it go', tone: 'refuse', hint: 'Calloway gains on you.', win: { text: 'Vell is gone · the Offices have your heading', flag: 'vell_betrayed', hunt: -1 } },
    ],
  }),
  story({
    id: 'story_ada', kind: 'rumour', caller: 'unknown',
    from: 'The black box · Ada Aster, recorded', title: 'A voice on the recorder',
    text: '“If anyone hears this, the order was signed in the core. My name is Ada. Tell my granddaughter I tried. The lanes were switched off.”',
    cargo: 'A wreck’s recorder · one voice, seventy years old',
    choices: [
      { id: 'keep', label: 'Keep the recording', tone: 'help', hint: 'It stays in the file, unshared. Ada was Juno’s grandmother.', win: { text: 'Ada’s voice is yours alone', flag: ['ada_heard', 'ada_kept'] } },
      { id: 'share', label: 'Send it on', tone: 'help', hint: 'Copies get talked about, and believed.', win: { text: 'Ada’s voice goes out · the Gutter hears it', flag: 'ada_heard', heat: 0.08, standing: { miners: 1 } } },
      { id: 'later', label: 'Not now', tone: 'refuse', hint: 'You cannot listen yet.', win: { text: 'The recorder goes quiet' } },
    ],
  }),
  story({
    id: 'story_ferry_agent', kind: 'warning', caller: 'office',
    from: 'Ossi Rane · the Quiet Ferry', title: 'There is an agent aboard',
    text: '“One of my passengers is an Offices agent. He has watched you the whole way. I will do what you ask.”',
    cargo: 'The Quiet Ferry · forty passengers',
    choices: [
      { id: 'expose', label: 'Expose him', tone: 'fight', hint: 'The passengers put him off. The Offices lose a day.', win: { text: 'The agent is put off · the Offices lose a day', flag: ['agent_exposed', 'clue_agent'], hunt: 1, civic: -8, civicWhy: 'Interfered with an Offices agent' } },
      { id: 'shield', label: 'Let him be', tone: 'help', hint: 'He reports home. Rane keeps his licence.', win: { text: 'The agent stays aboard · the ferry runs on', flag: 'agent_shielded', civic: 6, civicWhy: 'A cooperative report was logged' } },
      { id: 'use', label: 'Feed him a story', tone: 'bluff', hint: 'A gamble. A false trail, or the Offices learn the truth.', odds: { base: 0.5 }, win: { text: 'The agent carries your false trail home', flag: ['agent_used', 'clue_agent'], hunt: 2 }, lose: { text: 'He sees through it, and marks you', flag: 'agent_exposed', heat: 0.1 } },
    ],
  }),
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
    from: 'Tarn Ilvo · chartwright', title: 'The charts they burned',
    text: '“I draw lanes by hand, from charts the Continuance burned. I’ll trade you a copy for something to eat.”',
    cargo: 'A drifting chart room · lamps and paper',
    choices: [
      { id: 'food', label: 'Trade supplies', tone: 'trade', hint: 'Three supplies for the old charts.', cost: { supplies: 3 }, win: { text: 'The old charts go in the file', flag: 'frag_charts' } },
      { id: 'share', label: 'Share what you know', tone: 'help', hint: 'Free. He hears the file too, and talks.', win: { text: 'Tarn copies your route · the charts go in the file', flag: 'frag_charts', heat: 0.08, standing: { miners: 1 } } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The lamps drift astern' } },
    ],
  }),
  story({
    id: 'story_ferry', kind: 'trade', caller: 'miners',
    from: 'Ossi Rane · the Quiet Ferry', title: 'A lane ahead',
    text: '“Nobody hunts out here. I can carry you a lane ahead of anyone behind you. Stores, and no questions.”',
    cargo: 'A slow ferry · forty berths, all empty',
    choices: [
      { id: 'ride', label: 'Ride the ferry', tone: 'trade', hint: 'Four food. Calloway loses a day.', cost: { supplies: 4 }, win: { text: 'The ferry carries you ahead', flag: 'ferry_met', hunt: 1, standing: { miners: 1 } } },
      { id: 'talk', label: 'Trade stories', tone: 'help', hint: 'Rane shares his stores for the news.', win: { text: 'Stores across · the news goes round', flag: 'ferry_met', supplies: 3, heat: 0.05 } },
      { id: 'no', label: 'Wave him on', tone: 'refuse', hint: 'Keep your stores.', win: { text: 'The ferry idles away' } },
    ],
  }),
  story({
    id: 'story_workorder', kind: 'trade', caller: 'kellern',
    from: 'Pell Anand · yard clerk', title: 'The first work order',
    text: '“Every breaker built here has a work order. The first is signed in the Continuance’s own hand. Taking it costs me my pension.”',
    cargo: 'A yard shuttle · a sealed case',
    choices: [
      { id: 'buy', label: 'Pay for the order', tone: 'pay', hint: 'Seven Cyrite.', cost: { chits: 35 }, win: { text: 'The work order goes in the file', flag: ['frag_workorder', 'clue_sig_yards'] } },
      { id: 'shield', label: 'Promise to shield him', tone: 'bluff', hint: 'Free, if he believes you can.', odds: { base: 0.45, standing: { kellern: 0.1 } }, win: { text: '“Then take it.” · the work order goes in the file', flag: ['frag_workorder', 'clue_sig_yards'], standing: { kellern: -1 } }, lose: { text: 'He thinks better of it, and closes the case' } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Keep the Cyrite.', win: { text: 'Anand signs off' } },
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
    id: 'story_tam_brother', kind: 'plea', caller: 'miners',
    from: 'Tam Okoro · calling from the yard', title: 'My brother is on that crew',
    text: '“My brother Eben works the Breaker Yards. Something is wrong with the hulls they bring in, scarred like claws. Take him a message?”',
    cargo: 'A yard relay · patched through three ports',
    choices: [
      { id: 'warn', label: 'Warn the crew', tone: 'help', hint: 'The scarred hulls go in the file. Your Score falls.', win: { text: 'Eben has the warning · the scarred hulls go in the file', flag: ['tam_brother', 'clue_scarred'], civic: -6, civicWhy: 'An unlicensed crew message was logged', standing: { frontier: 1 } } },
      { id: 'look', label: 'Look at the hulls', tone: 'trade', hint: 'Two supplies for a quiet look. Nobody is told.', cost: { supplies: 2 }, win: { text: 'You see the claw marks · they go in the file', flag: 'clue_scarred' } },
      { id: 'no', label: 'Not now', tone: 'refuse', hint: 'Tam will remember.', win: { text: 'Tam closes the channel' } },
    ],
  }),
  story({
    id: 'story_ines_offer', kind: 'trade', caller: 'guild',
    from: 'Ines Duarte · harbour-master, the Dust Traders', title: 'A very good price',
    text: '“You kept your berth. The Guild would like to buy a copy of your file. Quietly. The price is generous.”',
    cargo: 'The harbour-master’s launch · an open case',
    choices: [
      { id: 'sell', label: 'Sell a copy', tone: 'trade', hint: 'Twelve Cyrite. The Guild reads it, and so may others.', win: { text: 'Twelve Cyrite · a copy leaves your hands', chits: 60, flag: 'ines_copy', heat: 0.1, standing: { guild: 1 } } },
      { id: 'refuse', label: 'Refuse', tone: 'refuse', hint: 'The berth stays yours. The Guild cools.', win: { text: 'Ines nods · the Guild cools', flag: 'ines_refused', standing: { guild: -1 } } },
    ],
  }),
  story({
    id: 'story_vell_reckoning', kind: 'trade', caller: 'gutter',
    from: 'Vell · a broker of the Gutter', title: 'We should settle',
    text: '“Pilot. We have unfinished business. I would rather settle it here, where there are witnesses.”',
    cargo: 'A broker’s yacht · docked, guns cold',
    choices: [
      { id: 'collect', label: 'Collect what she owes', tone: 'pay', hint: 'Needs proof she sold your heading. Eight Cyrite, and the Gutter hears.', needs: { flag: 'vell_betrayed' }, win: { text: 'Vell pays · the Gutter watches her do it', chits: 40, flag: 'vell_collected', standing: { gutter: -1 } } },
      { id: 'settle', label: 'Call it even', tone: 'help', hint: 'No money moves. Vell stops selling you.', win: { text: 'Even · Vell will not sell you again', flag: 'vell_settled', standing: { gutter: 1 } } },
      { id: 'no', label: 'Walk away', tone: 'refuse', hint: 'The debt stays open.', win: { text: 'The yacht casts off' } },
    ],
  }),
  story({
    id: 'story_tollgate', kind: 'warning', caller: 'office',
    from: 'Prefect Idris Calloway · the Offices of Peace', title: 'The damping field',
    text: '“I closed this gate behind you, Juno. No guns, no jump. You carry what my father signed. Show me you know what it says.”',
    cargo: 'A Continuance cutter · the field is hers',
    choices: [
      { id: 'sign', label: 'Show the signature', tone: 'bluff', hint: 'Needs all three clues to the signature. Once.', needs: { flag: ['clue_sig_reach', 'clue_sig_yards', 'clue_sig_ports'] }, win: { text: 'She reads her father’s hand · the field drops', flag: ['calloway_turned', 'sig_used'], hunt: 2 } },
      { id: 'bargain', label: 'Bargain', tone: 'pay', hint: 'Eight Cyrite and your word. She lets you through.', cost: { chits: 40 }, win: { text: 'The field drops · she keeps your word', flag: 'calloway_bargain', hunt: 1 } },
      { id: 'shoot', label: 'Shoot the cutter', tone: 'fight', hint: 'Break the field the hard way. Your Score falls.', win: { text: 'The cutter breaks off · the Offices mark you', flag: 'calloway_hostile', civic: -30, civicWhy: 'Fired on an Offices cutter', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }], heat: 0.12 } },
      { id: 'run', label: 'Run the field', tone: 'run', hint: 'Cost: heat and a day lost.', win: { text: 'You limp out of the field', flag: 'calloway_hostile', civic: -10, civicWhy: 'Fled an Offices cutter', hunt: -1, heat: 0.1 } },
    ],
  }),
  story({
    id: 'story_harbour', kind: 'trade', caller: 'guild',
    from: 'Ines Duarte · harbour-master, the Dust Traders', title: 'A berth, no questions',
    text: '“A berth for the Wayward, and no questions. The Guild only wants to know you for a friend.”',
    cargo: 'The harbour-master’s launch · very good manners',
    choices: [
      { id: 'berth', label: 'Take the berth', tone: 'trade', hint: 'Supplies for the stay. The Guild takes note.', win: { text: 'A berth, stores and a friend in the Guild', flag: 'ines_berth', supplies: 6, heat: 0.05, standing: { guild: 1 } } },
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
      { id: 'copy', label: 'Copy the list', tone: 'help', hint: 'The names go in the file. Copies get talked about.', win: { text: 'The witnesses go in the file', flag: ['frag_witnesses', 'clue_sig_ports'], heat: 0.08 } },
      { id: 'swear', label: 'Swear to guard it', tone: 'help', hint: 'Only the file, and her trust.', win: { text: 'She lets you read it · the witnesses go in the file', flag: ['frag_witnesses', 'clue_sig_ports'], standing: { guild: 1 } } },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'Some names are better left.', win: { text: 'Mirren closes the box' } },
    ],
  }),
  story({
    id: 'story_thren', kind: 'warning', caller: 'unknown',
    from: 'The Thren · a signal that is not speech', title: 'They follow you',
    text: '“THEY FOLLOW THE CYRITE. THEY FOLLOW YOU. SPEAK, OR BE FOLLOWED.”',
    cargo: 'No ship · a pulse in the dark',
    choices: [
      { id: 'vent', label: 'Vent six Cyrite', tone: 'pay', hint: 'The swarm feeds and drifts off.', cost: { cyrite: 6 }, win: { text: 'The Thren feed on the Cyrite and go quiet', flag: 'clue_cyrite', calm: 120 } },
      { id: 'show', label: 'Show them the file', tone: 'bluff', hint: 'A gamble. They may read it as a threat.', odds: { base: 0.5 }, win: { text: 'They read it, and make room', flag: 'clue_cyrite', calm: 240, notice: { thren: -2 } }, lose: { text: 'They take it as a challenge' } },
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
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Trust no one from the Offices.', win: { text: 'The cutter turns away' } },
    ],
  }),
  story({
    id: 'story_toll', kind: 'trade', caller: 'guild',
    from: 'Keeper Oren · the Last Toll', title: 'Every lane ends here',
    text: '“Every lane ends here. The toll is what you carry, or what you are.”',
    cargo: 'A toll platform · one lit window',
    choices: [
      { id: 'pay', label: 'Pay the toll', tone: 'pay', hint: 'Six Cyrite. He tops up the tank.', cost: { chits: 30 }, win: { text: 'Toll paid · the tank is topped up', fuel: 10 } },
      { id: 'name', label: 'Say who you are', tone: 'bluff', hint: 'Free, if he cares.', odds: { base: 0.45, standing: { guild: 0.1 } }, win: { text: '“Then the lane is yours.” · the tank is topped up', fuel: 10, heat: 0.05 }, lose: { text: 'He bars the window' } },
      { id: 'run', label: 'Run the gate', tone: 'fight', hint: 'The platform’s guns wake.', win: { text: 'The platform opens fire', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }] } },
    ],
  }),
];
