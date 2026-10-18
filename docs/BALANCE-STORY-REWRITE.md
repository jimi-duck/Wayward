# Balance: the story rewrite

Measured in the cloud container with the headless pilots; nothing here is a playtest.

## Baseline (main at `1e318c4`, before the rewrite)
- `npm run check`: 55 test files, 768 tests, green. `npm run build`: green.

## After the rewrite (branch `claude/story-rewrite-ybj2ep`)
- `npm run check`: 784 tests, green. `npm run build`: green.
- `pilot:breakout`: passed (one test, about 640 s).
- `JOURNEY_SET=eight pilot:journey`: see the section below once it has finished.

## What the rewrite changes in numbers
- Civic Score starts at 412; the wake costs 38 (374, band "review"). Fuel draw from the yard costs 10, interfering with Custody 20 to 40, firing on an Offices cutter 30.
- Under 300 the officials' fees rise by a quarter.
- Score never changes heat, standing, the Net or the hunt on its own; those keep their own rules.
- New beats are follow-ups gated on an earlier choice (`Beat.needs`). The main spine, the eight fragments and the six endings are untouched, and every follow-up has a free answer (tests/civic.test.ts).

## Not measured
- Pacing and reading time of the new cards, phone layout of the Wall, and how often players see each follow-up. Needs a playtest.
