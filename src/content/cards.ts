import type { CardDef } from '../sim/comms';
import { CALLOWAY_FACE, OFFERS } from './calloway';
import { REGISTRY_CARD, STORY_CARDS } from './story';
import { SCENE_CARDS } from './situationCards';

// ── comms cards ───────────────────────────────────────────────────────────
// Everyone who opens a channel to the Wayward in the home system. A card is
// data: who calls, when, what they say, what is really going on, and what
// each answer does (see sim/comms.ts for the vocabulary). Cards are written
// to combine: a rumour sets a flag a checkpoint reads, a favour comes back as
// a follow-up, a full hold changes what a shakedown wants, and standing won
// with one crew opens a choice on another's card.
//
// Heat is the Custody's attention (0 to 1; the pursuit reads it). Chits are
// the port's money: ore sells for 2, a refit costs 60.

/** Flags a choice can need, in words. */
export const FLAGS: Record<string, string> = {
  codes: 'forged registry codes',
  codes_passed: 'a registration that has passed a scan',
  fee_known: 'word that the lane captain takes fees',
  freqs: 'the Office frequency list',
  forger_known: 'a name at Frontier Supply',
  news: 'fresh news of the lanes',
  gutter_friend: 'a friend in the Gutter',
  clue_sig_reach: 'the initials on the authorisation',
  clue_sig_yards: 'the Governor’s cipher',
  clue_sig_ports: 'Lior Calloway’s signature',
  vell_betrayed: 'proof Val sold your heading',
};

export const CARDS: CardDef[] = [
  // ── the checkpoint: the Jump Gate ──────────────────────────────────────
  {
    id: 'checkpoint', kind: 'checkpoint', caller: 'custody', trigger: 'lane',
    from: 'Custody blockade · Jump Gate', title: 'Your ship does not match its registry',
    text: '“Hauler, your transponder says Obedience Heavy. The ship in front of me doesn’t. Hold position for inspection.”',
    lines: [
      { if: { heatMin: 0.7 }, text: 'Your ship is flagged across the system.' },
      { if: { heatMax: 0.3 }, text: 'She sounds bored. She has not been told who you are yet.' },
      { if: { flag: 'passengers' }, text: 'The family in your hold will be exposed if she scans the ship.' },
      { if: { flag: 'codes' }, text: 'Your forged registration codes are ready.' },
      { if: { flag: 'fee_known' }, text: 'You heard she can be handled.' },
      { if: { notice: ['custody', 'toll'] }, text: 'There is already a surcharge on your record.' },
    ],
    ships: [{ variant: 'lancer', n: 1 }, { variant: 'picket', n: 2 }], cargo: 'Custody blockade cutter, full magazines',
    // three ways through, three kinds of risk: fly, hack or bluff. A fight is what a failed run or scan turns into, not a button.
    choices: [
      {
        id: 'run', label: 'Run the checkpoint', tone: 'run', hint: 'Break for the jump gate before they can lock you down.',
        risk: 'High risk · pursuit likely',
        win: { text: 'You break through the blockade · the system is alerted', blockade: 'run' },
      },
      {
        id: 'spoof', label: 'Spoof the transponder', tone: 'bluff', hint: 'Send a false registry and hope their first scan accepts it.',
        show: { flag: 'codes' }, odds: { base: 0.8, heat: -0.25, flags: { codes_bad: -0.6, freqs: 0.1 } },
        risk: 'Forged credentials · scan may fail',
        win: { text: 'The registration matches · she lets you through', blockade: 'pass', heat: -0.1, flag: 'codes_passed' },
        lose: { text: 'The codes are flagged · she opens fire', blockade: 'fight', heat: 0.1 },
      },
      {
        id: 'rig', label: 'Spoof the transponder', tone: 'bluff', hint: 'Use supplies to build a false registry and hope their first scan accepts it.',
        show: { noFlag: 'codes' }, cost: { supplies: 5 }, odds: { base: 0.45, heat: -0.3, flags: { freqs: 0.2 }, fitted: { ut_scanner: 0.1, tech_custody: 0.3 } },
        risk: 'Technical gamble · scan may fail',
        win: { text: 'The false registration holds · you reach the lane', blockade: 'pass' },
        lose: { text: 'The false registration fails · she opens fire', blockade: 'fight', heat: 0.1 },
      },
      {
        id: 'talk', label: 'Talk your way through', tone: 'bluff', hint: 'Claim you are an authorised hauler returning to the inner lane. Keep her talking.',
        odds: { base: 0.6, heat: -0.55, standing: { custody: 0.12 }, flags: { passengers: -0.15, calloway_lied: -0.1, fee_known: 0.1 } },
        risk: 'Bluff · inspection risk',
        win: { text: 'She believes you · the lane is clear', blockade: 'pass' },
        lose: { text: '“Nice try, Wayward.” · she opens fire', blockade: 'fight', heat: 0.05 },
      },
    ],
  },

  // ── the port's approach ─────────────────────────────────────────────────
  {
    id: 'port_check', kind: 'checkpoint', caller: 'frontier', trigger: 'port', when: { kind: 'home' },
    from: 'Frontier Supply · dock control', title: 'Scan required before docking',
    text: '“New order from the moon, hauler. Every ship must be scanned before we open the docking clamps.” The dockmaster clearly dislikes the rule.',
    lines: [
      { if: { heatMin: 0.5 }, text: 'A Custody notice on the dock board shows your ship.' },
      { if: { standing: ['frontier', 1] }, text: '“You helped us before. Perhaps the scanner has a fault today.”' },
    ],
    cargo: 'Fuel dock · two tugs · one scanner', fee: { base: 20, heat: 30 },
    truths: [
      { id: 'sympathetic', weight: 1.4, read: 'Dockside chatter: nobody here wants the new rule.', boost: { if: { standing: ['frontier', 1] }, mult: 3 } },
      { id: 'informer', weight: 1, read: 'The dockmaster reports directly to the moon.' },
    ],
    choices: [
      {
        id: 'scan', label: 'Allow the scan', tone: 'bluff', hint: 'If the dockmaster looks the other way, you may get through without trouble.',
        loseIf: ['informer'],
        win: { text: 'The scanner has a fault today · docking clamps engage' },
        lose: { text: 'The scan is logged and sent to the moon', heat: 0.15 },
      },
      {
        id: 'bribe', label: 'Pay to disable the scanner', tone: 'pay', hint: 'Pay the dockmaster to take the scanner offline.',
        cost: { chits: 'fee' },
        win: { text: 'Payment accepted · the scanner goes into maintenance', standing: { frontier: 1 } },
      },
      {
        id: 'spoof', label: 'Send forged codes', tone: 'bluff', hint: 'Give the scanner a registration it will accept.',
        needs: { flag: 'codes' }, odds: { base: 0.85, flags: { codes_bad: -0.6 } },
        win: { text: 'Codes accepted · welcome to Frontier Supply' },
        lose: { text: 'The codes fail · the scan is sent to the moon', heat: 0.15 },
      },
      {
        id: 'refuse', label: 'Refuse the scan', tone: 'refuse', hint: 'Dock without permission and accept the consequences.',
        win: { text: 'You dock without a scan · the complaint reaches the moon', heat: 0.08, standing: { frontier: -1 } },
      },
    ],
  },

  // ── trade ───────────────────────────────────────────────────────────────
  {
    id: 'krail_seller', kind: 'trade', caller: 'miners', when: { after: 60, short: true }, weight: 1.2, repeat: true,
    from: 'Independent prospector · Old Hesketh', title: 'A quick deal on Cyrite',
    text: '“Eight Cyrite, fresh from the vein. Pay for four now and I will ask no questions.” Your tank is {short} short of the jump.',
    ships: [], cargo: 'Prospector’s tug · a few crates',
    truths: [
      { id: 'pure', weight: 2, read: 'Spectral scan: pure violet Cyrite, full grade.' },
      { id: 'cut', weight: 1, read: 'Spectral scan: half the shipment is coloured slag.' },
    ],
    choices: [
      {
        id: 'chits', label: 'Pay for eight Cyrite', tone: 'pay', hint: 'Pay for four now and receive eight, if the shipment is pure.', cost: { cyrite: 4 }, loseIf: ['cut'],
        win: { text: 'Eight Cyrite added to your hold', cyrite: 8, standing: { miners: 1 } },
        lose: { text: 'Half the shipment is slag · only four Cyrite usable', cyrite: 4 },
      },
      { id: 'no', label: 'Decline the deal', tone: 'refuse', hint: 'Keep your resources and mine your own.', win: { text: 'Hesketh ends the call' } },
    ],
  },
  {
    id: 'ares_tender', kind: 'trade', caller: 'frontier', when: { after: 90, chits: 45 }, repeat: true,
    from: 'Ares Drive · service tender', title: 'Supplies or an instant repair',
    text: '“Ares Drive, spares and service. Nine Cyrite buys six supplies, or eight Cyrite covers a hull plate right now.”',
    lines: [{ if: { hurt: true }, text: 'Your hull has two breaches. The tender crew can see the damage.' }],
    ships: [{ variant: 'freighter', n: 1 }], cargo: 'Service tender · spares racks',
    choices: [
      { id: 'parts', label: 'Buy 6 supplies · 9 Cyrite', tone: 'trade', hint: 'Use supplies to repair hull damage when you are safe.', cost: { chits: 45 }, win: { text: '6 supplies added to your hold', supplies: 6 } },
      { id: 'patch', label: 'Repair one hull plate', tone: 'pay', hint: 'Pay 8 Cyrite for an immediate repair.', show: { hurt: true }, cost: { chits: 40 }, win: { text: 'Ares Drive repairs one hull plate', plates: 1 } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Keep your resources for later.', win: { text: 'The service tender moves on' } },
    ],
  },
  {
    id: 'fuel_runner', kind: 'trade', caller: 'gutter', when: { after: 120, short: true, heatMin: 0.2 }, repeat: true,
    from: 'Fuel runner · call sign Tallow', title: 'Cyrite at a price',
    text: '“Heard a hauler is running dry. I can get you six Cyrite: pay two supplies now, or owe me a favour. Your call, Wayward.”',
    lines: [{ if: { flag: 'gutter_friend' }, text: '“A friend of a friend. I will give you a fair deal.”' }],
    cargo: 'Runner’s skiff · tanks sloshing',
    choices: [
      { id: 'pay', label: 'Pay 2 supplies', tone: 'pay', hint: 'Pay now and settle the deal here.', cost: { supplies: 2 }, win: { text: '6 Cyrite added to your hold', cyrite: 6 } },
      {
        id: 'favour', label: 'Owe Tallow a favour', tone: 'help', hint: 'Get the Cyrite now; Tallow will call in the favour later.',
        win: { text: '6 Cyrite added · Tallow will contact you', cyrite: 6, flag: 'owes_runner', follow: { card: 'runner_favour', after: 60 } },
      },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Find Cyrite elsewhere.', win: { text: 'Tallow laughs and ends the call' } },
    ],
  },
  {
    id: 'forger', kind: 'trade', caller: 'unknown', when: { flag: 'forger_known', noFlag: 'codes' }, weight: 3,
    from: 'A name at Frontier Supply', title: 'Forged codes for sale',
    text: '“Registry codes from a hauler the company wrote off. They should pass a lane scan, but I would not bet my ship on them. Eight Cyrite.”',
    cargo: 'A data spike, warm from somebody’s pocket',
    truths: [
      { id: 'real', weight: 3, read: 'The checksum matches an Obedience-class registry.' },
      { id: 'fake', weight: 1, read: 'The checksum has been patched by hand.' },
    ],
    choices: [
      {
        id: 'buy', label: 'Buy the codes', tone: 'pay', hint: 'These codes make a transponder spoof more likely to work.', cost: { chits: 40 }, loseIf: ['fake'],
        win: { text: 'Forged registration codes loaded', flag: 'codes' },
        lose: { text: 'Codes loaded · something does not match', flag: ['codes', 'codes_bad'] },
      },
      { id: 'no', label: 'Not now', tone: 'refuse', hint: 'Save your Cyrite.', win: { text: 'The contact goes quiet' } },
    ],
  },

  // ── pleas ───────────────────────────────────────────────────────────────
  {
    id: 'stowaways', kind: 'plea', caller: 'miners', when: { kind: 'home', after: 30, heatMax: 0.6 }, weight: 1.2,
    from: 'Shift worker · Kellern habitat 4', title: 'A family needs a way out',
    text: '“You are the one who took the hauler. Everyone knows. I have two children and a work quota I will never meet. Please get us out.”',
    cargo: 'A tug with three people in it',
    choices: [
      {
        id: 'take', label: 'Take the family aboard', tone: 'help', hint: 'Hide them in your hold and get them through the lane. Custody will look for them.',
        win: { text: 'Three passengers aboard · your hold grows warmer', flag: 'passengers', standing: { miners: 2 }, heat: 0.05, follow: { card: 'custody_demand', after: 50 }, job: { id: 'passengers', text: 'Get the family through the jump lane', at: 'lane', pay: { text: 'The family made it through the lane', score: 3000, standing: { miners: 1 }, unflag: 'passengers' } } },
      },
      { id: 'no', label: 'Refuse', tone: 'refuse', hint: 'You have enough risks on board already.', win: { text: 'The tug turns back to the habitat' } },
    ],
  },
  {
    id: 'foreman', kind: 'plea', caller: 'kellern', when: { kind: 'home', after: 70 },
    from: 'Kellern Mining · Foreman Draper', title: 'Bring the Wayward back',
    text: '“Bring the hauler back and I will say you were coerced. You will lose wages and get a warning. Keep running, and Custody takes over.”',
    lines: [{ if: { flag: 'passengers' }, text: '“Bring the Okafor family back too.”' }],
    cargo: 'Mining office channel',
    choices: [
      { id: 'stall', label: 'Ask for more time', tone: 'bluff', hint: 'Tell him you are considering it. He may pause the search for a while.', win: { text: 'Draper pauses the search · for now', heat: -0.12, flag: 'stalled', follow: { card: 'foreman_again', after: 70 } } },
      { id: 'tell', label: 'Tell him about the archive', tone: 'help', hint: 'Tell him what you found and see whether he will help.', win: { text: 'Draper falls silent', standing: { miners: 1, kellern: -1 }, heat: 0.08 } },
      { id: 'cut', label: 'End the call', tone: 'refuse', hint: 'You have nothing more to say.', win: { text: 'Channel closed' } },
    ],
  },
  {
    id: 'hungry_crew', kind: 'plea', caller: 'gutter', when: { after: 50, cyrite: 4 }, repeat: true,
    from: 'Gutter crew · the Leaky Tin', title: 'A crew running out of power',
    text: '“Our reactor is dying, and so are we. Three Cyrite would get us to the belt. Help us and we will remember it.”',
    ships: [{ variant: 'scout', n: 2 }], cargo: 'Two fighters running on fumes',
    truths: [
      { id: 'genuine', weight: 2, read: 'Their reactor is almost cold.' },
      { id: 'bait', weight: 1, read: 'Their reactors are hot · they are waiting for you to slow down' },
    ],
    choices: [
      {
        id: 'give', label: 'Give them 3 Cyrite', tone: 'help', hint: 'Help them now and gain goodwill with the Gutter.', cost: { cyrite: 3 }, loseIf: ['bait'],
        win: { text: 'The Leaky Tin limps away · the Gutter remembers your help', standing: { gutter: 2 }, flag: 'gutter_friend' },
        lose: { text: 'They take the Cyrite, then turn their guns on you', spawn: [{ variant: 'scout', n: 2, from: 'ahead' }] },
      },
      {
        id: 'shop', label: 'Repair their recycler', tone: 'help', hint: 'Use 2 supplies instead of giving away Cyrite.', needs: { fitted: 'md_shop' }, cost: { supplies: 2 }, loseIf: ['bait'],
        win: { text: 'Recycler repaired · you gain a Gutter contact', standing: { gutter: 2 }, flag: 'gutter_friend' },
        lose: { text: 'It was a trap · they rush you', spawn: [{ variant: 'scout', n: 2, from: 'ahead' }] },
      },
      { id: 'no', label: 'Keep your Cyrite', tone: 'refuse', hint: 'Keep it for the bay.', win: { text: 'The Leaky Tin drifts away' } },
      { id: 'fight', label: 'Attack them', tone: 'fight', hint: 'They are outmatched; you may recover their cargo.', win: { text: 'Weapons hot against the Leaky Tin', spawn: [{ variant: 'scout', n: 2, from: 'ahead' }], standing: { gutter: -1 } } },
    ],
  },
  {
    id: 'pod', kind: 'plea', caller: 'miners', when: { after: 100 }, repeat: true,
    from: 'Life pod · automatic', title: 'An injured survivor',
    text: 'A life pod tumbles out of the dust, its beacon repeating the same message: one injured survivor aboard, with an Ares Drive tag on the hatch.',
    cargo: 'One person, one tag',
    choices: [
      { id: 'take', label: 'Bring the pod aboard', tone: 'help', hint: 'Rescue the survivor; you will need to care for them.', win: { text: 'Life pod aboard · survivor stabilised', flag: 'pod', follow: { card: 'pod_thanks', after: 45 } } },
      { id: 'strip', label: 'Salvage the pod', tone: 'trade', hint: 'Strip the useful parts and leave the survivor behind.', win: { text: 'Pod salvaged · 4 supplies recovered', supplies: 4, standing: { miners: -1 } } },
      { id: 'leave', label: 'Leave the pod', tone: 'refuse', hint: 'Move on and hope another ship finds them.', win: { text: 'The beacon fades behind you' } },
    ],
  },

  // ── jobs ────────────────────────────────────────────────────────────────
  {
    id: 'haul_job', kind: 'job', caller: 'frontier', when: { kind: 'home', after: 35 }, weight: 1.2,
    from: 'Frontier Supply · stores', title: 'A crate to deliver',
    text: '“Our ship is grounded, but this crate has to reach the next dock. Carry it and we will pay sixty, plus our goodwill.”',
    cargo: 'Fuel dock stores · running low',
    choices: [
      { id: 'take', label: 'Accept delivery job', tone: 'help', hint: 'Deliver the sealed crate to the next dock for 60 and improved standing.', win: { text: 'Job accepted · deliver the crate to the next dock', job: { id: 'haul', text: 'Deliver the sealed crate to the next dock', at: 'port', pay: { text: 'Crate delivered · payment received', chits: 60, standing: { frontier: 1 } } } } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Keep your time and cargo space free.', win: { text: 'The stores desk closes the offer' } },
    ],
  },
  {
    id: 'salvage_job', kind: 'job', caller: 'frontier', when: { after: 80 }, repeat: true,
    from: 'Ares Drive · salvage desk', title: 'Deliver salvaged supplies',
    text: '“Custody wrecks carry useful supplies. Bring six to our dock and we pay seventy. We do not ask where you got them.”',
    cargo: 'Salvage desk',
    choices: [
      { id: 'take', label: 'Accept delivery job', tone: 'help', hint: 'Deliver 6 supplies to Ares Drive for 70. You will need 14 Cyrite to acquire them.', win: { text: 'Job accepted · deliver 6 supplies to Ares Drive', job: { id: 'salvage', text: 'Deliver 6 supplies to Ares Drive', at: 'port', give: { supplies: 6 }, pay: { text: 'Supplies delivered · payment received', chits: 70, standing: { frontier: 1 } } } } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'You may need those supplies to repair your own hull.', win: { text: 'The salvage desk closes the offer' } },
    ],
  },
  {
    id: 'courier', kind: 'job', caller: 'guild', when: { after: 55 }, repeat: true,
    from: 'Dust Traders Guild · courier', title: 'Deliver a sealed case',
    text: '“Take this case to the far side of the lane. Do not open it. Eight Cyrite now, the rest when you arrive.”',
    cargo: 'A case, sealed, heavier than it looks',
    truths: [
      { id: 'clean', weight: 3, read: 'The case gives off no signal on any band.' },
      { id: 'tracker', weight: 2, read: 'The case is emitting a faint Custody tracking signal.' },
    ],
    choices: [
      {
        id: 'take', label: 'Take the delivery', tone: 'help', hint: 'Receive 8 Cyrite now and the rest after you cross the lane.', loseIf: ['tracker'],
        win: { text: 'Case loaded · 8 Cyrite received', cyrite: 8, flag: 'case', job: { id: 'case', text: 'Deliver the sealed case through the lane', at: 'lane', pay: { text: 'Case delivered · the Guild pays the balance', score: 2500, standing: { guild: 2 }, unflag: 'case' } } },
        lose: { text: 'Case loaded · 8 Cyrite received', cyrite: 8, flag: 'case', follow: { card: 'tracker_found', after: 30 }, job: { id: 'case', text: 'Deliver the sealed case through the lane', at: 'lane', pay: { text: 'Case delivered · the Guild pays the balance', score: 2500, standing: { guild: 2 }, unflag: 'case' } } },
      },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Do not take responsibility for the case.', win: { text: 'The Guild finds another courier' } },
    ],
  },
  {
    id: 'decoy', kind: 'job', caller: 'gutter', when: { kind: 'home', after: 140, heatMax: 0.75 },
    from: 'Gutter fixer · Mags', title: 'Draw the patrol away',
    text: '“We need to slip past the moon. Turn your transponder on and draw the patrols away. We will pay ten Cyrite.”',
    lines: [{ if: { flag: 'gutter_friend' }, text: '“The Leaky Tin says you can be trusted.”' }],
    cargo: 'Fixer’s channel',
    choices: [
      { id: 'take', label: 'Act as the decoy', tone: 'help', hint: 'Earn 10 Cyrite, but every nearby patrol will know your position.', win: { text: 'Transponder on · 10 Cyrite promised · patrols closing in', cyrite: 10, heat: 0.18, standing: { gutter: 1 } } },
      { id: 'no', label: 'Stay hidden', tone: 'refuse', hint: 'Refuse to draw the patrols toward you.', win: { text: 'Mags shrugs and ends the call' } },
    ],
  },

  // ── warnings ────────────────────────────────────────────────────────────
  {
    id: 'sweep_warning', kind: 'warning', caller: 'miners', when: { kind: 'home', after: 45, heatMin: 0.15 },
    from: 'An old shift partner', title: 'A patrol sweep is coming',
    text: '“Juno, it is Sol. A Custody sweep is coming from the moon. I can send you their patrol pattern for a little something.”',
    cargo: 'A private channel',
    truths: [
      { id: 'true', weight: 3, read: 'Sol’s channel is secure.' },
      { id: 'plant', weight: 1, read: 'Sol’s signal is routed through an Offices of Peace relay.' },
    ],
    choices: [
      {
        id: 'pay', label: 'Buy the patrol pattern', tone: 'pay', hint: 'Pay 3 Cyrite to find a gap in the sweep.', cost: { chits: 15 }, loseIf: ['plant'],
        win: { text: 'Patrol pattern loaded · you slip past the sweep', heat: -0.15, standing: { miners: 1 } },
        lose: { text: 'The pattern was a trap · the patrol knew where to find you', heat: 0.12 },
      },
      {
        id: 'ask', label: 'Ask Sol for a favour', tone: 'bluff', hint: 'Sol owes you, but may not risk helping again.', loseIf: ['plant'], odds: { base: 0.5, standing: { miners: 0.15 } },
        win: { text: 'Sol sends the pattern anyway · you slip past the sweep', heat: -0.15 },
        lose: { text: 'Sol goes silent', heat: 0 },
      },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Take your chances against the sweep.', win: { text: 'Channel closed' } },
    ],
  },
  {
    id: 'office_watch', kind: 'warning', caller: 'unknown', when: { after: 110, noFlag: 'freqs' },
    from: 'A scrambled voice', title: 'The Offices are listening',
    text: '“The Offices monitor every channel near the Jump Gate. I can sell you the frequencies they use. Four Cyrite.”',
    cargo: 'A scrambled channel',
    truths: [
      { id: 'real', weight: 3, read: 'The signal comes from the port’s own antenna.' },
      { id: 'scam', weight: 1, read: 'The voice is a recording playing on a loop.' },
    ],
    choices: [
      {
        id: 'buy', label: 'Buy the frequencies', tone: 'pay', hint: 'Use the frequencies to make a bluff at the lane more convincing.', cost: { chits: 20 }, loseIf: ['scam'],
        win: { text: 'Office frequencies loaded', flag: 'freqs' },
        lose: { text: 'The list is useless · 4 Cyrite wasted' },
      },
      { id: 'no', label: 'Ignore the offer', tone: 'refuse', hint: 'Do not risk paying for bad information.', win: { text: 'The voice cuts out' } },
    ],
  },
  {
    id: 'calloway', kind: 'warning', caller: 'calloway', when: { after: 150 }, weight: 2, face: CALLOWAY_FACE,
    from: 'Governor Idris Calloway · Offices of Peace', title: 'Come home, Juno',
    text: '“Juno, Idris Calloway. I am not your enemy. That archive is not worth your life. Tell me where you are going.”',
    lines: [
      { if: { flag: 'passengers' }, text: '“And the Okafors. They have children, Juno.”' },
      { if: { heatMin: 0.7 }, text: '“That is a lot of noise for someone trying to disappear.”' },
    ],
    cargo: 'A Governor’s channel · priority override',
    choices: [
      { id: 'lie', label: 'Give her a false heading', tone: 'bluff', hint: 'Send her toward the wrong lane.', odds: { base: 0.5, heat: -0.3, learn: 'lie' }, win: { text: 'Calloway redirects her search', heat: -0.15, hunt: 1, flag: 'calloway_lied' }, lose: { text: '“You were always a poor liar.”', heat: 0.1, hunt: -0.5, flag: 'calloway_lied' } },
      { id: 'answer', label: 'Tell her the truth', tone: 'help', hint: 'Tell her what you found in the archive and see how she responds.', win: { text: 'A long silence on the channel', heat: 0.05, score: 500, flag: 'calloway_told' } },
      { id: 'silence', label: 'Stay silent', tone: 'refuse', hint: 'She is using the call to locate you.', win: { text: 'You end the call before she can locate you', heat: 0.03 } },
    ],
  },

  // ── shakedowns ──────────────────────────────────────────────────────────
  {
    id: 'gutter_toll', kind: 'shakedown', caller: 'gutter', when: { after: 75 }, weight: 1.3, repeat: true,
    from: 'Raiders · the Hollow Saints', title: 'Cyrite or your hull',
    text: '“Nice hauler. Four Cyrite and you keep it.”',
    lines: [
      { if: { flag: 'gutter_friend' }, text: 'Their leader hesitates: the Leaky Tin vouched for you.' },
    ],
    ships: [{ variant: 'raptor', n: 2 }, { variant: 'scout', n: 1 }], cargo: 'Raiders · empty holds, full guns',
    choices: [
      { id: 'pay', label: 'Pay four Cyrite', tone: 'pay', hint: 'Cheap, if you have it.', cost: { cyrite: 4 }, win: { text: 'The Saints take their toll and go' } },
      { id: 'friend', label: 'Name the Leaky Tin', tone: 'bluff', hint: 'A friend in the Gutter vouches for you.', needs: { flag: 'gutter_friend' }, win: { text: 'The Saints let you pass', standing: { gutter: 1 } } },
      {
        id: 'bay', label: 'Open the torpedo bay', tone: 'bluff', hint: 'Show them what a hauler can carry.', needs: { fitted: 'tp_bay' }, odds: { base: 0.7, fitted: { tp_heavy: 0.15, tp_swarm: 0.15 } },
        win: { text: 'The Saints think better of it' },
        lose: { text: 'They call it · weapons hot', spawn: [{ variant: 'raptor', n: 2 }, { variant: 'scout', n: 1 }] },
      },
      { id: 'fight', label: 'Fight', tone: 'fight', hint: 'Three hulls, and they ram.', win: { text: 'Weapons hot on the Saints', spawn: [{ variant: 'raptor', n: 2 }, { variant: 'scout', n: 1 }], standing: { gutter: -1 } } },
    ],
  },
  {
    id: 'picket_fine', kind: 'shakedown', caller: 'custody', when: { after: 60, heatMax: 0.55, netted: true }, repeat: true,
    from: 'Custody picket · PF-226', title: 'Unlicensed cutting',
    text: '“You’re mining without a Kellern licence. {fee} Cyrite, now. Or we do this at the moon.”',
    lines: [{ if: { heatMax: 0.25 }, text: 'He hasn’t matched your ship to the notice. He just wants money.' }],
    ships: [{ variant: 'picket', n: 2 }], cargo: 'Patrol pair · a pilot with a quota',
    fee: { base: 20, heat: 40 },
    choices: [
      { id: 'pay', label: 'Pay the fine', tone: 'pay', hint: 'He goes away happy.', cost: { chits: 'fee' }, win: { text: 'Fine paid · PF-226 moves on', standing: { custody: 1 } } },
      {
        id: 'licence', label: 'Send a licence', tone: 'bluff', hint: 'Spoof one.', needs: { fitted: 'md_spoofer' }, odds: { base: 0.85, heat: -0.3 },
        win: { text: 'Licence accepted' },
        lose: { text: 'Fake spotted · weapons hot', spawn: [{ variant: 'picket', n: 2 }], heat: 0.06 },
      },
      {
        id: 'bluff', label: '“You are out of your sector”', tone: 'bluff', hint: 'Pull rank you do not have.', odds: { base: 0.55, heat: -0.6, standing: { custody: 0.1 } },
        win: { text: 'PF-226 checks his chart and backs off' },
        lose: { text: 'He checks your hull instead · weapons hot', spawn: [{ variant: 'picket', n: 2 }], heat: 0.08 },
      },
      {
        id: 'mounts', label: 'Run out the hardpoints', tone: 'fight', hint: 'Show your guns.', needs: { fitted: 'md_hardpoints' }, odds: { base: 0.7, heat: -0.2, fitted: { md_plate: 0.1 } },
        win: { text: 'He backs off', heat: 0.02 },
        lose: { text: 'Weapons hot', spawn: [{ variant: 'picket', n: 2 }], heat: 0.06 },
      },
      { id: 'fight', label: 'Fight', tone: 'fight', hint: 'Two fighters. Everyone will hear.', win: { text: 'Weapons hot on PF-226', spawn: [{ variant: 'picket', n: 2 }], heat: 0.06 } },
    ],
  },
  {
    id: 'claim_jumpers', kind: 'shakedown', caller: 'kellern', when: { kind: 'home', chits: 30, after: 90 },
    from: 'Kellern claim enforcement', title: 'That take is company property',
    text: '“Every rock here is Kellern’s. Hand over the take and we log it as recovered. Or we log you.”',
    ships: [{ variant: 'enforcer', n: 1 }, { variant: 'picket', n: 1 }], cargo: 'Claim enforcers · company colours',
    fee: { base: 30, heat: 30 },
    choices: [
      { id: 'hand', label: 'Hand it over', tone: 'pay', hint: 'Half your Cyrite, and they forget you.', cost: { chits: 'half' }, win: { text: 'Cyrite surrendered · logged as recovered', heat: -0.05, standing: { kellern: 1 } } },
      { id: 'bribe', label: 'Pay them off', tone: 'pay', hint: 'Company men are paid badly.', cost: { chits: 'fee' }, win: { text: 'Paid off · they never saw you' } },
      { id: 'racks', label: 'Stow most of it', tone: 'pay', hint: 'The racks have a false floor. They find two Cyrite and no more.', needs: { fitted: 'md_racks' }, win: { text: 'They find a little · you keep the rest', chits: -10, heat: -0.05, standing: { kellern: 1 } } },
      { id: 'fight', label: 'Fight', tone: 'fight', hint: 'An enforcer and a picket.', win: { text: 'Weapons hot on the claim enforcers', spawn: [{ variant: 'enforcer', n: 1 }, { variant: 'picket', n: 1 }], heat: 0.05, standing: { kellern: -1 } } },
    ],
  },
  {
    id: 'office_ambush', kind: 'shakedown', caller: 'office', when: { after: 160, heatMin: 0.35 }, repeat: true,
    from: 'Offices of Peace · unregistered', title: 'Cut your drive',
    text: 'Three hulls decloak around you. “Wayward. Cut your drive and surrender the Cyrite.”',
    ships: [{ variant: 'whisper', n: 3 }], cargo: 'Ambush fighters · no markings',
    slow: { timeout: 2.5, default: 'fight' },
    arrive: { text: 'Ambush · three hulls decloak', spawn: [{ variant: 'whisper', n: 3, from: 'around' }] },
    choices: [
      { id: 'surrender', label: 'Surrender half the Cyrite', tone: 'pay', hint: 'They take it and vanish.', cost: { cyrite: 'half' }, win: { text: 'Cyrite surrendered · they cloak and go', dismiss: true } },
      { id: 'fight', label: 'Fight', tone: 'fight', hint: 'Three fighters that hit from cloak.', win: { text: 'Weapons hot' } },
      {
        id: 'plate', label: 'Take it on the plate', tone: 'fight', hint: 'Soak it and burn away.', needs: { fitted: 'md_plate' },
        win: { text: 'Burned clear', heat: 0.04, dismiss: true },
      },
      {
        id: 'jam', label: 'Jam their targeting', tone: 'bluff', hint: 'Blind them.', needs: { fitted: 'md_jammer' }, odds: { base: 0.7, fitted: { md_array: 0.1 } },
        win: { text: 'Jammed · they leave', dismiss: true },
        lose: { text: 'Jam failed · weapons hot' },
      },
      { id: 'run', label: 'Burn for it', tone: 'run', hint: 'They follow, and they call it in.', win: { text: 'Burning hard · they are calling it in', heat: 0.12 } },
    ],
  },

  // ── distress ────────────────────────────────────────────────────────────
  {
    id: 'distress_tug', kind: 'distress', caller: 'miners', when: { after: 40 }, weight: 1.2, repeat: true,
    from: 'Mining tug · Persistence', title: 'Reactor failing',
    text: '“Any ship, any ship. Persistence, reactor scram, four aboard. We cannot hold it.”',
    cargo: 'Ore tug · four crew', ships: [],
    truths: [
      { id: 'genuine', weight: 2.2, read: 'Reactor signature failing' },
      { id: 'ambush', weight: 1, read: 'Two drives warm behind the rock', boost: { if: { heatMin: 0.5 }, mult: 1.6 } },
    ],
    choices: [
      {
        id: 'help', label: 'Go to them', tone: 'help', hint: 'Fix the reactor, take their thanks.', loseIf: ['ambush'],
        win: { text: 'Persistence stabilised · they share spares', supplies: 4, plates: 1, standing: { miners: 1 } },
        lose: { text: 'Bait · raiders out from behind the rock', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 1, from: 'ahead' }] },
      },
      {
        id: 'drone', label: 'Send a repair drone', tone: 'help', hint: 'Costs supplies. You never get close enough to be caught.', cost: { supplies: 2 }, loseIf: ['ambush'],
        win: { text: 'The drone patches them up · they send Cyrite', cyrite: 3, standing: { miners: 1 } },
        lose: { text: 'The drone is shot to pieces · nobody was dying' },
      },
      {
        id: 'tow', label: 'Tow them clear', tone: 'help', hint: 'Tractor them out.', needs: { fitted: 'md_tractor' }, loseIf: ['ambush'],
        win: { text: 'Towed clear · supplies and Cyrite', supplies: 3, chits: 16, standing: { miners: 2 } },
        lose: { text: 'Bait · raiders', spawn: [{ variant: 'scout', n: 1, from: 'ahead' }] },
      },
      { id: 'no', label: 'Keep going', tone: 'refuse', hint: 'Not your problem.', win: { text: 'The call fades behind you' } },
    ],
  },
  {
    id: 'distress_freighter', kind: 'distress', caller: 'guild', when: { after: 100 }, repeat: true,
    from: 'Guild freighter · Long Reckoning', title: 'Raiders on us',
    text: '“Gutter raiders on our tail. We cannot outrun them. Anyone with guns, please.”',
    lines: [{ if: { standing: ['guild', 1] }, text: '“Wayward? The Guild knows you.”' }],
    ships: [{ variant: 'scout', n: 2 }, { variant: 'raptor', n: 1 }], cargo: 'Freighter, full · raiders, empty',
    choices: [
      { id: 'help', label: 'Drive them off', tone: 'fight', hint: 'Three raiders. The Guild pays its debts.', win: { text: 'Engaging the raiders', spawn: [{ variant: 'scout', n: 2, from: 'ahead' }, { variant: 'raptor', n: 1, from: 'ahead' }], follow: { card: 'freighter_thanks', after: 35 }, standing: { gutter: -1 } } },
      { id: 'no', label: 'Keep your distance', tone: 'refuse', hint: 'You cannot save everyone.', win: { text: 'The Long Reckoning’s call goes silent', standing: { guild: -1 } } },
    ],
  },
  {
    id: 'distress_custody', kind: 'distress', caller: 'custody', when: { after: 130 }, repeat: true,
    from: 'Custody picket · PF-301, crippled', title: 'Help us',
    text: '“Any ship. PF-301, drive gone, air failing. Two aboard.” They’re Custody. They’re dying.',
    cargo: 'A crippled patrol fighter',
    truths: [
      { id: 'grateful', weight: 1, read: 'The pilot’s voice is shaking' },
      { id: 'report', weight: 1, read: 'Their transmitter is still logging everything' },
    ],
    choices: [
      {
        id: 'rescue', label: 'Rescue them', tone: 'help', hint: 'Custody who owe you might be worth something.', loseIf: ['report'],
        win: { text: 'PF-301’s crew aboard · they will not forget it', heat: -0.12, standing: { custody: 2 } },
        lose: { text: 'Rescued · and they logged your hull', heat: 0.1, standing: { custody: 1 } },
      },
      { id: 'strip', label: 'Strip the wreck', tone: 'trade', hint: 'Custody stores are good stores.', win: { text: 'Wreck stripped · five supplies', supplies: 5, heat: 0.08, standing: { custody: -1 } } },
      { id: 'no', label: 'Leave them', tone: 'refuse', hint: 'Someone will come for them. Someone always does.', win: { text: 'You leave PF-301 to its own' } },
    ],
  },
  {
    id: 'beacon_cache', kind: 'distress', caller: 'unknown', when: { after: 85 }, repeat: true,
    from: 'Automated beacon', title: 'Cache, unclaimed',
    text: 'An old company beacon with a cache code: emergency Cyrite for any miner.',
    cargo: 'A cache marker, forty years old',
    truths: [
      { id: 'real', weight: 1.6, read: 'The beacon’s clock has not been reset in forty years' },
      { id: 'lure', weight: 1, read: 'The beacon was serviced last week', boost: { if: { heatMin: 0.4 }, mult: 1.8 } },
    ],
    choices: [
      {
        id: 'go', label: 'Open the cache', tone: 'help', hint: 'Cyrite, if it is real.', loseIf: ['lure'],
        win: { text: 'Cache open · six Cyrite', cyrite: 6 },
        lose: { text: 'A lure · patrol fighters inbound', heat: 0.12, spawn: [{ variant: 'picket', n: 2, from: 'behind' }] },
      },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'Too good to be true.', win: { text: 'You leave the beacon calling' } },
    ],
  },

  // ── rumours ─────────────────────────────────────────────────────────────
  {
    id: 'rumour_seam', kind: 'rumour', caller: 'miners', when: { after: 20, heatMax: 0.5 }, weight: 1.4, repeat: true,
    from: 'A prospector on the open band', title: 'A seam off the line',
    text: '“There’s violet in the rock round here, if you know where. Survey’s two Cyrite.”',
    cargo: 'A survey file',
    truths: [
      { id: 'true', weight: 2, read: 'The survey matches the field around you' },
      { id: 'false', weight: 1, read: 'The survey is for another belt' },
    ],
    choices: [
      { id: 'buy', label: 'Buy the survey', tone: 'pay', hint: 'Veined rock all round for half a minute.', cost: { chits: 10 }, loseIf: ['false'], win: { text: 'Survey loaded · veined rock all round', seam: 30 }, lose: { text: 'The survey is for another belt' } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Cut what you find.', win: { text: 'The prospector moves on' } },
    ],
  },
  {
    id: 'rumour_forger', kind: 'rumour', caller: 'unknown', when: { kind: 'home', after: 45, noFlag: ['forger_known', 'codes'] },
    from: 'Bar talk on the port band', title: 'Someone does papers',
    text: '“...a woman at Frontier Supply does registry codes, if you can pay.”',
    cargo: 'Overheard',
    choices: [
      { id: 'note', label: 'Remember the name', tone: 'trade', hint: 'She may call later.', win: { text: 'A name at Frontier Supply', flag: 'forger_known' } },
      { id: 'intro', label: 'Pay for an introduction', tone: 'pay', hint: 'Two Cyrite, and she calls soon.', cost: { chits: 10 }, win: { text: 'Introduction paid for', flag: 'forger_known', follow: { card: 'forger', after: 12 } } },
      { id: 'no', label: 'Ignore it', tone: 'refuse', hint: 'Bar talk.', win: { text: 'The band moves on' } },
    ],
  },
  {
    id: 'rumour_captain', kind: 'rumour', caller: 'guild', when: { kind: 'home', after: 65, noFlag: 'fee_known' },
    from: 'A Guild pilot', title: 'The lane captain',
    text: '“The captain at the Jump Gate? Some say she takes fees. Some say she hanged the last pilot who tried.”',
    cargo: 'Gossip',
    truths: [
      { id: 'true', weight: 2, read: 'Two other pilots tell it the same way' },
      { id: 'false', weight: 1, read: 'Nobody else has heard it' },
    ],
    choices: [
      { id: 'listen', label: 'Ask who to pay', tone: 'trade', hint: 'Cheaper at the lane, if it is true.', loseIf: ['false'], win: { text: 'Word is the lane captain takes fees', flag: 'fee_known' }, lose: { text: 'Bad gossip · and you believe it', flag: 'fee_known' } },
      { id: 'no', label: 'Thank them', tone: 'refuse', hint: 'Gossip is cheap.', win: { text: 'The pilot signs off' } },
    ],
  },
  {
    id: 'rumour_prefect', kind: 'rumour', caller: 'miners', when: { kind: 'home', after: 95 },
    from: 'Ore buyer’s chatter', title: 'A Governor came through',
    text: '“A Governor came to the moon this morning. Offices of Peace. Asked for you by name. Calloway.”',
    cargo: 'Gossip, frightened',
    choices: [
      { id: 'ask', label: 'Ask what she asked', tone: 'trade', hint: 'One Cyrite loosens a tongue.', cost: { chits: 5 }, win: { text: 'She asked where your family lives', flag: 'calloway_known' } },
      { id: 'quiet', label: 'Go quiet a while', tone: 'refuse', hint: 'Cut the transponder chatter.', win: { text: 'Running dark', heat: -0.05 } },
    ],
  },

  // ── the journey: Calloway in the system, open lanes, the Net, food ──────
  {
    id: 'calloway_here', kind: 'warning', caller: 'calloway', trigger: 'hunt', repeat: true, face: CALLOWAY_FACE,
    from: 'Governor Idris Calloway · CCV Patience', title: 'There you are',
    text: '“Juno. I’ve been one system behind you for days. I’m tired. Power down and nobody else gets hurt.”',
    lines: [
      { if: { flag: 'calloway_beaten' }, text: 'Her ship still carries the scars of the last time.' },
      { if: { flag: 'calloway_told' }, text: '“I read what you sent me. I want to hear it from you, in person.”' },
      { if: { flag: 'calloway_lied' }, text: '“You sent me the wrong way once. Not again.”' },
      { if: { netted: true }, text: 'The Net holds this system. Every buoy is hers.' },
      { if: { wise: ['decoy', 1] }, text: '“And don’t dump your stores at me again. I know what crates look like.”' },
      { if: { wise: ['dark', 1] }, text: 'Her sweep is tuned for a cold reactor this time.' },
      { if: { wise: ['run', 2] }, text: 'An interdictor flies with her. She has watched you run too often.' },
      { if: { hunch: 'straight' }, text: '“You never turn aside. So I stopped following and started waiting.”' },
    ],
    ships: [{ variant: 'lancer', n: 1 }, { variant: 'enforcer', n: 2 }], cargo: 'Offices of Peace cutter · full magazines · a Governor aboard',
    truths: [
      { id: 'patient', weight: 2, read: 'Her wing holds back · she wants you alive' },
      { id: 'tired', weight: 1, read: 'Her drive is running hot · she has pushed hard to get here', boost: { if: { flag: 'calloway_beaten' }, mult: 2 } },
    ],
    choices: [
      {
        id: 'run', label: 'Run for the lane', tone: 'run', hint: 'She chases you and her field slows your drive. Get through and she’s still a system behind.',
        win: { text: 'Running · the Patience is on your tail', calloway: 'run' },
      },
      {
        id: 'decoy', label: 'Jettison stores as a decoy', tone: 'pay', hint: 'Crates look like a ship. If she chases them, you gain a day.',
        cost: { supplies: 'half' }, needs: { supplies: 6 }, odds: { base: 0.6, flags: { calloway_lied: -0.2 }, fitted: { ut_scanner: 0.15 }, learn: 'decoy' },
        win: { text: 'She takes the crates · a day’s start', hunt: 1.5, heat: -0.2 },
        lose: { text: 'She ignores the pods and opens fire', calloway: 'fight' },
      },
      {
        id: 'talk', label: 'Tell her the file is already out', tone: 'bluff', hint: 'If she buys it, she has to stop and check. If not, she knows you’re bluffing.',
        loseIf: ['patient'], odds: { base: 0.5, flags: { calloway_told: 0.2 }, learn: 'bluff' },
        win: { text: '“If that is true…” · she breaks off to check', hunt: 2, flag: 'calloway_lied' },
        lose: { text: '“No, Juno. You still have it.” · she opens fire', calloway: 'fight', flag: 'calloway_lied' },
      },
      {
        id: 'dark', label: 'Go dark', tone: 'bluff', hint: 'Kill drive and transponder. Drift and let her lose you.',
        needs: { fitted: ['ut_scanner', 'tech_office', 'md_baffles'] }, odds: { base: 0.7, heat: -0.3, fitted: { md_baffles: 0.1 }, learn: 'dark' },
        win: { text: 'Dark · she sweeps past you', hunt: 1, heat: -0.3 },
        lose: { text: 'Her sweep finds the heat of your reactor', calloway: 'fight' },
      },
      {
        id: 'fight', label: 'Turn and fight', tone: 'fight', hint: 'Break her ship and she loses days to repairs. She knows it.',
        win: { text: 'Weapons hot on the Patience', calloway: 'fight' },
      },
    ],
  },
  {
    id: 'calloway_word', kind: 'warning', caller: 'calloway', when: { after: 40, hunted: 1 }, weight: 2, repeat: true, face: CALLOWAY_FACE,
    from: 'Governor Idris Calloway · Offices of Peace', title: 'One system behind',
    text: '“I’m one lane behind you, Juno. Every system you stop in, I stop in.”',
    lines: [
      { if: { flag: 'calloway_told' }, text: '“I keep thinking about what you told me. It doesn’t change my job.”' },
      { if: { netted: true }, text: '“And the Net is already here. Where do you think you are going?”' },
      { if: { wise: ['lie', 2] }, text: '“Whatever heading you send, I’ll check twice. You’ve lied before.”' },
      { if: { hunch: 'port' }, text: '“You like ports, Juno. So do I. I have been reading their dock logs.”' },
      { if: { hunch: 'mining' }, text: '“Another rock field? You are a creature of habit.”' },
      { if: { hunch: 'contested' }, text: '“You always go where the shooting is. Like following a flare.”' },
      { if: { hunch: 'transit' }, text: '“The quiet lanes again. I have stopped asking where you went.”' },
    ],
    cargo: 'A Governor’s channel · priority override',
    choices: [
      { id: 'lie', label: 'Send her a false heading', tone: 'bluff', hint: 'She checks it. Each lie that holds costs her a day.', odds: { base: 0.45, heat: -0.2, learn: 'lie' }, win: { text: 'She turns for the wrong lane', hunt: 1, flag: 'calloway_lied' }, lose: { text: '“Wrong lane, Juno.” · she pushes harder', hunt: -0.5, flag: 'calloway_lied' } },
      { id: 'ask', label: 'Ask what she believes', tone: 'help', hint: 'She might tell you. She might be stalling.', win: { text: '“That it holds. That it has to.” · a long silence', score: 400, flag: 'calloway_told', heat: 0.04 } },
      { id: 'silence', label: 'Cut the channel', tone: 'refuse', hint: 'Every second you listen, she triangulates.', win: { text: 'Channel cut' } },
    ],
  },
  {
    id: 'lane_toll', kind: 'shakedown', caller: 'gutter', trigger: 'toll', when: { netted: false, kind: ['contested', 'mining', 'transit', 'port'] }, repeat: true,
    from: 'Raiders · the Lane Wardens', title: 'This lane has a keeper',
    text: '“Nobody uses the old lane without paying. {fee} Cyrite, and you’re through.”',
    lines: [
      { if: { standing: ['gutter', 1] }, text: '“You are the one who helped the Leaky Tin. Maybe half.”' },
      { if: { kind: 'contested' }, text: 'Two more raiders sit in the lane’s shadow.' },
      { if: { notice: ['gutter', 'toll'] }, text: '“And the price is up for a crew-killer.”' },
    ],
    ships: [{ variant: 'raptor', n: 1 }, { variant: 'scout', n: 2 }], cargo: 'Raiders · light hulls, heavy guns',
    fee: { base: 25 },
    truths: [
      { id: 'greedy', weight: 2, read: 'Their guns are cold · they just want paying' },
      { id: 'hungry', weight: 1, read: 'Their guns are warm · they will take the ship if they can', boost: { if: { kind: 'contested' }, mult: 2 } },
    ],
    choices: [
      { id: 'pay', label: 'Pay the toll', tone: 'pay', hint: 'Cyrite, and through.', cost: { chits: 'fee' }, loseIf: ['hungry'], win: { text: 'Toll paid · the Wardens wave you on', standing: { gutter: 1 } }, lose: { text: 'They take the Cyrite and the guns come up anyway', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }] } },
      { id: 'talk', label: 'Name a friend', tone: 'bluff', hint: 'Someone in the Gutter owes you, maybe.', odds: { base: 0.3, standing: { gutter: 0.25 }, flags: { gutter_friend: 0.3 } }, win: { text: '“Go on, then.” · through for nothing' }, lose: { text: '“Never heard of them.” · weapons hot', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }] } },
      { id: 'account', label: 'Bill the Guild', tone: 'trade', hint: 'Free passage.', needs: { fitted: 'md_ledger' }, win: { text: 'Billed · through', standing: { guild: 1 } } },
      { id: 'fight', label: 'Clear the lane', tone: 'fight', hint: 'Three light hulls between you and the jump.', win: { text: 'Clearing the lane', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }], standing: { gutter: -1 } } },
    ],
  },
  {
    id: 'claim_holdfast', kind: 'shakedown', caller: 'frontier', trigger: 'offer', repeat: true,
    from: 'Holdfast crew · claim tender', title: 'This seam is staked',
    text: '“You are working a Holdfast seam. {fee} Cyrite for the rock you have taken, or you leave it.”',
    lines: [{ if: { standing: ['frontier', 1] }, text: '“You are known here. Pay the short rate.”' }],
    ships: [{ variant: 'scout', n: 2 }], cargo: 'Holdfast crew · light hulls',
    fee: { base: 20 },
    choices: [
      { id: 'pay', label: 'Pay the claim', tone: 'pay', hint: 'Cyrite, and the seam is yours to leave.', cost: { chits: 'fee' }, win: { text: 'Claim paid · the crew turns back, and the tally is on file', standing: { frontier: 1 }, flag: 'claim_paid_frontier' } },
      { id: 'codes', label: 'Show forged claim codes', tone: 'bluff', hint: 'Passes for a Holdfast licence.', needs: { flag: 'codes' }, odds: { base: 0.7, flags: { codes_bad: -0.6 } }, win: { text: 'Codes accepted · the crew stands down' }, lose: { text: '“That licence is a year old.” · weapons hot', spawn: [{ variant: 'scout', n: 2, from: 'around' }] } },
      { id: 'friend', label: 'Name a friend', tone: 'bluff', hint: 'Someone in the Frontier vouches, maybe.', odds: { base: 0.25, standing: { frontier: 0.3 } }, win: { text: '“Fine. Work quickly.” · left alone' }, lose: { text: '“Never heard of them.” · weapons hot', spawn: [{ variant: 'scout', n: 2, from: 'around' }] } },
      { id: 'fight', label: 'Drive them off', tone: 'fight', hint: 'Two light hulls, close.', win: { text: 'Crew engaged', spawn: [{ variant: 'scout', n: 2, from: 'around' }], standing: { frontier: -1 }, flag: 'claim_fought_frontier' } },
    ],
  },
  {
    id: 'claim_guild', kind: 'shakedown', caller: 'guild', trigger: 'offer', repeat: true,
    from: 'Salvage crew · claim cutter', title: 'This field is staked',
    text: '“Wreck field is under claim. {fee} Cyrite for what you have lifted, or the cutters clear you out.”',
    lines: [{ if: { standing: ['guild', 1] }, text: '“Guild papers? Then it is only a fee.”' }],
    ships: [{ variant: 'raptor', n: 2 }], cargo: 'Salvage crew · fast cutters',
    fee: { base: 30 },
    choices: [
      { id: 'pay', label: 'Pay the claim', tone: 'pay', hint: 'Cyrite, and the field is theirs.', cost: { chits: 'fee' }, win: { text: 'Claim paid · the cutters peel away, and the tally is on file', standing: { guild: 1 }, flag: 'claim_paid_guild' } },
      { id: 'account', label: 'Bill the Guild', tone: 'trade', hint: 'Your ledger covers it.', needs: { fitted: 'md_ledger' }, win: { text: 'Billed · the cutters peel away, and the tally is on file', standing: { guild: 1 }, flag: 'claim_paid_guild' } },
      { id: 'codes', label: 'Show forged claim codes', tone: 'bluff', hint: 'Passes for a salvage licence.', needs: { flag: 'codes' }, odds: { base: 0.7, flags: { codes_bad: -0.6 } }, win: { text: 'Codes accepted · the cutters stand down' }, lose: { text: '“Not in our register.” · weapons hot', spawn: [{ variant: 'raptor', n: 2, from: 'around' }] } },
      { id: 'fight', label: 'Drive them off', tone: 'fight', hint: 'Two fast cutters.', win: { text: 'Cutters engaged', spawn: [{ variant: 'raptor', n: 2, from: 'around' }], standing: { guild: -1 }, flag: 'claim_fought_guild' } },
    ],
  },
  {
    id: 'port_scan', kind: 'checkpoint', caller: 'custody', trigger: 'port', when: { netted: true, kind: ['port', 'mining', 'contested'] }, repeat: true,
    from: 'Custody port authority', title: 'Scan before the clamps',
    text: '“Continuance order: every ship gets scanned before docking. Hold position.”',
    lines: [
      { if: { heatMin: 0.5 }, text: 'Your hull is on their board already.' },
      { if: { flag: 'codes' }, text: 'Forged registration codes loaded.' },
    ],
    cargo: 'Port scanner · a Custody clerk', fee: { base: 30, heat: 40 },
    truths: [
      { id: 'lazy', weight: 1.2, read: 'The clerk has waved through twelve hulls in an hour' },
      { id: 'sharp', weight: 1, read: 'A Custody analyst is reading the scans as they come' },
    ],
    choices: [
      { id: 'scan', label: 'Take the scan', tone: 'bluff', hint: 'If the clerk is lazy, nothing happens.', loseIf: ['sharp'], win: { text: 'Scan logged as clean · clamps on' }, lose: { text: 'Your face comes up on the scanner', heat: 0.2 } },
      { id: 'bribe', label: 'Pay the clerk', tone: 'pay', hint: 'A Custody clerk on a frontier wage.', cost: { chits: 'fee' }, odds: { base: 0.8, heat: -0.3 }, win: { text: 'Paid · the scan is lost' }, lose: { text: 'The clerk takes it and reports you anyway', heat: 0.15 } },
      { id: 'spoof', label: 'Send the forged codes', tone: 'bluff', hint: 'A clean ID for a scanner that wants one.', needs: { flag: 'codes' }, odds: { base: 0.8, flags: { codes_bad: -0.6 } }, win: { text: 'Codes accepted · clamps on' }, lose: { text: 'The codes bounce', heat: 0.15 } },
      { id: 'friends', label: 'Call a dock friend', tone: 'trade', hint: 'Clean scan.', needs: { fitted: 'md_dock' }, win: { text: 'Scan swapped · docked' } },
      { id: 'refuse', label: 'Refuse the scan', tone: 'refuse', hint: 'Dock anyway and let them make a fuss.', win: { text: 'Docking unscanned · the fuss goes up the line', heat: 0.12 } },
    ],
  },
  // the first system past Cerro: the approach to its two docks always calls (sim/world.ts), `scene` keeps them out of the chance pool
  {
    id: 'depot_hail', kind: 'rumour', caller: 'frontier', trigger: 'scene', tier: 'major',
    from: 'Frontier Supply Depot', title: 'Berth open',
    text: '“Depot control. Fuel, plating and stores at posted prices, and a berth free. Slow into the ring and we take you in.”',
    cargo: 'Depot office · fuel, plating, stores',
    choices: [
      { id: 'dock', label: 'Dock at the depot', tone: 'trade', hint: 'Slow inside the ring to dock.', win: { text: 'Berth open · slow into the ring' } },
      { id: 'on', label: 'Fly on', tone: 'refuse', hint: 'The Jump Gate is still ahead.', win: { text: 'Clear to pass' } },
    ],
  },
  {
    id: 'audit_hail', kind: 'rumour', caller: 'custody', trigger: 'scene', tier: 'major',
    from: 'Kellern Audit Dock', title: 'Hold for audit',
    text: '“Audit dock. Your hull is on the company’s list. Hold off the arch while the clerks find your file.”',
    cargo: 'Audit dock · a clerk and a scanning arch',
    choices: [
      { id: 'hold', label: 'Hold off the arch', tone: 'refuse', hint: 'Wait for the clerks.', win: { text: 'Holding · the clerks are slow' } },
      { id: 'on', label: 'Fly on', tone: 'refuse', hint: 'Not your file to wait for.', win: { text: 'Clear to pass' } },
    ],
  },
  {
    id: 'port_news', kind: 'rumour', caller: 'frontier', trigger: 'port', when: { netted: false, kind: ['port', 'mining', 'contested'] }, repeat: true,
    from: 'Dockmaster', title: 'Who came through',
    text: '“Welcome in. You look like you want to know who’s been asking around.”',
    lines: [{ if: { hunted: 1 }, text: '“A Governor’s cutter came through the next system over. Yesterday, maybe.”' }],
    cargo: 'Dock office · the gossip of every lane',
    choices: [
      { id: 'buy', label: 'Buy the news', tone: 'trade', hint: 'Where the Governor is, and where the Net has reached.', cost: { chits: 10 }, win: { text: 'The dockmaster tells you who has passed through', flag: 'news' } },
      { id: 'no', label: 'Just dock', tone: 'refuse', hint: 'You will find out soon enough.', win: { text: 'Clamps on' } },
    ],
  },
  {
    id: 'food_trader', kind: 'trade', caller: 'guild', when: { after: 30, hungry: 5, kind: ['port', 'contested', 'mining', 'transit'] }, weight: 1.4, repeat: true,
    from: 'Drift trader · the Kindly Ann', title: 'Stores for sale',
    text: '“Fresh stores off a garden ship. You look thin.” You have {supplies} supplies aboard.',
    ships: [{ variant: 'freighter', n: 1 }], cargo: 'Drift trader · sealed food crates',
    choices: [
      { id: 'chits', label: 'Buy three', tone: 'trade', hint: 'Five Cyrite for three.', cost: { chits: 25 }, win: { text: 'Three crates aboard', supplies: 3, standing: { guild: 1 } } },
      { id: 'no', label: 'Not this time', tone: 'refuse', hint: 'Make do.', win: { text: 'The Kindly Ann sails on' } },
    ],
  },
  {
    id: 'drift_fleet', kind: 'trade', caller: 'miners', when: { after: 40, here: 'drift' }, weight: 4, repeat: true,
    from: 'Drift fleet · the Long Walk', title: 'Forty ships, going nowhere fast',
    text: '“A Drift crossing. We trade, we talk, we don’t fight. What do you need?”',
    lines: [
      { if: { hunted: 2 }, text: '“A Governor has been asking the fleets about a yellow hauler.”' },
      { if: { wise: ['fleet', 1] }, text: '“She doesn’t believe the fleets any more. Somebody lied for you.”' },
    ],
    ships: [{ variant: 'freighter', n: 2 }], cargo: 'A Drift fleet · stores, spares, rumours',
    choices: [
      { id: 'food', label: 'Buy two supplies', tone: 'trade', hint: 'Three Cyrite for two.', cost: { chits: 15 }, win: { text: 'Two crates aboard', supplies: 2, standing: { miners: 1 } } },
      { id: 'news', label: 'Ask about the lanes', tone: 'trade', hint: 'One Cyrite: where the Net is, and who follows you.', cost: { chits: 5 }, win: { text: 'The Drift tell you what they have seen', flag: 'news' } },
      { id: 'trail', label: 'Ask them to lie for you', tone: 'help', hint: 'If the Governor asks the fleet, they send her the wrong way.', needs: { standing: ['miners', 2] }, odds: { base: 0.95, learn: 'fleet' }, win: { text: 'The Long Walk will tell her you went the other way', hunt: 1 }, lose: { text: 'The Governor has heard that story from a Drift fleet before' } },
      { id: 'no', label: 'Pass by', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The fleet drifts on' } },
    ],
  },
  {
    id: 'holdout', kind: 'plea', caller: 'miners', when: { after: 60, netted: false, kind: ['mining', 'port', 'contested'] }, weight: 1.2, boost: { if: { here: 'holdfast' }, mult: 3 }, repeat: true,
    from: 'A claim settlement · the Holdfast', title: 'Help us hold out',
    text: '“Custody surveyors came this morning. When the Net gets here, we lose everything. Cyrite for our shield would keep them out a while.”',
    lines: [{ if: { standing: ['miners', 2] }, text: '“The miners say you are one of us.”' }],
    cargo: 'A settlement · forty people, one generator',
    truths: [
      { id: 'true', weight: 3, read: 'Their generator draws exactly what they say' },
      { id: 'sold', weight: 1, read: 'Their comms are full of Custody traffic' },
    ],
    choices: [
      { id: 'krail', label: 'Give six Cyrite', tone: 'help', hint: 'The Net stalls here for days. The Cyrite is gone.', cost: { cyrite: 6 }, loseIf: ['sold'], win: { text: 'The generator lights · the Net will stall here', stall: 3, standing: { miners: 2 }, score: 1500 }, lose: { text: 'They take the Cyrite and sell your position', heat: 0.2, hunt: -0.5 } },
      { id: 'parts', label: 'Give five supplies', tone: 'help', hint: 'Not as good as Cyrite, but it holds a while.', cost: { supplies: 5 }, win: { text: 'Supplies across · they will hold a little longer', stall: 1.5, standing: { miners: 1 } } },
      { id: 'no', label: 'You cannot help', tone: 'refuse', hint: 'Everybody out here needs something.', win: { text: 'The channel closes' } },
    ],
  },
  // the Scatter's own (sim/scatter.ts): who is in the system decides
  {
    id: 'thren_smell', kind: 'warning', caller: 'unknown', when: { after: 25, here: 'thren', fuel: 8 }, weight: 2.5, repeat: true,
    from: 'Your own sensors', title: 'The Thren smell jump fluid',
    text: 'Something is closing on the jump fluid in your tank.',
    ships: [{ variant: 'mote', n: 4 }], cargo: 'A Thren swarm · drawn to jump fluid',
    choices: [
      { id: 'vent', label: 'Vent five jump fluid', tone: 'pay', hint: 'They take it and leave you be a while.', cost: { fuel: 5 }, win: { text: 'The swarm feeds on the fluid and drifts off', calm: 90 } },
      { id: 'fight', label: 'Meet them', tone: 'fight', hint: 'They come now.', win: { text: 'The swarm comes', spawn: [{ variant: 'mote', n: 4, from: 'ahead' }] } },
      { id: 'run', label: 'Burn for the lane', tone: 'run', hint: 'They will follow.', win: { text: 'The Thren follow your wake' } },
    ],
  },
  {
    id: 'voice_ask', kind: 'shakedown', caller: 'unknown', when: { after: 40, here: 'voice' }, weight: 2, repeat: true,
    from: 'The Voice', title: 'A foundry asks',
    text: '“Metal. For passage.”',
    ships: [{ variant: 'drone', n: 1 }, { variant: 'probe', n: 1 }], cargo: 'A foundry · its keepers',
    choices: [
      { id: 'ore', label: 'Give six Cyrite', tone: 'pay', hint: 'They let you pass.', cost: { chits: 30 }, win: { text: 'The foundry takes the Cyrite · you may pass', notice: { voice: -3 } } },
      { id: 'parts', label: 'Give four supplies', tone: 'trade', hint: 'They want what you are made of.', cost: { supplies: 4 }, win: { text: 'The foundry takes the supplies · you may pass', notice: { voice: -3 } } },
      { id: 'no', label: 'Refuse', tone: 'fight', hint: 'The keepers come for you.', win: { text: 'The keepers come', spawn: [{ variant: 'drone', n: 1, from: 'ahead' }, { variant: 'probe', n: 1, from: 'ahead' }] } },
    ],
  },
  {
    id: 'gutter_raid', kind: 'shakedown', caller: 'gutter', when: { after: 35, here: 'raid' }, weight: 2, repeat: true,
    from: 'Gutter raiders', title: 'A raid on',
    text: '“Keep out of it, hauler. Or join in.”',
    ships: [{ variant: 'raptor', n: 1 }, { variant: 'scout', n: 2 }], cargo: 'A raiding party · fresh plunder',
    choices: [
      { id: 'join', label: 'Join in', tone: 'trade', hint: 'A cut of the plunder. The locals will remember.', win: { text: 'Your cut: six Cyrite and some stores', chits: 30, supplies: 1, standing: { gutter: 1, miners: -1 } } },
      { id: 'out', label: 'Keep out', tone: 'refuse', hint: 'This is not your fight.', win: { text: 'The raiders let you be' } },
      { id: 'fight', label: 'Drive them off', tone: 'fight', hint: 'The locals will thank you.', win: { text: 'The raiders turn on you', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }], standing: { miners: 1, gutter: -1 } } },
    ],
  },
  {
    id: 'relay', kind: 'warning', caller: 'custody', when: { after: 50, netted: false, kind: ['mining', 'transit', 'contested', 'port'] }, repeat: true,
    from: 'Your own sensors', title: 'A survey relay',
    text: 'A Custody relay is mapping this system for the Net. Two pickets guard it. When it’s done, the Net comes.',
    ships: [{ variant: 'picket', n: 2 }], cargo: 'Survey relay · two pickets',
    choices: [
      { id: 'break', label: 'Break the relay', tone: 'fight', hint: 'The Net stalls here, and every patrol in the system hears it.', win: { text: 'Relay broken · the pickets come for you', stall: 2.5, heat: 0.18, spawn: [{ variant: 'picket', n: 2, from: 'ahead' }] } },
      { id: 'jam', label: 'Jam it', tone: 'bluff', hint: 'Garble its survey. Quieter, and shorter.', needs: { fitted: ['ut_scanner', 'tech_office', 'tech_custody'] }, odds: { base: 0.75 }, win: { text: 'The survey reads garbage · the Net will wait', stall: 1.5 }, lose: { text: 'The relay flags the jamming', heat: 0.12 } },
      { id: 'gutter', label: 'Point the Gutter at it', tone: 'trade', hint: 'Four Cyrite and a Gutter crew strips it. Slower than doing it yourself.', cost: { chits: 20 }, win: { text: 'A Gutter crew takes the relay apart · the Net will wait', stall: 1.5, standing: { gutter: 1 } } },
      { id: 'leave', label: 'Leave it', tone: 'refuse', hint: 'Not your fight. When it’s done, the Net comes here.', win: { text: 'You leave the relay to its work · the Net is coming', stall: -4 } },
    ],
  },
  {
    id: 'false_trail', kind: 'trade', caller: 'guild', when: { after: 45, kind: ['port', 'contested', 'mining'] }, repeat: true,
    from: 'Dust Traders Guild · flight clerk', title: 'A flight plan, filed',
    text: '“{fee} Cyrite and I file a flight plan for a lane you’re not taking. Anyone asking gets the wrong answer.”',
    lines: [
      { if: { hunted: 1 }, text: '“Someone is asking after you already.”' },
      { if: { wise: ['plan', 1] }, text: '“A Governor came through checking our filings. She knows the trick.”' },
    ],
    cargo: 'A Guild flight office', fee: { base: 25 },
    truths: [
      { id: 'honest', weight: 3, read: 'Guild-licensed · files a hundred plans a day' },
      { id: 'informer', weight: 1, read: 'The clerk’s other line is to the Offices of Peace' },
    ],
    choices: [
      { id: 'pay', label: 'File the false plan', tone: 'pay', hint: 'A day and a half, if the clerk is honest.', cost: { chits: 'fee' }, loseIf: ['informer'], odds: { base: 0.95, learn: 'plan' }, win: { text: 'Plan filed · a false trail', hunt: 1.5, standing: { guild: 1 } }, lose: { text: 'The plan is filed, and your real heading with it', hunt: -0.5, heat: 0.1 } },
      { id: 'no', label: 'No need', tone: 'refuse', hint: 'Keep the Cyrite.', win: { text: 'The clerk shrugs' } },
    ],
  },

  // ── follow-ups ──────────────────────────────────────────────────────────
  {
    id: 'runner_favour', kind: 'job', caller: 'gutter', trigger: 'follow',
    from: 'Fuel runner · call sign Tallow', title: 'The favour',
    text: '“Time to settle up, Wayward. Six supplies, or carry something to the dock for me. Not paying is also a choice.”',
    cargo: 'Runner’s channel',
    choices: [
      { id: 'parts', label: 'Give six supplies', tone: 'pay', hint: 'Settled.', cost: { supplies: 6 }, win: { text: 'Debt settled with Tallow', unflag: 'owes_runner', standing: { gutter: 1 } } },
      { id: 'carry', label: 'Carry it to the dock', tone: 'help', hint: 'A package for Frontier Supply. Don’t ask.', win: { text: 'Package aboard for the dock', unflag: 'owes_runner', heat: 0.05, job: { id: 'package', text: 'Tallow’s package to the dock', at: 'port', pay: { text: 'Package delivered · Tallow is satisfied', standing: { gutter: 1 } } } } },
      { id: 'stiff', label: 'Stiff him', tone: 'refuse', hint: 'He will sell you to the Custody.', win: { text: 'Tallow sells your position', heat: 0.15, standing: { gutter: -2 } } },
    ],
  },
  {
    id: 'custody_demand', kind: 'warning', caller: 'custody', trigger: 'follow', when: { flag: 'passengers' },
    from: 'Custody patrol command', title: 'Return the Okafors',
    text: '“Wayward, you’re carrying three runaway Kellern workers. Hand them over at the moon and the charge drops to theft.”',
    cargo: 'Patrol command',
    choices: [
      { id: 'deny', label: 'Deny it', tone: 'bluff', hint: 'There is nobody aboard.', odds: { base: 0.5, heat: -0.4 }, win: { text: 'Patrol command loses interest', heat: -0.05 }, lose: { text: 'They do not believe you', heat: 0.12 } },
      { id: 'defy', label: '“Come and get them”', tone: 'fight', hint: 'They will.', win: { text: 'Patrols vectoring on you', heat: 0.1, spawn: [{ variant: 'picket', n: 2, from: 'behind' }], standing: { miners: 1 } } },
      { id: 'silent', label: 'Stay silent', tone: 'refuse', hint: 'Let them wonder.', win: { text: 'Silence on the channel', heat: 0.05 } },
    ],
  },
  {
    id: 'foreman_again', kind: 'plea', caller: 'kellern', trigger: 'follow', when: { flag: 'stalled' },
    from: 'Kellern Mining · Foreman Draper', title: 'Time is up',
    text: '“I gave you time, Juno. What is it going to be?”',
    cargo: 'Mining office channel',
    choices: [
      { id: 'stall', label: 'Stall again', tone: 'bluff', hint: 'He might buy it twice.', odds: { base: 0.35 }, win: { text: 'Draper gives you an hour', heat: -0.05 }, lose: { text: 'Draper hands it to the Custody', heat: 0.18 } },
      { id: 'refuse', label: 'Tell him no', tone: 'refuse', hint: 'He hands it to the Custody.', win: { text: 'Draper hands it to the Custody', heat: 0.12, unflag: 'stalled' } },
    ],
  },
  {
    id: 'tracker_found', kind: 'warning', caller: 'unknown', trigger: 'follow', when: { flag: 'case' },
    from: 'Your own sensors', title: 'The case is transmitting',
    text: 'The sealed case pings a Custody band every twelve seconds. Someone planted a tracker.',
    cargo: 'One sealed case',
    choices: [
      { id: 'dump', label: 'Dump the case', tone: 'refuse', hint: 'Keep the Cyrite, lose the job.', win: { text: 'Case jettisoned · the tracker goes with it', unflag: 'case', drop: 'case', heat: -0.05 } },
      { id: 'open', label: 'Open it and pull the tracker', tone: 'bluff', hint: 'The Guild will know you looked.', odds: { base: 0.6, fitted: { ut_scanner: 0.25 } }, win: { text: 'Tracker pulled · the case is quiet', standing: { guild: -1 } }, lose: { text: 'Pulling it sets off an alarm · the case is slag', heat: 0.15, unflag: 'case', drop: 'case' } },
      { id: 'keep', label: 'Keep it as it is', tone: 'help', hint: 'You made a promise.', win: { text: 'The case keeps pinging', heat: 0.18 } },
    ],
  },
  {
    id: 'freighter_thanks', kind: 'trade', caller: 'guild', trigger: 'follow',
    from: 'Guild freighter · Long Reckoning', title: 'The Guild pays its debts',
    text: '“Long Reckoning, still in one piece thanks to you. Take this. The Guild will hear your name.”',
    cargo: 'A freighter, grateful',
    choices: [
      { id: 'krail', label: 'Take the Cyrite', tone: 'trade', hint: 'Eight Cyrite.', win: { text: 'Eight Cyrite from the Long Reckoning', cyrite: 8, standing: { guild: 2 } } },
      { id: 'chits', label: 'Take the Cyrite', tone: 'trade', hint: 'Ten Cyrite.', win: { text: 'Ten Cyrite from the Long Reckoning', chits: 50, standing: { guild: 2 } } },
    ],
  },
  {
    id: 'pod_thanks', kind: 'plea', caller: 'frontier', trigger: 'follow', when: { flag: 'pod' },
    from: 'The survivor · Ares Drive technician', title: 'Let me help',
    text: '“You didn’t have to stop. I fix drives for a living. Let me look at your ship.”',
    cargo: 'One technician, recovering',
    choices: [
      { id: 'hull', label: 'Patch the hull', tone: 'help', hint: 'A plate, and some supplies saved.', win: { text: 'Hull patched by your passenger', plates: 1, supplies: 3 } },
      { id: 'drop', label: 'Drop them at the dock', tone: 'help', hint: 'Ares Drive will be grateful.', win: { text: 'They will wait for the dock', standing: { frontier: 2 }, job: { id: 'tech', text: 'Take the technician to the dock', at: 'port', pay: { text: 'Technician home · Ares Drive pays', chits: 40, standing: { frontier: 1 } } } } },
    ],
  },

  // ── notice: the factions that have marked you ──────────────────────────
  {
    id: 'custody_bulletin', kind: 'warning', caller: 'custody', when: { after: 30, notice: ['custody', 'warning'] }, weight: 1.2, repeat: true,
    from: 'Custody bulletin · all channels', title: 'Report this hull',
    text: '“All traffic: stolen Obedience-class hauler. Pilot armed and dangerous. Report sightings to Custody.”',
    lines: [
      { if: { notice: ['custody', 'hunters'] }, text: 'There’s a bounty on it now, and the names of the hunters after it.' },
      { if: { notice: ['custody', 'captain'] }, text: 'It is signed by {captain}.' },
    ],
    cargo: 'A broadcast · every receiver in the system',
    choices: [
      { id: 'quiet', label: 'Go quiet', tone: 'refuse', hint: 'Kill the chatter and let it pass.', win: { text: 'Running quiet', heat: -0.05 } },
      { id: 'jam', label: 'Garble the bulletin', tone: 'bluff', hint: 'Scramble the relay so the next system hears less.', needs: { fitted: ['ut_scanner', 'tech_office'] }, win: { text: 'The bulletin goes out as noise', notice: { custody: -3 } } },
      { id: 'answer', label: 'Answer it', tone: 'help', hint: 'Tell everyone what Kellern did. The miners will hear. So will the Custody.', win: { text: 'Your answer goes out on every channel', standing: { miners: 1 }, notice: { custody: 2 }, heat: 0.08 } },
    ],
  },
  {
    id: 'gutter_word', kind: 'warning', caller: 'gutter', when: { after: 30, notice: ['gutter', 'warning'] }, weight: 1.2, repeat: true,
    from: 'The Gutter band · a voice you do not know', title: 'Crews talk',
    text: '“So you’re the one killing crews. Somebody will want paying for that.”',
    lines: [
      { if: { notice: ['gutter', 'hunters'] }, text: '“There’s a price on your ship in every bar from here to the Threshold.”' },
      { if: { standing: ['gutter', 1] }, text: '“Some say you did right by the Leaky Tin. Not enough of them.”' },
    ],
    cargo: 'The Gutter band · rumour and threat',
    choices: [
      { id: 'pay', label: 'Pay blood money', tone: 'pay', hint: 'Cyrite to the families. It buys some quiet.', cost: { chits: 20 }, win: { text: 'Blood money paid', notice: { gutter: -4 }, standing: { gutter: 1 } } },
      { id: 'boast', label: '“Tell them to come and try”', tone: 'fight', hint: 'They will.', win: { text: 'The band goes quiet · then very busy', notice: { gutter: 2 }, spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }] } },
      { id: 'ignore', label: 'Stay silent', tone: 'refuse', hint: 'Words are cheap.', win: { text: 'Channel closed' } },
    ],
  },
  // the captains themselves speak on cards built from content/captains.ts (sim/captains.ts captainCard)

  // Calloway's offers (content/calloway.ts); her last meeting is built from her file (sim/calloway.ts finaleCard)
  ...OFFERS,

  // the story beats, one a sortie through the Run (content/story.ts)
  ...STORY_CARDS,
  REGISTRY_CARD,

  // what is going on in a system: the calls situations make (content/situations.ts)
  ...SCENE_CARDS,
];
