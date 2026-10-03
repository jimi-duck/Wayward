# Architecture

Asteroid Blaster in 3D: a rebuild of the canvas game hidden in the portfolio
(`Portfolio-Frog/js/game.js`), playable on desktop and mobile from a website.

## The original, in one paragraph

A survivors-style roguelite. Phasers fire themselves, so steering is the only
control. Kills drop dilithium; a full rail opens a refit card (one of three from
17 upgrades). Near misses charge an overcharge that Space releases. Every ~68s a
capital ship hails and you choose to fight or flee. Pressure rises every second
until the hull reaches zero. There is no win state and no audio. Its tuning was
balanced with a scripted pilot and the reasoning lives in the code comments and
`COPY-game.md`. **Port its numbers, don't re-invent them.**

## Decisions

| Area | Choice | Why |
|---|---|---|
| Flight model | Flat play plane for the ship, full 3D for everything else | Keeps all the original tuning; touch stays one thumb. The ship banks and pitches visually; a barrel roll is a dodge. Since the gritty pass, enemies and fire use altitude, and the gunnery computer and torpedoes reach them there. |
| Rendering | Three.js, plain TypeScript | Light, mature, best custom-shader ecosystem; WebGL2 runs on every current phone. |
| Build | Vite + TypeScript | Fast reloads; `npm run dev:phone` serves to a phone on the same Wi-Fi. |
| Collision | Custom: spatial hash; sphere, ray and segment tests | The original is circles, rays and segments on a plane, with hand-tuned arcade handling. A rigid-body engine would add WASM weight and fight that tuning. |
| UI | DOM/CSS over the canvas | Ports `game.css` and the copy deck; sharp text; accessible. |
| Audio | Web Audio | Spatial panning and generated SFX, small download. |
| Hosting | GitHub Pages via Actions | Same host as the portfolio; built on every push to `main`. |

## The one rule

**The simulation never imports Three.js.** It advances in fixed 1/60s steps on
plain data (`src/sim`). The renderer reads that state every display frame and
interpolates between the last two steps (`alpha`). So a run plays the same at
60Hz, 120Hz and 144Hz, and the simulation can run headless for balance tests.

```
input ──InputFrame──▶ sim (fixed 60Hz) ──state──▶ render (every frame, interpolated)
                        │
                        └──events (M2+)──▶ effects · audio · UI
```

## Layout

```
src/
  core/      loop (fixed step, interpolation, freeze, clamp), math
  input/     keyboard, touch stick, gamepad → one InputFrame per step
  content/   data: the hull, the refit tree, long-term unlocks and modifiers
  sim/       game state and rules (never imports Three.js)
  meta/      the profile between runs (localStorage)
  render/    renderer, quality governor, scene
  ui/        DOM overlays: HUD, panels (refit, hail, report, logbook), debug
  styles/    CSS, tokens carried over from the original
tests/       unit tests (Vitest)
tools/       the scripted pilot and the balance report (npm run pilot)
docs/        this file, DESIGN.md (the game), BALANCE.md (the latest report)
```

M1 adds `content/hulls.ts` (the three hulls), `sim/ship.ts` (the flight
model, ported step for step from the original), `sim/controls.ts` (what a
stick means under each camera), `render/camera.ts` (the tactical and chase
rigs), `render/ships.ts` (stand-in models, banking, roll, trails),
`render/environment.ts` and `render/scenery.ts`.

M1b adds `sim/field.ts` (rock that splits), `sim/weapons.ts` (phasers and
torpedoes), `sim/events.ts` (what happened, for effects and the log),
`render/rocks.ts`, `render/fx.ts`, `render/weapons.ts`, `render/post.ts`
(bloom), `render/schematic.ts`, `render/textures.ts` (everything painted at
startup) and `ui/console.ts` (the bridge console). The tactical camera is
gone: the user chose the chase camera.

The cyberpunk pass replaces the console with a corner HUD (`ui/hud.ts`:
score and hull top left, weapons top right, radar and log bottom, boss bar
top centre) and `render/schematic.ts` with the real enemy fleet:
`sim/enemies.ts` (the original's seven alien types, their movement and
fire patterns, wave pacing curves), `sim/bosses.ts` (five factions of
capital ship, attack cycles, escorts, fuse, bounty), `render/enemies.ts`
(procedural hulls, shots, beams, webs, pickups) and `render/neon.ts` (dark
matte armour with HDR neon edges, baked to two draws per model).

The gritty pass rebuilds the look and the enemy around a reference frame
the user supplied, and changes the shape of the fight:

- One ship: the Defiant gunship. The original's other two hulls (Sovereign,
  Nova) and the hull picker are gone; `content/hulls.ts` holds one `HULL`.
- `render/kit.ts` replaces `render/neon.ts`: a parts kit (boxes, drums,
  wedges, greebles merged into one mesh per material) and weathered metal,
  painted at startup and projected triplanar with a bump from a height map.
  `render/ships.ts` and `render/enemies.ts` build every hull from it.
- `render/rocks.ts` shades rock procedurally (basalt with lava fissures, in
  the rock's own space) on cratered, noise-shaped icospheres, and draws the
  bulwarks and a far backdrop of asteroids at every height.
- `render/environment.ts` drops the hex grid for a starfield, a galactic band
  and a small dark reflection map; `render/camera.ts` sits low behind the
  ship with the horizon high in frame.
- `render/fx.ts` layers kills: flash, real light, fireball, smoke, shockwave,
  sparks, rock or plating debris; `render/sector.ts` returns a hit-stop for
  the loop's freeze.
- `ui/hud.ts` is the reference's HUD in red on dark grey: weapons and a
  score/hull readout top right, a round radar with a sweep bottom left, one
  status line bottom right, a red box on the target in the world.
- The simulation gains altitude. Enemies, their fire and the player's fire
  have a `y`; the ship and rock stay on the plane. `sim/enemies.ts` is a new
  tactical AI (approach from far out, interceptor attack runs and jinks,
  cruisers using bulwarks as cover); `sim/field.ts` adds bulwarks; phasers
  gain a gunnery computer (lances lift onto targets off the plane) and
  torpedoes accelerate and steer in 3D.

The roguelite pass turns the prototype into the full run loop, built on
everything above (the flight model, camera, HUD and look are unchanged).
[DESIGN.md](DESIGN.md) is the game as designed; in code:

- The world pauses itself at the run's decisions: `World.phase` is
  `refit` (three cards in `offer`), `hail` (a capital ship's contact) or
  `over` (the record in `run`), and `choose`, `answerHail` and `restart`
  answer it. The app shows a panel for each (`ui/panels.ts`); the scripted
  pilot calls the same three.
- `content/upgrades.ts` is the refit tree as data; `sim/stats.ts` is the
  one stat block every system reads, rebuilt from the build and capped
  after every multiplier; `sim/build.ts` makes the build-aware offers,
  the cards' figures and the ship's name.
- `sim/director.ts` holds every difficulty curve. `sim/field.ts` gains
  rock kinds and formations, `sim/pickups.ts` dilithium and power-ups,
  `sim/arsenal.ts` the systems that fire themselves (mines, plasma, the
  hull arc), `sim/encounters.ts` the sector events, `sim/run.ts` the run's
  record.
- `sim/enemies.ts` layers archetype, faction traits and elite modifiers,
  with variants and squads as data; `sim/bosses.ts` adds the hail, three
  phases, telegraphs and per-faction movement.
- `sim/ids.ts`: one id sequence per world, so a lock never resolves to
  the wrong kind of thing and two worlds in one process stay
  deterministic.
- `meta/profile.ts` and `content/unlocks.ts`: bests, history and unlocks
  between runs. Progression opens options, never permanent power.
- `render/` gains `pickups.ts`, `arsenal.ts` and `hazards.ts` (telegraphs,
  landing circles, event props); rocks, enemies, the ship and the
  environment learn the new states.
- `tools/pilot.ts` flies runs headless through the same API; `npm run
  pilot` writes `docs/BALANCE.md`. Every balance change in this pass was
  made from its numbers (DESIGN.md lists them).

The HUD pass redraws every screen in one tactical language, from three
reference frames the user supplied (orange-red instrument lines, small cyan
status, an industrial mining ship), and then cuts it back after the user
found the first version cluttered:

- One set of parts in `styles/main.css`: the cut frame (edge and glass cut
  at 45°, scan lines in the glass only), the tick meter (`--v`, `--n`, read
  as a count of lit segments), corner brackets, and five lights that each
  mean one thing: orange-red the instrument, cyan the ship's own state,
  violet dilithium, amber things to go and get (and the yellow alert), red
  damage.
- `ui/hud.ts` keeps only what earns its place while flying: the refit rail
  across the top, one ship-systems panel (the build's name; phasers, then
  torpedoes and mines once fitted, and the warp core, each with its key,
  gauge, reading and the level the refits have taken it to; the hull with
  its shield charges; the score and chain), a capital ship's or a sector
  event's panel at the top centre, the scope, and two fading log lines.
- `ui/targeting.ts`: the target is the torpedo lock, else the hull or the
  rock nearest the line of fire (hulls count closer, and the current
  target is kept unless something is clearly better). Its brackets close
  in and a scan line runs down it; a readout beside it (or under it on a
  narrow screen, clear of the panel and the scope) says what it is and
  its integrity, and for rock what breaking it yields. The gunsight and a
  centre mark light when a lance fired now would hit. Marks: brackets on
  other hulls, the capital ship by name, the nearest dilithium-rich or
  rare rock, repairs, power-ups, the objective; edge pointers when the
  capital ship or the objective is off screen.
- `ui/radar.ts`: ship-up, a compass bezel that turns with the ship, the
  camera's field of view, contacts by kind, and a bezel ring that lights
  toward any hostile in firing range.
- `ui/panels.ts`: refit cards read as modules for this ship (system path,
  change, level blocks, figures with the new value lit), over a loadout of
  every system fitted with the selected card's system lit.
- Touch: octagon buttons that each carry their gauge (bank, rack, core);
  on a phone the panel tightens and the scope moves to the top left.

Coming in later milestones: `audio/`, three sectors and a win state.

## Conventions

- **Units.** One world unit is ten pixels of the original. The ship's 9px
  radius is 0.9 units.
- **Plane and heading.** Play happens on the XZ plane. Heading 0 faces +X and
  PI/2 faces -Z ("up" on screen). A stick's screen angle and a heading are the
  same number. Headings are never wrapped, so interpolation is a plain lerp;
  differences go through `angleDelta`.
- **Time.** Simulation code only ever sees the fixed `dt`. Real-time things
  (UI tweens, the debug readout) use the frame's `frameDt`.
- **The flight model** keeps the original's per-frame numbers: one step is
  one 60Hz frame, so thrust, turn rate and drag port unchanged. Top speeds
  are 450, 316 and 384 px/s, as measured in the original.
- **Presses** (roll, overcharge) are queued and consumed by the next step.
  Pause is answered immediately by the app: a paused loop runs no steps.

## Mobile

- Phones start on the `medium` quality tier, desktops on `high`.
- The quality governor (a port of the original's `budget()`) measures the
  frame interval and drops one tier under sustained load. It never steps back
  up, and it treats a steady 30fps as a display cap (iOS Low Power Mode), not
  as overload. `?quality=low|medium|high` pins a tier.
- Device pixel ratio is capped per tier (1.0 / 1.25 / 1.5), as in the original.
- Touch: one floating stick (the whole screen is its catchment) and a Release
  button, both ported from the original. Controls appear on first touch, so a
  touchscreen laptop gets them only once it is used that way.
- No scrolling, zooming, pull-to-refresh or text selection anywhere.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Project setup: loop, input, quality tiers, deploy pipeline | done |
| M1 | Flight model and chase camera | done |
| M1b | Console pass: chase camera only, phasers and torpedoes, breakable rock, hull damage, bloom, the bridge console | done (pulls parts of M2, M3, M4 and M7 forward) |
| M1c | Cyberpunk pass: corner HUD, neon ships and exhaust, the original's enemies, wave pacing and capital ships | done (pulls the enemy half of M5 forward) |
| M1d | Gritty pass: reference camera, weathered ships, lava rock, bulwarks, red HUD, 3D enemy AI, heavier weapons | done |
| M2 | Combat core: asteroids, phasers, torpedoes, collision, splitting, hull, game over | done (roguelite pass) |
| M3 | Combat feel and effects: trails, sparks, shield dome, explosions, shake | |
| M4 | Space environment: starfield, nebulae, sun, shadows, bloom | |
| M5 | Roguelite systems: XP, upgrades, hull pick, overcharge, enemies, bosses, hails | done (roguelite pass; no hull pick: one ship, many builds) |
| M5b | Roguelite pass: refit tree, weapon systems, rock kinds, factions, elites, director, capital-ship phases and telegraphs, sector events, run report, long-term unlocks, scripted-pilot balancing | done |
| M5c | HUD pass: one tactical UI language for the HUD and every panel, ship systems with refit levels, targeting with mining readouts, a compass scope, module refit cards, a decluttered phone layout | done |
| M6 | Three sectors and a win state | |
| M7 | LCARS UI: start, HUD, refit cards, pause, summary | done in the gritty style (roguelite pass) |
| M8 | Spatial audio and music | |
| M9 | Mobile polish, installable web app, performance pass, launch | |

## Open questions

- **Phase 4 brief** arrived cut off. Working assumption until confirmed: three
  sectors, each ending in a flagship fight (asteroid belt / Klingon; ion-storm
  nebula / Cardassian and Romulan; gravity well / Borg and Tholian). Clearing
  sector 3 wins and unlocks endless mode. Needed by M6.
- **Star Trek names** on a public site carry more trademark exposure than an
  easter egg. All names and copy will live in one content file, so a rename is
  a one-file change.
- **Address.** GitHub Pages from `jimi-duck/game`; a subdomain such as
  `play.jciclitira.com` needs one DNS record. Needed by M9.
