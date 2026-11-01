# The sky and the deep

Back to front, all in `src/render/sky.ts`, `starfield.ts` and `environment.ts`. No new draw call
per frame beyond four star layers; nothing is created per frame.

| Layer | What | Moves against the ship's travel |
|---|---|---|
| Nebula | Baked once per system on the GPU (five clouds, band, dust lanes, bright wisps, a magenta accent). The dome lays a seamless detail tile over it at two scales and slides it, so the gas thins and folds without repeating. | slowly (a sine, ±4°) |
| Far worlds | A planet (rings, moon), now and then a second small world, far works. | slowly |
| Stars | Four Points layers: dust (9,500), mid (1,300), bright (110, halo, cross, twinkle), lamps (a dozen far lights, pulsing). Seeded by the sky and thicker along the band and in clumps. | each its own rate; the nearer, the more |
| Wisps and far rocks | Sprites under the plane, a few drifting dark rock clusters, tumbling hulks. | the most |

Every slide is a sine of the distance flown, so nothing runs off in a long run.

- `?quality=low`: half the stars, half the wisps and rocks, no detail tile (no extra shader work).
- Reduced motion: the twinkle, the pulse and the gas hold still.
- `?nospace` turns the sector's space features off, not the sky.
- The detail tile uses the bake's own program (`uMode`), so it adds no shader to compile.
- Not measured: GPU time. The cloud pass costs two texture reads per pixel; test on a phone.

## What happens in the deep (`phenomena.ts`)

Rare things at infinity, chosen per sky from the region's leaning (`PHENOM`, by palette):

| Kept for the system | Passing |
|---|---|
| A black hole and its disc (`singularity.ts`, star lensing included). Most likely in the Drift Deep and the Last Lanes. | Shooting stars, and now and then a shower of three to six from one radiant |
| An energy rift: a torn lens with a dim other sky inside, a colour split on its rim only, wisps and motes. Most likely in the Hollows and the Last Lanes. | A far flash, white-gold (never red): the Breaker Yards and the Salvage Belt |
| A storm cell in one of the nebulae: lightning every 7 to 23 s, sometimes a double | Far traffic: a few lights crossing the sky over minutes (the Free Ports) |
| A lit heart in a cloud (baked): young stars lighting the gas from within | |

At most one of a hole or a rift per sky. A nebula closing in hides them. Reduced motion keeps what is there and lets nothing pass.
`?phenom=hole|rift|storm|busy` puts that thing in every sky, at the camera's first bearing (a screenshot rig).

Planets now have phases: most are lit from the sun's side, some half, a few a thin crescent with the air lit round the dark limb.

## Landmarks (`farworks.ts`)

Seven far works: ring station, fleet at anchor, hulk, broken orbital ring, dead relay (one wing torn off), mining rig on a dead
rock, and the spire (something nobody built, cold light in its joints). Each region leans to its own (`LEAN`): the Reach has
stations and relays, the Breaker Yards wrecks, the Hollows the spire. The bench is `tools/farworks.html?work=0..6`.

## Colour, the big planet and the sun (2026-11-01)

The owner asked for a No Man's Sky kind of sky: colour in the sky itself, the HUD protected another way.

- **Two colours a sky.** The ten palettes are bold pairs (the Reach violet and teal, the Marches rose and gold, the Hollows
  green and magenta, the Salvage Belt amber and teal, the Free Ports gold and rose, and so on). The deep is washed with both,
  never empty black. No sky is red.
- **A big planet.** The main world is 22 to 36 degrees across, with a thicker glowing air edge. It is kept clear of the sun.
- **The sun.** Low on the horizon on the key light's bearing (`SUN_AZ`, `SUN_EL`): a hot core that blooms, a wide glare,
  slow rays and a faint spike. It replaces the old bright star.
- **Warm and cool.** The key light takes the sun's warmth; the rim behind takes the sky's second colour, cooled. Distant rock
  fades into the sky's colour, not into black.
- **Grade.** No colour drain any more, a softer vignette and less grain (`post.ts`).
- **The HUD.** Soft dark pools under the four corners (`#hud::before` in `hud.css`): no blur, one static layer.

## The rest of the list (2026-11-01)

- **Rocks.** Each mineral has its own tint and a faint glow on the rim and in the far cast: basalt warm brown, iron
  steel blue, rich violet (cyrite), volatile cyan (`rocks.ts`, cache key `stone-rock13`).
- **The ship.** Off-white plating with a bold worn ochre stripe (`LIVERY` in `wayward.ts`). Smaller on screen: the camera
  sits lower and further back (`camera.ts` ELEV 20°, PITCH 13.5°, VIEW 11 x 6.2).
- **Dust.** The motes take the sun's colour; past about half of top speed they stretch into faint speed streaks and brighten.
- **Jump arrivals.** A slow sweep: the shot opens wide, high and 120° round to the side, holds 0.8 s, then swings in behind
  the ship over 4.2 s (`Sector.arriveSweep`). A fight or a pop-up cuts it short; never with reduced motion. The HUD shows the
  system's name like a film title, low in the middle, for 5.2 s (`Hud.titleCard`); the arrival scan becomes its last line.
- **A still world.** Paused or docked, the shot sways slowly round the ship. Photo mode (pause card) hides the HUD and the
  card and circles the ship, a little further off and lower; any key or tap brings the card back.
- **Colour mood.** A split tone in the grade (`MoodEffect` in `post.ts`): the sky's main colour in the shadows, its sun in the
  lights. Medium and High only (Low has no post chain).
