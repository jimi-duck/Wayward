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

## The whiteout

See the end of this page.

## Tests

`tests/postjump.test.ts`: the level's shape, the objective on the real chain and after a
reload, traffic placement and lifetime, the escalation and its limits.
