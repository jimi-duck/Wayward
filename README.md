# WAYWARD

A cyberpunk space survival game from [jciclitira.com](https://www.jciclitira.com)'s
lab, in 3D with Three.js, for desktop and mobile browsers.

You are a contract miner who found the wrong file and stole the wrong ship:
the Wayward (OB-7731-A), an Obedience-class ore hauler, blunt cutting head
up front, rust-red engine block, two drive pods on pylons. The
Continuance wants her, and you, back.

Two ways in from the start screen:

- **Break out** (milestones M1 to M3 of [the plan](docs/PLAN.md)): a
  journey across a region of about a dozen systems, from Cerro to the
  Threshold, with the Continuance's **Net** spreading behind you and
  **Prefect Calloway** following your trail. It starts with the Breakout,
  getting out of the home system. The old lane mouth is about a minute's flight away, flat out.
  Reach it with 20 **Cyrite** in the tank and hold inside it while the drive
  spools. Cyrite is scarce: hold the **cutter** (3 or C) on violet-veined rock,
  easing off before it overheats, and it comes apart clean. Ordinary rock gives
  ore, which fills the hold and sells at **Frontier Supply**, the dock about
  halfway, where you can also buy Cyrite and patch a plate. Rock and wrecks
  drop **Krail**, spent in the **refit bay** (B) as in the arcade; at a port
  the bay also does the yard's work, the heaviest modules, for chits as well.
  Wrecks give parts, and you patch a plate out of them when you are left
  alone. The Custody pursue from behind, harder as
  the **hunt pressure** rises, and a capital ship blockades the lane mouth.
  Along the way, people call: traders, miners asking for help, jobs,
  warnings, raiders, a Prefect. Each **comms card** pauses the game and
  shows a read of them (their strength against yours, and a guess at what
  they really want, as good as your sensors), and choices that cost, gamble
  or need something you may not have. At the lane, her checkpoint: run it,
  spoof it, pay it, talk through it, or fight her.

  On the far side of every lane, the **chart**: plot the next jump. Each
  lane costs Cyrite (the lane mouth wants it) and days; you eat food
  every day and the drive wears parts every jump. Systems differ: ports to
  trade at, mining systems with rich rock, quick empty transits, contested
  space full of Gutter crews. A netted system has a blockade at its lane
  and dearer prices. Linger, and Calloway catches up: then it is a comms
  card, not the end, though a wreck with her in the system is. A wreck
  otherwise leaves you adrift, a day later, with the hold gone; the third
  is the end. The journey is saved between systems and at every port:
  **Continue** carries on.
- **Arcade**: the endless run. The ship leaves with lasers, torpedoes and a
  shield charge. Krail from rock and wrecks is spent in the **refit bay**
  (B): a web of modules in tabs, each level paid in Krail and drawing
  on the ship's power, mass and heat; nothing comes out once fitted. It
  opens whenever nothing hostile is close. Hostiles arrive in encounters
  with quiet spells between, where the hull mends itself; from 3:30 capital
  ships hail. When the hull goes, the run report says what you built and how it
  went.

- Where the game goes next, WAYWARD: [docs/VISION.md](docs/VISION.md),
  and the build plan: [docs/PLAN.md](docs/PLAN.md).
- The game as designed, where each system lives and how to add to it:
  [docs/DESIGN.md](docs/DESIGN.md).
- The plan, the decisions behind it and the milestone list:
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- The latest balance reports from the scripted pilot: [docs/BALANCE.md](docs/BALANCE.md)
  (the arcade), [docs/BALANCE-BREAKOUT.md](docs/BALANCE-BREAKOUT.md) and
  [docs/BALANCE-JOURNEY.md](docs/BALANCE-JOURNEY.md).

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

The game plays in landscape only: held upright, a phone gets a screen asking
to turn it, and a run pauses. Android goes fullscreen at launch and locks to
landscape. An iPhone browser has no fullscreen, and folds its tabs and bars
away only when the page scrolls, so there the page scrolls under the fixed
game: while the bars are out a swipe screen asks for one swipe up, and a run
pauses under it. Added to the Home Screen (Share › Add to Home Screen), the
game opens with no bars at all.

## Controls

| | Desktop | Touch | Gamepad |
|---|---|---|---|
| Steer | ← → or A D | drag on the left half: across steers | left stick, d-pad |
| Thrust | ↑ or W | any push opens the throttle; pull back to coast | right trigger, d-pad up |
| Lasers (hold) | 1, Space or J | hold anywhere on the right half | A |
| Torpedo (once fitted) | 2, F or K | Torpedo button | X |
| Cutter (Breakout, hold) | 3, C or L | Cut button | LB or left trigger |
| Overcharge (when full) | E | Core button | Y |
| Barrel roll | Shift | a second finger on the left half | B or RB |
| Refit bay (arcade, alert clear): open, launch | B; Esc or B to launch | the upgrades badge | Back; B |
| Refit bay: fit a suggestion, change tab, move, fit | 1 2 3, Q E, arrows, Enter; A for Auto-refit | tap | stick, A, bumpers; Y for Auto-refit |
| Comms: answer | 1–6, or arrows and Enter | tap | stick, A |
| Hail (arcade): engage / evade | 1 or F / 2 or E | tap | A / B |
| Camera distance | Z (cycles), or − and = | pause screen | |
| Pause | Esc or P | the pause button, bottom centre | Start |

The camera rides low behind the ship. You steer on a flat plane; everything
else uses the whole sky. Lasers draw on the laser bank and refill when you
let go, and the gunnery computer lifts or drops a lance onto a hull flying
above or below you if it is in a narrow cone ahead. Torpedoes, mines, the
plasma trail, the hull arc and shields are refits, not standard. Rock breaks
large to medium to small, sometimes into violet krail crystals that the
tractor pulls in (they fade if left). Bulwarks (massive asteroids) never
break: they stop fire from both sides and hurt to fly into.

Near misses (fire, rock, hulls, beams) charge the reactor; release it for
a nova that clears fire and runs the guns hot. The first forty seconds are
yours alone. In the arcade, enemies then come in encounters with quiet
between: a group arrives from far out, never dead ahead, and each hull
closes its own way (patrols that only turn on you if you come close,
lookouts that hold off before they commit, flankers, interceptors) before
it fights by type and faction; beat or shake off the group and the sector
goes quiet for a while. Groups grow with the clock and your refits; from
about four minutes in they bring squads, mixed factions and elite
variants. From 3:30 capital ships hail. Every hit costs a hull plate (or a
shield charge); the last plate ends the run. Left alone for a few seconds,
with nothing hostile close, the hull slowly mends itself, a plate a quiet
spell.

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
npm run pilot:breakout  # the pilot through the Breakout: writes docs/BALANCE-BREAKOUT.md
npm run pilot:journey   # whole journeys, chart and all: writes docs/BALANCE-JOURNEY.md
```

`PILOT_RUNS` (default 12 per strategy) and `PILOT_TIME` (default 900s)
trade precision for speed, e.g. `PILOT_RUNS=4 npm run pilot`.

## Deploy

Cloudflare Workers Builds deploys the game as a static-assets Worker
(`wrangler.jsonc`): every push to `main` runs `npm run build` and uploads
`dist/`, and pull requests get a preview build. Pull requests also run types,
tests and a build in GitHub Actions (`ci.yml`).
