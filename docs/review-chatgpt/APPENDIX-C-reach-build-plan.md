<!-- Copy of /mnt/project-files/reach-build/REACH-BUILD-PLAN.md, 2026-10-26. Main has moved since: PR 1 (#371) is merged. -->

# Building The Reach: the plan

*26 October 2026. Main at `a7be7d5`. Source of truth for copy: "The Reach: Chapter Script" (Claude Doc). Source of truth for structure: "WAYWARD: An Authored Road" (Claude Doc).*

The Reach is the first leg of the Warden's Road and the playable slice that decides whether the road idea works. This plan builds it in eight pull requests, each small enough to review and merge on its own. All of it sits behind `?road` until the slice has been played on a real device. After that, one line in `main.ts` makes it the default for new Story journeys.

## What "done" means for the slice

A new Story journey started with `?road` plays like this:

1. Cerro plays unchanged: the opening, the breach, Sam's code, the rename and the archive.
2. The audit dock system plays unchanged.
3. Through its Jump Gate, the **Course screen** opens instead of the chart. It shows the leg goal (the Narrows), the next stop (Northfold) and the stop after (Halden's Reach), with the pursuit counted in days.
4. Eight fixed stops follow, in order: Northfold, Halden's Reach, Hollis, Marlow, Vesta, Branford, Copperline and the Narrows. Every line in the chapter script plays in its place.
5. At the Narrows the relay lights, Ada's first note opens, the Patience arrives and Calloway's card plays. Sam's signal is lost.
6. Through the Narrows, the Marches play as today (a generated chart with lane choice). The slice ends at the Narrows; the other seven legs come only after the playtest.

It ships with `npm run check` and `npm run build` green, German twins for every new line, Course screen shots at desktop and phone sizes, and a pilot report for the slice.

## What the code has today, and what that means

| Need | What exists | What is missing |
|---|---|---|
| A fixed road | `makeChart` (`sim/chart.ts`) lays each region out from `RegionDef.cols` and `sizes`. A column of size 1 already makes a single lane. | Fixed names, kinds, ports and breathers per stop. A `road` region set. |
| No lane choice | `options()` and `plot()` (`sim/journey.ts`). `autoCourse()` already skips the chart after the audit dock system. | A Course screen in place of `ui/chart.ts` on road legs. |
| Jobs on fixed stops | `dealSituations` (`sim/situations.ts`) deals jobs to systems. `Sit.arc` marks a guaranteed one. | Pinning a named job to a named stop. |
| Story cards | `BEATS` and `dueBeat()` (`content/story.ts`, `sim/story.ts`): one beat per sortie, by region. `story_warden`, `story_ledger`, `story_brook_arrest` and `story_calloway_narrows` already exist. Outcomes chain cards with `follow` and add radio with `radio`. | Several beats per stop, bound to a stop rather than a region. |
| Lines at a safe moment | `Desk` (`sim/desk.ts`) holds major cards until the sky is clear (`stale.major` is Infinity). | Radio (`World.radioLines`, `radioQ`) ignores fights, and a new sortie drops any lines still waiting. Ambient lines lapse after 20 s and share a two-line budget per sortie. |
| Clues | The Wall (`content/wall.ts`) reads rows from flags and has no state of its own. | New rows: the order's signature, Ada's name, the ghost, the relay, Ada's note. |
| Pursuit in days | `daysUntil()` (`sim/hunt.ts`) already counts in days. | Thresholds for amber, red and arrival. A label that changes at the Narrows. |
| "Knows your route" | `search()` returns 0 when `hunch.straight` is true. | **Watch out:** on a linear road `hunchOf()` reads every pilot as flying straight, so Calloway would stop searching from the third stop on. The road has to keep `straight` false until the relay broadcasts. |
| Ashgrove | He is a captain in `content/captains.ts` (Inspector, *Kind Regard*), with his hail. | Using him as the Narrows checkpoint officer. |
| The archive style | `story_wake` uses the written-message style (no title, quoted). | A document view for the order, and the same style for Ada's note. |
| Saves | `VERSION = 20` in `sim/journey.ts`, and `migrate` in `meta/save.ts`. | Version 21. |

## The pull requests

Each one is reviewable alone and leaves `main` playable. Pull requests 1 to 3 are the foundation and go in order. After them, 4 to 7 can run in parallel, and 8 closes the slice.

### PR 1 · The road as data

*The Reach becomes one fixed line of stops, behind `?road`.*

- **New `src/content/road.ts`:** one row per stop. Each row has a name, a kind (`port`, `mining`, `transit` or `contested`), a holder, a port name or none, `quiet`, a role (landfall, hub, work, turn, breather, pressure, reckoning or approach), a pinned job id or none, and its script id.

  | # | Stop | Kind | Port | Quiet | Job |
  |---|---|---|---|---|---|
  | 0 | the audit dock system (unchanged) | as today | as today | | |
  | 1 | Northfold | transit | none | | |
  | 2 | Halden's Reach | port | Kellern | | `nothing_to_declare` |
  | 3 | Hollis | mining | none | | `follow_cyrite` |
  | 4 | Marlow | port | Kellern | | |
  | 5 | Vesta | transit | none | yes | |
  | 6 | Branford | contested | none | | `pirate_toll` |
  | 7 | Copperline | port | Kellern | | |
  | gate | The Narrows | gate | | | |

- **`content/regions.ts`:** add a `road` region set. It is `REGIONS_LONG` with the Reach replaced by eight columns of size 1, plus an optional `road` field on `RegionDef` that points at the stop rows.
- **`sim/chart.ts` `makeChart`:** when a column has a road stop, take its name, kind, holder, port and `quiet` from the row instead of the seed. Skies and rock stay seeded through `composeChart`, so two journeys on the same road still look different.
- **`sim/situations.ts`:** `dealSituations` pins the road's jobs to their stops as `arc` situations, and deals nothing else in road columns.
- **`sim/calloway.ts`:** on a road region, `hunchOf` keeps `straight` false until the flag `relay_broadcast` is set, and then keeps it true. This is the "knows your route" rule.
- **`sim/story.ts`:** on road stops, `dueBeat` hands over to the stop's script (PR 3). The region `BEATS` rows for region 0 stay for the old charts.
- **`main.ts`:** `?road` starts new Story journeys on the `road` set.
- **Save:** `VERSION` goes to 21. `migrate` sets `carry.pending = []` (see PR 3) and leaves older journeys playable on their own charts. The user chose to ignore old saves, but nothing here forces them out.
- **Tests (new `tests/road.test.ts`):**
  - the Reach has one lane per stop, in the table's order;
  - names, kinds, ports and Vesta's `quiet` match the rows;
  - each pinned job sits on its stop and nowhere else;
  - the Marches onward are generated exactly as on the `eight` set;
  - before `relay_broadcast` the hunch is never `straight`, and after it always is;
  - a v20 save still loads.

**Size:** medium. **Done when** a `?road` journey flies the eight stops through the old chart, one lane at a time.

### PR 2 · The Course screen

*The chart's question changes from "where next?" to "how far, and at what cost?"*

- **New `src/ui/course.ts`**, opened wherever `ui/chart.ts` opens today when the current region is a road region. It shows:
  - three layers at once: the **leg goal** (*The Narrows · an old relay, dark seventy years · 8 jumps*), the **next stop** with its purpose, and the **stop after**;
  - the leg as a line of eight stops behind those, with the current one lit and the gate at the end;
  - two or three dark lanes off the road, labelled *Netted · Custody holds this lane*. They are drawn from the row and lead nowhere;
  - a thread marker on stops with a pinned job;
  - the pursuit in days, to the half day. It reads *Custody pursuit · 2 days behind* until the Narrows, then *Governor Calloway · 1 day behind · knows your route*. Vesta reads *Not shown while you rest*;
  - fluid and supplies against the next jump, from the same numbers `forks.ts` gives the chart;
  - one button, **Jump to <next stop>**, which calls the existing `plot()`.
- **`sim/journey.ts`:** `autoCourse` no longer skips the screen on road journeys. The first Course screen opens at the jump out of the audit dock system, before Northfold, as the script says.
- **Pursuit numbers:** add `PURSUIT = { start: 2, amber: 1, red: 0.5 }` in `sim/hunt.ts`. Tune `HUNT_START` and the first legs so a pilot who keeps moving reads 2 days at Northfold. One shared helper rounds to the half day for every screen.
- **Look:** Neon Glass from `src/styles/neon.css`, following `docs/DESIGN-GUIDELINES.md`. Steel blue for the player's road, teal for information, and dull gold only for the amber pursuit. Every answer must be reachable at 568×320.
- **Strings** through `t()`, with German twins in `src/i18n/de/`.
- **Tests:**
  - the view model (three layers, the label switch, days rounding) is a plain function in `sim/`, tested headless;
  - `reading.test.ts` limits hold.
- **Shots:** desktop and phone landscape, English, before and after the Narrows.

**Size:** medium. **Done when** a `?road` journey never shows the old chart in the Reach.

### PR 3 · Story beats that wait their turn

*The playback rules from the chapter script, as code. This is the part everything else leans on.*

- **New `src/sim/script.ts`:** a small runner for a stop's script. Each row has:
  - `id`: a stable key, written to `carry.seen` once played;
  - `on`: a trigger. One of `arrive`, `free` (the first free moment), `settle` (drifting, the Wall open, or near a named site), `tank` (a share of the tank), `near` (within some distance of a named site), `after` (another row has played), `flag`, or `leave` (near the gate);
  - `if`: a condition on flags, for the branches (Ilse cut off, Brook free, Ada named);
  - `do`: one output. That is `radio` (from, line), `notice` (teal, amber, red or white), `objective` (main or quiet line), `card` (a card id), `wall` (a flag only, silently), or `pursuit` (a label change).
- **The queue.** A triggered row joins a story queue that never drops anything. Rows play in order, one at a time:
  - **A free moment** reuses `Desk.may`'s reading: no hostile inside `DESK.threat`, nothing fired at the ship for 4 s, no card open, no job fight running, not in a gate ring, not jumping. `DESK.settle.major` covers the clear-sky wait.
  - **Radio** goes through `World.radioLines`, at least 2 s apart, and is held while `busy` is `fight` or `transit`. It sits outside the ambient ping budget, so chatter never crowds out a story line, and the opposite way round: chatter waits while a story line is queued.
  - **Cards** go through `desk.offer(def, 'major')`, which already waits for a clear sky.
  - **Wall flags** are set the moment the row triggers, before any radio line about them plays. The rule is "clues live in the Wall".
  - **Across a jump:** rows still waiting go into `carry.pending` (new, save v21) and play at the next stop's first free moment.
- **`World.radioLines`:** story lines are kept across sorties instead of being dropped, and a line already on screen when a fight starts finishes on the radio strip. The rest of the radio is unchanged.
- **Content:** `src/content/script/reach.ts` holds the rows. In this PR it carries only Northfold's lines, to prove the runner (Sam's two lines, the arrival notice, the objectives).
- **Tests (new `tests/script.test.ts`, headless):**
  - a line triggered mid-fight waits and plays after it;
  - two lines never overlap;
  - a line still waiting at the jump plays at the next stop;
  - a Wall flag is set before its radio line;
  - a card never opens with a hostile in range;
  - a save and reload mid-queue loses nothing.

**Size:** medium to large. **Done when** Northfold plays from data, and the tests above pass.

### PR 4 · Halden's Reach to Copperline: the copy

*Every card, radio line, notice, objective and Wall row for stops 2, 4, 5, 6 and 7, word for word from the chapter script. Hollis's ghost and the Narrows have their own PRs.*

- **Halden's Reach:**
  - Ilse's existing `story_warden` card, unchanged.
  - Two new cards follow from her first two answers by `follow`. **`story_order`** opens the order as a document and has one answer, *Take the order*. **`story_handwriting`** names Ada and has the answer *She was my grandmother*, with the hint *Your family only ever said she was lost in service*.
  - New flags `ada_named` and `clue_order_sig`.
- **Document view:** a `layout: 'document'` for a card, built from `story_wake`'s written-message style in `neon.css`. The order's text and the *L. C.* signature show on the card. This view is reused for Ada's note in PR 5.
- **The cut-off branch:** `ilse_recording` is a card at Vesta, gated on cut off and no `frag_order`. It carries the same document and sets the same flags.
- **Marlow:** the existing `story_ledger` card. Sam's lines branch on whether the order is already in the file.
- **Vesta:**
  - every row uses the `settle` trigger, never a timer;
  - Hester's first radio line;
  - Sam's Ada line;
  - *You don't have to talk*, only if Juno stays;
  - a player who flies straight through carries the rest to Branford.
- **Branford:** the pursuit notices at amber and red thresholds come from the runner, not a fixed time.
- **Copperline:** the existing `story_brook_arrest`, now a script row at this stop, with its alternative text when the ledger was declined.
- **Wall (`content/wall.ts`):** new rows for the order's signature, Ada's name and the ledger initials (a second L. C. clue). `docs/STORY_BIBLE.md` §8 and §9 are updated to match.
- **German twins** for every line, short and informal, with *du*.
- **Tests:**
  - `story.test.ts` plays both Ilse branches and checks both reach Vesta holding `frag_order` and `ada_named`;
  - Marlow's Sam lines match the order state;
  - `i18n.test.ts` passes.

**Size:** large (mostly copy). **Done when** a pilot can read the leg's story from Northfold to Copperline in the debug log.

### PR 5 · The Narrows arrival

*The five steps, in order, with the cause made visible.*

- **The relay mast prop:** a new piece in `render/monuments.ts` (or `render/site.ts`), standing off the gate's ring. It lights section by section from the bottom when the trigger fires, and the Wayward's hull light flickers once. There is no camera change. The look is restrained, matching the Jump Gate's teal.
- **Approach:**
  - the Custody blockade uses the existing checkpoint;
  - Ashgrove is the officer, with his existing hail from `captains.ts`;
  - the answers map to the existing `story_registry` ones: *Show your registry* needs `codes_passed`, *Send the forged codes* needs `codes`, plus talk and run.
- **Handshake:** a `near` trigger at 2 km from the mast, the same trigger as Sam's call in the opening (`SAM_CALL_R`). It sets `relay_broadcast` (which switches on PR 1's hunch rule) and shows *Warden key accepted*, then *Warden channel open · broadcasting on every band*. Sam's two lines follow.
- **The note:** Ada's note 1 in the document view. It waits until no hostile is in range.
- **The answer:**
  - the Patience arrives only after the note has closed;
  - the existing `story_calloway_narrows` card gains one line (*"Your grandmother's relay just told the whole Reach who you are."*);
  - its `BEATS` row becomes a script row on road journeys, so it cannot fire early at the gate.
- **The next leg:**
  - Sam's last line, then *Signal lost · Sam Okoro*;
  - a flag `sam_silent` keeps Sam's chatter quiet until the Breaker Yards;
  - the Course screen's pursuit label switches to Calloway.
- **Tests:**
  - the five steps play in order even with the blockade fight running;
  - the hunch turns `straight` only after the handshake;
  - `story_calloway_narrows` never opens before the note.
- **Shots:** the mast dark and lit, on desktop and phone.

**Size:** large. **Done when** the Narrows plays as written and the pursuit line names Calloway.

### PR 6 · The ghost at Hollis

*The first meeting with the unknown. It is never explained.*

- **New `src/sim/ghost.ts`:** a passive contact, kept outside `enemies.ts` so no weapon or AI rule touches it.
  - It holds at 4.2 km, then 3.1 km once the tank passes three quarters.
  - It matches the ship's speed, so flying at it never closes the gap.
  - Bolts pass through it with no effect.
  - It is gone at the jump.
  - It appears only at a free moment, never in a fight.
- **Render:** a faint white UNKNOWN marker on the scope and a target card (*Unknown · no transponder · not closing*), with no hull model. This is the same marker treatment as the raiders' UNKNOWN in the opening.
- **Script rows:** Sam's three lines, the notices, and the Wall entry `clue_ghost`, set even if the player jumps before Sam speaks. Vesta's *unknown contact logged* reads that flag.
- **Tests:**
  - it never closes;
  - it takes no damage;
  - it never spawns during a fight;
  - the Wall flag is set on a jump made before the radio lines play.

**Size:** small to medium.

### PR 7 · Jobs as the first thread steps

*Three jobs in fixed places, each with one new line. Their objectives, rewards and failure states stay exactly as they are.*

- **Halden's Reach, Nothing to Declare (Quiet Line, step 1):**
  - offered clear of the port, keeping the existing call rule of 3 to 4 s after arrival, never over training or a fight;
  - one thread line on the card and a *Quiet Line* chip;
  - Owen Pike's three result lines, on the radio.
- **Hollis, Follow the Cyrite Vein (Hester's crews, step 1),** with its thread line, chip and the prospector's line.
- **Branford, Break the Pirate Toll (Hester's crews, step 2),** with its thread line, chip and Hester's three result lines.
- **Data:** a `thread` field on the job rows in `content/missions.ts` (`quiet_line` or `hester`), plus one `line` per job.
- **UI:** the chip on the job card (`ui/jobline.ts`, rebuilt in #353), using the existing chip style.
- **Tests:**
  - `missions.test.ts` checks that job outcomes are unchanged byte for byte;
  - `jobs.pilot` is still green.

**Size:** small.

### PR 8 · Pilot, balance and docs

- **Pilot:** extend `tools/journey.pilot.ts` with `JOURNEY_SET=road`, ending at the Narrows. It reports:
  - minutes per stop and for the whole leg (the target is about 40 minutes);
  - Cyrite and fluid in and out;
  - pursuit days at each stop, for a pilot who keeps moving and one who lingers;
  - how many of the script's lines played, and how many carried over.
- **Balance:** tune `PURSUIT`, `HUNT_START` and the road's lanes from that report, never by eye. Write `docs/BALANCE-ROAD.md`.
- **Docs:**
  - new `docs/ROAD.md`: how a leg is data, how to add a stop, and the playback rules;
  - update `docs/DESIGN.md` (where systems live), `docs/STORY_BIBLE.md` and `docs/PLAN.md` (a "Warden's Road · Reach slice" row in the status table).
- **Preview:** share the branch preview link with `?road`, so the slice can be played on a phone.

**Size:** small to medium.

## Order and timing

```
PR 1 road data ──► PR 2 Course screen ──┐
        └────────► PR 3 beat queue ─────┼──► PR 4 copy ──────┐
                                        ├──► PR 5 Narrows ───┼──► PR 8 pilot, docs, preview
                                        ├──► PR 6 ghost ─────┤
                                        └──► PR 7 jobs ──────┘
```

PRs 1, 2 and 3 are about two days of work. PRs 4 to 7 can then run side by side in about two to three days, with PR 4 (the copy) and PR 5 (the Narrows) the longest. PR 8 needs one long pilot run. These times are estimates, not measurements.

Fastest start: begin PR 1 and PR 3 together, since they touch different files (`chart.ts`, `regions.ts` and `road.ts`, against `script.ts`, `desk.ts` and `world.ts`). PR 2 starts as soon as PR 1 has merged.

## Risks to watch

| Risk | What to do |
|---|---|
| Calloway gains too fast on a straight road | PR 1's hunch rule, then tune from the pilot in PR 8. |
| The queue stacks up, so lines play long after their moment | Each row can carry a `stale` time for flavour lines only. Story rows never expire. The pilot reports carry-overs. |
| Too much reading on the radio | Use the chapter's own limits: comms 32 words, hints 19, labels 8. `reading.test.ts` holds them. |
| The Course screen reads as a wall | The dark lanes carry their reason, and Sam's line plays after the first jump. Check the shots against the proposal's *Why only this road*. |
| Name clash: "Ashgrove" is also a system name in `NAMES` | Remove it from `NAMES`, so a three-region chart never deals a system called Ashgrove. |
| The pursuit label is wrong between "Custody" and "Calloway" | A single helper decides it from `relay_broadcast`. Test it. |
| The Narrows blockade fight overlaps the script | PR 5's test runs the five steps with the fight live. |

## Not in this slice

- The other seven legs.
- The Account and Survey threads.
- Thren meetings past the Reach.
- Recap cards at landfall. Chapter saves stay at the gates as today.
- Removing lane choice from the Marches onward.
- Sound.
- Turning `?road` on by default. That waits for a real-device playtest.
