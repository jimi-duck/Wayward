# Missions

Optional jobs in a system: the other way to earn besides mining Cyrite and
shooting ships. They make a system different from the last one. A job is
a situation ([SITUATIONS.md](SITUATIONS.md)) whose goal is one of six kinds,
played by `sim/mission.ts`; the rows are in `content/missions.ts`.

## How a job begins

Never from a board. Something in the sky is wrong or on offer: a toll beacon, a
loaded tanker, a rig with its lamps on, a pilot at a start line, a patrol
sweeping a drop, a black hole on the scope. The player flies near, the call
rings, and the card says what is asked. Every card has a way out (a refusal that
costs nothing) and at least one other way to settle it:

| Job | Where | Goal | Another way |
|---|---|---|---|
| A pirate toll | Reach to Drift Deep | `destroy`: break the toll captain and the crew, or only the captain (70% pay); two more Gutter scouts if `gutter_cold` | a jammer slips past |
| A heavy tanker | Marches to Hollows | `strike` for Kellern Recovery: cripple, then hold close. Destroyed outright, the cargo burns (40%) | warn her (125) |
| Wanted alive | Marches to Hollows | `strike` for Kellern, through a Custody broker; she runs | warn her (100) |
| The last shift | Salvage Belt to Free Ports | `defend` a rig 105 s; held sets `rig_held` and cheapens supplies | tow the crew out (70, `rig_lost`) |
| Run the needle | Drift Deep onward | `race` six beacons against a rival | a spoofer drops her out (300) |
| The point of no return | Drift Deep onward | `survey` three rings round a black hole | sell the contract (300) |
| Nothing to declare | Reach to Free Ports | `sneak` hospice medicine past three patrols | sell the drop (175, `gutter_cold`) |
| A kill zone | Belt onward | `destroy` six raiders, three if `crews_stood` | a jammer slips past |
| The missing shift | Marches to Free Ports | `reach` a wreck with nine aboard | tell the Custody (165) |
| Guard the prospector | Belt to Hollows | `follow` a prospector to a vein; scouts come | take her find (120) |
| The wreck that remembered | Belt onward | `watch`: pull a wreck's log slow and close | strip it for parts |
| Listen to the Loop | Marches to Hollows | `survey` two rings inside a patrol loop | sell the loop (235, `route_sold`) |
| Be the bait | Marches to Hollows | `destroy` three Custody pickets | warn the pickets (405) |
| The dead drop | Marches to Hollows | `reach` a package; the trap springs early if `route_sold` | tell the Custody (260) |
| The long walk | Marches to Hollows | `follow` a crippled hauler to the lane | a tractor takes her in |
| Finders keepers | Belt onward | `race` four marks against a rival salvor | a spoofer takes half (300) |
| The Warm Object | Belt onward | `survey` two rings round an uncharted warm object; sets `saw_object`, `thren_curious` | sell the bearing (330) |
| The voice on the wire | Belt onward | `reach` a dead relay that says your ship's name | jam the relay |
| Missing payroll | Marches to Hollows | `strike` a courier with a month of wages | warn the barges |
| One filter left | Marches to Free Ports | `reach` on a ninety-second clock | sell them the parts |
| The witness | Belt onward | `defend` a freighter 80 s | hand her over (275, `witness_sold`) |
| Lose the Governor | Marches to Hollows | `sneak` to a relay; sets `relay_blind` | pay the broker |
| The Drift Cache | Marches to Hollows | `recover` four cases | winch them in (320) |

Seven more are pinned only on the authored road (weight 0, the chart never deals them):

| Job | Stop | Goal | Another way |
|---|---|---|---|
| The lifeboat | Wake | `defend` a lifeboat 60 s from scouts and a raptor; `lifeboat_saved` | hand them to the raiders (`lifeboat_ransomed`) |
| The ransom crew | Scrap Exchange | `strike` the ransom tug; `ransom_ended` | pay the ransom |
| Tarik's bend | Kindmere | `follow` a lane only Tarik drew; `bend_followed` | sell the chart (`bend_sold`) |
| The cradle crew | Cutton | `reach` forty sealed in a cradle; `cradle_freed` | sell them fuel (`cradle_fuel`) |
| The recovery order | Coldvault | `strike` Kellern's tug; `key_taken` | pay what is left of the debt (`account_paid`) |
| Sable's crossing | Palecairn | `follow` Sable home; needs `sable_trust`; `sable_home` | sell her route (`sable_sold`) |
| The ring's centre | Gaunt Watch | `survey` three rings round the relay; `ring_mapped` | sell the map (`ring_sold`) |

Cut in the rework: "Two captains, one wreck" (the recovery order took its stop) and
"Someone answered" (folded into The Warm Object).

## Spine and standalone (job rework v2, 6 November 2026)

Thirty jobs on the road: thirteen form four story threads (the spine), seventeen stand
alone. A spine job counts as a step when it is won and not settled by a dark answer
(`sell`, `tell`, `warn`, `strip`, `rob`; `sim/threads.ts`). Standalone jobs carry no
thread chip but still leave `job_<id>_<answer>` flags, so radio lines and later
stops can answer them.

| Thread | Jobs | What it opens |
|---|---|---|
| The Quiet Line | Nothing to declare, The witness, Lose the Governor | 1, 2, 3 steps: Line radio; 3 opens Broadcast and the Line answer at Tollgate |
| Hester's crews | Pirate toll, Missing shift, Last shift, Kill zone | 2, 3, 4 steps: 3+ for Unite and the strike |
| The survey | The wreck, The voice on the wire, The ring's centre | 3 steps (or `ring_mapped`) for Seal |
| The account | Wanted, The heavy tanker, The recovery order | the debt: the breach bill, 800 CR, less 250 for Wanted, 250 for the tanker and 300 for the recovery order, each when won; stalled = Draper revealed and two steps |

The recovery order's pay answer costs what is left of the debt, flat (300 chits, two
thirds after one step, half after two). Refusing any job stays free. A dark answer
pays about half the stop's win pay.

Echoes: `lifeboat_saved` brings Ma Saffi into the long walk; `lifeboat_ransomed` brings
the boy into the ransom crew; `cradle_freed` or `cradle_fuel` change Marit's lines at
Torchwall. Saves from before this are version 23 and move to 24
(`meta/save.ts`, `reworkJobs`): retired pins ahead are re-pinned to the road's jobs, and
`job_two_captains_*` flags become `job_recovery_order_*`.

## How often, and how you know

Jobs are dealt on a timetable as well as by the roll (`JOB_COLS`, `layJobs` in
`sim/situations.ts`): four columns of the first region (never its first two stops,
the escape and the first refit) and six of every other region (eight in the last)
carry a job in each of their systems, so about two stops in three offer one. Quiet
systems and story beats are left alone, and a column of heavy jobs never runs past
three. The roll adds more. The pilot's count is in
[BALANCE-JOBS.md](BALANCE-JOBS.md) (`npm run pilot:jobs`). A journey saved before
this keeps the jobs it was dealt, but they ring on arrival too.

The call rings on arrival, three seconds into the sortie, wherever the site is:
the desk waits only four seconds (`DESK.arriveCall`), eight since the last card closed
(`DESK.eager`) and three of clear sky after a hostile (`DESK.eagerSettle`), and never drops it
for waiting. A fight, mining or tight flying holds it back (it pauses like any call, and never
rings over the training). On the road the job rings first, as soon as the arrival's scan is done (owner, 7 November 2026): the
stop's story card waits while the job's call is waiting (`World.scriptFree`) and follows it. The road pilot
heard a job a median of 14 s after arrival, nine in ten within 27 s. Where the story is heaviest there is
no job: Halden's Reach (the Warden's record) gave its job to Northfold, and Kessler's Wreck
(Ada's black box) its job to Penny Cross. The job is pinned on the
HUD, the compass and the radar with its name and range, a quiet "On the scope"
line under the objective, and the same line on the pause card. Refusing it, or
taking another answer, clears the pin. If the desk drops the call unheard it
rings again.

## Twists and the quick bonus

A job can turn mid-run: `threat` on its row brings hostiles in so many seconds after the goal is taken, with its own radio line (`say`). The Cyrite vein draws Gutter scouts, the missing shift a raider, the voice on the wire and the wreck's log company, the tanker its escort's reinforcements. A job done inside half its time limit pays a quarter more and the notice says "quick bonus" (`QUICK` in `sim/stage.ts`).

## What each one changes

A job that ends leaves a mark on the chart (`after`) and often a flag:

- the pirate toll broken makes supplies cheaper on that lane for twelve days;
  left standing, dearer;
- a tanker taken makes the Offices ask questions (Calloway gains half a day);
- a rig held slows the Net round it; lost, Cyrite is dearer for ten days;
- a drop made under a patrol is remembered by the Gutter; a drop read hands the
  patrol the lane;
- the hole measured sets `saw_hole` and `saw_pulse` (the Archive).

## Pay

Since 2 November 2026 every row below is paid at 2.5 times (`JOB_PAY`, [ECONOMY.md](ECONOMY.md)); the Cyrite figures after this are the old ones. A job that ends in the sky shows a green "Job complete" notice with the pay, or a gold "Job failed". Holds, waves and limits were cut by about a quarter to a third so a job takes one to two minutes.

Written in the content rows in a small unit, converted at five to the Cyrite (`cy()`), and scaled by how
the job went (`scaleOut`): 70% when the crew scattered, 40% for a spoiled cargo,
the share of the rings reached, the share of the rig left. Between 20 and 45
Cyrite, one to two jumps' worth, against two or three minutes of flying. A
choice that settles the job another way pays far less, or nothing.

A goal pays only when it was taken on. A card answered some other way ends the
scene on that card's own outcome and never on the goal's.

## The six goals

| Kind | The Run does |
|---|---|
| `destroy` | spawns the foes when the call is taken; done when none is left, or the `scatter` ship is down |
| `strike` | a target ward at 2 to 2.6 times a hull; at 30% of its hull it stops; close in slow for four seconds |
| `defend` | a rig ward holds; foes within 95 units chew it; waves come out ahead on a timetable |
| `race` | beacons laid ahead; the rival flies the same course; three-second countdown |
| `survey` | a pull and navigation noise inside 330 units; a reading is 2.2 s inside a ring; the core scorches a plate every 1.6 s |
| `sneak` | patrols orbit the site; time inside a patrol's 62 units builds exposure, a spoofer, ghost echo or baffles slow it; full and the patrols turn |
| `recover` | four cases drift round a wreck field; slow beside each to take it (an ore tractor reaches further and takes less time); a salvage crew comes after the first; time out with some aboard pays for those |

Mission hulls carry `Alien.job` so the sector does not cull them beyond 210
units, and the HUD shows `Stage.status` under the objective line.

## Adding a job

1. A row in `MISSIONS` (`content/missions.ts`): prop, actors (`foe` for hostile
   hulls, `target` for the ship the goal is about), goal, win, lose, ignore,
   `after`.
2. Its card in `MISSION_CARDS`: three answers at most, one that takes the job
   (listed in `accept`), others that settle it another way, a refusal.
3. German twins in `src/i18n/de/missions.ts`.
4. A test in `tests/missions.test.ts` that plays it through.

## Still to check on a device

The rival's pace, the sneak timing, the pay against the economy and how often a
system has a job (`SIT_CHANCE`). One more job, "A sealed crate" (`sc_smugglers`),
is a plain call in `content/situations.ts`.

The Hostile column of [BALANCE-SITUATIONS.md](BALANCE-SITUATIONS.md) includes the foes of missions, which fight from the moment the job is taken.
