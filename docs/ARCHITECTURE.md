# Architecture

The decisions behind the build. What the game is: [VISION.md](VISION.md); how
it plays and where each system lives: [DESIGN.md](DESIGN.md); commands and
deploy: [DEVELOPMENT.md](DEVELOPMENT.md).

## Decisions

| Area | Choice | Why |
|---|---|---|
| Flight model | Flat play plane for the ship, full 3D for everything else | Keeps the arcade tuning; touch stays one thumb. The ship banks and pitches visually; a barrel roll is a dodge, and the break and reverse (DOWN; a downward flick of a second finger on touch) is a committed loop that turns the ship 180° and keeps most of the speed. Enemies and fire use altitude, and the gunnery computer and torpedoes reach them there. |
| Rendering | Three.js, plain TypeScript | Light, mature, best custom-shader ecosystem; WebGL2 runs on every current phone. |
| Build | Vite + TypeScript | Fast reloads; `npm run dev:phone` serves to a phone on the same Wi-Fi. |
| Collision | Custom: spatial hash; sphere, ray and segment tests | Hand-tuned arcade handling; a rigid-body engine would add WASM weight and fight that tuning. |
| UI | DOM/CSS over the canvas | Sharp text, accessible, and phone layouts in plain CSS. |
| Audio | Web Audio, switched off | All game sound is off (`SOUND_AVAILABLE` is `false` in `src/audio/audio.ts`) until there is sound worth shipping. |
| Hosting | Cloudflare Workers (static assets) | Workers Builds deploys on every push to `main`, with previews on pull requests. |

## The one rule

**The simulation never imports Three.js.** It advances in fixed 1/60s steps on
plain data (`src/sim`). The renderer reads that state every display frame and
interpolates between the last two steps (`alpha`). So a run plays the same at
60Hz, 120Hz and 144Hz, and the simulation runs headless for tests and the
scripted pilots.

```
input ──InputFrame──▶ sim (fixed 60Hz) ──state──▶ render (every frame, interpolated)
                        │
                        └──events──▶ effects · UI
```

## Layers

```
Journey  (persistent, saved at every port and gate)      src/sim/journey.ts
  ship · cargo and purse · chart · the hunt · notice · flags
        │ starts a sortie with a SortieDef        ▲ returns a SortieResult
        ▼                                         │
World  (one system, real time)                      src/sim/world.ts
  flight · guns · rock · enemies · capital ships · pickups
  · comms cards · docking · jump out
```

The world reads a `SortieDef` (lane, port, prices, heat, rock, who flies
there), takes a `Carry` in `restart`, and gives `carry()` and `result()` back.
The journey never imports the world: the app (and `tools/journey.pilot.ts`)
moves the two between each other. The Arcade is a world with no `SortieDef`.

## Layout

```
src/
  core/      fixed-step loop (interpolation, freeze, clamp), math, noise
  input/     keyboard, touch, gamepad → one InputFrame per step
  content/   data rows: upgrades, the refit web, modules, comms cards, systems,
             regions, captains, endings, story, survival modes, unlocks
  sim/       game state and rules (never imports Three.js)
  meta/      the profile between runs, and the journey save (localStorage)
  render/    renderer, quality governor, scene, ships, rock, effects
  ui/        DOM overlays: HUD, the bay, comms, port, chart, panels
  i18n/      t() and the German lines in i18n/de/
  review/    the review world (?dev)
  art/       image slots (see ART-SLOTS.md)
  styles/    CSS and the brand tokens
tests/       unit tests (Vitest)
tools/       the scripted pilots and the benches
docs/        the docs; BALANCE*.md are written by the pilots
```

## Flow of a decision

The world pauses itself at each decision (`World.phase`: `hail`, `comms`,
`dock`, `bay`, `over`). The app shows a panel for it and calls the matching
answer method; the scripted pilot calls the same method. A new decision
follows the same pattern. Presses (roll, break, torpedo) are queued and
consumed by the next step; pause is answered by the app, since a paused loop
runs no steps.

## Conventions

- **Units.** One world unit is ten pixels of the original arcade (`PX` in
  `sim/tuning.ts`). The ship's radius is 0.9 units.
- **Plane and heading.** Play happens on the XZ plane. Heading 0 faces +X and
  PI/2 faces -Z ("up" on screen). A stick's screen angle and a heading are the
  same number. Headings are never wrapped, so interpolation is a plain lerp;
  differences go through `angleDelta`.
- **Time.** Simulation code only ever sees the fixed `dt`. Real-time things
  (UI tweens, the debug readout) use the frame's `frameDt`.
- **Ids.** `sim/ids.ts` gives one id sequence per world, so a lock never
  resolves to the wrong kind of thing and two worlds in one process stay
  deterministic.
- **Saves.** The journey save is versioned (`VERSION` in `sim/journey.ts`,
  currently 15) with a migration for each step in `meta/save.ts`. The profile
  has its own `migrate` in `meta/profile.ts`.

## Mobile

- Phones start on the `medium` quality tier, desktops on `high`.
- The quality governor (`render/quality.ts`) measures the frame interval and
  drops one tier under sustained load. It never steps back up, and it treats
  a steady 30fps as a display cap (iOS Low Power Mode), not as overload.
  `?quality=low|medium|high` pins a tier. Frame cost: [PERF.md](PERF.md).
- Device pixel ratio is capped per tier (1.0 / 1.25 / 1.5).
- Touch (`input/touch.ts`): the screen splits down the middle. The left half
  is a floating stick: the ring centres exactly under the thumb (a touch
  never steers by itself) and follows the thumb past its rim. It drives like
  a racing game: across steers on an eased curve, any push opens the
  throttle, pulling back coasts. The right half is the trigger: Torpedo
  is hit-tested with slack round it, and any other touch there holds
  the lasers, so a thumb that misses a button still fires. A second finger
  on the left is a barrel roll (a tap) or the break and reverse (a downward
  flick). A `touchend` with no fingers left releases everything, whatever
  pointer events a system gesture swallowed. Controls appear on first touch.
- Every shader is compiled behind the start card (`Sector.warm`), including
  the hidden effect pools and one of every hull, so nothing compiles mid-run.
- No scrolling, zooming, pull-to-refresh or text selection anywhere.
