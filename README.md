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
| Steer | ← → or A D | drag anywhere (tactical: point where to go; chase: across steers) | left stick, d-pad |
| Thrust | ↑ or W | push the stick further (chase: push it up) | right trigger, d-pad up |
| Barrel roll | Shift | Roll button, or tap with a second finger | B or RB |
| Camera | C | panel | |
| Zoom | Z | panel | |
| Hull | 1 2 3 | panel | |
| Overcharge | Space | (M5) | A |
| Pause | Esc or P | leave the app | Start |

M1 is a flight test: three hulls, two cameras, drifting rock to fly past. The
rock is scenery; collisions, weapons and the field arrive in M2.

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
