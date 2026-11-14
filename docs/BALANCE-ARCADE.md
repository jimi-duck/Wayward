# Arcade balance

Written by `npm run pilot:arcade`: 12 seeded runs per strategy, each capped at 10:00.
Krail is from wrecks / from rock. The pilot flies the same seeds every time.

| Strategy | Mean time | Contacts | Krail wreck / rock | Wreck share | First refit | Refits | Score | Survived |
|---|---|---|---|---|---|---|---|---|
| random | 7:09 | 23.0 | 555 / 198 | 74% | 0:50 | 13.7 | 55,631 | 0/12 |
| laser+defence | 8:19 | 25.8 | 882 / 487 | 64% | 0:50 | 19.7 | 283,580 | 2/12 |
| torpedo+laser | 7:27 | 31.6 | 1016 / 257 | 80% | 0:50 | 19.8 | 123,699 | 2/12 |
| mine+mobility | 7:15 | 24.3 | 697 / 189 | 79% | 0:50 | 14.6 | 61,731 | 0/12 |

**The bay and the hull.** *Earned*: the first refit's price aboard; *offered*: the bay first open; *wait*: mean seconds from a price
aboard to the bay open; *opens/min* and *picks/open*; *first spec*: the first specialisation; *mended*: plates the
self-repair put back; *hit→plate*: mean seconds from a plate lost to the hull whole again (never-mended plates left out);
*overlap*: seconds with a wave, a live event and a capital ship all at once. The pilot cannot measure seconds paused in the bay.

| Strategy | First refit earned | First bay | Wait | Opens/min | Picks/open | First spec | Mended | Hit→plate | Overlap |
|---|---|---|---|---|---|---|---|---|---|
| random | 0:49 | 0:50 | 15.5 s | 1.54 | 1.24 | 4:59 | 0.7 | 52 s | 0 s |
| laser+defence | 0:49 | 0:50 | 17.9 s | 1.62 | 1.39 | 5:15 | 0.3 | 49 s | 0 s |
| torpedo+laser | 0:49 | 0:50 | 14.9 s | 1.83 | 1.38 | 2:11 | 0.5 | 39 s | 1 s |
| mine+mobility | 0:49 | 0:50 | 15.6 s | 1.57 | 1.25 | 3:17 | 0.5 | 49 s | 0 s |

**Capital ships and builds.** The pilot always fights a capital ship it can reach, so *avoided* tells little.

| Strategy | First capital | First outcome | Builds (runs) |
|---|---|---|---|
| random | 3:27 | killed 12, avoided 0, escaped 0, none 0 | Interceptor / bulwark 2, Bulwark 1, Precision torpedo boat / prospector 1, Chain-lance gunship / torpedo boat 1, Brawler / bulwark 1, Cone gunship 1, Torpedo boat 1, Gunship 1, Cone gunship / interceptor 1, Bulwark / torpedo boat 1, Torpedo boat / gunship 1 |
| laser+defence | 3:27 | killed 12, avoided 0, escaped 0, none 0 | Cone gunship 4, Chain-lance gunship 4, Heavy-lance gunship 2, Gunship 2 |
| torpedo+laser | 3:27 | killed 10, avoided 0, escaped 0, none 0 | Heavy torpedo boat 4, Precision torpedo boat 3, Heavy torpedo boat / gunship 2, Heavy-lance gunship / torpedo boat 1, Cone gunship / torpedo boat 1, Singularity torpedo boat 1 |
| mine+mobility | 3:27 | killed 11, avoided 0, escaped 0, none 0 | Minefield minelayer 7, Chain-reaction minelayer 4, Minelayer 1 |

## History

**14 November 2026, evening: the bay opens by itself between waves whenever a refit is paid for** (owner's call), not
once per quiet spell. The tables above press B as well. With `PILOT_NO_B=1`: mean times 7:10, 7:58, 7:21, 7:01;
refits 11.8, 12.8, 15.8, 11.0; first bay 0:55; about one opening a minute, 30 s from a price aboard to the bay (the
wave has to clear). Most of the gap to the B tables is the focus pilots saving for a part they cannot fit yet: leaving
with Cyrite unspent, the bay waits one price further on, while the B pilot looks again every 4 s.

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
