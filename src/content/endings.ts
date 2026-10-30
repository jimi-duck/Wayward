import type { ShipSystem } from './modules';
import type { Standing } from '../sim/comms';
import type { Faction } from '../sim/enemies';

// ── the endings ───────────────────────────────────────────────────────────
// At the Threshold the chase stops being about escape, and you decide what
// the Severance file is worth. Six answers, as data: each is opened by what
// the journey built (standing, the ship's systems, flags from the cards,
// how the hunt went), and each has an epilogue. sim/endings.ts reads the
// journey against these rows; the Threshold panel shows every ending, the
// open ones to choose and the shut ones with what they still need.
//
// An ending opens if any one of its `ways` is met. A way is met when all of
// its parts are. Vanish has an empty way: it is always open.
//
// Epilogue lines with an `if` show only when it is met, so the same ending
// reads differently for a gunship that beat Calloway twice and a quiet
// hauler that talked its way through.

export type EndingId = 'broadcast' | 'unite' | 'sell' | 'trade' | 'seal' | 'vanish';

/** The Scatter's own people: the standings that count as friends for Unite. */
export const SCATTER: readonly Standing[] = ['miners', 'frontier', 'guild', 'gutter'];
/** Standing at which someone counts as a friend. */
export const FRIEND = 2;

/** One way to open an ending, or a condition on an epilogue line. Every part given must hold. */
export interface Need {
  /** Standing with each at least this much. */
  standing?: Partial<Record<Standing, number>>;
  /** Friends (standing FRIEND or more) among the Scatter's people, at least. */
  friends?: number;
  /** Marks fitted in each ship system, at least. */
  marks?: Partial<Record<ShipSystem, number>>;
  /** Any one of these flags set on the cards. */
  flags?: string[];
  /** Every one of these flags set. */
  allFlags?: string[];
  /** Any one of these modules fitted. */
  module?: string[];
  /** None of these factions at the hunters tier or above. */
  calm?: Faction[];
  /** Calloway beaten at least this many times. */
  beaten?: number;
  /** Chits aboard, at least. */
  chits?: number;
  /** Pieces of the Severance's history in the file (content/story.ts), at least. */
  fragments?: number;
  /** Wrecks survived, at least / at most. */
  wrecksMin?: number;
  wrecksMax?: number;
  hardcore?: boolean;
}

export interface EndingDef {
  id: EndingId;
  name: string;
  /** One line: what the choice is. */
  pitch: string;
  /** What opens it, in words, for the panel while it is shut. */
  needs: string;
  ways: Need[];
  /** The Archive's entry for the file, once this ending is reached. */
  file: string;
  epilogue: Array<{ if?: Need; text: string }>;
  /**
   * The road's epilogue (docs/overhaul/SCRIPT_EN_DE.md §12): an opener, then at most one line of each slot in this order, the
   * thread payoff, a person and a cost, then Oren's third answer and the closing line, always shown.
   */
  road: { open: string; lines: Array<{ slot: 'thread' | 'person' | 'cost'; if?: Need; text: string }>; close: string };
}

/** Oren's third question, answered on the road: one line shared by every ending. */
export const OREN_LINES: Array<{ flag: string; text: string }> = [
  { flag: 'oren_truth', text: 'You said it was for the truth. Oren writes that down.' },
  { flag: 'oren_mercy', text: 'You said mercy. Oren says that is the hardest one to keep.' },
  { flag: 'oren_freedom', text: 'You said freedom. Oren asks whose.' },
];

export const ENDINGS: EndingDef[] = [
  {
    id: 'broadcast', name: 'Broadcast', pitch: 'Send it everywhere. Let everyone decide.',
    needs: 'Needs: Signals 2 or the long-range array, Office frequencies and Calloway listening, the whole file, or the Voice.',
    ways: [
      { marks: { signals: 2 } }, { module: ['md_array'] }, { allFlags: ['freqs', 'calloway_told'] }, { flags: ['freqs'], marks: { signals: 1 } },
      { fragments: 4 }, { flags: ['voice_read'] }, { flags: ['copy_warden'], marks: { signals: 1 } },
    ],
    file: 'SEVERANCE · the broadcast copy',
    road: {
      open: 'The file goes out on every band the relays still know, all eight in a row, in Ada’s key.',
      lines: [
        { slot: 'thread', if: { flags: ['field_line', 'thread_line_5'] }, text: 'It doesn’t leave on one ship. Quill and a hundred hulls carry copies into the core.' },
        { slot: 'person', if: { flags: ['frag_blackbox', 'ada_heard'] }, text: 'Ada’s voice goes first. “My name is Ada. I helped.”' },
        { slot: 'person', if: { flags: ['copy_warden'] }, text: 'Ilse Marrow reads the order aloud at Halden’s Reach. She stops twice. Not from age.' },
        { slot: 'person', if: { flags: ['brook_free'] }, text: 'Adam Brook reads Kellern’s real books on air, grandfather’s name and all.' },
        { slot: 'cost', text: 'Within a month the Scatter demands its lanes back. Somewhere past the ring, a relay lights without a key.' },
      ],
      close: 'Everyone knows. That was the easy part.',
    },
    epilogue: [
      { text: 'The Wayward’s array points down the old lane. The file goes out on every band.' },
      { text: 'For a day nothing happens. Then the core worlds start asking where seventy years of Krail went.' },
      { if: { fragments: 4 }, text: 'It goes out whole: order, ledger, manifests, keys. Nobody can call it a forgery.' },
      { if: { allFlags: ['frag_blackbox', 'frag_charts', 'frag_workorder', 'frag_witnesses'] }, text: 'And behind it, the rest: the black box, the charts, the work order, the witnesses.' },
      { if: { flags: ['copy_warden'] }, text: 'Ilse Marrow reads the order aloud on the Narrows relay, where she first heard it.' },
      { if: { flags: ['voice_read'] }, text: 'The Voice carries it into every terminal that still listens.' },
      { if: { flags: ['calloway_told'] }, text: 'Idris Calloway quits on an open channel. She reads the file aloud first.' },
      { if: { calm: ['office'] }, text: 'The Offices of Peace call it a forgery, then stop calling it anything.' },
      { if: { flags: ['ada_heard'] }, text: 'Ada Aster’s own voice opens the broadcast. Seventy years late, she is heard.' },
      { if: { flags: ['sig_used'] }, text: 'Deputy Governor Lior Calloway’s signature is on the first page. His daughter does not deny it.' },
      { if: { flags: ['brook_free'] }, text: 'Adam Brook walks free and reads Kellern’s real books on air.' },
      { if: { flags: ['oren_truth'] }, text: 'You said you wanted the truth heard. It is, on every band at once.' },
      { text: 'The lanes stay dark. But now everyone knows who turned them off.' },
    ],
  },
  {
    id: 'unite', name: 'Unite', pitch: 'Bring the Scatter together for the first time in seventy years.',
    needs: 'Needs: friends (standing 2) with two of miners, Frontier, Guild, Gutter. Or one, plus Contacts 2 or an ally. Or Kessel Hold and the Long Walk.',
    ways: [{ friends: 2 }, { friends: 1, marks: { contacts: 2 } }, { allFlags: ['pact_holdfast', 'pact_drift'] }, { friends: 1, flags: ['pact_holdfast', 'pact_drift'] }],
    file: 'SEVERANCE · the copy read at the Threshold moot',
    road: {
      open: 'Kessel Hold calls the first moot with more than one Holdfast in it.',
      lines: [
        { slot: 'thread', if: { flags: ['thread_crews_3'] }, text: 'Hester’s crews come with their strike fund and their own list. Your name is on it.' },
        { slot: 'person', if: { flags: ['pact_drift', 'wren_trust'] }, text: 'The Long Walk turns its fleet toward the meeting. Wren flies point. Ma Saffi reads the list first.' },
        { slot: 'cost', if: { flags: ['job_missing_payroll_won', 'job_drift_cache_won', 'job_heavy_tanker_won'] }, text: 'Not everyone comes. Some remember the wages, the cache, the wreck. A union built on a debt is still in debt.' },
      ],
      close: 'Divided on purpose. Together by choice. For now.',
    },
    epilogue: [
      { text: 'Word goes out from the Threshold, and for once the Scatter comes when called.' },
      { if: { flags: ['pact_holdfast'] }, text: 'Kessel Hold opens its yards first, as Councillor Oduya promised.' },
      { if: { flags: ['pact_drift'] }, text: 'The Long Walk brings the Drift, and reads the names of the ships they lost.' },
      { if: { standing: { miners: 2 } }, text: 'The miners bring their cutters. Kellern’s yards go quiet for the first time in seventy years.' },
      { if: { standing: { gutter: 2 } }, text: 'The Gutter sends ships, and an invoice. Both arrive.' },
      { if: { standing: { guild: 2 } }, text: 'The Guild keeps the books. Nobody starves that winter.' },
      { if: { flags: ['passengers'] }, text: 'The Okafor family speak first at the moot. They were there; they say so.' },
      { if: { flags: ['oduya_rigs'] }, text: 'The rigs you defended send their crews. Oduya counts them aloud.' },
      { if: { flags: ['wren_trust'] }, text: 'Wren Saffi navigates the Drift in. She knows every ship on the list.' },
      { if: { flags: ['tam_brother'] }, text: 'Sam Okoro and his brother bring the Breaker crews. The yards go quiet.' },
      { if: { flags: ['oren_freedom'] }, text: 'You told Oren it was freedom. The Scatter votes, and the vote is its own.' },
      { text: 'The Continuance sends a fleet to the Threshold. It finds the lane held.' },
    ],
  },
  {
    id: 'sell', name: 'Sell', pitch: 'To the top bidder. Get rich enough to disappear.',
    needs: 'Needs: standing 2 with Guild or Gutter, a Gutter friend, Gutter names fitted, or Val’s advance.',
    ways: [{ standing: { guild: 2 } }, { standing: { gutter: 2 } }, { flags: ['gutter_friend', 'broker'] }, { module: ['md_names'] }],
    file: 'SEVERANCE · a receipt, and nothing else',
    road: {
      open: 'Val pays in full, in public, and smiles like she means it.',
      lines: [
        { slot: 'person', if: { flags: ['draper_revealed', 'broker'] }, text: 'Three days later the file turns up in Draper’s hands. It turns out Val has a buyer too.' },
        { slot: 'cost', text: 'The truth is an asset now. It comes out when it is useful, and stays in when it isn’t.' },
      ],
      close: 'You are free. That was the deal.',
    },
    epilogue: [
      { text: 'The auction takes four hours. The file goes for more Krail than Kellern Mining cut in a decade.' },
      { if: { standing: { gutter: 2 } }, text: 'The Gutter win it. A month later there are new lanes on their charts, with tolls.' },
      { if: { standing: { guild: 2 } }, text: 'The Guild win it, and sit on it. Leverage keeps better than truth.' },
      { if: { flags: ['broker'] }, text: 'Val pays what she said she would, to the Cyrite. That is the frightening part.' },
      { if: { flags: ['owes_runner'] }, text: 'Tallow takes the favour you owed out of the money. It is a large favour.' },
      { if: { flags: ['ines_copy'] }, text: 'Ines Duarte already holds a copy. She bids last, and wins nothing.' },
      { if: { flags: ['vell_betrayed'] }, text: 'Val pays on time. She also tells the Offices where you went.' },
      { if: { flags: ['kesh_trust'] }, text: 'Kesh clears the Gutter’s watchers before you leave. He asks for nothing.' },
      { text: 'The Wayward gets new plates and a new name. Nobody asks where you went.' },
    ],
  },
  {
    id: 'trade', name: 'Trade', pitch: 'Give it to Calloway for amnesty, a name, and a way home.',
    needs: 'Needs: Calloway told the truth, Draper given time, or Custody standing, and the Offices not hunting you. Or Calloway turned.',
    ways: [{ flags: ['calloway_told', 'stalled'], calm: ['office'] }, { standing: { custody: 1 }, calm: ['office'] }, { flags: ['calloway_turned'] }],
    file: 'SEVERANCE · a receipt stamped by the Offices of Peace',
    road: {
      open: 'Calloway publishes a version. It is shorter than yours, and more honest than anything before it.',
      lines: [
        { slot: 'thread', if: { flags: ['draper_recorded', 'stalled'] }, text: 'Director Draper is reassigned to a desk with no accounts on it.' },
        { slot: 'person', if: { flags: ['sig_used'] }, text: 'It says her father asked for ten years. It does not say how many he got.' },
        { slot: 'cost', text: 'The lanes stay closed. The contracts are rewritten. Kellern’s rates drop by a third. People notice.' },
      ],
      close: 'Your new registry has your real name on it.',
    },
    epilogue: [
      { text: 'Calloway meets you at the Threshold with a pardon already signed. She does not look at the file.' },
      { if: { flags: ['draper_director'] }, text: 'Director Draper signs the pardon too, through his teeth. He did say it twice.' },
      { if: { flags: ['stalled'] }, text: 'Foreman Draper writes that you were coerced, as he said he would. It is almost true.' },
      { if: { beaten: 1 }, text: 'Her ship still carries the scars you gave it. She mentions them once.' },
      { if: { flags: ['passengers', 'pod'] }, text: 'You get your helpers on the amnesty too. They agree.' },
      { if: { flags: ['calloway_turned'] }, text: 'Calloway signs the pardon herself, and the page beneath it. Her father’s name is struck out.' },
      { if: { flags: ['calloway_hostile'] }, text: 'Calloway signs, and does not forgive the cutter you shot. The pardon has conditions.' },
      { if: { flags: ['oren_mercy'] }, text: 'You asked for mercy for those who obeyed. The pardon names forty of them.' },
      { text: 'You go home to Cerro under another name. The lanes stay dark. You try not to think about it.' },
    ],
  },
  {
    id: 'seal', name: 'Seal', pitch: 'Close the lanes for good. The Scatter stays free, and alone.',
    needs: 'Needs: Guns or Rig 3, Guns and Rig 2, Calloway beaten and Guns 1, or the Voice’s keys.',
    ways: [{ marks: { guns: 3 } }, { marks: { rig: 3 } }, { marks: { guns: 2, rig: 2 } }, { beaten: 1, marks: { guns: 1 } }, { flags: ['lane_keys'] }],
    file: 'SEVERANCE · burned; this is what was left',
    road: {
      open: 'You give the Voice one instruction. It says thank you, and then it says it to them.',
      lines: [
        { slot: 'thread', if: { flags: ['thread_survey_3', 'survey_map'] }, text: 'Beyond the ring, the motes stop gathering. The lanes go quiet in a way they haven’t been for seventy years.' },
        { slot: 'person', if: { flags: ['sable_trust'] }, text: 'Sable stays in the lane. She sends one pattern back. It might mean goodbye.' },
        { slot: 'cost', text: 'Nobody will cross again. Not the core’s pickets. Not the Ferry. Not anybody’s granddaughter.' },
      ],
      close: 'You decided for everyone. Somebody had to. That is what they said, too.',
    },
    epilogue: [
      { if: { flags: ['lane_keys'] }, text: 'The Voice turns the keys it kept for seventy years. It does not say why.' },
      { text: 'The Threshold lane takes all the charges in the hold and most of the Wayward’s paint.' },
      { text: 'When the light fades, the lane is gone, and the file too. Nobody comes through from the core again.' },
      { if: { marks: { rig: 2 } }, text: 'The charges were cut from Kellern ore. It seemed fitting.' },
      { if: { beaten: 2 }, text: 'Calloway watches from the far side, and does not follow.' },
      { if: { flags: ['ada_kept'] }, text: 'You keep Ada’s recording, and seal the lanes she could not.' },
      { if: { flags: ['sable_trust'] }, text: 'Sable’s swarm holds the far lane open until the charges go.' },
      { text: 'The Scatter stays the Scatter: poor, cut off, and nobody’s.' },
    ],
  },
  {
    id: 'vanish', name: 'Vanish', pitch: 'Take the Wayward off the charts. Let someone else decide.',
    needs: 'Always open.',
    ways: [{}],
    file: 'SEVERANCE · a copy left in a dead drop',
    road: {
      open: 'You turn the transponder off and leave it off.',
      lines: [
        { slot: 'person', if: { flags: ['implant_burned'] }, text: 'The helm is yours alone. Nobody, living or otherwise, knows your name.' },
        { slot: 'person', if: { flags: ['implant_kept', 'implant_rewritten'] }, text: 'Some nights the routine opens a note you haven’t read. You don’t read it yet.' },
        { slot: 'cost', text: 'The file is still aboard. Calloway keeps looking. So does Draper. One day someone else will need it.' },
      ],
      close: 'Keep moving.',
    },
    epilogue: [
      { text: 'You leave a copy in a dead drop and point the Wayward at the dark.' },
      { if: { wrecksMin: 2 }, text: 'She has been wrecked twice and patched three times. She holds.' },
      { if: { flags: ['pod'] }, text: 'You left the Ares Drive survivor at the last port. They’ll tell it their way.' },
      { if: { hardcore: true }, text: 'One life, one ship, all the way through.' },
      { if: { fragments: 1 }, text: 'You keep what you pieced together. Someone should remember how it happened.' },
      { if: { flags: ['implant_burned'] }, text: 'You burn the implant before you go. Nothing of Ada’s routine is left to find you.' },
      { if: { flags: ['implant_kept'] }, text: 'You keep the implant. Ada’s routine rides with you into the dark.' },
      { if: { flags: ['implant_rewritten'] }, text: 'You rewrite the implant. It now answers only to you.' },
      { text: 'Someone will find the file, someday. It will be their choice then.' },
    ],
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<EndingId, EndingDef>;
