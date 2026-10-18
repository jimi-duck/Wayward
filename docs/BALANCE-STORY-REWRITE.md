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
| Quota / delivered at start | 100 / 80 | Nearly there. One rock gives about 5 to 9 Cyrite, so the 20 still needed is out of reach in the lessons and the chase; a player who mined the rest in the chase still sees the delivery window closed. |
| Company cuts | refinery 40, lease 12, fuel reserve 20, escrow 6 | Takes 78 of 100 before the upgrade. |
| Upgrade instalment | the torpedo bay's real price (20 today) | Left: 2 Cyrite. The ledger is live, so a price change moves it. |
| Breach | penalty 15 + lease 12 + instalment 20 = 47 owed | More than Juno holds; compliance leaves her in debt. |
| Score steps | −14 breach, −6 or −3 Tam, −30 stolen, −38 archive | 412 to 324 at the end of the chain (the "under review" band, above the 300 toll line). |

Measured: the unit tests in `tests/civic.test.ts`, `tests/story.test.ts` and `tests/tutor.test.ts` run the chain with every answer and check the Score stays at 300 or above. Not measured: how long the opening takes, whether 100 raiders-worth of chase is fair on a phone, and the pilots (`npm run pilot:breakout` was started but its result is not recorded here).
