# The first minutes

The opening is one work contract that turns into a personal crisis (brief:
[WAYWARD_Act1_Onboarding_Redesign](CLAUDE_STORY_REWRITE_BRIEF.md) and the owner's
opening update; canon in [STORY_BIBLE.md](STORY_BIBLE.md)). Juno is a contractor on
**Contract 08-441**, flying a leased Continuance hauler (`OB-7731-A`). The contract
asks for 1,000 Cyrite. Each beat teaches one thing the game already does and tells one
new thing about the world.

## Four things, kept apart

| Thing | Unit | Where it lives |
|---|---|---|
| Cargo held | Cyrite ore | Tutor state (`onboard`); the HUD reads "Cargo 800 / 1,000" with the Civic Score band word. The Work Bay never takes it. |
| Credit | the purse (`w.cyrite`) | Almost nothing: 4 at the Work Bay. |
| Financing | credit | The torpedo launcher (20), put on the company's account against the payout. Not paid at the bay. |
| Debt | credit | Short-delivery penalty, the lease and the financed launcher, only when the contract breaches. |

Arithmetic (`sim/contract.ts`): the Work Bay shows what 1,000 Cyrite would earn:
gross 100 − refinery 40 − lease 12 − fuel reserve 20 − escrow 6 − launcher 20 = **2
credit left**. If the contract breaches, the bill is made extreme on purpose (2026-10-19): the 1,000 undelivered at the replacement rate (ten times what a delivery would have paid her) + penalty 250 + whole lease term 120 + collection fees 110 + launcher 20 =
**1,500 owed**; the payout is withheld. Nothing of the contract is saved (the journey keeps
the Score, the flags and the purse); no migration was needed.

## The beats

| Beat | Where | Play | What it shows |
|---|---|---|---|
| 1 Mining | Cerro, outlying mine | One opening page (`ui/opening.ts`), then the controls card, then mine. The hold has 800 of 1,000 from the first minute to the raiders; the lesson rocks teach mining and add nothing to it. The HUD shows cargo, the quota and the Civic Score band word. Objective: dock at the Work Bay | Ordinary admin; the cargo is aboard, not delivered |
| 2 Work Bay | Depot, a short hop off | Docking is the one pausing card of the lessons: **Account and launcher** (`story_bay`). The Work Bay takes no cargo. The ledger shows the 800 / 1,000 held, the credit (4), the contract's charges and a projection (2 left after the launcher). Sam Okoro, a friend and not Work Bay staff, speaks over the radio. One choice, "Install the launcher": financed, nothing paid now. Torpedoes are unlimited (the rack reloads by itself) | The company's grip, in one place; a practical reason to take on debt |
| 3 Raiders | Past the depot's field | Second rock (the hold still 800), then two ships close in as white **UNKNOWN** markers. In range the world stops: `story_raiders`, the raider's transmission. **Pay up & allow boarding** ends in `story_seized` ("Game over · contract terminated") and the opening starts again. **Refuse** turns both red, and the nearer one fires a missile at once, scripted to always hit (it cannot be shot down or dodged): the hit tears the pod away (`cargoLost`, a centre notice, and the hit ripple on the hull; no bubble) | A real choice; the cargo loss is seen, so the breach feels fair |
| 4 Escape | gate 1.9 km ahead | After the second raider: "Inbound contacts detected" centre notice, radio "Additional hostile contacts detected. Jump gate distance: 1.9 kilometres.", objective "Reach the jump gate". Waves of Custody raiders, not meant to be fought | Danger, and a forced exit |
| 5 Breach | beyond the gate | `story_breach`: Lane Control's notice (delivery 0 / 1,000, payout withheld, penalty, lease, the financed launcher, asset recovery authorised, balance owed 1,500). One action, "Proceed to the audit lane": no escape yet. No Score change | State and company kept apart; the debt outlives the ship |
| 6 The theft | on the way to the audit lane | `story_sam` a few seconds later: Sam, privately, with a maintenance code for the owner lock. One action, "Enter Sam's code · override the lock". The hull is stolen; Score −130 (COMPLIANT to RESTRICTED), the one big fall | Juno becomes a thief by one choice |
| 7 Rename | same | A centre notice: "Vessel registry · unrecognised", then WAYWARD. The 3D hull is not repainted yet | |
| 8 Archive | same | `story_wake`: the override wakes a sealed partition. Krail reserves 94% against a shortage order of the same day; the relay in Halden's Reach; a legacy key good for this hull only | One contradiction and a lead |

The first jump shows no chart: the lane out of Cerro is the only way, and it goes straight to the next system
(`autoCourse` in `sim/journey.ts`, used by `sortieOver`).

Dying before the jump gate (a wreck, or taking the raiders' offer) restarts the whole
opening from fresh: a new world, the training again, nothing kept (`restartOpening` in
`main.ts`; `Outcome.redo`). The wreck does not count against the region. Later systems
play as before.

Civic Score: the number is hidden from the player (2026-10-19). Inside, 412 → 282 at the theft (one fall, COMPLIANT to RESTRICTED); the breach and the archive do not move it; the player sees only the band word (COMPLIANT, UNDER REVIEW, RESTRICTED …) and a "Civic Score ↓" chip on a choice that lowers it. The Wall keeps the
archive entry; Lior Calloway's signature (the minutes) is a different clue from Ada's
black box recording.

## How it is built

- `sim/contract.ts`: the ledgers (`bayLedger`, `breachLedger`, `seizedLedger`,
  `lockLedger`, `archiveLedger`) and the constants. A card shows one with
  `CardDef.ledger`; the panel draws it under the text. `CardDef.reply` is a second voice
  on the same card; `Outcome.fit` fits an upgrade; `Outcome.hostile` turns every ward in
  sight hostile; `Outcome.redo` asks the app to start the opening again.
- `sim/tutor.ts`: mine, bay, haul, shoot. `settleAtBay` runs when the player docks. The
  raiders are wards tagged `UNKNOWN` (`sim/enemies.ts`) until the offer is refused, and
  `parley` opens `story_raiders` when both are within 70 units. Radio lines are
  once-only pings. It ends in `World.startChase`.
- `content/story.ts`: `CERRO_BEATS` is the chain past the gate (breach, Sam, wake).
  `dueBeat` (`sim/story.ts`) deals it on the first sortie beyond Cerro and finishes it
  later if it was cut short; a journey whose `archive_woke` is set skips it.
- Cerro itself has no story card, so nothing interrupts the lessons except the account
  the player asked for by docking and the raiders' offer.

Nothing else locks. Every answer in the chain leads on (the raiders' offer is the one
failure state).

## The chase

When the second raider falls the training stops and the run begins. The gate is set 1.9 km ahead, the objective reads "Reach the jump gate" with "Reinforcements inbound · break contact", and growing waves arrive from behind (`chaseCap`, `chaseGap`, `chaseHull`, `chaseLabel` in `sim/breakout.ts`). Arcade has no chase and no cargo.

## Pop-up gist

Story cards carry a `gist` of at most ten words (set in `content/story.ts`), shown above the text so a pop-up reads at a glance.

## v5 handover (2026-10-20)

The opening follows the "Pop-ups, v2" sheet and the v5 handover: two opening cards (resident record, then the contract
notice), each with one button and an optional file that starts closed. The Work Bay, raiders, breach, Sam and archive
cards use the sheet's headlines, with Juno's line (hidden on short phones) and an optional attachment (`attach` on the
card). No score, band or delta shows in the onboarding: the Score still moves behind the scenes (`civicQuiet`).

Where the sheet and the code differ, the code stands: the breach bill is 1,500 credit (user's call, 2026-10-19), not
47, and the short-delivery penalty is 250, not 15. The contract file reads its figures from `sim/contract.ts`.
