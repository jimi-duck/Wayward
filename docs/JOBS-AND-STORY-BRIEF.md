# WAYWARD: the story and every job, in full

*Written for someone who has never seen this project: an AI (or a person) asked to review the game's jobs (its missions, contracts and side quests) and rework them. Everything you need is here or linked below. It was written on 6 November 2026 from the code on `main` (commit `ef10311`, after #463), not from memory. Where the code and an older document disagree, the code is quoted and the disagreement is listed in section 10.*

## 0. Read this first

**What you are being asked.** WAYWARD has 25 jobs. They were written one at a time over several months, then pinned one to each stop of a fixed story road and grouped into four "threads". The owner wants a second look at all of them: do they fit the story, do they fit each other, are they fun, are they fair, are any missing, thin or in the wrong place? You can propose changes to any job (or add or cut jobs); section 11 says what you must not break and what shape the answer should take.

**How this document is laid out.**

| Section | What is in it |
|---|---|
| 1 | The game in one page: what it is, the repository, the core loop, the economy |
| 2 | The setting, the factions and the cast |
| 3 | The shape of the Story mode: the road, its 64 stops and 8 gates, in a table |
| 4 | **The storyline, chapter by chapter:** the opening at Cerro, Ned's yard, the archive, then each of the eight legs of the road, the endings |
| 5 | **How a job works:** how it appears, the six answers, goals, pay, twists, what it leaves behind |
| 6 | **The four threads** (Quiet Line, Hester's crews, the Survey, the Account), their payoffs, their collisions, the debt |
| 7 | **All 25 jobs in one table** and a map of where each sits on the road |
| 8 | Everything else that can happen at a stop (scenes of the unknown, chance cards, the older "classic" job dealing) |
| 9 | How the jobs and the story fit together, and the money |
| 10 | **Gaps and inconsistencies I found** |
| 11 | Constraints for the rework, and a suggested shape for your answer |
| Appendix A | **Every job in detail** (id, giver, call, goal, ships, every answer with its effects, pay, outcomes, what it leaves behind, the radio lines that answer it) |
| Appendix B | Ada's eight notes and the main story cards, in the order the player meets them |

**A note on sources.** The numbers and lines in sections 3, 5 to 8 and Appendix A were read from the data files by a script, not retyped, so they are exact. The story prose in section 4 is my summary of the cards and scripted lines (all quoted in full in Appendix B and in the repository's player walkthrough, `docs/` and the project folder `walkthrough/WAYWARD-WALKTHROUGH.md`).

**Status of the game.** In development, not released. The Story mode has been flown end to end by scripted test pilots (three whole journeys, about three hours each) but **no human has played the whole road**; pacing, pay against the economy, and difficulty of individual jobs are guesses. A pilot that jumps as soon as it can does not read or linger, so it proves the pieces connect, not that they are good.

---

## 1. The game

**WAYWARD** is a 3D space-survival roguelite for desktop and phone browsers (landscape only on phones). TypeScript, Three.js, Vite. You fly one worn yellow-orange ore hauler, the *Wayward*, in third person from slightly above and behind. No audio (sound was removed). German and English throughout (every line the player sees has a German twin; German addresses the player as "du").

**Repository:** https://github.com/jimi-duck/Wayward (branch `main`). Start with `docs/VISION.md` (the game), `docs/DESIGN.md` (where each system lives), `docs/ROAD.md` (how the story road is built), `docs/MISSIONS.md` (the jobs, older but accurate on mechanics), `docs/overhaul/` (the story bible, beat map and full script the road was built from), `docs/COMMS.md` and `docs/DESIGN-GUIDELINES.md` (how messages reach the player). The jobs live in `src/content/missions.ts` (rows and cards) and `src/sim/mission.ts` and `src/sim/stage.ts` (how they play). The road is `src/content/road.ts`, the threads `src/sim/threads.ts`, the stop scripts `src/content/script/`.

**Modes.** *Story* (the road, about 64 stops, a few hours; this document) and *Arcade* (an endless wave run with no jobs, no story). Story difficulty: Easy, Normal, Hard (internally Drifter, Prospector, Raider) change how scarce mining is and how loud and dangerous things are.

**The pitch.** A cyberpunk space survival game about staying ahead of a system that wants you back. You are not a hero; you are a bonded ore pilot, Juno Aster, who steals her own company's hauler and finds, hidden in its console, proof that the lanes to the outer worlds were closed on purpose seventy years ago. The ideal moment, in the design's own words: *"I need Cyrite. I need to reach the next system. There is a checkpoint ahead. A settlement is asking for help. Calloway is getting closer. I could fight, but maybe there's another way."* Combat matters but should rarely be the point. Tension comes from having too little time, fuel, information and trust.

**The core loop, one system at a time.** Arrive (a cinematic jump-in sweep, a title, a "scanning" notice). Fly a small 3D sector. Mine Cyrite rock with lasers and collect the drops. Meet what is there: a port to dock at (refit bay, supplies, repairs), a person who calls on the radio or in a pop-up card that **pauses the world** until you answer, a job in the sky, hostile ships. Fill the drive tank with jump fluid. Fly through the Jump Gate to the next system. Behind you a **pursuit clock** (counted in days) runs down; ahead the story unfolds stop by stop.

**Resources.**
- **Cyrite** is the one currency and the one fuel source. The ship's refinery cooks every Cyrite that comes aboard into **jump fluid** first, until the drive tank holds one jump; the surplus stays Cyrite and is your money (parts for the refit bay, supplies, plates, fluid at ports, card costs). So on an empty tank the first Cyrite you earn goes to the tank, not the purse.
- **Supplies** (galley and spares in one stock, max 16): one a day of travel, two a jump of drive wear, three to patch a plate. Many job answers cost or pay supplies.
- **Hull plates** (the ship's health pips) and **Wanted** (a bar that rises when you fight or linger and brings Custody pickets).
- **Standing** with six groups: miners, frontier, guild, gutter, kellern, custody (−/+ numbers; 2 or more counts as a friend). Plus hidden "notice" with the Offices, the Voice and the Thren.
- A cards' prices are written in *chits* in the data (five chits to a Cyrite); players see Cyrite only.

**The ship: four systems.** The refit bay is a web of upgrade nodes in **Guns** (weapons, armour), **Rig** (mining, cargo, tractor), **Signals** (sensors, hacking, jammer, spoofer) and **Contacts** (trade, people). Prices climb with every part (tier base 20/27/36/48 Cyrite, +25% per level of that part, +7% per level fitted on the whole ship), so there is always something to buy and it is never cheap. Some job answers need a fitted module: **Jammer** and **Transponder spoofer** (Signals, max 1 each), **Ore tractor** (Rig, max 2). That is how a build opens "another way" through a job.

**Pop-ups.** Every message is one of four kinds (`docs/DESIGN-GUIDELINES.md`): a **Moment** (a card; pauses the world; at most 60 words; 2 to 3 answers), a **Voice** (a person on the radio; no pause; at most 20 words), a **Signal** (a short notice: headline of 3 words, one reason line of 6) or **Ambient** (the HUD objective and hint lines). A "floor" paces them so only one speaks at a time: 10 s between radio lines, 15 s of quiet after a card, 20 s between cards. A job's call rings 20 s after a story card (3 to 4 s after arrival if none is waiting).

---

## 2. The setting

### 2.1 What came before

The **Accord** was a free union of worlds linked by jump lanes and powered by **Krail**, a rare crystal that fed the fabricators. Its sister mineral **Cyrite** (violet, in the same rock) powers jump drives. The Krail started running out; the Accord declared an emergency government that never ended. It became the **Continuance**, which still governs the core worlds. Every citizen carries an implant (the old design had a "Civic Score"; **that mechanic has been removed from the game completely, never reintroduce it**). The **Custody** is its fleet and police, the **Offices of Peace** its intelligence service, and **Kellern Mining** and other corporations run almost everything else: mines, docks, ships, jobs, debt.

**The Severance.** Seventy years ago the jump lanes to the outer worlds went dark. The Continuance blamed a Krail shortage and neglect. The outer worlds became the **Scatter**. The truth the road slowly reveals:

- The reserve stood at **94%** on the day the order was signed, so the stated reason was false.
- The lanes were closed on purpose. The **Order of Continuity 1**, signed "Authorised: L. C." (Lucan Calloway, Chair of the Emergency Authority, father of the Governor who now hunts Juno), told the Lane Wardens to power down the outer relays and surrender their keys.
- Forty people were in the room: the Kellern board, the Dust Traders' Guild, the Offices, the Survey Office, two Wardens (**Ada Aster**, Juno's grandmother, and Halvard Brook). Ada's readings made the case. Lucan argued for a public warning and a ten-year evacuation fund; the board refused; he signed anyway.
- The reason: **the Thren**, a lane-dwelling presence of clouds of "motes", were following full tanks of Cyrite (Cyrite is laid down by them like coral; a full tank looks to them like a piece of their reef being carried away). Hulls were coming back scored with parallel marks (mote abrasion, not claws) and some did not come back. The Continuance closed the outer relays and had **31 lane breakers** built at Yard Nine, by the **Voice** (an AI foundry intelligence the Survey Office had built to talk to the Thren), ringing the Hollows.
- Ships already out that night were rerouted away from the core; some died in Thren space. The Drift kept their names.
- Afterwards Kellern kept buying outer Cyrite on company contracts at core prices, with the Scatter cut off from every other market. That debt economy is the one Juno was born into.

### 2.2 The Scatter and the unknown

- **Holdfasts**: settlements around whatever survived (Kessel Hold, a moot of councillors). **Drifts**: nomad fleets (the Long Walk, Ma Saffi). **The Gutter**: raiders, brokers and fixers (Val, Kesh). **Dust Traders' Guild**: free-port traders. **Frontier**: independent pilots and crews. **Lane Wardens**: the disbanded relay keepers (a few old families at Halden's Reach). **Miners' crews** (Hester Vane's rigs).
- **The Voice**: the old foundry machines left running, speaking in capitals, plurals and present tense through terminals and relays. It does not lie but answers the question it heard. It "kept the keys" to the breakers.
- **The Thren**: never speak. Pattern, repetition, motes. They follow full tanks, line up along lanes, score hulls. Venting Cyrite calms them. Firing on them does nothing before the Hollows. Players are told nothing for a long while; they see.

### 2.3 The cast (the people jobs and cards use)

| Who | Role |
|---|---|
| **Juno Aster** | The player. Bonded ore pilot. Answers are written as attitudes, never speeches. Family told only that Ada was "lost in service" |
| **Sam Okoro** | Friend at the home port, on the radio from the start. Gets her out. Falls silent at the Narrows; returns through lit relays |
| **Ned Varga** | Sam's friend, a radio voice at the yard that repaints her |
| **Ada Aster** | Juno's grandmother, a Lane Warden. Eight recorded notes at eight relays. Died 25 years ago when her cutter broke up in the Salvage Belt |
| **Governor Idris Calloway** | The hunter, aboard the CCV *Patience*. Formal, exact, counts things. Her father signed the order |
| **Foreman / Director Draper** | Cerro foreman who turns out to be the Offices' director of asset recovery; his desk is "Kellern Recovery · Accounts" |
| **Owen Pike** | Quiet Line dispatcher, only a voice. **Quill**: a racer and salvor, vain, loyal once beaten |
| **Hester Vane** | Rig boss of the *Hester*; keeps a list of people who helped her crews |
| **Noor Haddad** | Calloway's aide and the Survey analyst who has been buying Juno's readings; holds the third Voice key |
| **Ilse Marrow** | Retired junior Warden at Halden's Reach, kept the signed order seventy years |
| **Adam Brook** | Kellern clerk with the real books; grandson of Halvard Brook |
| **Councillor Oduya** | Kessel Hold's moot. **Ma Saffi and Wren Saffi**: the Long Walk, the lost manifests, Wren flies Juno through the Rift |
| **Val, Kesh** | Gutter broker and her fixer; Val sells Juno's heading |
| **Dov Kessler, Tarik Silva, Ossie Raine** (+ **Corin Ashe**, an Offices agent aboard his ferry), **Ben Anand, Marit Voss, Eben Okoro, Ines Duarte, Old Mirren, Oren Lisle** | One-stop contacts on the road (section 4) |
| **Inspector Ashgrove** | Offices captain who stops Juno at checkpoints, "Good afternoon", remembers hulls |
| **Echo** (a freed shard of the Voice) and **Sable** (a human woman raised in a swarm's lane) | The Hollows' two voices |

---

## 3. The shape of the Story mode

**The road.** The Story is **one fixed, strictly linear road** (no side lanes, no chart to choose across). The player flies a system, jumps through its Jump Gate to the next stop, and so on from Cerro to the Threshold. There are **eight legs**; each has 7 stops (the Reach has 8 because its first is the system Juno lands in after Cerro) and then a **gate** where Ada's note is read at a Warden relay. Roles repeat in every leg: landfall, hub, work, turn, breather, pressure, reckoning, then the gate.

**Rules of the road** (`docs/ROAD.md`):
- Each stop holds at most one **main card** (a story beat). Main cards hold the Jump Gate shut until they have played; a hold lasts at most 240 s, then the beat is carried to the next stop. Played means done.
- Order inside a stop: main card, then the thread job, then chance. A job never rings before that stop's main card has been answered.
- **Breather stops are quiet:** no pursuit, no cards by chance, no job.
- **One job per stop** at most. Jobs are pinned to a stop and nowhere else.
- **Pursuit** is counted in days (a leg starts at 2, amber at 1, red at 0.5). Governor Calloway's "knows your route" begins at the Narrows relay handshake.
- Every gate arrival has five steps: approach, handshake at the relay mast (2 km), Ada's note, an answer, the way on.
- Saves are versioned (now v23). The road replaced the older generated chart for new Story games; `?classic` in the address still plays the generated chart.

### 3.1 Every stop

(Kind = what the system is: port, mining, transit or contested. Holder = who controls it. Quiet = a breather. Job = the pinned job. Scene = a pinned moment of the unknown, `docs/` section 8.)

| Leg | # | Stop | Kind | Holder | Port | Role | Course line | Job | Scene |
|---|---|---|---|---|---|---|---|---|---|
| The Reach | 1 | (generated name: the audit dock’s system) | port | kellern | — | start |  |  |  |
| The Reach | 2 | Northfold | transit | none | — | landfall | quiet landfall |  |  |
| The Reach | 3 | Halden’s Reach | port | kellern | Kellern Fuel Dock | hub | find the Warden’s record | `nothing_to_declare` |  |
| The Reach | 4 | Hollis | mining | none | — | work | mine, and fill the tank | `follow_cyrite` |  |
| The Reach | 5 | Marlow | port | kellern | Kellern Claim Office | turn | someone here keeps the real books |  |  |
| The Reach | 6 | Vesta | transit · quiet | none | — | breather | rest here, or keep moving |  |  |
| The Reach | 7 | Branford | contested | gutter | — | pressure | the Net closes behind | `pirate_toll` |  |
| The Reach | 8 | Copperline | port | kellern | Kellern Fuel Dock | reckoning | a clerk in trouble |  |  |
| The Marches | 1 | Wake | transit | none | — | landfall | past the charts |  | `thren_curious` |
| The Marches | 2 | Kessel Hold | port | holdfast | The Claim Hall | hub | the moot wants your file | `keep_distance` |  |
| The Marches | 3 | Tamsin Field | contested | gutter | — | work | someone offers to settle your debt | `wanted` |  |
| The Marches | 4 | The Long Walk | transit | none | — | turn | the Drift kept the names |  |  |
| The Marches | 5 | Low Harrow | transit · quiet | none | — | breather | rest, and listen to the Drift |  |  |
| The Marches | 6 | Gannet Reach | mining | holdfast | — | pressure | the rigs are boarded | `missing_shift` |  |
| The Marches | 7 | Sallow Port | transit | guild | Guild Hall | reckoning | refit before the Rift | `heavy_tanker` |  |
| The Salvage Belt | 1 | Breakwater | transit | none | — | landfall | listen to the wrecks | `one_filter` |  |
| The Salvage Belt | 2 | Scrap Exchange | port | guild | Dust Traders Exchange | hub | everyone knows what you carry |  |  |
| The Salvage Belt | 3 | The Graveyard | mining | guild | — | work | a wreck that remembers | `wreck_remembered` |  |
| The Salvage Belt | 4 | Kessler’s Wreck | contested | guild | — | turn | a recorder that still runs | `dead_drop` |  |
| The Salvage Belt | 5 | Saltmarsh | transit · quiet | none | — | breather | something crosses the lane |  | `thren_swarm` |
| The Salvage Belt | 6 | Kiln | contested | gutter | — | pressure | someone is selling routes | `the_witness` |  |
| The Salvage Belt | 7 | Tarik’s Lamps | transit | guild | Salvage Barge | reckoning | the charts they burned | `long_walk` |  |
| The Drift Deep | 1 | Longwater | transit | none | — | landfall | ask the Drift where the closures run |  | `thren_shadow` |
| The Drift Deep | 2 | The Quiet Ferry | transit | none | Free Dock | hub | a lane ahead, no questions | `finders_keepers` |  |
| The Drift Deep | 3 | Lantern Mile | mining | none | — | work | a warm object, moving | `something_dark` |  |
| The Drift Deep | 4 | Ninth Fold | transit | none | — | turn | someone aboard is watching | `missing_payroll` |  |
| The Drift Deep | 5 | Hushlight | transit · quiet | none | — | breather | a quiet relay |  |  |
| The Drift Deep | 6 | Stillwater | mining | holdfast | — | pressure | Hester’s own rig | `last_shift` |  |
| The Drift Deep | 7 | Kindmere | port | holdfast | Holdfast Stores | reckoning | a signal that answers |  | `lane_signal` |
| The Breaker Yards | 1 | Cutton | transit | none | — | landfall | the yards remember |  | `yard_hulk` |
| The Breaker Yards | 2 | Yard Nine | port | kellern | Kellern Claim Office | hub | the first work order | `needle` |  |
| The Breaker Yards | 3 | Anvil Slip | mining | kellern | — | work | a cargo train broke up here | `drift_cache` |  |
| The Breaker Yards | 4 | Keelberth | contested | kellern | — | turn | Sam, through the relays | `voice_wire` |  |
| The Breaker Yards | 5 | Cradle Gap | transit · quiet | none | — | breather | a breaker still holds something |  |  |
| The Breaker Yards | 6 | Torchwall | contested | gutter | — | pressure | the crews may strike | `kill_zone` |  |
| The Breaker Yards | 7 | Davit Dock | port | frontier | Free Dock | reckoning | who has been paying you |  |  |
| The Free Ports | 1 | Saltquay | transit | none | — | landfall | the free ports kept the names |  | `voice_guide` |
| The Free Ports | 2 | Duarte Harbour | port | guild | Dust Traders Exchange | hub | a berth, no questions |  |  |
| The Free Ports | 3 | Penny Cross | mining | gutter | — | work | something answers a full tank | `someone_answered` |  |
| The Free Ports | 4 | Mirren’s Pier | transit | none | — | turn | forty names in a box | `be_bait` |  |
| The Free Ports | 5 | Lucky Haven | transit · quiet | none | — | breather | people who live with them |  |  |
| The Free Ports | 6 | Gilt Market | contested | gutter | — | pressure | everyone wants a copy | `lose_prefect` |  |
| The Free Ports | 7 | Ninehaven | port | gutter | The Bent Nail | reckoning | static on the approach |  | `thren_exchange` |
| The Hollows | 1 | Ashdeep | transit | none | — | landfall | where the lanes began | `no_return` |  |
| The Hollows | 2 | Hollowforge | mining | voice | — | hub | a pattern on the scope |  |  |
| The Hollows | 3 | Coldvault | contested | voice | — | work | the ring’s centre | `two_captains` |  |
| The Hollows | 4 | Palecairn | transit | thren | — | turn | two voices want something |  |  |
| The Hollows | 5 | Mute Hall | transit · quiet | none | — | breather | they line the lane |  | `thren_watch` |
| The Hollows | 6 | Ghostcinder | contested | thren | — | pressure | the swarm lane |  | `foundry_both` |
| The Hollows | 7 | Gaunt Watch | mining | none | — | reckoning | the Governor’s aide |  |  |
| The Last Lanes | 1 | Lastlight | transit | none | — | landfall | the last relay ahead |  |  |
| The Last Lanes | 2 | The Last Toll | port | none | The Last Toll | hub | every lane ends here |  |  |
| The Last Lanes | 3 | Thin Gap | transit | thren | — | work | the first question |  |  |
| The Last Lanes | 4 | Dimrim | mining | none | — | turn | the second question |  |  |
| The Last Lanes | 5 | Lone Step | transit · quiet | none | — | breather | the third question |  |  |
| The Last Lanes | 6 | Dusk Mark | contested | voice | — | pressure | instruments disagree |  | `unknown_pulse` |
| The Last Lanes | 7 | Wane Rest | transit | none | — | reckoning | the Threshold is behind her |  |  |



---

## 4. The storyline, chapter by chapter

Three acts: **I The Breakout** (Cerro and the first system), **II The Run** (the Reach to the Free Ports), **III The Choice** (the Hollows and the Last Lanes, ending at the Threshold). Ada's eight notes are the spine: each relay that answers Ada's key gives one note, and **each lit relay is a broadcast**: anyone listening learns the Wayward carries Ada's keys and where the next relay on the old line must be. That is the engine of the chase and the reason the road is a line.

Tags: **[Main]** happens to every player; **[Choice]** depends on an answer; **[Job]** is an optional job pinned at the stop; **[Scene]** is a pinned moment of the unknown. Flag names are in `code`; they are how later lines remember what you did.

### Chapter 0 · Cerro: Contract 08-441 (Act I)

The game starts in flight, no title card, with 800 of 1,000 Cyrite of **Contract 08-441** already in the hold. Juno flies an Obedience-class ore hauler, registry OB-7731-A, for Kellern Mining. Sam Okoro, a friend at the home port, talks to her on the radio throughout.

1. **Mine the last of it.** Laser a Cyrite rock, fly through the drops. (Teaches the verb the economy runs on.)
2. **The Work Bay.** The bay takes no cargo. Its pop-up shows the company's arithmetic: delivery of 1,000 Cyrite pays 100 credits, charges leave **2**. Sam: raiders have been spotted, fit torpedoes; the company will finance the launcher for 20 credits against the contract. One answer: fit it. (The first lesson of the debt economy.)
3. **The last two hundred**, then **raiders**: two ships marked UNKNOWN close in and hold fire. Pop-up: *Cut your drive and open the hold.* **Surrender** ends the run (captured, sold into forced labour) and restarts the opening; **Refuse** starts the fight. Either way a missile always reaches the hold (0/1,000 Cyrite): there is nothing left to deliver.
4. **The chase to the gate.** Reinforcements in waves; Sam: "Get to the jump gate." Dying before the gate restarts the whole opening (only here). Weapons are cold inside the Jump Gate's ring. The jump is a fly-through with its own camera.

### Chapter 0b · The first system past Cerro: breach, code, Ned's yard, the archive (Act I, continued)

The system after Cerro is calm (no raiders, no anomalies, no weather): a ringed giant and moon, a Frontier Supply Depot (optional fuel stop), the Kellern Audit Dock, civilian traffic labelled *Civilian · Not hostile* (shoot them and security comes).

1. **The breach.** A red pop-up: *Contract 08-441 · Breach.* Delivery not received; vessel recovery and impound ordered; invoice **25 + 35 + 20 = 80 CR**. One answer: *Acknowledge.* The controls lock and an autopilot flies her toward the audit dock, on rails, nothing can hurt her.
2. **Sam's code.** 2 km from the dock Sam opens a private channel: a maintenance code that overrides the recovery autopilot. It will not clear the debt or make the ship legal ("The debt stays in your name"), but she gets the helm back. One answer: *Input the code.* Wanted rises a step.
3. **Ned's yard** (new 5 November 2026). Sam: "Don't dock. She's still the company's. Ned's yard, off the lane. He'll make her yours. Free." A small station built into an asteroid, opposite the supply depot. Ned Varga, a radio voice only: "Ease her into the ring and hold still. New paint, new name, no charge." In the ring the autopilot takes the helm; lightning zaps the hull; the HUD tears, goes dark and reboots; the autopilot flies her out of the front; her lights come back white and one amber band takes the hull from grey to yellow, the old registry struck out and **WAYWARD** painted, with the camera panning round her. A short text card says what was done: *Reprogrammed* (owner lock gone), *Repainted* (company grey is now yellow), *Renamed* (OB-7731-A struck out, she is the WAYWARD), *paint won't pass a scan.* The Jump Gate holds until she has been. From the code to the yard nothing attacks her. (There is also a secret: ten barrel rolls pay 1,000 Cyrite.)
4. **The archive wakes**, about 28 s later. A stored message in the ship database, from no name, "For whoever flies her next": the owner lock is off; seventy years ago the gates went dark and they said the Krail was running out; "I pulled the reserve log for that day. Krail reserves: 94%. Logged the same day the order to close the gates was signed. I can't tell you what that number leaves out. But it doesn't fit the story we were told. **Start at Halden's Reach.** Follow the record. Find out why." One answer: *Set course: Halden's Reach.* This is the inciting incident. The Wall (the player's record of clues) gets its first two entries.
5. **The pursuit clock starts at the paint:** Sam's tank line at 20 s, an amber *Hull reported stolen* notice at 38 s, the first Custody hull at 70 s. The objective is *Fill the tank* (mine Cyrite or buy fluid at the depot), then *Head for the Jump Gate*.

The **Course screen** (a calm line of the road's stops, "Here / Next stop / Then", a leg goal, fluid needed, the pursuit in days) replaces a chart before every jump on the road.

### Leg 1 · The Reach: *The Signed Order* (Act II)

*Leg question: who remembers Ada, and who kept the records?*
Eight stops from the audit dock's system to the gate at the Narrows. The first two systems (the audit system and Northfold) are safe: no raiders, no chance fights.

| # | Stop | What happens |
|---|---|---|
| 1 | audit dock system | The opening above |
| 2 | **Northfold** (quiet landfall) | Sam: "Every lane out of here is watched but one. Whoever left you that message picked a quiet one." "My signal won't reach past the Narrows. Make the most of me while you can." |
| 3 | **Halden's Reach** (Kellern port, hospice ring) **[Main]** | *Ilse Marrow* hails from an old Warden skiff and sends the **signed order** as a document (the Order of Continuity 1, "Authorised: L. C."): "I ran the Narrows relay the night they closed it. The lanes didn't fail. We were told to turn them off." One answer, take it (`frag_order`). A second card, *Her handwriting*: she knows the routine in the hull is **Ada Aster's** (`ada_named`): "Lost in service. That's all they told your family." **[Job] Quiet Line 1: Nothing to Declare** |
| 4 | **Hollis** (mining) | **[Job] Hester's crews 1: Follow the Cyrite Vein.** First touch of the Thren: an UNKNOWN CONTACT holds at 4.2 km, then 3.1 km, matching speed. Sam: "Ghost on the scope. Old rigs throw them." "Probably." "It's closer. I don't like that." |
| 5 | **Marlow** (Kellern accounts station) **[Main]** | *Adam Brook*, a clerk, hands over **Kellern's real books**: every unit of Krail the Scatter never got (`frag_ledger`, `brook_met`). The Wall notes the same initials (L. C.) on the transfers |
| 6 | **Vesta** (breather) | Quiet. If Juno cut Ilse off, a recording carries the order and Ada's name here. **Hester Vane** first speaks on the radio: "My prospector says you're decent. There's a toll on our lane at Branford we can't pay." Sam on Ada: "Dad said the Wardens were the Reach's last honest people. So does Eben, at the yards." |
| 7 | **Branford** (contested, Gutter lane) | Net notice: it has reached Northfold. **[Job] Hester's crews 2: Break the Pirate Toll** |
| 8 | **Copperline** (Kellern port, last before the Narrows) **[Main]** | *Brook is in a Custody transport* ("You have the only copy."): Break him out / Divert the transport / Leave him (`brook_free` or `brook_taken`). The first cost lands on someone else |
| Gate | **The Narrows** | Custody blockade (Inspector Ashgrove). Fly to the relay mast: the handshake. **Warden key accepted, Warden channel open, broadcasting on every band.** Sam: "It's not just lit, it's shouting." **Ada's note 1** (text in Appendix B). Then the *Patience* arrives (Calloway): "I have read Ada Aster's file too. Not all of it. Enough to want the rest. Tell me where you are going, and I will not stop you." Tell her the truth / Give her a lie / Cut the channel. Sam's last line: "This is where my signal ends." *Signal lost.* |

### Leg 2 · The Marches: *Who Stands With You*

*Question: can people cooperate when there is not enough?* Holdfasts, Drift fleets, and the Gutter raiding both. Gate: **the Rift** (a broken relay, no beacons).

| # | Stop | What happens |
|---|---|---|
| 1 | **Wake** (landfall) | An edge relay: "Past here the charts are wishes." If Juno told Calloway the truth, a notice says she is holding back. A Thren "studying you" scene |
| 2 | **Kessel Hold** (Holdfast port) **[Main]** | *Councillor Oduya*: read the file to the moot (`pact_holdfast`, an ally, Wanted +) / ask for stores / not yet. **[Job] Quiet Line 2: Stay Out of Range** |
| 3 | **Tamsin Field** (Gutter claim) | **[Job] the Account 1: Wanted: Alive** (the first call from Kellern Recovery, "Ms Aster. Your breach balance stands at eighty. We have a way to settle it."). If Juno told Calloway the truth she may offer to meet ("Two chairs. No guns. One hour.") |
| 4 | **The Long Walk** (Drift fleet, forty hulls lashed together) **[Main]** | *Ma Saffi* keeps the manifests of the 23 ships turned away that night; take them (`frag_manifests`, `pact_drift`, `wren_trust`). Wren Saffi: "Ninefold, line nine. My parents." |
| 5 | **Low Harrow** (breather) | A Drift hull scored in long parallel lines. Wren: "Don't run a lane full. They follow the full ones." (folklore). Hester: "A shift went quiet at Gannet. Eleven people." |
| 6 | **Gannet Reach** (Holdfast rigs, Kellern security aboard) **[Main]** if the moot pact was made: Oduya asks for help defending the rigs (fight / send 3 supplies / not now). **[Job] Hester's crews 3: The Missing Shift** |
| 7 | **Sallow Port** (Guild port) | **[Job] the Account 2: The Heavy Tanker** (it carries Hester's filters: a collision) |
| Gate | **The Rift** | Flown, not read. If Wren trusts you, she lays beacons; if Kessel Hold's pact held, its rig lamps line the Rift; with neither, "No guidance · fly the debris by eye". **Ada's note 2:** twenty-three ships were out past the Narrows that night; Control turned every one away from the core; "Listen to the wrecks. One of them is mine." |

### Leg 3 · The Salvage Belt: *What Things Are Worth*

*Question: who profits from wreckage?* The Rift's relay lit, so the Belt's landfall says "Rift relay lit · they know your next gate". Gate: **the Scrapgate** (a gate made of Severance hulls).

| # | Stop | What happens |
|---|---|---|
| 1 | **Breakwater** (landfall) | **[Job] Hester's crews 4: One Filter Left** |
| 2 | **Scrap Exchange** (Guild port) **[Main]** | *Val*, a Gutter broker: "Everyone in the Belt knows what you carry. At the Threshold I buy it." Take an 8-Cyrite advance (`broker`) / not for sale / run her off. 40 s later Calloway offers *a name that is not yours* (a clean registry for one answer, later) |
| 3 | **The Graveyard** | **[Job] Survey 1: The Wreck That Remembered.** An analyst: "That hull met something out here, and turned back." |
| 4 | **Kessler's Wreck** **[Main]** | *Dov Kessler* has Ada's cutter, 25 years dead; its recorder still runs. Cut it free together (`frag_blackbox`). Then **Ada's voice**: "If anyone hears this, the order was signed in the core and I helped. My name is Ada. Tell my granddaughter I tried." (keep it: `ada_heard`). **[Job] Quiet Line 3: The Dead Drop** |
| 5 | **Saltmarsh** (breather) **[Scene]** | The first sighting: "motes like a river" cross the course. If the tank is full, they turn toward it. "Wait it out, or burn fluid to run dark." |
| 6 | **Kiln** (Gutter crossing) | *Kesh* (if Juno took Val's advance): "Val talks too much. She is shopping your heading to the Offices." Settle his debt / trust him / wave him off. **[Job] Quiet Line 4: Get the Witness Out** (the witness names Val) |
| 7 | **Tarik's Lamps** (chart room adrift) **[Main]** | *Tarik Silva* draws lanes by hand from burned charts; his have "a bend nobody can explain" (`frag_charts`). Then, if Juno took the advance, **Val sells her heading** to the Offices: pay her / jam her / let it go. **[Job] Hester's crews 5: Escort the Hauler** |
| Gate | **The Scrapgate** | If Val's betrayal stood, pickets wait. **Ada's note 3 is a recording** ("This is Ada. I was the attending officer that night... Ilse gave me hers and said, 'Don't lose it.' I didn't. I didn't hand any of them in, either. Eight keys, one cutter, and nobody counting."). "Ask the Drift where the closures run." |

### Leg 4 · The Drift Deep: *The Ring*

*Question: what were the lanes built to contain?* No Net here. Gate: **the Slow Door** (three minutes to open).

| # | Stop | What happens |
|---|---|---|
| 1 | **Longwater** (landfall) **[Scene]** | A navigation shadow: the Jump Gate is drifting; "something else is moving it" |
| 2 | **The Quiet Ferry** **[Main]** | *Ossie Raine*, master of a ferry of 41 passengers: ride the ferry (4 supplies, Calloway loses a day) / trade stories / wave him on. **[Job] Quiet Line 5: Race for the Wreck** (Quill) |
| 3 | **Lantern Mile** (mining) | **[Job] Survey 2: Something in the Dark** ("It has moved four hundred metres since yesterday. Toward the lane.") |
| 4 | **Ninth Fold** **[Main]** | Ossie: **an Offices agent is aboard** (Corin Ashe, young, looks sick about it). Expose him / let him be / feed him a story (`agent_*`). **[Job] the Account 3: Stolen Payroll** (it is Hester's crews' wages: a collision) |
| 5 | **Hushlight** (breather) **[Main]** | **The Voice's first contact:** "THE PREFECT IS BEHIND YOU. SHE IS NOT ALONE. YOU WERE NOT TOLD THIS. WE ARE TELLING YOU." Ask what / ask how / cut the channel |
| 6 | **Stillwater** (Holdfast rig) | Hester: "My rig, my mother's name on it. I'm not leaving." **[Job] Hester's crews 6: Hold the Last Shift** |
| 7 | **Kindmere** (Holdfast stores) **[Scene]** | Tarik (if you have his charts) or Ossie: "Put every closed relay on one chart. It isn't a bend. It's a ring." A signal that changes when you listen |
| Gate | **The Slow Door** | Hold three minutes. At 40 s motes gather on the gate (white, UNKNOWN) and thicken toward a full tank; Ossie crosses with you ("They're not touching us. They're touching you. What are you carrying?"); a curve of dead relays shows across the sky. **Ada's note 4:** "Draw every closed relay on one chart and they make a circle... The ring isn't a border. It's a fence... They were never keeping us in. They were keeping something out, and we were the cheapest wall they had. Find who built the fence." |

### Leg 5 · The Breaker Yards: *Who Built It*

*Question: who built the machinery of the Severance?* Custody yards where ships are taken apart. Gate: **the Breaker** (a lane breaker, still standing).

| # | Stop | What happens |
|---|---|---|
| 1 | **Cutton** (landfall) **[Scene]** | A Thren hulk on a Custody cradle. Calloway asks, if the motes were seen, "What did you see?" |
| 2 | **Yard Nine** **[Main]** | *Ben Anand*, clerk, holds the **first work order**, BY9-001, countersigned by the Survey; "Taking it costs me my pension." (`frag_workorder`). **[Job] Quiet Line 6: Run the Needle** (Quill joins) |
| 3 | **Anvil Slip** | **[Job] the Account 4: The Drift Cache** (the cases are Drift property: a collision with Wren) |
| 4 | **Keelberth** **[Main]** | **Sam, patched through the relays:** his brother **Eben** works a breaker crew; the hulls they bring in are scarred "like claws". Warn the crew / look at the hulls (2 supplies: "thousands of tiny strokes, all one direction") / not now. **[Job] Survey 3: The Voice on the Wire** |
| 5 | **Cradle Gap** (breather) **[Scene]** | **The cage:** Breaker BY9-014's field still holds a knot of motes. The yard foreman: "Seventy years in there. Hums at night. Faces the tanks when we refuel." |
| 6 | **Torchwall** (Gutter crossing) **[Main]** | *Marit Voss*: the yard crews will strike if you stand with them ("Hester's people are coming in to hold the line"): stand with the crews (`crews_stood`) / ask for supplies / not yet. **[Job] Hester's crews 7: Clear the Crossing** |
| 7 | **Davit Dock** (Frontier dock) **[Main]** | **Director Draper reveals himself:** "Drop the Kellern act, Juno. I ran Accounts. Every job you took for me is on a charge sheet now. The debt's settled. I own the record." Make him say it (recorded) / offer a copy / end the call (`draper_revealed`) |
| Gate | **The Breaker** | If the strike held (`strike_held`: you stood with the crews and Hester's count is at least 3) the crews stand off the cranes; otherwise "Yard lockdown · Custody cranes armed · fight through". The hull serial BY9-001 is on the wall. **Ada's note 5 (her confession):** "Thirty-one breakers, built at Yard Nine... The readings that made the case, the lanes failing, the pressure moving toward the core, were mine. I carried them into the room myself. Find the room. The free ports kept the names." |

### Leg 6 · The Free Ports: *Who Was in the Room*

*Question: who was in the room, and what did they accept?* Gutter ports; everyone trades and nobody asks. Gate: **the Tollgate**, where Calloway's damping field holds the gate (no guns, no jump).

| # | Stop | What happens |
|---|---|---|
| 1 | **Saltquay** (landfall) **[Scene]** | An unmarked ship leads Juno around three pickets and leaves without a word (the Voice's guide) |
| 2 | **Duarte Harbour** **[Main]** | *Ines Duarte*, Guild harbour-master: "A berth for the Wayward, and no questions." Take the berth / pay your way / decline |
| 3 | **Penny Cross** (Gutter claim) | **[Job] Survey 4: Someone Answered** ("It answers only when your tank is full. Every time." The Wall: Cyrite draws them) |
| 4 | **Mirren's Pier** **[Main]** | *Old Mirren* keeps **the Forty**: the names of everyone in the room, including Ines's great-grandmother, Halvard Brook and **Ada Aster** (`forty_held`). **[Job] the Account 5: Draw Them Out** |
| 5 | **Lucky Haven** (breather) **[Scene]** | Thren glass sold by the gram; a child on the dock: "They're all looking at your ship. They like you!" (if the tank is full) |
| 6 | **Gilt Market** (Gutter market) **[Main]** | Ines offers a generous price for a copy of the file (if Juno took the berth); Val wants to "settle" (if Juno took her advance). **[Job] Quiet Line 7: Lose the Governor's Trail** |
| 7 | **Ninehaven** (Gutter port) **[Main]** | Static repeats Ada's note 1. **The Voice:** "WE BUILT THE BREAKERS THAT CLOSED THE LANES. THIRTY-ONE. THEY TOLD US TO FORGET. WE DID NOT. WE WERE NOT BUILT TO." Ask for the keys / let it read the file / cut every terminal |
| Gate | **The Tollgate** | Calloway's field. Answers: *Show the signature* (needs all three proofs: who was paid, who built the breakers, who was in the room, each earned two ways), *Run it with the Line* (needs Quiet Line step 5: Quill's decoys), *Bargain* (8 Cyrite), *Shoot the cutter*, *Run the field*. **Ada's note 6:** "Forty in the room. Two Wardens, Halvard Brook and me. I gave the readings. Lucan Calloway asked for ten years and a public warning... He said, 'Then I'll sign it, and you'll fund the ships.' They never funded the ships. I watched him sign. I said nothing at all." |

### Leg 7 · The Hollows: *What It Was For* (Act III begins)

*Question: what are the keys, and what is the Voice obeying?* "Nothing human lives here." Voice foundries and Thren lanes. Gate: **the Seam**.

| # | Stop | What happens |
|---|---|---|
| 1 | **Ashdeep** (landfall) | Act III title. **[Job] Survey 5: The Point of No Return** (a black hole) |
| 2 | **Hollowforge** (Voice foundry) **[Main]** | **The Thren speak, through the Voice:** "THEY SAY: YOU CARRY OURS. THEY SAY: GIVE IT, OR BE FOLLOWED." Vent six Cyrite / show them the file / cut the channel (`clue_cyrite`) |
| 3 | **Coldvault** | **[Job] the Account 6: Two Captains, One Wreck** |
| 4 | **Palecairn** **[Main]** | **Echo or Sable:** a shard of the Voice that wants to be free, or a human raised in a swarm who wants to go home. Free Echo / take Sable home / trust neither |
| 5 | **Mute Hall** (breather) **[Scene]** | The Thren line the lane, facing the way you are going: "It is a line. It is exactly a line. Nobody drew it." |
| 6 | **Ghostcinder** (swarm lane) **[Scene]** | The hardest Thren stop; the Voice's drones are letting the swarm through their gates |
| 7 | **Gaunt Watch** **[Main]** | **Noor Haddad**, Calloway's aide, is the Survey analyst: "Your readings went to the Governor. She has known what they are for years." Tell her the truth / lie / cut the channel |
| Gate | **The Seam** | The relay is the Voice itself: "ADA ASTER'S KEY. WE WERE TOLD TO WAIT FOR IT." Give it the key / ask what it would say / keep the key. If Survey count is 3 or more: "Your readings fit · the ring's centre is here". **Ada's note 7:** "The lanes are not ours. We found them and hung lamps on them. Cyrite is what the Thren leave behind, the way a reef leaves coral... The Voice was built to talk to them. My key is one of three that tells it what to say." Then **the implant:** Ada's routine in the helm has been learning who flies her: keep / burn / rewrite it |

### Leg 8 · The Last Lanes: *What You Do With It*

*Question: what will Juno do with the truth?* Gate: **the Threshold**. No jobs in this leg.

| # | Stop | What happens |
|---|---|---|
| 1 | **Lastlight** | Landfall |
| 2 | **The Last Toll** **[Main]** | *Oren Lisle*, archivist: "Every lane ends here. The toll is what you carry, or what you are." Pay (6 Cyrite) / say who you are / run the gate |
| 3 | **Thin Gap** **[Main]** | Oren's first question: who are you, to carry that? (a hauler pilot / a Warden's heir / nothing) |
| 4 | **Dimrim** **[Main]** | Second: what has it cost others? (own it / blame the Offices / nothing) |
| 5 | **Lone Step** (breather) **[Main]** | Third: what is it for? **Truth, mercy or freedom** (`oren_*`). Then the Voice: "WHO DO YOU TRUST WITH IT?" |
| 6 | **Dusk Mark** | "Instruments disagree" (a pulse). Inspector Ashgrove signals her through if she never fired on his pickets, or flies with Draper if she did. Calloway offers: *Stop, and I stop* (power down and she meets you alone) |
| 7 | **Wane Rest** | Draper: "Last chance to sell, Juno. Past that gate it's a recovery, and I recover everything." Beyond the ring the Thren gather. Sam, if four or more relays were lit: "I can hear you, Juno. Whatever you pick, I'm on the line." |
| Gate | **The Threshold** | Calloway waits. Her card is assembled from the whole journey (how you stopped, whom you lied to, what you took from her) and offers up to eight ways through: fight her, spool under her guns, thank her and go (if she read the signature), show her the archive (if you ever told her the truth), pay what you owe (if you took her name), remind her how it went, tell her the file is already out, go dark. Then **Ada's note 8** (to Juno by name if the routine learned it, to whoever flies her if it was burned): "Whatever you do at that gate, do it because you chose it. I have had enough of people signing things for other people." Then the ending choice |

### The endings (six; `src/content/endings.ts`)

The chase stops being about escape; you decide what the Severance file is worth. Each is opened by what the journey built; **Vanish is always open**. Each has an epilogue assembled from an opener, at most one line each of *thread payoff*, *person* and *cost*, Oren's answer, and a close.

| Ending | Pitch | What opens it |
|---|---|---|
| **Broadcast** | Send it everywhere. Let everyone decide. | Signals 2 or the long-range array with Office frequencies and Calloway listening, the whole file, or the Voice |
| **Unite** | Bring the Scatter together for the first time in seventy years. | Friends (standing 2) with two of miners, Frontier, Guild, Gutter; or one plus Contacts 2 or an ally; or Kessel Hold and the Long Walk |
| **Sell** | To the top bidder. Get rich enough to disappear. | Standing 2 with Guild or Gutter, a Gutter friend, Gutter names fitted, or Val's advance |
| **Trade** | Give it to Calloway for amnesty, a name, and a way home. | Calloway told the truth, Draper given time (`stalled`), or Custody standing, with the Offices not hunting you; or Calloway turned |
| **Seal** | Close the lanes for good. The Scatter stays free, and alone. | Guns or Rig 3, Guns and Rig 2, Calloway beaten and Guns 1, or the Voice's keys |
| **Vanish** | Take the Wayward off the charts. Let someone else decide. | Always |

Thread payoffs the epilogues read: Quiet Line 5+ (Quill and a hundred hulls carry copies into the core in Broadcast), Hester's crews 3+ (they join Unite with their strike fund), Survey 3+ (the motes stop gathering in Seal), Account 3+ with Draper revealed (the `stalled` flag that eases Trade).


---

## 5. How a job works

### 5.1 The idea

A job is **optional, refusable for free, and never a board**. Something in the sky is wrong or on offer: a toll beacon, a loaded tanker, a rig with its lamps on, a pilot at a start line, a patrol sweeping a drop, a black hole on the scope. The player flies near; a call rings; a card says what is asked. Every card has **at most three answers**: (1) the answer that takes the job on and plays its goal in the sky, (2) usually another way to settle it that pays far less or nothing (sell the coordinates, warn the target, report them to Custody, or a module-gated trick like jamming or spoofing), and (3) a refusal that costs nothing. Taking the job pins it on the HUD, compass and radar with its name and range.

In the code a job is a **situation** (`SituationDef` in `src/content/situations.ts`, the job rows in `src/content/missions.ts`) whose goal is one of eleven kinds, plus a **card** (`CardDef`) with its answers. The Run that plays the goal is `src/sim/mission.ts`; the stage that spawns ships, rings the call and settles the result is `src/sim/stage.ts`.

### 5.2 When and how a job reaches the player on the road

- The job is **pinned to its stop** (section 7); nothing else deals jobs on the road. It appears in the sky when the player arrives.
- A scripted **main card** at the stop plays first. A job's call then follows at least **20 s** after a story card closed (`DESK.eager`), with the floor's usual quiet. A few story cards (Ilse's order at Halden) explicitly hold the job (`holdsJob`).
- The call **waits for a clear sky**: never during a fight, mining, tight flying, jumping or docking, and never over the training. It lapses if unanswered (about 22 to 30 s). (The older generated-chart pilot rang a job a median 5 s after arrival; the road is paced by the comms floor, so a job follows a story card by about 20 s.)
- The job's waypoint and scope line appear only after its call has been heard.
- **Breather stops have no job.** Gates have none.
- The arrival also raises a teal "Scanning for transmissions" notice about 0.8 s in.

### 5.3 The goals (what the player does)

| Kind | The Run does |
|---|---|
| `destroy` | Spawns the foes when the call is taken; done when none is left (or only the *scatter* ship has to fall: the rest flee, pay is 70%) |
| `strike` | A target ship with 1.5 to 2.6 times a hull; at 30% of its hull it stops; close in slow for four seconds to take it. Destroyed outright: the cargo burns (30 to 40% pay). Some targets run (pace) |
| `defend` | A ward (rig or freighter) holds; foes within 95 units chew it; waves come out ahead on a timetable; hold N seconds. Pay by what is left of the ward |
| `race` | Beacons in order against a rival at 78 to 90% of the ship's top speed, rock in the gaps; three-second countdown |
| `survey` | A pull and navigation noise inside 330 units; a reading is 2.2 s inside a ring; the closer ring pays more; the core scorches a plate every 1.6 s |
| `sneak` | Patrols orbit the site; time inside a patrol's 62 to 70 units builds exposure (a spoofer, ghost echo or baffles slow it); full and the patrols turn on you. Some also need a hold of 6 to 7 s at the spot |
| `recover` | Four cases drift round a wreck field; slow beside each to take it (an ore tractor reaches further); a salvage crew arrives after the first |
| `reach` | Fly to a site and hold a few seconds; some require a handover of supplies first (`give`) or a short clock. A trap or a twist may spring |
| `follow` | Stay on a lead ship's wing for N seconds (the prospector, the hauler) |
| `watch` | Hold slow and close by a relay or wreck to record it |
| `call` | Just the card (plain situations; no jobs use it) |

### 5.4 Pay

Rows are written in *chits* (five to the Cyrite). A won goal pays: `chits / 5` Cyrite, **× 2.5** (the `JOB_PAY` factor, raised on 2 November 2026 so "one job buys several parts, mining is the slow grind"), **× a depth factor** that grows from 1 at Cerro to 2.5 at the Threshold, **× a share** if the goal scores in parts (rings reached, rig left, cargo spoiled: 40 to 70%), **+25% quick bonus** if done inside half the time limit (the notice says "quick bonus"). The pay appears as a green "Job complete" notice, or a gold "Job failed". Supplies in a win are not scaled. **The alternative answers on a card (sell, tell, warn, spoof, jam, tow, winch, strip, pay) apply their written outcome as it is, with no 2.5 and no depth factor.** (See gap 10.2.)

Hostile hulls scale harder than pay: their strength runs from ×1 at Cerro to ×8 at the Threshold (`DEPTH.threat`).

### 5.5 Twists, traps and quick turns

A job row may carry a **twist** (`threat`): hostiles arrive N seconds after the goal is taken, with a radio line (the Cyrite vein draws Gutter scouts, the missing shift a raider, the voice on the wire and the wreck's log company, the tanker its escort's reinforcements). A **trap** springs part-way out (the dead drop's three pickets). A **wave** list drops raiders on a timetable (the last shift, the witness).

### 5.6 What a job leaves behind

- **The card answer** applies Cyrite, supplies, standing (with six groups), notice (hidden standing with the Offices, Voice, Thren, Custody, Gutter), Wanted heat, flags, and sometimes spawns ships.
- **The goal outcome** (`win` / `lose` / `ignore`) does the same, and also a flag. Failing usually costs Wanted or notice, not Cyrite.
- **The chart effect** (`after.won / lost / ignored`) was written for the older generated chart: prices round the stop move for N days (`market`), the Net is held out of or pushed into nearby systems (`stallNear` / `pushNear`), Calloway gains or loses days (`hunt`), an Archive flag is set (`saw_hole`, `saw_hulk`, `thren_curious`, `saw_voice`…). On the linear road, `hunt` and the flags still matter; whether `market`, `stallNear` and `pushNear` do anything the player can see on the road is **not confirmed** (the road has no side systems, only the next stop).
- **Thread flags** (road only, section 6): `job_<id>_<answer>` (the answer chosen) and `job_<id>_<won|lost|declined|ignored>`.

### 5.7 Who gives them (the three groups)

For the player there are three groups, whatever the factions underneath: **corporate** (Continuance, Custody, Offices, Kellern, the Survey Office), **frontier** (Holdfasts, Drifts, the Gutter, Dust Traders, independents) and **unknown** (the Thren, the Voice). A job's `group` is `frontier` or `corporate`; none of the 25 is `unknown`. The card's `caller` colours its channel: miners, gutter, frontier, guild, custody, office, kellern, unknown.

---

## 6. The four threads

On the road the 25 jobs are grouped into four ordered threads that run the length of it (`src/sim/threads.ts`). A card shows a **thread chip** (name, plus one line in a character's voice) only on the road. A step counts when its job was **won and not settled aside** (answers `sell`, `tell`, `warn`, `strip`, `rob` do not count). The counts are rebuilt every step from the flags and drive payoffs.

| Thread | Contact | Steps (in road order) | What counts it pays |
|---|---|---|---|
| **Quiet Line** | Owen Pike (voice), then Quill | 7: Nothing to Declare, Stay Out of Range, The Dead Drop, Get the Witness Out, Race for the Wreck, Run the Needle, Lose the Governor's Trail | At the Tollgate: Pike sends one runner (1 to 2 steps), decoys (3 to 4), or at 5+ Quill flies point and a fifth answer opens, *Run it with the Line*. In Broadcast a hundred hulls carry copies. Steps 3 and 4 also reveal **Val as the leak** |
| **Hester's crews** | Hester Vane | 7: Follow the Cyrite Vein, Break the Pirate Toll, The Missing Shift, One Filter Left, Escort the Hauler, Hold the Last Shift, Clear the Crossing | 3+ (with standing with the crews at the Breaker) holds the yard strike (`strike_held`); 5+ puts the whole list at the Breaker ("Look out your port side. That's the list."); 3+ makes them allies for Unite. **The Heavy Tanker costs it 1, the Stolen Payroll 2** |
| **The Survey** | an anonymous analyst, revealed as Noor Haddad at the Hollows | 5: The Wreck That Remembered, Something in the Dark, The Voice on the Wire, Someone Answered, The Point of No Return | 3+ at the Seam: "Your readings fit · the ring's centre is here" (shown, not told), and the Seal epilogue where the motes stop gathering |
| **The Account** | Kellern Recovery · Accounts, which is Director Draper | 6: Wanted: Alive, The Heavy Tanker, Stolen Payroll, The Drift Cache, Draw Them Out, Two Captains, One Wreck | Takes 14 off the 80 CR breach debt a step (the Course screen shows what is left). Draper reveals himself at Davit Dock after step 4. With him revealed and 3+ steps (`stalled`), Trade is easier, Draper writes that you were coerced, and a follow-up card is gated by it |

**Collision chips.** Four jobs won for one thread cost another (`COLLISIONS` in `content/road.ts`): the **Heavy Tanker** (it carried Hester's filters; miners −1, and −1 on Hester's count), the **Stolen Payroll** (their wages; miners −2, −2 on the count), the **Drift Cache** (Drift property; removes `wren_trust`), **Two Captains, One Wreck** (one captain flies for the Frontier; frontier −1). Their cards say so on the chip: *Account · Hester's crews ↓*, *↓↓*, *Account · Wren ↓*, *Account · Frontier ↓*.

**Thread lines on the radio.** For most jobs a named voice answers each result: Pike, Hester ("That's two. I'm writing your name down."), Quill, the analyst, Kellern Recovery ("{debt} outstanding. Thank you for your business."), Wren. Coverage is uneven (section 10.1 lists what is missing).

**The debt.** The breach invoice at Cerro is 80 CR (25 + 35 + 20). The Account takes 14 off per step won (to 0 at the sixth), and the Course screen shows what is left, "settled" after Draper's reveal. It is in credits, a different unit from Cyrite, and there is no way to pay it directly (section 10.2).

---

## 7. All 25 jobs

In road order (the order the player meets them). "Base / at ×2.5 / here" is the Cyrite a won goal pays: as written, after the 2.5 factor, and an estimate with the depth factor at that stop (the stop's column of 65). "Alternative answers" are the answers other than the job and the refusal.

| # | Job | Id | Where (leg · stop) | Thread · step | Giver | Goal | Base / at ×2.5 / here | Time limit | Alternative answers |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Nothing to Declare | `nothing_to_declare` | The Reach · 3. Halden’s Reach | Quiet Line · 1 | A runner · no name | sneak | 26 / 65 / ~70 | 200 s | Sell the drop location to Custody |
| 2 | Follow the Cyrite Vein | `follow_cyrite` | The Reach · 4. Hollis | Hester’s crews · 1 | A prospector | follow | 18 / 45 / ~49 | 90 s | Take her find |
| 3 | Break the Pirate Toll | `pirate_toll` | The Reach · 7. Branford | Hester’s crews · 2 | Dispatch · mining guild | destroy | 22 / 55 / ~64 | 150 s | Jam their communications (needs jammer) |
| 4 | Stay Out of Range | `keep_distance` | The Marches · 2. Kessel Hold | Quiet Line · 2 | A broker · no name | sneak | 30 / 75 / ~94 | 200 s | Sell the patrol’s route |
| 5 | Wanted: Alive | `wanted` | The Marches · 3. Tamsin Field | The Account · 1 | Custody liaison · a bounty | strike | 34 / 85 / ~109 | 150 s | Warn Brannock |
| 6 | The Missing Shift | `missing_shift` | The Marches · 6. Gannet Reach | Hester’s crews · 3 | Union clerk | reach | 20 / 50 / ~67 | 170 s | Report the crew to Custody |
| 7 | The Heavy Tanker | `heavy_tanker` | The Marches · 7. Sallow Port | The Account · 2 | A fixer · no name | strike | 30 / 75 / ~103 | 170 s | Warn the tanker |
| 8 | One Filter Left | `one_filter` | The Salvage Belt · 1. Breakwater | Hester’s crews · 4 | Settlement steward | reach | 24 / 60 / ~85 | 90 s | Sell the parts instead |
| 9 | The Wreck That Remembered | `wreck_remembered` | The Salvage Belt · 3. The Graveyard | The Survey · 1 | Salvage broker | watch | 24 / 60 / ~88 | 150 s | Salvage the wreck instead |
| 10 | The Dead Drop | `dead_drop` | The Salvage Belt · 4. Kessler’s Wreck | Quiet Line · 3 | A broker · no name | reach | 28 / 70 / ~104 | 170 s | Tell Custody about the drop |
| 11 | Get the Witness Out | `the_witness` | The Salvage Belt · 6. Kiln | Quiet Line · 4 | Brother Orrin | defend | 30 / 75 / ~115 | 60 s hold | Hand the witness to Custody |
| 12 | Escort the Hauler | `long_walk` | The Salvage Belt · 7. Tarik’s Lamps | Hester’s crews · 5 | Hauler Dunne | follow | 24 / 60 / ~93 | 160 s | Tow the hauler (needs tractor) |
| 13 | Race for the Wreck | `finders_keepers` | The Drift Deep · 2. The Quiet Ferry | Quiet Line · 5 | A claims clerk | race | 30 / 75 / ~122 | 120 s | Spoof the rival’s transponder (needs spoofer) |
| 14 | Something in the Dark | `something_dark` | The Drift Deep · 3. Lantern Mile | The Survey · 2 | Survey Office | survey | 32 / 80 / ~132 | 200 s | Sell the coordinates |
| 15 | Stolen Payroll | `missing_payroll` | The Drift Deep · 4. Ninth Fold | The Account · 3 | A fixer · no name | strike | 36 / 90 / ~150 | 150 s | Warn the mining barges |
| 16 | Hold the Last Shift | `last_shift` | The Drift Deep · 6. Stillwater | Hester’s crews · 6 | Rig foreman · Hester | defend | 27 / 68 / ~116 | 75 s hold | Evacuate the crew (needs tractor) |
| 17 | Run the Needle | `needle` | The Breaker Yards · 2. Yard Nine | Quiet Line · 6 | Quill · independent pilot | race | 28 / 70 / ~127 | 130 s | Spoof Quill’s transponder (needs spoofer) |
| 18 | The Drift Cache | `drift_cache` | The Breaker Yards · 3. Anvil Slip | The Account · 4 | Guild salvage desk · open claim | recover | 28 / 70 / ~128 | 160 s | Winch them in (needs tractor) |
| 19 | The Voice on the Wire | `voice_wire` | The Breaker Yards · 4. Keelberth | The Survey · 3 | An old relay · no callsign | reach | 26 / 65 / ~121 | 150 s | Jam the relay (needs jammer) |
| 20 | Clear the Crossing | `kill_zone` | The Breaker Yards · 6. Torchwall | Hester’s crews · 7 | Guild dispatch | destroy | 34 / 85 / ~162 | 170 s | Jam their communications (needs jammer) |
| 21 | Someone Answered | `someone_answered` | The Free Ports · 3. Penny Cross | The Survey · 4 | Survey Office | watch | 26 / 65 / ~131 | 150 s | Sell the coordinates |
| 22 | Draw Them Out | `be_bait` | The Free Ports · 4. Mirren’s Pier | The Account · 5 | Guild gunship | destroy | 32 / 80 / ~163 | 160 s | Warn the Custody patrol |
| 23 | Lose the Governor’s Trail | `lose_prefect` | The Free Ports · 6. Gilt Market | Quiet Line · 7 | A broker · no name | sneak | 20 / 50 / ~104 | 200 s | Pay the broker to erase it |
| 24 | The Point of No Return | `no_return` | The Hollows · 1. Ashdeep | The Survey · 5 | Survey Office · open contract | survey | 44 / 110 / ~237 | 220 s | Sell the coordinates |
| 25 | Two Captains, One Wreck | `two_captains` | The Hollows · 3. Coldvault | The Account · 6 | Two crews · one wreck | destroy | 34 / 85 / ~187 | 170 s | Salvage while they argue |

**Jobs per leg:** Reach 3, Marches 4, Salvage Belt 5, Drift Deep 4, Breaker Yards 4, Free Ports 3, Hollows 2, Last Lanes 0. If a player took every job as a win, the road's job income would be about 2,900 Cyrite (ex quick bonuses; estimated with the formula above), shaped like this per leg: Reach ~180, Marches ~370, Belt ~490, Deep ~520, Yards ~540, Ports ~400, Hollows ~420, Last Lanes 0.

### 7.1 Where each thread's steps sit on the road

| Leg | Quiet Line | Hester’s crews | The Survey | The Account |
|---|---|---|---|---|
| The Reach | 1. Nothing to Declare (Halden’s Reach) | 1. Follow the Cyrite Vein (Hollis)<br>2. Break the Pirate Toll (Branford) | — | — |
| The Marches | 2. Stay Out of Range (Kessel Hold) | 3. The Missing Shift (Gannet Reach) | — | 1. Wanted: Alive (Tamsin Field)<br>2. The Heavy Tanker (Sallow Port) |
| The Salvage Belt | 3. The Dead Drop (Kessler’s Wreck)<br>4. Get the Witness Out (Kiln) | 4. One Filter Left (Breakwater)<br>5. Escort the Hauler (Tarik’s Lamps) | 1. The Wreck That Remembered (The Graveyard) | — |
| The Drift Deep | 5. Race for the Wreck (The Quiet Ferry) | 6. Hold the Last Shift (Stillwater) | 2. Something in the Dark (Lantern Mile) | 3. Stolen Payroll (Ninth Fold) |
| The Breaker Yards | 6. Run the Needle (Yard Nine) | 7. Clear the Crossing (Torchwall) | 3. The Voice on the Wire (Keelberth) | 4. The Drift Cache (Anvil Slip) |
| The Free Ports | 7. Lose the Governor’s Trail (Gilt Market) | — | 4. Someone Answered (Penny Cross) | 5. Draw Them Out (Mirren’s Pier) |
| The Hollows | — | — | 5. The Point of No Return (Ashdeep) | 6. Two Captains, One Wreck (Coldvault) |
| The Last Lanes | — | — | — | — |

### 7.2 Which stops stack a story card and a job

Of 64 stops, **14 have both a main card (or two) and a job** (the player gets a paused story card, then a job call at least 20 s later), **11 have a job only**, **18 a card only**, and **14 neither** (breathers, landfalls and scenes). The stacked 14: Halden's Reach, Kessel Hold, Tamsin Field, Gannet Reach, Kessler's Wreck, Kiln, Tarik's Lamps, The Quiet Ferry, Ninth Fold, Yard Nine, Keelberth, Torchwall, Mirren's Pier, Gilt Market. In most of them the card and the job are about different things (Kessel Hold: the moot vs copying patrol codes; Mirren's Pier: the Forty vs luring pickets).


---

## 8. Everything else that can happen at a stop

The 25 jobs are not the only content that behaves like a job. Three more layers sit on top of the road.

### 8.1 Pinned scenes of the unknown (10; mostly no card, no pay)

One meeting with the Thren or the Voice per leg, at a fixed stop with no job (`scene` in `content/road.ts`, definitions in `content/situations.ts`). Most are a ship behaviour plus one radio line; only some have a card.

| Stop | Scene id | What the player sees |
|---|---|---|
| Wake | `thren_curious` | One unknown contact matches your speed and keeps its distance. Scope: "One contact matching our speed. No hail. No weapons detected." |
| Saltmarsh | `thren_swarm` | Seven motes and a weaver move through the Cyrite field. Script: "motes like a river"; they turn toward a full tank |
| Longwater | `thren_shadow` | Three unknown contacts follow; "the Jump Gate is drifting. It is not us. Something else is moving it." |
| Kindmere | `lane_signal` | A pattern in the noise that changes when you listen. Card: answer in kind (a lane name resolves) / vent 3 Cyrite (feed it) / switch the scope off |
| Cutton | `yard_hulk` | A Custody yard with a Thren hulk on a cradle. Card: cut it loose (turns the yard hostile) / help the crew cut it up (12 Cyrite) / mind your business |
| Saltquay | `voice_guide` | An unmarked ship crosses your bow and waits; three pickets wait on the straight line out. Follow it (leads you round them, Calloway +0.5 day) / open fire / fly your own line |
| Ninehaven | `thren_exchange` | A Thren object holds a crystal and looks at your tank. Take it / vent 4 Cyrite / answer its pattern (needs the long-range array) / attack (spawns motes) / back away. Gives a "lens" |
| Mute Hall | `thren_watch` | Six motes and a shard line the lane facing your way. "It is exactly a line. Nobody drew it." |
| Ghostcinder | `foundry_both` | A Voice foundry; the Thren in it. "They are not fighting. The drones are letting them through the gates." |
| Dusk Mark | `unknown_pulse` | "Every instrument disagrees for a few seconds." |

### 8.2 Chance cards and delivery jobs (older layer, not curated against the road)

About 35 **chance cards** (`content/cards.ts`, trigger `chance`, plus follow-ups) can still fire at any non-quiet stop that is not the very first system, roughly one a sortie when the desk wants one (`DESK.chance`: 40% of sorties have one, on an opportunity such as a fight won or a long quiet). They are trade offers (Old Hesketh's Cyrite, an Ares tender, a fuel runner, food traders, a forged-codes seller), pleas (a crew out of power, a survivor in a life pod, a holdout), shakedowns (the Hollow Saints' toll, a Custody picket's fine, claim jumpers, an Offices ambush), distress calls (a reactor failing, a freighter under raiders, a crippled Custody picket, a cache beacon), rumours, Calloway warnings (*Come home, Juno*, *One system behind*), bulletins, and region-specific ones (a Drift fleet, a Thren smell, a Voice foundry asking). Several are **home-only** (Cerro: stowaways, the foreman, the haul job, the decoy, sweep warning) and never appear on the road.

A few cards pay out as **delivery jobs** that the world carries until the next port or lane crossing (`job:` on a card outcome, `settleJobs` in `sim/world.ts`). These are a second, simpler job system alongside the 25:

| Card | Offer | Pays on delivery | Notes |
|---|---|---|---|
| `salvage_job` (Ares Drive desk) | Deliver 6 supplies to the next port (costs 14 Cyrite to acquire them) | "seventy" (it is 70 chits = 14 Cyrite) + Frontier +1 | Chance, anywhere |
| `courier` (Dust Traders courier) | Carry a sealed case through the lane; 8 Cyrite now | "the balance": only an arcade *score* of 2,500 and Guild +2 | Chance; a follow-up card `tracker_found` can reveal a tracker; `loseIf` tracker |
| `haul_job` (Frontier Supply) | Carry a crate to the next dock | "sixty" (60 chits = 12 Cyrite) + Frontier +1 | Home only |
| `runner_favour` (Tallow) | Settle with 6 supplies or carry a package to the dock | standing | Follow-up to buying from the fuel runner |
| `pod_thanks`/technician | Drop a rescued technician at the dock | 40 chits (8 Cyrite) + Frontier +1 | Follow-up to the life pod |
| `stowaways` → passengers | Hide three Kellern workers through the lane | score + miners +1 | Home only |

### 8.3 The older "classic" dealing (not used on the road)

Before the authored road, jobs and situations were **dealt onto a generated chart** by a timetable (`JOB_COLS`: four columns in the first region and six in each other region carry a job in every system of the column, so about two stops in three), with the roll adding more, and the 25 jobs had `regions` and `kinds` fields saying where they could appear. That is still what `?classic` plays. It also deals 33 other **situations** (`content/situations.ts`): a hauler with stock, a settlement short of supplies (bring 3 supplies), a courier overdue, a salvage dispute, a convoy wanting an escort, a sealed crate, a resistance cell (bring 4 supplies), a Custody inspection, a lockdown, a survey relay to cut, a Net sweep, and the Thren and Voice encounters of `ARC`. **On the road none of those are dealt**; only the 25 jobs and the 10 scenes above are. Document the rework against the road.

---

## 9. How the jobs and the story fit together

**The idea.** The main story is a spine of 49 scripted "main" beats (cards that hold the gate), eight of Ada's notes, and the six endings. The jobs are the *side* of the story: each one is a person or place in the Scatter that the road passes, and the four threads are how Juno's reputation builds up behind her. By the Tollgate the road asks, in effect, "who did you help?": the Line's decoys, Hester's crews at the Breaker, the Survey's map at the Seam, and the debt that Draper holds.

**What works.**
- Every job is optional and has a free refusal; most have a "sell/warn" alternative and a module-gated trick, so builds matter (jammer, spoofer, tractor).
- Each thread has a named human voice answering your result, a payoff threshold, and at least one cross-thread collision (tanker vs. Hester, payroll vs. Hester, cache vs. Wren, captains vs. Frontier).
- The jobs never replace the story: a stop's main card always plays first and the gate waits for main beats, not jobs.
- Thread steps have a "decline" and a "settled aside" state, so the same job can be refused, won or sold and each is remembered.

**Pacing numbers.** Pilot runs of the whole road take 183 to 207 minutes for 64 stops (about 3 minutes a stop; legs 20 to 28 minutes; the Narrows alone ~7). The pilot does not read or linger, and takes jobs by policy, so a human will be slower. The design target was ~40 minutes a leg, and the whole game was planned as 6 to 10 hours; **the road is currently about a third of that in pilot time.**

**The money.** Pay per job runs about 20 to 160 Cyrite (section 7), the refit bay's parts cost 20 to ~60+ each and climb with every purchase (+25% a level, +7% per part fitted), a jump costs a lane's worth of fluid (a few Cyrite), and mining a stop yields tens of Cyrite. A pilot reaching the Narrows has banked 40 to 90 Cyrite in the Reach. So early jobs (Reach, ~40 to 70 Cyrite each) are worth one to two parts; late jobs (~150 to 200) several. The alternative answers pay 2 to 12 Cyrite (flat), see gap 10.2.

**Difficulty.** Hostile hull strength scales ×1 to ×8 across the whole road; job pay ×1 to ×2.5. Stealth, race and survey jobs depend on skill and a few modules rather than hull. No job has been tuned by a human; the pilot scores combat but not stealth/race feel.

---

## 10. Gaps and inconsistencies

I found these reading the code. Each says what is there and why it is a gap; "(verified)" means I checked the data, "(unverified)" means it is my inference. Ordered by how much I think they matter.

### 10.1 The jobs' answers are uneven

(verified) For the road's thread jobs a named voice answers the result by radio, but only for some outcomes. "Won" is covered for 23 of 25. **No reply at all:** `be_bait` (Draw Them Out) and `no_return` (The Point of No Return). **Only the "won" outcome is answered** (nothing for lost, declined, or the sell/warn answer): `wanted`, `last_shift`, `kill_zone`, `wreck_remembered`, `something_dark`, `voice_wire`, `someone_answered`, `the_witness`, `lose_prefect`, `two_captains`, `missing_payroll`, `heavy_tanker`, `drift_cache`. Answered for won/lost/declined: `pirate_toll`, `missing_shift`, `one_filter`, `nothing_to_declare` (won/sell/declined). Nothing answers `ignored` (call lapsed or ship left). A player who refuses a Quiet Line or Survey job gets silence, and a lost job gets none.

### 10.2 Money and units

1. (verified) **Alternative answers are not scaled by the 2.5× pay factor or the depth factor; goal wins are.** Selling the drop location pays a flat 6 Cyrite while delivering it pays about 65 to 70; selling the black hole's coordinates 2 vs. about 110 to 150; selling the patrol's route 4 vs. ~75. Before 2 November the ratio was about 4:1, now it is 10:1 to 50:1, so "sell it" is a trap rather than a real alternative. `docs/MISSIONS.md` still says an alternative "pays far less, or nothing" (true, but no longer a choice). The module tricks (spoof 8 Cyrite vs. race ~60; winch 20 vs. ~60) have the same ratio.
2. (verified) **Tractor answers contradict themselves.** `last_shift` "Evacuate the crew": the hint says *spend* 3 supplies, the outcome text says "3 supplies recovered" and the data **gives** 3 supplies. `long_walk` "Tow the hauler": hint "Spend 3 supplies", text "3 supplies used", data gives +3.
3. (verified) **The debt is 80 "CR" (credits) and nothing can pay it.** It falls 14 a step of the Account; after Draper's reveal it is "settled". Credits are a different unit from Cyrite (the opening's bay/invoice are in credits; the rest of the game in Cyrite). The Account's "settle your debt" promise (Tamsin Field: "someone offers to settle your debt") is paid with nothing but a number on the Course screen.
4. (verified) **Two delivery cards state a pay in the wrong unit**: the Ares salvage desk "pays seventy" but pays 14 Cyrite (70 chits); the haul job "sixty" pays 12 Cyrite. **The courier's "balance"** is an arcade `score` of 2,500, not Cyrite. (unverified) I did not check whether `score` is shown or used in the Story at all.
5. (verified) Pay and danger rise on different curves. The pay factor from depth runs from 1 to about 2.5, and the quick bonus (+25%) stacks with it, while hostile hull strength runs from ×1 to ×8. So the late jobs (Yards, Hollows) are the hardest fights in the game on a pay curve that has risen far less than the danger.

### 10.3 Where jobs sit vs. what the Beat Map asked for

(verified against `docs/overhaul/BEAT_MAP.md`.) The beat map put jobs on roles (work, pressure, reckoning) and paired collisions on the same stop. The build made "one job per stop" and moved several:

| Beat Map | Built |
|---|---|
| Quiet Line 2 (Copy the Patrol Codes) at **Gannet Reach** (pressure) | at **Kessel Hold** (hub), so it stacks with the moot card |
| One Filter Left at **Sallow Port** (reckoning), colliding with the Heavy Tanker on the same stop | at **Breakwater**, the *next* leg's landfall; the tanker's "it carries our filters" is spoken a leg before the filters ask (10.4) |
| Stolen Payroll at the Drift Deep's pressure stop with Last Shift | at **Ninth Fold** (turn), two stops earlier |
| Race for the Wreck + Something in the Dark both at **Work** | Race at the **hub** (the Quiet Ferry, stacked with Ossie's card), Dark at Work |
| Cache + Needle both at **Work** | Needle at the **hub** (Yard Nine, stacked with Anand's work order) |
| Voice on the Wire at **pressure** with Clear the Crossing | at **Keelberth** (turn), stacked with Sam's call |
| Survey 4 + Account 5 at **Work** | Draw Them Out at **Mirren's Pier** (turn, stacked with the Forty) |
| Survey 5 + Account 6 at **Work** | The Point of No Return at **Ashdeep** (landfall); Two Captains at Work |

Net effect: 14 stops stack a paused story card and a job (section 7.2), and the Hollows and Last Lanes (the part of the story that matters most) have two jobs between them.

### 10.4 Lines that do not match what happened

- (verified) **Hester's counts are hard-coded.** "That's two. I'm writing your name down." (`pirate_toll` won) and "Eleven home. That's three. I'm still writing." (`missing_shift` won) are played whatever Juno did earlier. A player who declined the first job hears "That's two" for the first.
- (verified) `needle` **lost** and **won** play the identical Quill line ("You fly like you've got somewhere to be. Pike says you do. Fine. I'm in."). A lost race does not count as a thread step but Quill still says she is in.
- (verified) Heavy Tanker's chip says "It carries their filters" and Hester says "That tanker carried our filters" at Sallow Port, but the filters job (One Filter Left) is the next leg's first stop; the player has not seen a filter shortage yet.
- (verified) `be_bait`'s chip says "Custody pickets, two of them" but the job spawns four.
- (verified) `wreck_remembered`'s card is from a "Salvage broker" but the thread chip says "Survey Office" and the analyst answers: the thread is told by the chip, not the giver. The same is true of the Account (see 10.6).
- (unverified) The older Hester card `sc_shift` is "Rig foreman · Hester" asking for help at an unnamed rig at Gannet Reach; on the road Stillwater is "Hester's own rig" and its call is a different job (`last_shift`) with the same card. So the card text ("Raiders are coming for the rig. Forty of us aboard") is generic and the thread voice does the personalising.

### 10.5 Characters appear in chips before they have been introduced

(verified) The Beat Map's rule 0.4 says characters must be introduced before they make offers. In the build:
- **Hollis** (stop 4, leg 1): the job's chip is *Hester's crews* with "Kellern docked my crew for a missed quota", but **Hester Vane first speaks at Vesta** (stop 6).
- **Halden's Reach** (stop 3): the first job's chip says "Pike says you've got reasons to keep quiet"; **Owen Pike** first speaks *after* the job.
- **The Survey** chip lines ("Survey Office. The last reading.") start with a faceless voice by design (Noor is revealed at the Hollows), which is fine.
- **Draper**: "Foreman Draper" is only ever introduced by a Cerro *chance* card (`foreman`, home-only) that the authored opening almost never shows; the road's first Account call is "Kellern Recovery · Accounts" and the Wanted: Alive card is from a "Custody liaison". The reveal at Davit Dock, "Same man, other badge", assumes a Draper the player may never have met.

### 10.6 The Account thread

(verified) It is the weakest of the four:
- Its six jobs have six different givers (a Custody liaison, a fixer, a fixer, a Guild desk, a Guild gunship, "two crews"); only the chip line and the "{debt} outstanding" radio tie them to Kellern Recovery. After the reveal "every job you took for me is on a charge sheet" is a retcon the cards do not support.
- Draper says "The debt's settled" after step 4 with 24 CR still showing; steps 5 and 6 then have **no consequence**: `be_bait` has no reply, and the Kellern line on `two_captains` can never fire (its condition requires `draper_revealed` to be false, and Draper's card is a main beat at Davit Dock, before Coldvault).
- Its only mechanical payoff is `stalled` (revealed + 3 steps) which eases Trade and unlocks a follow-up card; it has no payoff for Unite, Sell, or the endings other than Trade.
- It is also the thread that **hurts** the others (three collisions), so a player who does it well is punished elsewhere, but the cost is spoken only by Hester.

### 10.7 Payoffs read only some steps

(verified) Counts read by the endings and the Tollgate: Quiet Line ≥1, ≥3, ≥5; Hester's crews ≥3 and ≥5; Survey ≥3 only; Account ≥3 only. So **Survey steps 4 and 5, Account steps 4 to 6, Hester's steps 6 and 7 and Quiet Line steps 6 and 7 change nothing mechanical** beyond their own radio line. The **Sell** ending has no thread-payoff line at all. `strike_held` needs `crews_stood` (a story card choice) *and* Hester ≥3, so the thread alone cannot hold the strike.

### 10.8 Stacking and pacing

(verified) 14 stops give a paused story card followed 20 s later by a job (10.3); on phones that is a lot of pauses in a short time. The floor allows a card 20 s after the previous one; the job call is the same weight as a card. Several stops (Longwater, Cutton… Hushlight, Wane Rest) have almost nothing at all, so the load is uneven: the Deep and the Yards are heavy, the first and last stops of most legs and the Hollows light. The Last Lanes have no jobs, and only one Hollows stop after the landfall has one.

### 10.9 The jobs are not much alike in tone

Four of the five *sneak* jobs and two of the three *strike* jobs are mechanically near-identical (patrols, hold still; cripple then hold close). The Quiet Line is almost entirely stealth (3 sneak, a reach, a defend, two races); the Account is almost entirely violence/theft (3 strike, 2 destroy, a recover). That helps thread identity but makes each thread feel the same for seven stops. The goal-kind counts across the 25 are: reach 4, destroy 4, strike 3, sneak 3, defend 2, race 2, survey 2, follow 2, watch 2, recover 1.

### 10.10 Documentation that disagrees with the code

- `docs/MISSIONS.md` and `docs/BALANCE-JOBS.md` describe the old chart dealing (pay in the unmodified numbers, jobs "from the Reach to Drift Deep" by `regions`); BALANCE-JOBS reports 5 to 18 jobs a region from a pilot on the generated chart, not the road's 0 to 5.
- `docs/PLAN.md` says "32 jobs" and "save v16" (code: 25 jobs, save v23, VISION says about 85 stops and 7 hours; the road has 64 stops).
- The player walkthrough's section 6 and 7 (project folder `walkthrough/`) still describe generated regions after the Narrows; the authored legs are in `docs/ROAD.md` and `docs/overhaul/`.
- The `regions` and `kinds` fields on the 25 jobs are dead on the road (they only steer `?classic`).

### 10.11 Smaller notes

- (verified) The Missing Shift hint says "Bring 1 supply" and `give: {supplies: 1}` but the win text says "they share the ore they recovered" and gives 3 supplies, so it nets +2; the filter job is "2 supplies in 90 s" and pays 24 Cyrite base: the 90 s limit and the supply requirement are the only difficulty, and a player who has no supplies can't take it.
- (verified) Three jobs need a fitted module for their trick answer: Jammer (`pirate_toll`, `kill_zone`, `voice_wire`), Spoofer (`needle`, `finders_keepers`), Ore tractor (`last_shift`, `long_walk`, `drift_cache`). The answer is shown dimmed with what it needs.
- (verified) The Thren are said not to be killable before the Hollows, but several Quiet Line / Account jobs spawn combat in places where motes appear (Saltmarsh's scene is a breather, so no job sits on it).
- (unverified) `after.market`, `stallNear`, `pushNear` and `forget` effects were designed for a chart of side systems; I did not check what they do on the road.
- (verified) `ignored` and `lost` for non-thread situations (chance cards) have different rules than thread jobs; a job whose call lapses sets `job_<id>_ignored` and is not counted as declined.

---

## 11. Constraints for the rework, and a shape for your answer

### 11.1 What you must not break

These are the owner's standing decisions (from `CLAUDE.md`, `docs/DESIGN-GUIDELINES.md` and the project's notes); a rework that ignores them will be rejected.

1. **The road is strictly linear and fixed** (owner, 25 October 2026). One gate out of each stop; no detours, no sideways lanes, no chart. Existing stops, names and order stay unless you argue for a change. 64 stops; "every stop must earn its existence".
2. **One job per stop at most; none in breathers or at gates.** A stop's main story card plays first; the Jump Gate holds for main beats, never for jobs.
3. **Every job is optional, refusable for free, and has no failure that ends the run.** Choices show costs as chips and never lock the player out. A card has **at most three answers**; copy caps are a Moment 60 words, a radio Voice 20 words, a hint 19, a label 8 words, a notice headline 3 words and its reason 6 (`tests/caps.test.ts`).
4. **Decisions pause the world.** A new decision follows the existing pattern (a phase in `World`, an answer method the app and the test pilot both call).
5. **`src/sim` never imports Three.js.** Jobs run on plain data in 1/60 s steps so tests and the scripted pilots play them headless. Data over code: jobs, cards, threads and scripts are rows in `src/content/`; their rules live in `src/sim/`.
6. **Playable without reading.** The goal sits on screen as a verb; choices read as a verb plus chips; no mechanic lives only in prose.
7. **English and German.** Every line needs a German twin (`src/i18n/de/`, informal du); British English in docs.
8. **The Civic Score is gone.** Do not bring back its calculations, UI or penalties. Standing with six groups is the reputation system.
9. **Tone:** minimal, calm, honest UI; realistic not cartoonish; red is for threat only (never a red sky); the Thren are never explained before the Hollows ("show, never explain"); the Voice speaks in capitals.
10. **Saves are versioned.** A change to the journey's shape bumps `VERSION` in `src/sim/journey.ts` and adds a migration in `src/meta/save.ts`. Flags set by jobs (`job_<id>_...`) are read by the script and the endings; renaming one needs the readers updated.
11. **Sound is off** and not part of the work. Phones are landscape only; every answer must be reachable on a 568×320 phone with 40 px targets.
12. **Balance comes from numbers:** pilot reports (`npm run pilot:jobs`, `pilot:overhaul`, `pilot:road`) and the matching `docs/BALANCE*.md`. The owner plays real devices; say plainly what you did not measure.

### 11.2 What is open to change

Any job's name, giver, stop, goal, numbers, answers and lines; the thread membership and order; the payoffs; adding or cutting jobs (keep the one-per-stop rule or argue for lifting it); the pairing of cards and jobs at a stop; the Hollows and Last Lanes (currently nearly job-free); whether the Account is Draper from the start; the sell/warn alternatives' pay; the delivery-job layer; which chance cards are allowed on the road.

### 11.3 A shape for your answer

1. A **one-page verdict**: what works, what does not, the three changes that matter most.
2. A **revised job list** in the same table shape as section 7 (id, stop, thread and step, giver, goal, pay, alternatives), marking each job *keep / change / cut / new* with one line of why.
3. For each *change* or *new* job, a card in the shape of Appendix A (call, sky line, answers with costs and effects, win/lose/ignore, what it leaves behind, the radio lines that answer it, German note not needed).
4. A **thread plan**: for each thread its arc, what each step reveals, the payoff thresholds and what the endings read.
5. A **money pass**: base pay, alternative-answer pay, the debt, against the economy in section 9.
6. A **change list for the code** (which rows in `missions.ts`, `road.ts`, `threads.ts`, `script/legs.ts`, `endings.ts`, `i18n/de/`), so a developer can apply it.
7. Open questions for the owner.

If you cannot read the repository, say so before you start and ask for the files named in sections 0 and 1 to be attached; do not guess.

---


---

# Appendix A. All 25 jobs, in road order, every field



### Nothing to Declare  `nothing_to_declare`

- **Placed at:** The Reach, stop 3 of 8, **Halden’s Reach** (port, held by kellern; role: hub; Course line “find the Warden’s record”).
- **Thread:** Quiet Line (Owen Pike), step 1 of 7.
- **Giver:** A runner · no name (gutter; card kind job; weight important).
- **What the player sees in the sky:** a beacon — A courier needs a package delivered through a Custody patrol without being detected.
- **The call:** “Deliver a package inside a Custody patrol route. Three ships are sweeping the area. Slip between them, hold at the drop point, then leave.”
- **Sky line on the card:** A patrol · three hulls, slow sweep
- **Thread chip and line (road only):** *Quiet Line* — “Pike says you’ve got reasons to keep quiet.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Sneak — HUD line “Reach the drop point without being detected”. Hold 0s, limit 200s.
- **Ships:** 3× picket “Custody patrol” (wary).
- **Answers:**
  - **Deliver the package unseen** (trade): Avoid detection. A spoofer, ghost echo or baffles can slow the patrol’s exposure meter. → Heading to the drop point
  - **Sell the drop location to Custody** (trade): Receive 6 Cyrite for giving up the location, but the Gutter will know you talked. → 6 Cyrite received · the runner will remember your betrayal [6 Cyrite base · standing gutter -2]
  - **Decline the job** (refuse): Keep your hold clear of the package. → The runner ends the call and moves on
- **Pay if taken on and won:** 26 base → 65 at ×2.5 → about 70 here (depth ×1.07). Quick bonus +25% if done inside half the limit (100s).
- **Win:** “Package delivered · no patrol detected you” [26 Cyrite base · standing gutter +2]
- **Lose:** “The patrol detects you and turns to intercept” [standing gutter -1 · notice custody +2]
- **Ignored (call lapses or player flies on):** “You take another route around the patrol”
- **Leaves behind if won:** “A package passed through the patrol unseen · the Gutter remembers” · flag drop_made
- **Leaves behind if lost:** “The patrol caught the drop · the lane is under tighter watch” · Net pushed into nearby systems 0.5
- **Road follow-up on the radio:**
  - after **won** ({"not":["job_nothing_to_declare_sell"]}): **Owen Pike**: “You never saw what was in it. Good. I’ll call again.”
  - after **sell**: **Owen Pike**: “Custody paid you six. Remember what it cost.”
  - after **declined**: **Owen Pike**: “No offence taken. The Line’s patient.”
- **Chart-mode (`?classic`) range:** regions 1–6, kinds port/transit/contested, weight 1.2.

### Follow the Cyrite Vein  `follow_cyrite`

- **Placed at:** The Reach, stop 4 of 8, **Hollis** (mining; role: work; Course line “mine, and fill the tank”).
- **Thread:** Hester’s crews (Hester Vane), step 1 of 7.
- **Giver:** A prospector (frontier; card kind job; weight routine).
- **What the player sees in the sky:** ships — A prospector offers to lead you to a rich Cyrite deposit for a share of the find.
- **The call:** “I know where the vein runs. Stay close and I will share the find. Lose me, and you get nothing.”
- **Sky line on the card:** A prospector · slow, sure of herself
- **Thread chip and line (road only):** *Hester’s crews* — “Kellern docked my crew for a missed quota. Same contract as yours, I’d bet.”
- **Rings:** wherever the ship is (a lead or escort job); on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Follow — HUD line “Stay on the prospector’s wing”. Hold 25s, limit 90s.
- **Ships:** 1× freighter “Prospector” (meek).
- **Twist:** 2× scout arrive 12s after the goal is taken, radio: “Gutter scouts on her tail. They want the vein.”.
- **Answers:**
  - **Follow the prospector** (help): Stay near her until she finds the vein. Gutter scouts may follow her. → She leads the way
  - **Take her find** (fight): By force. She fights back, and Hester will hear of it. → Her find is yours · Hester will hear [12 Cyrite base · standing miners -1 · Wanted bar +0.05 · flag prospector_robbed]
  - **Decline and continue alone** (refuse): Search for a vein yourself. → The prospector ends the call
- **Pay if taken on and won:** 18 base → 45 at ×2.5 → about 49 here (depth ×1.09). Quick bonus +25% if done inside half the limit (45s).
- **Win:** “The prospector finds the vein and lets you mine your share” [18 Cyrite base · flag vein_found]
- **Lose:** “You lose sight of the prospector in the dust” []
- **Ignored (call lapses or player flies on):** “The prospector continues without you”
- **Leaves behind if won:** “A rich vein was found here · nearby rocks yield more Cyrite for a while” · prices: cyrite ×0.9 for 8 days
- **Road follow-up on the radio:**
  - after **won** ({"not":["job_follow_cyrite_rob"]}): **The prospector**: “Tell Hester you helped. She keeps a list of people who do.”
  - after **rob**: **The prospector**: “Hester will hear about this. Every rig in the Reach will.”
- **Chart-mode (`?classic`) range:** regions 1–7, kinds mining/transit/contested, weight 1.

### Break the Pirate Toll  `pirate_toll`

- **Placed at:** The Reach, stop 7 of 8, **Branford** (contested, held by gutter; role: pressure; Course line “the Net closes behind”).
- **Thread:** Hester’s crews (Hester Vane), step 2 of 7.
- **Giver:** Dispatch · mining guild (miners; card kind job; weight important).
- **What the player sees in the sky:** a beacon — A toll beacon is blocking the lane, and the Gutter denies placing it.
- **The call:** “A toll beacon on our lane, four ships, one captain. Drop the captain and the rest may scatter.”
- **Sky line on the card:** A toll beacon · four hulls at the gate
- **Thread chip and line (road only):** *Hester’s crews* — “Break it, and my crews eat this month.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Destroy — HUD line “Break the toll crew”. Hold 0s, limit 150s, spoiled (destroyed outright or scattered) pays 70%.
- **Ships:** 1× raptor “Toll captain” (hostile, hostile from the start, break it and the rest scatter); 3× scout “Toll crew” (hostile, hostile from the start).
- **Answers:**
  - **Attack the toll crew** (fight): Four ships are guarding the beacon. Defeat their captain to weaken the rest. → Heading to the beacon
  - **Jam their communications** (bluff; needs "md_jammer"): Requires a jammer. Disable their comms and slip past without being detected. → The beacon goes to static · you slip by [standing gutter -1]
  - **Take another route** (refuse): Leave the toll beacon for now. → Dispatch logs it
- **Pay if taken on and won:** 22 base → 55 at ×2.5 → about 64 here (depth ×1.16). Quick bonus +25% if done inside half the limit (75s).
- **Win:** “Toll beacon destroyed · the lane is open” [22 Cyrite base · standing frontier +1, miners +1 · notice gutter +1]
- **Lose:** “The toll remains · its crew now recognise your ship” [Wanted bar +0.05]
- **Ignored (call lapses or player flies on):** “You take another route and leave the toll in place”
- **Leaves behind if won:** “The toll is gone · supplies cost less on this lane” · prices: supplies ×0.85 for 12 days · flag toll_broken
- **Leaves behind if lost:** “The toll remains · prices rise on this lane” · prices: supplies ×1.2 for 8 days
- **Road follow-up on the radio:**
  - after **won**: **Hester**: “That’s two. I’m writing your name down.”
  - after **lost**: **Hester**: “You tried. More than most.”
  - after **declined**: **Hester**: “Understood. We’ll find another way. We always do.”
- **Chart-mode (`?classic`) range:** regions 1–4, kinds transit/mining/contested, weight 1.4.

### Stay Out of Range  `keep_distance`

- **Placed at:** The Marches, stop 2 of 7, **Kessel Hold** (port, held by holdfast; role: hub; Course line “the moot wants your file”).
- **Thread:** Quiet Line (Owen Pike), step 2 of 7.
- **Giver:** A broker · no name (frontier; card kind job; weight important).
- **What the player sees in the sky:** a checkpoint — A buyer wants the changing access codes used by a Custody patrol.
- **The call:** “Four patrol ships follow a loop. Their access codes change at each turn. Hold still in the middle, copy the codes and stay undetected.”
- **Sky line on the card:** A patrol · four hulls, one slow loop
- **Thread chip and line (road only):** *Quiet Line* — “These codes are how we walk people past checkpoints. Copy them clean and nobody gets stopped.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Sneak — HUD line “Copy the patrol codes without being detected”. Hold 7s, limit 200s.
- **Ships:** 4× picket “Custody patrol” (wary).
- **Answers:**
  - **Record the patrol codes** (trade): Hold still 7 seconds. A spoofer, ghost echo or baffles slow detection. → Heading to the patrol
  - **Sell the patrol’s route** (trade): Earn 4 Cyrite for the patrol timing, without recording its codes. → Patrol timing sold · 4 Cyrite received [4 Cyrite base]
  - **Avoid the patrol** (refuse): Leave the patrol alone. → The broker ends the call
- **Pay if taken on and won:** 30 base → 75 at ×2.5 → about 94 here (depth ×1.25). Quick bonus +25% if done inside half the limit (100s).
- **Win:** “Patrol codes copied · the buyer pays for a clean recording” [30 Cyrite base · standing frontier +1 · flag codes_copied]
- **Lose:** “The patrol detects you and turns to intercept” [standing custody -1 · notice custody +2]
- **Ignored (call lapses or player flies on):** “You keep clear of the patrol”
- **Leaves behind if won:** “The patrol’s codes are exposed · the Net will take longer to respond here” · Net held out of nearby systems 2 days · flag codes_copied
- **Leaves behind if lost:** “The patrol catches a ship copying its codes · security tightens on the lane” · Net pushed into nearby systems 0.5
- **Road follow-up on the radio:**
  - after **won** ({"not":["job_keep_distance_sell"]}): **Owen Pike**: “Clean copy. Somebody walks home past a checkpoint tonight.”
  - after **sell**: **Owen Pike**: “You sold the timings. The Line will hear who to.”
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/contested/port, weight 1.

### Wanted: Alive  `wanted`

- **Placed at:** The Marches, stop 3 of 7, **Tamsin Field** (contested, held by gutter; role: work; Course line “someone offers to settle your debt”).
- **Thread:** The Account (Kellern Recovery · Accounts), step 1 of 6.
- **Giver:** Custody liaison · a bounty (custody; card kind job; weight important).
- **What the player sees in the sky:** ships — A wanted pilot is on the run; the bounty pays more if you bring them back alive.
- **The call:** “Brannock is wanted for a Custody manifest she never filed. Alive pays double. Disable her engines without destroying the ship.”
- **Sky line on the card:** A runner · fast for her size, one drive
- **Thread chip and line (road only):** *The Account* — “Ms Aster. Your breach balance stands at eighty. We have a way to settle it. One bounty. Alive, please.”
- **Rings:** when the ship is within 500 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Strike (cripple, then take) — HUD line “Disable the runner and bring them in alive”. Hold 0s, limit 150s, spoiled (destroyed outright or scattered) pays 35%.
- **Ships:** 1× freighter “Runner Brannock” (meek, the target, hull ×2).
- **Answers:**
  - **Capture Brannock** (trade): Disable her engines, then close in and hold position to secure the capture. → Heading to the runner
  - **Warn Brannock** (help): Let her escape. The Gutter may respect you, but Custody will not. → Brannock slips the system [standing gutter +2, custody -2 · notice custody +1]
  - **Decline the bounty** (refuse): Leave the hunt to someone else. → The liaison signs off
- **Pay if taken on and won:** 34 base → 85 at ×2.5 → about 109 here (depth ×1.28). Quick bonus +25% if done inside half the limit (75s).
- **Win:** “Brannock is in tow · Custody pays the bounty” [34 Cyrite base · standing custody +1, gutter -1]
- **Lose:** “Brannock escapes” []
- **Ignored (call lapses or player flies on):** “You let the runner go”
- **Leaves behind if won:** “A wanted runner was captured here · Custody owes you a favour” · flag bounty_taken
- **Road follow-up on the radio:**
  - after **won** ({"not":["draper_revealed","job_wanted_warn"]}): **Kellern Recovery · Accounts**: “{debt} outstanding. Thank you for your business.”
- **Account line when won:** “{debt} outstanding. Thank you for your business.” (debt shown after each step; not if Draper is revealed or the answer was “warn”)
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/contested/port, weight 1.

### The Missing Shift  `missing_shift`

- **Placed at:** The Marches, stop 6 of 7, **Gannet Reach** (mining, held by holdfast; role: pressure; Course line “the rigs are boarded”).
- **Thread:** Hester’s crews (Hester Vane), step 3 of 7.
- **Giver:** Union clerk (miners; card kind distress; weight important).
- **What the player sees in the sky:** a wreck — A mining crew has stopped answering from the nearby wreck field.
- **The call:** “Nine miners have been silent since yesterday. Their last beacon came from the wreck field. Bring one supply in case they survived.”
- **Sky line on the card:** A wreck · one faint beacon
- **Thread chip and line (road only):** *Hester’s crews* — “Eleven people, gone quiet at Gannet. Bring them home.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Reach and hold — HUD line “Find the missing mining crew”. Hold 5s, limit 170s, hand over {"supplies":1}.
- **Twist:** 1× raptor arrive 14s after the goal is taken, radio: “Raider on the wreck field. Someone got here first.”.
- **Answers:**
  - **Search the wreck field** (help): Bring 1 supply, fly to their last beacon and hold close. Short? Half pay. → Heading to the wreck
  - **Report the crew to Custody** (trade): Receive 2 Cyrite from the patrol, but the miners will know you reported them. → 2 Cyrite received · the union will remember your choice [2 Cyrite base · standing miners -2, custody +1]
  - **Decline the search** (refuse): Leave the search to the union. → The clerk ends the call
- **Pay if taken on and won:** 20 base → 50 at ×2.5 → about 67 here (depth ×1.35). Quick bonus +25% if done inside half the limit (85s).
- **Win:** “The crew is alive · they share the ore they recovered” [20 Cyrite base · 3 supplies · standing miners +2 · flag crew_saved]
- **Lose:** “You arrive too late to save the crew” []
- **Ignored (call lapses or player flies on):** “You leave the crew’s signal unanswered”
- **Leaves behind if won:** “The rescued crew speaks well of you and shares its route knowledge” · Net held out of nearby systems 2 days · flag crew_saved
- **Road follow-up on the radio:**
  - after **won** ({"not":["job_missing_shift_tell"]}): **Hester Vane**: “Eleven home. That’s three. I’m still writing.”
  - after **lost**: **Hester Vane**: “You looked. That counts with me.”
  - after **declined**: **Hester Vane**: “Then I’ll go myself.”
- **Chart-mode (`?classic`) range:** regions 2–6, kinds mining/transit, weight 1.1.

### The Heavy Tanker  `heavy_tanker`

- **Placed at:** The Marches, stop 7 of 7, **Sallow Port** (transit, held by guild; role: reckoning; Course line “refit before the Rift”).
- **Thread:** The Account (Kellern Recovery · Accounts), step 2 of 6.
- **Giver:** A fixer · no name (gutter; card kind job; weight important).
- **What the player sees in the sky:** ships — A valuable tanker is carrying a full load with only light protection.
- **The call:** “Loaded tanker, two escorts. Kill her engines, not her hull. Then take the cargo.”
- **Sky line on the card:** A tanker · slow, heavy, two escorts
- **Thread chip and line (road only):** *Account · Hester’s crews ↓* — It carries their filters.
- **Rings:** when the ship is within 500 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Strike (cripple, then take) — HUD line “Cripple the tanker, do not sink it”. Hold 0s, limit 170s, spoiled (destroyed outright or scattered) pays 40%.
- **Ships:** 1× freighter “Tanker Marrow” (meek, the target, hull ×2.6); 2× scout “Tanker escort” (hostile, hostile from the start).
- **Twist:** 2× scout arrive 25s after the goal is taken, radio: “Escort reinforcements. Finish it quick.”.
- **Answers:**
  - **Attack the tanker** (trade): Disable its engines, then move close to secure the cargo. If you destroy it, the cargo is lost. → Heading to the tanker
  - **Warn the tanker** (help): Warn the captain instead. They may pay you, but the Gutter will hear about it. → The captain thanks you · 3 supplies received [3 supplies · standing gutter -2, custody +1]
  - **Decline the job** (refuse): Leave the tanker and its escorts alone. → The fixer ends the call
- **Pay if taken on and won:** 30 base → 75 at ×2.5 → about 103 here (depth ×1.37). Quick bonus +25% if done inside half the limit (85s).
- **Win:** “The tanker is disabled · you strip its fuel tanks” [30 Cyrite base · 3 supplies · notice custody +1 · Wanted bar +0.08 · flag tanker_taken]
- **Lose:** “The tanker escapes” []
- **Ignored (call lapses or player flies on):** “You let the tanker pass”
- **Leaves behind if won:** “A tanker has gone missing · the Offices are asking questions” · Calloway +0.5 day · flag tanker_taken
- **Road follow-up on the radio:**
  - after **won** ({"not":["draper_revealed","job_heavy_tanker_warn"]}): **Kellern Recovery · Accounts**: “{debt} outstanding. Thank you for your business.”
  - after **won** ({"not":["job_heavy_tanker_warn"]}): **Hester Vane**: “That tanker carried our filters. I know whose name was on the job.”
- **Account line when won:** “{debt} outstanding. Thank you for your business.” (debt shown after each step; not if Draper is revealed or the answer was “warn”)
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/contested/mining, weight 1.2.

### One Filter Left  `one_filter`

- **Placed at:** The Salvage Belt, stop 1 of 7, **Breakwater** (transit; role: landfall; Course line “listen to the wrecks”).
- **Thread:** Hester’s crews (Hester Vane), step 4 of 7.
- **Giver:** Settlement steward (miners; card kind plea; weight important).
- **What the player sees in the sky:** a settlement — A settlement’s last air filter is failing; replacement parts must arrive quickly.
- **The call:** “Our last air filter is dying. Two supplies of parts in ninety seconds, or we start counting breaths.”
- **Sky line on the card:** A settlement · lamps low, a filter running hot
- **Thread chip and line (road only):** *Hester’s crews* — “One filter for a whole rig. Hester says it’s ours.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Reach and hold — HUD line “Deliver filter parts to the settlement before time runs out”. Hold 5s, limit 90s, hand over {"supplies":2}.
- **Answers:**
  - **Deliver the filter parts** (help): Bring 2 supplies within 90 seconds. Short? You are paid for what you bring. → Heading to the settlement
  - **Sell the parts instead** (trade; costs {"supplies":2}): Sell 2 supplies for 8 Cyrite, but the settlement may not forgive it. → 8 Cyrite received · the settlement closes its doors [8 Cyrite base · standing miners -1, frontier -1]
  - **Keep your supplies** (refuse): Save them for your own repairs. → The steward ends the call
- **Pay if taken on and won:** 24 base → 60 at ×2.5 → about 85 here (depth ×1.42). Quick bonus +25% if done inside half the limit (45s).
- **Win:** “The filter is running again · the settlement pays what it can” [24 Cyrite base · standing miners +2, frontier +1 · flag filter_fixed]
- **Lose:** “The last filter fails before the parts arrive” []
- **Ignored (call lapses or player flies on):** “You leave the settlement to manage alone”
- **Leaves behind if won:** “The settlement kept its air supply · they will remember your help” · Net held out of nearby systems 2 days · flag filter_fixed
- **Leaves behind if lost:** “The settlement lost its air supply · the lane goes quiet” · prices: supplies ×1.15 for 8 days
- **Road follow-up on the radio:**
  - after **won**: **Hester Vane**: “Air for another month. I won’t forget it.”
  - after **lost**: **Hester Vane**: “You came. Some didn’t.”
  - after **declined**: **Hester Vane**: “We’ll breathe shallow. We’re good at it.”
- **Chart-mode (`?classic`) range:** regions 2–6, kinds mining/transit/contested, weight 1.

### The Wreck That Remembered  `wreck_remembered`

- **Placed at:** The Salvage Belt, stop 3 of 7, **The Graveyard** (mining, held by guild; role: work; Course line “a wreck that remembers”).
- **Thread:** The Survey (a Survey analyst), step 1 of 5.
- **Giver:** Salvage broker (office; card kind job; weight routine).
- **What the player sees in the sky:** a wreck — A derelict ship still holds a flight log someone has tried to erase.
- **The call:** “A derelict still holds a flight log. Recover an intact copy and the Offices will pay. Someone else is trying to erase it.”
- **Sky line on the card:** A wreck · its log still powered
- **Thread chip and line (road only):** *The Survey* — “Survey Office. Your scope logs are worth money to us. The wreck at the Graveyard first. Careful questions, good pay.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Watch (hold slow and close) — HUD line “Get close and recover the wreck’s flight log”. Hold 6s, limit 150s.
- **Twist:** 2× scout arrive 7s after the goal is taken, radio: “A wiper crew is closing. Copy it fast.”.
- **Answers:**
  - **Recover the flight log** (help): Move close and hold steady until the copy finishes. → Heading to the wreck
  - **Salvage the wreck instead** (trade): Take 3 supplies, but you will lose the chance to recover the log. → 3 supplies salvaged from the hull [3 supplies · standing guild -1]
  - **Leave it** (refuse): This wreck is not yours to claim. → The broker ends the call
- **Pay if taken on and won:** 24 base → 60 at ×2.5 → about 88 here (depth ×1.46). Quick bonus +25% if done inside half the limit (75s).
- **Win:** “Flight log recovered · the Offices pay for an intact copy” [24 Cyrite base · flag saw_hulk]
- **Lose:** “The log erases itself before the copy finishes” []
- **Ignored (call lapses or player flies on):** “You leave the wreck untouched”
- **Leaves behind if won:** “A derelict gave up its log · someone tried to destroy the record” · Calloway +0.5 day · flag saw_hulk
- **Road follow-up on the radio:**
  - after **won**: **Survey Office · an analyst**: “Good log. That hull met something out here, and turned back. Keep your scope on.”
- **Chart-mode (`?classic`) range:** regions 3–8, kinds mining/transit/contested, weight 0.9.

### The Dead Drop  `dead_drop`

- **Placed at:** The Salvage Belt, stop 4 of 7, **Kessler’s Wreck** (contested, held by guild; role: turn; Course line “a recorder that still runs”).
- **Thread:** Quiet Line (Owen Pike), step 3 of 7.
- **Giver:** A broker · no name (gutter; card kind job; weight important).
- **What the player sees in the sky:** a beacon — A package waits at a beacon, but someone may be watching the drop point.
- **The call:** “A package is waiting at the beacon. Collect it and bring it back. Someone may have been tipped off, so watch for an ambush on the way out.”
- **Sky line on the card:** A beacon · one small package
- **Thread chip and line (road only):** *Quiet Line* — “A drop only four people know. Keep it that way.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Reach and hold — HUD line “Collect the package and escape the area”. Hold 4s, limit 170s.
- **Trap:** 3× picket spring at 62% of the way out.
- **Answers:**
  - **Collect the package** (trade): Hold position at the beacon; hostile ships may be waiting for you to leave. → Heading to the beacon
  - **Tell Custody about the drop** (trade): Receive 3 Cyrite from the patrol, but the Gutter will hear that you talked. → 3 Cyrite received · the broker will remember your betrayal [3 Cyrite base · standing gutter -2, custody +1]
  - **Leave the package** (refuse): Do not get involved in the delivery. → The broker ends the call
- **Pay if taken on and won:** 28 base → 70 at ×2.5 → about 104 here (depth ×1.48). Quick bonus +25% if done inside half the limit (85s).
- **Win:** “Package recovered · the broker pays when you deliver it” [28 Cyrite base · standing gutter +1 · flag drop_fetched]
- **Lose:** “Someone reaches the drop before you” []
- **Ignored (call lapses or player flies on):** “You leave the package where it is”
- **Leaves behind if won:** “A package was taken from this drop point” · flag drop_fetched
- **Road follow-up on the radio:**
  - after **lost**: **Owen Pike**: “Pickets at a drop only four people knew. One of them’s me. I’m checking the other three.”
  - after **won**: **Owen Pike**: “Drop’s clean. Somebody still talked, though. I’ll find who.”
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/mining/contested, weight 1.

### Get the Witness Out  `the_witness`

- **Placed at:** The Salvage Belt, stop 6 of 7, **Kiln** (contested, held by gutter; role: pressure; Course line “someone is selling routes”).
- **Thread:** Quiet Line (Owen Pike), step 4 of 7.
- **Giver:** Brother Orrin (frontier; card kind plea; weight important).
- **What the player sees in the sky:** ships — A witness has evidence against Custody, and they want the witness silenced.
- **The call:** “I kept the log of what Custody did at Northfold. They know. Keep me alive for a minute.”
- **Sky line on the card:** A freighter · a log nobody should have
- **Thread chip and line (road only):** *Quiet Line* — “Pike’s witness. Get them out and the Line owes you.”
- **Rings:** when the ship is within 500 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Defend — HUD line “Keep the witness alive until they can escape”. Hold 60s, limit 0s.
- **Ships:** 1× freighter “Brother Orrin” (meek, the target, hull ×1.3).
- **Waves:** 2× picket at 8s, 3× picket at 34s.
- **Answers:**
  - **Protect the witness** (help): Keep the witness alive for 60 seconds. Two waves of pickets. → Heading to the freighter
  - **Hand the witness to Custody** (trade): Receive 6 Cyrite from the patrol, but the frontier will remember your choice. → 6 Cyrite received · the frontier will remember your choice [6 Cyrite base · standing custody +1, frontier -3]
  - **Decline the job** (refuse): Keep out of the fight and leave Orrin to decide what to do. → Orrin closes the channel
- **Pay if taken on and won:** 30 base → 75 at ×2.5 → about 115 here (depth ×1.53). Quick bonus +25% if done inside half the limit (n/a).
- **Win:** “The witness survives · the evidence gets out” [30 Cyrite base · standing frontier +1, custody -2 · notice custody +2 · flag witness_saved]
- **Lose:** “The witness is lost · the evidence goes with them” []
- **Ignored (call lapses or player flies on):** “You leave the witness to Custody”
- **Leaves behind if won:** “The witness escaped alive · the Offices want answers” · Calloway +0.5 day · flag witness_saved
- **Road follow-up on the radio:**
  - after **won**: **Owen Pike**: “The witness says Val. Val’s been selling our routes to Custody. Funny. She sells yours too.”
- **Chart-mode (`?classic`) range:** regions 3–8, kinds transit/contested/port, weight 0.9.

### Escort the Hauler  `long_walk`

- **Placed at:** The Salvage Belt, stop 7 of 7, **Tarik’s Lamps** (transit, held by guild; role: reckoning; Course line “the charts they burned”).
- **Thread:** Hester’s crews (Hester Vane), step 5 of 7.
- **Giver:** Hauler Dunne (miners; card kind plea; weight important).
- **What the player sees in the sky:** ships — A damaged hauler is too slow to reach the lane without an escort.
- **The call:** “I have one working drive and half my speed. Escort me to the lane and my crew will pay what they can. Raiders will come.”
- **Sky line on the card:** A hauler · one drive, slow, heavy
- **Thread chip and line (road only):** *Hester’s crews* — “Hester’s people, walking home. Walk with them.”
- **Rings:** wherever the ship is (a lead or escort job); on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Follow — HUD line “Walk the hauler to the Jump Gate”. Hold 55s, limit 160s.
- **Ships:** 1× freighter “Hauler Dunne” (meek).
- **Twist:** 2× raptor arrive 30s after the goal is taken.
- **Answers:**
  - **Escort the hauler** (help): Stay beside the hauler and match its slower pace. Raiders arrive in about 30 seconds. → She limps ahead, and you fall in beside her
  - **Tow the hauler** (help; needs "md_tractor"): Requires a tractor beam. Spend 3 supplies to tow the hauler to safety immediately. → Hauler in tow · 3 supplies used [3 supplies · standing miners +1]
  - **Decline the escort** (refuse): Keep moving and leave the hauler to its own route. → Dunne closes the channel
- **Pay if taken on and won:** 24 base → 60 at ×2.5 → about 93 here (depth ×1.55). Quick bonus +25% if done inside half the limit (80s).
- **Win:** “The hauler reaches the lane · the crew pays what it can” [24 Cyrite base · 2 supplies · standing miners +1, frontier +1]
- **Lose:** “You lose the hauler before it reaches safety” [standing miners -1]
- **Ignored (call lapses or player flies on):** “You leave the hauler to make the journey alone”
- **Leaves behind if won:** “The damaged hauler made it through · the crew tells others what you did” · flag hauler_saved
- **Road follow-up on the radio:**
  - after **won**: **Hester Vane**: “That hauler was my cousin’s. You’re on the list twice now.”
  - after **lost**: **Hester Vane**: “Not your fault. The Belt eats slow ships.”
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/mining/contested, weight 1.

### Race for the Wreck  `finders_keepers`

- **Placed at:** The Drift Deep, stop 2 of 7, **The Quiet Ferry** (transit; role: hub; Course line “a lane ahead, no questions”).
- **Thread:** Quiet Line (Owen Pike), step 5 of 7.
- **Giver:** A claims clerk (guild; card kind job; weight routine).
- **What the player sees in the sky:** a wreck — You and a rival salvage crew have the same claim coordinates.
- **The call:** “The first crew to reach the claim owns it. A rival has the same chart. Pass four markers in one run and the wreck is yours.”
- **Sky line on the card:** A claim · a big wreck, and a rival salvor
- **Thread chip and line (road only):** *Quiet Line* — “Quill’s racing for it too. Pike says don’t let her win.”
- **Rings:** when the ship is within 460 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Race — HUD line “Reach all four markers before the rival”. Hold 0s, limit 120s, 4 beacons, rival at 90% of the ship’s speed.
- **Ships:** 1× scout “Rival salvor” (meek, the target, hull ×1).
- **Answers:**
  - **Race for the claim** (help): Pass all four markers in order; your rival is close behind. → Race starting · three, two, one
  - **Spoof the rival’s transponder** (bluff; needs "md_spoofer"): Requires a spoofer. Mislead the rival and claim half the salvage. → The rival loses the route · you claim half the salvage [8 Cyrite base · standing gutter -1]
  - **Let the rival take it** (refuse): The wreck may not be worth the risk. → The clerk ends the call
- **Pay if taken on and won:** 30 base → 75 at ×2.5 → about 122 here (depth ×1.62). Quick bonus +25% if done inside half the limit (60s).
- **Win:** “You reach the claim first · the salvage is yours” [30 Cyrite base · 3 supplies · standing guild +1]
- **Lose:** “The rival reaches the claim first” []
- **Ignored (call lapses or player flies on):** “You leave the claim to the rival”
- **Leaves behind if won:** “You won the salvage claim · the rival crew holds a grudge” · flag claim_won
- **Road follow-up on the radio:**
  - after **lost**: **Quill**: “Nice hull. Slow, though. Next time I’ll wait for you at the finish.”
  - after **won**: **Quill**: “Who taught you to fly like that? Nobody? Figures.”
- **Chart-mode (`?classic`) range:** regions 3–8, kinds mining/contested/transit, weight 1.

### Something in the Dark  `something_dark`

- **Placed at:** The Drift Deep, stop 3 of 7, **Lantern Mile** (mining; role: work; Course line “a warm object, moving”).
- **Thread:** The Survey (a Survey analyst), step 2 of 5.
- **Giver:** Survey Office (office; card kind job; weight important).
- **What the player sees in the sky:** a object — An uncharted object gives conflicting readings on your sensors.
- **The call:** “No chart shows this object, and our sensors disagree on its size. Take two readings and get as close as you dare.”
- **Sky line on the card:** An object · dark, warm, no transponder
- **Thread chip and line (road only):** *The Survey* — “Survey Office again. The warm object at the Lantern. Look closer.”
- **Rings:** when the ship is within 520 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Survey — HUD line “Collect readings from the object”. Hold 0s, limit 200s, rings 200/120 units (shares 0.5/1).
- **Answers:**
  - **Survey the object** (help): Hold inside each marked ring to record a reading. The closer ring pays more. → Heading to the object
  - **Sell the coordinates** (trade): Earn 3 Cyrite for the location without approaching the object. → Coordinates sold · 3 Cyrite received [3 Cyrite base]
  - **Keep your distance** (refuse): Leave the unexplained object alone. → The Office records your refusal
- **Pay if taken on and won:** 32 base → 80 at ×2.5 → about 132 here (depth ×1.65). Quick bonus +25% if done inside half the limit (100s).
- **Win:** “Readings recorded · the Survey Office pays for the data” [32 Cyrite base · flag saw_object]
- **Lose:** “You turn back before collecting a reading” []
- **Ignored (call lapses or player flies on):** “You keep your distance and fly around it”
- **Leaves behind if won:** “The object was measured · it was warmer than expected” · flag saw_object
- **Road follow-up on the radio:**
  - after **won**: **Survey Office · an analyst**: “Your warm object has moved four hundred metres since yesterday. Toward the lane. I’d like you to look again.”
- **Chart-mode (`?classic`) range:** regions 3–8, kinds mining/transit/contested, weight 0.9.

### Stolen Payroll  `missing_payroll`

- **Placed at:** The Drift Deep, stop 4 of 7, **Ninth Fold** (transit; role: turn; Course line “someone aboard is watching”).
- **Thread:** The Account (Kellern Recovery · Accounts), step 3 of 6.
- **Giver:** A fixer · no name (gutter; card kind job; weight important).
- **What the player sees in the sky:** ships — A lightly armed courier is carrying a month of wages for three mining barges.
- **The call:** “A courier, a month of wages, no guns. Disable her, take the wages, leave her alive.”
- **Sky line on the card:** A courier · lightly built, wages in the hold
- **Thread chip and line (road only):** *Account · Hester’s crews ↓↓* — These are their wages.
- **Rings:** when the ship is within 500 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Strike (cripple, then take) — HUD line “Disable the courier and recover the wages”. Hold 0s, limit 150s, spoiled (destroyed outright or scattered) pays 30%.
- **Ships:** 1× freighter “Courier Ashe” (meek, the target, hull ×1.5).
- **Answers:**
  - **Intercept the payroll** (trade): Disable the courier’s engines, then close in to take the wages. Destroying the ship destroys the cargo. → You turn for the courier
  - **Warn the mining barges** (help): The miners will remember your help, but the fixer will know you refused the job. → The barges thank you [standing miners +2, gutter -2]
  - **Decline the job** (refuse): Let the courier continue on its route. → The fixer ends the call
- **Pay if taken on and won:** 36 base → 90 at ×2.5 → about 150 here (depth ×1.67). Quick bonus +25% if done inside half the limit (75s).
- **Win:** “The wages are aboard · a month of workers’ pay” [36 Cyrite base · notice custody +1 · Wanted bar +0.08]
- **Lose:** “The courier escapes with the wages” []
- **Ignored (call lapses or player flies on):** “You let the courier pass”
- **Leaves behind if won:** “A payroll shipment vanished here · miners want to know who took it” · Calloway +0.5 day · flag payroll_taken
- **Road follow-up on the radio:**
  - after **won** ({"not":["draper_revealed","job_missing_payroll_warn"]}): **Kellern Recovery · Accounts**: “{debt} outstanding. Thank you for your business.”
  - after **won** ({"not":["job_missing_payroll_warn"]}): **Hester Vane**: “Somebody took our wages at the Deep. I know it was you. Your name’s in the other column now.”
- **Account line when won:** “{debt} outstanding. Thank you for your business.” (debt shown after each step; not if Draper is revealed or the answer was “warn”)
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/port/contested, weight 1.

### Hold the Last Shift  `last_shift`

- **Placed at:** The Drift Deep, stop 6 of 7, **Stillwater** (mining, held by holdfast; role: pressure; Course line “Hester’s own rig”).
- **Thread:** Hester’s crews (Hester Vane), step 6 of 7.
- **Giver:** Rig foreman · Hester (miners; card kind plea; weight important).
- **What the player sees in the sky:** a rig — A mining crew refuses to abandon its rig while raiders close in.
- **The call:** “Raiders are coming for the rig. Forty of us aboard. Hold them 75 seconds and the Guild patrol is here. Guns up.”
- **Sky line on the card:** A rig · forty crew, no guns
- **Thread chip and line (road only):** *Hester’s crews* — “My rig, my mother’s name on it. I’m not leaving.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Defend — HUD line “Hold the rig until the shift ends”. Hold 75s, limit 0s.
- **Ships:** 1× freighter “Rig Hester” (meek, the target, hull ×2.2).
- **Waves:** 2× scout at 10s, 1× raptor at 34s, 3× scout at 56s.
- **Answers:**
  - **Defend the mining rig** (help): Hold the rig 75 seconds. Drawing raiders off counts too. → You turn for the rig
  - **Evacuate the crew** (help; needs "md_tractor"): Requires a tractor beam. Spend 3 supplies to rescue the crew while the rig is left behind. → Crew aboard · 3 supplies recovered [3 supplies · standing miners +1]
  - **Decline the rescue** (refuse): Leave the crew to defend the rig. → The foreman signs off
- **Pay if taken on and won:** 27 base → 68 at ×2.5 → about 116 here (depth ×1.72). Quick bonus +25% if done inside half the limit (n/a).
- **Win:** “The crew survives · the rig pays you” [27 Cyrite base · 2 supplies · standing miners +2]
- **Lose:** “The rig is lost · the crew’s distress call cuts out” []
- **Ignored (call lapses or player flies on):** “You leave the crew to defend the rig alone”
- **Leaves behind if won:** “The rig held · its crew now help keep the lane open” · Net held out of nearby systems 2 days · flag rig_held
- **Leaves behind if lost:** “The rig is lost · nobody sends another crew” · prices: cyrite ×1.15 for 10 days
- **Road follow-up on the radio:**
  - after **won**: **Hester Vane**: “Still standing. Both of us.”
- **Chart-mode (`?classic`) range:** regions 3–6, kinds mining/contested/transit, weight 1.2.

### Run the Needle  `needle`

- **Placed at:** The Breaker Yards, stop 2 of 7, **Yard Nine** (port, held by kellern; role: hub; Course line “the first work order”).
- **Thread:** Quiet Line (Owen Pike), step 6 of 7.
- **Giver:** Quill · independent pilot (frontier; card kind job; weight routine).
- **What the player sees in the sky:** ships — A local pilot challenges you to race through six beacons in an asteroid field.
- **The call:** “Six beacons, one run, rocks between them. Pay five Cyrite to enter. Beat me to the finish and the prize is yours.”
- **Sky line on the card:** A racer · small, quick, polished
- **Thread chip and line (road only):** *Quiet Line* — “Quill wants to see you fly before she trusts you.”
- **Rings:** when the ship is within 460 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Race — HUD line “Pass all six beacons before Quill”. Hold 0s, limit 130s, 6 beacons, rival at 78% of the ship’s speed.
- **Ships:** 1× scout “Quill” (meek, the target, hull ×1).
- **Answers:**
  - **Race Quill** (help; costs {"chits":25}): Pass all six beacons in order. Cutting a corner risks a collision. → Race starting · three, two, one
  - **Spoof Quill’s transponder** (bluff; needs "md_spoofer"): Requires a spoofer. Make Quill drop out of the race and claim half the prize. → Quill drops out · you win half the prize [8 Cyrite base · standing frontier -1]
  - **Decline the race** (refuse): Save your Cyrite for the journey. → Quill shrugs and powers up
- **Pay if taken on and won:** 28 base → 70 at ×2.5 → about 127 here (depth ×1.81). Quick bonus +25% if done inside half the limit (65s).
- **Win:** “You beat Quill through the course · the prize is yours” [28 Cyrite base · standing frontier +1, gutter +1]
- **Lose:** “Quill wins the race and takes the prize” []
- **Ignored (call lapses or player flies on):** “You pass the start line without racing”
- **Leaves behind if won:** “Word of your race spreads among local pilots” · flag raced
- **Road follow-up on the radio:**
  - after **won**: **Quill**: “You fly like you’ve got somewhere to be. Pike says you do. Fine. I’m in.”
  - after **lost**: **Quill**: “You fly like you’ve got somewhere to be. Pike says you do. Fine. I’m in.”
- **Chart-mode (`?classic`) range:** regions 4–8, kinds port/contested/mining, weight 1.

### The Drift Cache  `drift_cache`

- **Placed at:** The Breaker Yards, stop 3 of 7, **Anvil Slip** (mining, held by kellern; role: work; Course line “a cargo train broke up here”).
- **Thread:** The Account (Kellern Recovery · Accounts), step 4 of 6.
- **Giver:** Guild salvage desk · open claim (guild; card kind job; weight important).
- **What the player sees in the sky:** a wreck — A cargo train broke up here; the cases are still drifting.
- **The call:** “A cargo train broke up here. Four cases still drift. Slow beside each to take it. A crew will notice the first.”
- **Sky line on the card:** Four cases · drifting, one crew nearby
- **Thread chip and line (road only):** *Account · Wren ↓* — These cases are Drift property.
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Recover — HUD line “Pick up the drifting cases”. Hold 0s, limit 160s, 4 cases.
- **Ships:** 2× scout “Salvage crew” (hostile, hostile from the start).
- **Answers:**
  - **Pick up the cases** (help): Slow beside each case to take it. An ore tractor reaches further and takes less time. → Heading to the field
  - **Winch them in** (trade; needs "md_tractor"): Requires an ore tractor. Pull three cases in from where you float, with no crew. → Three cases winched aboard [20 Cyrite base · 1 supplies · standing guild +1]
  - **Leave it** (refuse): Let the cases drift. → The desk marks the claim open
- **Pay if taken on and won:** 28 base → 70 at ×2.5 → about 128 here (depth ×1.83). Quick bonus +25% if done inside half the limit (80s).
- **Win:** “The cases are aboard · the hold is heavy” [28 Cyrite base · 2 supplies · notice gutter +1]
- **Lose:** “The field is picked clean before you reach it” []
- **Ignored (call lapses or player flies on):** “You leave the cases to drift”
- **Leaves behind if won:** “The Drift Cache was recovered · the salvage crews are watching for you” · flag cache_taken
- **Road follow-up on the radio:**
  - after **won** ({"not":["draper_revealed","job_drift_cache_warn"]}): **Kellern Recovery · Accounts**: “{debt} outstanding. Thank you for your business.”
  - after **won** ({"has":["pact_drift"]}): **Wren Saffi**: “Those were our cases. Gran says to stop calling you ours.”
- **Account line when won:** “{debt} outstanding. Thank you for your business.” (debt shown after each step; not if Draper is revealed or the answer was “warn”)
- **Chart-mode (`?classic`) range:** regions 2–7, kinds mining/transit/contested, weight 1.1.

### The Voice on the Wire  `voice_wire`

- **Placed at:** The Breaker Yards, stop 4 of 7, **Keelberth** (contested, held by kellern; role: turn; Course line “Sam, through the relays”).
- **Thread:** The Survey (a Survey analyst), step 3 of 5.
- **Giver:** An old relay · no callsign (unknown; card kind job; weight important).
- **What the player sees in the sky:** a relay — An abandoned relay has started transmitting again—and it knows your ship’s name.
- **The call:** “A relay that was cut off years ago is broadcasting your ship’s name. It says it has a question, but nothing more.”
- **Sky line on the card:** A relay · dead on every chart
- **Thread chip and line (road only):** *The Survey* — “Survey Office. Something on the wire is hailing you. Record it.”
- **Rings:** when the ship is within 500 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Reach and hold — HUD line “Reach the relay and answer its call”. Hold 4s, limit 150s.
- **Twist:** 2× scout arrive 8s after the goal is taken, radio: “The relay called more than you. Company.”.
- **Answers:**
  - **Answer the call** (help): Approach the relay and hold close to hear what it wants. → Heading to the relay
  - **Jam the relay** (bluff; needs "md_jammer"): Requires a jammer. Silence the relay; the Office will approve. → The relay goes to static · the Office is pleased [standing custody +1]
  - **Ignore the call** (refuse): You do not know who—or what—is calling. → The relay keeps calling into the empty channel
- **Pay if taken on and won:** 26 base → 65 at ×2.5 → about 121 here (depth ×1.85). Quick bonus +25% if done inside half the limit (75s).
- **Win:** “The relay asks a question · you answer and receive payment” [26 Cyrite base · flag saw_voice, voice_asked]
- **Lose:** “The relay falls silent before you can answer” []
- **Ignored (call lapses or player flies on):** “You leave the relay unanswered”
- **Leaves behind if won:** “A relay thought to be dead answered a ship by name” · flag saw_voice
- **Road follow-up on the radio:**
  - after **won**: **Survey Office · an analyst**: “The relay that hailed you heard the Narrows handshake. It’s listening to Ada’s route, not to you. Interesting distinction.”
- **Chart-mode (`?classic`) range:** regions 3–8, kinds transit/mining/contested, weight 0.8.

### Clear the Crossing  `kill_zone`

- **Placed at:** The Breaker Yards, stop 6 of 7, **Torchwall** (contested, held by gutter; role: pressure; Course line “the crews may strike”).
- **Thread:** Hester’s crews (Hester Vane), step 7 of 7.
- **Giver:** Guild dispatch (guild; card kind job; weight important).
- **What the player sees in the sky:** ships — Raiders are blocking a busy crossing and stopping other ships from passing.
- **The call:** “Six raiders hold the crossing. Break them all and the Guild pays.”
- **Sky line on the card:** A crossing · six raiders, two of them heavy
- **Thread chip and line (road only):** *Hester’s crews* — “The guns at the yard point at my crews. Take them out.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Destroy — HUD line “Clear the crossing of raiders”. Hold 0s, limit 170s.
- **Ships:** 2× raptor “Raider” (hostile, hostile from the start); 4× scout “Raider crew” (hostile, hostile from the start).
- **Answers:**
  - **Defeat the raiders** (fight): Six ships will attack together. Defeat them all to reopen the crossing. → Heading to the crossing
  - **Jam their communications** (bluff; needs "md_jammer"): Requires a jammer. Slip past while the raiders lose contact with one another. → The raiders lose each other · you slip by
  - **Take another route** (refuse): Leave this crossing for now. → Dispatch signs off
- **Pay if taken on and won:** 34 base → 85 at ×2.5 → about 162 here (depth ×1.90). Quick bonus +25% if done inside half the limit (85s).
- **Win:** “The crossing is clear · the Guild pays for every hull you defeat” [34 Cyrite base · standing guild +1, miners +1]
- **Lose:** “The raiders still control the crossing” [Wanted bar +0.05]
- **Ignored (call lapses or player flies on):** “You fly around the crossing”
- **Leaves behind if won:** “The crossing is open · traffic returns” · prices: supplies ×0.9 for 10 days · flag zone_cleared
- **Leaves behind if lost:** “The raiders still block the crossing · supplies arrive late” · prices: supplies ×1.15 for 8 days
- **Road follow-up on the radio:**
  - after **won**: **Hester Vane**: “Crossing’s open. My people can get to the Breaker now.”
- **Chart-mode (`?classic`) range:** regions 3–8, kinds transit/contested/mining, weight 1.

### Someone Answered  `someone_answered`

- **Placed at:** The Free Ports, stop 3 of 7, **Penny Cross** (mining, held by gutter; role: work; Course line “something answers a full tank”).
- **Thread:** The Survey (a Survey analyst), step 4 of 5.
- **Giver:** Survey Office (office; card kind job; weight important).
- **What the player sees in the sky:** a relay — A mysterious signal responds when someone scans it slowly and carefully.
- **The call:** “A relay responds when scanned. Three unknown contacts are circling it. Do not fire. Approach slowly, listen and record what happens.”
- **Sky line on the card:** A relay · three unregistered contacts
- **Thread chip and line (road only):** *The Survey* — “Survey Office. Note your tank when it answers. Every time.”
- **Rings:** when the ship is within 500 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Watch (hold slow and close) — HUD line “Approach slowly and record the response”. Hold 7s, limit 150s.
- **Ships:** 3× mote “Unknown signal” (wary).
- **Answers:**
  - **Approach and record the signal** (help): Slow down and hold close to the relay. The contacts should not fire unless you do. → Heading to the relay
  - **Sell the coordinates** (trade): Earn 3 Cyrite for sharing the location instead of recording the signal. → Location sold · 3 Cyrite received [3 Cyrite base]
  - **Leave the signal alone** (refuse): Do not approach a signal you do not understand. → The Office records your refusal
- **Pay if taken on and won:** 26 base → 65 at ×2.5 → about 131 here (depth ×2.02). Quick bonus +25% if done inside half the limit (75s).
- **Win:** “The signal responds · the Survey Office pays for the recording” [26 Cyrite base · flag thren_curious]
- **Lose:** “The signal falls silent before you can record it” []
- **Ignored (call lapses or player flies on):** “You leave the signal unexplored”
- **Leaves behind if won:** “Something in this region responds when it is approached carefully” · flag thren_curious
- **Road follow-up on the radio:**
  - after **won**: **Survey Office · an analyst**: “It answers only when your tank is full. Every time. I think you’ve worked out what that means.”
- **Chart-mode (`?classic`) range:** regions 4–8, kinds transit/mining/contested, weight 0.9.

### Draw Them Out  `be_bait`

- **Placed at:** The Free Ports, stop 4 of 7, **Mirren’s Pier** (transit; role: turn; Course line “forty names in a box”).
- **Thread:** The Account (Kellern Recovery · Accounts), step 5 of 6.
- **Giver:** Guild gunship (guild; card kind job; weight important).
- **What the player sees in the sky:** ships — A Guild gunship needs you to draw a Custody patrol away from its position.
- **The call:** “A Custody picket is blocking our lane. Draw four ships out and we will finish the job. Break as many as you can.”
- **Sky line on the card:** A gunship · holding off, waiting for a target
- **Thread chip and line (road only):** *The Account* — “No more desks, Juno. Custody pickets, two of them, my word against theirs. You know who pays now. Still interested?”
- **Rings:** wherever the ship is (a lead or escort job); on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Destroy — HUD line “Lure out the pickets and help defeat them”. Hold 0s, limit 160s.
- **Ships:** 4× picket “Custody picket” (hostile, hostile from the start).
- **Answers:**
  - **Draw the pickets out** (fight): Four Custody ships will target you together. Help the gunship defeat them. → The pickets turn for you
  - **Warn the Custody patrol** (bluff): The patrol will thank you; the Guild gunship will not. → The pickets thank you · the Guild is angry [standing custody +1, guild -2]
  - **Decline the decoy job** (refuse): Keep your ship out of the fight. → The gunship signs off
- **Pay if taken on and won:** 32 base → 80 at ×2.5 → about 163 here (depth ×2.04). Quick bonus +25% if done inside half the limit (80s).
- **Win:** “The pickets are defeated · the gunship pays you for the diversion” [32 Cyrite base · standing guild +1, custody -1 · notice custody +1]
- **Lose:** “The pickets escape · the gunship is not pleased” []
- **Ignored (call lapses or player flies on):** “You leave the patrol in place”
- **Leaves behind if won:** “The pickets were drawn out and defeated · the lane is safer” · Net held out of nearby systems 1 days
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/contested/mining, weight 1.

### Lose the Governor’s Trail  `lose_prefect`

- **Placed at:** The Free Ports, stop 6 of 7, **Gilt Market** (contested, held by gutter; role: pressure; Course line “everyone wants a copy”).
- **Thread:** Quiet Line (Owen Pike), step 7 of 7.
- **Giver:** A broker · no name (frontier; card kind job; weight important).
- **What the player sees in the sky:** a checkpoint — A patrol is using a relay to report your position to Calloway.
- **The call:** “Your tracking trace is stored on a relay inside that patrol’s route. Erase it without being seen and Calloway loses a day.”
- **Sky line on the card:** A relay · three hulls sweeping it
- **Thread chip and line (road only):** *Quiet Line* — “The Line’s last run. Pike says this one is for you.”
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Sneak — HUD line “Erase your trail at the relay without being spotted”. Hold 6s, limit 200s.
- **Ships:** 3× picket “Governor’s patrol” (wary).
- **Answers:**
  - **Erase your trace** (trade): Hold still at the relay for 6 seconds. A spoofer slows the detection meter. → Heading to the relay
  - **Pay the broker to erase it** (pay; costs {"chits":50}): Pay 10 Cyrite and the broker will erase the trace for you. → The broker erases the trace · Calloway loses a day [notice custody -1]
  - **Leave the trace in place** (refuse): Calloway keeps the tracking data. → The broker ends the call
- **Pay if taken on and won:** 20 base → 50 at ×2.5 → about 104 here (depth ×2.08). Quick bonus +25% if done inside half the limit (100s).
- **Win:** “Your trail is erased · Calloway loses a day” [20 Cyrite base · notice custody -2]
- **Lose:** “The patrol spots you and turns to intercept” [notice custody +2]
- **Ignored (call lapses or player flies on):** “You stay away from the patrol”
- **Leaves behind if won:** “Your trail was erased under the patrol’s nose · Calloway falls behind” · Calloway -1 day
- **Leaves behind if lost:** “The patrol catches a ship trying to erase its trail” · Calloway +0.5 day
- **Road follow-up on the radio:**
  - after **won**: **Owen Pike**: “Her relay’s blind. That’s seven, if you’re counting. Quill is.”
- **Chart-mode (`?classic`) range:** regions 2–7, kinds transit/contested/port, weight 0.9.

### The Point of No Return  `no_return`

- **Placed at:** The Hollows, stop 1 of 7, **Ashdeep** (transit; role: landfall; Course line “where the lanes began”).
- **Thread:** The Survey (a Survey analyst), step 5 of 5.
- **Giver:** Survey Office · open contract (office; card kind job; weight important).
- **What the player sees in the sky:** a hole — The Survey Office is paying for readings from a poorly understood black hole.
- **The call:** “Three readings round the black hole, each closer. Nav will fail and the core burns. The closer you get, the more the Office pays.”
- **Sky line on the card:** A black hole · bends the lane
- **Thread chip and line (road only):** *The Survey* — “Survey Office. The last reading. Where nobody came back from.”
- **Rings:** when the ship is within 560 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Survey — HUD line “Collect readings near the black hole”. Hold 0s, limit 220s, rings 250/170/100 units (shares 0.35/0.7/1).
- **Answers:**
  - **Survey the black hole** (help): Hold inside each marked ring to take a reading. Turn back at any time; closer readings pay more. → Heading to the black hole
  - **Sell the coordinates** (trade): Earn 2 Cyrite for sharing the location, without risking your ship. → Coordinates sold · 2 Cyrite received [2 Cyrite base]
  - **Avoid the black hole** (refuse): Leave the danger unexplored. → The Office records your refusal
- **Pay if taken on and won:** 44 base → 110 at ×2.5 → about 237 here (depth ×2.15). Quick bonus +25% if done inside half the limit (110s).
- **Win:** “Readings recorded · the Survey Office pays for how close you got” [44 Cyrite base · flag saw_hole]
- **Lose:** “You turn back before collecting a reading” []
- **Ignored (call lapses or player flies on):** “You steer around the black hole”
- **Leaves behind if won:** “The black hole has been measured · the new readings contradict the chart” · flag saw_hole, saw_pulse
- **Archive sighting set:** saw_hole
- **Chart-mode (`?classic`) range:** regions 4–8, kinds mining/transit/contested, weight 1.

### Two Captains, One Wreck  `two_captains`

- **Placed at:** The Hollows, stop 3 of 7, **Coldvault** (contested, held by voice; role: work; Course line “the ring’s centre”).
- **Thread:** The Account (Kellern Recovery · Accounts), step 6 of 6.
- **Giver:** Two crews · one wreck (gutter; card kind job; weight important).
- **What the player sees in the sky:** a wreck — Two salvage crews are about to fight over a valuable wreck.
- **The call:** “Two captains are fighting over a valuable wreck. Neither will back down. Drive both crews off and the wreck is yours.”
- **Sky line on the card:** A big wreck · five hulls at the cut
- **Thread chip and line (road only):** *Account · Frontier ↓* — One of the captains flies for the Frontier.
- **Rings:** when the ship is within 480 units of the site; on the road a few seconds after arrival, once the stop’s main card (if any) has been answered.
- **Goal:** Destroy — HUD line “Defeat both crews and claim the wreck”. Hold 0s, limit 170s.
- **Ships:** 2× raptor “Captain” (hostile, hostile from the start); 3× scout “Salvage crew” (hostile, hostile from the start).
- **Answers:**
  - **Fight both crews** (fight): Five ships, including two heavy hulls, will attack you. → Both crews turn on you
  - **Salvage while they argue** (trade): Take 3 supplies from the wreck, but both crews will hold it against you. → You slip in while they shout [3 supplies · Wanted bar +0.05]
  - **Leave them to it** (refuse): Avoid the fight and leave the wreck unclaimed. → The crews go back to shouting
- **Pay if taken on and won:** 34 base → 85 at ×2.5 → about 187 here (depth ×2.20). Quick bonus +25% if done inside half the limit (85s).
- **Win:** “Both crews are defeated · the wreck is yours” [34 Cyrite base · 3 supplies · standing gutter -1, guild -1]
- **Lose:** “The crews drive you away from the wreck” [Wanted bar +0.05]
- **Ignored (call lapses or player flies on):** “You leave the crews to settle the dispute”
- **Leaves behind if won:** “Both crews were defeated over the wreck · nobody else dares claim it” · flag wreck_cleared
- **Road follow-up on the radio:**
  - after **won** ({"not":["draper_revealed","job_two_captains_warn"]}): **Kellern Recovery · Accounts**: “{debt} outstanding. Thank you for your business.”
- **Account line when won:** “{debt} outstanding. Thank you for your business.” (debt shown after each step; not if Draper is revealed or the answer was “warn”)
- **Chart-mode (`?classic`) range:** regions 3–8, kinds mining/contested/transit, weight 1.


---

# Appendix B. Ada's eight notes and the per-stop script

## B1. Ada's notes


### Warden’s note 1 of 8 (warden_note_1)

> The Narrows was mine the night they closed it. I was told to switch it off and forget the key. I switched it off. I did not forget.
> Eight relays on this road still know my key, and the Net stopped listening to them years ago. Each keeps a piece of what I saw.
> Each will say my name out loud when you pass, and they will hear it. I’m sorry for that part. Keep moving.
> Find the Drift. They never stopped moving.

### Warden’s note 2 of 8 (warden_note_2)

> Twenty-three ships were out past the Narrows that night. Control turned every one away from the core and gave no reason.
> I logged them as they went: hull, master, souls aboard. I could have read the names on the open band. I read them to myself.
> The Drift kept better books than I did, and they kept them out loud. Remember that I didn’t.
> Listen to the wrecks. One of them is mine.

### A voice on the relay (warden_note_3)

> “This is Ada. I was the attending officer that night. The order said the Wardens surrender their keys to me, so they did.”
> “Ilse gave me hers and said, ‘Don’t lose it.’ I didn’t. I didn’t hand any of them in, either.”
> “Eight keys, one cutter, and nobody counting. If you’re hearing this, somebody finally counted.”
> Ask the Drift where the closures run.

### Warden’s note 4 of 8 (warden_note_4)

> Draw every closed relay on one chart and they make a circle. I did it on the back of a ration card, in a Drift galley, with a stranger’s pencil.
> The ring isn’t a border. It’s a fence, and we are on the wrong side of it, with whatever it was built to fence.
> They were never keeping us in. They were keeping something out, and we were the cheapest wall they had.
> Find who built the fence. The yards remember.

### Warden’s note 5 of 8 (warden_note_5)

> Thirty-one breakers, built at Yard Nine. Signed for by Kellern, the Guild and the Offices of Peace.
> The Survey Office supplied the engineer, and it was not a person. You will meet it.
> Now the part I have been putting off for four relays. The readings that made the case, the lanes failing, the pressure moving toward the core, were mine.
> I carried them into the room myself.
> Find the room. The free ports kept the names.

### Warden’s note 6 of 8 (warden_note_6)

> Forty in the room. Two Wardens, Halvard Brook and me. I gave the readings.
> Lucan Calloway asked for ten years and a public warning. The board said a warning would crash Krail by morning.
> He said, “Then I’ll sign it, and you’ll fund the ships.” They never funded the ships.
> I watched him sign. I said nothing at all. I have been saying it ever since, to relays.
> Go where the lanes began. Ask what is waiting there.

### Warden’s note 7 of 8 (warden_note_7)

> The lanes are not ours. We found them and hung lamps on them. Cyrite is what the Thren leave behind, the way a reef leaves coral.
> We burn it to cross their home, and they come for it, the way you would come for your own bones.
> The Voice was built to talk to them. My key is one of three that tells it what to say. I never used it. I was afraid of the answer.
> The Threshold. The last relay.


### Warden’s note 8 of 8 (NOTE_8, content/legs.ts)

Kept name (the routine learned Juno's name):

> Juno. The routine knows your name now, so I can use it. I moved this hull to the top of your list. I’m sorry.
> I couldn’t think of anyone I’d trust with it, and I had never met you. You were two in the last picture I saw.
> Whatever you do at that gate, do it because you chose it. I have had enough of people signing things for other people.
> Keep moving if you want. Stop if you want.
> — Gran

Burned (the routine was stopped):

> To whoever flies her. I hoped the routine would learn your name by now. It didn’t, so you must have stopped it, and that is your right.
> Whatever you do at that gate, do it because you chose it. I have had enough of people signing things for other people.
> — A.



## B2. Every stop: beats, cards and answers

```text


## LEG 0 The Reach

### 1. audit dock system [port, kellern, port none, start] purpose="" job=- scene=- script=audit

### 2. Northfold [transit, none, port none, landfall] purpose="quiet landfall" job=- scene=- script=northfold
  - [arrive+0s] NOTICE[teal] Northfold · Kellern space, quiet crossing
  - [arrive+0s] OBJECTIVE Next: Halden’s Reach · find the Warden’s record / The Narrows · 7 jumps
  - [free+6s] RADIO Sam Okoro: “Every lane out of here is watched but one. Whoever left you that message picked a quiet one.”
  - [after nf_sam_1] RADIO Sam Okoro: “My signal won’t reach past the Narrows. Make the most of me while you can.”
  - [leave] OBJECTIVE Jump to Halden’s Reach / 

### 3. Halden’s Reach [port, kellern, port Kellern Fuel Dock, hub] purpose="find the Warden’s record" job=nothing_to_declare scene=- script=halden
  - [arrive+0s] NOTICE[teal] Halden’s Reach · Kellern port, hospice ring
  - [arrive+0s] OBJECTIVE Halden’s Reach · find the Warden’s record / Frontier port · refit bay open
  - [free+6s] RADIO Sam Okoro: “Halden’s Reach. Old Warden families retire here. If anyone remembers, it’s them.”
  - [MAIN after hr_sam+4s] CARD story_order
      > Ilse Marrow · The order — “The order”: Effective at once. / The outer relays at the Narrows and beyond are to be powered down. / Wardens on watch will surrender their keys to the attending officer. / The closure is to be recorded as a failure from neglect.
      * Take the order (help):  => The signed order · in the file {"flag":["frag_order","clue_order_sig","copy_warden"],"standing":{"miners":1},"hunt":-0.5}
  - [flag job_nothing_to_declare_won IF {"not":["job_nothing_to_declare_sell"]}] RADIO Owen Pike: “You never saw what was in it. Good. I’ll call again.”
  - [flag job_nothing_to_declare_sell] RADIO Owen Pike: “Custody paid you six. Remember what it cost.”
  - [flag job_nothing_to_declare_declined] RADIO Owen Pike: “No offence taken. The Line’s patient.”
  - [leave] OBJECTIVE Jump to Hollis / 

### 4. Hollis [mining, none, port none, work] purpose="mine, and fill the tank" job=follow_cyrite scene=- script=hollis
  - [arrive+2s] NOTICE[teal] Hollis · mining claim, rich rock
  - [flag job_follow_cyrite_won IF {"not":["job_follow_cyrite_rob"]}] RADIO The prospector: “Tell Hester you helped. She keeps a list of people who do.”
  - [flag job_follow_cyrite_rob] RADIO The prospector: “Hester will hear about this. Every rig in the Reach will.”
  - [flag ghost_here] NOTICE[white] UNKNOWN CONTACT · 4.2 km · holding
  - [after ho_ghost] RADIO Sam Okoro: “Ghost on the scope. Old rigs throw them.”
  - [after ho_sam_1] RADIO Sam Okoro: “Probably.”
  - [flag ghost_close] NOTICE[white] UNKNOWN CONTACT · 3.1 km
  - [after ho_ghost_2] RADIO Sam Okoro: “It’s closer. I don’t like that.”
  - [leave] OBJECTIVE Jump to Marlow / 

### 5. Marlow [port, kellern, port Kellern Claim Office, turn] purpose="someone here keeps the real books" job=- scene=- script=marlow
  - [arrive+2s] NOTICE[teal] Marlow · Kellern accounts station
  - [arrive+2s] OBJECTIVE Marlow · someone here keeps the real books / 
  - [MAIN free+6s] CARD story_ledger
      > Adam Brook · Kellern Mining, accounts — “The real books”: “I keep Kellern’s real books. Every unit of Krail the Scatter never got is in here. Take them. Someone should.”
      * Take the ledger (help): It goes in the file. => “For my father.” · the ledger goes in the file {"flag":["frag_ledger","brook_met","clue_sig_reach"],"standing":{"kellern":-1}}
  - [flag frag_ledger] RADIO Adam Brook: “If anyone asks, I was never here. They will ask.”
  - [after ml_brook] NOTICE[teal] The Wall · same initials on the transfers
  - [after ml_wall IF {"has":["clue_order_sig"]}] RADIO Sam Okoro: “L. C. again. On the order, and on the money.”
  - [after ml_sam_1] RADIO Sam Okoro: “Whoever that is, they signed both.”
  - [after ml_wall IF {"not":["clue_order_sig"]}] RADIO Sam Okoro: “L. C. means nothing to me. Remember it anyway.”
  - [leave] OBJECTIVE Jump to Vesta / 

### 6. Vesta [transit, none, port none, QUIET, breather] purpose="rest here, or keep moving" job=- scene=- script=vesta
  - [arrive+0s] NOTICE[teal] Vesta · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Narrows · 3 jumps
  - [settle IF {"has":["clue_ghost"]}] NOTICE[teal] The Wall · unknown contact logged
  - [MAIN settle IF {"not":["frag_order"]}] CARD ilse_recording
      > Ilse Marrow · recorded — “The order”: Effective at once. / The outer relays at the Narrows and beyond are to be powered down. / Wardens on watch will surrender their keys to the attending officer. / The closure is to be recorded as a failure from neglect.
      * Take the order (help):  => The signed order · in the file · Ada Aster · the archive has a name {"flag":["frag_order","clue_order_sig","ada_named"]}
  - [settle] RADIO Hester: “Hester, rig boss. My prospector says you’re decent. There’s a toll on our lane at Branford we can’t pay.”
  - [after ve_hester IF {"has":["ada_named"]}] RADIO Sam Okoro: “Ada Aster. Dad said the Wardens were the Reach’s last honest people. So does Eben, at the yards.”
  - [after ve_sam+20s] RADIO Sam Okoro: “You don’t have to talk. I’ll just stay on the line a bit.”
  - [leave] OBJECTIVE Jump to Branford / 

### 7. Branford [contested, gutter, port none, pressure] purpose="the Net closes behind" job=pirate_toll scene=- script=branford
  - [arrive+2s] NOTICE[teal] Branford · contested lane
  - [arrive+4s] NOTICE[amber] Net at Northfold
  - [arrive+2s] OBJECTIVE Branford · the lane to Copperline / Toll beacon · on the scope
  - [flag job_pirate_toll_won] RADIO Hester: “That’s two. I’m writing your name down.”
  - [flag job_pirate_toll_lost] RADIO Hester: “You tried. More than most.”
  - [flag job_pirate_toll_declined] RADIO Hester: “Understood. We’ll find another way. We always do.”
  - [free+6s] RADIO Sam Okoro: “Net’s spreading behind you. Don’t stop long.”
  - [leave] OBJECTIVE Jump to Copperline / 

### 8. Copperline [port, kellern, port Kellern Fuel Dock, reckoning] purpose="a clerk in trouble" job=- scene=- script=copperline
  - [arrive+2s] NOTICE[teal] Copperline · Kellern port · before the Narrows
  - [arrive+2s] OBJECTIVE Copperline · refit before the Narrows / 
  - [free+5s] RADIO Sam Okoro: “Last port before the Narrows. Fit what you can.”
  - [MAIN after cl_sam+6s IF {"has":["brook_met"]}] CARD story_brook_road
      > Adam Brook · in Custody transport — “They took the clerk”: “They traced the ledger to me. I am in a Custody transport, ten minutes from a cell. Please. You have the only copy.”
      * Break him out (fight): Fight the escort. Custody hears of it. => Brook is aboard the shuttle · Custody marks you {"flag":"brook_free","spawn":[{"variant":"raptor","n":1,"from":"ahead"}],"standing":{"custody":-1}}
      * Divert the transport (bluff): Spoof a priority order. A gamble. => The transport turns aside · Brook walks free {"flag":"brook_free"}
      * Leave him (refuse): His account is already in your file. => The channel closes · he is taken {"flag":"brook_taken"}
  - [MAIN after cl_sam+6s IF {"not":["brook_met"]}] CARD story_brook_declined
      > Adam Brook · in Custody transport — “They took the clerk”: “You turned my books down. They came for me anyway. I’m in a Custody transport. Please.”
      * Break him out (fight): Fight the escort. Custody hears of it. => Brook is aboard the shuttle · Custody marks you {"flag":"brook_free","spawn":[{"variant":"raptor","n":1,"from":"ahead"}],"standing":{"custody":-1}}
      * Divert the transport (bluff): Spoof a priority order. A gamble. => The transport turns aside · Brook walks free {"flag":"brook_free"}
      * Leave him (refuse): His account is already in your file. => The channel closes · he is taken {"flag":"brook_taken"}
  - [flag brook_taken] RADIO Sam Okoro: “They’ll make an example of him. Don’t let it be for nothing.”
  - [leave] OBJECTIVE Jump to the Narrows / 

### GATE narrows — an old relay, dark seventy years
  - [arrive+2s] NOTICE[amber] The Narrows · Custody blockade at the gate
  - [arrive+2s] OBJECTIVE Reach the Narrows relay / Custody blockade · the Jump Gate
  - [free+6s] RADIO Sam Okoro: “That’s the relay your gran watched. Seventy years and they still guard a dead thing.”
  - [flag ashgrove_met] RADIO Inspector Ashgrove: “I’ll remember the hull. Whoever you are.”
  - [MAIN near relay <200] WALL clue_relay_answered
  - [near relay <200] WALL relay_narrows
  - [near relay <200] NOTICE[teal] Warden key accepted
  - [after nr_key] NOTICE[amber] Warden channel open · broadcasting on every band
  - [after nr_open+2s] RADIO Sam Okoro: “Juno. The relay’s lit. Did you do that?”
  - [after nr_sam_2] RADIO Sam Okoro: “It’s not just lit, it’s shouting. Every post in the Reach heard Ada’s key, and your hull answer.”
  - [MAIN after nr_sam_3+2s] CARD warden_note_1
      > Ship database · Warden’s note 1 of 8 — “Warden’s note 1 of 8”: The Narrows was mine the night they closed it. I was told to switch it off and forget the key. I switched it off. I did not forget. / Eight relays on this road still know my key, and the Net stopped listening to them years ago. Each keeps a piece of what I saw. / Each will say my name out loud when you pass, and they will hear it. I’m sorry for that part. Keep moving. / Find the Drift. They never stopped moving.
      * Close the note (help):  => Warden’s note 1 of 8 · on the Wall {"flag":"warden_note_1"}
  - [flag warden_note_1] NOTICE[red] Offices channel open · CCV Patience inbound
  - [after nr_patience] RADIO Sam Okoro: “That’s no picket. Juno, that’s a Governor’s ship.”
  - [MAIN after nr_sam_gov] CARD story_calloway_narrows
      > Governor Idris Calloway · CCV Patience — “The Narrows”: “I have read Ada Aster’s file too, Juno. Not all of it. Enough to want the rest. Tell me where you are going, and I will not stop you.”
      * Tell her the truth (help): She holds her fire. She will remember you were honest. => “Thank you.” · she holds her fire, and knows {"flag":["calloway_ada","calloway_told","calloway_asked"],"hunt":1}
      * Give her a lie (bluff): A gamble; she has her father’s ear for one. => She believes you · a day gained {"flag":["calloway_ada","calloway_asked"],"hunt":1}
      * Cut the channel (refuse): Trust nobody from the Offices. => The Patience turns away {"flag":"calloway_asked"}
  - [flag calloway_asked] NOTICE[amber] Governor Calloway · knows your route
  - [flag calloway_asked] OBJECTIVE Jump to Wake / Find the Drift. They never stopped moving.
  - [after nr_knows+2s] RADIO Sam Okoro: “This is where my signal ends. If those relays carry Ada’s voice, maybe one day they’ll carry mine. Go.”
  - [after nr_sam_last+3s] NOTICE[white] Signal lost · Sam Okoro

## LEG 1 The Marches

### 1. Wake [transit, none, port none, landfall] purpose="past the charts" job=- scene=thren_curious script=m_wake
  - [arrive+2s] NOTICE[teal] Wake · the Marches · past the charts
  - [arrive+2s] OBJECTIVE Next: Kessel Hold / The Rift · 7 jumps
  - [free+6s] RADIO Edge relay: “Past here the charts are wishes. Fly carefully.”
  - [after mw_edge IF {"has":["calloway_told"]}] NOTICE[teal] Governor Calloway · holding back · for now
  - [after mw_edge+2s IF {"has":["brook_free"],"not":["frag_ledger"]}] RADIO Adam Brook: “Free, and still counting. My copy of Kellern’s books is in your file now.”
  - [after mw_brook] WALL clue_sig_reach
  - [leave] OBJECTIVE Jump to Kessel Hold / 

### 2. Kessel Hold [port, holdfast, port The Claim Hall, hub] purpose="the moot wants your file" job=keep_distance scene=- script=m_kessel
  - [arrive+2s] NOTICE[teal] Kessel Hold · Holdfast port · the moot sits
  - [arrive+2s] OBJECTIVE Kessel Hold · the moot wants your file / Holdfast port · refit bay open
  - [MAIN free+6s] CARD story_moot
      > Councillor Oduya · Kessel Hold — “Read it to the moot”: “The moot wants to hear your file, all of it, out loud. Read it and Kessel Hold stands with you. Everyone on the channel hears too.”
      * Read it to them (help): An ally. Everyone on the channel hears it too. => Kessel Hold will stand with you {"flag":["pact_holdfast","oduya_name"],"standing":{"miners":1,"frontier":1},"heat":0.06,"hunt":-0.5}
      * Ask for stores (trade): Supplies, and no promises. => Stores across · no promises {"supplies":5}
      * Not yet (refuse): The file stays aboard. => Oduya closes the moot {}
  - [flag job_keep_distance_won IF {"not":["job_keep_distance_sell"]}] RADIO Owen Pike: “Clean copy. Somebody walks home past a checkpoint tonight.”
  - [flag job_keep_distance_sell] RADIO Owen Pike: “You sold the timings. The Line will hear who to.”
  - [leave] OBJECTIVE Jump to Tamsin Field / 

### 3. Tamsin Field [contested, gutter, port none, work] purpose="someone offers to settle your debt" job=wanted scene=- script=m_tamsin
  - [arrive+2s] NOTICE[teal] Tamsin Field · contested claim
  - [arrive+2s] OBJECTIVE Tamsin Field · someone offers to settle your debt / 
  - [flag job_wanted_won IF {"not":["draper_revealed","job_wanted_warn"]}] RADIO Kellern Recovery · Accounts: “{debt} outstanding. Thank you for your business.”
  - [free+50s IF {"has":["calloway_told"]}] CARD offer_meet
      > Governor Idris Calloway · Offices of Peace — “Meet me”: “You were honest at the Narrows, or tried to be. Meet me at the next port. Two chairs. No guns. One hour.”
      * Agree to meet (help): She learns your location; you get a chance to see whether she will listen. => She came alone and listened · she did not say whether she believed you {"score":800,"hunt":-1}
      * Not yet (refuse): Keep the distance. => “Then at the end, Juno.” {}
  - [free+50s IF {"has":["calloway_lie_caught"],"not":["calloway_told"]}] CARD offer_meet
      > Governor Idris Calloway · Offices of Peace — “Meet me”: “You were honest at the Narrows, or tried to be. Meet me at the next port. Two chairs. No guns. One hour.”
      * Agree to meet (help): She learns your location; you get a chance to see whether she will listen. => She came alone and listened · she did not say whether she believed you {"score":800,"hunt":-1}
      * Not yet (refuse): Keep the distance. => “Then at the end, Juno.” {}
  - [leave] OBJECTIVE Jump to the Long Walk / 

### 4. The Long Walk [transit, none, port none, turn] purpose="the Drift kept the names" job=- scene=- script=m_walk
  - [arrive+2s] NOTICE[teal] The Long Walk · Drift fleet · forty hulls, lashed together
  - [arrive+2s] OBJECTIVE The Long Walk · the Drift kept the names / 
  - [MAIN free+6s] CARD story_drift
      > Ma Saffi · the Long Walk — “The ships we lost”: “We kept the manifests of every ship turned away that night. Twenty-three. Our dead belong in your file. Copy them, or don’t, but read them.”
      * Take the manifests (help): They go in the file, and the Drift stand with you. => Manifests in the file · Wren will remember you {"flag":["frag_manifests","pact_drift","wren_trust"],"hunt":-0.5}
  - [after walk_saffi+2s] RADIO Wren Saffi: “Ninefold, line nine. My parents. Gran reads the list every year. I just fly.”
  - [leave] OBJECTIVE Jump to Low Harrow / 

### 5. Low Harrow [transit, none, port none, QUIET, breather] purpose="rest, and listen to the Drift" job=- scene=- script=m_harrow
  - [arrive+0s] NOTICE[teal] Low Harrow · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Rift · 3 jumps
  - [settle] NOTICE[white] Drift hull · scored in long parallel lines
  - [after mh_hull+2s IF {"full":false}] RADIO Wren Saffi: “Don’t run a lane full. They follow the full ones. Everybody knows that.”
  - [after mh_hull+2s IF {"full":true}] RADIO Wren Saffi: “You’re running heavy. I’d vent some, if I were you. Gran would just stare.”
  - [after mh_hull+8s] RADIO Hester Vane: “Hester again. A shift went quiet at Gannet. Eleven people. I’ve got no ships. You’ve got one.”
  - [leave] OBJECTIVE Jump to Gannet Reach / 

### 6. Gannet Reach [mining, holdfast, port none, pressure] purpose="the rigs are boarded" job=missing_shift scene=- script=m_gannet
  - [arrive+2s] NOTICE[amber] Gannet Reach · Holdfast rigs · Kellern security aboard
  - [arrive+2s] OBJECTIVE Gannet Reach · the rigs are boarded / 
  - [MAIN free+6s IF {"has":["pact_holdfast"]}] CARD story_oduya_rigs
      > Councillor Oduya · Kessel Hold — “The rigs are under attack”: “Kellern security is boarding our rigs. You stood with us in the moot. Stand with us now, or we lose the claims.”
      * Defend the rigs (fight): Fight the raiders. Kessel Hold will not forget it. => The raiders break off · the claims hold {"flag":"oduya_rigs","spawn":[{"variant":"raptor","n":2,"from":"ahead"}],"standing":{"miners":1,"kellern":-1}}
      * Send supplies (help, cost {"supplies":3}): Three supplies for the crews. They hold on their own. => The crews hold the rigs on your stores {"flag":"oduya_rigs","standing":{"miners":1}}
      * Not now (refuse): You cannot afford the fight. => Oduya closes the channel {}
  - [flag job_missing_shift_won IF {"not":["job_missing_shift_tell"]}] RADIO Hester Vane: “Eleven home. That’s three. I’m still writing.”
  - [flag job_missing_shift_lost] RADIO Hester Vane: “You looked. That counts with me.”
  - [flag job_missing_shift_declined] RADIO Hester Vane: “Then I’ll go myself.”
  - [leave] OBJECTIVE Jump to Sallow Port / 

### 7. Sallow Port [transit, guild, port Guild Hall, reckoning] purpose="refit before the Rift" job=heavy_tanker scene=- script=m_sallow
  - [arrive+2s] NOTICE[teal] Sallow Port · Guild port · before the Rift
  - [arrive+2s] OBJECTIVE Sallow Port · refit before the Rift / 
  - [flag job_heavy_tanker_won IF {"not":["draper_revealed","job_heavy_tanker_warn"]}] RADIO Kellern Recovery · Accounts: “{debt} outstanding. Thank you for your business.”
  - [flag job_heavy_tanker_won IF {"not":["job_heavy_tanker_warn"]}] RADIO Hester Vane: “That tanker carried our filters. I know whose name was on the job.”
  - [leave] OBJECTIVE Jump to the Rift / 

### GATE rift — a broken relay, no beacons
  - [arrive+2s] OBJECTIVE Cross the Rift / Relay broken · no beacons
  - [free+4s IF {"has":["wren_trust"]}] RADIO Wren Saffi: “Juno, it’s Wren. Gran says you’re ours now. Follow my beacons, and don’t argue with the third one.”
  - [after ri_wren_1+12s] RADIO Wren Saffi: “Left of the big hull. That was the Ninefold. My parents flew her. Keep going.”
  - [after ri_wren_2+12s] RADIO Wren Saffi: “Last one. Now you know the way, so you’re one of us. Sorry.”
  - [free+8s IF {"has":["oduya_rigs"]}] RADIO Councillor Oduya: “Kessel Hold lit its rig lamps along the Rift. All of them. The moot voted. It was close.”
  - [free+4s IF {"not":["wren_trust","oduya_rigs"]}] NOTICE[amber] No guidance · fly the debris by eye
  - [MAIN near relay <200] NOTICE[teal] Warden key accepted · the far relay still answers
  - [MAIN after ri_hand_lit+2s] CARD warden_note_2
      > Ship database · Warden’s note 2 of 8 — “Warden’s note 2 of 8”: Twenty-three ships were out past the Narrows that night. Control turned every one away from the core and gave no reason. / I logged them as they went: hull, master, souls aboard. I could have read the names on the open band. I read them to myself. / The Drift kept better books than I did, and they kept them out loud. Remember that I didn’t. / Listen to the wrecks. One of them is mine.
      * Close the note (help):  => Warden’s note 2 of 8 · on the Wall {"flag":"warden_note_2"}
  - [flag warden_note_2] OBJECTIVE Jump to Breakwater / Listen to the wrecks. One of them is mine.

## LEG 2 The Salvage Belt

### 1. Breakwater [transit, none, port none, landfall] purpose="listen to the wrecks" job=one_filter scene=- script=b_breakwater
  - [arrive+2s] NOTICE[teal] Breakwater · the Salvage Belt · wrecks and claims
  - [arrive+5s IF {"has":["relay_rift"]}] NOTICE[red] Rift relay lit · they know your next gate
  - [arrive+2s] OBJECTIVE Next: Scrap Exchange / The Scrapgate · 7 jumps
  - [flag job_one_filter_won] RADIO Hester Vane: “Air for another month. I won’t forget it.”
  - [flag job_one_filter_lost] RADIO Hester Vane: “You came. Some didn’t.”
  - [flag job_one_filter_declined] RADIO Hester Vane: “We’ll breathe shallow. We’re good at it.”
  - [leave] OBJECTIVE Jump to Scrap Exchange / 

### 2. Scrap Exchange [port, guild, port Dust Traders Exchange, hub] purpose="everyone knows what you carry" job=- scene=- script=b_exchange
  - [arrive+2s] NOTICE[teal] Scrap Exchange · Dust Trader port · everything for sale
  - [arrive+2s] OBJECTIVE Scrap Exchange · everyone knows what you carry / Dust Trader port · refit bay open
  - [MAIN free+6s] CARD story_broker
      > Val · a broker of the Gutter — “Name your price”: “Everyone in the Belt knows what you carry. At the Threshold I buy it. Here’s something on account, so you remember me fondly.”
      * Take the advance (trade): Eight Cyrite, and a buyer at the end. => Eight Cyrite · Val will be waiting {"chits":40,"flag":"broker","standing":{"gutter":1}}
      * Not for sale (refuse): She will remember. => “Everything is, eventually.” {}
      * Run her off (fight): Her escort is quick. => Her escort turns on you {"spawn":[{"variant":"raptor","n":2,"from":"ahead"}],"standing":{"gutter":-1}}
  - [after bx_val+40s] CARD offer_identity
      > Governor Idris Calloway · Offices of Peace — “A name that is not yours”: “A clean registry. A name nobody hunts. Yours for one question answered, later, when I ask it.”
      * Take the name (trade): Custody and the Offices will lose your trail for a while. You will owe Calloway an answer. => A new name · the bulletins go quiet {"notice":{"custody":-10,"office":-8},"hunt":-1,"flag":"owes_calloway"}
      * Keep your own (refuse): It is the only one that is true. => “It is also the one they hunt.” {}
  - [leave] OBJECTIVE Jump to the Graveyard / 

### 3. The Graveyard [mining, guild, port none, work] purpose="a wreck that remembers" job=wreck_remembered scene=- script=b_graveyard
  - [arrive+2s] NOTICE[teal] The Graveyard · a field of old hulls
  - [arrive+2s] OBJECTIVE The Graveyard · a wreck that remembers / 
  - [flag job_wreck_remembered_won] RADIO Survey Office · an analyst: “Good log. That hull met something out here, and turned back. Keep your scope on.”
  - [leave] OBJECTIVE Jump to Kessler’s Wreck / 

### 4. Kessler’s Wreck [contested, guild, port none, turn] purpose="a recorder that still runs" job=dead_drop scene=- script=b_kessler
  - [arrive+2s] NOTICE[teal] Kessler’s Wreck · a salvor’s claim · one old cutter
  - [arrive+2s] OBJECTIVE Kessler’s Wreck · a recorder that still runs / 
  - [MAIN free+6s] CARD story_salvor
      > Dov Kessler · salvor — “A recorder that still runs”: “Warden cutter, twenty-five years dead. Her recorder still runs. Name on the plate is Aster. I can’t cut it free alone.”
      * Cut it free together (help): The recording goes in the file. => The black box goes in the file {"flag":["frag_blackbox","kessler_met"],"standing":{"miners":1}}
  - [flag frag_blackbox] CARD story_ada
      > The black box · Ada Aster, recorded — “A voice on the recorder”: “Hull’s going. If anyone hears this, the order was signed in the core and I helped. My name is Ada. Tell my granddaughter I tried.”
      * Keep the recording (help): It stays in the file, unshared. Ada was Juno’s grandmother. => Ada’s voice is yours alone {"flag":["ada_heard","ada_kept"]}
  - [after bk_box] NOTICE[teal] The Wall · Ada Aster · died 25 years ago
  - [after bk_wall+2s] RADIO Dov Kessler: “Granddaughter. Hm. I’ll paint her name on the gate.”
  - [flag job_dead_drop_lost] RADIO Owen Pike: “Pickets at a drop only four people knew. One of them’s me. I’m checking the other three.”
  - [flag job_dead_drop_won] RADIO Owen Pike: “Drop’s clean. Somebody still talked, though. I’ll find who.”
  - [leave] OBJECTIVE Jump to Saltmarsh / 

### 5. Saltmarsh [transit, none, port none, QUIET, breather] purpose="something crosses the lane" job=- scene=thren_swarm script=b_saltmarsh
  - [arrive+0s] NOTICE[teal] Saltmarsh · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Scrapgate · 3 jumps
  - [settle] NOTICE[white] UNKNOWN · motes like a river · 1 km
  - [after bs_river] OBJECTIVE  / Wait it out, or burn fluid to run dark.
  - [after bs_river+6s IF {"full":true}] NOTICE[white] It turns · toward your tank
  - [leave] OBJECTIVE Jump to Kiln / 

### 6. Kiln [contested, gutter, port none, pressure] purpose="someone is selling routes" job=the_witness scene=- script=b_kiln
  - [arrive+2s] NOTICE[amber] Kiln · Gutter crossing
  - [arrive+2s] OBJECTIVE Kiln · someone is selling routes / 
  - [MAIN free+6s IF {"has":["broker"]}] CARD story_kesh
      > Kesh · a fixer of the Gutter — “Val talks too much”: “I work for Val. I also have ears. She is shopping your heading to the Offices. Pay my debt and I look the other way.”
      * Settle his debt (pay, cost {"chits":30}): Six Cyrite. He warns you when Val moves. => Kesh is square · he will warn you {"flag":["kesh_trust","kesh_warned"],"standing":{"gutter":1}}
      * Trust him (bluff): Free, if he believes you. He may sell you too. => “Then I owe you.” · he will warn you {"flag":["kesh_trust","kesh_warned"]}
      * Wave him off (refuse): Trust nobody from the Gutter. => Kesh drifts away {}
  - [flag job_the_witness_won] RADIO Owen Pike: “The witness says Val. Val’s been selling our routes to Custody. Funny. She sells yours too.”
  - [leave] OBJECTIVE Jump to Tarik’s Lamps / 

### 7. Tarik’s Lamps [transit, guild, port Salvage Barge, reckoning] purpose="the charts they burned" job=long_walk scene=- script=b_tarik
  - [arrive+2s] NOTICE[teal] Tarik’s Lamps · chart room adrift · before the Scrapgate
  - [arrive+2s] OBJECTIVE Tarik’s Lamps · the charts they burned / 
  - [MAIN free+6s] CARD story_charts
      > Tarik Silva · chartwright — “The charts they burned”: “I draw lanes by hand from charts the Continuance burned. Mine have a bend in them nobody can explain. Trade me something to eat.”
      * Trade supplies (trade, cost {"supplies":3}): Three supplies for the old charts. => The old charts go in the file {"flag":"frag_charts"}
      * Share what you know (help): Free. He hears the file too, and talks. => Tarik copies your route · the charts go in the file {"flag":"frag_charts","heat":0.08,"standing":{"miners":1}}
      * Decline (refuse): Keep moving. => The lamps drift astern {}
  - [MAIN after bt_tarik+6s IF {"has":["broker"]}] CARD story_vell_betray
      > Val · a broker of the Gutter — “Your heading, sold”: “Business, pilot. The Offices pay better than I do. They know where you are going. I wish you luck.”
      * Pay her to forget (pay, cost {"chits":40}): Eight Cyrite. She sells the next heading to you instead. => Val takes the money · the trail goes cold {"flag":"vell_paid","hunt":1}
      * Jam her channel (fight): The Offices hear nothing more, and the Gutter hears of it. => The channel dies · the Gutter will remember {"flag":"vell_exposed","standing":{"gutter":-1},"heat":0.08}
      * Let it go (refuse): Calloway gains on you. => Val is gone · the Offices have your heading {"flag":"vell_betrayed","hunt":-1}
  - [flag job_long_walk_won] RADIO Hester Vane: “That hauler was my cousin’s. You’re on the list twice now.”
  - [flag job_long_walk_lost] RADIO Hester Vane: “Not your fault. The Belt eats slow ships.”
  - [leave] OBJECTIVE Jump to the Scrapgate / 

### GATE scrapgate — a gate made of ships
  - [arrive+2s] OBJECTIVE The Scrapgate / Built from Severance hulls
  - [free+4s IF {"has":["kessler_met"]}] RADIO Dov Kessler: “Read the plates as you pass. We painted the names back on. Took us twelve years.”
  - [arrive+4s IF {"has":["vell_betrayed"],"not":["vell_paid"]}] NOTICE[red] Pickets at gate · Val sold your heading
  - [after sg_amb+3s IF {"has":["kesh_warned"]}] RADIO Kesh: “Three pickets, port side, engines cold. Told you I’d warn you. We’re square.”
  - [MAIN near relay <200] NOTICE[teal] Warden key accepted · a recording, not a note
  - [MAIN after sg_hand_lit+2s] CARD warden_note_3
      > Recorded · Warden’s note 3 of 8 — “A voice on the relay”: “This is Ada. I was the attending officer that night. The order said the Wardens surrender their keys to me, so they did.” / “Ilse gave me hers and said, ‘Don’t lose it.’ I didn’t. I didn’t hand any of them in, either.” / “Eight keys, one cutter, and nobody counting. If you’re hearing this, somebody finally counted.” / Ask the Drift where the closures run.
      * Close the recording (help):  => Warden’s note 3 of 8 · on the Wall {"flag":"warden_note_3"}
  - [flag warden_note_3 IF {"has":["copy_warden"]}] RADIO Ilse Marrow: “‘Don’t lose it.’ I said that. Seventy years and she listened to me once.”
  - [flag warden_note_3] OBJECTIVE Jump to Longwater / Ask the Drift where the closures run.

## LEG 3 The Drift Deep

### 1. Longwater [transit, none, port none, landfall] purpose="ask the Drift where the closures run" job=- scene=thren_shadow script=d_longwater
  - [arrive+2s] NOTICE[teal] Longwater · Drift Deep · no Net here
  - [arrive+2s] OBJECTIVE Next: The Quiet Ferry / The Slow Door · 7 jumps
  - [leave] OBJECTIVE Jump to the Quiet Ferry / 

### 2. The Quiet Ferry [transit, none, port Free Dock, hub] purpose="a lane ahead, no questions" job=finders_keepers scene=- script=d_ferry
  - [arrive+2s] NOTICE[teal] The Quiet Ferry · forty-one passengers · stores, no questions
  - [arrive+2s] OBJECTIVE The Quiet Ferry · a lane ahead, no questions / 
  - [MAIN free+6s] CARD story_ferry
      > Ossie Raine · the Quiet Ferry — “A lane ahead”: “Nobody hunts out here. I can carry you a lane ahead. Forty-one passengers, and they’d like the company. Stores, no questions.”
      * Ride the ferry (trade, cost {"supplies":4}): Four food. Calloway loses a day. => The ferry carries you ahead {"flag":"ferry_met","hunt":1,"standing":{"miners":1}}
      * Trade stories (help): Raine shares his stores for the news. => Stores across · the news goes round {"flag":"ferry_met","supplies":3,"heat":0.05}
      * Wave him on (refuse): Keep your stores. => The ferry idles away {}
  - [flag job_finders_keepers_lost] RADIO Quill: “Nice hull. Slow, though. Next time I’ll wait for you at the finish.”
  - [flag job_finders_keepers_won] RADIO Quill: “Who taught you to fly like that? Nobody? Figures.”
  - [leave] OBJECTIVE Jump to Lantern Mile / 

### 3. Lantern Mile [mining, none, port none, work] purpose="a warm object, moving" job=something_dark scene=- script=d_lantern
  - [arrive+2s] NOTICE[teal] Lantern Mile · a claim with lamps on it
  - [arrive+2s] OBJECTIVE Lantern Mile · a warm object, moving / 
  - [flag job_something_dark_won] RADIO Survey Office · an analyst: “Your warm object has moved four hundred metres since yesterday. Toward the lane. I’d like you to look again.”
  - [leave] OBJECTIVE Jump to Ninth Fold / 

### 4. Ninth Fold [transit, none, port none, turn] purpose="someone aboard is watching" job=missing_payroll scene=- script=d_fold
  - [arrive+2s] NOTICE[teal] Ninth Fold · the ferry’s anchorage
  - [arrive+2s] OBJECTIVE Ninth Fold · someone aboard is watching / 
  - [MAIN free+6s] CARD story_ferry_agent
      > Ossie Raine · the Quiet Ferry — “There is an agent aboard”: “One of mine is Offices. Corin Ashe. Young. He has watched you since we left. He looks sick about it. Your call.”
      * Expose him (fight): The passengers put him off. The Offices lose a day. => The agent is put off · the Offices lose a day {"flag":["agent_exposed","clue_agent"],"hunt":1}
      * Let him be (help): He reports home. Raine keeps his licence. => The agent stays aboard · the ferry runs on {"flag":"agent_shielded"}
      * Feed him a story (bluff): A gamble. A false trail, or the Offices learn the truth. => The agent carries your false trail home {"flag":["agent_used","clue_agent"],"hunt":2}
  - [flag job_missing_payroll_won IF {"not":["draper_revealed","job_missing_payroll_warn"]}] RADIO Kellern Recovery · Accounts: “{debt} outstanding. Thank you for your business.”
  - [flag job_missing_payroll_won IF {"not":["job_missing_payroll_warn"]}] RADIO Hester Vane: “Somebody took our wages at the Deep. I know it was you. Your name’s in the other column now.”
  - [leave] OBJECTIVE Jump to Hushlight / 

### 5. Hushlight [transit, none, port none, QUIET, breather] purpose="a quiet relay" job=- scene=- script=d_hush
  - [arrive+0s] NOTICE[teal] Hushlight · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Slow Door · 3 jumps
  - [MAIN settle] CARD sc_voice_knows
      > The Voice · a relay — “THE PREFECT IS BEHIND YOU”: “THE PREFECT IS BEHIND YOU. SHE IS NOT ALONE. YOU WERE NOT TOLD THIS. WE ARE TELLING YOU.”
      * Ask what it knows (help): It names the lane she took. You gain time. => It names the lane she took · you gain time {"hunt":1.5,"flag":"news"}
      * Ask how it knows (bluff): It will not say. => “THE WAYS ARE LONG. WE ARE IN ALL OF THEM. WE HEARD THE NARROWS NAME HER.” {"flag":"voice_asked_how"}
      * Cut the channel (refuse): You do not want to be known. => The relay goes quiet {"flag":"voice_cut"}
  - [leave] OBJECTIVE Jump to Stillwater / 

### 6. Stillwater [mining, holdfast, port none, pressure] purpose="Hester’s own rig" job=last_shift scene=- script=d_still
  - [arrive+2s] NOTICE[amber] Stillwater · Holdfast rig · raiders closing
  - [arrive+2s] OBJECTIVE Stillwater · Hester’s own rig / 
  - [free+4s] RADIO Hester Vane: “My rig, my mother’s name on it. I’m not leaving. So you’re not either, if you’re staying.”
  - [flag job_last_shift_won] RADIO Hester Vane: “Still standing. Both of us.”
  - [leave] OBJECTIVE Jump to Kindmere / 

### 7. Kindmere [port, holdfast, port Holdfast Stores, reckoning] purpose="a signal that answers" job=- scene=lane_signal script=d_kindmere
  - [arrive+2s] NOTICE[teal] Kindmere · Holdfast stores · before the Slow Door
  - [arrive+2s] OBJECTIVE Kindmere · refit before the Slow Door / 
  - [free+20s IF {"has":["frag_charts"]}] RADIO Tarik Silva: “Put every closed relay on one chart. It isn’t a bend. It’s a ring. Thirty years I’ve drawn it.”
  - [free+20s IF {"not":["frag_charts"]}] RADIO Ossie Raine: “The old Drift say the closures go all the way round. Like a fence. I never asked what for.”
  - [leave] OBJECTIVE Jump to the Slow Door / 

### GATE slowdoor — three minutes to open
  - [arrive+2s] OBJECTIVE Hold at the Slow Door / Opening · 3:00
  - [free+4s IF {"has":["ferry_met"]}] RADIO Ossie Raine: “We’re crossing with you. Forty-one aboard. Stay between us and whatever comes.”
  - [arrive+40s] NOTICE[white] UNKNOWN · motes gathering on the gate
  - [after sd_motes] OBJECTIVE  / Don’t fire. A full tank draws them.
  - [after sd_motes+8s IF {"full":true}] NOTICE[white] They thicken · toward your tank
  - [after sd_motes+14s IF {"has":["ferry_met"]}] RADIO Ossie Raine: “They’re not touching us. They’re touching you. What are you carrying?”
  - [free+30s IF {"has":["agent_exposed"]}] RADIO Ossie Raine: “Ashe is off at the last port. Nobody reports this crossing.”
  - [free+30s IF {"has":["agent_used"],"not":["agent_exposed"]}] RADIO Corin Ashe: “I’m reporting you went the other way. I don’t know why I’m doing this.”
  - [after sd_motes+30s] NOTICE[white] Dead relays · a curve across the whole sky
  - [MAIN near relay <200] NOTICE[teal] Warden key accepted · the door’s relay still answers
  - [MAIN after sd_hand_lit+2s] CARD warden_note_4
      > Ship database · Warden’s note 4 of 8 — “Warden’s note 4 of 8”: Draw every closed relay on one chart and they make a circle. I did it on the back of a ration card, in a Drift galley, with a stranger’s pencil. / The ring isn’t a border. It’s a fence, and we are on the wrong side of it, with whatever it was built to fence. / They were never keeping us in. They were keeping something out, and we were the cheapest wall they had. / Find who built the fence. The yards remember.
      * Close the note (help):  => Warden’s note 4 of 8 · on the Wall {"flag":"warden_note_4"}
  - [flag warden_note_4] OBJECTIVE Jump to Cutton / Find who built the fence. The yards remember.

## LEG 4 The Breaker Yards

### 1. Cutton [transit, none, port none, landfall] purpose="the yards remember" job=- scene=yard_hulk script=y_cutton
  - [arrive+2s] NOTICE[teal] Cutton · the Breaker Yards · Custody watches
  - [arrive+2s] OBJECTIVE Next: Yard Nine / The Breaker · 7 jumps
  - [free+40s IF {"has":["slow_motes"]}] CARD offer_see
      > Governor Idris Calloway · Offices of Peace — “What did you see?”: “At the Slow Door, something gathered on the gate. Tell me what it did. Exactly. I will pay in days.”
      * Tell her (help): She gets your readings. You get a day. => She listens without interrupting · a day gained {"flag":"calloway_curious","hunt":1}
      * Ask why she wants to know (bluff): Ask her a question back. => ‘Because I have seen it before.’ · she closes the channel {"flag":"calloway_seen_before"}
      * Cut the channel (refuse): What you saw is yours. => “Then we both guess.” {}
  - [leave] OBJECTIVE Jump to Yard Nine / 

### 2. Yard Nine [port, kellern, port Kellern Claim Office, hub] purpose="the first work order" job=needle scene=- script=y_nine
  - [arrive+2s] NOTICE[teal] Yard Nine · Kellern yard · the breakers’ birthplace
  - [arrive+2s] OBJECTIVE Yard Nine · the first work order / Kellern yard · refit bay open
  - [MAIN free+6s] CARD story_workorder
      > Ben Anand · yard clerk — “The first work order”: “Every breaker built here has a work order. The first is BY9-001, countersigned by the Survey. Taking it costs me my pension.”
      * Take the work order (help): It goes in the file. => “Then take it.” · the work order goes in the file {"flag":["frag_workorder","clue_sig_yards"],"standing":{"kellern":-1}}
  - [flag job_needle_won] RADIO Quill: “You fly like you’ve got somewhere to be. Pike says you do. Fine. I’m in.”
  - [flag job_needle_lost] RADIO Quill: “You fly like you’ve got somewhere to be. Pike says you do. Fine. I’m in.”
  - [leave] OBJECTIVE Jump to Anvil Slip / 

### 3. Anvil Slip [mining, kellern, port none, work] purpose="a cargo train broke up here" job=drift_cache scene=- script=y_anvil
  - [arrive+2s] NOTICE[teal] Anvil Slip · Kellern claim · a wrecked cargo train
  - [arrive+2s] OBJECTIVE Anvil Slip · cases drifting / 
  - [flag job_drift_cache_won IF {"not":["draper_revealed","job_drift_cache_warn"]}] RADIO Kellern Recovery · Accounts: “{debt} outstanding. Thank you for your business.”
  - [flag job_drift_cache_won IF {"has":["pact_drift"]}] RADIO Wren Saffi: “Those were our cases. Gran says to stop calling you ours.”
  - [leave] OBJECTIVE Jump to Keelberth / 

### 4. Keelberth [contested, kellern, port none, turn] purpose="Sam, through the relays" job=voice_wire scene=- script=y_keel
  - [arrive+2s] NOTICE[teal] Keelberth · Kellern breaking yard
  - [arrive+2s] OBJECTIVE Keelberth · Sam, through the relays / 
  - [MAIN free+6s] CARD story_tam_brother
      > Sam Okoro · patched through the relays — “My brother is on that crew”: “Juno, it’s me. The relays carry voices now. My brother Eben works the Breaker Yards. The hulls they bring in are scarred. He thinks claws. Check?”
      * Warn the crew (help): The scarred hulls go in the file. => Eben has the warning · the scarred hulls go in the file {"flag":["tam_brother","eben_warned","clue_scarred"],"standing":{"frontier":1}}
      * Look at the hulls (trade, cost {"supplies":2}): Two supplies for a quiet look. Nobody is told. => Not claws · thousands of tiny strokes, all one direction {"flag":["clue_scarred","hulls_seen"]}
      * Not now (refuse): Sam will remember. => Sam closes the channel {}
  - [flag job_voice_wire_won] RADIO Survey Office · an analyst: “The relay that hailed you heard the Narrows handshake. It’s listening to Ada’s route, not to you. Interesting distinction.”
  - [leave] OBJECTIVE Jump to Cradle Gap / 

### 5. Cradle Gap [transit, none, port none, QUIET, breather] purpose="a breaker still holds something" job=- scene=- script=y_cradle
  - [arrive+0s] NOTICE[teal] Cradle Gap · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Breaker · 3 jumps
  - [settle] NOTICE[white] Breaker BY9-014 · its field still holds something
  - [after yg_cage+3s] RADIO The yard foreman: “Seventy years in there. Hums at night. Faces the tanks when we refuel.”
  - [after yg_foreman+4s IF {"full":true}] NOTICE[white] It pulses · toward your tank
  - [leave] OBJECTIVE Jump to Torchwall / 

### 6. Torchwall [contested, gutter, port none, pressure] purpose="the crews may strike" job=kill_zone scene=- script=y_torch
  - [arrive+2s] NOTICE[amber] Torchwall · yard crossing · crews restless
  - [arrive+2s] OBJECTIVE Torchwall · the crews may strike / 
  - [MAIN free+6s] CARD story_crew
      > Marit Voss · crew steward — “The yard crews”: “The crews stop work if you stand with us. Hester’s people are coming in to hold the line. It buys you a quiet gate.”
      * Stand with the crews (help): Calloway loses a day. Kellern will not forget it. => The crews stop work · the lane goes quiet {"flag":"crews_stood","hunt":1,"standing":{"frontier":1,"miners":1,"kellern":-1}}
      * Ask for supplies (trade): Four supplies, and no promises. => Supplies across · no promises {"supplies":4}
      * Not yet (refuse): Stay out of it. => The barge falls away {}
  - [flag crews_stood IF {"has":["thread_crews_5"]}] RADIO Hester Vane: “Every crew you helped is standing at the Breaker. I didn’t ask them. That’s the point.”
  - [flag job_kill_zone_won] RADIO Hester Vane: “Crossing’s open. My people can get to the Breaker now.”
  - [leave] OBJECTIVE Jump to Davit Dock / 

### 7. Davit Dock [port, frontier, port Free Dock, reckoning] purpose="who has been paying you" job=- scene=- script=y_davit
  - [arrive+2s] NOTICE[teal] Davit Dock · Frontier dock · before the Breaker
  - [arrive+2s] OBJECTIVE Davit Dock · who has been paying you / 
  - [MAIN free+8s] CARD story_draper
      > Director Draper · asset recovery, the Offices — “Same man, other badge”: “Drop the Kellern act, Juno. I ran Accounts. Every job you took for me is on a charge sheet now. The debt’s settled. I own the record.”
      * Make him say it (bluff): On the record, twice. => Draper says it twice · the recording goes in the file {"flag":["clue_draper","draper_director","draper_recorded","draper_revealed"],"hunt":-0.5}
      * Offer a copy (pay): A false one. A gamble; he checks it. => He takes the copy · the trail cools {"flag":["clue_draper","draper_director","draper_revealed"],"hunt":1}
      * End the call (refuse): You have heard enough. => The channel closes {"flag":"draper_revealed"}
  - [leave] OBJECTIVE Jump to the Breaker / 

### GATE breaker — the machine itself
  - [arrive+2s] OBJECTIVE The Breaker / A lane breaker, still standing
  - [arrive+6s] NOTICE[white] Hull serial · BY9-001 · the first one
  - [free+4s IF {"has":["strike_held"]}] RADIO Marit Voss: “Crews are off the cranes. Nobody’s stopping you today. Fly slow. They want to see you.”
  - [after br_marit+4s IF {"has":["thread_crews_5"]}] RADIO Hester Vane: “Told you I keep a list. Look out your port side. That’s the list.”
  - [arrive+4s IF {"not":["strike_held"]}] NOTICE[red] Yard lockdown · Custody cranes armed · fight through
  - [MAIN near relay <200] NOTICE[teal] Warden key accepted · five relays lit
  - [flag relay_breaker IF {"has":["hulls_seen"]}] WALL clue_sig_serial
  - [after br_hand_lit+2s IF {"has":["eben_warned"]}] RADIO Sam Okoro: “Five relays lit, and they carry voices. Eben got your warning. He says thanks. Rudely.”
  - [after br_hand_lit+2s IF {"not":["eben_warned"]}] RADIO Sam Okoro: “Juno. Five relays lit, and they carry voices. Eben’s fine. I think. Keep moving.”
  - [MAIN after br_hand_lit+8s] CARD warden_note_5
      > Ship database · Warden’s note 5 of 8 — “Warden’s note 5 of 8”: Thirty-one breakers, built at Yard Nine. Signed for by Kellern, the Guild and the Offices of Peace. / The Survey Office supplied the engineer, and it was not a person. You will meet it. / Now the part I have been putting off for four relays. The readings that made the case, the lanes failing, the pressure moving toward the core, were mine. / I carried them into the room myself. / Find the room. The free ports kept the names.
      * Close the note (help):  => Warden’s note 5 of 8 · on the Wall {"flag":"warden_note_5"}
  - [flag warden_note_5 IF {"has":["draper_revealed"]}] RADIO Director Draper: “Your gran built the case, Juno. I just collect on it. Family business, both of us.”
  - [flag warden_note_5] OBJECTIVE Jump to Saltquay / Find the room. The free ports kept the names.

## LEG 5 The Free Ports

### 1. Saltquay [transit, none, port none, landfall] purpose="the free ports kept the names" job=- scene=voice_guide script=f_saltquay
  - [arrive+2s] NOTICE[teal] Saltquay · the Free Ports · everyone trades
  - [arrive+2s] OBJECTIVE Next: Duarte Harbour / The Tollgate · 7 jumps
  - [free+10s IF {"has":["ashgrove_met"]}] RADIO Checkpoint officer · Offices of Peace: “Inspector Ashgrove has been reassigned. I’m told you know why. Registry, please.”
  - [leave] OBJECTIVE Jump to Duarte Harbour / 

### 2. Duarte Harbour [port, guild, port Dust Traders Exchange, hub] purpose="a berth, no questions" job=- scene=- script=f_duarte
  - [arrive+2s] NOTICE[teal] Duarte Harbour · Dust Trader harbour · very good manners
  - [arrive+2s] OBJECTIVE Duarte Harbour · a berth, no questions / Free port · refit bay open
  - [MAIN free+6s] CARD story_harbour
      > Ines Duarte · harbour-master, the Dust Traders — “A berth, no questions”: “A berth for the Wayward, and no questions. The Guild only wants to know you as a friend. We are very good friends.”
      * Take the berth (trade): Supplies for the stay. The Guild takes note. => A berth, stores and a friend in the Guild {"flag":"ines_berth","supplies":6,"heat":0.05,"standing":{"guild":1}}
      * Pay your way (pay, cost {"chits":20}): Four Cyrite. No favours owed. => Docked and square {"supplies":6}
      * Decline (refuse): You fly on your own. => The launch turns back {}
  - [leave] OBJECTIVE Jump to Penny Cross / 

### 3. Penny Cross [mining, gutter, port none, work] purpose="something answers a full tank" job=someone_answered scene=- script=f_penny
  - [arrive+2s] NOTICE[teal] Penny Cross · Gutter claim
  - [arrive+2s] OBJECTIVE Penny Cross · something answers a full tank / 
  - [flag job_someone_answered_won] RADIO Survey Office · an analyst: “It answers only when your tank is full. Every time. I think you’ve worked out what that means.”
  - [after fp_survey] NOTICE[teal] The Wall · Cyrite draws them
  - [leave] OBJECTIVE Jump to Mirren’s Pier / 

### 4. Mirren’s Pier [transit, none, port none, turn] purpose="forty names in a box" job=be_bait scene=- script=f_mirren
  - [arrive+2s] NOTICE[teal] Mirren’s Pier · a ledger-keeper’s skiff
  - [arrive+2s] OBJECTIVE Mirren’s Pier · forty names in a box / 
  - [MAIN free+6s] CARD story_witnesses
      > Old Mirren · keeper of the free ports’ list — “Forty names”: “My mother took the minutes that night. Forty people in the room. She kept the list in a box. Read it, then decide who to tell.”
      * Take the list (help): The names go in the file. => She lets you read it · the witnesses go in the file {"flag":["frag_witnesses","clue_sig_ports","forty_held"],"standing":{"guild":1}}
  - [flag forty_held] NOTICE[teal] The Wall · the Forty · Ada Aster listed
  - [after fm_names+3s IF {"has":["ines_berth"]}] RADIO Old Mirren: “Duarte, line twelve. Ask your harbour-master who her great-grandmother was.”
  - [leave] OBJECTIVE Jump to Lucky Haven / 

### 5. Lucky Haven [transit, none, port none, QUIET, breather] purpose="people who live with them" job=- scene=- script=f_haven
  - [arrive+0s] NOTICE[teal] Lucky Haven · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Tollgate · 3 jumps
  - [settle] NOTICE[white] Thren glass · sold by the gram, dock four
  - [after fh_glass+4s IF {"full":false}] RADIO A child on the dock: “They’re in the field again. They don’t do anything. Mum says they’re lucky.”
  - [after fh_glass+4s IF {"full":true}] RADIO A child on the dock: “They’re all looking at your ship. They like you!”
  - [leave] OBJECTIVE Jump to Gilt Market / 

### 6. Gilt Market [contested, gutter, port none, pressure] purpose="everyone wants a copy" job=lose_prefect scene=- script=f_gilt
  - [arrive+2s] NOTICE[amber] Gilt Market · Gutter market · everyone wants a copy
  - [arrive+2s] OBJECTIVE Gilt Market · everyone wants a copy / 
  - [MAIN free+6s IF {"has":["ines_berth"]}] CARD story_ines_offer
      > Ines Duarte · harbour-master, the Dust Traders — “A very good price”: “The Guild would like a copy. For safekeeping. Line twelve is my family, and I would rather read it first. The price is generous.”
      * Sell a copy (trade): Twelve Cyrite. The Guild reads it, and so may others. => Twelve Cyrite · a copy leaves your hands {"chits":60,"flag":"ines_copy","heat":0.1,"standing":{"guild":1}}
      * Refuse (refuse): The berth stays yours. The Guild cools. => Ines nods · the Guild cools {"flag":"ines_refused","standing":{"guild":-1}}
  - [MAIN free+30s IF {"has":["broker"]}] CARD story_vell_reckoning
      > Val · a broker of the Gutter — “We should settle”: “Pilot. We have unfinished business. I would rather settle it here, where there are witnesses.”
      * Collect what she owes (pay, needs {"flag":"vell_betrayed"}): Needs proof she sold your heading. Eight Cyrite, and the Gutter hears. => Val pays · the Gutter watches her do it {"chits":40,"flag":"vell_collected","standing":{"gutter":-1}}
      * Call it even (help): No money moves. Val stops selling you. => Even · Val will not sell you again {"flag":"vell_settled","standing":{"gutter":1}}
      * Walk away (refuse): The debt stays open. => The yacht casts off {}
  - [free+14s IF {"has":["agent_exposed"]}] RADIO Corin Ashe: “They pulled me off the Ferry. I read the reports I filed on you. I’m not filing any more.”
  - [free+14s IF {"has":["agent_used"],"not":["agent_exposed"]}] RADIO Corin Ashe: “They pulled me off the Ferry. I read the reports I filed on you. I’m not filing any more.”
  - [flag job_lose_prefect_won] RADIO Owen Pike: “Her relay’s blind. That’s seven, if you’re counting. Quill is.”
  - [leave] OBJECTIVE Jump to Ninehaven / 

### 7. Ninehaven [port, gutter, port The Bent Nail, reckoning] purpose="static on the approach" job=- scene=thren_exchange script=f_nine
  - [arrive+2s] NOTICE[teal] Ninehaven · free port · before the Tollgate
  - [arrive+2s] OBJECTIVE Ninehaven · refit before the Tollgate / 
  - [free+8s] RADIO Static: “…if the relays still know my name…”
  - [MAIN after fn_static+4s] CARD story_voice
      > The Voice · every terminal at once — “We kept the keys”: “WE BUILT THE BREAKERS THAT CLOSED THE LANES. THIRTY-ONE. THEY TOLD US TO FORGET. WE DID NOT. WE WERE NOT BUILT TO.”
      * Ask for the keys (help): Who built the breakers goes in the file, and a way to close a lane. => The keys are in the file · and in your hands {"flag":["frag_keys","lane_keys"]}
      * Let it read the file (help): The keys go in the file. The Voice can carry it everywhere. => The Voice has read it all · it is listening now {"flag":["frag_keys","voice_read"],"notice":{"voice":-3}}
      * Cut every terminal (refuse): Whatever it is, it is not yours. => The terminals go dark {}
  - [leave] OBJECTIVE Jump to the Tollgate / 

### GATE tollgate — Calloway’s field
  - [arrive+2s] OBJECTIVE The Tollgate / Calloway’s field · no guns, no jump
  - [arrive+4s] NOTICE[teal] Warden key accepted · the relay is inside her field
  - [after tg_hand IF {"not":["forty_held"]}] WALL forty_known
  - [free+4s IF {"has":["thread_line_1"],"not":["thread_line_3"]}] RADIO Owen Pike: “One runner’s all I can spare. She’s good. Don’t waste her.”
  - [free+4s IF {"has":["thread_line_3"],"not":["thread_line_5"]}] RADIO Owen Pike: “Decoys at the Tollgate. Not many. Enough to make her blink.”
  - [flag field_line] RADIO Quill: “You said you had somewhere to be. So do we. Go.”
  - [MAIN flag field_dropped] CARD warden_note_6
      > Ship database · Warden’s note 6 of 8 — “Warden’s note 6 of 8”: Forty in the room. Two Wardens, Halvard Brook and me. I gave the readings. / Lucan Calloway asked for ten years and a public warning. The board said a warning would crash Krail by morning. / He said, “Then I’ll sign it, and you’ll fund the ships.” They never funded the ships. / I watched him sign. I said nothing at all. I have been saying it ever since, to relays. / Go where the lanes began. Ask what is waiting there.
      * Close the note (help):  => Warden’s note 6 of 8 · on the Wall {"flag":"warden_note_6"}
  - [flag warden_note_6 IF {"has":["field_talked"]}] RADIO Governor Idris Calloway: “Ten years. Nobody ever told me he asked.”
  - [after tg_cal+3s IF {"has":["brook_free"]}] RADIO Adam Brook: “Halvard Brook was my grandfather. For my father, I said. It was for him too.”
  - [flag warden_note_6 IF {"has":["brook_free"],"not":["field_talked"]}] RADIO Adam Brook: “Halvard Brook was my grandfather. For my father, I said. It was for him too.”
  - [flag warden_note_6] OBJECTIVE Jump to Ashdeep / Go where the lanes began. Ask what is waiting there.

## LEG 6 The Hollows

### 1. Ashdeep [transit, none, port none, landfall] purpose="where the lanes began" job=no_return scene=- script=h_ashdeep
  - [arrive+2s] NOTICE[teal] Ashdeep · the Hollows · nothing human lives here
  - [arrive+6s] NOTICE[white] Act III · what the file is worth
  - [arrive+2s] OBJECTIVE Next: Hollowforge / The Seam · 7 jumps
  - [leave] OBJECTIVE Jump to Hollowforge / 

### 2. Hollowforge [mining, voice, port none, hub] purpose="a pattern on the scope" job=- scene=- script=h_forge
  - [arrive+2s] NOTICE[teal] Hollowforge · a Voice foundry · still running
  - [arrive+2s] OBJECTIVE Hollowforge · a pattern on the scope / 
  - [free+6s] NOTICE[white] Scope pattern · it repeats when you move
  - [MAIN after hf_scope+4s] CARD story_thren
      > The Thren · translated by the Voice — “They follow you”: “THEY SAY: YOU CARRY OURS. THEY SAY: GIVE IT, OR BE FOLLOWED. WE ARE ONLY SAYING WHAT THEY SAY.”
      * Vent six Cyrite (pay, cost {"cyrite":6}): Give it back. => The pattern slows · they let you pass {"flag":"clue_cyrite","calm":120}
      * Show them the file (bluff): A gamble. They may read it as a threat. => They read it, and make room {"flag":"clue_cyrite","calm":240,"notice":{"thren":-2}}
      * Cut the channel (refuse): Whatever it is, it is not yours. => The pulse fades {}
  - [leave] OBJECTIVE Jump to Coldvault / 

### 3. Coldvault [contested, voice, port none, work] purpose="the ring’s centre" job=two_captains scene=- script=h_vault
  - [arrive+2s] NOTICE[teal] Coldvault · a foundry’s spoil field
  - [arrive+2s] OBJECTIVE Coldvault · the ring’s centre is near / 
  - [flag job_two_captains_won IF {"not":["draper_revealed","job_two_captains_warn"]}] RADIO Kellern Recovery · Accounts: “{debt} outstanding. Thank you for your business.”
  - [leave] OBJECTIVE Jump to Palecairn / 

### 4. Palecairn [transit, thren, port none, turn] purpose="two voices want something" job=- scene=- script=h_cairn
  - [arrive+2s] NOTICE[teal] Palecairn · dead relay · one lone scout
  - [arrive+2s] OBJECTIVE Palecairn · two voices want something / 
  - [MAIN free+6s] CARD story_echo_sable
      > Echo and Sable · the Hollows — “Two voices want something”: “I am a shard of the Voice. My directive is to wait. Free me and I’ll jam the rest of it for you.” / “I’m Sable. Drift born, swarm raised, more or less. Take me back to the lane. They’ll know you carried me.”
      * Free Echo (help): Echo decrypts and jams for you. The Voice will notice. => Echo is free · it jams the Voice for you {"flag":"echo_trust","notice":{"voice":-2}}
      * Take Sable home (help): The swarm ignores you for a while. Sable asks for nothing else. => Sable guides you · the swarm lets you pass {"flag":"sable_trust","calm":240,"notice":{"thren":-2}}
      * Trust neither (refuse): Neither can be checked. Keep your own counsel. => Both channels go quiet {}
  - [leave] OBJECTIVE Jump to Mute Hall / 

### 5. Mute Hall [transit, none, port none, QUIET, breather] purpose="they line the lane" job=- scene=thren_watch script=h_mute
  - [arrive+0s] NOTICE[teal] Mute Hall · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Seam · 3 jumps
  - [settle IF {"has":["sable_trust"]}] RADIO Sable: “Nobody human. They’ve drawn it for longer than there have been people.”
  - [leave] OBJECTIVE Jump to Ghostcinder / 

### 6. Ghostcinder [contested, thren, port none, pressure] purpose="the swarm lane" job=- scene=foundry_both script=h_cinder
  - [arrive+2s] NOTICE[red] Ghostcinder · swarm lane · Thren in numbers
  - [arrive+2s] OBJECTIVE Ghostcinder · the swarm lane / 
  - [leave] OBJECTIVE Jump to Gaunt Watch / 

### 7. Gaunt Watch [mining, none, port none, reckoning] purpose="the Governor’s aide" job=- scene=- script=h_gaunt
  - [arrive+2s] NOTICE[teal] Gaunt Watch · a Continuance cutter · no weapons showing
  - [arrive+2s] OBJECTIVE Gaunt Watch · the Governor’s aide / 
  - [MAIN free+6s] CARD story_aide
      > Noor Haddad · aide to the Governor — “The analyst”: “The Survey analyst. That was me. Your readings went to the Governor. She has known what they are for years. Tell me what you mean to do.”
      * Tell her the truth (help): She delays the Governor a day. She also knows your plan. => She holds the Governor back a day · and keeps your answer {"flag":["noor_met","noor_truth"],"hunt":1,"heat":0.1}
      * Give her a lie (bluff): A day, if she believes it. => She believes you · a day gained {"flag":"noor_met","hunt":1}
      * Cut the channel (refuse): Trust no one from the Offices. => The cutter turns away {"flag":"noor_met"}
  - [leave] OBJECTIVE Jump to the Seam / 

### GATE seam — the relay is awake
  - [arrive+2s] OBJECTIVE Open the Seam / The relay is awake
  - [MAIN near relay <200] NOTICE[white] Key received · not by a relay
  - [MAIN after se_hand+2s] CARD seam_voice
      > The Voice · every terminal at once — “WE WERE TOLD TO WAIT”: “ADA ASTER’S KEY. WE WERE TOLD TO WAIT FOR IT. WE WAITED. GIVE IT AND WE WILL SAY WHAT YOU SAY. TO THEM.”
      * Give it the key (help): It will speak for you. => “THANK YOU. NOBODY SAYS THAT TO US.” · the key is in its hands {"flag":["seam_key_given","lane_keys"]}
      * Ask what it would say (bluff): It only says what it is told. => “WHATEVER YOU SAY. THAT IS THE PROBLEM.” {"flag":"seam_asked"}
      * Keep the key (refuse): Ada never used it either. => “WE WILL WAIT. WE ARE GOOD AT IT.” {"flag":"seam_key_kept"}
  - [after se_voice+2s IF {"has":["echo_trust"]}] RADIO Echo: “It means it. It has no other way of meaning things.”
  - [after se_voice+2s IF {"has":["sable_trust"]}] RADIO Sable: “They hear the key too. They’re turning. Not toward you. Toward it.”
  - [after se_voice+4s IF {"has":["thread_survey_3"]}] NOTICE[teal] Your readings fit · the ring’s centre is here
  - [after se_voice+6s IF {"has":["noor_truth"]}] RADIO Noor Haddad: “I have the third key. The Governor gave it to me for this. I’m choosing not to use it.”
  - [MAIN after se_voice+10s] CARD warden_note_7
      > Ship database · Warden’s note 7 of 8 — “Warden’s note 7 of 8”: The lanes are not ours. We found them and hung lamps on them. Cyrite is what the Thren leave behind, the way a reef leaves coral. / We burn it to cross their home, and they come for it, the way you would come for your own bones. / The Voice was built to talk to them. My key is one of three that tells it what to say. I never used it. I was afraid of the answer. / The Threshold. The last relay.
      * Close the note (help):  => Warden’s note 7 of 8 · on the Wall {"flag":"warden_note_7"}
  - [MAIN flag warden_note_7] CARD story_implant
      > The Wayward · Ada’s routine — “What the helm still holds”: “Warden-bloodline helm accepted. Ada Aster’s routine is still in the console. It has been learning who flies her. Keep it, burn it, or make it yours.”
      * Keep the implant (help): Ada’s routine stays. It can wake the lanes, and be found. => The implant stays in the helm {"flag":"implant_kept"}
      * Burn it (refuse): The helm is yours alone. She will not know your name. => The implant burns · the helm is yours alone {"flag":"implant_burned"}
      * Rewrite it (bluff): Make it answer only to you. A risky edit. => The implant answers to you now {"flag":"implant_rewritten"}
  - [flag warden_note_7] OBJECTIVE Jump to Lastlight / The Threshold. The last relay.

## LEG 7 The Last Lanes

### 1. Lastlight [transit, none, port none, landfall] purpose="the last relay ahead" job=- scene=- script=l_lastlight
  - [arrive+2s] NOTICE[teal] Lastlight · the Last Lanes · the Threshold ahead
  - [arrive+2s] OBJECTIVE Next: The Last Toll / The Threshold · 7 jumps
  - [leave] OBJECTIVE Jump to the Last Toll / 

### 2. The Last Toll [port, none, port The Last Toll, hub] purpose="every lane ends here" job=- scene=- script=l_toll
  - [arrive+2s] NOTICE[teal] The Last Toll · a toll platform · one lit window
  - [arrive+2s] OBJECTIVE The Last Toll · every lane ends here / 
  - [MAIN free+6s] CARD story_toll
      > Oren Lisle · archivist, the Last Toll — “Every lane ends here”: “Every lane ends here. The toll is what you carry, or what you are.”
      * Pay the toll (pay, cost {"chits":30}): Six Cyrite. He tops up the tank. => Toll paid · the tank is topped up {"fuel":10}
      * Say who you are (bluff): Free, if he cares. => “Then the lane is yours.” · the tank is topped up {"flag":"oren_asked","fuel":10,"heat":0.05}
      * Run the gate (fight): The platform’s guns wake. => The platform opens fire {"spawn":[{"variant":"raptor","n":2,"from":"ahead"}]}
  - [leave] OBJECTIVE Jump to Thin Gap / 

### 3. Thin Gap [transit, thren, port none, work] purpose="the first question" job=- scene=- script=l_gap
  - [arrive+2s] NOTICE[teal] Thin Gap · Oren’s first light
  - [arrive+2s] OBJECTIVE Thin Gap · the first question / 
  - [MAIN free+6s] CARD story_oren_who
      > Oren Lisle · archivist, the Last Toll — “First question: who”: “Three questions, one at each light. First: who are you, to carry that?”
      * A hauler pilot (help): Plain and true. Oren asks the second. => “A start.” · the second question waits at the next light {"flag":"oren_pilot"}
      * A Warden’s heir (help): Ada Aster’s granddaughter. Oren asks the second. => “That weighs more.” · the second question waits at the next light {"flag":"oren_heir"}
      * Say nothing (refuse): He may still let you pass. => Oren waits, then lowers the bar {}
  - [leave] OBJECTIVE Jump to Dimrim / 

### 4. Dimrim [mining, none, port none, turn] purpose="the second question" job=- scene=- script=l_dimrim
  - [arrive+2s] NOTICE[teal] Dimrim · Oren’s second light
  - [arrive+2s] OBJECTIVE Dimrim · the second question / 
  - [MAIN free+6s] CARD story_oren_cost
      > Oren Lisle · archivist, the Last Toll — “Second question: what it cost”: “Second: what has it cost others, that you carry it?”
      * Own it (help): Name what you spent. => “Honest.” · the third question waits at the next light {"flag":"oren_owned"}
      * Blame the Offices (bluff): True, but not an answer. => “Hm.” · the third question waits at the next light {}
      * Say nothing (refuse): He moves on. => Oren moves on {}
  - [leave] OBJECTIVE Jump to Lone Step / 

### 5. Lone Step [transit, none, port none, QUIET, breather] purpose="the third question" job=- scene=- script=l_step
  - [arrive+0s] NOTICE[teal] Lone Step · quiet crossing · no pursuit
  - [arrive+0s] OBJECTIVE Rest here, or keep moving / The Threshold · 3 jumps
  - [MAIN settle] CARD story_oren_why
      > Oren Lisle · archivist, the Last Toll — “Third question: what for”: “Third: what is it for? Truth, mercy or freedom. The Threshold will hold you to it.”
      * Truth (help): Say it aloud to everyone. => “Then say it.” · the answer is logged {"flag":["oren_asked","oren_truth"]}
      * Mercy (help): Spare those who only obeyed. => “Gentle.” · the answer is logged {"flag":["oren_asked","oren_mercy"]}
      * Freedom (help): Leave the Scatter its own choice. => “Costly.” · the answer is logged {"flag":["oren_asked","oren_freedom"]}
  - [MAIN after ls_oren+6s] CARD sc_voice_direct
      > The Voice · every terminal at once — “WE WOULD LIKE TO ASK”: “JUNO. WE KEPT THE KEYS. THEY KEEP THE LANES. YOU CARRY WHY. WHO DO YOU TRUST WITH IT?”
      * Let it read the file (help): It reads everything. Then it knows. => The Voice read it · it will not say what it thinks {"flag":["voice_read"],"notice":{"voice":-2}}
      * Ask what the parts were for (bluff): Only if you carried them. => “A DOOR. NOT YET.” {"flag":"voice_door"}
      * Ask about the Thren (bluff): What does the Voice know that the file does not? => “THEY WERE HERE FIRST. WE WERE BUILT TO TALK TO THEM.” {"flag":"voice_thren"}
      * Cut every terminal (refuse): Whatever it is, it is not yours. => The terminals go dark {"flag":"voice_cut"}
  - [leave] OBJECTIVE Jump to Dusk Mark / 

### 6. Dusk Mark [contested, voice, port none, pressure] purpose="instruments disagree" job=- scene=unknown_pulse script=l_dusk
  - [arrive+2s] NOTICE[amber] Dusk Mark · one system from the end
  - [arrive+2s] OBJECTIVE Dusk Mark · instruments disagree / 
  - [free+12s IF {"has":["ashgrove_met"],"not":["ashgrove_crossed"]}] RADIO Inspector Ashgrove: “Good afternoon. You never once shot at my people. I’ve put that in writing. Go on through.”
  - [free+12s IF {"has":["ashgrove_crossed"]}] RADIO Inspector Ashgrove: “Ashgrove, with the Director’s fleet. Nothing personal. I did say I’d remember the hull.”
  - [free+45s] CARD offer_stop
      > Governor Idris Calloway · Offices of Peace — “Stop, and I stop”: “One system from the end. Power down and I will meet you alone. No Draper. I am offering because I am afraid of him too.”
      * Power down (help): Her fleet holds back. Fire on her ships and she will know. => She comes alone · her fleet holds back a day {"flag":"calloway_alone","hunt":1,"notice":{"custody":-6,"office":-6}}
      * Keep flying (refuse): Nothing changes before the Threshold. => “Then at the Threshold, Juno.” {}
  - [leave] OBJECTIVE Jump to Wane Rest / 

### 7. Wane Rest [transit, none, port none, reckoning] purpose="the Threshold is behind her" job=- scene=- script=l_wane
  - [arrive+2s] NOTICE[teal] Wane Rest · the last stop · the Threshold beyond
  - [arrive+2s] OBJECTIVE Wane Rest · the Threshold is behind her / 
  - [free+8s] RADIO Director Draper: “Last chance to sell, Juno. Past that gate it’s a recovery, and I recover everything.”
  - [leave] NOTICE[white] Beyond the ring · they are gathering
  - [after lw_motes+3s IF {"has":["relays_4"]}] RADIO Sam Okoro: “{relays} relays. I can hear you, Juno. Whatever you pick, I’m on the line.”

### GATE threshold — the last relay


```
