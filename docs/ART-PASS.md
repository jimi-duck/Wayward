# Art pass: the same UI, but used

A short plan for one pass over the look (2026-10-06). The brief: keep brand
v1.1 and the console pass, and make the Wayward read as an ore hauler that has
been repaired, modified and stolen, not a clean game menu. Target: 85% what is
there, 15% history. *Used*, not *dirty*.

## What is already there

The console pass (PLAN.md, R) did most of the structure: the state word, the
ship lit by tab, thresholds, the install felt, a reason on each suggestion,
the build profile, hardware-style links, a voice line, and a first sample of
wear on the pause card and the bay. The fonts are already the three layers the
brief asks for (Barlow Condensed for names, Barlow Semi Condensed for
sentences, Share Tech Mono for data). So this pass adds history, not parts.

## What still feels too clean

- The wordmark is a flat heavy sans with no mark of the ship's papers.
- Modules have no origin. Everything fitted looks factory-made.
- The tabs carry one dot; the ship's state is not readable from the list.
- After an install the numbers bump, but nothing says *from what to what*.
- The pop-up kickers (`Alarm`, `Contact`, `Jump`) read as a game, not as the
  ship's systems.
- The stolen ship is not in the interface at all, outside the story.
- Wear sits on two panels; the rest of the console is pristine.

## Typography: compared, kept

| Direction | For | Against |
|---|---|---|
| **Keep Barlow trio** | Already stencil-plate caps, tested on phones, three roles, no new files | Little difference between layers |
| A stencil display (Saira Stencil, Big Shoulders Stencil) | Reads as crate marking | Cuts hurt below 14px; adds a file; a theme-park risk on every title |
| A terminal pair (IBM Plex Sans Condensed and Mono) | Honest bureaucracy | A second family for little gain over Share Tech Mono |

**Kept.** The stencil look goes on the wordmark and the designation only, as a
mask on the existing face (no new file). The Continuance layer is told apart by
mono caps with wide tracking, not a new family: the ship's own lines stay
Barlow, Continuance lines (`Continuance signal`, `Registry`) are Share Tech
Mono.

## The changes

| Change | Why it belongs | How subtle | How |
|---|---|---|---|
| **Stamps** on modules: Salvaged, Field mod, Non-OEM, Aftermarket, Repaired, Unknown origin, Obedience spec. About a quarter of the modules, never all | A rebuilt hauler has parts of every kind | Small mono stamp in the inspector and on the suggestion; none on the web | `content/papers.ts` (data), shown in `ui/bay.ts` |
| **Tab marks as ship state**: ● stable, ◐ upgrade ready, ! damaged, ▲ overloaded, — offline, with the word on the tab's header | The list reads as a systems console | A glyph in the slot the dot used | `sim/papers.ts` `tabMark`, `ui/bay.ts` tabs |
| **Before → after, ticked**: after a fit each changed rating shows `was 5/8`, and the figure ticks to its new value in steps | "What did I just do to my ship?" | 600 ms, stepped, off under reduced motion | `ui/tick.ts`, `budgetBar` |
| **Ship's papers**: a line along the bay's web (registry, operator, factory against current profile); the same registry line on the pause card | The stolen ship exists inside the interface | Mono microtext at half strength; hidden on phones | `sim/papers.ts` `papers`, `index.html`, `ui/briefing.ts` |
| **Module log**: after a fit the voice line says `Module compatibility: accepted`, or `Component: not factory spec` for a stamped one, then returns | The ship answers the player | One line, three seconds | `ui/bay.ts` |
| **Pop-up kickers in the ship's voice**: `Ship system`, `Warning`, `Continuance signal`; a ruled header line; Continuance in mono | Notices come from onboard systems | Kicker words and one hairline | `ui/hud.ts`, CSS |
| **Wear where hands go**: a repair patch and scuffs on the inspector, tab list, ratings and pause card; the HUD's status block, the comms panel, the port and the pause card too, as Jimi asked; no scanline on the HUD | Wear sits on what is touched | Two or three marks per panel, 6 to 14% ink | `.wear` classes in CSS |
| **Wordmark**: a stencil seam through the letters, one repainted half, the paint a little faded to the right, `OB-7731-A` under it | The name painted on a hull, then maintained | Legible at 40px; no new asset | CSS mask on `.lk-w`, `index.html` |

Left alone: colours (amber is the player, teal information, red threat), the
bay's structure (see the open question below), the 3D ship (its wear shader
and per-tab lights stay), the HUD, performance (CSS only; no new full-screen
pass, no new files).

## Where it meets the open PRs

- **#60 (tab icons)** is going to `main` as #61. This branch is on `main` without it, so the tab glyphs in the screenshots are today's; the new icons drop into the same slot and need no change here.
- **#59 (step 1, rings on the ship)** edits `bay.ts` `render`/`show`, the
  camera rig and the Suggested CSS. This pass touches `tabs()`,
  `inspector()`, `budgetBar()` and new CSS blocks only, so the two should merge
  with small conflicts in `bay.ts` at most.

## Open question

The brief keeps all eight categories; the bay redesign spec folds them into
four views. Until that is decided the structure is untouched. Everything here
(tab marks, stamps, wear) works with either set.
