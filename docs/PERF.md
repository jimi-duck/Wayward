# Performance

How the game is measured, what the numbers were, and what changed. Short and
plain; one section per pass.

## What can be measured where

The cloud container has no GPU, only a software renderer, so GPU frame times,
real FPS and real shader-compile times are **not** measurable here. What is:

- **The simulation's CPU cost.** `npm run pilot:perf` flies the scripted pilot
  and times every `World.step` (mean, 99th percentile, worst step, garbage).
  `PERF_MIN` sets the flight length in minutes.
- **Counts that predict stalls.** Draw calls, triangles, and above all how many
  shader programs are compiled and *when*. A program compiled after the player
  presses Start is a stall on a phone, whatever the machine here says.
- **JavaScript cost per frame**, with the GPU draw calls stubbed out, so the
  software renderer's fill time does not hide it.
- **Bundle and asset sizes**, and what loads before the title.

Numbers that still need a real device: frame rate and frame pacing, GPU
cost of bloom, SMAA and the sky, real shader-compile time, touch latency.

## Baseline (before the pass)

| What | Number |
|---|---|
| Sim step, Arcade 10 min | mean 0.11 ms, p99 0.41 ms, worst 7.5 ms |
| Sim step, Raider, 17 hulls, 154 rocks | mean 0.09 ms, p99 0.38 ms, worst 3.0 ms |
| Sim step, Story | mean 0.09 ms, p99 0.29 ms, worst 5.3 ms |
| JS per frame, cruising, 960x540 (this CPU) | about 6 ms (renderer 4.5, HUD 1.0) |
| JavaScript downloaded | 781 KB game + 592 KB three.js (288 + 149 KB gzipped) |
| Programs compiled behind the title, High | 48 |
| Programs compiled after Start, High | 36 |
| Programs compiled after Start, Medium | 1 to 3 |
| Shader links per new sky | 5 to 6 |

## Pass 1: shader warm-up

**Cause.** The warm-up compiled every material into the plain canvas. On
Medium and High the scene is drawn into the post chain's linear buffer, which is
a different program for every material, so the work behind the title was thrown
away and the real programs, plus bloom and SMAA, compiled in the first frames
after Start. A new sky also threw its programs away: the baking material was
disposed after every bake, and a disposed planet takes its program with it, so
each system's sky compiled the heaviest shader in the game again.

**Change.** The warm-up compiles against the post chain's buffer, with
`compileAsync` so the browser links in parallel, then draws one frame through
the chain behind the title. The sky baker keeps one material for the page's life,
a hidden planet with a ring and a moon holds the far-body programs, and a hidden
bulwark holds the plain-mesh rock program.

**After.** Programs compiled after Start: 0 on High and Medium (was 36 and
1 to 3). Shader links per new sky: 1 (was 5 to 6).

**Trade-off.** The same compile work now happens behind the title, so a very
fast tap on Start can still wait for the end of it. Real-device check: the first
two seconds after Start on a phone.

## Pass 2: what the title downloads

**Cause.** The title art (262 KB JPEG) was found only after the stylesheet had
been read, so it queued behind it, and the two main faces likewise.

**Change.** Both screens' art is WebP at quality 84 (PSNR about 39 dB against
the JPEG, no visible difference): 262 to 190 KB and 329 to 205 KB. The page
preloads the title art and the two faces the title uses.

**After (software browser, same machine).** The title art finishes at 61 ms
(was 307 ms), and the page downloads 1.84 MB on first load (was 1.90 MB, with
the menu art still to come in the bay: 124 KB lighter).

## Pass 3: no link check in shipped builds

**Cause.** three.js checks every program's link log the first time the program
is drawn with (`renderer.debug.checkShaderErrors`). Reading the log makes the
browser finish compiling that program on the spot, inside the frame. In a dev
profile the first frame with hulls on screen spent 270 of its 325 ms in those
two calls.

**Change.** The check runs on the dev server and with `?debug=1`, and not in
shipped builds. The shaders are ours and fixed, and the warm-up already links
them.

**After.** No frame over 60 ms in the same 400-frame late-game run (software
GL, dev profile; was one at 148 to 325 ms). Real device: the first fights of a
run.

**Trade-off.** A shader that fails on an unusual GPU now fails quietly (black or
missing object) instead of logging why; `?debug=1` brings the log back.

## Pass 4: the hit-stop on every rock

**Cause.** Every kill, hit and break holds the simulation still for a few steps
(`loop.freeze`) so it lands with weight, while the camera and effects carry on.
A rock break held for 20 to 40 ms, and the scripted pilot breaks about 65 rocks
a minute (against 9 hull kills), so about once a second the ship stopped for one
or two steps while the camera kept moving: a judder in flight, not a slow frame.

**Change.** Only the biggest rocks hold (30 ms). Smaller rocks keep their burst
and shake. Hull kills, bulwarks, hits and capital ships are unchanged.

**Real device:** whether mining now feels smoother, and whether the small
breaks still have enough weight. `if (e.size === 0)` in `Sector.react` is the
one place to put it back.

## Pass 5: nothing drawn behind the refit bay

**Cause.** The bay is opaque and covers the whole view, but the scene and the
post chain (bloom, SMAA) were still drawn behind it every frame. On a phone that
is a full GPU frame competing with the bay's own animation (the pick beat, the
fade).

**Change.** Once the bay has settled over the view, the frame is not drawn
(`Sector.covered`; the bay says when it is opaque and not yet fading out, so the
fade-out never shows a frozen picture). Everything else still updates, so the
bay's lines to the ship stay right. Drawing resumes the moment the bay starts to
leave.

**After.** 0 draw calls over 60 frames with the bay open (was a full frame each).
Real device: bay animation smoothness and battery.

## Pass 5b: the far works were 86 draws

**Cause.** Visual overhaul round two put a ring station, a fleet or a hulk on
every sky. Each was built from dozens of separate boxes, so a sky with two of
them was 83 more draw calls and 86 meshes every frame, for objects that never
move. The code's comment said they were merged; they were not.

**Change.** Each work is baked into one mesh per material (3 each, 6 a sky).
Same triangles (1,644), same look; the geometry is built once per sky.

**After (this machine, JS only).** Visible draw calls at cruise 83 fewer; the
renderer's CPU per frame 2.9 to 2.6 ms (about 11%), at 960x540 on the dev server.
That saving is several times larger on a phone, and the GPU's vertex and state
work drops with it.

## After round two of the visual overhaul (#151)

Programs compiled after Start: still 0 (70 programs behind the title on High,
67 on Medium, up from 60 and 57). Per-frame JS at cruise, medium tier: 3.4 ms
here after this pass.

## Pass 6: space effects on, and a check after #190 to #192

Space effects (the environment's features) went on by default on 2026-10-10, and
the rock and Krail rework had just landed, so this pass looked for new cost
before the owner's report of lag in parts. Measured here, 5 minutes of the
scripted pilot, then a browser profile of the dev server at 960x540.

**Simulation.** Mean step 0.05 to 0.09 ms in every run, p99 0.15 to 0.41 ms,
worst step 4.5 to 10.9 ms (a rock or hull break, as before). Space on is no
dearer than space off. The sim is not where lag comes from.

| Run (5 min) | Mean | p99 | Worst |
|---|---|---|---|
| Arcade | 0.093 ms | 0.35 ms | 5.2 ms |
| Arcade, space on | 0.065 ms | 0.22 ms | 6.2 ms |
| Arcade, Raider | 0.088 ms | 0.41 ms | 7.6 ms |
| Story | 0.084 ms | 0.35 ms | 10.9 ms |

**One frame, in the browser.** With draws stubbed so the software renderer's
fill does not hide it, our own per-frame code (rocks, hulls, effects, sky,
space) is about 0.5 ms a frame; the rest, 4 to 6 ms, is three.js walking the
scene and setting up about 100 draw calls and 100,000 triangles at cruise.
Space features add up to about 17 draw calls while one is near, and **no new
shader programs** (checked for all 14 features). The biggest single costs by
triangles: the sky's far works 21k, the three rock-field shapes 16k, the
Wayward's own hull 31k.

**Found and fixed.** Three places built something on first sight, which is a
dropped frame in flight:

| First sight of | Before | After |
|---|---|---|
| A Krail seam (stream textures painted) | 77 ms | under 1 ms |
| A graveyard (five dead hulls built) | 52 ms | 1 ms |
| Breakers (rock shapes built) | 34 ms | 1 ms |

`prepareSpace` now does that work behind the title with the rest of the
warm-up (about 170 ms in one go on this machine, once). Trade-off: the same as
pass 1, a very fast tap on Start can wait for it.

**Not measurable here.** The GPU: fill rate of the rock shader, bloom and the
sky on a phone, and frame pacing. The frame-time governor already steps a slow
device down a tier. In software GL the first frame after launch also took
several seconds with no new programs; whether any driver links lazily on its
first draw is a real-device question. Real device: flying through a graveyard,
a seam and a storm on a phone, and the first two seconds after Start.

## Graphics pass 1: rock silhouettes

Rocks get more cleaved faces (planes ×2.2, wider reach), stepped ledges in the outline, and baked ambient occlusion in vertex colours (dark in creases and crater floors). The surface relief is angular (chipped facets, sharp crests) rather than a soft swell. Triangle counts, draw calls and shader programs are unchanged (same subdivisions, same instancing; the material gains a vertex-colour read). Not measured: GPU time on a phone. Shots in `/mnt/project-files/graphics-research/task1-rocks/`.

## Graphics pass 2: the sun's shadow

One shadow map from the key light, covering only 76 units around the ship (it follows the ship, snapped to a quarter-unit grid so edges do not crawl). Medium 512 px, High 1024 px, Low none (`QualityTier.shadow`). Cast and received by the Wayward, rocks, bulwarks and instanced hulls; the backdrop, places and pooled effects do not take part. The key light was lowered from 55 to 34 high so rocks and hull parts throw longer shadows; the planet's light follows. Cost: one extra depth pass of the nearby rocks, ships and hulls each frame, and a shadow lookup per lit pixel on those materials. Not measured: GPU time on a phone. Honest note: on the flat flight plane a convex rock rarely shades its neighbour (a pixel diff of isolated rocks was near zero), so the visible gain is hull self-shadow and rocks passing over or beside the ship. Medium is the tier to watch on phones.

## Graphics pass 3: the hull's finish

The kit metal shader (every hull part) darkens grooves and seams (a cavity term from the height map), keeps raised edges a little brighter, and lays long grime streaks along the flight direction. The Wayward's spine modules get tie-down straps with steel buckles (about 24 more bevelled boxes in the one merged hull mesh; no extra draw calls). One cheap hash noise per pixel; no new textures. Not measured: GPU time on a phone. Shots in `/mnt/project-files/graphics-research/task3-hull/`. Enemy hulls share the shader and so the finish; their own geometry pass is not part of this change.

## Graphics pass 4: debris and haze

A layer of small stone chips (160 Low, 360 Medium, 560 High; `QualityTier.debris`) drifts and turns in a box that follows the ship. One instanced mesh, one draw call, a shared plain material, ~80 triangles a chip, positions rewritten on the CPU each frame (a few hundred matrix writes). Chips melt to nothing within 9 units of the ship so they never cover the hull or shots; the simulation never sees them. The distance fog also takes a faint wash of the sky's own colour. Not measured: GPU time on a phone and the CPU cost of the update on one (it is small next to the HUD's). Shots in `/mnt/project-files/graphics-research/task4-debris/`.

## Graphics pass 5: planets

The far-planet shader gains thin streaked cloud on rock and ice worlds, a warm twilight band at the terminator, a faint glow of the dark side, a crisper limb, and a few city lights on rock worlds. The atmosphere halo used the wrong sign for its light, so it ringed the dark side; it now hugs the lit limb. Same shaders and programs (more noise taps in the planet fragment: three extra fbm calls on rock and ice, a few extra on rock worlds); one planet per sky. Bench: `tools/planets.html` (`?sun=40,10,-30` for a crescent). Not measured: GPU time on a phone. Shots in `/mnt/project-files/graphics-research/task5-planets/`. (The "before" bench shots are from this branch with the old shader.)

## Graphics pass 6: light

The key light goes from 4.4 to 4.9 and the sky fill from 0.8 to 0.58, so the shadow side of rocks and hull is deeper and the contrast between lit and unlit faces is stronger. Bloom, vignette, grain and tone mapping are unchanged (bloom stays restrained by choice; only lamps, weapons, engines and gates exceed the threshold). Light shafts and lens glow were left out: they need a full-screen pass that costs more than it gives on a phone. No cost change (same lights). Shots in `/mnt/project-files/graphics-research/task6-light/`.

## Graphics pass 7: edges on Medium

Medium had no edge smoothing at all, so rock and hull edges stair-stepped (Low still has none). Medium now runs SMAA at its light preset in the post chain; High keeps the full preset. Cost: SMAA's three small passes at the buffer's size, light preset, on Medium only (Low has no post chain). The shader programs compile behind the title with the rest of the chain (`warmFrame`). Dynamic resolution was considered and left out: the tier governor already steps down on slow frames, and resizing the buffer mid-flight would cost a visible shimmer. Not measured: GPU time on a phone; this is the pass to check on a mid-range phone on Medium. Zoomed before/after in `/mnt/project-files/graphics-research/task7-sharper/`.

## Graphics pass 8: enemy hull shapes

The scouts, stalkers, strike fighters, warbirds and probes had flat extruded bodies. The kit gains `loft`: a fuselage through cross-sections (eight-sided, flat deck, chamfered shoulders), so noses taper, bellies slope and wings thin to an edge. Seven main bodies use it, with armour strakes along the shoulders of the two birds. About 120 triangles a body, merged into the same `hull` mesh as before: no new draws, programs or textures. Not measured: GPU time on a phone. Shots in `/mnt/project-files/graphics-research/task9-hulls/`.

## Graphics pass 9: sheared rocks

Each rock shape now carries one to three faults: the rock is cut along a plane and the far half slides sideways and lifts, so the outline gains real steps, shelves and overhangs that no noise on a sphere gives. Done once in `rockGeometry` when the shapes are built; the shape is then scaled so its farthest point stays at 1.2 (the hit radius the simulation uses is unchanged). Same triangle counts, instancing, draws and programs. A normal map on High was left out: the rock shader already paints its relief per pixel from procedural noise, and a texture would add memory for little. Not measured: GPU time on a phone. Shots in `/mnt/project-files/graphics-research/task10-sculpted-rocks/`.

## Graphics pass 10: occlusion baked into the hulls

`Kit.build(mats, cell)` can bake ambient occlusion: big faces are split to a fine grid (edges over 9 cells), a voxel map of every part is made, and each vertex looks out along its normal and a ring of eight for anything close. The result is a `kitOcc` vertex attribute that the kit metal shader uses to darken the foot of plates, the gap between module and deck and the roots of wings. Used for every designed enemy hull (cell 0.04) and the Wayward (cell 0.07); sites and the breakout still skip it. Costs nothing per frame. Cost at build: triangles grow about 40 to 60% on enemy hulls (scout 2.0k to 3.3k, heavy cruiser 4.0k to 5.5k) and 27% on the Wayward (45k to 57k); the bake takes roughly 20 to 160 ms per enemy hull and about 1 s more for the Wayward on the cloud container's CPU, all inside the existing warm-up behind the title (a phone will be slower: check the title's load time). Kit meshes get a `USE_KITOCC` define on the metal material, so other users of `metal()` are untouched. Not measured: GPU time and load time on a phone. Shots in `/mnt/project-files/graphics-research/task11-hull-occlusion/`.

## Graphics pass 11: cruiser and freighter shapes

The Custody heavy cruiser's keel and the freighter's bridge head are lofted like the fighters (the cruiser keeps a thin arrowhead deck over its keel). The Grinder drone stays a cube on purpose and the Thren hulls are already faceted crystal. All designed hulls already bake occlusion (pass 10), so the warm-up cost is unchanged apart from these two bodies (a few hundred triangles). Not measured: GPU time and load time on a phone. Shots in `/mnt/project-files/graphics-research/task12-more-hulls/`.

## The Wayward, reshaped to the artwork

The model was a wide, square brick with square pods far out on arms. It is now a long, slim hull (about 2.4 wide for 5.9 long) of octagonal armour stepping in to a rounded, sloping bow, with two round engine drums low on the flanks, banded in amber plate, each with a ringed drive housing and a small pale-blue ring round the throat (the flame colour is unchanged). The spine is lower, the name runs along both upper flanks and "03" is on the bow and stern. Play scale and hit size are unchanged; nozzles, running lights, the shield ellipsoid and the refit bay's part marks were moved to the new parts. With the occlusion bake the model is about 36k triangles (was about 57k): fewer, because the old pods and mounting carried much more detail than a round drum needs. Same draws and programs. Not measured: GPU time on a phone. Shots in `/mnt/project-files/graphics-research/wayward-ship/shots/`.

## Pass 7: hitches on a new system and when a panel opens

Found by profiling the dev server (software GL, so CPU time only) and the simulation in Node; write-up with scripts in `/mnt/project-files/perf-hitches/`.

| Cause | Change | After |
|---|---|---|
| `arrive` searched the chart once per system (`sightPlaces`, the Net's near list) | `within()`: one search out to N jumps | `arrive` 225 ms to under 2 ms; `newJourney` about 250 ms less |
| The far works baked hull occlusion (#255) and then dropped it | `farWorks` builds its hulls without the bake | about 300 ms less on every new sky, and fewer triangles in the far works |
| The sky's cube map outlived its sky (three frees it with the texture, not the target) | `Environment.setSky` disposes the old texture too | textures flat over five systems (was +1 each, 25 to 33 MB a cube) |
| The port drew the scene behind its opaque screen | `Sector.blind` while the port is open | no draw calls while docked |
| First dock fetched and decoded its pictures | `preloadPort` four seconds after Start | first dock shows at once |
| The tier governor stepped down on the slow first frames of a system or after a panel | `QualityGovernor.hold(120)` on a new system and when the world resumes | fewer needless post-chain rebuilds and full warm-ups |

Followed up: the sky's equirect-to-cube conversion linked a throwaway program for every sky (694 ms of a 1.1 s first frame here). The sky is now drawn on a dome with one material for the page's life (`Environment.dome`), the same texture, tone mapping and colour space, no cube map at all. Eight region skies compared before and after in software GL: same nebulae and orientation. Not measured: GPU time of the sky bake, real link and decode times on a phone.
## Graphics pass 12: haze, grade and theme

Matched to the reference shot: one cool steel-grey mood with teal and amber as the only accents.

- Fog is a dark steel haze (`#25323f`, density 0.0072, was near-black 0.0042), so far rock fades up out of the dark.
- The sky's floor is lifted to a dark blue-grey, and every palette is pulled 40% toward steel grey (the regions keep their hue).
- Rocks: cooler charcoal basalt, less warm cast; the far-off kind tint on basalt is halved.
- Post: saturation -14% and contrast +6% before tone mapping (Medium and High; Low has no composer). Faint star layer dimmed.
- Debris: 800 chips (was 560) on High, 480 on Medium (was 360), Low unchanged at 160; darker and cooler. Cost is one instanced draw, but phone frame rate is not measured here.
- Gate: a soft teal haze sprite behind the ring, and light materials (strips, lamps) are unfogged so the neon stays sharp at range.
- Wayward: paint moved from copper-orange toward ochre gold, with darker frames, as in the reference hauler.

## Graphics pass 13: light and rock surface

Close-up against the reference rock showed flat light and a smooth surface.

- The sun is lower (about 25 degrees, was 40), near neutral white, a touch stronger, and the sky fill is cut (0.58 to 0.36), so rocks get a lit face, a dark face and long relief shadows.
- Rock shader: scoured pits (dark inside, pale rims) and pale bare edges on sharp crests, in the existing noise (no new textures or geometry).
- Debris chips are lighter so their lit faces catch the sun; the star layers are finer and dimmer.
- Cost: a few more noise reads per rock pixel. Phone cost is not measured here.

## Graphics pass 14: engines, plume and shield ripple

- Nozzles (`wayward.ts`): each drum's throat is stepped inward by three dark rings at falling radii in front of the glow, ten armoured petals sit on the lip, with a few pale ticks. The glow disc is smaller and dimmer (it was a flat bright disc). A sloped stern fairing takes the hull's aft flank down onto each drum housing, with a small amber lamp. The model is now 39k triangles (was about 36k).
- Plume (`ships.ts`): the single cone is now a bell (a slight swell past the throat, a long taper) plus a second narrow hot core with shock diamonds. Streaks and wisps drift astern and build with distance; length and brightness follow the throttle as before, and each drive breathes on its own beat within a few percent. Same two meshes per drive and shared geometry; colours still come from the engine's core and bell. Plume starts at the exit lip, halo slightly smaller.
- Shield: there is still no standing bubble. The hit flare now ripples out from the side the blow came from (a bright spot and a ring over the lattice, bending it as it passes). The hit events carry an optional source position (`fx`, `fz`) for this; it changes no rule. A hit with no known source flares as before.
- Bench: `tools/ship.html?view=three&hit=30&age=0.2` freezes a flare from a bearing.
- Not measured: phone frame rate (the plume shader does a few more sine reads; geometry is small).

## Graphics pass 15: cargo, maintenance lights, lighter lattice

- Wayward: a layered container stack on each shoulder (three bays a side, a strapped lower tier and a shorter upper one), small orange maintenance lights in pairs by the hatches, stern and flanks (a dull orange under the bloom line, new `orange` material), and the stacks stay below the spine's tallest modules, so the silhouette and hit size are unchanged.
- Plume seen end-on: the bell and core keep a floor of brightness when viewed down the axis, so the flame stays readable from directly behind.
- Shield hit: thinner hex lines and lower weights; the field reads lighter.

## Graphics pass 16: background objects

The things that are drawn but never flown: the sky's far works, the situation props, the dead hulls in the space layer, and the capital ships.

- Far works (`farworks.ts`): the ring station is now 24 habitat blocks with lit window rows, docking arms, solar wings, two inner rings, a banded hub and a lit mast. Fleet hulls get their design lamps as real lit boxes. The hulk is torn open at the stern (ribs, spars, peeled plates, a few lumps), kept small beside the hull. The colours were too dark to read (the hull key was mapped to the darkest paint); they are lighter, with a faint cool lift on the shaded side, and plating grain is set per build (a station is built in plain units, a hull in hull units).
- The shapes and their occlusion bake are built once a session and re-skinned per sky. The earlier drop of the bake (about 300 ms per sky) is not undone: a new sky costs about 10 ms to re-skin and merge. First build (title warm-up) is about 40 ms for two works. Triangles: station 12k, fleet 12k, hulk 4k (it was 21k for the set).
- Site props (`site.ts`): all baked with occlusion (cell 0.4), windows on the settlement, foundry and rig, the wreck rebuilt as a real broken ship (lofted fore half, tear with frames, a stern adrift), the yard holds a lofted hull. Built when the stage changes: 30 to 110 ms on this machine, 1.3k to 5k triangles.
- Dead hulls (`space.ts`): plating cut three times finer (they are drawn 26 to 56 long on a one-unit model), baked occlusion (cell 0.09), a faint cool lift so a hull turned from the sun is not a hole. Five hulls built behind the title, about 40 to 110 ms each here.
- Capital ships (`enemies.ts`): their own metal at 2.6 times the fighter's plating grain and a little more wear, so the plates read as panels. Built the first time one arrives.
- Benches: `tools/farworks.html`, `tools/sites.html`. Shots in `/mnt/project-files/graphics-research/background-objects/`.
- Not measured: phone frame rate and memory (the added triangles are small; the plating shader is the one already in use).

## Graphics pass 17: the port

- `buildPort` (`breakout.ts`): pressure spheres in cradles and capsule tanks with bands and manifolds (were plain drums), a lit habitat ring with window decks, a control drum with a window band, docking arms with clamps, fenders, floodlight poles and hazard stripes, a cargo yard of corrugated containers, vent stacks. Windows use their own small, warm material (under the bloom line) so a lit deck reads as windows, not lamps. The beacon, damping ring and docking ring are unchanged.
- Baked occlusion (cell 0.6). Built once when the sector view is made: about 250 ms on this machine (about 40 ms of it geometry, the rest the bake), 13.4k triangles (was about 4k). A phone will take longer; not measured there.
- Bench: `tools/sites.html?prop=port`.

## Graphics pass 18: the singularity

- `singularity.ts`: the anomaly (hazard event) and the gravity well (space feature) share one black hole drawn as a single camera-facing quad and one shader: a hard premultiplied-black horizon that eats the stars behind it, a thin photon ring, a tilted accretion disc (hot white inside, violet outside, brighter on the approaching side, streaks that turn faster inward) and the far side of the disc bent over and under the hole. Violet and teal, never red.
- No scene read and no distortion pass, so the cost is one quad of fill and the look is the same on every tier, phones included. The starfield is not bent; the bent disc and the dark horizon carry the read.
- The anomaly's flat rings are gone; two faint flat rings (radius 14 and 19) stay on the gravity well as pull-radius cues. The old core, photon torus, halo and three rings of the lens feature are removed.
- Bench: `tools/sites.html?prop=singularity`.
- Not measured: phone frame rate (the quad covers a modest screen area; the fragment shader is about 4 noise lookups).

## Graphics pass 19: capital ships

- `capitalDesign` (`hulls.ts`): a boss is the fighter's design drawn about five times larger, so it gets a second pass of detail added to the same kit before the bake: the Custody cruiser carries hangar mouths with lit slits and hazard bars, two heavy spine turrets, point-defence mounts, hull numbers, cable runs, radiator fins and an antenna farm; the Gutter strike ship a boom crane, welded scabs with bolts, floodlights and a slung grab; the Office cruiser lit lines along its crescents, recessed gun housings, fins and one tall antenna; the Voice grinder frame ribs on every edge, chimney stacks and pipe runs.
- Built the first time a boss arrives, as before. Triangles per capital: lancer 8.1k, raptor 3.9k, warbird 3.4k, drone 6.3k (the plan's cap was 25k). The Thren web layer has no capital pass.
- Bench: `tools/enemies.html?view=capital&only=hulls&kind=lancer|raptor|warbird|drone&r=6` (logs the triangle count).
- Not measured: phone frame rate. The far fleet's hulls were not changed in this pass (they already carry real lit lamps from pass 16).

## Graphics pass 20: relic, curtain, veil and convoy

- Relic (`monuments.ts`): built from the kit and baked once: a stepped plinth, five twisted hex sections in worn cut stone with bevelled caps, grooves and cut bands down every face, a narrow cold channel with dashes on alternate faces, lit joints, a crown of prisms. Its lights are unfogged, so the seams keep their colour at range while the stone goes into the haze. The shard above it now has three smaller shards turning about it. About 4.6k triangles.
- Curtain: two layers of folds drawn with a new `curtainTexture` (a hard bright lower edge, rays thinning upward, soft sides), each fold shimmering slowly, instead of 22 vertical glow sprites. 44 sprites (was 22).
- Veil, static, storm, shroud: 12 fine drifting motes at different depths and speeds inside each bank (sprites only), so the cloud has volume.
- Convoy: nine real haulers (spine, cargo pods, bridge, lit window row, drive glow), 26 to 34 units long at 3.3 km, in the sky layer with the hull unfogged. About 350 triangles each, cloned from one build.
- Bench: `tools/sites.html?prop=relic` and `?prop=convoy`.
- Sprites per feature stay under the shared cap (220). Not measured: phone frame rate.

## Graphics pass 21: slipway, lanterns and derelict

- Slipway (`monuments.ts`): four lattice gantry towers on rails (legs, rings, cross-bracing in every bay on every face, decks, lamp masts), a travelling crane on the bridge, and an unfinished hull on the stocks (keel, 11 ribs, stringers, the stern end plated, cradle blocks, work lamps on poles, stacked plates). Lamps are unfogged. Built once, at the title warm-up with the other space models (`prepareSpace`): about 310 ms here, 20k triangles, almost all of it the occlusion bake. It is only shown when the ship is within 700 units. A phone will take longer to build; not measured.
- Lanterns: each of the nine buoys is now a small designed object (ballast, cage with rings, a lit lens, solar wings, mast with a beacon, a tether and weight), 1.2k triangles, cloned from one build. The glow sprite and the blink stay.
- Derelict (`enemies.ts`, `hazards.ts`): the hull is the Custody cruiser's capital design (hangars, turrets, antennas) in cold, worn metal, with a red beacon lamp that blinks and six drifting puffs of gas venting from a breach. Seven sprites, only while the event is live.
- Dead hulls in graveyards were already lifted in pass 16 and are unchanged.
- Bench: `tools/sites.html?prop=slipway|buoy|derelict`. Not measured: phone frame rate and phone build times.

## Graphics pass 22: bent stars, breached hulks, fleet detail and fog response

- Bent starfield (`singularity.ts`): a ring of stars is drawn in the same shader at the places the hole would put their images (a source position pulled in by the Einstein radius), stretched along the ring and brightest near it. It is a procedural field added over the real sky, which is not read, so there is no distortion pass and it costs one hash and a few multiplies a pixel on every tier, phones included. The real stars behind the hole are still eaten by the horizon.
- Breached hulks (`deadDesign` in `hulls.ts`): each dead hull is cut open on its top deck: a scorched recess, eight ribs with broken top bars, peeled plates, hanging cable and one cold lamp. Built into the kit before the bake, so the cost is the existing hulk build (a few hundred extra triangles each).
- Far fleet (`farworks.ts`): fleet hulls use the capital designs (hangars, turrets, antennas); the fleet work is 15k triangles (was 12k).
- Fog response (`thinFog` in `monuments.ts`): a material takes only a share of the scene fog. Relic stone 35%, slipway steel 50%, dead hulks 60%, lantern hulls 60%, so each keeps its dark shape and contrast at range instead of fading to one tint. Lights were already unfogged. The sky-layer works (fleet, station, convoy) stay fully unfogged.
- Not measured: phone frame rate.

## Pass 8: the first seconds of Arcade

Reported: the game feels slow for the first three or four seconds after Begin. Measured the CPU side only (draws stubbed so the software renderer's fill does not hide it; 568x320, dev server, Medium): `Begin` to the first frames.

| Cause | Change | After |
|---|---|---|
| Arcade makes a new sky every run and the title draws nothing, so the sky bake (planet, far works, cube dome) landed on the first frame of play | `Sector.stageSky`: the sky is painted behind the title when Arcade is picked (and after a difficulty change), and the world is restarted as Arcade then, not on Begin | first frame 116 ms to 46 ms of JS (the sky share, 46 ms plus the far works, is gone) |
| Two shader programs still linked after Begin: the sun's depth pass for the Wayward's hull parts (one with the alpha-tested plates). The warm frame never reached them: the sun sits at the origin until the first real frame, so its shadow camera culled everything | `warmFrame` places the sun first, shows the hidden pools and the throwaway hull gallery (casting), gives empty instanced pools one instance for that frame, and draws once through the chain; the hidden bulwark proxy casts too, so the depth program for the first bulwark (met when the first wave arrives, 3 s in) links early | programs compiled after Begin: 0 (was 2, on Low none). Buffers and textures of the hidden pools and the gallery are uploaded behind the title too |

**Not measured here:** the GPU. The sky bake and the first draw of every hull, plus real link time, are phone costs; the CPU numbers only show the work moved off the first frame. Trade-off as before: a very fast tap on Begin can wait for the end of the warm-up. Real device: the first four seconds of an Arcade run on a phone, and the title's own load.

## Pass 9: Chrome's first minute, and the road's flag sums

Reported: much worse in Chrome than Safari, worst in the first minute. Nothing in the 2026-10-30 merges touches the renderer (checked: sim steps 0.05 to 0.08 ms on the road, layout and style counts equal to before #385, heap equal after a forced collection), so this pass takes the two older, safe costs found:

- The HUD's glass blurred the live canvas under every box each frame (`backdrop-filter`, about 6 px). A phone already went without it; the desktop now does too, with the fill a little darker. Pop-ups keep their blur (the game is paused behind them).
- `derive()` (`sim/evidence.ts`), run every step on the road, copied the flag set dozens of times: 100 to 360 us a step, now 20 to 34 us (`sim/threads.ts` reads a set as it is).

**Not measured:** Chrome's GPU time. If it is still slow, try `?quality=low`, and `?nospace` in the address bar and a DevTools Performance recording of the first 60 s.

## Pass 10: the Story's first system (2026-11-06)

Reported: "the first system loading isn't working great" in Story mode. Measured by launching a new Story journey in headless Chromium (software GL, 568x320, Medium): the first frame took 580 to 770 ms and linked three shader programs. Causes, all in the first frame after Begin (Arcade was already staged, the Story was not):

| Cause | Change | After |
|---|---|---|
| The Story's sky (bake, cube map, far works) was painted on the first frame | `Sector.stageSortieSky`: while the difficulty is chosen after "New journey", and behind the title when a saved journey is the first row; not for the system after a jump (its sky turns with the ship's heading) | `setSky` is off the first frame (was 150 to 165 ms of JS) |
| The storm cell, rift and black hole shaders are made per sky and freed with it, so a sky with one linked it again, in play | `Phenomena` keeps one hidden copy of each for the page's life | 0 programs linked after Begin from these |
| `kit.ts` put the hull scale and bump strength in the program cache key, though they are uniforms: every hull size (the company's big ships and yard) was a new program, first linked when it came into view | scale and strength left the key | programs 97 to 82; 0 linked after Begin |

First frame 580 to 770 ms became about 150 ms; no program is linked after Begin.

**Not measured:** a real phone or GPU, and the Continue path on a saved journey (same code, not timed).

## Pass 11: arriving after the first jump (2026-11-06)

Reported: still "a little bad" after the first jump. Measured by flying the Story's first jump in headless Chromium (software GL, 568x320, Medium) and counting shader programs per frame:

| Cause | Change | After |
|---|---|---|
| Ned's yard made its four point lights when it was built, on arrival, and hid them while it was not due. A hidden light is not counted, so the scene's light count went 6 to 10 and **every lit material linked again** (about 30 programs: rocks, hulls, the Wayward's paint) a few seconds into the system | the four lights exist from page start and the group is always visible (intensity 0 does the work) | programs after arrival: 84 flat (was 84 to 114); no relink |
| The first frames of a new system (sky bake, station and hull builds, texture uploads) ran in view | `settle()` in `main.ts`: after a jump the world takes 12 idle steps unseen, the sector builds, every program is compiled and drawn once (rounds, until none is new), all behind the jump's veil with the world held; the veil then fades over 0.7 s | the first-frame cost happens under the veil, not in play |

**Not measured:** a real phone or GPU. In software GL the first frame still takes about 7 s, now under the veil; the real cost is far smaller but not known. The hold adds that time to the jump on a slow device.

## Pass 12: the phone readout (`?perf`)

The cloud has no GPU, so the cost on a phone has to be measured on the phone. Add `?perf` to the address (a branch preview or the live game) and a small panel opens top left:

- **fps, frame, worst, slow:** the wall-clock interval between frames over two seconds; "slow" is the share of frames over 20 ms (below 50 fps).
- **cpu:** our own work per frame, render submission included, simulation excluded.
- **gpu:** the frame's GPU time from `EXT_disjoint_timer_query_webgl2`. Most Android Chrome has it; iOS Safari does not ("n/a"), so on an iPhone read fps and use the switches.
- **draws, tris:** every pass of the frame counted (shadow, scene and post), not only the last.
- **Low, Medium, High:** pin a tier (the governor stops judging).
- **Switches:** each takes one layer out of the frame until pressed again. Post (no bloom, grade or edge smoothing), Shadow (the sun's shadow map is not redrawn), Sky (the nebula dome), Stars (stars, far worlds, sun, the deep, dust), Rocks (drawn only: they still collide), Debris, HUD (hidden), ½ res (half the drawing size).

How to read it: fly a minute in a busy field, note fps, then press one switch at a time. The switch that moves fps most is where the phone's time goes. If ½ res moves it most, the phone is fill-bound (the post chain and the sky); if Rocks or Shadow does, it is geometry. The first second after Post or a tier switch hitches (shaders link again); the readout restarts its window on every press.

Counts at 844 x 390 (3x), Medium, Arcade at cruise, software GL: 122 draws and 206k triangles; Post off 105 draws, Shadow off 108 draws and 156k triangles, Stars off 89 draws, Rocks off 106 draws and 169k triangles.

## Pass 13: fewer full-screen passes, sky behind the solids

From the plan of 2026-11-14 (phone fill rate is the limit; a Medium frame was about 20 full-screen or part-screen passes).

| Change | Passes or pixels saved | What you see |
|---|---|---|
| Bloom blurs over 5 levels, not 8 (`post.ts`) | 6 small passes a frame, every tier with a post chain | Same glow: in an A/B of one frame on High, 10% of pixels moved, by at most 25 of 255 (the faint outer halo) |
| A phone (coarse pointer) on Medium smooths edges with FXAA after the tone map, not SMAA | 2 full passes (SMAA takes 3, FXAA 1) | Edges a little softer on phones; desktop keeps SMAA |
| The nebula dome draws last of the solid things (`renderOrder` 1000, was -1000) | The sky's shader no longer runs under rocks, hulls and planets | None: the same frame drawn both ways is identical to the pixel (with a black hole and with a rift) |

Not done, after a look: culling the far group (sun, planet, far works are 30k triangles; a phone's cost there is fill, and fill off screen is already free) and trimming the sun's glare and lens ghosts (the ghosts only show when facing the sun, and are small). A/B frames in `/mnt/project-files/perf-pass/`.

**Not measured:** the phone. With `?perf` (pass 12), Post on and off before and after this pass is the check.

## Pass 14: a Phone tier, and a governor that climbs

The owner chose not to run `?perf` on a phone (2026-11-16), so this pass is set from what can be measured here. **Not measured on a real device:** frame rate, GPU time, heat, battery, or whether the Phone tier's softer picture is noticed on a phone's screen.

**The ladder** is now Low, Phone, Medium, High (`render/quality.ts`). Phone is Medium's look (bloom, grade, colour mood, sun shadow 512, FXAA on touch screens) at one pixel per CSS pixel, without the sky's moving detail tile, with 320 debris chips. Before, a phone that struggled fell from Medium straight to Low and lost all glow and the grade at once.

| Tier, at 844 x 390 (a 3x phone) | Drawing size | Draws | Triangles | Software raster time a frame |
|---|---|---|---|---|
| Low | 844 x 390 | 96 | 116k | 187 ms |
| Phone | 844 x 390 | 138 | 188k | 265 ms |
| Medium | 1055 x 487 | 136 | 203k | 424 ms |
| High | 1266 x 585 | 137 | 241k | 800 ms |

Software raster time is SwiftShader's (the CPU drawing the GPU's work) through the readout's GPU timer, the median of six two-second windows in Arcade. It is not a phone's time, but it scales with pixels shaded, which is what limits a phone: Phone costs about 62% of Medium.

**Where a device starts:** a touch screen on Phone, a computer on High, or wherever this device settled last time (`wayward.tier` in local storage, kept 14 days).

**Climbing:** after 30 s of frames that keep up with the display (smoothed interval under about 18 ms, steady) the governor asks for the tier above. The page makes the change only while the world is held (a pop-up or the pause card, not the bay or a jump's settle), with the usual warm-up of new shaders. A tier it then has to leave becomes the device's ceiling and is not tried again, so the picture never flickers between two tiers; a steady 30 fps cap and a jittery frame never count as room. Down steps are as before (3 s under about 48 fps, at once). `?quality=` and Battery saver still pin a tier.

Trade-off: a phone that could run Medium spends its first half minute and first pop-up on Phone. A phone that can't spends at most 3 s too slow, once, on the step it tried.

Shots: `/mnt/project-files/perf-pass/tier-phone-phone.png` and `tier-phone-medium.png` (different skies; the run picks its own).

## Pass 15: lean meshes and a governor that breathes (2026-11-23)

Since pass 14 the far rocks, the backdrop and the field went to full detail (the space distance pass), and tiers never changed meshes, so a phone drew nearly three times the triangles: Phone 188k to 543k, Low 116k to 367k (Arcade, 844 x 390).

**Lean meshes** (`render/lean.ts`): decided once, before the sector is built. On a touch screen, or a device that starts at Phone or Low, rock meshes are built at about half the detail: field rocks 8 subdivisions (was 11), bulwarks 14 (22), the backdrop 2 (4), the sky's 150 far rocks 3 (7). A computer keeps full detail on every tier. A phone that climbs to Medium keeps the lean meshes.

**Breathing** (`QualityGovernor`, `breathe` on touch screens): when frames run slow, a phone first draws at 85%, then 75% of the tier's size, and only then drops a tier (which starts again at 100%). At Low with nothing left to give it holds an even 30 fps for the session (`thirty`), rather than juddering between 35 and 50. With room it gives the size back first, at the same quiet moments as a tier. A change of size only resizes the canvas: no shader work.

| Arcade at 844 x 390, touch | Draws | Triangles |
|---|---|---|
| Phone, before | 147 | 543k |
| Low, after | 104 | 220k |
| Phone, after | 133 | 289k |
| Medium, after (lean) | 132 | 311k |
| High, after (lean) | 163 | 354k |

The Story's first system on Phone, after: 190 draws, 400k triangles; the rest is the far works and stations, which the rendering thread owns.

`node tools/phone-bench.mjs` (with the preview on :4179) prints this table for Arcade and the Story; run it before and after any change to what a frame draws. Already true and checked: shaders for the starting tier compile behind the title (`Sector.warm`); scene textures are about 16 MB, so memory is not a phone risk.

**Not measured:** a real phone. Triangles and draws are what a phone pays for and what this cloud can count; frame times here are software rendering.

## Pass 16: blocky on phones (2026-11-24)

The user said the game looked blocky. Audit, in order of the brief:

- **Resize.** Fine. A ResizeObserver on the canvas refits the renderer, the camera's aspect and the composer
  (`main.ts` → `fitRenderer` → `sector.resize` → `post.setSize`, which sizes to the drawing buffer).
- **Drawing size.** The cause. Phones (coarse pointer) start on the Phone tier, whose `dprCap` was 1: on a 3x
  iPhone in landscape the scene drew at 750×342 and the browser stretched each pixel three times, with only FXAA
  to soften it. The breathing governor could take it to 0.75 of that. Desktop High draws at dpr 2 and was fine.
- **Post.** Fine. The composer's targets follow the drawing buffer; only the bloom runs at half size, which its
  mipmap blur hides.
- **Antialiasing.** Low had none at all (`msaa: false`, and Low skips the post chain).
- **Textures.** Fine: mipmapped, linear, anisotropy 4–8 on the plating; the sky bake is 4096. Nothing to gain.
- **Geometry.** Lean meshes on phones: the backdrop rocks at icosphere detail 2 (about 180 faces each) and the
  sky's far rocks at 3 showed facets on their outlines. Near rocks and hulls are dense enough.
- **Shadows.** The Phone tier's 512 map over a 76-unit window stepped visibly along the hull.

Fixes, kept small:

| Change | Before | After |
|---|---|---|
| Phone `dprCap` | 1 | 1.5 (3x iPhone: 750×342 → 1125×513) |
| `SCALES` (phones breathe down) | 1, 0.85, 0.75 | 1, 0.85, 0.75, 0.67 (1.5 × 0.67 ≈ 1, the old size, before a tier goes) |
| Phone shadow map | 512 | 1024 |
| Low canvas MSAA | off | on |
| Backdrop rocks, lean | detail 2 | 3 |
| Sky far rocks, lean | detail 3 | 4 |

A phone that can't keep up still ends where it was before (about one pixel per CSS pixel) by breathing, then
drops a tier as before. Measured in the cloud (software WebGL, iPhone 13 landscape emulation): buffer 1125×513
@1.50, 451k triangles. Not measured: the real GPU cost on a phone; 2.25x the pixels is the main cost and the
governor is what pays for it. Shots: `/mnt/project-files/vfx/blocky/`.

## Pass 17: the main thread, frame by frame (2026-11-27)

A frame bench, then the HUD's browser work, which was the biggest single cost.

**The bench** (`node tools/frame-bench.mjs`, starts its own dev server). The scripted pilot flies a busy Arcade
run and the Story's first system through the real renderer and HUD, one step a browser frame, with
`Math.random` seeded. It splits each frame into the sim step, events, scene updates, three.js's submission and
the HUD, and a trace adds the browser's style, layout and paint, garbage collection and the worst frames. GL draws
are stubbed by default (software WebGL would swamp the numbers); `--gpu --nostub` times the software raster
instead, and `--freeze --shots` takes identical frames to compare pixels. The sim is cheap (0.1–0.2 ms a step).

**Found** (CPU profile and invalidation trace, 1600 × 900 High):

- `html:has(#comms:not([hidden])) #pause` made every HUD text or class change restyle every `div` and `p` on the
  page: 3 ms a frame on average, spikes up to 125 ms. Now a sibling selector (`#comms:not([hidden]) ~ #pause`),
  same rule, same result.
- `Sector.project` (every marker, every frame) and the radar read the canvas's `clientWidth`, which forces a
  layout after each DOM write: 18% and 13% of the JS profile. Both keep the size from their resize now.
- Restarting a CSS animation read `offsetWidth` (a forced layout) on every hit flash and lock tick. `ui/replay.ts`
  takes the class off and puts it back on the next frame instead, so a flash starts one frame (16 ms) later.
- Threat markers rewrote `className` every frame; now only when it changes. Debris used `Math.hypot`, which
  allocates in V8 (17 MB in 30 s); now `Math.sqrt`.

**Measured** (45 s, paced at 60 fps, draws stubbed; mean | p99 in ms; before → after):

| Run | HUD | Style | Main thread total | Frames over 8 ms |
|---|---|---|---|---|
| Desktop Arcade | 3.32 \| 9.10 → 0.98 \| 2.90 | 3.11 \| 7.43 → 0.92 \| 1.94 | 8.07 \| 16.4 → 5.39 \| 10.9 | 1,150 → 113 |
| Phone Arcade (844 × 390 @3) | 2.20 → 0.98 | 2.16 → 0.72 | 5.98 \| 13.5 → 4.61 \| 10.1 | 395 → 52 |
| Phone Story | 1.39 → 0.60 | 1.23 → 0.33 | 5.19 → 4.11 | 116 → 29 |

Desktop Arcade frames over 16.7 ms: 22 → 2. Forced layouts a frame: 1.54 → 0.81. Garbage is about 17 MB/s from the
game itself (three.js's uniform setters, debris, radar colour strings): a later pass.

**Not measured:** a real device. These are main-thread times in a cloud browser; a phone's CPU is slower, so the
saving there should be larger in milliseconds, but nobody has timed it.

### Pass 17, part two: the GPU skips work that adds nothing

Software WebGL can't time a real GPU, but it does rasterise every pixel, so `--gpu --nostub` gives a relative
measure of fill cost, and `--freeze --shots` gives identical frames to compare pixels.

- **Dark point lights.** The scene keeps about ten point lights (the blast pool, yard lamps, the ship's lamps) at
  intensity 0 when unlit, so the light count never changes and no shader relinks (pass 11). Each still ran its
  whole lighting sum on every lit pixel. `render/lightskip.ts` wraps the loop body in a test on the light's colour,
  a uniform, so all pixels take the same branch and a dark light adds exactly what it did before: nothing. In a
  busy Arcade frame 8 of the 10 were dark.
- **Sun shafts** (Medium and High) are a full-screen pass of 22 reads a pixel. With the sun out of view it adds
  nothing (`uOn` 0), so the pass is switched off for that frame.
- **Idle effect pools.** Sparks (1,800 slots), debris and the flame and smoke puffs walked every slot, uploaded
  their buffers and drew zero-sized points on every frame, alive or not. Each pool now sleeps, hidden, when nothing
  in it is alive, and wakes on the next emit. The warm-up still draws them once behind the title.

| Software raster, one frame, 1600 × 900 High | Before | After |
|---|---|---|
| Arcade (two base runs) | 2,483 / 2,382 ms | 1,997 ms (about −18%) |
| Story's first system | 1,836 / 1,631 ms | 1,407 ms (about −14%) |

Pixels (frames 20 and 44, Arcade and Story): two base runs match exactly; before against after, 29 to 60 of 5.76
million channel values differ, by 1/255 at most (rounding in a different instruction order); the idle pools alone change none. Idle pools on the CPU
side: about 0.5 ms a frame less on the phone runs, within noise on desktop.

**Not measured:** a real GPU. The saving is in fragment work, which is what phones are short of, but its size on a
phone is a guess until someone plays the preview.

### Pass 17, part three: no program switches in a frame

`--switches` logs every draw where three.js changes a material's program. Before: about 7 a frame in Arcade and up
to 15 in the Story, each one rebuilding the material's parameters and cache key (the biggest garbage three.js made).

- **Glow drawn once** (`render/singlepass.ts`). three.js draws a transparent double-sided material twice, back faces
  then front, switching its side in between. For added light with depth writes off the order doesn't matter, so a
  material that is additive, writes no depth and never reads its normals or facing now draws in one pass. Checked on
  every draw, so a material that changes later (hulls fading) is never caught out.
- **Depth for instanced casters** (`render/casters.ts`). The sun's shadow pass shared one depth material between
  instanced pools and plain meshes, which need different programs. Rocks, shards and hulls bring their own copy.

After: no switches in either run. Pixels: identical to the bit in all four test frames (the shield's additive bubble
is in them). One catch for anyone comparing pixels: a new three.js material takes two values from `Math.random` for
its id, which moves the bench's seeded world, so the check held the sequence still around the two new materials.

| 45 s, paced, before → after | Garbage (with the pilot's) | GC runs | Main thread mean |
|---|---|---|---|
| Desktop Arcade | 20.1 → 17.6 MB/s | 41 → 36 | 5.53 → 5.41 ms |
| Desktop Story | 21.1 → 16.2 MB/s | 39 → 29 | 4.25 → 4.47 ms |
| Phone Arcade | 19.8 → 17.1 MB/s | 37 → 32 | 4.73 → 4.10 ms |
| Phone Story | 21.4 → 16.2 MB/s | 37 → 30 | 4.06 → 3.92 ms |

The frame times are within run-to-run noise here (the seeded worlds differ, as above); the garbage and GC counts
are the reliable part. Also a few fewer draws: a double-sided glow is one draw, not two.

**Shader links in play.** The bench now names any program linked mid-run (`linked in play:`). In 45 s of each of the
four runs, none: the warm-up behind the title covers everything these runs drew. The odd 20–40 ms frame left (about one
in 45 s) has no compile, GC or style work behind it in the trace; it may be the cloud machine, and only a real device
can say.

## Pass 18: a laptop at 19 fps on High (2026-11-27)

Reported on a laptop, Story, Ringhold: "sometimes slow to respond, juddery". The `?perf` readout: 19 fps, frame
51.8 ms, every frame slow, CPU 6.2 ms, tier High at 2878 × 1322 (a 1440 × 661 window at a pixel ratio of 2),
642k triangles, 371 draws. The CPU had time to spare; the GPU was drawing 3.8 million pixels a frame through the
post chain, so the game was fill-bound. At 19 fps two or three frames queue behind the GPU, which is the slow
response: the eye sees a turn 100–150 ms after the key.

**Why the governor kept High.** Three things, any of which can do it:

- Verdicts were counted in frames (180, plus 120 of grace after every pop-up): three seconds at 60 fps, but about
  16 s of uninterrupted flight at 19 fps. The Story's cards and calls often come sooner.
- A computer had no step between High at a pixel ratio of 2 and Medium at 1.5, then Phone, then Low (no bloom). Each
  step gave up part of the look and only a quarter of the pixels at most.
- A tier button in the `?perf` readout pins that tier for the session; the readout did not say so.

**Changes** (`render/quality.ts`, `render/post.ts`, `ui/perf.ts`):

- Verdicts and grace are in seconds: three seconds of frames, two of grace, at any frame rate.
- A computer draws smaller before it gives up a tier: `WIDE` scales (1, 0.85, 0.75, 0.67, 0.5) of the tier's
  pixel ratio, never below one pixel per CSS pixel, so a screen of ratio 1 drops tiers as before. Every effect stays;
  the 3D picture is softer at the bottom step (the HUD is HTML and stays sharp). A slow verdict goes straight to the
  size whose pixels would fit the frame if the frame were all pixels (the least it could need), not one step at a time.
  Past the bottom step it drops a tier at about the same pixel ratio. The size climbs back at a quiet moment after
  30 s with room, as tiers do; a size that proves slow after a climb is not tried again on that tier.
- Twenty stalls (frames over 100 ms) in a row count as measurements: one long frame is a tab switch, a run of them
  is a machine that slow (before, a GPU under 10 fps was never measured at all).
- Sun shafts skip their 22 reads on pixels they cannot touch (far from the sun on screen, or near): the same
  picture by construction (they added zero there).
- `?perf`: an Auto button, and the tier line says `auto` or `pinned` and the drawing size.

**Measured here** (software WebGL, Story, a 720 × 330 window at ratio 2, one frame, median of four; a CPU raster, so a
guide to fill, not a GPU's milliseconds): full High 924 ms; at ratio 1.5, 694 ms; at ratio 1, 376 ms. Taking one
layer out at ratio 2: post chain −24%, far stars −9%, rocks −6%, shadows −3%, sky and debris within noise. The
pixel count is the lever. A model of the reported laptop (6 ms fixed, the rest fill) settles at 60 fps on High within
seconds in `tests/quality.test.ts`.

**Not measured:** a real laptop GPU. The model assumes the 52 ms frame is almost all fill; if part of it is fixed GPU
work (the 4096 shadow map, triangles), the governor takes a further step, then Medium at about the same pixel ratio.

## Pass 19: still about 19 fps on Low (2026-11-27)

A screen recording after pass 18 (Arcade, same laptop, a MacBook Air going by its name): 14–20 fps in flight on every
tier, Low at one pixel per CSS pixel included, and 60 fps on the title (which draws no 3D and no HUD). The frame barely
changes with the tier, so the 3D picture's pixels are not what holds it back on this machine; something that costs the
same on every tier is.

**Found** (cloud, `?quality=low`, a 1440 × 661 window at ratio 2, GL draws stubbed, Chrome's layer tree and trace):
the HUD was one composited layer the size of the screen, and the marks, brackets and pointers that move every frame
were painted into it, so the layer repainted every frame (77 paints in 60 frames), corner pools and text with it, at
the screen's full density. `#world` (the moving marks) now has its own layer (`will-change: transform`): the HUD's
layer paints 0 times in 60 frames, `#world` alone repaints, and Chrome's raster work falls from 77 to 25 ms a second
in Arcade (16 to 7.6 in the Story's first system). Screenshots at desktop and phone sizes: the HUD's pixels are the same.

**`?perf` Test.** One button holds the tier and times the whole frame, then each layer off in turn and half size, about
three seconds each, and prints one line of frame rates; the readout also names the GPU the browser drew with. A layer
whose removal lifts the rate is the cost; nothing lifting it says the page or the machine.

**Not measured:** the laptop. Chrome's GPU raster of the HUD is a likely share of a cost that does not change with the
tier, but nobody has timed it on that machine; the Test line from it would say where the rest goes.

### Pass 19, part two: start at the size the device settled on

Reported after #640: better, but still slow, most of all at the start of an Arcade run. Since pass 18 a laptop mostly
moves its drawing size rather than its tier, and only the tier was kept between visits (`wayward.tier`), so every visit
began at full size: two seconds of grace and three of measuring at about 19 fps before the size came down. The kept
record now holds the pixels per CSS pixel the device last drew at too (`saveTier`, written on every move), and the
governor starts there (`startAt`). It still climbs back at a quiet moment when there is room. Not measured on the laptop.

## Pass 20: an Apple M1 at 9–15 fps on Low (2026-11-27)

A second recording, with pass 19's readout: Apple M1 (ANGLE over Metal, Chrome), Low pinned, 1439 × 661 at ratio 1,
about 100 draws and 250k triangles, our CPU work 5 ms, 9–15 fps, the GPU timer 100–150 ms. That GPU has room for
many times this; a frame that costs the same on every tier and leaves the CPU idle points at the GPU process waiting,
not drawing. Also reported: after the ship dies, the run report takes a long time to come.

**Slow motion below 20 fps.** The loop clamped a frame to 0.05 s (three steps), so under 20 fps the whole game ran slow:
at 12 fps, at 60% speed. That is part of "sluggish", and it stretched the 1.8 s death drift to about 3 s. The clamp is
now 0.1 s (six steps; a step costs about 0.2 ms), so the game keeps real time down to 10 fps; a stall longer than that
is still dropped. The death drift is 1.2 s (was 1.8).

**Buffers rewritten whole** (`render/orphan.ts`). Counting WebGL calls in an Arcade frame on Low: about 1,000 calls,
nothing unusual, except 58 `bufferSubData` a frame rewriting about 340 KB of vertex buffers in full (instance matrices
and colours, sparks, dust, streaks), most of them made with the static hint. Writing into storage the GPU may still be
reading makes a driver wait or copy; Metal through ANGLE is the likely place for that to stall. A rewrite of a whole
buffer now asks for new storage instead (`bufferData`, dynamic: "orphaning"), so nothing waits. Frames 20 and 44 of the
frame bench (`--freeze --nostub`, Arcade, Low): byte for byte identical with and without it.

**Not measured:** the M1. Orphaning is the standard cure for this stall, but whether it is this laptop's stall only the
laptop can say; the `?perf` Test line will show it.

## Pass 21: Safari 60 fps, Chrome 9–15, one M1 (2026-11-27)

The owner's `?perf` in Safari on the same MacBook Air: High, 1440 × 701 at ratio 1, 164 draws, 694k triangles, CPU 2.2 ms,
60 fps. Chrome and Brave (one engine) on the same laptop: Low, 9–15 fps. So the game is not too heavy for the laptop;
the gap is inside Chrome's GPU process. In the cloud's Chrome with every draw stubbed out, an Arcade frame costs about
3.7 ms of page work (script 2.4, style 0.3, layout 0.1) at 60 fps, HUD shown or hidden: the page is not the cost either.
Still not found: what Chrome on that Mac spends 70 ms a frame on.

**The helm and the picture out of step.** Reported as "the controls don't feel in sync with what's on screen". Every kill,
blast, shield hit, hull hit and rock hit held the simulation still for 30–60 ms (a hit-stop) while drawing went on. In
a fight that is several dead beats a second where keys do nothing, and at 10–15 fps each one ate half a frame of
movement. Now only the big moments hold (an elite or a cruiser going up, a broken bulwark, lost cargo, the death), and
nothing holds on a frame slower than 1/30 s. Shakes and slow motion for big kills are unchanged.

**Fewer page writes per frame.** Chrome (and any extension watching the page) does work for every attribute write,
changed or not. `classList.add`/`remove`, `hidden = true` and `setProperty` all write even when nothing changes. The
targeting layer and the HUD now write only on change (`toggle(name, on)`, `hide()`, `css()`): 19 writes a frame down to 7
in an Arcade fight on Low, the rest real movement of edge markers.

**Not measured:** Chrome on the M1. The `?perf` Test line run in Chrome would show whether any one layer holds the
cost, or none does (then it is Chrome's own compositing).

## Pass 22: the Test line from Chrome on the M1 (2026-11-27)

Two runs of the `?perf` Test in Chrome on the owner's MacBook Air (Arcade and Story, Low at 1439 × 661, MSAA on):

    all 19 · -Post 19 · -Shadow 20 · -Sky 17 · -Stars 19 · -Rocks 22 · -Debris 16 · -HUD 17 · -½ res 32 · bare 53 · empty 60
    all 17 · -Post 18 · -Shadow 18 · -Sky 18 · -Stars 21 · -Rocks 22 · -Debris 17 · -HUD 16 · -½ res 34 · bare 48 · empty 60

No one layer holds the time. Half size nearly doubles the rate; with no picture the page keeps 60. Fitting the first run
to "fixed + pixels" gives about 24 ms a frame that does not shrink with size and about 28 ms of pixels at full size:
both several times what an M1 needs (Safari draws High at this size at 60 fps). A GPU that is slow at everything
alike, in Chrome and Brave but not Safari. Not a translated (Intel) browser: the owner's Brave is the arm64 build
(Chromium 145 on macOS 27.0.1). A new macOS with Chromium's Metal path (ANGLE) is the likeliest place left; the
readout now also prints the browser's own architecture (`browser arm-64`, from client hints) so the next readout says.
Suggested to the owner: `chrome://flags/#use-angle` set to OpenGL, then the Test again.

**Low may draw a little smaller on a computer.** Low was held at one pixel per CSS pixel, so a computer that is still
slow there had nothing left. Low now steps down to two thirds of that (`LOW_FLOOR`, WIDE 0.85, 0.75, 0.67) before it
stops; other tiers keep the floor of one. From the fit above, about 27 fps instead of 17–19 on that laptop; a slightly
soft picture over a juddering one. Not measured there.

## Pass 23: Low to half size, then an even 30, on a computer (2026-11-27)

The owner can't run browser experiments, so the fix stays inside what their Test line measured: Chrome on the M1 drew
Low at 17–19 fps at full size and 32–34 at half. Low on a computer now steps down to half a pixel per CSS pixel
(`LOW_FLOOR` 0.49, WIDE down to 0.5), and once nothing is left, the governor holds an even 30 (`thirty`, as phones
already did) instead of a ragged rate. The kept record starts the next visit at the size it settled on. The HUD is page
text and stays sharp; the 3D picture is softer on that machine only. Safari on the same laptop stays on High.
Not measured on the laptop: the 30 is from the Test's half-size reading, not a run at this build.
