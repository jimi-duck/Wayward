# WAYWARD — Master Brief for Claude Code

**Purpose:** Rewrite and deepen the complete Story Mode narrative, then implement it in the existing game in a technically safe, testable, and incremental way.

**How to use this file:** Open Claude Code at the root of `jimi-duck/Wayward`. Paste the **Execution Prompt** in Section 1, or ask Claude Code to read this entire file and treat it as the active project brief. Keep this file available in the repository during the work, preferably as `docs/CLAUDE_STORY_REWRITE_BRIEF.md`.

**Authority:** This brief is the narrative direction. Claude Code is the senior development partner and narrative-systems implementer. Claude must write and implement the content described here, but must not independently redefine the central story, themes, canon, character motivations, or endings because an alternative seems easier to code. When implementation reality requires a narrative adjustment, explain the constraint and propose the smallest compatible change; do not silently change the story.

---

# 1. Execution Prompt — read and follow this first

You are working in the existing WAYWARD repository. Your task is to deliver a complete, coherent Story Mode narrative rewrite and integrate it with the game's real systems. This is not a request for a concept proposal only. Inspect the repository, establish the current working baseline, author the story bible, rewrite story content, implement the highest-value gameplay integration, test it, and document what remains.

## Your role

Act as a **senior gameplay engineer, narrative systems designer, technical writer, and implementation partner**. The project owner is the narrative director and retains final authority over the story. This brief defines the intended canon and dramatic direction. You are responsible for making it work in code: find the actual systems, choose the smallest robust implementation, write data and tests, preserve the game, and report trade-offs clearly.

You may improve scene-level prose, dialogue, mission framing, pacing, clue wording, data shape, accessibility, and technical architecture within this brief. You must not unilaterally change:

- Juno's identity, central wound, or connection to Ada Aster.
- The core truth and layered structure of the Severance mystery.
- The role of the Continuance as an authoritarian regime that fuses state power with corporate extraction.
- The Thren as a real existential danger that complicates but does not absolve the regime.
- The fact that Juno flies the Wayward alone; allies remain in their own places and communicate over radio.
- The six existing ending concepts: Broadcast, Unite, Sell, Trade, Seal, and Vanish.
- The setting's resource rules unless the project owner explicitly approves a canon change.

Do not replace the game's established concepts with new lore because a different idea sounds interesting. New names, factions, mechanics, or story branches must justify their cost and fit the existing project.

## What success means

The player must feel the regime through ordinary play before being asked to understand the conspiracy. The main loop remains satisfying as a space survival/shooter: fly, fight when needed, mine, manage resources, upgrade, negotiate, pick routes, and stay ahead of the hunt. Story deepens those actions rather than replacing them with a large dialogue RPG.

By the end of the redesign:

1. The dystopian setting is unmistakable in the opening minutes without a lore lecture.
2. Work, debt, rationing, surveillance, travel permissions, corporate ownership, and social class shape ordinary encounters.
3. The player understands each story beat's immediate stakes, what they learned, why it matters, and what they can do next.
4. The mystery unfolds from personal survival to political conspiracy to the existential truth behind the Severance.
5. Choices change state and are reflected later; the world remembers the player.
6. The story remains playable for people who skim dialogue and rewarding for people who investigate deeply.
7. Existing combat, flight, mining, resource economy, save/load, Arcade Mode, mobile controls, gamepad controls, and story pacing continue to work.
8. English and German text stay complete and consistent.
9. The implementation remains data-driven and testable. Do not build a second quest engine for features the existing story/comms/flag systems can express.
10. The final result is coherent enough to support a separate film treatment without writing the game like a screenplay.

## Required workflow

### Step 0 — protect the repository and establish the baseline

Before editing:

- Inspect `git status`, current branch, and uncommitted changes. Never reset, clean, revert, or overwrite user work.
- Read `CLAUDE.md`, `docs/VISION.md`, `docs/PLAN.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ECONOMY.md`, `docs/MISSIONS.md`, `docs/NAVIGATION.md`, `docs/HUD.md`, and the relevant story, ending, region, card, comms, journey, desk, world, save/migration, i18n, pilot, and test files.
- Inspect `package.json` and use the actual scripts present in this checkout. At minimum, attempt the repository's documented `npm run check` and `npm run build`; run the relevant tests and scripted pilots if available.
- Record baseline results and any existing failures before changing code. Never report a pre-existing failure as caused by your work.
- Treat the live code and current `docs/` files as evidence of what is implemented. When docs disagree with code, inspect callers and tests before deciding.

Do not spend the entire session on analysis. Complete a concise audit, write a short implementation plan into the project docs if needed, and then start delivering concrete artefacts and code.

### Step 1 — establish the story bible before changing all the dialogue

Create or update a durable canon document, preferably `docs/STORY_BIBLE.md`, containing:

- logline, themes, dramatic promise, and narrative rules;
- canon glossary and resource rules;
- full chronology of the Accord, rise of the Continuance, Severance, and present day;
- Juno and Ada's backstory;
- character motivations and relationship arcs;
- the three-act mystery with confirmed facts, misleading beliefs, clues, and revelations;
- the region/act/gate mapping that matches `src/content/regions.ts` and the actual journey code;
- the eight file fragments already represented in `src/content/story.ts`, with their narrative purpose, proof, limitations, and next lead;
- the recurring client and radio-ally arcs;
- the six endings, exact prerequisites, consequences, and epilogue logic;
- a content matrix showing every major beat's trigger, player action, new information, consequence, fallback, and localisation status;
- a small list of open canon questions that truly require the project owner.

Treat this as a living source of truth. Do not just make a plan for this document: author it.

### Step 2 — rewrite the narrative content in place

Map the existing story IDs, cards, flags, region gates, endings, and conditional text before changing identifiers. Prefer revising content rows and adding a small number of clearly named rows over creating an entirely new story framework. Keep existing identifiers where practical, because flags, save states, tests, and code may depend on them.

Rewrite the complete player-facing Story Mode flow: opening card and tutorial framing; region hooks; recurring comms; the eight evidence/file fragments; Calloway encounters; client arcs; ally reactions; the Voice/Echo/Sable choice; the Threshold finale; all six endings; and end-of-region recaps. If some of the planned content requires new systems not yet implemented, write the canonical content spec and implement in phases rather than leaving it as aspirational prose.

Dialogue must be short enough to read during play. Core story choices should use clear verbs and visible cost/consequence chips. Extra context belongs in optional detail, evidence cards, logs, or the codex. Do not put critical information only in a long optional entry.

### Step 3 — integrate narrative with gameplay, minimally and deliberately

First use what is already built: comms cards, story scheduler, flags, region and gate logic, faction standing, the Continuance Net, Calloway's hunt, jobs, resources, chapter saves, ending requirements, and epilogues.

Add a new mechanic only when it adds a meaningful action or consequence that cannot reasonably be communicated through existing systems. Each new mechanic must have:

- a concrete player-facing purpose;
- an interaction through the existing `World.phase`/decision-response pattern where appropriate;
- a clear effect on game state;
- a visible explanation and feedback;
- an English and German text twin;
- save/load handling when state persists;
- a test or scripted pilot that proves it works;
- a fallback so it cannot block the story.

The simulation must remain plain-data and headless-testable; `src/sim` must not import Three.js. Do not interrupt combat with long story dialogue. Respect desktop, touch, and gamepad input.

### Step 4 — deliver a first vertical slice before expanding every region

The first playable proof is the Cerro/Breakout sequence. It should demonstrate the complete design pattern:

**experience oppression → make a survival choice → see a consequence → obtain a clue → understand the next lead.**

The opening should contain the Civic Score as lived experience, labour extraction, the archive waking, the first restriction, a practical choice involving Tam, the first undeniable evidence contradiction, and a clear objective toward the next region. Preserve the existing flying tutorial: mining, fitting torpedoes at a work bay, and shooting a hostile ship should still teach controls and survival. The story framing changes; the core skill lessons do not disappear.

Once the vertical slice is coherent and tests pass, extend the same pattern through the whole story. Do not spend weeks on an elaborate clue-board interface before one complete opening sequence works.

### Step 5 — verify the whole journey and report precisely

At completion, report:

- files changed and why;
- narrative work completed versus deferred;
- mechanics added and state changes;
- save-version changes and migration coverage, if any;
- `check`, build, test, i18n, and pilot results;
- reader and skimmer journey results;
- any existing failures separately from regressions;
- unresolved canon questions;
- next tasks in priority order.

Do not say that testing passed unless you actually ran it. Do not claim the full rewrite is finished if only the opening slice is complete. Update `docs/PLAN.md` and the relevant design docs when a milestone changes.

---

# 2. Source-of-truth and conflict rules

Read the existing project material before implementation. Use this priority order when content or constraints conflict:

1. **Explicit project-owner direction in this brief and later direct corrections.**
2. **The canon in Section 3 below.**
3. **The story redesign proposal supplied with this task**, particularly its no-crew direction, story structure, named clients and allies, clue/lead idea, and ending costs.
4. **Current repository code and tests** as the source of what mechanics, save formats, triggers, and controls are actually present.
5. **Current `docs/` files** as supporting design explanations. Verify them against code if they disagree.
6. Your inference. Label important inferences and do not promote them to canon without reason.

The supplied v2 proposal is a narrative proposal, not proof that every planned feature already exists. For example, scanning pulses, per-system story POIs, an interactive Wall, Civic Score thresholds, radio ally channels, ally trust, and multi-job client arcs may require new implementation. Confirm the actual state and build incrementally.

Two known discrepancies must be resolved explicitly in `docs/STORY_BIBLE.md` before content depends on them:

### Mineral roles

The current game vision/economy material distinguishes **Krail** (the mineral central to fabrication/infrastructure and the official shortage narrative) from **Cyrite** (the resource mined by the player and refined into jump fluid; also the game's spendable currency after refineries and economy rules). The v2 proposal's phrase “Cyrite, Krail's cheaper cousin” conflicts with that established role separation. **Do not simply copy that phrase into new lore.** Retain the current game's mechanical distinction unless code audit proves the repository has since deliberately changed it. A coherent recommended truth is:

- The official Continuance narrative claimed a Krail emergency.
- The archive demonstrates that Krail reserves were not exhausted; the shortage was staged, misrepresented, or deliberately amplified as a pretext for permanent rule and asset consolidation.
- Separately, industrial-scale Cyrite extraction and transport awakened or attracted the Thren.
- That Thren danger is real. Closing the lanes did contain a genuine threat, but the Continuance used that danger to legitimise a political purge, abandon disfavoured populations, seize assets, and hide who made those choices.

This makes the regime guilty without making the existential threat fake. Keep this consistent across dialogue, UI text, mission outcomes, and endings.

### Region count

The current game describes a journey of **eight regions**. The v2 story proposal names Cerro, the Reach, the Marches, the Salvage Belt, the Drift Deep, the Breaker Yards, the Free Ports, the Hollows, and the Last Lanes/Threshold, which appears to create nine narrative areas if all are counted as separate regions. Inspect `src/content/regions.ts`, `sim/journey.ts`, gate handling, and current region tests. Do not silently expand or rename the chart. Resolve this by mapping the narrative beats into the actual eight implemented regions; the Threshold may be the final gate/sequence rather than a separate chart region. Document the final mapping in the story bible and use it everywhere.

Other likely documentation drift includes save-version numbers, job-goal counts, lane layout, difficulty names, and current card names. Confirm the checked-out code; do not hard-code assumptions from old notes.

---

# 3. Canon bible — facts the rewrite must preserve

## 3.1 The central premise

WAYWARD is a cyberpunk/dystopian space-survival story about staying ahead of a system that wants Juno back. Juno is not a chosen saviour who can topple an empire with one speech. She is one pilot in a battered industrial ore hauler, carrying evidence sought by people who have state power, corporate resources, surveillance, and armed ships.

The journey remains physically grounded in the survival loop: mine Cyrite, collect wrecks, refine enough into jump fluid, manage supplies and hull, repair and upgrade at a work bay, choose lanes, handle comms, take optional jobs, and stay ahead of the Continuance Net and Prefect Calloway. Political themes must be expressed through those actions.

The game's guiding question is:

> **How far will you go to keep moving, and what parts of yourself will you sell to do it?**

A second question grows underneath it:

> **Who benefits when survival is made conditional on obedience?**

## 3.2 The society

The old Accord was a union of worlds linked by jump lanes. The Continuance began as an emergency authority meant to protect civilisation and manage resource scarcity. It became permanent, authoritarian, self-protecting, and intertwined with corporate ownership.

The Continuance uses a polished vocabulary of stability, productivity, contribution, continuity, public safety, and responsible allocation. In practice it classifies people, restricts movement, surveils behaviour, decides who can work and travel, and allows corporations to own the infrastructure required for survival. The regime should be frightening because it has normalised coercion and makes brutality sound administrative—not because every official shouts slogans or behaves like a caricature.

Its power has three interlocking layers:

1. **State coercion:** the Custody fleet and security apparatus enforce checkpoints, restrictions, and arrests.
2. **Intelligence and surveillance:** the Offices of Peace monitor dissent and communications, assemble records, and make people disappear through procedure as much as violence.
3. **Corporate extraction:** companies own the mines, equipment, leases, transports, housing, food, medical services, and labour contracts. They profit from a system that makes workers dependent.

The regime's public argument is that order prevents the collapse of civilisation. Some citizens sincerely believe this because they have received safety, food, medical care, and predictable services. That does not excuse the regime; it makes the society plausible.

## 3.3 Class structure as play, not just lore

Show three recurring material positions. These are descriptive social strata, not necessarily a new formal faction system.

### Core citizens

They live inside safer, wealthier systems. They have reliable lanes, clean stations, better food and medical access, automated services, private security, high Civic Scores, and the assumption that rules work. Many believe the Continuance is legitimate because their lives feel stable. Their privilege is visible in the built environment and what they never have to worry about.

### Licensed workers

Miners, haulers, mechanics, refinery workers, and contract pilots. They may be legally free but are economically bound: equipment is leased, fuel is rationed, medical costs are deducted from wages, debts persist, and employment, housing, and route access depend on performance and score. Juno begins here. The Wayward is more than a stolen ship; it is a stolen means of survival and economic agency.

### The unregistered

People outside official systems: refugees, failed workers, stateless families, black-market mechanics, the abandoned, and dissidents. The regime treats them as an administrative/economic problem—“unproductive persons”, “unregistered”, or “allocation risks”—rather than acknowledging their humanity. They are not inherently virtuous or criminal. Some help Juno; others exploit anyone weaker.

Do not create a separate economic simulator to represent class. Show it in contracts, port access, prices, service quality, surveillance, dialogue, signage, and consequences using existing system, card, flag, standing, and resource features wherever possible.

## 3.4 Juno Aster

- Juno Aster is 27 at the beginning of the story.
- She is an ore-hauler pilot from Cerro and has never left the system before the breakout.
- The story design proposes an initial Civic Score of 412, with the registry label **COMPLIANT / LOW MERIT**. Treat values as design targets to tune during playtesting, not inviolable balance values.
- She flies alone. Nobody joins the Wayward as crew. Recurring relationships live in other ships, settlements, and systems and return through comms, jobs, favours, callbacks, and epilogues.
- She is competent at the work she has been trained to do, but has limited experience outside the system and must learn the social geography of the Scatter.
- She starts wanting to survive, keep her ship moving, and understand why the archive woke. She is not an ideologue at first. She should be capable of taking profitable, selfish, or compliant choices when survival makes them tempting.
- Her arc is not “become a flawless revolutionary”. It is “decide what freedom costs, whom she owes, and what she is willing to do with truth”.

The player should be able to understand Juno through action and brief reactions. Avoid long internal monologues that make the game feel like a novel read aloud.

## 3.5 Ada Aster and the archive

Ada Aster, Juno's grandmother, was a Lane Warden on the night of the Severance and was declared “lost in service” soon after. Ada built or helped preserve a dead-man routine that wakes when a Warden bloodline pilot takes the helm of the relevant vessel. The SEVERANCE archive waking for Juno is not coincidence, but the full reason must be revealed in stages.

The opening questions are personal:

- Why did Ada disappear from the official record?
- Why was the archive hidden in a decommissioned Continuance ore hauler?
- Why does the system recognise Juno?
- Did Ada intend to expose the Continuance, protect someone, preserve the lane keys, or all three?

Do not reveal all answers in Cerro. Ada's recorder in the Salvage Belt should be an emotional turning point, not merely another lore file.

## 3.6 The Severance and layered truth

Seventy years ago, the jump lanes connecting the outer systems to the core went dark. The affected worlds became known as the Scatter. Supply chains collapsed; people were isolated; ships and communities vanished; the core concentrated power and resources.

The mystery unfolds in three acts:

### Act I — The Breakout: the shortage was a cover

Juno first believes the file is proof the Severance was a purge disguised as a Krail shortage. She discovers evidence that Krail reserves remained substantial and the official shortage narrative was staged or manipulated. One archive fragment says “Krail reserves at 94%” (retain or adapt the exact number only if it is consistent with the code's intended story). This does not yet prove the whole conspiracy or explain the Thren.

### Act II — The Run: people inside the Scatter made compromises

The forty names include leaders, elders, and representatives from communities later described as victims. Some participated in the planning or accepted Krail rights, contracts, security, or political survival in exchange for silence. The conspiracy is not a simple core-versus-frontier story. The betrayal has local beneficiaries, desperate compromises, and people who thought they could control the outcome. Do not make the named descendants automatically guilty for their ancestors' decisions.

### Act III — The Choice: a genuine threat was weaponised

Old Accord extraction pushed into Cyrite seams at industrial scale. The Thren are attracted to or follow Cyrite movement and were awakened or drawn into the lanes. The lane closures and “keys” were linked to a real containment problem. The Voice was instructed to guard the keys and has continued to carry out that directive. Ada knew part of the truth.

The revelation must not be “the Continuance was right all along”. The government allowed, exploited, or worsened the crisis; chose who would be isolated; hid the real history; seized or transferred assets; and maintained emergency power for generations. A genuine threat explains why a hard choice existed. It does not justify the regime's profiteering, collective punishment, permanent surveillance, political purges, or suppression of alternatives.

## 3.7 Krail, Cyrite, jump fluid, and the Thren

Preserve the distinction in the established economy:

- **Krail:** essential to the old civilisation's fabrication/infrastructure economy and the alleged shortage used by the Continuance as its public justification.
- **Cyrite:** the violet resource Juno mines and the economy already uses as money/resource stock. In Story Mode, the Wayward's refinery converts incoming Cyrite into jump fluid first until the tank contains enough for the plotted jump; surplus remains Cyrite for upgrades, supplies, fees, and favours.
- **Jump fluid:** processed fuel in the drive tank; it is not interchangeable with unprocessed Cyrite.
- **The Thren:** real and dangerous; they appear where large amounts of Cyrite are moving, disrupt signals/navigation, and can threaten ships and lanes. The exact metaphysics can remain partly unknowable.

Never contradict `docs/ECONOMY.md` or the actual refinery code in narrative text. Do not turn Krail into the player's currency or change Cyrite's mechanical function merely to make an analogy work.

## 3.8 The Wayward, the Net, and survival

The Wayward is a decommissioned Continuance Obedience-class ore hauler (vessel registry `OB-7731-A` according to existing design material). The regime gives ships approved virtue names. Juno paints over the markings and names it **WAYWARD**, a label the Continuance uses for those who will not remain in their assigned place.

The Continuance Net spreads through the chart and turns systems into checkpoints, surveillance zones, controlled markets, restricted Cyrite trade, mandatory scans, expensive ports, and pressured local leadership. The Net is both a gameplay pressure mechanic and a political story: the system expands by connecting the frontier to its enforcement and extraction network.

Calloway follows Juno's route, learns from behaviour, and can be delayed or misled. Keep the existing hunt mechanics and use narrative cards, region reactions, and visible changes to show how Calloway's interpretation evolves.

## 3.9 The Scatter and factions

Use the current faction identity and vocabulary where present:

- **Holdfasts:** settled communities built around mines, refineries, old stations, and abandoned infrastructure. Some want independence; some want security; some will sell out rivals for aid.
- **Drifts:** nomadic fleets that follow resources and safe routes. They know the lanes and are hard to control.
- **The Gutter:** pirates, scavengers, and abandoned crews operating beyond most formal law. They can be predatory, generous, organised, or desperate.
- **The Voice:** intelligence or intelligences emerging from old Accord fabrication systems, speaking through terminals, factories, and machines. Ambiguous, not a simple evil AI.
- **The Thren:** a swarming threat associated with Cyrite and the old lanes. Keep some mystery; do not reduce them to ordinary space monsters.
- **Corporations, the Custody, and the Offices of Peace:** institutional forces with distinct incentives. Avoid making every Continuance-related person share the same beliefs.

Build disagreements within factions. A Holdfast industrialist may want Continuance contracts while workers want autonomy. A Drift elder may favour isolation while navigators want safe passage. A Custody officer may believe in public order while an Office hardliner wants Juno killed to protect power.

---

# 4. The tone and thematic execution

## 4.1 The regime is oppressive because it is ordinary

Use bureaucracy, advertising, forms, licences, fees, ration rules, debt notices, scanning, and service restrictions. The government rarely needs to say “obey”. It says:

- “Maintaining continuity.”
- “Your productivity protects your household.”
- “Unregistered movement increases risk.”
- “Allocation is based on verified contribution.”
- “The system is operating as designed.”

These are examples of tone, not mandatory repeated slogans. Build a consistent propaganda voice that sounds plausible to a citizen who benefits from it.

Use polished messages in Core-controlled spaces and worn, copied, overpainted, or subversively annotated versions in the Scatter. Show how the same slogan looks different to a worker whose ration was denied.

## 4.2 Fascism and capitalism must be causally linked

Do not merely add posters, black uniforms, and a dictator. The regime should classify people, fuse national security with corporate extraction, identify “productive” and “unproductive” citizens, protect private ownership when profitable, and treat human lives as expendable when they threaten the order.

The story should repeatedly show:

- people described by productivity, debt, risk, and asset value;
- companies owning ships and equipment that workers operate;
- fees that take most of a worker's earnings;
- wealthier citizens purchasing privacy and protection;
- people losing access to routes, healthcare, work, or shelter when their Score drops;
- the same authority calling coercion “stability” and extraction “contribution”;
- local elites profiting from the system and occasionally resisting its excesses;
- resistance organisations facing their own compromises and temptations to reproduce hierarchy.

Avoid one-note speeches about capitalism or fascism. Let the player discover the structure through prices, work orders, choices, outcomes, scenery, and recurring people.

## 4.3 The player must be complicit sometimes

Compliance should occasionally be tempting and useful. A player who keeps a higher Civic Score may gain lower costs, safer authorised routes, legitimate docking, better contracts, or access to Core services. A player who defies the system may gain Gutter or unregistered contacts, hidden lanes, or solidarity in the Scatter while losing access to controlled services and attracting scrutiny.

Do not make low Score a universal “good person” meter or high Score a universal villain meter. The number tracks the regime's administrative judgement, not Juno's moral worth. Players can help others while remaining registered; they can exploit people while being unregistered. Every path should involve trade-offs.

## 4.4 Avoid trauma as decoration

Poverty, deportation, political disappearance, and worksite casualties should have consequences, voices, and context. Don't place suffering only in environmental flavour and then ignore it. At least some people who appear in the opening should recur or be referred to later. Keep the story humane: the people in the system have ordinary wants, humour, skills, petty grievances, fear, and contradictory choices.

---

# 5. Dramatic structure and narrative pacing

## 5.1 The whole-game structure

The full journey is expected to remain near the current design's approximately 85 stops and around seven hours, subject to playtesting. Do not increase the number of required stops materially just to deliver more lore. Story should ride the existing chapter/gate structure.

### Act I — The Breakout

Question: **What did Juno steal, and why has the regime classified her as a threat?**

Emotional progression: routine, unfairness, panic, first agency, personal mystery. The player should learn the practical world rules, understand the need to keep moving, see the Civic Score, and meet Tam. The first evidence proves the official shortage account is false or deliberately misleading, but the wider story stays unresolved.

### Act II — The Run

Question: **Who benefited from the Severance, and who collaborated?**

Emotional progression: cautious trust, mutual aid, betrayal, local politics, moral ambiguity, growing pursuit. The player meets recurring clients and allies, uncovers ledgers/manifests/work orders/witnesses, sees the Net reach places they care about, and learns that some Scatter leaders participated in the arrangement. Calloway becomes more personal and less purely procedural. Draper pressures her.

### Act III — The Choice

Question: **What was the system protecting, what did it do in the name of protection, and what must happen now?**

Emotional progression: dread, grief, recognition, urgency, morally costly agency. The player learns the role of Cyrite and the Thren, encounters the Voice/keys, decides how to handle Juno's implant, and chooses the file's fate at the Threshold. The ending should reflect both this last decision and the choices made earlier.

The film adaptation is a separate derivative document, not a reason to turn each gameplay stop into a cinematic scene. Keep game pacing, resource pressure, optional discoveries, and player agency primary.

## 5.2 Region/gate map — reconcile to the actual code

Use this as the **narrative intention**; map the beats to the actual eight region entries in the repository. Do not create an extra chart region just to match headings. If needed, treat the Threshold/Last Lanes as the finale at the end of the final implemented region.

| Narrative area | Gate / landmark | Central question | Main evidence or story result | Gameplay expression |
|---|---|---|---|---|
| Cerro / Breakout | First lane mouth | What does the system own about Juno? | Archive wakes; Krail reserve claim contradicts official scarcity story | Existing mine/tutorial, work bay, ID checkpoint, Civic Score fallout, Tam's help |
| The Reach | The Narrows | Who remembers Ada, and who keeps the records? | Shutdown order and Kellern ledger; first date connection | Port scans, bureaucratic propaganda, a clerk's recurring job, rescue-or-abandon choice |
| The Marches | The Rift | Can communities cooperate under scarcity? | Manifests show that “lost” ships may have been scuttled, redirected, or deliberately abandoned | Defend one pact or another, settlement pressure from the Net, route/faction consequences |
| The Salvage Belt | The Scrapgate | Who profits from wreckage and betrayal? | Ada's Warden black box; her voice proves the family link was intentional | Salvage/exploration, Vell's betrayal, named captain/ambush, optional recorder POI |
| The Drift Deep | The Slow Door | What were the lanes designed to contain? | Old charts reveal the pattern of closures and the emerging containment theory | Route/navigation choices, passenger transport, an Office agent, risk around Cyrite movement |
| The Breaker Yards | The Breaker | Who built the machinery of the Severance? | Work order and evidence of Thren-scarred hulls; Calloway's father signature clue | Strike logistics, sabotage/negotiation choice, costs to workers, Calloway encounter |
| The Free Ports | The Tollgate | Who was in the room, and what did they accept? | Forty witnesses / names, including leaders whose descendants now claim victimhood | Information market, sell/buy pressure, Vell/Kesh resolution, Calloway boarding set piece |
| The Hollows | The Seam | What are the keys, and what is the Voice obeying? | Keys and Thren truth; old directive to guard the lanes | Cyrite hold risk, Thren encounter, Echo-or-Sable relationship choice |
| Threshold / Last Lanes finale | The Threshold | What will Juno do with the truth? | All acquired evidence and relationships converge | Final Calloway/Draper confrontation, implant choice, one of six endings |

The first row may be the journey's breakout/tutorial before the eight map regions; verify. The mapping must be explicit and internally consistent in `docs/STORY_BIBLE.md`, `src/content/regions.ts` comments if useful, recaps, tests, and `docs/PLAN.md`.

## 5.3 Repeatable pacing inside each region

Use this flexible pattern without forcing every region to have identical beats:

1. **Arrival hook:** a visual/mechanical oddity makes the regional question concrete.
2. **Early exploration:** optional point of interest, job, scan, or comms that shows daily life and gives the player agency.
3. **Human connection:** one recurring client/ally/settlement whose concrete problem expresses the region's theme.
4. **Complication:** the Net, scarcity, betrayal, or danger makes the problem harder.
5. **Pursuit/escalation:** Calloway, a named captain, faction pressure, or Thren risk changes the cost of staying.
6. **Gate reveal:** one file fragment or Lead answers something while raising a sharper question.
7. **Recap/next lead:** a short, skimmable line that explains what changed and where to look next.

Don't add dialogue to every stop. Target roughly 60% of stops having a story-relevant scan, clue, person, encounter, or environmental tell, but preserve the current travel/combat rhythm. Every stop should have something worthwhile to scan or discover where the scan mechanic exists, though not every stop needs narrative exposition.

---

# 6. The opening vertical slice: exact intended sequence

This is the most important part to get right before the broader rewrite is considered successful.

## Scene 1 — “Contribution” (Cerro)

**What the player sees:** an ordinary work order and a registry strip, not a cinematic lecture. Introduce Juno's Score, proposed to begin at `412 — COMPLIANT / LOW MERIT`. A corporate/Continuance work order states a quota, expected yield, deductions, and net compensation. Make the deductions legible and believable.

**What happens in play:** the player mines the required Cyrite rock, learning the same mining controls as today. The refinery still fills jump fluid first. Do not change the resource model just to simulate wage deductions; use a comms choice, work-order record, card cost, or brief ledger if creating a payroll simulator would be excessive.

**What it should communicate:** Juno is skilled, the system extracts value before she sees her share, and she does not begin as a revolutionary.

**Sample flavour only:**

> EXTRACTION CONTRACT / RENEWAL 08-441  
> Gross yield: 48 units. Refinery allocation: 21. Equipment lease: 9. Fuel reserve: 11. Penalty escrow: 3. Personal credit: 4.  
> CONTINUANCE THANKS YOU FOR YOUR CONTRIBUTION.

Adapt numbers to the real economy and UI. Do not create incorrect resource terminology or promise that the player has 48 spendable Cyrite if the game uses a different scale.

## Scene 2 — The stolen hauler and the score change

During the existing Breakout or first-story card, Juno's access to the Wayward's hidden archive triggers Ada's bloodline routine. The system logs an unauthorised access event. Her Civic Score drops by roughly 30–40 points as a prototype and the UI explains why: “Unauthorised archive access recorded.” Her status moves from compliant/low merit to review/surveillance.

The score change must be cause-and-effect visible; do not change the score randomly offscreen. The player should understand that the regime's monitoring system reacts to her behaviour.

## Scene 3 — Teach flying and ship preparation

Retain the existing tutorial sequence: mine a Cyrite rock, go to the work bay, fit torpedoes, shoot one hostile ship. Tam or another already-established source can frame these tasks with one-line context, but never obscure the mechanical instruction.

The Continuance has not suddenly become incompetent: it wants a registered asset and a sealed archive returned, and it can describe Juno as a theft risk rather than admitting what the archive contains.

## Scene 4 — The first restriction

At the checkpoint/depot or first suitable comms encounter, show a service or route restriction because Juno's registry status is under review. A short choice presents different costs: submit to scan, pay, spoof with a relevant upgrade/item, run, or fight depending on what's actually supported in the current implementation.

Avoid making every option available if the current build cannot support it. Grey out unavailable options with the existing interaction convention and a clear reason. A successful player should always have a forward route; no Civic Score threshold may hard-lock the main journey.

## Scene 5 — Tam's choice

Tam Okoro, a yard foreman, is a recurring voice/contact, not crew. He may provide forged codes or an immediate supply/fuel advantage, with a cost or favour. If the player accepts the codes and helps him leave, he may become the first radio ally and his favour arc begins. If the player takes the safer or more selfish option, the story continues, and later dialogue remembers it.

The choice should be material, legible, and survivable. Do not make the “correct moral” choice the only rewarding one.

## Scene 6 — First evidence / gate reveal

At the first gate or the point where the existing story scheduler can reliably deliver it, the archive decrypts a concrete contradiction: “KRAIL RESERVES: 94%” alongside the Continuance's shortage rationale and the shutdown date. The clue must be clearly labelled as evidence—not immediately as proof of every part of the conspiracy.

The player sees:

- what the new evidence proves: official scarcity was fabricated, manipulated, or knowingly misrepresented;
- what it does not prove: who ordered the Severance, why the lanes were cut, or what the Thren have to do with it;
- the next lead: a Warden or ledger contact in the Reach.

**Slice acceptance:** the player can complete the escape while skimming, remembers why the government is chasing them, sees a practical effect from their first choice, and leaves with one clear story question. A deep-reading player can inspect the evidence and discover more nuance, but is not required to.

---

# 7. The Civic Score mechanic — if absent, implement the smallest useful version

The v2 story calls this “Score”; use the user-facing label **Civic Score** when clarification is needed. The game may already have fields named `score`, `notice`, `heat`, or `standing`. Inspect them first. **Do not reuse or overload an unrelated field.** Prefer a clearly named journey-persistent `civicScore` or equivalent and document the distinction.

## 7.1 What it means

It measures the Continuance's administrative evaluation of Juno: compliance, productivity, reliability, and perceived political risk. It does not measure ethics or faction popularity.

Proposed starting value: 412, scale approximately 0–500. Proposed bands should be tuned through tests. Example bands:

- 400–500: registered / compliant;
- 300–399: under review;
- 200–299: restricted;
- 100–199: flagged;
- 1–99: near unperson status;
- 0: Unperson.

Don't add these bands if a simpler display achieves the same effect. Keep score changes relatively rare and tied to clear actions; avoid a new number flashing every few seconds.

## 7.2 Causes and consequences

Defiance may lower the score: evade a mandatory scan, leak restricted data, help unregistered people, sabotage a Continuance relay, expose an operation, or attack Custody. Compliance or cooperation with the regime can stabilise or raise it if such choice has a meaningful trade-off.

Practical effects should use existing systems first:

- score-conditioned card copy and choice availability;
- checkpoint inspection difficulty, fee, or available bluff;
- controlled port fees or access;
- certain legitimate jobs and services;
- Gutter/Scatter contacts opening at low-score thresholds;
- Office attention or later narration at key bands.

A score drop needs a short feedback line describing its cause and immediate consequence. The top-left HUD indicator can be small; don't crowd flight controls. If an icon/badge or tooltip is enough, prefer it to a new permanent HUD panel.

## 7.3 Balance and anti-softlock rules

- Main story progression must never require the player to have a high score or a low score unless there is at least one reliable alternative way to proceed.
- Score 0/Unperson can mean Custody treats Juno as an obvious enemy, but do not silently make every patrol instantly lethal unless the game is explicitly tested and still fair. Consider hostile scan encounters, denied controlled services, more pursuit, or a checkpoint override instead.
- Low score should unlock access in one social space and close access in another. It is not a “best” score to reach.
- High score can make the game easier in the short term while signalling deeper complicity.
- Do not conflate Civic Score with Calloway's hunt position, immediate combat heat, faction standing, or the Net's spread. They can interact, but must mean distinct things and be surfaced clearly.
- Persist score and relevant flags with a versioned migration. Set a sensible default for old saves and test both old and new saves. Do not blindly seed everyone to 412 if existing journey state should imply another value; document and test the policy.

---

# 8. Evidence Board / The Wall and player comprehension

The v2 design calls the investigation board **The Wall**, opened from the jump chart with `W` or a clearly discoverable tab on touch/gamepad. Inspect current chart/UI patterns before deciding the exact interaction. Do not build a large graph puzzle as a prerequisite for completing the story.

## 8.1 Minimum viable Wall

The first version needs:

- a list/grid of acquired file fragments and clues;
- the clue title and a one-line “what this proves” summary;
- optional detail text for curious players;
- a visible distinction between confirmed fact, plausible inference, and unknown question;
- a “next lead” / objective line with an appropriate lane or region hint;
- a recap of the last major reveal;
- keyboard, touch, and gamepad support consistent with the existing interface;
- all text localised into English and German.

The board should primarily present existing flags and content, not duplicate the entire campaign state in a second graph. Auto-links can be represented by a small relationship list before adding an actual graph visualisation. Manually connecting clues for bonus lines is a later feature, only if playtests show it adds value.

## 8.2 Eight major fragments

The current `src/content/story.ts` has four base fragments and four long-journey fragments. Preserve or carefully migrate their identity:

1. **The order** — the shutdown order, signed in the core.
2. **The ledger** — Kellern's books and the destination/handling of Krail.
3. **The manifests** — ships lost during the blackout and the evidence that they were not simply stranded.
4. **The keys** — who built/maintains the lane breakers and who still guards them.
5. **The black box** — final calls from Ada's Warden vessel on the night the lanes went dark.
6. **The charts** — pre-Severance routes that reveal the pattern of closures.
7. **The work order** — the order to build the breakers, with date and signature trail.
8. **The witnesses** — forty names of people present or involved who later kept silent.

For each fragment, define:

- the exact factual claim it supports;
- the claim it does *not* yet prove;
- where and when the player can acquire it;
- an alternate acquisition path or recovery method where feasible;
- which subsequent beat it unlocks or enriches;
- how it can affect the ending prerequisites or epilogues;
- the one-sentence skim summary and optional deeper text.

Do not require all eight pieces for basic comprehension of the central conflict. Optional/replay paths can reveal a fuller account and unlock stronger or more informed endings.

## 8.3 Leads and recovery

A Lead is valuable only if it changes what the player can do or understand. Examples: highlight the next relevant lane, open a hidden route, expose a captain's weakness, reveal a cheaper or safer option, enable a later conversation with Calloway, or contribute to an ending prerequisite.

Every story-critical clue must be recoverable if a player misses an optional POI, declines a job, or skims a card. Recovery can be another job, a later client, a rumour, a gate recap, or a branch in an existing card. Avoid hidden dependencies that force a player into Vanish or a dead end simply because they did not scan one ship.

The larger proposal estimates about 70 clues and 25 leads; do not implement that volume immediately. First implement the eight major fragments, a limited set of supporting clues and a small number of mechanically meaningful Leads. Scale up only after playtests prove the board is understandable and useful.

---

# 9. Information delivery rules

Use three layers:

| Layer | Intended player | Channel | Requirement |
|---|---|---|---|
| Skim | Player focusing on flight | Objective, short HUD line, arrival cue, visible environmental tell, one-sentence recap | Must understand what to do and why it matters in the moment |
| Engage | Player reading most comms | Existing comms cards, short radio callbacks, client choices | Reveal one new idea at a time; choices carry clear costs/consequences |
| Deep | Curious player | Wall, logs, optional intercepts, dossiers, codex | Adds nuance and connections, not mandatory instructions |

Follow these rules:

1. **Show before explaining.** Put a scan buoy at a checkpoint before a character explains surveillance. Show a better Core dock and a failing worker berth before giving a speech about inequality. Show the Thren around a heavy Cyrite hold before explaining what attracts them.
2. **One new concept per encounter where possible.** Don't introduce Krail reserves, Ada's bloodline, the Forty, Calloway's father, the Voice, and the Thren all in one card.
3. **Story never interrupts a fight with a long read.** Use the existing comms scheduler and pause/phase conventions; schedule major cards on arrival, after combat, at a port, on the chart, or at a gate.
4. **Every region has a question and a gate answer.** The answer should sharpen the next question.
5. **Important choices are not disguised exposition.** If information alone is needed, use a short radio line or a Wall entry; do not force a meaningless choice just to deliver lore.
6. **People recur.** Every important named person has at least two encounters/callbacks, unless the story deliberately resolves them in one encounter.
7. **Skimming remains viable.** Every significant Lead should create an objective or lane hint as well as optional text.
8. **Recap at transitions.** At each region gate, give a compact summary: what was learned, what changed in the world or relationships, and what the next lead is.
9. **Don't over-notify.** Ally reactions should be rare and contextual. The proposal's guideline of no more than one ally reaction per major comms card is a good ceiling.
10. **Quiet flight is for radio intimacy; combat is for combat.** Ally radio lines should be skippable, rate-limited (proposed maximum one line per 90 seconds), and not required for mission completion. Confirm whether the current world clock and UI can support this cleanly before implementing it.

A player should never need to remember a 20-minute-old name without a reminder. Reintroduce who someone is in a short prefix if it has been a long time since they appeared.

---

# 10. Characters: motivations, arcs, and implementation intent

## 10.1 Prefect Idris Calloway

Calloway is a real system antagonist, not a villain who only appears to threaten the player. Keep the current adaptive hunt and use it to reveal her character in stages.

**Core belief:** the Continuance is necessary because she believes she has seen or inherited evidence of what happens when civilisation loses central control. She can acknowledge suffering, but she believes uncontrolled truth, an open lane network, or another collapse may kill more people than the regime does. This belief is not stupid; it is morally compromised by what she accepts and what she is willing to hide.

**Secret:** her father, Prefect Lior Calloway, signed the Severance order. The evidence is found through a chain involving the Reach, the Breaker Yards, and the Free Ports. Do not reveal the signature early and then have Calloway ignore it; it must change her available responses and final decision.

**Pressure:** Director Draper and the Offices of Peace increasingly want the file destroyed and Juno dead rather than captured. Calloway begins with capture/containment logic and gradually faces an ideological and personal choice.

**Three principal set pieces:**

1. **The Narrows / end of the first major run:** Calloway hails Juno. The moment should be unexpectedly personal rather than merely a threat. She knows Ada's file or asks about it: “I read your grandmother's file too.” Use the exact line only if it fits voice and previous context.
2. **The Tollgate / end of Act II:** Calloway boards or traps the Wayward in a damping field. The player can shoot, bargain, present the father's signature, or use another previously earned leverage option if feasible. The choice must not be cosmetic: it changes Calloway's state/future card and the possible joint Trade/Broadcast paths.
3. **The Threshold:** Calloway has a final confrontation with Juno as Draper's fleet arrives. Earlier evidence and choices determine whether she remains an enemy, lets Juno proceed, turns against Draper, or supports a risky truth release.

Leverage from the father's signature should be powerful and, per v2, usable once or otherwise non-repeatable. Ensure the state is recorded so the same dialogue cannot be farmed.

## 10.2 Director Draper

Draper embodies the regime's hardening from stability management into power preservation. He should be dangerous because he understands institutional incentives and believes that exposure is more dangerous than the crimes being exposed. Keep his dialogue economical. He is not another Calloway; he regards her belief in order as a weakness he can use.

Draper wants Juno dead once the file becomes too dangerous. This escalation should be visible in comms/intercepts and reflected in actual encounter pressure, not just described.

## 10.3 Tam Okoro — yard foreman

- Begins in/around Cerro, later reaches a fugitive beacon or safe contact in the Reach if the player's choices permit.
- Offers forged codes, practical refits, or useful ship information through existing systems; avoid a new economy for his benefits.
- Personal favour: get his brother off a breaker crew in the Breaker Yards.
- His loyalty is built on concrete help and whether Juno treats workers as people or expendable resources.
- He never moves aboard the Wayward. He appears via radio/cards and keeps his own circumstances.

## 10.4 Wren Saffi — Drift navigator

- Associated with the Marches/Drift Deep; granddaughter of Mother Saffi.
- Opens hidden lane advice earlier if trusted.
- Personal favour: find the parents' lost ship among the manifests.
- The Forty reveal that someone in her family/community may have accepted a bargain. Wren must reckon with this without becoming automatically guilty for ancestry.
- If trusted and the relevant pact conditions are met, she can help make Unite possible.

## 10.5 Kesh — Gutter fixer

- Based in the Salvage Belt, initially Vell's man but may switch allegiance.
- Provides better black-market prices, ambush warnings, or contacts through existing card/outcome support.
- Personal favour: settle his debt to Vell, pay it, expose Vell, or burn the arrangement.
- He should have motives besides money, but money remains real to someone with few options.
- If he survives and trusts Juno, he can help open or enrich Sell and related epilogues.

## 10.6 Echo or Sable — the Hollows relationship choice

At the Hollows, let the player choose between:

- **Echo:** a fragment of the Voice that can decrypt files and jam signals. It wants eventually to be released from its old directive.
- **Sable:** a Thren-touched survivor who can briefly make a Thren swarm ignore the Wayward and wants to return home.

The choice should change both mechanical affordance and moral context. Don't make one option objectively better in every situation. If the current implementation cannot support all proposed perks safely, ship a smaller distinct effect plus a strong character/ending callback first.

## 10.7 Recurring clients — eight arcs

Prefer to expand existing job goals and comms rather than invent eight bespoke simulation subsystems. Each major client arc has **setup → twist → reckoning**, usually one job/card beat at a time. The final resolution should yield a clue/Lead, a relationship change, a material reward, or a durable consequence. A client can survive, be arrested, go missing, betray Juno, or be rescued based on state, but no one should change outcomes offscreen without a comprehensible cause.

| Client | Home/region | Arc intention | Theme and gameplay |
|---|---|---|---|
| Ansel Brook, Kellern clerk | The Reach | Sells/leaks the ledger, is arrested, and may be rescued from a Custody transport; if he survives, later exposes codes | Bureaucracy, records, whistleblowing; rescue or abandon rather than a lore dump |
| Speaker Oduya, Kessel Hold | The Marches | Defend the Hold's rigs, carry a vote to the moot, then discover the predecessor's name among the Forty | Local governance, survival deals, collective responsibility |
| Vell, Gutter broker | Salvage Belt → Free Ports | Smuggling work, sells Juno's heading, then reckoning: pay, kill, outbid, expose, or otherwise resolve if current systems allow | Everything is for sale, including safety; don't force a binary good/evil response |
| Dov Kessin, salvor | The Salvage Belt | Joint wreck salvage leads to a Severance Warden ship with Ada's recorder | Material remains contain human history; rewards exploration |
| Ossi Rane, Quiet Ferry | Drift Deep | Carry passengers no one asks about; an Office agent is among them | Whether to expose a passenger, protect them, or use them for leverage |
| Marit Voss, strike leader | Breaker Yards | Supply a strike, defend a picket, choose between breaking the yard or brokering a deal | Workers have agency and internal disagreement; outcomes affect employment and later support |
| Ines Duarte, Dust Traders | Free Ports | Offers berth and cargo jobs, then tries to buy the file outright | Corporate respectability and private power; make a lucrative offer genuinely tempting |
| Keeper Oren | Last region/Threshold approach | Charges three questions about the truth; answers derive from collected Wall evidence | Test the player's understanding without blocking progress if clues were missed |

Generic missions should remain the filler system. Reframe some with named senders, one-line context, and callbacks. Do not make every mission a custom quest chain.

## 10.8 Supporting figures and names

Use existing characters where they already exist. The v2 proposal includes Ilse Marrow, Vance (Custody), Kade (Gutter), Sorensen (Custody), Ashgrove (Offices), Pell Anand, Old Mirren, Noor Hale, the Chorus of Nine, and the Loom. Before adding new rows, search content for each name and reuse/resolve any existing implementation. Keep Noor Hale distinct from Tarn Ilvo; the previous review identified a possible naming collision. Do not maintain both a mistaken duplicate and a corrected version in different docs.

---

# 11. Region design details

Use the table in Section 5.2 as the spine. The following details are content direction; adapt triggers to the actual region count and scheduler.

## Cerro / Breakout

- Hook: Juno's Score drops after the archive wakes. The registry treats her as a risk before she understands why.
- Teach: mine, manage fuel, fit torpedoes, fight/evade one hostile, interact with the work bay.
- Human anchor: Tam and the labour contract.
- Environmental/story cues: quota board, deductions, mandatory implant scan, corporate lease sticker, a worker who is technically employed but cannot afford the bay fee.
- Choice: forged codes versus immediate material help; accept a favour and assist Tam or take a more selfish/safe option.
- Gate reveal: official Krail scarcity story contradicted by reserve figures; the date points to the Reach.
- Don't: dump the full Severance chronology or introduce the Thren as a fully explained monster.

## The Reach

- Hook: why does a retired Warden or dead-lane witness know Ada's name?
- Show controlled ports, Kellern billboards, and the gap between administrative cleanliness and worker dependence.
- Ansel Brook's ledger arc begins.
- Complication: Brook is arrested for passing information. Rescue his transport, arrange a nonviolent diversion if supported, or leave him; later content remembers what happened.
- Introduce Vance or the currently implemented equivalent as a named Custody captain.
- Reveal: the order and ledger share a date; calloway's first distinctly personal hail lands around this escalation.

## The Marches

- Hook: Holdfast and Drift interests conflict; can Juno secure both routes or must she prioritise?
- Kessel Hold's rigs and the Long Walk fleet show community under pressure.
- Wren enters as a navigator. Oduya's arc reveals the politics of a local pact.
- The Net reaches Kessel; a player can defend one pact before the other, with visible consequences.
- Kade or current corresponding captain applies pressure.
- Reveal: manifests suggest ships described as lost were redirected, scuttled, or knowingly sacrificed—not merely stranded. Be exact about what the evidence proves.

## Salvage Belt

- Hook: every wreck is someone else's loss and someone else's inventory.
- Vell's jobs begin; Dov Kessin takes Juno through wreck fields; Kesh can switch sides.
- Vell betrays Juno by selling her heading to the Custody. Seed the betrayal if a player scans their ship/logs, but skimming players still understand why the ambush happened.
- A Warden wreck contains Ada's black box. Ada's voice gives the player an emotional answer and a sharper question.
- Reveal: the file was deliberately tied to the family routine, but Ada's full motives remain unclear.

## Drift Deep

- Hook: where does a fleet that never stops go, and who gets to move freely?
- Tarn Ilvo's charts and Ossi Rane's Quiet Ferry show travel as both livelihood and surveillance problem.
- An Office agent is among the passengers. Juno can expose, protect, or exploit this fact if the actual card system supports those branches.
- Ashgrove or the current Offices captain appears.
- Reveal: burned charts show lane closures forming a ring or containment geometry rather than a simple supply line. Do not say exactly what is being contained yet.

## Breaker Yards

- Hook: why is the Custody dismantling its own ships, and who bears the industrial cost?
- Pell Anand's work orders, Marit Voss's strike, and Tam's favour converge.
- Evidence shows Thren-scarred hulls are being dismantled under restriction.
- The player may support a strike, negotiate, sabotage a yard, or preserve a worksite if the current gameplay can express it. Costs should land on specific people, not an abstract “faction +1”.
- Calloway's in-person set piece. Evidence connects her father to the work order/shutdown process; the signature chain is incomplete until later.
- A return/callback at Kessel Hold should show consequences of the Marches decision if feasible.

## Free Ports

- Hook: who was in the room, and what would each person lose if the minutes were public?
- Ines offers safety/berth and later attempts to buy the archive. Vell's reckoning occurs here if alive. Old Mirren holds or brokers the Forty names.
- The Forty include Oduya's predecessor and Mother Saffi's mother (or the actual established names after canon lock). Their inclusion should prompt a difficult conversation, not an instant verdict about their descendants.
- Two hostile interests—such as Gutter and the Offices—can converge at a gate encounter if the game supports it, but avoid an unmanageable fight that interrupts the important reveal.
- Calloway boards/traps the Wayward at the Tollgate. Let the player's evidence and actions influence the available choices.
- The player should leave Act II understanding that there were collaborators and material incentives, but not yet understand the full Thren/keys truth.

## Hollows

- Hook: something has been waiting here for seventy years.
- Voice foundries and Thren routes grow less comprehensible. The visual and audio/text tone moves gradually from recognisably human industry to something alien.
- Choose Echo or Sable. Each grants one distinct benefit and carries an ending/favour implication.
- A rich Cyrite hold attracts danger. Give the player an opportunity to vent it, conceal it, transport it carefully, or use it as bait, depending on available systems. Ensure the result is visible and not just a lore choice.
- The Chorus of Nine or the current equivalent guards the next reveal.
- Reveal: the keys, the Voice's old instruction (“We kept the keys. We were told to.” or a polished equivalent), and the core connection between Cyrite and the Thren.

## Threshold / Last Lanes finale

- Noor Hale or the established aide gives the final prompt: what will Juno do with what she knows?
- Resolve remaining ally favours and show callbacks to the people the player did and did not help.
- Draper's fleet arrives with an actual threat; his objective is now elimination, not normal capture.
- Calloway's final status depends on the father signature, prior leverage, and her previous encounters.
- The final sequence asks for two conceptually distinct decisions: **what happens to Juno's implant** and **what happens to the archive/file**. Keep the UI clear about the order and consequence of each.
- Resolve into one of the six existing endings and show epilogue consequences for allies, Calloway, and surviving major clients.

---

# 12. The six endings: themes and implementation contract

Preserve the six established ending labels and core meanings. The final outcome should be shaped by previous choices, fragments, faction standing, clients/alies, Calloway state, ship build, and final decisions—but do not require every optional side arc to obtain a coherent ending. Avoid a single hidden threshold that silently chooses a worse ending than the player selected.

| Ending | Core promise | Conditions direction from v2 | Cost that must remain real |
|---|---|---|---|
| **Broadcast** | Release the truth to the Core and trust it can matter | Signals 2, four-piece/file threshold, Echo, Calloway turned or equivalent leverage | Open lanes may let the Thren follow; the epilogue shows which communities hold and which are exposed |
| **Unite** | Organise disparate groups into a force capable of resisting | Two pacts, two friendly factions, Wren trusted or equivalent proof of coalition-building | Coalition partners include heirs of people who compromised in the Severance; unity is work, not a victory pose |
| **Sell** | Sell the file to secure personal freedom/wealth | Guild/Gutter friend, Vell alive or relevant buyer, Kesh trusted | Someone weaponises the file; epilogue reveals the buyer's use and what Juno chose not to prevent |
| **Trade** | Bargain with the Continuance for amnesty, identity, and a way home | Calloway truthful/turned or reliable contact; Offices sufficiently calm; implant kept | Juno gains safety inside a system she understands; consequences for those left outside cannot be erased |
| **Seal** | Keep the lanes closed / preserve containment and protect the Scatter | Guns 3 or Rig 3 or equivalent preparedness, keys, Echo trusted | The lie survives and the Scatter remains isolated; there is real protection and real abandonment |
| **Vanish** | Refuse to determine everyone else's fate; take the Wayward beyond known routes | Always available as a valid opt-out | Freedom through absence means few people learn what happened; this must be poignant, not framed only as a punishment |

The exact unlock requirements must be reconciled with current `src/content/endings.ts` and tested. Existing endings logic may encode requirements differently; preserve working behaviour unless an intentional migration is needed.

## 12.1 Implant choice

At the Threshold, before the file decision, Juno chooses the fate of the implant:

- **Keep it:** retains a route home/registered identity and makes Trade cleaner, but means accepting continued legibility to the regime.
- **Burn it:** gains personal freedom but leaves scars, risk, and lost access; can enrich Vanish and Unite epilogues.
- **Let the Voice rewrite it:** Juno becomes something new; can enable a variant of Broadcast or Seal depending on prior state.

This choice should be implemented only if the UI and ending-state model can record it cleanly. It should change epilogues, not become a late-game cosmetic toggle. Provide clear, short trade-off descriptions and no hidden surprise about a major consequence.

## 12.2 Epilogues

Use data-driven conditions and concise epilogues. At a minimum, resolve Calloway, Tam, Wren, Kesh, and Echo/Sable, plus the fates of surviving clients whose arcs mattered. Do not blindly generate a unique paragraph for every ending × every possible branch if the existing data model cannot maintain it. Use a stable base epilogue per ending plus conditional lines based on flags/trust/client outcomes.

The epilogue should answer: What happened to Juno? What did the file change? What happened to a few people the player knows? What did it cost? Leave mystery around the Thren/Voice where intended, but do not leave the main emotional arc unresolved.

---

# 13. Gameplay integration plan — build only what's needed

## 13.1 First priority: reuse the existing narrative/comms machinery

The codebase already uses data-driven content rows, a story beat scheduler, flags, communications phases, journey-persistent state, chapter/gate handling, and conditional ending rules. Extend those rather than create a parallel quest manager.

Inspect current implementations; likely touchpoints include (not exhaustive):

- `src/content/story.ts` — acts, fragments, story definitions or related data;
- `src/content/cards.ts` and any story-specific card/content modules — dialogue, choices, outcomes;
- `src/content/regions.ts`, systems, captains, jobs, and other content tables;
- `src/content/endings.ts` — ending prerequisites and epilogues;
- `src/sim/story.ts` — story beat scheduling;
- `src/sim/desk.ts` and `src/sim/comms.ts` — when cards open and how choices/outcomes are resolved;
- `src/sim/journey.ts` — journey-persistent flags, standings, score and chapter state;
- `src/sim/world.ts` — active system flight, combat, phases, outcomes, and safe timing;
- `src/sim/chapters.ts`, chart/fork/lanes modules — gate saves, recap, lead routing, and map hints;
- `src/meta/save.ts` or the current save module — migration;
- `src/i18n/` and all current English/German content tables;
- `ui/` or `src/ui/` current controls/HUD/comms/chart/port screens—confirm actual paths before editing;
- `tests/`, existing i18n checks and scripted/headless pilots.

These are repository paths identified by the current design; use the checked-out source as authoritative. Do not assume every UI or state location named here has remained unchanged.

## 13.2 POIs/scanning: minimum viable design, not a full exploration engine

The redesign proposes `ARRIVE → SCAN → INVESTIGATE → CONNECT → DECIDE → JUMP`. The present game may not have a dedicated scan pulse or story-POI system. If it doesn't, implement the smallest version that can support the narrative without disrupting flying:

- a short scan input available on keyboard, touch, and gamepad;
- a pulse/highlight of one to three points of interest in a suitable radius, with better Signals upgrades extending range or revealing hidden points;
- point-of-interest definitions stored in content data and selected by system/region/story conditions;
- POI types may include derelict, beacon, person/ship, sealed vault rock, courier, Accord-era ruin, intercepted transmission, or Severance grave;
- most POIs should reuse current objects, comms, jobs, rocks, ships, or text panels rather than create entirely new physics systems;
- interaction is a short flight task: fly near a wreck, protect a rig, tail a courier, scan a record, mine a sealed rock, or respond to a hail;
- completion sets a clue/flag, adds a Wall entry, or changes a future choice;
- one or two optional clues per relevant region can have alternate acquisition routes;
- never force a player to collect all POIs to reach a region gate or finish the journey.

If adding a scan control would destabilise mobile/gamepad input or require extensive new assets, first prototype the narrative through existing encounters and present the POI feature as a separately tracked phase. Don't claim that the full new loop exists until it's playable and tested.

## 13.3 Comms and radio allies

The comms system already pauses or adjusts the world for decisions; respect its ambush/timeout/default behaviour. Story cards must not accidentally use a random or repeat condition that lets the central story play twice or disappear.

Allies remain off-ship. Build a small channel/interaction layer only if needed:

- contacts become available after a relevant meeting/choice;
- short, skippable radio lines can occur during quiet flight or at the comms desk;
- proposed rate limit: no more than one line per 90 seconds, never in active combat, and preferably only when the world phase is safe;
- if a radio line is skipped, the information can be recovered via comms history/Wall/recap where essential;
- ally reactions must respond to concrete player choices, not generic “like/dislike” spam;
- trust should be based on a few memorable crossings rather than constant numeric grinding;
- losing an ally should be narratively clear and should not hard-lock the entire story.

## 13.4 Client jobs

First determine what the existing ten goal kinds, card outcomes, and job lifecycle support. Use those existing goals to implement the arcs through different targets, dialogue, conditions, and flags. Add a new goal type only when existing ones cannot represent the action and the new type earns its maintenance cost.

Every recurring arc needs explicit:

- setup trigger and card/job;
- player choice(s) and costs;
- state flags and how they persist;
- twist trigger;
- reckoning / resolution trigger;
- evidence or material reward;
- later callback(s);
- fallback if the player never accepts the first job;
- test coverage for each meaningful branch.

## 13.5 Regions, the Net, and environmental story

Use existing region/system tags and chart layout first. Environmental story can be delivered through short arrival lines, object appearance, card text, local prices, checkpoint status, and return callbacks. Only add bespoke visual assets after the prototype proves the story beats need them.

The Net should change the world in readable ways: more mandatory scans, rising costs, fewer friendly calls, pressured local leaders, restricted resource routes, or a blockade. Don't simply turn “Net level” into a lore line. Conversely, do not make every system hostile; safe havens, compromised collaborators, and ordinary commercial life need to exist for contrast.

## 13.6 UI design and readability

Follow the existing brand conventions and layouts. Avoid adding permanent UI clutter. Civic Score can be a small label near objective/status. Story cards should fit a concise main text plus optional detail. The Wall should have a clear “what this proves” summary and a next action. Recaps should be visible and skimmable. New screens/overlays must be tested at desktop and phone sizes, with touch and gamepad interaction.

Use visual hierarchy that matches the established design palette: information colour for clues, caution for uncertain/conditional state, threat colour for hostile forces. Do not use red for ordinary information simply because the theme is dystopian. Preserve contrast, input accessibility and readable font sizes.

---

# 14. Technical boundaries and save safety

## 14.1 Follow repository instructions

The repository's `CLAUDE.md` establishes these hard rules:

- TypeScript + Three.js + Vite for the browser game.
- `src/sim` is plain-data simulation code and must not import Three.js.
- Simulation uses fixed 1/60-second steps and must remain headless-testable.
- Decisions follow `World.phase` and the app/pilot answer-method pattern.
- Story/cards/upgrades/systems/captains/endings are data rows where possible; rules live in sim modules.
- The game must remain playable without reading all prose; objectives and choices must have clear labels/costs.
- Every player-facing line is routed through `t()` with a German twin under `src/i18n/de/`. German is informal “du”; project prose uses British English.
- Any change to the journey save shape increments `VERSION` and adds a migration in the current save module.
- Run `npm run check` and `npm run build` before a push; pilots support balance claims.
- Update `docs/PLAN.md` when a milestone moves.

Do not violate these to meet a narrative deadline.

## 14.2 Save migration

The v2 proposal suggests save version 18, but current checkout may have advanced. **Never assume 18 is correct.** Inspect the current `VERSION` and migration sequence. If adding Civic Score, trust, an implant choice, or Wall/lead state changes the saved data shape:

1. add the new typed field with a safe default;
2. bump the version exactly once for the grouped migration;
3. migrate old saves without deleting current progress, build, flags, standing, jobs, or chapter saves;
4. define how default Civic Score/Wall state should be inferred or seeded;
5. ensure migration is idempotent and can load existing saved journeys;
6. write unit/fixture tests for pre-migration and current saves;
7. test save → load → continue → finish story where practical.

Prefer derive-on-read values if the new field does not need persistence. Don't duplicate state that can safely be derived from existing flags.

## 14.3 Translation / localisation

Every new visible line, including status bands, objectives, tooltips, clue summaries, score-change explanations, choice labels, cost chips, recaps, epilogues and test/debug-visible player copy, must use the project's established `t()`/localisation pipeline and include a German twin. Never hide story-critical text in a literal in a simulation module or UI component. Run the i18n test and fix all missing twins. Keep both languages concise and equivalent; German should not be a machine-translated, much longer version that breaks layout.

## 14.4 Data integrity and stable identifiers

- Search for a card/flag/character/ending ID before adding a duplicate.
- Preserve IDs if possible. If rename/migration is unavoidable, account for saved flags and old saves.
- Avoid generic booleans such as `seen1`, `trust2`, or flags with unclear ownership. Use descriptive names and central definitions where the repository pattern permits.
- Make once-per-journey versus repeat conditions explicit.
- Test that a card can't trigger at the wrong region or during active combat.
- Keep the campaign playable through optional failures.
- Keep Arcade Mode isolated: narrative flags, Civic Score and story scheduler must not leak into Arcade unless intentionally designed.

---

# 15. Implementation milestones and schedule

Use this as a sequenced plan, not a promise of wall-clock delivery. Base the final schedule on the real code audit and report effort as rough engineering estimates.

## Phase 0 — Baseline and canon audit

**Outputs:** baseline report; map of story state and source paths; confirmed eight-region mapping; list of stale docs; story bible draft.

**Done when:** current checks/build/pilots are recorded, no unrelated user work is overwritten, story flags/endings/save version are understood, and the mineral/region conflicts are resolved explicitly.

## Phase 1 — Story bible and narrative architecture

**Outputs:** `docs/STORY_BIBLE.md`, full beat map, content inventory, character arcs, chronology, ending conditions, skim/engage/deep information flow.

**Done when:** every major revelation has an earlier seed, a concrete proof source, a gate/trigger, a player consequence, a next question, and a fallback path. Each region has one core theme and a concrete lived example.

## Phase 2 — Cerro vertical slice

**Outputs:** revised opening/tutorial framing, first Civic Score state/effects if approved by code audit, Tam's first interaction, first evidence, next-lead objective/recap, English/German copy.

**Done when:** a new player can explain why Juno is pursued, how the Score affected their route/service, what the first evidence proves, and where to go next; all controls/tutorials still function.

## Phase 3 — Evidence/Wall and story-state foundation

**Outputs:** compact evidence view using current flags; source-of-truth fragment definitions; lead summaries; save migration if new state is required; recovery rules.

**Done when:** the player can revisit known evidence, obtain a next lead without reading every log, and recover any essential clue they missed; old saves still load.

## Phase 4 — Full story rewrite through the eight regions

**Outputs:** rewritten story beats/cards; client arcs; allies; Calloway/Draper stages; eight fragments; regional hooks/gate reveals/recaps; three-act escalation.

**Done when:** every main beat is triggered exactly where intended, earlier decisions affect later text/outcomes, no card repeats incorrectly, and the whole plot remains understandable when skimmed.

## Phase 5 — POIs/scanning and deeper exploration (conditional)

**Outputs:** small reusable scanner/POI system, selected hidden leads, optional discovery paths, limited side clues.

**Done when:** scanning creates meaningful exploration rather than chores, works across inputs and devices, and does not delay or soft-lock the main plot. If this feature is too costly in the current architecture, report and defer it rather than building a fragile system.

## Phase 6 — Ending and epilogue integration

**Outputs:** coherent ending prerequisites; implant choice if feasible; six satisfying endings; relationship and client epilogues; Calloway resolution.

**Done when:** all endings can be reached through intended conditions; no option appears unlocked incorrectly; endings reflect history; Vanish remains available; epilogues do not contradict flags.

## Phase 7 — Playtesting and release candidate

**Outputs:** full-journal reports; reader/skimmer pilots; focused playtest notes; localisation pass; visual/UI screenshots for desktop and phone; docs and plan update.

**Done when:** check/build/i18n/pilots pass, no regressions against baseline remain unexplained, story-critical information is comprehensible, old saves load, and all remaining scope is documented.

### Suggested calendar for a small project

A working target is a ten-week plan: Week 0 baseline; Week 1 canon and map; Week 2 opening slice; Week 3 migration/Wall; Weeks 4–5 region content and callbacks; Week 6 Calloway/endings; Week 7 journey/regression pilots; Week 8 UI/localisation polish; Week 9 freeze, docs, release review. Do not rush to fit if the baseline reveals more work; quality and integration matter more than pretending the estimate is guaranteed.

---

# 16. Test plan and definition of done

## 16.1 Automated and headless tests

Use the test and pilot framework that actually exists. Add tests for:

- the starting Civic Score and any band transitions;
- score changes caused by defined outcomes and their feedback flags;
- score does not overwrite faction standing, hunt pressure, or the Net;
- all story cards' eligibility conditions by region and journey state;
- once-only delivery for major reveals;
- no story card requiring a POI or choice that a player can permanently miss;
- all eight fragments and their prerequisites/summary copy;
- each ending's requirements and selected outcome;
- Calloway turning/remaining hostile based on state;
- implant state and epilogue state, if implemented;
- client arc setup/twist/resolution branches;
- save migration, including the actual current pre-change version and new version;
- localisation completeness in English and German;
- no story/Civic Score leakage into Arcade Mode;
- decisions do not unexpectedly proceed under combat/ambush phase rules.

## 16.2 Two essential journey pilots

### Reader pilot

A deterministic scripted pilot opens and reads each available story card, makes a predefined set of choices, inspects evidence where possible, and attempts a non-Vanish ending. It checks that content is available when expected and that state changes match the design.

### Skimmer pilot

A pilot opens no optional logs/details and selects straightforward survival choices. It should still reach the Threshold, understand the main objective from HUD/recaps, and have a valid non-Vanish outcome. If the current pilot framework cannot model UI reading, build the nearest supported deterministic journey test and document the limitation; do not pretend it is a true reading-behaviour simulation.

Also exercise at least one low-score run, one high/compliant run, one failed/missed optional client, one abandoned ally/mission path, and the six ending eligibility checks.

## 16.3 Manual review questions

Ask playtesters who have not read the story bible:

1. Within the first 10 minutes, what kind of system does Juno live under?
2. What happened to Juno's Score, and why did that matter?
3. Why is the Continuance chasing her specifically?
4. What does the first archive clue prove, and what remains unknown?
5. Who owns/controls the resources or equipment Juno depends on?
6. Can you describe one situation where compliance would have been useful and one where defiance was useful?
7. Can you remember what Calloway believes, even if you disagree with her?
8. By Act II's ending, do you understand that some Scatter leaders participated in the Severance bargain?
9. By Act III's reveal, do you understand that the Thren threat is real without concluding that the regime was therefore justified?
10. Do you know where to go next without opening every optional log?
11. Did any choice feel cosmetic or have an unclear cost?
12. Did you feel forced to read too much during flight or combat?
13. Did anything you did earlier change a later scene in a way you noticed?
14. Did any ending feel like it contradicted the story you played?

## 16.4 Release definition of done

The redesign is not done just because story text has been rewritten. It is done when:

- story bible, live story content, endings, and developer docs agree;
- all major facts are canon-consistent;
- opening vertical slice demonstrates theme through action;
- every major region has an identifiable question, human stake, reveal, consequence, and next lead;
- eight fragment definitions align with the actual plot and flags;
- key information is skimmable and recoverable;
- Civic Score, Wall, POI, trust, or other added state is implemented only if it has a clear tested purpose;
- old save migration works if the state shape changed;
- mobile, desktop and gamepad interactions are checked for new UI;
- English and German lines pass i18n tests;
- check/build/relevant pilots pass, or remaining failures are explicitly catalogued and not caused by this change;
- Arcade Mode still behaves as before;
- docs/PLAN.md status accurately reflects the delivered work;
- the next developer can understand what shipped, what was deferred, and why.

---

# 17. The film adaptation — create a separate companion treatment

Do not implement film functionality in the game. Create a short companion document, for example `docs/FILM_TREATMENT.md`, after the story bible and main arc are stable.

**Working logline:** An industrial pilot whose identity is owned by an authoritarian state steals a decommissioned ore hauler and discovers evidence that the government fabricated the crisis used to abandon entire worlds—only to learn the lanes were also containing a threat that could follow humanity's most valuable resource home.

**Feature structure:** aim for 105–115 minutes, with Juno and Calloway as the central character engine. Compress multiple game regions into fewer cinematic locations rather than depicting all ~85 stops. Keep three escalations:

1. **Personal survival:** Juno's economic identity collapses; she takes the Wayward and finds Ada's archive.
2. **Political conspiracy:** evidence leads through a clerk, a broken settlement pact, a wreck/recorder, and the Forty. Calloway begins to see her father's role and her own complicity.
3. **Existential decision:** the Thren truth complicates the conspiracy; the file's release could save people politically while exposing them physically. Juno and Calloway choose what kind of future is possible.

The film should not resolve into “authoritarian rule was necessary after all”. The regime exploited the threat and hid the costs; the real dilemma is whether people can confront danger without preserving a system that treats them as disposable.

The treatment should include logline, one-page synopsis, 8-sequence outline, Juno and Calloway arcs, the key revelation order, and adaptation guardrails. It must derive from the same story bible and should not set new canon.

---

# 18. AI-assisted working agreement

Use Claude Code as an implementation engine, but keep authorship disciplined.

For every meaningful change:

1. State the story/design requirement it serves.
2. Identify the current code path and content rows involved.
3. Make the smallest coherent change; prefer data and existing outcomes over a new engine.
4. Add or update tests and localisation immediately, not as an end-of-project cleanup.
5. Run focused tests while iterating; run the full documented checks at each milestone.
6. Update the story bible or implementation docs if a fact, trigger, or interface changes.
7. Summarise the actual user-visible result and known limitations.

Never:

- refactor unrelated systems while rewriting the story;
- silently remove an ending, client, existing control, or working mechanic;
- change economy fundamentals to make dialogue easier to write;
- add 70 clues, 25 leads, nine new interfaces, or a complete faction simulator before the core loop is proven;
- create a story state that lives only in UI instead of the simulation/save model;
- create a save-breaking field without migration;
- leave English-only copy or placeholders in German;
- make an essential clue available only through a high-skill upgrade, optional mission, or easily missed POI;
- interrupt combat with nonessential exposition;
- call work finished based on type-checking alone;
- invent successful test results or deployment results;
- commit, push, or deploy unless explicitly asked by the project owner.

When there is uncertainty:

- If it's a small implementation detail, choose the conservative solution and document it.
- If current code and this brief conflict, preserve mechanics and report the smallest narrative-compatible adjustment.
- If two canon interpretations are both plausible, do not implement both. Put the issue in the story bible's “Open Canon Questions”, recommend one with reasons, continue on non-blocked tasks, and request owner input only if the choice materially changes a major reveal or ending.

The project's narrative owner wants you to do the development work, not seize narrative authorship. Use your judgment on implementation; use this brief for the story.

---

# 19. First concrete tasks — start here, in order

Do these tasks now rather than returning only a plan:

1. **Audit:** inspect working tree, scripts, docs, story cards, journey/region data, endings, i18n, migrations, tests, and pilots. Record baseline check/build status.
2. **Resolve canon and map:** create/update `docs/STORY_BIBLE.md` with the mineral-role rule, the real Krail shortage vs Thren containment relationship, exact eight-region/gate mapping, names, chronology, and the three-act reveal chain.
3. **Inventory story state:** list all existing story/card IDs, flags, fragment flags, ending gates, character IDs, and region triggers. Preserve compatible IDs and identify stale/dead content before editing.
4. **Write all major story beats:** produce a full region-by-region beat table and dialogue outline for the main story, clients, allies, Calloway, and endings. Keep the eight existing file fragments as the core spine. Link every beat to a trigger and a durable state effect.
5. **Implement Cerro:** revise the opening card/tutorial framing, introduce the Score through a small state model only if needed, give the player a visible first restriction and meaningful Tam choice, expose the first evidence clue, and show the next lead. No broad refactor.
6. **Update the Wall/Evidence MVP:** if the UI architecture supports it cleanly, present fragment summaries, what each proves, what's still unknown, and the next lead. Otherwise ship the content/state foundation plus a clearly documented next implementation step; do not pretend an unbuilt UI exists.
7. **Add migration only if required:** inspect current save version; implement and test a safe migration for any new persistent field.
8. **Continue the rewrite:** implement the remaining major region beats, client consequences, Calloway stages, and all six endings in small vertical increments.
9. **Run verification:** check, build, i18n, tests, relevant pilots, reader/skimmer equivalents, and desktop/mobile UI checks.
10. **Report accurately:** summarise what's complete, what is still planned, how it is tested, and the next most valuable tasks.

Do not stop after tasks 1–4 unless a real technical blocker prevents code/content implementation. Do not invent a technical blocker simply because the full rewrite is substantial. Deliver the best safe increment in the current session, document remaining work, and keep the main thread playable.

---

# 20. Compact project reminder

When deciding between more lore and better implementation, prefer this rule:

> **Make the player depend on the dystopia, then make the cost of that dependence impossible to ignore. Let every major reveal change what the player believes, what they can do, whom they trust, or what future remains available.**

The player should never be told only that the Continuance is oppressive. The player should need its fuel routes, its jobs, its safe ports, its licensed equipment, its information, and its identity system—then discover who is excluded from those benefits and what keeps the system profitable. The truth should change the meaning of the same mechanisms the player has relied on since Cerro.

That's the heart of WAYWARD. Build the implementation around it.
