# Story bible

The one source of truth for the Story's canon. The owner's brief is
[CLAUDE_STORY_REWRITE_BRIEF.md](CLAUDE_STORY_REWRITE_BRIEF.md); where this file
and the brief differ, the brief wins and this file is wrong. Where this file and
the live code differ, check the callers and tests, then fix whichever is stale.
Status marks: **live** (in the game and tested), **planned** (specified here,
not yet built).

## 1. Logline, themes, rules

A pilot whose identity is owned by an authoritarian state steals a
decommissioned ore hauler and finds evidence that the state faked the crisis it
used to abandon whole worlds. Then she learns the lanes were also holding in a
threat that follows the one resource the state sells.

- **Guiding question.** How far will you go to keep moving, and what parts of
  yourself will you sell to do it? Under it: who benefits when survival is made
  conditional on obedience?
- **Dramatic promise.** The player depends on the Continuance (its fuel routes,
  jobs, ports, licensed gear, identity system), feels the cost of that
  dependence, and then finds out who the system leaves out.
- **Narrative rules.**
  1. Juno flies alone. Nobody joins the Wayward. Allies are voices on the radio
     and people in their own places.
  2. Show before explaining. A scan buoy before a speech about surveillance.
  3. One new idea per encounter. Reveals sharpen the next question.
  4. Story never interrupts a fight. Major cards come on arrival, after
     combat, at a port, on the chart or at a gate.
  5. Choices carry visible costs (chips) and never lock the way out.
  6. Every named person appears at least twice, with a short reminder if time
     has passed.
  7. The Thren are real. That never makes the regime right.

## 2. Canon glossary and resource rules

| Term | Canon | Mechanical form |
|---|---|---|
| **Krail** | The mineral at the heart of the old fabrication and infrastructure economy. The Continuance's public reason for the Severance: "a Krail shortage". | A name in the story. The Story's player never holds it. Old saves may say "Krail" in the Arcade's words (`krail` outcomes are paid in Cyrite). |
| **Cyrite** | The violet mineral Juno mines. Money in the Story (purse). Industrial-scale Cyrite extraction woke or drew the Thren. | `carry.cyrite`. The refinery sends it to the tank first. |
| **Jump fluid** | Refined Cyrite in the drive tank. Not interchangeable with unrefined Cyrite. | `carry.fuel`. |
| **Civic Score** | The Continuance's administrative judgement of a person: compliance, productivity, reliability, perceived political risk. Not Juno's moral worth. 0 to 500. | `carry.civic` (save v18). Distinct from `heat`, faction `standing`, notice, Calloway's hunt and the Net. |
| **The Continuance** | An emergency authority that became permanent. State coercion (Custody), surveillance (Offices of Peace), corporate extraction (Kellern and the other companies). | Factions: custody, office, kellern. |
| **The Wayward** | Decommissioned Continuance Obedience-class ore hauler, registry `OB-7731-A`. Regime ships carry approved virtue names; Juno paints over the marking and calls her WAYWARD, which is what the Continuance calls people who will not stay where they are put. | The player's ship. |
| **The Net** | The Continuance's checkpoint and surveillance network, spreading from Cerro. | `chart.net`, blockades, scans. |
| **The Scatter** | The outer worlds cut off 70 years ago. | The chart beyond Cerro. |
| **Holdfasts, Drifts, the Gutter** | Settled communities, nomad fleets, pirates and scavengers. Each is divided inside. | Factions: frontier/miners, guild, gutter standings; scatter presences. |
| **The Voice** | Intelligence(s) from old Accord fabrication. Ambiguous, not simply evil. It kept the lane keys because it was told to. | Voice systems, `story_voice`. |
| **The Thren** | A swarming threat that follows moving Cyrite. Partly unknowable. | Thren systems, swarms. |
| **The Archive / the file** | SEVERANCE, sealed in the Wayward by Ada Aster. Eight fragments make the full account. | `frag_*` flags. |
| **The Wall** | The evidence view: fragments and clues, what each proves, what it does not, the next lead. | `content/wall.ts`, `sim/wall.ts`, chart panel. |

**Mineral rule (resolved).** The brief's draft phrase "Cyrite, Krail's cheaper
cousin" is **not** canon. Krail and Cyrite stay distinct, as `docs/ECONOMY.md`
and `sim/purse.ts` have them:

- The official story: a Krail shortage.
- The archive: Krail reserves were never exhausted (**94%** at the shutdown
  date). The shortage was staged as a pretext for permanent rule and asset
  consolidation.
- Separately: industrial Cyrite extraction and transport woke or drew the
  Thren. The danger was real, and the lanes were closed partly to contain it.
- The Continuance used that danger to run a political purge, abandon
  disfavoured worlds, seize assets and hide who chose.

No line of text, UI or ending may call Krail the player's money or Cyrite a
cheaper Krail.

## 3. The society (what play must show)

Three material positions, shown through prices, contracts, port access, scans
and dialogue, never a class simulator.

- **Core citizens.** Clean stations, reliable lanes, high Scores. Many believe.
  Seen in the Reach's controlled ports and the Net's billboards.
- **Licensed workers.** Miners, haulers, mechanics, yard crews. Legally free,
  economically bound: leased gear, rationed fuel, deductions, score-linked
  access. Juno starts here. Seen in the Cerro work order and the Breaker Yards.
- **The unregistered.** Refugees, failed workers, stateless families,
  dissidents. "Allocation risks." Not inherently virtuous or criminal. Seen in
  the Drift, the Gutter and the Quiet Ferry.

Voice of the regime: administrative and plausible. "Maintaining continuity."
"Allocation is based on verified contribution." "The system is operating as
designed." Core spaces are polished; Scatter copies are worn, overpainted or
annotated.

## 4. Chronology

| When | What happened | Public account | Truth |
|---|---|---|---|
| About 100 years ago | The Accord links the worlds by jump lanes. Krail and Cyrite seams are worked. | Golden age. | Cyrite extraction goes industrial. |
| About 75 years ago | Deep Cyrite seams opened at scale. | A productivity record. | Something answers: the Thren. |
| 70 years ago, day 1 | The Severance: the outer lanes go dark. | A Krail shortage; the lanes failed from neglect. | The lanes were shut by signed order. Krail reserves stood at 94%. |
| Same night | Lane Warden Ada Aster, on the Narrows relay's sister watch, is "lost in service". | Lost in service. | She hid the archive and a dead-man routine for her bloodline. |
| Years 1 to 10 | The breakers (lane closers) are built in the Breaker Yards. The Forty are in the room; many keep silent for Krail rights, contracts or safety. | None. | Cover-up. |
| Years 10 to 70 | The Emergency becomes the Continuance. Companies own the mines, leases, housing and food. The Net spreads. | Stability. | Purge, asset seizure, permanent power. |
| 27 years ago | Juno Aster is born in Cerro. | | |
| Day 0 | Juno steals the Wayward from the Cerro scrapyard. The helm reads her hand. The archive wakes. | | The Story begins. |

## 5. Juno and Ada

- **Juno Aster**, 27, ore-hauler pilot from Cerro, has never left the system.
  Civic Score 412, COMPLIANT / LOW MERIT. Skilled, not an ideologue, tempted by
  profit and safety. Her arc is not "become a flawless revolutionary". It is:
  decide what freedom costs, whom she owes and what to do with the truth.
- **Ada Aster**, her grandmother, a Lane Warden on the night of the Severance,
  declared "lost in service". She built (or preserved) a dead-man routine that
  wakes when a Warden-bloodline pilot takes the helm of the hauler. Whether she
  meant to expose the Continuance, protect someone, keep the lane keys, or all
  three is revealed in steps. **Cerro** gives the wake and the reserves figure;
  **the Salvage Belt** gives Ada's own voice; **the Hollows** gives her reason
  (the keys and the Thren). The answers sharpen, never arrive all at once.

## 6. The three-act mystery

| Act | Question | Player believes | Truth that replaces it | Where |
|---|---|---|---|---|
| I The Breakout | What did Juno steal, and why is she a threat? | The Severance was a purge disguised as a shortage. | Partly right: the shortage was fake (Krail 94%). Nothing yet on who or why, or the Thren. | Cerro, the Reach |
| II The Run | Who benefited and who collaborated? | Core against frontier. | Some Scatter leaders were in the room and took rights, contracts or silence. Descendants are not guilty by blood. | Marches to Free Ports |
| III The Choice | What was the system protecting, and what did it do in the name of protection? | The Continuance was right all along, or wholly wrong. | A real threat existed. The state exploited, worsened and hid it, and chose who was left outside. | Hollows to the Threshold |

## 7. Regions, gates and acts: the mapping

The journey is **Cerro plus eight chart regions** (`REGIONS_LONG` in
`src/content/regions.ts`). Cerro is the home system, the Breakout, not a chart
region. The brief's ninth heading, the Threshold / Last Lanes, is the **gate of
the eighth region**: no extra region exists or is added.

| Narrative area | Code | Region index (`long`) | Gate | Act | Question |
|---|---|---|---|---|---|
| Cerro / Breakout | `HOME` sortie, then the first jump | before 0 | the Cerro lane mouth | I | What does the system own about Juno? |
| The Reach | The Reach | 0 | The Narrows | II | Who remembers Ada and keeps the records? |
| The Marches | The Marches | 1 | The Rift | II | Can communities cooperate under scarcity? |
| The Salvage Belt | The Salvage Belt | 2 | The Scrapgate | II | Who profits from wreckage and betrayal? |
| The Drift Deep | The Drift Deep | 3 | The Slow Door | II | What were the lanes designed to contain? |
| The Breaker Yards | The Breaker Yards | 4 | The Breaker | II | Who built the machinery of the Severance? |
| The Free Ports | The Free Ports | 5 | The Tollgate | II | Who was in the room and what did they accept? |
| The Hollows | The Hollows | 6 | The Seam | III | What are the keys and what is the Voice obeying? |
| Last Lanes / Threshold | The Last Lanes | 7 | The Threshold | III | What will Juno do with the truth? |

Acts in code: `act()` in `sim/story.ts`. Act I until the first jump; Act II from
the Reach; Act III from the Hollows (`CHOICE_REGION`, tier 2) and through the
Threshold. Chapter saves are written at each gate crossed.

Tiers: the three-region chart (`?short`) maps Reach, Marches, Hollows; beats
there read `Beat.region`. Every new beat in this plan sets both `long` and, only
where the old chart can play it, `region`.

## 8. The eight fragments

The spine of the file, in `src/content/story.ts`. The endings read the first
four (`fragments: 4`); the rest enrich epilogues. No fragment is needed to
understand the central conflict. Every one is recoverable (see §11).

| # | Flag | Name | Proves | Does **not** prove | Where | Recovery | Next lead / unlocks |
|---|---|---|---|---|---|---|---|
| 1 | `frag_order` | The order | The lanes were shut by signed order, not by failure. | Who signed it or why. | Reach, Ilse Marrow (`story_warden`) | Re-offered each sortie in the Reach and later; the Narrows hail repeats it. | The ledger; Calloway's hail at the Narrows. |
| 2 | `frag_ledger` | The ledger | Krail never ran short: books show it moved to core stores and private accounts. | Who ordered the closing; the Thren. | Reach, Ansel Brook (`story_ledger`) | Missed: the Marches' manifests mention the same date. | Initials on the authorisation (`clue_sig_reach`). |
| 3 | `frag_manifests` | The manifests | Ships "lost" in the blackout were redirected or scuttled on purpose. | Who gave the orders. | Marches, Mother Saffi and Wren (`story_drift`) | Offered again at the Rift and in the Salvage Belt. | Wren's parents' ship; the Salvage Belt. |
| 4 | `frag_keys` | The keys | Who built the lane breakers and who still guards them. | Why they were built. | Hollows, the Voice (`story_voice`) | The Voice calls again at the Seam. | The Thren and Cyrite (`clue_cyrite`). |
| 5 | `frag_blackbox` | The black box | Ada's Warden vessel recorded the night; the Aster routine was deliberate. | Ada's full motive. | Salvage Belt, Dov Kessin (`story_salvor`) | A second wreck beat in the Belt; the Drift Deep charts cite it. | Ada's voice (`story_ada`). |
| 6 | `frag_charts` | The charts | The closures form a ring, a containment pattern, not a supply line. | What is inside the ring. | Drift Deep, Tarn Ilvo (`story_charts`) | The Quiet Ferry carries a copy. | The Breaker Yards. |
| 7 | `frag_workorder` | The work order | The Continuance ordered the breakers, with a date and a seal. | The signer's name in full. | Breaker Yards, Pell Anand (`story_workorder`) | Marit Voss's crews hold the yard copy. | `clue_sig_yards`; Thren-scarred hulls (`clue_scarred`). |
| 8 | `frag_witnesses` | The witnesses | Forty people were in the room and kept quiet, Scatter leaders among them. | That each took a bargain; that descendants are guilty. | Free Ports, Old Mirren (`story_witnesses`) | Ines Duarte's brokers hold a copy. | `clue_sig_ports`; Oduya's and Saffi's names. |

## 9. Supporting clues and leads

Fewer than ten, each a flag the Wall reads. A clue changes what the player
believes or can do.

| Flag | Clue | Certainty | Where | Effect |
|---|---|---|---|---|
| `archive_woke` | The archive woke on Juno's hand | fact | Cerro wake card | Sets the Score drop; Wall entry. |
| `clue_archive_log` | The Warden Line log: routine ADA-1, bloodline lock | fact | Cerro wake card, "open the log" (optional) | Deep layer; Ada's name early. |
| `clue_reserves` | Krail reserves 94% on the shutdown date | fact | Cerro, first jump (always) | The Act I reveal. |
| `clue_sig_reach` | "L. C." on the authorisation line | inference | Reach, the ledger | One of three for the signature. |
| `clue_sig_yards` | The Prefect's cipher on the work order | inference | Breaker Yards | Two of three. |
| `clue_sig_ports` | Lior Calloway's full signature in the minutes | fact (with the others) | Free Ports | Three of three: leverage, once (`sig_used`). |
| `clue_scarred` | Thren-scarred hulls under restriction | fact | Breaker Yards | Points at the Thren early. |
| `clue_agent` | An Office agent aboard the Quiet Ferry | fact | Drift Deep | Expose, protect or use. |
| `clue_cyrite` | Cyrite draws the Thren | fact | Hollows | Act III reveal. |

A **lead** is one line on the Wall: where to look next, and what it would
change. The Wall always shows one, derived from the first missing fragment of the
region the player is in or, at a gate, the next.

## 10. People and arcs

Persistent state is **flags** (no new persisted fields beyond `civic`).
Naming convention: `<who>_met`, `<who>_<outcome>`.

### Prefect Idris Calloway (Offices of Peace)
Believes the Continuance is necessary because she has seen what happens when
central control fails. Her secret: her father, Prefect **Lior Calloway**, signed
the Severance order. Three set pieces:
1. **The Narrows** (`story_calloway_narrows`, planned): a personal hail. She
   has read Ada's file too. Flag `calloway_ada`.
2. **The Tollgate** (`story_tollgate`, planned): she traps the Wayward in a
   damping field. Shoot, bargain, show the father's signature (all three
   `clue_sig_*`, once, sets `sig_used`), or run. Sets `calloway_turned` or
   `calloway_hostile` and changes Trade, Broadcast and the final.
3. **The Threshold**: the existing last meeting (`calloway_last`, built from her
   file in `sim/calloway.ts`) reads those flags.
Existing flags kept: `calloway_told`, `calloway_lied`, `calloway_curious`,
`owes_calloway`, `calloway_beaten`.

### Director Draper
One man, two badges. In Cerro and the Reach he is **Foreman Draper** of Kellern
Mining (`bounty` cards `foreman` and `foreman_again`, flag `stalled`), the corporate face asking for
the asset back. From the Breaker Yards he is **Director Draper** of the Offices'
asset recovery desk, which is what the Foreman always worked for. This resolves
the brief's "Director Draper" against the code's "Foreman Draper": the title
changes because the state and the company are one chain. He wants the file
destroyed and Juno dead once it is too dangerous; his fleet arrives at the
Threshold. (Open canon question Q1.)

### Tam Okoro, yard foreman (Cerro)
Radio ally, never crew. Cerro: codes, fuel, or wave him off (`story_yard`).
Flags: `tam_codes`, `tam_fuel`, `tam_alone`; `tam_ally` once the codes pass the
checkpoint. Later: his brother on a Breaker crew (`story_tam_brother`, planned).
If Juno left him alone, the brother beat still arrives, from Marit Voss, and he
remembers.

### Clients (setup, twist, reckoning)
| Client | Region | Setup | Twist | Reckoning | Flags |
|---|---|---|---|---|---|
| Ansel Brook, Kellern clerk | Reach | `story_ledger` | `story_brook_arrest`: Custody transport | rescue, divert or leave | `brook_met`, `brook_free`, `brook_taken` |
| Speaker Oduya, Kessel Hold | Marches | `story_oduya_rigs`: defend the rigs | `story_moot`: carry the vote | predecessor among the Forty at Free Ports | `oduya_rigs`, `pact_holdfast`, `oduya_name` |
| Wren Saffi, Drift navigator | Marches | `story_drift` | manifests: her parents' ship | the Forty include her family | `pact_drift`, `wren_trust`, `wren_family` |
| Vell, Gutter broker | Belt to Free Ports | `story_broker` | `story_vell_betray`: sells your heading | `story_vell_reckoning` | `broker`, `vell_betrayed`, `vell_paid`, `vell_exposed` |
| Kesh, Gutter fixer | Belt | `story_kesh` | switches sides or not | settle the debt | `kesh_trust`, `kesh_warned` |
| Dov Kessin, salvor | Belt | `story_salvor` | the recorder | `story_ada`: Ada's voice | `frag_blackbox`, `ada_heard`, `ada_kept` |
| Ossi Rane, Quiet Ferry | Drift Deep | `story_ferry` | `story_ferry_agent` | expose, protect or use | `ferry_met`, `agent_exposed`, `agent_shielded`, `agent_used` |
| Marit Voss, strike steward | Breaker Yards | `story_crew` | the picket | break the yard or broker a deal | `strike_stood`, `strike_broker` |
| Ines Duarte, Dust Traders | Free Ports | `story_harbour` | tries to buy the file | `story_ines_offer` | `ines_berth`, `ines_refused` |
| Keeper Oren | Last Lanes | `story_toll` | three questions | the Wall answers | `oren_asked` |

Every first beat has a fallback if declined: the twist is delivered as a
rumour card on the chart or the next region's recap, with a different choice,
so a declined client never blocks the story.

### Echo or Sable (the Hollows)
**Echo**, a shard of the Voice, can decrypt and jam; it wants release from its
directive. **Sable**, a Thren-touched survivor, can make a swarm ignore the
Wayward; she wants to go home. One distinct benefit each plus an ending callback.
Flags `echo_trust` or `sable_trust` (never both).

## 11. Information and recovery rules

- **Skim:** the objective, the HUD note, a chip, a one-line recap.
- **Engage:** the comms card, the radio call, the choice.
- **Deep:** the Wall detail, the archive log, the Archive.
- A clue is never behind a skill check or a scan. Every fragment has a
  repeat chance (the beat scheduler offers a missed one in later systems of
  its region and the next; `dueBeat`).
- Optional beats fall back to rumours or recap lines. A declined client's
  twist still arrives.
- The Score never gates the main route: every checkpoint has a forward answer
  (scan, pay, run, fight) whatever the Score.

## 12. The Civic Score (live)

`carry.civic`, 0 to 500, starts at **412**. Persisted. Arcade never reads it.

| Band | Range | Label |
|---|---|---|
| Registered | 450 to 500 | COMPLIANT / HIGH MERIT |
| Registered | 400 to 449 | COMPLIANT / LOW MERIT |
| Review | 300 to 399 | UNDER REVIEW |
| Restricted | 200 to 299 | RESTRICTED |
| Flagged | 100 to 199 | FLAGGED |
| Unperson watch | 1 to 99 | NEAR-UNPERSON |
| Unperson | 0 | UNPERSON |

Prototype changes (tuned later): archive wake −38; unscheduled fuel draw −10;
running a checkpoint −25; attacking Custody −40; fee paid on time +5. Practical
effects use existing systems: the "Show your registry" doorway at a checkpoint
needs 400; fees rise below 300; some cards read the band. Low is not "good" and
high is not "bad": a low Score opens the Gutter and closes Core services.
Old saves: see §14.

## 13. The six endings

Labels and meanings unchanged. Conditions stay in `content/endings.ts` and are
extended, not replaced. Vanish is always open.

| Ending | Promise | Prerequisite direction | Cost that stays real |
|---|---|---|---|
| Broadcast | Release the truth to the Core. | Signals 2 or the array, four-piece file, Echo or Calloway turned. | Open lanes let the Thren follow. |
| Unite | Organise the Scatter into a force. | Two pacts or two friends, Wren trusted. | Partners include heirs of the compromised. |
| Sell | Sell the file for freedom or wealth. | Guild or Gutter friend, Vell or a buyer, Kesh trusted. | Someone weaponises it. |
| Trade | Bargain for amnesty and a way home. | Calloway told or turned, Offices calm, implant kept. | The ones left outside stay outside. |
| Seal | Keep the lanes closed. | Guns or Rig 3, keys, Echo trusted. | The lie survives; the Scatter stays cut off. |
| Vanish | Take the Wayward beyond the routes. | Always. | Few learn what happened. |

**Implant choice (planned):** keep (route home, legible to the regime; makes
Trade cleaner), burn (freedom, scars; enriches Vanish and Unite), let the Voice
rewrite it (something new; a Broadcast or Seal variant). Chosen before the file
decision, recorded as a flag `implant_keep|burn|rewrite`, shown as short
trade-off lines, changes epilogues only.

**Epilogues:** a stable base per ending plus conditional lines (`if`) for
Calloway, Tam, Wren, Kesh, Echo or Sable, and surviving clients.

## 14. Save and migration

`VERSION` in `sim/journey.ts`. **v17** was current at the start of this work.
**v18** adds `carry.civic` (and nothing else).

- New journeys start at 412.
- v17 and earlier saves: still in Cerro (`trail.length < 2`) gets 412. Past
  Cerro gets `412 − 38 = 374` and the flags `archive_woke` and
  `clue_reserves` (the Cerro beats they would have had), so their Wall and
  band read as if they had played the new opening. The migration is
  idempotent. Chapter saves go through the same `migrate`.
- Arcade never carries a Score; the world only applies it when `bk` is set.

## 15. Open canon questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | The brief's **Director Draper** (Offices) and the code's **Foreman Draper** (Kellern) are one man or two? | One man, two badges (§10). Cheapest, and it shows state and company are one chain. |
| Q2 | The code's chartwright is **Hale Tarn**, the brief's is **Tarn Ilvo**, and there are two other Hales (Noor Hale, Hale Sorensen). | Rename to **Tarn Ilvo**. Removes the collision. Old Archive entries keep the old name as written. |
| Q3 | The brief's Ilse Marrow is "retired Lane Warden"; the code says she ran the Narrows relay 70 years ago. | She is old and alive; the Scatter's long lives are not explained (no cryo, no rejuvenation). Recommend: she was a junior relay operator, so she is about 90 today. |
| Q4 | Who is **Old Mirren**, **Pell Anand**, **Kade**, **Sorensen**, **Vance**, **Ashgrove**? | All exist in code (STORY_PEOPLE, captains) and stay as they are. |

## 16. The content matrix

Trigger = how it arrives. State = the durable effect. Fallback = what covers a
miss. L10n = English and German twins.

### Cerro (Act I)
| Beat | Trigger | Player action | New information | State | Fallback | Status | L10n |
|---|---|---|---|---|---|---|---|
| Contribution (opening card) | New Story journey | read | The work order: 48 gross, 4 to Juno; Score 412 | none | skippable | live | en, de |
| `story_wake` | 40 s into the Breakout | Open the log or not | The archive woke; Score 412 to 374; status UNDER REVIEW | `archive_woke`, civic −38, optional `clue_archive_log` | due again on reload | live | en, de |
| Tutor | automatic | mine, fit torpedoes, torpedo one hostile | the controls | tutor state | Skip | live (unchanged) | en, de |
| `story_yard` | follow of the wake | codes, fuel, wave | Tam's offer | `codes`/`tam_codes`, `tam_fuel`, `tam_alone` | due on reload | live | en, de |
| Checkpoint | lane mouth | show registry (needs 400), scan, pay, spoof, run, fight | the Score as a door | civic ±, `tam_ally` or burned | any answer passes or fights | live | en, de |
| Reveal | the first jump | none (automatic) | Krail reserves 94% vs the shortage; next lead the Reach | `clue_reserves` | always runs | live | en, de |

### Regions 0 to 7
Each row will be marked live when its increment ships. Order: Reach and
Marches, then Belt and Drift Deep, then Yards and Free Ports, then Hollows and
Threshold.

| Region | Beats | Status |
|---|---|---|
| Reach | `story_warden`, `story_ledger`, `story_brook_arrest`, `story_calloway_narrows` | live; the Narrows is a gate beat (`Beat.gate`, dealt on arriving at the gate out of the Reach) |
| Marches | `story_oduya_rigs`, `story_moot`, `story_drift` (Wren) | live |
| Salvage Belt | `story_broker`, `story_kesh`, `story_vell_betray`, `story_salvor`, `story_ada` | live |
| Drift Deep | `story_charts` (Tarn Ilvo), `story_ferry`, `story_ferry_agent` | live |
| Breaker Yards | `story_workorder`, `story_crew`, `story_tam_brother`, Calloway in person | live; `story_draper` is the Director reveal (needs `stalled`) |
| Free Ports | `story_harbour`, `story_ines_offer`, `story_witnesses`, `story_vell_reckoning`, `story_tollgate` | live; the signature chain sets `clue_sig_*` and `sig_used` |
| Hollows | `story_voice`, `story_thren`, `story_echo_sable` | live |
| Last Lanes | `story_aide`, `story_toll` (Oren's three questions), Draper's fleet, implant, endings | implant, Oren's three questions (`story_oren_who`, `_cost`, `_why`) and ending epilogues live; Draper's fleet joins the Patience at the lane mouth (`finaleCard` reads `draper_director`, `calloway_turned`, `calloway_hostile`) |

## 17. Baseline (before any change)

Recorded 2026-10-18, branch `story-rewrite` from `main` at `1e318c4`:

- `npm run check` (tsc and vitest): green, 55 test files, 768 tests.
- `npm run build`: green (the usual chunk-size warning only).
- `JOURNEY_SET=eight npm run pilot:journey`: see
  [BALANCE-STORY-REWRITE.md](BALANCE-STORY-REWRITE.md).
- Working tree clean at the start; no user changes touched.
