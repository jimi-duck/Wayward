# Design guidelines: Neon Glass pop-ups

The rules every pop-up follows, from the owner's design guidelines v6 and
the opening chapter mockups v10 (October 2026). The master reference is the
registry update (opening sheet H). Read this before touching any panel,
card, document, toast or button inside one. The owner's source files are in
the project folder `design-guidelines/`.

## One voice at a time

The owner's rule (31 October 2026, plan "WAYWARD: One Voice at a Time"): the
player is told one thing at a time, and the story is the spine. Every message
is one of four kinds.

| Kind | What it is | Pauses | Cap | Aim, first 15 minutes |
|---|---|---|---|---|
| Moment | a card: a turn in the story to read or decide | yes | 60 words (a written document 110) | 7 at most |
| Voice | a person on the radio | no | 20 words | 10 at most |
| Signal | a notice: what just changed | no | headline 3 words, reason 6 | 6 at most |
| Ambient | the objective, a hint line, the HUD | no | one line | always there |

- The floor (`src/sim/floor.ts`) lets one line out at a time: never over a
  card, 10 s between radio lines, 15 s of quiet after a card, 20 s between
  cards unless one answers the last. A card waits for a story line still
  queued or on screen.
- What lasts is Ambient: the pursuit in days, Wanted, the recovery's status.
  One-off explainers (Wanted, the launcher) are hint lines under the
  objective, never pop-ups.
- No filler (chatter, weather desk, traffic advisories) before the first
  chapter is over.
- `tests/floor.test.ts` and `tests/caps.test.ts` hold these.

## The look in one line

Clean code edges on an Apple-glass body: a dark teal glass that blurs the
world behind it, a crisp neon rim with a tight glow, a hairline inside the
rim and faint static scanlines. Never a wide,
soft, hazy glow. If a screenshot shows a halo around a corner, it fails.

## The material (`src/styles/neon.css`)

Built once; screens pick a role and never restyle it. `neon.css` loads last
so it wins over each screen's older frame. Corners are chamfered, never
rounded (owner, 23 October 2026).

| Layer | Value |
|---|---|
| Backdrop | `blur(18px) saturate(160%)` (10px on phones) |
| Fill | `linear-gradient(180deg, rgba(12,28,38,.80), rgba(8,20,28,.76))` |
| Scanlines | 1px every 4px, 2% darker, static |
| Sheen | one top-left diagonal, white 3% to 0 over 45% |
| Inner light | `inset 0 0 26px` halo at .18, 1px top highlight |
| Rim | 2px, role colour, just outside the edge |
| Glow | 2px blur at .8 and 6px at .35 along the rim, nothing wider |
| Hairline | 1px, halo at 35%, 6px inside the rim |
| Brackets | none: just the box (owner, 23 October 2026) |
| Corners | 45° cuts: 14px panels, 10px cards, buttons, rows and thumbnails (7px on registry thumbnails) |
| Padding | 32px top and bottom, 40px sides on panels (20×24 on cards); 16px between blocks. Phones: 18×26, 14×18, 10px; on one screen at 568×320, so two-panel and stacked sheets go to 10–12×18–22 and the sheet keeps a 6px edge |
| Width | as wide as the content needs, up to the layout's limit; the pause card fits its content (the Arcade start is narrow) |

How it is built: a chamfer cannot come from `clip-path` alone, because the
clip would cut the glow. So each panel has three layers:

- the element's **border image**: the rim and glow as a nine-slice
  SVG, drawn outside the box, so corners keep their size and edges stretch;
- `::before`: the **glass** (fill, scanlines, sheen, blur, inner light) clipped
  to the chamfer, with the hairline as its own border image;
- `::after`: the **edge light** (see Motion), masked to the edge band.

The SVG frames come from `tools/neon-frames.mjs`, which writes
`src/styles/neon-frames.css`; change a cut, colour or glow there and run
`node tools/neon-frames.mjs`. Never hand-edit the generated file.

A panel never scrolls itself (its glass layer would scroll away): when it is
taller than the screen, the sheet behind it scrolls instead. Nothing inside a
panel may set its own rectangular background; put it on `::before` or use
nested glass.

Classes: `.ng` is a panel (every `.sheet > .panel`, the pause card and the
job call get it automatically); add `.card` for a small one. `.ng-n` is
nested glass for buttons, choice rows and thumbnails: the same chamfer and
rim at 1.5px, a smaller glow, its fill in the frame, no blur of its own.
Hover and focus brighten the glow and tint the fill, pressed tints it more,
`dim` is the quiet row. Add `ochre` or `red` for the role.

## Roles

| Role | Rim | Halo | Use |
|---|---|---|---|
| Cyan (default) | `#B4E4EE` | `40,150,190` | Systems, radio, documents, Work Bay, archive |
| Ochre | `#FFDEA0` | `210,140,40` | WAYWARD identity, Sam's private channel, Take the helm, a Lane Control status |
| Red | `#FFBEB9` | `210,60,60` | Breach, threat, Refuse, debt, a run that ends |

Add `ochre` or `red` to `.ng` or `.ng-n`. A sheet in the `alert` state is red.
Unknown callers keep a white status dot until combat makes them hostile.

## Colour tokens

Every colour comes from the `ui` list in `brand/system/tokens.json`. `npm run tokens`
writes it to `src/styles/tokens.css` as `--name` (hex) and `--name-rgb` (for
`rgba(var(--name-rgb), .4)`); `src/ui/palette.ts` reads the same list for canvas
and SVG. No stylesheet or `src/ui` file repeats a colour as a literal (a test
checks), so a new colour is a new token with a `usage` line, only when none fits.
Gold is caution, red is threat, blue is the player, teal is information.

## Type and contrast

- Space Grotesk (one variable file, 300 to 700) for headings, labels, actions
  and sentences; Share Tech Mono for numbers and codes. No Barlow, no
  Rajdhani, no other faces. Space Grotesk is wider than the old condensed
  face, so check German lines and 568x320 phones for overflow.
- Uppercase for structure, sentence case for anything spoken.
- WCAG AA on the composited glass over dark space and bright scenes: text
  4.5:1, large text and rims 3:1. The dimmest text on glass is `#A9A89C`
  (`--ink-2`); never `#757A74`. Lighten text before brightening glass.
- Phones: 40px touch targets, 10px smallest text.

## Fallbacks

- No `backdrop-filter`, or reduced transparency: an opaque `rgba(8,13,14,.92)`
  body with the same rim and glow.
- Reduced motion: no animated glow, sheen or reveal; the same final state at once.
- One blurred backdrop per open stack. Calls that ride along while flying
  (the job offer, radio calls) skip the blur: a live blur over a moving scene
  hitched on phones.

## Patterns

- **Header:** a signal trace, the source in spaced capitals, a status dot and
  word on the right (or a boxed `Read only` on a document).
- **Choices:** a numbered row each (01, 02): label in capitals, the
  consequence under it. Numbers are choice indices, not key bindings; the
  number keys, arrows, Enter, a pad and a tap all reach them.
- **Documents:** opened on request from an `Open` row, shown in place of the
  card, never beside it, with one `Close` back. Ruled, aligned figures; no
  invented serials, dates or itemisation.
- **Money:** credit reads `20 CR`; a projection is never a balance and a debt
  is never netted against it.
- **Inside a panel:** thin rules; a speaker's lines run as one block of text
  with no left bar (the owner, 23 October 2026). No extra neon on every region. Glow only where it means something.
- **Job offer** (`#rd-call.job`, the owner's approved layout, 24 October 2026): one
  frame; the header across the top (`JOB OFFER` in capitals, the caller quieter,
  signal bars; no priority stamp); then the title, description, a terms strip
  (time limit or requirements, reward) and the answers on the left (about 62%),
  and the job's own picture on the right (about 34%), whole (`contain`), never
  cropped. No picture: the words take the full width. Title and answers are
  sentence case; every word on the card is white, colour stays on the rims.
  Answers keep their real keys (Y, U, N): a square key, the action, then one
  quiet line of what it means joined by a middle dot, never outlined chips; a
  fact the terms strip states for that same answer is not repeated. Only the
  answer Enter takes has the amber rim and fill. The HUD steps back while it is
  open. A phone on its side drops the picture and sets the answers beside the
  words. Other radio calls keep their own smaller card.
- **Demand** (`#rd-call.demand`, the owner's mockup, 25 October 2026; a card with a
  `demand` line, today the patrol's Net sweep): who is asking, what they say in
  white, what they want in one amber line, then the answers side by side. Each
  answer is its label and one line: what it does (teal good, red bad) and what it
  costs (amber), e.g. `Patrol leaves · −3 Cyrite`. The world waits for it, the
  HUD steps back and the target labels go. A phone on its side puts the answers
  beside the words.
- **Story card** (`#comms` ordinary card, popup spec of 30 October 2026): one centred panel,
  `min(760px, 100vw - 48px)` (phones: 16px clear each side, 20px padding), at most
  `100dvh - 32px` tall. Category, a thin divider, the title (28px, 22px on narrow
  screens, 20px on a phone on its side; it wraps, never shrinks), the body (16px at 1.5,
  60 characters wide at most), then the answers behind a hairline with 24px above. When the
  card is too tall the text scrolls and the answers stay (they scroll only if they alone
  are too tall). Nothing is cut with an ellipsis on desktop. It arrives with opacity and 6px
  of movement over 200ms and leaves with a 150ms fade (`CommsPanel.fade`, `.out`); with
  reduced motion there is neither. A fading card is already closed: it takes no input and the
  next card may open. Keyboard, pad and tap answers all keep the 400ms guard and ignore held
  keys, so one press never answers two cards. The opening's sheets keep their own layout.
- **Centre notices** (`#notice`, `ui/notify.ts`): compact dark plates, up to 360px wide, an
  accent bar (red denied, gold warning, teal arrival) and a sentence-case line plus one
  quiet reason. Two at most at once; the rest wait in order (a denial goes first), and only
  a backlog of eight sends the oldest to the corner log. Four seconds each, no input.
  Low-centre like the zone notices before them; on a phone on its side they sit between the
  stick and the buttons. They do not touch the HUD or the alert corner.
- **HUD is not a pop-up:** instruments, objectives and the low-centre notices
  keep their thin lines and restrained glow (`docs/DESIGN.md`).

## Motion

From the owner's ambient motion and incoming-transmission rules (23 October 2026). Text and panel geometry never
move; only the glass and the edge light do. Motion never changes the reading area's brightness, so the contrast
above still holds.

| Effect | When | How |
|---|---|---|
| Signal bars | Every transmission (story cards, sheets, the registry, radio calls) | Four bars in the header fill one by one over about a second, then hold, full |
| Reflection | Once as a pop-up opens | One faint diagonal glint, masked to the 12px edge band outside the text (7px on phones) |
| Edge light | The one loop | A short highlight runs along part of the top edge for about 3.5s every 14s, starting 3s after opening |
| Ring | A message that replaces one still on screen | One thin ring from the bars (the antenna), once; the bars stay full |
| Bearing | Sam's private channel only | A dotted line draws once from the panel's corner toward his bearing (047°, `SAM_BEARING`), then fades; the header's `RX 047°` settles its digits |
| Press | Buttons and choice rows | A brief brighten inside the button, the glow no wider than on hover |

- Arrivals fire once per message: `src/ui/arrive.ts` marks the pop-up `data-rx` (fresh) or `data-ring` (it
  replaced an open one) for a moment. A redraw, such as opening a document, never replays them.
- Nothing from an arrival is brighter than the rim. Nothing moves under body text.
- Forbidden: hazy or blurry corner glows, falling code, bouncing, pulsing panels, continuous shimmer, anything
  behind the text. The old breaking scanline (`.wear::after`) is off on every pop-up for this reason.
- Reduced motion: nothing moves; the bars are simply full. A hidden page pauses everything where it is.
- A new card that speaks over the air takes the bars in its header (`bars()` in `arrive.ts`, or the
  `.rx-bars` markup). A private channel takes `rx` (its bearing) on its `CardDef`.
- Left out, though the rules allow them: the static settle (a speckle on open) and edge ticks.

## Where it lives

| What | Where |
|---|---|
| Material and the opening's sheets and registry layout | `src/styles/neon.css` |
| Chamfered frames (rim, glow, hairline) | `tools/neon-frames.mjs` writes `src/styles/neon-frames.css` |
| Sheet and registry drawing | `src/ui/comms.ts` (`sheetView`, `drawSheet`, `drawReg`) |
| The rename reveal (lock lifted, ochre sweep, camera arc) | `src/render/reveal.ts`; the sweep in `src/render/wayward.ts`, the arc in `src/render/camera.ts` |
| Arrivals (signal bars, ring, bearing line) | `src/ui/arrive.ts`; the motion CSS is the last part of `neon.css` |
| Card fields (`glass`, `status`, `hero`, `quote`, `note`, `letter`, `doc`, `side`) | `CardDef` in `src/sim/comms.ts` |
| The opening's copy | `src/content/story.ts` (Act I) and `src/sim/contract.ts` (ledgers) |

## Checks for every UI change

Screenshots at 1600x900 and 568x320, English, every changed pop-up next to
the mockup: rim, tight glow, see-through glass, role colour, no
clipping, every answer reachable on the phone. For motion, sample the animations at fixed times
(pause them and set `currentTime`; headless frames are too slow to catch them live) and check once with reduced motion.
