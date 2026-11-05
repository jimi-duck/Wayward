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
Our lances throw two hot sparks and a faint light from the barrel. Torpedoes trail thin grey smoke. A hit on a hull leaves a hot spot that cools over 0.3 s.

## Game feel
- Hits: our lance or torpedo landing on a hull or boss gives the camera a small shake (0.1 to 0.14); hits on us shake harder (as before).
- Slow motion (`src/core/slowmo.ts`, `loop.timeScale`): a cruiser (radius 2.4 up) or elite kill drops the clock to 0.4 (0.3 for radius 3+) for about 0.25 to 0.35 s, a boss kill to 0.25 for 0.6 s. Eases in over 60 ms and out over 350 ms; 4 s cooldown so a busy fight is not slow. A pause, a pop-up, death or reduced motion clears it at once.
- Drifting wreckage: the larger hull pieces from a kill (`rubble(..., drift)`) keep their speed (0.997 per step), tumble slowly and last about 4.5 s; small plating still falls away in about 2 s.

## Calm path
`Effects.calm` is on for reduced motion and the low tier: half the flash size, no staged blasts, no streak sparks, no ember trails on shards, half the burning smoke, one fade for the player's death with no shake or hit-stop. Reduced motion also has no slow motion and no camera shake.

## Cost
No new draw calls (sparks go in Streaks, shards in the existing instanced pools). Puff pools are unchanged at 64 + 64; point lights stay 4. A cruiser kill adds up to 4 queued blasts, each about 6 puffs. Not measured on a phone GPU; the cloud has software WebGL only.
