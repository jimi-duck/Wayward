# The first minutes

Every new Story journey opens on a short story card (`ui/opening.ts`: who you are,
what is after you, the first job), then the controls card (the pause card, titled
"All stop", with Resume and Save and exit), then a short lesson (`sim/tutor.ts`):
three marked steps, each one a thing the game already does:

1. **Mine a violet rock.** One rock, close ahead, with what the jump needs
   in it (the drive tank starts short by exactly that). The ship refines the
   Cyrite into jump fluid as it comes aboard.
2. **Fly to the work bay.** The depot sits a short hop off (about 190 units),
   so the way is short once the rock is down. Dock, open the bay and fit the
   torpedo bay, the one card on offer. The ship leaves the yard without it
   and the purse (Cyrite, apart from the tank) holds the price.
3. **Shoot the ship with torpedoes.** One Gutter scout appears only now, a
   little way ahead.

Then the tank holds the jump (jump fluid), the quiet lifts after 25 s, and the run goes on.
The Arcade has the same three in the same order (rock, a
pick from its bay, a ship), behind a Begin and Exit card, and plays them once.

- The objective block is the lesson ("Training 1/3", the one thing to do, how
  to do it on keys, touch or pad). The world carries one marker and the lane
  and depot marks step aside.
- Nothing locks, and no card has a Skip training button.
- The Story plays it on every new journey. In the Arcade `profile.trained` remembers it, and `?train` plays it again.
- Hunters and comms cards wait while it runs.
