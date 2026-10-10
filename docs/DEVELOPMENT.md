# Development

Moved from the README when it became the player-facing page.

## Developer notes

- Settings has a Dev review button that opens the review world, the same as `?dev`.
- `?dev` opens the review world: every ship, rock, item and feature, labelled,
  flown without risk ([docs/REVIEW.md](REVIEW.md)).
- `?train` plays the Arcade training again; `?short` plays the old three-region
  journey; `?nospace` turns the environment phenomena off
  ([docs/ENVIRONMENT.md](ENVIRONMENT.md)).
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

- [docs/VISION.md](VISION.md): the game, its world and its story.
- [docs/PLAN.md](PLAN.md): milestones and status.
- [docs/DESIGN.md](DESIGN.md): where each system lives and how to add to it.
- [docs/ARCHITECTURE.md](ARCHITECTURE.md): the decisions behind the build.
- [docs/ONBOARDING.md](ONBOARDING.md), [docs/ECONOMY.md](ECONOMY.md),
  [docs/MISSIONS.md](MISSIONS.md), [docs/COMMS.md](COMMS.md),
  [docs/NAVIGATION.md](NAVIGATION.md), [docs/HUD.md](HUD.md): the
  systems a player meets.
- [docs/COPY.md](COPY.md): the copywriting rules.
- [docs/ART-PASS.md](ART-PASS.md), [docs/ART-SLOTS.md](ART-SLOTS.md):
  the look and the image slots. The brand lives in `branding/` (at the repository root).

## Working on it

`src/sim` never imports Three.js: the simulation runs in fixed 1/60 s steps on
plain data, so tests and the pilots play it headless. Cards, upgrades, systems,
captains, story beats and endings are rows in `src/content/`; their rules live
in `src/sim/`. Every visible line goes through `t()` and needs a German twin in
`src/i18n/de/`. See [CLAUDE.md](../CLAUDE.md) for the full set of house rules.
