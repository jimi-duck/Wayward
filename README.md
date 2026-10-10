# WAYWARD

A 3D space-survival roguelite for desktop and mobile browsers, built with
TypeScript, Three.js and Vite. Keep moving.

You stole an ore hauler, and hidden in its systems was a file that exposes
what really happened when the jump lanes went dark seventy years ago. The
Continuance wants its ship and its secret back. You do not have to win a war.
You only have to get out of the system, then the next, then the one after.

## Two ways to play

Both start from the title menu.

- **Story.** A journey of about 85 stops across eight regions, roughly seven
  hours over many sessions. Each new journey opens on a short story card, then
  a one-minute training: laser a violet rock for Cyrite, shoot one ship, then
  make a short hop to the work bay and fit torpedoes. After that:
  - **Cyrite is the one currency.** It fuels every jump, pays for upgrades and
    is your money at ports. Laser rock for it, strip wrecks for it. Spare
    Cyrite is spent at work bays; you can never be locked out of a choice.
  - **Supplies** are drawn by jumps and plate patches. Weight over the mass
    rating flies worse and burns more Cyrite.
  - **Work bays** are where upgrades happen, in most systems and
    at every gate. The gate and the bay are safe zones: nothing fires inside.
  - **The chart.** After each jump you plot the next one. Systems differ:
    ports, rich mining, quiet transits, contested space. The Continuance's
    **Net** spreads behind you, and **Prefect Calloway** follows your trail.
    Linger and she catches up. A wreck leaves you adrift; a region with too
    many wrecks is flown again from its gate.
  - **Comms cards** pause the game and read the other party for you, with the
    cost, the risk and the odds as chips. Run it, pay it, talk through it or
    fight.
  - **Missions** are optional jobs that start from something in the sky:
    strike runs, escorts, races, surveys, smuggling past a patrol. Each can be
    refused for free, pays roughly 20 to 45 Cyrite, and most leave a mark on
    the chart.
  - The journey saves between systems, at every port and at each region gate.
    **Continue** carries on.
- **Arcade.** The endless run. Three supplied picks in the bay (a gun, a
  defence, a ship), hostiles in encounters with quiet spells between, and
  capital ships that hail from 3:30. When the hull goes, the run report says
  what you built.

Difficulty is chosen after Arcade or New journey: Easy, Normal or Hard.
Game sound is off for now.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. To play on a phone on the same Wi-Fi, run
`npm run dev:phone` and open the `Network:` address Vite prints.

The game plays in landscape. Held upright, a phone asks you to turn it. Android
goes fullscreen at launch; an iPhone browser has no fullscreen, so add the game
to the Home Screen for no bars.

## Controls

| | Desktop | Touch | Gamepad |
|---|---|---|---|
| Steer | ← → or A D | drag on the left half | left stick, d-pad |
| Thrust | ↑ or W | any push opens the throttle | right trigger, d-pad up |
| Lasers (hold) | 1, Space or J | hold on the right half | A |
| Torpedo (once fitted) | 2, F or K | Torpedo button | X |
| Barrel roll | Shift | second finger on the left half | B or RB |
| Break and reverse | ↓ or S | flick a second finger down, or the Turn button | L3 or d-pad down |
| Bay (Arcade, alert clear) | B | the upgrades badge | Back |
| Bay (Story) | dock at a work bay | dock at a work bay | dock at a work bay |
| Comms: answer | 1 to 6, or arrows and Enter | tap | stick, A |
| Camera distance | Z, or − and = | pause screen | |
| Pause | Esc or P | pause button | Start |

You steer on a flat plane; the gunnery computer lifts or drops a lance onto a
hull above or below you. Rock breaks large to medium to small. Lasers take a
rock clean; a torpedo keeps only half of what is in it.

## Developer notes

- Settings has a Dev mode switch (remembered): it shows Open review world
  and a Space effects switch, so the flags below need no URL editing.
- `?dev` opens the review world: every ship, rock, item and feature, labelled,
  flown without risk ([docs/REVIEW.md](docs/REVIEW.md)).
- `?train` plays the Arcade training again; `?short` plays the old three-region
  journey; `?space` turns on the environment phenomena
  ([docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)).
- `` ` `` toggles the debug readout; `?debug=1` starts with it open;
  `?quality=low|medium|high` pins a quality tier.

## Checks

```bash
npm run check   # types + unit tests
npm run build   # production build into dist/
npm run preview # serve dist/
```

Scripted pilots play the simulation headless and write the balance reports in
`docs/BALANCE*.md`: `pilot`, `pilot:breakout`, `pilot:journey` (whole
journeys, about 14 minutes; `JOURNEY_SET=eight` for the long set),
`pilot:situations`, `pilot:comms`, `pilot:space`, `pilot:survival`,
`pilot:endings`, `pilot:ship`, `pilot:feel` and `pilot:perf`. `PILOT_RUNS` and
`PILOT_TIME` trade precision for speed. No pilot can judge feel or frame
rate; those need a real device.

## Deploy

Cloudflare Workers Builds deploys `main` as a static-assets Worker
(`wrangler.jsonc`), with a preview on every pull request. GitHub Actions
(`ci.yml`) runs types, tests and the build on each pull request.

## Where things live

- [docs/VISION.md](docs/VISION.md): the game, its world and its story.
- [docs/PLAN.md](docs/PLAN.md): milestones and status.
- [docs/DESIGN.md](docs/DESIGN.md): where each system lives and how to add to it.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the decisions behind the build.
- [docs/ONBOARDING.md](docs/ONBOARDING.md), [docs/ECONOMY.md](docs/ECONOMY.md),
  [docs/MISSIONS.md](docs/MISSIONS.md), [docs/COMMS.md](docs/COMMS.md),
  [docs/NAVIGATION.md](docs/NAVIGATION.md), [docs/HUD.md](docs/HUD.md): the
  systems a player meets.
- [docs/COPY.md](docs/COPY.md): the copywriting rules.
- [docs/ART-PASS.md](docs/ART-PASS.md), [docs/ART-SLOTS.md](docs/ART-SLOTS.md):
  the look and the image slots. The brand lives in `branding/`.

## Working on it

`src/sim` never imports Three.js: the simulation runs in fixed 1/60 s steps on
plain data, so tests and the pilots play it headless. Cards, upgrades, systems,
captains, story beats and endings are rows in `src/content/`; their rules live
in `src/sim/`. Every visible line goes through `t()` and needs a German twin in
`src/i18n/de/`. See [CLAUDE.md](CLAUDE.md) for the full set of house rules.
