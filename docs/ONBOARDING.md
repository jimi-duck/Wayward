# The first minutes

A new pilot is taught by playing, in about a minute (`sim/tutor.ts`). It is
the first sortie as told, three marked steps, each one a thing the game
already does:

1. **Laser the violet rock.** One rock, close ahead, with what the jump needs
   in it (the tank starts short by exactly that). It pays chits and Cyrite.
2. **Fit the torpedo bay.** The ship leaves the yard without it. The bay opens
   in flight for this one step, with a single card, and the purse holds the
   price.
3. **Shoot the ship with a torpedo.** One Gutter scout, close, two hits.

Then the tank holds the jump, the quiet lifts after 25 s, and the run goes on
as it always did. The Arcade has the same three (rock, a pick from its bay,
a ship) without the torpedo.

- The objective block is the lesson ("Training 1/3", the one thing to do, how
  to do it on keys, touch or pad). The world carries one marker and the lane
  and depot marks step aside.
- Nothing locks. Skip training is on the pause card; skipping fits the
  torpedo bay anyway, so the ship is as the run expects.
- `profile.trained` remembers it. `?train` plays it again.
- Hunters and comms cards wait while it runs.
