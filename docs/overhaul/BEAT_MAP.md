# WAYWARD · Beat Map

Companion to the Story Bible. Every major scene from Cerro to the epilogue, in order.

**Columns:**
- **Purpose:** why the scene exists.
- **Reveal:** what the player learns.
- **Choice:** what the player decides.
- **Consequence:** the flag it sets and where that flag is read.
- **Next:** where the player goes from here.

**Tags:**
- **[Built]** means the scene plays today.
- **[Revise]** means it is built but the Script rewrites it.
- **[Needs build]** means new sequencing or state work.

Stop roles follow the Authored Road:
1. Landfall
2. Hub
3. Work
4. Turn
5. Breather
6. Work under pressure
7. Reckoning
8. Approach and gate

## 0. Sequencing rules (apply everywhere) [Needs build past the Reach]

1. **Main beats are tied to a stop, not to "next free system".** Each stop holds at most one Main card, and a beat cannot spill into another stop's slot. If a Main card has not played when the player reaches the gate, the gate holds, using the Narrows rule from #384 with its 4-minute release. On release, the card plays first thing at the next landfall.
2. **Order inside a stop:** Main card, then thread job, then chance. A thread job can never ring before that stop's Main card has been answered (this generalises the Halden fix).
3. **Arrivals are five-step and strict:** approach, handshake, note, answer, transition. Nothing else can be in the queue between steps 2 and 5.
4. **Characters must be introduced before they make offers.** Calloway's offers unlock only after the Narrows answer. Draper's open offers unlock only after the Breaker Yards reveal. Noor can call only after the Seam.
5. **Played means done.** A beat that has been answered, or released at a gate, is marked done and never returns as "missed". This generalises the region-0 fix.
6. **Clues reach the Wall when earned,** even if the line that goes with them is still queued.
7. **Essential clues have two routes.** Each of the three signature clues, plus the ring and the Thren–Cyrite link, can be earned in two ways (see §2).
8. **Breathers stay quiet:** no tolls, no chance fights, no Calloway offers, no Net notices.
9. **One Thren meeting per leg** sits at a fixed stop, never during a fight, and can be stronger or weaker depending on the tank.

## 1. Leg by leg

### Act I · Cerro and the first system [Built, kept]
| Scene | Purpose | Reveal | Choice | Consequence | Next |
| --- | --- | --- | --- | --- | --- |
| Contract 08-441, the Work Bay | Teach mining, and show the company's arithmetic | A full hold is worth 2 credits | Fit launcher (forced) | A 20 credit debt | Raiders |
| Raiders, the hold lost | Make the cost visible | | Surrender / refuse | Surrender restarts | The gate |
| Breach, autopilot | Turn Juno into a debtor | 80 credits owed | Acknowledge | Recovery flag | Sam |
| Sam's code, the rename | The one act that changes who she is | | Input the code | Wanted +1 | The archive |
| The archive wakes | The inciting incident | 94% | Set course | Wall: 2 records | The Reach |

**Small revision [Revise]:** the archive's last line keeps "Start at Halden's Reach". A new last sentence is added: *"The relays there still answer to the right key."* This seeds the keys.

### Leg 1 · The Reach: *The Signed Order* [Built, small revisions]
**Leg question:** who remembers Ada, and who kept the records? **Understanding:** Ada left a road, and following it lights me up.

| Stop | Scene | Purpose | Reveal | Choice | Consequence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Northfold | Sam: the watched lanes | Set the road | Only one lane is quiet | — | — | Halden |
| 2 Halden's Reach | Ilse, the order, the handwriting [Built] | Three clues | Order, L. C., Ada | Hear / copy / cut | `ilse_*`, `order_held`, `ada_named` | Hollis |
| 2 | Quiet Line 1: Nothing to Declare | Start the thread | A registry chip for a family | Deliver / sell / decline | QL count | |
| 3 Hollis | Ghost on the scope; Hester 1 | First touch of the Thren | Something matches her speed | Follow / buy / decline | Hester count | Marlow |
| 4 Marlow | Brook's ledger | The money trail | L. C. on the transfers | Pay / ask / decline | `ledger_held` (clue 1, route A) | Vesta |
| 5 Vesta | Breather, Hester's call, Sam on Ada | Warmth | Sam's father on the Wardens | — | — | Branford |
| 6 Branford | Hester 2: Pirate Toll; the Net | Pressure | The Net has Northfold | Attack / jam / decline | Hester count | Copperline |
| 7 Copperline | Brook arrested | The first cost lands on someone else | | Break / divert / leave | `brook_*` | Narrows |
| 8 The Narrows | Arrival 1 (§1.1 of the Script) | Learn the engine | Relays broadcast | Tell / lie / cut | `calloway_narrows`, `relays_lit=1` | Marches |

**Revisions [Revise]:**
- At Vesta, Sam's last line now ends on Eben, which sets up the Breaker Yards: "My brother says the same. He works the yards now."
- The Edge relay line is removed from the Narrows.
- Brook's line "For my father" is unchanged here. It pays off on the Forty list.

### Leg 2 · The Marches: *Who Stands With You* [Needs build]
**Question:** can people cooperate when there is not enough? **Understanding:** other people knew about this road, and some will help me walk it.

| Stop | System | Scene | Reveal | Choice | Consequence |
| --- | --- | --- | --- | --- | --- |
| 1 Landfall | Wake | Note 1's lead becomes the goal. Edge relay chatter. Calloway's pursuit line set by her Narrows answer | — | — | Pursuit days |
| 2 Hub | Kessel Hold | Oduya: read it to the moot [Built] | The Holdfasts lost kin too | Read / stores / not yet | `kessel_ally` |
| 3 Work | Tamsin Field | Account 1: Wanted: Alive (first call from *Kellern Recovery · Accounts*) | Someone is offering to settle her debt | Take / refuse | Account count, debt 80 → 66 |
| 4 Turn | The Long Walk | Ma Saffi and Wren: the manifests [Built, Revise] | Ships rerouted on purpose, Wren's parents among them | Trade / buy / decline | `drift_ally`, `wren_trust` (Trade only) |
| 5 Breather | Low Harrow | **Thren folklore.** A gutted Drift hull scored in parallel lines. Wren: "They follow the full ones." Hester 3: The Missing Shift call (radio only, the job comes at 6) | People have rules for something | — | — |
| 6 Pressure | Gannet Reach | Oduya: the rigs [Built]. Then Hester 3: The Missing Shift, and Quiet Line 2: Copy the Patrol Codes | Kellern security is boarding Holdfast rigs | Defend / supply / not now | `rigs_held` |
| 7 Reckoning | Sallow Port | Hester 4: One Filter Left, and Account 2: The Heavy Tanker. **Collision chip:** the tanker carries the filters | The two threads pull against each other | One or the other, or both if fast | Counts |
| 8 Approach | The Rift | **Arrival 2** | | | `relays_lit=2` |

**Calloway offer 1** (*Meet me*) can come only at stop 3 or 6, and only if her Narrows answer was truth or a failed lie.

**Val moves.** Val's advance used to be the Rift gate beat. It moves to the Salvage Belt hub, where Val lives. The Rift gate belongs to the arrival.

### Leg 3 · The Salvage Belt: *What Things Are Worth* [Needs build]
**Question:** who profits from wreckage? **Understanding:** people are hunting the evidence, and some will sell me to get it.

| Stop | Scene | Reveal | Choice | Consequence |
| --- | --- | --- | --- | --- |
| 1 Landfall · Breakwater | Note 2's lead. Ashgrove's checkpoint card is not here (it is at the gates only) | — | — | — |
| 2 Hub · Scrap Exchange | Val: an advance [Built, moved] | Everyone knows what Juno carries | Take / not for sale / run off | `val_advance` |
| 3 Work · The Graveyard | Survey 1: The Wreck That Remembered. The analyst's first call | A hull met something and turned back | Take / refuse | Survey count |
| 4 Turn · Kessler's wreck | Dov Kessler: the recorder [Built, Revise]. The black box is Ada's cutter | **Ada's voice, and her death** | Cut / pay / leave | `ada_voice` |
| 5 Breather · Saltmarsh | **The first sighting.** A river of motes crosses the course. Fluid or patience | They react to Cyrite | Wait / burn fluid to run dark | — |
| 6 Pressure · Kiln | Kesh: Val talks too much [Built], if `val_advance`. Quiet Line 3 and 4: The Dead Drop, then Get the Witness Out (the witness names Val) | Someone in the Line sells routes. It is Val | Settle / trust / wave off | `kesh_warns` |
| 7 Reckoning · Tarik's lamps | Tarik Silva: the burned charts [Built, moved from the gate]. Hester 5: Escort the Hauler | The closures form a curve | Trade / share / decline | `charts_held` (ring, route A) |
| 7b | Val: your heading sold [Built], if `val_advance` | | Pay / jam / let go | `val_*` |
| 8 Approach | **Arrival 3**, the Scrapgate | | | `relays_lit=3` |

**If the recorder is left,** Ada's recorded line still plays: it is the Scrapgate note. The Scrapgate note is her voice either way. Choosing the recorder adds her last line, "Tell my granddaughter I tried", which otherwise never plays. Nothing essential is lost.

### Leg 4 · The Drift Deep: *The Ring* [Needs build]
**Question:** what were the lanes built to contain? **Understanding:** the road was built around something, not away from it.

| Stop | Scene | Reveal | Choice | Consequence |
| --- | --- | --- | --- | --- |
| 1 Landfall | Note 3's lead. Navigation shadow (gate drift) [Built] | | | |
| 2 Hub · The Quiet Ferry | Ossie Raine [Built] | | Ride / trade / wave | `ferry_rode` |
| 3 Work | Quiet Line 5: Race for the Wreck (Quill). Survey 2: Something in the Dark | It is moving toward the lanes | | Counts |
| 4 Turn | Ossie: the agent aboard [Built], now named Corin Ashe | The Offices are on the Ferry | Expose / let be / feed a story | `agent` |
| 5 Breather | **The Voice, first contact:** "THE PREFECT IS BEHIND YOU" [Built, moved here from chance; it now comes in a quiet stop, so it lands] | It knows things | Ask what / how / cut | Time |
| 6 Pressure | Hester 6: Hold the Last Shift (Hester's own rig). Account 3: Stolen Payroll. **Collision:** the payroll is Hester's crews' wages | | | Counts |
| 7 Reckoning | A signal that answers [Built], plus Tarik's second call (if `charts_held`): "Draw the closures on a chart. It's a ring." Without the charts, Ossie says the same, from Drift memory (ring, route B) | The ring | Answer / vent / switch off | — |
| 8 Approach | **Arrival 4**, the Slow Door | | | `relays_lit=4` |

Ben Anand moves to the Breaker Yards hub, his home region. The Slow Door's gate belongs to its arrival.

### Leg 5 · The Breaker Yards: *Who Built It* [Needs build]
**Question:** who built the machinery of the Severance? **Understanding:** the Severance was deliberate, built and signed for.

| Stop | Scene | Reveal | Choice | Consequence |
| --- | --- | --- | --- | --- |
| 1 Landfall | Note 4's lead | | | |
| 2 Hub · Yard Nine | Ben Anand: the first work order [Built, moved] | A breaker built to an order | Pay / shield / decline | `work_order_held` (clue 2, route A) |
| 3 Work | Account 4: The Drift Cache (collision: Wren ↓). Quiet Line 6: Run the Needle (Quill joins) | | | Counts |
| 4 Turn | **Sam calls, patched through the relays** [Built, Revise]: Eben and the scarred hulls | The marks are not claws | Warn / look / not now | `eben_warned`, `hulls_seen` |
| 5 Breather | **The cage.** One breaker still holds a knot of motes. The Thren hulk in the Custody yard [Built] | The breakers were never pointed outward | Cut loose / help / mind | — |
| 6 Pressure | Marit Voss: the strike [Built]. Hester 7: Clear the Crossing. Survey 3: The Voice on the Wire | | Stand / supplies / not yet | `strike_held` = stood **and** Hester count ≥ 3 |
| 7 Reckoning | **Draper reveals himself** [Built, Revise; no longer "if the hunt has stalled", now always]. Accounts was his desk | Who has been paying her | Make him say it / copy / end | `draper_recorded`. Debt reads Settled; Draper owns the record |
| 8 Approach | **Arrival 5**, the Breaker | | | `relays_lit=5` |

**Clue 2, route B:** without the work order, the Breaker's own hull carries the serial and Ada's note 5 names it. The clue counts if `relays_lit ≥ 5` and `hulls_seen`. **[needs build]**

### Leg 6 · The Free Ports: *Who Was in the Room* [Needs build]
**Question:** who was in the room, and what did they accept? **Understanding:** people profited from it, and some of them are my allies.

| Stop | Scene | Reveal | Choice | Consequence |
| --- | --- | --- | --- | --- |
| 1 Landfall | Note 5's lead. Ashgrove demoted (radio, from a new voice at the next checkpoint) | | | |
| 2 Hub · Duarte Harbour | Ines Duarte: a berth [Built, moved] | | Take / pay / decline | `guild_friend` |
| 3 Work | Survey 4: Someone Answered (**the tank is the tell, confirmed**). Account 5: Draw Them Out (Draper now asks openly) | Cyrite draws them | | Counts |
| 4 Turn | **Old Mirren: the Forty** [Built, now guaranteed] | Names, including Ines's great-grandmother, Halvard Brook and Ada Aster | Copy / swear / leave | `forty_held` (clue 3, route A) |
| 5 Breather | **People who live with them:** Thren glass for sale, children watching motes in the damping field | Fear was also sold | | |
| 6 Pressure | Ines: a very good price [Built]. Val: we should settle [Built]. Quiet Line 7: Lose the Governor's Trail. Corin Ashe returns if exposed or used | | | |
| 7 Reckoning | **The Voice on the approach.** Static repeats Ada's note 1 back. Then the Voice's "We kept the keys" [Built, moved from the Seam's slot] | The Voice built the breakers | Ask for keys / let it read / cut | `voice_keys`, `voice_read` |
| 8 Approach | **Arrival 6**, the Tollgate: Calloway's damping field [Built] | | | `relays_lit=6` |

**Clue 3, route B:** if the player leaves Mirren's box, Ada's note 6 at the Tollgate gives the room in Ada's own words, without the list. The clue counts as `forty_known`. "Show the signature" then needs the ledger or work-order route, plus `forty_held` or `forty_known`. **[needs build]**

### Leg 7 · The Hollows: *What It Was For* [Needs build]
**Question:** what are the keys, and what is the Voice obeying? **Understanding:** the thing behind it is real, and still listening.

| Stop | Scene | Reveal | Choice | Consequence |
| --- | --- | --- | --- | --- |
| 1 Landfall | Note 6's lead. Act III heading | | | |
| 2 Hub | **The Thren: "THEY FOLLOW THE CYRITE"** [Built, Revise; their pattern now appears as a scope shape, and the words are the Voice translating] | They will speak | Vent / show file / cut | — |
| 3 Work | Account 6: Two Captains, One Wreck. Survey 5: The Point of No Return | The ring's centre is here | | |
| 4 Turn | **Echo or Sable** [Built] | Two ways to read them | Echo / Sable / neither | `echo_*` |
| 5 Breather | "They line the lane." "It is exactly a line. Nobody drew it." [Built] | They built the lanes | | |
| 6 Pressure | Swarm lane, the hardest Thren fight. Machines letting swarms through the gates [Built] | | | |
| 7 Reckoning | **Noor Haddad** [Built, moved from gate]: she is the Survey buyer, and holds the third key | Calloway has known all along | Truth / lie / cut | Noor's choice at the Seam |
| 8 Approach | **Arrival 7**, the Seam: the Voice asks for the key, then the **implant** | | Give key / withhold; implant | `relays_lit=7`, `implant` |

### Leg 8 · The Last Lanes: *What You Do With It* [Needs build]
**Question:** what will Juno do with the truth? **Understanding:** I know the truth. What am I going to do with it?

| Stop | Scene | Choice | Consequence |
| --- | --- | --- | --- |
| 1 Landfall | Note 7's lead | | |
| 2 Hub | Oren Lisle: the toll [Built] | Pay / say who / run | |
| 3 | Oren: question 1 (who) | | |
| 4 | Oren: question 2 (cost) | | |
| 5 Breather | Oren: question 3 (what for). The Voice: "WHO DO YOU TRUST WITH IT?" [Built] | | `oren_*` |
| 6 | Instruments disagree [Built]. Ashgrove signals through or flies with Draper | | |
| 7 | Draper's fleet hail | | |
| 8 | **Arrival 8**, the Threshold: Calloway [Built] then note 8, then the endings | | |

Oren's three questions now sit on three separate stops. This fixes the bug where they finished twice.

## 2. The evidence chain

| Claim | Proved by | Second route | What it does not prove |
| --- | --- | --- | --- |
| The shortage was false | 94% (archive) | — | Why |
| The closure was ordered, not neglect | The order (Ilse, or her recording) | Ilse's recording at Vesta | Who L. C. is |
| L. C. was paid | The ledger (Brook) | Brook freed, his copy reaches Wake | That L. C. profited personally (they did not; the board did) |
| Ships were rerouted on purpose | Manifests (Saffi) | Note 2 | Into what |
| Ada kept the keys | Note 3 | — | |
| The closures form a ring | Tarik's charts | Ossie's Drift memory | Around what |
| The ring was built around the Thren | Note 4 plus the cage | Survey 2 | That they are dangerous |
| Who built the breakers | Work order (Anand) | The Breaker's hull serial plus note 5 | Who decided |
| Who decided | The Forty (Mirren) | Note 6 | Whether they were wrong |
| Cyrite draws the Thren | Survey 4 | The Hollows Thren card | What they want |
| What the Thren are | Note 7, the Voice, Echo or Sable | — | Whether reopening is safe |

**"Show the signature"** needs three things:
- the ledger, or the order;
- the work order, or the hull serial;
- the Forty, or note 6.

## 3. Calloway across the road

Each leg has one scene with her at most, and her offers are reduced to five.

| Leg | Scene | Reads |
| --- | --- | --- |
| Narrows | First meeting [Built] | |
| Marches | Offer *Meet me* (only after truth or a failed lie) | `calloway_narrows` |
| Salvage Belt | Offer *A name that is not yours* | |
| Drift Deep | *What did you see?* (asks about the motes, the first hint she knows) | Sightings |
| Breaker Yards | None. Draper takes the stage | |
| Free Ports | The damping field [Built] | Everything |
| Hollows | Through Noor | |
| Last Lanes | *Stop, and I stop* | |
| Threshold | The last meeting [Built] | Everything |

The cut offers are *A full tank*, *Come alongside*, *A clean transit stamp* and *The best there is*. *There you are* (when she catches up) stays as a pursuit event and is not counted as an offer.

## 4. The four threads, revised

**Order, contact, payoff and failure states are as in the Authored Road, with these changes:**

- **Quiet Line.** Owen Pike, then Quill.
  - Step 2 is Copy the Patrol Codes (the Road listed "Stay Out of Range", which is not a job title in the build). Steps 3 and 4 reveal Val as the leak.
  - Payoff at the Tollgate: a fifth answer, *Run it with the Line*. In Broadcast the file goes out on a hundred hulls.
  - With 2 steps or fewer, Pike sends a single runner. With 3 or 4, decoys. With 5 or more, Quill flies point.
- **Hester's Crews.** Hester Vane.
  - Payoff: the strike holds at the Breaker. The crews count as friends for Unite (miners' standing +1).
  - The Account's Stolen Payroll costs 2 thread points if taken.
- **The Survey.** The analyst is Noor Haddad, revealed at the Hollows reckoning.
  - Payoff at the Seam: if the Survey count is 3 or more, Juno can read the Voice's map, and the Seam's reveal is shown, not told.
- **The Account.** Kellern Recovery · Accounts, which is Draper.
  - The debt shows from 80 to 0 and falls by 14 a step (rounding to 0 at step 6).
  - Payoff: Draper's reveal shows the charge sheet. Trade becomes easier, Unite harder.

**Collision chips:** Heavy Tanker (Hester ↓), Stolen Payroll (Hester ↓), Drift Cache (Wren ↓), Two Captains, One Wreck (Unite ↓).

## 5. The Thren meetings

| Leg | Stop | Meeting | Tank effect |
| --- | --- | --- | --- |
| Reach | 3 | Ghost on the scope [Built] | Closer at three-quarters full |
| Marches | 5 | Folklore and the scored hull | Wren's line changes if the tank is full |
| Belt | 5 | The river of motes | Ignores an empty tank, turns toward a full one |
| Drift Deep | 8 | Motes on the Slow Door during the escort | Density scales with the tank |
| Breakers | 5 | The cage | The knot pulses toward the Wayward's tank |
| Free Ports | 5 | Motes in the damping field | Children say "they like you" if the tank is full |
| Hollows | all | Their space | Swarm size |
| Last Lanes | 8 | Gathered beyond the ring | Visible from the Threshold |

## 6. The endings: what earlier play changes

The requirements are as built. **New epilogue readers [needs build]:** `relays_lit`, thread payoffs, `forty_*`, `implant`, `echo/sable`, `noor`, `ashgrove_clean`. Lines are in the Script, §12.
