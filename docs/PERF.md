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
