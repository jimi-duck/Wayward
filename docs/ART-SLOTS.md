# Artwork slots

Where pictures made outside the game (by an image generator) would help, what
each one needs to be briefed, and how a finished file gets into the game. Written
2026-10-09. The hook is built: drop a file in `src/art/`, rebuild, and it shows.
A slot with no file looks exactly as it does today.

## The one file to give the image generator

[art/CHATGPT-BRIEF.md](art/CHATGPT-BRIEF.md) is self-contained: the game and its
story, the look (matched to the title art, attached from `art/reference/`), each
faction's look, technical rules, the delivery format, a check-list, and all 109
pictures with their prompts in batches. Attach it to a chat with the two reference
pictures. It asks for a style sheet first, then a **PDF per batch**, one page per
picture, each page carrying the text line `FILE: captains/vance`.
`npm run art:prep -- <folder of PDFs>` cuts each picture out by that line, crops,
sizes and puts it into `src/art/`. Single images named `captains__vance.png`
work as well. It is written by `npm run art:brief`.

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
| Contact portraits | `contacts/` | 18 | 640×800 | comms call, top left | The named people in story beats and cards (Okoro, Mirren, Draper, Saffi, Vell…) stop being a line of text | built |
| Emblems | `emblems/` | 10 | 256×256 | comms call, in place of the plain diamond | A call sign for each faction: who is calling, at a glance, in the panel's own colour (red when it is an alert) | built |
| Ship profiles | `ships/` | 15 | 960×480 | comms call, above the strength bars | "Call signs for the ships": the player sees the hull a Custody blockade or a Gutter raid has, before choosing. On phones it stands in for the bars that are hidden there | built |
| Port banners | `places/` | 7 | 1280×320 | port panel, above the title | Each holder's port has its own face (Kellern, Frontier, Guild, Gutter, Holdfast, free dock, and one under Continuance order) | built |
| Endings | `endings/` | 6 | 1280×720 | the Threshold's epilogue, and the Archive beside a reached ending | The payoff of a 7 hour journey gets a picture | built |
| Sightings | `sightings/` | 20 | 800×600 | Archive, beside a sighting once seen | Found photographs of the Voice and the Thren: a collection to complete, never shown before it is found | built |
| The file | `file/` | 8 | 800×600 | Archive, beside a piece of the Severance once found | Each piece is an object you can picture | built |
| Regions | `regions/` | 8 | 1280×480 | not drawn yet | A banner for each region's chart header and gate card | slot and prompts ready, no screen yet |

Not built, on purpose or for later:

- **Module and upgrade icons.** Brand v1.1 and Jimi's HUD direction say no ornate
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

Subject: Captain Oriel Vance, who flies the CCV Reprimand for the Continuance's
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
5. **Check the fit in the game.** Send screenshots of the comms call, port or
   Archive at desktop and phone size and I will check cropping, contrast and
   colour against the brand rules.

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
  (for example `src/art/SOURCES.md`) before the game ships.
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

## What I could not check

I cannot make or judge the pictures themselves; the screenshots in the pull
request use placeholder shapes (removed again) to prove the slots, the crops,
the emblem tint and the phone sizes. Whether the real set looks right, and the
cost of the files on a phone's connection, are for a device look once there
are real pictures.
