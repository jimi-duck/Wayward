# Asteroid Blaster 3D

The Star Trek roguelite from [jciclitira.com](https://www.jciclitira.com)'s
lab, rebuilt in 3D with Three.js, for desktop and mobile browsers.

Everyone launches in the same ship. Fly, break rock and hulls, collect
dilithium, and every time the rail fills, refit: three cards, one pick,
from a branching tree of weapons, systems, specialisations and synergies.
Capital ships hail; engage for the salvage or evade and pay in tempo. When
the hull goes, the run report says what you built and how it went.

- The game as designed, where each system lives and how to add to it:
  [docs/DESIGN.md](docs/DESIGN.md).
- The plan, the decisions behind it and the milestone list:
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- The latest balance report from the scripted pilot: [docs/BALANCE.md](docs/BALANCE.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Play it on your phone

With the phone on the same Wi-Fi as your computer:

```bash
npm run dev:phone
```

Vite prints a `Network:` address such as `http://192.168.1.20:5173`. Open that
on the phone.

## Controls

| | Desktop | Touch | Gamepad |
|---|---|---|---|
| Steer | ← → or A D | drag anywhere: across steers | left stick, d-pad |
| Thrust | ↑ or W | push the stick up | right trigger, d-pad up |
| Phasers (hold) | 1, Space or J | Phaser button | A |
| Torpedo (once fitted) | 2, F or K | Torpedo button | X |
| Overcharge (when full) | E | Release button | Y |
| Barrel roll | Shift | Roll button, or a second finger | B or RB |
| Refit: take a card | 1 2 3, or Tab and Enter | tap a card | d-pad ◀ ▶, A |
| Hail: engage / evade | 1 or F / 2 or E | tap | A / B |
| Camera distance | Z (cycles), or − and = | pause screen | |
| Pause | Esc or P | leave the app | Start |

The camera rides low behind the ship. You steer on a flat plane; everything
else uses the whole sky. Phasers draw on the phaser bank and refill when you
let go, and the gunnery computer lifts or drops a lance onto a hull flying
above or below you if it is in a narrow cone ahead. Torpedoes, mines, the
plasma trail, the hull arc and shields are refits, not standard. Rock breaks
large to medium to small, sometimes into violet dilithium crystals that the
tractor pulls in (they fade if left). Bulwarks (massive asteroids) never
break: they stop fire from both sides and hurt to fly into.

Near misses (fire, rock, hulls, beams) charge the warp core; release it for
a nova that clears fire and runs the guns hot. Enemies arrive from far out
and fight by type and faction; from a few minutes in they come in squads,
mixed factions and elite variants. From 2:40 capital ships hail. Every hit
costs a hull plate (or a shield charge); the last plate ends the run.

## Debug

- `` ` `` toggles the debug readout (frame rate, quality tier, draw calls, input).
- `?debug=1` starts with it open.
- `?quality=low|medium|high` pins a quality tier.

## Checks

```bash
npm run check   # types + unit tests
npm run build   # production build into dist/
npm run preview # serve dist/ (also on the network)
npm run pilot   # the scripted pilot's balance runs (a few minutes): writes docs/BALANCE.md
```

`PILOT_RUNS` (default 12 per strategy) and `PILOT_TIME` (default 900s)
trade precision for speed, e.g. `PILOT_RUNS=4 npm run pilot`.

## Deploy

Every push to `main` builds and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). Pull requests run the same checks without
deploying (`ci.yml`).

One-time setup: in the GitHub repo, **Settings → Pages → Build and deployment →
Source: GitHub Actions**.
