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
];
