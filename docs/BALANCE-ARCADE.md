# Arcade balance

Written by `npm run pilot:arcade`: 12 seeded runs per strategy, each capped at 10:00.
Krail is from wrecks / from rock. The pilot flies the same seeds every time.

| Strategy | Mean time | Contacts | Krail wreck / rock | Wreck share | First refit | Refits | Score | Survived |
|---|---|---|---|---|---|---|---|---|
| random | 6:53 | 23.1 | 543 / 189 | 74% | 0:50 | 13.1 | 55,499 | 0/12 |
| laser+defence | 7:39 | 24.8 | 779 / 461 | 63% | 0:50 | 19.8 | 273,077 | 2/12 |
| torpedo+laser | 6:28 | 26.3 | 762 / 199 | 79% | 0:50 | 14.6 | 83,412 | 0/12 |
| mine+mobility | 6:41 | 23.8 | 620 / 183 | 77% | 0:50 | 13.5 | 56,495 | 1/12 |

**The bay and the hull.** *Earned*: the first refit's price aboard; *offered*: the bay first open; *wait*: mean seconds from a price
aboard to the bay open; *opens/min* and *picks/open*; *first spec*: the first specialisation; *mended*: plates the
self-repair put back; *hit→plate*: mean seconds from a plate lost to the hull whole again (never-mended plates left out);
*overlap*: seconds with a wave, a live event and a capital ship all at once. The pilot cannot measure seconds paused in the bay.

| Strategy | First refit earned | First bay | Wait | Opens/min | Picks/open | First spec | Mended | Hit→plate | Overlap |
|---|---|---|---|---|---|---|---|---|---|
| random | 0:49 | 0:50 | 13.5 s | 1.53 | 1.23 | 5:24 | 0.7 | 59 s | 1 s |
| laser+defence | 0:49 | 0:50 | 14.3 s | 1.82 | 1.34 | 4:56 | 0.5 | 37 s | 1 s |
| torpedo+laser | 0:49 | 0:50 | 11.5 s | 1.81 | 1.21 | 2:11 | 0.2 | 39 s | 0 s |
| mine+mobility | 0:49 | 0:50 | 12.6 s | 1.70 | 1.18 | 3:17 | 0.8 | 37 s | 0 s |

**Capital ships and builds.** The pilot always fights a capital ship it can reach, so *avoided* tells little.

| Strategy | First capital | First outcome | Builds (runs) |
|---|---|---|---|
| random | 3:27 | killed 12, avoided 0, escaped 0, none 0 | Interceptor / bulwark 3, Cone gunship 2, Torpedo boat / prospector 1, Chain-lance gunship / torpedo boat 1, Brawler / bulwark 1, Torpedo boat 1, Gunship 1, Bulwark / torpedo boat 1, Heavy torpedo boat 1 |
| laser+defence | 3:27 | killed 12, avoided 0, escaped 0, none 0 | Cone gunship 4, Gunship 3, Chain-lance gunship 3, Heavy-lance gunship 2 |
| torpedo+laser | 3:27 | killed 10, avoided 0, escaped 0, none 0 | Heavy torpedo boat 5, Singularity torpedo boat 3, Precision torpedo boat 3, Heavy torpedo boat / gunship 1 |
| mine+mobility | 3:27 | killed 11, avoided 0, escaped 0, none 0 | Minefield minelayer 7, Chain-reaction minelayer 4, Minelayer 1 |

## History

**14 November 2026, release 1 of the Arcade plan** (the bay once per quiet spell with Fit another, the
difficulty step, the roll lesson). The tables above are with the pilot pressing B in a quiet moment when a refit is
paid for, as a player who knows the key would. With `PILOT_NO_B=1` (the bay only opens by itself) the pilot takes
fewer refits (random 12.1, laser+defence 13.0, torpedo+laser 16.5, mine+mobility 11.6), waits about 30 s from a
price aboard to the bay, and opens it about once a minute; first refit 0:55. Mean times 6:59, 7:48, 7:34, 7:09.

**What made the Arcade harder after 7 November.** The 7 November table (below) was written before #483 and #485
were merged under #484. Flying the commits: d219cd7 (before #483) is the 7 November table; bc85100 (#483, livelier
upgrades: reactor wired in, deflectors, point defence, chain lances) cost laser+defence six refits and 0:43
(8:43 to 8:00); #485 (stations) changed nothing; 80bf343 (#484, the pack) took another 0:14 to 0:32 a strategy. Every
commit after it to bf3ed72 flies the same numbers.

| Commit | random | laser+defence | torpedo+laser | mine+mobility |
|---|---|---|---|---|
| d219cd7 (before #483) | 7:01, 2/12 | 8:43, 4/12 | 7:38, 1/12 | 8:06, 2/12 |
| bc85100 (#483) | 6:51, 0/12 | 8:00, 3/12 | 7:13, 2/12 | 7:56, 0/12 |
| 80bf343 (#484) to bf3ed72 | 6:44, 0/12 | 7:46, 1/12 | 6:41, 1/12 | 7:17, 2/12 |

**7 November 2026** (written with #484; flies like d219cd7):

| Strategy | Mean time | Contacts | Krail wreck / rock | Wreck share | First refit | Refits | Score | Survived |
|---|---|---|---|---|---|---|---|---|
| random | 7:10 | 23.2 | 597 / 224 | 73% | 0:53 | 14.8 | 67,428 | 1/12 |
| laser+defence | 8:33 | 31.2 | 1011 / 561 | 64% | 0:53 | 18.3 | 306,314 | 4/12 |
| torpedo+laser | 7:15 | 30.3 | 946 / 238 | 80% | 0:53 | 17.1 | 113,252 | 2/12 |
| mine+mobility | 6:37 | 24.3 | 581 / 182 | 76% | 0:53 | 12.5 | 56,962 | 1/12 |
