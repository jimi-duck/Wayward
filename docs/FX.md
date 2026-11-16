# Fire and explosions

Code: `src/render/fx.ts` (the pools and the blast recipes), `src/render/sector.ts` (which event does what), `src/render/weapons.ts` (torpedo smoke). Bench: `tools/enemies.html?view=boom&at=0.4&size=2.8` freezes a kill at `at` seconds (`&calm=1` for the calm path).

## A kill
1. A short white flash and a smaller tinted one (the faction's colour, dimmed).
2. A fireball of puffs that swell and cool from yellow-white to dull red; smoke that starts warm (lit by the fire) and goes to soot.
3. Hot streak sparks (`HotSparks`, drawn through the shot streaks, so no new draw call) next to the round embers.
4. Torn plating that burns while it is new: an ember trail and a wisp of smoke.
5. Hulls of radius 1.2 and up cook off: 1 to 5 small blasts (`pop`) 0.1 to 0.6 s later inside the hull, plus 2 to 4 larger pieces.
6. A faint ring (thin, dim, fading fast).

## Hurt hulls
An enemy under a third of its hit points smokes and sheds embers (`Effects.burning`), worse as it gets lower; a flame lick past 55 % gone. Hulls with 2 hp or less stay clean.

## The player's death
The hull stays on screen for 1.45 s after the last plate (`DEATH_HOLD`; the sim waits 1.8 s). It vents fire from its wounds and nozzles, goes up stern, middle, bow (`dyingBlasts`), then breaks up in one big blast and disappears.

## Weapons
Our lances throw two hot sparks and a faint light from the barrel, and carry a slim white-hot core inside the red. Torpedoes lay their smoke in segments, a puff and a glowing ember every 0.9 units (`SEGMENT` in `src/render/weapons.ts`), so a heavy round's path never reads as a lance's line. A hit on a hull leaves a hot spot that cools over 0.3 s.

## Shield or plating
A hit a shield charge absorbs is a small hex ripple on the side it came from, blue, about a third of a second; it fades before it wraps the hull, so it never reads as a bubble. A hit that gets through never draws the lattice: a short red rim, plus torn metal and hot streaks off the hull. Bench: `tools/ship.html?hit=60&age=0.1` (`&abs=1` for an absorbed hit).

## Rock in hard light
Stone takes half the sky's fill light (`ROCK_FILL` in `src/render/rocks.ts`), so the side away from the sun goes near black and the terminator reads crisp. The sun then rims the limb facing it, stronger where a rock stands against the light (`ROCK_RIM`), so a rock still reads as a form on a dark sky. Breaking or mining rock throws a cloud of fine gravel that catches the sun (`Effects.grit`, warm white under the bloom line, 1 to 2 s, spark pool, no draw call); a hit throws a few.

## Homing fire out of view
Plasma that steers, and missiles, closing on the ship from off screen within 70 units show a short red arc on the screen edge along their bearing, pulsing (still with reduced motion), stronger the nearer (`drawIncoming` in `src/ui/targeting.ts`). It goes once the shot is on screen or turns away. Hulls out of view keep their chevrons in their faction's colour.

## The Wayward's own motion
- Attitude jets (`ShipView.rcs`, `PORTS` in `src/render/ships.ts`): six ports, two lateral at the bow, two at the stern, a dorsal and ventral pair on the bow. A short burst of cold gas (`Effects.gas`, white with a cool cast, under the bloom line, 0.15 to 0.25 s) as a turn starts or stops, the whole flank away from a jink, and the bow pair into and out of a break's flip. A faint glow stays on the turning pair through a steady turn. Bench: `tools/ship.html?rcs=jink|flip|turn`.
- Drive light on her stern (`glowLight` and the painted materials' `ENGINE` term): next to nothing at idle, full at a hard burn, a little past it while a throttle snap spools the drives. It is the drives' own blue: the stock drives burn blue, so an amber wash would not match them.
- Camera (`src/render/camera.ts`): a throttle snap from low speed or a jink opens the lens up to 4° for a moment (in fast, out slow); past two thirds of full burn at speed a fine hum (0.014 units) comes through the rig. Reduced motion drops both. The rig itself is unchanged.

## Refit and docking
- A part just fitted is traced in thin teal lines over its edges (`INSPECT` in `src/render/wayward.ts`), two pulses over about 2.4 s of flight, so the player sees on the hull what the bay put there. The bay holds the world, so it plays as she launches. Edge lines are built once per fit; a save loading or a whole build arriving (more than 4 new levels) shows none. Bench: `tools/ship.html?inspect=mo_thrusters:3`. The run's wear (`setUse`) already builds on the hull as she is used.
- Docking from flight, the port's screen waits 1.3 s (`DOCK_SETTLE_MS`) while the station's sodium floodlight comes up over her deck with a strike flicker, the camera comes in a little and wisps of vented steam drift across the shot. The light is the last of the four thrown lights held as a lamp (`Effects.lamp`), so the scene gets no new light; the low tier has none. Not on the way back from the refit bay, and none of it with reduced motion.

## Game feel
- Hits: our lance or torpedo landing on a hull or boss gives the camera a small shake (0.1 to 0.14); hits on us shake harder (as before).
- Slow motion (`src/core/slowmo.ts`, `loop.timeScale`): a cruiser (radius 2.4 up) or elite kill drops the clock to 0.4 (0.3 for radius 3+) for about 0.25 to 0.35 s, a boss kill to 0.25 for 0.6 s. Eases in over 60 ms and out over 350 ms; 4 s cooldown so a busy fight is not slow. A pause, a pop-up, death or reduced motion clears it at once.
- Drifting wreckage: the larger hull pieces from a kill (`rubble(..., drift)`) keep their speed (0.997 per step), tumble slowly and last about 4.5 s; small plating still falls away in about 2 s.

## Calm path
`Effects.calm` is on for reduced motion and the low tier: half the flash size, no staged blasts, no streak sparks, no ember trails on shards, half the burning smoke, one fade for the player's death with no shake or hit-stop. Reduced motion also has no slow motion and no camera shake.

## Cost
No new draw calls (sparks go in Streaks, shards in the existing instanced pools). Puff pools are unchanged at 64 + 64; point lights stay 4. A cruiser kill adds up to 4 queued blasts, each about 6 puffs. Not measured on a phone GPU; the cloud has software WebGL only.
