# WAYWARD

A 3D space-survival roguelite in TypeScript, Three.js and Vite, for desktop
and mobile browsers. Start with [docs/VISION.md](docs/VISION.md) (the game),
[docs/PLAN.md](docs/PLAN.md) (milestones and status),
[docs/DESIGN.md](docs/DESIGN.md) (where each system lives, how to add
things) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

- **The one rule.** `src/sim` never imports Three.js. The simulation runs in
  fixed 1/60s steps on plain data, so tests and the scripted pilots play it
  headless.
- **Decisions pause the world.** `World.phase` (`refit`, `hail`, `comms`,
  `dock`, `over`) and an answer method the app and the pilot both call. A
  new decision follows the same pattern.
- **Data over code.** Cards, upgrades, systems, captains, story beats and
  endings are rows in `src/content/`; their rules live in `src/sim/`.
- **One voice at a time.** Every message is a Moment (a card), a Voice (radio),
  a Signal (a notice) or Ambient (the HUD); `src/sim/floor.ts` paces them and
  `tests/caps.test.ts` holds the word caps. See [docs/DESIGN-GUIDELINES.md](docs/DESIGN-GUIDELINES.md).
- **Playable without reading.** Goals sit on screen, choices read as a verb
  and chips; no mechanic lives only in prose.
- **English and German.** Every line the player sees goes through `t()` and
  has a German twin in `src/i18n/de/`, short and informal (German says du).
  The i18n test fails on any line without one.
- **Saves are versioned.** A change to the journey's shape bumps `VERSION`
  in `sim/journey.ts` and adds a migration in `meta/save.ts`.
- **Balance from numbers.** Balance changes come from the pilot reports
  (`npm run pilot*`); update the matching `docs/BALANCE*.md`.
- **The look is brand v1.1** (`branding/`): a muted steel blue is the player and their
  hand, teal is information, a dull gold is caution only, red is threat and nothing else. Every pop-up is
  Neon Glass, built once in `src/styles/neon.css`; read [docs/DESIGN-GUIDELINES.md](docs/DESIGN-GUIDELINES.md)
  before any UI work. UI passes come with screenshots at desktop and phone sizes.
- **Before a push**, `npm run check` and `npm run build`; CI runs both on
  every pull request. Cloudflare deploys `main`, with previews on pull
  requests.
- **Writing.** Docs and comments are short and plain, in British English.
  When a milestone moves, update the status table in `PLAN.md`.
- **Time zone.** The owner is in Germany (Europe/Berlin).
