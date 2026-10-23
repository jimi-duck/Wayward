# Arcade balance

Written by `npm run pilot:arcade`: 6 seeded runs per strategy, each capped at 10:00.
Krail is from wrecks / from rock. The pilot flies the same seeds every time.

| Strategy | Mean time | Contacts | Krail wreck / rock | Wreck share | First refit | Refits | Score | Survived |
|---|---|---|---|---|---|---|---|---|
| random | 7:27 | 28.8 | 777 / 270 | 74% | 0:46 | 15.8 | 99,550 | 0/6 |
| laser+defence | 8:38 | 33.5 | 1104 / 591 | 65% | 0:46 | 22.8 | 340,442 | 1/6 |
| torpedo+laser | 7:32 | 32.3 | 1065 / 281 | 79% | 0:46 | 17.8 | 156,364 | 0/6 |
| mine+mobility | 9:03 | 38.5 | 1193 / 269 | 82% | 0:46 | 19.7 | 123,291 | 3/6 |

## Before and after

The Arcade now opens in a fight (three scouts, 3 s in, 60 to 80 units out, straight at the ship, where the old opening was one hull at 40 s that looked you over), and a dead hull pays `ARCADE_BOUNTY` (2.5) times the Krail it did, a capital ship too, with rock at `ARCADE_ROCK` (0.85). One difficulty only: the Arcade always plays on the Prospector row (`ARCADE_SURVIVAL`); the picker is Story-only.

Before (same seeds, 6 runs, 10:00 cap):

| Strategy | Mean time | Contacts | Krail wreck / rock | Wreck share | First refit | Refits | Score | Survived |
|---|---|---|---|---|---|---|---|---|
| random | 7:16 | 24.5 | 226 / 281 | 45% | 0:57 | 10.0 | 62,786 | 0/6 |
| laser+defence | 7:17 | 22.3 | 244 / 303 | 45% | 0:57 | 9.0 | 76,846 | 0/6 |
| torpedo+laser | 6:59 | 24.8 | 308 / 248 | 55% | 0:57 | 9.5 | 72,457 | 0/6 |
| mine+mobility | 8:17 | 28.7 | 368 / 284 | 56% | 0:57 | 11.8 | 90,313 | 2/6 |

Reading it: wrecks went from about half the Krail to about three quarters, refits came 50 to 150 percent more often, and survival is level (0 to 2 of 6 before, 0 to 3 after). Feel is not measured: the pilot cannot say whether the opening reads as a fight or the extra upgrades feel earned. That wants a real-device play.
