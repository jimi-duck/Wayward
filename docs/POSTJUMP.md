# The first system past Cerro

The level the first jump lands in. It is not Cerro (see [ONBOARDING.md](ONBOARDING.md))
and not a later system: it is `sortieDef(j)` with `j.trail.length === 2`, laid over by
`postJump()` in `src/sim/postjump.ts`. The chart keeps its row (name, holder, lane
onward, and whatever it deals of a place, a situation, a blockade or a hunt). The level
adds its own shape.

## What is there

- **A worked-out industrial system.** A scrap expanse with a gantry works, a breaker
  field, a graveyard of hulls, a thin Cyrite seam and a far passage
  (`POSTJUMP_SKY`). Rock density 0.6 of the chart's, veined rock 0.1, heat rate 0.7, the
  first pursuit no sooner than 150 s (`WORKED`). The Jump Gate is a straight 2,400 units
  (about a minute flat out).
- **Worlds in the sky.** A near ringed giant with a moon, a small rock world and a cold ice
  world at three sizes and distances (`industrial()` in `render/sky.ts`; the sphere
  radii are 1,500, 2,300 and 2,700). They stand either side of the course.
- **Kellern Audit Dock** (0.3 of the way, 300 units to starboard): the company's yard
  where the ship is to be returned. A scanning arch, an office block, a mast. A mark to
  fly to, never a berth (`AUDIT_R`).
- **Frontier Supply Depot** (0.8 of the way, 190 units to port): the optional stop on the
  way to the gate. The existing port: top-up, supplies, plating, the refit bay, the same
  prices and damping field. It is off the line and the gate never depends on it.
- **Traffic** (`src/sim/traffic.ts`): nine hulls on seven routes: freight across the
  course, a shuttle between dock and depot, in and out of the gate, a circuit round the
  seam, far fast liners. Ore haulers, mining barges, freight liners. Different speeds
  (pace 0.8 to 2.8 of a hauler's cruise) and distances. They are wards, `meek`, never
  armed, outside the director's count; none starts within 140 units of the ship or
  inside a ring, and routes miss the start, the gate and both docks.
- **No anomalies** (owner, 23 October 2026; `calm` on the sortie). No ion storm, nebula
  or gravity well, as a chance event or as the system's place (`calmWeights`), and the
  sky's features keep their rock and their look but do nothing to sensors, locks or
  flight, so no "anomaly" report. Other events (a distress call, a derelict) still come.

## The objective follows one flag

`ship_stolen` is set by Sam's code (the `story_sam` card). Until it is, the course is
the audit dock; after, the Jump Gate. Nothing else holds state: `guideTarget`,
`goal.ts`, the HUD's objective, the edge pointers and the arrival note all read
`lockLifted(world.flags)`. The flag is banked with the card, so a save, reload or
restart of the sortie lands on the right objective. The registry card, its order and
the story timing are untouched: the chain starts two seconds in and Sam's code comes after the breach
notice, as before. The audit dock stays on the scope as a place after the code (nothing
leads to it), and the depot stays on the strip throughout.

## When you fire on the traffic

1. A first hit: the hull runs, the ones within 170 units scatter, "Dock control" warns
   over the radio (once in 12 s). Nobody is sent.
2. A second hit inside 60 s, or a kill: "Dock security" calls, and 3.5 s later two
   Patrol fighters (three after a second kill) come out of the nearer dock's side of
   the sky. Never nearer than 130 units, never beyond 180 (the sky's cull). They use the
   existing AI and combat, and give up after 70 s.
3. One dispatch every 45 s, at most four guards alive, nothing system-wide.

The target card reads working traffic as "Civilian · Not hostile" with no bounty.

## Tests

`tests/postjump.test.ts`: the level's shape, the objective on the real chain and after a
reload, traffic placement and lifetime, the escalation and its limits.

## The whiteout: one mechanism found, the report not confirmed

The report: in the first level the screen goes almost entirely white. Nothing in this
change claims to fix it. What was done, in headless Chromium on SwiftShader (software
WebGL, so no GPU path and no real frame times), with this change in, at 1280x720,
960x540 and 568x320. "White" is the share of pixels above 0.85 luma, "mean" the mean
luma of the frame.

**Flown for real** (real-time loop, keyboard thrust, every frame screenshotted, from 160
units out of Cerro's gate through the jump and 45 frames into the next system):

| Frames | Mean luma / white | What it is |
|---|---|---|
| Approach | 0.10 to 0.35 / 0.6 to 1.7 % | the gate's light as the ring fills the view |
| Crossing the ring | 0.77 / 32 %, one frame | the ring blazes (`fx.flash`, 0.5 s); by design |
| Through the tube | 0.08 to 0.25 / under 2 % | |
| End of the jump | 0.70 / 6 %, then the veil | the pale teal screen (`#warp`) rises to 1; by design |
| **First frame of the next system** | **0.86 / 53 %** | **the veil, still at full opacity, until the new level has drawn once** |
| Every later frame, through Sam's code, the rename and the archive card | 0.10 to 0.12 / 0.6 % | normal |

The one near-white frame outside the jump is the last: with no chart after the first
jump (the app goes straight to the next system), the veil is not lifted off a chart, it
stays up until the new level's first frame replaces it. At 60 fps that is one frame. On
a phone the first draw of a new system is the longest hitch in the game (the world is
built, the sky is baked, shaders and meshes are first drawn), and the page would sit
pale teal for as long as that takes. That fits "the screen goes almost entirely white",
but it is a reading of the trace, not something seen on a device, and it is not changed
here: a fix would either dim the veil or cover the load with something else, and both
are design calls for the hitch work ("Entering system" in `docs/PERF.md`).

Also run, no whiteout: the level at four headings before and after the yellow repaint
(`ship_stolen`): mean 0.08 to 0.15, white at most 2 %; the audit dock, depot and gate:
mean 0.06 to 0.08; three cruisers destroyed 8 to 14 units from the camera: 0.46 mean /
19 % white for about 0.3 s, the explosion as drawn.

Read in code and ruled out: `setLivery` (tints once per change, never accumulates), the
hit vignette (red), the story and registry cards (no flash), and a new sortie
inheriting jump state (`tests/postjump.test.ts` pins that `run.escaped` and `bk.jumpT`
are clear after a jump, so the veil cannot be held by the next level).

**To check on a device**: fly out of Cerro and, from the end of the jump, time how long
the pale teal screen holds before the next system draws, and whether the HUD is covered
(a veil covers it; a bloom fault would be white with the HUD intact). Then take the
audit dock, the depot and the Jump Gate in turn and idle ten seconds at each, and
repeat once after the registry card (the yellow hull). Note the device, the quality tier
(the `?debug=1` overlay shows it) and the time. Not checked, for lack of a GPU: bloom on
real half-float targets (a NaN or Inf in an HDR buffer would turn a frame white on some
mobile GPUs) and the quality governor's lower tiers. `?dev` and the review world's
"Places & fire" stop look at the gate and the port without a journey.
