import type { CardDef } from '../sim/comms';
import type { Temper, WardAct } from '../sim/enemies';
import type { ActorSpec, SituationDef } from './situations';

// ── missions ──────────────────────────────────────────────────────────────
// Jobs the player can pick up in a system, or leave. Each is a situation
// (content/situations.ts) whose goal is one of the mission kinds
// (sim/mission.ts): something to clear, cripple, hold, race, measure or slip
// past. They begin from something in the sky (a toll beacon, a tanker, a rig
// calling for help, a rival at the start line), never from a board. They pay
// in Cyrite, scaled by how well the job went; most can be settled another
// way for less, and the way depends on what the ship carries. Each one leaves
// something behind (docs/MISSIONS.md).
//
// Prices are written in chits, five to the Cyrite, like every other row.

const act = (variant: string, n: number, a: WardAct, temper: Temper, tag: string, o: Partial<ActorSpec> = {}): ActorSpec => ({ variant, n, act: a, temper, tag, ...o });

export const MISSIONS: SituationDef[] = [
  // ══ combat ═══════════════════════════════════════════════════════════════
  {
    id: 'pirate_toll', name: 'A pirate toll', blurb: 'A toll beacon the Gutter did not put there.', group: 'frontier',
    kinds: ['transit', 'mining', 'contested'], regions: [0, 3], weight: 1.4,
    prop: 'beacon',
    actors: [
      act('raptor', 1, 'pass', 'hostile', 'Toll captain', { foe: true, scatter: true, ring: 50 }),
      act('scout', 3, 'pass', 'hostile', 'Toll crew', { foe: true, ring: 90 }),
    ],
    card: 'sc_toll', at: 30, hail: 480, accept: ['break'],
    goal: { kind: 'destroy', hold: 0, limit: 150, line: 'Break the toll', spoil: 0.7 },
    win: { text: 'The toll is broken · the lane is open', chits: 110, standing: { frontier: 1, miners: 1 }, notice: { gutter: 1 } },
    lose: { text: 'The toll stands · they know your hull now', heat: 0.05 },
    ignore: { text: 'You paid nothing and flew round' },
    after: {
      won: { text: 'The toll is broken · supplies are cheaper on this lane', market: { supplies: 0.85, days: 12 }, flag: 'toll_broken' },
      lost: { text: 'The toll still stands · prices climb on this lane', market: { supplies: 1.2, days: 8 } },
    },
  },
  {
    id: 'heavy_tanker', name: 'A heavy tanker', blurb: 'A loaded tanker, lightly guarded.', group: 'frontier',
    kinds: ['transit', 'contested', 'mining'], regions: [1, 6], weight: 1.2,
    actors: [
      act('freighter', 1, 'hold', 'meek', 'Tanker Marrow', { target: true, hp: 2.6, ring: 20 }),
      act('scout', 2, 'pass', 'hostile', 'Tanker escort', { foe: true, ring: 110 }),
    ],
    card: 'sc_tanker', at: 30, hail: 500, accept: ['strike'],
    goal: { kind: 'strike', hold: 0, limit: 170, line: 'Cripple the tanker', spoil: 0.4 },
    win: { text: 'The tanker is yours · you strip her tanks', chits: 150, supplies: 3, notice: { custody: 1 }, heat: 0.08, flag: 'tanker_taken' },
    lose: { text: 'The tanker got away' },
    ignore: { text: 'You let the tanker go' },
    after: {
      won: { text: 'A tanker went missing · the Office is asking where', flag: 'tanker_taken', hunt: 0.5 },
    },
  },
  {
    id: 'wanted', name: 'Wanted alive', blurb: 'A runner with a bounty on the hull.', group: 'corporate',
    kinds: ['transit', 'contested', 'port'], regions: [1, 6], weight: 1.0,
    actors: [act('freighter', 1, 'hold', 'meek', 'Runner Brannock', { target: true, hp: 2, pace: 2.4, ring: 20 })],
    card: 'sc_wanted', at: 30, hail: 500, accept: ['bring'],
    goal: { kind: 'strike', hold: 0, limit: 150, line: 'Cripple the runner', spoil: 0.35, pace: 1 },
    win: { text: 'Brannock is in tow · the Custody pays', chits: 170, standing: { custody: 1, gutter: -1 } },
    lose: { text: 'Brannock slipped the net' },
    ignore: { text: 'The runner flies on' },
    after: { won: { text: 'A wanted runner was taken here · the Custody owes you', flag: 'bounty_taken' } },
  },

  // ══ holding a place ═════════════════════════════════════════════════════
  {
    id: 'last_shift', name: 'The last shift', blurb: 'A rig that will not be abandoned.', group: 'frontier',
    kinds: ['mining', 'contested', 'transit'], regions: [2, 5], weight: 1.2,
    prop: 'rig',
    actors: [act('freighter', 1, 'hold', 'meek', 'Rig Hesper', { target: true, hp: 2.2, ring: 20 })],
    waves: [{ variant: 'scout', n: 2, at: 14 }, { variant: 'raptor', n: 1, at: 46 }, { variant: 'scout', n: 3, at: 78 }],
    card: 'sc_shift', at: 30, hail: 480, accept: ['stand'],
    goal: { kind: 'defend', hold: 105, limit: 0, line: 'Hold the rig' },
    win: { text: 'The shift lives · the rig pays out', chits: 135, standing: { miners: 2 }, supplies: 2 },
    lose: { text: 'The rig is lost · the crew is on the radio, then not' },
    ignore: { text: 'You left the rig to it' },
    after: {
      won: { text: 'The rig held · its crew now work for the lane', flag: 'rig_held', stallNear: 2 },
      lost: { text: 'The rig is gone · nobody sends a second crew', market: { cyrite: 1.15, days: 10 } },
    },
  },

  // ══ races and the frontier ══════════════════════════════════════════════
  {
    id: 'needle', name: 'Run the needle', blurb: 'A pilot who wants a race.', group: 'frontier',
    kinds: ['port', 'contested', 'mining'], regions: [3, 7], weight: 1.0,
    actors: [act('scout', 1, 'hold', 'meek', 'Quill', { target: true, ring: 20 })],
    card: 'sc_needle', at: 25, hail: 460, accept: ['race'],
    goal: { kind: 'race', hold: 0, limit: 130, line: 'Six beacons · beat Quill', beacons: 6, pace: 0.78 },
    win: { text: 'You beat her round the needle · the purse is yours', chits: 140, standing: { frontier: 1, gutter: 1 } },
    lose: { text: 'Quill takes the purse' },
    ignore: { text: 'You flew past the start line' },
    after: { won: { text: 'The racers know your hull now', flag: 'raced' } },
  },
  {
    id: 'no_return', name: 'The point of no return', blurb: 'A black hole nobody has measured twice.', group: 'corporate',
    kinds: ['mining', 'transit', 'contested'], regions: [3, 7], weight: 1.0,
    prop: 'hole',
    card: 'sc_hole', at: 30, hail: 560, accept: ['go'],
    goal: { kind: 'survey', hold: 0, limit: 220, line: 'Take readings at the hole', rings: [250, 170, 100], shares: [0.35, 0.7, 1] },
    win: { text: 'Readings in the log · the Survey pays for the depth', chits: 220, flag: 'saw_hole' },
    lose: { text: 'You turned back before a single reading' },
    ignore: { text: 'You went round it' },
    after: { won: { text: 'The hole has been measured · the numbers do not agree with the old chart', flag: ['saw_hole', 'saw_pulse'] } },
    seen: ['saw_hole'],
  },

  // ══ stealth ═════════════════════════════════════════════════════════════
  {
    id: 'nothing_to_declare', name: 'Nothing to declare', blurb: 'A drop in the middle of a patrol.', group: 'frontier',
    kinds: ['port', 'transit', 'contested'], regions: [0, 5], weight: 1.2,
    prop: 'beacon',
    actors: [act('picket', 3, 'patrol', 'wary', 'Custody patrol', { from: 'site', ring: 66 })],
    card: 'sc_declare', at: 30, hail: 480, accept: ['drop'],
    goal: { kind: 'sneak', hold: 0, limit: 200, line: 'Reach the drop unseen' },
    win: { text: 'The drop is made · nobody saw', chits: 130, standing: { gutter: 2 } },
    lose: { text: 'The patrol read you · they turn', standing: { gutter: -1 }, notice: { custody: 2 } },
    ignore: { text: 'You flew round the patrol' },
    after: { won: { text: 'A drop was made under a patrol · the Gutter remembers', flag: 'drop_made' }, lost: { text: 'A drop was read by the patrol · they hold the lane', pushNear: 0.5 } },
  },

  // ══ second batch ════════════════════════════════════════════════════════
  {
    id: 'kill_zone', name: 'A kill zone', blurb: 'Raiders sitting on a crossing.', group: 'frontier',
    kinds: ['transit', 'contested', 'mining'], regions: [2, 7], weight: 1.0,
    actors: [
      act('raptor', 2, 'pass', 'hostile', 'Raider', { foe: true, ring: 60 }),
      act('scout', 4, 'pass', 'hostile', 'Raider crew', { foe: true, ring: 100 }),
    ],
    card: 'sc_kill_zone', at: 30, hail: 480, accept: ['clear'],
    goal: { kind: 'destroy', hold: 0, limit: 170, line: 'Clear the crossing' },
    win: { text: 'The crossing is clear · the guild pays by the hull', chits: 170, standing: { guild: 1, miners: 1 } },
    lose: { text: 'The raiders hold the crossing', heat: 0.05 },
    ignore: { text: 'You flew round the crossing' },
    after: {
      won: { text: 'The crossing is clear · traffic is back', market: { supplies: 0.9, days: 10 }, flag: 'zone_cleared' },
      lost: { text: 'The raiders still hold the crossing · stock is late', market: { supplies: 1.15, days: 8 } },
    },
  },
  {
    id: 'missing_shift', name: 'The missing shift', blurb: 'A mining crew that stopped answering.', group: 'frontier',
    kinds: ['mining', 'transit'], regions: [1, 5], weight: 1.1,
    prop: 'wreck',
    card: 'sc_missing', at: 30, hail: 480, accept: ['search'],
    goal: { kind: 'reach', hold: 8, limit: 170, line: 'Find the missing crew', give: { supplies: 1 } },
    win: { text: 'The crew are alive · they give you what they cut', chits: 100, supplies: 3, standing: { miners: 2 }, flag: 'crew_saved' },
    lose: { text: 'You were too late' },
    ignore: { text: 'You left the crew to the dark' },
    after: { won: { text: 'A rescued crew now talks well of you · they know the lane', stallNear: 2, flag: 'crew_saved' } },
  },
  {
    id: 'follow_cyrite', name: 'Follow the Cyrite', blurb: 'A prospector who knows where the vein runs.', group: 'frontier',
    kinds: ['mining', 'transit', 'contested'], regions: [2, 6], weight: 1.0,
    actors: [act('freighter', 1, 'lead', 'meek', 'Prospector', { from: 'ahead', pace: 1.2 })],
    card: 'sc_follow', at: 25, hail: 9999, accept: ['follow'],
    goal: { kind: 'follow', hold: 50, limit: 150, line: 'Follow the prospector' },
    win: { text: 'She finds the vein and lets you cut it', chits: 90, flag: 'vein_found' },
    lose: { text: 'You lost her in the dust' },
    ignore: { text: 'The prospector flew on' },
    after: { won: { text: 'A vein was found here · the rock is richer for a while', market: { cyrite: 0.9, days: 8 } } },
  },
  {
    id: 'someone_answered', name: 'Someone answered', blurb: 'A signal that answers when it is read.', group: 'corporate',
    kinds: ['transit', 'mining', 'contested'], regions: [3, 7], weight: 0.9,
    prop: 'relay',
    actors: [act('mote', 3, 'orbit', 'wary', 'Unknown contact', { from: 'site', ring: 90 })],
    card: 'sc_answered', at: 30, hail: 500, accept: ['listen'],
    goal: { kind: 'watch', hold: 10, limit: 150, line: 'Listen to the signal, slow and still' },
    win: { text: 'The signal answered, and the Survey pays for the recording', chits: 130, flag: 'thren_curious' },
    lose: { text: 'The signal went quiet' },
    ignore: { text: 'You left the signal unread' },
    after: { won: { text: 'Something out here answers when it is listened to', flag: 'thren_curious' } },
  },
  {
    id: 'wreck_remembered', name: 'The wreck that remembered', blurb: 'A wreck that still holds a log.', group: 'corporate',
    kinds: ['mining', 'transit', 'contested'], regions: [2, 7], weight: 0.9,
    prop: 'wreck',
    card: 'sc_wreck', at: 30, hail: 480, accept: ['read'],
    goal: { kind: 'watch', hold: 8, limit: 150, line: 'Pull the wreck’s log, slow and close' },
    win: { text: 'The log is yours · the Office pays for a clean copy', chits: 120, flag: 'saw_hulk' },
    lose: { text: 'The log wiped itself' },
    ignore: { text: 'You flew past the wreck' },
    after: { won: { text: 'A wreck gave up its log · someone wanted it wiped', hunt: 0.5, flag: 'saw_hulk' } },
  },
];

const mission = (c: Omit<CardDef, 'trigger' | 'repeat'>): CardDef => ({ trigger: 'scene', repeat: true, ...c });

export const MISSION_CARDS: CardDef[] = [
  mission({
    id: 'sc_toll', kind: 'job', caller: 'miners', tier: 'important',
    from: 'Dispatch · mining guild', title: 'Break the toll',
    text: '“Somebody put a toll beacon on our lane. Four hulls and a captain holding them together. Take her down and the rest scatter.”',
    cargo: 'A toll beacon · four hulls at the gate',
    choices: [
      { id: 'break', label: 'Break the toll', tone: 'fight', hint: 'Four hulls. Break the captain and the rest scatter, for less.', win: { text: 'You turn for the beacon' } },
      { id: 'jam', label: 'Jam their channel', tone: 'bluff', hint: 'Needs a jammer. They never see you pass.', needs: { fitted: 'md_jammer' }, win: { text: 'The beacon goes to static · you slip by', standing: { gutter: -1 } } },
      { id: 'no', label: 'Fly on', tone: 'refuse', hint: 'Not your lane.', win: { text: 'Dispatch logs it' } },
    ],
  }),
  mission({
    id: 'sc_tanker', kind: 'job', caller: 'gutter', tier: 'important',
    from: 'A fixer · no name', title: 'The heavy tanker',
    text: '“A tanker, loaded, two escorts and no nerve. Break her engines, do not break her. Then take what is in her tanks.”',
    cargo: 'A tanker · slow, heavy, two escorts',
    choices: [
      { id: 'strike', label: 'Make the attack run', tone: 'trade', hint: 'Cripple her, then close in and hold. Destroyed, the cargo burns.', win: { text: 'You turn for the tanker' } },
      { id: 'warn', label: 'Warn the tanker', tone: 'help', hint: 'Her captain pays well enough, and the Gutter will hear.', win: { text: 'The captain thanks you · three supplies', supplies: 3, standing: { gutter: -2, custody: 1 } } },
      { id: 'no', label: 'Not your job', tone: 'refuse', hint: 'Leave them to it.', win: { text: 'The fixer signs off' } },
    ],
  }),
  mission({
    id: 'sc_wanted', kind: 'job', caller: 'custody', tier: 'important',
    from: 'Custody liaison · a bounty', title: 'Wanted alive',
    text: '“Brannock, hauler, wanted for a Custody manifest she did not file. Alive pays double. She runs, so bring her engines down and no more.”',
    cargo: 'A runner · fast for her size, one drive',
    choices: [
      { id: 'bring', label: 'Bring her in', tone: 'trade', hint: 'Cripple her, then close in and hold. She runs until she cannot.', win: { text: 'You turn for the runner' } },
      { id: 'warn', label: 'Warn Brannock', tone: 'help', hint: 'The Gutter will remember. The Custody will not.', win: { text: 'Brannock slips the system', standing: { gutter: 2, custody: -2 }, notice: { custody: 1 } } },
      { id: 'no', label: 'Not your bounty', tone: 'refuse', hint: 'Let someone else hunt.', win: { text: 'The liaison signs off' } },
    ],
  }),
  mission({
    id: 'sc_shift', kind: 'plea', caller: 'miners', tier: 'important',
    from: 'Rig foreman · Hesper', title: 'The last shift',
    text: '“Raiders are coming for the rig. Forty of us aboard. Hold a hundred seconds and the guild patrol is here. Be our guns.”',
    cargo: 'A rig · forty crew, no guns',
    choices: [
      { id: 'stand', label: 'Defend the rig', tone: 'help', hint: 'Hold for a hundred seconds. Draw raiders off as well as shoot them.', win: { text: 'You turn for the rig' } },
      { id: 'tow', label: 'Tow the crew out', tone: 'help', hint: 'Needs a tractor. Three supplies and the crew, and the rig stays.', needs: { fitted: 'md_tractor' }, win: { text: 'The crew come aboard, and bring three supplies', supplies: 3, standing: { miners: 1 } } },
      { id: 'no', label: 'Wish them luck', tone: 'refuse', hint: 'Not your fight.', win: { text: 'The foreman signs off' } },
    ],
  }),
  mission({
    id: 'sc_needle', kind: 'job', caller: 'frontier', tier: 'routine',
    from: 'Quill · independent pilot', title: 'Run the needle',
    text: '“Six beacons, one pass, rock in the gaps. Five Cyrite to start. Beat me round and the purse is yours.”',
    cargo: 'A racer · small, quick, polished',
    choices: [
      { id: 'race', label: 'Race her', tone: 'help', hint: 'Six beacons in order. Cut a corner and you meet the rock.', cost: { chits: 25 }, win: { text: 'The line is yours · three, two, one' } },
      { id: 'spoof', label: 'Spoof her transponder', tone: 'bluff', hint: 'Needs a spoofer. She is out, and the purse is part yours.', needs: { fitted: 'md_spoofer' }, win: { text: 'Her transponder drops out · half the purse', chits: 40, standing: { frontier: -1 } } },
      { id: 'no', label: 'Not today', tone: 'refuse', hint: 'Keep your Cyrite.', win: { text: 'Quill shrugs and powers up' } },
    ],
  }),
  mission({
    id: 'sc_hole', kind: 'job', caller: 'office', tier: 'important',
    from: 'Survey Office · open contract', title: 'The point of no return',
    text: '“Three readings round the hole, each one closer. The nav will not hold. The core burns. The Office pays by the depth.”',
    cargo: 'A black hole · bends the lane',
    choices: [
      { id: 'go', label: 'Take the readings', tone: 'help', hint: 'Hold inside each ring a moment. Turn back whenever you like, for less.', win: { text: 'You turn for the hole' } },
      { id: 'sell', label: 'Sell the contract', tone: 'trade', hint: 'Two Cyrite for a rumour, and no risk.', win: { text: 'Two Cyrite for the contract', chits: 10 } },
      { id: 'no', label: 'Give it a wide berth', tone: 'refuse', hint: 'Some things are better left on the chart.', win: { text: 'The Office logs the refusal' } },
    ],
  }),
  mission({
    id: 'sc_declare', kind: 'job', caller: 'gutter', tier: 'important',
    from: 'A runner · no name', title: 'Nothing to declare',
    text: '“A drop in the middle of a Custody patrol. Three hulls sweeping. Slip between them, hold still at the drop, and leave.”',
    cargo: 'A patrol · three hulls, slow sweep',
    choices: [
      { id: 'drop', label: 'Make the drop', tone: 'trade', hint: 'Do not be read. A spoofer, ghost echo or baffles slow the exposure.', win: { text: 'You turn for the drop' } },
      { id: 'sell', label: 'Sell the drop', tone: 'trade', hint: 'Tell the Custody where. Six Cyrite, and the Gutter will hear who talked.', win: { text: 'Six Cyrite, and a runner with a long memory', chits: 30, standing: { gutter: -2 } } },
      { id: 'no', label: 'Not for sale', tone: 'refuse', hint: 'Keep the hold clean.', win: { text: 'The runner shrugs and goes' } },
    ],
  }),
  mission({
    id: 'sc_kill_zone', kind: 'job', caller: 'guild', tier: 'important',
    from: 'Guild dispatch', title: 'Clear the crossing',
    text: '“Six raiders sit on the crossing and nothing gets through. Clear it, every hull, and the guild pays by the head.”',
    cargo: 'A crossing · six raiders, two of them heavy',
    choices: [
      { id: 'clear', label: 'Clear the crossing', tone: 'fight', hint: 'Six hulls, all of them. They come at you together.', win: { text: 'You turn for the crossing' } },
      { id: 'jam', label: 'Jam their channel', tone: 'bluff', hint: 'Needs a jammer. You pass, and they never call it in.', needs: { fitted: 'md_jammer' }, win: { text: 'The raiders lose each other · you slip by' } },
      { id: 'no', label: 'Go another way', tone: 'refuse', hint: 'Not your crossing.', win: { text: 'Dispatch signs off' } },
    ],
  }),
  mission({
    id: 'sc_missing', kind: 'distress', caller: 'miners', tier: 'important',
    from: 'Union clerk', title: 'The missing shift',
    text: '“A shift of nine, silent since yesterday. Their last beacon was near the wreck. Bring one supply. They will need it.”',
    cargo: 'A wreck · one faint beacon',
    choices: [
      { id: 'search', label: 'Search the wreck', tone: 'help', hint: 'Fly there with a supply and hold close. They are probably alive.', win: { text: 'You turn for the wreck' } },
      { id: 'tell', label: 'Tell the Custody', tone: 'trade', hint: 'Two Cyrite from the patrol. The miners will hear who sent them.', win: { text: 'Two Cyrite, and a cold union', chits: 10, standing: { miners: -2, custody: 1 } } },
      { id: 'no', label: 'Not your shift', tone: 'refuse', hint: 'Leave them to the union.', win: { text: 'The clerk signs off' } },
    ],
  }),
  mission({
    id: 'sc_follow', kind: 'job', caller: 'frontier', tier: 'routine',
    from: 'A prospector', title: 'Follow the Cyrite',
    text: '“I know where the vein runs. Stay on my wing and cut your share. Lose me and you cut nothing.”',
    cargo: 'A prospector · slow, sure of herself',
    choices: [
      { id: 'follow', label: 'Follow her', tone: 'help', hint: 'Stay with her until she finds it. Nothing shoots at you.', win: { text: 'She leads the way' } },
      { id: 'buy', label: 'Buy her chart', tone: 'trade', hint: 'Four Cyrite for her chart, and a seam of rich rock close by.', cost: { chits: 20 }, win: { text: 'You have the chart · rich rock all round', seam: 30 } },
      { id: 'no', label: 'Go your own way', tone: 'refuse', hint: 'You will find your own.', win: { text: 'The prospector shrugs' } },
    ],
  }),
  mission({
    id: 'sc_answered', kind: 'job', caller: 'office', tier: 'important',
    from: 'Survey Office', title: 'Someone answered',
    text: '“A relay that answers when it is read. Three contacts circle it. Do not fire. Listen, slow and close, and record.”',
    cargo: 'A relay · three unregistered contacts',
    choices: [
      { id: 'listen', label: 'Listen to it', tone: 'help', hint: 'Hold close and slow. They do not fire unless you do.', win: { text: 'You turn for the relay' } },
      { id: 'sell', label: 'Sell the bearing', tone: 'trade', hint: 'Three Cyrite for the position, and no recording.', win: { text: 'Three Cyrite for a bearing', chits: 15 } },
      { id: 'no', label: 'Keep clear', tone: 'refuse', hint: 'Some signals are best left unread.', win: { text: 'The Office logs the refusal' } },
    ],
  }),
  mission({
    id: 'sc_wreck', kind: 'job', caller: 'office', tier: 'routine',
    from: 'Salvage broker', title: 'The wreck that remembered',
    text: '“A wreck still carrying a log. Pull it clean and the Office pays. Someone else has been trying to wipe it.”',
    cargo: 'A wreck · its log still powered',
    choices: [
      { id: 'read', label: 'Pull the log', tone: 'help', hint: 'Hold close and slow while the copy runs.', win: { text: 'You turn for the wreck' } },
      { id: 'strip', label: 'Strip it for parts', tone: 'trade', hint: 'Three supplies and no log. The broker will mind.', win: { text: 'Three supplies from the hull', supplies: 3, standing: { guild: -1 } } },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'Not your wreck.', win: { text: 'The broker signs off' } },
    ],
  }),
];
