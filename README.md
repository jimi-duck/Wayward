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
| Zoom | Z, or − and = | ‹ › top right | |
| Hull | buttons top right | buttons top right | |
| Pause | Esc or P | leave the app | Start |

The camera rides behind the ship. Phasers draw on the phaser bank and refill
when you let go; torpedoes come three to a rack, lock the best rock in a cone
ahead (ships before rock), and reload one every 3.4s. Rock breaks large to
medium to small.

Enemies arrive from 4s, as in the original: seven kinds of fighter across five
factions (Klingon, Cardassian, Romulan, Borg, Tholian), unlocking over the
first two minutes, with the spawn rate, fire rate and cap all climbing with
time. From 110s a capital ship warns, then arrives with an escort wing and
runs its faction's attack cycle until it is destroyed or its fuse runs out.
Enemy fire, beams, webs, rams and rock each cost a hull plate; the last plate
ends the run. Kills can drop hull repairs.

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
