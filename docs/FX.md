# Fire and explosions

Code: `src/render/fx.ts` (the pools and the blast recipes), `src/render/sector.ts` (which event does what), `src/render/weapons.ts` (torpedo smoke). Bench: `tools/enemies.html?view=boom&at=0.4&size=2.8` freezes a kill at `at` seconds (`&calm=1` for the calm path).

## A kill
1. A short white flash and a tighter, dimmer one in the faction's colour, so the fireball shows through.
2. A fireball of puffs that swell and cool from yellow-white to dull red; smoke that starts warm (lit by the fire) and goes to soot.
3. Hot streak sparks (`HotSparks`, drawn through the shot streaks, so no new draw call) next to the round embers.
4. Torn plating in the dead ship's colours (`Debris.paint`) that burns while it is new: an ember trail, a wisp of smoke, and torn sides that glow white-hot to orange to dull red over about two seconds (`hotEdges`, an `aHeat` per piece on the kit metal).
5. Hulls of radius 1.2 and up cook off: 1 to 5 small blasts (`pop`) 0.1 to 0.6 s later inside the hull, plus 2 to 4 larger pieces.
6. A shockwave: a thin feathered front of lit gas with a faint wake behind it, thinning as it spreads (one plane, its own shader).
7. Hulls of radius 2.4 and up vent: burning gas jets from two breaches for most of a second (`jet`).

## Hurt hulls
An enemy under a third of its hit points smokes and sheds embers (`Effects.burning`), worse as it gets lower; a flame lick past 55 % gone. Hulls with 2 hp or less stay clean.

At half its hit points a hull's drives start to catch and cut out, and until a third it leaves a thin grey trail astern (`EnemyView.track`, one `Effects.dust` puff every 0.06 s, within 95 units of the camera).

## Enemy drives and steering
An enemy's drives follow its thrust, not its speed (`EnemyView.track` in `src/render/enemies.ts`): a coasting hull runs them low (0.45 of full at top speed), one pushing hard lights them long, and the pack's go still lights every member at once. Within 95 units it vents the same cold gas as the Wayward, dimmer: the nose on the outside of a hard turn (over 1.5 rad/s), the nose forward on a hard brake, the flank as a jink starts. No puffs on Grinders or cloaked hulls. Bench: `tools/enemies.html?view=close&kind=scout&turn=2.2&speed=24` (`&jink=1`, `&hp=<n>`).

## The player's death
The hull stays on screen for 1.45 s after the last plate (`DEATH_HOLD`; the sim waits 1.8 s). It vents fire from its wounds and nozzles, goes up stern, middle, bow (`dyingBlasts`), then breaks up in one big blast and disappears.

## Weapons
Our lances throw a muzzle flash (a white pinpoint and a short tongue of flipbook flame out of the barrel, `Effects.muzzle`), two hot sparks and a faint light, and carry a slim white-hot core inside the red. A lance hit on a hull (`Effects.scorch`) throws its sparks back toward the shooter's side (the camera), leaves a molten spot that cools from white to red over half a second, and a thin wisp of metal vapour. Torpedoes lay their smoke in segments, a puff and a glowing ember every 0.9 units (`SEGMENT` in `src/render/weapons.ts`), so a heavy round's path never reads as a lance's line. At full burn faint shock diamonds stand behind its motor, each smaller and dimmer than the last. A hit on a hull leaves a hot spot that cools over 0.3 s.

## Shield or plating
A hit a shield charge absorbs is a small hex ripple on the side it came from, blue, about a third of a second; it fades before it wraps the hull, so it never reads as a bubble. A hit that gets through never draws the lattice: a short red rim, plus torn metal and hot streaks off the hull. Bench: `tools/ship.html?hit=60&age=0.1` (`&abs=1` for an absorbed hit).

## Rock in hard light
Stone is lit hard (`ROCK_LIGHTS` in `src/render/rocks.ts`): the sun is cut off by the rock's smooth shape, not its bumped grain (`ROCK_EDGE`), and the side away from it keeps only 3% of the rim and sky light (`ROCK_NIGHT`), so the terminator reads as a clean line and the night side goes near black. Ship lights and thrown lights still reach it. The sun then rims the limb facing it, stronger where a rock stands against the light (`ROCK_RIM`), so a rock still reads as a form on a dark sky. Breaking or mining rock throws a cloud of fine gravel that catches the sun (`Effects.grit`, warm white under the bloom line, 1 to 2 s, spark pool, no draw call); a hit throws a few.

## Homing fire out of view
Plasma that steers, and missiles, closing on the ship from off screen within 70 units show a short red arc on the screen edge along their bearing, pulsing (still with reduced motion), stronger the nearer (`drawIncoming` in `src/ui/targeting.ts`). It goes once the shot is on screen or turns away. Hulls out of view keep their chevrons in their faction's colour.

## The Wayward's own motion
- Attitude jets (`ShipView.rcs`, `PORTS` in `src/render/ships.ts`): six ports, two lateral at the bow, two at the stern, a dorsal and ventral pair on the bow. A short burst of cold gas (`Effects.gas`, white with a cool cast, under the bloom line, 0.15 to 0.25 s) as a turn starts or stops, the whole flank away from a jink, and the bow pair into and out of a break's flip. A faint glow stays on the turning pair through a steady turn. Bench: `tools/ship.html?rcs=jink|flip|turn`.
- Drive plumes: the hot core's shock diamonds only stand out under a hard burn; at idle it is a short, smooth blue-white.
- Drive light on her stern (`glowLight` and the painted materials' `ENGINE` term): next to nothing at idle, full at a hard burn, a little past it while a throttle snap spools the drives. It is the drives' own blue: the stock drives burn blue, so an amber wash would not match them.
- Camera (`src/render/camera.ts`): a throttle snap from low speed or a jink opens the lens up to 4° for a moment (in fast, out slow); past two thirds of full burn at speed a fine hum (0.014 units) comes through the rig. Reduced motion drops both. The rig itself: see docs/SKY.md, Cinematic flight.

## Refit and docking
- A part just fitted is traced in thin teal lines over its edges (`INSPECT` in `src/render/wayward.ts`), two pulses over about 2.4 s of flight, so the player sees on the hull what the bay put there. The bay holds the world, so it plays as she launches. Edge lines are built once per fit; a save loading or a whole build arriving (more than 4 new levels) shows none. Bench: `tools/ship.html?inspect=mo_thrusters:3`. The run's wear (`setUse`) already builds on the hull as she is used.
- Docking from flight, the port's screen waits 1.3 s (`DOCK_SETTLE_MS`) while the station's sodium floodlight comes up over her deck with a strike flicker, the camera comes in a little and wisps of vented steam drift across the shot. The light is the last of the four thrown lights held as a lamp (`Effects.lamp`), so the scene gets no new light; the low tier has none. Not on the way back from the refit bay, and none of it with reduced motion.

## Ports at work
Every depot has two work skiffs flying slow loops round it (`CRAFT` and `skiff` in `src/render/stations.ts`): 17 and 21 units out, 7.5 and 10.5 over the deck (clear of the docking arms), one each way, nose along the path and banked into it. Each has a lit nose in the port's lamp colour and a tail strobe on the depot's own strobe, so it blinks with the masts. A faint haze in the lamp colour sits round the hub (`haze`, one additive sprite at 7 % of the lamp), so a lit port reads as sitting in its own light. Cost: two draws per skiff plus one sprite, only while a depot is in view. Bench: `tools/sites.html?prop=port&style=frontier&t=5` (`t` sets the skiffs' clock). Jump Gates are left as they are (the owner's call).

## Game feel
- Hits: our lance or torpedo landing on a hull or boss gives the camera a small shake (0.1 to 0.14); hits on us shake harder (as before).
- Slow motion (`src/core/slowmo.ts`, `loop.timeScale`): a cruiser (radius 2.4 up) or elite kill drops the clock to 0.4 (0.3 for radius 3+) for about 0.25 to 0.35 s, a boss kill to 0.25 for 0.6 s. Eases in over 60 ms and out over 350 ms; 4 s cooldown so a busy fight is not slow. A pause, a pop-up, death or reduced motion clears it at once.
- Drifting wreckage: the larger hull pieces from a kill (`rubble(..., drift)`) keep their speed (0.997 per step), tumble slowly and last about 4.5 s; small plating still falls away in about 2 s.

## Calm path
`Effects.calm` is on for reduced motion and the low tier: half the flash size, no staged blasts, no streak sparks, no ember trails on shards, half the burning smoke, one fade for the player's death with no shake or hit-stop. Reduced motion also has no slow motion and no camera shake.

## Cost
No new draw calls (sparks go in Streaks, shards in the existing instanced pools). Puff pools are unchanged at 64 + 64; point lights stay 4. A cruiser kill adds up to 4 queued blasts, each about 6 puffs. Not measured on a phone GPU; the cloud has software WebGL only.

**Rock shapes and stone (2026-11-20).** `rockGeometry` presses concave impact basins into the shape (a parabolic bowl, a raised ejecta lip and a central rebound peak on the big ones), cuts broken faces back in stepped ledges instead of flat slices, and bakes the creases as occlusion. The stone shader reads that occlusion (`vRockAO`) so heat and crystal live only down in the crevices: basalt and bulwarks keep magma in three tiers (black crust, dull crimson, a thin white-hot thread), volatile rock has hairline cyan fissures, and rich rock is dusty charcoal outside with a crystal-lined geode cut into its own copy of each shape (`aGeode`, crystals seated in it). Iron is metallic slate whose faces flash. Fine grain, micro craters and regolith pores fade out by `fwidth` before they shimmer. Field rocks are icosphere detail 11, bulwarks 22. Bench: `tools/rocks.html?view=close|game|bulwark&orbit=<deg>&d=<dist>`.

## Reflections and the tone map (2026-11-20)
Metal and glass reflect the system's own sky (`src/render/reflect.ts`): the baked nebula and stars at 2.6 times the dome's level, with the sun as a hot spot where the key light comes from, in the sun's colour, run through one PMREM generator kept for the page's life. Built once per system when the sky is baked (and again for `?hero`), so nothing runs per frame and no program links in play. It replaces the fixed studio every system shared (a black sphere, a warm window, a cold one); the sun lobe gives about the old warm window's light, so hulls keep their exposure and take the sky's colour. Bench: `tools/ship.html?view=three`.

The tone map is Khronos PBR Neutral (the owner's pick over ACES and AgX, 2026-11-20). `?tone=aces` or `?tone=agx` swaps it everywhere (post chain, the low tier's direct draw, the readout) for comparison (`src/render/tone.ts`).

## Fire and smoke that move (2026-11-20)
Every puff of flame, smoke, dust and steam is an instance in one of two draws (`src/render/puffs.ts`), 96 flame and 96 smoke, where before each was its own sprite (128 draws). Each plays through a flipbook as it lives: 8 by 8 frames baked once on the GPU at load from 3D noise (1024 px on Medium and High, 512 on Phone and Low), so a fireball churns, its edge in cauliflower lobes, and breaks into tatters as it cools; smoke billows and thins. The atlas: R flame heat, A smoke density, G and B the smoke's normal. Smoke is lit by the sun (wrapped, never black) and glows from inside while the fire still lights it; flame draws over its own smoke. A seed per puff picks a mirror and a start frame, so no two churn alike. Not done: soft edges where a puff meets a hull, which needs a depth pre-pass (a second draw of the whole scene). Bench: `tools/enemies.html?view=boom&at=3.5` (the bench's `at` runs slower than seconds under software GL).

## Plating finish (2026-11-20)
The kit metal's plating carries a roughness map in its height map's green channel (`platingTextures` in `src/render/kit.ts`): each plate its own finish (satin, matt, or rubbed bright), seams dull, rivet heads polished, wiped patches where hands and hoses rub. Under the hard key light neighbouring plates catch the sun differently, which is most of what makes metal read as metal. Close up, a finer relief from the same height map at seven times the scale adds to the bump and fades out by screen size (`fwidth`) before it can shimmer. Every hull, station and part built on `metal()` gets both; no new texture, one more set of three texture reads where the camera is close.
