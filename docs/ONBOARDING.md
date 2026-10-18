# The first minutes

The opening is one work contract that turns into a personal crisis (brief:
[WAYWARD_Opening_Onboarding_Claude_Brief](CLAUDE_STORY_REWRITE_BRIEF.md) and the
owner's opening update; canon in [STORY_BIBLE.md](STORY_BIBLE.md)). Juno is a
contractor on **Contract 08-441**, flying a leased Continuance hauler (`OB-7731-A`).
She has delivered 80 of 100 Cyrite. Each beat teaches one thing the game already
does and tells one new thing about the world.

| Beat | Where | Play | What it shows |
|---|---|---|---|
| 1 Quota | Cerro, outlying mine | Opening card (`ui/opening.ts`: contract, Delivered 80 / 100, Civic Score, "the hauler is the company's"), then the controls card, then mine a Cyrite rock | Ordinary admin; the work order is live on the HUD (`Contract 08-441 · n / 100`) |
| 2 Work bay | Depot, a short hop off | On the approach, Tam (`story_bay`) with the **ledger**: gross yield, then the refinery, lease, fuel reserve, escrow and the financed instalment taking it down to almost nothing. Dock, fit the torpedo bay | The company's cut; the upgrade is real and not free (`lease_financed`) |
| 3 Pirates | Past the depot's field | Two raiders ask for cargo or a toll (radio). Shoot both with the torpedoes. Then the contract desk: "Escort cover is not included in Contract 08-441." Reinforcements come in waves (raiders, strike wings, hunters) to a gate 1.9 km ahead | Competence, then danger; protection is a contract line. The later waves are not meant to be fought |
| 4 Breach | Beyond the gate (first sortie after Cerro) | `story_breach` (registry): berth withdrawn, audit lane, ledger of the shortfall, payout withheld, penalty and balance owed (Score −14). `story_yard`: Tam's maintenance code (owe Tam, Score −6) or the official lane (heat, Score −3) | State and company kept apart: the registry files the report, the company withholds pay |
| 5 Squeeze | same | `story_recovery` (company): contract terminated, asset recovery active, balance still payable, accreditation suspended | Compliance means no job, no ship, and the debt |
| 6 Theft | same | Override the owner lock, or ask Tam to appeal first (it does not suspend recovery; the crew is closer). Both lead to the same act: `ship_stolen` (Score −30), a centre notice renames her **WAYWARD**, and the Prefect's desk is told a hull is missing | The legally assigned pilot becomes a thief by this one choice |
| 7 Archive | same | `story_wake`: the override wakes the archive (ADA-1). Krail reserves 94% against a shortage order of the same day; the registry logs the access (Score −38). Tam on the radio: get to the Reach | One contradiction, no more; a lead |

The Score runs 412 → 398 → 392 (or 395) → 362 → 324. All amounts and Score
steps are design targets in [BALANCE-STORY-REWRITE.md](BALANCE-STORY-REWRITE.md).

## How it is built

- `sim/contract.ts`: the two ledgers (`bayLedger`, `breachLedger`, `recoveryLedger`)
  read the live game: the price of the first upgrade (`bay.ts`), the Cyrite the
  mine gave (`Carry.contract.got`, saved at the jump, save v19). A card shows one
  with `CardDef.ledger`; the comms panel draws it under the text.
- `sim/tutor.ts`: mine, bay (Tam's card on approach), shoot (two raiders). It
  ends in `World.startChase` and the contract desk's radio line.
- `content/story.ts`: `CERRO_BEATS` is the chain past the gate. `dueBeat`
  (`sim/story.ts`) deals it on the first sortie beyond Cerro and finishes it on
  a later one if it was cut short; a journey whose `archive_woke` is set skips it
  (older saves, which had the wake in Cerro). The chain opens `OPENING_AT` (2 s)
  after arrival and each card follows the last at once (`follow.quick`).
- Cerro itself has no story card, so nothing interrupts the lessons.

Nothing locks. Every answer in the chain leads on; Tam's code is an option, not
a need; a player with no Cyrite and a wrecked hull plays the same cards.

## Keep it short

The opening card is one page. No story pop-up fires during the lessons. After the gate the chain is four cards, one answer each (Tam's has two, the recovery order has two); the user asked for few pop-ups, and these four are the story.

## The chase

When the second raider falls the training stops and the run begins. The gate is set 1.9 km ahead, the objective reads "Run for the jump gate", and the raiders' friends arrive from behind in growing waves: raiders, strike wings, hunters (`chaseCap`, `chaseGap`, `chaseHull`, `chaseLabel` in `sim/breakout.ts`). Later waves are not meant to be fought. The jump loses them. Arcade has no chase.

## Pop-up gist

Story cards carry a `gist` of at most ten words (set in `content/story.ts`), shown above the text so a pop-up reads at a glance. Cards without one fall back to a derived line.
