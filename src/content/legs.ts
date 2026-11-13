import type { CardDef } from '../sim/comms';
import { offer } from './calloway';

// ── the road past the Reach: the arrivals' cards ──────────────────────────
// Ada's notes, two to seven, and the cards that hold the road's gates
// (docs/overhaul/SCRIPT_EN_DE.md §2). Each note is a written message in the
// archive's style, read a line at a time; its lead becomes the next leg's
// goal. The note at the Scrapgate is her voice on the relay, not a note. The
// scripts that play them are in content/script/arrivals.ts; the gates' cards
// are dealt by sim/journey.ts `gateCheck`.

const story = (c: Omit<CardDef, 'trigger' | 'repeat'>): CardDef => ({ trigger: 'story', ...c });

/** A Warden's note: the archive's frame, its lines, and the close that puts it on the Wall. Every shown line is written out, for the German. */
function note(n: number, w: { gist: string; from: string; title: string; kept: string; close: string }, lines: string[]): CardDef {
  return story({
    id: `warden_note_${n}`, gist: w.gist, kind: 'warning', caller: 'unknown', glass: 'cyan', status: 'Read only', quote: true, notitle: true,
    from: w.from, title: w.title,
    letter: { head: [['To', 'Whoever the relays let through'], ['From', 'A. Aster'], ['Kept in', w.kept]], sign: '— A.' },
    text: lines.join('\n'),
    cargo: 'The Wayward · a note kept in the relay',
    choices: [{ id: 'close', label: 'Close the note', tone: 'help', hint: '', win: { text: w.close, flag: `warden_note_${n}` } }],
  });
}

export const NOTE_CARDS: CardDef[] = [
  note(2, { gist: 'Ada’s second note · the lost ships', from: 'Ship database · Warden’s note 2 of 8', title: 'Warden’s note 2 of 8', kept: 'The Rift relay, Warden channel', close: 'Warden’s note 2 of 8 · on the Wall' }, [
    'Twenty-three ships were out past the Narrows that night. Control turned every one of them away and never said why.',
    'I logged them as they went. Hull, master, souls aboard. I never read the names out. I should have.',
    'The Drift did. They kept better books than me, and they kept them out loud.',
    'Listen to the wrecks. One of them is mine.',
  ]),
  story({
    // the Scrapgate: not a note but Ada's own voice on the relay, with its transcript
    id: 'warden_note_3', gist: 'Ada’s voice on the relay · the keys', kind: 'warning', caller: 'unknown', glass: 'cyan', status: 'Recording', quote: true, notitle: true,
    from: 'Recorded · Warden’s note 3 of 8', title: 'A voice on the relay',
    letter: { head: [['From', 'Ada Aster, recorded'], ['Kept in', 'The Scrapgate relay, Warden channel']], sign: '— Ada' },
    text: [
      '“This is Ada. I was the attending officer that night. The order said the Wardens surrender their keys to me, so they did.”',
      '“Ilse gave me hers and said, ‘Don’t lose it.’ I didn’t. I didn’t hand any of them in, either.”',
      '“Eight keys, one cutter, and nobody counting. If you’re hearing this, somebody finally counted.”',
      'Ask the Drift where the closures run.',
    ].join('\n'),
    cargo: 'The Wayward · a voice kept in the relay',
    choices: [{ id: 'close', label: 'Close the recording', tone: 'help', hint: '', win: { text: 'Warden’s note 3 of 8 · on the Wall', flag: 'warden_note_3' } }],
  }),
  note(4, { gist: 'Ada’s fourth note · the ring', from: 'Ship database · Warden’s note 4 of 8', title: 'Warden’s note 4 of 8', kept: 'The Slow Door relay, Warden channel', close: 'Warden’s note 4 of 8 · on the Wall' }, [
    'Put every closed relay on one chart and you get a circle. I drew it on the back of a ration card, in a Drift galley.',
    'It isn’t a border. It’s a fence, and we’re on the wrong side of it.',
    'They were never keeping us in. They were keeping something out, and we were the cheapest wall going.',
    'Find who built the fence. The yards remember.',
  ]),
  note(5, { gist: 'Ada’s fifth note · the list, and a confession', from: 'Ship database · Warden’s note 5 of 8', title: 'Warden’s note 5 of 8', kept: 'The Breaker relay, Warden channel', close: 'Warden’s note 5 of 8 · on the Wall' }, [
    'Thirty-one breakers, built at Yard Nine. Signed for by Kellern, the Guild and the Offices of Peace.',
    'The Survey Office sent the engineer, and it wasn’t a person. You’ll meet it.',
    'Now the part I’ve been putting off. The readings that made the case for closing the lanes were mine.',
    'I carried them into that room myself.',
    'Find the room. The free ports kept the names.',
  ]),
  note(6, { gist: 'Ada’s sixth note · the room', from: 'Ship database · Warden’s note 6 of 8', title: 'Warden’s note 6 of 8', kept: 'The Tollgate relay, Warden channel', close: 'Warden’s note 6 of 8 · on the Wall' }, [
    'Forty people in the room. Two Wardens, Halvard Brook and me. I gave the readings.',
    'Lucan Calloway asked for ten years and a public warning. The board said a warning would crash Krail overnight.',
    'He said, “Then I’ll sign it, and you’ll fund the ships.” They never funded the ships.',
    'I watched him sign and said nothing. I’ve been saying it to relays ever since.',
    'Go where the lanes began. Ask what’s waiting there.',
  ]),
  note(7, { gist: 'Ada’s seventh note · what the lanes are', from: 'Ship database · Warden’s note 7 of 8', title: 'Warden’s note 7 of 8', kept: 'The Seam relay, Warden channel', close: 'Warden’s note 7 of 8 · on the Wall' }, [
    'The lanes aren’t ours. We found them and hung lamps on them. Cyrite is what the Thren leave behind, like coral on a reef.',
    'We burn it to cross their home, and they come for it, the way you’d come for your own bones.',
    'The Voice was built to talk to them. My key is one of three that tell it what to say. I never used it. I was scared of the answer.',
    'The Threshold. The last relay.',
  ]),

  // ── the gates' cards ─────────────────────────────────────────────────────
  story({
    // Ashgrove's checkpoint, at the Rift: he locked the Narrows gate and watched it go dark; this time he asks first
    id: 'rift_checkpoint', gist: 'Ashgrove holds the gate', kind: 'checkpoint', caller: 'custody',
    from: 'Inspector Ashgrove · Offices of Peace · Kind Regard', title: 'Checkpoint, again',
    text: '“Good afternoon. Ashgrove, Kind Regard. You left the Narrows in a hurry. Send your registry, please.”',
    ships: [{ variant: 'lancer', n: 1 }, { variant: 'picket', n: 2 }], cargo: 'Custody blockade · the Kind Regard',
    choices: [
      { id: 'codes', label: 'Transmit Sam’s codes', tone: 'bluff', hint: 'A Kellern code on a Kellern hull. He saw the Narrows, though.', odds: { base: 0.6, heat: -0.25 },
        win: { text: 'Codes accepted · Ashgrove waves you on', blockade: 'pass', flag: 'codes_passed' },
        lose: { text: '“I did warn you.” · weapons warm', blockade: 'fight', heat: 0.1, flag: 'ashgrove_crossed' } },
      { id: 'talk', label: 'Talk your way through', tone: 'bluff', hint: 'He knows your hull from the Narrows. Harder.', odds: { base: 0.4, heat: -0.3 },
        win: { text: '“Mind how you go.” · cleared', blockade: 'pass' },
        lose: { text: '“Not today.” · weapons warm', blockade: 'fight', heat: 0.1, flag: 'ashgrove_crossed' } },
      { id: 'run', label: 'Run the gate', tone: 'run', hint: 'Under their guns. Their field slows the drive.',
        win: { text: 'You break through the blockade · the system is alerted', blockade: 'run', flag: 'ashgrove_crossed' } },
    ],
  }),
  story({
    // the Scrapgate, if Val sold your heading and was not paid to forget it
    id: 'scrapgate_pickets', gist: 'Val sold your heading · pickets wait', kind: 'checkpoint', caller: 'office',
    from: 'Offices of Peace · picket line', title: 'Pickets at the gate',
    text: '“Hauler Wayward. Your heading was paid for. Cut your drive and stand by to be boarded.”',
    lines: [{ if: { flag: 'kesh_warned' }, text: 'Kesh warned you: three pickets, port side, engines cold.' }],
    ships: [{ variant: 'picket', n: 3 }], cargo: 'Three Offices pickets · engines cold',
    choices: [
      { id: 'flank', label: 'Go round them', tone: 'bluff', hint: 'Kesh told you where they sit. Slip by on the far side.', show: { flag: 'kesh_warned' }, odds: { base: 0.8 },
        win: { text: 'Past them before their engines warm', blockade: 'pass' },
        lose: { text: 'They warm faster than Kesh said', blockade: 'fight' } },
      { id: 'run', label: 'Run the gate', tone: 'run', hint: 'Under their guns. Their field slows the drive.', win: { text: 'You break for the gate · they give chase', blockade: 'run' } },
      { id: 'fight', label: 'Fight through', tone: 'fight', hint: 'Three pickets. The Offices hear of it.', win: { text: 'Weapons hot · you take on the pickets', blockade: 'fight' } },
    ],
  }),
  story({
    // the Breaker, if the strike did not hold: the cranes are armed
    id: 'breaker_lockdown', gist: 'Yard lockdown · the cranes are armed', kind: 'checkpoint', caller: 'custody',
    from: 'Custody yard control · the Breaker', title: 'Yard lockdown',
    text: '“All traffic, the yard is locked. Custody cranes are armed. Any hull at the gate is a target.”',
    ships: [{ variant: 'lancer', n: 1 }, { variant: 'picket', n: 2 }], cargo: 'Custody cranes · armed',
    choices: [
      { id: 'fight', label: 'Fight through', tone: 'fight', hint: 'The cranes and their escort. Nobody is on strike to help.', win: { text: 'Weapons hot · you fight for the gate', blockade: 'fight' } },
      { id: 'run', label: 'Run the gate', tone: 'run', hint: 'Under the cranes. Their field slows the drive.', win: { text: 'You break for the gate under the cranes', blockade: 'run' } },
    ],
  }),
  story({
    // the Seam: the Voice is the relay, and it asks for Ada's key
    id: 'seam_voice', gist: 'The Voice asks for Ada’s key', kind: 'warning', caller: 'unknown',
    from: 'The Voice · every terminal at once', title: 'WE WERE TOLD TO WAIT',
    text: '“ADA ASTER’S KEY. WE WERE TOLD TO WAIT FOR IT. WE WAITED. GIVE IT AND WE WILL SAY WHAT YOU SAY. TO THEM.”',
    cargo: 'No ship · the relay itself',
    choices: [
      { id: 'give', label: 'Give it the key', tone: 'help', hint: 'It will speak for you.', win: { text: '“THANK YOU. NOBODY SAYS THAT TO US.” · the key is in its hands', flag: ['seam_key_given', 'lane_keys'] } },
      { id: 'ask', label: 'Ask what it would say', tone: 'bluff', hint: 'It only says what it is told.', win: { text: '“WHATEVER YOU SAY. THAT IS THE PROBLEM.”', flag: 'seam_asked' } },
      { id: 'keep', label: 'Keep the key', tone: 'refuse', hint: 'Ada never used it either.', win: { text: '“WE WILL WAIT. WE ARE GOOD AT IT.”', flag: 'seam_key_kept' } },
    ],
  }),
];

/** Ada's last note, before the endings: to Juno by name if the routine learned it, to whoever flies her if it was burned. */
export const NOTE_8 = {
  title: 'Warden’s note 8 of 8',
  kept: {
    sign: '— Gran',
    lines: [
      'Juno. The routine knows your name now, so I can finally use it. I put this hull at the top of your list. I’m sorry.',
      'There was nobody else I’d trust with it, and I’d never even met you. You were two in the last picture I saw.',
      'Whatever you do at that gate, do it because you chose to. I’ve had enough of people signing things for other people.',
      'Keep moving if you want. Stop if you want.',
    ],
  },
  burned: {
    sign: '— A.',
    lines: [
      'To whoever flies her. I hoped the routine would have learned your name by now. It hasn’t, so you must have stopped it. That’s your right.',
      'Whatever you do at that gate, do it because you chose to. I’ve had enough of people signing things for other people.',
    ],
  },
} as const;

/**
 * Calloway's two offers that only the road makes (docs/overhaul/BEAT_MAP.md §3): what she wants to know about the motes, at the
 * Yards landfall after the Slow Door, and her last offer before the Threshold. The other road offers are `offer_meet` and
 * `offer_identity` (content/calloway.ts).
 */
export const ROAD_OFFERS: CardDef[] = [
  offer({
    id: 'offer_see', gist: 'Calloway asks about the motes', from: 'Governor Idris Calloway · Offices of Peace', title: 'What did you see?',
    text: '“At the Slow Door, something gathered on the gate. Tell me what it did. Exactly. I’ll pay in days.”',
    choices: [
      { id: 'tell', label: 'Tell her', tone: 'help', hint: 'She gets your readings. You get a day.', win: { text: 'She listens without interrupting · a day gained', flag: 'calloway_curious', hunt: 1 } },
      { id: 'ask', label: 'Ask why she wants to know', tone: 'bluff', hint: 'Ask her a question back.', win: { text: '‘Because I have seen it before.’ · she closes the channel', flag: 'calloway_seen_before' } },
      { id: 'refuse', label: 'Cut the channel', tone: 'refuse', hint: 'What you saw is yours.', win: { text: '“Then we both guess.”' } },
    ],
  }),
  offer({
    id: 'offer_stop', gist: 'Calloway offers to meet alone', from: 'Governor Idris Calloway · Offices of Peace', title: 'Stop, and I stop',
    text: '“One system from the end. Power down and I’ll meet you alone. No Draper. I’m offering because I’m afraid of him too.”',
    choices: [
      { id: 'accept', label: 'Power down', tone: 'help', hint: 'Her fleet holds back. Fire on her ships and she will know.', win: { text: 'She comes alone · her fleet holds back a day', flag: 'calloway_alone', hunt: 1, notice: { custody: -6, office: -6 } } },
      { id: 'refuse', label: 'Keep flying', tone: 'refuse', hint: 'Nothing changes before the Threshold.', win: { text: '“Then at the Threshold, Juno.”' } },
    ],
  }),
];
