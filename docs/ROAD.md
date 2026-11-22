# The Warden's Road

The road runs from Cerro to the Threshold as eight legs of fixed stops
(`?classic` plays the generated chart instead) instead of a chart to choose across. The
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

## Continuance Public Service

The regime's broadcasts (`content/script/broadcasts.ts`, [STORY_DIRECTION.md](STORY_DIRECTION.md) §6) are ordinary radio rows from *Continuance Public Service* on the `office` channel: at most one a stop on its first free moment after 25 s, a few more on flags (Brook taken or freed, the ledger, the strike). They are flavour: `stale` drops one that waits 150 s for a quiet sky, so they never hold a stop or a gate, and no breather has one. From the Marches on, Commissioner Aurel Thane (Office of Public Record) speaks for them. `tests/broadcasts.test.ts` holds the rules.

## The Charter

The class line in play ([STORY_DIRECTION.md](STORY_DIRECTION.md) §2). Juno is Bonded. On the road, a Kellern port past the audit dock sells jump fluid at the Bonded rate (`sim/charter.ts`: the posted price × 1.4, rounded up), and the port's fuel line says so ("Bonded rate · posted 2"). `content/script/charter.ts` adds the work lane notice at Northfold's gate, the service berth notices at Halden, Marlow and Yard Nine, the Northfold mother, and Val's forged Charter at Kiln (`charter_offer`: 30 Cyrite, flag `charter_forged`, a day off the hunt). A Custody patrol's check strips a forged Charter (`sim/traffic.ts`: flag `charter_stripped`, heat +0.25). It is never a number; the Civic Score stays removed. `tests/charter.test.ts`.

## The Threshold scene

Wane Rest, the last stop, plays the end as a scene (`content/script/threshold.ts`):

1. Thane's last broadcast.
2. "They gather": the Thren close round the gate.
3. Who came: one line each from the allies the player built (Pike with `thread_line_2`, Hester with `thread_crews_3`, the Long Walk with `job_long_walk_won` or `drift_walked`, the analyst with `thread_survey_2`), the Hollow Saints with `saints_helped`, Val as a rival with `broker`, or "Nobody came".
4. A main notice, "Calloway holds the gate", that holds the gate until the scene has played. Her last card follows at the gate, as before.
5. On the ending screen, Ada's note 8 admits the keys would have worked in any hand, and its button is Juno's answer ("You could have asked me", or "My name is Juno. I chose." if the implant was burned).
6. The choice. Every road epilogue has a `charter` slot: what that future does to the Charter.

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
- **Story places are close.** `StoryPlaceDef.along` is units ahead of the arrival now, not a share of the lane: a skiff or a
  buoy about 650 m out, a ferry or a wreck about 900 m, a pickup just beyond its partner (owner: Ilse's skiff "too far away").
  Never past half the way to the gate.
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
