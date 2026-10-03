# Asteroid Blaster 3D

The Star Trek roguelite from [jciclitira.com](https://www.jciclitira.com)'s
lab, rebuilt in 3D with Three.js, for desktop and mobile browsers.

The plan, the decisions behind it and the milestone list are in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
| Torpedo | 2, F or K | Torpedo button | X |
| Barrel roll | Shift | Roll button, or a second finger | B or RB |
| Camera distance | Z (cycles), or − and = | pause screen | |
| Pause | Esc or P | leave the app | Start |

The camera rides low behind the ship. You steer on a flat plane; everything
else uses the whole sky. Phasers draw on the phaser bank and refill when you
let go, and the gunnery computer lifts or drops a lance onto a hull flying
above or below you if it is in a narrow cone ahead. Torpedoes come three to a
rack, launch slow and accelerate, lock the best target in a cone ahead (ships
before rock), climb or dive after it, and reload one every 3.4s. Rock breaks
large to medium to small. Bulwarks (massive asteroids) never break: they
stop fire from both sides and hurt to fly into.

Enemies spawn 120 to 150 units out, mostly ahead and at altitude, and close
in before they fight. Interceptors fly attack runs (out high to one side, a
dive at where you will be, a climb out) and jink out of the way of lances
they see coming; cruisers hold range and hide behind bulwarks, sliding out
to fire broadsides. Seven kinds across five factions (Klingon, Cardassian,
Romulan, Borg, Tholian) unlock over the first two and a half minutes, with the
spawn rate, fire rate and cap all climbing with time. From 110s a capital
ship warns, drops in from far out, then runs its faction's attack cycle with
an escort wing until it is destroyed or its fuse runs out. Enemy fire, beams,
webs, rams, rock and bulwarks each cost a hull plate; the last plate ends the
run. Kills can drop hull repairs.

## Debug

- `` ` `` toggles the debug readout (frame rate, quality tier, draw calls, input).
- `?debug=1` starts with it open.
- `?quality=low|medium|high` pins a quality tier.

## Checks

```bash
npm run check   # types + unit tests
npm run build   # production build into dist/
npm run preview # serve dist/ (also on the network)
```

## Deploy

Every push to `main` builds and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). Pull requests run the same checks without
deploying (`ci.yml`).

One-time setup: in the GitHub repo, **Settings → Pages → Build and deployment →
Source: GitHub Actions**.
