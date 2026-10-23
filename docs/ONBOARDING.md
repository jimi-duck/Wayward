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
| Cargo held | Cyrite ore | Tutor state (`onboard`); the HUD reads "Cargo 800 / 1,000". The Work Bay never takes it. |
| Credit | the purse (`w.cyrite`) | Almost nothing: 4 at the Work Bay. |
| Financing | credit | The torpedo launcher (20), put on the company's account against the payout. Not paid at the bay. |
| Debt | credit | Short-delivery penalty, the lease and the financed launcher, only when the contract breaches. |

Arithmetic (`sim/contract.ts`), after the owner's opening handover (2026-10-23, saved in the shared folder as
`story-rewrite/OPENING-HANDOVER-2026-10-23.md`): the Work Bay projects what 1,000 Cyrite would settle for, **100 CR
gross − 98 CR charges = 2 CR**, on delivery and not yet earned (the 98 is never itemised on screen). If the contract
breaches, the bill is **25 CR penalty + 35 CR lease + 20 CR financed launcher = 80 CR outstanding**; the settlement is
withheld and never netted against it. Credit reads `CR` everywhere. The debt is worked out from these constants, not
stored, so nothing of the contract is saved and no migration was needed.

## The beats

| Beat | Where | Play | What it shows |
|---|---|---|---|
| 1 Mining | Cerro, outlying mine | No card first: the journey starts in flight (sheet A). The objective reads "Contract 08-441", the lesson, and "200 Cyrite remaining · Cerro". Sam on the radio, two beats ("Two hundred more and the hold's full…"). The hold has 800 of 1,000 from the first minute to the raiders; the lesson rocks teach mining and add nothing to it. The HUD shows cargo and the quota. Objective: dock at the Work Bay | Ordinary admin; the cargo is aboard, not delivered |
| 2 Work Bay | Depot, a short hop off | Docking is the one pausing card of the lessons (`story_bay`, sheets B and B2): Sam Okoro, a friend on the radio and not Work Bay staff, beside the projected settlement, with an optional account summary. One action, "Install torpedo launcher · finance 20 CR" ("Company-financed. 20 CR of debt."): nothing paid now. The card shows Gross, Charges, Settlement only. Then a centre notice, "Torpedo launcher online", with this device's torpedo control (sheet C), and Sam's "Launcher's ready" line. Torpedoes are unlimited (the rack reloads by itself) | The company's grip, in one place; a practical reason to take on debt |
| 3 Raiders | Past the depot's field | Second rock (the hold still 800), then two ships close in as white **UNKNOWN** markers. In range the world stops: `story_raiders`, the raider's transmission (source Unknown). **Surrender** ends in `story_seized` ("Game over · contract terminated") and the opening starts again. **Refuse** ("Then we do it the hard way." on the radio) turns both red, and the nearer one fires a missile at once, scripted to always hit (it cannot be shot down or dodged): the hit tears the pod away (`cargoLost`, a centre notice, and the hit ripple on the hull; no bubble) | A real choice; the cargo loss is seen, so the breach feels fair |
| 4 Escape | gate 8 km ahead | "Cargo pods hit · 0 / 1,000 Cyrite" and, after the second raider, "Hostile reinforcements inbound" (red centre notices, sheet E), Sam on each ("The hold's gone, Juno…", then "More ships coming in…"), objective "Escape to the Jump Gate" (the HUD shows the live distance). Waves of Custody raiders, not meant to be fought | Danger, and a forced exit |
| 5 Breach | beyond the gate | `story_breach` (sheet F, red): delivery not received, recovery and impound ordered, 80 CR outstanding, an optional breach invoice (25 + 35 + 20 = 80, "Vessel recovery initiated."), and Lane Control's status beside it (ochre): flagged for recovery, controls locked, recovery autopilot active. One action, "Proceed to the audit dock" | State and company kept apart; the debt outlives the ship |
| 5a Recovery | toward the audit dock | The forced recovery (`sim/recovery.ts`): the answer sets `recovery_flag`, the player's flight controls lock and an autopilot flies her toward the audit dock, holding 170 units short of it (the dock's call range is 150), guns cold, no hails. It steers round rock, bulwarks and other hulls on the way and eases off when something is close ahead (owner, 23 October 2026). The objective reads "Dock at the company port · Recovery autopilot active"; no countdown. Sam on the radio in four beats, nine seconds apart. Forty seconds of play later (paused time does not count; the owner, 23 October 2026) Sam's card opens, once | Control taken away, so getting it back means something |
| 6 The theft | same | `story_sam` (sheet G, ochre): "A way out", Sam's private channel, three lines (the debt stays in her name). One action, "Input the code": the owner lock lifts, the autopilot lets go, "Owner lock lifted · Autopilot disabled", and Sam's "Not the port now. The jump gate. Keep moving." The objective turns to the Jump Gate. The recovery flag stays | Juno becomes a thief by one choice |
| 7 Rename | same | `story_rename` (sheet H): "Local identity updated", `OB-7731-A` struck through, WAYWARD, the reveal copy ("An Obedience-class hauler…"), the readouts, the ship in its new paint, Sam's "Wayward. That sounds like yours.", one action "Take the helm". Before it, the rename reveal (`src/render/reveal.ts`, about 6.3 s; longer and wider at the owner's ask, 23 October 2026): "Owner lock lifted" low in the middle, one amber band sweeps the real hull grey to ochre bow to stern over two seconds, the camera swings slowly 105° round to her flank, lower and further off, over five seconds (not with a hostile gun in range, not with reduced motion), and the card comes up over that view; the camera eases back after "Take the helm". The flag is the livery, so a save loads ochre with no replay | The new identity, not a legal one |
| 8 Archive | same | `story_wake` (sheet I): a written message left in the ship's database ("Ship database · stored message", "Unsent"): a mail head (to whoever flies her next, no name given, kept in the crew notes), five paragraphs in the writer's voice with 94% Krail reserves on the day the gate-closure order was signed, Halden's Reach next, and an unsigned sign-off. No headline figure and no record to open (the owner, 23 October 2026). One action, "Set course: Halden's Reach". Then Sam's two after-jump beats and "Registry: Unregistered · Repaint will not pass a scan." | One contradiction and a lead |

Save and load in the chain: every answer is banked at once (`bankAnswer`, the answered card with it), and a load restarts
the system's sortie. A load during the recovery or on Sam's card deals Sam's card again two seconds in, with the controls
still locked (not the whole forty seconds, never past the code). A load on the registry card deals it again with the helm
free and the hull already ochre (no reveal). A load after it goes straight to the archive.

Halden's Reach is the archive's lead, but the chart has no fixed link from the post-jump system or the company port to a
system of that name: it is one of the names the chart deals (`content/systems.ts`). Unresolved; no motive was invented.

The first jump shows no chart: the lane out of Cerro is the only way, and it goes straight to the next system
(`autoCourse` in `sim/journey.ts`, used by `sortieOver`).

Dying before the Jump Gate (a wreck, or taking the raiders' offer) restarts the whole
opening from fresh: a new world, the training again, nothing kept (`restartOpening` in
`main.ts`; `Outcome.redo`). The wreck does not count against the region. Later systems
play as before.

Civic Score: removed from the game by the owner (2026-10-20), calculations included; save v20 drops the number from older saves. At the registry checkpoint, "Show your registry" now needs a registration that has already passed a scan (`codes_passed`).
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

When the second raider falls the training stops and the run begins. The gate is set 8 km ahead, the objective reads "Reach the Jump Gate" with "Reinforcements inbound · break contact", and growing waves arrive from behind (`chaseCap`, `chaseGap`, `chaseHull`, `chaseLabel` in `sim/breakout.ts`). Arcade has no chase and no cargo.

## Pop-up gist

Story cards carry a `gist` of at most ten words (set in `content/story.ts`), shown above the text so a pop-up reads at a glance.

## Opening chapter sheets (2026-10-23)

The opening's pop-ups follow the owner's opening chapter mockups v10 and design guidelines v6, and look like the
registry update (sheet H): Neon Glass in the role colour, numbered actions, documents that open on request and close
back to their card. The rules and where they live are in [DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md); the cards'
fields (`glass`, `status`, `hero`, `quote`, `note`, `doc`, `side`) are in `CardDef`. They replace the v5 handover's
opening cards, Juno's lines, the attachments and the registry card.

The registry update shows the real previous hull ID, `OB-7731-A`, struck through. Its hero is the owner's clean ochre
ship (2026-10-22). The "Original livery" thumbnail is the earlier grey art, which already has WAYWARD painted on it, so
it is a finish reference only, not a verified picture of the hull before the rename.
