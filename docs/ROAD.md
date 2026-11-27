# The Warden's Road

The road runs from Cerro to the Threshold as eight legs of fixed stops
instead of a chart to choose across. The
copy and design are the overhaul's: [overhaul/STORY_BIBLE.md](overhaul/STORY_BIBLE.md),
[overhaul/BEAT_MAP.md](overhaul/BEAT_MAP.md) and
[overhaul/SCRIPT_EN_DE.md](overhaul/SCRIPT_EN_DE.md). This file is how the
code carries it.

## A leg is data

| What | Where |
|---|---|
| The stops, in order: name, kind, holder, port, breather, role, pinned job or scene, script key | `ROAD` (the Reach) and `MARCHES` to `LAST` in `src/content/road.ts`, joined as `LEGS` |
| The gates (script key and what the Course says of each) | `GATES` in `src/content/road.ts` |
| Which regions of a chart are the road's (old road saves kept their generated legs) | `sim/road.ts` |
| The journey on the road (`RegionSet` `'road'`, the Narrows as the gate after the last row) | `sim/journey.ts` |
| The Course screen (three layers) in place of the chart | `ui/chart.ts` |
| A stop's lines: one row a beat | `src/content/script/reach.ts`, `narrows.ts`, `legs.ts`; the gates in `arrivals.ts` |
| Ada's notes 2 to 8, the gate cards, the road's offers | `src/content/legs.ts` |
| The four job threads and the debt | `sim/threads.ts` |
| Counts kept as flags (relays lit, thread steps, the three proofs) | `sim/evidence.ts` |
| The runner: triggers, queue, card hold | `sim/script.ts` |
| Story cards and Wall clues | `content/story.ts`, `content/wall.ts` |
| Job thread chips (`CardDef.thread`) and replies | `content/missions.ts`, `sim/stage.ts`, script rows |
| German twins | `src/i18n/de/reach.ts` and `overhaul.ts`, keyed by the English line |

## Playback rules

- Strictly linear: one gate out of each stop, no sideways lanes. A place that would bend a lane (a gravity well, a Thren lane) pays as a find on the road instead, and a lane that skips a stop (an old save's) is never offered (`sim/journey.ts` `claim`, `onward`).
- The pursuit is counted in days. A leg starts at 2, amber at 1, red at 0.5
  (`sim/hunt.ts`). No pursuit runs at a breather.
- Rows queue and are never dropped (only rows marked `stale` are). Radio and
  notices wait while the player fights or jumps. A card waits for a clear sky
  and holds the queue until answered.
- Rows waiting at a jump are carried (`carry.pending`) and play at the next
  stop's first free moment.
- A row's `wall` flag is set when the row triggers, so jumping early still
  logs the clue.
- The hunch stays non-"straight" until `relay_broadcast` (the handshake at
  the Narrows mast, 2 km out). Then the Course screen's pursuer is Calloway.
- The road's own lines and chips show only with the `on_road` flag, which a
  road journey carries from its first day.
- A `main` row is a beat the stop owes. The Jump Gate holds until it has
  played (`World.gateHeld`), with one amber notice saying why. A beat that
  waits on the relay handshake holds the gate for good; anything else lets go
  after `GATE_HOLD` (90 s, counted down on the HUD from the moment she is within 900 units) and is carried to play first at the next stop.
  The Slow Door also holds for `SLOW_DOOR` (180 s) from arrival.
- A shut gate shows it from any distance (`World.holdOf`, `gateWhy`): the
  ring's strips go a low caution gold and the throat stays dark; the HUD
  sub-line reads "Jump Gate shut · <reason>" (the Slow Door counts down, a key
  just accepted reads "resetting"); a waiting relay makes the mast the
  objective, with its range. The notice still fires once, at the gate.
  Reasons: Ned's yard first, reach the relay mast, the gate is opening, a call
  is coming in. A short tank is the tank bar, as before.
- A stop's job rings first, as soon as the arrival's scan is done, and its main card follows (owner, 7 November 2026); a stop has one main card, a few two.
- A call rings the moment the arrival's hush ends (9 s), and no later: it waits only for a line still on screen, not for notices or radio lines queued behind it, and it rings over mining and tight flying (the world is paused while it is up), never over a fight or the training. Every road scene with a call that is not a major card (Longwater, Davit Dock, Saltquay) rings on arrival too, not when the ship nears its site. Pilot, whole road, 2 seeds, 56 calls: all rang at 9.0 s (before: median 14 s, longest 55 s). A person who fights on arrival waits for the fight to end, by design (13 November 2026).
- The offer's Reward column is read off the win outcome: Cyrite and supplies, then standing, Wanted and story chips in the card's short words, and "Debt −20 CR" on a step of the Account (`sim/jobpay.ts`).
- Every arrival has the same steps: approach, handshake at the relay mast
  (`relay_<gate>`), Ada's note, the answer, the way on. The gate's own card
  comes from `gateCheck` in `sim/journey.ts`.
- **She wakes the relay herself** (plan "Reopen the spaceways", 24 November 2026; `sim/uplink.ts`).
  At every arrival after the Narrows the relay is dark until she sits in its ring (45 units): the
  Warden core charges it over 36 s in three stages, and she may move and fight inside. Leaving pauses
  the charge. Stages 1 and 2 are told ("Relay waking", "Relay dish turning") and each sends a
  Custody wave from the gate side, bigger further down the road (`uplinkWave`). Awake, the stop's
  "Warden key accepted" row plays even in a fight. The first system past Cerro has one too (docs/POSTJUMP.md). The mast lights with the charge, a line runs from
  her keel to it, and the HUD reads "Waking the relay" with the percentage. The Narrows keeps its scene.
- **The Reach's relays** (spaceways plan, step 4; `REACH_RELAYS` in `content/road.ts`). Halden's Reach,
  Tallyhouse, Miners' Gap and Copperline each have a relay by the gate, woken the same way (one wave of two
  patrol fighters at the first stage, the `reach` tier in `content/waves.ts`). The gate holds for it after the
  stop's meeting ("{who} first" comes before "wake the relay"). Ilse points Halden's out once the paper is
  aboard, Brook Tallyhouse's after the spike, Hester's opener Miners' Gap's. Their flags (`relay_<script>`)
  are not GATES', so the lit-relay count in Ada's notes is unchanged. Two twists:
  - **Buried** (Miners' Gap): a spoil rock (a pinned bulwark, `BURIED_R` 10, `BURIED_HP` 150, `Field.bury`)
    sits on the mast. The charge holds until it is mined away; the HUD reads "Mine the relay clear", then a
    "Relay clear" notice.
  - **Guarded** (Copperline): two patrol fighters sit on the mast and move when she comes within
    `GUARD_WAKE` (450 units), with a red "Relay guarded · drive them off the mast". The charge holds while a
    hostile is within `GUARD_HOLD` (65) of the mast; the HUD reads "Drive the guards off the relay".
- **Waves that grow** (spaceways plan, step 5; `content/waves.ts`). Each relay's waves are rows by tier:
  `first` (two patrol fighters a stage), `reach` (two at the first stage), `mid` (gates past the Narrows
  before `LATE_FROM`: two, then a fighter and a lancer) and `late` (three, then two and an enforcer). From
  `mid` the second wave's heavy hull is a **tether hunter**: it closes on the mast (`HUNT_PULL` 16 u/s on top
  of its own flying) and holds the charge while it is within `GUARD_HOLD`; the stage notice says "a tether
  hunter is coming" and the HUD "Drive the hunter off the relay" (it drags the charge, see below).
  - **Damping pulse**: once a wake, once the lamps are lit (a third charged), the relay throws every hostile
    within `PULSE_R` (70) past the mast's hold and snares it 3 s. It goes by itself when a guard or hunter
    sits on the mast, or when two hostiles crowd the ring while she holds the key. No button.
  - **Local cover** (`COVER`): Hester's crews at Miners' Gap (if she broke the toll beacon) and at the
    Breaker (if every crew stood) say so at the first wave, then shoot the nearest hostile within 160 of the
    mast every 2.5 s for 14.
- **The legs' relays** (spaceways plan, step 6; `LEG_RELAYS` in `content/road.ts`), one leg at a time.
  - **The Marches.** Kessel Hold gains a relay with the **given** twist: once the moot stood with her
    (`pact_holdfast`), Oduya's crews wake it, and the charge runs while she holds within `GIVEN_R` (260) of the
    mast; else Oduya tells her to wake it herself. The Rift's relay is **adrift**: the mast tumbles on a slow figure
    of eight (`ADRIFT_LOOP` 110 s, 60 by 30 units, centred 70 back from where it stood, never behind the gate) and
    steadies once awake; "Relay adrift · keep in its ring as it tumbles" when she comes within 450. A woken relay's
    row is told wherever she is (the script's `relay` site).
  - **The Salvage Belt.** Kessler's Wreck gains the Aster's relay (Dov points to it once the wreck is reached).
    The Scrapgate's relay is **split**: three small masts (`SPLIT_MASTS`, 100 to 170 units apart, all on her
    side of the gate), one a stage. Each woken mast sends its wave and the next is marked ("Mast awake · fly
    to the next mast"); the gate opens on the third.
  - A tether hunter now drags the charge to a third (`HUNTED_RATE`) instead of holding it, and the late tier
    starts at the Tollgate (`LATE_FROM` 4): at the Breaker, whose own fight is heavy, a held charge under six
    hulls wrecked the pilot three times running.
  - **The Drift Deep.** Lantern Mile gains a **jammed** relay: bursts of static (5 s in every 14, `JAM_CYCLE`,
    `JAM_QUIET`) crackle down the mast as arcs and hold the charge ("Wait for the static to pass"); it runs
    between them. The Survey analyst points to it. The Slow Door keeps its own three-minute scene.
  - **The Breaker Yards.** Keelberth's relay (Sam calls through it) is **hungry**: its core drinks
    `HUNGRY_FEED` (8) jump fluid over a wake, and starves on a dry tank ("Feed the core: fill the tank"); she
    mines to feed it. The Breaker keeps its own fight.
  - Once any relay is awake, every hull its waves sent breaks off (it flees): a tether hunter left alive used to
    circle the gate's field for ever, and its threat kept the stop's card from opening (a pilot run stuck at the
    Seam).
  - **The Free Ports.** Mirren's Pier's relay is **refused**: it is dark on purpose, hiding the pier. Within 150
    of the mast Old Mirren's card asks (`story_mirren_relay`; the HUD reads "Hear the locals out first" until
    then): *Wake it* (the lane opens, the pier is charted, Guild -1) or *Leave it dark* (6 jump fluid for the
    long way round, Guild +1; no relay to wake and the gate does not wait on it). The Tollgate keeps its
    scene (its relay answers on arrival, inside Calloway's field).
  - **The Hollows.** Hollowforge's relay is **loud**: the Voice warns that it sings as it wakes. Drifting
    below a fifth of her top speed (`LOUD_STILL`), the charge runs quiet at half rate; flying or fighting in
    the ring it runs at full rate, but every 9 s of loud charge (`LOUD_FILL`) draws a knot of three Thren
    motes, at most three a wake ("Thren knot · drawn by the relay's noise"). The HUD says which: "Waking it
    quietly" or "Waking it loud · the Thren hear". The knots break off when the relay wakes. Nothing
    human lives in the Hollows, so a loud relay sends no Custody waves: the Thren are the whole fight.
  - **The Last Lanes.** Lastlight's relay, the last before the Threshold, is a **chorus**: every Warden relay
    she woke on the way (the first system's, the Reach's, the gates' and the legs', `wardenRelays` in
    `sim/evidence.ts`) answers it, and the charge runs 8% faster for each, up to twice as fast
    (`CHORUS_STEP`, `CHORUS_MAX`). Sam says so; the HUD reads "Waking it · your relays answer". It keeps
    the late waves.
  - **The Threshold** (step 7). Wane Rest's gate is the last relay (`l_wane`, twist `threshold`). Calloway's last
    card still opens on the way to the gate; the relay stands between her and the ring, so whatever she
    chose (fight, spool under her guns, or a pass) is played out while the key charges. It sends no Custody
    waves: the Patience is the fight. Everyone who came (`ALLIES` in `content/waves.ts`) flies cover on the
    ring, Sam says so, and their guns fire once per 2.5 s divided by how many came. The gate opens on it
    ("Warden key accepted · the Threshold is open").
  - **The gate opens with the relay** (owner, 25 November 2026). Once a stop's relay is awake its gate waits at most
    10 s (`LIT_HOLD` in `sim/world.ts`, was 90) for a beat still owed, such as Ada's note on the wake; anything not yet
    started is carried to the next stop. The first system's gate opens on the wake itself.
  - **Balance** (step 7). A relay's wave only tops the hostile hulls already on her up to four (`WAVE_CROWD`,
    hunters first): a system already hot (a checkpoint she ran from, a chase) sends fewer. Before this the
    run policy wrecked three times at the Rift, where Ashgrove's lancers and two waves came together; now
    5 of 6 whole-road pilot runs reach the Threshold (all fight and bluff runs, one of two run runs). The
    person pilot takes about 2 h 25 min with reading ([BALANCE-PERSON.md](BALANCE-PERSON.md)).
  The scripted pilot (`tools/pilot.ts`) flies into the ring and sits there, firing on a buried relay's rock.
- **An awake relay opens the lane** (spaceways plan, step 3). The gate's lane is lit: a soft teal beam
  under the flight plane runs from down the course through the ring and away beyond, with motes flowing
  along it (`laneLight`, `laneBeam` in `render/breakout.ts`). The trade comes back: two hulls leave the
  ring at once, then one every 28 s up to three more than the system's own traffic (`Traffic.openLane`,
  `LANE_GAP`), and a hauler captain says so on the radio a few seconds after the key (`LANE_LINES`, one
  per gate in turn). A reload finds the lane open, without the voice. Not at the Narrows.

## Continuance Public Service

The regime's broadcasts (`content/script/broadcasts.ts`, [STORY_DIRECTION.md](STORY_DIRECTION.md) §6) are ordinary radio rows from *Continuance Public Service* on the `office` channel: at most one a stop on its first free moment after 25 s, a few more on flags (Brook taken or freed, the ledger, the strike). They are flavour: `stale` drops one that waits 150 s for a quiet sky, so they never hold a stop or a gate, and no breather has one. From the Marches on, Commissioner Aurel Thane (Office of Public Record) speaks for them. `tests/broadcasts.test.ts` holds the rules.

## The Charter

The class line in play ([STORY_DIRECTION.md](STORY_DIRECTION.md) §2). Juno is Bonded. On the road, a Kellern port past the audit dock sells jump fluid at the Bonded rate (`sim/charter.ts`: the posted price × 1.4, rounded up), and the port's fuel line says so ("Bonded rate · posted 2"). `content/script/charter.ts` adds the work lane notice at Northfold's gate, the service berth notices at Halden, Marlow and Yard Nine, the Northfold mother, and Val's forged Charter at Kiln (`charter_offer`: 30 Cyrite, flag `charter_forged`, a day off the hunt). A Custody patrol's check strips a forged Charter (`sim/traffic.ts`: flag `charter_stripped`, heat +0.25). It is never a number; the Civic Score stays removed. `tests/charter.test.ts`.

## The Threshold scene

Wane Rest, the last stop, plays the end as a scene (`content/script/threshold.ts`):

1. Thane's last broadcast.
2. "They gather": the Thren close round the gate.
3. Who came: one line each from the allies the player built (Pike with `thread_line_2`, Hester with `thread_crews_3`, the Long Walk with `job_long_walk_won` or `drift_walked`, the analyst with `thread_survey_2`), the Hollow Saints with `saints_helped`, Val as a rival with `broker`, or "Nobody came".
4. A main notice, "Calloway holds the gate", that holds the gate until the scene has played. Her last card follows at the gate, as before; while ADA-1 is aboard its archive answer is "Let her hear Ada".
5. The last relay; then ADA-1's last line if she stayed or chose for herself at the Seam.
6. On the ending screen, Ada's note 8 ("Ada's memory 8 of 8") says she asked her tender to look after the family and the keys would have worked in any hand; its button is Juno's answer ("You could have asked me", or "My name is Juno. I chose." if ADA-1 was let rest).
7. The choice. Every road epilogue has a `charter` slot (what that future does to the Charter) and a `core` slot (ADA-1, by the Seam's answer), the line before the close.

## ADA-1 on the road

The ship's Warden core speaks from the first relay on (docs/STORY_DIRECTION.md "ADA-1"). All her lines are rows in
`content/script/core.ts`, in road order: one or two a stop, a memory after a relay wakes (`memory()`, stale after
150 s), and a line after each of Ada's notes. Each gate note's row also sets its Wall record (`rec_closing`,
`rec_turnaway`, `rec_keys`, `rec_ring`, `rec_readings`, `rec_minutes`, `rec_sealed`), and any card with a `herald`
says "Memory restored · <relay>" as a script row opens it. After the Seam her rows check `implant_burned` (`RESTING`).

## The divided resistance

Nobody in the Scatter agrees what freedom is for (`content/script/resistance.ts`, `content/resistance.ts`, [STORY_DIRECTION.md](STORY_DIRECTION.md) §8). Three scenes carry the argument:

- **The moot at Kessel Hold.** Hester (crews together), Oduya (each Holdfast governs itself), Pike (the Line keeps out of councils) and Val (call me when one of you wins) speak in turn before Oduya's card, which waits for them.
- **The Saints at Tamsin Field.** Sister Vera Hask's Hollow Saints blow Custody's relay, which Bonded conscripts man. `saints_relay` (a main card): help (`saints_helped`, hunt +1, the conscripts die), warn the crew (`saints_stopped`, two raptors come for Juno) or walk away (`saints_ignored`). Thane's broadcast calls it terror either way, unless she stopped it.
- **The strike vote at Torchwall.** Marit opens; Hester (seize), the Saints (wreck) and Oduya (bargain) speak if Juno has worked with them. Marit's card then offers "Seize the yard" (`strike_seized`) or "Bargain for passes" (`strike_passes`); both count as `crews_stood`.

The Unite ending is a confederation with no governor, and it remembers the Saints' dead. `tests/resistance.test.ts`.

## The rising Thren

Mining draws them ([STORY_DIRECTION.md](STORY_DIRECTION.md) §3), and each leg meets them a little closer: the Slow Door (motes on the gate), Low Harrow (folklore, a scored hull), Saltmarsh (a river of motes), Stillwater, Cradle Gap (a breaker holding a knot), Lucky Haven (people who live with them), Hollowforge and Ghostcinder, then the Threshold.

- **Gunfire draws more.** A shot with a Thren hull within `THREN_JAM` brings the next knot within `SWARM_DRAWN` (12 s; `sim/world.ts gunfireDraws`) and sets `thren_drawn` and `thren_drawn_<stop>`. The first time, a notice says "They answer".
- **Stillwater** (`thren_still`, a main card from Hester): vent ten of Juno's Cyrite (`still_vented`), vent the rig's hold so Kellern docks forty contracts (`still_rig_vented`), or fight six motes and a web layer (`still_fought`). Venting holds the swarm off for 120 s.
- **Ghostcinder** asks for a crossing with no fighting: the sub-line says "Hold your fire", and if she manages it Sable notices.

`tests/thren.test.ts`. No boss fight, and they are never translated.

## Thane's hearing

At Gilt Market, Commissioner Aurel Thane hears Juno's file (`content/hearing.ts`, a main card). Her own evidence is "not admissible": Bonded testimony never is. The answers are the Chartered voices she has. Brook (shown with `brook_free`) testifies and loses his Charter (`brook_struck`, and the Broadcast ending remembers). Lucan's signature (shown with `clue_order_sig`) is entered and sealed (`hearing_sealed`). Or she walks out, and Thane rules the file a forgery (`hearing_forgery`). The Office's broadcasts answer each one. `tests/hearing.test.ts`.

Continuity: Hester's opener now plays as Juno arrives at Miners' Gap, her crews' lane, and the archive's last line points at Halden's Warden families, not at relays.

## The Reach, five stops (22 November 2026)

The living-world plan (owner, 21 November 2026: too much distance and fluff) cuts each leg's filler. The Reach is the first: Hollis
(work) and Vesta (breather) are gone, and two names now say what the stop is. Marlow, Kellern's accounts station, is Tallyhouse;
Branford, the Gutter-tolled lane Hester's crews haul through, is Miners' Gap. Script keys stay (`marlow`, `branford`).

| Stop | What it is now |
|---|---|
| Northfold | The quiet lane, and the ghost: it comes after 8 s of quiet sky and closes 25 s later (was Hollis, on the tank) |
| Halden's Reach | Ilse and the order, as before |
| Tallyhouse | Brook and the books; Ilse's message buoy waits here if she never heard the order (was Vesta) |
| Miners' Gap | Hester's opener on arrival, then her toll job (`follow_cyrite`, the prospector, is no longer on the road) |
| Copperline | Brook's transport is a chase: "Run it down" sends a Custody transport and two escorts for the Jump Gate (`brook_transport` in `content/situations.ts`, the stop's scene, whose call is the story card). Crippled and towed, Brook is free; sunk or through the gate, he is taken. `tests/brookrun.test.ts` |

A road save made inside the old Reach comes back on the new one (save v25, `shortReach` in `meta/save.ts`): where it stood, or at the
stop before a cut one. One past the Narrows keeps its chart. `tests/shortreach.test.ts`.

## Fixed names, close places, Juno's log (22 November 2026)

- **Every system on the road has a fixed name.** The audit dock's system was the one stop the chart named from the seed, so the
  map and the story disagreed from the first jump (owner, 22 November 2026). It is **Ringhold** now. A v25 road save keeps its
  dealt name until it loads, then takes Ringhold (save v26, `nameAudit` in `meta/save.ts`). `tests/roadnames.test.ts`.
- **The story comes to her** (23 November 2026, replaces "story places are close"). A skiff or ferry flies out to meet her and
  keeps pace alongside; what it hands over flies across; a wreck, buoy or set piece stands on her line to the gate, a third of the way
  (`sim/places.ts`). The owner had seen a place 19.6 km away with the gate at 6 km, "out of the direction of the game".
- **The gates are close too.** A road stop's Jump Gate stands 5.5 to 6.5 km from the arrival (`ROAD_LANE` in `sim/chart.ts`,
  was 9 to 28 km; save v29 moves an old road save's gates in). The owner saw "25 km" after the jump in: that was the gate, and
  the HUD set the gate's range beside story lines that were not about the gate. The objective shows a range only when it is
  the way out now. "Leave" fires within 0.45 of the lane and the gate hold's clock within 0.6 (`leaveR`, `HOLD_NEAR`), and
  the road has no lane toll. `tests/distances.test.ts`.
- **The places are built like ships** (`render/places.ts`): plated octagonal bodies from `render/parts.ts`, glazed noses, lit
  ports, docking collars on the side she comes alongside, drives, tanks, a dish; the wreck's stern knocked askew with ribs bare
  in the gap; the buoy a turned float with a lattice mast and solar wings. About twice their old size.
- **Juno's log.** A jump's title card carries one line of hers under the system's name (`content/log.ts`, German in
  `i18n/de/log.ts`), 13 words at most, on the road only. On phones it sits above the name. `tests/log.test.ts`.

## The Marches, six stops (22 November 2026)

Low Harrow, the Marches' breather, is cut. What it held now plays at the Long Walk, after Ma Saffi: the scored Drift hull, Wren's
rule about full tanks, and Hester's call for the missing shift at Gannet. Wake's way-out line counts six jumps to the Rift. A road save not yet past the Marches gets the new chart on
load (save v27, `shortMarches` in `meta/save.ts`, on the same `shortLeg` as v25): at Low Harrow it comes back at the Long Walk.
`tests/roadnames.test.ts`.

Four Thren breathers are cut too, each folded into the stop before it: Saltmarsh into Kessler's Wreck (the river of motes, and
its scene `thren_swarm`), Cradle Gap into Keelberth (the breaker that still holds something), Lucky Haven into Mirren's Pier (Thren
glass and the dock children) and Mute Hall into Palecairn (Sable's line and Calloway's echo; its scene `thren_watch` is off the road).
Each of those legs counts six jumps from its landfall. Hushlight and Lone Step stay: each carries a main beat. Save v28
(`shortBreathers`) moves a road save not yet past the Hollows onto the new chart. The road is 58 systems from Ringhold to the
Threshold (was 64).

On the road a stop has one card at most, its own: the port's approach card and the chance cards are off (`sim/world.ts`). Jobs,
scenes and story cards still come as before.

## The Belt chase

Val's route trade sells Juno's heading to the Offices (`sim/journey.ts beltChased`). At Kiln and Tarik's Lamps, the first pursuit comes 20 s after arrival and again 6 s after each calm. Heat starts at 0.3, and most of the pursuit is Offices pickets from ahead. A red notice says so on arrival. The chase ends at the Scrapgate's pickets (`scrapgate_pickets`). Paying Val to forget (`vell_paid`) or jamming her channel (`vell_exposed`) at Tarik's Lamps shakes it, and the Scrapgate is then clear.

Cut for room (story direction plan): the Survey's black-hole job at Ashdeep (an analyst's reading plays there instead), Val's reckoning at Gilt Market (her story ends at the Scrapgate), and Calloway's question at Cutton (her best scene is the Tollgate). The cards stay in the code, unplayed.

## A chase on every leg

Since 16 November 2026 (owner: a chase on every leg, at a fixed stop that is never a breather) each leg has one hunted stop, listed in `LEG_CHASES` in `content/road.ts`: Branford, Gannet Rigs, Kiln and Tarik's Lamps, Stillwater, Torch Yard, Penny Cross (not Gilt Market, whose job is a sneak past a patrol), the Forge (Ghostcinder is a no-fire crossing, so the Hollows chase sits one stop on) and Dusk Lanes. A chased stop sets its own first pursuit, calm, heat and hulls from ahead (`sim/journey.ts chaseAt`), and its named captain stands down so the two never stack. A red arrival notice names who hunts her (`content/script/chase.ts`). Only the Belt chase can be shaken (`shaken` flags).

## Under fire (17 November 2026)

The owner found Story a breeze, so the run bites harder (plan: "Make the run bite"). Story hulls lead their shots and fire a fifth oftener (`director.ts STORY_EDGE`). On a hunted stop the drive spools 1.8 times longer (`SPOOL_HUNTED`), and any hit while it spools knocks 1.5 s off (`SPOOL_KNOCK`; the HUD says "break contact"). The next arrival's title card says what she got away from (`journey.ts ESCAPED_LINES`). Ten jobs that had no twist got one, a job's clock is 0.85 of its row (`stage.ts JOB_LIMIT`), and twists and defence waves bring up to two more hulls deeper down the road (`mission.ts depthExtra`). A hit on the ship also takes 2 s off whatever a job is holding: a drop, a reading, a watch, a tow or a follow (`mission.ts HOLD_KNOCK`).

## Echoes

`content/script/echoes.ts` holds short radio lines that answer earlier choices (Calloway named or asked, the Saints ignored, the witness saved, the Gannet crew, Ines refused, Brook freed, Oduya's name, Oren's heir or pilot), and fills the thin stops: Longwater's drift lamps, Ghostcinder's dead foundry, the Mute Hall and Lastlight. Each is a radio row with `stale: 150`, so a busy stop drops it rather than queue it late.

## The menu's Previously line

On a road journey the menu's resume lines read Current journey, Previously (the stop she is at and its purpose) and Next stop with its purpose (`main.ts paintJourney`, from `courseView`). Short phones hide the region line, which the chapter recap already names, and keep each value on one line.

## The pause card's brief

The pause card's Objective gives a little more than the HUD (18 November 2026). Each stop's `brief` in `content/road.ts`, and each gate's in `GATES`, is one or two short sentences (30 words at most) on who, why and what is at stake. It does not repeat the goal, Here, Next or Behind you. Without one the card shows the stop's `purpose`. Phones show its first sentence only. The German twins are in `src/i18n/de/briefs.ts`; `tests/briefs.test.ts` checks every stop and gate has one. A brief states the stop, not the player's choices so far, so it reads the same whichever way she played.

## Story jumps follow the chart

The first jump out of the audit dock's system (Ringhold) goes to Northfold, the quiet lane; Halden's Reach is the one after. The archive's answer reads "Set course: Northfold" (the letter still says to start at Halden's Reach, which is the lead), and the first system's way-out line is "Jump to Northfold · then Halden's Reach". From there every stop's "Next:" and "Jump to" line names the system the chart's one lane leads to. `tests/storyjumps.test.ts` walks the whole road on three seeds and checks each of them, the Course's next stop and the plotted lane.

## Add a stop

1. Add a row to its leg (`ROAD`, `MARCHES` … `LAST`) with a `script` key.
2. Add rows in `content/script/` with `stop` set to that key (or `*`).
3. Give it a `purpose` and a `brief` (twins in `src/i18n/de/course.ts` and `briefs.ts`). Every English line needs a twin in `src/i18n/de/overhaul.ts`. Comms lines
   stay at 15 words or fewer.
4. A new card goes in `content/story.ts` with its Wall clue in `wall.ts`.
5. `tests/reach.test.ts` and `tests/overhaul.test.ts` check every row has a stop and a real card.

## Threads and proofs

- Quiet Line, Hester's crews, the Survey and the Account. A step counts when
  its job was won, not settled aside (sold, told, warned, stripped). Hester's
  count loses 1 for the Heavy Tanker and 2 for the Stolen Payroll. The debt is
  60 CR less 20 a step of the Account.
- `derive` rebuilds `relays_<n>` and `thread_<id>_<n>` every step, so the
  flags never drift from the jobs. It also sets, once, the three proofs the
  Tollgate's signature needs, each by either route: `sig_paid` (the Reach
  clue or the closing order), `sig_built` (the Yards clue or the BY9-001
  serial seen with Sam's scarred hulls), `sig_room` (the free ports' clue,
  Mirren's list, or Ada's room heard at the Tollgate relay).
- On the road the six endings read their `road` epilogue: an opener, at most
  one line each of thread, person and cost, Oren's answer, the close. Ada's
  eighth note comes before the choice.

## The Narrows and the ghost

The Narrows is a `gate`-kind system with script key `narrows`, played as one
scene (owner, 13 November 2026; `sim/narrows.ts`, run by `World.stepNarrows`):

1. **Locked.** Custody has locked the Jump Gate (Ashgrove says so on the
   radio); the objective is Ada's relay (`RELAY_OFF` in `sim/breakout.ts`).
   There is no checkpoint card here: Ashgrove's first card is at the Rift.
2. **The key.** At the mast, "Warden key accepted" and Ada's first note.
3. **Gate down.** As the note closes the gate reboots under her key for
   `REBOOT` (90 s): the ring is dark, its damping field is off
   (`World.fieldDown`: no safe ring, hostile hulls come in), and the Kind
   Regard and two pickets come for her. The HUD counts it down.
4. **The Patience.** 25 s in, Calloway's card: their first meeting
   (owner, 14 November 2026). She asks who Juno is; Juno can give her
   name, ask what she wants with Ada, or cut the channel. Nothing is
   bargained and the fight plays out whatever she answers: Calloway tells
   Ashgrove to carry on and watches. Killing one of Ashgrove's hulls here
   sets `ashgrove_crossed`. Her arc after this is in
   [STORY_DIRECTION.md](STORY_DIRECTION.md) §9.
5. **The way out.** The gate opens (`narrows_gate_open`), Sam signs off.

Script rows marked `urgent` play during the fight. `npm run pilot:narrows`
flies the scene alone on a starter fit (8 seeds a policy, 13 November 2026):
through 6, 7 and 7 of 8 by the fight, bluff and run policies, about 5 to 6
minutes, against 7 of 8 for each on the old scene with the same fit. Pilot
numbers, not playtests. The ghost at Northfold (`sim/ghost.ts`) is a
passive contact outside `aliens`: it holds, matches speed, and is never
explained.

## Balance

`npm run pilot:road` flies Cerro to the Narrows and writes
[BALANCE-ROAD.md](BALANCE-ROAD.md). `npm run pilot:overhaul` flies the whole
road to the Threshold and checks no main beat is dropped and no row plays
twice ([BALANCE-OVERHAUL.md](BALANCE-OVERHAUL.md)). That pilot does not read or linger, so it
shows the shape, not the pacing. `npm run pilot:person` flies the road more like a
person ([BALANCE-PERSON.md](BALANCE-PERSON.md)): it takes every job and flies its goal, mines a
while before each gate, and is charged for reading the cards. `PERSON_LOG=path` adds a line a
stop (cards offered, job results). The target is a road of 4 to 5 hours (owner, 16 November 2026);
the person pilot makes it 3 h 25 min to 3 h 55 min with every chase and echo in, so nothing was cut.
It still needs human playtests.

## The first two systems, and a wreck

- The audit dock's system and Northfold are safe (`SortieDef.safe`): no
  raiders from ahead, no chance fights, no crew hails. Only lingering draws
  the police: the first pursuer comes after 150 s, and the heat rises slowly.
- A wreck on the road leaves Juno in the same system, set going again with the
  gate a little off her heading (`SortieDef.off`). No chart, no tow.

## The Long Walk, an escort (22 November 2026)

The Marches' set piece (living-world plan). Five Drift hulls wait about 1 km ahead on arrival, beside Ma Saffi's ship. Her card is the
stop's one card; its one answer, "Take them, walk with us", files the manifests and starts the scene `drift_walk`
(`content/situations.ts`): an `escort` goal (`sim/mission.ts`). The fleet walks to the Jump Gate and waits when she is more than
190 units behind; two waves of Kellern pickets (12 s and 42 s) chew any hull they get near; the HUD reads "Hulls n of 5". After
75 s the Drift make the lane: pay by hulls left, `drift_walked`, and `drift_walk_whole` or `drift_walk_cost` (Wren's line). Every
hull lost is `drift_scattered`. Hester's Gannet call follows the walk. The Drift come to the Threshold for `drift_walked` too. Drift
hulls are civilians on the target card (`Alien.civil`). A pilot that only keeps up loses about two hulls. `tests/driftwalk.test.ts`.


## Kiln, a silent run (22 November 2026)

The Belt's set piece (living-world plan). Val sold her heading, so at Kiln four Custody pickets hold a line across the lane, 45% of
the way to the gate (`LEG_CHASES.b_kiln.cordon`, `sim/cordon.ts`). Each sways on its post and sweeps a ring 60 units round it
(less in cover), drawn red on the plane. Inside a sweep with the drive lit, exposure climbs fast; drifting, slowly; outside it falls.
The HUD's first line reads the cordon and the exposure. Full exposure, or a shot at a picket, and the cordon is made
(`cordon_made`): the pickets turn and the leg's chase starts. Past the line unseen she is through (`cordon_cold`), and no chase comes
at Kiln. Paying Val off or jamming her (`vell_paid`, `vell_exposed`) lifts the cordon with the chase. `tests/cordon.test.ts`.

## Stillwater, speaking to a knot (22 November 2026)

The Deep's set piece (living-world plan). Hester's Thren card keeps three answers: vent your Cyrite, fight, and now "Answer the
pattern" (`still_speak`), which takes the place of venting the rig's hold. A knot of six motes comes in 110 units ahead
(`sim/speak.ts`, `World.knot`) and moves in a shape: still, a slow wheel, still. She answers in kind, beside it: three seconds
still within 75 units, one full loop round it (between 28 and 130 units out), three seconds still again. The HUD's first line
names the step. Answered, the knot leaves (`still_spoken`, the Thren calm for 120 s, miners +1) and Hester says it copied her. A
shot at a mote, or 150 s, and it comes on (`still_fought`). `tests/speak.test.ts`.

## Yard Nine, the breaker line (22 November 2026)

The Yards' set piece (living-world plan). After Anand's work-order card, Ben radios that security is purging the archive down the
chute (`yn_spill`). Four work-order canisters spill along the lane, one shown at a time (`yn_order1` to `yn_order4`, story places
with `trail`, so they may sit up to 400 units out). Taking the first aboard brings yard security: a red notice and the new
`{ chase: true }` script output, which lifts the heat to at least 0.4 and calls the leg's pursuit within 3 s. Each canister after
that is a teal "Work order aboard" notice; the fourth is Ben's line and the wall entry `orders_all`.

## Gilt Market, the Registry launch (22 November 2026)

The Free Ports' set piece (living-world plan). Thane's hearing card keeps its three answers. "Brook speaks for it" and "Enter
Lucan's signature" now also set `hearing_launch`: the Office sends a Chartered launch to carry the witness in, and Custody strings
a scan cordon of three pickets across the approach (`sim/cordon.ts` with `escort`, made by `World` at `f_gilt`). The launch walks
through the line and waits for her when she falls more than 150 units behind. Within 40 units of it she is in its shadow (a steel
blue ring on the plane): a sweep reads the launch, not her. Alone in a sweep, the exposure climbs as at Kiln. Through cold
(`hearing_cold`), nobody comes; seen (`hearing_made`), the pickets turn and the chase begins. Either way the launch goes on and
`hearing_in` plays Thane's ruling. "Walk out" is unchanged. `tests/registry.test.ts`.

## The Threshold, everyone she helped (22 November 2026)

The last leg's set piece (living-world plan). At Wane Rest each ally's "who came" line now brings their hulls too
(`sim/gathering.ts`, rows in `content/script/threshold.ts` `GATHERING`): Pike's Quiet Line (3 liners), Hester's rigs (3 barges),
the Long Walk (4 haulers, from the job or the Drift she walked), the Survey analyst (1), the Hollow Saints (2) and Val (1). They
come in down the lane and take places in two lines either side of it, 470 units and more short of the gate, outside Calloway's
checkpoint, so she flies the last stretch to Calloway between them. Civilian, meek, never armed. Oren's three lights were already
places. `tests/gathering.test.ts`.

## Every stop readable: the Reach (22 November 2026)

The owner found the Reach confusing: a far gate read as a story place, lines too quick, no clear target. The plan
("WAYWARD: Make every stop readable") gives each stop five beats: setup in the jump's Course (the stop's brief names the
person), an arrival that looks at the place (`render/camera.ts` `aim`, 2 s), one voice first, one target (the lead's
beacon, `render/lead.ts`), the act, then the payoff and one exit line. Sam speaks once a stop.

- **Northfold**: Sam once, on the ghost ("Ghost on the scope. Old relays throw them. Probably.").
- **Halden's Reach**: Ilse hails on arrival and talks Juno in near the skiff; the order; the paper; Sam's one line points at
  Tallyhouse.
- **Tallyhouse**: Adam Brook hails from his shuttle ("Brook's shuttle"); the books; the Wall; Sam's one line on L. C.
- **Miners' Gap**: one arrival notice (the Net's notice is gone; Sam says it); Hester, then Sam.
- **Copperline**: Sam's one line carries the Narrows warning ("My signal dies there"); then Brook's transport.

Not playtested; the owner plays the Reach before the other legs change.

### Every leg, measured (23 November 2026)

`tests/readable.test.ts` flies every road stop at cruise toward what the HUD leads to. Two fixes came from it:

- A gate that waits on a call only waiting its turn says so on its HUD line; its "Jump Gate holding" notice comes only if
  she has waited 20 s near it (`world.ts` CALL_QUIET). Before, seven place-less stops said "holding" then "open" round a
  card that came 5 s later, and the notice itself held the card back. The test allows the notice only at scene stops
  (the Narrows, Kessel Hold, the Rift, the Slow Door, the Breaker, Gilt Market, the Seam, Wane Rest).
- Tamsin Field: the debt clause at 10 s, the Saints' plea at 20 s (were 30 s and 40 s, so the plea opened at the gate).

The objective's marker is a small navigation lamp now, not a shaft (owner, 23 November 2026: "too prominent"): a soft
point a little above the place, the same size on screen at any range, blinking slowly like a buoy; a faint ring opens on
the plane round it now and then between 300 m and 2.2 km. It steps back in a fight, in a lesson and once she is there.

### One-of-a-kind places (23 November 2026)

Five stops told their story while she flew to the gate. Each now has a place of its own, built once and seen nowhere else
(owner: "distinctive, unique and interesting to look at, rather than the same repeated elements"), and its card opens there
(`content/script/places.ts`, looks in `render/places.ts`, bench `tools/places.html?look=…`):

- **Kessel Hold**: the moot. The holdings' rigs, no two alike, moored nose-in round their hall, work lamps strung on the booms.
  Hold among them; Oduya, Pike and Val speak, then the moot asks for the file.
- **Tamsin Field**: Custody's relay, a long truss with three dishes and the conscripts' pod; the Saints' charges blink along
  it. Fly by, and the Saints ask.
- **Torchwall**: the crews' picket, tugs nose to tail across the crossing, cables and lamps slung between, boards hung on
  them. Hold at the line; Marit asks for the lead.
- **Ninehaven**: an old relay ring broken open, aerials splayed, a pale light running round what is left as it speaks. Fly by.
- **Hollowforge**: the pattern on the scope, Thren shards hung in a slow turning spiral. Fly by.

A new act, `pass`, is done as she comes inside the ring at any speed: a set piece is flown by, not parked at. A card earned
at a place still waits for the scene's queued voices (`world.nowCard`), so the moot speaks before it asks.
