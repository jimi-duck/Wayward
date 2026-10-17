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
