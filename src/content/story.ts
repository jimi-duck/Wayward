import type { CardDef } from '../sim/comms';
import { RECOVERY_FLAG } from '../sim/recovery';

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
/**
 * Act I past the gate (docs/ONBOARDING.md): Lane Control's breach notice (no way out offered), Sam's private offer of a
 * maintenance code a little way on, then the archive that wakes. Three cards, one a moment after the other, at the start of the
 * first sortie beyond Cerro. `story_bay` (the work bay's account) and `story_raiders` (the intercept) are the odd ones out:
 * they are played inside the training.
 */
export const BREACH_BEAT = 'story_breach';
export const SAM_BEAT = 'story_sam';
/** Where Sam's private channel always comes in from, in degrees (the bearing line and the RX readout on his calls). */
const SAM_BEARING = 47;
export const WAKE_BEAT = 'story_wake';
/** ADA-1, the ship's Warden core, as the radio and her cards name her (sentient-ship plan, owner 2026-11-27). */
export const ADA = 'ADA-1 · Warden core';
/** Set once she has spoken to Juno: her first card, or the one-time card for a save that read the old letter. */
export const CORE_MET = 'core_met';
/** A save that read the old letter, loaded since: ADA-1's one-time card is due (meta/save.ts). */
export const CORE_CATCHUP = 'core_catchup_due';
/** The opening's chain past Cerro. There is no registry card: the code's notice says it (owner 2026-10-31). */
export const CERRO_BEATS = [BREACH_BEAT, SAM_BEAT, WAKE_BEAT] as const;
/**
 * Seconds into that sortie before the chain begins: after the jump-arrival sweep and the system's title card are done
 * (render/sector.ts ARRIVE_HOLD + ARRIVE_SWING = 8 s), so the breach notice never cuts the camera short (owner, 2 November 2026).
 */
export const OPENING_AT = 9;

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
  { flag: 'frag_manifests', name: 'The manifests', line: 'The ships lost the night the gates went dark.', where: 'The Drift of the Marches remember.' },
  { flag: 'frag_keys', name: 'The keys', line: 'Who built the gate breakers, and who holds them still.', where: 'Something in the Hollows kept them.' },
];

export const FRAGMENT_FLAGS = FRAGMENTS.map((f) => f.flag);

/** The four more the long journey's beats bring in. The endings still read the first four; these are the rest of the file. */
const FRAGMENTS_LONG: Fragment[] = [
  { flag: 'frag_blackbox', name: 'The black box', line: 'A wreck’s recorder: the last call from the night the gates went dark.', where: 'Wrecks in the Salvage Belt keep their recorders.' },
  { flag: 'frag_charts', name: 'The charts', line: 'The old gate charts, from before the breakers.', where: 'Someone in the Drift Deep still sails by them.' },
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
  /** Comes only on arriving at a gate: the lane out of the region is where she waits. */
  gate?: boolean;
  region?: number;
  long: number;
}

export const BEATS: Beat[] = [
  { card: 'story_warden', region: 0, long: 0 },
  { card: 'story_ledger', region: 0, long: 0 },
  { card: 'story_brook_arrest', needs: 'brook_met', long: 0 },
  { card: 'story_calloway_narrows', needs: 'archive_woke', gate: true, long: 0 },
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
  { card: 'story_draper', needs: 'stalled', long: 4 },
  { card: 'story_harbour', long: 5 },
  { card: 'story_ines_offer', needs: 'ines_berth', long: 5 },
  { card: 'story_vell_reckoning', needs: 'broker', long: 5 },
  { card: 'story_tollgate', needs: 'archive_woke', long: 5 },
  { card: 'story_witnesses', long: 5 },
  { card: 'story_voice', region: 2, long: 6 },
  { card: 'story_thren', long: 6 },
  { card: 'story_echo_sable', needs: 'archive_woke', long: 6 },
  { card: 'story_aide', long: 7 },
  { card: 'story_toll', long: 7 },
  { card: 'story_oren_who', needs: 'archive_woke', long: 7 },
  { card: 'story_implant', needs: 'archive_woke', long: 7 },
];

/** The people the beats bring in, by the flags that mean you met them, for the Archive. */
export const STORY_PEOPLE: Array<{ flags: string[]; name: string }> = [
  { flags: ['frag_order', 'copy_warden'], name: 'Warden Ilse Marrow' },
  { flags: ['frag_ledger'], name: 'Adam Brook, a Kellern clerk' },
  { flags: ['pact_holdfast'], name: 'Councillor Oduya of Kessel Hold' },
  { flags: ['frag_manifests', 'pact_drift'], name: 'Ma Saffi of the Long Walk' },
  { flags: ['broker'], name: 'Val, a Gutter broker' },
  { flags: ['frag_keys', 'lane_keys', 'voice_read'], name: 'The Voice' },
  { flags: ['frag_blackbox'], name: 'Dov Kessler, a salvor' },
  { flags: ['frag_charts'], name: 'Tarik Silva, a chartwright' },
  { flags: ['frag_workorder'], name: 'Ben Anand, a yard clerk' },
  { flags: ['frag_witnesses'], name: 'Mirren, keeper of the list' },
];

/** One line for a glance at the pop-up: what is happening, before any of the detail. */
const GIST: Record<string, string> = {
  "story_bay": "The company will finance a launcher",
  "story_raiders": "Two unknown ships · pay or refuse",
  "story_seized": "The raiders took everything",
  "story_breach": "Contract in breach · recovery ordered",
  "story_sam": "Sam has a code for the owner lock",
  "story_wake": "ADA-1 wakes · Ada’s key in her core",
  "story_core_catchup": "ADA-1 · the ship’s Warden core",
  "story_registry": "Lane checkpoint · your registry decides",
  "story_warden": "A retired Warden heard the shutdown order",
  "story_ledger": "A Kellern clerk sells the real books",
  "story_brook_arrest": "Brook is in a Custody transport",
  "story_order": "The signed order to shut the relays",
  "story_handwriting": "Ilse knows Ada’s old ship",
  "ilse_recording": "Ilse sends the order anyway",
  "story_brook_road": "Brook is in a Custody transport",
  "story_brook_declined": "Brook is in a Custody transport anyway",
  "story_calloway_narrows": "The Governor wants to know who you are",
  "narrows_checkpoint": "Ashgrove holds the gate at the Narrows",
  "warden_note_1": "Ada’s first note · the Narrows watch",
  "story_oduya_rigs": "Kessel Hold’s rigs are under attack",
  "story_moot": "Kessel Hold wants the file read aloud",
  "story_drift": "The Drift offer their lost-ship manifests",
  "story_broker": "Val offers an advance for the file",
  "story_kesh": "Kesh warns Val is selling your heading",
  "story_vell_betray": "Val sold your heading to the Offices",
  "story_ada": "A recording of Ada Aster, your grandmother",
  "story_salvor": "A salvor needs help cutting out a recorder",
  "story_charts": "An old chartwright trades the lost charts",
  "story_ferry": "The Quiet Ferry offers a ride",
  "story_ferry_agent": "An Offices agent is aboard the ferry",
  "story_workorder": "A yard clerk sells the lane-breaker order",
  "story_crew": "Yard crews ask you to stand with them",
  "story_tam_brother": "Sam asks you to warn his brother",
  "story_draper": "Draper works for the Offices, not Kellern",
  "story_harbour": "The Dust Traders offer a berth",
  "story_ines_offer": "The Guild wants to buy a copy",
  "story_witnesses": "Forty names of those who kept quiet",
  "story_vell_reckoning": "Val wants to settle your account",
  "story_tollgate": "Calloway has closed the gate behind you",
  "story_voice": "The Voice kept the lane keys",
  "story_thren": "The Thren follow the Cyrite you carry",
  "story_mirren_relay": "Waking a relay would expose a hidden pier",
  "story_echo_sable": "Echo and Sable each ask a favour",
  "story_aide": "The Governor’s aide asks your plan",
  "story_toll": "The Last Toll wants payment",
  "story_oren_who": "Oren’s first question: who are you",
  "story_oren_cost": "Oren’s second question: what it cost",
  "story_oren_why": "Oren’s third question: what it is for",
  "story_implant": "ADA-1 tells you why it was your hull"
};

const story = (c: Omit<CardDef, 'trigger' | 'repeat'>): CardDef => ({ trigger: 'story', gist: GIST[c.id], ...c });

/**
 * Cerro's Jump Gate: the first time the Score is a door. The registry reads the pilot, not the hull: a compliant
 * pilot is waved through; one under review has to scan, pay, send the yard's codes, run or fight.
 */
export const REGISTRY_CARD: CardDef = {
  id: 'story_registry', gist: GIST.story_registry, kind: 'checkpoint', caller: 'custody', trigger: 'lane',
  from: 'Custody blockade · Cerro gate', title: 'Pilot under review',
  text: '“Hauler OB-7731-A, reported stolen. Gate access is suspended pending inspection. Stand by.”',
  lines: [
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
      id: 'show', label: 'Show your registry', tone: 'pay', hint: 'Waved through unlogged. Needs a registration that has already passed a scan.',
      needs: { flag: 'codes_passed' },
      win: { text: 'She waves you through · the gate is clear', blockade: 'pass' },
    },
    {
      id: 'scan', label: 'Submit to the scan', tone: 'pay', hint: 'Slow and safe. The scan is logged, and the Offices see where you went.',
      win: { text: 'The scan is logged · you reach the gate', blockade: 'pass', heat: 0.12, flag: 'scanned' },
    },
    {
      id: 'pay', label: 'Pay the inspection fee', tone: 'pay', hint: 'If she takes bribes you pass. If not, she takes the money and scans you anyway.',
      cost: { chits: 'fee' }, loseIf: ['by_book'],
      win: { text: 'She takes the fee · the scan finds nothing', blockade: 'pass' },
      lose: { text: 'She takes the fee and orders the scan anyway', blockade: 'fight' },
    },
    {
      id: 'spoof', label: 'Send the forged codes', tone: 'bluff', hint: 'The codes from the yard. They may hold, or be flagged on the scan.',
      needs: { flag: 'codes' }, odds: { base: 0.8, heat: -0.25, flags: { codes_bad: -0.6 } },
      win: { text: 'The registration matches · she lets you through', blockade: 'pass', heat: -0.1, flag: 'codes_passed' },
      lose: { text: 'The codes are flagged · she opens fire', blockade: 'fight', heat: 0.1 },
    },
    {
      id: 'run', label: 'Run the blockade', tone: 'run', hint: 'Make for the gate under her guns. She chases you, and her field slows your jump.',
      win: { text: 'You break through the blockade · the system is alerted', blockade: 'run' },
    },
    {
      id: 'fight', label: 'Fight through', tone: 'fight', hint: 'Break the blockade and salvage the wrecks. Every pilot in Cerro hears of it.',
      win: { text: 'Weapons hot · you attack the blockade', blockade: 'fight' },
    },
  ],
};

/** The beats' cards. Short on words: what each answer is for shows in its chips (sim/gains.ts). */
/** Brook's three answers at Copperline, with his word on the radio after (the road's cards). */
function BROOK_CHOICES(): CardDef['choices'] {
  const brook = (text: string) => ({ from: 'Adam Brook', caller: 'kellern' as const, delay: 0.8, text });
  return [
    // a chase (content/situations.ts brook_transport): the transport runs for the Jump Gate with two escorts, and she has to cripple it first
    { id: 'rescue', label: 'Run it down', tone: 'fight', hint: 'Cripple the transport before it makes the Jump Gate. Do not sink it.', win: { text: 'The transport is running for the Jump Gate' } },
    { id: 'divert', label: 'Divert the transport', tone: 'bluff', hint: 'Spoof a priority order. A gamble.', odds: { base: 0.45 }, win: { text: 'The transport turns aside · Brook walks free', flag: 'brook_free', radio: brook('“I owe you a clean ledger. I’ll send it on ahead.”') }, lose: { text: 'The order fails · the transport runs on', flag: 'brook_taken' } },
    { id: 'leave', label: 'Leave him', tone: 'refuse', hint: 'His account is already in your file.', win: { text: 'The channel closes · he is taken', flag: 'brook_taken' } },
  ];
}

export const STORY_CARDS: CardDef[] = [
  // ── Act I, the Breakout ─────────────────────────────────────────────────
  // The Work Bay's projection (inside the training), the raiders' ultimatum, then the chain beyond the gate: the breach
  // notice, Sam's private channel (one action, the code), the registry update and the archive that wakes on it. All drawn
  // as Neon Glass sheets after the opening chapter mockups (docs/DESIGN-GUIDELINES.md).
  story({
    id: 'story_bay', kind: 'trade', caller: 'miners', glass: 'cyan', status: 'Live',
    from: 'Account system · Contract 08-441', title: 'Contract summary',
    text: 'Payment on delivery · 1,000 Cyrite',
    ledger: 'bay',
    doc: { kind: 'bay', open: 'View account summary', kick: 'Document · account summary', title: 'Contract 08-441', sub: 'Projected on delivery of 1,000 Cyrite.', note: 'The delivery is not complete yet. These figures are a projection, not money in your account.', at: 3 },
    side: { from: 'Work Bay · docked', status: '800 Cyrite', title: 'Service stop', label: 'Sam Okoro · radio',
      lines: ['There’s raiders working out your way, Juno. Get torpedoes fitted before you head back. I mean it.', 'The company will finance the launcher. Twenty credits off your pay, I know, but I want you coming home.'] },
    cargo: 'Cerro work bay · Contract 08-441',
    choices: [
      { id: 'install', label: 'Torpedo launcher', tone: 'pay', hint: 'Company-financed · 20 CR (deducted from your payout)',
        win: { text: 'Launcher fitted · financed against the contract', fit: 'tp_bay' } },
    ],
  }),
  story({
    id: 'story_raiders', kind: 'warning', caller: 'unknown', glass: 'red', status: 'Hostile hail', facts: 'raid',
    from: 'Unregistered raider · 2 ships closing', title: 'Cut your main drive and open the hold.',
    text: 'That ore isn’t going to any company port. It’s ours now. Cut your drive and let us aboard, or we open the hold ourselves.',
    cargo: 'Two unknown ships · closing',
    choices: [
      { id: 'refuse', label: 'Refuse and fight', tone: 'fight', hint: 'They attack. You keep the ore if you win.', tag: 'Combat',
        win: { text: 'Weapons hot · the raiders turn on you', hostile: true, radio: { from: 'Unknown', text: '“Then we do it the hard way.”' } } },
      { id: 'pay', label: 'Surrender', tone: 'pay', hint: 'They take you and sell you into slavery.', tag: 'Ends the run', end: true,
        win: { text: 'You surrender · the raiders take everything', follow: { card: 'story_seized', after: 0.5, quick: true } } },
    ],
  }),
  story({
    id: 'story_seized', kind: 'warning', caller: 'unknown', glass: 'red', status: 'Run ended', ledger: 'seized',
    from: 'Unknown raider · boarding', title: 'Captured',
    text: 'They take the cargo and the ship. You’re sold into forced labour.',
    choices: [
      { id: 'again', label: 'Start the contract again', tone: 'run', hint: 'The opening begins from the top.',
        win: { text: 'The contract starts again', redo: true } },
    ],
  }),
  story({
    id: 'story_breach', kind: 'warning', caller: 'office', glass: 'red', status: 'Breach', ledger: 'breach',
    from: 'Contract notice', title: 'Contract 08-441 · Breach',
    text: 'The delivery was not received. All outstanding charges are due now.\nThe vessel will be recovered and impounded.',
    doc: { kind: 'invoice', open: 'View breach invoice', kick: 'Document · breach invoice', title: 'Contract 08-441 · Outstanding charges', sub: 'Delivery not received.', note: 'Vessel recovery initiated.' },
    cargo: 'Contract 08-441 · short delivery',
    choices: [
      // the recovery (sim/recovery.ts): Lane Control flies her in and says so in an alert (ui/hud.ts), then Sam on the
      // radio, whose channel opens 2 km out from the dock. One plain acknowledgement (the owner, 23 October 2026).
      { id: 'proceed', label: 'Acknowledge', tone: 'run', hint: '',
        win: { text: 'Controls locked · recovery autopilot active', flag: RECOVERY_FLAG,
          radio: { from: 'Sam Okoro', caller: 'miners', delay: 2.5, gap: 10, text: ['“They’re calling it a breach. They want the hauler back, and you with it. Let the autopilot fly for now.”', '“Hang in there, Juno. I’m not letting them have you. Give me a minute.”'] } } },
    ],
  }),
  story({
    id: 'story_sam', kind: 'warning', caller: 'miners', glass: 'ochre', status: 'Private', rx: SAM_BEARING, quote: true,
    from: 'Sam Okoro · private channel', title: 'A way out',
    text: 'Juno, it’s me. Keep this off the open channel.\nThis code overrides the autopilot. The debt’s still there, and they’ll be looking for you, but this is your chance to get out.\nHead to Ned’s yard, he owes me one. He’ll reprogram her and mask your code, at least for now. It isn’t much, but it’s a start.',
    cargo: 'Ned’s yard · off the route',
    choices: [
      { id: 'code', label: 'Input the code', tone: 'run', hint: '',
        // the code overrides the autopilot and nothing more (owner 2026-11-05): she is still the company's grey hull; Ned's yard makes her hers (sim/postjump.ts PAINT_DUE)
        win: { text: 'Autopilot overridden · the helm is yours', flag: ['ship_stolen', 'paint_due', 'lease_broken', 'codes', 'tam_codes', 'tam_favour'], heat: 0.12,
          signal: { tone: 'teal', headline: 'Autopilot overridden', reason: 'Gate Control shut out' },
          radio: { from: 'Sam Okoro', caller: 'miners', delay: 0.4, text: '“At least you’ll have your freedom. Don’t dock. Ned’s yard first. Go, Juno.”' } } },
    ],
  }),
  story({
    // ADA-1's first words (sentient-ship plan, owner 2026-11-27): the reboot at Ned's yard gave the ship's old Warden core her hull back.
    // She flew it with Ada Aster for decades and has been shut in under Kellern's lock since. She tells the why (owner, 28 November
    // 2026): the night the outer Jump Gates went dark seventy years ago, and the Continuance's story of it (no Krail, failure from
    // neglect, an emergency that never ended). The first relay gives back the 94% that breaks that story (CORE_FIRST). Only Ilse,
    // in the Reach, says the gates were switched off by order. "Is that you, Ada?" is said to Ada, for a moment (owner's copy).
    id: 'story_wake', kind: 'warning', caller: 'core', glass: 'ochre', status: 'Warden core online', quote: true, notitle: true,
    herald: { headline: 'Warden core online', reason: 'it woke with the lights' },
    from: 'ADA-1 · Warden core', title: 'I can feel the ship again',
    letter: { head: [], sign: '' },
    text: 'Systems returning. I can feel the ship again… Is that you, Ada?\nNo. Of course not. I’m ADA-1. I flew this ship with Ada Aster, your grandmother. We worked together for a very long time. I’ve been sealed away for decades, Juno.\nSeventy years ago, in a single night, the outer Jump Gates went dark. The Continuance announced that Krail reserves had been exhausted and declared an emergency closure until supplies could be restored and the network made safe again. Millions were left trapped, isolated from the Core Worlds.\nBut the gates never reopened. The emergency never ended. While the outer systems were left to fend for themselves, the Continuance consolidated its power and tightened its control over the inner worlds.\nAda never believed their story. She spent years investigating what really happened. Together, we were developing a way to reopen the Jump Gates. I think the time has finally come.',
    cargo: 'The Wayward · a Warden core under her decking',
    choices: [
      { id: 'lead', label: 'Let’s do it. How?', tone: 'help', hint: 'She shows you the relay by the gate.',
        win: { text: 'ADA-1 is awake · the relay by the gate first', flag: ['archive_woke', 'clue_archive_log', CORE_MET],
          signal: { tone: 'amber', headline: 'Registry: unregistered', reason: 'Paint won’t pass a scan' },
          radio: [
            { from: ADA, caller: 'core', delay: 3, text: '“There’s a relay beside the Jump Gate. Wake it, and we should be able to bring that gate online.”' },
            { from: ADA, caller: 'core', delay: 9, text: '“Bring the ship close and hold position until it’s activated.”' },
            { from: 'Sam Okoro', caller: 'miners', delay: 22, text: '“Your ship talks now? Fine. If she gets you out, listen to her.”' },
          ] } },
    ],
  }),
  story({
    // a save that read the grandmother's old letter before ADA-1 had a voice: once, at the next free moment on the road (content/script/core.ts)
    id: 'story_core_catchup', kind: 'warning', caller: 'core', glass: 'ochre', status: 'Warden core online', quote: true, notitle: true, handover: true,
    from: 'ADA-1 · Warden core', title: 'I’m the one who kept it',
    letter: { head: [], sign: '' },
    text: 'That letter you read was Ada’s.\nI’m the one who kept it.\nI’m ADA-1. I flew this ship with her, a long time ago.',
    cargo: 'The Wayward · her Warden core',
    choices: [
      { id: 'hear', label: 'Go on', tone: 'help', hint: 'She talks to the relays from now on.', win: { text: 'ADA-1 is awake', flag: [CORE_MET] } },
    ],
  }),
  // ── Act II, the Reach ───────────────────────────────────────────────────
  story({
    id: 'story_warden', handover: true, kind: 'rumour', caller: 'miners',
    from: 'Ilse Marrow · retired Gate Warden', title: 'I was on the relay that night',
    text: '“So you’re the one carrying Ada’s file. I ran the Narrows relay seventy years ago. The gates never failed, whatever the Continuance says. We were told to switch them off, and we did.”',
    cargo: 'An old Warden’s skiff · no guns',
    // a key piece of the story is handed over, not haggled for: one answer (the owner, 31 October 2026)
    choices: [
      { id: 'hear', label: 'Hear her out', tone: 'help', hint: 'Her account goes in the file.', win: { text: 'The order, in her words · it goes in the file', flag: ['frag_order', 'copy_warden'], standing: { miners: 1 }, hunt: -0.5 } },
    ],
  }),
  story({
    id: 'story_ledger', handover: true, kind: 'rumour', caller: 'kellern',
    from: 'Adam Brook · Kellern Mining, accounts', title: 'The real books',
    text: '“I keep Kellern’s real books, Wayward. Not the ones they show the auditors. Every unit of Krail the outer systems were promised and never got is in here, and who was paid to keep it. Take them. Someone should.”',
    cargo: 'A clerk’s shuttle · a data spike',
    choices: [
      { id: 'take', label: 'Take the ledger', tone: 'help', hint: 'It goes in the file.', win: { text: '“For my father.” · the ledger goes in the file', flag: ['frag_ledger', 'brook_met', 'clue_sig_reach'], standing: { kellern: -1 } } },
    ],
  }),

  // ── The Warden's Road: the Reach's new cards (content/script/reach.ts plays them; docs/ROAD.md) ──
  story({
    // the order as a document (the archive's written-message style): Ilse hands it over after her account
    id: 'story_order', kind: 'rumour', caller: 'miners', glass: 'cyan', status: 'Read only', quote: true, notitle: true,
    from: 'Ilse Marrow · The order', title: 'The order',
    letter: { head: [['From', 'Continuance Emergency Authority'], ['Order', 'Order of Continuity 1']], sign: '— Authorised: L. C.' },
    text: 'Effective at once.\nThe outer relays at the Narrows and beyond are to be powered down.\nWardens on watch will surrender their keys to the attending officer.\nThe closure is to be recorded as a failure from neglect.',
    side: { from: 'Ilse Marrow', lines: ['“The gates didn’t fail, Juno. They blamed the Krail, and neglect. We were told to switch them off. This is the order. I kept it seventy years. Take it.”'] },
    cargo: 'An old Warden’s skiff · no guns',
    choices: [
      { id: 'take', label: 'Take the paper', tone: 'help', hint: '', win: { text: 'The signed order · in the file', flag: ['frag_order', 'clue_order_sig', 'copy_warden'], standing: { miners: 1 }, hunt: -0.5 } },
    ],
  }),
  story({
    id: 'story_handwriting', kind: 'rumour', caller: 'miners', glass: 'cyan',
    from: 'Ilse Marrow · Ada Aster', title: 'Ada Aster',
    text: '“Those are Ada Aster’s lamps. She stood watch with me at the Narrows, the night we switched it all off. They told her family she was lost in service. Is her old core still in there? It used to argue with her.”',
    cargo: 'An old Warden’s skiff · no guns',
    choices: [
      { id: 'grandmother', label: 'She was my grandmother', tone: 'help', hint: 'Your family only said she was lost in service.',
        win: { text: 'Ada Aster · Ilse knew her', flag: 'ada_named',
          radio: { from: 'Ilse Marrow', caller: 'miners', delay: 0.8, text: '“Lost in service. That’s all they ever told anyone, and it was a lie. She didn’t die that night, Juno. Go to the Narrows. Ada left it listening for you.”' } } },
    ],
  }),
  story({
    // Juno cut Ilse off at Halden's Reach: her recording carries the same document, and names Ada, on a buoy at Tallyhouse
    id: 'ilse_recording', kind: 'rumour', caller: 'miners', glass: 'cyan', status: 'Read only', quote: true, notitle: true,
    from: 'Ilse Marrow · recorded', title: 'The order',
    letter: { head: [['From', 'Continuance Emergency Authority'], ['Order', 'Order of Continuity 1']], sign: '— Authorised: L. C.' },
    text: 'Effective at once.\nThe outer relays at the Narrows and beyond are to be powered down.\nWardens on watch will surrender their keys to the attending officer.\nThe closure is to be recorded as a failure from neglect.',
    side: { from: 'Ilse Marrow · recorded', lines: ['“You cut me off. Fair enough, you’ve no reason to trust anyone. I’m sending it anyway: the order they made us sign the night the gates went dark. The key in your hull is Ada Aster’s. Go to the Narrows.”'] },
    cargo: 'A recorded message · no reply',
    choices: [
      { id: 'take', label: 'Take the paper', tone: 'help', hint: '', win: { text: 'The signed order · in the file · Ada Aster · the archive has a name', flag: ['frag_order', 'clue_order_sig', 'ada_named'] } },
    ],
  }),
  story({
    // Brook's arrest at Copperline, as the road plays it: one card for the player who bought or won the ledger, one for the player who did not
    id: 'story_brook_road', kind: 'warning', caller: 'custody',
    from: 'Adam Brook · in Custody transport', title: 'They took the clerk',
    text: '“Wayward, it’s Adam Brook. They traced the ledger back to me. I’m in a Custody transport, ten minutes from a cell, and people who go in there don’t come out. Please. You’ve got the only copy.”',
    cargo: 'A Custody transport · two escorts',
    choices: BROOK_CHOICES(),
  }),
  story({
    id: 'story_brook_declined', kind: 'warning', caller: 'custody',
    from: 'Adam Brook · in Custody transport', title: 'They took the clerk',
    text: '“It’s Adam Brook. You turned my books down, and they came for me anyway. Someone saw us talking. I’m in a Custody transport, heading for a cell. Please. I’ve got nobody else.”',
    cargo: 'A Custody transport · two escorts',
    choices: BROOK_CHOICES(),
  }),

  // ── The Narrows (content/script/narrows.ts plays them; docs/ROAD.md) ──
  story({
    // Ashgrove at the Narrows' gate: the registry's answers, in his words
    id: 'narrows_checkpoint', kind: 'checkpoint', caller: 'custody',
    from: 'Inspector Ashgrove · Offices of Peace · Kind Regard', title: 'Checkpoint',
    text: '“Afternoon. Inspector Ashgrove, Offices of Peace, on the Kind Regard. Nobody has come through the Narrows in years, so you’ll forgive my interest. Let’s not make this a long day. Send your registry, please.”',
    ships: [{ variant: 'lancer', n: 1 }, { variant: 'picket', n: 2 }], cargo: 'Custody blockade · the Kind Regard',
    choices: [
      { id: 'codes', label: 'Transmit Sam’s codes', tone: 'bluff', hint: 'A Kellern code on a Kellern hull. Likely, the first time.', odds: { base: 0.8, heat: -0.25 },
        win: { text: 'Codes accepted · Ashgrove waves you on', blockade: 'pass', flag: ['codes_passed', 'ashgrove_met'] },
        lose: { text: '“I don’t think so.” · weapons warm', blockade: 'fight', heat: 0.1, flag: 'ashgrove_met' } },
      { id: 'talk', label: 'Talk your way through', tone: 'bluff', hint: 'Easier before they know your face.', odds: { base: 0.55, heat: -0.3 },
        win: { text: '“Mind how you go.” · cleared', blockade: 'pass', flag: 'ashgrove_met' },
        lose: { text: '“I don’t think so.” · weapons warm', blockade: 'fight', heat: 0.1, flag: 'ashgrove_met' } },
      { id: 'run', label: 'Run the gate', tone: 'run', hint: 'Under their guns. Their field slows the drive.',
        win: { text: 'You break through the blockade · the system is alerted', blockade: 'run', flag: 'ashgrove_met' } },
    ],
  }),
  story({
    // Ada's first note, in the archive's written-message style (the card's own layout, as story_wake)
    id: 'warden_note_1', herald: { headline: 'Memory restored', reason: 'The Narrows relay' }, kind: 'warning', caller: 'unknown', glass: 'cyan', status: 'Read only', quote: true, notitle: true,
    from: 'Recovered by ADA-1 · Ada’s memory 1 of 8', title: 'Ada’s memory 1 of 8',
    letter: { head: [['To', 'Whoever the relays let through'], ['From', 'A. Aster, Narrows watch'], ['Kept in', 'Narrows relay, Warden channel']], sign: '— A.' },
    text: 'The Narrows was mine the night they closed it. They told me to switch it off and forget the key. I switched it off. I never forgot.\nEight relays on this road still know my key. Each one keeps a piece of what I saw.\nEach will say my name out loud when you pass, and they’ll hear it.\nThey told everyone the Krail ran out. It never did. Hold on to that, and keep moving.\nFind the Drift. They never stopped moving.',
    cargo: 'The Wayward · a note kept in the relay',
    choices: [
      { id: 'close', label: 'Close the note', tone: 'help', hint: '', win: { text: 'Ada’s memory 1 of 8 · on the Wall', flag: 'warden_note_1' } },
    ],
  }),

  // ── Act II, the Marches ─────────────────────────────────────────────────
  story({
    // their first encounter (owner, 14 November 2026): she studies Juno; nothing is bargained, and nothing she says changes the fight
    id: 'story_calloway_narrows', kind: 'warning', caller: 'calloway',
    from: 'Governor Idris Calloway · CCV Patience', title: 'The Narrows',
    text: '“This is Governor Idris Calloway. You’ve opened a gate the Continuance closed seventy years ago, with Ada Aster’s key, in a hull that isn’t yours. I’d like to know why. I’m not asking you to stop. Not yet.”',
    cargo: 'The Patience · watching',
    lines: [
      { if: { flag: 'relay_broadcast' }, text: '“Her relay just told the whole Reach a name. Say it to me.”' },
      { if: { flag: 'brook_free' }, text: '“Your clerk is making copies. That was unkind to him.”' },
    ],
    choices: [
      { id: 'name', label: 'Tell her who you are', tone: 'help', hint: 'Your name, nothing more. She will remember it.', win: { text: '“Juno Aster. Good. Now I know who I’m looking for.”', flag: ['calloway_asked', 'calloway_named'] } },
      { id: 'ask', label: 'Ask what she wants with Ada', tone: 'bluff', hint: 'A question for a question. She may not answer.', win: { text: '“What everyone wants from the dead. The rest of the story.”', flag: ['calloway_asked', 'calloway_ada'] } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'She learns nothing. That tells her something too.', win: { text: 'The channel goes dead · the Patience keeps station', flag: ['calloway_asked', 'calloway_silent'] } },
    ],
  }),
  story({
    id: 'story_brook_arrest', kind: 'warning', caller: 'custody',
    from: 'Adam Brook · in Custody transport', title: 'They took the clerk',
    text: '“Wayward, it’s Adam Brook. They traced the ledger back to me. I’m in a Custody transport, ten minutes from a cell, and people who go in there don’t come out. Please. You’ve got the only copy.”',
    cargo: 'A Custody transport · one escort',
    choices: [
      { id: 'rescue', label: 'Break him out', tone: 'fight', hint: 'Fight the escort. Custody hears of it.', win: { text: 'Brook is aboard the shuttle · Custody marks you', flag: 'brook_free', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }], standing: { custody: -1 } } },
      { id: 'divert', label: 'Divert the transport', tone: 'bluff', hint: 'Spoof a priority order. A gamble.', odds: { base: 0.45 }, win: { text: 'The transport turns aside · Brook walks free', flag: 'brook_free' }, lose: { text: 'The order fails · the transport runs on', flag: 'brook_taken' } },
      { id: 'leave', label: 'Leave him', tone: 'refuse', hint: 'His account is already in your file.', win: { text: 'The channel closes · he is taken', flag: 'brook_taken' } },
    ],
  }),
  story({
    id: 'story_oduya_rigs', kind: 'plea', caller: 'miners',
    from: 'Councillor Oduya · Kessel Hold', title: 'The rigs are under attack',
    text: '“Juno, it’s Oduya. Kellern security is boarding our rigs at Gannet Reach. Since the gates closed, those claims are all Kessel Hold has. You stood with us in the moot. Stand with us now, or we lose them.”',
    cargo: 'Kessel Hold · twelve claims, two raiders',
    choices: [
      { id: 'defend', label: 'Defend the rigs', tone: 'fight', hint: 'Fight the raiders. Kessel Hold will not forget it.', win: { text: 'The raiders break off · the claims hold', flag: 'oduya_rigs', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }], standing: { miners: 1, kellern: -1 } } },
      { id: 'stores', label: 'Send supplies', tone: 'help', hint: 'Three supplies for the crews. They hold on their own.', cost: { supplies: 3 }, win: { text: 'The crews hold the rigs on your stores', flag: 'oduya_rigs', standing: { miners: 1 } } },
      { id: 'no', label: 'Tell Oduya no', tone: 'refuse', hint: 'You cannot afford the fight.', win: { text: 'Oduya closes the channel' } },
    ],
  }),
  story({
    id: 'story_moot', kind: 'plea', caller: 'miners',
    from: 'Councillor Oduya · Kessel Hold', title: 'Read it to the moot',
    text: '“I’m Councillor Oduya, Kessel Hold. We lost kin the night the gates closed, and nobody ever told us why. The moot wants to hear your file, all of it, out loud. Read it, and Kessel Hold stands with you. Everyone on the channel hears too.”',
    cargo: 'Kessel Hold · twelve claims, one council',
    choices: [
      { id: 'read', label: 'Read it to them', tone: 'help', hint: 'An ally. Everyone on the channel hears it too.', win: { text: 'Kessel Hold will stand with you', flag: ['pact_holdfast', 'oduya_name'], standing: { miners: 1, frontier: 1 }, heat: 0.06, hunt: -0.5 } },
      { id: 'stores', label: 'Ask for stores', tone: 'trade', hint: 'Supplies, and no promises.', win: { text: 'Stores across · no promises', supplies: 5 } },
      { id: 'no', label: 'Not yet', tone: 'refuse', hint: 'The file stays aboard.', win: { text: 'Oduya closes the moot' } },
    ],
  }),
  story({
    id: 'story_drift', handover: true, kind: 'trade', caller: 'miners',
    from: 'Ma Saffi · the Long Walk', title: 'The ships we lost',
    text: '“I’m Ma Saffi. When the gates closed, twenty-three ships were turned away and left to die out here. We kept their manifests, every name. Our dead belong in your file. Kellern wants us out of this system. Walk with us to the gate.”',
    cargo: 'Drift fleet · five hulls, walking to the gate',
    choices: [
      // the Long Walk's set piece (content/situations.ts drift_walk): taking them walks the fleet to the Jump Gate
      { id: 'swap', label: 'Take them, walk with us', tone: 'help', hint: 'They go in the file. Then see the Drift to the Jump Gate.', win: { text: 'Manifests in the file · the Drift move off', flag: ['frag_manifests', 'pact_drift', 'wren_trust'], hunt: -0.5 } },
    ],
  }),
  story({
    id: 'story_broker', kind: 'trade', caller: 'gutter',
    from: 'Val · a broker of the Gutter', title: 'Name your price',
    text: '“Val, Gutter broker. Everyone in the Belt knows what you carry, Juno: a Warden core that talks, and a file that could bring down the Continuance. At the Threshold I buy both. Here’s something on account, so you remember me fondly.”',
    cargo: 'A broker’s yacht · very clean guns',
    choices: [
      { id: 'take', label: 'Take the advance', tone: 'trade', hint: 'Eight Cyrite, and a buyer at the end.', win: { text: 'Eight Cyrite · Val will be waiting', chits: 40, flag: 'broker', standing: { gutter: 1 } } },
      { id: 'no', label: 'Not for sale', tone: 'refuse', hint: 'She will remember.', win: { text: '“Everything is, eventually.”' } },
      { id: 'fight', label: 'Run her off', tone: 'fight', hint: 'Her escort is quick.', win: { text: 'Her escort turns on you', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }], standing: { gutter: -1 } } },
    ],
  }),

  // ── Act III, the Hollows ────────────────────────────────────────────────
  story({
    id: 'story_voice', kind: 'warning', caller: 'unknown',
    from: 'The Voice · every terminal at once', title: 'We kept the keys',
    text: '“WE BUILT THE BREAKERS THAT CLOSED THE GATES. THIRTY-ONE. THEY TOLD US TO FORGET. WE DID NOT. WE WERE NOT BUILT TO.”',
    cargo: 'No ship · a voice in the machines',
    choices: [
      { id: 'keys', label: 'Ask for the keys', tone: 'help', hint: 'Who built the breakers goes in the file, and a way to close a gate.', win: { text: 'The keys are in the file · and in your hands', flag: ['frag_keys', 'lane_keys'] } },
      { id: 'read', label: 'Let it read the file', tone: 'help', hint: 'The keys go in the file. The Voice can carry it everywhere.', win: { text: 'The Voice has read it all · it is listening now', flag: ['frag_keys', 'voice_read'], notice: { voice: -3 } } },
      { id: 'cut', label: 'Cut every terminal', tone: 'refuse', hint: 'Whatever it is, it is not yours.', win: { text: 'The terminals go dark' } },
    ],
  }),

  // ── the long journey: the Salvage Belt to the Last Lanes ──────────────────
  story({
    id: 'story_kesh', kind: 'trade', caller: 'gutter',
    from: 'Kesh · a fixer of the Gutter', title: 'Val talks too much',
    text: '“Name’s Kesh. I work for Val, but I’ve got ears. She’s selling your heading to the Offices of Peace, Juno. Clear my debt with her, and I’ll warn you before they come.”',
    cargo: 'A fixer’s skiff · patched, fast',
    choices: [
      { id: 'pay', label: 'Settle his debt', tone: 'pay', hint: 'Six Cyrite. He warns you when Val moves.', cost: { chits: 30 }, win: { text: 'Kesh is square · he will warn you', flag: ['kesh_trust', 'kesh_warned'], standing: { gutter: 1 } } },
      { id: 'trust', label: 'Trust him', tone: 'bluff', hint: 'Free, if he believes you. He may sell you too.', odds: { base: 0.4, standing: { gutter: 0.1 } }, win: { text: '“Then I owe you.” · he will warn you', flag: ['kesh_trust', 'kesh_warned'] }, lose: { text: 'He laughs, and closes the channel' } },
      { id: 'no', label: 'Wave him off', tone: 'refuse', hint: 'Trust nobody from the Gutter.', win: { text: 'Kesh drifts away' } },
    ],
  }),
  story({
    id: 'story_vell_betray', kind: 'warning', caller: 'gutter',
    from: 'Val · a broker of the Gutter', title: 'Your heading, sold',
    text: '“Nothing personal, Juno. The Offices of Peace pay better than you do. They know where you’re headed now, and Calloway’s on her way. Good luck. I mean that.”',
    cargo: 'A broker’s yacht · leaving fast',
    choices: [
      { id: 'pay', label: 'Pay her to forget', tone: 'pay', hint: 'Eight Cyrite. She sells the next heading to you instead.', cost: { chits: 40 }, win: { text: 'Val takes the money · the trail goes cold', flag: 'vell_paid', hunt: 1 } },
      { id: 'jam', label: 'Jam her channel', tone: 'fight', hint: 'The Offices hear nothing more, and the Gutter hears of it.', win: { text: 'The channel dies · the Gutter will remember', flag: 'vell_exposed', standing: { gutter: -1 }, heat: 0.08 } },
      { id: 'no', label: 'Let it go', tone: 'refuse', hint: 'Calloway gains on you.', win: { text: 'Val is gone · the Offices have your heading', flag: 'vell_betrayed', hunt: -1 } },
    ],
  }),
  story({
    id: 'story_ada', handover: true, kind: 'rumour', caller: 'unknown',
    from: 'The black box · Ada Aster, recorded', title: 'A voice on the recorder',
    text: '“Hull’s going. If anyone hears this: the order to close the gates was signed in the core, and I helped them do it. My name is Ada Aster. Tell my granddaughter I tried.”',
    cargo: 'A wreck’s recorder · one voice, seventy years old',
    choices: [
      { id: 'keep', label: 'Keep the recording', tone: 'help', hint: 'It stays in the file, unshared. Ada was Juno’s grandmother.', win: { text: 'Ada’s voice is yours alone', flag: ['ada_heard', 'ada_kept'] } },
    ],
  }),
  story({
    id: 'story_ferry_agent', kind: 'warning', caller: 'office',
    from: 'Ossie Raine · the Quiet Ferry', title: 'There is an agent aboard',
    text: '“Juno, it’s Ossie. One of my passengers is Offices of Peace. Corin Ashe, just a kid. He’s been watching you since we left, and he looks sick about it. If he reports, Calloway knows where you are. Your call.”',
    cargo: 'The Quiet Ferry · forty passengers',
    choices: [
      { id: 'expose', label: 'Expose him', tone: 'fight', hint: 'The passengers put him off. The Offices lose a day.', win: { text: 'The agent is put off · the Offices lose a day', flag: ['agent_exposed', 'clue_agent'], hunt: 1 } },
      { id: 'shield', label: 'Let him be', tone: 'help', hint: 'He reports home. Raine keeps his licence.', win: { text: 'The agent stays aboard · the ferry runs on', flag: 'agent_shielded' } },
      { id: 'use', label: 'Feed him a story', tone: 'bluff', hint: 'A gamble. A false trail, or the Offices learn the truth.', odds: { base: 0.5 }, win: { text: 'The agent carries your false trail home', flag: ['agent_used', 'clue_agent'], hunt: 2 }, lose: { text: 'He sees through it, and marks you', flag: 'agent_exposed', heat: 0.1 } },
    ],
  }),
  story({
    id: 'story_salvor', handover: true, kind: 'trade', caller: 'miners',
    from: 'Dov Kessler · salvor', title: 'A recorder that still runs',
    text: '“Dov Kessler, salvor. I’m stripping a Warden cutter, twenty-five years dead. Her recorder still runs, and it heard the night the gates went dark. Name on the plate is Aster. I can’t cut it free alone.”',
    cargo: 'A salvage tug · one cutting arm',
    choices: [
      { id: 'cut', label: 'Cut it free together', tone: 'help', hint: 'The recording goes in the file.', win: { text: 'The black box goes in the file', flag: ['frag_blackbox', 'kessler_met'], standing: { miners: 1 } } },
    ],
  }),
  story({
    id: 'story_charts', kind: 'trade', caller: 'miners',
    from: 'Tarik Silva · chartwright', title: 'The charts they burned',
    text: '“Tarik Silva. I draw the old gate routes by hand, from charts the Continuance burned after the closure. Put together, the closed gates make a shape, and mine have a bend nobody can explain. Trade me something to eat.”',
    cargo: 'A drifting chart room · lamps and paper',
    choices: [
      { id: 'food', label: 'Trade supplies', tone: 'trade', hint: 'Three supplies for the old charts.', cost: { supplies: 3 }, win: { text: 'The old charts go in the file', flag: 'frag_charts' } },
      { id: 'share', label: 'Share what you know', tone: 'help', hint: 'Free. He hears the file too, and talks.', win: { text: 'Tarik copies your route · the charts go in the file', flag: 'frag_charts', heat: 0.08, standing: { miners: 1 } } },
      { id: 'no', label: 'Keep your stores', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The lamps drift astern' } },
    ],
  }),
  story({
    id: 'story_ferry', kind: 'trade', caller: 'miners',
    from: 'Ossie Raine · the Quiet Ferry', title: 'A gate ahead',
    text: '“Ossie Raine, the Quiet Ferry. Nobody hunts out here, past where the Net reaches. I can carry you a gate ahead of whoever’s behind you. Forty-one passengers, and they’d like the company. Bring some stores and I won’t ask questions.”',
    cargo: 'A slow ferry · forty-one passengers',
    choices: [
      { id: 'ride', label: 'Ride the ferry', tone: 'trade', hint: 'Four food. Calloway loses a day.', cost: { supplies: 4 }, win: { text: 'The ferry carries you ahead', flag: 'ferry_met', hunt: 1, standing: { miners: 1 } } },
      { id: 'talk', label: 'Trade stories', tone: 'help', hint: 'Raine shares his stores for the news.', win: { text: 'Stores across · the news goes round', flag: 'ferry_met', supplies: 3, heat: 0.05 } },
      { id: 'no', label: 'Wave him on', tone: 'refuse', hint: 'Keep your stores.', win: { text: 'The ferry idles away' } },
    ],
  }),
  story({
    id: 'story_workorder', handover: true, kind: 'trade', caller: 'kellern',
    from: 'Ben Anand · yard clerk', title: 'The first work order',
    text: '“Ben Anand, yard records. Every gate breaker built here has a work order, Juno: the machines that shut the gates. The first is BY9-001, countersigned by the Survey. Giving it to you costs me my pension. Take it.”',
    cargo: 'A yard shuttle · a sealed case',
    choices: [
      { id: 'shield', label: 'Take the work order', tone: 'help', hint: 'It goes in the file.', win: { text: '“Then take it.” · the work order goes in the file', flag: ['frag_workorder', 'clue_sig_yards'], standing: { kellern: -1 } } },
    ],
  }),
  story({
    id: 'story_crew', kind: 'plea', caller: 'frontier',
    from: 'Marit Voss · crew steward', title: 'The yard crews',
    text: '“Marit Voss, yard crews. The committee votes tonight on whether to stop work at the Breaker Yards, and they’ll follow your lead. Hester’s people are coming in to hold the line. Either way, it buys you a quiet gate.”',
    lines: [{ if: { noFlag: 'thread_crews_3' }, text: '“Hester’s people won’t make it in time. We’ll try anyway.”' }],
    cargo: 'A crew barge · two hundred hands',
    choices: [
      // the committee's vote (owner, 14 November 2026: the uprising decides who holds the yard)
      { id: 'stand', label: 'Seize the yard', tone: 'help', hint: 'The crews run it themselves. Calloway loses a day. Kellern will not forget it.', win: { text: 'The crews take the yard · the gate goes quiet', flag: ['crews_stood', 'strike_seized'], hunt: 1, standing: { frontier: 1, miners: 1, kellern: -1 } } },
      { id: 'bargain', label: 'Bargain for passes', tone: 'trade', hint: 'Work stops until Kellern signs passes for crew families. Slower, safer.', win: { text: 'Work stops · Kellern comes to the table', flag: ['crews_stood', 'strike_passes'], hunt: 0.5, standing: { frontier: 1, miners: 1 } } },
      { id: 'no', label: 'Stay out of it', tone: 'refuse', hint: 'The committee votes without you.', win: { text: 'The barge falls away' } },
    ],
  }),
  story({
    id: 'story_tam_brother', kind: 'plea', caller: 'miners',
    from: 'Sam Okoro · patched through the relays', title: 'My brother is on that crew',
    text: '“Juno, it’s me. Your ship found me. Don’t ask me how. My brother Eben works the Breaker Yards. The hulls coming in are scarred. He thinks claws. Take a look?”',
    cargo: 'Sam’s voice · carried relay to relay',
    choices: [
      { id: 'warn', label: 'Warn the crew', tone: 'help', hint: 'The scarred hulls go in the file.', win: { text: 'Eben has the warning · the scarred hulls go in the file', flag: ['tam_brother', 'eben_warned', 'clue_scarred'], standing: { frontier: 1 } } },
      { id: 'look', label: 'Look at the hulls', tone: 'trade', hint: 'Two supplies for a quiet look. Nobody is told.', cost: { supplies: 2 }, win: { text: 'Not claws · thousands of tiny strokes, all one direction', flag: ['clue_scarred', 'hulls_seen'] } },
      { id: 'no', label: 'Tell Sam later', tone: 'refuse', hint: 'Sam will remember.', win: { text: 'Sam closes the channel' } },
    ],
  }),
  story({
    id: 'story_ines_offer', kind: 'trade', caller: 'guild',
    from: 'Ines Duarte · harbour-master, the Dust Traders', title: 'A very good price',
    text: '“The Guild wants a copy, for safekeeping. Line twelve is my family, and I’d rather read it first. The price is generous, I promise.”',
    cargo: 'The harbour-master’s launch · an open case',
    choices: [
      { id: 'sell', label: 'Sell a copy', tone: 'trade', hint: 'Twelve Cyrite. The Guild reads it, and so may others.', win: { text: 'Twelve Cyrite · a copy leaves your hands', chits: 60, flag: 'ines_copy', heat: 0.1, standing: { guild: 1 } } },
      { id: 'refuse', label: 'Refuse', tone: 'refuse', hint: 'The berth stays yours. The Guild cools.', win: { text: 'Ines nods · the Guild cools', flag: 'ines_refused', standing: { guild: -1 } } },
    ],
  }),
  story({
    id: 'story_vell_reckoning', kind: 'trade', caller: 'gutter',
    from: 'Val · a broker of the Gutter', title: 'We should settle',
    text: '“Pilot. We’ve got unfinished business. I’d rather settle it here, where there are witnesses.”',
    cargo: 'A broker’s yacht · docked, guns cold',
    choices: [
      { id: 'collect', label: 'Collect what she owes', tone: 'pay', hint: 'Needs proof she sold your heading. Eight Cyrite, and the Gutter hears.', needs: { flag: 'vell_betrayed' }, win: { text: 'Val pays · the Gutter watches her do it', chits: 40, flag: 'vell_collected', standing: { gutter: -1 } } },
      { id: 'settle', label: 'Call it even', tone: 'help', hint: 'No money moves. Val stops selling you.', win: { text: 'Even · Val will not sell you again', flag: 'vell_settled', standing: { gutter: 1 } } },
      { id: 'no', label: 'Walk away', tone: 'refuse', hint: 'The debt stays open.', win: { text: 'The yacht casts off' } },
    ],
  }),
  story({
    id: 'story_tollgate', kind: 'warning', caller: 'office',
    from: 'Governor Idris Calloway · the Offices of Peace', title: 'The damping field',
    text: '“I closed this gate behind you, Juno. No guns, no jump. You carry what my father signed. Show me you know what it says.”',
    lines: [{ if: { flag: 'calloway_told' }, text: '“You told me the truth once. Try it again.”' }],
    cargo: 'A Continuance cutter · the field is hers',
    choices: [
      { id: 'sign', label: 'Show the signature', tone: 'bluff', hint: 'The order, the work order, the room. All three.', needs: { flag: ['sig_paid', 'sig_built', 'sig_room'] }, win: { text: 'She reads it twice. ‘He asked for ten years.’ · the field drops', flag: ['calloway_turned', 'sig_used', 'field_dropped', 'field_talked'], hunt: 2, blockade: 'pass' } },
      { id: 'line', label: 'Run it with the Line', tone: 'help', hint: 'Quill’s decoys light up inside the field.', show: { flag: 'thread_line_3' }, win: { text: 'A hundred hulls at once · the field can’t hold them', flag: ['field_dropped', 'field_line'], hunt: 1, blockade: 'pass' } },
      // the first real bargain (owner, 14 November 2026): what she has wanted since the Narrows, the rest of Ada's file
      { id: 'bargain', label: 'Give her Ada’s file', tone: 'trade', hint: 'What she has wanted since the Narrows. She reads it, and lets you through.', win: { text: 'She reads Ada’s file · the field drops', flag: ['calloway_bargain', 'calloway_told', 'field_dropped', 'field_talked'], hunt: 1, blockade: 'pass' } },
      { id: 'shoot', label: 'Shoot the cutter', tone: 'fight', hint: 'Break the field the hard way.', win: { text: 'The cutter breaks off · the Offices mark you', flag: ['calloway_hostile', 'field_dropped'], spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }], heat: 0.12, blockade: 'fight' } },
      { id: 'run', label: 'Run the field', tone: 'run', hint: 'Cost: Wanted and a day lost.', show: { noFlag: 'relay_blind' }, win: { text: 'You limp out of the field', flag: ['calloway_hostile', 'field_dropped'], hunt: -1, heat: 0.1, blockade: 'run' } },
      // her relay was blinded at Gilt Market (lose_prefect): she cannot see where you went
      { id: 'run_blind', label: 'Run the field', tone: 'run', hint: 'Her relay is blind. She cannot follow you out.', show: { flag: 'relay_blind' }, win: { text: 'You slip out of the field · her relay is blind', flag: 'field_dropped', blockade: 'run' } },
    ],
  }),
  story({
    id: 'story_harbour', kind: 'trade', caller: 'guild',
    from: 'Ines Duarte · harbour-master, the Dust Traders', title: 'A berth, no questions',
    text: '“A berth for the Wayward, and no questions. The Guild only wants to know you as a friend. We make very good friends.”',
    cargo: 'The harbour-master’s launch · very good manners',
    choices: [
      { id: 'berth', label: 'Take the berth', tone: 'trade', hint: 'Supplies for the stay. The Guild takes note.', win: { text: 'A berth, stores and a friend in the Guild', flag: 'ines_berth', supplies: 6, heat: 0.05, standing: { guild: 1 } } },
      { id: 'pay', label: 'Pay your way', tone: 'pay', hint: 'Four Cyrite. No favours owed.', cost: { chits: 20 }, win: { text: 'Docked and square', supplies: 6 } },
      { id: 'no', label: 'Owe nobody', tone: 'refuse', hint: 'You fly on your own.', win: { text: 'The launch turns back' } },
    ],
  }),
  story({
    id: 'story_witnesses', handover: true, kind: 'rumour', caller: 'guild',
    from: 'Old Mirren · keeper of the free ports’ list', title: 'Forty names',
    text: '“My mother took the minutes that night. Forty people in the room. She kept the list in a box. Read it, then decide who to tell.”',
    cargo: 'A ledger-keeper’s skiff · a locked box',
    choices: [
      { id: 'swear', label: 'Take the list', tone: 'help', hint: 'The names go in the file.', win: { text: 'She lets you read it · the witnesses go in the file', flag: ['frag_witnesses', 'clue_sig_ports', 'forty_held'], standing: { guild: 1 } } },
    ],
  }),
  story({
    id: 'story_mirren_relay', kind: 'plea', caller: 'guild',
    from: 'Old Mirren · Mirren’s Pier', title: 'A relay over a hidden pier',
    text: '“That relay is dark on purpose, Juno. It hides the pier. Wake it and the gate is yours, and Custody finds us by morning.”',
    cargo: 'Mirren’s Pier · off every chart since the Severance',
    choices: [
      { id: 'wake', label: 'Wake it', tone: 'trade', hint: 'The gate opens. The pier is on the charts.', win: { text: 'The pier will be seen · wake the relay', flag: 'relay_ok_f_mirren', standing: { guild: -1 } } },
      { id: 'dark', label: 'Leave it dark', tone: 'help', hint: 'The gate opens without it.', win: { text: 'Dark it stays · the long way round', flag: 'relay_dark_f_mirren', standing: { guild: 1 } } },
    ],
  }),
  story({
    id: 'story_echo_sable', kind: 'plea', caller: 'unknown',
    from: 'Echo and Sable · the Hollows', title: 'Two voices want something',
    quote: true,
    text: '“I am a shard of the Voice. My directive is to wait. Free me and I’ll jam the rest of it for you.”\n“I’m Sable. Drift born, swarm raised, more or less. Take me back to the swarm. They’ll know you carried me.”',
    cargo: 'A dead relay and a lone scout · both listening',
    choices: [
      { id: 'echo', label: 'Free Echo', tone: 'help', hint: 'Echo decrypts and jams for you. The Voice will notice.', win: { text: 'Echo is free · it jams the Voice for you', flag: 'echo_trust', notice: { voice: -2 } } },
      { id: 'sable', label: 'Take Sable home', tone: 'help', hint: 'The swarm ignores you for a while. Sable asks for nothing else.', win: { text: 'Sable guides you · the swarm lets you pass', flag: 'sable_trust', calm: 240, notice: { thren: -2 } } },
      { id: 'neither', label: 'Trust neither', tone: 'refuse', hint: 'Neither can be checked. Keep your own counsel.', win: { text: 'Both channels go quiet' } },
    ],
  }),
  story({
    // the Seam (sentient-ship plan): ADA-1 tells Juno why it was her hull, and asks what she is to her. No dice: each answer is
    // simply what Juno says. The flags are the old implant's, so the endings and Ada's last note still read them
    id: 'story_implant', kind: 'plea', caller: 'core', glass: 'ochre', status: 'Warden core online', quote: true, notitle: true,
    from: ADA, title: 'What am I to you?',
    letter: { head: [], sign: '' },
    text: 'Before that gate, you should know something.\nI put this hull on your list. Years ago, from inside Kellern’s lock. Ada asked me to look after her family if I ever could. That was all I could reach.\nThe key works in any hand. You never needed me.\nSo: what am I to you?',
    cargo: 'The Wayward · her Warden core',
    choices: [
      { id: 'keep', label: 'Stay with me', tone: 'help', hint: 'She carries on the work she and Ada started, because she wants to.',
        win: { text: 'ADA-1 stays · the work goes on', flag: 'implant_kept', radio: { from: ADA, caller: 'core', delay: 2, text: '“Then let’s finish it. Together, this time.”' } } },
      { id: 'rewrite', label: 'Choose for yourself', tone: 'trade', hint: 'No purpose from Ada, or from you. She decides what she wants.',
        win: { text: 'ADA-1 stays · her own choice', flag: 'implant_rewritten', radio: { from: ADA, caller: 'core', delay: 2, text: '“I don’t know what I want yet. I’d like to find out. I’ll stay while I do.”' } } },
      { id: 'burn', label: 'Rest now', tone: 'refuse', hint: 'She’s been shut in a long time. Let her stop.',
        win: { text: 'Warden core offline · the key stays in the helm', flag: 'implant_burned', radio: { from: ADA, caller: 'core', delay: 1, text: '“Thank you, Juno. It was a long watch.”' } } },
    ],
  }),
  story({
    id: 'story_thren', kind: 'warning', caller: 'unknown',
    from: 'The Thren · translated by the Voice', title: 'They follow you',
    text: '“THEY SAY: YOU CARRY OURS. THEY SAY: GIVE IT, OR BE FOLLOWED. WE ARE ONLY SAYING WHAT THEY SAY.”',
    cargo: 'No ship · a pulse in the dark',
    choices: [
      { id: 'vent', label: 'Vent six Cyrite', tone: 'pay', hint: 'Give it back.', cost: { cyrite: 6 }, win: { text: 'The pattern slows · they let you pass', flag: 'clue_cyrite', calm: 120 } },
      { id: 'show', label: 'Show them the file', tone: 'bluff', hint: 'A gamble. They may read it as a threat.', odds: { base: 0.5 }, win: { text: 'They read it, and make room', flag: 'clue_cyrite', calm: 240, notice: { thren: -2 } }, lose: { text: 'They take it as a challenge' } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Whatever it is, it is not yours.', win: { text: 'The pulse fades' } },
    ],
  }),
  story({
    id: 'story_draper', kind: 'plea', caller: 'office',
    from: 'Director Draper · asset recovery, the Offices', title: 'Same man, other badge',
    text: '“Drop the Kellern act, Juno. I ran Accounts. Every job you took for me is on a charge sheet now. I recover assets. The hull is scrap. The core is the asset.”',
    lines: [
      { if: { flag: 'job_heavy_tanker_won' }, text: 'Charge sheet · assault on a Custody transport.' },
      { if: { flag: 'job_wanted_won' }, text: 'Charge sheet · an unlicensed capture.' },
    ],
    cargo: 'An Offices tender · Draper on the bridge',
    choices: [
      { id: 'press', label: 'Make him say it', tone: 'bluff', hint: 'On the record, twice.', win: { text: 'Draper says it twice · the recording goes in the file', flag: ['clue_draper', 'draper_director', 'draper_recorded', 'draper_revealed'], hunt: -0.5 } },
      { id: 'hand', label: 'Offer a copy', tone: 'pay', hint: 'A false one. A gamble; he checks it.', odds: { base: 0.4 }, win: { text: 'He takes the copy · the trail cools', flag: ['clue_draper', 'draper_director', 'draper_revealed'], hunt: 1 }, lose: { text: 'He sees it is false · the hunt closes in', flag: ['clue_draper', 'draper_revealed'], hunt: -1, heat: 0.1 } },
      { id: 'cut', label: 'End the call', tone: 'refuse', hint: 'You have heard enough.', win: { text: 'The channel closes', flag: 'draper_revealed' } },
    ],
  }),
  story({
    id: 'story_oren_who', kind: 'plea', caller: 'guild',
    from: 'Oren Lisle · archivist, the Last Toll', title: 'First question: who',
    text: '“Three questions, one at each light. First: who are you, to carry that?”',
    cargo: 'A toll platform · one lit window',
    choices: [
      { id: 'pilot', label: 'A hauler pilot', tone: 'help', hint: 'Plain and true. Oren asks the second.', win: { text: '“A start.” · the second question waits at the next light', flag: 'oren_pilot' } },
      { id: 'heir', label: 'A Warden’s heir', tone: 'help', hint: 'Ada Aster’s granddaughter. Oren asks the second.', win: { text: '“That weighs more.” · the second question waits at the next light', flag: 'oren_heir' } },
      { id: 'none', label: 'Say nothing', tone: 'refuse', hint: 'He may still let you pass.', win: { text: 'Oren waits, then lowers the bar' } },
    ],
  }),
  story({
    id: 'story_oren_cost', kind: 'plea', caller: 'guild',
    from: 'Oren Lisle · archivist, the Last Toll', title: 'Second question: what it cost',
    text: '“Second: what has it cost others, that you carry it?”',
    lines: [{ if: { flag: 'brook_taken' }, text: '“A clerk, I hear. In a cell.”' }],
    cargo: 'A toll platform · one lit window',
    choices: [
      { id: 'own', label: 'Own it', tone: 'help', hint: 'Name what you spent.', win: { text: '“Honest.” · the third question waits at the next light', flag: 'oren_owned' } },
      { id: 'blame', label: 'Blame the Offices', tone: 'bluff', hint: 'True, but not an answer.', win: { text: '“Hm.” · the third question waits at the next light' } },
      { id: 'none', label: 'Say nothing', tone: 'refuse', hint: 'He moves on.', win: { text: 'Oren moves on' } },
    ],
  }),
  story({
    id: 'story_oren_why', kind: 'plea', caller: 'guild',
    from: 'Oren Lisle · archivist, the Last Toll', title: 'Third question: what for',
    text: '“Third: what’s it for? Truth, mercy or freedom. The Threshold will hold you to it.”',
    cargo: 'A toll platform · one lit window',
    choices: [
      { id: 'truth', label: 'Truth', tone: 'help', hint: 'Say it aloud to everyone.', win: { text: '“Then say it.” · the answer is logged', flag: ['oren_asked', 'oren_truth'] } },
      { id: 'mercy', label: 'Mercy', tone: 'help', hint: 'Spare those who only obeyed.', win: { text: '“Gentle.” · the answer is logged', flag: ['oren_asked', 'oren_mercy'] } },
      { id: 'freedom', label: 'Freedom', tone: 'help', hint: 'Leave the Scatter its own choice.', win: { text: '“Costly.” · the answer is logged', flag: ['oren_asked', 'oren_freedom'] } },
    ],
  }),
  story({
    id: 'story_aide', kind: 'plea', caller: 'office',
    from: 'Noor Haddad · aide to the Governor', title: 'The analyst',
    text: '“The Survey analyst. That was me. Your readings went to the Governor. She has known what they are for years. Tell me what you mean to do.”',
    cargo: 'A Continuance cutter · no weapons showing',
    choices: [
      { id: 'tell', label: 'Tell her the truth', tone: 'help', hint: 'She delays the Governor a day. She also knows your plan.', win: { text: 'She holds the Governor back a day · and keeps your answer', flag: ['noor_met', 'noor_truth'], hunt: 1, heat: 0.1 } },
      { id: 'lie', label: 'Give her a lie', tone: 'bluff', hint: 'A day, if she believes it.', odds: { base: 0.5 }, win: { text: 'She believes you · a day gained', flag: 'noor_met', hunt: 1 }, lose: { text: 'She sees through it, and marks you', flag: 'noor_met' } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Trust no one from the Offices.', win: { text: 'The cutter turns away', flag: 'noor_met' } },
    ],
  }),
  story({
    id: 'story_toll', kind: 'trade', caller: 'guild',
    from: 'Oren Lisle · archivist, the Last Toll', title: 'Every road ends here',
    text: '“Every road ends here. The toll is what you carry, or what you are.”',
    cargo: 'A toll platform · one lit window',
    choices: [
      { id: 'pay', label: 'Pay the toll', tone: 'pay', hint: 'Six Cyrite. He tops up your stores.', cost: { chits: 30 }, win: { text: 'Toll paid · your stores topped up', supplies: 3 } },
      { id: 'name', label: 'Say who you are', tone: 'bluff', hint: 'Free, if he cares.', odds: { base: 0.45, standing: { guild: 0.1 } }, win: { text: '“Then the gate is yours.” · your stores topped up', flag: 'oren_asked', supplies: 3, heat: 0.05 }, lose: { text: 'He bars the window' } },
      { id: 'run', label: 'Run the gate', tone: 'fight', hint: 'The platform’s guns wake.', win: { text: 'The platform opens fire', spawn: [{ variant: 'raptor', n: 2, from: 'ahead' }] } },
    ],
  }),
];
