# The first minutes

Every new Story journey opens on a short story card (`ui/opening.ts`: who you are,
what is after you, the first job), then the controls card (the pause card, titled
"All stop", with Resume and Save and exit), then a short lesson (`sim/tutor.ts`):
three marked steps, each one a thing the game already does:

1. **Mine a Cyrite rock.** One rock, close ahead, with what the jump needs
   in it (the drive tank starts short by exactly that). The ship refines the
   Cyrite into jump fluid as it comes aboard.
2. **Fly to the work bay.** The depot sits a short hop off (about 190 units),
   so the way is short once the rock is down. Dock, open the bay and fit the
   torpedo bay, the one card on offer. The ship leaves the yard without it
   and the purse (Cyrite, apart from the tank) holds the price.
3. **Shoot the ship with torpedoes.** One Gutter scout appears only now, a
   little way ahead.

Then a **Heat** note (`ui/heatnote.ts`, Story only, once per profile: `profile.heatTold`, so a pilot who trained before the note existed sees it the first time they fly free) explains the Heat bar in the lower right of the HUD: the Continuance ships you fight and the time you spend in a system raise it, and the hotter it is the more ships come and the likelier a blockade. The bar has four steps (gold from the third, red at the fourth) and shows from the start of every Story system.

Then the tank holds the jump (jump fluid), the quiet lifts after 25 s, and the run goes on.
The Arcade has the same three in the same order (rock, a
pick from its bay, a ship), behind a Begin and Exit card, and plays them once.

- The objective block is the lesson ("Training 1/3", the one thing to do, how
  to do it on keys, touch or pad). The world carries one marker and the lane
  and depot marks step aside.
- Nothing locks, and no card has a Skip training button.
- The Story plays it on every new journey. In the Arcade `profile.trained` remembers it, and `?train` plays it again.
- Hunters and comms cards wait while it runs.

## Keep it short

The opening card is one page: the contract, the Score, the theft, the first job. No story pop-up fires during the lessons; the registry card comes when training ends, with the yard call a few seconds after.

## The chase

When the torpedo lesson ends, the training stops and the run begins. The gate is set 1.9 km ahead, the objective reads "Run for the jump gate", and Custody ships arrive from behind in growing waves: pickets, heavy cruisers, enforcers, interdictors (`chaseCap`, `chaseGap`, `chaseHeat` in `sim/breakout.ts`). Later waves are not meant to be fought. The jump loses them. Arcade has no chase.

## Pop-up gist

Story cards carry a `gist` of at most ten words (set in `content/story.ts`), shown above the text so a pop-up reads at a glance. Cards without one fall back to a derived line.
