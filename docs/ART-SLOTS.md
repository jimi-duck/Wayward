# Artwork slots

Where pictures made outside the game (by an image generator) show, what each one
needs to be briefed, and how a finished file gets into the game. The hook is
built: drop a file in `src/art/`, rebuild, and it shows. A slot with no file looks
exactly as it does without art.

## The one file to give the image generator

[art/CHATGPT-BRIEF.md](art/CHATGPT-BRIEF.md) is self-contained: the game and its
story, the look (matched to the title art, attached from `art/reference/`), each
faction's look, technical rules, the delivery format, a check-list, and all 109
pictures with their prompts in batches. Attach it to a chat with the two reference
pictures. It tells the generator to make **all of them in one run, without
stopping for approval**, and to hand back **one PDF** (`wayward-art-all.pdf`): a
contact sheet, then one page per picture carrying the text line
`FILE: captains/vance`. If a long run stops, say "continue". `npm run art:prep --
<folder>` cuts each picture out by that line, crops, sizes and puts it into
`src/art/`. A ZIP of images named `captains__vance.png` works as well. The brief
is written by `npm run art:brief`. For a free account with a daily limit,
[art/STARTER-15.md](art/STARTER-15.md) is the same look in fifteen single-picture
messages.

## The short version

- **109 pictures in nine slots.** About 100 are wanted, 8 are optional extras.
  Each has a ready prompt in [art/briefs.md](art/briefs.md), written from the game's
  own rows, so a captain's face, a card's words or an ending's epilogue are already
  in it.
- **Start with the people and the marks.** Eight captains, Calloway, eighteen
  named contacts and ten emblems fill the comms call, which is the screen the
  player reads most. They are cheap to judge and they carry the story.
- **Pictures go where the player pauses**, never in flight: the comms call, the
  port, the Threshold, the Archive. The HUD stays as quiet as it is (brand v1.1:
  no ornate icons, no noise).
- **Each picture is a file named after a game id**, for example
  `src/art/captains/vance.webp`. No code change per picture.

## The slots

| Slot | Folder | Count | Size | Where it shows | Why it helps | Status |
|---|---|---|---|---|---|---|
| Captain portraits | `captains/` | 9 (+8 scarred) | 640×800 | comms call, top left | Eight named hunters and Calloway become people you remember and meet again. The optional `<id>-scarred` shows the face of a captain you have already beaten | built |
| Contact portraits | `contacts/` | 18 | 640×800 | comms call, top left | The named people in story beats and cards (Okoro, Mirren, Draper, Saffi, Val…) stop being a line of text | built |
| Emblems | `emblems/` | 10 | 256×256 | comms call, in place of the plain diamond | A call sign for each faction: who is calling, at a glance, in the panel's own colour (red when it is an alert) | built |
| Ship profiles | `ships/` | 15 | 960×480 | comms call, above the strength bars | "Call signs for the ships": the player sees the hull a Custody blockade or a Gutter raid has, before choosing. On phones it stands in for the bars that are hidden there | built |
| Port banners | `places/` | 7 | 1280×320 | port panel, above the title | Each holder's port has its own face (Kellern, Frontier, Guild, Gutter, Holdfast, free dock, and one under Continuance order) | built |
| Endings | `endings/` | 6 | 1280×720 | the Threshold's epilogue, and the Archive beside a reached ending | The payoff of a 7 hour journey gets a picture | built |
| Sightings | `sightings/` | 20 | 800×600 | Archive, beside a sighting once seen | Found photographs of the Voice and the Thren: a collection to complete, never shown before it is found | built |
| The file | `file/` | 8 | 800×600 | Archive, beside a piece of the Severance once found | Each piece is an object you can picture | built |
| Regions | `regions/` | 8 | 1280×480 | not drawn yet | A banner for each region's chart header and gate card | slot and prompts ready, no screen yet |

Not built, on purpose or for later:

- **Module and upgrade icons.** Brand v1.1 says no ornate
  icons; the bay already has its icon sheets. Not a good use of generated art.
- **The player, "Juno".** A portrait for the pause card or the debrief would help
  the story, but the player is never shown today; decide first whether they have
  a face. The slot is one line in `content/art.ts`.
- **Title art per region.** The title's painted background is the user's own art
  and stays.
- **Hull liveries** (call signs painted on the in-flight ships). That is a 3D
  texture job in `render/`, not a picture slot.
- **Chapter cards** at region gates, using the `regions/` banners. Waits on the
  region UI settling (the chart and navigation are being reworked).

## What a prompt needs

Every brief is the same five parts, so a set comes out of one world:

1. **Style block.** One paragraph, the same in every prompt: brand v1.1 in
   words, matched to the title art (cinematic and detailed, industrial, "used, not
   dirty", worn paint and stencils; muted and dark with the Wayward's yellow-orange
   as the warm anchor; teal for information only, red for threat only, dull gold
   for caution only; no neon). It is in `STYLE` in `tools/art/briefs.ts`.
2. **Subject.** From the game's rows: name, rank, ship and faction for a captain;
   `from`, role and the card's own words for a contact; the variant's label, role,
   size and tactic for a ship; the ending's pitch and file line; a sighting's
   line and theory. A captain's `face` row (skin, hair, eyes, mark, jaw) is
   turned into words, so the picture matches the drawn face it replaces.
3. **Faction look.** One line per faction, from brand v1.1 section 16: Custody is
   stamped and regulated, the Gutter is scrap plate in coppery orange, the
   Frontier is mismatched and hand-painted, the Thren are "what am I looking
   at?". In `tools/art/looks.ts`.
4. **Hand notes.** What the data does not say: age, build, clothes, the room
   behind them, the silhouette of a hull. Written once, in `tools/art/looks.ts`.
5. **Framing and output.** Crop, where the subject sits, what must still read
   at 48 or 120 pixels, background, aspect ratio.

An example (a captain, shortened; the full text is in the briefs):

```text
Style: industrial cyberpunk frontier, "used, not dirty"… [the style block]

Subject: Captain Isla Vance, who flies the CCV Reprimand for the Continuance's
Custody: institutional, strict, black, white and red… Personality: Duelist. Late
forties, straight-backed, a duelist's calm… Face: tan skin, short cropped hair
(white-grey), a square jaw.
Mood: how they sound when they first open a channel: "Wayward, Captain Vance of
the Reprimand. I don't shoot people in the back…"

Framing: head and shoulders portrait, 4:5 vertical, the face filling about two
thirds of the frame so it still reads when shown 48 pixels wide…
Avoid: text, lettering, watermark, logo, lens flare, neon pink, glossy chrome…
```

`npm run art:brief` rewrites `docs/art/briefs.md` (to read and copy) and
`docs/art/briefs.json` (the same data for a script, each entry with `slot`, `id`,
`file`, `prompt`, `avoid`, `size`, `background`, `where`, `facts`). Run it again
after a captain, card, ending or ship is added.

## Keeping a set looking like one set

Generators drift between prompts. Things that help, in order:

1. **Make a style anchor first.** One captain, one ship and one port that you
   like. Feed that picture back as a style or image reference for the rest of the
   set, and use the same seed or model for the whole slot.
2. **One session per slot.** All captains together, all emblems together, and so
   on, with the same settings.
3. **Make three or four of each and pick.** Faces especially.
4. **Judge at the real size.** Portraits at 48 px wide, ships at 120 px, emblems
   at 24 px. If it does not read, the prompt needs a plainer, bolder subject.
5. **Check the fit in the game** with screenshots of the comms call, port or
   Archive at desktop and phone size: cropping, contrast and colour against the
   brand rules.

## How the output should be delivered

| Slot | Format in the repo | Background | Notes |
|---|---|---|---|
| Portraits, places, endings, sightings, file, regions | `.webp` (quality ~82), `.avif`, `.png` or `.jpg` also load | the whole picture | Aim under about 120 KB each |
| Emblems | `.webp` with transparency | white mark on pure black out of the generator; the prep step turns the black into transparency | The game tints it: steel, teal, or red in an alert. Plain silhouette, no shading |
| Ships | `.webp` | pure black (or transparent) | The game blends it on the panel (screen), so black disappears and no cut-out is needed |

- **Names.** `src/art/<folder>/<id>.<ext>`, the ids in the briefs. If two formats
  of one picture exist, `.webp` wins over `.avif`, `.png`, `.jpg`.
- **Sizes.** Twice what is drawn, so sharp screens and phones are covered. The
  prep step crops from the middle to the slot's shape and resizes.
- **The prep step.** Put the raw files in a folder named like the slot (for
  example `inbox/captains/vance.png`, or flat as `captains__vance.png`) and run
  `npm run art:prep -- inbox`. It writes the finished `.webp` into `src/art/`.
  It needs Pillow (`python3 -m pip install pillow`).
- **No text in pictures.** Every word the player reads goes through `t()` and has
  a German twin; a picture with lettering in it would not. The prompts ask for
  none, and ask for illegible writing on the file pieces.
- **Licence.** Keep a note of the generator and its terms next to the files
  (for example `src/art/SOURCES.md`) before the game ships; none exists yet.
- **Size in the build.** Pictures load only when a screen asks for one, as
  separate hashed files, so a full set does not slow the first load.
  100 pictures at ~100 KB is about 10 MB on the host.

## How the game uses them

- `ui/art.ts` lists `src/art` at build time and hands out urls: `artUrl(slot, id)`
  and `artImg(slot, id)` (decorative, empty alt). Nothing is fetched until a
  screen asks, and a missing picture returns null.
- **Comms call** (`ui/comms.ts`, `artOf`): a portrait if the card is a captain
  (`captain:<id>`, or `<id>-scarred` for one you have scarred), Calloway, or a
  card listed in `CONTACTS`; else the drawn face; else the caller's emblem,
  tinted by `--cc`, which already goes red on an alert; else the plain sigil. A
  card with ships shows its first hull above the bars. The arcade's capital hail
  shows its faction's emblem.
- **Port** (`ui/port.ts`): the banner for who holds the port (`placeOfPort`),
  or the netted one under Continuance order.
- **The Threshold and the Archive** (`ui/ending.ts`, `ui/panels.ts`): an ending
  above its epilogue; sightings, file pieces and reached endings beside their
  entries in the Archive, and only once found, so nothing is spoilt.
- `tests/art.test.ts` fails on a file in `src/art` that is in no slot folder, has
  an id the game does not use, or a format the loader skips, and checks every id
  has a brief of the right size.

## Adding a slot, or a picture for a new card

- **A new captain, ending, ship variant, sighting or file piece** gets its slot id
  from its row; run `npm run art:brief`, then write its hand note in
  `tools/art/looks.ts` (the test fails until the brief exists).
- **A new named contact**: add the card id to `CONTACTS` in `content/art.ts` (a
  value shares another card's portrait), a line in `CONTACT_LOOK`.
- **A new slot**: a row in `SLOTS`, ids in `tools/art/ids.ts`, a brief function in
  `tools/art/briefs.ts`, and the screen that draws it, with `artImg` and a
  fallback.

## The continuation set

Three more slots are ready, with prompts, for a second run
([CONTINUE-BRIEF.md](art/CONTINUE-BRIEF.md): 65 pictures, written by
`npm run art:brief` like the first). No screen draws them yet; the hook and
`art:prep` already take them.

| Slot | Folder | Count | Size | For |
| --- | --- | --- | --- | --- |
| Fleet | `fleet/` | 27 | 960×480 on black | the nine capital ships (`capital-<captain>`), eight neutral hulls (tanker, hauler, courier, gunship, barge, salvager, drifter, ferry), the Wayward as fitted (`wayward-stock`, `-guns`, `-rig`, `-signals`), and six hulls in their real owner's colours (`<hull>-<caller>`, such as `freighter-miners`), which the comms call already uses in place of the plain hull |
| Jobs | `jobs/` | 25 | 1280×720 | one scene per job card (`sc_*`), drawn square-cropped on the job offer card. `sc_cache` (The Drift Cache) is still to make; its prompt is in `docs/art/briefs.md`, until then the card shows the caller's emblem |
| Phenomena | `phenomena/` | 14 | 800×600 | the places on the chart (`veil` … `carrier`) |

Left out on purpose, listed at the end of the brief: wrecks of each hull, damage
stages of the Wayward, faction liveries, stations, elites and debrief scenes.

## Where the set stands

All 109 first-set slots have a picture, plus the 65 continuation ones (8.4 MB), cut from ChatGPT contact sheets and
installed through `art:prep`.

- The first 64 were cut by hand: portraits 4:5 around the face, ships fitted
  whole and large on black, emblems centred.
- The full export (2026-10-11) added the other 45: Ashgrove, Pell, Chorus, Loom,
  the eight `-scarred` portraits, three ports, two endings, 16 sightings, four
  file pieces and all eight regions. Where it repeated a picture already in, the
  existing file stayed, because its ships and emblems are larger and sharper.
- Provisional: the `-scarred` portraits are the base portraits with light damage
  marks, and a few sightings and endings stand in for the event rather than
  showing it. No screen draws the regions yet.
- The continuation export (2026-10-15) added 65 more: 27 fleet hulls, 24 job scenes
  and 14 phenomena (8.4 MB in all). Fleet hulls go through `art:prep` with
  contain-fit on black (no cut), after a small trim of the frame line the sheet
  left at the edge. Only the comms owner hulls draw fleet pictures today; jobs,
  phenomena and the capital and Wayward pictures wait for a screen.
- The third run (2026-10-23) added 28 more (11 MB in all): four wrecks, three Wayward
  damage stages and three elite hulls (all in `fleet/`), eight gate stations
  (`gates/`), four planets (`planets/`), two debrief scenes (`debrief/`), and
  replacements for `drifter`, `ferry`, `gunship` and `sc_payroll`. Its brief is
  `docs/art/NEXT-BRIEF.md`. No screen draws the new ones yet.
- The redo run (2026-10-24, `docs/art/REDO-BRIEF.md`) replaced 29 weaker ones: 17 job
  scenes (now 1920×1088), five phenomena, three freighters and lancers, and the four
  Wayward fits. Still weak: `wayward-stock` and `wayward-guns` look alike
  (brief: `docs/art/WAYWARD-FITS-BRIEF.md`). The art briefs all start by telling the
  artist to check the pictures already in `src/art/` and match them.
- The ten refit bay tab banners (2026-10-24, `docs/art/UPGRADES-ART-BRIEF.md`, batch B) are
  installed in `src/art/baybanners/`, 1280×720. The refit bay draws the open tab's banner dim and soft behind the ship (`.bay-back`, `ui/bay.ts` `backdrop`); a tab with no file shows none. Arcade keeps its tabs locked, so it only shows Suggested. The 29 inspector pictures (2026-10-24, batch B of `docs/art/UPGRADES-FINISH-BRIEF.md`) are in `src/art/specs/`, 1280×720, and show above the name in the bay's inspector on desktop. The 93 bay icons (batch A: the 77 redrawn and the 16 yard modules that had none) are in `public/icons/node/`, 128 px masks cut by `tools/cut-bay-icon-sheets.py` from the nine 4×3 sheets (the older `tools/cut-bay-icons.py` cut the 96 px v2 sheet).
- Which of these should be redone: `/mnt/project-files/art-brief/REDO-AND-MISSING.md`.
- The sheets that went unused are in `/mnt/project-files/art-brief/raw/`.

A better picture for any slot just overwrites its file. Whether the set reads on
a real phone is for a device look.
