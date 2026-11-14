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

- Strictly linear: one gate out of each stop, no sideways lanes.
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
  after `GATE_HOLD` (240 s) and is carried to play first at the next stop.
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
3. Who came: one line each from the allies the player built (Pike with `thread_line_2`, Hester with `thread_crews_3`, the Long Walk with `job_long_walk_won`, the analyst with `thread_survey_2`), the Hollow Saints with `saints_helped`, Val as a rival with `broker`, or "Nobody came".
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

## Add a stop

1. Add a row to its leg (`ROAD`, `MARCHES` … `LAST`) with a `script` key.
2. Add rows in `content/script/` with `stop` set to that key (or `*`).
3. Every English line needs a twin in `src/i18n/de/overhaul.ts`. Comms lines
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
4. **The Patience.** 25 s in, Calloway's card. The truth, or a lie she
   believes, calls the pickets off (`patience_hold`); a lie caught brings
   two more; cutting the channel leaves them on her. Killing one of
   Ashgrove's hulls here sets `ashgrove_crossed`.
5. **The way out.** The gate opens (`narrows_gate_open`), Sam signs off.

Script rows marked `urgent` play during the fight. `npm run pilot:narrows`
flies the scene alone on a starter fit (8 seeds a policy, 13 November 2026):
through 6, 7 and 7 of 8 by the fight, bluff and run policies, about 5 to 6
minutes, against 7 of 8 for each on the old scene with the same fit. Pilot
numbers, not playtests. The ghost at Hollis (`sim/ghost.ts`) is a
passive contact outside `aliens`: it holds, matches speed, and is never
explained.

## Balance

`npm run pilot:road` flies Cerro to the Narrows and writes
[BALANCE-ROAD.md](BALANCE-ROAD.md). `npm run pilot:overhaul` flies the whole
road to the Threshold and checks no main beat is dropped and no row plays
twice ([BALANCE-OVERHAUL.md](BALANCE-OVERHAUL.md)). The pilot does not read or linger, so it
shows the shape, not the pacing. The 40-minute target needs human playtests.

## The first two systems, and a wreck

- The audit dock's system and Northfold are safe (`SortieDef.safe`): no
  raiders from ahead, no chance fights, no crew hails. Only lingering draws
  the police: the first pursuer comes after 150 s, and the heat rises slowly.
- A wreck on the road leaves Juno in the same system, set going again with the
  gate a little off her heading (`SortieDef.off`). No chart, no tow.
