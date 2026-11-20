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
  sits lower and further back (`camera.ts` ELEV 20°, PITCH 13.5°, VIEW 11 x 6.2). Since 2026-11-18 the closest zoom is cinematic
  (below).
- **Dust.** The motes take the sun's colour; past about half of top speed they stretch into faint speed streaks and brighten.
- **Jump arrivals.** A slow sweep: the shot opens wide, high and 120° round to the side, holds 1.5 s, then swings in behind
  the ship over 6.5 s (`Sector.arriveSweep`). A fight or a pop-up cuts it short; never with reduced motion. The HUD shows the
  system's name like a film title, low in the middle, for 8.5 s (`Hud.titleCard`); "Scanning for transmissions" is its last
  line. On the road nothing else is said and no card or call opens for the first 9 s (`FLOOR.arrival`, the floor's hush;
  owner 2026-11-01: "first the animation should finish, then stuff can come in").
- **A still world.** Paused or docked, the shot sways slowly round the ship. Photo mode (pause card) hides the HUD and the
  card and circles the ship, a little further off and lower; any key or tap brings the card back.
- **Colour mood.** A split tone in the grade (`MoodEffect` in `post.ts`): the sky's main colour in the shadows, its sun in the
  lights. Medium and High only (Low has no post chain).

## Calmer middle, lit far rocks, a softer planet (2026-11-01, owner's review)

- **The middle is the ship's.** The dome dims the cloud round the ship's place on screen (`uFocus`, `CENTRE_CALM` in
  `environment.ts`) to about a seventh, so colour sits toward the edges. The wisp layer is fainter; the vignette is back up a little.
- **No flat blue blobs.** The backdrop rocks deep in the fog were fading to a bright flat haze; the haze is darker now, and the
  far rock clusters are lit (flat-shaded Lambert) with a glow of the sky's haze in their shadows.
- **The sun lights the sky.** The cloud near it is warmed in the dome, a faint four-ghost lens flare shows when you face it
  (`FarBodies.face`), and the glare swells a little.
- **The planet.** A wide soft terminator, the nebula's light on the night side, a thin air rim all round, and the ring's shadow
  on the day side.
- **More far events.** Far flashes in the Reach and two Arcade skies; shooting stars in the Hollows and the Last Lanes.
- **Depth when turning.** About 420 dim near stars sit at a real distance far under the plane (`depth.ts`), in a box that
  follows the ship, so they slide against the stars at infinity when the camera swings. Every 22 to 55 s a dark rock
  tumbles past right by the lens at one edge of the picture (0.75 s, stretched along its path). Not with reduced motion.

## Cinematic flight (2026-11-18)

- **Camera** (`camera.ts` `FRAMES`, `COCKPIT`). Three views: the pause card's Camera row (Chase, Wide, Cockpit), the title's
  Settings, and Tab, Shift+Tab or C in flight; kept per device in `wayward.view`. Chase, the default, is the old view (20° up,
  13.5° down, a 52° lens, VIEW 11 x 6.2). Wide (`cinematic`) is close and wide (17°/7°, 72°). The Engine level view (11°/-3°) was
  dropped with the owner's pause card mockup (2026-11-18); a saved one opens as Wide. Cockpit is a flight
  sim's eye at the prow, level and looking 2° down, the hull hidden (`inCockpit`), banking up to 18° into a turn (72°). The lens stretches with speed in every view. Z zooms the
  chase views (`ZOOMS` 1, 1.45, 2.1). A jump, the reveal, an arrival, photo mode and the bay always use the chase rig:
  the cockpit eases out for them and back after (user 2026-11-18: the low view was too low to play by default).
- **Light** (`environment.ts`). The star's key is harder (`KEY` 6.2); the ambient bounce is the nebula's own colour at
  low strength (`HEMI` 0.24), so shadow sides stay deep. Bloom only takes high-luma pixels (threshold 0.82, smoothing
  0.14, `post.ts`); the bridge visor now sits just over that line.
- **Hull.** Paint at roughness 0.55 to 0.65 and metalness 0.22, so the key light glints on plate edges.
- **Rocks.** One far backdrop asteroid in nine is a colossal anchor (30 to 66 units across, `rocks.ts`).
- Bench: `tools/ship.html?view=game&cam=chase|cinematic|cockpit&zoom=0..2` is the flight camera itself. Not measured: real-GPU look and cost.

## Backdrop pass (2026-11-18)

A review against a "richer space" brief found most of it already here (nebula with dust lanes, four star layers, a
landmark planet and sun on the key's bearing, fog in the nebula's colour, sunlit dust, far works, ACES grade). What was added:

- **Star temperatures.** A few dim ember dwarfs (orange, never red) and amber stars join the warm whites and blue-whites (`starfield.ts`).
- **A landmark in every sky.** The one-in-seven "just the deep" sky is gone; every system has its world (`paint`). The draw is kept, so seeded skies are otherwise unchanged.
- **Far strobes** (`farworks.ts` `beacons`). Each far work has three nav lights (its top and two ends), white or amber, a long dim hold and a short flash on their own beats. One Points draw; reduced motion holds them at a dim glow. Not red: red stays the threat's.
- **Dust glints** (`environment.ts`). Facing the star, single motes flash on their own beats; looking away they stay dull. 300 colour writes a frame, no allocation.

Region mapping of the brief: Kethar Belt is the Salvage Belt (amber dust and teal), Black Reach is the Drift Deep and Last Lanes (indigo, violet, magenta accent), the Verge is the Breaker Yards (rust copper and steel teal). Not measured: GPU time.

## Distance pass (2026-11-18, owner: far things looked grey and cut out)

- **Aerial perspective** (`aerial.ts`, installed by `createRenderer`). Replaces three's fog chunks for every material. Toward
  the star the haze is brighter and warm (in-scatter); away from it, the sky's colour. The haze takes contrast first and never
  all of a thing (at most 84%, a lit face keeps 30% more), so far rock reads as lit stone in a coloured haze. The near
  bubble's exp2 curve is unchanged. `thinFog` (monuments) patches the new line (`fogTint, fogFactor )`).
- **Sky light on the limb** (`rocks.ts` `SKY_LIMB_*`). Every rock's edge takes a little of the nebula's colour (`WORLD_RIM`),
  more with distance, so far rock is outlined against the sky instead of standing as a flat shape.
- **Far rock detail.** The backdrop asteroids are full-detail shapes (icosphere 4, was 2), 150 of them (was 90); the far
  clusters and the debris under the field use the field's stone shader, not flat facets.
- **Sharper picture.** High: pixel ratio up to 2 (was 1.5), a 4096 sun shadow map (was 1024) with a wider filter; Medium:
  1.5 and 1024. Phone and Low are unchanged.

Not measured: real-GPU cost. The owner asked to put the look first; the governor still drops a tier on a slow machine.

## The great nebulae (2026-11-20, owner's Hubble references)

Every sky now carries one great shaped nebula, painted into the bake (`Hero` in `sky.ts`, `hero()` in the bake shader),
round the far side from the planet and clear of the sun. Four kinds, after the owner's pictures:

| Kind | After | What |
|---|---|---|
| `pillars` | Eagle, Carina, Horsehead | Dark columns of dust standing out of a ragged bank, lit gas behind combed along the light, the heads rimmed toward their star |
| `bipolar` | Butterfly, Hourglass | Two lobes blown out of a pinched waist, walls brighter at the edge, filaments, a dust lane across a hot core; now and then a ring round the eye |
| `bubble` | N44F, AG Carinae | A clumpy bright wall round a hot star, a cavity inside, the field's gas and dust lanes outside |
| `remnant` | Crab | An oval cage of tangled filaments, hot colours at the rim, a pale glow filling it |

Each region leans to its kinds (`HERO_LEAN`). Colours come from the palette, so no sky turns red: where the pictures are
red (hydrogen), the game uses the region's own pair. The bake is now 4096 wide (was 2048), once per system.
`?hero=pillars|bipolar|bubble|remnant` paints that kind just right of where the camera first looks; the bench is
`tools/sky.html?palette=0..9&hero=…`.

Also: more warm stars (amber and orange, as in the Hubble fields), the black hole about 1.7 times larger, the rift wider
and softer at the rim. Not measured: real-GPU bake time and memory (one 4096 x 2048 target).

## Dust in front of the stars, and closer worlds (2026-11-20, effects plan step 7)

- **Dust hides stars.** The sky bake's alpha says how much starlight gets through (dark lanes and the great nebula's dust
  stop most of it). The star layers read it (`starfield.ts` `setSkyMap`), so stars no longer shine through a lane.
- **Gas giants.** Belts slide past each other slowly (alternate belts run opposite ways), shear into eddies at their edges,
  and carry one oval storm with a pale rim.
- **Rock and ice.** Ridged highlands, frost at the poles, blue-tinged cracks in ice and a small sun glint on it. Cloud drifts
  (faster at the equator) and throws its shadow on the ground beside it. Moons have no air, so no cloud.
- **Air.** Toward the limb the ground fades into a sunlit haze of the air's colour and the disc darkens a little. The halo
  is a thin shell (1.1 radii, was 1.16), lit on the sun's side, and brightens into a ring when the sun is behind the world.
- **Rings** are lit on their sunlit face; from the dark face only the thin parts glow.
- Drift runs on `FarBodies.tick`, so reduced motion holds it. GPU cost not measured (one more cloud lookup per planet pixel).
