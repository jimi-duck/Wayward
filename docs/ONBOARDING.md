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

Arithmetic (`sim/contract.ts`), as the opening sheets show it (2026-10-22): the Work Bay projects what 1,000 Cyrite
would settle for, **100 CR gross − 98 CR charges = 2 CR**, on delivery and not yet earned (the charges are refinery 40,
lease 12, fuel reserve 20, escrow 6 and the launcher 20). If the contract breaches, the bill is **15 CR penalty + 12 CR
lease + 20 CR financed launcher = 47 CR outstanding**; the settlement is withheld and never netted against it. Credit
reads `CR` everywhere. Nothing of the contract is saved; no migration was needed.

## The beats

| Beat | Where | Play | What it shows |
|---|---|---|---|
| 1 Mining | Cerro, outlying mine | No card first: the journey starts in flight (sheet A). The objective reads "Contract 08-441", the lesson, and "200 Cyrite remaining · Cerro". The hold has 800 of 1,000 from the first minute to the raiders; the lesson rocks teach mining and add nothing to it. The HUD shows cargo, the quota and the Civic Score band word. Objective: dock at the Work Bay | Ordinary admin; the cargo is aboard, not delivered |
| 2 Work Bay | Depot, a short hop off | Docking is the one pausing card of the lessons (`story_bay`, sheets B and B2): Sam Okoro, a friend on the radio and not Work Bay staff, beside the projected settlement, with an optional account summary. One action, "Install launcher · finance 20 CR": nothing paid now. Then a centre notice, "Torpedo launcher online", with this device's torpedo control (sheet C). Torpedoes are unlimited (the rack reloads by itself) | The company's grip, in one place; a practical reason to take on debt |
| 3 Raiders | Past the depot's field | Second rock (the hold still 800), then two ships close in as white **UNKNOWN** markers. In range the world stops: `story_raiders`, the raider's transmission. **Pay up & allow boarding** ends in `story_seized` ("Game over · contract terminated") and the opening starts again. **Refuse** turns both red, and the nearer one fires a missile at once, scripted to always hit (it cannot be shot down or dodged): the hit tears the pod away (`cargoLost`, a centre notice, and the hit ripple on the hull; no bubble) | A real choice; the cargo loss is seen, so the breach feels fair |
| 4 Escape | gate 1.9 km ahead | "Cargo lost · 0 / 1,000 Cyrite" and, after the second raider, "Hostile reinforcements inbound" (red centre notices, sheet E), radio "Additional hostile contacts detected. Reach the Jump Gate." (the HUD shows the live distance), objective "Reach the Jump Gate". Waves of Custody raiders, not meant to be fought | Danger, and a forced exit |
| 5 Breach | beyond the gate | `story_breach` (sheet F, red): delivery not received, settlement withheld, vessel recovery ordered, 47 CR outstanding, an optional breach invoice, and Lane Control's status beside it (ochre). One action, "Proceed to the audit dock": no escape yet | State and company kept apart; the debt outlives the ship |
| 6 The theft | on the way to the audit dock | `story_sam` a few seconds later (sheet G, ochre): Sam's private channel, two lines, "Using the code lifts the owner lock." One action, "Use the code". The hull is stolen | Juno becomes a thief by one choice |
| 7 Rename | same | `story_rename` (sheet H): the registry update, `OB-7731-A` struck through, WAYWARD, the ship in its new paint, one action "Take the helm". The 3D hull turns yellow | The new identity, not a legal one |
| 8 Archive | same | `story_wake` (sheet I): 94% Krail reserves, logged on the day the shortage order was signed; Halden's Reach next. "Set course: Halden's Reach", or "Open record" first | One contradiction and a lead |

The first jump shows no chart: the lane out of Cerro is the only way, and it goes straight to the next system
(`autoCourse` in `sim/journey.ts`, used by `sortieOver`).

Dying before the Jump Gate (a wreck, or taking the raiders' offer) restarts the whole
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

When the second raider falls the training stops and the run begins. The gate is set 1.9 km ahead, the objective reads "Reach the Jump Gate" with "Reinforcements inbound · break contact", and growing waves arrive from behind (`chaseCap`, `chaseGap`, `chaseHull`, `chaseLabel` in `sim/breakout.ts`). Arcade has no chase and no cargo.

## Pop-up gist

Story cards carry a `gist` of at most ten words (set in `content/story.ts`), shown above the text so a pop-up reads at a glance.

## Opening chapter sheets (2026-10-23)

The opening's pop-ups follow the owner's opening chapter mockups v10 and design guidelines v6, and look like the
registry update (sheet H): Neon Glass in the role colour, numbered actions, documents that open on request and close
back to their card. The rules and where they live are in [DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md); the cards'
fields (`glass`, `status`, `hero`, `quote`, `note`, `doc`, `side`) are in `CardDef`. They replace the v5 handover's
opening cards, Juno's lines, the attachments and the Rajdhani registry card.

The registry update shows the real previous hull ID, `OB-7731-A`, struck through. Its hero is the owner's clean ochre
ship (2026-10-22). The "Original livery" thumbnail is the earlier grey art, which already has WAYWARD painted on it, so
it is a finish reference only, not a verified picture of the hull before the rename.
