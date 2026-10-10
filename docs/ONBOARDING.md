# The first minutes

Every new Story journey opens on a short story card (`ui/opening.ts`: who you are, what is after you, the first job), then a short lesson (`sim/tutor.ts`), three
marked steps, each one a thing the game already does:

1. **Laser the violet rock.** One rock, close ahead, with what the jump needs
   in it (the drive tank starts short by exactly that). The ship refines the
   Cyrite into jump fluid as it comes aboard.
2. **Shoot the ship.** One Gutter scout, close, two hits.
3. **Fly to the work bay.** The depot sits a short hop off (about 190 units),
   so the way is short once the ship is down. Dock, open the bay and fit the
   torpedo bay, the one card on offer. The ship leaves the yard without it
   and the purse (Cyrite, apart from the tank) holds the price.

Then the tank holds the jump (jump fluid), the quiet lifts after 25 s, and the run goes on
as it always did. The Arcade has the same three in its old order (rock, a
pick from its bay in flight, a ship) and plays them once.

- The objective block is the lesson ("Training 1/3", the one thing to do, how
  to do it on keys, touch or pad). The world carries one marker and the lane
  and depot marks step aside.
- Nothing locks. Skip training is on the pause card; skipping fits the
  torpedo bay anyway, so the ship is as the run expects.
- The Story plays it on every new journey. In the Arcade `profile.trained` remembers it, and `?train` plays it again.
- Hunters and comms cards wait while it runs.
