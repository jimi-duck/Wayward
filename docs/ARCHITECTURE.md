# Architecture

Wayward in 3D: a rebuild of the canvas game hidden in the portfolio
(`Portfolio-Frog/js/game.js`), playable on desktop and mobile from a website.

## The original, in one paragraph

A survivors-style roguelite. Lasers fire themselves, so steering is the only
control. Kills drop krail; a full rail opens a refit card (one of three from
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
| Hosting | Cloudflare Workers (static assets) | Workers Builds deploys on every push to `main`, with previews on PRs. |

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
  content/   data: the hull, the upgrades, comms cards, system kinds, long-term unlocks and modifiers
  sim/       game state and rules (never imports Three.js): the world (one system), the journey above it
  meta/      the profile between runs, and the journey save (localStorage)
  render/    renderer, quality governor, scene
  ui/        DOM overlays: HUD, the refit bay, panels (comms, port, chart, report, logbook), debug
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

M1b adds `sim/field.ts` (rock that splits), `sim/weapons.ts` (lasers and
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

- One ship: a gunship. The original's other two hulls and the hull picker are gone; `content/hulls.ts` holds one `HULL`.
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
  cruisers using bulwarks as cover); `sim/field.ts` adds bulwarks; lasers
  gain a gunnery computer (lances lift onto targets off the plane) and
  torpedoes accelerate and steer in 3D. Since the Arcade second look, hulls
  fight within a hand of the plane (`PLANE` in `sim/enemies.ts`), so rock
  is solid to them (`World.hullVsRock`), stops their fire, and the smaller
  Wayward threads gaps they cannot. Only a capital ship still comes in
  high, once, as its entrance.

The roguelite pass turns the prototype into the full run loop, built on
everything above (the flight model, camera, HUD and look are unchanged).
[DESIGN.md](DESIGN.md) is the game as designed; in code:

- The world pauses itself at the run's decisions: `World.phase` is
  `refit` (points to spend on the refit web), `hail` (a capital ship's
  contact) or `over` (the record in `run`), and `fit` / `closeRefit`,
  `answerHail` and `restart` answer it; `openRefit` opens the web between
  refits. The app shows a panel for each (`ui/web.ts` for the web,
  `ui/panels.ts` for the rest); the scripted pilot calls the same.
- `content/upgrades.ts` is every upgrade as data; `content/web.ts` places
  them on the refit web (nine regions round a core, bridges, salvaged tech)
  and `sim/web.ts` holds its rules (what can be fitted and why not, the
  quick picks); `sim/stats.ts` is the one stat block every system reads,
  rebuilt from the build and capped after every multiplier; `sim/build.ts`
  makes the figures and the ship's name.
- `sim/director.ts` holds every difficulty curve. `sim/field.ts` gains
  rock kinds and formations, `sim/pickups.ts` krail and power-ups,
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
  violet krail, amber things to go and get (and the yellow alert), red
  damage.
- `ui/hud.ts` keeps only what earns its place while flying: the refit rail
  across the top, one ship-systems panel (the build's name; lasers, then
  torpedoes and mines once fitted, and the reactor, each with its key,
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
  other hulls, the capital ship by name, the nearest krail-rich or
  rare rock, repairs, power-ups, the objective; edge pointers when the
  capital ship or the objective is off screen, and a small chevron in its
  faction's colour for each hull out of view.
- `ui/radar.ts`: ship-up, a compass bezel that turns with the ship, the
  camera's field of view, contacts by kind, and a bezel ring that lights
  toward any hostile in firing range.
- Touch: octagon buttons that each carry their gauge (bank, rack, core),
  clustered round the right thumb; on a phone the panel tightens and the
  scope moves to the top left.

The slow-burn pass answers three notes from the user, with a new reference
frame (a mining ship over an asteroid field, under a thin orange-red HUD):
the ship lacked character, the refit web was too much, and the opening was
too hectic to get hooked.

- The ship (`render/ships.ts`; since the WAYWARD rename, the Wayward,
  OB-7731-A): a blunt cutting head with a bridge and the cutting laser; a
  rust-red engine block with a drive ring astern and containers on its
  spine; two drive pods on swept pylons, coils glowing inboard and cyan
  rings aft. Stencilled hull numbers and the registry come from a small
  painted atlas laid on the hull as decals (`Kit.decal`). Stock
  engines burn drive cyan; the engine-colour unlock that used to be ion
  blue is now the old drive red. The camera sits a little lower and
  closer, so the stern and the engines face you as in the reference.
- (Since replaced by the refit bay, PLAN.md R.) The refit is three cards again (`sim/offers.ts`, `ui/refit.ts`): two that
  lean toward the build and a new direction, a system while the ship has
  fewer than two, a branch's specialisations once when it is deep enough,
  and a salvage hand led by the beaten faction's tech. `World.offer`,
  `pendingRefits`, `pendingSalvage` and `choose(i)` replace the web's
  points, `fit`, `openRefit` and `closeRefit`. `content/web.ts`,
  `sim/web.ts`, `ui/web.ts`, `ui/loadout.ts` and the minor upgrades that
  only existed to pave the web's paths are gone; the tactical computer
  (utility) keeps a card for every-weapon damage.
- The HUD follows the new reference: the sector and the krail gauge
  top left (the full-width rail is gone), a heading tape top centre, a
  leaner systems panel top right (weapon rows; hull, reactor and score
  side by side), the target's label sitting on its bracket frame with its
  integrity, mineral deposits marked with a hexagon and a two-line label,
  the scope with its range, and a mode line bottom right (cruise, mining
  mode, combat, yellow and red alert) over the last log line. Panel edges
  are a true 1px ring (an even-odd clip), so the glass can be faint
  without the edge colour showing through it. The HUD steps back while a
  panel is open. The start screen frames the ship under the title.
- The director opens on a slow burn (see DESIGN.md): half the rock, slower,
  five bulwarks, no hostile for forty seconds, then one at a time; every
  unlock, squad, elite and capital-ship time moves later.

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
- Touch (`input/touch.ts`): the screen splits down the middle. The left half
  is a floating stick: the ring centres exactly under the thumb (a touch
  never steers by itself) and follows the thumb past its rim. It drives like
  a racing game: across steers on an eased curve, any push opens the
  throttle, pulling back coasts. The right half is the trigger: Torpedo and
  Core are hit-tested with slack round them, and any other touch there holds
  the lasers, so a thumb that misses a button still fires. A second finger
  on the left is a barrel roll. The layer does all the hit-testing; a
  `touchend` with no fingers left releases everything, whatever pointer
  events a system gesture swallowed. Controls appear on first touch, so a
  touchscreen laptop gets them only once it is used that way.
- Every shader is compiled behind the start card (`Sector.warm`), including
  the hidden effect pools and one of every hull, so nothing compiles mid-run.
  The low tier also drops the four thrown point lights. On a short landscape
  screen the camera stands 12% further off.
- No scrolling, zooming, pull-to-refresh or text selection anywhere.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Project setup: loop, input, quality tiers, deploy pipeline | done |
| M1 | Flight model and chase camera | done |
| M1b | Console pass: chase camera only, lasers and torpedoes, breakable rock, hull damage, bloom, the bridge console | done (pulls parts of M2, M3, M4 and M7 forward) |
| M1c | Cyberpunk pass: corner HUD, neon ships and exhaust, the original's enemies, wave pacing and capital ships | done (pulls the enemy half of M5 forward) |
| M1d | Gritty pass: reference camera, weathered ships, lava rock, bulwarks, red HUD, 3D enemy AI, heavier weapons | done |
| M2 | Combat core: asteroids, lasers, torpedoes, collision, splitting, hull, game over | done (roguelite pass) |
| M3 | Combat feel and effects: trails, sparks, shield dome, explosions, shake | |
| M4 | Space environment: starfield, nebulae, sun, shadows, bloom | |
| M5 | Roguelite systems: XP, upgrades, hull pick, overcharge, enemies, bosses, hails | done (roguelite pass; no hull pick: one ship, many builds) |
| M5b | Roguelite pass: refit tree, weapon systems, rock kinds, factions, elites, director, capital-ship phases and telegraphs, sector events, run report, long-term unlocks, scripted-pilot balancing | done |
| M5c | HUD pass: one tactical UI language for the HUD and every panel, ship systems with refit levels, targeting with mining readouts, a compass scope, module refit cards, a decluttered phone layout | done |
| M6 | Three sectors and a win state | |
| M5d | The refit web: two hundred nodes in nine regions, points per refit, salvaged faction tech, quick picks, the map with pan, zoom and inspector | done, then replaced by three cards (slow-burn pass) |
| M5e | slow-burn pass: the Wayward, the HUD after the new reference, three-card refits, a slow-burn opening | done |
| M7 | Console UI: start, HUD, refit, pause, summary | done in the gritty style (roguelite pass), redrawn in the slow-burn pass |
| M8 | Spatial audio and music | |
| M9 | Mobile polish, installable web app, performance pass, launch | |

## Open questions

- **Phase 4 brief** arrived cut off. Working assumption until confirmed: three
  sectors, each ending in a flagship fight (asteroid belt / Gutter; ion-storm
  nebula / Custody and Office; gravity well / Voice and Thren). Clearing
  sector 3 wins and unlocks endless mode. Needed by M6.
- **Franchise names**: settled by the WAYWARD rename below; the game's world
  is its own.
- **Address.** Cloudflare Worker `game`; a subdomain such as
  `play.jciclitira.com` is a custom domain on that Worker. Needed by M9.

## The WAYWARD rename (M0 of [PLAN.md](PLAN.md))

The game took its own world: no franchise names remain. Display names, ids,
docs and the brand moved together:

- the ship: the Wayward, an Obedience-class ore hauler (`render/ships.ts`
  rebuilt round a cutting head and containers, repainted grey and rust);
- dilithium → Krail; phasers → lasers; the warp core → the reactor; photon
  and tricobalt → plain torpedoes and seismic mines;
- the factions, by how they fight: Klingon → the Gutter, Cardassian → the
  Custody, Romulan → the Office of Peace, Borg → the Voice, Tholian → the
  Thren; their variants, squads, capital ships and salvaged tech followed;
- yellow and red alert → contact and alarm;
- the wordmark and the logo files (`brand/`), with W and Y added to the
  constructed letterforms.

`meta/profile.ts` `migrate` carries old profiles across (Krail totals and
the capital-ship tally by faction); the storage key keeps the old name so
nothing is lost.

## The journey (M3 of [PLAN.md](PLAN.md))

`World` was the whole game; now it is one system. Above it:

- `sim/journey.ts`: the persistent state (the ship's `Carry`, the day, the
  trail, wrecks) and the loop: `sortieDef` builds the `SortieDef` the world
  flies, `endSortie` folds the world's `SortieResult` back in (days pass,
  the Net spreads, Calloway moves, the lane eats food and parts), and
  `plot` takes the chart's answer.
- `sim/chart.ts`: the three regions (`content/regions.ts`) laid out from a
  seed and `content/systems.ts`, each out through one gate; lanes, the Net
  (`spreadNet`, stalls, marked-up prices), and what you know of it
  (`arrive`, `seenNet`, the survey's Cyrite estimate).
- `sim/scatter.ts`: the factions acting on their own, stepped with the days
  (`stepScatter`): Drift fleets on the move, Gutter raids, Holdfasts
  throwing the Net back, the Voice building out, the Thren drifting and
  drawn to Cyrite on the move. `presence` is who is in a system, for the
  `SortieDef` (`here`, `thren`, `ahead`) and the cards (`Cond.here`).
- `sim/hunt.ts`: Calloway on the trail; `daysUntil` is what turns lingering
  into her arrival time inside the next sortie.
- `meta/save.ts`: the journey in localStorage, versioned, with `migrate`.
- `ui/chart.ts`: the chart panel (an SVG map and the lanes out), which also
  shows a wreck's notice and the journey's end.

The world reads a `SortieDef` instead of the Breakout's constants (lane
distance, the port or none, prices, heat, rock, the Gutter's share, the
blockade, Calloway's arrival), takes a `Carry` in `restart`, and gives
`carry()` and `result()` back. The Breakout is the `HOME` sortie, so an
unconfigured Breakout world plays exactly as before. The journey never
imports the world either: the app (and `tools/journey.pilot.ts`) moves the
two between each other.
