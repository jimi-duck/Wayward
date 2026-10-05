import type { CardDef } from '../sim/comms';
import { CALLOWAY_FACE, OFFERS } from './calloway';
import { STORY_CARDS } from './story';

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
  fee_known: 'word that the lane captain takes fees',
  freqs: 'the Office frequency list',
  forger_known: 'a name at Frontier Supply',
  news: 'fresh news of the lanes',
  gutter_friend: 'a friend in the Gutter',
};

export const CARDS: CardDef[] = [
  // ── the checkpoint: the lane mouth ──────────────────────────────────────
  {
    id: 'checkpoint', kind: 'checkpoint', caller: 'custody', trigger: 'lane',
    from: 'Custody blockade · lane mouth control', title: 'Your ID doesn’t match the registry',
    text: '“Hauler, your transponder says Obedience Heavy Lift. Your hull says otherwise. Heave to for inspection.”',
    lines: [
      { if: { heatMin: 0.7 }, text: 'Your face is on every board in the system.' },
      { if: { heatMax: 0.3 }, text: 'She sounds bored. Nobody has told her who you are yet.' },
      { if: { flag: 'passengers' }, text: 'The family in the hold will not survive a scan.' },
      { if: { flag: 'codes' }, text: 'The forged codes are loaded.' },
      { if: { flag: 'fee_known' }, text: 'They say she takes a fee.' },
      { if: { notice: ['custody', 'toll'] }, text: 'Your file has a surcharge on it.' },
    ],
    ships: [{ variant: 'lancer', n: 1 }, { variant: 'picket', n: 2 }], cargo: 'Custody blockade cutter, full magazines',
    fee: { base: 40, heat: 60, flags: { fee_known: 0.6 } },
    truths: [
      { id: 'corrupt', weight: 1, read: 'Her log shows fees waved through all week', boost: { if: { flag: 'fee_known' }, mult: 3 } },
      { id: 'by_book', weight: 1.2, read: 'Clean record · a captain who goes by the book' },
    ],
    choices: [
      {
        id: 'run', label: 'Run it', tone: 'run', hint: 'Make for the lane under her guns. She and her wing chase you, and her interdiction field doubles the spool.',
        win: { text: 'Running the blockade · the whole system is coming', blockade: 'run' },
      },
      {
        id: 'spoof', label: 'Spoof the registration', tone: 'bluff', hint: 'Send the forged codes and hope they are good.',
        show: { flag: 'codes' }, odds: { base: 0.8, heat: -0.25, flags: { codes_bad: -0.6, freqs: 0.1 } },
        win: { text: 'Registry match · she waves you through', blockade: 'pass', heat: -0.1 },
        lose: { text: 'The codes are flagged · she opens fire', blockade: 'fight', heat: 0.1 },
      },
      {
        id: 'rig', label: 'Rig the transponder', tone: 'bluff', hint: 'Burn parts into a ghost registration. A long shot when they are looking for you.',
        show: { noFlag: 'codes' }, cost: { parts: 8 }, odds: { base: 0.45, heat: -0.3, flags: { freqs: 0.2 }, fitted: { ut_scanner: 0.1, tech_custody: 0.3 } },
        win: { text: 'Ghost registration holds · through the lane', blockade: 'pass' },
        lose: { text: 'The ghost does not hold · she opens fire', blockade: 'fight', heat: 0.1 },
      },
      {
        id: 'pay', label: 'Pay the inspection fee', tone: 'pay', hint: 'A captain who takes fees lets you through. One who does not takes it anyway.',
        cost: { chits: 'fee' }, loseIf: ['by_book'],
        win: { text: 'Fee received · the scan finds nothing', blockade: 'pass' },
        lose: { text: 'She takes the fee and orders the scan anyway', blockade: 'fight' },
      },
      {
        id: 'talk', label: 'Talk your way through', tone: 'bluff', hint: 'A miner on a sanctioned run, papers to follow. Easier before they know your face.',
        odds: { base: 0.6, heat: -0.55, standing: { custody: 0.12 }, flags: { passengers: -0.15, calloway_lied: -0.1 } },
        win: { text: 'She buys it · clear the lane', blockade: 'pass' },
        lose: { text: '“Nice try, Wayward.” · she opens fire', blockade: 'fight', heat: 0.05 },
      },
      {
        id: 'fight', label: 'Fight', tone: 'fight', hint: 'She holds the lane with her wing. Break her and the way is clear, with her wreck to pick over.',
        win: { text: 'Weapons hot · breaking the blockade', blockade: 'fight' },
      },
    ],
  },

  // ── the port's approach ─────────────────────────────────────────────────
  {
    id: 'port_check', kind: 'checkpoint', caller: 'frontier', trigger: 'port', when: { kind: 'home' },
    from: 'Frontier Supply · dock control', title: 'Implant scan before docking',
    text: '“New rule from the moon, hauler. Everyone gets scanned before the clamps go on.” The dockmaster does not sound happy about it.',
    lines: [
      { if: { heatMin: 0.5 }, text: 'There is a Custody notice on their board. It has your hull on it.' },
      { if: { standing: ['frontier', 1] }, text: '“You did right by us. Maybe the scanner has a fault today.”' },
    ],
    cargo: 'Fuel dock · two tugs · one scanner', fee: { base: 20, heat: 30 },
    truths: [
      { id: 'sympathetic', weight: 1.4, read: 'Dock chatter: nobody here likes the new rule', boost: { if: { standing: ['frontier', 1] }, mult: 3 } },
      { id: 'informer', weight: 1, read: 'The dockmaster’s line runs straight to the moon' },
    ],
    choices: [
      {
        id: 'scan', label: 'Take the scan', tone: 'bluff', hint: 'If the dockmaster looks away, nothing happens.',
        loseIf: ['informer'],
        win: { text: 'The scanner has a fault today · clamps on' },
        lose: { text: 'Scan logged and sent to the moon', heat: 0.15 },
      },
      {
        id: 'bribe', label: 'Pay for a faulty scanner', tone: 'pay', hint: 'Money settles most things on a fuel dock.',
        cost: { chits: 'fee' },
        win: { text: 'Paid · the scanner is down for maintenance', standing: { frontier: 1 } },
      },
      {
        id: 'spoof', label: 'Send the forged codes', tone: 'bluff', hint: 'A clean ID for a scanner that wants one.',
        needs: { flag: 'codes' }, odds: { base: 0.85, flags: { codes_bad: -0.6 } },
        win: { text: 'Codes accepted · welcome to Frontier Supply' },
        lose: { text: 'The codes bounce · the scan goes to the moon anyway', heat: 0.15 },
      },
      {
        id: 'refuse', label: 'Refuse the scan', tone: 'refuse', hint: 'Dock anyway and let them make a fuss.',
        win: { text: 'Docking unscanned · the fuss reaches the moon', heat: 0.08, standing: { frontier: -1 } },
      },
    ],
  },

  // ── trade ───────────────────────────────────────────────────────────────
  {
    id: 'ore_buyer', kind: 'trade', caller: 'guild', when: { ore: 12, after: 40 }, weight: 1.3, repeat: true,
    from: 'Dust Traders Guild · skiff Patience', title: 'Ore, cash on the hull',
    text: '“That hold sits low, friend. Three chits an ore, better than the dock pays, and no questions about where you cut it.”',
    lines: [{ if: { holdFull: true }, text: 'You are nearly full. Ore you cannot carry is ore you leave in the rock.' }],
    ships: [{ variant: 'freighter', n: 1 }], cargo: 'Guild skiff · empty hold, full purse',
    truths: [
      { id: 'honest', weight: 4, read: 'Guild-registered · trades out here every week' },
      { id: 'informant', weight: 1, read: 'Her transponder pings a Custody relay every minute' },
    ],
    choices: [
      {
        id: 'sell', label: 'Sell the hold', tone: 'trade', hint: 'Three chits an ore, all of it.', cost: { ore: 'all' }, loseIf: ['informant'],
        win: { text: 'Hold sold to the Guild', sell: 3, standing: { guild: 1 } },
        lose: { text: 'Hold sold · and your position sold on', sell: 3, heat: 0.12 },
      },
      {
        id: 'half', label: 'Sell half', tone: 'trade', hint: 'Keep some for the dock and the rail.', cost: { ore: 'half' }, loseIf: ['informant'],
        win: { text: 'Half the hold sold to the Guild', sell: 3 },
        lose: { text: 'Half sold · and your position sold on', sell: 3, heat: 0.12 },
      },
      { id: 'no', label: 'Not today', tone: 'refuse', hint: 'Keep the ore.', win: { text: 'The skiff peels away' } },
    ],
  },
  {
    id: 'krail_seller', kind: 'trade', caller: 'miners', when: { after: 60, short: true }, weight: 1.2, repeat: true,
    from: 'Independent prospector · Old Hesketh', title: 'Krail, a little cut',
    text: '“Four Krail, raw out of the vein. Twenty-five chits or a dozen ore. You look like you need it.” You are {short} short of the jump.',
    ships: [], cargo: 'Prospector’s tug · a few crates',
    truths: [
      { id: 'pure', weight: 2, read: 'Spectral read: clean violet, full grade' },
      { id: 'cut', weight: 1, read: 'Spectral read: half of it is coloured slag' },
    ],
    choices: [
      {
        id: 'chits', label: 'Pay chits', tone: 'pay', hint: 'Four Krail for twenty-five.', cost: { chits: 25 }, loseIf: ['cut'],
        win: { text: 'Four Krail aboard', krail: 4, standing: { miners: 1 } },
        lose: { text: 'Half of it is slag · two Krail', krail: 2 },
      },
      {
        id: 'ore', label: 'Trade ore', tone: 'trade', hint: 'A dozen ore for the four.', cost: { ore: 12 }, loseIf: ['cut'],
        win: { text: 'Four Krail aboard', krail: 4, standing: { miners: 1 } },
        lose: { text: 'Half of it is slag · two Krail', krail: 2 },
      },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Cut your own.', win: { text: 'Hesketh signs off' } },
    ],
  },
  {
    id: 'ares_tender', kind: 'trade', caller: 'frontier', when: { after: 90, ore: 8 }, repeat: true,
    from: 'Ares Drive · service tender', title: 'Parts for ore',
    text: '“Ares Drive, parts and services. We are short of feedstock and long on spares. Ten ore gets you six parts, or forty chits patches a plate here and now.”',
    lines: [{ if: { hurt: true }, text: 'Your hull is open to space in two places. They can see it from here.' }],
    ships: [{ variant: 'freighter', n: 1 }], cargo: 'Service tender · spares racks',
    choices: [
      { id: 'parts', label: 'Ten ore for six parts', tone: 'trade', hint: 'Parts patch plates when it is quiet.', cost: { ore: 10 }, win: { text: 'Six parts aboard', parts: 6 } },
      { id: 'patch', label: 'Patch a plate', tone: 'pay', hint: 'Forty chits, done now.', show: { hurt: true }, cost: { chits: 40 }, win: { text: 'Plate welded on by Ares Drive', plates: 1 } },
      { id: 'no', label: 'No thanks', tone: 'refuse', hint: 'Keep what you have.', win: { text: 'The tender moves on' } },
    ],
  },
  {
    id: 'fuel_runner', kind: 'trade', caller: 'gutter', when: { after: 120, short: true, heatMin: 0.2 }, repeat: true,
    from: 'Fuel runner · call sign Tallow', title: 'Topped up, at a price',
    text: '“Heard a hauler’s running dry out here. Six Krail. Fifty chits, or a favour later. Your call, Wayward.”',
    lines: [{ if: { flag: 'gutter_friend' }, text: '“Friend of a friend. I will go easy.”' }],
    cargo: 'Runner’s skiff · tanks sloshing',
    choices: [
      { id: 'pay', label: 'Fifty chits', tone: 'pay', hint: 'Clean, done.', cost: { chits: 50 }, win: { text: 'Six Krail aboard', krail: 6 } },
      {
        id: 'favour', label: 'A favour later', tone: 'help', hint: 'Krail now. The bill comes when it comes.',
        win: { text: 'Six Krail aboard · Tallow will call', krail: 6, flag: 'owes_runner', follow: { card: 'runner_favour', after: 60 } },
      },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'You will find your own.', win: { text: 'Tallow laughs and cuts the channel' } },
    ],
  },
  {
    id: 'forger', kind: 'trade', caller: 'unknown', when: { flag: 'forger_known', noFlag: 'codes' }, weight: 3,
    from: 'A name at Frontier Supply', title: 'Clean codes, lightly used',
    text: '“Registry codes off a hauler the company wrote off. They will pass a lane scan, mostly. Forty chits.”',
    cargo: 'A data spike, warm from somebody’s pocket',
    truths: [
      { id: 'real', weight: 3, read: 'The checksum matches an Obedience-class registry' },
      { id: 'fake', weight: 1, read: 'The checksum is hand-patched' },
    ],
    choices: [
      {
        id: 'buy', label: 'Buy the codes', tone: 'pay', hint: 'Spoofing a scan goes from long shot to likely.', cost: { chits: 40 }, loseIf: ['fake'],
        win: { text: 'Forged codes loaded', flag: 'codes' },
        lose: { text: 'Codes loaded · something about them is off', flag: ['codes', 'codes_bad'] },
      },
      { id: 'no', label: 'Not now', tone: 'refuse', hint: 'Keep the chits.', win: { text: 'The name goes quiet' } },
    ],
  },

  // ── pleas ───────────────────────────────────────────────────────────────
  {
    id: 'stowaways', kind: 'plea', caller: 'miners', when: { kind: 'home', after: 30, heatMax: 0.6 }, weight: 1.2,
    from: 'Shift worker · Kellern habitat 4', title: 'Take my family out',
    text: '“You are the one who took the hauler. Everybody knows. I have two kids and a quota I will never make. Please.”',
    cargo: 'A tug with three people in it',
    choices: [
      {
        id: 'take', label: 'Take them', tone: 'help', hint: 'They ride in the hold to the lane. The Custody will want them back.',
        win: { text: 'Three aboard · the hold is a little warmer', flag: 'passengers', standing: { miners: 2 }, heat: 0.05, follow: { card: 'custody_demand', after: 50 }, job: { id: 'passengers', text: 'Get the family through the lane', at: 'lane', pay: { text: 'The family is through the lane', score: 3000, standing: { miners: 1 }, unflag: 'passengers' } } },
      },
      { id: 'no', label: 'I cannot', tone: 'refuse', hint: 'You have enough on board.', win: { text: 'The tug turns back for the habitat' } },
    ],
  },
  {
    id: 'foreman', kind: 'plea', caller: 'kellern', when: { kind: 'home', after: 70 },
    from: 'Kellern Mining · Foreman Draper', title: 'Bring her back',
    text: '“Bring the hauler back and I will say you were coerced. A docked wage, a warning. Run, and it is Custody business.”',
    lines: [{ if: { flag: 'passengers' }, text: '“And bring back the Okafor family while you are at it.”' }],
    cargo: 'Mining office channel',
    choices: [
      { id: 'stall', label: 'Ask for time', tone: 'bluff', hint: 'Say you are thinking. It buys quiet, for a while.', win: { text: 'Draper calls off the search, for now', heat: -0.12, flag: 'stalled', follow: { card: 'foreman_again', after: 70 } } },
      { id: 'tell', label: 'Tell him about the archive', tone: 'help', hint: 'He might be on your side. He might not.', win: { text: 'Draper goes very quiet', standing: { miners: 1, kellern: -1 }, heat: 0.08 } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Nothing to say to him.', win: { text: 'Channel closed' } },
    ],
  },
  {
    id: 'hungry_crew', kind: 'plea', caller: 'gutter', when: { after: 50, krail: 4 }, repeat: true,
    from: 'Gutter crew · the Leaky Tin', title: 'We are out of everything',
    text: '“Reactor is dying and so are we. Three Krail would get us to the belt. We will remember it.”',
    ships: [{ variant: 'scout', n: 2 }], cargo: 'Two fighters running on fumes',
    truths: [
      { id: 'genuine', weight: 2, read: 'Their reactors read near cold' },
      { id: 'bait', weight: 1, read: 'Their reactors are hot · they are waiting for you to slow' },
    ],
    choices: [
      {
        id: 'give', label: 'Give them three Krail', tone: 'help', hint: 'A friend in the Gutter is worth something out here.', cost: { krail: 3 }, loseIf: ['bait'],
        win: { text: 'The Leaky Tin limps off · the Gutter will remember', standing: { gutter: 2 }, flag: 'gutter_friend' },
        lose: { text: 'They take it and come about, guns up', spawn: [{ variant: 'scout', n: 2, from: 'ahead' }] },
      },
      {
        id: 'shop', label: 'Fix their recycler', tone: 'help', hint: 'Two parts, not Krail.', needs: { fitted: 'md_shop' }, cost: { parts: 2 }, loseIf: ['bait'],
        win: { text: 'Fixed · a friend in the Gutter', standing: { gutter: 2 }, flag: 'gutter_friend' },
        lose: { text: 'Bait · they rush you', spawn: [{ variant: 'scout', n: 2, from: 'ahead' }] },
      },
      { id: 'no', label: 'Keep your Krail', tone: 'refuse', hint: 'You need every unit.', win: { text: 'The Leaky Tin drifts on' } },
      { id: 'fight', label: 'Finish them', tone: 'fight', hint: 'Two easy kills and whatever they carry.', win: { text: 'Weapons hot on the Leaky Tin', spawn: [{ variant: 'scout', n: 2, from: 'ahead' }], standing: { gutter: -1 } } },
    ],
  },
  {
    id: 'pod', kind: 'plea', caller: 'miners', when: { after: 100 }, repeat: true,
    from: 'Life pod · automatic', title: 'One aboard, injured',
    text: 'A pod tumbles out of the dust, its beacon on a loop: one survivor, injured, an Ares Drive tag on the hatch.',
    cargo: 'One person, one tag',
    choices: [
      { id: 'take', label: 'Bring the pod aboard', tone: 'help', hint: 'It takes a minute, and you will have to look after them.', win: { text: 'Pod aboard · the survivor is stable', flag: 'pod', follow: { card: 'pod_thanks', after: 45 } } },
      { id: 'strip', label: 'Strip the pod', tone: 'trade', hint: 'Parts are parts.', win: { text: 'Pod stripped · four parts', parts: 4, standing: { miners: -1 } } },
      { id: 'leave', label: 'Leave it', tone: 'refuse', hint: 'Someone else will come.', win: { text: 'The beacon fades behind you' } },
    ],
  },

  // ── jobs ────────────────────────────────────────────────────────────────
  {
    id: 'haul_job', kind: 'job', caller: 'frontier', when: { kind: 'home', after: 35 }, weight: 1.2,
    from: 'Frontier Supply · stores', title: 'Feedstock wanted',
    text: '“We cannot get ore past the Custody line any more. Bring fifteen to the dock and we pay sixty, plus our goodwill.”',
    cargo: 'Fuel dock stores · running low',
    choices: [
      { id: 'take', label: 'Take the job', tone: 'help', hint: 'Fifteen ore at the dock: sixty chits.', win: { text: 'Job taken: fifteen ore to Frontier Supply', job: { id: 'haul', text: 'Fifteen ore to Frontier Supply', at: 'port', give: { ore: 15 }, pay: { text: 'Feedstock delivered · sixty chits', chits: 60, standing: { frontier: 1 } } } } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'No promises.', win: { text: 'Stores signs off' } },
    ],
  },
  {
    id: 'salvage_job', kind: 'job', caller: 'frontier', when: { after: 80 }, repeat: true,
    from: 'Ares Drive · salvage desk', title: 'Wreck tags',
    text: '“Custody hulls are full of good parts. Bring ten to the dock and we pay fifty. We do not ask how you got them.”',
    cargo: 'Salvage desk',
    choices: [
      { id: 'take', label: 'Take the job', tone: 'help', hint: 'Ten parts at the dock: fifty chits.', win: { text: 'Job taken: ten parts to Ares Drive', job: { id: 'salvage', text: 'Ten parts to the dock', at: 'port', give: { parts: 10 }, pay: { text: 'Parts delivered · fifty chits', chits: 50, standing: { frontier: 1 } } } } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Parts patch your own hull.', win: { text: 'The desk signs off' } },
    ],
  },
  {
    id: 'courier', kind: 'job', caller: 'guild', when: { after: 55 }, repeat: true,
    from: 'Dust Traders Guild · courier', title: 'A sealed case',
    text: '“A case for the far side of the lane. Do not open it. Eight Krail now, the rest when you are through.”',
    cargo: 'A case, sealed, heavier than it looks',
    truths: [
      { id: 'clean', weight: 3, read: 'The case is dead to every band' },
      { id: 'tracker', weight: 2, read: 'Something in the case is warm on a Custody band' },
    ],
    choices: [
      {
        id: 'take', label: 'Carry it', tone: 'help', hint: 'Eight Krail now; paid again at the lane.', loseIf: ['tracker'],
        win: { text: 'Case aboard · eight Krail', krail: 8, flag: 'case', job: { id: 'case', text: 'Carry the case through the lane', at: 'lane', pay: { text: 'The case is through · the Guild pays the rest', score: 2500, standing: { guild: 2 }, unflag: 'case' } } },
        lose: { text: 'Case aboard · eight Krail', krail: 8, flag: 'case', follow: { card: 'tracker_found', after: 30 }, job: { id: 'case', text: 'Carry the case through the lane', at: 'lane', pay: { text: 'The case is through · the Guild pays the rest', score: 2500, standing: { guild: 2 }, unflag: 'case' } } },
      },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Not your business.', win: { text: 'The courier finds someone else' } },
    ],
  },
  {
    id: 'decoy', kind: 'job', caller: 'gutter', when: { kind: 'home', after: 140, heatMax: 0.75 },
    from: 'Gutter fixer · Mags', title: 'Light up and draw them off',
    text: '“We have a run going past the moon. Light your transponder for a minute, draw the patrols off it. Ten Krail.”',
    lines: [{ if: { flag: 'gutter_friend' }, text: '“The Leaky Tin says you are good for it.”' }],
    cargo: 'Fixer’s channel',
    choices: [
      { id: 'take', label: 'Light up', tone: 'help', hint: 'Ten Krail, and every patrol knows where you are.', win: { text: 'Transponder lit · ten Krail · they are coming', krail: 10, heat: 0.18, standing: { gutter: 1 } } },
      { id: 'no', label: 'Stay dark', tone: 'refuse', hint: 'You are not their decoy.', win: { text: 'Mags shrugs and cuts the channel' } },
    ],
  },

  // ── warnings ────────────────────────────────────────────────────────────
  {
    id: 'sweep_warning', kind: 'warning', caller: 'miners', when: { kind: 'home', after: 45, heatMin: 0.15 },
    from: 'An old shift partner', title: 'A sweep is coming',
    text: '“Juno, it’s Sol. There is a sweep coming off the moon. I can send you their pattern, if you can spare something for it.”',
    cargo: 'A private channel',
    truths: [
      { id: 'true', weight: 3, read: 'Sol’s channel is clean' },
      { id: 'plant', weight: 1, read: 'Sol’s channel routes through an Office relay' },
    ],
    choices: [
      {
        id: 'pay', label: 'Pay for the pattern', tone: 'pay', hint: 'Fifteen chits, and you slip the sweep.', cost: { chits: 15 }, loseIf: ['plant'],
        win: { text: 'Sweep pattern loaded · you slip past it', heat: -0.15, standing: { miners: 1 } },
        lose: { text: 'The pattern was bait · they knew where you would be', heat: 0.12 },
      },
      {
        id: 'ask', label: 'Ask as a friend', tone: 'bluff', hint: 'Sol owes you. Maybe.', loseIf: ['plant'], odds: { base: 0.5, standing: { miners: 0.15 } },
        win: { text: 'Sol sends it anyway · you slip the sweep', heat: -0.15 },
        lose: { text: 'Sol goes quiet', heat: 0 },
      },
      { id: 'no', label: 'Thank Sol', tone: 'refuse', hint: 'You will take your chances.', win: { text: 'Channel closed' } },
    ],
  },
  {
    id: 'office_watch', kind: 'warning', caller: 'unknown', when: { after: 110, noFlag: 'freqs' },
    from: 'A scrambled voice', title: 'The Office is listening',
    text: '“The Office of Peace sits on every channel near the lane mouth. I sell the list of their frequencies. Twenty chits.”',
    cargo: 'A scrambled channel',
    truths: [
      { id: 'real', weight: 3, read: 'Carrier wave from the port’s own antenna' },
      { id: 'scam', weight: 1, read: 'The voice is a recording on a loop' },
    ],
    choices: [
      {
        id: 'buy', label: 'Buy the list', tone: 'pay', hint: 'Any bluff at the lane goes better.', cost: { chits: 20 }, loseIf: ['scam'],
        win: { text: 'Office frequencies loaded', flag: 'freqs' },
        lose: { text: 'The list is garbage · twenty chits gone' },
      },
      { id: 'no', label: 'Ignore it', tone: 'refuse', hint: 'Everyone sells something.', win: { text: 'The voice cuts out' } },
    ],
  },
  {
    id: 'calloway', kind: 'warning', caller: 'calloway', when: { after: 150 }, weight: 2, face: CALLOWAY_FACE,
    from: 'Prefect Idris Calloway · Office of Peace', title: 'Come home, Juno',
    text: '“Juno. This is Idris Calloway. I am not your enemy. Whatever you found in that archive, it is not worth your life. Tell me where you are going.”',
    lines: [
      { if: { flag: 'passengers' }, text: '“And the Okafors. They have children, Juno.”' },
      { if: { heatMin: 0.7 }, text: '“You are making a great deal of noise for someone who wants to disappear.”' },
    ],
    cargo: 'A Prefect’s channel · priority override',
    choices: [
      { id: 'lie', label: 'Lie about your heading', tone: 'bluff', hint: 'Send her the wrong way.', odds: { base: 0.5, heat: -0.3, learn: 'lie' }, win: { text: 'Calloway reroutes her search', heat: -0.15, hunt: 1, flag: 'calloway_lied' }, lose: { text: '“You were always a poor liar.”', heat: 0.1, hunt: -0.5, flag: 'calloway_lied' } },
      { id: 'answer', label: 'Tell her the truth', tone: 'help', hint: 'About the archive. See what she says.', win: { text: 'A long silence on the channel', heat: 0.05, score: 500, flag: 'calloway_told' } },
      { id: 'silence', label: 'Say nothing', tone: 'refuse', hint: 'She is triangulating while you listen.', win: { text: 'You cut the channel before she finishes', heat: 0.03 } },
    ],
  },

  // ── shakedowns ──────────────────────────────────────────────────────────
  {
    id: 'gutter_toll', kind: 'shakedown', caller: 'gutter', when: { after: 75 }, weight: 1.3, repeat: true,
    from: 'Raiders · the Hollow Saints', title: 'Krail or your hull',
    text: '“Nice hauler. Four Krail and you keep it.”',
    lines: [
      { if: { holdFull: true }, text: '“Or the hold. We can see how low you sit.”' },
      { if: { flag: 'gutter_friend' }, text: 'Their leader hesitates: the Leaky Tin vouched for you.' },
      { if: { short: true }, text: 'You cannot spare Krail and still make the jump.' },
    ],
    ships: [{ variant: 'raptor', n: 2 }, { variant: 'scout', n: 1 }], cargo: 'Raiders · empty holds, full guns',
    choices: [
      { id: 'pay', label: 'Pay four Krail', tone: 'pay', hint: 'Cheap, if you have it.', cost: { krail: 4 }, win: { text: 'The Saints take their toll and go' } },
      { id: 'ore', label: 'Dump the hold', tone: 'pay', hint: 'Ore is heavier than Krail, and worth less to you.', cost: { ore: 'all' }, show: { ore: 1 }, win: { text: 'Hold dumped · the Saints scoop it up' } },
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
    text: '“Hauler, you are cutting rock without a Kellern licence. That is a {fee}-chit fine, payable now. Or we can do this at the moon.”',
    lines: [{ if: { heatMax: 0.25 }, text: 'He has not matched your hull to the notice. He just wants the money.' }],
    ships: [{ variant: 'picket', n: 2 }], cargo: 'Patrol pair · a pilot with a quota',
    fee: { base: 20, heat: 40 },
    choices: [
      { id: 'pay', label: 'Pay the fine', tone: 'pay', hint: 'He goes away happy.', cost: { chits: 'fee' }, win: { text: 'Fine paid · PF-226 moves on', standing: { custody: 1 } } },
      { id: 'ore', label: 'Pay in ore', tone: 'pay', hint: 'Half the hold.', cost: { ore: 'half' }, show: { ore: 4 }, win: { text: 'He takes the ore and moves on' } },
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
    id: 'claim_jumpers', kind: 'shakedown', caller: 'kellern', when: { kind: 'home', ore: 15, after: 90 },
    from: 'Kellern claim enforcement', title: 'That ore is company property',
    text: '“Every rock in this belt belongs to Kellern Mining. Hand over the ore and we log it as recovered. Refuse, and we log you.”',
    ships: [{ variant: 'enforcer', n: 1 }, { variant: 'picket', n: 1 }], cargo: 'Claim enforcers · company colours',
    fee: { base: 30, heat: 30 },
    choices: [
      { id: 'hand', label: 'Hand it over', tone: 'pay', hint: 'The whole hold, and they forget you.', cost: { ore: 'all' }, win: { text: 'Ore surrendered · logged as recovered', heat: -0.05, standing: { kellern: 1 } } },
      { id: 'racks', label: 'Hand over half', tone: 'pay', hint: 'Half the hold.', needs: { fitted: 'md_racks' }, cost: { ore: 'half' }, win: { text: 'Half handed over', heat: -0.05, standing: { kellern: 1 } } },
      { id: 'bribe', label: 'Pay them off', tone: 'pay', hint: 'Company men are paid badly.', cost: { chits: 'fee' }, win: { text: 'Paid off · they never saw you' } },
      { id: 'fight', label: 'Fight', tone: 'fight', hint: 'An enforcer and a picket.', win: { text: 'Weapons hot on the claim enforcers', spawn: [{ variant: 'enforcer', n: 1 }, { variant: 'picket', n: 1 }], heat: 0.05, standing: { kellern: -1 } } },
    ],
  },
  {
    id: 'office_ambush', kind: 'shakedown', caller: 'office', when: { after: 160, heatMin: 0.35 }, repeat: true,
    from: 'Office of Peace · unregistered', title: 'Cut your drive',
    text: 'Three hulls decloak around you. “Wayward. Cut your drive and surrender the Krail.”',
    ships: [{ variant: 'whisper', n: 3 }], cargo: 'Ambush fighters · no markings',
    slow: { timeout: 2.5, default: 'fight' },
    arrive: { text: 'Ambush · three hulls decloak', spawn: [{ variant: 'whisper', n: 3, from: 'around' }] },
    choices: [
      { id: 'surrender', label: 'Surrender half the Krail', tone: 'pay', hint: 'They take it and vanish. You may not make the jump.', cost: { krail: 'half' }, win: { text: 'Krail surrendered · they cloak and go', dismiss: true } },
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
        win: { text: 'Persistence stabilised · they share spares', parts: 6, plates: 1, standing: { miners: 1 } },
        lose: { text: 'Bait · raiders out from behind the rock', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 1, from: 'ahead' }] },
      },
      {
        id: 'drone', label: 'Send a repair drone', tone: 'help', hint: 'Costs parts; you never get close enough to be caught.', cost: { parts: 3 }, loseIf: ['ambush'],
        win: { text: 'The drone patches them up · they send Krail', krail: 3, standing: { miners: 1 } },
        lose: { text: 'The drone is shot to pieces · nobody was dying' },
      },
      {
        id: 'tow', label: 'Tow them clear', tone: 'help', hint: 'Tractor them out.', needs: { fitted: 'md_tractor' }, loseIf: ['ambush'],
        win: { text: 'Towed clear · parts and ore', parts: 4, ore: 8, standing: { miners: 2 } },
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
      { id: 'no', label: 'Stay clear', tone: 'refuse', hint: 'You cannot save everyone.', win: { text: 'The Long Reckoning’s call goes silent', standing: { guild: -1 } } },
    ],
  },
  {
    id: 'distress_custody', kind: 'distress', caller: 'custody', when: { after: 130 }, repeat: true,
    from: 'Custody picket · PF-301, crippled', title: 'Help us',
    text: '“Any ship. PF-301, drive gone, life support failing. Two crew.” They are Custody. They are dying.',
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
      { id: 'strip', label: 'Strip the wreck', tone: 'trade', hint: 'Custody parts are good parts.', win: { text: 'Wreck stripped · eight parts', parts: 8, heat: 0.08, standing: { custody: -1 } } },
      { id: 'no', label: 'Leave them', tone: 'refuse', hint: 'Someone will come for them. Someone always does.', win: { text: 'You leave PF-301 to its own' } },
    ],
  },
  {
    id: 'beacon_cache', kind: 'distress', caller: 'unknown', when: { after: 85 }, repeat: true,
    from: 'Automated beacon', title: 'Cache, unclaimed',
    text: 'An old company beacon, still broadcasting a cache code: emergency Krail, for any miner in need.',
    cargo: 'A cache marker, forty years old',
    truths: [
      { id: 'real', weight: 1.6, read: 'The beacon’s clock has not been reset in forty years' },
      { id: 'lure', weight: 1, read: 'The beacon was serviced last week', boost: { if: { heatMin: 0.4 }, mult: 1.8 } },
    ],
    choices: [
      {
        id: 'go', label: 'Open the cache', tone: 'help', hint: 'Krail, if it is real.', loseIf: ['lure'],
        win: { text: 'Cache open · six Krail', krail: 6 },
        lose: { text: 'A lure · patrol fighters inbound', heat: 0.12, spawn: [{ variant: 'picket', n: 2, from: 'behind' }] },
      },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'Too good to be true.', win: { text: 'You leave the beacon calling' } },
    ],
  },

  // ── rumours ─────────────────────────────────────────────────────────────
  {
    id: 'rumour_seam', kind: 'rumour', caller: 'miners', when: { after: 20, heatMax: 0.5 }, weight: 1.4, repeat: true,
    from: 'A prospector on the open band', title: 'A seam off the line',
    text: '“Violet in the rock all round here, if you know where to cut. I will sell you the survey for ten chits.”',
    cargo: 'A survey file',
    truths: [
      { id: 'true', weight: 2, read: 'The survey matches the field around you' },
      { id: 'false', weight: 1, read: 'The survey is for another belt' },
    ],
    choices: [
      { id: 'buy', label: 'Buy the survey', tone: 'pay', hint: 'Veined rock all round for half a minute.', cost: { chits: 10 }, loseIf: ['false'], win: { text: 'Survey loaded · veined rock all round', seam: 30 }, lose: { text: 'The survey is for another belt' } },
      { id: 'trade', label: 'Trade ore for it', tone: 'trade', hint: 'Six ore.', cost: { ore: 6 }, loseIf: ['false'], win: { text: 'Survey loaded · veined rock all round', seam: 30 }, lose: { text: 'The survey is for another belt' } },
      { id: 'no', label: 'Pass', tone: 'refuse', hint: 'Cut what you find.', win: { text: 'The prospector moves on' } },
    ],
  },
  {
    id: 'rumour_forger', kind: 'rumour', caller: 'unknown', when: { kind: 'home', after: 45, noFlag: ['forger_known', 'codes'] },
    from: 'Bar talk on the port band', title: 'Someone does papers',
    text: '“...a woman at Frontier Supply does registry codes, if you can pay.”',
    cargo: 'Overheard',
    choices: [
      { id: 'note', label: 'Remember the name', tone: 'trade', hint: 'She may call later.', win: { text: 'A name at Frontier Supply', flag: 'forger_known' } },
      { id: 'intro', label: 'Pay for an introduction', tone: 'pay', hint: 'Ten chits, and she calls soon.', cost: { chits: 10 }, win: { text: 'Introduction paid for', flag: 'forger_known', follow: { card: 'forger', after: 12 } } },
      { id: 'no', label: 'Ignore it', tone: 'refuse', hint: 'Bar talk.', win: { text: 'The band moves on' } },
    ],
  },
  {
    id: 'rumour_captain', kind: 'rumour', caller: 'guild', when: { kind: 'home', after: 65, noFlag: 'fee_known' },
    from: 'A Guild pilot', title: 'The lane captain',
    text: '“The captain on the lane mouth? Word is she takes fees. Word is also she hanged the last one who tried it. Depends who you ask.”',
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
    from: 'Ore buyer’s chatter', title: 'A Prefect came through',
    text: '“A Prefect came down to the moon this morning. Office of Peace. She asked about you by name. Calloway.”',
    cargo: 'Gossip, frightened',
    choices: [
      { id: 'ask', label: 'Ask what she asked', tone: 'trade', hint: 'Five chits loosens a tongue.', cost: { chits: 5 }, win: { text: 'She asked where your family lives', flag: 'calloway_known' } },
      { id: 'quiet', label: 'Go quiet a while', tone: 'refuse', hint: 'Cut the transponder chatter.', win: { text: 'Running dark', heat: -0.05 } },
    ],
  },

  // ── the journey: Calloway in the system, open lanes, the Net, food ──────
  {
    id: 'calloway_here', kind: 'warning', caller: 'calloway', trigger: 'hunt', repeat: true, face: CALLOWAY_FACE,
    from: 'Prefect Idris Calloway · CCV Patience', title: 'There you are',
    text: '“Juno. I have been one system behind you for days, and I am tired. Power down, and nobody else needs to be hurt.”',
    lines: [
      { if: { flag: 'calloway_beaten' }, text: 'Her ship still carries the scars of the last time.' },
      { if: { flag: 'calloway_told' }, text: '“I read what you sent me. I want to hear it from you, in person.”' },
      { if: { flag: 'calloway_lied' }, text: '“You sent me the wrong way once. Not again.”' },
      { if: { netted: true }, text: 'The Net holds this system. Every buoy is hers.' },
      { if: { holdFull: true }, text: 'Your hold sits heavy. Ore might draw her eye for a moment.' },
      { if: { wise: ['decoy', 1] }, text: '“And do not dump your hold at me again. I know what ore pods look like now.”' },
      { if: { wise: ['dark', 1] }, text: 'Her sweep is tuned for a cold reactor this time.' },
      { if: { wise: ['run', 2] }, text: 'An interdictor flies with her. She has watched you run too often.' },
      { if: { hunch: 'straight' }, text: '“You never turn aside. I stopped following you and started waiting for you.”' },
    ],
    ships: [{ variant: 'lancer', n: 1 }, { variant: 'enforcer', n: 2 }], cargo: 'Office of Peace cutter · full magazines · a Prefect aboard',
    truths: [
      { id: 'patient', weight: 2, read: 'Her wing holds back · she wants you alive' },
      { id: 'tired', weight: 1, read: 'Her drive is running hot · she has pushed hard to get here', boost: { if: { flag: 'calloway_beaten' }, mult: 2 } },
    ],
    choices: [
      {
        id: 'run', label: 'Run for the lane', tone: 'run', hint: 'She and her wing come after you, and her field drags on the drive. Get through and she is still a system behind.',
        win: { text: 'Running · the Patience is on your tail', calloway: 'run' },
      },
      {
        id: 'decoy', label: 'Dump the hold as a decoy', tone: 'pay', hint: 'Ore pods spread a hauler’s signature. If she chases the pods, you gain a day.',
        cost: { ore: 'all' }, needs: { ore: 8 }, odds: { base: 0.6, flags: { calloway_lied: -0.2 }, fitted: { ut_scanner: 0.15 }, learn: 'decoy' },
        win: { text: 'She takes the pods · a day’s start', hunt: 1.5, heat: -0.2 },
        lose: { text: 'She ignores the pods and opens fire', calloway: 'fight' },
      },
      {
        id: 'talk', label: 'Tell her the file is already out', tone: 'bluff', hint: 'If she believes it, she has to stop and check. If not, she knows you are bluffing.',
        loseIf: ['patient'], odds: { base: 0.5, flags: { calloway_told: 0.2 }, learn: 'bluff' },
        win: { text: '“If that is true…” · she breaks off to check', hunt: 2, flag: 'calloway_lied' },
        lose: { text: '“No, Juno. You still have it.” · she opens fire', calloway: 'fight', flag: 'calloway_lied' },
      },
      {
        id: 'dark', label: 'Go dark', tone: 'bluff', hint: 'Kill the drive and the transponder, drift, and let her lose you.',
        needs: { fitted: ['ut_scanner', 'tech_office', 'md_baffles'] }, odds: { base: 0.7, heat: -0.3, fitted: { md_baffles: 0.1 }, learn: 'dark' },
        win: { text: 'Dark · she sweeps past you', hunt: 1, heat: -0.3 },
        lose: { text: 'Her sweep finds the heat of your reactor', calloway: 'fight' },
      },
      {
        id: 'fight', label: 'Turn and fight', tone: 'fight', hint: 'Break her ship and she loses days to repairs. She knows it too.',
        win: { text: 'Weapons hot on the Patience', calloway: 'fight' },
      },
    ],
  },
  {
    id: 'calloway_word', kind: 'warning', caller: 'calloway', when: { after: 40, hunted: 1 }, weight: 2, repeat: true, face: CALLOWAY_FACE,
    from: 'Prefect Idris Calloway · Office of Peace', title: 'One system behind',
    text: '“I am one lane behind you, Juno. I can see where you have been. Every system you stop in, I stop in.”',
    lines: [
      { if: { flag: 'calloway_told' }, text: '“I keep thinking about what you told me. It does not change what I have to do.”' },
      { if: { netted: true }, text: '“And the Net is already here. Where do you think you are going?”' },
      { if: { wise: ['lie', 2] }, text: '“And whatever heading you send me, I will check twice. You have lied to me before.”' },
      { if: { hunch: 'port' }, text: '“You like ports, Juno. So do I. I have been reading their dock logs.”' },
      { if: { hunch: 'mining' }, text: '“Another rock field? You are a creature of habit.”' },
      { if: { hunch: 'contested' }, text: '“You always go where the shooting is. It is like following a flare.”' },
      { if: { hunch: 'transit' }, text: '“The quiet lanes again. I have stopped asking where you went.”' },
    ],
    cargo: 'A Prefect’s channel · priority override',
    choices: [
      { id: 'lie', label: 'Send her a false heading', tone: 'bluff', hint: 'She checks what you tell her. Every lie costs her a day if it holds.', odds: { base: 0.45, heat: -0.2, learn: 'lie' }, win: { text: 'She turns for the wrong lane', hunt: 1, flag: 'calloway_lied' }, lose: { text: '“Wrong lane, Juno.” · she pushes harder', hunt: -0.5, flag: 'calloway_lied' } },
      { id: 'ask', label: 'Ask what she believes', tone: 'help', hint: 'She might tell you. She might be stalling.', win: { text: '“That it holds. That it has to.” · a long silence', score: 400, flag: 'calloway_told', heat: 0.04 } },
      { id: 'silence', label: 'Cut the channel', tone: 'refuse', hint: 'Every second you listen, she triangulates.', win: { text: 'Channel cut' } },
    ],
  },
  {
    id: 'lane_toll', kind: 'shakedown', caller: 'gutter', trigger: 'toll', when: { netted: false, kind: ['contested', 'mining', 'transit', 'port'] }, repeat: true,
    from: 'Raiders · the Lane Wardens', title: 'This lane has a keeper',
    text: '“Nobody uses the old lane without paying the keepers, hauler. {fee} chits, or four Krail, and you go through.”',
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
      { id: 'pay', label: 'Pay the toll', tone: 'pay', hint: 'Chits, and through.', cost: { chits: 'fee' }, loseIf: ['hungry'], win: { text: 'Toll paid · the Wardens wave you on', standing: { gutter: 1 } }, lose: { text: 'They take the chits and the guns come up anyway', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }] } },
      { id: 'krail', label: 'Pay in Krail', tone: 'trade', hint: 'Four Krail, if you can spare it.', cost: { krail: 4 }, win: { text: 'Four Krail across · through', standing: { gutter: 1 } } },
      { id: 'talk', label: 'Name a friend', tone: 'bluff', hint: 'Someone in the Gutter owes you, maybe.', odds: { base: 0.3, standing: { gutter: 0.25 }, flags: { gutter_friend: 0.3 } }, win: { text: '“Go on, then.” · through for nothing' }, lose: { text: '“Never heard of them.” · weapons hot', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }] } },
      { id: 'account', label: 'Bill the Guild', tone: 'trade', hint: 'Free passage.', needs: { fitted: 'md_ledger' }, win: { text: 'Billed · through', standing: { guild: 1 } } },
      { id: 'fight', label: 'Clear the lane', tone: 'fight', hint: 'Three light hulls between you and the jump.', win: { text: 'Clearing the lane', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }], standing: { gutter: -1 } } },
    ],
  },
  {
    id: 'port_scan', kind: 'checkpoint', caller: 'custody', trigger: 'port', when: { netted: true, kind: ['port', 'mining', 'contested'] }, repeat: true,
    from: 'Custody port authority', title: 'Scan before the clamps',
    text: '“Under Continuance order this port scans every hull before docking. Hold position.”',
    lines: [
      { if: { heatMin: 0.5 }, text: 'Your hull is on their board already.' },
      { if: { flag: 'codes' }, text: 'The forged codes are loaded.' },
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
  {
    id: 'port_news', kind: 'rumour', caller: 'frontier', trigger: 'port', when: { netted: false, kind: ['port', 'mining', 'contested'] }, repeat: true,
    from: 'Dockmaster', title: 'Who came through',
    text: '“Welcome in, hauler. You look like someone who wants to know who has been asking about haulers.”',
    lines: [{ if: { hunted: 1 }, text: '“A Prefect’s cutter came through the next system over. Yesterday, maybe.”' }],
    cargo: 'Dock office · the gossip of every lane',
    choices: [
      { id: 'buy', label: 'Buy the news', tone: 'trade', hint: 'Where the Prefect is, and where the Net has reached.', cost: { chits: 10 }, win: { text: 'The dockmaster tells you who has passed through', flag: 'news' } },
      { id: 'no', label: 'Just dock', tone: 'refuse', hint: 'You will find out soon enough.', win: { text: 'Clamps on' } },
    ],
  },
  {
    id: 'food_trader', kind: 'trade', caller: 'guild', when: { after: 30, hungry: 4, kind: ['port', 'contested', 'mining', 'transit'] }, weight: 1.4, repeat: true,
    from: 'Drift trader · the Kindly Ann', title: 'Stores for sale',
    text: '“Fresh stores off a garden ship, two lanes over. You look thin, hauler.” Your galley has {food} days of food.',
    ships: [{ variant: 'freighter', n: 1 }], cargo: 'Drift trader · sealed food crates',
    choices: [
      { id: 'chits', label: 'Buy three', tone: 'pay', hint: 'Twenty-five chits for three.', cost: { chits: 25 }, win: { text: 'Three crates aboard', food: 3, standing: { guild: 1 } } },
      { id: 'ore', label: 'Trade ore', tone: 'trade', hint: 'Ten ore for three.', cost: { ore: 10 }, win: { text: 'Ore across, three crates aboard', food: 3 } },
      { id: 'parts', label: 'Trade parts', tone: 'trade', hint: 'Five parts for two.', cost: { parts: 5 }, win: { text: 'Parts across, two crates aboard', food: 2 } },
      { id: 'no', label: 'Not today', tone: 'refuse', hint: 'Make do.', win: { text: 'The Kindly Ann sails on' } },
    ],
  },
  {
    id: 'drift_fleet', kind: 'trade', caller: 'miners', when: { after: 40, here: 'drift' }, weight: 4, repeat: true,
    from: 'Drift fleet · the Long Walk', title: 'Forty ships, going nowhere fast',
    text: '“A Drift crossing, hauler. We trade, we talk, we do not fight. What do you need?”',
    lines: [
      { if: { hunted: 2 }, text: '“A Prefect has been asking the fleets about a yellow hauler.”' },
      { if: { wise: ['fleet', 1] }, text: '“She does not believe the fleets any more. Somebody lied to her for you.”' },
    ],
    ships: [{ variant: 'freighter', n: 2 }], cargo: 'A Drift fleet · stores, parts, rumours',
    choices: [
      { id: 'food', label: 'Ore for food', tone: 'trade', hint: 'Eight ore for two days of food.', cost: { ore: 8 }, win: { text: 'Two crates aboard', food: 2, standing: { miners: 1 } } },
      { id: 'news', label: 'Ask about the lanes', tone: 'trade', hint: 'Five chits: where the Net is, and who follows you.', cost: { chits: 5 }, win: { text: 'The Drift tell you what they have seen', flag: 'news' } },
      { id: 'trail', label: 'Ask them to lie for you', tone: 'help', hint: 'If the Prefect asks the fleet, they send her the wrong way.', needs: { standing: ['miners', 2] }, odds: { base: 0.95, learn: 'fleet' }, win: { text: 'The Long Walk will tell her you went the other way', hunt: 1 }, lose: { text: 'The Prefect has heard that story from a Drift fleet before' } },
      { id: 'no', label: 'Pass by', tone: 'refuse', hint: 'Keep moving.', win: { text: 'The fleet drifts on' } },
    ],
  },
  {
    id: 'holdout', kind: 'plea', caller: 'miners', when: { after: 60, netted: false, kind: ['mining', 'port', 'contested'] }, weight: 1.2, boost: { if: { here: 'holdfast' }, mult: 3 }, repeat: true,
    from: 'A claim settlement · the Holdfast', title: 'Help us hold out',
    text: '“The Custody survey boats were here this morning. When the Net reaches us, we lose the claim and everyone on it. Krail for our shield generator would keep them out a while.”',
    lines: [{ if: { standing: ['miners', 2] }, text: '“The miners say you are one of us.”' }],
    cargo: 'A settlement · forty people, one generator',
    truths: [
      { id: 'true', weight: 3, read: 'Their generator draws exactly what they say' },
      { id: 'sold', weight: 1, read: 'Their comms are full of Custody traffic' },
    ],
    choices: [
      { id: 'krail', label: 'Give six Krail', tone: 'help', hint: 'The Net stalls here for days. The Krail is gone.', cost: { krail: 6 }, loseIf: ['sold'], win: { text: 'The generator lights · the Net will stall here', stall: 3, standing: { miners: 2 }, score: 1500 }, lose: { text: 'They take the Krail and sell your position', heat: 0.2, hunt: -0.5 } },
      { id: 'parts', label: 'Give eight parts', tone: 'help', hint: 'Not as good as Krail, but it holds a while.', cost: { parts: 8 }, win: { text: 'Parts across · they will hold a little longer', stall: 1.5, standing: { miners: 1 } } },
      { id: 'no', label: 'You cannot help', tone: 'refuse', hint: 'Everybody out here needs something.', win: { text: 'The channel closes' } },
    ],
  },
  // the Scatter's own (sim/scatter.ts): who is in the system decides
  {
    id: 'thren_smell', kind: 'warning', caller: 'unknown', when: { after: 25, here: 'thren', krail: 8 }, weight: 2.5, repeat: true,
    from: 'Your own sensors', title: 'The Thren smell Krail',
    text: 'Something is closing on the Krail in your tank.',
    ships: [{ variant: 'mote', n: 4 }], cargo: 'A Thren swarm · drawn to Krail',
    choices: [
      { id: 'vent', label: 'Vent five Krail', tone: 'pay', hint: 'They take it and leave you be a while.', cost: { krail: 5 }, win: { text: 'The swarm feeds on the Krail and drifts off', calm: 90 } },
      { id: 'fight', label: 'Meet them', tone: 'fight', hint: 'They come now.', win: { text: 'The swarm comes', spawn: [{ variant: 'mote', n: 4, from: 'ahead' }] } },
      { id: 'run', label: 'Burn for the lane', tone: 'run', hint: 'They will follow.', win: { text: 'The Thren follow your wake' } },
    ],
  },
  {
    id: 'voice_ask', kind: 'shakedown', caller: 'unknown', when: { after: 40, here: 'voice' }, weight: 2, repeat: true,
    from: 'The Voice', title: 'A foundry asks',
    text: '“Ore. For passage.”',
    ships: [{ variant: 'drone', n: 1 }, { variant: 'probe', n: 1 }], cargo: 'A foundry · its keepers',
    choices: [
      { id: 'ore', label: 'Give ten ore', tone: 'pay', hint: 'They let you pass.', needs: { ore: 10 }, cost: { ore: 10 }, win: { text: 'The foundry takes the ore · you may pass', notice: { voice: -3 } } },
      { id: 'parts', label: 'Give four parts', tone: 'trade', hint: 'They want what you are made of.', cost: { parts: 4 }, win: { text: 'The foundry takes the parts · you may pass', notice: { voice: -3 } } },
      { id: 'no', label: 'Refuse', tone: 'fight', hint: 'The keepers come for you.', win: { text: 'The keepers come', spawn: [{ variant: 'drone', n: 1, from: 'ahead' }, { variant: 'probe', n: 1, from: 'ahead' }] } },
    ],
  },
  {
    id: 'gutter_raid', kind: 'shakedown', caller: 'gutter', when: { after: 35, here: 'raid' }, weight: 2, repeat: true,
    from: 'Gutter raiders', title: 'A raid on',
    text: '“Keep out of it, hauler. Or join in.”',
    ships: [{ variant: 'raptor', n: 1 }, { variant: 'scout', n: 2 }], cargo: 'A raiding party · fresh plunder',
    choices: [
      { id: 'join', label: 'Join in', tone: 'trade', hint: 'A cut of the plunder. The locals will remember.', win: { text: 'Your cut: thirty chits and some stores', chits: 30, food: 1, standing: { gutter: 1, miners: -1 } } },
      { id: 'out', label: 'Keep out', tone: 'refuse', hint: 'Not your fight.', win: { text: 'The raiders let you be' } },
      { id: 'fight', label: 'Drive them off', tone: 'fight', hint: 'The locals will thank you.', win: { text: 'The raiders turn on you', spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }, { variant: 'scout', n: 2, from: 'ahead' }], standing: { miners: 1, gutter: -1 } } },
    ],
  },
  {
    id: 'relay', kind: 'warning', caller: 'custody', when: { after: 50, netted: false, kind: ['mining', 'transit', 'contested', 'port'] }, repeat: true,
    from: 'Your own sensors', title: 'A survey relay',
    text: 'A Custody survey relay is mapping this system for the Net, and a picket pair is guarding it. When it finishes, the Net comes.',
    ships: [{ variant: 'picket', n: 2 }], cargo: 'Survey relay · two pickets',
    choices: [
      { id: 'break', label: 'Break the relay', tone: 'fight', hint: 'The Net stalls here, and every patrol in the system hears it.', win: { text: 'Relay broken · the pickets come for you', stall: 2.5, heat: 0.18, spawn: [{ variant: 'picket', n: 2, from: 'ahead' }] } },
      { id: 'jam', label: 'Jam it', tone: 'bluff', hint: 'Garble its survey. Quieter, and shorter.', needs: { fitted: ['ut_scanner', 'tech_office', 'tech_custody'] }, odds: { base: 0.75 }, win: { text: 'The survey reads garbage · the Net will wait', stall: 1.5 }, lose: { text: 'The relay flags the jamming', heat: 0.12 } },
      { id: 'gutter', label: 'Point the Gutter at it', tone: 'trade', hint: 'Eight ore, and a Gutter crew strips it for salvage. Slower than doing it yourself.', cost: { ore: 8 }, win: { text: 'A Gutter crew takes the relay apart · the Net will wait', stall: 1.5, standing: { gutter: 1 } } },
      { id: 'leave', label: 'Leave it', tone: 'refuse', hint: 'Not your fight. When the survey finishes, the Net comes here.', win: { text: 'You leave the relay to its work · the Net is coming', stall: -4 } },
    ],
  },
  {
    id: 'false_trail', kind: 'trade', caller: 'guild', when: { after: 45, kind: ['port', 'contested', 'mining'] }, repeat: true,
    from: 'Dust Traders Guild · flight clerk', title: 'A flight plan, filed',
    text: '“For {fee} chits I file a flight plan with your hull on it, for a lane you are not taking. Anyone asking after you gets the wrong answer.”',
    lines: [
      { if: { hunted: 1 }, text: '“Someone is asking after you already.”' },
      { if: { wise: ['plan', 1] }, text: '“A Prefect came through checking our filings. She knows the trick.”' },
    ],
    cargo: 'A Guild flight office', fee: { base: 25 },
    truths: [
      { id: 'honest', weight: 3, read: 'Guild-licensed · files a hundred plans a day' },
      { id: 'informer', weight: 1, read: 'The clerk’s other line is to the Office of Peace' },
    ],
    choices: [
      { id: 'pay', label: 'File the false plan', tone: 'pay', hint: 'A day and a half, if the clerk is honest.', cost: { chits: 'fee' }, loseIf: ['informer'], odds: { base: 0.95, learn: 'plan' }, win: { text: 'Plan filed · a false trail', hunt: 1.5, standing: { guild: 1 } }, lose: { text: 'The plan is filed, and your real heading with it', hunt: -0.5, heat: 0.1 } },
      { id: 'ore', label: 'Pay in ore', tone: 'trade', hint: 'The Guild takes ore at its own rate: ten for the plan.', cost: { ore: 10 }, loseIf: ['informer'], odds: { base: 0.95, learn: 'plan' }, win: { text: 'Ore across, plan filed · a false trail', hunt: 1.5 }, lose: { text: 'The plan is filed, and your real heading with it', hunt: -0.5, heat: 0.1 } },
      { id: 'no', label: 'No need', tone: 'refuse', hint: 'Keep the chits.', win: { text: 'The clerk shrugs' } },
    ],
  },

  // ── follow-ups ──────────────────────────────────────────────────────────
  {
    id: 'runner_favour', kind: 'job', caller: 'gutter', trigger: 'follow',
    from: 'Fuel runner · call sign Tallow', title: 'The favour',
    text: '“Time to settle up, Wayward. I need ten parts, or you carry something for me to the dock. Your choice. Not paying is also a choice.”',
    cargo: 'Runner’s channel',
    choices: [
      { id: 'parts', label: 'Give ten parts', tone: 'pay', hint: 'Settled.', cost: { parts: 10 }, win: { text: 'Debt settled with Tallow', unflag: 'owes_runner', standing: { gutter: 1 } } },
      { id: 'carry', label: 'Carry it to the dock', tone: 'help', hint: 'A package, delivered at Frontier Supply. Do not ask.', win: { text: 'Package aboard for the dock', unflag: 'owes_runner', heat: 0.05, job: { id: 'package', text: 'Tallow’s package to the dock', at: 'port', pay: { text: 'Package delivered · Tallow is satisfied', standing: { gutter: 1 } } } } },
      { id: 'stiff', label: 'Stiff him', tone: 'refuse', hint: 'He will sell you to the Custody.', win: { text: 'Tallow sells your position', heat: 0.15, standing: { gutter: -2 } } },
    ],
  },
  {
    id: 'custody_demand', kind: 'warning', caller: 'custody', trigger: 'follow', when: { flag: 'passengers' },
    from: 'Custody patrol command', title: 'Return the Okafors',
    text: '“Wayward, you are carrying three absconded Kellern employees. Hand them over at the moon and the charge drops to theft.”',
    cargo: 'Patrol command',
    choices: [
      { id: 'deny', label: 'Deny it', tone: 'bluff', hint: 'There is nobody aboard.', odds: { base: 0.5, heat: -0.4 }, win: { text: 'Patrol command loses interest', heat: -0.05 }, lose: { text: 'They do not believe you', heat: 0.12 } },
      { id: 'defy', label: '“Come and get them”', tone: 'fight', hint: 'They will.', win: { text: 'Patrols vectoring on you', heat: 0.1, spawn: [{ variant: 'picket', n: 2, from: 'behind' }], standing: { miners: 1 } } },
      { id: 'silent', label: 'Say nothing', tone: 'refuse', hint: 'Let them wonder.', win: { text: 'Silence on the channel', heat: 0.05 } },
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
    text: 'The sealed case is pinging a Custody band every twelve seconds. Someone sold the Guild a tracker, or sold you.',
    cargo: 'One sealed case',
    choices: [
      { id: 'dump', label: 'Dump the case', tone: 'refuse', hint: 'Keep the Krail; lose the job.', win: { text: 'Case jettisoned · the tracker goes with it', unflag: 'case', drop: 'case', heat: -0.05 } },
      { id: 'open', label: 'Open it and pull the tracker', tone: 'bluff', hint: 'The Guild will know you looked.', odds: { base: 0.6, fitted: { ut_scanner: 0.25 } }, win: { text: 'Tracker pulled · the case is quiet', standing: { guild: -1 } }, lose: { text: 'Pulling it sets off an alarm · the case is slag', heat: 0.15, unflag: 'case', drop: 'case' } },
      { id: 'keep', label: 'Keep it as it is', tone: 'help', hint: 'You made a promise.', win: { text: 'The case keeps pinging', heat: 0.18 } },
    ],
  },
  {
    id: 'freighter_thanks', kind: 'trade', caller: 'guild', trigger: 'follow',
    from: 'Guild freighter · Long Reckoning', title: 'The Guild pays its debts',
    text: '“Long Reckoning, still in one piece thanks to you. Take this. And the Guild will hear your name.”',
    cargo: 'A freighter, grateful',
    choices: [
      { id: 'krail', label: 'Take the Krail', tone: 'trade', hint: 'Eight Krail.', win: { text: 'Eight Krail from the Long Reckoning', krail: 8, standing: { guild: 2 } } },
      { id: 'chits', label: 'Take the chits', tone: 'trade', hint: 'Fifty chits.', win: { text: 'Fifty chits from the Long Reckoning', chits: 50, standing: { guild: 2 } } },
    ],
  },
  {
    id: 'pod_thanks', kind: 'plea', caller: 'frontier', trigger: 'follow', when: { flag: 'pod' },
    from: 'The survivor · Ares Drive technician', title: 'Let me help',
    text: '“You did not have to stop. I fix drives for a living. Let me look at your hull.”',
    cargo: 'One technician, recovering',
    choices: [
      { id: 'hull', label: 'Patch the hull', tone: 'help', hint: 'A plate, and some parts saved.', win: { text: 'Hull patched by your passenger', plates: 1, parts: 4 } },
      { id: 'drop', label: 'Drop them at the dock', tone: 'help', hint: 'Ares Drive will be grateful.', win: { text: 'They will wait for the dock', standing: { frontier: 2 }, job: { id: 'tech', text: 'Take the technician to the dock', at: 'port', pay: { text: 'Technician home · Ares Drive pays', chits: 40, standing: { frontier: 1 } } } } },
    ],
  },

  // ── notice: the factions that have marked you ──────────────────────────
  {
    id: 'custody_bulletin', kind: 'warning', caller: 'custody', when: { after: 30, notice: ['custody', 'warning'] }, weight: 1.2, repeat: true,
    from: 'Custody bulletin · all channels', title: 'Report this hull',
    text: '“All traffic: an Obedience-class hauler, stolen, pilot armed and dangerous. Report any sighting to the nearest Custody vessel.”',
    lines: [
      { if: { notice: ['custody', 'hunters'] }, text: 'The bulletin carries a bounty now, and the names of the hunters who will collect it.' },
      { if: { notice: ['custody', 'captain'] }, text: 'It is signed by {captain}.' },
    ],
    cargo: 'A broadcast · every receiver in the system',
    choices: [
      { id: 'quiet', label: 'Go quiet', tone: 'refuse', hint: 'Kill the chatter and let it pass.', win: { text: 'Running quiet', heat: -0.05 } },
      { id: 'jam', label: 'Garble the bulletin', tone: 'bluff', hint: 'Scramble the relay so the next system hears less of you.', needs: { fitted: ['ut_scanner', 'tech_office'] }, win: { text: 'The bulletin goes out as noise', notice: { custody: -3 } } },
      { id: 'answer', label: 'Answer it', tone: 'help', hint: 'Tell every receiver what Kellern did. The miners will hear. So will the Custody.', win: { text: 'Your answer goes out on every channel', standing: { miners: 1 }, notice: { custody: 2 }, heat: 0.08 } },
    ],
  },
  {
    id: 'gutter_word', kind: 'warning', caller: 'gutter', when: { after: 30, notice: ['gutter', 'warning'] }, weight: 1.2, repeat: true,
    from: 'The Gutter band · a voice you do not know', title: 'Crews talk',
    text: '“So you are the hauler that has been killing crews. Somebody will want paying for that, one way or another.”',
    lines: [
      { if: { notice: ['gutter', 'hunters'] }, text: '“There is a price on your hull in every bar from here to the Threshold.”' },
      { if: { standing: ['gutter', 1] }, text: '“Some say you did right by the Leaky Tin. Not enough of them.”' },
    ],
    cargo: 'The Gutter band · rumour and threat',
    choices: [
      { id: 'pay', label: 'Pay blood money', tone: 'pay', hint: 'Chits to the families. It buys some quiet.', cost: { chits: 20 }, win: { text: 'Blood money paid', notice: { gutter: -4 }, standing: { gutter: 1 } } },
      { id: 'boast', label: '“Tell them to come and try”', tone: 'fight', hint: 'They will.', win: { text: 'The band goes quiet · then very busy', notice: { gutter: 2 }, spawn: [{ variant: 'raptor', n: 1, from: 'ahead' }] } },
      { id: 'ignore', label: 'Say nothing', tone: 'refuse', hint: 'Words are cheap.', win: { text: 'Channel closed' } },
    ],
  },
  // the captains themselves speak on cards built from content/captains.ts (sim/captains.ts captainCard)

  // Calloway's offers (content/calloway.ts); her last meeting is built from her file (sim/calloway.ts finaleCard)
  ...OFFERS,

  // the story beats, one a sortie through the Run (content/story.ts)
  ...STORY_CARDS,
];
