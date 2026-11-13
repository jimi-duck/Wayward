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
- Every arrival has the same steps: approach, handshake at the relay mast
  (`relay_<gate>`), Ada's note, the answer, the way on. The gate's own card
  comes from `gateCheck` in `sim/journey.ts`.

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
