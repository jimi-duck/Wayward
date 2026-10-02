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
| Flight model | Flat play plane, full 3D presentation | Keeps auto-fire, grazing and all the original tuning; touch stays one thumb. The ship banks (roll) and pitches visually; a barrel roll is the one 3D move with a gameplay effect. |
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
  sim/       game state and rules (M0: a ship that turns)
  render/    renderer, quality governor, scene
  ui/        DOM overlays (M0: debug readout)
  styles/    CSS, tokens carried over from the original
tests/       unit tests (Vitest)
docs/        this file
```

Coming in later milestones: `sim/` grows the field, enemies, bosses and
progression; `weapons/`, `audio/` and `content/` (tuning constants, factions,
upgrades, copy) appear; `tools/pilot.ts` runs the scripted pilot headless.

## Conventions

- **Units.** One world unit is ten pixels of the original. The ship's 9px
  radius is 0.9 units.
- **Plane and heading.** Play happens on the XZ plane. Heading 0 faces +X and
  PI/2 faces -Z ("up" on screen). A stick's screen angle and a heading are the
  same number. Headings are never wrapped, so interpolation is a plain lerp;
  differences go through `angleDelta`.
- **Time.** Simulation code only ever sees the fixed `dt`. Real-time things
  (UI tweens, the debug readout) use the frame's `frameDt`.
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
| M1 | Flight model and chase camera | |
| M2 | Combat core: asteroids, phasers, torpedoes, collision, splitting, hull, game over | |
| M3 | Combat feel and effects: trails, sparks, shield dome, explosions, shake | |
| M4 | Space environment: starfield, nebulae, sun, shadows, bloom | |
| M5 | Roguelite systems: XP, upgrades, hull pick, overcharge, enemies, bosses, hails | |
| M6 | Three sectors and a win state | |
| M7 | LCARS UI: start, HUD, refit cards, pause, summary | |
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
