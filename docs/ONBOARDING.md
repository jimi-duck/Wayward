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
| Cargo onboard | Cyrite ore | Tutor state (`onboard`); the HUD reads "Cargo onboard n / 1,000". Not counted yet. |
| Delivered | Cyrite ore | Tutor state (`delivered`), set only when the Work Bay accepts the load: 800 / 1,000, 200 remaining. |
| Credit | the purse (`w.cyrite`) | The settlement's net after the company's cuts, then what is left after the rack. |
| Debt | credit | Short-delivery penalty plus the lease, only if the contract breaches. |

Arithmetic (`sim/contract.ts`): gross 100 − refinery 40 − lease 12 − fuel reserve 20 −
escrow 6 = **22 credit**. The torpedo rack costs the bay's real price (20), **paid up
front** from that 22, leaving **2**. It is never also added to the lease, so it is
charged once. If the contract breaches: penalty 15 + lease due 12 = **27 owed**; the
payout is withheld. Nothing of the contract is saved (the journey keeps the Score, the
flags and the purse); no migration was needed, and an older save that still carries a
`contract` field ignores it.

## The beats

| Beat | Where | Play | What it shows |
|---|---|---|---|
| 1 Quota | Cerro, outlying mine | One opening page (`ui/opening.ts`: contract, Delivered 0 / 1,000, Registry status), then the controls card, then mine. The hold meter starts at 600 and the first rock tops it up to 800 | Ordinary admin; the cargo is aboard, not delivered |
| 2 Work Bay | Depot, a short hop off | Docking is the one pausing card of the lessons: **Settlement received** (`story_bay`), with the ledger down to 22 credit. One choice, "Install the rack" (−20 credit). Sam Okoro's line is the quote | The company's cut, in one place; the upgrade is real and charged once. Delivered 800 / 1,000 |
| 3 Pirates | Past the depot's field | Second rock, then raiders on the radio only (live play, no pop-up): they demand the toll and boarding rights. Shoot both. The hold's last 200 is lost with the pod (`cargoLost`, a centre notice), reinforcements called | The cargo loss is seen, so the breach feels fair |
| 4 Escape | gate 1.9 km ahead | The first jump is not a choice: waves of Custody raiders, strike wings and hunters, not meant to be fought | Danger, and a forced exit |
| 5 Breach | beyond the gate | One comms thread, `story_breach`: Lane Control's registry notice (delivery 800 / 1,000, shortfall 200, payout withheld, penalty and lease, balance owed 27, asset recovery authorised, no responsibility for cargo lost, compulsory labour for unpaid balances) with Sam cutting in on the private channel. One confirmed action, "Use Sam's code · break the owner lock". Score −14, then −30 | State and company kept apart; Juno becomes a thief by one choice |
| 6 Rename | same | A centre notice: "Vessel registry · unrecognised". The 3D hull is not repainted yet | |
| 7 Archive | same | `story_wake`: the override wakes a sealed partition. Krail reserves 94% against a shortage order of the same day; the relay in Halden's Reach; a legacy key good for this hull only (the Wayward's obsolete hardware and registry handshake are why the ship is needed). Score −38 | One contradiction and a lead |

Registry status: the number is hidden from the player (2026-10-19). Inside, 412 → 398 (breach) → 368 (stolen) → 330 (archive wake); the player sees only the band word (COMPLIANT, UNDER REVIEW, RESTRICTED …) and a "Registry ↓" chip on a choice that lowers it. The Wall keeps the
archive entry; Lior Calloway's signature (the minutes) is a different clue from Ada's
black box recording.

## How it is built

- `sim/contract.ts`: the three ledgers (`bayLedger`, `breachLedger`, `archiveLedger`)
  and the constants. A card shows one with `CardDef.ledger`; the panel draws it under
  the text. `CardDef.reply` is a second voice on the same card; `ChoiceDef.unit` names
  credit in the cost chip; `Outcome.fit` fits an upgrade.
- `sim/tutor.ts`: mine, bay, haul, shoot. `settleAtBay` runs when the player docks.
  Radio lines are once-only pings. It ends in `World.startChase`.
- `content/story.ts`: `CERRO_BEATS` is the chain past the gate (breach, wake). `dueBeat`
  (`sim/story.ts`) deals it on the first sortie beyond Cerro and finishes it later if it
  was cut short; a journey whose `archive_woke` is set skips it (older saves).
- Cerro itself has no story card, so nothing interrupts the lessons except the one
  settlement, which the player asked for by docking.

Nothing locks. Every answer in the chain leads on.

## The chase

When the second raider falls the training stops and the run begins. The gate is set 1.9 km ahead, the objective reads "Run for the jump gate" with "Reinforcements inbound · break contact", and growing waves arrive from behind (`chaseCap`, `chaseGap`, `chaseHull`, `chaseLabel` in `sim/breakout.ts`). Arcade has no chase and no cargo.

## Pop-up gist

Story cards carry a `gist` of at most ten words (set in `content/story.ts`), shown above the text so a pop-up reads at a glance.
