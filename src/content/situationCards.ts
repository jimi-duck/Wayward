import type { CardDef } from '../sim/comms';
import { MISSION_CARDS } from './missions';

// ── the calls situations make ─────────────────────────────────────────────
// The opening call of each situation (content/situations.ts). Short on words:
// what each answer is for shows in its chips (sim/gains.ts). Resources are
// explained the first time they matter, in the line that is already being
// said: Cyrite is movement, Krail is growth, chits are money and favours,
// parts are repairs and mechanical help, food is how long you can stay away
// from the ports, ore is cargo to sell or deliver.

const scene = (c: Omit<CardDef, 'trigger' | 'repeat'>): CardDef => ({ trigger: 'scene', repeat: true, ...c });

export const SCENE_CARDS: CardDef[] = [
  // ══ frontier ═══════════════════════════════════════════════════════════
  scene({
    id: 'sc_trader', kind: 'trade', caller: 'frontier', tier: 'routine',
    from: 'Owen Pike · independent hauler', title: 'Trade for supplies',
    text: '“I am running light, but I sell supplies at a fair price. Cyrite buys most things out here: repairs, supplies and favours.”',
    cargo: 'A hauler · hold half empty',
    choices: [
      { id: 'food', label: 'Buy 3 supplies', tone: 'pay', hint: 'Pay 4 Cyrite for 3 supplies. Supplies help you survive away from ports.', cost: { chits: 20 }, win: { text: '3 supplies added to your hold', supplies: 3 } },
      { id: 'no', label: 'Let him go', tone: 'refuse', hint: 'Keep your current supplies.', win: { text: 'Pike eases off' } },
    ],
  }),
  scene({
    id: 'sc_trader_gone', kind: 'rumour', caller: 'frontier', tier: 'routine',
    from: 'Dock clerk · a small berth', title: 'Pike’s berth is empty',
    text: '“Custody came to count the crew. Orlo went with them—or escaped. Nobody will say which. His locker is still full.”',
    cargo: 'A dock · every window shuttered',
    choices: [
      { id: 'ask', label: 'Ask who was taken', tone: 'pay', hint: 'Pay 2 Cyrite for news about the Net’s edge and Calloway’s last known port.', cost: { chits: 10 }, win: { text: 'The clerk talks · you learn where the Net ends and where Calloway was last seen', flag: 'news' } },
      { id: 'take', label: 'Take his supplies', tone: 'trade', hint: 'Take 3 supplies from the locker; the dock will remember.', win: { text: '3 supplies taken from the locker · the clerk looks away', supplies: 3, standing: { frontier: -1, miners: -1 } } },
      { id: 'no', label: 'Keep moving', tone: 'refuse', hint: 'This is not your fight.', win: { text: 'The clerk shutters the window' } },
    ],
  }),
  scene({
    id: 'sc_shortage', kind: 'plea', caller: 'miners', tier: 'important',
    from: 'Settlement steward · a small hold', title: 'Eleven days of food left',
    text: '“We have food for eleven days for two hundred people. Plenty of Cyrite, nothing to eat. Three of your supplies could keep us going.”',
    cargo: 'A settlement · lamps on, hatches closed',
    choices: [
      { id: 'bring', label: 'Deliver 3 supplies', tone: 'help', hint: 'Take 3 supplies to the settlement. They will remember you helped.', win: { text: 'Heading to the settlement' } },
      { id: 'sell', label: 'Sell at a high price', tone: 'trade', hint: 'Sell 3 supplies for 9 Cyrite, but the settlement will remember the price.', cost: { supplies: 3 }, win: { text: '9 Cyrite earned · the settlement closes its doors', chits: 45, standing: { miners: -1, frontier: -1 }, flag: 'gouged' } },
      { id: 'no', label: 'Leave the settlement', tone: 'refuse', hint: 'Keep the supplies for your own journey.', win: { text: 'The steward ends the call' } },
    ],
  }),
  scene({
    id: 'sc_roundup', kind: 'plea', caller: 'miners', tier: 'major',
    from: 'Settlement steward · a closed dock', title: 'Custody took the barge crew',
    text: '“Custody took eleven workers off the barge for a ‘head count’. They are holding them at the dock, with guards on the approach.”',
    cargo: 'A settlement · two pickets on the dock',
    choices: [
      { id: 'clerk', label: 'Pay the dock clerk', tone: 'pay', hint: 'Pay 6 Cyrite to free the barge quietly. You will need to fly there.', win: { text: 'You turn for the dock' } },
      { id: 'jam', label: 'Jam the guards’ channel', tone: 'bluff', hint: 'Requires a jammer. The barge can escape while the guards hear static.', needs: { fitted: 'md_jammer' }, win: { text: 'The guard’s channel goes to static · the barge slips out', standing: { miners: 1, frontier: 1 }, notice: { custody: 2 }, flag: 'freed_workers', stall: 2 } },
      { id: 'fight', label: 'Drive off the guards', tone: 'fight', hint: 'The patrol will turn on you, but the workers can escape.', win: { text: 'The pickets turn on you · the barge is free', spawn: [{ variant: 'picket', n: 2, from: 'around' }], standing: { miners: 1 }, notice: { custody: 3 }, flag: 'freed_workers' } },
      { id: 'no', label: 'Keep moving', tone: 'refuse', hint: 'Choose not to get involved.', win: { text: 'The steward ends the call' } },
    ],
  }),
  scene({
    id: 'sc_courier', kind: 'distress', caller: 'miners', tier: 'important',
    from: 'Dispatch · courier line', title: 'Courier Wren is missing',
    text: '“Wren’s beacon went silent forty hours ago. Her last signal came from this area. Someone will pay well for the packet—or for finding her.”',
    cargo: 'A courier line · one beacon, last seen near the site',
    truths: [
      { id: 'real', weight: 3, read: 'A faint beacon · a small object is drifting nearby' },
      { id: 'bait', weight: 1, read: 'The beacon is unnaturally clear · someone is controlling it' },
    ],
    choices: [
      { id: 'look', label: 'Search for Wren', tone: 'help', hint: 'Fly to the beacon and hold position. You may find Wren or her packet.', loseIf: ['bait'],
        win: { text: 'Heading to the beacon' },
        lose: { text: 'The beacon is bait · ships close in from every side', spawn: [{ variant: 'scout', n: 2, from: 'around' }] } },
      { id: 'no', label: 'Decline the search', tone: 'refuse', hint: 'Leave the packet—and whatever Wren knew—behind.', win: { text: 'Dispatch logs it and moves on' } },
    ],
  }),
  scene({
    id: 'sc_claim', kind: 'trade', caller: 'gutter', tier: 'routine',
    from: 'Two crews · one wreck', title: 'Who owns the wreck?',
    text: '“The Gutter crew says they cut into the wreck first. The tug says it has the claim. Neither will back down, and the wreck is worth a refit.”',
    cargo: 'A big wreck · two crews at the cut',
    choices: [
      { id: 'cut', label: 'Salvage while they argue', tone: 'fight', hint: 'Take supplies and Cyrite from the wreck, but both crews will hold it against you.', win: { text: 'You slip in while they shout', heat: 0.05 } },
      { id: 'guns', label: 'Break up the dispute', tone: 'fight', hint: 'Fire a warning burst between the ships. They may scatter, but both will remember you.', win: { text: 'Both crews scatter', spawn: [{ variant: 'scout', n: 2, from: 'around' }], standing: { gutter: -1 } } },
      { id: 'no', label: 'Leave them to it', tone: 'refuse', hint: 'This wreck is not yours to claim.', win: { text: 'The crews go back to shouting' } },
    ],
  }),
  scene({
    id: 'sc_convoy', kind: 'job', caller: 'guild', tier: 'important',
    from: 'Convoy master Aisha Reen', title: 'Escort the convoy to the lane',
    text: '“Three unarmed haulers have raiders waiting on their route. Fly alongside us to the Jump Gate and we will pay ten Cyrite.”',
    cargo: 'A convoy · three haulers, heavy with ore',
    choices: [
      { id: 'escort', label: 'Escort the convoy', tone: 'help', hint: 'Stay near the haulers until they reach the lane. Raiders may attack.', win: { text: 'The convoy forms up on your wing' } },
      { id: 'no', label: 'Decline', tone: 'refuse', hint: 'Continue your own journey.', win: { text: 'The convoy master signs off' } },
    ],
  }),
  scene({
    id: 'sc_smugglers', kind: 'job', caller: 'gutter', tier: 'routine',
    from: 'A runner · no name', title: 'A sealed crate, no questions',
    text: '“Sealed crate. A buyer waits at the next dock and will pay twelve Cyrite. If Custody opens it, you never met me.”',
    cargo: 'A runner’s skiff · hold sealed',
    choices: [
      { id: 'take', label: 'Smuggle the crate', tone: 'trade', hint: 'Earn 12 Cyrite at the next port. A scan may reveal the crate.', win: { text: 'The crate is aboard', flag: 'contraband',
        job: { id: 'crate', text: 'Deliver the sealed crate to the next port', at: 'port', pay: { text: 'Crate delivered · payment received', chits: 60, standing: { gutter: 1 }, unflag: 'contraband' } } } },
      { id: 'tell', label: 'Report the runner to Custody', tone: 'trade', hint: 'Earn 6 Cyrite from the patrol, but the Gutter will know you talked.', win: { text: '6 Cyrite received · the runner will remember your betrayal', chits: 30, standing: { gutter: -2 }, notice: { gutter: 2 } } },
      { id: 'no', label: 'Decline the job', tone: 'refuse', hint: 'Keep contraband out of your hold.', win: { text: 'The runner ends the call and moves on' } },
    ],
  }),
  scene({
    id: 'sc_resistance', kind: 'plea', caller: 'frontier', tier: 'important',
    from: 'A cell that has not been counted', title: 'The resistance needs supplies',
    text: '“A hidden relay. A cargo hold full of people the Net has not counted. Bring four supplies for the antenna, and we can stay hidden.”',
    cargo: 'A hidden hold · lamps off',
    choices: [
      { id: 'supply', label: 'Deliver 4 supplies', tone: 'help', hint: 'Deliver 4 supplies to the resistance. The Net’s reach will weaken here.', win: { text: 'Heading to the resistance cell' } },
      { id: 'no', label: 'Keep your supplies', tone: 'refuse', hint: 'Save them for repairs and your own journey.', win: { text: 'Channel closed' } },
    ],
  }),

  // ══ corporate ═══════════════════════════════════════════════════════════
  scene({
    id: 'sc_inspection', kind: 'checkpoint', caller: 'custody', tier: 'major',
    from: 'Custody inspection · Picket 9', title: 'Stop for a Custody scan',
    text: '“This lane is under inspection. Stop, open your hold and wait for the scan—or take another route and let us log your refusal.”',
    lines: [
      { if: { flag: 'contraband' }, text: 'The scan will reveal the sealed crate in your hold.' },
      { if: { heatMin: 0.5 }, text: 'Your transponder is already flagged.' },
    ],
    cargo: 'Two pickets · weapons cold',
    choices: [
      { id: 'codes', label: 'Show forged codes', tone: 'bluff', hint: 'Use the forged codes you acquired. The scan may accept them.', show: { flag: 'codes' }, odds: { base: 0.8, heat: -0.3 }, win: { text: 'The scan passes · Custody lets you through', dismiss: true }, lose: { text: 'The codes do not match · Custody orders a second scan', heat: 0.12 } },
      { id: 'spoof', label: 'Spoof your transponder', tone: 'bluff', hint: 'Requires a fitted spoofer. Make your ship appear to be another hauler.', show: { fitted: 'md_spoofer', noFlag: 'codes' }, needs: { fitted: 'md_spoofer' }, win: { text: 'The false registration holds · the lane is clear', dismiss: true } },
      { id: 'pay', label: 'Pay the toll', tone: 'pay', hint: 'Pay 4 Cyrite to avoid the scan.', cost: { chits: 20 }, win: { text: 'Toll paid · the picket looks away', dismiss: true } },
      { id: 'fight', label: 'Force your way through', tone: 'fight', hint: 'Fight is not the only answer, but it is one.', win: { text: 'The pickets turn on you', spawn: [{ variant: 'picket', n: 2, from: 'around' }], notice: { custody: 2 }, heat: 0.1 } },
      { id: 'round', label: 'Go round', tone: 'refuse', hint: 'Stay outside the line. It gets logged.', win: { text: 'Logged · the picket watches you go', heat: 0.04 } },
    ],
  }),
  scene({
    id: 'sc_lockdown', kind: 'checkpoint', caller: 'custody', tier: 'major',
    from: 'Net lockdown · Picket line', title: 'Unlisted hulls report',
    text: '“This route is closed to hulls that are not on the register. Your transponder is not on the register. Report, or be reported.”',
    lines: [{ if: { flag: 'contraband' }, text: 'The sealed crate in your hold will show on a scan.' }],
    cargo: 'Three pickets · the line is full',
    choices: [
      { id: 'spoof', label: 'Spoof the transponder', tone: 'bluff', hint: 'Needs a spoofer. They see a listed hull.', needs: { fitted: 'md_spoofer' }, show: { fitted: 'md_spoofer' }, win: { text: 'A listed hull, as far as the line can tell', dismiss: true } },
      { id: 'pay', label: 'Pay to be listed', tone: 'pay', hint: 'Eight Cyrite. They write you in for the day.', cost: { chits: 40 }, win: { text: 'Listed for the day · the line opens', dismiss: true } },
      { id: 'fight', label: 'Run the line', tone: 'fight', hint: 'Three hulls, and the Net behind them.', win: { text: 'The pickets turn on you', spawn: [{ variant: 'picket', n: 3, from: 'around' }], notice: { custody: 3 }, heat: 0.12 } },
      { id: 'round', label: 'Go round', tone: 'refuse', hint: 'Stay outside the line. The Net notes it.', win: { text: 'Noted · the pickets watch you go', heat: 0.06 } },
    ],
  }),
  scene({
    id: 'sc_survey', kind: 'warning', caller: 'office', tier: 'important',
    from: 'Survey relay · automatic', title: 'Survey in progress',
    text: '“SURVEY 87% COMPLETE. ALL HULLS KEEP CLEAR.” When a relay like this finishes, the Net takes the system.',
    cargo: 'A survey relay · one picket standing off',
    choices: [
      { id: 'cut', label: 'Cut its power', tone: 'help', hint: 'Two parts and eight seconds at the dish. The Net stays out of here.', win: { text: 'Heading to the relay' } },
      { id: 'jam', label: 'Jam the survey', tone: 'bluff', hint: 'Needs a jammer. It never finishes.', needs: { fitted: 'md_jammer' }, show: { fitted: 'md_jammer' }, win: { text: 'The jammer drowns the survey · it will not finish', stall: 4, notice: { custody: 1 } } },
      { id: 'shoot', label: 'Shoot it', tone: 'fight', hint: 'Loud. The picket answers.', win: { text: 'The relay dies in a flash · the picket turns', spawn: [{ variant: 'picket', n: 1, from: 'around' }], stall: 3, notice: { custody: 2 }, heat: 0.08 } },
    ],
  }),
  scene({
    id: 'sc_sweep', kind: 'warning', caller: 'office', tier: 'important',
    from: 'Net sweep · Patrol lead', title: 'Report your cargo', status: 'Patrol · Priority',
    text: 'All ships: report your cargo and last port.\n\nRefuse, and we will ask again.',
    demand: 'The officer wants {amount} for clearance.',
    cargo: 'A patrol · three hulls, wide formation',
    choices: [
      { id: 'dark', label: 'Run dark', tone: 'bluff', hint: 'Patrol sweeps past', needs: { fitted: ['md_baffles', 'md_ghost'] }, show: { fitted: ['md_baffles', 'md_ghost'] }, win: { text: 'The patrol sweeps past', heat: -0.05 } },
      { id: 'report', label: 'Pay for clearance', tone: 'pay', hint: 'Patrol leaves', cost: { chits: 15 }, win: { text: 'The officer clears you · the patrol leaves', dismiss: true } },
      { id: 'no', label: 'Hold course', tone: 'refuse', hint: 'Wanted level increases', win: { text: 'The patrol watches you pass', heat: 0.04 } },
    ],
  }),

  // ══ unknown ═════════════════════════════════════════════════════════════
  scene({
    id: 'sc_thren_exchange', kind: 'trade', caller: 'unknown', tier: 'major',
    from: 'Thren object · no signal', title: 'It is waiting',
    text: 'It holds still off your bow, a crystal that is not Cyrite in its grip. It looks at the jump fluid in your tank.',
    lines: [{ if: { flag: 'thren_aided' }, text: 'It knows the Wayward. It dips toward you, once.' }],
    cargo: 'Thren object · no engines you can find',
    choices: [
      { id: 'friend', label: 'Take what it offers', tone: 'help', hint: 'It remembers the patch. It gives, and asks for nothing.', show: { flag: 'thren_aided' }, win: { text: 'The crystal comes free · it is warm', krail: 45, flag: 'thren_lens', notice: { thren: -2 } } },
      { id: 'give', label: 'Vent 4 Cyrite', tone: 'trade', hint: 'It takes the Cyrite and gives something back. Cyrite is movement: spend it with care.', cost: { cyrite: 4 }, win: { text: 'It takes the Cyrite · and leaves a lens of something cold', krail: 30, flag: 'thren_lens', notice: { thren: -2 } } },
      { id: 'read', label: 'Answer its pattern', tone: 'bluff', hint: 'Needs the array. Understood, it gives far more.', cost: { cyrite: 2 }, needs: { fitted: 'md_array' }, show: { fitted: 'md_array' }, win: { text: 'You answer in its pattern · it gives much more', krail: 45, flag: ['thren_lens', 'thren_read'], notice: { thren: -3 } } },
      { id: 'take', label: 'Take it', tone: 'fight', hint: 'It is right there. It is not helpless.', win: { text: 'It was not helpless', spawn: [{ variant: 'mote', n: 3, from: 'around' }], notice: { thren: 4 }, flag: 'thren_harmed' } },
      { id: 'no', label: 'Back away', tone: 'refuse', hint: 'Save your Cyrite.', win: { text: 'It watches you go' } },
    ],
  }),
  scene({
    id: 'sc_thren_hurt', kind: 'rumour', caller: 'unknown', tier: 'routine',
    from: 'A Thren shard · drifting', title: 'It is hurt',
    text: 'A Thren shard, broken open, tumbling slowly. Its edges still glow. It does not move away from you.',
    cargo: 'A Thren shard · open at one end',
    choices: [
      { id: 'aid', label: 'Patch it with two supplies', tone: 'help', hint: 'Supplies mend things, even this. It will remember.', cost: { supplies: 2 }, win: { text: 'Its glow steadies · it drifts off the way it came', flag: 'thren_aided', notice: { thren: -4 } } },
      { id: 'cut', label: 'Cut it for Cyrite', tone: 'fight', hint: 'Eight Cyrite. The Thren will remember too.', win: { text: 'You cut it open · Cyrite spills out', krail: 25, cyrite: 3, notice: { thren: 4 }, flag: 'thren_harmed' } },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'It is not yours.', win: { text: 'It tumbles on' } },
    ],
  }),
  scene({
    id: 'sc_voice_relay', kind: 'warning', caller: 'unknown', tier: 'important',
    from: 'Relay Seven · dead for sixty years', title: 'WAYWARD',
    text: '“WAYWARD. JUNO. THE DOOR YOU CAME THROUGH WAS OPEN BEFORE YOU.”',
    cargo: 'No ship · a relay with its lamps on',
    choices: [
      { id: 'answer', label: 'Answer it', tone: 'help', hint: 'Say something back. It is listening.', win: { text: 'The relay clicks · a long list of lane names scrolls past', flag: ['voice_answered', 'news'] } },
      { id: 'record', label: 'Record it', tone: 'trade', hint: 'Keep the recording. Someone will want to hear this.', win: { text: 'You have the recording', flag: 'voice_recorded', score: 400 } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'Whatever it is, it is not yours.', win: { text: 'The relay goes quiet', flag: 'voice_cut' } },
    ],
  }),
  scene({
    id: 'sc_voice_repair', kind: 'rumour', caller: 'unknown', tier: 'important',
    from: 'Foundry hull · no crew', title: 'It is mending something',
    text: 'A crewless hull, welding a hull that cannot be saved. It stops as you come near. A cradle swings out, Wayward-sized.',
    cargo: 'A foundry hull · arms folded away',
    choices: [
      { id: 'mend', label: 'Let it work', tone: 'help', hint: 'It mends the Wayward. It asks for nothing.', win: { text: 'Plates welded back on, quietly · the machine says nothing', plates: 2, flag: 'voice_mended' } },
      { id: 'pay', label: 'Leave it Cyrite', tone: 'pay', hint: 'Two Cyrite. It takes them, and mends the plates and the drive.', cost: { chits: 10 }, win: { text: 'It mends the plates and the drive · the Cyrite vanish', plates: 2, supplies: 2, flag: ['voice_mended', 'voice_paid'] } },
      { id: 'no', label: 'Keep moving', tone: 'refuse', hint: 'You do not know what it wants.', win: { text: 'The cradle folds away' } },
    ],
  }),
  scene({
    id: 'sc_voice_knows', kind: 'warning', caller: 'unknown', tier: 'important',
    from: 'The Voice · a relay', title: 'THE PREFECT IS BEHIND YOU',
    text: '“THE PREFECT IS BEHIND YOU. SHE IS NOT ALONE. YOU WERE NOT TOLD THIS.”',
    lines: [{ if: { flag: 'voice_mended' }, text: '“YOU LET US MEND YOU. WE REMEMBER.”' }, { if: { flag: 'voice_cut' }, text: '“YOU CUT THE CHANNEL AT RELAY SEVEN. WE FORGIVE IT.”' }],
    cargo: 'No ship · a relay speaking to you alone',
    choices: [
      { id: 'listen', label: 'Ask what it knows', tone: 'help', hint: 'It names the lane she took. You gain time.', win: { text: 'It names the lane she took · you gain time', hunt: 1.5, flag: 'news' } },
      { id: 'how', label: 'Ask how it knows', tone: 'bluff', hint: 'It will not say.', win: { text: '“THE WAYS ARE LONG. WE ARE IN ALL OF THEM.”', flag: 'voice_asked_how' } },
      { id: 'cut', label: 'Cut the channel', tone: 'refuse', hint: 'You do not want to be known.', win: { text: 'The relay goes quiet', flag: 'voice_cut' } },
    ],
  }),
  scene({
    id: 'sc_voice_request', kind: 'job', caller: 'unknown', tier: 'important',
    from: 'The Voice · a relay', title: 'CARRY THIS',
    text: '“WE CANNOT CARRY IT OURSELVES. A CASE, SEALED. LEAVE IT AT THE NEXT DOCK. THEY WILL KNOW WHAT TO DO.”',
    cargo: 'No ship · a hatch opens in the relay',
    choices: [
      { id: 'take', label: 'Carry the case', tone: 'help', hint: 'A sealed case. Do not open it: it goes to the next port.', win: { text: 'A sealed case is aboard', flag: 'voice_carrying',
        job: { id: 'voice_parts', text: 'Leave the Voice’s sealed case at the next port', at: 'port', pay: { text: 'The dock clerk takes the case without a word · the lamps flicker once', chits: 40, flag: 'voice_delivered', unflag: 'voice_carrying' } } } },
      { id: 'open', label: 'Open the case first', tone: 'bluff', hint: 'Needs a machine shop. Look before you carry.', needs: { fitted: 'md_shop' }, show: { fitted: 'md_shop' }, win: { text: 'A lane key in a warm case · it closes itself', flag: ['voice_opened', 'voice_asked'],
        job: { id: 'voice_parts', text: 'Leave the Voice’s sealed case at the next port', at: 'port', pay: { text: 'The dock clerk takes the case without a word · the lamps flicker once', chits: 40, flag: 'voice_delivered', unflag: 'voice_carrying' } } } },
      { id: 'no', label: 'Refuse', tone: 'refuse', hint: 'You do not carry things for machines.', win: { text: 'The hatch closes', flag: 'voice_refused' } },
    ],
  }),
  scene({
    id: 'sc_voice_guide', kind: 'warning', caller: 'unknown', tier: 'important',
    from: 'Unknown ship · no transponder', title: 'It crosses your bow and waits',
    text: 'A hull with no transponder crosses your bow and turns. Three hulls wait on the straight line out. It flies the other way.',
    cargo: 'Unknown ship · no markings, no guns you can find',
    choices: [
      { id: 'follow', label: 'Follow it', tone: 'help', hint: 'Stay with it. It knows another way to the lane.', win: { text: 'It turns away from the line · you turn with it' } },
      { id: 'fire', label: 'Open fire', tone: 'fight', hint: 'It does not fire back. It leaves.', win: { text: 'It slips away', flag: 'voice_shot', notice: { voice: 3 } } },
      { id: 'no', label: 'Fly your own line', tone: 'refuse', hint: 'The straight line, and whatever waits on it.', win: { text: 'The stranger waits a moment, and goes' } },
    ],
  }),
  scene({
    id: 'sc_voice_direct', kind: 'warning', caller: 'unknown', tier: 'major',
    from: 'The Voice · every terminal at once', title: 'WE WOULD LIKE TO ASK',
    text: '“JUNO. WE KEPT THE KEYS. THE THREN KEEP THE LANES. YOU CARRY A FILE THAT SAYS WHY. WHO DO YOU TRUST WITH IT?”',
    lines: [
      { if: { flag: 'voice_delivered' }, text: '“THE PARTS ARRIVED. WE ARE GRATEFUL. WE ARE NOT SORRY.”' },
      { if: { flag: 'voice_opened' }, text: '“YOU OPENED THE CASE. GOOD. WE WOULD HAVE.”' },
      { if: { flag: 'voice_shot' }, text: '“YOU FIRED ON THE SHIP THAT SAVED YOU. WE HAVE NOT MENTIONED IT.”' },
    ],
    cargo: 'Every terminal in the system · one voice',
    choices: [
      { id: 'show', label: 'Let it read the file', tone: 'help', hint: 'It reads everything. Then it knows.', win: { text: 'The Voice read it · it will not say what it thinks', flag: ['voice_read'], notice: { voice: -2 } } },
      { id: 'door', label: 'Ask what the parts were for', tone: 'bluff', hint: 'Only if you carried them.', show: { flag: 'voice_delivered' }, win: { text: '“A DOOR. NOT YET.”', flag: 'voice_door' } },
      { id: 'thren', label: 'Ask about the Thren', tone: 'bluff', hint: 'What does the Voice know that the file does not?', win: { text: '“THEY WERE HERE FIRST. WE WERE BUILT TO TALK TO THEM.”', flag: 'voice_thren' } },
      { id: 'cut', label: 'Cut every terminal', tone: 'refuse', hint: 'Whatever it is, it is not yours.', win: { text: 'The terminals go dark', flag: 'voice_cut' } },
    ],
  }),
  scene({
    id: 'sc_old_object', kind: 'rumour', caller: 'unknown', tier: 'routine',
    from: 'The wreck · nothing aboard', title: 'It is warm',
    text: 'Behind the plating, something no yard built. Cargo-pod sized, and warm. Your Cyrite gauge twitches as you near.',
    cargo: 'A wreck · one hatch peeled back from inside',
    choices: [
      { id: 'look', label: 'Go in and look', tone: 'help', hint: 'Fly to the wreck and hold beside it. Cyrite, if it lets you.', win: { text: 'Heading to the wreck' } },
      { id: 'cut', label: 'Cut it free', tone: 'fight', hint: 'Supplies and Cyrite. It might not like it.', win: { text: 'You cut it loose and it goes dark', supplies: 3, krail: 35, notice: { thren: 2 }, flag: 'object_cut' } },
      { id: 'no', label: 'Leave it', tone: 'refuse', hint: 'Some wrecks are better left.', win: { text: 'The wreck turns slowly behind you' } },
    ],
  }),
  scene({
    id: 'sc_yard_hulk', kind: 'plea', caller: 'kellern', tier: 'important',
    from: 'Yard foreman · a Custody cradle', title: 'Do not come close',
    text: '“We are dismantling something we were not supposed to find. The crews say it hums at night. If anyone asks, it is a hulk.”',
    cargo: 'A Custody yard · one cradle, covered',
    choices: [
      { id: 'cut', label: 'Cut it loose', tone: 'help', hint: 'Three parts at the cradle. The Thren have looked for it. The Custody will know.', win: { text: 'You turn for the cradle' } },
      { id: 'help', label: 'Help the crew', tone: 'trade', hint: 'Cut for them. Twelve Cyrite and the Custody’s thanks.', win: { text: 'You cut with the crew · the hulk comes apart in pieces', chits: 60, standing: { custody: 1 }, notice: { thren: 3 }, flag: 'cut_hulk' } },
      { id: 'no', label: 'Mind your business', tone: 'refuse', hint: 'It is not yours to touch.', win: { text: 'The foreman waves you off' } },
    ],
  }),
  scene({
    id: 'sc_lane_signal', kind: 'rumour', caller: 'unknown', tier: 'routine',
    from: 'Unknown carrier', title: 'It changes when you listen',
    text: 'A pattern in the noise. When the Wayward’s scope listens, the pattern shifts. With your Cyrite aboard it is louder.',
    cargo: 'A carrier wave · no source',
    choices: [
      { id: 'answer', label: 'Answer in kind', tone: 'help', hint: 'Send the Wayward’s own pattern back.', win: { text: 'The carrier steadies · a lane name resolves out of the noise', flag: 'news' } },
      { id: 'vent', label: 'Vent 3 Cyrite', tone: 'trade', hint: 'Feed it. Cyrite is movement: this is a risk.', cost: { cyrite: 3 }, win: { text: 'The pattern sings for a moment, then goes quiet', krail: 20, flag: 'signal_fed' } },
      { id: 'no', label: 'Switch the scope off', tone: 'refuse', hint: 'Not everything wants answering.', win: { text: 'The scope goes quiet' } },
    ],
  }),
  // ══ missions ════════════════════════════════════════════════════════════
  ...MISSION_CARDS,
];
