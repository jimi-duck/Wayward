# Development

## Developer notes

- Settings has a Dev review button that opens the review world, the same as `?dev`.
- `?dev` opens the review world: every ship, rock, item and feature, labelled,
  flown without risk ([REVIEW.md](REVIEW.md)).
- `?train` plays the training again; `?short` plays the old three-region
  journey instead of the eight; `?nospace` turns the environment phenomena off
  ([ENVIRONMENT.md](ENVIRONMENT.md)).
- `` ` `` toggles the debug readout; `?debug=1` starts with it open;
  `?quality=low|medium|high` pins a quality tier.

## Checks

```bash
npm run dev       # dev server (dev:phone serves it on the network)
npm run check     # types + unit tests
npm run build     # production build into dist/
npm run preview   # serve dist/
```

Scripted pilots play the simulation headless and write the balance reports in
`docs/BALANCE*.md`: `pilot`, `pilot:breakout`, `pilot:journey` (whole
journeys; `JOURNEY_SET=eight` for the eight-region set; it writes `BALANCE-LONG.md`, which is not kept in the repository),
`pilot:situations`, `pilot:comms`, `pilot:space`, `pilot:survival`,
`pilot:endings`, `pilot:ship`, `pilot:feel` and `pilot:perf`. `PILOT_RUNS` and
`PILOT_TIME` trade precision for speed. No pilot can judge feel or frame
rate; those need a real device.

Small tools in `tools/`: `save-fixture.ts` writes the journey fixture for the
current save version (run it when `VERSION` is bumped), `locate-copy.mjs` finds
where a line of copy is used, and `enemies.html`, `rocks.html` and `ship.html`
are the hull, rock and ship benches.

## Deploy

Cloudflare Workers Builds deploys `main` as a static-assets Worker
(`wrangler.jsonc`), with a preview on every pull request. GitHub Actions
(`ci.yml`) runs types, tests and the build on each pull request.

## Where things live

- [VISION.md](VISION.md): the game, its world and its story.
- [PLAN.md](PLAN.md): milestones and status.
- [DESIGN.md](DESIGN.md): where each system lives and how to add to it.
- [ARCHITECTURE.md](ARCHITECTURE.md): the decisions behind the build.
- [ONBOARDING.md](ONBOARDING.md), [ECONOMY.md](ECONOMY.md),
  [MISSIONS.md](MISSIONS.md), [COMMS.md](COMMS.md),
  [NAVIGATION.md](NAVIGATION.md), [HUD.md](HUD.md): the systems a player
  meets.
- [COPY.md](COPY.md): the copywriting rules.
- [ART-SLOTS.md](ART-SLOTS.md): the image slots. The brand lives in
  `branding/` (at the repository root).

## Working on it

`src/sim` never imports Three.js: the simulation runs in fixed 1/60 s steps on
plain data, so tests and the pilots play it headless. Cards, upgrades, systems,
captains, story beats and endings are rows in `src/content/`; their rules live
in `src/sim/`. Every visible line goes through `t()` and needs a German twin in
`src/i18n/de/`. See [CLAUDE.md](../CLAUDE.md) for the full set of house rules.
