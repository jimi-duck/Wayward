# The review world

A gallery of nearly everything in the game, in one place, for looking at
rather than playing. Open the game with `?dev` on the end of the address
(`/?dev`). There is no button for it on the title, so a player never meets it.

## What it is

You fly the Wayward with the usual keys, stick or touch, and fire as much as
you like. Nothing can hurt the ship: no hull moves or shoots, nothing
collides, no clock runs, and the alert stays clear. Everything holds still, and
every exhibit has a name on it (small teal tags, shown for the current stop
and only while the ship is near). Nothing it does is saved: the profile, the
journey and the Archive are left alone.

The menu is the **Review** tab on the left edge. It picks a group, then a
stop; a stop puts the ship in front of it. Keys: `[` and `]` for the previous
and next stop, `V` for the next sky, `H` to hide the names.

| Group | Stops |
|---|---|
| Ships | Hulls (all fifteen variants), Elites (the seven marks), Capital ships (one per faction) |
| Rock & items | Rock (five kinds, three sizes), Bulwarks, Krail and loose cargo (Krail 1 to 5, Cyrite, ore, parts), Cells and repair |
| Places & fire | The lane gate and the port, enemy fire and the warning circles and lines |
| Space | The fourteen features, the four named places, five sector events (beacon, hulk, ion storm, nebula, anomaly) |

The environment features show here whether or not `?space` is on. Each is built
when you go to it, alone, at the middle of its size range; the well pulls the
ship and the dust is heavy, but nothing strikes. A far feature (the passage, the
carrier) is sky: its name hangs on the bearing it rides.

The background is one of the five sky palettes (the three regions and the
arcade's two extras), switched from the menu or with `V`. Another sky re-rolls
the seed in the same palette, so the planet and the nebulae change.

## Where it lives

- `sim/world.ts`: `WorldOptions.review` and `stepReview`, the whole of the
  review rules. The ship flies and fires at nothing; the place's drag and pull
  work on it; nothing else steps. `World.review` holds the capital ships on
  show and the gate and depot.
- `review/gallery.ts`: the layout, as plain data. Rows of the hangar are laid
  once, far apart; the space stops are built on arrival. No Three.js.
- `review/panel.ts`, `review/review.css`: the menu and the name tags.
- `review/index.ts`: what `main.ts` loads for `?dev`, as a separate chunk, so a
  normal run does not download it.
- `render/`: the enemy view draws a list of capital ships (the fight has one,
  the gallery five), the sector can pin a sky (`setBackdrop`) and snap its camera
  after a jump, and the breakout view draws the review world's gate and depot.

The words are English only. The i18n rule is for what a player sees; this is for
whoever builds the game.

## Adding to it

A new hull variant, elite, rock kind, pickup or feature shows up by itself where
its table is read (`VARIANT_ORDER`, `ELITE_ORDER`, `ROCK_KINDS`, `POWERS`,
`FEATURE_ORDER`, `NAMED`), and `tests/review.test.ts` fails if one is missing.
A new kind of thing that is not in those tables is a new row in
`review/gallery.ts`: a `stop()`, the objects, a `label()` for each.
