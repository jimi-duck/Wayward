# Design guidelines: Neon Glass pop-ups

The rules every pop-up follows, from the owner's design guidelines v6 and
the opening chapter mockups v10 (October 2026). The master reference is the
registry update (opening sheet H). Read this before touching any panel,
card, document, toast or button inside one. The owner's source files are in
the project folder `design-guidelines/`.

## The look in one line

Clean code edges on an Apple-glass body: a dark teal glass that blurs the
world behind it, a crisp neon rim with a tight glow, a hairline inside the
rim, corner brackets outside it, and faint static scanlines. Never a wide,
soft, hazy glow. If a screenshot shows a halo around a corner, it fails.

## The material (`src/styles/neon.css`)

Built once; screens pick a role and never restyle it. `neon.css` loads last
so it wins over each screen's older frame.

| Layer | Value |
|---|---|
| Backdrop | `blur(18px) saturate(160%)` (10px on phones) |
| Fill | `linear-gradient(180deg, rgba(12,28,38,.80), rgba(8,20,28,.76))` |
| Scanlines | 1px every 4px, 2% darker, static |
| Sheen | one top-left diagonal, white 3% to 0 over 45% |
| Inner light | `inset 0 0 26px` halo at .18, 1px top highlight |
| Rim | 2px, role colour (a spread shadow, so scrolling never cuts it) |
| Glow | `0 0 2px` halo at .8 and `0 0 6px` at .35, nothing wider |
| Hairline | 1px, halo at 35%, 6px inside the rim (an inset outline) |
| Brackets | 2px L-shapes, 28px long (16px on cards), 7px outside each corner (a border image) |
| Corners | 34px panels, 20px cards, 14px buttons, rows and thumbnails |

Classes: `.ng` is a panel (every `.sheet > .panel`, the pause card and the
job call get it automatically); add `.card` for a small one. `.ng-n` is
nested glass for buttons, choice rows and thumbnails: the same rim at
1.5px, a smaller glow, a lighter fill, no blur of its own. Hover and focus
brighten the glow, pressed dims it, selected takes the role colour.

## Roles

| Role | Rim | Halo | Use |
|---|---|---|---|
| Cyan (default) | `#B4E4EE` | `40,150,190` | Systems, radio, documents, Work Bay, archive |
| Ochre | `#FFDEA0` | `210,140,40` | WAYWARD identity, Sam's private channel, Take the helm, a Lane Control status |
| Red | `#FFBEB9` | `210,60,60` | Breach, threat, Refuse, debt, a run that ends |

Add `ochre` or `red` to `.ng` or `.ng-n`. A sheet in the `alert` state is red.
Unknown callers keep a white status dot until combat makes them hostile.

## Type and contrast

- Barlow Condensed 500 to 800 for headings, labels, actions and figures;
  Barlow Semi Condensed for sentences; Share Tech Mono for numbers and codes.
  No Rajdhani, no other faces.
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
- **Inside a panel:** thin rules and quoted lines with a left bar, no extra
  neon on every region. Glow only where it means something.
- **HUD is not a pop-up:** instruments, objectives and the low-centre notices
  keep their thin lines and restrained glow (`docs/DESIGN.md`).

## Where it lives

| What | Where |
|---|---|
| Material and the opening's sheets and registry layout | `src/styles/neon.css` |
| Sheet and registry drawing | `src/ui/comms.ts` (`sheetView`, `drawSheet`, `drawReg`) |
| Card fields (`glass`, `status`, `hero`, `quote`, `note`, `doc`, `side`) | `CardDef` in `src/sim/comms.ts` |
| The opening's copy | `src/content/story.ts` (Act I) and `src/sim/contract.ts` (ledgers) |

## Checks for every UI change

Screenshots at 1600x900 and 568x320, English, every changed pop-up next to
the mockup: rim, tight glow, see-through glass, brackets, role colour, no
clipping, every answer reachable on the phone.
