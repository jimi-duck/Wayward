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
| A pirate toll | Reach to Drift Deep | `destroy`: break the toll captain and the crew, or only the captain, who holds them together (70% pay) | a jammer slips past |
| A heavy tanker | Marches to Hollows | `strike`: cripple, then hold close to take her. Destroyed outright, the cargo burns (40%) | warn her for supplies |
| Wanted alive | Marches to Hollows | `strike`, but she runs | warn her; the Gutter remembers |
| The last shift | Salvage Belt to Free Ports | `defend`: hold a rig 105 s, raiders in three waves, drawn off or shot. Pay by what is left of the rig | a tractor takes the crew out |
| Run the needle | Drift Deep onward | `race`: six beacons in order against a rival at 78% of the ship's top speed, rock in the gaps | a spoofer drops her out |
| The point of no return | Drift Deep onward | `survey`: three rings round a black hole, the closer the more it pays; the nav goes, the core burns | sell the contract |
| Nothing to declare | Reach to Free Ports | `sneak`: reach the drop between three sweeping patrols, hold still | sell the drop |

## What each one changes

A job that ends leaves a mark on the chart (`after`) and often a flag:

- the pirate toll broken makes supplies cheaper on that lane for twelve days;
  left standing, dearer;
- a tanker taken makes the Office ask questions (Calloway gains half a day);
- a rig held slows the Net round it; lost, Cyrite is dearer for ten days;
- a drop made under a patrol is remembered by the Gutter; a drop read hands the
  patrol the lane;
- the hole measured sets `saw_hole` and `saw_pulse` (the Archive).

## Pay

Written in chits, five to the Cyrite, like every other row, and scaled by how
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

## Not yet

Eighteen of the twenty-five ideas are still to do: Clear the Kill Zone and Be
the Bait (more combat), One Crate No Questions and Keep Your Distance (more
stealth), the chains (Missing Payroll, The Witness, Two Captains One Wreck),
the corporate pair (One Filter Left, Lose the Prefect), the finds (Follow the
Cyrite, Finders Keepers, The Wreck That Remembered) and the Thren work (Someone
Answered, The Voice on the Wire). Each is a row and a card once its goal
exists; most use the six goals as they are. Still to check on a real device: the
rival's pace, the sneak timing and how often a system has a job (`SIT_CHANCE`).

The Hostile column of [BALANCE-SITUATIONS.md](BALANCE-SITUATIONS.md) now includes the foes of missions, which fight from the moment the job is taken.
