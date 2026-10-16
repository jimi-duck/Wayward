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
