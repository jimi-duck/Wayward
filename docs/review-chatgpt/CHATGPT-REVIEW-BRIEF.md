# WAYWARD: Review brief for ChatGPT

*26 October 2026. Written by Claude for Jimi Duck (owner and narrative director). Main at `45ff150`.*

You have read access to the GitHub repo `jimi-duck/Wayward`. This brief tells you what the project is, what is already decided, what to review and what shape of feedback is useful. Read it first, then the files it points to. You do not need to run the game.

## 1. Your job

Review the project's work so far, **with the most attention on the new storyline: the Authored Road**. The work so far was written almost entirely by Claude (Anthropic's model) across many sessions. Jimi wants a second, independent pair of eyes. Be direct. Praise is only useful where it says what to keep.

You are a reviewer and a collaborator. You may propose rewrites of lines, scenes and structure. You may not change the locked decisions in section 4; if one looks wrong to you, say so as a question for Jimi, and keep reviewing on the assumption that it stands.

## 2. The project in one paragraph

WAYWARD is a 3D space-survival roguelite for desktop and phone browsers (TypeScript, Three.js, Vite). The player is **Juno Aster**, a freight hauler who flies a stolen ship, the **Wayward**, alone. A hidden archive left by her grandmother **Ada Aster**, a Lane Warden, explains the **Severance**: the closing of the old jump lanes seventy years ago, which the Continuance (an authoritarian state fused with corporate extraction) recorded as an accident. The Thren are a real danger that complicates the regime without excusing it. **Governor Idris Calloway** (Offices of Peace) hunts the ship. **Sam Okoro**, a friend, helps by radio. A Story journey ends in one of six endings (Broadcast, Unite, Sell, Trade, Seal, Vanish). There is also an Arcade mode.

Start with `CLAUDE.md` (the project rules), then `docs/VISION.md`, `docs/STORY_BIBLE.md` and `docs/PLAN.md`.

## 3. The new storyline: the Authored Road

**The problem it answers.** Jimi felt the opening (Cerro) was strong and the rest of the story weak and unthought-out. The cause is structural: the jump chart deals a different route every run, so story beats are scattered across whatever systems the player lands in. People appear once on a pop-up and vanish; gates are places you pass through.

**The answer, in short.** Ada's archive chooses the route. The player follows one fixed, linear road, **the Warden's Road**, from Cerro to the Threshold: eight legs (one per region), eight stops per leg (64 stops). The free lane choice on the jump chart is replaced by a **Course screen**. Each gate becomes a five-step arrival set-piece (approach, handshake, Ada's note, someone answers, next leg). The 25 existing jobs are grouped into four running **threads** (Quiet Line, Hester's Crews, The Survey, The Account) that collide and pay off at fixed points. The engine is **"the truth is a beacon"**: every relay that opens Ada's road also tells the Offices who carries the archive and where she goes next. The unknown (the Thren) is met once per leg, shown and never explained until the Hollows.

**Where it lives (read in this order):**

| What | Where | Status |
|---|---|---|
| Proposal: "WAYWARD: An Authored Road" | [APPENDIX-A](APPENDIX-A-authored-road-proposal.md) (copy of a Claude Doc, https://claude.ai/artifact/53wkA3mavi8fffdwcFtwke) | Approved direction. Not built beyond the first leg. |
| First leg, every line in play order: "The Reach: Chapter Script" | [APPENDIX-B](APPENDIX-B-reach-chapter-script.md) (copy of a Claude Doc, https://claude.ai/artifact/C5aebmPtWGvoFgGoy3abbc) | Provisional copy, English only. Being built now. |
| Build plan for the first leg: eight PRs behind `?road` | [APPENDIX-C](APPENDIX-C-reach-build-plan.md) | In progress. PR 1 is merged (#371). |
| Story canon | `docs/STORY_BIBLE.md` | Authoritative for existing canon. |
| Owner's earlier story brief | `docs/CLAUDE_STORY_REWRITE_BRIEF.md` | Authoritative narrative direction. |
| Opening (Cerro) | `docs/ONBOARDING.md`, `docs/POSTJUMP.md`, `docs/QA-CHAPTER-1.md` | Built, merged. |
| Story balance | `docs/BALANCE-STORY-REWRITE.md`, `docs/BALANCE-ENDINGS.md`, `docs/BALANCE-LONG.md` | Pilot numbers. |

The three appendices sit beside this file. They are copies of material that exists outside the repo (the two Claude Docs) or only in a shared project folder (the build plan). If a copy and the repo disagree about *existing* canon, the repo wins. If they disagree about *the Authored Road*, the appendices win.

**Code that already exists for the road (merged in #371):** `src/content/road.ts` (the Reach's eight stops as data), `src/content/regions.ts` (a `road` region set), `src/sim/chart.ts`, `src/sim/situations.ts`, `src/sim/calloway.ts` (the hunch rule), `src/sim/journey.ts` (save v21), `tests/road.test.ts`. Everything is behind the `?road` URL flag. The Course screen, the story-beat queue (`src/sim/script.ts`), the copy, the Narrows, the ghost and the job threads are not yet built; check the repo for what has landed since this brief was written.

**Where the story is in code:** cards `src/content/cards.ts`, `src/content/story.ts`, `src/content/situationCards.ts`; characters `src/content/captains.ts`, `src/content/calloway.ts`; endings `src/content/endings.ts`; the Wall of clues `src/content/wall.ts`; jobs `src/content/missions.ts`, `src/content/situations.ts`; German text `src/i18n/de/`.

## 4. Locked decisions (do not contradict)

These were decided by Jimi. Where they are marked "provisional", the structure is fixed but the wording is open.

**Story and canon**
- Juno flies the Wayward **alone**. Allies are on the radio, never aboard.
- Existing canon and existing job outcomes are fixed: the opening (Contract 08-441 through the breach, Sam's code, the rename and the archive), every existing character and beat, all 25 jobs and their goals, the eight fragments and the Wall, Calloway's hunt, the Net, the economy, upgrades, the six endings, Arcade and the three difficulties.
- Core truth, the Continuance as a state-corporate regime, and the Thren as a real danger that does not absolve it: all fixed (see the rewrite brief).
- **The Civic Score is removed from the game.** Never reintroduce its calculations, UI or penalties.
- The player-facing name is **Jump Gate**. The company's debt after the breach is **80 CR** (25 + 35 + 20).
- The registry rename turns the hull from grey to ochre-yellow; the flag is the livery.

**The Authored Road (decided 2026-10-25 and 26)**
- Strictly linear. No detours, no spurs. 64 stops, 8 per leg. **Every stop must earn its existence** (a story beat, a meaningful job, a consequence, a resource decision, a person, or travel pressure that matters).
- Old Story saves are ignored; this is a breaking change in principle (the build still keeps v20 saves loading).
- Noor Haddad (the Governor's aide) as the Survey's buyer: approved.
- The Course screen shows three layers: leg goal, next stop, the stop after. It first opens at the jump out of the audit dock system, before Northfold.
- Pursuit is **always counted in days** (a leg starts at 2; amber at 1, red at 0.5, arrival at 0), never in jumps. Vesta shows no pursuit and no timers.
- Story beats **queue and wait for a free moment**; they never play over a fight and never drop. Clues go into the Wall the moment they are earned, even if the radio line has not played.
- Ilse Marrow hands over the signed closing order at Halden's Reach as an on-screen document, signed **L. C.** If Juno cuts her off, a recording carries it to Vesta. Juno has always carried the Aster name; her family were only told Ada was "lost in service".
- The Narrows handshake broadcasts. That is how Calloway (already hunting through the existing pursuit) learns Juno carries Ada's archive and which route she must take. Afterwards the hunt stops losing time to guessing.
- The Thren/unknown is met once on every leg: show, never explain until the Hollows; the tank is the tell; one rising meeting per leg.
- Build the Reach (Halden's Reach to the Narrows) first, playtest it, then write the other legs.

**Provisional (structure fixed, specifics open to critique)**
- Ashgrove at checkpoints, Owen Pike as the Quiet Line's dispatcher, Quill joining the Quiet Line, Hester as a person, Draper running *Accounts*, the wording of Ada's notes, the relay at Halden's Reach.

**Design and writing rules**
- **`src/sim` never imports Three.js.** The simulation is plain data in fixed 1/60 s steps, so tests and scripted pilots play it headless.
- Decisions pause the world (`World.phase`). Pop-ups always pause; every answer must be reachable on a 568×320 phone screen.
- Choices show costs as chips before choosing and **never lock the player out**.
- Data over code: cards, upgrades, captains, story beats and endings are rows in `src/content/`.
- Playable without reading: goals sit on screen; choices read as a verb plus chips.
- Every player-visible line goes through `t()` and has a **German twin** in `src/i18n/de/` (short, informal, *du*). Limits: comms lines 32 words, hints 19, labels 8 (`tests/reading.test.ts`).
- Writing is short and plain, in British English. No sound work (audio is off).
- Look: brand v1.1 (steel blue is the player, teal is information, dull gold is caution only, red is threat and nothing else). Pop-ups are "Neon Glass" (`docs/DESIGN-GUIDELINES.md`).
- Balance comes from the pilots (`npm run pilot*`), not by eye.
- Flight-path rule: in-flight alerts never sit at the centre, ahead of the ship or top centre.

## 5. What to review

Do them in this order. The first is the main one.

### 5.1 The Authored Road (main focus)

Review the **idea**, the **first leg's script** and the **plan to build it**.

1. **Structure.** Does a fixed road solve the problem (a weak, scattered story after the opening) without making the game feel on rails? Is "the truth is a beacon" strong enough to carry eight legs? Does each leg's "one new understanding" (Appendix A, table "What the player understands, leg by leg") escalate properly?
2. **"Why only this road".** Do the three in-game reasons (Netted lanes, Uncharted beyond, the file only opens on the road) convince, or will players still feel blocked?
3. **The Reach script (Appendix B).** Read it as a player would, stop by stop. Check: pacing (about 40 minutes over eight stops), whether each stop earns its place, whether the emotional turns land (Ilse naming Ada, the ledger, Brook's arrest, the handshake, Ada's note, Calloway's arrival, Sam's signal lost), the dialogue (voice per character, length, repetition, anything that explains what should be shown), and the unknown/ghost at Hollis.
4. **Choices.** Do the choices in the Reach mean something, and do they carry forward ("What carries into the Marches")? Find any that are fake, or that quietly punish the player.
5. **The other seven legs (Appendix A).** These are outlines only. Where are they thinnest? Which arrival set-pieces are weakest? Do the four job threads actually collide, or run in parallel?
6. **Canon.** Check against `docs/STORY_BIBLE.md` and `src/content/`. Flag contradictions: characters, dates, who knows what and when, flag names, the Civic Score (must not return). Flag any "provisional" detail that clashes with existing code or content.
7. **Build plan (Appendix C).** Are the eight PRs well cut and in the right order? What is missing or risky? Check the claims in its "What the code has today" table against the repo (for instance the `hunchOf` / `straight` catch in `src/sim/calloway.ts`, and the radio lines in `src/sim/world.ts`).

### 5.2 The rest of the story already built

`src/content/story.ts` and `cards.ts` (region beats, client and ally follow-ups, Calloway's tollgate, Echo or Sable, the implant, the six endings in `endings.ts`), and the opening. Is it coherent with itself and with the new road? Which existing beats will feel orphaned once the route is fixed?

### 5.3 Code and tests (lighter pass)

- Does `src/sim` stay free of Three.js? Are new content rows data, not code?
- Are the tests meaningful rather than decorative (`tests/road.test.ts`, `tests/story.test.ts`, `tests/chapter1*.test.ts`)?
- Save versioning: `VERSION` in `src/sim/journey.ts` and migrations in `src/meta/save.ts`.
- i18n: does every new line have a German twin, and does the German read like a person talking?

### 5.4 Game design and balance (lighter pass)

`docs/ECONOMY.md`, `docs/BALANCE*.md`, `docs/PLAN.md`. Do the numbers plausibly support a ~7 hour journey? What can the pilots not tell us?

### Out of scope

- Visual art, ship models and UI styling (unless a story beat depends on it).
- Sound.
- Rewriting the opening. It is strong and finished.
- Anything on the locked list in section 4.

## 6. What the project has not measured

Be honest in your review about these gaps. The project has no real playtest of any of this.

- Nothing in the Story mode has been playtested by a human on a real device. The scripted pilots stand in, and they cannot judge feel.
- The ~7 hour journey length and per-stop timings (about 1.5 minutes of non-flight time per stop) are estimates.
- The cloud environment renders with software WebGL only, so there is no frame-rate or GPU data.
- `JOURNEY_SET=eight npm run pilot:journey` can run for 2+ hours and has not given a confirmed result recently.

## 7. The shape of feedback wanted

Send back **one Markdown document**, in this order:

1. **Verdict (5 lines max).** Is the Authored Road the right direction? What is the single biggest risk?
2. **Top 10 findings**, ranked. Each one:
   - **Where:** file path and heading or line (for Appendices, quote the heading and a few words).
   - **What:** one or two sentences.
   - **Why it matters:** the effect on the player or on the build.
   - **Suggested fix:** concrete, ideally with replacement text or a structural change.
   - **Confidence:** high / medium / low.
3. **Canon and consistency problems**: a table of `claim → conflicting source → which should win`.
4. **Line notes on the Reach script**: a table of `stop → line → problem → rewrite`. Rewrites must respect the word limits (comms 32 words, hints 19, labels 8). Keep them in English; Claude will do the German.
5. **Missing or weak pieces**: what the road needs that nobody has written yet.
6. **Questions for Jimi**: only real decisions, each with a recommended answer. Mark anything that touches section 4.
7. **What to keep**: the things that work and must not be "improved" away.

Rules for the feedback:
- Separate **fact** (you checked it in the repo; cite the path) from **opinion**.
- Do not restate what the brief already says. Do not summarise the whole project back.
- Say plainly when you could not check something.
- If you propose adding a character, location or mechanic, say what it costs (new art, new German lines, new code) and what existing thing could do the job instead. The project's rule is that an existing character does the job wherever one can.
- Keep lines short and plain, in British English.

## 8. How to work with the repo

- Read-only is enough. If you open PRs, do not push to `main`; Cloudflare deploys `main`. Open a branch and a pull request, and keep it small.
- Before any code change: `npm run check` (types and tests) and `npm run build` must pass. CI runs both on every PR.
- A running `?road` build is being written in a separate Claude thread ("Build The Reach chapter"). **Do not edit** `src/content/road.ts`, `src/sim/script.ts`, `src/ui/course.ts`, `src/content/script/` or the PRs in flight. Send story changes as review notes instead.
- Useful files: `docs/DESIGN.md` (where each system lives, how to add things), `docs/ARCHITECTURE.md`, `docs/COPY.md` (writing rules), `docs/REVIEW.md` (the `?dev` review world).
- The owner is in Germany (Europe/Berlin).

## 9. Glossary

| Term | Meaning |
|---|---|
| Juno Aster | The player character. |
| Ada Aster | Juno's grandmother, a Lane Warden; wrote the archive. |
| Wayward | The stolen hauler Juno flies. |
| The archive / the file | Ada's hidden dead-man routine in the ship's database. |
| Severance | The closing of the old jump lanes, recorded as an accident. |
| Continuance | The ruling regime. Offices of Peace is its enforcement arm. |
| Calloway | Governor Idris Calloway; the hunter. Flies the *Patience*. |
| Sam Okoro | Yard foreman at Cerro; Juno's friend on the radio. |
| The Net / Custody | The enforcement net over the lanes; Custody is its pursuit. |
| Thren | The unknown. |
| Wall | The evidence board; clues are rows read from flags. |
| Region / leg | One of eight regions on the road; the Reach is the first. |
| Stop | One system on the chart. |
| Beat / card | A story event / a pause-the-world pop-up with answers. |
| Job | An optional contract; refusable for free; 25 exist. |
| Cyrite | Money. A refinery turns it into jump fluid. |
| CR | Credits owed to the company (the 80 CR debt). |
| Course screen | The new screen that replaces the lane chart on the road. |
| `?road` | The URL flag that turns the Authored Road on. |
