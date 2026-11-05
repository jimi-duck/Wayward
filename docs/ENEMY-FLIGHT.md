# Enemy flight

Hostile hulls fly on the ship's plane, steer round what is in their way, and
each flies a little differently. This page is the plan and, after it, what
shipped. Code: `src/sim/enemies.ts` (`moveAlien`), `src/sim/world.ts`
(`stepAliens`, `hullVsRock`).

## What was wrong

1. **Other planes.** `PLANE` (#108) kept a hull within about a hand of y = 0
   while it cruised, but it was only a cruise target. Hulls were *spawned* at
   y up to 18 (`sendHostile`, pursuit, events, wings, squads) and the attack
   runs flew at 1.6 to 4 ("swing out high, dive, climb out"). With the chase
   camera tilted that reads as another level, and a hull up there is hidden
   from lasers and mines yet clears every rock.
2. **Blind to rock until it was close.** Rock was dodged by a small sideways
   shove on the velocity (`dodgeRock`), looking about 1.8 s ahead, and
   goal points could sit inside a rock. Heavy hulls clipped rock they could
   have seen, and a hull never *chose* a way round.
3. **Everyone flew the same line.** One approach table, one set of runs: the
   same swing, the same dive, the same side-swap, every pass.

## The rules

- **One plane.** Every hull is held at y = 0 give or take a few tenths
  (`PLANE`), from the moment it spawns. A jink or a roll is a roll of the
  model, not a climb. Only capital ships may arrive from above (they jump in)
  and they are down on the plane before they fight.
- **See it, steer round it.** Each step a hull looks along the way it wants
  to go (a little further for a fast hull) and, if rock, a bulwark or another
  hull is in the corridor, picks the free heading that costs the least
  progress and flies that (context steering: `detour`). It remembers which
  side it chose so it does not dither. A nimble hull clears what a cruiser
  cannot; none can slip a gap narrower than itself (`hullVsRock` still holds
  it out and hurts it at speed).
- **No two the same.** Each hull gets a flight character from its id, with no
  random draws, so seeds and saves do not shift:
  - *weave*: a sideways wobble on the way in and on the run (size, rhythm and
    phase differ per hull; raptors and cruisers hardly weave).
  - *pass*: each attack run is rolled afresh. From the side, from astern
    (chasing), or head-on with a short offset; near or far set-up.
  - *skulk*: some interceptors use a rock as cover as a cruiser uses a
    bulwark: slip behind it, peek out to fire, pull back, and after a few
    peeks make a run.
  - *peel*: a hull with your nose on it may break sideways out of the line of
    fire (not a jink; no roll).
  - *wings*: a wingman holds formation on its leader while they close, then
    breaks off on its own beat, so a pair arrives as a pair and fights as
    two.

## Build order

1. Plane: clamp at spawn, spring to the plane in `moveAlien`, no altitude
   targets in the modes.
2. `detour`: context steering for rock, bulwark, hull; drop `dodgeRock`.
3. Style: weave, pass variety, peel.
4. Skulk cover on rock; wing formation.
5. Tests (`tests/flight.test.ts`): spawn on plane, stay on plane through a
   long run, a hull steers round a rock on its line, a styles spread, rock
   cover works, determinism.
6. `npm run pilot:arcade` before and after; note in `BALANCE-ARCADE.md`.

## Result

`npm run pilot:arcade`, 12 seeded runs per strategy, before and after the flight work (the personalities left it at 10 of 48 reaching the cap again, mean time 7:20 to 8:58):
mean time 7:21 to 8:47 before, 7:37 to 8:10 after; runs that reached the cap
10 of 48 before and 10 of 48 after; refits 13 to 20 against 15 to 21; first
refit 0:50 against 0:56. About neutral, a little harder in the longer runs
(hulls on the plane are easier to hit but also hit more often, and rock no
longer breaks them for free). `BALANCE-ARCADE.md` has the new table.

Other changes that came with it: spawn heights in `world.ts` (`sendHostile`,
pursuit) are 0 now; `dodgeRock` is gone; `tests/enemies.test.ts` holds its two
"above the plane" gunnery tests with a `cross` hull (the one mode that keeps
its height), and the stationary-ship laser test in `tests/world.test.ts` is
made immortal because on-plane hulls now kill a ship that sits still sooner.

## Personalities

Built on the same style (a roll of the id, no draws), hostile hulls only:

- **Raiders flank.** Six in ten Gutter scouts, raptors and hunters come in
  round the beam, and raiders in a run take opposite sides (a pincer).
- **Pickets hold formation.** A picket takes the nearest picket as leader and
  makes its runs on the leader's side and line, a few units apart.
- **Scouts run for help.** Nearly half of scouts break off at 40% hull and
  run; when the runner is out of sight one more scout (sometimes a raptor,
  once unlocked) comes in from its side. Event crews (`extra`) never run, so
  skirmishes still end.

## Not measured

Feel on a real device, and how it reads through the chase camera, is the
owner's to judge. The cloud has software WebGL only. The pilots stand in for a
playtest.
