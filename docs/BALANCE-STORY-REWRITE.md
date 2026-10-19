# Balance: the story rewrite

Measured in the cloud container with the headless pilots; nothing here is a playtest.

## Baseline (main at `1e318c4`, before the rewrite)
- `npm run check`: 55 test files, 768 tests, green. `npm run build`: green.

## After the rewrite (branch `claude/story-rewrite-ybj2ep`)
- `npm run check`: 784 tests, green. `npm run build`: green.
- `pilot:breakout`: passed (one test, about 640 s).
- `JOURNEY_SET=eight pilot:journey`: no confirmed result. The baseline run on main hit the pilot's own 2 hour cap and failed; the run on this branch printed nothing, though `docs/BALANCE-LONG.md` was regenerated at 16:50 UTC. I cannot tell which run wrote it, so it is not committed (a copy is in `/mnt/project-files/story-rewrite/BALANCE-LONG.unverified.md`). The pilot needs a faster machine or a smaller seed count.

## What the rewrite changes in numbers
- Civic Score starts at 412; the wake costs 38 (374, band "review"). Fuel draw from the yard costs 10, interfering with Custody 20 to 40, firing on an Offices cutter 30.
- Under 300 the officials' fees rise by a quarter.
- Score never changes heat, standing, the Net or the hunt on its own; those keep their own rules.
- New beats are follow-ups gated on an earlier choice (`Beat.needs`). The main spine, the eight fragments and the six endings are untouched, and every follow-up has a free answer (tests/civic.test.ts).

## Not measured
- Pacing and reading time of the new cards, phone layout of the Wall, and how often players see each follow-up. Needs a playtest.

## The opening contract (Contract 08-441)

Design targets, all in `sim/contract.ts` and `sim/civic.ts`, none playtested:

| Number | Value | Why |
|---|---|---|
| Quota / delivered / onboard | 1,000 / 800 after the Work Bay / 600 at the start | The shift is under way; the first rock tops the hold up to 800; the second rock's 200 is lost to the raiders. |
| Company cuts (credit) | refinery 40, lease 12, fuel reserve 20, escrow 6 of 100 | Leaves 22. |
| Rack | the torpedo bay's real price (20), paid up front | Leaves 2. Not also added to the lease. |
| Breach | penalty 15 + lease 12 = 27 owed | Payout withheld; asset recovery authorised. |
| Score steps | −14 breach, −30 stolen, −38 archive | 412 to 330 (the "under review" band, above the 300 toll line). |

Measured: `npm run check` (tsc and 806 tests) and `npm run build` on this branch; the unit tests run the chain with every answer and check the arithmetic and the Score stay at 300 or above (`tests/civic.test.ts`, `tests/story.test.ts`, `tests/tutor.test.ts`), including a migrated v19 save that carries the old `contract` field. Not measured: how long the opening takes, whether the chase is fair on a phone, and the pilots (not re-run after this change).
