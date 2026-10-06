# Scale-up: the long journey

How the Story journey grows from about 40 minutes (three regions, eleven
columns, one comms beat a region) to the length the owner chose on
2026-10-06: **the middle of 6 to 10 hours, about 7 hours over many
sessions.** This is the plan for review tasks 21 to 25 and nothing in it is
built yet. The Arcade is unchanged.

## What was decided

- About **85 stops across 8 regions**, about 7 hours.
- **Breathers are quiet systems**: no pursuit, no cards, heat fading, ports
  stay shops.
- **Calloway once per region**, with a **capture risk set per region**.
- **Choices reward and cost**, costs shown as chips first, never a lock-out.
- **Saving**: one automatic slot, a safety copy, export (all built), and a
  **chapter save at each region gate**, with a recap on Continue.
- **Hardcore** stays optional, with a warning.
- Out of scope here: the refit bay (the bay thread owns it).

## Where it stands today

From `docs/BALANCE-JOURNEY.md` and `sim/chart.ts`:

| | Now | Target |
|---|---|---|
| Regions | 3 (Reach, Marches, Hollows) | 8 |
| Columns flown (stops) | 11 | about 85 |
| Systems on the chart | 23 | about 200 |
| Sortie length | 3:30 to 5:00 | the same |
| Days a stop | about 2 | about 2 |
| Story beats | 6 | about 16 |
| Time flown | about 40 min | about 6 h, about 7 h with docks and the bay |

Sortie length stays where it is. The pilot reports 3:30 to 5:00 with 24 to
38% in combat, and 85 of those is 5 to 7 hours of flight. The length comes
from the number of stops, not from longer systems.

## The work, in order

### 21. A chart of eight regions

Rows in `content/regions.ts` only; `makeChart` already lays out whatever
`REGIONS` holds.

- Each region has about 10 columns, the last being its gate (8 x 10 + Cerro
  is 81 columns, and sideways lanes bring the flown count to about 85).
- `RegionDef` gains `quiet` (how many columns are breathers, one in four to
  begin with) and a `calloway` row (below). Nothing else changes in the
  type.
- Systems need names: `NAMES` has 24 and a chart of 200 needs far more. Draw
  them from a region's own list (about 30 a region) so the names say where
  you are, and keep the list in `content/systems.ts`.
- The chart panel already shows one region at a time, so it scales. Check it
  at phone size with 10 columns across a region.
- Working region order, each less human than the last (names are
  placeholders, for the owner to change): **the Reach** (Kellern, existing),
  **the Marches** (Holdfast, Drift, Gutter, existing), then four new regions
  that mix the same factions deeper in (a Guild salvage belt, a Drift deep
  with no Net, a Custody breaker yard, a Gutter free port belt), then
  **the Hollows** (Voice, Thren, existing), and a short final run to **the
  Threshold**. The new four reuse today's holders, cards and places, so
  they need rows, not new rules.

Cost: regions and names are data. Layout, lanes and places need no new code.
The pilot reports (`npm run pilot:journey`) need a longer clock than twenty
minutes a sortie to fly 85 stops; raise the pilot's total, not its per-sortie
limit.

### 22. Breathers

A breather is a system kind that the pursuit and the card director skip.

- A new `quiet` flag on the system (set from the region's `quiet` count, in
  `makeChart`), not a new `SystemKind`: it still has a holder, Cyrite and a
  port if it rolls one.
- `startSortie` passes it through `SortieDef`; the director spawns no
  pursuit and the comms picker draws no card. Heat fades faster (reuse the
  arcade's lull rate from `sim/pacing.ts`).
- The chart shows a quiet system with a plain mark and the word "Quiet" so
  the player can plan a rest. It costs nothing to enter.
- Test: a quiet sortie headless, no spawn from the pursuit and no card for
  the length of the sortie.

### 23. The clocks: the Net and Calloway

This is the part that most needs the pilot, so the plan states a target and
tunes to it.

**The Net.** The relayed figure was a Net rate of about 0.055 a day. Taken
as the base pace per column (today `NET_RATE` is 0.45) it would let the Net
be outrun from the second region on: one system netted every 18 days against
a player crossing a column in about 2. I read 0.055 as the share of the
whole chart's progress to spend per day (0.45 x 11 / 85 is about 0.058), so
the plan keeps the Net's pace per column near today's and states the
target as an outcome: **about one arrival in a netted system per region, six
to ten in a journey** (today 1.5 in a journey). Tuning knobs are the
per-region `net` multiplier already in `RegionDef`, and the Holdfast
hold. If the owner meant the literal 0.055, say so and the Net becomes an
ambient threat rather than a chase.

**Calloway.** Today she follows the trail every region and calls 2 to 3
times. The plan: **one meeting a region**, placed in the region's middle
columns, then the final meeting at the Threshold.

- `RegionDef.calloway = { meet: [from, to], risk }`: the columns she can
  call in, and the capture risk in that region (the chance a wreck with her
  in the system counts as capture, and how strong her ship is).
- Her trail resets at each gate to a short lead, so a trail of 85 does not
  make `leg()` slower and a player who lingered in region 3 does not carry
  that debt into region 4. A delay held at the gate is spent, not saved.
- The ghost echo, bluffs and the dossier (`sim/calloway.ts`) stay as they
  are; her read of your route persists through the journey.
- Risk rises with depth (low early, so a first wreck is a lesson, high at
  the Hollows), shown on the chart as a word, not a number.

### 24. Chapters and the recap

- A chapter is a region. Crossing a gate writes a **chapter record**
  (`{ region, day, stops, standing, flags in the file }`) into the journey,
  and keeps one **chapter snapshot** of the journey at the gate under a
  second key beside the safety copy. Continue offers "Resume" and, under it,
  "Start this chapter again" (not in Hardcore).
- The recap is one screen on Continue after a gap: chapter name, days and
  stops, the three things that changed (a faction, a fragment, a
  Calloway read), then Resume. Chips, not paragraphs.
- The save grows, so the safety copy and the chapter snapshot roughly triple
  the stored size (about 100 KB a copy for 200 systems); fine for
  `localStorage`, and export stays one file.

### 25. Story density and save fixtures

- **Story beats**: 6 today, about 16 for 8 regions (two a region: one that
  moves the file, one that moves a faction). Short, in the same card shape,
  each with a German twin. The four file fragments become eight, so the
  endings read the whole journey. The act turn (`CHOICE_REGION`) moves to
  the seventh region's gate.
- **A save from before the scale-up** has a three-region chart. The chart
  stays as saved (its systems, lanes and gates are in the save), so the
  migration (`VERSION` 7 to 8, in `meta/save.ts`) stamps it with a
  `regionSet: 'three'` and `regionsOf(chart)` returns the old table for it,
  so its names, gates and `CHOICE_REGION` do not shift. New journeys are
  stamped `'eight'`.
- **Fixtures**: one saved journey per `VERSION`, kept in `tests/fixtures/`,
  loaded by a test that migrates each and checks it plays a sortie. A
  fixture for version 7 goes in before the bump, so the bump cannot break
  it unseen.

## Order and size

1. **Fixtures for version 7** and `regionSet` (small, safe, unlocks the rest).
2. **Breathers** (small; testable alone on today's three regions).
3. **Eight regions with names** (data, the biggest diff).
4. **Clocks** (Net and Calloway, tuned with the pilot; updates
   `docs/BALANCE-JOURNEY.md`).
5. **Chapters and the recap.**
6. **Story beats**, a region at a time, as the regions land.

Each is a PR of its own. Balance changes come from pilot reports, and the
long pilot gets its own report, `docs/BALANCE-LONG.md`.

## Risks

- **Repetition.** 85 stops at 4 minutes can feel the same without the
  breathers and the region identities; the pilot cannot measure that. Plan a
  playtest of region 3 before writing regions 4 to 8.
- **Dead time in docks and the bay.** The 7 hours assumes the bay and ports
  take about a fifth of the time. Measure it, not the sorties.
- **Mobile storage.** Safari can clear `localStorage` for a site left
  alone; the safety copy, export and the persistent-storage request are
  already in, and the recap should mention export once.
